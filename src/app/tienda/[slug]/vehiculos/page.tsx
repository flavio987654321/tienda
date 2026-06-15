"use client";
import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { VehicleCard, VehicleModal, AM_MODAL_CSS } from "@/components/store/auto/AutoVehicleShared";
import { getContrastColor } from "@/contexts/EditContext";
import type { StorefrontProduct } from "@/hooks/useStorefront";

function mapVehicle(raw: any): StorefrontProduct {
  let images: string[] = [];
  let imageItems: { url: string }[] = [];
  try {
    const parsed = JSON.parse(raw.images || "[]");
    imageItems = parsed.map((img: any) => typeof img === "string" ? { url: img } : { url: img?.url ?? "" }).filter((x: any) => x.url);
    images = imageItems.map(x => x.url);
  } catch {}
  let attributes: { key: string; value: string }[] = [];
  try {
    const parsed = JSON.parse(raw.attributes || "[]");
    attributes = Array.isArray(parsed) ? parsed.filter((a: any) => a?.key) : [];
  } catch {}
  let reelUrls: string[] = [];
  try {
    const parsed = JSON.parse(raw.reelUrls || "[]");
    reelUrls = Array.isArray(parsed) ? parsed.filter((u: unknown) => typeof u === "string") : [];
  } catch {}
  return {
    id: raw.id, name: raw.name, price: raw.price,
    comparePrice: raw.comparePrice ?? null,
    precioMayorista: null, cantMinMayorista: null,
    category: raw.category ?? "general",
    gender: "unisex",
    description: raw.description ?? null,
    images, imageItems,
    reelUrls, sizes: [], colors: [],
    variants: raw.variants ?? [],
    attributes,
    badge: raw.badge ?? undefined,
  };
}

// Brand characteristic colors for the logo row
const BRAND_COLORS: Record<string, { bg: string; text: string }> = {
  toyota:          { bg: "#eb0a1e", text: "#fff" },
  ford:            { bg: "#003478", text: "#fff" },
  chevrolet:       { bg: "#c9a84c", text: "#000" },
  honda:           { bg: "#cc0000", text: "#fff" },
  volkswagen:      { bg: "#001e50", text: "#fff" },
  vw:              { bg: "#001e50", text: "#fff" },
  renault:         { bg: "#efdf00", text: "#000" },
  fiat:            { bg: "#cc0000", text: "#fff" },
  peugeot:         { bg: "#0055a4", text: "#fff" },
  citroen:         { bg: "#ef0000", text: "#fff" },
  "citroën":       { bg: "#ef0000", text: "#fff" },
  nissan:          { bg: "#c3002f", text: "#fff" },
  hyundai:         { bg: "#002c5f", text: "#fff" },
  kia:             { bg: "#05141f", text: "#fff" },
  jeep:            { bg: "#006241", text: "#fff" },
  mercedes:        { bg: "#222", text: "#fff" },
  "mercedes-benz": { bg: "#222", text: "#fff" },
  bmw:             { bg: "#1c69d4", text: "#fff" },
  audi:            { bg: "#bb0a14", text: "#fff" },
  yamaha:          { bg: "#003087", text: "#fff" },
  kawasaki:        { bg: "#4f9f1f", text: "#fff" },
  suzuki:          { bg: "#204399", text: "#fff" },
  harley:          { bg: "#ff6600", text: "#fff" },
  "harley-davidson": { bg: "#ff6600", text: "#fff" },
  ram:             { bg: "#1a1a1a", text: "#fff" },
  dodge:           { bg: "#cc0000", text: "#fff" },
  mitsubishi:      { bg: "#c00", text: "#fff" },
  subaru:          { bg: "#003087", text: "#fff" },
  mazda:           { bg: "#910a0c", text: "#fff" },
  volvo:           { bg: "#003057", text: "#fff" },
  chery:           { bg: "#c00", text: "#fff" },
  geely:           { bg: "#1a3f6e", text: "#fff" },
  byd:             { bg: "#1565c0", text: "#fff" },
  mg:              { bg: "#c00", text: "#fff" },
  lifan:           { bg: "#0055a4", text: "#fff" },
};

