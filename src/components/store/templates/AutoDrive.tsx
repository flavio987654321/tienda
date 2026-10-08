"use client";
import { ContenidoPieAutos, FRASE_PIE } from "@/components/store/auto/PieDeAutos";
import { useEfectosAlBajar } from "@/components/store/templates/shared/efectosAutos";
import { NewsletterForm } from "@/components/store/templates/shared/NewsletterForm";
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
import { WaIcon, fmtPrice } from "@/components/store/auto/AutoVehicleShared";
import { monedaDe, monedaDeTienda } from "@/lib/monedaVehiculo";
import { opcionesDeFiltro, linkAVehiculo, filtrarVehiculos, filtroVacio, datosDe } from "@/lib/filtroVehiculos";
import { SectionBlock } from "@/components/store/templates/shared/SectionBlock";
import { CAPAS } from "@/lib/capas-tienda";
import { videosDeVehiculos } from "@/components/store/auto/videosDeVehiculos";
import { armarPreguntasAutos } from "@/lib/preguntasFrecuentes";
import { BuscadorDrive } from "@/components/store/templates/drive/BuscadorDrive";
import { TarjetaDrive, DRIVE_TARJETA_CSS } from "@/components/store/templates/drive/TarjetaDrive";
import { TiposDrive, TIPOS_DRIVE_CSS } from "@/components/store/templates/drive/TiposDrive";
import { PresupuestoDrive, PRESUPUESTO_DRIVE_CSS, tramosDePrecio } from "@/components/store/templates/drive/PresupuestoDrive";
import { VideosDrive, VIDEOS_DRIVE_CSS } from "@/components/store/templates/drive/VideosDrive";
import { VenderDrive, VENDER_DRIVE_CSS } from "@/components/store/templates/drive/VenderDrive";
import { PreguntasDrive } from "@/components/store/templates/drive/PreguntasDrive";

/**
 * Auto Drive (rehecho el 07/10/26): la portada clara, tipo portal de autos.
 * Arriba manda el buscador (comprar / vender mi usado / encargar); después
 * tipos, recién ingresados, tramos de precio, la tasación, videos, por qué
 * comprar acá, números, nosotros, preguntas y contacto. Lenguaje propio:
 * tarjetas blancas redondeadas sobre gris claro (Auto Motor es el oscuro).
 * La lógica es la compartida de autos (lib/filtroVehiculos, components/store/auto).
 */

function smoothScrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}
function secBg(ov: ImageOverride | undefined, fallback: string): React.CSSProperties {
  if (ov?.url) return { backgroundImage: `url(${ov.url})`, backgroundSize: "cover", backgroundPosition: `${ov.posX ?? 50}% ${ov.posY ?? 50}%` };
  return { background: fallback };
}
function secText(ov: ImageOverride | undefined, bg: string): string {
  if (ov?.url) return ov.overlayType === "light" ? "#0f172a" : "#ffffff";
  return getContrastColor(bg) === "light" ? "#ffffff" : "#0f172a";
}
function secMid(ov: ImageOverride | undefined, bg: string): string {
  if (ov?.url) return ov.overlayType === "light" ? "#475569" : "rgba(255,255,255,0.7)";
  return getContrastColor(bg) === "light" ? "rgba(255,255,255,0.7)" : "#475569";
}
function SectionOverlay({ ov }: { ov: ImageOverride | undefined }) {
  if (!ov?.url || ov.overlayType === "none") return null;
  return (
    <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none",
      background: ov.overlayType==="light"
        ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})`
        : `rgba(0,0,0,${ov.overlayOpacity ?? 0.55})` }} />
  );
}

const SVC_ICON_SETS = [
  ["📋","✅","🔍","📑","🏅","🔬","🛡️","🏆"],
  ["🔁","💰","🤝","📊","💵","🏧","💸","📈"],
  ["🔔","📣","🎯","📞","💬","🌟","🧑‍💼","🎓"],
  ["💬","📱","📞","🤝","👋","🌟","🧑‍💼","✉️"],
];

/** Gris claro de fondo, tinta azul pizarra y la línea de las tarjetas. */
const FONDO = "#f4f6f9";
const TINTA = "#0f172a";
const LINEA = "#e8ebf0";

const AD_SECTION_IDS = ["ad-filtros", "ad-catalogo", "ad-presupuesto", "ad-tasar", "ad-novedades", "ad-videos", "ad-servicios", "ad-stats", "ad-nosotros", "ad-preguntas", "ad-contacto"];

/** El título de cada bloque: etiqueta en pastilla y título grande. */
function Titulo({ acento, tinta = TINTA, kicker, titulo, derecha, centrado }: { acento: string; tinta?: string; kicker: React.ReactNode; titulo: React.ReactNode; derecha?: React.ReactNode; centrado?: boolean }) {
  return (
    <div data-ef="titulo" style={{ display:"flex", alignItems:"flex-end", justifyContent: centrado ? "center" : "space-between", textAlign: centrado ? "center" : undefined,
      gap:16, marginBottom:28, flexWrap:"wrap" }}>
      <div style={{ minWidth:0 }}>
        <p className="ef-etiqueta" style={{ margin:"0 0 12px", display:"inline-flex", alignItems:"center", gap:8, fontSize:12, fontWeight:800, color:acento,
          background:`${acento}14`, padding:"6px 12px", borderRadius:999 }}>
          {kicker}
        </p>
        <h2 style={{ margin:0, fontSize:"clamp(26px,4vw,44px)", fontWeight:900, color:tinta, letterSpacing:-1.4, lineHeight:1.05 }}>
          {titulo}
        </h2>
      </div>
      {derecha}
    </div>
  );
}

export default function AutoDrive() {
  const config       = useStoreConfig();
  const pushBell     = usePushBell();
  const { products, loadingProducts } = useStorefront();
  const { editMode, overrides, setOverride, hiddenSections } = useEditContext();
  /* El menú sólo a secciones que se ven (5.3 de la auditoría): un link a un
     bloque oculto no hacía nada. En el menú del celular, tampoco a las que el
     dueño ocultó sólo en el celular. */
  const ocultas = config?.hiddenSections ?? hiddenSections;
  const ocultasCelu = config?.hiddenSectionsCelular ?? [];
  const menuAncho = [["Vehículos","catálogo","ad-catalogo"],["Vendé tu usado","tasar","ad-tasar"],["Preguntas","preguntas","ad-preguntas"],["Contacto","contacto","ad-contacto"]].filter(([, , b]) => !ocultas.includes(b));
  const menuCelu = menuAncho.filter(([, , b]) => !ocultasCelu.includes(b));
  const isPreview    = !!config?.previewFill;
  // Efectos al bajar: en el editor no (ahí todo tiene que verse para editarlo).
  useEfectosAlBajar(!isPreview);
  /** Rellenar con ejemplos y hablarle a la dueña son dos cosas distintas: la demo
   *  pública de `/plantillas/[id]` necesita lo primero y no lo segundo. */
  const enEditor     = isPreview && !config?.demoPublica;
  const isOwner      = !!config?.isOwner;
  const accent       = config?.colors.accent ?? "#2563eb";
  const sobreAcento  = getContrastColor(accent) === "dark" ? "#111" : "#fff";
  const currency     = config?.currency ?? "ARS";
  const principal    = monedaDeTienda({ currency });
  const slug         = config?.slug ?? "";
  const storeName    = config?.storeName ?? "AUTO DRIVE";
  const whatsapp     = config?.whatsapp ?? { enabled:false, number:"", message:"" };
  /* El link armado con `linkWhatsApp` (06/10/26): saca el 0 y el 15, pone el
     549 a un celular escrito sin país, y descarta el número de muestra. */
  const waLink = whatsapp.enabled ? linkWhatsApp(whatsapp.number, whatsapp.message) : null;
  // Lo que la tienda tiene (ver lib/filtroVehiculos): buscador, tipos, tramos y números.
  const opciones = useMemo(() => opcionesDeFiltro(products, currency), [products, currency]);
  // Los videos que ya están en cada vehículo (no se sube nada aparte).
  const videos = useMemo(() => videosDeVehiculos(products), [products]);
  const hayTramos = useMemo(() => tramosDePrecio(products, principal).length > 0, [products, principal]);

  const iovr = config?.imageOverrides ?? {};
  const sc   = config?.sectionColors  ?? {};

  const heroImgUrl  = iovr["heroImage"]?.url
    ?? "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80";
  const nosotrosUrl = iovr["nosotrosImage"]?.url
    ?? "https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?auto=format&fit=crop&w=900&q=80";
  const tasarUrl    = iovr["tasarImage"]?.url
    ?? "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=900&q=80";
  const faqUrl      = iovr["faqImage"]?.url
    ?? "https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=900&q=80";

  const heroBg      = sc["bgHero"]      ?? FONDO;
  const heroImg     = iovr["sectionbg_bgHero"];
  const heroText    = secText(heroImg, heroBg);
  const heroMid     = secMid(heroImg, heroBg);

  const catsBg      = sc["bgCategorias"] ?? "#ffffff";
  const catsImg     = iovr["sectionbg_bgCategorias"];
  const catsText    = secText(catsImg, catsBg);

  const catalogoBg  = sc["bgCatalogo"]   ?? FONDO;
  const catalogoImg = iovr["sectionbg_bgCatalogo"];
  const catText     = secText(catalogoImg, catalogoBg);
  const catMid      = secMid(catalogoImg, catalogoBg);

  const statsBg     = sc["bgStats"]      ?? "#ffffff";
  const statsImg    = iovr["sectionbg_bgStats"];
  const statsText   = secText(statsImg, statsBg);
  const statsMid    = secMid(statsImg, statsBg);

  const serviciosBg = sc["bgServicios"]  ?? "#ffffff";
  const serviciosImg= iovr["sectionbg_bgServicios"];
  const svcText     = secText(serviciosImg, serviciosBg);
  const svcMid      = secMid(serviciosImg, serviciosBg);

  const nosotrosBg  = sc["bgNosotros"]   ?? FONDO;
  const nosotrosImg2= iovr["sectionbg_bgNosotros"];
  const nosText     = secText(nosotrosImg2, nosotrosBg);
  const nosMid      = secMid(nosotrosImg2, nosotrosBg);

  const contactoBg  = sc["bgContacto"]   ?? "#ffffff";
  const contactoImg = iovr["sectionbg_bgContacto"];

  const footerBg    = sc["bgFooter"]     ?? TINTA;
  const footerImg   = iovr["sectionbg_bgFooter"];
  const ftMid       = secMid(footerImg, footerBg);
  const pieOscuro   = !!footerImg?.url || getContrastColor(footerBg) === "light";

  const navBg          = sc["navBg"] ?? "#ffffff";
  const navDark        = getContrastColor(navBg) === "light";
  const navText        = navDark ? "#ffffff" : TINTA;
  const navTextMid     = navDark ? "rgba(255,255,255,0.7)" : "#475569";
  const navBorderColor = navDark ? "rgba(255,255,255,0.2)" : LINEA;

  const { cargando, logueado, nombreMostrado, panelHref, panelLabel, signOut } = useSesion();
  const [menuOpen,         setMenuOpen]         = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  /** Cada vehículo tiene su página (07/10/26; antes, una ventana sobre la portada). */
  const paginaDe = (p: StorefrontProduct) => linkAVehiculo(slug, p.id, isPreview);
  const [scrolled,   setScrolled]   = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [annIdx,     setAnnIdx]     = useState(0);
  const [annVisible, setAnnVisible] = useState(true);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState("");
  /** El tipo elegido en "Recién ingresados" ("" = todos). */
  const [tipoVista, setTipoVista] = useState("");

  // Lo que se ve si el dueño no escribió su barra: sólo lo que la tienda HACE
  // (ficha, tasación, búsquedas). Antes prometía financiación, inspección y
  // envío a todo el país en nombre de agencias que no los ofrecen (5.2).
  const DEFAULTS = ["📋 Ficha técnica de cada vehículo", "🔁 Tasá tu usado online", "🔔 Te avisamos si entra lo que buscás"];
  const promoBannerEnabled = config?.promoBanner?.enabled !== false;
  const annMessages        = (config?.promoBanner?.messages?.filter(m => m.trim()) ?? []).length > 0
    ? config!.promoBanner!.messages!.filter(m => m.trim())
    : DEFAULTS;
  const showAnn  = promoBannerEnabled && annVisible;
  const PROMO_H  = 36;
  const NAV_H    = 68;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  /* Escape cierra el buscador y los favoritos (5.6 de la auditoría). */
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

  // "Recién ingresados": hasta 8, del tipo elegido (con las pestañas de los tipos que hay).
  const tiposVista = opciones.tipos.length > 1 ? opciones.tipos.slice(0, 5) : [];
  const delTipo = tipoVista ? products.filter(p => datosDe(p, currency).tipo === tipoVista) : products;
  const showcased = delTipo.slice(0, 8);
  const linkTodos = `/tienda/${slug}/vehiculos${isPreview ? "?from=editor" : ""}`;

  /* Números: vehículos y marcas se cuentan de verdad; años y satisfacción son
     del negocio, y se ven sólo si el dueño los escribió (en el editor, siempre). */
  const stats = [
    { fv:"stat1", fl:"statLabel1", n:String(products.length), l:"Vehículos disponibles", propio:false },
    { fv:"stat2", fl:"statLabel2", n:"15",   l:"Años en el mercado", propio:true },
    { fv:"stat3", fl:"statLabel3", n:"98%",  l:"Clientes conformes", propio:true },
    { fv:"stat4", fl:"statLabel4", n:String(opciones.marcas.length), l:"Marcas", propio:false },
  ].filter(s => !!overrides[s.fv]?.text?.trim() || (s.propio ? editMode : s.n !== "0"));

  const avisoVacio = (texto: string) => (
    <p style={{ margin:0, padding:"28px 22px", border:`1.5px dashed #cbd5e1`, borderRadius:18, color:"#475569", fontSize:14, lineHeight:1.6, background:"#fff" }}>{texto}</p>
  );

  return (
    <div style={{ background:FONDO, color:TINTA,
      fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", minHeight:"100vh" }}>
      <style>{`
        ${DRIVE_TARJETA_CSS}
        ${TIPOS_DRIVE_CSS}
        ${PRESUPUESTO_DRIVE_CSS}
        ${VIDEOS_DRIVE_CSS}
        ${VENDER_DRIVE_CSS}
        .ad-nav-links { display:none }
        @media(min-width:960px){ .ad-nav-links { display:flex } .ad-burger { display:none } }
        .ad-hero { grid-template-columns:1fr }
        .ad-hero-foto { display:none }
        @media(min-width:1000px){ .ad-hero { grid-template-columns:minmax(0,1.1fr) minmax(0,0.9fr) } .ad-hero-foto { display:block } }
        .bd-grilla { grid-template-columns:1fr }
        @media(min-width:560px){ .bd-grilla { grid-template-columns:repeat(2,minmax(0,1fr)) } .bd-q { grid-column:1 / -1 } }
        .ad-grilla { display:grid; gap:16px; grid-template-columns:1fr }
        /* En el celular, los vehículos en una tira que se desliza: uno abajo del otro, la portada medía once pantallas. */
        @media(max-width:559px){ .ad-grilla { display:flex; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none; margin:0 -16px !important; padding:4px 16px 12px !important; scroll-padding:0 16px }
          .ad-grilla::-webkit-scrollbar { display:none } .ad-grilla > * { flex:0 0 82%; scroll-snap-align:start } }
        @media(min-width:560px){ .ad-grilla { grid-template-columns:repeat(2,minmax(0,1fr)) } }
        @media(min-width:900px){ .ad-grilla { grid-template-columns:repeat(3,minmax(0,1fr)) } }
        @media(min-width:1200px){ .ad-grilla { grid-template-columns:repeat(4,minmax(0,1fr)) } }
        .ad-pestanas { display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; padding:2px }
        .ad-pestanas::-webkit-scrollbar { display:none }
        .ad-about { grid-template-columns:1fr }
        @media(min-width:860px){ .ad-about { grid-template-columns:1fr 1fr } }
        .ad-svc { grid-template-columns:1fr }
        @media(min-width:600px){ .ad-svc { grid-template-columns:repeat(2,minmax(0,1fr)) } }
        @media(min-width:1100px){ .ad-svc { grid-template-columns:repeat(4,minmax(0,1fr)) } }
        .ad-stats { display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)) }
        .ad-faq { grid-template-columns:1fr }
        @media(min-width:960px){ .ad-faq { grid-template-columns:minmax(0,0.85fr) minmax(0,1.3fr); align-items:start } .ad-faq-lado { position:sticky; top:110px } }
        /* En el celular, primero las preguntas y después la tarjeta de "otra duda". */
        @media(max-width:959px){ .ad-faq { display:flex !important; flex-direction:column } .ad-faq-lado { display:contents } .ad-faq-lista { order:1 } .ad-faq-tarjeta { order:2 } }
        @keyframes ad-brillo { 0% { background-position:-400px 0 } 100% { background-position:400px 0 } }
        .ad-esqueleto { background:linear-gradient(90deg,#eef0f3 0,#f8fafc 50%,#eef0f3 100%); background-size:800px 100%; animation:ad-brillo 1.2s infinite linear }
        @keyframes ad-sube { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:none } }
        .ad-entra { animation: ad-sube .6s cubic-bezier(.2,.7,.2,1) both }
        .ad-svc-card { transition:box-shadow .25s, transform .25s }
        .ad-svc-card:hover { box-shadow:0 14px 34px rgba(15,23,42,.08) !important; transform:translateY(-2px) }
        .ad-link-nav:hover { color: ${navText} !important }
        /* Recibí los ingresos por mail: texto y campo lado a lado; en angosto, uno abajo del otro. */
        .ad-novedades { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:clamp(18px,3vw,40px); align-items:center }
        @media (max-width: 860px) { .ad-novedades { grid-template-columns:minmax(0,1fr) } }
        /* Efectos al bajar (08/10/26), ver shared/efectosAutos: suaves, de portal. */
        @keyframes ad-ef-aparece { from { opacity:0; transform:translateY(14px) scale(.985) } to { opacity:1; transform:none } }
        @keyframes ad-ef-pop { 0% { opacity:0; transform:scale(.8) } 70% { opacity:1; transform:scale(1.06) } 100% { opacity:1; transform:none } }
        .ef-listo [data-ef="sube"]:not(.ef-in) > *, .ef-listo [data-ef="grilla"]:not(.ef-in) > * { opacity:0 }
        .ef-listo [data-ef="sube"].ef-in > * { animation: ad-ef-aparece .6s cubic-bezier(.2,.7,.2,1) backwards }
        .ef-listo [data-ef="grilla"].ef-in > * { animation: ad-ef-aparece .55s cubic-bezier(.2,.7,.2,1) backwards }
        .ef-listo [data-ef="sube"].ef-in > :nth-child(2) { animation-delay:0.06s }
        .ef-listo [data-ef="sube"].ef-in > :nth-child(3) { animation-delay:0.12s }
        .ef-listo [data-ef="sube"].ef-in > :nth-child(4) { animation-delay:0.18s }
        .ef-listo [data-ef="sube"].ef-in > :nth-child(5) { animation-delay:0.24s }
        .ef-listo [data-ef="sube"].ef-in > :nth-child(6) { animation-delay:0.30s }
        .ef-listo [data-ef="sube"].ef-in > :nth-child(7) { animation-delay:0.36s }
        .ef-listo [data-ef="sube"].ef-in > :nth-child(8) { animation-delay:0.42s }
        .ef-listo [data-ef="grilla"].ef-in > :nth-child(2) { animation-delay:0.08s }
        .ef-listo [data-ef="grilla"].ef-in > :nth-child(3) { animation-delay:0.16s }
        .ef-listo [data-ef="grilla"].ef-in > :nth-child(4) { animation-delay:0.24s }
        .ef-listo [data-ef="grilla"].ef-in > :nth-child(5) { animation-delay:0.32s }
        .ef-listo [data-ef="grilla"].ef-in > :nth-child(6) { animation-delay:0.40s }
        .ef-listo [data-ef="grilla"].ef-in > :nth-child(7) { animation-delay:0.48s }
        .ef-listo [data-ef="grilla"].ef-in > :nth-child(8) { animation-delay:0.56s }
        .ef-listo [data-ef="titulo"]:not(.ef-in) .ef-etiqueta { opacity:0 }
        .ef-listo [data-ef="titulo"].ef-in .ef-etiqueta { animation: ad-ef-pop .55s .15s cubic-bezier(.2,.7,.2,1) backwards }
        .ef-listo [data-ef].ef-ya > *, .ef-listo [data-ef].ef-ya .ef-etiqueta { animation:none !important }
        @media (prefers-reduced-motion: reduce) { .ad-entra, .ad-esqueleto { animation:none } .ad-svc-card:hover { transform:none } }
      `}</style>

      {/* ── BARRA DE AVISOS ── */}
      {showAnn && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top:0,
          left: isPreview ? undefined : 0, right: isPreview ? undefined : 0,
          zIndex: isPreview ? CAPAS.previaNavAlto : 110, height:PROMO_H, background:TINTA,
          display:"flex", alignItems:"center", justifyContent:"center", padding:"0 40px" }}>
          <span style={{ fontSize:12, fontWeight:600, color:"#fff", letterSpacing:0.2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {annMessages[annIdx]}
          </span>
          {annMessages.length > 1 && (
            <div style={{ position:"absolute", bottom:4, left:"50%", transform:"translateX(-50%)", display:"flex", gap:4 }}>
              {annMessages.map((_,i) => (
                <button key={i} type="button" onClick={() => setAnnIdx(i)} aria-label={`Ver el aviso ${i + 1}`}
                  style={{ width: i===annIdx ? 14 : 5, height:3, border:"none", borderRadius:2,
                    background: i===annIdx ? accent : "rgba(255,255,255,0.35)", cursor:"pointer", padding:0, transition:"all 0.3s" }} />
              ))}
            </div>
          )}
          <button type="button" onClick={() => setAnnVisible(false)} aria-label="Cerrar la barra de avisos"
            style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", width:32, height:32,
              background:"none", border:"none", color:"#fff", cursor:"pointer", fontSize:18, opacity:0.7 }}>×</button>
        </div>
      )}

      {/* ── BARRA DE ARRIBA ── */}
      <nav style={{ position: isPreview ? "sticky" : "fixed",
        top: showAnn ? PROMO_H : 0,
        left: isPreview ? undefined : 0, right: isPreview ? undefined : 0,
        zIndex: isPreview ? CAPAS.previaNav : 100,
        background: navBg,
        borderBottom: `1px solid ${scrolled ? navBorderColor : "transparent"}`,
        boxShadow: scrolled ? (navDark ? "0 2px 16px rgba(0,0,0,0.25)" : "0 4px 20px rgba(15,23,42,0.06)") : "none",
        transition: "box-shadow .3s, border-color .3s", padding:"0 clamp(16px,3vw,28px)" }}>
        <div style={{ maxWidth:1240, margin:"0 auto", height: scrolled && !isPreview ? NAV_H - 12 : NAV_H, transition:"height .3s cubic-bezier(.2,.7,.2,1)", gap:12,
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0,
            fontWeight:900, fontSize:"clamp(16px,2vw,19px)", color:navText, letterSpacing:-0.5 }}>
            <span aria-hidden="true" style={{ width:30, height:30, borderRadius:9, background:accent, color:sobreAcento, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width={18} height={18} viewBox="0 0 48 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M4 17v-4.5l6.5-1.5 4.5-5h15l6 5 7 1.5V17" /><circle cx="13" cy="17.5" r="3.5" /><circle cx="35" cy="17.5" r="3.5" /></svg>
            </span>
            <span style={{ minWidth:0, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", lineHeight:1.1 }}>
              <EditableZone field="storeName" label="Nombre de la tienda">{storeName}</EditableZone>
            </span>
            <VerifiedIconButton isVerified={config?.isVerified} info={config?.verifiedInfo} color={navText} />
          </div>
          <div className="ad-nav-links" style={{ gap:4, alignItems:"center" }}>
            {menuAncho.map(([lbl,id]) => (
              <button key={id} type="button" onClick={() => smoothScrollTo(id)} className="ad-link-nav"
                style={{ background:"none", border:"none", color:navTextMid, cursor:"pointer", padding:"10px 14px", borderRadius:10,
                  fontSize:14, fontWeight:600, fontFamily:"inherit", transition:"color 0.15s" }}>
                {lbl}
              </button>
            ))}
          </div>
          {/* Grupo derecho — búsqueda + favoritos + campanita + usuario + menú del celular */}
          <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
            <button type="button" onClick={() => setSearchOpen(true)} aria-label="Abrir el buscador"
              style={{ background:"none", border:"none", color:navTextMid, cursor:"pointer", padding:8, display:"flex", alignItems:"center" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <button type="button" onClick={() => setFavoritesOpen(true)} aria-label="Favoritos"
              style={{ position:"relative", background:"none", border:"none", color:navTextMid, cursor:"pointer", padding:8, display:"flex", alignItems:"center" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill={favorites.length > 0 ? "#ef4444" : "none"} stroke={favorites.length > 0 ? "#ef4444" : "currentColor"} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {favorites.length > 0 && <span style={{ position:"absolute", top:2, right:0, background:"#ef4444", color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{favorites.length}</span>}
            </button>
            {pushBell && config?.showPushBell && !isPreview && (
              <StoreFollowButton storeSlug={slug} color={navTextMid} size={20} />
            )}
            {pushBell && config?.showPushBell && !isPreview && (
              <button type="button" onClick={pushBell.openDrawer} aria-label="Novedades de la tienda"
                style={{ position:"relative", background:"none", border:"none", color:navTextMid,
                  cursor:"pointer", padding:8, display:"flex", alignItems:"center" }}>
                <svg width={20} height={20} viewBox="0 0 24 24"
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
                  style={{ padding:8, display:"flex", alignItems:"center", color:navTextMid, background:"none", border:"none", cursor:"default", opacity:0.85 }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                </button>
                <button type="button" onClick={config.onPreviewBellClick}
                  style={{ padding:8, display:"flex", alignItems:"center", color:navTextMid, background:"none", border:"none", cursor:"pointer" }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={config?.onPreviewBellClick} title="🔒 Solo Plan Plus"
                  style={{ position:"relative", padding:8, display:"flex", alignItems:"center", color:navTextMid, opacity:0.5, background:"none", border:"none", cursor:"pointer" }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                  <span style={{ position:"absolute", top:4, right:4, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
                </button>
                <button type="button" onClick={config?.onPreviewBellClick} title="🔒 Solo Plan Plus"
                  style={{ position:"relative", padding:8, display:"flex", alignItems:"center", color:navTextMid, opacity:0.5, background:"none", border:"none", cursor:"pointer" }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  <span style={{ position:"absolute", top:4, right:4, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
                </button>
              </>
            ))}
            {/* Mi cuenta */}
            <div ref={userDropdownRef} style={{ position:"relative" }}>
              <button type="button" onClick={() => setUserDropdownOpen(o => !o)} aria-label="Mi cuenta" aria-expanded={userDropdownOpen}
                style={{ background:"none", border:"none", color:navTextMid, cursor:"pointer", padding:8, display:"flex", alignItems:"center" }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </button>
              {userDropdownOpen && (
                <div style={{ position:"absolute", top:"calc(100% + 10px)", right:0, background:navBg, border:`1px solid ${navBorderColor}`, borderRadius:14, minWidth:200, zIndex:CAPAS.flotante, boxShadow:"0 14px 34px rgba(15,23,42,0.16)", overflow:"hidden" }}>
                  {cargando ? (<p style={{ padding:"14px 16px", margin:0, fontSize:12, opacity:0.55 }}>Cargando…</p>) : logueado ? (
                    <>
                      <p style={{ padding:"12px 16px 4px", fontSize:11, color:navTextMid, margin:0, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {nombreMostrado}
                      </p>
                      <a href={panelHref} onClick={() => setUserDropdownOpen(false)}
                        style={{ display:"block", padding:"11px 16px", fontSize:14, color:navText, textDecoration:"none", borderBottom:`1px solid ${navBorderColor}` }}>{panelLabel}</a>
                      <button type="button" onClick={() => { if (isPreview) return; setUserDropdownOpen(false); signOut("/"); }}
                        style={{ display:"block", width:"100%", padding:"11px 16px", fontSize:14, color:"#ef4444", background:"none", border:"none", textAlign:"left", fontFamily:"inherit", cursor: isPreview ? "default" : "pointer", opacity: isPreview ? 0.45 : 1 }}>Cerrar sesión</button>
                    </>
                  ) : (
                    <>
                      <a href={isPreview ? undefined : `/login?redirect=/tienda/${config?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)}
                        style={{ display:"block", padding:"12px 16px", fontSize:14, color:navText, textDecoration:"none", borderBottom:`1px solid ${navBorderColor}`, cursor: isPreview ? "default" : "pointer" }}>Iniciar sesión</a>
                      <a href={isPreview ? undefined : `/registro?plan=buyer&redirect=/tienda/${config?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)}
                        style={{ display:"block", padding:"12px 16px", fontSize:14, color:navText, textDecoration:"none", cursor: isPreview ? "default" : "pointer" }}>Registrarse</a>
                    </>
                  )}
                </div>
              )}
            </div>
            <Link href={linkTodos} className="ad-nav-links"
              style={{ marginLeft:6, alignItems:"center", background:accent, color:sobreAcento, padding:"0 18px", minHeight:42, fontSize:14, fontWeight:800,
                textDecoration:"none", borderRadius:12 }}>
              Ver vehículos
            </Link>
            <button className="ad-burger" type="button" onClick={() => setMenuOpen(m => !m)} aria-label={menuOpen ? "Cerrar el menú" : "Abrir el menú"} aria-expanded={menuOpen}
              style={{ background:"none", border:`1px solid ${navBorderColor}`, borderRadius:10,
                color:navText, width:42, height:42, cursor:"pointer", fontSize:18, marginLeft:4 }}>
              {menuOpen ? "×" : "☰"}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div style={{ background:navBg, borderTop:`1px solid ${navBorderColor}`, padding:"8px clamp(16px,3vw,28px) 18px" }}>
            {menuCelu.map(([lbl,id]) => (
              <button key={id} type="button" onClick={() => { smoothScrollTo(id); setMenuOpen(false); }}
                style={{ display:"block", width:"100%", background:"none", border:"none",
                  color:navText, cursor:"pointer", textAlign:"left", fontFamily:"inherit",
                  padding:"14px 0", fontSize:15, fontWeight:600, borderBottom:`1px solid ${navBorderColor}` }}>
                {lbl}
              </button>
            ))}
            <Link href={linkTodos} onClick={() => setMenuOpen(false)}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", marginTop:14, minHeight:48, borderRadius:12,
                background:accent, color:sobreAcento, fontSize:15, fontWeight:800, textDecoration:"none" }}>
              Ver todos los vehículos
            </Link>
          </div>
        )}
      </nav>

      {/* ── PORTADA: el buscador manda ── */}
      <section style={{ paddingTop: isPreview ? 0 : (showAnn ? PROMO_H + NAV_H : NAV_H),
        position:"relative", ...secBg(heroImg, heroBg), overflow:"hidden" }}>
        <BgDragHandle imgKey="sectionbg_bgHero" />
        <SectionOverlay ov={heroImg} />
        <EditableSectionBg field="bgHero" label="Fondo de la portada" nombreBloque="Banner principal" />
        {/* Dos manchas suaves del color de la tienda, de fondo. */}
        <span aria-hidden="true" style={{ position:"absolute", width:520, height:520, borderRadius:"50%", top:-220, right:-160, background:accent, opacity:0.08, filter:"blur(10px)", zIndex:0 }} />
        <span aria-hidden="true" style={{ position:"absolute", width:340, height:340, borderRadius:"50%", bottom:-180, left:-120, background:accent, opacity:0.06, zIndex:0 }} />
        <div className="ad-hero" style={{ position:"relative", zIndex:1, maxWidth:1240, margin:"0 auto", display:"grid", gap:"28px clamp(28px,4vw,56px)",
          alignItems:"center", padding:"clamp(28px,5vw,64px) clamp(16px,3vw,28px) clamp(40px,6vw,80px)" }}>
          <div className="ad-entra" style={{ minWidth:0 }}>
            {!loadingProducts && products.length > 0 && (
              <p style={{ margin:"0 0 18px", display:"inline-flex", alignItems:"center", gap:8, background:"#fff", borderRadius:999, padding:"7px 14px 7px 10px",
                boxShadow:"0 2px 10px rgba(15,23,42,0.06)", fontSize:13, fontWeight:700, color:TINTA }}>
                <span aria-hidden="true" style={{ width:8, height:8, borderRadius:"50%", background:"#22c55e", boxShadow:"0 0 0 4px rgba(34,197,94,0.18)" }} />
                {products.length} {products.length === 1 ? "vehículo disponible" : "vehículos disponibles"}
              </p>
            )}
            <p style={{ margin:"0 0 10px", fontSize:14, fontWeight:800, color:accent }}>
              <EditableZone field="heroKicker" label="Etiqueta de la portada">Usados y 0 km</EditableZone>
            </p>
            <h1 style={{ margin:"0 0 16px", fontSize:"clamp(34px,5.4vw,64px)", fontWeight:900, color:heroText, letterSpacing:"-0.04em", lineHeight:1 }}>
              <EditableZone field="heroHeading" label="Título de la portada">Encontrá tu próximo vehículo</EditableZone>
            </h1>
            <p style={{ margin:"0 0 28px", fontSize:"clamp(15px,1.5vw,17px)", color:heroMid, lineHeight:1.65, maxWidth:520 }}>
              <EditableZone field="heroSubtext" label="Subtítulo de la portada">Con la ficha técnica completa y el precio a la vista. Buscá, tasá tu usado o dejanos lo que buscás y te avisamos.</EditableZone>
            </p>
            <BuscadorDrive slug={slug} productos={products} opciones={opciones} principal={principal} acento={accent} enEditor={isPreview}
              storeId={config?.storeId} isOwner={isOwner} isPreview={isPreview} />
          </div>
          <div className="ad-hero-foto" style={{ position:"relative", alignSelf:"stretch", minHeight:460 }}>
            <div style={{ position:"absolute", inset:0, borderRadius:32, overflow:"hidden", boxShadow:"0 30px 60px rgba(15,23,42,0.18)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- foto elegida por el dueño */}
              <img src={heroImgUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
              {(() => {
                const ov = iovr["heroImage"];
                if (!ov?.overlayType || ov.overlayType==="none") return null;
                return <div style={{ position:"absolute", inset:0, pointerEvents:"none",
                  background: ov.overlayType==="light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.45})` }} />;
              })()}
              <EditableImageButton field="heroImage" label="Foto de la portada" />
            </div>
            {/* Tarjetitas flotantes: lo que la tienda tiene, contado de verdad. */}
            {opciones.marcas.length > 1 && (
              <div style={{ position:"absolute", left:-24, bottom:40, background:"#fff", borderRadius:18, padding:"14px 18px", boxShadow:"0 16px 40px rgba(15,23,42,0.16)" }}>
                <p style={{ margin:0, fontSize:26, fontWeight:900, color:TINTA, lineHeight:1, letterSpacing:-1 }}>{opciones.marcas.length}</p>
                <p style={{ margin:"4px 0 0", fontSize:12, fontWeight:600, color:"#64748b" }}>marcas para elegir</p>
              </div>
            )}
            <div style={{ position:"absolute", right:20, top:20, display:"flex", alignItems:"center", gap:10, background:"#fff", borderRadius:14, padding:"10px 14px", boxShadow:"0 12px 30px rgba(15,23,42,0.14)" }}>
              <span aria-hidden="true" style={{ width:32, height:32, borderRadius:10, background:`${accent}1a`, color:accent, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>
              </span>
              <span style={{ fontSize:13, fontWeight:700, color:TINTA }}>Ficha técnica<br/><span style={{ fontWeight:500, color:"#64748b" }}>en cada vehículo</span></span>
            </div>
          </div>
        </div>
      </section>

      <div style={{ display:"flex", flexDirection:"column" }}>
      {/* ── EXPLORÁ POR TIPO ── */}
      <SectionBlock id="ad-filtros" label="Explorá por tipo" isPreview={isPreview} defaultOrder={AD_SECTION_IDS}>
      {(opciones.tipos.length > 1 || opciones.marcas.length > 1) ? (
      <section style={{ padding:"clamp(44px,6vw,72px) clamp(16px,3vw,28px)", position:"relative", ...secBg(catsImg, catsBg) }}>
        <BgDragHandle imgKey="sectionbg_bgCategorias" />
        <SectionOverlay ov={catsImg} />
        <EditableSectionBg field="bgCategorias" label="Fondo de los tipos" />
        <div data-ef="sube" style={{ position:"relative", zIndex:1, maxWidth:1240, margin:"0 auto" }}>
          <Titulo acento={accent} tinta={catsText}
            kicker={<EditableZone field="tiposKicker" label="Etiqueta de los tipos">{opciones.tipos.length > 1 ? "Por tipo" : "Por marca"}</EditableZone>}
            titulo={<EditableZone field="tiposHeading" label="Título de los tipos">¿Qué estás buscando?</EditableZone>} />
          <TiposDrive opciones={opciones} slug={slug} enEditor={isPreview} acento={accent} />
        </div>
      </section>
      ) : null}
      </SectionBlock>

      {/* ── RECIÉN INGRESADOS ── */}
      <SectionBlock id="ad-catalogo" label="Vehículos" isPreview={isPreview} defaultOrder={AD_SECTION_IDS}>
      <section id="catálogo" style={{ padding:"clamp(48px,7vw,88px) clamp(16px,3vw,28px)", position:"relative", ...secBg(catalogoImg, catalogoBg) }}>
        <BgDragHandle imgKey="sectionbg_bgCatalogo" />
        <SectionOverlay ov={catalogoImg} />
        <EditableSectionBg field="bgCatalogo" label="Fondo de los vehículos" />
        <div data-ef="sube" style={{ position:"relative", zIndex:1, maxWidth:1240, margin:"0 auto" }}>
          <Titulo acento={accent} tinta={catText}
            kicker={<EditableZone field="catalogKicker" label="Etiqueta de los vehículos">Recién ingresados</EditableZone>}
            titulo={<EditableZone field="catalogHeading" label="Título de los vehículos">Lo último que entró</EditableZone>}
            derecha={products.length > 0 ? (
              <Link href={linkTodos} style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:14, fontWeight:800, color:catText, textDecoration:"none",
                padding:"10px 16px", borderRadius:12, background: catText === "#ffffff" ? "rgba(255,255,255,0.12)" : "#fff", border:`1px solid ${catText === "#ffffff" ? "rgba(255,255,255,0.2)" : LINEA}` }}>
                Ver los {products.length} →
              </Link>
            ) : undefined} />
          {tiposVista.length > 0 && (
            <div className="ad-pestanas" role="group" aria-label="Filtrar por tipo" style={{ marginBottom:20 }}>
              {[{ valor:"", label:"Todos", cuantos:products.length }, ...tiposVista].map(t => {
                const activo = tipoVista === t.valor;
                return (
                  <button key={t.valor || "todos"} type="button" aria-pressed={activo} onClick={() => setTipoVista(t.valor)}
                    style={{ flexShrink:0, minHeight:42, padding:"0 16px", borderRadius:999, cursor:"pointer", fontFamily:"inherit", fontSize:14, fontWeight:700,
                      border:`1px solid ${activo ? TINTA : LINEA}`, background: activo ? TINTA : "#fff", color: activo ? "#fff" : TINTA, transition:"background .2s, color .2s" }}>
                    {t.label} <span style={{ opacity:0.6, fontWeight:600 }}>{t.cuantos}</span>
                  </button>
                );
              })}
            </div>
          )}
          {loadingProducts ? (
            <div className="ad-grilla" aria-busy="true" aria-label="Cargando vehículos">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ background:"#fff", borderRadius:20, padding:8 }}>
                  <div className="ad-esqueleto" style={{ aspectRatio:"4/3", borderRadius:14 }} />
                  <div className="ad-esqueleto" style={{ height:16, borderRadius:8, margin:"16px 10px 10px", width:"70%" }} />
                  <div className="ad-esqueleto" style={{ height:22, borderRadius:8, margin:"0 10px 12px", width:"45%" }} />
                </div>
              ))}
            </div>
          ) : showcased.length > 0 ? (
            <ul className="ad-grilla" data-ef="grilla" style={{ listStyle:"none", margin:0, padding:0 }}>
              {showcased.map(p => (
                <li key={p.id}>
                  <TarjetaDrive p={p} acento={accent} moneda={currency} href={paginaDe(p)}
                    favorito={favorites.includes(p.id)} onFavorito={() => toggleFavorite(p.id)} />
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ textAlign:"center", padding:"56px 24px", border:`1.5px dashed #cbd5e1`, borderRadius:20, background:"#fff" }}>
              <p style={{ margin:0, color:catMid, fontSize:15 }}>Todavía no hay vehículos publicados.</p>
            </div>
          )}
          {delTipo.length > showcased.length && (
            <div style={{ textAlign:"center", marginTop:28 }}>
              <Link href={linkTodos}
                style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", minHeight:52, padding:"0 32px", borderRadius:14,
                  background:TINTA, color:"#fff", textDecoration:"none", fontWeight:800, fontSize:15 }}>
                Ver todos los vehículos
              </Link>
            </div>
          )}
        </div>
      </section>
      </SectionBlock>

      {/* ── POR PRESUPUESTO ── tramos con los precios reales. */}
      <SectionBlock id="ad-presupuesto" label="Por presupuesto" isPreview={isPreview} defaultOrder={AD_SECTION_IDS}>
      {(hayTramos || enEditor) ? (
      <section style={{ padding:"clamp(44px,6vw,72px) clamp(16px,3vw,28px)", background:"#fff" }}>
        <div data-ef="sube" style={{ maxWidth:1240, margin:"0 auto" }}>
          <Titulo acento={accent}
            kicker={<EditableZone field="presupuestoKicker" label="Etiqueta de presupuesto">Por presupuesto</EditableZone>}
            titulo={<EditableZone field="presupuestoHeading" label="Título de presupuesto">¿Cuánto querés gastar?</EditableZone>} />
          {hayTramos
            ? <PresupuestoDrive productos={products} principal={principal} slug={slug} enEditor={isPreview} acento={accent} />
            : avisoVacio("Con cuatro vehículos con precio o más, acá aparecen los tramos de precio armados con lo que publicaste. Mientras tanto, este bloque no se muestra en la tienda.")}
        </div>
      </section>
      ) : null}
      </SectionBlock>

      {/* ── VENDÉ TU USADO / AVISAME SI ENTRA ── */}
      <SectionBlock id="ad-tasar" label="Tasá tu usado y Avisame si entra" isPreview={isPreview} defaultOrder={AD_SECTION_IDS}>
      <section id="tasar" style={{ padding:"clamp(48px,7vw,88px) clamp(16px,3vw,28px)", background:FONDO }}>
        <div data-ef="sube" style={{ maxWidth:1240, margin:"0 auto" }}>
          <Titulo acento={accent}
            kicker={<EditableZone field="tasarKicker" label="Etiqueta de tasación">Vendé o permutá</EditableZone>}
            titulo={<EditableZone field="tasarHeading" label="Título de tasación">Tu usado vale</EditableZone>} />
          <VenderDrive storeId={config?.storeId} acento={accent} isOwner={isOwner} isPreview={isPreview} foto={tasarUrl}
            botonFoto={<EditableImageButton field="tasarImage" label="Foto de tasación" />}
            textos={{
              tasarTitulo: <EditableZone field="tasarTitulo" label="Tasá tu usado — título">Tasá tu usado en un minuto</EditableZone>,
              tasarTexto: <EditableZone field="tasarTexto" label="Tasá tu usado — texto">Contanos qué tenés y te respondemos con una oferta, para tomarlo en parte de pago o comprártelo.</EditableZone>,
              avisameTitulo: <EditableZone field="avisameTitulo" label="Avisame si entra — título">¿No está lo que buscás?</EditableZone>,
              avisameTexto: <EditableZone field="avisameTexto" label="Avisame si entra — texto">Dejanos marca, modelo y hasta cuánto querés gastar. Cuando entre, te escribimos primero.</EditableZone>,
            }} />
        </div>
      </section>
      </SectionBlock>

      {/* ── RECIBÍ LOS INGRESOS POR MAIL ── (08/10/26) Mucha gente no se registra
          para tocar el corazón, pero deja su mail para enterarse cuando entra
          algo. Es la lista a la que le escribe Notificaciones; la lógica (captcha,
          confirmación, baja) es la de todos los templates, ver NewsletterForm. */}
      <SectionBlock id="ad-novedades" label="Recibí los ingresos por mail" isPreview={isPreview} defaultOrder={AD_SECTION_IDS}>
      <section style={{ padding:"clamp(32px,5vw,56px) clamp(16px,3vw,28px)", background:"#fff" }}>
        <div data-ef="sube" style={{ maxWidth:1240, margin:"0 auto" }}>
          <div className="ad-novedades" style={{ background:accent, color:sobreAcento, borderRadius:22, padding:"clamp(24px,4vw,44px)" }}>
            <div style={{ minWidth:0 }}>
              <p style={{ margin:"0 0 10px", display:"inline-flex", fontSize:12, fontWeight:800, padding:"6px 12px", borderRadius:999,
                background: sobreAcento === "#fff" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.08)" }}>
                <EditableZone field="novedadesKicker" label="Etiqueta de novedades">Novedades</EditableZone>
              </p>
              <h2 style={{ margin:0, fontSize:"clamp(24px,3.4vw,36px)", fontWeight:900, letterSpacing:-1.2, lineHeight:1.08 }}>
                <EditableZone field="novedadesHeading" label="Título de novedades">Enterate primero de lo que entra</EditableZone>
              </h2>
              <p style={{ margin:"10px 0 0", fontSize:15, lineHeight:1.55, opacity:0.85 }}>
                <EditableZone field="novedadesTexto" label="Texto de novedades">Dejanos tu mail y te avisamos cuando ingresen unidades nuevas o baje un precio. Sin spam.</EditableZone>
              </p>
            </div>
            <div style={{ minWidth:0 }}>
              <NewsletterForm
                slug={slug}
                isPreview={isPreview}
                placeholder="tu@email.com"
                boton="Avisarme"
                theme={{
                  form: { display:"flex", gap:0, background:"#fff", borderRadius:999, padding:5, overflow:"hidden", boxShadow:"0 10px 30px rgba(15,23,42,0.18)" },
                  input: { flex:1, minWidth:0, border:"none", outline:"none", background:"transparent", color:TINTA, fontSize:15, padding:"12px 8px 12px 18px", fontFamily:"inherit" },
                  boton: { flexShrink:0, background:TINTA, color:"#fff", border:"none", borderRadius:999, padding:"12px 22px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" },
                  colorMensaje: sobreAcento,
                  colorError: sobreAcento,
                }}
              />
              <p style={{ margin:"10px 0 0 6px", fontSize:12, lineHeight:1.5, opacity:0.75 }}>
                Te llega un mail para confirmar. Te das de baja cuando quieras.
              </p>
            </div>
          </div>
        </div>
      </section>
      </SectionBlock>

      {/* ── VIDEOS ── los que la agencia subió en sus vehículos. */}
      <SectionBlock id="ad-videos" label="Videos" isPreview={isPreview} defaultOrder={AD_SECTION_IDS}>
      {(videos.length > 0 || enEditor) ? (
      <section style={{ padding:"clamp(48px,7vw,88px) clamp(16px,3vw,28px)", background:"#fff" }}>
        <div data-ef="sube" style={{ maxWidth:1240, margin:"0 auto" }}>
          <Titulo acento={accent}
            kicker={<EditableZone field="videosKicker" label="Etiqueta de videos">En video</EditableZone>}
            titulo={<EditableZone field="videosHeading" label="Título de videos">Miralos antes de venir</EditableZone>} />
          <VideosDrive videos={videos} acento={accent} moneda={currency} hrefDe={id => linkAVehiculo(slug, id, isPreview)}
            vacio={avisoVacio("Acá aparecen los videos que subas en cada vehículo (en Productos → el vehículo → Videos). Cada uno lleva a su vehículo. Mientras no haya ninguno, este bloque no se muestra en la tienda.")} />
        </div>
      </section>
      ) : null}
      </SectionBlock>

      {/* ── POR QUÉ COMPRAR ACÁ ── */}
      <SectionBlock id="ad-servicios" label="Por qué elegirnos" isPreview={isPreview} defaultOrder={AD_SECTION_IDS}>
      <section id="servicios" style={{ padding:"clamp(48px,7vw,88px) clamp(16px,3vw,28px)", position:"relative", ...secBg(serviciosImg, serviciosBg) }}>
        <BgDragHandle imgKey="sectionbg_bgServicios" />
        <SectionOverlay ov={serviciosImg} />
        <EditableSectionBg field="bgServicios" label="Fondo de por qué elegirnos" />
        <div data-ef="sube" style={{ position:"relative", zIndex:1, maxWidth:1240, margin:"0 auto" }}>
          <Titulo acento={accent} tinta={svcText} centrado
            kicker={<EditableZone field="serviciosKicker" label="Etiqueta de por qué elegirnos">Por qué elegirnos</EditableZone>}
            titulo={<EditableZone field="serviciosHeading" label="Título de por qué elegirnos">Comprá con confianza</EditableZone>} />
          <div className="ad-svc" data-ef="grilla" style={{ display:"grid", gap:14 }}>
            {[
              { fv:"svc1Title", fl:"svc1Desc", fi:"svc1Icon", icon:"📋", t:"Ficha técnica completa", d:"Equipamiento, motor y medidas de cada vehículo, y la ficha en PDF para descargar o compartir." },
              { fv:"svc2Title", fl:"svc2Desc", fi:"svc2Icon", icon:"🔁", t:"Tasá tu usado", d:"Mandanos los datos de tu vehículo y te respondemos con una oferta." },
              { fv:"svc3Title", fl:"svc3Desc", fi:"svc3Icon", icon:"🔔", t:"Avisame si entra", d:"¿No está lo que buscás? Dejanos marca, modelo y presupuesto y te avisamos cuando entre." },
              { fv:"svc4Title", fl:"svc4Desc", fi:"svc4Icon", icon:"💬", t:"Consultá por WhatsApp", d:"Escribinos desde cualquier vehículo y te respondemos con todos los detalles." },
            ].map((s,i) => (
              <div key={i} className="ad-svc-card"
                style={{ padding:"26px 24px", borderRadius:22,
                  border:`1px solid ${svcText==="#ffffff"?"rgba(255,255,255,0.14)":LINEA}`,
                  background: svcText==="#ffffff" ? "rgba(255,255,255,0.06)" : FONDO }}>
                <div style={{ width:56, height:56, borderRadius:16, background:"#fff", boxShadow:"0 4px 14px rgba(15,23,42,0.08)",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, position:"relative", marginBottom:18 }}>
                  {overrides[s.fi]?.text ?? s.icon}
                  {editMode && (
                    <button type="button" title="Cambiar ícono" aria-label="Cambiar ícono"
                      onClick={e => {
                        e.stopPropagation();
                        const curr = overrides[s.fi]?.text ?? s.icon;
                        const set  = SVC_ICON_SETS[i];
                        const idx  = set.indexOf(curr);
                        setOverride(s.fi, { text: set[(idx + 1) % set.length] });
                      }}
                      style={{ position:"absolute", inset:0, background:"rgba(99,102,241,0.9)",
                        border:"none", borderRadius:16, cursor:"pointer",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        color:"#fff", fontSize:14, opacity:0, transition:"opacity 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.opacity="1")}
                      onMouseLeave={e => (e.currentTarget.style.opacity="0")}>↻</button>
                  )}
                </div>
                <p style={{ margin:"0 0 8px", fontSize:17, fontWeight:800, color:svcText, letterSpacing:-0.3 }}>
                  <EditableZone field={s.fv} label={`Servicio ${i+1} — Título`}>{s.t}</EditableZone>
                </p>
                <p style={{ margin:0, fontSize:14, color:svcMid, lineHeight:1.65 }}>
                  <EditableZone field={s.fl} label={`Servicio ${i+1} — Descripción`}>{s.d}</EditableZone>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </SectionBlock>

      {/* ── NÚMEROS ── */}
      <SectionBlock id="ad-stats" label="Números" isPreview={isPreview} defaultOrder={AD_SECTION_IDS}>
      {stats.length > 0 ? (
      <section style={{ position:"relative", padding:"clamp(28px,4vw,48px) clamp(16px,3vw,28px)", ...secBg(statsImg, statsBg) }}>
        <BgDragHandle imgKey="sectionbg_bgStats" />
        <SectionOverlay ov={statsImg} />
        <EditableSectionBg field="bgStats" label="Fondo de los números" />
        <div className="ad-stats" data-ef="grilla" style={{ position:"relative", zIndex:1, maxWidth:1240, margin:"0 auto" }}>
          {stats.map((s,i) => (
            <div key={s.fv} style={{ padding:"24px 22px", borderRadius:20, background: statsText === "#ffffff" ? "rgba(255,255,255,0.08)" : FONDO }}>
              <p data-ef-contar style={{ margin:0, fontSize:"clamp(32px,4vw,48px)", fontWeight:900, color:statsText, letterSpacing:-1.6, lineHeight:1, fontVariantNumeric:"tabular-nums" }}>
                <EditableZone field={s.fv} label={`Número ${i+1}`}>{s.n}</EditableZone>
              </p>
              <p style={{ margin:"8px 0 0", fontSize:14, fontWeight:600, color:statsMid }}>
                <EditableZone field={s.fl} label={`Texto del número ${i+1}`}>{s.l}</EditableZone>
              </p>
            </div>
          ))}
        </div>
      </section>
      ) : null}
      </SectionBlock>

      {/* ── NOSOTROS ── */}
      <SectionBlock id="ad-nosotros" label="Nuestra historia" isPreview={isPreview} defaultOrder={AD_SECTION_IDS}>
      <section id="nosotros" style={{ padding:"clamp(48px,7vw,88px) clamp(16px,3vw,28px)", position:"relative", ...secBg(nosotrosImg2, nosotrosBg) }}>
        <BgDragHandle imgKey="sectionbg_bgNosotros" />
        <SectionOverlay ov={nosotrosImg2} />
        <EditableSectionBg field="bgNosotros" label="Fondo de nosotros" />
        <div data-ef="sube" className="ad-about" style={{ position:"relative", zIndex:1, maxWidth:1240, margin:"0 auto", display:"grid", gap:"40px clamp(32px,5vw,72px)", alignItems:"center" }}>
          <div style={{ position:"relative" }}>
            <div style={{ borderRadius:28, overflow:"hidden", aspectRatio:"4/3", position:"relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- foto elegida por el dueño */}
              <img src={nosotrosUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
              {(() => {
                const ov = iovr["nosotrosImage"];
                if (!ov?.overlayType || ov.overlayType==="none") return null;
                return <div style={{ position:"absolute", inset:0, pointerEvents:"none",
                  background: ov.overlayType==="light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.45})` }} />;
              })()}
              <EditableImageButton field="nosotrosImage" label="Foto de nosotros" />
            </div>
            {/* Los años son una promesa del negocio (5.2): se ven si el dueño los escribió; en el editor, siempre. */}
            {(editMode || !!overrides.nosAniosNum?.text?.trim()) && (
              <div style={{ position:"absolute", bottom:-18, right:16, zIndex:2, background:"#fff", borderRadius:18, padding:"14px 20px",
                boxShadow:"0 16px 40px rgba(15,23,42,0.14)", textAlign:"center" }}>
                <p style={{ margin:0, fontSize:28, fontWeight:900, color:accent, lineHeight:1 }}>
                  <EditableZone field="nosAniosNum" label="Años en el mercado (se ve si lo completás)">15+</EditableZone>
                </p>
                <p style={{ margin:"4px 0 0", fontSize:12, color:"#64748b", fontWeight:600 }}>
                  <EditableZone field="nosAniosLabel" label="Texto de los años">años de experiencia</EditableZone>
                </p>
              </div>
            )}
          </div>
          <div>
            <Titulo acento={accent} tinta={nosText}
              kicker={<EditableZone field="nosotrosKicker" label="Etiqueta de nosotros">Nuestra empresa</EditableZone>}
              titulo={<EditableZone field="nosotrosHeading" label="Título de nosotros">Vehículos elegidos uno por uno</EditableZone>} />
            <p style={{ margin:"-8px 0 14px", fontSize:16, color:nosMid, lineHeight:1.75 }}>
              <EditableZone field="nosotrosP1" label="Párrafo 1">Somos especialistas en compra y venta de vehículos. Cada unidad que publicamos tiene fotos reales, su ficha técnica y el precio a la vista.</EditableZone>
            </p>
            <p style={{ margin:"0 0 24px", fontSize:16, color:nosMid, lineHeight:1.75 }}>
              <EditableZone field="nosotrosP2" label="Párrafo 2">Escribinos por cualquier vehículo: te contamos el estado, la historia y cómo seguir.</EditableZone>
            </p>
            <ul style={{ listStyle:"none", margin:"0 0 28px", padding:0, display:"grid", gap:12 }}>
              {[
                { field:"nosCheck1", def:"Ficha técnica de cada vehículo" },
                { field:"nosCheck2", def:"Tasación online de tu usado" },
                { field:"nosCheck3", def:"Te avisamos cuando entra lo que buscás" },
              ].map(({ field, def }) => (
                <li key={field} style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span aria-hidden="true" style={{ width:26, height:26, borderRadius:"50%", background:`${accent}1a`, flexShrink:0,
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width={13} height={13} viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5l3 3 5-5" stroke={accent} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  <span style={{ fontSize:15, color:nosText, fontWeight:600 }}>
                    <EditableZone field={field} label="Beneficio">{def}</EditableZone>
                  </span>
                </li>
              ))}
            </ul>
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                style={{ display:"inline-flex", alignItems:"center", gap:8, minHeight:50, background:"#25d366", color:"#fff", textDecoration:"none",
                  padding:"0 24px", borderRadius:14, fontWeight:800, fontSize:15 }}>
                <WaIcon /> Hablemos
              </a>
            )}
          </div>
        </div>
      </section>
      </SectionBlock>

      {/* ── PREGUNTAS FRECUENTES ── contestadas con lo que la tienda tiene (lib/preguntasFrecuentes). */}
      <SectionBlock id="ad-preguntas" label="Preguntas frecuentes" isPreview={isPreview} defaultOrder={AD_SECTION_IDS}>
      <section id="preguntas" style={{ padding:"clamp(48px,7vw,88px) clamp(16px,3vw,28px)", background:FONDO }}>
        <div data-ef="sube" className="ad-faq" style={{ maxWidth:1240, margin:"0 auto", display:"grid", gap:"24px clamp(32px,5vw,64px)" }}>
          {/* Del lado izquierdo, una foto y una salida para la duda que no está: que no quede un hueco. */}
          <div className="ad-faq-lado">
            <Titulo acento={accent}
              kicker={<EditableZone field="faqKicker" label="Etiqueta de preguntas">Preguntas frecuentes</EditableZone>}
              titulo={<EditableZone field="faqTitulo" label="Título de preguntas">Lo que todos nos preguntan</EditableZone>} />
            <div className="ad-faq-tarjeta" style={{ background:"#fff", borderRadius:24, padding:8, boxShadow:"0 10px 30px rgba(15,23,42,0.07)", maxWidth:520 }}>
              <div style={{ position:"relative", aspectRatio:"16/10", borderRadius:18, overflow:"hidden", background:"#e2e8f0" }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- foto elegida por el dueño */}
                <img src={faqUrl} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
                <EditableImageButton field="faqImage" label="Foto de preguntas" />
              </div>
              <div style={{ padding:"18px 14px 12px" }}>
                <p style={{ margin:"0 0 4px", fontSize:18, fontWeight:800, color:TINTA, letterSpacing:-0.3 }}>
                  <EditableZone field="faqOtraTitulo" label="Título de la tarjeta de preguntas">¿Te quedó otra duda?</EditableZone>
                </p>
                <p style={{ margin:"0 0 16px", fontSize:14, color:"#475569", lineHeight:1.55 }}>
                  <EditableZone field="faqOtraTexto" label="Texto de la tarjeta de preguntas">Preguntanos lo que quieras: te contesta una persona, no un robot.</EditableZone>
                </p>
                <a href={waLink ?? "#contacto"} {...(waLink ? { target:"_blank", rel:"noopener noreferrer" } : {})}
                  onClick={isPreview ? (e) => e.preventDefault() : undefined}
                  style={{ display:"inline-flex", alignItems:"center", gap:8, minHeight:46, padding:"0 20px", borderRadius:12,
                    background: waLink ? "#25d366" : accent, color: waLink ? "#fff" : sobreAcento, fontSize:14, fontWeight:800, textDecoration:"none" }}>
                  {waLink ? <><WaIcon size={16} /> Escribinos</> : "Contactanos →"}
                </a>
              </div>
            </div>
          </div>
          <div className="ad-faq-lista"><PreguntasDrive acento={accent} preguntas={armarPreguntasAutos({ monedas: opciones.monedas.length ? opciones.monedas : [principal], conWhatsapp: !!waLink })} /></div>
        </div>
      </section>
      </SectionBlock>

      {/* ── CONTACTO ── */}
      <SectionBlock id="ad-contacto" label="Contacto" isPreview={isPreview} defaultOrder={AD_SECTION_IDS}>
      <section id="contacto" style={{ padding:"clamp(40px,6vw,72px) clamp(16px,3vw,28px)", position:"relative", ...secBg(contactoImg, contactoBg) }}>
        <BgDragHandle imgKey="sectionbg_bgContacto" />
        <SectionOverlay ov={contactoImg} />
        <EditableSectionBg field="bgContacto" label="Fondo de contacto" />
        <div data-ef="sube" style={{ position:"relative", zIndex:1, maxWidth:1240, margin:"0 auto", borderRadius:32, overflow:"hidden", background:TINTA,
          padding:"clamp(36px,6vw,72px) clamp(22px,5vw,64px)", textAlign:"center" }}>
          <span aria-hidden="true" style={{ position:"absolute", width:420, height:420, borderRadius:"50%", top:-200, right:-120, background:accent, opacity:0.25, filter:"blur(30px)" }} />
          <span aria-hidden="true" style={{ position:"absolute", width:300, height:300, borderRadius:"50%", bottom:-180, left:-80, background:accent, opacity:0.15, filter:"blur(30px)" }} />
          <div style={{ position:"relative", maxWidth:640, margin:"0 auto" }}>
            <h2 style={{ margin:"0 0 14px", fontSize:"clamp(28px,4.4vw,50px)", fontWeight:900, color:"#fff", letterSpacing:-1.4, lineHeight:1.05 }}>
              <EditableZone field="contactHeading" label="Título de contacto">¿Te interesó algún vehículo?</EditableZone>
            </h2>
            <p style={{ margin:"0 0 30px", fontSize:16, color:"rgba(255,255,255,0.72)", lineHeight:1.7 }}>
              <EditableZone field="contactSubtext" label="Subtítulo de contacto">Escribinos y coordinamos una visita, una prueba de manejo o lo que necesites saber.</EditableZone>
            </p>
            <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
              {waLink && (
                <a href={waLink} target="_blank" rel="noopener noreferrer"
                  style={{ display:"inline-flex", alignItems:"center", gap:10, minHeight:54, background:"#25d366", color:"#fff", textDecoration:"none",
                    padding:"0 28px", borderRadius:14, fontWeight:800, fontSize:15, boxShadow:"0 10px 30px rgba(37,211,102,0.3)" }}>
                  <WaIcon size={20} />
                  <EditableZone field="contactWhatsApp" label="Texto del botón de WhatsApp">Escribinos por WhatsApp</EditableZone>
                </a>
              )}
              <Link href={linkTodos}
                style={{ display:"inline-flex", alignItems:"center", minHeight:54, padding:"0 28px", borderRadius:14, fontWeight:800, fontSize:15,
                  color:"#fff", textDecoration:"none", border:"1.5px solid rgba(255,255,255,0.3)" }}>
                Ver los vehículos
              </Link>
            </div>
            <div style={{ marginTop:28, display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
              {[
                { field:"contactChip1", def:"Respondemos todas las consultas" },
                { field:"contactChip2", def:"Sin compromiso" },
              ].map(({ field, def }) => (
                <span key={field} style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.08)", borderRadius:999, padding:"8px 14px",
                  fontSize:13, color:"rgba(255,255,255,0.8)", fontWeight:600 }}>
                  <svg width={13} height={13} viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M2.5 6.5l3 3 5-5" stroke="#22c55e" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <EditableZone field={field} label="Etiqueta de contacto">{def}</EditableZone>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
      </SectionBlock>
      </div>

      {/* ── PIE ── */}
      <footer style={{ position:"relative", padding:"clamp(40px,6vw,64px) clamp(16px,4vw,32px) 24px", ...secBg(footerImg, footerBg) }}>
        <BgDragHandle imgKey="sectionbg_bgFooter" />
        <SectionOverlay ov={footerImg} />
        <EditableSectionBg field="bgFooter" label="Fondo del pie" nombreBloque="Pie de la tienda" />
        <div style={{ position:"relative", zIndex:1, maxWidth:1280, margin:"0 auto" }}>
          {/* El pie ordenado (08/10/26): ver components/store/auto/PieDeAutos. */}
          <ContenidoPieAutos slug={slug} storeName={storeName} products={products} legales={config?.legales} enEditor={isPreview}
            whatsapp={whatsapp.enabled ? whatsapp.number : null} redes={config?.socialLinks} acento={accent} estilo="drive"
            colores={pieOscuro
              ? { tinta: "#ffffff", suave: ftMid, linea: "rgba(255,255,255,0.1)" }
              : { tinta: "#111827", suave: ftMid, linea: "rgba(17,24,39,0.12)" }}
            descripcion={<EditableZone field="footerFrase" label="Frase del pie">{FRASE_PIE}</EditableZone>}
            copyright={<EditableZone field="footerCopyright" label="Copyright">{`© ${new Date().getFullYear()} ${storeName}. Todos los derechos reservados.`}</EditableZone>}
            onReportar={isOwner ? undefined : () => setShowReport(true)} />
        </div>
      </footer>

      {showReport && <ReportStoreModal slug={slug} onClose={() => setShowReport(false)} />}
      {/* El aviso de favoritos (guardado en este dispositivo / no se pudo guardar). */}
      {fav.aviso && (
        <div role="status" style={{ position:"fixed", left:16, right:16, bottom:20, zIndex: isPreview ? CAPAS.previaModal : 230, display:"flex", justifyContent:"center", pointerEvents:"none" }}>
          <div style={{ pointerEvents:"auto", display:"flex", alignItems:"center", gap:12, maxWidth:440, background:TINTA, color:"#fff", borderRadius:14, padding:"12px 12px 12px 16px", boxShadow:"0 10px 30px rgba(0,0,0,0.25)", fontSize:13, lineHeight:1.45 }}>
            <span style={{ flex:1, overflowWrap:"anywhere" }}>{fav.aviso}</span>
            <button type="button" onClick={fav.cerrarAviso} aria-label="Cerrar aviso" style={{ flexShrink:0, width:32, height:32, borderRadius:8, border:"none", background:"rgba(255,255,255,0.12)", color:"#fff", fontSize:18, cursor:"pointer" }}>×</button>
          </div>
        </div>
      )}

      {/* ── BUSCADOR RÁPIDO ──
          Va en `CAPAS.buscador`, no en la de la barra: si empatan gana la barra
          y le tapa la ×. Cierra tocando afuera (se compara target con
          currentTarget para que tocar el campo o un resultado no cuente). */}
      {searchOpen && (
        <div role="dialog" aria-modal="true" aria-label="Buscar vehículos" onClick={e => { if (e.target === e.currentTarget) setSearchOpen(false); }}
          style={{ position:"fixed", inset:0, zIndex:CAPAS.buscador, background:"rgba(244,246,249,0.97)", backdropFilter:"blur(8px)", display:"flex", flexDirection:"column", alignItems:"center", paddingTop:"clamp(72px,12vh,120px)" }}>
          <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(""); }} aria-label="Cerrar búsqueda"
            style={{ position:"absolute", top:16, right:16, width:44, height:44, borderRadius:"50%", background:"#fff", border:`1px solid ${LINEA}`, color:TINTA, fontSize:24, cursor:"pointer", lineHeight:1 }}>×</button>
          <div style={{ width:"100%", maxWidth:680, padding:"0 16px", boxSizing:"border-box" }}>
            <div style={{ position:"relative" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2} strokeLinecap="round" aria-hidden="true"
                style={{ position:"absolute", left:18, top:"50%", transform:"translateY(-50%)" }}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
              <input autoFocus type="search" aria-label="Buscar vehículos" maxLength={80} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Marca, modelo o año"
                style={{ width:"100%", background:"#fff", border:`2px solid ${accent}`, borderRadius:16, color:TINTA, fontSize:18, padding:"16px 16px 16px 50px", outline:"none", fontFamily:"inherit", boxSizing:"border-box", boxShadow:"0 10px 30px rgba(15,23,42,0.08)" }} />
            </div>
          </div>
          {searchResults.length > 0 && (
            <div style={{ width:"100%", maxWidth:900, padding:"20px 16px 24px", overflowY:"auto", maxHeight:"calc(100vh - 220px)", boxSizing:"border-box" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
                {searchResults.map(p => (
                  <Link key={p.id} href={paginaDe(p)}
                    style={{ display:"block", background:"#fff", borderRadius:16, textDecoration:"none", color:TINTA, overflow:"hidden", padding:6, boxShadow:"0 4px 14px rgba(15,23,42,0.06)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- foto del vehículo */}
                    <img src={p.images[0] ?? ""} alt="" style={{ width:"100%", aspectRatio:"4/3", objectFit:"cover", display:"block", background:"#eef0f3", borderRadius:12 }} />
                    <div style={{ padding:"10px 8px 6px" }}>
                      <p style={{ fontSize:14, fontWeight:700, margin:"0 0 4px" }}>{p.name}</p>
                      <p style={{ fontSize:14, color:TINTA, fontWeight:800, margin:0 }}>{p.price > 0 ? fmtPrice(p.price, monedaDe(p, currency)) : "Consultar"}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {searchQuery.trim().length > 0 && searchResults.length === 0 && (
            <p style={{ color:"#64748b", marginTop:28, fontSize:15, padding:"0 16px", textAlign:"center" }}>Sin resultados para &ldquo;{searchQuery}&rdquo;</p>
          )}
        </div>
      )}

      {/* ── FAVORITOS ── */}
      <div role="dialog" aria-modal="true" aria-label="Favoritos" inert={!favoritesOpen} aria-hidden={!favoritesOpen} style={{ position:"fixed", inset:0, zIndex: isPreview ? CAPAS.previaModal : 205, pointerEvents: favoritesOpen ? "auto" : "none" }}>
        <div onClick={() => setFavoritesOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(15,23,42,0.4)", opacity: favoritesOpen ? 1 : 0, transition:"opacity 0.3s" }} />
        <div style={{ position:"absolute", top:0, right:0, bottom:0, width:400, maxWidth:"100vw", background:"#fff", transform: favoritesOpen ? "translateX(0)" : "translateX(100%)", transition:"transform 0.35s cubic-bezier(.4,0,.2,1)", display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"18px 20px 14px", borderBottom:`1px solid ${LINEA}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <p style={{ fontWeight:800, fontSize:17, margin:0, color:TINTA }}>Favoritos <span style={{ fontWeight:500, fontSize:14, color:"#64748b" }}>({favorites.length})</span></p>
            <button type="button" onClick={() => setFavoritesOpen(false)} aria-label="Cerrar favoritos" style={{ background:FONDO, border:"none", borderRadius:"50%", color:TINTA, fontSize:22, cursor:"pointer", width:40, height:40 }}>×</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"12px 20px" }}>
            {favoriteProducts.length === 0 ? (
              <div style={{ textAlign:"center", padding:"52px 0", color:"#64748b" }}>
                <p style={{ fontSize:32, margin:"0 0 12px" }}>♡</p>
                <p style={{ fontSize:14, lineHeight:1.7, margin:0 }}>Todavía no guardaste ninguno.<br/>Tocá el corazón de un vehículo para tenerlo a mano.</p>
              </div>
            ) : favoriteProducts.map(product => (
              <div key={product.id} style={{ display:"flex", gap:14, padding:"12px 0", borderBottom:`1px solid ${LINEA}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- foto del vehículo */}
                <img src={product.images[0] ?? ""} alt="" style={{ width:88, height:66, objectFit:"cover", borderRadius:12, flexShrink:0, background:"#eef0f3" }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:14, fontWeight:700, margin:"0 0 2px", color:TINTA, overflowWrap:"anywhere" }}>{product.name}</p>
                  <p style={{ fontSize:14, color:TINTA, fontWeight:800, margin:"0 0 10px" }}>{product.price > 0 ? fmtPrice(product.price, monedaDe(product, currency)) : "Consultar"}</p>
                  <div style={{ display:"flex", gap:8 }}>
                    <Link href={paginaDe(product)}
                      style={{ background:accent, color:sobreAcento, borderRadius:10, padding:"0 14px", minHeight:36, display:"inline-flex", alignItems:"center", fontSize:13, fontWeight:700, textDecoration:"none" }}>
                      Ver
                    </Link>
                    <button type="button" onClick={() => toggleFavorite(product.id)}
                      style={{ background:"#fff", color:"#475569", border:`1px solid ${LINEA}`, borderRadius:10, padding:"0 14px", minHeight:36, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
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
        <a href={waLink} target="_blank" rel="noopener noreferrer" aria-label="Escribinos por WhatsApp"
          style={{ position:"fixed", bottom:20, right:20, zIndex:CAPAS.panel,
            background:"#25d366", color:"white", width:56, height:56,
            borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 6px 24px rgba(37,211,102,0.45)", textDecoration:"none" }}>
          <WaIcon size={24} />
        </a>
      )}
    </div>
  );
}
