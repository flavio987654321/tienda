"use client";
import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { usePushBell } from "@/contexts/PushBellContext";
import { useAuth } from "@/components/AuthProvider";
import StoreFollowButton from "@/components/store/StoreFollowButton";
import { EditableZone, EditableImageButton, EditableSectionBg, getContrastColor, useEditContext } from "@/contexts/EditContext";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useCartLogic } from "@/hooks/useCartLogic";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
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
import { parseVariantAttrs } from "@/lib/variantAttrs";
import { colorToSwatch } from "@/lib/colorSwatch";
import { discountPercent } from "@/lib/discount";
import { resolveVariantPrice } from "@/lib/variantPrice";
import { useTurnstile } from "@/components/Turnstile";

type Product = StorefrontProduct;

const SIZE_ATTRS = ["talle","size","talla","talles","sizes","tamaño","tamano","almacenamiento","ram","versión","version","formato","variante","material","sabor","peso/tamaño","peso"];

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

export default function ChicParis() {
  const [scrolled,        setScrolled]        = useState(false);
  const [activeCategory,  setActiveCategory]  = useState("Todos");
  const [activeGender,    setActiveGender]    = useState<string | null>(null);
  const [hoveredNavCat,   setHoveredNavCat]   = useState<string | null>(null);
  const [visibleCount,    setVisibleCount]    = useState(8);
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
  type PReview = { id: string; rating: number; comment: string | null; reviewer: string; verified: boolean; verifiedBy: string | null; createdAt: string; product?: { name: string; image: string | null } };
  type HomeReview = PReview;
  const [reviews,        setReviews]        = useState<PReview[]>([]);
  const [homeReviews,    setHomeReviews]    = useState<HomeReview[]>([]);
  const [reviewsShown,   setReviewsShown]   = useState(5);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewForm,     setReviewForm]     = useState({ reviewer: "", rating: 5, comment: "", email: "" });
  const reviewCaptcha = useTurnstile("review");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone,     setReviewDone]     = useState(false);
  const [reviewHoneypot, setReviewHoneypot] = useState("");
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
  const { editMode, activeField, setActiveField, overrides: textOverrides, setOverride } = useEditContext();
  const isInquiryMode = checkoutMode === "inquiry" || ocultarPrecios;

  const categoryList = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(c => c && c !== "general"))];
    const base = cats.length > 0 ? cats : defaultCategories.slice(0, 6);
    return featuredCategories.length > 0 ? base.filter(c => featuredCategories.includes(c)) : base;
  }, [products, defaultCategories, featuredCategories]);

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
  const accentText = getContrastColor(ACC) === "light" ? "#fff" : "#111";
  const cartTheme: CartTheme = { BG:"#ffffff", S:"#fafafa", T:"#111111", MID:"#999999", border:"#e5e5e5", accent:ACC, accentText };
  const variantPrice = modalProduct ? resolveVariantPrice(modalProduct.variants, selectedSize, selectedColor) : null;
  const displayPrice = variantPrice ?? (modalProduct?.price ?? 0);
  const modalPromo = modalProduct ? resolveProductPromo({ id: modalProduct.id, price: displayPrice, category: modalProduct.category }, promotions) : null;
  // 3×2 en vivo: unidades que se PAGAN a la cantidad elegida (misma cuenta que el motor).
  const nxmPaid = modalPromo?.nxm ? qty - Math.floor(qty / modalPromo.nxm.n) * (modalPromo.nxm.n - modalPromo.nxm.m) : null;
  const imgSwipe = useTouchSwipe(
    () => { if (modalProduct) setModalImg(i => (i + 1) % modalProduct.images.length); },
    () => { if (modalProduct) setModalImg(i => (i - 1 + modalProduct.images.length) % modalProduct.images.length); }
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

  // Cargar reseñas de la home (prueba social)
  useEffect(() => {
    const slug = storeConfig?.slug;
    if (!slug) return;
    fetch(`/api/public/${slug}/reviews`)
      .then(r => r.ok ? r.json() : { reviews: [] })
      .then(d => setHomeReviews(d.reviews ?? []))
      .catch(() => {});
  }, [storeConfig?.slug]);

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
    if (isPreview || isOwner || reviewHoneypot) return;
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

  const similarProducts = useMemo(() => {
    if (!modalProduct) return [];
    const others = products.filter(p => p.id !== modalProduct.id);
    const sameSub = modalProduct.subcategory ? others.filter(p => p.subcategory === modalProduct.subcategory) : [];
    const sameCat = others.filter(p => p.category === modalProduct.category && !sameSub.includes(p));
    const rest = others.filter(p => !sameSub.includes(p) && !sameCat.includes(p));
    return [...sameSub, ...sameCat, ...rest].slice(0, 4);
  }, [products, modalProduct]);

  // Banner slide images
  const bannerImgs = Array.from({ length: BANNER_COUNT }, (_, i) =>
    storeConfig?.imageOverrides?.[`heroBanner${i + 1}`]
  );

  useScrollReveal();

  return (
    <div style={{ fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif", background: "#fff", color: "#111", minHeight: "100vh" }}>
      <style>{`
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
          height: PROMO_BAR_H, background: "#111",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", letterSpacing: 1 }}>
            {announcementMessages[announcementIdx]}
          </span>
          {announcementMessages.length > 1 && (
            <div style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4 }}>
              {announcementMessages.map((_, i) => (
                <button key={i} onClick={() => setAnnouncementIdx(i)}
                  style={{ width: i === announcementIdx ? 14 : 5, height: 3, border: "none", borderRadius: 2, background: i === announcementIdx ? "#fff" : "rgba(255,255,255,0.3)", cursor: "pointer", padding: 0, transition: "all 0.3s" }} />
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
            {/* CATEGORÍAS dropdown */}
            <div style={{ position: "relative" }}
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
            </div>
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
                    }} style={{ display: "flex", width: "100%", background: "#fafafa", border: "none", borderBottom: "1px solid #f0f0f0", color: activeCategory===cat ? ACC : "#111", padding: "13px 24px 13px 40px", fontSize: 11, textAlign: "left", cursor: "pointer", letterSpacing: 2, fontWeight: 600, textTransform: "uppercase", alignItems: "center", justifyContent: "space-between" }}>
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
      <section id="hero" style={{ position: "relative", height: isPreview ? `calc(100vh - ${68 + (showAnnouncement ? PROMO_BAR_H : 0)}px)` : "100vh", background: "#111" }}
        onMouseEnter={() => setHeroPaused(true)}
        onMouseLeave={() => setHeroPaused(false)}
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
              {ov?.url && (
                <FadeImage src={ov.url} alt="" fill sizes="100vw" style={{ objectFit: "cover", objectPosition: `${ov.posX ?? 50}% ${ov.posY ?? 50}%` }} />
              )}
              {overlayGradient && (
                <div style={{ position: "absolute", inset: 0, background: overlayGradient }} />
              )}
              {!hideContent && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: isMobile ? "0 20px" : "0 80px", maxWidth: 640 }}>
                  <span style={{ color: ACC, fontSize: 11, letterSpacing: 5, fontWeight: 700, textTransform: "uppercase", marginBottom: 16 }}>
                    <EditableZone field={`slide${i + 1}Kicker`} label={`Slide ${i + 1} — Kicker`}>Nueva Colección</EditableZone>
                  </span>
                  <h1 style={{ color: "#fff", fontSize: "clamp(36px,5.5vw,72px)", fontWeight: 900, lineHeight: 1.05, margin: "0 0 20px", textTransform: "uppercase", letterSpacing: "-1px" }}>
                    <EditableZone field={`slide${i + 1}Heading`} label={`Slide ${i + 1} — Título`}>
                      {["Diseño que habla por vos.", "Elegancia sin esfuerzo.", "Tu próximo favorito."][i]}
                    </EditableZone>
                  </h1>
                  <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 16, lineHeight: 1.7, margin: "0 0 32px" }}>
                    <EditableZone field={`slide${i + 1}Sub`} label={`Slide ${i + 1} — Subtítulo`}>
                      {["Piezas únicas para cada momento de tu día.", "Colección cuidada para quienes eligen con intención.", "Tendencias de temporada, calidad que dura."][i]}
                    </EditableZone>
                  </p>
                  <div style={{ display: "flex", gap: 12 }}>
                    {(editMode || !storeConfig?.textOverrides?.[`slide${i + 1}Cta`]?.hidden) && (
                      <button onClick={() => scrollTo("productos")} style={{ background: ACC, color: getContrastColor(ACC) === "light" ? "#fff" : "#111", border: "none", padding: "14px 32px", fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer" }}>
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
              )}
              {isActive && <EditableImageButton field={`heroBanner${i + 1}`} label={`Imagen banner ${i + 1}`} />}
            </div>
          );
        })}

        {/* Dots */}
        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 10, zIndex: 10 }}>
          {Array.from({ length: BANNER_COUNT }, (_, i) => (
            <button key={i} onClick={() => goToSlide(i)} style={{
              width: heroSlide === i ? 28 : 8, height: 8, borderRadius: 4, border: "none", padding: 0,
              background: heroSlide === i ? ACC : "rgba(255,255,255,0.45)",
              cursor: "pointer", transition: "all 0.3s ease",
            }} />
          ))}
        </div>

        {/* Arrows */}
        {[[-1, "left", "14px"], [1, "right", "14px"]].map(([dir, side, offset]) => (
          <button key={String(side)} onClick={() => goToSlide((heroSlide + Number(dir) + BANNER_COUNT) % BANNER_COUNT)}
            style={{ position: "absolute", top: "50%", [String(side)]: String(offset), transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 44, height: 44, borderRadius: "50%", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", zIndex: 10, transition: "background 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.3)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}>
            {Number(dir) === -1 ? "‹" : "›"}
          </button>
        ))}
      </section>

      <div style={{ display:"flex", flexDirection:"column" }}>
      <SectionBlock id="cp-strip" label="Garantías" isPreview={isPreview} defaultOrder={CP_SECTION_IDS}>
      {/* ── STRIP ── */}
      <section data-reveal style={{ background: stripBg, borderTop: `1px solid ${stripText === "#111" ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.1)"}`, borderBottom: `1px solid ${stripText === "#111" ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.1)"}`, padding: "20px 40px", position: "relative" }}>
        <EditableSectionBg field="bgStrip" label="Fondo franja garantías" />
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          {STRIP_ITEMS.map(({ slot, titleField, titleDefault, descField, descDefault }) => {
            const iconIdx = (Math.abs(parseInt(textOverrides[`garantia${slot + 1}Icon`]?.text ?? "0") || 0)) % STRIP_ICONS[slot].length;
            const nextIdx = (iconIdx + 1) % STRIP_ICONS[slot].length;
            return (
              <div key={titleField} style={{ display: "flex", alignItems: "center", gap: 14, flex: "1 1 200px" }}>
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
              {activeGender === "mujer" ? "Mujer" : activeGender === "hombre" ? "Hombre" : activeCategory !== "Todos" ? activeCategory : <EditableZone field="productsHeading" label="Título sección productos">Nuestra Colección</EditableZone>}
            </h2>
            <p style={{ fontSize:12, color:prodText, opacity:0.45, margin:"6px 0 0" }}>{allFiltered.length} piezas</p>
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
                  const promo = resolveProductPromo(product, promotions);
                  return (
                  <div key={product.id} className="cp-prod" onClick={() => openModal(product)} style={{ cursor: "pointer", background: "#fff", borderRadius: 4, position: "relative", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    {(() => {
                      if (promo.primaryPromo) return <PromoTag label={describePromo(promo.primaryPromo).headline} size="sm" />;
                      const hasOffer = !!product.comparePrice && product.comparePrice > product.price;
                      if (!hasOffer) return null;
                      return <OfferBadge badge={product.offerBadge} pct={discountPercent(product.price, product.comparePrice)} size="sm" />;
                    })()}
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
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        {ocultarPrecios ? (
                          <span style={{ fontSize: 16, fontWeight: 800, color: ACC }}>Consultá precio</span>
                        ) : promo.hasPriceDrop ? (
                          <>
                            <span style={{ fontSize: 16, fontWeight: 800, color: "#dc2626" }}>{fmt(promo.effectivePrice)}</span>
                            <span style={{ fontSize: 13, color: "#aaa", textDecoration: "line-through" }}>{fmt(promo.originalPrice)}</span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 16, fontWeight: 800, color: ACC }}>{fmt(product.price)}</span>
                            {product.comparePrice && <span style={{ fontSize: 13, color: "#aaa", textDecoration: "line-through" }}>{fmt(product.comparePrice)}</span>}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
              <div style={{ textAlign: "center", marginTop: 48 }}>
                <a href={`/tienda/${storeConfig?.slug}/productos?t=chic-paris${isPreview ? "&from=editor" : ""}`}
                  style={{ display: "inline-block", background: ACC, color: getContrastColor(ACC) === "light" ? "#fff" : "#111", border: `1px solid ${prodText}`, padding: "14px 44px", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", textDecoration: "none", transition: "opacity 0.2s" }}
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
          const allOfertas = products.filter(p => p.comparePrice && p.comparePrice > p.price);
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
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 360px)", justifyContent: "center", gap: isMobile ? 32 : 48 }}>
                    {pageItems.map(p => {
                      const pct = p.comparePrice && p.comparePrice > p.price ? Math.round((1 - p.price / p.comparePrice) * 100) : null;
                      return (
                        <div key={p.id} onClick={() => openModal(p)} className="cp-zoom" style={{ cursor: "pointer", display: "flex", gap: 20, alignItems: "center" }}>
                          <div style={{ position: "relative", width: 140, height: 175, flexShrink: 0, background: "#f5f5f5", overflow: "hidden", borderRadius: 4 }}>
                            {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes="140px" className="cp-zoom-img" style={{ objectFit: "cover" }} />}
                            {pct && (
                              <span style={{ position: "absolute", top: -8, right: -8, width: 42, height: 42, borderRadius: "50%", background: ACC, color: getContrastColor(ACC) === "light" ? "#fff" : "#111", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", lineHeight: 1.1 }}>-{pct}%</span>
                            )}
                          </div>
                          <div>
                            <p style={{ margin: "0 0 8px", fontSize: 16, fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", color: ofertasText }}>{p.name}</p>
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                              <span style={{ fontSize: 16, fontWeight: 800, color: ACC }}>{ocultarPrecios ? "Consultá" : fmt(p.price)}</span>
                              {p.comparePrice && p.comparePrice > p.price && <span style={{ fontSize: 13, color: "#999", textDecoration: "line-through" }}>{fmt(p.comparePrice)}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {totalPages > 1 && page > 0 && (
                    <button onClick={() => setOfertasPage(p => p - 1)} aria-label="Anterior"
                      style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", background: "#fff", border: `1px solid ${ACC}`, color: ACC, width: 44, height: 44, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                  )}
                  {totalPages > 1 && page < totalPages - 1 && (
                    <button onClick={() => setOfertasPage(p => p + 1)} aria-label="Siguiente"
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
          const featured = products.filter(p => p.featured);
          const base = featured.length > 0 ? featured : products;
          const pool = [...base].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
          const displayList = pool.slice(0, 8);
          const hasMore = pool.length > 8;
          if (displayList.length === 0) return null;
          return (
            <section data-reveal style={{ position: "relative", background: masVistoBg, padding: isMobile ? "48px 16px" : "72px 40px", borderTop: "1px solid #f0f0f0" }}>
              <EditableSectionBg field="bgMasVisto" label="Fondo lo más visto" />
              <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                <div style={{ marginBottom: 40 }}>
                  <p style={{ fontSize: 10, letterSpacing: 4, color: ACC, textTransform: "uppercase", fontWeight: 700, margin: "0 0 6px" }}><EditableZone field="masVistoKicker" label="Texto sobre Lo más visto">Tendencia</EditableZone></p>
                  <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(24px,3vw,38px)", fontWeight: 300, fontStyle: "italic", margin: 0, color: masVistoText }}><EditableZone field="masVistoTitle" label="Título Lo más visto">Lo más visto</EditableZone></h2>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 16 }}>
                  {displayList.map((p, idx) => (
                    <div key={p.id} onClick={() => openModal(p)} className="cp-zoom" style={{ cursor: "pointer" }}>
                      <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", background: "#f5f5f5", overflow: "hidden", borderRadius: 4 }}>
                        {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="cp-zoom-img" style={{ objectFit: "cover" }} />}
                        <span style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.65)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "4px 10px" }}>#{idx + 1}</span>
                      </div>
                      <div style={{ padding: "10px 0 0" }}>
                        <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: masVistoText }}>{p.name}</p>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: ACC }}>{ocultarPrecios ? "Consultá" : fmt(p.price)}</span>
                          {!ocultarPrecios && p.comparePrice && p.comparePrice > p.price && <span style={{ fontSize: 11, color: "#aaa", textDecoration: "line-through" }}>{fmt(p.comparePrice)}</span>}
                        </div>
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
          const PREVIEW_REVIEWS: HomeReview[] = [
            { id:"p1", rating:5, comment:"Calidad increíble y llegó rapidísimo. Ya compré tres veces y siempre perfecta.", reviewer:"María L.", verified:true, verifiedBy:"auto", createdAt:"", product:{ name:"Vestido lino", image:null } },
            { id:"p2", rating:5, comment:"El diseño es exactamente como en las fotos. Me enamoré cuando lo vi puesto.", reviewer:"Sofía M.", verified:false, verifiedBy:null, createdAt:"", product:{ name:"Blazer oversize", image:null } },
            { id:"p3", rating:5, comment:"Excelente atención y envío super rápido. La recomiendo sin dudarlo.", reviewer:"Valentina R.", verified:true, verifiedBy:"owner", createdAt:"", product:{ name:"Jean wide leg", image:null } },
            { id:"p4", rating:5, comment:"Super recomendada, el packaging es hermoso y llegó antes de lo esperado.", reviewer:"Camila F.", verified:false, verifiedBy:null, createdAt:"", product:{ name:"Remera seda", image:null } },
          ];
          const allReviews = isPreview ? PREVIEW_REVIEWS : homeReviews;
          if (allReviews.length === 0) return null;
          async function deleteHomeReview(reviewId: string) {
            if (!storeConfig?.slug) return;
            await fetch(`/api/public/${storeConfig.slug}/reviews`, {
              method:"DELETE", headers:{"Content-Type":"application/json"},
              body: JSON.stringify({ reviewId }),
            });
            setHomeReviews(prev => prev.filter(r => r.id !== reviewId));
          }
          return (
            <section data-reveal style={{ position:"relative", background: sc["bgPruebaSocial"] ?? "#fff", padding: isMobile ? "56px 0" : "72px 0", borderTop: "1px solid #f0f0f0" }}>
              <EditableSectionBg field="bgPruebaSocial" label="Fondo prueba social" />
              <div style={{ padding: isMobile ? "0 20px" : "0 40px", marginBottom: 32 }}>
                <p style={{ fontSize: 10, letterSpacing: 4, color: ACC, textTransform: "uppercase", fontWeight: 700, margin: "0 0 8px" }}>{"★ ★ ★ ★ ★"}</p>
                <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(22px,2.5vw,34px)", fontWeight: 300, fontStyle: "italic", margin: 0, color: "#111" }}>
                  <EditableZone field="pruebaSocialTitle" label="Título prueba social">Lo que dicen nuestras clientas</EditableZone>
                </h2>
              </div>
              <div style={{ display: "flex", gap: 16, overflowX: "auto", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", paddingLeft: isMobile ? 20 : 40, paddingRight: isMobile ? 20 : 40, paddingBottom: 8, scrollbarWidth: "none" }}>
                {allReviews.map(r => (
                  <div key={r.id} style={{ flexShrink: 0, width: isMobile ? "85vw" : 300, scrollSnapAlign: "start", background: "#fafafa", border: "1px solid #f0f0f0", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
                    {isOwner && !isPreview && (
                      <button onClick={() => deleteHomeReview(r.id)}
                        style={{ position:"absolute", top:8, right:8, background:"none", border:"none", color:"#e0e0e0", cursor:"pointer", fontSize:15, lineHeight:1, padding:4 }}
                        onMouseEnter={e => (e.currentTarget.style.color="#dc2626")}
                        onMouseLeave={e => (e.currentTarget.style.color="#e0e0e0")}
                        title="Eliminar reseña">×</button>
                    )}
                    <div style={{ display: "flex", gap: 2 }}>
                      {[1,2,3,4,5].map(s => <span key={s} style={{ color: s <= r.rating ? ACC : "#e8e8e8", fontSize: 13 }}>★</span>)}
                    </div>
                    {r.comment && <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#444", lineHeight: 1.75, margin: 0, flex: 1 }}>&ldquo;{r.comment}&rdquo;</p>}
                    <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 12, display:"flex", alignItems:"center", gap:10 }}>
                      {r.product?.image && (
                        <img src={r.product.image} alt={r.product?.name ?? ""} style={{ width:36, height:36, objectFit:"cover", borderRadius:4, border:"1px solid #f0f0f0", flexShrink:0 }} />
                      )}
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: "#111", margin: "0 0 2px", letterSpacing: 1.5, textTransform: "uppercase" }}>{r.reviewer}</p>
                        {r.product?.name && <p style={{ fontSize: 10, color: "#bbb", margin: 0 }}>{r.product.name}</p>}
                        {r.verified && (
                          <p style={{ fontSize: 9, fontWeight: 700, color: "#16a34a", margin: "4px 0 0", letterSpacing: 0.5 }}>✓ Compra verificada</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {allReviews.length > (isMobile ? 1 : 3) && (
                <p style={{ textAlign: "center", fontSize: 10, color: "#ccc", letterSpacing: 2, marginTop: 16, textTransform: "uppercase" }}>← deslizá →</p>
              )}
            </section>
          );
        })()}
      </SectionBlock>

      <SectionBlock id="cp-nosotros" label="Nuestra historia" isPreview={isPreview} defaultOrder={CP_SECTION_IDS}>
      {/* ── ABOUT ── */}
      <section id="nosotros" data-reveal style={{ background: aboutBg, padding: isMobile ? "48px 16px" : "80px 40px", position: "relative" }}>
        <EditableSectionBg field="bgAbout" label="Fondo nosotros" />
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 32 : 60, alignItems: "center" }}>
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
          <div>
            <span style={{ fontSize: 10, letterSpacing: 5, fontWeight: 700, color: ACC, textTransform: "uppercase", display: "block", marginBottom: 16 }}>
              <EditableZone field="aboutKicker" label="Kicker nosotros">Nuestra Historia</EditableZone>
            </span>
            <h2 style={{ fontSize: "clamp(26px,3vw,38px)", fontWeight: 900, color: aboutText, margin: "0 0 20px", lineHeight: 1.1, textTransform: "uppercase" }}>
              <EditableZone field="aboutHeading" label="Título nosotros">Moda con propósito.</EditableZone>
            </h2>
            <p style={{ fontSize: 15, color: aboutText, opacity: 0.75, lineHeight: 1.8, margin: "0 0 16px" }}>
              <EditableZone field="aboutParagraph1" label="Párrafo 1 nosotros">Creamos prendas pensando en la mujer y el hombre que eligen con consciencia. Cada pieza combina diseño contemporáneo con materiales seleccionados para durar.</EditableZone>
            </p>
            <p style={{ fontSize: 15, color: aboutText, opacity: 0.75, lineHeight: 1.8, margin: "0 0 32px" }}>
              <EditableZone field="aboutParagraph2" label="Párrafo 2 nosotros">Trabajamos con talleres locales que respetan a su gente. Moda responsable, sin resignar estilo.</EditableZone>
            </p>
            <button onClick={() => scrollTo("contacto")} style={{ background: ACC, color: getContrastColor(ACC) === "light" ? "#fff" : "#111", border: "none", padding: "13px 32px", fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer" }}>
              <EditableZone field="aboutCta" label="Botón nosotros">Contactanos</EditableZone>
            </button>
          </div>
        </div>
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

            {/* Social links */}
            {storeConfig?.socialLinks && (isPreview || Object.entries(storeConfig.socialLinks).some(([, v]) => v)) && (
              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                {Object.entries(storeConfig.socialLinks).filter(([, v]) => isPreview || v).map(([net, url]) => (
                  <a key={net} href={url || "#"} target={url ? "_blank" : undefined} rel="noopener"
                    onClick={e => { if (!url) e.preventDefault(); }}
                    style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", textDecoration: "none", transition: "color 0.2s", opacity: url ? 1 : 0.4, cursor: url ? "pointer" : "default" }}
                    onMouseEnter={e => (e.currentTarget.style.color = ACC)}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}>
                    {net}
                  </a>
                ))}
              </div>
            )}
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
      <footer style={{ background: footerBg, padding: "48px 40px 32px", position: "relative" }}>
        <EditableSectionBg field="bgFooter" label="Fondo footer" />
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr", gap: isMobile ? 32 : 40, marginBottom: 40, paddingBottom: 40, borderBottom: `1px solid ${footerText === "#fff" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}` }}>
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 900, color: footerText, letterSpacing: 3, textTransform: "uppercase" }}>
                <EditableZone field="storeName" label="Nombre footer">{storeConfig?.storeName ?? "CHIC PARIS"}</EditableZone>
              </p>
              <p style={{ margin: 0, fontSize: 13, color: footerText, opacity: 0.55, lineHeight: 1.7, maxWidth: 280 }}>
                <EditableZone field="footerDescription" label="Descripción footer">Moda contemporánea para quienes eligen con intención.</EditableZone>
              </p>
              {storeConfig?.socialLinks && (
                <div style={{ display: "flex", gap: 14, marginTop: 20 }}>
                  {Object.entries(storeConfig.socialLinks).filter(([, v]) => isPreview || v).map(([net, url]) => (
                    <a key={net} href={url || "#"} target={url ? "_blank" : undefined} rel="noopener"
                      onClick={e => { if (!url) e.preventDefault(); }}
                      style={{ color: footerText, opacity: url ? 0.55 : 0.3, fontSize: 11, textDecoration: "none", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, cursor: url ? "pointer" : "default" }}>{net}</a>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p style={{ margin: "0 0 16px", fontSize: 10, fontWeight: 800, color: footerText, letterSpacing: 3, textTransform: "uppercase" }}>Colecciones</p>
              {["Mujer", "Hombre", "Accesorios", "Sale"].map(l => (
                <button key={l} onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=chic-paris${isPreview ? "&from=editor" : ""}${l !== "Sale" ? `&categoria=${encodeURIComponent(l)}` : ""}`; }}
                  style={{ display: "block", background: "none", border: "none", color: footerText, opacity: 0.55, fontSize: 13, cursor: "pointer", padding: "4px 0", textAlign: "left" }}>{l}</button>
              ))}
            </div>
            <div>
              <p style={{ margin: "0 0 16px", fontSize: 10, fontWeight: 800, color: footerText, letterSpacing: 3, textTransform: "uppercase" }}>Legal</p>
              {[
                { label: "Política de devoluciones", tipo: "devoluciones" },
                { label: "Política de envíos",       tipo: "envios" },
                { label: "Términos y condiciones",   tipo: "terminos" },
              ].map(({ label, tipo }) => (
                editMode ? (
                  <button key={tipo} type="button" onClick={() => window.open("/dashboard/pagos", "_blank")}
                    title="Editar en Dashboard → Pagos"
                    style={{ display: "flex", alignItems: "center", gap: 5, margin: "0 0 8px", fontSize: 13, color: footerText, opacity: 0.55, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.55"; }}>
                    {label}
                    <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                ) : (
                  <a key={tipo} href={`/tienda/${storeConfig?.slug ?? ""}/politicas?tipo=${tipo}`}
                    style={{ display: "block", margin: "0 0 8px", fontSize: 13, color: footerText, opacity: 0.55, textDecoration: "none" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.55"; }}>
                    {label}
                  </a>
                )
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px 24px", paddingLeft: hasWA ? 110 : 0, paddingRight: 100 }}>
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
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <p style={{ margin: 0, fontSize: 13, color: ACC, fontWeight: 700 }}>{ocultarPrecios ? "Consultá precio" : fmt(p.price)}</p>
                      {!ocultarPrecios && p.comparePrice && p.comparePrice > p.price && <p style={{ margin: 0, fontSize: 11, color: "#aaa", textDecoration: "line-through" }}>{fmt(p.comparePrice)}</p>}
                    </div>
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
          <div style={{ background: "#fff", width: "100%", maxWidth: 860, maxHeight: isPreview ? "100%" : "90vh", overflow: "hidden", display: "flex", flexDirection: "column", borderRadius: 4, boxShadow: "0 32px 80px rgba(0,0,0,0.35)", position:"relative" }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => { setModalProduct(null); setLightboxSrc(null); }} aria-label="Cerrar" style={{ position:"absolute", top:8, right:8, zIndex:10, background:"rgba(0,0,0,0.5)", border:"none", color:"#fff", width:36, height:36, borderRadius:"50%", cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
            <div style={{ overflow:"auto", flex:1, minHeight:0, display:"flex", flexDirection:"column" }}>
            <div style={{ display:"flex", flexDirection: isMobile ? "column" : "row" }}>
            {/* Images */}
            <div style={{ width: isMobile ? "100%" : "48%", flexShrink: 0, position: "relative", overflow: "hidden", aspectRatio: isMobile ? "4/3" : undefined }} {...imgSwipe}>
              <FadeImage src={modalProduct.images[modalImg] ?? "/placeholder.jpg"} alt={modalProduct.name} fill sizes="(max-width: 768px) 100vw, 420px"
                style={{ objectFit: "cover", cursor:"zoom-in" }}
                onClick={() => setLightboxSrc(modalProduct.images[modalImg] ?? "/placeholder.jpg")} />
              {(() => {
                if (modalPromo?.primaryPromo) return <PromoTag label={describePromo(modalPromo.primaryPromo).headline} />;
                const hasOffer = !variantPrice && !!modalProduct.comparePrice && modalProduct.comparePrice > modalProduct.price;
                if (!hasOffer) return null;
                return <OfferBadge badge={modalProduct.offerBadge} pct={discountPercent(modalProduct.price, modalProduct.comparePrice)} size="md" />;
              })()}
              {modalProduct.images.length > 1 && (<>
                <button onClick={() => setModalImg(i => (i - 1 + modalProduct.images.length) % modalProduct.images.length)}
                  aria-label="Imagen anterior"
                  style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.85)", border: "none", width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, zIndex: 2 }}>‹</button>
                <button onClick={() => setModalImg(i => (i + 1) % modalProduct.images.length)}
                  aria-label="Imagen siguiente"
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.85)", border: "none", width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, zIndex: 2 }}>›</button>
                <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 2 }}>
                  {modalProduct.images.map((_, i) => (
                    <button key={i} onClick={() => setModalImg(i)}
                      style={{ width: i === modalImg ? 24 : 8, height: 8, borderRadius: 4, border: "none", background: i === modalImg ? "#fff" : "rgba(255,255,255,0.5)", cursor: "pointer", padding: 0, transition: "all 0.3s" }} />
                  ))}
                </div>
              </>)}
              {modalProduct.reelUrls.length > 0 && (
                <div style={{ padding: "12px 14px 16px", borderTop: "1px solid #f0f0f0", background: "#fafafa" }}>
                  <p style={{ fontSize: 9, letterSpacing: 2, fontWeight: 700, textTransform: "uppercase", marginBottom: 10, color: "#bbb" }}>Videos</p>
                  <StoreProductReels
                    reelUrls={modalProduct.reelUrls}
                    theme={{ accent: ACC, text: "#111", border: `${ACC}33`, radius: 4 }}
                  />
                </div>
              )}
            </div>
            {/* Details */}
            <div style={{ flex: 1, padding: isMobile ? "20px 20px" : 32, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <p style={{ margin: "0 0 6px", fontSize: 10, color: "#999", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>{modalProduct.category}</p>
              <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 900, color: "#111", lineHeight: 1.2 }}>{modalProduct.name}</h2>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
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
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                {ocultarPrecios ? (
                  <span style={{ fontSize: 24, fontWeight: 900, color: ACC }}>Consultá precio</span>
                ) : modalPromo?.hasPriceDrop ? (
                  <>
                    <span style={{ fontSize: 24, fontWeight: 900, color: "#dc2626" }}>{fmt(modalPromo.effectivePrice)}</span>
                    <span style={{ fontSize: 16, color: "#bbb", textDecoration: "line-through" }}>{fmt(modalPromo.originalPrice)}</span>
                    {modalPromo.pctOff != null && <span style={{ fontSize: 12, fontWeight: 800, color: "#16a34a", background: "#dcfce7", padding: "2px 8px", borderRadius: 4 }}>{modalPromo.pctOff}% OFF</span>}
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 24, fontWeight: 900, color: ACC }}>{fmt(displayPrice)}</span>
                    {!variantPrice && modalProduct.comparePrice && <span style={{ fontSize: 16, color: "#bbb", textDecoration: "line-through" }}>{fmt(modalProduct.comparePrice)}</span>}
                  </>
                )}
              </div>
              {modalPromo?.primaryPromo && <PromoBlock promo={modalPromo.primaryPromo} freeShippingExtra={modalPromo.freeShipping} />}
              {!ocultarPrecios && modalProduct.offerNote && (
                <div style={{ fontSize: 12, color: "#059669", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 4, padding: "5px 10px", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>{modalProduct.offerNote}</span>
                </div>
              )}
              {modalProduct.description && (
                <div style={{ borderTop: "1px solid #eee", paddingTop: 14 }}>
                  <p style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#aaa", margin: "0 0 8px", fontWeight: 600 }}>Descripción</p>
                  <div className="product-rte" dangerouslySetInnerHTML={{ __html: modalProduct.description }} style={{ fontSize: 14, color: "#555", lineHeight: 1.7 }} />
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
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                    {condicionAttr && (
                      <span style={{ alignSelf: "flex-start", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", fontWeight: 800, color: getContrastColor(ACC) === "light" ? "#fff" : "#111", background: ACC, padding: "4px 10px", borderRadius: 4 }}>{condicionAttr.value}</span>
                    )}
                    {otherAttrs.length > 0 && (
                      <div style={{ borderRadius: 4, overflow: "hidden", border: "1px solid #f0f0f0" }}>
                        {otherAttrs.map((a, i) => (
                          <div key={a.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 12px", background: i%2===0 ? "#fafafa" : "#fff", borderBottom: i < otherAttrs.length-1 ? "1px solid #f0f0f0" : "none" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 0.5 }}>{a.key}</span>
                            <span style={{ fontSize: 12, color: "#111", fontWeight: 500 }}>{a.value}</span>
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
                );
              })()}

              {modalProduct.sizes.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#333", textTransform: "uppercase", letterSpacing: 1 }}>Talle</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {modalProduct.sizes.map(s => {
                      const outOfStock = outOfStockSizes.has(s);
                      return (
                        <button key={s} onClick={() => setSelectedSize(s)} style={{
                          padding: "8px 14px", border: selectedSize === s ? `2px solid ${ACC}` : "2px solid #e0e0e0",
                          background: selectedSize === s ? ACC : "transparent",
                          color: selectedSize === s ? (getContrastColor(ACC) === "light" ? "#fff" : "#111") : "#333",
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
                  <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#333", textTransform: "uppercase", letterSpacing: 1 }}>Color</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {modalProduct.colors.map(c => {
                      const swatch = colorToSwatch(c);
                      return (
                        <button key={c} onClick={() => setSelectedColor(c)} style={{
                          display: "flex", alignItems: "center", gap: 7,
                          padding: "8px 14px", border: selectedColor === c ? `2px solid ${ACC}` : "2px solid #e0e0e0",
                          background: selectedColor === c ? ACC : "transparent",
                          color: selectedColor === c ? (getContrastColor(ACC) === "light" ? "#fff" : "#111") : "#333",
                          fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                        }}>
                          {swatch && <span style={{ width: 14, height: 14, borderRadius: "50%", background: swatch, border: "1px solid rgba(0,0,0,0.15)", flexShrink: 0 }} />}
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#333", textTransform: "uppercase", letterSpacing: 1 }}>Cantidad</p>
                <div style={{ display: "flex", alignItems: "center", border: "2px solid #e0e0e0" }}>
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
                <p style={{ fontSize:12, color:"#888", fontWeight:600, margin:0 }}>Sin stock en esta combinación</p>
              )}
              {selectedVariantStock !== null && selectedVariantStock > 0 && selectedVariantStock <= 5 && (
                <p style={{ fontSize:12, color:"#ef4444", fontWeight:700, margin:0 }}>¡Últimas {selectedVariantStock} unidades!</p>
              )}
              {!isMobile && (
                <div style={{ borderTop: "1px solid #f0f0f0", marginTop: 4, paddingTop: 16 }}>
                  {isInquiryMode ? (
                <button onClick={() => openInquiry(modalProduct)} style={{ background: ACC, color: accentText, border: "none", padding: "15px", fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer", width: "100%" }}>
                  Consultar disponibilidad
                </button>
              ) : (
                <button onClick={addToCart} disabled={selectedVariantStock === 0}
                  style={{ background: selectedVariantStock === 0 ? "#ccc" : ACC, color: accentText, border: "none", padding: "15px", fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: selectedVariantStock === 0 ? "not-allowed" : "pointer", width: "100%" }}>
                  {selectedVariantStock === 0 ? "Sin stock" : "Agregar al carrito"}
                </button>
              )}</div>)}

              {/* Reseñas — D-04 */}
              <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 24, marginTop: 20 }}>
                <p style={{ margin: "0 0 20px", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#999" }}>
                  Reseñas{reviews.length > 0 && ` (${reviews.length})`}
                </p>
                {reviewsLoading ? (
                  <p style={{ fontSize: 12, color: "#bbb" }}>Cargando...</p>
                ) : reviews.length > 0 ? (
                  <div style={{ marginBottom: 24 }}>
                    {(() => {
                      const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
                      const dist = [5,4,3,2,1].map(s => ({ stars:s, count: reviews.filter(r => r.rating === s).length }));
                      return (
                        <div style={{ display:"flex", gap:20, alignItems:"center", marginBottom:20, padding:"14px 16px", background:"#fafafa", border:"1px solid #f0f0f0", borderRadius:4 }}>
                          <div style={{ textAlign:"center", minWidth:56 }}>
                            <p style={{ fontSize:34, fontWeight:800, color:"#111", margin:0, lineHeight:1 }}>{avg.toFixed(1)}</p>
                            <div style={{ display:"flex", gap:2, justifyContent:"center", margin:"6px 0 4px" }}>
                              {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize:11, color: s <= Math.round(avg) ? ACC : "#e5e7eb" }}>★</span>)}
                            </div>
                            <p style={{ fontSize:9, color:"#bbb", margin:0, fontWeight:600, letterSpacing:0.5 }}>{reviews.length} reseña{reviews.length !== 1 ? "s" : ""}</p>
                          </div>
                          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}>
                            {dist.map(d => (
                              <div key={d.stars} style={{ display:"flex", alignItems:"center", gap:8 }}>
                                <span style={{ fontSize:9, color:ACC, minWidth:14, textAlign:"right", fontWeight:700 }}>{d.stars}★</span>
                                <div style={{ flex:1, height:4, background:"#f0f0f0", borderRadius:2, overflow:"hidden" }}>
                                  <div style={{ height:"100%", width:`${reviews.length ? (d.count / reviews.length) * 100 : 0}%`, background:ACC, borderRadius:2 }} />
                                </div>
                                <span style={{ fontSize:9, color:"#bbb", minWidth:12, textAlign:"right" }}>{d.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    <div style={{ display:"flex", flexDirection:"column" }}>
                      {reviews.slice(0, reviewsShown).map((r, i) => (
                        <div key={r.id} style={{ display:"flex", gap:12, padding:"16px 0", borderBottom: i < Math.min(reviewsShown, reviews.length) - 1 ? "1px solid #f5f5f5" : "none" }}>
                          <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0, background:`${ACC}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:ACC }}>
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
                              {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize:12, color: s <= r.rating ? ACC : "#e5e7eb" }}>★</span>)}
                            </div>
                            {r.comment && <p style={{ fontSize:13, color:"#666", margin:0, lineHeight:1.65 }}>{r.comment}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {reviews.length > reviewsShown && (
                      <button onClick={() => setReviewsShown(n => n + 10)} style={{ marginTop:14, background:"none", border:"1px solid #e5e7eb", color:ACC, fontSize:10, fontWeight:700, letterSpacing:1.5, cursor:"pointer", padding:"8px 20px", textTransform:"uppercase", display:"block" }}>
                        Ver más ({reviews.length - reviewsShown})
                      </button>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: "#bbb", marginBottom: 16 }}>Sé el primero en dejar una reseña.</p>
                )}
                {isOwner ? (
                  <p style={{ fontSize: 11, color: "#bbb", fontStyle: "italic" }}>El dueño no puede dejar reseñas en su propia tienda.</p>
                ) : reviewDone ? (
                  <p style={{ fontSize: 12, color: ACC, fontWeight: 700 }}>¡Gracias por tu reseña!</p>
                ) : (
                  <div style={{ position: "relative" }}>
                    {isPreview && <div style={{ position: "absolute", inset: 0, zIndex: 10, cursor: "default" }} onClick={e => e.stopPropagation()} />}
                    <form onSubmit={isPreview ? e => e.preventDefault() : submitReview} style={{ display: "flex", flexDirection: "column", gap: 10, opacity: isPreview ? 0.55 : 1 }}>
                      <input value={reviewHoneypot} onChange={e => setReviewHoneypot(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ opacity:0, height:0, position:"absolute", pointerEvents:"none" }} />
                      <input value={reviewForm.reviewer} onChange={e => !isPreview && setReviewForm(p => ({ ...p, reviewer: e.target.value }))}
                        placeholder="Tu nombre" readOnly={isPreview}
                        style={{ border: "1px solid #e5e7eb", padding: "9px 12px", fontSize: 12, outline: "none" }} />
                      <div>
                        <input value={reviewForm.email} onChange={e => !isPreview && setReviewForm(p => ({ ...p, email: e.target.value }))}
                          placeholder="Tu email (opcional — verifica tu compra)" type="email" readOnly={isPreview} autoComplete="email"
                          style={{ width: "100%", boxSizing: "border-box", border: "1px solid #e5e7eb", padding: "9px 12px", fontSize: 12, outline: "none" }} />
                        <p style={{ fontSize: 10, color: "#aaa", margin: "3px 0 0", lineHeight: 1.4 }}>
                          Si compraste acá, tu reseña mostrará &ldquo;✓ Compra verificada&rdquo;. El email no se publica.
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[1,2,3,4,5].map(s => (
                          <button key={s} type="button" onClick={() => !isPreview && setReviewForm(p => ({ ...p, rating: s }))}
                            style={{ background: "none", border: "none", fontSize: 20, cursor: isPreview ? "default" : "pointer", color: s <= reviewForm.rating ? ACC : "#e5e7eb", padding: "2px" }}>★</button>
                        ))}
                      </div>
                      <textarea value={reviewForm.comment} onChange={e => !isPreview && setReviewForm(p => ({ ...p, comment: e.target.value }))}
                        placeholder="Comentario (opcional)" rows={3} readOnly={isPreview}
                        style={{ border: "1px solid #e5e7eb", padding: "9px 12px", fontSize: 12, resize: "none", outline: "none" }} />
                      {!isPreview && reviewCaptcha.widget}
                      <button type="submit" disabled={isPreview || reviewSubmitting || !reviewForm.reviewer.trim() || !reviewCaptcha.ready}
                        style={{ background: isPreview || reviewSubmitting || !reviewForm.reviewer.trim() ? "#f3f4f6" : ACC, color: isPreview || reviewSubmitting || !reviewForm.reviewer.trim() ? "#9ca3af" : getContrastColor(ACC) === "light" ? "#fff" : "#111", border: "none", padding: "12px", fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: isPreview ? "default" : "pointer" }}>
                        {reviewSubmitting ? "Publicando..." : "Publicar reseña"}
                      </button>
                    </form>
                    {isPreview && <p style={{ fontSize: 10, color: "#bbb", fontStyle: "italic", marginTop: 6 }}>Vista previa — solo disponible en la tienda real.</p>}
                  </div>
                )}
              </div>
            </div>
            </div>
            {similarProducts.length > 0 && (
              <div style={{ borderTop: "1px solid #f0f0f0", padding: isMobile ? "20px 20px" : "24px 32px" }}>
                <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#999" }}>Productos similares</p>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12 }}>
                  {similarProducts.map(p => (
                    <div key={p.id} onClick={() => openModal(p)} className="cp-zoom" style={{ cursor: "pointer" }}>
                      <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", borderRadius: 4, overflow: "hidden", background: "#f5f5f5" }}>
                        {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes="(max-width: 768px) 50vw, 200px" className="cp-zoom-img" style={{ objectFit: "cover" }} />}
                      </div>
                      <p style={{ margin: "8px 0 2px", fontSize: 12, color: "#111", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" as const }}>{p.name}</p>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: ACC }}>{ocultarPrecios ? "Consultá precio" : fmt(p.price)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
            {isMobile && (
              <div style={{ borderTop: "1px solid #f0f0f0", padding: "12px 16px 16px", background: "#fff", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: ACC }}>{ocultarPrecios ? "Consultá precio" : fmt(nxmPaid != null ? nxmPaid * displayPrice : (modalPromo?.hasPriceDrop ? modalPromo.effectivePrice : displayPrice) * qty)}</span>
                  {!variantPrice && !ocultarPrecios && modalProduct.comparePrice && <span style={{ fontSize: 12, color: "#bbb", textDecoration: "line-through" }}>{fmt(modalProduct.comparePrice)}</span>}
                  {qty > 1 && <span style={{ fontSize: 11, color: "#bbb" }}>× {qty}</span>}
                </div>
                {isInquiryMode ? (
                  <button onClick={() => openInquiry(modalProduct)}
                    style={{ width: "100%", background: ACC, color: getContrastColor(ACC) === "light" ? "#fff" : "#111", border: "none", padding: "15px", fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer" }}>
                    Consultar disponibilidad
                  </button>
                ) : (
                  <button onClick={addToCart} disabled={selectedVariantStock === 0}
                    style={{ width: "100%", background: selectedVariantStock === 0 ? "#ccc" : ACC, color: accentText, border: "none", padding: "15px", fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: selectedVariantStock === 0 ? "not-allowed" : "pointer" }}>
                    {selectedVariantStock === 0 ? "Sin stock" : "Agregar al carrito"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <CheckoutModal cart={cart} theme={cartTheme} isPreview={isPreview} storeSlug={storeConfig?.slug ?? ""} />
      <CartDrawer cart={cart} theme={cartTheme} isOwner={isOwner} isPreview={isPreview} whatsapp={storeConfig?.whatsapp} />

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
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                      <p style={{ margin: 0, fontSize: 13, color: ACC, fontWeight: 700 }}>{ocultarPrecios ? "Consultá precio" : fmt(product.price)}</p>
                      {!ocultarPrecios && product.comparePrice && product.comparePrice > product.price && <p style={{ margin: 0, fontSize: 11, color: "#aaa", textDecoration: "line-through" }}>{fmt(product.comparePrice)}</p>}
                    </div>
                    <button onClick={() => { setFavoritesOpen(false); openModal(product); }}
                      style={{ background: ACC, color: getContrastColor(ACC) === "light" ? "#fff" : "#111", border: "none", padding: "6px 16px", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}>
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
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={getContrastColor(ACC)==="light"?"#fff":"#111"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{CART_ICON_OPTIONS[cartIconIdx]}</svg>
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
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#111", color: "#fff", padding: "12px 24px", borderRadius: 4, fontSize: 13, fontWeight: 600, zIndex: 99999, animation: "cp-toast 0.3s ease", boxShadow: "0 8px 24px rgba(0,0,0,0.25)", whiteSpace: "nowrap" }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}
