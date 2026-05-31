"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useCartLogic } from "@/hooks/useCartLogic";
import type { StorefrontProduct, PlaceOrderParams } from "@/hooks/useStorefront";
import { ENVIO_OPTIONS, PAGO_OPTIONS } from "@/components/store/shared/cartTypes";

// ── Tipos extra ──────────────────────────────────────────────────────────────
const SIZE_ATTRS  = [
  "talle","size","talla","talles","sizes",
  "tamaño","tamano",
  "almacenamiento","ram",
  "versión","version",
  "formato","variante","material",
  "sabor","peso/tamaño","peso",
];
const COLOR_ATTRS = ["color","colour","colores","colors","tono"];
const PAGE_SIZE   = 24;

function mapProduct(raw: any): StorefrontProduct {
  const variants = raw.variants ?? [];
  const sizesSet  = new Set<string>();
  const colorsSet = new Set<string>();
  variants.forEach((v: any) => {
    let attrs: Record<string, string> = {};
    try { const p = JSON.parse(v.name); if (p && typeof p === "object") attrs = p; } catch {}
    if (Object.keys(attrs).length > 0) {
      Object.entries(attrs).forEach(([k, val]) => {
        if (SIZE_ATTRS.includes(k.toLowerCase())  && val) sizesSet.add(val as string);
        if (COLOR_ATTRS.includes(k.toLowerCase()) && val) colorsSet.add(val as string);
      });
    } else {
      if (SIZE_ATTRS.includes(v.name?.toLowerCase())  && v.value) sizesSet.add(v.value);
      if (COLOR_ATTRS.includes(v.name?.toLowerCase()) && v.value) colorsSet.add(v.value);
    }
  });
  const sizes  = [...sizesSet];
  const colors = [...colorsSet];
  let images: string[] = [];
  let imageItems: { url: string; variantValue?: string }[] = [];
  try {
    const parsed = JSON.parse(raw.images || "[]");
    imageItems = parsed
      .map((img: any) => typeof img === "string" ? { url: img } : { url: img?.url ?? "", variantValue: img?.variantValue })
      .filter((x: any) => x.url);
    images = imageItems.map((x: any) => x.url);
  } catch {}
  let reelUrls: string[] = [];
  try {
    const parsed = JSON.parse(raw.reelUrls || "[]");
    reelUrls = Array.isArray(parsed) ? parsed.filter((u: unknown) => typeof u === "string") : [];
  } catch {}
  return {
    id: raw.id, name: raw.name, price: raw.price,
    comparePrice: raw.comparePrice ?? null,
    precioMayorista: raw.precioMayorista ?? null,
    cantMinMayorista: raw.cantMinMayorista ?? null,
    category: raw.category ?? "general",
    subcategory: raw.subcategory ?? undefined,
    gender: raw.gender ?? "unisex",
    description: raw.description ?? null,
    images, imageItems, reelUrls, sizes, colors, variants,
  };
}

// ── Temas por template ───────────────────────────────────────────────────────
type Theme = {
  BG: string; S: string; T: string; G: string; MID: string;
  border: string; borderFaint: string; inputBorder: string; inputBg: string;
  serif: string; sans: string; dark: boolean;
};

const THEMES: Record<string, Theme> = {
  "fashion-noir": {
    BG:"#0a0a0a", S:"#111111", T:"#f0ebe3", G:"#c9a84c", MID:"#888",
    border:"rgba(201,168,76,0.15)", borderFaint:"rgba(240,235,227,0.06)",
    inputBorder:"rgba(201,168,76,0.15)", inputBg:"#171717",
    serif:"Georgia, serif", sans:"'Helvetica Neue', Arial, sans-serif", dark:true,
  },
  "boho-terra": {
    BG:"#faf8f4", S:"#f2ebe0", T:"#2c2218", G:"#b56529", MID:"#999",
    border:"rgba(181,101,41,0.2)", borderFaint:"rgba(44,34,24,0.06)",
    inputBorder:"rgba(181,101,41,0.25)", inputBg:"#fff",
    serif:"Georgia, serif", sans:"Inter, system-ui, sans-serif", dark:false,
  },
  "chic-paris": {
    BG:"#f9f9f7", S:"#f0eeea", T:"#1a1a1a", G:"#5e7c6f", MID:"#999",
    border:"rgba(94,124,111,0.2)", borderFaint:"rgba(26,26,26,0.06)",
    inputBorder:"rgba(94,124,111,0.25)", inputBg:"#fff",
    serif:"Garamond, Georgia, serif", sans:"Inter, system-ui, sans-serif", dark:false,
  },
  "urban-pulse": {
    BG:"#0f172a", S:"#1e293b", T:"#f8fafc", G:"#f97316", MID:"#64748b",
    border:"rgba(249,115,22,0.2)", borderFaint:"rgba(248,250,252,0.06)",
    inputBorder:"rgba(249,115,22,0.2)", inputBg:"#1e293b",
    serif:"Inter, system-ui, sans-serif", sans:"Inter, system-ui, sans-serif", dark:true,
  },
};

const fmt = (n: number) => "$" + n.toLocaleString("es-AR");

