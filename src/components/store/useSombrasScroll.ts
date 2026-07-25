"use client";
import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

/* ────────────────────────────────────────────────────────────────────────────
   Avisa si a un contenedor con scroll le queda contenido arriba o abajo, para
   dibujar un degradado en ese borde.

   Existe porque en el modal de producto el panel de la derecha scrollea con la
   barra oculta —al lado de la del modal quedaban dos barras pegadas y no se
   entendía cuál movía qué—, y sin barra no hay ninguna señal de que hay más para
   leer. El degradado la repone: aparece SOLO si de verdad falta contenido de ese
   lado y desaparece al llegar al final, así que nunca miente.

   Se mide sobre el elemento (`scrollTop`, `clientHeight`, `scrollHeight`) y no
   por cantidad de texto, que depende del ancho y del tamaño de letra.
──────────────────────────────────────────────────────────────────────────────── */
export function useSombrasScroll<T extends HTMLElement>(deps: DependencyList = []) {
  const ref = useRef<T>(null);
  const [sombras, setSombras] = useState({ arriba: false, abajo: false });

  const medir = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // 4px de tolerancia: los navegadores devuelven fracciones al hacer zoom y
    // sin margen el degradado de abajo parpadea al llegar al final.
    const arriba = el.scrollTop > 4;
    const abajo = el.scrollTop + el.clientHeight < el.scrollHeight - 4;
    setSombras(prev => (prev.arriba === arriba && prev.abajo === abajo ? prev : { arriba, abajo }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // La primera medición va en un frame aparte: llamarla acá mismo sería un
    // setState sincrónico dentro del efecto (render en cascada).
    const raf = requestAnimationFrame(medir);
    el.addEventListener("scroll", medir, { passive: true });
    // El alto del panel cambia cuando se mide la columna de la foto, y el
    // contenido cambia al pasar de un producto a otro: por eso las `deps`.
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", medir);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medir, ...deps]);

  return { ref, ...sombras };
}
