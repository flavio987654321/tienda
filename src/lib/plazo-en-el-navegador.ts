/**
 * Los plazos firmados, guardados en el navegador. Sólo navegador: toca
 * `document` y `localStorage`.
 *
 * Lo usan las dos ofertas con reloj que le corren a cada visitante: el
 * precio de bienvenida (`lib/bienvenida`) y la oferta del upsell
 * (`lib/oferta-upsell`). Está acá y no copiado en cada una porque es la
 * parte que **hace que el reloj no sea mentira**: si cada oferta se
 * guardara sola, la que se escriba mañana va a reiniciar el plazo con F5 y
 * nadie se va a enterar hasta que alguien mire el precio dos veces.
 *
 * No verifica firmas —el navegador no puede—. Un token inventado sólo puede
 * acortarle el plazo a quien lo inventa; alargarlo no, porque al cobrar la
 * ruta lo firma de nuevo y no coincide.
 */

/**
 * A qué camino se ata la cookie: SÓLO al de este producto.
 *
 * En el dominio de la plataforma todos los productos viven bajo el mismo
 * host (`www.tiendaapps.com/p/<id>`). Con `Path=/`, quien recorre muchos
 * productos —o un bot que recorre cientos— acumula una cookie por cada uno
 * hasta pasar el límite de cabecera del navegador (~4 KB) y el sitio
 * entero le contesta "Request Header Too Large", panel incluido. Y viajaría
 * a todas las rutas `/api/*` sin motivo. Con `Path=/p/<id>` cada cookie va
 * sólo a su página y a su pago. En un subdominio o dominio propio la página
 * es la raíz y el host ya es de un solo producto: ahí es `/`.
 */
export function caminoDeLaCookie(): string {
  try { return location.pathname.match(/^\/p\/[A-Za-z0-9_-]{1,64}/)?.[0] ?? "/"; } catch { return "/"; }
}

/**
 * Guardar el token en el navegador, y decir si hay que pedir la página de
 * nuevo.
 *
 * Se queda con el que vence ANTES de los que hay a mano (la cookie, el
 * localStorage y el que trajo la página) y lo guarda en los dos lados: así
 * recargar, cerrar o volver no reinicia nada.
 *
 * `pedirDeNuevo` es true sólo si el elegido NO es el de la página Y la
 * cookie quedó escrita de verdad (se lee después de escribirla). Dos
 * bucles que esto evita:
 *
 *   - Cookies bloqueadas: el servidor nunca vería el token viejo, daría
 *     otro nuevo, otro desajuste, y otra vez la página. Se sigue con el
 *     plazo que dibujó el servidor, que es lo más que se puede hacer.
 *   - Un token guardado con buena forma pero firma inválida (el secreto se
 *     rotó, o alguien lo tocó): el navegador lo elige por ser más viejo, el
 *     servidor lo rechaza y firma otro, y así para siempre. Si la cookie
 *     que el servidor YA VIO es la que elegiríamos y aun así dibujó con
 *     otra, es que la nuestra no vale: manda el servidor, y lo guardado se
 *     reemplaza por lo suyo.
 *
 * `masViejo` lo pone cada oferta: es su propio lector de tokens, y por eso
 * un token de una no puede colarse como plazo de la otra ni acá ni en el
 * servidor.
 */
export function guardarPlazo(
  clave: string,
  tokenDeLaPagina: string,
  masViejo: (candidatos: Array<unknown>) => string | null,
): { token: string; pedirDeNuevo: boolean } {
  const leerCookie = () => { try { return document.cookie.match(new RegExp(`(?:^|; )${clave}=([^;]*)`))?.[1] ?? null; } catch { return null; } };
  const guardar = (t: string) => {
    try { document.cookie = `${clave}=${t}; Max-Age=2592000; Path=${caminoDeLaCookie()}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`; } catch { /* sin cookies se sigue con lo que hay */ }
    try { window.localStorage.setItem(clave, t); } catch { /* ídem */ }
  };
  const enLaCookie = leerCookie();
  let deLocal: string | null = null;
  try { deLocal = window.localStorage.getItem(clave); } catch { /* ídem */ }
  const elegido = masViejo([enLaCookie, deLocal, tokenDeLaPagina]) ?? tokenDeLaPagina;
  if (elegido !== tokenDeLaPagina && enLaCookie === elegido) {
    guardar(tokenDeLaPagina);
    return { token: tokenDeLaPagina, pedirDeNuevo: false };
  }
  guardar(elegido);
  return { token: elegido, pedirDeNuevo: elegido !== tokenDeLaPagina && leerCookie() === elegido };
}
