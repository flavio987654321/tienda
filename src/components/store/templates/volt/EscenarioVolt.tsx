"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { attr, fmtPrice, esReservado, vehicleLocation, WaIcon, useLinkAVehiculo } from "@/components/store/auto/AutoVehicleShared";
import { usoDe } from "@/components/store/templates/motor/TarjetaMotor";
import { monedaDe } from "@/lib/monedaVehiculo";
import { datosDe, type OpcionesDeFiltro } from "@/lib/filtroVehiculos";
import { NOMBRE_TIPO, usaHoras, type CategoriaVehiculo } from "@/lib/fichaVehiculo";
import { linkWhatsApp, mensajeDeVehiculo } from "@/lib/whatsappTienda";
import { getContrastColor } from "@/contexts/EditContext";
import { fotoLiviana } from "@/lib/foto-liviana";
import { conAlfa, MONO } from "./EscenaVolt";
import { TiraVolt } from "./TiraVolt";

/**
 * El escenario de Auto Volt (13/10/26): la portada ES el showroom.
 *
 * Los vehículos giran en un carrusel 3D, como el configurador de una marca: el
 * elegido al frente y grande, con sus datos flotando alrededor; los demás a los
 * costados, en perspectiva, y se tocan para traerlos al frente. Se pasa con las
 * flechas, con el teclado (← →), deslizando en el celular, o desde la tira de
 * miniaturas de abajo. Arriba se filtra por tipo.
 *
 * Reemplaza a la vez al "catálogo en grilla" y al "vehículo en foco" de los
 * otros templates: en el primer intento Volt tenía esos mismos bloques con
 * otro color, y el dueño pidió con razón algo que funcione distinto.
 *
 * No gira solo: un carrusel que se mueve mientras alguien lee los datos es un
 * vehículo que se le escapa.
 */
export const ESCENARIO_VOLT_CSS = `
  .esv-pista { position:relative; height:clamp(210px, 40vw, 400px); perspective:1500px; transform-style:preserve-3d; touch-action:pan-y }
  .esv-carta { position:absolute; left:50%; top:50%; width:min(600px, 74vw); aspect-ratio:16/10; border-radius:22px; overflow:hidden;
    transition: transform .75s cubic-bezier(.2,.8,.2,1), opacity .5s, filter .5s; will-change:transform; background:#03040a; padding:0; border:none; cursor:pointer }
  .esv-carta img { width:100%; height:100%; object-fit:cover; display:block; pointer-events:none }
  .esv-frente { cursor:pointer; display:block; -webkit-box-reflect: below 10px linear-gradient(transparent 72%, rgba(0,0,0,.22)) }
  .esv-dato { position:absolute; z-index:3; display:flex; align-items:center; gap:10px; pointer-events:none; animation: esv-dato .6s .25s cubic-bezier(.2,.8,.2,1) both }
  @keyframes esv-dato { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
  .esv-datos-fila { display:none }
  @media (max-width: 899px) { .esv-dato { display:none } .esv-datos-fila { display:flex } }
  .esv-mini { transition: border-color .2s, opacity .2s, transform .2s }
  .esv-mini:hover { opacity:1 !important; transform:translateY(-2px) }
  .esv-flecha { transition: background .2s, border-color .2s }
  .esv-flecha:hover { background: var(--esv-fondo) !important; border-color: var(--esv-acento) !important }
  .esv-flecha:focus-visible, .esv-mini:focus-visible, .esv-carta:focus-visible { outline:2px solid var(--esv-acento); outline-offset:3px }
  /* En el celular la tarjeta deja lugar a las flechas: si no, la tapaban (se pasa igual deslizando). */
  @media (max-width: 600px) { .esv-carta { width:66vw !important } .esv-flecha { width:34px !important; height:44px !important; border-radius:10px !important } }
  /* En el celular: los tipos en un desplegable (los botones ocupaban tres renglones) y los botones
     del vehículo en una sola fila, con íconos en vez de texto. */
  .esv-select { display:none }
  .esv-ico-txt { display:inline }
  @media (max-width: 600px) {
    .esv-chips { display:none !important }
    .esv-select { display:block; width:100% }
    .esv-cabeza > * { width:100% }
    .esv-compra { width:100% }
    .esv-acciones { flex-wrap:nowrap !important; width:100% }
    .esv-acciones .esv-ver { flex:1 1 auto; min-width:0 }
    .esv-ico-txt { display:none }
    .esv-ico { width:48px; padding:0 !important; flex:0 0 48px }
  }
  @media (prefers-reduced-motion: reduce) { .esv-carta { transition:none } .esv-dato { animation:none } }
`;

