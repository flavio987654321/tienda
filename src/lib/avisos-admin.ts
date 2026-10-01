/**
 * Los avisos del admin: el cartel de arriba del inicio de los paneles.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * NO ES LA CAMPANITA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * La campanita (`Notification`) es de cada persona y la llenan los eventos: una
 * venta, una verificación aprobada. Esto es la plataforma hablando con muchos a
 * la vez —una novedad, una bienvenida, "si te trabás, escribinos"— y va en otro
 * lugar a propósito: si compartieran la campanita, un aviso nuestro taparía la
 * venta que la persona sí quería ver.
 *
 * ── Para no ser pesado ─────────────────────────────────────────────────────
 *
 *   - Se ve UNO solo a la vez: el más nuevo que le toque.
 *   - Cerrado, no vuelve nunca. Ni ése ni una copia: el cierre es por aviso.
 *   - No manda mails ni notificaciones al celular. Aparece cuando la persona
 *     entra al panel por su cuenta, y en ningún otro momento.
 *
 * ── "Sólo los nuevos" ──────────────────────────────────────────────────────
 *
 * `soloNuevosDias = 7` quiere decir: a cada cuenta durante sus primeros 7 días.
 * Un mensaje de bienvenida se escribe una vez y le sale a cada persona que
 * llega, sin acordarse de mandarlo.
 *
 * Este archivo es puro —no toca la base— para poder probarlo solo
 * (`avisos-admin.check.ts`) y para que la pantalla del admin use la MISMA
 * validación que la ruta.
 */

/**
 * El canal de Supabase por donde los paneles se enteran de que hay que volver a
 * preguntar. Vive acá y no en el archivo del servidor porque lo escucha el
 * navegador. Ver `avisarQueCambiaron`.
 */
export const CANAL_AVISOS = "avisos-admin";

export const LARGO_TITULO = 90;
export const LARGO_TEXTO = 600;
export const LARGO_BOTON = 40;
export const LARGO_LINK = 300;
/** Lo más largo que se puede pedir para "sólo los nuevos". Más que eso ya no es nuevo. */
export const MAX_DIAS_NUEVOS = 90;

/** Los paneles a los que se les puede hablar. BUYER y ADMIN no tienen inicio de panel. */
export const ROLES_AVISO = ["OWNER", "SELLER", "DIGITAL"] as const;
export type RolAviso = (typeof ROLES_AVISO)[number];

export const NOMBRE_DEL_ROL: Record<RolAviso, string> = {
  OWNER: "Tiendas",
  SELLER: "Afiliados",
  DIGITAL: "Productos digitales",
};

/**
 * Los colores del cartel. Son propios —no salen del tema del panel— para que se
 * vean igual en claro y en oscuro: el cartel es lo único de la pantalla que no
 * es de la persona, y que se note.
 *
 * Escritos enteros: Tailwind necesita ver la clase completa en el código.
 */
export const TONOS = {
  verde:   { nombre: "Verde",   fondo: "bg-gradient-to-br from-emerald-400 to-teal-500",   tinta: "text-emerald-950", boton: "bg-emerald-950 text-white hover:bg-emerald-900" },
  violeta: { nombre: "Violeta", fondo: "bg-gradient-to-br from-violet-500 to-indigo-600",  tinta: "text-white",       boton: "bg-white text-indigo-700 hover:bg-indigo-50" },
  naranja: { nombre: "Naranja", fondo: "bg-gradient-to-br from-amber-400 to-orange-500",   tinta: "text-orange-950",  boton: "bg-orange-950 text-white hover:bg-orange-900" },
} as const;
export type TonoAviso = keyof typeof TONOS;

export function esTono(valor: unknown): valor is TonoAviso {
  return typeof valor === "string" && Object.prototype.hasOwnProperty.call(TONOS, valor);
}

/* Los caracteres de control MENOS el salto de línea: el texto de un aviso puede
   tener párrafos. Es la misma idea que `lib/texto-limpio`, que los saca todos
   porque ahí se guardan nombres de una línea. */
