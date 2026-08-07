// ─────────────────────────────────────────────────────────────────────────────
// El vuelo de la ficha: la foto sale de la tarjeta y crece.
//
// Un modal común aparece de la nada: la tarjeta que tocaste se queda donde
// estaba y encima brota una ventana. El ojo pierde el hilo y hay que volver a
// buscar qué producto era. Acá no aparece nada: la MISMA foto que tocaste crece
// hasta su lugar en la ficha.
//
// POR QUÉ SE MUEVE LA FICHA ENTERA Y NO LA FOTO SOLA
//
// Lo natural sería animar la foto. Pero la foto vive adentro de un contenedor
// con `overflow: hidden`, así que en cuanto se mueve hacia la tarjeta —que está
// afuera— el navegador la recorta y se ve media foto. Sacarla de ahí con un
// clon flotante es la técnica de manual, y son ochenta líneas más de estado.
//
// La salida es mover el contenedor entero, pero calculando la transformación
// PARA QUE LA FOTO CAIGA EN LA TARJETA. Al arrancar, la ficha está achicada y
// corrida de modo que su foto queda exactamente encima de la de la tarjeta: mismo
// lugar, mismo tamaño. Como la foto de la ficha tiene la misma proporción que la
// de la tarjeta, la escala es una sola y la imagen no se estira ni un pixel.
//
// El panel de texto arranca invisible, así que en el primer cuadro no se ve una
// ficha diminuta: se ve la tarjeta. Aparece cuando la foto ya creció.
//
// LA CUENTA
//
// Con `transform-origin: 0 0`, `translate(tx,ty) scale(s)` primero escala desde
// la esquina superior izquierda de la ficha y después mueve. Entonces la foto,
// que está a (ox, oy) de esa esquina, termina en:
//
//     (fichaX + ox*s + tx,  fichaY + oy*s + ty)
//
// y de ahí sale `tx` y `ty` para que eso dé justo la tarjeta.
// ─────────────────────────────────────────────────────────────────────────────

export type Vuelo = { transform: string; escala: number };

/**
 * @param tarjeta  el rectángulo de la foto EN LA TARJETA (de dónde sale)
 * @param foto     el rectángulo de la foto EN LA FICHA (a dónde llega)
 * @param ficha    el rectángulo de la ficha entera (lo que realmente se mueve)
 */
export function calcularVuelo(tarjeta: DOMRect, foto: DOMRect, ficha: DOMRect): Vuelo | null {
  // Sin ancho no hay nada que calcular: pasa si la tarjeta se desmontó o si la
  // ficha todavía no midió. Devolver null es la señal de "mostrala sin vuelo",
  // que es preferible a dividir por cero y dejar la ficha invisible.
  if (!tarjeta.width || !foto.width || !ficha.width) return null;

  const s = tarjeta.width / foto.width;
  const ox = foto.left - ficha.left;
  const oy = foto.top - ficha.top;
  const tx = tarjeta.left - (ficha.left + ox * s);
  const ty = tarjeta.top - (ficha.top + oy * s);

  return { transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(4)})`, escala: s };
}

/** ¿La tarjeta sigue estando a la vista? Volar hacia afuera se lee como un error. */
export function tarjetaVisible(el: HTMLElement | null): boolean {
  if (!el || !el.isConnected) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
}

export const MS_IDA = 560;
export const MS_VUELTA = 280;
