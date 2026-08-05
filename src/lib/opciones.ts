import type { OpcionProducto, SeleccionOpciones, StorefrontVariant } from "@/hooks/useStorefront";
import { varianteTiene } from "@/lib/variantMatch";
import { parseVariantAttrs } from "@/lib/variantAttrs";

// ─────────────────────────────────────────────────────────────────────────────
// Qué opciones se muestran y cómo.
//
// Una opción con un solo valor NO es una opción: no hay nada que elegir. Aun así
// se dibujaba el selector completo, y por eso una camisa sin talles mostraba
//
//     TALLE
//     [ Único ]
//
// un cuadro para tocar cuya única función era quedar marcado. Es el mismo caso
// que los botones Mujer/Hombre en una tienda de joyas: un control que no puede
// cambiar nada.
//
// Pero no todos los valores únicos son iguales. "Único" sólo dice que no hay
// opciones —es ruido—; "45cm" o "Plata 925" dicen algo del producto aunque no
// haya nada que elegir. Por eso hay dos formas de mostrar y una de no mostrar.
//
// Vive acá y no en cada pantalla porque son SEIS las que dibujan opciones (los
// cuatro modales de Moda, la ficha compartida y el listado) y la regla tiene que
// ser la misma en todas.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Las opciones de un producto, sacadas de sus variantes.
 *
 * El Map conserva el orden de inserción, así que "Talle" sigue apareciendo antes
 * que "Color" si así se cargaron.
 *
 * Estaba escrito dos veces, palabra por palabra: en el hook del navegador y en
 * el mapeo del servidor. Ahora lo llaman los dos, más la conversión de carritos
 * guardados — tres lugares que tienen que leer las variantes igual.
 */
export function opcionesDeVariantes(variants: StorefrontVariant[]): OpcionProducto[] {
  const porNombre = new Map<string, Set<string>>();
  const sumar = (nombre: string, valor: string) => {
    const n = (nombre ?? "").trim();
    if (!n || !valor) return;
    if (!porNombre.has(n)) porNombre.set(n, new Set());
    porNombre.get(n)!.add(valor);
  };
  for (const v of variants) {
    const attrs = parseVariantAttrs(v.name);
    if (attrs) for (const [n, val] of Object.entries(attrs)) sumar(n, String(val ?? ""));
    // Fila anterior al JSON: `name` era el nombre de la opción y `value` el valor.
    else sumar(v.name, v.value);
  }
  return [...porNombre].map(([nombre, valores]) => ({ nombre, valores: [...valores] }));
}

/**
 * Nombres de opción que se dibujan con la muestra de color al lado del valor.
 *
 * Es lo único que sobrevive de la vieja lista blanca, y le cambió el rol por
 * completo: antes decidía si el dato EXISTÍA —una opción llamada "Largo" se
 * perdía entera—, ahora sólo decide si se pinta un puntito. Una opción con un
 * nombre desconocido se ve igual, nada más que sin puntito.
 */
const NOMBRES_DE_COLOR = ["color", "colour", "colores", "colors", "tono"];

/** ¿Esta opción se dibuja con muestra de color? */
export function esOpcionDeColor(nombre: string): boolean {
  return NOMBRES_DE_COLOR.includes((nombre ?? "").trim().toLowerCase());
}

/** Los valores elegidos, sin los nombres — que es lo que pide `buscarVariante`. */
export function valoresElegidos(seleccion: SeleccionOpciones): string[] {
  return Object.values(seleccion).filter(Boolean);
}

/** Valores que sólo significan "no hay nada que elegir". */
const VALORES_VACIOS = ["único", "unico", "unica", "única", "n/a", "-"];

function esValorVacio(valor: string) {
  return VALORES_VACIOS.includes(valor.trim().toLowerCase());
}

export type OpcionVisible =
  /** Varios valores: van los chips para elegir. */
  | { tipo: "elegir"; nombre: string; valores: string[] }
  /** Un solo valor que informa algo: va como texto, sin botón. */
  | { tipo: "dato"; nombre: string; valor: string };

/**
 * Las opciones que vale la pena mostrar, ya clasificadas.
 *
 * - Sin valores, o con un único valor que dice "Único" → no aparece.
 * - Un solo valor que informa algo ("45cm") → aparece como texto.
 * - Dos o más → aparece con sus chips.
 *
 * El valor se sigue mandando al carrito en todos los casos: cambia lo que se ve,
 * no lo que se compra.
 */
