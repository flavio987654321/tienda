"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { usePushBell } from "@/contexts/PushBellContext";
import { EditableZone, EditableImageButton, EditableSectionBg, BgDragHandle, getContrastColor, useEditContext } from "@/contexts/EditContext";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";
import type { ImageOverride } from "@/types/store-config";
import VerifiedIconButton from "@/components/store/VerifiedIconButton";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import { fmtPrice, attr, WaIcon, AUTO_SERVICES, VehicleCard, VehicleModal } from "@/components/store/auto/AutoVehicleShared";
function smoothScrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

/* ── Section bg helpers ──────────────────────────────────── */
function secBg(ov: ImageOverride | undefined, fallback: string): React.CSSProperties {
  if (ov?.url) return { backgroundImage: `url(${ov.url})`, backgroundSize: "cover", backgroundPosition: `${ov.posX ?? 50}% ${ov.posY ?? 50}%` };
  return { background: fallback };
}
function secText(ov: ImageOverride | undefined, bg: string): string {
  if (ov?.url) return ov.overlayType === "light" ? "#111111" : "#ffffff";
  return getContrastColor(bg) === "light" ? "#ffffff" : "#111111";
}
function secMid(ov: ImageOverride | undefined, bg: string): string {
  if (ov?.url) return ov.overlayType === "light" ? "#555555" : "rgba(255,255,255,0.6)";
  return getContrastColor(bg) === "light" ? "rgba(255,255,255,0.55)" : "#888888";
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
/* ── Category Tile ─────────────────────────────────────────── */
function CategoryTile({ cat, count, accent, active, onClick, dark }: {
  cat: string; count: number; accent: string; active: boolean; dark: boolean; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  const on = active || hov;
  const bg = dark
    ? (on ? accent : "#1a1a1a")
    : (on ? accent : "#f5f5f5");
  const col = on ? getContrastColor(accent) : (dark ? "#aaa" : "#555");
  const sub = on ? getContrastColor(accent) + "bb" : (dark ? "#555" : "#aaa");
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: bg, border: `1px solid ${on ? accent : (dark ? "#2a2a2a" : "#e8e8e8")}`,
        borderRadius: 2, padding: "18px 16px", cursor: "pointer", textAlign: "left",
        transition: "all 0.2s", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: col,
        textTransform: "uppercase", letterSpacing: 1.5, lineHeight: 1.2 }}>
        {cat}
      </span>
      <span style={{ fontSize: 10, fontWeight: 500, color: sub }}>
        {count} unidad{count !== 1 ? "es" : ""}
      </span>
    </button>
  );
}