// Simple Icons CDN — SVGs con fondo transparente, shadow sigue el contorno real del logo
const SIMPLE_ICONS: Record<string, { slug: string; hex: string }> = {
  toyota:            { slug: "toyota",         hex: "EB0A1E" },
  ford:              { slug: "ford",           hex: "003478" },
  chevrolet:         { slug: "chevrolet",      hex: "C9A84C" },
  honda:             { slug: "honda",          hex: "CC0000" },
  volkswagen:        { slug: "volkswagen",     hex: "001E50" },
  vw:                { slug: "volkswagen",     hex: "001E50" },
  renault:           { slug: "renault",        hex: "EFDF00" },
  fiat:              { slug: "fiat",           hex: "CC0000" },
  peugeot:           { slug: "peugeot",        hex: "0055A4" },
  citroen:           { slug: "citroen",        hex: "EF0000" },
  "citroën":         { slug: "citroen",        hex: "EF0000" },
  nissan:            { slug: "nissan",         hex: "C3002F" },
  hyundai:           { slug: "hyundai",        hex: "002C5F" },
  kia:               { slug: "kia",            hex: "05141F" },
  jeep:              { slug: "jeep",           hex: "006241" },
  "mercedes-benz":   { slug: "mercedesbenz",   hex: "222222" },
  mercedes:          { slug: "mercedesbenz",   hex: "222222" },
  bmw:               { slug: "bmw",            hex: "1C69D4" },
  audi:              { slug: "audi",           hex: "BB0A14" },
  yamaha:            { slug: "yamaha",         hex: "003087" },
  kawasaki:          { slug: "kawasaki",       hex: "4F9F1F" },
  suzuki:            { slug: "suzuki",         hex: "204399" },
  "harley-davidson": { slug: "harleydavidson", hex: "FF6600" },
  harley:            { slug: "harleydavidson", hex: "FF6600" },
  mitsubishi:        { slug: "mitsubishi",     hex: "CC0000" },
  subaru:            { slug: "subaru",         hex: "003087" },
  mazda:             { slug: "mazda",          hex: "910A0C" },
  volvo:             { slug: "volvo",          hex: "003057" },
  byd:               { slug: "byd",            hex: "1565C0" },
  dodge:             { slug: "dodge",          hex: "CC0000" },
};

const BRAND_DOMAINS: Record<string, string> = {
  ram:    "ramtrucks.com",
  chery:  "chery.com",
  geely:  "geely.com",
  mg:     "mgmotor.com",
  lifan:  "lifan.com",
};

