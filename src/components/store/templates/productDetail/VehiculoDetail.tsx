"use client";
/**
 * La página de un vehículo (07/10/26). Antes se veía en una ventana arriba de la
 * portada; el dueño: "no me gusta que sean modales". Ahora cada vehículo tiene
 * su dirección (`/tienda/<slug>/producto/<id>`): se comparte por WhatsApp, la
 * encuentra Google y "atrás" vuelve a donde estaba.
 *
 * Una sola lógica para los templates de autos, con el vestido de cada uno
 * (`tema`): oscura en Auto Motor, clara en Auto Drive. Las piezas de adentro
 * son las de siempre (consulta, ficha, tasación; ver components/store/auto).
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { ProductDetailViewProps } from "./shared";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import { useCerrarConAtras } from "@/hooks/useCerrarConAtras";
import { useFavoritosVehiculos } from "@/hooks/useFavoritosVehiculos";
import StoreProductReels from "@/components/store/ProductReels";
import ConsultaVehiculo from "@/components/store/auto/ConsultaVehiculo";
import TasacionVehiculo from "@/components/store/auto/TasacionVehiculo";
import { DescargasDeFicha, HojaDeFicha } from "@/components/store/auto/FichaDelVehiculo";
import { attr, fmtPrice, esReservado, vehicleLocation, datosDelVehiculo, VehicleCard, AM_MODAL_CSS, AUTO_SERVICES } from "@/components/store/auto/AutoVehicleShared";
import { TarjetaMotor, MOTOR_TARJETA_CSS, usoDe } from "@/components/store/templates/motor/TarjetaMotor";
import { monedaDe } from "@/lib/monedaVehiculo";
import { NOMBRE_TIPO, type CategoriaVehiculo } from "@/lib/fichaVehiculo";
import { linkAVehiculo, linkAVehiculos } from "@/lib/filtroVehiculos";
import { descripcionLegible } from "@/lib/descripcionLegible";
import { CAPAS } from "@/lib/capas-tienda";
import PieDeAutos from "@/components/store/auto/PieDeAutos";

type Tema = "oscuro" | "claro";

const COLORES: Record<Tema, { fondo: string; superficie: string; linea: string; tinta: string; suave: string; barra: string }> = {
  oscuro: { fondo: "#0b0c0e", superficie: "#141619", linea: "rgba(255,255,255,0.09)", tinta: "#f4f4f5", suave: "rgba(255,255,255,0.6)", barra: "rgba(11,12,14,0.9)" },
  claro: { fondo: "#f5f6f8", superficie: "#ffffff", linea: "#e5e7eb", tinta: "#111827", suave: "#6b7280", barra: "rgba(255,255,255,0.92)" },
};

/* La lupa sólo con mouse: en un celular no hay "pasar por arriba", y el
   primer toque abriría la lupa en vez de la foto grande. */
const CON_MOUSE = "(hover: hover) and (pointer: fine)";
const escucharMouse = (f: () => void) => { const m = window.matchMedia(CON_MOUSE); m.addEventListener("change", f); return () => m.removeEventListener("change", f); };

const FOTO_VACIA = "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=80";

/** Lo parecido: misma marca, después mismo tipo, después el resto. Nunca el mismo. */
function parecidos(p: StorefrontProduct, todos: StorefrontProduct[]): StorefrontProduct[] {
  const otros = todos.filter(x => x.id !== p.id);
  const marca = attr(p, "Marca").toLowerCase().trim();
  const mismaMarca = marca ? otros.filter(x => attr(x, "Marca").toLowerCase().trim() === marca) : [];
  const mismoTipo = otros.filter(x => x.category === p.category && !mismaMarca.includes(x));
  const resto = otros.filter(x => !mismaMarca.includes(x) && !mismoTipo.includes(x));
  return [...mismaMarca, ...mismoTipo, ...resto].slice(0, 4);
}

