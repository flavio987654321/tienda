"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { EditableZone, EditableImageButton, EditableSectionBg, BgDragHandle, getContrastColor, useEditContext } from "@/contexts/EditContext";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";
import type { ImageOverride } from "@/types/store-config";
import VerifiedIconButton from "@/components/store/VerifiedIconButton";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import { fmtPrice, attr, WaIcon, AUTO_SERVICES, VehicleCard, VehicleModal } from "@/components/store/auto/AutoVehicleShared";
function smoothScrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

const PRICE_RANGES = [
  { label: "Todos los precios", min: 0, max: Infinity },
  { label: "Hasta $15M",        min: 0, max: 15_000_000 },
  { label: "$15M – $35M",       min: 15_000_000, max: 35_000_000 },
  { label: "Más de $35M",       min: 35_000_000, max: Infinity },
];

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
  if (ov?.url) return ov.overlayType === "light" ? "#666666" : "rgba(255,255,255,0.55)";
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
function CategoryTile({ cat, count, accent, active, dark, onClick }: {
  cat: string; count: number; accent: string; active: boolean; dark: boolean; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  const on = active || hov;
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: on ? accent : (dark ? "#1a1a1a" : "#fff"),
        border: `1px solid ${on ? accent : (dark ? "#2a2a2a" : "#e8e8e8")}`,
        borderRadius: 10, padding: "20px 18px", cursor: "pointer", textAlign: "left",
        transition: "all 0.2s", display: "flex", flexDirection: "column", gap: 6,
        boxShadow: on ? `0 8px 24px ${accent}33` : "none" }}>
      <span style={{ fontSize: 13, fontWeight: 800,
        color: on ? getContrastColor(accent) : (dark ? "#fff" : "#111"),
        textTransform: "uppercase", letterSpacing: 0.8 }}>
        {cat}
      </span>
      <span style={{ fontSize: 11, color: on ? getContrastColor(accent) + "99" : (dark ? "#666" : "#aaa"),
        fontWeight: 500 }}>
        {count} unidad{count !== 1 ? "es" : ""}
      </span>
    </button>
  );
}

