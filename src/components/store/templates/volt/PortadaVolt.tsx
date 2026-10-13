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
 * desorientaba). El showroom giratorio queda justo debajo.
 *
 * Primero salió con el texto abajo a la izquierda y el buscador debajo, y era
 * la misma portada de Auto Motor con otro color. Se rehízo CENTRADA, tipo
 * visor (elegida por el dueño entre tres): esquinas de HUD alrededor de la
 * foto, el título en el medio, el buscador como una cápsula y, abajo, tres
 * datos que salen solos del stock (nada inventado).
 *
 * Los campos son los mismos de Motor y Drive (`heroBackground`, `heroKicker`,
 * `heroHeading`, `heroSubtext`): lo que la dueña ya cargó aparece igual.
 */
export const PORTADA_VOLT_CSS = `
  .pv-capsula { display:grid; grid-template-columns:minmax(0,1fr); gap:10px; padding:14px; border-radius:22px; text-align:left }
  .pv-seg { min-width:0 }
  @media (min-width: 640px) { .pv-capsula { grid-template-columns:repeat(2,minmax(0,1fr)) } .pv-boton { grid-column:1 / -1 } .pv-seg:nth-of-type(odd):last-of-type { grid-column:1 / -1 } }
  @media (min-width: 900px) {
    .pv-capsula { display:flex; align-items:stretch; gap:0; padding:6px; border-radius:999px }
    .pv-seg { flex:1 1 0; padding:8px 20px 6px; border-right:1px solid rgba(255,255,255,0.1) }
    .pv-seg:last-of-type { border-right:none }
    .pv-seg .pv-campo { border:none !important; background:transparent !important; padding:0 !important; min-height:30px !important }
    .pv-boton { border-radius:999px !important; padding:0 30px !important }
  }
  .pv-esquina { position:absolute; width:clamp(26px,4vw,48px); height:clamp(26px,4vw,48px); pointer-events:none; z-index:1 }
  @media (max-width: 639px) { .pv-esquina { display:none } }
  .pv-boton { transition: transform .2s, box-shadow .25s }
  .pv-boton:hover { transform:translateY(-1px) }
  .pv-link { transition: color .15s }
  .pv-link:hover { color: var(--pv-acento) !important }
  @keyframes pv-entra { from { opacity:0; transform:translateY(22px); filter:blur(8px) } to { opacity:1; transform:none; filter:none } }
  .pv-entra { animation: pv-entra 1s cubic-bezier(.16,.84,.3,1) both }
  @keyframes pv-barrido { from { transform:translateY(-100%) } to { transform:translateY(100vh) } }
  .pv-barrido { animation: pv-barrido 7s linear infinite }
  @media (prefers-reduced-motion: reduce) { .pv-entra, .pv-barrido { animation:none } .pv-boton:hover { transform:none } }
`;

const FOTO_DE_FABRICA = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1920&q=80";

