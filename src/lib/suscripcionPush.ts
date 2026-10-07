/**
 * La "dirección de entrega" de un aviso al celular, validada (08/10/26).
 *
 * Cuando el navegador acepta recibir avisos, nos da un `endpoint` (una url del
 * servicio de avisos de Google, Apple, Mozilla o Microsoft) y dos claves. El
 * servidor después le hace un POST a ESA url cada vez que avisa.
 *
 * Por eso no se acepta cualquier url: antes bastaba con que fuera https, y una
 * cuenta cualquiera podía anotar `https://algo-interno/…` y hacer que nuestro
 * servidor le pegara a donde quisiera con cada aviso (SSRF). Ahora sólo los
 * servicios de avisos reales. Medido en la base el 08/10/26: los 17 celulares
 * anotados usan fcm.googleapis.com, *.notify.windows.com y web.push.apple.com.
 */

const SERVICIOS = [
  (h: string) => h === "fcm.googleapis.com",                 // Chrome, Edge en Android, Samsung, Opera
  (h: string) => h === "web.push.apple.com",                 // Safari (iPhone con la app instalada, Mac)
  (h: string) => h === "updates.push.services.mozilla.com",  // Firefox
  (h: string) => h.endsWith(".notify.windows.com"),          // Edge en Windows
];

/** Las claves vienen en base64url: auth ≈ 22 caracteres, p256dh ≈ 87. */
const CLAVE = /^[A-Za-z0-9_-]+={0,2}$/;

export type SuscripcionPush = { endpoint: string; auth: string; p256dh: string };

export function endpointDePushValido(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > 1024) return false;
  try {
    const u = new URL(endpoint);
    if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return false;
    const host = u.hostname.toLowerCase();
    return SERVICIOS.some((ok) => ok(host));
  } catch {
    return false;
  }
}

/** Lo que manda el navegador (`subscription.toJSON()`), o null si no sirve. */
export function leerSuscripcionPush(body: unknown): SuscripcionPush | null {
  if (!body || typeof body !== "object") return null;
  const { endpoint, keys } = body as { endpoint?: unknown; keys?: { auth?: unknown; p256dh?: unknown } | null };
  if (!endpointDePushValido(endpoint)) return null;
  const auth = keys?.auth;
  const p256dh = keys?.p256dh;
  if (typeof auth !== "string" || auth.length < 16 || auth.length > 64 || !CLAVE.test(auth)) return null;
  if (typeof p256dh !== "string" || p256dh.length < 80 || p256dh.length > 128 || !CLAVE.test(p256dh)) return null;
  return { endpoint, auth, p256dh };
}
