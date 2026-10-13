"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Lo que Auto Volt hace mientras se baja y se sube (13/10/26, a pedido del
 * dueño):
 *
 *   · `--av-prog` (0 a 1) en la raíz: cuánto se bajó. La usa la línea de
 *     progreso de arriba.
 *   · `--av-y` (píxeles) en la raíz: cuánto se bajó. La usa la portada para la
 *     profundidad (la foto va más lento que el texto, el título se desvanece).
 *   · `barraOculta`: al bajar se esconde la barra de arriba; apenas se sube un
 *     poco, vuelve.
 *
 * Se escribe en variables de CSS y no en estado: con estado, el template
 * entero se redibujaría en cada píxel de scroll. Sólo `barraOculta` es estado,
 * y cambia pocas veces.
 *
 * En el editor no scrollea la ventana sino el panel de la vista previa: se
 * busca quién scrollea de verdad (el primer padre con overflow propio), igual
 * que `useVistaTemplate`.
 */
function scrollerDe(el: HTMLElement | null): HTMLElement | null {
  let n = el?.parentElement ?? null;
  while (n && n !== document.body) {
    const ov = getComputedStyle(n).overflowY;
    if (ov === "auto" || ov === "scroll") return n;
    n = n.parentElement;
  }
  return null; // la ventana
}

export function useDesplazamientoVolt(raiz: RefObject<HTMLElement | null>, { activo, puedeEsconder }: { activo: boolean; puedeEsconder: boolean }) {
  const [barraOculta, setBarraOculta] = useState(false);
  const puede = useRef(puedeEsconder);
  useEffect(() => { puede.current = puedeEsconder; }, [puedeEsconder]);

  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const quieto = !activo || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sc = scrollerDe(el);
    const blanco: HTMLElement | Window = sc ?? window;
    let ultimo = 0;
    let pedido = 0;
    const leer = () => {
      pedido = 0;
      const y = sc ? sc.scrollTop : window.scrollY;
      const alto = sc ? sc.scrollHeight - sc.clientHeight : document.documentElement.scrollHeight - window.innerHeight;
      el.style.setProperty("--av-prog", String(alto > 0 ? Math.min(1, Math.max(0, y / alto)) : 0));
      el.style.setProperty("--av-y", quieto ? "0" : String(Math.round(y)));
      const d = y - ultimo;
      if (Math.abs(d) > 6) {
        // Arriba de todo, siempre a la vista; bajando, se va; subiendo, vuelve.
        const ocultar = !quieto && puede.current && d > 0 && y > 160;
        setBarraOculta(o => (o === ocultar ? o : ocultar));
        ultimo = y;
      }
      if (y < 160) setBarraOculta(o => (o ? false : o));
    };
    const alMover = () => { if (!pedido) pedido = requestAnimationFrame(leer); };
    alMover();
    blanco.addEventListener("scroll", alMover, { passive: true });
    window.addEventListener("resize", alMover);
    return () => {
      blanco.removeEventListener("scroll", alMover);
      window.removeEventListener("resize", alMover);
      if (pedido) cancelAnimationFrame(pedido);
      el.style.removeProperty("--av-y");
    };
  }, [raiz, activo]);

  return { barraOculta: barraOculta && puedeEsconder && activo };
}

/** La línea de progreso de arriba. En la tienda va fija a la ventana; en el editor, pegada arriba del panel. */
export function LineaDeProgreso({ acento, enPanel, capa }: { acento: string; enPanel: boolean; capa: number }) {
  const linea = (
    <span aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, height: 2, width: "100%", transformOrigin: "left", transform: "scaleX(var(--av-prog, 0))",
      background: `linear-gradient(90deg, transparent, ${acento})`, boxShadow: `0 0 12px ${acento}, 0 0 2px ${acento}` }} />
  );
  return enPanel
    ? <div aria-hidden="true" style={{ position: "sticky", top: 0, height: 0, zIndex: capa }}>{linea}</div>
    : <div aria-hidden="true" style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2, zIndex: capa, pointerEvents: "none" }}>{linea}</div>;
}
