"use client";
import { useState } from "react";
import { EditableZone, EditableImageButton, getContrastColor } from "@/contexts/EditContext";
import { WaIcon } from "@/components/store/auto/AutoVehicleShared";
import { filtroVacio, type FiltroVehiculos, type OpcionesDeFiltro } from "@/lib/filtroVehiculos";
import { conPuntos, sinPuntos, type Moneda } from "@/lib/monedaVehiculo";
import type { ImageOverride } from "@/types/store-config";
import { fotoLiviana } from "@/lib/foto-liviana";
import { conAlfa, MONO } from "./EscenaVolt";

/**
 * La portada de Auto Volt (13/10/26): foto entera, título y buscador, como en
 * los otros templates de autos (el dueño la pidió: entrar directo al carrusel
 * desorientaba; lo primero que se hace en una agencia es buscar). El showroom
 * giratorio queda justo debajo.
 *
 * Los campos son los mismos de Motor y Drive (`heroBackground`, `heroKicker`,
 * `heroHeading`, `heroSubtext`): lo que la dueña ya cargó aparece igual al
 * cambiar de template. El aspecto es de Volt: velo azulado, esquinas de visor,
 * y el buscador como una consola de vidrio.
 */
export const PORTADA_VOLT_CSS = `
  .pv-busca { display:grid; gap:12px; grid-template-columns:minmax(0,1fr) }
  @media (min-width: 640px) { .pv-busca { grid-template-columns:repeat(2,minmax(0,1fr)) } }
  @media (min-width: 980px) { .pv-busca { grid-template-columns:repeat(3,minmax(0,1fr)) auto; align-items:end } }
  .pv-boton { transition: transform .2s, box-shadow .25s }
  .pv-boton:hover { transform:translateY(-1px) }
  .pv-link { transition: color .15s }
  .pv-link:hover { color: var(--pv-acento) !important }
  @keyframes pv-entra { from { opacity:0; transform:translateY(22px); filter:blur(8px) } to { opacity:1; transform:none; filter:none } }
  .pv-entra { animation: pv-entra 1s cubic-bezier(.16,.84,.3,1) both }
  @media (prefers-reduced-motion: reduce) { .pv-entra { animation:none } .pv-boton:hover { transform:none } }
`;

const FOTO_DE_FABRICA = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1920&q=80";

