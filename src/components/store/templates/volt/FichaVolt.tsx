"use client";
/**
 * La página de un vehículo en Auto Volt (13/10/26): la CABINA.
 *
 * Hasta acá Volt usaba la ficha de los otros templates de autos —y encima la
 * clara de Auto Drive, porque la regla era "oscura si es Motor, clara para el
 * resto"—: al tocar un vehículo la tienda cambiaba de cara. El dueño eligió
 * esta estructura entre tres ("cabina / tablero"), que sigue la idea del
 * showroom de la portada:
 *
 *   · la foto grande, enmarcada como un visor, con los datos clave (año, uso,
 *     motor, caja) flotando en las esquinas y unidos con líneas de luz;
 *   · la ficha como "instrumentos": casilleros de tablero agrupados, y el
 *     equipamiento y los papeles desplegables, con lo que tiene encendido;
 *   · una barra fija abajo con el precio y la consulta, siempre a mano.
 *
 * La LÓGICA es la de siempre (consulta, tasación, descargas, favoritos; ver
 * components/store/auto y lib/fichaVehiculo): cambia la cara, no lo que hace.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProductDetailViewProps } from "@/components/store/templates/productDetail/shared";
import { FotoAmpliada, FOTO_VACIA, parecidos } from "@/components/store/templates/productDetail/VehiculoDetail";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import { useFavoritosVehiculos } from "@/hooks/useFavoritosVehiculos";
import StoreProductReels from "@/components/store/ProductReels";
import ConsultaVehiculo from "@/components/store/auto/ConsultaVehiculo";
import TasacionVehiculo from "@/components/store/auto/TasacionVehiculo";
import PieDeAutos from "@/components/store/auto/PieDeAutos";
import { attr, fmtPrice, esReservado, vehicleLocation, datosDelVehiculo, AUTO_SERVICES, WaIcon } from "@/components/store/auto/AutoVehicleShared";
import { usoDe } from "@/components/store/templates/motor/TarjetaMotor";
import { monedaDe } from "@/lib/monedaVehiculo";
import { NOMBRE_TIPO, usaHoras, tipoDeFicha, leerFicha, bloquesDeFicha, controlDeFicha, urlFichaPdf, type CategoriaVehiculo, type FilaDeFicha } from "@/lib/fichaVehiculo";
import { linkAVehiculo, linkAVehiculos } from "@/lib/filtroVehiculos";
import { linkWhatsApp } from "@/lib/whatsappTienda";
import { descripcionLegible } from "@/lib/descripcionLegible";
import { getContrastColor } from "@/contexts/EditContext";
import { CAPAS } from "@/lib/capas-tienda";
import { fotoLiviana } from "@/lib/foto-liviana";
import { EscenaVolt, ESCENA_VOLT_CSS, conAlfa, MONO } from "./EscenaVolt";
import { TiraVolt, TIRA_VOLT_CSS } from "./TiraVolt";
import { useDesplazamientoVolt, LineaDeProgreso } from "./desplazamientoVolt";
import { useEfectosAlBajar } from "@/components/store/templates/shared/efectosAutos";

const VACIO = "#05070d";
const TINTA = "#e8ecf6";
const TENUE = "rgba(232,236,246,0.6)";
const LINEA = "rgba(255,255,255,0.09)";

const CSS = `
  ${ESCENA_VOLT_CSS}
  ${TIRA_VOLT_CSS}
  .fv-visor { position:relative; aspect-ratio:16/9; border-radius:24px; overflow:hidden; background:#000 }
  @media (max-width: 699px) { .fv-visor { aspect-ratio:4/3; border-radius:18px } }
  .fv-hud { position:absolute; z-index:3; display:flex; align-items:center; gap:10px; pointer-events:none; animation: fv-hud .6s .2s cubic-bezier(.2,.8,.2,1) both }
  @keyframes fv-hud { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
  .fv-hud-fila { display:none }
  @media (max-width: 699px) { .fv-hud, .fv-esquina { display:none } .fv-hud-fila { display:flex } }
  .fv-mini { transition: opacity .2s, border-color .2s, transform .2s }
  .fv-mini:hover { opacity:1 !important; transform:translateY(-2px) }
  .fv-cuerpo { display:grid; grid-template-columns:minmax(0,1fr); grid-template-areas:"consola" "tablero"; gap:28px }
  .fv-tablero { grid-area:tablero; min-width:0 } .fv-consola { grid-area:consola; min-width:0 }
  @media (min-width: 980px) {
    .fv-cuerpo { grid-template-columns:minmax(0,1.6fr) minmax(0,1fr); grid-template-areas:"tablero consola"; gap:40px }
    .fv-consola-in { position:sticky; top:96px }
  }
  .fv-inst { display:grid; gap:10px; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)) }
  .fv-ctrl { display:grid; gap:8px; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); margin-top:14px }
  .fv-plegable > summary { list-style:none; cursor:pointer }
  .fv-plegable > summary::-webkit-details-marker { display:none }
  .fv-plegable[open] .fv-flecha { transform:rotate(90deg) }
  .fv-similares { display:grid; gap:12px; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)) }
  .fv-sim { transition: border-color .2s, transform .25s, box-shadow .25s }
  .fv-sim:hover { border-color: var(--fv-acento) !important; transform:translateY(-3px); box-shadow:0 20px 40px -24px var(--fv-acento) }
  .fv-link:hover { color: var(--fv-acento) !important }
  .fv-barra-precio { min-width:0 }
  @media (max-width: 479px) { .fv-barra-txt { display:none } }
  .product-rte, .product-rte * { color: inherit }
  @media (prefers-reduced-motion: reduce) { .fv-hud { animation:none } .fv-sim, .fv-mini { transition:none } }
  /* Efectos al bajar (ver shared/efectosAutos): los bloques entran enfocándose y
     los casilleros de la ficha se "encienden" de a uno, como un tablero al dar contacto. */
  @keyframes fv-ef { from { opacity:0; transform:translateY(26px); filter:blur(8px) } to { opacity:1; transform:none; filter:none } }
  .ef-listo [data-ef="sube"]:not(.ef-in) > *, .ef-listo [data-ef="grilla"]:not(.ef-in) > * { opacity:0 }
  .ef-listo [data-ef="sube"].ef-in > *, .ef-listo [data-ef="grilla"].ef-in > * { animation: fv-ef .85s cubic-bezier(.16,.84,.3,1) backwards }
  @keyframes fv-encender { 0% { opacity:.12; filter:grayscale(1) brightness(.5) } 55% { opacity:1; filter:brightness(1.6) } 100% { opacity:1; filter:none } }
  .ef-listo [data-ef="encender"]:not(.ef-in) > * { opacity:.12 }
  .ef-listo [data-ef="encender"].ef-in > * { animation: fv-encender .9s ease-out backwards }
  ${Array.from({ length: 15 }, (_, k) => `.ef-listo [data-ef].ef-in > :nth-child(${k + 2}) { animation-delay:${((k + 1) * 0.06).toFixed(2)}s }`).join(" ")}
  .ef-listo [data-ef].ef-ya > * { animation:none !important }
