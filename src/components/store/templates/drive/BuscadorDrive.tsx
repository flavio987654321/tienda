"use client";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { filtroAUrl, filtroVacio, filtrarVehiculos, type OpcionesDeFiltro } from "@/lib/filtroVehiculos";
import { conPuntos, sinPuntos, type Moneda } from "@/lib/monedaVehiculo";
import { getContrastColor } from "@/contexts/EditContext";
import TasacionVehiculo from "@/components/store/auto/TasacionVehiculo";
import BusquedaVehiculo from "@/components/store/auto/BusquedaVehiculo";
import { VentanaAuto } from "@/components/store/auto/VentanaAuto";

/**
 * El buscador de la portada de Auto Drive (07/10/26), con tres pestañas, como
 * en los portales de autos:
 *  - Comprar: texto libre, tipo, marca y "hasta cuánto". El botón dice cuántos
 *    hay con eso ANTES de buscar, y si no hay ninguno ofrece el aviso.
 *  - Vender mi usado: los tres pasos y la tasación (components/store/auto).
 *  - Encargar: "Avisame si entra".
 * Sólo ofrece lo que la tienda tiene (lib/filtroVehiculos).
 */
type Pestaña = "comprar" | "vender" | "encargar";
const PESTAÑAS: { id: Pestaña; label: string }[] = [
  { id: "comprar", label: "Comprar" },
  { id: "vender", label: "Vender mi usado" },
  { id: "encargar", label: "Encargar" },
];

