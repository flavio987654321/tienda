"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

type Variant = { id: string; name: string; value: string; stock: number; price: number | null };
type Product = {
  id: string; name: string; price: number; comparePrice: number | null;
  category: string; subcategory?: string; description: string | null;
  images: string[]; sizes: string[]; colors: string[]; variants: Variant[];
};

const SIZE_ATTRS  = ["talle","size","talla","talles","sizes"];
const COLOR_ATTRS = ["color","colour","colores","colors"];
const PAGE_SIZE   = 24;

function mapProduct(raw: any): Product {
  const variants = raw.variants ?? [];
  const sizes  = [...new Set<string>(variants.filter((v: any) => SIZE_ATTRS.includes(v.name?.toLowerCase())).map((v: any) => v.value))];
  const colors = [...new Set<string>(variants.filter((v: any) => COLOR_ATTRS.includes(v.name?.toLowerCase())).map((v: any) => v.value))];
  let images: string[] = [];
  try {
    const parsed = JSON.parse(raw.images || "[]");
    images = parsed.map((img: any) => typeof img === "string" ? img : img?.url ?? "").filter(Boolean);
  } catch {}
  return {
    id: raw.id, name: raw.name, price: raw.price, comparePrice: raw.comparePrice ?? null,
    category: raw.category ?? "general", subcategory: raw.subcategory ?? undefined,
    description: raw.description ?? null, images, sizes, colors, variants,
  };
}