`;

/** Un bloque del tablero: título con su código y lo de adentro. */
function Bloque({ acento, codigo, titulo, children }: { acento: string; codigo: string; titulo: string; children: React.ReactNode }) {
  return (
    <section data-ef="sube" style={{ marginTop: 34 }}>
      <p style={{ margin: "0 0 6px", fontFamily: MONO, fontSize: 10.5, letterSpacing: 2.5, color: acento, display: "flex", alignItems: "center", gap: 10 }}>
        <span aria-hidden="true" style={{ width: 20, height: 1, background: acento, boxShadow: `0 0 8px ${acento}` }} />{codigo}
      </p>
      <h2 style={{ margin: "0 0 16px", fontSize: "clamp(20px,2.4vw,26px)", fontWeight: 800, letterSpacing: -0.6, color: "#fff" }}>{titulo}</h2>
      {children}
    </section>
  );
}

/** Los instrumentos: casilleros de tablero con su rótulo y el dato encendido. */
function Instrumentos({ filas, acento }: { filas: FilaDeFicha[]; acento: string }) {
  return (
    <dl className="fv-inst" data-ef="encender" style={{ margin: 0 }}>
      {filas.map(f => (
        <div key={f.label} style={{ position: "relative", padding: "14px 14px 16px", borderRadius: 14, minWidth: 0, overflow: "hidden",
          background: "linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))", border: `1px solid ${LINEA}` }}>
          <dt style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: 1.8, textTransform: "uppercase", color: "rgba(232,236,246,0.5)", marginBottom: 6 }}>{f.label}</dt>
          <dd style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#fff", overflowWrap: "anywhere", lineHeight: 1.25 }}>{f.valor}</dd>
          <span aria-hidden="true" style={{ position: "absolute", left: 14, right: 14, bottom: 0, height: 2, borderRadius: 2,
            background: `linear-gradient(90deg, ${acento}, transparent)`, opacity: 0.7, boxShadow: `0 0 10px ${conAlfa(acento, 0.6)}` }} />
        </div>
      ))}
    </dl>
  );
}

/** Lista de control: encendido lo que tiene, apagado lo que no se informó. */
function Control({ items, acento }: { items: { label: string; tiene: boolean }[]; acento: string }) {
  return (
    <ul className="fv-ctrl" style={{ listStyle: "none", padding: 0 }}>
      {items.map(i => (
        <li key={i.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, minWidth: 0, fontSize: 13.5, lineHeight: 1.3,
          border: `1px solid ${i.tiene ? conAlfa(acento, 0.35) : LINEA}`, background: i.tiene ? conAlfa(acento, 0.07) : "transparent",
          color: i.tiene ? "#fff" : "rgba(232,236,246,0.38)", fontWeight: i.tiene ? 600 : 400 }}>
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
            background: i.tiene ? acento : "rgba(255,255,255,0.15)", boxShadow: i.tiene ? `0 0 10px ${acento}` : "none" }} />
          <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{i.label}</span>
          <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{i.tiene ? ": sí" : ": no informado"}</span>
        </li>
      ))}
    </ul>
  );
}

function Plegable({ acento, titulo, cuantos, children }: { acento: string; titulo: string; cuantos: string; children: React.ReactNode }) {
  return (
    <details className="fv-plegable" style={{ marginTop: 12, borderRadius: 16, border: `1px solid ${LINEA}`, background: "rgba(255,255,255,0.02)", padding: "4px 16px 16px" }}>
      <summary style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, paddingTop: 12 }}>
        <span aria-hidden="true" className="fv-flecha" style={{ color: acento, fontFamily: MONO, transition: "transform .2s" }}>▸</span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: "#fff" }}>{titulo}</span>
        <span style={{ fontFamily: MONO, fontSize: 12, color: TENUE }}>{cuantos}</span>
      </summary>
      {children}
    </details>
  );
}

function IconoPdf() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M12 18v-6" /><path d="m9 15 3 3 3-3" />
    </svg>
  );
}

export function VehiculoDetailVolt({ view }: { view: ProductDetailViewProps }) {
  const { slug, storeName, currency, whatsapp, product: p, products, isPreview, isOwner, legales, accentOverride, storeId, socialLinks, footerBg, fraseDelPie } = view;
  const acento = accentOverride ?? "#22d3ee";
  const sobreAcento = getContrastColor(acento) === "dark" ? VACIO : "#fff";
  const router = useRouter();
  const fotos = p.images.length ? p.images : [FOTO_VACIA];
  const [foto, setFoto] = useState(0);
  const [ampliada, setAmpliada] = useState(false);
  const cerrarAmpliada = useCallback(() => setAmpliada(false), []);
  // Otro vehículo (desde "parecidos"): vuelve a la primera foto.
  const [mostrado, setMostrado] = useState(p.id);
  if (mostrado !== p.id) { setMostrado(p.id); setFoto(0); setAmpliada(false); }
  const pasar = (d: number) => setFoto(i => (i + d + fotos.length) % fotos.length);
  const swipe = useTouchSwipe(() => pasar(1), () => pasar(-1));
  const fav = useFavoritosVehiculos(isPreview);
  useEfectosAlBajar(true);
  const raizRef = useRef<HTMLDivElement>(null);
  const { barraOculta } = useDesplazamientoVolt(raizRef, { activo: true, puedeEsconder: true });
  const [copiado, setCopiado] = useState(false);

  const moneda = monedaDe(p, currency);
  const precio = p.price > 0 ? fmtPrice(p.price, moneda) : "Consultar precio";
  const oferta = !!p.comparePrice && p.comparePrice > p.price;
  const anio = attr(p, "Año");
  const tipo = NOMBRE_TIPO[(p.category ?? "").toLowerCase() as CategoriaVehiculo];
  const lugar = vehicleLocation(p);
  const hud: [string, string][] = ([
    ["Año", anio], [usaHoras(p.category) ? "Horas" : "Km", usoDe(p)], ["Motor", attr(p, "Motor")], ["Caja", attr(p, "Transmisión")],
  ] as [string, string][]);
  const esquinas: React.CSSProperties[] = [
    { top: 18, left: 18 }, { top: 18, right: 18, flexDirection: "row-reverse" },
    { bottom: 18, left: 18 }, { bottom: 18, right: 18, flexDirection: "row-reverse" },
  ];
  const datos = datosDelVehiculo(p).map(d => ({ label: d.label, valor: d.value }));
  const tipoFicha = tipoDeFicha(p.category);
  const ficha = useMemo(() => tipoFicha ? leerFicha(p.attributes) : null, [tipoFicha, p.attributes]);
  const bloques = ficha && tipoFicha ? bloquesDeFicha(ficha, tipoFicha) : null;
  const control = ficha && tipoFicha ? controlDeFicha(ficha, tipoFicha) : null;
  const similares = useMemo(() => parecidos(p, products ?? []), [p, products]);
  const services = useMemo(() => {
    try { const j = JSON.parse(attr(p, "Servicios") || "{}"); return j && typeof j === "object" ? j as Record<string, boolean> : {}; } catch { return {}; }
  }, [p]);
  const hayServices = Object.keys(services).length > 0;
  const wa = whatsapp ? linkWhatsApp(whatsapp, `Hola! Me interesa el ${p.name}${anio ? ` (${anio})` : ""} de ${precio}. ¿Está disponible?`) : null;

  /* En el editor esta página es otra dirección: los links llevan `t=auto-volt`
     (si no, la ficha de al lado se dibujaba con el template GUARDADO) y
     "volver" vuelve al editor, porque el catálogo de Volt vive adentro del
     template y desde acá no hay forma de abrirlo sin salir de Diseño. */
  const deEditor = isPreview ? "&t=auto-volt" : "";
  const aVehiculo = (id: string) => `${linkAVehiculo(slug, id, isPreview)}${deEditor}`;
  const volver = isPreview ? "/dashboard/configuracion" : linkAVehiculos(slug, {});
  const inicio = isPreview ? "/dashboard/configuracion" : `/tienda/${slug}`;

  const compartir = async () => {
    const url = window.location.href.split("?")[0];
    try {
      if (navigator.share) { await navigator.share({ title: p.name, text: `${p.name} — ${precio}`, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch { /* lo canceló */ }
  };
  /* La barra de abajo aparece recién cuando el precio de arriba ya no se ve:
     al entrar, en la compu, tapaba el nombre del vehículo. */
  const cabecera = useRef<HTMLDivElement>(null);
  const [verBarra, setVerBarra] = useState(false);
  useEffect(() => {
    const el = cabecera.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVerBarra(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const irAConsulta = () => document.getElementById("fv-consulta")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const icono: React.CSSProperties = { width: 42, height: 42, borderRadius: 12, border: `1px solid ${LINEA}`, background: "rgba(5,7,13,0.5)", color: TINTA,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0 };
  const botonLinea: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 44, padding: "0 16px", borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)", background: "transparent", color: "#fff", fontSize: 13.5, fontWeight: 600, textDecoration: "none", cursor: "pointer", fontFamily: "inherit" };

  return (
    <div ref={raizRef} style={{ background: VACIO, color: TINTA, minHeight: "100vh", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", paddingBottom: 84,
      ...({ "--fv-acento": acento } as React.CSSProperties) }}>
      <style>{CSS}</style>

      {/* ── Barra ── flota arriba, como en la portada. */}
      <LineaDeProgreso acento={acento} enPanel={false} capa={CAPAS.encabezadoListado + 1} />
      {/* Bajando se esconde; subiendo vuelve (ver volt/desplazamientoVolt). */}
      <div style={{ position: "sticky", top: 0, zIndex: CAPAS.encabezadoListado, padding: "10px clamp(10px,2vw,20px) 0",
        transform: barraOculta ? "translateY(-110%)" : "none", transition: "transform .4s cubic-bezier(.2,.8,.2,1)" }}>
        <header style={{ maxWidth: 1240, margin: "0 auto", height: 60, borderRadius: 18, padding: "0 10px", display: "flex", alignItems: "center", gap: 10,
          background: "rgba(8,11,21,0.7)", backdropFilter: "blur(18px) saturate(1.4)", border: `1px solid ${LINEA}`, boxShadow: "0 18px 50px -24px rgba(0,0,0,0.7)" }}>
          <Link href={volver} className="fv-link" aria-label={isPreview ? "Volver al editor" : "Volver a los vehículos"}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 10px", color: TENUE, textDecoration: "none", fontFamily: MONO, fontSize: 11, letterSpacing: 2, flexShrink: 0 }}>
            <span aria-hidden="true" style={{ fontSize: 16 }}>←</span><span aria-hidden="true" className="fv-barra-txt">{isPreview ? "EDITOR" : "VEHÍCULOS"}</span>
          </Link>
          <Link href={inicio} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 15 }}>
            <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 3, background: acento, boxShadow: `0 0 12px ${acento}`, transform: "rotate(45deg)", flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{storeName}</span>
          </Link>
          <button type="button" onClick={compartir} aria-label={copiado ? "Link copiado" : "Compartir este vehículo"} style={icono}>
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg>
          </button>
          <button type="button" onClick={() => fav.alternar(p.id)} aria-pressed={fav.esFavorito(p.id)} aria-label={fav.esFavorito(p.id) ? "Sacar de favoritos" : "Guardar en favoritos"}
            style={{ ...icono, color: fav.esFavorito(p.id) ? acento : TINTA }}>
            <svg width={17} height={17} viewBox="0 0 24 24" fill={fav.esFavorito(p.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </header>
      </div>
      {copiado && <p role="status" style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", zIndex: CAPAS.flotante, margin: 0, padding: "8px 14px", borderRadius: 10, background: "#0a0e19", border: `1px solid ${conAlfa(acento, 0.4)}`, fontSize: 13 }}>¡Link copiado!</p>}

      {/* ── La cabina: el visor con los datos en las esquinas ── */}
      <section aria-label="Fotos" style={{ position: "relative", overflow: "hidden", padding: "clamp(18px,3vw,32px) clamp(12px,4vw,32px) 8px" }}>
        <EscenaVolt acento={acento} quieta={isPreview} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto" }}>
          <div {...swipe} className="fv-visor" style={{ boxShadow: `0 0 0 1px ${conAlfa(acento, 0.45)}, 0 60px 120px -50px ${conAlfa(acento, 0.75)}` }}>
            <button type="button" onClick={() => setAmpliada(true)} aria-label={`Ampliar foto ${foto + 1} de ${fotos.length}`}
              style={{ all: "unset", cursor: "zoom-in", position: "absolute", inset: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda */}
              <img src={fotoLiviana(fotos[foto], 1920)} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: esReservado(p) ? "grayscale(.6)" : undefined }}
                onError={e => { (e.currentTarget as HTMLImageElement).src = FOTO_VACIA; }} />
            </button>
            {/* El velo de los bordes, para que los datos se lean sobre cualquier foto. */}
            <span aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(5,7,13,0.6))" }} />
            {/* Las esquinas del visor. */}
            {[{ top: 10, left: 10 }, { top: 10, right: 10 }, { bottom: 10, left: 10 }, { bottom: 10, right: 10 }].map((pos, i) => (
              <span key={i} aria-hidden="true" className="fv-esquina" style={{ position: "absolute", ...pos, width: 22, height: 22, pointerEvents: "none",
                borderColor: acento, borderStyle: "solid", borderWidth: `${"top" in pos ? 2 : 0}px ${"right" in pos ? 2 : 0}px ${"bottom" in pos ? 2 : 0}px ${"left" in pos ? 2 : 0}px`,
                borderRadius: 4, filter: `drop-shadow(0 0 6px ${acento})` }} />
            ))}
            <div key={p.id} aria-hidden="true">
              {hud.map(([k, v], i) => v ? (
                <span key={k} className="fv-hud" style={{ ...esquinas[i], animationDelay: `${0.15 + i * 0.08}s`, margin: 22 }}>
                  <span style={{ padding: "8px 12px", borderRadius: 12, background: "rgba(8,11,21,0.78)", backdropFilter: "blur(10px)", border: `1px solid ${conAlfa(acento, 0.45)}`, textAlign: i % 2 ? "right" : "left" }}>
                    <span style={{ display: "block", fontFamily: MONO, fontSize: 9.5, letterSpacing: 2, color: "rgba(232,236,246,0.55)", textTransform: "uppercase" }}>{k}</span>
                    <span style={{ display: "block", fontSize: 16, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>{v}</span>
                  </span>
                  <span style={{ width: 30, height: 1, background: `linear-gradient(${i % 2 ? "270deg" : "90deg"}, ${acento}, transparent)` }} />
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: acento, boxShadow: `0 0 10px ${acento}` }} />
                </span>
              ) : null)}
            </div>
            {esReservado(p) && (
              <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 4, background: "#fbbf24", color: "#111", fontSize: 12, fontWeight: 800, letterSpacing: 2, padding: "8px 16px", borderRadius: 999 }}>RESERVADO</span>
            )}
            {fotos.length > 1 && (["izq", "der"] as const).map(lado => (
              <button key={lado} type="button" onClick={() => pasar(lado === "der" ? 1 : -1)} aria-label={lado === "der" ? "Foto siguiente" : "Foto anterior"}
                style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", [lado === "izq" ? "left" : "right"]: 12, zIndex: 5, width: 44, height: 44, borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.2)", background: "rgba(8,11,21,0.65)", backdropFilter: "blur(8px)", color: "#fff", fontSize: 22, cursor: "pointer" }}>
                {lado === "izq" ? "‹" : "›"}
              </button>
            ))}
          </div>
          {/* En el celular los datos no entran en las esquinas: van en fila. */}
          <p className="fv-hud-fila" style={{ margin: "12px 0 0", gap: 6, flexWrap: "wrap" }}>
            {hud.filter(([, v]) => v).map(([k, v]) => (
              <span key={k} style={{ padding: "6px 10px", borderRadius: 10, border: `1px solid ${conAlfa(acento, 0.35)}`, background: "rgba(8,11,21,0.6)", fontSize: 13, fontWeight: 600 }}>
                <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: 1.5, color: "rgba(232,236,246,0.5)", marginRight: 6 }}>{k.toUpperCase()}</span>{v}
              </span>
            ))}
          </p>
          {fotos.length > 1 && (
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
            <TiraVolt acento={acento} etiqueta="Fotos">
              {fotos.map((f, i) => (
                <button key={i} type="button" className="fv-mini" onClick={() => setFoto(i)} aria-label={`Ver foto ${i + 1}`} aria-current={i === foto}
                  style={{ flex: "0 0 auto", width: 88, height: 58, padding: 0, borderRadius: 10, overflow: "hidden", cursor: "pointer", background: "#000",
                    border: `2px solid ${i === foto ? acento : "transparent"}`, opacity: i === foto ? 1 : 0.5, boxShadow: i === foto ? `0 0 14px ${conAlfa(acento, 0.5)}` : "none" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda */}
                  <img src={fotoLiviana(f, 256)} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
              ))}
            </TiraVolt>
            </div>
              <span aria-hidden="true" style={{ fontFamily: MONO, fontSize: 12, color: TENUE, whiteSpace: "nowrap", flexShrink: 0 }}>
                {String(foto + 1).padStart(2, "0")} / {String(fotos.length).padStart(2, "0")}
              </span>
            </div>
          )}
        </div>
      </section>

      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "clamp(20px,3vw,36px) clamp(16px,4vw,32px) 40px" }}>
        {/* ── El nombre y el precio ── */}
        <div ref={cabecera} style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "14px 28px", flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: "1 1 420px" }}>
            <p style={{ margin: "0 0 10px", fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: acento, overflowWrap: "anywhere" }}>
              {[tipo?.uno, attr(p, "Condición"), lugar].filter(Boolean).join("  ·  ") || "Vehículo"}
            </p>
            <h1 style={{ margin: 0, fontSize: "clamp(30px,4.6vw,56px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, color: "#fff", overflowWrap: "anywhere" }}>{p.name}</h1>
          </div>
          <div style={{ minWidth: 0 }}>
            {oferta && <p style={{ margin: 0, fontSize: 15, color: "rgba(232,236,246,0.45)", textDecoration: "line-through" }}>{fmtPrice(p.comparePrice!, moneda)}</p>}
            <p style={{ margin: 0, fontSize: "clamp(28px,3.6vw,42px)", fontWeight: 800, letterSpacing: -1, color: "#fff", textShadow: `0 0 30px ${conAlfa(acento, 0.55)}` }}>{precio}</p>
          </div>
        </div>

        <div className="fv-cuerpo" style={{ marginTop: 8 }}>
          {/* ── El tablero ── */}
          <div className="fv-tablero">
            {datos.length > 0 && (
              <Bloque acento={acento} codigo="01 // DATOS" titulo="Ficha técnica"><Instrumentos filas={datos} acento={acento} /></Bloque>
            )}
            {bloques && bloques.motor.length > 0 && (
              <Bloque acento={acento} codigo="02 // MOTOR" titulo="Motor y prestaciones"><Instrumentos filas={bloques.motor} acento={acento} /></Bloque>
            )}
            {bloques && bloques.medidas.length > 0 && (
              <Bloque acento={acento} codigo="03 // MEDIDAS" titulo="Medidas y capacidades"><Instrumentos filas={bloques.medidas} acento={acento} /></Bloque>
            )}
            {control && bloques && (bloques.equipamiento.length > 0 || bloques.papeles.length > 0 || hayServices) && (
              <section style={{ marginTop: 22 }}>
                {bloques.equipamiento.length > 0 && (
                  <Plegable acento={acento} titulo="Equipamiento" cuantos={`${control.equipamiento.filter(i => i.tiene).length} / ${control.equipamiento.length}`}>
                    <Control items={control.equipamiento} acento={acento} />
                  </Plegable>
                )}
                {bloques.papeles.length > 0 && (
                  <Plegable acento={acento} titulo="Papeles y condiciones" cuantos={`${control.papeles.filter(i => i.tiene).length} / ${control.papeles.length}`}>
                    <Control items={control.papeles} acento={acento} />
                  </Plegable>
                )}
              </section>
            )}
            {hayServices && (
              <Plegable acento={acento} titulo="Historial de servicios" cuantos={`${AUTO_SERVICES.filter(s => services[s.key]).length} / ${AUTO_SERVICES.length}`}>
                <Control items={AUTO_SERVICES.map(s => ({ label: s.label, tiene: !!services[s.key] }))} acento={acento} />
              </Plegable>
            )}

            {p.description && (
              <Bloque acento={acento} codigo="04 // NOTAS" titulo="Descripción">
                <div className="product-rte" dangerouslySetInnerHTML={{ __html: descripcionLegible(p.description, VACIO) }}
                  style={{ fontSize: 15, lineHeight: 1.85, color: "rgba(232,236,246,0.72)", maxWidth: 760, overflowWrap: "anywhere" }} />
              </Bloque>
            )}

            {p.reelUrls && p.reelUrls.length > 0 && (
              <Bloque acento={acento} codigo="05 // VIDEO" titulo="Miralo andar">
                <StoreProductReels reelUrls={p.reelUrls} tapa={p.images[0]} theme={{ accent: acento, text: TENUE, border: LINEA, radius: 14 }} />
              </Bloque>
            )}

            {/* La tasación, para ESTE vehículo: "lo pago con mi usado". */}
            <Bloque acento={acento} codigo="06 // TU USADO" titulo="¿Lo pagás con tu usado?">
              <div style={{ maxWidth: 760 }}>
                <TasacionVehiculo key={p.id} storeId={storeId ?? undefined} accent={acento} producto={{ id: p.id, name: p.name }} isOwner={isOwner} isPreview={isPreview} oscuro />
              </div>
            </Bloque>
          </div>

          {/* ── La consola: consultar, siempre a la vista en la compu ── */}
          <aside id="fv-consulta" aria-label="Consultar" className="fv-consola" style={{ scrollMarginTop: 90 }}>
            <div className="fv-consola-in" style={{ marginTop: 30, padding: "clamp(18px,2.4vw,24px)", borderRadius: 22,
              background: `linear-gradient(160deg, ${conAlfa(acento, 0.16)}, #0a0e19 55%)`, border: `1px solid ${conAlfa(acento, 0.35)}` }}>
              <p style={{ margin: "0 0 4px", fontFamily: MONO, fontSize: 10.5, letterSpacing: 2.5, color: acento }}>{"// CONSULTA"}</p>
              <p style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: -0.4 }}>¿Te interesa?</p>
              {esReservado(p) && (
                <p role="note" style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.45, color: "#fde68a", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.35)", borderRadius: 10, padding: "9px 12px" }}>
                  <strong>Está reservado.</strong> Podés consultar igual: si la reserva se cae, sos el primero en enterarte.
                </p>
              )}
              <ConsultaVehiculo product={p} accent={acento} precioTexto={precio} whatsappNumber={whatsapp ?? ""} whatsappEnabled={!!whatsapp}
                storeId={storeId ?? undefined} isOwner={isOwner} isPreview={isPreview} año={anio} oscuro />
              {/* La ficha técnica para llevarse, al lado de consultar como en Motor y Drive
                  (13/10/26: abajo de los plegables no la encontraba nadie). En el editor se
                  ve pero no baja: los vehículos de muestra no existen y el PDF daría 404. */}
              {tipoFicha && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${LINEA}` }}>
                  <p style={{ margin: "0 0 10px", fontFamily: MONO, fontSize: 10.5, letterSpacing: 2.5, color: acento }}>{"// FICHA TÉCNICA"}</p>
                  <div style={{ display: "grid", gap: 8 }}>
                    {isPreview ? (
                      <>
                        <span aria-disabled="true" style={{ ...botonLinea, opacity: 0.55, cursor: "default" }}><IconoPdf /> Descargar ficha (PDF)</span>
                        <span style={{ fontSize: 12, color: TENUE }}>En la tienda publicada se descarga con los datos de cada vehículo.</span>
                      </>
                    ) : (
                      <>
                        <a href={urlFichaPdf(p.id, true)} download style={botonLinea}><IconoPdf /> Descargar ficha (PDF)</a>
                        <a href={urlFichaPdf(p.id)} target="_blank" rel="noopener" style={botonLinea}>Ver la ficha en PDF</a>
                        {ficha?.folleto && <a href={ficha.folleto.url} target="_blank" rel="noopener noreferrer" style={botonLinea}><IconoPdf /> Folleto de la concesionaria</a>}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        {similares.length > 0 && (
          <Bloque acento={acento} codigo="// MÁS EN EL SHOWROOM" titulo="También te pueden interesar">
            <div className="fv-similares" data-ef="grilla">
              {similares.map((s: StorefrontProduct) => (
                <Link key={s.id} href={aVehiculo(s.id)} className="fv-sim"
                  style={{ display: "block", borderRadius: 18, overflow: "hidden", textDecoration: "none", color: "#fff", background: "#0a0e19", border: `1px solid ${LINEA}` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda */}
                  <img src={fotoLiviana(s.images[0] ?? FOTO_VACIA, 640)} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover", display: "block", background: "#000" }} />
                  <span style={{ display: "block", padding: "12px 14px 14px" }}>
                    <span style={{ display: "block", fontWeight: 700, fontSize: 15, overflowWrap: "anywhere" }}>{s.name}</span>
                    <span style={{ display: "block", marginTop: 4, fontFamily: MONO, fontSize: 12, color: TENUE }}>{[attr(s, "Año"), usoDe(s)].filter(Boolean).join("  ·  ")}</span>
                    <span style={{ display: "block", marginTop: 6, fontWeight: 800, color: acento }}>{s.price > 0 ? fmtPrice(s.price, monedaDe(s, currency)) : "Consultar"}</span>
                  </span>
                </Link>
              ))}
            </div>
          </Bloque>
        )}
      </main>

      <PieDeAutos slug={slug} storeName={storeName} descripcion={fraseDelPie} whatsapp={whatsapp} redes={socialLinks} products={products ?? []}
        legales={legales} enEditor={isPreview} acento={acento} estilo="volt"
        onVerVehiculos={isPreview ? () => router.push("/dashboard/configuracion") : undefined}
        colores={{ fondo: footerBg ?? "#03040a", tinta: "#ffffff", suave: "rgba(232,236,246,0.62)", linea: "rgba(255,255,255,0.1)" }} />

      {/* ── La barra fija: el precio y la consulta, siempre a mano ── */}
      <div aria-hidden={!verBarra} inert={!verBarra} style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: CAPAS.panel, padding: "0 clamp(8px,2vw,20px) 10px", pointerEvents: "none",
        transform: verBarra ? "none" : "translateY(130%)", transition: "transform .35s cubic-bezier(.2,.8,.2,1)" }}>
        <div style={{ pointerEvents: verBarra ? "auto" : "none", maxWidth: 1240, margin: "0 auto", display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 8px 16px", borderRadius: 18,
          background: "rgba(8,11,21,0.86)", backdropFilter: "blur(16px)", border: `1px solid ${conAlfa(acento, 0.35)}`, boxShadow: `0 -10px 40px -20px ${conAlfa(acento, 0.6)}` }}>
          <div className="fv-barra-precio" style={{ flex: 1 }}>
            <p className="fv-barra-txt" style={{ margin: 0, fontSize: 12, color: TENUE, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{precio}</p>
          </div>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Consultar por WhatsApp"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 46, padding: "0 16px", borderRadius: 12, background: "#25d366", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
              <WaIcon size={17} /><span className="fv-barra-txt">WhatsApp</span>
            </a>
          )}
          <button type="button" onClick={irAConsulta}
            style={{ minHeight: 46, padding: "0 16px", borderRadius: 12, border: "none", background: acento, color: sobreAcento, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
            Consultar
          </button>
        </div>
      </div>

      {fav.aviso && (
        <div role="status" style={{ position: "fixed", left: 16, right: 16, bottom: 90, zIndex: 230, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12, maxWidth: 440, background: "#0a0e19", border: `1px solid ${conAlfa(acento, 0.35)}`, color: "#fff",
            borderRadius: 14, padding: "12px 12px 12px 16px", boxShadow: "0 14px 40px rgba(0,0,0,0.6)", fontSize: 13, lineHeight: 1.45 }}>
            <span style={{ flex: 1, overflowWrap: "anywhere" }}>{fav.aviso}</span>
            <button type="button" onClick={fav.cerrarAviso} aria-label="Cerrar aviso" style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
          </div>
        </div>
      )}

      {ampliada && <FotoAmpliada fotos={fotos} inicial={foto} nombre={p.name} onClose={cerrarAmpliada} />}
    </div>
  );
}