// ── Componente interno (necesita useSearchParams dentro de Suspense) ──────────
function ProductosPageInner() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const slug         = params?.slug as string;
  const tParam       = searchParams?.get("t") ?? null;
  const fromEditor   = searchParams?.get("from") === "editor";

  const [products,   setProducts]   = useState<StorefrontProduct[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [storeName,  setStoreName]  = useState("Tienda");
  const [template,   setTemplate]   = useState(tParam && THEMES[tParam] ? tParam : "fashion-noir");
  const [isOwner,    setIsOwner]    = useState(false);

  const storeIdRef = useRef<string | null>(null);

  type PReview = { id: string; rating: number; comment: string | null; reviewer: string; createdAt: string };
  const [reviews,          setReviews]          = useState<PReview[]>([]);
  const [reviewsLoading,   setReviewsLoading]   = useState(false);
  const [reviewForm,       setReviewForm]       = useState({ reviewer: "", rating: 5, comment: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone,       setReviewDone]       = useState(false);
  const [isMobile,         setIsMobile]         = useState(false);
  const [reelIndex,        setReelIndex]        = useState(0);

  // ── Funciones estables para useCartLogic ──────────────────────────────────
  const resolveVariantId = useCallback((product: StorefrontProduct, sizeValue: string, colorValue: string): string | null => {
    if (!product.variants.length) return null;
    const match = product.variants.find((v: any) => v.value === sizeValue || v.value === colorValue);
    if (!match && product.variants.length === 1) return product.variants[0].id;
    return match?.id ?? product.variants[0]?.id ?? null;
  }, []);

  const validateCoupon = useCallback(async (code: string, subtotal: number) => {
    if (!storeIdRef.current) return { error: "Tienda no disponible" };
    try {
      const res = await fetch("/api/cupones/validar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase(), storeId: storeIdRef.current, subtotal }),
      });
      return res.json();
    } catch { return { error: "Error de conexión" }; }
  }, []);

  const placeOrder = useCallback(async (params: PlaceOrderParams): Promise<{ ok: boolean; error?: string }> => {
    if (!storeIdRef.current) return { ok: false, error: "Tienda no disponible" };
    try {
      const res = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: storeIdRef.current,
          couponId: params.couponId ?? null,
          items: params.cartItems,
          customer: params.customer,
          shippingMethod: params.shippingMethod,
          paymentProvider: params.paymentProvider,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data?.error || "Error al procesar el pedido" };
      return { ok: true };
    } catch { return { ok: false, error: "Error de conexión" }; }
  }, []);

  const cart = useCartLogic({ products, resolveVariantId, validateCoupon, placeOrder });
  const {
    cartItems, cartOpen, setCartOpen, cartCount, cartTotal, envioPrice, couponDiscount, orderTotal,
    modalProduct, setModalProduct, modalImg, setModalImg,
    selectedSize, setSelectedSize, selectedColor, setSelectedColor, qty, setQty,
    checkoutOpen, setCheckoutOpen, checkoutStatus, checkoutError,
    envioId, setEnvioId, pagoId, setPagoId,
    coupon, setCoupon, couponError, appliedCoupon, setAppliedCoupon,
    notas, setNotas, rememberData, setRememberData, buyerForm, setBuyerForm,
    toastMsg, openModal, addToCart, removeFromCart, updateQty,
    openCheckout, handleApplyCoupon, handlePlaceOrder, toggleFavorite, favorites,
  } = cart;

  // ── Carga de datos ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/public/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject("not_found"))
      .then(data => {
        if (!data?.store) { setError("Tienda no encontrada"); return; }
        storeIdRef.current = data.store.id ?? null;
        setIsOwner(data.isOwner ?? false);
        try {
          const cfg = JSON.parse(data.store.storeConfig || "{}");
          if (cfg.template && !tParam) setTemplate(cfg.template);
          if (cfg.storeName) setStoreName(cfg.storeName);
          else if (data.store.name) setStoreName(data.store.name);
        } catch { if (data.store.name) setStoreName(data.store.name); }
        setProducts((data.store.products ?? []).map(mapProduct));
      })
      .catch(() => setError("No se pudo cargar la tienda. Intentá de nuevo."))
      .finally(() => setLoading(false));
  }, [slug]);

  // ── Filtros y ordenamiento ──────────────────────────────────────────────────
  const [search,            setSearch]            = useState("");
  const [activeCategory,    setActiveCategory]    = useState("Todos");
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [hoveredCatMenu,    setHoveredCatMenu]    = useState<string | null>(null);
  const [sortBy,            setSortBy]            = useState("newest");
  const [page,              setPage]              = useState(1);

  const categoryList = useMemo(() => [...new Set(products.map(p => p.category).filter(c => c && c !== "general"))], [products]);
  const CATEGORIES   = useMemo(() => ["Todos", ...categoryList], [categoryList]);

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

  const filtered = useMemo(() => {
    let r = products.filter(p => {
      if (activeCategory !== "Todos" && p.category !== activeCategory) return false;
      if (activeSubcategory && p.subcategory !== activeSubcategory) return false;
      if (search.trim() && !p.name.toLowerCase().includes(search.toLowerCase()) &&
          !(p.subcategory ?? "").toLowerCase().includes(search.toLowerCase()) &&
          !p.category.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    if (sortBy === "price_asc")  r = [...r].sort((a, b) => a.price - b.price);
    if (sortBy === "price_desc") r = [...r].sort((a, b) => b.price - a.price);
    if (sortBy === "name_az")    r = [...r].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "discount")   r = [...r].sort((a, b) => {
      const da = a.comparePrice ? (a.comparePrice - a.price) / a.comparePrice : 0;
      const db = b.comparePrice ? (b.comparePrice - b.price) / b.comparePrice : 0;
      return db - da;
    });
    return r;
  }, [products, activeCategory, activeSubcategory, search, sortBy]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const changeCategory = (cat: string, sub: string | null = null) => {
    setActiveCategory(cat); setActiveSubcategory(sub); setPage(1);
  };

  // ── Stock de la variante seleccionada en el modal ──────────────────────────
  const selectedVariantStock = useMemo(() => {
    if (!modalProduct || !modalProduct.variants.length) return null;
    const match = modalProduct.variants.find((v: any) => {
      try {
        const a = JSON.parse(v.name);
        if (a && typeof a === "object") {
          const vals = Object.values(a).map((x: any) => String(x).toLowerCase());
          const sizeOk  = !selectedSize  || vals.includes(selectedSize.toLowerCase());
          const colorOk = !selectedColor || vals.includes(selectedColor.toLowerCase());
          return sizeOk && colorOk;
        }
      } catch {}
      return v.value.includes(selectedSize) && v.value.includes(selectedColor);
    }) ?? (modalProduct.variants.length === 1 ? modalProduct.variants[0] : null);
    return match?.stock ?? null;
  }, [modalProduct, selectedSize, selectedColor]);

  // ── Al cambiar color: sync imagen + talle disponible ────────────────────────
  useEffect(() => {
    if (!modalProduct || !selectedColor) return;
    const imgIdx = modalProduct.imageItems.findIndex(
      (img: any) => img.variantValue && img.variantValue.toLowerCase() === selectedColor.toLowerCase()
    );
    if (imgIdx !== -1) setModalImg(imgIdx);
    const colorVariants = modalProduct.variants.filter((v: any) => {
      try { const a = JSON.parse(v.name); return typeof a === "object" && Object.values(a).some((x: any) => String(x).toLowerCase() === selectedColor.toLowerCase()); } catch { return false; }
    });
    if (!colorVariants.length) return;
    const best = colorVariants.find((v: any) => v.stock > 0) ?? colorVariants[0];
    try {
      const a = JSON.parse(best.name);
      const sizeKey = Object.keys(a).find(k => SIZE_ATTRS.includes(k.toLowerCase()));
      if (sizeKey && a[sizeKey] && a[sizeKey] !== selectedSize) setSelectedSize(a[sizeKey]);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColor, modalProduct?.id]);

  // ── Al cambiar talle: sync color + imagen si el combo actual no existe ───────
  useEffect(() => {
    if (!modalProduct || !selectedSize) return;
    if (selectedColor) {
      const hasCombo = modalProduct.variants.some((v: any) => {
        try {
          const a = JSON.parse(v.name);
          if (typeof a !== "object") return false;
          const vals = Object.values(a).map((x: any) => String(x).toLowerCase());
          return vals.includes(selectedSize.toLowerCase()) && vals.includes(selectedColor.toLowerCase());
        } catch { return false; }
      });
      if (hasCombo) return;
    }
    const sizeVariants = modalProduct.variants.filter((v: any) => {
      try {
        const a = JSON.parse(v.name);
        if (typeof a !== "object") return false;
        return Object.entries(a).some(([k, val]: any) => SIZE_ATTRS.includes(k.toLowerCase()) && String(val).toLowerCase() === selectedSize.toLowerCase());
      } catch { return false; }
    });
    if (!sizeVariants.length) return;
    const best = sizeVariants.find((v: any) => v.stock > 0) ?? sizeVariants[0];
    try {
      const a = JSON.parse(best.name);
      const colorKey = Object.keys(a).find((k: string) => COLOR_ATTRS.includes(k.toLowerCase()));
      if (colorKey && a[colorKey]) {
        const newColor = String(a[colorKey]);
        if (newColor !== selectedColor) {
          setSelectedColor(newColor);
          const imgIdx = modalProduct.imageItems.findIndex(
            (img: any) => img.variantValue && img.variantValue.toLowerCase() === newColor.toLowerCase()
          );
          if (imgIdx !== -1) setModalImg(imgIdx);
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSize, modalProduct?.id]);

  // ── isMobile ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Cargar reseñas al abrir modal ──────────────────────────────────────────
  useEffect(() => {
    if (!modalProduct || !slug) return;
    setReviews([]);
    setReviewDone(false);
    setReelIndex(0);
    setReviewsLoading(true);
    fetch(`/api/public/${slug}/reviews?productId=${modalProduct.id}`)
      .then(r => r.ok ? r.json() : { reviews: [] })
      .then(d => setReviews(d.reviews ?? []))
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalProduct?.id, slug]);

  // ── Tema activo ─────────────────────────────────────────────────────────────
  const th: Theme = THEMES[template] ?? THEMES["fashion-noir"];
  const { BG, S, T, G, MID, border, borderFaint, inputBorder, inputBg, serif, sans, dark } = th;

  // ── Enviar reseña ──────────────────────────────────────────────────────────
  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalProduct || !slug || !reviewForm.reviewer.trim()) return;
    setReviewSubmitting(true);
    try {
      const res = await fetch(`/api/public/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: modalProduct.id, rating: reviewForm.rating, comment: reviewForm.comment, reviewer: reviewForm.reviewer }),
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(p => [data.review, ...p]);
        setReviewForm({ reviewer: "", rating: 5, comment: "" });
        setReviewDone(true);
      }
    } catch {}
    finally { setReviewSubmitting(false); }
  };

  // ── Colores derivados para fondos semitransparentes ─────────────────────────
  const overlayBg   = dark ? "rgba(10,10,10,0.85)" : "rgba(0,0,0,0.6)";
  const backdropNav = dark ? "rgba(10,10,10,0.97)" : "rgba(249,249,247,0.97)";

  // ── Estados de carga y error ─────────────────────────────────────────────────
  if (loading) return (
    <div style={{ background:BG, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:sans }}>
      <p style={{ color:G, fontSize:12, letterSpacing:4, textTransform:"uppercase" }}>Cargando...</p>
    </div>
  );

  if (error) return (
    <div style={{ background:BG, minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, fontFamily:sans, color:T }}>
      <p style={{ fontSize:18, fontWeight:600 }}>Algo salió mal</p>
      <p style={{ fontSize:13, opacity:0.5 }}>{error}</p>
      <button onClick={() => window.location.reload()} style={{ background:G, color:dark?"#000":"#fff", border:"none", padding:"10px 24px", fontSize:12, fontWeight:700, cursor:"pointer", letterSpacing:2, textTransform:"uppercase" }}>
        Reintentar
      </button>
    </div>
  );

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:BG, color:T, minHeight:"100vh", fontFamily:sans }}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ position:"sticky", top:0, zIndex:100, background:backdropNav, backdropFilter:"blur(12px)", borderBottom:`1px solid ${borderFaint}` }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 32px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          {fromEditor ? (
            <Link href="/dashboard/configuracion"
              style={{ color:T, textDecoration:"none", fontSize:11, letterSpacing:3, textTransform:"uppercase", opacity:0.5, display:"flex", alignItems:"center", gap:8, transition:"opacity 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity="1")}
              onMouseLeave={e => (e.currentTarget.style.opacity="0.5")}>
              ← Volver al editor
            </Link>
          ) : isOwner ? (
            <Link href="/dashboard"
              style={{ color:T, textDecoration:"none", fontSize:11, letterSpacing:3, textTransform:"uppercase", opacity:0.5, display:"flex", alignItems:"center", gap:8, transition:"opacity 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity="1")}
              onMouseLeave={e => (e.currentTarget.style.opacity="0.5")}>
              ← Volver a inicio
            </Link>
          ) : (
            <Link href={`/tienda/${slug}`}
              style={{ color:T, textDecoration:"none", fontSize:11, letterSpacing:3, textTransform:"uppercase", opacity:0.5, display:"flex", alignItems:"center", gap:8, transition:"opacity 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity="1")}
              onMouseLeave={e => (e.currentTarget.style.opacity="0.5")}>
              ← Volver a la tienda
            </Link>
          )}
          <span style={{ fontFamily:serif, fontSize:20, fontWeight:700, letterSpacing:5, color:G }}>{storeName}</span>
          <button onClick={() => setCartOpen(true)} style={{ position:"relative", background:"none", border:`1px solid ${border}`, color:T, width:44, height:44, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"border-color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor=G)}
            onMouseLeave={e => (e.currentTarget.style.borderColor=border)}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            {cartCount > 0 && (
              <span style={{ position:"absolute", top:-6, right:-6, background:G, color:dark?"#000":"#fff", borderRadius:"50%", width:18, height:18, fontSize:10, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{cartCount}</span>
            )}
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1280, margin:"0 auto", padding:"48px 32px" }}>

        {/* ── TÍTULO + BÚSQUEDA ──────────────────────────────────────── */}
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:40, flexWrap:"wrap", gap:16 }}>
          <div>
            <p style={{ fontSize:10, letterSpacing:5, color:G, textTransform:"uppercase", margin:"0 0 12px" }}>Colección completa</p>
            <h1 style={{ fontFamily:serif, fontSize:"clamp(28px,4vw,42px)", margin:"0 0 8px", color:T, lineHeight:1.1 }}>
              {activeCategory === "Todos" ? "Todos los productos" : activeCategory}
              {activeSubcategory && <span style={{ fontStyle:"italic", opacity:0.55 }}> › {activeSubcategory}</span>}
            </h1>
            <p style={{ fontSize:12, opacity:0.35, margin:0, letterSpacing:2 }}>
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
            <div style={{ position:"relative" }}>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Buscar productos..."
                style={{ background:S, border:`1px solid ${border}`, color:T, padding:"11px 16px 11px 40px", fontSize:13, outline:"none", width:230, boxSizing:"border-box" as const }}
                onFocus={e => (e.target.style.borderColor=G)}
                onBlur={e => (e.target.style.borderColor=border)}
              />
              <svg style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", opacity:0.35, pointerEvents:"none" }} width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              {search && (
                <button onClick={() => { setSearch(""); setPage(1); }}
                  style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:MID, cursor:"pointer", fontSize:16, padding:0 }}>×</button>
              )}
            </div>
            <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }}
              style={{ background:S, border:`1px solid ${border}`, color:T, padding:"11px 14px", fontSize:12, outline:"none", cursor:"pointer" }}>
              <option value="newest">Más recientes</option>
              <option value="price_asc">Precio ↑</option>
              <option value="price_desc">Precio ↓</option>
              <option value="name_az">Nombre A→Z</option>
              <option value="discount">Mayor descuento</option>
            </select>
          </div>
        </div>

        {/* ── FILTROS DE CATEGORÍA ───────────────────────────────────── */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:40, borderBottom:`1px solid ${borderFaint}`, paddingBottom:24 }}>
          {CATEGORIES.map(cat => {
            const subcats = cat !== "Todos" ? (subcategoriesFor[cat] || []) : [];
            const isActive = activeCategory === cat;
            return (
              <div key={cat} style={{ position:"relative" }}
                onMouseEnter={() => subcats.length > 0 && setHoveredCatMenu(cat)}
                onMouseLeave={() => setHoveredCatMenu(null)}>
                <button onClick={() => changeCategory(cat)}
                  style={{ background: isActive ? G : "transparent", color: isActive ? (dark?"#000":"#fff") : T, border:`1px solid ${isActive ? G : border}`, padding:"9px 20px", fontSize:11, letterSpacing:2, cursor:"pointer", fontWeight:600, textTransform:"uppercase", transition:"all 0.2s", display:"flex", alignItems:"center", gap:5 }}>
                  {cat}
                  {subcats.length > 0 && <span style={{ opacity:0.55, fontSize:9 }}>▾</span>}
                </button>
                {subcats.length > 0 && hoveredCatMenu === cat && (
                  <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, background:S, border:`1px solid ${border}`, minWidth:180, zIndex:400, padding:"4px 0", boxShadow:"0 8px 24px rgba(0,0,0,0.25)" }}>
                    <button onClick={() => { changeCategory(cat); setHoveredCatMenu(null); }}
                      style={{ display:"block", width:"100%", background:"none", border:"none", color:T, padding:"9px 16px", fontSize:11, textAlign:"left", cursor:"pointer", letterSpacing:1, textTransform:"uppercase" }}>
                      Todos en {cat}
                    </button>
                    <div style={{ borderTop:`1px solid ${borderFaint}`, margin:"2px 0" }}/>
                    {subcats.map(sub => (
                      <button key={sub} onClick={() => { changeCategory(cat, sub); setHoveredCatMenu(null); }}
                        style={{ display:"block", width:"100%", background: activeSubcategory===sub ? `${G}18` : "none", border:"none", color: activeSubcategory===sub ? G : T, padding:"8px 16px 8px 24px", fontSize:11, textAlign:"left", cursor:"pointer", letterSpacing:1, textTransform:"uppercase", opacity: activeSubcategory===sub ? 1 : 0.7 }}>
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

        {/* ── GRILLA ─────────────────────────────────────────────────── */}
        {paginated.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0", opacity:0.4 }}>
            <p style={{ fontFamily:serif, fontSize:22, marginBottom:8 }}>Sin resultados</p>
            <p style={{ fontSize:13 }}>Probá con otra búsqueda o categoría</p>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:24, marginBottom:56 }}>
            {paginated.map(product => {
              const isFav = favorites.includes(product.id);
              return (
                <div key={product.id} style={{ cursor:"pointer" }} onClick={() => openModal(product)}>
                  <div style={{ position:"relative", aspectRatio:"3/4", overflow:"hidden", background:S, marginBottom:14 }}>
                    {product.images[0] ? (
                      <img src={product.images[0]} alt={product.name}
                        style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform 0.5s ease" }}
                        onMouseEnter={e => (e.currentTarget.style.transform="scale(1.05)")}
                        onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}
                        onError={e => { e.currentTarget.style.opacity="0"; }}/>
                    ) : (
                      <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", opacity:0.15 }}>
                        <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={0.8}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      </div>
                    )}
                    {product.comparePrice && (
                      <div style={{ position:"absolute", top:10, left:10, background:G, color:dark?"#000":"#fff", fontSize:9, fontWeight:800, letterSpacing:2, padding:"3px 8px", textTransform:"uppercase" }}>Oferta</div>
                    )}
                    {(product.subcategory || product.category !== "general") && (
                      <div style={{ position:"absolute", top:10, right:10, background: dark ? "rgba(10,10,10,0.7)" : "rgba(255,255,255,0.85)", color:T, fontSize:9, letterSpacing:2, padding:"3px 8px", textTransform:"uppercase" }}>
                        {product.subcategory ?? product.category}
                      </div>
                    )}
                    {/* Botón favorito */}
                    <button onClick={e => { e.stopPropagation(); toggleFavorite(product.id); }}
                      style={{ position:"absolute", bottom:10, right:10, background: dark ? "rgba(10,10,10,0.65)" : "rgba(255,255,255,0.9)", border:"none", borderRadius:"50%", width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"transform 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.transform="scale(1.1)")}
                      onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill={isFav ? G : "none"} stroke={isFav ? G : MID} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </button>
                    {/* Overlay "Ver detalle" */}
                    <div className="product-overlay" style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.3)", display:"flex", alignItems:"center", justifyContent:"center", opacity:0, transition:"opacity 0.3s" }}
                      onMouseEnter={e => (e.currentTarget.style.opacity="1")}
                      onMouseLeave={e => (e.currentTarget.style.opacity="0")}>
                      <span style={{ background:G, color:dark?"#000":"#fff", fontSize:10, fontWeight:800, letterSpacing:3, padding:"9px 20px", textTransform:"uppercase" }}>Ver detalle</span>
                    </div>
                  </div>
                  <p style={{ fontSize:10, color:MID, letterSpacing:2, textTransform:"uppercase", margin:"0 0 4px" }}>{product.category}</p>
                  <p style={{ fontSize:15, color:T, margin:"0 0 7px", fontWeight:500, lineHeight:1.3 }}>{product.name}</p>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ fontSize:16, fontWeight:700, color:G }}>{fmt(product.price)}</span>
                    {product.comparePrice && <span style={{ fontSize:12, color:MID, textDecoration:"line-through" }}>{fmt(product.comparePrice)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── PAGINACIÓN ─────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div style={{ display:"flex", gap:8, justifyContent:"center", alignItems:"center", flexWrap:"wrap" }}>
            <button onClick={() => { setPage(p => Math.max(1,p-1)); window.scrollTo({top:0,behavior:"smooth"}); }}
              disabled={page===1}
              style={{ background:"transparent", color: page===1?MID:T, border:`1px solid ${page===1?borderFaint:border}`, padding:"10px 22px", fontSize:11, letterSpacing:2, cursor: page===1?"default":"pointer", textTransform:"uppercase" }}>
              ← Anterior
            </button>
            {Array.from({length:totalPages},(_,i)=>i+1).map(n => {
              if (n!==1 && n!==totalPages && Math.abs(n-page)>2) return null;
              return (
                <button key={n} onClick={() => { setPage(n); window.scrollTo({top:0,behavior:"smooth"}); }}
                  style={{ background: page===n?G:"transparent", color: page===n?(dark?"#000":"#fff"):T, border:`1px solid ${page===n?G:border}`, width:40, height:40, fontSize:13, fontWeight:700, cursor:"pointer", transition:"all 0.2s" }}>
                  {n}
                </button>
              );
            })}
            <button onClick={() => { setPage(p => Math.min(totalPages,p+1)); window.scrollTo({top:0,behavior:"smooth"}); }}
              disabled={page===totalPages}
              style={{ background:"transparent", color: page===totalPages?MID:T, border:`1px solid ${page===totalPages?borderFaint:border}`, padding:"10px 22px", fontSize:11, letterSpacing:2, cursor: page===totalPages?"default":"pointer", textTransform:"uppercase" }}>
              Siguiente →
            </button>
          </div>
        )}

      </div>

      {/* ── MODAL PRODUCTO ─────────────────────────────────────────────── */}
      {modalProduct && (
        <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setModalProduct(null)}>
          <div style={{ position:"absolute", inset:0, background:overlayBg, backdropFilter:"blur(8px)" }}/>
          <div style={{ position:"relative", background:S, maxWidth:920, width:"calc(100% - 32px)", maxHeight:"92vh", overflow:"auto", display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }} onClick={e => e.stopPropagation()}>
            {/* Galería */}
            <div style={{ position:"relative" }}>
              <img src={modalProduct.images[modalImg] ?? ""} alt={modalProduct.name}
                style={{ width:"100%", aspectRatio:"3/4", objectFit:"cover", display:"block" }}
                onError={e => { e.currentTarget.style.opacity="0"; }}/>
              {modalProduct.images.length > 1 && (<>
                <button onClick={() => setModalImg(i => (i-1+modalProduct.images.length)%modalProduct.images.length)}
                  style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", background:"rgba(0,0,0,0.45)", border:"none", color:"#fff", width:34, height:34, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, borderRadius:2 }}>‹</button>
                <button onClick={() => setModalImg(i => (i+1)%modalProduct.images.length)}
                  style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"rgba(0,0,0,0.45)", border:"none", color:"#fff", width:34, height:34, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, borderRadius:2 }}>›</button>
                <div style={{ position:"absolute", bottom:8, right:8, background:"rgba(0,0,0,0.5)", color:"#fff", fontSize:10, letterSpacing:1, padding:"3px 8px", borderRadius:2 }}>
                  {modalImg+1} / {modalProduct.images.length}
                </div>
              </>)}
              {modalProduct.images.length > 1 && (
                <div style={{ display:"flex", gap:6, padding:"8px 12px", background:BG, overflowX:"auto" }}>
                  {modalProduct.images.map((img, i) => (
                    <button key={i} onClick={() => setModalImg(i)}
                      style={{ width:48, height:48, flexShrink:0, padding:2, border: i===modalImg ? `2px solid ${G}` : "2px solid transparent", background:"none", cursor:"pointer" }}>
                      <img src={img} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Detalle */}
            <div style={{ padding:"36px 32px", display:"flex", flexDirection:"column", gap:18, overflowY:"auto" }}>
              <button onClick={() => setModalProduct(null)}
                style={{ alignSelf:"flex-end", background:"none", border:`1px solid ${border}`, color:T, width:32, height:32, cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
              <div>
                <p style={{ fontSize:10, letterSpacing:3, color:G, textTransform:"uppercase", marginBottom:6 }}>
                  {modalProduct.category}{modalProduct.subcategory && <span style={{ opacity:0.6 }}> › {modalProduct.subcategory}</span>}
                </p>
                <h2 style={{ fontFamily:serif, fontSize:24, margin:0, lineHeight:1.2, color:T }}>{modalProduct.name}</h2>
              </div>
              <div style={{ display:"flex", gap:10, alignItems:"baseline" }}>
                <span style={{ fontSize:22, fontWeight:700, color:G }}>{fmt(modalProduct.price)}</span>
                {modalProduct.comparePrice && <span style={{ fontSize:14, color:MID, textDecoration:"line-through" }}>{fmt(modalProduct.comparePrice)}</span>}
              </div>
              {modalProduct.description && (
                <p style={{ fontSize:13, opacity:0.55, lineHeight:1.75, borderTop:`1px solid ${borderFaint}`, paddingTop:14, margin:0 }}>{modalProduct.description}</p>
              )}

              {modalProduct.colors.length > 0 && (
                <div>
                  <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", marginBottom:8, opacity:0.55 }}>Color: <strong style={{ color:T }}>{selectedColor}</strong></p>
                  <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                    {modalProduct.colors.map(color => (
                      <button key={color} onClick={() => setSelectedColor(color)}
                        style={{ padding:"6px 14px", fontSize:11, border: selectedColor===color ? `1px solid ${G}` : `1px solid ${border}`, background: selectedColor===color ? `${G}20` : "transparent", color:T, cursor:"pointer", transition:"all 0.2s" }}>
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {modalProduct.sizes.length > 0 && (
                <div>
                  <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", marginBottom:8, opacity:0.55 }}>Talle: <strong style={{ color:T }}>{selectedSize}</strong></p>
                  <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                    {modalProduct.sizes.map(size => (
                      <button key={size} onClick={() => setSelectedSize(size)}
                        style={{ width:44, height:44, fontSize:12, fontWeight:600, border: selectedSize===size ? `1px solid ${G}` : `1px solid ${border}`, background: selectedSize===size ? `${G}20` : "transparent", color:T, cursor:"pointer", transition:"all 0.2s" }}>
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", opacity:0.55, margin:0 }}>Cantidad</p>
                <div style={{ display:"flex", alignItems:"center", border:`1px solid ${border}` }}>
                  <button onClick={() => setQty(q => Math.max(1,q-1))} style={{ width:36, height:36, background:"none", border:"none", color:T, fontSize:18, cursor:"pointer" }}>−</button>
                  <span style={{ width:36, textAlign:"center", fontSize:14, color:T }}>{qty}</span>
                  <button onClick={() => setQty(q => q+1)} style={{ width:36, height:36, background:"none", border:"none", color:T, fontSize:18, cursor:"pointer" }}>+</button>
                </div>
              </div>

              {selectedVariantStock !== null && selectedVariantStock === 0 && (
                <p style={{ fontSize:12, color:"#f87171", fontWeight:600, margin:0 }}>Sin stock en esta combinación</p>
              )}
              {selectedVariantStock !== null && selectedVariantStock > 0 && selectedVariantStock <= 5 && (
                <p style={{ fontSize:12, color:"#fb923c", fontWeight:600, margin:0 }}>¡Últimas {selectedVariantStock} unidades!</p>
              )}

              <button onClick={addToCart}
                disabled={selectedVariantStock === 0}
                style={{ background: selectedVariantStock === 0 ? `${G}40` : G, color:dark?"#000":"#fff", border:"none", padding:"15px", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor: selectedVariantStock === 0 ? "not-allowed" : "pointer", marginTop:"auto" }}>
                {selectedVariantStock === 0 ? "Sin stock" : `Agregar al carrito · ${fmt(modalProduct.price * qty)}`}
              </button>

              {/* ── Reels / Videos — carrusel vertical 9:16 */}
              {modalProduct.reelUrls.length > 0 && (
                <div style={{ borderTop:`1px solid ${borderFaint}`, paddingTop:14, marginTop:4 }}>
                  <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", marginBottom:10, opacity:0.5 }}>Videos del producto</p>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
                    {(() => {
                      const url = modalProduct.reelUrls[reelIndex];
                      if (/\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url)) {
                        return <video controls style={{ width:160, aspectRatio:"9/16", objectFit:"cover", background:"#000", borderRadius:8 }}><source src={url} /></video>;
                      }
                      let embedUrl = "";
                      if (url.includes("youtube.com/shorts/")) { const id = url.split("shorts/")[1]?.split("?")[0]; embedUrl = `https://www.youtube.com/embed/${id}`; }
                      else if (url.includes("youtu.be/")) { const id = url.split("youtu.be/")[1]?.split("?")[0]; embedUrl = `https://www.youtube.com/embed/${id}`; }
                      else if (url.includes("youtube.com/watch")) { try { const id = new URL(url).searchParams.get("v"); if (id) embedUrl = `https://www.youtube.com/embed/${id}`; } catch {} }
                      if (embedUrl) return <iframe src={embedUrl} allow="autoplay; encrypted-media" allowFullScreen style={{ width:160, aspectRatio:"9/16", border:"none", borderRadius:8 }} />;
                      const platform = url.includes("instagram") ? "Instagram Reel" : url.includes("tiktok") ? "TikTok" : "Video";
                      return (
                        <a href={url} target="_blank" rel="noopener noreferrer"
                          style={{ width:160, aspectRatio:"9/16", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, border:`1px solid ${border}`, textDecoration:"none", color:T, borderRadius:8, background:S }}>
                          <svg width={24} height={24} viewBox="0 0 24 24" fill={G} stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          <span style={{ fontSize:11 }}>{platform}</span>
                        </a>
                      );
                    })()}
                    {modalProduct.reelUrls.length > 1 && (
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <button onClick={() => setReelIndex(i => (i - 1 + modalProduct.reelUrls.length) % modalProduct.reelUrls.length)}
                          style={{ background:"none", border:`1px solid ${border}`, color:T, width:30, height:30, borderRadius:"50%", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
                        <div style={{ display:"flex", gap:5 }}>
                          {modalProduct.reelUrls.map((_, i) => (
                            <button key={i} onClick={() => setReelIndex(i)}
                              style={{ width:6, height:6, borderRadius:"50%", background: i === reelIndex ? G : `${T}30`, border:"none", cursor:"pointer", padding:0 }} />
                          ))}
                        </div>
                        <button onClick={() => setReelIndex(i => (i + 1) % modalProduct.reelUrls.length)}
                          style={{ background:"none", border:`1px solid ${border}`, color:T, width:30, height:30, borderRadius:"50%", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Reseñas */}
              <div style={{ borderTop:`1px solid ${borderFaint}`, paddingTop:20, marginTop:8 }}>
                <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", opacity:0.5, margin:"0 0 16px" }}>
                  Reseñas{reviews.length > 0 && ` (${reviews.length})`}
                </p>
                {reviewsLoading ? (
                  <p style={{ fontSize:12, opacity:0.4 }}>Cargando...</p>
                ) : reviews.length > 0 ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:20 }}>
                    {reviews.map(r => (
                      <div key={r.id} style={{ borderBottom:`1px solid ${borderFaint}`, paddingBottom:14 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontSize:12, fontWeight:600, color:T }}>{r.reviewer}</span>
                          <span style={{ fontSize:13, color:G }}>{[1,2,3,4,5].map(s => s <= r.rating ? "★" : "☆").join("")}</span>
                        </div>
                        {r.comment && <p style={{ fontSize:12, opacity:0.6, margin:0, lineHeight:1.6 }}>{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize:12, opacity:0.35, marginBottom:16 }}>Sé el primero en dejar una reseña.</p>
                )}
                {isOwner ? (
                  <p style={{ fontSize:11, opacity:0.4, fontStyle:"italic" }}>El dueño no puede dejar reseñas en su propia tienda.</p>
                ) : reviewDone ? (
                  <p style={{ fontSize:12, color:G, fontWeight:600 }}>¡Gracias por tu reseña!</p>
                ) : (
                  <form onSubmit={submitReview} style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <input value={reviewForm.reviewer} onChange={e => setReviewForm(p => ({ ...p, reviewer: e.target.value }))}
                      placeholder="Tu nombre" required
                      style={{ background:inputBg, border:`1px solid ${inputBorder}`, color:T, padding:"9px 12px", fontSize:12, outline:"none" }}
                      onFocus={e => (e.target.style.borderColor=G)} onBlur={e => (e.target.style.borderColor=inputBorder)} />
                    <div style={{ display:"flex", gap:4 }}>
                      {[1,2,3,4,5].map(s => (
                        <button key={s} type="button" onClick={() => setReviewForm(p => ({ ...p, rating: s }))}
                          style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color: s <= reviewForm.rating ? G : `${T}30`, padding:"2px" }}>★</button>
                      ))}
                    </div>
                    <textarea value={reviewForm.comment} onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
                      placeholder="Comentario (opcional)" rows={3}
                      style={{ background:inputBg, border:`1px solid ${inputBorder}`, color:T, padding:"9px 12px", fontSize:12, resize:"none", outline:"none", fontFamily:sans }}
                      onFocus={e => (e.target.style.borderColor=G)} onBlur={e => (e.target.style.borderColor=inputBorder)} />
                    <button type="submit" disabled={reviewSubmitting || !reviewForm.reviewer.trim()}
                      style={{ background: reviewSubmitting || !reviewForm.reviewer.trim() ? `${G}40` : G, color:dark?"#000":"#fff", border:"none", padding:"12px", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor: reviewSubmitting || !reviewForm.reviewer.trim() ? "not-allowed" : "pointer" }}>
                      {reviewSubmitting ? "Enviando..." : "Publicar reseña"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CARRITO ────────────────────────────────────────────────────── */}
      <div style={{ position:"fixed", inset:0, zIndex:150, pointerEvents: cartOpen ? "auto" : "none" }}>
        <div onClick={() => setCartOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.55)", opacity: cartOpen?1:0, transition:"opacity 0.3s" }}/>
        <div style={{ position:"absolute", top:0, right:0, bottom:0, width:420, maxWidth:"100vw", background:S, transform: cartOpen?"translateX(0)":"translateX(100%)", transition:"transform 0.35s cubic-bezier(.4,0,.2,1)", display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"22px 22px 14px", borderBottom:`1px solid ${borderFaint}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <p style={{ fontFamily:serif, fontSize:18, margin:0, color:T }}>Tu carrito <span style={{ fontSize:13, color:MID }}>({cartCount})</span></p>
            <button onClick={() => setCartOpen(false)} style={{ background:"none", border:"none", color:T, fontSize:24, cursor:"pointer", lineHeight:1 }}>×</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"14px 22px" }}>
            {cartItems.length === 0
              ? <div style={{ textAlign:"center", padding:"60px 0", opacity:0.35 }}>
                  <p style={{ fontSize:34, marginBottom:10 }}>🛍️</p>
                  <p style={{ fontSize:13, lineHeight:1.8, color:T }}>Tu carrito está vacío.<br/>Explorá la colección.</p>
                </div>
              : cartItems.map((item, idx) => (
                <div key={idx} style={{ display:"flex", gap:12, padding:"14px 0", borderBottom:`1px solid ${borderFaint}` }}>
                  {item.product.images[0] && <img src={item.product.images[0]} alt="" style={{ width:66, height:88, objectFit:"cover", flexShrink:0 }}/>}
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:14, margin:"0 0 2px", fontWeight:500, color:T }}>{item.product.name}</p>
                    <p style={{ fontSize:11, opacity:0.45, margin:"0 0 8px" }}>{[item.color, item.size && `Talle ${item.size}`].filter(Boolean).join(" · ")}</p>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ display:"flex", alignItems:"center", border:`1px solid ${border}` }}>
                        <button onClick={() => updateQty(idx,-1)} style={{ width:26, height:26, background:"none", border:"none", color:T, cursor:"pointer", fontSize:15 }}>−</button>
                        <span style={{ width:22, textAlign:"center", fontSize:12, color:T }}>{item.qty}</span>
                        <button onClick={() => updateQty(idx,1)} style={{ width:26, height:26, background:"none", border:"none", color:T, cursor:"pointer", fontSize:15 }}>+</button>
                      </div>
                      <span style={{ color:G, fontWeight:700, fontSize:14 }}>{fmt(item.product.price * item.qty)}</span>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(idx)} style={{ background:"none", border:"none", color:MID, cursor:"pointer", fontSize:18, alignSelf:"flex-start", transition:"color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color=T)}
                    onMouseLeave={e => (e.currentTarget.style.color=MID)}>×</button>
                </div>
              ))
            }
          </div>
          {cartItems.length > 0 && (
            <div style={{ padding:"14px 22px 28px", borderTop:`1px solid ${borderFaint}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
                <span style={{ fontSize:13, opacity:0.6, color:T }}>Total</span>
                <span style={{ fontSize:20, fontWeight:700, color:G }}>{fmt(cartTotal)}</span>
              </div>
              <button onClick={isOwner ? undefined : openCheckout} disabled={isOwner} title={isOwner ? "No podés comprar en tu propia tienda" : undefined}
                style={{ width:"100%", background: isOwner ? "rgba(128,128,128,0.15)" : G, color: isOwner ? "rgba(128,128,128,0.5)" : dark?"#000":"#fff", border:"none", padding:"15px", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor: isOwner ? "not-allowed" : "pointer", marginBottom:10 }}>
                {isOwner ? "No disponible para el dueño" : "Finalizar compra"}
              </button>
              <button onClick={() => setCartOpen(false)}
                style={{ width:"100%", background:"transparent", color:T, border:`1px solid ${border}`, padding:"11px", fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer" }}>
                Seguir comprando
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── CHECKOUT ───────────────────────────────────────────────────── */}
      {checkoutOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:300, display:"flex", alignItems:"flex-start", justifyContent:"flex-end" }}>
          <div onClick={() => setCheckoutOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(6px)" }}/>
          <div style={{ position:"relative", width:480, maxWidth:"100vw", height:"100vh", background:dark?"#0e0e0e":BG, display:"flex", flexDirection:"column", overflowY:"auto", borderLeft:`1px solid ${border}` }}>
            <div style={{ padding:"22px 26px 14px", borderBottom:`1px solid ${borderFaint}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
              <p style={{ fontFamily:serif, fontSize:20, margin:0, color:T }}>Checkout</p>
              <button onClick={() => setCheckoutOpen(false)} style={{ background:"none", border:"none", color:T, fontSize:24, cursor:"pointer", lineHeight:1 }}>×</button>
            </div>

            {checkoutStatus === "done" ? (
              <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:48, textAlign:"center" }}>
                <div style={{ width:60, height:60, borderRadius:"50%", border:`2px solid ${G}`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:22 }}>
                  <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p style={{ fontFamily:serif, fontSize:22, color:T, marginBottom:10 }}>¡Pedido recibido!</p>
                <p style={{ fontSize:13, opacity:0.5, lineHeight:1.8, marginBottom:28 }}>Te contactamos a la brevedad para confirmar el envío o retiro.</p>
                <button onClick={() => { setCheckoutOpen(false); }}
                  style={{ background:G, color:dark?"#000":"#fff", border:"none", padding:"13px 32px", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor:"pointer" }}>
                  Seguir comprando
                </button>
              </div>
            ) : (
              <form onSubmit={handlePlaceOrder} style={{ flex:1, display:"flex", flexDirection:"column" }}>
                <div style={{ flex:1, overflowY:"auto", padding:"22px 26px" }}>
                  {/* Resumen */}
                  <div style={{ marginBottom:24 }}>
                    {cartItems.map((item, idx) => (
                      <div key={idx} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:`1px solid ${borderFaint}` }}>
                        {item.product.images[0] && <img src={item.product.images[0]} alt="" style={{ width:52, height:70, objectFit:"cover", flexShrink:0 }}/>}
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:13, margin:"0 0 2px", fontWeight:500, color:T }}>{item.product.name}</p>
                          <p style={{ fontSize:11, opacity:0.4, margin:"0 0 4px" }}>{[item.color, item.size && `Talle ${item.size}`].filter(Boolean).join(" · ")}</p>
                          <p style={{ fontSize:13, color:G, fontWeight:700, margin:0 }}>{fmt(item.product.price)} × {item.qty}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Datos comprador */}
                  <p style={{ fontSize:12, fontWeight:700, color:T, marginBottom:12, letterSpacing:1, textTransform:"uppercase" }}>Tus datos</p>
                  {([ ["nombre","Nombre y apellido","text"], ["email","Email","email"], ["telefono","Teléfono","tel"], ["direccion","Dirección","text"] ] as const).map(([field, ph, type]) => (
                    <input key={field} required type={type} placeholder={ph}
                      value={buyerForm[field]} onChange={e => setBuyerForm((f: typeof buyerForm) => ({...f, [field]:e.target.value}))}
                      style={{ display:"block", width:"100%", marginBottom:8, background:inputBg, border:`1px solid ${inputBorder}`, color:T, padding:"10px 13px", fontSize:13, outline:"none", boxSizing:"border-box" as const }}
                      onFocus={e => (e.target.style.borderColor=G)} onBlur={e => (e.target.style.borderColor=inputBorder)}/>
                  ))}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                    {([ ["ciudad","Ciudad"], ["provincia","Provincia"] ] as const).map(([field, ph]) => (
                      <input key={field} required placeholder={ph}
                        value={buyerForm[field]} onChange={e => setBuyerForm((f: typeof buyerForm) => ({...f, [field]:e.target.value}))}
                        style={{ background:inputBg, border:`1px solid ${inputBorder}`, color:T, padding:"10px 13px", fontSize:13, outline:"none", boxSizing:"border-box" as const }}
                        onFocus={e => (e.target.style.borderColor=G)} onBlur={e => (e.target.style.borderColor=inputBorder)}/>
                    ))}
                  </div>
                  <input placeholder="Código postal" value={buyerForm.cp} onChange={e => setBuyerForm((f: typeof buyerForm) => ({...f, cp:e.target.value}))}
                    style={{ display:"block", width:"100%", marginBottom:8, background:inputBg, border:`1px solid ${inputBorder}`, color:T, padding:"10px 13px", fontSize:13, outline:"none", boxSizing:"border-box" as const }}
                    onFocus={e => (e.target.style.borderColor=G)} onBlur={e => (e.target.style.borderColor=inputBorder)}/>
                  <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, opacity:0.5, cursor:"pointer", marginBottom:24 }}>
                    <input type="checkbox" checked={rememberData} onChange={e => setRememberData(e.target.checked)} style={{ accentColor:G }}/>
                    Recordar mis datos
                  </label>

                  {/* Envío */}
                  <p style={{ fontSize:12, fontWeight:700, color:T, marginBottom:10, letterSpacing:1, textTransform:"uppercase" }}>Envío</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:22 }}>
                    {ENVIO_OPTIONS.map(opt => (
                      <label key={opt.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 14px", border:`1px solid ${envioId===opt.id ? G : border}`, cursor:"pointer" }}>
                        <span style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <input type="radio" name="envio" value={opt.id} checked={envioId===opt.id} onChange={() => setEnvioId(opt.id)} style={{ accentColor:G }}/>
                          <span style={{ fontSize:13, color:T }}>{opt.label}</span>
                        </span>
                        <span style={{ fontSize:13, fontWeight:700, color: opt.price===0?G:T }}>{opt.price===0?"Gratis":fmt(opt.price)}</span>
                      </label>
                    ))}
                  </div>

                  {/* Pago */}
                  <p style={{ fontSize:12, fontWeight:700, color:T, marginBottom:10, letterSpacing:1, textTransform:"uppercase" }}>Pago</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:22 }}>
                    {PAGO_OPTIONS.map(opt => (
                      <label key={opt.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", border:`1px solid ${pagoId===opt.id ? G : border}`, cursor:"pointer" }}>
                        <input type="radio" name="pago" value={opt.id} checked={pagoId===opt.id} onChange={() => setPagoId(opt.id)} style={{ accentColor:G }}/>
                        <span style={{ fontSize:13, color:T }}>{opt.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Notas */}
                  <textarea placeholder="Notas para la tienda (opcional)" rows={3} value={notas} onChange={e => setNotas(e.target.value)}
                    style={{ display:"block", width:"100%", marginBottom:18, background:inputBg, border:`1px solid ${inputBorder}`, color:T, padding:"10px 13px", fontSize:13, outline:"none", resize:"vertical", fontFamily:sans, boxSizing:"border-box" as const }}
                    onFocus={e => (e.target.style.borderColor=G)} onBlur={e => (e.target.style.borderColor=inputBorder)}/>

                  {/* Cupón */}
                  <div style={{ display:"flex", marginBottom:6 }}>
                    <input placeholder="CÓDIGO DE CUPÓN" value={coupon} onChange={e => setCoupon(e.target.value)}
                      style={{ flex:1, background:inputBg, border:`1px solid ${inputBorder}`, borderRight:"none", color:T, padding:"10px 13px", fontSize:11, letterSpacing:2, outline:"none" }}
                      onFocus={e => (e.target.style.borderColor=G)} onBlur={e => (e.target.style.borderColor=inputBorder)}/>
                    <button type="button" onClick={handleApplyCoupon}
                      style={{ background:"transparent", border:`1px solid ${inputBorder}`, color:G, padding:"10px 16px", fontSize:11, letterSpacing:2, cursor:"pointer" }}>Aplicar</button>
                  </div>
                  {couponError && <p style={{ fontSize:11, color:"#f87171", marginBottom:8 }}>{couponError}</p>}
                  {appliedCoupon && (
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, padding:"8px 12px", background:`${G}15`, border:`1px solid ${G}40` }}>
                      <span style={{ fontSize:12, color:G }}>Cupón {appliedCoupon.code} aplicado</span>
                      <button type="button" onClick={() => setAppliedCoupon(null)} style={{ background:"none", border:"none", color:MID, cursor:"pointer" }}>✕</button>
                    </div>
                  )}

                  {/* Totales */}
                  <div style={{ borderTop:`1px solid ${borderFaint}`, paddingTop:18, marginTop:18 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontSize:13, opacity:0.55, color:T }}>Subtotal</span>
                      <span style={{ fontSize:13, opacity:0.55, color:T }}>{fmt(cartTotal)}</span>
                    </div>
                    {couponDiscount > 0 && (
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                        <span style={{ fontSize:13, color:G }}>Descuento</span>
                        <span style={{ fontSize:13, color:G }}>-{fmt(couponDiscount)}</span>
                      </div>
                    )}
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                      <span style={{ fontSize:13, opacity:0.55, color:T }}>Envío</span>
                      <span style={{ fontSize:13, opacity:0.55, color:T }}>{envioPrice===0?"Gratis":fmt(envioPrice)}</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ fontSize:15, fontWeight:700, color:T }}>Total</span>
                      <span style={{ fontSize:20, fontWeight:800, color:G }}>{fmt(orderTotal)}</span>
                    </div>
                  </div>
                  {checkoutError && <p style={{ fontSize:12, color:"#f87171", marginTop:10 }}>{checkoutError}</p>}
                </div>

                <div style={{ padding:"14px 26px 26px", borderTop:`1px solid ${borderFaint}`, flexShrink:0 }}>
                  <button type="submit" disabled={checkoutStatus==="placing"}
                    style={{ width:"100%", background:G, color:dark?"#000":"#fff", border:"none", padding:"15px", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", opacity:checkoutStatus==="placing"?0.7:1 }}>
                    {checkoutStatus==="placing" ? "Procesando..." : "Crear pedido"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── TOAST ──────────────────────────────────────────────────────── */}
      {toastMsg && (
        <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", background:G, color:dark?"#000":"#fff", padding:"12px 24px", fontSize:13, fontWeight:700, zIndex:500, boxShadow:"0 4px 20px rgba(0,0,0,0.3)", whiteSpace:"nowrap" }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}

export default function ProductosPage() {
  return (
    <Suspense>
      <ProductosPageInner />
    </Suspense>
  );
}
