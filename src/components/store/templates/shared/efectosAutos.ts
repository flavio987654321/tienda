"use client";
/**
 * Los efectos al bajar de los templates de autos (08/10/26). La lógica es una;
 * cómo se ve cada efecto lo escribe cada template en su CSS, así Auto Motor y
 * Auto Drive no se mueven igual.
 *
 *   [data-ef="sube"]     sus hijos entran uno tras otro al aparecer en pantalla.
 *   [data-ef="grilla"]   lo mismo, para grillas de tarjetas.
 *   [data-ef="titulo"]   el encabezado de una sección (la rayita se dibuja, etc.).
 *   [data-ef-contar]     el número de adentro cuenta desde 0 hasta el que está escrito.
 *
 * Todo depende de la clase `ef-listo` en <html>, que pone este hook: sin
 * JavaScript, en el editor (`activo` falso) o antes de que cargue, se ve todo
 * como siempre. Con "reducir movimiento" no se esconde ni se anima nada.
 */
import { useEffect } from "react";

const REDUCIR = "(prefers-reduced-motion: reduce)";

/** Cuenta el primer número del texto (respeta "+", "%" y los puntos de miles) y deja el texto exacto al final. */
function contar(el: HTMLElement) {
  const caminante = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let nodo: Text | null = null;
  while (caminante.nextNode()) { const t = caminante.currentNode as Text; if (/\d/.test(t.nodeValue ?? "")) { nodo = t; break; } }
  if (!nodo) return;
  const original = nodo.nodeValue ?? "";
  const m = original.match(/^(\D*)(\d{1,3}(?:\.\d{3})+|\d+)([\s\S]*)$/);
  if (!m) return;
  const final = Number(m[2].replace(/\./g, ""));
  if (!Number.isFinite(final) || final < 2 || final > 10_000_000) return;
  const conPuntos = m[2].includes(".");
  const t0 = performance.now();
  const dura = 1400;
  const n = nodo;
  const paso = (ahora: number) => {
    if (!n.isConnected) return;
    const k = Math.min(1, (ahora - t0) / dura);
    const v = Math.round(final * (1 - Math.pow(1 - k, 3)));
    n.nodeValue = k >= 1 ? original : `${m[1]}${conPuntos ? v.toLocaleString("es-AR") : v}${m[3]}`;
    if (k < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

export function useEfectosAlBajar(activo: boolean) {
  useEffect(() => {
    if (!activo || typeof IntersectionObserver === "undefined" || window.matchMedia(REDUCIR).matches) return;
    const html = document.documentElement;
    /* Lo que ya está a la vista al abrir queda quieto (`ef-ya`): si no, se
       escondía un instante y volvía a entrar animado, un parpadeo. Sólo se
       anima lo que aparece al bajar. */
    document.querySelectorAll<HTMLElement>("[data-ef]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.height > 0 && r.top < window.innerHeight && r.bottom > 0) el.classList.add("ef-in", "ef-ya");
    });
    html.classList.add("ef-listo");
    const obs = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        el.classList.add("ef-in");
        if (el.hasAttribute("data-ef-contar")) contar(el);
        obs.unobserve(el);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    const mirar = () => document.querySelectorAll("[data-ef]:not(.ef-in), [data-ef-contar]:not(.ef-in)").forEach((el) => obs.observe(el));
    mirar();
    // Lo que aparece después (catálogo que carga, secciones que se prenden) también entra.
    const mut = new MutationObserver(mirar);
    mut.observe(document.body, { childList: true, subtree: true });
    return () => { obs.disconnect(); mut.disconnect(); html.classList.remove("ef-listo"); };
  }, [activo]);
}
