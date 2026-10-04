"use client";
import { useLayoutEffect, useState, useSyncExternalStore, type RefObject } from "react";

/* ══════════════════════════════════════════════════════════════════════════
   LO QUE PASA AL BAJAR Y SUBIR (Aire y Boho, 04/10/26)
   ══════════════════════════════════════════════════════════════════════════

   Un solo oyente del scroll, y el trabajo en un requestAnimationFrame: se
   mueve a lo sumo una vez por cuadro. Cada template decide cómo se VE (qué
   barra esconde, qué botón dibuja); acá vive sólo el cuándo.

   - `barraOculta`: bajando se esconde la barra de arriba, subiendo vuelve.
     Bajando se mira producto, y en el celular la barra come un sexto de la
     pantalla; subir es la señal de "quiero ir a otro lado". Arriba de todo
     siempre se ve. Un temblor de menos de 8px no la hace parpadear.
   - `lejosArriba`: pasada una pantalla y media, para el "volver arriba".
   - `capas`: fotos que bajan más lento que la página (paralaje). Se escribe
     directo en su estilo, sin pasar por React, porque cambia en cada cuadro.
     Cada capa va agrandada (`escala`) para que al correrse no quede un hueco.

   Con `activo` en false (la previa del editor) no corre nada: ahí la barra
   va pegada dentro del lienzo, y que se escape o que una foto se corra
   mientras se la acomoda sería un problema, no un efecto. Con "reducir
   movimiento" en la compu del visitante, las fotos quedan quietas.

   Los SALTOS no cuentan como dirección (auditoría del 04/10/26):
   - con el cuerpo bloqueado (`position: fixed`, lo que hacen el menú del
     celular y la ficha del producto al abrirse) el scroll vale 0 y se ignora;
   - al cerrarlos, la página vuelve de golpe adonde estaba: un salto de más de
     una pantalla no es "bajar", es volver. Antes, cerrar el menú escondía la
     barra que se acababa de usar.
   - en iPhone, el rebote al llegar al final se recorta al máximo real: si no,
     la vuelta del rebote contaba como "subir" y mostraba la barra.

   Las capas y sus velocidades tienen que ser estables (refs de `useRef` y
   números fijos): el efecto no se reengancha si cambian. */

export type CapaParalaje = { ref: RefObject<HTMLElement | null>; velocidad: number; escala?: number };

const CONSULTA = "(prefers-reduced-motion: reduce)";

export function usePrefiereSinMovimiento() {
  return useSyncExternalStore(
    cb => { const m = window.matchMedia(CONSULTA); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(CONSULTA).matches,
    () => false,
  );
}

export function useEfectosScroll({ activo, capas = [] }: { activo: boolean; capas?: CapaParalaje[] }) {
  const [barraOculta, setBarraOculta] = useState(false);
  const [lejosArriba, setLejosArriba] = useState(false);
  const sinMovimiento = usePrefiereSinMovimiento();

  // De layout y no común: la escala de las capas se pone antes de pintar, así
  // la foto de la portada no da un saltito al cargar.
  useLayoutEffect(() => {
    if (!activo) return;
    let ultimo = window.scrollY;
    let cuadro = 0;
    const mover = () => {
      cuadro = 0;
      if (document.body.style.position === "fixed") return;
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const y = Math.min(Math.max(window.scrollY, 0), max);
      if (Math.abs(y - ultimo) > window.innerHeight) {
        ultimo = y;
        if (y < 140) setBarraOculta(false);
        setLejosArriba(y > window.innerHeight * 1.5);
        return;
      }
      if (y < 140) setBarraOculta(false);
      else if (y - ultimo > 8) setBarraOculta(true);
      else if (ultimo - y > 8) setBarraOculta(false);
      setLejosArriba(y > window.innerHeight * 1.5);
      if (!sinMovimiento && y < window.innerHeight * 1.2) {
        for (const c of capas) {
          if (c.ref.current) c.ref.current.style.transform = `translate3d(0, ${Math.round(y * c.velocidad)}px, 0) scale(${c.escala ?? 1.12})`;
        }
      }
      if (Math.abs(y - ultimo) > 8 || y < 140) ultimo = y;
    };
    const onScroll = () => { if (!cuadro) cuadro = requestAnimationFrame(mover); };
    mover();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (cuadro) cancelAnimationFrame(cuadro); };
    // `capas` se arma en cada render del template; lo que importa son sus refs,
    // que no cambian. Engancharse a la lista lo reengancharía en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, sinMovimiento]);

  /** Para el `onFocusCapture` de la barra: si se llega a ella con el teclado
   *  (Tab) estando escondida, vuelve; si no, el foco caía en links fuera de
   *  la pantalla. */
  const mostrarBarra = () => setBarraOculta(false);

  // Apagado, nunca esconde ni ofrece nada (aunque haya quedado algo de antes).
  return { barraOculta: activo && barraOculta, lejosArriba: activo && lejosArriba, sinMovimiento, mostrarBarra };
}