/** La foto ampliada. Escape o "atrás" la cierran; las flechas pasan de foto. */
function FotoAmpliada({ fotos, inicial, nombre, onClose }: { fotos: string[]; inicial: number; nombre: string; onClose: () => void }) {
  const [i, setI] = useState(inicial);
  useCerrarConAtras(onClose);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cerrarRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setI(x => (x - 1 + fotos.length) % fotos.length);
      if (e.key === "ArrowRight") setI(x => (x + 1) % fotos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [fotos.length, onClose]);
  const swipe = useTouchSwipe(() => setI(x => (x + 1) % fotos.length), () => setI(x => (x - 1 + fotos.length) % fotos.length));
  const flecha = (lado: "izq" | "der") => (
    <button type="button" aria-label={lado === "izq" ? "Foto anterior" : "Foto siguiente"}
      onClick={e => { e.stopPropagation(); setI(x => lado === "izq" ? (x - 1 + fotos.length) % fotos.length : (x + 1) % fotos.length); }}
      style={{ position: "absolute", [lado === "izq" ? "left" : "right"]: 12, top: "50%", transform: "translateY(-50%)", width: 48, height: 48,
        borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.14)", color: "#fff", cursor: "pointer", fontSize: 22 }}>
      {lado === "izq" ? "‹" : "›"}
    </button>
  );
  return (
    <div role="dialog" aria-modal="true" aria-label={`Fotos de ${nombre}`} onClick={onClose} {...swipe}
      style={{ position: "fixed", inset: 0, zIndex: CAPAS.pantallaCompleta, background: "rgba(0,0,0,0.96)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda */}
      <img src={fotos[i]} alt={`${nombre}, foto ${i + 1} de ${fotos.length}`} onClick={e => e.stopPropagation()}
        style={{ maxWidth: "100vw", maxHeight: "100vh", objectFit: "contain", touchAction: "pinch-zoom" }} />
      {fotos.length > 1 && <>{flecha("izq")}{flecha("der")}</>}
      <span style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.75)", fontSize: 13 }}>
        {i + 1} / {fotos.length}
      </span>
      <button ref={cerrarRef} type="button" onClick={onClose} aria-label="Cerrar las fotos"
        style={{ position: "absolute", top: 14, right: 14, width: 44, height: 44, borderRadius: "50%", border: "none",
          background: "rgba(255,255,255,0.14)", color: "#fff", fontSize: 22, cursor: "pointer" }}>×</button>
    </div>
  );
}

function VehiculoDetail({ view, tema }: { view: ProductDetailViewProps; tema: Tema }) {
  const { slug, storeName, currency, whatsapp, product: p, products, isPreview, isOwner, legales, accentOverride, storeId, socialLinks, footerBg, fraseDelPie } = view;
  const c = COLORES[tema];
  const acento = accentOverride ?? (tema === "oscuro" ? "#e8a020" : "#2563eb");
  const fotos = p.images.length ? p.images : [FOTO_VACIA];
  const [foto, setFoto] = useState(0);
  const [ampliada, setAmpliada] = useState(false);
  /* La lupa (08/10/26): con el mouse arriba, la foto se agranda en el lugar y
     sigue al puntero. La tenía la ventana vieja del vehículo y se perdió al
     pasar a página. Un clic sigue abriendo la foto grande. */
  const conMouse = useSyncExternalStore(escucharMouse, () => window.matchMedia(CON_MOUSE).matches, () => false);
  const [lupa, setLupa] = useState<{ x: number; y: number } | null>(null);
  const miniaturas = useRef<HTMLDivElement>(null);
  const cerrarAmpliada = useCallback(() => setAmpliada(false), []);
  // Otro vehículo (desde "parecidos"): vuelve a la primera foto.
  const [mostrado, setMostrado] = useState(p.id);
  if (mostrado !== p.id) { setMostrado(p.id); setFoto(0); setAmpliada(false); setLupa(null); }
  // La miniatura de la foto que se ve, siempre a la vista (en el celular las miniaturas se deslizan).
  useEffect(() => {
    const fila = miniaturas.current;
    const m = fila?.children[foto] as HTMLElement | undefined;
    if (!fila || !m || fila.scrollWidth <= fila.clientWidth) return;
    const izq = m.offsetLeft - fila.offsetLeft;
    if (izq < fila.scrollLeft || izq + m.offsetWidth > fila.scrollLeft + fila.clientWidth) {
      fila.scrollTo({ left: izq - (fila.clientWidth - m.offsetWidth) / 2, behavior: "smooth" });
    }
  }, [foto]);
  const pasarFoto = (n: number) => { setFoto(n); setLupa(null); };
  const swipe = useTouchSwipe(() => setFoto(i => (i + 1) % fotos.length), () => setFoto(i => (i - 1 + fotos.length) % fotos.length));
  const fav = useFavoritosVehiculos(isPreview);
  const [copiado, setCopiado] = useState(false);

  const moneda = monedaDe(p, currency);
  const precio = p.price > 0 ? fmtPrice(p.price, moneda) : "Consultar precio";
  const oferta = !!p.comparePrice && p.comparePrice > p.price;
  const anio = attr(p, "Año");
  const tipo = NOMBRE_TIPO[(p.category ?? "").toLowerCase() as CategoriaVehiculo];
  const datos = datosDelVehiculo(p);
  const rapidos = [anio, usoDe(p), attr(p, "Transmisión"), attr(p, "Combustible")].filter(Boolean);
  const lugar = vehicleLocation(p);
  const similares = useMemo(() => parecidos(p, products ?? []), [p, products]);
  // El historial de services (atributo "Servicios": { aceite: true, … }).
  const services = useMemo(() => {
    try { const j = JSON.parse(attr(p, "Servicios") || "{}"); return j && typeof j === "object" ? j as Record<string, boolean> : {}; } catch { return {}; }
  }, [p]);
  const hayServices = Object.keys(services).length > 0;
  const inicio = `/tienda/${slug}${isPreview ? "?from=editor" : ""}`;
  const catalogo = linkAVehiculos(slug, {}, isPreview);

  const compartir = async () => {
    const url = window.location.href.split("?")[0];
    try {
      if (navigator.share) { await navigator.share({ title: p.name, text: `${p.name} — ${precio}`, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch { /* lo canceló */ }
  };

  const tituloBloque = (t: string) => (
    <h2 style={{ margin: "0 0 18px", display: "flex", alignItems: "center", gap: 12, fontSize: 12, fontWeight: 800,
      letterSpacing: 2.5, textTransform: "uppercase", color: c.tinta }}>
      <span aria-hidden="true" style={{ width: 24, height: 2, background: acento }} />{t}
    </h2>
  );

  return (
    <div style={{ background: c.fondo, color: c.tinta, minHeight: "100vh", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <style>{`
        ${AM_MODAL_CSS}
        ${MOTOR_TARJETA_CSS}
        /* Debajo de las fotos va lo que se lee (descripción, services, tasación):
           antes la columna de la consulta era más alta que la galería y quedaba
           un hueco blanco al lado. En el celular, eso va después del precio. */
        .vd-grilla { display:grid; grid-template-columns:minmax(0,1fr); grid-template-areas:"galeria" "compra" "extra"; gap:24px }
        .vd-galeria { grid-area:galeria } .vd-compra { grid-area:compra } .vd-extra { grid-area:extra; min-width:0 }
        @media(min-width:980px){
          .vd-grilla { grid-template-columns:minmax(0,1.55fr) minmax(0,1fr); grid-template-rows:auto 1fr; grid-template-areas:"galeria compra" "extra compra"; gap:0 40px }
          .vd-extra { padding-top:8px }
          .vd-compra { position:sticky; top:84px }
        }
        .vd-extra > section:first-child { margin-top:16px !important }
        .vd-miniaturas { display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; padding:2px; scroll-behavior:smooth }
        .vd-miniaturas::-webkit-scrollbar { display:none }
        /* En la compu, todas las miniaturas a la vista: bajan de renglón en vez de esconderse. */
        @media(min-width:980px){ .vd-miniaturas { flex-wrap:wrap; overflow:visible } }
        .vd-similares { display:grid; gap:12px; grid-template-columns:repeat(2,minmax(0,1fr)) }
        @media(min-width:900px){ .vd-similares { grid-template-columns:repeat(4,minmax(0,1fr)) } }
        @media(max-width:559px){ .vd-similares { grid-template-columns:minmax(0,1fr) } }
        .vd-link:hover { color:${acento} !important }
        .vd-solo-ancho { display:none }
        @media(min-width:640px){ .vd-solo-ancho { display:inline } }
      `}</style>

      {/* ── Barra: volver, la tienda y el catálogo ── */}
      <header style={{ position: "sticky", top: 0, zIndex: CAPAS.encabezadoListado, background: c.barra, backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${c.linea}` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 clamp(12px,4vw,32px)", height: 60, display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={catalogo} className="vd-link" aria-label="Volver a los vehículos"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, minWidth: 44, color: c.suave, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            <span aria-hidden="true" style={{ fontSize: 18 }}>←</span><span className="vd-solo-ancho" aria-hidden="true">Vehículos</span>
          </Link>
          <Link href={inicio} style={{ flex: 1, minWidth: 0, textAlign: "center", color: c.tinta, textDecoration: "none", fontWeight: 900,
            fontSize: 14, letterSpacing: 2.5, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {storeName}
          </Link>
          <button type="button" onClick={() => fav.alternar(p.id)} aria-pressed={fav.esFavorito(p.id)}
            aria-label={fav.esFavorito(p.id) ? "Sacar de favoritos" : "Guardar en favoritos"}
            style={{ width: 44, height: 44, borderRadius: "50%", border: `1px solid ${c.linea}`, background: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill={fav.esFavorito(p.id) ? acento : "none"} stroke={fav.esFavorito(p.id) ? acento : c.tinta} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(16px,3vw,32px) clamp(12px,4vw,32px) 56px" }}>
        {/* Migas: de dónde viene este vehículo. */}
        <nav aria-label="Estás en" style={{ fontSize: 12, color: c.suave, marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={inicio} className="vd-link" style={{ color: c.suave, textDecoration: "none" }}>Inicio</Link>
          <span aria-hidden="true">/</span>
          <Link href={catalogo} className="vd-link" style={{ color: c.suave, textDecoration: "none" }}>Vehículos</Link>
          {tipo && <><span aria-hidden="true">/</span>
            <Link href={linkAVehiculos(slug, { tipo: (p.category ?? "").toLowerCase() }, isPreview)} className="vd-link" style={{ color: c.suave, textDecoration: "none" }}>{tipo.varios}</Link></>}
        </nav>

        <div className="vd-grilla">
          {/* ── Galería ── */}
          <section aria-label="Fotos" className="vd-galeria" style={{ minWidth: 0 }}>
            <div {...swipe} style={{ position: "relative", aspectRatio: "16/10", background: tema === "oscuro" ? "#000" : "#e9ebef", borderRadius: 4, overflow: "hidden" }}>
              <button type="button" onClick={() => { setLupa(null); setAmpliada(true); }} aria-label={`Ampliar foto ${foto + 1} de ${fotos.length}`}
                onMouseMove={e => {
                  if (!conMouse) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  setLupa({ x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) });
                }}
                onMouseLeave={() => setLupa(null)}
                style={{ all: "unset", cursor: "zoom-in", position: "absolute", inset: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda */}
                <img src={fotos[foto]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                  onError={e => { (e.currentTarget as HTMLImageElement).src = FOTO_VACIA; }} />
                {lupa && (
                  <span aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundColor: tema === "oscuro" ? "#000" : "#e9ebef",
                    backgroundImage: `url("${fotos[foto].replace(/"/g, "%22")}")`, backgroundRepeat: "no-repeat", backgroundSize: "250%",
                    backgroundPosition: `${lupa.x * 100}% ${lupa.y * 100}%` }} />
                )}
              </button>
              {esReservado(p) && (
                <span style={{ position: "absolute", top: 14, left: 14, background: "#f59e0b", color: "#111", fontSize: 11, fontWeight: 800,
                  letterSpacing: 1.2, textTransform: "uppercase", padding: "5px 10px", borderRadius: 2 }}>Reservado</span>
              )}
              {fotos.length > 1 && (
                <>
                  {(["izq", "der"] as const).map(lado => (
                    <button key={lado} type="button" aria-label={lado === "izq" ? "Foto anterior" : "Foto siguiente"}
                      onClick={() => pasarFoto(lado === "izq" ? (foto - 1 + fotos.length) % fotos.length : (foto + 1) % fotos.length)}
                      style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", [lado === "izq" ? "left" : "right"]: 10,
                        width: 44, height: 44, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.5)", color: "#fff",
                        fontSize: 22, cursor: "pointer", backdropFilter: "blur(6px)" }}>
                      {lado === "izq" ? "‹" : "›"}
                    </button>
                  ))}
                  <span aria-hidden="true" style={{ position: "absolute", right: 12, bottom: 12, background: "rgba(0,0,0,0.6)", color: "#fff",
                    fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 2 }}>{foto + 1} / {fotos.length}</span>
                </>
              )}
            </div>
            {fotos.length > 1 && (
              <div ref={miniaturas} className="vd-miniaturas" style={{ marginTop: 10 }}>
                {fotos.map((f, i) => (
                  <button key={i} type="button" onClick={() => pasarFoto(i)} aria-label={`Ver foto ${i + 1}`} aria-current={i === foto}
                    style={{ flexShrink: 0, width: 92, height: 62, padding: 0, borderRadius: 3, overflow: "hidden", cursor: "pointer",
                      border: "none", outline: i === foto ? `2px solid ${acento}` : `1px solid ${c.linea}`, outlineOffset: i === foto ? 1 : 0,
                      opacity: i === foto ? 1 : 0.6, background: c.superficie }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda */}
                    <img src={f} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ── Compra: lo que decide la consulta, siempre a la vista ── */}
          <aside aria-label="Precio y consulta" className="vd-compra" style={{ alignSelf: "start" }}>
            <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: acento }}>
              {[tipo?.uno, attr(p, "Condición")].filter(Boolean).join(" · ") || "Vehículo"}
            </p>
            <h1 style={{ margin: "0 0 14px", fontSize: "clamp(26px,3.4vw,40px)", fontWeight: 800, letterSpacing: -1, lineHeight: 1.05, overflowWrap: "anywhere" }}>
              {p.name}
            </h1>
            {rapidos.length > 0 && (
              <ul style={{ listStyle: "none", margin: "0 0 20px", padding: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {rapidos.map(d => (
                  <li key={d} style={{ fontSize: 13, fontWeight: 600, padding: "6px 12px", borderRadius: 2, border: `1px solid ${c.linea}`, background: c.superficie }}>{d}</li>
                ))}
              </ul>
            )}
            <div style={{ background: "#fff", color: "#1a2744", borderRadius: 6, padding: "clamp(16px,2.4vw,24px)",
              border: tema === "claro" ? `1px solid ${c.linea}` : "none", display: "flex", flexDirection: "column", gap: 12,
              boxShadow: tema === "claro" ? "0 1px 2px rgba(16,24,40,0.04), 0 10px 30px rgba(16,24,40,0.06)" : "none" }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#7a8494" }}>Precio</p>
                {oferta && <p style={{ margin: 0, fontSize: 14, color: "#9aa3b2", textDecoration: "line-through" }}>{fmtPrice(p.comparePrice!, moneda)}</p>}
                <p style={{ margin: 0, fontSize: "clamp(28px,3vw,36px)", fontWeight: 800, letterSpacing: -1, lineHeight: 1.1 }}>{precio}</p>
              </div>
              {esReservado(p) && (
                <p role="note" style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "9px 12px" }}>
                  <strong>Está reservado.</strong> Podés consultar igual: si la reserva se cae, sos el primero en enterarte.
                </p>
              )}
              <ConsultaVehiculo product={p} accent={acento} precioTexto={precio}
                whatsappNumber={whatsapp ?? ""} whatsappEnabled={!!whatsapp}
                storeId={storeId ?? undefined} isOwner={isOwner} isPreview={isPreview} año={anio} />
              <DescargasDeFicha product={p} accent={acento} isPreview={isPreview} />
              <button type="button" onClick={compartir}
                style={{ minHeight: 40, borderRadius: 6, border: "1px solid #dfe3ea", background: "#fff", color: "#1a2744", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                {copiado ? "¡Link copiado!" : "Compartir este vehículo"}
              </button>
              {lugar && <p style={{ margin: 0, fontSize: 12, color: "#7a8494" }}>Ubicación: {lugar}</p>}
            </div>
          </aside>

          {/* ── Debajo de las fotos: lo que se lee ── */}
          <div className="vd-extra">
            {hayServices && (
              <section style={{ marginTop: 32 }}>
                {tituloBloque("Historial de servicios")}
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "10px 18px", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", maxWidth: 760 }}>
                  {AUTO_SERVICES.map(svc => (
                    <li key={svc.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: services[svc.key] ? c.tinta : c.suave }}>
                      <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 800, background: services[svc.key] ? "#22c55e" : c.linea, color: services[svc.key] ? "#fff" : c.suave }}>
                        {services[svc.key] ? "✓" : "–"}
                      </span>
                      {svc.label}
                      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{services[svc.key] ? ": hecho" : ": no informado"}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {p.description && (
              <section style={{ marginTop: 32 }}>
                {tituloBloque("Descripción")}
                <div className="product-rte" dangerouslySetInnerHTML={{ __html: descripcionLegible(p.description, c.fondo) }}
                  style={{ fontSize: 15, lineHeight: 1.85, color: c.suave, maxWidth: 760, overflowWrap: "anywhere" }} />
              </section>
            )}

            {/* La tasación, pensada para ESTE vehículo: "lo pago con mi usado". */}
            <section style={{ marginTop: 40, maxWidth: 760 }}>
              {tituloBloque("¿Lo pagás con tu usado?")}
              <div>
                <TasacionVehiculo key={p.id} storeId={storeId ?? undefined} accent={acento} producto={{ id: p.id, name: p.name }}
                  isOwner={isOwner} isPreview={isPreview} />
              </div>
            </section>

          </div>
        </div>

        {/* ── La ficha técnica, como hoja ── */}
        <div style={{ marginTop: 40 }}>
          <HojaDeFicha product={p} accent={acento} isPreview={isPreview} nombreTienda={storeName}
            datos={datos.map(d => ({ label: d.label, valor: d.value }))} />
        </div>

        {p.reelUrls && p.reelUrls.length > 0 && (
          <section style={{ marginTop: 40 }}>
            {tituloBloque("Videos")}
            <StoreProductReels reelUrls={p.reelUrls} theme={{ accent: acento, text: c.suave, border: c.linea, radius: 6 }} />
          </section>
        )}

        {similares.length > 0 && (
          <section style={{ marginTop: 56 }}>
            {tituloBloque("También te pueden interesar")}
            <div className="vd-similares">
              {similares.map(s => tema === "oscuro"
                ? <TarjetaMotor key={s.id} p={s} acento={acento} moneda={currency} href={linkAVehiculo(slug, s.id, isPreview)}
                    favorito={fav.esFavorito(s.id)} onFavorito={() => fav.alternar(s.id)} />
                : <VehicleCard key={s.id} product={s} accent={acento} currency={currency} href={linkAVehiculo(slug, s.id, isPreview)}
                    isFavorite={fav.esFavorito(s.id)} onToggleFavorite={() => fav.alternar(s.id)} />)}
            </div>
          </section>
        )}
      </main>

      {/* El mismo pie que la portada, con su fondo si la dueña lo cambió. */}
      <PieDeAutos slug={slug} storeName={storeName} descripcion={fraseDelPie} whatsapp={whatsapp} redes={socialLinks} products={products ?? []}
        legales={legales} enEditor={isPreview} acento={acento} estilo={tema === "oscuro" ? "motor" : "drive"}
        colores={tema === "oscuro" || footerBg
          ? { fondo: footerBg ?? "#070809", tinta: "#ffffff", suave: "rgba(255,255,255,0.62)", linea: "rgba(255,255,255,0.1)" }
          : { fondo: "#111827", tinta: "#ffffff", suave: "rgba(255,255,255,0.62)", linea: "rgba(255,255,255,0.12)" }} />

      {fav.aviso && (
        <div role="status" style={{ position: "fixed", left: 16, right: 16, bottom: 20, zIndex: 230, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12, maxWidth: 440, background: "#1b1d21", color: "#fff",
            borderRadius: 6, padding: "12px 12px 12px 16px", boxShadow: "0 14px 40px rgba(0,0,0,0.35)", fontSize: 13, lineHeight: 1.45 }}>
            <span style={{ flex: 1, overflowWrap: "anywhere" }}>{fav.aviso}</span>
            <button type="button" onClick={fav.cerrarAviso} aria-label="Cerrar aviso" style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 4, border: "none", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
          </div>
        </div>
      )}

      {ampliada && <FotoAmpliada fotos={fotos} inicial={foto} nombre={p.name} onClose={cerrarAmpliada} />}
    </div>
  );
}

export function VehiculoDetailOscuro({ view }: { view: ProductDetailViewProps }) {
  return <VehiculoDetail view={view} tema="oscuro" />;
}
export function VehiculoDetailClaro({ view }: { view: ProductDetailViewProps }) {
  return <VehiculoDetail view={view} tema="claro" />;
}
