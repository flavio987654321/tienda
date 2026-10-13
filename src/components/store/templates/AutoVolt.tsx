"use client";
/**
 * AUTO VOLT — creado el 12/10/26 (fase 3 de TEMPLATES-AUTOS.md).
 *
 * El futurista de autos: oscuro, con una escena de luz que sigue al puntero,
 * un piso de grilla en perspectiva, vidrio y datos con letra de tablero. Es uno
 * de los dos oscuros del rubro (el otro es Auto Motor); los tres restantes son
 * claros, a pedido del dueño.
 *
 * Se comparte la LÓGICA con los otros templates de autos (filtros, favoritos,
 * tasación, búsquedas, videos, novedades por mail, el pie); el aspecto es
 * propio (carpeta `volt/`). Los campos editables usan los mismos nombres que
 * Auto Motor: lo que la dueña ya escribió aparece igual si cambia de template.
 */
import { ContenidoPieAutos, FRASE_PIE } from "@/components/store/auto/PieDeAutos";
import { useEfectosAlBajar } from "@/components/store/templates/shared/efectosAutos";
import { irASeccion } from "@/components/store/templates/shared/irASeccion";
import { NewsletterForm } from "@/components/store/templates/shared/NewsletterForm";
import { SectionBlock } from "@/components/store/templates/shared/SectionBlock";
import { linkWhatsApp } from "@/lib/whatsappTienda";
import { barraMs, type ImageOverride } from "@/types/store-config";
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { usePushBell } from "@/contexts/PushBellContext";
import { useSesion } from "@/components/AuthProvider";
import { useFavoritosVehiculos } from "@/hooks/useFavoritosVehiculos";
import StoreFollowButton from "@/components/store/StoreFollowButton";
import { EditableZone, EditableImageButton, EditableSectionBg, BgDragHandle, getContrastColor, useEditContext } from "@/contexts/EditContext";
import { SelectorVehiculoFoco } from "@/components/store/auto/SelectorVehiculoFoco";
import { elegirFoco } from "@/lib/vehiculoFoco";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";
import VerifiedIconButton from "@/components/store/VerifiedIconButton";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import { WaIcon, AM_MODAL_CSS, fmtPrice } from "@/components/store/auto/AutoVehicleShared";
import { monedaDe, monedaDeTienda } from "@/lib/monedaVehiculo";
import { opcionesDeFiltro, filtrarVehiculos, filtroVacio, linkAVehiculos, linkAVehiculo } from "@/lib/filtroVehiculos";
import { CAPAS } from "@/lib/capas-tienda";
import { videosDeVehiculos } from "@/components/store/auto/videosDeVehiculos";
import { armarPreguntasAutos } from "@/lib/preguntasFrecuentes";
import { fotoLiviana } from "@/lib/foto-liviana";
import { EscenaVolt, ESCENA_VOLT_CSS, conAlfa } from "@/components/store/templates/volt/EscenaVolt";
import { TarjetaVolt, VOLT_TARJETA_CSS, MONO } from "@/components/store/templates/volt/TarjetaVolt";
import { BuscadorVolt } from "@/components/store/templates/volt/BuscadorVolt";
import { FocoVolt, FOCO_VOLT_CSS } from "@/components/store/templates/volt/FocoVolt";
import { TiposVolt, ServiciosVolt, PreguntasVolt, BLOQUES_VOLT_CSS } from "@/components/store/templates/volt/BloquesVolt";
import { VideosVolt, VIDEOS_VOLT_CSS } from "@/components/store/templates/volt/VideosVolt";

/** La paleta: casi negro azulado, una superficie apenas más clara, y el acento de la dueña. */
const VACIO = "#05070d";
const SUPERFICIE = "#080b15";
const TINTA = "#e8ecf6";
const TINTA_CLARA = "#0b1020"; // el texto cuando la dueña le pone un fondo claro a un bloque
const LINEA = "rgba(255,255,255,0.08)";

const AV_SECTION_IDS = ["av-tipos", "av-catalogo", "av-foco", "av-tasar", "av-videos", "av-stats", "av-servicios", "av-nosotros", "av-preguntas", "av-novedades", "av-contacto"];

/** El fondo de un bloque: color o foto elegidos por la dueña, y el color de letra que le corresponde. */
function fondoDe(ov: ImageOverride | undefined, color: string) {
  const conFoto = !!ov?.url;
  const claro = conFoto ? ov!.overlayType === "light" : getContrastColor(color) === "dark";
  return {
    estilo: conFoto
      ? { backgroundImage: `url(${fotoLiviana(ov!.url, 1920)})`, backgroundSize: "cover", backgroundPosition: `${ov!.posX ?? 50}% ${ov!.posY ?? 50}%` } as React.CSSProperties
      : { background: color } as React.CSSProperties,
    tinta: claro ? TINTA_CLARA : TINTA,
    tenue: claro ? "rgba(11,16,32,0.62)" : "rgba(232,236,246,0.62)",
    linea: claro ? "rgba(11,16,32,0.12)" : LINEA,
    claro,
  };
}

function Velo({ ov }: { ov: ImageOverride | undefined }) {
  if (!ov?.url || ov.overlayType === "none") return null;
  return <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
    background: ov.overlayType === "light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.5})` : `rgba(5,7,13,${ov.overlayOpacity ?? 0.6})` }} />;
}

/** El título de cada bloque: código de tablero, título grande y algo a la derecha. */
function Titulo({ acento, tinta, codigo, titulo, derecha }: { acento: string; tinta: string; codigo: React.ReactNode; titulo: React.ReactNode; derecha?: React.ReactNode }) {
  return (
    <div data-ef="titulo" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: "0 0 12px", fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: acento, display: "flex", alignItems: "center", gap: 10 }}>
          <span aria-hidden="true" className="ef-raya" style={{ width: 22, height: 1, background: acento, boxShadow: `0 0 8px ${acento}` }} />
          {codigo}
        </p>
        <h2 style={{ margin: 0, fontSize: "clamp(28px,4.4vw,50px)", fontWeight: 800, letterSpacing: -1.4, lineHeight: 1.02, color: tinta }}>{titulo}</h2>
      </div>
      {derecha}
    </div>
  );
}

