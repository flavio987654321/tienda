import { createHash, createHmac, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSeguridadEmail } from "@/lib/email";
import { siteUrl } from "@/lib/site";
import {
  CANTIDAD_CODIGOS, DIAS_DINERO_TRABADO, DIAS_HISTORIAL, HORAS_TRABA_POR_RESPALDO, MINUTOS_LINK_CONFIRMAR,
  describirDispositivo, diasDeEspera, formatearCodigo, normalizarCodigoRespaldo, venceLaEspera,
} from "@/lib/seguridad-cuenta-reglas";

/**
 * Verificación en dos pasos de las cuentas de tiendas, productos digitales y
 * afiliados (15/10/26). El admin tiene la suya aparte (`/verificar-2fa`, sólo
 * app de códigos, con su propio vencimiento de sesión) y no pasa por acá.
 *
 * ── Quién guarda qué ─────────────────────────────────────────────────────────
 *
 * Los FACTORES (la huella o la cara —WebAuthn— y la app de códigos —TOTP—) son
 * de Supabase: los crea y los verifica el navegador contra Supabase, y la sesión
 * sube de aal1 a aal2. Nosotros guardamos lo que Supabase no tiene:
 *   · los 8 códigos de respaldo (sólo su huella HMAC),
 *   · los pedidos de "Perdí mi celular",
 *   · la actividad que la persona ve en Seguridad,
 *   · `User.dineroTrabadoHasta`.
 *
 * ── Dónde se exige ───────────────────────────────────────────────────────────
 *
 * Una cuenta con un factor verificado y una sesión aal1 (pasó la contraseña, el
 * código por mail o Google, pero no el segundo paso) no es nadie:
 *   · `getCurrentUser` devuelve null → toda API con sesión contesta 401;
 *   · el middleware manda las páginas de los paneles a `/verificar`.
 * Y Supabase por su lado no deja cambiar el mail ni la contraseña sin aal2.
 *
 * ── Ante la duda, no pasa ────────────────────────────────────────────────────
 *
 * Al revés que el 2FA del admin (que falla abierto para no dejar a Flavio
 * afuera de su panel), acá un error al averiguar si falta el segundo paso
 * cuenta como que falta. Lo peor que pasa es que alguien tenga que reintentar.
 *
 * ── Las tres salidas si se pierde el celular ─────────────────────────────────
 *
 * 1. Otro factor: quien activó huella en el celular y en la compu entra con la otra.
 * 2. Un código de respaldo: se gasta, se apaga el doble paso, la sesión sigue
 *    abierta y los datos de cobro se traban 48 horas. Tiene que volver a activarlo.
 * 3. "Perdí mi celular": link al mail + 7 días de espera (14 si entró sin
 *    contraseña). Si en la espera alguien pasa el segundo paso, se cancela sola.
 *    Al terminar, el cron apaga el doble paso y traba los datos de cobro 7 días.
 *
 * TiendaApps nunca apaga el doble paso a mano: el admin sólo puede CONGELAR un
 * pedido de recuperación (si el dueño avisa que no fue él), nunca abrir una cuenta.
 */

const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

function secreto(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("Falta NEXTAUTH_SECRET");
  return s;
}

/** Huella de un código de respaldo. Con la clave del servidor: la tabla sola no sirve para probar códigos. */
function huellaCodigo(codigo: string): string {
  return createHmac("sha256", secreto()).update(`respaldo:${codigo}`).digest("hex");
}

/** Huella de un link de mail (confirmar o cancelar una recuperación). */
function huellaLink(token: string): string {
  return createHash("sha256").update(`recuperacion:${token}`).digest("hex");
}

/**
 * El link de "No fui yo: cancelar" es FIRMADO a partir del id del pedido, no
 * guardado: así cada mail de la espera (el de confirmación, los recordatorios)
 * lleva uno que sirve, sin tener que guardar el token en claro.
 */
function tokenCancelar(id: string): string {
  return `${id}.${createHmac("sha256", secreto()).update(`cancelar:${id}`).digest("base64url")}`;
}

function urlCancelar(id: string): string {
  return siteUrl(`/seguridad/recuperacion?cancelar=${tokenCancelar(id)}`);
}

// ─── Factores (Supabase) ────────────────────────────────────────────────────

export type FactorCuenta = {
  id: string;
  tipo: "huella" | "app";
  nombre: string | null;
  creadoAt: string;
};

