// ─────────────────────────────────────────────────────────────────────────────
// Qué opción sugerirle al dueño cuando carga un producto.
//
// Antes esto salía de DOS lugares con criterios distintos:
//   - el NOMBRE, del rubro    (`getVariantOptions`: ROPA → siempre "Talle")
//   - los VALORES, de la categoría (`getTalleSuggestions`: collares → cm)
//
// O sea que el formulario sabía que un collar se mide en centímetros y aun así
// le ponía "Talle" al campo. Quedaba "Talle: 45cm".
//
// Acá el criterio es uno solo: la categoría decide las dos cosas. Y es una
// SUGERENCIA — el nombre queda editable siempre. Una joyería ve "Largo"
// precargado y puede escribir "Medida" si así le llama.
// ─────────────────────────────────────────────────────────────────────────────

export type OpcionSugerida = {
  /** El nombre que se guarda con la variante: "Talle", "Largo", "Tamaño". */
  nombre: string;
  /** El mismo nombre en plural, para el encabezado del bloque: "Talles". */
  titulo: string;
  placeholder: string;
  ayuda: string;
  /** Los valores que se ofrecen como botones. Puede estar vacío. */
  valores: string[];
};

const TALLES_ROPA    = ["Único", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const TALLES_CALZADO = ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];
const TALLES_PANTALON = ["26", "28", "30", "32", "34", "36", "38", "40", "42", "44"];

const SUBCAT_CALZADO = ["zapatillas", "botas", "sandalias", "zapatos", "ojotas", "running", "futbol", "basquet", "training", "trekking"];
const SUBCAT_PANTALON = ["jeans", "wideleg", "cargo", "legging", "short", "pantalon"];

const talle = (valores: string[], placeholder = "ej: 44, 3XL"): OpcionSugerida => ({
  nombre: "Talle",
  titulo: "Talles",
  placeholder,
  ayuda: "Si no encontrás el talle podés crearlo. Escribilo y apretá Enter.",
  valores,
});

const largo = (valores: string[]): OpcionSugerida => ({
  nombre: "Largo",
  titulo: "Largos",
  placeholder: "ej: 45cm",
  ayuda: "El largo de la pieza. Si te falta alguno, escribilo y apretá Enter.",
  valores,
});

/**
 * La opción que se sugiere para un producto, según su rubro y su categoría.
 *
 * La categoría manda sobre el rubro: dentro de Moda, un collar se sugiere como
 * "Largo" aunque el rubro sea ROPA. Es lo que hace que Moda funcione para
 * joyería, lencería o accesorios sin crear un rubro nuevo para cada cosa.
 */
export function sugerirOpcion(tipoTienda: string, category: string, subcategory: string): OpcionSugerida {
  const c = (category || "").toLowerCase().replace(/-/g, "");
  const s = (subcategory || "").toLowerCase().replace(/-/g, "");

  // ── Lo que depende de la categoría, sin importar el rubro ──
  if (c === "joyas" || s === "anillos" || s === "collares" || s === "pulseras") {
    // Un collar y una pulsera se miden en centímetros de largo; un anillo, en
    // número de talle. Son tres cosas distintas dentro de la misma categoría.
    if (s === "collares") return largo(["40cm", "45cm", "50cm", "55cm", "60cm", "70cm"]);
    if (s === "pulseras") return largo(["16cm", "17cm", "18cm", "19cm", "20cm"]);
    if (s === "anillos")  return talle(["12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22"], "ej: 18");
    return talle(["Unitalla", "XS", "S", "M", "L", "XL"]);
  }
  if (c === "ropabebe")  return talle(["0-3m", "3-6m", "6-9m", "9-12m", "12-18m", "18-24m"], "ej: 6-9m");
  if (c === "ropaninos") return talle(["2", "3", "4", "5", "6", "7", "8", "10", "12", "14", "16"], "ej: 10");
  if (c === "calzado"     || SUBCAT_CALZADO.includes(s))  return talle(TALLES_CALZADO, "ej: 41");
  if (c === "pantalones"  || SUBCAT_PANTALON.includes(s)) return talle(TALLES_PANTALON, "ej: 38");

  // ── Si la categoría no dice nada, manda el rubro ──
  switch (tipoTienda) {
    case "HOGAR_TECH":
      return {
        nombre: "Tamaño",
        titulo: "Tamaños / Capacidades",
        placeholder: 'ej: 32", 128GB, 8kg',
        ayuda: "Ingresá el tamaño, capacidad o almacenamiento. Escribilo y apretá Enter.",
        valores: [],
      };
    case "GASTRONOMIA":
      return {
        nombre: "Peso/Tamaño",
        titulo: "Pesos / Tamaños",
        placeholder: "ej: 500g, Individual",
        ayuda: "El peso o tamaño de la porción. Escribilo y apretá Enter.",
        valores: [],
      };
    case "AUTOS":
      return {
        nombre: "Versión",
        titulo: "Versiones",
        placeholder: "ej: Full, Base",
        ayuda: "La versión o equipamiento. Escribila y apretá Enter.",
        valores: [],
      };
    case "GENERAL":
      return {
        nombre: "Variante",
        titulo: "Variantes",
        placeholder: "ej: Chico, Grande",
        ayuda: "Escribí la variante y apretá Enter.",
        valores: [],
      };
    default:
      return talle(TALLES_ROPA);
  }
}

