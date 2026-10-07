"use client";
import { useCallback, useState } from "react";
import TasacionVehiculo from "@/components/store/auto/TasacionVehiculo";
import BusquedaVehiculo from "@/components/store/auto/BusquedaVehiculo";
import { VentanaAuto } from "@/components/store/auto/VentanaAuto";
import { getContrastColor } from "@/contexts/EditContext";

/**
 * "Tasá tu usado" y "Avisame si entra" en la portada de Auto Motor (06/10/26).
 * Antes vivían sólo adentro de la ventana de un vehículo y en /vehiculos: el
 * que entraba a la tienda no se enteraba de que existían. Cada panel abre su
 * formulario (la lógica es la de siempre, ver components/store/auto).
 */
export function ServiciosMotor({ storeId, acento, isOwner, isPreview, textos }: {
  storeId?: string;
  acento: string;
  isOwner: boolean;
  isPreview: boolean;
  textos: { tasarTitulo: React.ReactNode; tasarTexto: React.ReactNode; avisameTitulo: React.ReactNode; avisameTexto: React.ReactNode };
}) {
  const [abierto, setAbierto] = useState<null | "tasar" | "avisame">(null);
  const cerrar = useCallback(() => setAbierto(null), []);
  const sobreAcento = getContrastColor(acento) === "dark" ? "#111" : "#fff";

  const panel = (cual: "tasar" | "avisame", n: string, titulo: React.ReactNode, texto: React.ReactNode, boton: string, icono: React.ReactNode) => (
    <div className="sm-panel" style={{ position: "relative", padding: "clamp(24px,4vw,40px)", background: "#141619",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
      <span aria-hidden="true" style={{ position: "absolute", right: -10, top: -28, fontSize: 150, fontWeight: 900, lineHeight: 1,
        color: "rgba(255,255,255,0.035)", letterSpacing: -8 }}>{n}</span>
      <span aria-hidden="true" style={{ width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        background: `${acento}1f`, color: acento }}>{icono}</span>
      <h3 style={{ margin: 0, fontSize: "clamp(22px,2.6vw,30px)", fontWeight: 800, letterSpacing: -0.8, color: "#f4f4f5", lineHeight: 1.1 }}>{titulo}</h3>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: "rgba(255,255,255,0.62)", maxWidth: 440 }}>{texto}</p>
      <button type="button" onClick={() => setAbierto(cual)}
        style={{ alignSelf: "flex-start", marginTop: 8, minHeight: 48, padding: "0 24px", border: "none", borderRadius: 2,
          background: cual === "tasar" ? acento : "transparent", color: cual === "tasar" ? sobreAcento : "#fff",
          boxShadow: cual === "tasar" ? "none" : "inset 0 0 0 1px rgba(255,255,255,0.3)",
          fontWeight: 800, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>
        {boton}
      </button>
    </div>
  );

  return (
    <>
      <div className="sm-grilla" style={{ display: "grid", gap: 10 }}>
        {panel("tasar", "01", textos.tasarTitulo, textos.tasarTexto, "Tasar mi usado",
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>)}
        {panel("avisame", "02", textos.avisameTitulo, textos.avisameTexto, "Dejar mi búsqueda",
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>)}
      </div>
      {abierto && (
        <VentanaAuto titulo={abierto === "tasar" ? "Tasá tu usado" : "Avisame si entra"} onClose={cerrar}>
          {abierto === "tasar"
            ? <TasacionVehiculo storeId={storeId} accent={acento} isOwner={isOwner} isPreview={isPreview} abiertoDeEntrada />
            : <BusquedaVehiculo storeId={storeId} accent={acento} isOwner={isOwner} isPreview={isPreview} />}
        </VentanaAuto>
      )}
    </>
  );
}
