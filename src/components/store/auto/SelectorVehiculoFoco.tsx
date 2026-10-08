"use client";

import type { StorefrontProduct } from "@/hooks/useStorefront";
import { isDemoProductId } from "@/lib/demoProducts";

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
  // La vista del editor puede completar el diseño con ejemplos. Nunca deben
  // confundirse con unidades reales ni quedar guardados como elección.
  const disponibles = productos.filter(p => !isDemoProductId(p.id) && p.vehicleStatus !== "SOLD" && p.vehicleStatus !== "RESERVED");
  const hayEjemplos = productos.some(p => isDemoProductId(p.id));
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
      <p style={{ margin: "6px 0 0", fontSize: 11, lineHeight: 1.5, opacity: .78 }}>
        {disponibles.length
          ? `Elegí una unidad real disponible. Si dejás Automático, se destaca una unidad de tu stock.${hayEjemplos ? " Los vehículos de ejemplo que ves en esta vista previa no se publican." : ""}`
          : hayEjemplos
            ? "Lo que ves en la vista previa son vehículos de ejemplo para mostrar el diseño: no se publican. Cargá una unidad real para poder elegirla."
            : "Cargá una unidad real disponible para poder elegirla."}
      </p>
    </div>
  );
}
