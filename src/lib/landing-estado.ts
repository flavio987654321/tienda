/**
 * Lo PURO de la landing propia: las formas guardadas y dos ayudantes de
 * nombres. Lo importa el navegador (el panel) y el servidor. Lo que limpia
 * y arma el HTML —que necesita `sanitize-html`— vive en `landing-propia`.
 *
 * Dos lugares en la base:
 *
 *   `LandingDigital`          una fila por versión subida: el HTML limpio,
 *                             el inventario y el recibo. Se guardan las
 *                             últimas `LANDING_VERSIONES` por producto.
 *   `Product.landingPropia`   JSON con lo que NO cambia entre versiones:
 *                             si está prendida, qué versión se muestra,
 *                             las fotos por nombre de hueco y los links
 *                             del pie por su texto. Es lo que hace que
 *                             subir la versión 9 no obligue a cargar de
 *                             nuevo las 13 fotos.
 */

/** Versiones que se guardan por producto: "volver a la anterior" es un botón. */
export const LANDING_VERSIONES = 5;
/** Más que esto no es una landing de Claude: es que trae algo adentro. */
export const LANDING_MAX_BYTES = 500_000;

export type InventarioDeLanding = {
  precio: number;
  precioAnterior: number;
  comprar: number;
  nombre: number;
  /** Nombres de `foto:…`, únicos, en el orden en que aparecen. */
  fotos: string[];
  reloj: boolean;
  opiniones: boolean;
  avisoVentas: boolean;
  /** Links a ninguna parte (`href="#"` o vacío), por su texto. */
  linksVacios: string[];
  /** Imágenes que apuntan afuera (Shopify, Drive…): si las borran allá, acá desaparecen. */
  imagenesExternas: string[];
  /** Hojas de estilo de fuentes que se cargan aparte, arriba de la página. */
  fuentes: string[];
  /** Lo que quedó y no debería: un contador escrito, un "[PRECIO]" sin llenar. Para pedirle a Claude que lo regenere. */
  avisos: string[];
};

export type QuitadoDeLanding = {
  scripts: number;
  formularios: number;
  marcos: number;
  eventos: number;
  imagenesIncrustadas: number;
  contadores: number;
};

const INVENTARIO_VACIO: InventarioDeLanding = { precio: 0, precioAnterior: 0, comprar: 0, nombre: 0, fotos: [], reloj: false, opiniones: false, avisoVentas: false, linksVacios: [], imagenesExternas: [], fuentes: [], avisos: [] };
const QUITADO_VACIO: QuitadoDeLanding = { scripts: 0, formularios: 0, marcos: 0, eventos: 0, imagenesIncrustadas: 0, contadores: 0 };

/** Un JSON guardado → el inventario, sin confiar en su forma. */
export function leerInventario(raw: string | null | undefined): InventarioDeLanding {
  const o = parsear(raw);
  const lista = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 100) : []);
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  if (!o) return INVENTARIO_VACIO;
  return {
    precio: n(o.precio), precioAnterior: n(o.precioAnterior), comprar: n(o.comprar), nombre: n(o.nombre),
    fotos: lista(o.fotos), reloj: o.reloj === true, opiniones: o.opiniones === true, avisoVentas: o.avisoVentas === true,
    linksVacios: lista(o.linksVacios), imagenesExternas: lista(o.imagenesExternas), fuentes: lista(o.fuentes), avisos: lista(o.avisos),
  };
}

export function leerQuitado(raw: string | null | undefined): QuitadoDeLanding {
  const o = parsear(raw);
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  if (!o) return QUITADO_VACIO;
  return { scripts: n(o.scripts), formularios: n(o.formularios), marcos: n(o.marcos), eventos: n(o.eventos), imagenesIncrustadas: n(o.imagenesIncrustadas), contadores: n(o.contadores) };
}

/* ── Lo que se guarda en `Product.landingPropia` ────────────────────────── */

export type EstadoDeLanding = {
  /** Prendida: la dirección del producto muestra la landing en vez de las secciones. */
  activa: boolean;
  /** Qué versión se muestra. Null: ninguna subida todavía. */
  versionId: string | null;
  /** Nombre del hueco (`nombreDeFoto`) → dirección de la foto subida. */
  fotos: Record<string, string>;
  /** Texto del link normalizado (`claveDeLink`) → dirección. */
  enlaces: Record<string, string>;
};

export const ESTADO_DE_FABRICA: EstadoDeLanding = { activa: false, versionId: null, fotos: {}, enlaces: {} };

const ID_RE = /^c[a-z0-9]{20,30}$/;
const CLAVE_RE = /^[a-z0-9-]{1,40}$/;
/** Hasta cuántas fotos y links se guardan: más que eso no es una landing, es un catálogo. */
export const MAX_FOTOS_DE_LANDING = 30;
export const MAX_ENLACES_DE_LANDING = 20;

/** Lo guardado, o lo de fábrica si no hay nada o está roto. Sólo entran claves y direcciones con forma válida. */
export function leerEstadoDeLanding(raw: string | null | undefined): EstadoDeLanding {
  const o = parsear(raw);
  if (!o) return ESTADO_DE_FABRICA;
  return {
    activa: o.activa === true,
    versionId: typeof o.versionId === "string" && ID_RE.test(o.versionId) ? o.versionId : null,
    fotos: mapaLimpio(o.fotos, MAX_FOTOS_DE_LANDING, (v) => /^https:\/\//.test(v)),
    enlaces: mapaLimpio(o.enlaces, MAX_ENLACES_DE_LANDING, (v) => /^(https?:\/\/|mailto:|tel:)/i.test(v)),
  };
}

function mapaLimpio(v: unknown, tope: number, vale: (s: string) => boolean): Record<string, string> {
  const salida: Record<string, string> = {};
  if (!v || typeof v !== "object" || Array.isArray(v)) return salida;
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (Object.keys(salida).length >= tope) break;
    if (CLAVE_RE.test(k) && typeof val === "string" && val.length <= 600 && vale(val)) salida[k] = val;
  }
  return salida;
}

function parsear(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const o: unknown = JSON.parse(raw);
    return o && typeof o === "object" && !Array.isArray(o) ? (o as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/* ── Nombres ────────────────────────────────────────────────────────────── */

/** "foto:Portada del ebook" → "portada-del-ebook". Es la clave con la que se sube. */
export function nombreDeFoto(valor: string): string | null {
  const crudo = valor.replace(/^foto:/i, "");
  const n = crudo.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return n || null;
}

/** "Términos y condiciones" → "terminos-y-condiciones". */
export function claveDeLink(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}