/* ── Main ─────────────────────────────────────────────────── */
export default function AutoDrive() {
  const config = useStoreConfig();
  const { products, loadingProducts } = useStorefront();
  const { editMode } = useEditContext();
  const accent = config?.colors.accent ?? "#2563eb";
  const currency = config?.currency ?? "ARS";
  const storeName = config?.storeName ?? "AUTO DRIVE";
  const whatsapp = config?.whatsapp ?? { enabled: false, number: "" };

  const heroImgUrl = config?.imageOverrides?.["heroImage"]?.url
    ?? "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1000&q=80";
  const nosotrosUrl = config?.imageOverrides?.["nosotrosImage"]?.url
    ?? "https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?auto=format&fit=crop&w=900&q=80";

  const sc   = config?.sectionColors ?? {};
  const iovr = config?.imageOverrides ?? {};

  const heroBg   = sc["bgHero"]     ?? "#f7f8fa";
  const heroImg  = iovr["sectionbg_bgHero"];
  const heroText = secText(heroImg, heroBg);
  const heroMid  = secMid(heroImg, heroBg);

  const statsBg   = sc["bgStats"]   ?? accent;
  const statsImg  = iovr["sectionbg_bgStats"];
  const statsText = secText(statsImg, statsBg);

  const catsSectionBg  = sc["bgCategorias"] ?? "#ffffff";
  const catsSectionImg = iovr["sectionbg_bgCategorias"];
  const catsText       = secText(catsSectionImg, catsSectionBg);
  const catsMid        = secMid(catsSectionImg, catsSectionBg);
  const catsDark       = catsText === "#ffffff";

  const catalogoBg  = sc["bgCatalogo"]  ?? "#f7f8fa";
  const catalogoImg = iovr["sectionbg_bgCatalogo"];
  const catText     = secText(catalogoImg, catalogoBg);
  const catMid      = secMid(catalogoImg, catalogoBg);
  const catTheme    = catText === "#ffffff" ? "dark" as const : "light" as const;

  const serviciosBg  = sc["bgServicios"] ?? "#ffffff";
  const serviciosImg = iovr["sectionbg_bgServicios"];
  const svcText      = secText(serviciosImg, serviciosBg);
  const svcMid       = secMid(serviciosImg, serviciosBg);
  const svcIsLight   = svcText === "#111111";
  const svcCardBg    = svcIsLight ? "#f7f8fa" : "rgba(255,255,255,0.06)";
  const svcCardBor   = svcIsLight ? "#ebebeb" : "rgba(255,255,255,0.1)";

  const nosotrosBg  = sc["bgNosotros"]  ?? "#f7f8fa";
  const nosotrosImg2= iovr["sectionbg_bgNosotros"];
  const nosText     = secText(nosotrosImg2, nosotrosBg);
  const nosMid      = secMid(nosotrosImg2, nosotrosBg);

  const contactoBg  = sc["bgContacto"]  ?? "#111111";
  const contactoImg = iovr["sectionbg_bgContacto"];
  const conText     = secText(contactoImg, contactoBg);
  const conMid      = secMid(contactoImg, contactoBg);

  const footerBg   = sc["bgFooter"]    ?? "#0a0a0a";
  const footerImg  = iovr["sectionbg_bgFooter"];
  const ftMid      = secMid(footerImg, footerBg);

  const [menuOpen, setMenuOpen]         = useState(false);
  const [selected, setSelected]         = useState<StorefrontProduct | null>(null);
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [showAll,  setShowAll]          = useState(false);
  const [activePriceRange, setActivePriceRange] = useState(0);
  const [search, setSearch]             = useState("");
  const [scrolled, setScrolled]         = useState(false);
  const [showReport, setShowReport]     = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const pr = PRICE_RANGES[activePriceRange];
  const filtered = useMemo(() => products.filter(p => {
    const matchCat = activeCategory === "Todos" || p.category === activeCategory;
    const matchPrice = p.price >= pr.min && p.price <= pr.max;
    const q = search.toLowerCase().trim();
    const matchSearch = !q || p.name.toLowerCase().includes(q)
      || p.attributes.some(a => a.value.toLowerCase().includes(q));
    return matchCat && matchPrice && matchSearch;
  }), [products, activeCategory, pr, search]);

  return (
    <div style={{ background: "#ffffff", color: "#111111",
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", minHeight: "100vh" }}>
      <style>{`
        .ad-grid { grid-template-columns: 1fr !important }
        @media(min-width:560px){ .ad-grid { grid-template-columns: repeat(2,1fr) !important } }
        @media(min-width:900px){ .ad-grid { grid-template-columns: repeat(3,1fr) !important } }
        .ad-cats { grid-template-columns: repeat(2,1fr) !important }
        @media(min-width:480px){ .ad-cats { grid-template-columns: repeat(3,1fr) !important } }
        @media(min-width:768px){ .ad-cats { grid-template-columns: repeat(4,1fr) !important } }
        @media(min-width:1024px){ .ad-cats { grid-template-columns: repeat(6,1fr) !important } }
        .ad-nav-links { display: none !important }
        @media(min-width:768px){ .ad-nav-links { display: flex !important } .ad-burger { display: none !important } }
        .ad-hero { flex-direction: column !important }
        .ad-hero-left { width: 100% !important; padding: 60px 28px 40px !important }
        @media(min-width:768px){
          .ad-hero { flex-direction: row !important; min-height: 100svh !important }
          .ad-hero-left { width: 50% !important; padding: 80px 48px 80px 40px !important }
        }
        .ad-about { grid-template-columns: 1fr !important }
        @media(min-width:768px){ .ad-about { grid-template-columns: 1fr 1fr !important } }
        .ad-stats { grid-template-columns: repeat(2,1fr) }
        @media(min-width:640px){ .ad-stats { grid-template-columns: repeat(4,1fr) !important } }
        .ad-svc { grid-template-columns: 1fr !important }
        @media(min-width:560px){ .ad-svc { grid-template-columns: repeat(2,1fr) !important } }
        @media(min-width:900px){ .ad-svc { grid-template-columns: repeat(4,1fr) !important } }
        .ad-modal-body { grid-template-columns: 1fr !important }
        @media(min-width:700px){ .ad-modal-body { grid-template-columns: 3fr 2fr !important } }
        .ad-specs-grid { grid-template-columns: 1fr !important }
        @media(min-width:560px){ .ad-specs-grid { grid-template-columns: 1fr 1fr !important } }
        .ad-similar-grid { grid-template-columns: repeat(2,1fr) !important }
        @media(min-width:560px){ .ad-similar-grid { grid-template-columns: repeat(4,1fr) !important } }
        .ad-img-wrap { flex-direction: column !important }
        .ad-img-thumbs { flex-direction: row !important; overflow-x: auto !important; overflow-y: hidden !important; width: 100% !important; max-height: 64px !important; padding: 6px 8px !important }
        @media(min-width:700px){
          .ad-img-wrap { flex-direction: row !important }
          .ad-img-thumbs { flex-direction: column !important; overflow-x: hidden !important; overflow-y: auto !important; width: 80px !important; max-height: none !important; padding: 8px 6px !important }
        }
      `}</style>

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.97)",
        borderBottom: "1px solid #ebebeb",
        backdropFilter: "blur(20px)",
        boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.06)" : "none",
        transition: "box-shadow 0.3s", padding: "0 28px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", height: 62,
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 900, fontSize: 17, color: accent, letterSpacing: -0.3 }}>
            <EditableZone field="storeName" label="Nombre de la tienda">{storeName}</EditableZone>
            <VerifiedIconButton isVerified={config?.isVerified} info={config?.verifiedInfo} />
          </div>
          <div className="ad-nav-links" style={{ display: "flex", gap: 32, alignItems: "center" }}>
            {[["Catálogo", "catálogo"], ["Servicios", "servicios"], ["Nosotros", "nosotros"], ["Contacto", "contacto"]].map(([label, id]) => (
              <button key={id} onClick={() => smoothScrollTo(id)}
                style={{ background: "none", border: "none", color: "#888", cursor: "pointer",
                  fontSize: 13, fontWeight: 500, transition: "color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = accent)}
                onMouseLeave={e => (e.currentTarget.style.color = "#888")}>
                {label}
              </button>
            ))}
            <Link href={`/tienda/${config?.slug ?? ""}/vehiculos`}
              style={{ border: `1px solid #e0e0e0`, color: "#555", padding: "6px 16px",
                fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textDecoration: "none",
                borderRadius: 6, transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = accent; (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = accent; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "#555"; (e.currentTarget as HTMLElement).style.borderColor = "#e0e0e0"; }}>
              Ver todos
            </Link>
            {whatsapp.enabled && whatsapp.number && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6,
                  background: "#25d366", color: "white", textDecoration: "none",
                  padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                <WaIcon size={14} /> WhatsApp
              </a>
            )}
          </div>
          <button className="ad-burger" onClick={() => setMenuOpen(m => !m)}
            style={{ background: "none", border: "1px solid #e8e8e8", color: "#444",
              padding: "6px 11px", borderRadius: 8, cursor: "pointer", fontSize: 18 }}>
            {menuOpen ? "×" : "☰"}
          </button>
        </div>
        {menuOpen && (
          <div style={{ background: "white", borderTop: "1px solid #f0f0f0",
            padding: "8px 28px 18px" }}>
            {[["Catálogo", "catálogo"], ["Servicios", "servicios"], ["Nosotros", "nosotros"], ["Contacto", "contacto"]].map(([label, id]) => (
              <button key={id} onClick={() => { smoothScrollTo(id); setMenuOpen(false); }}
                style={{ display: "block", width: "100%", background: "none", border: "none",
                  color: "#555", cursor: "pointer", textAlign: "left",
                  padding: "12px 0", fontSize: 14, borderBottom: "1px solid #f5f5f5" }}>
                {label}
              </button>
            ))}
            <Link href={`/tienda/${config?.slug ?? ""}/vehiculos`}
              style={{ display: "block", color: accent, padding: "12px 0", fontSize: 14,
                fontWeight: 600, textDecoration: "none" }}
              onClick={() => setMenuOpen(false)}>
              Ver todos los vehículos →
            </Link>
          </div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section style={{ paddingTop: 62, position: "relative", ...secBg(heroImg, heroBg) }}>
        <BgDragHandle imgKey="sectionbg_bgHero" />
        <SectionOverlay ov={heroImg} />
        <EditableSectionBg field="bgHero" label="Fondo hero" />
        <div className="ad-hero" style={{ position: "relative", zIndex: 1, maxWidth: 1400, margin: "0 auto",
          display: "flex", alignItems: "stretch" }}>

          {/* left */}
          <div className="ad-hero-left"
            style={{ flex: "0 0 auto", display: "flex", flexDirection: "column",
              justifyContent: "center", padding: "80px 48px 80px 40px" }}>
            <p style={{ margin: "0 0 12px", fontSize: 10, color: accent,
              textTransform: "uppercase", letterSpacing: 4, fontWeight: 700 }}>
              <EditableZone field="heroBadge" label="Badge hero">Concesionaria Oficial</EditableZone>
            </p>
            <h1 style={{ margin: "0 0 14px", fontSize: "clamp(28px,4.5vw,56px)",
              fontWeight: 900, lineHeight: 1.0, color: heroText, letterSpacing: -1.5 }}>
              <EditableZone field="heroHeading" label="Título principal">{"Encontrá el\nvehículo ideal"}</EditableZone>
            </h1>
            <p style={{ margin: "0 0 28px", fontSize: "clamp(13px,1.6vw,16px)",
              color: heroMid, lineHeight: 1.85, fontWeight: 300, maxWidth: 380 }}>
              <EditableZone field="heroSubtext" label="Subtítulo">El mayor catálogo en autos y motos. Financiación disponible, entrega rápida.</EditableZone>
            </p>

            {/* search */}
            <div style={{ display: "flex", gap: 8, marginBottom: 18, maxWidth: 440 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
                  stroke="#aaa" strokeWidth={2} strokeLinecap="round"
                  style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar marca, modelo, año..."
                  style={{ width: "100%", boxSizing: "border-box",
                    paddingLeft: 40, paddingRight: 14, paddingTop: 12, paddingBottom: 12,
                    border: "2px solid #e8e8e8", borderRadius: 10, fontSize: 13,
                    outline: "none", background: "#fff", color: "#111",
                    fontFamily: "inherit" }}
                  onFocus={e => (e.currentTarget.style.borderColor = accent)}
                  onBlur={e => (e.currentTarget.style.borderColor = "#e8e8e8")} />
              </div>
              <button onClick={() => smoothScrollTo("catálogo")}
                style={{ background: accent, color: getContrastColor(accent), border: "none",
                  padding: "0 20px", borderRadius: 10, fontWeight: 700,
                  fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                Buscar
              </button>
            </div>

            {/* quick category pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {categoryList.slice(0, 6).map(cat => (
                <button key={cat}
                  onClick={() => { setActiveCategory(cat); smoothScrollTo("catálogo"); }}
                  style={{ background: "#f5f5f5", color: "#555", border: "1px solid #e8e8e8",
                    padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                    cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${accent}15`; e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.borderColor = "#e8e8e8"; e.currentTarget.style.color = "#555"; }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* right image */}
          <div style={{ flex: 1, position: "relative", overflow: "hidden",
            minHeight: 300, background: "#111" }}>
            <img src={heroImgUrl} alt="Vehículo"
              style={{ width: "100%", height: "100%", objectFit: "cover",
                display: "block", opacity: 0.92 }} />
            <div style={{ position: "absolute", inset: 0,
              background: "linear-gradient(to right, rgba(247,248,250,0.9) 0%, rgba(247,248,250,0) 25%)" }} />
            {(() => { const ov = config?.imageOverrides?.["heroImage"]; if (!ov?.overlayType || ov.overlayType === "none") return null; return <div style={{ position:"absolute", inset:0, pointerEvents:"none", background: ov.overlayType === "light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.45})` }} />; })()}
            <EditableImageButton field="heroImage" label="Imagen del hero" />
            {!loadingProducts && (
              <div style={{ position: "absolute", bottom: 20, left: 20,
                background: "rgba(255,255,255,0.9)", padding: "8px 16px",
                borderRadius: 8, backdropFilter: "blur(8px)" }}>
                <span style={{ fontSize: 12, color: "#111", fontWeight: 700 }}>
                  <span style={{ color: accent, fontSize: 18 }}>{products.length}</span> vehículos en stock
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────── */}
      <section style={{ position: "relative", ...secBg(statsImg, statsBg) }}>
        <BgDragHandle imgKey="sectionbg_bgStats" />
        <SectionOverlay ov={statsImg} />
        <EditableSectionBg field="bgStats" label="Fondo estadísticas" />
        <div className="ad-stats" style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", display: "grid" }}>
          {[
            { fv: "stat1", fl: "statLabel1", n: "500+", l: "Vehículos" },
            { fv: "stat2", fl: "statLabel2", n: "15",   l: "Años en el mercado" },
            { fv: "stat3", fl: "statLabel3", n: "98%",  l: "Satisfacción" },
            { fv: "stat4", fl: "statLabel4", n: "12",   l: "Marcas" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center", padding: "28px 10px",
              borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.12)" : "none",
              borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.12)" : "none" }}>
              <p style={{ margin: 0, fontSize: "clamp(24px,4vw,36px)", fontWeight: 900, color: statsText, letterSpacing: -1 }}>
                <EditableZone field={s.fv} label={`Stat ${i+1}`}>{s.n}</EditableZone>
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 10, color: statsText,
                opacity: 0.5, textTransform: "uppercase", letterSpacing: 2 }}>
                <EditableZone field={s.fl} label={`Etiqueta stat ${i+1}`}>{s.l}</EditableZone>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categorías ─────────────────────────────────────── */}
      {categoryList.length > 0 && (
        <section style={{ padding: "64px 28px", position: "relative", ...secBg(catsSectionImg, catsSectionBg) }}>
          <BgDragHandle imgKey="sectionbg_bgCategorias" />
          <SectionOverlay ov={catsSectionImg} />
          <EditableSectionBg field="bgCategorias" label="Fondo categorías" />
          <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between",
              flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
              <div>
                <p style={{ margin: "0 0 6px", fontSize: 10, color: accent,
                  textTransform: "uppercase", letterSpacing: 3, fontWeight: 700 }}>
                  <EditableZone field="catsKicker" label="Kicker categorías">Explorá por tipo</EditableZone>
                </p>
                <h2 style={{ margin: 0, fontSize: "clamp(20px,3.5vw,30px)",
                  fontWeight: 900, color: catsText, letterSpacing: -0.3 }}>
                  <EditableZone field="catsHeading" label="Título categorías">Categorías disponibles</EditableZone>
                </h2>
              </div>
              {activeCategory !== "Todos" && (
                <button onClick={() => { setActiveCategory("Todos"); smoothScrollTo("catálogo"); }}
                  style={{ background: "none", border: `1px solid ${catsMid}44`, color: catsMid,
                    padding: "8px 16px", cursor: "pointer", borderRadius: 8,
                    fontSize: 11, fontWeight: 600 }}>
                  Ver todos →
                </button>
              )}
            </div>
            <div className="ad-cats" style={{ display: "grid", gap: 10 }}>
              {categoryList.map(cat => (
                <CategoryTile key={cat} cat={cat} count={categoryCount[cat] ?? 0}
                  accent={accent} active={activeCategory === cat} dark={catsDark}
                  onClick={() => { setActiveCategory(cat); smoothScrollTo("catálogo"); }} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Catálogo ───────────────────────────────────────── */}
      <section id="catálogo" style={{ padding: "56px 28px", position: "relative",
        ...secBg(catalogoImg, catalogoBg) }}>
        <BgDragHandle imgKey="sectionbg_bgCatalogo" />
        <SectionOverlay ov={catalogoImg} />
        <EditableSectionBg field="bgCatalogo" label="Fondo catálogo" />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 10, color: accent,
                textTransform: "uppercase", letterSpacing: 3, fontWeight: 700 }}>
                <EditableZone field="featuredLabel" label="Etiqueta catálogo">Nuestro stock</EditableZone>
              </p>
              <h2 style={{ margin: 0, fontSize: "clamp(20px,4vw,30px)",
                fontWeight: 900, color: catText, letterSpacing: -0.3 }}>
                <EditableZone field="categoriesHeading" label="Título catálogo">Catálogo completo</EditableZone>
              </h2>
            </div>
            <span style={{ fontSize: 13, color: catMid }}>
              {filtered.length} vehículo{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* filters */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ background: activeCategory === cat ? accent : "transparent",
                  color: activeCategory === cat ? getContrastColor(accent) : catMid,
                  border: `1px solid ${activeCategory === cat ? accent : catMid + "44"}`,
                  padding: "6px 16px", borderRadius: 20, cursor: "pointer",
                  fontSize: 11, fontWeight: 600, transition: "all 0.15s" }}>
                {cat}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 28 }}>
            {PRICE_RANGES.map((range, i) => (
              <button key={i} onClick={() => setActivePriceRange(i)}
                style={{ background: activePriceRange === i ? `${accent}12` : "transparent",
                  color: activePriceRange === i ? accent : catMid,
                  border: `1px solid ${activePriceRange === i ? accent + "66" : catMid + "33"}`,
                  padding: "5px 12px", borderRadius: 6, cursor: "pointer",
                  fontSize: 10, fontWeight: 600, transition: "all 0.15s" }}>
                {range.label}
              </button>
            ))}
          </div>

          {loadingProducts ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: catMid }}>Cargando vehículos…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: catMid }}>
              No se encontraron vehículos con esos filtros.
            </div>
          ) : (
            <>
              <div className="ad-grid" style={{ display: "grid", gap: 20 }}>
                {(showAll ? filtered : filtered.slice(0, 8)).map(p => (
                  <VehicleCard key={p.id} product={p} accent={accent}
                    currency={currency} theme={catTheme} onClick={() => setSelected(p)} />
                ))}
              </div>
              {filtered.length > 8 && (
                <div style={{ textAlign: "center", marginTop: 48 }}>
                  <Link href={`/tienda/${config?.slug ?? ""}/vehiculos`}
                    style={{ display: "inline-block", background: accent, color: "#fff",
                      textDecoration: "none", padding: "14px 40px", borderRadius: 8,
                      fontSize: 13, fontWeight: 700, transition: "opacity 0.2s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}>
                    Ver todos los vehículos ({filtered.length})
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Servicios ──────────────────────────────────────── */}
      <section id="servicios" style={{ padding: "72px 28px", position: "relative",
        ...secBg(serviciosImg, serviciosBg), borderTop: "1px solid #ebebeb" }}>
        <BgDragHandle imgKey="sectionbg_bgServicios" />
        <SectionOverlay ov={serviciosImg} />
        <EditableSectionBg field="bgServicios" label="Fondo servicios" />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ margin: "0 0 8px", fontSize: 10, color: accent,
              textTransform: "uppercase", letterSpacing: 3, fontWeight: 700 }}>
              <EditableZone field="aboutKicker" label="Kicker servicios">Por qué elegirnos</EditableZone>
            </p>
            <h2 style={{ margin: 0, fontSize: "clamp(22px,4vw,34px)",
              fontWeight: 900, color: svcText, letterSpacing: -0.3 }}>
              <EditableZone field="aboutHeading" label="Título servicios">Comprá con confianza</EditableZone>
            </h2>
          </div>
          <div className="ad-svc" style={{ display: "grid", gap: 16 }}>
            {[
              { fv: "garantia1Title", fl: "garantia1Desc", t: "Inspección 150 puntos", d: "Cada vehículo pasa revisión técnica completa antes de publicarse." },
              { fv: "garantia2Title", fl: "garantia2Desc", t: "Documentación en regla", d: "Transferencia y trámites gestionados por nosotros." },
              { fv: "garantia3Title", fl: "garantia3Desc", t: "Financiación", d: "Planes de cuotas disponibles según perfil crediticio." },
              { fv: "garantia4Title", fl: "garantia4Desc", t: "Asesor exclusivo", d: "Un asesor te acompaña en todo el proceso sin costo." },
            ].map((s, i) => (
              <div key={i} style={{ padding: "28px 24px", borderRadius: 12,
                border: `1px solid ${svcCardBor}`, background: svcCardBg,
                borderTop: `3px solid ${accent}` }}>
                <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 800, color: svcText, letterSpacing: -0.2 }}>
                  <EditableZone field={s.fv} label={`Servicio ${i+1} — Título`}>{s.t}</EditableZone>
                </p>
                <p style={{ margin: 0, fontSize: 13, color: svcMid, lineHeight: 1.7 }}>
                  <EditableZone field={s.fl} label={`Servicio ${i+1} — Desc`}>{s.d}</EditableZone>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Nosotros ───────────────────────────────────────── */}
      <section id="nosotros" style={{ padding: "72px 28px", position: "relative",
        ...secBg(nosotrosImg2, nosotrosBg) }}>
        <BgDragHandle imgKey="sectionbg_bgNosotros" />
        <SectionOverlay ov={nosotrosImg2} />
        <EditableSectionBg field="bgNosotros" label="Fondo nosotros" />
        <div className="ad-about" style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto",
          display: "grid", gap: 52, alignItems: "center" }}>
          <div style={{ borderRadius: 16, overflow: "hidden", aspectRatio: "4/3", position: "relative" }}>
            <img src={nosotrosUrl} alt="Nosotros"
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {(() => { const ov = config?.imageOverrides?.["nosotrosImage"]; if (!ov?.overlayType || ov.overlayType === "none") return null; return <div style={{ position:"absolute", inset:0, pointerEvents:"none", background: ov.overlayType === "light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.45})` }} />; })()}
            <EditableImageButton field="nosotrosImage" label="Imagen sección Nosotros" />
          </div>
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 10, color: accent,
              textTransform: "uppercase", letterSpacing: 3, fontWeight: 700 }}>
              <EditableZone field="contactKicker" label="Etiqueta nosotros">Nuestra empresa</EditableZone>
            </p>
            <h2 style={{ margin: "0 0 18px", fontSize: "clamp(22px,4vw,32px)",
              fontWeight: 900, color: nosText, letterSpacing: -0.3 }}>
              <EditableZone field="aboutHeading2" label="Título nosotros">Pasión por los vehículos desde 2010</EditableZone>
            </h2>
            <p style={{ margin: "0 0 14px", fontSize: 15, color: nosMid, lineHeight: 1.9, fontWeight: 300 }}>
              <EditableZone field="aboutParagraph1" label="Párrafo 1">Somos una empresa familiar con más de 15 años en el mercado automotor, especializados en brindar la mejor experiencia de compra con total transparencia.</EditableZone>
            </p>
            <p style={{ margin: "0 0 28px", fontSize: 15, color: nosMid, lineHeight: 1.9, fontWeight: 300 }}>
              <EditableZone field="aboutParagraph2" label="Párrafo 2">Nuestro equipo de asesores y taller propio garantizan la calidad de cada vehículo antes de llegar a tus manos.</EditableZone>
            </p>
            {whatsapp.enabled && whatsapp.number && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8,
                  background: "#25d366", color: "white", textDecoration: "none",
                  padding: "13px 24px", borderRadius: 10, fontWeight: 800, fontSize: 14 }}>
                <WaIcon /> Contactanos
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── Contacto ───────────────────────────────────────── */}
      <section id="contacto" style={{ padding: "88px 28px", position: "relative",
        ...secBg(contactoImg, contactoBg) }}>
        <BgDragHandle imgKey="sectionbg_bgContacto" />
        <SectionOverlay ov={contactoImg} />
        <EditableSectionBg field="bgContacto" label="Fondo contacto" />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
          <p style={{ margin: "0 0 8px", fontSize: 10, color: accent,
            textTransform: "uppercase", letterSpacing: 3, fontWeight: 700 }}>Contacto</p>
          <h2 style={{ margin: "0 0 14px", fontSize: "clamp(24px,4vw,40px)",
            fontWeight: 900, color: conText, letterSpacing: -0.5, lineHeight: 1.1 }}>
            <EditableZone field="contactHeading" label="Título contacto">¿Te interesa algún vehículo?</EditableZone>
          </h2>
          <p style={{ margin: "0 0 32px", fontSize: 15, color: conMid,
            lineHeight: 1.8, fontWeight: 300 }}>
            <EditableZone field="contactSubtext" label="Subtítulo">Escribinos y coordinamos una visita sin costo. Respondemos en minutos.</EditableZone>
          </p>
          {whatsapp.enabled && whatsapp.number && (
            <a href={`https://wa.me/${whatsapp.number.replace(/\D/g, "")}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 10,
                background: "#25d366", color: "white", textDecoration: "none",
                padding: "16px 32px", borderRadius: 12, fontWeight: 800, fontSize: 15,
                boxShadow: "0 8px 28px rgba(37,211,102,0.3)" }}>
              <WaIcon size={20} />
              <EditableZone field="contactWhatsApp" label="WhatsApp de contacto">Escribinos por WhatsApp</EditableZone>
            </a>
          )}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer style={{ position: "relative", padding: "28px",
        ...secBg(footerImg, footerBg), textAlign: "center" }}>
        <BgDragHandle imgKey="sectionbg_bgFooter" />
        <SectionOverlay ov={footerImg} />
        <EditableSectionBg field="bgFooter" label="Fondo footer" />
        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ margin: "0 0 6px", fontWeight: 900, fontSize: 15, color: accent }}>
            {storeName}
          </p>
          <p style={{ margin: "0 0 12px", fontSize: 11, color: ftMid, letterSpacing: 0.3 }}>
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
          <WaIcon size={22} />
        </a>
      )}
    </div>
  );
}