export function PortadaVolt({ ov, acento, opciones, principal, cuantos, waLink, arriba, onBuscar, onVerTodos, todosHref }: {
  ov: ImageOverride | undefined;
  acento: string;
  opciones: OpcionesDeFiltro;
  principal: Moneda;
  cuantos: number;
  waLink: string | null;
  /** Lo que ocupan arriba la barra de avisos y la barra flotante. */
  arriba: number;
  onBuscar: (f: Partial<FiltroVehiculos>) => void;
  onVerTodos: (e: React.MouseEvent) => void;
  todosHref: string;
}) {
  const [tipo, setTipo] = useState("");
  const [marca, setMarca] = useState("");
  const [precio, setPrecio] = useState("");
  const [moneda, setMoneda] = useState<Moneda>(principal);
  const sobreAcento = getContrastColor(acento) === "dark" ? "#05070d" : "#fff";
  const url = ov?.url ?? FOTO_DE_FABRICA;
  const velo = ov?.overlayType ?? "dark";
  const opacidad = ov?.overlayOpacity ?? 0.55;

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(sinPuntos(precio));
    onBuscar({ ...filtroVacio(principal), tipo: tipo || null, marca: marca || null, precioHasta: n > 0 ? n : null, moneda });
  };

  const campo: React.CSSProperties = { width: "100%", minHeight: 50, boxSizing: "border-box", borderRadius: 12, border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(5,7,13,0.6)", color: "#fff", padding: "0 14px", fontSize: 15, fontFamily: "inherit" };
  const etiqueta: React.CSSProperties = { display: "block", marginBottom: 7, fontFamily: MONO, fontSize: 10, letterSpacing: 2.2, textTransform: "uppercase", color: "rgba(232,236,246,0.6)" };
  const opcion: React.CSSProperties = { background: "#0a0e19", color: "#fff" };

  return (
    <section aria-label="Portada" style={{ position: "relative", overflow: "hidden", minHeight: "min(100svh, 900px)", display: "flex", flexDirection: "column", justifyContent: "flex-end",
      background: "#05070d", paddingTop: arriba, ...({ "--pv-acento": acento } as React.CSSProperties) }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: `url(${fotoLiviana(url, 1920)})`, backgroundSize: "cover",
        backgroundPosition: `${ov?.posX ?? 50}% ${ov?.posY ?? 50}%` }} />
      {velo !== "none" && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: velo === "light"
          ? `rgba(255,255,255,${opacidad})`
          : `linear-gradient(to top, #05070d 0%, rgba(5,7,13,${Math.min(1, opacidad + 0.25)}) 32%, rgba(5,7,13,${opacidad * 0.5}) 70%, rgba(5,7,13,${opacidad * 0.35}) 100%)` }} />
      )}
      {/* El toque Volt: una luz del acento desde abajo y la línea del horizonte. */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(80% 50% at 50% 100%, ${conAlfa(acento, 0.22)}, transparent 70%)` }} />
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1, background: `linear-gradient(90deg, transparent, ${acento}, transparent)`, boxShadow: `0 0 18px ${acento}` }} />
      <EditableImageButton field="heroBackground" label="Imagen de fondo de la portada" />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1240, width: "100%", margin: "0 auto", boxSizing: "border-box",
        padding: "clamp(56px,12vh,140px) clamp(16px,4vw,32px) clamp(32px,6vw,64px)" }}>
        <p className="pv-entra" style={{ margin: "0 0 18px", display: "inline-flex", alignItems: "center", gap: 10, fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase",
          color: "rgba(232,236,246,0.85)", padding: "7px 12px", borderRadius: 999, border: `1px solid ${conAlfa(acento, 0.4)}`, background: "rgba(5,7,13,0.45)", backdropFilter: "blur(8px)",
          maxWidth: "100%", boxSizing: "border-box" }}>
          <span aria-hidden="true" style={{ flexShrink: 0, width: 7, height: 7, borderRadius: "50%", background: acento, boxShadow: `0 0 10px ${acento}` }} />
          <span style={{ minWidth: 0, overflowWrap: "anywhere" }}><EditableZone field="heroKicker" label="Etiqueta de la portada">Showroom en línea</EditableZone></span>
        </p>
        <h1 className="pv-entra" style={{ margin: "0 0 16px", maxWidth: "13ch", fontSize: "clamp(40px,7.4vw,96px)", fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 0.95, animationDelay: ".08s",
          backgroundImage: `linear-gradient(180deg, #ffffff 40%, ${conAlfa(acento, 0.95)} 150%)`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "#fff" }}>
          <EditableZone field="heroHeading" label="Título de la portada">Tu próximo vehículo está acá</EditableZone>
        </h1>
        <p className="pv-entra" style={{ margin: "0 0 32px", maxWidth: 540, fontSize: "clamp(15px,1.6vw,18px)", lineHeight: 1.6, color: "rgba(232,236,246,0.75)", animationDelay: ".16s" }}>
          <EditableZone field="heroSubtext" label="Subtítulo de la portada">Autos, camionetas, motos y más, con la ficha técnica completa y el precio a la vista.</EditableZone>
        </p>

        {/* ── El buscador: una consola de vidrio ── */}
        <form onSubmit={buscar} role="search" aria-label="Buscar vehículos" className="pv-busca pv-entra"
          style={{ animationDelay: ".24s", maxWidth: 980, padding: 16, borderRadius: 20, background: "rgba(8,11,21,0.62)", backdropFilter: "blur(16px) saturate(1.3)",
            border: `1px solid ${conAlfa(acento, 0.3)}`, boxShadow: `0 30px 80px -40px ${conAlfa(acento, 0.7)}` }}>
          {opciones.tipos.length > 1 && (
            <div style={{ minWidth: 0 }}>
              <label htmlFor="pv-tipo" style={etiqueta}>Tipo</label>
              <select id="pv-tipo" value={tipo} onChange={e => setTipo(e.target.value)} style={campo}>
                <option value="" style={opcion}>Todos</option>
                {opciones.tipos.map(t => <option key={t.valor} value={t.valor} style={opcion}>{t.label} ({t.cuantos})</option>)}
              </select>
            </div>
          )}
          {opciones.marcas.length > 1 && (
            <div style={{ minWidth: 0 }}>
              <label htmlFor="pv-marca" style={etiqueta}>Marca</label>
              <select id="pv-marca" value={marca} onChange={e => setMarca(e.target.value)} style={campo}>
                <option value="" style={opcion}>Todas</option>
                {opciones.marcas.map(m => <option key={m.valor} value={m.valor} style={opcion}>{m.label}</option>)}
              </select>
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <label htmlFor="pv-precio" style={etiqueta}>Hasta</label>
            <div style={{ display: "flex", gap: 6 }}>
              {opciones.monedas.length > 1 ? (
                <select aria-label="Moneda" value={moneda} onChange={e => setMoneda(e.target.value === "USD" ? "USD" : "ARS")} style={{ ...campo, width: "auto", flexShrink: 0, padding: "0 8px" }}>
                  <option value="ARS" style={opcion}>$</option>
                  <option value="USD" style={opcion}>USD</option>
                </select>
              ) : (
                <span aria-hidden="true" style={{ alignSelf: "center", fontFamily: MONO, color: "rgba(232,236,246,0.6)", fontSize: 13, flexShrink: 0 }}>{moneda === "USD" ? "USD" : "$"}</span>
              )}
              <input id="pv-precio" inputMode="numeric" autoComplete="off" placeholder="Sin tope" maxLength={16}
                value={precio} onChange={e => setPrecio(conPuntos(e.target.value).slice(0, 15))} style={{ ...campo, minWidth: 0 }} />
            </div>
          </div>
          <button type="submit" className="pv-boton"
            style={{ minHeight: 50, padding: "0 28px", borderRadius: 12, border: "none", background: acento, color: sobreAcento, fontWeight: 800, fontSize: 15, cursor: "pointer",
              fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: `0 12px 34px -12px ${conAlfa(acento, 0.9)}` }}>
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Buscar
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: "8px 24px", flexWrap: "wrap", marginTop: 20 }}>
          {cuantos > 0 && (
            <a href={todosHref} onClick={onVerTodos} className="pv-link" style={{ color: "rgba(232,236,246,0.85)", fontSize: 14, fontWeight: 600, textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center" }}>
              Ver los {cuantos} vehículo{cuantos !== 1 ? "s" : ""} →
            </a>
          )}
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="pv-link"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, color: "rgba(232,236,246,0.85)", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
              <WaIcon size={16} /> Hablar con un asesor
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
