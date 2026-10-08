"use client";
import { useCallback, useState } from "react";
import TasacionVehiculo from "@/components/store/auto/TasacionVehiculo";
import BusquedaVehiculo from "@/components/store/auto/BusquedaVehiculo";
import { VentanaAuto } from "@/components/store/auto/VentanaAuto";
import { getContrastColor } from "@/contexts/EditContext";

/**
 * "Vendé o permutá tu usado" de Auto Drive (07/10/26): un panel grande del
 * color de la tienda con los tres pasos y la foto, y al lado "Avisame si
 * entra". Los formularios son los de siempre (components/store/auto).
 */
export function VenderDrive({ storeId, acento, isOwner, isPreview, foto, botonFoto, textos }: {
  storeId?: string;
  acento: string;
  isOwner: boolean;
  isPreview: boolean;
  foto: string;
  /** El botón del editor para cambiar la foto. */
  botonFoto?: React.ReactNode;
  textos: { tasarTitulo: React.ReactNode; tasarTexto: React.ReactNode; avisameTitulo: React.ReactNode; avisameTexto: React.ReactNode };
}) {
  const [abierto, setAbierto] = useState<null | "tasar" | "avisame">(null);
  const cerrar = useCallback(() => setAbierto(null), []);
  const oscuro = getContrastColor(acento) === "light";
  const tinta = oscuro ? "#fff" : "#0f172a";
  const suave = oscuro ? "rgba(255,255,255,0.8)" : "rgba(15,23,42,0.72)";

  return (
    <>
      <div className="vdr-grilla" style={{ display: "grid", gap: 14 }}>
        <div className="vdr-panel" style={{ position: "relative", borderRadius: 28, overflow: "hidden", color: tinta,
          background: `linear-gradient(135deg, ${acento} 0%, ${acento} 45%, color-mix(in srgb, ${acento} 70%, #000) 100%)` }}>
          <div className="vdr-texto" style={{ position: "relative", zIndex: 1, padding: "clamp(24px,4vw,48px)" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "clamp(26px,3.4vw,40px)", fontWeight: 900, letterSpacing: -1.2, lineHeight: 1.05 }}>{textos.tasarTitulo}</h3>
            <p style={{ margin: "0 0 22px", fontSize: 16, lineHeight: 1.6, color: suave, maxWidth: 440 }}>{textos.tasarTexto}</p>
            <ol style={{ listStyle: "none", margin: "0 0 26px", padding: 0, display: "grid", gap: 12 }}>
              {["Nos contás qué tenés y cómo está", "Te pasamos una oferta", "Lo entregás en parte de pago o te lo compramos"].map((t, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>
                  <span aria-hidden="true" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    background: oscuro ? "rgba(255,255,255,0.18)" : "rgba(15,23,42,0.1)", fontSize: 14, fontWeight: 900 }}>{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
            <button type="button" onClick={() => setAbierto("tasar")}
              style={{ minHeight: 52, padding: "0 26px", border: "none", borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
                background: oscuro ? "#fff" : "#0f172a", color: oscuro ? "#0f172a" : "#fff", fontSize: 15, fontWeight: 800,
                boxShadow: "0 10px 30px rgba(0,0,0,0.18)" }}>
              Tasar mi usado →
            </button>
          </div>
          <div className="vdr-foto" style={{ position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- foto elegida por el dueño */}
            <img src={foto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            {botonFoto}
          </div>
        </div>

        <div style={{ borderRadius: 28, background: "#fff", border: "1px solid #e8ebf0", padding: "clamp(24px,3vw,36px)", display: "flex", flexDirection: "column", gap: 12 }}>
          <span aria-hidden="true" style={{ width: 52, height: 52, borderRadius: 16, background: `${acento}1a`, color: acento, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </span>
          <h3 style={{ margin: 0, fontSize: "clamp(20px,2.2vw,26px)", fontWeight: 800, letterSpacing: -0.6, color: "#0f172a", lineHeight: 1.15 }}>{textos.avisameTitulo}</h3>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#475569" }}>{textos.avisameTexto}</p>
          <button type="button" onClick={() => setAbierto("avisame")}
            style={{ marginTop: "auto", alignSelf: "flex-start", minHeight: 48, padding: "0 22px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
              background: "#fff", color: "#0f172a", border: "1.5px solid #0f172a", fontSize: 14, fontWeight: 800 }}>
            Dejar mi búsqueda
          </button>
        </div>
      </div>
      <VentanaAuto abierta={abierto === "tasar"} titulo="Tasá tu usado" onClose={cerrar}>
        <TasacionVehiculo storeId={storeId} accent={acento} isOwner={isOwner} isPreview={isPreview} abiertoDeEntrada />
      </VentanaAuto>
      <VentanaAuto abierta={abierto === "avisame"} titulo="Avisame si entra" onClose={cerrar}>
        <BusquedaVehiculo storeId={storeId} accent={acento} isOwner={isOwner} isPreview={isPreview} />
      </VentanaAuto>
    </>
  );
}

export const VENDER_DRIVE_CSS = `
  .vdr-panel { display:grid; grid-template-columns:1fr }
  .vdr-foto { min-height:200px }
  @media(min-width:760px){ .vdr-panel { grid-template-columns:minmax(0,1.15fr) minmax(0,0.85fr) } .vdr-foto { min-height:0 } }
  @media(min-width:1100px){ .vdr-grilla { grid-template-columns:minmax(0,2.2fr) minmax(0,1fr) } }
`;