/** Los factores VERIFICADOS de la cuenta, leídos del lado de Supabase con la clave de servicio. */
export async function factoresDe(userId: string): Promise<FactorCuenta[]> {
  const { data, error } = await createSupabaseAdminClient().auth.admin.mfa.listFactors({ userId });
  if (error) throw new Error(`No se pudieron leer los factores: ${error.message}`);
  return (data?.factors ?? [])
    .filter((f) => f.status === "verified" && (f.factor_type === "totp" || f.factor_type === "webauthn"))
    .map((f) => ({
      id: f.id,
      tipo: f.factor_type === "webauthn" ? "huella" : "app",
      nombre: f.friendly_name ?? null,
      creadoAt: f.created_at,
    }));
}

/**
 * Apaga el doble paso: borra todos los factores y los códigos de respaldo.
 * Supabase cierra TODAS las sesiones de la cuenta al borrar un factor
 * verificado; quien llama decide si reabre la de esta persona.
 */
export async function apagarDosPasos(userId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.mfa.listFactors({ userId });
  if (error) throw new Error(`No se pudieron leer los factores: ${error.message}`);
  for (const f of data?.factors ?? []) {
    const { error: e } = await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId });
    if (e) throw new Error(`No se pudo borrar un factor: ${e.message}`);
  }
  await prisma.codigoRespaldo.deleteMany({ where: { userId } });
}

// ─── Códigos de respaldo ────────────────────────────────────────────────────

/** Genera 8 códigos nuevos y anula los anteriores. Los devuelve en claro UNA vez. */
export async function crearCodigosRespaldo(userId: string): Promise<string[]> {
  const codigos = new Set<string>();
  while (codigos.size < CANTIDAD_CODIGOS) codigos.add(formatearCodigo(randomBytes(8)));
  const lista = [...codigos];
  await prisma.$transaction([
    prisma.codigoRespaldo.deleteMany({ where: { userId } }),
    prisma.codigoRespaldo.createMany({ data: lista.map((c) => ({ userId, huella: huellaCodigo(c) })) }),
  ]);
  return lista;
}

export async function codigosLibres(userId: string): Promise<number> {
  return prisma.codigoRespaldo.count({ where: { userId, usadoAt: null } });
}

/**
 * Gasta un código. Un solo `updateMany` con la condición `usadoAt: null`: dos
 * pedidos a la vez con el mismo código no pueden gastarlo los dos.
 */
export async function gastarCodigoRespaldo(userId: string, entrada: unknown): Promise<boolean> {
  const codigo = normalizarCodigoRespaldo(entrada);
  if (!codigo) return false;
  const r = await prisma.codigoRespaldo.updateMany({
    where: { userId, huella: huellaCodigo(codigo), usadoAt: null },
    data: { usadoAt: new Date() },
  });
  return r.count === 1;
}

// ─── Actividad ──────────────────────────────────────────────────────────────

export async function registrarEvento(
  userId: string,
  tipo: string,
  extra: { detalle?: string | null; dispositivo?: string | null } = {},
): Promise<void> {
  await prisma.eventoCuenta
    .create({ data: { userId, tipo, detalle: extra.detalle ?? null, dispositivo: extra.dispositivo ?? null } })
    .catch((e) => console.error("[seguridad] no se pudo anotar el evento:", tipo, e instanceof Error ? e.message : e));
}

export async function borrarHistorialViejo(ahora = new Date()): Promise<number> {
  const r = await prisma.eventoCuenta.deleteMany({ where: { creadoAt: { lt: new Date(ahora.getTime() - DIAS_HISTORIAL * DIA_MS) } } });
  return r.count;
}

/**
 * Pasó la huella o el código de la app. Si fue para ENTRAR (no para volver a
 * verificar algo delicado), se anota y se cancela cualquier "Perdí mi celular"
 * abierto: quien tiene el segundo paso no lo perdió, y si el pedido lo hizo
 * otro, acá se frena solo.
 */
