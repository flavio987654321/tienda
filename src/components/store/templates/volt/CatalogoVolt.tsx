"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { attr, fmtPrice, esReservado, vehicleLocation } from "@/components/store/auto/AutoVehicleShared";
import { usoDe } from "@/components/store/templates/motor/TarjetaMotor";
import BusquedaVehiculo from "@/components/store/auto/BusquedaVehiculo";
import TasacionVehiculo from "@/components/store/auto/TasacionVehiculo";
import { getBrandLogoUrl, brandAbbr } from "@/components/store/auto/marcasLogos";
import { TiraVolt } from "./TiraVolt";
import { VentanaAuto } from "@/components/store/auto/VentanaAuto";
import { monedaDe, monedaDeTienda, precioEn, conPuntos, sinPuntos } from "@/lib/monedaVehiculo";
import { NOMBRE_TIPO, usaHoras, type CategoriaVehiculo } from "@/lib/fichaVehiculo";
import { filtrarVehiculos, filtroAUrl, filtroVacio, cuantosFiltros, type FiltroVehiculos, type OpcionesDeFiltro, type OrdenVehiculos } from "@/lib/filtroVehiculos";
import { getContrastColor } from "@/contexts/EditContext";
import { fotoLiviana } from "@/lib/foto-liviana";
import { conAlfa, MONO } from "./EscenaVolt";
import { PANEL_VOLT } from "./BloquesVolt";

/**
 * El catálogo completo de Auto Volt (13/10/26): una FICHA TÉCNICA, no una
 * grilla de tarjetas. Cada vehículo es una fila con su foto y sus datos en
 * columnas (año, uso, motor, caja, precio), y tocando el título de una columna
 * se ordena por ella, como un tablero. Al lado de cada fila, favorito y
 * "⇄ Comparar", que suma al comparador de la portada.
 *
 * Elegida por el dueño entre tres estructuras (ficha técnica / garage por pisos
 * / consola + grilla): la grilla es lo que ya tienen Motor y Drive.
 *
 * En el celular las columnas no entran: cada fila pasa a ser una tarjeta con
 * los datos en chips, y el orden se elige con un desplegable.
 *
 * El filtro es el de siempre (lib/filtroVehiculos) y viaja en la dirección
 * igual que en la página genérica: un link compartido abre lo mismo.
 */
export const CATALOGO_VOLT_CSS = `
  .ctv-cols { display:grid; grid-template-columns: 128px minmax(0,2.2fr) repeat(4, minmax(0,1fr)) minmax(0,1.3fr) 96px; gap:0 16px; align-items:center }
  .ctv-cab { padding:0 16px 10px }
  .ctv-fila { position:relative; padding:12px 16px; border-radius:16px; border:1px solid rgba(255,255,255,0.07); background:rgba(10,14,25,0.72);
    transition: border-color .2s, background .2s, box-shadow .25s, transform .25s }
  .ctv-fila:hover { border-color: var(--ctv-acento); background: rgba(14,19,34,0.92); box-shadow: 0 18px 46px -26px var(--ctv-acento); transform: translateX(3px) }
  .ctv-fila::before { content:""; position:absolute; left:-1px; top:18%; bottom:18%; width:2px; border-radius:2px; background:var(--ctv-acento); opacity:0; transition:opacity .2s; box-shadow:0 0 10px var(--ctv-acento) }
  .ctv-fila:hover::before, .ctv-fila[data-comp]::before { opacity:1 }
  .ctv-ir::after { content:""; position:absolute; inset:0; border-radius:16px }
  .ctv-ir:focus-visible { outline:none }
  .ctv-ir:focus-visible::after { outline:2px solid var(--ctv-acento); outline-offset:2px }
  .ctv-acc { position:relative; z-index:2; display:flex; gap:6px; justify-content:flex-end }
  .ctv-datos { display:contents }
  .ctv-k { display:none }
  .ctv-orden-celu { display:none }
  .ctv-panel { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px }
  .ctv-ord { transition: color .15s }
  .ctv-ord:hover { color:#fff !important }
  /* A 360 px el precio tiene unos 86 px: "$25.000.000" en una línea se montaba sobre el corazón. */
  @media (max-width: 479px) { .ctv-precio > span { white-space:normal !important; overflow-wrap:anywhere; font-size:15px !important } }
  @media (max-width: 899px) {
    .ctv-cab { display:none }
    .ctv-orden-celu { display:block }
    .ctv-fila { grid-template-columns: 112px minmax(0,1fr) auto; grid-template-areas: "foto nombre nombre" "foto precio acc" "datos datos datos"; gap:8px 12px; padding:10px }
    .ctv-fila:hover { transform:none }
    .ctv-foto { grid-area:foto; align-self:start }
    .ctv-nombre { grid-area:nombre }
    .ctv-precio { grid-area:precio; align-self:end }
    .ctv-acc { grid-area:acc; align-self:end }
    .ctv-datos { grid-area:datos; display:flex; flex-wrap:wrap; gap:6px }
    .ctv-c { padding:5px 9px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.03); font-size:12px !important }
    .ctv-c.ctv-vacia { display:none }
    .ctv-k { display:inline; margin-right:5px; color:rgba(232,236,246,0.45); font-size:9.5px; letter-spacing:1.5px }
  }
  @media (prefers-reduced-motion: reduce) { .ctv-fila, .ctv-fila:hover { transition:none; transform:none } }
`;

