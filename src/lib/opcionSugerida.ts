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

// ─────────────────────────────────────────────────────────────────────────────
// El estado del constructor, derivado de las filas.
//
// El constructor no guarda las combinaciones: guarda los COLORES y los VALORES
// de la otra opción por separado, y con eso las rearma. Ese estado se llenaba
// adentro del `.then` del fetch del producto, detrás de un `if` que preguntaba
// por `store.tipoTienda` — leído del closure, donde todavía no existe. O sea que
// no se llenaba NUNCA:
//
//   · abrías una remera con Negro y Verde, y el selector aparecía sin nada
//     marcado aunque abajo se vieran las 4 combinaciones;
//   · al tocar cualquier color se rearmaba todo desde ese estado vacío, y la
//     remera se quedaba sin variantes y con el stock en cero.
//
// Derivarlo de las filas es la única fuente que siempre está: para cuando esto
// corre, las filas ya cargaron. No hace falta saber de qué rubro es la tienda —
// si no usa constructor, el dato queda calculado y nadie lo mira.
//
// Vive acá y no adentro del formulario para poder probarlo: el panel está detrás
// del login y no se puede recorrer con un script.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * La clave con la que el constructor recuerda el stock de cada combinación.
 *
 * Estaba escrita a mano en cinco lugares (`${color}|||${valor}`). Si una sola se
 * desviaba, el stock cargado no se encontraba al rearmar y volvía a cero sin que
 * nada avisara.
 */
export function claveDeCombinacion(color: string, valor: string): string {
  return `${color}|||${valor}`;
}

/** Lo que el constructor recuerda de cada combinación mientras se la rearma. */
export type DatosDeCombinacion = { stock: string; price: string; sku: string; threshold: string };

type FilaDeVariante = ConAttrs & {
  stock: string;
  price: string;
  sku: string;
  lowStockThreshold: string;
};

/**
 * Los colores, los valores de la otra opción y el stock de cada combinación,
 * sacados de las filas que ya están cargadas.
 *
 * `nombreOpcion` es cómo se llama la segunda dimensión en ESTE producto
 * ("Talle", "Largo", "Media"). Sale de las filas, no de una tabla por rubro.
 */
export function estadoDelBuilder(
  filas: FilaDeVariante[],
  nombreOpcion: string,
): { colores: string[]; valores: string[]; stock: Map<string, DatosDeCombinacion> } {
  const stock = new Map<string, DatosDeCombinacion>();
  const colores: string[] = [];
  const valores: string[] = [];
  for (const f of filas) {
    const color = f.attrs["Color"] || "";
    const valor = f.attrs[nombreOpcion] || "";
    stock.set(claveDeCombinacion(color, valor), {
      stock: f.stock,
      price: f.price,
      sku: f.sku,
      threshold: f.lowStockThreshold,
    });
    if (color && !colores.includes(color)) colores.push(color);
    if (valor && !valores.includes(valor)) valores.push(valor);
  }
  return { colores, valores, stock };
}

/**
 * Las filas que tienen una opción cargada y otra vacía.
 *
 * Es el agujero que dejaba vender sin descontar stock. Una fila así se guarda sin
 * problema —`prepareVariantsForSubmit` filtra las CLAVES vacías, no los VALORES,
 * y arma `value: "M"`; el servidor pide que `name` y `value` tengan algo, y los
 * dos tienen—. Pero en la tienda esa variante no coincide con ninguna selección:
 * el comprador elige `M / Negro`, ninguna variante casa, y el pedido salía con
 * `variantId` en null. La caja sólo descuenta stock `if (variant)`, así que se
 * cobraba sin tocar el stock.
 *
 * El motor ahora lo frena del lado de la tienda (`resolveVariantStock` devuelve 0
 * cuando nada coincide). Esto es el otro candado: no dejar que se cree.
 *
 * Devuelve la posición en base 1 y lo que sí está cargado, para poder decir CUÁL
 * fila está mal en vez de un cartel genérico arriba de todo.
 */
export function filasIncompletas<T extends ConAttrs>(
  filas: T[],
): { fila: number; falta: string[]; tiene: string }[] {
  const salida: { fila: number; falta: string[]; tiene: string }[] = [];
  filas.forEach((f, i) => {
    const entradas = Object.entries(f.attrs);
    const llenas = entradas.filter(([, v]) => (v ?? "").trim());
    const vacias = entradas.filter(([, v]) => !(v ?? "").trim());
    // Sólo molesta si hay mezcla: la fila vacía del todo ya la agarra otra
    // validación, y una fila entera es válida.
    if (llenas.length > 0 && vacias.length > 0) {
      salida.push({
        fila: i + 1,
        falta: vacias.map(([k]) => k),
        tiene: llenas.map(([, v]) => v.trim()).join(" / "),
      });
    }
  });
  return salida;
}

/**
 * Las opciones que el constructor NO sabe representar.
 *
 * El constructor maneja "Color" más una segunda opción, y nada más. El modo
 * manual permite hasta `MAX_OPCIONES`. Al pasar de manual a constructor, todo lo
 * que sobre se pierde — y se perdía en silencio. Con esto se puede avisar antes,
 * por nombre.
 */
export function opcionesQueNoEntranEnElBuilder<T extends ConAttrs>(
  filas: T[],
  nombreOpcion: string,
): string[] {
  return nombresDeOpciones(filas).filter(n => n !== "Color" && n !== nombreOpcion);
}
