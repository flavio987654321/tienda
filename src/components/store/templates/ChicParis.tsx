"use client";
import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { usePushBell } from "@/contexts/PushBellContext";
import { useAuth } from "@/components/AuthProvider";
import StoreFollowButton from "@/components/store/StoreFollowButton";
import { EditableZone, EditableImageButton, EditableSectionBg, getContrastColor, getReadableAccentText, getReadableAccentFill, useEditContext } from "@/contexts/EditContext";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useCartLogic } from "@/hooks/useCartLogic";
import { useHomeReviews, type EjemplosDeResenas } from "@/hooks/useHomeReviews";
import { ResenaComentario } from "@/components/store/templates/shared/ResenaComentario";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import { masVistos, MIN_MAS_VISTOS } from "@/lib/masVistos";
import { COMENTARIO_MAX, RESENADOR_MAX } from "@/lib/reviews";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import VerifiedIconButton from "@/components/store/VerifiedIconButton";
import { CartDrawer, type CartTheme } from "@/components/store/templates/shared/CartDrawer";
import { OfferBadge } from "@/components/store/OfferBadge";
import { PromoTag, PromoBlock, PromoPrice, coloresPromo } from "@/components/store/PromoDisplay";
import { useSombrasScroll } from "@/components/store/useSombrasScroll";
import { resolveProductPromo, describePromo } from "@/lib/promoDisplay";
import { CheckoutModal } from "@/components/store/templates/shared/CheckoutModal";
import { ContactForm } from "@/components/store/templates/shared/ContactForm";
import { FadeImage } from "@/components/store/templates/shared/FadeImage";
import StoreProductReels from "@/components/store/ProductReels";
import { SectionBlock } from "@/components/store/templates/shared/SectionBlock";
import { parseVariantAttrs } from "@/lib/variantAttrs";
import { colorToSwatch } from "@/lib/colorSwatch";
import { discountPercent } from "@/lib/discount";
import { resolveVariantPrice } from "@/lib/variantPrice";
import { useTurnstile } from "@/components/Turnstile";

type Product = StorefrontProduct;

/* ── Comentario de una reseña en la portada ────────────────────────────────────
   Las tarjetas van en una fila que las estira a todas al alto de la más alta, así
   que un comentario largo agranda TODAS. Se recorta a 6 líneas.

   El "Ver reseña completa" aparece SOLO si el texto de verdad no entró. No se
   decide por la cantidad de caracteres —cuántos entran depende del ancho de la
   tarjeta, que cambia entre celular y escritorio— sino midiendo el elemento ya
   dibujado: si lo que ocupa el texto supera lo que se ve, está cortado.

   Se mide con ResizeObserver y no una sola vez, porque al girar el teléfono o
   achicar la ventana la tarjeta cambia de ancho y un texto que entraba deja de
   entrar. Observar además dispara solo la primera vez, así que no hace falta
   medir a mano y encadenar un render de más.
──────────────────────────────────────────────────────────────────────────────── */
// ── Reseñas de ejemplo, SOLO para el editor y la galería de templates ────────
// Sirven para diseñar el bloque con algo adentro. En la tienda publicada no
// aparecen nunca. Van colgadas de PRODUCTOS REALES de la tienda —lo hace el
// hook—: antes eran nombres inventados con `image: null` y el editor mostraba la
// tarjeta SIN la foto, que es la mitad de lo que se ve en la tienda de verdad.
//
// Son propias de Chic Paris: Urban Pulse tiene las suyas, con su voz.
const EJEMPLOS_RESENAS_CP: EjemplosDeResenas = {
  producto: [
    { id:"cp-p1", rating:5, comment:"Calidad increíble y llegó rapidísimo. Ya compré tres veces y siempre perfecta.", reviewer:"María L.",     verified:true,  verifiedBy:"auto"  },
    { id:"cp-p2", rating:5, comment:"El diseño es exactamente como en las fotos. Me enamoré cuando lo vi puesto.",   reviewer:"Sofía M.",     verified:false, verifiedBy:null    },
    { id:"cp-p3", rating:4, comment:"Excelente atención y envío super rápido. La recomiendo sin dudarlo.",           reviewer:"Valentina R.", verified:true,  verifiedBy:"owner" },
    { id:"cp-p4", rating:5, comment:"Super recomendada, el packaging es hermoso y llegó antes de lo esperado.",      reviewer:"Camila F.",    verified:false, verifiedBy:null    },
  ],
  tienda: [
    { id:"cp-t1", rating:5, comment:"La atención fue impecable. Me respondieron todas las dudas por WhatsApp antes de comprar.", reviewer:"Lucía P.",    verified:true,  verifiedBy:"auto" },
    { id:"cp-t2", rating:5, comment:"Llegó todo en tiempo y forma, muy bien embalado. Vuelvo a comprar seguro.",                 reviewer:"Agustina B.", verified:false, verifiedBy:null   },
  ],
};

const SIZE_ATTRS = ["talle","size","talla","talles","sizes","tamaño","tamano","almacenamiento","ram","versión","version","formato","variante","material","sabor","peso/tamaño","peso"];
const COLOR_ATTRS = ["color","colour","colores","colors","tono"];

/* ── Foto ↔ color ↔ talle ─────────────────────────────────────────────────────
   Las tres cosas están atadas: el dueño le asigna un color a cada foto en el
   editor de producto, y cada variante es un combo color+talle con su stock.
   Tocar cualquiera de las tres tiene que acomodar a las otras dos.
──────────────────────────────────────────────────────────────────────────────── */

/** Valor de un atributo de variante buscando la clave por nombre (talle, color…). */
function valorAttr(attrs: Record<string, unknown>, claves: string[]): string {
  const k = Object.keys(attrs).find(x => claves.includes(x.toLowerCase()));
  return k != null && attrs[k] != null ? String(attrs[k]) : "";
}

/** Las variantes con sus atributos ya parseados; las que no son JSON quedan afuera. */
function variantesConAttrs(p: Product) {
  return p.variants
    .map(v => ({ v, a: parseVariantAttrs(v.name) }))
    .filter((x): x is { v: Product["variants"][number]; a: Record<string, unknown> } => !!x.a);
}

/** Índice de la foto que el dueño le asignó a ese color, o -1 si ninguna. */
function fotoDeColor(p: Product, color: string): number {
  return p.imageItems.findIndex(img => !!img.variantValue && img.variantValue.toLowerCase() === color.toLowerCase());
}

const BANNER_COUNT = 3;

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

const CP_SECTION_IDS = ["cp-strip", "cp-mayorista", "cp-productos", "cp-ofertas", "cp-masvisto", "cp-prueba-social", "cp-nosotros", "cp-contacto"];

/* ── Ícono de carrito flotante — variantes para elegir en modo edición ── */
const CART_ICON_OPTIONS: React.ReactNode[] = [
  <Fragment key="bag"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></Fragment>,
  <Fragment key="cart"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></Fragment>,
  <Fragment key="basket"><path d="M5 11 2 7h20l-3 4"/><path d="M4 11h16l-1.7 8.5a2 2 0 0 1-2 1.5H7.7a2 2 0 0 1-2-1.5L4 11Z"/><path d="M9 11V8a3 3 0 0 1 6 0v3"/></Fragment>,
];

/* ── Strip icon sets — 4 options per slot ──────────────────── */
const STRIP_ICONS: React.ReactNode[][] = [
  [ // Slot 0: envío
    <svg key="truck" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    <svg key="box" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    <svg key="zap" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    <svg key="gift" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
  ],
  [ // Slot 1: cambios/devoluciones
    <svg key="refresh" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16"/><polyline points="21 3 21 8 16 8"/><polyline points="3 21 3 16 8 16"/></svg>,
    <svg key="undo" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>,
    <svg key="check-circle" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    <svg key="arrows-lr" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  ],
  [ // Slot 2: pago seguro
    <svg key="shield" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
    <svg key="lock" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    <svg key="card" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    <svg key="award" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  ],
  [ // Slot 3: atención
    <svg key="chat" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    <svg key="phone" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    <svg key="headset" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>,
    <svg key="mail" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  ],
];

const STRIP_ITEMS = [
  { slot: 0, titleField: "garantia1Title", titleDefault: "Envío gratis",    descField: "garantia1Desc", descDefault: "En compras mayores a $30.000" },
  { slot: 1, titleField: "garantia2Title", titleDefault: "Cambios sin cargo", descField: "garantia2Desc", descDefault: "Hasta 30 días después de la compra" },
  { slot: 2, titleField: "garantia3Title", titleDefault: "Pago seguro",      descField: "garantia3Desc", descDefault: "Todos los medios de pago protegidos" },
  { slot: 3, titleField: "garantia4Title", titleDefault: "Atención rápida",  descField: "garantia4Desc", descDefault: "Respondemos en menos de 24hs" },
];

// Cuántos productos muestra la home de entrada, y cuántos suma cada "Ver más".
const PASO_PRODUCTOS = 8;

// Reseñas de la vista rápida: cuántas se ven de entrada y cuántas suma cada
// "Ver más". Antes empezaba en 5 y sumaba de a 10, sin ningún motivo.
//
// No se paginan a propósito. La lista está adentro de un panel que scrollea: con
// páginas, tocar "siguiente" reemplaza el contenido ARRIBA de donde estás mirando
// y quedás parado en el medio de la lista nueva. "Ver más" agrega abajo, donde ya
// tenés el dedo. Y no ahorraría ninguna consulta: el servidor manda las 50 más
// recientes de una sola vez, así que esto solo deja de recortar una lista que ya
// está en memoria.
const PASO_RESENAS = 5;

// Color de las estrellas llenas (rating). Dorado fijo, NO el acento: las
// estrellas son doradas por convención en cualquier tienda, y atarlas al acento
// las volvía casi invisibles cuando el acento es claro. Es el mismo dorado que
// usa el badge de "destacado".
const STAR_ON = "#f59e0b";

/* ── Vista rápida del producto: un solo título de bloque y una sola separación ──
   Cada bloque del panel de detalles inventaba el suyo: "DESCRIPCIÓN" en 9px #aaa,
   "TALLE" y "COLOR" en 11px #333, el cuadro de características sin ningún título,
   y las separaciones eran márgenes sueltos de 8, 14, 16 y 20px sin línea. Leído de
   corrido no se veía dónde terminaba una cosa y empezaba la otra: era una sola
   parrafada de controles.

   `primero` es para el encabezado (categoría + nombre + precio), que no lleva
   línea arriba porque no hay nada de qué separarlo.
──────────────────────────────────────────────────────────────────────────────── */
const CP_MODAL_TITULO: React.CSSProperties = {
  margin: "0 0 12px", fontSize: 10, fontWeight: 800, letterSpacing: 2.5,
  textTransform: "uppercase", color: "#999",
};

function CpBloque({ titulo, primero = false, children }: { titulo?: string; primero?: boolean; children: React.ReactNode }) {
  return (
    <div style={primero ? undefined : { borderTop: "1px solid #f0f0f0", marginTop: 20, paddingTop: 20 }}>
      {titulo && <p style={CP_MODAL_TITULO}>{titulo}</p>}
      {children}
    </div>
  );
}