/** Cuántas filas se muestran de entrada; el resto, con "Ver más". */
const DE_A = 30;
const TOPES_KM = [0, 10_000, 30_000, 50_000, 80_000, 120_000, 200_000, 300_000];
const TOPES_HORAS = [500, 1_000, 2_000, 3_000, 5_000, 8_000];
const conActual = (topes: number[], actual: number | null) =>
  actual == null || topes.includes(actual) ? topes : [...topes, actual].sort((a, b) => a - b);

/** Las columnas que ordenan. Precio va y vuelve (más barato ↔ más caro). */
const ORDEN_DE: Record<string, OrdenVehiculos[]> = {
  nombre: ["nombre"], anio: ["anio_desc"], uso: ["km_asc"], precio: ["precio_asc", "precio_desc"],
};
const ORDENES_CELU: { id: OrdenVehiculos; label: string }[] = [
  { id: "recientes", label: "Más recientes" }, { id: "precio_asc", label: "Menor precio" }, { id: "precio_desc", label: "Mayor precio" },
  { id: "anio_desc", label: "Más nuevo" }, { id: "km_asc", label: "Menos usado" }, { id: "nombre", label: "Nombre A-Z" },
];

export function CatalogoVolt({ productos, opciones, filtroInicial, escribirUrl, acento, moneda, hrefDe, favoritos, onFavorito, comparando, onComparar, onVolver, storeId, isOwner, isPreview }: {
  productos: StorefrontProduct[];
  opciones: OpcionesDeFiltro;
  filtroInicial: FiltroVehiculos;
  /** En la tienda publicada el filtro se escribe en la dirección; en la previa no hay dirección. */
  escribirUrl: boolean;
  acento: string;
  moneda: string;
  hrefDe: (p: StorefrontProduct) => string;
  favoritos: string[];
  onFavorito: (id: string) => void;
  comparando: string[];
  /** Sin esto no hay botón "Comparar" (la dueña ocultó el comparador: el botón no llevaba a nada). */
  onComparar?: (id: string) => void;
  onVolver: () => void;
  storeId?: string;
  isOwner: boolean;
  isPreview: boolean;
}) {
  const [filtro, setFiltro] = useState(filtroInicial);
  const [cuantos, setCuantos] = useState(DE_A);
  const cambiar = useCallback((c: Partial<FiltroVehiculos>) => { setFiltro(f => ({ ...f, ...c })); setCuantos(DE_A); }, []);
  const [verFiltros, setVerFiltros] = useState(false);
  const [avisame, setAvisame] = useState(false);
  const cerrarAvisame = useCallback(() => setAvisame(false), []);
  const [tasar, setTasar] = useState(false);
  const cerrarTasar = useCallback(() => setTasar(false), []);
  /* Logos de marca que no cargaron: va la sigla. */
  const [sinLogo, setSinLogo] = useState<Record<string, boolean>>({});
  const principal = monedaDeTienda({ currency: moneda });
  const sobreAcento = getContrastColor(acento) === "dark" ? "#05070d" : "#fff";

  // El filtro a la dirección, sin sumar al historial (atrás vuelve a la portada).
  useEffect(() => {
    if (!escribirUrl) return;
    const s = filtroAUrl(filtro, principal).toString();
    const nueva = `${window.location.pathname}${s ? `?${s}` : ""}`;
    if (nueva !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(window.history.state, "", nueva);
  }, [filtro, principal, escribirUrl]);

  const lista = useMemo(() => filtrarVehiculos(productos, filtro, moneda), [productos, filtro, moneda]);
  const hayFiltro = cuantosFiltros(filtro) > 0;
  const tipoActivo = opciones.tipos.find(t => t.valor === filtro.tipo);
  const marcaActiva = opciones.marcas.find(m => m.valor === filtro.marca);
  const conHoras = filtro.tipo ? usaHoras(filtro.tipo) : false;
  const anios = opciones.anioMin != null && opciones.anioMax != null
    ? Array.from({ length: opciones.anioMax - opciones.anioMin + 1 }, (_, i) => opciones.anioMax! - i) : [];

  type Puesto = { id: string; label: string; sacar: Partial<FiltroVehiculos> };
  const puestos = ([
    filtro.q.trim() && { id: "q", label: `"${filtro.q.trim()}"`, sacar: { q: "" } },
    filtro.tipo && { id: "tipo", label: tipoActivo?.label ?? filtro.tipo, sacar: { tipo: null, horasHasta: null } },
    filtro.marca && { id: "marca", label: marcaActiva?.label ?? filtro.marca, sacar: { marca: null } },
    filtro.anioDesde != null && { id: "desde", label: `Desde ${filtro.anioDesde}`, sacar: { anioDesde: null } },
    filtro.anioHasta != null && { id: "hasta", label: `Hasta ${filtro.anioHasta}`, sacar: { anioHasta: null } },
    filtro.kmHasta != null && { id: "km", label: `Hasta ${filtro.kmHasta.toLocaleString("es-AR")} km`, sacar: { kmHasta: null } },
    filtro.horasHasta != null && { id: "horas", label: `Hasta ${filtro.horasHasta.toLocaleString("es-AR")} h`, sacar: { horasHasta: null } },
    filtro.precioHasta != null && { id: "precio", label: `Hasta ${precioEn(filtro.precioHasta, filtro.moneda)}`, sacar: { precioHasta: null } },
    filtro.combustible && { id: "comb", label: filtro.combustible, sacar: { combustible: null } },
    filtro.transmision && { id: "trans", label: filtro.transmision, sacar: { transmision: null } },
    filtro.ciudad && { id: "ciudad", label: filtro.ciudad, sacar: { ciudad: null } },
  ] as (Puesto | false | null | "")[]).filter((x): x is Puesto => !!x);
  const enPanel = puestos.filter(x => !["q", "tipo"].includes(x.id)).length;
  const limpiar = () => { setFiltro(f => ({ ...filtroVacio(f.moneda), orden: f.orden })); setCuantos(DE_A); };

  const tenue = "rgba(232,236,246,0.55)";
  const campo: React.CSSProperties = { width: "100%", minHeight: 44, boxSizing: "border-box", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(5,7,13,0.7)", color: "#fff", padding: "0 12px", fontSize: 14, fontFamily: "inherit" };
  const chip = (activo: boolean): React.CSSProperties => ({ minHeight: 40, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
    border: `1px solid ${activo ? acento : "rgba(255,255,255,0.14)"}`, background: activo ? conAlfa(acento, 0.18) : "rgba(5,7,13,0.5)",
    color: activo ? "#fff" : "rgba(232,236,246,0.75)", boxShadow: activo ? `0 0 18px ${conAlfa(acento, 0.35)}` : "none" });
  const iconoFila: React.CSSProperties = { width: 40, height: 40, borderRadius: 10, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(5,7,13,0.6)",
    color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 15, padding: 0 };
  const etiqueta = (texto: string, id: string, control: React.ReactNode) => (
    <div key={id} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <label htmlFor={id} style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 2, color: tenue, textTransform: "uppercase" }}>{texto}</label>
      {control}
    </div>
  );

  /** Un título de columna que ordena. */
  const columna = (clave: keyof typeof ORDEN_DE | null, texto: string, derecha = false) => {
    if (!clave) return <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: 2, color: tenue, textAlign: derecha ? "right" : "left" }}>{texto}</span>;
    const ordenes = ORDEN_DE[clave];
    const activo = ordenes.includes(filtro.orden);
    const siguiente = activo && ordenes.length > 1 ? ordenes[(ordenes.indexOf(filtro.orden) + 1) % ordenes.length] : ordenes[0];
    const flecha = !activo ? "" : filtro.orden === "precio_desc" || filtro.orden === "anio_desc" ? " ▾" : " ▴";
    return (
      <button type="button" className="ctv-ord" onClick={() => cambiar({ orden: activo && ordenes.length === 1 ? "recientes" : siguiente })}
        aria-label={`Ordenar por ${texto.toLowerCase()}`} aria-pressed={activo}
        style={{ justifySelf: derecha ? "end" : "start", background: "none", border: "none", padding: 0, minHeight: 32, cursor: "pointer", fontFamily: MONO, fontSize: 10.5, letterSpacing: 2, textAlign: derecha ? "right" : "left",
          // Activo en blanco y la flecha en el acento: un acento oscuro sobre el fondo oscuro no se leía.
          color: activo ? "#fff" : tenue, borderBottom: `1px solid ${activo ? acento : "transparent"}` }}>
        {texto}<span aria-hidden="true" style={{ color: acento }}>{flecha}</span>
      </button>
    );
  };

  const titulo = tipoActivo ? `${tipoActivo.label}${marcaActiva ? ` ${marcaActiva.label}` : ""}` : marcaActiva ? `Vehículos ${marcaActiva.label}` : "Todos los vehículos";

  return (
    <div style={{ ...({ "--ctv-acento": acento } as React.CSSProperties) }}>
      {/* ── CABECERA ── */}
      <button type="button" onClick={onVolver}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 40, padding: "0 14px 0 10px", marginBottom: 22, borderRadius: 10, cursor: "pointer", fontFamily: MONO, fontSize: 11, letterSpacing: 2,
          border: "1px solid rgba(255,255,255,0.14)", background: "rgba(5,7,13,0.5)", color: "rgba(232,236,246,0.8)" }}>
        <span aria-hidden="true" style={{ fontSize: 15 }}>←</span> SHOWROOM
      </button>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "14px 24px", flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: "0 0 12px", fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: acento, display: "flex", alignItems: "center", gap: 10 }}>
            <span aria-hidden="true" style={{ width: 22, height: 1, background: acento, boxShadow: `0 0 8px ${acento}` }} />
            Ficha técnica del stock
          </p>
          <h1 style={{ margin: 0, fontSize: "clamp(30px,4.6vw,54px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, color: "#fff", overflowWrap: "anywhere" }}>{titulo}</h1>
        </div>
        <p role="status" style={{ margin: 0, fontFamily: MONO, fontSize: 13, letterSpacing: 1.5, color: "rgba(232,236,246,0.7)" }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: "#fff", textShadow: `0 0 18px ${conAlfa(acento, 0.6)}`, marginRight: 8 }}>{String(lista.length).padStart(2, "0")}</span>
          {hayFiltro ? `DE ${productos.length} ` : ""}{lista.length === 1 ? "VEHÍCULO" : "VEHÍCULOS"}
        </p>
      </div>

      {/* ── ACCIONES ── como en el catálogo de Motor y Drive: avisame y tasar
          a mano siempre, no sólo cuando la búsqueda no encuentra nada. */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        <button type="button" onClick={() => setAvisame(true)} style={{ ...chip(false), minHeight: 42, borderRadius: 12 }}>
          <span aria-hidden="true" style={{ color: acento, marginRight: 6 }}>◉</span>Avisame si entra
        </button>
        <button type="button" onClick={() => setTasar(true)} style={{ ...chip(false), minHeight: 42, borderRadius: 12 }}>
          <span aria-hidden="true" style={{ color: acento, marginRight: 6 }}>⇄</span>Tasá tu usado
        </button>
      </div>

      {/* ── BUSCAR, TIPO Y FILTROS ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: "1 1 260px", minWidth: 0 }}>
          <input type="search" aria-label="Buscar vehículo" value={filtro.q} maxLength={80} placeholder="Buscar marca, modelo, año…"
            onChange={e => cambiar({ q: e.target.value })}
            style={{ ...campo, padding: "0 14px 0 40px", fontSize: 15, minHeight: 48, borderColor: filtro.q ? acento : "rgba(255,255,255,0.14)" }} />
          <svg aria-hidden="true" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={acento} strokeWidth={2} strokeLinecap="round"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <button type="button" onClick={() => setVerFiltros(v => !v)} aria-expanded={verFiltros} aria-controls="ctv-panel"
          style={{ ...chip(verFiltros || enPanel > 0), minHeight: 48, borderRadius: 12 }}>
          <span aria-hidden="true" style={{ fontFamily: MONO, marginRight: 6 }}>≡</span>Filtros{enPanel ? ` (${enPanel})` : ""}
        </button>
        <div className="ctv-orden-celu" style={{ flex: "1 1 160px" }}>
          <select aria-label="Ordenar por" value={filtro.orden} onChange={e => cambiar({ orden: e.target.value as OrdenVehiculos })} style={{ ...campo, minHeight: 48 }}>
            {ORDENES_CELU.map(o => <option key={o.id} value={o.id}>{o.id === "km_asc" && conHoras ? "Menos horas de uso" : o.label}</option>)}
          </select>
        </div>
      </div>
      {opciones.tipos.length > 1 && (
        <div role="group" aria-label="Tipo de vehículo" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 14, scrollbarWidth: "none" }}>
          {[{ valor: "", label: "Todos", cuantos: productos.length }, ...opciones.tipos].map(t => {
            const activo = (filtro.tipo ?? "") === t.valor;
            return (
              <button key={t.valor || "todos"} type="button" aria-pressed={activo} style={chip(activo)}
                onClick={() => cambiar(t.valor ? { tipo: t.valor, ...(usaHoras(t.valor) ? { kmHasta: null } : { horasHasta: null }) } : { tipo: null, horasHasta: null })}>
                {t.label} <span style={{ fontFamily: MONO, fontSize: 11, opacity: 0.7 }}>{t.cuantos}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── MARCAS ── con su logo, como en Motor y Drive. Tocar una filtra; tocarla
          de nuevo la saca. Las que no tienen logo conocido van con la sigla. */}
      {opciones.marcas.length > 1 && (
        <div style={{ marginBottom: 14 }}>
          <TiraVolt acento={acento} etiqueta="Marcas" gap={8}>
            {opciones.marcas.map(m => {
              const activa = filtro.marca === m.valor;
              const logo = sinLogo[m.valor] ? null : getBrandLogoUrl(m.label);
              return (
                <button key={m.valor} type="button" aria-pressed={activa} onClick={() => cambiar({ marca: activa ? null : m.valor })}
                  style={{ ...chip(activa), flexShrink: 0, minHeight: 46, padding: "0 14px 0 6px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span aria-hidden="true" style={{ width: 32, height: 32, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    {logo
                      // eslint-disable-next-line @next/next/no-img-element -- logo de marca de un sitio externo, chico
                      ? <img src={logo} alt="" width={20} height={20} loading="lazy" onError={() => setSinLogo(e => ({ ...e, [m.valor]: true }))} style={{ objectFit: "contain" }} />
                      : <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "#05070d" }}>{brandAbbr(m.label)}</span>}
                  </span>
                  {m.label} <span style={{ fontFamily: MONO, fontSize: 11, opacity: 0.7 }}>{m.cuantos}</span>
                </button>
              );
            })}
          </TiraVolt>
        </div>
      )}

      {verFiltros && (
        <div id="ctv-panel" className="ctv-panel" style={{ padding: 16, marginBottom: 14, borderRadius: 18, border: `1px solid ${conAlfa(acento, 0.25)}`, background: "rgba(10,14,25,0.85)" }}>
          {opciones.marcas.length > 1 && etiqueta("Marca", "ctv-marca",
            <select id="ctv-marca" value={filtro.marca ?? ""} style={campo} onChange={e => cambiar({ marca: e.target.value || null })}>
              <option value="">Todas</option>
              {opciones.marcas.map(o => <option key={o.valor} value={o.valor}>{o.label} ({o.cuantos})</option>)}
            </select>)}
          {anios.length > 1 && etiqueta("Año desde", "ctv-desde",
            <select id="ctv-desde" value={filtro.anioDesde ?? ""} style={campo} onChange={e => cambiar({ anioDesde: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Cualquiera</option>
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>)}
          {anios.length > 1 && etiqueta("Año hasta", "ctv-hasta",
            <select id="ctv-hasta" value={filtro.anioHasta ?? ""} style={campo} onChange={e => cambiar({ anioHasta: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Cualquiera</option>
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>)}
          {conHoras
            ? etiqueta("Horas hasta", "ctv-horas",
              <select id="ctv-horas" value={filtro.horasHasta ?? ""} style={campo} onChange={e => cambiar({ horasHasta: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Cualquiera</option>
                {conActual(TOPES_HORAS, filtro.horasHasta).map(h => <option key={h} value={h}>{h.toLocaleString("es-AR")} h</option>)}
              </select>)
            : etiqueta("Km hasta", "ctv-km",
              <select id="ctv-km" value={filtro.kmHasta ?? ""} style={campo} onChange={e => cambiar({ kmHasta: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Cualquiera</option>
                {conActual(TOPES_KM, filtro.kmHasta).map(k => <option key={k} value={k}>{k === 0 ? "0 km" : `${k.toLocaleString("es-AR")} km`}</option>)}
              </select>)}
          {etiqueta("Precio hasta", "ctv-precio",
            <div style={{ display: "flex", gap: 6 }}>
              {opciones.monedas.length > 1 ? (
                <select aria-label="Moneda del precio" value={filtro.moneda} style={{ ...campo, width: "auto", flexShrink: 0, padding: "0 8px" }}
                  onChange={e => cambiar({ moneda: e.target.value === "USD" ? "USD" : "ARS" })}>
                  <option value="ARS">$</option>
                  <option value="USD">USD</option>
                </select>
              ) : <span aria-hidden="true" style={{ alignSelf: "center", fontFamily: MONO, fontSize: 13, color: tenue, flexShrink: 0 }}>{filtro.moneda === "USD" ? "USD" : "$"}</span>}
              <input id="ctv-precio" inputMode="numeric" autoComplete="off" placeholder="Sin tope"
                value={filtro.precioHasta != null ? conPuntos(String(filtro.precioHasta)) : ""}
                onChange={e => { const d = sinPuntos(e.target.value).slice(0, 12); cambiar({ precioHasta: d && Number(d) > 0 ? Number(d) : null }); }}
                style={{ ...campo, minWidth: 0 }} />
            </div>)}
          {opciones.combustibles.length > 1 && etiqueta("Combustible", "ctv-comb",
            <select id="ctv-comb" value={filtro.combustible ?? ""} style={campo} onChange={e => cambiar({ combustible: e.target.value || null })}>
              <option value="">Cualquiera</option>
              {opciones.combustibles.map(o => <option key={o.valor} value={o.label}>{o.label} ({o.cuantos})</option>)}
            </select>)}
          {opciones.transmisiones.length > 1 && etiqueta("Caja", "ctv-trans",
            <select id="ctv-trans" value={filtro.transmision ?? ""} style={campo} onChange={e => cambiar({ transmision: e.target.value || null })}>
              <option value="">Cualquiera</option>
              {opciones.transmisiones.map(o => <option key={o.valor} value={o.valor}>{o.label} ({o.cuantos})</option>)}
            </select>)}
          {opciones.ciudades.length > 1 && etiqueta("Zona", "ctv-zona",
            <select id="ctv-zona" value={filtro.ciudad ?? ""} style={campo} onChange={e => cambiar({ ciudad: e.target.value || null })}>
              <option value="">Todas las zonas</option>
              {opciones.ciudades.map(o => <option key={o.valor} value={o.label}>{o.label} ({o.cuantos})</option>)}
            </select>)}
        </div>
      )}

      {puestos.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
          {puestos.map(x => (
            <button key={x.id} type="button" onClick={() => cambiar(x.sacar)} aria-label={`Sacar el filtro ${x.label}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 36, maxWidth: "100%", padding: "0 10px 0 12px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
                border: `1px solid ${conAlfa(acento, 0.45)}`, background: conAlfa(acento, 0.1), color: "#fff", fontSize: 12.5, fontWeight: 600 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.label}</span>
              <span aria-hidden="true" style={{ opacity: 0.6, fontSize: 14 }}>×</span>
            </button>
          ))}
          <button type="button" onClick={limpiar} style={{ background: "none", border: "none", color: tenue, fontSize: 12.5, cursor: "pointer", minHeight: 36, textDecoration: "underline", fontFamily: "inherit" }}>Limpiar todo</button>
        </div>
      )}

      {/* ── LA FICHA ── */}
      {lista.length === 0 ? (
        <div style={{ textAlign: "center", padding: "56px 20px", borderRadius: 22, border: "1px dashed rgba(255,255,255,0.16)" }}>
          <p style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#fff", overflowWrap: "anywhere" }}>
            {productos.length === 0 ? "Todavía no hay vehículos publicados" : "Ningún vehículo con esos filtros"}
          </p>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: tenue }}>
            {productos.length === 0 ? "Dejanos lo que buscás y te avisamos cuando entre." : "Probá sacando alguno, o dejanos lo que buscás."}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            {hayFiltro && <button type="button" onClick={limpiar} style={{ ...chip(false), minHeight: 46, borderRadius: 12 }}>Limpiar filtros</button>}
            {/* El mejor momento para "Avisame si entra": buscó y no estaba. */}
            <button type="button" onClick={() => setAvisame(true)}
              style={{ minHeight: 46, padding: "0 20px", borderRadius: 12, border: "none", background: acento, color: sobreAcento, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", maxWidth: "100%", overflowWrap: "anywhere" }}>
              {marcaActiva || filtro.q.trim() ? `Avisame si entra un ${marcaActiva?.label ?? filtro.q.trim()}` : "Avisame si entra lo que busco"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="ctv-cols ctv-cab">
            <span style={{ gridColumn: "1 / span 2" }}>{columna("nombre", "VEHÍCULO")}</span>
            {columna("anio", "AÑO")}
            {columna("uso", conHoras ? "HORAS" : "USO")}
            {columna(null, "MOTOR")}
            {columna(null, "CAJA")}
            {columna("precio", "PRECIO")}
            <span />
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {lista.slice(0, cuantos).map((p, i) => {
              const tipo = NOMBRE_TIPO[(p.category ?? "").toLowerCase() as CategoriaVehiculo]?.uno;
              const lugar = vehicleLocation(p);
              const comp = comparando.includes(p.id);
              const fav = favoritos.includes(p.id);
              const oferta = !!p.comparePrice && p.comparePrice > p.price;
              const celdas: [string, string][] = [["AÑO", attr(p, "Año")], [usaHoras(p.category) ? "HORAS" : "KM", usoDe(p)], ["MOTOR", attr(p, "Motor")], ["CAJA", attr(p, "Transmisión")]];
              return (
                // La clase no cambia nunca: el efecto al bajar le suma `ef-in`, y si React la reescribiera
                // (al marcarla para comparar) la fila quedaba invisible. Lo de comparar va en `data-comp`.
                <li key={p.id} data-ef="fila" data-comp={comp || undefined} className="ctv-cols ctv-fila"
                  style={{ animationDelay: `${(i % 6) * 0.06}s`, ...(comp ? { borderColor: conAlfa(acento, 0.55) } : {}) }}>
                  <div className="ctv-foto" style={{ position: "relative", aspectRatio: "16/10", borderRadius: 10, overflow: "hidden", background: "#03040a" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- foto de la tienda */}
                    {p.images[0] ? <img src={fotoLiviana(p.images[0], 256)} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: esReservado(p) ? "grayscale(.7)" : undefined }} /> : null}
                    {esReservado(p) && <span style={{ position: "absolute", left: 6, top: 6, background: "#fbbf24", color: "#111", fontSize: 9, fontWeight: 800, letterSpacing: 1, padding: "3px 7px", borderRadius: 999 }}>RESERVADO</span>}
                  </div>
                  <div className="ctv-nombre" style={{ minWidth: 0 }}>
                    <Link href={hrefDe(p)} className="ctv-ir" style={{ color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 16, lineHeight: 1.25, overflowWrap: "anywhere" }}>{p.name}</Link>
                    {(tipo || lugar) && <p style={{ margin: "4px 0 0", fontFamily: MONO, fontSize: 11, letterSpacing: 1, color: tenue, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[tipo, lugar].filter(Boolean).join("  ·  ")}</p>}
                  </div>
                  <div className="ctv-datos">
                    {celdas.map(([k, v]) => (
                      <span key={k} className={`ctv-c${v ? "" : " ctv-vacia"}`} style={{ fontFamily: MONO, fontSize: 14, color: v ? "rgba(232,236,246,0.9)" : "rgba(232,236,246,0.3)", minWidth: 0, overflowWrap: "anywhere" }}>
                        <span className="ctv-k">{k}</span>{v || "—"}
                      </span>
                    ))}
                  </div>
                  <div className="ctv-precio" style={{ minWidth: 0 }}>
                    {oferta && <span style={{ display: "block", fontSize: 12, color: "rgba(232,236,246,0.4)", textDecoration: "line-through" }}>{fmtPrice(p.comparePrice!, monedaDe(p, moneda))}</span>}
                    <span style={{ display: "block", fontSize: 17, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", textShadow: `0 0 16px ${conAlfa(acento, 0.45)}` }}>{p.price > 0 ? fmtPrice(p.price, monedaDe(p, moneda)) : "Consultar"}</span>
                  </div>
                  <div className="ctv-acc">
                    <button type="button" onClick={() => onFavorito(p.id)} aria-pressed={fav} aria-label={fav ? `Quitar ${p.name} de favoritos` : `Guardar ${p.name} en favoritos`}
                      style={{ ...iconoFila, color: fav ? acento : "#fff" }}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    </button>
                    {onComparar && productos.length > 1 && (
                      <button type="button" onClick={() => onComparar(p.id)} aria-pressed={comp} aria-label={comp ? `Sacar ${p.name} de la comparación` : `Comparar ${p.name}`} title="Comparar"
                        style={{ ...iconoFila, borderColor: comp ? acento : "rgba(255,255,255,0.14)", background: comp ? conAlfa(acento, 0.2) : "rgba(5,7,13,0.6)", color: comp ? acento : "#fff" }}>⇄</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {lista.length > cuantos && (
            <div style={{ textAlign: "center", marginTop: 22 }}>
              <button type="button" onClick={() => setCuantos(c => c + DE_A)} style={{ ...chip(false), minHeight: 48, borderRadius: 12, padding: "0 22px" }}>
                Ver más <span style={{ fontFamily: MONO, opacity: 0.7 }}>({lista.length - cuantos})</span>
              </button>
            </div>
          )}
        </>
      )}

      <VentanaAuto abierta={tasar} titulo="Tasá tu usado" onClose={cerrarTasar} panel={PANEL_VOLT}>
        <TasacionVehiculo storeId={storeId} accent={acento} isOwner={isOwner} isPreview={isPreview} abiertoDeEntrada oscuro />
      </VentanaAuto>
      <VentanaAuto abierta={avisame} titulo="Avisame si entra" onClose={cerrarAvisame} panel={PANEL_VOLT}>
        <BusquedaVehiculo storeId={storeId} accent={acento} isOwner={isOwner} isPreview={isPreview} marcaInicial={marcaActiva?.label ?? filtro.q.trim()} oscuro />
      </VentanaAuto>
    </div>
  );
}
