import { CANALES, enlaceParaCompartir } from "@/lib/enlaces-compartir";

/* ══════════════════════════════════════════════════════════════════════════
   MAIL A TUS COMPRADORES
   ══════════════════════════════════════════════════════════════════════════

   Escribirle a todos los que compraron un producto (o cualquiera de la
   cuenta): para lanzar el siguiente, para avisar que se actualizó el
   archivo, para pedir una opinión. Es de Pro.

   ── Por qué se puede, y con qué cuidado ────────────────────────────────────

   Quien compró dio su correo para comprar, no para recibir novedades. Lo que
   lo hace legítimo es que es SU vendedora escribiéndole sobre lo que le
   compró, y que en cada mail hay una salida que anda con un click (el pie y
   la cabecera `List-Unsubscribe`, que Gmail muestra al lado del remitente).
   Quien se baja no recibe nunca más de esa cuenta; la baja se guarda por
   (cuenta, correo), no por campaña.

   ⚠️ El dominio de envío es de la plataforma y lo comparten todas las
   cuentas: una denuncia de spam la pagan todas. Por eso hay tope de envíos
   por día, el destinatario es SIEMPRE alguien que pagó (nunca una lista
   importada), y la ruta que manda cuenta enviados y fallidos de verdad.

   Este archivo es puro y lo importa el navegador: las reglas, la lista y el
   saludo. El token de baja (que necesita `crypto`) vive en
   `correos-compradores-firma`; lo que toca la base, en
   `correos-compradores-db`. Probado en su `.check.ts`. */

export const ASUNTO_MIN = 3;
export const ASUNTO_MAX = 90;
export const CUERPO_MIN = 20;
export const CUERPO_MAX = 3000;
/**
 * Cuántos mails puede mandar una cuenta en 24 horas. Dos: el del lanzamiento
 * y el que corrige el error de tipeo. Más que eso, a la misma gente, el mismo
 * día, es correo no deseado con el nombre de la vendedora en el asunto.
 */
export const MAX_CORREOS_POR_DIA = 2;
/** Cuántos se muestran en el historial. */
export const MAX_CORREOS_EN_PANTALLA = 20;

export type CorreoNuevo = {
  asunto: string;
  cuerpo: string;
  /** A los compradores de este principal, o null = de toda la cuenta. */
  productId: string | null;
  /** El botón del mail lleva a este principal propio, o null = sin botón. */
  enlaceProductId: string | null;
};

/* Un cuid, que es lo que la base pone de id. Es la misma forma que mira la
   ruta de compra; un id con puntos rompería el token de baja, que los usa
   de separador. */
const ID_RE = /^c[a-z0-9]{20,30}$/;

/**
 * Lo que manda la pantalla, revisado. Devuelve el correo listo o el problema
 * en castellano; la pantalla lo muestra antes de mandar y la ruta lo vuelve
 * a correr, con la misma función.
 */
export function validarCorreoNuevo(body: unknown): { ok: true; datos: CorreoNuevo } | { ok: false; problema: string } {
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const asunto = typeof b.asunto === "string" ? b.asunto.replace(/\s+/g, " ").trim() : "";
  const cuerpo = typeof b.cuerpo === "string" ? b.cuerpo.replace(/\r\n/g, "\n").trim() : "";

  if (asunto.length < ASUNTO_MIN) return { ok: false, problema: "Escribí un asunto." };
  if (asunto.length > ASUNTO_MAX) return { ok: false, problema: `El asunto va hasta ${ASUNTO_MAX} letras.` };
  if (cuerpo.length < CUERPO_MIN) return { ok: false, problema: "El mensaje es muy corto: contá qué querés decirles." };
  if (cuerpo.length > CUERPO_MAX) return { ok: false, problema: `El mensaje va hasta ${CUERPO_MAX} letras.` };

  const id = (v: unknown) => (typeof v === "string" && ID_RE.test(v) ? v : null);
  return { ok: true, datos: { asunto, cuerpo, productId: id(b.productId), enlaceProductId: id(b.enlaceProductId) } };
}

/** "Hola Ana," con el primer nombre; "Hola," si no lo dejó. */
export function saludo(nombre: string | null | undefined): string {
  const pila = nombre?.trim().split(/\s+/)[0];
  return pila ? `Hola ${pila},` : "Hola,";
}

/**
 * El link del botón: la dirección del producto con la etiqueta `email / mail`
 * y el asunto como campaña, para que la venta que venga de este mail se vea
 * en Estadísticas → Campañas con su nombre. El asunto va sin acentos y con
 * guiones: es lo que queda legible en la URL y en la tabla.
 */
export function enlaceDelBoton(direccionBase: string, asunto: string): string {
  const canal = CANALES.find((c) => c.clave === "email") ?? CANALES[CANALES.length - 1];
  const campania = asunto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return enlaceParaCompartir(direccionBase, canal, campania);
}

/* ── La lista ────────────────────────────────────────────────────────────── */

export type Comprador = { email: string; nombre: string | null };

/**
 * Los destinatarios: uno por correo (en minúsculas), sin los que se dieron
 * de baja, ordenados por correo. El orden es lo que hace que el envío se
 * pueda retomar: el cursor es el último correo enviado, y "seguir" es
 * "los que vienen después de ése". Quien compró entre dos pasadas y cae
 * antes del cursor no lo recibe: compró después de mandado, y está bien.
 */
export function destinatarios(compradores: Comprador[], bajas: Iterable<string>, despuesDe: string | null = null): Comprador[] {
  const fuera = new Set(Array.from(bajas, (e) => e.toLowerCase()));
  const porCorreo = new Map<string, Comprador>();
  for (const c of compradores) {
    const email = c.email.trim().toLowerCase();
    if (!email || fuera.has(email)) continue;
    const previo = porCorreo.get(email);
    if (!previo) porCorreo.set(email, { email, nombre: c.nombre?.trim() || null });
    else if (!previo.nombre && c.nombre?.trim()) previo.nombre = c.nombre.trim();
  }
  return Array.from(porCorreo.values())
    .filter((c) => despuesDe === null || c.email > despuesDe)
    .sort((a, b) => (a.email < b.email ? -1 : a.email > b.email ? 1 : 0));
}

/* ── Las direcciones de baja ─────────────────────────────────────────────── */

/**
 * Las dos direcciones que viajan en el mail. Van sobre la base del sitio y
 * no sobre el `Host` del pedido: la manda la vendedora, no el navegador de
 * quien lo lee, y un `Host` inventado mandaría el token a otro lado.
 */
export const urlBajaCorreo = (base: string, token: string) => `${base.replace(/\/$/, "")}/correo/baja?t=${encodeURIComponent(token)}`;
export const urlBajaCorreoUnClic = (base: string, token: string) => `${base.replace(/\/$/, "")}/api/digitales/baja?t=${encodeURIComponent(token)}`;

/* ── Para la pantalla ────────────────────────────────────────────────────── */

export type EstadoDelCorreo = "ENVIANDO" | "LISTO";

/** Cómo se cuenta un envío en el historial. */
export function resumenDelEnvio(c: { destinatarios: number; enviados: number; fallidos: number; estado: string }): string {
  if (c.estado === "ENVIANDO") return `${c.enviados} de ${c.destinatarios} enviados, quedan más`;
  if (c.fallidos > 0) return `${c.enviados} enviados · ${c.fallidos} no llegaron`;
  return c.enviados === 1 ? "1 enviado" : `${c.enviados} enviados`;
}
