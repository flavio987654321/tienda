"use client";
import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { usePushBell } from "@/contexts/PushBellContext";
import { useAuth } from "@/components/AuthProvider";
import StoreFollowButton from "@/components/store/StoreFollowButton";
import { EditableZone, EditableImageButton, EditableSectionBg, BgDragHandle, getContrastColor, useEditContext } from "@/contexts/EditContext";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useCartLogic } from "@/hooks/useCartLogic";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import { masVistos, MIN_MAS_VISTOS } from "@/lib/masVistos";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import VerifiedIconButton from "@/components/store/VerifiedIconButton";
import { CartDrawer, type CartTheme } from "@/components/store/templates/shared/CartDrawer";
import { OfferBadge } from "@/components/store/OfferBadge";
import { PromoTag, PromoBlock } from "@/components/store/PromoDisplay";
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

const TESTIMONIALS = [
  { name:"Valentina R.", text:"La calidad es increíble, se nota que es para alto rendimiento. Volví a comprar dos veces este mes.", stars:5 },
  { name:"Marcos D.", text:"El hoodie de training es lo mejor que compré. Cómodo, liviano y se ve súper bien en el gym.", stars:5 },
  { name:"Lucía P.", text:"Los leggings seamless no se corren ni se transparentan. Perfectos para cualquier entrenamiento.", stars:5 },
  { name:"Ignacio M.", text:"Atención rápida y envío en 48hs. Los shorts son de primera calidad.", stars:4 },
];

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
  type PReview = { id: string; rating: number; comment: string | null; reviewer: string; verified: boolean; verifiedBy: string | null; createdAt: string; product?: { name: string; image: string | null } };
  const [reviews,        setReviews]        = useState<PReview[]>([]);
  const [reviewsShown,   setReviewsShown]   = useState(5);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewForm,     setReviewForm]     = useState({ reviewer: "", rating: 5, comment: "", email: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const reviewCaptcha = useTurnstile("review");
  const [reviewDone,     setReviewDone]     = useState(false);
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
  const ofertasBgUp   = scu["bgOfertas"]  ?? DARK;
  const ofertasTextUp = getContrastColor(ofertasBgUp) === "light" ? WHITE : DARK;
  const masVistoBgUp   = scu["bgMasVisto"]  ?? DARK;
  const masVistoTextUp = getContrastColor(masVistoBgUp) === "light" ? WHITE : DARK;

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
  const accentText = getContrastColor(ACC) === "light" ? DARK : "#fff";
  const cartTheme: CartTheme = { BG:"#ffffff", S:BG, T:DARK, MID, border:"#e0e0e0", accent:ACC, accentText };
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

  // Cargar reseñas al abrir modal (D-04)
  useEffect(() => {
    const slug = storeConfig?.slug;
    if (!modalProduct || !slug) { setReviews([]); return; }
    setReviewsLoading(true); setReviewDone(false); setReviewsShown(5);
    setReviewForm(p => ({ ...p, rating: 5, comment: "" }));
    fetch(`/api/public/${slug}/reviews?productId=${modalProduct.id}`)
      .then(r => r.ok ? r.json() : { reviews: [] })
      .then(d => setReviews(d.reviews ?? []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalProduct?.id]);

  const colorSyncingRef = useRef(false);

  // Al cambiar color: sync imagen + talle disponible
  useEffect(() => {
    if (!modalProduct || !selectedColor) return;
    const imgIdx = modalProduct.imageItems.findIndex(
      (img) => img.variantValue && img.variantValue.toLowerCase() === selectedColor.toLowerCase()
    );
    if (imgIdx !== -1) { colorSyncingRef.current = true; setModalImg(imgIdx); }
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
          if (imgIdx !== -1) { colorSyncingRef.current = true; setModalImg(imgIdx); }
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

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (isPreview || isOwner) return;
    const slug = storeConfig?.slug;
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
        setReviews(p => [data.review, ...p]);
        setReviewForm({ reviewer: "", rating: 5, comment: "", email: "" });
        setReviewDone(true); setTimeout(() => setReviewDone(false), 4000);
      }
    } catch {} finally { reviewCaptcha.reset(); setReviewSubmitting(false); }
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
        <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", background:DARK, color:ACC, padding:"12px 28px", fontSize:11, fontWeight:900, letterSpacing:2, textTransform:"uppercase", zIndex:9999 }}>
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
                    {i < arr.length - 1 && <span style={{ color:ACC, fontSize:11, fontWeight:900, margin:"0 8px" }}>·</span>}
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
              {storeConfig?.storeName ?? <span>URBAN<span style={{ background:DARK, color:ACC, padding:"3px 7px", marginLeft:2 }}>PULSE</span></span>}
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
                        style={{ display:"block", width:"100%", background:ACC, border:`2px solid ${DARK}`, color:DARK, padding:"6px 8px", marginBottom:8, fontSize:11, fontWeight:800, textAlign:"left", cursor:"pointer", letterSpacing:1, textTransform:"uppercase", transition:"transform 0.1s" }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = `2px 2px 0 ${DARK}`; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translate(0,0)"; e.currentTarget.style.boxShadow = "none"; }}>
                        {cat}
                      </button>
                      {subs.length > 0 ? (
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                          {subs.map(sub => (
                            <button key={sub} onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=urban-pulse${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat)}&subcategoria=${encodeURIComponent(sub)}`; setHoveredNavCat(null); }}
                              style={{ background:WHITE, border:`1.5px solid ${DARK}`, color:DARK, padding:"4px 8px", fontSize:9.5, fontWeight:700, textAlign:"left", cursor:"pointer", letterSpacing:0.5, textTransform:"uppercase" }}
                              onMouseEnter={e => { e.currentTarget.style.background = ACC; }}
                              onMouseLeave={e => { e.currentTarget.style.background = WHITE; }}>
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
            style={{ background:"none", border:"none", borderBottom: activeGender==="mujer" ? `2px solid ${ACC}` : "2px solid transparent", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", color: activeGender==="mujer" ? DARK : DARK, padding:"4px 0", transition:"border-color 0.2s" }}
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
                      onMouseEnter={e => { e.currentTarget.style.background = ACC; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>{panelLabel}</a>
                    <button onClick={() => { if (isPreview) return; setUserDropdownOpen(false); signOut("/"); }}
                      style={{ display:"block", width:"100%", padding:"10px 16px", background:"none", border:"none", textAlign:"left", fontSize:11, fontWeight:800, letterSpacing:2, textTransform:"uppercase", cursor: isPreview ? "default" : "pointer", color:"#ef4444", opacity: isPreview ? 0.45 : 1 }}
                      onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background = "#fff1f1"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>Cerrar sesión</button>
                  </>
                ) : (
                  <>
                    <a href={isPreview ? undefined : `/login?redirect=/tienda/${storeConfig?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)}
                      style={{ display:"block", padding:"10px 16px", textDecoration:"none", fontSize:11, fontWeight:800, letterSpacing:2, textTransform:"uppercase", color:DARK, borderBottom:`1px solid ${BG}`, cursor: isPreview ? "default" : "pointer" }}
                      onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background = ACC; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>Iniciar sesión</a>
                    <a href={isPreview ? undefined : `/registro?plan=buyer&redirect=/tienda/${storeConfig?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)}
                      style={{ display:"block", padding:"10px 16px", textDecoration:"none", fontSize:11, fontWeight:800, letterSpacing:2, textTransform:"uppercase", color:DARK, cursor: isPreview ? "default" : "pointer" }}
                      onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background = ACC; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>Registrarse</a>
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
                  }} style={{ display:"flex", width:"100%", background:"#f5f5f5", border:"none", borderBottom:`1px solid rgba(0,0,0,0.1)`, color: activeCategory===cat ? ACC : DARK, padding:"13px 24px 13px 40px", fontSize:11, textAlign:"left", cursor:"pointer", letterSpacing:3, fontWeight:800, textTransform:"uppercase", alignItems:"center", justifyContent:"space-between" }}>
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
              style={{ display:"block", width:"100%", background: activeGender===g ? DARK : "none", border:"none", borderBottom:`2px solid ${DARK}`, color: activeGender===g ? ACC : DARK, padding:"16px 24px", fontSize:12, textAlign:"left", cursor:"pointer", letterSpacing:3, fontWeight:800, textTransform:"uppercase" }}>
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
          <span style={{ color:ACC, fontSize:10, letterSpacing:6, fontWeight:800, textTransform:"uppercase", marginBottom:20, display:"block" }}>
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
                style={{ background:ACC, color:DARK, border:"none", padding:"16px 36px", fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor:"pointer" }}>
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
          <div style={{ position:"absolute", top:36, right:36, background:ACC, color:DARK, padding:"12px 20px", fontWeight:900, fontSize:10, letterSpacing:4, textTransform:"uppercase" }}>
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
                <p style={{ color:ACC, fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", margin:0 }}>Ver colección →</p>
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
            <span style={{ fontSize:9, letterSpacing:5, color:ACC, textTransform:"uppercase", fontWeight:900, background:"rgba(212,255,0,0.1)", padding:"5px 14px", borderRadius:2 }}>⚡ Tienda mayorista</span>
            <h2 style={{ fontSize:"clamp(28px,4vw,52px)", fontWeight:900, color:WHITE, margin:0, textTransform:"uppercase", letterSpacing:"-1px", lineHeight:1.05 }}>
              SOLICITÁ TU<br/><span style={{ color:ACC }}>LISTA DE PRECIOS</span>
            </h2>
            <p style={{ fontSize:13, color:"rgba(255,255,255,0.5)", maxWidth:460, margin:0, lineHeight:1.7, letterSpacing:"0.2px" }}>
              Precios exclusivos para revendedores y distribuidores. Completá el formulario de contacto y te respondemos con tu lista personalizada en menos de 24 hs.
            </p>
            <button onClick={() => scrollTo("contacto")}
              style={{ background:ACC, color:DARK, border:"none", padding:"14px 44px", fontSize:10, fontWeight:900, letterSpacing:4, textTransform:"uppercase", cursor:"pointer", borderRadius:2, marginTop:4 }}>
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
              <span style={{ position:"absolute", top:20, left:20, background:ACC, color:DARK, padding:"6px 14px", fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase" }}>
                {featuredProduct.badge}
              </span>
            )}
          </div>
          <div style={{ padding: isMobile ? "28px 20px" : "60px 56px" }}>
            <span style={{ color:ACC, fontSize:10, letterSpacing:6, fontWeight:800, textTransform:"uppercase", display:"block", marginBottom:16 }}>
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
            <div style={{ display:"flex", alignItems:"baseline", gap:16, marginBottom:32 }}>
              <span style={{ color:ACC, fontSize:36, fontWeight:900 }}>{ocultarPrecios ? "Consultá precio" : fmt(featuredProduct.price)}</span>
              {!ocultarPrecios && featuredProduct.comparePrice && <span style={{ color:featuredText, opacity:0.25, fontSize:20, textDecoration:"line-through" }}>{fmt(featuredProduct.comparePrice)}</span>}
            </div>
            <button onClick={() => isInquiryMode ? openInquiry(featuredProduct) : openModal(featuredProduct)}
              style={{ width:"100%", background:ACC, color:DARK, border:"none", padding:"18px", fontSize:11, fontWeight:900, letterSpacing:4, textTransform:"uppercase", cursor:"pointer" }}>
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
                  if (promo.primaryPromo) return <PromoTag label={describePromo(promo.primaryPromo).headline} size={big ? "md" : "sm"} />;
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
                    <span style={{ display:"inline-block", marginTop:8, background: product.badge === "Sale" ? RED : DARK, color: product.badge === "Sale" ? WHITE : ACC, padding:"3px 10px", fontSize:9, fontWeight:900, letterSpacing:3, textTransform:"uppercase" }}>
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
            style={{ display:"inline-block", background:productosTextUp, color:productosBgUp, border:`3px solid ${productosTextUp}`, padding:"16px 52px", fontSize:11, fontWeight:900, letterSpacing:4, textTransform:"uppercase", textDecoration:"none", transition:"all 0.2s" }}
            onMouseEnter={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=productosTextUp; }}
            onMouseLeave={e=>{ e.currentTarget.style.background=productosTextUp; e.currentTarget.style.color=productosBgUp; }}>
            Ver colección completa
          </a>
        </div>
        </div>
      </section>
      </SectionBlock>

      {/* TESTIMONIALS */}
      <SectionBlock id="up-testimonios" label="Testimonios" isPreview={isPreview} defaultOrder={UP_SECTION_IDS}>
      <section data-reveal style={{ background:testimonialsBgUp, padding:"80px 0", position:"relative" }}>
        <EditableSectionBg field="bgTestimonios" label="Fondo testimonios" />
        <div style={{ padding:"0 40px", marginBottom:36, position:"relative", zIndex:1 }}>
          <h2 style={{ color:testimonialsText, fontSize:"clamp(30px,3.5vw,42px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-1px", margin:0 }}>
            <EditableZone field="testimonialsHeading" label="Título testimonios">Lo que dicen nuestros clientes</EditableZone>
          </h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4,1fr)", gap:12, padding:"0 40px", position:"relative", zIndex:1 }}>
          {TESTIMONIALS.map((t, i) => {
            const starsVal = Math.min(5, Math.max(1, parseInt(textOverrides[`testimonial${i+1}Stars`]?.text ?? String(t.stars)) || t.stars));
            return (
              <div key={i} style={{ background:testimonialsCardBg, border:`1px solid ${testimonialsCardBorder}`, padding:"28px" }}>
                <div style={{ display:"flex", gap:3, marginBottom:14, cursor: editMode ? "pointer" : "default" }}
                  onClick={() => editMode && setOverride(`testimonial${i+1}Stars`, { text: String(starsVal < 5 ? starsVal + 1 : 1) })}
                  title={editMode ? "Click para cambiar estrellas" : undefined}>
                  {Array.from({length:5}).map((_,si) => (
                    <svg key={si} width={13} height={13} viewBox="0 0 24 24" fill={si < starsVal ? ACC : testimonialsMid} stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  ))}
                  {editMode && <span style={{ fontSize:9, color:testimonialsMid, marginLeft:4, alignSelf:"center" }}>↑</span>}
                </div>
                <p style={{ color:testimonialsMid, fontSize:13, lineHeight:1.7, margin:"0 0 18px" }}>
                  &quot;<EditableZone field={`testimonial${i+1}Text`} label={`Testimonio ${i+1} — Texto`}>{t.text}</EditableZone>&quot;
                </p>
                <p style={{ color:ACC, fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", margin:0 }}>
                  <EditableZone field={`testimonial${i+1}Name`} label={`Testimonio ${i+1} — Nombre`}>{t.name}</EditableZone>
                </p>
              </div>
            );
          })}
        </div>
      </section>
      </SectionBlock>

      {/* OFERTAS */}
      <SectionBlock id="up-ofertas" label="Ofertas" isPreview={isPreview} defaultOrder={UP_SECTION_IDS}>
        {(() => {
          const allOfertas = products.filter(p => p.comparePrice && p.comparePrice > p.price);
          if (allOfertas.length === 0 && !isPreview) return null;
          const displayList = (allOfertas.length > 0 ? allOfertas : products).slice(0, 8);
          const hasMore = allOfertas.length > 8;
          return (
            <section data-reveal style={{ position:"relative", background:ofertasBgUp, padding: isMobile ? "48px 16px" : "80px 40px", borderTop:`3px solid ${DARK}` }}>
              <EditableSectionBg field="bgOfertas" label="Fondo ofertas" />
              <div style={{ maxWidth:1200, margin:"0 auto" }}>
                <div style={{ marginBottom:32 }}>
                  <p style={{ fontSize:9, letterSpacing:5, color:ACC, textTransform:"uppercase", fontWeight:900, margin:"0 0 8px" }}><EditableZone field="ofertasKicker" label="Texto sobre Ofertas">Aprovechá</EditableZone></p>
                  <h2 style={{ fontSize:"clamp(32px,4vw,44px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-1px", margin:0, color:ofertasTextUp }}><EditableZone field="ofertasTitle" label="Título Ofertas">Ofertas</EditableZone></h2>
                </div>
                <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap:2 }}>
                  {displayList.map(p => {
                    const pct = p.comparePrice && p.comparePrice > p.price ? Math.round((1 - p.price / p.comparePrice) * 100) : null;
                    return (
                      <div key={p.id} onClick={() => openModal(p)} className="up-zoom" style={{ cursor:"pointer" }}>
                        <div style={{ position:"relative", width:"100%", aspectRatio:"3/4", background:DARK, overflow:"hidden" }}>
                          {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="up-zoom-img" style={{ objectFit:"cover" }} />}
                          {pct && <span style={{ position:"absolute", top:0, left:0, background:ACC, color:DARK, fontSize:10, fontWeight:900, padding:"5px 10px", letterSpacing:1 }}>-{pct}%</span>}
                        </div>
                        <div style={{ padding:"10px 0 0" }}>
                          <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:ofertasTextUp, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical" as const }}>{p.name}</p>
                          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                            <span style={{ fontSize:13, fontWeight:900, color:ACC }}>{ocultarPrecios ? "Consultá" : fmt(p.price)}</span>
                            {p.comparePrice && p.comparePrice > p.price && <span style={{ fontSize:11, color:MID, textDecoration:"line-through" }}>{fmt(p.comparePrice)}</span>}
                          </div>
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
                  <p style={{ fontSize:9, letterSpacing:5, color:ACC, textTransform:"uppercase", fontWeight:900, margin:"0 0 8px" }}><EditableZone field="masVistoKicker" label="Texto sobre Lo más visto">Tendencia</EditableZone></p>
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
                      </div>
                      <div style={{ padding:"10px 0 0" }}>
                        <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:masVistoTextUp, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical" as const }}>{p.name}</p>
                        <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                          <span style={{ fontSize:13, fontWeight:900, color:ACC }}>{ocultarPrecios ? "Consultá" : fmt(p.price)}</span>
                          {!ocultarPrecios && p.comparePrice && p.comparePrice > p.price && <span style={{ fontSize:11, color:MID, textDecoration:"line-through" }}>{fmt(p.comparePrice)}</span>}
                        </div>
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
          <div style={{ position:"absolute", bottom:-16, left:-16, background:ACC, padding:"20px 28px" }}>
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
            <span style={{ color:ACC, fontSize:10, letterSpacing:6, fontWeight:800, textTransform:"uppercase", display:"block", marginBottom:16 }}><EditableZone field="contactKicker" label="Etiqueta contacto">▶ Contacto</EditableZone></span>
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
                buttonStyle: { background:ACC, color:DARK, padding:"18px", fontSize:11, fontWeight:900, letterSpacing:4, textTransform:"uppercase" },
              }}
              renderSent={reset => (
                <div style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", border:`2px solid ${ACC}`, padding:40 }}>
                  <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom:16 }}><polyline points="20 6 9 17 4 12"/></svg>
                  <p style={{ color:contactUpText, fontSize:20, fontWeight:900, textTransform:"uppercase", margin:"0 0 8px" }}>¡Mensaje enviado!</p>
                  <p style={{ color:contactUpText, opacity:0.45, fontSize:13, margin:"0 0 16px" }}>Te respondemos pronto.</p>
                  <button onClick={reset} style={{ background:"transparent", color:ACC, border:`1px solid ${ACC}`, padding:"9px 24px", fontSize:11, letterSpacing:2, cursor:"pointer", textTransform:"uppercase" }}>Enviar otro</button>
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
                  {storeConfig?.storeName ?? <span>URBAN<span style={{ color:ACC }}>PULSE</span></span>}
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
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={getContrastColor(ACC)==="light"?"#fff":DARK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{CART_ICON_OPTIONS[cartIconIdx]}</svg>
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
        <div className="up-fade" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.96)", zIndex:1000, padding:"80px 40px 40px", overflowY:"auto" }}>
          <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} aria-label="Cerrar búsqueda" style={{ position:"absolute", top:24, right:28, background:"none", border:"none", color:WHITE, fontSize:28, cursor:"pointer" }}>✕</button>
          <div style={{ maxWidth:680, margin:"0 auto" }}>
            <p style={{ color:"rgba(255,255,255,0.4)", fontSize:10, letterSpacing:6, fontWeight:800, textTransform:"uppercase", marginBottom:20 }}>Buscar</p>
            <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar productos..."
              style={{ width:"100%", background:"none", border:"none", borderBottom:`3px solid ${ACC}`, color:WHITE, fontSize:32, fontWeight:900, padding:"12px 0", outline:"none", fontFamily:"inherit", letterSpacing:"-0.5px" }} />
            <div style={{ marginTop:40, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {(searchQuery.trim() ? searchResults : products.slice(0,4)).map(p => (
                <div key={p.id} onClick={() => { openModal(p); setSearchQuery(""); }}
                  style={{ display:"flex", gap:14, cursor:"pointer", padding:14, background:"rgba(255,255,255,0.05)" }}>
                  {p.images[0] ? <FadeImage src={p.images[0]} alt={p.name} width={56} height={72} style={{ objectFit:"cover", flexShrink:0 }} /> : <div style={{ width:56, height:72, flexShrink:0, background:BG }} />}
                  <div>
                    <p style={{ color:"rgba(255,255,255,0.4)", fontSize:10, fontWeight:800, letterSpacing:2, textTransform:"uppercase", margin:0 }}>{p.category}</p>
                    <p style={{ color:WHITE, fontSize:13, fontWeight:800, margin:"5px 0 4px" }}>{p.name}</p>
                    <p style={{ color:ACC, fontWeight:900, fontSize:13, margin:0 }}>{ocultarPrecios ? "Consultá precio" : fmt(p.price)}</p>
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
          <div style={{ position:"absolute", right:0, top:0, bottom:0, width:400, background:WHITE, display:"flex", flexDirection:"column" }}>
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
                      <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:10 }}>
                        <p style={{ margin:0, fontSize:14, fontWeight:900 }}>{ocultarPrecios ? "Consultá precio" : fmt(p.price)}</p>
                        {!ocultarPrecios && p.comparePrice && p.comparePrice > p.price && <p style={{ margin:0, fontSize:11, color:MID, textDecoration:"line-through" }}>{fmt(p.comparePrice)}</p>}
                      </div>
                      <button onClick={() => openModal(p)} style={{ background:DARK, color:ACC, border:"none", padding:"7px 14px", fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase", cursor:"pointer" }}>Ver</button>
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
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
            <div style={{ background:WHITE, width:"100%", maxWidth:860, maxHeight: isPreview ? "100%" : "92vh", overflow:"hidden", display:"flex", flexDirection:"column", position:"relative" }}>
              <button onClick={() => { setModalProduct(null); setLightboxSrc(null); }} aria-label="Cerrar" style={{ position:"absolute", top:0, right:0, background:DARK, border:"none", color:ACC, width:40, height:40, fontSize:18, cursor:"pointer", zIndex:10, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
              <div style={{ overflow:"auto", flex:1, minHeight:0, display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
              <div>
                <div style={{ position:"relative", width:"100%", aspectRatio:"3/4" }} {...imgSwipe}>
                  {modalProduct.images[modalImg] && (
                    <FadeImage src={modalProduct.images[modalImg]} alt={modalProduct.name} fill sizes="(max-width: 768px) 100vw, 420px" style={{ objectFit:"cover", cursor:"zoom-in" }}
                      onClick={() => setLightboxSrc(modalProduct.images[modalImg])} />
                  )}
                  {(() => {
                    if (modalPromo?.primaryPromo) return <PromoTag label={describePromo(modalPromo.primaryPromo).headline} />;
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
                {modalProduct.images.length > 1 && (
                  <div style={{ display:"flex", gap:4, padding:4 }}>
                    {modalProduct.images.map((img, i) => (
                      <FadeImage key={i} src={img} alt="" onClick={() => setModalImg(i)} width={58} height={68}
                        style={{ objectFit:"cover", cursor:"pointer", border: i === modalImg ? `2px solid ${DARK}` : "2px solid transparent", opacity: i === modalImg ? 1 : 0.5 }} />
                    ))}
                  </div>
                )}
                {modalProduct.reelUrls.length > 0 && (
                  <div style={{ borderTop:`2px solid ${DARK}`, padding:"14px 8px 8px" }}>
                    <p style={{ fontSize:9, letterSpacing:3, fontWeight:900, textTransform:"uppercase", marginBottom:10, color:DARK, opacity:0.4, paddingLeft:4 }}>Videos</p>
                    <StoreProductReels
                      reelUrls={modalProduct.reelUrls}
                      theme={{ accent: ACC, text: DARK, border: DARK, radius: 0 }}
                    />
                  </div>
                )}
              </div>
              <div style={{ padding:32 }}>
                <p style={{ margin:"0 0 6px", fontSize:10, color:MID, fontWeight:800, letterSpacing:3, textTransform:"uppercase" }}>{modalProduct.category}</p>
                <h3 style={{ margin:"0 0 10px", fontSize:24, fontWeight:900, textTransform:"uppercase", letterSpacing:"-0.5px" }}>{modalProduct.name}</h3>
                <div style={{ display:"flex", gap:6, marginBottom:18 }}>
                  <button onClick={() => shareProduct(modalProduct)}
                    style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", color:MID, padding:"5px 12px", fontSize:9, fontWeight:900, letterSpacing:1.5, textTransform:"uppercase", cursor:"pointer", transition:"color 0.2s" }}
                    onMouseEnter={e=>(e.currentTarget.style.color=WHITE)} onMouseLeave={e=>(e.currentTarget.style.color=MID)}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    Copiar link
                  </button>
                  {hasWA && (
                  <button onClick={() => whatsappShare(modalProduct)}
                    style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(37,211,102,0.08)", border:"1px solid rgba(37,211,102,0.25)", color:"rgba(37,211,102,0.7)", padding:"5px 12px", fontSize:9, fontWeight:900, letterSpacing:1.5, textTransform:"uppercase", cursor:"pointer", transition:"color 0.2s" }}
                    onMouseEnter={e=>(e.currentTarget.style.color="#25D366")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(37,211,102,0.7)")}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M11.897 0C5.395 0 .13 5.266.13 11.767c0 2.078.545 4.03 1.495 5.727L.057 24l6.7-1.757A11.71 11.71 0 0 0 11.897 23.534c6.503 0 11.768-5.265 11.768-11.767C23.67 5.266 18.4 0 11.897 0zm0 21.536h-.004a9.726 9.726 0 0 1-4.96-1.358l-.356-.211-3.678.965.982-3.581-.232-.368A9.73 9.73 0 0 1 2.158 11.767C2.158 6.355 6.551 2 11.897 2c2.581 0 5.007 1.007 6.831 2.831a9.604 9.604 0 0 1 2.828 6.83c0 5.347-4.393 9.875-9.659 9.875z"/></svg>
                    WhatsApp
                  </button>
                  )}
                </div>
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
                {modalPromo?.primaryPromo && <div style={{ marginBottom:16 }}><PromoBlock promo={modalPromo.primaryPromo} freeShippingExtra={modalPromo.freeShipping} /></div>}
                {!ocultarPrecios && modalProduct.offerNote && (
                  <div style={{ fontSize:12, color:"#f97316", background:"rgba(249,115,22,0.08)", border:"1px solid rgba(249,115,22,0.25)", borderRadius:4, padding:"5px 10px", display:"flex", alignItems:"center", gap:6 }}>
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>{modalProduct.offerNote}</span>
                  </div>
                )}
                {modalProduct.description && (
                  <div style={{ borderTop:`1px solid rgba(248,250,252,0.06)`, paddingTop:16 }}>
                    <p style={{ fontSize:9, letterSpacing:3, textTransform:"uppercase", color:MID, margin:"0 0 8px", fontWeight:700 }}>Descripción</p>
                    <div className="product-rte" dangerouslySetInnerHTML={{ __html: modalProduct.description }} style={{ fontSize:13, color:MID, lineHeight:1.7 }} />
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
                    <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:18 }}>
                      {condicionAttr && (
                        <span style={{ alignSelf:"flex-start", fontSize:9, letterSpacing:1.5, textTransform:"uppercase", fontWeight:900, color:DARK, background:ACC, padding:"5px 10px" }}>{condicionAttr.value}</span>
                      )}
                      {otherAttrs.length > 0 && (
                        <div style={{ borderRadius:2, overflow:"hidden", border:`2px solid ${DARK}` }}>
                          {otherAttrs.map((a, i) => (
                            <div key={a.key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 12px", background: i%2===0 ? `${DARK}08` : WHITE, borderBottom: i < otherAttrs.length-1 ? `1px solid ${DARK}15` : "none" }}>
                              <span style={{ fontSize:9, fontWeight:900, color:DARK, textTransform:"uppercase", letterSpacing:0.5 }}>{a.key}</span>
                              <span style={{ fontSize:12, color:DARK, fontWeight:700 }}>{a.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {servicios.length > 0 && (
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                          {servicios.map(k => (
                            <span key={k} style={{ fontSize:9, letterSpacing:1, padding:"4px 10px", border:`2px solid ${DARK}`, color:DARK, fontWeight:800 }}>✓ {k}</span>
                          ))}
                        </div>
                      )}
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
                          style={{ border:`2px solid ${selectedSize === s ? DARK : "#ddd"}`, background: selectedSize === s ? DARK : WHITE, color: selectedSize === s ? ACC : DARK, padding:"7px 13px", fontSize:11, fontWeight:800, cursor:"pointer", letterSpacing:1, opacity: outOfStock ? 0.35 : 1, textDecoration: outOfStock ? "line-through" : "none" }}>
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
                    style={{ width:"100%", background:DARK, color:ACC, border:"none", padding:"16px", fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", marginBottom:10 }}>
                    Consultar disponibilidad
                  </button>
                ) : (
                  <button onClick={addToCart} disabled={selectedVariantStock === 0}
                    style={{ width:"100%", background: selectedVariantStock === 0 ? "#555" : DARK, color:ACC, border:"none", padding:"16px", fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor: selectedVariantStock === 0 ? "not-allowed" : "pointer", marginBottom:10 }}>
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

                {/* Reseñas — D-04 */}
                <div style={{ borderTop:`2px solid ${DARK}`, paddingTop:24, marginTop:20 }}>
                  <p style={{ fontSize:9, letterSpacing:3, fontWeight:900, textTransform:"uppercase", color:MID, margin:"0 0 20px" }}>
                    Reseñas{reviews.length > 0 && ` (${reviews.length})`}
                  </p>
                  {reviewsLoading ? (
                    <p style={{ fontSize:12, color:MID }}>Cargando...</p>
                  ) : reviews.length > 0 ? (
                    <div style={{ marginBottom:24 }}>
                      {(() => {
                        const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
                        const dist = [5,4,3,2,1].map(s => ({ stars:s, count: reviews.filter(r => r.rating === s).length }));
                        return (
                          <div style={{ display:"flex", gap:20, alignItems:"center", marginBottom:20, padding:"14px 16px", background:BG, border:`2px solid ${DARK}` }}>
                            <div style={{ textAlign:"center", minWidth:56 }}>
                              <p style={{ fontSize:34, fontWeight:900, color:DARK, margin:0, lineHeight:1 }}>{avg.toFixed(1)}</p>
                              <div style={{ display:"flex", gap:2, justifyContent:"center", margin:"6px 0 4px" }}>
                                {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize:11, color: s <= Math.round(avg) ? ACC : DARK }}>★</span>)}
                              </div>
                              <p style={{ fontSize:9, color:MID, margin:0, fontWeight:700, letterSpacing:0.5, textTransform:"uppercase" }}>{reviews.length} reseña{reviews.length !== 1 ? "s" : ""}</p>
                            </div>
                            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}>
                              {dist.map(d => (
                                <div key={d.stars} style={{ display:"flex", alignItems:"center", gap:8 }}>
                                  <span style={{ fontSize:9, color:ACC, minWidth:14, textAlign:"right", fontWeight:900 }}>{d.stars}★</span>
                                  <div style={{ flex:1, height:4, background:`${DARK}18`, borderRadius:0, overflow:"hidden" }}>
                                    <div style={{ height:"100%", width:`${reviews.length ? (d.count / reviews.length) * 100 : 0}%`, background:ACC, borderRadius:0 }} />
                                  </div>
                                  <span style={{ fontSize:9, color:MID, minWidth:12, textAlign:"right", fontWeight:700 }}>{d.count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      <div style={{ display:"flex", flexDirection:"column" }}>
                        {reviews.slice(0, reviewsShown).map((r, i) => (
                          <div key={r.id} style={{ display:"flex", gap:12, padding:"16px 0", borderBottom: i < Math.min(reviewsShown, reviews.length) - 1 ? `1px solid ${DARK}` : "none" }}>
                            <div style={{ width:34, height:34, borderRadius:0, flexShrink:0, background:`${ACC}18`, border:`1px solid ${ACC}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, color:ACC, textTransform:"uppercase" }}>
                              {r.reviewer.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex:1 }}>
                              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                                  <span style={{ fontSize:12, fontWeight:900, textTransform:"uppercase" }}>{r.reviewer}</span>
                                  {r.verified && (
                                    <span style={{ fontSize:9, fontWeight:900, color:ACC, border:`1px solid ${ACC}`, padding:"1px 5px", letterSpacing:0.5, textTransform:"uppercase" }}>✓ Verificada</span>
                                  )}
                                </div>
                                <span style={{ fontSize:9, color:MID, fontWeight:700 }}>{new Date(r.createdAt).toLocaleDateString("es-AR", { day:"numeric", month:"short", year:"numeric" })}</span>
                              </div>
                              <div style={{ display:"flex", gap:1, marginBottom: r.comment ? 8 : 0 }}>
                                {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize:12, color: s <= r.rating ? ACC : `${DARK}30` }}>★</span>)}
                              </div>
                              {r.comment && <p style={{ fontSize:12, color:MID, margin:0, lineHeight:1.6 }}>{r.comment}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                      {reviews.length > reviewsShown && (
                        <button onClick={() => setReviewsShown(n => n + 10)} style={{ marginTop:14, background:"none", border:`2px solid ${DARK}`, color:ACC, fontSize:9, fontWeight:900, letterSpacing:2, cursor:"pointer", padding:"8px 20px", textTransform:"uppercase", display:"block" }}>
                          Ver más ({reviews.length - reviewsShown})
                        </button>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontSize:12, color:MID, marginBottom:16 }}>Sé el primero en dejar una reseña.</p>
                  )}
                  {isOwner ? (
                    <p style={{ fontSize:11, color:MID, fontStyle:"italic" }}>El dueño no puede dejar reseñas en su propia tienda.</p>
                  ) : reviewDone ? (
                    <p style={{ fontSize:12, color:ACC, fontWeight:900 }}>¡Gracias por tu reseña!</p>
                  ) : (
                    <div style={{ position:"relative" }}>
                      {isPreview && <div style={{ position:"absolute", inset:0, zIndex:10, cursor:"default" }} onClick={e => e.stopPropagation()} />}
                      <form onSubmit={isPreview ? e => e.preventDefault() : submitReview} style={{ display:"flex", flexDirection:"column", gap:10, opacity: isPreview ? 0.55 : 1 }}>
                        <input value={reviewForm.reviewer} onChange={e => !isPreview && setReviewForm(p => ({ ...p, reviewer: e.target.value }))}
                          placeholder="Tu nombre" readOnly={isPreview}
                          style={{ background:"none", border:`2px solid ${DARK}`, padding:"9px 12px", fontSize:12, fontWeight:600, outline:"none" }} />
                        <div>
                          <input value={reviewForm.email} onChange={e => !isPreview && setReviewForm(p => ({ ...p, email: e.target.value }))}
                            placeholder="Tu email (opcional — verifica tu compra)" type="email" readOnly={isPreview} autoComplete="email"
                            style={{ width:"100%", boxSizing:"border-box", background:"none", border:`2px solid ${DARK}`, padding:"9px 12px", fontSize:12, fontWeight:600, outline:"none" }} />
                          <p style={{ fontSize:9, color:MID, margin:"3px 0 0", fontWeight:700, letterSpacing:0.5, textTransform:"uppercase", lineHeight:1.4 }}>
                            Si compraste acá, tu reseña mostrará ✓ VERIFICADA. El email no se publica.
                          </p>
                        </div>
                        <div style={{ display:"flex", gap:4 }}>
                          {[1,2,3,4,5].map(s => (
                            <button key={s} type="button" onClick={() => !isPreview && setReviewForm(p => ({ ...p, rating: s }))}
                              style={{ background:"none", border:"none", fontSize:20, cursor: isPreview ? "default" : "pointer", color: s <= reviewForm.rating ? ACC : DARK, padding:"2px" }}>★</button>
                          ))}
                        </div>
                        <textarea value={reviewForm.comment} onChange={e => !isPreview && setReviewForm(p => ({ ...p, comment: e.target.value }))}
                          placeholder="Comentario (opcional)" rows={3} readOnly={isPreview}
                          style={{ background:"none", border:`2px solid ${DARK}`, padding:"9px 12px", fontSize:12, resize:"none", outline:"none" }} />
                        {!isPreview && reviewCaptcha.widget}
                        <button type="submit" disabled={isPreview || reviewSubmitting || !reviewForm.reviewer.trim() || !reviewCaptcha.ready}
                          style={{ background: isPreview || reviewSubmitting || !reviewForm.reviewer.trim() ? MID : DARK, color:ACC, border:"none", padding:"12px", fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor: isPreview ? "default" : "pointer" }}>
                          {reviewSubmitting ? "Publicando..." : "Publicar reseña"}
                        </button>
                      </form>
                      {isPreview && <p style={{ fontSize:10, color:MID, fontStyle:"italic", marginTop:6 }}>Vista previa — solo disponible en la tienda real.</p>}
                    </div>
                  )}
                </div>
              </div>
              {(() => {
                if (similarProducts.length === 0) return null;
                return (
                  <div style={{ gridColumn: isMobile ? undefined : "1 / -1", padding:32, borderTop:"1px solid #f0f0f0" }}>
                    <p style={{ margin:"0 0 16px", fontSize:10, color:MID, fontWeight:800, letterSpacing:3, textTransform:"uppercase" }}>Productos similares</p>
                    <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap:14 }}>
                      {similarProducts.map(p => (
                        <div key={p.id} onClick={() => openModal(p)} style={{ cursor:"pointer" }}>
                          <div style={{ position:"relative", width:"100%", aspectRatio:"3/4", background:BG }}>
                            {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes="(max-width: 768px) 50vw, 25vw" style={{ objectFit:"cover" }} />}
                          </div>
                          <p style={{ margin:"8px 0 2px", fontSize:12, color:DARK, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical" as const }}>{p.name}</p>
                          <p style={{ margin:0, fontSize:13, fontWeight:900, color:DARK }}>{ocultarPrecios ? "Consultá precio" : fmt(p.price)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
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
                    style={{ width:"100%", background:DARK, color:ACC, border:"none", padding:"16px", fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor:"pointer" }}>
                    Consultar disponibilidad
                  </button>
                ) : (
                  <button onClick={addToCart} disabled={selectedVariantStock === 0}
                    style={{ width:"100%", background: selectedVariantStock === 0 ? "#555" : DARK, color:ACC, border:"none", padding:"16px", fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor: selectedVariantStock === 0 ? "not-allowed" : "pointer" }}>
                    {selectedVariantStock === 0 ? "Sin stock" : "Agregar al Carrito"}
                  </button>
                )}
              </div>
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
          <img src={lightboxSrc} alt="" style={{ maxWidth:"100vw", maxHeight:"100vh", objectFit:"contain", touchAction:"pinch-zoom" }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxSrc(null)} aria-label="Cerrar" style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", width:44, height:44, borderRadius:"50%", fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
      )}
    </div>
  );
}
