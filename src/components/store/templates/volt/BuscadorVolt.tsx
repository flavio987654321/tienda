"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { filtroAUrl, filtroVacio, filtrarVehiculos, type OpcionesDeFiltro } from "@/lib/filtroVehiculos";
import { conPuntos, sinPuntos, type Moneda } from "@/lib/monedaVehiculo";
import { getContrastColor } from "@/contexts/EditContext";
import { conAlfa } from "./EscenaVolt";
import { MONO } from "./TarjetaVolt";

/**
 * La consola de búsqueda de Auto Volt (12/10/26). El tipo se elige tocando
 * (no en una lista desplegable), y antes de buscar ya dice cuántos vehículos
 * coinciden: nadie aprieta "Buscar" para encontrarse con cero. Lleva a
 * /vehiculos con el filtro puesto (lib/filtroVehiculos), igual que los otros.
 */
export function BuscadorVolt({ slug, productos, opciones, principal, acento, enEditor }: {
  slug: string;
  productos: StorefrontProduct[];
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
  const sobreAcento = getContrastColor(acento) === "dark" ? "#05070d" : "#fff";

  const filtro = useMemo(() => {
    const n = Number(sinPuntos(precio));
    return { ...filtroVacio(principal), tipo: tipo || null, marca: marca || null, precioHasta: n > 0 ? n : null, moneda };
  }, [tipo, marca, precio, moneda, principal]);
  const coinciden = useMemo(() => filtrarVehiculos(productos, filtro, principal).length, [productos, filtro, principal]);

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    const sp = filtroAUrl(filtro, principal);
    if (enEditor) sp.set("from", "editor");
    const s = sp.toString();
    router.push(`/tienda/${slug}/vehiculos${s ? `?${s}` : ""}`);
  };

  const etiqueta: React.CSSProperties = { display: "block", fontFamily: MONO, fontSize: 10, letterSpacing: 2.2, textTransform: "uppercase", color: "rgba(232,236,246,0.55)", marginBottom: 8 };
  const campo: React.CSSProperties = { width: "100%", minHeight: 48, boxSizing: "border-box", background: "rgba(5,7,13,0.55)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12, color: "#fff", padding: "0 14px", fontSize: 15, fontFamily: "inherit" };
  const opcion: React.CSSProperties = { background: "#0a0e19", color: "#fff" };

  return (
    <form onSubmit={buscar} role="search" aria-label="Buscar vehículos"
      style={{ position: "relative", background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))", backdropFilter: "blur(16px)",
        border: `1px solid ${conAlfa(acento, 0.28)}`, borderRadius: 22, padding: "clamp(16px,2.4vw,22px)",
        boxShadow: `0 30px 80px -40px ${conAlfa(acento, 0.6)}, inset 0 1px 0 rgba(255,255,255,0.08)` }}>
      {opciones.tipos.length > 1 && (
        <fieldset style={{ border: "none", margin: "0 0 16px", padding: 0, minWidth: 0 }}>
          <legend style={etiqueta}>Tipo</legend>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[{ valor: "", label: "Todos", cuantos: productos.length }, ...opciones.tipos].map(t => {
              const activo = tipo === t.valor;
              return (
                <button key={t.valor || "todos"} type="button" aria-pressed={activo} onClick={() => setTipo(t.valor)}
                  style={{ minHeight: 40, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                    border: `1px solid ${activo ? acento : "rgba(255,255,255,0.14)"}`, background: activo ? conAlfa(acento, 0.18) : "transparent",
                    color: activo ? "#fff" : "rgba(232,236,246,0.75)", boxShadow: activo ? `0 0 18px ${conAlfa(acento, 0.35)}` : "none",
                    transition: "all .2s", whiteSpace: "nowrap" }}>
                  {t.label} <span style={{ fontFamily: MONO, fontSize: 11, opacity: 0.7 }}>{t.cuantos}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      <div className="bv-campos" style={{ display: "grid", gap: 12, alignItems: "end" }}>
        {opciones.marcas.length > 1 && (
          <div style={{ minWidth: 0 }}>
            <label htmlFor="bv-marca" style={etiqueta}>Marca</label>
            <select id="bv-marca" value={marca} onChange={e => setMarca(e.target.value)} style={campo}>
              <option value="" style={opcion}>Todas</option>
              {opciones.marcas.map(m => <option key={m.valor} value={m.valor} style={opcion}>{m.label}</option>)}
            </select>
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <label htmlFor="bv-precio" style={etiqueta}>Hasta</label>
          <div style={{ display: "flex", gap: 6 }}>
            {opciones.monedas.length > 1 ? (
              <select aria-label="Moneda" value={moneda} onChange={e => setMoneda(e.target.value === "USD" ? "USD" : "ARS")}
                style={{ ...campo, width: "auto", flexShrink: 0, padding: "0 10px" }}>
                <option value="ARS" style={opcion}>$</option>
                <option value="USD" style={opcion}>USD</option>
              </select>
            ) : (
              <span aria-hidden="true" style={{ alignSelf: "center", fontFamily: MONO, color: "rgba(232,236,246,0.55)", fontSize: 13, flexShrink: 0, width: 28, textAlign: "center" }}>
                {moneda === "USD" ? "USD" : "$"}
              </span>
            )}
            <input id="bv-precio" inputMode="numeric" autoComplete="off" placeholder="Sin tope" maxLength={16}
              value={precio} onChange={e => setPrecio(conPuntos(e.target.value).slice(0, 15))} style={{ ...campo, minWidth: 0 }} />
          </div>
        </div>
        <button type="submit" style={{ minHeight: 48, border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
          background: acento, color: sobreAcento, fontWeight: 800, fontSize: 14, letterSpacing: 0.4, padding: "0 22px",
          boxShadow: `0 0 0 1px ${conAlfa(acento, 0.4)}, 0 10px 30px -8px ${conAlfa(acento, 0.7)}`, whiteSpace: "nowrap" }}>
          Ver {coinciden} {coinciden === 1 ? "vehículo" : "vehículos"}
        </button>
      </div>
      <p aria-live="polite" style={{ margin: "12px 0 0", fontFamily: MONO, fontSize: 11, letterSpacing: 1, color: coinciden ? "rgba(232,236,246,0.5)" : "#fca5a5" }}>
        {coinciden ? `${coinciden} ${coinciden === 1 ? "coincide" : "coinciden"} con lo que elegiste` : "Nada con eso por ahora: probá con menos filtros, o dejanos tu búsqueda más abajo."}
      </p>
    </form>
  );
}
