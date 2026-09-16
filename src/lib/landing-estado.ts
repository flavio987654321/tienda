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

import type { Hallazgo } from "@/lib/landing-revision";

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
  /** Lo que acomodamos solos al subir (`lib/landing-arreglos`): botones conectados, acordeón rescatado. */
  arreglos: string[];
  /** Lo que quedó sin función y no se puede arreglar sin adivinar. */
  sueltos: string[];
  /** La revisión de lo que DICE la página (`lib/landing-revision`). */
  hallazgos: Hallazgo[];
};

export type QuitadoDeLanding = {
  scripts: number;
  formularios: number;
  marcos: number;
  eventos: number;
  imagenesIncrustadas: number;
  contadores: number;
};

const INVENTARIO_VACIO: InventarioDeLanding = { precio: 0, precioAnterior: 0, comprar: 0, nombre: 0, fotos: [], reloj: false, opiniones: false, avisoVentas: false, linksVacios: [], imagenesExternas: [], fuentes: [], avisos: [], arreglos: [], sueltos: [], hallazgos: [] };
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
    linksVacios: lista(o.linksVacios), imagenesExternas: lista(o.imagenesExternas), fuentes: lista(o.fuentes), avisos: lista(o.avisos), arreglos: lista(o.arreglos), sueltos: lista(o.sueltos),
    hallazgos: leerHallazgos(o.hallazgos),
  };
}

/** Los hallazgos guardados, sin confiar en su forma: lo que no tiene los tres campos no entra. */
function leerHallazgos(v: unknown): Hallazgo[] {
  if (!Array.isArray(v)) return [];
  const texto = (x: unknown) => (typeof x === "string" ? x.slice(0, 500) : "");
  return v
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x))
    .map((x) => ({ nivel: x.nivel === "traba" ? ("traba" as const) : ("aviso" as const), que: texto(x.que), arreglo: texto(x.arreglo), pedido: texto(x.pedido) }))
    .filter((x) => x.que)
    .slice(0, 20);
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

/* ── Los links del pie ──────────────────────────────────────────────────── */

/** Qué tiene que empezar un link para que lo guardemos. */
const EMPIEZA_BIEN = /^(https?:\/\/|mailto:|tel:)/i;
const UN_CORREO = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;
const UN_TELEFONO = /^\+?[\d\s().-]{7,20}$/;
/** `dominio.algo`, con o sin `www.`, con o sin lo que venga después. */
const UN_DOMINIO = /^[a-z0-9][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)+(:\d+)?([/?#].*)?$/i;

/**
 * Lo que escribió, acomodado.
 *
 * Nadie pega `https://`. Escribe `instagram.com/lacocinade`, o pega el correo
 * de contacto, o el teléfono. Todo eso es lo que quiso decir, así que se
 * acomoda solo en vez de rebotarlo — y si de verdad no es una dirección, el
 * error explica qué falta, en castellano y al lado del campo.
 *
 * La misma función la usan la pantalla y el servidor: lo que ella ve que
 * quedó escrito es exactamente lo que se guarda.
 */
export function acomodarEnlace(crudo: string): { url: string; error: string | null } {
  const v = crudo.trim().replace(/\s+/g, " ");
  if (!v) return { url: "", error: null };
  if (v.length > 600) return { url: v, error: "Ese link es larguísimo. Revisá que sea sólo la dirección." };
  if (/^[a-z][a-z0-9+.-]*:/i.test(v) && !EMPIEZA_BIEN.test(v)) {
    return { url: v, error: "Eso no es una dirección de página. Pegá el link que empieza con https://" };
  }
  if (EMPIEZA_BIEN.test(v)) return revisarUrl(v);
  if (UN_CORREO.test(v)) return { url: `mailto:${v}`, error: null };
  /* Un @ sin dominio es el usuario de Instagram, no un link: lo más común. */
  if (/^@[\w.]+$/.test(v)) return { url: v, error: "Ese es tu usuario, no el link. Entrá a tu perfil y pegá la dirección de arriba." };
  if (UN_TELEFONO.test(v) && /\d{7}/.test(v.replace(/\D/g, ""))) return { url: `tel:${v.replace(/[\s().-]/g, "")}`, error: null };
  if (UN_DOMINIO.test(v)) return revisarUrl(`https://${v.replace(/^\/+/, "")}`);
  return { url: v, error: "Eso no parece una dirección. Pegá el link completo, el que te copia el navegador." };
}

function revisarUrl(v: string): { url: string; error: string | null } {
  if (/^(mailto|tel):/i.test(v)) {
    const resto = v.slice(v.indexOf(":") + 1).trim();
    if (!resto) return { url: v, error: "Falta el correo o el número." };
    return { url: v.slice(0, v.indexOf(":") + 1).toLowerCase() + resto.replace(/\s/g, ""), error: null };
  }
  try {
    const u = new URL(v);
    if (!u.hostname.includes(".") || u.hostname.endsWith(".")) {
      return { url: v, error: "A esa dirección le falta el punto y el final (.com, .com.ar…)." };
    }
    return { url: u.toString(), error: null };
  } catch {
    return { url: v, error: "Esa dirección está mal escrita. Copiala de la barra del navegador." };
  }
}