export function PortadaVolt({ ov, acento, opciones, principal, cuantos, datos, waLink, arriba, onBuscar, onVerTodos, todosHref }: {
  ov: ImageOverride | undefined;
  acento: string;
  opciones: OpcionesDeFiltro;
  principal: Moneda;
  cuantos: number;
  /** Los datos de abajo (vehículos, marcas, desde cuánto). Salen del stock. */
  datos: { valor: string; etiqueta: string }[];
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

  const campo: React.CSSProperties = { width: "100%", minHeight: 48, boxSizing: "border-box", borderRadius: 12, border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(5,7,13,0.6)", color: "#fff", padding: "0 12px", fontSize: 15, fontFamily: "inherit", outline: "none" };
  const etiqueta: React.CSSProperties = { display: "block", marginBottom: 4, fontFamily: MONO, fontSize: 9.5, letterSpacing: 2.2, textTransform: "uppercase", color: "rgba(232,236,246,0.55)" };
  const opcion: React.CSSProperties = { background: "#0a0e19", color: "#fff" };
  const esquina = (pos: React.CSSProperties, bordes: string) => (
    <span aria-hidden="true" className="pv-esquina" style={{ ...pos, borderColor: acento, borderStyle: "solid", borderWidth: bordes, borderRadius: 6, filter: `drop-shadow(0 0 8px ${acento})` }} />
  );
  const margen = "clamp(14px,2.4vw,28px)";

  return (
    <section aria-label="Portada" style={{ position: "relative", overflow: "hidden", minHeight: "min(100svh, 920px)", display: "flex", flexDirection: "column", justifyContent: "center",
      background: "#05070d", paddingTop: arriba, boxSizing: "border-box", ...({ "--pv-acento": acento } as React.CSSProperties) }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: `url(${fotoLiviana(url, 1920)})`, backgroundSize: "cover",
        backgroundPosition: `${ov?.posX ?? 50}% ${ov?.posY ?? 50}%` }} />
      {velo !== "none" && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: velo === "light"
          ? `rgba(255,255,255,${opacidad})`
          // Centrada: el velo es más oscuro en el medio, donde va el texto, y en los bordes de abajo.
          : `radial-gradient(70% 60% at 50% 55%, rgba(5,7,13,${Math.min(0.94, opacidad + 0.32)}), rgba(5,7,13,${opacidad * 0.7}) 75%), linear-gradient(to top, #05070d 0%, transparent 30%)` }} />
      )}
      {/* El HUD: una línea que barre la pantalla, la luz del acento y las esquinas del visor. */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <span className="pv-barrido" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 120, background: `linear-gradient(to bottom, transparent, ${conAlfa(acento, 0.07)}, transparent)` }} />
      </div>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(60% 40% at 50% 100%, ${conAlfa(acento, 0.24)}, transparent 70%)` }} />
      {esquina({ top: `calc(${arriba}px + ${margen})`, left: margen }, "2px 0 0 2px")}
      {esquina({ top: `calc(${arriba}px + ${margen})`, right: margen }, "2px 2px 0 0")}
      {esquina({ bottom: margen, left: margen }, "0 0 2px 2px")}
      {esquina({ bottom: margen, right: margen }, "0 2px 2px 0")}
      <EditableImageButton field="heroBackground" label="Imagen de fondo de la portada" />

      <div style={{ position: "relative", zIndex: 2, maxWidth: 1100, width: "100%", margin: "0 auto", boxSizing: "border-box", textAlign: "center",
        padding: "clamp(48px,10vh,110px) clamp(16px,5vw,48px) clamp(40px,8vh,80px)" }}>
        <p className="pv-entra" style={{ margin: "0 0 20px", display: "inline-flex", alignItems: "center", gap: 10, fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase",
          color: "rgba(232,236,246,0.85)", padding: "7px 14px", borderRadius: 999, border: `1px solid ${conAlfa(acento, 0.4)}`, background: "rgba(5,7,13,0.45)", backdropFilter: "blur(8px)",
          maxWidth: "100%", boxSizing: "border-box" }}>
          <span aria-hidden="true" style={{ flexShrink: 0, width: 7, height: 7, borderRadius: "50%", background: acento, boxShadow: `0 0 10px ${acento}` }} />
          <span style={{ minWidth: 0, overflowWrap: "anywhere" }}><EditableZone field="heroKicker" label="Etiqueta de la portada">Showroom en línea</EditableZone></span>
        </p>
        <h1 className="pv-entra" style={{ margin: "0 auto 18px", maxWidth: "15ch", fontSize: "clamp(40px,7.6vw,104px)", fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 0.95, animationDelay: ".08s",
          backgroundImage: `linear-gradient(180deg, #ffffff 45%, ${conAlfa(acento, 0.95)} 140%)`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "#fff",
          textWrap: "balance" } as React.CSSProperties}>
          <EditableZone field="heroHeading" label="Título de la portada">Tu próximo vehículo está acá</EditableZone>
        </h1>
        <p className="pv-entra" style={{ margin: "0 auto 34px", maxWidth: 560, fontSize: "clamp(15px,1.6vw,18px)", lineHeight: 1.6, color: "rgba(232,236,246,0.86)", animationDelay: ".16s", textShadow: "0 2px 14px rgba(5,7,13,0.95)" }}>
          <EditableZone field="heroSubtext" label="Subtítulo de la portada">Autos, camionetas, motos y más, con la ficha técnica completa y el precio a la vista.</EditableZone>
        </p>

        {/* ── El buscador: una cápsula en la compu, una tarjeta en el celular ── */}
        <form onSubmit={buscar} role="search" aria-label="Buscar vehículos" className="pv-capsula pv-entra"
          style={{ animationDelay: ".24s", maxWidth: 900, margin: "0 auto", background: "rgba(8,11,21,0.66)", backdropFilter: "blur(16px) saturate(1.3)",
            border: `1px solid ${conAlfa(acento, 0.35)}`, boxShadow: `0 30px 80px -40px ${conAlfa(acento, 0.8)}, inset 0 1px 0 rgba(255,255,255,0.06)` }}>
          {opciones.tipos.length > 1 && (
            <div className="pv-seg">
              <label htmlFor="pv-tipo" style={etiqueta}>Tipo</label>
              <select id="pv-tipo" className="pv-campo" value={tipo} onChange={e => setTipo(e.target.value)} style={campo}>
                <option value="" style={opcion}>Todos</option>
                {opciones.tipos.map(t => <option key={t.valor} value={t.valor} style={opcion}>{t.label} ({t.cuantos})</option>)}
              </select>
            </div>
          )}
          {opciones.marcas.length > 1 && (
            <div className="pv-seg">
              <label htmlFor="pv-marca" style={etiqueta}>Marca</label>
              <select id="pv-marca" className="pv-campo" value={marca} onChange={e => setMarca(e.target.value)} style={campo}>
                <option value="" style={opcion}>Todas</option>
                {opciones.marcas.map(m => <option key={m.valor} value={m.valor} style={opcion}>{m.label}</option>)}
              </select>
            </div>
          )}
          <div className="pv-seg">
            <label htmlFor="pv-precio" style={etiqueta}>Hasta</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {opciones.monedas.length > 1 ? (
                <select aria-label="Moneda" className="pv-campo" value={moneda} onChange={e => setMoneda(e.target.value === "USD" ? "USD" : "ARS")} style={{ ...campo, width: "auto", flexShrink: 0, padding: "0 8px" }}>
                  <option value="ARS" style={opcion}>$</option>
                  <option value="USD" style={opcion}>USD</option>
                </select>
              ) : (
                <span aria-hidden="true" style={{ fontFamily: MONO, color: "rgba(232,236,246,0.6)", fontSize: 14, flexShrink: 0 }}>{moneda === "USD" ? "USD" : "$"}</span>
              )}
              <input id="pv-precio" className="pv-campo" inputMode="numeric" autoComplete="off" placeholder="Sin tope" maxLength={16}
                value={precio} onChange={e => setPrecio(conPuntos(e.target.value).slice(0, 15))} style={{ ...campo, minWidth: 0 }} />
            </div>
          </div>
          <button type="submit" className="pv-boton"
            style={{ minHeight: 52, padding: "0 26px", borderRadius: 14, border: "none", background: acento, color: sobreAcento, fontWeight: 800, fontSize: 15, cursor: "pointer", flexShrink: 0,
              fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: `0 0 28px ${conAlfa(acento, 0.55)}` }}>
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Buscar
          </button>
        </form>

        {/* ── Los datos del stock, como lecturas del tablero ── */}
        {datos.length > 0 && (
          <ul className="pv-entra" style={{ listStyle: "none", margin: "30px auto 0", padding: 0, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "10px clamp(18px,4vw,44px)", animationDelay: ".32s" }}>
            {datos.map(d => (
              <li key={d.etiqueta} style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
                <span style={{ fontFamily: MONO, fontSize: "clamp(18px,2.2vw,24px)", fontWeight: 700, color: "#fff", textShadow: `0 0 16px ${conAlfa(acento, 0.7)}`, whiteSpace: "nowrap" }}>{d.valor}</span>
                <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: 2, textTransform: "uppercase", color: "rgba(232,236,246,0.6)" }}>{d.etiqueta}</span>
              </li>
            ))}
          </ul>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px 26px", flexWrap: "wrap", marginTop: 16 }}>
          {cuantos > 0 && (
            <a href={todosHref} onClick={onVerTodos} className="pv-link" style={{ color: "rgba(232,236,246,0.85)", fontSize: 14, fontWeight: 600, textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center" }}>
              Ver todos los vehículos →
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