export async function despuesDelSegundoPaso(userId: string, ua: string | null, eraParaEntrar: boolean): Promise<void> {
  if (!eraParaEntrar) return;
  const dispositivo = describirDispositivo(ua);
  await registrarEvento(userId, "ingreso_verificado", { dispositivo });
  const canceladas = await cancelarRecuperacionesDe(userId, "entró con el segundo paso").catch(() => 0);
  if (canceladas > 0) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (u) {
      await sendSeguridadEmail({
        to: u.email, name: u.name,
        asunto: "Cancelamos el pedido de quitar tu verificación en dos pasos",
        titulo: "Pedido cancelado",
        parrafos: [
          `Entraste a tu cuenta con el segundo paso desde ${dispositivo}, así que cancelamos el pedido de "Perdí mi celular" que estaba en curso.`,
          "Si ese pedido no lo hiciste vos, alguien tiene tu contraseña o tu mail: cambiá la contraseña.",
        ],
      }).catch(() => {});
    }
  }
}

// ─── Datos de cobro trabados ────────────────────────────────────────────────

export async function trabarDinero(userId: string, hasta: Date): Promise<void> {
  // Nunca acorta una traba que ya estaba: si había una más larga, queda esa.
  const actual = await prisma.user.findUnique({ where: { id: userId }, select: { dineroTrabadoHasta: true } });
  if (actual?.dineroTrabadoHasta && actual.dineroTrabadoHasta > hasta) return;
  await prisma.user.update({ where: { id: userId }, data: { dineroTrabadoHasta: hasta } });
}

/** Hasta cuándo no puede tocar los datos de cobro, o null si puede. */
export async function dineroTrabado(userId: string, ahora = new Date()): Promise<Date | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { dineroTrabadoHasta: true } });
  return u?.dineroTrabadoHasta && u.dineroTrabadoHasta > ahora ? u.dineroTrabadoHasta : null;
}

export function mensajeDineroTrabado(hasta: Date): string {
  const zona = { timeZone: "America/Argentina/Buenos_Aires" } as const;
  const dia = hasta.toLocaleDateString("es-AR", { day: "numeric", month: "numeric", ...zona });
  const hora = hasta.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", ...zona });
  return `Por seguridad, después de quitar la verificación en dos pasos los datos de cobro quedan trabados. Vas a poder cambiarlos desde el ${dia} a las ${hora}.`;
}

// ─── Usar un código de respaldo ─────────────────────────────────────────────

/**
 * Lo que pasa al entrar con un código de respaldo: se apaga el doble paso (así
 * la sesión aal1 deja de estar frenada), se traban los datos de cobro 48 horas
 * y se avisa por mail. Se pide volver a activarlo desde Seguridad.
 */
export async function entrarConCodigoRespaldo(u: { id: string; email: string; name: string | null }, dispositivo: string) {
  await apagarDosPasos(u.id);
  await trabarDinero(u.id, new Date(Date.now() + HORAS_TRABA_POR_RESPALDO * HORA_MS));
  await cancelarRecuperacionesDe(u.id, "entró con un código de respaldo");
  await registrarEvento(u.id, "codigo_respaldo_usado", { dispositivo });
  await sendSeguridadEmail({
    to: u.email,
    name: u.name,
    tono: "alerta",
    asunto: "Entraste con un código de respaldo",
    titulo: "Se usó un código de respaldo en tu cuenta",
    parrafos: [
      `Alguien entró a tu cuenta de TiendaApps con uno de tus códigos de respaldo, desde ${dispositivo}.`,
      "Por eso apagamos la verificación en dos pasos: hay que volver a activarla desde Seguridad, y te vamos a dar códigos nuevos.",
      `Mientras tanto, y por ${HORAS_TRABA_POR_RESPALDO} horas, no se pueden cambiar los datos de cobro.`,
      "Si no fuiste vos, cambiá tu contraseña ya y escribinos.",
    ],
    boton: { texto: "Ir a Seguridad", url: siteUrl("/panel?seguridad=1") },
  }).catch((e) => console.error("[seguridad] mail de código de respaldo:", e instanceof Error ? e.message : e));
}

// ─── "Perdí mi celular" ─────────────────────────────────────────────────────

export type RecuperacionVista = {
  id: string;
  estado: string;
  creadoAt: string;
  venceAt: string | null;
  conContrasena: boolean;
};

/** La recuperación en curso (esperando o congelada), si hay. */
export async function recuperacionEnCurso(userId: string): Promise<RecuperacionVista | null> {
  const r = await prisma.recuperacionDosPasos.findFirst({
    where: { userId, estado: { in: ["esperando", "congelada"] } },
    orderBy: { creadoAt: "desc" },
  });
  if (!r) return null;
  return {
    id: r.id, estado: r.estado, creadoAt: r.creadoAt.toISOString(),
    venceAt: r.venceAt?.toISOString() ?? null, conContrasena: r.conContrasena,
  };
}

