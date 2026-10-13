"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import TasacionVehiculo from "@/components/store/auto/TasacionVehiculo";
import BusquedaVehiculo from "@/components/store/auto/BusquedaVehiculo";
import { VentanaAuto } from "@/components/store/auto/VentanaAuto";
import { EditableZone, getContrastColor } from "@/contexts/EditContext";
import type { PreguntaDeAutos } from "@/lib/preguntasFrecuentes";
import { conAlfa, MONO } from "./EscenaVolt";

/** Bloques chicos de Auto Volt (12/10/26). Propios: no se traen de Motor ni de Drive. */
export const BLOQUES_VOLT_CSS = `
  .svv-grilla { display:grid; gap:14px; grid-template-columns:minmax(0,1fr) }
  @media(min-width:780px){ .svv-grilla { grid-template-columns:repeat(2,minmax(0,1fr)) } }
  @keyframes cpv-entra { from { opacity:0; transform:translateY(10px) scale(.98) } to { opacity:1; transform:none } }
  .cpv-msj { animation: cpv-entra .45s cubic-bezier(.2,.8,.2,1) both }
  @keyframes cpv-punto { 0%,80%,100% { opacity:.25; transform:translateY(0) } 40% { opacity:1; transform:translateY(-3px) } }
  .cpv-chip { transition: border-color .2s, background .2s }
  .cpv-chip:hover { border-color: var(--cpv-acento) !important; background: var(--cpv-fondo) !important }
  @media (prefers-reduced-motion: reduce) { .cpv-msj { animation:none } }
`;

/** La ventana de los formularios, oscura: la de fábrica es blanca (Motor y Drive). */
export const PANEL_VOLT: React.CSSProperties = { background: "#0a0e19", color: "#f1f4fb", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 40px 90px -30px rgba(0,0,0,0.8)" };

/* ── Tasá tu usado / Avisame si entra ─────────────────────────────────────── */
export function ServiciosVolt({ storeId, acento, isOwner, isPreview, textos }: {
  storeId?: string;
  acento: string;
  isOwner: boolean;
  isPreview: boolean;
  textos: { tasarTitulo: React.ReactNode; tasarTexto: React.ReactNode; avisameTitulo: React.ReactNode; avisameTexto: React.ReactNode };
}) {
  const [abierto, setAbierto] = useState<null | "tasar" | "avisame">(null);
  const cerrar = useCallback(() => setAbierto(null), []);
  const sobreAcento = getContrastColor(acento) === "dark" ? "#05070d" : "#fff";

  const consola = (cual: "tasar" | "avisame", codigo: string, titulo: React.ReactNode, texto: React.ReactNode, boton: string, principal: boolean) => (
    <div style={{ position: "relative", padding: "clamp(22px,3.4vw,34px)", borderRadius: 22, overflow: "hidden", display: "flex", flexDirection: "column", gap: 14,
      // Fondo propio y oscuro: se lee igual si la dueña le pone un fondo claro al bloque.
      background: principal ? `linear-gradient(150deg, ${conAlfa(acento, 0.22)}, #0a0e19 62%)` : "#0a0e19",
      border: `1px solid ${principal ? conAlfa(acento, 0.4) : "rgba(255,255,255,0.09)"}` }}>
      <span aria-hidden="true" style={{ position: "absolute", top: -60, right: -60, width: 180, height: 180, borderRadius: "50%",
        background: `radial-gradient(circle, ${conAlfa(acento, principal ? 0.35 : 0.15)}, transparent 70%)` }} />
      <p style={{ margin: 0, fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, color: acento }}>{codigo}</p>
      <h3 style={{ margin: 0, fontSize: "clamp(22px,2.6vw,30px)", fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.1, color: "#fff" }}>{titulo}</h3>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: "rgba(232,236,246,0.68)", maxWidth: 460 }}>{texto}</p>
      <button type="button" onClick={() => setAbierto(cual)}
        style={{ alignSelf: "flex-start", marginTop: 6, minHeight: 48, padding: "0 22px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
          fontWeight: 800, fontSize: 14, border: principal ? "none" : "1px solid rgba(255,255,255,0.22)",
          background: principal ? acento : "transparent", color: principal ? sobreAcento : "#fff",
          boxShadow: principal ? `0 10px 30px -10px ${conAlfa(acento, 0.8)}` : "none" }}>
        {boton}
      </button>
    </div>
  );

  return (
    <>
      <div className="svv-grilla">
        {consola("tasar", "// TASACIÓN", textos.tasarTitulo, textos.tasarTexto, "Tasar mi usado", true)}
        {consola("avisame", "// ALERTA DE INGRESO", textos.avisameTitulo, textos.avisameTexto, "Dejar mi búsqueda", false)}
      </div>
      <VentanaAuto abierta={abierto === "tasar"} titulo="Tasá tu usado" onClose={cerrar} panel={PANEL_VOLT}>
        <TasacionVehiculo storeId={storeId} accent={acento} isOwner={isOwner} isPreview={isPreview} abiertoDeEntrada oscuro />
      </VentanaAuto>
      <VentanaAuto abierta={abierto === "avisame"} titulo="Avisame si entra" onClose={cerrar} panel={PANEL_VOLT}>
        <BusquedaVehiculo storeId={storeId} accent={acento} isOwner={isOwner} isPreview={isPreview} oscuro />
      </VentanaAuto>
    </>
  );
}

