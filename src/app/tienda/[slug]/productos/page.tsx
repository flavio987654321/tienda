"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef, useCallback, Suspense, Fragment } from "react";
import Link from "next/link";
import { useCartLogic } from "@/hooks/useCartLogic";
import type { StorefrontProduct, StorefrontVariant, PlaceOrderParams } from "@/hooks/useStorefront";
import { getDemoPool, fillTargetFor, parsePromotions } from "@/hooks/useStorefront";
import type { ActivePromotion } from "@/lib/pricing";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import { useResenasProducto, type ResenaProducto } from "@/hooks/useResenasProducto";
// Las fotos pasan por `next/image` (vía `FadeImage`, el mismo que usan los diez
// templates) y no por `<img>` sueltos: así el celular baja una versión del tamaño
// que va a mostrar y en WebP, en vez del JPG original de la cámara. Esta página
// dibuja el catálogo entero, que es donde más pesa.
import { FadeImage } from "@/components/store/templates/shared/FadeImage";
// El carrito y el checkout de esta página eran una COPIA escrita a mano de los
// que usan los diez templates. Los dos salen del mismo `useCartLogic`, así que la
// copia no aportaba nada — sólo se iba quedando atrás. Ver PL-1 en URBAN-PULSE.md.
import { CartDrawer, type CartTheme } from "@/components/store/templates/shared/CartDrawer";
import { CheckoutModal } from "@/components/store/templates/shared/CheckoutModal";
import { getContrastColor, getReadableAccentText, getReadableAccentFill, textoSobre } from "@/contexts/EditContext";
import { colorToSwatch } from "@/lib/colorSwatch";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import { OfferBadge } from "@/components/store/OfferBadge";
import { PromoTag, PromoBlock, PromoPrice, paletaDeTemplate } from "@/components/store/PromoDisplay";
import { useSombrasScroll } from "@/components/store/useSombrasScroll";
import StoreProductReels from "@/components/store/ProductReels";
import { discountPercent } from "@/lib/discount";
import { resolveProductPromo, describePromo, resolveStoreEvent, eventLabelOf } from "@/lib/promoDisplay";
import { resolveVariantPrice } from "@/lib/variantPrice";
import { useTurnstile } from "@/components/Turnstile";

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

// Reseñas: cuántas se ven de entrada y cuántas suma cada "Ver más". No se paginan
// a propósito — la lista vive adentro de un panel que scrollea, y con páginas
// tocar "siguiente" reemplaza el contenido ARRIBA de donde estás mirando. Además
// el servidor manda las 50 más recientes de una sola vez, así que "Ver más" no
// pide nada: solo deja de recortar una lista que ya está en memoria.
const PASO_RESENAS = 5;

// Reseñas de muestra para la vista previa del editor, cuando el producto todavía
// no tiene ninguna. Viven acá afuera y no adentro del componente porque son datos
// fijos: adentro se rearmaban en cada render y el hook las veía como una lista
// nueva cada vez.
const RESENAS_EJEMPLO: ResenaProducto[] = [
  { id:"ej-1", rating:5, comment:"Tal cual la foto y el talle justo. Llegó en tres días.", reviewer:"Micaela R.", createdAt:"2026-07-18T14:00:00.000Z" },
  { id:"ej-2", rating:5, comment:"La tela es muy buena para el precio. Ya pedí otro en el otro color.", reviewer:"Julián T.", createdAt:"2026-07-11T14:00:00.000Z" },
  { id:"ej-3", rating:4, comment:"Muy lindo, aunque me quedó un poco largo. Igual lo recomiendo.", reviewer:"Carla V.", createdAt:"2026-06-29T14:00:00.000Z" },
];

// Color de las estrellas llenas. Dorado fijo, NO el acento del template: las
// estrellas son doradas por convención en cualquier tienda, y atarlas al acento
// las volvía casi invisibles cuando el acento es claro. Es la misma decisión (y
// el mismo dorado) que ya había tomado ChicParis.
const STAR_ON = "#f59e0b";

