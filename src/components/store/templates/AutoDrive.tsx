"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { usePushBell } from "@/contexts/PushBellContext";
import { EditableZone, EditableImageButton, EditableSectionBg, BgDragHandle, getContrastColor, useEditContext } from "@/contexts/EditContext";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";
import type { ImageOverride } from "@/types/store-config";
import VerifiedIconButton from "@/components/store/VerifiedIconButton";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import { fmtPrice, attr, WaIcon, VehicleCard, VehicleModal, AM_MODAL_CSS } from "@/components/store/auto/AutoVehicleShared";

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
  { fv:"cat1Label", fi:"cat1Icon", lbl:"Usados garantizados", icon:"🛡️", desc:"Revisados y certificados" },
  { fv:"cat2Label", fi:"cat2Icon", lbl:"Autos 0 km",          icon:"✨", desc:"Directo del concesionario" },
  { fv:"cat3Label", fi:"cat3Icon", lbl:"Financiación",         icon:"💳", desc:"Planes en cuotas fijas" },
  { fv:"cat4Label", fi:"cat4Icon", lbl:"Más servicios",        icon:"🔧", desc:"Taller y posventa" },
];

export default function AutoDrive() {
  const config       = useStoreConfig();
  const pushBell     = usePushBell();
  const { products, loadingProducts } = useStorefront();
  const { editMode } = useEditContext();
  const isPreview    = !!config?.previewFill;
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
  const catsMid     = secMid(catsImg, catsBg);

  const catalogoBg  = sc["bgCatalogo"]   ?? "#f7f8fa";
  const catalogoImg = iovr["sectionbg_bgCatalogo"];
  const catText     = secText(catalogoImg, catalogoBg);
  const catMid      = secMid(catalogoImg, catalogoBg);
  const catTheme    = catText==="#ffffff" ? "dark" as const : "light" as const;

  const statsBg     = sc["bgStats"]      ?? accent;
  const statsImg    = iovr["sectionbg_bgStats"];
  const statsText   = secText(statsImg, statsBg);

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

  const [menuOpen,   setMenuOpen]   = useState(false);
  const [selected,   setSelected]   = useState<StorefrontProduct | null>(null);
  const [scrolled,   setScrolled]   = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [annIdx,     setAnnIdx]     = useState(0);
  const [annVisible, setAnnVisible] = useState(true);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAnn, annMessages.length]);

  useEffect(() => {
    if (!products.length) return;
    const id = new URLSearchParams(window.location.search).get("producto");
    if (id) { const p = products.find(pr => pr.id === id); if (p) setSelected(p); }
  }, [products]);

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
          .ad-hero-left { padding:80px 52px; width:50% }
        }
        .ad-carousel-item { flex:0 0 calc(100% - 16px) }
        @media(min-width:480px){ .ad-carousel-item { flex:0 0 calc(50% - 12px) } }
        @media(min-width:768px){ .ad-carousel-item { flex:0 0 calc(33.333% - 12px) } }
        @media(min-width:1100px){ .ad-carousel-item { flex:0 0 calc(25% - 12px) } }
        .ad-carousel::-webkit-scrollbar { display:none }
        .ad-carousel { scrollbar-width:none; -ms-overflow-style:none }
        .ad-cats { grid-template-columns:repeat(2,1fr) }
        @media(min-width:640px){ .ad-cats { grid-template-columns:repeat(4,1fr) } }
        .ad-about { grid-template-columns:1fr }
        @media(min-width:768px){ .ad-about { grid-template-columns:1fr 1fr } }
        .ad-svc { grid-template-columns:1fr }
        @media(min-width:560px){ .ad-svc { grid-template-columns:repeat(2,1fr) } }
        @media(min-width:900px){ .ad-svc { grid-template-columns:repeat(4,1fr) } }
        @keyframes ad-spin { to { transform:rotate(360deg) } }
      `}</style>

      {/* ── PROMO BAR ──────────────────────────────────────────── */}
      {showAnn && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top:0,
          left: isPreview ? undefined : 0, right: isPreview ? undefined : 0,
          zIndex: isPreview ? 10001 : 110, height:PROMO_H, background:accent,
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:11, fontWeight:600, color:"#fff", letterSpacing:1 }}>
            {annMessages[annIdx]}
          </span>
          {annMessages.length > 1 && (
            <div style={{ position:"absolute", bottom:4, left:"50%", transform:"translateX(-50%)", display:"flex", gap:4 }}>
              {annMessages.map((_,i) => (
                <button key={i} onClick={() => setAnnIdx(i)}
                  style={{ width: i===annIdx ? 14 : 5, height:3, border:"none", borderRadius:2,
                    background: i===annIdx ? "#fff" : "rgba(255,255,255,0.4)", cursor:"pointer", padding:0, transition:"all 0.3s" }} />
              ))}
            </div>
          )}
          <button onClick={() => setAnnVisible(false)}
            style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
              background:"none", border:"none", color:"#fff", cursor:"pointer", fontSize:16, opacity:0.7 }}>×</button>
        </div>
      )}

      {/* ── NAV ────────────────────────────────────────────────── */}
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
            fontWeight:900, fontSize:18, color:accent, letterSpacing:-0.5 }}>
            <EditableZone field="storeName" label="Nombre de la tienda">{storeName}</EditableZone>
            <VerifiedIconButton isVerified={config?.isVerified} info={config?.verifiedInfo} />
          </div>
          <div className="ad-nav-links" style={{ display:"flex", gap:32, alignItems:"center" }}>
            {[["Catálogo","catálogo"],["Servicios","servicios"],["Nosotros","nosotros"],["Contacto","contacto"]].map(([lbl,id]) => (
              <button key={id} onClick={() => smoothScrollTo(id)}
                style={{ background:"none", border:"none", color:navTextMid, cursor:"pointer",
                  fontSize:13, fontWeight:500, transition:"color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.color=navText)}
                onMouseLeave={e => (e.currentTarget.style.color=navTextMid)}>
                {lbl}
              </button>
            ))}
            <Link href={`/tienda/${config?.slug ?? ""}/vehiculos${isPreview ? "?from=editor" : ""}`}
              style={{ border:`1.5px solid ${accent}`, color:accent, padding:"7px 18px",
                fontSize:12, fontWeight:700, letterSpacing:0.3, textDecoration:"none",
                transition:"all 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background=accent; (e.currentTarget as HTMLElement).style.color="#fff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="transparent"; (e.currentTarget as HTMLElement).style.color=accent; }}>
              Ver todos
            </Link>
            {pushBell && config?.showPushBell && !isPreview && (
              <button onClick={pushBell.openDrawer}
                style={{ position:"relative", background:"none", border:"none", color:navTextMid,
                  cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
                <svg width={20} height={20} viewBox="0 0 24 24"
                  fill={pushBell.subState==="subscribed"?"currentColor":"none"}
                  stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {pushBell.hasNew && <span style={{ position:"absolute", top:2, right:2, width:10, height:10,
                  background:"#ef4444", borderRadius:"50%", border:`2px solid ${navBg}` }} />}
              </button>
            )}
            {isPreview && (config?.showPushBell ? (
              <button onClick={config.onPreviewBellClick}
                style={{ padding:4, display:"flex", alignItems:"center", color:navTextMid, background:"none", border:"none", cursor:"pointer" }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </button>
            ) : (
              <button onClick={config?.onPreviewBellClick} title="🔒 Solo Plan Plus"
                style={{ position:"relative", padding:4, display:"flex", alignItems:"center", color:navTextMid, opacity:0.5, background:"none", border:"none", cursor:"pointer" }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <span style={{ position:"absolute", top:0, right:0, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
              </button>
            ))}
          </div>
          <button className="ad-burger" onClick={() => setMenuOpen(m => !m)}
            style={{ background:"none", border:`1px solid ${navBorderColor}`,
              color:navText, padding:"7px 11px", cursor:"pointer", fontSize:18 }}>
            {menuOpen ? "×" : "☰"}
          </button>
        </div>
        {menuOpen && (
          <div style={{ background:navBg, borderTop:`1px solid ${navBorderColor}`, padding:"8px 28px 20px" }}>
            {[["Catálogo","catálogo"],["Servicios","servicios"],["Nosotros","nosotros"],["Contacto","contacto"]].map(([lbl,id]) => (
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

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section style={{ paddingTop: isPreview ? 0 : (showAnn ? PROMO_H + NAV_H : NAV_H),
        position:"relative", ...secBg(heroImg, heroBg) }}>
        <BgDragHandle imgKey="sectionbg_bgHero" />
        <SectionOverlay ov={heroImg} />
        <EditableSectionBg field="bgHero" label="Fondo hero" />
        <div className="ad-hero" style={{ display:"flex", position:"relative", zIndex:1 }}>
          {/* left text */}
          <div className="ad-hero-left" style={{ display:"flex", flexDirection:"column",
            justifyContent:"center", boxSizing:"border-box" }}>
            <p style={{ margin:"0 0 14px", fontSize:11, color:accent,
              textTransform:"uppercase", letterSpacing:4, fontWeight:700 }}>
              <EditableZone field="heroKicker" label="Etiqueta hero">Tu próximo auto</EditableZone>
            </p>
            <h1 style={{ margin:"0 0 8px", fontSize:"clamp(36px,5.5vw,72px)",
              fontWeight:900, color:heroText, letterSpacing:-2, lineHeight:1.0 }}>
              <EditableZone field="heroHeading" label="Título hero">está acá</EditableZone>
            </h1>
            <div style={{ width:56, height:4, background:accent, marginBottom:24 }} />
            <p style={{ margin:"0 0 36px", fontSize:"clamp(14px,1.5vw,16px)",
              color:heroMid, fontWeight:300, lineHeight:1.85, maxWidth:420 }}>
              <EditableZone field="heroSubtext" label="Subtítulo hero">La mejor selección de vehículos usados y 0 km. Todos inspeccionados, con financiación disponible y entrega en todo el país.</EditableZone>
            </p>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              <button onClick={() => smoothScrollTo("catálogo")}
                style={{ background:accent, color:"#fff", border:"none",
                  padding:"14px 32px", fontWeight:700, fontSize:13,
                  cursor:"pointer", transition:"opacity 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity="0.85"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity="1"; }}>
                Ver catálogo
              </button>
              {whatsapp.enabled && whatsapp.number && (
                <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}${whatsapp.message?"?text="+encodeURIComponent(whatsapp.message):""}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display:"flex", alignItems:"center", gap:8,
                    background:"none", border:"1.5px solid #d1d5db",
                    color:"#374151", textDecoration:"none",
                    padding:"14px 24px", fontWeight:600, fontSize:13 }}>
                  <WaIcon size={15} /> Contactar
                </a>
              )}
            </div>
            {!loadingProducts && (
              <p style={{ margin:"24px 0 0", fontSize:12, color:heroMid, letterSpacing:0.5 }}>
                <span style={{ color:accent, fontWeight:700 }}>{products.length}</span> vehículos disponibles
              </p>
            )}
          </div>
          {/* right image */}
          <div style={{ flex:1, position:"relative", overflow:"hidden",
            minHeight:320, background:"#e5e7eb" }}>
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
            <EditableImageButton field="heroImage" label="Imagen del hero" />
          </div>
        </div>
      </section>

      {/* ── CATEGORÍAS DE SERVICIO ─────────────────────────────── */}
      <section style={{ padding:"52px 28px", position:"relative",
        ...secBg(catsImg, catsBg), borderBottom:"1px solid #f3f4f6" }}>
        <BgDragHandle imgKey="sectionbg_bgCategorias" />
        <SectionOverlay ov={catsImg} />
        <EditableSectionBg field="bgCategorias" label="Fondo categorías" />
        <div className="ad-cats" style={{ position:"relative", zIndex:1,
          maxWidth:1200, margin:"0 auto", display:"grid", gap:16 }}>
          {SERVICE_CATS.map((cat, i) => (
            <div key={i}
              style={{ background: catsText==="#ffffff" ? "#1a1a1a" : "#fff",
                border:`1px solid ${catsText==="#ffffff" ? "#2a2a2a" : "#e5e7eb"}`,
                borderRadius:12, padding:"28px 24px", cursor:"pointer",
                transition:"all 0.2s", boxShadow:"none" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor=accent;
                (e.currentTarget as HTMLDivElement).style.boxShadow=`0 8px 24px ${accent}22`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor=catsText==="#ffffff"?"#2a2a2a":"#e5e7eb";
                (e.currentTarget as HTMLDivElement).style.boxShadow="none";
              }}
              onClick={() => smoothScrollTo("catálogo")}>
              <div style={{ width:44, height:44, background:`${accent}15`, borderRadius:10,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:22, marginBottom:14 }}>
                <EditableZone field={cat.fi} label={`Ícono categoría ${i+1}`}>{cat.icon}</EditableZone>
              </div>
              <p style={{ margin:"0 0 4px", fontSize:14, fontWeight:700, color:catsText }}>
                <EditableZone field={cat.fv} label={`Categoría ${i+1} — Nombre`}>{cat.lbl}</EditableZone>
              </p>
              <p style={{ margin:0, fontSize:12, color:catsMid }}>
                <EditableZone field={`cat${i+1}Desc`} label={`Categoría ${i+1} — Descripción`}>{cat.desc}</EditableZone>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CATÁLOGO CARRUSEL ──────────────────────────────────── */}
      <section id="catálogo" style={{ padding:"72px 0 72px", position:"relative",
        ...secBg(catalogoImg, catalogoBg) }}>
        <BgDragHandle imgKey="sectionbg_bgCatalogo" />
        <SectionOverlay ov={catalogoImg} />
        <EditableSectionBg field="bgCatalogo" label="Fondo catálogo" />
        <div style={{ position:"relative", zIndex:1, maxWidth:1200, margin:"0 auto", padding:"0 28px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            flexWrap:"wrap", gap:16, marginBottom:32 }}>
            <div>
              <p style={{ margin:"0 0 6px", fontSize:11, color:accent,
                textTransform:"uppercase", letterSpacing:3, fontWeight:700 }}>
                <EditableZone field="catalogKicker" label="Kicker catálogo">Nuestros vehículos</EditableZone>
              </p>
              <h2 style={{ margin:0, fontSize:"clamp(22px,4vw,36px)", fontWeight:900,
                color:catText, letterSpacing:-0.5 }}>
                <EditableZone field="catalogHeading" label="Título catálogo">Catálogo disponible</EditableZone>
              </h2>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <button onClick={() => scrollCarousel("prev")}
                style={{ width:40, height:40, border:`1px solid ${catText==="#ffffff"?"rgba(255,255,255,0.2)":"#e5e7eb"}`,
                  background: catText==="#ffffff" ? "rgba(255,255,255,0.07)" : "#fff",
                  color:catText, cursor:"pointer", borderRadius:8, fontSize:18,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"all 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor=accent; (e.currentTarget as HTMLElement).style.color=accent; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor=catText==="#ffffff"?"rgba(255,255,255,0.2)":"#e5e7eb"; (e.currentTarget as HTMLElement).style.color=catText; }}>
                ‹
              </button>
              <button onClick={() => scrollCarousel("next")}
                style={{ width:40, height:40, border:`1px solid ${catText==="#ffffff"?"rgba(255,255,255,0.2)":"#e5e7eb"}`,
                  background: catText==="#ffffff" ? "rgba(255,255,255,0.07)" : "#fff",
                  color:catText, cursor:"pointer", borderRadius:8, fontSize:18,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"all 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor=accent; (e.currentTarget as HTMLElement).style.color=accent; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor=catText==="#ffffff"?"rgba(255,255,255,0.2)":"#e5e7eb"; (e.currentTarget as HTMLElement).style.color=catText; }}>
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Carousel track — full width with padding for peek */}
        <div style={{ position:"relative", zIndex:1 }}>
          {loadingProducts ? (
            <div style={{ textAlign:"center", padding:"60px 0" }}>
              <div style={{ width:40, height:40, border:`3px solid ${accent}`,
                borderTopColor:"transparent", borderRadius:"50%",
                animation:"ad-spin 0.8s linear infinite", margin:"0 auto" }} />
            </div>
          ) : showcased.length > 0 ? (
            <div ref={carouselRef} className="ad-carousel"
              style={{ display:"flex", gap:16, overflowX:"auto", overflowY:"hidden",
                scrollSnapType:"x mandatory", padding:"4px 28px 16px",
                WebkitOverflowScrolling:"touch" as any }}>
              {showcased.map(p => (
                <div key={p.id} className="ad-carousel-item" style={{ scrollSnapAlign:"start", flexShrink:0 }}>
                  <VehicleCard product={p} accent={accent} currency={currency}
                    theme={catTheme} onClick={() => setSelected(p)} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:"60px 28px",
              border:`1px dashed ${catText==="#ffffff"?"#333":"#e5e7eb"}`,
              margin:"0 28px" }}>
              <p style={{ margin:0, color:catMid, fontSize:14 }}>
                Aún no hay vehículos publicados.
              </p>
            </div>
          )}
        </div>

        {hasMore && (
          <div style={{ textAlign:"center", marginTop:32, padding:"0 28px",
            position:"relative", zIndex:1 }}>
            <Link href={`/tienda/${config?.slug ?? ""}/vehiculos${isPreview ? "?from=editor" : ""}`}
              style={{ display:"inline-flex", alignItems:"center", gap:10,
                background:"none", border:`1.5px solid ${accent}`, color:accent,
                textDecoration:"none", padding:"13px 36px",
                fontWeight:700, fontSize:12, letterSpacing:0.5, borderRadius:4 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background=accent; (e.currentTarget as HTMLElement).style.color="#fff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="none"; (e.currentTarget as HTMLElement).style.color=accent; }}>
              Ver los {products.length} vehículos →
            </Link>
          </div>
        )}
      </section>

      {/* ── STATS ──────────────────────────────────────────────── */}
      <section style={{ position:"relative", ...secBg(statsImg, statsBg) }}>
        <BgDragHandle imgKey="sectionbg_bgStats" />
        <SectionOverlay ov={statsImg} />
        <EditableSectionBg field="bgStats" label="Fondo estadísticas" />
        <div style={{ position:"relative", zIndex:1, maxWidth:1200, margin:"0 auto",
          display:"grid", gridTemplateColumns:"repeat(2,1fr)" }}>
          {[
            { fv:"stat1", fl:"statLabel1", n:"500+", l:"Vehículos vendidos" },
            { fv:"stat2", fl:"statLabel2", n:"15",   l:"Años en el mercado" },
            { fv:"stat3", fl:"statLabel3", n:"98%",  l:"Satisfacción" },
            { fv:"stat4", fl:"statLabel4", n:"12",   l:"Marcas disponibles" },
          ].map((s,i) => (
            <div key={i} style={{ textAlign:"center", padding:"32px 16px",
              borderRight: i%2===0 ? "1px solid rgba(255,255,255,0.15)" : "none",
              borderBottom: i<2 ? "1px solid rgba(255,255,255,0.15)" : "none" }}>
              <p style={{ margin:0, fontSize:"clamp(26px,4vw,38px)", fontWeight:900,
                color:statsText, letterSpacing:-1 }}>
                <EditableZone field={s.fv} label={`Número stat ${i+1}`}>{s.n}</EditableZone>
              </p>
              <p style={{ margin:"4px 0 0", fontSize:10, color:statsText,
                opacity:0.6, textTransform:"uppercase", letterSpacing:2 }}>
                <EditableZone field={s.fl} label={`Etiqueta stat ${i+1}`}>{s.l}</EditableZone>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SERVICIOS ──────────────────────────────────────────── */}
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
            <h2 style={{ margin:0, fontSize:"clamp(22px,4vw,34px)", fontWeight:900,
              color:svcText, letterSpacing:-0.3 }}>
              <EditableZone field="serviciosHeading" label="Título servicios">Comprá con confianza</EditableZone>
            </h2>
          </div>
          <div className="ad-svc" style={{ display:"grid", gap:20 }}>
            {[
              { fv:"svc1Title", fl:"svc1Desc", icon:"✅", t:"Inspección completa",   d:"Cada vehículo pasa por 150 puntos de revisión técnica antes de publicarse." },
              { fv:"svc2Title", fl:"svc2Desc", icon:"📄", t:"Trámites incluidos",    d:"Documentación, transferencia y patentes gestionadas por nuestro equipo." },
              { fv:"svc3Title", fl:"svc3Desc", icon:"💳", t:"Financiación",          d:"Planes de pago en cuotas fijas disponibles para cualquier perfil crediticio." },
              { fv:"svc4Title", fl:"svc4Desc", icon:"🤝", t:"Asesor exclusivo",      d:"Un asesor te acompaña en todo el proceso, sin cargo y sin compromiso." },
            ].map((s,i) => (
              <div key={i}
                style={{ padding:"28px 24px", borderRadius:12,
                  border:`1px solid ${svcText==="#ffffff"?"rgba(255,255,255,0.1)":"#e5e7eb"}`,
                  background: svcText==="#ffffff" ? "rgba(255,255,255,0.05)" : "#fff",
                  borderTop:`3px solid ${accent}`, transition:"box-shadow 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow=`0 8px 24px ${accent}18`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow="none"; }}>
                <div style={{ fontSize:28, marginBottom:14 }}>
                  <EditableZone field={`svc${i+1}Icon`} label={`Ícono servicio ${i+1}`}>{s.icon}</EditableZone>
                </div>
                <p style={{ margin:"0 0 8px", fontSize:15, fontWeight:700, color:svcText }}>
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

      {/* ── NOSOTROS ───────────────────────────────────────────── */}
      <section id="nosotros" style={{ padding:"80px 28px", position:"relative",
        ...secBg(nosotrosImg2, nosotrosBg) }}>
        <BgDragHandle imgKey="sectionbg_bgNosotros" />
        <SectionOverlay ov={nosotrosImg2} />
        <EditableSectionBg field="bgNosotros" label="Fondo nosotros" />
        <div className="ad-about" style={{ position:"relative", zIndex:1, maxWidth:1200,
          margin:"0 auto", display:"grid", gap:56, alignItems:"center" }}>
          <div style={{ borderRadius:16, overflow:"hidden", aspectRatio:"4/3", position:"relative" }}>
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
          <div>
            <div style={{ width:48, height:4, background:accent, marginBottom:20, borderRadius:2 }} />
            <p style={{ margin:"0 0 10px", fontSize:11, color:accent,
              textTransform:"uppercase", letterSpacing:3, fontWeight:700 }}>
              <EditableZone field="nosotrosKicker" label="Kicker nosotros">Nuestra empresa</EditableZone>
            </p>
            <h2 style={{ margin:"0 0 20px", fontSize:"clamp(22px,4vw,34px)",
              fontWeight:900, color:nosText, letterSpacing:-0.3 }}>
              <EditableZone field="nosotrosHeading" label="Título nosotros">Pasión por los vehículos desde 2010</EditableZone>
            </h2>
            <p style={{ margin:"0 0 14px", fontSize:15, color:nosMid, lineHeight:1.9, fontWeight:300 }}>
              <EditableZone field="nosotrosP1" label="Párrafo 1">Somos una empresa familiar con más de 15 años en el mercado automotor, especializados en brindar la mejor experiencia de compra con total transparencia.</EditableZone>
            </p>
            <p style={{ margin:"0 0 32px", fontSize:15, color:nosMid, lineHeight:1.9, fontWeight:300 }}>
              <EditableZone field="nosotrosP2" label="Párrafo 2">Nuestro equipo de asesores y taller propio garantizan la calidad de cada vehículo antes de llegar a tus manos. La documentación la gestionamos nosotros.</EditableZone>
            </p>
            {whatsapp.enabled && whatsapp.number && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}${whatsapp.message?"?text="+encodeURIComponent(whatsapp.message):""}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display:"inline-flex", alignItems:"center", gap:8,
                  background:"#25d366", color:"white", textDecoration:"none",
                  padding:"13px 28px", borderRadius:8, fontWeight:700, fontSize:14 }}>
                <WaIcon /> Contactanos
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── CONTACTO ───────────────────────────────────────────── */}
      <section id="contacto" style={{ padding:"88px 28px", position:"relative",
        ...secBg(contactoImg, contactoBg) }}>
        <BgDragHandle imgKey="sectionbg_bgContacto" />
        <SectionOverlay ov={contactoImg} />
        <EditableSectionBg field="bgContacto" label="Fondo contacto" />
        <div style={{ position:"relative", zIndex:1, maxWidth:600, margin:"0 auto", textAlign:"center" }}>
          <p style={{ margin:"0 0 10px", fontSize:11, color:accent,
            textTransform:"uppercase", letterSpacing:3, fontWeight:700 }}>Contacto</p>
          <h2 style={{ margin:"0 0 18px", fontSize:"clamp(26px,4vw,44px)",
            fontWeight:900, color:conText, letterSpacing:-0.5 }}>
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
                padding:"16px 44px", borderRadius:8, fontWeight:800, fontSize:15,
                boxShadow:"0 8px 32px rgba(37,211,102,0.3)" }}>
              <WaIcon size={20} />
              <EditableZone field="contactWhatsApp" label="Texto botón WhatsApp">Escribinos por WhatsApp</EditableZone>
            </a>
          )}
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
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
            {[
              { label:"Política de devoluciones", tipo:"devoluciones" },
              { label:"Política de envíos",       tipo:"envios" },
              { label:"Términos y condiciones",   tipo:"terminos" },
            ].map(({ label, tipo }) => (
              <a key={tipo} href={`/tienda/${config?.slug ?? ""}/politicas?tipo=${tipo}`}
                style={{ fontSize:10, color:ftMid, opacity:0.45, textDecoration:"none", letterSpacing:0.3 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity="1"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity="0.45"; }}>
                {label}
              </a>
            ))}
            {!editMode && (
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

      {selected && (
        <VehicleModal product={selected} accent={accent} currency={currency}
          whatsapp={whatsapp} products={products}
          onClose={() => setSelected(null)} onSelect={p => setSelected(p)} />
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