export default function ProductosPage() {
  const params  = useParams();
  const slug    = params?.slug as string;

  const [products,     setProducts]     = useState<Product[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [storeName,    setStoreName]    = useState("Tienda");
  const [accentColor,  setAccentColor]  = useState("#c9a84c");

  const [search,           setSearch]           = useState("");
  const [activeCategory,   setActiveCategory]   = useState("Todos");
  const [activeSubcategory,setActiveSubcategory]= useState<string | null>(null);
  const [hoveredCatMenu,   setHoveredCatMenu]   = useState<string | null>(null);
  const [page,             setPage]             = useState(1);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/public/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.store) return;
        try {
          const cfg = JSON.parse(data.store.storeConfig || "{}");
          if (cfg.colors?.accent) setAccentColor(cfg.colors.accent);
          if (cfg.storeName)      setStoreName(cfg.storeName);
          else if (data.store.name) setStoreName(data.store.name);
        } catch { if (data.store.name) setStoreName(data.store.name); }
        setProducts((data.store.products ?? []).map(mapProduct));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const G   = accentColor;
  const BG  = "#0a0a0a";
  const S   = "#111111";
  const T   = "#f0ebe3";
  const MID = "#888";
  const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style:"currency", currency:"ARS", maximumFractionDigits:0 }).format(n);

  const categoryList = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(c => c && c !== "general"))];
    return cats.length > 0 ? cats : [];
  }, [products]);

  const CATEGORIES = useMemo(() => ["Todos", ...categoryList], [categoryList]);

  const subcategoriesFor = useMemo(() => {
    const map: Record<string, string[]> = {};
    products.forEach(p => {
      if (p.subcategory && p.category) {
        if (!map[p.category]) map[p.category] = [];
        if (!map[p.category].includes(p.subcategory)) map[p.category].push(p.subcategory);
      }
    });
    return map;
  }, [products]);

  const filtered = useMemo(() => products.filter(p => {
    if (activeCategory !== "Todos" && p.category !== activeCategory) return false;
    if (activeSubcategory && p.subcategory !== activeSubcategory) return false;
    if (search.trim() && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !(p.subcategory ?? "").toLowerCase().includes(search.toLowerCase()) &&
        !p.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [products, activeCategory, activeSubcategory, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const changeCategory = (cat: string, sub: string | null = null) => {
    setActiveCategory(cat);
    setActiveSubcategory(sub);
    setPage(1);
  };

  if (loading) return (
    <div style={{ background:BG, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:G, fontSize:13, letterSpacing:3, textTransform:"uppercase" }}>Cargando...</div>
    </div>
  );

  return (
    <div style={{ background:BG, color:T, minHeight:"100vh", fontFamily:"'Helvetica Neue', Arial, sans-serif" }}>

      {/* Header sticky */}
      <div style={{ position:"sticky", top:0, zIndex:100, background:"rgba(10,10,10,0.97)", backdropFilter:"blur(12px)", borderBottom:`1px solid rgba(201,168,76,0.12)` }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 32px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <Link href={`/tienda/${slug}`}
            style={{ color:T, textDecoration:"none", fontSize:11, letterSpacing:3, textTransform:"uppercase", opacity:0.55, display:"flex", alignItems:"center", gap:8, transition:"opacity 0.2s" }}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.opacity="1")}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.opacity="0.55")}>
            ← Volver a la tienda
          </Link>
          <span style={{ fontFamily:"Georgia, serif", fontSize:20, fontWeight:700, letterSpacing:5, color:G }}>{storeName}</span>
          <span style={{ fontSize:11, opacity:0.35, letterSpacing:2 }}>{filtered.length} producto{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div style={{ maxWidth:1280, margin:"0 auto", padding:"48px 32px" }}>

        {/* Título + buscador */}
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:40, flexWrap:"wrap", gap:16 }}>
          <div>
            <p style={{ fontSize:10, letterSpacing:5, color:G, textTransform:"uppercase", margin:"0 0 12px" }}>Colección completa</p>
            <h1 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(28px,4vw,42px)", margin:"0 0 8px", color:T, lineHeight:1.1 }}>
              {activeCategory === "Todos" ? "Todos los productos" : activeCategory}
              {activeSubcategory && <span style={{ fontStyle:"italic", opacity:0.6 }}> › {activeSubcategory}</span>}
            </h1>
            <p style={{ fontSize:12, opacity:0.35, margin:0, letterSpacing:2 }}>
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div style={{ position:"relative" }}>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar productos..."
              style={{ background:S, border:`1px solid rgba(201,168,76,0.2)`, color:T, padding:"11px 16px 11px 42px", fontSize:13, outline:"none", width:280, boxSizing:"border-box" }}
              onFocus={e => (e.target.style.borderColor=G)}
              onBlur={e => (e.target.style.borderColor="rgba(201,168,76,0.2)")}
            />
            <svg style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", opacity:0.35, pointerEvents:"none" }} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            {search && (
              <button onClick={() => { setSearch(""); setPage(1); }}
                style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:MID, cursor:"pointer", fontSize:16, lineHeight:1, padding:0 }}>×</button>
            )}
          </div>
        </div>

        {/* Filtros de categoría con subcategorías en dropdown */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:40, borderBottom:`1px solid rgba(240,235,227,0.06)`, paddingBottom:24 }}>
          {CATEGORIES.map(cat => {
            const subcats = cat !== "Todos" ? (subcategoriesFor[cat] || []) : [];
            const isActive = activeCategory === cat;
            return (
              <div key={cat} style={{ position:"relative" }}
                onMouseEnter={() => subcats.length > 0 && setHoveredCatMenu(cat)}
                onMouseLeave={() => setHoveredCatMenu(null)}>
                <button onClick={() => changeCategory(cat)}
                  style={{ background: isActive ? G : "transparent", color: isActive ? BG : T, border:`1px solid ${isActive ? G : "rgba(240,235,227,0.18)"}`, padding:"9px 22px", fontSize:11, letterSpacing:2, cursor:"pointer", fontWeight:600, textTransform:"uppercase", transition:"all 0.2s", display:"flex", alignItems:"center", gap:5 }}>
                  {cat}
                  {subcats.length > 0 && <span style={{ opacity:0.55, fontSize:9 }}>▾</span>}
                </button>
                {subcats.length > 0 && hoveredCatMenu === cat && (
                  <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, background:"#1a1a1a", border:`1px solid rgba(201,168,76,0.2)`, minWidth:180, zIndex:400, padding:"4px 0", boxShadow:"0 8px 24px rgba(0,0,0,0.6)" }}>
                    <button onClick={() => { changeCategory(cat); setHoveredCatMenu(null); }}
                      style={{ display:"block", width:"100%", background: activeCategory===cat && !activeSubcategory ? `rgba(${hexToRgb(G)},0.1)` : "none", border:"none", color: activeCategory===cat && !activeSubcategory ? G : T, padding:"9px 16px", fontSize:11, textAlign:"left", cursor:"pointer", letterSpacing:1, textTransform:"uppercase" }}>
                      Todos en {cat}
                    </button>
                    <div style={{ borderTop:"1px solid rgba(240,235,227,0.06)", margin:"2px 0" }}/>
                    {subcats.map(sub => (
                      <button key={sub} onClick={() => { changeCategory(cat, sub); setHoveredCatMenu(null); }}
                        style={{ display:"block", width:"100%", background: activeSubcategory===sub ? "rgba(201,168,76,0.08)" : "none", border:"none", color: activeSubcategory===sub ? G : T, padding:"8px 16px 8px 24px", fontSize:11, textAlign:"left", cursor:"pointer", letterSpacing:1, textTransform:"uppercase", opacity: activeSubcategory===sub ? 1 : 0.7 }}
                        onMouseEnter={e => (e.currentTarget.style.background="rgba(201,168,76,0.06)")}
                        onMouseLeave={e => (e.currentTarget.style.background=activeSubcategory===sub?"rgba(201,168,76,0.08)":"none")}>
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {(activeCategory !== "Todos" || activeSubcategory || search) && (
            <button onClick={() => { changeCategory("Todos"); setSearch(""); }}
              style={{ background:"none", border:"none", color:MID, fontSize:11, letterSpacing:1, cursor:"pointer", padding:"9px 8px", textDecoration:"underline" }}>
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Grilla */}
        {paginated.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0", opacity:0.4 }}>
            <p style={{ fontFamily:"Georgia, serif", fontSize:22, marginBottom:8 }}>Sin resultados</p>
            <p style={{ fontSize:13 }}>Probá con otra búsqueda o categoría</p>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:24, marginBottom:56 }}>
            {paginated.map(product => (
              <div key={product.id} style={{ cursor:"pointer" }}
                onMouseEnter={e => (e.currentTarget.querySelector("img")?.style && ((e.currentTarget.querySelector("img") as HTMLImageElement).style.transform="scale(1.05)"))}
                onMouseLeave={e => (e.currentTarget.querySelector("img")?.style && ((e.currentTarget.querySelector("img") as HTMLImageElement).style.transform="scale(1)"))}>
                <div style={{ position:"relative", aspectRatio:"3/4", overflow:"hidden", background:S, marginBottom:16 }}>
                  {product.images[0] ? (
                    <img src={product.images[0]} alt={product.name}
                      style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform 0.5s ease" }}
                      onError={e => { e.currentTarget.style.opacity="0"; }}/>
                  ) : (
                    <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", opacity:0.15 }}>
                      <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={0.8}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                  )}
                  {product.comparePrice && (
                    <div style={{ position:"absolute", top:12, left:12, background:G, color:BG, fontSize:9, fontWeight:800, letterSpacing:2, padding:"4px 10px", textTransform:"uppercase" }}>Oferta</div>
                  )}
                  {(product.subcategory || product.category !== "general") && (
                    <div style={{ position:"absolute", top:12, right:12, background:"rgba(10,10,10,0.7)", color:T, fontSize:9, letterSpacing:2, padding:"4px 10px", textTransform:"uppercase" }}>
                      {product.subcategory ?? product.category}
                    </div>
                  )}
                </div>
                <p style={{ fontSize:10, color:MID, letterSpacing:2, textTransform:"uppercase", margin:"0 0 5px" }}>{product.category}</p>
                <p style={{ fontSize:15, color:T, margin:"0 0 8px", fontWeight:500, lineHeight:1.3 }}>{product.name}</p>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <span style={{ fontSize:16, fontWeight:700, color:G }}>{fmt(product.price)}</span>
                  {product.comparePrice && <span style={{ fontSize:12, color:MID, textDecoration:"line-through" }}>{fmt(product.comparePrice)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div style={{ display:"flex", gap:8, justifyContent:"center", alignItems:"center", flexWrap:"wrap" }}>
            <button onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top:0, behavior:"smooth" }); }}
              disabled={page === 1}
              style={{ background:"transparent", color: page===1 ? MID : T, border:`1px solid ${page===1 ? "rgba(240,235,227,0.08)" : "rgba(240,235,227,0.22)"}`, padding:"10px 22px", fontSize:11, letterSpacing:2, cursor: page===1 ? "default" : "pointer", textTransform:"uppercase" }}>
              ← Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => {
              if (n !== 1 && n !== totalPages && Math.abs(n - page) > 2) return null;
              return (
                <button key={n} onClick={() => { setPage(n); window.scrollTo({ top:0, behavior:"smooth" }); }}
                  style={{ background: page===n ? G : "transparent", color: page===n ? BG : T, border:`1px solid ${page===n ? G : "rgba(240,235,227,0.2)"}`, width:40, height:40, fontSize:13, fontWeight:700, cursor:"pointer", transition:"all 0.2s" }}>
                  {n}
                </button>
              );
            })}
            <button onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top:0, behavior:"smooth" }); }}
              disabled={page === totalPages}
              style={{ background:"transparent", color: page===totalPages ? MID : T, border:`1px solid ${page===totalPages ? "rgba(240,235,227,0.08)" : "rgba(240,235,227,0.22)"}`, padding:"10px 22px", fontSize:11, letterSpacing:2, cursor: page===totalPages ? "default" : "pointer", textTransform:"uppercase" }}>
              Siguiente →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}
