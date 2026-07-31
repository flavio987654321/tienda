/**
 * La dirección pública del sitio, en un solo lugar.
 *
 * Va CON www porque es la que sirve de verdad: tiendaapps.com responde 307 y
 * manda a www.tiendaapps.com. Estaba escrita a mano y sin www en ocho archivos
 * (sitemap, robots, metadataBase, los og:url y los fallbacks de las APIs), así
 * que absolutamente todas las URLs que le dábamos a Google eran una redirección
 * — de ahí el aviso de Search Console "Página con redirección".
 *
 * Si algún día el dominio principal pasa a ser el apex, se cambia acá y nada más.
 */
export const SITE_URL = "https://www.tiendaapps.com";

/** La misma, lista para pegarle un path: `${siteUrl("/precios")}`. */
export function siteUrl(path = ""): string {
  return path ? `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}` : SITE_URL;
}

/**
 * La dirección para las URLs que va a leer alguien de AFUERA — Meta yendo a
 * buscar el feed, Google siguiendo un link de producto.
 *
 * NEXT_PUBLIC_APP_URL en desarrollo vale http://localhost:3000, que desde otra
 * máquina no existe. Un feed registrado desde local le quedó a Meta apuntando
 * ahí y fallaba todos los días con "error de autenticación HTTP", con el
 * catálogo vacío y sin ninguna pista de por qué. Para afuera nunca sirve el
 * localhost de nadie: se cae al dominio público.
 */
export const PUBLIC_APP_URL = (() => {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) return SITE_URL;
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(configured) ? SITE_URL : configured;
})();