/* ── Comentario de una reseña ──────────────────────────────────────────────────
   El tope del servidor es de 500 caracteres, que son unos 9 renglones: sin
   recortar, una sola reseña larga empuja a las demás fuera de la pantalla.
   Se recorta a 6 líneas y se despliega en el lugar.

   El "Leer todo" aparece SOLO si el texto de verdad no entró. No se decide por
   cantidad de caracteres —cuántos entran depende del ancho, que cambia entre
   celular y escritorio— sino midiendo el elemento ya dibujado. Con
   ResizeObserver, no una sola vez: al girar el teléfono la tarjeta cambia de
   ancho y un texto que entraba deja de entrar.
──────────────────────────────────────────────────────────────────────────────── */
function ComentarioResena({ texto, acento, color }: { texto: string; acento: string; color: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [cortado, setCortado] = useState(false);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const ahora = el.scrollHeight > el.clientHeight + 1;
      setCortado(prev => (prev === ahora ? prev : ahora));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [texto]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <p ref={ref} style={{
        fontSize:12, opacity:0.65, margin:0, lineHeight:1.65, color,
        ...(abierto ? {} : { display:"-webkit-box", WebkitLineClamp:6, WebkitBoxOrient:"vertical", overflow:"hidden" }),
      }}>{texto}</p>
      {cortado && !abierto && (
        <button type="button" onClick={() => setAbierto(true)}
          style={{ alignSelf:"flex-start", background:"none", border:"none", padding:0, cursor:"pointer",
                   fontSize:10, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:acento }}>
          Leer todo
        </button>
      )}
    </div>
  );
}
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
  category?: string;
  subcategory?: string;
  gender?: string;
  description?: string | null;
  images?: string;
  reelUrls?: string;
  variants?: StorefrontVariant[];
  attributes?: string;
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
  // Los valores salen del template, uno por uno: DARK #0f0f0f, BG #f5f5f5,
  // WHITE #ffffff, MID #777777 y el acento de fábrica #d4ff00 (que igual lo pisa
  // el que haya elegido la dueña, vía `accentOverride`).
  // Antes acá había una paleta azul marino con naranja —#0f172a, #1e293b,
  // #f97316— que no sale de ningún lado de Urban Pulse: el template es negro,
  // blanco y neón. El catálogo del home va sobre WHITE y las tarjetas son
  // blancas, así que esta página, que muestra exactamente lo mismo, iba clara.
  // Puestas una al lado de la otra parecían dos tiendas distintas.
  "urban-pulse": {
    BG:"#f5f5f5", S:"#ffffff", T:"#0f0f0f", G:"#d4ff00", MID:"#777777",
    border:"rgba(15,15,15,0.14)", borderFaint:"rgba(15,15,15,0.07)",
    inputBorder:"rgba(15,15,15,0.22)", inputBg:"#ffffff",
    serif:"Inter, system-ui, sans-serif", sans:"Inter, system-ui, sans-serif", dark:false,
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
  // Los colores de las promos siguen al template del que se viene: si no, el mismo
  // 3x2 se ve de un color en la portada y de otro una pantalla despues.
  const paletaPromo  = paletaDeTemplate(tParam);
  const fromEditor   = searchParams?.get("from") === "editor";
  const catParam     = searchParams?.get("categoria") ?? null;
  const subCatParam  = searchParams?.get("subcategoria") ?? null;
  const ofertaParam  = searchParams?.get("oferta") === "true";
  const [onlyOfertas, setOnlyOfertas] = useState(ofertaParam);
  const destacadoParam  = searchParams?.get("destacado") === "true";
  const [onlyDestacados, setOnlyDestacados] = useState(destacadoParam);
  const promoParam   = searchParams?.get("promo") === "true";
  const [onlyPromos, setOnlyPromos] = useState(promoParam);

  const [products,   setProducts]   = useState<StorefrontProduct[]>([]);
  const [promotions, setPromotions] = useState<ActivePromotion[]>([]);
  // Evento vigente de la tienda, si hay. Mismo resolvedor que el banner y que el
  // tag del producto: si el listado dice "Black Friday", es el mismo evento que
  // anuncia el banner. Cuando hay evento, el filtro de promociones pasa a
  // llamarse como él, en vez de sumar otro botón a una barra que ya tiene varios.
  const storeEvent = useMemo(() => resolveStoreEvent(promotions), [promotions]);
  // ...pero solo si el nombre del evento dice la verdad sobre lo que va a mostrar.
  // El filtro no filtra POR evento: muestra todo producto al que le llegue alguna
  // promo (ver `onlyPromos` más abajo). Con una campaña de San Valentín y un 3×2
  // suelto conviviendo, el botón decía "San Valentín" y traía también el 3×2.
  //
  // Así que el evento nombra al filtro solo cuando TODAS las promos vigentes son
  // de ese evento —el caso de la tienda chica que arma una campaña, que es para
  // quien se pensó—. Mezcladas, gana el nombre genérico.
  const eventoNombraFiltro = useMemo(() => {
    if (!storeEvent || promotions.length === 0) return null;
    return promotions.every(p => eventLabelOf(p) === storeEvent.label) ? storeEvent.label : null;
  }, [storeEvent, promotions]);
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

  // El formulario vive en un modal, igual que en el template: inline al final de
  // la lista quedaba inalcanzable con muchas reseñas cargadas.
  const [resenaModalOpen,  setResenaModalOpen]  = useState(false);
  // El email es opcional pero NO es de adorno: es lo que el servidor cruza contra
  // los pedidos entregados para poner el sello "✓ Compra verificada". Sin este
  // campo, una reseña dejada desde el listado no podía salir verificada nunca —
  // el modal del template sí lo pedía, así que la misma persona conseguía el sello
  // o no según desde qué pantalla escribiera.
  const [reviewForm,       setReviewForm]       = useState({ reviewer: "", rating: 5, comment: "", email: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const reviewCaptcha = useTurnstile("review");
  const [reviewDone,       setReviewDone]       = useState(false);
  const [isMobile,         setIsMobile]         = useState(false);
  // Alto de la fila de dos columnas del modal. Manda la columna izquierda (foto +
  // miniaturas + videos), que tiene alto propio; la derecha se ajusta a ese alto y
  // scrollea por dentro. Sin esto, la derecha crecía con la descripción y dejaba un
  // vacío blanco al lado de los reels, más grande cuanto más texto hubiera cargado
  // el vendedor. Se mide porque depende de cuántas miniaturas y cuántos reels tenga
  // el producto. Solo en escritorio: en celular las columnas se apilan.
  const colFotoRef = useRef<HTMLDivElement>(null);
  const [altoColFoto, setAltoColFoto] = useState<number | null>(null);
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

  const cart = useCartLogic({ products, promotions, slug, isOwner, isPreview: fromEditor, resolveVariantId, validateCoupon, placeOrder });
  // Sólo lo que dibuja ESTA página. Todo lo del carrito y el checkout —líneas con
  // promo, cupón, envío, pago, datos del comprador, totales— se le pasa entero a
  // `CartDrawer` y `CheckoutModal` en el objeto `cart`, así que no hace falta
  // desarmarlo acá. Antes se desarmaban cuarenta campos para alimentar la copia
  // escrita a mano.
  const {
    cartOpen, setCartOpen, cartCount, checkoutOpen,
    modalProduct, setModalProduct, modalImg, setModalImg,
    selectedSize, setSelectedSize, selectedColor, setSelectedColor, qty, setQty,
    toastMsg, openModal, addToCart,
    // Esta pantalla no los usaba: ni el talle ni el color avisaban que estaban
    // agotados hasta despues de elegirlos.
    outOfStockSizes, outOfStockColors,
    toggleFavorite, favorites,
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
        setPromotions(parsePromotions(data.store.promotions));
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

  // ¿Hay al menos un producto con precio anterior? De eso depende que se muestre
  // el filtro "En oferta" — se mira sobre TODO el catálogo y no sobre la categoría
  // abierta, para que el botón no aparezca y desaparezca al navegar entre
  // categorías, que se lee como un parpadeo y no como una decisión.
  const hayOfertas = useMemo(
    () => products.some(p => p.comparePrice != null && p.comparePrice > p.price),
    [products]
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
      if (onlyPromos) {
        // "En promoción" = alguna promo de TIENDA vigente alcanza al producto (precio
        // tachado, N×M, envío gratis o descuento condicional). Reusa el mismo resolver
        // que pinta el badge, para que filtro y cartel coincidan.
        const d = resolveProductPromo(p, promotions);
        if (!(d.hasPriceDrop || d.nxm || d.freeShipping || d.pctOff != null)) return false;
      }
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
  }, [productsInCategory, activeAttrFilters, priceRange, search, sortBy, onlyOfertas, onlyDestacados, onlyPromos, promotions]);

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
  // Promo de tienda para el modal, sobre el precio efectivo (variante si hay).
  const modalPromo = resolveProductPromo({ id: modalProduct?.id ?? "", price: displayPrice, category: modalProduct?.category ?? null }, promotions);
  // 3×2 EN VIVO: unidades que se PAGAN a la cantidad elegida (misma cuenta que el motor
  // en pricing.ts: paid = qty − floor(qty/n)·(n−m)). Con esto el hint y el total del botón
  // reflejan el beneficio N×M mientras el comprador sube la cantidad.
  const nxmPaid = modalPromo.nxm ? qty - Math.floor(qty / modalPromo.nxm.n) * (modalPromo.nxm.n - modalPromo.nxm.m) : null;

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

  /* ── Elegir foto / color / talle ─────────────────────────────────────────────
     Antes eran tres efectos que se disparaban entre sí. El de la foto, al ver una
     foto de otro color, cambiaba el color; y el del color volvía a mover la foto
     a la PRIMERA de ese color. Con productos de varias fotos del mismo color eso
     es un rebote: tocabas la segunda foto del azul y volvías sola a la primera.
     Verificado contra la base: 37 de los 90 productos activos tienen dos o más
     fotos del mismo color, y "Jean Skinny" tiene las cuatro en azul — ahí las
     flechas y las miniaturas directamente no servían para nada.

     Ahora se resuelve en el click, igual que en el template: `elegirFoto` pone la
     foto que se pidió y punto; el color solo se toca si esa foto es de otro.
  ──────────────────────────────────────────────────────────────────────────── */
  const attrsDe = (name: string): Record<string, unknown> | null => {
    try { const a = JSON.parse(name); return a && typeof a === "object" && !Array.isArray(a) ? a : null; } catch { return null; }
  };
  const valorAttr = (a: Record<string, unknown>, claves: string[]): string => {
    const k = Object.keys(a).find(x => claves.includes(x.toLowerCase()));
    return k != null && a[k] != null ? String(a[k]) : "";
  };
  const variantesConAttrs = (p: StorefrontProduct) =>
    p.variants.map(v => ({ v, a: attrsDe(v.name) }))
      .filter((x): x is { v: StorefrontProduct["variants"][number]; a: Record<string, unknown> } => !!x.a);
  const fotoDeColor = (p: StorefrontProduct, color: string) =>
    p.imageItems.findIndex(img => !!img.variantValue && img.variantValue.toLowerCase() === color.toLowerCase());

  // Si el talle puesto no existe en ese color, pasa al primero con stock.
  function acomodarTalleA(color: string) {
    if (!modalProduct) return;
    const delColor = variantesConAttrs(modalProduct)
      .filter(x => valorAttr(x.a, COLOR_ATTRS).toLowerCase() === color.toLowerCase());
    if (!delColor.length) return;
    if (selectedSize && delColor.some(x => valorAttr(x.a, SIZE_ATTRS).toLowerCase() === selectedSize.toLowerCase())) return;
    const mejor = delColor.find(x => x.v.stock > 0) ?? delColor[0];
    const talle = valorAttr(mejor.a, SIZE_ATTRS);
    if (talle && talle !== selectedSize) setSelectedSize(talle);
  }

  function elegirColor(color: string) {
    if (!modalProduct) return;
    setSelectedColor(color);
    const idx = fotoDeColor(modalProduct, color);
    if (idx !== -1) setModalImg(idx);
    acomodarTalleA(color);
  }

  // Acepta índices fuera de rango para que las flechas sean `elegirFoto(i ± 1)`.
  function elegirFoto(i: number) {
    if (!modalProduct) return;
    const total = modalProduct.images.length;
    if (!total) return;
    const idx = ((i % total) + total) % total;
    setModalImg(idx);
    const color = modalProduct.imageItems[idx]?.variantValue;
    if (!color || color.toLowerCase() === selectedColor.toLowerCase()) return;
    setSelectedColor(color);
    acomodarTalleA(color);
  }

  function elegirTalle(talle: string) {
    if (!modalProduct) return;
    setSelectedSize(talle);
    const conTalle = variantesConAttrs(modalProduct)
      .filter(x => valorAttr(x.a, SIZE_ATTRS).toLowerCase() === talle.toLowerCase());
    if (!conTalle.length) return;
    // Si el color puesto viene en ese talle, no se toca: lo eligió el comprador.
    if (selectedColor && conTalle.some(x => valorAttr(x.a, COLOR_ATTRS).toLowerCase() === selectedColor.toLowerCase())) return;
    const mejor = conTalle.find(x => x.v.stock > 0) ?? conTalle[0];
    const color = valorAttr(mejor.a, COLOR_ATTRS);
    if (!color || color === selectedColor) return;
    setSelectedColor(color);
    const idx = fotoDeColor(modalProduct, color);
    if (idx !== -1) setModalImg(idx);
  }

  // Lo único que sigue siendo un efecto: al ABRIR la ficha hay que mostrar la foto
  // del color con el que abre, y ahí no hubo ningún click que lo resuelva.
  useEffect(() => {
    if (!modalProduct || !selectedColor) return;
    const idx = fotoDeColor(modalProduct, selectedColor);
    if (idx !== -1) setModalImg(idx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalProduct?.id]);

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
    () => elegirFoto(modalImg + 1),
    () => elegirFoto(modalImg - 1)
  );

  // ── Reseñas del producto abierto ───────────────────────────────────────────
  // Carga, paginado, promedio y total. Antes estaba escrito acá a mano —igual que
  // en los cuatro templates de moda— y traía los tres bugs que explica el hook:
  // sin paginar (con 200 reseñas se llegaba a la 50 y las demás no existían), el
  // promedio calculado sobre las que habían llegado, y las reseñas del producto
  // anterior pegadas en la ficha si abrías dos seguidos.
  const resenasProd = useResenasProducto({
    slug, productId: modalProduct?.id,
    paso: PASO_RESENAS, ejemplos: RESENAS_EJEMPLO, isPreview: fromEditor,
  });

  useEffect(() => {
    if (!modalProduct) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de una interacción (abrir otra ficha), no se puede calcular durante el render
    setReviewDone(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalProduct?.id]);

  // ── Alto de la columna de la foto (ver dónde se declara `altoColFoto`) ──────
  useEffect(() => {
    const el = colFotoRef.current;
    if (isMobile || !modalProduct || !el) return;
    const ro = new ResizeObserver(() => {
      const alto = el.offsetHeight;
      setAltoColFoto(prev => (prev === alto ? prev : alto));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobile, modalProduct]);
  // Derivado y no un `setState(null)` adentro del efecto: apagarlo con estado
  // dispara un render en cascada. Al reabrir el modal el ResizeObserver mide de
  // nuevo apenas observa, así que no queda un alto viejo.
  const altoPanel = isMobile || !modalProduct ? null : altoColFoto;
  // Con la barra del panel oculta no queda senal de que hay mas para leer. Los
  // degradados la reponen, y solo cuando de verdad falta contenido.
  const { ref: panelRef, arriba: sombraArriba, abajo: sombraAbajo } =
    useSombrasScroll<HTMLDivElement>([altoPanel, modalProduct?.id]);

  // ── Tema activo ─────────────────────────────────────────────────────────────
  const th: Theme = THEMES[template] ?? THEMES["fashion-noir"];
  const G = accentOverride ?? th.G;
  const { BG, S, T, MID, border, borderFaint, inputBorder, inputBg, serif, sans, dark,
    tabStyle = "default", cardRadius = 0, titleStyle = "editorial", inputRadius = 0 } = th;
  // Texto blanco/negro sobre fondos pintados con el acento (G): se calcula según
  // el color real elegido, no según si el template en sí es claro u oscuro —
  // así un acento muy claro en un template claro sigue siendo legible.
  // El nombre engaña: no responde "¿el acento es oscuro?" sino "¿el texto que va
  // ARRIBA del acento tiene que ser oscuro?". Se mide con el contraste real de
  // WCAG y no con el umbral de luminosidad de getContrastColor, que en colores
  // saturados se equivoca: un naranja #ea580c pedía texto blanco (3.56 de
  // contraste) cuando el negro le daba 5.90.
  const accentDark = textoSobre(G) === "#111";
  // Para usar G como color de TEXTO (precio, marca, etc.) en vez de fondo de
  // botón: si el acento elegido casi no se distingue del fondo de la página,
  // caemos al color de texto normal del tema en vez de dejarlo invisible.
  const GT = getReadableAccentText(G, BG, T);
  // Un solo título de bloque para todo el modal (Descripción, Características,
  // Videos, Reseñas, Productos similares). Antes cada uno tenía el suyo: 9px con
  // opacity 0.7, 10px con opacity 0.5, 10px en GT... Leído de corrido no se veía
  // dónde terminaba una sección y empezaba la otra. Mismo criterio que el modal
  // del template.
  const tituloBloque: React.CSSProperties = {
    margin: "0 0 12px", fontSize: 10, fontWeight: 700, letterSpacing: 2.5,
    textTransform: "uppercase", color: MID,
  };
  // El talle/color ELEGIDO va con relleno sólido, como en el modal del template:
  // con borde y un tinte apenas se distinguía del no elegido. Se usa el acento
  // cuando se separa del fondo de la página como superficie y, si no (acentos casi
  // del color del fondo), cae al color de texto del tema — que en los templates
  // oscuros es claro y en los claros es oscuro, así que sirve para los 10.
  const chipBg   = getReadableAccentFill(G, BG, T);
  const chipText = getContrastColor(chipBg) === "light" ? "#fff" : "#111";

  /* ── El modal con la forma de Urban Pulse ────────────────────────────────────
     Esta página tiene UN modal para los cuatro templates de moda, y su forma es la
     de Chic Paris: foto a la izquierda al 48%, miniaturas en fila abajo, y todo lo
     demás —descripción, características, compartir— apilado en la columna derecha.
     Urban Pulse dejó de tener esa forma en UP-12: la derecha lleva SOLO lo que hace
     falta para comprar y queda clavada, mientras la izquierda corre por debajo.
     Abrir el mismo producto desde el home y desde el catálogo daba dos fichas
     visiblemente distintas — lo vio Flavio: "es como que usa el modal de productos
     pero del template de Chic Paris".
     Sólo en escritorio: en celular las dos formas son la misma columna apilada.
     Los otros tres siguen con la forma de siempre hasta que les toque su auditoría. */
  const modalUP = template === "urban-pulse" && !isMobile;

  /* Descripción y características salen acá afuera porque van en DOS lugares según
     el template: adentro del panel de compra en los otros tres, y abajo de la foto
     en Urban Pulse. Una sola definición para que no puedan quedar distintas. */
  const bloqueDescripcion = modalProduct?.description ? (
    <div style={{ borderTop:`1px solid ${borderFaint}`, paddingTop:18 }}>
      <p style={tituloBloque}>Descripción</p>
      {/* Sin recortar: el panel tiene alto fijo y scrollea, así que un
          texto largo ya no deforma nada — se lee bajando acá adentro. */}
      <div className="product-rte" dangerouslySetInnerHTML={{ __html: modalProduct.description }} style={{ fontSize:13, color:MID, lineHeight:1.75 }} />
    </div>
  ) : null;

  // El cuadro de datos técnicos no tenía ningún título: aparecía una
  // lista suelta después de la descripción y no se entendía qué era.
  const bloqueCaracteristicas = (() => {
    if (!modalProduct) return null;
    const attrs = modalProduct.attributes ?? [];
    const condicionAttr = attrs.find(a => a.key === "Condición");
    const serviciosAttr = attrs.find(a => a.key === "Servicios");
    const otherAttrs = attrs.filter(a => a.key !== "Condición" && a.key !== "Servicios");
    let servicios: string[] = [];
    if (serviciosAttr) { try { servicios = Object.entries(JSON.parse(serviciosAttr.value)).filter(([, v]) => v).map(([k]) => k); } catch {} }
    if (!condicionAttr && otherAttrs.length === 0 && servicios.length === 0) return null;
    return (
      <div style={{ borderTop:`1px solid ${borderFaint}`, paddingTop:18 }}>
        <p style={tituloBloque}>Características</p>
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
      </div>
    );
  })();

  /* En el editor, con el producto todavía sin reseñas, se muestran DE EJEMPLO:
     es la única forma de que el dueño vea el bloque lleno (el promedio, el
     gráfico de estrellas y las tarjetas). Mismo criterio, y mismo cartel de
     aviso, que el modal del template y que el bloque de prueba social de la home.
     Las fechas son fijas a propósito: una calculada al vuelo cambia entre el
     servidor y el navegador y rompe la hidratación. */
  const resenasDeEjemplo = resenasProd.usandoEjemplos;
  const resenasVisibles  = resenasProd.lista;
  // Fondo de inputs dentro del modal (cuyo fondo es S). Si inputBg coincide con S
  // (como en Urban Pulse donde ambos son #1e293b), los inputs desaparecen —
  // en ese caso usamos BG (el nivel más oscuro) para crear contraste visible.
  const modalInputBg = inputBg === S ? BG : inputBg;

  // La paleta de esta página traducida a la que esperan `CartDrawer` y
  // `CheckoutModal`. Ojo con los nombres, que no significan lo mismo de los dos
  // lados: en esos componentes `BG` es el fondo del PANEL (acá es la superficie,
  // `S`) y `S` es el fondo de los CAMPOS de texto.
  const cartTheme: CartTheme = {
    BG: S, S: modalInputBg, T, MID, border,
    accent: G, accentText: accentDark ? "#000" : "#fff", serif,
  };

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
        body: JSON.stringify({ productId: modalProduct.id, rating: reviewForm.rating, comment: reviewForm.comment, reviewer: reviewForm.reviewer, buyerEmail: reviewForm.email.trim() || undefined, turnstileToken: reviewCaptcha.token }),
      });
      if (res.ok) {
        const data = await res.json();
        resenasProd.agregar(data.review);
        setReviewForm({ reviewer: "", rating: 5, comment: "", email: "" });
        setReviewDone(true);
      }
    } catch {}
    finally { reviewCaptcha.reset(); setReviewSubmitting(false); }
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
      <button onClick={() => window.location.reload()} style={{ background:chipBg, color:chipText, border:"none", padding:"10px 24px", fontSize:12, fontWeight:700, cursor:"pointer", letterSpacing:2, textTransform:"uppercase" }}>
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

            // ── Badge de oferta/promo per-template ───────────────────────────
            // La promo de TIENDA (Fase 4.5) tiene prioridad sobre la "oferta" del
            // producto en el mismo badge → un solo badge, sin choque en la esquina.
            const cardPromo = resolveProductPromo(product, promotions);
            const hasCardOffer = !!product.comparePrice && product.comparePrice > product.price;
            const ofertaBadge = (() => {
              // PROMOCIÓN de tienda → tag rectangular naranja con el beneficio ("20% OFF", "3×2", "Envío gratis").
              if (cardPromo.primaryPromo) return <PromoTag tipo={cardPromo.primaryPromo.type} label={describePromo(cardPromo.primaryPromo).headline} size="sm" paleta={paletaPromo} />;
              // OFERTA del producto → badge rojo (precio anterior tachado del propio producto).
              if (hasCardOffer || product.offerBadge) return <OfferBadge badge={product.offerBadge ?? null} pct={hasCardOffer ? discountPercent(product.price, product.comparePrice) : null} size="sm" />;
              return null;
            })();

            // ── Contenedor de texto per-template ─────────────────────────────
            const textPad = (tabStyle === "pill" || tabStyle === "brutalist") ? "10px 14px 14px" : "0";
            const nameStyle: React.CSSProperties = tabStyle === "pill"
              ? { fontSize:14, color:T, margin:"0 0 6px", fontWeight:400, fontStyle:"italic", fontFamily:serif, lineHeight:1.35 }
              : tabStyle === "underline"
              ? { fontSize:13, color:T, margin:"0 0 6px", fontWeight:300, fontFamily:serif, lineHeight:1.35 }
              : tabStyle === "brutalist"
              ? { fontSize:12, color:T, margin:"0 0 6px", fontWeight:800, textTransform:"uppercase", letterSpacing:0.5, lineHeight:1.3 }
              : { fontSize:15, color:T, margin:"0 0 7px", fontWeight:500, fontFamily:serif, lineHeight:1.3 };
            // Las tres variantes cambian tamaño y peso —esa es la idea— pero el
            // COLOR es el mismo en las tres: `GT`, el acento ya validado contra el
            // fondo de la página. Dos de ellas usaban `G` crudo, y con un acento
            // claro (beige, crema) el precio se pintaba casi del color del fondo:
            // en chic-paris (fondo #f9f9f7) desaparecía entero y en la tarjeta solo
            // quedaba visible el precio TACHADO, que va en gris. O sea que se veía
            // el precio viejo y no el que se cobra.
            const priceStyle: React.CSSProperties = tabStyle === "brutalist"
              ? { fontSize:16, fontWeight:900, color:GT }
              : tabStyle === "underline"
              ? { fontSize:15, fontWeight:600, color:GT }
              : { fontSize:16, fontWeight:700, color:GT };

            // ── Imagen mb: 0 cuando el wrapper maneja el overflow ────────────
            const imgMb = (tabStyle === "pill" || tabStyle === "brutalist") ? 0 : 14;

            const cardInner = (
              <>
                <div style={{ position:"relative", aspectRatio:"3/4", overflow:"hidden", background:S, marginBottom:imgMb }}>
                  {product.images[0] ? (
                    <FadeImage src={product.images[0]} alt={product.name}
                      fill sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      className="pc-img"
                      // La transición va también acá y no solo en el CSS de
                      // `.pc-img`: `FadeImage` escribe su fundido en el `style`
                      // inline, que le gana a la hoja de estilos. Sin esto el
                      // acercamiento al pasar el mouse pasaba a ser un salto.
                      style={{ objectFit:"cover", transition:"transform 0.5s ease" }} />
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
                    <span style={{ background:chipBg, color:chipText, fontSize:10, fontWeight:800, letterSpacing:3, padding:"9px 20px", textTransform:"uppercase" }}>Ver detalle</span>
                  </div>
                </div>
                {/* Área de texto */}
                <div style={{ padding:textPad }}>
                  <p style={{ fontSize:10, color:MID, letterSpacing:2, textTransform:"uppercase", margin:"0 0 4px" }}>{product.category}</p>
                  <p style={nameStyle}>{product.name}</p>
                  <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                    {cardPromo.hasPriceDrop ? (
                      <>
                        <span style={{ ...priceStyle, color:"#dc2626" }}>{fmt(cardPromo.effectivePrice)}</span>
                        <span style={{ fontSize:12, color:MID, textDecoration:"line-through" }}>{fmt(cardPromo.originalPrice)}</span>
                      </>
                    ) : (
                      <>
                        <span style={priceStyle}>{fmt(product.price)}</span>
                        {product.comparePrice && <span style={{ fontSize:12, color:MID, textDecoration:"line-through" }}>{fmt(product.comparePrice)}</span>}
                      </>
                    )}
                  </div>
                  {/* Nota clara cuando el beneficio no es un tachado directo (3×2 / condicional / envío). */}
                  {cardPromo.nxm && <p style={{ margin:"4px 0 0", fontSize:11, color:"#16a34a", fontWeight:700 }}>Llevá {cardPromo.nxm.n}, pagá {cardPromo.nxm.m}</p>}
                  {cardPromo.pctOff != null && cardPromo.minOrder != null && <p style={{ margin:"4px 0 0", fontSize:11, color:"#dc2626", fontWeight:700 }}>{cardPromo.pctOff}% desde {fmt(cardPromo.minOrder)}</p>}
                  {cardPromo.freeShipping && !cardPromo.nxm && !cardPromo.hasPriceDrop && cardPromo.pctOff == null && <p style={{ margin:"4px 0 0", fontSize:11, color:"#0d9488", fontWeight:700 }}>{cardPromo.minOrder ? `Envío gratis desde ${fmt(cardPromo.minOrder)}` : "Envío gratis"}</p>}
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
                      fontWeight: isActive ? 700 : 500, color: isActive ? GT : T, cursor:"pointer", letterSpacing:0.2 }}>
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
                        color: !activeSubcategory && isActive ? GT : MID, cursor:"pointer" }}>
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
        {(activeCategory !== "Todos" || activeSubcategory || search || onlyOfertas || onlyDestacados || onlyPromos) && (
          <button onClick={() => { changeCategory("Todos"); setSearch(""); setOnlyOfertas(false); setOnlyDestacados(false); setOnlyPromos(false); }}
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
                <div style={{ position:"absolute", top:6, height:2, background:chipBg,
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
            <div style={{ position:"absolute", top:6, height:2, background:chipBg,
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
  /* Panel derecho del modal: scrollea pero sin dibujar su barra. Al lado de la del
     modal quedaban dos barras pegadas y no se entendia cual movia que. */
  .st-sin-barra::-webkit-scrollbar{display:none}.st-sin-barra{scrollbar-width:none;-ms-overflow-style:none}
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
              <span style={{ position:"absolute", top:-6, right:-6, background:chipBg, color:chipText, borderRadius:"50%", width:18, height:18, fontSize:10, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{cartCount}</span>
            )}
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1280, margin:"0 auto", padding:"clamp(32px,5vw,48px) clamp(16px,4vw,32px)" }}>

        {/* ── TÍTULO + BÚSQUEDA ──────────────────────────────────────── */}
        {/* Kicker per-template */}
        {(() => {
          // El título tiene que decir lo mismo que el botón que se tocó. Antes el
          // botón decía "San Valentín" y al hacer clic la página se titulaba "En
          // promoción": el comprador perdía la confirmación de haber llegado a
          // donde quería. El kicker de ofertas decía "Promociones", que además es
          // el otro concepto (oferta = precio anterior del producto; promoción =
          // regla de la tienda).
          const label = onlyPromos ? (eventoNombraFiltro ? "Campaña" : "Promociones activas") : onlyOfertas ? "Aprovechá" : onlyDestacados ? "Selección" : "Colección completa";
          const heading = onlyPromos ? (eventoNombraFiltro ?? "En promoción") : onlyOfertas ? "Ofertas" : onlyDestacados ? "Lo más buscado" : activeCategory === "Todos" ? "Todos los productos" : activeCategory;
          const sub = activeSubcategory;
          // Estilos de toggle per-template
          const toggleBase = (active: boolean): React.CSSProperties =>
            tabStyle === "pill"
              ? { background: active ? G : "rgba(44,34,24,0.06)", color: active ? (accentDark?"#000":"#fff") : T, border:`1px solid ${active ? G : "rgba(44,34,24,0.15)"}`, borderRadius:999, padding:"9px 18px", fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" as const, transition:"background 0.2s, border-color 0.2s" }
              : tabStyle === "underline"
              // El estilo "underline" no pinta fondo: el acento se usa como TEXTO,
              // así que va GT y no G crudo. Con G se volvía invisible cuando el
              // acento se parecía al fondo de la página — un acento #fafafa dejaba
              // el filtro elegido en blanco sobre blanco. La rayita de abajo es
              // superficie, no texto, y por eso usa chipBg, que se cae al color del
              // tema recién cuando ni como línea se distingue.
              ? { background:"none", color: active ? GT : T, border:"none", borderBottom:`2px solid ${active ? chipBg : "transparent"}`, padding:"9px 4px", fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" as const, transition:"border-color 0.2s, color 0.2s" }
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
                  <p style={{ fontSize:11, letterSpacing:3, color:G, textTransform:"uppercase", margin:"0 0 8px", fontWeight:700 }}>{"// "}{label}</p>
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
                    <div style={{ width:40, height:2, background:chipBg, marginBottom:8 }} />
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
                <button onClick={() => { setOnlyDestacados(o => !o); setOnlyOfertas(false); setOnlyPromos(false); setPage(1); }} style={toggleBase(onlyDestacados)}>
                  ⭐ Lo más buscado
                </button>
                {/* Solo si de verdad hay alguna oferta. Este filtro SÍ filtra
                    (a diferencia de "Lo más buscado", que solo reordena): sin
                    ningún producto con precio anterior, tocarlo dejaba el catálogo
                    vacío. Un filtro que lleva a la nada es peor que no tenerlo —
                    el visitante no lee "no hay ofertas ahora", lee "no tienen
                    nada". El de promos, al lado, ya se cuidaba solo. */}
                {hayOfertas && (
                  <button onClick={() => { setOnlyOfertas(o => !o); setOnlyDestacados(false); setOnlyPromos(false); setPage(1); }} style={toggleBase(onlyOfertas)}>
                    🔥 En oferta
                  </button>
                )}
                {promotions.length > 0 && (
                  <button onClick={() => { setOnlyPromos(o => !o); setOnlyOfertas(false); setOnlyDestacados(false); setPage(1); }} style={toggleBase(onlyPromos)}>
                    {eventoNombraFiltro ? `🎁 ${eventoNombraFiltro}` : "🎁 En promoción"}
                  </button>
                )}
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
                    <span style={{ background:chipBg, color:chipText, borderRadius:"50%", width:18, height:18, fontSize:10, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>
                      {Object.values(activeAttrFilters).filter(v => v.length > 0).length + (priceRange ? 1 : 0)}
                    </span>
                  )}
                </button>
              )}
              {(activeCategory !== "Todos" || activeSubcategory || search || onlyOfertas || onlyDestacados || onlyPromos || Object.keys(activeAttrFilters).length > 0 || priceRange) && (
                <button onClick={() => { changeCategory("Todos"); setSearch(""); setOnlyOfertas(false); setOnlyDestacados(false); setOnlyPromos(false); clearAttrFilters(); setPriceRange(null); }}
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

              {(activeCategory !== "Todos" || activeSubcategory || search || onlyOfertas || onlyDestacados || onlyPromos || Object.keys(activeAttrFilters).length > 0 || priceRange) && (
                <button onClick={() => { changeCategory("Todos"); setSearch(""); setOnlyOfertas(false); setOnlyDestacados(false); setOnlyPromos(false); clearAttrFilters(); setPriceRange(null); }}
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
                    ? { display:"flex", alignItems:"stretch", border:"none", borderBottom:`2px solid ${isActive ? chipBg : "transparent"}`, paddingBottom:8, transition:"border-color 0.2s" }
                    : tabStyle === "brutalist"
                    ? { display:"flex", alignItems:"stretch", border:`2px solid ${isActive ? G : border}`, boxShadow: isActive ? `3px 3px 0 ${G}` : "none", transition:"border-color 0.15s, box-shadow 0.15s" }
                    : { display:"flex", alignItems:"stretch", border:`1px solid ${isActive ? G : border}`, transition:"border-color 0.2s" };
                  // Botón principal del tab per-template
                  const tabBtnStyle: React.CSSProperties = tabStyle === "pill"
                    ? { background: isActive ? G : "transparent", color: isActive ? (accentDark?"#000":"#fff") : T, border:"none", padding:"8px 18px", fontSize:11, letterSpacing:1, cursor:"pointer", fontWeight:600, textTransform:"uppercase", whiteSpace:"nowrap" as const, transition:"background 0.2s, color 0.2s" }
                    : tabStyle === "underline"
                    ? { background:"none", color: isActive ? GT : T, border:"none", padding:"8px 0", fontSize:12, letterSpacing:2, cursor:"pointer", fontWeight: isActive ? 700 : 400, textTransform:"uppercase", whiteSpace:"nowrap" as const, transition:"color 0.2s, font-weight 0.15s", fontFamily:serif }
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
                {(activeCategory !== "Todos" || activeSubcategory || search || onlyOfertas || onlyDestacados || onlyPromos) && (
                  <button onClick={() => { changeCategory("Todos"); setSearch(""); setOnlyOfertas(false); setOnlyDestacados(false); setOnlyPromos(false); }}
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
          {/* 1080 y no 980 en Urban Pulse: es el ancho del modal del template. La
              columna de compra se lleva entre 300 y 400, así que con 980 a la foto
              le quedaban ~600 y con 1080 le quedan ~700. */}
          <div style={{ position: isMobile ? "absolute" : "relative", ...(isMobile ? {top:0,right:0,bottom:0,left:0} : {maxWidth: modalUP ? 1080 : 980, width:"calc(100% - 32px)", maxHeight:"92vh"}), background:S, overflow:"hidden", display:"flex", flexDirection:"column" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setModalProduct(null); setLightboxSrc(null); }} style={{ position:"absolute", top:10, right:10, zIndex:10, background:"rgba(0,0,0,0.65)", border:"none", color:"#fff", width:36, height:36, cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>×</button>
            {/* 48% para la foto, como en el modal del template (ahí es el mismo
                número). A 50/50 la columna de comprar quedaba más angosta de lo
                necesario y los chips de talle se apretaban en 768. */}
            {/* En Urban Pulse la columna de compra se mide con `clamp` en vez de
                dejarle el resto: 36% del modal, nunca menos de 300 ni más de 400 —
                los mismos números que el template. Y `alignItems:start` para que el
                panel no se estire al alto de la fila, que es lo que le permite
                quedarse clavado. */}
            <div style={{ overflow:"auto", flex:1, minHeight:0, display:"grid",
                          gridTemplateColumns: isMobile ? "1fr" : (modalUP ? "minmax(0,1fr) clamp(300px, 36%, 400px)" : "48% 1fr"),
                          ...(modalUP ? { alignItems:"start" as const } : {}) }}>
            {/* Galería — `alignSelf:start` para que no se estire al alto de la
                columna de al lado y quede aire muerto abajo de las miniaturas. */}
            {/* El aire lo pone la COLUMNA, no cada bloque: asi la foto, las
                miniaturas y los videos arrancan todos en la misma vertical. */}
            <div ref={colFotoRef} style={{ alignSelf: "start", boxSizing: "border-box",
                                           ...(modalUP ? { gridColumn: 1 } : {}),
                                           padding: isMobile ? 0 : (modalUP ? "26px 26px 0" : "28px 0 28px 28px") }}>
              {/* En Urban Pulse las miniaturas van en tira VERTICAL a la izquierda de
                  la foto, y el hueco se lo hace este `paddingLeft`. Van en absoluto
                  —adentro del bloque de abajo— a propósito: el alto de la fila lo
                  tiene que fijar la FOTO, y si la tira fuera un hermano normal, diez
                  miniaturas la estirarían y la foto se iría con ellas. */}
              <div style={{ position:"relative", ...(modalUP && modalProduct.images.length > 1 ? { paddingLeft: 84 } : {}) }}>
              {modalUP && modalProduct.images.length > 1 && (
                <div style={{ position:"absolute", left:0, top:0, bottom:0, width:72, overflowY:"auto", scrollbarWidth:"none", display:"flex", flexDirection:"column", gap:8 }}>
                  {modalProduct.images.map((img, i) => (
                    <button key={i} onClick={() => elegirFoto(i)} aria-label={`Ver foto ${i+1}`}
                      style={{ position:"relative", width:72, height:90, flexShrink:0, padding:0, cursor:"pointer", overflow:"hidden", background:BG,
                               border: i === modalImg ? `3px solid ${T}` : `1px solid ${border}`, opacity: i === modalImg ? 1 : 0.5 }}>
                      <FadeImage src={img} alt="" fill sizes="72px" style={{ objectFit:"cover" }} />
                    </button>
                  ))}
                </div>
              )}
              {/* `aspectRatio` acá arriba: la foto pasó a `fill`, que se mide
                  contra el contenedor. Antes el alto lo ponía la propia imagen. */}
              <div style={{ position:"relative", aspectRatio:"3/4" }} {...imgSwipe}>
                {(() => {
                  // La PROMOCIÓN de tienda se muestra como tag rectangular (naranja) — distinta
                  // de la OFERTA del producto (badge rojo), para que se distingan de un vistazo.
                  if (modalPromo.primaryPromo) {
                    return <PromoTag tipo={modalPromo.primaryPromo.type} label={describePromo(modalPromo.primaryPromo).headline} paleta={paletaPromo} />;
                  }
                  const hasOffer = !variantPrice && !!modalProduct.comparePrice && modalProduct.comparePrice > modalProduct.price;
                  if (hasOffer || modalProduct.offerBadge) return <OfferBadge badge={modalProduct.offerBadge ?? null} pct={hasOffer ? discountPercent(modalProduct.price, modalProduct.comparePrice) : null} size="md" />;
                  return null;
                })()}
                <FadeImage src={modalProduct.images[modalImg] ?? "/placeholder.jpg"} alt={modalProduct.name}
                  fill sizes="(max-width: 768px) 100vw, 480px"
                  style={{ objectFit:"cover", cursor:"zoom-in" }}
                  onClick={() => setLightboxSrc(modalProduct.images[modalImg] ?? "")} />
                {modalProduct.images.length > 1 && (<>
                  <button onClick={() => elegirFoto(modalImg - 1)} aria-label="Imagen anterior"
                    style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", background:"rgba(0,0,0,0.45)", border:"none", color:"#fff", width:34, height:34, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, borderRadius:2 }}>‹</button>
                  <button onClick={() => elegirFoto(modalImg + 1)} aria-label="Imagen siguiente"
                    style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"rgba(0,0,0,0.45)", border:"none", color:"#fff", width:34, height:34, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, borderRadius:2 }}>›</button>
                  <div style={{ position:"absolute", bottom:8, right:8, background:"rgba(0,0,0,0.5)", color:"#fff", fontSize:10, letterSpacing:1, padding:"3px 8px", borderRadius:2 }}>
                    {modalImg+1} / {modalProduct.images.length}
                  </div>
                </>)}
              </div>
              </div>
              {!modalUP && modalProduct.images.length > 1 && (
                /* 56×74 como en el modal del template: cuadradas de 48 recortaban
                   la prenda a un cuadrado y la miniatura no se parecía a la foto
                   que abría. Misma proporción 3/4 que la foto grande.
                   En Urban Pulse no van acá: van en la tira vertical de arriba. */
                <div style={{ display:"flex", gap:8, padding: isMobile ? "10px 14px 0" : "10px 0 0", overflowX:"auto", scrollbarWidth:"none" }}>
                  {modalProduct.images.map((img, i) => (
                    <button key={i} onClick={() => elegirFoto(i)} aria-label={`Ver foto ${i + 1}`}
                      style={{ width:56, height:74, flexShrink:0, padding:0, overflow:"hidden", background:S, border: i===modalImg ? `2px solid ${GT}` : `1px solid ${border}`, cursor:"pointer", transition:"border-color 0.2s" }}>
                      <FadeImage src={img} alt="" width={56} height={74} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                    </button>
                  ))}
                </div>
              )}
            {/* ── Videos, debajo de la foto y DENTRO de esta columna ────────────
                Acá el espacio a la derecha de los reels no es un vacío: es la
                columna de la descripción. Por eso van adentro y no a lo ancho —
                a lo ancho son 3 miniaturas angostas solas en una fila de 1030px,
                y no hay forma de que la llenen.
                Usa el MISMO componente que los templates en vez de la copia inline
                que había acá: esa embebía el video en 160px y lo hacía mirar en un
                recuadro, sin pantalla completa ni swipe entre videos, y ya se
                estaba separando del otro (flechas y puntitos propios). Un solo
                lugar para arreglar cuando algo falle. */}
            {modalProduct.reelUrls.length > 0 && (
              <div style={{ padding: isMobile ? "18px 16px 0" : "22px 0 0" }}>
                <p style={tituloBloque}>Videos del producto</p>
                <StoreProductReels
                  reelUrls={modalProduct.reelUrls}
                  ancho={isMobile ? 120 : 160}
                  theme={{ accent: G, text: T, border: border, radius: 8 }}
                />
              </div>
            )}
            </div>
            {/* Detalle — se ajusta al alto de la columna de la foto y scrollea por
                dentro, igual que en el modal del template. Este panel termina justo
                donde arranca Reseñas; de ahí para abajo scrollea el modal, así que
                los dos scrolls no compiten. En celular no aplica: columnas apiladas
                y sin alto fijo, porque cortaría el contenido. */}
            {/* En Urban Pulse el panel se CLAVA y abarca todas las filas de la
                grilla, así que la columna izquierda —foto, descripción, videos,
                reseñas, similares— corre por debajo mientras el precio y el botón
                de comprar quedan siempre a la vista. `span 8` cubre de sobra los
                bloques que puede tener la izquierda; las filas implícitas que
                sobren miden cero porque no tienen contenido ni hay `gap`.
                Y no lleva el alto medido (`altoPanel`): ese es el otro mecanismo,
                el de los tres templates restantes, donde el panel se ajusta al alto
                de la foto y scrollea por dentro. Los dos juntos se pelean. */}
            <div style={{ position:"relative", display:"flex", minWidth:0,
                          ...(modalUP ? { gridColumn:2, gridRow:"1 / span 8", position:"sticky" as const, top:0, alignSelf:"start" as const, borderLeft:`3px solid ${T}`, maxHeight:"92vh", overflowY:"auto" as const } : {}) }}>
            {/* Degradados: reponen la señal que se perdió al ocultar la barra.
                Aparecen solo si de verdad queda contenido de ese lado. */}
            {!modalUP && sombraArriba && (
              <div style={{ position:"absolute", left:0, right:0, top:0, height:28, zIndex:2, pointerEvents:"none",
                            background:`linear-gradient(to top, transparent, ${S})` }} />
            )}
            {!modalUP && sombraAbajo && (
              <div style={{ position:"absolute", left:0, right:0, bottom:0, height:44, zIndex:2, pointerEvents:"none",
                            background:`linear-gradient(to bottom, transparent, ${S})` }} />
            )}
            <div ref={panelRef} className="st-sin-barra" style={{ flex:1, padding:"clamp(20px,4vw,36px) clamp(16px,3.5vw,32px)", display:"flex", flexDirection:"column", gap:18, minHeight:0,
                          ...(!modalUP && altoPanel ? { maxHeight: altoPanel, overflowY:"auto" as const } : {}) }}>
              <div>
                <p style={{ fontSize:10, letterSpacing:3, color:GT, textTransform:"uppercase", marginBottom:6 }}>
                  {modalProduct.category}{modalProduct.subcategory && <span style={{ opacity:0.6 }}> › {modalProduct.subcategory}</span>}
                </p>
                <h2 style={{ fontFamily:serif, fontSize:24, margin:0, lineHeight:1.2, color:T }}>{modalProduct.name}</h2>
              </div>
              {/* El precio va pegado al título. Antes en el medio estaban los dos
                  botones de compartir, que son lo último que hace alguien que
                  todavía no sabe cuánto cuesta — bajaron al final del panel. */}
              <div style={{ display:"flex", gap:10, alignItems:"baseline", flexWrap:"wrap" }}>
                {modalPromo.hasPriceDrop ? (
                  <>
                    <span style={{ fontSize:22, fontWeight:700, color:"#dc2626" }}>{fmt(modalPromo.effectivePrice)}</span>
                    <span style={{ fontSize:14, color:MID, textDecoration:"line-through" }}>{fmt(modalPromo.originalPrice)}</span>
                    {modalPromo.pctOff != null && (
                      <span style={{ fontSize:12, fontWeight:800, color:"#16a34a", background:"#dcfce7", padding:"2px 8px", borderRadius:4, letterSpacing:0.3, whiteSpace:"nowrap" }}>
                        {modalPromo.pctOff}% OFF
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span style={{ fontSize:22, fontWeight:700, color:GT }}>{fmt(displayPrice)}</span>
                    {!variantPrice && modalProduct.comparePrice && <span style={{ fontSize:14, color:MID, textDecoration:"line-through" }}>{fmt(modalProduct.comparePrice)}</span>}
                  </>
                )}
              </div>
              {/* Bloque explicativo de la promo (headline + alcance + condiciones), estilo Tiendanube. */}
              {modalPromo.primaryPromo && <PromoBlock promo={modalPromo.primaryPromo} freeShippingExtra={modalPromo.freeShipping} paleta={paletaPromo} />}
              {modalProduct.offerNote && (
                <div style={{ fontSize:12, color:"#059669", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:4, padding:"5px 10px", display:"flex", alignItems:"center", gap:6 }}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>{modalProduct.offerNote}</span>
                </div>
              )}
              {/* ── Comprar ─────────────────────────────────────────────────
                  Color, talle, cantidad y el botón, todo junto y ARRIBA de la
                  descripción. Antes había que pasar la descripción entera y la
                  tabla de características para llegar a elegir el talle. */}
              {/* Talle primero y color después, el mismo orden que el modal del
                  template. Los títulos van a secas ("TALLE", no "TALLE: 32"):
                  repetir el valor elegido en el título es decir dos veces lo
                  mismo, y el chip marcado ya lo dice. */}
              {modalProduct.sizes.length > 0 && (
                <div>
                  <p style={tituloBloque}>Talle</p>
                  <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                    {modalProduct.sizes.map(size => {
                      const sinStock = outOfStockSizes.has(size);
                      return (
                        <button key={size} onClick={() => elegirTalle(size)}
                          style={{ width:44, height:44, fontSize:12, fontWeight: selectedSize===size ? 800 : 600, border: `2px solid ${selectedSize===size ? chipBg : border}`, background: selectedSize===size ? chipBg : "transparent", color: selectedSize===size ? chipText : T, cursor:"pointer", transition:"all 0.2s", opacity: sinStock ? 0.35 : 1, textDecoration: sinStock ? "line-through" : "none" }}>
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {modalProduct.colors.length > 0 && (
                <div>
                  <p style={tituloBloque}>Color</p>
                  <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                    {/* Con el puntito de muestra, como en el modal del template:
                        "Petróleo" o "Arena" no le dicen nada a nadie hasta verlo. */}
                    {modalProduct.colors.map(color => {
                      const swatch = colorToSwatch(color);
                      const sinStock = outOfStockColors.has(color);
                      return (
                        <button key={color} onClick={() => elegirColor(color)}
                          style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 14px", fontSize:11, border: `2px solid ${selectedColor===color ? chipBg : border}`, background: selectedColor===color ? chipBg : "transparent", color: selectedColor===color ? chipText : T, fontWeight: selectedColor===color ? 700 : 400, cursor:"pointer", transition:"all 0.2s", opacity: sinStock ? 0.35 : 1, textDecoration: sinStock ? "line-through" : "none" }}>
                          {/* El anillo del puntito usa el color del TEXTO del chip,
                              que por construcción contrasta con su fondo. Con un
                              anillo fijo oscuro, el color "Negro" elegido quedaba
                              como un puntito negro sobre un chip negro — invisible.
                              Y en los templates oscuros pasaba lo mismo con
                              "Blanco". */}
                          {swatch && <span style={{ width:14, height:14, borderRadius:"50%", background:swatch, border:`1px solid ${selectedColor===color ? chipText : "rgba(0,0,0,0.25)"}`, flexShrink:0 }} />}
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Apilada como talle y color, no en línea: eran tres controles del
                  mismo tipo puestos de dos formas distintas. */}
              <div>
                <p style={tituloBloque}>Cantidad</p>
                <div style={{ display:"flex", alignItems:"center", border:`1px solid ${border}`, width:"fit-content" }}>
                  <button onClick={() => setQty(q => Math.max(1,q-1))} style={{ width:36, height:36, background:"none", border:"none", color:T, fontSize:18, cursor:"pointer" }}>−</button>
                  <span style={{ width:36, textAlign:"center", fontSize:14, color:T }}>{qty}</span>
                  <button onClick={() => setQty(q => q+1)} style={{ width:36, height:36, background:"none", border:"none", color:T, fontSize:18, cursor:"pointer" }}>+</button>
                </div>
              </div>

              {/* 3×2 en vivo: progreso del beneficio N×M según la cantidad elegida. */}
              {modalPromo.nxm && nxmPaid != null && (() => {
                const { n, m } = modalPromo.nxm;
                const free = qty - nxmPaid;
                const toNext = (n - (qty % n)) % n;
                return (
                  <div style={{ fontSize:12.5, fontWeight:700, padding:"9px 12px", borderRadius:6, background: free > 0 ? "rgba(22,163,74,0.10)" : "#fff7ed", border:`1px solid ${free > 0 ? "rgba(22,163,74,0.28)" : "#fed7aa"}`, color: free > 0 ? "#16a34a" : "#c2410c" }}>
                    {free > 0
                      ? `🎉 Llevás ${qty}, pagás ${nxmPaid} · ${free} gratis${toNext > 0 ? ` — sumá ${toNext} y llevás otra gratis` : ""}`
                      : `Promo ${n}×${m} · sumá ${toNext} más y una te sale gratis`}
                  </div>
                );
              })()}

              {selectedVariantStock !== null && selectedVariantStock === 0 && (
                <p style={{ fontSize:12, color:"#f87171", fontWeight:600, margin:0 }}>Sin stock en esta combinación</p>
              )}
              {selectedVariantStock !== null && selectedVariantStock > 0 && selectedVariantStock <= 5 && (
                <p style={{ fontSize:12, color:"#fb923c", fontWeight:600, margin:0 }}>¡Últimas {selectedVariantStock} unidades!</p>
              )}

              {/* El botón más importante del modal iba pintado con el acento CRUDO.
                  Con un acento claro sobre un panel claro eso es un botón blanco
                  sobre fondo blanco: quedaba el texto flotando, sin botón. Se ve en
                  la captura de Flavio del 28/07 — "AGREGAR AL CARRITO · $48.000"
                  suelto en el aire.
                  Usa `chipBg`/`chipText`, que es el mismo par que ya usan los chips
                  de talle y color tres líneas más arriba, en este mismo panel:
                  `getReadableAccentFill` devuelve el acento cuando de verdad se
                  despega del fondo como superficie, y cuando no, el color de texto
                  del tema. Por eso en la captura los chips SÍ se veían y el botón
                  no: los chips ya pasaban por el helper y el botón no. */}
              <button onClick={addToCart}
                disabled={selectedVariantStock === 0}
                style={{ background: selectedVariantStock === 0 ? `${chipBg}40` : chipBg, color:chipText, border:"none", padding:"15px", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor: selectedVariantStock === 0 ? "not-allowed" : "pointer" }}>
                {selectedVariantStock === 0 ? "Sin stock" : `Agregar al carrito · ${fmt(nxmPaid != null ? nxmPaid * displayPrice : (modalPromo.hasPriceDrop ? modalPromo.effectivePrice : displayPrice) * qty)}`}
              </button>

              {/* En Urban Pulse estos dos no van acá: bajan a la columna izquierda,
                  debajo de la foto. El panel se queda SOLO con lo de comprar. */}
              {!modalUP && bloqueDescripcion}
              {!modalUP && bloqueCaracteristicas}

              {/* Compartir — al final: es lo que se hace DESPUÉS de decidir, no
                  antes de saber el precio, que es donde estaba. */}
              <div style={{ borderTop:`1px solid ${borderFaint}`, paddingTop:18, display:"flex", gap:6, flexWrap:"wrap" }}>
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
            </div>
            </div>

            {/* Urban Pulse: la descripción y las características bajan acá, en la
                columna izquierda y abajo de la foto, en vez de ir apiladas adentro
                del panel de compra. Es lo que le permite al panel quedarse corto y
                clavado: si la descripción viviera ahí adentro, el panel volvería a
                medir varias pantallas y el botón de comprar se iría de la vista con
                el primer producto que tenga texto largo. */}
            {modalUP && (bloqueDescripcion || bloqueCaracteristicas) && (
              <div style={{ gridColumn:1, padding:"26px 26px 0", display:"flex", flexDirection:"column", gap:18 }}>
                {bloqueDescripcion}
                {bloqueCaracteristicas}
              </div>
            )}

            {/* ── Reseñas — a lo ANCHO, igual que en el template ──────────────
                Adentro de la columna de detalles eran lo más largo del panel: la
                estiraban muy por debajo de la foto y encima se leían en media
                pantalla. Acá abajo entran a lo ancho y las tarjetas van de a dos
                por fila (ver más abajo), que es donde el renglón queda en ~64
                caracteres en vez de ~140. */}
            <div style={{ gridColumn: isMobile ? undefined : (modalUP ? 1 : "1 / -1"), borderTop:`1px solid ${border}`, padding: isMobile ? "20px 16px" : "24px 32px" }}>
                <p style={{ ...tituloBloque, marginBottom: 20 }}>
                  Reseñas{resenasProd.total > 0 && ` (${resenasProd.total})`}
                </p>
                {/* Solo en el editor: aclara que lo de abajo es de mentira. Sin
                    esto el dueño cree que ya tiene reseñas. */}
                {resenasDeEjemplo && (
                  <div style={{ display:"flex", gap:9, margin:"0 0 16px", padding:"10px 13px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8, maxWidth:620 }}>
                    <span style={{ flexShrink:0, fontSize:13, lineHeight:1.4 }}>⚠️</span>
                    <p style={{ margin:0, fontSize:11.5, color:"#92400e", lineHeight:1.55 }}>
                      <strong>Estas reseñas son de ejemplo.</strong> Este producto todavía no tiene ninguna:
                      están para que veas cómo queda el bloque. No se publican y desaparecen solas en cuanto
                      llegue la primera de verdad.
                    </p>
                  </div>
                )}
                {/* El botón va ACÁ, arriba de la lista: con muchas reseñas
                    cargadas, abajo del todo no lo encuentra nadie. */}
                {!(!fromEditor && isOwner) && !reviewDone && (
                  <button type="button" onClick={() => setResenaModalOpen(true)}
                    style={{ marginBottom:18, background:"none", border:`1px solid ${GT}`, color:GT, padding:"10px 22px", fontSize:10, fontWeight:800, letterSpacing:2, textTransform:"uppercase", cursor:"pointer" }}>
                    Escribí tu reseña
                  </button>
                )}
                {resenasProd.cargando ? (
                  <p style={{ fontSize:12, opacity:0.4 }}>Cargando...</p>
                ) : resenasVisibles.length > 0 ? (
                  <div style={{ marginBottom:24 }}>
                    {/* Resumen: promedio + distribución. Los tres números salen de
                        la base, no de las reseñas que llegaron — ver el hook. */}
                    {(() => {
                      const avg = resenasProd.promedio;
                      const dist = [5,4,3,2,1].map(s => ({ stars:s, count: resenasProd.distribucion[s] ?? 0 }));
                      return (
                        <div style={{ display:"flex", gap:20, alignItems:"center", marginBottom:20, padding:"14px 16px", background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", borderRadius:6 }}>
                          <div style={{ textAlign:"center", minWidth:56 }}>
                            <p style={{ fontSize:34, fontWeight:800, color:T, margin:0, lineHeight:1 }}>{avg.toFixed(1)}</p>
                            <div style={{ display:"flex", gap:2, justifyContent:"center", margin:"6px 0 4px" }}>
                              {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize:11, color: s <= Math.round(avg) ? STAR_ON : `${T}22` }}>★</span>)}
                            </div>
                            <p style={{ fontSize:9, opacity:0.4, margin:0, letterSpacing:0.5 }}>{resenasProd.total} reseña{resenasProd.total !== 1 ? "s" : ""}</p>
                          </div>
                          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}>
                            {dist.map(d => (
                              <div key={d.stars} style={{ display:"flex", alignItems:"center", gap:8 }}>
                                <span style={{ fontSize:9, color:GT, minWidth:14, textAlign:"right", opacity:0.7 }}>{d.stars}★</span>
                                <div style={{ flex:1, height:4, background: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)", borderRadius:2, overflow:"hidden" }}>
                                  <div style={{ height:"100%", width:`${resenasProd.total ? (d.count / resenasProd.total) * 100 : 0}%`, background:chipBg, borderRadius:2 }} />
                                </div>
                                <span style={{ fontSize:9, opacity:0.35, minWidth:12, textAlign:"right" }}>{d.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    {/* Lista — de a dos por fila en escritorio: a lo ancho del
                        modal, una sola columna daba renglones de ~140 caracteres,
                        casi el doble de lo que el ojo sigue sin perderse (60-80). */}
                    <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", columnGap:32, alignItems:"start" }}>
                      {resenasVisibles.slice(0, resenasProd.mostradas).map(r => (
                        <div key={r.id} style={{ display:"flex", gap:12, padding:"16px 0", borderBottom:`1px solid ${borderFaint}` }}>
                          <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0, background:`${G}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:GT }}>
                            {r.reviewer.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                              <span style={{ fontSize:13, fontWeight:700, color:T }}>{r.reviewer}</span>
                              <span style={{ fontSize:10, opacity:0.35 }}>
                                {new Date(r.createdAt).toLocaleDateString("es-AR", { day:"numeric", month:"short", year:"numeric" })}
                              </span>
                            </div>
                            <div style={{ display:"flex", gap:1, marginBottom: r.comment ? 8 : 0 }}>
                              {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize:12, color: s <= r.rating ? STAR_ON : `${T}20` }}>★</span>)}
                            </div>
                            {/* Recortado a 6 líneas con "Leer todo". El tope del
                                servidor es de 500 caracteres: sin recorte, una
                                sola reseña larga son ~9 renglones y empuja a las
                                otras fuera de la pantalla. */}
                            {/* El color es `T` (el texto normal del tema) al 65%, no
                                `MID`: MID ya es un gris apagado y al 65% sobre el
                                fondo del modal el comentario quedaba casi invisible.
                                Antes esto no pasaba porque el <p> no fijaba color y
                                heredaba T — se perdió al extraer el componente. */}
                            {r.comment && <ComentarioResena texto={r.comment} acento={GT} color={T} />}
                          </div>
                        </div>
                      ))}
                    </div>
                    {resenasProd.hayMas && (
                      <button onClick={resenasProd.verMas} disabled={resenasProd.cargandoMas} style={{ marginTop:14, background:"none", border:`1px solid ${border}`, color:GT, fontSize:10, fontWeight:700, letterSpacing:1.5, cursor: resenasProd.cargandoMas ? "default" : "pointer", padding:"8px 20px", textTransform:"uppercase", display:"block" }}>
                        {resenasProd.cargandoMas ? "Cargando…" : `Ver más (${resenasProd.faltan})`}
                      </button>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize:12, opacity:0.35, marginBottom:16 }}>Sé el primero en dejar una reseña.</p>
                )}
                {/* El formulario se fue al modal que abre el botón de arriba. Acá
                    quedan los dos casos en los que no hay nada que escribir. */}
                {!fromEditor && isOwner && (
                  <p style={{ fontSize:11, opacity:0.4, fontStyle:"italic", marginTop:4 }}>El dueño no puede dejar reseñas en su propia tienda.</p>
                )}
                {reviewDone && (
                  <p style={{ fontSize:12, color:GT, fontWeight:600, marginTop:4 }}>¡Gracias por tu reseña!</p>
                )}
            </div>
            {(() => {
              const others = products.filter(p => p.id !== modalProduct.id);
              const sameSub = modalProduct.subcategory ? others.filter(p => p.subcategory === modalProduct.subcategory) : [];
              const sameCat = others.filter(p => p.category === modalProduct.category && !sameSub.includes(p));
              const rest = others.filter(p => !sameSub.includes(p) && !sameCat.includes(p));
              const similar = [...sameSub, ...sameCat, ...rest].slice(0, 4);
              if (similar.length === 0) return null;
              return (
                <div style={{ gridColumn: isMobile ? undefined : (modalUP ? 1 : "1 / -1"), padding: isMobile ? "0 16px 24px" : "0 32px 32px", borderTop:`1px solid ${border}`, paddingTop:20 }}>
                  <p style={{ fontSize:10, letterSpacing:3, color:GT, textTransform:"uppercase", marginBottom:14 }}>Productos similares</p>
                  <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap:14 }}>
                    {similar.map(p => (
                      <div key={p.id} onClick={() => openModal(p)} style={{ cursor:"pointer" }}>
                        {/* El precio salía de `fmt(p.price)` a secas: mostraba el de
                            lista aunque el producto tuviera promo u oferta, así que
                            el mismo producto valía una cosa acá y otra al abrirlo.
                            `PromoPrice` es el que ya usa el resto de la tienda. */}
                        <div style={{ position:"relative", aspectRatio:"3/4" }}>
                          <FadeImage src={p.images[0] ?? "/placeholder.jpg"} alt={p.name} fill sizes="(max-width: 768px) 50vw, 25vw" style={{ objectFit:"cover" }} />
                          {(() => {
                            const pr = resolveProductPromo(p, promotions);
                            if (pr.primaryPromo) return <PromoTag tipo={pr.primaryPromo.type} label={describePromo(pr.primaryPromo).headline} size="sm" paleta={paletaPromo} />;
                            const enOferta = !!p.comparePrice && p.comparePrice > p.price;
                            if (!enOferta && !p.offerBadge) return null;
                            return <OfferBadge badge={p.offerBadge ?? null} pct={enOferta ? discountPercent(p.price, p.comparePrice) : null} size="sm" />;
                          })()}
                        </div>
                        <p style={{ margin:"8px 0 2px", fontSize:12, color:T, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical" as const }}>{p.name}</p>
                        <PromoPrice product={p} promotions={promotions} fmt={fmt} accent={GT} sobre={T}
                          priceSize={13} compareSize={11} weight={700} />
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

      {/* ── MODAL: reseña del producto ─────────────────────────────────
          Lo abre "Escribí tu reseña", que está arriba de la lista. Antes el
          formulario era lo último de la ficha: con muchas reseñas cargadas había
          que bajarlas todas para llegar a escribir la propia.
          zIndex 250: por encima de la ficha (200) y por debajo del lightbox (300). */}
      {modalProduct && resenaModalOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:250, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", display:"flex", alignItems: isMobile ? "flex-end" : "center", justifyContent:"center", padding: isMobile ? 0 : 20 }}
          onClick={() => setResenaModalOpen(false)}>
          <div style={{ background:S, width:"100%", maxWidth:460, maxHeight:"92vh", overflowY:"auto", position:"relative", borderRadius: isMobile ? "12px 12px 0 0" : 0 }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setResenaModalOpen(false)} aria-label="Cerrar"
              style={{ position:"absolute", top:10, right:10, background:"none", border:"none", color:MID, width:32, height:32, cursor:"pointer", fontSize:22, lineHeight:1 }}>×</button>
            <div style={{ padding: isMobile ? "28px 22px 26px" : "30px 28px 26px" }}>
              <p style={{ ...tituloBloque, marginBottom:4 }}>Tu reseña</p>
              {/* De qué producto es: el modal tapa la ficha. */}
              <p style={{ margin:"0 0 16px", fontSize:12, color:MID, lineHeight:1.5 }}>
                Sobre <strong style={{ color:T }}>{modalProduct.name}</strong>.
              </p>
              <form onSubmit={fromEditor ? e => e.preventDefault() : submitReview} style={{ display:"flex", flexDirection:"column", gap:10, opacity: fromEditor ? 0.55 : 1 }}>
                <input value={reviewForm.reviewer} onChange={e => !fromEditor && setReviewForm(p => ({ ...p, reviewer: e.target.value }))}
                  placeholder="Tu nombre" readOnly={fromEditor}
                  style={{ background:modalInputBg, border:`1px solid ${inputBorder}`, color:T, padding:"10px 12px", fontSize:13, outline:"none" }}
                  onFocus={e => { if (!fromEditor) e.target.style.borderColor=G; }} onBlur={e => (e.target.style.borderColor=inputBorder)} />
                <div>
                  <input value={reviewForm.email} onChange={e => !fromEditor && setReviewForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="Tu email (opcional — verifica tu compra)" type="email" readOnly={fromEditor} autoComplete="email"
                    style={{ width:"100%", boxSizing:"border-box", background:modalInputBg, border:`1px solid ${inputBorder}`, color:T, padding:"10px 12px", fontSize:13, outline:"none" }}
                    onFocus={e => { if (!fromEditor) e.target.style.borderColor=G; }} onBlur={e => (e.target.style.borderColor=inputBorder)} />
                  <p style={{ fontSize:10.5, color:MID, margin:"4px 0 0", lineHeight:1.4 }}>
                    Si compraste acá, tu reseña mostrará &ldquo;✓ Compra verificada&rdquo;. El email no se publica.
                  </p>
                </div>
                <div style={{ display:"flex", gap:4 }}>
                  {[1,2,3,4,5].map(s => (
                    <button key={s} type="button" onClick={() => !fromEditor && setReviewForm(p => ({ ...p, rating: s }))}
                      aria-label={`${s} de 5 estrellas`}
                      style={{ background:"none", border:"none", fontSize:24, lineHeight:1, cursor: fromEditor ? "default" : "pointer", color: s <= reviewForm.rating ? STAR_ON : `${T}30`, padding:"2px" }}>★</button>
                  ))}
                </div>
                <textarea value={reviewForm.comment} onChange={e => !fromEditor && setReviewForm(p => ({ ...p, comment: e.target.value }))}
                  placeholder="Comentario (opcional)" rows={3} readOnly={fromEditor}
                  style={{ background:modalInputBg, border:`1px solid ${inputBorder}`, color:T, padding:"10px 12px", fontSize:13, resize:"none", outline:"none", fontFamily:sans }}
                  onFocus={e => { if (!fromEditor) e.target.style.borderColor=G; }} onBlur={e => (e.target.style.borderColor=inputBorder)} />
                {!fromEditor && reviewCaptcha.widget}
                <button type="submit" disabled={fromEditor || reviewSubmitting || !reviewForm.reviewer.trim() || !reviewCaptcha.ready}
                  style={{ background: fromEditor || reviewSubmitting || !reviewForm.reviewer.trim() ? `${G}40` : G, color:accentDark?"#000":"#fff", border:"none", padding:"13px", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor: fromEditor || reviewSubmitting || !reviewForm.reviewer.trim() ? "not-allowed" : "pointer" }}>
                  {reviewSubmitting ? "Enviando..." : "Publicar reseña"}
                </button>
              </form>
              {fromEditor && (
                <p style={{ margin:"10px 0 0", fontSize:10, opacity:0.45, fontStyle:"italic", textAlign:"center" }}>
                  Vista previa — el formulario funciona en tu tienda publicada.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX ──────────────────────────────────────────────────── */}
      {lightboxSrc && (
        <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.97)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setLightboxSrc(null)}>
          {/* Este SÍ se queda como <img>. Es la vista de zoom: se abre justamente
              para mirar la foto ENTERA, al tamaño original y con pinch-zoom.
              Pasarla por `next/image` la redimensionaría al alto de la pantalla,
              que es lo contrario de lo que la persona pidió al abrirla. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxSrc} alt="" style={{ maxWidth:"100vw", maxHeight:"100vh", objectFit:"contain", touchAction:"pinch-zoom" }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxSrc(null)} style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", width:44, height:44, borderRadius:"50%", fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
      )}

      {/* ── CARRITO Y CHECKOUT ─────────────────────────────────────────
          Los mismos componentes que usan los diez templates, no una copia.
          Acá había 315 líneas escritas a mano que dibujaban lo mismo a partir del
          MISMO `useCartLogic`, así que no aportaban nada propio: sólo se iban
          quedando atrás cada vez que se le agregaba algo al compartido. Se habían
          quedado atrás en dos cosas concretas, las dos invisibles hasta que un
          comprador se choca con ellas:

            · El aviso de envío gratis ("Agregá $X más y el envío es gratis") sólo
              aparecía en el checkout. En el carrito, que es donde la persona
              decide si sigue comprando, no estaba.
            · Los mínimos de venta mayorista no se avisaban en ningún lado. El
              comprador cargaba el carrito, iba al checkout y el pedido le
              rebotaba sin que nada le hubiera dicho antes que faltaba mínimo.

          El tema traduce la paleta de esta página a la del componente: en el
          carrito `BG` es el fondo del panel, y en el checkout `S` es el fondo de
          los campos. `modalInputBg` ya resuelve el caso de los templates donde el
          fondo de campo coincide con la superficie y los inputs desaparecen. */}
      <CartDrawer cart={cart} theme={cartTheme} isOwner={isOwner} isPreview={fromEditor} whatsapp={whatsapp ?? undefined} />
      <CheckoutModal cart={cart} theme={cartTheme} isPreview={fromEditor} storeSlug={slug} />

      {/* ── TOAST ──────────────────────────────────────────────────────── */}
      {toastMsg && (
        <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", background:chipBg, color:chipText, padding:"12px 24px", fontSize:13, fontWeight:700, zIndex:500, boxShadow:"0 4px 20px rgba(0,0,0,0.3)", whiteSpace:"nowrap" }}>
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
