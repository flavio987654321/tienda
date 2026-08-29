"use client";
import { barraMs } from "@/types/store-config";
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
import { CAPAS } from "@/lib/capas-tienda";

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
  if (ov?.url) return ov.overlayType === "light" ? "#555555" : "rgba(255,255,255,0.65)";
  return getContrastColor(bg) === "light" ? "rgba(255,255,255,0.65)" : "#777777";
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

const NAVY = "#1b3f6e";
const NAVY_DARK = "#0d1f3c";

const AM_SECTION_IDS = ["am-stats", "am-catalogo", "am-servicios", "am-nosotros", "am-contacto"];

export default function AutoMotor() {
  const config        = useStoreConfig();
  const pushBell      = usePushBell();
  const { products, loadingProducts } = useStorefront();
  const { editMode }  = useEditContext();
  const isPreview     = !!config?.previewFill;
  /** Rellenar con ejemplos y hablarle a la dueña son dos cosas distintas: la demo
   *  pública de `/plantillas/[id]` necesita lo primero y no lo segundo. */
  const enEditor      = isPreview && !config?.demoPublica;
  const isOwner       = !!config?.isOwner;
  const accent        = config?.colors.accent ?? "#e8a020";
  const currency      = config?.currency ?? "ARS";
  const storeName     = config?.storeName ?? "AUTO MOTOR";
  const whatsapp      = config?.whatsapp ?? { enabled: false, number: "", message: "" };

  const iovr = config?.imageOverrides ?? {};
  const sc   = config?.sectionColors  ?? {};

  const heroOv          = iovr["heroBackground"];
  const heroBgUrl       = heroOv?.url ?? "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1920&q=80";
  const heroOverlayType = heroOv?.overlayType ?? "dark";
  const heroOverlayOp   = heroOv?.overlayOpacity ?? 0.68;
  const heroIsLight     = heroOverlayType === "light";
  const heroText        = heroIsLight ? "#111111" : "#ffffff";
  const heroMid         = heroIsLight ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.75)";
  const heroNavBorder   = heroIsLight ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.35)";

  const nosotrosUrl  = iovr["nosotrosImage"]?.url
    ?? "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=900&q=80";

  const catalogoBg  = sc["bgCatalogo"]  ?? "#ffffff";
  const catalogoImg = iovr["sectionbg_bgCatalogo"];
  const catText     = secText(catalogoImg, catalogoBg);
  const catMid      = secMid(catalogoImg, catalogoBg);
  const catTheme    = catText === "#ffffff" ? "dark" as const : "light" as const;

  const serviciosBg = sc["bgServicios"] ?? NAVY;
  const serviciosImg= iovr["sectionbg_bgServicios"];
  const svcText     = secText(serviciosImg, serviciosBg);
  const svcMid      = secMid(serviciosImg, serviciosBg);

  const nosotrosBg  = sc["bgNosotros"]  ?? "#ffffff";
  const nosotrosImg = iovr["sectionbg_bgNosotros"];
  const nosText     = secText(nosotrosImg, nosotrosBg);
  const nosMid      = secMid(nosotrosImg, nosotrosBg);

  const contactoBg  = sc["bgContacto"]  ?? NAVY;
  const contactoImg = iovr["sectionbg_bgContacto"];
  const conText     = secText(contactoImg, contactoBg);
  const conMid      = secMid(contactoImg, contactoBg);

  const footerBg    = sc["bgFooter"]    ?? NAVY_DARK;
  const footerImg   = iovr["sectionbg_bgFooter"];
  const ftMid       = secMid(footerImg, footerBg);

  const navBg          = sc["navBg"] ?? NAVY;
  const navDark        = getContrastColor(navBg) === "light";
  const navText        = navDark ? "#ffffff" : "#111111";
  const navTextMid     = navDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.45)";
  const navBorderColor = navDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.12)";

  const { cargando, logueado, nombreMostrado, panelHref, panelLabel, signOut } = useSesion();
  const router = useRouter();
  const [menuOpen,         setMenuOpen]         = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const [selected,   setSelected]   = useState<StorefrontProduct | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [annIdx,     setAnnIdx]     = useState(0);
  const [annVisible, setAnnVisible] = useState(true);
  const [favorites,     setFavorites]     = useState<string[]>([]);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState("");

  const DEFAULTS = ["🚗 Financiación en cuotas", "🔧 Vehículos inspeccionados", "🚚 Entrega en todo el país"];
  const promoBannerEnabled = config?.promoBanner?.enabled !== false;
  const annMessages = (config?.promoBanner?.messages?.filter(m => m.trim()) ?? []).length > 0
    ? config!.promoBanner!.messages!.filter(m => m.trim())
    : DEFAULTS;
  const showAnn = promoBannerEnabled && annVisible;
  const PROMO_H = 36;
  const NAV_H   = 64;

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

  const visible = products.slice(0, 8);
  const hasMore = products.length > 8;

  return (
    <div style={{ background: "#ffffff", color: "#1a2744",
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", minHeight: "100vh" }}>
      <style>{`
        ${AM_MODAL_CSS}
        .am-grid { display:grid; gap:16px; grid-template-columns:1fr }
        @media(min-width:480px){ .am-grid { grid-template-columns:repeat(2,1fr) } }
        @media(min-width:900px){ .am-grid { grid-template-columns:repeat(4,1fr) } }
        .am-nav-links { display:none }
        @media(min-width:768px){ .am-nav-links { display:flex } .am-burger { display:none } }
        .am-about { grid-template-columns:1fr }
        @media(min-width:768px){ .am-about { grid-template-columns:1fr 1fr } }
        .am-svc { grid-template-columns:1fr }
        @media(min-width:560px){ .am-svc { grid-template-columns:repeat(2,1fr) } }
        @media(min-width:900px){ .am-svc { grid-template-columns:repeat(4,1fr) } }
        @keyframes am-spin { to { transform:rotate(360deg) } }
        .am-svc-card { transition: border-bottom-color 0.2s, background 0.2s, transform 0.2s }
        .am-svc-card:hover { transform: translateY(-2px) }
      `}</style>

      {/* ── PROMO BAR ── */}
      {showAnn && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top:0,
          left: isPreview ? undefined : 0, right: isPreview ? undefined : 0,
          zIndex: isPreview ? CAPAS.previaNavAlto : 110, height: PROMO_H,
          background: NAVY_DARK, borderBottom: `1px solid rgba(255,255,255,0.1)`,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize:11, fontWeight:600, color:"#ffffff", letterSpacing:2 }}>
            {annMessages[annIdx]}
          </span>
          {annMessages.length > 1 && (
            <div style={{ position:"absolute", bottom:4, left:"50%", transform:"translateX(-50%)", display:"flex", gap:4 }}>
              {annMessages.map((_, i) => (
                <button key={i} onClick={() => setAnnIdx(i)}
                  style={{ width: i===annIdx ? 14 : 5, height:3, border:"none", borderRadius:2,
                    background: i===annIdx ? accent : "rgba(255,255,255,0.25)", cursor:"pointer", padding:0, transition:"all 0.3s" }} />
              ))}
            </div>
          )}
          <button onClick={() => setAnnVisible(false)}
            style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
              background:"none", border:"none", color:"#fff", cursor:"pointer", fontSize:16, opacity:0.6 }}>×</button>
        </div>
      )}

      {/* ── NAV ── */}
      <nav style={{ position: isPreview ? "sticky" : "fixed",
        top: showAnn ? PROMO_H : 0,
        left: isPreview ? undefined : 0, right: isPreview ? undefined : 0,
        zIndex: isPreview ? CAPAS.previaNav : 100,
        background: navBg,
        boxShadow: navDark ? "0 2px 16px rgba(13,31,60,0.35)" : "0 2px 12px rgba(0,0,0,0.08)",
        padding: "0 28px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", height:NAV_H,
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6,
            fontWeight:900, fontSize:15, letterSpacing:4, textTransform:"uppercase", color: navText }}>
            <EditableZone field="storeName" label="Nombre de la tienda">{storeName}</EditableZone>
            <VerifiedIconButton isVerified={config?.isVerified} info={config?.verifiedInfo} color={navText} />
          </div>
          <div className="am-nav-links" style={{ gap:32, alignItems:"center" }}>
            {[["Catálogo","catálogo"],["Servicios","servicios"],["Nosotros","nosotros"],["Contacto","contacto"]].map(([lbl,id]) => (
              <button key={id} onClick={() => smoothScrollTo(id)}
                style={{ background:"none", border:"none", cursor:"pointer", fontSize:11,
                  fontWeight:600, letterSpacing:2, textTransform:"uppercase", transition:"color 0.15s",
                  color: navTextMid }}
                onMouseEnter={e => (e.currentTarget.style.color=navText)}
                onMouseLeave={e => (e.currentTarget.style.color=navTextMid)}>
                {lbl}
              </button>
            ))}
            <Link href={`/tienda/${config?.slug ?? ""}/vehiculos${isPreview ? "?from=editor" : ""}`}
              style={{ background:accent, color: getContrastColor(accent)==="light"?"#fff":"#111",
                textDecoration:"none", padding:"8px 22px",
                fontSize:11, fontWeight:800, letterSpacing:1.5, textTransform:"uppercase" }}
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
                style={{ position:"relative", background:"none", border:"none", cursor:"pointer", padding:4,
                  display:"flex", alignItems:"center", color:navTextMid }}>
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
              <div style={{ position:"absolute", top:"calc(100% + 10px)", right:0, background:navBg, border:`1px solid ${navBorderColor}`, minWidth:190, zIndex:CAPAS.flotante, boxShadow:"0 8px 28px rgba(0,0,0,0.25)", overflow:"hidden" }}>
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
          <button className="am-burger" onClick={() => setMenuOpen(m => !m)}
            style={{ background:"none", border:`1px solid ${navBorderColor}`,
              color:navText, padding:"7px 11px", cursor:"pointer", fontSize:18 }}>
            {menuOpen ? "×" : "☰"}
          </button>
          </div>
        </div>
        {menuOpen && (
          <div style={{ background:navBg, borderTop:`1px solid ${navBorderColor}`, padding:"8px 28px 20px" }}>
            {[["Catálogo","catálogo"],["Servicios","servicios"],["Nosotros","nosotros"],["Contacto","contacto"]].map(([lbl,id]) => (
              <button key={id} onClick={() => { smoothScrollTo(id); setMenuOpen(false); }}
                style={{ display:"block", width:"100%", background:"none", border:"none",
                  color:navTextMid, cursor:"pointer", textAlign:"left",
                  padding:"12px 0", fontSize:11, fontWeight:700, textTransform:"uppercase",
                  letterSpacing:2, borderBottom:`1px solid ${navBorderColor}` }}>
                {lbl}
              </button>
            ))}
            <Link href={`/tienda/${config?.slug ?? ""}/vehiculos${isPreview ? "?from=editor" : ""}`}
              style={{ display:"block", color:accent, padding:"14px 0",
                fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:2, textDecoration:"none" }}
              onClick={() => setMenuOpen(false)}>
              Ver todos los vehículos
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{ position:"relative", minHeight:"100svh",
        display:"flex", flexDirection:"column", justifyContent:"flex-end",
        paddingTop: isPreview ? 0 : (showAnn ? PROMO_H + NAV_H : NAV_H), overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0,
          backgroundImage: `url(${heroBgUrl})`,
          backgroundSize:"cover", backgroundPosition:`${heroOv?.posX ?? 50}% ${heroOv?.posY ?? 40}%` }}>
          {heroOverlayType !== "none" && (
            <div style={{ position:"absolute", inset:0,
              background: heroIsLight
                ? `rgba(255,255,255,${heroOverlayOp})`
                : `linear-gradient(to top, rgba(13,31,60,${heroOverlayOp + 0.15}) 0%, rgba(13,31,60,${heroOverlayOp * 0.7}) 100%)` }} />
          )}
        </div>
        <EditableImageButton field="heroBackground" label="Imagen de fondo del hero" />
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:4, background:accent, zIndex:2 }} />

        <div style={{ position:"relative", zIndex:1, maxWidth:1200, margin:"0 auto",
          width:"100%", padding:"60px 28px 80px" }}>
          <p style={{ margin:"0 0 10px", fontSize:11, color:accent, letterSpacing:5, fontWeight:700, textTransform:"uppercase" }}>
            <EditableZone field="heroKicker" label="Etiqueta hero">Bienvenido a {storeName}</EditableZone>
          </p>
          <h1 style={{ margin:"0 0 20px", fontSize:"clamp(36px,7vw,88px)", fontWeight:900,
            color:heroText, letterSpacing:-3, lineHeight:0.9, textTransform:"uppercase" }}>
            <EditableZone field="heroHeading" label="Título hero">Encontrá tu próximo vehículo</EditableZone>
          </h1>
          <p style={{ margin:"0 0 44px", fontSize:"clamp(14px,1.8vw,17px)",
            color:heroMid, fontWeight:300, maxWidth:480, lineHeight:1.75 }}>
            <EditableZone field="heroSubtext" label="Subtítulo hero">La mejor selección de autos, motos y camionetas. Todos inspeccionados y con documentación en regla.</EditableZone>
          </p>
          <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
            <button onClick={() => smoothScrollTo("catálogo")}
              style={{ background:accent, color: getContrastColor(accent)==="light"?"#fff":"#111",
                border:"none", padding:"15px 40px", fontWeight:800, fontSize:12,
                letterSpacing:2, textTransform:"uppercase", cursor:"pointer" }}>
              Ver catálogo
            </button>
            {whatsapp.enabled && whatsapp.number && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}${whatsapp.message?"?text="+encodeURIComponent(whatsapp.message):""}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display:"flex", alignItems:"center", gap:8,
                  background:"rgba(255,255,255,0.12)", backdropFilter:"blur(8px)",
                  border:`1px solid ${heroNavBorder}`, color:heroText, textDecoration:"none",
                  padding:"15px 28px", fontWeight:600, fontSize:12, letterSpacing:0.5 }}>
                <WaIcon size={15} /> WhatsApp
              </a>
            )}
          </div>
          {!loadingProducts && (
            <p style={{ margin:"28px 0 0", fontSize:11, color:accent, fontWeight:600, letterSpacing:1.5 }}>
              {products.length} vehículo{products.length!==1?"s":""} disponible{products.length!==1?"s":""}
            </p>
          )}
        </div>
      </section>

      <div style={{ display:"flex", flexDirection:"column" }}>
      {/* ── STATS STRIP — white bg, accent numbers ── */}
      <SectionBlock id="am-stats" label="Estadísticas" isPreview={isPreview} defaultOrder={AM_SECTION_IDS}>
      <div style={{ background:"#ffffff", borderTop:`4px solid ${accent}`,
        borderBottom:"1px solid rgba(0,0,0,0.06)", padding:"0 28px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto",
          display:"flex", flexWrap:"wrap", justifyContent:"center" }}>
          {[
            { fv:"stat1", fl:"statLabel1", n:"200+", l:"Vehículos" },
            { fv:"stat2", fl:"statLabel2", n:"15",   l:"Años en el mercado" },
            { fv:"stat3", fl:"statLabel3", n:"98%",  l:"Clientes satisfechos" },
            { fv:"stat4", fl:"statLabel4", n:"12",   l:"Marcas disponibles" },
          ].map((s,i) => (
            <div key={i} style={{ textAlign:"center", padding:"28px 40px",
              borderRight: i<3 ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
              <p style={{ margin:0, fontSize:"clamp(22px,3.5vw,34px)", fontWeight:900, color:accent, letterSpacing:-1 }}>
                <EditableZone field={s.fv} label={`Número stat ${i+1}`}>{s.n}</EditableZone>
              </p>
              <p style={{ margin:"3px 0 0", fontSize:10, color:"#999",
                textTransform:"uppercase", letterSpacing:2 }}>
                <EditableZone field={s.fl} label={`Etiqueta stat ${i+1}`}>{s.l}</EditableZone>
              </p>
            </div>
          ))}
        </div>
      </div>
      </SectionBlock>

      {/* ── CATÁLOGO — sin filtros ── */}
      <SectionBlock id="am-catalogo" label="Catálogo" isPreview={isPreview} defaultOrder={AM_SECTION_IDS}>
      <section id="catálogo" style={{ padding:"72px 28px", position:"relative",
        ...secBg(catalogoImg, catalogoBg) }}>
        <BgDragHandle imgKey="sectionbg_bgCatalogo" />
        <SectionOverlay ov={catalogoImg} />
        <EditableSectionBg field="bgCatalogo" label="Fondo catálogo" />
        <div style={{ position:"relative", zIndex:1, maxWidth:1200, margin:"0 auto" }}>
          <div style={{ marginBottom:40 }}>
            <p style={{ margin:"0 0 8px", fontSize:10, color:accent,
              textTransform:"uppercase", letterSpacing:4, fontWeight:700 }}>
              <EditableZone field="catalogKicker" label="Kicker catálogo">Nuestros vehículos</EditableZone>
            </p>
            <h2 style={{ margin:0, fontSize:"clamp(24px,4vw,42px)", fontWeight:900,
              color:catText, letterSpacing:-1, textTransform:"uppercase" }}>
              <EditableZone field="catalogHeading" label="Título catálogo">Catálogo</EditableZone>
            </h2>
          </div>

          {loadingProducts ? (
            <div style={{ textAlign:"center", padding:"60px 0" }}>
              <div style={{ width:40, height:40, border:`3px solid ${accent}`,
                borderTopColor:"transparent", borderRadius:"50%",
                animation:"am-spin 0.8s linear infinite", margin:"0 auto" }} />
            </div>
          ) : visible.length > 0 ? (
            <div className="am-grid">
              {visible.map(p => (
                <VehicleCard key={p.id} product={p} accent={accent} currency={currency}
                  theme={catTheme} onClick={() => setSelected(p)}
                  isFavorite={favorites.includes(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:"60px 0",
              border:`1px dashed ${catText==="#ffffff" ? "#3a5a8a" : "#c8d8e8"}` }}>
              <p style={{ margin:0, color:catMid, fontSize:14 }}>Aún no hay vehículos publicados.</p>
            </div>
          )}

          {hasMore && (
            <div style={{ textAlign:"center", marginTop:44 }}>
              <Link href={`/tienda/${config?.slug ?? ""}/vehiculos${isPreview ? "?from=editor" : ""}`}
                style={{ display:"inline-flex", alignItems:"center", gap:10,
                  background:accent, color: getContrastColor(accent)==="light"?"#fff":"#111",
                  textDecoration:"none", padding:"16px 52px",
                  fontWeight:800, fontSize:12, letterSpacing:2, textTransform:"uppercase" }}>
                Ver todo
              </Link>
            </div>
          )}
        </div>
      </section>
      </SectionBlock>

      {/* ── SERVICIOS — navy bg ── */}
      <SectionBlock id="am-servicios" label="Servicios" isPreview={isPreview} defaultOrder={AM_SECTION_IDS}>
      <section id="servicios" style={{ padding:"80px 28px", position:"relative",
        ...secBg(serviciosImg, serviciosBg) }}>
        <BgDragHandle imgKey="sectionbg_bgServicios" />
        <SectionOverlay ov={serviciosImg} />
        <EditableSectionBg field="bgServicios" label="Fondo servicios" />
        <div style={{ position:"relative", zIndex:1, maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:52 }}>
            <div style={{ width:36, height:3, background:accent, flexShrink:0 }} />
            <h2 style={{ margin:0, fontSize:"clamp(22px,4vw,38px)", fontWeight:900,
              color:svcText, letterSpacing:-0.5, textTransform:"uppercase" }}>
              <EditableZone field="serviciosHeading" label="Título servicios">Por qué elegirnos</EditableZone>
            </h2>
          </div>
          <div className="am-svc" style={{ display:"grid", gap:3 }}>
            {[
              { fv:"svc1Title", fl:"svc1Desc", n:"01", t:"Vehículos verificados",  d:"Cada auto pasa una inspección técnica completa antes de publicarse en el catálogo." },
              { fv:"svc2Title", fl:"svc2Desc", n:"02", t:"Financiación propia",     d:"Planes en cuotas fijas adaptados a tu presupuesto. Sin vueltas, sin sorpresas." },
              { fv:"svc3Title", fl:"svc3Desc", n:"03", t:"Documentación en regla",  d:"Nos encargamos de todos los trámites de transferencia sin costo adicional." },
              { fv:"svc4Title", fl:"svc4Desc", n:"04", t:"Entrega en todo el país", d:"Coordinamos la entrega de tu vehículo a domicilio donde lo necesites." },
            ].map((s,i) => (
              <div key={i} className="am-svc-card"
                style={{ padding:"36px 28px",
                  background: svcText==="#ffffff" ? "rgba(255,255,255,0.07)" : "#f4f8ff",
                  border:`1px solid ${svcText==="#ffffff" ? "rgba(255,255,255,0.1)" : "rgba(27,63,110,0.12)"}`,
                  borderBottom:`3px solid transparent` }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderBottomColor = accent;
                  (e.currentTarget as HTMLDivElement).style.background = svcText==="#ffffff" ? "rgba(255,255,255,0.13)" : "#eaf0fa";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderBottomColor = "transparent";
                  (e.currentTarget as HTMLDivElement).style.background = svcText==="#ffffff" ? "rgba(255,255,255,0.07)" : "#f4f8ff";
                }}>
                <p style={{ margin:"0 0 14px", fontSize:42, fontWeight:900, color:accent,
                  lineHeight:1, letterSpacing:-2 }}>{s.n}</p>
                <p style={{ margin:"0 0 8px", fontSize:15, fontWeight:800, color:svcText }}>
                  <EditableZone field={s.fv} label={`Servicio ${i+1} — Título`}>{s.t}</EditableZone>
                </p>
                <p style={{ margin:0, fontSize:13, color:svcMid, lineHeight:1.75 }}>
                  <EditableZone field={s.fl} label={`Servicio ${i+1} — Descripción`}>{s.d}</EditableZone>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </SectionBlock>

      {/* ── NOSOTROS ── */}
      <SectionBlock id="am-nosotros" label="Nuestra historia" isPreview={isPreview} defaultOrder={AM_SECTION_IDS}>
      <section id="nosotros" style={{ padding:"80px 28px", position:"relative",
        ...secBg(nosotrosImg, nosotrosBg) }}>
        <BgDragHandle imgKey="sectionbg_bgNosotros" />
        <SectionOverlay ov={nosotrosImg} />
        <EditableSectionBg field="bgNosotros" label="Fondo nosotros" />
        <div className="am-about" style={{ position:"relative", zIndex:1, maxWidth:1200,
          margin:"0 auto", display:"grid", gap:60, alignItems:"center" }}>
          <div>
            <p style={{ margin:"0 0 10px", fontSize:10, color:accent,
              textTransform:"uppercase", letterSpacing:4, fontWeight:700 }}>
              <EditableZone field="nosotrosKicker" label="Kicker nosotros">Quiénes somos</EditableZone>
            </p>
            <h2 style={{ margin:"0 0 22px", fontSize:"clamp(24px,4vw,46px)", fontWeight:900,
              color:nosText, letterSpacing:-1.5, lineHeight:1.0, textTransform:"uppercase" }}>
              <EditableZone field="nosotrosHeading" label="Título nosotros">Más de 15 años en el mercado automotor</EditableZone>
            </h2>
            <p style={{ margin:"0 0 14px", fontSize:15, color:nosMid, lineHeight:1.9, fontWeight:300 }}>
              <EditableZone field="nosotrosP1" label="Párrafo 1">Somos especialistas en compra y venta de vehículos usados y a estrenar. Trabajamos con transparencia y seriedad para que tu experiencia sea única.</EditableZone>
            </p>
            <p style={{ margin:"0 0 32px", fontSize:15, color:nosMid, lineHeight:1.9, fontWeight:300 }}>
              <EditableZone field="nosotrosP2" label="Párrafo 2">Cada vehículo en nuestro catálogo fue inspeccionado por nuestro equipo técnico. La documentación y la transferencia las gestionamos nosotros sin costo adicional.</EditableZone>
            </p>
            <div style={{ width:48, height:4, background:accent }} />
          </div>
          <div style={{ position:"relative", overflow:"hidden", aspectRatio:"4/3",
            boxShadow:"0 20px 60px rgba(13,31,60,0.15)" }}>
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
        </div>
      </section>
      </SectionBlock>

      {/* ── CONTACTO ── */}
      <SectionBlock id="am-contacto" label="Contacto" isPreview={isPreview} defaultOrder={AM_SECTION_IDS}>
      <section id="contacto" style={{ padding:"80px 28px", position:"relative",
        ...secBg(contactoImg, contactoBg), borderTop:`4px solid ${accent}` }}>
        <BgDragHandle imgKey="sectionbg_bgContacto" />
        <SectionOverlay ov={contactoImg} />
        <EditableSectionBg field="bgContacto" label="Fondo contacto" />
        <div style={{ position:"relative", zIndex:1, maxWidth:640, margin:"0 auto", textAlign:"center" }}>
          <p style={{ margin:"0 0 10px", fontSize:10, color:accent,
            textTransform:"uppercase", letterSpacing:4, fontWeight:700 }}>Contacto</p>
          <h2 style={{ margin:"0 0 18px", fontSize:"clamp(28px,5vw,54px)", fontWeight:900,
            color:conText, letterSpacing:-2, textTransform:"uppercase", lineHeight:1.0 }}>
            <EditableZone field="contactHeading" label="Título contacto">¿Encontraste tu vehículo?</EditableZone>
          </h2>
          <p style={{ margin:"0 0 44px", fontSize:15, color:conMid, lineHeight:1.9, fontWeight:300,
            maxWidth:420, marginInline:"auto" }}>
            <EditableZone field="contactSubtext" label="Subtítulo contacto">Escribinos y un asesor te responde en minutos para coordinar una visita sin compromiso.</EditableZone>
          </p>
          {whatsapp.enabled && whatsapp.number && (
            <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}${whatsapp.message?"?text="+encodeURIComponent(whatsapp.message):""}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:12, background:"#25d366",
                color:"white", textDecoration:"none", padding:"18px 48px",
                fontWeight:900, fontSize:15, boxShadow:"0 12px 40px rgba(37,211,102,0.3)" }}>
              <WaIcon size={22} />
              <EditableZone field="contactWhatsApp" label="Texto botón WhatsApp">Escribinos por WhatsApp</EditableZone>
            </a>
          )}
        </div>
      </section>
      </SectionBlock>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ position:"relative", padding:"32px 28px", textAlign:"center",
        ...secBg(footerImg, footerBg), borderTop:"1px solid rgba(255,255,255,0.07)" }}>
        <BgDragHandle imgKey="sectionbg_bgFooter" />
        <SectionOverlay ov={footerImg} />
        <EditableSectionBg field="bgFooter" label="Fondo footer" nombreBloque="Pie de la tienda" />
        <div style={{ position:"relative", zIndex:1 }}>
          <p style={{ margin:"0 0 6px", fontWeight:900, fontSize:12,
            color:accent, letterSpacing:5, textTransform:"uppercase" }}>{storeName}</p>
          <p style={{ margin:"0 0 14px", fontSize:11, color:ftMid, letterSpacing:0.5 }}>
            <EditableZone field="footerCopyright" label="Copyright">
              {`© ${new Date().getFullYear()} ${storeName}. Todos los derechos reservados.`}
            </EditableZone>
          </p>
          <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:"0 16px" }}>
            {linksLegales(config?.slug, config?.legales, { enEditor: isPreview, tipoTienda: "AUTOS" }).map(({ clave: tipo, label }) => (
              <a key={tipo} href={`/tienda/${config?.slug ?? ""}/politicas?tipo=${tipo}`}
                style={{ fontSize:10, color:ftMid, opacity:0.45, textDecoration:"none", letterSpacing:0.5 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity="1"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity="0.45"; }}>
                {label}
              </a>
            ))}
            {!isOwner && (
              <button onClick={() => setShowReport(true)}
                style={{ fontSize:10, color:ftMid, opacity:0.45, background:"none", border:"none",
                  cursor:"pointer", padding:0, letterSpacing:0.5 }}
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
      {/* El buscador va a SU capa, no a la de la barra.

          Estaban las dos en `CAPAS.nav`, y al empatar gana la que se dibuja
          ultima — que es la barra. O sea que la barra le quedaba ENCIMA al
          buscador, y como la × del buscador va arriba a la derecha, terminaba
          justo abajo del boton del carrito: se la tocaba y el clic se lo comia
          la barra. Medido con el navegador: el clic sobre la × no llegaba nunca.
          `CAPAS.buscador` existe para esto exactamente y no la usaba nadie.

          Y ahora cierra tocando afuera. Antes no, asi que con la × tapada la
          unica salida era Escape — que nadie adivina. Se compara `target` con
          `currentTarget` para que tocar el campo o un resultado no cuente como
          "afuera". */}
      {searchOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) setSearchOpen(false); }} style={{ position:"fixed", inset:0, zIndex:CAPAS.buscador, background:"rgba(255,255,255,0.97)", backdropFilter:"blur(8px)", display:"flex", flexDirection:"column", alignItems:"center", paddingTop:120 }}>
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
      <div style={{ position:"fixed", inset:0, zIndex: isPreview ? CAPAS.previaModal : 205, pointerEvents: favoritesOpen ? "auto" : "none" }}>
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
          style={{ position:"fixed", bottom:24, right:24, zIndex:CAPAS.panel,
            background:"#25d366", color:"white", width:56, height:56,
            borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 4px 24px rgba(37,211,102,0.45)", textDecoration:"none" }}>
          <WaIcon size={24} />
        </a>
      )}
    </div>
  );
}