function getBrandLogoUrl(brand: string): string {
  const key = brand.toLowerCase().trim();
  const si = SIMPLE_ICONS[key] ??
    Object.entries(SIMPLE_ICONS).find(([k]) => key.includes(k) || k.includes(key))?.[1];
  if (si) return `https://cdn.simpleicons.org/${si.slug}/${si.hex}`;
  // fallback: Google S2 favicon
  const domain = BRAND_DOMAINS[key] ?? `${key.replace(/\s+/g, "")}.com`;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

function getBrandStyle(brand: string, accent: string): { bg: string; text: string } {
  const key = brand.toLowerCase().trim();
  if (BRAND_COLORS[key]) return BRAND_COLORS[key];
  // Try partial match
  for (const [k, v] of Object.entries(BRAND_COLORS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return { bg: accent, text: "#fff" };
}

function brandAbbr(name: string): string {
  if (name.length <= 3) return name.toUpperCase();
  // "Mercedes-Benz" → "MB", "Volkswagen" → "VW" style
  const specials: Record<string, string> = {
    "volkswagen": "VW", "mercedes-benz": "MB", "mercedes": "MB",
    "harley-davidson": "HD", "harley": "HD",
  };
  const key = name.toLowerCase().trim();
  if (specials[key]) return specials[key];
  return name.substring(0, 3).toUpperCase();
}

const NAVY = "#0d1f3c";

function VehiculosPageInner() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const slug         = params?.slug as string;
  const fromEditor   = searchParams?.get("from") === "editor";

  const [products,    setProducts]    = useState<StorefrontProduct[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [storeName,   setStoreName]   = useState("Tienda");
  const [accent,      setAccent]      = useState("#c9a227");
  const [currency,    setCurrency]    = useState("ARS");
  const [templateId,  setTemplateId]  = useState("");
  const [navBgColor,  setNavBgColor]  = useState<string | null>(null);
  const [whatsapp,    setWhatsapp]    = useState<{ enabled: boolean; number: string; message?: string }>({ enabled: false, number: "" });
  const [selected,  setSelected]  = useState<StorefrontProduct | null>(null);
  const [imgErrors,    setImgErrors]    = useState<Record<string, boolean>>({});
  const [hoveredMarca, setHoveredMarca] = useState<string | null>(null);

  const [search,         setSearch]      = useState("");
  const [activeCategory, setActiveCat]   = useState("Todos");
  const [activeMarca,    setActiveMarca] = useState("Todas");
  const [activeCiudad,   setActiveCiudad]= useState("Todas");
  const [sortBy,         setSortBy]      = useState("newest");

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/public/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!data?.store) return;
        setStoreName(data.store.name ?? "Tienda");
        try {
          const cfg = JSON.parse(data.store.storeConfig || "{}");
          if (cfg.colors?.accent)          setAccent(cfg.colors.accent);
          if (cfg.currency)                setCurrency(cfg.currency);
          if (cfg.whatsapp)                setWhatsapp(cfg.whatsapp);
          if (cfg.templateId ?? cfg.template) setTemplateId(cfg.templateId ?? cfg.template);
          if (cfg.sectionColors?.navBg)    setNavBgColor(cfg.sectionColors.navBg);
        } catch {}
        setProducts((data.store.products ?? []).map(mapVehicle));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!loading) document.title = `${storeName} — Catálogo de vehículos`;
  }, [loading, storeName]);

  const getAttr = (p: StorefrontProduct, ...keys: string[]) =>
    keys.reduce<string>((acc, key) =>
      acc || (p.attributes?.find(a => a.key.toLowerCase() === key.toLowerCase())?.value ?? "")
    , "");

  const getCiudad = (p: StorefrontProduct) => getAttr(p, "Ciudad / Zona", "Ciudad", "Ubicación");
  const getKm     = (p: StorefrontProduct) => getAttr(p, "Kilómetros", "Km");

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(c => c && c !== "general"))];
    return cats.length > 1 ? ["Todos", ...cats] : [];
  }, [products]);

  const marcas = useMemo(() => {
    const vals = [...new Set(products.map(p => getAttr(p, "Marca")).filter(Boolean))].sort();
    return vals;
  }, [products]);

  const ciudades = useMemo(() => {
    const vals = [...new Set(products.map(getCiudad).filter(Boolean))].sort();
    return vals.length > 1 ? vals : [];
  }, [products]);

  const filtered = useMemo(() => {
    let r = products.filter(p => {
      if (activeCategory !== "Todos" && p.category !== activeCategory) return false;
      if (activeMarca !== "Todas" && getAttr(p, "Marca") !== activeMarca) return false;
      if (activeCiudad !== "Todas" && getCiudad(p) !== activeCiudad) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const inName = p.name.toLowerCase().includes(q);
        const inCat  = p.category.toLowerCase().includes(q);
        const inAttr = p.attributes?.some(a => a.value.toLowerCase().includes(q));
        if (!inName && !inCat && !inAttr) return false;
      }
      return true;
    });
    if (sortBy === "price_asc")  r = [...r].sort((a, b) => a.price - b.price);
    if (sortBy === "price_desc") r = [...r].sort((a, b) => b.price - a.price);
    if (sortBy === "name_az")    r = [...r].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "km_asc")     r = [...r].sort((a, b) => {
      const kA = parseInt(getKm(a).replace(/\D/g,"") || "0");
      const kB = parseInt(getKm(b).replace(/\D/g,"") || "0");
      return kA - kB;
    });
    if (sortBy === "year_desc")  r = [...r].sort((a, b) => {
      const yA = parseInt(a.attributes?.find(x => x.key === "Año")?.value || "0");
      const yB = parseInt(b.attributes?.find(x => x.key === "Año")?.value || "0");
      return yB - yA;
    });
    return r;
  }, [products, activeCategory, activeMarca, activeCiudad, search, sortBy]);

  const hasActiveFilter = activeCategory !== "Todos" || activeMarca !== "Todas" || activeCiudad !== "Todas" || !!search;

  const isAD = templateId === "auto-drive";

  const S   = "#ffffff";
  const T   = isAD ? "#111827" : "#1a2744";
  const MID = isAD ? "#6b7280" : "#7a8fa6";
  const BG  = "#ffffff";
  const borderFaint = isAD ? "rgba(0,0,0,0.04)" : "rgba(27,63,110,0.07)";
  const border      = isAD ? "#e5e7eb" : "rgba(27,63,110,0.15)";

  // Header: si el usuario configuró un navBg, se usa ese; si no, según el template
  const headerBg       = navBgColor ?? (isAD ? "#ffffff" : NAVY);
  const headerIsDark   = getContrastColor(headerBg) === "light";
  const headerLinkColor  = headerIsDark ? "rgba(255,255,255,0.55)" : "#9ca3af";
  const headerLinkHover  = headerIsDark ? "#ffffff"                : "#374151";
  const headerCountColor = headerIsDark ? "rgba(255,255,255,0.4)"  : "#6b7280";
  const headerBorderLine = headerIsDark ? "none"                   : "1px solid #e5e7eb";
  const headerBoxShadow  = headerIsDark ? "0 2px 16px rgba(0,0,0,0.25)" : "0 1px 12px rgba(0,0,0,0.07)";
  const activeTabBg      = isAD ? accent : NAVY;
  const activeTabBorder  = isAD ? accent : NAVY;

  return (
    <div style={{ background: BG, color: T, minHeight: "100vh", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <style>{AM_MODAL_CSS}{`
        .st-scroll::-webkit-scrollbar{display:none}.st-scroll{scrollbar-width:none;-ms-overflow-style:none}
        .av-grid { display:grid; gap:20px; grid-template-columns:1fr }
        @media(min-width:560px){ .av-grid { grid-template-columns:repeat(2,1fr) } }
        @media(min-width:900px){ .av-grid { grid-template-columns:repeat(3,1fr) } }
        @media(min-width:1200px){ .av-grid { grid-template-columns:repeat(4,1fr) } }
        .brand-chip { }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background: headerBg, boxShadow: headerBoxShadow,
        borderBottom: headerBorderLine, position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 clamp(16px,4vw,32px)", height:64,
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <Link href={fromEditor ? "/dashboard/configuracion" : `/tienda/${slug}`}
            style={{ color: headerLinkColor, textDecoration:"none", fontSize:11, letterSpacing:3,
              textTransform:"uppercase", display:"flex", alignItems:"center", gap:8, transition:"color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color=headerLinkHover)}
            onMouseLeave={e => (e.currentTarget.style.color=headerLinkColor)}>
            ← {fromEditor ? "Volver al editor" : "Volver a la tienda"}
          </Link>
          <span style={{ fontSize:17, fontWeight:900, letterSpacing: headerIsDark ? 3 : -0.5,
            textTransform: headerIsDark ? "uppercase" : "none", color: accent }}>
            {storeName}
          </span>
          <span style={{ fontSize:12, color: headerCountColor, letterSpacing:1 }}>
            {filtered.length} vehículo{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div style={{ maxWidth:1280, margin:"0 auto", padding:"clamp(28px,4vw,44px) clamp(16px,4vw,32px)" }}>

        {/* ── TÍTULO + CONTROLES ── */}
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between",
          marginBottom:36, flexWrap:"wrap", gap:16 }}>
          <div>
            <p style={{ fontSize:10, letterSpacing:5, color:accent,
              textTransform:"uppercase", margin:"0 0 10px", fontWeight:700 }}>
              Catálogo completo
            </p>
            <h1 style={{ fontSize:"clamp(26px,4vw,40px)", margin:"0 0 6px", color:T,
              lineHeight:1.1, fontWeight:900, letterSpacing:-0.5 }}>
              {activeCategory !== "Todos" ? activeCategory : "Todos los vehículos"}
            </h1>
            <p style={{ fontSize:12, color:MID, margin:0, letterSpacing:1 }}>
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
            <div style={{ position:"relative" }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar marca, modelo..."
                style={{ background:S, border:`1px solid ${border}`, color:T,
                  padding:"11px 16px 11px 40px", fontSize:13, outline:"none",
                  width:"clamp(180px,50vw,220px)", boxSizing:"border-box" as const, borderRadius:4 }}
                onFocus={e => (e.target.style.borderColor=accent)}
                onBlur={e => (e.target.style.borderColor=border)} />
              <svg style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)",
                opacity:0.4, pointerEvents:"none" }}
                width={15} height={15} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              {search && (
                <button onClick={() => setSearch("")}
                  style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", color:MID, cursor:"pointer", fontSize:16, padding:0 }}>
                  ×
                </button>
              )}
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ background:S, border:`1px solid ${border}`, color:T,
                padding:"11px 14px", fontSize:12, outline:"none", cursor:"pointer", borderRadius:4 }}>
              <option value="newest">Más recientes</option>
              <option value="price_asc">Precio ↑</option>
              <option value="price_desc">Precio ↓</option>
              <option value="year_desc">Año (nuevo primero)</option>
              <option value="km_asc">Menor kilometraje</option>
              <option value="name_az">Nombre A→Z</option>
            </select>
          </div>
        </div>

        {/* ── LOGOS DE MARCAS ── */}
        {marcas.length > 0 && (
          <div style={{ marginBottom:32 }}>
            <p style={{ fontSize:10, letterSpacing:3, color:MID, textTransform:"uppercase",
              margin:"0 0 18px", fontWeight:600 }}>
              Filtrar por marca
            </p>
            <div className="st-scroll" style={{ display:"flex", gap:20, overflowX:"auto",
              paddingBottom:12, paddingTop:12, paddingLeft:4, paddingRight:4,
              WebkitOverflowScrolling:"touch" as any, scrollSnapType:"x mandatory" }}>
              {/* Chip "Todas" */}
              {/* Chip "Todas" — círculo de color con drop-shadow flotante */}
              {(() => {
                const isTodas = activeMarca === "Todas";
                const isHov   = hoveredMarca === "__todas__";
                const shadow  = isTodas
                  ? `drop-shadow(0 8px 20px ${accent}80) drop-shadow(0 2px 6px rgba(0,0,0,0.18))`
                  : isHov
                    ? "drop-shadow(0 10px 22px rgba(0,0,0,0.22)) drop-shadow(0 3px 8px rgba(0,0,0,0.12))"
                    : "drop-shadow(0 5px 14px rgba(0,0,0,0.16)) drop-shadow(0 1px 3px rgba(0,0,0,0.08))";
                const tf = isTodas ? "scale(1.15) translateY(-5px)" : isHov ? "translateY(-4px)" : "translateY(0)";
                return (
                  <button className="brand-chip" onClick={() => setActiveMarca("Todas")}
                    onMouseEnter={() => setHoveredMarca("__todas__")}
                    onMouseLeave={() => setHoveredMarca(null)}
                    style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8,
                      background:"none", border:"none", cursor:"pointer", flexShrink:0, padding:0,
                      scrollSnapAlign:"start" }}>
                    <svg width={52} height={52} viewBox="0 0 52 52" fill="none"
                      style={{ display:"block", filter: shadow, transform: tf,
                        transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)" }}>
                      <rect x="6"  y="6"  width="16" height="16" rx="3" fill={isTodas ? accent : "#a0b4cc"}/>
                      <rect x="30" y="6"  width="16" height="16" rx="3" fill={isTodas ? accent : "#a0b4cc"}/>
                      <rect x="6"  y="30" width="16" height="16" rx="3" fill={isTodas ? accent : "#a0b4cc"}/>
                      <rect x="30" y="30" width="16" height="16" rx="3" fill={isTodas ? accent : "#a0b4cc"}/>
                    </svg>
                    <span style={{ fontSize:10, fontWeight: isTodas ? 700 : 400,
                      color: isTodas ? accent : MID, letterSpacing:0.5 }}>
                      Todas
                    </span>
                  </button>
                );
              })()}

              {marcas.map(marca => {
                const bc      = getBrandStyle(marca, accent);
                const isActive = activeMarca === marca;
                const abbr    = brandAbbr(marca);
                const isHov   = hoveredMarca === marca;
                const shadow  = isActive
                  ? `drop-shadow(0 8px 22px ${accent}90) drop-shadow(0 2px 6px rgba(0,0,0,0.18))`
                  : isHov
                    ? "drop-shadow(0 10px 22px rgba(0,0,0,0.22)) drop-shadow(0 3px 8px rgba(0,0,0,0.12))"
                    : "drop-shadow(0 5px 14px rgba(0,0,0,0.16)) drop-shadow(0 1px 3px rgba(0,0,0,0.08))";
                const tf = isActive ? "scale(1.15) translateY(-5px)" : isHov ? "translateY(-4px)" : "translateY(0)";
                return (
                  <button key={marca} className="brand-chip"
                    onClick={() => setActiveMarca(isActive ? "Todas" : marca)}
                    onMouseEnter={() => setHoveredMarca(marca)}
                    onMouseLeave={() => setHoveredMarca(null)}
                    style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8,
                      background:"none", border:"none", cursor:"pointer", flexShrink:0, padding:0,
                      scrollSnapAlign:"start" }}>
                    {imgErrors[marca] ? (
                      /* Fallback: círculo de color flotante */
                      <div style={{ width:56, height:56, borderRadius:"50%", background:bc.bg,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        filter: shadow, transform: tf,
                        transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)" }}>
                        <span style={{ fontSize:13, fontWeight:900, color:bc.text,
                          letterSpacing:0.5, lineHeight:1 }}>{abbr}</span>
                      </div>
                    ) : (
                      /* Logo flotando sin fondo — drop-shadow sigue el contorno */
                      <img src={getBrandLogoUrl(marca)} alt={marca}
                        width={56} height={56}
                        style={{ objectFit:"contain", display:"block", borderRadius:10,
                          filter: shadow, transform: tf,
                          transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)" }}
                        onError={() => setImgErrors(prev => ({...prev, [marca]: true}))}
                      />
                    )}
                    <span style={{ fontSize:10, fontWeight: isActive ? 700 : 400,
                      color: isActive ? accent : MID, letterSpacing:0.3,
                      maxWidth:68, overflow:"hidden", textOverflow:"ellipsis",
                      whiteSpace:"nowrap", textAlign:"center" }}>
                      {marca}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── FILTROS DE CATEGORIA Y ZONA ── */}
        {(categories.length > 0 || ciudades.length > 0 || hasActiveFilter) && (
          <div style={{ marginBottom:32, display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
            {/* Tabs de categoría */}
            {categories.length > 0 && (
              <div className="st-scroll" style={{ display:"flex", gap:8, flexWrap:"nowrap", overflowX:"auto",
                WebkitOverflowScrolling:"touch" as any }}>
                {categories.map(cat => {
                  const isActive = activeCategory === cat;
                  return (
                    <button key={cat} onClick={() => setActiveCat(cat)}
                      style={{ background: isActive ? activeTabBg : S,
                        color: isActive ? "#fff" : T,
                        border:`1px solid ${isActive ? activeTabBorder : border}`,
                        padding:"9px 20px", fontSize:11, letterSpacing:1.5, cursor:"pointer",
                        fontWeight:600, textTransform:"uppercase", transition:"all 0.2s",
                        borderRadius:4, flexShrink:0, whiteSpace:"nowrap" }}>
                      {cat}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Dropdown de ciudad */}
            {ciudades.length > 0 && (
              <select value={activeCiudad} onChange={e => setActiveCiudad(e.target.value)}
                style={{ background:S, border:`1px solid ${border}`, color:T,
                  padding:"9px 14px", fontSize:12, outline:"none", cursor:"pointer", borderRadius:4 }}
                onFocus={e => (e.target.style.borderColor=accent)}
                onBlur={e => (e.target.style.borderColor=border)}>
                <option value="Todas">Todas las zonas</option>
                {ciudades.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {hasActiveFilter && (
              <button onClick={() => { setActiveCat("Todos"); setActiveMarca("Todas"); setActiveCiudad("Todas"); setSearch(""); }}
                style={{ background:"none", border:`1px solid ${border}`, color:MID, fontSize:11,
                  letterSpacing:1, cursor:"pointer", padding:"9px 16px", borderRadius:4,
                  transition:"all 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor=accent; (e.currentTarget as HTMLElement).style.color=accent; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor=border; (e.currentTarget as HTMLElement).style.color=MID; }}>
                ✕ Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* ── GRILLA ── */}
        {loading ? (
          <div style={{ textAlign:"center", padding:"80px 0", color:MID, fontSize:14 }}>
            Cargando vehículos…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0", background:S,
            borderRadius:8, border:`1px solid ${borderFaint}` }}>
            <p style={{ fontSize:22, fontWeight:700, color:T, marginBottom:8 }}>Sin resultados</p>
            <p style={{ fontSize:13, color:MID }}>Probá con otra búsqueda o marca</p>
          </div>
        ) : (
          <div className="av-grid">
            {filtered.map(p => (
              <VehicleCard key={p.id} product={p} accent={accent} currency={currency}
                theme="light" onClick={() => setSelected(p)} />
            ))}
          </div>
        )}

      </div>

      {selected && (
        <VehicleModal
          product={selected} accent={accent} currency={currency}
          whatsapp={whatsapp} products={filtered}
          onClose={() => setSelected(null)} onSelect={p => setSelected(p)} />
      )}
    </div>
  );
}

export default function VehiculosPage() {
  return (
    <Suspense>
      <VehiculosPageInner />
    </Suspense>
  );
}
