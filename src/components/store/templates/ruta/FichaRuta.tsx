"use client";
/**
 * La página de una unidad en Auto Ruta: la HOJA DE TRABAJO (15/10/26).
 *
 * Elegida por Flavio entre dos. Arriba dice para qué trabajos sirve y los
 * cuatro números que decide un comprador de trabajo (año, km u horas,
 * tracción, carrocería o tamaño). Las fotos en una tira, la ficha completa en
 * tabla, y una columna fija con el precio, WhatsApp, "tomamos tu usado" y la
 * ficha en PDF. En el celular la columna va enseguida después de los números.
 *
 * La LÓGICA es la de siempre (consulta, tasación, descargas, favoritos; ver
 * components/store/auto y lib/fichaVehiculo): cambia la cara, no lo que hace.
 */
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProductDetailViewProps } from "@/components/store/templates/productDetail/shared";
import { FotoAmpliada, parecidos } from "@/components/store/templates/productDetail/VehiculoDetail";
import { FOTO_VACIA } from "@/lib/foto-vacia";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import { useFavoritosVehiculos } from "@/hooks/useFavoritosVehiculos";
import StoreProductReels from "@/components/store/ProductReels";
import ConsultaVehiculo from "@/components/store/auto/ConsultaVehiculo";
import TasacionVehiculo from "@/components/store/auto/TasacionVehiculo";
import PieDeAutos from "@/components/store/auto/PieDeAutos";
import { attr, fmtPrice, esReservado, vehicleLocation, datosDelVehiculo, AUTO_SERVICES, WaIcon } from "@/components/store/auto/AutoVehicleShared";
import { usoDe } from "@/components/store/templates/motor/TarjetaMotor";
import { monedaDe } from "@/lib/monedaVehiculo";
import { NOMBRE_TIPO, usaHoras, tipoDeFicha, leerFicha, bloquesDeFicha, controlDeFicha, urlFichaPdf, type CategoriaVehiculo } from "@/lib/fichaVehiculo";
import { linkAVehiculo, linkAVehiculos } from "@/lib/filtroVehiculos";
import { linkWhatsApp, mensajeDeVehiculo } from "@/lib/whatsappTienda";
import { descripcionLegible } from "@/lib/descripcionLegible";
import { trabajosDe, tamanoDe, NOMBRE_TRABAJO, NOMBRE_TAMANO } from "@/lib/trabajoVehiculo";
import { getContrastColor } from "@/contexts/EditContext";
import { CAPAS } from "@/lib/capas-tienda";
import { fotoLiviana } from "@/lib/foto-liviana";
import { useEfectosAlBajar } from "@/components/store/templates/shared/efectosAutos";
import { TarjetaRuta, TARJETA_RUTA_CSS } from "./TarjetaRuta";
import { FONDO, PAPEL, TINTA, TENUE, LINEA, ASFALTO, TITULAR, CUERPO, rayaDeRuta } from "./estiloRuta";

