"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { filtroAUrl, filtroVacio, type OpcionesDeFiltro } from "@/lib/filtroVehiculos";
import { conPuntos, sinPuntos, type Moneda } from "@/lib/monedaVehiculo";
import { getContrastColor } from "@/contexts/EditContext";

/**
 * El buscador de la portada de Auto Motor (06/10/26): tipo, marca y "hasta
 * cuánto", y lleva a /vehiculos con eso puesto (ver lib/filtroVehiculos).
 * Sólo ofrece lo que la tienda tiene. El precio va en la moneda principal; si
 * la tienda publica en las dos, se elige.
 */
export function BuscadorMotor({ slug, opciones, principal, acento, enEditor }: {
  slug: string;
  opciones: OpcionesDeFiltro;
  principal: Moneda;
  acento: string;
  enEditor: boolean;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState("");
  const [marca, setMarca] = useState("");
  const [precio, setPrecio] = useState("");
  const [moneda, setMoneda] = useState<Moneda>(principal);

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(sinPuntos(precio));
    const sp = filtroAUrl({ ...filtroVacio(principal), tipo: tipo || null, marca: marca || null,
      precioHasta: n > 0 ? n : null, moneda }, principal);
    if (enEditor) sp.set("from", "editor");
    const s = sp.toString();
    router.push(`/tienda/${slug}/vehiculos${s ? `?${s}` : ""}`);
  };

  const campo: React.CSSProperties = { width: "100%", minHeight: 48, boxSizing: "border-box", background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.14)", borderRadius: 2, color: "#fff", padding: "0 14px", fontSize: 14, fontFamily: "inherit" };
  const etiqueta: React.CSSProperties = { display: "block", fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase",
    color: "rgba(255,255,255,0.55)", fontWeight: 700, marginBottom: 6 };
  const opcion: React.CSSProperties = { background: "#141619", color: "#fff" };

  return (
    <form onSubmit={buscar} role="search" aria-label="Buscar vehículos" className="bm-grilla"
      style={{ display: "grid", gap: 12, background: "rgba(11,12,14,0.72)", backdropFilter: "blur(14px)",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: 16 }}>
      {opciones.tipos.length > 1 && (
        <div>
          <label htmlFor="bm-tipo" style={etiqueta}>Tipo</label>
          <select id="bm-tipo" value={tipo} onChange={e => setTipo(e.target.value)} style={campo}>
            <option value="" style={opcion}>Todos</option>
            {opciones.tipos.map(t => <option key={t.valor} value={t.valor} style={opcion}>{t.label} ({t.cuantos})</option>)}
          </select>
        </div>
      )}
      {opciones.marcas.length > 1 && (
        <div>
          <label htmlFor="bm-marca" style={etiqueta}>Marca</label>
          <select id="bm-marca" value={marca} onChange={e => setMarca(e.target.value)} style={campo}>
            <option value="" style={opcion}>Todas</option>
            {opciones.marcas.map(m => <option key={m.valor} value={m.valor} style={opcion}>{m.label}</option>)}
          </select>
        </div>
      )}
      <div>
        <label htmlFor="bm-precio" style={etiqueta}>Hasta</label>
        <div style={{ display: "flex", gap: 6 }}>
          {opciones.monedas.length > 1 ? (
            <select aria-label="Moneda" value={moneda} onChange={e => setMoneda(e.target.value === "USD" ? "USD" : "ARS")}
              style={{ ...campo, width: "auto", flexShrink: 0, padding: "0 8px" }}>
              <option value="ARS" style={opcion}>$</option>
              <option value="USD" style={opcion}>USD</option>
            </select>
          ) : (
            <span aria-hidden="true" style={{ alignSelf: "center", color: "rgba(255,255,255,0.55)", fontSize: 13, flexShrink: 0 }}>
              {moneda === "USD" ? "USD" : "$"}
            </span>
          )}
          <input id="bm-precio" inputMode="numeric" autoComplete="off" placeholder="Sin tope" maxLength={16}
            value={precio} onChange={e => setPrecio(conPuntos(e.target.value).slice(0, 15))} style={{ ...campo, minWidth: 0 }} />
        </div>
      </div>
      <button type="submit" style={{ alignSelf: "end", minHeight: 48, border: "none", borderRadius: 2, cursor: "pointer",
        background: acento, color: getContrastColor(acento) === "dark" ? "#111" : "#fff", fontWeight: 800, fontSize: 12,
        letterSpacing: 2, textTransform: "uppercase", padding: "0 28px", fontFamily: "inherit" }}>
        Buscar
      </button>
    </form>
  );
}
