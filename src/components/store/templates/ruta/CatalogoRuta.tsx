"use client";
/**
 * El catálogo de Auto Ruta: la PLANILLA DE FLOTA (15/10/26).
 *
 * Elegida por Flavio entre dos. Quien compra trabajo compara números: cada
 * unidad es un renglón con lo que importa (año, tipo, tracción, km u horas,
 * precio), los trabajos van arriba como pestañas, y un renglón se despliega con
 * las fotos y los botones sin salir de la planilla. En el celular cada renglón
 * es una tarjeta angosta con los mismos datos.
 *
 * El filtro se escribe en la dirección (como los otros catálogos), más
 * `trabajo` y `tamano`, que son de Ruta.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { attr, fmtPrice, esReservado, vehicleLocation, WaIcon } from "@/components/store/auto/AutoVehicleShared";
import { usoDe } from "@/components/store/templates/motor/TarjetaMotor";
import { monedaDe, monedaDeTienda, conPuntos, sinPuntos, type Moneda } from "@/lib/monedaVehiculo";
import { filtrarVehiculos, filtroVacio, filtroAUrl, ORDENES, type FiltroVehiculos, type OpcionesDeFiltro } from "@/lib/filtroVehiculos";
import { NOMBRE_TIPO, type CategoriaVehiculo } from "@/lib/fichaVehiculo";
import { TRABAJOS, NOMBRE_TRABAJO, TAMANOS, NOMBRE_TAMANO, trabajosDe, tamanoDe, cuantosPorTrabajo, capacidadDe, type Trabajo, type Tamano } from "@/lib/trabajoVehiculo";
import { linkWhatsApp, mensajeDeVehiculo } from "@/lib/whatsappTienda";
import { fotoLiviana } from "@/lib/foto-liviana";
import { FOTO_VACIA } from "@/lib/foto-vacia";
import { getContrastColor } from "@/contexts/EditContext";
import { VentanaAuto } from "@/components/store/auto/VentanaAuto";
import BusquedaVehiculo from "@/components/store/auto/BusquedaVehiculo";
import { PAPEL, TINTA, TENUE, LINEA, TITULAR, alfa } from "./estiloRuta";

export const CATALOGO_RUTA_CSS = `
  .cr-tabs { display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; padding-bottom:2px }
  .cr-tabs::-webkit-scrollbar { display:none }
  .cr-filtros { display:grid; gap:10px; grid-template-columns:repeat(2,minmax(0,1fr)) }
  @media(min-width:900px){ .cr-filtros { grid-template-columns:minmax(0,1.4fr) repeat(4,minmax(0,1fr)) } }
  .cr-filtros .cr-q, .cr-filtros .cr-ancho { grid-column:1 / -1 }
  @media(min-width:900px){ .cr-filtros .cr-q, .cr-filtros .cr-ancho { grid-column:auto } }
  .cr-fila { display:grid; grid-template-columns:minmax(0,2.4fr) 70px minmax(0,1fr) 70px minmax(0,1fr) minmax(0,1.2fr) 44px; align-items:center; gap:12px; padding:10px 14px }
  .cr-cab { display:none }
  @media(min-width:900px){ .cr-cab { display:grid } }
  .cr-celu { display:none }
  @media(max-width:899px){
    .cr-fila { grid-template-columns:72px minmax(0,1fr) 40px; grid-template-areas:"foto nombre abrir" "foto datos abrir" "foto precio abrir"; row-gap:2px; column-gap:12px; padding:10px 12px }
    .cr-col { display:none } .cr-celu { display:block }
    .cr-mini { grid-area:foto } .cr-nombre { grid-area:nombre } .cr-datos { grid-area:datos } .cr-precio { grid-area:precio; text-align:left !important } .cr-abrir { grid-area:abrir }
  }
  .cr-renglon { transition: background .15s }
  .cr-renglon:hover { background: #faf9f6 }
  .cr-abierto { display:grid; gap:16px; grid-template-columns:minmax(0,1fr); padding:4px 14px 18px }
  @media(min-width:900px){ .cr-abierto { grid-template-columns:minmax(0,1.3fr) minmax(0,1fr); padding:4px 14px 20px 14px } }
  .cr-fotos { display:grid; gap:6px; grid-template-columns:repeat(3,minmax(0,1fr)) }
  .cr-fotos > :first-child { grid-column:span 3 }
  @media(min-width:600px){ .cr-fotos { grid-template-columns:2fr 1fr 1fr } .cr-fotos > :first-child { grid-column:auto; grid-row:span 2 } }
  .cr-btn:focus-visible, .cr-tab:focus-visible, .cr-abrir:focus-visible { outline:3px solid var(--cr-acento); outline-offset:2px }
`;

const DE_A = 20;

export function CatalogoRuta({ productos, opciones, filtroInicial, trabajoInicial, tamanoInicial, escribirUrl, acento, moneda, hrefDe, favoritos, onFavorito, onVolver, whatsapp, storeId, isOwner, isPreview }: {
  productos: StorefrontProduct[];
  opciones: OpcionesDeFiltro;
  filtroInicial: FiltroVehiculos;
  trabajoInicial: Trabajo | null;
  tamanoInicial: Tamano | null;
  /** En la tienda publicada el filtro se escribe en la dirección; en la previa no hay dirección. */
  escribirUrl: boolean;
  acento: string;
  moneda: string;
  hrefDe: (p: StorefrontProduct) => string;
  favoritos: string[];
  onFavorito: (id: string) => void;
  onVolver: () => void;
  whatsapp: string | null;
  storeId?: string;
  isOwner: boolean;
  isPreview: boolean;
}) {
  const principal = monedaDeTienda({ currency: moneda });
  const sobre = getContrastColor(acento) === "dark" ? TINTA : "#fff";
  const [filtro, setFiltro] = useState(filtroInicial);
  const [trabajo, setTrabajo] = useState<Trabajo | null>(trabajoInicial);
  const [tamano, setTamano] = useState<Tamano | null>(tamanoInicial);
  const [traccion, setTraccion] = useState("");
  const [precio, setPrecio] = useState(filtroInicial.precioHasta ? conPuntos(String(filtroInicial.precioHasta)) : "");
  const [cuantos, setCuantos] = useState(DE_A);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [avisame, setAvisame] = useState(false);
  const cerrarAvisame = useCallback(() => setAvisame(false), []);
  const cambiar = (c: Partial<FiltroVehiculos>) => { setFiltro(f => ({ ...f, ...c })); setCuantos(DE_A); };

  // El filtro a la dirección, sin sumar al historial (atrás vuelve a la portada).
  useEffect(() => {
    if (!escribirUrl) return;
    const sp = filtroAUrl(filtro, principal);
    if (trabajo) sp.set("trabajo", trabajo);
    if (tamano) sp.set("tamano", tamano);
    const s = sp.toString();
    const nueva = `${window.location.pathname}${s ? `?${s}` : ""}`;
    if (nueva !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(window.history.state, "", nueva);
  }, [filtro, trabajo, tamano, principal, escribirUrl]);

  const porTrabajo = useMemo(() => cuantosPorTrabajo(productos), [productos]);
  const tracciones = useMemo(() => [...new Set(productos.map(p => attr(p, "Tracción").trim()).filter(Boolean))].sort(), [productos]);
  const lista = useMemo(() => {
    let l = filtrarVehiculos(productos, filtro, moneda);
    if (trabajo) l = l.filter(p => trabajosDe(p).includes(trabajo));
    if (tamano) l = l.filter(p => tamanoDe(p) === tamano);
    if (traccion) l = l.filter(p => attr(p, "Tracción").trim() === traccion);
    return l;
  }, [productos, filtro, moneda, trabajo, tamano, traccion]);
  const hayFiltro = !!(trabajo || tamano || traccion || filtro.q.trim() || filtro.tipo || filtro.precioHasta != null);
  const limpiar = () => { setTrabajo(null); setTamano(null); setTraccion(""); setPrecio(""); setFiltro(f => ({ ...filtroVacio(f.moneda), orden: f.orden })); setCuantos(DE_A); };

  const campo: React.CSSProperties = { width: "100%", minHeight: 44, boxSizing: "border-box", borderRadius: 4, border: `1.5px solid ${LINEA}`, background: PAPEL, color: TINTA, padding: "0 10px", fontSize: 14, fontFamily: "inherit" };
  const rotulo = (texto: string, id: string, control: React.ReactNode, clase?: string) => (
    <div className={clase} style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <label htmlFor={id} style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase", color: TENUE }}>{texto}</label>
      {control}
    </div>
  );
  const tab = (activo: boolean): React.CSSProperties => ({
    flexShrink: 0, minHeight: 44, padding: "0 16px", borderRadius: 4, cursor: "pointer", fontFamily: TITULAR, fontSize: 16, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap",
    border: `1.5px solid ${activo ? TINTA : LINEA}`, background: activo ? TINTA : PAPEL, color: activo ? "#fff" : TINTA,
  });
  const cab = (texto: string, derecha = false) => (
    <span className="cr-col" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase", color: TENUE, textAlign: derecha ? "right" : "left" }}>{texto}</span>
  );

  return (
    <div style={{ ...({ "--cr-acento": acento } as React.CSSProperties) }}>
      <button type="button" onClick={onVolver} className="cr-btn"
        style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 40, padding: "0 12px 0 8px", marginBottom: 18, borderRadius: 4, cursor: "pointer", fontFamily: "inherit",
          fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", border: `1.5px solid ${LINEA}`, background: PAPEL, color: TINTA }}>
        <span aria-hidden="true" style={{ fontSize: 16 }}>←</span> Inicio
      </button>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "10px 20px", flexWrap: "wrap", marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontFamily: TITULAR, fontSize: "clamp(32px,4.6vw,54px)", fontWeight: 700, lineHeight: 1, textTransform: "uppercase", color: TINTA }}>
          {trabajo ? NOMBRE_TRABAJO[trabajo].titulo : "Todo el stock"}
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: TENUE, fontVariantNumeric: "tabular-nums" }}>
          {lista.length} {lista.length === 1 ? "unidad" : "unidades"}{hayFiltro ? ` de ${productos.length}` : ""}
        </p>
      </div>

      {/* ── Los trabajos, como pestañas ── */}
      <div className="cr-tabs" role="group" aria-label="Filtrar por trabajo" style={{ marginBottom: 14 }}>
        <button type="button" className="cr-tab" onClick={() => { setTrabajo(null); setCuantos(DE_A); }} aria-pressed={trabajo == null} style={tab(trabajo == null)}>Todos</button>
        {TRABAJOS.filter(t => porTrabajo[t] > 0).map(t => (
          <button key={t} type="button" className="cr-tab" onClick={() => { setTrabajo(t); setCuantos(DE_A); }} aria-pressed={trabajo === t} style={tab(trabajo === t)}>
            {NOMBRE_TRABAJO[t].titulo} <span style={{ fontFamily: "inherit", opacity: 0.6 }}>{porTrabajo[t]}</span>
          </button>
        ))}
      </div>

      {/* ── Los filtros de la planilla ── */}
      <div className="cr-filtros" style={{ padding: 14, borderRadius: 6, background: PAPEL, border: `1px solid ${LINEA}`, marginBottom: 14 }}>
        {rotulo("Buscar", "cr-q", <input id="cr-q" type="search" maxLength={60} value={filtro.q} onChange={e => cambiar({ q: e.target.value })} placeholder="Marca, modelo, año…" style={campo} />, "cr-q")}
        {rotulo("Tipo", "cr-tipo",
          <select id="cr-tipo" value={filtro.tipo ?? ""} onChange={e => cambiar({ tipo: e.target.value || null, horasHasta: null })} style={campo}>
            <option value="">Todos</option>
            {opciones.tipos.map(t => <option key={t.valor} value={t.valor}>{t.label} ({t.cuantos})</option>)}
          </select>)}
        {rotulo("Tamaño", "cr-tam",
          <select id="cr-tam" value={tamano ?? ""} onChange={e => { setTamano((e.target.value || null) as Tamano | null); setCuantos(DE_A); }} style={campo}>
            <option value="">Cualquiera</option>
            {TAMANOS.map(t => <option key={t} value={t}>{NOMBRE_TAMANO[t].titulo} ({NOMBRE_TAMANO[t].detalle})</option>)}
          </select>)}
        {rotulo("Tracción", "cr-trac",
          <select id="cr-trac" value={traccion} onChange={e => { setTraccion(e.target.value); setCuantos(DE_A); }} style={campo} disabled={tracciones.length === 0}>
            <option value="">Cualquiera</option>
            {tracciones.map(t => <option key={t} value={t}>{t}</option>)}
          </select>)}
        {rotulo("Precio hasta", "cr-precio",
          <div style={{ display: "flex", gap: 6 }}>
            {opciones.monedas.length > 1 && (
              <select aria-label="Moneda" value={filtro.moneda} onChange={e => cambiar({ moneda: (e.target.value === "USD" ? "USD" : "ARS") as Moneda })} style={{ ...campo, width: "auto", flexShrink: 0 }}>
                <option value="ARS">$</option>
                <option value="USD">USD</option>
              </select>
            )}
            <input id="cr-precio" inputMode="numeric" autoComplete="off" placeholder="Sin tope" maxLength={16} value={precio}
              onChange={e => { const v = conPuntos(e.target.value).slice(0, 15); setPrecio(v); cambiar({ precioHasta: Number(sinPuntos(v)) || null }); }}
              style={{ ...campo, minWidth: 0 }} />
          </div>, "cr-ancho")}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: TENUE }}>
          Ordenar
          <select value={filtro.orden} onChange={e => cambiar({ orden: e.target.value as FiltroVehiculos["orden"] })} style={{ ...campo, width: "auto", minHeight: 40 }}>
            {ORDENES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        {hayFiltro && (
          <button type="button" onClick={limpiar} className="cr-btn" style={{ minHeight: 40, padding: "0 12px", borderRadius: 4, border: "none", background: "transparent", color: TINTA, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}>
            Sacar los filtros
          </button>
        )}
      </div>

      {/* ── La planilla ── */}
      {lista.length === 0 ? (
        <div style={{ padding: "28px 22px", borderRadius: 6, border: `1.5px dashed ${LINEA}`, background: PAPEL, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
          <p style={{ margin: 0, fontSize: 15, color: TENUE, lineHeight: 1.55, maxWidth: 520 }}>
            {productos.length === 0 ? "Todavía no hay unidades publicadas." : "Ninguna unidad con esos filtros. Dejanos lo que buscás y te avisamos cuando entre."}
          </p>
          {productos.length > 0 && (
            <button type="button" onClick={() => setAvisame(true)} className="cr-btn"
              style={{ minHeight: 44, padding: "0 16px", borderRadius: 4, border: `1.5px solid ${TINTA}`, background: "transparent", color: TINTA, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
              Avisame si entra
            </button>
          )}
        </div>
      ) : (
        <div style={{ background: PAPEL, border: `1px solid ${LINEA}`, borderRadius: 6, overflow: "hidden" }}>
          <div className="cr-fila cr-cab" style={{ borderBottom: `2px solid ${TINTA}` }}>
            {cab("Unidad")}{cab("Año")}{cab("Tipo")}{cab("Tracción")}{cab("Km / horas")}{cab("Precio", true)}<span />
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {lista.slice(0, cuantos).map(p => {
              const abiertoEste = abierto === p.id;
              const idCuerpo = `cr-${p.id}`;
              const tipo = NOMBRE_TIPO[(p.category ?? "").toLowerCase() as CategoriaVehiculo]?.uno ?? "";
              const anio = attr(p, "Año");
              const uso = usoDe(p);
              const trac = attr(p, "Tracción");
              const m = monedaDe(p, moneda);
              const precioTxt = p.price > 0 ? fmtPrice(p.price, m) : "Consultar";
              const trabajos = trabajosDe(p);
              const kg = capacidadDe(p);
              const fotos = (p.images.length ? p.images : [FOTO_VACIA]).slice(0, 3);
              const wa = whatsapp ? linkWhatsApp(whatsapp, mensajeDeVehiculo({ nombre: p.name, anio, precio: p.price > 0 ? precioTxt : null })) : null;
              const fav = favoritos.includes(p.id);
              const datosCelu = [anio, uso, trac].filter(Boolean).join("  ·  ");
              const chips = [attr(p, "Carrocería"), attr(p, "Transmisión"), attr(p, "Combustible"), kg != null ? `${kg.toLocaleString("es-AR")} kg de carga` : "", vehicleLocation(p)].filter(Boolean);
              return (
                <li key={p.id} style={{ borderBottom: `1px solid ${LINEA}` }}>
                  <div className="cr-fila cr-renglon" style={{ cursor: "pointer", background: abiertoEste ? alfa(acento, 0.08) : undefined }} onClick={() => setAbierto(abiertoEste ? null : p.id)}>
                    <span className="cr-mini cr-celu" style={{ width: 72, height: 54, borderRadius: 3, overflow: "hidden", background: "#e7e5df" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda */}
                      <img src={fotoLiviana(p.images[0] ?? FOTO_VACIA, 256)} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </span>
                    <span className="cr-nombre" style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      <Link href={hrefDe(p)} onClick={e => e.stopPropagation()} style={{ minWidth: 0, color: TINTA, fontWeight: 800, fontSize: 15, textDecoration: "none", overflowWrap: "anywhere" }}>{p.name}</Link>
                      {esReservado(p) && <span style={{ flexShrink: 0, background: "#f59e0b", color: "#111", fontSize: 9.5, fontWeight: 800, letterSpacing: 1.2, padding: "2px 6px", borderRadius: 2 }}>RESERVADO</span>}
                    </span>
                    <span className="cr-col" style={{ fontVariantNumeric: "tabular-nums", color: TINTA }}>{anio || "—"}</span>
                    <span className="cr-col" style={{ color: TENUE, fontSize: 14, minWidth: 0, overflowWrap: "anywhere" }}>{tipo || "—"}</span>
                    <span className="cr-col" style={{ color: TENUE, fontSize: 14 }}>{trac || "—"}</span>
                    <span className="cr-col" style={{ color: TENUE, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{uso || "—"}</span>
                    <span className="cr-datos cr-celu" style={{ fontSize: 12.5, color: TENUE, fontVariantNumeric: "tabular-nums", minWidth: 0, overflowWrap: "anywhere" }}>{datosCelu || tipo}</span>
                    <span className="cr-precio" style={{ textAlign: "right", fontFamily: TITULAR, fontSize: 19, fontWeight: 700, color: TINTA, fontVariantNumeric: "tabular-nums", minWidth: 0, overflowWrap: "anywhere" }}>{precioTxt}</span>
                    <button type="button" className="cr-abrir" onClick={e => { e.stopPropagation(); setAbierto(abiertoEste ? null : p.id); }} aria-expanded={abiertoEste} aria-controls={idCuerpo}
                      aria-label={abiertoEste ? `Cerrar ${p.name}` : `Ver más de ${p.name}`}
                      style={{ width: 40, height: 40, borderRadius: 4, border: `1.5px solid ${LINEA}`, background: PAPEL, color: TINTA, cursor: "pointer", fontSize: 16, padding: 0, justifySelf: "end",
                        transform: abiertoEste ? "rotate(90deg)" : "none", transition: "transform .2s" }}>▸</button>
                  </div>
                  {abiertoEste && (
                    <div id={idCuerpo} className="cr-abierto">
                      <div className="cr-fotos">
                        {fotos.map((f, i) => (
                          <Link key={f + i} href={hrefDe(p)} aria-label={`Ver ${p.name}`} style={{ display: "block", borderRadius: 4, overflow: "hidden", background: "#e7e5df", aspectRatio: i === 0 ? "4/3" : "1/1" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda */}
                            <img src={fotoLiviana(f, i === 0 ? 800 : 320)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                              onError={e => { (e.currentTarget as HTMLImageElement).src = FOTO_VACIA; }} />
                          </Link>
                        ))}
                      </div>
                      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                        {trabajos.length > 0 && (
                          <p style={{ margin: 0, fontSize: 13.5, color: TINTA }}>
                            <span style={{ display: "block", fontSize: 10.5, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase", color: TENUE, marginBottom: 4 }}>Sirve para</span>
                            {trabajos.map(t => NOMBRE_TRABAJO[t].titulo).join(" · ")}
                          </p>
                        )}
                        {chips.length > 0 && (
                          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {chips.map(c => <li key={c} style={{ fontSize: 13, padding: "5px 10px", borderRadius: 3, border: `1px solid ${LINEA}`, color: TINTA, background: "#faf9f6" }}>{c}</li>)}
                          </ul>
                        )}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: "auto" }}>
                          <Link href={hrefDe(p)} className="cr-btn" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, padding: "0 16px", borderRadius: 4, background: acento, color: sobre, fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
                            Ver la unidad
                          </Link>
                          {wa && (
                            <a href={wa} target="_blank" rel="noopener noreferrer" className="cr-btn"
                              style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 16px", borderRadius: 4, background: "#25d366", color: "#fff", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
                              <WaIcon size={16} /> WhatsApp
                            </a>
                          )}
                          <button type="button" onClick={() => onFavorito(p.id)} aria-pressed={fav} className="cr-btn"
                            style={{ minHeight: 44, padding: "0 14px", borderRadius: 4, border: `1.5px solid ${fav ? TINTA : LINEA}`, background: fav ? TINTA : PAPEL, color: fav ? "#fff" : TINTA, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                            {fav ? "Guardado" : "Guardar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {lista.length > cuantos && (
            <button type="button" onClick={() => setCuantos(c => c + DE_A)} className="cr-btn"
              style={{ display: "block", width: "100%", minHeight: 52, border: "none", borderTop: `1px solid ${LINEA}`, background: "#faf9f6", color: TINTA, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
              Ver {Math.min(DE_A, lista.length - cuantos)} más ({lista.length - cuantos} {lista.length - cuantos === 1 ? "queda" : "quedan"})
            </button>
          )}
        </div>
      )}

      <VentanaAuto abierta={avisame} titulo="Avisame si entra" onClose={cerrarAvisame}>
        <BusquedaVehiculo storeId={storeId} accent={acento} isOwner={isOwner} isPreview={isPreview} marcaInicial={filtro.q.trim()} />
      </VentanaAuto>
    </div>
  );
}