const CSS = `
  ${TARJETA_RUTA_CSS}
  .fr-cuerpo { display:grid; grid-template-columns:minmax(0,1fr); grid-template-areas:"cabeza" "fotos" "numeros" "columna" "hoja"; gap:22px }
  .fr-cabeza { grid-area:cabeza; min-width:0 } .fr-numeros { grid-area:numeros; min-width:0 } .fr-columna { grid-area:columna; min-width:0 }
  .fr-fotos { grid-area:fotos; min-width:0 } .fr-hoja { grid-area:hoja; min-width:0 }
  @media(min-width:1000px){
    .fr-cuerpo { grid-template-columns:minmax(0,1fr) 360px; grid-template-areas:"cabeza columna" "numeros columna" "fotos columna" "hoja columna"; column-gap:36px; align-items:start }
    .fr-columna-in { position:sticky; top:84px }
  }
  .fr-numeros-in { display:grid; gap:0; grid-template-columns:repeat(2,minmax(0,1fr)); border:2px solid ${TINTA}; border-radius:4px; overflow:hidden; background:${PAPEL} }
  @media(min-width:640px){ .fr-numeros-in { grid-template-columns:repeat(4,minmax(0,1fr)) } }
  .fr-num { padding:14px 16px; border-right:1px solid ${LINEA}; border-bottom:1px solid ${LINEA}; min-width:0 }
  .fr-tira { display:flex; gap:8px; overflow-x:auto; scrollbar-width:thin; padding-bottom:4px }
  .fr-mini { transition: opacity .2s }
  .fr-tabla { width:100%; border-collapse:collapse }
  .fr-tabla th, .fr-tabla td { text-align:left; padding:11px 0; border-bottom:1px dotted #c9c6bd; vertical-align:top; font-size:15px }
  .fr-tabla th { font-weight:600; color:${TENUE}; width:46%; padding-right:12px }
  .fr-tabla td { font-weight:700; color:${TINTA}; overflow-wrap:anywhere }
  .fr-control { display:grid; gap:6px 18px; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); list-style:none; margin:0; padding:0 }
  .fr-similares { display:grid; gap:14px; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)) }
  .fr-link:hover { text-decoration:underline }
  .fr-btn:focus-visible { outline:3px solid var(--fr-acento); outline-offset:2px }
  .product-rte, .product-rte * { color: inherit }
  @keyframes fr-ef { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:none } }
  .ef-listo [data-ef="sube"]:not(.ef-in) > *, .ef-listo [data-ef="grilla"]:not(.ef-in) > * { opacity:0 }
  .ef-listo [data-ef="sube"].ef-in > *, .ef-listo [data-ef="grilla"].ef-in > * { animation: fr-ef .7s cubic-bezier(.2,.7,.2,1) backwards }
  ${Array.from({ length: 8 }, (_, k) => `.ef-listo [data-ef].ef-in > :nth-child(${k + 2}) { animation-delay:${((k + 1) * 0.06).toFixed(2)}s }`).join(" ")}
  .ef-listo [data-ef].ef-ya > * { animation:none !important }
  .fr-barra { display:none }
  @media(max-width:999px){ .fr-barra { display:flex } .fr-con-barra { padding-bottom:76px } }
  @media (prefers-reduced-motion: reduce) { .fr-mini { transition:none } }
`;

const sinCambios = () => () => {};

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section data-ef="sube" style={{ marginTop: 34 }}>
      <h2 style={{ margin: "0 0 14px", paddingBottom: 10, borderBottom: `3px solid ${TINTA}`, fontFamily: TITULAR, fontSize: "clamp(20px,2.4vw,26px)", fontWeight: 700, textTransform: "uppercase", color: TINTA, letterSpacing: 0.3 }}>{titulo}</h2>
      {children}
    </section>
  );
}

