"use client";
/**
 * AUTO MOTOR — rehecho el 06/10/26 (fase 2 de TEMPLATES-AUTOS.md).
 *
 * Concesionaria premium en oscuro. La foto manda, la tipografía es grande y
 * apretada, y cada bloque está pensado para vender vehículos, no ropa:
 * buscador en la portada, "explorá por tipo", recién ingresados, un vehículo en
 * foco con su ficha en PDF, tasación del usado y "Avisame si entra".
 *
 * Se comparte la LÓGICA con el resto de los templates de autos (filtros,
 * favoritos, ventana del vehículo, tasación, búsquedas); el aspecto es propio
 * (carpeta `motor/`). Los campos editables conservan sus nombres de antes, así
 * lo que un dueño ya escribió sigue apareciendo.
 */
import { ContenidoPieAutos, FRASE_PIE } from "@/components/store/auto/PieDeAutos";
import { useEfectosAlBajar } from "@/components/store/templates/shared/efectosAutos";
import { linkWhatsApp } from "@/lib/whatsappTienda";
import { barraMs } from "@/types/store-config";
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { usePushBell } from "@/contexts/PushBellContext";
import { useSesion } from "@/components/AuthProvider";
import { useFavoritosVehiculos } from "@/hooks/useFavoritosVehiculos";
import StoreFollowButton from "@/components/store/StoreFollowButton";
import { EditableZone, EditableImageButton, EditableSectionBg, BgDragHandle, getContrastColor, useEditContext } from "@/contexts/EditContext";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";
import type { ImageOverride } from "@/types/store-config";
import VerifiedIconButton from "@/components/store/VerifiedIconButton";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import { WaIcon, AM_MODAL_CSS, fmtPrice } from "@/components/store/auto/AutoVehicleShared";
import { monedaDe, monedaDeTienda } from "@/lib/monedaVehiculo";
import { opcionesDeFiltro, filtrarVehiculos, filtroVacio, linkAVehiculos, linkAVehiculo } from "@/lib/filtroVehiculos";
import { SectionBlock } from "@/components/store/templates/shared/SectionBlock";
import { CAPAS } from "@/lib/capas-tienda";
import { TarjetaMotor, MOTOR_TARJETA_CSS } from "@/components/store/templates/motor/TarjetaMotor";
import { BuscadorMotor } from "@/components/store/templates/motor/BuscadorMotor";
import { TiposMotor } from "@/components/store/templates/motor/TiposMotor";
import { FocoMotor, elegirFoco } from "@/components/store/templates/motor/FocoMotor";
import { ServiciosMotor } from "@/components/store/templates/motor/ServiciosMotor";
import { VideosMotor, VIDEOS_MOTOR_CSS } from "@/components/store/templates/motor/VideosMotor";
import { PreguntasMotor } from "@/components/store/templates/motor/PreguntasMotor";
import { videosDeVehiculos } from "@/components/store/auto/videosDeVehiculos";
import { armarPreguntasAutos } from "@/lib/preguntasFrecuentes";

function smoothScrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}
function secBg(ov: ImageOverride | undefined, fallback: string): React.CSSProperties {
  if (ov?.url) return { backgroundImage: `url(${ov.url})`, backgroundSize: "cover", backgroundPosition: `${ov.posX ?? 50}% ${ov.posY ?? 50}%` };
  return { background: fallback };
}
function secText(ov: ImageOverride | undefined, bg: string): string {
  if (ov?.url) return ov.overlayType === "light" ? "#111111" : "#f4f4f5";
  return getContrastColor(bg) === "light" ? "#f4f4f5" : "#111111";
}
function secMid(ov: ImageOverride | undefined, bg: string): string {
  if (ov?.url) return ov.overlayType === "light" ? "#555555" : "rgba(255,255,255,0.62)";
  return getContrastColor(bg) === "light" ? "rgba(255,255,255,0.62)" : "#666666";
}
function SectionOverlay({ ov }: { ov: ImageOverride | undefined }) {
  if (!ov?.url || ov.overlayType === "none") return null;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
      background: ov.overlayType === "light"
        ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})`
        : `rgba(0,0,0,${ov.overlayOpacity ?? 0.55})` }} />
  );
}

/** La paleta: casi negro, superficies apenas más claras, y el acento del dueño. */
const NEGRO = "#0b0c0e";
const SUPERFICIE = "#101114";
const LINEA = "rgba(255,255,255,0.08)";

const AM_SECTION_IDS = ["am-tipos", "am-catalogo", "am-foco", "am-videos", "am-tasar", "am-stats", "am-servicios", "am-nosotros", "am-preguntas", "am-contacto"];

/** El título de cada bloque: rayita del acento, etiqueta chica y título grande. */
function Encabezado({ acento, tinta, kicker, titulo, derecha }: { acento: string; tinta: string; kicker: React.ReactNode; titulo: React.ReactNode; derecha?: React.ReactNode }) {
  return (
    <div data-ef="titulo" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: "0 0 12px", display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: acento,
          textTransform: "uppercase", letterSpacing: 3.5, fontWeight: 800 }}>
          <span aria-hidden="true" className="ef-raya" style={{ width: 28, height: 2, background: acento }} />
          {kicker}
        </p>
        <h2 style={{ margin: 0, fontSize: "clamp(28px,4.6vw,52px)", fontWeight: 800, color: tinta, letterSpacing: -1.6, lineHeight: 0.98 }}>
          {titulo}
        </h2>
      </div>
      {derecha}
    </div>
  );
}

export default function AutoMotor() {
  const config        = useStoreConfig();
  const pushBell      = usePushBell();
  const { products, loadingProducts } = useStorefront();
  const { editMode, overrides, hiddenSections } = useEditContext();
  /* El menú sólo a secciones que se ven (5.3 de la auditoría): un link a un
     bloque oculto no hacía nada. En el menú del celular, tampoco a las que el
     dueño ocultó sólo en el celular. */
  const ocultas = config?.hiddenSections ?? hiddenSections;
  const ocultasCelu = config?.hiddenSectionsCelular ?? [];
  const menuAncho = [["Vehículos","catálogo","am-catalogo"],["Tasá tu usado","tasar","am-tasar"],["Nosotros","nosotros","am-nosotros"],["Contacto","contacto","am-contacto"]].filter(([, , b]) => !ocultas.includes(b));
  const menuCelu = menuAncho.filter(([, , b]) => !ocultasCelu.includes(b));
  const isPreview     = !!config?.previewFill;
  // Efectos al bajar: en el editor no (ahí todo tiene que verse para editarlo).
  useEfectosAlBajar(!isPreview);
  /** Rellenar con ejemplos y hablarle a la dueña son dos cosas distintas: la demo
   *  pública de `/plantillas/[id]` necesita lo primero y no lo segundo. */
  const enEditor      = isPreview && !config?.demoPublica;
  const isOwner       = !!config?.isOwner;
  const accent        = config?.colors.accent ?? "#e8a020";
  const sobreAcento   = getContrastColor(accent) === "dark" ? "#111" : "#fff";
  const currency      = config?.currency ?? "ARS";
  const principal     = monedaDeTienda({ currency });
  const slug          = config?.slug ?? "";
  // Lo que la tienda tiene, para el buscador, los tipos y las estadísticas (ver lib/filtroVehiculos).
  const opciones = useMemo(() => opcionesDeFiltro(products, currency), [products, currency]);
  const foco = useMemo(() => elegirFoco(products), [products]);
  // Los videos que ya están en cada vehículo (no se sube nada aparte).
  const videos = useMemo(() => videosDeVehiculos(products), [products]);
  const storeName     = config?.storeName ?? "AUTO MOTOR";
  const whatsapp      = config?.whatsapp ?? { enabled: false, number: "", message: "" };
  /* El link armado con `linkWhatsApp` (06/10/26): saca el 0 y el 15, pone el
     549 a un celular escrito sin país, y descarta el número de muestra. */
  const waLink = whatsapp.enabled ? linkWhatsApp(whatsapp.number, whatsapp.message) : null;

  const iovr = config?.imageOverrides ?? {};
  const sc   = config?.sectionColors  ?? {};

  const heroOv          = iovr["heroBackground"];
  const heroBgUrl       = heroOv?.url ?? "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1920&q=80";
  const heroOverlayType = heroOv?.overlayType ?? "dark";
  const heroOverlayOp   = heroOv?.overlayOpacity ?? 0.55;

  const nosotrosUrl  = iovr["nosotrosImage"]?.url
    ?? "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=900&q=80";

  const catalogoBg  = sc["bgCatalogo"]  ?? NEGRO;
  const catalogoImg = iovr["sectionbg_bgCatalogo"];
  const catText     = secText(catalogoImg, catalogoBg);
  const catMid      = secMid(catalogoImg, catalogoBg);

  const serviciosBg = sc["bgServicios"] ?? SUPERFICIE;
  const serviciosImg= iovr["sectionbg_bgServicios"];
  const svcText     = secText(serviciosImg, serviciosBg);
  const svcMid      = secMid(serviciosImg, serviciosBg);

  const nosotrosBg  = sc["bgNosotros"]  ?? NEGRO;
  const nosotrosImg = iovr["sectionbg_bgNosotros"];
  const nosText     = secText(nosotrosImg, nosotrosBg);
  const nosMid      = secMid(nosotrosImg, nosotrosBg);

  const contactoBg  = sc["bgContacto"]  ?? SUPERFICIE;
  const contactoImg = iovr["sectionbg_bgContacto"];
  const conText     = secText(contactoImg, contactoBg);
  const conMid      = secMid(contactoImg, contactoBg);

  const footerBg    = sc["bgFooter"]    ?? "#070809";
  const footerImg   = iovr["sectionbg_bgFooter"];
  const ftMid       = secMid(footerImg, footerBg);
  const pieOscuro   = !!footerImg?.url || getContrastColor(footerBg) === "light";

  const navBg          = sc["navBg"] ?? NEGRO;
  const navDark        = getContrastColor(navBg) === "light";
  const navText        = navDark ? "#ffffff" : "#111111";
  const navTextMid     = navDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)";
  const navBorderColor = navDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";

  const { cargando, logueado, nombreMostrado, panelHref, panelLabel, signOut } = useSesion();
  const [menuOpen,         setMenuOpen]         = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  /** Cada vehículo tiene su página (07/10/26; antes, una ventana sobre la portada). */
  const paginaDe = (p: StorefrontProduct) => linkAVehiculo(slug, p.id, isPreview);
  const [showReport, setShowReport] = useState(false);
  const [annIdx,     setAnnIdx]     = useState(0);
  const [annVisible, setAnnVisible] = useState(true);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState("");

  // Lo que se ve si el dueño no escribió su barra: sólo lo que la tienda HACE
  // (ficha, tasación, búsquedas). Antes prometía financiación, inspección y
  // envío a todo el país en nombre de agencias que no los ofrecen (5.2).
  const DEFAULTS = ["Ficha técnica de cada vehículo", "Tasá tu usado online", "Te avisamos si entra lo que buscás"];
  const promoBannerEnabled = config?.promoBanner?.enabled !== false;
  const annMessages = (config?.promoBanner?.messages?.filter(m => m.trim()) ?? []).length > 0
    ? config!.promoBanner!.messages!.filter(m => m.trim())
    : DEFAULTS;
  const showAnn = promoBannerEnabled && annVisible;
  const PROMO_H = 34;
  const NAV_H   = 68;

  /* Cada cuanto rota el MENSAJE de la barra de promocion. Lo elige la duena;
     antes eran 3,5 segundos escritos a mano en los nueve templates que la
     dibujan. Ojo que NO es el carrusel de fotos: ese es `carruselMs`. */
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
    function handleClickOutside(e: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Favoritos: sin sesión quedan en este navegador (ver hooks/useFavoritosVehiculos).
  const fav = useFavoritosVehiculos(isPreview);
  const favorites = fav.favoritos;
  const toggleFavorite = fav.alternar;

  const favoriteProducts = products.filter(p => favorites.includes(p.id));
  // Busca igual que /vehiculos (marca, modelo, año, en cualquier orden; ver lib/filtroVehiculos).
  const searchResults = searchQuery.trim().length > 0
    ? filtrarVehiculos(products, { ...filtroVacio(), q: searchQuery }, currency)
    : [];

  /* Escape cierra el buscador y los favoritos (5.6 de la auditoría: antes sólo
     el modal del vehículo lo escuchaba). El modal tiene el suyo: si está
     abierto, es de él. */
  useEffect(() => {
    if (!searchOpen && !favoritesOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (searchOpen) { setSearchOpen(false); setSearchQuery(""); }
      else setFavoritesOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, favoritesOpen]);

  // Recién ingresados: los más nuevos, sin el que está en foco (no se repite dos bloques seguidos).
  const recientes = products.filter(p => p.id !== foco?.id || products.length <= 4).slice(0, 8);
  const todos = linkAVehiculos(slug, {}, isPreview);

  /* Estadísticas: lo que se cuenta sale de los datos; lo que es del negocio
     (años, clientes) se ve sólo si el dueño lo escribió (en el editor, siempre,
     para que lo pueda completar). Antes decía "200+", "98%" de fábrica (5.2). */
  const stats = [
    { fv:"stat1", fl:"statLabel1", n:String(products.length), l:"Vehículos disponibles", propio:false },
    { fv:"stat4", fl:"statLabel4", n:String(opciones.marcas.length), l:"Marcas", propio:false },
    { fv:"stat2", fl:"statLabel2", n:"15", l:"Años en el mercado", propio:true },
    { fv:"stat3", fl:"statLabel3", n:"98%", l:"Clientes satisfechos", propio:true },
  ].filter(s => !!overrides[s.fv]?.text?.trim() || (s.propio ? editMode : s.n !== "0"));

  return (
    <div style={{ background: NEGRO, color: "#f4f4f5",
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", minHeight: "100vh" }}>
      <style>{`
        ${AM_MODAL_CSS}
        ${MOTOR_TARJETA_CSS}
        ${VIDEOS_MOTOR_CSS}
        .am-grid { display:grid; gap:12px; grid-template-columns:1fr }
        @media(min-width:560px){ .am-grid { grid-template-columns:repeat(2,minmax(0,1fr)) } }
        @media(min-width:1000px){ .am-grid { grid-template-columns:repeat(4,minmax(0,1fr)) } }
        .am-nav-links { display:none }
        .am-marca { font-size:12px; letter-spacing:1px }
        @media(min-width:640px){ .am-marca { font-size:16px; letter-spacing:3.5px } }
        .am-solo-ancho { display:none }
        @media(min-width:900px){ .am-nav-links { display:flex } .am-burger { display:none !important } .am-solo-ancho { display:inline-flex } }
        .am-about { grid-template-columns:1fr }
        @media(min-width:860px){ .am-about { grid-template-columns:1.05fr 1fr } }
        .am-pasos { grid-template-columns:1fr }
        @media(min-width:640px){ .am-pasos { grid-template-columns:repeat(2,minmax(0,1fr)) } }
        @media(min-width:1000px){ .am-pasos { grid-template-columns:repeat(4,minmax(0,1fr)) } }
        .bm-grilla { grid-template-columns:1fr }
        @media(min-width:700px){ .bm-grilla { grid-template-columns:repeat(auto-fit,minmax(150px,1fr)) } }
        .tp-grilla { grid-template-columns:repeat(2,minmax(0,1fr)) }
        .tp-item { grid-column: span var(--tp-celu,1) }
        @media(min-width:900px){ .tp-grilla { grid-template-columns:repeat(var(--tp-cols,4),minmax(0,1fr)) } .tp-item { grid-column: span var(--tp-compu,1) } .tp-grande { grid-row: span 2 } }
        .tp-item { min-height:150px }
        @media(min-width:900px){ .tp-item { min-height:190px } }
        .tp-foto { transition: transform .8s cubic-bezier(.2,.7,.2,1) }
        .tp-item:hover .tp-foto { transform: scale(1.05) }
        .tp-item:focus-visible { outline:2px solid ${accent}; outline-offset:3px }
        .fm-grilla { grid-template-columns:1fr }
        @media(min-width:900px){ .fm-grilla { grid-template-columns:1.25fr 1fr } }
        .fm-foto { aspect-ratio: 16/11 }
        @media(min-width:900px){ .fm-foto { aspect-ratio:auto } }
        .fm-datos { grid-template-columns:repeat(2,minmax(0,1fr)) }
        .sm-grilla { grid-template-columns:1fr }
        @media(min-width:760px){ .sm-grilla { grid-template-columns:1fr 1fr } }
        .am-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)) }
        .am-faq { grid-template-columns:1fr }
        .am-faq-foto { max-width:520px }
        @media(min-width:960px){ .am-faq { grid-template-columns:minmax(0,0.8fr) minmax(0,1.4fr); align-items:start } .am-faq-lado { position:sticky; top:96px } }
        @media(max-width:959px){ .am-faq-foto { aspect-ratio:16/10 !important } }
        .am-link:hover { color:${accent} !important }
        @keyframes am-spin { to { transform:rotate(360deg) } }
        @keyframes am-sube { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:none } }
        .am-entra { animation: am-sube .9s cubic-bezier(.2,.7,.2,1) both }
        /* Efectos al bajar (08/10/26), ver shared/efectosAutos: entran con fuerza, uno tras otro. */
        @keyframes am-ef-sube { from { opacity:0; transform:translateY(36px) } to { opacity:1; transform:none } }
        .ef-listo [data-ef="sube"]:not(.ef-in) > *, .ef-listo [data-ef="grilla"]:not(.ef-in) > * { opacity:0 }
        .ef-listo [data-ef="sube"].ef-in > * { animation: am-ef-sube .9s cubic-bezier(.16,.84,.3,1) backwards }
        .ef-listo [data-ef="grilla"].ef-in > * { animation: am-ef-sube .8s cubic-bezier(.16,.84,.3,1) backwards }
        .ef-listo [data-ef="sube"].ef-in > :nth-child(2) { animation-delay:0.08s }
        .ef-listo [data-ef="sube"].ef-in > :nth-child(3) { animation-delay:0.16s }
        .ef-listo [data-ef="sube"].ef-in > :nth-child(4) { animation-delay:0.24s }
        .ef-listo [data-ef="sube"].ef-in > :nth-child(5) { animation-delay:0.32s }
        .ef-listo [data-ef="sube"].ef-in > :nth-child(6) { animation-delay:0.40s }
        .ef-listo [data-ef="sube"].ef-in > :nth-child(7) { animation-delay:0.48s }
        .ef-listo [data-ef="sube"].ef-in > :nth-child(8) { animation-delay:0.56s }
        .ef-listo [data-ef="grilla"].ef-in > :nth-child(2) { animation-delay:0.08s }
        .ef-listo [data-ef="grilla"].ef-in > :nth-child(3) { animation-delay:0.16s }
        .ef-listo [data-ef="grilla"].ef-in > :nth-child(4) { animation-delay:0.24s }
        .ef-listo [data-ef="grilla"].ef-in > :nth-child(5) { animation-delay:0.32s }
        .ef-listo [data-ef="grilla"].ef-in > :nth-child(6) { animation-delay:0.40s }
        .ef-listo [data-ef="grilla"].ef-in > :nth-child(7) { animation-delay:0.48s }
        .ef-listo [data-ef="grilla"].ef-in > :nth-child(8) { animation-delay:0.56s }
        .ef-listo [data-ef="titulo"] .ef-raya { transform-origin:left; transition: transform .9s .2s cubic-bezier(.16,.84,.3,1) }
        .ef-listo [data-ef].ef-ya > *, .ef-listo [data-ef].ef-ya .ef-raya { animation:none !important; transition:none !important }
        .ef-listo [data-ef="titulo"]:not(.ef-in) .ef-raya { transform:scaleX(0) }
        @media (prefers-reduced-motion: reduce) { .am-entra, .tp-foto { animation:none; transition:none } }
      `}</style>

      {/* ── BARRA DE AVISOS ── */}
      {showAnn && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top:0,
          left: isPreview ? undefined : 0, right: isPreview ? undefined : 0,
          zIndex: isPreview ? CAPAS.previaNavAlto : 110, height: PROMO_H,
          background: accent, color: sobreAcento,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "0 44px" }}>
          <span style={{ fontSize:11, fontWeight:800, letterSpacing:2, textTransform:"uppercase",
            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {annMessages[annIdx]}
          </span>
          <button type="button" onClick={() => setAnnVisible(false)} aria-label="Cerrar la barra de avisos"
            style={{ position:"absolute", right:4, top:"50%", transform:"translateY(-50%)", width:34, height:34,
              background:"none", border:"none", color:"inherit", cursor:"pointer", fontSize:18, opacity:0.7 }}>×</button>
        </div>
      )}

      {/* ── NAV ── */}
      <nav aria-label="Principal" style={{ position: isPreview ? "sticky" : "fixed",
        top: showAnn ? PROMO_H : 0,
        left: isPreview ? undefined : 0, right: isPreview ? undefined : 0,
        zIndex: isPreview ? CAPAS.previaNav : 100,
        background: navDark ? `${navBg}e6` : navBg, backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${navBorderColor}`,
        padding: "0 clamp(16px,4vw,32px)" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", height:NAV_H,
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0,
            fontWeight:900, textTransform:"uppercase", color: navText }}>
            {/* En el celular se parte en dos renglones antes que cortarse ("RODRÍ…"). */}
            <span className="am-marca" style={{ overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", lineHeight:1.1 }}>
              <EditableZone field="storeName" label="Nombre de la tienda">{storeName}</EditableZone>
            </span>
            <VerifiedIconButton isVerified={config?.isVerified} info={config?.verifiedInfo} color={navText} />
          </div>
          <div className="am-nav-links" style={{ gap:28, alignItems:"center" }}>
            {menuAncho.map(([lbl,id]) => (
              <button key={id} type="button" onClick={() => smoothScrollTo(id)} className="am-link"
                style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, minHeight:44,
                  fontWeight:600, letterSpacing:1.5, textTransform:"uppercase", transition:"color 0.15s",
                  color: navTextMid, fontFamily:"inherit" }}>
                {lbl}
              </button>
            ))}
          </div>
          {/* Grupo derecho — búsqueda + favoritos + campanita + usuario + menú mobile */}
          <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
            <button type="button" onClick={() => setSearchOpen(true)} aria-label="Abrir el buscador"
              style={{ background:"none", border:"none", color:navTextMid, cursor:"pointer", width:40, height:40, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <button type="button" onClick={() => setFavoritesOpen(true)} aria-label={`Favoritos${favorites.length ? ` (${favorites.length})` : ""}`}
              style={{ position:"relative", background:"none", border:"none", color:navTextMid, cursor:"pointer", width:40, height:40, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill={favorites.length > 0 ? accent : "none"} stroke={favorites.length > 0 ? accent : "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {favorites.length > 0 && <span aria-hidden="true" style={{ position:"absolute", top:2, right:2, background:accent, color:sobreAcento, borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{favorites.length}</span>}
            </button>
            {pushBell && config?.showPushBell && !isPreview && (
              <StoreFollowButton storeSlug={slug} color={navTextMid} size={20} />
            )}
            {pushBell && config?.showPushBell && !isPreview && (
              <button type="button" onClick={pushBell.openDrawer} aria-label="Novedades de la tienda"
                style={{ position:"relative", background:"none", border:"none", cursor:"pointer", width:40, height:40,
                  display:"flex", alignItems:"center", justifyContent:"center", color:navTextMid }}>
                <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true"
                  fill={pushBell.followState==="following"?"currentColor":"none"}
                  stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {pushBell.hasNew && <span style={{ position:"absolute", top:6, right:6, width:10, height:10,
                  background:"#ef4444", borderRadius:"50%", border:`2px solid ${navBg}` }} />}
              </button>
            )}
            {/* Maquetas de la campanita: solo en el editor. En la demo pública de
                /plantillas no hay tienda que configurar. */}
            {enEditor && (config?.showPushBell ? (
              <>
                <button type="button" title="Los clientes pueden seguir tu tienda desde acá"
                  style={{ width:40, height:40, display:"flex", alignItems:"center", justifyContent:"center", color:navTextMid, background:"none", border:"none", cursor:"default", opacity:0.85 }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                </button>
                <button type="button" onClick={config.onPreviewBellClick} aria-label="Novedades de la tienda"
                  style={{ width:40, height:40, display:"flex", alignItems:"center", justifyContent:"center", color:navTextMid, background:"none", border:"none", cursor:"pointer" }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={config?.onPreviewBellClick} title="🔒 Solo Plan Plus"
                  style={{ position:"relative", width:40, height:40, display:"flex", alignItems:"center", justifyContent:"center", color:navTextMid, opacity:0.5, background:"none", border:"none", cursor:"pointer" }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                  <span style={{ position:"absolute", top:4, right:4, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
                </button>
                <button type="button" onClick={config?.onPreviewBellClick} title="🔒 Solo Plan Plus"
                  style={{ position:"relative", width:40, height:40, display:"flex", alignItems:"center", justifyContent:"center", color:navTextMid, opacity:0.5, background:"none", border:"none", cursor:"pointer" }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  <span style={{ position:"absolute", top:4, right:4, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
                </button>
              </>
            ))}
            {/* Cuenta */}
            <div ref={userDropdownRef} style={{ position:"relative" }}>
              <button type="button" onClick={() => setUserDropdownOpen(o => !o)} aria-label="Mi cuenta" aria-expanded={userDropdownOpen}
                style={{ background:"none", border:"none", color:navTextMid, cursor:"pointer", width:40, height:40, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </button>
              {userDropdownOpen && (
                <div style={{ position:"absolute", top:"calc(100% + 12px)", right:0, background:"#141619", border:`1px solid ${LINEA}`, minWidth:200, zIndex:CAPAS.flotante, boxShadow:"0 18px 40px rgba(0,0,0,0.5)", overflow:"hidden", borderRadius:4 }}>
                  {cargando ? (<p style={{ padding:"14px 16px", margin:0, fontSize:12, opacity:0.55 }}>Cargando…</p>) : logueado ? (
                    <>
                      <p style={{ padding:"12px 16px 4px", fontSize:11, color:"rgba(255,255,255,0.5)", margin:0, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {nombreMostrado}
                      </p>
                      <a href={panelHref} onClick={() => setUserDropdownOpen(false)} className="am-link"
                        style={{ display:"block", padding:"12px 16px", fontSize:13, color:"#fff", textDecoration:"none", borderBottom:`1px solid ${LINEA}` }}>{panelLabel}</a>
                      <button type="button" onClick={() => { if (isPreview) return; setUserDropdownOpen(false); signOut("/"); }}
                        style={{ display:"block", width:"100%", padding:"12px 16px", fontSize:13, color:"#f87171", background:"none", border:"none", textAlign:"left", cursor: isPreview ? "default" : "pointer", opacity: isPreview ? 0.45 : 1, fontFamily:"inherit" }}>Cerrar sesión</button>
                    </>
                  ) : (
                    <>
                      <a href={isPreview ? undefined : `/login?redirect=/tienda/${slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)} className="am-link"
                        style={{ display:"block", padding:"13px 16px", fontSize:13, color:"#fff", textDecoration:"none", borderBottom:`1px solid ${LINEA}`, cursor: isPreview ? "default" : "pointer" }}>Iniciar sesión</a>
                      <a href={isPreview ? undefined : `/registro?plan=buyer&redirect=/tienda/${slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)} className="am-link"
                        style={{ display:"block", padding:"13px 16px", fontSize:13, color:"#fff", textDecoration:"none", cursor: isPreview ? "default" : "pointer" }}>Registrarse</a>
                    </>
                  )}
                </div>
              )}
            </div>
            <Link href={todos} className="am-solo-ancho"
              style={{ marginLeft:8, background:accent, color:sobreAcento, textDecoration:"none", padding:"0 18px", minHeight:40,
                alignItems:"center", fontSize:11, fontWeight:800, letterSpacing:1.5, textTransform:"uppercase", borderRadius:2 }}>
              Ver vehículos
            </Link>
            <button className="am-burger" type="button" onClick={() => setMenuOpen(m => !m)} aria-label={menuOpen ? "Cerrar el menú" : "Abrir el menú"} aria-expanded={menuOpen}
              style={{ background:"none", border:`1px solid ${navBorderColor}`, borderRadius:2,
                color:navText, width:40, height:40, cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", marginLeft:4 }}>
              {menuOpen ? "×" : "☰"}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div style={{ borderTop:`1px solid ${navBorderColor}`, padding:"6px 0 18px" }}>
            {menuCelu.map(([lbl,id]) => (
              <button key={id} type="button" onClick={() => { smoothScrollTo(id); setMenuOpen(false); }}
                style={{ display:"block", width:"100%", background:"none", border:"none",
                  color:navText, cursor:"pointer", textAlign:"left", minHeight:48,
                  fontSize:13, fontWeight:700, textTransform:"uppercase", fontFamily:"inherit",
                  letterSpacing:1.5, borderBottom:`1px solid ${navBorderColor}` }}>
                {lbl}
              </button>
            ))}
            <Link href={todos}
              style={{ display:"flex", alignItems:"center", color:accent, minHeight:48,
                fontSize:13, fontWeight:800, textTransform:"uppercase", letterSpacing:1.5, textDecoration:"none" }}
              onClick={() => setMenuOpen(false)}>
              Ver todos los vehículos →
            </Link>
          </div>
        )}
      </nav>

      {/* ── PORTADA ── la foto, el título y el buscador: lo primero que se hace en una agencia es buscar. */}
      <section aria-label="Portada" style={{ position:"relative", minHeight:"min(100svh, 920px)",
        display:"flex", flexDirection:"column", justifyContent:"flex-end",
        paddingTop: isPreview ? 0 : (showAnn ? PROMO_H + NAV_H : NAV_H), overflow:"hidden", background: NEGRO }}>
        <div aria-hidden="true" style={{ position:"absolute", inset:0,
          backgroundImage: `url(${heroBgUrl})`,
          backgroundSize:"cover", backgroundPosition:`${heroOv?.posX ?? 50}% ${heroOv?.posY ?? 50}%` }} />
        {heroOverlayType !== "none" && (
          <div aria-hidden="true" style={{ position:"absolute", inset:0,
            background: heroOverlayType === "light"
              ? `rgba(255,255,255,${heroOverlayOp})`
              : `linear-gradient(to top, ${NEGRO} 0%, rgba(11,12,14,${Math.min(1, heroOverlayOp + 0.2)}) 30%, rgba(11,12,14,${heroOverlayOp * 0.55}) 70%, rgba(11,12,14,${heroOverlayOp * 0.35}) 100%)` }} />
        )}
        <EditableImageButton field="heroBackground" label="Imagen de fondo de la portada" />

        <div style={{ position:"relative", zIndex:1, maxWidth:1280, margin:"0 auto",
          width:"100%", boxSizing:"border-box", padding:"clamp(48px,10vh,120px) clamp(16px,4vw,32px) clamp(28px,5vw,56px)" }}>
          <p className="am-entra" style={{ margin:"0 0 18px", display:"flex", alignItems:"center", gap:12, fontSize:11, color:accent, letterSpacing:4, fontWeight:800, textTransform:"uppercase" }}>
            <span aria-hidden="true" style={{ width:32, height:2, background:accent }} />
            <EditableZone field="heroKicker" label="Etiqueta de la portada">{storeName}</EditableZone>
          </p>
          <h1 className="am-entra" style={{ margin:"0 0 20px", fontSize:"clamp(40px,8.5vw,112px)", fontWeight:900,
            color:"#fff", letterSpacing:"-0.045em", lineHeight:0.88, maxWidth:"11ch", animationDelay:".08s" }}>
            <EditableZone field="heroHeading" label="Título de la portada">Tu próximo vehículo está acá</EditableZone>
          </h1>
          <p className="am-entra" style={{ margin:"0 0 36px", fontSize:"clamp(15px,1.7vw,18px)",
            color:"rgba(255,255,255,0.72)", maxWidth:520, lineHeight:1.65, animationDelay:".16s" }}>
            <EditableZone field="heroSubtext" label="Subtítulo de la portada">Autos, camionetas, motos y más, con la ficha técnica completa y el precio a la vista.</EditableZone>
          </p>
          <div className="am-entra" style={{ animationDelay:".24s", maxWidth:960 }}>
            <BuscadorMotor slug={slug} opciones={opciones} principal={principal} acento={accent} enEditor={isPreview} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"10px 24px", flexWrap:"wrap", marginTop:22 }}>
            {!loadingProducts && products.length > 0 && (
              <Link href={todos} className="am-link" style={{ color:"rgba(255,255,255,0.8)", fontSize:13, fontWeight:600, textDecoration:"none", minHeight:44, display:"inline-flex", alignItems:"center" }}>
                Ver los {products.length} vehículo{products.length !== 1 ? "s" : ""} →
              </Link>
            )}
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="am-link"
                style={{ display:"inline-flex", alignItems:"center", gap:8, minHeight:44, color:"rgba(255,255,255,0.8)", textDecoration:"none", fontSize:13, fontWeight:600 }}>
                <WaIcon size={16} /> Hablar con un asesor
              </a>
            )}
          </div>
        </div>
      </section>

      <div style={{ display:"flex", flexDirection:"column" }}>

      {/* ── EXPLORÁ POR TIPO ── */}
      <SectionBlock id="am-tipos" label="Explorá por tipo" isPreview={isPreview} defaultOrder={AM_SECTION_IDS}>
      {(opciones.tipos.length > 1 || opciones.marcas.length > 1) ? (
        <section style={{ padding:"clamp(56px,8vw,96px) clamp(16px,4vw,32px) 0", background: NEGRO }}>
          <div data-ef="sube" style={{ maxWidth:1280, margin:"0 auto" }}>
            <TiposMotor productos={products} opciones={opciones} moneda={currency} slug={slug} enEditor={isPreview}
              titulo={<EditableZone field="tiposHeading" label="Título de los tipos">{opciones.tipos.length > 1 ? "Explorá por tipo" : "Explorá por marca"}</EditableZone>} />
          </div>
        </section>
      ) : null}
      </SectionBlock>

      {/* ── RECIÉN INGRESADOS ── */}
      <SectionBlock id="am-catalogo" label="Recién ingresados" isPreview={isPreview} defaultOrder={AM_SECTION_IDS}>
      <section id="catálogo" style={{ padding:"clamp(56px,8vw,96px) clamp(16px,4vw,32px)", position:"relative",
        ...secBg(catalogoImg, catalogoBg) }}>
        <BgDragHandle imgKey="sectionbg_bgCatalogo" />
        <SectionOverlay ov={catalogoImg} />
        <EditableSectionBg field="bgCatalogo" label="Fondo de recién ingresados" />
        <div data-ef="sube" style={{ position:"relative", zIndex:1, maxWidth:1280, margin:"0 auto" }}>
          <Encabezado acento={accent} tinta={catText}
            kicker={<EditableZone field="catalogKicker" label="Etiqueta del catálogo">Stock</EditableZone>}
            titulo={<EditableZone field="catalogHeading" label="Título del catálogo">Recién ingresados</EditableZone>}
            derecha={products.length > recientes.length ? (
              <Link href={todos} className="am-link" style={{ color:catMid, fontSize:13, fontWeight:700, textDecoration:"none", minHeight:44, display:"inline-flex", alignItems:"center", letterSpacing:0.5 }}>
                Ver todos ({products.length}) →
              </Link>
            ) : undefined} />

          {loadingProducts ? (
            <div role="status" aria-label="Cargando vehículos" style={{ textAlign:"center", padding:"60px 0" }}>
              <div style={{ width:36, height:36, border:`3px solid ${accent}`,
                borderTopColor:"transparent", borderRadius:"50%",
                animation:"am-spin 0.8s linear infinite", margin:"0 auto" }} />
            </div>
          ) : recientes.length > 0 ? (
            <div className="am-grid" data-ef="grilla">
              {recientes.map(p => (
                <TarjetaMotor key={p.id} p={p} acento={accent} moneda={currency} href={paginaDe(p)}
                  favorito={favorites.includes(p.id)} onFavorito={() => toggleFavorite(p.id)} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:"56px 16px", border:`1px dashed ${LINEA}` }}>
              <p style={{ margin:0, color:catMid, fontSize:14 }}>Todavía no hay vehículos publicados.</p>
            </div>
          )}
        </div>
      </section>
      </SectionBlock>

      {/* ── VEHÍCULO EN FOCO ── */}
      <SectionBlock id="am-foco" label="Vehículo en foco" isPreview={isPreview} defaultOrder={AM_SECTION_IDS}>
      {foco ? (
        <section style={{ padding:"0 clamp(16px,4vw,32px) clamp(56px,8vw,96px)", background: catalogoImg?.url ? NEGRO : catalogoBg }}>
          <div data-ef="sube" style={{ maxWidth:1280, margin:"0 auto" }}>
            <FocoMotor p={foco} acento={accent} moneda={currency} whatsapp={whatsapp} enPrevia={isPreview}
              href={paginaDe(foco)}
              kicker={<EditableZone field="focoKicker" label="Etiqueta del vehículo en foco">En foco</EditableZone>} />
          </div>
        </section>
      ) : null}
      </SectionBlock>

      {/* ── VIDEOS ── los que la agencia subió en sus vehículos. */}
      <SectionBlock id="am-videos" label="Videos" isPreview={isPreview} defaultOrder={AM_SECTION_IDS}>
      {(videos.length > 0 || enEditor) ? (
        <section style={{ padding:"clamp(56px,8vw,96px) clamp(16px,4vw,32px)", background: NEGRO, borderTop:`1px solid ${LINEA}` }}>
          <div data-ef="sube" style={{ maxWidth:1280, margin:"0 auto" }}>
            <Encabezado acento={accent} tinta="#f4f4f5"
              kicker={<EditableZone field="videosKicker" label="Etiqueta de videos">En video</EditableZone>}
              titulo={<EditableZone field="videosHeading" label="Título de videos">Miralos andar</EditableZone>} />
            <VideosMotor videos={videos} acento={accent} moneda={currency} hrefDe={id => linkAVehiculo(slug, id, isPreview)}
              vacio={<p style={{ margin:0, padding:"28px 20px", border:`1px dashed ${LINEA}`, borderRadius:4, color:"rgba(255,255,255,0.6)", fontSize:14, lineHeight:1.6 }}>
                Acá aparecen los videos que subas en cada vehículo (en Productos → el vehículo → Videos). Cada uno lleva a su vehículo. Mientras no haya ninguno, este bloque no se muestra en la tienda.
              </p>} />
          </div>
        </section>
      ) : null}
      </SectionBlock>

      {/* ── TASÁ TU USADO / AVISAME SI ENTRA ── */}
      <SectionBlock id="am-tasar" label="Tasá tu usado y Avisame si entra" isPreview={isPreview} defaultOrder={AM_SECTION_IDS}>
      <section id="tasar" style={{ padding:"clamp(56px,8vw,96px) clamp(16px,4vw,32px)", background: SUPERFICIE, borderTop:`1px solid ${LINEA}` }}>
        <div data-ef="sube" style={{ maxWidth:1280, margin:"0 auto" }}>
          <Encabezado acento={accent} tinta="#f4f4f5"
            kicker={<EditableZone field="tasarKicker" label="Etiqueta de tasación">Antes de comprar</EditableZone>}
            titulo={<EditableZone field="tasarHeading" label="Título de tasación">Te ayudamos a dar el paso</EditableZone>} />
          <ServiciosMotor storeId={config?.storeId} acento={accent} isOwner={isOwner} isPreview={isPreview}
            textos={{
              tasarTitulo: <EditableZone field="tasarTitulo" label="Tasá tu usado — título">¿Tenés un usado?</EditableZone>,
              tasarTexto: <EditableZone field="tasarTexto" label="Tasá tu usado — texto">Contanos qué tenés y te respondemos con una oferta, para tomarlo en parte de pago o comprártelo.</EditableZone>,
              avisameTitulo: <EditableZone field="avisameTitulo" label="Avisame si entra — título">¿No está lo que buscás?</EditableZone>,
              avisameTexto: <EditableZone field="avisameTexto" label="Avisame si entra — texto">Dejanos marca, modelo y hasta cuánto querés gastar. Cuando entre, te escribimos primero.</EditableZone>,
            }} />
        </div>
      </section>
      </SectionBlock>

      {/* ── NÚMEROS ── */}
      <SectionBlock id="am-stats" label="Números" isPreview={isPreview} defaultOrder={AM_SECTION_IDS}>
      {stats.length > 0 ? (
        <div style={{ background: NEGRO, borderTop:`1px solid ${LINEA}`, borderBottom:`1px solid ${LINEA}`, padding:"0 clamp(16px,4vw,32px)" }}>
          <div className="am-stats" data-ef="grilla" style={{ maxWidth:1280, margin:"0 auto" }}>
            {stats.map((s, i) => (
              <div key={s.fv} style={{ padding:"clamp(28px,4vw,44px) 16px", borderLeft: i > 0 ? `1px solid ${LINEA}` : "none" }}>
                <p data-ef-contar style={{ margin:0, fontSize:"clamp(34px,5vw,60px)", fontWeight:900, color:"#fff", letterSpacing:-2, lineHeight:1, fontVariantNumeric:"tabular-nums" }}>
                  <EditableZone field={s.fv} label={`Número ${i+1}`}>{s.n}</EditableZone>
                </p>
                <p style={{ margin:"10px 0 0", fontSize:11, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:2.5 }}>
                  <EditableZone field={s.fl} label={`Texto del número ${i+1}`}>{s.l}</EditableZone>
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      </SectionBlock>

      {/* ── CÓMO COMPRAR ── pasos, no promesas: lo que hace el comprador acá. */}
      <SectionBlock id="am-servicios" label="Cómo comprar" isPreview={isPreview} defaultOrder={AM_SECTION_IDS}>
      <section id="servicios" style={{ padding:"clamp(56px,8vw,96px) clamp(16px,4vw,32px)", position:"relative",
        ...secBg(serviciosImg, serviciosBg) }}>
        <BgDragHandle imgKey="sectionbg_bgServicios" />
        <SectionOverlay ov={serviciosImg} />
        <EditableSectionBg field="bgServicios" label="Fondo de cómo comprar" />
        <div data-ef="sube" style={{ position:"relative", zIndex:1, maxWidth:1280, margin:"0 auto" }}>
          <Encabezado acento={accent} tinta={svcText}
            kicker={<EditableZone field="serviciosKicker" label="Etiqueta de cómo comprar">Cómo comprar</EditableZone>}
            titulo={<EditableZone field="serviciosHeading" label="Título de cómo comprar">Cuatro pasos y es tuyo</EditableZone>} />
          <ol className="am-pasos" style={{ listStyle:"none", margin:0, padding:0, display:"grid", gap:1, background: svcText === "#111111" ? "rgba(0,0,0,0.08)" : LINEA }}>
            {[
              { fv:"svc1Title", fl:"svc1Desc", t:"Elegí", d:"Filtrá por tipo, marca, año y precio, y guardá los que te gusten." },
              { fv:"svc2Title", fl:"svc2Desc", t:"Mirá la ficha", d:"Equipamiento, motor y medidas de cada vehículo, con la ficha en PDF para compartir." },
              { fv:"svc3Title", fl:"svc3Desc", t:"Consultá", d:"Escribinos desde el vehículo: el mensaje ya sale con cuál es." },
              { fv:"svc4Title", fl:"svc4Desc", t:"Coordiná la visita", d:"Acordamos día y hora para que lo veas en persona." },
            ].map((s, i) => (
              <li key={s.fv} style={{ padding:"clamp(24px,3vw,36px) clamp(20px,2.4vw,28px)", background: serviciosImg?.url ? "rgba(11,12,14,0.55)" : serviciosBg }}>
                <p aria-hidden="true" style={{ margin:"0 0 22px", fontSize:13, fontWeight:800, color:accent, letterSpacing:2 }}>0{i + 1}</p>
                <h3 style={{ margin:"0 0 10px", fontSize:20, fontWeight:800, color:svcText, letterSpacing:-0.4 }}>
                  <EditableZone field={s.fv} label={`Paso ${i+1} — título`}>{s.t}</EditableZone>
                </h3>
                <p style={{ margin:0, fontSize:14, color:svcMid, lineHeight:1.7 }}>
                  <EditableZone field={s.fl} label={`Paso ${i+1} — texto`}>{s.d}</EditableZone>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      </SectionBlock>

      {/* ── NOSOTROS ── */}
      <SectionBlock id="am-nosotros" label="Nosotros" isPreview={isPreview} defaultOrder={AM_SECTION_IDS}>
      <section id="nosotros" style={{ padding:"clamp(56px,8vw,96px) clamp(16px,4vw,32px)", position:"relative",
        ...secBg(nosotrosImg, nosotrosBg) }}>
        <BgDragHandle imgKey="sectionbg_bgNosotros" />
        <SectionOverlay ov={nosotrosImg} />
        <EditableSectionBg field="bgNosotros" label="Fondo de nosotros" />
        <div className="am-about" style={{ position:"relative", zIndex:1, maxWidth:1280,
          margin:"0 auto", display:"grid", gap:"clamp(32px,5vw,72px)", alignItems:"center" }}>
          <div style={{ position:"relative", overflow:"hidden", aspectRatio:"5/4", borderRadius:4 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- foto elegida por el dueño */}
            <img src={nosotrosUrl} alt=""
              style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
            {(() => {
              const ov = iovr["nosotrosImage"];
              if (!ov?.overlayType || ov.overlayType==="none") return null;
              return <div style={{ position:"absolute", inset:0, pointerEvents:"none",
                background: ov.overlayType==="light"
                  ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})`
                  : `rgba(0,0,0,${ov.overlayOpacity ?? 0.45})` }} />;
            })()}
            <EditableImageButton field="nosotrosImage" label="Foto de nosotros" />
          </div>
          <div>
            <p style={{ margin:"0 0 12px", display:"flex", alignItems:"center", gap:12, fontSize:11, color:accent,
              textTransform:"uppercase", letterSpacing:3.5, fontWeight:800 }}>
              <span aria-hidden="true" style={{ width:28, height:2, background:accent }} />
              <EditableZone field="nosotrosKicker" label="Etiqueta de nosotros">Quiénes somos</EditableZone>
            </p>
            <h2 style={{ margin:"0 0 22px", fontSize:"clamp(28px,4.4vw,50px)", fontWeight:800,
              color:nosText, letterSpacing:-1.6, lineHeight:1.0 }}>
              <EditableZone field="nosotrosHeading" label="Título de nosotros">Vehículos elegidos uno por uno</EditableZone>
            </h2>
            <p style={{ margin:"0 0 14px", fontSize:16, color:nosMid, lineHeight:1.8 }}>
              <EditableZone field="nosotrosP1" label="Párrafo 1">Somos especialistas en compra y venta de vehículos usados y a estrenar. Trabajamos con transparencia y seriedad para que tu experiencia sea única.</EditableZone>
            </p>
            <p style={{ margin:0, fontSize:16, color:nosMid, lineHeight:1.8 }}>
              <EditableZone field="nosotrosP2" label="Párrafo 2">Cada vehículo tiene fotos reales, su ficha técnica y el precio a la vista. Escribinos por cualquiera y te contamos todo.</EditableZone>
            </p>
          </div>
        </div>
      </section>
      </SectionBlock>

      {/* ── PREGUNTAS FRECUENTES ── contestadas con lo que la tienda tiene (lib/preguntasFrecuentes). */}
      <SectionBlock id="am-preguntas" label="Preguntas frecuentes" isPreview={isPreview} defaultOrder={AM_SECTION_IDS}>
      <section id="preguntas" style={{ padding:"clamp(56px,8vw,96px) clamp(16px,4vw,32px)", background: NEGRO, borderTop:`1px solid ${LINEA}` }}>
        <div data-ef="sube" className="am-faq" style={{ maxWidth:1280, margin:"0 auto", display:"grid", gap:"24px clamp(32px,5vw,72px)" }}>
          {/* La columna de la izquierda no queda vacía: foto (editable) y una salida para la duda que no está. */}
          <div className="am-faq-lado">
            <Encabezado acento={accent} tinta="#f4f4f5"
              kicker={<EditableZone field="faqKicker" label="Etiqueta de preguntas">Preguntas</EditableZone>}
              titulo={<EditableZone field="faqTitulo" label="Título de preguntas">Lo que todos nos preguntan</EditableZone>} />
            <div className="am-faq-foto" style={{ position:"relative", overflow:"hidden", aspectRatio:"4/3", borderRadius:4, border:`1px solid ${LINEA}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- foto elegida por el dueño */}
              <img src={iovr["faqImage"]?.url ?? "https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=900&q=80"} alt=""
                style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
              <span aria-hidden="true" style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(11,12,14,0.95) 0%, rgba(11,12,14,0.35) 55%, rgba(11,12,14,0.1) 100%)" }} />
              <div style={{ position:"absolute", left:0, right:0, bottom:0, padding:"clamp(18px,3vw,28px)" }}>
                <p style={{ margin:"0 0 6px", fontSize:"clamp(18px,2vw,22px)", fontWeight:800, color:"#fff", letterSpacing:-0.4, lineHeight:1.2 }}>
                  <EditableZone field="faqOtraTitulo" label="Título de la tarjeta de preguntas">¿Te quedó otra duda?</EditableZone>
                </p>
                <p style={{ margin:"0 0 16px", fontSize:14, color:"rgba(255,255,255,0.72)", lineHeight:1.55 }}>
                  <EditableZone field="faqOtraTexto" label="Texto de la tarjeta de preguntas">Preguntanos lo que quieras: te contesta una persona, no un robot.</EditableZone>
                </p>
                <a href={waLink ?? "#contacto"} {...(waLink ? { target:"_blank", rel:"noopener noreferrer" } : {})}
                  onClick={isPreview ? (e) => e.preventDefault() : undefined}
                  style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"12px 18px", borderRadius:2, background:accent, color:sobreAcento,
                    fontSize:13, fontWeight:800, letterSpacing:0.4, textDecoration:"none" }}>
                  {waLink ? <><WaIcon size={16} /> Escribinos</> : "Contactanos →"}
                </a>
              </div>
              <EditableImageButton field="faqImage" label="Foto de preguntas" />
            </div>
          </div>
          <PreguntasMotor acento={accent} preguntas={armarPreguntasAutos({ monedas: opciones.monedas.length ? opciones.monedas : [principal], conWhatsapp: !!waLink })} />
        </div>
      </section>
      </SectionBlock>

      {/* ── CONTACTO ── */}
      <SectionBlock id="am-contacto" label="Contacto" isPreview={isPreview} defaultOrder={AM_SECTION_IDS}>
      <section id="contacto" style={{ padding:"clamp(64px,10vw,120px) clamp(16px,4vw,32px)", position:"relative", overflow:"hidden",
        ...secBg(contactoImg, contactoBg), borderTop:`1px solid ${LINEA}` }}>
        <BgDragHandle imgKey="sectionbg_bgContacto" />
        <SectionOverlay ov={contactoImg} />
        <EditableSectionBg field="bgContacto" label="Fondo de contacto" />
        <div style={{ position:"relative", zIndex:1, maxWidth:880, margin:"0 auto", textAlign:"center" }}>
          <h2 style={{ margin:"0 0 18px", fontSize:"clamp(34px,6.4vw,80px)", fontWeight:900,
            color:conText, letterSpacing:"-0.04em", lineHeight:0.95 }}>
            <EditableZone field="contactHeading" label="Título de contacto">¿Encontraste el tuyo?</EditableZone>
          </h2>
          <p style={{ margin:"0 auto 36px", fontSize:16, color:conMid, lineHeight:1.7, maxWidth:480 }}>
            <EditableZone field="contactSubtext" label="Texto de contacto">Escribinos y coordinamos para que lo veas, sin compromiso.</EditableZone>
          </p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            {waLink && (
              <a href={waLink}
                target="_blank" rel="noopener noreferrer"
                style={{ display:"inline-flex", alignItems:"center", gap:10, background:"#25d366",
                  color:"white", textDecoration:"none", padding:"0 28px", minHeight:52, borderRadius:2,
                  fontWeight:800, fontSize:14 }}>
                <WaIcon size={20} />
                <EditableZone field="contactWhatsApp" label="Texto del botón de WhatsApp">Escribinos por WhatsApp</EditableZone>
              </a>
            )}
            <Link href={todos}
              style={{ display:"inline-flex", alignItems:"center", padding:"0 28px", minHeight:52, borderRadius:2,
                border:`1px solid ${conText === "#111111" ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.25)"}`, color:conText,
                textDecoration:"none", fontWeight:700, fontSize:14 }}>
              Ver todos los vehículos
            </Link>
          </div>
        </div>
      </section>
      </SectionBlock>
      </div>

      {/* ── PIE ── */}
      <footer style={{ position:"relative", padding:"clamp(40px,6vw,64px) clamp(16px,4vw,32px) 24px",
        ...secBg(footerImg, footerBg), borderTop:`1px solid ${LINEA}` }}>
        <BgDragHandle imgKey="sectionbg_bgFooter" />
        <SectionOverlay ov={footerImg} />
        <EditableSectionBg field="bgFooter" label="Fondo del pie" nombreBloque="Pie de la tienda" />
        <div style={{ position:"relative", zIndex:1, maxWidth:1280, margin:"0 auto" }}>
          {/* El pie ordenado (08/10/26): ver components/store/auto/PieDeAutos. */}
          <ContenidoPieAutos slug={slug} storeName={storeName} products={products} legales={config?.legales} enEditor={isPreview}
            whatsapp={whatsapp.enabled ? whatsapp.number : null} redes={config?.socialLinks} acento={accent} estilo="motor"
            colores={pieOscuro
              ? { tinta: "#ffffff", suave: ftMid, linea: "rgba(255,255,255,0.1)" }
              : { tinta: "#111827", suave: ftMid, linea: "rgba(17,24,39,0.12)" }}
            descripcion={<EditableZone field="footerFrase" label="Frase del pie">{FRASE_PIE}</EditableZone>}
            copyright={<EditableZone field="footerCopyright" label="Copyright">{`© ${new Date().getFullYear()} ${storeName}.`}</EditableZone>}
            onReportar={isOwner ? undefined : () => setShowReport(true)} />
        </div>
      </footer>

      {showReport && <ReportStoreModal slug={slug} onClose={() => setShowReport(false)} />}
      {/* El aviso de favoritos (guardado en este dispositivo / no se pudo guardar). */}
      {fav.aviso && (
        <div role="status" style={{ position:"fixed", left:16, right:16, bottom:20, zIndex: isPreview ? CAPAS.previaModal : 230, display:"flex", justifyContent:"center", pointerEvents:"none" }}>
          <div style={{ pointerEvents:"auto", display:"flex", alignItems:"center", gap:12, maxWidth:440, background:"#1b1d21", border:`1px solid ${LINEA}`, color:"#fff", borderRadius:4, padding:"12px 12px 12px 16px", boxShadow:"0 14px 40px rgba(0,0,0,0.5)", fontSize:13, lineHeight:1.45 }}>
            <span style={{ flex:1, overflowWrap:"anywhere" }}>{fav.aviso}</span>
            <button type="button" onClick={fav.cerrarAviso} aria-label="Cerrar aviso" style={{ flexShrink:0, width:32, height:32, borderRadius:2, border:"none", background:"rgba(255,255,255,0.1)", color:"#fff", fontSize:18, cursor:"pointer" }}>×</button>
          </div>
        </div>
      )}

      {/* ── BUSCADOR ──
          Va a SU capa (`CAPAS.buscador`), no a la de la barra: empatadas, la
          barra quedaba encima y se comía el clic de la ×. Cierra tocando afuera
          (comparando target con currentTarget) y con Escape. */}
      {searchOpen && (
        <div role="dialog" aria-modal="true" aria-label="Buscar vehículos" onClick={e => { if (e.target === e.currentTarget) setSearchOpen(false); }} style={{ position:"fixed", inset:0, zIndex:CAPAS.buscador, background:"rgba(11,12,14,0.96)", backdropFilter:"blur(10px)", display:"flex", flexDirection:"column", alignItems:"center", paddingTop:"clamp(72px,14vh,128px)" }}>
          <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(""); }} aria-label="Cerrar búsqueda"
            style={{ position:"absolute", top:16, right:16, width:44, height:44, background:"none", border:"none", color:"#fff", fontSize:28, cursor:"pointer", lineHeight:1 }}>×</button>
          <div style={{ width:"100%", maxWidth:720, padding:"0 clamp(16px,4vw,24px)", boxSizing:"border-box" }}>
            <input autoFocus type="search" aria-label="Buscar vehículos" maxLength={80} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Marca, modelo, año…"
              style={{ width:"100%", background:"transparent", border:"none", borderBottom:`2px solid ${accent}`, color:"#fff", fontSize:"clamp(22px,4vw,34px)", fontWeight:700, padding:"12px 0", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
          </div>
          {searchResults.length > 0 && (
            <div style={{ width:"100%", maxWidth:960, padding:"24px clamp(16px,4vw,24px) 24px", overflowY:"auto", boxSizing:"border-box" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:12 }}>
                {searchResults.slice(0, 24).map(p => (
                  <Link key={p.id} href={paginaDe(p)}
                    style={{ display:"block", background:"#141619", border:`1px solid ${LINEA}`, borderRadius:4, textDecoration:"none", color:"#fff", overflow:"hidden" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda */}
                    <img src={p.images[0] ?? ""} alt="" style={{ width:"100%", aspectRatio:"16/11", objectFit:"cover", display:"block", background:NEGRO }} />
                    <div style={{ padding:"10px 12px 12px" }}>
                      <p style={{ fontSize:13, fontWeight:700, margin:"0 0 4px" }}>{p.name}</p>
                      <p style={{ fontSize:13, color:accent, fontWeight:800, margin:0 }}>{p.price > 0 ? fmtPrice(p.price, monedaDe(p, currency)) : "Consultar"}</p>
                    </div>
                  </Link>
                ))}
              </div>
              {searchResults.length > 24 && (
                <Link href={linkAVehiculos(slug, { q: searchQuery.trim() }, isPreview)} style={{ display:"block", textAlign:"center", marginTop:18, color:accent, fontWeight:700, fontSize:14, textDecoration:"none" }}>
                  Ver los {searchResults.length} resultados →
                </Link>
              )}
            </div>
          )}
          {searchQuery.trim().length > 0 && searchResults.length === 0 && (
            <p style={{ color:"rgba(255,255,255,0.55)", marginTop:32, fontSize:14, padding:"0 16px", textAlign:"center", overflowWrap:"anywhere" }}>
              Nada con &ldquo;{searchQuery}&rdquo;. Probá con otra marca o modelo.
            </p>
          )}
        </div>
      )}

      {/* ── FAVORITOS ── */}
      <div role="dialog" aria-modal="true" aria-label="Favoritos" inert={!favoritesOpen} aria-hidden={!favoritesOpen} style={{ position:"fixed", inset:0, zIndex: isPreview ? CAPAS.previaModal : 205, pointerEvents: favoritesOpen ? "auto" : "none" }}>
        <div onClick={() => setFavoritesOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)", opacity: favoritesOpen ? 1 : 0, transition:"opacity 0.3s" }} />
        <div style={{ position:"absolute", top:0, right:0, bottom:0, width:420, maxWidth:"100vw", background:"#111215", color:"#fff", transform: favoritesOpen ? "translateX(0)" : "translateX(100%)", transition:"transform 0.35s cubic-bezier(.4,0,.2,1)", display:"flex", flexDirection:"column", borderLeft:`1px solid ${LINEA}` }}>
          <div style={{ padding:"16px 20px", borderBottom:`1px solid ${LINEA}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <p style={{ fontWeight:800, fontSize:16, margin:0, letterSpacing:-0.2 }}>Favoritos <span style={{ fontWeight:500, fontSize:13, color:"rgba(255,255,255,0.5)" }}>({favorites.length})</span></p>
            <button type="button" onClick={() => setFavoritesOpen(false)} aria-label="Cerrar favoritos" style={{ background:"none", border:"none", color:"#fff", fontSize:24, cursor:"pointer", width:44, height:44, marginRight:-10 }}>×</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"8px 20px" }}>
            {favoriteProducts.length === 0 ? (
              <div style={{ textAlign:"center", padding:"52px 0", color:"rgba(255,255,255,0.55)" }}>
                <p style={{ fontSize:13, lineHeight:1.8, margin:0 }}>Todavía no guardaste ninguno.<br/>Tocá el corazón de un vehículo para tenerlo acá.</p>
              </div>
            ) : favoriteProducts.map(product => (
              <div key={product.id} style={{ display:"flex", gap:14, padding:"14px 0", borderBottom:`1px solid ${LINEA}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda */}
                <img src={product.images[0] ?? ""} alt="" style={{ width:96, height:68, objectFit:"cover", borderRadius:2, flexShrink:0, background:NEGRO }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:14, fontWeight:700, margin:"0 0 4px", overflowWrap:"anywhere" }}>{product.name}</p>
                  <p style={{ fontSize:13, color:accent, fontWeight:800, margin:"0 0 10px" }}>{product.price > 0 ? fmtPrice(product.price, monedaDe(product, currency)) : "Consultar"}</p>
                  <div style={{ display:"flex", gap:8 }}>
                    <Link href={paginaDe(product)}
                      style={{ background:accent, color:sobreAcento, borderRadius:2, padding:"0 14px", minHeight:36, fontSize:12, fontWeight:700, textDecoration:"none", display:"inline-flex", alignItems:"center" }}>
                      Ver
                    </Link>
                    <button type="button" onClick={() => toggleFavorite(product.id)}
                      style={{ background:"transparent", color:"rgba(255,255,255,0.7)", border:`1px solid ${LINEA}`, borderRadius:2, padding:"0 14px", minHeight:36, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!editMode && waLink && (
        <a href={waLink} aria-label="Escribinos por WhatsApp"
          target="_blank" rel="noopener noreferrer"
          style={{ position:"fixed", bottom:24, right:24, zIndex:CAPAS.panel,
            background:"#25d366", color:"white", width:56, height:56,
            borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 6px 24px rgba(37,211,102,0.4)", textDecoration:"none" }}>
          <WaIcon size={24} />
        </a>
      )}
    </div>
  );
}
