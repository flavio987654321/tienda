"use client";
import { useState } from "react";
import { EditableZone } from "@/contexts/EditContext";
import type { PreguntaDeAutos } from "@/lib/preguntasFrecuentes";

/**
 * Preguntas frecuentes de Auto Drive (07/10/26): cada pregunta es una tarjeta
 * blanca que se abre. Mismos campos editables que Auto Motor (`faqP1`…`faqR6`)
 * y mismas respuestas (lib/preguntasFrecuentes → armarPreguntasAutos).
 */
export function PreguntasDrive({ preguntas, acento }: { preguntas: PreguntaDeAutos[]; acento: string }) {
  const [abierta, setAbierta] = useState<number | null>(0);
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
      {preguntas.map((it, i) => {
        const open = abierta === i;
        const id = `pd-faq-${i}`;
        return (
          <li key={i} style={{ background: "#fff", borderRadius: 18, border: `1px solid ${open ? `${acento}55` : "#e8ebf0"}`,
            boxShadow: open ? "0 10px 30px rgba(15,23,42,.07)" : "none", transition: "border-color .25s, box-shadow .25s" }}>
            <h3 style={{ margin: 0 }}>
              <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setAbierta(open ? null : i)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, background: "none", border: "none", cursor: "pointer",
                  padding: "18px 18px 18px 20px", textAlign: "left", color: "#0f172a", fontFamily: "inherit", borderRadius: 18 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: "clamp(15px,1.6vw,17px)", fontWeight: 700, lineHeight: 1.35, overflowWrap: "anywhere" }}>
                  <EditableZone field={`faqP${i + 1}`} label={`Pregunta ${i + 1}`}>{it.p}</EditableZone>
                </span>
                <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: open ? acento : "#f1f5f9",
                  color: open ? "#fff" : "#0f172a", display: "flex", alignItems: "center", justifyContent: "center",
                  transform: open ? "rotate(180deg)" : "none", transition: "transform .3s, background .25s, color .25s" }}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                </span>
              </button>
            </h3>
            <div id={id} role="region" aria-label={it.p} hidden={!open}
              style={{ padding: "0 20px 20px", fontSize: 15, lineHeight: 1.7, color: "#475569", overflowWrap: "anywhere" }}>
              <EditableZone field={`faqR${i + 1}`} label={`Respuesta ${i + 1}`}>{it.r}</EditableZone>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
