/**
 * Cuándo se vence la sesión del ADMIN, aunque la de Supabase siga viva.
 *
 * Supabase renueva la sesión sola mientras nadie la cierre: un admin abierto en
 * una compu un lunes seguía entrando el domingo sin pedir nada. Para un panel
 * que puede banear, borrar y tocar suscripciones, eso es demasiado. Tres topes:
 *
 *  - INACTIVIDAD: una hora sin moverse en el panel.
 *  - TOPE: doce horas desde que pasó el código, aunque lo esté usando.
 *  - ESPERA DEL CÓDIGO: diez minutos en la pantalla del 2FA con la contraseña
 *    puesta y sin el código.
 *
 * Los tiempos salen de la sesión misma (`amr`: cuándo pasó la contraseña y
 * cuándo el código), que viene firmada por Supabase y no se puede retocar. La
 * única pieza nuestra es la cookie de última actividad, y va firmada y atada a
 * ESA sesión: copiarla de otra, o inventarle una fecha, no sirve. Borrarla
 * tampoco ayuda: sin cookie se cuenta desde que pasó el código.
 *
 * Solo el admin: es el único rol con segundo factor, y sin factor no hay `totp`
 * en el `amr`, así que las tiendas, afiliados y digitales no se tocan.
 *
 * Puro salvo la firma (Web Crypto, que anda en el middleware y en Node).
 */

export const INACTIVIDAD_MS = 60 * 60 * 1000;
export const TOPE_MS = 12 * 60 * 60 * 1000;
export const ESPERA_CODIGO_MS = 10 * 60 * 1000;

export const COOKIE_ACTIVIDAD = "ta_admin_actividad";

export type MotivoVencida = "inactividad" | "tope" | "espera-codigo" | "google";

/** Lo que dice `getAuthenticatorAssuranceLevel()`, ya con los tiempos en ms. */
export type EstadoSesion = {
  /** aal2: pasó el código en esta sesión. */
  conCodigo: boolean;
  /** Tiene un factor y le falta pasarlo (aal1 → aal2). */
  faltaCodigo: boolean;
  /** Cuándo pasó el código (ms), si lo pasó. */
  codigoDesde: number | null;
  /** Cuándo puso la contraseña (ms). */
  claveDesde: number | null;
  /** Entró con Google (u otro proveedor): el admin no entra así. */
  conGoogle: boolean;
};

type Amr = { method?: unknown; timestamp?: unknown } | string;

/** El momento más reciente en que se usó un método que cumple `cual`, en ms. */
function momentoDe(amr: readonly Amr[] | null | undefined, cual: (metodo: unknown) => boolean): number | null {
  let ultimo: number | null = null;
  for (const e of amr ?? []) {
    if (typeof e !== "object" || e === null || !cual(e.method)) continue;
    if (typeof e.timestamp !== "number" || !Number.isFinite(e.timestamp)) continue;
    const ms = e.timestamp * 1000;
    if (ultimo === null || ms > ultimo) ultimo = ms;
  }
  return ultimo;
}

export function estadoDeLaSesion(aal: {
  currentLevel?: string | null;
  nextLevel?: string | null;
  currentAuthenticationMethods?: readonly Amr[] | null;
} | null | undefined): EstadoSesion {
  const amr = aal?.currentAuthenticationMethods;
  return {
    conCodigo: aal?.currentLevel === "aal2",
    faltaCodigo: aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2",
    codigoDesde: momentoDe(amr, (m) => m === "totp"),
    // El primer paso suele ser la contraseña, pero puede ser un link por mail o
    // Google: cualquier cosa que no sea el código cuenta como "ya entró".
    claveDesde: momentoDe(amr, (m) => m !== "totp"),
    conGoogle: momentoDe(amr, (m) => m === "oauth") !== null,
  };
}

/**
 * ¿Se venció? `ultimaActividad` es la de la cookie ya verificada, o null si no
 * hay (o no vale): entonces se cuenta desde que pasó el código.
 */
export function vencida(
  s: EstadoSesion,
  ultimaActividad: number | null,
  ahora: number,
): MotivoVencida | null {
  // Solo se llama en las rutas del admin, y el admin no entra con Google: ni
  // aunque después ponga el código. Ver `lib/alta-google`.
  if (s.conGoogle) return "google";
  if (s.faltaCodigo) {
    if (s.claveDesde !== null && ahora - s.claveDesde > ESPERA_CODIGO_MS) return "espera-codigo";
    return null;
  }
  if (!s.conCodigo || s.codigoDesde === null) return null;
  if (ahora - s.codigoDesde > TOPE_MS) return "tope";
  const desde = Math.max(s.codigoDesde, ultimaActividad ?? s.codigoDesde);
  if (ahora - desde > INACTIVIDAD_MS) return "inactividad";
  return null;
}

/**
 * ¿Este pedido cuenta como "moverse"? Mirar una página o hacer algo, sí. Lo que
 * el panel pide solo —los contadores de la barra cada minuto, los prefetch de
 * los links— no: si no, el panel abierto se mantendría vivo para siempre.
 */
export function cuentaComoActividad(r: {
  pathname: string;
  method: string;
  prefetch: boolean;
}): boolean {
  if (r.prefetch) return false;
  if (r.pathname.startsWith("/api/")) return r.method !== "GET" && r.method !== "HEAD";
  // Una página: abrirla, o una acción de servidor (POST a la misma ruta).
  return true;
}

/* ── La cookie firmada ─────────────────────────────────────────────────────── */

const encoder = new TextEncoder();

async function hmac(secreto: string, texto: string): Promise<string> {
  const clave = await crypto.subtle.importKey(
    "raw", encoder.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const firma = new Uint8Array(await crypto.subtle.sign("HMAC", clave, encoder.encode(texto)));
  let hex = "";
  for (const b of firma) hex += b.toString(16).padStart(2, "0");
  return hex;
}

/** La sesión a la que pertenece la cookie: la persona y el momento del código. */
function atadura(userId: string, codigoDesde: number): string {
  return `${userId}:${codigoDesde}`;
}

export async function firmarActividad(
  secreto: string, userId: string, codigoDesde: number, cuando: number,
): Promise<string> {
  const firma = await hmac(secreto, `${atadura(userId, codigoDesde)}:${cuando}`);
  return `${cuando}.${firma}`;
}

/** El momento de la cookie si es de esta sesión y la firma da; si no, null. */
export async function leerActividad(
  secreto: string, userId: string, codigoDesde: number, valor: string | undefined, ahora: number,
): Promise<number | null> {
  const m = /^(\d{1,15})\.([0-9a-f]{64})$/.exec(valor ?? "");
  if (!m) return null;
  const cuando = Number(m[1]);
  // Una fecha futura no la pudimos firmar nosotros, salvo un reloj corrido.
  if (cuando > ahora + 60_000) return null;
  const esperada = await hmac(secreto, `${atadura(userId, codigoDesde)}:${cuando}`);
  let distinto = esperada.length ^ m[2].length;
  for (let i = 0; i < esperada.length; i++) distinto |= esperada.charCodeAt(i) ^ m[2].charCodeAt(i);
  return distinto === 0 ? cuando : null;
}