function fechaLarga(d: Date): string {
  return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" });
}

/**
 * Arranca un pedido. Queda en "confirmar" hasta que toque el link del mail; la
 * espera arranca recién ahí. Si el mail no sale, se borra el pedido y se avisa:
 * una espera que corre sin que la casilla se haya enterado es justo lo que no
 * tiene que pasar.
 */
export async function pedirRecuperacion(
  u: { id: string; email: string; name: string | null },
  conContrasena: boolean,
  dispositivo: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const abierta = await prisma.recuperacionDosPasos.findFirst({
    where: { userId: u.id, estado: { in: ["esperando", "congelada"] } },
  });
  if (abierta) {
    return { ok: false, error: abierta.estado === "congelada"
      ? "Hay un pedido frenado por seguridad. Escribinos a marketplacemitienda@gmail.com."
      : "Ya hay un pedido en curso. Revisá tu mail: ahí está la fecha en que se quita." };
  }
  const tokenConfirmar = randomBytes(32).toString("base64url");
  const id = randomBytes(12).toString("hex");
  // Un pedido sin confirmar anterior se reemplaza: vale el último link.
  await prisma.recuperacionDosPasos.updateMany({
    where: { userId: u.id, estado: "confirmar" },
    data: { estado: "vencida", cerradaAt: new Date(), motivoCierre: "reemplazado por otro pedido", huellaConfirmar: null },
  });
  const r = await prisma.recuperacionDosPasos.create({
    data: {
      id, userId: u.id, estado: "confirmar", conContrasena,
      huellaConfirmar: huellaLink(tokenConfirmar), huellaCancelar: huellaLink(tokenCancelar(id)),
    },
  });
  const dias = diasDeEspera(conContrasena);
  const urlConfirmar = siteUrl(`/seguridad/recuperacion?confirmar=${tokenConfirmar}`);
  if (process.env.NODE_ENV !== "production") {
    console.info("[seguridad] (solo en desarrollo) confirmar:", urlConfirmar, "cancelar:", urlCancelar(id));
  }
  try {
    await sendSeguridadEmail({
      to: u.email,
      name: u.name,
      tono: "alerta",
      asunto: "Confirmá el pedido para quitar la verificación en dos pasos",
      titulo: "¿Perdiste tu celular?",
      parrafos: [
        `Desde ${dispositivo} se pidió quitar la verificación en dos pasos de tu cuenta, porque no se tiene la huella, la app ni un código de respaldo.`,
        `Si fuiste vos, confirmalo con el botón. Por seguridad, la verificación se quita recién ${dias} días después de confirmar, y durante ese tiempo te vamos a avisar por acá.`,
        `El link vence en ${MINUTOS_LINK_CONFIRMAR} minutos.`,
        "Si no fuiste vos, no toques nada: sin confirmar, el pedido no avanza. Igual te conviene cambiar la contraseña.",
      ],
      boton: { texto: "Sí, fui yo: confirmar", url: urlConfirmar },
      linkSecundario: { texto: "No fui yo: cancelar el pedido", url: urlCancelar(id) },
    });
  } catch (e) {
    console.error("[seguridad] no salió el mail de recuperación:", e instanceof Error ? e.message : e);
    await prisma.recuperacionDosPasos.delete({ where: { id: r.id } }).catch(() => {});
    return { ok: false, error: "No pudimos mandarte el mail, así que el pedido no arrancó. Probá de nuevo en unos minutos." };
  }
  await registrarEvento(u.id, "recuperacion_pedida", { dispositivo });
  return { ok: true };
}

