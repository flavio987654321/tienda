"use client";
import { useState } from "react";
import { EditableZone } from "@/contexts/EditContext";
import type { PreguntaDeAutos } from "@/lib/preguntasFrecuentes";

/**
 * Preguntas frecuentes de Auto Motor (07/10/26). Las respuestas las arma
 * `armarPreguntasAutos` con lo que la tienda tiene; la dueña puede reescribir
 * cada una (campos `faqP1`…`faqR6`, los mismos que en los otros templates).
 * Acordeón con <button aria-expanded>: se abre con teclado y el lector de
 * pantalla dice si está abierta.
 */
export function PreguntasMotor({ preguntas, acento }: { preguntas: PreguntaDeAutos[]; acento: string }) {
  const [abierta, setAbierta] = useState<number | null>(0);
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
      {preguntas.map((it, i) => {
        const open = abierta === i;
        const id = `pm-faq-${i}`;
        return (
          <li key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <h3 style={{ margin: 0 }}>
              <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setAbierta(open ? null : i)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 16, background: "none", border: "none", cursor: "pointer",
                  padding: "22px 0", textAlign: "left", color: "#f4f4f5", fontFamily: "inherit" }}>
                <span aria-hidden="true" style={{ fontSize: 12, fontWeight: 800, color: acento, letterSpacing: 1.5, flexShrink: 0, width: 26 }}>0{i + 1}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: "clamp(16px,1.8vw,20px)", fontWeight: 700, letterSpacing: -0.3, overflowWrap: "anywhere" }}>
                  <EditableZone field={`faqP${i + 1}`} label={`Pregunta ${i + 1}`}>{it.p}</EditableZone>
                </span>
                <span aria-hidden="true" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, border: `1px solid ${open ? acento : "rgba(255,255,255,0.2)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center", color: open ? acento : "#fff", fontSize: 18,
                  transform: open ? "rotate(45deg)" : "none", transition: "transform .25s, border-color .25s, color .25s" }}>+</span>
              </button>
            </h3>
            <div id={id} role="region" aria-label={it.p} hidden={!open}
              style={{ padding: "0 0 22px 42px", maxWidth: 720, fontSize: 15, lineHeight: 1.75, color: "rgba(255,255,255,0.65)", overflowWrap: "anywhere" }}>
              <EditableZone field={`faqR${i + 1}`} label={`Respuesta ${i + 1}`}>{it.r}</EditableZone>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
