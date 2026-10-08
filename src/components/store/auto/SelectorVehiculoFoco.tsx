"use client";

import type { StorefrontProduct } from "@/hooks/useStorefront";

/** Selector visible solo en modo edición. El guardado lo gestiona EditContext. */
export function SelectorVehiculoFoco({
  productos,
  seleccionado,
  onChange,
  oscuro = false,
}: {
  productos: StorefrontProduct[];
  seleccionado?: string;
  onChange: (id: string | undefined) => void;
  oscuro?: boolean;
}) {
  const disponibles = productos.filter(p => p.vehicleStatus !== "SOLD" && p.vehicleStatus !== "RESERVED");
  const color = oscuro ? "#f4f4f5" : "#0f172a";
  const borde = oscuro ? "rgba(255,255,255,.22)" : "#cbd5e1";
  const fondo = oscuro ? "#141619" : "#fff";

  return (
    <div style={{ width: "min(100%, 380px)", color, fontFamily: "inherit" }}>
      <label htmlFor="selector-vehiculo-en-foco" style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 800 }}>
        Vehículo para destacar
      </label>
      <select
        id="selector-vehiculo-en-foco"
        value={seleccionado && disponibles.some(p => p.id === seleccionado) ? seleccionado : ""}
        onChange={e => onChange(e.target.value || undefined)}
        style={{ width: "100%", minHeight: 44, padding: "8px 38px 8px 12px", border: `1px solid ${borde}`, borderRadius: 8,
          background: fondo, color, font: "inherit", fontSize: 14, cursor: "pointer" }}
      >
        <option value="">Automático: recomendado para destacar</option>
        {disponibles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <p style={{ margin: "6px 0 0", fontSize: 11, lineHeight: 1.4, opacity: .72 }}>
        {disponibles.length ? "Elegí la unidad que querés mostrar en la vidriera." : "Cargá un vehículo para poder elegirlo."}
      </p>
    </div>
  );
}