export default function AutoVolt() {
  const config = useStoreConfig();
  const pushBell = usePushBell();
  const { products, loadingProducts } = useStorefront();
  const { editMode, overrides, hiddenSections, setFeaturedVehicleId } = useEditContext();
  // El menú sólo lleva a bloques que se ven; en el celular, tampoco a los ocultos ahí.
  const ocultas = config?.hiddenSections ?? hiddenSections;
  const ocultasCelu = config?.hiddenSectionsCelular ?? [];
  const menuAncho = [["Vehículos", "catálogo", "av-catalogo"], ["Tasá tu usado", "tasar", "av-tasar"], ["Nosotros", "nosotros", "av-nosotros"], ["Contacto", "contacto", "av-contacto"]].filter(([, , b]) => !ocultas.includes(b));
  const menuCelu = menuAncho.filter(([, , b]) => !ocultasCelu.includes(b));
  const isPreview = !!config?.previewFill;
  useEfectosAlBajar(!isPreview);
  const enEditor = isPreview && !config?.demoPublica;
  const isOwner = !!config?.isOwner;
  const accent = config?.colors.accent ?? "#22d3ee";
  const sobreAcento = getContrastColor(accent) === "dark" ? VACIO : "#fff";
  const currency = config?.currency ?? "ARS";
  const principal = monedaDeTienda({ currency });
  const slug = config?.slug ?? "";
  const opciones = useMemo(() => opcionesDeFiltro(products, currency), [products, currency]);
  const foco = useMemo(() => elegirFoco(products, config?.featuredVehicleId), [products, config?.featuredVehicleId]);
  const videos = useMemo(() => videosDeVehiculos(products), [products]);
  const storeName = config?.storeName ?? "AUTO VOLT";
  const whatsapp = config?.whatsapp ?? { enabled: false, number: "", message: "" };
  const waLink = whatsapp.enabled ? linkWhatsApp(whatsapp.number, whatsapp.message) : null;

  const iovr = config?.imageOverrides ?? {};
  const sc = config?.sectionColors ?? {};
  const fondo = (campo: string, def: string) => ({ ...fondoDe(iovr[`sectionbg_${campo}`], sc[campo] ?? def), ov: iovr[`sectionbg_${campo}`] });
  const fTipos = fondo("bgTipos", VACIO);
  const fCatalogo = fondo("bgCatalogo", VACIO);
  const fFoco = fondo("bgFoco", SUPERFICIE);
  const fTasar = fondo("bgTasar", VACIO);
  const fVideos = fondo("bgVideos", SUPERFICIE);
  const fStats = fondo("bgStats", VACIO);
  const fServicios = fondo("bgServicios", VACIO);
  const fNosotros = fondo("bgNosotros", SUPERFICIE);
  const fPreguntas = fondo("bgPreguntas", VACIO);
  const fNovedades = fondo("bgNovedades", VACIO);
  const fContacto = fondo("bgContacto", SUPERFICIE);
  const fPie = fondo("bgFooter", "#03040a");

  const heroOv = iovr["heroBackground"];
  const heroFoto = heroOv?.url ?? foco?.images[0] ?? "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1600&q=80";
  const nosotrosUrl = iovr["nosotrosImage"]?.url ?? "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80";

  const navBg = sc["navBg"] ?? VACIO;
  const navOscura = getContrastColor(navBg) === "light";
  const navTinta = navOscura ? "#ffffff" : TINTA_CLARA;
  const navTenue = navOscura ? "rgba(232,236,246,0.7)" : "rgba(11,16,32,0.6)";
  const navLinea = navOscura ? "rgba(255,255,255,0.12)" : "rgba(11,16,32,0.12)";

  const { cargando, logueado, nombreMostrado, panelHref, panelLabel, signOut } = useSesion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cuentaOpen, setCuentaOpen] = useState(false);
  const cuentaRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const paginaDe = (p: StorefrontProduct) => linkAVehiculo(slug, p.id, isPreview);
  const [showReport, setShowReport] = useState(false);
  const [annIdx, setAnnIdx] = useState(0);
  const [annVisible, setAnnVisible] = useState(true);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Si la dueña no escribió su barra: sólo lo que la tienda HACE, sin prometer nada que no ofrece.
  const DEFAULTS = ["Ficha técnica de cada vehículo", "Tasá tu usado online", "Te avisamos si entra lo que buscás"];
  const promoBannerEnabled = config?.promoBanner?.enabled !== false;
  const annMessages = (config?.promoBanner?.messages?.filter(m => m.trim()) ?? []).length > 0
    ? config!.promoBanner!.messages!.filter(m => m.trim())
    : DEFAULTS;
  const showAnn = promoBannerEnabled && annVisible;
  const PROMO_H = 32;
  const NAV_H = 64;
  const NAV_TOP = 10; // la barra flota: no toca los bordes
  const msBarra = barraMs(config?.promoBanner?.intervalMs);
  useEffect(() => {
    if (!showAnn || annMessages.length <= 1) return;
    const id = setInterval(() => setAnnIdx(i => (i + 1) % annMessages.length), msBarra);
    return () => clearInterval(id);
  }, [showAnn, annMessages.length, msBarra]);

  useEffect(() => {
    if (!products.length) return;
    const id = new URLSearchParams(window.location.search).get("producto");
    // Los links viejos (`?producto=`, de WhatsApp, del PDF o del panel) van a la página del vehículo.
    if (id && products.some(pr => pr.id === id)) router.replace(linkAVehiculo(slug, id, isPreview));
  }, [products, router, slug, isPreview]);

  useEffect(() => {
    const fuera = (e: MouseEvent) => { if (cuentaRef.current && !cuentaRef.current.contains(e.target as Node)) setCuentaOpen(false); };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  const fav = useFavoritosVehiculos(isPreview);
  const favorites = fav.favoritos;
  const toggleFavorite = fav.alternar;
  const favoriteProducts = products.filter(p => favorites.includes(p.id));
  const searchResults = searchQuery.trim().length > 0 ? filtrarVehiculos(products, { ...filtroVacio(), q: searchQuery }, currency) : [];

  // Escape cierra el buscador y los favoritos.
  useEffect(() => {
    if (!searchOpen && !favoritesOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (searchOpen) { setSearchOpen(false); setSearchQuery(""); } else setFavoritesOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, favoritesOpen]);

  const recientes = products.filter(p => p.id !== foco?.id || products.length <= 4).slice(0, 6);
  const todos = linkAVehiculos(slug, {}, isPreview);

  /* Telemetría: lo que se cuenta sale de los datos; lo que es del negocio (años,
     clientes) se ve sólo si la dueña lo escribió (en el editor, siempre, para
     que lo pueda completar). Nada de "200+" de fábrica. */
  const stats = [
    { fv: "stat1", fl: "statLabel1", n: String(products.length), l: "Vehículos en stock", propio: false },
    { fv: "stat4", fl: "statLabel4", n: String(opciones.marcas.length), l: "Marcas", propio: false },
    { fv: "stat2", fl: "statLabel2", n: "15", l: "Años en el mercado", propio: true },
    { fv: "stat3", fl: "statLabel3", n: "98%", l: "Clientes satisfechos", propio: true },
  ].filter(s => !!overrides[s.fv]?.text?.trim() || (s.propio ? editMode : s.n !== "0"));

  const enEdicion = editMode && isPreview;
  const iconoBoton: React.CSSProperties = { background: "none", border: "none", color: navTenue, cursor: "pointer", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, position: "relative" };
  const capa = (campo: string, etiqueta: string, ov: ImageOverride | undefined, nombreBloque?: string) => (
    <><BgDragHandle imgKey={`sectionbg_${campo}`} /><Velo ov={ov} /><EditableSectionBg field={campo} label={etiqueta} {...(nombreBloque ? { nombreBloque } : {})} /></>
  );
  const pad = "clamp(56px,8vw,96px) clamp(16px,4vw,32px)";
  const ancho: React.CSSProperties = { position: "relative", zIndex: 1, maxWidth: 1240, margin: "0 auto" };

  return (
    <div style={{ background: VACIO, color: TINTA, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", minHeight: "100vh" }}>
      <style>{`
        ${AM_MODAL_CSS}
        ${ESCENA_VOLT_CSS}
        ${VOLT_TARJETA_CSS}
        ${FOCO_VOLT_CSS}
        ${BLOQUES_VOLT_CSS}
        ${VIDEOS_VOLT_CSS}
        .av-grid { display:grid; gap:16px; grid-template-columns:minmax(0,1fr) }
        @media(min-width:600px){ .av-grid { grid-template-columns:repeat(2,minmax(0,1fr)) } }
        @media(min-width:1040px){ .av-grid { grid-template-columns:repeat(3,minmax(0,1fr)) } }
        /* El nombre: en el celular, más chico y sin espaciado, para que entre entero ("QRDREAMC / AR" se partía al medio). */
        .av-marca { font-size:13px; letter-spacing:.2px; word-break:normal; overflow-wrap:normal }
        @media(max-width:400px){ .av-marca { font-size:12px; letter-spacing:0 } .av-ico { width:34px !important } }
        @media(min-width:640px){ .av-marca { font-size:16px; letter-spacing:1px } }
        .av-links { display:none }
        .av-solo-ancho { display:none }
        @media(min-width:920px){ .av-links { display:flex } .av-burger { display:none !important } .av-solo-ancho { display:inline-flex } }
        .av-hero { display:grid; grid-template-columns:minmax(0,1fr); gap:clamp(28px,4vw,56px); align-items:center }
        @media(min-width:980px){ .av-hero { grid-template-columns:minmax(0,1.05fr) minmax(0,0.95fr) } }
        .bv-campos { grid-template-columns:minmax(0,1fr) }
        @media(min-width:640px){ .bv-campos { grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto } }
        .av-pasos { display:grid; gap:14px; grid-template-columns:minmax(0,1fr); list-style:none; margin:0; padding:0; position:relative }
        @media(min-width:900px){ .av-pasos { grid-template-columns:repeat(4,minmax(0,1fr)) } }
        .av-linea-pasos { position:absolute; left:23px; top:24px; bottom:24px; width:1px }
        @media(min-width:900px){ .av-linea-pasos { left:24px; right:24px; top:23px; bottom:auto; width:auto; height:1px } }
        .av-about { display:grid; grid-template-columns:minmax(0,1fr); gap:clamp(28px,5vw,64px); align-items:center }
        @media(min-width:880px){ .av-about { grid-template-columns:minmax(0,1fr) minmax(0,1fr) } }
        .av-faq { display:grid; grid-template-columns:minmax(0,1fr); gap:24px clamp(28px,5vw,64px) }
        @media(min-width:960px){ .av-faq { grid-template-columns:minmax(0,0.8fr) minmax(0,1.3fr); align-items:start } .av-faq-lado { position:sticky; top:110px } }
        .av-stats { display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)) }
        .av-link { transition: color .15s }
        .av-link:hover { color:${accent} !important }
        @keyframes av-spin { to { transform:rotate(360deg) } }
        @keyframes av-latido { 0%,100% { opacity:1 } 50% { opacity:.35 } }
        @keyframes av-entra { from { opacity:0; transform:translateY(22px); filter:blur(8px) } to { opacity:1; transform:none; filter:none } }
        .av-entra { animation: av-entra 1s cubic-bezier(.16,.84,.3,1) both }
        section[id] { scroll-margin-top:${(showAnn ? PROMO_H : 0) + NAV_H + NAV_TOP + 16}px }
        /* Efectos al bajar (ver shared/efectosAutos): entran desenfocados, como algo que se enfoca. */
        @keyframes av-ef { from { opacity:0; transform:translateY(28px); filter:blur(10px) } to { opacity:1; transform:none; filter:none } }
        .ef-listo [data-ef="sube"]:not(.ef-in) > *, .ef-listo [data-ef="grilla"]:not(.ef-in) > * { opacity:0 }
        .ef-listo [data-ef="sube"].ef-in > *, .ef-listo [data-ef="grilla"].ef-in > * { animation: av-ef .9s cubic-bezier(.16,.84,.3,1) backwards }
        ${[2, 3, 4, 5, 6, 7, 8].map(n => `.ef-listo [data-ef].ef-in > :nth-child(${n}) { animation-delay:${((n - 1) * 0.07).toFixed(2)}s }`).join("\n        ")}
        .ef-listo [data-ef="titulo"] .ef-raya { transform-origin:left; transition: transform .9s .2s cubic-bezier(.16,.84,.3,1) }
        .ef-listo [data-ef="titulo"]:not(.ef-in) .ef-raya { transform:scaleX(0) }
        .ef-listo [data-ef].ef-ya > *, .ef-listo [data-ef].ef-ya .ef-raya { animation:none !important; transition:none !important }
        @media (prefers-reduced-motion: reduce) { .av-entra { animation:none } .av-latido { animation:none } }
      `}</style>

      {/* ── BARRA DE AVISOS ── */}
      {showAnn && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top: 0, left: isPreview ? undefined : 0, right: isPreview ? undefined : 0,
          zIndex: isPreview ? CAPAS.previaNavAlto : 110, height: PROMO_H, background: "#03040a", borderBottom: `1px solid ${conAlfa(accent, 0.3)}`,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "0 44px", gap: 10 }}>
          <span aria-hidden="true" className="av-latido" style={{ width: 6, height: 6, borderRadius: "50%", background: accent, boxShadow: `0 0 10px ${accent}`, animation: "av-latido 1.6s ease-in-out infinite", flexShrink: 0 }} />
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(232,236,246,0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {annMessages[annIdx]}
          </span>
          <button type="button" onClick={() => setAnnVisible(false)} aria-label="Cerrar la barra de avisos"
            style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, background: "none", border: "none", color: "rgba(232,236,246,0.6)", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
      )}

      {/* ── BARRA ── flota sobre la escena, no toca los bordes. */}
      <div style={{ position: isPreview ? "sticky" : "fixed", top: (showAnn ? PROMO_H : 0) + (isPreview ? 0 : NAV_TOP), left: isPreview ? undefined : 0, right: isPreview ? undefined : 0,
        zIndex: isPreview ? CAPAS.previaNav : 100, padding: isPreview ? `${NAV_TOP}px clamp(10px,2vw,20px) 0` : "0 clamp(10px,2vw,20px)", pointerEvents: "none" }}>
        <nav aria-label="Principal" style={{ pointerEvents: "auto", maxWidth: 1240, margin: "0 auto", borderRadius: 18,
          background: navOscura ? "rgba(8,11,21,0.62)" : navBg, backdropFilter: "blur(18px) saturate(1.4)",
          border: `1px solid ${navLinea}`, boxShadow: "0 18px 50px -24px rgba(0,0,0,0.7)", padding: "0 clamp(10px,1.6vw,16px)" }}>
          <div style={{ height: NAV_H, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, color: navTinta }}>
              <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: accent, boxShadow: `0 0 14px ${accent}`, flexShrink: 0, transform: "rotate(45deg)" }} />
              <span className="av-marca" style={{ fontWeight: 800, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.15 }}>
                <EditableZone field="storeName" label="Nombre de la tienda">{storeName}</EditableZone>
              </span>
              <VerifiedIconButton isVerified={config?.isVerified} info={config?.verifiedInfo} color={navTinta} />
            </div>
            <div className="av-links" style={{ gap: 4, alignItems: "center" }}>
              {menuAncho.map(([lbl, id]) => (
                <button key={id} type="button" onClick={() => irASeccion(id)} className="av-link"
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, minHeight: 40, padding: "0 12px", borderRadius: 10, color: navTenue, fontFamily: "inherit" }}>
                  {lbl}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
              <button type="button" onClick={() => setSearchOpen(true)} aria-label="Abrir el buscador" className="av-ico" style={iconoBoton}>
                <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
              <button type="button" onClick={() => setFavoritesOpen(true)} aria-label={`Favoritos${favorites.length ? ` (${favorites.length})` : ""}`} className="av-ico" style={iconoBoton}>
                <svg width={19} height={19} viewBox="0 0 24 24" fill={favorites.length > 0 ? accent : "none"} stroke={favorites.length > 0 ? accent : "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {favorites.length > 0 && <span aria-hidden="true" style={{ position: "absolute", top: 3, right: 3, background: accent, color: sobreAcento, borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{favorites.length}</span>}
              </button>
              {pushBell && config?.showPushBell && !isPreview && <StoreFollowButton storeSlug={slug} color={navTenue} size={19} />}
              {pushBell && config?.showPushBell && !isPreview && (
                <button type="button" onClick={pushBell.openDrawer} aria-label="Novedades de la tienda" className="av-ico" style={iconoBoton}>
                  <svg width={19} height={19} viewBox="0 0 24 24" aria-hidden="true" fill={pushBell.followState === "following" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  {pushBell.hasNew && <span style={{ position: "absolute", top: 7, right: 7, width: 9, height: 9, background: "#f43f5e", borderRadius: "50%" }} />}
                </button>
              )}
              {/* Maquetas de la campanita: sólo en el editor (en la demo pública no hay tienda que configurar). */}
              {enEditor && (
                <button type="button" onClick={config?.onPreviewBellClick} aria-label="Novedades de la tienda"
                  title={config?.showPushBell ? "Los clientes pueden seguir tu tienda desde acá" : "🔒 Solo Plan Plus"}
                  style={{ ...iconoBoton, opacity: config?.showPushBell ? 1 : 0.5 }}>
                  <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  {!config?.showPushBell && <span aria-hidden="true" style={{ position: "absolute", top: 5, right: 5, width: 12, height: 12, background: "#f59e0b", borderRadius: "50%", fontSize: 8, color: "#fff", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>★</span>}
                </button>
              )}
              <div ref={cuentaRef} style={{ position: "relative" }}>
                <button type="button" onClick={() => setCuentaOpen(o => !o)} aria-label="Mi cuenta" aria-expanded={cuentaOpen} className="av-ico" style={iconoBoton}>
                  <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </button>
                {cuentaOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 14px)", right: 0, minWidth: 210, zIndex: CAPAS.flotante, background: "#0a0e19", border: `1px solid ${LINEA}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 24px 50px rgba(0,0,0,0.6)" }}>
                    {cargando ? (<p style={{ padding: "14px 16px", margin: 0, fontSize: 12, opacity: 0.6 }}>Cargando…</p>) : logueado ? (
                      <>
                        <p style={{ padding: "12px 16px 4px", fontSize: 11, color: "rgba(232,236,246,0.5)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nombreMostrado}</p>
                        <a href={panelHref} onClick={() => setCuentaOpen(false)} className="av-link" style={{ display: "block", padding: "12px 16px", fontSize: 14, color: "#fff", textDecoration: "none", borderBottom: `1px solid ${LINEA}` }}>{panelLabel}</a>
                        <button type="button" onClick={() => { if (isPreview) return; setCuentaOpen(false); signOut("/"); }}
                          style={{ display: "block", width: "100%", padding: "12px 16px", fontSize: 14, color: "#fb7185", background: "none", border: "none", textAlign: "left", cursor: isPreview ? "default" : "pointer", opacity: isPreview ? 0.45 : 1, fontFamily: "inherit" }}>Cerrar sesión</button>
                      </>
                    ) : (
                      <>
                        <a href={isPreview ? undefined : `/login?redirect=/tienda/${slug}`} onClick={() => !isPreview && setCuentaOpen(false)} className="av-link" style={{ display: "block", padding: "13px 16px", fontSize: 14, color: "#fff", textDecoration: "none", borderBottom: `1px solid ${LINEA}`, cursor: isPreview ? "default" : "pointer" }}>Iniciar sesión</a>
                        <a href={isPreview ? undefined : `/registro?plan=buyer&redirect=/tienda/${slug}`} onClick={() => !isPreview && setCuentaOpen(false)} className="av-link" style={{ display: "block", padding: "13px 16px", fontSize: 14, color: "#fff", textDecoration: "none", cursor: isPreview ? "default" : "pointer" }}>Registrarse</a>
                      </>
                    )}
                  </div>
                )}
              </div>
              <Link href={todos} className="av-solo-ancho" style={{ marginLeft: 6, background: accent, color: sobreAcento, textDecoration: "none", padding: "0 16px", minHeight: 40, alignItems: "center", fontSize: 13, fontWeight: 800, borderRadius: 10, boxShadow: `0 0 20px ${conAlfa(accent, 0.4)}` }}>
                Ver vehículos
              </Link>
              <button className="av-burger av-ico" type="button" onClick={() => setMenuOpen(m => !m)} aria-label={menuOpen ? "Cerrar el menú" : "Abrir el menú"} aria-expanded={menuOpen}
                style={{ ...iconoBoton, border: `1px solid ${navLinea}`, color: navTinta, marginLeft: 4, fontSize: 18 }}>
                {menuOpen ? "×" : "☰"}
              </button>
            </div>
          </div>
          {menuOpen && (
            <div style={{ borderTop: `1px solid ${navLinea}`, padding: "6px 0 14px" }}>
              {menuCelu.map(([lbl, id]) => (
                <button key={id} type="button" onClick={() => { irASeccion(id); setMenuOpen(false); }}
                  style={{ display: "block", width: "100%", background: "none", border: "none", color: navTinta, cursor: "pointer", textAlign: "left", minHeight: 48, fontSize: 15, fontWeight: 600, fontFamily: "inherit", borderBottom: `1px solid ${navLinea}`, padding: "0 4px" }}>
                  {lbl}
                </button>
              ))}
              <Link href={todos} onClick={() => setMenuOpen(false)} style={{ display: "flex", alignItems: "center", minHeight: 48, color: accent, fontSize: 15, fontWeight: 800, textDecoration: "none", padding: "0 4px" }}>
                Ver todos los vehículos →
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* ── PORTADA ── la escena de luz, el título, la consola de búsqueda y el vehículo. */}
      <section aria-label="Portada" style={{ position: "relative", overflow: "hidden", background: VACIO,
        paddingTop: isPreview ? 24 : (showAnn ? PROMO_H : 0) + NAV_TOP + NAV_H + 24 }}>
        <EscenaVolt acento={accent} quieta={isPreview} />
        <div className="av-hero" style={{ position: "relative", zIndex: 1, maxWidth: 1240, margin: "0 auto", padding: "clamp(28px,6vh,72px) clamp(16px,4vw,32px) clamp(56px,9vh,104px)", boxSizing: "border-box" }}>
          <div style={{ minWidth: 0 }}>
            <p className="av-entra" style={{ margin: "0 0 18px", display: "inline-flex", alignItems: "center", gap: 10, fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(232,236,246,0.8)",
              padding: "7px 12px", borderRadius: 999, border: `1px solid ${conAlfa(accent, 0.35)}`, background: conAlfa(accent, 0.08),
              maxWidth: "100%", boxSizing: "border-box", overflowWrap: "anywhere" }}>
              <span aria-hidden="true" className="av-latido" style={{ flexShrink: 0, width: 7, height: 7, borderRadius: "50%", background: accent, boxShadow: `0 0 10px ${accent}`, animation: "av-latido 1.6s ease-in-out infinite" }} />
              <span style={{ minWidth: 0 }}><EditableZone field="heroKicker" label="Etiqueta de la portada">{storeName}</EditableZone></span>
            </p>
            <h1 className="av-entra" style={{ margin: "0 0 18px", fontSize: "clamp(40px,7vw,92px)", fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 0.95, color: "#fff", animationDelay: ".08s",
              backgroundImage: `linear-gradient(180deg, #ffffff 30%, ${conAlfa(accent, 0.95)} 140%)`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              <EditableZone field="heroHeading" label="Título de la portada">Tu próximo vehículo está acá</EditableZone>
            </h1>
            <p className="av-entra" style={{ margin: "0 0 30px", fontSize: "clamp(15px,1.6vw,18px)", color: "rgba(232,236,246,0.72)", maxWidth: 540, lineHeight: 1.65, animationDelay: ".16s" }}>
              <EditableZone field="heroSubtext" label="Subtítulo de la portada">Autos, camionetas, motos y más, con la ficha técnica completa y el precio a la vista.</EditableZone>
            </p>
            <div className="av-entra" style={{ animationDelay: ".24s" }}>
              <BuscadorVolt slug={slug} productos={products} opciones={opciones} principal={principal} acento={accent} enEditor={isPreview} />
            </div>
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="av-link"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, marginTop: 14, color: "rgba(232,236,246,0.8)", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
                <WaIcon size={16} /> Hablar con un asesor
              </a>
            )}
          </div>
          {/* El vehículo: la foto de la dueña, o la del vehículo en foco, en un marco de vidrio con lecturas. */}
          <div className="av-entra" style={{ position: "relative", minWidth: 0, animationDelay: ".2s" }}>
            <div style={{ position: "relative", borderRadius: 26, padding: 1, background: `linear-gradient(140deg, ${conAlfa(accent, 0.8)}, rgba(255,255,255,0.08) 40%, ${conAlfa(accent, 0.25)})`,
              boxShadow: `0 50px 120px -50px ${conAlfa(accent, 0.9)}` }}>
              <div style={{ position: "relative", borderRadius: 25, overflow: "hidden", aspectRatio: "4/3", background: "#03040a" }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- foto elegida por la dueña o de su vehículo */}
                <img src={fotoLiviana(heroFoto, 1200)} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
                  objectPosition: `${heroOv?.posX ?? 50}% ${heroOv?.posY ?? 50}%` }} />
                <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, rgba(5,7,13,0.7), transparent 50%), linear-gradient(120deg, ${conAlfa(accent, 0.18)}, transparent 50%)` }} />
                <EditableImageButton field="heroBackground" label="Foto de la portada" />
              </div>
            </div>
            {!loadingProducts && products.length > 0 && (
              <div style={{ position: "absolute", left: "clamp(-8px,-1vw,0px)", bottom: -18, display: "flex", gap: 8, flexWrap: "wrap", paddingRight: 12 }}>
                {[[String(products.length).padStart(2, "0"), products.length === 1 ? "vehículo" : "vehículos"], ...(opciones.marcas.length > 1 ? [[String(opciones.marcas.length).padStart(2, "0"), "marcas"]] : [])].map(([n, l]) => (
                  <span key={l} style={{ display: "inline-flex", alignItems: "baseline", gap: 8, padding: "10px 14px", borderRadius: 14, background: "rgba(8,11,21,0.82)", backdropFilter: "blur(12px)",
                    border: `1px solid ${conAlfa(accent, 0.35)}`, boxShadow: "0 14px 30px -12px rgba(0,0,0,0.7)" }}>
                    <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: accent, textShadow: `0 0 14px ${conAlfa(accent, 0.6)}` }}>{n}</span>
                    <span style={{ fontSize: 12, color: "rgba(232,236,246,0.7)" }}>{l}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div style={{ display: "flex", flexDirection: "column" }}>

      {/* ── TIPOS ── */}
      <SectionBlock id="av-tipos" label="Explorá por tipo" isPreview={isPreview} defaultOrder={AV_SECTION_IDS}>
      {(opciones.tipos.length > 1 || opciones.marcas.length > 1) ? (
        <section style={{ padding: "clamp(48px,7vw,88px) clamp(16px,4vw,32px) clamp(24px,4vw,40px)", position: "relative", ...fTipos.estilo }}>
          {capa("bgTipos", "Fondo de los tipos", fTipos.ov)}
          <div data-ef="sube" style={ancho}>
            <TiposVolt opciones={opciones} slug={slug} enEditor={isPreview} acento={accent} tinta={fTipos.tinta} tenue={fTipos.tenue}
              titulo={<EditableZone field="tiposHeading" label="Título de los tipos">{opciones.tipos.length > 1 ? "Elegí qué buscás" : "Elegí la marca"}</EditableZone>} />
          </div>
        </section>
      ) : null}
      </SectionBlock>

      {/* ── RECIÉN INGRESADOS ── */}
      <SectionBlock id="av-catalogo" label="Recién ingresados" isPreview={isPreview} defaultOrder={AV_SECTION_IDS}>
      <section id="catálogo" style={{ padding: pad, position: "relative", ...fCatalogo.estilo }}>
        {capa("bgCatalogo", "Fondo de recién ingresados", fCatalogo.ov)}
        <div data-ef="sube" style={ancho}>
          <Titulo acento={accent} tinta={fCatalogo.tinta}
            codigo={<EditableZone field="catalogKicker" label="Etiqueta del catálogo">Stock en línea</EditableZone>}
            titulo={<EditableZone field="catalogHeading" label="Título del catálogo">Recién ingresados</EditableZone>}
            derecha={products.length > recientes.length ? (
              <Link href={todos} className="av-link" style={{ color: fCatalogo.tenue, fontSize: 14, fontWeight: 700, textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center" }}>
                Ver los {products.length} →
              </Link>
            ) : undefined} />
          {loadingProducts ? (
            <div role="status" aria-label="Cargando vehículos" style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ width: 36, height: 36, border: `2px solid ${accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "av-spin 0.8s linear infinite", margin: "0 auto", boxShadow: `0 0 18px ${conAlfa(accent, 0.5)}` }} />
            </div>
          ) : recientes.length > 0 ? (
            <div className="av-grid" data-ef="grilla">
              {recientes.map(p => (
                <TarjetaVolt key={p.id} p={p} acento={accent} moneda={currency} href={paginaDe(p)} favorito={favorites.includes(p.id)} onFavorito={() => toggleFavorite(p.id)} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "56px 16px", border: `1px dashed ${fCatalogo.linea}`, borderRadius: 18 }}>
              <p style={{ margin: 0, color: fCatalogo.tenue, fontSize: 15 }}>Todavía no hay vehículos publicados.</p>
            </div>
          )}
        </div>
      </section>
      </SectionBlock>

      {/* ── VEHÍCULO EN FOCO ── el escáner. */}
      <SectionBlock id="av-foco" label="Vehículo en foco" isPreview={isPreview} defaultOrder={AV_SECTION_IDS}>
      {(foco || enEdicion) ? (
        <section style={{ padding: pad, position: "relative", ...fFoco.estilo, borderTop: `1px solid ${fFoco.linea}` }}>
          {capa("bgFoco", "Fondo de la vidriera", fFoco.ov)}
          <div data-ef="sube" style={ancho}>
            {enEdicion && <div style={{ marginBottom: 16 }}>
              <SelectorVehiculoFoco productos={products} seleccionado={config?.featuredVehicleId} oscuro onChange={setFeaturedVehicleId} />
            </div>}
            {foco ? <FocoVolt p={foco} acento={accent} moneda={currency} whatsapp={whatsapp} enPrevia={isPreview} href={paginaDe(foco)}
              kicker={<EditableZone field="focoKicker" label="Etiqueta del vehículo en foco">En foco</EditableZone>} />
              : <p style={{ margin: 0, padding: 24, color: fFoco.tinta, border: `1px dashed ${fFoco.linea}`, borderRadius: 18, textAlign: "center" }}>Todavía no hay vehículos para mostrar en la vidriera.</p>}
          </div>
        </section>
      ) : null}
      </SectionBlock>

      {/* ── TASÁ TU USADO / AVISAME SI ENTRA ── */}
      <SectionBlock id="av-tasar" label="Tasá tu usado y Avisame si entra" isPreview={isPreview} defaultOrder={AV_SECTION_IDS}>
      <section id="tasar" style={{ padding: pad, position: "relative", ...fTasar.estilo }}>
        {capa("bgTasar", "Fondo de tasación", fTasar.ov)}
        <div data-ef="sube" style={ancho}>
          <Titulo acento={accent} tinta={fTasar.tinta}
            codigo={<EditableZone field="tasarKicker" label="Etiqueta de tasación">Antes de comprar</EditableZone>}
            titulo={<EditableZone field="tasarHeading" label="Título de tasación">Te ayudamos a dar el paso</EditableZone>} />
          <ServiciosVolt storeId={config?.storeId} acento={accent} isOwner={isOwner} isPreview={isPreview}
            textos={{
              tasarTitulo: <EditableZone field="tasarTitulo" label="Tasá tu usado — título">¿Tenés un usado?</EditableZone>,
              tasarTexto: <EditableZone field="tasarTexto" label="Tasá tu usado — texto">Contanos qué tenés y te respondemos con una oferta, para tomarlo en parte de pago o comprártelo.</EditableZone>,
              avisameTitulo: <EditableZone field="avisameTitulo" label="Avisame si entra — título">¿No está lo que buscás?</EditableZone>,
              avisameTexto: <EditableZone field="avisameTexto" label="Avisame si entra — texto">Dejanos marca, modelo y hasta cuánto querés gastar. Cuando entre, te escribimos primero.</EditableZone>,
            }} />
        </div>
      </section>
      </SectionBlock>

      {/* ── VIDEOS ── los que la agencia subió en sus vehículos. */}
      <SectionBlock id="av-videos" label="Videos" isPreview={isPreview} defaultOrder={AV_SECTION_IDS}>
      {(videos.length > 0 || enEditor) ? (
        <section style={{ padding: pad, position: "relative", ...fVideos.estilo, borderTop: `1px solid ${fVideos.linea}` }}>
          {capa("bgVideos", "Fondo de videos", fVideos.ov)}
          <div data-ef="sube" style={ancho}>
            <Titulo acento={accent} tinta={fVideos.tinta}
              codigo={<EditableZone field="videosKicker" label="Etiqueta de videos">En video</EditableZone>}
              titulo={<EditableZone field="videosHeading" label="Título de videos">Miralos andar</EditableZone>} />
            <VideosVolt videos={videos} acento={accent} moneda={currency} tinta={fVideos.tinta} hrefDe={id => linkAVehiculo(slug, id, isPreview)}
              vacio={<p style={{ margin: 0, padding: "24px 20px", border: `1px dashed ${fVideos.linea}`, borderRadius: 18, color: fVideos.tenue, fontSize: 14, lineHeight: 1.6 }}>
                Acá aparecen los videos que subas en cada vehículo (en Productos → el vehículo → Videos). Cada uno lleva a su vehículo. Mientras no haya ninguno, este bloque no se muestra en la tienda.
              </p>} />
          </div>
        </section>
      ) : null}
      </SectionBlock>

      {/* ── TELEMETRÍA ── los números. */}
      <SectionBlock id="av-stats" label="Números" isPreview={isPreview} defaultOrder={AV_SECTION_IDS}>
      {stats.length > 0 ? (
        <div style={{ position: "relative", padding: `${enEdicion ? "52px" : "clamp(40px,6vw,64px)"} clamp(16px,4vw,32px) clamp(40px,6vw,64px)`, ...fStats.estilo }}>
          {capa("bgStats", "Fondo de los números", fStats.ov)}
          <div className="av-stats" data-ef="grilla" style={ancho}>
            {stats.map((s, i) => (
              <div key={s.fv} style={{ padding: "22px 20px", borderRadius: 18, border: `1px solid ${fStats.claro ? "rgba(11,16,32,0.1)" : LINEA}`,
                background: fStats.claro ? "rgba(11,16,32,0.03)" : `linear-gradient(160deg, ${conAlfa(accent, 0.1)}, rgba(255,255,255,0.02) 55%)` }}>
                <p style={{ margin: 0, fontFamily: MONO, fontSize: "clamp(32px,4.4vw,52px)", fontWeight: 700, lineHeight: 1, color: fStats.claro ? fStats.tinta : "#fff",
                  textShadow: fStats.claro ? "none" : `0 0 24px ${conAlfa(accent, 0.55)}`, fontVariantNumeric: "tabular-nums" }}>
                  <EditableZone field={s.fv} label={`Número ${i + 1}`}>{s.n}</EditableZone>
                </p>
                <p style={{ margin: "12px 0 0", fontSize: 13, color: fStats.tenue }}>
                  <EditableZone field={s.fl} label={`Texto del número ${i + 1}`}>{s.l}</EditableZone>
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      </SectionBlock>

      {/* ── CÓMO COMPRAR ── una secuencia de cuatro pasos unidos por una línea de luz. */}
      <SectionBlock id="av-servicios" label="Cómo comprar" isPreview={isPreview} defaultOrder={AV_SECTION_IDS}>
      <section id="servicios" style={{ padding: pad, position: "relative", ...fServicios.estilo }}>
        {capa("bgServicios", "Fondo de cómo comprar", fServicios.ov)}
        <div data-ef="sube" style={ancho}>
          <Titulo acento={accent} tinta={fServicios.tinta}
            codigo={<EditableZone field="serviciosKicker" label="Etiqueta de cómo comprar">Cómo comprar</EditableZone>}
            titulo={<EditableZone field="serviciosHeading" label="Título de cómo comprar">Cuatro pasos y es tuyo</EditableZone>} />
          <div style={{ position: "relative" }}>
          <span aria-hidden="true" className="av-linea-pasos" style={{ background: `linear-gradient(90deg, ${accent}, ${conAlfa(accent, 0.15)})`, boxShadow: `0 0 10px ${conAlfa(accent, 0.5)}` }} />
          <ol className="av-pasos">
            {[
              { fv: "svc1Title", fl: "svc1Desc", t: "Elegí", d: "Filtrá por tipo, marca, año y precio, y guardá los que te gusten." },
              { fv: "svc2Title", fl: "svc2Desc", t: "Mirá la ficha", d: "Equipamiento, motor y medidas de cada vehículo, con la ficha en PDF para compartir." },
              { fv: "svc3Title", fl: "svc3Desc", t: "Consultá", d: "Escribinos desde el vehículo: el mensaje ya sale con cuál es." },
              { fv: "svc4Title", fl: "svc4Desc", t: "Coordiná la visita", d: "Acordamos día y hora para que lo veas en persona." },
            ].map((s, i) => (
              <li key={s.fv} style={{ position: "relative", display: "flex", gap: 16 }}>
                <span aria-hidden="true" style={{ position: "relative", zIndex: 1, flexShrink: 0, width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: MONO, fontSize: 15, fontWeight: 700, color: accent, background: fServicios.claro ? "#fff" : VACIO, border: `1px solid ${accent}`, boxShadow: `0 0 18px ${conAlfa(accent, 0.45)}` }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div style={{ minWidth: 0, paddingTop: 2 }}>
                  <h3 style={{ margin: "10px 0 8px", fontSize: 19, fontWeight: 800, color: fServicios.tinta, letterSpacing: -0.3 }}>
                    <EditableZone field={s.fv} label={`Paso ${i + 1} — título`}>{s.t}</EditableZone>
                  </h3>
                  <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, color: fServicios.tenue }}>
                    <EditableZone field={s.fl} label={`Paso ${i + 1} — texto`}>{s.d}</EditableZone>
                  </p>
                </div>
              </li>
            ))}
          </ol>
          </div>
        </div>
      </section>
      </SectionBlock>

      {/* ── NOSOTROS ── */}
      <SectionBlock id="av-nosotros" label="Nosotros" isPreview={isPreview} defaultOrder={AV_SECTION_IDS}>
      <section id="nosotros" style={{ padding: pad, position: "relative", ...fNosotros.estilo, borderTop: `1px solid ${fNosotros.linea}` }}>
        {capa("bgNosotros", "Fondo de nosotros", fNosotros.ov)}
        <div className="av-about" style={ancho}>
          <div style={{ borderRadius: 26, padding: 1, background: `linear-gradient(160deg, ${conAlfa(accent, 0.7)}, transparent 45%, ${conAlfa(accent, 0.3)})` }}>
            <div style={{ position: "relative", borderRadius: 25, overflow: "hidden", aspectRatio: "5/4", background: "#03040a" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- foto elegida por la dueña */}
              <img src={fotoLiviana(nosotrosUrl, 1200)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              {(() => {
                const ov = iovr["nosotrosImage"];
                if (!ov?.overlayType || ov.overlayType === "none") return null;
                return <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: ov.overlayType === "light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.45})` }} />;
              })()}
              <EditableImageButton field="nosotrosImage" label="Foto de nosotros" />
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: "0 0 12px", fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: accent }}>
              <EditableZone field="nosotrosKicker" label="Etiqueta de nosotros">Quiénes somos</EditableZone>
            </p>
            <h2 style={{ margin: "0 0 20px", fontSize: "clamp(28px,4.2vw,48px)", fontWeight: 800, letterSpacing: -1.4, lineHeight: 1.04, color: fNosotros.tinta }}>
              <EditableZone field="nosotrosHeading" label="Título de nosotros">Vehículos elegidos uno por uno</EditableZone>
            </h2>
            <p style={{ margin: "0 0 14px", fontSize: 16, lineHeight: 1.8, color: fNosotros.tenue }}>
              <EditableZone field="nosotrosP1" label="Párrafo 1">Somos especialistas en compra y venta de vehículos usados y a estrenar. Trabajamos con transparencia y seriedad para que tu experiencia sea única.</EditableZone>
            </p>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.8, color: fNosotros.tenue }}>
              <EditableZone field="nosotrosP2" label="Párrafo 2">Cada vehículo tiene fotos reales, su ficha técnica y el precio a la vista. Escribinos por cualquiera y te contamos todo.</EditableZone>
            </p>
          </div>
        </div>
      </section>
      </SectionBlock>

      {/* ── PREGUNTAS ── contestadas con lo que la tienda tiene (lib/preguntasFrecuentes). */}
      <SectionBlock id="av-preguntas" label="Preguntas frecuentes" isPreview={isPreview} defaultOrder={AV_SECTION_IDS}>
      <section id="preguntas" style={{ padding: pad, position: "relative", ...fPreguntas.estilo }}>
        {capa("bgPreguntas", "Fondo de preguntas", fPreguntas.ov)}
        <div data-ef="sube" className="av-faq" style={ancho}>
          <div className="av-faq-lado" style={{ minWidth: 0 }}>
            <Titulo acento={accent} tinta={fPreguntas.tinta}
              codigo={<EditableZone field="faqKicker" label="Etiqueta de preguntas">Preguntas</EditableZone>}
              titulo={<EditableZone field="faqTitulo" label="Título de preguntas">Lo que todos nos preguntan</EditableZone>} />
            <div style={{ padding: "22px 22px 24px", borderRadius: 20, background: "#0a0e19", border: `1px solid ${conAlfa(accent, 0.3)}` }}>
              <p style={{ margin: "0 0 6px", fontSize: 19, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>
                <EditableZone field="faqOtraTitulo" label="Título de la tarjeta de preguntas">¿Te quedó otra duda?</EditableZone>
              </p>
              <p style={{ margin: "0 0 16px", fontSize: 14, color: "rgba(232,236,246,0.7)", lineHeight: 1.6 }}>
                <EditableZone field="faqOtraTexto" label="Texto de la tarjeta de preguntas">Preguntanos lo que quieras: te contesta una persona, no un robot.</EditableZone>
              </p>
              <a href={waLink ?? "#contacto"} {...(waLink ? { target: "_blank", rel: "noopener noreferrer" } : {})} onClick={isPreview ? e => e.preventDefault() : undefined}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 18px", borderRadius: 12, background: accent, color: sobreAcento, fontSize: 14, fontWeight: 800, textDecoration: "none" }}>
                {waLink ? <><WaIcon size={16} /> Escribinos</> : "Contactanos →"}
              </a>
            </div>
          </div>
          <PreguntasVolt acento={accent} tinta={fPreguntas.tinta} preguntas={armarPreguntasAutos({ monedas: opciones.monedas.length ? opciones.monedas : [principal], conWhatsapp: !!waLink })} />
        </div>
      </section>
      </SectionBlock>

      {/* ── NOVEDADES POR MAIL ── la lista a la que le escribe Notificaciones (ver NewsletterForm). */}
      <SectionBlock id="av-novedades" label="Recibí los ingresos por mail" isPreview={isPreview} defaultOrder={AV_SECTION_IDS}>
      <section style={{ padding: "clamp(48px,7vw,88px) clamp(16px,4vw,32px)", position: "relative", ...fNovedades.estilo }}>
        {capa("bgNovedades", "Fondo de novedades", fNovedades.ov)}
        <div data-ef="sube" style={{ ...ancho, maxWidth: 860 }}>
          <div style={{ position: "relative", overflow: "hidden", borderRadius: 28, padding: "clamp(26px,5vw,48px)", textAlign: "center",
            background: `radial-gradient(120% 90% at 50% 0%, ${conAlfa(accent, 0.22)}, #0a0e19 60%)`, border: `1px solid ${conAlfa(accent, 0.35)}` }}>
            <p style={{ margin: "0 0 12px", fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: accent }}>
              <EditableZone field="novedadesKicker" label="Etiqueta de novedades">Novedades</EditableZone>
            </p>
            <h2 style={{ margin: "0 0 12px", fontSize: "clamp(26px,4vw,42px)", fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.05, color: "#fff" }}>
              <EditableZone field="novedadesHeading" label="Título de novedades">Enterate primero de lo que entra</EditableZone>
            </h2>
            <p style={{ margin: "0 auto 22px", maxWidth: 520, fontSize: 15, lineHeight: 1.6, color: "rgba(232,236,246,0.7)" }}>
              <EditableZone field="novedadesTexto" label="Texto de novedades">Dejanos tu mail y te avisamos cuando ingresen unidades nuevas o baje un precio. Sin spam.</EditableZone>
            </p>
            <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "left" }}>
              <NewsletterForm slug={slug} isPreview={isPreview} placeholder="tu@email.com" boton="Avisarme"
                theme={{
                  form: { display: "flex", gap: 6, background: "rgba(5,7,13,0.7)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: 6 },
                  input: { flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", color: "#fff", fontSize: 15, padding: "12px 10px", fontFamily: "inherit" },
                  boton: { flexShrink: 0, background: accent, color: sobreAcento, border: "none", borderRadius: 10, padding: "0 20px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
                  colorMensaje: "#e8ecf6",
                  colorError: "#fb7185",
                }} />
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "rgba(232,236,246,0.45)", lineHeight: 1.5, textAlign: "center" }}>Te llega un mail para confirmar. Te das de baja cuando quieras.</p>
            </div>
          </div>
        </div>
      </section>
      </SectionBlock>

      {/* ── CONTACTO ── */}
      <SectionBlock id="av-contacto" label="Contacto" isPreview={isPreview} defaultOrder={AV_SECTION_IDS}>
      <section id="contacto" style={{ padding: "clamp(72px,11vw,136px) clamp(16px,4vw,32px)", position: "relative", overflow: "hidden", ...fContacto.estilo, borderTop: `1px solid ${fContacto.linea}` }}>
        {capa("bgContacto", "Fondo de contacto", fContacto.ov)}
        {!fContacto.ov?.url && !fContacto.claro && (
          <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: "50%", width: "min(720px,120vw)", aspectRatio: "1", transform: "translate(-50%,-50%)", borderRadius: "50%",
            background: `radial-gradient(circle, ${conAlfa(accent, 0.22)}, transparent 62%)`, pointerEvents: "none" }} />
        )}
        <div style={{ ...ancho, maxWidth: 860, textAlign: "center" }}>
          <h2 style={{ margin: "0 0 18px", fontSize: "clamp(34px,6.4vw,78px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 0.98, color: fContacto.tinta }}>
            <EditableZone field="contactHeading" label="Título de contacto">¿Encontraste el tuyo?</EditableZone>
          </h2>
          <p style={{ margin: "0 auto 34px", fontSize: 16, lineHeight: 1.7, maxWidth: 480, color: fContacto.tenue }}>
            <EditableZone field="contactSubtext" label="Texto de contacto">Escribinos y coordinamos para que lo veas, sin compromiso.</EditableZone>
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 10, minHeight: 52, padding: "0 26px", borderRadius: 14, background: "#25d366", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 15, boxShadow: "0 12px 34px -12px rgba(37,211,102,0.7)" }}>
                <WaIcon size={20} />
                <EditableZone field="contactWhatsApp" label="Texto del botón de WhatsApp">Escribinos por WhatsApp</EditableZone>
              </a>
            )}
            <Link href={todos} style={{ display: "inline-flex", alignItems: "center", minHeight: 52, padding: "0 26px", borderRadius: 14, border: `1px solid ${fContacto.claro ? "rgba(11,16,32,0.25)" : "rgba(255,255,255,0.22)"}`, color: fContacto.tinta, textDecoration: "none", fontWeight: 700, fontSize: 15 }}>
              Ver todos los vehículos
            </Link>
          </div>
        </div>
      </section>
      </SectionBlock>
      </div>

      {/* ── PIE ── */}
      <footer style={{ position: "relative", padding: "clamp(40px,6vw,64px) clamp(16px,4vw,32px) 24px", ...fPie.estilo, borderTop: `1px solid ${conAlfa(accent, 0.25)}` }}>
        {capa("bgFooter", "Fondo del pie", fPie.ov, "Pie de la tienda")}
        <div style={ancho}>
          <ContenidoPieAutos slug={slug} storeName={storeName} products={products} legales={config?.legales} enEditor={isPreview}
            whatsapp={whatsapp.enabled ? whatsapp.number : null} redes={config?.socialLinks} acento={accent} estilo="drive"
            colores={fPie.claro ? { tinta: TINTA_CLARA, suave: fPie.tenue, linea: "rgba(11,16,32,0.12)" } : { tinta: "#ffffff", suave: fPie.tenue, linea: "rgba(255,255,255,0.1)" }}
            descripcion={<EditableZone field="footerFrase" label="Frase del pie">{FRASE_PIE}</EditableZone>}
            copyright={<EditableZone field="footerCopyright" label="Copyright">{`© ${new Date().getFullYear()} ${storeName}.`}</EditableZone>}
            onReportar={isOwner ? undefined : () => setShowReport(true)} />
        </div>
      </footer>

      {showReport && <ReportStoreModal slug={slug} onClose={() => setShowReport(false)} />}
      {fav.aviso && (
        <div role="status" style={{ position: "fixed", left: 16, right: 16, bottom: 20, zIndex: isPreview ? CAPAS.previaModal : 230, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12, maxWidth: 440, background: "#0a0e19", border: `1px solid ${conAlfa(accent, 0.35)}`, color: "#fff", borderRadius: 14, padding: "12px 12px 12px 16px", boxShadow: "0 14px 40px rgba(0,0,0,0.6)", fontSize: 13, lineHeight: 1.45 }}>
            <span style={{ flex: 1, overflowWrap: "anywhere" }}>{fav.aviso}</span>
            <button type="button" onClick={fav.cerrarAviso} aria-label="Cerrar aviso" style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
          </div>
        </div>
      )}

      {/* ── BUSCADOR ── en su capa (CAPAS.buscador): empatada con la barra, la barra se comía el clic de la ×. */}
      {searchOpen && (
        <div role="dialog" aria-modal="true" aria-label="Buscar vehículos" onClick={e => { if (e.target === e.currentTarget) setSearchOpen(false); }}
          style={{ position: "fixed", inset: 0, zIndex: CAPAS.buscador, background: "rgba(5,7,13,0.94)", backdropFilter: "blur(14px)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "clamp(72px,14vh,128px)" }}>
          <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(""); }} aria-label="Cerrar búsqueda"
            style={{ position: "absolute", top: 16, right: 16, width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: `1px solid ${LINEA}`, color: "#fff", fontSize: 24, cursor: "pointer", lineHeight: 1 }}>×</button>
          <div style={{ width: "100%", maxWidth: 720, padding: "0 clamp(16px,4vw,24px)", boxSizing: "border-box" }}>
            <p style={{ margin: "0 0 10px", fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, color: accent }}>BUSCAR EN EL STOCK</p>
            <input autoFocus type="search" aria-label="Buscar vehículos" maxLength={80} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Marca, modelo, año…"
              style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${accent}`, boxShadow: `0 1px 0 0 ${conAlfa(accent, 0.6)}`, color: "#fff", fontSize: "clamp(22px,4vw,34px)", fontWeight: 700, padding: "12px 0", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
          {searchResults.length > 0 && (
            <div style={{ width: "100%", maxWidth: 960, padding: "24px clamp(16px,4vw,24px)", overflowY: "auto", boxSizing: "border-box" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 12 }}>
                {searchResults.slice(0, 24).map(p => (
                  <Link key={p.id} href={paginaDe(p)} style={{ display: "block", background: "rgba(255,255,255,0.04)", border: `1px solid ${LINEA}`, borderRadius: 16, textDecoration: "none", color: "#fff", overflow: "hidden" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda */}
                    <img src={fotoLiviana(p.images[0], 640)} alt="" style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover", display: "block", background: VACIO }} />
                    <div style={{ padding: "10px 12px 12px" }}>
                      <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px", overflowWrap: "anywhere" }}>{p.name}</p>
                      <p style={{ fontFamily: MONO, fontSize: 13, color: accent, margin: 0 }}>{p.price > 0 ? fmtPrice(p.price, monedaDe(p, currency)) : "Consultar"}</p>
                    </div>
                  </Link>
                ))}
              </div>
              {searchResults.length > 24 && (
                <Link href={linkAVehiculos(slug, { q: searchQuery.trim() }, isPreview)} style={{ display: "block", textAlign: "center", marginTop: 18, color: accent, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                  Ver los {searchResults.length} resultados →
                </Link>
              )}
            </div>
          )}
          {searchQuery.trim().length > 0 && searchResults.length === 0 && (
            <p style={{ color: "rgba(232,236,246,0.55)", marginTop: 32, fontSize: 14, padding: "0 16px", textAlign: "center", overflowWrap: "anywhere" }}>
              Nada con &ldquo;{searchQuery}&rdquo;. Probá con otra marca o modelo.
            </p>
          )}
        </div>
      )}

      {/* ── FAVORITOS ── */}
      <div role="dialog" aria-modal="true" aria-label="Favoritos" inert={!favoritesOpen} aria-hidden={!favoritesOpen}
        style={{ position: "fixed", inset: 0, zIndex: isPreview ? CAPAS.previaModal : 205, pointerEvents: favoritesOpen ? "auto" : "none" }}>
        <div onClick={() => setFavoritesOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", opacity: favoritesOpen ? 1 : 0, transition: "opacity 0.3s" }} />
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 420, maxWidth: "100vw", background: "#080b15", color: "#fff", transform: favoritesOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s cubic-bezier(.4,0,.2,1)", display: "flex", flexDirection: "column", borderLeft: `1px solid ${conAlfa(accent, 0.3)}` }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${LINEA}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>Favoritos <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: 13, color: accent }}>{String(favorites.length).padStart(2, "0")}</span></p>
            <button type="button" onClick={() => setFavoritesOpen(false)} aria-label="Cerrar favoritos" style={{ background: "none", border: "none", color: "#fff", fontSize: 24, cursor: "pointer", width: 44, height: 44, marginRight: -10 }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px" }}>
            {favoriteProducts.length === 0 ? (
              <p style={{ textAlign: "center", padding: "52px 0", margin: 0, fontSize: 14, lineHeight: 1.8, color: "rgba(232,236,246,0.55)" }}>Todavía no guardaste ninguno.<br />Tocá el corazón de un vehículo para tenerlo acá.</p>
            ) : favoriteProducts.map(product => (
              <div key={product.id} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: `1px solid ${LINEA}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda */}
                <img src={fotoLiviana(product.images[0], 256)} alt="" style={{ width: 96, height: 68, objectFit: "cover", borderRadius: 10, flexShrink: 0, background: VACIO }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px", overflowWrap: "anywhere" }}>{product.name}</p>
                  <p style={{ fontFamily: MONO, fontSize: 13, color: accent, margin: "0 0 10px" }}>{product.price > 0 ? fmtPrice(product.price, monedaDe(product, currency)) : "Consultar"}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link href={paginaDe(product)} style={{ background: accent, color: sobreAcento, borderRadius: 10, padding: "0 14px", minHeight: 36, fontSize: 13, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Ver</Link>
                    <button type="button" onClick={() => toggleFavorite(product.id)} style={{ background: "transparent", color: "rgba(232,236,246,0.75)", border: `1px solid ${LINEA}`, borderRadius: 10, padding: "0 14px", minHeight: 36, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Quitar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!editMode && waLink && (
        <a href={waLink} aria-label="Escribinos por WhatsApp" target="_blank" rel="noopener noreferrer"
          style={{ position: "fixed", bottom: 24, right: 24, zIndex: CAPAS.panel, background: "#25d366", color: "#fff", width: 56, height: 56, borderRadius: 18,
            display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 30px rgba(37,211,102,0.45)", textDecoration: "none" }}>
          <WaIcon size={24} />
        </a>
      )}
    </div>
  );
}