export function BuscadorDrive({ slug, productos, opciones, principal, acento, enEditor, storeId, isOwner, isPreview }: {
  slug: string;
  productos: StorefrontProduct[];
  opciones: OpcionesDeFiltro;
  principal: Moneda;
  acento: string;
  enEditor: boolean;
  storeId?: string;
  isOwner: boolean;
  isPreview: boolean;
}) {
  const router = useRouter();
  const sobre = getContrastColor(acento) === "dark" ? "#111" : "#fff";
  const [pestaña, setPestaña] = useState<Pestaña>("comprar");
  const [ventana, setVentana] = useState<null | "tasar" | "avisame">(null);
  const cerrar = useCallback(() => setVentana(null), []);
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [marca, setMarca] = useState("");
  const [precio, setPrecio] = useState("");
  const [moneda, setMoneda] = useState<Moneda>(principal);

  const filtro = useMemo(() => {
    const n = Number(sinPuntos(precio));
    return { ...filtroVacio(principal), q: q.trim(), tipo: tipo || null, marca: marca || null, precioHasta: n > 0 ? n : null, moneda };
  }, [q, tipo, marca, precio, moneda, principal]);
  const cuantos = useMemo(() => filtrarVehiculos(productos, filtro, principal).length, [productos, filtro, principal]);

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    const sp = filtroAUrl(filtro, principal);
    if (enEditor) sp.set("from", "editor");
    const s = sp.toString();
    router.push(`/tienda/${slug}/vehiculos${s ? `?${s}` : ""}`);
  };

  const campo: React.CSSProperties = { width: "100%", minHeight: 50, boxSizing: "border-box", background: "#f8fafc", border: "1px solid #e2e8f0",
    borderRadius: 12, color: "#0f172a", padding: "0 14px", fontSize: 15, fontFamily: "inherit" };
  const etiqueta: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 };
  const botonGrande: React.CSSProperties = { minHeight: 52, border: "none", borderRadius: 12, cursor: "pointer", background: acento, color: sobre,
    fontWeight: 800, fontSize: 15, padding: "0 24px", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 };

  const pasos = (lista: string[]) => (
    <ol style={{ listStyle: "none", margin: "0 0 20px", padding: 0, display: "grid", gap: 10 }} className="bd-pasos">
      {lista.map((t, i) => (
        <li key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "#334155", fontWeight: 600, lineHeight: 1.4 }}>
          <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: `${acento}1a`, color: acento,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{i + 1}</span>
          {t}
        </li>
      ))}
    </ol>
  );

  return (
    <div style={{ background: "#fff", borderRadius: 24, boxShadow: "0 2px 6px rgba(15,23,42,.05), 0 24px 60px rgba(15,23,42,.12)", overflow: "hidden" }}>
      <div role="tablist" aria-label="Qué querés hacer" style={{ display: "flex", borderBottom: "1px solid #eef0f3", overflowX: "auto" }}>
        {PESTAÑAS.map(t => {
          const activa = pestaña === t.id;
          return (
            <button key={t.id} type="button" role="tab" id={`bd-tab-${t.id}`} aria-selected={activa} aria-controls={`bd-panel-${t.id}`}
              onClick={() => setPestaña(t.id)}
              style={{ flex: "1 0 auto", minHeight: 54, padding: "0 10px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: 14, fontWeight: activa ? 800 : 600, color: activa ? "#0f172a" : "#64748b", whiteSpace: "nowrap",
                boxShadow: activa ? `inset 0 -3px 0 ${acento}` : "none", transition: "color .2s, box-shadow .2s" }}>
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "clamp(16px,2.4vw,24px)" }}>
        {pestaña === "comprar" && (
          <form id="bd-panel-comprar" role="tabpanel" aria-labelledby="bd-tab-comprar" onSubmit={buscar}>
            <div role="search" className="bd-grilla" style={{ display: "grid", gap: 12 }}>
              <div className="bd-q">
                <label htmlFor="bd-q" style={etiqueta}>¿Qué buscás?</label>
                <div style={{ position: "relative" }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2} strokeLinecap="round" aria-hidden="true"
                    style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
                  <input id="bd-q" type="search" value={q} onChange={e => setQ(e.target.value)} maxLength={80} autoComplete="off"
                    placeholder="Marca, modelo o año" style={{ ...campo, paddingLeft: 40 }} />
                </div>
              </div>
              {opciones.tipos.length > 1 && (
                <div>
                  <label htmlFor="bd-tipo" style={etiqueta}>Tipo</label>
                  <select id="bd-tipo" value={tipo} onChange={e => setTipo(e.target.value)} style={campo}>
                    <option value="">Todos</option>
                    {opciones.tipos.map(t => <option key={t.valor} value={t.valor}>{t.label} ({t.cuantos})</option>)}
                  </select>
                </div>
              )}
              {opciones.marcas.length > 1 && (
                <div>
                  <label htmlFor="bd-marca" style={etiqueta}>Marca</label>
                  <select id="bd-marca" value={marca} onChange={e => setMarca(e.target.value)} style={campo}>
                    <option value="">Todas</option>
                    {opciones.marcas.map(m => <option key={m.valor} value={m.valor}>{m.label}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="bd-precio" style={etiqueta}>Precio hasta</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {opciones.monedas.length > 1 ? (
                    <select aria-label="Moneda" value={moneda} onChange={e => setMoneda(e.target.value === "USD" ? "USD" : "ARS")}
                      style={{ ...campo, width: "auto", flexShrink: 0, padding: "0 8px" }}>
                      <option value="ARS">$</option>
                      <option value="USD">USD</option>
                    </select>
                  ) : (
                    <span aria-hidden="true" style={{ alignSelf: "center", color: "#64748b", fontSize: 14, fontWeight: 700, flexShrink: 0, padding: "0 2px" }}>
                      {moneda === "USD" ? "USD" : "$"}
                    </span>
                  )}
                  <input id="bd-precio" inputMode="numeric" autoComplete="off" placeholder="Sin tope" maxLength={16}
                    value={precio} onChange={e => setPrecio(conPuntos(e.target.value).slice(0, 15))} style={{ ...campo, minWidth: 0 }} />
                </div>
              </div>
              {/* El botón ocupa el lugar que queda al lado del precio (sin hueco en la grilla). */}
              <button type="submit" style={{ ...botonGrande, alignSelf: "end", width: "100%", minHeight: 50, paddingLeft: 12, paddingRight: 12 }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
                {cuantos === 0 ? "Ver todos" : `Ver ${cuantos} ${cuantos === 1 ? "vehículo" : "vehículos"}`}
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 16px" }}>
              {cuantos === 0 && productos.length > 0 && (
                <p role="status" style={{ margin: "14px 0 0", flex: "1 1 220px", fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                  Con eso no hay ninguno ahora.{" "}
                  <button type="button" onClick={() => setVentana("avisame")}
                    style={{ background: "none", border: "none", padding: 0, color: acento, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 13, textDecoration: "underline" }}>
                    Avisame cuando entre
                  </button>
                </p>
              )}
            </div>
          </form>
        )}

        {pestaña === "vender" && (
          <div id="bd-panel-vender" role="tabpanel" aria-labelledby="bd-tab-vender">
            <p style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#0f172a", letterSpacing: -0.2 }}>Tasá tu usado en un minuto</p>
            {pasos(["Nos contás qué vehículo tenés y cómo está", "Te pasamos una oferta", "Lo entregás en parte de pago o te lo compramos"])}
            <button type="button" onClick={() => setVentana("tasar")} style={botonGrande}>Tasar mi usado →</button>
          </div>
        )}

        {pestaña === "encargar" && (
          <div id="bd-panel-encargar" role="tabpanel" aria-labelledby="bd-tab-encargar">
            <p style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#0f172a", letterSpacing: -0.2 }}>¿No está el que buscás?</p>
            {pasos(["Dejanos marca, modelo y presupuesto", "Te avisamos apenas entra uno así"])}
            <button type="button" onClick={() => setVentana("avisame")} style={botonGrande}>Dejar mi búsqueda →</button>
          </div>
        )}
      </div>

      {ventana && (
        <VentanaAuto titulo={ventana === "tasar" ? "Tasá tu usado" : "Avisame si entra"} onClose={cerrar}>
          {ventana === "tasar"
            ? <TasacionVehiculo storeId={storeId} accent={acento} isOwner={isOwner} isPreview={isPreview} abiertoDeEntrada />
            : <BusquedaVehiculo storeId={storeId} accent={acento} isOwner={isOwner} isPreview={isPreview} />}
        </VentanaAuto>
      )}
    </div>
  );
}