/** El link del mail. Pasa de "confirmar" a "esperando" y arranca la cuenta regresiva. */
export async function confirmarRecuperacion(token: string, ahora = new Date()):
  Promise<{ ok: true; venceAt: Date } | { ok: false; error: string }> {
  if (!token || token.length < 20) return { ok: false, error: "El link no es válido." };
  const r = await prisma.recuperacionDosPasos.findUnique({
    where: { huellaConfirmar: huellaLink(token) },
    include: { user: { select: { email: true, name: true } } },
  });
  if (!r) return { ok: false, error: "El link no es válido o ya se usó." };
  if (r.estado === "esperando" && r.venceAt) return { ok: true, venceAt: r.venceAt };
  if (r.estado !== "confirmar") return { ok: false, error: "Este pedido ya no está activo." };
  if (ahora.getTime() - r.creadoAt.getTime() > MINUTOS_LINK_CONFIRMAR * 60_000) {
    await prisma.recuperacionDosPasos.update({ where: { id: r.id }, data: { estado: "vencida", cerradaAt: ahora, motivoCierre: "no confirmó a tiempo" } });
    return { ok: false, error: "El link venció. Volvé a pedirlo desde la pantalla de verificación." };
  }
  const venceAt = venceLaEspera(ahora, r.conContrasena);
  // Condición en el where: si dos pestañas confirman a la vez, una sola cambia el estado.
  const cambio = await prisma.recuperacionDosPasos.updateMany({
    where: { id: r.id, estado: "confirmar" },
    data: { estado: "esperando", confirmadaAt: ahora, venceAt, ultimoAvisoAt: ahora },
  });
  if (cambio.count === 0) return { ok: true, venceAt };
  await registrarEvento(r.userId, "recuperacion_confirmada");
  await sendSeguridadEmail({
    to: r.user.email,
    name: r.user.name,
    tono: "alerta",
    asunto: `La verificación en dos pasos se quita a partir del ${fechaLarga(venceAt)}`,
    titulo: "Pedido confirmado: empezó la espera",
    parrafos: [
      `La verificación en dos pasos de tu cuenta se va a quitar a partir del ${fechaLarga(venceAt)}.`,
      "Si encontrás el celular o un código de respaldo y entrás antes, el pedido se cancela solo.",
      `Cuando se quite, los datos de cobro (CBU, alias y Mercado Pago) quedan trabados ${DIAS_DINERO_TRABADO} días más.`,
      "Si no fuiste vos, cancelalo ahora con el link de abajo.",
    ],
    linkSecundario: { texto: "No fui yo: cancelar el pedido", url: urlCancelar(r.id) },
  }).catch(() => {});
  return { ok: true, venceAt };
}

/** Cancelar desde el link del mail. No pide sesión: tener el mail alcanza para FRENAR, nunca para abrir. */
export async function cancelarRecuperacionPorLink(token: string): Promise<boolean> {
  if (!token || token.length < 20) return false;
  const r = await prisma.recuperacionDosPasos.findUnique({ where: { huellaCancelar: huellaLink(token) } });
  // La huella guardada es la del token firmado: si alguien arma uno a mano, no está.
  if (!r) return false;
  if (!["confirmar", "esperando"].includes(r.estado)) return r.estado === "cancelada";
  await cerrarRecuperacion(r.id, r.userId, "cancelada", "canceló desde el mail");
  return true;
}

/** Cancela todo lo abierto de una cuenta (pasó el segundo paso, o lo canceló desde Seguridad). */
export async function cancelarRecuperacionesDe(userId: string, motivo: string): Promise<number> {
  const abiertas = await prisma.recuperacionDosPasos.findMany({
    where: { userId, estado: { in: ["confirmar", "esperando"] } },
    select: { id: true },
  });
  for (const r of abiertas) await cerrarRecuperacion(r.id, userId, "cancelada", motivo);
  return abiertas.length;
}

async function cerrarRecuperacion(id: string, userId: string, estado: "cancelada" | "completada", motivo: string) {
  const cambio = await prisma.recuperacionDosPasos.updateMany({
    where: { id, estado: { in: ["confirmar", "esperando", "congelada"] } },
    data: { estado, cerradaAt: new Date(), motivoCierre: motivo, huellaConfirmar: null },
  });
  if (cambio.count > 0 && estado === "cancelada") await registrarEvento(userId, "recuperacion_cancelada", { detalle: motivo });
}

/** El admin la frena porque el dueño avisó que no fue él. Sólo frena: nunca abre nada. */
export async function congelarRecuperacion(id: string, congelar: boolean): Promise<boolean> {
  const r = await prisma.recuperacionDosPasos.updateMany({
    where: { id, estado: congelar ? "esperando" : "congelada" },
    data: { estado: congelar ? "congelada" : "esperando" },
  });
  if (r.count > 0 && congelar) {
    const rec = await prisma.recuperacionDosPasos.findUnique({ where: { id }, select: { userId: true } });
    if (rec) await registrarEvento(rec.userId, "recuperacion_congelada");
  }
  return r.count > 0;
}

