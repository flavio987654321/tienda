"use client";
import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { VehicleCard, VehicleModal, AM_MODAL_CSS } from "@/components/store/auto/AutoVehicleShared";
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
  return {
    id: raw.id, name: raw.name, price: raw.price,
    comparePrice: raw.comparePrice ?? null,
    precioMayorista: null, cantMinMayorista: null,
    category: raw.category ?? "general",
    gender: "unisex",
    description: raw.description ?? null,
    images, imageItems,
    reelUrls: [], sizes: [], colors: [],
    variants: raw.variants ?? [],
    attributes,
    badge: raw.badge ?? undefined,
  };
}

const fmt = (n: number, currency: string) =>
  (currency === "USD" ? "U$D " : "$") + n.toLocaleString("es-AR");

function VehiculosPageInner() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const slug         = params?.slug as string;
  const fromEditor   = searchParams?.get("from") === "editor";

  const [products,   setProducts]   = useState<StorefrontProduct[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [storeName,  setStoreName]  = useState("Tienda");
  const [accent,     setAccent]     = useState("#c9a227");
  const [currency,   setCurrency]   = useState("ARS");
  const [whatsapp,   setWhatsapp]   = useState<{ enabled: boolean; number: string }>({ enabled: false, number: "" });
  const [selected,   setSelected]   = useState<StorefrontProduct | null>(null);

  const [search,         setSearch]         = useState("");
  const [activeCategory, setActiveCat]      = useState("Todos");
  const [sortBy,         setSortBy]         = useState("newest");

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/public/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!data?.store) return;
        setStoreName(data.store.name ?? "Tienda");
        try {
          const cfg = JSON.parse(data.store.storeConfig || "{}");
          if (cfg.colors?.accent) setAccent(cfg.colors.accent);
          if (cfg.currency)       setCurrency(cfg.currency);
          if (cfg.whatsapp)       setWhatsapp(cfg.whatsapp);
        } catch {}
        setProducts((data.store.products ?? []).map(mapVehicle));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!loading) document.title = `${storeName} — Catálogo de vehículos`;
  }, [loading, storeName]);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(c => c && c !== "general"))];
    return ["Todos", ...cats];
  }, [products]);

  const filtered = useMemo(() => {
    let r = products.filter(p => {
      if (activeCategory !== "Todos" && p.category !== activeCategory) return false;
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
    if (sortBy === "km_asc") {
      r = [...r].sort((a, b) => {
        const kmA = parseInt((a.attributes?.find(x => x.key === "Km")?.value ?? "").replace(/\D/g, "") || "0");
        const kmB = parseInt((b.attributes?.find(x => x.key === "Km")?.value ?? "").replace(/\D/g, "") || "0");
        return kmA - kmB;
      });
    }
    if (sortBy === "year_desc") {
      r = [...r].sort((a, b) => {
        const yA = parseInt(a.attributes?.find(x => x.key === "Año")?.value || "0");
        const yB = parseInt(b.attributes?.find(x => x.key === "Año")?.value || "0");
        return yB - yA;
      });
    }
    return r;
  }, [products, activeCategory, search, sortBy]);

  const dark = false;
  const BG   = "#f5f5f5";
  const S    = "#ffffff";
  const T    = "#111111";
  const MID  = "#888888";
  const borderFaint = "rgba(0,0,0,0.06)";
  const border      = "rgba(0,0,0,0.12)";
  const backdropNav = "rgba(255,255,255,0.97)";

  return (
    <div style={{ background: BG, color: T, minHeight: "100vh", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <style>{AM_MODAL_CSS}{`
        .st-tabs::-webkit-scrollbar{display:none}.st-tabs{scrollbar-width:none;-ms-overflow-style:none}
        .av-grid { display:grid; gap:20px; grid-template-columns:1fr }
        @media(min-width:560px){ .av-grid { grid-template-columns:repeat(2,1fr) } }
        @media(min-width:900px){ .av-grid { grid-template-columns:repeat(3,1fr) } }
        @media(min-width:1200px){ .av-grid { grid-template-columns:repeat(4,1fr) } }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ position:"sticky", top:0, zIndex:100, background:backdropNav,
        backdropFilter:"blur(12px)", borderBottom:`1px solid ${borderFaint}` }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 clamp(16px,4vw,32px)", height:64,
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          {fromEditor ? (
            <Link href="/dashboard/configuracion"
              style={{ color:T, textDecoration:"none", fontSize:11, letterSpacing:3,
                textTransform:"uppercase", opacity:0.5, display:"flex", alignItems:"center",
                gap:8, transition:"opacity 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity="1")}
              onMouseLeave={e => (e.currentTarget.style.opacity="0.5")}>
              ← Volver al editor
            </Link>
          ) : (
            <Link href={`/tienda/${slug}`}
              style={{ color:T, textDecoration:"none", fontSize:11, letterSpacing:3,
                textTransform:"uppercase", opacity:0.5, display:"flex", alignItems:"center",
                gap:8, transition:"opacity 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity="1")}
              onMouseLeave={e => (e.currentTarget.style.opacity="0.5")}>
              ← Volver a la tienda
            </Link>
          )}
          <span style={{ fontSize:18, fontWeight:800, letterSpacing:3,
            textTransform:"uppercase", color: accent }}>
            {storeName}
          </span>
          <span style={{ fontSize:12, color: MID, letterSpacing:1 }}>
            {filtered.length} vehículo{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div style={{ maxWidth:1280, margin:"0 auto", padding:"clamp(32px,5vw,48px) clamp(16px,4vw,32px)" }}>

        {/* ── TÍTULO + CONTROLES ─────────────────────────────────────────── */}
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between",
          marginBottom:40, flexWrap:"wrap", gap:16 }}>
          <div>
            <p style={{ fontSize:10, letterSpacing:5, color:accent,
              textTransform:"uppercase", margin:"0 0 12px" }}>
              Catálogo completo
            </p>
            <h1 style={{ fontSize:"clamp(28px,4vw,42px)", margin:"0 0 8px", color:T,
              lineHeight:1.1, fontWeight:900, letterSpacing:-0.5 }}>
              {activeCategory === "Todos" ? "Todos los vehículos" : activeCategory}
            </h1>
            <p style={{ fontSize:12, opacity:0.35, margin:0, letterSpacing:2 }}>
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
            <div style={{ position:"relative" }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar marca, modelo..."
                style={{ background:S, border:`1px solid ${border}`, color:T,
                  padding:"11px 16px 11px 40px", fontSize:13, outline:"none",
                  width:"clamp(180px,50vw,230px)", boxSizing:"border-box" as const, borderRadius:3 }}
                onFocus={e => (e.target.style.borderColor=accent)}
                onBlur={e => (e.target.style.borderColor=border)}
              />
              <svg style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)",
                opacity:0.35, pointerEvents:"none" }}
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
                padding:"11px 14px", fontSize:12, outline:"none", cursor:"pointer", borderRadius:3 }}>
              <option value="newest">Más recientes</option>
              <option value="price_asc">Precio ↑</option>
              <option value="price_desc">Precio ↓</option>
              <option value="year_desc">Año (nuevo primero)</option>
              <option value="km_asc">Menor kilometraje</option>
              <option value="name_az">Nombre A→Z</option>
            </select>
          </div>
        </div>

        {/* ── FILTROS ────────────────────────────────────────────────────── */}
        {categories.length > 1 && (
          <div className="st-tabs" style={{ display:"flex", gap:8, flexWrap:"nowrap", overflowX:"auto", marginBottom:40,
            borderBottom:`1px solid ${borderFaint}`, paddingBottom:24, WebkitOverflowScrolling:"touch" as any }}>
            {categories.map(cat => {
              const isActive = activeCategory === cat;
              return (
                <button key={cat} onClick={() => setActiveCat(cat)}
                  style={{ background: isActive ? accent : "transparent",
                    color: isActive ? "#fff" : T,
                    border:`1px solid ${isActive ? accent : border}`,
                    padding:"9px 20px", fontSize:11, letterSpacing:2, cursor:"pointer",
                    fontWeight:600, textTransform:"uppercase", transition:"all 0.2s",
                    borderRadius:3 }}>
                  {cat}
                </button>
              );
            })}
            {(activeCategory !== "Todos" || search) && (
              <button onClick={() => { setActiveCat("Todos"); setSearch(""); }}
                style={{ background:"none", border:"none", color:MID, fontSize:11,
                  letterSpacing:1, cursor:"pointer", padding:"9px 8px",
                  textDecoration:"underline" }}>
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* ── GRILLA ─────────────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ textAlign:"center", padding:"80px 0", color:MID, fontSize:14 }}>
            Cargando vehículos…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0" }}>
            <p style={{ fontSize:22, fontWeight:700, color:T, marginBottom:8 }}>
              Sin resultados
            </p>
            <p style={{ fontSize:13, color:MID }}>
              Probá con otra búsqueda o categoría
            </p>
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
          product={selected}
          accent={accent}
          currency={currency}
          whatsapp={whatsapp}
          products={products}
          onClose={() => setSelected(null)}
          onSelect={p => setSelected(p)}
        />
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
