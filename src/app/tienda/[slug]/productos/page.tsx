"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef, useCallback, Suspense, Fragment } from "react";
import Link from "next/link";
import { useCartLogic } from "@/hooks/useCartLogic";
import type { StorefrontProduct, StorefrontVariant, PlaceOrderParams } from "@/hooks/useStorefront";
import { getDemoPool, fillTargetFor } from "@/hooks/useStorefront";
import { ENVIO_OPTIONS, PAGO_OPTIONS } from "@/components/store/shared/cartTypes";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import { getContrastColor, getReadableAccentText } from "@/contexts/EditContext";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import { promoModalText } from "@/lib/promoLabel";
import { OfferBadge } from "@/components/store/OfferBadge";
import { discountPercent } from "@/lib/discount";
import { resolveVariantPrice } from "@/lib/variantPrice";

const SOCIAL_NETWORKS: ["instagram"|"facebook"|"tiktok"|"youtube"|"pinterest", string][] = [
  ["instagram", "Instagram"], ["facebook", "Facebook"], ["tiktok", "TikTok"], ["youtube", "YouTube"], ["pinterest", "Pinterest"],
];
function SocialIcon({ network }: { network: string }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (network) {
    case "instagram":
      return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>;
    case "facebook":
      return <svg {...common}><path d="M16 3h-2a5 5 0 0 0-5 5v3H6v4h3v8h4v-8h3l1-4h-4V8a1 1 0 0 1 1-1h3z"/></svg>;
    case "tiktok":
      return <svg {...common}><path d="M9 12a4 4 0 1 0 4 4V3a5 5 0 0 0 5 5"/></svg>;
    case "youtube":
      return <svg {...common}><rect x="2" y="5" width="20" height="14" rx="4"/><polygon points="10 9 16 12 10 15" fill="currentColor" stroke="none"/></svg>;
    case "pinterest":
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M9 18l2-7"/><path d="M8 11a4 4 0 1 1 7 2c-1 1.5-3 1-3-1"/></svg>;
    default:
      return null;
  }
}

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

/* ── Ícono de carrito — mismas variantes que se eligen en el editor ── */
const CART_ICON_OPTIONS: React.ReactNode[] = [
  <Fragment key="bag"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></Fragment>,
  <Fragment key="cart"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></Fragment>,
  <Fragment key="basket"><path d="M5 11 2 7h20l-3 4"/><path d="M4 11h16l-1.7 8.5a2 2 0 0 1-2 1.5H7.7a2 2 0 0 1-2-1.5L4 11Z"/><path d="M9 11V8a3 3 0 0 1 6 0v3"/></Fragment>,
];

type RawProduct = {
  id: string;
  name: string;
  price: number;
  comparePrice?: number | null;
  featured?: boolean;
  viewCount?: number;
  precioMayorista?: number | null;
  cantMinMayorista?: number | null;
  preciosEscalonados?: string;
  soloMayorista?: boolean;
  promoQtyMin?: number | null;
  promoQtyDiscount?: number | null;
  category?: string;
  subcategory?: string;
  gender?: string;
  description?: string | null;
  images?: string;
  reelUrls?: string;
  variants?: StorefrontVariant[];
  attributes?: string;
  promoType?: string | null;
  promoPayQty?: number | null;
  offerBadge?: string | null;
  offerNote?: string | null;
  offerEndsAt?: string | null;
};