export function opcionesVisibles(opciones: OpcionProducto[]): OpcionVisible[] {
  const salida: OpcionVisible[] = [];
  for (const op of opciones) {
    const valores = op.valores.filter(v => v.trim());
    if (valores.length === 0) continue;
    if (valores.length === 1) {
      if (esValorVacio(valores[0])) continue;
      salida.push({ tipo: "dato", nombre: op.nombre, valor: valores[0] });
      continue;
    }
    salida.push({ tipo: "elegir", nombre: op.nombre, valores });
  }
  return salida;
}

/** Sólo las que el comprador puede elegir — para saber si falta que elija algo. */
export function opcionesAElegir(opciones: OpcionProducto[]) {
  return opcionesVisibles(opciones).filter(
    (o): o is Extract<OpcionVisible, { tipo: "elegir" }> => o.tipo === "elegir",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reacomodar la selección cuando la combinación elegida no existe.
//
// El caso: un vestido viene en Negro talles S y M, y en Rojo sólo L. Estás en
// "Negro / S" y tocás Rojo. "Rojo / S" no existe, así que hay que mover el talle
// a L solo — si no, el botón de comprar se apaga y nada explica por qué.
//
// Esto vivía DUPLICADO en los cuatro templates de Moda, como tres efectos por
// archivo (color→talle, talle→color, foto→color), cada uno con su propia copia
// de "cuál de estas claves es el talle" apoyada en la lista blanca. Doce efectos
// que hacían lo mismo y que sólo sabían manejar exactamente dos dimensiones.
//
// Acá es una sola función, sin hooks, y funciona con las opciones que haya.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * La selección corregida, o `null` si la actual ya es válida.
 *
 * `fijada` es la opción que el comprador acaba de tocar: esa se respeta y se
 * mueven las demás. Entre las combinaciones posibles gana la que tenga stock;
 * si ninguna tiene, la primera, para que el cartel de "sin stock" diga la verdad
 * en vez de dejar la pantalla en una combinación inexistente.
 */
export function reacomodarSeleccion(
  variants: StorefrontVariant[],
  seleccion: SeleccionOpciones,
  fijada: string,
): SeleccionOpciones | null {
  if (!variants.length) return null;
  const valorFijado = seleccion[fijada];
  if (!valorFijado) return null;

  const elegidos = Object.values(seleccion).filter(Boolean);
  // Si lo elegido ya existe tal cual, no se toca nada.
  if (variants.some(v => varianteTiene(v, elegidos))) return null;

  // De las que respetan lo que acaba de tocar, la que menos cambie lo demás.
  //
  // Con dos opciones da igual: si la combinación no existe, la otra opción se
  // tiene que mover sí o sí. Con TRES importa: estando en "S / Negro / Algodón"
  // y tocando "Lino", quedarse con el Negro es mejor que saltar a una
  // combinación que además cambia el color sin motivo. Antes se agarraba la
  // primera con stock y podía mover las dos.
  const candidatas = variants.filter(v => varianteTiene(v, [valorFijado]));
  if (!candidatas.length) return null;
  const otros = Object.entries(seleccion)
    .filter(([nombre]) => nombre !== fijada)
    .map(([, valor]) => valor)
    .filter(Boolean);
  const conserva = (v: StorefrontVariant) => otros.filter(o => varianteTiene(v, [o])).length;
  // Primero las que tienen stock, y entre ésas la que conserve más. Si ninguna
  // tiene stock, el mismo criterio sobre todas: la pantalla queda en una
  // combinación que existe y el cartel de "sin stock" dice la verdad.
  const conStock = candidatas.filter(v => v.stock > 0);
  const pool = conStock.length ? conStock : candidatas;
  const mejor = pool.reduce((a, b) => (conserva(b) > conserva(a) ? b : a));

  const attrs = parseVariantAttrs(mejor.name);
  if (!attrs) return null;
  const nueva: SeleccionOpciones = {};
  for (const [nombre, valor] of Object.entries(attrs)) {
    if (valor) nueva[nombre] = String(valor);
  }
  // Sólo se avisa si algo cambió de verdad, para no disparar renders en vano.
  const cambio = Object.keys(nueva).some(n => nueva[n] !== seleccion[n]);
  return cambio ? nueva : null;
}

/** La opción a la que pertenece un valor — para saber qué acaba de tocar el comprador. */
export function opcionDelValor(opciones: OpcionProducto[], valor: string): string | null {
  const op = opciones.find(o => o.valores.some(v => v.toLowerCase() === valor.toLowerCase()));
  return op?.nombre ?? null;
}
