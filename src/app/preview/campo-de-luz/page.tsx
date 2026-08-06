"use client";
// Página de prueba del shader. Es temporal: se borra cuando Aurora y Lumen estén
// armados y se pueda mirar la escena adentro del template de verdad.
import { CampoDeLuz } from "@/components/store/templates/shared/CampoDeLuz";

export default function PruebaCampoDeLuz() {
  return (
    <div style={{ minHeight: "100vh", background: "#111" }}>
      <div id="oscuro" style={{ position: "relative", height: "50vh" }}>
        <CampoDeLuz modo="oscuro" base="#06070d" colores={["#7c3aed", "#2563eb", "#db2777"]} />
        <div style={{ position: "relative", padding: 40, color: "#fff", fontFamily: "system-ui", letterSpacing: 6, textTransform: "uppercase", fontSize: 13 }}>
          Aurora · oscuro
        </div>
      </div>
      <div id="claro" style={{ position: "relative", height: "50vh" }}>
        <CampoDeLuz modo="claro" base="#fbfaf8" colores={["#f5b8c8", "#b9d4f0", "#e8dcc8"]} />
        <div style={{ position: "relative", padding: 40, color: "#111", fontFamily: "system-ui", letterSpacing: 6, textTransform: "uppercase", fontSize: 13 }}>
          Lumen · claro
        </div>
      </div>
    </div>
  );
}