/**
 * La pasada del cron diario: termina las esperas cumplidas, avisa a mitad de
 * camino y un día antes, y da por vencidos los pedidos que nunca se confirmaron.
 * Se puede correr dos veces sin hacer nada dos veces: cada paso cambia el
 * estado con la condición en el where.
 */
export async function procesarRecuperaciones(ahora = new Date()) {
  const resultado = { completadas: 0, avisos: 0, vencidas: 0, errores: 0 };

  const sinConfirmar = await prisma.recuperacionDosPasos.updateMany({
    where: { estado: "confirmar", creadoAt: { lt: new Date(ahora.getTime() - MINUTOS_LINK_CONFIRMAR * 60_000) } },
    data: { estado: "vencida", cerradaAt: ahora, motivoCierre: "no confirmó a tiempo", huellaConfirmar: null },
  });
  resultado.vencidas = sinConfirmar.count;

  const esperando = await prisma.recuperacionDosPasos.findMany({
    where: { estado: "esperando" },
    include: { user: { select: { email: true, name: true } } },
    take: 200,
  });
  for (const r of esperando) {
    try {
      if (!r.venceAt) continue;
      if (r.venceAt <= ahora) {
        // Primero se marca, después se apaga: si dos pasadas llegan juntas, una sola sigue.
        const cambio = await prisma.recuperacionDosPasos.updateMany({
          where: { id: r.id, estado: "esperando" },
          data: { estado: "completada", cerradaAt: ahora, motivoCierre: "terminó la espera" },
        });
        if (cambio.count === 0) continue;
        await apagarDosPasos(r.userId);
        const hasta = new Date(ahora.getTime() + DIAS_DINERO_TRABADO * DIA_MS);
        await trabarDinero(r.userId, hasta);
        await registrarEvento(r.userId, "recuperacion_completada");
        resultado.completadas++;
        await sendSeguridadEmail({
          to: r.user.email, name: r.user.name, tono: "alerta",
          asunto: "Quitamos la verificación en dos pasos de tu cuenta",
          titulo: "Terminó la espera",
          parrafos: [
            "Como pediste, quitamos la verificación en dos pasos. Ya podés entrar con tu contraseña o con un código por mail.",
            "Volvé a activarla desde Seguridad apenas entres.",
            `Por seguridad, los datos de cobro quedan trabados hasta el ${fechaLarga(hasta)}.`,
            "Si no lo pediste vos, escribinos ya: los datos de cobro siguen trabados y podemos frenar todo.",
          ],
          boton: { texto: "Entrar", url: siteUrl("/login") },
        }).catch(() => {});
        continue;
      }
      // Avisos en el medio: a mitad de la espera y el último día.
      const total = r.venceAt.getTime() - (r.confirmadaAt ?? r.creadoAt).getTime();
      const falta = r.venceAt.getTime() - ahora.getTime();
      const desdeUltimo = ahora.getTime() - (r.ultimoAvisoAt ?? r.creadoAt).getTime();
      const toca = (falta <= total / 2 && desdeUltimo >= total / 2 - DIA_MS) || (falta <= DIA_MS * 1.5 && desdeUltimo >= DIA_MS);
      if (!toca) continue;
      const cambio = await prisma.recuperacionDosPasos.updateMany({
        where: { id: r.id, estado: "esperando", ultimoAvisoAt: r.ultimoAvisoAt },
        data: { ultimoAvisoAt: ahora },
      });
      if (cambio.count === 0) continue;
      const dias = Math.max(1, Math.ceil(falta / DIA_MS));
      await sendSeguridadEmail({
        to: r.user.email, name: r.user.name, tono: "alerta",
        asunto: `Faltan ${dias} ${dias === 1 ? "día" : "días"} para quitar tu verificación en dos pasos`,
        titulo: "Sigue en curso el pedido de quitar la verificación",
        parrafos: [
          `A partir del ${fechaLarga(r.venceAt)} se quita la verificación en dos pasos de tu cuenta, como se pidió desde "Perdí mi celular".`,
          "Si fuiste vos, no hace falta que hagas nada.",
          "Si no fuiste vos, cancelalo con el link de abajo, o entrá a tu cuenta con tu huella o tu app: eso también lo cancela.",
        ],
        linkSecundario: { texto: "No fui yo: cancelar el pedido", url: urlCancelar(r.id) },
      });
      resultado.avisos++;
    } catch (e) {
      resultado.errores++;
      console.error("[seguridad] recuperación", r.id, e instanceof Error ? e.message : e);
    }
  }
  return resultado;
}