export default function ChicParis() {
  const [scrolled,        setScrolled]        = useState(false);
  const [activeGender,    setActiveGender]    = useState<string | null>(null);
  const [hoveredNavCat,   setHoveredNavCat]   = useState<string | null>(null);
  const [visibleCount,    setVisibleCount]    = useState(PASO_PRODUCTOS);
  const [isMobile,        setIsMobile]        = useState(false);
  const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false);
  const [mobileCatsOpen,  setMobileCatsOpen]  = useState(false);
  const [mobileOpenCat,   setMobileOpenCat]   = useState<string | null>(null);
  const [heroSlide,       setHeroSlide]       = useState(0);
  const [ofertasPage,     setOfertasPage]     = useState(0);
  const [heroPaused,      setHeroPaused]      = useState(false);
  const [announcementIdx,  setAnnouncementIdx]  = useState(0);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  type PReview = { id: string; rating: number; comment: string | null; reviewer: string; verified: boolean; verifiedBy: string | null; createdAt: string; product?: { id: string; name: string; image: string | null } };
  const [reviews,        setReviews]        = useState<PReview[]>([]);
  // El formulario de reseña del producto vive en un modal, igual que el de la
  // tienda. Inline al final de la lista quedaba inalcanzable: con 50 reseñas
  // cargadas había que scrollear las 50 para llegar a escribir la propia.
  const [resenaProdOpen, setResenaProdOpen] = useState(false);
  const [reviewsShown,   setReviewsShown]   = useState(5);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewForm,     setReviewForm]     = useState({ reviewer: "", rating: 5, comment: "", email: "" });
  const reviewCaptcha = useTurnstile("review");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone,     setReviewDone]     = useState(false);
  const [reviewHoneypot, setReviewHoneypot] = useState("");
  const [reviewError,    setReviewError]    = useState<string | null>(null);
  const [showReport,     setShowReport]     = useState(false);
  const [lightboxSrc,    setLightboxSrc]    = useState<string|null>(null);
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

  const storeConfig = useStoreConfig();
  const pushBell = usePushBell();
  const { user, signOut } = useAuth();
  const panelHref = user?.role === "ADMIN" ? "/admin" : user?.role === "OWNER" ? "/dashboard" : user?.role === "SELLER" ? "/afiliados" : "/mi-cuenta";
  const panelLabel = user?.role === "ADMIN" ? "Admin" : user?.role === "OWNER" ? "Mi tienda" : user?.role === "SELLER" ? "Mi panel" : "Mi cuenta";
  const isPreview   = !!storeConfig?.previewFill;
  const isOwner     = !!storeConfig?.isOwner;
  const storefront  = useStorefront();
  const { products, promotions, loadingProducts, checkoutMode, isWholesale, ocultarPrecios, defaultCategories, featuredCategories } = storefront;

  // ── El bloque de prueba social ──────────────────────────────────────────────
  // Todo esto —de dónde salen las reseñas, las dos pestañas, el promedio, borrar
  // y publicar una de tienda— vivía escrito acá. Se movió a `useHomeReviews` al
  // traer el bloque a Urban Pulse: es la misma función y no tiene por qué existir
  // dos veces. Lo que queda en este archivo es el diseño.
  //
  // Se desarma con los nombres que ya usaba el JSX de abajo para no reescribir
  // sesenta puntos de la pantalla por un cambio que no es visual.
  const resenasHome = useHomeReviews({
    slug: storeConfig?.slug,
    isPreview, isOwner,
    productos: products,
    ejemplos: EJEMPLOS_RESENAS_CP,
  });
  const {
    deProducto, deTienda, lista, tab: tabEfectiva, setTab: setResenaTab, sinNada,
    stats: reviewStats, borrar: deleteHomeReview,
    form: tiendaForm, setForm: setTiendaForm, valida: tiendaValida,
    enviando: tiendaEnviando, listo: tiendaListo, error: tiendaError,
    confirmando: tiendaConfirmando, setConfirmando: setTiendaConfirmando,
    honeypot: tiendaHoneypot, setHoneypot: setTiendaHoneypot,
    enviar: submitResenaTienda, captcha: tiendaCaptcha,
    modalAbierto: tiendaModalOpen, abrirModal: abrirTiendaModal, cerrarModal: cerrarTiendaModal,
  } = resenasHome;
  const { editMode, activeField, setActiveField, overrides: textOverrides, setOverride } = useEditContext();
  const isInquiryMode = checkoutMode === "inquiry" || ocultarPrecios;

  const categoryList = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(c => c && c !== "general"))];
    // Las genéricas del rubro son relleno del EDITOR, para que el navbar no se
    // vea vacío mientras se diseña. En la tienda real no van: ningún producto
    // las tiene, así que cada una sería un link a un listado vacío — y el
    // visitante lee "no tienen nada", no "todavía no cargaron categorías".
    const base = cats.length > 0 ? cats : (isPreview ? defaultCategories.slice(0, 6) : []);
    return featuredCategories.length > 0 ? base.filter(c => featuredCategories.includes(c)) : base;
  }, [products, defaultCategories, featuredCategories, isPreview]);

  const ACC   = storeConfig?.colors.accent ?? "#c0392b";
  const sc    = storeConfig?.sectionColors ?? {};
  const bannerMs = storeConfig?.bannerInterval ?? 4000;
  const PROMO_BAR_H = 36;
  const hasWA = !storeConfig || storeConfig.whatsapp.enabled;
  const promoBannerEnabled = storeConfig?.promoBanner?.enabled !== false;
  const CP_DEFAULTS = ["🚚 Envío gratis en compras mayores a $30.000", "🔄 Cambios sin cargo hasta 30 días", "💳 6 cuotas sin interés"];
  const announcementMessages = (storeConfig?.promoBanner?.messages?.filter(m => m.trim()) ?? []).length > 0
    ? storeConfig!.promoBanner!.messages!.filter(m => m.trim())
    : CP_DEFAULTS;
  const showAnnouncement = promoBannerEnabled && announcementVisible;

  const stripBg   = sc["bgStrip"]    ?? "#f5f5f3";
  const stripText = getContrastColor(stripBg) === "light" ? "#fff" : "#111";
  const prodBg    = sc["bgProductos"] ?? "#fafaf8";
  const prodText  = getContrastColor(prodBg) === "light" ? "#fff" : "#111";
  const ofertasBg   = sc["bgOfertas"]   ?? "#ffffff";
  const ofertasText = getContrastColor(ofertasBg) === "light" ? "#fff" : "#111";
  const masVistoBg   = sc["bgMasVisto"]   ?? "#f5f0eb";
  const masVistoText = getContrastColor(masVistoBg) === "light" ? "#fff" : "#111";
  const aboutBg   = sc["bgAbout"]    ?? "#f5f0eb";
  const aboutText = getContrastColor(aboutBg) === "light" ? "#fff" : "#111";
  const footerBg  = sc["bgFooter"]   ?? "#0a0a0a";
  const footerText = getContrastColor(footerBg) === "light" ? "#fff" : "#111";

  // scroll
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    if (!showAnnouncement || announcementMessages.length <= 1) return;
    const id = setInterval(() => setAnnouncementIdx(i => (i + 1) % announcementMessages.length), 3500);
    return () => clearInterval(id);
  }, [showAnnouncement, announcementMessages.length]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      const y = window.scrollY;
      document.body.dataset.scrollY = String(y);
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${y}px`;
      document.body.style.width = "100%";
    } else {
      const y = parseInt(document.body.dataset.scrollY || "0");
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      if (y) window.scrollTo(0, y);
      document.body.dataset.scrollY = "";
    }
    return () => {
      const y = parseInt(document.body.dataset.scrollY || "0");
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      if (y) window.scrollTo(0, y);
    };
  }, [mobileMenuOpen]);

  // banner auto-advance — disabled entirely in edit mode
  useEffect(() => {
    if (heroPaused || editMode) return;
    intervalRef.current = setInterval(() => {
      setHeroSlide(s => (s + 1) % BANNER_COUNT);
    }, bannerMs);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [heroPaused, bannerMs, editMode]);

  // in edit mode, auto-switch the floating editor when slide changes
  useEffect(() => {
    if (!editMode) return;
    const imgField = `img:heroBanner${heroSlide + 1}`;
    // if image editor is open for any banner, follow the active slide
    if (activeField?.startsWith("img:heroBanner")) {
      setActiveField(imgField);
    }
    // if a text field from another slide is selected, close it
    if (activeField && !activeField.startsWith("img:") && !activeField.startsWith("bg:")) {
      const slideFieldPrefix = [`slide${heroSlide + 1}Kicker`, `slide${heroSlide + 1}Heading`, `slide${heroSlide + 1}Sub`, `slide${heroSlide + 1}Cta`, `slide${heroSlide + 1}CtaSecondary`];
      const isSameSlide = slideFieldPrefix.some(p => activeField === p);
      if (!isSameSlide) setActiveField(null);
    }
  }, [heroSlide, editMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToSlide = (idx: number) => {
    setHeroSlide(idx);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!heroPaused) {
      intervalRef.current = setInterval(() => setHeroSlide(s => (s + 1) % BANNER_COUNT), bannerMs);
    }
  };

  const cart = useCartLogic(storefront);
  const {
    setCartOpen,
    modalProduct, setModalProduct, modalImg, setModalImg,
    selectedSize, setSelectedSize, selectedColor, setSelectedColor,
    qty, setQty, selectedVariantStock, outOfStockSizes, outOfStockColors,
    searchOpen, setSearchOpen, searchQuery, setSearchQuery,
    favorites, favoritesOpen, setFavoritesOpen,
    userDropdownOpen, setUserDropdownOpen, userDropdownRef,
    toastMsg,
    cartCount,
    searchResults, favoriteProducts,
    fmt, showToast, openModal, addToCart,
    toggleFavorite,
  } = cart;
  const accentText = getContrastColor(ACC) === "light" ? "#fff" : "#111";
  // Acento usado como TEXTO/borde sobre el fondo claro de la sección de reseñas
  // (el botón "Dejá tu opinión" es contorneado, no relleno). Si el acento es muy
  // claro queda casi invisible sobre blanco —justo lo que se veía—, así que se
  // cae a un gris oscuro seguro. Con un acento normal usa el acento, como antes.
  const opinionAccent = getReadableAccentText(ACC, sc["bgPruebaSocial"] ?? "#fff", "#111");
  // El acento, listo para usarse SOBRE EL BLANCO del modal. Con un acento claro
  // (beige, gris perla, celeste pastel) todo lo que se pintaba con el acento crudo
  // quedaba casi del color del fondo: el precio, el talle y el color elegidos, el
  // badge de condición, las estrellas de las reseñas. Es el mismo problema que ya
  // tenía resuelto `opinionAccent` para el botón de reseñas — y el comentario de
  // `getReadableAccentText` nombra al precio como su caso de uso, pero el modal
  // nunca lo llamaba.
  const accentLegible = getReadableAccentText(ACC, "#ffffff", "#111");
  // El mismo cálculo, pero contra el fondo de CADA bloque. El precio sin descuento
  // se pinta con el acento, y los bloques de la home tienen fondo propio y editable:
  // con un acento arena sobre el beige de "Lo más visto" el precio se leía blanco
  // sobre blanco. `accentLegible` solo sirve para lo que va sobre blanco.
  const accentSobre = (bg: string, texto: string) => getReadableAccentText(ACC, bg, texto);
  // El acento como RELLENO (el chip del talle/color elegido, el badge de
  // condición, las barras del gráfico de reseñas). Va por otra regla que el texto:
  // acá no importa si el color se lee escrito sino si se distingue del blanco como
  // superficie, y con la regla de texto perdían su color acentos que de fondo
  // andan perfecto — naranja, dorado, amarillo, gris medio.
  const accentRelleno = getReadableAccentFill(ACC, "#ffffff", "#111");
  // Texto arriba de ese relleno. Ojo: no sirve `accentText`, que está calculado
  // contra el acento CRUDO — si el acento se cayó a negro, `accentText` seguiría
  // dando negro y el botón elegido quedaría negro sobre negro.
  const accentRellenoText = getContrastColor(accentRelleno) === "light" ? "#fff" : "#111";
  // El aviso de promo/oferta de una tarjeta. Estaba escrito a mano solo en la
  // grilla del catálogo y en el modal, así que en "Lo más visto", similares,
  // favoritos y el buscador el comprador no veía nada. Con un % de descuento
  // todavía lo delataba el precio en rojo, pero una promo 3×2 o de envío gratis
  // NO toca el precio: ahí el producto se veía idéntico a uno sin promo.
  //   · "foto" → tag en la esquina, para las tarjetas con imagen grande.
  //   · "chip" → línea aparte, para las miniaturas de 48/64px del buscador y
  //     favoritos, donde un tag encima taparía media foto.
  const avisoPromo = (p: Product, modo: "foto" | "chip" = "foto") => {
    const pr = resolveProductPromo(p, promotions);
    const pct = discountPercent(p.price, p.comparePrice);
    const enOferta = !!p.comparePrice && p.comparePrice > p.price;
    if (!pr.primaryPromo && !enOferta) return null;
    if (modo === "foto") {
      return pr.primaryPromo
        ? <PromoTag tipo={pr.primaryPromo.type} label={describePromo(pr.primaryPromo).headline} size="sm" />
        : <OfferBadge badge={p.offerBadge} pct={pct} size="sm" />;
    }
    return (
      <span style={{ display: "inline-block", marginTop: 4, maxWidth: "100%",
                     // Mismo color que tendría su tag en la foto: el chip del buscador
                     // y el de favoritos son el mismo aviso, en chico.
                     background: pr.primaryPromo ? coloresPromo(pr.primaryPromo.type).fondo : "#dc2626",
                     color: pr.primaryPromo ? coloresPromo(pr.primaryPromo.type).texto : "#fff",
                     fontSize: 9, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", padding: "2px 6px", borderRadius: 3, lineHeight: 1.3 }}>
        {pr.primaryPromo ? describePromo(pr.primaryPromo).headline : `${pct}% OFF`}
      </span>
    );
  };
  const cartTheme: CartTheme = { BG:"#ffffff", S:"#fafafa", T:"#111111", MID:"#999999", border:"#e5e5e5", accent:ACC, accentText };
  const variantPrice = modalProduct ? resolveVariantPrice(modalProduct.variants, selectedSize, selectedColor) : null;
  const displayPrice = variantPrice ?? (modalProduct?.price ?? 0);
  const modalPromo = modalProduct ? resolveProductPromo({ id: modalProduct.id, price: displayPrice, category: modalProduct.category }, promotions) : null;
  // 3×2 en vivo: unidades que se PAGAN a la cantidad elegida (misma cuenta que el motor).
  const nxmPaid = modalPromo?.nxm ? qty - Math.floor(qty / modalPromo.nxm.n) * (modalPromo.nxm.n - modalPromo.nxm.m) : null;
  // Lo que se va a cobrar por lo que hay elegido ahora mismo: precio de variante,
  // promo y cantidad, con el N×M ya resuelto. Va DENTRO del botón de comprar.
  const totalAPagar = fmt(nxmPaid != null ? nxmPaid * displayPrice : (modalPromo?.hasPriceDrop ? modalPromo.effectivePrice : displayPrice) * qty);
  // ── Alto de la fila de dos columnas ────────────────────────────────────────
  // La columna izquierda (foto + miniaturas + videos) es la que manda: tiene alto
  // propio y predecible. La derecha se ajusta a ESE alto y scrollea por dentro.
  // Sin esto, la derecha crecía con la descripción y dejaba un vacío blanco al
  // lado de los reels que cambiaba de tamaño según cuánto texto hubiera cargado
  // el vendedor. Ahora ese espacio lo llena más descripción, que es lo que uno
  // quiere ver ahí, y el bloque de reseñas siempre arranca en el mismo lugar.
  // Se mide en vez de calcularse porque el alto depende de cuántas miniaturas y
  // cuántos reels tenga el producto. Solo en escritorio: en celular las columnas
  // se apilan y un alto fijo cortaría el contenido.
  const colFotoRef = useRef<HTMLDivElement>(null);
  const [altoColFoto, setAltoColFoto] = useState<number | null>(null);
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
  // dispara un render en cascada (y lo marca el lint). Al reabrir el modal el
  // ResizeObserver mide de nuevo apenas observa, así que no queda un alto viejo.
  const altoPanel = isMobile || !modalProduct ? null : altoColFoto;
  // Con la barra del panel oculta no queda ninguna señal de que hay más para leer.
  // Los degradados la reponen, y solo cuando de verdad falta contenido.
  const { ref: panelRef, arriba: sombraArriba, abajo: sombraAbajo } =
    useSombrasScroll<HTMLDivElement>([altoPanel, modalProduct?.id]);
  const imgSwipe = useTouchSwipe(
    () => elegirFoto(modalImg + 1),
    () => elegirFoto(modalImg - 1)
  );
  // Swipe táctil en el hero (mobile): es un carrusel fade por índice, sin esto solo
  // se pasa con flechas/puntos. goToSlide ya reinicia el auto-avance al cambiar.
  const heroSwipe = useTouchSwipe(
    () => goToSlide((heroSlide + 1) % BANNER_COUNT),
    () => goToSlide((heroSlide - 1 + BANNER_COUNT) % BANNER_COUNT)
  );

  const [inquiryMessage, setInquiryMessage] = useState("");
  function openInquiry(product: Product) {
    setModalProduct(null);
    setInquiryMessage(`Hola, me interesa "${product.name}". ¿Me podés dar más información?`);
    setTimeout(() => scrollTo("contacto"), 100);
  }
  function shareProduct(product: Product) {
    const url = `${window.location.origin}${window.location.pathname}?p=${product.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    showToast("¡Link copiado al portapapeles!");
  }
  function whatsappShare(product: Product) {
    const phone = storeConfig?.whatsapp?.number?.replace(/\D/g, "");
    if (!phone) return;
    const h = new Date().getHours();
    const saludo = h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
    const text = `${saludo}! Me interesa el producto "${product.name}". ¿Me podés dar más información?`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
  }

  // Auto-open modal desde URL ?p=productId (D-05)
  useEffect(() => {
    if (!products.length) return;
    const productId = new URLSearchParams(window.location.search).get("p");
    if (!productId) return;
    const found = products.find(p => p.id === productId);
    if (found) openModal(found);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  // Las reseñas de la home ya no se piden acá: lo hace `useHomeReviews`.

  // Cargar reseñas al abrir modal (D-04): sincroniza el estado de reseñas con el
  // modalProduct.id actual (fetch + reset), patrón estándar de "fetch on id change".
  useEffect(() => {
    const slug = storeConfig?.slug;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia las reseñas del producto anterior al cerrar el modal; depende de una interacción, no se puede calcular durante el render
    if (!modalProduct || !slug) { setReviews([]); return; }
    setReviewsLoading(true); setReviewDone(false); setReviewsShown(5); setResenaProdOpen(false);
    setReviewForm(p => ({ ...p, rating: 5, comment: "" }));
    fetch(`/api/public/${slug}/reviews?productId=${modalProduct.id}`)
      .then(r => r.ok ? r.json() : { reviews: [] })
      .then(d => setReviews(d.reviews ?? []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalProduct?.id]);

  /* ── Elegir foto / color / talle ─────────────────────────────────────────────
     Antes esto eran TRES efectos que se disparaban entre sí, coordinados por un
     ref (`colorSyncingRef`) para no entrar en bucle: se ponía en `true` justo
     antes de `setModalImg`, contando con que el efecto de la foto lo iba a
     consumir enseguida.

     El problema: si la foto que había que poner ya era la que estaba puesta,
     React corta ahí y ese efecto NO corre — así que el ref quedaba en `true`
     para siempre y se comía la sincronización SIGUIENTE. En un producto de dos
     fotos se llegaba en dos clics: tocabas una miniatura y el color no cambiaba,
     con lo cual quedaba la foto de un color y otro color seleccionado. Y ese
     color seleccionado es el que se agrega al carrito: se veía el pantalón beige
     y se compraba el gris.

     Ahora se resuelve en el click, que es donde la decisión existe de verdad. Sin
     efectos encadenados, sin flags y sin estados intermedios: lo que se ve y lo
     que se compra salen del mismo lugar.
  ──────────────────────────────────────────────────────────────────────────── */

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
    // Si el color puesto viene en ese talle, no se toca: el que eligió el color
    // fue el comprador y cambiárselo solo porque cambió de talle es pisarle la
    // decisión.
    if (selectedColor && conTalle.some(x => valorAttr(x.a, COLOR_ATTRS).toLowerCase() === selectedColor.toLowerCase())) return;
    const mejor = conTalle.find(x => x.v.stock > 0) ?? conTalle[0];
    const color = valorAttr(mejor.a, COLOR_ATTRS);
    if (!color || color === selectedColor) return;
    setSelectedColor(color);
    const idx = fotoDeColor(modalProduct, color);
    if (idx !== -1) setModalImg(idx);
  }

  // Lo único que sigue siendo un efecto: al ABRIR la vista rápida hay que mostrar
  // la foto del color con el que abre, y ahí no hubo ningún click que lo resuelva
  // (`openModal` es del hook compartido por los 10 templates y deja la foto 0).
  useEffect(() => {
    if (!modalProduct || !selectedColor) return;
    const idx = fotoDeColor(modalProduct, selectedColor);
    if (idx !== -1) setModalImg(idx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalProduct?.id]);

  // `reviewSubmitting` es estado: recién bloquea en el render siguiente, y con
  // Enter en un campo el envío ni pasa por el botón. Sin candado sincrónico, dos
  // toques rápidos dejaban la reseña duplicada.
  const enviandoResena = useRef(false);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (isPreview || isOwner || reviewHoneypot || enviandoResena.current) return;
    const slug = storeConfig?.slug;
    if (!modalProduct || !slug || !reviewForm.reviewer.trim()) return;
    enviandoResena.current = true;
    setReviewSubmitting(true);
    try {
      const res = await fetch(`/api/public/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: modalProduct.id, rating: reviewForm.rating, comment: reviewForm.comment, reviewer: reviewForm.reviewer, buyerEmail: reviewForm.email.trim() || undefined, turnstileToken: reviewCaptcha.token }),
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(p => [data.review, ...p]);
        setReviewForm({ reviewer: "", rating: 5, comment: "", email: "" });
        setReviewError(null);
        // Se cierra el modal: la reseña recién publicada está en la lista de
        // atrás, y dejarlo abierto con el formulario vacío parece que no pasó nada.
        setResenaProdOpen(false);
        setReviewDone(true); setTimeout(() => setReviewDone(false), 4000);
      } else {
        // CP-12: antes esto era silencio. Se apagaba el "Publicando...", el botón
        // volvía a habilitarse, y el comprador no sabía si se había publicado o
        // no. El servidor manda el motivo —captcha, nombre corto, demasiadas
        // reseñas seguidas— y se muestra tal cual.
        const d = await res.json().catch(() => null);
        setReviewError(d?.error || "No se pudo publicar tu reseña. Probá de nuevo en un momento.");
      }
    } catch {
      setReviewError("No se pudo conectar. Revisá tu internet y probá de nuevo.");
    } finally { enviandoResena.current = false; reviewCaptcha.reset(); setReviewSubmitting(false); }
  }

  // La validacion, el envio y el abrir/cerrar del modal se fueron a
  // useHomeReviews. Lo que queda en este archivo es el vestido del formulario.

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

  const changeGender = (g: string | null) => { setActiveGender(g); setVisibleCount(PASO_PRODUCTOS); };

  const allFiltered = useMemo(() => products.filter(p => {
    if (activeGender && p.gender !== activeGender && p.gender !== "unisex") return false;
    return true;
  }), [products, activeGender]);
  // Los productos ya vienen todos en la misma respuesta de /api/public/[slug],
  // así que "Ver más" no pide nada al servidor: solo deja de recortar la lista.
  const filtered    = allFiltered.slice(0, visibleCount);
  const quedanMas   = allFiltered.length > filtered.length;

  const similarProducts = useMemo(() => {
    if (!modalProduct) return [];
    const others = products.filter(p => p.id !== modalProduct.id);
    const sameSub = modalProduct.subcategory ? others.filter(p => p.subcategory === modalProduct.subcategory) : [];
    const sameCat = others.filter(p => p.category === modalProduct.category && !sameSub.includes(p));
    const rest = others.filter(p => !sameSub.includes(p) && !sameCat.includes(p));
    return [...sameSub, ...sameCat, ...rest].slice(0, 4);
  }, [products, modalProduct]);

  /* ── Reseñas que dibuja la vista rápida ──────────────────────────────────────
     En el editor, con el producto todavía sin reseñas, se muestran DE EJEMPLO:
     es la única forma de que el dueño vea el bloque lleno —el promedio, el
     gráfico de estrellas y las tarjetas—. Sin esto diseña mirando un "Sé el
     primero en dejar una reseña" y se entera de cómo queda recién cuando le
     escribe un cliente.

     Mismo criterio, y mismo cartel de aviso, que el bloque de prueba social de la
     home. Las fechas son fijas a propósito: una fecha calculada al vuelo cambia
     entre el servidor y el navegador y rompe la hidratación.
  ──────────────────────────────────────────────────────────────────────────── */
  const RESENAS_EJEMPLO: PReview[] = [
    { id:"ej-1", rating:5, comment:"Tal cual la foto y el talle justo. Llegó en tres días.", reviewer:"Micaela R.", verified:true,  verifiedBy:"auto",  createdAt:"2026-07-18T14:00:00.000Z" },
    { id:"ej-2", rating:5, comment:"La tela es muy buena para el precio. Ya pedí otro en el otro color.", reviewer:"Julián T.", verified:false, verifiedBy:null,    createdAt:"2026-07-11T14:00:00.000Z" },
    { id:"ej-3", rating:4, comment:"Muy lindo, aunque me quedó un poco largo. Igual lo recomiendo.", reviewer:"Carla V.",  verified:true,  verifiedBy:"owner", createdAt:"2026-06-29T14:00:00.000Z" },
  ];
  // `reviewsLoading` importa: sin él, entre que se abre el modal y contesta el
  // servidor la lista está vacía y aparecerían las de ejemplo por un instante,
  // justo para ser reemplazadas por las reales.
  const resenasDeEjemplo = isPreview && !reviewsLoading && reviews.length === 0;
  const resenasVisibles  = resenasDeEjemplo ? RESENAS_EJEMPLO : reviews;

  // Banner slide images
  const bannerImgs = Array.from({ length: BANNER_COUNT }, (_, i) =>
    storeConfig?.imageOverrides?.[`heroBanner${i + 1}`]
  );

  useScrollReveal();

  return (
    <div style={{ fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif", background: "#fff", color: "#111", minHeight: "100vh" }}>
      <style>{`
        /* Panel derecho del modal: scrollea pero sin dibujar su barra. Al lado de
           la del modal quedaban dos barras pegadas y no se entendía cuál movía qué.
           El corte del texto ya avisa que hay más abajo. */
        .cp-sin-barra::-webkit-scrollbar { display:none }
        .cp-sin-barra { scrollbar-width:none; -ms-overflow-style:none }
        /* Flechas de Ofertas: se apoyan sobre la foto hasta que hay lugar para las 44px
           de la flecha a cada lado de la grilla. La grilla mide 768 (2×360 + 48) y el
           contenedor es el ancho menos 80 de padding, así que el margen libre de cada
           lado es (ancho − 80 − 768) / 2 y recién llega a 44 en 936px. Abajo de eso,
           puntitos. */
        @media (max-width:940px) { .cp-flecha-of { display:none } }
        .cp-img { transition:transform 0.45s ease; }
        .cp-overlay { opacity:0; transition:opacity 0.3s; }
        @media (hover:hover) and (pointer:fine) {
          .cp-prod:hover .cp-img { transform:scale(1.05); }
          .cp-prod:hover .cp-overlay { opacity:1; }
        }
        .cp-btn:hover { opacity:0.85; }
        @keyframes cp-toast { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cp-wa-pulse { 0% { box-shadow:0 4px 20px rgba(37,211,102,0.4), 0 0 0 0 rgba(37,211,102,0.55); } 70% { box-shadow:0 4px 20px rgba(37,211,102,0.4), 0 0 0 14px rgba(37,211,102,0); } 100% { box-shadow:0 4px 20px rgba(37,211,102,0.4), 0 0 0 0 rgba(37,211,102,0); } }
        .cp-wa-fab { background:linear-gradient(135deg,#2be374,#1fae57); animation:cp-wa-pulse 2.4s ease-out infinite; }
        .cp-wa-fab:hover { animation-play-state:paused; }
        .cp-zoom-img { transition:transform 0.5s ease; }
        .cp-zoom:hover .cp-zoom-img { transform:scale(1.06); }
      `}</style>

      {/* ── PROMO BAR ── */}
      {showAnnouncement && (
        <div style={{
          position: isPreview ? "sticky" : "fixed", top: 0, left: isPreview ? undefined : 0, right: isPreview ? undefined : 0, zIndex: isPreview ? 10001 : 1001,
          height: PROMO_BAR_H, background: "#111", overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* CP-3. El índice no se reiniciaba al cambiar la cantidad de mensajes:
              si estabas en el 3ro y el dueño dejaba 2, `messages[2]` quedaba en
              undefined y la franja se veía negra y vacía arriba de toda la tienda.
              Y el intervalo que la rota corta antes cuando queda un solo mensaje,
              así que ni siquiera salía sola de ese estado.
              Se acota al leer en vez de con un efecto: un efecto necesitaría un
              render extra, y en ese render la franja ya se dibujó vacía. */}
          {/* Un solo renglón, cueste lo que cueste. El dashboard deja escribir 120
              caracteres y esta franja mide 36px FIJOS — y el navbar está clavado
              en `top: PROMO_BAR_H`. Sin esto, en un celular un mensaje largo se
              parte en tres renglones que se derraman encima del navbar y del hero.
              Los 44px de padding a los costados son el lugar del botón de cerrar:
              van simétricos para que el texto siga centrado de verdad. */}
          <span style={{
            fontSize: 11, fontWeight: 600, color: "#fff", letterSpacing: 1,
            maxWidth: "100%", boxSizing: "border-box", padding: "0 44px",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {announcementMessages[announcementIdx % announcementMessages.length]}
          </span>
          {announcementMessages.length > 1 && (
            <div style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4 }}>
              {announcementMessages.map((_, i) => (
                <button key={i} onClick={() => setAnnouncementIdx(i)}
                  style={{ width: i === announcementIdx % announcementMessages.length ? 14 : 5, height: 3, border: "none", borderRadius: 2, background: i === announcementIdx % announcementMessages.length ? "#fff" : "rgba(255,255,255,0.3)", cursor: "pointer", padding: 0, transition: "all 0.3s" }} />
              ))}
            </div>
          )}
          <button onClick={() => setAnnouncementVisible(false)}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 16, lineHeight: 1, opacity: 0.7 }}>×</button>
        </div>
      )}

      {/* ── NAVBAR ── */}
      <header style={{
        position: isPreview ? "sticky" : "fixed", top: showAnnouncement ? PROMO_BAR_H : 0, left: isPreview ? undefined : 0, right: isPreview ? undefined : 0, zIndex: isPreview ? 10000 : 1000,
        background: (isPreview || scrolled) ? "rgba(255,255,255,0.97)" : "transparent",
        borderBottom: (isPreview || scrolled) ? "1px solid #e8e8e8" : "none",
        backdropFilter: (isPreview || scrolled) ? "blur(12px)" : "none",
        transition: "all 0.3s ease",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Nav left */}
          {!isMobile && <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
            {/* CATEGORÍAS dropdown — sin categorías no se muestra: el panel
                desplegable quedaría como un recuadro blanco vacío. */}
            {categoryList.length > 0 && <div style={{ position: "relative" }}
              onMouseEnter={() => setHoveredNavCat("__open__")}
              onMouseLeave={() => setHoveredNavCat(null)}>
              <button style={{ background: "none", border: "none", fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", color: (isPreview || scrolled) ? "#111" : "#fff", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                Categorías <span style={{ fontSize: 9, opacity: 0.6 }}>▾</span>
              </button>
              {hoveredNavCat && (
                <>
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, height: 12, zIndex: 499 }} />
                <div style={{ position: "absolute", top: "calc(100% + 12px)", left: 0, background: "#fff", border: "1px solid #e8e8e8", zIndex: 500, padding: "24px 32px", boxShadow: "0 12px 40px rgba(0,0,0,0.12)", display: "flex", gap: 40 }}>
                  {categoryList.map(cat => {
                    const subs = subcategoriesFor[cat] || [];
                    return (
                      <div key={cat} style={{ minWidth: 140 }}>
                        <button onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=chic-paris${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat)}`; setHoveredNavCat(null); }}
                          style={{ display: "block", width: "100%", background: "none", border: "none", borderBottom: "1px solid #111", color: "#111", padding: "0 0 8px", marginBottom: 10, fontSize: 11, textAlign: "left", cursor: "pointer", letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, whiteSpace: "nowrap", transition: "color 0.15s, border-color 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.color = ACC; e.currentTarget.style.borderBottomColor = ACC; }}
                          onMouseLeave={e => { e.currentTarget.style.color = "#111"; e.currentTarget.style.borderBottomColor = "#111"; }}>
                          {cat}
                        </button>
                        {subs.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {subs.map(sub => (
                              <button key={sub} onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=chic-paris${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat)}&subcategoria=${encodeURIComponent(sub)}`; setHoveredNavCat(null); }}
                                style={{ display: "block", width: "100%", background: "none", border: "none", color: "#555", padding: "5px 0", fontSize: 11, textAlign: "left", cursor: "pointer", letterSpacing: 0.5, whiteSpace: "nowrap" }}
                                onMouseEnter={e => (e.currentTarget.style.color = "#111")}
                                onMouseLeave={e => (e.currentTarget.style.color = "#555")}>
                                {sub}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=chic-paris${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat)}`; setHoveredNavCat(null); }}
                            style={{ display: "block", background: "none", border: "none", color: "#999", padding: "5px 0", fontSize: 11, textAlign: "left", cursor: "pointer", transition: "color 0.15s" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#111")}
                            onMouseLeave={e => (e.currentTarget.style.color = "#999")}>
                            Ver todo
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                </>
              )}
            </div>}
            {/* MUJER */}
            <button onClick={() => { changeGender(activeGender === "mujer" ? null : "mujer"); scrollTo("productos"); }}
              style={{ background: "none", border: "none", fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", padding: 0, color: activeGender === "mujer" ? ACC : (isPreview || scrolled) ? "#111" : "#fff" }}>
              Mujer
            </button>
            {/* HOMBRE */}
            <button onClick={() => { changeGender(activeGender === "hombre" ? null : "hombre"); scrollTo("productos"); }}
              style={{ background: "none", border: "none", fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", padding: 0, color: activeGender === "hombre" ? ACC : (isPreview || scrolled) ? "#111" : "#fff" }}>
              Hombre
            </button>
          </nav>}

          {/* Logo center */}
          <a onClick={() => scrollTo("hero")} style={{ cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: 4, textTransform: "uppercase", color: (isPreview || scrolled) ? "#111" : "#fff", transition: "color 0.3s" }}>
              <EditableZone field="storeName" label="Nombre de la tienda">{storeConfig?.storeName ?? "CHIC PARIS"}</EditableZone>
            </span>
            <VerifiedIconButton isVerified={storeConfig?.isVerified} info={storeConfig?.verifiedInfo} />
          </a>

          {/* Nav right */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setSearchOpen(true)} aria-label="Buscar" style={{ background: "none", border: "none", cursor: "pointer", color: (isPreview || scrolled) ? "#555" : "#fff", padding: 6, display: "flex", transition: "color 0.3s" }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            {pushBell && storeConfig?.showPushBell && !isPreview && (
              <StoreFollowButton storeSlug={storeConfig?.slug ?? ""} color={(isPreview || scrolled) ? "#555" : "#fff"} size={18} />
            )}
            {pushBell && storeConfig?.showPushBell && !isPreview && (
              <button onClick={pushBell.openDrawer} style={{ position:"relative", background:"none", border:"none", cursor:"pointer", color:(isPreview || scrolled) ? "#555" : "#fff", padding:6, display:"flex", transition:"color 0.3s" }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill={pushBell.followState === "following" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {pushBell.hasNew && <span style={{ position:"absolute", top:4, right:4, width:10, height:10, background:"#ef4444", borderRadius:"50%", border:"2px solid white" }} />}
              </button>
            )}
            {isPreview && (
              <>
                {storeConfig?.showPushBell ? (
                  <button title="Los clientes pueden seguir tu tienda desde acá" style={{ position:"relative", background:"none", border:"none", padding:6, display:"flex", color:"#555", opacity:0.85, cursor:"default" }}>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                  </button>
                ) : (
                  <button onClick={storeConfig?.onPreviewBellClick} title="🔒 Solo Plan Plus — tocá para activar" style={{ position:"relative", background:"none", border:"none", padding:6, display:"flex", color:"#555", opacity:0.38, cursor:"pointer" }}>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                    <span style={{ position:"absolute", top:2, right:2, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
                  </button>
                )}
                {storeConfig?.showPushBell ? (
                  <button onClick={storeConfig.onPreviewBellClick} title="Campanita de novedades — clic para configurar" style={{ position:"relative", background:"none", border:"none", padding:6, display:"flex", color:"#555", opacity:0.85, cursor:"pointer" }}>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  </button>
                ) : (
                  <button onClick={storeConfig?.onPreviewBellClick} title="🔒 Solo Plan Plus — tocá para activar" style={{ position:"relative", background:"none", border:"none", padding:6, display:"flex", color:"#555", opacity:0.38, cursor:"pointer" }}>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    <span style={{ position:"absolute", top:2, right:2, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
                  </button>
                )}
              </>
            )}
            <button onClick={() => { setFavoritesOpen(true); setUserDropdownOpen(false); setCartOpen(false); }} aria-label="Favoritos" style={{ background: "none", border: "none", cursor: "pointer", color: (isPreview || scrolled) ? "#555" : "#fff", padding: 6, position: "relative", display: "flex", transition: "color 0.3s" }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill={favorites.length > 0 ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
            <div ref={userDropdownRef} style={{ position: "relative" }}>
              <button onClick={() => { setUserDropdownOpen(v => !v); setFavoritesOpen(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: (isPreview || scrolled) ? "#555" : "#fff", padding: 6, display: "flex", transition: "color 0.3s" }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </button>
              {userDropdownOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, minWidth: 180, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 2000, overflow: "hidden" }}>
                  {user ? (
                    <>
                      <p style={{ padding: "10px 16px 4px", fontSize: 11, color: "#aaa", margin: 0, fontWeight: 600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {user.name || user.email.split("@")[0]}
                      </p>
                      <a href={panelHref} onClick={() => setUserDropdownOpen(false)}
                        style={{ display: "block", padding: "10px 16px", fontSize: 13, color: "#333", textDecoration: "none", borderBottom: "1px solid #f5f5f5" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>{panelLabel}</a>
                      <button onClick={() => { if (isPreview) return; setUserDropdownOpen(false); signOut("/"); }}
                        style={{ display: "block", width: "100%", padding: "10px 16px", fontSize: 13, color: "#ef4444", background: "none", border: "none", textAlign: "left", cursor: isPreview ? "default" : "pointer", opacity: isPreview ? 0.45 : 1 }}
                        onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background = "#fff5f5"; }}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>Cerrar sesión</button>
                    </>
                  ) : (
                    <>
                      <a href={isPreview ? undefined : `/login?redirect=/tienda/${storeConfig?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)}
                        style={{ display: "block", padding: "12px 16px", fontSize: 13, color: "#333", textDecoration: "none", borderBottom: "1px solid #f5f5f5", cursor: isPreview ? "default" : "pointer" }}
                        onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background = "#fafafa"; }}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>Iniciar sesión</a>
                      <a href={isPreview ? undefined : `/registro?plan=buyer&redirect=/tienda/${storeConfig?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)}
                        style={{ display: "block", padding: "12px 16px", fontSize: 13, color: "#333", textDecoration: "none", cursor: isPreview ? "default" : "pointer" }}
                        onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background = "#fafafa"; }}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>Registrarse</a>
                    </>
                  )}
                </div>
              )}
            </div>
            {isMobile && (
              <button onClick={() => { setMobileMenuOpen(o => !o); setMobileCatsOpen(false); setMobileOpenCat(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: (isPreview || scrolled) ? "#555" : "#fff", padding: 6, display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                <span style={{ display: "block", width: 20, height: 2, background: "currentColor", transition: "all 0.3s", transform: mobileMenuOpen ? "rotate(45deg) translate(3px,3px)" : "none" }}/>
                <span style={{ display: "block", width: 20, height: 2, background: "currentColor", transition: "all 0.3s", opacity: mobileMenuOpen ? 0 : 1 }}/>
                <span style={{ display: "block", width: 20, height: 2, background: "currentColor", transition: "all 0.3s", transform: mobileMenuOpen ? "rotate(-45deg) translate(3px,-3px)" : "none" }}/>
              </button>
            )}
          </div>
        </div>
      </header>
      {isMobile && mobileMenuOpen && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top: isPreview ? 0 : 68 + (showAnnouncement ? PROMO_BAR_H : 0), left: 0, right: 0, bottom: 0, background: "#fff", zIndex: 999, overflowY: "auto", overscrollBehavior: "contain" }}>
          {/* Categorías — acordeón */}
          {categoryList.length > 0 && (
            <>
              <button onClick={() => setMobileCatsOpen(o => !o)}
                style={{ display: "flex", width: "100%", background: "none", border: "none", borderBottom: "1px solid #f0f0f0", color: "#111", padding: "16px 24px", fontSize: 12, textAlign: "left", cursor: "pointer", letterSpacing: 2, fontWeight: 600, textTransform: "uppercase", alignItems: "center", justifyContent: "space-between" }}>
                Categorías
                <span style={{ fontSize: 10, opacity: 0.45, transition: "transform 0.2s", transform: mobileCatsOpen ? "rotate(180deg)" : "none", display: "inline-block" }}>▾</span>
              </button>
              {mobileCatsOpen && categoryList.map(cat => {
                const subs = subcategoriesFor[cat] || [];
                return (
                  <Fragment key={cat}>
                    <button onClick={() => {
                      if (subs.length > 0) {
                        setMobileOpenCat(prev => prev === cat ? null : cat);
                      } else {
                        window.location.href = `/tienda/${storeConfig?.slug}/productos?t=chic-paris${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat)}`;
                        setMobileMenuOpen(false); setMobileCatsOpen(false);
                      }
                    }} style={{ display: "flex", width: "100%", background: "#fafafa", border: "none", borderBottom: "1px solid #f0f0f0", color: "#111", padding: "13px 24px 13px 40px", fontSize: 11, textAlign: "left", cursor: "pointer", letterSpacing: 2, fontWeight: 600, textTransform: "uppercase", alignItems: "center", justifyContent: "space-between" }}>
                      {cat}
                      {subs.length > 0 && <span style={{ fontSize: 12, opacity: 0.4, transition: "transform 0.2s", transform: mobileOpenCat===cat ? "rotate(90deg)" : "none", display: "inline-block" }}>›</span>}
                    </button>
                    {subs.length > 0 && mobileOpenCat === cat && subs.map(sub => (
                      <button key={sub} onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=chic-paris${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat)}&subcategoria=${encodeURIComponent(sub)}`; setMobileMenuOpen(false); setMobileCatsOpen(false); setMobileOpenCat(null); }}
                        style={{ display: "block", width: "100%", background: "#f5f5f5", border: "none", borderBottom: "1px solid #ebebeb", color: "#555", padding: "11px 24px 11px 60px", fontSize: 11, textAlign: "left", cursor: "pointer", letterSpacing: 1, fontWeight: 500, textTransform: "uppercase" }}>
                        {sub}
                      </button>
                    ))}
                  </Fragment>
                );
              })}
            </>
          )}
          {[["Mujer","mujer"],["Hombre","hombre"]].map(([label, g]) => (
            <button key={g} onClick={() => { changeGender(activeGender===g ? null : g); scrollTo("productos"); setMobileMenuOpen(false); }}
              style={{ display: "block", width: "100%", background: "none", border: "none", borderBottom: "1px solid #f0f0f0", color: activeGender===g ? ACC : "#111", padding: "16px 24px", fontSize: 12, textAlign: "left", cursor: "pointer", letterSpacing: 2, fontWeight: 600, textTransform: "uppercase" }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── HERO CAROUSEL ── */}
      {/* CP-4. El hero mide la pantalla entera, así que "pausar al pasar el mouse"
          sobre TODA la sección significaba pausar siempre: apenas alguien mueve el
          mouse ya está encima. En la práctica la mayoría de los visitantes de
          escritorio veía el slide 1 y nunca los otros dos.
          La pausa sigue existiendo, pero solo donde tiene sentido: sobre los
          controles —las flechas y los puntitos—, que es cuando la persona está
          eligiendo qué mirar y el avance automático le pelea el clic. */}
      <section id="hero" style={{ position: "relative", height: isPreview ? `calc(100vh - ${68 + (showAnnouncement ? PROMO_BAR_H : 0)}px)` : "100vh", background: "#111" }}
        {...heroSwipe}>

        {Array.from({ length: BANNER_COUNT }, (_, i) => {
          const ov = bannerImgs[i];
          const isActive = heroSlide === i;
          const overlayType = ov?.overlayType ?? "dark";
          const overlayOpacity = ov?.overlayOpacity ?? 0.65;
          const overlayGradient = overlayType === "none"
            ? null
            : overlayType === "light"
              ? `linear-gradient(to right, rgba(255,255,255,${overlayOpacity}) 40%, rgba(255,255,255,${+(overlayOpacity * 0.15).toFixed(2)}))`
              : `linear-gradient(to right, rgba(0,0,0,${overlayOpacity}) 40%, rgba(0,0,0,${+(overlayOpacity * 0.15).toFixed(2)}))`;
          const hideContent = ov?.hideContent ?? false;
          return (
            <div key={i} style={{
              position: "absolute", inset: 0,
              opacity: isActive ? 1 : 0,
              transition: "opacity 0.8s ease",
              pointerEvents: isActive ? "auto" : "none",
              background: ov?.url ? "transparent" : ["#1a1a2e", "#16213e", "#0f3460"][i],
            }}>
              {ov?.url && (() => {
                // Foco separado por dispositivo: en celular el banner se recorta
                // muy distinto (pantalla alta y angosta), así que si hay un foco de
                // celular seteado se usa ese; si no, cae al de PC. En escritorio
                // siempre el de PC.
                const fx = isMobile ? (ov.posXMobile ?? ov.posX ?? 50) : (ov.posX ?? 50);
                const fy = isMobile ? (ov.posYMobile ?? ov.posY ?? 50) : (ov.posY ?? 50);
                return <FadeImage src={ov.url} alt="" fill sizes="100vw" style={{ objectFit: "cover", objectPosition: `${fx}% ${fy}%` }} />;
              })()}
              {overlayGradient && (
                <div style={{ position: "absolute", inset: 0, background: overlayGradient }} />
              )}
              {!hideContent && (
                <>
                {/* Velo para el texto en celular: el texto va ABAJO sobre este
                    gradiente, así se lee sobre CUALQUIER foto —aunque el dueño
                    haya apagado el overlay general— y no queda encima del centro
                    de la imagen, que es donde suele estar el sujeto (una cara, una
                    prenda). En escritorio el texto va al centro-izquierda y de eso
                    ya se ocupa el overlay direccional de más arriba. */}
                {isMobile && (
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.42) 26%, rgba(0,0,0,0) 58%)" }} />
                )}
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: isMobile ? "flex-end" : "center", padding: isMobile ? "0 24px 104px" : "0 80px", maxWidth: isMobile ? undefined : 640 }}>
                  <span style={{ color: ACC, fontSize: 11, letterSpacing: 5, fontWeight: 700, textTransform: "uppercase", marginBottom: 16 }}>
                    <EditableZone field={`slide${i + 1}Kicker`} label={`Slide ${i + 1} — Kicker`}>Nueva Colección</EditableZone>
                  </span>
                  <h1 style={{ color: "#fff", fontSize: isMobile ? "clamp(28px,7.5vw,40px)" : "clamp(36px,5.5vw,72px)", fontWeight: 900, lineHeight: 1.05, margin: "0 0 20px", textTransform: "uppercase", letterSpacing: "-1px" }}>
                    <EditableZone field={`slide${i + 1}Heading`} label={`Slide ${i + 1} — Título`}>
                      {["Diseño que habla por vos.", "Elegancia sin esfuerzo.", "Tu próximo favorito."][i]}
                    </EditableZone>
                  </h1>
                  <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 16, lineHeight: 1.7, margin: "0 0 32px" }}>
                    <EditableZone field={`slide${i + 1}Sub`} label={`Slide ${i + 1} — Subtítulo`}>
                      {["Piezas únicas para cada momento de tu día.", "Colección cuidada para quienes eligen con intención.", "Tendencias de temporada, calidad que dura."][i]}
                    </EditableZone>
                  </p>
                  {/* `flexWrap`: en 360px los dos botones juntos no entran (cada uno
                      son ~164px con su padding, más el gap), así que se achicaban y
                      el texto se partía adentro del botón. Ahora el segundo baja de
                      renglón entero. */}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {(editMode || !storeConfig?.textOverrides?.[`slide${i + 1}Cta`]?.hidden) && (
                      <button onClick={() => scrollTo("productos")} style={{ background: ACC, color: accentText, border: "none", padding: "14px 32px", fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer" }}>
                        <EditableZone field={`slide${i + 1}Cta`} label={`Slide ${i + 1} — Botón`}>Ver Colección</EditableZone>
                      </button>
                    )}
                    {(editMode || !storeConfig?.textOverrides?.[`slide${i + 1}CtaSecondary`]?.hidden) && (
                      <button onClick={() => scrollTo("nosotros")} style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.5)", padding: "14px 32px", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer" }}>
                        <EditableZone field={`slide${i + 1}CtaSecondary`} label={`Slide ${i + 1} — Botón secundario`}>Nuestra Historia</EditableZone>
                      </button>
                    )}
                  </div>
                </div>
                </>
              )}
              {isActive && <EditableImageButton field={`heroBanner${i + 1}`} label={`Imagen banner ${i + 1}`} />}
            </div>
          );
        })}

        {/* Dots — acá sí se pausa: si alguien está por elegir un slide, que el
            avance automático no se lo cambie abajo del dedo. */}
        <div
          onMouseEnter={() => setHeroPaused(true)}
          onMouseLeave={() => setHeroPaused(false)}
          style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 10, zIndex: 10 }}>
          {Array.from({ length: BANNER_COUNT }, (_, i) => (
            <button key={i} onClick={() => goToSlide(i)} style={{
              width: heroSlide === i ? 28 : 8, height: 8, borderRadius: 4, border: "none", padding: 0,
              background: heroSlide === i ? ACC : "rgba(255,255,255,0.45)",
              cursor: "pointer", transition: "all 0.3s ease",
            }} />
          ))}
        </div>

        {/* Arrows — en celular NO: caían justo sobre el subtítulo centrado del
            hero (top 50%) y lo tapaban. Ahí se navega con el swipe (ya activo) y
            los puntitos. Desde tablet (>=768) sí se muestran, que hay lugar de
            sobra a los costados. */}
        {!isMobile && [[-1, "left", "14px"], [1, "right", "14px"]].map(([dir, side, offset]) => (
          <button key={String(side)} onClick={() => goToSlide((heroSlide + Number(dir) + BANNER_COUNT) % BANNER_COUNT)}
            style={{ position: "absolute", top: "50%", [String(side)]: String(offset), transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 44, height: 44, borderRadius: "50%", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", zIndex: 10, transition: "background 0.2s" }}
            onMouseEnter={e => { setHeroPaused(true); e.currentTarget.style.background = "rgba(255,255,255,0.3)"; }}
            onMouseLeave={e => { setHeroPaused(false); e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}>
            {Number(dir) === -1 ? "‹" : "›"}
          </button>
        ))}
      </section>

      <div style={{ display:"flex", flexDirection:"column" }}>
      <SectionBlock id="cp-strip" label="Garantías" isPreview={isPreview} defaultOrder={CP_SECTION_IDS}>
      {/* ── STRIP ── */}
      <section data-reveal style={{ background: stripBg, borderTop: `1px solid ${stripText === "#111" ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.1)"}`, borderBottom: `1px solid ${stripText === "#111" ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.1)"}`, padding: isMobile ? "28px 16px" : "20px 40px", position: "relative" }}>
        <EditableSectionBg field="bgStrip" label="Fondo franja garantías" />
        {/* En celular NO se apilan de a uno: van en grilla de 2 columnas, con el
            ícono arriba y el texto centrado abajo, así cada beneficio tiene el
            ancho completo de su celda y el texto entra bien. En escritorio siguen
            en fila (ícono a la izquierda), repartidos con space-between. */}
        <div style={{ maxWidth: 1100, margin: "0 auto", display: isMobile ? "grid" : "flex", gridTemplateColumns: isMobile ? "1fr 1fr" : undefined, justifyContent: isMobile ? undefined : "space-between", flexWrap: isMobile ? undefined : "wrap", gap: isMobile ? 24 : 16 }}>
          {STRIP_ITEMS.map(({ slot, titleField, titleDefault, descField, descDefault }) => {
            const iconIdx = (Math.abs(parseInt(textOverrides[`garantia${slot + 1}Icon`]?.text ?? "0") || 0)) % STRIP_ICONS[slot].length;
            const nextIdx = (iconIdx + 1) % STRIP_ICONS[slot].length;
            return (
              <div key={titleField} style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: "center", textAlign: isMobile ? "center" : "left", gap: isMobile ? 8 : 14, flex: isMobile ? undefined : "1 1 200px" }}>
                <div style={{ color: ACC, flexShrink: 0, position: "relative" }}>
                  {STRIP_ICONS[slot][iconIdx]}
                  {editMode && (
                    <button
                      onClick={() => setOverride(`garantia${slot + 1}Icon`, { text: String(nextIdx) })}
                      title="Cambiar ícono"
                      style={{ position: "absolute", inset: 0, background: "rgba(99,102,241,0.9)", border: "none", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, opacity: 0, transition: "opacity 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
                    >↻</button>
                  )}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: stripText, letterSpacing: 0.3 }}>
                    <EditableZone field={titleField} label={`Garantía ${slot + 1} — Título`}>{titleDefault}</EditableZone>
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: stripText, opacity: 0.6, lineHeight: 1.4 }}>
                    <EditableZone field={descField} label={`Garantía ${slot + 1} — Descripción`}>{descDefault}</EditableZone>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      </SectionBlock>

      {/* ── MAYORISTA — banner "Solicitá tu lista de precios" ── */}
      <SectionBlock id="cp-mayorista" label="Mayorista" isPreview={isPreview} defaultOrder={CP_SECTION_IDS}>
      {isWholesale && (
        <section data-reveal style={{ background: "#f8f5f0", borderTop: `3px solid ${ACC}` }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "72px 40px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 20 }}>
            <span style={{ fontSize: 10, letterSpacing: 4, color: ACC, textTransform: "uppercase", fontWeight: 700 }}>Tienda mayorista</span>
            <h2 style={{ fontSize: "clamp(28px,4vw,52px)", fontWeight: 300, color: "#111", margin: 0, fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: "-0.5px", lineHeight: 1.2 }}>
              Solicitá tu lista<br/><span style={{ fontStyle: "italic", fontWeight: 600, color: ACC }}>de precios</span>
            </h2>
            <p style={{ fontSize: 14, color: "#888", maxWidth: 460, margin: 0, lineHeight: 1.75 }}>
              Precios exclusivos para revendedores y distribuidores. Completá el formulario de contacto y te respondemos con tu lista personalizada en menos de 24 hs.
            </p>
            <button onClick={() => scrollTo("contacto")}
              style={{ background: ACC, color: "#fff", border: "none", padding: "14px 40px", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", borderRadius: 2, marginTop: 4 }}>
              Consultar ahora →
            </button>
          </div>
        </section>
      )}
      </SectionBlock>

      {/* ── PRODUCTOS ── */}
      <SectionBlock id="cp-productos" label="Catálogo de productos" isPreview={isPreview} defaultOrder={CP_SECTION_IDS}>
      <section id="productos" data-reveal style={{ background: prodBg, padding: isMobile ? "48px 16px" : "72px 40px", position: "relative" }}>
        <EditableSectionBg field="bgProductos" label="Fondo productos" />
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{ fontSize: 10, letterSpacing: 5, fontWeight: 700, color: ACC, textTransform: "uppercase" }}>
              <EditableZone field="productsKicker" label="Kicker productos">Temporada</EditableZone>
            </span>
            <h2 style={{ fontSize: "clamp(28px,3.5vw,42px)", fontWeight: 900, color: prodText, margin: "8px 0 0", textTransform: "uppercase", letterSpacing: "-0.5px" }}>
              {activeGender === "mujer" ? "Mujer" : activeGender === "hombre" ? "Hombre" : <EditableZone field="productsHeading" label="Título sección productos">Nuestra Colección</EditableZone>}
            </h2>
            <p style={{ fontSize:12, color:prodText, opacity:0.45, margin:"6px 0 0" }}>
              {quedanMas ? `Mostrando ${filtered.length} de ${allFiltered.length} piezas` : `${allFiltered.length} piezas`}
            </p>
          </div>

          {loadingProducts ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: prodText, opacity: 0.4 }}>
              <p style={{ fontSize: 15 }}>Cargando productos...</p>
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: prodText, opacity: 0.35 }}>
              <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} style={{ marginBottom: 12, opacity: 0.5 }}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              <p style={{ fontSize: 14, margin: 0 }}>Todavía no hay productos. Agregá productos desde el dashboard.</p>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(auto-fill,minmax(260px,1fr))", gap: isMobile ? 12 : 24 }}>
                {filtered.map(product => {
                  return (
                  <div key={product.id} className="cp-prod" onClick={() => openModal(product)} style={{ cursor: "pointer", background: "#fff", borderRadius: 4, position: "relative", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    {avisoPromo(product)}
                    <div style={{ position: "relative", width: "100%", overflow: "hidden", aspectRatio: "3/4" }}>
                      <FadeImage className="cp-img" src={product.images[0] ?? "/placeholder.jpg"} alt={product.name} fill sizes="(max-width: 768px) 50vw, 25vw"
                        style={{ objectFit: "cover" }} />
                      {(() => {
                        const isSoldOut = product.variants.length > 0 && product.variants.reduce((s, v) => s + (v.stock || 0), 0) === 0;
                        if (!isSoldOut) return null;
                        return <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,0.62)", display:"flex", alignItems:"center", justifyContent:"center", padding:"9px 0", zIndex:2 }}><span style={{ color:"#fff", fontSize:9, fontWeight:800, letterSpacing:4, textTransform:"uppercase" }}>Sin stock</span></div>;
                      })()}
                      <div className="cp-overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#fff", fontSize: 11, letterSpacing: 3, fontWeight: 700, textTransform: "uppercase", border: "1px solid #fff", padding: "10px 20px" }}>Ver detalle</span>
                      </div>
                      <button onClick={e => { e.stopPropagation(); toggleFavorite(product.id); }}
                        style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.9)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill={favorites.includes(product.id) ? ACC : "none"} stroke={favorites.includes(product.id) ? ACC : "#555"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      </button>
                    </div>
                    <div style={{ padding: "14px 16px 18px" }}>
                      <p style={{ margin: "0 0 4px", fontSize: 10, color: "#999", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>{product.category}</p>
                      <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: prodText, lineHeight: 1.3 }}>{product.name}</p>
                      <PromoPrice product={product} promotions={promotions} fmt={fmt} accent={accentLegible} sobre="#111"
                        priceSize={16} compareSize={13} ocultarPrecios={ocultarPrecios}
                        gap={10} align="center" />
                    </div>
                  </div>
                  );
                })}
              </div>
              <div style={{ textAlign: "center", marginTop: 48, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                {quedanMas && (
                  <button onClick={() => setVisibleCount(c => c + PASO_PRODUCTOS)}
                    style={{ background: "none", color: prodText, border: `1px solid ${prodText}`, padding: "14px 44px", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer", transition: "opacity 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                    Ver más ({allFiltered.length - filtered.length})
                  </button>
                )}
                <a href={`/tienda/${storeConfig?.slug}/productos?t=chic-paris${isPreview ? "&from=editor" : ""}`}
                  style={{ display: "inline-block", background: ACC, color: accentText, border: `1px solid ${prodText}`, padding: "14px 44px", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", textDecoration: "none", transition: "opacity 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                  Ver colección completa
                </a>
              </div>
            </>
          )}
        </div>
      </section>
      </SectionBlock>

      {/* ── OFERTAS ── */}
      <SectionBlock id="cp-ofertas" label="Ofertas" isPreview={isPreview} defaultOrder={CP_SECTION_IDS}>
        {(() => {
          // "Oferta" para el comprador es cualquier cosa que le salga más barata,
          // no solo el precio anterior del producto: si una promoción de tienda le
          // baja el precio, esto también es una oferta y tiene que aparecer acá.
          // Ojo con las promos que NO tocan el precio (3×2, envío gratis): esas se
          // anuncian con su tag pero no entran en este bloque, porque el precio
          // que se mostraría al lado sería el de lista y parecería un error.
          const allOfertas = products.filter(p =>
            (p.comparePrice && p.comparePrice > p.price) || resolveProductPromo(p, promotions).hasPriceDrop
          );
          if (allOfertas.length === 0 && !isPreview) return null;
          const displayList = (allOfertas.length > 0 ? allOfertas : products).slice(0, 8);
          const hasMore = allOfertas.length > 8;
          const PAGE_SIZE = 4;
          const totalPages = Math.ceil(displayList.length / PAGE_SIZE);
          const page = Math.min(ofertasPage, Math.max(0, totalPages - 1));
          const pageItems = displayList.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
          return (
            <section data-reveal style={{ position: "relative", background: ofertasBg, padding: isMobile ? "48px 16px" : "72px 40px", borderTop: "1px solid #f0f0f0" }}>
              <EditableSectionBg field="bgOfertas" label="Fondo ofertas" />
              <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                <div style={{ textAlign: "center", marginBottom: 48 }}>
                  <p style={{ fontSize: 10, letterSpacing: 4, color: ACC, textTransform: "uppercase", fontWeight: 700, margin: "0 0 6px" }}><EditableZone field="ofertasKicker" label="Texto sobre Ofertas">Aprovechá</EditableZone></p>
                  <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(26px,3.5vw,42px)", fontWeight: 300, fontStyle: "italic", margin: 0, color: ofertasText }}><EditableZone field="ofertasTitle" label="Título Ofertas">Ofertas</EditableZone></h2>
                </div>
                <div style={{ position: "relative" }}>
                  {/* minmax(0, 360px) y no 360px pelado. Con el ancho fijo, entre 768 y
                      848px de pantalla el bloque se desbordaba: `isMobile` corta en 768,
                      así que a 768 ya se dibuja en dos columnas, y dos columnas de 360
                      más 48 de gap piden 768px cuando el contenedor mide 688 (768 menos
                      los 40 de padding de cada lado). 80px de más, justo en el ancho de
                      una tablet vertical. Ahora las columnas se achican hasta entrar. */}
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 360px))", justifyContent: "center", gap: isMobile ? 32 : 48 }}>
                    {pageItems.map(p => {
                      // El círculo del % tiene que decir el MISMO descuento que el precio
                      // de al lado. Si hay una promo de tienda vigente manda ella; si no,
                      // el % sale de la oferta del producto (comparePrice).
                      //
                      // El círculo y el chip de abajo NO dicen lo mismo: el círculo dice
                      // cuánto baja el precio de ESTE producto, el chip dice cuál promo lo
                      // baja. Un descuento de $10.000 es -20% en una remera de $50.000 y
                      // -10% en una campera de $100.000 — con el nombre de la promo solo,
                      // el comprador no sabe cuánto se ahorra acá.
                      const promoP = resolveProductPromo(p, promotions);
                      const pct = promoP.hasPriceDrop
                        ? promoP.pctOff
                        : (p.comparePrice && p.comparePrice > p.price ? Math.round((1 - p.price / p.comparePrice) * 100) : null);
                      return (
                        <div key={p.id} onClick={() => openModal(p)} className="cp-zoom" style={{ cursor: "pointer", display: "flex", gap: 20, alignItems: "center" }}>
                          <div style={{ position: "relative", width: 140, height: 175, flexShrink: 0, background: "#f5f5f5", overflow: "hidden", borderRadius: 4 }}>
                            {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes="140px" className="cp-zoom-img" style={{ objectFit: "cover" }} />}
                            {/* Adentro de la foto, no a caballo del borde. El contenedor
                                recorta (ese `overflow:hidden` es lo que redondea la
                                imagen), así que con top/right negativos el círculo
                                perdía la esquina y se veía como un cuadrado con una
                                punta comida. */}
                            {/* `!!pct` y no `pct &&`: con `pct === 0` el `&&` devuelve el
                                número, y React dibuja un "0" suelto arriba de la foto. Se
                                llega ahí con una oferta de menos del 0,5% (comparePrice
                                $10.040 contra $10.000 redondea a 0%). */}
                            {!!pct && (
                              <span style={{ position: "absolute", top: 8, right: 8, width: 40, height: 40, borderRadius: "50%", background: ACC, color: accentText, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", lineHeight: 1.1 }}>-{pct}%</span>
                            )}
                          </div>
                          {/* flex:1 — la columna de la grilla mide 360px fijos y el texto
                              ocupaba lo que medía, dejando un vacío a la derecha. */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: "0 0 8px", fontSize: 16, fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", color: ofertasText }}>{p.name}</p>
                            <PromoPrice product={p} promotions={promotions} fmt={fmt} accent={accentSobre(ofertasBg, ofertasText)} sobre={ofertasText}
                              priceSize={16} compareSize={13} ocultarPrecios={ocultarPrecios} consultaLabel="Consultá"
                              gap={10} align="center" />
                            {/* Este era el ÚNICO bloque de la tienda que no decía qué promo
                                era: todos los demás llaman a `avisoPromo` y este se había
                                escrito su propio círculo a mano. Va en modo "chip" y no
                                "foto" porque acá la foto mide 140px y el tag de una promo
                                con nombre largo ("SAN VALENTÍN · $10.000 OFF") la taparía
                                entera. */}
                            {avisoPromo(p, "chip")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Las flechas, en celular NO: la grilla pasa a una sola columna
                      y la foto arranca pegada al borde izquierdo, así que la flecha
                      quedaba justo encima de la prenda. Es el mismo caso que ya
                      arreglamos en el hero. Abajo están los puntitos, que en celular
                      son el control que se usa.
                      En tablet pasa lo mismo y el `!isMobile` no alcanza: hasta 936px
                      las dos columnas no dejan los 44px que mide la flecha, y vuelve a
                      caer sobre la foto. Eso lo corta el CSS (.cp-flecha-of), que puede
                      mirar el ancho real; `isMobile` solo sabe de 768. Los puntitos
                      siguen ahí. */}
                  {!isMobile && totalPages > 1 && page > 0 && (
                    <button onClick={() => setOfertasPage(p => p - 1)} aria-label="Anterior" className="cp-flecha-of"
                      style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", background: "#fff", border: `1px solid ${ACC}`, color: ACC, width: 44, height: 44, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                  )}
                  {!isMobile && totalPages > 1 && page < totalPages - 1 && (
                    <button onClick={() => setOfertasPage(p => p + 1)} aria-label="Siguiente" className="cp-flecha-of"
                      style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", background: "#fff", border: `1px solid ${ACC}`, color: ACC, width: 44, height: 44, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  )}
                </div>
                {totalPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 32 }}>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button key={i} onClick={() => setOfertasPage(i)} aria-label={`Página ${i + 1}`} style={{
                        width: page === i ? 22 : 8, height: 8, borderRadius: 4, border: "none", padding: 0,
                        background: page === i ? ACC : "#ddd", cursor: "pointer", transition: "all 0.3s",
                      }} />
                    ))}
                  </div>
                )}
                {hasMore && (
                  <div style={{ textAlign: "center", marginTop: 32 }}>
                    <button onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=chic-paris${isPreview ? "&from=editor" : ""}&oferta=true`; }}
                      style={{ background: "none", border: `1px solid ${ACC}`, color: ACC, padding: "12px 32px", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer" }}><EditableZone field="ofertasCta" label="Botón ver todas las ofertas">Ver todas las ofertas</EditableZone></button>
                  </div>
                )}
              </div>
            </section>
          );
        })()}
      </SectionBlock>

      {/* ── LO MÁS VISTO ── */}
      <SectionBlock id="cp-masvisto" label="Lo más visto" isPreview={isPreview} defaultOrder={CP_SECTION_IDS}>
        {(() => {
          // Vistas reales de compradores. En el editor se rellena para poder
          // configurar la sección; en la tienda real, si no hay datos no se muestra.
          const { lista: displayList, conVistas, esRelleno } = masVistos(products, { relleno: isPreview });
          const hasMore = conVistas > displayList.length;
          if (displayList.length === 0) return null;
          return (
            <section data-reveal style={{ position: "relative", background: masVistoBg, padding: isMobile ? "48px 16px" : "72px 40px", borderTop: "1px solid #f0f0f0" }}>
              <EditableSectionBg field="bgMasVisto" label="Fondo lo más visto" />
              <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                <div style={{ marginBottom: 40 }}>
                  <p style={{ fontSize: 10, letterSpacing: 4, color: ACC, textTransform: "uppercase", fontWeight: 700, margin: "0 0 6px" }}><EditableZone field="masVistoKicker" label="Texto sobre Lo más visto">Tendencia</EditableZone></p>
                  <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(24px,3vw,38px)", fontWeight: 300, fontStyle: "italic", margin: 0, color: masVistoText }}><EditableZone field="masVistoTitle" label="Título Lo más visto">Lo más visto</EditableZone></h2>
                </div>
                {/* Solo el dueño, y solo en el editor: la sección se está viendo con
                    relleno porque la tienda todavía no juntó vistas. */}
                {esRelleno && (
                  <p style={{ margin: "-24px 0 24px", fontSize: 12, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "8px 12px" }}>
                    Todavía no hay suficientes vistas de compradores, así que te mostramos productos de ejemplo
                    para que puedas darle formato. <b>En tu tienda esta sección aparece sola</b> cuando al menos
                    {" "}{MIN_MAS_VISTOS} productos hayan sido vistos.
                  </p>
                )}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 16 }}>
                  {displayList.map((p) => (
                    <div key={p.id} onClick={() => openModal(p)} className="cp-zoom" style={{ cursor: "pointer" }}>
                      {/* Sin el "#1, #2…" de antes: numerar sugiere un ranking firme
                          donde la diferencia real suele ser de una sola visita. */}
                      <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", background: "#f5f5f5", overflow: "hidden", borderRadius: 4 }}>
                        {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="cp-zoom-img" style={{ objectFit: "cover" }} />}
                        {avisoPromo(p)}
                      </div>
                      <div style={{ padding: "10px 0 0" }}>
                        <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: masVistoText }}>{p.name}</p>
                        <PromoPrice product={p} promotions={promotions} fmt={fmt} accent={accentSobre(masVistoBg, masVistoText)} sobre={masVistoText}
                          priceSize={14} compareSize={11} ocultarPrecios={ocultarPrecios} consultaLabel="Consultá" />
                      </div>
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <div style={{ textAlign: "center", marginTop: 40 }}>
                    <button onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=chic-paris${isPreview ? "&from=editor" : ""}&destacado=true`; }}
                      style={{ background: "none", border: `1px solid ${ACC}`, color: ACC, padding: "12px 32px", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer" }}><EditableZone field="masVistoCta" label="Botón ver más">Ver más</EditableZone></button>
                  </div>
                )}
              </div>
            </section>
          );
        })()}
      </SectionBlock>

      <SectionBlock id="cp-prueba-social" label="Prueba social" isPreview={isPreview} defaultOrder={CP_SECTION_IDS}>
        {(() => {
          // Los datos y las reglas vienen de useHomeReviews (ver arriba). Solo
          // se listan los ejemplos del editor, que son propios de este template:
          // si Chic Paris y Urban Pulse mostraran los mismos textos falsos, las
          // previews de la galeria se verian clonadas.
          return (
            <section data-reveal style={{ position:"relative", background: sc["bgPruebaSocial"] ?? "#fff", padding: isMobile ? "56px 0" : "72px 0", borderTop: "1px solid #f0f0f0" }}>
              <EditableSectionBg field="bgPruebaSocial" label="Fondo prueba social" />
              <div style={{ padding: isMobile ? "0 20px" : "0 40px", marginBottom: 32 }}>
                {/* Las cinco estrellas estaban escritas a mano —el texto literal
                    "★ ★ ★ ★ ★"— así que una tienda con promedio 2,4 mostraba igual
                    cinco estrellas doradas arriba de sus propias reseñas. No era un
                    adorno: era una afirmación que sus datos desmentían.
                    Ahora se dibuja el promedio real, con la cantidad al lado para
                    que se pueda dimensionar (4,8 con 2 reseñas no es lo mismo que
                    4,8 con 200). En modo preview se muestra el 5 de las de ejemplo. */}
                {(() => {
                  const promedio = isPreview ? 5 : (reviewStats?.promedio ?? 0);
                  const total = isPreview
                    ? (EJEMPLOS_RESENAS_CP.producto.length + EJEMPLOS_RESENAS_CP.tienda.length)
                    : (reviewStats?.total ?? 0);
                  if (!total) return null;
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 8px", flexWrap: "wrap" }}>
                      <span style={{ display: "flex", gap: 2 }}>
                        {[1, 2, 3, 4, 5].map(s => (
                          <span key={s} style={{ fontSize: 13, lineHeight: 1, color: s <= Math.round(promedio) ? STAR_ON : "#e8e8e8" }}>★</span>
                        ))}
                      </span>
                      <span style={{ fontSize: 10, letterSpacing: 2, color: "#757575", textTransform: "uppercase", fontWeight: 700 }}>
                        {promedio.toFixed(1).replace(".", ",")} · {total} {total === 1 ? "reseña" : "reseñas"}
                      </span>
                    </div>
                  );
                })()}
                {/* Con CERO reseñas el título cambia. "Lo que dicen nuestras
                    clientas" arriba de una sección vacía queda peor que no tener
                    la sección: parece una tienda a la que nadie le compró. Con
                    algo escrito, la sección pasa a ser una invitación, que es
                    para lo que sirve mientras no haya opiniones.
                    Si el dueño escribió su propio título, manda el suyo — no le
                    pisamos una decisión que ya tomó. */}
                <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(22px,2.5vw,34px)", fontWeight: 300, fontStyle: "italic", margin: 0, color: "#111" }}>
                  <EditableZone field="pruebaSocialTitle" label="Título prueba social">
                    {sinNada ? "¿Ya compraste? Contanos cómo te fue" : "Lo que dicen nuestras clientas"}
                  </EditableZone>
                </h2>
                {/* Descripción del bloque. Con reseñas cargadas la invitación a
                    dejar la propia se corrió al botón de abajo, así que este
                    renglón le da contexto al carrusel. Cuando está vacío no va:
                    ahí el texto de invitación (más abajo) ya cumple ese rol. */}
                {!sinNada && (
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "#777", lineHeight: 1.6, maxWidth: 520 }}>
                    <EditableZone field="pruebaSocialSubtitle" label="Descripción prueba social">
                      Opiniones reales de quienes ya compraron acá.
                    </EditableZone>
                  </p>
                )}

                {/* ── Aviso, solo mientras se edita ──────────────────────────────
                    Las 4 reseñas de abajo son de ejemplo y no se pueden tocar,
                    pero nada lo decía: quedaba pensar que eran reales, o esperar
                    poder editarlas.
                    No se limita a avisar que son falsas — usa los números reales
                    de la tienda para decir qué va a pasar. El caso importante es
                    el del medio: hay reseñas pero ninguna califica, así que el
                    bloque NO aparece en la tienda publicada. Eso, sin este cartel,
                    es imposible de descubrir: en el editor se ve lleno. */}
                {isPreview && (() => {
                  const total = resenasHome.totalReal;
                  const enPortada = resenasHome.enPortadaReal;
                  // Este cartel MENTÍA en sus dos primeros casos: decía que el
                  // bloque "no se muestra en la tienda publicada", y el bloque
                  // siempre se muestra —no hay un solo `return null`—. Con cero
                  // reseñas queda vacío, invitando a dejar la primera, y eso es a
                  // propósito: escondido, una tienda nueva no tendría nunca cómo
                  // recibirla, porque el botón para dejarla vive acá adentro.
                  const detalle =
                    total === 0
                      ? "Tu tienda todavía no tiene ninguna. Hasta que llegue la primera, el bloque se muestra vacío, invitando a tus clientas a dejarla."
                      : enPortada === 0
                        ? `Tenés ${total} ${total === 1 ? "reseña" : "reseñas"}, pero ninguna sube a la portada todavía: de los productos suben las de 4★ y 5★ con comentario, y las de tu tienda, las que hayas aprobado. Por eso hoy el bloque se ve vacío.`
                        : `Tenés ${total} ${total === 1 ? "reseña" : "reseñas"} y ${enPortada} ${enPortada === 1 ? "va" : "van"} a aparecer acá: las de 4★ y 5★ con comentario, más las de tu tienda que hayas aprobado.`;
                  return (
                    <div style={{ display: "flex", gap: 9, marginTop: 14, padding: "10px 13px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, maxWidth: 620 }}>
                      <span style={{ flexShrink: 0, fontSize: 13, lineHeight: 1.4 }}>⚠️</span>
                      <p style={{ margin: 0, fontSize: 11.5, color: "#92400e", lineHeight: 1.55 }}>
                        <strong>Estas reseñas son de ejemplo.</strong> No se pueden editar y no se publican —
                        están para que veas cómo queda el bloque. Se reemplazan solas por las reseñas reales
                        de tus clientas. {detalle}
                        {" "}El título de arriba y el fondo sí son tuyos: esos se editan y se guardan.
                      </p>
                    </div>
                  );
                })()}
                {/* ── Las dos pestañas ──────────────────────────────────────
                    Son dos cosas distintas y se leen distinto: una habla de un
                    producto puntual, la otra de cómo atiende la tienda. Mezcladas
                    en una sola fila, quien busca saber "si son serios" tiene que
                    leer opiniones de talles. */}
                <div style={{ display: "flex", gap: 24, marginTop: 20, borderBottom: "1px solid #eee" }}>
                  {([
                    { key: "producto" as const, label: "Los productos", n: deProducto.length },
                    { key: "tienda"   as const, label: "La tienda",     n: deTienda.length },
                  ]).map(t => (
                    <button key={t.key} type="button" onClick={() => setResenaTab(t.key)}
                      style={{
                        background: "none", border: "none", cursor: "pointer", padding: "0 0 10px",
                        marginBottom: -1, fontSize: 10, fontWeight: 700, letterSpacing: 2,
                        textTransform: "uppercase",
                        color: tabEfectiva === t.key ? "#111" : "#999",
                        borderBottom: `2px solid ${tabEfectiva === t.key ? ACC : "transparent"}`,
                      }}>
                      {t.label} <span style={{ color: "#aaa", fontWeight: 400 }}>({t.n})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Vacío: en vez de esconder el bloque, se invita a escribir. */}
              {lista.length === 0 && (
                <div style={{ padding: isMobile ? "0 20px 8px" : "0 40px 8px" }}>
                  <p style={{ fontSize: 13, color: "#777", lineHeight: 1.7, margin: 0, maxWidth: 520 }}>
                    {tabEfectiva === "tienda"
                      ? sinNada
                        ? "Todavía nadie dejó su opinión. Si compraste acá, contanos cómo te fue — sos la primera."
                        : "Todavía nadie opinó sobre la tienda en general. Si compraste, contanos cómo te fue."
                      : "Todavía nadie opinó sobre un producto. Las opiniones se dejan desde la ficha de cada uno."}
                  </p>
                </div>
              )}

              <div style={{ display: "flex", gap: 16, overflowX: "auto", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", paddingLeft: isMobile ? 20 : 40, paddingRight: isMobile ? 20 : 40, paddingBottom: 8, scrollbarWidth: "none" }}>
                {lista.map(r => (
                  <div key={r.id} style={{ flexShrink: 0, width: isMobile ? "85vw" : 300, scrollSnapAlign: "start", background: "#fafafa", border: "1px solid #f0f0f0", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
                    {isOwner && !isPreview && (
                      <button onClick={() => deleteHomeReview(r.id)}
                        style={{ position:"absolute", top:8, right:8, background:"none", border:"none", color:"#e0e0e0", cursor:"pointer", fontSize:15, lineHeight:1, padding:4 }}
                        onMouseEnter={e => (e.currentTarget.style.color="#dc2626")}
                        onMouseLeave={e => (e.currentTarget.style.color="#e0e0e0")}
                        title="Eliminar reseña">×</button>
                    )}
                    <div style={{ display: "flex", gap: 2 }}>
                      {[1,2,3,4,5].map(s => <span key={s} style={{ color: s <= r.rating ? STAR_ON : "#e8e8e8", fontSize: 13 }}>★</span>)}
                    </div>
                    {r.comment && (
                      <ResenaComentario
                        texto={r.comment}
                        acento={ACC}
                        // La tipografía se pasa explícita: el componente ya no
                        // trae Playfair de fábrica, porque cuando lo traía
                        // cualquier template que lo usara sin pensarlo aparecía
                        // escrito con la letra de Chic Paris.
                        estiloTexto={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", color: "#444" }}
                        // Abre la vista rápida de ESE producto, que ya trae todas
                        // sus reseñas enteras. No manda a /producto/[id] porque
                        // chic-paris no usa página de detalle —usa el modal— y
                        // sacarlo de la portada sería cambiarle el recorrido.
                        // Si el producto no está entre los cargados, no se ofrece
                        // el link en vez de abrir un modal vacío.
                        onVerMas={(() => {
                          const p = r.product?.id ? products.find(x => x.id === r.product!.id) : undefined;
                          return p && !isPreview ? () => setModalProduct(p) : null;
                        })()}
                      />
                    )}
                    <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 12, display:"flex", alignItems:"center", gap:10 }}>
                      {/* 36px es muy chico para una prenda: no se distingue si es
                          una campera o un pantalón, que es justo lo que aporta. */}
                      {r.product?.image && (
                        <FadeImage src={r.product.image} alt={r.product?.name ?? ""} width={46} height={46} style={{ objectFit:"cover", borderRadius:4, border:"1px solid #f0f0f0", flexShrink:0 }} />
                      )}
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: "#111", margin: "0 0 2px", letterSpacing: 1.5, textTransform: "uppercase" }}>{r.reviewer}</p>
                        {/* Era 10px en #bbb: contraste 1,84 sobre el #fafafa de la
                            tarjeta, cuando el mínimo legible es 4,5. Casi el mismo
                            color que el fondo. #747474 es el gris más parecido que
                            sí se lee. */}
                        {/* El nombre lo pone el dueño y puede ser largo ("Campera inflable
    larga negra talle XL"). Con el corte a 2 líneas la fila de abajo
    no crece sin control; que no se salga de la tarjeta ya lo cubre
    el `overflow-wrap` global. */}
{r.product?.name && (
  <p style={{ fontSize: 11, color: "#6e6e6e", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.product.name}</p>
)}
                        {/* El sello decía "Compra verificada" en los dos casos, y
                            no son lo mismo: "auto" significa que el sistema cruzó
                            un pedido ENTREGADO con ese email y ese producto;
                            "owner" significa que lo marcó el dueño a mano. La
                            tienda estaba afirmando una compra que nadie comprobó.
                            El panel del dueño ya distinguía los dos — el que
                            mentía era el cartel que ve el comprador. */}
                        {/* 9px con esos colores no llegaba al mínimo legible (3,16 el
                            verde y 2,46 el gris, contra 4,5). Son los tonos más
                            parecidos que sí se leen sobre el #fafafa de la tarjeta. */}
                        {r.verified && (
                          <p style={{ fontSize: 10, fontWeight: 700, color: r.verifiedBy === "auto" ? "#117f3a" : "#607490", margin: "4px 0 0", letterSpacing: 0.5 }}>
                            {r.verifiedBy === "auto" ? "✓ Compra verificada" : "✓ Verificada por la tienda"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {lista.length > (isMobile ? 1 : 3) && (
                <p style={{ textAlign: "center", fontSize: 10, color: "#ccc", letterSpacing: 2, marginTop: 16, textTransform: "uppercase" }}>← deslizá →</p>
              )}

              {/* ── Botón para dejar reseña de tienda ─────────────────────────
                  El formulario vive en un modal (más abajo, a nivel de página):
                  acá solo está el disparador, para que las reseñas no queden
                  empujadas por un formulario largo. Una reseña de PRODUCTO no va
                  por acá —necesita saber de qué producto es— así que se deja desde
                  la ficha; ésta es de la tienda y no apunta a nada. */}
              {tabEfectiva === "tienda" && (
                <div style={{ padding: isMobile ? "24px 20px 0" : "32px 40px 0", textAlign: "center" }}>
                  <button type="button" onClick={abrirTiendaModal}
                    style={{ background: "none", border: `1px solid ${opinionAccent}`, color: opinionAccent, padding: "13px 40px", fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer", transition: "opacity 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                    Dejá tu opinión
                  </button>
                </div>
              )}
            </section>
          );
        })()}
      </SectionBlock>

      <SectionBlock id="cp-nosotros" label="Nuestra historia" isPreview={isPreview} defaultOrder={CP_SECTION_IDS}>
      {/* ── ABOUT ── */}
      <section id="nosotros" data-reveal style={{ background: aboutBg, padding: isMobile ? "48px 16px" : "80px 40px", position: "relative" }}>
        <EditableSectionBg field="bgAbout" label="Fondo nosotros" />
        {(() => {
          const imagenEl = (
            <div style={{ position: "relative" }}>
              {(() => {
                const ov = storeConfig?.imageOverrides?.["nosotrosImage"];
                return (
                  <div style={{ width: "100%", aspectRatio: "4/5", background: "#d8d0c8", overflow: "hidden", position: "relative" }}>
                    {ov?.url
                      ? <FadeImage src={ov.url} alt="" fill sizes="(max-width: 768px) 100vw, 450px" style={{ objectFit: "cover", objectPosition: `${ov.posX ?? 50}% ${ov.posY ?? 50}%` }} />
                      : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #e8e0d8, #c8bcb0)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 11, color: "#a09080", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>Subí tu foto</span>
                        </div>
                    }
                    {ov?.overlayType && ov.overlayType !== "none" && (
                      <div style={{ position:"absolute", inset:0, pointerEvents:"none", background: ov.overlayType === "light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.45})` }} />
                    )}
                  </div>
                );
              })()}
              <EditableImageButton field="nosotrosImage" label="Imagen nosotros" />
            </div>
          );
          const tituloEl = (
            <>
              <span style={{ fontSize: 10, letterSpacing: 5, fontWeight: 700, color: ACC, textTransform: "uppercase", display: "block", marginBottom: 16 }}>
                <EditableZone field="aboutKicker" label="Kicker nosotros">Nuestra Historia</EditableZone>
              </span>
              <h2 style={{ fontSize: "clamp(26px,3vw,38px)", fontWeight: 900, color: aboutText, margin: "0 0 20px", lineHeight: 1.1, textTransform: "uppercase" }}>
                <EditableZone field="aboutHeading" label="Título nosotros">Moda con propósito.</EditableZone>
              </h2>
            </>
          );
          const descEl = (
            <>
              <p style={{ fontSize: 15, color: aboutText, opacity: 0.75, lineHeight: 1.8, margin: "0 0 16px" }}>
                <EditableZone field="aboutParagraph1" label="Párrafo 1 nosotros">Creamos prendas pensando en la mujer y el hombre que eligen con consciencia. Cada pieza combina diseño contemporáneo con materiales seleccionados para durar.</EditableZone>
              </p>
              <p style={{ fontSize: 15, color: aboutText, opacity: 0.75, lineHeight: 1.8, margin: "0 0 32px" }}>
                <EditableZone field="aboutParagraph2" label="Párrafo 2 nosotros">Trabajamos con talleres locales que respetan a su gente. Moda responsable, sin resignar estilo.</EditableZone>
              </p>
              <button onClick={() => scrollTo("contacto")} style={{ background: ACC, color: accentText, border: "none", padding: "13px 32px", fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer" }}>
                <EditableZone field="aboutCta" label="Botón nosotros">Contactanos</EditableZone>
              </button>
            </>
          );
          // En celular el orden natural de lectura es TÍTULO → FOTO → DESCRIPCIÓN.
          // Antes se apilaba en el orden del grid (foto primero, porque va en la
          // columna izquierda del layout de escritorio), y quedaba foto → título →
          // texto. En escritorio se mantiene el 2 columnas de siempre: foto a la
          // izquierda, texto (título + descripción) a la derecha.
          if (isMobile) {
            // En celular, además del orden, el título y la descripción (con su
            // botón) van centrados: alineados a la izquierda quedaban descolgados
            // debajo de la foto centrada. En escritorio se mantiene a la izquierda,
            // que es el estilo editorial del bloque.
            return (
              <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ textAlign: "center" }}>{tituloEl}</div>
                {imagenEl}
                <div style={{ textAlign: "center" }}>{descEl}</div>
              </div>
            );
          }
          return (
            <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
              {imagenEl}
              <div>{tituloEl}{descEl}</div>
            </div>
          );
        })()}
      </section>
      </SectionBlock>

      <SectionBlock id="cp-contacto" label="Contacto" isPreview={isPreview} defaultOrder={CP_SECTION_IDS}>
      {/* ── CONTACT — split editorial ── */}
      <section id="contacto" data-reveal style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", minHeight: isMobile ? "auto" : 540 }}>

        {/* Panel izquierdo — info */}
        <div style={{ background: "#111", padding: isMobile ? "48px 20px" : "72px 56px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative" }}>
          <div>
            <span style={{ fontSize: 10, letterSpacing: 5, fontWeight: 700, color: ACC, textTransform: "uppercase", display: "block", marginBottom: 24 }}>
              <EditableZone field="contactKicker" label="Kicker contacto">Contacto</EditableZone>
            </span>
            <h2 style={{ fontSize: "clamp(32px,3.5vw,52px)", fontWeight: 900, color: "#fff", margin: "0 0 24px", lineHeight: 1.05, textTransform: "uppercase", letterSpacing: "-1px" }}>
              <EditableZone field="contactHeading" label="Título contacto">Escribinos,<br/>te respondemos.</EditableZone>
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.8, margin: 0, maxWidth: 320 }}>
              <EditableZone field="contactSubtext" label="Subtítulo contacto">Estamos disponibles para consultas sobre pedidos, talles, envíos y colaboraciones.</EditableZone>
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Línea decorativa */}
            <div style={{ width: 40, height: 2, background: ACC, margin: "8px 0" }} />

            {/* Info items */}
            {[
              { icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>, label: "Email", value: <EditableZone field="contactEmail" label="Email de contacto">hola@tutienda.com</EditableZone> },
              { icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>, label: "WhatsApp", value: <EditableZone field="contactPhone" label="WhatsApp / Teléfono">{storeConfig?.whatsapp?.number ?? "+54 9 11 0000-0000"}</EditableZone> },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ color: ACC, marginTop: 1, flexShrink: 0 }}>{icon}</div>
                <div>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 2, textTransform: "uppercase" }}>{label}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{value}</p>
                </div>
              </div>
            ))}

            {/* Las redes NO van acá: están en el footer, que arranca a menos de una
                pantalla de distancia, con la misma lista y el mismo fondo oscuro.
                Se veían dos veces seguidas.
                Se dejan en el footer y no acá por una razón concreta: esta sección
                es un bloque que el dueño puede ocultar (`cp-contacto`) y el footer
                no. Si se hubiera hecho al revés, ocultar Contacto se llevaba
                puestas las redes de toda la tienda sin que nadie lo pidiera.
                Lo que sí queda es Email y WhatsApp, que son para escribir — que es
                justo lo que vino a hacer alguien que llegó hasta el formulario. */}
          </div>
        </div>

        {/* Panel derecho — formulario */}
        <div style={{ background: "#fafaf8", padding: isMobile ? "48px 20px" : "72px 56px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <ContactForm
            storeId={storeConfig?.storeId} isPreview={isPreview} prefillMessage={inquiryMessage}
            accent={ACC} textColor="#111" mutedColor="#e0e0e0"
            radius={0} buttonRadius={0}
            theme={{
              showLabels: true,
              labelStyle: { display:"block", fontSize:10, fontWeight:700, color:"#999", letterSpacing:1.5, textTransform:"uppercase", marginBottom:6 },
              twoColTop: true,
              inputBorderColor: "#e0e0e0",
              focusBorderColor: ACC,
              inputPadding: "10px 14px",
              fontSize: 13,
              gap: 12,
              intro: <p style={{ margin:"0 0 20px", fontSize:11, fontWeight:700, color:"#999", letterSpacing:3, textTransform:"uppercase" }}>Envianos un mensaje</p>,
              placeholders: { nombre: "Tu nombre", email: "Tu email", mensaje: "¿En qué te podemos ayudar?" },
              buttonLabel: "Enviar mensaje →",
              buttonFullWidth: false,
              buttonStyle: { background:"#111", color:"#fff", padding:"15px 32px", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", transition:"background 0.2s" },
              buttonHoverStyle: { background: ACC },
            }}
            renderSent={reset => (
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${ACC}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 900, color: "#111", textTransform: "uppercase" }}>¡Mensaje enviado!</h3>
                <p style={{ fontSize: 14, color: "#777", margin: "0 0 28px" }}>Te respondemos a la brevedad.</p>
                <button onClick={reset}
                  style={{ background: "transparent", color: "#111", border: "2px solid #ddd", padding: "10px 28px", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}>
                  Enviar otro
                </button>
              </div>
            )}
          />
        </div>
      </section>
      </SectionBlock>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ background: footerBg, padding: isMobile ? "40px 20px 88px" : "48px 40px 32px", position: "relative" }}>
        <EditableSectionBg field="bgFooter" label="Fondo footer" />
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          {/* Dos columnas, no tres: la de "Legal" se sacó por duplicada. */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: isMobile ? 32 : 40, marginBottom: 40, paddingBottom: 40, borderBottom: `1px solid ${footerText === "#fff" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}` }}>
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 900, color: footerText, letterSpacing: 3, textTransform: "uppercase" }}>
                <EditableZone field="storeName" label="Nombre footer">{storeConfig?.storeName ?? "CHIC PARIS"}</EditableZone>
              </p>
              <p style={{ margin: 0, fontSize: 13, color: footerText, opacity: 0.55, lineHeight: 1.7, maxWidth: 280 }}>
                <EditableZone field="footerDescription" label="Descripción footer">Moda contemporánea para quienes eligen con intención.</EditableZone>
              </p>
              {/* El `.some()` no estaba: con todas las redes vacías, el filtro dejaba
                  la lista en cero pero el <div> se dibujaba igual y metía 20px de
                  aire suelto abajo de la descripción. Antes se disimulaba porque
                  las redes también estaban arriba; ahora este es el único lugar. */}
              {storeConfig?.socialLinks && (isPreview || Object.values(storeConfig.socialLinks).some(v => v)) && (
                <div style={{ display: "flex", gap: 14, marginTop: 20 }}>
                  {Object.entries(storeConfig.socialLinks).filter(([, v]) => isPreview || v).map(([net, url]) => (
                    <a key={net} href={url || "#"} target={url ? "_blank" : undefined} rel="noopener"
                      onClick={e => { if (!url) e.preventDefault(); }}
                      style={{ color: footerText, opacity: url ? 0.55 : 0.3, fontSize: 11, textDecoration: "none", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, cursor: url ? "pointer" : "default" }}>{net}</a>
                  ))}
                </div>
              )}
            </div>
            {/* Las colecciones salen de las categorías REALES de la tienda — las
                mismas que el menú del navbar (`categoryList`). Antes estaban
                escritas a mano en el template ("Mujer", "Hombre", "Accesorios",
                "Sale") y no coincidían con ninguna categoría de ninguna tienda: los
                cuatro links llevaban a un listado vacío. Si la tienda todavía no
                tiene categorías, la columna no se muestra. */}
            {categoryList.length > 0 && (
              <div>
                <p style={{ margin: "0 0 16px", fontSize: 10, fontWeight: 800, color: footerText, letterSpacing: 3, textTransform: "uppercase" }}>Colecciones</p>
                {categoryList.slice(0, 6).map(l => (
                  <button key={l} onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=chic-paris${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(l!)}`; }}
                    style={{ display: "block", background: "none", border: "none", color: footerText, opacity: 0.55, fontSize: 13, cursor: "pointer", padding: "4px 0", textAlign: "left", textTransform: "capitalize" }}>{l}</button>
                ))}
              </div>
            )}
            {/* La columna "Legal" que iba acá se sacó: repetía exactamente los mismos
                tres links que la barra de abajo, en el mismo footer. */}
          </div>
          {/* Los paddings de 110/100 dejan lugar a los botones flotantes (carrito
              y WhatsApp) para que no tapen los links — pero eso es SOLO en
              escritorio, donde los botones viven en las esquinas de abajo. En
              celular esos paddings dejaban ~130px de ancho util y apilaban todo
              en una columnita apretada; ahí se sacan (el footer ya tiene 88px de
              padding abajo para que los botones flotantes no pisen la ultima
              linea) y las dos partes se apilan prolijas. */}
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexWrap: "wrap", gap: isMobile ? 16 : "8px 24px", paddingLeft: isMobile ? 0 : (hasWA ? 110 : 0), paddingRight: isMobile ? 0 : 100 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              {[
                { label: "Política de devoluciones", tipo: "devoluciones" },
                { label: "Política de envíos",       tipo: "envios" },
                { label: "Términos y condiciones",   tipo: "terminos" },
              ].map(({ label, tipo }) => (
                editMode ? (
                  <button key={tipo} type="button" onClick={() => window.open("/dashboard/pagos", "_blank")}
                    title="Editar en Dashboard → Pagos"
                    style={{ fontSize: 11, color: footerText, opacity: 0.4, background: "none", border: "none", cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", gap: 4 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.4"; }}>
                    {label}
                    <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                ) : (
                  <a key={tipo} href={`/tienda/${storeConfig?.slug ?? ""}/politicas?tipo=${tipo}`}
                    style={{ fontSize: 11, color: footerText, opacity: 0.4, textDecoration: "none" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.4"; }}>
                    {label}
                  </a>
                )
              ))}
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"8px 20px", alignItems:"center" }}>
              <p style={{ margin: 0, fontSize: 11, color: footerText, opacity: 0.4 }}>
                <EditableZone field="footerCopyright" label="Copyright">© 2025 Chic Paris. Todos los derechos reservados.</EditableZone>
              </p>
              {!editMode && (
                <button onClick={() => setShowReport(true)}
                  style={{ fontSize:11, color:footerText, opacity:0.4, background:"none", border:"none", cursor:"pointer", padding:0 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.8"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.4"; }}>
                  Reportar tienda
                </button>
              )}
            </div>
          </div>

        </div>
      </footer>

      {showReport && (
        <ReportStoreModal slug={storeConfig?.slug ?? ""} onClose={() => setShowReport(false)} />
      )}

      {/* ── SEARCH OVERLAY ── */}
      {searchOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "80px 20px 20px", backdropFilter: "blur(4px)" }}
          onClick={() => setSearchOpen(false)}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 560, borderRadius: 4, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", padding: "0 20px", borderBottom: "1px solid #f0f0f0" }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar productos..." style={{ flex: 1, border: "none", padding: "18px 14px", fontSize: 15, outline: "none", fontFamily: "inherit" }} />
              <button onClick={() => setSearchOpen(false)} aria-label="Cerrar búsqueda" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#999" }}>×</button>
            </div>
            <div style={{ maxHeight: 380, overflowY: "auto", padding: 12 }}>
              {searchResults.length > 0 ? searchResults.map(p => (
                <div key={p.id} onClick={() => { openModal(p); setSearchQuery(""); setSearchOpen(false); }}
                  style={{ display: "flex", gap: 14, padding: "10px 8px", cursor: "pointer", borderRadius: 4 }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <FadeImage src={p.images[0] ?? "/placeholder.jpg"} alt={p.name} width={48} height={60} style={{ objectFit: "cover", flexShrink: 0 }} />
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600 }}>{p.name}</p>
                    <PromoPrice product={p} promotions={promotions} fmt={fmt} accent={accentLegible} sobre="#111"
                      priceSize={13} compareSize={11} weight={700} ocultarPrecios={ocultarPrecios} />
                    {avisoPromo(p, "chip")}
                  </div>
                </div>
              )) : searchQuery ? (
                <p style={{ padding: "20px 8px", color: "#999", fontSize: 13 }}>No se encontraron resultados para &quot;{searchQuery}&quot;</p>
              ) : (
                <p style={{ padding: "20px 8px", color: "#bbb", fontSize: 13 }}>Escribí para buscar...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PRODUCT MODAL ── */}
      {modalProduct && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: isPreview ? 20000 : 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}
          onClick={() => setModalProduct(null)}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 980, maxHeight: isPreview ? "100%" : "90vh", overflow: "hidden", display: "flex", flexDirection: "column", borderRadius: 4, boxShadow: "0 32px 80px rgba(0,0,0,0.35)", position:"relative" }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => { setModalProduct(null); setLightboxSrc(null); }} aria-label="Cerrar" style={{ position:"absolute", top:8, right:8, zIndex:10, background:"rgba(0,0,0,0.5)", border:"none", color:"#fff", width:36, height:36, borderRadius:"50%", cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
            <div style={{ overflow:"auto", flex:1, minHeight:0, display:"flex", flexDirection:"column" }}>
            <div style={{ display:"flex", flexDirection: isMobile ? "column" : "row" }}>
            {/* Images — la columna NO se estira al alto del panel de detalles
                (`alignSelf:"flex-start"`). Sin eso, al ser hermana en una fila
                flex tomaba el alto de TODO lo de la derecha —descripción, talles,
                reseñas— y la foto, con `objectFit:cover`, mostraba una franja
                vertical altísima: se veía el cierre de la campera a cinco
                aumentos en vez de la prenda. Ahora la caja tiene proporción
                propia, la misma 3/4 que la grilla del catálogo. */}
            {/* El aire lo pone la COLUMNA, no cada bloque: así la foto, las
                miniaturas y los videos arrancan todos en la misma vertical. Antes
                la foto iba pegada al borde del modal y los reels tampoco respiraban
                del filo izquierdo. */}
            <div ref={colFotoRef} style={{ width: isMobile ? "100%" : "48%", flexShrink: 0, alignSelf: "flex-start",
                                           boxSizing: "border-box", padding: isMobile ? 0 : "28px 0 28px 28px" }}>
            {/* 3/4 también en celular. Era 4/3 —apaisado— y las fotos de ropa son
                verticales: con `objectFit:cover` la caja recortaba la prenda arriba y
                abajo, y en un teléfono de 360px se perdía casi la mitad del alto. El
                comprador solo veía la foto entera si la abría en grande, que es
                justamente lo que uno hace DESPUÉS de que la miniatura lo convenció.
                Es además el único lugar de la tienda que no usaba 3/4: la grilla, lo
                más visto, los similares y el modal del listado ya lo usan. */}
            <div style={{ position: "relative", width: "100%", overflow: "hidden", aspectRatio: "3/4" }} {...imgSwipe}>
              <FadeImage src={modalProduct.images[modalImg] ?? "/placeholder.jpg"} alt={modalProduct.name} fill sizes="(max-width: 768px) 100vw, 480px"
                style={{ objectFit: "cover", cursor:"zoom-in" }}
                onClick={() => setLightboxSrc(modalProduct.images[modalImg] ?? "/placeholder.jpg")} />
              {(() => {
                if (modalPromo?.primaryPromo) return <PromoTag tipo={modalPromo.primaryPromo.type} label={describePromo(modalPromo.primaryPromo).headline} />;
                const hasOffer = !variantPrice && !!modalProduct.comparePrice && modalProduct.comparePrice > modalProduct.price;
                if (!hasOffer) return null;
                return <OfferBadge badge={modalProduct.offerBadge} pct={discountPercent(modalProduct.price, modalProduct.comparePrice)} size="md" />;
              })()}
              {modalProduct.images.length > 1 && (<>
                <button onClick={() => elegirFoto(modalImg - 1)}
                  aria-label="Imagen anterior"
                  style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.85)", border: "none", width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, zIndex: 2 }}>‹</button>
                <button onClick={() => elegirFoto(modalImg + 1)}
                  aria-label="Imagen siguiente"
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.85)", border: "none", width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, zIndex: 2 }}>›</button>
                <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 2 }}>
                  {modalProduct.images.map((_, i) => (
                    <button key={i} onClick={() => elegirFoto(i)} aria-label={`Foto ${i + 1}`}
                      style={{ width: i === modalImg ? 24 : 8, height: 8, borderRadius: 4, border: "none", background: i === modalImg ? "#fff" : "rgba(255,255,255,0.5)", cursor: "pointer", padding: 0, transition: "all 0.3s" }} />
                  ))}
                </div>
              </>)}
            </div>
            {/* Miniaturas — antes solo había flechas y puntitos, y los puntitos no
                dicen QUÉ hay en las otras fotos: el que no los ve, se va creyendo
                que el producto tiene una sola imagen. Van abajo y en fila, igual
                que en FashionNoir / BohoTerra / UrbanPulse, así el mismo diseño
                sirve en celular y en escritorio (una tira vertical al costado no
                entra en 360px y obligaría a mantener dos).
                Tocar una miniatura solo mueve `modalImg`: el efecto que ya existe
                se encarga de sincronizar el color cuando esa foto es de otra
                variante. */}
            {modalProduct.images.length > 1 && (
              <div style={{ display: "flex", gap: 8, padding: isMobile ? "10px 14px 0" : "10px 0 0", overflowX: "auto", scrollbarWidth: "none" }}>
                {modalProduct.images.map((img, i) => (
                  <button key={i} onClick={() => elegirFoto(i)} aria-label={`Ver foto ${i + 1}`}
                    style={{ position: "relative", width: 56, height: 74, flexShrink: 0, padding: 0, cursor: "pointer", overflow: "hidden",
                             background: "#f5f5f5", border: i === modalImg ? `2px solid ${ACC}` : "1px solid #e8e8e8", transition: "border-color 0.2s" }}>
                    <FadeImage src={img} alt="" fill sizes="56px" style={{ objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            )}
            {/* ── Videos, debajo de la foto y DENTRO de esta columna ────────────
                Acá el espacio a la derecha de los reels no es un vacío: es la
                columna de la descripción. Por eso van adentro y no a lo ancho —
                a lo ancho son 3 miniaturas angostas solas en una fila de 1030px,
                y no hay forma de que la llenen. Alineados a la izquierda, en
                línea con la foto y las miniaturas.
                Ojo con meterlos DENTRO de la caja de la foto: esa se dibuja con
                `fill` (`position:absolute; inset:0`) y taparía el bloque. Van
                como hermanos, después de las miniaturas. */}
            {modalProduct.reelUrls.length > 0 && (
              <div style={{ padding: isMobile ? "18px 20px 0" : "22px 0 0" }}>
                <p style={CP_MODAL_TITULO}>Videos</p>
                {/* 160 y no el 104 por defecto: al lado de una foto de ~440px el
                    reel chico parecía una estampilla y no se distinguía qué se
                    estaba mostrando. Es el mismo ancho que usa el modal de la
                    página de productos, para que los dos se vean igual. */}
                <StoreProductReels
                  reelUrls={modalProduct.reelUrls}
                  ancho={isMobile ? 120 : 160}
                  theme={{ accent: ACC, text: "#111", border: `${ACC}33`, radius: 4 }}
                />
              </div>
            )}
            </div>
            {/* Details — se ajusta al alto de la columna de la foto y scrollea por
                dentro. El scroll de acá NO compite con el del modal: este panel
                termina justo donde arranca Reseñas, y de ahí para abajo scrollea
                el modal. En celular no aplica (columnas apiladas, sin alto fijo). */}
            <div style={{ flex: 1, minWidth: 0, position: "relative", display: "flex" }}>
            {/* Degradados: reponen la señal que se perdió al ocultar la barra.
                Aparecen solo si de verdad queda contenido de ese lado. */}
            {sombraArriba && (
              <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 28, zIndex: 2, pointerEvents: "none",
                            background: "linear-gradient(to top, transparent, #ffffff)" }} />
            )}
            {sombraAbajo && (
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 44, zIndex: 2, pointerEvents: "none",
                            background: "linear-gradient(to bottom, transparent, #ffffff)" }} />
            )}
            <div ref={panelRef} className="cp-sin-barra" style={{ flex: 1, minHeight: 0, padding: isMobile ? "20px 20px" : "28px 32px", display: "flex", flexDirection: "column",
                          ...(altoPanel ? { maxHeight: altoPanel, overflowY: "auto" as const } : {}) }}>
              {/* ── Encabezado: qué es, cómo se llama y cuánto sale ──────────
                  El precio va pegado al nombre. Antes en el medio estaban los dos
                  botones de compartir, que son lo último que hace alguien que
                  todavía no sabe cuánto cuesta — ahora bajaron al final. */}
              <p style={{ margin: "0 0 6px", fontSize: 10, color: "#999", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>
                {modalProduct.category}
                {modalProduct.subcategory && <span style={{ opacity: 0.65 }}> › {modalProduct.subcategory}</span>}
              </p>
              <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 900, color: "#111", lineHeight: 1.2 }}>{modalProduct.name}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                {ocultarPrecios ? (
                  <span style={{ fontSize: 24, fontWeight: 900, color: accentLegible }}>Consultá precio</span>
                ) : modalPromo?.hasPriceDrop ? (
                  <>
                    <span style={{ fontSize: 24, fontWeight: 900, color: "#dc2626" }}>{fmt(modalPromo.effectivePrice)}</span>
                    <span style={{ fontSize: 16, color: "#8a8a8a", textDecoration: "line-through" }}>{fmt(modalPromo.originalPrice)}</span>
                    {modalPromo.pctOff != null && <span style={{ fontSize: 12, fontWeight: 800, color: "#16a34a", background: "#dcfce7", padding: "2px 8px", borderRadius: 4 }}>{modalPromo.pctOff}% OFF</span>}
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 24, fontWeight: 900, color: accentLegible }}>{fmt(displayPrice)}</span>
                    {/* `> price`, no `comparePrice` a secas: con un precio anterior
                        igual o menor al actual se tachaba un número que no era
                        ninguna oferta. El badge de la foto ya preguntaba bien —
                        el que mentía era este. Es el mismo arreglo que `PromoPrice`
                        hizo en las listas (CP-1); el modal quedó afuera porque
                        pinta el precio a mano. */}
                    {!variantPrice && modalProduct.comparePrice != null && modalProduct.comparePrice > modalProduct.price && (
                      <span style={{ fontSize: 16, color: "#8a8a8a", textDecoration: "line-through" }}>{fmt(modalProduct.comparePrice)}</span>
                    )}
                  </>
                )}
              </div>
              {modalPromo?.primaryPromo && (
                <div style={{ marginTop: 14 }}>
                  <PromoBlock promo={modalPromo.primaryPromo} freeShippingExtra={modalPromo.freeShipping} />
                </div>
              )}
              {!ocultarPrecios && modalProduct.offerNote && (
                <div style={{ marginTop: 10, fontSize: 12, color: "#059669", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 4, padding: "5px 10px", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>{modalProduct.offerNote}</span>
                </div>
              )}

              {/* ── Comprar ─────────────────────────────────────────────────
                  Talle, color, cantidad y el botón, todo junto y ARRIBA de la
                  descripción. Antes había que pasar la ficha entera —descripción
                  larga incluida— para encontrar dónde se agrega al carrito: el
                  que ya decidió comprar tenía que leer igual. */}
              <CpBloque>
              {modalProduct.sizes.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={CP_MODAL_TITULO}>Talle</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {modalProduct.sizes.map(s => {
                      const outOfStock = outOfStockSizes.has(s);
                      return (
                        <button key={s} onClick={() => elegirTalle(s)} style={{
                          padding: "8px 14px", border: selectedSize === s ? `2px solid ${accentRelleno}` : "2px solid #e0e0e0",
                          background: selectedSize === s ? accentRelleno : "transparent",
                          color: selectedSize === s ? accentRellenoText : "#333",
                          fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                          opacity: outOfStock ? 0.35 : 1, textDecoration: outOfStock ? "line-through" : "none",
                        }}>{s}</button>
                      );
                    })}
                  </div>
                </div>
              )}
              {modalProduct.colors.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={CP_MODAL_TITULO}>Color</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {modalProduct.colors.map(c => {
                      const swatch = colorToSwatch(c);
                      // Agotado en TODOS sus talles: se atenúa y se tacha, igual que
                      // el talle sin stock. Antes el color se ofrecía como cualquier
                      // otro y el comprador se enteraba recién después de elegirlo.
                      const sinStock = outOfStockColors.has(c);
                      return (
                        <button key={c} onClick={() => elegirColor(c)} style={{
                          display: "flex", alignItems: "center", gap: 7,
                          padding: "8px 14px", border: selectedColor === c ? `2px solid ${accentRelleno}` : "2px solid #e0e0e0",
                          background: selectedColor === c ? accentRelleno : "transparent",
                          color: selectedColor === c ? accentRellenoText : "#333",
                          fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                          opacity: sinStock ? 0.35 : 1, textDecoration: sinStock ? "line-through" : "none",
                        }}>
                          {/* El anillo usa el color del TEXTO del chip, que por
                              construcción contrasta con su fondo. Con un anillo
                              fijo oscuro, el color "Negro" elegido quedaba como un
                              puntito negro sobre un chip negro — invisible. */}
                          {swatch && <span style={{ width: 14, height: 14, borderRadius: "50%", background: swatch, border: `1px solid ${selectedColor === c ? accentRellenoText : "rgba(0,0,0,0.25)"}`, flexShrink: 0 }} />}
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <p style={CP_MODAL_TITULO}>Cantidad</p>
                <div style={{ display: "flex", alignItems: "center", border: "2px solid #e0e0e0", width: "fit-content" }}>
                  <button onClick={() => setQty(q => Math.max(isWholesale && modalProduct.cantMinMayorista ? modalProduct.cantMinMayorista : 1, q - 1))} style={{ width: 36, height: 36, background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#333" }}>−</button>
                  <span style={{ width: 36, textAlign: "center", fontSize: 14, fontWeight: 700 }}>{qty}</span>
                  <button onClick={() => setQty(q => selectedVariantStock !== null ? Math.min(selectedVariantStock, q + 1) : q + 1)} style={{ width: 36, height: 36, background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#333" }}>+</button>
                </div>
              </div>
              {/* 3×2 en vivo: progreso del beneficio N×M según la cantidad. */}
              {modalPromo?.nxm && nxmPaid != null && (() => {
                const { n, m } = modalPromo.nxm;
                const free = qty - nxmPaid;
                const toNext = (n - (qty % n)) % n;
                return (
                  <div style={{ fontSize: 12.5, fontWeight: 700, padding: "9px 12px", borderRadius: 6, marginBottom: 16, background: free > 0 ? "rgba(22,163,74,0.10)" : "#fff7ed", border: `1px solid ${free > 0 ? "rgba(22,163,74,0.28)" : "#fed7aa"}`, color: free > 0 ? "#16a34a" : "#c2410c" }}>
                    {free > 0
                      ? `🎉 Llevás ${qty}, pagás ${nxmPaid} · ${free} gratis${toNext > 0 ? ` — sumá ${toNext} y llevás otra gratis` : ""}`
                      : `Promo ${n}×${m} · sumá ${toNext} más y una te sale gratis`}
                  </div>
                );
              })()}
              {/* Stock por variante */}
              {selectedVariantStock !== null && selectedVariantStock === 0 && (
                <p style={{ fontSize:12, color:"#888", fontWeight:600, margin:"0 0 12px" }}>Sin stock en esta combinación</p>
              )}
              {selectedVariantStock !== null && selectedVariantStock > 0 && selectedVariantStock <= 5 && (
                <p style={{ fontSize:12, color:"#ef4444", fontWeight:700, margin:"0 0 12px" }}>¡Últimas {selectedVariantStock} unidades!</p>
              )}
              {/* El botón ya NO lleva línea propia arriba: está adentro del bloque
                  de compra, y una línea acá lo separaba justo de los controles a
                  los que pertenece. */}
              {!isMobile && (
                isInquiryMode ? (
                  <button onClick={() => openInquiry(modalProduct)} style={{ background: ACC, color: accentText, border: "none", padding: "15px", fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer", width: "100%" }}>
                    Consultar disponibilidad
                  </button>
                ) : (
                  <button onClick={addToCart} disabled={selectedVariantStock === 0}
                    style={{ background: selectedVariantStock === 0 ? "#ccc" : ACC, color: accentText, border: "none", padding: "15px", fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: selectedVariantStock === 0 ? "not-allowed" : "pointer", width: "100%" }}>
                    {/* El total va en el botón como en los otros tres templates de
                        moda: sin él, con un 3×2 o cantidad > 1 el comprador tenía
                        que sacar la cuenta de cabeza. */}
                    {selectedVariantStock === 0 ? "Sin stock" : `Agregar al carrito · ${totalAPagar}`}
                  </button>
                )
              )}
              </CpBloque>

              {modalProduct.description && (
                <CpBloque titulo="Descripción">
                  {/* Sin recortar: el panel tiene alto fijo y scrollea, así que un
                      texto largo ya no deforma nada — se lee bajando acá adentro. */}
                  <div className="product-rte" dangerouslySetInnerHTML={{ __html: modalProduct.description }} style={{ fontSize: 14, color: "#555", lineHeight: 1.7 }} />
                </CpBloque>
              )}

              {/* El cuadro de datos técnicos no tenía ningún título: aparecía una
                  tabla suelta después de la descripción y no se entendía qué era. */}
              {(() => {
                const attrs = modalProduct.attributes ?? [];
                const condicionAttr = attrs.find(a => a.key === "Condición");
                const serviciosAttr = attrs.find(a => a.key === "Servicios");
                const otherAttrs = attrs.filter(a => a.key !== "Condición" && a.key !== "Servicios");
                let servicios: string[] = [];
                if (serviciosAttr) { try { servicios = Object.entries(JSON.parse(serviciosAttr.value)).filter(([, v]) => v).map(([k]) => k); } catch {} }
                if (!condicionAttr && otherAttrs.length === 0 && servicios.length === 0) return null;
                return (
                  <CpBloque titulo="Características">
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {condicionAttr && (
                        <span style={{ alignSelf: "flex-start", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", fontWeight: 800, color: accentRellenoText, background: accentRelleno, padding: "4px 10px", borderRadius: 4 }}>{condicionAttr.value}</span>
                      )}
                      {otherAttrs.length > 0 && (
                        <div style={{ borderRadius: 4, overflow: "hidden", border: "1px solid #f0f0f0" }}>
                          {otherAttrs.map((a, i) => (
                            <div key={a.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "7px 12px", background: i%2===0 ? "#fafafa" : "#fff", borderBottom: i < otherAttrs.length-1 ? "1px solid #f0f0f0" : "none" }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 0.5 }}>{a.key}</span>
                              <span style={{ fontSize: 12, color: "#111", fontWeight: 500, textAlign: "right" }}>{a.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {servicios.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {servicios.map(k => (
                            <span key={k} style={{ fontSize: 10, letterSpacing: 1, padding: "4px 10px", border: "1px solid #e5e7eb", color: "#555", borderRadius: 4 }}>✓ {k}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </CpBloque>
                );
              })()}

              {/* Compartir — al final. Es lo que se hace DESPUÉS de decidir, no
                  antes de saber el precio, que es donde estaba. */}
              <CpBloque>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => shareProduct(modalProduct)}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "1px solid #e5e7eb", color: "#9ca3af", padding: "5px 12px", fontSize: 10, letterSpacing: 1, cursor: "pointer", transition: "color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#374151")} onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    Copiar link
                  </button>
                  {hasWA && (
                  <button onClick={() => whatsappShare(modalProduct)}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "1px solid #bbf7d0", color: "#16a34a", padding: "5px 12px", fontSize: 10, letterSpacing: 1, cursor: "pointer", transition: "color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#15803d")} onMouseLeave={e => (e.currentTarget.style.color = "#16a34a")}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M11.897 0C5.395 0 .13 5.266.13 11.767c0 2.078.545 4.03 1.495 5.727L.057 24l6.7-1.757A11.71 11.71 0 0 0 11.897 23.534c6.503 0 11.768-5.265 11.768-11.767C23.67 5.266 18.4 0 11.897 0zm0 21.536h-.004a9.726 9.726 0 0 1-4.96-1.358l-.356-.211-3.678.965.982-3.581-.232-.368A9.73 9.73 0 0 1 2.158 11.767C2.158 6.355 6.551 2 11.897 2c2.581 0 5.007 1.007 6.831 2.831a9.604 9.604 0 0 1 2.828 6.83c0 5.347-4.393 9.875-9.659 9.875z"/></svg>
                    WhatsApp
                  </button>
                  )}
                </div>
              </CpBloque>

            </div>
            </div>
            </div>
            {/* ── Reseñas (D-04) — a lo ANCHO, abajo de las dos columnas ───────
                Estaban adentro de la columna derecha, que es la mitad del modal, y
                son lo más largo de la ficha. Eso causaba las dos cosas de una:
                  · la columna de la foto quedaba con un hueco blanco enorme abajo
                    (ahora que la foto tiene proporción propia ya no se estira para
                    acompañar a las reseñas, y se veía el vacío);
                  · y las reseñas se leían espichadas en ~440px cuando acá tienen
                    ~940, que es donde un texto de 6 líneas se lee cómodo.
                Van antes de "Productos similares", que ya vivía a lo ancho. */}
            <div style={{ borderTop: "1px solid #f0f0f0", padding: isMobile ? "20px 20px" : "24px 32px" }}>
                <p style={{ ...CP_MODAL_TITULO, marginBottom: 20 }}>
                  Reseñas{resenasVisibles.length > 0 && ` (${resenasVisibles.length})`}
                </p>
                {/* Solo en el editor: aclara que lo de abajo es de mentira. Sin
                    esto el dueño cree que ya tiene reseñas — o peor, las busca en
                    el panel para contestarlas. */}
                {resenasDeEjemplo && (
                  <div style={{ display:"flex", gap:9, margin:"0 0 16px", padding:"10px 13px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8 }}>
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
                {!isOwner && !reviewDone && (
                  <button type="button" onClick={() => { setReviewError(null); setResenaProdOpen(true); }}
                    style={{ marginBottom: 18, background:"none", border:`1px solid ${accentLegible}`, color:accentLegible, padding:"10px 22px", fontSize:10, fontWeight:800, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", transition:"opacity 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                    Escribí tu reseña
                  </button>
                )}
                {reviewsLoading ? (
                  <p style={{ fontSize: 12, color: "#bbb" }}>Cargando...</p>
                ) : resenasVisibles.length > 0 ? (
                  <div style={{ marginBottom: 24 }}>
                    {(() => {
                      const avg = resenasVisibles.reduce((s, r) => s + r.rating, 0) / resenasVisibles.length;
                      const dist = [5,4,3,2,1].map(s => ({ stars:s, count: resenasVisibles.filter(r => r.rating === s).length }));
                      // `maxWidth` acotado: a lo ancho del modal las barritas del
                      // gráfico quedaban de medio metro y el promedio perdido allá
                      // a la izquierda. Es un resumen, no una tabla.
                      return (
                        <div style={{ display:"flex", gap:20, alignItems:"center", marginBottom:20, padding:"14px 16px", background:"#fafafa", border:"1px solid #f0f0f0", borderRadius:4, maxWidth: 440 }}>
                          <div style={{ textAlign:"center", minWidth:56 }}>
                            <p style={{ fontSize:34, fontWeight:800, color:"#111", margin:0, lineHeight:1 }}>{avg.toFixed(1)}</p>
                            <div style={{ display:"flex", gap:2, justifyContent:"center", margin:"6px 0 4px" }}>
                              {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize:11, color: s <= Math.round(avg) ? STAR_ON : "#e5e7eb" }}>★</span>)}
                            </div>
                            <p style={{ fontSize:9, color:"#bbb", margin:0, fontWeight:600, letterSpacing:0.5 }}>{resenasVisibles.length} reseña{resenasVisibles.length !== 1 ? "s" : ""}</p>
                          </div>
                          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}>
                            {dist.map(d => (
                              <div key={d.stars} style={{ display:"flex", alignItems:"center", gap:8 }}>
                                <span style={{ fontSize:9, color:STAR_ON, minWidth:14, textAlign:"right", fontWeight:700 }}>{d.stars}★</span>
                                <div style={{ flex:1, height:4, background:"#f0f0f0", borderRadius:2, overflow:"hidden" }}>
                                  <div style={{ height:"100%", width:`${resenasVisibles.length ? (d.count / resenasVisibles.length) * 100 : 0}%`, background:accentRelleno, borderRadius:2 }} />
                                </div>
                                <span style={{ fontSize:9, color:"#bbb", minWidth:12, textAlign:"right" }}>{d.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    {/* De a dos por fila en escritorio. A lo ancho del modal, una
                        sola columna daba renglones de ~140 caracteres — casi el
                        doble de lo que el ojo sigue sin perderse (60-80). En dos
                        columnas cada renglón queda en ~64, que es el ideal, y de
                        paso no sobra espacio a la derecha. En celular va una
                        sola, obviamente. */}
                    <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", columnGap: 32, alignItems: "start" }}>
                      {resenasVisibles.slice(0, reviewsShown).map(r => (
                        <div key={r.id} style={{ display:"flex", gap:12, padding:"16px 0", borderBottom: "1px solid #f5f5f5" }}>
                          <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0, background:`${ACC}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:accentLegible }}>
                            {r.reviewer.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                                <span style={{ fontSize:13, fontWeight:700, color:"#111" }}>{r.reviewer}</span>
                                {r.verified && (
                                  <span style={{ fontSize:10, fontWeight:700, color:"#16a34a", background:"#f0fdf4", border:"1px solid #bbf7d0", padding:"1px 6px", borderRadius:20 }}>✓ Verificada</span>
                                )}
                              </div>
                              <span style={{ fontSize:10, color:"#bbb" }}>{new Date(r.createdAt).toLocaleDateString("es-AR", { day:"numeric", month:"short", year:"numeric" })}</span>
                            </div>
                            <div style={{ display:"flex", gap:1, marginBottom: r.comment ? 8 : 0 }}>
                              {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize:12, color: s <= r.rating ? STAR_ON : "#e5e7eb" }}>★</span>)}
                            </div>
                            {/* Recortado a 6 líneas con "Leer todo", el mismo
                                componente que usa el bloque de la portada. El tope
                                es de 500 caracteres: sin recorte, una sola reseña
                                larga son 9 líneas y empuja a las otras cuatro
                                fuera de la pantalla. */}
                            {r.comment && (
                              <ResenaComentario texto={r.comment} acento={accentLegible} comillas={false}
                                estiloTexto={{ fontFamily: "inherit", fontStyle: "normal", fontSize: 13, color: "#666", lineHeight: 1.65 }} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {resenasVisibles.length > reviewsShown && (
                      <button onClick={() => setReviewsShown(n => n + PASO_RESENAS)} style={{ marginTop:14, background:"none", border:"1px solid #e5e7eb", color:accentLegible, fontSize:10, fontWeight:700, letterSpacing:1.5, cursor:"pointer", padding:"8px 20px", textTransform:"uppercase", display:"block" }}>
                        Ver más ({resenasVisibles.length - reviewsShown})
                      </button>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: "#bbb", marginBottom: 16 }}>Sé el primero en dejar una reseña.</p>
                )}
                {/* El formulario se fue al modal que abre el botón de arriba. Acá
                    quedan los dos casos en los que no hay nada que escribir. */}
                {isOwner && (
                  <p style={{ fontSize: 11, color: "#bbb", fontStyle: "italic", marginTop: 4 }}>El dueño no puede dejar reseñas en su propia tienda.</p>
                )}
                {reviewDone && (
                  <p style={{ fontSize: 12, color: accentLegible, fontWeight: 700, marginTop: 4 }}>¡Gracias por tu reseña!</p>
                )}
              </div>
            {similarProducts.length > 0 && (
              <div style={{ borderTop: "1px solid #f0f0f0", padding: isMobile ? "20px 20px" : "24px 32px" }}>
                <p style={CP_MODAL_TITULO}>Productos similares</p>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12 }}>
                  {similarProducts.map(p => (
                    <div key={p.id} onClick={() => openModal(p)} className="cp-zoom" style={{ cursor: "pointer" }}>
                      <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", borderRadius: 4, overflow: "hidden", background: "#f5f5f5" }}>
                        {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes="(max-width: 768px) 50vw, 200px" className="cp-zoom-img" style={{ objectFit: "cover" }} />}
                        {avisoPromo(p)}
                      </div>
                      <p style={{ margin: "8px 0 2px", fontSize: 12, color: "#111", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" as const }}>{p.name}</p>
                      <PromoPrice product={p} promotions={promotions} fmt={fmt} accent={accentLegible} sobre="#111"
                        priceSize={13} compareSize={11} weight={700} ocultarPrecios={ocultarPrecios} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
            {/* Barra fija de comprar en celular. El precio va DENTRO del botón,
                como en la página de productos y como en el botón de arriba. Antes
                tenía una fila aparte con el precio grande y el botón mudo debajo:
                en un modal que ya muestra el precio en el encabezado, el mismo
                número aparecía tres veces y la barra ocupaba el doble de alto,
                caro en una pantalla de 360. La barra se queda porque es el único
                botón de comprar siempre visible mientras se scrollea. */}
            {isMobile && (
              <div style={{ borderTop: "1px solid #f0f0f0", padding: "12px 16px 16px", background: "#fff", flexShrink: 0 }}>
                {isInquiryMode ? (
                  <button onClick={() => openInquiry(modalProduct)}
                    style={{ width: "100%", background: ACC, color: accentText, border: "none", padding: "15px", fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer" }}>
                    Consultar disponibilidad
                  </button>
                ) : (
                  <button onClick={addToCart} disabled={selectedVariantStock === 0}
                    style={{ width: "100%", background: selectedVariantStock === 0 ? "#ccc" : ACC, color: accentText, border: "none", padding: "15px", fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", cursor: selectedVariantStock === 0 ? "not-allowed" : "pointer" }}>
                    {selectedVariantStock === 0 ? "Sin stock" : `Agregar al carrito · ${totalAPagar}`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: reseña de la tienda ────────────────────────────────────
          Se abre desde el botón "Dejá tu opinión" del bloque de prueba social.
          Misma estética que el modal de producto (overlay oscuro + tarjeta
          blanca centrada), y cierra tocando afuera, el ✕, o Escape no —queda
          el tocar-afuera, que es el gesto natural en celular. */}
      {tiendaModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: isPreview ? 20000 : 9000, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 20, backdropFilter: "blur(4px)" }}
          onClick={cerrarTiendaModal}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", borderRadius: isMobile ? "12px 12px 0 0" : 4, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", position: "relative" }}
            onClick={e => e.stopPropagation()}>
            <button onClick={cerrarTiendaModal} aria-label="Cerrar"
              style={{ position: "absolute", top: 10, right: 10, zIndex: 2, background: "none", border: "none", color: "#999", width: 32, height: 32, cursor: "pointer", fontSize: 22, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            <div style={{ padding: isMobile ? "28px 22px 26px" : "32px 30px 28px" }}>
              {tiendaListo ? (
                // Nace pendiente: si dijera "¡Publicada!" y no apareciera, la
                // persona pensaría que se perdió y la escribiría de nuevo.
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <div style={{ fontSize: 34, marginBottom: 10 }}>✓</div>
                  <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#111" }}>¡Gracias por tu opinión!</p>
                  <p style={{ margin: "0 0 20px", fontSize: 12.5, color: "#666", lineHeight: 1.6 }}>
                    La tienda la revisa antes de publicarla, así que todavía no la vas a ver acá.
                  </p>
                  <button type="button" onClick={cerrarTiendaModal}
                    style={{ background: ACC, color: accentText, border: "none", padding: "11px 32px", fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer" }}>
                    Cerrar
                  </button>
                </div>
              ) : (
                <form onSubmit={submitResenaTienda} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, color: "#111" }}>
                      Contanos cómo te fue
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "#888", lineHeight: 1.5 }}>
                      Tu opinión sobre la atención, el envío y la experiencia de comprar acá.
                    </p>
                  </div>
                  {tiendaError && (
                    <p style={{ margin: 0, fontSize: 11.5, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", padding: "8px 11px", lineHeight: 1.5 }}>
                      ⚠ {tiendaError}
                    </p>
                  )}

                  {/* Trampa para bots: invisible para una persona, irresistible
                      para un robot que completa todo lo que encuentra. */}
                  <input value={tiendaHoneypot} onChange={e => setTiendaHoneypot(e.target.value)}
                    tabIndex={-1} autoComplete="off" aria-hidden="true"
                    style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />

                  <div style={{ display: "flex", gap: 4 }}>
                    {[1,2,3,4,5].map(s => (
                      <button key={s} type="button" onClick={() => setTiendaForm(p => ({ ...p, rating: s }))}
                        aria-label={`${s} de 5 estrellas`}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 24, lineHeight: 1, color: s <= tiendaForm.rating ? STAR_ON : "#ddd" }}>★</button>
                    ))}
                  </div>

                  <input value={tiendaForm.reviewer} maxLength={RESENADOR_MAX} required
                    onChange={e => setTiendaForm(p => ({ ...p, reviewer: e.target.value }))}
                    placeholder="Tu nombre"
                    style={{ border: "1px solid #e5e7eb", padding: "10px 12px", fontSize: 13, outline: "none" }} />

                  <input value={tiendaForm.email} type="email" maxLength={120}
                    onChange={e => setTiendaForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="Tu email (opcional)"
                    style={{ border: "1px solid #e5e7eb", padding: "10px 12px", fontSize: 13, outline: "none" }} />
                  <p style={{ margin: "-6px 0 0", fontSize: 10.5, color: "#777", lineHeight: 1.5 }}>
                    Si compraste acá, tu reseña sale con el sello “✓ Compra verificada”. El email no se publica.
                  </p>

                  <textarea value={tiendaForm.comment} rows={3} maxLength={COMENTARIO_MAX}
                    onChange={e => setTiendaForm(p => ({ ...p, comment: e.target.value }))}
                    placeholder="La atención, el envío, la experiencia..."
                    style={{ border: "1px solid #e5e7eb", padding: "10px 12px", fontSize: 13, resize: "none", outline: "none" }} />
                  {tiendaForm.comment.length > COMENTARIO_MAX - 80 && (
                    <p style={{ margin: "-6px 0 0", fontSize: 10, color: tiendaForm.comment.length >= COMENTARIO_MAX ? "#dc2626" : "#777", textAlign: "right" }}>
                      {tiendaForm.comment.length} / {COMENTARIO_MAX}
                    </p>
                  )}

                  {!isPreview && tiendaCaptcha.widget}

                  {/* Confirmación en dos pasos. Una reseña es pública y con el
                      nombre de quien la escribe: conviene un segundo para releerla.
                      Se evita `confirm()` del navegador, que en celular tapa el
                      texto que se está por confirmar. */}
                  {tiendaConfirmando ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <p style={{ margin: 0, fontSize: 11.5, color: "#111", lineHeight: 1.6 }}>
                        Se publica con tu nombre, <strong>{tiendaForm.reviewer.trim()}</strong>, y {tiendaForm.rating} de 5 estrellas. ¿La mandamos?
                      </p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="submit" disabled={tiendaEnviando || !tiendaCaptcha.ready}
                          style={{ flex: 1, background: ACC, color: accentText, border: "none", padding: "12px", fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", cursor: tiendaEnviando ? "default" : "pointer", opacity: tiendaEnviando ? 0.6 : 1 }}>
                          {tiendaEnviando ? "Enviando..." : "Sí, enviar"}
                        </button>
                        <button type="button" onClick={() => setTiendaConfirmando(false)} disabled={tiendaEnviando}
                          style={{ background: "none", border: "1px solid #ddd", color: "#666", padding: "12px 18px", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}>
                          Volver
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" disabled={isPreview || !tiendaValida}
                      onClick={() => setTiendaConfirmando(true)}
                      title={tiendaValida ? undefined : "Escribí tu nombre y elegí cuántas estrellas"}
                      style={{ background: !isPreview && tiendaValida ? ACC : "#f3f4f6", color: !isPreview && tiendaValida ? accentText : "#9ca3af", border: "none", padding: "13px", fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: !isPreview && tiendaValida ? "pointer" : "default" }}>
                      Dejar mi reseña
                    </button>
                  )}

                  {isPreview && (
                    <p style={{ margin: 0, fontSize: 10, color: "#999", fontStyle: "italic", textAlign: "center" }}>
                      Vista previa — el formulario funciona en tu tienda publicada.
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: reseña del PRODUCTO ─────────────────────────────────────
          Lo abre "Escribí tu reseña", que está arriba de la lista. Antes el
          formulario era lo último del panel: con 50 reseñas cargadas había que
          bajarlas todas para llegar a escribir la propia, y encima empujaba a
          "Productos similares" fuera de la vista.
          Va DESPUÉS del modal de producto en el DOM y con z-index mayor, porque
          se abre estando ese abierto y tiene que quedar por encima. */}
      {modalProduct && resenaProdOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: isPreview ? 20002 : 9600, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 20, backdropFilter: "blur(4px)" }}
          onClick={() => setResenaProdOpen(false)}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 460, maxHeight: "92vh", overflowY: "auto", borderRadius: isMobile ? "12px 12px 0 0" : 4, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", position: "relative" }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setResenaProdOpen(false)} aria-label="Cerrar"
              style={{ position: "absolute", top: 10, right: 10, zIndex: 2, background: "none", border: "none", color: "#999", width: 32, height: 32, cursor: "pointer", fontSize: 22, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            <div style={{ padding: isMobile ? "28px 22px 26px" : "30px 28px 26px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, color: "#111" }}>Tu reseña</p>
              {/* Que se vea DE QUÉ producto es: el modal tapa la ficha, y con
                  cuatro pestañas abiertas no siempre se acuerda uno. */}
              <p style={{ margin: "0 0 16px", fontSize: 12, color: "#888", lineHeight: 1.5 }}>
                Sobre <strong style={{ color: "#111" }}>{modalProduct.name}</strong>.
              </p>
              {/* CP-12: el motivo del rechazo, arriba del formulario y con
                  el texto que manda el servidor. Antes no se decía nada. */}
              {reviewError && (
                <p style={{ margin: "0 0 10px", fontSize: 11.5, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", padding: "8px 11px", lineHeight: 1.5 }}>
                  ⚠ {reviewError}
                </p>
              )}
              <form onSubmit={isPreview ? e => e.preventDefault() : submitReview} style={{ display: "flex", flexDirection: "column", gap: 10, opacity: isPreview ? 0.55 : 1 }}>
                <input value={reviewHoneypot} onChange={e => setReviewHoneypot(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ opacity:0, height:0, position:"absolute", pointerEvents:"none" }} />
                <input value={reviewForm.reviewer} onChange={e => !isPreview && setReviewForm(p => ({ ...p, reviewer: e.target.value }))}
                  placeholder="Tu nombre" readOnly={isPreview}
                  style={{ border: "1px solid #e5e7eb", padding: "10px 12px", fontSize: 13, outline: "none" }} />
                <div>
                  <input value={reviewForm.email} onChange={e => !isPreview && setReviewForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="Tu email (opcional — verifica tu compra)" type="email" readOnly={isPreview} autoComplete="email"
                    style={{ width: "100%", boxSizing: "border-box", border: "1px solid #e5e7eb", padding: "10px 12px", fontSize: 13, outline: "none" }} />
                  <p style={{ fontSize: 10.5, color: "#777", margin: "4px 0 0", lineHeight: 1.4 }}>
                    Si compraste acá, tu reseña mostrará &ldquo;✓ Compra verificada&rdquo;. El email no se publica.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[1,2,3,4,5].map(s => (
                    <button key={s} type="button" onClick={() => !isPreview && setReviewForm(p => ({ ...p, rating: s }))}
                      aria-label={`${s} de 5 estrellas`}
                      style={{ background: "none", border: "none", fontSize: 24, lineHeight: 1, cursor: isPreview ? "default" : "pointer", color: s <= reviewForm.rating ? STAR_ON : "#e5e7eb", padding: "2px" }}>★</button>
                  ))}
                </div>
                {/* El tope viene del servidor (COMENTARIO_MAX) para que sean
                    el mismo número. Sin esto se podía escribir sin límite y
                    el recorte aparecía recién después de publicar, cortando
                    la reseña a la mitad sin haber avisado nunca. */}
                <textarea value={reviewForm.comment} onChange={e => !isPreview && setReviewForm(p => ({ ...p, comment: e.target.value }))}
                  placeholder="Comentario (opcional)" rows={3} readOnly={isPreview} maxLength={COMENTARIO_MAX}
                  style={{ border: "1px solid #e5e7eb", padding: "10px 12px", fontSize: 13, resize: "none", outline: "none" }} />
                {reviewForm.comment.length > COMENTARIO_MAX - 80 && (
                  <p style={{ margin: "-4px 0 0", fontSize: 10, color: reviewForm.comment.length >= COMENTARIO_MAX ? "#dc2626" : "#6e6e6e", textAlign: "right" }}>
                    {reviewForm.comment.length} / {COMENTARIO_MAX}
                  </p>
                )}
                {!isPreview && reviewCaptcha.widget}
                <button type="submit" disabled={isPreview || reviewSubmitting || !reviewForm.reviewer.trim() || !reviewCaptcha.ready}
                  style={{ background: isPreview || reviewSubmitting || !reviewForm.reviewer.trim() ? "#f3f4f6" : ACC, color: isPreview || reviewSubmitting || !reviewForm.reviewer.trim() ? "#9ca3af" : accentText, border: "none", padding: "13px", fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: isPreview ? "default" : "pointer" }}>
                  {reviewSubmitting ? "Publicando..." : "Publicar reseña"}
                </button>
              </form>
              {isPreview && (
                <p style={{ margin: "10px 0 0", fontSize: 10, color: "#999", fontStyle: "italic", textAlign: "center" }}>
                  Vista previa — el formulario funciona en tu tienda publicada.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* zIndex propio: este template tiene el navbar en 1000 y la barra de anuncios
          en 1001, mucho más alto que los otros. Con los 150/300 por defecto el
          carrito y la caja quedaban por DEBAJO y se les comía el encabezado. */}
      <CheckoutModal cart={cart} theme={cartTheme} isPreview={isPreview} storeSlug={storeConfig?.slug ?? ""} zIndex={9800} />
      <CartDrawer cart={cart} theme={cartTheme} isOwner={isOwner} isPreview={isPreview} whatsapp={storeConfig?.whatsapp} zIndex={9700} />

      {/* ── FAVORITES ── */}
      {favoritesOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: isPreview ? 20000 : 9500, display: "flex" }} onClick={() => setFavoritesOpen(false)}>
          <div style={{ flex: 1 }} />
          <div style={{ width: 380, background: "#fff", height: "100%", display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>Favoritos ({favoriteProducts.length})</h3>
              <button onClick={() => setFavoritesOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#999" }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              {favoriteProducts.length === 0 ? (
                <p style={{ color: "#bbb", fontSize: 14, textAlign: "center", marginTop: 40 }}>No tenés favoritos aún</p>
              ) : favoriteProducts.map(product => (
                <div key={product.id} style={{ display: "flex", gap: 14, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #f5f5f5" }}>
                  <FadeImage src={product.images[0] ?? "/placeholder.jpg"} alt={product.name} width={64} height={80} style={{ objectFit: "cover" }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600 }}>{product.name}</p>
                    <PromoPrice product={product} promotions={promotions} fmt={fmt} accent={accentLegible} sobre="#111"
                      priceSize={13} compareSize={11} weight={700} ocultarPrecios={ocultarPrecios}
                      gap={8} style={{ marginBottom: 4 }} />
                    <div style={{ marginBottom: 8 }}>{avisoPromo(product, "chip")}</div>
                    <button onClick={() => { setFavoritesOpen(false); openModal(product); }}
                      style={{ background: ACC, color: accentText, border: "none", padding: "6px 16px", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}>
                      Ver
                    </button>
                  </div>
                  <button onClick={() => toggleFavorite(product.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb", fontSize: 18, alignSelf: "flex-start" }}>×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX ───────────────────────────────────────── */}
      {lightboxSrc && (
        <div style={{ position:"fixed", inset:0, zIndex: isPreview ? 20001 : 9500, background:"rgba(0,0,0,0.97)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setLightboxSrc(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- el lightbox es la foto a pantalla completa con zoom de dos dedos: necesita el <img> nativo. next/image pide medidas fijas o un padre posicionado, y ninguna de las dos cosas conviven con maxWidth/maxHeight en viewport + touchAction pinch-zoom. */}
          <img src={lightboxSrc} alt="" style={{ maxWidth:"100vw", maxHeight:"100vh", objectFit:"contain", touchAction:"pinch-zoom" }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxSrc(null)} aria-label="Cerrar" style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", width:44, height:44, borderRadius:"50%", fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
      )}

      {/* ── FLOATING CART BUTTON ────────────────────────────── */}
      {!cart.cartOpen && !cart.checkoutOpen && (() => {
        const cartIconIdx = (Math.abs(parseInt(textOverrides["cartIcon"]?.text ?? "0") || 0)) % CART_ICON_OPTIONS.length;
        const nextCartIconIdx = (cartIconIdx + 1) % CART_ICON_OPTIONS.length;
        return (
          <div onClick={() => { if (!editMode) { setCartOpen(true); setFavoritesOpen(false); } }}
            role="button" tabIndex={0} aria-label="Carrito"
            onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && !editMode) { e.preventDefault(); setCartOpen(true); setFavoritesOpen(false); } }}
            style={{ position:"fixed", bottom:24, ...(hasWA ? {left:24} : {right:24}), zIndex:500, width:52, height:52, borderRadius:"50%", background:ACC, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 6px 18px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)", transition:"transform 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.transform="scale(1.1)")}
            onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}>
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={accentText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{CART_ICON_OPTIONS[cartIconIdx]}</svg>
            {cartCount > 0 && !editMode && <span style={{ position:"absolute", top:-4, right:-4, background:"#e53e3e", color:"#fff", borderRadius:"50%", width:20, height:20, fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{cartCount}</span>}
            {editMode && (
              <button onClick={e => { e.stopPropagation(); setOverride("cartIcon", { text: String(nextCartIconIdx) }); }} title="Cambiar ícono del carrito"
                style={{ position:"absolute", inset:0, background:"rgba(99,102,241,0.9)", border:"none", borderRadius:"50%", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:18, opacity:0, transition:"opacity 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity="1")} onMouseLeave={e => (e.currentTarget.style.opacity="0")}>↻</button>
            )}
          </div>
        );
      })()}

      {/* ── WHATSAPP BUTTON ────────────────────────────────── */}
      {!cart.cartOpen && !cart.checkoutOpen && hasWA && (
        <button
          className="cp-wa-fab"
          onClick={() => { if (editMode) return; window.open(`https://wa.me/${(storeConfig?.whatsapp.number ?? "5491100000000").replace(/\D/g,"")}${storeConfig?.whatsapp?.message ? "?text=" + encodeURIComponent(storeConfig.whatsapp.message) : ""}`, "_blank"); }}
          style={{ position:"fixed", bottom:24, right:24, zIndex:500, width:52, height:52, borderRadius:"50%", border:"none", cursor: editMode ? "default" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"transform 0.2s" }}
          onMouseEnter={e => { if (!editMode) e.currentTarget.style.transform="scale(1.1)"; }}
          onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </button>
      )}

      {/* ── TOAST ── */}
      {toastMsg && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#111", color: "#fff", padding: "12px 24px", borderRadius: 4, fontSize: 13, fontWeight: 600, zIndex: 99999, animation: "cp-toast 0.3s ease", boxShadow: "0 8px 24px rgba(0,0,0,0.25)", maxWidth:"calc(100vw - 32px)", textAlign:"center" }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}
