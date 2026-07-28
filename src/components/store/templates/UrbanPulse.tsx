"use client";
import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { usePushBell } from "@/contexts/PushBellContext";
import { useAuth } from "@/components/AuthProvider";
import StoreFollowButton from "@/components/store/StoreFollowButton";
import { EditableZone, EditableImageButton, EditableSectionBg, BgDragHandle, getContrastColor, getReadableAccentText, textoSobre, useEditContext } from "@/contexts/EditContext";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useCartLogic } from "@/hooks/useCartLogic";
import { useHomeReviews, type EjemplosDeResenas } from "@/hooks/useHomeReviews";
import { useResenasProducto } from "@/hooks/useResenasProducto";
import { ResenaComentario } from "@/components/store/templates/shared/ResenaComentario";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import { masVistos, MIN_MAS_VISTOS } from "@/lib/masVistos";
import { COMENTARIO_MAX, RESENADOR_MAX } from "@/lib/reviews";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import VerifiedIconButton from "@/components/store/VerifiedIconButton";
import { CartDrawer, type CartTheme } from "@/components/store/templates/shared/CartDrawer";
import { OfferBadge } from "@/components/store/OfferBadge";
import { PromoTag, PromoBlock, PromoPrice, coloresPromo, PALETA_PROMO_NEON } from "@/components/store/PromoDisplay";
import { resolveProductPromo, describePromo } from "@/lib/promoDisplay";
import { CheckoutModal } from "@/components/store/templates/shared/CheckoutModal";
import { ContactForm } from "@/components/store/templates/shared/ContactForm";
import { FadeImage } from "@/components/store/templates/shared/FadeImage";
import StoreProductReels from "@/components/store/ProductReels";
import { SectionBlock } from "@/components/store/templates/shared/SectionBlock";
import { PromoBannerCarousel } from "@/components/store/templates/shared/PromoBannerCarousel";
import { parseVariantAttrs } from "@/lib/variantAttrs";
import { colorToSwatch } from "@/lib/colorSwatch";
import { discountPercent } from "@/lib/discount";
import { resolveVariantPrice } from "@/lib/variantPrice";
import { useTurnstile } from "@/components/Turnstile";

type Product = StorefrontProduct;

/* ── Ícono de carrito flotante — variantes para elegir en modo edición ── */
const CART_ICON_OPTIONS: React.ReactNode[] = [
  <Fragment key="bag"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></Fragment>,
  <Fragment key="cart"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></Fragment>,
  <Fragment key="basket"><path d="M5 11 2 7h20l-3 4"/><path d="M4 11h16l-1.7 8.5a2 2 0 0 1-2 1.5H7.7a2 2 0 0 1-2-1.5L4 11Z"/><path d="M9 11V8a3 3 0 0 1 6 0v3"/></Fragment>,
];

const SIZE_ATTRS =["talle","size","talla","talles","sizes","tamaño","tamano","almacenamiento","ram","versión","version","formato","variante","material","sabor","peso/tamaño","peso"];

// ── Reseñas de ejemplo, SOLO para el editor y la galería de templates ────────
// Sirven para diseñar el bloque con algo adentro. En la tienda publicada no
// aparecen nunca: ahí se muestran las reseñas de verdad, y si todavía no hay
// ninguna el bloque queda sin tarjetas, invitando a dejar la primera.
//
// Son propias de Urban Pulse a propósito. Antes eran cuatro testimonios fijos
// escritos acá, y todas las tiendas con este template mostraban a las mismas
// cuatro personas diciendo lo mismo. Chic Paris tiene las suyas, con su voz: si
// se compartieran, las previews de los templates se verían clonadas.
const EJEMPLOS_RESENAS: EjemplosDeResenas = {
  producto: [
    { id:"up-p1", rating:5, reviewer:"Valentina R.", verified:true,  verifiedBy:"auto",
      comment:"La calidad es increíble, se nota que es para alto rendimiento. Volví a comprar dos veces este mes." },
    { id:"up-p2", rating:5, reviewer:"Marcos D.",    verified:false, verifiedBy:null,
      comment:"El hoodie de training es lo mejor que compré. Cómodo, liviano y se ve súper bien en el gym." },
    { id:"up-p3", rating:5, reviewer:"Lucía P.",     verified:true,  verifiedBy:"owner",
      comment:"Los leggings seamless no se corren ni se transparentan. Perfectos para cualquier entrenamiento." },
    { id:"up-p4", rating:4, reviewer:"Ignacio M.",   verified:false, verifiedBy:null,
      comment:"Los shorts son de primera calidad. Le saco una estrella porque me quedaron un talle grande." },
  ],
  tienda: [
    { id:"up-t1", rating:5, reviewer:"Brenda S.", verified:true,  verifiedBy:"auto",
      comment:"Pedí un jueves y el sábado ya lo tenía. Me escribieron por WhatsApp para avisarme cuando salió." },
    { id:"up-t2", rating:5, reviewer:"Tomás A.",  verified:false, verifiedBy:null,
      comment:"Cambié un talle sin drama, ni me pidieron el ticket. Se nota que les importa que te quede bien." },
  ],
};

const TICKER = "NUEVA COLECCIÓN · ENVÍO GRATIS +$30.000 · 30 DÍAS DE CAMBIO · 6 CUOTAS SIN INTERÉS · ";

const GARANTIAS = [
  { title:"Envío gratis",     desc:"En compras +$30.000"  },
  { title:"30 días de cambio", desc:"Sin cargo"            },
  { title:"Pago seguro",      desc:"100% protegido"        },
  { title:"Soporte 24/7",     desc:"Siempre disponibles"   },
];

const UP_STRIP_ICONS: React.ReactNode[][] = [
  [
    <svg key="truck" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    <svg key="box"   width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    <svg key="zap"   width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    <svg key="gift"  width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
  ],
  [
    <svg key="refresh"   width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16"/><polyline points="21 3 21 8 16 8"/><polyline points="3 21 3 16 8 16"/></svg>,
    <svg key="undo"      width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>,
    <svg key="check-c"   width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    <svg key="arrows-lr" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  ],
  [
    <svg key="shield" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
    <svg key="lock"   width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    <svg key="card"   width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    <svg key="award"  width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  ],
  [
    <svg key="chat"    width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    <svg key="phone"   width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    <svg key="headset" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>,
    <svg key="mail"    width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  ],
];

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior:"smooth" });

const UP_SECTION_IDS = ["up-garantias", "up-banner", "up-categorias", "up-mayorista", "up-featured", "up-productos", "up-testimonios", "up-ofertas", "up-masvisto", "up-nosotros", "up-contacto"];

