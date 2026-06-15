"use client";
import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { usePushBell } from "@/contexts/PushBellContext";
import { EditableZone, EditableFixed, EditableImageButton, EditableSectionBg, BgDragHandle, getContrastColor, useEditContext } from "@/contexts/EditContext";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useCartLogic } from "@/hooks/useCartLogic";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import { ENVIO_OPTIONS, PAGO_OPTIONS } from "@/components/store/shared/cartTypes";
import PolicyEditorModal from "@/components/store/PolicyEditorModal";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import VerifiedIconButton from "@/components/store/VerifiedIconButton";

type Product = StorefrontProduct;

const SIZE_ATTRS = ["talle","size","talla","talles","sizes","tamaño","tamano","almacenamiento","ram","versión","version","formato","variante","material","sabor","peso/tamaño","peso"];

const BANNER_COUNT = 3;

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

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
  const [reelIndex,       setReelIndex]       = useState(0);
  const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false);
  const [mobileCatsOpen,  setMobileCatsOpen]  = useState(false);
  const [mobileOpenCat,   setMobileOpenCat]   = useState<string | null>(null);
  const [heroSlide,       setHeroSlide]       = useState(0);
  const [heroPaused,      setHeroPaused]      = useState(false);
  const [openPolicyField,  setOpenPolicyField]  = useState<string | null>(null);
  const [announcementIdx,  setAnnouncementIdx]  = useState(0);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  type PReview = { id: string; rating: number; comment: string | null; reviewer: string; createdAt: string };
  const [reviews,        setReviews]        = useState<PReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewForm,     setReviewForm]     = useState({ reviewer: "", rating: 5, comment: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone,     setReviewDone]     = useState(false);
  const [showReport,     setShowReport]     = useState(false);
  const [lightboxSrc,    setLightboxSrc]    = useState<string|null>(null);
  useEffect(() => {
    const allowsPinch = (el: Element | null) => {
      while (el) { if ((el as HTMLElement).style?.touchAction?.includes("pinch-zoom")) return true; el = el.parentElement; }
      return false;
    };
    const preventPinch = (e: TouchEvent) => { if (e.touches.length > 1 && !allowsPinch(e.target as Element)) e.preventDefault(); };
    const preventGesture = (e: Event) => { if (!allowsPinch((e as any).target as Element)) e.preventDefault(); };
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
  const isPreview   = !!storeConfig?.previewFill;
  const isOwner     = !!storeConfig?.isOwner;
  const blockBuy    = isPreview || isOwner;
  const hasWA       = !storeConfig || storeConfig.whatsapp.enabled;
  const storefront  = useStorefront();
  const { products, loadingProducts, checkoutMode, isWholesale, ocultarPrecios, defaultCategories, featuredCategories } = storefront;
  const { editMode, activeField, setActiveField, overrides: textOverrides, setOverride } = useEditContext();
  const isInquiryMode = checkoutMode === "inquiry" || ocultarPrecios;

  const categoryList = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(c => c && c !== "general"))];
    const base = cats.length > 0 ? cats : defaultCategories.slice(0, 6);
    return featuredCategories.length > 0 ? base.filter(c => featuredCategories.includes(c)) : base;
  }, [products, defaultCategories, featuredCategories]);
  const CATEGORIES = useMemo(() => ["Todos", ...categoryList], [categoryList]);

  const ACC   = storeConfig?.colors.accent ?? "#c0392b";
  const sc    = storeConfig?.sectionColors ?? {};
  const bannerMs = storeConfig?.bannerInterval ?? 4000;
  const PROMO_BAR_H = 36;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      window.scrollTo(0, y);
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

  const {
    cartItems, cartOpen, setCartOpen,
    modalProduct, setModalProduct, modalImg, setModalImg,
    selectedSize, setSelectedSize, selectedColor, setSelectedColor,
    qty, setQty,
    checkoutOpen, setCheckoutOpen, checkoutStatus, setCheckoutStatus, checkoutError,
    envioId, setEnvioId, pagoId, setPagoId,
    coupon, setCoupon, couponError, appliedCoupon, setAppliedCoupon,
    notas, setNotas, rememberData, setRememberData,
    buyerForm, setBuyerForm,
    searchOpen, setSearchOpen, searchQuery, setSearchQuery,
    favorites, favoritesOpen, setFavoritesOpen,
    userDropdownOpen, setUserDropdownOpen, userDropdownRef,
    toastMsg, contactStatus, setContactStatus, contactForm, setContactForm,
    cartTotal, cartCount, envioPrice, couponDiscount, orderTotal,
    searchResults, favoriteProducts, wholesaleWarnings,
    fmt, showToast, openModal, addToCart, removeFromCart, updateQty,
    openCheckout, handleApplyCoupon, handlePlaceOrder, handleContact, toggleFavorite,
  } = useCartLogic(storefront);
  const imgSwipe = useTouchSwipe(
    () => { if (modalProduct) setModalImg(i => (i + 1) % modalProduct.images.length); },
    () => { if (modalProduct) setModalImg(i => (i - 1 + modalProduct.images.length) % modalProduct.images.length); }
  );

  const selectedVariantStock = useMemo(() => {
    if (!modalProduct?.variants.length) return null;
    const v = modalProduct.variants.find(v => {
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
    return v?.stock ?? null;
  }, [modalProduct, selectedSize, selectedColor]);

  function openInquiry(product: Product) {
    setModalProduct(null);
    setContactForm({ nombre: "", email: "", mensaje: `Hola, me interesa "${product.name}". ¿Me podés dar más información?` });
    setTimeout(() => scrollTo("contacto"), 100);
  }
  function shareProduct(product: Product) {
    const url = `${window.location.origin}${window.location.pathname}?p=${product.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    showToast("¡Link copiado al portapapeles!");
  }
  function whatsappShare(product: Product) {
    const url = `${window.location.origin}${window.location.pathname}?p=${product.id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(product.name + "\n" + url)}`, "_blank");
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
    setReviewsLoading(true); setReviewDone(false); setReelIndex(0);
    setReviewForm(p => ({ ...p, rating: 5, comment: "" }));
    fetch(`/api/public/${slug}/reviews?productId=${modalProduct.id}`)
      .then(r => r.ok ? r.json() : { reviews: [] })
      .then(d => setReviews(d.reviews ?? []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalProduct?.id]);

  // Al cambiar color: sync imagen + talle disponible
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
      const sizeKey = Object.keys(a).find((k: string) => SIZE_ATTRS.includes(k.toLowerCase()));
      if (sizeKey && a[sizeKey] && a[sizeKey] !== selectedSize) setSelectedSize(a[sizeKey]);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColor, modalProduct?.id]);

  // Al cambiar talle: sync color + imagen si el combo talle+color actual no existe
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
      const colorKey = Object.keys(a).find((k: string) => ["color","colour","colores","colors","tono"].includes(k.toLowerCase()));
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

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (isPreview || isOwner) return;
    const slug = storeConfig?.slug;
    if (!modalProduct || !slug || !reviewForm.reviewer.trim()) return;
    setReviewSubmitting(true);
    const res = await fetch(`/api/public/${slug}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: modalProduct.id, rating: reviewForm.rating, comment: reviewForm.comment, reviewer: reviewForm.reviewer }),
    });
    if (res.ok) {
      const data = await res.json();
      setReviews(p => [data.review, ...p]);
      setReviewForm({ reviewer: "", rating: 5, comment: "" });
      setReviewDone(true); setTimeout(() => setReviewDone(false), 4000);
    }
    setReviewSubmitting(false);
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

  const changeCategory = (cat: string) => { setActiveCategory(cat); setVisibleCount(8); };
  const changeGender = (g: string | null) => { setActiveGender(g); setActiveCategory("Todos"); setVisibleCount(8); };

  const allFiltered = products.filter(p => {
    if (activeGender && p.gender !== activeGender && p.gender !== "unisex") return false;
    if (activeCategory !== "Todos" && p.category !== activeCategory) return false;
    return true;
  });
  const filtered    = allFiltered.slice(0, visibleCount);
  const hasMore     = visibleCount < allFiltered.length;

  // Banner slide images
  const bannerImgs = Array.from({ length: BANNER_COUNT }, (_, i) =>
    storeConfig?.imageOverrides?.[`heroBanner${i + 1}`]
  );

  const iStyle: React.CSSProperties = {
    display: "block", width: "100%", padding: "10px 14px",
    border: "1px solid #ddd", fontSize: 13, outline: "none",
    fontFamily: "inherit", boxSizing: "border-box", background: "#fff", color: "#111",
  };

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
                <div style={{ position: "absolute", top: "calc(100% + 12px)", left: 0, background: "#fff", border: "1px solid #e8e8e8", minWidth: 180, zIndex: 500, padding: "6px 0", boxShadow: "0 12px 40px rgba(0,0,0,0.12)" }}>
                  {categoryList.map(cat => {
                    const subs = subcategoriesFor[cat] || [];
                    return (
                      <div key={cat} style={{ position: "relative" }}
                        onMouseEnter={() => setHoveredNavCat(cat)}
                        onMouseLeave={() => setHoveredNavCat("__open__")}>
                        <button onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=chic-paris${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat)}`; setHoveredNavCat(null); }}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: hoveredNavCat === cat ? "#f9f9f9" : "none", border: "none", color: "#111", padding: "9px 16px", fontSize: 11, textAlign: "left", cursor: "pointer", letterSpacing: 2, textTransform: "uppercase" }}>
                          {cat}
                          {subs.length > 0 && <span style={{ opacity: 0.4, fontSize: 10 }}>›</span>}
                        </button>
                        {subs.length > 0 && hoveredNavCat === cat && (
                          <div style={{ position: "absolute", top: 0, left: "100%", background: "#fff", border: "1px solid #e8e8e8", minWidth: 160, padding: "6px 0", boxShadow: "8px 8px 32px rgba(0,0,0,0.08)", zIndex: 501 }}>
                            {subs.map(sub => (
                              <button key={sub} onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=chic-paris${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat)}&subcategoria=${encodeURIComponent(sub)}`; setHoveredNavCat(null); }}
                                style={{ display: "block", width: "100%", background: "none", border: "none", color: "#111", padding: "8px 16px", fontSize: 11, textAlign: "left", cursor: "pointer", letterSpacing: 1, textTransform: "uppercase" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#f9f9f9")}
                                onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                                {sub}
                              </button>
                            ))}
                          </div>
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
            <button onClick={() => setSearchOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: (isPreview || scrolled) ? "#555" : "#fff", padding: 6, display: "flex", transition: "color 0.3s" }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            {pushBell && storeConfig?.showPushBell && !isPreview && (
              <button onClick={pushBell.openDrawer} style={{ position:"relative", background:"none", border:"none", cursor:"pointer", color:(isPreview || scrolled) ? "#555" : "#fff", padding:6, display:"flex", transition:"color 0.3s" }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill={pushBell.subState === "subscribed" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {pushBell.hasNew && <span style={{ position:"absolute", top:4, right:4, width:10, height:10, background:"#ef4444", borderRadius:"50%", border:"2px solid white" }} />}
              </button>
            )}
            {isPreview && (
              storeConfig?.showPushBell ? (
                <button onClick={storeConfig.onPreviewBellClick} title="Campanita de novedades — clic para configurar" style={{ position:"relative", background:"none", border:"none", padding:6, display:"flex", color:"#555", opacity:0.85, cursor:"pointer" }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </button>
              ) : (
                <button onClick={storeConfig?.onPreviewBellClick} title="🔒 Solo Plan Plus — tocá para activar" style={{ position:"relative", background:"none", border:"none", padding:6, display:"flex", color:"#555", opacity:0.38, cursor:"pointer" }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  <span style={{ position:"absolute", top:2, right:2, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
                </button>
              )
            )}
            <button onClick={() => setFavoritesOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: (isPreview || scrolled) ? "#555" : "#fff", padding: 6, position: "relative", display: "flex", transition: "color 0.3s" }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill={favorites.length > 0 ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
            <div ref={userDropdownRef} style={{ position: "relative" }}>
              <button onClick={() => setUserDropdownOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: (isPreview || scrolled) ? "#555" : "#fff", padding: 6, display: "flex", transition: "color 0.3s" }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </button>
              {userDropdownOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, minWidth: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 2000, overflow: "hidden" }}>
                  {[["Mi cuenta", "/dashboard"], ["Mis pedidos", "/dashboard/pedidos"]].map(([label, href]) => (
                    <a key={href} href={href} style={{ display: "block", padding: "12px 16px", fontSize: 13, color: "#333", textDecoration: "none", borderBottom: "1px solid #f5f5f5" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>{label}</a>
                  ))}
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
      <section id="hero" style={{ position: "relative", height: "100vh", overflow: "hidden", background: "#111" }}
        onMouseEnter={() => setHeroPaused(true)}
        onMouseLeave={() => setHeroPaused(false)}>

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
                <img src={ov.url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: `${ov.posX ?? 50}% ${ov.posY ?? 50}%` }} />
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

      {/* ── MAYORISTA — banner "Solicitá tu lista de precios" ── */}
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

      {/* ── PRODUCTOS ── */}
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
                {filtered.map(product => (
                  <div key={product.id} className="cp-prod" onClick={() => openModal(product)} style={{ cursor: "pointer", background: "#fff", borderRadius: 4, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    <div style={{ position: "relative", overflow: "hidden", aspectRatio: "3/4" }}>
                      <img className="cp-img" src={product.images[0] ?? "/placeholder.jpg"} alt={product.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      <div className="cp-overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#fff", fontSize: 11, letterSpacing: 3, fontWeight: 700, textTransform: "uppercase", border: "1px solid #fff", padding: "10px 20px" }}>Ver detalle</span>
                      </div>
                      {product.comparePrice && (
                        <span style={{ position: "absolute", top: 12, left: 12, background: ACC, color: getContrastColor(ACC) === "light" ? "#fff" : "#111", fontSize: 10, fontWeight: 800, padding: "4px 10px", letterSpacing: 1 }}>SALE</span>
                      )}
                      <button onClick={e => { e.stopPropagation(); toggleFavorite(product.id); }}
                        style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.9)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill={favorites.includes(product.id) ? ACC : "none"} stroke={favorites.includes(product.id) ? ACC : "#555"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      </button>
                    </div>
                    <div style={{ padding: "14px 16px 18px" }}>
                      <p style={{ margin: "0 0 4px", fontSize: 10, color: "#999", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>{product.category}</p>
                      <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: prodText, lineHeight: 1.3 }}>{product.name}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: ACC }}>{ocultarPrecios ? "Consultá precio" : fmt(product.price)}</span>
                        {!ocultarPrecios && product.comparePrice && <span style={{ fontSize: 13, color: "#aaa", textDecoration: "line-through" }}>{fmt(product.comparePrice)}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "center", marginTop: 48 }}>
                <a href={`/tienda/${storeConfig?.slug}/productos?t=chic-paris${isPreview ? "&from=editor" : ""}`}
                  style={{ display: "inline-block", background: ACC, color: getContrastColor(ACC) === "light" ? "#fff" : "#111", padding: "14px 44px", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", textDecoration: "none", transition: "opacity 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                  Ver colección completa
                </a>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="nosotros" data-reveal style={{ background: aboutBg, padding: isMobile ? "48px 16px" : "80px 40px", position: "relative" }}>
        <EditableSectionBg field="bgAbout" label="Fondo nosotros" />
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 32 : 60, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            {(() => {
              const ov = storeConfig?.imageOverrides?.["nosotrosImage"];
              return (
                <div style={{ aspectRatio: "4/5", background: "#d8d0c8", overflow: "hidden", position: "relative" }}>
                  {ov?.url
                    ? <img src={ov.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${ov.posX ?? 50}% ${ov.posY ?? 50}%` }} />
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
            {storeConfig?.socialLinks && Object.entries(storeConfig.socialLinks).some(([, v]) => v) && (
              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                {Object.entries(storeConfig.socialLinks).filter(([, v]) => v).map(([net, url]) => (
                  <a key={net} href={url} target="_blank" rel="noopener"
                    style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", textDecoration: "none", transition: "color 0.2s" }}
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
          {contactStatus === "sent" ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${ACC}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h3 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 900, color: "#111", textTransform: "uppercase" }}>¡Mensaje enviado!</h3>
              <p style={{ fontSize: 14, color: "#777", margin: "0 0 28px" }}>Te respondemos a la brevedad.</p>
              <button onClick={() => setContactStatus("idle")}
                style={{ background: "transparent", color: "#111", border: "2px solid #ddd", padding: "10px 28px", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}>
                Enviar otro
              </button>
            </div>
          ) : (
            <>
              <p style={{ margin: "0 0 32px", fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: 3, textTransform: "uppercase" }}>Envianos un mensaje</p>
              <form onSubmit={handleContact} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {/* Nombre + Email en fila */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  {[["nombre", "Nombre", "text"], ["email", "Email", "email"]].map(([field, ph, type]) => (
                    <div key={field}>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#999", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>{ph}</label>
                      <input required type={type} placeholder={`Tu ${ph.toLowerCase()}`}
                        value={contactForm[field as keyof typeof contactForm]}
                        onChange={e => setContactForm(f => ({ ...f, [field]: e.target.value }))}
                        style={{ ...iStyle, borderColor: "#e0e0e0" }}
                        onFocus={e => (e.target.style.borderColor = ACC)}
                        onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
                    </div>
                  ))}
                </div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#999", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Mensaje</label>
                <textarea required placeholder="¿En qué te podemos ayudar?" rows={5}
                  value={contactForm.mensaje}
                  onChange={e => setContactForm(f => ({ ...f, mensaje: e.target.value }))}
                  style={{ ...iStyle, resize: "none", borderColor: "#e0e0e0", marginBottom: 20 }}
                  onFocus={e => (e.target.style.borderColor = ACC)}
                  onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
                <button type="submit" disabled={contactStatus === "sending"}
                  style={{ background: "#111", color: "#fff", border: "none", padding: "15px 32px", fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer", alignSelf: "flex-start", opacity: contactStatus === "sending" ? 0.6 : 1, transition: "background 0.2s" }}
                  onMouseEnter={e => { if (contactStatus !== "sending") e.currentTarget.style.background = ACC; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#111"; }}>
                  {contactStatus === "sending" ? "Enviando..." : "Enviar mensaje →"}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

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
                  {Object.entries(storeConfig.socialLinks).filter(([, v]) => v).map(([net, url]) => (
                    <a key={net} href={url} target="_blank" rel="noopener" style={{ color: footerText, opacity: 0.55, fontSize: 11, textDecoration: "none", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{net}</a>
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
                { label: "Política de devoluciones", tipo: "devoluciones", policyField: "policyReturns" },
                { label: "Política de envíos",       tipo: "envios",       policyField: "policyShipping" },
                { label: "Términos y condiciones",   tipo: "terminos",     policyField: "policyTerms" },
              ].map(({ label, tipo, policyField }) => (
                editMode ? (
                  <button key={tipo} type="button" onClick={() => setOpenPolicyField(policyField)}
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px 24px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              {[
                { label: "Política de devoluciones", tipo: "devoluciones", policyField: "policyReturns" },
                { label: "Política de envíos",       tipo: "envios",       policyField: "policyShipping" },
                { label: "Términos y condiciones",   tipo: "terminos",     policyField: "policyTerms" },
              ].map(({ label, tipo, policyField }) => (
                editMode ? (
                  <button key={tipo} type="button" onClick={() => setOpenPolicyField(policyField)}
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

      {openPolicyField && (
        <PolicyEditorModal field={openPolicyField} onClose={() => setOpenPolicyField(null)} />
      )}

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
              <button onClick={() => setSearchOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#999" }}>×</button>
            </div>
            <div style={{ maxHeight: 380, overflowY: "auto", padding: 12 }}>
              {searchResults.length > 0 ? searchResults.map(p => (
                <div key={p.id} onClick={() => { openModal(p); setSearchQuery(""); setSearchOpen(false); }}
                  style={{ display: "flex", gap: 14, padding: "10px 8px", cursor: "pointer", borderRadius: 4 }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <img src={p.images[0] ?? "/placeholder.jpg"} alt={p.name} style={{ width: 48, height: 60, objectFit: "cover", flexShrink: 0 }} />
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600 }}>{p.name}</p>
                    <p style={{ margin: 0, fontSize: 13, color: ACC, fontWeight: 700 }}>{ocultarPrecios ? "Consultá precio" : fmt(p.price)}</p>
                  </div>
                </div>
              )) : searchQuery ? (
                <p style={{ padding: "20px 8px", color: "#999", fontSize: 13 }}>No se encontraron resultados para "{searchQuery}"</p>
              ) : (
                <p style={{ padding: "20px 8px", color: "#bbb", fontSize: 13 }}>Escribí para buscar...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PRODUCT MODAL ── */}
      {modalProduct && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}
          onClick={() => setModalProduct(null)}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 860, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", borderRadius: 4, boxShadow: "0 32px 80px rgba(0,0,0,0.35)", position:"relative" }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => { setModalProduct(null); setLightboxSrc(null); }} style={{ position:"absolute", top:8, right:8, zIndex:10, background:"rgba(0,0,0,0.5)", border:"none", color:"#fff", width:36, height:36, borderRadius:"50%", cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
            <div style={{ overflow:"auto", flex:1, minHeight:0, display:"flex", flexDirection: isMobile ? "column" : "row" }}>
            {/* Images */}
            <div style={{ width: isMobile ? "100%" : "48%", flexShrink: 0, position: "relative", overflow: "hidden", aspectRatio: isMobile ? "4/3" : undefined }} {...imgSwipe}>
              <img src={modalProduct.images[modalImg] ?? "/placeholder.jpg"} alt={modalProduct.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", cursor:"zoom-in" }}
                onClick={() => setLightboxSrc(modalProduct.images[modalImg] ?? "/placeholder.jpg")} />
              {modalProduct.images.length > 1 && (<>
                <button onClick={() => setModalImg(i => (i - 1 + modalProduct.images.length) % modalProduct.images.length)}
                  style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.85)", border: "none", width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, zIndex: 2 }}>‹</button>
                <button onClick={() => setModalImg(i => (i + 1) % modalProduct.images.length)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.85)", border: "none", width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, zIndex: 2 }}>›</button>
                <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 2 }}>
                  {modalProduct.images.map((_, i) => (
                    <button key={i} onClick={() => setModalImg(i)}
                      style={{ width: i === modalImg ? 24 : 8, height: 8, borderRadius: 4, border: "none", background: i === modalImg ? "#fff" : "rgba(255,255,255,0.5)", cursor: "pointer", padding: 0, transition: "all 0.3s" }} />
                  ))}
                </div>
              </>)}
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
                <button onClick={() => whatsappShare(modalProduct)}
                  style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "1px solid #bbf7d0", color: "#16a34a", padding: "5px 12px", fontSize: 10, letterSpacing: 1, cursor: "pointer", transition: "color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#15803d")} onMouseLeave={e => (e.currentTarget.style.color = "#16a34a")}>
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M11.897 0C5.395 0 .13 5.266.13 11.767c0 2.078.545 4.03 1.495 5.727L.057 24l6.7-1.757A11.71 11.71 0 0 0 11.897 23.534c6.503 0 11.768-5.265 11.768-11.767C23.67 5.266 18.4 0 11.897 0zm0 21.536h-.004a9.726 9.726 0 0 1-4.96-1.358l-.356-.211-3.678.965.982-3.581-.232-.368A9.73 9.73 0 0 1 2.158 11.767C2.158 6.355 6.551 2 11.897 2c2.581 0 5.007 1.007 6.831 2.831a9.604 9.604 0 0 1 2.828 6.83c0 5.347-4.393 9.875-9.659 9.875z"/></svg>
                  WhatsApp
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 24, fontWeight: 900, color: ACC }}>{ocultarPrecios ? "Consultá precio" : fmt(modalProduct.price)}</span>
                {!ocultarPrecios && modalProduct.comparePrice && <span style={{ fontSize: 16, color: "#bbb", textDecoration: "line-through" }}>{fmt(modalProduct.comparePrice)}</span>}
              </div>
              {modalProduct.description && <p style={{ fontSize: 14, color: "#555", lineHeight: 1.7, marginBottom: 20 }}>{modalProduct.description}</p>}

              {modalProduct.sizes.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#333", textTransform: "uppercase", letterSpacing: 1 }}>Talle</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {modalProduct.sizes.map(s => (
                      <button key={s} onClick={() => setSelectedSize(s)} style={{
                        padding: "8px 14px", border: selectedSize === s ? `2px solid ${ACC}` : "2px solid #e0e0e0",
                        background: selectedSize === s ? ACC : "transparent",
                        color: selectedSize === s ? (getContrastColor(ACC) === "light" ? "#fff" : "#111") : "#333",
                        fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                      }}>{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {modalProduct.colors.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#333", textTransform: "uppercase", letterSpacing: 1 }}>Color</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {modalProduct.colors.map(c => (
                      <button key={c} onClick={() => setSelectedColor(c)} style={{
                        padding: "8px 14px", border: selectedColor === c ? `2px solid ${ACC}` : "2px solid #e0e0e0",
                        background: selectedColor === c ? ACC : "transparent",
                        color: selectedColor === c ? (getContrastColor(ACC) === "light" ? "#fff" : "#111") : "#333",
                        fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                      }}>{c}</button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#333", textTransform: "uppercase", letterSpacing: 1 }}>Cantidad</p>
                <div style={{ display: "flex", alignItems: "center", border: "2px solid #e0e0e0" }}>
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 36, height: 36, background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#333" }}>−</button>
                  <span style={{ width: 36, textAlign: "center", fontSize: 14, fontWeight: 700 }}>{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} style={{ width: 36, height: 36, background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#333" }}>+</button>
                </div>
              </div>
              {/* Stock por variante */}
              {selectedVariantStock !== null && selectedVariantStock === 0 && (
                <p style={{ fontSize:12, color:"#888", fontWeight:600, margin:0 }}>Sin stock en esta combinación</p>
              )}
              {selectedVariantStock !== null && selectedVariantStock > 0 && selectedVariantStock <= 5 && (
                <p style={{ fontSize:12, color:"#ef4444", fontWeight:700, margin:0 }}>¡Últimas {selectedVariantStock} unidades!</p>
              )}
              {/* Videos del producto */}
              {modalProduct.reelUrls.length > 0 && (
                <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 14, marginBottom: 4 }}>
                  <p style={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, textTransform: "uppercase", marginBottom: 10, color: "#bbb" }}>Videos</p>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    {(() => {
                      const url = modalProduct.reelUrls[reelIndex];
                      if (/\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url)) {
                        return <video controls style={{ width: 160, aspectRatio: "9/16", objectFit: "cover", background: "#000", borderRadius: 4 }}><source src={url} /></video>;
                      }
                      let embedUrl = "";
                      if (url.includes("youtube.com/shorts/")) { const id = url.split("shorts/")[1]?.split("?")[0]; embedUrl = `https://www.youtube.com/embed/${id}`; }
                      else if (url.includes("youtu.be/")) { const id = url.split("youtu.be/")[1]?.split("?")[0]; embedUrl = `https://www.youtube.com/embed/${id}`; }
                      else if (url.includes("youtube.com/watch")) { try { const id = new URL(url).searchParams.get("v"); if (id) embedUrl = `https://www.youtube.com/embed/${id}`; } catch {} }
                      if (embedUrl) return <iframe src={embedUrl} allow="autoplay; encrypted-media" allowFullScreen style={{ width: 160, aspectRatio: "9/16", border: "none", borderRadius: 4 }} />;
                      const platform = url.includes("instagram") ? "Instagram Reel" : url.includes("tiktok") ? "TikTok" : "Video";
                      return (
                        <a href={url} target="_blank" rel="noopener noreferrer"
                          style={{ width: 160, aspectRatio: "9/16", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, border: `1px solid ${ACC}33`, textDecoration: "none", color: "#333", borderRadius: 4, background: "#faf9f7" }}>
                          <svg width={24} height={24} viewBox="0 0 24 24" fill={ACC} stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          <span style={{ fontSize: 11 }}>{platform}</span>
                        </a>
                      );
                    })()}
                    {modalProduct.reelUrls.length > 1 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button onClick={() => setReelIndex(i => (i - 1 + modalProduct.reelUrls.length) % modalProduct.reelUrls.length)}
                          style={{ background: "none", border: `1px solid ${ACC}33`, color: "#333", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
                        <div style={{ display: "flex", gap: 5 }}>
                          {modalProduct.reelUrls.map((_, i) => (
                            <button key={i} onClick={() => setReelIndex(i)}
                              style={{ width: 6, height: 6, borderRadius: "50%", background: i === reelIndex ? ACC : `${ACC}33`, border: "none", cursor: "pointer", padding: 0 }} />
                          ))}
                        </div>
                        <button onClick={() => setReelIndex(i => (i + 1) % modalProduct.reelUrls.length)}
                          style={{ background: "none", border: `1px solid ${ACC}33`, color: "#333", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {isInquiryMode ? (
                <button onClick={() => openInquiry(modalProduct)} style={{ background: ACC, color: getContrastColor(ACC) === "light" ? "#fff" : "#111", border: "none", padding: "15px", fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer", marginTop: "auto" }}>
                  Consultar disponibilidad
                </button>
              ) : (
                <button onClick={addToCart} disabled={selectedVariantStock === 0}
                  style={{ background: selectedVariantStock === 0 ? "#ccc" : ACC, color: getContrastColor(ACC) === "light" ? "#fff" : "#111", border: "none", padding: "15px", fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: selectedVariantStock === 0 ? "not-allowed" : "pointer", marginTop: "auto" }}>
                  {selectedVariantStock === 0 ? "Sin stock" : "Agregar al carrito"}
                </button>
              )}

              {/* Reseñas — D-04 */}
              <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 20, marginTop: 20 }}>
                <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#999" }}>
                  Reseñas{reviews.length > 0 && ` (${reviews.length})`}
                </p>
                {reviewsLoading ? (
                  <p style={{ fontSize: 12, color: "#bbb" }}>Cargando...</p>
                ) : reviews.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                    {reviews.map(r => (
                      <div key={r.id} style={{ borderBottom: "1px solid #f5f5f5", paddingBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{r.reviewer}</span>
                          <span style={{ fontSize: 14, color: ACC }}>{[1,2,3,4,5].map(s => s <= r.rating ? "★" : "☆").join("")}</span>
                        </div>
                        {r.comment && <p style={{ fontSize: 13, color: "#666", margin: 0, lineHeight: 1.6 }}>{r.comment}</p>}
                      </div>
                    ))}
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
                      <input value={reviewForm.reviewer} onChange={e => !isPreview && setReviewForm(p => ({ ...p, reviewer: e.target.value }))}
                        placeholder="Tu nombre" readOnly={isPreview}
                        style={{ border: "1px solid #e5e7eb", padding: "9px 12px", fontSize: 12, outline: "none" }} />
                      <div style={{ display: "flex", gap: 4 }}>
                        {[1,2,3,4,5].map(s => (
                          <button key={s} type="button" onClick={() => !isPreview && setReviewForm(p => ({ ...p, rating: s }))}
                            style={{ background: "none", border: "none", fontSize: 20, cursor: isPreview ? "default" : "pointer", color: s <= reviewForm.rating ? ACC : "#e5e7eb", padding: "2px" }}>★</button>
                        ))}
                      </div>
                      <textarea value={reviewForm.comment} onChange={e => !isPreview && setReviewForm(p => ({ ...p, comment: e.target.value }))}
                        placeholder="Comentario (opcional)" rows={3} readOnly={isPreview}
                        style={{ border: "1px solid #e5e7eb", padding: "9px 12px", fontSize: 12, resize: "none", outline: "none" }} />
                      <button type="submit" disabled={isPreview || !reviewForm.reviewer.trim()}
                        style={{ background: isPreview || !reviewForm.reviewer.trim() ? "#f3f4f6" : ACC, color: isPreview || !reviewForm.reviewer.trim() ? "#9ca3af" : getContrastColor(ACC) === "light" ? "#fff" : "#111", border: "none", padding: "12px", fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: isPreview ? "default" : "pointer" }}>
                        Publicar reseña
                      </button>
                    </form>
                    {isPreview && <p style={{ fontSize: 10, color: "#bbb", fontStyle: "italic", marginTop: 6 }}>Vista previa — solo disponible en la tienda real.</p>}
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CART ── */}
      {cartOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9500, display: "flex", justifyContent: "flex-end", overflow: "hidden" }} onClick={() => setCartOpen(false)}>
          <div style={{ width: isMobile ? "100%" : 400, background: "#fff", height: "100%", display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>Tu carrito ({cartCount})</h3>
              <button onClick={() => setCartOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#999" }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              {cartItems.length === 0 ? (
                <p style={{ color: "#bbb", fontSize: 14, textAlign: "center", marginTop: 40 }}>Tu carrito está vacío</p>
              ) : cartItems.map((item, idx) => (
                <div key={idx} style={{ display: "flex", gap: 14, marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #f5f5f5" }}>
                  <img src={item.product.images[0] ?? "/placeholder.jpg"} alt={item.product.name} style={{ width: 72, height: 88, objectFit: "cover", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700 }}>{item.product.name}</p>
                    {item.size && <p style={{ margin: "0 0 2px", fontSize: 11, color: "#999" }}>Talle: {item.size}</p>}
                    {item.color && <p style={{ margin: "0 0 8px", fontSize: 11, color: "#999" }}>Color: {item.color}</p>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", border: "1px solid #e0e0e0" }}>
                        <button onClick={() => updateQty(idx, -1)} style={{ width: 28, height: 28, background: "none", border: "none", cursor: "pointer" }}>−</button>
                        <span style={{ width: 28, textAlign: "center", fontSize: 12, fontWeight: 700 }}>{item.qty}</span>
                        <button onClick={() => updateQty(idx, 1)} style={{ width: 28, height: 28, background: "none", border: "none", cursor: "pointer" }}>+</button>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: ACC }}>{fmt(item.product.price * item.qty)}</p>
                        <button onClick={() => removeFromCart(idx)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#bbb", marginTop: 2 }}>Eliminar</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {cartItems.length > 0 && (
              <div style={{ padding: "16px 24px", borderTop: "1px solid #f0f0f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: "#666" }}>Subtotal</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{fmt(cartTotal)}</span>
                </div>
                {wholesaleWarnings.length > 0 && (
                  <div style={{ marginBottom:12, padding:"10px 14px", background:"#fefce8", border:"1px solid #fde047", borderRadius:4 }}>
                    <p style={{ fontSize:11, margin:0, color:"#ca8a04", fontWeight:600 }}>Cantidad mínima no alcanzada</p>
                    {wholesaleWarnings.map((item, i) => (
                      <p key={i} style={{ fontSize:10, margin:"4px 0 0", color:"#9a7000" }}>
                        {item.product.name}: mín. {item.product.cantMinMayorista} uds.
                      </p>
                    ))}
                  </div>
                )}
                <button onClick={blockBuy ? undefined : openCheckout} disabled={blockBuy} title={isOwner ? "No podés comprar en tu propia tienda" : isPreview ? "No disponible en modo edición" : undefined} style={{ width: "100%", background: blockBuy ? "#f3f4f6" : ACC, color: blockBuy ? "#9ca3af" : getContrastColor(ACC) === "light" ? "#fff" : "#111", border: "none", padding: "14px", fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: blockBuy ? "not-allowed" : "pointer", marginTop: 8 }}>
                  {isOwner ? "No disponible para el dueño" : isPreview ? "Solo en la tienda real" : "Finalizar compra"}
                </button>
                {storeConfig?.whatsapp?.enabled && storeConfig.whatsapp.number && (
                  <a
                    href={`https://wa.me/${storeConfig.whatsapp.number.replace(/\D/g,"")}`}
                    target="_blank" rel="noreferrer"
                    style={{ display:"flex", alignItems:"center", gap:10, marginTop:12, padding:"10px 14px", background:"#f0fdf4", borderRadius:4, textDecoration:"none", border:"1px solid #bbf7d0" }}
                  >
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="#16a34a" style={{ flexShrink:0 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    <div>
                      <p style={{ fontSize:10, margin:0, color:"#6b7280", letterSpacing:1 }}>¿Tenés dudas?</p>
                      <p style={{ fontSize:12, margin:0, color:"#16a34a", fontWeight:600 }}>Consultá por WhatsApp</p>
                    </div>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CHECKOUT ── */}
      {checkoutOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9600, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", borderRadius: 4, boxShadow: "0 32px 80px rgba(0,0,0,0.3)" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>Finalizar compra</h3>
              <button onClick={() => setCheckoutOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#999" }}>×</button>
            </div>

            {checkoutStatus === "done" ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 900, color: "#111" }}>¡Pedido recibido!</h3>
                <p style={{ fontSize: 14, color: "#666", margin: "0 0 28px" }}>Te contactamos en breve para confirmar y coordinar el pago.</p>
                <button onClick={() => { setCheckoutOpen(false); setCheckoutStatus("idle"); }}
                  style={{ background: ACC, color: getContrastColor(ACC) === "light" ? "#fff" : "#111", border: "none", padding: "12px 32px", fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer" }}>
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handlePlaceOrder} style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
                <div style={{ padding: "20px 24px", flex: 1 }}>
                  <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#333" }}>Tus datos</p>
                  {[["nombre","Nombre completo","text"],["email","Email","email"],["telefono","Teléfono","tel"]].map(([f,ph,t]) => (
                    <input key={f} required type={t} placeholder={ph}
                      value={buyerForm[f as keyof typeof buyerForm]}
                      onChange={e => setBuyerForm(b => ({ ...b, [f]: e.target.value }))}
                      style={{ ...iStyle, marginBottom: 10 }}
                      onFocus={e => (e.target.style.borderColor = ACC)}
                      onBlur={e => (e.target.style.borderColor = "#ddd")} />
                  ))}
                  <p style={{ margin: "16px 0 14px", fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#333" }}>Dirección</p>
                  {[["direccion","Calle y número","text"],["ciudad","Ciudad","text"],["provincia","Provincia","text"]].map(([f,ph,t]) => (
                    <input key={f} type={t} placeholder={ph}
                      value={buyerForm[f as keyof typeof buyerForm]}
                      onChange={e => setBuyerForm(b => ({ ...b, [f]: e.target.value }))}
                      style={{ ...iStyle, marginBottom: 10 }}
                      onFocus={e => (e.target.style.borderColor = ACC)}
                      onBlur={e => (e.target.style.borderColor = "#ddd")} />
                  ))}
                  <input placeholder="Código postal" value={buyerForm.cp} onChange={e => setBuyerForm(b => ({ ...b, cp: e.target.value }))} style={{ ...iStyle, marginBottom: 16 }} onFocus={e => (e.target.style.borderColor = ACC)} onBlur={e => (e.target.style.borderColor = "#ddd")} />

                  <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#333" }}>Envío</p>
                  {ENVIO_OPTIONS.map(opt => (
                    <label key={opt.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: `1px solid ${envioId === opt.id ? ACC : "#e0e0e0"}`, marginBottom: 8, cursor: "pointer", background: envioId === opt.id ? `${ACC}10` : "#fff" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input type="radio" checked={envioId === opt.id} onChange={() => setEnvioId(opt.id)} style={{ accentColor: ACC }} />
                        <span style={{ fontSize: 13 }}>{opt.label}</span>
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{opt.price === 0 ? "Gratis" : fmt(opt.price)}</span>
                    </label>
                  ))}

                  <p style={{ margin: "16px 0 10px", fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#333" }}>Pago</p>
                  {PAGO_OPTIONS.map(opt => (
                    <label key={opt.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: `1px solid ${pagoId === opt.id ? ACC : "#e0e0e0"}`, marginBottom: 8, cursor: "pointer", background: pagoId === opt.id ? `${ACC}10` : "#fff" }}>
                      <input type="radio" checked={pagoId === opt.id} onChange={() => setPagoId(opt.id)} style={{ accentColor: ACC }} />
                      <span style={{ fontSize: 13 }}>{opt.label}</span>
                    </label>
                  ))}

                  {/* Cupón */}
                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="Código de cupón"
                      style={{ ...iStyle, flex: 1 }}
                      onFocus={e => (e.target.style.borderColor = ACC)}
                      onBlur={e => (e.target.style.borderColor = "#ddd")} />
                    <button type="button" onClick={handleApplyCoupon}
                      style={{ background: "#111", color: "#fff", border: "none", padding: "0 18px", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap" }}>
                      Aplicar
                    </button>
                  </div>
                  {couponError && <p style={{ color: "#dc2626", fontSize: 12, margin: "6px 0 0" }}>{couponError}</p>}
                  {appliedCoupon && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0fdf4", border: "1px solid #86efac", padding: "8px 14px", marginTop: 8 }}>
                      <span style={{ fontSize: 12, color: "#166534", fontWeight: 700 }}>✓ Cupón {appliedCoupon.code} — −{fmt(appliedCoupon.discount)}</span>
                      <button type="button" onClick={() => setAppliedCoupon(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#999" }}>×</button>
                    </div>
                  )}

                  <textarea placeholder="Notas adicionales (opcional)" value={notas} onChange={e => setNotas(e.target.value)} rows={2}
                    style={{ ...iStyle, resize: "none", marginTop: 16 }}
                    onFocus={e => (e.target.style.borderColor = ACC)}
                    onBlur={e => (e.target.style.borderColor = "#ddd")} />
                </div>

                {/* Summary */}
                <div style={{ padding: "16px 24px", borderTop: "1px solid #f0f0f0" }}>
                  {[[`Subtotal (${cartCount} productos)`, fmt(cartTotal)], ["Envío", envioPrice === 0 ? "Gratis" : fmt(envioPrice)], ...(appliedCoupon ? [["Descuento", `−${fmt(couponDiscount)}`]] : [])].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: "#666" }}>{k}</span>
                      <span style={{ fontSize: 13, color: k === "Descuento" ? "#16a34a" : "#111", fontWeight: k === "Descuento" ? 700 : 400 }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px solid #f0f0f0" }}>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>Total</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: ACC }}>{fmt(orderTotal)}</span>
                  </div>
                  {checkoutError && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 8 }}>{checkoutError}</p>}
                  <button type="submit" disabled={checkoutStatus === "placing"}
                    style={{ width: "100%", background: ACC, color: getContrastColor(ACC) === "light" ? "#fff" : "#111", border: "none", padding: "14px", fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer", marginTop: 14, opacity: checkoutStatus === "placing" ? 0.7 : 1 }}>
                    {checkoutStatus === "placing" ? "Procesando..." : "Confirmar pedido"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── FAVORITES ── */}
      {favoritesOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9500, display: "flex" }} onClick={() => setFavoritesOpen(false)}>
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
                  <img src={product.images[0] ?? "/placeholder.jpg"} alt={product.name} style={{ width: 64, height: 80, objectFit: "cover" }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600 }}>{product.name}</p>
                    <p style={{ margin: "0 0 8px", fontSize: 13, color: ACC, fontWeight: 700 }}>{ocultarPrecios ? "Consultá precio" : fmt(product.price)}</p>
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
        <div style={{ position:"fixed", inset:0, zIndex:9500, background:"rgba(0,0,0,0.97)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="" style={{ maxWidth:"100vw", maxHeight:"100vh", objectFit:"contain", touchAction:"pinch-zoom" }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxSrc(null)} style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", width:44, height:44, borderRadius:"50%", fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
      )}

      {/* ── FLOATING CART BUTTON ────────────────────────────── */}
      <button onClick={() => setCartOpen(true)}
        style={{ position:"fixed", bottom:24, ...(hasWA ? {left:24} : {right:24}), zIndex:500, width:52, height:52, borderRadius:"50%", background:ACC, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 20px rgba(0,0,0,0.2)", transition:"transform 0.2s" }}
        onMouseEnter={e => (e.currentTarget.style.transform="scale(1.1)")}
        onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}>
        <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={getContrastColor(ACC)==="light"?"#fff":"#111"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
        {cartCount > 0 && <span style={{ position:"absolute", top:-4, right:-4, background:"#e53e3e", color:"#fff", borderRadius:"50%", width:20, height:20, fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{cartCount}</span>}
      </button>

      {/* ── TOAST ── */}
      {toastMsg && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#111", color: "#fff", padding: "12px 24px", borderRadius: 4, fontSize: 13, fontWeight: 600, zIndex: 99999, animation: "cp-toast 0.3s ease", boxShadow: "0 8px 24px rgba(0,0,0,0.25)", whiteSpace: "nowrap" }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}
