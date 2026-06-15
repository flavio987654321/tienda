"use client";
import { useState, useEffect, useMemo, Fragment } from "react";
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

export default function UrbanPulse() {
  const [scrolled,         setScrolled]         = useState(false);
  const [activeCategory,   setActiveCategory]   = useState("Todos");
  const [activeGender,     setActiveGender]     = useState<string | null>(null);
  const [hoveredNavCat,    setHoveredNavCat]    = useState<string | null>(null);
  const [visibleCount,     setVisibleCount]     = useState(8);
  const [openPolicyField,  setOpenPolicyField]  = useState<string | null>(null);
  const [isMobile,         setIsMobile]         = useState(false);
  const [reelIndex,        setReelIndex]        = useState(0);
  const [mobileMenuOpen,   setMobileMenuOpen]   = useState(false);
  const [mobileCatsOpen,   setMobileCatsOpen]   = useState(false);
  const [mobileOpenCat,    setMobileOpenCat]    = useState<string | null>(null);
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
  const { products, checkoutMode, isWholesale, ocultarPrecios, defaultCategories, featuredCategories } = storefront;
  const { editMode, overrides: textOverrides, setOverride } = useEditContext();
  const isInquiryMode = checkoutMode === "inquiry" || ocultarPrecios;

  const categoryList = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(c => c && c !== "general"))];
    const base = cats.length > 0 ? cats : defaultCategories.slice(0, 6);
    return featuredCategories.length > 0 ? base.filter(c => featuredCategories.includes(c)) : base;
  }, [products, defaultCategories, featuredCategories]);
  const CATEGORIES = useMemo(() => ["Todos", ...categoryList], [categoryList]);

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
  const contactUpMid    = getContrastColor(contactUpBg) === "light" ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  const contactInputBg  = getContrastColor(contactUpBg) === "light" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const contactInputBorder = getContrastColor(contactUpBg) === "light" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)";
  const contactBgImg    = storeConfig?.imageOverrides?.["sectionbg_bgContacto"];
  const footerUpBg      = scu["bgFooter"]     ?? "#080808";
  const footerUpText    = getContrastColor(footerUpBg) === "light" ? WHITE : DARK;
  const footerUpMid     = getContrastColor(footerUpBg) === "light" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)";
  const footerBgImg     = storeConfig?.imageOverrides?.["sectionbg_bgFooter"];
  const productosBgUp   = scu["bgProductos"]  ?? BG;
  const productosTextUp = getContrastColor(productosBgUp) === "light" ? WHITE : DARK;
  const productosMidUp  = getContrastColor(productosBgUp) === "light" ? "rgba(255,255,255,0.5)" : MID;

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
  const featuredProduct  = products[7] ?? products[0] ?? null;

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
      <nav style={{ position:"sticky", top:0, zIndex:100, background: scrolled ? WHITE : "rgba(245,245,245,0.95)", borderBottom: scrolled ? `3px solid ${DARK}` : "3px solid transparent", backdropFilter:"blur(8px)", transition:"all 0.3s", padding:"0 20px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
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
              <div style={{ position:"absolute", top:"calc(100% + 12px)", left:0, background:WHITE, border:`2px solid ${DARK}`, minWidth:180, zIndex:500, padding:"6px 0", boxShadow:`4px 4px 0 ${DARK}` }}>
                {categoryList.map(cat => {
                  const subs = subcategoriesFor[cat] || [];
                  return (
                    <div key={cat} style={{ position:"relative" }}
                      onMouseEnter={() => setHoveredNavCat(cat)}
                      onMouseLeave={() => setHoveredNavCat("__open__")}>
                      <button onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=urban-pulse${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat)}`; setHoveredNavCat(null); }}
                        style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", background: hoveredNavCat===cat ? "#f5f5f5" : "none", border:"none", color:DARK, padding:"9px 16px", fontSize:11, fontWeight:700, textAlign:"left", cursor:"pointer", letterSpacing:2, textTransform:"uppercase" }}>
                        {cat}
                        {subs.length > 0 && <span style={{ opacity:0.5, fontSize:10 }}>›</span>}
                      </button>
                      {subs.length > 0 && hoveredNavCat === cat && (
                        <div style={{ position:"absolute", top:0, left:"100%", background:WHITE, border:`2px solid ${DARK}`, minWidth:160, padding:"6px 0", boxShadow:`4px 4px 0 ${DARK}`, zIndex:501 }}>
                          {subs.map(sub => (
                            <button key={sub} onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=urban-pulse${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat)}&subcategoria=${encodeURIComponent(sub)}`; setHoveredNavCat(null); }}
                              style={{ display:"block", width:"100%", background:"none", border:"none", color:DARK, padding:"8px 16px", fontSize:11, fontWeight:700, textAlign:"left", cursor:"pointer", letterSpacing:1, textTransform:"uppercase" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")}
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
          <button onClick={() => setSearchOpen(true)} style={iconBtn}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          {pushBell && storeConfig?.showPushBell && !isPreview && (
            <button onClick={pushBell.openDrawer} style={{ ...iconBtn, position:"relative" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill={pushBell.subState === "subscribed" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {pushBell.hasNew && <span style={{ position:"absolute", top:4, right:4, width:10, height:10, background:"#ef4444", borderRadius:"50%", border:`2px solid ${DARK}` }} />}
            </button>
          )}
          {isPreview && (
            storeConfig?.showPushBell ? (
              <div title="Campanita de novedades — activa en tu tienda" style={{ ...iconBtn, position:"relative", cursor:"default", opacity:0.85 }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
            ) : (
              <a href="/dashboard/mi-plan" title="🔒 Solo Plan Plus — tocá para activar" style={{ ...iconBtn, position:"relative", opacity:0.38, textDecoration:"none" }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <span style={{ position:"absolute", top:4, right:4, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
              </a>
            )
          )}
          <button onClick={() => setFavoritesOpen(true)} style={{ ...iconBtn, position:"relative" }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill={favorites.length > 0 ? DARK : "none"} stroke={DARK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>
            {favorites.length > 0 && <span style={{ position:"absolute", top:4, right:4, width:8, height:8, background:ACC, border:`2px solid ${DARK}`, borderRadius:"50%" }} />}
          </button>
          <div style={{ position:"relative" }} ref={userDropdownRef}>
            <button onClick={() => setUserDropdownOpen(o => !o)} style={iconBtn}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
            {userDropdownOpen && (
              <div className="up-fade" style={{ position:"absolute", top:"calc(100% + 8px)", right:0, background:WHITE, border:`2px solid ${DARK}`, minWidth:180, zIndex:200 }}>
                {["Iniciar sesión","Registrarse","Mis pedidos","Mi perfil"].map(label => (
                  <button key={label} onClick={() => setUserDropdownOpen(false)}
                    style={{ display:"block", width:"100%", padding:"10px 16px", background:"none", border:"none", borderBottom:`1px solid ${BG}`, textAlign:"left", fontSize:11, fontWeight:800, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", color:DARK }}
                    onMouseEnter={e => { e.currentTarget.style.background = ACC; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                  >{label}</button>
                ))}
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
        <div style={{ position:"relative", overflow:"hidden" }}>
          <img src={storeConfig?.imageOverrides?.["heroImage"]?.url ?? "https://picsum.photos/seed/up_hero/800/900"} alt="Hero" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:`${storeConfig?.imageOverrides?.["heroImage"]?.posX ?? 50}% ${storeConfig?.imageOverrides?.["heroImage"]?.posY ?? 50}%`, display:"block" }} />
          <BgDragHandle imgKey="heroImage" />
          <EditableImageButton field="heroImage" label="Imagen hero" />
          {(() => { const ov = storeConfig?.imageOverrides?.["heroImage"]; if (!ov?.overlayType || ov.overlayType === "none") return null; return <div style={{ position:"absolute", inset:0, pointerEvents:"none", background: ov.overlayType === "light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.45})` }} />; })()}
          <div style={{ position:"absolute", top:36, right:36, background:ACC, color:DARK, padding:"12px 20px", fontWeight:900, fontSize:10, letterSpacing:4, textTransform:"uppercase" }}>
            <EditableZone field="heroNewDropBadge" label="Badge hero">New Drop</EditableZone>
          </div>
        </div>
      </section>

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
              style={{ position:"relative", aspectRatio:"3/4", overflow:"hidden", cursor:"pointer" }}>
              <img src={c.img} alt={c.label} style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:`${storeConfig?.imageOverrides?.[c.field]?.posX ?? 50}% ${storeConfig?.imageOverrides?.[c.field]?.posY ?? 50}%`, display:"block" }} />
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

      {/* MAYORISTA — banner "Solicitá tu lista de precios" */}
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

      {/* FEATURED DROP */}
      {featuredProduct && (
      <section id="featured" data-reveal style={{ background:featuredBg, padding:"80px 40px", position:"relative" }}>
        <EditableSectionBg field="bgFeatured" label="Fondo featured" />
        <div style={{ maxWidth:1100, margin:"0 auto", display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:0, alignItems:"center" }}>
          <div style={{ position:"relative" }}>
            <img src={featuredProduct.images[0]} alt={featuredProduct.name} style={{ width:"100%", aspectRatio:"3/4", objectFit:"cover", display:"block" }} />
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

      {/* PRODUCTS */}
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
            return (
              <div key={product.id} className="up-prod" onClick={() => openModal(product)}
                style={{ gridColumn: big ? "span 2" : "span 1", cursor:"pointer", position:"relative", overflow:"hidden", background:WHITE }}>
                <div style={{ overflow:"hidden", aspectRatio: big ? "16/9" : "3/4" }}>
                  <img className="up-prod-img" src={product.images[0]} alt={product.name} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                </div>
                <div style={{ padding:"14px 16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <p style={{ margin:0, fontSize:10, color:MID, fontWeight:800, letterSpacing:2, textTransform:"uppercase" }}>{product.category}</p>
                      <p style={{ margin:"4px 0 0", fontSize:14, fontWeight:800 }}>{product.name}</p>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      {!ocultarPrecios && product.comparePrice && <p style={{ margin:0, fontSize:11, color:MID, textDecoration:"line-through" }}>{fmt(product.comparePrice)}</p>}
                      <p style={{ margin:0, fontSize:15, fontWeight:900, color: product.comparePrice ? RED : DARK }}>{ocultarPrecios ? "Consultá precio" : fmt(product.price)}</p>
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
            style={{ display:"inline-block", background:DARK, color:ACC, border:`3px solid ${DARK}`, padding:"16px 52px", fontSize:11, fontWeight:900, letterSpacing:4, textTransform:"uppercase", textDecoration:"none", transition:"all 0.2s" }}
            onMouseEnter={e=>{ e.currentTarget.style.background=ACC; e.currentTarget.style.color=DARK; e.currentTarget.style.borderColor=DARK; }}
            onMouseLeave={e=>{ e.currentTarget.style.background=DARK; e.currentTarget.style.color=ACC; e.currentTarget.style.borderColor=DARK; }}>
            Ver colección completa
          </a>
        </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
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
                  "<EditableZone field={`testimonial${i+1}Text`} label={`Testimonio ${i+1} — Texto`}>{t.text}</EditableZone>"
                </p>
                <p style={{ color:ACC, fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", margin:0 }}>
                  <EditableZone field={`testimonial${i+1}Name`} label={`Testimonio ${i+1} — Nombre`}>{t.name}</EditableZone>
                </p>
              </div>
            );
          })}
        </div>
      </section>

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
        <div style={{ position:"relative", overflow:"hidden" }}>
          <img src={storeConfig?.imageOverrides?.["nosotrosImage"]?.url ?? "https://picsum.photos/seed/up_about/600/700"} alt="Nosotros" style={{ width:"100%", aspectRatio:"4/5", objectFit:"cover", objectPosition:`${storeConfig?.imageOverrides?.["nosotrosImage"]?.posX ?? 50}% ${storeConfig?.imageOverrides?.["nosotrosImage"]?.posY ?? 50}%`, display:"block" }} />
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
            {contactStatus === "sent" ? (
              <div style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", border:`2px solid ${ACC}`, padding:40 }}>
                <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom:16 }}><polyline points="20 6 9 17 4 12"/></svg>
                <p style={{ color:contactUpText, fontSize:20, fontWeight:900, textTransform:"uppercase", margin:"0 0 8px" }}>¡Mensaje enviado!</p>
                <p style={{ color:contactUpText, opacity:0.45, fontSize:13, margin:0 }}>Te respondemos pronto.</p>
              </div>
            ) : (
              <form onSubmit={handleContact} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <input type="text" placeholder="Tu nombre *" required
                  value={contactForm.nombre} onChange={e => setContactForm(f => ({ ...f, nombre:e.target.value }))}
                  style={{ background:contactInputBg, border:`1px solid ${contactInputBorder}`, color:contactUpText, padding:"16px 20px", fontSize:14, outline:"none", fontFamily:"inherit" }} />
                <input type="email" placeholder="Tu email *" required
                  value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email:e.target.value }))}
                  style={{ background:contactInputBg, border:`1px solid ${contactInputBorder}`, color:contactUpText, padding:"16px 20px", fontSize:14, outline:"none", fontFamily:"inherit" }} />
                <textarea placeholder="Tu mensaje *" required rows={5}
                  value={contactForm.mensaje} onChange={e => setContactForm(f => ({ ...f, mensaje:e.target.value }))}
                  style={{ background:contactInputBg, border:`1px solid ${contactInputBorder}`, color:contactUpText, padding:"16px 20px", fontSize:14, outline:"none", resize:"vertical", fontFamily:"inherit" }} />
                <button type="submit" disabled={contactStatus === "sending"}
                  style={{ background:ACC, color:DARK, border:"none", padding:"18px", fontSize:11, fontWeight:900, letterSpacing:4, textTransform:"uppercase", cursor:"pointer" }}>
                  {contactStatus === "sending" ? "Enviando..." : "Enviar Mensaje →"}
                </button>
              </form>
            )}
          </div>
        </div>
        </div>
      </section>

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
                  { label: "Devoluciones", tipo: "devoluciones", policyField: "policyReturns" },
                  { label: "Envíos",       tipo: "envios",       policyField: "policyShipping" },
                  { label: "Términos",     tipo: "terminos",     policyField: "policyTerms" },
                ].map(({ label, tipo, policyField }) => (
                  editMode ? (
                    <button key={tipo} type="button" onClick={() => setOpenPolicyField(policyField)}
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
            <div style={{ borderTop:`1px solid ${footerUpMid}`, paddingTop:22, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"8px 24px" }}>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"0 16px" }}>
                {[
                  { label: "Devoluciones", tipo: "devoluciones", policyField: "policyReturns" },
                  { label: "Envíos",       tipo: "envios",       policyField: "policyShipping" },
                  { label: "Términos",     tipo: "terminos",     policyField: "policyTerms" },
                ].map(({ label, tipo, policyField }) => (
                  editMode ? (
                    <button key={tipo} type="button" onClick={() => setOpenPolicyField(policyField)}
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

      {openPolicyField && (
        <PolicyEditorModal field={openPolicyField} onClose={() => setOpenPolicyField(null)} />
      )}

      {showReport && (
        <ReportStoreModal slug={storeConfig?.slug ?? ""} onClose={() => setShowReport(false)} />
      )}

      {/* ── FLOATING CART BUTTON ────────────────────────────── */}
      <button onClick={() => setCartOpen(true)}
        style={{ position:"fixed", bottom:24, ...(hasWA ? {left:24} : {right:24}), zIndex:500, width:52, height:52, borderRadius:"50%", background:ACC, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 20px rgba(0,0,0,0.25)", transition:"transform 0.2s" }}
        onMouseEnter={e => (e.currentTarget.style.transform="scale(1.1)")}
        onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}>
        <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={getContrastColor(ACC)==="light"?"#fff":DARK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
        {cartCount > 0 && <span style={{ position:"absolute", top:-4, right:-4, background:"#e53e3e", color:"#fff", borderRadius:"50%", width:20, height:20, fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{cartCount}</span>}
      </button>

      {/* WHATSAPP */}
      {(!storeConfig || storeConfig.whatsapp.enabled) && (
        <EditableFixed field="whatsapp" label="WhatsApp" bottom={24} right={24}>
          <a href={`https://wa.me/${(storeConfig?.whatsapp.number ?? "5491100000000").replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
            style={{ position:"fixed", bottom:24, right:24, background:"#25D366", width:56, height:56, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, boxShadow:"0 4px 20px rgba(37,211,102,0.4)", textDecoration:"none" }}>
            <svg viewBox="0 0 24 24" width={28} height={28} fill={WHITE}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </a>
        </EditableFixed>
      )}

      {/* SEARCH OVERLAY */}
      {searchOpen && (
        <div className="up-fade" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.96)", zIndex:1000, padding:"80px 40px 40px", overflowY:"auto" }}>
          <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} style={{ position:"absolute", top:24, right:28, background:"none", border:"none", color:WHITE, fontSize:28, cursor:"pointer" }}>✕</button>
          <div style={{ maxWidth:680, margin:"0 auto" }}>
            <p style={{ color:"rgba(255,255,255,0.4)", fontSize:10, letterSpacing:6, fontWeight:800, textTransform:"uppercase", marginBottom:20 }}>Buscar</p>
            <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar productos..."
              style={{ width:"100%", background:"none", border:"none", borderBottom:`3px solid ${ACC}`, color:WHITE, fontSize:32, fontWeight:900, padding:"12px 0", outline:"none", fontFamily:"inherit", letterSpacing:"-0.5px" }} />
            <div style={{ marginTop:40, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {(searchQuery.trim() ? searchResults : products.slice(0,4)).map(p => (
                <div key={p.id} onClick={() => { openModal(p); setSearchQuery(""); }}
                  style={{ display:"flex", gap:14, cursor:"pointer", padding:14, background:"rgba(255,255,255,0.05)" }}>
                  <img src={p.images[0]} alt={p.name} style={{ width:56, height:72, objectFit:"cover", flexShrink:0 }} />
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
        <div className="up-fade" style={{ position:"fixed", inset:0, zIndex:500 }}>
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
                    <img src={p.images[0]} alt={p.name} style={{ width:68, height:86, objectFit:"cover", flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontSize:10, color:MID, fontWeight:800, letterSpacing:2, textTransform:"uppercase" }}>{p.category}</p>
                      <p style={{ margin:"4px 0 6px", fontSize:13, fontWeight:800 }}>{p.name}</p>
                      <p style={{ margin:"0 0 10px", fontSize:14, fontWeight:900 }}>{ocultarPrecios ? "Consultá precio" : fmt(p.price)}</p>
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
        <div className="up-fade" style={{ position:"fixed", inset:0, zIndex:600 }}>
          <div onClick={() => setModalProduct(null)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.7)" }} />
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
            <div style={{ background:WHITE, width:"100%", maxWidth:860, maxHeight:"92vh", overflow:"hidden", display:"flex", flexDirection:"column", position:"relative" }}>
              <button onClick={() => { setModalProduct(null); setLightboxSrc(null); }} style={{ position:"absolute", top:0, right:0, background:DARK, border:"none", color:ACC, width:40, height:40, fontSize:18, cursor:"pointer", zIndex:10, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
              <div style={{ overflow:"auto", flex:1, minHeight:0, display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
              <div>
                <div style={{ position:"relative" }} {...imgSwipe}>
                  <img src={modalProduct.images[modalImg]} alt={modalProduct.name} style={{ width:"100%", aspectRatio:"3/4", objectFit:"cover", display:"block", cursor:"zoom-in" }}
                    onClick={() => setLightboxSrc(modalProduct.images[modalImg])} />
                  {modalProduct.images.length > 1 && (<>
                    <button onClick={() => setModalImg(i => (i - 1 + modalProduct.images.length) % modalProduct.images.length)}
                      style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", background:"rgba(0,0,0,0.55)", border:"none", color:"#fff", width:42, height:42, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:700, zIndex:2, borderRadius:2 }}>‹</button>
                    <button onClick={() => setModalImg(i => (i + 1) % modalProduct.images.length)}
                      style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"rgba(0,0,0,0.55)", border:"none", color:"#fff", width:42, height:42, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:700, zIndex:2, borderRadius:2 }}>›</button>
                    <div style={{ position:"absolute", bottom:8, right:8, background:"rgba(0,0,0,0.5)", color:"#fff", fontSize:10, letterSpacing:1, padding:"3px 8px", borderRadius:2, zIndex:2 }}>
                      {modalImg+1} / {modalProduct.images.length}
                    </div>
                  </>)}
                </div>
                {modalProduct.images.length > 1 && (
                  <div style={{ display:"flex", gap:4, padding:4 }}>
                    {modalProduct.images.map((img, i) => (
                      <img key={i} src={img} alt="" onClick={() => setModalImg(i)}
                        style={{ width:58, height:68, objectFit:"cover", cursor:"pointer", border: i === modalImg ? `2px solid ${DARK}` : "2px solid transparent", opacity: i === modalImg ? 1 : 0.5 }} />
                    ))}
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
                  <button onClick={() => whatsappShare(modalProduct)}
                    style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(37,211,102,0.08)", border:"1px solid rgba(37,211,102,0.25)", color:"rgba(37,211,102,0.7)", padding:"5px 12px", fontSize:9, fontWeight:900, letterSpacing:1.5, textTransform:"uppercase", cursor:"pointer", transition:"color 0.2s" }}
                    onMouseEnter={e=>(e.currentTarget.style.color="#25D366")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(37,211,102,0.7)")}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M11.897 0C5.395 0 .13 5.266.13 11.767c0 2.078.545 4.03 1.495 5.727L.057 24l6.7-1.757A11.71 11.71 0 0 0 11.897 23.534c6.503 0 11.768-5.265 11.768-11.767C23.67 5.266 18.4 0 11.897 0zm0 21.536h-.004a9.726 9.726 0 0 1-4.96-1.358l-.356-.211-3.678.965.982-3.581-.232-.368A9.73 9.73 0 0 1 2.158 11.767C2.158 6.355 6.551 2 11.897 2c2.581 0 5.007 1.007 6.831 2.831a9.604 9.604 0 0 1 2.828 6.83c0 5.347-4.393 9.875-9.659 9.875z"/></svg>
                    WhatsApp
                  </button>
                </div>
                <div style={{ display:"flex", gap:14, alignItems:"baseline", marginBottom:22 }}>
                  <span style={{ fontSize:28, fontWeight:900, color: modalProduct.comparePrice ? RED : DARK }}>{ocultarPrecios ? "Consultá precio" : fmt(modalProduct.price)}</span>
                  {!ocultarPrecios && modalProduct.comparePrice && <span style={{ fontSize:15, color:MID, textDecoration:"line-through" }}>{fmt(modalProduct.comparePrice)}</span>}
                </div>
                <div style={{ marginBottom:18 }}>
                  <p style={{ margin:"0 0 8px", fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase" }}>Talle: <span style={{ color:MID, fontWeight:600 }}>{selectedSize}</span></p>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {modalProduct.sizes.map(s => (
                      <button key={s} onClick={() => setSelectedSize(s)}
                        style={{ border:`2px solid ${selectedSize === s ? DARK : "#ddd"}`, background: selectedSize === s ? DARK : WHITE, color: selectedSize === s ? ACC : DARK, padding:"7px 13px", fontSize:11, fontWeight:800, cursor:"pointer", letterSpacing:1 }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom:22 }}>
                  <p style={{ margin:"0 0 8px", fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase" }}>Color: <span style={{ color:MID, fontWeight:600 }}>{selectedColor}</span></p>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {modalProduct.colors.map(c => (
                      <button key={c} onClick={() => setSelectedColor(c)}
                        style={{ border:`2px solid ${selectedColor === c ? DARK : "#ddd"}`, background:WHITE, color: selectedColor === c ? DARK : MID, padding:"6px 12px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:26 }}>
                  <span style={{ fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase" }}>Cantidad</span>
                  <div style={{ display:"flex", alignItems:"center", border:`2px solid ${DARK}` }}>
                    <button onClick={() => setQty(q => Math.max(1,q-1))} style={{ width:36, height:36, background:"none", border:"none", fontSize:18, cursor:"pointer", fontWeight:900 }}>−</button>
                    <span style={{ width:32, textAlign:"center", fontWeight:900 }}>{qty}</span>
                    <button onClick={() => setQty(q => q+1)} style={{ width:36, height:36, background:"none", border:"none", fontSize:18, cursor:"pointer", fontWeight:900 }}>+</button>
                  </div>
                </div>
                {/* Stock por variante */}
                {selectedVariantStock !== null && selectedVariantStock === 0 && (
                  <p style={{ fontSize:12, color:"#888", fontWeight:700, margin:0 }}>Sin stock en esta combinación</p>
                )}
                {selectedVariantStock !== null && selectedVariantStock > 0 && selectedVariantStock <= 5 && (
                  <p style={{ fontSize:12, color:"#ef4444", fontWeight:900, margin:0 }}>¡Últimas {selectedVariantStock} unidades!</p>
                )}
                {/* Videos del producto */}
                {modalProduct.reelUrls.length > 0 && (
                  <div style={{ borderTop:`2px solid ${DARK}`, paddingTop:14, marginBottom:8 }}>
                    <p style={{ fontSize:9, letterSpacing:3, fontWeight:900, textTransform:"uppercase", marginBottom:10, color:DARK, opacity:0.4 }}>Videos</p>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
                      {(() => {
                        const url = modalProduct.reelUrls[reelIndex];
                        if (/\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url)) {
                          return <video controls style={{ width:160, aspectRatio:"9/16", objectFit:"cover", background:"#000" }}><source src={url} /></video>;
                        }
                        let embedUrl = "";
                        if (url.includes("youtube.com/shorts/")) { const id = url.split("shorts/")[1]?.split("?")[0]; embedUrl = `https://www.youtube.com/embed/${id}`; }
                        else if (url.includes("youtu.be/")) { const id = url.split("youtu.be/")[1]?.split("?")[0]; embedUrl = `https://www.youtube.com/embed/${id}`; }
                        else if (url.includes("youtube.com/watch")) { try { const id = new URL(url).searchParams.get("v"); if (id) embedUrl = `https://www.youtube.com/embed/${id}`; } catch {} }
                        if (embedUrl) return <iframe src={embedUrl} allow="autoplay; encrypted-media" allowFullScreen style={{ width:160, aspectRatio:"9/16", border:"none" }} />;
                        const platform = url.includes("instagram") ? "Instagram Reel" : url.includes("tiktok") ? "TikTok" : "Video";
                        return (
                          <a href={url} target="_blank" rel="noopener noreferrer"
                            style={{ width:160, aspectRatio:"9/16", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, border:`2px solid ${DARK}`, textDecoration:"none", color:DARK }}>
                            <svg width={24} height={24} viewBox="0 0 24 24" fill={ACC} stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            <span style={{ fontSize:11, fontWeight:900, letterSpacing:1 }}>{platform}</span>
                          </a>
                        );
                      })()}
                      {modalProduct.reelUrls.length > 1 && (
                        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                          <button onClick={() => setReelIndex(i => (i - 1 + modalProduct.reelUrls.length) % modalProduct.reelUrls.length)}
                            style={{ background:"none", border:`2px solid ${DARK}`, color:DARK, width:30, height:30, borderRadius:"50%", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
                          <div style={{ display:"flex", gap:5 }}>
                            {modalProduct.reelUrls.map((_, i) => (
                              <button key={i} onClick={() => setReelIndex(i)}
                                style={{ width:6, height:6, borderRadius:"50%", background: i === reelIndex ? ACC : `${DARK}44`, border:"none", cursor:"pointer", padding:0 }} />
                            ))}
                          </div>
                          <button onClick={() => setReelIndex(i => (i + 1) % modalProduct.reelUrls.length)}
                            style={{ background:"none", border:`2px solid ${DARK}`, color:DARK, width:30, height:30, borderRadius:"50%", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {isInquiryMode ? (
                  <button onClick={() => openInquiry(modalProduct)}
                    style={{ width:"100%", background:DARK, color:ACC, border:"none", padding:"16px", fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", marginBottom:10 }}>
                    Consultar disponibilidad
                  </button>
                ) : (
                  <button onClick={addToCart} disabled={selectedVariantStock === 0}
                    style={{ width:"100%", background: selectedVariantStock === 0 ? "#555" : DARK, color:ACC, border:"none", padding:"16px", fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor: selectedVariantStock === 0 ? "not-allowed" : "pointer", marginBottom:10 }}>
                    {selectedVariantStock === 0 ? "Sin stock" : `Agregar · ${fmt(modalProduct.price * qty)}`}
                  </button>
                )}
                <button onClick={() => toggleFavorite(modalProduct.id)}
                  style={{ width:"100%", background:"none", border:`2px solid ${DARK}`, color:DARK, padding:"12px", fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill={favorites.includes(modalProduct.id) ? DARK : "none"} stroke={DARK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  {favorites.includes(modalProduct.id) ? "Guardado" : "Guardar en favoritos"}
                </button>

                {/* Reseñas — D-04 */}
                <div style={{ borderTop:`2px solid ${DARK}`, paddingTop:20, marginTop:20 }}>
                  <p style={{ fontSize:9, letterSpacing:3, fontWeight:900, textTransform:"uppercase", color:MID, margin:"0 0 16px" }}>
                    Reseñas{reviews.length > 0 && ` (${reviews.length})`}
                  </p>
                  {reviewsLoading ? (
                    <p style={{ fontSize:12, color:MID }}>Cargando...</p>
                  ) : reviews.length > 0 ? (
                    <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:20 }}>
                      {reviews.map(r => (
                        <div key={r.id} style={{ borderBottom:`1px solid ${DARK}`, paddingBottom:14 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                            <span style={{ fontSize:12, fontWeight:900, textTransform:"uppercase" }}>{r.reviewer}</span>
                            <span style={{ fontSize:14, color:ACC }}>{[1,2,3,4,5].map(s => s <= r.rating ? "★" : "☆").join("")}</span>
                          </div>
                          {r.comment && <p style={{ fontSize:12, color:MID, margin:0, lineHeight:1.6 }}>{r.comment}</p>}
                        </div>
                      ))}
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
                        <div style={{ display:"flex", gap:4 }}>
                          {[1,2,3,4,5].map(s => (
                            <button key={s} type="button" onClick={() => !isPreview && setReviewForm(p => ({ ...p, rating: s }))}
                              style={{ background:"none", border:"none", fontSize:20, cursor: isPreview ? "default" : "pointer", color: s <= reviewForm.rating ? ACC : DARK, padding:"2px" }}>★</button>
                          ))}
                        </div>
                        <textarea value={reviewForm.comment} onChange={e => !isPreview && setReviewForm(p => ({ ...p, comment: e.target.value }))}
                          placeholder="Comentario (opcional)" rows={3} readOnly={isPreview}
                          style={{ background:"none", border:`2px solid ${DARK}`, padding:"9px 12px", fontSize:12, resize:"none", outline:"none" }} />
                        <button type="submit" disabled={isPreview || !reviewForm.reviewer.trim()}
                          style={{ background: isPreview || !reviewForm.reviewer.trim() ? MID : DARK, color:ACC, border:"none", padding:"12px", fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor: isPreview ? "default" : "pointer" }}>
                          Publicar reseña
                        </button>
                      </form>
                      {isPreview && <p style={{ fontSize:10, color:MID, fontStyle:"italic", marginTop:6 }}>Vista previa — solo disponible en la tienda real.</p>}
                    </div>
                  )}
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CART DRAWER */}
      {cartOpen && (
        <div className="up-fade" style={{ position:"fixed", inset:0, zIndex:700, overflow:"hidden" }}>
          <div onClick={() => setCartOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)" }} />
          <div style={{ position:"absolute", right:0, top:0, bottom:0, left: isMobile ? 0 : "auto", width: isMobile ? "auto" : 440, background:WHITE, display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"20px 24px", borderBottom:`3px solid ${DARK}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <h3 style={{ margin:0, fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase" }}>Carrito ({cartCount})</h3>
              <button onClick={() => setCartOpen(false)} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:24 }}>
              {cartItems.length === 0
                ? <p style={{ color:MID, textAlign:"center", marginTop:60, fontSize:14 }}>Tu carrito está vacío.</p>
                : cartItems.map((item, idx) => (
                  <div key={idx} style={{ display:"flex", gap:14, marginBottom:20, paddingBottom:20, borderBottom:`1px solid ${BG}` }}>
                    <img src={item.product.images[0]} alt={item.product.name} style={{ width:68, height:86, objectFit:"cover", flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontSize:13, fontWeight:800 }}>{item.product.name}</p>
                      <p style={{ margin:"3px 0 8px", fontSize:11, color:MID }}>Talle: {item.size} · {item.color}</p>
                      <p style={{ margin:0, fontSize:14, fontWeight:900 }}>{fmt(item.product.price)}</p>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:10 }}>
                        <div style={{ display:"flex", alignItems:"center", border:`1px solid ${DARK}` }}>
                          <button onClick={() => updateQty(idx,-1)} style={{ width:28, height:28, background:"none", border:"none", cursor:"pointer", fontWeight:900 }}>−</button>
                          <span style={{ width:28, textAlign:"center", fontSize:13, fontWeight:800 }}>{item.qty}</span>
                          <button onClick={() => updateQty(idx,1)} style={{ width:28, height:28, background:"none", border:"none", cursor:"pointer", fontWeight:900 }}>+</button>
                        </div>
                        <button onClick={() => removeFromCart(idx)} style={{ background:"none", border:"none", color:MID, fontSize:11, fontWeight:700, cursor:"pointer", letterSpacing:1, textTransform:"uppercase" }}>Quitar</button>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
            {cartItems.length > 0 && (
              <div style={{ padding:24, borderTop:`2px solid ${DARK}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:18 }}>
                  <span style={{ fontSize:12, fontWeight:900, letterSpacing:2, textTransform:"uppercase" }}>Total</span>
                  <span style={{ fontSize:20, fontWeight:900 }}>{fmt(cartTotal)}</span>
                </div>
                {wholesaleWarnings.length > 0 && (
                  <div style={{ marginBottom:12, padding:"10px 14px", background:"rgba(234,179,8,0.08)", borderLeft:"3px solid #eab308" }}>
                    <p style={{ fontSize:11, margin:0, color:"#eab308", fontWeight:700, letterSpacing:1 }}>CANTIDAD MÍNIMA NO ALCANZADA</p>
                    {wholesaleWarnings.map((item, i) => (
                      <p key={i} style={{ fontSize:10, margin:"3px 0 0", color:"rgba(0,0,0,0.5)" }}>
                        {item.product.name}: mín. {item.product.cantMinMayorista} uds.
                      </p>
                    ))}
                  </div>
                )}
                <button onClick={blockBuy ? undefined : openCheckout} disabled={blockBuy} title={isOwner ? "No podés comprar en tu propia tienda" : isPreview ? "No disponible en modo edición" : undefined} style={{ width:"100%", background: blockBuy ? "rgba(0,0,0,0.08)" : DARK, color: blockBuy ? "rgba(0,0,0,0.25)" : ACC, border:"none", padding:"18px", fontSize:11, fontWeight:900, letterSpacing:4, textTransform:"uppercase", cursor: blockBuy ? "not-allowed" : "pointer" }}>
                  {isOwner ? "No disponible para el dueño" : isPreview ? "Solo en la tienda real" : "Finalizar Compra →"}
                </button>
                {storeConfig?.whatsapp?.enabled && storeConfig.whatsapp.number && (
                  <a
                    href={`https://wa.me/${storeConfig.whatsapp.number.replace(/\D/g,"")}`}
                    target="_blank" rel="noreferrer"
                    style={{ display:"flex", alignItems:"center", gap:10, marginTop:12, padding:"10px 14px", background:"rgba(37,211,102,0.1)", textDecoration:"none" }}
                  >
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="#25D366" style={{ flexShrink:0 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    <div>
                      <p style={{ fontSize:9, margin:0, color:"rgba(255,255,255,0.4)", letterSpacing:2, textTransform:"uppercase" }}>¿TENÉS DUDAS?</p>
                      <p style={{ fontSize:11, margin:0, color:"#25D366", fontWeight:700, letterSpacing:1 }}>Consultá por WhatsApp</p>
                    </div>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHECKOUT DRAWER */}
      {checkoutOpen && (
        <div className="up-fade" style={{ position:"fixed", inset:0, zIndex:800 }}>
          <div onClick={() => { if (checkoutStatus !== "placing") setCheckoutOpen(false); }} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)" }} />
          <div style={{ position:"absolute", right:0, top:0, bottom:0, width:520, background:WHITE, display:"flex", flexDirection:"column", overflowY:"auto" }}>
            {checkoutStatus === "done" ? (
              <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40, textAlign:"center" }}>
                <div style={{ width:72, height:72, background:ACC, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:24 }}>
                  <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke={DARK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 style={{ fontSize:26, fontWeight:900, textTransform:"uppercase", margin:"0 0 10px" }}>¡Pedido creado!</h3>
                <p style={{ color:MID, fontSize:14, marginBottom:32 }}>Te contactamos en breve para confirmar.</p>
                <button onClick={() => setCheckoutOpen(false)} style={{ background:DARK, color:ACC, border:"none", padding:"14px 40px", fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor:"pointer" }}>Cerrar</button>
              </div>
            ) : (
              <form onSubmit={handlePlaceOrder} style={{ flex:1, display:"flex", flexDirection:"column" }}>
                <div style={{ padding:"20px 24px", borderBottom:`3px solid ${DARK}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <h3 style={{ margin:0, fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase" }}>Checkout</h3>
                  <button type="button" onClick={() => setCheckoutOpen(false)} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer" }}>✕</button>
                </div>
                <div style={{ flex:1, overflowY:"auto", padding:24 }}>
                  <p style={{ margin:"0 0 14px", fontSize:10, fontWeight:900, letterSpacing:4, textTransform:"uppercase" }}>Datos del comprador</p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24 }}>
                    {[
                      { key:"nombre",    placeholder:"Nombre completo", span:true },
                      { key:"email",     placeholder:"Email" },
                      { key:"telefono",  placeholder:"Teléfono" },
                      { key:"direccion", placeholder:"Dirección", span:true },
                      { key:"ciudad",    placeholder:"Ciudad" },
                      { key:"provincia", placeholder:"Provincia" },
                      { key:"cp",        placeholder:"Código postal" },
                    ].map(f => (
                      <input key={f.key} placeholder={f.placeholder} required
                        value={buyerForm[f.key as keyof typeof buyerForm]}
                        onChange={e => setBuyerForm(b => ({ ...b, [f.key]:e.target.value }))}
                        style={{ gridColumn: f.span ? "span 2" : "span 1", padding:"11px", border:`1px solid #ddd`, fontSize:13, outline:"none", fontFamily:"inherit" }} />
                    ))}
                  </div>
                  <p style={{ margin:"0 0 10px", fontSize:10, fontWeight:900, letterSpacing:4, textTransform:"uppercase" }}>Envío</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:22 }}>
                    {ENVIO_OPTIONS.map(opt => (
                      <label key={opt.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px", border:`2px solid ${envioId === opt.id ? DARK : "#ddd"}`, cursor:"pointer" }}>
                        <input type="radio" name="envio" value={opt.id} checked={envioId === opt.id} onChange={() => setEnvioId(opt.id)} style={{ accentColor:DARK }} />
                        <span style={{ flex:1, fontSize:13, fontWeight:700 }}>{opt.label}</span>
                        <span style={{ fontSize:13, fontWeight:900 }}>{opt.price === 0 ? "Gratis" : fmt(opt.price)}</span>
                      </label>
                    ))}
                  </div>
                  <p style={{ margin:"0 0 10px", fontSize:10, fontWeight:900, letterSpacing:4, textTransform:"uppercase" }}>Pago</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:22 }}>
                    {PAGO_OPTIONS.map(opt => (
                      <label key={opt.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px", border:`2px solid ${pagoId === opt.id ? DARK : "#ddd"}`, cursor:"pointer" }}>
                        <input type="radio" name="pago" value={opt.id} checked={pagoId === opt.id} onChange={() => setPagoId(opt.id)} style={{ accentColor:DARK }} />
                        <span style={{ fontSize:13, fontWeight:700 }}>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:8, marginBottom:20 }}>
                    <input value={coupon} onChange={e => setCoupon(e.target.value)} placeholder="Código de descuento"
                      style={{ flex:1, padding:"11px", border:`1px solid #ddd`, fontSize:13, outline:"none", fontFamily:"inherit" }} />
                    <button type="button" onClick={handleApplyCoupon} style={{ background:DARK, color:ACC, border:"none", padding:"0 18px", fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase", cursor:"pointer" }}>Aplicar</button>
                  </div>
                  {couponError && <p style={{ fontSize:11, color:RED, marginBottom:8, marginTop:-12 }}>{couponError}</p>}
                  {appliedCoupon && (
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, padding:"8px 12px", background:`rgba(212,255,0,0.08)`, border:`1px solid rgba(212,255,0,0.3)` }}>
                      <span style={{ fontSize:12, color:ACC }}>Cupón {appliedCoupon.code} aplicado</span>
                      <button type="button" onClick={() => setAppliedCoupon(null)} style={{ background:"none", border:"none", color:MID, cursor:"pointer", fontSize:12 }}>✕</button>
                    </div>
                  )}
                  <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Notas adicionales (opcional)" rows={3}
                    style={{ width:"100%", padding:"11px", border:`1px solid #ddd`, fontSize:13, outline:"none", resize:"none", fontFamily:"inherit", boxSizing:"border-box", marginBottom:20 }} />
                  <div style={{ background:BG, padding:14, marginBottom:8 }}>
                    {cartItems.map((item,i) => (
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:13 }}>
                        <span style={{ color:MID }}>{item.product.name} × {item.qty}</span>
                        <span style={{ fontWeight:700 }}>{fmt(item.product.price * item.qty)}</span>
                      </div>
                    ))}
                    {couponDiscount > 0 && (
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, paddingTop:6 }}>
                        <span style={{ color:ACC }}>Descuento cupón</span>
                        <span style={{ fontWeight:700, color:ACC }}>-{fmt(couponDiscount)}</span>
                      </div>
                    )}
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, paddingTop:8, borderTop:`1px solid #ddd` }}>
                      <span style={{ color:MID }}>Envío</span>
                      <span style={{ fontWeight:700 }}>{envioPrice === 0 ? "Gratis" : fmt(envioPrice)}</span>
                    </div>
                  </div>
                  <label style={{ display:"flex", gap:8, alignItems:"center", fontSize:12, color:MID, cursor:"pointer", marginBottom:8 }}>
                    <input type="checkbox" checked={rememberData} onChange={e => setRememberData(e.target.checked)} />
                    Guardar mis datos para la próxima compra
                  </label>
                </div>
                <div style={{ padding:24, borderTop:`2px solid ${DARK}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                    <span style={{ fontSize:12, fontWeight:900, letterSpacing:2, textTransform:"uppercase" }}>Total</span>
                    <span style={{ fontSize:22, fontWeight:900 }}>{fmt(orderTotal)}</span>
                  </div>
                  {checkoutError && <p style={{ fontSize:12, color:RED, marginBottom:10 }}>{checkoutError}</p>}
                  <button type="submit" disabled={checkoutStatus === "placing"}
                    style={{ width:"100%", background: checkoutStatus === "placing" ? MID : DARK, color:ACC, border:"none", padding:"18px", fontSize:11, fontWeight:900, letterSpacing:4, textTransform:"uppercase", cursor:"pointer" }}>
                    {checkoutStatus === "placing" ? "Procesando..." : "Crear Pedido →"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── LIGHTBOX ───────────────────────────────────────── */}
      {lightboxSrc && (
        <div style={{ position:"fixed", inset:0, zIndex:700, background:"rgba(0,0,0,0.97)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="" style={{ maxWidth:"100vw", maxHeight:"100vh", objectFit:"contain", touchAction:"pinch-zoom" }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxSrc(null)} style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", width:44, height:44, borderRadius:"50%", fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
      )}
    </div>
  );
}
