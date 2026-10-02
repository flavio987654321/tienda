/**
 * Entrar y registrarse con Google: las reglas, sin base ni red.
 *
 * Google solo reemplaza "mail + contraseña". Todo lo demás del alta —qué cuenta
 * es, el plan, el teléfono, los términos y la edad— se sigue pidiendo, en el
 * mismo formulario de `/registro`, antes de entrar a ningún panel. Sin ese paso
 * quedaría una cuenta "comprador" vacía: sin términos aceptados, sin teléfono y
 * sin el panel que vino a buscar.
 *
 * El admin no entra con Google: se le corta en el regreso de Google y otra vez
 * en el middleware (`sesion-admin.ts`).
 */

/** Se muestra el botón solo con esto prendido: sin Google configurado en Supabase, fallaría. */
export const GOOGLE_PRENDIDO = process.env.NEXT_PUBLIC_GOOGLE_LOGIN === "1";

type UsuarioDeSupabase = {
  email?: string | null;
  app_metadata?: { provider?: unknown; providers?: unknown } | null;
  identities?: ReadonlyArray<{
    provider?: unknown;
    identity_data?: Record<string, unknown> | null;
    created_at?: unknown;
  }> | null;
};

/** ¿Esta cuenta tiene Google conectado? */
export function tieneGoogle(u: UsuarioDeSupabase | null | undefined): boolean {
  const providers = u?.app_metadata?.providers;
  if (Array.isArray(providers) && providers.includes("google")) return true;
  if (u?.app_metadata?.provider === "google") return true;
  return (u?.identities ?? []).some((i) => i.provider === "google");
}

/**
 * ¿Alguien registró este mail con contraseña y nunca lo confirmó, y ahora entra
 * el dueño real con Google?
 *
 * Es el "robo por adelantado": un tercero se registra con el mail de otra
 * persona y una contraseña que él conoce. No puede entrar porque no confirma el
 * mail. Si después la dueña entra con Google y Supabase une las dos, el mail
 * queda confirmado... y el tercero entra con su contraseña. Cuando pasa, se le
 * cambia la contraseña por una al azar: la dueña sigue entrando con Google.
 */
export function registroSinConfirmarConGoogle(u: UsuarioDeSupabase | null | undefined): boolean {
  if (!tieneGoogle(u)) return false;
  return (u?.identities ?? []).some(
    (i) => i.provider === "email" && i.identity_data?.email_verified === false,
  );
}

/**
 * ¿Se acaba de conectar Google a una cuenta que YA tenía contraseña (y el mail
 * confirmado)? Es lo que dispara el mail "se conectó Google a tu cuenta": si
 * fue ella, no pasa nada; si no, se entera en el momento.
 *
 * "Recién" es que Google se sumó en los últimos minutos: el regreso de Google
 * llega segundos después, y una entrada cualquiera de otro día no avisa.
 */
export function googleRecienConectado(u: UsuarioDeSupabase | null | undefined, ahora: number): boolean {
  const ids = u?.identities ?? [];
  const google = ids.find((i) => i.provider === "google");
  const conClave = ids.some((i) => i.provider === "email" && i.identity_data?.email_verified !== false);
  if (!google || !conClave) return false;
  const desde = typeof google.created_at === "string" ? Date.parse(google.created_at) : NaN;
  return Number.isFinite(desde) && ahora - desde >= 0 && ahora - desde < 10 * 60 * 1000;
}

/** El perfil que hace falta para saber si la cuenta está a medio hacer. */
export type PerfilParaAlta = {
  role: string;
  termsAcceptedAt: Date | null;
  tieneTienda: boolean;
  tieneSuscripcion: boolean;
} | null;

/**
 * ¿Le falta completar el alta? Sin perfil, o con el "comprador" vacío que crea
 * `getCurrentUser` al ver una sesión sin perfil: sin términos, sin tienda y
 * sin suscripción. Una cuenta que ya eligió algo nunca vuelve a este paso.
 */
export function altaPendiente(perfil: PerfilParaAlta): boolean {
  if (!perfil) return true;
  return perfil.role === "BUYER" && !perfil.termsAcceptedAt && !perfil.tieneTienda && !perfil.tieneSuscripcion;
}

/** Un camino de este sitio, o null. Nada de `//otro.com` ni `https://`. */
export function caminoSeguro(next: string | null | undefined): string | null {
  if (typeof next !== "string" || next.length > 2000) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  /* Ni barras invertidas ni caracteres de control: el navegador BORRA los
     tabs y saltos de línea de una URL, así que "/\t/malo.com" llega como
     "//malo.com", que es otro sitio. Y "\" lo toma como "/". */
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return null;
  // Última palabra: que resuelto contra este sitio siga en este sitio.
  try {
    if (new URL(next, "https://x.invalid").origin !== "https://x.invalid") return null;
  } catch {
    return null;
  }
  return next;
}

/** A dónde va después de volver de Google. */
export function destinoTrasGoogle(pendiente: boolean, next: string | null | undefined): string {
  const seguro = caminoSeguro(next);
  const esRegistro = !!seguro && (seguro === "/registro" || seguro.startsWith("/registro?"));
  if (pendiente) {
    // Si venía del registro, trae lo que ya había elegido (plan, tier, billing).
    if (esRegistro) return seguro.includes("google=1") ? seguro : `${seguro}${seguro.includes("?") ? "&" : "?"}google=1`;
    return "/registro?google=1";
  }
  if (seguro && !esRegistro && !seguro.startsWith("/login")) return seguro;
  return "/panel";
}

/**
 * ¿Es el navegador de adentro de una app (Instagram, Facebook, TikTok...)?
 * Google no deja entrar desde ahí ("disallowed_useragent"), y buena parte de
 * la gente llega desde Instagram: en vez del botón se le dice que abra Chrome.
 */
export function esNavegadorDeApp(ua: string): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Messenger|musical_ly|BytedanceWebview|TikTok|Line\/|Snapchat|Pinterest|; wv\)/i.test(ua);
}
