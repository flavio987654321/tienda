import type { OpcionProducto } from "@/hooks/useStorefront";

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