function Tabla({ filas }: { filas: { label: string; valor: string }[] }) {
  return (
    <table className="fr-tabla">
      <tbody>
        {filas.map(f => (
          <tr key={f.label}><th scope="row">{f.label}</th><td>{f.valor}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

function Control({ items, acento }: { items: { label: string; tiene: boolean }[]; acento: string }) {
  return (
    <ul className="fr-control">
      {items.map(i => (
        <li key={i.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px dotted #c9c6bd`, fontSize: 14.5, color: i.tiene ? TINTA : "#9a9ea5", fontWeight: i.tiene ? 700 : 400 }}>
          <span aria-hidden="true" style={{ width: 14, height: 3, flexShrink: 0, background: i.tiene ? acento : "#d4d2cb" }} />
          <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{i.label}</span>
          <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{i.tiene ? ": sí" : ": no informado"}</span>
        </li>
      ))}
    </ul>
  );
}

function IconoPdf() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M12 18v-6" /><path d="m9 15 3 3 3-3" />
    </svg>
  );
}

export function VehiculoDetailRuta({ view }: { view: ProductDetailViewProps }) {
  const { slug, storeName, currency, whatsapp, product: p, products, isPreview, isOwner, legales, accentOverride, storeId, socialLinks, footerBg, fraseDelPie } = view;
  const acento = accentOverride ?? "#f2b705";
  const sobre = getContrastColor(acento) === "dark" ? TINTA : "#fff";
  const router = useRouter();
  const fotos = p.images.length ? p.images : [FOTO_VACIA];
  const [foto, setFoto] = useState(0);
  const [ampliada, setAmpliada] = useState(false);
  const cerrarAmpliada = useCallback(() => setAmpliada(false), []);
  // Otra unidad (desde "también te pueden servir"): vuelve a la primera foto.
  const [mostrado, setMostrado] = useState(p.id);
  if (mostrado !== p.id) { setMostrado(p.id); setFoto(0); setAmpliada(false); }
  const pasar = (d: number) => setFoto(i => (i + d + fotos.length) % fotos.length);
  const swipe = useTouchSwipe(() => pasar(1), () => pasar(-1));
  const fav = useFavoritosVehiculos(isPreview);
  useEfectosAlBajar(true);
  const [copiado, setCopiado] = useState(false);

  const moneda = monedaDe(p, currency);
  const precio = p.price > 0 ? fmtPrice(p.price, moneda) : "Consultar precio";
  const oferta = !!p.comparePrice && p.comparePrice > p.price;
  const anio = attr(p, "Año");
  const tipo = NOMBRE_TIPO[(p.category ?? "").toLowerCase() as CategoriaVehiculo];
  const lugar = vehicleLocation(p);
  const trabajos = trabajosDe(p);
  const tamano = tamanoDe(p);
  const numeros: [string, string][] = [
    ["Año", anio],
    [usaHoras(p.category) ? "Horas de uso" : "Kilómetros", usoDe(p)],
    ["Tracción", attr(p, "Tracción")],
    attr(p, "Carrocería") ? ["Carrocería", attr(p, "Carrocería")] : ["Tamaño", tamano ? NOMBRE_TAMANO[tamano].titulo : (tipo?.uno ?? "")],
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
  const link = useSyncExternalStore(sinCambios, () => `${window.location.origin}${window.location.pathname}`, () => "");
  const wa = whatsapp ? linkWhatsApp(whatsapp, mensajeDeVehiculo({ nombre: p.name, anio, precio: p.price > 0 ? precio : null, link })) : null;

  /* En el editor esta página es otra dirección: los links llevan `t=auto-ruta`
     (si no, se dibujaba con el template GUARDADO) y "volver" vuelve al editor. */
  const deEditor = isPreview ? "&t=auto-ruta" : "";
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
  const irATasar = () => document.getElementById("fr-tasar")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const icono: React.CSSProperties = { width: 42, height: 42, borderRadius: 4, border: `1.5px solid ${LINEA}`, background: PAPEL, color: TINTA,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0 };
  const botonLinea: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 46, padding: "0 16px", borderRadius: 4,
    border: `1.5px solid ${TINTA}`, background: "transparent", color: TINTA, fontSize: 14, fontWeight: 700, textDecoration: "none", cursor: "pointer", fontFamily: "inherit", width: "100%", boxSizing: "border-box" };

  return (
    <div className="fr-con-barra" style={{ background: FONDO, color: TINTA, minHeight: "100vh", fontFamily: CUERPO, ...({ "--fr-acento": acento } as React.CSSProperties) }}>
      <style>{CSS}</style>

      {/* ── Barra ── */}
      <header style={{ position: "sticky", top: 0, zIndex: CAPAS.encabezadoListado, background: PAPEL, borderBottom: `1px solid ${LINEA}` }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", height: 60, padding: "0 clamp(10px,3vw,24px)", display: "flex", alignItems: "center", gap: 10 }}>
          <Link href={volver} className="fr-btn" aria-label={isPreview ? "Volver al editor" : "Volver a la planilla"}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 42, padding: "0 10px", color: TINTA, textDecoration: "none", fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", flexShrink: 0 }}>
            <span aria-hidden="true" style={{ fontSize: 16 }}>←</span><span aria-hidden="true">{isPreview ? "Editor" : "Planilla"}</span>
          </Link>
          <Link href={inicio} style={{ flex: 1, minWidth: 0, textAlign: "center", color: TINTA, textDecoration: "none", fontFamily: TITULAR, fontWeight: 700, fontSize: 19, textTransform: "uppercase", letterSpacing: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {storeName}
          </Link>
          <button type="button" onClick={compartir} aria-label={copiado ? "Link copiado" : "Compartir esta unidad"} className="fr-btn" style={icono}>
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg>
          </button>
          <button type="button" onClick={() => fav.alternar(p.id)} aria-pressed={fav.esFavorito(p.id)} aria-label={fav.esFavorito(p.id) ? "Sacar de favoritos" : "Guardar en favoritos"} className="fr-btn"
            style={{ ...icono, background: fav.esFavorito(p.id) ? acento : PAPEL, color: fav.esFavorito(p.id) ? sobre : TINTA, borderColor: fav.esFavorito(p.id) ? acento : LINEA }}>
            <svg width={17} height={17} viewBox="0 0 24 24" fill={fav.esFavorito(p.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
        <span aria-hidden="true" style={{ display: "block", height: 3, background: rayaDeRuta(acento) }} />
      </header>
      {copiado && <p role="status" style={{ position: "fixed", top: 72, left: "50%", transform: "translateX(-50%)", zIndex: CAPAS.flotante, margin: 0, padding: "8px 14px", borderRadius: 4, background: TINTA, color: "#fff", fontSize: 13 }}>¡Link copiado!</p>}

      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "clamp(20px,3vw,36px) clamp(16px,4vw,32px) 48px" }}>
        <div className="fr-cuerpo">
          {/* ── La cabeza: para qué sirve y el nombre ── */}
          <div className="fr-cabeza">
            {trabajos.length > 0 && (
              <p style={{ margin: "0 0 12px", display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: "6px 10px", padding: "6px 12px", background: acento, color: sobre, borderRadius: 3, fontSize: 12.5, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase" }}>
                Sirve para: {trabajos.map(t => NOMBRE_TRABAJO[t].titulo).join(" · ")}
              </p>
            )}
            <p style={{ margin: "0 0 6px", fontSize: 12.5, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase", color: TENUE, overflowWrap: "anywhere" }}>
              {[tipo?.uno, attr(p, "Condición"), lugar].filter(Boolean).join("  ·  ") || "Unidad"}
            </p>
            <h1 style={{ margin: 0, fontFamily: TITULAR, fontSize: "clamp(32px,4.8vw,58px)", fontWeight: 700, lineHeight: 1, textTransform: "uppercase", color: TINTA, overflowWrap: "anywhere" }}>{p.name}</h1>
            {esReservado(p) && (
              <p role="note" style={{ margin: "14px 0 0", fontSize: 14, lineHeight: 1.45, color: "#78350f", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 4, padding: "9px 12px" }}>
                <strong>Está reservada.</strong> Podés consultar igual: si la reserva se cae, sos el primero en enterarte.
              </p>
            )}
          </div>

          {/* ── Los cuatro números ── */}
          <div className="fr-numeros">
            <dl className="fr-numeros-in" style={{ margin: 0 }}>
              {numeros.map(([k, v]) => (
                <div key={k} className="fr-num">
                  <dt style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase", color: TENUE, marginBottom: 4 }}>{k}</dt>
                  <dd style={{ margin: 0, fontFamily: TITULAR, fontSize: "clamp(20px,2.4vw,26px)", fontWeight: 700, color: v ? TINTA : "#a3a6ab", fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere", lineHeight: 1.1 }}>{v || "—"}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* ── La columna: precio y lo que se hace con él ── */}
          <aside className="fr-columna" aria-label="Precio y consulta">
            <div className="fr-columna-in" style={{ background: PAPEL, border: `2px solid ${TINTA}`, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ padding: "18px 20px", background: ASFALTO, color: "#fff" }}>
                <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 800, letterSpacing: 1.8, textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>Precio</p>
                {oferta && <p style={{ margin: 0, fontSize: 15, color: "rgba(255,255,255,0.5)", textDecoration: "line-through" }}>{fmtPrice(p.comparePrice!, moneda)}</p>}
                <p style={{ margin: 0, fontFamily: TITULAR, fontSize: "clamp(30px,3.6vw,40px)", fontWeight: 700, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}>{precio}</p>
              </div>
              {/* La consulta primero: trae el botón de WhatsApp y "que me llamen" (antes había dos de WhatsApp seguidos). */}
              <div id="fr-consulta" style={{ padding: "16px 18px 4px" }}>
                <ConsultaVehiculo product={p} accent={acento} precioTexto={precio} whatsappNumber={whatsapp ?? ""} whatsappEnabled={!!whatsapp}
                  storeId={storeId ?? undefined} isOwner={isOwner} isPreview={isPreview} año={anio} />
              </div>
              <div style={{ padding: 18, display: "grid", gap: 10 }}>
                <button type="button" onClick={irATasar} className="fr-btn" style={{ ...botonLinea, background: acento, color: sobre, borderColor: acento, fontWeight: 800 }}>
                  Tomamos tu usado
                </button>
                {tipoFicha && (isPreview ? (
                  <>
                    <span aria-disabled="true" style={{ ...botonLinea, opacity: 0.55, cursor: "default" }}><IconoPdf /> Ficha técnica (PDF)</span>
                    <span style={{ fontSize: 12, color: TENUE }}>En la tienda publicada se descarga con los datos de cada unidad.</span>
                  </>
                ) : (
                  <>
                    <a href={urlFichaPdf(p.id, true)} download className="fr-btn" style={botonLinea}><IconoPdf /> Ficha técnica (PDF)</a>
                    {ficha?.folleto && <a href={ficha.folleto.url} target="_blank" rel="noopener noreferrer" className="fr-btn" style={botonLinea}><IconoPdf /> Folleto de la marca</a>}
                  </>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Las fotos, en una tira ── */}
          <div className="fr-fotos">
            <div {...swipe} style={{ position: "relative", aspectRatio: "16/10", borderRadius: 4, overflow: "hidden", background: "#e7e5df" }}>
              <button type="button" onClick={() => setAmpliada(true)} aria-label={`Ampliar foto ${foto + 1} de ${fotos.length}`} style={{ all: "unset", cursor: "zoom-in", position: "absolute", inset: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda */}
                <img src={fotoLiviana(fotos[foto], 1600)} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: esReservado(p) ? "grayscale(.6)" : undefined }}
                  onError={e => { (e.currentTarget as HTMLImageElement).src = FOTO_VACIA; }} />
              </button>
              {fotos.length > 1 && (["izq", "der"] as const).map(lado => (
                <button key={lado} type="button" onClick={() => pasar(lado === "der" ? 1 : -1)} aria-label={lado === "der" ? "Foto siguiente" : "Foto anterior"} className="fr-btn"
                  style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", [lado === "izq" ? "left" : "right"]: 10, width: 44, height: 44, borderRadius: 4,
                    border: "none", background: "rgba(22,25,29,0.75)", color: "#fff", fontSize: 22, cursor: "pointer" }}>
                  {lado === "izq" ? "‹" : "›"}
                </button>
              ))}
              {fotos.length > 1 && (
                <span aria-hidden="true" style={{ position: "absolute", right: 10, bottom: 10, background: "rgba(22,25,29,0.75)", color: "#fff", fontSize: 12.5, fontWeight: 700, padding: "4px 9px", borderRadius: 3, fontVariantNumeric: "tabular-nums" }}>
                  {foto + 1} / {fotos.length}
                </span>
              )}
            </div>
            {fotos.length > 1 && (
              <div className="fr-tira" role="group" aria-label="Fotos" style={{ marginTop: 8 }}>
                {fotos.map((f, i) => (
                  <button key={i} type="button" className="fr-mini fr-btn" onClick={() => setFoto(i)} aria-label={`Ver foto ${i + 1}`} aria-current={i === foto}
                    style={{ flex: "0 0 auto", width: 96, height: 64, padding: 0, borderRadius: 3, overflow: "hidden", cursor: "pointer", background: "#e7e5df",
                      border: `3px solid ${i === foto ? acento : "transparent"}`, opacity: i === foto ? 1 : 0.7 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda */}
                    <img src={fotoLiviana(f, 256)} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── La hoja: la ficha completa ── */}
          <div className="fr-hoja">
            {datos.length > 0 && <Seccion titulo="Ficha completa"><Tabla filas={datos} /></Seccion>}
            {bloques && bloques.motor.length > 0 && <Seccion titulo="Motor y prestaciones"><Tabla filas={bloques.motor} /></Seccion>}
            {bloques && bloques.medidas.length > 0 && <Seccion titulo="Medidas y capacidades"><Tabla filas={bloques.medidas} /></Seccion>}
            {control && bloques && bloques.equipamiento.length > 0 && (
              <Seccion titulo={`Equipamiento (${control.equipamiento.filter(i => i.tiene).length} de ${control.equipamiento.length})`}><Control items={control.equipamiento} acento={acento} /></Seccion>
            )}
            {control && bloques && bloques.papeles.length > 0 && (
              <Seccion titulo="Papeles y condiciones"><Control items={control.papeles} acento={acento} /></Seccion>
            )}
            {hayServices && (
              <Seccion titulo="Historial de servicios"><Control items={AUTO_SERVICES.map(s => ({ label: s.label, tiene: !!services[s.key] }))} acento={acento} /></Seccion>
            )}
            {p.description && (
              <Seccion titulo="Descripción">
                <div className="product-rte" dangerouslySetInnerHTML={{ __html: descripcionLegible(p.description, FONDO) }}
                  style={{ fontSize: 15.5, lineHeight: 1.8, color: "#3a3f46", maxWidth: 760, overflowWrap: "anywhere" }} />
              </Seccion>
            )}
            {p.reelUrls && p.reelUrls.length > 0 && (
              <Seccion titulo="En video">
                <StoreProductReels reelUrls={p.reelUrls} tapa={p.images[0]} theme={{ accent: acento, text: TENUE, border: LINEA, radius: 4 }} />
              </Seccion>
            )}
            {/* La tasación, para ESTA unidad: "la pago con mi usado". */}
            <section id="fr-tasar" data-ef="sube" style={{ marginTop: 34, scrollMarginTop: 80 }}>
              <h2 style={{ margin: "0 0 14px", paddingBottom: 10, borderBottom: `3px solid ${TINTA}`, fontFamily: TITULAR, fontSize: "clamp(20px,2.4vw,26px)", fontWeight: 700, textTransform: "uppercase", color: TINTA }}>Tomamos tu usado</h2>
              <div style={{ maxWidth: 760 }}>
                <TasacionVehiculo key={p.id} storeId={storeId ?? undefined} accent={acento} producto={{ id: p.id, name: p.name }} isOwner={isOwner} isPreview={isPreview} />
              </div>
            </section>
          </div>
        </div>

        {similares.length > 0 && (
          <Seccion titulo="También te pueden servir">
            <div className="fr-similares" data-ef="grilla">
              {similares.map(s => (
                <TarjetaRuta key={s.id} p={s} acento={acento} moneda={currency} href={aVehiculo(s.id)} favorito={fav.esFavorito(s.id)} onFavorito={() => fav.alternar(s.id)} />
              ))}
            </div>
          </Seccion>
        )}
      </main>

      <PieDeAutos slug={slug} storeName={storeName} descripcion={fraseDelPie} whatsapp={whatsapp} redes={socialLinks} products={products ?? []}
        legales={legales} enEditor={isPreview} acento={acento} estilo="ruta"
        onVerVehiculos={isPreview ? () => router.push("/dashboard/configuracion") : undefined}
        colores={{ fondo: footerBg ?? ASFALTO, tinta: "#ffffff", suave: "rgba(255,255,255,0.62)", linea: "rgba(255,255,255,0.12)" }} />

      {fav.aviso && (
        <div role="status" style={{ position: "fixed", left: 16, right: 16, bottom: 90, zIndex: 230, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12, maxWidth: 440, background: TINTA, color: "#fff", borderRadius: 4, padding: "12px 12px 12px 16px", boxShadow: "0 14px 40px rgba(0,0,0,0.3)", fontSize: 13, lineHeight: 1.45 }}>
            <span style={{ flex: 1, overflowWrap: "anywhere" }}>{fav.aviso}</span>
            <button type="button" onClick={fav.cerrarAviso} aria-label="Cerrar aviso" style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 3, border: "none", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
          </div>
        </div>
      )}

      {/* En el celular la columna del precio queda arriba y se pierde al bajar: el precio y WhatsApp quedan fijos abajo. */}
      <div className="fr-barra" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: CAPAS.panel, alignItems: "center", gap: 10, padding: "10px 12px", background: PAPEL, borderTop: `3px solid ${TINTA}` }}>
        <span style={{ flex: 1, minWidth: 0, fontFamily: TITULAR, fontSize: 21, fontWeight: 700, color: TINTA, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontVariantNumeric: "tabular-nums" }}>{precio}</span>
        {wa ? (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="fr-btn" style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 46, padding: "0 16px", borderRadius: 4, background: "#25d366", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
            <WaIcon size={17} /> WhatsApp
          </a>
        ) : (
          <button type="button" onClick={() => document.getElementById("fr-consulta")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="fr-btn"
            style={{ minHeight: 46, padding: "0 16px", borderRadius: 4, border: "none", background: acento, color: sobre, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>Consultar</button>
        )}
      </div>

      {ampliada && <FotoAmpliada fotos={fotos} inicial={foto} nombre={p.name} onClose={cerrarAmpliada} />}
    </div>
  );
}