export default function UrbanPulse() {
  const [scrolled,         setScrolled]         = useState(false);
  const [activeCategory,   setActiveCategory]   = useState("Todos");
  const [activeGender,     setActiveGender]     = useState<string | null>(null);
  const [hoveredNavCat,    setHoveredNavCat]    = useState<string | null>(null);
  const [visibleCount,     setVisibleCount]     = useState(8);
  const [isMobile,         setIsMobile]         = useState(false);
  const [mobileMenuOpen,   setMobileMenuOpen]   = useState(false);
  const [mobileCatsOpen,   setMobileCatsOpen]   = useState(false);
  const [mobileOpenCat,    setMobileOpenCat]    = useState<string | null>(null);
  const [reviewForm,     setReviewForm]     = useState({ reviewer: "", rating: 5, comment: "", email: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  // Trampa para bots: invisible para una persona, irresistible para un robot que
  // completa todo lo que encuentra. El captcha ya cubre esto, pero es la segunda
  // llave y no cuesta nada — el formulario de la tienda y Chic Paris ya la tenían.
  const [reviewHoneypot, setReviewHoneypot] = useState("");
  const reviewCaptcha = useTurnstile("review");
  const [reviewDone,     setReviewDone]     = useState(false);
  // La columna larga del modal arranca plegada en sus dos partes más pesadas. Sin
  // esto, un producto con una descripción de catálogo y 40 reseñas nace con varios
  // miles de píxeles de alto y el comprador tiene que scrollear a ciegas para
  // llegar a los similares. El formulario solo, son ~110px de campos que casi
  // nadie va a usar en esa visita.
  const [descAbierta,       setDescAbierta]       = useState(false);
  const [formResenaAbierto, setFormResenaAbierto] = useState(false);
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
  const hasWA       = !storeConfig || storeConfig.whatsapp.enabled;
  const storefront  = useStorefront();
  const { products, promotions, checkoutMode, isWholesale, ocultarPrecios, defaultCategories, featuredCategories } = storefront;
  const { editMode, overrides: textOverrides, setOverride } = useEditContext();
  const isInquiryMode = checkoutMode === "inquiry" || ocultarPrecios;

  // Las reseñas de la portada. La lógica —qué sube, las dos pestañas, el promedio,
  // borrar y publicar— es compartida; el diseño está más abajo y es de este
  // template. Ver `useHomeReviews`.
  const resenas = useHomeReviews({
    slug: storeConfig?.slug,
    isPreview, isOwner,
    productos: products,
    ejemplos: EJEMPLOS_RESENAS,
  });

  const categoryList = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(c => c && c !== "general"))];
    const base = cats.length > 0 ? cats : defaultCategories.slice(0, 6);
    return featuredCategories.length > 0 ? base.filter(c => featuredCategories.includes(c)) : base;
  }, [products, defaultCategories, featuredCategories]);

  const DARK  = "#0f0f0f";
  const ACC   = storeConfig?.colors.accent ?? "#d4ff00";
  const BG    = "#f5f5f5";
  const WHITE = "#ffffff";
  const MID   = "#777777";
  const RED   = "#e63329";

  const scu = storeConfig?.sectionColors ?? {};
  const garantiasUpBg   = scu["bgGarantias"]  ?? WHITE;
  const garantiasUpText = getContrastColor(garantiasUpBg) === "light" ? WHITE : DARK;
  const featuredBg      = scu["bgFeatured"]   ?? DARK;
  const featuredText    = getContrastColor(featuredBg) === "light" ? WHITE : DARK;
  const heroLeftUpBg    = scu["bgHeroLeft"]   ?? DARK;
  const heroLeftUpText  = getContrastColor(heroLeftUpBg) === "light" ? WHITE : DARK;
  const heroLeftUpMid   = getContrastColor(heroLeftUpBg) === "light" ? "rgba(255,255,255,0.5)" : MID;
  const categoriesBgUp  = scu["bgCategorias"] ?? BG;
  const categoriasText  = getContrastColor(categoriesBgUp) === "light" ? WHITE : DARK;
  const testimonialsBgUp     = scu["bgTestimonios"] ?? DARK;
  const testimonialsText     = getContrastColor(testimonialsBgUp) === "light" ? WHITE : DARK;
  const testimonialsMid      = getContrastColor(testimonialsBgUp) === "light" ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.6)";
  const testimonialsCardBg   = getContrastColor(testimonialsBgUp) === "light" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const testimonialsCardBorder = getContrastColor(testimonialsBgUp) === "light" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const nosotrosBgUp    = scu["bgNosotros"]   ?? BG;
  const nosotrosTextUp  = getContrastColor(nosotrosBgUp) === "light" ? WHITE : DARK;
  const nosotrosMidUp   = getContrastColor(nosotrosBgUp) === "light" ? "rgba(255,255,255,0.5)" : MID;
  const contactUpBg     = scu["bgContacto"]   ?? DARK;
  const contactUpText   = getContrastColor(contactUpBg) === "light" ? WHITE : DARK;
  const contactInputBg  = getContrastColor(contactUpBg) === "light" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const contactInputBorder = getContrastColor(contactUpBg) === "light" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)";
  const contactBgImg    = storeConfig?.imageOverrides?.["sectionbg_bgContacto"];
  const footerUpBg      = scu["bgFooter"]     ?? "#080808";
  const footerUpText    = getContrastColor(footerUpBg) === "light" ? WHITE : DARK;
  const footerUpMid     = getContrastColor(footerUpBg) === "light" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)";
  const footerBgImg     = storeConfig?.imageOverrides?.["sectionbg_bgFooter"];
  const productosBgUp   = scu["bgProductos"]  ?? BG;
  const productosTextUp = getContrastColor(productosBgUp) === "light" ? WHITE : DARK;
  // El botón "Ver colección completa" es la sección al revés: se pinta con el color
  // del texto. Para la etiqueta de adentro escribía el color del FONDO de la sección,
  // y eso fallaba dos veces seguidas:
  //
  //   1. El fondo puede ser un DEGRADADO —el panel lo guarda como el string de CSS
  //      ya armado y va derecho a `background:`, que lo acepta—. Pero `color:` NO
  //      acepta degradados: el navegador descarta la declaración entera y el texto
  //      hereda. El botón quedaba pintado y vacío.
  //   2. Aun con un color plano, copiar el fondo no es adaptarse. Si el fondo es un
  //      tono intermedio, la etiqueta sale de ese tono intermedio y apenas se
  //      despega del relleno: con el mauve de la tienda daba 5.94 contra los 19.17
  //      que da elegirla bien.
  //
  // Se elige midiendo contra el relleno del propio botón, que es la superficie que
  // tiene atrás — el mismo criterio que el resto del template.
  const productosBotonText = textoSobre(productosTextUp);
  const ofertasBgUp   = scu["bgOfertas"]  ?? DARK;
  const ofertasTextUp = getContrastColor(ofertasBgUp) === "light" ? WHITE : DARK;
  const masVistoBgUp   = scu["bgMasVisto"]  ?? DARK;
  const masVistoTextUp = getContrastColor(masVistoBgUp) === "light" ? WHITE : DARK;

  // ── El acento tiene que adaptarse (UP-3) ───────────────────────────────────
  // `ACC` lo elige la dueña y este template lo usaba crudo en los 40 lugares donde
  // aparece. Fallaba en las dos direcciones:
  //
  //   · Como RELLENO llevaba `color:DARK` escrito a mano. Con el neón de fábrica un
  //     texto negro encima se lee perfecto, pero con un acento oscuro quedaba negro
  //     sobre negro — y son los botones que importan ("Agregar al carrito", el CTA
  //     del hero, el de mayorista).
  //   · Como TEXTO iba crudo sobre fondos de sección que la dueña puede aclarar. El
  //     neón #d4ff00 sobre blanco da 1,16 de contraste (el mínimo legible es 4,5):
  //     invisible. De fábrica esos fondos son oscuros, así que el problema no se ve
  //     hasta el día que alguien aclara una sección.
  //
  // Los dos helpers ya existían en EditContext y este template no los usaba.
  // `textoSobre` elige por contraste real de WCAG, no por umbral de luminosidad.
  const accentText = textoSobre(ACC);
  // El acento como color de TEXTO sobre un fondo dado. Si no se distingue de ese
  // fondo, cae al color de texto que esa sección ya calculó para sí misma.
  const accentSobre = (bg: string, texto: string) => getReadableAccentText(ACC, bg, texto);
  // Los dos fondos que se repiten y no son de sección: el negro de la marca (botones,
  // barra flotante, logo) y el gris claro de adentro del modal (reseñas).
  const accSobreDark  = accentSobre(DARK, WHITE);
  const accSobreClaro = accentSobre(BG, DARK);

  const promoBannerEnabled = storeConfig?.promoBanner?.enabled !== false;
  const configMsgs = storeConfig?.promoBanner?.messages?.filter(m => m.trim()) ?? [];
  const tickerContent = configMsgs.length > 0
    ? configMsgs.join(" · ") + " · "
    : TICKER;

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

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

  const cart = useCartLogic(storefront);
  const {
    setCartOpen,
    modalProduct, setModalProduct, modalImg, setModalImg,
    selectedSize, setSelectedSize, selectedColor, setSelectedColor,
    qty, setQty, selectedVariantStock, outOfStockSizes,
    searchOpen, setSearchOpen, searchQuery, setSearchQuery,
    favorites, favoritesOpen, setFavoritesOpen,
    userDropdownOpen, setUserDropdownOpen, userDropdownRef,
    toastMsg,
    cartCount,
    searchResults, favoriteProducts,
    fmt, showToast, openModal, addToCart,
    toggleFavorite,
  } = cart;
  // `accentText` se declaraba acá una segunda vez, solo para el carrito, y estaba
  // INVERTIDO: `getContrastColor(ACC) === "light"` significa "sobre ACC va texto
  // claro", y la rama devolvía DARK. Con el acento de fábrica —el neón #d4ff00—
  // terminaba pidiendo BLANCO sobre amarillo: 1,16 de contraste, ilegible, en el
  // carrito y el checkout enteros. Ahora usa el mismo `accentText` de arriba, que
  // mide con el contraste real de WCAG y da 16,28.
  const cartTheme: CartTheme = { BG:"#ffffff", S:BG, T:DARK, MID, border:"#e0e0e0", accent:ACC, accentText };
  // ── El aviso de promo/oferta de una tarjeta (UP-5) ─────────────────────────
  // Estaba escrito a mano solo en la grilla del catálogo y en el modal, así que en
  // Ofertas, "Lo más visto", el destacado, similares, favoritos y el buscador el
  // comprador no veía nada. Con un descuento en porcentaje el precio en rojo todavía
  // lo delataba, pero una promo 3×2 o de envío gratis NO toca el precio: ahí el
  // producto se veía idéntico a uno sin promo.
  //   · "foto" → tag en la esquina, para las tarjetas con imagen grande.
  //   · "chip" → línea aparte, para las miniaturas de 56/68px del buscador y
  //     favoritos, donde un tag encima taparía media foto, y para el destacado,
  //     cuya foto ya lleva el `badge` propio del producto justo en esa esquina.
  const avisoPromo = (p: Product, modo: "foto" | "chip" = "foto") => {
    const pr = resolveProductPromo(p, promotions);
    const pct = discountPercent(p.price, p.comparePrice);
    const enOferta = !!p.comparePrice && p.comparePrice > p.price;
    if (!pr.primaryPromo && !enOferta) return null;
    if (modo === "foto") {
      return pr.primaryPromo
        ? <PromoTag tipo={pr.primaryPromo.type} label={describePromo(pr.primaryPromo).headline} size="sm" paleta={PALETA_PROMO_NEON} />
        : <OfferBadge badge={p.offerBadge} pct={pct} size="sm" />;
    }
    return (
      <span style={{ display:"inline-block", marginTop:4, maxWidth:"100%",
                     // Mismo color que tendría su tag en la foto: el chip es el mismo
                     // aviso, en chico.
                     background: pr.primaryPromo ? coloresPromo(pr.primaryPromo.type, PALETA_PROMO_NEON).fondo : "#dc2626",
                     color: pr.primaryPromo ? coloresPromo(pr.primaryPromo.type, PALETA_PROMO_NEON).texto : "#fff",
                     fontSize:9, fontWeight:900, letterSpacing:0.5, textTransform:"uppercase", padding:"2px 6px", lineHeight:1.3 }}>
        {pr.primaryPromo ? describePromo(pr.primaryPromo).headline : `${pct}% OFF`}
      </span>
    );
  };
  // ── El título de cada sección larga de la ficha ────────────────────────────
  // Barra corta en el acento, la etiqueta en mayúsculas y una línea que se come
  // el resto del ancho. Es lo que separa esta ficha de la de Chic Paris, que
  // titula centrado y en serif. La barra usa `accSobreClaro` y no `ACC` crudo:
  // con un acento casi blanco, sobre el blanco del modal desaparecería.
  const tituloModal = (texto: string) => (
    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
      <span style={{ width:24, height:4, background:accSobreClaro, flexShrink:0 }} />
      <span style={{ fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase", color:DARK, whiteSpace:"nowrap" }}>{texto}</span>
      <span style={{ flex:1, height:1, background:`${DARK}1f`, minWidth:0 }} />
    </div>
  );
  const variantPrice = modalProduct ? resolveVariantPrice(modalProduct.variants, selectedSize, selectedColor) : null;
  const displayPrice = variantPrice ?? (modalProduct?.price ?? 0);
  const modalPromo = modalProduct ? resolveProductPromo({ id: modalProduct.id, price: displayPrice, category: modalProduct.category }, promotions) : null;
  // 3×2 en vivo: unidades que se PAGAN a la cantidad elegida (misma cuenta que el motor).
  const nxmPaid = modalPromo?.nxm ? qty - Math.floor(qty / modalPromo.nxm.n) * (modalPromo.nxm.n - modalPromo.nxm.m) : null;
  const imgSwipe = useTouchSwipe(
    () => { if (modalProduct) setModalImg(i => (i + 1) % modalProduct.images.length); },
    () => { if (modalProduct) setModalImg(i => (i - 1 + modalProduct.images.length) % modalProduct.images.length); }
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

  // Las reseñas del producto abierto: carga, paginado, promedio y total. Vive en
  // `useResenasProducto` porque esto mismo estaba escrito cinco veces —los cuatro
  // templates de moda y la página de listado— con el mismo bug en las cinco.
  const resenasProd = useResenasProducto({ slug: storeConfig?.slug, productId: modalProduct?.id });

  // Lo que se resetea acá es lo del TEMPLATE, no las reseñas: el formulario, el
  // aviso de "gracias" y los dos bloques plegables. Si quedaran abiertos, abrir un
  // similar desde el pie del modal te deja mirando la mitad de una descripción que
  // no es la que pediste.
  useEffect(() => {
    if (!modalProduct) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de una interacción (abrir otra ficha), no se puede calcular durante el render
    setReviewDone(false); setDescAbierta(false); setFormResenaAbierto(false);
    setReviewForm(p => ({ ...p, rating: 5, comment: "" }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalProduct?.id]);

  const colorSyncingRef = useRef(false);

  // Al cambiar color: sync imagen + talle disponible
  useEffect(() => {
    if (!modalProduct || !selectedColor) return;
    const imgIdx = modalProduct.imageItems.findIndex(
      (img) => img.variantValue && img.variantValue.toLowerCase() === selectedColor.toLowerCase()
    );
    // `imgIdx !== modalImg` es lo que evita que la bandera quede trabada. Si la foto
    // que corresponde al color YA es la que se está viendo, React descarta el
    // setState y el efecto de [modalImg] —el único que baja la bandera— no corre.
    // Quedaba en true para siempre, y el próximo cambio de foto a mano se lo comía
    // sin sincronizar el color. Peor todavía: al abrir el modal, modalImg es 0 y la
    // foto del primer color suele ser la 0, así que se trababa desde el arranque y
    // el PRIMER clic en una miniatura ya no funcionaba (UP-4).
    if (imgIdx !== -1 && imgIdx !== modalImg) { colorSyncingRef.current = true; setModalImg(imgIdx); }
    const colorVariants = modalProduct.variants.filter((v) => {
      const a = parseVariantAttrs(v.name);
      return !!a && Object.values(a).some((x) => String(x).toLowerCase() === selectedColor.toLowerCase());
    });
    if (!colorVariants.length) return;
    const best = colorVariants.find((v) => v.stock > 0) ?? colorVariants[0];
    const bestAttrs = parseVariantAttrs(best.name);
    if (bestAttrs) {
      const sizeKey = Object.keys(bestAttrs).find((k: string) => SIZE_ATTRS.includes(k.toLowerCase()));
      if (sizeKey && bestAttrs[sizeKey] && bestAttrs[sizeKey] !== selectedSize) setSelectedSize(String(bestAttrs[sizeKey]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColor, modalProduct?.id]);

  // Al cambiar talle: sync color + imagen si el combo talle+color actual no existe
  useEffect(() => {
    if (!modalProduct || !selectedSize) return;
    if (selectedColor) {
      const hasCombo = modalProduct.variants.some((v) => {
        const a = parseVariantAttrs(v.name);
        if (!a) return false;
        const vals = Object.values(a).map((x) => String(x).toLowerCase());
        return vals.includes(selectedSize.toLowerCase()) && vals.includes(selectedColor.toLowerCase());
      });
      if (hasCombo) return;
    }
    const sizeVariants = modalProduct.variants.filter((v) => {
      const a = parseVariantAttrs(v.name);
      if (!a) return false;
      return Object.entries(a).some(([k, val]) => SIZE_ATTRS.includes(k.toLowerCase()) && String(val).toLowerCase() === selectedSize.toLowerCase());
    });
    if (!sizeVariants.length) return;
    const best = sizeVariants.find((v) => v.stock > 0) ?? sizeVariants[0];
    const bestAttrs = parseVariantAttrs(best.name);
    if (bestAttrs) {
      const colorKey = Object.keys(bestAttrs).find((k: string) => ["color","colour","colores","colors","tono"].includes(k.toLowerCase()));
      if (colorKey && bestAttrs[colorKey]) {
        const newColor = String(bestAttrs[colorKey]);
        if (newColor !== selectedColor) {
          setSelectedColor(newColor);
          const imgIdx = modalProduct.imageItems.findIndex(
            (img) => img.variantValue && img.variantValue.toLowerCase() === newColor.toLowerCase()
          );
          // Mismo motivo que arriba: solo se levanta si la foto va a cambiar de verdad.
          if (imgIdx !== -1 && imgIdx !== modalImg) { colorSyncingRef.current = true; setModalImg(imgIdx); }
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSize, modalProduct?.id]);

  // Al cambiar de imagen (flechas/miniaturas): sync color si esa foto pertenece a otra variante
  useEffect(() => {
    if (!modalProduct) return;
    if (colorSyncingRef.current) { colorSyncingRef.current = false; return; }
    const img = modalProduct.imageItems[modalImg];
    if (img?.variantValue && img.variantValue.toLowerCase() !== selectedColor?.toLowerCase()) {
      setSelectedColor(img.variantValue);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalImg]);

  // Guarda contra el doble envío. `reviewSubmitting` apaga el botón, pero es un
  // `setState`: no se aplica hasta el siguiente render, así que dos clics rápidos
  // —o dejar apretado Enter en un campo— entran los dos y publican la reseña dos
  // veces. Un ref se actualiza en el acto. Chic Paris ya lo tenía; acá faltaba.
  const enviandoResenaProd = useRef(false);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (isPreview || isOwner || reviewHoneypot || enviandoResenaProd.current) return;
    const slug = storeConfig?.slug;
    if (!modalProduct || !slug || !reviewForm.reviewer.trim()) return;
    enviandoResenaProd.current = true;
    setReviewSubmitting(true);
    try {
      const res = await fetch(`/api/public/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: modalProduct.id, rating: reviewForm.rating, comment: reviewForm.comment, reviewer: reviewForm.reviewer, buyerEmail: reviewForm.email.trim() || undefined, turnstileToken: reviewCaptcha.token }),
      });
      if (res.ok) {
        const data = await res.json();
        // Alta local: mete la reseña arriba y mueve el promedio y el total, que
        // ahora vienen de la base. Sin esto, quien acaba de publicar ve su reseña
        // en la lista y el contador de arriba clavado en el número viejo.
        resenasProd.agregar(data.review);
        setReviewForm({ reviewer: "", rating: 5, comment: "", email: "" });
        setReviewDone(true); setTimeout(() => setReviewDone(false), 4000);
      }
    } catch {} finally { enviandoResenaProd.current = false; reviewCaptcha.reset(); setReviewSubmitting(false); }
  }

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

  const changeGender = (g: string | null) => { setActiveGender(g); setActiveCategory("Todos"); setVisibleCount(8); };

  const allFiltered = useMemo(() => products.filter(p => {
    if (activeGender && p.gender !== activeGender && p.gender !== "unisex") return false;
    if (activeCategory !== "Todos" && p.category !== activeCategory) return false;
    return true;
  }), [products, activeGender, activeCategory]);
  const filtered    = allFiltered.slice(0, visibleCount);
  const featuredProduct  = products[7] ?? products[0] ?? null;

  const similarProducts = useMemo(() => {
    if (!modalProduct) return [];
    const others = products.filter(p => p.id !== modalProduct.id);
    const sameSub = modalProduct.subcategory ? others.filter(p => p.subcategory === modalProduct.subcategory) : [];
    const sameCat = others.filter(p => p.category === modalProduct.category && !sameSub.includes(p));
    const rest = others.filter(p => !sameSub.includes(p) && !sameCat.includes(p));
    return [...sameSub, ...sameCat, ...rest].slice(0, 4);
  }, [products, modalProduct]);

  const iconBtn = { background:"none", border:"none", cursor:"pointer", color:DARK, padding:6, display:"flex", alignItems:"center" } as const;

  useScrollReveal();

  return (
    <div style={{ fontFamily:"'Inter','Helvetica Neue',Arial,sans-serif", background:BG, color:DARK, minHeight:"100vh" }}>
      <style>{`
        @keyframes up-ticker { from { transform:translateX(0); } to { transform:translateX(-50%); } }
        .up-ticker { display:inline-flex; white-space:nowrap; animation:up-ticker 28s linear infinite; }
        @keyframes up-fade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .up-fade { animation:up-fade 0.25s ease; }
        .up-stroke { -webkit-text-stroke:2px #0f0f0f; color:transparent; }
        .up-prod-img { transition:transform 0.5s ease; }
        .up-cat img { transition:transform 0.5s ease; }
        @media (hover:hover) and (pointer:fine) {
          .up-prod:hover .up-prod-img { transform:scale(1.06); }
          .up-cat:hover img { transform:scale(1.08); }
        }
        @keyframes up-wa-pulse { 0% { box-shadow:0 4px 20px rgba(37,211,102,0.4), 0 0 0 0 rgba(37,211,102,0.55); } 70% { box-shadow:0 4px 20px rgba(37,211,102,0.4), 0 0 0 14px rgba(37,211,102,0); } 100% { box-shadow:0 4px 20px rgba(37,211,102,0.4), 0 0 0 0 rgba(37,211,102,0); } }
        .up-wa-fab { background:linear-gradient(135deg,#2be374,#1fae57); animation:up-wa-pulse 2.4s ease-out infinite; }
        .up-wa-fab:hover { animation-play-state:paused; }
        .up-zoom-img { transition:transform 0.5s ease; }
        .up-zoom:hover .up-zoom-img { transform:scale(1.06); }
      `}</style>

      {/* TOAST */}
      {toastMsg && (
        <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", background:DARK, color:accSobreDark, padding:"12px 28px", fontSize:11, fontWeight:900, letterSpacing:2, textTransform:"uppercase", zIndex:9999, maxWidth:"calc(100vw - 32px)", textAlign:"center" }}>
          {toastMsg}
        </div>
      )}

      {/* TICKER */}
      {promoBannerEnabled && (
        <div style={{ background:DARK, overflow:"hidden", height:36, display:"flex", alignItems:"center" }}>
          <div className="up-ticker">
            {[tickerContent, tickerContent].map((t, ri) => (
              <span key={ri}>
                {t.split("·").map((seg, i, arr) => (
                  <span key={i}>
                    <span style={{ color:"rgba(255,255,255,0.85)", fontSize:11, fontWeight:700, letterSpacing:2 }}>{seg}</span>
                    {i < arr.length - 1 && <span style={{ color:accSobreDark, fontSize:11, fontWeight:900, margin:"0 8px" }}>·</span>}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav style={{ position:"sticky", top:0, zIndex: isPreview ? 10000 : 100, background: scrolled ? WHITE : "rgba(245,245,245,0.95)", borderBottom: scrolled ? `3px solid ${DARK}` : "3px solid transparent", backdropFilter:"blur(8px)", transition:"all 0.3s", padding:"0 20px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, fontWeight:900, fontSize:18, letterSpacing:4, textTransform:"uppercase", flexShrink:0 }}>
          <span style={{ maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            <EditableZone field="storeName" label="Nombre de la tienda">
              {storeConfig?.storeName ?? <span>URBAN<span style={{ background:DARK, color:accSobreDark, padding:"3px 7px", marginLeft:2 }}>PULSE</span></span>}
            </EditableZone>
          </span>
          <VerifiedIconButton isVerified={storeConfig?.isVerified} info={storeConfig?.verifiedInfo} />
        </div>
        {!isMobile && <div style={{ display:"flex", gap:28, alignItems:"center" }}>
          {/* CATEGORÍAS dropdown */}
          <div style={{ position:"relative" }}
            onMouseEnter={() => setHoveredNavCat("__open__")}
            onMouseLeave={() => setHoveredNavCat(null)}>
            <button style={{ background:"none", border:"none", borderBottom:"2px solid transparent", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", color:DARK, padding:"4px 0", display:"flex", alignItems:"center", gap:5 }}
              onMouseEnter={e => { e.currentTarget.style.borderBottomColor = ACC; }}
              onMouseLeave={e => { e.currentTarget.style.borderBottomColor = "transparent"; }}>
              Categorías <span style={{ fontSize:9, opacity:0.6 }}>▾</span>
            </button>
            {hoveredNavCat && (
              <>
              <div style={{ position:"absolute", top:"100%", left:0, right:0, height:12, zIndex:499 }} />
              <div style={{ position:"absolute", top:"calc(100% + 12px)", left:0, background:WHITE, border:`2px solid ${DARK}`, zIndex:500, padding:16, boxShadow:`6px 6px 0 ${DARK}`, display:"grid", gridTemplateColumns:"repeat(2, 200px)", gap:10 }}>
                {categoryList.map(cat => {
                  const subs = subcategoriesFor[cat] || [];
                  return (
                    <div key={cat} style={{ border:`2px solid ${DARK}`, padding:"10px 12px", background:"#f5f5f5" }}>
                      <button onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=urban-pulse${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat)}`; setHoveredNavCat(null); }}
                        style={{ display:"block", width:"100%", background:ACC, border:`2px solid ${DARK}`, color:accentText, padding:"6px 8px", marginBottom:8, fontSize:11, fontWeight:800, textAlign:"left", cursor:"pointer", letterSpacing:1, textTransform:"uppercase", transition:"transform 0.1s" }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = `2px 2px 0 ${DARK}`; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translate(0,0)"; e.currentTarget.style.boxShadow = "none"; }}>
                        {cat}
                      </button>
                      {subs.length > 0 ? (
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                          {subs.map(sub => (
                            <button key={sub} onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=urban-pulse${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat)}&subcategoria=${encodeURIComponent(sub)}`; setHoveredNavCat(null); }}
                              style={{ background:WHITE, border:`1.5px solid ${DARK}`, color:DARK, padding:"4px 8px", fontSize:9.5, fontWeight:700, textAlign:"left", cursor:"pointer", letterSpacing:0.5, textTransform:"uppercase" }}
                              onMouseEnter={e => { e.currentTarget.style.background = ACC; e.currentTarget.style.color = accentText; }}
                              onMouseLeave={e => { e.currentTarget.style.background = WHITE; e.currentTarget.style.color = DARK; }}>
                              {sub}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin:0, fontSize:9.5, fontWeight:700, color:"#888", letterSpacing:0.5, textTransform:"uppercase" }}>Ver todo →</p>
                      )}
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </div>
          {/* MUJER */}
          <button onClick={() => { changeGender(activeGender==="mujer" ? null : "mujer"); scrollTo("productos"); }}
            style={{ background:"none", border:"none", borderBottom: activeGender==="mujer" ? `2px solid ${ACC}` : "2px solid transparent", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", color: DARK, padding:"4px 0", transition:"border-color 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderBottomColor = ACC; }}
            onMouseLeave={e => { if(activeGender!=="mujer") e.currentTarget.style.borderBottomColor = "transparent"; }}>
            Mujer
          </button>
          {/* HOMBRE */}
          <button onClick={() => { changeGender(activeGender==="hombre" ? null : "hombre"); scrollTo("productos"); }}
            style={{ background:"none", border:"none", borderBottom: activeGender==="hombre" ? `2px solid ${ACC}` : "2px solid transparent", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", color: DARK, padding:"4px 0", transition:"border-color 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderBottomColor = ACC; }}
            onMouseLeave={e => { if(activeGender!=="hombre") e.currentTarget.style.borderBottomColor = "transparent"; }}>
            Hombre
          </button>
          <button onClick={() => scrollTo("nosotros")}
            style={{ background:"none", border:"none", borderBottom:"2px solid transparent", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", color:DARK, padding:"4px 0", transition:"border-color 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderBottomColor = ACC; }}
            onMouseLeave={e => { e.currentTarget.style.borderBottomColor = "transparent"; }}>
            Nosotros
          </button>
        </div>}
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={() => setSearchOpen(true)} aria-label="Buscar" style={iconBtn}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          {pushBell && storeConfig?.showPushBell && !isPreview && (
            <StoreFollowButton storeSlug={storeConfig?.slug ?? ""} color={DARK} size={20} />
          )}
          {pushBell && storeConfig?.showPushBell && !isPreview && (
            <button onClick={pushBell.openDrawer} style={{ ...iconBtn, position:"relative" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill={pushBell.followState === "following" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {pushBell.hasNew && <span style={{ position:"absolute", top:4, right:4, width:10, height:10, background:"#ef4444", borderRadius:"50%", border:`2px solid ${DARK}` }} />}
            </button>
          )}
          {isPreview && (
            <>
              {storeConfig?.showPushBell ? (
                <button title="Los clientes pueden seguir tu tienda desde acá" style={{ ...iconBtn, position:"relative", opacity:0.85, cursor:"default" }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                </button>
              ) : (
                <button onClick={storeConfig?.onPreviewBellClick} title="🔒 Solo Plan Plus — tocá para activar" style={{ ...iconBtn, position:"relative", opacity:0.38 }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                  <span style={{ position:"absolute", top:4, right:4, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
                </button>
              )}
              {storeConfig?.showPushBell ? (
                <button onClick={storeConfig.onPreviewBellClick} title="Campanita de novedades — clic para configurar" style={{ ...iconBtn, position:"relative", opacity:0.85 }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </button>
              ) : (
                <button onClick={storeConfig?.onPreviewBellClick} title="🔒 Solo Plan Plus — tocá para activar" style={{ ...iconBtn, position:"relative", opacity:0.38 }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  <span style={{ position:"absolute", top:4, right:4, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
                </button>
              )}
            </>
          )}
          <button onClick={() => { setFavoritesOpen(true); setUserDropdownOpen(false); setCartOpen(false); }} aria-label="Favoritos" style={{ ...iconBtn, position:"relative" }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill={favorites.length > 0 ? DARK : "none"} stroke={DARK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>
            {favorites.length > 0 && <span style={{ position:"absolute", top:4, right:4, width:8, height:8, background:ACC, border:`2px solid ${DARK}`, borderRadius:"50%" }} />}
          </button>
          <div style={{ position:"relative" }} ref={userDropdownRef}>
            <button onClick={() => { setUserDropdownOpen(o => !o); setFavoritesOpen(false); }} style={{ ...iconBtn, cursor:"pointer" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
            {userDropdownOpen && (
              <div className="up-fade" style={{ position:"absolute", top:"calc(100% + 8px)", right:0, background:WHITE, border:`2px solid ${DARK}`, minWidth:190, zIndex:200 }}>
                {user ? (
                  <>
                    <p style={{ padding:"8px 16px 4px", fontSize:10, fontWeight:800, letterSpacing:2, textTransform:"uppercase", color:MID, margin:0, borderBottom:`1px solid ${BG}`, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {user.name || user.email.split("@")[0]}
                    </p>
                    <a href={panelHref} onClick={() => setUserDropdownOpen(false)}
                      style={{ display:"block", width:"100%", padding:"10px 16px", textDecoration:"none", fontSize:11, fontWeight:800, letterSpacing:2, textTransform:"uppercase", color:DARK, borderBottom:`1px solid ${BG}` }}
                      onMouseEnter={e => { e.currentTarget.style.background = ACC; e.currentTarget.style.color = accentText; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = DARK; }}>{panelLabel}</a>
                    <button onClick={() => { if (isPreview) return; setUserDropdownOpen(false); signOut("/"); }}
                      style={{ display:"block", width:"100%", padding:"10px 16px", background:"none", border:"none", textAlign:"left", fontSize:11, fontWeight:800, letterSpacing:2, textTransform:"uppercase", cursor: isPreview ? "default" : "pointer", color:"#ef4444", opacity: isPreview ? 0.45 : 1 }}
                      onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background = "#fff1f1"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>Cerrar sesión</button>
                  </>
                ) : (
                  <>
                    <a href={isPreview ? undefined : `/login?redirect=/tienda/${storeConfig?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)}
                      style={{ display:"block", padding:"10px 16px", textDecoration:"none", fontSize:11, fontWeight:800, letterSpacing:2, textTransform:"uppercase", color:DARK, borderBottom:`1px solid ${BG}`, cursor: isPreview ? "default" : "pointer" }}
                      onMouseEnter={e => { if (!isPreview) { e.currentTarget.style.background = ACC; e.currentTarget.style.color = accentText; } }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = DARK; }}>Iniciar sesión</a>
                    <a href={isPreview ? undefined : `/registro?plan=buyer&redirect=/tienda/${storeConfig?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)}
                      style={{ display:"block", padding:"10px 16px", textDecoration:"none", fontSize:11, fontWeight:800, letterSpacing:2, textTransform:"uppercase", color:DARK, cursor: isPreview ? "default" : "pointer" }}
                      onMouseEnter={e => { if (!isPreview) { e.currentTarget.style.background = ACC; e.currentTarget.style.color = accentText; } }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = DARK; }}>Registrarse</a>
                  </>
                )}
              </div>
            )}
          </div>
          {isMobile && (
            <button onClick={() => { setMobileMenuOpen(o => !o); setMobileCatsOpen(false); setMobileOpenCat(null); }} style={{ background:"none", border:"none", color:DARK, cursor:"pointer", padding:4, display:"flex", flexDirection:"column", gap:4, alignItems:"center" }}>
              <span style={{ display:"block", width:20, height:2.5, background:DARK, transition:"all 0.3s", transform: mobileMenuOpen ? "rotate(45deg) translate(3px,4px)" : "none" }}/>
              <span style={{ display:"block", width:20, height:2.5, background:DARK, transition:"all 0.3s", opacity: mobileMenuOpen ? 0 : 1 }}/>
              <span style={{ display:"block", width:20, height:2.5, background:DARK, transition:"all 0.3s", transform: mobileMenuOpen ? "rotate(-45deg) translate(3px,-4px)" : "none" }}/>
            </button>
          )}
        </div>
      </nav>
      {isMobile && mobileMenuOpen && (
        <div style={{ position:"fixed", top: scrolled || !promoBannerEnabled ? 64 : 100, left:0, right:0, bottom:0, background:WHITE, zIndex:99, overflowY:"auto", overscrollBehavior:"contain" }}>
          {/* Categorías — acordeón (siempre visible, igual que en desktop) */}
          <>
            <button onClick={() => setMobileCatsOpen(o => !o)}
              style={{ display:"flex", width:"100%", background:"none", border:"none", borderBottom:`2px solid ${DARK}`, color:DARK, padding:"16px 24px", fontSize:12, textAlign:"left", cursor:"pointer", letterSpacing:3, fontWeight:800, textTransform:"uppercase", alignItems:"center", justifyContent:"space-between" }}>
              Categorías
              <span style={{ fontSize:10, opacity:0.5, transition:"transform 0.2s", transform: mobileCatsOpen ? "rotate(180deg)" : "none", display:"inline-block" }}>▾</span>
            </button>
            {mobileCatsOpen && categoryList.map(cat => {
              const subs = subcategoriesFor[cat] || [];
              return (
                <Fragment key={cat}>
                  <button onClick={() => {
                    if (subs.length > 0) {
                      setMobileOpenCat(prev => prev === cat ? null : cat);
                    } else {
                      window.location.href = `/tienda/${storeConfig?.slug}/productos?t=urban-pulse${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat)}`;
                      setMobileMenuOpen(false); setMobileCatsOpen(false);
                    }
                  }} style={{ display:"flex", width:"100%", background:"#f5f5f5", border:"none", borderBottom:`1px solid rgba(0,0,0,0.1)`, color: activeCategory===cat ? accSobreClaro : DARK, padding:"13px 24px 13px 40px", fontSize:11, textAlign:"left", cursor:"pointer", letterSpacing:3, fontWeight:800, textTransform:"uppercase", alignItems:"center", justifyContent:"space-between" }}>
                    {cat}
                    {subs.length > 0 && <span style={{ fontSize:12, opacity:0.5, transition:"transform 0.2s", transform: mobileOpenCat===cat ? "rotate(90deg)" : "none", display:"inline-block" }}>›</span>}
                  </button>
                  {subs.length > 0 && mobileOpenCat === cat && subs.map(sub => (
                    <button key={sub} onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=urban-pulse${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat)}&subcategoria=${encodeURIComponent(sub)}`; setMobileMenuOpen(false); setMobileCatsOpen(false); setMobileOpenCat(null); }}
                      style={{ display:"block", width:"100%", background:"#ebebeb", border:"none", borderBottom:`1px solid rgba(0,0,0,0.07)`, color:"#555", padding:"11px 24px 11px 60px", fontSize:11, textAlign:"left", cursor:"pointer", letterSpacing:2, fontWeight:700, textTransform:"uppercase" }}>
                      {sub}
                    </button>
                  ))}
                </Fragment>
              );
            })}
            {mobileCatsOpen && categoryList.length === 0 && (
              <p style={{ padding:"12px 40px", fontSize:11, color:MID, margin:0, fontStyle:"italic" }}>Sin categorías disponibles</p>
            )}
          </>
          {[["Mujer","mujer"],["Hombre","hombre"]].map(([label, g]) => (
            <button key={g} onClick={() => { changeGender(activeGender===g ? null : g); scrollTo("productos"); setMobileMenuOpen(false); }}
              style={{ display:"block", width:"100%", background: activeGender===g ? DARK : "none", border:"none", borderBottom:`2px solid ${DARK}`, color: activeGender===g ? accSobreDark : DARK, padding:"16px 24px", fontSize:12, textAlign:"left", cursor:"pointer", letterSpacing:3, fontWeight:800, textTransform:"uppercase" }}>
              {label}
            </button>
          ))}
          <button onClick={() => { scrollTo("nosotros"); setMobileMenuOpen(false); }}
            style={{ display:"block", width:"100%", background:"none", border:"none", borderBottom:`2px solid ${DARK}`, color:DARK, padding:"16px 24px", fontSize:12, textAlign:"left", cursor:"pointer", letterSpacing:3, fontWeight:800, textTransform:"uppercase" }}>
            Nosotros
          </button>
        </div>
      )}

      {/* HERO — diagonal split */}
      <section style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "55% 45%", minHeight: isMobile ? "auto" : "calc(100vh - 100px)", overflow:"hidden" }}>
        <div style={{ background:heroLeftUpBg, display:"flex", flexDirection:"column", justifyContent:"flex-end", padding: isMobile ? "60px 20px 48px" : "80px 64px", clipPath: isMobile ? "none" : "polygon(0 0, 100% 0, 91% 100%, 0 100%)", position:"relative" }}>
          <EditableSectionBg field="bgHeroLeft" label="Fondo hero" />
          <span style={{ color:accentSobre(heroLeftUpBg, heroLeftUpText), fontSize:10, letterSpacing:6, fontWeight:800, textTransform:"uppercase", marginBottom:20, display:"block" }}>
            <EditableZone field="storeTagline" label="Tagline">{storeConfig?.storeTagline ?? "▶ Nueva Colección 2025"}</EditableZone>
          </span>
          <h1 style={{ color:heroLeftUpText, fontSize: isMobile ? "clamp(32px,9vw,52px)" : "clamp(58px,7.5vw,108px)", fontWeight:900, lineHeight:0.88, margin:"0 0 28px", textTransform:"uppercase", letterSpacing:"-2px" }}>
            <EditableZone field="heroHeading" label="Título principal">MOVE FASTER. GO HARDER.</EditableZone>
          </h1>
          <p style={{ color:heroLeftUpMid, fontSize:15, maxWidth:360, marginBottom:40, lineHeight:1.7 }}>
            <EditableZone field="heroSubtext" label="Subtítulo hero">Ropa deportiva de alta performance para quienes no conocen los límites.</EditableZone>
          </p>
          <div style={{ display:"flex", gap:12 }}>
            {(editMode || !storeConfig?.textOverrides?.["heroCta"]?.hidden) && (
              <button onClick={() => scrollTo("productos")}
                style={{ background:ACC, color:accentText, border:"none", padding:"16px 36px", fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor:"pointer" }}>
                <EditableZone field="heroCta" label="Botón principal">Ver Colección</EditableZone>
              </button>
            )}
            {(editMode || !storeConfig?.textOverrides?.["heroCtaSecondary"]?.hidden) && (
              <button onClick={() => scrollTo("featured")}
                style={{ background:"none", color:heroLeftUpText, border:`2px solid ${heroLeftUpMid}`, padding:"16px 36px", fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor:"pointer" }}>
                <EditableZone field="heroCtaSecondary" label="Botón secundario">Featured Drop</EditableZone>
              </button>
            )}
          </div>
        </div>
        <div style={{ position:"relative", width:"100%", height:"100%", overflow:"hidden" }}>
          <FadeImage src={storeConfig?.imageOverrides?.["heroImage"]?.url ?? "https://picsum.photos/seed/up_hero/800/900"} alt="Hero" fill sizes="(max-width: 768px) 100vw, 45vw" style={{ objectFit:"cover", objectPosition:`${storeConfig?.imageOverrides?.["heroImage"]?.posX ?? 50}% ${storeConfig?.imageOverrides?.["heroImage"]?.posY ?? 50}%` }} />
          <BgDragHandle imgKey="heroImage" />
          <EditableImageButton field="heroImage" label="Imagen hero" />
          {(() => { const ov = storeConfig?.imageOverrides?.["heroImage"]; if (!ov?.overlayType || ov.overlayType === "none") return null; return <div style={{ position:"absolute", inset:0, pointerEvents:"none", background: ov.overlayType === "light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.45})` }} />; })()}
          <div style={{ position:"absolute", top:36, right:36, background:ACC, color:accentText, padding:"12px 20px", fontWeight:900, fontSize:10, letterSpacing:4, textTransform:"uppercase" }}>
            <EditableZone field="heroNewDropBadge" label="Badge hero">New Drop</EditableZone>
          </div>
        </div>
      </section>

      <div style={{ display:"flex", flexDirection:"column" }}>
      <SectionBlock id="up-garantias" label="Garantías" isPreview={isPreview} defaultOrder={UP_SECTION_IDS}>
      {/* GARANTÍAS */}
      <section data-reveal style={{ background:garantiasUpBg, borderTop:`3px solid ${DARK}`, borderBottom:`3px solid ${DARK}`, position:"relative" }}>
        <EditableSectionBg field="bgGarantias" label="Fondo garantías" />
        <div style={{ maxWidth:1200, margin:"0 auto", display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)" }}>
          {GARANTIAS.map((g, i) => {
            const iconIdx = (Math.abs(parseInt(textOverrides[`garantia${i+1}Icon`]?.text ?? "0") || 0)) % UP_STRIP_ICONS[i].length;
            const nextIdx = (iconIdx + 1) % UP_STRIP_ICONS[i].length;
            return (
              <div key={g.title} style={{ display:"flex", alignItems:"center", gap:12, padding: isMobile ? "14px 16px" : "18px 24px", borderRight: i < 3 ? `1px solid rgba(0,0,0,0.1)` : "none" }}>
                <span style={{ color:garantiasUpText, position:"relative", flexShrink:0 }}>
                  {UP_STRIP_ICONS[i][iconIdx]}
                  {editMode && (
                    <button onClick={() => setOverride(`garantia${i+1}Icon`, { text: String(nextIdx) })} title="Cambiar ícono"
                      style={{ position:"absolute", inset:0, background:"rgba(99,102,241,0.9)", border:"none", borderRadius:4, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11, opacity:0, transition:"opacity 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.opacity="1")} onMouseLeave={e => (e.currentTarget.style.opacity="0")}>↻</button>
                  )}
                </span>
                <div>
                  <p style={{ margin:0, fontSize:11, fontWeight:900, letterSpacing:1, textTransform:"uppercase", color:garantiasUpText }}><EditableZone field={`garantia${i+1}Title`} label={`Título garantía ${i+1}`}>{g.title}</EditableZone></p>
                  <p style={{ margin:0, fontSize:11, color:garantiasUpText, opacity:0.6 }}><EditableZone field={`garantia${i+1}Desc`} label={`Descripción garantía ${i+1}`}>{g.desc}</EditableZone></p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      </SectionBlock>

      {/* BANNER HORIZONTAL */}
      <SectionBlock id="up-banner" label="Banner horizontal" isPreview={isPreview} defaultOrder={UP_SECTION_IDS}>
        <PromoBannerCarousel
          images={[storeConfig?.imageOverrides?.["promoBanner1"], storeConfig?.imageOverrides?.["promoBanner2"], storeConfig?.imageOverrides?.["promoBanner3"]]}
          demoImages={[
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1920&q=80",
            "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1920&q=80",
            "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1920&q=80",
          ]}
          intervalMs={storeConfig?.bannerInterval ?? 4000}
          editMode={editMode}
          isPreview={isPreview}
          accent={ACC}
          bg={DARK}
        />
      </SectionBlock>

      <SectionBlock id="up-categorias" label="Categorías" isPreview={isPreview} defaultOrder={UP_SECTION_IDS}>
      {/* CATEGORY TILES */}
      <section data-reveal style={{ background:categoriesBgUp, position:"relative" }}>
        <EditableSectionBg field="bgCategorias" label="Fondo categorías" />
        <div style={{ padding: isMobile ? "48px 16px" : "80px 40px", maxWidth:1200, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:40 }}>
          <h2 style={{ fontSize:"clamp(36px,4vw,52px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-1px", margin:0, lineHeight:1, color:categoriasText }}>
            <EditableZone field="categoriesHeading" label="Título sección categorías">Explorá la tienda</EditableZone>
          </h2>
          <button onClick={() => scrollTo("productos")}
            style={{ background:"none", border:`2px solid ${categoriasText}`, color:categoriasText, padding:"10px 24px", fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor:"pointer" }}>
            <EditableZone field="categoryViewAll" label="Botón ver todo">Ver todo →</EditableZone>
          </button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap:4 }}>
          {[
            { label:"Mujer",      cat:"Mujer",      img: storeConfig?.imageOverrides?.["catMujer"]?.url ?? "https://picsum.photos/seed/up_cat1/600/700",      field:"catMujer" },
            { label:"Hombre",     cat:"Hombre",     img: storeConfig?.imageOverrides?.["catHombre"]?.url ?? "https://picsum.photos/seed/up_cat2/600/700",     field:"catHombre" },
            { label:"Accesorios", cat:"Accesorios", img: storeConfig?.imageOverrides?.["catAccesorios"]?.url ?? "https://picsum.photos/seed/up_cat3/600/700", field:"catAccesorios" },
          ].map(c => (
            <div key={c.label} className="up-cat" onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=urban-pulse${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(c.cat)}`; }}
              style={{ position:"relative", width:"100%", aspectRatio:"3/4", overflow:"hidden", cursor:"pointer" }}>
              <FadeImage src={c.img} alt={c.label} fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit:"cover", objectPosition:`${storeConfig?.imageOverrides?.[c.field]?.posX ?? 50}% ${storeConfig?.imageOverrides?.[c.field]?.posY ?? 50}%` }} />
              <BgDragHandle imgKey={c.field} />
              <EditableImageButton field={c.field} label={`Imagen ${c.label}`} />
              {(() => { const ov = storeConfig?.imageOverrides?.[c.field]; if (!ov?.overlayType || ov.overlayType === "none") return null; return <div style={{ position:"absolute", inset:0, pointerEvents:"none", background: ov.overlayType === "light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.45})` }} />; })()}
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%)" }} />
              <div style={{ position:"absolute", bottom:24, left:24 }}>
                <p style={{ color:WHITE, fontSize:26, fontWeight:900, textTransform:"uppercase", letterSpacing:2, margin:"0 0 6px" }}>{c.label}</p>
                <p style={{ color:accentSobre(categoriesBgUp, categoriasText), fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", margin:0 }}>Ver colección →</p>
              </div>
            </div>
          ))}
        </div>
        </div>
      </section>
      </SectionBlock>

      {/* MAYORISTA — banner "Solicitá tu lista de precios" */}
      <SectionBlock id="up-mayorista" label="Mayorista" isPreview={isPreview} defaultOrder={UP_SECTION_IDS}>
      {isWholesale && (
        <section data-reveal style={{ background:DARK, borderTop:`2px solid ${ACC}` }}>
          <div style={{ maxWidth:1200, margin:"0 auto", padding:"64px 40px", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", gap:20 }}>
            <span style={{ fontSize:9, letterSpacing:5, color:accSobreDark, textTransform:"uppercase", fontWeight:900, background:"rgba(212,255,0,0.1)", padding:"5px 14px", borderRadius:2 }}>⚡ Tienda mayorista</span>
            <h2 style={{ fontSize:"clamp(28px,4vw,52px)", fontWeight:900, color:WHITE, margin:0, textTransform:"uppercase", letterSpacing:"-1px", lineHeight:1.05 }}>
              SOLICITÁ TU<br/><span style={{ color:accSobreDark }}>LISTA DE PRECIOS</span>
            </h2>
            <p style={{ fontSize:13, color:"rgba(255,255,255,0.5)", maxWidth:460, margin:0, lineHeight:1.7, letterSpacing:"0.2px" }}>
              Precios exclusivos para revendedores y distribuidores. Completá el formulario de contacto y te respondemos con tu lista personalizada en menos de 24 hs.
            </p>
            <button onClick={() => scrollTo("contacto")}
              style={{ background:ACC, color:accentText, border:"none", padding:"14px 44px", fontSize:10, fontWeight:900, letterSpacing:4, textTransform:"uppercase", cursor:"pointer", borderRadius:2, marginTop:4 }}>
              CONSULTAR AHORA →
            </button>
          </div>
        </section>
      )}
      </SectionBlock>

      <SectionBlock id="up-featured" label="Producto destacado" isPreview={isPreview} defaultOrder={UP_SECTION_IDS}>
      {/* FEATURED DROP */}
      {featuredProduct && (
      <section id="featured" data-reveal style={{ background:featuredBg, padding:"80px 40px", position:"relative" }}>
        <EditableSectionBg field="bgFeatured" label="Fondo featured" />
        <div style={{ maxWidth:1100, margin:"0 auto", display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:0, alignItems:"center" }}>
          <div style={{ position:"relative", width:"100%", aspectRatio:"3/4" }}>
            {featuredProduct.images[0] && <FadeImage src={featuredProduct.images[0]} alt={featuredProduct.name} fill sizes="(max-width: 768px) 100vw, 50vw" style={{ objectFit:"cover" }} />}
            {featuredProduct.badge && (
              <span style={{ position:"absolute", top:20, left:20, background:ACC, color:accentText, padding:"6px 14px", fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase" }}>
                {featuredProduct.badge}
              </span>
            )}
          </div>
          <div style={{ padding: isMobile ? "28px 20px" : "60px 56px" }}>
            <span style={{ color:accentSobre(featuredBg, featuredText), fontSize:10, letterSpacing:6, fontWeight:800, textTransform:"uppercase", display:"block", marginBottom:16 }}>
              <EditableZone field="featuredLabel" label="Etiqueta featured">▶ Featured Drop</EditableZone>
            </span>
            <h2 style={{ color:featuredText, fontSize:"clamp(32px,4vw,50px)", fontWeight:900, textTransform:"uppercase", lineHeight:1.05, margin:"0 0 20px", letterSpacing:"-1px" }}>
              {featuredProduct.name}
            </h2>
            <p style={{ color:featuredText, opacity:0.45, fontSize:14, lineHeight:1.8, marginBottom:28 }}>
              <EditableZone field="featuredDescription" label="Descripción featured">Tecnología de compresión avanzada para máximo soporte muscular y recuperación activa. Perfecto para entrenamiento de alta intensidad.</EditableZone>
            </p>
            <div style={{ marginBottom:32 }}>
              {[["Material","87% Nylon · 13% Elastane"],["Tecnología","4-Way Stretch"],["Uso","Gym · Running · Training"]].map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${featuredText === WHITE ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}>
                  <span style={{ color:featuredText, opacity:0.35, fontSize:11, fontWeight:800, letterSpacing:2, textTransform:"uppercase" }}>{k}</span>
                  <span style={{ color:featuredText, fontSize:12 }}>{v}</span>
                </div>
              ))}
            </div>
            {/* UP-1 — Este precio estaba escrito a mano con `fmt(featuredProduct.price)`
                y era el único de la tienda que NO consultaba las promociones. Con una
                promo del 20% vigente, el bloque más grande de la página decía $50.000
                mientras la grilla de abajo decía $40.000 y el carrito cobraba $40.000:
                las dos cifras visibles a la vez. `PromoPrice` hace imposible mostrar un
                precio sin haber preguntado por las promos.
                El tachado usa `sobre` para atenuarse CONTRA el fondo de esta sección,
                que es editable, en vez del gris fijo pensado para fondo blanco. */}
            <PromoPrice product={featuredProduct} promotions={promotions} fmt={fmt} accent={accentSobre(featuredBg, featuredText)} sobre={featuredText}
              priceSize={36} compareSize={20} weight={900} ocultarPrecios={ocultarPrecios}
              gap={16} align="baseline" style={{ marginBottom:12 }} />
            {/* En "chip" y no en la foto: esa esquina ya la ocupa el `badge` propio
                del producto, y PromoTag se posiciona justo ahí. */}
            <div style={{ marginBottom:24 }}>{avisoPromo(featuredProduct, "chip")}</div>
            <button onClick={() => isInquiryMode ? openInquiry(featuredProduct) : openModal(featuredProduct)}
              style={{ width:"100%", background:ACC, color:accentText, border:"none", padding:"18px", fontSize:11, fontWeight:900, letterSpacing:4, textTransform:"uppercase", cursor:"pointer" }}>
              {isInquiryMode ? "Consultar disponibilidad" : "Agregar al Carrito"}
            </button>
          </div>
        </div>
      </section>
      )}
      </SectionBlock>

      {/* PRODUCTS */}
      <SectionBlock id="up-productos" label="Catálogo de productos" isPreview={isPreview} defaultOrder={UP_SECTION_IDS}>
      <section id="productos" data-reveal style={{ background:productosBgUp, position:"relative" }}>
        <EditableSectionBg field="bgProductos" label="Fondo productos" />
        <div style={{ padding: isMobile ? "48px 16px" : "80px 40px", maxWidth:1200, margin:"0 auto" }}>
        <div style={{ marginBottom:40 }}>
          <h2 style={{ fontSize:"clamp(32px,4vw,44px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-1px", margin:0, color:productosTextUp }}>
            {activeGender==="mujer" ? "Mujer" : activeGender==="hombre" ? "Hombre" : activeCategory==="Todos" ? <EditableZone field="collectionHeading" label="Título sección productos">Colección</EditableZone> : activeCategory}
          </h2>
          <p style={{ fontSize:12, color:productosTextUp, opacity:0.5, margin:"6px 0 0" }}>{allFiltered.length} piezas</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(3,1fr)", gap:4 }}>
          {filtered.map((product, idx) => {
            const big = !isMobile && (idx === 0 || idx === 5);
            const promo = resolveProductPromo(product, promotions);
            return (
              <div key={product.id} className="up-prod" onClick={() => openModal(product)}
                style={{ gridColumn: big ? "span 2" : "span 1", cursor:"pointer", position:"relative", background:WHITE }}>
                {(() => {
                  if (promo.primaryPromo) return <PromoTag tipo={promo.primaryPromo.type} label={describePromo(promo.primaryPromo).headline} size={big ? "md" : "sm"} paleta={PALETA_PROMO_NEON} />;
                  const hasOffer = !!product.comparePrice && product.comparePrice > product.price;
                  if (!hasOffer) return null;
                  return <OfferBadge badge={product.offerBadge} pct={discountPercent(product.price, product.comparePrice)} size={big ? "md" : "sm"} />;
                })()}
                <div style={{ position:"relative", width:"100%", overflow:"hidden", aspectRatio: big ? "16/9" : "3/4" }}>
                  {product.images[0] && <FadeImage className="up-prod-img" src={product.images[0]} alt={product.name} fill sizes={big ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 50vw, 33vw"} style={{ objectFit:"cover" }} />}
                  {(() => {
                    const isSoldOut = product.variants.length > 0 && product.variants.reduce((s, v) => s + (v.stock || 0), 0) === 0;
                    if (!isSoldOut) return null;
                    return <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,0.72)", display:"flex", alignItems:"center", justifyContent:"center", padding:"9px 0", zIndex:2 }}><span style={{ color:"#fff", fontSize:9, fontWeight:900, letterSpacing:4, textTransform:"uppercase" }}>Sin stock</span></div>;
                  })()}
                </div>
                <div style={{ padding:"14px 16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <p style={{ margin:0, fontSize:10, color:MID, fontWeight:800, letterSpacing:2, textTransform:"uppercase" }}>{product.category}</p>
                      <p style={{ margin:"4px 0 0", fontSize:14, fontWeight:800 }}>{product.name}</p>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      {ocultarPrecios ? (
                        <p style={{ margin:0, fontSize:15, fontWeight:900, color:DARK }}>Consultá precio</p>
                      ) : promo.hasPriceDrop ? (
                        <>
                          <p style={{ margin:0, fontSize:11, color:MID, textDecoration:"line-through" }}>{fmt(promo.originalPrice)}</p>
                          <p style={{ margin:0, fontSize:15, fontWeight:900, color:RED }}>{fmt(promo.effectivePrice)}</p>
                          {promo.pctOff != null && <p style={{ margin:"2px 0 0", fontSize:10, fontWeight:800, color:RED }}>-{promo.pctOff}%</p>}
                        </>
                      ) : (
                        <>
                          {product.comparePrice && <p style={{ margin:0, fontSize:11, color:MID, textDecoration:"line-through" }}>{fmt(product.comparePrice)}</p>}
                          <p style={{ margin:0, fontSize:15, fontWeight:900, color: product.comparePrice ? RED : DARK }}>{fmt(product.price)}</p>
                          {discountPercent(product.price, product.comparePrice) !== null && (
                            <p style={{ margin:"2px 0 0", fontSize:10, fontWeight:800, color:RED }}>-{discountPercent(product.price, product.comparePrice)}%</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {product.badge && (
                    // El badge del producto ("Nuevo", "Sale"). El que NO es "Sale"
                    // se pintaba de negro con el acento CRUDO de texto: con un
                    // acento oscuro quedaba negro sobre negro y la etiqueta
                    // desaparecía. `accSobreDark` devuelve el acento cuando se
                    // distingue del negro, y blanco cuando no.
                    <span style={{ display:"inline-block", marginTop:8, background: product.badge === "Sale" ? RED : DARK, color: product.badge === "Sale" ? WHITE : accSobreDark, padding:"3px 10px", fontSize:9, fontWeight:900, letterSpacing:3, textTransform:"uppercase" }}>
                      {product.badge}
                    </span>
                  )}
                </div>
                <button onClick={e => { e.stopPropagation(); toggleFavorite(product.id); }}
                  style={{ position:"absolute", top:12, right:12, background:WHITE, border:"none", borderRadius:"50%", width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                  <svg width={15} height={15} viewBox="0 0 24 24" fill={favorites.includes(product.id) ? DARK : "none"} stroke={DARK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </button>
              </div>
            );
          })}
        </div>
        <div style={{ textAlign:"center", marginTop:48 }}>
          <a href={`/tienda/${storeConfig?.slug}/productos?t=urban-pulse${isPreview ? "&from=editor" : ""}`}
            style={{ display:"inline-block", background:productosTextUp, color:productosBotonText, border:`3px solid ${productosTextUp}`, padding:"16px 52px", fontSize:11, fontWeight:900, letterSpacing:4, textTransform:"uppercase", textDecoration:"none", transition:"all 0.2s" }}
            onMouseEnter={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=productosTextUp; }}
            onMouseLeave={e=>{ e.currentTarget.style.background=productosTextUp; e.currentTarget.style.color=productosBotonText; }}>
            Ver colección completa
          </a>
        </div>
        </div>
      </section>
      </SectionBlock>

      {/* RESEÑAS ─────────────────────────────────────────────────────────────
          Antes eran cuatro testimonios inventados en el código. Ahora son las
          reseñas de verdad: la FUNCIÓN está en `useHomeReviews` y se comparte con
          los otros templates; el diseño es de acá.

          Y el diseño no se parece al de Chic Paris a propósito. Allá es un
          carrusel horizontal de tarjetas claras con Playfair en itálica; acá es la
          grilla dura del resto de Urban Pulse — bordes rectos, mayúsculas,
          estrellas dibujadas, sin curvas. */}
      <SectionBlock id="up-testimonios" label="Reseñas" isPreview={isPreview} defaultOrder={UP_SECTION_IDS}>
      <section data-reveal style={{ background:testimonialsBgUp, padding:"80px 0", position:"relative" }}>
        <EditableSectionBg field="bgTestimonios" label="Fondo reseñas" />
        <div style={{ padding: isMobile ? "0 20px" : "0 40px", marginBottom:28, position:"relative", zIndex:1 }}>
          {/* El promedio REAL. Los cuatro testimonios viejos mostraban cinco
              estrellas siempre, así que una tienda con promedio 3,2 publicaba
              cinco doradas arriba de sus propias reseñas. */}
          {(() => {
            const promedio = resenas.promedioMostrado;
            const total    = resenas.totalMostrado;
            if (!total) return null;
            return (
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, flexWrap:"wrap" }}>
                <span style={{ display:"flex", gap:3 }}>
                  {[1,2,3,4,5].map(s => (
                    // Mismo caso que las estrellas de las tarjetas: el acento crudo
                    // sobre una sección oscura se pierde. Estas son las del
                    // PROMEDIO, arriba del título, y se habían quedado sin arreglar.
                    <svg key={s} width={15} height={15} viewBox="0 0 24 24" fill={s <= Math.round(promedio) ? accentSobre(testimonialsBgUp, testimonialsText) : testimonialsMid} stroke="none" style={{ opacity: s <= Math.round(promedio) ? 1 : 0.35 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  ))}
                </span>
                <span style={{ color:testimonialsText, fontSize:11, fontWeight:900, letterSpacing:2, textTransform:"uppercase" }}>
                  {promedio.toFixed(1).replace(".", ",")} · {total} {total === 1 ? "reseña" : "reseñas"}
                </span>
              </div>
            );
          })()}
          <h2 style={{ color:testimonialsText, fontSize:"clamp(30px,3.5vw,42px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-1px", margin:0 }}>
            {/* Con cero reseñas el título deja de afirmar algo que no pasó. Si el
                dueño escribió el suyo, manda el suyo. */}
            <EditableZone field="testimonialsHeading" label="Título reseñas">
              {resenas.sinNada ? "¿Ya compraste? Contanos cómo te fue" : "Lo que dicen nuestros clientes"}
            </EditableZone>
          </h2>

          {/* Aviso, solo mientras se edita: que quede claro que esas cuatro no
              son reales y qué va a pasar en la tienda publicada. */}
          {isPreview && (
            <div style={{ display:"flex", gap:9, marginTop:16, padding:"11px 14px", background:"#fffbeb", border:"2px solid #fde68a", maxWidth:640 }}>
              <span style={{ flexShrink:0, fontSize:13, lineHeight:1.4 }}>⚠️</span>
              <p style={{ margin:0, fontSize:11.5, color:"#92400e", lineHeight:1.55 }}>
                <strong>Estas reseñas son de ejemplo.</strong> No se pueden editar y no se publican —
                están para que veas cómo queda el bloque. En tu tienda se reemplazan solas por las
                reseñas reales de tus clientes.{" "}
                {resenas.totalReal === 0
                  ? "Todavía no tenés ninguna: hasta que llegue la primera, el bloque se muestra vacío invitando a dejarla."
                  : `Hoy tenés ${resenas.totalReal} ${resenas.totalReal === 1 ? "reseña" : "reseñas"}, y ${resenas.enPortadaReal} ${resenas.enPortadaReal === 1 ? "aparece" : "aparecen"} acá: las de 4★ y 5★ con comentario, más las de tu tienda que hayas aprobado.`}
                {" "}El título y el fondo sí son tuyos: esos se editan y se guardan.
              </p>
            </div>
          )}

          {/* Las dos pestañas: opinar de un producto y opinar de la tienda son
              cosas distintas. Mezcladas, quien quiere saber "si son serios" tiene
              que leer comentarios sobre talles. */}
          <div style={{ display:"flex", gap:28, marginTop:22, borderBottom:`2px solid ${testimonialsCardBorder}` }}>
            {([
              { key:"producto" as const, label:"Los productos", n: resenas.deProducto.length },
              { key:"tienda"   as const, label:"La tienda",     n: resenas.deTienda.length },
            ]).map(t => (
              <button key={t.key} type="button" onClick={() => resenas.setTab(t.key)}
                style={{ background:"none", border:"none", cursor:"pointer", padding:"0 0 12px", marginBottom:-2,
                         fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase",
                         color: resenas.tab === t.key ? testimonialsText : testimonialsMid,
                         borderBottom:`3px solid ${resenas.tab === t.key ? ACC : "transparent"}` }}>
                {t.label} <span style={{ opacity:0.6, fontWeight:700 }}>({t.n})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Vacío: en vez de esconder el bloque, se invita a escribir. Escondido,
            una tienda nueva no tendría nunca cómo recibir la primera. */}
        {resenas.lista.length === 0 && (
          <div style={{ padding: isMobile ? "0 20px 8px" : "0 40px 8px", position:"relative", zIndex:1 }}>
            <p style={{ color:testimonialsMid, fontSize:13, lineHeight:1.7, margin:0, maxWidth:520 }}>
              {resenas.tab === "tienda"
                ? resenas.sinNada
                  ? "Todavía nadie dejó su opinión. Si compraste acá, contanos cómo te fue — sos el primero."
                  : "Todavía nadie opinó sobre la tienda en general. Si compraste, contanos cómo te fue."
                : "Todavía nadie opinó sobre un producto. Las opiniones se dejan desde la ficha de cada uno."}
            </p>
          </div>
        )}

        {/* Dos columnas y no cuatro. Con la foto al costado, cuatro tarjetas por
            fila dejan ~220px para el texto y la foto no puede crecer: es el ancho
            lo que la agranda. Con dos, la foto ocupa toda la altura de la tarjeta
            y la prenda se ve de verdad. */}
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap:12, padding: isMobile ? "0 20px" : "0 40px", position:"relative", zIndex:1 }}>
          {resenas.lista.map(r => {
            // A dónde lleva esta reseña. Abre la vista rápida de ESE producto,
            // que ya trae todas sus reseñas enteras: Urban Pulse usa el modal y
            // no la página de detalle, así que mandar a /producto/[id] le
            // cambiaría el recorrido. Si el producto no está entre los cargados
            // —o estamos en el editor— no se ofrece nada, en vez de abrir un
            // modal vacío.
            const productoDeLaResena = r.product?.id ? products.find(x => x.id === r.product!.id) : undefined;
            const irAlProducto = productoDeLaResena && !isPreview ? () => openModal(productoDeLaResena) : null;
            // La tarjeta ENTERA lleva a la ficha cuando la reseña habla de un
            // producto. Antes llevaban solo la foto y el nombre, que son blancos
            // chicos —en celular la foto son 104px— y no se adivina que el resto
            // no responde. Una reseña de TIENDA no apunta a nada, así que ahí la
            // tarjeta no es clickeable y no finge serlo.
            return (
            <div key={r.id}
              onClick={irAlProducto ?? undefined}
              title={irAlProducto ? `Ver ${r.product?.name ?? "el producto"}` : undefined}
              style={{ background:testimonialsCardBg, border:`1px solid ${testimonialsCardBorder}`, display:"flex", alignItems:"stretch", position:"relative", overflow:"hidden", cursor: irAlProducto ? "pointer" : "default", transition:"border-color 0.2s" }}
              onMouseEnter={e => { if (irAlProducto) e.currentTarget.style.borderColor = accentSobre(testimonialsBgUp, testimonialsText); }}
              onMouseLeave={e => { if (irAlProducto) e.currentTarget.style.borderColor = testimonialsCardBorder; }}>
              {isOwner && !isPreview && (
                // `stopPropagation`: sin esto, borrar la reseña abría además la
                // ficha del producto, porque el clic seguía subiendo a la tarjeta.
                <button onClick={e => { e.stopPropagation(); resenas.borrar(r.id); }} title="Eliminar reseña"
                  style={{ position:"absolute", top:8, right:8, zIndex:2, background:"none", border:"none", color:testimonialsMid, cursor:"pointer", fontSize:16, lineHeight:1, padding:4 }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                  onMouseLeave={e => (e.currentTarget.style.color = testimonialsMid)}>×</button>
              )}

              {/* La foto, a la izquierda y a toda la altura. Una reseña de TIENDA
                  no tiene producto, así que en su lugar va la inicial en un
                  cuadrado — la misma idea que usa el modal de producto. Sin esto
                  la pestaña "La tienda" quedaba con tarjetas de otra forma. */}
              {/* El clic lo maneja la tarjeta. Acá quedan solo el teclado —para
                  quien no usa mouse, este es el punto de entrada— y el zoom de la
                  foto, que es la señal de que algo pasa al pasar por encima. */}
              <div
                role={irAlProducto ? "button" : undefined}
                tabIndex={irAlProducto ? 0 : undefined}
                onKeyDown={irAlProducto ? (e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); irAlProducto(); } }) : undefined}
                aria-label={irAlProducto ? `Ver ${r.product?.name ?? "el producto"}` : undefined}
                className={irAlProducto ? "up-zoom" : undefined}
                style={{ position:"relative", flexShrink:0, width: isMobile ? 104 : 132, background: r.product?.image ? DARK : accentSobre(testimonialsBgUp, testimonialsText), borderRight:`1px solid ${testimonialsCardBorder}`, cursor: irAlProducto ? "pointer" : "default", overflow:"hidden" }}>
                {r.product?.image ? (
                  <FadeImage src={r.product.image} alt={r.product?.name ?? ""} fill sizes="(max-width: 768px) 104px, 132px" className={irAlProducto ? "up-zoom-img" : undefined} style={{ objectFit:"cover" }} />
                ) : (
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize: isMobile ? 34 : 42, fontWeight:900, color: textoSobre(accentSobre(testimonialsBgUp, testimonialsText)), lineHeight:1 }}>
                    {r.reviewer.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div style={{ flex:1, minWidth:0, padding: isMobile ? "20px 18px" : "24px 26px", display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ display:"flex", gap:3 }}>
                  {Array.from({length:5}).map((_, si) => (
                    // El relleno era `ACC` crudo: con un acento oscuro sobre una
                    // sección oscura las estrellas quedaban negras sobre negro.
                    // Es el mismo descuido que barrió UP-3 y este se había
                    // escapado. `accentSobre` devuelve el acento cuando se
                    // distingue del fondo, y un color legible cuando no.
                    <svg key={si} width={15} height={15} viewBox="0 0 24 24" fill={si < r.rating ? accentSobre(testimonialsBgUp, testimonialsText) : testimonialsMid} stroke="none" style={{ opacity: si < r.rating ? 1 : 0.35 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  ))}
                </div>
                {r.comment && (
                  <ResenaComentario
                    texto={r.comment}
                    acento={accentSobre(testimonialsBgUp, testimonialsText)}
                    estiloTexto={{ color:testimonialsMid, fontSize:13, lineHeight:1.7 }}
                    textoBoton={{ desplegar:"Leer todo", irA:"Ver reseña →" }}
                    onVerMas={irAlProducto}
                  />
                )}
                <div style={{ borderTop:`1px solid ${testimonialsCardBorder}`, paddingTop:12, marginTop:"auto", minWidth:0 }}>
                  <p style={{ color:accentSobre(testimonialsBgUp, testimonialsText), fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", margin:0 }}>{r.reviewer}</p>
                  {/* Texto plano: el nombre ya no necesita ser su propio botón
                      ahora que toda la tarjeta lleva a la ficha. Como botón
                      adentro de la tarjeta clickeable, el clic disparaba dos veces. */}
                  {r.product?.name && (
                    <p style={{ color:testimonialsMid, fontSize:11, margin:"3px 0 0", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as const, overflow:"hidden" }}>{r.product.name}</p>
                  )}
                  {/* "Compra verificada" y "Verificada por la tienda" NO son lo
                      mismo: la primera la cruzó el sistema contra un pedido
                      entregado, la segunda la marcó el dueño a mano. */}
                  {/* El verde era fijo (`#22c55e`) y el fondo de esta sección lo
                      elige la dueña: sobre un fondo verdoso el sello quedaba casi
                      invisible. `getReadableAccentText` lo conserva mientras se
                      despegue del fondo y cae al color de texto de la sección
                      cuando no — el sello sigue distinguiéndose por el ✓ y por la
                      negrita, que es lo que de verdad lo señala. */}
                  {r.verified && (
                    <p style={{ fontSize:9.5, fontWeight:900, letterSpacing:0.5, margin:"5px 0 0", color: r.verifiedBy === "auto" ? getReadableAccentText("#22c55e", testimonialsBgUp, testimonialsText) : testimonialsMid }}>
                      {r.verifiedBy === "auto" ? "✓ Compra verificada" : "✓ Verificada por la tienda"}
                    </p>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>

        {/* El formulario vive en un modal: acá solo el disparador, para que las
            reseñas no queden empujadas por un formulario largo. Una reseña de
            PRODUCTO no va por acá —necesita saber de qué producto es— así que se
            deja desde la ficha; ésta es de la tienda y no apunta a nada. */}
        {resenas.tab === "tienda" && (
          <div style={{ padding: isMobile ? "26px 20px 0" : "34px 40px 0", textAlign:"center", position:"relative", zIndex:1 }}>
            <button type="button" onClick={resenas.abrirModal}
              style={{ background:"none", border:`2px solid ${testimonialsText}`, color:testimonialsText, padding:"14px 42px", fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", transition:"all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = testimonialsText; e.currentTarget.style.color = textoSobre(testimonialsText); }}
              onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = testimonialsText; }}>
              Dejá tu opinión
            </button>
          </div>
        )}
      </section>
      </SectionBlock>

      {/* OFERTAS */}
      <SectionBlock id="up-ofertas" label="Ofertas" isPreview={isPreview} defaultOrder={UP_SECTION_IDS}>
        {(() => {
          // "Oferta" para el comprador es cualquier cosa que le salga más barata hoy,
          // no solo el precio anterior del producto: si una promoción de tienda le baja
          // el precio, eso también es una oferta y tiene que aparecer acá (UP-2).
          // Ojo con las promos que NO tocan el precio (3×2, envío gratis): esas se
          // anuncian con su tag pero no entran, porque el precio que se mostraría al
          // lado sería el de lista y parecería un error de la página.
          const allOfertas = products.filter(p =>
            (p.comparePrice && p.comparePrice > p.price) || resolveProductPromo(p, promotions).hasPriceDrop
          );
          if (allOfertas.length === 0 && !isPreview) return null;
          const displayList = (allOfertas.length > 0 ? allOfertas : products).slice(0, 8);
          const hasMore = allOfertas.length > 8;
          return (
            <section data-reveal style={{ position:"relative", background:ofertasBgUp, padding: isMobile ? "48px 16px" : "80px 40px", borderTop:`3px solid ${DARK}` }}>
              <EditableSectionBg field="bgOfertas" label="Fondo ofertas" />
              <div style={{ maxWidth:1200, margin:"0 auto" }}>
                <div style={{ marginBottom:32 }}>
                  <p style={{ fontSize:9, letterSpacing:5, color:accentSobre(ofertasBgUp, ofertasTextUp), textTransform:"uppercase", fontWeight:900, margin:"0 0 8px" }}><EditableZone field="ofertasKicker" label="Texto sobre Ofertas">Aprovechá</EditableZone></p>
                  <h2 style={{ fontSize:"clamp(32px,4vw,44px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-1px", margin:0, color:ofertasTextUp }}><EditableZone field="ofertasTitle" label="Título Ofertas">Ofertas</EditableZone></h2>
                </div>
                <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap:2 }}>
                  {displayList.map(p => {
                    // El "-30%" tiene que coincidir con el precio: si hay promo de
                    // tienda manda ella, si no sale del comparePrice.
                    const promoP = resolveProductPromo(p, promotions);
                    const pct = promoP.hasPriceDrop
                      ? promoP.pctOff
                      : (p.comparePrice && p.comparePrice > p.price ? Math.round((1 - p.price / p.comparePrice) * 100) : null);
                    return (
                      <div key={p.id} onClick={() => openModal(p)} className="up-zoom" style={{ cursor:"pointer" }}>
                        <div style={{ position:"relative", width:"100%", aspectRatio:"3/4", background:DARK, overflow:"hidden" }}>
                          {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="up-zoom-img" style={{ objectFit:"cover" }} />}
                          {!!pct && <span style={{ position:"absolute", top:0, left:0, background:ACC, color:accentText, fontSize:10, fontWeight:900, padding:"5px 10px", letterSpacing:1 }}>-{pct}%</span>}
                        </div>
                        <div style={{ padding:"10px 0 0" }}>
                          <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:ofertasTextUp, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical" as const }}>{p.name}</p>
                          <PromoPrice product={p} promotions={promotions} fmt={fmt} accent={accentSobre(ofertasBgUp, ofertasTextUp)} sobre={ofertasTextUp}
                            priceSize={13} compareSize={11} weight={900} ocultarPrecios={ocultarPrecios}
                            consultaLabel="Consultá" gap={8} align="center" />
                          {/* En "chip": la esquina de la foto ya la ocupa el badge del %.
                              Y no dicen lo mismo — el % dice cuánto baja el precio de
                              ESTE producto, el chip dice cuál promo se lo baja. */}
                          {avisoPromo(p, "chip")}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {hasMore && (
                  <div style={{ textAlign:"center", marginTop:36 }}>
                    <button onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=urban-pulse${isPreview ? "&from=editor" : ""}&oferta=true`; }}
                      style={{ background:"none", border:`2px solid ${ofertasTextUp}`, color:ofertasTextUp, padding:"12px 32px", fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor:"pointer" }}><EditableZone field="ofertasCta" label="Botón ver todas las ofertas">Ver todas las ofertas</EditableZone></button>
                  </div>
                )}
              </div>
            </section>
          );
        })()}
      </SectionBlock>

      {/* LO MÁS VISTO */}
      <SectionBlock id="up-masvisto" label="Lo más visto" isPreview={isPreview} defaultOrder={UP_SECTION_IDS}>
        {(() => {
          // Vistas reales de compradores. En el editor se rellena para poder
          // configurar la sección; en la tienda real, si no hay datos no se muestra.
          const { lista: displayList, conVistas, esRelleno } = masVistos(products, { relleno: isPreview });
          const hasMore = conVistas > displayList.length;
          if (displayList.length === 0) return null;
          return (
            <section data-reveal style={{ position:"relative", background:masVistoBgUp, padding: isMobile ? "48px 16px" : "80px 40px", borderTop:`3px solid ${ACC}` }}>
              <EditableSectionBg field="bgMasVisto" label="Fondo lo más visto" />
              <div style={{ maxWidth:1200, margin:"0 auto" }}>
                <div style={{ marginBottom:32 }}>
                  <p style={{ fontSize:9, letterSpacing:5, color:accentSobre(masVistoBgUp, masVistoTextUp), textTransform:"uppercase", fontWeight:900, margin:"0 0 8px" }}><EditableZone field="masVistoKicker" label="Texto sobre Lo más visto">Tendencia</EditableZone></p>
                  <h2 style={{ fontSize:"clamp(32px,4vw,44px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-1px", margin:0, color:masVistoTextUp }}><EditableZone field="masVistoTitle" label="Título Lo más visto">Lo más visto</EditableZone></h2>
                </div>
                {/* Solo el dueño, y solo en el editor: la sección se está viendo con
                    relleno porque la tienda todavía no juntó vistas. */}
                {esRelleno && (
                  <p style={{ margin:"-24px 0 24px", fontSize:12, color:"#b45309", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:6, padding:"8px 12px" }}>
                    Todavía no hay suficientes vistas de compradores, así que te mostramos productos de ejemplo
                    para que puedas darle formato. <b>En tu tienda esta sección aparece sola</b> cuando al menos
                    {" "}{MIN_MAS_VISTOS} productos hayan sido vistos.
                  </p>
                )}
                <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap:2 }}>
                  {displayList.map((p) => (
                    <div key={p.id} onClick={() => openModal(p)} className="up-zoom" style={{ cursor:"pointer" }}>
                      {/* Sin el "#1, #2…" de antes: numerar sugiere un ranking firme
                          donde la diferencia real suele ser de una sola visita. */}
                      <div style={{ position:"relative", width:"100%", aspectRatio:"3/4", background:"#1a1a1a", overflow:"hidden" }}>
                        {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="up-zoom-img" style={{ objectFit:"cover" }} />}
                        {avisoPromo(p)}
                      </div>
                      <div style={{ padding:"10px 0 0" }}>
                        <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:masVistoTextUp, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical" as const }}>{p.name}</p>
                        <PromoPrice product={p} promotions={promotions} fmt={fmt} accent={accentSobre(masVistoBgUp, masVistoTextUp)} sobre={masVistoTextUp}
                          priceSize={13} compareSize={11} weight={900} ocultarPrecios={ocultarPrecios}
                          consultaLabel="Consultá" />
                      </div>
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <div style={{ textAlign:"center", marginTop:36 }}>
                    <button onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=urban-pulse${isPreview ? "&from=editor" : ""}&destacado=true`; }}
                      style={{ background:"none", border:`2px solid ${masVistoTextUp}`, color:masVistoTextUp, padding:"12px 32px", fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor:"pointer" }}><EditableZone field="masVistoCta" label="Botón ver más">Ver más</EditableZone></button>
                  </div>
                )}
              </div>
            </section>
          );
        })()}
      </SectionBlock>

      <SectionBlock id="up-nosotros" label="Nuestra historia" isPreview={isPreview} defaultOrder={UP_SECTION_IDS}>
      {/* NOSOTROS */}
      <section id="nosotros" data-reveal style={{ background:nosotrosBgUp, position:"relative" }}>
        <EditableSectionBg field="bgNosotros" label="Fondo nosotros" />
        <div style={{ padding: isMobile ? "60px 20px" : "100px 40px", maxWidth:1200, margin:"0 auto", display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 40 : 80, alignItems:"center", position:"relative", zIndex:1 }}>
        <div>
          <span style={{ color:nosotrosMidUp, fontSize:10, letterSpacing:6, fontWeight:800, textTransform:"uppercase", display:"block", marginBottom:16 }}>
            <EditableZone field="aboutKicker" label="Kicker 'Nosotros'">▶ Nuestra Historia</EditableZone>
          </span>
          <h2 style={{ fontSize:"clamp(36px,4vw,50px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-1px", lineHeight:1.05, margin:"0 0 28px", color:nosotrosTextUp }}>
            <EditableZone field="aboutHeading" label="Título 'Nosotros'">Hacemos ropa para los que no paran.</EditableZone>
          </h2>
          <p style={{ fontSize:15, color:nosotrosMidUp, lineHeight:1.8, marginBottom:16 }}>
            <EditableZone field="aboutParagraph1" label="Párrafo 1 'Nosotros'">Nacimos con una sola misión: crear ropa que no te frene. Cada prenda está diseñada con tecnología de alta performance para acompañarte desde el primer kilómetro hasta el último rep.</EditableZone>
          </p>
          <p style={{ fontSize:15, color:nosotrosMidUp, lineHeight:1.8, marginBottom:40 }}>
            <EditableZone field="aboutParagraph2" label="Párrafo 2 'Nosotros'">Sin compromisos. Sin excusas. Solo movimiento.</EditableZone>
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:24 }}>
            {([["aboutStat1","aboutStatLabel1","+5K","Clientes"],["aboutStat2","aboutStatLabel2","98%","Satisfacción"],["aboutStat3","aboutStatLabel3","48hs","Envío promedio"]] as const).map(([fv,fl,n,l]) => (
              <div key={l}>
                <p style={{ fontSize:40, fontWeight:900, margin:"0 0 4px" }}><EditableZone field={fv} label={`Stat: ${n}`}>{n}</EditableZone></p>
                <p style={{ fontSize:10, color:MID, fontWeight:800, letterSpacing:2, textTransform:"uppercase", margin:0 }}><EditableZone field={fl} label={`Etiqueta stat: ${l}`}>{l}</EditableZone></p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position:"relative", width:"100%", aspectRatio:"4/5", overflow:"hidden" }}>
          <FadeImage src={storeConfig?.imageOverrides?.["nosotrosImage"]?.url ?? "https://picsum.photos/seed/up_about/600/700"} alt="Nosotros" fill sizes="(max-width: 768px) 100vw, 50vw" style={{ objectFit:"cover", objectPosition:`${storeConfig?.imageOverrides?.["nosotrosImage"]?.posX ?? 50}% ${storeConfig?.imageOverrides?.["nosotrosImage"]?.posY ?? 50}%` }} />
          {(() => { const ov = storeConfig?.imageOverrides?.["nosotrosImage"]; if (!ov?.overlayType || ov.overlayType === "none") return null; return <div style={{ position:"absolute", inset:0, pointerEvents:"none", background: ov.overlayType === "light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.45})` }} />; })()}
          <BgDragHandle imgKey="nosotrosImage" />
          <EditableImageButton field="nosotrosImage" label="Imagen nosotros" />
          {/* El texto de adentro no declaraba color: heredaba el del padre y quedaba
              a merced de dónde estuviera parado el bloque. Sobre el acento manda accentText. */}
          <div style={{ position:"absolute", bottom:-16, left:-16, background:ACC, color:accentText, padding:"20px 28px" }}>
            <p style={{ margin:0, fontSize:12, fontWeight:900, textTransform:"uppercase", letterSpacing:2 }}><EditableZone field="aboutStat4" label="Stat: Desde 2021">Desde 2021</EditableZone></p>
            <p style={{ margin:"4px 0 0", fontSize:11, opacity:0.6 }}><EditableZone field="aboutStatLabel4" label="Etiqueta stat: Vistiendo">Vistiendo a Argentina</EditableZone></p>
          </div>
        </div>
        </div>
      </section>
      </SectionBlock>

      <SectionBlock id="up-contacto" label="Contacto" isPreview={isPreview} defaultOrder={UP_SECTION_IDS}>
      {/* CONTACT */}
      <section id="contacto" data-reveal style={{ position:"relative", ...(contactBgImg?.url ? { backgroundImage:`url(${contactBgImg.url})`, backgroundSize:"cover", backgroundPosition:`${contactBgImg.posX ?? 50}% ${contactBgImg.posY ?? 50}%` } : { background:contactUpBg }) }}>
        <BgDragHandle imgKey="sectionbg_bgContacto" />
        <EditableSectionBg field="bgContacto" label="Fondo contacto" />
        {contactBgImg?.url && contactBgImg.overlayType !== "none" && (
          <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none", background: contactBgImg.overlayType === "light" ? `rgba(255,255,255,${contactBgImg.overlayOpacity ?? 0.5})` : `rgba(0,0,0,${contactBgImg.overlayOpacity ?? 0.45})` }} />
        )}
        <div style={{ position:"relative", zIndex:1, padding:"80px 40px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 40 : 80 }}>
          <div>
            <span style={{ color:accentSobre(contactUpBg, contactUpText), fontSize:10, letterSpacing:6, fontWeight:800, textTransform:"uppercase", display:"block", marginBottom:16 }}><EditableZone field="contactKicker" label="Etiqueta contacto">▶ Contacto</EditableZone></span>
            <h2 style={{ color:contactUpText, fontSize:"clamp(36px,4vw,48px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-1px", lineHeight:1, margin:"0 0 28px" }}>
              <EditableZone field="contactHeading" label="Título contacto">Hablemos.</EditableZone>
            </h2>
            <p style={{ color:contactUpText, opacity:0.45, fontSize:14, lineHeight:1.8, marginBottom:40 }}>
              <EditableZone field="contactSubtext" label="Subtítulo contacto">Consultas sobre talles, materiales o envíos. Respondemos en menos de 24hs.</EditableZone>
            </p>
            {[
              ["Dirección","Buenos Aires, Argentina","contactDireccion"],
              ["Email","hola@urbanpulse.com","contactEmail"],
              ["WhatsApp","+54 9 11 0000-0000","contactWhatsApp"],
            ].map(([l,v,f]) => (
              <div key={l} style={{ marginBottom:20 }}>
                <p style={{ margin:0, color:contactUpText, opacity:0.3, fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase" }}>{l}</p>
                <p style={{ margin:"4px 0 0", color:contactUpText, fontSize:14 }}><EditableZone field={f} label={l}>{v}</EditableZone></p>
              </div>
            ))}
          </div>
          <div>
            <ContactForm
              storeId={storeConfig?.storeId} isPreview={isPreview} prefillMessage={inquiryMessage}
              accent={ACC} textColor={contactUpText} mutedColor={contactInputBorder}
              radius={0} buttonRadius={0}
              theme={{
                twoColTop: false,
                inputBg: contactInputBg,
                inputBorderColor: contactInputBorder,
                inputPadding: "16px 20px",
                fontSize: 14,
                gap: 14,
                placeholders: { nombre: "Tu nombre *", email: "Tu email *", mensaje: "Tu mensaje *" },
                buttonLabel: "Enviar Mensaje →",
                buttonStyle: { background:ACC, color:accentText, padding:"18px", fontSize:11, fontWeight:900, letterSpacing:4, textTransform:"uppercase" },
              }}
              renderSent={reset => (
                <div style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", border:`2px solid ${ACC}`, padding:40 }}>
                  <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={accentSobre(contactUpBg, contactUpText)} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom:16 }}><polyline points="20 6 9 17 4 12"/></svg>
                  <p style={{ color:contactUpText, fontSize:20, fontWeight:900, textTransform:"uppercase", margin:"0 0 8px" }}>¡Mensaje enviado!</p>
                  <p style={{ color:contactUpText, opacity:0.45, fontSize:13, margin:"0 0 16px" }}>Te respondemos pronto.</p>
                  <button onClick={reset} style={{ background:"transparent", color:accentSobre(contactUpBg, contactUpText), border:`1px solid ${ACC}`, padding:"9px 24px", fontSize:11, letterSpacing:2, cursor:"pointer", textTransform:"uppercase" }}>Enviar otro</button>
                </div>
              )}
            />
          </div>
        </div>
        </div>
      </section>
      </SectionBlock>
      </div>

      {/* FOOTER */}
      <footer style={{ position:"relative", borderTop:`3px solid ${ACC}`, ...(footerBgImg?.url ? { backgroundImage:`url(${footerBgImg.url})`, backgroundSize:"cover", backgroundPosition:`${footerBgImg.posX ?? 50}% ${footerBgImg.posY ?? 50}%` } : { background:footerUpBg }) }}>
        <BgDragHandle imgKey="sectionbg_bgFooter" />
        <EditableSectionBg field="bgFooter" label="Fondo footer" />
        {footerBgImg?.url && footerBgImg.overlayType !== "none" && (
          <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none", background: footerBgImg.overlayType === "light" ? `rgba(255,255,255,${footerBgImg.overlayOpacity ?? 0.5})` : `rgba(0,0,0,${footerBgImg.overlayOpacity ?? 0.45})` }} />
        )}
        <div style={{ padding: isMobile ? "40px 20px 20px" : "60px 40px 28px", position:"relative", zIndex:1 }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr 1fr", gap: isMobile ? 28 : 40, marginBottom:40 }}>
            <div>
              <div style={{ fontWeight:900, fontSize:24, letterSpacing:4, textTransform:"uppercase", color:footerUpText, marginBottom:16 }}>
                <EditableZone field="storeName" label="Nombre de la tienda">
                  {storeConfig?.storeName ?? <span>URBAN<span style={{ color:accentSobre(footerUpBg, footerUpText) }}>PULSE</span></span>}
                </EditableZone>
              </div>
              <p style={{ color:footerUpMid, fontSize:13, lineHeight:1.8, maxWidth:260 }}>
                <EditableZone field="footerDescription" label="Descripción footer">Ropa deportiva de alta performance. Para quienes van más rápido.</EditableZone>
              </p>
              <div style={{ display:"flex", gap:10, marginTop:18 }}>
                {([["IG","instagram"],["FB","facebook"],["TK","tiktok"],["YT","youtube"]] as const).map(([label, key]) => {
                  const url = storeConfig?.socialLinks?.[key];
                  if (!isPreview && !url) return null;
                  return (
                    <button key={label}
                      onClick={() => url && window.open(url, "_blank")}
                      style={{ background:"none", border:`2px solid ${footerUpMid}`, color:footerUpText, width:32, height:32, fontSize:10, fontWeight:900, cursor: url ? "pointer" : "default", letterSpacing:1, transition:"transform 0.1s", opacity: url ? 1 : 0.35 }}
                      onMouseEnter={e => { if (url) { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = `2px 2px 0 ${ACC}`; e.currentTarget.style.borderColor = ACC; } }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "translate(0,0)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = footerUpMid; }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            {([
              { titleField:"footerCol1Title", titleDefault:"Tienda",   links:[["footerCol1Link1","Mujer"],["footerCol1Link2","Hombre"],["footerCol1Link3","Accesorios"],["footerCol1Link4","Novedades"],["footerCol1Link5","Sale"]] },
              { titleField:"footerCol2Title", titleDefault:"Ayuda",    links:[["footerCol2Link1","Guía de talles"],["footerCol2Link2","Envíos"],["footerCol2Link3","Devoluciones"],["footerCol2Link4","FAQ"],["footerCol2Link5","Contacto"]] },
              { titleField:"footerCol3Title", titleDefault:"Empresa",  links:[["footerCol3Link1","Nosotros"],["footerCol3Link2","Prensa"],["footerCol3Link3","Empleo"],["footerCol3Link4","Sustentabilidad"]] },
            ] as const).map(col => (
              <div key={col.titleField}>
                <p style={{ color:footerUpText, fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", margin:"0 0 18px" }}>
                  <EditableZone field={col.titleField} label={`Footer — columna título`}>{col.titleDefault}</EditableZone>
                </p>
                {col.links.map(([f, def]) => (
                  <div key={f} style={{ display:"block", color:footerUpMid, fontSize:13, marginBottom:10 }}>
                    <EditableZone field={f} label={`Footer link`}>{def}</EditableZone>
                  </div>
                ))}
              </div>
            ))}
          </div>
          {isMobile ? (
            /* ── MOBILE: 2 filas centradas ── */
            <div style={{ borderTop:`1px solid ${footerUpMid}`, paddingTop:20, paddingBottom:80, display:"flex", flexDirection:"column", gap:10, alignItems:"center" }}>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"4px 14px", justifyContent:"center" }}>
                {[
                  { label: "Devoluciones", tipo: "devoluciones" },
                  { label: "Envíos",       tipo: "envios" },
                  { label: "Términos",     tipo: "terminos" },
                ].map(({ label, tipo }) => (
                  editMode ? (
                    <button key={tipo} type="button" onClick={() => window.open("/dashboard/pagos", "_blank")}
                      title="Editar en Dashboard → Pagos"
                      style={{ color:footerUpMid, fontSize:11, opacity:0.6, letterSpacing:1, textTransform:"uppercase", fontWeight:600, background:"none", border:"none", cursor:"pointer", padding:0, display:"inline-flex", alignItems:"center", gap:4 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.6"; }}>
                      {label}
                      <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  ) : (
                    <a key={tipo} href={`/tienda/${storeConfig?.slug ?? ""}/politicas?tipo=${tipo}`}
                      style={{ color:footerUpMid, fontSize:11, textDecoration:"none", opacity:0.6, letterSpacing:1, textTransform:"uppercase", fontWeight:600 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.6"; }}>
                      {label}
                    </a>
                  )
                ))}
                {!editMode && (
                  <button onClick={() => setShowReport(true)}
                    style={{ fontSize:11, color:footerUpMid, opacity:0.5, background:"none", border:"none", cursor:"pointer", padding:0, letterSpacing:1, textTransform:"uppercase", fontWeight:600 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.5"; }}>
                    Reportar tienda
                  </button>
                )}
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"2px 12px", justifyContent:"center", textAlign:"center" }}>
                <p style={{ color:footerUpMid, fontSize:11, margin:0, opacity:0.7 }}><EditableZone field="footerCopyright" label="Copyright">© 2025 UrbanPulse. Todos los derechos reservados.</EditableZone></p>
                <p style={{ color:footerUpMid, fontSize:11, margin:0, opacity:0.7 }}><EditableZone field="footerMadeIn" label="Hecho en">Hecho en Argentina</EditableZone></p>
              </div>
            </div>
          ) : (
            /* ── DESKTOP: fila izq/der original ── */
            <div style={{ borderTop:`1px solid ${footerUpMid}`, paddingTop:22, paddingLeft: hasWA ? 110 : 0, paddingRight:110, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"8px 24px" }}>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"0 16px" }}>
                {[
                  { label: "Devoluciones", tipo: "devoluciones" },
                  { label: "Envíos",       tipo: "envios" },
                  { label: "Términos",     tipo: "terminos" },
                ].map(({ label, tipo }) => (
                  editMode ? (
                    <button key={tipo} type="button" onClick={() => window.open("/dashboard/pagos", "_blank")}
                      title="Editar en Dashboard → Pagos"
                      style={{ color:footerUpMid, fontSize:11, opacity:0.6, letterSpacing:1, textTransform:"uppercase", fontWeight:600, background:"none", border:"none", cursor:"pointer", padding:0, display:"inline-flex", alignItems:"center", gap:4 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.6"; }}>
                      {label}
                      <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  ) : (
                    <a key={tipo} href={`/tienda/${storeConfig?.slug ?? ""}/politicas?tipo=${tipo}`}
                      style={{ color:footerUpMid, fontSize:11, textDecoration:"none", opacity:0.6, letterSpacing:1, textTransform:"uppercase", fontWeight:600 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.6"; }}>
                      {label}
                    </a>
                  )
                ))}
              </div>
              <div style={{ display:"flex", gap:24, alignItems:"center", flexWrap:"wrap" }}>
                <p style={{ color:footerUpMid, fontSize:12, margin:0 }}><EditableZone field="footerCopyright" label="Copyright">© 2025 UrbanPulse. Todos los derechos reservados.</EditableZone></p>
                <p style={{ color:footerUpMid, fontSize:12, margin:0 }}><EditableZone field="footerMadeIn" label="Hecho en">Hecho en Argentina</EditableZone></p>
                {!editMode && (
                  <button onClick={() => setShowReport(true)}
                    style={{ fontSize:12, color:footerUpMid, opacity:0.5, background:"none", border:"none", cursor:"pointer", padding:0 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.5"; }}>
                    Reportar tienda
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        </div>
      </footer>

      {showReport && (
        <ReportStoreModal slug={storeConfig?.slug ?? ""} onClose={() => setShowReport(false)} />
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

      {/* WHATSAPP */}
      {!cart.cartOpen && !cart.checkoutOpen && (!storeConfig || storeConfig.whatsapp.enabled) && (
        <a href={`https://wa.me/${(storeConfig?.whatsapp.number ?? "5491100000000").replace(/\D/g,"")}${storeConfig?.whatsapp?.message ? "?text=" + encodeURIComponent(storeConfig.whatsapp.message) : ""}`} target="_blank" rel="noopener noreferrer"
          onClick={e => { if (editMode) e.preventDefault(); }}
          className="up-wa-fab"
          style={{ position:"fixed", bottom:24, right:24, width:56, height:56, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, textDecoration:"none", cursor: editMode ? "default" : "pointer" }}>
          <svg viewBox="0 0 24 24" width={28} height={28} fill={WHITE}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </a>
      )}

      {/* SEARCH OVERLAY */}
      {searchOpen && (
        <div className="up-fade" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.96)", zIndex:1000, padding: isMobile ? "72px 16px 32px" : "80px 40px 40px", overflowY:"auto" }}>
          <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} aria-label="Cerrar búsqueda" style={{ position:"absolute", top:24, right:28, background:"none", border:"none", color:WHITE, fontSize:28, cursor:"pointer" }}>✕</button>
          <div style={{ maxWidth:680, margin:"0 auto" }}>
            <p style={{ color:"rgba(255,255,255,0.4)", fontSize:10, letterSpacing:6, fontWeight:800, textTransform:"uppercase", marginBottom:20 }}>Buscar</p>
            <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar productos..."
              style={{ width:"100%", background:"none", border:"none", borderBottom:`3px solid ${ACC}`, color:WHITE, fontSize:32, fontWeight:900, padding:"12px 0", outline:"none", fontFamily:"inherit", letterSpacing:"-0.5px" }} />
            <div style={{ marginTop:40, display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
              {(searchQuery.trim() ? searchResults : products.slice(0,4)).map(p => (
                <div key={p.id} onClick={() => { openModal(p); setSearchQuery(""); }}
                  style={{ display:"flex", gap:14, cursor:"pointer", padding:14, background:"rgba(255,255,255,0.05)" }}>
                  {p.images[0] ? <FadeImage src={p.images[0]} alt={p.name} width={56} height={72} style={{ objectFit:"cover", flexShrink:0 }} /> : <div style={{ width:56, height:72, flexShrink:0, background:BG }} />}
                  <div>
                    <p style={{ color:"rgba(255,255,255,0.4)", fontSize:10, fontWeight:800, letterSpacing:2, textTransform:"uppercase", margin:0 }}>{p.category}</p>
                    <p style={{ color:WHITE, fontSize:13, fontWeight:800, margin:"5px 0 4px" }}>{p.name}</p>
                    <PromoPrice product={p} promotions={promotions} fmt={fmt} accent={accSobreDark} sobre={WHITE}
                      priceSize={13} weight={900} ocultarPrecios={ocultarPrecios} />
                    {avisoPromo(p, "chip")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAVORITES DRAWER */}
      {favoritesOpen && (
        <div className="up-fade" style={{ position:"fixed", inset:0, zIndex: isPreview ? 20000 : 500 }}>
          <div onClick={() => setFavoritesOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)" }} />
          <div style={{ position:"absolute", right:0, top:0, bottom:0, width:400, maxWidth:"100vw", background:WHITE, display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"20px 24px", borderBottom:`3px solid ${DARK}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <h3 style={{ margin:0, fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase" }}>Favoritos ({favorites.length})</h3>
              <button onClick={() => setFavoritesOpen(false)} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:24 }}>
              {favoriteProducts.length === 0
                ? <p style={{ color:MID, textAlign:"center", marginTop:60, fontSize:14 }}>No tenés favoritos aún.</p>
                : favoriteProducts.map(p => (
                  <div key={p.id} style={{ display:"flex", gap:14, marginBottom:20, paddingBottom:20, borderBottom:`1px solid ${BG}` }}>
                    {p.images[0] ? <FadeImage src={p.images[0]} alt={p.name} width={68} height={86} style={{ objectFit:"cover", flexShrink:0 }} /> : <div style={{ width:68, height:86, flexShrink:0, background:BG }} />}
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontSize:10, color:MID, fontWeight:800, letterSpacing:2, textTransform:"uppercase" }}>{p.category}</p>
                      <p style={{ margin:"4px 0 6px", fontSize:13, fontWeight:800 }}>{p.name}</p>
                      <PromoPrice product={p} promotions={promotions} fmt={fmt} accent={DARK} sobre={DARK}
                        priceSize={14} compareSize={11} weight={900} ocultarPrecios={ocultarPrecios}
                        gap={8} style={{ marginBottom:4 }} />
                      <div style={{ marginBottom:10 }}>{avisoPromo(p, "chip")}</div>
                      <button onClick={() => openModal(p)} style={{ background:DARK, color:accSobreDark, border:"none", padding:"7px 14px", fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase", cursor:"pointer" }}>Ver</button>
                    </div>
                    <button onClick={() => toggleFavorite(p.id)} style={{ background:"none", border:"none", fontSize:16, cursor:"pointer", alignSelf:"flex-start", padding:4, color:MID }}>✕</button>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT MODAL */}
      {modalProduct && (
        <div className="up-fade" style={{ position:"fixed", inset:0, zIndex: isPreview ? 20000 : 600 }}>
          <div onClick={() => setModalProduct(null)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.7)" }} />
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", padding: isMobile ? 0 : 24 }}>
            {/* ── La ficha de producto de Urban Pulse ───────────────────────────
                Chic Paris apila TODO en la columna derecha: descripción, ficha,
                videos, reseñas y el formulario. Con un producto real esa columna
                mide varios miles de píxeles: el botón de comprar se va de pantalla
                a los dos scrolls y al lado de la foto queda un vacío enorme.
                Acá la derecha lleva SOLO lo que hace falta para comprar y queda
                clavada mientras la izquierda —foto, descripción, ficha, videos,
                reseñas, similares— corre por debajo. El precio y el botón están
                siempre a la vista, y da igual si la descripción tiene tres líneas
                o tres pantallas: el modal mide lo mismo.
                El ancho pasa de 860 a 1080, y la columna de compra se mide con
                `clamp`: 36% del modal, nunca menos de 300px ni más de 400. A 768
                deja 300 para comprar y ~420 para la foto; a 1280, 389 y 691. */}
            {/* En celular la ficha ocupa la pantalla entera (`height` y `maxHeight`
                al 100%, sin padding alrededor). Antes quedaba en 92vh y flotando:
                se veía una franja del fondo arriba y abajo, y la barra de comprar
                —que va abajo de todo— terminaba a media pantalla. */}
            <div style={{ background:WHITE, width:"100%", maxWidth:1080, height: isMobile ? "100%" : undefined, maxHeight: (isPreview || isMobile) ? "100%" : "92vh", overflow:"hidden", display:"flex", flexDirection:"column", position:"relative" }}>
              <button onClick={() => { setModalProduct(null); setLightboxSrc(null); }} aria-label="Cerrar" style={{ position:"absolute", top:0, right:0, background:DARK, border:"none", color:accSobreDark, width:40, height:40, fontSize:18, cursor:"pointer", zIndex:10, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
              {/* `minmax(0,1fr)` y no `1fr`: la descripción la escribe el dueño en
                  un editor de texto rico y puede traer una tabla ancha o un link
                  larguísimo sin espacios. Con `1fr` eso estira la columna y
                  descuadra el modal entero; con el mínimo en 0 manda la columna. */}
              <div style={{ overflow:"auto", flex:1, minHeight:0,
                            ...(isMobile
                              ? { display:"flex", flexDirection:"column" as const }
                              : { display:"grid", gridTemplateColumns:"minmax(0,1fr) clamp(300px, 36%, 400px)", alignItems:"start" }) }}>
              <div style={{ ...(isMobile ? {} : { gridColumn:1, gridRow:1 }), minWidth:0, padding: isMobile ? 0 : "26px 26px 0" }}>
                <div style={{ position:"relative", paddingLeft: (!isMobile && modalProduct.images.length > 1) ? 84 : 0 }}>
                {/* Miniaturas en tira VERTICAL, al costado. En Chic Paris van abajo
                    y en fila: ahí cada foto extra le come alto a la foto grande.
                    Al costado no le sacan nada, y de paso son más grandes (72×90
                    contra 58×68).
                    Va en `position:absolute` a propósito: el alto de la fila lo
                    tiene que fijar la FOTO. Si la tira fuera un hermano flex, diez
                    miniaturas estirarían la fila a 1000px y la foto se iría con
                    ellas. Con `top:0 bottom:0` mide exactamente lo que la foto y
                    scrollea sola cuando no entran. */}
                {!isMobile && modalProduct.images.length > 1 && (
                  <div style={{ position:"absolute", left:0, top:0, bottom:0, width:72, overflowY:"auto", scrollbarWidth:"none", display:"flex", flexDirection:"column", gap:8 }}>
                    {modalProduct.images.map((img, i) => (
                      <button key={i} onClick={() => setModalImg(i)} aria-label={`Ver foto ${i+1}`}
                        style={{ position:"relative", width:72, height:90, flexShrink:0, padding:0, cursor:"pointer", overflow:"hidden", background:BG,
                                 border: i === modalImg ? `3px solid ${DARK}` : `1px solid ${DARK}22`, opacity: i === modalImg ? 1 : 0.5 }}>
                        <FadeImage src={img} alt="" fill sizes="72px" style={{ objectFit:"cover" }} />
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ position:"relative", width:"100%", maxWidth: isMobile ? undefined : 520, aspectRatio:"3/4", background:BG }} {...imgSwipe}>
                  {modalProduct.images[modalImg] && (
                    <FadeImage src={modalProduct.images[modalImg]} alt={modalProduct.name} fill sizes="(max-width: 768px) 100vw, 520px" style={{ objectFit:"cover", cursor:"zoom-in" }}
                      onClick={() => setLightboxSrc(modalProduct.images[modalImg])} />
                  )}
                  {(() => {
                    if (modalPromo?.primaryPromo) return <PromoTag tipo={modalPromo.primaryPromo.type} label={describePromo(modalPromo.primaryPromo).headline} paleta={PALETA_PROMO_NEON} />;
                    const hasOffer = !variantPrice && !!modalProduct.comparePrice && modalProduct.comparePrice > modalProduct.price;
                    if (!hasOffer) return null;
                    return <OfferBadge badge={modalProduct.offerBadge} pct={discountPercent(modalProduct.price, modalProduct.comparePrice)} size="md" />;
                  })()}
                  {modalProduct.images.length > 1 && (<>
                    <button onClick={() => setModalImg(i => (i - 1 + modalProduct.images.length) % modalProduct.images.length)}
                      aria-label="Imagen anterior"
                      style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", background:"rgba(0,0,0,0.55)", border:"none", color:"#fff", width:42, height:42, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:700, zIndex:2, borderRadius:2 }}>‹</button>
                    <button onClick={() => setModalImg(i => (i + 1) % modalProduct.images.length)}
                      aria-label="Imagen siguiente"
                      style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"rgba(0,0,0,0.55)", border:"none", color:"#fff", width:42, height:42, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:700, zIndex:2, borderRadius:2 }}>›</button>
                    <div style={{ position:"absolute", bottom:8, right:8, background:"rgba(0,0,0,0.5)", color:"#fff", fontSize:10, letterSpacing:1, padding:"3px 8px", borderRadius:2, zIndex:2 }}>
                      {modalImg+1} / {modalProduct.images.length}
                    </div>
                  </>)}
                </div>
                </div>
                {/* En celular la tira vuelve abajo y en fila: una columna al
                    costado en 360px le comería el ancho a la foto. `overflowX`
                    porque ocho fotos no entran — la versión de escritorio que
                    había acá tampoco lo tenía y se salían del modal. */}
                {isMobile && modalProduct.images.length > 1 && (
                  <div style={{ display:"flex", gap:6, padding:"6px 12px 0", overflowX:"auto", scrollbarWidth:"none" }}>
                    {modalProduct.images.map((img, i) => (
                      <button key={i} onClick={() => setModalImg(i)} aria-label={`Ver foto ${i+1}`}
                        style={{ position:"relative", width:64, height:80, flexShrink:0, padding:0, cursor:"pointer", overflow:"hidden", background:BG,
                                 border: i === modalImg ? `3px solid ${DARK}` : `1px solid ${DARK}22`, opacity: i === modalImg ? 1 : 0.5 }}>
                        <FadeImage src={img} alt="" fill sizes="64px" style={{ objectFit:"cover" }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Panel de compra ───────────────────────────────────────────
                  Solo lo necesario para comprar. Todo lo que se lee —descripción,
                  ficha, videos, reseñas— se fue a la columna de la izquierda.
                  `alignSelf:start` + `gridRow:"1 / span 2"`: el panel se apoya
                  arriba, pero su área abarca las dos filas de la izquierda, que es
                  el alto contra el que puede desplazarse. Sin el `span 2` su área
                  sería solo la fila de la foto y no tendría dónde quedarse fijo.
                  `maxHeight` + `overflowY`: si el panel llegara a ser más alto que
                  la pantalla —un producto con doce talles y ocho colores en un
                  portátil bajito— `sticky` no alcanza y el botón de comprar queda
                  abajo, fuera de alcance. Así el panel scrollea por dentro.
                  Los 46 de arriba son para no meterse debajo del cuadrado de
                  cerrar, que está pegado a la esquina de la tarjeta. */}
              <div style={ isMobile
                ? { padding:"22px 18px 2px", borderTop:`3px solid ${DARK}`, minWidth:0 }
                : { gridColumn:2, gridRow:"1 / span 2", position:"sticky", top:0, alignSelf:"start",
                    maxHeight: isPreview ? "100vh" : "92vh", overflowY:"auto", boxSizing:"border-box",
                    padding:"46px 26px 30px", borderLeft:`3px solid ${DARK}`, background:WHITE, minWidth:0 } }>
                <p style={{ margin:"0 0 6px", fontSize:10, color:MID, fontWeight:800, letterSpacing:3, textTransform:"uppercase" }}>{modalProduct.category}</p>
                <h3 style={{ margin:"0 0 14px", fontSize:24, fontWeight:900, textTransform:"uppercase", letterSpacing:"-0.5px", overflowWrap:"anywhere" }}>{modalProduct.name}</h3>
                {/* Atajo a las reseñas, que ahora viven en la otra columna. Sin
                    esto no hay ninguna señal de que el producto tenga opiniones
                    hasta que scrolleás medio modal. */}
                {resenasProd.total > 0 && (() => {
                  const totalRes = resenasProd.total;
                  const prom = resenasProd.promedio;
                  return (
                    <button type="button" onClick={() => document.getElementById("up-modal-resenas")?.scrollIntoView({ behavior:"smooth", block:"start" })}
                      style={{ display:"flex", alignItems:"center", gap:7, background:"none", border:"none", padding:0, marginBottom:14, cursor:"pointer" }}>
                      <span style={{ display:"flex", gap:1 }}>
                        {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize:13, color: s <= Math.round(prom) ? accSobreClaro : `${DARK}28` }}>★</span>)}
                      </span>
                      <span style={{ fontSize:11, fontWeight:900, color:DARK }}>{prom.toFixed(1)}</span>
                      <span style={{ fontSize:10, fontWeight:800, color:MID, letterSpacing:1, textTransform:"uppercase", textDecoration:"underline" }}>
                        {totalRes} reseña{totalRes !== 1 ? "s" : ""}
                      </span>
                    </button>
                  );
                })()}
                <div style={{ display:"flex", gap:14, alignItems:"baseline", marginBottom: modalProduct.offerNote ? 8 : 22, flexWrap:"wrap" }}>
                  {ocultarPrecios ? (
                    <span style={{ fontSize:28, fontWeight:900, color:DARK }}>Consultá precio</span>
                  ) : modalPromo?.hasPriceDrop ? (
                    <>
                      <span style={{ fontSize:28, fontWeight:900, color:RED }}>{fmt(modalPromo.effectivePrice)}</span>
                      <span style={{ fontSize:15, color:MID, textDecoration:"line-through" }}>{fmt(modalPromo.originalPrice)}</span>
                      {modalPromo.pctOff != null && <span style={{ fontSize:12, fontWeight:800, color:"#16a34a", background:"#dcfce7", padding:"2px 8px", borderRadius:4 }}>{modalPromo.pctOff}% OFF</span>}
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize:28, fontWeight:900, color: (!variantPrice && modalProduct.comparePrice) ? RED : DARK }}>{fmt(displayPrice)}</span>
                      {!variantPrice && modalProduct.comparePrice && <span style={{ fontSize:15, color:MID, textDecoration:"line-through" }}>{fmt(modalProduct.comparePrice)}</span>}
                    </>
                  )}
                </div>
                {modalPromo?.primaryPromo && <div style={{ marginBottom:16 }}><PromoBlock promo={modalPromo.primaryPromo} freeShippingExtra={modalPromo.freeShipping} paleta={PALETA_PROMO_NEON} /></div>}
                {!ocultarPrecios && modalProduct.offerNote && (
                  <div style={{ fontSize:12, color:"#f97316", background:"rgba(249,115,22,0.08)", border:"1px solid rgba(249,115,22,0.25)", borderRadius:4, padding:"5px 10px", display:"flex", alignItems:"center", gap:6 }}>
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>{modalProduct.offerNote}</span>
                  </div>
                )}
                {/* La condición (Nuevo / Usado / Reacondicionado) se queda en el
                    panel: es un dato de COMPRA, no de ficha. El resto de los
                    atributos y los servicios se fueron a "Ficha técnica", en la
                    columna de la izquierda. */}
                {(() => {
                  const cond = (modalProduct.attributes ?? []).find(a => a.key === "Condición");
                  if (!cond) return null;
                  return (
                    <div style={{ marginBottom:18 }}>
                      <span style={{ display:"inline-block", fontSize:9, letterSpacing:1.5, textTransform:"uppercase", fontWeight:900, color:accentText, background:ACC, padding:"5px 10px" }}>{cond.value}</span>
                    </div>
                  );
                })()}
                <div style={{ marginBottom:18 }}>
                  <p style={{ margin:"0 0 8px", fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase" }}>Talle: <span style={{ color:MID, fontWeight:600 }}>{selectedSize}</span></p>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {modalProduct.sizes.map(s => {
                      const outOfStock = outOfStockSizes.has(s);
                      return (
                        <button key={s} onClick={() => setSelectedSize(s)}
                          // El talle elegido pinta el fondo de DARK y escribía el
                          // número con el acento crudo: con un acento oscuro
                          // quedaba negro sobre negro y el talle seleccionado era
                          // justo el único que no se leía.
                          style={{ border:`2px solid ${selectedSize === s ? DARK : "#ddd"}`, background: selectedSize === s ? DARK : WHITE, color: selectedSize === s ? accSobreDark : DARK, padding:"7px 13px", fontSize:11, fontWeight:800, cursor:"pointer", letterSpacing:1, opacity: outOfStock ? 0.35 : 1, textDecoration: outOfStock ? "line-through" : "none" }}>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ marginBottom:22 }}>
                  <p style={{ margin:"0 0 8px", fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase" }}>Color: <span style={{ color:MID, fontWeight:600 }}>{selectedColor}</span></p>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {modalProduct.colors.map(c => {
                      const swatch = colorToSwatch(c);
                      return (
                        <button key={c} onClick={() => setSelectedColor(c)}
                          style={{ display:"flex", alignItems:"center", gap:7, border:`2px solid ${selectedColor === c ? DARK : "#ddd"}`, background:WHITE, color: selectedColor === c ? DARK : MID, padding:"6px 12px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                          {swatch && <span style={{ width:14, height:14, borderRadius:"50%", background:swatch, border:"1px solid #ddd", flexShrink:0 }} />}
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:26 }}>
                  <span style={{ fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase" }}>Cantidad</span>
                  <div style={{ display:"flex", alignItems:"center", border:`2px solid ${DARK}` }}>
                    <button onClick={() => setQty(q => Math.max(isWholesale && modalProduct.cantMinMayorista ? modalProduct.cantMinMayorista : 1,q-1))} style={{ width:36, height:36, background:"none", border:"none", fontSize:18, cursor:"pointer", fontWeight:900 }}>−</button>
                    <span style={{ width:32, textAlign:"center", fontWeight:900 }}>{qty}</span>
                    <button onClick={() => setQty(q => selectedVariantStock !== null ? Math.min(selectedVariantStock, q+1) : q+1)} style={{ width:36, height:36, background:"none", border:"none", fontSize:18, cursor:"pointer", fontWeight:900 }}>+</button>
                  </div>
                </div>
                {/* 3×2 en vivo: progreso del beneficio N×M según la cantidad. */}
                {modalPromo?.nxm && nxmPaid != null && (() => {
                  const { n, m } = modalPromo.nxm;
                  const free = qty - nxmPaid;
                  const toNext = (n - (qty % n)) % n;
                  return (
                    <div style={{ fontSize:12.5, fontWeight:800, padding:"9px 12px", borderRadius:6, marginBottom:20, background: free > 0 ? "rgba(22,163,74,0.10)" : "#fff7ed", border:`1px solid ${free > 0 ? "rgba(22,163,74,0.28)" : "#fed7aa"}`, color: free > 0 ? "#16a34a" : "#c2410c" }}>
                      {free > 0
                        ? `🎉 Llevás ${qty}, pagás ${nxmPaid} · ${free} gratis${toNext > 0 ? ` — sumá ${toNext} y llevás otra gratis` : ""}`
                        : `Promo ${n}×${m} · sumá ${toNext} más y una te sale gratis`}
                    </div>
                  );
                })()}
                {/* Stock por variante */}
                {selectedVariantStock !== null && selectedVariantStock === 0 && (
                  <p style={{ fontSize:12, color:"#888", fontWeight:700, margin:0 }}>Sin stock en esta combinación</p>
                )}
                {selectedVariantStock !== null && selectedVariantStock > 0 && selectedVariantStock <= 5 && (
                  <p style={{ fontSize:12, color:"#ef4444", fontWeight:900, margin:0 }}>¡Últimas {selectedVariantStock} unidades!</p>
                )}
                {!isMobile && (
                  <div style={{ borderTop:`2px solid ${DARK}`, marginTop:4, paddingTop:16 }}>
                  {isInquiryMode ? (
                  <button onClick={() => openInquiry(modalProduct)}
                    style={{ width:"100%", background:DARK, color:accSobreDark, border:"none", padding:"16px", fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", marginBottom:10 }}>
                    Consultar disponibilidad
                  </button>
                ) : (
                  <button onClick={addToCart} disabled={selectedVariantStock === 0}
                    style={{ width:"100%", background: selectedVariantStock === 0 ? "#555" : DARK, color:accSobreDark, border:"none", padding:"16px", fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor: selectedVariantStock === 0 ? "not-allowed" : "pointer", marginBottom:10 }}>
                    {selectedVariantStock === 0 ? "Sin stock" : `Agregar · ${fmt(nxmPaid != null ? nxmPaid * displayPrice : (modalPromo?.hasPriceDrop ? modalPromo.effectivePrice : displayPrice) * qty)}`}
                  </button>
                )}
                  </div>
                )}
                <button onClick={() => toggleFavorite(modalProduct.id)}
                  style={{ width:"100%", background:"none", border:`2px solid ${DARK}`, color:DARK, padding:"12px", fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill={favorites.includes(modalProduct.id) ? DARK : "none"} stroke={DARK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  {favorites.includes(modalProduct.id) ? "Guardado" : "Guardar en favoritos"}
                </button>

                {/* Compartir. Estaba arriba de todo, entre el nombre y el precio,
                    empujando el precio para abajo en un panel que tiene que ser
                    corto — y con colores heredados de un template oscuro: fondo
                    `rgba(255,255,255,0.06)` y borde `rgba(255,255,255,0.12)` sobre
                    el BLANCO del modal, o sea invisibles, y el hover pintaba el
                    texto de blanco, o sea que al pasar el mouse desaparecía.
                    El verde de WhatsApp al 70% sobre blanco daba 2,0 de contraste;
                    el de marca entero da 1,8. Va uno más oscuro, que se lee. */}
                <div style={{ display:"flex", gap:6, marginTop:10 }}>
                  <button onClick={() => shareProduct(modalProduct)}
                    style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, flex:1, background:"none", border:`1px solid ${DARK}30`, color:MID, padding:"8px 10px", fontSize:9, fontWeight:900, letterSpacing:1.5, textTransform:"uppercase", cursor:"pointer", transition:"color 0.2s, border-color 0.2s" }}
                    onMouseEnter={e=>{ e.currentTarget.style.color=DARK; e.currentTarget.style.borderColor=DARK; }}
                    onMouseLeave={e=>{ e.currentTarget.style.color=MID; e.currentTarget.style.borderColor=`${DARK}30`; }}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    Copiar link
                  </button>
                  {hasWA && (
                  <button onClick={() => whatsappShare(modalProduct)}
                    style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, flex:1, background:"rgba(37,211,102,0.10)", border:"1px solid rgba(11,122,62,0.45)", color:"#0b7a3e", padding:"8px 10px", fontSize:9, fontWeight:900, letterSpacing:1.5, textTransform:"uppercase", cursor:"pointer", transition:"background 0.2s" }}
                    onMouseEnter={e=>(e.currentTarget.style.background="rgba(37,211,102,0.22)")} onMouseLeave={e=>(e.currentTarget.style.background="rgba(37,211,102,0.10)")}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M11.897 0C5.395 0 .13 5.266.13 11.767c0 2.078.545 4.03 1.495 5.727L.057 24l6.7-1.757A11.71 11.71 0 0 0 11.897 23.534c6.503 0 11.768-5.265 11.768-11.767C23.67 5.266 18.4 0 11.897 0zm0 21.536h-.004a9.726 9.726 0 0 1-4.96-1.358l-.356-.211-3.678.965.982-3.581-.232-.368A9.73 9.73 0 0 1 2.158 11.767C2.158 6.355 6.551 2 11.897 2c2.581 0 5.007 1.007 6.831 2.831a9.604 9.604 0 0 1 2.828 6.83c0 5.347-4.393 9.875-9.659 9.875z"/></svg>
                    WhatsApp
                  </button>
                  )}
                </div>
              </div>

              {/* ── La columna que se lee ─────────────────────────────────────
                  Todo lo largo vive acá: descripción, ficha, videos, reseñas y
                  similares. Puede medir lo que quiera —el panel de compra no se
                  mueve— y a ~640px de ancho la descripción y los videos se leen de
                  verdad, contra los ~370 que tenían metidos en la columna de
                  compra. */}
              <div style={{ ...(isMobile ? {} : { gridColumn:1, gridRow:2 }), minWidth:0,
                            padding: isMobile ? "26px 18px 30px" : "36px 26px 34px",
                            display:"flex", flexDirection:"column", gap:34 }}>

                {modalProduct.description && (() => {
                  // Cuánto texto hay DE VERDAD, sin las etiquetas: con el HTML
                  // crudo, un párrafo de dos líneas con una negrita y un link ya
                  // pasa los 320 caracteres y aparecería un "Leer todo" para algo
                  // que se lee entero de un vistazo.
                  const plano = modalProduct.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
                  const larga = plano.length > 320;
                  const plegada = larga && !descAbierta;
                  return (
                    <div>
                      {tituloModal("Descripción")}
                      <div style={{ position:"relative", maxHeight: plegada ? 200 : undefined, overflow: plegada ? "hidden" : undefined }}>
                        {/* El texto va en #3d3d3d y no en MID (#777): #777 sobre
                            blanco da 4,48 de contraste y el mínimo para texto
                            normal es 4,5. Para una etiqueta suelta da igual; para
                            un párrafo de veinte líneas, no. */}
                        <div className="product-rte" dangerouslySetInnerHTML={{ __html: modalProduct.description }}
                          style={{ fontSize:13.5, color:"#3d3d3d", lineHeight:1.8, maxWidth:680 }} />
                        {plegada && <div style={{ position:"absolute", left:0, right:0, bottom:0, height:80, background:`linear-gradient(rgba(255,255,255,0), ${WHITE})`, pointerEvents:"none" }} />}
                      </div>
                      {larga && (
                        <button type="button" onClick={() => setDescAbierta(a => !a)}
                          style={{ marginTop:12, background:"none", border:`2px solid ${DARK}`, color:DARK, padding:"7px 18px", fontSize:9, fontWeight:900, letterSpacing:2, textTransform:"uppercase", cursor:"pointer" }}>
                          {descAbierta ? "Leer menos" : "Leer todo"}
                        </button>
                      )}
                    </div>
                  );
                })()}

                {(() => {
                  const attrs = modalProduct.attributes ?? [];
                  const otros = attrs.filter(a => a.key !== "Condición" && a.key !== "Servicios");
                  const serviciosAttr = attrs.find(a => a.key === "Servicios");
                  let servicios: string[] = [];
                  if (serviciosAttr) { try { servicios = Object.entries(JSON.parse(serviciosAttr.value)).filter(([, v]) => v).map(([k]) => k); } catch {} }
                  if (otros.length === 0 && servicios.length === 0) return null;
                  return (
                    <div>
                      {tituloModal("Ficha técnica")}
                      {otros.length > 0 && (
                        <div style={{ border:`2px solid ${DARK}`, maxWidth:680 }}>
                          {otros.map((a, i) => (
                            <div key={a.key} style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:16, padding:"9px 14px", background: i%2===0 ? `${DARK}08` : WHITE, borderBottom: i < otros.length-1 ? `1px solid ${DARK}15` : "none" }}>
                              <span style={{ fontSize:9, fontWeight:900, color:DARK, textTransform:"uppercase", letterSpacing:0.5, flexShrink:0 }}>{a.key}</span>
                              {/* Un valor sin espacios —un código de barras, una
                                  URL— empujaba la tabla y con ella toda la columna. */}
                              <span style={{ fontSize:12.5, color:DARK, fontWeight:700, textAlign:"right", minWidth:0, overflowWrap:"anywhere" }}>{a.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {servicios.length > 0 && (
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:12 }}>
                          {servicios.map(k => (
                            <span key={k} style={{ fontSize:9, letterSpacing:1, padding:"5px 11px", border:`2px solid ${DARK}`, color:DARK, fontWeight:800, textTransform:"uppercase" }}>✓ {k}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {modalProduct.reelUrls.length > 0 && (
                  <div>
                    {tituloModal("Videos")}
                    <StoreProductReels
                      reelUrls={modalProduct.reelUrls}
                      ancho={isMobile ? 116 : 148}
                      theme={{ accent: accSobreClaro, text: DARK, border: DARK, radius: 0 }}
                    />
                  </div>
                )}

                {/* Reseñas — D-04 */}
                <div id="up-modal-resenas">
                  {tituloModal(resenasProd.total > 0 ? `Reseñas (${resenasProd.total})` : "Reseñas")}
                  {resenasProd.cargando ? (
                    <p style={{ fontSize:12, color:MID }}>Cargando...</p>
                  ) : resenasProd.lista.length > 0 ? (
                    <div style={{ marginBottom:24 }}>
                      {(() => {
                        // Los tres salen de la base, no de las reseñas que llegaron
                        // (ver `useResenasProducto`).
                        const totalRes = resenasProd.total;
                        const avg = resenasProd.promedio;
                        const dist = [5,4,3,2,1].map(s => ({ stars:s, count: resenasProd.distribucion[s] ?? 0 }));
                        return (
                          <div style={{ display:"flex", gap:20, alignItems:"center", marginBottom:20, padding:"14px 16px", background:BG, border:`2px solid ${DARK}` }}>
                            <div style={{ textAlign:"center", minWidth:56 }}>
                              <p style={{ fontSize:34, fontWeight:900, color:DARK, margin:0, lineHeight:1 }}>{avg.toFixed(1)}</p>
                              <div style={{ display:"flex", gap:2, justifyContent:"center", margin:"6px 0 4px" }}>
                                {/* Las estrellas de adentro del modal se quedaron
                                    con el acento crudo cuando UP-11 barrió las de
                                    la portada: sobre el blanco de la ficha, un
                                    acento claro las borra. Y las vacías estaban en
                                    DARK, o sea MÁS marcadas que las llenas: al
                                    revés de lo que tienen que decir. */}
                                {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize:11, color: s <= Math.round(avg) ? accSobreClaro : "#d8d8d8" }}>★</span>)}
                              </div>
                              <p style={{ fontSize:9, color:MID, margin:0, fontWeight:700, letterSpacing:0.5, textTransform:"uppercase" }}>{totalRes} reseña{totalRes !== 1 ? "s" : ""}</p>
                            </div>
                            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}>
                              {dist.map(d => (
                                <div key={d.stars} style={{ display:"flex", alignItems:"center", gap:8 }}>
                                  <span style={{ fontSize:9, color:accSobreClaro, minWidth:14, textAlign:"right", fontWeight:900 }}>{d.stars}★</span>
                                  <div style={{ flex:1, height:4, background:`${DARK}18`, borderRadius:0, overflow:"hidden" }}>
                                    <div style={{ height:"100%", width:`${totalRes ? (d.count / totalRes) * 100 : 0}%`, background:accSobreClaro, borderRadius:0 }} />
                                  </div>
                                  <span style={{ fontSize:9, color:MID, minWidth:12, textAlign:"right", fontWeight:700 }}>{d.count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      <div style={{ display:"flex", flexDirection:"column" }}>
                        {resenasProd.lista.slice(0, resenasProd.mostradas).map((r, i) => (
                          <div key={r.id} style={{ display:"flex", gap:12, padding:"16px 0", borderBottom: i < Math.min(resenasProd.mostradas, resenasProd.lista.length) - 1 ? `1px solid ${DARK}` : "none" }}>
                            {/* El cuadradito con la inicial de quien reseñó. Estaba
                                con el acento crudo sobre el blanco del modal: con un
                                acento claro se perdían la letra y el borde a la vez. */}
                            <div style={{ width:34, height:34, borderRadius:0, flexShrink:0, background:`${accSobreClaro}18`, border:`1px solid ${accSobreClaro}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, color:accSobreClaro, textTransform:"uppercase" }}>
                              {r.reviewer.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex:1 }}>
                              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                                  <span style={{ fontSize:12, fontWeight:900, textTransform:"uppercase" }}>{r.reviewer}</span>
                                  {r.verified && (
                                    <span style={{ fontSize:9, fontWeight:900, color:accSobreClaro, border:`1px solid ${accSobreClaro}`, padding:"1px 5px", letterSpacing:0.5, textTransform:"uppercase" }}>✓ Verificada</span>
                                  )}
                                </div>
                                <span style={{ fontSize:9, color:MID, fontWeight:700 }}>{new Date(r.createdAt).toLocaleDateString("es-AR", { day:"numeric", month:"short", year:"numeric" })}</span>
                              </div>
                              <div style={{ display:"flex", gap:1, marginBottom: r.comment ? 8 : 0 }}>
                                {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize:12, color: s <= r.rating ? accSobreClaro : "#d8d8d8" }}>★</span>)}
                              </div>
                              {/* Recortado a 5 líneas con "Leer todo". Una reseña
                                  de 2000 caracteres, con diez más abajo, convierte
                                  la sección en un muro y empuja los similares
                                  fuera de la vista. */}
                              {r.comment && (
                                <ResenaComentario texto={r.comment} acento={accSobreClaro} comillas={false} lineas={5}
                                  estiloTexto={{ fontSize:12.5, color:"#3d3d3d", lineHeight:1.7 }}
                                  textoBoton={{ desplegar:"Leer todo", irA:"Ver reseña" }} />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {resenasProd.hayMas && (
                        <button onClick={resenasProd.verMas} disabled={resenasProd.cargandoMas}
                          style={{ marginTop:14, background:"none", border:`2px solid ${DARK}`, color: resenasProd.cargandoMas ? MID : accSobreClaro, fontSize:9, fontWeight:900, letterSpacing:2, cursor: resenasProd.cargandoMas ? "default" : "pointer", padding:"8px 20px", textTransform:"uppercase", display:"block" }}>
                          {resenasProd.cargandoMas ? "Cargando…" : `Ver más (${resenasProd.faltan})`}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontSize:12, color:MID, marginBottom:16 }}>Sé el primero en dejar una reseña.</p>
                  )}
                  {isOwner ? (
                    <p style={{ fontSize:11, color:MID, fontStyle:"italic" }}>El dueño no puede dejar reseñas en su propia tienda.</p>
                  ) : reviewDone ? (
                    <p style={{ fontSize:12, color:accSobreClaro, fontWeight:900 }}>¡Gracias por tu reseña!</p>
                  ) : !formResenaAbierto ? (
                    // Plegado hasta que alguien lo pida: son cinco campos, el
                    // captcha y una aclaración legal —unos 300px— que casi nadie
                    // va a usar en esa visita y que separan las reseñas de los
                    // similares.
                    <button type="button" onClick={() => setFormResenaAbierto(true)}
                      style={{ background:DARK, color:accSobreDark, border:"none", padding:"12px 24px", fontSize:10, fontWeight:900, letterSpacing:2.5, textTransform:"uppercase", cursor:"pointer" }}>
                      Escribir una reseña
                    </button>
                  ) : (
                    <div style={{ position:"relative" }}>
                      {isPreview && <div style={{ position:"absolute", inset:0, zIndex:10, cursor:"default" }} onClick={e => e.stopPropagation()} />}
                      <form onSubmit={isPreview ? e => e.preventDefault() : submitReview} style={{ display:"flex", flexDirection:"column", gap:10, opacity: isPreview ? 0.55 : 1 }}>
                        {/* Trampa para bots: invisible para una persona. */}
                        <input value={reviewHoneypot} onChange={e => setReviewHoneypot(e.target.value)}
                          tabIndex={-1} autoComplete="off" aria-hidden="true"
                          style={{ position:"absolute", left:-9999, width:1, height:1, opacity:0 }} />
                        {/* `maxLength` — el formulario de reseña de la TIENDA ya
                            los tenía; este no. Sin tope se podía mandar un nombre
                            de mil caracteres y un comentario de cincuenta mil: el
                            servidor lo rechaza, así que la persona escribe todo
                            para que le digan que no al final. Y si entrara, sería
                            un muro adentro de la ficha. */}
                        <input value={reviewForm.reviewer} onChange={e => !isPreview && setReviewForm(p => ({ ...p, reviewer: e.target.value }))}
                          placeholder="Tu nombre" readOnly={isPreview} maxLength={RESENADOR_MAX}
                          style={{ background:"none", border:`2px solid ${DARK}`, padding:"9px 12px", fontSize:12, fontWeight:600, outline:"none" }} />
                        <div>
                          <input value={reviewForm.email} onChange={e => !isPreview && setReviewForm(p => ({ ...p, email: e.target.value }))}
                            placeholder="Tu email (opcional — verifica tu compra)" type="email" readOnly={isPreview} autoComplete="email" maxLength={120}
                            style={{ width:"100%", boxSizing:"border-box", background:"none", border:`2px solid ${DARK}`, padding:"9px 12px", fontSize:12, fontWeight:600, outline:"none" }} />
                          <p style={{ fontSize:9, color:MID, margin:"3px 0 0", fontWeight:700, letterSpacing:0.5, textTransform:"uppercase", lineHeight:1.4 }}>
                            Si compraste acá, tu reseña mostrará ✓ VERIFICADA. El email no se publica.
                          </p>
                        </div>
                        <div style={{ display:"flex", gap:4 }}>
                          {[1,2,3,4,5].map(s => (
                            <button key={s} type="button" onClick={() => !isPreview && setReviewForm(p => ({ ...p, rating: s }))}
                              style={{ background:"none", border:"none", fontSize:20, cursor: isPreview ? "default" : "pointer", color: s <= reviewForm.rating ? accSobreClaro : "#d8d8d8", padding:"2px" }}>★</button>
                          ))}
                        </div>
                        <textarea value={reviewForm.comment} onChange={e => !isPreview && setReviewForm(p => ({ ...p, comment: e.target.value }))}
                          placeholder="Comentario (opcional)" rows={3} readOnly={isPreview} maxLength={COMENTARIO_MAX}
                          style={{ background:"none", border:`2px solid ${DARK}`, padding:"9px 12px", fontSize:12, resize:"none", outline:"none" }} />
                        {reviewForm.comment.length > COMENTARIO_MAX - 80 && (
                          <p style={{ margin:"-6px 0 0", fontSize:10, color: reviewForm.comment.length >= COMENTARIO_MAX ? "#dc2626" : MID, textAlign:"right", fontWeight:700 }}>
                            {reviewForm.comment.length} / {COMENTARIO_MAX}
                          </p>
                        )}
                        {!isPreview && reviewCaptcha.widget}
                        <button type="submit" disabled={isPreview || reviewSubmitting || !reviewForm.reviewer.trim() || !reviewCaptcha.ready}
                          style={{ background: isPreview || reviewSubmitting || !reviewForm.reviewer.trim() ? MID : DARK, color:accSobreDark, border:"none", padding:"12px", fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor: isPreview ? "default" : "pointer" }}>
                          {reviewSubmitting ? "Publicando..." : "Publicar reseña"}
                        </button>
                      </form>
                      {isPreview && <p style={{ fontSize:10, color:MID, fontStyle:"italic", marginTop:6 }}>Vista previa — solo disponible en la tienda real.</p>}
                    </div>
                  )}
                </div>

                {similarProducts.length > 0 && (
                  <div>
                    {tituloModal("También te puede gustar")}
                    <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap:14 }}>
                      {similarProducts.map(p => (
                        <div key={p.id} onClick={() => openModal(p)} style={{ cursor:"pointer" }}>
                          <div style={{ position:"relative", width:"100%", aspectRatio:"3/4", background:BG }}>
                            {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes="(max-width: 768px) 50vw, 25vw" style={{ objectFit:"cover" }} />}
                            {avisoPromo(p)}
                          </div>
                          <p style={{ margin:"8px 0 2px", fontSize:12, color:DARK, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical" as const }}>{p.name}</p>
                          <PromoPrice product={p} promotions={promotions} fmt={fmt} accent={DARK} sobre={DARK}
                            priceSize={13} weight={900} ocultarPrecios={ocultarPrecios} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {isMobile && (
              <div style={{ borderTop:`2px solid ${DARK}`, padding:"12px 16px 16px", background:WHITE, flexShrink:0 }}>
                <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:10 }}>
                  <span style={{ fontSize:20, fontWeight:900, color:DARK }}>{ocultarPrecios ? "Consultá precio" : fmt(nxmPaid != null ? nxmPaid * displayPrice : (modalPromo?.hasPriceDrop ? modalPromo.effectivePrice : displayPrice) * qty)}</span>
                  {!variantPrice && !ocultarPrecios && modalProduct.comparePrice && <span style={{ fontSize:12, color:MID, textDecoration:"line-through" }}>{fmt(modalProduct.comparePrice)}</span>}
                  {qty > 1 && <span style={{ fontSize:11, color:MID }}>× {qty}</span>}
                </div>
                {isInquiryMode ? (
                  <button onClick={() => openInquiry(modalProduct)}
                    style={{ width:"100%", background:DARK, color:accSobreDark, border:"none", padding:"16px", fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor:"pointer" }}>
                    Consultar disponibilidad
                  </button>
                ) : (
                  <button onClick={addToCart} disabled={selectedVariantStock === 0}
                    style={{ width:"100%", background: selectedVariantStock === 0 ? "#555" : DARK, color:accSobreDark, border:"none", padding:"16px", fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor: selectedVariantStock === 0 ? "not-allowed" : "pointer" }}>
                    {selectedVariantStock === 0 ? "Sin stock" : "Agregar al Carrito"}
                  </button>
                )}
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {/* ── MODAL: reseña de la TIENDA ────────────────────────────────────────
          El formulario no va inline en el bloque: con varias reseñas al lado
          empujaría todo para abajo. La lógica está en `useHomeReviews`; acá solo
          el vestido de Urban Pulse — bordes rectos de 3px, mayúsculas, sin curvas. */}
      {resenas.modalAbierto && (
        <div className="up-fade" onClick={resenas.cerrarModal}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex: isPreview ? 20000 : 900, display:"flex", alignItems: isMobile ? "flex-end" : "center", justifyContent:"center", padding: isMobile ? 0 : 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:WHITE, width:"100%", maxWidth:480, maxHeight:"92vh", overflowY:"auto", border:`3px solid ${DARK}`, position:"relative" }}>
            <button onClick={resenas.cerrarModal} aria-label="Cerrar"
              style={{ position:"absolute", top:8, right:10, zIndex:2, background:"none", border:"none", color:DARK, width:32, height:32, cursor:"pointer", fontSize:22, lineHeight:1 }}>✕</button>
            <div style={{ padding: isMobile ? "28px 22px 26px" : "32px 30px 28px" }}>
              {resenas.listo ? (
                // Nace pendiente de aprobación: si dijera "¡Publicada!" y no
                // apareciera, la persona pensaría que se perdió y la escribiría
                // de nuevo.
                <div style={{ textAlign:"center", padding:"8px 0" }}>
                  <div style={{ fontSize:34, marginBottom:10, color:accSobreClaro }}>✓</div>
                  <p style={{ margin:"0 0 6px", fontSize:13, fontWeight:900, letterSpacing:2, textTransform:"uppercase", color:DARK }}>¡Gracias por tu opinión!</p>
                  <p style={{ margin:"0 0 20px", fontSize:12.5, color:MID, lineHeight:1.6 }}>
                    La tienda la revisa antes de publicarla, así que todavía no la vas a ver acá.
                  </p>
                  <button type="button" onClick={resenas.cerrarModal}
                    style={{ background:ACC, color:accentText, border:"none", padding:"12px 34px", fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor:"pointer" }}>
                    Cerrar
                  </button>
                </div>
              ) : (
                <form onSubmit={resenas.enviar} style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <div>
                    <p style={{ margin:"0 0 5px", fontSize:11, letterSpacing:3, textTransform:"uppercase", fontWeight:900, color:DARK }}>
                      Contanos cómo te fue
                    </p>
                    <p style={{ margin:0, fontSize:12, color:MID, lineHeight:1.5 }}>
                      Tu opinión sobre la atención, el envío y la experiencia de comprar acá.
                    </p>
                  </div>
                  {resenas.error && (
                    <p style={{ margin:0, fontSize:11.5, color:"#b91c1c", background:"#fef2f2", border:"2px solid #fecaca", padding:"9px 12px", lineHeight:1.5 }}>
                      ⚠ {resenas.error}
                    </p>
                  )}

                  {/* Trampa para bots: invisible para una persona, irresistible
                      para un robot que completa todo lo que encuentra. */}
                  <input value={resenas.honeypot} onChange={e => resenas.setHoneypot(e.target.value)}
                    tabIndex={-1} autoComplete="off" aria-hidden="true"
                    style={{ position:"absolute", left:-9999, width:1, height:1, opacity:0 }} />

                  <div style={{ display:"flex", gap:5 }}>
                    {[1,2,3,4,5].map(s => (
                      <button key={s} type="button" onClick={() => resenas.setForm(p => ({ ...p, rating: s }))}
                        aria-label={`${s} de 5 estrellas`}
                        style={{ background:"none", border:"none", padding:0, cursor:"pointer", lineHeight:0 }}>
                        {/* El modal es blanco: con un acento claro las estrellas
                            elegidas desaparecían. `accSobreClaro` cae a un color
                            legible cuando el acento no se despega del blanco. */}
                        <svg width={26} height={26} viewBox="0 0 24 24" fill={s <= resenas.form.rating ? accSobreClaro : "#dcdcdc"} stroke={s <= resenas.form.rating ? DARK : "none"} strokeWidth={1}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      </button>
                    ))}
                  </div>

                  <input value={resenas.form.reviewer} maxLength={RESENADOR_MAX} required
                    onChange={e => resenas.setForm(p => ({ ...p, reviewer: e.target.value }))}
                    placeholder="Tu nombre"
                    style={{ border:`2px solid ${DARK}`, padding:"11px 12px", fontSize:13, outline:"none", fontFamily:"inherit" }} />

                  <input value={resenas.form.email} type="email" maxLength={120} autoComplete="email"
                    onChange={e => resenas.setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="Tu email (opcional)"
                    style={{ border:`2px solid ${DARK}`, padding:"11px 12px", fontSize:13, outline:"none", fontFamily:"inherit" }} />
                  <p style={{ margin:"-6px 0 0", fontSize:10.5, color:MID, lineHeight:1.5 }}>
                    Si compraste acá, tu reseña sale con el sello “✓ Compra verificada”. El email no se publica.
                  </p>

                  <textarea value={resenas.form.comment} rows={3} maxLength={COMENTARIO_MAX}
                    onChange={e => resenas.setForm(p => ({ ...p, comment: e.target.value }))}
                    placeholder="La atención, el envío, la experiencia..."
                    style={{ border:`2px solid ${DARK}`, padding:"11px 12px", fontSize:13, resize:"none", outline:"none", fontFamily:"inherit" }} />
                  {resenas.form.comment.length > COMENTARIO_MAX - 80 && (
                    <p style={{ margin:"-6px 0 0", fontSize:10, color: resenas.form.comment.length >= COMENTARIO_MAX ? "#dc2626" : MID, textAlign:"right" }}>
                      {resenas.form.comment.length} / {COMENTARIO_MAX}
                    </p>
                  )}

                  {!isPreview && resenas.captcha.widget}

                  {/* Confirmación en dos pasos. Una reseña es pública y lleva el
                      nombre de quien la escribe: conviene un segundo para
                      releerla. Se evita el `confirm()` del navegador, que en
                      celular tapa el texto que se está por confirmar. */}
                  {resenas.confirmando ? (
                    <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                      <p style={{ margin:0, fontSize:11.5, color:DARK, lineHeight:1.6 }}>
                        Se publica con tu nombre, <strong>{resenas.form.reviewer.trim()}</strong>, y {resenas.form.rating} de 5 estrellas. ¿La mandamos?
                      </p>
                      <div style={{ display:"flex", gap:8 }}>
                        <button type="submit" disabled={resenas.enviando || !resenas.captcha.ready}
                          style={{ flex:1, background:ACC, color:accentText, border:"none", padding:"13px", fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase", cursor: resenas.enviando ? "default" : "pointer", opacity: resenas.enviando ? 0.6 : 1 }}>
                          {resenas.enviando ? "Enviando..." : "Sí, enviar"}
                        </button>
                        <button type="button" onClick={() => resenas.setConfirmando(false)} disabled={resenas.enviando}
                          style={{ background:"none", border:`2px solid ${DARK}`, color:DARK, padding:"13px 18px", fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase", cursor:"pointer" }}>
                          Volver
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" disabled={!resenas.puedeEnviar}
                      onClick={() => resenas.setConfirmando(true)}
                      title={resenas.bloqueo ? undefined : resenas.valida ? undefined : "Escribí tu nombre y elegí cuántas estrellas"}
                      style={{ background: resenas.puedeEnviar ? ACC : "#ededed", color: resenas.puedeEnviar ? accentText : "#9a9a9a", border:"none", padding:"14px", fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor: resenas.puedeEnviar ? "pointer" : "default" }}>
                      Dejar mi reseña
                    </button>
                  )}

                  {/* El botón se apaga por dos motivos distintos y ninguno se
                      adivina mirándolo. Antes solo se avisaba el de vista previa,
                      así que el dueño escribía todo, apretaba y no pasaba nada. */}
                  {resenas.bloqueo && (
                    <p style={{ margin:0, fontSize:10.5, color:MID, fontStyle:"italic", textAlign:"center", lineHeight:1.5 }}>
                      {resenas.bloqueo === "preview"
                        ? "Vista previa — el formulario funciona en tu tienda publicada."
                        : "Sos el dueño de esta tienda: las reseñas las dejan tus clientes."}
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <CartDrawer cart={cart} theme={cartTheme} isOwner={isOwner} isPreview={isPreview} whatsapp={storeConfig?.whatsapp} />
      <CheckoutModal cart={cart} theme={cartTheme} isPreview={isPreview} storeSlug={storeConfig?.slug ?? ""} />

      {/* ── LIGHTBOX ───────────────────────────────────────── */}
      {lightboxSrc && (
        <div style={{ position:"fixed", inset:0, zIndex: isPreview ? 20001 : 700, background:"rgba(0,0,0,0.97)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setLightboxSrc(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- el lightbox es la foto a pantalla completa con zoom de dos dedos: necesita el <img> nativo. next/image pide medidas fijas o un padre posicionado, y ninguna de las dos cosas conviven con maxWidth/maxHeight en viewport + touchAction pinch-zoom. */}
          <img src={lightboxSrc} alt="" style={{ maxWidth:"100vw", maxHeight:"100vh", objectFit:"contain", touchAction:"pinch-zoom" }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxSrc(null)} aria-label="Cerrar" style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", width:44, height:44, borderRadius:"50%", fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
      )}
    </div>
  );
}
