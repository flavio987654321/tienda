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
