"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { conAlfa } from "./EscenaVolt";

/**
 * Una fila que se desliza de costado, SIN barra de scroll a la vista (13/10/26:
 * el dueño no quería ver la barra debajo de las miniaturas del showroom). Se
 * mueve con las flechas de los costados, que aparecen sólo si hay más de ese
 * lado, o deslizando con el dedo / la ruedita como siempre. Los bordes se
 * desvanecen para que se note que sigue.
 */
export const TIRA_VOLT_CSS = `
  .tiv-pista { display:flex; overflow-x:auto; scrollbar-width:none; -ms-overflow-style:none; scroll-behavior:smooth; overscroll-behavior-x:contain }
  .tiv-pista::-webkit-scrollbar { display:none }
  .tiv-flecha { transition: opacity .2s, background .2s, border-color .2s, transform .2s }
  .tiv-flecha:hover { background: var(--tiv-fondo) !important; border-color: var(--tiv-acento) !important }
  .tiv-flecha:focus-visible { outline:2px solid var(--tiv-acento); outline-offset:2px }
  @media (prefers-reduced-motion: reduce) { .tiv-pista { scroll-behavior:auto } }
`;

export function TiraVolt({ acento, gap = 8, etiqueta, children }: {
  acento: string;
  gap?: number;
  etiqueta: string;
  children: React.ReactNode;
}) {
  const pista = useRef<HTMLDivElement>(null);
  const [lados, setLados] = useState({ izq: false, der: false });

  const medir = useCallback(() => {
    const el = pista.current;
    if (!el) return;
    const izq = el.scrollLeft > 4;
    const der = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setLados(l => (l.izq === izq && l.der === der ? l : { izq, der }));
  }, []);

  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    for (const h of Array.from(el.children)) ro.observe(h);
    return () => ro.disconnect();
  }, [medir, children]);

  const mover = (lado: 1 | -1) => {
    const el = pista.current;
    if (el) el.scrollBy({ left: lado * Math.max(160, el.clientWidth * 0.8) });
  };

  const flecha = (lado: 1 | -1) => {
    const visible = lado === 1 ? lados.der : lados.izq;
    return (
      <button type="button" className="tiv-flecha" onClick={() => mover(lado)} aria-label={lado === 1 ? "Ver más" : "Ver los anteriores"}
        tabIndex={visible ? 0 : -1} aria-hidden={!visible}
        style={{ position: "absolute", top: "50%", [lado === 1 ? "right" : "left"]: 0, transform: `translateY(-50%) scale(${visible ? 1 : 0.8})`, zIndex: 2,
          width: 38, height: 38, borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(8,11,21,0.82)", backdropFilter: "blur(8px)",
          color: "#fff", fontSize: 20, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
          opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none", boxShadow: `0 0 18px ${conAlfa(acento, 0.35)}` }}>
        {lado === 1 ? "›" : "‹"}
      </button>
    );
  };

  /* Los bordes desvanecidos: sólo del lado donde hay más. */
  const mascara = `linear-gradient(90deg, ${lados.izq ? "transparent 0, #000 56px" : "#000 0"}, ${lados.der ? "#000 calc(100% - 56px), transparent 100%" : "#000 100%"})`;

  return (
    <div style={{ position: "relative", ...({ "--tiv-acento": acento, "--tiv-fondo": conAlfa(acento, 0.18) } as React.CSSProperties) }}>
      <div ref={pista} role="group" aria-label={etiqueta} className="tiv-pista" onScroll={medir}
        style={{ gap, padding: "4px 2px", WebkitMaskImage: mascara, maskImage: mascara }}>
        {children}
      </div>
      {flecha(-1)}
      {flecha(1)}
    </div>
  );
}