/* ── Main ─────────────────────────────────────────────────── */
export default function AutoMotor() {
  const config = useStoreConfig();
  const pushBell = usePushBell();
  const { products, loadingProducts } = useStorefront();
  const { editMode } = useEditContext();
  const isPreview = !!config?.previewFill;
  const accent = config?.colors.accent ?? "#c9a227";
  const currency = config?.currency ?? "ARS";
  const storeName = config?.storeName ?? "AUTO MOTOR";
  const whatsapp = config?.whatsapp ?? { enabled: false, number: "" };

  const heroOv          = config?.imageOverrides?.["heroBackground"];
  const heroBgUrl       = heroOv?.url ?? "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1920&q=80";
  const heroOverlayType = heroOv?.overlayType ?? "dark";
  const heroOverlayOp   = heroOv?.overlayOpacity ?? 0.65;
  const heroPosX        = heroOv?.posX ?? 50;
  const heroPosY        = heroOv?.posY ?? 40;
  // Texto del hero y nav adapta al tipo de capa
  const heroIsLight     = heroOverlayType === "light";
  const heroTextColor   = heroIsLight ? "#111111" : "#ffffff";
  const heroMidColor    = heroIsLight ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.55)";
  const heroNavText     = heroIsLight ? "#111111" : "#ffffff";
  const heroNavMid      = heroIsLight ? "#555555" : "rgba(255,255,255,0.65)";
  const heroNavBorder   = heroIsLight ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.3)";

  const nosotrosUrl = config?.imageOverrides?.["nosotrosImage"]?.url
    ?? "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=900&q=80";

  const sc   = config?.sectionColors ?? {};
  const iovr = config?.imageOverrides ?? {};

  const statsBg    = sc["bgStats"]     ?? "#111111";
  const statsImg   = iovr["sectionbg_bgStats"];
  const statsText  = secText(statsImg, statsBg);

  const catsSectionBg  = sc["bgCategorias"] ?? "#f8f8f8";
  const catsSectionImg = iovr["sectionbg_bgCategorias"];
  const catsText       = secText(catsSectionImg, catsSectionBg);
  const catsMid        = secMid(catsSectionImg, catsSectionBg);
  const catsDark       = catsText === "#ffffff";

  const featuredBg  = sc["bgFeatured"] ?? "#111111";
  const featuredImg = iovr["sectionbg_bgFeatured"];
  const featText    = secText(featuredImg, featuredBg);
  const featMid     = secMid(featuredImg, featuredBg);

  const catalogoBg  = sc["bgCatalogo"]  ?? "#ffffff";
  const catalogoImg = iovr["sectionbg_bgCatalogo"];
  const catText     = secText(catalogoImg, catalogoBg);
  const catMid      = secMid(catalogoImg, catalogoBg);
  const catTheme    = catText === "#ffffff" ? "dark" as const : "light" as const;

  const serviciosBg = sc["bgServicios"] ?? "#0a0a0a";
  const serviciosImg= iovr["sectionbg_bgServicios"];
  const svcText     = secText(serviciosImg, serviciosBg);
  const svcMid      = secMid(serviciosImg, serviciosBg);
  const svcIsLight  = svcText === "#111111";
  const svcCardBg   = svcIsLight ? "#f8f8f8" : "#1a1a1a";
  const svcCardBor  = svcIsLight ? "#e8e8e8" : "#2a2a2a";

  const nosotrosBg  = sc["bgNosotros"]  ?? "#111111";
  const nosotrosImg = iovr["sectionbg_bgNosotros"];
  const nosText     = secText(nosotrosImg, nosotrosBg);
  const nosMid      = secMid(nosotrosImg, nosotrosBg);

  const contactoBg  = sc["bgContacto"]  ?? "#ffffff";
  const contactoImg = iovr["sectionbg_bgContacto"];
  const conText     = secText(contactoImg, contactoBg);
  const conMid      = secMid(contactoImg, contactoBg);

  const footerBg   = sc["bgFooter"]    ?? "#0a0a0a";
  const footerImg  = iovr["sectionbg_bgFooter"];
  const ftText     = secText(footerImg, footerBg);
  const ftMid      = secMid(footerImg, footerBg);

  const [menuOpen, setMenuOpen]       = useState(false);
  const [selected, setSelected]       = useState<StorefrontProduct | null>(null);
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [showAll, setShowAll]         = useState(false);
  const [scrolled, setScrolled]       = useState(false);
  const [showReport, setShowReport]   = useState(false);
  const [announcementIdx,      setAnnouncementIdx]      = useState(0);
  const [announcementVisible,  setAnnouncementVisible]  = useState(true);

  const AM_DEFAULTS = ["🚗 Financiación en 12 cuotas sin interés", "🔧 Servicio post-venta incluido", "🚚 Entrega en todo el país"];
  const promoBannerEnabled = config?.promoBanner?.enabled !== false;
  const announcementMessages = (config?.promoBanner?.messages?.filter(m => m.trim()) ?? []).length > 0
    ? config!.promoBanner!.messages!.filter(m => m.trim())
    : AM_DEFAULTS;
  const showAnnouncement = promoBannerEnabled && announcementVisible;
  const PROMO_BAR_H = 36;

  useEffect(() => {
    const allowsPinch = (el: Element | null) => {
      while (el) { if ((el as HTMLElement).style?.touchAction?.includes("pinch-zoom")) return true; el = el.parentElement; }
      return false;
    };
    const preventPinch = (e: TouchEvent) => { if (e.touches.length > 1 && !allowsPinch(e.target as Element)) e.preventDefault(); };
    const preventGesture = (e: Event) => { if (!allowsPinch((e as any).target as Element)) e.preventDefault(); };
    document.addEventListener("touchmove", preventPinch, { passive: false });
    document.addEventListener("gesturestart", preventGesture as EventListener);
    document.addEventListener("gesturechange", preventGesture as EventListener);
    return () => {
      document.removeEventListener("touchmove", preventPinch);
      document.removeEventListener("gesturestart", preventGesture as EventListener);
      document.removeEventListener("gesturechange", preventGesture as EventListener);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!showAnnouncement || announcementMessages.length <= 1) return;
    const id = setInterval(() => setAnnouncementIdx(i => (i + 1) % announcementMessages.length), 3500);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAnnouncement, announcementMessages.length]);

  useEffect(() => {
    if (!products.length) return;
    const id = new URLSearchParams(window.location.search).get("producto");
    if (id) {
      const p = products.find(pr => pr.id === id);
      if (p) setSelected(p);
    }
  }, [products]);

  const categoryList = useMemo(() =>
    Array.from(new Set(products.map(p => p.category))).filter(Boolean), [products]);
  const categories = useMemo(() => ["Todos", ...categoryList], [categoryList]);
  const categoryCount = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach(p => { if (p.category) map[p.category] = (map[p.category] ?? 0) + 1; });
    return map;
  }, [products]);

  const featured = products.find(p => p.badge === "DESTACADO") ?? products[0] ?? null;
  const filtered = activeCategory === "Todos" ? products : products.filter(p => p.category === activeCategory);

  return (
    <div style={{ background: "#ffffff", color: "#111111",
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", minHeight: "100vh" }}>
      <style>{`
        .am-grid { grid-template-columns: 1fr !important }
        @media(min-width:560px){ .am-grid { grid-template-columns: repeat(2,1fr) !important } }
        @media(min-width:960px){ .am-grid { grid-template-columns: repeat(3,1fr) !important } }
        .am-cats { grid-template-columns: repeat(2,1fr) !important }
        @media(min-width:480px){ .am-cats { grid-template-columns: repeat(3,1fr) !important } }
        @media(min-width:768px){ .am-cats { grid-template-columns: repeat(4,1fr) !important } }
        @media(min-width:1024px){ .am-cats { grid-template-columns: repeat(6,1fr) !important } }
        .am-nav-links { display: none !important }
        @media(min-width:768px){ .am-nav-links { display: flex !important } .am-burger { display: none !important } }
        .am-stats { grid-template-columns: repeat(2,1fr) }
        @media(min-width:640px){ .am-stats { grid-template-columns: repeat(4,1fr) !important } }
        .am-about { grid-template-columns: 1fr !important }
        @media(min-width:768px){ .am-about { grid-template-columns: 1fr 1fr !important } }
        .am-modal-body { grid-template-columns: 1fr !important }
        @media(min-width:700px){ .am-modal-body { grid-template-columns: 3fr 2fr !important } }
        .am-specs-grid { grid-template-columns: 1fr !important }
        @media(min-width:560px){ .am-specs-grid { grid-template-columns: 1fr 1fr !important } }
        .am-similar-grid { grid-template-columns: repeat(2,1fr) !important }
        @media(min-width:560px){ .am-similar-grid { grid-template-columns: repeat(4,1fr) !important } }
        .am-img-wrap { flex-direction: column !important }
        .am-img-thumbs { flex-direction: row !important; overflow-x: auto !important; overflow-y: hidden !important; width: 100% !important; max-height: 64px !important; padding: 6px 8px !important }
        @media(min-width:700px){
          .am-img-wrap { flex-direction: row !important }
          .am-img-thumbs { flex-direction: column !important; overflow-x: hidden !important; overflow-y: auto !important; width: 80px !important; max-height: none !important; padding: 8px 6px !important }
        }
        .am-svc { grid-template-columns: 1fr !important }
        @media(min-width:560px){ .am-svc { grid-template-columns: repeat(2,1fr) !important } }
        @media(min-width:900px){ .am-svc { grid-template-columns: repeat(4,1fr) !important } }
      `}</style>

      {/* ── Promo Bar ──────────────────────────────────────── */}
      {showAnnouncement && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top: 0, left: isPreview ? undefined : 0, right: isPreview ? undefined : 0, zIndex: 110,
          height: PROMO_BAR_H, background: "#111111",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", letterSpacing: 1 }}>
            {announcementMessages[announcementIdx]}
          </span>
          {announcementMessages.length > 1 && (
            <div style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4 }}>
              {announcementMessages.map((_, i) => (
                <button key={i} onClick={() => setAnnouncementIdx(i)}
                  style={{ width: i === announcementIdx ? 14 : 5, height: 3, border: "none", borderRadius: 2, background: i === announcementIdx ? accent : "rgba(255,255,255,0.3)", cursor: "pointer", padding: 0, transition: "all 0.3s" }} />
              ))}
            </div>
          )}
          <button onClick={() => setAnnouncementVisible(false)}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 16, lineHeight: 1, opacity: 0.7 }}>×</button>
        </div>
      )}

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav style={{ position: isPreview ? "sticky" : "fixed", top: showAnnouncement ? PROMO_BAR_H : 0, left: isPreview ? undefined : 0, right: isPreview ? undefined : 0, zIndex: 100,
        background: scrolled ? "rgba(255,255,255,0.97)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid #ebebeb" : "none",
        transition: "all 0.35s", padding: "0 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", height: 68,
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 900, fontSize: 15, letterSpacing: 4,
            color: scrolled ? "#111" : heroNavText, textTransform: "uppercase",
            transition: "color 0.35s" }}>
            <EditableZone field="storeName" label="Nombre de la tienda">{storeName}</EditableZone>
            <VerifiedIconButton isVerified={config?.isVerified} info={config?.verifiedInfo} />
          </div>
          <div className="am-nav-links" style={{ display: "flex", gap: 36, alignItems: "center" }}>
            {[["Catálogo", "catálogo"], ["Servicios", "servicios"], ["Nosotros", "nosotros"], ["Contacto", "contacto"]].map(([label, id]) => (
              <button key={id} onClick={() => smoothScrollTo(id)}
                style={{ background: "none", border: "none",
                  color: scrolled ? "#888" : heroNavMid,
                  cursor: "pointer", fontSize: 11, fontWeight: 600,
                  letterSpacing: 2, textTransform: "uppercase", transition: "color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = accent)}
                onMouseLeave={e => (e.currentTarget.style.color = scrolled ? "#888" : heroNavMid)}>
                {label}
              </button>
            ))}
            <Link href={`/tienda/${config?.slug ?? ""}/vehiculos${isPreview ? "?from=editor" : ""}`}
              style={{ background: "none", border: `1px solid ${scrolled ? "#d0d0d0" : heroNavBorder}`,
                color: scrolled ? "#555" : heroNavText, padding: "7px 18px",
                fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
                textDecoration: "none", transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = accent; (e.currentTarget as HTMLElement).style.color = getContrastColor(accent); }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = scrolled ? "#555" : heroNavText; }}>
              Ver todos
            </Link>
            {pushBell && config?.showPushBell && !isPreview && (
              <button onClick={pushBell.openDrawer} style={{ position:"relative", background:"none", border:"none", color: scrolled ? "#555" : heroNavText, cursor:"pointer", padding:4, display:"flex", alignItems:"center", transition:"color 0.35s" }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill={pushBell.subState === "subscribed" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {pushBell.hasNew && <span style={{ position:"absolute", top:2, right:2, width:10, height:10, background:"#ef4444", borderRadius:"50%", border:"2px solid white" }} />}
              </button>
            )}
            {isPreview && (
              config?.showPushBell ? (
                <div title="Campanita de novedades — activa en tu tienda" style={{ position:"relative", padding:4, display:"flex", alignItems:"center", color:"#555", opacity:0.85, cursor:"default" }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </div>
              ) : (
                <a href="/dashboard/mi-plan" title="🔒 Solo Plan Plus — tocá para activar" style={{ position:"relative", padding:4, display:"flex", alignItems:"center", color:"#555", opacity:0.38, textDecoration:"none" }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  <span style={{ position:"absolute", top:0, right:0, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
                </a>
              )
            )}
            {whatsapp.enabled && whatsapp.number && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ background: accent, color: getContrastColor(accent),
                  textDecoration: "none", padding: "9px 22px",
                  fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>
                Consultar
              </a>
            )}
          </div>
          <button className="am-burger" onClick={() => setMenuOpen(m => !m)}
            style={{ background: "none", border: `1px solid ${scrolled ? "#e0e0e0" : heroNavBorder}`,
              color: scrolled ? "#555" : heroNavText, padding: "7px 11px", cursor: "pointer", fontSize: 18 }}>
            {menuOpen ? "×" : "☰"}
          </button>
        </div>
        {menuOpen && (
          <div style={{ background: "#fff", borderTop: "1px solid #ebebeb",
            padding: "8px 32px 20px" }}>
            {[["Catálogo", "catálogo"], ["Servicios", "servicios"], ["Nosotros", "nosotros"], ["Contacto", "contacto"]].map(([label, id]) => (
              <button key={id} onClick={() => { smoothScrollTo(id); setMenuOpen(false); }}
                style={{ display: "block", width: "100%", background: "none", border: "none",
                  color: "#555", cursor: "pointer", textAlign: "left",
                  padding: "12px 0", fontSize: 12, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: 2, borderBottom: "1px solid #f5f5f5" }}>
                {label}
              </button>
            ))}
            <Link href={`/tienda/${config?.slug ?? ""}/vehiculos${isPreview ? "?from=editor" : ""}`}
              style={{ display: "block", color: accent, padding: "12px 0", fontSize: 12, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 2, textDecoration: "none" }}
              onClick={() => setMenuOpen(false)}>
              Ver todos los vehículos →
            </Link>
          </div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section style={{ position: "relative", height: "100svh", minHeight: 600,
        display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0,
          backgroundImage: `url(${heroBgUrl})`,
          backgroundSize: "cover", backgroundPosition: `${heroPosX}% ${heroPosY}%` }}>
          {heroOverlayType !== "none" && (
            <div style={{ position: "absolute", inset: 0,
              background: heroIsLight
                ? `rgba(255,255,255,${heroOverlayOp})`
                : `linear-gradient(to top, rgba(0,0,0,${heroOverlayOp}) 0%, rgba(0,0,0,${+(heroOverlayOp * 0.4).toFixed(2)}) 40%, rgba(0,0,0,${+(heroOverlayOp * 0.1).toFixed(2)}) 100%)` }} />
          )}
        </div>
        <EditableImageButton field="heroBackground" label="Imagen de fondo del hero" />
        <div style={{ position: "relative", zIndex: 1, width: "100%",
          maxWidth: 1200, margin: "0 auto", padding: "0 32px 80px" }}>
          <p style={{ margin: "0 0 16px", fontSize: 10, color: accent,
            textTransform: "uppercase", letterSpacing: 5, fontWeight: 700 }}>
            <EditableZone field="heroBadge" label="Badge hero">Concesionaria Oficial</EditableZone>
          </p>
          <h1 style={{ margin: "0 0 18px", fontSize: "clamp(40px,7vw,80px)",
            fontWeight: 900, lineHeight: 0.92, color: heroTextColor, letterSpacing: -2,
            maxWidth: 720, textTransform: "uppercase" }}>
            <EditableZone field="heroHeading" label="Título principal">{"Tu próximo\nvehículo\nte espera."}</EditableZone>
          </h1>
          <p style={{ margin: "0 0 36px", fontSize: "clamp(14px,1.8vw,16px)",
            color: heroMidColor, maxWidth: 400, lineHeight: 1.85,
            fontWeight: 300, letterSpacing: 0.3 }}>
            <EditableZone field="heroSubtext" label="Subtítulo">Stock premium · Financiación disponible · Transferencia en regla.</EditableZone>
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => smoothScrollTo("catálogo")}
              style={{ background: accent, color: getContrastColor(accent), border: "none",
                padding: "15px 36px", fontWeight: 800, fontSize: 12,
                cursor: "pointer", letterSpacing: 2, textTransform: "uppercase" }}>
              <EditableZone field="heroCta" label="Botón principal">Ver catálogo</EditableZone>
            </button>
            {whatsapp.enabled && whatsapp.number && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8,
                  background: "transparent", color: heroMidColor,
                  textDecoration: "none", border: `1px solid ${heroNavBorder}`,
                  padding: "15px 28px", fontWeight: 600, fontSize: 12,
                  letterSpacing: 1, textTransform: "uppercase" }}>
                <WaIcon />
                <EditableZone field="heroCtaSecondary" label="Botón secundario">Hablar con asesor</EditableZone>
              </a>
            )}
          </div>
        </div>
        {!loadingProducts && (
          <div style={{ position: "absolute", bottom: 28, right: 32,
            fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 2, textTransform: "uppercase" }}>
            {products.length} vehículos en stock
          </div>
        )}
      </section>

      {/* ── Stats ──────────────────────────────────────────── */}
      <section style={{ position: "relative", ...secBg(statsImg, statsBg) }}>
        <BgDragHandle imgKey="sectionbg_bgStats" />
        <SectionOverlay ov={statsImg} />
        <EditableSectionBg field="bgStats" label="Fondo estadísticas" />
        <div className="am-stats" style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", display: "grid" }}>
          {[
            { fv: "stat1", fl: "statLabel1", n: "500+", l: "Vehículos vendidos" },
            { fv: "stat2", fl: "statLabel2", n: "15",   l: "Años de experiencia" },
            { fv: "stat3", fl: "statLabel3", n: "98%",  l: "Clientes satisfechos" },
            { fv: "stat4", fl: "statLabel4", n: "12",   l: "Marcas disponibles" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center", padding: "30px 10px",
              borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
              borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <p style={{ margin: 0, fontSize: "clamp(28px,5vw,40px)", fontWeight: 900, color: statsText, letterSpacing: -1 }}>
                <EditableZone field={s.fv} label={`Stat ${i+1}`}>{s.n}</EditableZone>
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 10, color: statsText,
                opacity: 0.45, textTransform: "uppercase", letterSpacing: 2, fontWeight: 500 }}>
                <EditableZone field={s.fl} label={`Etiqueta stat ${i+1}`}>{s.l}</EditableZone>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categorías ─────────────────────────────────────── */}
      {categoryList.length > 0 && (
        <section style={{ padding: "64px 32px", position: "relative", ...secBg(catsSectionImg, catsSectionBg) }}>
          <BgDragHandle imgKey="sectionbg_bgCategorias" />
          <SectionOverlay ov={catsSectionImg} />
          <EditableSectionBg field="bgCategorias" label="Fondo categorías" />
          <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between",
              flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
              <div>
                <p style={{ margin: "0 0 6px", fontSize: 10, color: accent,
                  textTransform: "uppercase", letterSpacing: 4, fontWeight: 700 }}>
                  <EditableZone field="catsKicker" label="Kicker categorías">Explorá por tipo</EditableZone>
                </p>
                <h2 style={{ margin: 0, fontSize: "clamp(22px,4vw,32px)",
                  fontWeight: 900, color: catsText, letterSpacing: -0.5 }}>
                  <EditableZone field="catsHeading" label="Título categorías">Categorías disponibles</EditableZone>
                </h2>
              </div>
              {activeCategory !== "Todos" && (
                <button onClick={() => { setActiveCategory("Todos"); smoothScrollTo("catálogo"); }}
                  style={{ background: "none", border: `1px solid ${catsMid}55`, color: catsMid,
                    padding: "8px 18px", cursor: "pointer", fontSize: 10,
                    fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
                  Ver todos →
                </button>
              )}
            </div>
            <div className="am-cats" style={{ display: "grid", gap: 8 }}>
              {categoryList.map(cat => (
                <CategoryTile key={cat} cat={cat} count={categoryCount[cat] ?? 0}
                  accent={accent} active={activeCategory === cat} dark={catsDark}
                  onClick={() => { setActiveCategory(cat); smoothScrollTo("catálogo"); }} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured ───────────────────────────────────────── */}
      {!loadingProducts && featured && (
        <section style={{ padding: "72px 32px 0", position: "relative", ...secBg(featuredImg, featuredBg) }}>
          <BgDragHandle imgKey="sectionbg_bgFeatured" />
          <SectionOverlay ov={featuredImg} />
          <EditableSectionBg field="bgFeatured" label="Fondo vehículo destacado" />
          <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto" }}>
            <p style={{ margin: "0 0 20px", fontSize: 10, color: accent,
              textTransform: "uppercase", letterSpacing: 5, fontWeight: 700 }}>
              <EditableZone field="featuredLabel" label="Etiqueta destacado">Vehículo destacado</EditableZone>
            </p>
            {/* Featured banner */}
            <div onClick={() => setSelected(featured)}
              style={{ position: "relative", borderRadius: 2, overflow: "hidden",
                aspectRatio: "21/9", cursor: "pointer", border: `1px solid ${accent}22` }}>
              <img src={featured.images[0] ?? heroBgUrl} alt={featured.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0,
                background: "linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)" }} />
              <div style={{ position: "absolute", inset: 0, padding: "clamp(20px,5vw,48px)",
                display: "flex", flexDirection: "column", justifyContent: "flex-end", maxWidth: "50%" }}>
                {featured.badge && (
                  <span style={{ alignSelf: "flex-start", marginBottom: 12,
                    background: accent, color: getContrastColor(accent),
                    fontSize: 9, fontWeight: 800, padding: "4px 14px",
                    textTransform: "uppercase", letterSpacing: 2 }}>
                    {featured.badge}
                  </span>
                )}
                <p style={{ margin: "0 0 4px", fontSize: 10, color: accent,
                  textTransform: "uppercase", letterSpacing: 4, fontWeight: 700 }}>
                  {featured.category}
                </p>
                <h3 style={{ margin: "0 0 8px", fontSize: "clamp(18px,3vw,34px)",
                  fontWeight: 900, color: "white", lineHeight: 1.05, letterSpacing: -0.5 }}>
                  {featured.name}
                </h3>
                <p style={{ margin: "0 0 20px", fontSize: "clamp(20px,3.5vw,36px)",
                  fontWeight: 900, color: accent, lineHeight: 1, letterSpacing: -1 }}>
                  {fmtPrice(featured.price, currency)}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                  {[attr(featured,"Condición"), attr(featured,"Año"),
                    attr(featured,"Km") ? `${Number(attr(featured,"Km")).toLocaleString("es-AR")} km` : "",
                    attr(featured,"Motor")].filter(Boolean).map((v, i) => (
                    <span key={i} style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)",
                      fontSize: 10, fontWeight: 600, padding: "4px 12px" }}>{v}</span>
                  ))}
                </div>
                <button style={{ alignSelf: "flex-start",
                  background: "transparent", color: "white", border: "1px solid rgba(255,255,255,0.4)",
                  padding: "10px 24px", fontWeight: 700, fontSize: 11,
                  cursor: "pointer", letterSpacing: 2, textTransform: "uppercase" }}>
                  Ver detalle →
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Catálogo ───────────────────────────────────────── */}
      <section id="catálogo" style={{ padding: "72px 32px", position: "relative", ...secBg(catalogoImg, catalogoBg) }}>
        <BgDragHandle imgKey="sectionbg_bgCatalogo" />
        <SectionOverlay ov={catalogoImg} />
        <EditableSectionBg field="bgCatalogo" label="Fondo catálogo" />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end",
            flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 10, color: accent,
                textTransform: "uppercase", letterSpacing: 4, fontWeight: 700 }}>
                <EditableZone field="catalogKicker" label="Etiqueta catálogo">Nuestro stock</EditableZone>
              </p>
              <h2 style={{ margin: 0, fontSize: "clamp(24px,4vw,38px)",
                fontWeight: 900, color: catText, letterSpacing: -0.5 }}>
                <EditableZone field="categoriesHeading" label="Título catálogo">Catálogo de vehículos</EditableZone>
              </h2>
            </div>
            <span style={{ fontSize: 12, color: catMid }}>
              {filtered.length} vehículo{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 36 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ background: activeCategory === cat ? accent : "transparent",
                  color: activeCategory === cat ? getContrastColor(accent) : catMid,
                  border: `1px solid ${activeCategory === cat ? accent : catMid + "44"}`,
                  padding: "7px 18px", cursor: "pointer",
                  fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
                  transition: "all 0.15s" }}>
                {cat}
              </button>
            ))}
          </div>

          {loadingProducts ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: catMid }}>Cargando vehículos…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: catMid }}>
              No hay vehículos en esta categoría.
            </div>
          ) : (
            <>
              <div className="am-grid" style={{ display: "grid", gap: 20 }}>
                {(showAll ? filtered : filtered.slice(0, 8)).map(p => (
                  <VehicleCard key={p.id} product={p} accent={accent}
                    currency={currency} theme={catTheme} onClick={() => setSelected(p)} />
                ))}
              </div>
              {filtered.length > 8 && (
                <div style={{ textAlign: "center", marginTop: 48 }}>
                  {showAll ? (
                    <button onClick={() => setShowAll(false)}
                      style={{ background: "none", border: `1px solid ${catMid}44`, color: catMid,
                        padding: "14px 40px", fontSize: 11, fontWeight: 700, letterSpacing: 2,
                        textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = catMid; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = catMid + "44"; }}>
                      Ver menos
                    </button>
                  ) : (
                    <Link href={`/tienda/${config?.slug ?? ""}/vehiculos${isPreview ? "?from=editor" : ""}`}
                      style={{ display: "inline-block", background: accent, color: getContrastColor(accent),
                        textDecoration: "none", padding: "14px 40px",
                        fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase",
                        transition: "opacity 0.2s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}>
                      Ver todos los vehículos ({filtered.length})
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Servicios ──────────────────────────────────────── */}
      <section id="servicios" style={{ padding: "80px 32px", position: "relative",
        ...secBg(serviciosImg, serviciosBg) }}>
        <BgDragHandle imgKey="sectionbg_bgServicios" />
        <SectionOverlay ov={serviciosImg} />
        <EditableSectionBg field="bgServicios" label="Fondo servicios" />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ margin: "0 0 8px", fontSize: 10, color: accent,
              textTransform: "uppercase", letterSpacing: 4, fontWeight: 700 }}>
              <EditableZone field="aboutKicker" label="Kicker servicios">Por qué elegirnos</EditableZone>
            </p>
            <h2 style={{ margin: 0, fontSize: "clamp(24px,4vw,38px)",
              fontWeight: 900, color: svcText, letterSpacing: -0.5 }}>
              <EditableZone field="aboutHeading" label="Título servicios">Servicios y garantías</EditableZone>
            </h2>
          </div>
          <div className="am-svc" style={{ display: "grid", gap: 16 }}>
            {[
              { fv: "garantia1Title", fl: "garantia1Desc", t: "Inspección técnica", d: "Revisión de 150 puntos antes de la venta." },
              { fv: "garantia2Title", fl: "garantia2Desc", t: "Documentación legal", d: "Transferencia y trámites 100% en regla." },
              { fv: "garantia3Title", fl: "garantia3Desc", t: "Financiación", d: "Planes de cuotas adaptados a tu presupuesto." },
              { fv: "garantia4Title", fl: "garantia4Desc", t: "Asesoría personal", d: "Te acompañamos en cada paso del proceso." },
            ].map((s, i) => (
              <div key={i} style={{ background: svcCardBg, padding: "32px 28px",
                border: `1px solid ${svcCardBor}`, borderTop: `3px solid ${accent}` }}>
                <p style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 800, color: svcText, letterSpacing: -0.3 }}>
                  <EditableZone field={s.fv} label={`Servicio ${i+1} — Título`}>{s.t}</EditableZone>
                </p>
                <p style={{ margin: 0, fontSize: 13, color: svcMid, lineHeight: 1.8, fontWeight: 400 }}>
                  <EditableZone field={s.fl} label={`Servicio ${i+1} — Desc`}>{s.d}</EditableZone>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Nosotros ───────────────────────────────────────── */}
      <section id="nosotros" style={{ padding: "80px 32px", position: "relative", ...secBg(nosotrosImg, nosotrosBg) }}>
        <BgDragHandle imgKey="sectionbg_bgNosotros" />
        <SectionOverlay ov={nosotrosImg} />
        <EditableSectionBg field="bgNosotros" label="Fondo nosotros" />
        <div className="am-about" style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto",
          display: "grid", gap: 64, alignItems: "center" }}>
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 10, color: accent,
              textTransform: "uppercase", letterSpacing: 4, fontWeight: 700 }}>
              <EditableZone field="contactKicker" label="Etiqueta nosotros">Nuestra historia</EditableZone>
            </p>
            <h2 style={{ margin: "0 0 24px", fontSize: "clamp(24px,4vw,38px)",
              fontWeight: 900, color: nosText, letterSpacing: -0.5 }}>
              <EditableZone field="aboutHeading2" label="Título nosotros">Años de pasión por los vehículos</EditableZone>
            </h2>
            <p style={{ margin: "0 0 16px", fontSize: 15, color: nosMid, lineHeight: 2, fontWeight: 300 }}>
              <EditableZone field="aboutParagraph1" label="Párrafo 1">Somos una empresa familiar con más de una década en el mercado automotor. Nuestro compromiso es la transparencia total en cada operación.</EditableZone>
            </p>
            <p style={{ margin: "0 0 36px", fontSize: 15, color: nosMid, lineHeight: 2, fontWeight: 300 }}>
              <EditableZone field="aboutParagraph2" label="Párrafo 2">Contamos con asesores especializados y taller propio para garantizar la calidad de cada vehículo en nuestro stock.</EditableZone>
            </p>
            {whatsapp.enabled && whatsapp.number && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8,
                  background: accent, color: getContrastColor(accent), textDecoration: "none",
                  padding: "13px 28px", fontWeight: 800, fontSize: 12,
                  letterSpacing: 1.5, textTransform: "uppercase" }}>
                <WaIcon /> Consultar ahora
              </a>
            )}
          </div>
          <div style={{ position: "relative", overflow: "hidden", aspectRatio: "4/3" }}>
            <img src={nosotrosUrl} alt="Nosotros"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            {(() => { const ov = config?.imageOverrides?.["nosotrosImage"]; if (!ov?.overlayType || ov.overlayType === "none") return null; return <div style={{ position:"absolute", inset:0, pointerEvents:"none", background: ov.overlayType === "light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.45})` }} />; })()}
            <EditableImageButton field="nosotrosImage" label="Imagen sección Nosotros" />
          </div>
        </div>
      </section>

      {/* ── Contacto ───────────────────────────────────────── */}
      <section id="contacto" style={{ padding: "100px 32px", position: "relative",
        ...secBg(contactoImg, contactoBg), borderTop: "1px solid #ebebeb" }}>
        <BgDragHandle imgKey="sectionbg_bgContacto" />
        <SectionOverlay ov={contactoImg} />
        <EditableSectionBg field="bgContacto" label="Fondo contacto" />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <p style={{ margin: "0 0 8px", fontSize: 10, color: accent,
            textTransform: "uppercase", letterSpacing: 4, fontWeight: 700 }}>Contacto</p>
          <h2 style={{ margin: "0 0 16px", fontSize: "clamp(28px,5vw,52px)",
            fontWeight: 900, color: conText, letterSpacing: -1, lineHeight: 1.0 }}>
            <EditableZone field="contactHeading" label="Título contacto">¿Encontraste tu vehículo?</EditableZone>
          </h2>
          <p style={{ margin: "0 0 40px", fontSize: 15, color: conMid,
            lineHeight: 1.9, fontWeight: 300, maxWidth: 460, marginInline: "auto" }}>
            <EditableZone field="contactSubtext" label="Subtítulo">Contactanos y un asesor te responde en minutos para coordinar una visita sin compromiso.</EditableZone>
          </p>
          {whatsapp.enabled && whatsapp.number && (
            <a href={`https://wa.me/${whatsapp.number.replace(/\D/g, "")}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 12,
                background: "#25d366", color: "white", textDecoration: "none",
                padding: "18px 44px", fontWeight: 900, fontSize: 15,
                boxShadow: "0 12px 40px rgba(37,211,102,0.3)", letterSpacing: 0.3 }}>
              <WaIcon size={22} />
              <EditableZone field="contactWhatsApp" label="WhatsApp de contacto">Escribinos por WhatsApp</EditableZone>
            </a>
          )}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer style={{ position: "relative", padding: "32px",
        ...secBg(footerImg, footerBg), borderTop: `1px solid rgba(255,255,255,0.06)`,
        textAlign: "center" }}>
        <BgDragHandle imgKey="sectionbg_bgFooter" />
        <SectionOverlay ov={footerImg} />
        <EditableSectionBg field="bgFooter" label="Fondo footer" />
        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ margin: "0 0 6px", fontWeight: 900, fontSize: 12,
            color: accent, letterSpacing: 5, textTransform: "uppercase" }}>
            {storeName}
          </p>
          <p style={{ margin: "0 0 12px", fontSize: 11, color: ftMid, letterSpacing: 0.5 }}>
            <EditableZone field="footerCopyright" label="Copyright">
              {`© ${new Date().getFullYear()} ${storeName}. Todos los derechos reservados.`}
            </EditableZone>
          </p>
          <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:"0 16px", marginBottom: 8 }}>
            {[
              { label: "Política de devoluciones", tipo: "devoluciones" },
              { label: "Política de envíos",       tipo: "envios" },
              { label: "Términos y condiciones",   tipo: "terminos" },
            ].map(({ label, tipo }) => (
              <a key={tipo} href={`/tienda/${config?.slug ?? ""}/politicas?tipo=${tipo}`}
                style={{ fontSize:10, color:ftMid, opacity:0.5, textDecoration:"none", letterSpacing:0.5 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.5"; }}>
                {label}
              </a>
            ))}
            {!editMode && (
              <button onClick={() => setShowReport(true)}
                style={{ fontSize:10, color:ftMid, opacity:0.5, background:"none", border:"none", cursor:"pointer", padding:0, letterSpacing:0.5 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.5"; }}>
                Reportar tienda
              </button>
            )}
          </div>
        </div>
      </footer>

      {showReport && (
        <ReportStoreModal slug={config?.slug ?? ""} onClose={() => setShowReport(false)} />
      )}

      {selected && (
        <VehicleModal product={selected} accent={accent} currency={currency}
          whatsapp={whatsapp} products={products}
          onClose={() => setSelected(null)} onSelect={p => setSelected(p)} />
      )}

      {!editMode && whatsapp.enabled && whatsapp.number && (
        <a href={`https://wa.me/${whatsapp.number.replace(/\D/g, "")}`}
          target="_blank" rel="noopener noreferrer"
          style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200,
            background: "#25d366", color: "white", width: 56, height: 56,
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 24px rgba(37,211,102,0.45)", textDecoration: "none" }}>
          <WaIcon size={24} />
        </a>
      )}
    </div>
  );
}
