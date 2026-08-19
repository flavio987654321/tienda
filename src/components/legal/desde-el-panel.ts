import type { Metadata } from "next";

/**
 * Desde qué panel se abrió un documento legal, si es que se abrió desde uno.
 *
 * Los dos paneles enlazan sus términos y su privacidad, pero esos documentos
 * viven fuera del `scope` de los manifiestos. Abrirlos desde la app instalada
 * dejaba a la persona en una pantalla cuyo encabezado es una puerta al sitio
 * comercial: el logo va a la home y al lado hay un "Volver al registro".
 *
 * Con `?panel=dashboard` (o `afiliados`) el documento se dibuja sin esas
 * salidas y con un "Volver al panel" que apunta adentro del `scope`.
 *
 * ── Por qué una lista blanca y no la ruta directa ────────────────────────────
 * Sería más corto aceptar `?volver=/lo/que/sea` y usarlo tal cual. Y sería un
 * redirect abierto de manual: cualquiera podría mandar un link a nuestros
 * términos —una página nuestra, con nuestro dominio y toda la confianza que eso
 * da— con un botón "Volver al panel" apuntando a su propio sitio. Acá sólo
 * existen dos destinos posibles y los dos están escritos en este archivo.
 */
const PANELES = {
  dashboard: "/dashboard",
  afiliados: "/afiliados",
} as const;

export type PanelId = keyof typeof PANELES;

/**
 * La clave del panel, ya validada — o `undefined` si no vino ninguna.
 *
 * La devuelve además de la ruta porque el documento tiene que poder VOLVER A
 * PONER el parámetro en los links que arma solo (las pestañas de rol). Sin eso,
 * el `?panel=` se perdía al primer clic adentro de la página y el encabezado
 * recuperaba sus salidas al sitio.
 */
export function panelValido(crudo: string | undefined): PanelId | undefined {
  if (typeof crudo !== "string") return undefined;
  // `hasOwnProperty` y no `PANELES[crudo]`, por lo mismo que `rolValido`:
  // `?panel=constructor` devolvería una función heredada de Object.prototype.
  return Object.prototype.hasOwnProperty.call(PANELES, crudo) ? (crudo as PanelId) : undefined;
}

export function volverAlPanel(crudo: string | undefined): string | undefined {
  const clave = panelValido(crudo);
  return clave ? PANELES[clave] : undefined;
}

/**
 * Un documento legal abierto desde un panel no lo tiene que indexar Google: es
 * la misma página de siempre con el encabezado cambiado, y dos direcciones con
 * el mismo texto compiten entre ellas. La versión sin parámetro se indexa igual.
 */
export function robotsDeDocumentoLegal(panel: string | undefined): Metadata["robots"] {
  return volverAlPanel(panel) ? { index: false, follow: false } : undefined;
}
