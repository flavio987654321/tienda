/**
 * Qué dominios son el sitio de TiendaApps y cuáles son de otro.
 *
 * Vive acá y no adentro del middleware porque lo usan dos lados que tienen que
 * contestar lo mismo: el middleware, que con eso decide si traduce el dominio a
 * una tienda o a un producto, y el chat de soporte, que sólo va en lo nuestro.
 * Con dos listas, el día que se agregue un dominio a una, el chat aparece en
 * páginas ajenas o desaparece de las propias sin que nadie se entere.
 *
 * ⚠️ Sin imports a propósito: el chat se carga en TODAS las páginas y el
 * middleware corre en el edge. Lo que entre acá viaja a los dos.
 */
export const PLATFORM_HOSTS = new Set([
  "tiendaapps.com",
  "www.tiendaapps.com",
  "localhost",
]);

/** `true` en el sitio de la plataforma, en local y en las previas de Vercel. */
export function esElSitioDeLaPlataforma(host: string): boolean {
  const h = host.toLowerCase();
  return PLATFORM_HOSTS.has(h) || h.endsWith(".vercel.app");
}