const CONTROL_SIN_SALTO = /[\u0000-\u0009\u000B-\u001F\u007F]/g;

function limpio(valor: unknown, tope: number, conSaltos = false): string | null {
  if (typeof valor !== "string") return null;
  let t = valor.replace(/\r\n?/g, "\n");
  t = conSaltos ? t.replace(CONTROL_SIN_SALTO, " ").replace(/\n{3,}/g, "\n\n") : t.replace(/[\u0000-\u001F\u007F]/g, " ");
  t = t.trim().slice(0, tope).trim();
  return t.length > 0 ? t : null;
}

/**
 * El link del botón, o null si no sirve.
 *
 * ⚠️ Sólo `https:` y WhatsApp. Un `javascript:` en el `href` de un botón que ven
 * cientos de cuentas es exactamente el agujero que no tiene que existir, aunque
 * el único que escriba acá sea el admin: una sesión robada del admin no puede
 * convertirse en código corriendo en el panel de todos.
 *
 * Un número suelto ("2254447183") se acepta y se convierte en `wa.me`, con el 54
 * y el 9 del celular argentino: es lo que uno escribe sin pensar.
 */
export function linkDelBoton(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const crudo = valor.trim();
  if (!crudo || crudo.length > LARGO_LINK) return null;

  const soloDigitos = crudo.replace(/[\s()+-]/g, "");
  if (/^\d{8,15}$/.test(soloDigitos)) {
    let n = soloDigitos;
    if (n.startsWith("0")) n = n.slice(1);
    if (!n.startsWith("54")) n = `549${n}`;
    return `https://wa.me/${n}`;
  }

  try {
    const url = new URL(crudo);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Avisos sólo para quienes les falta algo. Se miran en la base cada vez que la
 * persona entra (`whereDeLaAudiencia`): cuando lo resuelve, el aviso se va solo,
 * sin que nadie lo apague.
 *
 * `roles` es a qué paneles les cabe. Afiliados no tiene Mercado Pago propio ni
 * nada que publicar, y "el archivo" sólo existe en digitales.
 */
export const CONDICIONES = {
  SIN_MP:       { nombre: "No conectaron Mercado Pago", roles: ["OWNER", "DIGITAL"] },
  SIN_PUBLICAR: { nombre: "No publicaron todavía",      roles: ["OWNER", "DIGITAL"] },
  SIN_ARCHIVO:  { nombre: "Les falta subir un archivo", roles: ["DIGITAL"] },
} as const satisfies Record<string, { nombre: string; roles: readonly RolAviso[] }>;
export type CondicionAviso = keyof typeof CONDICIONES;

export function esCondicion(valor: unknown): valor is CondicionAviso {
  return typeof valor === "string" && Object.prototype.hasOwnProperty.call(CONDICIONES, valor);
}

/** Mismo formato que valida el resto del proyecto: cuid de Prisma o UUID. */
const ID_RE = /^(c[a-z0-9]{20,30}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** A quién le llega un aviso. */
export type Audiencia = {
  /** Con una persona elegida, `roles` lo completa la ruta con el rol de ella. */
  roles: RolAviso[];
  soloNuevosDias: number | null;
  condicion: CondicionAviso | null;
  paraUserId: string | null;
};

/**
 * Valida a quién va un aviso. Aparte de `validarAviso` porque el contador de
 * "le llegaría a N personas" la necesita sola, mientras el aviso todavía no
 * tiene título.
 */
export function validarAudiencia(cuerpo: unknown): { ok: true; audiencia: Audiencia } | { ok: false; error: string } {
  if (!cuerpo || typeof cuerpo !== "object") return { ok: false, error: "Elegí a quién va." };
  const c = cuerpo as Record<string, unknown>;

  /* Una persona sola: lo demás no se mira. Ni "sólo los nuevos" ni la
     condición tienen sentido para alguien que se eligió a mano. */
  if (c.paraUserId !== null && c.paraUserId !== undefined && c.paraUserId !== "") {
    if (typeof c.paraUserId !== "string" || !ID_RE.test(c.paraUserId)) {
      return { ok: false, error: "Esa persona no existe." };
    }
    return { ok: true, audiencia: { roles: [], soloNuevosDias: null, condicion: null, paraUserId: c.paraUserId } };
  }

  if (!Array.isArray(c.roles)) return { ok: false, error: "Elegí a qué paneles va." };
  const roles = ROLES_AVISO.filter((r) => (c.roles as unknown[]).includes(r));
  if (roles.length === 0) return { ok: false, error: "Elegí al menos un panel." };

  let soloNuevosDias: number | null = null;
  if (c.soloNuevosDias !== null && c.soloNuevosDias !== undefined && c.soloNuevosDias !== "") {
    const n = Number(c.soloNuevosDias);
    if (!Number.isInteger(n) || n < 1 || n > MAX_DIAS_NUEVOS) {
      return { ok: false, error: `"Sólo los nuevos" va de 1 a ${MAX_DIAS_NUEVOS} días.` };
    }
    soloNuevosDias = n;
  }

  let condicion: CondicionAviso | null = null;
  if (c.condicion !== null && c.condicion !== undefined && c.condicion !== "") {
    if (!esCondicion(c.condicion)) return { ok: false, error: "Esa condición no existe." };
    condicion = c.condicion;
    /* Se rechaza en vez de sacar el panel en silencio: el admin eligió
       Afiliados por algo, y que el aviso no le llegue sin decirle nada es peor. */
    const ajenos = roles.filter((r) => !(CONDICIONES[condicion!].roles as readonly string[]).includes(r));
    if (ajenos.length > 0) {
      return { ok: false, error: `"${CONDICIONES[condicion].nombre}" no aplica a ${ajenos.map((r) => NOMBRE_DEL_ROL[r]).join(" ni a ")}. Sacá ese panel.` };
    }
  }

  return { ok: true, audiencia: { roles, soloNuevosDias, condicion, paraUserId: null } };
}

export type AvisoValido = Audiencia & {
  titulo: string;
  texto: string;
  botonTexto: string | null;
  botonLink: string | null;
  tono: TonoAviso;
  desde: Date;
  hasta: Date | null;
};

/**
 * Valida lo que manda la pantalla del admin. Devuelve el aviso listo para
 * guardar, o el problema en castellano.
 */
export function validarAviso(cuerpo: unknown, ahora = new Date()): { ok: true; aviso: AvisoValido } | { ok: false; error: string } {
  if (!cuerpo || typeof cuerpo !== "object") return { ok: false, error: "Faltan los datos del aviso." };
  const c = cuerpo as Record<string, unknown>;

  const titulo = limpio(c.titulo, LARGO_TITULO);
  if (!titulo) return { ok: false, error: "Falta el título." };
  const texto = limpio(c.texto, LARGO_TEXTO, true);
  if (!texto) return { ok: false, error: "Falta el texto." };

  const botonTexto = limpio(c.botonTexto, LARGO_BOTON);
  const linkCrudo = typeof c.botonLink === "string" ? c.botonLink.trim() : "";
  const botonLink = linkCrudo ? linkDelBoton(linkCrudo) : null;
  if (linkCrudo && !botonLink) {
    return { ok: false, error: "El link del botón tiene que empezar con https:// o ser un número de WhatsApp." };
  }
  /* El botón va entero o no va: un botón sin destino no hace nada, y un link
     sin texto no hay dónde dibujarlo. */
  if (!!botonTexto !== !!botonLink) {
    return { ok: false, error: "El botón necesita las dos cosas: el texto y el link." };
  }

  const a = validarAudiencia(c);
  if (!a.ok) return a;

  const tono: TonoAviso = esTono(c.tono) ? c.tono : "verde";

  const desde = c.desde ? new Date(String(c.desde)) : ahora;
  if (Number.isNaN(desde.getTime())) return { ok: false, error: "La fecha de inicio no es válida." };
  let hasta: Date | null = null;
  if (c.hasta) {
    hasta = new Date(String(c.hasta));
    if (Number.isNaN(hasta.getTime())) return { ok: false, error: "La fecha de fin no es válida." };
    /* Un aviso que ya venció al guardarlo no le sale a nadie, y el admin cree que
       lo publicó. Mejor decirlo ahora que descubrirlo por los números en cero.
       Va ANTES que la comparación con el inicio: sin inicio, el inicio es
       "ahora", y una fecha pasada caía en "tiene que ser después de la de
       inicio", que no dice qué está mal. */
    if (hasta <= ahora) return { ok: false, error: "La fecha de fin ya pasó: así no lo vería nadie." };
    if (hasta <= desde) return { ok: false, error: "La fecha de fin tiene que ser después de la de inicio." };
  }

  return { ok: true, aviso: { ...a.audiencia, titulo, texto, botonTexto, botonLink, tono, desde, hasta } };
}

/** Lo mínimo de un aviso para decidir a quién le toca. */
export type AvisoParaElegir = {
  id: string;
  roles: string[];
  soloNuevosDias: number | null;
  paraUserId?: string | null;
  desde: Date;
  hasta: Date | null;
  activo: boolean;
  createdAt: Date;
};

const DIA = 24 * 60 * 60 * 1000;

/**
 * Si este aviso le toca a esta cuenta ahora, sin mirar si ya lo cerró.
 *
 * ⚠️ La CONDICIÓN no se mira acá: necesita la base (¿conectó Mercado Pago?).
 * La ruta la confirma aparte, con la misma consulta que usa el contador del
 * admin. Ver `whereDeLaAudiencia`.
 */
export function leToca(
  aviso: AvisoParaElegir,
  cuenta: { id: string; role: string; createdAt: Date },
  ahora = new Date(),
): boolean {
  if (!aviso.activo) return false;
  if (aviso.paraUserId && aviso.paraUserId !== cuenta.id) return false;
  if (!aviso.roles.includes(cuenta.role)) return false;
  if (aviso.desde > ahora) return false;
  if (aviso.hasta && aviso.hasta <= ahora) return false;
  if (aviso.soloNuevosDias !== null && ahora.getTime() - cuenta.createdAt.getTime() >= aviso.soloNuevosDias * DIA) {
    return false;
  }
  return true;
}

/**
 * Los avisos que le pueden tocar, del que va primero al último. La ruta se
 * queda con el primero que además cumpla su condición en la base.
 *
 * El que es SÓLO PARA ELLA va antes que los generales: alguien que se tomó el
 * trabajo de escribirle a una persona no puede quedar tapado por una novedad
 * para todos.
 */
export function candidatosEnOrden<A extends AvisoParaElegir>(
  avisos: A[],
  cuenta: { id: string; role: string; createdAt: Date },
  cerrados: Set<string>,
  ahora = new Date(),
): A[] {
  return avisos
    .filter((a) => !cerrados.has(a.id) && leToca(a, cuenta, ahora))
    .sort((a, b) =>
      Number(!!b.paraUserId) - Number(!!a.paraUserId)
      || b.desde.getTime() - a.desde.getTime()
      || b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * El aviso que se muestra: el primero de `candidatosEnOrden`. Uno solo, aunque
 * le toquen varios — ver la cabecera.
 */
export function elegirAviso<A extends AvisoParaElegir>(
  avisos: A[],
  cuenta: { id: string; role: string; createdAt: Date },
  cerrados: Set<string>,
  ahora = new Date(),
): A | null {
  return candidatosEnOrden(avisos, cuenta, cerrados, ahora)[0] ?? null;
}

/**
 * Pone el nombre de la persona donde dice `{nombre}`.
 *
 * Sólo el primer nombre: "Hola Jorge", no "Hola Jorge Sosa". Sin nombre cargado
 * se borra la marca y se acomoda lo que queda, para que no diga "Hola ," ni
 * "Hola {nombre}".
 */
export function conNombre(texto: string, nombre: string | null | undefined): string {
  const primero = (nombre ?? "").trim().split(/\s+/)[0] ?? "";
  if (primero) return texto.replace(/\{nombre\}/gi, primero);
  return texto
    .replace(/[ \t]*\{nombre\}/gi, "")
    .replace(/[ \t]+([,.!?;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ");
}