function mapProduct(raw: RawProduct): StorefrontProduct {
  const variants = raw.variants ?? [];
  const sizesSet  = new Set<string>();
  const colorsSet = new Set<string>();
  variants.forEach((v) => {
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
      .map((img: string | { url?: string; variantValue?: string }) => typeof img === "string" ? { url: img } : { url: img?.url ?? "", variantValue: img?.variantValue })
      .filter((x: { url: string }) => x.url);
    images = imageItems.map((x) => x.url);
  } catch {}
  let reelUrls: string[] = [];
  try {
    const parsed = JSON.parse(raw.reelUrls || "[]");
    reelUrls = Array.isArray(parsed) ? parsed.filter((u: unknown) => typeof u === "string") : [];
  } catch {}
  let attributes: { key: string; value: string }[] = [];
  try {
    const parsed = JSON.parse(raw.attributes || "[]");
    attributes = Array.isArray(parsed) ? parsed.filter((a: unknown) => a && typeof a === "object") : [];
  } catch {}
  const offerActive = !raw.offerEndsAt || new Date(raw.offerEndsAt) > new Date();
  return {
    id: raw.id, name: raw.name, price: raw.price,
    comparePrice: offerActive ? (raw.comparePrice ?? null) : null,
    featured: raw.featured ?? false,
    viewCount: raw.viewCount ?? 0,
    precioMayorista: raw.precioMayorista ?? null,
    cantMinMayorista: raw.cantMinMayorista ?? null,
    preciosEscalonados: (() => { try { const p = JSON.parse(raw.preciosEscalonados || "[]"); return Array.isArray(p) ? p : []; } catch { return []; } })(),
    soloMayorista: raw.soloMayorista ?? false,
    promoQtyMin: raw.promoQtyMin ?? null,
    promoQtyDiscount: raw.promoQtyDiscount ?? null,
    promoType: raw.promoType ?? "PERCENT",
    promoPayQty: raw.promoPayQty ?? null,
    offerBadge: offerActive ? (raw.offerBadge ?? null) : null,
    offerNote: offerActive ? (raw.offerNote ?? null) : null,
    category: raw.category ?? "general",
    subcategory: raw.subcategory ?? undefined,
    gender: raw.gender ?? "unisex",
    description: raw.description ?? null,
    images, imageItems, reelUrls, sizes, colors, variants,
    attributes,
  };
}

// ── Temas por template ───────────────────────────────────────────────────────
type Theme = {
  BG: string; S: string; T: string; G: string; MID: string;
  border: string; borderFaint: string; inputBorder: string; inputBg: string;
  serif: string; sans: string; dark: boolean;
  // Estilo visual per-template para los elementos diferenciadores (Moda)
  tabStyle?: "default" | "pill" | "underline" | "brutalist";
  cardRadius?: number;
  titleStyle?: "editorial" | "organic" | "minimal" | "bold";
  inputRadius?: number;
};

const THEMES: Record<string, Theme> = {
  "fashion-noir": {
    BG:"#0a0a0a", S:"#111111", T:"#f0ebe3", G:"#c9a84c", MID:"#888",
    border:"rgba(201,168,76,0.15)", borderFaint:"rgba(240,235,227,0.06)",
    inputBorder:"rgba(201,168,76,0.15)", inputBg:"#171717",
    serif:"Georgia, serif", sans:"'Helvetica Neue', Arial, sans-serif", dark:true,
    tabStyle:"default", cardRadius:0, titleStyle:"editorial", inputRadius:0,
  },
  "boho-terra": {
    BG:"#faf8f4", S:"#f2ebe0", T:"#2c2218", G:"#b56529", MID:"#999",
    border:"rgba(181,101,41,0.2)", borderFaint:"rgba(44,34,24,0.06)",
    inputBorder:"rgba(181,101,41,0.25)", inputBg:"#fff",
    serif:"Georgia, serif", sans:"Inter, system-ui, sans-serif", dark:false,
    tabStyle:"pill", cardRadius:10, titleStyle:"organic", inputRadius:8,
  },
  "chic-paris": {
    BG:"#f9f9f7", S:"#f0eeea", T:"#1a1a1a", G:"#5e7c6f", MID:"#999",
    border:"rgba(94,124,111,0.2)", borderFaint:"rgba(26,26,26,0.06)",
    inputBorder:"rgba(94,124,111,0.25)", inputBg:"#fff",
    serif:"Garamond, Georgia, serif", sans:"Inter, system-ui, sans-serif", dark:false,
    tabStyle:"underline", cardRadius:0, titleStyle:"minimal", inputRadius:0,
  },
  "urban-pulse": {
    BG:"#0f172a", S:"#1e293b", T:"#f8fafc", G:"#f97316", MID:"#64748b",
    border:"rgba(249,115,22,0.2)", borderFaint:"rgba(248,250,252,0.06)",
    inputBorder:"rgba(249,115,22,0.2)", inputBg:"#1e293b",
    serif:"Inter, system-ui, sans-serif", sans:"Inter, system-ui, sans-serif", dark:true,
    tabStyle:"brutalist", cardRadius:0, titleStyle:"bold", inputRadius:0,
  },
  "electro-prime": {
    BG:"#ffffff", S:"#f8fafc", T:"#111111", G:"#ea580c", MID:"#6b7280",
    border:"rgba(234,88,12,0.2)", borderFaint:"rgba(0,0,0,0.06)",
    inputBorder:"#e5e7eb", inputBg:"#fff",
    serif:"'Inter','Segoe UI',system-ui,sans-serif", sans:"'Inter','Segoe UI',system-ui,sans-serif", dark:false,
  },
  "tech-nova": {
    BG:"#ffffff", S:"#fafaff", T:"#0f0f1a", G:"#7c3aed", MID:"#6b6b80",
    border:"rgba(124,58,237,0.2)", borderFaint:"rgba(15,15,26,0.06)",
    inputBorder:"#ececf5", inputBg:"#fff",
    serif:"'Inter','Segoe UI',system-ui,sans-serif", sans:"'Inter','Segoe UI',system-ui,sans-serif", dark:false,
  },
  "home-studio": {
    BG:"#faf8f4", S:"#f0ebe2", T:"#2c2218", G:"#b5652a", MID:"#9a8a76",
    border:"rgba(181,101,42,0.2)", borderFaint:"rgba(44,34,24,0.06)",
    inputBorder:"rgba(181,101,42,0.25)", inputBg:"#fff",
    serif:"Georgia, serif", sans:"Inter, system-ui, sans-serif", dark:false,
  },
  "casa-clara": {
    BG:"#ffffff", S:"#fafafa", T:"#111111", G:"#0f172a", MID:"#888888",
    border:"#ededed", borderFaint:"rgba(0,0,0,0.05)",
    inputBorder:"#ededed", inputBg:"#fff",
    serif:"Inter, system-ui, sans-serif", sans:"Inter, system-ui, sans-serif", dark:false,
  },
};

const fmt = (n: number) => "$" + n.toLocaleString("es-AR");

// Los templates de Hogar y Tecnología tienen su propia página de detalle
// (/producto/[id]) en vez del modal compartido que usan ROPA/AUTOS.
const DETAIL_PAGE_TEMPLATES = ["electro-prime", "tech-nova", "home-studio", "casa-clara"];

// Mismo default que usa el footer del home de cada uno de esos templates
// (sc["bgFooter"] ?? ... en el componente del template) — así el catálogo
// y el detalle de producto arrancan con el mismo color sin que el dueño
// tenga que tocar nada, y se sincronizan solos si lo cambia en el editor.
const FOOTER_BG_DEFAULTS: Record<string, string> = {
  "electro-prime": "#0a0a0a",
  "tech-nova": "#0a0a12",
  "home-studio": "#2c2218",
  "casa-clara": "#ffffff",
};

// ── Componente interno (necesita useSearchParams dentro de Suspense) ──────────
function ProductosPageInner() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const slug         = params?.slug as string;
  const tParam       = searchParams?.get("t") ?? null;
  const fromEditor   = searchParams?.get("from") === "editor";
  const catParam     = searchParams?.get("categoria") ?? null;
  const subCatParam  = searchParams?.get("subcategoria") ?? null;
  const ofertaParam  = searchParams?.get("oferta") === "true";
  const [onlyOfertas, setOnlyOfertas] = useState(ofertaParam);
  const destacadoParam  = searchParams?.get("destacado") === "true";
  const [onlyDestacados, setOnlyDestacados] = useState(destacadoParam);

  const [products,   setProducts]   = useState<StorefrontProduct[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [storeName,  setStoreName]  = useState("Tienda");
  const [template,   setTemplate]   = useState(tParam && THEMES[tParam] ? tParam : "fashion-noir");
  const [accentOverride, setAccentOverride] = useState<string | null>(null);
  const [isOwner,    setIsOwner]    = useState(false);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [footerBg, setFooterBg] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState<{ enabled: boolean; number: string; message: string } | null>(null);
  const [cartIconIdx, setCartIconIdx] = useState(0);
  const [showReport, setShowReport] = useState(false);

  const storeIdRef  = useRef<string | null>(null);
  const dbNameRef   = useRef<string>("Tienda");
  const catScrollRef = useRef<HTMLDivElement>(null);
  function scrollCats(dir: 1 | -1) {
    const el = catScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.6, behavior: "smooth" });
  }

  type PReview = { id: string; rating: number; comment: string | null; reviewer: string; createdAt: string };
  const [reviews,          setReviews]          = useState<PReview[]>([]);
  const [reviewsShown,     setReviewsShown]     = useState(5);
  const [reviewsLoading,   setReviewsLoading]   = useState(false);
  const [reviewForm,       setReviewForm]       = useState({ reviewer: "", rating: 5, comment: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone,       setReviewDone]       = useState(false);
  const [isMobile,         setIsMobile]         = useState(false);
  const [reelIndex,        setReelIndex]        = useState(0);
  const [lightboxSrc,      setLightboxSrc]      = useState<string|null>(null);

  // ── Funciones estables para useCartLogic ──────────────────────────────────
  const resolveVariantId = useCallback((product: StorefrontProduct, sizeValue: string, colorValue: string): string | null => {
    if (!product.variants.length) return null;
    const match = product.variants.find((v) => v.value === sizeValue || v.value === colorValue);
    if (!match && product.variants.length === 1) return product.variants[0].id;
    return match?.id ?? product.variants[0]?.id ?? null;
  }, []);

  const validateCoupon = useCallback(async (code: string, subtotal: number, email?: string) => {
    if (!storeIdRef.current) return { error: "Tienda no disponible" };
    try {
      const res = await fetch("/api/cupones/validar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase(), storeId: storeIdRef.current, subtotal, email }),
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

  const cart = useCartLogic({ products, slug, isOwner, resolveVariantId, validateCoupon, placeOrder });
  const {
    cartItems, cartOpen, setCartOpen, cartCount, cartTotal, envioPrice, couponDiscount, orderTotal,
    modalProduct, setModalProduct, modalImg, setModalImg,
    selectedSize, setSelectedSize, selectedColor, setSelectedColor, qty, setQty,
    checkoutOpen, setCheckoutOpen, checkoutStatus, checkoutError,
    envioId, setEnvioId, pagoId, setPagoId,
    coupon, setCoupon, couponError, appliedCoupon, setAppliedCoupon,
    notas, setNotas, rememberData, setRememberData, buyerForm, setBuyerForm,
    toastMsg, openModal, addToCart, addToPending, addAllToCart,
    pendingItems, pendingTotal, promoActive, pendingPromoDiscount, pendingCartValue, removePendingItem,
    removeFromCart, updateQty,
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
        dbNameRef.current  = data.store.name ?? "Tienda";
        setIsOwner(data.isOwner ?? false);
        setStoreName(data.store.name ?? "Tienda");
        if (data.store.tipoTienda === "AUTOS") {
          const qs = fromEditor ? "?from=editor" : "";
          router.replace(`/tienda/${slug}/vehiculos${qs}`);
          return;
        }
        try {
          const cfg = JSON.parse(data.store.storeConfig || "{}");
          if (cfg.template && !tParam) setTemplate(cfg.template);
          if (cfg.colors?.accent) setAccentOverride(cfg.colors.accent);
          if (cfg.socialLinks) setSocialLinks(cfg.socialLinks);
          if (cfg.sectionColors?.bgFooter) setFooterBg(cfg.sectionColors.bgFooter);
          if (cfg.whatsapp) setWhatsapp(cfg.whatsapp);
          const savedIcon = parseInt(cfg.textOverrides?.["cartIcon"]?.text ?? "0") || 0;
          setCartIconIdx(Math.abs(savedIcon) % CART_ICON_OPTIONS.length);
        } catch {}
        const real: StorefrontProduct[] = (data.store.products ?? []).map(mapProduct);
        if (fromEditor) {
          // En el editor: productos reales primero, demos para completar y poder
          // probar el catálogo/categorías aunque la tienda todavía no tenga stock cargado.
          const tipoTienda = data.store.tipoTienda ?? "ROPA";
          const demoPool = getDemoPool(tipoTienda);
          const needed = Math.max(0, fillTargetFor(tipoTienda) - real.length);
          setProducts([...real, ...demoPool.slice(0, needed)]);
        } else {
          setProducts(real);
        }
      })
      .catch(() => setError("No se pudo cargar la tienda. Intentá de nuevo."))
      .finally(() => setLoading(false));
  }, [slug, fromEditor, router, tParam]);

  useEffect(() => {
    if (!loading && dbNameRef.current !== "Tienda") {
      document.title = `${dbNameRef.current} — Catálogo completo`;
    }
  }, [loading]);

  // ── Filtros y ordenamiento ──────────────────────────────────────────────────
  const [search,            setSearch]            = useState("");
  const [activeCategory,    setActiveCategory]    = useState(catParam ?? "Todos");
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(subCatParam);
  const [hoveredCatMenu,    setHoveredCatMenu]    = useState<string | null>(null);
  // Posición del desplegable de subcategorías, calculada en pantalla (no relativa al
  // contenedor con scroll horizontal de las pestañas) para que no quede recortado por
  // su overflow-x. Se guarda al abrir, leyendo el tab que se clickeó.
  const [catMenuPos, setCatMenuPos] = useState<{ top: number; left: number } | null>(null);
  const catTabRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [sortBy,            setSortBy]            = useState("newest");
  const [page,              setPage]              = useState(1);
  const [activeAttrFilters, setActiveAttrFilters] = useState<Record<string, string[]>>({});
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  // Tech Nova y Urban Pulse usan sidebar de filtros a la izquierda (solo desktop).
  // En mobile caen al layout minimal (dropdown) que funciona bien en touch.
  const isSidebarTemplate = template === "tech-nova" || template === "urban-pulse";
  const isSidebarLayout = isSidebarTemplate && !isMobile;
  // Home Studio y Boho Terra usan categorías como tarjetas con foto + panel de filtros.
  const isCardLayout = template === "home-studio" || template === "boho-terra";
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  useEffect(() => {
    if (!filterDrawerOpen) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [filterDrawerOpen]);
  const cardScrollRef = useRef<HTMLDivElement>(null);
  function scrollCards(dir: 1 | -1) {
    const el = cardScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.6, behavior: "smooth" });
  }
  // Casa Clara y Chic Paris usan navegación tipo "breadcrumb" minimalista.
  // En mobile, los templates de sidebar también caen aquí.
  const isMinimalLayout = template === "casa-clara" || template === "chic-paris" || (isSidebarTemplate && isMobile);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [subDropdownOpen, setSubDropdownOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["cat:Todos"]));
  const toggleGroup = (key: string) => setOpenGroups(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const categoryList = useMemo(() => [...new Set(products.map(p => p.category).filter(c => c && c !== "general"))], [products]);
  const CATEGORIES   = useMemo(() => ["Todos", ...categoryList], [categoryList]);

  // ── Filtro dinámico por atributos: solo se muestran los que el dueño cargó de verdad,
  // y solo si hay más de un valor distinto (sino el filtro no aporta nada) ──────
  const productsInCategory = useMemo(
    () => products.filter(p =>
      (activeCategory === "Todos" || p.category === activeCategory) &&
      (!activeSubcategory || p.subcategory === activeSubcategory)
    ),
    [products, activeCategory, activeSubcategory]
  );

  const availableAttrFilters = useMemo(() => {
    // En "Todos" se mezclan productos de rubros muy distintos (heladeras, sillones,
    // celulares...) y mostrar specs como Pulgadas o Potencia ahí no tiene sentido —
    // recién aparecen cuando el usuario elige una categoría puntual.
    if (activeCategory === "Todos") return [];
    const map: Record<string, Set<string>> = {};
    productsInCategory.forEach(p => {
      p.attributes.forEach(({ key, value }) => {
        if (!key || !value) return;
        if (!map[key]) map[key] = new Set();
        map[key].add(value);
      });
    });
    // Orden fijo: Marca y Modelo primero (lo que más ayuda a decidir),
    // el resto de specs en el medio, y Garantía al final (es un dato de
    // confianza, no algo por lo que normalmente se filtra primero).
    const PRIORITY = ["marca", "modelo"];
    const LAST = ["garantia", "garantía"];
    const rank = (key: string) => {
      const k = key.toLowerCase();
      if (PRIORITY.includes(k)) return PRIORITY.indexOf(k);
      if (LAST.includes(k)) return 100;
      return 10;
    };
    return Object.entries(map)
      .filter(([, values]) => values.size > 1)
      .map(([key, values]) => ({ key, values: [...values].sort() }))
      .sort((a, b) => rank(a.key) - rank(b.key) || a.key.localeCompare(b.key));
  }, [productsInCategory, activeCategory]);

  const toggleAttrFilter = (key: string, value: string) => {
    setActiveAttrFilters(prev => {
      const current = prev[key] ?? [];
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      const updated = { ...prev, [key]: next };
      if (next.length === 0) delete updated[key];
      return updated;
    });
    setPage(1);
  };

  const clearAttrFilters = () => setActiveAttrFilters({});

  // Tope real de precios para la categoría actual — se recalcula cuando cambiás
  // de categoría, y reseteamos la selección manual para no dejar un rango viejo
  // que ya no tiene sentido con los productos nuevos.
  const priceBounds = useMemo<[number, number]>(() => {
    if (productsInCategory.length === 0) return [0, 0];
    const prices = productsInCategory.map(p => p.price);
    return [Math.min(...prices), Math.max(...prices)];
  }, [productsInCategory]);

  // Si cambiás de categoría, el rango de precio anterior ya no tiene sentido —
  // lo reseteamos durante el render (no en un efecto) para evitar un re-render extra.
  const catKey = `${activeCategory}|${activeSubcategory ?? ""}`;
  const [prevCatKey, setPrevCatKey] = useState(catKey);
  if (catKey !== prevCatKey) {
    setPrevCatKey(catKey);
    setPriceRange(null);
  }

  const effectivePriceRange = priceRange ?? priceBounds;

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
    let r = productsInCategory.filter(p => {
      if (search.trim() && !p.name.toLowerCase().includes(search.toLowerCase()) &&
          !(p.subcategory ?? "").toLowerCase().includes(search.toLowerCase()) &&
          !p.category.toLowerCase().includes(search.toLowerCase())) return false;
      for (const [key, values] of Object.entries(activeAttrFilters)) {
        if (values.length === 0) continue;
        const productValue = p.attributes.find(a => a.key === key)?.value;
        if (!productValue || !values.includes(productValue)) return false;
      }
      if (priceRange && (p.price < priceRange[0] || p.price > priceRange[1])) return false;
      if (onlyOfertas && !(p.comparePrice && p.comparePrice > p.price)) return false;
      return true;
    });
    // "Lo más buscado" ordena por vistas reales de compradores (mayor a menor)
    if (onlyDestacados) return [...r].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
    if (sortBy === "price_asc")  r = [...r].sort((a, b) => a.price - b.price);
    if (sortBy === "price_desc") r = [...r].sort((a, b) => b.price - a.price);
    if (sortBy === "name_az")    r = [...r].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "discount")   r = [...r].sort((a, b) => {
      const da = a.comparePrice ? (a.comparePrice - a.price) / a.comparePrice : 0;
      const db = b.comparePrice ? (b.comparePrice - b.price) / b.comparePrice : 0;
      return db - da;
    });
    return r;
  }, [productsInCategory, activeAttrFilters, priceRange, search, sortBy, onlyOfertas, onlyDestacados]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const changeCategory = (cat: string, sub: string | null = null) => {
    setActiveCategory(cat); setActiveSubcategory(sub); setPage(1); setActiveAttrFilters({});
    // Los acordeones de specs (Marca, Modelo, etc.) son específicos de cada categoría —
    // si quedan "abiertos" al cambiar de rubro, dan la falsa sensación de que el filtro
    // sigue activo aunque ya se haya limpiado arriba (activeAttrFilters).
    setOpenGroups(prev => new Set([...prev].filter(k => !k.startsWith("attr:"))));
  };

  const variantPrice = modalProduct ? resolveVariantPrice(modalProduct.variants, selectedSize, selectedColor) : null;
  const displayPrice = variantPrice ?? (modalProduct?.price ?? 0);

  // ── Stock de la variante seleccionada en el modal ──────────────────────────
  const selectedVariantStock = useMemo(() => {
    if (!modalProduct || !modalProduct.variants.length) return null;
    const match = modalProduct.variants.find((v) => {
      try {
        const a = JSON.parse(v.name);
        if (a && typeof a === "object") {
          const vals = Object.values(a).map((x) => String(x).toLowerCase());
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
      (img) => img.variantValue && img.variantValue.toLowerCase() === selectedColor.toLowerCase()
    );
    if (imgIdx !== -1) setModalImg(imgIdx);
    const colorVariants = modalProduct.variants.filter((v) => {
      try { const a = JSON.parse(v.name); return typeof a === "object" && Object.values(a).some((x) => String(x).toLowerCase() === selectedColor.toLowerCase()); } catch { return false; }
    });
    if (!colorVariants.length) return;
    const best = colorVariants.find((v) => v.stock > 0) ?? colorVariants[0];
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
      const hasCombo = modalProduct.variants.some((v) => {
        try {
          const a = JSON.parse(v.name);
          if (typeof a !== "object") return false;
          const vals = Object.values(a).map((x) => String(x).toLowerCase());
          return vals.includes(selectedSize.toLowerCase()) && vals.includes(selectedColor.toLowerCase());
        } catch { return false; }
      });
      if (hasCombo) return;
    }
    const sizeVariants = modalProduct.variants.filter((v) => {
      try {
        const a = JSON.parse(v.name);
        if (typeof a !== "object") return false;
        return Object.entries(a).some(([k, val]) => SIZE_ATTRS.includes(k.toLowerCase()) && String(val).toLowerCase() === selectedSize.toLowerCase());
      } catch { return false; }
    });
    if (!sizeVariants.length) return;
    const best = sizeVariants.find((v) => v.stock > 0) ?? sizeVariants[0];
    try {
      const a = JSON.parse(best.name);
      const colorKey = Object.keys(a).find((k: string) => COLOR_ATTRS.includes(k.toLowerCase()));
      if (colorKey && a[colorKey]) {
        const newColor = String(a[colorKey]);
        if (newColor !== selectedColor) {
          setSelectedColor(newColor);
          const imgIdx = modalProduct.imageItems.findIndex(
            (img) => img.variantValue && img.variantValue.toLowerCase() === newColor.toLowerCase()
          );
          if (imgIdx !== -1) setModalImg(imgIdx);
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSize, modalProduct?.id]);

  // Al cambiar de imagen (flechas/miniaturas): sync color si esa foto pertenece a otra variante
  useEffect(() => {
    if (!modalProduct) return;
    const img = modalProduct.imageItems[modalImg];
    if (img?.variantValue && img.variantValue.toLowerCase() !== selectedColor?.toLowerCase()) {
      setSelectedColor(img.variantValue);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalImg]);

  // ── isMobile ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const allowsPinch = (el: Element | null) => {
      while (el) { if ((el as HTMLElement).style?.touchAction?.includes("pinch-zoom")) return true; el = el.parentElement; }
      return false;
    };
    const preventPinch = (e: TouchEvent) => { if (e.touches.length > 1 && !allowsPinch(e.target as Element)) e.preventDefault(); };
    const preventGesture = (e: Event) => { if (!allowsPinch(e.target as Element)) e.preventDefault(); };
    document.addEventListener("touchmove", preventPinch, { passive: false });
    document.addEventListener("gesturestart", preventGesture as EventListener);
    document.addEventListener("gesturechange", preventGesture as EventListener);
    return () => {
      document.removeEventListener("touchmove", preventPinch);
      document.removeEventListener("gesturestart", preventGesture as EventListener);
      document.removeEventListener("gesturechange", preventGesture as EventListener);
    };
  }, []);

  const imgSwipe = useTouchSwipe(
    () => { if (modalProduct) setModalImg(i => (i + 1) % modalProduct.images.length); },
    () => { if (modalProduct) setModalImg(i => (i - 1 + modalProduct.images.length) % modalProduct.images.length); }
  );

  // ── Cargar reseñas al abrir modal ──────────────────────────────────────────
  useEffect(() => {
    if (!modalProduct || !slug) return;
    setReviews([]);
    setReviewDone(false);
    setReelIndex(0);
    setReviewsShown(5);
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
  const G = accentOverride ?? th.G;
  const { BG, S, T, MID, border, borderFaint, inputBorder, inputBg, serif, sans, dark,
    tabStyle = "default", cardRadius = 0, titleStyle = "editorial", inputRadius = 0 } = th;
  // Texto blanco/negro sobre fondos pintados con el acento (G): se calcula según
  // el color real elegido, no según si el template en sí es claro u oscuro —
  // así un acento muy claro en un template claro sigue siendo legible.
  const accentDark = getContrastColor(G) === "dark";
  // Para usar G como color de TEXTO (precio, marca, etc.) en vez de fondo de
  // botón: si el acento elegido casi no se distingue del fondo de la página,
  // caemos al color de texto normal del tema en vez de dejarlo invisible.
  const GT = getReadableAccentText(G, BG, T);
  // Fondo de inputs dentro del modal (cuyo fondo es S). Si inputBg coincide con S
  // (como en Urban Pulse donde ambos son #1e293b), los inputs desaparecen —
  // en ese caso usamos BG (el nivel más oscuro) para crear contraste visible.
  const modalInputBg = inputBg === S ? BG : inputBg;

  // Footer: mismo color que el dueño eligió para el footer del home (o el
  // default propio del template si no lo tocó), con texto/iconos recalculados
  // para que siempre se lean bien sobre ese fondo.
  const resolvedFooterBg = footerBg ?? (DETAIL_PAGE_TEMPLATES.includes(template) ? FOOTER_BG_DEFAULTS[template] : null);
  const footerFg = resolvedFooterBg ? (getContrastColor(resolvedFooterBg) === "dark" ? "#111111" : "#f5f5f5") : MID;
  // El footer puede tener un fondo distinto al de la página (el que el dueño
  // elige en el editor) — el acento se valida contra ESE fondo, no contra BG.
  const footerBrandColor = resolvedFooterBg ? getReadableAccentText(G, resolvedFooterBg, footerFg) : GT;

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
      <p style={{ color:GT, fontSize:12, letterSpacing:4, textTransform:"uppercase" }}>Cargando...</p>
    </div>
  );

  if (error) return (
    <div style={{ background:BG, minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, fontFamily:sans, color:T }}>
      <p style={{ fontSize:18, fontWeight:600 }}>Algo salió mal</p>
      <p style={{ fontSize:13, opacity:0.5 }}>{error}</p>
      <button onClick={() => window.location.reload()} style={{ background:G, color:accentDark?"#000":"#fff", border:"none", padding:"10px 24px", fontSize:12, fontWeight:700, cursor:"pointer", letterSpacing:2, textTransform:"uppercase" }}>
        Reintentar
      </button>
    </div>
  );

  // ── Grilla + paginación (se comparte entre el layout de pestañas y el de sidebar) ──
  const gridAndPagination = (
    <>
      {/* ── GRILLA ─────────────────────────────────────────────────── */}
      {paginated.length === 0 ? (
        <div style={{ textAlign:"center", padding:"80px 0", opacity:0.4 }}>
          <p style={{ fontFamily:serif, fontSize:22, marginBottom:8 }}>Sin resultados</p>
          <p style={{ fontSize:13 }}>Probá con otra búsqueda o categoría</p>
        </div>
      ) : (
        <div className="pc-grid">
          {paginated.map(product => {
            const isFav = favorites.includes(product.id);
            const useDetailPage = DETAIL_PAGE_TEMPLATES.includes(template);

            // ── Estilos per-template del wrapper de tarjeta ──────────────────
            const cardWrapperBase: React.CSSProperties = tabStyle === "pill"
              ? { borderRadius:cardRadius, overflow:"hidden", transition:"transform 0.3s, box-shadow 0.3s" }
              : tabStyle === "brutalist"
              ? { border:`2px solid ${border}`, overflow:"hidden", transition:"border-color 0.15s, box-shadow 0.15s" }
              : tabStyle === "underline"
              ? { border:`1px solid transparent`, transition:"border-color 0.2s, transform 0.2s" }
              : { border:`1px solid transparent`, transition:"border-color 0.2s" };

            const onCardEnter = (e: React.MouseEvent<HTMLDivElement>) => {
              const el = e.currentTarget;
              if (tabStyle === "pill") { el.style.transform="translateY(-5px)"; el.style.boxShadow=`0 14px 32px ${dark?"rgba(0,0,0,0.3)":"rgba(44,34,24,0.14)"}`; }
              else if (tabStyle === "brutalist") { el.style.borderColor=G; el.style.boxShadow=`4px 4px 0 ${G}`; }
              else if (tabStyle === "underline") { el.style.borderColor=T; el.style.transform="scale(1.015)"; }
              else { el.style.borderColor="rgba(201,168,76,0.4)"; }
            };
            const onCardLeave = (e: React.MouseEvent<HTMLDivElement>) => {
              const el = e.currentTarget;
              if (tabStyle === "pill") { el.style.transform=""; el.style.boxShadow=""; }
              else if (tabStyle === "brutalist") { el.style.borderColor=border; el.style.boxShadow=""; }
              else { el.style.borderColor="transparent"; el.style.transform=""; }
            };

            // ── Badge de oferta per-template ──────────────────────────────────
            const hasCardNxM = product.promoType === "N_PAY_M" && !!product.promoQtyMin && !!product.promoPayQty;
            const hasCardOffer = !!product.comparePrice && product.comparePrice > product.price;
            const ofertaBadge = (hasCardNxM || hasCardOffer) ? (
              <OfferBadge
                badge={hasCardNxM ? null : (product.offerBadge ?? null)}
                pct={hasCardOffer ? discountPercent(product.price, product.comparePrice) : null}
                nxm={hasCardNxM ? { n: product.promoQtyMin!, m: product.promoPayQty! } : undefined}
                size="sm"
              />
            ) : null;

            // ── Contenedor de texto per-template ─────────────────────────────
            const textPad = (tabStyle === "pill" || tabStyle === "brutalist") ? "10px 14px 14px" : "0";
            const nameStyle: React.CSSProperties = tabStyle === "pill"
              ? { fontSize:14, color:T, margin:"0 0 6px", fontWeight:400, fontStyle:"italic", fontFamily:serif, lineHeight:1.35 }
              : tabStyle === "underline"
              ? { fontSize:13, color:T, margin:"0 0 6px", fontWeight:300, fontFamily:serif, lineHeight:1.35 }
              : tabStyle === "brutalist"
              ? { fontSize:12, color:T, margin:"0 0 6px", fontWeight:800, textTransform:"uppercase", letterSpacing:0.5, lineHeight:1.3 }
              : { fontSize:15, color:T, margin:"0 0 7px", fontWeight:500, fontFamily:serif, lineHeight:1.3 };
            const priceStyle: React.CSSProperties = tabStyle === "brutalist"
              ? { fontSize:16, fontWeight:900, color:G }
              : tabStyle === "underline"
              ? { fontSize:15, fontWeight:600, color:G }
              : { fontSize:16, fontWeight:700, color:GT };

            // ── Imagen mb: 0 cuando el wrapper maneja el overflow ────────────
            const imgMb = (tabStyle === "pill" || tabStyle === "brutalist") ? 0 : 14;

            const cardInner = (
              <>
                <div style={{ position:"relative", aspectRatio:"3/4", overflow:"hidden", background:S, marginBottom:imgMb }}>
                  {product.images[0] ? (
                    <img src={product.images[0]} alt={product.name}
                      className="pc-img"
                      style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
                      onError={e => { e.currentTarget.style.opacity="0"; }}/>
                  ) : (
                    <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", opacity:0.15 }}>
                      <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={0.8}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                  )}
                  {ofertaBadge}
                  {(product.subcategory || product.category !== "general") && (
                    <div style={{ position:"absolute", top:10, right:10, background: dark ? "rgba(10,10,10,0.7)" : "rgba(255,255,255,0.85)", color:T, fontSize:9, letterSpacing:2, padding:"3px 8px", textTransform:"uppercase" }}>
                      {product.subcategory ?? product.category}
                    </div>
                  )}
                  <button onClick={e => { e.stopPropagation(); toggleFavorite(product.id); }}
                    aria-label={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
                    style={{ position:"absolute", bottom:10, right:10, background: dark ? "rgba(10,10,10,0.65)" : "rgba(255,255,255,0.9)", border:"none", borderRadius:"50%", width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"transform 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.transform="scale(1.1)")}
                    onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill={isFav ? G : "none"} stroke={isFav ? G : MID} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </button>
                  <div className="product-overlay" style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.3)", display:"flex", alignItems:"center", justifyContent:"center", opacity:0, transition:"opacity 0.3s" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity="1")}
                    onMouseLeave={e => (e.currentTarget.style.opacity="0")}>
                    <span style={{ background:G, color:accentDark?"#000":"#fff", fontSize:10, fontWeight:800, letterSpacing:3, padding:"9px 20px", textTransform:"uppercase" }}>Ver detalle</span>
                  </div>
                </div>
                {/* Área de texto */}
                <div style={{ padding:textPad }}>
                  <p style={{ fontSize:10, color:MID, letterSpacing:2, textTransform:"uppercase", margin:"0 0 4px" }}>{product.category}</p>
                  <p style={nameStyle}>{product.name}</p>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={priceStyle}>{fmt(product.price)}</span>
                    {product.comparePrice && <span style={{ fontSize:12, color:MID, textDecoration:"line-through" }}>{fmt(product.comparePrice)}</span>}
                  </div>
                </div>
              </>
            );

            const wrapStyle: React.CSSProperties = { cursor:"pointer", ...cardWrapperBase };
            return useDetailPage ? (
              <Link key={product.id} href={`/tienda/${slug}/producto/${product.id}${fromEditor ? "?from=editor" : ""}`}
                style={{ textDecoration:"none", color:"inherit", display:"block", ...cardWrapperBase }}>
                {cardInner}
              </Link>
            ) : (
              <div key={product.id} style={wrapStyle} onClick={() => openModal(product)}
                onMouseEnter={onCardEnter} onMouseLeave={onCardLeave}>
                {cardInner}
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
                style={{ background: page===n?G:"transparent", color: page===n?(accentDark?"#000":"#fff"):T, border:`1px solid ${page===n?G:border}`, width:40, height:40, fontSize:13, fontWeight:700, cursor:"pointer", transition:"all 0.2s" }}>
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
    </>
  );

  // ── Sidebar de filtros tipo "ficha técnica" (solo Tech Nova) ──────────────
  const filterSidebar = (
    <aside style={{ width:230, flexShrink:0 }}>
      {/* Categorías */}
      <div style={{ marginBottom:28 }}>
        <p style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:T, margin:"0 0 14px" }}>Categorías</p>
        <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
          {CATEGORIES.map(cat => {
            const subcats = cat !== "Todos" ? (subcategoriesFor[cat] || []) : [];
            const isActive = activeCategory === cat;
            const isOpen = openGroups.has(`cat:${cat}`);
            return (
              <div key={cat}>
                <div style={{ display:"flex", alignItems:"center" }}>
                  <button onClick={() => changeCategory(cat)}
                    style={{ flex:1, textAlign:"left", background:"none", border:"none", margin:0, padding:"7px 0", fontSize:12.5,
                      fontWeight: isActive ? 700 : 500, color: isActive ? G : T, cursor:"pointer", letterSpacing:0.2 }}>
                    {cat}
                  </button>
                  {subcats.length > 0 && (
                    <button onClick={() => toggleGroup(`cat:${cat}`)} aria-label={`Subcategorías de ${cat}`}
                      style={{ background:"none", border:"none", cursor:"pointer", color:T, fontSize:19, fontWeight:700, lineHeight:1, padding:"4px 6px", margin:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {isOpen ? "▴" : "▾"}
                    </button>
                  )}
                </div>
                {subcats.length > 0 && isOpen && (
                  <div style={{ display:"flex", flexDirection:"column", gap:1, paddingLeft:14, marginBottom:4 }}>
                    <button onClick={() => changeCategory(cat)}
                      style={{ textAlign:"left", background:"none", border:"none", padding:"5px 0", fontSize:11.5,
                        color: !activeSubcategory && isActive ? G : MID, cursor:"pointer" }}>
                      Todos en {cat}
                    </button>
                    {subcats.map(sub => (
                      <button key={sub} onClick={() => changeCategory(cat, sub)}
                        style={{ textAlign:"left", background:"none", border:"none", padding:"5px 0", fontSize:11.5,
                          color: activeSubcategory===sub ? G : MID, fontWeight: activeSubcategory===sub ? 700 : 400, cursor:"pointer" }}>
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {(activeCategory !== "Todos" || activeSubcategory || search || onlyOfertas || onlyDestacados) && (
          <button onClick={() => { changeCategory("Todos"); setSearch(""); setOnlyOfertas(false); setOnlyDestacados(false); }}
            style={{ marginTop:10, background:"none", border:"none", color:MID, fontSize:11, letterSpacing:0.5, textDecoration:"underline", cursor:"pointer", padding:0 }}>
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Precio */}
      {priceBounds[1] > priceBounds[0] && (
        <div style={{ borderTop:`1px solid ${borderFaint}`, padding:"16px 0" }}>
          <button onClick={() => toggleGroup("precio")}
            style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", background:"none", border:"none", margin:0, padding:"0 6px 0 0", textAlign:"left" }}>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:T }}>Precio</span>
            <span style={{ color:T, fontSize:19, fontWeight:700, lineHeight:1 }}>{openGroups.has("precio") ? "▴" : "▾"}</span>
          </button>
          {openGroups.has("precio") && (
            <div style={{ marginTop:14 }}>
              <div style={{ position:"relative", width:"100%", height:14 }}>
                <div style={{ position:"absolute", top:6, left:0, right:0, height:2, background:border }} />
                <div style={{ position:"absolute", top:6, height:2, background:G,
                  left:`${((effectivePriceRange[0]-priceBounds[0])/(priceBounds[1]-priceBounds[0]))*100}%`,
                  right:`${100-((effectivePriceRange[1]-priceBounds[0])/(priceBounds[1]-priceBounds[0]))*100}%` }} />
                <input type="range" className="pr-range" min={priceBounds[0]} max={priceBounds[1]} value={effectivePriceRange[0]}
                  onChange={e => setPriceRange([Math.min(Number(e.target.value), effectivePriceRange[1]), effectivePriceRange[1]])} />
                <input type="range" className="pr-range" min={priceBounds[0]} max={priceBounds[1]} value={effectivePriceRange[1]}
                  onChange={e => setPriceRange([effectivePriceRange[0], Math.max(Number(e.target.value), effectivePriceRange[0])])} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:MID, marginTop:4 }}>
                <span>{fmt(effectivePriceRange[0])}</span>
                <span>{fmt(effectivePriceRange[1])}</span>
              </div>
              {priceRange && (
                <button onClick={() => setPriceRange(null)}
                  style={{ marginTop:8, background:"none", border:"none", color:MID, fontSize:10.5, textDecoration:"underline", cursor:"pointer", padding:0 }}>
                  Borrar
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Specs (Marca, Modelo, Garantía, etc.) */}
      {availableAttrFilters.map(({ key, values }) => {
        const isOpen = openGroups.has(`attr:${key}`);
        const activeCount = (activeAttrFilters[key] ?? []).length;
        return (
          <div key={key} style={{ borderTop:`1px solid ${borderFaint}`, padding:"16px 0" }}>
            <button onClick={() => toggleGroup(`attr:${key}`)}
              style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", background:"none", border:"none", margin:0, padding:"0 6px 0 0", textAlign:"left" }}>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:T }}>
                {key}{activeCount > 0 && <span style={{ color:GT }}> ({activeCount})</span>}
              </span>
              <span style={{ color:T, fontSize:19, fontWeight:700, lineHeight:1 }}>{isOpen ? "▴" : "▾"}</span>
            </button>
            {isOpen && (
              <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:12 }}>
                {values.map(value => {
                  const isActive = (activeAttrFilters[key] ?? []).includes(value);
                  return (
                    <label key={value} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:T, cursor:"pointer" }}>
                      <input type="checkbox" checked={isActive} onChange={() => toggleAttrFilter(key, value)}
                        style={{ accentColor:G, width:14, height:14, cursor:"pointer", flexShrink:0 }} />
                      {value}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {(Object.keys(activeAttrFilters).length > 0 || priceRange) && (
        <button onClick={() => { clearAttrFilters(); setPriceRange(null); }}
          style={{ marginTop:8, background:"none", border:"none", color:MID, fontSize:11, letterSpacing:0.5, textDecoration:"underline", cursor:"pointer", padding:0 }}>
          Limpiar specs
        </button>
      )}
    </aside>
  );

  // Contenido de Precio + specs reutilizado tanto en la fila siempre-visible
  // (Electro Prime, Tech Nova horizontal, Casa Clara) como dentro del panel
  // "Filtrar y ordenar" de Home Studio.
  const dynamicFiltersContent = (priceBounds[1] > priceBounds[0] || availableAttrFilters.length > 0) && (
    <div style={{ display:"flex", flexWrap: isCardLayout ? "wrap" : "wrap", flexDirection: isCardLayout ? "column" : "row", gap:24, marginBottom: isCardLayout ? 0 : 32, paddingBottom: isCardLayout ? 0 : 24, borderBottom: isCardLayout ? "none" : `1px solid ${borderFaint}` }}>
      {priceBounds[1] > priceBounds[0] && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <span style={{ fontSize:10, letterSpacing:2, textTransform:"uppercase", opacity:0.5 }}>Precio</span>
          <div style={{ position:"relative", width: isCardLayout ? "100%" : 170, height:14 }}>
            <div style={{ position:"absolute", top:6, left:0, right:0, height:2, background:border }} />
            <div style={{ position:"absolute", top:6, height:2, background:G,
              left:`${((effectivePriceRange[0]-priceBounds[0])/(priceBounds[1]-priceBounds[0]))*100}%`,
              right:`${100-((effectivePriceRange[1]-priceBounds[0])/(priceBounds[1]-priceBounds[0]))*100}%` }} />
            <input type="range" className="pr-range" min={priceBounds[0]} max={priceBounds[1]} value={effectivePriceRange[0]}
              onChange={e => setPriceRange([Math.min(Number(e.target.value), effectivePriceRange[1]), effectivePriceRange[1]])} />
            <input type="range" className="pr-range" min={priceBounds[0]} max={priceBounds[1]} value={effectivePriceRange[1]}
              onChange={e => setPriceRange([effectivePriceRange[0], Math.max(Number(e.target.value), effectivePriceRange[0])])} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:MID }}>
            <span>{fmt(effectivePriceRange[0])}</span>
            <span>{fmt(effectivePriceRange[1])}</span>
          </div>
        </div>
      )}
      {availableAttrFilters.length > 0 && availableAttrFilters.map(({ key, values }) => (
        <div key={key} style={{ display:"flex", flexDirection:"column", gap:8,
          paddingLeft: isCardLayout ? 0 : 24, borderLeft: isCardLayout ? "none" : `1px solid ${borderFaint}`,
          paddingTop: isCardLayout ? 16 : 0, borderTop: isCardLayout ? `1px solid ${borderFaint}` : "none" }}>
          <span style={{ fontSize:10, letterSpacing:2, textTransform:"uppercase", opacity:0.5 }}>{key}</span>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {values.map(value => {
              const isActive = (activeAttrFilters[key] ?? []).includes(value);
              return (
                <button key={value} onClick={() => toggleAttrFilter(key, value)}
                  style={{
                    background: isActive ? G : "transparent",
                    color: isActive ? (accentDark ? "#000" : "#fff") : T,
                    border: `1px solid ${isActive ? G : border}`,
                    padding: "6px 14px", fontSize: 11, cursor: "pointer",
                    letterSpacing: 0.5, transition: "all 0.2s",
                  }}>
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {(Object.keys(activeAttrFilters).length > 0 || priceRange) && (
        <button onClick={() => { clearAttrFilters(); setPriceRange(null); }}
          style={{ alignSelf: isCardLayout ? "flex-start" : "flex-end", background:"none", border:"none", color:MID, fontSize:11, letterSpacing:1, cursor:"pointer", padding:"6px 0", textDecoration:"underline" }}>
          Limpiar specs
        </button>
      )}
    </div>
  );

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:BG, color:T, minHeight:"100vh", fontFamily:sans }}>
      <style>{`
  .st-tabs::-webkit-scrollbar{display:none}.st-tabs{scrollbar-width:none;-ms-overflow-style:none}
  .pr-range{position:absolute;top:0;left:0;width:100%;margin:0;background:none;pointer-events:none;-webkit-appearance:none;appearance:none}
  .pr-range::-webkit-slider-runnable-track{background:none}
  .pr-range::-moz-range-track{background:none}
  .pr-range::-webkit-slider-thumb{-webkit-appearance:none;pointer-events:all;width:14px;height:14px;border-radius:50%;background:${G};border:2px solid ${BG};box-shadow:0 0 0 1px ${G};cursor:pointer;margin-top:0}
  .pr-range::-moz-range-thumb{pointer-events:all;width:14px;height:14px;border-radius:50%;background:${G};border:2px solid ${BG};box-shadow:0 0 0 1px ${G};cursor:pointer}
  @media(hover:hover) and (pointer:fine){.pc-img:hover{transform:scale(1.05)}}.pc-img{transition:transform 0.5s ease}
  .pc-grid{display:grid;gap:16px;grid-template-columns:repeat(2,1fr);margin-bottom:56px}
  @media(min-width:560px){.pc-grid{gap:20px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}}
  @media(min-width:900px){.pc-grid{gap:24px}}
  @media(hover:hover) and (pointer:fine){.cc-dropdown-item:hover{background:${G}1a !important}}
`}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ position:"sticky", top:0, zIndex:100, background:backdropNav, backdropFilter:"blur(12px)", borderBottom:`1px solid ${borderFaint}` }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 clamp(16px,4vw,32px)", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ visibility: isMobile ? "hidden" : "visible", pointerEvents: isMobile ? "none" : "auto", width: isMobile ? 44 : "auto" }}>
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
          </div>
          <span style={{ fontFamily:serif, fontSize:20, fontWeight:700, letterSpacing:5, color:GT }}>{storeName}</span>
          <button onClick={() => setCartOpen(true)} style={{ position:"relative", background:"none", border:`1px solid ${border}`, color:T, width:44, height:44, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"border-color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor=G)}
            onMouseLeave={e => (e.currentTarget.style.borderColor=border)}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              {CART_ICON_OPTIONS[cartIconIdx]}
            </svg>
            {cartCount > 0 && (
              <span style={{ position:"absolute", top:-6, right:-6, background:G, color:accentDark?"#000":"#fff", borderRadius:"50%", width:18, height:18, fontSize:10, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{cartCount}</span>
            )}
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1280, margin:"0 auto", padding:"clamp(32px,5vw,48px) clamp(16px,4vw,32px)" }}>

        {/* ── TÍTULO + BÚSQUEDA ──────────────────────────────────────── */}
        {/* Kicker per-template */}
        {(() => {
          const label = onlyOfertas ? "Promociones" : onlyDestacados ? "Selección" : "Colección completa";
          const heading = onlyOfertas ? "Ofertas" : onlyDestacados ? "Lo más buscado" : activeCategory === "Todos" ? "Todos los productos" : activeCategory;
          const sub = activeSubcategory;
          // Estilos de toggle per-template
          const toggleBase = (active: boolean): React.CSSProperties =>
            tabStyle === "pill"
              ? { background: active ? G : "rgba(44,34,24,0.06)", color: active ? (accentDark?"#000":"#fff") : T, border:`1px solid ${active ? G : "rgba(44,34,24,0.15)"}`, borderRadius:999, padding:"9px 18px", fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" as const, transition:"background 0.2s, border-color 0.2s" }
              : tabStyle === "underline"
              ? { background:"none", color: active ? G : T, border:"none", borderBottom:`2px solid ${active ? G : "transparent"}`, padding:"9px 4px", fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" as const, transition:"border-color 0.2s, color 0.2s" }
              : tabStyle === "brutalist"
              ? { background: active ? G : "transparent", color: active ? (accentDark?"#000":"#fff") : T, border:`2px solid ${active ? G : border}`, boxShadow: active ? `3px 3px 0 ${G}` : "none", padding:"9px 16px", fontSize:12, fontWeight:800, cursor:"pointer", whiteSpace:"nowrap" as const, transition:"border-color 0.15s, box-shadow 0.15s" }
              : { background: active ? G : "none", color: active ? (accentDark?"#000":"#fff") : T, border:`1px solid ${active ? G : border}`, padding:"10px 16px", fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" as const };
          // Estilos de input/select per-template
          const inputStyle: React.CSSProperties = tabStyle === "underline"
            ? { background:"transparent", border:"none", borderBottom:`1px solid ${border}`, color:T, padding:"11px 8px 11px 36px", fontSize:13, outline:"none", width:"clamp(160px,40vw,210px)", boxSizing:"border-box" as const }
            : tabStyle === "brutalist"
            ? { background:S, border:`2px solid ${border}`, color:T, padding:"11px 16px 11px 40px", fontSize:13, outline:"none", width:"clamp(180px,50vw,230px)", boxSizing:"border-box" as const }
            : { background:S, border:`1px solid ${border}`, color:T, padding:"11px 16px 11px 40px", fontSize:13, outline:"none", width:"clamp(180px,50vw,230px)", boxSizing:"border-box" as const, borderRadius:inputRadius };
          const selectStyle: React.CSSProperties = tabStyle === "underline"
            ? { background:"transparent", border:"none", borderBottom:`1px solid ${border}`, color:T, padding:"11px 8px", fontSize:12, outline:"none", cursor:"pointer" }
            : tabStyle === "brutalist"
            ? { background:S, border:`2px solid ${border}`, color:T, padding:"11px 14px", fontSize:12, outline:"none", cursor:"pointer" }
            : { background:S, border:`1px solid ${border}`, color:T, padding:"11px 14px", fontSize:12, outline:"none", cursor:"pointer", borderRadius:inputRadius };
          return (
            <div style={{ display:"flex", flexDirection: titleStyle === "bold" ? "column" : "row", alignItems: titleStyle === "bold" ? "flex-start" : "flex-end", justifyContent: titleStyle === "bold" ? "flex-start" : "space-between", marginBottom:40, flexWrap: titleStyle === "bold" ? "nowrap" : "wrap", gap: titleStyle === "bold" ? 20 : 16 }}>
              <div>
                {/* Kicker */}
                {titleStyle === "bold" ? (
                  <p style={{ fontSize:11, letterSpacing:3, color:G, textTransform:"uppercase", margin:"0 0 8px", fontWeight:700 }}>// {label}</p>
                ) : titleStyle === "organic" ? (
                  <p style={{ fontSize:11, fontStyle:"italic", color:MID, margin:"0 0 8px", fontFamily:serif }}>{label}</p>
                ) : titleStyle === "minimal" ? (
                  <p style={{ fontSize:9, letterSpacing:6, color:MID, textTransform:"uppercase", margin:"0 0 16px" }}>{label}</p>
                ) : (
                  <p style={{ fontSize:10, letterSpacing:5, color:GT, textTransform:"uppercase", margin:"0 0 12px" }}>{label}</p>
                )}
                {/* Heading */}
                {titleStyle === "editorial" && (
                  <>
                    <h1 style={{ fontFamily:serif, fontSize:"clamp(28px,4vw,42px)", margin:"0 0 10px", color:T, lineHeight:1.1, fontWeight:700 }}>
                      {heading}{sub && <span style={{ fontStyle:"italic", opacity:0.55 }}> › {sub}</span>}
                    </h1>
                    <div style={{ width:40, height:2, background:G, marginBottom:8 }} />
                  </>
                )}
                {titleStyle === "organic" && (
                  <h1 style={{ fontFamily:serif, fontStyle:"italic", fontSize:"clamp(26px,4vw,40px)", margin:"0 0 8px", color:T, lineHeight:1.15, fontWeight:400 }}>
                    {heading}{sub && <span style={{ opacity:0.55 }}> › {sub}</span>}
                  </h1>
                )}
                {titleStyle === "minimal" && (
                  <h1 style={{ fontFamily:serif, fontSize:"clamp(26px,4vw,40px)", margin:"0 0 8px", color:T, lineHeight:1.15, fontWeight:300 }}>
                    {heading}{sub && <span style={{ fontStyle:"italic", opacity:0.55 }}> › {sub}</span>}
                  </h1>
                )}
                {titleStyle === "bold" && (
                  <h1 style={{ fontSize:"clamp(30px,5vw,50px)", margin:"0 0 8px", color:T, lineHeight:1.0, fontWeight:900, textTransform:"uppercase", letterSpacing:-1 }}>
                    {heading}{sub && <span style={{ color:G }}> / {sub}</span>}
                  </h1>
                )}
                <p style={{ fontSize:12, opacity:0.35, margin:0, letterSpacing:2 }}>
                  {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
                <button onClick={() => { setOnlyDestacados(o => !o); setOnlyOfertas(false); setPage(1); }} style={toggleBase(onlyDestacados)}>
                  ⭐ Lo más buscado
                </button>
                <button onClick={() => { setOnlyOfertas(o => !o); setOnlyDestacados(false); setPage(1); }} style={toggleBase(onlyOfertas)}>
                  🔥 En oferta
                </button>
                <div style={{ position:"relative" }}>
                  <input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Buscar..."
                    aria-label="Buscar productos"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor=G)}
                    onBlur={e => (e.target.style.borderColor=border)}
                  />
                  <svg style={{ position:"absolute", left:tabStyle==="underline"?8:13, top:"50%", transform:"translateY(-50%)", opacity:0.35, pointerEvents:"none" }} width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  {search && (
                    <button onClick={() => { setSearch(""); setPage(1); }} aria-label="Limpiar búsqueda"
                      style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:MID, cursor:"pointer", fontSize:16, padding:0 }}>×</button>
                  )}
                </div>
                <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }} aria-label="Ordenar por" style={selectStyle}>
                  <option value="newest">Más recientes</option>
                  <option value="price_asc">Precio ↑</option>
                  <option value="price_desc">Precio ↓</option>
                  <option value="name_az">Nombre A→Z</option>
                  <option value="discount">Mayor descuento</option>
                </select>
              </div>
            </div>
          );
        })()}

        {isSidebarLayout ? (
          <div style={{ display:"flex", gap:36, alignItems:"flex-start" }}>
            {filterSidebar}
            <div style={{ flex:1, minWidth:0 }}>
              {gridAndPagination}
            </div>
          </div>
        ) : isCardLayout ? (
          <>
            {/* ── CATEGORÍAS COMO TARJETAS CON FOTO (Home Studio) ───────────── */}
            <div style={{ position:"relative", marginBottom:28, padding: CATEGORIES.length > 6 ? "0 34px" : 0 }}>
              {CATEGORIES.length > 6 && (
                <>
                  <button onClick={() => scrollCards(-1)} aria-label="Anterior"
                    style={{ position:"absolute", left:0, top:0, bottom:0, zIndex:2, width:30,
                      border:"none", background:"none", color:T, opacity:0.45, fontSize:38, lineHeight:1, cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
                  <button onClick={() => scrollCards(1)} aria-label="Siguiente"
                    style={{ position:"absolute", right:0, top:0, bottom:0, zIndex:2, width:30,
                      border:"none", background:"none", color:T, opacity:0.45, fontSize:38, lineHeight:1, cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
                </>
              )}
              <div ref={cardScrollRef} className="st-tabs" style={{ display:"flex", gap:14, overflowX:"auto", WebkitOverflowScrolling:"touch" } as React.CSSProperties}>
                {CATEGORIES.map(cat => {
                  const isActive = activeCategory === cat;
                  const img = cat !== "Todos" ? products.find(p => p.category === cat && p.images[0])?.images[0] : null;
                  return (
                    <button key={cat} onClick={() => changeCategory(cat)}
                      style={{ position:"relative", flexShrink:0, width:118, height:140, border:`1px solid ${isActive ? G : border}`,
                        borderRadius: cardRadius > 0 ? cardRadius + 4 : 14, overflow:"hidden", cursor:"pointer", padding:0, background: img ? "#00000010" : (isActive ? G : "transparent") }}>
                      {img && (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
                          <div style={{ position:"absolute", inset:0, background: isActive ? `${G}55` : "linear-gradient(to top, rgba(0,0,0,0.55), transparent 60%)" }} />
                        </>
                      )}
                      <span style={{ position:"absolute", bottom:10, left:10, right:10, fontSize:11, fontWeight:700, letterSpacing:0.5, textTransform:"uppercase",
                        color: img ? "#fff" : (isActive ? (accentDark?"#000":"#fff") : T), textAlign:"left", lineHeight:1.25 }}>
                        {cat}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subcategorías de la categoría activa, como chips simples */}
            {activeCategory !== "Todos" && (subcategoriesFor[activeCategory] || []).length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:28 }}>
                <button onClick={() => changeCategory(activeCategory)}
                  style={{ background: !activeSubcategory ? G : "transparent", color: !activeSubcategory ? (accentDark?"#000":"#fff") : T,
                    border:`1px solid ${!activeSubcategory ? G : border}`, padding:"7px 16px", fontSize:11, letterSpacing:1, textTransform:"uppercase", cursor:"pointer" }}>
                  Todos
                </button>
                {(subcategoriesFor[activeCategory] || []).map(sub => (
                  <button key={sub} onClick={() => changeCategory(activeCategory, sub)}
                    style={{ background: activeSubcategory===sub ? G : "transparent", color: activeSubcategory===sub ? (accentDark?"#000":"#fff") : T,
                      border:`1px solid ${activeSubcategory===sub ? G : border}`, padding:"7px 16px", fontSize:11, letterSpacing:1, textTransform:"uppercase", cursor:"pointer" }}>
                    {sub}
                  </button>
                ))}
              </div>
            )}

            {/* ── BOTÓN "FILTRAR Y ORDENAR" + LIMPIAR ───────────────────────── */}
            <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:32, paddingBottom:24, borderBottom:`1px solid ${borderFaint}` }}>
              {(priceBounds[1] > priceBounds[0] || availableAttrFilters.length > 0) && (
                <button onClick={() => setFilterDrawerOpen(true)}
                  style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:`1px solid ${border}`, color:T, padding:"10px 18px", fontSize:11.5, letterSpacing:1, textTransform:"uppercase", cursor:"pointer", borderRadius:inputRadius }}>
                  Filtrar y ordenar
                  {(Object.keys(activeAttrFilters).length > 0 || priceRange) && (
                    <span style={{ background:G, color: accentDark?"#000":"#fff", borderRadius:"50%", width:18, height:18, fontSize:10, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>
                      {Object.values(activeAttrFilters).filter(v => v.length > 0).length + (priceRange ? 1 : 0)}
                    </span>
                  )}
                </button>
              )}
              {(activeCategory !== "Todos" || activeSubcategory || search || onlyOfertas || onlyDestacados || Object.keys(activeAttrFilters).length > 0 || priceRange) && (
                <button onClick={() => { changeCategory("Todos"); setSearch(""); setOnlyOfertas(false); setOnlyDestacados(false); clearAttrFilters(); setPriceRange(null); }}
                  style={{ background:"none", border:"none", color:MID, fontSize:11, letterSpacing:1, cursor:"pointer", padding:0, textDecoration:"underline" }}>
                  Limpiar filtros
                </button>
              )}
            </div>

            {/* ── PANEL "FILTRAR Y ORDENAR" ──────────────────────────────────── */}
            {filterDrawerOpen && (
              <>
                <div style={{ position:"fixed", inset:0, background:overlayBg, zIndex:350 }} onClick={() => setFilterDrawerOpen(false)} />
                <div style={{ position:"fixed", top:0, right:0, bottom:0, width:"min(360px, 92vw)", background:BG, zIndex:351,
                  overflowY:"auto", padding:"28px 28px 40px", boxShadow:"-12px 0 32px rgba(0,0,0,0.25)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
                    <h3 style={{ margin:0, fontFamily:serif, fontSize:20, color:T }}>Filtrar y ordenar</h3>
                    <button onClick={() => setFilterDrawerOpen(false)}
                      style={{ background:"none", border:"none", color:T, fontSize:22, cursor:"pointer", padding:0, lineHeight:1 }}>×</button>
                  </div>
                  {dynamicFiltersContent}
                </div>
              </>
            )}

            {gridAndPagination}
          </>
        ) : isMinimalLayout ? (
          <>
            {/* ── NAVEGACIÓN TIPO BREADCRUMB (Casa Clara) ───────────────────── */}
            {(catDropdownOpen || subDropdownOpen) && (
              <div style={{ position:"fixed", inset:0, zIndex:40 }} onClick={() => { setCatDropdownOpen(false); setSubDropdownOpen(false); }} />
            )}
            <div style={{ display:"flex", alignItems:"center", gap:24, flexWrap:"wrap", marginBottom:28, paddingBottom:20, borderBottom:`1px solid ${borderFaint}`, fontSize:12.5 }}>
              {/* Categoría */}
              <div style={{ position:"relative", zIndex:41 }}>
                <button onClick={() => { setCatDropdownOpen(o => !o); setSubDropdownOpen(false); }}
                  style={{ background:"none", border:"none", color:T, cursor:"pointer", padding:0, display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ opacity:0.5 }}>Categoría:</span>
                  <span style={{ fontWeight:600, textTransform:"uppercase", letterSpacing:0.5 }}>{activeCategory}</span>
                  <span style={{ fontSize:10 }}>{catDropdownOpen ? "▴" : "▾"}</span>
                </button>
                {catDropdownOpen && (
                  <div style={{ position:"absolute", top:"100%", left:0, marginTop:8, background:S, border:`1px solid ${border}`, minWidth:170, zIndex:42, padding:"4px 0", boxShadow:"0 8px 24px rgba(0,0,0,0.12)" }}>
                    {CATEGORIES.map(cat => (
                      <button key={cat} className="cc-dropdown-item" onClick={() => { changeCategory(cat); setCatDropdownOpen(false); }}
                        style={{ display:"block", width:"100%", textAlign:"left", background: activeCategory===cat ? `${G}12` : "none", borderLeft: activeCategory===cat ? `3px solid ${G}` : "3px solid transparent", borderTop:"none", borderRight:"none", borderBottom:"none", padding:"8px 16px 8px 13px", fontSize:12, color:T, fontWeight: activeCategory===cat ? 700 : 400, cursor:"pointer", textTransform:"uppercase", letterSpacing:0.5, transition:"background 0.15s" }}>
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Subcategoría — solo si la categoría activa tiene */}
              {activeCategory !== "Todos" && (subcategoriesFor[activeCategory] || []).length > 0 && (
                <div style={{ position:"relative", zIndex:41 }}>
                  <button onClick={() => { setSubDropdownOpen(o => !o); setCatDropdownOpen(false); }}
                    style={{ background:"none", border:"none", color:T, cursor:"pointer", padding:0, display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ opacity:0.5 }}>Subcategoría:</span>
                    <span style={{ fontWeight:600, textTransform:"uppercase", letterSpacing:0.5 }}>{activeSubcategory ?? "Todas"}</span>
                    <span style={{ fontSize:10 }}>{subDropdownOpen ? "▴" : "▾"}</span>
                  </button>
                  {subDropdownOpen && (
                    <div style={{ position:"absolute", top:"100%", left:0, marginTop:8, background:S, border:`1px solid ${border}`, minWidth:170, zIndex:42, padding:"4px 0", boxShadow:"0 8px 24px rgba(0,0,0,0.12)" }}>
                      <button className="cc-dropdown-item" onClick={() => { changeCategory(activeCategory); setSubDropdownOpen(false); }}
                        style={{ display:"block", width:"100%", textAlign:"left", background: !activeSubcategory ? `${G}12` : "none", borderLeft: !activeSubcategory ? `3px solid ${G}` : "3px solid transparent", borderTop:"none", borderRight:"none", borderBottom:"none", padding:"8px 16px 8px 13px", fontSize:12, color:T, fontWeight: !activeSubcategory ? 700 : 400, cursor:"pointer", textTransform:"uppercase", letterSpacing:0.5, transition:"background 0.15s" }}>
                        Todas
                      </button>
                      {(subcategoriesFor[activeCategory] || []).map(sub => (
                        <button key={sub} className="cc-dropdown-item" onClick={() => { changeCategory(activeCategory, sub); setSubDropdownOpen(false); }}
                          style={{ display:"block", width:"100%", textAlign:"left", background: activeSubcategory===sub ? `${G}12` : "none", borderLeft: activeSubcategory===sub ? `3px solid ${G}` : "3px solid transparent", borderTop:"none", borderRight:"none", borderBottom:"none", padding:"8px 16px 8px 13px", fontSize:12, color:T, fontWeight: activeSubcategory===sub ? 700 : 400, cursor:"pointer", textTransform:"uppercase", letterSpacing:0.5, transition:"background 0.15s" }}>
                          {sub}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Toggle de filtros — el texto se adapta a lo que realmente hay para mostrar:
                  si solo hay Precio (ej. en "Todos", donde las specs se ocultan a propósito),
                  dice "+ Precio" en vez de "+ Filtros" para no prometer más de lo que abre */}
              {(priceBounds[1] > priceBounds[0] || availableAttrFilters.length > 0) && (
                <button onClick={() => setFiltersOpen(o => !o)}
                  style={{ background:"none", border:"none", color:T, cursor:"pointer", padding:0, textDecoration:"underline", fontSize:12.5 }}>
                  {filtersOpen
                    ? `− Ocultar ${availableAttrFilters.length > 0 ? "filtros" : "precio"}`
                    : `+ ${availableAttrFilters.length > 0 ? "Filtros" : "Precio"}`}
                  {(Object.keys(activeAttrFilters).length > 0 || priceRange) &&
                    ` (${Object.values(activeAttrFilters).filter(v => v.length > 0).length + (priceRange ? 1 : 0)})`}
                </button>
              )}

              {(activeCategory !== "Todos" || activeSubcategory || search || onlyOfertas || onlyDestacados || Object.keys(activeAttrFilters).length > 0 || priceRange) && (
                <button onClick={() => { changeCategory("Todos"); setSearch(""); setOnlyOfertas(false); setOnlyDestacados(false); clearAttrFilters(); setPriceRange(null); }}
                  style={{ background:"none", border:"none", color:MID, fontSize:11.5, cursor:"pointer", padding:0, textDecoration:"underline" }}>
                  Limpiar filtros
                </button>
              )}
            </div>

            {filtersOpen && (
              <div style={{ marginBottom:28 }}>
                {dynamicFiltersContent}
              </div>
            )}

            {gridAndPagination}
          </>
        ) : (
          <>
            {/* ── FILTROS DE CATEGORÍA ───────────────────────────────────── */}
            {hoveredCatMenu !== null && (
              <div style={{ position:"fixed", inset:0, zIndex:350 }} onClick={() => setHoveredCatMenu(null)} />
            )}
            <div style={{ position:"relative", marginBottom:40,
              borderBottom: tabStyle === "underline" ? "none" : `1px solid ${borderFaint}`,
              paddingBottom: tabStyle === "underline" ? 0 : 24,
              padding: `0 ${CATEGORIES.length > 5 ? 46 : 0}px ${tabStyle === "underline" ? 0 : 24}px` }}>
              {CATEGORIES.length > 5 && (
                <>
                  <button onClick={() => scrollCats(-1)} aria-label="Anterior"
                    style={{ position:"absolute", left:0, top:0, bottom:tabStyle==="underline"?0:24, zIndex:2, width:36, margin:"auto 0", padding:0,
                      border:"none", background:"none", color:T, opacity:0.45, fontSize:44, lineHeight:1, cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
                  <button onClick={() => scrollCats(1)} aria-label="Siguiente"
                    style={{ position:"absolute", right:0, top:0, bottom:tabStyle==="underline"?0:24, zIndex:2, width:36, margin:"auto 0", padding:0,
                      border:"none", background:"none", color:T, opacity:0.45, fontSize:44, lineHeight:1, cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
                </>
              )}
              <div ref={catScrollRef} className="st-tabs" style={{ display:"flex", gap: tabStyle==="underline" ? 20 : tabStyle==="pill" ? 8 : 8, flexWrap:"nowrap", overflowX:"auto", WebkitOverflowScrolling:"touch" } as React.CSSProperties}>
                {CATEGORIES.map(cat => {
                  const subcats = cat !== "Todos" ? (subcategoriesFor[cat] || []) : [];
                  const isActive = activeCategory === cat;
                  // Wrapper del tab per-template
                  const tabWrapperStyle: React.CSSProperties = tabStyle === "pill"
                    ? { display:"flex", alignItems:"stretch", border:`1px solid ${isActive ? G : border}`, borderRadius:999, overflow:"hidden", transition:"border-color 0.2s" }
                    : tabStyle === "underline"
                    ? { display:"flex", alignItems:"stretch", border:"none", borderBottom:`2px solid ${isActive ? G : "transparent"}`, paddingBottom:8, transition:"border-color 0.2s" }
                    : tabStyle === "brutalist"
                    ? { display:"flex", alignItems:"stretch", border:`2px solid ${isActive ? G : border}`, boxShadow: isActive ? `3px 3px 0 ${G}` : "none", transition:"border-color 0.15s, box-shadow 0.15s" }
                    : { display:"flex", alignItems:"stretch", border:`1px solid ${isActive ? G : border}`, transition:"border-color 0.2s" };
                  // Botón principal del tab per-template
                  const tabBtnStyle: React.CSSProperties = tabStyle === "pill"
                    ? { background: isActive ? G : "transparent", color: isActive ? (accentDark?"#000":"#fff") : T, border:"none", padding:"8px 18px", fontSize:11, letterSpacing:1, cursor:"pointer", fontWeight:600, textTransform:"uppercase", whiteSpace:"nowrap" as const, transition:"background 0.2s, color 0.2s" }
                    : tabStyle === "underline"
                    ? { background:"none", color: isActive ? G : T, border:"none", padding:"8px 0", fontSize:12, letterSpacing:2, cursor:"pointer", fontWeight: isActive ? 700 : 400, textTransform:"uppercase", whiteSpace:"nowrap" as const, transition:"color 0.2s, font-weight 0.15s", fontFamily:serif }
                    : tabStyle === "brutalist"
                    ? { background: isActive ? G : "transparent", color: isActive ? (accentDark?"#000":"#fff") : T, border:"none", padding:"9px 18px", fontSize:11, fontWeight:900, letterSpacing:1, cursor:"pointer", textTransform:"uppercase", whiteSpace:"nowrap" as const }
                    : { background: isActive ? G : "transparent", color: isActive ? (accentDark?"#000":"#fff") : T, border:"none", padding:"9px 20px", fontSize:11, letterSpacing:2, cursor:"pointer", fontWeight:600, textTransform:"uppercase", whiteSpace:"nowrap" as const, fontFamily:serif, transition:"all 0.2s" };
                  return (
                    <div key={cat} ref={(el) => { catTabRefs.current[cat] = el; }} style={{ position:"relative", flexShrink:0 }}>
                      <div style={tabWrapperStyle}>
                        <button onClick={() => changeCategory(cat)} style={tabBtnStyle}>{cat}</button>
                        {subcats.length > 0 && (
                          <button onClick={() => {
                              if (hoveredCatMenu === cat) { setHoveredCatMenu(null); return; }
                              const rect = catTabRefs.current[cat]?.getBoundingClientRect();
                              if (rect) setCatMenuPos({ top: rect.bottom + 4, left: rect.left });
                              setHoveredCatMenu(cat);
                            }}
                            aria-label={`Subcategorías de ${cat}`}
                            style={{ background: isActive ? G : "transparent", color: isActive ? (accentDark?"#000":"#fff") : T, border:"none", borderLeft: tabStyle==="underline" ? "none" : `1px solid ${isActive ? (dark?"rgba(0,0,0,0.25)":"rgba(255,255,255,0.3)") : border}`, padding: tabStyle==="underline" ? "8px 0 8px 6px" : "9px 12px", fontSize:13, fontWeight:700, lineHeight:1, cursor:"pointer", display:"flex", alignItems:"center" }}>
                            {hoveredCatMenu === cat ? "▴" : "▾"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(activeCategory !== "Todos" || activeSubcategory || search || onlyOfertas || onlyDestacados) && (
                  <button onClick={() => { changeCategory("Todos"); setSearch(""); setOnlyOfertas(false); setOnlyDestacados(false); }}
                    style={{ flexShrink:0, background:"none", border:"none", color:MID, fontSize:11, letterSpacing:1, cursor:"pointer", padding:"9px 8px", textDecoration:"underline", whiteSpace:"nowrap" }}>
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>

            {/* Desplegable de subcategorías: posicionado "fixed" en base a catMenuPos,
                fuera del contenedor con scroll horizontal de las pestañas (si quedara
                anidado ahí, el overflow-x lo recorta y nunca se llega a ver). */}
            {hoveredCatMenu !== null && catMenuPos && (subcategoriesFor[hoveredCatMenu] || []).length > 0 && (
              <div style={{ position:"fixed", top:catMenuPos.top, left:catMenuPos.left, background:S, border:`1px solid ${border}`, minWidth:180, zIndex:400, padding:"4px 0", boxShadow:"0 8px 24px rgba(0,0,0,0.25)" }}>
                <button onClick={() => { changeCategory(hoveredCatMenu); setHoveredCatMenu(null); }}
                  style={{ display:"block", width:"100%", background:"none", border:"none", color:T, padding:"9px 16px", fontSize:11, textAlign:"left", cursor:"pointer", letterSpacing:1, textTransform:"uppercase", whiteSpace:"nowrap" }}>
                  Todos en {hoveredCatMenu}
                </button>
                <div style={{ borderTop:`1px solid ${borderFaint}`, margin:"2px 0" }}/>
                {(subcategoriesFor[hoveredCatMenu] || []).map(sub => (
                  <button key={sub} onClick={() => { changeCategory(hoveredCatMenu, sub); setHoveredCatMenu(null); }}
                    style={{ display:"block", width:"100%", background: activeSubcategory===sub ? `${G}18` : "none", border:"none", color: activeSubcategory===sub ? G : T, padding:"8px 16px 8px 24px", fontSize:11, textAlign:"left", cursor:"pointer", letterSpacing:1, textTransform:"uppercase", whiteSpace:"nowrap", opacity: activeSubcategory===sub ? 1 : 0.7 }}>
                    {sub}
                  </button>
                ))}
              </div>
            )}

            {/* ── FILTROS DINÁMICOS POR ATRIBUTOS ───────────────────────────
                Solo se muestran los atributos que el dueño realmente cargó en esta
                categoría, y solo si tienen más de un valor distinto (sino no filtran nada) */}
            {dynamicFiltersContent}

            {gridAndPagination}
          </>
        )}

      </div>

      {/* ── FOOTER — misma info que el footer del home de cada template
          (nombre, redes, políticas, reportar tienda), con la paleta del tema activo ── */}
      <footer style={{ background: resolvedFooterBg ?? undefined, borderTop: resolvedFooterBg ? undefined : `1px solid ${borderFaint}`, padding:"32px 24px", textAlign:"center" }}>
        <p style={{ margin:"0 0 6px", fontWeight:700, fontSize:14, color:footerBrandColor, fontFamily:serif }}>{storeName}</p>
        <p style={{ margin:"0 0 12px", fontSize:11, color:footerFg, opacity:0.6 }}>
          © {new Date().getFullYear()} {storeName}. Todos los derechos reservados.
        </p>
        {(fromEditor || SOCIAL_NETWORKS.some(([key]) => socialLinks[key])) && (
          <div style={{ display:"flex", justifyContent:"center", gap:10, marginBottom:14 }}>
            {SOCIAL_NETWORKS.map(([key, label]) => {
              const url = socialLinks[key];
              if (!fromEditor && !url) return null;
              return (
                <a key={key} href={url || "#"} target={url ? "_blank" : undefined} rel="noopener noreferrer" aria-label={label}
                  onClick={e => { if (!url) e.preventDefault(); }}
                  style={{ width:30, height:30, borderRadius:"50%", border:`1px solid ${footerFg}`, color:footerFg, display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none", opacity: url ? 0.85 : 0.4 }}>
                  <SocialIcon network={key} />
                </a>
              );
            })}
          </div>
        )}
        <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:"0 16px" }}>
          {[["Política de devoluciones","devoluciones"],["Política de envíos","envios"],["Términos y condiciones","terminos"]].map(([label, tipo]) => (
            <a key={tipo} href={`/tienda/${slug}/politicas?tipo=${tipo}`} style={{ fontSize:10, color:footerFg, opacity:0.6, textDecoration:"none" }}>{label}</a>
          ))}
          <button onClick={() => setShowReport(true)}
            style={{ fontSize:10, color:footerFg, opacity:0.6, background:"none", border:"none", cursor:"pointer", padding:0, textDecoration:"underline" }}>
            Reportar tienda
          </button>
        </div>
      </footer>

      {showReport && <ReportStoreModal slug={slug} onClose={() => setShowReport(false)} />}

      {/* ── WHATSAPP FLOTANTE ─────────────────────────────────────────── */}
      {!cartOpen && !checkoutOpen && whatsapp?.enabled && (
        <>
          <style>{`
            @keyframes pp-wa-pulse { 0% { box-shadow:0 4px 20px rgba(37,211,102,0.4), 0 0 0 0 rgba(37,211,102,0.55); } 70% { box-shadow:0 4px 20px rgba(37,211,102,0.4), 0 0 0 14px rgba(37,211,102,0); } 100% { box-shadow:0 4px 20px rgba(37,211,102,0.4), 0 0 0 0 rgba(37,211,102,0); } }
            .pp-wa-fab { background:linear-gradient(135deg,#2be374,#1fae57); animation:pp-wa-pulse 2.4s ease-out infinite; }
            .pp-wa-fab:hover { animation-play-state:paused; }
          `}</style>
          <button
            className="pp-wa-fab"
            onClick={() => window.open(`https://wa.me/${(whatsapp.number ?? "5491100000000").replace(/\D/g,"")}${whatsapp.message ? "?text=" + encodeURIComponent(whatsapp.message) : ""}`, "_blank")}
            style={{ position:"fixed", bottom:24, right:24, zIndex:500, width:52, height:52, borderRadius:"50%", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"transform 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.transform="scale(1.1)")}
            onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </button>
        </>
      )}

      {/* ── MODAL PRODUCTO ─────────────────────────────────────────────── */}
      {modalProduct && (
        <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => { setModalProduct(null); setLightboxSrc(null); }}>
          <div style={{ position:"absolute", inset:0, background:overlayBg, backdropFilter:"blur(8px)" }}/>
          <div style={{ position: isMobile ? "absolute" : "relative", ...(isMobile ? {top:0,right:0,bottom:0,left:0} : {maxWidth:920, width:"calc(100% - 32px)", maxHeight:"92vh"}), background:S, overflow:"hidden", display:"flex", flexDirection:"column" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setModalProduct(null); setLightboxSrc(null); }} style={{ position:"absolute", top:10, right:10, zIndex:10, background:"rgba(0,0,0,0.65)", border:"none", color:"#fff", width:36, height:36, cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>×</button>
            <div style={{ overflow:"auto", flex:1, minHeight:0, display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
            {/* Galería */}
            <div>
              <div style={{ position:"relative" }} {...imgSwipe}>
                {(() => {
                  const hasNxM = modalProduct.promoType === "N_PAY_M" && !!modalProduct.promoQtyMin && !!modalProduct.promoPayQty;
                  const hasOffer = !variantPrice && !!modalProduct.comparePrice && modalProduct.comparePrice > modalProduct.price;
                  if (!hasNxM && !hasOffer) return null;
                  return <OfferBadge badge={hasNxM ? null : (modalProduct.offerBadge ?? null)} pct={hasOffer ? discountPercent(modalProduct.price, modalProduct.comparePrice) : null} nxm={hasNxM ? { n: modalProduct.promoQtyMin!, m: modalProduct.promoPayQty! } : undefined} size="md" />;
                })()}
                <img src={modalProduct.images[modalImg] ?? ""} alt={modalProduct.name}
                  style={{ width:"100%", aspectRatio:"3/4", objectFit:"cover", display:"block", cursor:"zoom-in" }}
                  onError={e => { e.currentTarget.style.opacity="0"; }}
                  onClick={() => setLightboxSrc(modalProduct.images[modalImg] ?? "")} />
                {modalProduct.images.length > 1 && (<>
                  <button onClick={() => setModalImg(i => (i-1+modalProduct.images.length)%modalProduct.images.length)}
                    style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", background:"rgba(0,0,0,0.45)", border:"none", color:"#fff", width:34, height:34, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, borderRadius:2 }}>‹</button>
                  <button onClick={() => setModalImg(i => (i+1)%modalProduct.images.length)}
                    style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"rgba(0,0,0,0.45)", border:"none", color:"#fff", width:34, height:34, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, borderRadius:2 }}>›</button>
                  <div style={{ position:"absolute", bottom:8, right:8, background:"rgba(0,0,0,0.5)", color:"#fff", fontSize:10, letterSpacing:1, padding:"3px 8px", borderRadius:2 }}>
                    {modalImg+1} / {modalProduct.images.length}
                  </div>
                </>)}
              </div>
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
            <div style={{ padding:"clamp(20px,4vw,36px) clamp(16px,3.5vw,32px)", display:"flex", flexDirection:"column", gap:18, overflowY: isMobile ? "visible" : "auto" }}>
              <div>
                <p style={{ fontSize:10, letterSpacing:3, color:GT, textTransform:"uppercase", marginBottom:6 }}>
                  {modalProduct.category}{modalProduct.subcategory && <span style={{ opacity:0.6 }}> › {modalProduct.subcategory}</span>}
                </p>
                <h2 style={{ fontFamily:serif, fontSize:24, margin:0, lineHeight:1.2, color:T }}>{modalProduct.name}</h2>
              </div>
              <div style={{ display:"flex", gap:6, marginBottom:2 }}>
                <button onClick={() => { const url = `${window.location.origin}${window.location.pathname}?p=${modalProduct.id}`; navigator.clipboard.writeText(url).catch(()=>{}); }}
                  style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:`1px solid ${border}`, color:MID, padding:"5px 12px", fontSize:10, letterSpacing:1, cursor:"pointer" }}>
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  Copiar link
                </button>
                {whatsapp?.enabled && whatsapp.number && (
                  <button onClick={() => {
                    const phone = whatsapp.number.replace(/\D/g, "");
                    const h = new Date().getHours();
                    const saludo = h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
                    const text = `${saludo}! Me interesa el producto "${modalProduct.name}". ¿Me podés dar más información?`;
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
                  }}
                    style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"1px solid rgba(37,211,102,0.3)", color:"rgba(37,211,102,0.7)", padding:"5px 12px", fontSize:10, letterSpacing:1, cursor:"pointer" }}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M11.897 0C5.395 0 .13 5.266.13 11.767c0 2.078.545 4.03 1.495 5.727L.057 24l6.7-1.757A11.71 11.71 0 0 0 11.897 23.534c6.503 0 11.768-5.265 11.768-11.767C23.67 5.266 18.4 0 11.897 0zm0 21.536h-.004a9.726 9.726 0 0 1-4.96-1.358l-.356-.211-3.678.965.982-3.581-.232-.368A9.73 9.73 0 0 1 2.158 11.767C2.158 6.355 6.551 2 11.897 2c2.581 0 5.007 1.007 6.831 2.831a9.604 9.604 0 0 1 2.828 6.83c0 5.347-4.393 9.875-9.659 9.875z"/></svg>
                    WhatsApp
                  </button>
                )}
              </div>
              <div style={{ display:"flex", gap:10, alignItems:"baseline" }}>
                <span style={{ fontSize:22, fontWeight:700, color:GT }}>{fmt(displayPrice)}</span>
                {!variantPrice && modalProduct.comparePrice && <span style={{ fontSize:14, color:MID, textDecoration:"line-through" }}>{fmt(modalProduct.comparePrice)}</span>}
              </div>
              {modalProduct.offerNote && (
                <div style={{ fontSize:12, color:"#059669", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:4, padding:"5px 10px", display:"flex", alignItems:"center", gap:6 }}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>{modalProduct.offerNote}</span>
                </div>
              )}
              {modalProduct.description && (
                <div style={{ borderTop:`1px solid ${borderFaint}`, paddingTop:14 }}>
                  <p style={{ fontSize:9, letterSpacing:2, textTransform:"uppercase", color:MID, margin:"0 0 8px", fontWeight:600, opacity:0.7 }}>Descripción</p>
                  <div className="product-rte" dangerouslySetInnerHTML={{ __html: modalProduct.description }} style={{ fontSize:13, color:MID, lineHeight:1.75 }} />
                </div>
              )}

              {(() => {
                const attrs = modalProduct.attributes ?? [];
                const condicionAttr = attrs.find(a => a.key === "Condición");
                const serviciosAttr = attrs.find(a => a.key === "Servicios");
                const otherAttrs = attrs.filter(a => a.key !== "Condición" && a.key !== "Servicios");
                let servicios: string[] = [];
                if (serviciosAttr) { try { servicios = Object.entries(JSON.parse(serviciosAttr.value)).filter(([, v]) => v).map(([k]) => k); } catch {} }
                if (!condicionAttr && otherAttrs.length === 0 && servicios.length === 0) return null;
                return (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {condicionAttr && (
                      <span style={{ alignSelf:"flex-start", fontSize:10, letterSpacing:2, textTransform:"uppercase", fontWeight:700, color:GT, border:`1px solid ${GT}`, padding:"4px 10px" }}>{condicionAttr.value}</span>
                    )}
                    {otherAttrs.length > 0 && (
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        {otherAttrs.map(a => (
                          <p key={a.key} style={{ fontSize:12, opacity:0.65, margin:0, color:T }}><span style={{ opacity:0.85 }}>{a.key}:</span> {a.value}</p>
                        ))}
                      </div>
                    )}
                    {servicios.length > 0 && (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                        {servicios.map(k => (
                          <span key={k} style={{ fontSize:10, letterSpacing:1, padding:"4px 10px", border:`1px solid ${border}`, color:T }}>✓ {k}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

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

              {modalProduct.promoQtyMin && modalProduct.promoQtyDiscount ? (
                <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:"auto" }}>
                  <p style={{ fontSize:9, letterSpacing:2, textTransform:"uppercase", color:GT, margin:0, fontWeight:600, opacity:0.7 }}>Promoción por cantidad</p>
                  <div style={{ fontSize:11, fontWeight:600, padding:"8px 12px", borderRadius:4, background: promoActive ? "rgba(52,211,153,0.1)" : `${G}10`, color: promoActive ? "#16a34a" : GT, border:`1px solid ${promoActive ? "rgba(52,211,153,0.25)" : `${G}30`}` }}>
                    {promoModalText(modalProduct.promoType, modalProduct.promoQtyMin!, modalProduct.promoQtyDiscount, modalProduct.promoPayQty, pendingTotal)}
                  </div>
                  {pendingItems.length > 0 && (
                    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      {pendingItems.map((item, idx) => (
                        <div key={idx} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:11, color:T, padding:"5px 8px", background:`${G}08`, borderRadius:3 }}>
                          <span>{[item.color, item.size].filter(Boolean).join(" / ") || "1 unidad"} ×{item.qty}</span>
                          <button onClick={() => removePendingItem(idx)} style={{ background:"none", border:"none", color:MID, cursor:"pointer", fontSize:14, padding:"0 2px" }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={addToPending} disabled={selectedVariantStock === 0}
                    style={{ background:"none", border:`1px solid ${selectedVariantStock === 0 ? `${G}30` : G}`, color: selectedVariantStock === 0 ? `${G}50` : GT, padding:"12px", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor: selectedVariantStock === 0 ? "not-allowed" : "pointer" }}>
                    {selectedVariantStock === 0 ? "Sin stock" : `+ Agregar a mi selección${pendingTotal > 0 ? ` (${pendingTotal})` : ""}`}
                  </button>
                  {pendingItems.length > 0 && (() => {
                    const total = pendingCartValue;
                    return (
                      <button onClick={addAllToCart} style={{ background:G, color:accentDark?"#000":"#fff", border:"none", padding:"14px", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor:"pointer" }}>
                        {promoActive ? `Agregar al carrito (${pendingTotal} uds) · ${fmt(total)} (-${pendingPromoDiscount}%)` : `Agregar al carrito (${pendingTotal} uds) · ${fmt(total)}`}
                      </button>
                    );
                  })()}
                </div>
              ) : (
                <button onClick={addToCart}
                  disabled={selectedVariantStock === 0}
                  style={{ background: selectedVariantStock === 0 ? `${G}40` : G, color:accentDark?"#000":"#fff", border:"none", padding:"15px", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor: selectedVariantStock === 0 ? "not-allowed" : "pointer", marginTop:"auto" }}>
                  {selectedVariantStock === 0 ? "Sin stock" : `Agregar al carrito · ${fmt(displayPrice * qty)}`}
                </button>
              )}

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
                    {reviews.slice(0, reviewsShown).map(r => (
                      <div key={r.id} style={{ borderBottom:`1px solid ${borderFaint}`, paddingBottom:14 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontSize:12, fontWeight:600, color:T }}>{r.reviewer}</span>
                          <span style={{ fontSize:13, color:GT }}>{[1,2,3,4,5].map(s => s <= r.rating ? "★" : "☆").join("")}</span>
                        </div>
                        {r.comment && <p style={{ fontSize:12, opacity:0.6, margin:0, lineHeight:1.6 }}>{r.comment}</p>}
                      </div>
                    ))}
                    {reviews.length > reviewsShown && (
                      <button onClick={() => setReviewsShown(n => n + 10)} style={{ alignSelf:"flex-start", background:"none", border:"none", color:GT, fontSize:11, fontWeight:700, letterSpacing:1, cursor:"pointer", padding:0, textDecoration:"underline" }}>
                        Ver más reseñas ({reviews.length - reviewsShown})
                      </button>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize:12, opacity:0.35, marginBottom:16 }}>Sé el primero en dejar una reseña.</p>
                )}
                {!fromEditor && isOwner ? (
                  <p style={{ fontSize:11, opacity:0.4, fontStyle:"italic" }}>El dueño no puede dejar reseñas en su propia tienda.</p>
                ) : reviewDone ? (
                  <p style={{ fontSize:12, color:GT, fontWeight:600 }}>¡Gracias por tu reseña!</p>
                ) : (
                  <div style={{ position:"relative" }}>
                    {fromEditor && <div style={{ position:"absolute", inset:0, zIndex:10, cursor:"default" }} onClick={e => e.stopPropagation()} />}
                    <form onSubmit={fromEditor ? e => e.preventDefault() : submitReview} style={{ display:"flex", flexDirection:"column", gap:10, opacity: fromEditor ? 0.55 : 1 }}>
                      <input value={reviewForm.reviewer} onChange={e => !fromEditor && setReviewForm(p => ({ ...p, reviewer: e.target.value }))}
                        placeholder="Tu nombre" readOnly={fromEditor}
                        style={{ background:modalInputBg, border:`1px solid ${inputBorder}`, color:T, padding:"9px 12px", fontSize:12, outline:"none" }}
                        onFocus={e => { if (!fromEditor) e.target.style.borderColor=G; }} onBlur={e => (e.target.style.borderColor=inputBorder)} />
                      <div style={{ display:"flex", gap:4 }}>
                        {[1,2,3,4,5].map(s => (
                          <button key={s} type="button" onClick={() => !fromEditor && setReviewForm(p => ({ ...p, rating: s }))}
                            style={{ background:"none", border:"none", fontSize:22, cursor: fromEditor ? "default" : "pointer", color: s <= reviewForm.rating ? G : `${T}30`, padding:"2px" }}>★</button>
                        ))}
                      </div>
                      <textarea value={reviewForm.comment} onChange={e => !fromEditor && setReviewForm(p => ({ ...p, comment: e.target.value }))}
                        placeholder="Comentario (opcional)" rows={3} readOnly={fromEditor}
                        style={{ background:modalInputBg, border:`1px solid ${inputBorder}`, color:T, padding:"9px 12px", fontSize:12, resize:"none", outline:"none", fontFamily:sans }}
                        onFocus={e => { if (!fromEditor) e.target.style.borderColor=G; }} onBlur={e => (e.target.style.borderColor=inputBorder)} />
                      <button type="submit" disabled={fromEditor || reviewSubmitting || !reviewForm.reviewer.trim()}
                        style={{ background: fromEditor || reviewSubmitting || !reviewForm.reviewer.trim() ? `${G}40` : G, color:accentDark?"#000":"#fff", border:"none", padding:"12px", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor: fromEditor || reviewSubmitting || !reviewForm.reviewer.trim() ? "not-allowed" : "pointer" }}>
                        {reviewSubmitting ? "Enviando..." : "Publicar reseña"}
                      </button>
                    </form>
                    {fromEditor && <p style={{ fontSize:10, opacity:0.45, fontStyle:"italic", marginTop:6 }}>Vista previa — solo disponible en la tienda real.</p>}
                  </div>
                )}
              </div>
            </div>
            {(() => {
              const others = products.filter(p => p.id !== modalProduct.id);
              const sameSub = modalProduct.subcategory ? others.filter(p => p.subcategory === modalProduct.subcategory) : [];
              const sameCat = others.filter(p => p.category === modalProduct.category && !sameSub.includes(p));
              const rest = others.filter(p => !sameSub.includes(p) && !sameCat.includes(p));
              const similar = [...sameSub, ...sameCat, ...rest].slice(0, 4);
              if (similar.length === 0) return null;
              return (
                <div style={{ gridColumn: isMobile ? undefined : "1 / -1", padding: isMobile ? "0 16px 24px" : "0 32px 32px", borderTop:`1px solid ${border}`, paddingTop:20 }}>
                  <p style={{ fontSize:10, letterSpacing:3, color:GT, textTransform:"uppercase", marginBottom:14 }}>Productos similares</p>
                  <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap:14 }}>
                    {similar.map(p => (
                      <div key={p.id} onClick={() => openModal(p)} style={{ cursor:"pointer" }}>
                        <img src={p.images[0] ?? ""} alt={p.name} style={{ width:"100%", aspectRatio:"3/4", objectFit:"cover", display:"block" }} onError={e => { e.currentTarget.style.opacity="0"; }} />
                        <p style={{ margin:"8px 0 2px", fontSize:12, color:T, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical" as const }}>{p.name}</p>
                        <p style={{ margin:0, fontSize:13, fontWeight:700, color:GT }}>{fmt(p.price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            </div>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX ──────────────────────────────────────────────────── */}
      {lightboxSrc && (
        <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.97)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="" style={{ maxWidth:"100vw", maxHeight:"100vh", objectFit:"contain", touchAction:"pinch-zoom" }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxSrc(null)} style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", width:44, height:44, borderRadius:"50%", fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
      )}

      {/* ── CARRITO ────────────────────────────────────────────────────── */}
      <div style={{ position:"fixed", inset:0, zIndex:150, pointerEvents: cartOpen ? "auto" : "none" }}>
        <div onClick={() => setCartOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.55)", opacity: cartOpen?1:0, transition:"opacity 0.3s" }}/>
        <div style={{ position:"absolute", top:0, right:0, bottom:0, left: isMobile ? 0 : "auto", width: isMobile ? "auto" : 420, background:S, transform: cartOpen?"translateX(0)":"translateX(100%)", transition:"transform 0.35s cubic-bezier(.4,0,.2,1)", display:"flex", flexDirection:"column" }}>
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
                      <span style={{ color:GT, fontWeight:700, fontSize:14 }}>{fmt(item.product.price * item.qty)}</span>
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
                <span style={{ fontSize:20, fontWeight:700, color:GT }}>{fmt(cartTotal)}</span>
              </div>
              <button onClick={isOwner ? undefined : openCheckout} disabled={isOwner} title={isOwner ? "No podés comprar en tu propia tienda" : undefined}
                style={{ width:"100%", background: isOwner ? "rgba(128,128,128,0.15)" : G, color: isOwner ? "rgba(128,128,128,0.5)" : accentDark?"#000":"#fff", border:"none", padding:"15px", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor: isOwner ? "not-allowed" : "pointer", marginBottom:10 }}>
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
                  style={{ background:G, color:accentDark?"#000":"#fff", border:"none", padding:"13px 32px", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor:"pointer" }}>
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
                          <p style={{ fontSize:13, color:GT, fontWeight:700, margin:0 }}>{fmt(item.product.price)} × {item.qty}</p>
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
                      style={{ background:"transparent", border:`1px solid ${inputBorder}`, color:GT, padding:"10px 16px", fontSize:11, letterSpacing:2, cursor:"pointer" }}>Aplicar</button>
                  </div>
                  {couponError && <p style={{ fontSize:11, color:"#f87171", marginBottom:8 }}>{couponError}</p>}
                  {appliedCoupon && (
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, padding:"8px 12px", background:`${G}15`, border:`1px solid ${G}40` }}>
                      <span style={{ fontSize:12, color:GT }}>Cupón {appliedCoupon.code} aplicado</span>
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
                        <span style={{ fontSize:13, color:GT }}>Descuento</span>
                        <span style={{ fontSize:13, color:GT }}>-{fmt(couponDiscount)}</span>
                      </div>
                    )}
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                      <span style={{ fontSize:13, opacity:0.55, color:T }}>Envío</span>
                      <span style={{ fontSize:13, opacity:0.55, color:T }}>{envioPrice===0?"Gratis":fmt(envioPrice)}</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ fontSize:15, fontWeight:700, color:T }}>Total</span>
                      <span style={{ fontSize:20, fontWeight:800, color:GT }}>{fmt(orderTotal)}</span>
                    </div>
                  </div>
                  {checkoutError && <p style={{ fontSize:12, color:"#f87171", marginTop:10 }}>{checkoutError}</p>}
                </div>

                <div style={{ padding:"14px 26px 26px", borderTop:`1px solid ${borderFaint}`, flexShrink:0 }}>
                  <button type="submit" disabled={checkoutStatus==="placing"}
                    style={{ width:"100%", background:G, color:accentDark?"#000":"#fff", border:"none", padding:"15px", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", opacity:checkoutStatus==="placing"?0.7:1 }}>
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
        <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", background:G, color:accentDark?"#000":"#fff", padding:"12px 24px", fontSize:13, fontWeight:700, zIndex:500, boxShadow:"0 4px 20px rgba(0,0,0,0.3)", whiteSpace:"nowrap" }}>
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