/** Dónde queda cada vehículo respecto del elegido. Con 3 o más, la rueda da la vuelta (siempre hay uno a cada lado). */
function desplazamiento(i: number, actual: number, n: number): number {
  const d = i - actual;
  if (n < 3) return d;
  const mitad = Math.floor(n / 2);
  return ((d + n + mitad) % n) - mitad;
}

export function EscenarioVolt({ productos, opciones, inicialId, acento, moneda, whatsapp, hrefDe, favoritos, onFavorito, comparando, onComparar, cabecera, selector }: {
  productos: StorefrontProduct[];
  opciones: OpcionesDeFiltro;
  /** El vehículo con el que arranca (el que la dueña eligió para la vidriera). */
  inicialId?: string;
  acento: string;
  moneda: string;
  whatsapp: { enabled: boolean; number: string };
  hrefDe: (p: StorefrontProduct) => string;
  favoritos: string[];
  onFavorito: (id: string) => void;
  comparando: string[];
  /** Sin esto no hay botón "Comparar" (la dueña ocultó el comparador: el botón no llevaba a nada). */
  onComparar?: (id: string) => void;
  /** Título y bajada de la portada (editables). */
  cabecera: React.ReactNode;
  /** En el editor: el selector del vehículo de arranque. */
  selector?: React.ReactNode;
}) {
  const [tipo, setTipo] = useState("");
  const lista = useMemo(() => tipo ? productos.filter(p => datosDe(p, moneda).tipo === tipo) : productos, [productos, tipo, moneda]);
  /* Se recuerda QUÉ vehículo está al frente (su id), no en qué posición: al
     filtrar por tipo, el mismo vehículo sigue al frente si está en la lista.
     Sin elección propia, manda el elegido para la vidriera; si la dueña lo
     cambia en el editor, se olvida lo navegado y se trae ese al frente. */
  const [elegidoId, setElegidoId] = useState<string | null>(null);
  const [inicialAnterior, setInicialAnterior] = useState(inicialId);
  if (inicialAnterior !== inicialId) { setInicialAnterior(inicialId); setElegidoId(null); }
  const n = lista.length;
  const buscado = elegidoId ?? inicialId;
  const actual = Math.max(0, buscado ? lista.findIndex(p => p.id === buscado) : 0);
  const sobreAcento = getContrastColor(acento) === "dark" ? "#05070d" : "#fff";

  const ir = (i: number) => { if (n) setElegidoId(lista[((i % n) + n) % n].id); };
  const p = n ? lista[Math.min(actual, n - 1)] : null;

  // Deslizar en el celular: sólo un gesto horizontal claro cambia de vehículo.
  const inicioToque = useRef<{ x: number; y: number } | null>(null);
  const alSoltar = (x: number, y: number) => {
    const ini = inicioToque.current;
    inicioToque.current = null;
    if (!ini) return;
    const dx = x - ini.x, dy = y - ini.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) ir(actual + (dx < 0 ? 1 : -1));
  };

  const tipoDe = (q: StorefrontProduct) => NOMBRE_TIPO[(q.category ?? "").toLowerCase() as CategoriaVehiculo]?.uno;
  const datosDelActual = p ? ([
    ["Año", attr(p, "Año")],
    [usaHoras(p.category) ? "Horas" : "Km", usoDe(p)],
    ["Motor", attr(p, "Motor")],
    ["Caja", attr(p, "Transmisión")],
  ] as [string, string][]) : [];
  const esquinas: React.CSSProperties[] = [
    { top: "8%", left: "max(-150px, -12vw)" }, { top: "8%", right: "max(-150px, -12vw)", flexDirection: "row-reverse" },
    { bottom: "14%", left: "max(-150px, -12vw)" }, { bottom: "14%", right: "max(-150px, -12vw)", flexDirection: "row-reverse" },
  ];
  /* El mismo mensaje que la consulta de la ficha: con año, precio y el link a la
     página del vehículo, sin lo del editor. Ver useLinkAVehiculo. */
  const link = useLinkAVehiculo(p ? hrefDe(p) : "");
  const wa = p && whatsapp.enabled ? linkWhatsApp(whatsapp.number, mensajeDeVehiculo({
    nombre: p.name, anio: attr(p, "Año"), precio: p.price > 0 ? fmtPrice(p.price, monedaDe(p, moneda)) : null, link,
  })) : null;
  const oferta = !!p?.comparePrice && p.comparePrice > p.price;

  const chip = (activo: boolean): React.CSSProperties => ({ minHeight: 38, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
    border: `1px solid ${activo ? acento : "rgba(255,255,255,0.14)"}`, background: activo ? conAlfa(acento, 0.18) : "rgba(5,7,13,0.4)",
    color: activo ? "#fff" : "rgba(232,236,246,0.75)", boxShadow: activo ? `0 0 18px ${conAlfa(acento, 0.35)}` : "none" });
  const boton: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, padding: "0 20px", borderRadius: 12,
    textDecoration: "none", fontWeight: 700, fontSize: 14, fontFamily: "inherit", cursor: "pointer" };

  return (
    <div style={{ ...({ "--esv-acento": acento, "--esv-fondo": conAlfa(acento, 0.16) } as React.CSSProperties) }}>
      {/* Cabecera: el título a la izquierda, el filtro por tipo a la derecha. */}
      <div className="esv-cabeza" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "18px 24px", flexWrap: "wrap", marginBottom: "clamp(18px,3vw,28px)" }}>
        <div style={{ minWidth: 0, maxWidth: 640 }}>{cabecera}</div>
        {opciones.tipos.length > 1 && (
          <>
          <label className="esv-select">
            <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Filtrar por tipo</span>
            <select value={tipo} onChange={e => setTipo(e.target.value)}
              style={{ width: "100%", minHeight: 48, borderRadius: 12, border: `1px solid ${conAlfa(acento, 0.45)}`, background: "rgba(5,7,13,0.7)", color: "#fff", padding: "0 14px", fontSize: 15, fontFamily: "inherit" }}>
              {[{ valor: "", label: "Todos los tipos", cuantos: productos.length }, ...opciones.tipos].map(t => (
                <option key={t.valor || "todos"} value={t.valor} style={{ background: "#0a0e19" }}>{t.label} ({t.cuantos})</option>
              ))}
            </select>
          </label>
          <div role="group" aria-label="Filtrar por tipo" className="esv-chips" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[{ valor: "", label: "Todos", cuantos: productos.length }, ...opciones.tipos].map(t => (
              <button key={t.valor || "todos"} type="button" aria-pressed={tipo === t.valor} onClick={() => setTipo(t.valor)} style={chip(tipo === t.valor)}>
                {t.label} <span style={{ fontFamily: MONO, fontSize: 11, opacity: 0.7 }}>{t.cuantos}</span>
              </button>
            ))}
          </div>
          </>
        )}
      </div>
      {selector}

      {!p ? (
        <p style={{ margin: 0, padding: "80px 16px", textAlign: "center", color: "rgba(232,236,246,0.6)", border: "1px dashed rgba(255,255,255,0.14)", borderRadius: 22 }}>
          Todavía no hay vehículos publicados.
        </p>
      ) : (
        <>
          {/* La pista: el carrusel 3D. */}
          <div role="region" aria-roledescription="carrusel" aria-label="Vehículos" tabIndex={0} className="esv-pista"
            onKeyDown={e => { if (e.key === "ArrowRight") { e.preventDefault(); ir(actual + 1); } if (e.key === "ArrowLeft") { e.preventDefault(); ir(actual - 1); } }}
            onPointerDown={e => { if (e.pointerType !== "mouse") inicioToque.current = { x: e.clientX, y: e.clientY }; }}
            onPointerUp={e => alSoltar(e.clientX, e.clientY)} onPointerCancel={() => { inicioToque.current = null; }}
            style={{ outline: "none" }}>
            {lista.map((q, i) => {
              const d = desplazamiento(i, actual, n);
              const lejos = Math.abs(d);
              if (lejos > 3) return null;
              const frente = d === 0;
              const estilo: React.CSSProperties = {
                transform: `translate(-50%,-50%) translateX(${d * 56}%) translateZ(${-lejos * 240}px) rotateY(${-d * 34}deg) scale(${1 - lejos * 0.06})`,
                opacity: lejos > 2 ? 0 : 1 - lejos * 0.28, zIndex: 10 - lejos,
                filter: frente ? "none" : `brightness(${0.5 - lejos * 0.08}) saturate(.8)`,
                pointerEvents: lejos > 2 ? "none" : "auto",
                boxShadow: frente ? `0 0 0 1px ${conAlfa(acento, 0.55)}, 0 50px 120px -40px ${conAlfa(acento, 0.85)}` : "0 0 0 1px rgba(255,255,255,0.08)",
              };
              const foto = q.images[0];
              const img = foto
                // eslint-disable-next-line @next/next/no-img-element -- foto de la tienda
                ? <img src={fotoLiviana(foto, frente ? 1200 : 640)} alt="" style={{ filter: esReservado(q) ? "grayscale(.7)" : undefined }} />
                : <span style={{ display: "grid", placeItems: "center", height: "100%", color: "rgba(232,236,246,0.5)", fontSize: 14 }}>Sin foto</span>;
              return frente ? (
                // El del frente se toca y abre el vehículo (13/10/26: antes sólo el botón "Ver el vehículo").
                <Link key={q.id} href={hrefDe(q)} className="esv-carta esv-frente" style={estilo} aria-label={`Ver ${q.name} (${actual + 1} de ${n})`} draggable={false}>
                  {img}
                  <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: `linear-gradient(120deg, ${conAlfa(acento, 0.16)}, transparent 40%)`, pointerEvents: "none" }} />
                  {esReservado(q) && <span style={{ position: "absolute", top: 14, left: 14, background: "#fbbf24", color: "#111", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, padding: "6px 12px", borderRadius: 999, textTransform: "uppercase" }}>Reservado</span>}
                </Link>
              ) : (
                <button key={q.id} type="button" className="esv-carta" style={estilo} onClick={() => ir(i)} aria-label={`Traer al frente: ${q.name}`} tabIndex={lejos === 1 ? 0 : -1}>
                  {img}
                </button>
              );
            })}

            {/* Los datos flotando alrededor del elegido (en escritorio). Se vuelven a animar con cada vehículo. */}
            <div key={p.id} aria-hidden="true" style={{ position: "absolute", left: "50%", top: "50%", width: "min(600px, 74vw)", aspectRatio: "16/10", transform: "translate(-50%,-50%)", pointerEvents: "none", zIndex: 20 }}>
              {datosDelActual.map(([k, v], i) => v ? (
                <span key={k} className="esv-dato" style={{ ...esquinas[i], animationDelay: `${0.2 + i * 0.08}s` }}>
                  <span style={{ padding: "8px 12px", borderRadius: 12, background: "rgba(8,11,21,0.82)", backdropFilter: "blur(10px)", border: `1px solid ${conAlfa(acento, 0.4)}`, textAlign: i % 2 ? "right" : "left" }}>
                    <span style={{ display: "block", fontFamily: MONO, fontSize: 9.5, letterSpacing: 2, color: "rgba(232,236,246,0.5)", textTransform: "uppercase" }}>{k}</span>
                    <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>{v}</span>
                  </span>
                  <span style={{ width: 34, height: 1, background: `linear-gradient(${i % 2 ? "270deg" : "90deg"}, ${acento}, transparent)` }} />
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: acento, boxShadow: `0 0 10px ${acento}` }} />
                </span>
              ) : null)}
            </div>

            {n > 1 && (["anterior", "siguiente"] as const).map(lado => (
              <button key={lado} type="button" className="esv-flecha" onClick={() => ir(actual + (lado === "siguiente" ? 1 : -1))} aria-label={lado === "siguiente" ? "Vehículo siguiente" : "Vehículo anterior"}
                style={{ position: "absolute", top: "50%", [lado === "siguiente" ? "right" : "left"]: "clamp(0px,1vw,12px)", transform: "translateY(-50%)", zIndex: 30,
                  width: 48, height: 48, borderRadius: 14, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(8,11,21,0.7)", backdropFilter: "blur(10px)",
                  color: "#fff", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {lado === "siguiente" ? "›" : "‹"}
              </button>
            ))}
          </div>

          {/* El elegido: nombre, precio y lo que se hace con él. */}
          <div aria-live="polite" style={{ marginTop: "clamp(28px,5vw,48px)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "18px 32px", flexWrap: "wrap" }}>
            <div style={{ minWidth: 0, flex: "1 1 360px" }}>
              <p style={{ margin: "0 0 8px", fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: acento }}>
                {String(actual + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}{tipoDe(p) ? `  ·  ${tipoDe(p)}` : ""}{vehicleLocation(p) ? `  ·  ${vehicleLocation(p)}` : ""}
              </p>
              <h2 style={{ margin: 0, fontSize: "clamp(26px,4vw,46px)", fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.04, color: "#fff", overflowWrap: "anywhere" }}>{p.name}</h2>
              <p className="esv-datos-fila" style={{ margin: "10px 0 0", gap: 8, flexWrap: "wrap", fontFamily: MONO, fontSize: 12, color: "rgba(232,236,246,0.65)" }}>
                {datosDelActual.filter(([, v]) => v).map(([k, v]) => <span key={k}>{v}</span>).reduce<React.ReactNode[]>((acc, el, i) => i ? [...acc, <span key={`s${i}`} aria-hidden="true">·</span>, el] : [el], [])}
              </p>
            </div>
            <div className="esv-compra" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12, flex: "0 1 auto", minWidth: 0 }}>
              <div>
                {oferta && <p style={{ margin: 0, fontSize: 14, color: "rgba(232,236,246,0.45)", textDecoration: "line-through" }}>{fmtPrice(p.comparePrice!, monedaDe(p, moneda))}</p>}
                <p style={{ margin: 0, fontSize: "clamp(26px,3.4vw,38px)", fontWeight: 800, letterSpacing: -1, color: "#fff", textShadow: `0 0 28px ${conAlfa(acento, 0.5)}` }}>
                  {p.price > 0 ? fmtPrice(p.price, monedaDe(p, moneda)) : "Consultar"}
                </p>
              </div>
              <div className="esv-acciones" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link href={hrefDe(p)} className="esv-ver" style={{ ...boton, background: acento, color: sobreAcento, fontWeight: 800, boxShadow: `0 10px 30px -10px ${conAlfa(acento, 0.85)}` }}>Ver el vehículo</Link>
                {wa && <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Consultar por WhatsApp" className="esv-ico" style={{ ...boton, border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}><WaIcon size={16} /><span className="esv-ico-txt" aria-hidden="true">Consultar</span></a>}
                <button type="button" onClick={() => onFavorito(p.id)} aria-pressed={favoritos.includes(p.id)} aria-label={favoritos.includes(p.id) ? "Quitar de favoritos" : "Guardar en favoritos"}
                  style={{ ...boton, width: 48, padding: 0, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: favoritos.includes(p.id) ? acento : "#fff" }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill={favoritos.includes(p.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </button>
                {onComparar && productos.length > 1 && (
                  <button type="button" onClick={() => onComparar(p.id)} aria-pressed={comparando.includes(p.id)} className="esv-ico"
                    aria-label={comparando.includes(p.id) ? "Sacar de la comparación" : "Comparar"}
                    style={{ ...boton, border: `1px solid ${comparando.includes(p.id) ? acento : "rgba(255,255,255,0.2)"}`, background: comparando.includes(p.id) ? conAlfa(acento, 0.16) : "transparent", color: "#fff" }}>
                    <span aria-hidden="true" style={{ fontFamily: MONO, fontSize: 17 }}>⇄</span><span className="esv-ico-txt" aria-hidden="true">{comparando.includes(p.id) ? "Comparando" : "Comparar"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* La tira de miniaturas: saltar directo a cualquiera. Sin barra de scroll: flechas a los costados. */}
          {n > 1 && (
            <div style={{ marginTop: 22 }}>
            <TiraVolt acento={acento} etiqueta="Elegir vehículo">
              {lista.map((q, i) => (
                <button key={q.id} type="button" className="esv-mini" onClick={() => ir(i)} aria-label={q.name} aria-current={i === actual}
                  style={{ flex: "0 0 auto", width: 92, height: 60, padding: 0, borderRadius: 12, overflow: "hidden", cursor: "pointer", background: "#03040a",
                    border: `2px solid ${i === actual ? acento : "transparent"}`, opacity: i === actual ? 1 : 0.55, boxShadow: i === actual ? `0 0 16px ${conAlfa(acento, 0.5)}` : "none" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de la tienda */}
                  {q.images[0] ? <img src={fotoLiviana(q.images[0], 256)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : null}
                </button>
              ))}
            </TiraVolt>
            </div>
          )}
        </>
      )}
    </div>
  );
}
