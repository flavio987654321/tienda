"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { usePushBell } from "@/contexts/PushBellContext";
import { useSesion } from "@/components/AuthProvider";
import StoreFollowButton from "@/components/store/StoreFollowButton";
import { EditableZone, EditableImageButton, EditableSectionBg, BgDragHandle, getContrastColor, useEditContext } from "@/contexts/EditContext";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";
import type { ImageOverride } from "@/types/store-config";
import VerifiedIconButton from "@/components/store/VerifiedIconButton";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import { WaIcon, VehicleCard, VehicleModal, AM_MODAL_CSS, fmtPrice } from "@/components/store/auto/AutoVehicleShared";
import { SectionBlock } from "@/components/store/templates/shared/SectionBlock";
import { linksLegales } from "@/lib/politicas-tienda";

function smoothScrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}
function secBg(ov: ImageOverride | undefined, fallback: string): React.CSSProperties {
  if (ov?.url) return { backgroundImage: `url(${ov.url})`, backgroundSize: "cover", backgroundPosition: `${ov.posX ?? 50}% ${ov.posY ?? 50}%` };
  return { background: fallback };
}
function secText(ov: ImageOverride | undefined, bg: string): string {
  if (ov?.url) return ov.overlayType === "light" ? "#111111" : "#ffffff";
  return getContrastColor(bg) === "light" ? "#ffffff" : "#111111";
}
function secMid(ov: ImageOverride | undefined, bg: string): string {
  if (ov?.url) return ov.overlayType === "light" ? "#555555" : "rgba(255,255,255,0.55)";
  return getContrastColor(bg) === "light" ? "rgba(255,255,255,0.55)" : "#888888";
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

const SERVICE_CATS = [
  { fv:"cat1Label", fi:"cat1Icon", lbl:"Usados garantizados", icon:"🛡️" },
  { fv:"cat2Label", fi:"cat2Icon", lbl:"Autos 0 km",          icon:"✨" },
  { fv:"cat3Label", fi:"cat3Icon", lbl:"Financiación",         icon:"💳" },
  { fv:"cat4Label", fi:"cat4Icon", lbl:"Más servicios",        icon:"🔧" },
];
const CAT_ICON_SETS = [
  ["🛡️","✅","🏆","🔒","💯","⭐","🎖️","🔐"],
  ["✨","🚗","🆕","💎","🌟","🏁","🚀","🎯"],
  ["💳","💰","🏦","📊","💵","💸","🏧","📈"],
  ["🔧","🛠️","⚙️","🔩","🪛","🏗️","🔨","🛞"],
];
const SVC_ICON_SETS = [
  ["✅","🔍","🧪","📋","🏅","🔬","🛡️","🏆"],
  ["📄","📋","📑","🗂️","📝","🖊️","🗃️","📌"],
  ["💳","💰","🏦","📊","💵","🏧","💸","📈"],
  ["🤝","👨‍💼","🎯","📞","💬","🌟","🧑‍💼","🎓"],
];

const AD_SECTION_IDS = ["ad-filtros", "ad-catalogo", "ad-stats", "ad-nosotros", "ad-servicios", "ad-contacto"];

export default function AutoDrive() {
  const config       = useStoreConfig();
  const pushBell     = usePushBell();
  const { products, loadingProducts } = useStorefront();
  const { editMode, overrides, setOverride } = useEditContext();
  const isPreview    = !!config?.previewFill;
  /** Rellenar con ejemplos y hablarle a la dueña son dos cosas distintas: la demo
   *  pública de `/plantillas/[id]` necesita lo primero y no lo segundo. */
  const enEditor     = isPreview && !config?.demoPublica;
  const isOwner      = !!config?.isOwner;
  const accent       = config?.colors.accent ?? "#2563eb";
  const currency     = config?.currency ?? "ARS";
  const storeName    = config?.storeName ?? "AUTO DRIVE";
  const whatsapp     = config?.whatsapp ?? { enabled:false, number:"", message:"" };

  const iovr = config?.imageOverrides ?? {};
  const sc   = config?.sectionColors  ?? {};

  const heroImgUrl  = iovr["heroImage"]?.url
    ?? "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80";
  const nosotrosUrl = iovr["nosotrosImage"]?.url
    ?? "https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?auto=format&fit=crop&w=900&q=80";

  const heroBg      = sc["bgHero"]      ?? "#f0f4ff";
  const heroImg     = iovr["sectionbg_bgHero"];
  const heroText    = secText(heroImg, heroBg);
  const heroMid     = secMid(heroImg, heroBg);

  const catsBg      = sc["bgCategorias"] ?? "#ffffff";
  const catsImg     = iovr["sectionbg_bgCategorias"];
  const catsText    = secText(catsImg, catsBg);

  const catalogoBg  = sc["bgCatalogo"]   ?? "#f7f8fa";
  const catalogoImg = iovr["sectionbg_bgCatalogo"];
  const catText     = secText(catalogoImg, catalogoBg);
  const catMid      = secMid(catalogoImg, catalogoBg);
  const catTheme    = catText==="#ffffff" ? "dark" as const : "light" as const;

  const statsBg     = sc["bgStats"]      ?? "#ffffff";
  const statsImg    = iovr["sectionbg_bgStats"];
  const statsText   = secText(statsImg, statsBg);
  const statsMid    = secMid(statsImg, statsBg);

  const serviciosBg = sc["bgServicios"]  ?? "#ffffff";
  const serviciosImg= iovr["sectionbg_bgServicios"];
  const svcText     = secText(serviciosImg, serviciosBg);
  const svcMid      = secMid(serviciosImg, serviciosBg);

  const nosotrosBg  = sc["bgNosotros"]   ?? "#f7f8fa";
  const nosotrosImg2= iovr["sectionbg_bgNosotros"];
  const nosText     = secText(nosotrosImg2, nosotrosBg);
  const nosMid      = secMid(nosotrosImg2, nosotrosBg);

  const contactoBg  = sc["bgContacto"]   ?? "#111827";
  const contactoImg = iovr["sectionbg_bgContacto"];
  const conText     = secText(contactoImg, contactoBg);
  const conMid      = secMid(contactoImg, contactoBg);

  const footerBg    = sc["bgFooter"]     ?? "#0a0a0a";
  const footerImg   = iovr["sectionbg_bgFooter"];
  const ftMid       = secMid(footerImg, footerBg);

  const navBg          = sc["navBg"] ?? "#ffffff";
  const navDark        = getContrastColor(navBg) === "light";
  const navText        = navDark ? "#ffffff" : "#374151";
  const navTextMid     = navDark ? "rgba(255,255,255,0.7)" : "#6b7280";
  const navBorderColor = navDark ? "rgba(255,255,255,0.2)" : "#e5e7eb";

  const { cargando, logueado, nombreMostrado, panelHref, panelLabel, signOut } = useSesion();
  const router = useRouter();
  const [menuOpen,         setMenuOpen]         = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const [selected,   setSelected]   = useState<StorefrontProduct | null>(null);
  const [scrolled,   setScrolled]   = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [annIdx,     setAnnIdx]     = useState(0);
  const [annVisible, setAnnVisible] = useState(true);
  const [favorites,     setFavorites]     = useState<string[]>([]);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState("");

  const carouselRef = useRef<HTMLDivElement>(null);

  const DEFAULTS = ["🚗 Financiación en cuotas", "🔧 Vehículos certificados", "🚚 Entrega a domicilio"];
  const promoBannerEnabled = config?.promoBanner?.enabled !== false;
  const annMessages        = (config?.promoBanner?.messages?.filter(m => m.trim()) ?? []).length > 0
    ? config!.promoBanner!.messages!.filter(m => m.trim())
    : DEFAULTS;
  const showAnn  = promoBannerEnabled && annVisible;
  const PROMO_H  = 36;
  const NAV_H    = 62;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!showAnn || annMessages.length <= 1) return;
    const id = setInterval(() => setAnnIdx(i => (i + 1) % annMessages.length), 3500);
    return () => clearInterval(id);
  }, [showAnn, annMessages.length]);

  useEffect(() => {
    if (!products.length) return;
    const id = new URLSearchParams(window.location.search).get("producto");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- abre el modal del producto indicado en la URL al cargar la lista, no se puede calcular durante el render
    if (id) { const p = products.find(pr => pr.id === id); if (p) setSelected(p); }
  }, [products]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cargar favoritos: desde API si está logueado, desde localStorage si no
  useEffect(() => {
    if (cargando) return;
    if (logueado) {
      fetch("/api/favoritos")
        .then(r => r.ok ? r.json() : [])
        .then((data: { productId: string }[]) => setFavorites(data.map(f => f.productId)))
        .catch(() => {});
    } else {
      try {
        const savedFavs = localStorage.getItem("storefront_favorites");
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza favoritos guardados en localStorage al cargar, no se puede calcular durante el render
        if (savedFavs) setFavorites(JSON.parse(savedFavs));
      } catch {}
    }
  }, [cargando, logueado]);

  useEffect(() => {
    if (logueado) return;
    try { localStorage.setItem("storefront_favorites", JSON.stringify(favorites)); } catch {}
  }, [favorites, logueado]);

  async function toggleFavorite(id: string) {
    if (!logueado) {
      router.push(`/login?redirect=/tienda/${config?.slug}`);
      return;
    }
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
    try {
      await fetch("/api/favoritos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id }),
      });
    } catch {
      setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
    }
  }

  const favoriteProducts = products.filter(p => favorites.includes(p.id));
  const searchResults = searchQuery.trim().length > 0
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
        || p.category?.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : [];

  const showcased = products.slice(0, 8);
  const hasMore   = products.length > 8;

  function scrollCarousel(dir: "prev" | "next") {
    const el = carouselRef.current;
    if (!el) return;
    const item = el.querySelector<HTMLElement>(".ad-carousel-item");
    const w = item ? item.offsetWidth + 16 : 300;
    el.scrollBy({ left: dir === "next" ? w : -w, behavior: "smooth" });
  }

  return (
    <div style={{ background:"#ffffff", color:"#111111",
      fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", minHeight:"100vh" }}>
      <style>{`
        ${AM_MODAL_CSS}
        .ad-nav-links { display:none }
        @media(min-width:768px){ .ad-nav-links { display:flex } .ad-burger { display:none } }
        .ad-hero { flex-direction:column }
        .ad-hero-left { padding:72px 28px 52px; width:100% }
        @media(min-width:768px){
          .ad-hero { flex-direction:row; min-height:calc(100svh - 98px) }
          .ad-hero-left { padding:80px 64px; width:50% }
        }
        .ad-carousel-item { flex:0 0 calc(100% - 16px) }
        @media(min-width:480px){ .ad-carousel-item { flex:0 0 calc(50% - 12px) } }
        @media(min-width:768px){ .ad-carousel-item { flex:0 0 calc(33.333% - 12px) } }
        @media(min-width:1100px){ .ad-carousel-item { flex:0 0 calc(25% - 12px) } }
        .ad-carousel::-webkit-scrollbar { display:none }
        .ad-carousel { scrollbar-width:none; -ms-overflow-style:none }
        .ad-about { grid-template-columns:1fr }
        @media(min-width:768px){ .ad-about { grid-template-columns:1fr 1fr } }
        .ad-svc { grid-template-columns:1fr }
        @media(min-width:600px){ .ad-svc { grid-template-columns:repeat(2,1fr) } }
        .ad-stats { grid-template-columns:repeat(2,1fr) }
        @media(min-width:640px){ .ad-stats { grid-template-columns:repeat(4,1fr) } }
        @keyframes ad-spin { to { transform:rotate(360deg) } }
        .ad-svc-card { transition:box-shadow 0.2s, transform 0.2s }
        .ad-svc-card:hover { box-shadow:0 8px 28px rgba(0,0,0,0.09) !important; transform:translateY(-2px) }
      `}</style>

      {/* ── PROMO BAR ── */}
      {showAnn && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top:0,
          left: isPreview ? undefined : 0, right: isPreview ? undefined : 0,
          zIndex: isPreview ? 10001 : 110, height:PROMO_H, background:accent,
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          {(() => {
            const bannerText = getContrastColor(accent) === "light" ? "#ffffff" : "#111111";
            const bannerFade = getContrastColor(accent) === "light" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)";
            return (
              <>
                <span style={{ fontSize:11, fontWeight:600, color:bannerText, letterSpacing:1 }}>
                  {annMessages[annIdx]}
                </span>
                {annMessages.length > 1 && (
                  <div style={{ position:"absolute", bottom:4, left:"50%", transform:"translateX(-50%)", display:"flex", gap:4 }}>
                    {annMessages.map((_,i) => (
                      <button key={i} onClick={() => setAnnIdx(i)}
                        style={{ width: i===annIdx ? 14 : 5, height:3, border:"none", borderRadius:2,
                          background: i===annIdx ? bannerText : bannerFade, cursor:"pointer", padding:0, transition:"all 0.3s" }} />
                    ))}
                  </div>
                )}
                <button onClick={() => setAnnVisible(false)}
                  style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", color:bannerText, cursor:"pointer", fontSize:16, opacity:0.7 }}>×</button>
              </>
            );
          })()}
        </div>
      )}

      {/* ── NAV ── */}
      <nav style={{ position: isPreview ? "sticky" : "fixed",
        top: showAnn ? PROMO_H : 0,
        left: isPreview ? undefined : 0, right: isPreview ? undefined : 0,
        zIndex: isPreview ? 10000 : 100,
        background: navBg,
        borderBottom: scrolled ? `1px solid ${navBorderColor}` : "1px solid transparent",
        backdropFilter: "blur(20px)",
        boxShadow: scrolled ? (navDark ? "0 2px 16px rgba(0,0,0,0.25)" : "0 2px 16px rgba(0,0,0,0.06)") : "none",
        transition: "all 0.3s", padding:"0 28px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", height:NAV_H,
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6,
            fontWeight:900, fontSize:18, color:navText, letterSpacing:-0.5 }}>
            <EditableZone field="storeName" label="Nombre de la tienda">{storeName}</EditableZone>
            <VerifiedIconButton isVerified={config?.isVerified} info={config?.verifiedInfo} color={navText} />
          </div>
          <div className="ad-nav-links" style={{ gap:32, alignItems:"center" }}>
            {[["Catálogo","catálogo"],["Nosotros","nosotros"],["Servicios","servicios"],["Contacto","contacto"]].map(([lbl,id]) => (
              <button key={id} onClick={() => smoothScrollTo(id)}
                style={{ background:"none", border:"none", color:navTextMid, cursor:"pointer",
                  fontSize:13, fontWeight:500, transition:"color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.color=navText)}
                onMouseLeave={e => (e.currentTarget.style.color=navTextMid)}>
                {lbl}
              </button>
            ))}
            <Link href={`/tienda/${config?.slug ?? ""}/vehiculos${isPreview ? "?from=editor" : ""}`}
              style={{ background:accent, color: getContrastColor(accent)==="light"?"#fff":"#111",
                padding:"8px 20px", fontSize:12, fontWeight:700,
                textDecoration:"none", borderRadius:6, transition:"opacity 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity="0.85"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity="1"; }}>
              Ver todos
            </Link>
          </div>
          {/* Grupo derecho — búsqueda + favoritos + campanita + usuario + menú mobile */}
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <button onClick={() => setSearchOpen(true)} aria-label="Buscar"
              style={{ background:"none", border:"none", color:navTextMid, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <button onClick={() => setFavoritesOpen(true)} aria-label="Favoritos"
              style={{ position:"relative", background:"none", border:"none", color:navTextMid, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill={favorites.length > 0 ? accent : "none"} stroke={favorites.length > 0 ? accent : "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {favorites.length > 0 && <span style={{ position:"absolute", top:-4, right:-4, background:accent, color: getContrastColor(accent)==="light"?"#fff":"#111", borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{favorites.length}</span>}
            </button>
            {pushBell && config?.showPushBell && !isPreview && (
              <StoreFollowButton storeSlug={config?.slug ?? ""} color={navTextMid} size={20} />
            )}
            {pushBell && config?.showPushBell && !isPreview && (
              <button onClick={pushBell.openDrawer}
                style={{ position:"relative", background:"none", border:"none", color:navTextMid,
                  cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
                <svg width={20} height={20} viewBox="0 0 24 24"
                  fill={pushBell.followState==="following"?"currentColor":"none"}
                  stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {pushBell.hasNew && <span style={{ position:"absolute", top:2, right:2, width:10, height:10,
                  background:"#ef4444", borderRadius:"50%", border:`2px solid ${navBg}` }} />}
              </button>
            )}
            {/* Maquetas de la campanita: solo en el editor. En la demo pública de
                /plantillas no hay tienda que configurar. */}
            {enEditor && (config?.showPushBell ? (
              <>
                <button title="Los clientes pueden seguir tu tienda desde acá"
                  style={{ padding:4, display:"flex", alignItems:"center", color:navTextMid, background:"none", border:"none", cursor:"default", opacity:0.85 }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                </button>
                <button onClick={config.onPreviewBellClick}
                  style={{ padding:4, display:"flex", alignItems:"center", color:navTextMid, background:"none", border:"none", cursor:"pointer" }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </button>
              </>
            ) : (
              <>
                <button onClick={config?.onPreviewBellClick} title="🔒 Solo Plan Plus"
                  style={{ position:"relative", padding:4, display:"flex", alignItems:"center", color:navTextMid, opacity:0.5, background:"none", border:"none", cursor:"pointer" }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                  <span style={{ position:"absolute", top:0, right:0, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
                </button>
                <button onClick={config?.onPreviewBellClick} title="🔒 Solo Plan Plus"
                  style={{ position:"relative", padding:4, display:"flex", alignItems:"center", color:navTextMid, opacity:0.5, background:"none", border:"none", cursor:"pointer" }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  <span style={{ position:"absolute", top:0, right:0, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
                </button>
              </>
            ))}
          {/* User icon */}
          <div ref={userDropdownRef} style={{ position:"relative" }}>
            <button onClick={() => setUserDropdownOpen(o => !o)}
              style={{ background:"none", border:"none", color:navTextMid, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
            {userDropdownOpen && (
              <div style={{ position:"absolute", top:"calc(100% + 10px)", right:0, background:navBg, border:`1px solid ${navBorderColor}`, minWidth:190, zIndex:300, boxShadow:"0 8px 28px rgba(0,0,0,0.25)", overflow:"hidden" }}>
                {cargando ? (<p style={{ padding:"14px 16px", margin:0, fontSize:12, opacity:0.55 }}>Cargando…</p>) : logueado ? (
                  <>
                    <p style={{ padding:"10px 16px 4px", fontSize:11, color:navTextMid, margin:0, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {nombreMostrado}
                    </p>
                    <a href={panelHref} onClick={() => setUserDropdownOpen(false)}
                      style={{ display:"block", padding:"10px 16px", fontSize:13, color:navText, textDecoration:"none", borderBottom:`1px solid ${navBorderColor}` }}
                      onMouseEnter={e => (e.currentTarget.style.opacity="0.75")}
                      onMouseLeave={e => (e.currentTarget.style.opacity="1")}>{panelLabel}</a>
                    <button onClick={() => { if (isPreview) return; setUserDropdownOpen(false); signOut("/"); }}
                      style={{ display:"block", width:"100%", padding:"10px 16px", fontSize:13, color:"#f87171", background:"none", border:"none", textAlign:"left", cursor: isPreview ? "default" : "pointer", opacity: isPreview ? 0.45 : 1 }}
                      onMouseEnter={e => { if (!isPreview) e.currentTarget.style.opacity="0.75"; }}
                      onMouseLeave={e => (e.currentTarget.style.opacity= isPreview ? "0.45" : "1")}>Cerrar sesión</button>
                  </>
                ) : (
                  <>
                    <a href={isPreview ? undefined : `/login?redirect=/tienda/${config?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)}
                      style={{ display:"block", padding:"12px 16px", fontSize:13, color:navText, textDecoration:"none", borderBottom:`1px solid ${navBorderColor}`, cursor: isPreview ? "default" : "pointer" }}
                      onMouseEnter={e => { if (!isPreview) e.currentTarget.style.opacity="0.75"; }}
                      onMouseLeave={e => (e.currentTarget.style.opacity="1")}>Iniciar sesión</a>
                    <a href={isPreview ? undefined : `/registro?plan=buyer&redirect=/tienda/${config?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)}
                      style={{ display:"block", padding:"12px 16px", fontSize:13, color:navText, textDecoration:"none", cursor: isPreview ? "default" : "pointer" }}
                      onMouseEnter={e => { if (!isPreview) e.currentTarget.style.opacity="0.75"; }}
                      onMouseLeave={e => (e.currentTarget.style.opacity="1")}>Registrarse</a>
                  </>
                )}
              </div>
            )}
          </div>
          <button className="ad-burger" onClick={() => setMenuOpen(m => !m)}
            style={{ background:"none", border:`1px solid ${navBorderColor}`,
              color:navText, padding:"7px 11px", cursor:"pointer", fontSize:18 }}>
            {menuOpen ? "×" : "☰"}
          </button>
          </div>
        </div>
        {menuOpen && (
          <div style={{ background:navBg, borderTop:`1px solid ${navBorderColor}`, padding:"8px 28px 20px" }}>
            {[["Catálogo","catálogo"],["Nosotros","nosotros"],["Servicios","servicios"],["Contacto","contacto"]].map(([lbl,id]) => (
              <button key={id} onClick={() => { smoothScrollTo(id); setMenuOpen(false); }}
                style={{ display:"block", width:"100%", background:"none", border:"none",
                  color:navTextMid, cursor:"pointer", textAlign:"left",
                  padding:"12px 0", fontSize:13, fontWeight:500, borderBottom:`1px solid ${navBorderColor}` }}>
                {lbl}
              </button>
            ))}
            <Link href={`/tienda/${config?.slug ?? ""}/vehiculos${isPreview ? "?from=editor" : ""}`}
              style={{ display:"block", color:accent, padding:"14px 0",
                fontSize:13, fontWeight:700, textDecoration:"none" }}
              onClick={() => setMenuOpen(false)}>
              Ver todos los vehículos →
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO — split: texto izquierda, imagen derecha ── */}
      <section style={{ paddingTop: isPreview ? 0 : (showAnn ? PROMO_H + NAV_H : NAV_H),
        position:"relative", ...secBg(heroImg, heroBg) }}>
        <BgDragHandle imgKey="sectionbg_bgHero" />
        <SectionOverlay ov={heroImg} />
        <EditableSectionBg field="bgHero" label="Fondo hero" />
        <div className="ad-hero" style={{ display:"flex", position:"relative", zIndex:1 }}>

          {/* panel izquierdo — texto */}
          <div className="ad-hero-left" style={{ display:"flex", flexDirection:"column",
            justifyContent:"center", boxSizing:"border-box", position:"relative" }}>
            {/* franja de acento */}
            <div style={{ position:"absolute", left:0, top:"15%", bottom:"15%", width:4,
              background:accent, borderRadius:"0 4px 4px 0" }} />
            <p style={{ margin:"0 0 18px", fontSize:11, color:accent,
              textTransform:"uppercase", letterSpacing:5, fontWeight:700 }}>
              <EditableZone field="heroKicker" label="Etiqueta hero">Tu próximo auto</EditableZone>
            </p>
            <h1 style={{ margin:"0 0 24px", fontSize:"clamp(42px,5.5vw,80px)",
              fontWeight:900, color:heroText, letterSpacing:-3, lineHeight:0.92 }}>
              <EditableZone field="heroHeading" label="Título hero">está acá</EditableZone>
            </h1>
            <p style={{ margin:"0 0 38px", fontSize:"clamp(14px,1.5vw,16px)",
              color:heroMid, fontWeight:300, lineHeight:1.9, maxWidth:400 }}>
              <EditableZone field="heroSubtext" label="Subtítulo hero">La mejor selección de vehículos usados y 0 km. Todos inspeccionados, con financiación disponible y entrega en todo el país.</EditableZone>
            </p>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              <button onClick={() => smoothScrollTo("catálogo")}
                style={{ background:accent, color: getContrastColor(accent)==="light"?"#fff":"#111",
                  border:"none", padding:"15px 34px", fontWeight:700, fontSize:13,
                  borderRadius:10, cursor:"pointer", transition:"opacity 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity="0.85"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity="1"; }}>
                Ver catálogo
              </button>
              {whatsapp.enabled && whatsapp.number && (
                <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}${whatsapp.message?"?text="+encodeURIComponent(whatsapp.message):""}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display:"flex", alignItems:"center", gap:8,
                    background:"none",
                    border:`1.5px solid ${heroText==="#ffffff" ? "rgba(255,255,255,0.35)" : "#d1d5db"}`,
                    color:heroText, textDecoration:"none",
                    padding:"15px 24px", fontWeight:600, fontSize:13, borderRadius:10 }}>
                  <WaIcon size={15} /> Contactar
                </a>
              )}
            </div>
            {!loadingProducts && (
              <div style={{ marginTop:32, display:"inline-flex", alignItems:"center", gap:8,
                background: heroText==="#ffffff" ? "rgba(255,255,255,0.1)" : `${accent}0f`,
                border:`1px solid ${heroText==="#ffffff" ? "rgba(255,255,255,0.2)" : `${accent}28`}`,
                borderRadius:100, padding:"8px 16px", width:"fit-content" }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:"#22c55e", flexShrink:0 }} />
                <span style={{ fontSize:12, color:heroText, fontWeight:500 }}>
                  <span style={{ fontWeight:800, color:accent }}>{products.length}</span> vehículos disponibles
                </span>
              </div>
            )}
          </div>

          {/* panel derecho — imagen */}
          <div style={{ flex:1, position:"relative", overflow:"hidden", minHeight:380 }}>
            <img src={heroImgUrl} alt="Vehículo"
              style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
            {(() => {
              const ov = iovr["heroImage"];
              if (!ov?.overlayType || ov.overlayType==="none") return null;
              return <div style={{ position:"absolute", inset:0, pointerEvents:"none",
                background: ov.overlayType==="light"
                  ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})`
                  : `rgba(0,0,0,${ov.overlayOpacity ?? 0.45})` }} />;
            })()}
            {/* badge flotante */}
            <div style={{ position:"absolute", bottom:24, left:24, zIndex:2,
              background:"rgba(0,0,0,0.72)", backdropFilter:"blur(14px)",
              borderRadius:14, padding:"14px 20px",
              border:`1px solid ${accent}40` }}>
              <p style={{ margin:0, fontSize:24, fontWeight:900, color:accent, lineHeight:1 }}>100%</p>
              <p style={{ margin:"4px 0 0", fontSize:11, color:"rgba(255,255,255,0.7)", letterSpacing:0.5 }}>Verificados</p>
            </div>
            <EditableImageButton field="heroImage" label="Imagen del hero" />
          </div>
        </div>
      </section>

      <div style={{ display:"flex", flexDirection:"column" }}>
      {/* ── FILTROS RÁPIDOS — pills horizontales ── */}
      <SectionBlock id="ad-filtros" label="Filtros rápidos" isPreview={isPreview} defaultOrder={AD_SECTION_IDS}>
      <section style={{ padding:"16px 28px", position:"relative",
        ...secBg(catsImg, catsBg),
        borderBottom:`1px solid ${catsText==="#ffffff" ? "rgba(255,255,255,0.1)" : "#f0f0f0"}` }}>
        <BgDragHandle imgKey="sectionbg_bgCategorias" />
        <SectionOverlay ov={catsImg} />
        <EditableSectionBg field="bgCategorias" label="Fondo categorías" />
        <div style={{ position:"relative", zIndex:1, maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center", paddingBottom:2 }}>
            {SERVICE_CATS.map((cat, i) => (
              <button key={i}
                onClick={() => smoothScrollTo("catálogo")}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = accent;
                  (e.currentTarget as HTMLElement).style.background = `${accent}0f`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = catsText==="#ffffff" ? "rgba(255,255,255,0.2)" : "#e5e7eb";
                  (e.currentTarget as HTMLElement).style.background = catsText==="#ffffff" ? "rgba(255,255,255,0.07)" : "#fff";
                }}
                style={{ display:"inline-flex", alignItems:"center", gap:8,
                  padding:"9px 20px", borderRadius:100, whiteSpace:"nowrap", flexShrink:0,
                  border:`1.5px solid ${catsText==="#ffffff" ? "rgba(255,255,255,0.2)" : "#e5e7eb"}`,
                  background: catsText==="#ffffff" ? "rgba(255,255,255,0.07)" : "#fff",
                  cursor:"pointer", transition:"all 0.2s" }}>
                <span style={{ position:"relative", fontSize:16, lineHeight:1 }}>
                  {overrides[cat.fi]?.text ?? cat.icon}
                  {editMode && (
                    <button type="button" title="Cambiar ícono"
                      onClick={e => {
                        e.stopPropagation();
                        const curr = overrides[cat.fi]?.text ?? cat.icon;
                        const set  = CAT_ICON_SETS[i];
                        const idx  = set.indexOf(curr);
                        setOverride(cat.fi, { text: set[(idx + 1) % set.length] });
                      }}
                      style={{ position:"absolute", inset:-3, background:"rgba(99,102,241,0.9)",
                        border:"none", borderRadius:4, cursor:"pointer",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        color:"#fff", fontSize:11, opacity:0, transition:"opacity 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.opacity="1")}
                      onMouseLeave={e => (e.currentTarget.style.opacity="0")}>↻</button>
                  )}
                </span>
                <span style={{ fontSize:13, fontWeight:600, color:catsText }}>
                  <EditableZone field={cat.fv} label={`Categoría ${i+1} — Nombre`}>{cat.lbl}</EditableZone>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
      </SectionBlock>

      {/* ── CATÁLOGO CARRUSEL ── */}
      <SectionBlock id="ad-catalogo" label="Catálogo" isPreview={isPreview} defaultOrder={AD_SECTION_IDS}>
      <section id="catálogo" style={{ padding:"72px 0 72px", position:"relative",
        overflow:"hidden", ...secBg(catalogoImg, catalogoBg) }}>
        <BgDragHandle imgKey="sectionbg_bgCatalogo" />
        <SectionOverlay ov={catalogoImg} />
        <EditableSectionBg field="bgCatalogo" label="Fondo catálogo" />
        <div style={{ position:"relative", zIndex:1, maxWidth:1200, margin:"0 auto", padding:"0 28px" }}>
          <div style={{ marginBottom:32 }}>
            <p style={{ margin:"0 0 6px", fontSize:11, color:accent,
              textTransform:"uppercase", letterSpacing:3, fontWeight:700 }}>
              <EditableZone field="catalogKicker" label="Kicker catálogo">Nuestros vehículos</EditableZone>
            </p>
            <h2 style={{ margin:0, fontSize:"clamp(24px,4vw,42px)", fontWeight:900,
              color:catText, letterSpacing:-1 }}>
              <EditableZone field="catalogHeading" label="Título catálogo">Catálogo disponible</EditableZone>
            </h2>
          </div>
        </div>

        <div style={{ position:"relative", zIndex:1 }}>
          {/* Flechas flanqueando el carrusel */}
          {!loadingProducts && showcased.length > 1 && (
            <>
              <button onClick={() => scrollCarousel("prev")} aria-label="Anterior"
                style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)",
                  zIndex:3, width:40, height:40, borderRadius:10,
                  border:`1.5px solid ${catText==="#ffffff"?"rgba(255,255,255,0.2)":"#e5e7eb"}`,
                  background: catText==="#ffffff" ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.9)",
                  backdropFilter:"blur(8px)",
                  color:catText==="#ffffff" ? "#fff" : "#374151",
                  cursor:"pointer", fontSize:20, display:"flex", alignItems:"center",
                  justifyContent:"center", transition:"all 0.15s", boxShadow:"0 2px 10px rgba(0,0,0,0.12)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor=accent; (e.currentTarget as HTMLElement).style.color=accent; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor=catText==="#ffffff"?"rgba(255,255,255,0.2)":"#e5e7eb"; (e.currentTarget as HTMLElement).style.color=catText==="#ffffff"?"#fff":"#374151"; }}>
                ‹
              </button>
              <button onClick={() => scrollCarousel("next")} aria-label="Siguiente"
                style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
                  zIndex:3, width:40, height:40, borderRadius:10,
                  border:`1.5px solid ${catText==="#ffffff"?"rgba(255,255,255,0.2)":"#e5e7eb"}`,
                  background: catText==="#ffffff" ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.9)",
                  backdropFilter:"blur(8px)",
                  color:catText==="#ffffff" ? "#fff" : "#374151",
                  cursor:"pointer", fontSize:20, display:"flex", alignItems:"center",
                  justifyContent:"center", transition:"all 0.15s", boxShadow:"0 2px 10px rgba(0,0,0,0.12)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor=accent; (e.currentTarget as HTMLElement).style.color=accent; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor=catText==="#ffffff"?"rgba(255,255,255,0.2)":"#e5e7eb"; (e.currentTarget as HTMLElement).style.color=catText==="#ffffff"?"#fff":"#374151"; }}>
                ›
              </button>
            </>
          )}
          {loadingProducts ? (
            <div style={{ textAlign:"center", padding:"60px 0" }}>
              <div style={{ width:40, height:40, border:`3px solid ${accent}`,
                borderTopColor:"transparent", borderRadius:"50%",
                animation:"ad-spin 0.8s linear infinite", margin:"0 auto" }} />
            </div>
          ) : showcased.length > 0 ? (
            <div ref={carouselRef} className="ad-carousel"
              style={{ display:"flex", gap:16, overflowX:"auto", overflowY:"hidden",
                scrollSnapType:"x mandatory", padding:"4px 56px 16px",
                WebkitOverflowScrolling:"touch", overscrollBehaviorX:"contain" } as React.CSSProperties}>
              {showcased.map(p => (
                <div key={p.id} className="ad-carousel-item" style={{ scrollSnapAlign:"start", flexShrink:0 }}>
                  <VehicleCard product={p} accent={accent} currency={currency}
                    theme={catTheme} onClick={() => setSelected(p)}
                    isFavorite={favorites.includes(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:"60px 28px",
              border:`1px dashed ${catText==="#ffffff"?"#333":"#e5e7eb"}`,
              margin:"0 28px", borderRadius:12 }}>
              <p style={{ margin:0, color:catMid, fontSize:14 }}>Aún no hay vehículos publicados.</p>
            </div>
          )}
        </div>

        {hasMore && (
          <div style={{ textAlign:"center", marginTop:32, padding:"0 28px",
            position:"relative", zIndex:1 }}>
            <Link href={`/tienda/${config?.slug ?? ""}/vehiculos${isPreview ? "?from=editor" : ""}`}
              style={{ display:"inline-flex", alignItems:"center", gap:10,
                background:accent, color: getContrastColor(accent)==="light"?"#fff":"#111",
                textDecoration:"none", padding:"14px 44px",
                fontWeight:700, fontSize:13, borderRadius:10 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity="0.85"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity="1"; }}>
              Ver todo
            </Link>
          </div>
        )}
      </section>
      </SectionBlock>

      {/* ── STATS — 4 columnas, números en color accent ── */}
      <SectionBlock id="ad-stats" label="Estadísticas" isPreview={isPreview} defaultOrder={AD_SECTION_IDS}>
      <section style={{ position:"relative", ...secBg(statsImg, statsBg),
        borderTop:`1px solid ${statsText==="#ffffff"?"rgba(255,255,255,0.1)":"#f0f0f0"}`,
        borderBottom:`1px solid ${statsText==="#ffffff"?"rgba(255,255,255,0.1)":"#f0f0f0"}` }}>
        <BgDragHandle imgKey="sectionbg_bgStats" />
        <SectionOverlay ov={statsImg} />
        <EditableSectionBg field="bgStats" label="Fondo estadísticas" />
        <div className="ad-stats" style={{ position:"relative", zIndex:1,
          maxWidth:1200, margin:"0 auto", display:"grid" }}>
          {[
            { fv:"stat1", fl:"statLabel1", n:"500+", l:"Vehículos vendidos" },
            { fv:"stat2", fl:"statLabel2", n:"15",   l:"Años en el mercado" },
            { fv:"stat3", fl:"statLabel3", n:"98%",  l:"Satisfacción" },
            { fv:"stat4", fl:"statLabel4", n:"12",   l:"Marcas disponibles" },
          ].map((s,i) => (
            <div key={i} style={{ textAlign:"center", padding:"40px 20px", position:"relative" }}>
              {i > 0 && (
                <div style={{ position:"absolute", left:0, top:"20%", bottom:"20%", width:1,
                  background: statsText==="#ffffff" ? "rgba(255,255,255,0.15)" : "#f0f0f0" }} />
              )}
              <p style={{ margin:0, fontSize:"clamp(30px,4vw,54px)", fontWeight:900,
                color:accent, letterSpacing:-2, lineHeight:1 }}>
                <EditableZone field={s.fv} label={`Número stat ${i+1}`}>{s.n}</EditableZone>
              </p>
              <p style={{ margin:"8px 0 0", fontSize:11, color:statsMid,
                textTransform:"uppercase", letterSpacing:2 }}>
                <EditableZone field={s.fl} label={`Etiqueta stat ${i+1}`}>{s.l}</EditableZone>
              </p>
            </div>
          ))}
        </div>
      </section>
      </SectionBlock>

      {/* ── NOSOTROS — imagen izquierda con badge flotante, texto derecha con checklist ── */}
      <SectionBlock id="ad-nosotros" label="Nuestra historia" isPreview={isPreview} defaultOrder={AD_SECTION_IDS}>
      <section id="nosotros" style={{ padding:"88px 28px", position:"relative",
        ...secBg(nosotrosImg2, nosotrosBg) }}>
        <BgDragHandle imgKey="sectionbg_bgNosotros" />
        <SectionOverlay ov={nosotrosImg2} />
        <EditableSectionBg field="bgNosotros" label="Fondo nosotros" />
        <div className="ad-about" style={{ position:"relative", zIndex:1, maxWidth:1200,
          margin:"0 auto", display:"grid", gap:64, alignItems:"center" }}>

          {/* imagen izquierda con badge flotante */}
          <div style={{ position:"relative" }}>
            <div style={{ borderRadius:20, overflow:"hidden", aspectRatio:"4/3", position:"relative" }}>
              <img src={nosotrosUrl} alt="Nosotros"
                style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
              {(() => {
                const ov = iovr["nosotrosImage"];
                if (!ov?.overlayType || ov.overlayType==="none") return null;
                return <div style={{ position:"absolute", inset:0, pointerEvents:"none",
                  background: ov.overlayType==="light"
                    ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})`
                    : `rgba(0,0,0,${ov.overlayOpacity ?? 0.45})` }} />;
              })()}
              <EditableImageButton field="nosotrosImage" label="Imagen sección Nosotros" />
            </div>
            {/* badge flotante de años */}
            <div style={{ position:"absolute", bottom:-20, right:-16, zIndex:2,
              background:"#fff", borderRadius:16, padding:"16px 22px",
              boxShadow:"0 8px 36px rgba(0,0,0,0.13)", textAlign:"center",
              border:`2px solid ${accent}` }}>
              <p style={{ margin:0, fontSize:30, fontWeight:900, color:accent, lineHeight:1 }}>15+</p>
              <p style={{ margin:"4px 0 0", fontSize:11, color:"#6b7280", whiteSpace:"nowrap" }}>años de experiencia</p>
            </div>
          </div>

          {/* texto derecha */}
          <div>
            <div style={{ width:4, height:52, background:accent, borderRadius:4, marginBottom:24 }} />
            <p style={{ margin:"0 0 10px", fontSize:11, color:accent,
              textTransform:"uppercase", letterSpacing:3, fontWeight:700 }}>
              <EditableZone field="nosotrosKicker" label="Kicker nosotros">Nuestra empresa</EditableZone>
            </p>
            <h2 style={{ margin:"0 0 20px", fontSize:"clamp(22px,4vw,38px)",
              fontWeight:900, color:nosText, letterSpacing:-0.5, lineHeight:1.1 }}>
              <EditableZone field="nosotrosHeading" label="Título nosotros">Pasión por los vehículos desde 2010</EditableZone>
            </h2>
            <p style={{ margin:"0 0 14px", fontSize:15, color:nosMid, lineHeight:1.9, fontWeight:300 }}>
              <EditableZone field="nosotrosP1" label="Párrafo 1">Somos una empresa familiar con más de 15 años en el mercado automotor, especializados en brindar la mejor experiencia de compra con total transparencia.</EditableZone>
            </p>
            <p style={{ margin:"0 0 28px", fontSize:15, color:nosMid, lineHeight:1.9, fontWeight:300 }}>
              <EditableZone field="nosotrosP2" label="Párrafo 2">Nuestro equipo de asesores y taller propio garantizan la calidad de cada vehículo antes de llegar a tus manos. La documentación la gestionamos nosotros.</EditableZone>
            </p>
            {/* checklist */}
            <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:32 }}>
              {[
                { field:"nosCheck1", def:"Garantía de satisfacción post-venta" },
                { field:"nosCheck2", def:"Financiación propia sin intermediarios" },
                { field:"nosCheck3", def:"Entrega y trámites incluidos sin cargo" },
              ].map(({ field, def }) => (
                <div key={field} style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:24, height:24, borderRadius:"50%", background:`${accent}15`,
                    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <svg width={13} height={13} viewBox="0 0 13 13" fill="none">
                      <path d="M2.5 6.5l3 3 5-5" stroke={accent} strokeWidth={2}
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span style={{ fontSize:14, color:nosMid, fontWeight:500 }}>
                    <EditableZone field={field} label="Beneficio">{def}</EditableZone>
                  </span>
                </div>
              ))}
            </div>
            {whatsapp.enabled && whatsapp.number && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}${whatsapp.message?"?text="+encodeURIComponent(whatsapp.message):""}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display:"inline-flex", alignItems:"center", gap:8,
                  background:"#25d366", color:"white", textDecoration:"none",
                  padding:"13px 28px", borderRadius:10, fontWeight:700, fontSize:14 }}>
                <WaIcon /> Contactanos
              </a>
            )}
          </div>
        </div>
      </section>
      </SectionBlock>

      {/* ── SERVICIOS — tarjetas horizontales ícono+texto ── */}
      <SectionBlock id="ad-servicios" label="Servicios" isPreview={isPreview} defaultOrder={AD_SECTION_IDS}>
      <section id="servicios" style={{ padding:"80px 28px", position:"relative",
        ...secBg(serviciosImg, serviciosBg) }}>
        <BgDragHandle imgKey="sectionbg_bgServicios" />
        <SectionOverlay ov={serviciosImg} />
        <EditableSectionBg field="bgServicios" label="Fondo servicios" />
        <div style={{ position:"relative", zIndex:1, maxWidth:1200, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <p style={{ margin:"0 0 8px", fontSize:11, color:accent,
              textTransform:"uppercase", letterSpacing:3, fontWeight:700 }}>
              <EditableZone field="serviciosKicker" label="Kicker servicios">Por qué elegirnos</EditableZone>
            </p>
            <h2 style={{ margin:0, fontSize:"clamp(22px,4vw,36px)", fontWeight:900,
              color:svcText, letterSpacing:-0.5 }}>
              <EditableZone field="serviciosHeading" label="Título servicios">Comprá con confianza</EditableZone>
            </h2>
          </div>
          <div className="ad-svc" style={{ display:"grid", gap:16 }}>
            {[
              { fv:"svc1Title", fl:"svc1Desc", fi:"svc1Icon", icon:"✅", t:"Inspección completa",   d:"Cada vehículo pasa por 150 puntos de revisión técnica antes de publicarse." },
              { fv:"svc2Title", fl:"svc2Desc", fi:"svc2Icon", icon:"📄", t:"Trámites incluidos",    d:"Documentación, transferencia y patentes gestionadas por nuestro equipo." },
              { fv:"svc3Title", fl:"svc3Desc", fi:"svc3Icon", icon:"💳", t:"Financiación",          d:"Planes de pago en cuotas fijas disponibles para cualquier perfil crediticio." },
              { fv:"svc4Title", fl:"svc4Desc", fi:"svc4Icon", icon:"🤝", t:"Asesor exclusivo",      d:"Un asesor te acompaña en todo el proceso, sin cargo y sin compromiso." },
            ].map((s,i) => (
              <div key={i} className="ad-svc-card"
                style={{ display:"flex", gap:20, padding:"24px 28px", borderRadius:16,
                  border:`1px solid ${svcText==="#ffffff"?"rgba(255,255,255,0.1)":"#f0f0f0"}`,
                  background: svcText==="#ffffff" ? "rgba(255,255,255,0.05)" : "#fff" }}>
                <div style={{ width:54, height:54, borderRadius:14, background:`${accent}12`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:26, flexShrink:0, position:"relative" }}>
                  {overrides[s.fi]?.text ?? s.icon}
                  {editMode && (
                    <button type="button" title="Cambiar ícono"
                      onClick={e => {
                        e.stopPropagation();
                        const curr = overrides[s.fi]?.text ?? s.icon;
                        const set  = SVC_ICON_SETS[i];
                        const idx  = set.indexOf(curr);
                        setOverride(s.fi, { text: set[(idx + 1) % set.length] });
                      }}
                      style={{ position:"absolute", inset:0, background:"rgba(99,102,241,0.9)",
                        border:"none", borderRadius:14, cursor:"pointer",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        color:"#fff", fontSize:14, opacity:0, transition:"opacity 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.opacity="1")}
                      onMouseLeave={e => (e.currentTarget.style.opacity="0")}>↻</button>
                  )}
                </div>
                <div style={{ paddingTop:2 }}>
                  <p style={{ margin:"0 0 6px", fontSize:15, fontWeight:700, color:svcText }}>
                    <EditableZone field={s.fv} label={`Servicio ${i+1} — Título`}>{s.t}</EditableZone>
                  </p>
                  <p style={{ margin:0, fontSize:13, color:svcMid, lineHeight:1.75 }}>
                    <EditableZone field={s.fl} label={`Servicio ${i+1} — Descripción`}>{s.d}</EditableZone>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      </SectionBlock>

      {/* ── CONTACTO ── */}
      <SectionBlock id="ad-contacto" label="Contacto" isPreview={isPreview} defaultOrder={AD_SECTION_IDS}>
      <section id="contacto" style={{ padding:"88px 28px", position:"relative",
        ...secBg(contactoImg, contactoBg), overflow:"hidden" }}>
        <BgDragHandle imgKey="sectionbg_bgContacto" />
        <SectionOverlay ov={contactoImg} />
        <EditableSectionBg field="bgContacto" label="Fondo contacto" />
        {/* círculo decorativo */}
        <div style={{ position:"absolute", top:"-100px", right:"-100px", width:400, height:400,
          borderRadius:"50%", background:`${accent}0a`, pointerEvents:"none", zIndex:0 }} />
        <div style={{ position:"absolute", bottom:"-60px", left:"-60px", width:280, height:280,
          borderRadius:"50%", background:`${accent}06`, pointerEvents:"none", zIndex:0 }} />

        <div style={{ position:"relative", zIndex:1, maxWidth:580, margin:"0 auto", textAlign:"center" }}>
          {/* ícono */}
          <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
            width:64, height:64, borderRadius:18, background:`${accent}20`, marginBottom:28 }}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none"
              stroke={accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <p style={{ margin:"0 0 10px", fontSize:11, color:accent,
            textTransform:"uppercase", letterSpacing:3, fontWeight:700 }}>Contacto</p>
          <h2 style={{ margin:"0 0 18px", fontSize:"clamp(26px,4vw,46px)",
            fontWeight:900, color:conText, letterSpacing:-0.5, lineHeight:1.1 }}>
            <EditableZone field="contactHeading" label="Título contacto">¿Te interesó algún vehículo?</EditableZone>
          </h2>
          <p style={{ margin:"0 0 40px", fontSize:15, color:conMid, lineHeight:1.9, fontWeight:300 }}>
            <EditableZone field="contactSubtext" label="Subtítulo contacto">Escribinos y un asesor te responde en menos de una hora para coordinar una visita o consulta.</EditableZone>
          </p>
          {whatsapp.enabled && whatsapp.number && (
            <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}${whatsapp.message?"?text="+encodeURIComponent(whatsapp.message):""}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:12,
                background:"#25d366", color:"white", textDecoration:"none",
                padding:"16px 48px", borderRadius:12, fontWeight:800, fontSize:15,
                boxShadow:"0 8px 32px rgba(37,211,102,0.3)" }}>
              <WaIcon size={20} />
              <EditableZone field="contactWhatsApp" label="Texto botón WhatsApp">Escribinos por WhatsApp</EditableZone>
            </a>
          )}
          {/* chips informativos */}
          <div style={{ marginTop:32, display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            {[
              { field:"contactChip1", def:"Respuesta en menos de 1 hora", icon:"⏱️" },
              { field:"contactChip2", def:"Sin compromiso",                icon:"✅" },
            ].map(({ field, def, icon }) => (
              <div key={field} style={{ display:"inline-flex", alignItems:"center", gap:8,
                background: conText==="#ffffff" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                borderRadius:100, padding:"9px 18px" }}>
                <span style={{ fontSize:15 }}>{icon}</span>
                <span style={{ fontSize:12, color:conMid, fontWeight:500 }}>
                  <EditableZone field={field} label="Chip contacto">{def}</EditableZone>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
      </SectionBlock>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ position:"relative", padding:"32px 28px", textAlign:"center",
        ...secBg(footerImg, footerBg), borderTop:"1px solid rgba(255,255,255,0.06)" }}>
        <BgDragHandle imgKey="sectionbg_bgFooter" />
        <SectionOverlay ov={footerImg} />
        <EditableSectionBg field="bgFooter" label="Fondo footer" />
        <div style={{ position:"relative", zIndex:1 }}>
          <p style={{ margin:"0 0 6px", fontWeight:900, fontSize:14,
            color:accent, letterSpacing:-0.3 }}>{storeName}</p>
          <p style={{ margin:"0 0 14px", fontSize:11, color:ftMid, letterSpacing:0.3 }}>
            <EditableZone field="footerCopyright" label="Copyright">
              {`© ${new Date().getFullYear()} ${storeName}. Todos los derechos reservados.`}
            </EditableZone>
          </p>
          <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:"0 16px" }}>
            {linksLegales(config?.slug, config?.legales, { enEditor: isPreview, esAutos: true }).map(({ clave: tipo, label }) => (
              <a key={tipo} href={`/tienda/${config?.slug ?? ""}/politicas?tipo=${tipo}`}
                style={{ fontSize:10, color:ftMid, opacity:0.45, textDecoration:"none", letterSpacing:0.3 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity="1"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity="0.45"; }}>
                {label}
              </a>
            ))}
            {!isOwner && (
              <button onClick={() => setShowReport(true)}
                style={{ fontSize:10, color:ftMid, opacity:0.45, background:"none", border:"none",
                  cursor:"pointer", padding:0, letterSpacing:0.3 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity="1"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity="0.45"; }}>
                Reportar tienda
              </button>
            )}
          </div>
        </div>
      </footer>

      {showReport && <ReportStoreModal slug={config?.slug ?? ""} onClose={() => setShowReport(false)} />}

      {/* ── SEARCH OVERLAY ── */}
      {searchOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(255,255,255,0.97)", backdropFilter:"blur(8px)", display:"flex", flexDirection:"column", alignItems:"center", paddingTop:120 }}>
          <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} aria-label="Cerrar búsqueda"
            style={{ position:"absolute", top:24, right:32, background:"none", border:"none", color:"#111", fontSize:28, cursor:"pointer", lineHeight:1 }}>×</button>
          <div style={{ width:"100%", maxWidth:640, padding:"0 24px" }}>
            <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar vehículos..."
              style={{ width:"100%", background:"transparent", border:"none", borderBottom:`2px solid ${accent}`, color:"#111", fontSize:24, padding:"12px 0", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
          </div>
          {searchResults.length > 0 && (
            <div style={{ width:"100%", maxWidth:880, padding:"24px 24px 0", overflowY:"auto", maxHeight:"calc(100vh - 260px)" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:16 }}>
                {searchResults.map(p => (
                  <button key={p.id} onClick={() => { setSelected(p); setSearchOpen(false); setSearchQuery(""); }}
                    style={{ background:"none", border:"1px solid #e0e0e0", borderRadius:6, cursor:"pointer", textAlign:"left", padding:0, color:"#111", overflow:"hidden" }}>
                    <img src={p.images[0] ?? ""} alt={p.name} style={{ width:"100%", aspectRatio:"4/3", objectFit:"cover", display:"block", background:"#f5f5f5" }} />
                    <div style={{ padding:"10px 12px" }}>
                      <p style={{ fontSize:13, fontWeight:600, margin:"0 0 4px" }}>{p.name}</p>
                      <p style={{ fontSize:13, color:accent, fontWeight:700, margin:0 }}>{fmtPrice(p.price, currency)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {searchQuery.trim().length > 0 && searchResults.length === 0 && (
            <p style={{ color:"#888", marginTop:32, fontSize:14 }}>Sin resultados para &ldquo;{searchQuery}&rdquo;</p>
          )}
        </div>
      )}

      {/* ── FAVORITOS DRAWER ── */}
      <div style={{ position:"fixed", inset:0, zIndex: isPreview ? 20000 : 205, pointerEvents: favoritesOpen ? "auto" : "none" }}>
        <div onClick={() => setFavoritesOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.4)", opacity: favoritesOpen ? 1 : 0, transition:"opacity 0.3s" }} />
        <div style={{ position:"absolute", top:0, right:0, bottom:0, width:400, maxWidth:"100vw", background:"#fff", transform: favoritesOpen ? "translateX(0)" : "translateX(100%)", transition:"transform 0.35s cubic-bezier(.4,0,.2,1)", display:"flex", flexDirection:"column", borderLeft:"1px solid #e5e5e5" }}>
          <div style={{ padding:"20px 24px 14px", borderBottom:"1px solid #f0f0f0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <p style={{ fontWeight:700, fontSize:16, margin:0, color:"#111" }}>Favoritos <span style={{ fontWeight:400, fontSize:13, color:"#888" }}>({favorites.length})</span></p>
            <button onClick={() => setFavoritesOpen(false)} style={{ background:"none", border:"none", color:"#111", fontSize:22, cursor:"pointer" }}>×</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"14px 24px" }}>
            {favoriteProducts.length === 0 ? (
              <div style={{ textAlign:"center", padding:"52px 0", color:"#888" }}>
                <p style={{ fontSize:32, marginBottom:12 }}>♡</p>
                <p style={{ fontSize:13, lineHeight:1.8 }}>No tenés favoritos aún.<br/>Explorá el catálogo.</p>
              </div>
            ) : favoriteProducts.map(product => (
              <div key={product.id} style={{ display:"flex", gap:14, padding:"14px 0", borderBottom:"1px solid #f5f5f5" }}>
                <img src={product.images[0] ?? ""} alt={product.name} style={{ width:80, height:60, objectFit:"cover", borderRadius:4, flexShrink:0, background:"#f5f5f5" }} />
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14, fontWeight:600, margin:"0 0 4px", color:"#111" }}>{product.name}</p>
                  <p style={{ fontSize:13, color:accent, fontWeight:700, margin:"0 0 10px" }}>{fmtPrice(product.price, currency)}</p>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => { setFavoritesOpen(false); setSelected(product); }}
                      style={{ background:accent, color: getContrastColor(accent)==="light"?"#fff":"#111", border:"none", borderRadius:4, padding:"7px 14px", fontSize:11, fontWeight:600, cursor:"pointer" }}>
                      Ver
                    </button>
                    <button onClick={() => toggleFavorite(product.id)}
                      style={{ background:"transparent", color:"#888", border:"1px solid #ddd", borderRadius:4, padding:"7px 14px", fontSize:11, cursor:"pointer" }}>
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <VehicleModal product={selected} accent={accent} currency={currency}
          whatsapp={whatsapp} products={products}
          onClose={() => setSelected(null)} onSelect={p => setSelected(p)}
          isFavorite={favorites.includes(selected.id)} onToggleFavorite={() => toggleFavorite(selected.id)}
          storeId={config?.storeId} isOwner={isOwner} isPreview={isPreview} />
      )}

      {!editMode && whatsapp.enabled && whatsapp.number && (
        <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}${whatsapp.message?"?text="+encodeURIComponent(whatsapp.message):""}`}
          target="_blank" rel="noopener noreferrer"
          style={{ position:"fixed", bottom:24, right:24, zIndex:500,
            background:"#25d366", color:"white", width:56, height:56,
            borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 4px 24px rgba(37,211,102,0.45)", textDecoration:"none" }}>
          <WaIcon size={24} />
        </a>
      )}
    </div>
  );
}