/**
 * Las opciones que arrancan cargadas al crear un producto.
 *
 * Son el punto de partida, no un límite: los nombres se editan y se pueden
 * agregar o sacar hasta llegar a `MAX_OPCIONES`.
 */
export function opcionesIniciales(tipoTienda: string, category: string, subcategory: string): string[] {
  const sug = sugerirOpcion(tipoTienda, category, subcategory).nombre;
  // AUTOS no usa este camino (tiene `hideVariants`), pero si algún día lo usara,
  // "Color / Versión" es el orden que tenía antes.
  return tipoTienda === "AUTOS" ? ["Color", sug] : [sug, "Color"];
}

/** Tope de opciones por producto. Ver la decisión en MODA-RUBRO.md 5.1. */
export const MAX_OPCIONES = 3;

// ─────────────────────────────────────────────────────────────────────────────
// Renombrar, agregar y quitar opciones.
//
// Cada una toca la MISMA clave en TODAS las filas: las opciones son columnas de
// la tabla de variantes, no algo de cada fila. Si una fila quedara con otras
// claves, se guardaría un producto donde una combinación tiene "Talle" y la de
// al lado no, y la tienda dibujaría un selector que aparece y desaparece.
//
// Viven acá y no adentro del formulario para poder probarlas: el formulario
// está detrás del login y no se puede recorrer con un script.
// ─────────────────────────────────────────────────────────────────────────────

type ConAttrs = { attrs: Record<string, string> };

/** Los nombres de las opciones que tiene un producto, en orden. */
export function nombresDeOpciones<T extends ConAttrs>(filas: T[]): string[] {
  return Object.keys(filas[0]?.attrs ?? {});
}

/**
 * Renombra una opción en todas las filas.
 *
 * Se reconstruye el objeto en orden en vez de borrar y volver a agregar, para
 * que la opción renombrada quede en la misma columna. Agregándola al final, las
 * columnas se reordenarían solas mientras el dueño escribe.
 *
 * No hace nada si el nombre nuevo está vacío o ya lo usa otra opción: las dos
 * claves se fundirían en una y se perderían los valores de la otra.
 */
export function renombrarOpcion<T extends ConAttrs>(filas: T[], viejo: string, nuevo: string): T[] {
  const limpio = nuevo.trim();
  if (!limpio || limpio === viejo) return filas;
  const otros = nombresDeOpciones(filas).filter(n => n !== viejo);
  if (otros.some(n => n.toLowerCase() === limpio.toLowerCase())) return filas;
  return filas.map(f => ({
    ...f,
    attrs: Object.fromEntries(
      Object.entries(f.attrs).map(([k, val]) => [k === viejo ? limpio : k, val]),
    ),
  }));
}

/** Suma una opción vacía a todas las filas, con un nombre que no choque. */
export function agregarOpcion<T extends ConAttrs>(filas: T[]): T[] {
  const nombres = nombresDeOpciones(filas);
  if (nombres.length >= MAX_OPCIONES) return filas;
  let nombre = "Opción";
  let n = 2;
  while (nombres.some(x => x.toLowerCase() === nombre.toLowerCase())) nombre = `Opción ${n++}`;
  return filas.map(f => ({ ...f, attrs: { ...f.attrs, [nombre]: "" } }));
}

/** Saca una opción de todas las filas. Nunca deja el producto sin ninguna. */
export function quitarOpcion<T extends ConAttrs>(filas: T[], nombre: string): T[] {
  if (nombresDeOpciones(filas).length <= 1) return filas;
  return filas.map(f => {
    const attrs = { ...f.attrs };
    delete attrs[nombre];
    return { ...f, attrs };
  });
}