/* ── Preguntas, como una conversación ─────────────────────────────────────── */
/**
 * Las preguntas frecuentes de Auto Volt no son un acordeón: son un chat. Se ve
 * la primera pregunta ya contestada, y abajo las demás como burbujas para
 * tocar; al tocar una, aparece como mensaje del comprador y la agencia
 * "escribe" la respuesta. Las respuestas son las de `armarPreguntasAutos`, y los
 * campos `faqP1`…`faqR6` son los mismos que en los otros templates de autos.
 *
 * En el editor se ven todas contestadas, para que la dueña pueda reescribirlas.
 */
export function ChatPreguntasVolt({ preguntas, acento, nombreTienda, enEdicion, otraDuda }: {
  preguntas: PreguntaDeAutos[];
  acento: string;
  nombreTienda: string;
  enEdicion: boolean;
  /** La salida para la duda que no está (WhatsApp o contacto). */
  otraDuda: React.ReactNode;
}) {
  const [hechas, setHechas] = useState<number[]>([0]);
  const [escribiendo, setEscribiendo] = useState<number | null>(null);
  const ventana = useRef<HTMLDivElement>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primeraVez = useRef(true);
  const sobreAcento = getContrastColor(acento) === "dark" ? "#05070d" : "#fff";
  const visibles = enEdicion ? preguntas.map((_, i) => i) : hechas;
  const pendientes = preguntas.map((_, i) => i).filter(i => !visibles.includes(i) && i !== escribiendo);

  useEffect(() => () => { if (temporizador.current) clearTimeout(temporizador.current); }, []);
  /* Cada mensaje nuevo queda a la vista bajando la VENTANA del chat, no la
     página. Al cargar no se mueve nada: si no, la ventana arrancaba scrolleada. */
  useEffect(() => {
    if (primeraVez.current) { primeraVez.current = false; return; }
    const v = ventana.current;
    if (v) v.scrollTo({ top: v.scrollHeight, behavior: "smooth" });
  }, [hechas, escribiendo]);

  const preguntar = (i: number) => {
    if (escribiendo !== null) return; // una por vez: la respuesta anterior todavía se está escribiendo
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setHechas(h => [...h, i]); return; }
    setEscribiendo(i);
    temporizador.current = setTimeout(() => { setHechas(h => [...h, i]); setEscribiendo(null); }, 700);
  };

  const burbujaCliente = (i: number) => (
    <div className="cpv-msj" style={{ alignSelf: "flex-end", maxWidth: "min(84%, 460px)", padding: "11px 15px", borderRadius: "18px 18px 4px 18px",
      background: acento, color: sobreAcento, fontSize: 15, fontWeight: 600, lineHeight: 1.45, overflowWrap: "anywhere" }}>
      <EditableZone field={`faqP${i + 1}`} label={`Pregunta ${i + 1}`}>{preguntas[i].p}</EditableZone>
    </div>
  );
  const burbujaAgencia = (contenido: React.ReactNode) => (
    <div className="cpv-msj" style={{ alignSelf: "flex-start", maxWidth: "min(88%, 560px)", display: "flex", gap: 10, alignItems: "flex-end" }}>
      <span aria-hidden="true" style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
        background: conAlfa(acento, 0.16), border: `1px solid ${conAlfa(acento, 0.45)}`, color: acento, fontFamily: MONO, fontSize: 12, fontWeight: 700 }}>
        {(nombreTienda.trim()[0] ?? "A").toUpperCase()}
      </span>
      <div style={{ padding: "12px 15px", borderRadius: "18px 18px 18px 4px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)",
        color: "rgba(232,236,246,0.86)", fontSize: 15, lineHeight: 1.6, overflowWrap: "anywhere", minWidth: 0 }}>
        {contenido}
      </div>
    </div>
  );

  return (
    <div style={{ borderRadius: 26, overflow: "hidden", background: "#0a0e19", border: `1px solid ${conAlfa(acento, 0.28)}`,
      boxShadow: `0 40px 100px -60px ${conAlfa(acento, 0.9)}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexWrap: "wrap" }}>
        <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 10px #22c55e", flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", overflowWrap: "anywhere", minWidth: 0 }}>{nombreTienda}</span>
        <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10, letterSpacing: 2, color: "rgba(232,236,246,0.5)" }}>PREGUNTAS FRECUENTES</span>
      </div>
      <div ref={ventana} role="log" aria-live="polite" aria-label="Preguntas y respuestas"
        style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px clamp(14px,2.4vw,22px)", maxHeight: enEdicion ? undefined : 440, overflowY: "auto" }}>
        {visibles.map(i => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {burbujaCliente(i)}
            {burbujaAgencia(<EditableZone field={`faqR${i + 1}`} label={`Respuesta ${i + 1}`}>{preguntas[i].r}</EditableZone>)}
          </div>
        ))}
        {escribiendo !== null && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {burbujaCliente(escribiendo)}
            {burbujaAgencia(
              <span role="status" aria-label="Escribiendo" style={{ display: "inline-flex", gap: 4, padding: "4px 0" }}>
                {[0, 1, 2].map(k => <span key={k} style={{ width: 6, height: 6, borderRadius: "50%", background: acento, animation: `cpv-punto 1s ${k * 0.15}s infinite` }} />)}
              </span>)}
          </div>
        )}
      </div>
      <div style={{ padding: "14px clamp(14px,2.4vw,22px) 18px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {pendientes.length > 0 && <p style={{ width: "100%", margin: "0 0 2px", fontFamily: MONO, fontSize: 10, letterSpacing: 2, color: "rgba(232,236,246,0.45)" }}>PREGUNTÁ</p>}
        {pendientes.map(i => (
          <button key={i} type="button" className="cpv-chip" onClick={() => preguntar(i)} disabled={escribiendo !== null}
            style={{ minHeight: 40, padding: "8px 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.16)", background: "transparent",
              color: "rgba(232,236,246,0.88)", fontSize: 13.5, fontWeight: 600, cursor: escribiendo !== null ? "wait" : "pointer", fontFamily: "inherit", textAlign: "left",
              overflowWrap: "anywhere", maxWidth: "100%", ...({ "--cpv-acento": acento, "--cpv-fondo": conAlfa(acento, 0.12) } as React.CSSProperties) }}>
            <EditableZone field={`faqP${i + 1}`} label={`Pregunta ${i + 1}`}>{preguntas[i].p}</EditableZone>
          </button>
        ))}
        {otraDuda}
      </div>
    </div>
  );
}
