"use client";
import { useState, useEffect, useMemo, Fragment } from "react";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { usePushBell } from "@/contexts/PushBellContext";
import { useAuth } from "@/components/AuthProvider";
import StoreFollowButton from "@/components/store/StoreFollowButton";
import { EditableZone, EditableFixed, EditableImageButton, EditableSectionBg, BgDragHandle, getContrastColor, useEditContext } from "@/contexts/EditContext";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useCartLogic } from "@/hooks/useCartLogic";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import VerifiedIconButton from "@/components/store/VerifiedIconButton";
import { HandHeart } from "lucide-react";
import { PROVINCIAS_ARGENTINA } from "@/lib/provincias";

const SIZE_ATTRS = ["talle","size","talla","talles","sizes","tamaño","tamano","almacenamiento","ram","versión","version","formato","variante","material","sabor","peso/tamaño","peso"];


const announcementMessages_DEFAULT = [
  "🚚 Envío gratis en compras mayores a $30.000",
  "🔄 Cambios sin cargo hasta 30 días",
  "💳 6 cuotas sin interés",
];

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior:"smooth" });

/* ── Garantías ─────────────────────────────────────────── */
const FN_STRIP_ICONS: React.ReactNode[][] = [
  [
    <svg key="truck"  width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    <svg key="box"    width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    <svg key="zap"    width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    <svg key="gift"   width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
  ],
  [
    <svg key="refresh"    width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16"/><polyline points="21 3 21 8 16 8"/><polyline points="3 21 3 16 8 16"/></svg>,
    <svg key="undo"       width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>,
    <svg key="check-circ" width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    <svg key="arrows-lr"  width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  ],
  [
    <svg key="shield" width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
    <svg key="lock"   width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    <svg key="card"   width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    <svg key="award"  width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  ],
  [
    <svg key="chat"    width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    <svg key="phone"   width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    <svg key="headset" width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>,
    <svg key="mail"    width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  ],
];

const GARANTIAS = [
  {
    title:"Envío gratis", desc:"En compras mayores a $30.000",
    svg: <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  },
  {
    title:"Cambios sin cargo", desc:"Hasta 30 días después de la compra",
    svg: <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16"/><polyline points="21 3 21 8 16 8"/><polyline points="3 21 3 16 8 16"/></svg>,
  },
  {
    title:"Pago seguro", desc:"Todos los medios de pago protegidos",
    svg: <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
  },
  {
    title:"Atención personalizada", desc:"Respondemos en menos de 24 hs",
    svg: <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  },
];

/* ── Component ─────────────────────────────────────────── */
export default function FashionNoir() {
  const [scrolled,           setScrolled]           = useState(false);
  const [activeCategory,     setActiveCategory]     = useState("Todos");
  const [activeGender,       setActiveGender]       = useState<string | null>(null);
  const [hoveredNavCat,      setHoveredNavCat]      = useState<string | null>(null);
  const [visibleCount,       setVisibleCount]       = useState(8);
  const [isMobile,           setIsMobile]           = useState(false);
  const [reelIndex,          setReelIndex]          = useState(0);
  const [mobileMenuOpen,     setMobileMenuOpen]     = useState(false);
  const [mobileCatsOpen,     setMobileCatsOpen]     = useState(false);
  const [mobileOpenCat,      setMobileOpenCat]      = useState<string | null>(null);
  const [hoveredId,          setHoveredId]          = useState<string | null>(null);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [announcementIdx,    setAnnouncementIdx]    = useState(0);
  const [activeSubcategory,  setActiveSubcategory]  = useState<string | null>(null);
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
  const blockBuy    = isPreview || isOwner;
  const hasWA       = !storeConfig || storeConfig.whatsapp.enabled;
  const storefront  = useStorefront();
  const { products, loadingProducts, checkoutMode, isWholesale, ocultarPrecios, defaultCategories, featuredCategories } = storefront;
  const isInquiryMode = checkoutMode === "inquiry" || ocultarPrecios;

  const categoryList = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(c => c && c !== "general"))];
    const base = cats.length > 0 ? cats : defaultCategories.slice(0, 6);
    return featuredCategories.length > 0 ? base.filter(c => featuredCategories.includes(c)) : base;
  }, [products, defaultCategories, featuredCategories]);

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
  const { editMode, overrides: textOverrides, setOverride } = useEditContext();
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
    cartTotal, cartCount, envioPrice, envioCoordinar, envioOptions, couponDiscount, orderTotal,
    searchResults, favoriteProducts, wholesaleWarnings,
    fmt, fmtEnvioPrice, fmtLiveQuote, showToast, openModal, addToCart, removeFromCart, updateQty,
    openCheckout, handleApplyCoupon, handlePlaceOrder, handleContact, toggleFavorite,
    pagoOptions, acceptedTerms, setAcceptedTerms,
    donationEnabled, setDonationEnabled, donationAmount, setDonationAmount, canastaDisponible,
  } = useCartLogic(storefront);
  const imgSwipe = useTouchSwipe(
    () => { if (modalProduct) setModalImg(i => (i + 1) % modalProduct.images.length); },
    () => { if (modalProduct) setModalImg(i => (i - 1 + modalProduct.images.length) % modalProduct.images.length); }
  );

  function openInquiry(product: StorefrontProduct) {
    setModalProduct(null);
    setContactForm({ nombre: "", email: "", mensaje: `Hola, me interesa "${product.name}". ¿Me podés dar más información?` });
    setTimeout(() => scrollTo("contacto"), 100);
  }
  function shareProduct(product: StorefrontProduct) {
    const url = `${window.location.origin}${window.location.pathname}?p=${product.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    showToast("¡Link copiado al portapapeles!");
  }
  function whatsappShare(product: StorefrontProduct) {
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

  const ANNOUNCEMENT_BAR_H = 36;
  const promoBannerEnabled = storeConfig?.promoBanner?.enabled !== false;
  const announcementMessages = (storeConfig?.promoBanner?.messages?.filter(m => m.trim()) ?? []).length > 0
    ? storeConfig!.promoBanner!.messages!.filter(m => m.trim())
    : announcementMessages_DEFAULT;
  const showAnnouncement = promoBannerEnabled && announcementVisible;
  const announcementBarHeight = showAnnouncement ? ANNOUNCEMENT_BAR_H : 0;

  useScrollReveal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
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

  useEffect(() => {
    if (!showAnnouncement) return;
    const interval = setInterval(() => {
      setAnnouncementIdx(i => (i + 1) % announcementMessages.length);
    }, 3500);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAnnouncement]);

  // Al cambiar color: sync imagen + talle disponible
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
      const sizeKey = Object.keys(a).find((k: string) => SIZE_ATTRS.includes(k.toLowerCase()));
      if (sizeKey && a[sizeKey] && a[sizeKey] !== selectedSize) setSelectedSize(a[sizeKey]);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColor, modalProduct?.id]);

  // Al cambiar talle: sync color + imagen si el combo talle+color actual no existe
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
      const colorKey = Object.keys(a).find((k: string) => ["color","colour","colores","colors","tono"].includes(k.toLowerCase()));
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

  // Stock del variante seleccionado en el modal (D-06)
  const selectedVariantStock = useMemo(() => {
    if (!modalProduct?.variants.length) return null;
    const v = modalProduct.variants.find(v => {
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
    return v?.stock ?? null;
  }, [modalProduct, selectedSize, selectedColor]);

  const changeGender = (g: string | null) => {
    setActiveGender(g);
    setActiveCategory("Todos");
    setActiveSubcategory(null);
    setVisibleCount(8);
  };

  const allFiltered = products.filter(p => {
    if (activeGender && p.gender !== activeGender && p.gender !== "unisex") return false;
    if (activeCategory !== "Todos" && p.category !== activeCategory) return false;
    if (activeSubcategory && p.subcategory !== activeSubcategory) return false;
    return true;
  });
  const filtered    = allFiltered.slice(0, visibleCount);

  /* ─ Colores base ─ */
  const G  = storeConfig?.colors.accent ?? "#c9a84c";  // gold / accent
  const BG = "#0a0a0a";  // background
  const S  = "#111111";  // surface
  const T  = "#f0ebe3";  // text

  /* ─ Hero image con override dinámico ─ */
  const heroImageOv        = storeConfig?.imageOverrides?.["heroBackground"];
  const heroImageUrl       = heroImageOv?.url ?? "https://picsum.photos/seed/noir-hero/1920/1080";
  const heroOverlayType    = heroImageOv?.overlayType ?? "dark";
  const heroOverlayOpacity = heroImageOv?.overlayOpacity ?? 0.6;
  const heroPosX           = heroImageOv?.posX ?? 50;
  const heroPosY           = heroImageOv?.posY ?? 50;

  // Contraste inteligente: overlay claro → texto oscuro
  const heroTextColor = heroOverlayType === "light" ? "#0f0f0f" : T;
  const heroAccentColor = heroOverlayType === "light" ? "#333" : G;
  const heroGradient = heroOverlayType === "light"
    ? `linear-gradient(to right, rgba(255,255,255,${heroOverlayOpacity}) 45%, rgba(255,255,255,${heroOverlayOpacity * 0.3}))`
    : heroOverlayType === "none"
    ? "none"
    : `linear-gradient(to right, rgba(10,10,10,${heroOverlayOpacity}) 45%, rgba(10,10,10,${heroOverlayOpacity * 0.2}))`;

  const catMujerUrl      = storeConfig?.imageOverrides?.["catMujer"]?.url ?? "https://picsum.photos/seed/noir-cat1/800/1200";
  const catHombreUrl     = storeConfig?.imageOverrides?.["catHombre"]?.url ?? "https://picsum.photos/seed/noir-cat2/800/1200";
  const catAccesoriosUrl = storeConfig?.imageOverrides?.["catAccesorios"]?.url ?? "https://picsum.photos/seed/noir-cat3/800/1200";
  const nosotrosImageOv  = storeConfig?.imageOverrides?.["nosotrosImage"];
  const nosotrosImageUrl = nosotrosImageOv?.url ?? "https://picsum.photos/seed/noir-about/900/700";
  const nosotrosPosX     = nosotrosImageOv?.posX ?? 50;
  const nosotrosPosY     = nosotrosImageOv?.posY ?? 50;

  // Section background images (stored as "sectionbg_<field>" in imageOverrides)
  const statementBgImg = storeConfig?.imageOverrides?.["sectionbg_bgStatement"];
  const contactoBgImg  = storeConfig?.imageOverrides?.["sectionbg_bgContacto"];
  const footerBgImg    = storeConfig?.imageOverrides?.["sectionbg_bgFooter"];

  const scn = storeConfig?.sectionColors ?? {};
  const garantiasBg    = scn["bgGarantias"]   ?? BG;
  const garantiasText  = getContrastColor(garantiasBg)   === "light" ? T : "#0a0a0a";
  const statementBg    = scn["bgStatement"]   ?? BG;
  const statementText  = statementBgImg?.url
    ? (statementBgImg.overlayType === "light" ? "#0a0a0a" : T)
    : (getContrastColor(statementBg) === "light" ? T : "#0a0a0a");
  const nosotrosPanelBg= scn["bgNosotrosPanel"] ?? S;
  const nosotrosPanelText = getContrastColor(nosotrosPanelBg) === "light" ? T : "#0a0a0a";
  const footerBg       = scn["bgFooter"]      ?? BG;
  const footerText     = footerBgImg?.url
    ? (footerBgImg.overlayType === "light" ? "#0a0a0a" : T)
    : (getContrastColor(footerBg) === "light" ? T : "#0a0a0a");
  const footerSubtleBorder = footerText === T ? "rgba(240,235,227,0.15)" : "rgba(0,0,0,0.15)";
  const footerInputBg  = footerText === T ? S : "rgba(0,0,0,0.06)";
  const categoriasBg   = scn["bgCategorias"]  ?? BG;
  const productosBg    = scn["bgProductos"]   ?? BG;
  const productosText  = getContrastColor(productosBg)  === "light" ? T : "#0a0a0a";
  const productosMid   = getContrastColor(productosBg)  === "light" ? "#888" : "#555";
  const contactoBg     = scn["bgContacto"]    ?? BG;
  const contactoText   = contactoBgImg?.url
    ? (contactoBgImg.overlayType === "light" ? "#0a0a0a" : T)
    : (getContrastColor(contactoBg) === "light" ? T : "#0a0a0a");
  const contactoInputBg     = contactoText === T ? S : "rgba(0,0,0,0.06)";
  const contactoInputBorder = contactoText === T ? "rgba(201,168,76,0.2)" : "rgba(0,0,0,0.12)";

  return (
    <div style={{ fontFamily:"'Helvetica Neue', Arial, sans-serif", background:BG, color:T, minHeight:"100vh" }}>

      {/* ── ANNOUNCEMENT BAR ───────────────────────────────── */}
      {showAnnouncement && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top:0, left: isPreview ? undefined : 0, right: isPreview ? undefined : 0, zIndex: isPreview ? 10001 : 110, height:ANNOUNCEMENT_BAR_H, background:G, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:12, fontWeight:600, color:BG, letterSpacing:1 }}>
            <EditableZone field="announcementText" label="Barra de anuncios" noBadge>{announcementMessages[announcementIdx]}</EditableZone>
          </span>
          {/* Dots */}
          <div style={{ position:"absolute", bottom:5, left:"50%", transform:"translateX(-50%)", display:"flex", gap:5 }}>
            {announcementMessages.map((_, i) => (
              <button key={i} onClick={() => setAnnouncementIdx(i)}
                style={{ width: i === announcementIdx ? 16 : 6, height:4, border:"none", borderRadius:2, background: i === announcementIdx ? BG : "rgba(10,10,10,0.35)", cursor:"pointer", padding:0, transition:"all 0.3s" }}/>
            ))}
          </div>
          {/* Close */}
          <button onClick={() => setAnnouncementVisible(false)}
            style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:BG, cursor:"pointer", fontSize:16, lineHeight:1, opacity:0.7 }}>×</button>
        </div>
      )}

      {/* ── TOAST ──────────────────────────────────────────── */}
      {toastMsg && (
        <div style={{ position:"fixed", bottom:32, left:"50%", transform:"translateX(-50%)", background:G, color:BG, padding:"12px 28px", fontSize:13, fontWeight:700, zIndex:999, whiteSpace:"nowrap", boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
          ✓ {toastMsg}
        </div>
      )}

      {/* ── SEARCH OVERLAY ─────────────────────────────────── */}
      {searchOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(10,10,10,0.92)", backdropFilter:"blur(8px)", display:"flex", flexDirection:"column", alignItems:"center", paddingTop:120 }}>
          <button onClick={() => setSearchOpen(false)}
            style={{ position:"absolute", top:24, right:32, background:"none", border:"none", color:T, fontSize:28, cursor:"pointer", lineHeight:1 }}>×</button>
          <div style={{ width:"100%", maxWidth:640, padding:"0 24px" }}>
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={"Buscar productos..."}
              style={{ width:"100%", background:"transparent", border:"none", borderBottom:`2px solid ${G}`, color:T, fontSize:24, padding:"12px 0", outline:"none", fontFamily:"'Helvetica Neue', Arial, sans-serif", boxSizing:"border-box" }}
            />
          </div>
          {searchResults.length > 0 && (
            <div style={{ width:"100%", maxWidth:640, padding:"24px 24px 0", overflowY:"auto", maxHeight:"calc(100vh - 260px)" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
                {searchResults.map(p => (
                  <button key={p.id} onClick={() => openModal(p)}
                    style={{ background:"none", border:`1px solid rgba(201,168,76,0.2)`, cursor:"pointer", textAlign:"left", padding:0, color:T }}>
                    <img src={p.images[0]} alt={p.name} style={{ width:"100%", aspectRatio:"3/4", objectFit:"cover", display:"block" }}/>
                    <div style={{ padding:"10px 12px" }}>
                      <p style={{ fontSize:12, margin:"0 0 4px", fontWeight:500 }}>{p.name}</p>
                      <p style={{ fontSize:13, color:G, fontWeight:700, margin:0 }}>{ocultarPrecios ? "Consultá precio" : fmt(p.price)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {searchQuery.trim().length > 0 && searchResults.length === 0 && (
            <p style={{ color:"rgba(240,235,227,0.4)", marginTop:32, fontSize:14 }}>Sin resultados para &quot;{searchQuery}&quot;</p>
          )}
        </div>
      )}

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <nav style={{ position: isPreview ? "sticky" : "fixed", top:announcementBarHeight, left: isPreview ? undefined : 0, right: isPreview ? undefined : 0, zIndex: isPreview ? 10000 : 100, transition:"background 0.4s, top 0.3s", background: (isPreview || scrolled) ? "rgba(10,10,10,0.97)" : "transparent", backdropFilter: (isPreview || scrolled) ? "blur(12px)" : "none", borderBottom: (isPreview || scrolled) ? `1px solid rgba(201,168,76,0.15)` : "none" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 32px", height:72, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <button onClick={() => scrollTo("hero")} style={{ background:"none", border:"none", cursor:"pointer", fontFamily:"Georgia, serif", fontSize:26, fontWeight:700, letterSpacing:6, color:G, maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              <EditableZone field="storeName" label="Nombre de la tienda">{storeConfig?.storeName ?? "NOIR"}</EditableZone>
            </button>
            <VerifiedIconButton isVerified={storeConfig?.isVerified} info={storeConfig?.verifiedInfo} />
          </div>
          {!isMobile && <div style={{ display:"flex", gap:28, alignItems:"center" }}>
            {/* CATEGORÍAS dropdown */}
            <div style={{ position:"relative" }}
              onMouseEnter={() => setHoveredNavCat("__open__")}
              onMouseLeave={() => setHoveredNavCat(null)}>
              <button style={{ background:"none", border:"none", color:T, fontSize:11, letterSpacing:3, cursor:"pointer", fontWeight:500, textTransform:"uppercase", opacity:0.8, display:"flex", alignItems:"center", gap:5 }}
                onMouseEnter={e => { e.currentTarget.style.opacity="1"; e.currentTarget.style.color=G; }}
                onMouseLeave={e => { e.currentTarget.style.opacity="0.8"; e.currentTarget.style.color=T; }}>
                Categorías <span style={{ fontSize:9, opacity:0.7 }}>▾</span>
              </button>
              {hoveredNavCat && (
                <div style={{ position:"absolute", top:"100%", left:0, background:"#111", border:`1px solid rgba(201,168,76,0.15)`, minWidth:180, zIndex:500, padding:"6px 0", boxShadow:"0 12px 40px rgba(0,0,0,0.6)" }}>
                  {categoryList.map(cat => {
                    const subs = subcategoriesFor[cat] || [];
                    return (
                      <div key={cat} style={{ position:"relative" }}
                        onMouseEnter={() => setHoveredNavCat(cat)}
                        onMouseLeave={() => setHoveredNavCat("__open__")}>
                        <button onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=fashion-noir${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat)}`; setHoveredNavCat(null); }}
                          style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", background: hoveredNavCat===cat ? "rgba(201,168,76,0.08)" : "none", border:"none", color:T, padding:"9px 16px", fontSize:11, textAlign:"left", cursor:"pointer", letterSpacing:2, textTransform:"uppercase", transition:"background 0.15s" }}>
                          {cat}
                          {subs.length > 0 && <span style={{ opacity:0.5, fontSize:10 }}>›</span>}
                        </button>
                        {subs.length > 0 && hoveredNavCat === cat && (
                          <div style={{ position:"absolute", top:0, left:"100%", background:"#1a1a1a", border:`1px solid rgba(201,168,76,0.15)`, minWidth:160, padding:"6px 0", boxShadow:"8px 8px 32px rgba(0,0,0,0.5)", zIndex:501 }}>
                            {subs.map(sub => (
                              <button key={sub} onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=fashion-noir${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat)}&subcategoria=${encodeURIComponent(sub)}`; setHoveredNavCat(null); }}
                                style={{ display:"block", width:"100%", background:"none", border:"none", color:T, padding:"8px 16px", fontSize:11, textAlign:"left", cursor:"pointer", letterSpacing:1, textTransform:"uppercase", transition:"background 0.15s" }}
                                onMouseEnter={e => (e.currentTarget.style.background="rgba(201,168,76,0.08)")}
                                onMouseLeave={e => (e.currentTarget.style.background="none")}>
                                {sub}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* MUJER */}
            <button onClick={() => { changeGender(activeGender === "mujer" ? null : "mujer"); scrollTo("productos"); }}
              style={{ background:"none", border:"none", fontSize:11, letterSpacing:3, cursor:"pointer", fontWeight:500, textTransform:"uppercase", transition:"opacity 0.2s, color 0.2s", color: activeGender==="mujer" ? G : T, opacity: activeGender==="mujer" ? 1 : 0.8 }}
              onMouseEnter={e => { e.currentTarget.style.opacity="1"; if(activeGender!=="mujer") e.currentTarget.style.color=G; }}
              onMouseLeave={e => { e.currentTarget.style.opacity=activeGender==="mujer"?"1":"0.8"; if(activeGender!=="mujer") e.currentTarget.style.color=T; }}>
              Mujer
            </button>
            {/* HOMBRE */}
            <button onClick={() => { changeGender(activeGender === "hombre" ? null : "hombre"); scrollTo("productos"); }}
              style={{ background:"none", border:"none", fontSize:11, letterSpacing:3, cursor:"pointer", fontWeight:500, textTransform:"uppercase", transition:"opacity 0.2s, color 0.2s", color: activeGender==="hombre" ? G : T, opacity: activeGender==="hombre" ? 1 : 0.8 }}
              onMouseEnter={e => { e.currentTarget.style.opacity="1"; if(activeGender!=="hombre") e.currentTarget.style.color=G; }}
              onMouseLeave={e => { e.currentTarget.style.opacity=activeGender==="hombre"?"1":"0.8"; if(activeGender!=="hombre") e.currentTarget.style.color=T; }}>
              Hombre
            </button>
            {/* NOSOTROS / CONTACTO */}
            {[["Nosotros","nosotros"],["Contacto","contacto"]].map(([label, target]) => (
              <button key={label} onClick={() => scrollTo(target)}
                style={{ background:"none", border:"none", color:T, fontSize:11, letterSpacing:3, cursor:"pointer", fontWeight:500, textTransform:"uppercase", opacity:0.8, transition:"opacity 0.2s, color 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.opacity="1"; e.currentTarget.style.color=G; }}
                onMouseLeave={e => { e.currentTarget.style.opacity="0.8"; e.currentTarget.style.color=T; }}>
                {label}
              </button>
            ))}
          </div>}
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {/* Search icon */}
            <button onClick={() => setSearchOpen(true)} style={{ background:"none", border:"none", color:T, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            {/* Follow button */}
            {pushBell && storeConfig?.showPushBell && !isPreview && (
              <StoreFollowButton storeSlug={storeConfig?.slug ?? ""} color={T} size={20} />
            )}
            {/* Bell de novedades */}
            {pushBell && storeConfig?.showPushBell && !isPreview && (
              <button onClick={pushBell.openDrawer} style={{ position:"relative", background:"none", border:"none", color:T, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill={pushBell.followState === "following" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {pushBell.hasNew && <span style={{ position:"absolute", top:2, right:2, width:10, height:10, background:"#ef4444", borderRadius:"50%", border:"2px solid #0a0a0a" }} />}
              </button>
            )}
            {isPreview && (
              <>
                {storeConfig?.showPushBell ? (
                  <button title="Los clientes pueden seguir tu tienda desde acá" style={{ position:"relative", padding:4, display:"flex", alignItems:"center", opacity:0.85, background:"none", border:"none", color:T, cursor:"default" }}>
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                  </button>
                ) : (
                  <button onClick={storeConfig?.onPreviewBellClick} title="🔒 Solo Plan Plus — tocá para activar" style={{ position:"relative", padding:4, display:"flex", alignItems:"center", opacity:0.38, background:"none", border:"none", color:T, cursor:"pointer" }}>
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                    <span style={{ position:"absolute", top:0, right:0, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
                  </button>
                )}
                {storeConfig?.showPushBell ? (
                  <button onClick={storeConfig.onPreviewBellClick} title="Campanita de novedades — clic para configurar" style={{ position:"relative", padding:4, display:"flex", alignItems:"center", opacity:0.85, background:"none", border:"none", color:T, cursor:"pointer" }}>
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  </button>
                ) : (
                  <button onClick={storeConfig?.onPreviewBellClick} title="🔒 Solo Plan Plus — tocá para activar" style={{ position:"relative", padding:4, display:"flex", alignItems:"center", opacity:0.38, background:"none", border:"none", color:T, cursor:"pointer" }}>
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    <span style={{ position:"absolute", top:0, right:0, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
                  </button>
                )}
              </>
            )}
            {/* Favorites icon */}
            {!isMobile && <button onClick={() => { setFavoritesOpen(true); setUserDropdownOpen(false); setCartOpen(false); }} style={{ background:"none", border:"none", color:T, cursor:"pointer", position:"relative", padding:4, display:"flex", alignItems:"center" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill={favorites.length > 0 ? G : "none"} stroke={favorites.length > 0 ? G : "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {favorites.length > 0 && <span style={{ position:"absolute", top:-6, right:-6, background:G, color:BG, borderRadius:"50%", width:18, height:18, fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{favorites.length}</span>}
            </button>}
            {/* User icon */}
            <div ref={userDropdownRef} style={{ position:"relative" }}>
              <button onClick={() => { setUserDropdownOpen(o => !o); setFavoritesOpen(false); }} style={{ background:"none", border:"none", color:T, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </button>
              {userDropdownOpen && (
                <div style={{ position:"absolute", top:"calc(100% + 10px)", right:0, background:"#1a1a1a", border:`1px solid rgba(201,168,76,0.2)`, minWidth:190, zIndex:200, boxShadow:"0 8px 32px rgba(0,0,0,0.5)" }}>
                  {user ? (
                    <>
                      <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:"rgba(201,168,76,0.6)", padding:"10px 16px 4px", margin:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {user.name || user.email.split("@")[0]}
                      </p>
                      <a href={panelHref} onClick={() => setUserDropdownOpen(false)}
                        style={{ display:"block", color:T, padding:"10px 16px", fontSize:13, textDecoration:"none", transition:"background 0.2s" }}
                        onMouseEnter={e => (e.currentTarget.style.background="rgba(201,168,76,0.08)")}
                        onMouseLeave={e => (e.currentTarget.style.background="none")}>{panelLabel}</a>
                      <div style={{ borderTop:`1px solid rgba(201,168,76,0.12)`, margin:"4px 0" }}/>
                      <button onClick={() => { if (isPreview) return; setUserDropdownOpen(false); signOut("/"); }}
                        style={{ display:"block", width:"100%", background:"none", border:"none", color:"#f87171", padding:"10px 16px", fontSize:13, textAlign:"left", cursor: isPreview ? "default" : "pointer", opacity: isPreview ? 0.45 : 1, transition:"background 0.2s" }}
                        onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background="rgba(248,113,113,0.08)"; }}
                        onMouseLeave={e => (e.currentTarget.style.background="none")}>Cerrar sesión</button>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:"rgba(201,168,76,0.6)", padding:"10px 16px 4px", margin:0 }}>Mi cuenta</p>
                      <a href={isPreview ? undefined : `/login?redirect=/tienda/${storeConfig?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)}
                        style={{ display:"block", color:T, padding:"10px 16px", fontSize:13, textDecoration:"none", cursor: isPreview ? "default" : "pointer", transition:"background 0.2s" }}
                        onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background="rgba(201,168,76,0.08)"; }}
                        onMouseLeave={e => (e.currentTarget.style.background="none")}>Iniciar sesión</a>
                      <a href={isPreview ? undefined : `/registro?plan=buyer&redirect=/tienda/${storeConfig?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)}
                        style={{ display:"block", color:T, padding:"10px 16px", fontSize:13, textDecoration:"none", cursor: isPreview ? "default" : "pointer", transition:"background 0.2s" }}
                        onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background="rgba(201,168,76,0.08)"; }}
                        onMouseLeave={e => (e.currentTarget.style.background="none")}>Registrarse</a>
                    </>
                  )}
                </div>
              )}
            </div>
            {isMobile && (
              <button onClick={() => { setMobileMenuOpen(o => !o); setMobileCatsOpen(false); setMobileOpenCat(null); }} style={{ background:"none", border:"none", color:T, cursor:"pointer", padding:4, display:"flex", flexDirection:"column", gap:4, alignItems:"center" }}>
                <span style={{ display:"block", width:20, height:2, background:T, transition:"all 0.3s", transform: mobileMenuOpen ? "rotate(45deg) translate(3px,3px)" : "none" }}/>
                <span style={{ display:"block", width:20, height:2, background:T, transition:"all 0.3s", opacity: mobileMenuOpen ? 0 : 1 }}/>
                <span style={{ display:"block", width:20, height:2, background:T, transition:"all 0.3s", transform: mobileMenuOpen ? "rotate(-45deg) translate(3px,-3px)" : "none" }}/>
              </button>
            )}
          </div>
        </div>
      </nav>
      {isMobile && mobileMenuOpen && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top: isPreview ? 0 : 72 + announcementBarHeight, left:0, right:0, bottom:0, background:BG, zIndex:99, overflowY:"auto", overscrollBehavior:"contain" }}>
          {/* Categorías — acordeón */}
          {categoryList.length > 0 && (
            <>
              <button onClick={() => setMobileCatsOpen(o => !o)}
                style={{ display:"flex", width:"100%", background:"none", border:"none", borderBottom:`1px solid rgba(201,168,76,0.1)`, color:T, padding:"16px 24px", fontSize:12, textAlign:"left", cursor:"pointer", letterSpacing:3, textTransform:"uppercase", alignItems:"center", justifyContent:"space-between" }}>
                Categorías
                <span style={{ fontSize:10, opacity:0.55, transition:"transform 0.2s", transform: mobileCatsOpen ? "rotate(180deg)" : "none", display:"inline-block" }}>▾</span>
              </button>
              {mobileCatsOpen && categoryList.map(cat => {
                const subs = subcategoriesFor[cat] || [];
                return (
                  <Fragment key={cat}>
                    <button onClick={() => {
                      if (subs.length > 0) {
                        setMobileOpenCat(prev => prev === cat ? null : cat);
                      } else {
                        window.location.href = `/tienda/${storeConfig?.slug}/productos?t=fashion-noir${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat)}`;
                        setMobileMenuOpen(false); setMobileCatsOpen(false);
                      }
                    }} style={{ display:"flex", width:"100%", background:"rgba(201,168,76,0.03)", border:"none", borderBottom:`1px solid rgba(201,168,76,0.07)`, color: activeCategory===cat ? G : T, padding:"13px 24px 13px 40px", fontSize:11, textAlign:"left", cursor:"pointer", letterSpacing:3, textTransform:"uppercase", alignItems:"center", justifyContent:"space-between" }}>
                      {cat}
                      {subs.length > 0 && <span style={{ fontSize:12, opacity:0.5, transition:"transform 0.2s", transform: mobileOpenCat===cat ? "rotate(90deg)" : "none", display:"inline-block" }}>›</span>}
                    </button>
                    {subs.length > 0 && mobileOpenCat === cat && subs.map(sub => (
                      <button key={sub} onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=fashion-noir${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat)}&subcategoria=${encodeURIComponent(sub)}`; setMobileMenuOpen(false); setMobileCatsOpen(false); setMobileOpenCat(null); }}
                        style={{ display:"block", width:"100%", background:"rgba(201,168,76,0.05)", border:"none", borderBottom:`1px solid rgba(201,168,76,0.05)`, color: activeSubcategory===sub ? G : "rgba(240,235,227,0.7)", padding:"11px 24px 11px 60px", fontSize:11, textAlign:"left", cursor:"pointer", letterSpacing:2, textTransform:"uppercase" }}>
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
              style={{ display:"block", width:"100%", background:"none", border:"none", borderBottom:`1px solid rgba(201,168,76,0.1)`, color: activeGender===g ? G : T, padding:"16px 24px", fontSize:12, textAlign:"left", cursor:"pointer", letterSpacing:3, textTransform:"uppercase" }}>
              {label}
            </button>
          ))}
          {[["Nosotros","nosotros"],["Contacto","contacto"]].map(([label, target]) => (
            <button key={target} onClick={() => { scrollTo(target); setMobileMenuOpen(false); }}
              style={{ display:"block", width:"100%", background:"none", border:"none", borderBottom:`1px solid rgba(201,168,76,0.1)`, color:"rgba(240,235,227,0.6)", padding:"16px 24px", fontSize:12, textAlign:"left", cursor:"pointer", letterSpacing:3, textTransform:"uppercase" }}>
              {label}
            </button>
          ))}
          <button onClick={() => { setFavoritesOpen(true); setMobileMenuOpen(false); setUserDropdownOpen(false); setCartOpen(false); }}
            style={{ display:"block", width:"100%", background:"none", border:"none", color:"rgba(240,235,227,0.6)", padding:"16px 24px", fontSize:12, textAlign:"left", cursor:"pointer", letterSpacing:3, textTransform:"uppercase" }}>
            Favoritos {favorites.length > 0 && `(${favorites.length})`}
          </button>
        </div>
      )}

      {/* ── HERO ───────────────────────────────────────────── */}
      <section id="hero" style={{ position:"relative", height:"100vh", minHeight:600, overflow:"hidden" }}>
        <img src={heroImageUrl} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:`${heroPosX}% ${heroPosY}%` }}/>
        {heroOverlayType !== "none" && (
          <div style={{ position:"absolute", inset:0, background:heroGradient }}/>
        )}
        <BgDragHandle imgKey="heroBackground" />
        <EditableImageButton field="heroBackground" label="Cambiar imagen" />
        <div style={{ position:"relative", height:"100%", display:"flex", alignItems:"center", padding: isMobile ? "0 20px" : "0 80px", maxWidth:1280, margin:"0 auto" }}>
          <div style={{ maxWidth:520 }}>
            <p style={{ fontSize:11, letterSpacing:5, color:heroAccentColor, marginBottom:20, textTransform:"uppercase" }}>
              <EditableZone field="storeTagline" label="Tagline">{storeConfig?.storeTagline ?? "Nueva Temporada · Otoño 2025"}</EditableZone>
            </p>
            <h1 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(42px,6vw,80px)", fontWeight:700, lineHeight:1.05, margin:"0 0 20px", color:heroTextColor }}>
              <EditableZone field="heroHeading" label="Título principal">Vestí tu esencia.</EditableZone>
            </h1>
            <p style={{ fontSize:16, opacity:0.75, lineHeight:1.7, marginBottom:40, maxWidth:380, color:heroTextColor }}>
              <EditableZone field="heroSubtext" label="Subtítulo hero">Piezas diseñadas para quienes eligen calidad sobre cantidad. Colecciones cápsula para cada estilo de vida.</EditableZone>
            </p>
            <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
              {(editMode || !storeConfig?.textOverrides?.["heroCta"]?.hidden) && (
                <button onClick={() => scrollTo("productos")} style={{ background:G, color:BG, border:"none", padding:"14px 36px", fontSize:12, letterSpacing:3, fontWeight:700, textTransform:"uppercase", cursor:"pointer" }}>
                  <EditableZone field="heroCta" label="Botón principal">Ver Colección</EditableZone>
                </button>
              )}
              {(editMode || !storeConfig?.textOverrides?.["heroCtaSecondary"]?.hidden) && (
                <button onClick={() => scrollTo("nosotros")} style={{ background:"transparent", color:heroTextColor, border:`1px solid rgba(240,235,227,0.4)`, padding:"14px 36px", fontSize:12, letterSpacing:3, fontWeight:500, textTransform:"uppercase", cursor:"pointer" }}>
                  <EditableZone field="heroCtaSecondary" label="Botón secundario">Nuestra Historia</EditableZone>
                </button>
              )}
            </div>
          </div>
        </div>
        <div style={{ position:"absolute", bottom:32, left:"50%", transform:"translateX(-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:8, opacity:0.45 }}>
          <span style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:heroTextColor }}>Scroll</span>
          <div style={{ width:1, height:40, background:heroTextColor }}/>
        </div>
      </section>

      {/* ── GARANTÍAS ──────────────────────────────────────── */}
      <section data-reveal style={{ borderTop:`1px solid rgba(201,168,76,0.12)`, borderBottom:`1px solid rgba(201,168,76,0.12)`, background:garantiasBg, position:"relative" }}>
        <EditableSectionBg field="bgGarantias" label="Fondo garantías" />
        <div style={{ maxWidth:1280, margin:"0 auto", display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)" }}>
          {GARANTIAS.map((g, i) => {
            const iconIdx = (Math.abs(parseInt(textOverrides[`garantia${i+1}Icon`]?.text ?? "0") || 0)) % FN_STRIP_ICONS[i].length;
            const nextIdx = (iconIdx + 1) % FN_STRIP_ICONS[i].length;
            return (
              <div key={i} style={{ padding: isMobile ? "16px 14px" : "28px 32px", display:"flex", alignItems:"center", gap:16, borderRight: i < 3 ? `1px solid rgba(201,168,76,0.1)` : "none" }}>
                <span style={{ color:G, flexShrink:0, position:"relative" }}>
                  {FN_STRIP_ICONS[i][iconIdx]}
                  {editMode && (
                    <button onClick={() => setOverride(`garantia${i+1}Icon`, { text: String(nextIdx) })} title="Cambiar ícono"
                      style={{ position:"absolute", inset:0, background:"rgba(99,102,241,0.9)", border:"none", borderRadius:4, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11, opacity:0, transition:"opacity 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.opacity="1")} onMouseLeave={e => (e.currentTarget.style.opacity="0")}>↻</button>
                  )}
                </span>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:garantiasText, margin:"0 0 4px" }}><EditableZone field={`garantia${i+1}Title`} label={`Título garantía ${i+1}`}>{g.title}</EditableZone></p>
                  <p style={{ fontSize:11, opacity:0.45, margin:0, lineHeight:1.5, color:garantiasText }}><EditableZone field={`garantia${i+1}Desc`} label={`Descripción garantía ${i+1}`}>{g.desc}</EditableZone></p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── MAYORISTA — banner "Solicitá tu lista de precios" ── */}
      {isWholesale && (
        <section data-reveal style={{ background:S, borderTop:`1px solid rgba(201,168,76,0.2)`, borderBottom:`1px solid rgba(201,168,76,0.2)` }}>
          <div style={{ maxWidth:1280, margin:"0 auto", padding:"60px 32px", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", gap:24 }}>
            <span style={{ fontSize:10, letterSpacing:5, color:G, textTransform:"uppercase", fontWeight:700, border:`1px solid ${G}`, padding:"4px 12px", borderRadius:2 }}>Tienda mayorista</span>
            <h2 style={{ fontSize:"clamp(28px,4vw,48px)", fontWeight:300, color:T, margin:0, letterSpacing:"-0.5px", fontFamily:"Georgia, 'Times New Roman', serif", lineHeight:1.2 }}>
              Solicitá tu lista<br/><em style={{ color:G }}>de precios</em>
            </h2>
            <p style={{ fontSize:14, color:"rgba(240,235,227,0.55)", maxWidth:480, margin:0, lineHeight:1.7 }}>
              Precios exclusivos para revendedores y distribuidores. Completá el formulario de contacto y te respondemos con tu lista personalizada en menos de 24 hs.
            </p>
            <button onClick={() => scrollTo("contacto")}
              style={{ background:G, color:BG, border:"none", padding:"14px 40px", fontSize:11, fontWeight:700, letterSpacing:4, textTransform:"uppercase", cursor:"pointer", borderRadius:2, marginTop:4 }}>
              Consultar ahora →
            </button>
          </div>
        </section>
      )}

      {/* ── CATEGORÍAS ─────────────────────────────────────── */}
      <section id="categorias" data-reveal style={{ background:categoriasBg, position:"relative" }}>
        <EditableSectionBg field="bgCategorias" label="Fondo categorías" />
        <div style={{ padding: isMobile ? "48px 16px" : "80px 32px", maxWidth:1280, margin:"0 auto" }}>
          <p style={{ fontSize:11, letterSpacing:5, color:G, textAlign:"center", marginBottom:48, textTransform:"uppercase" }}>
            <EditableZone field="categoriesHeading" label="Título sección categorías">Colecciones</EditableZone>
          </p>
          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap:16 }}>
            {[
              { label:"Mujer",      img: catMujerUrl,      field:"catMujer" },
              { label:"Hombre",     img: catHombreUrl,     field:"catHombre" },
              { label:"Accesorios", img: catAccesoriosUrl, field:"catAccesorios" },
            ].map(cat => (
              <button key={cat.label} onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=fashion-noir${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat.label)}`; }}
                style={{ position:"relative", aspectRatio:"2/3", overflow:"hidden", background:S, cursor:"pointer", border:"none", display:"block" }}>
                <img src={cat.img} alt={cat.label} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform 0.6s ease" }}
                  onMouseEnter={e => (e.currentTarget.style.transform="scale(1.06)")}
                  onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}/>
                <EditableImageButton field={cat.field} label={`Imagen ${cat.label}`} />
                {(() => { const ov = storeConfig?.imageOverrides?.[cat.field]; if (!ov?.overlayType || ov.overlayType === "none") return null; return <div style={{ position:"absolute", inset:0, pointerEvents:"none", background: ov.overlayType === "light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.45})` }} />; })()}
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(10,10,10,0.75) 30%, transparent)" }}/>
                <div style={{ position:"absolute", bottom:32, left:0, right:0, textAlign:"center" }}>
                  <p style={{ fontFamily:"Georgia, serif", fontSize:24, color:T, margin:0, fontWeight:700 }}>{cat.label}</p>
                  <p style={{ fontSize:10, letterSpacing:4, color:G, marginTop:8, textTransform:"uppercase" }}>{"Ver más"} →</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATEMENT ──────────────────────────────────────── */}
      <section data-reveal style={{ borderTop:`1px solid rgba(201,168,76,0.1)`, borderBottom:`1px solid rgba(201,168,76,0.1)`, textAlign:"center", position:"relative", ...(statementBgImg?.url ? { backgroundImage:`url(${statementBgImg.url})`, backgroundSize:"cover", backgroundPosition:`${statementBgImg.posX ?? 50}% ${statementBgImg.posY ?? 50}%` } : { background:statementBg }) }}>
        <BgDragHandle imgKey="sectionbg_bgStatement" />
        <EditableSectionBg field="bgStatement" label="Fondo frase" />
        {statementBgImg?.url && statementBgImg.overlayType !== "none" && (
          <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none", background: statementBgImg.overlayType === "light" ? `rgba(255,255,255,${statementBgImg.overlayOpacity ?? 0.5})` : `rgba(0,0,0,${statementBgImg.overlayOpacity ?? 0.45})` }} />
        )}
        <div style={{ position:"relative", zIndex:1, padding:"72px 32px" }}>
          <p style={{ fontFamily:"Georgia, serif", fontSize:"clamp(20px,3.5vw,40px)", color:statementText, opacity:0.88, maxWidth:760, margin:"0 auto", lineHeight:1.5, fontStyle:"italic" }}>
            <EditableZone field="quoteText" label="Frase destacada">&quot;No compramos ropa. Compramos la versión de nosotros mismos que queremos ser.&quot;</EditableZone>
          </p>
          <div style={{ width:56, height:1, background:G, margin:"28px auto 0" }}/>
        </div>
      </section>

      {/* ── PRODUCTOS ──────────────────────────────────────── */}
      <section id="productos" data-reveal style={{ background:productosBg, position:"relative" }}>
        <EditableSectionBg field="bgProductos" label="Fondo productos" />
        <div style={{ padding: isMobile ? "48px 16px" : "80px 32px", maxWidth:1280, margin:"0 auto" }}>
        <div style={{ marginBottom:40 }}>
          <p style={{ fontFamily:"Georgia, serif", fontSize:28, color:productosText, margin:0 }}>
            {activeGender === "mujer" ? "Mujer" : activeGender === "hombre" ? "Hombre" : activeCategory === "Todos" ? "Toda la Colección" : activeCategory}
            {activeSubcategory && <span style={{ fontFamily:"Georgia, serif", fontStyle:"italic", opacity:0.6 }}> › {activeSubcategory}</span>}
            <span style={{ fontSize:14, color:productosMid, fontFamily:"sans-serif", fontWeight:400, marginLeft:12 }}>({allFiltered.length} piezas)</span>
          </p>
        </div>

        {loadingProducts && (
          <div style={{ textAlign:"center", padding:"60px 0", color:productosText, opacity:0.4 }}>
            <p style={{ fontSize:15 }}>Cargando productos...</p>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(auto-fill,minmax(260px,1fr))", gap: isMobile ? 12 : 24, marginBottom:48 }}>
          {!loadingProducts && filtered.map(product => (
            <div key={product.id} onClick={() => openModal(product)} onMouseEnter={() => setHoveredId(product.id)} onMouseLeave={() => setHoveredId(null)}
              style={{ cursor:"pointer" }}>
              <div style={{ position:"relative", aspectRatio:"3/4", overflow:"hidden", background:S, marginBottom:16 }}>
                <img src={product.images[0] || ""} alt={product.name} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform 0.5s ease", transform: hoveredId===product.id ? "scale(1.05)" : "scale(1)" }} onError={e => { e.currentTarget.style.opacity="0"; }}/>
                <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"flex-end", justifyContent:"center", padding:16, opacity: hoveredId===product.id ? 1 : 0, transition:"opacity 0.3s", background:"linear-gradient(to top, rgba(10,10,10,0.65) 30%, transparent)", pointerEvents:"none" }}>
                  <span style={{ color:T, fontSize:11, letterSpacing:3, textTransform:"uppercase", borderBottom:`1px solid ${G}`, paddingBottom:3 }}>Ver detalle</span>
                </div>
                {product.comparePrice && <div style={{ position:"absolute", top:12, left:12, background:G, color:BG, fontSize:9, fontWeight:800, letterSpacing:2, padding:"4px 10px", textTransform:"uppercase" }}>Oferta</div>}
                <div style={{ position:"absolute", top:12, right:12, background:"rgba(10,10,10,0.7)", color:T, fontSize:9, letterSpacing:2, padding:"4px 10px", textTransform:"uppercase" }}>{product.category}</div>
                {/* Favorite button */}
                <button
                  onClick={e => { e.stopPropagation(); toggleFavorite(product.id); }}
                  style={{ position:"absolute", bottom:12, right:12, background:"rgba(10,10,10,0.65)", border:"none", borderRadius:"50%", width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"transform 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.transform="scale(1.1)")}
                  onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill={favorites.includes(product.id) ? G : "none"} stroke={favorites.includes(product.id) ? G : T} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </button>
              </div>
              <p style={{ fontSize:11, color:productosMid, letterSpacing:2, textTransform:"uppercase", margin:"0 0 6px" }}>{product.category}</p>
              <p style={{ fontSize:16, color:productosText, margin:"0 0 8px", fontWeight:500 }}>{product.name}</p>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <span style={{ fontSize:17, fontWeight:700, color:G }}>{ocultarPrecios ? "Consultá precio" : fmt(product.price)}</span>
                {!ocultarPrecios && product.comparePrice && <span style={{ fontSize:13, color:productosMid, textDecoration:"line-through" }}>{fmt(product.comparePrice)}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Ver más / Ver toda la colección */}
        <div style={{ textAlign:"center" }}>
          <p style={{ fontSize:11, opacity:0.35, letterSpacing:2, marginBottom:24 }}>
            Mostrando {Math.min(visibleCount, allFiltered.length)} de {allFiltered.length} piezas
          </p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <a href={`/tienda/${storeConfig?.slug ?? ""}/productos?t=fashion-noir${isPreview ? "&from=editor" : ""}`}
              style={{ background:G, color:BG, border:`1px solid ${productosText}`, padding:"14px 36px", fontSize:11, letterSpacing:3, textTransform:"uppercase", fontWeight:700, cursor:"pointer", textDecoration:"none", display:"inline-block", transition:"opacity 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity="0.85"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity="1"; }}>
              Ver toda la colección →
            </a>
          </div>
        </div>
        </div>
      </section>

      {/* ── NOSOTROS ───────────────────────────────────────── */}
      <section id="nosotros" data-reveal style={{ borderTop:`1px solid rgba(201,168,76,0.1)` }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
          <div style={{ position:"relative", minHeight: isMobile ? 280 : 560, overflow:"hidden" }}>
            <img src={nosotrosImageUrl} alt="Nuestra historia" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:`${nosotrosPosX}% ${nosotrosPosY}%`, display:"block" }}/>
            <BgDragHandle imgKey="nosotrosImage" />
            <EditableImageButton field="nosotrosImage" label="Imagen nosotros" />
            {(() => { const ov = storeConfig?.imageOverrides?.["nosotrosImage"]; if (ov?.overlayType === "none") return null; return <div style={{ position:"absolute", inset:0, pointerEvents:"none", background: ov?.overlayType === "light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.25})` : `rgba(10,10,10,${ov?.overlayOpacity ?? 0.25})` }} />; })()}
          </div>
          <div style={{ padding: isMobile ? "40px 20px" : "80px 72px", display:"flex", flexDirection:"column", justifyContent:"center", gap:24, background:nosotrosPanelBg, position:"relative" }}>
            <EditableSectionBg field="bgNosotrosPanel" label="Fondo nosotros" />
            <div>
              <p style={{ fontSize:10, letterSpacing:5, color:G, textTransform:"uppercase", marginBottom:16 }}>
                <EditableZone field="aboutKicker" label="Kicker 'Nosotros'">Nuestra historia</EditableZone>
              </p>
              <h2 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(28px,3vw,42px)", lineHeight:1.2, margin:"0 0 24px", color:nosotrosPanelText }}>
                <EditableZone field="aboutHeading" label="Título 'Nosotros'">Creados para quienes eligen con intención.</EditableZone>
              </h2>
            </div>
            <p style={{ fontSize:14, opacity:0.65, lineHeight:1.85, color:nosotrosPanelText }}>
              <EditableZone field="aboutParagraph1" label="Párrafo 1 'Nosotros'">NOIR nació en 2018 con una premisa simple: crear piezas que duren más que una temporada. En un mundo saturado de fast fashion, apostamos por la confección artesanal, las telas de origen responsable y los diseños que no envejecen.</EditableZone>
            </p>
            <p style={{ fontSize:14, opacity:0.65, lineHeight:1.85, color:nosotrosPanelText }}>
              <EditableZone field="aboutParagraph2" label="Párrafo 2 'Nosotros'">Cada prenda pasa por un proceso riguroso de selección de materiales y control de calidad. Trabajamos con talleres locales y artesanos que comparten nuestra filosofía: menos piezas, más valor.</EditableZone>
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, paddingTop:8 }}>
              {([["aboutStat1","aboutStatLabel1","2018","Año de fundación"],["aboutStat2","aboutStatLabel2","100%","Producción local"],["aboutStat3","aboutStatLabel3","30+","Artesanos"],["aboutStat4","aboutStatLabel4","8 años","De trayectoria"]] as const).map(([fv,fl,n,label]) => (
                <div key={label}>
                  <p style={{ fontFamily:"Georgia, serif", fontSize:32, color:G, margin:"0 0 4px", fontWeight:700 }}><EditableZone field={fv} label={`Stat: ${n}`}>{n}</EditableZone></p>
                  <p style={{ fontSize:11, opacity:0.5, margin:0, lineHeight:1.4, color:nosotrosPanelText }}><EditableZone field={fl} label={`Etiqueta stat: ${label}`}>{label}</EditableZone></p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACTO ───────────────────────────────────────── */}
      <section id="contacto" data-reveal style={{ position:"relative", borderTop:`1px solid rgba(201,168,76,0.1)`, color:contactoText, ...(contactoBgImg?.url ? { backgroundImage:`url(${contactoBgImg.url})`, backgroundSize:"cover", backgroundPosition:`${contactoBgImg.posX ?? 50}% ${contactoBgImg.posY ?? 50}%` } : { background:contactoBg }) }}>
        <BgDragHandle imgKey="sectionbg_bgContacto" />
        <EditableSectionBg field="bgContacto" label="Fondo contacto" />
        {contactoBgImg?.url && contactoBgImg.overlayType !== "none" && (
          <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none", background: contactoBgImg.overlayType === "light" ? `rgba(255,255,255,${contactoBgImg.overlayOpacity ?? 0.5})` : `rgba(0,0,0,${contactoBgImg.overlayOpacity ?? 0.45})` }} />
        )}
        <div style={{ padding:"80px 32px", maxWidth:640, margin:"0 auto", position:"relative", zIndex:1 }}>
          <p style={{ fontSize:10, letterSpacing:5, color:G, textAlign:"center", textTransform:"uppercase", marginBottom:12 }}><EditableZone field="contactKicker" label="Etiqueta contacto">Contacto</EditableZone></p>
          <h2 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(24px,3vw,38px)", textAlign:"center", margin:"0 0 12px", color:contactoText }}>
            <EditableZone field="contactHeading" label="Título contacto">¿Tenés alguna consulta?</EditableZone>
          </h2>
          <p style={{ fontSize:14, opacity:0.5, textAlign:"center", marginBottom:48, lineHeight:1.7 }}>
            <EditableZone field="contactSubtext" label="Subtítulo contacto">Respondemos todos los mensajes en menos de 24 horas hábiles.</EditableZone>
          </p>

          {contactStatus === "sent" ? (
            <div style={{ textAlign:"center", padding:"60px 0" }}>
              <p style={{ fontSize:40, marginBottom:16 }}>✓</p>
              <p style={{ fontFamily:"Georgia, serif", fontSize:22, color:contactoText, marginBottom:8 }}>¡Mensaje enviado!</p>
              <p style={{ fontSize:13, opacity:0.5 }}>Te respondemos a la brevedad.</p>
              <button onClick={() => setContactStatus("idle")} style={{ marginTop:24, background:"transparent", color:G, border:`1px solid ${G}`, padding:"10px 28px", fontSize:11, letterSpacing:2, cursor:"pointer", textTransform:"uppercase" }}>Enviar otro mensaje</button>
            </div>
          ) : (
            <form onSubmit={handleContact} style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:16 }}>
                <div>
                  <label style={{ display:"block", fontSize:10, letterSpacing:3, textTransform:"uppercase", opacity:0.6, marginBottom:8 }}>Nombre</label>
                  <input required value={contactForm.nombre} onChange={e => setContactForm(f => ({...f, nombre:e.target.value}))}
                    placeholder="Tu nombre" style={{ width:"100%", background:contactoInputBg, border:`1px solid ${contactoInputBorder}`, color:contactoText, padding:"12px 16px", fontSize:13, outline:"none", boxSizing:"border-box" }}
                    onFocus={e => (e.target.style.borderColor=G)} onBlur={e => (e.target.style.borderColor=contactoInputBorder)}/>
                </div>
                <div>
                  <label style={{ display:"block", fontSize:10, letterSpacing:3, textTransform:"uppercase", opacity:0.6, marginBottom:8 }}>Email</label>
                  <input required type="email" value={contactForm.email} onChange={e => setContactForm(f => ({...f, email:e.target.value}))}
                    placeholder="tu@email.com" style={{ width:"100%", background:contactoInputBg, border:`1px solid ${contactoInputBorder}`, color:contactoText, padding:"12px 16px", fontSize:13, outline:"none", boxSizing:"border-box" }}
                    onFocus={e => (e.target.style.borderColor=G)} onBlur={e => (e.target.style.borderColor=contactoInputBorder)}/>
                </div>
              </div>
              <div>
                <label style={{ display:"block", fontSize:10, letterSpacing:3, textTransform:"uppercase", opacity:0.6, marginBottom:8 }}>Mensaje</label>
                <textarea required rows={5} value={contactForm.mensaje} onChange={e => setContactForm(f => ({...f, mensaje:e.target.value}))}
                  placeholder="¿En qué podemos ayudarte?" style={{ width:"100%", background:contactoInputBg, border:`1px solid ${contactoInputBorder}`, color:contactoText, padding:"12px 16px", fontSize:13, outline:"none", resize:"vertical", fontFamily:"inherit", boxSizing:"border-box" }}
                  onFocus={e => (e.target.style.borderColor=G)} onBlur={e => (e.target.style.borderColor=contactoInputBorder)}/>
              </div>
              <button type="submit" disabled={contactStatus==="sending"}
                style={{ background:G, color:BG, border:"none", padding:"16px", fontSize:12, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", opacity: contactStatus==="sending" ? 0.6 : 1, transition:"opacity 0.2s" }}>
                {contactStatus === "sending" ? "Enviando..." : "Enviar Mensaje"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer style={{ borderTop:`1px solid rgba(201,168,76,0.12)`, marginTop:0, position:"relative", color:footerText, ...(footerBgImg?.url ? { backgroundImage:`url(${footerBgImg.url})`, backgroundSize:"cover", backgroundPosition:`${footerBgImg.posX ?? 50}% ${footerBgImg.posY ?? 50}%` } : { background:footerBg }) }}>
        <BgDragHandle imgKey="sectionbg_bgFooter" />
        <EditableSectionBg field="bgFooter" label="Fondo footer" />
        {footerBgImg?.url && footerBgImg.overlayType !== "none" && (
          <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none", background: footerBgImg.overlayType === "light" ? `rgba(255,255,255,${footerBgImg.overlayOpacity ?? 0.5})` : `rgba(0,0,0,${footerBgImg.overlayOpacity ?? 0.45})` }} />
        )}
        <div style={{ padding: isMobile ? "40px 20px 20px" : "60px 32px 32px", position:"relative", zIndex:1 }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr 1.5fr", gap: isMobile ? 28 : 48, marginBottom:40 }}>
          <div>
            <span style={{ fontFamily:"Georgia, serif", fontSize:28, fontWeight:700, letterSpacing:6, color:G, display:"block", marginBottom:16 }}><EditableZone field="footerBrandName" label="Nombre en footer">NOIR</EditableZone></span>
            <p style={{ fontSize:13, opacity:0.45, lineHeight:1.8, maxWidth:260 }}>
              <EditableZone field="footerDescription" label="Descripción del footer">Piezas de calidad para personas que saben lo que quieren. Diseño atemporal, confección impecable.</EditableZone>
            </p>
            <div style={{ display:"flex", gap:12, marginTop:24 }}>
              {([["IG","instagram"],["FB","facebook"],["TK","tiktok"],["YT","youtube"]] as const).map(([label, key]) => {
                const url = storeConfig?.socialLinks?.[key];
                return (
                  <button key={label}
                    onClick={() => url && window.open(url, "_blank")}
                    style={{ background:"none", border:`1px solid ${footerSubtleBorder}`, color:footerText, width:34, height:34, fontSize:10, fontWeight:700, cursor: url ? "pointer" : "default", letterSpacing:1, transition:"all 0.2s", opacity: url ? 1 : 0.35 }}
                    onMouseEnter={e => { if(url){ e.currentTarget.style.borderColor=G; e.currentTarget.style.color=G; }}}
                    onMouseLeave={e => { e.currentTarget.style.borderColor=footerSubtleBorder; e.currentTarget.style.color=footerText; }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          {[
            { title:"Tienda",  links:[["Nueva temporada","productos"],["Más vendidos","productos"],["Ofertas","productos"],["Gift cards","contacto"]] },
            { title:"Ayuda",   links:[["Envíos y devoluciones","contacto"],["Talle y medidas","contacto"],["Cómo comprar","contacto"],["Contacto","contacto"]] },
          ].map(col => (
            <div key={col.title}>
              <p style={{ fontSize:10, letterSpacing:4, color:G, textTransform:"uppercase", marginBottom:20, fontWeight:700 }}>{col.title}</p>
              {col.links.map(([label, target]) => (
                <p key={label} onClick={() => scrollTo(target)} style={{ fontSize:13, opacity:0.45, marginBottom:10, cursor:"pointer", transition:"opacity 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.opacity="0.9")}
                  onMouseLeave={e => (e.currentTarget.style.opacity="0.45")}>
                  {label}
                </p>
              ))}
            </div>
          ))}
          <div>
            <p style={{ fontSize:10, letterSpacing:4, color:G, textTransform:"uppercase", marginBottom:20, fontWeight:700 }}>Newsletter</p>
            <p style={{ fontSize:12, opacity:0.45, marginBottom:16, lineHeight:1.6 }}>
              <EditableZone field="newsletterText" label="Texto newsletter">Suscribite y recibí novedades antes que nadie. Sin spam.</EditableZone>
            </p>
            <div style={{ display:"flex", maxWidth: isMobile ? "100%" : 340 }}>
              <input placeholder="tu@email.com" style={{ flex:1, minWidth:0, background:footerInputBg, border:`1px solid ${footerSubtleBorder}`, borderRight:"none", color:footerText, padding:"11px 14px", fontSize:12, outline:"none" }}/>
              <button style={{ flexShrink:0, background:G, color:BG, border:"none", padding:"11px 18px", fontSize:12, fontWeight:700, cursor:"pointer", letterSpacing:1 }}>OK</button>
            </div>
          </div>
        </div>
        {isMobile ? (
          /* ── MOBILE: 2 filas centradas ── */
          <div style={{ borderTop:`1px solid rgba(240,235,227,0.05)`, paddingTop:20, paddingBottom:80, maxWidth:1280, margin:"0 auto", display:"flex", flexDirection:"column", gap:10, alignItems:"center" }}>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"4px 16px", justifyContent:"center" }}>
              {[
                { label: "Política de devoluciones", tipo: "devoluciones" },
                { label: "Política de envíos",       tipo: "envios" },
                { label: "Términos y condiciones",   tipo: "terminos" },
              ].map(({ label, tipo }) => (
                editMode ? (
                  <button key={tipo} type="button" onClick={() => window.open("/dashboard/pagos", "_blank")}
                    title="Editar en Dashboard → Pagos"
                    style={{ fontSize:11, color:"inherit", opacity:0.3, background:"none", border:"none", cursor:"pointer", padding:0, letterSpacing:1, display:"inline-flex", alignItems:"center", gap:5 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.3"; }}>
                    {label}
                    <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                ) : (
                  <a key={tipo} href={`/tienda/${storeConfig?.slug ?? ""}/politicas?tipo=${tipo}`}
                    style={{ fontSize:11, color:"inherit", opacity:0.3, textDecoration:"none", letterSpacing:1 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.3"; }}>
                    {label}
                  </a>
                )
              ))}
              {!editMode && (
                <button onClick={() => setShowReport(true)}
                  style={{ fontSize:11, opacity:0.25, background:"none", border:"none", cursor:"pointer", color:"inherit", padding:0, letterSpacing:1 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.25"; }}>
                  Reportar tienda
                </button>
              )}
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"2px 12px", justifyContent:"center", textAlign:"center" }}>
              <p style={{ fontSize:11, opacity:0.25, margin:0 }}>
                <EditableZone field="footerCopyright" label="Copyright">© 2025 NOIR Fashion. Todos los derechos reservados.</EditableZone>
              </p>
              <p style={{ fontSize:11, opacity:0.25, margin:0 }}>
                <EditableZone field="footerMadeIn" label="Hecho en">Hecho con ♥ en Argentina</EditableZone>
              </p>
            </div>
          </div>
        ) : (
          /* ── DESKTOP: fila izq/der original ── */
          <div style={{ borderTop:`1px solid rgba(240,235,227,0.05)`, paddingTop:24, maxWidth:1280, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"8px 24px" }}>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"0 20px" }}>
              {[
                { label: "Política de devoluciones", tipo: "devoluciones" },
                { label: "Política de envíos",       tipo: "envios" },
                { label: "Términos y condiciones",   tipo: "terminos" },
              ].map(({ label, tipo }) => (
                editMode ? (
                  <button key={tipo} type="button" onClick={() => window.open("/dashboard/pagos", "_blank")}
                    title="Editar en Dashboard → Pagos"
                    style={{ fontSize:11, color:"inherit", opacity:0.3, background:"none", border:"none", cursor:"pointer", padding:0, letterSpacing:1, display:"inline-flex", alignItems:"center", gap:5 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.3"; }}>
                    {label}
                    <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                ) : (
                  <a key={tipo} href={`/tienda/${storeConfig?.slug ?? ""}/politicas?tipo=${tipo}`}
                    style={{ fontSize:11, color:"inherit", opacity:0.3, textDecoration:"none", letterSpacing:1 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.3"; }}>
                    {label}
                  </a>
                )
              ))}
            </div>
            <div style={{ display:"flex", gap:24, alignItems:"center", flexWrap:"wrap" }}>
              <p style={{ fontSize:11, opacity:0.25, margin:0 }}>
                <EditableZone field="footerCopyright" label="Copyright">© 2025 NOIR Fashion. Todos los derechos reservados.</EditableZone>
              </p>
              <p style={{ fontSize:11, opacity:0.25, margin:0 }}>
                <EditableZone field="footerMadeIn" label="Hecho en">Hecho con ♥ en Argentina</EditableZone>
              </p>
              {!editMode && (
                <button onClick={() => setShowReport(true)}
                  style={{ fontSize:11, opacity:0.25, background:"none", border:"none", cursor:"pointer", color:"inherit", padding:0, letterSpacing:1 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.25"; }}>
                  Reportar tienda
                </button>
              )}
            </div>
          </div>
        )}
        </div>
      </footer>

      {showReport && (
        <ReportStoreModal slug={storeConfig?.slug ?? ""} onClose={() => setShowReport(false)} />
      )}

      {/* ── MODAL PRODUCTO ─────────────────────────────────── */}
      {modalProduct && (
        <div style={{ position:"fixed", inset:0, zIndex: isPreview ? 20000 : 600, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => { setModalProduct(null); setLightboxSrc(null); }}>
          <div style={{ position:"absolute", inset:0, background:"rgba(10,10,10,0.88)", backdropFilter:"blur(8px)" }}/>
          <div style={{ position:"relative", background:S, maxWidth:960, width:"calc(100% - 32px)", maxHeight: isPreview ? "100%" : "92vh", overflow:"hidden", display:"flex", flexDirection:"column" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setModalProduct(null); setLightboxSrc(null); }} style={{ position:"absolute", top:8, right:8, zIndex:10, background:"rgba(10,10,10,0.65)", border:"none", color:T, width:36, height:36, cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>×</button>
            <div style={{ overflow:"auto", flex:1, minHeight:0, display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
            <div>
              {/* Imagen principal con flechas */}
              <div style={{ position:"relative" }} {...imgSwipe}>
                <img src={modalProduct.images[modalImg]} alt="" style={{ width:"100%", aspectRatio:"3/4", objectFit:"cover", display:"block", cursor:"zoom-in" }}
                  onError={e => { e.currentTarget.style.opacity="0"; }}
                  onClick={() => setLightboxSrc(modalProduct.images[modalImg])} />
                {modalProduct.images.length > 1 && (
                  <>
                    <button onClick={() => setModalImg(i => (i - 1 + modalProduct.images.length) % modalProduct.images.length)}
                      style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", background:"rgba(10,10,10,0.65)", border:`1px solid rgba(240,235,227,0.15)`, color:T, width:40, height:40, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)", transition:"background 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.background="rgba(10,10,10,0.88)")}
                      onMouseLeave={e => (e.currentTarget.style.background="rgba(10,10,10,0.65)")}>
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <button onClick={() => setModalImg(i => (i + 1) % modalProduct.images.length)}
                      style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"rgba(10,10,10,0.65)", border:`1px solid rgba(240,235,227,0.15)`, color:T, width:40, height:40, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)", transition:"background 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.background="rgba(10,10,10,0.88)")}
                      onMouseLeave={e => (e.currentTarget.style.background="rgba(10,10,10,0.65)")}>
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                    <div style={{ position:"absolute", bottom:12, right:12, background:"rgba(10,10,10,0.65)", color:T, fontSize:11, letterSpacing:1, padding:"4px 10px", backdropFilter:"blur(4px)" }}>
                      {modalImg + 1} / {modalProduct.images.length}
                    </div>
                  </>
                )}
              </div>
              {/* Miniaturas */}
              {modalProduct.images.length > 1 && (
                <div style={{ display:"flex", gap:8, padding:"12px 16px", background:"#0d0d0d", overflowX:"auto" }}>
                  {modalProduct.images.map((img, i) => (
                    <button key={i} onClick={() => setModalImg(i)}
                      style={{ width:56, height:56, flexShrink:0, padding:2, border: i===modalImg ? `2px solid ${G}` : "2px solid transparent", background:"none", cursor:"pointer", transition:"border-color 0.2s" }}>
                      <img src={img} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
                        onError={e => { e.currentTarget.style.opacity="0.3"; }}/>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: isMobile ? "20px 20px" : "40px 36px", display:"flex", flexDirection:"column", gap:20 }}>
              <div>
                <p style={{ fontSize:10, letterSpacing:3, color:G, textTransform:"uppercase", marginBottom:8, opacity:0.8 }}>
                  {modalProduct.category}
                  {modalProduct.subcategory && <span style={{ opacity:0.6 }}> › {modalProduct.subcategory}</span>}
                </p>
                <h2 style={{ fontFamily:"Georgia, serif", fontSize:26, margin:0, lineHeight:1.2 }}>{modalProduct.name}</h2>
              </div>
              <div style={{ display:"flex", gap:6, marginTop:8 }}>
                <button onClick={() => shareProduct(modalProduct)}
                  style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"1px solid rgba(240,235,227,0.15)", color:"rgba(240,235,227,0.5)", padding:"5px 12px", fontSize:10, letterSpacing:1, cursor:"pointer", transition:"color 0.2s" }}
                  onMouseEnter={e=>(e.currentTarget.style.color=T)} onMouseLeave={e=>(e.currentTarget.style.color="rgba(240,235,227,0.5)")}>
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  Copiar link
                </button>
                <button onClick={() => whatsappShare(modalProduct)}
                  style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"1px solid rgba(37,211,102,0.25)", color:"rgba(37,211,102,0.6)", padding:"5px 12px", fontSize:10, letterSpacing:1, cursor:"pointer", transition:"color 0.2s" }}
                  onMouseEnter={e=>(e.currentTarget.style.color="#25D366")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(37,211,102,0.6)")}>
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M11.897 0C5.395 0 .13 5.266.13 11.767c0 2.078.545 4.03 1.495 5.727L.057 24l6.7-1.757A11.71 11.71 0 0 0 11.897 23.534c6.503 0 11.768-5.265 11.768-11.767C23.67 5.266 18.4 0 11.897 0zm0 21.536h-.004a9.726 9.726 0 0 1-4.96-1.358l-.356-.211-3.678.965.982-3.581-.232-.368A9.73 9.73 0 0 1 2.158 11.767C2.158 6.355 6.551 2 11.897 2c2.581 0 5.007 1.007 6.831 2.831a9.604 9.604 0 0 1 2.828 6.83c0 5.347-4.393 9.875-9.659 9.875z"/></svg>
                  WhatsApp
                </button>
              </div>
              <div style={{ display:"flex", gap:12, alignItems:"baseline" }}>
                <span style={{ fontSize:24, fontWeight:700, color:G }}>{ocultarPrecios ? "Consultá precio" : fmt(modalProduct.price)}</span>
                {!ocultarPrecios && modalProduct.comparePrice && <span style={{ fontSize:15, color:"#444", textDecoration:"line-through" }}>{fmt(modalProduct.comparePrice)}</span>}
              </div>
              <p style={{ fontSize:13, opacity:0.58, lineHeight:1.75, borderTop:`1px solid rgba(240,235,227,0.08)`, paddingTop:16 }}>{modalProduct.description}</p>

              <div>
                <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", marginBottom:10, opacity:0.6 }}>Color: <strong style={{ color:T, opacity:1 }}>{selectedColor}</strong></p>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {modalProduct.colors.map(color => (
                    <button key={color} onClick={() => setSelectedColor(color)}
                      style={{ padding:"7px 16px", fontSize:11, border: selectedColor===color ? `1px solid ${G}` : "1px solid rgba(240,235,227,0.18)", background: selectedColor===color ? "rgba(201,168,76,0.12)" : "transparent", color:T, cursor:"pointer", transition:"all 0.2s" }}>
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", marginBottom:10, opacity:0.6 }}>Talle: <strong style={{ color:T, opacity:1 }}>{selectedSize}</strong></p>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {modalProduct.sizes.map(size => (
                    <button key={size} onClick={() => setSelectedSize(size)}
                      style={{ width:46, height:46, fontSize:12, fontWeight:600, border: selectedSize===size ? `1px solid ${G}` : "1px solid rgba(240,235,227,0.18)", background: selectedSize===size ? "rgba(201,168,76,0.12)" : "transparent", color:T, cursor:"pointer", transition:"all 0.2s" }}>
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", opacity:0.6, margin:0 }}>Cantidad</p>
                <div style={{ display:"flex", alignItems:"center", border:`1px solid rgba(240,235,227,0.18)` }}>
                  <button onClick={() => setQty(q => Math.max(1,q-1))} style={{ width:38, height:38, background:"none", border:"none", color:T, fontSize:20, cursor:"pointer" }}>−</button>
                  <span style={{ width:38, textAlign:"center", fontSize:14 }}>{qty}</span>
                  <button onClick={() => setQty(q => selectedVariantStock !== null ? Math.min(selectedVariantStock, q+1) : q+1)} style={{ width:38, height:38, background:"none", border:"none", color:T, fontSize:20, cursor:"pointer" }}>+</button>
                </div>
              </div>

              {/* Stock por variante (D-06) */}
              {selectedVariantStock !== null && selectedVariantStock === 0 && (
                <p style={{ fontSize:12, color:"#888", fontWeight:500, margin:0 }}>Sin stock en esta combinación</p>
              )}
              {selectedVariantStock !== null && selectedVariantStock > 0 && selectedVariantStock <= 5 && (
                <p style={{ fontSize:12, color:"#ef4444", fontWeight:600, margin:0 }}>¡Últimas {selectedVariantStock} unidades!</p>
              )}

              {/* Reels / Videos (D-02) */}
              {modalProduct.reelUrls.length > 0 && (
                <div style={{ borderTop:`1px solid rgba(240,235,227,0.08)`, paddingTop:16 }}>
                  <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", marginBottom:12, opacity:0.5 }}>Videos del producto</p>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
                    {(() => {
                      const url = modalProduct.reelUrls[reelIndex];
                      if (/\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url)) {
                        return <video controls style={{ width:160, aspectRatio:"9/16", objectFit:"cover", background:"#000", borderRadius:4 }}><source src={url} /></video>;
                      }
                      let embedUrl = "";
                      if (url.includes("youtube.com/shorts/")) { const id = url.split("shorts/")[1]?.split("?")[0]; embedUrl = `https://www.youtube.com/embed/${id}`; }
                      else if (url.includes("youtu.be/")) { const id = url.split("youtu.be/")[1]?.split("?")[0]; embedUrl = `https://www.youtube.com/embed/${id}`; }
                      else if (url.includes("youtube.com/watch")) { try { const id = new URL(url).searchParams.get("v"); if (id) embedUrl = `https://www.youtube.com/embed/${id}`; } catch {} }
                      if (embedUrl) return <iframe src={embedUrl} allow="autoplay; encrypted-media" allowFullScreen style={{ width:160, aspectRatio:"9/16", border:"none", borderRadius:4 }} />;
                      const platform = url.includes("instagram") ? "Instagram Reel" : url.includes("tiktok") ? "TikTok" : "Video";
                      return (
                        <a href={url} target="_blank" rel="noopener noreferrer"
                          style={{ width:160, aspectRatio:"9/16", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, border:`1px solid rgba(240,235,227,0.12)`, textDecoration:"none", color:T, borderRadius:4, background:BG }}>
                          <svg width={24} height={24} viewBox="0 0 24 24" fill={G} stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          <span style={{ fontSize:11 }}>{platform}</span>
                        </a>
                      );
                    })()}
                    {modalProduct.reelUrls.length > 1 && (
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <button onClick={() => setReelIndex(i => (i - 1 + modalProduct.reelUrls.length) % modalProduct.reelUrls.length)}
                          style={{ background:"none", border:`1px solid rgba(240,235,227,0.15)`, color:T, width:30, height:30, borderRadius:"50%", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
                        <div style={{ display:"flex", gap:5 }}>
                          {modalProduct.reelUrls.map((_, i) => (
                            <button key={i} onClick={() => setReelIndex(i)}
                              style={{ width:6, height:6, borderRadius:"50%", background: i === reelIndex ? G : "rgba(240,235,227,0.2)", border:"none", cursor:"pointer", padding:0 }} />
                          ))}
                        </div>
                        <button onClick={() => setReelIndex(i => (i + 1) % modalProduct.reelUrls.length)}
                          style={{ background:"none", border:`1px solid rgba(240,235,227,0.15)`, color:T, width:30, height:30, borderRadius:"50%", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isInquiryMode ? (
                <button onClick={() => openInquiry(modalProduct)}
                  style={{ background:G, color:BG, border:"none", padding:"16px", fontSize:12, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", marginTop:"auto" }}>
                  Consultar disponibilidad
                </button>
              ) : (
                <button onClick={addToCart}
                  disabled={selectedVariantStock === 0}
                  style={{ background: selectedVariantStock === 0 ? "rgba(201,168,76,0.3)" : G, color:BG, border:"none", padding:"16px", fontSize:12, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor: selectedVariantStock === 0 ? "not-allowed" : "pointer", marginTop:"auto" }}>
                  {selectedVariantStock === 0 ? "Sin stock" : `Agregar al Carrito · ${fmt(modalProduct.price * qty)}`}
                </button>
              )}

              {/* Reseñas — D-04 */}
              <div style={{ borderTop:`1px solid rgba(240,235,227,0.08)`, paddingTop:20, marginTop:20 }}>
                <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", opacity:0.5, margin:"0 0 16px" }}>
                  Reseñas{reviews.length > 0 && ` (${reviews.length})`}
                </p>
                {reviewsLoading ? (
                  <p style={{ fontSize:12, opacity:0.4 }}>Cargando...</p>
                ) : reviews.length > 0 ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:20 }}>
                    {reviews.map(r => (
                      <div key={r.id} style={{ borderBottom:`1px solid rgba(240,235,227,0.06)`, paddingBottom:14 }}>
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
                  <div style={{ position:"relative" }}>
                    {isPreview && <div style={{ position:"absolute", inset:0, zIndex:10, cursor:"default" }} onClick={e => e.stopPropagation()} />}
                    <form onSubmit={isPreview ? e => e.preventDefault() : submitReview} style={{ display:"flex", flexDirection:"column", gap:10, opacity: isPreview ? 0.55 : 1 }}>
                      <input value={reviewForm.reviewer} onChange={e => !isPreview && setReviewForm(p => ({ ...p, reviewer: e.target.value }))}
                        placeholder="Tu nombre" readOnly={isPreview}
                        style={{ background:"rgba(240,235,227,0.06)", border:"1px solid rgba(240,235,227,0.12)", color:T, padding:"9px 12px", fontSize:12, outline:"none" }} />
                      <div style={{ display:"flex", gap:4 }}>
                        {[1,2,3,4,5].map(s => (
                          <button key={s} type="button" onClick={() => !isPreview && setReviewForm(p => ({ ...p, rating: s }))}
                            style={{ background:"none", border:"none", fontSize:20, cursor: isPreview ? "default" : "pointer", color: s <= reviewForm.rating ? G : "rgba(240,235,227,0.2)", padding:"2px" }}>★</button>
                        ))}
                      </div>
                      <textarea value={reviewForm.comment} onChange={e => !isPreview && setReviewForm(p => ({ ...p, comment: e.target.value }))}
                        placeholder="Comentario (opcional)" rows={3} readOnly={isPreview}
                        style={{ background:"rgba(240,235,227,0.06)", border:"1px solid rgba(240,235,227,0.12)", color:T, padding:"9px 12px", fontSize:12, resize:"none", outline:"none" }} />
                      <button type="submit" disabled={isPreview || reviewSubmitting || !reviewForm.reviewer.trim()}
                        style={{ background: isPreview || reviewSubmitting || !reviewForm.reviewer.trim() ? "rgba(201,168,76,0.3)" : G, color:BG, border:"none", padding:"12px", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor: isPreview ? "default" : "pointer" }}>
                        {reviewSubmitting ? "Publicando..." : "Publicar reseña"}
                      </button>
                    </form>
                    {isPreview && <p style={{ fontSize:10, opacity:0.4, fontStyle:"italic", marginTop:6 }}>Vista previa — solo disponible en la tienda real.</p>}
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
                <div style={{ gridColumn: isMobile ? undefined : "1 / -1", padding: isMobile ? "20px 20px 28px" : "0 36px 36px", borderTop:"1px solid rgba(240,235,227,0.08)", paddingTop:24 }}>
                  <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", opacity:0.5, margin:"0 0 16px" }}>Productos similares</p>
                  <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap:14 }}>
                    {similar.map(p => (
                      <div key={p.id} onClick={() => openModal(p)} style={{ cursor:"pointer" }}>
                        <img src={p.images[0] ?? ""} alt={p.name} style={{ width:"100%", aspectRatio:"3/4", objectFit:"cover", display:"block" }} onError={e => { e.currentTarget.style.opacity="0"; }} />
                        <p style={{ margin:"8px 0 2px", fontSize:12, color:T, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical" as const }}>{p.name}</p>
                        <p style={{ margin:0, fontSize:13, fontWeight:700, color:G }}>{ocultarPrecios ? "Consultá precio" : fmt(p.price)}</p>
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

      {/* ── CHECKOUT ───────────────────────────────────────── */}
      {checkoutOpen && (
        <div style={{ position:"fixed", inset:0, zIndex: isPreview ? 20010 : 300, display:"flex", alignItems:"flex-start", justifyContent:"flex-end" }}>
          <div onClick={() => setCheckoutOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(10,10,10,0.72)", backdropFilter:"blur(6px)" }}/>
          <div style={{ position:"relative", width:480, maxWidth:"100vw", height:"100vh", background:"#0e0e0e", display:"flex", flexDirection:"column", overflowY:"auto", borderLeft:`1px solid rgba(201,168,76,0.12)` }}>

            {/* header */}
            <div style={{ padding:"24px 28px 16px", borderBottom:`1px solid rgba(240,235,227,0.06)`, display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexShrink:0 }}>
              <div>
                <p style={{ fontFamily:"Georgia, serif", fontSize:20, margin:"0 0 4px", color:T }}>Checkout</p>
                <p style={{ fontSize:11, opacity:0.35, margin:0, letterSpacing:1 }}>Pedido para Tiendaapps</p>
              </div>
              <button onClick={() => setCheckoutOpen(false)} style={{ background:"none", border:"none", color:T, fontSize:24, cursor:"pointer", lineHeight:1 }}>×</button>
            </div>

            {checkoutStatus === "done" ? (
              <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:48, textAlign:"center" }}>
                <div style={{ width:64, height:64, borderRadius:"50%", border:`2px solid ${G}`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:24 }}>
                  <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p style={{ fontFamily:"Georgia, serif", fontSize:24, color:T, marginBottom:12 }}>¡Pedido recibido!</p>
                <p style={{ fontSize:13, opacity:0.5, lineHeight:1.8, marginBottom:16 }}>Te enviamos un email con el resumen. El vendedor te contactará para coordinar el envío.</p>
                <p style={{ fontSize:11, opacity:0.35, lineHeight:1.7, marginBottom:32 }}>¿Algún inconveniente con tu pedido? Contactá directamente al vendedor. Tenés 10 días corridos para cancelar (Ley 24.240).</p>
                <button onClick={() => { setCheckoutOpen(false); setCheckoutStatus("idle"); }}
                  style={{ background:G, color:BG, border:"none", padding:"14px 36px", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor:"pointer" }}>
                  Seguir comprando
                </button>
              </div>
            ) : (
              <form onSubmit={handlePlaceOrder} style={{ flex:1, display:"flex", flexDirection:"column" }}>
                <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>

                  {/* resumen de items */}
                  <div style={{ marginBottom:28 }}>
                    {cartItems.map((item, idx) => (
                      <div key={idx} style={{ display:"flex", gap:14, padding:"12px 0", borderBottom:`1px solid rgba(240,235,227,0.05)` }}>
                        <img src={item.product.images[0]} alt="" style={{ width:56, height:74, objectFit:"cover", flexShrink:0 }}/>
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:14, margin:"0 0 3px", fontWeight:500, color:T }}>{item.product.name}</p>
                          <p style={{ fontSize:11, opacity:0.4, margin:"0 0 6px" }}>Talle: {item.size} · Color: {item.color}</p>
                          <p style={{ fontSize:13, color:G, fontWeight:700 }}>{fmt(item.product.price)}</p>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", border:`1px solid rgba(240,235,227,0.13)`, height:28, flexShrink:0 }}>
                          <button type="button" onClick={() => updateQty(idx,-1)} style={{ width:28, height:28, background:"none", border:"none", color:T, cursor:"pointer", fontSize:16 }}>−</button>
                          <span style={{ width:24, textAlign:"center", fontSize:13, color:T }}>{item.qty}</span>
                          <button type="button" onClick={() => updateQty(idx,1)} style={{ width:28, height:28, background:"none", border:"none", color:T, cursor:"pointer", fontSize:16 }}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* datos del comprador */}
                  <p style={{ fontSize:13, fontWeight:700, color:T, marginBottom:14, letterSpacing:1 }}>Datos del comprador</p>
                  {([ ["nombre","Nombre y apellido","text"], ["email","Email","email"], ["telefono","Teléfono","tel"], ["direccion","Dirección","text"], ] as const).map(([field, ph, type]) => (
                    <input key={field} required type={type} placeholder={ph}
                      value={buyerForm[field]} onChange={e => setBuyerForm(f => ({...f, [field]:e.target.value}))}
                      style={{ display:"block", width:"100%", marginBottom:10, background:"#171717", border:`1px solid rgba(201,168,76,0.15)`, color:T, padding:"11px 14px", fontSize:13, outline:"none", boxSizing:"border-box" }}
                      onFocus={e => (e.target.style.borderColor=G)} onBlur={e => (e.target.style.borderColor="rgba(201,168,76,0.15)")}/>
                  ))}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                    <input required placeholder="Ciudad"
                      value={buyerForm.ciudad} onChange={e => setBuyerForm(f => ({...f, ciudad:e.target.value}))}
                      style={{ background:"#171717", border:`1px solid rgba(201,168,76,0.15)`, color:T, padding:"11px 14px", fontSize:13, outline:"none", boxSizing:"border-box" }}
                      onFocus={e => (e.target.style.borderColor=G)} onBlur={e => (e.target.style.borderColor="rgba(201,168,76,0.15)")}/>
                    <select required value={buyerForm.provincia} onChange={e => setBuyerForm(f => ({...f, provincia:e.target.value}))}
                      style={{ background:"#171717", border:`1px solid rgba(201,168,76,0.15)`, color:T, padding:"11px 14px", fontSize:13, outline:"none", boxSizing:"border-box" }}>
                      <option value="">Provincia...</option>
                      {PROVINCIAS_ARGENTINA.map((p) => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <input required placeholder="Código postal" value={buyerForm.cp} onChange={e => setBuyerForm(f => ({...f, cp:e.target.value}))}
                    style={{ display:"block", width:"100%", marginBottom:10, background:"#171717", border:`1px solid rgba(201,168,76,0.15)`, color:T, padding:"11px 14px", fontSize:13, outline:"none", boxSizing:"border-box" }}
                    onFocus={e => (e.target.style.borderColor=G)} onBlur={e => (e.target.style.borderColor="rgba(201,168,76,0.15)")}/>
                  <label style={{ display:"flex", alignItems:"center", gap:10, fontSize:12, opacity:0.5, cursor:"pointer", marginBottom:28 }}>
                    <input type="checkbox" checked={rememberData} onChange={e => setRememberData(e.target.checked)} style={{ accentColor:G }}/>
                    Recordar mis datos para la próxima compra
                  </label>

                  {/* envío */}
                  <p style={{ fontSize:13, fontWeight:700, color:T, marginBottom:14, letterSpacing:1 }}>Envío</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:28 }}>
                    {envioOptions.map(opt => (
                      <label key={opt.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", border:`1px solid ${envioId===opt.id ? G : "rgba(240,235,227,0.1)"}`, cursor:"pointer", transition:"border-color 0.2s" }}>
                        <span style={{ display:"flex", alignItems:"center", gap:12 }}>
                          <input type="radio" name="envio" value={opt.id} checked={envioId===opt.id} onChange={() => setEnvioId(opt.id)} style={{ accentColor:G }}/>
                          <span style={{ fontSize:13, color:T }}>{opt.label}</span>
                        </span>
                        <span style={{ fontSize:13, fontWeight:700, color:(opt.isPickup||(!opt.coordinar&&!opt.liveQuote&&opt.price===0))?G:T }}>{opt.liveQuote ? fmtLiveQuote(opt.id) : fmtEnvioPrice(opt,fmt)}</span>
                      </label>
                    ))}
                  </div>

                  {/* pago */}
                  <p style={{ fontSize:13, fontWeight:700, color:T, marginBottom:14, letterSpacing:1 }}>Pago</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:28 }}>
                    {pagoOptions.map(opt => (
                      <label key={opt.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", border:`1px solid ${pagoId===opt.id ? G : "rgba(240,235,227,0.1)"}`, cursor:"pointer", transition:"border-color 0.2s" }}>
                        <input type="radio" name="pago" value={opt.id} checked={pagoId===opt.id} onChange={() => setPagoId(opt.id)} style={{ accentColor:G }}/>
                        <span style={{ fontSize:13, color:T }}>{opt.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* notas */}
                  <textarea placeholder="Notas para la tienda" rows={3} value={notas} onChange={e => setNotas(e.target.value)}
                    style={{ display:"block", width:"100%", marginBottom:20, background:"#171717", border:`1px solid rgba(201,168,76,0.15)`, color:T, padding:"11px 14px", fontSize:13, outline:"none", resize:"vertical", fontFamily:"inherit", boxSizing:"border-box" }}
                    onFocus={e => (e.target.style.borderColor=G)} onBlur={e => (e.target.style.borderColor="rgba(201,168,76,0.15)")}/>

                  {/* cupón */}
                  <div style={{ display:"flex", gap:0, marginBottom:28 }}>
                    <input placeholder="CÓDIGO DE CUPÓN" value={coupon} onChange={e => setCoupon(e.target.value)}
                      style={{ flex:1, background:"#171717", border:`1px solid rgba(201,168,76,0.15)`, borderRight:"none", color:T, padding:"11px 14px", fontSize:11, letterSpacing:2, outline:"none" }}
                      onFocus={e => (e.target.style.borderColor=G)} onBlur={e => (e.target.style.borderColor="rgba(201,168,76,0.15)")}/>
                    <button type="button" onClick={handleApplyCoupon} style={{ background:"transparent", border:`1px solid rgba(201,168,76,0.15)`, color:G, padding:"11px 18px", fontSize:11, letterSpacing:2, cursor:"pointer" }}>Aplicar</button>
                  </div>
                  {couponError && <p style={{ fontSize:11, color:"#f87171", marginBottom:8, marginTop:-20 }}>{couponError}</p>}
                  {appliedCoupon && (
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, padding:"8px 12px", background:"rgba(201,168,76,0.08)", border:`1px solid rgba(201,168,76,0.2)` }}>
                      <span style={{ fontSize:12, color:G }}>Cupón {appliedCoupon.code} aplicado</span>
                      <button type="button" onClick={() => setAppliedCoupon(null)} style={{ background:"none", border:"none", color:"#666", cursor:"pointer", fontSize:12 }}>✕</button>
                    </div>
                  )}

                  {/* resumen de totales */}
                  <div style={{ borderTop:`1px solid rgba(240,235,227,0.07)`, paddingTop:20 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                      <span style={{ fontSize:13, opacity:0.55 }}>Subtotal</span>
                      <span style={{ fontSize:13, opacity:0.55 }}>{fmt(cartTotal)}</span>
                    </div>
                    {couponDiscount > 0 && (
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                        <span style={{ fontSize:13, color:G }}>Descuento cupón</span>
                        <span style={{ fontSize:13, color:G }}>-{fmt(couponDiscount)}</span>
                      </div>
                    )}
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
                      <span style={{ fontSize:13, opacity:0.55 }}>Envío</span>
                      <span style={{ fontSize:13, opacity:0.55 }}>{envioCoordinar?"A coordinar":envioPrice===0?"Gratis":fmt(envioPrice)}</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ fontSize:16, fontWeight:700, color:T }}>Total</span>
                      <span style={{ fontSize:20, fontWeight:800, color:G }}>{fmt(orderTotal)}</span>
                    </div>
                  </div>

                  {/* donación opcional a la Canasta Solidaria — pago aparte, no se suma al total. Solo se muestra si hay una campaña ACTIVE recibiendo donaciones. */}
                  {canastaDisponible && (
                  <div style={{ marginTop:20, paddingTop:16, borderTop:`1px solid rgba(240,235,227,0.07)` }}>
                    <label style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}>
                      <span style={{ fontSize:13, color:T, display:"flex", alignItems:"center", gap:6 }}><HandHeart size={16} style={{ color:G }} /> ¿Donar?</span>
                      <input type="checkbox" checked={donationEnabled} onChange={e => setDonationEnabled(e.target.checked)} style={{ accentColor:G }} />
                    </label>
                    <p style={{ fontSize:10, opacity:0.5, marginTop:6, lineHeight:1.5 }}>
                      Sumá un aporte aparte para completar una canasta de alimentos para un vecino — se paga por separado, no afecta tu compra.{" "}
                      <a href="/comunidad/campana" target="_blank" rel="noopener" style={{ color:G, textDecoration:"underline" }}>¿Cómo funciona?</a>
                    </p>
                    {donationEnabled && (
                      <div style={{ marginTop:10 }}>
                        <input
                          type="number"
                          min={1000}
                          value={donationAmount}
                          onChange={e => setDonationAmount(Number(e.target.value) || 0)}
                          style={{ width:"100%", background:"#171717", border:`1px solid rgba(201,168,76,0.15)`, color:T, padding:"10px 14px", fontSize:13, outline:"none" }}
                        />
                        <p style={{ fontSize:10, opacity:0.5, marginTop:6, lineHeight:1.5 }}>Mínimo $1.000.</p>
                      </div>
                    )}
                  </div>
                  )}

                  {checkoutError && <p style={{ fontSize:12, color:"#f87171", marginTop:12 }}>{checkoutError}</p>}
                </div>

                {/* botón crear pedido */}
                <div style={{ padding:"16px 28px 28px", borderTop:`1px solid rgba(240,235,227,0.06)`, flexShrink:0 }}>
                  {/* seguridad */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, padding:"10px 14px", border:`1px solid rgba(240,235,227,0.08)`, borderRadius:4 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color:"#4ade80", flexShrink:0 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <span style={{ fontSize:11, color:"rgba(240,235,227,0.45)", lineHeight:1.5 }}>
                      Pago seguro procesado por <strong style={{ color:"rgba(240,235,227,0.7)" }}>MercadoPago</strong> · SSL cifrado
                    </span>
                  </div>
                  <label style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:14, cursor:"pointer" }}>
                    <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} style={{ marginTop:2, accentColor:G, flexShrink:0 }} />
                    <span style={{ fontSize:11, color:"rgba(240,235,227,0.55)", lineHeight:1.6 }}>
                      Acepto los{" "}
                      <a href={`/tienda/${storeConfig?.slug ?? ""}/politicas?tipo=terminos`} target="_blank" rel="noopener" style={{ color:G, textDecoration:"underline" }}>Términos y Condiciones</a>
                      {" "}de la tienda y la{" "}
                      <a href="/privacidad?role=buyer" target="_blank" rel="noopener" style={{ color:G, textDecoration:"underline" }}>Política de Privacidad</a>
                    </span>
                  </label>
                  <button type="submit" disabled={checkoutStatus==="placing" || !acceptedTerms}
                    style={{ width:"100%", background:G, color:BG, border:"none", padding:"16px", fontSize:12, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor: (!acceptedTerms || checkoutStatus==="placing") ? "not-allowed" : "pointer", opacity: (!acceptedTerms || checkoutStatus==="placing") ? 0.45 : 1, transition:"opacity 0.2s" }}>
                    {checkoutStatus==="placing" ? "Procesando..." : "Crear pedido"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── CARRITO ────────────────────────────────────────── */}
      <div style={{ position:"fixed", inset:0, zIndex: isPreview ? 20000 : 150, pointerEvents: cartOpen ? "auto" : "none", overflow:"hidden" }}>
        <div onClick={() => setCartOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(10,10,10,0.6)", opacity: cartOpen ? 1 : 0, transition:"opacity 0.3s" }}/>
        <div style={{ position:"absolute", top:0, right:0, bottom:0, left: isMobile ? 0 : "auto", width: isMobile ? "auto" : 420, background:S, transform: cartOpen ? "translateX(0)" : "translateX(100%)", transition:"transform 0.35s cubic-bezier(.4,0,.2,1)", display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"24px 24px 16px", borderBottom:`1px solid rgba(240,235,227,0.07)`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <p style={{ fontFamily:"Georgia, serif", fontSize:18, margin:0 }}>Tu carrito <span style={{ fontSize:13, color:"#555" }}>({cartCount})</span></p>
            <button onClick={() => setCartOpen(false)} style={{ background:"none", border:"none", color:T, fontSize:24, cursor:"pointer", lineHeight:1 }}>×</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"16px 24px" }}>
            {cartItems.length === 0
              ? <div style={{ textAlign:"center", padding:"60px 0", opacity:0.35 }}><p style={{ fontSize:36, marginBottom:12 }}>🛍️</p><p style={{ fontSize:13, lineHeight:1.8 }}>Tu carrito está vacío.<br/>Explorá la colección.</p></div>
              : cartItems.map((item, idx) => (
                <div key={idx} style={{ display:"flex", gap:14, padding:"16px 0", borderBottom:`1px solid rgba(240,235,227,0.06)` }}>
                  <img src={item.product.images[0]} alt="" style={{ width:70, height:93, objectFit:"cover", flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:14, margin:"0 0 3px", fontWeight:500 }}>{item.product.name}</p>
                    <p style={{ fontSize:11, opacity:0.45, margin:"0 0 10px" }}>{item.color} · Talle {item.size}</p>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ display:"flex", alignItems:"center", border:`1px solid rgba(240,235,227,0.13)` }}>
                        <button onClick={() => updateQty(idx,-1)} style={{ width:28, height:28, background:"none", border:"none", color:T, cursor:"pointer", fontSize:16 }}>−</button>
                        <span style={{ width:24, textAlign:"center", fontSize:13 }}>{item.qty}</span>
                        <button onClick={() => updateQty(idx,1)} style={{ width:28, height:28, background:"none", border:"none", color:T, cursor:"pointer", fontSize:16 }}>+</button>
                      </div>
                      <span style={{ color:G, fontWeight:700, fontSize:14 }}>{fmt(item.product.price * item.qty)}</span>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(idx)} style={{ background:"none", border:"none", color:"#444", cursor:"pointer", fontSize:18, alignSelf:"flex-start", transition:"color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color="#f0ebe3")}
                    onMouseLeave={e => (e.currentTarget.style.color="#444")}>×</button>
                </div>
              ))
            }
          </div>
          {cartItems.length > 0 && (
            <div style={{ padding:"16px 24px 32px", borderTop:`1px solid rgba(240,235,227,0.07)` }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:11, opacity:0.5, letterSpacing:2, textTransform:"uppercase" }}>Subtotal</span>
                <span style={{ fontSize:11, opacity:0.5 }}>{cartCount} {cartCount === 1 ? "pieza" : "piezas"}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:24 }}>
                <span style={{ fontSize:13, opacity:0.6 }}>Total</span>
                <span style={{ fontSize:22, fontWeight:700, color:G }}>{fmt(cartTotal)}</span>
              </div>
              {wholesaleWarnings.length > 0 && (
                <div style={{ marginBottom:14, padding:"10px 14px", background:"rgba(234,179,8,0.1)", borderLeft:"3px solid #eab308", borderRadius:"0 6px 6px 0" }}>
                  <p style={{ fontSize:11, margin:0, color:"#eab308", fontWeight:600, letterSpacing:0.5 }}>Cantidad mínima no alcanzada</p>
                  {wholesaleWarnings.map((item, i) => (
                    <p key={i} style={{ fontSize:10, margin:"4px 0 0", color:"rgba(240,235,227,0.55)" }}>
                      {item.product.name}: mín. {item.product.cantMinMayorista} uds.
                    </p>
                  ))}
                </div>
              )}
              <button onClick={blockBuy ? undefined : openCheckout} disabled={blockBuy} title={isOwner ? "No podés comprar en tu propia tienda" : isPreview ? "No disponible en modo edición" : undefined} style={{ width:"100%", background: blockBuy ? "rgba(201,168,76,0.25)" : G, color: blockBuy ? "rgba(240,235,227,0.35)" : BG, border:"none", padding:"16px", fontSize:12, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor: blockBuy ? "not-allowed" : "pointer", marginBottom:10 }}>
                {isOwner ? "No disponible para el dueño" : isPreview ? "Solo en la tienda real" : "Finalizar Compra"}
              </button>
              <button onClick={() => setCartOpen(false)} style={{ width:"100%", background:"transparent", color:T, border:`1px solid rgba(240,235,227,0.15)`, padding:"12px", fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer" }}>
                Seguir Comprando
              </button>
              {storeConfig?.whatsapp?.enabled && storeConfig.whatsapp.number && (
                <a
                  href={`https://wa.me/${storeConfig.whatsapp.number.replace(/\D/g,"")}${storeConfig.whatsapp.message ? "?text=" + encodeURIComponent(storeConfig.whatsapp.message) : ""}`}
                  target="_blank" rel="noreferrer"
                  style={{ display:"flex", alignItems:"center", gap:10, marginTop:14, padding:"11px 14px", background:"rgba(37,211,102,0.08)", borderRadius:6, textDecoration:"none", transition:"background 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.background="rgba(37,211,102,0.15)")}
                  onMouseLeave={e => (e.currentTarget.style.background="rgba(37,211,102,0.08)")}
                >
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="#25D366" style={{ flexShrink:0 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  <div>
                    <p style={{ fontSize:10, margin:0, color:"rgba(240,235,227,0.45)", letterSpacing:1 }}>¿TENÉS DUDAS?</p>
                    <p style={{ fontSize:12, margin:0, color:"#25D366", fontWeight:600 }}>Consultá por WhatsApp</p>
                  </div>
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── FAVORITES DRAWER ───────────────────────────────── */}
      <div style={{ position:"fixed", inset:0, zIndex: isPreview ? 20000 : 155, pointerEvents: favoritesOpen ? "auto" : "none" }}>
        <div onClick={() => setFavoritesOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(10,10,10,0.6)", opacity: favoritesOpen ? 1 : 0, transition:"opacity 0.3s" }}/>
        <div style={{ position:"absolute", top:0, right:0, bottom:0, width:420, background:S, transform: favoritesOpen ? "translateX(0)" : "translateX(100%)", transition:"transform 0.35s cubic-bezier(.4,0,.2,1)", display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"24px 24px 16px", borderBottom:`1px solid rgba(240,235,227,0.07)`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <p style={{ fontFamily:"Georgia, serif", fontSize:18, margin:0 }}>{"Favoritos"} <span style={{ fontSize:13, color:"#555" }}>({favorites.length})</span></p>
            <button onClick={() => setFavoritesOpen(false)} style={{ background:"none", border:"none", color:T, fontSize:24, cursor:"pointer", lineHeight:1 }}>×</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"16px 24px" }}>
            {favoriteProducts.length === 0
              ? <div style={{ textAlign:"center", padding:"60px 0", opacity:0.35 }}>
                  <p style={{ fontSize:36, marginBottom:12 }}>♡</p>
                  <p style={{ fontSize:13, lineHeight:1.8 }}>No tenés favoritos aún.<br/>Guardá piezas que te gusten.</p>
                </div>
              : favoriteProducts.map(product => (
                <div key={product.id} style={{ display:"flex", gap:14, padding:"16px 0", borderBottom:`1px solid rgba(240,235,227,0.06)` }}>
                  <img src={product.images[0]} alt="" style={{ width:70, height:93, objectFit:"cover", flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:14, margin:"0 0 3px", fontWeight:500 }}>{product.name}</p>
                    <p style={{ fontSize:13, color:G, fontWeight:700, margin:"0 0 10px" }}>{ocultarPrecios ? "Consultá precio" : fmt(product.price)}</p>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={() => { setFavoritesOpen(false); openModal(product); }}
                        style={{ background:G, color:BG, border:"none", padding:"7px 14px", fontSize:10, letterSpacing:2, fontWeight:700, textTransform:"uppercase", cursor:"pointer" }}>
                        Ver producto
                      </button>
                      <button onClick={() => toggleFavorite(product.id)}
                        style={{ background:"transparent", color:"#666", border:"1px solid rgba(240,235,227,0.15)", padding:"7px 14px", fontSize:10, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", transition:"color 0.2s" }}
                        onMouseEnter={e => (e.currentTarget.style.color=T)}
                        onMouseLeave={e => (e.currentTarget.style.color="#666")}>
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* ── LIGHTBOX ───────────────────────────────────────── */}
      {lightboxSrc && (
        <div style={{ position:"fixed", inset:0, zIndex:700, background:"rgba(0,0,0,0.97)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="" style={{ maxWidth:"100vw", maxHeight:"100vh", objectFit:"contain", touchAction:"pinch-zoom" }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxSrc(null)} style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", width:44, height:44, borderRadius:"50%", fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
      )}

      {/* ── FLOATING CART BUTTON ────────────────────────────── */}
      <button onClick={() => { setCartOpen(true); setFavoritesOpen(false); }}
        style={{ position:"fixed", bottom:24, ...(hasWA ? {left:24} : {right:24}), zIndex:500, width:52, height:52, borderRadius:"50%", background:G, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 20px rgba(0,0,0,0.3)", transition:"transform 0.2s" }}
        onMouseEnter={e => (e.currentTarget.style.transform="scale(1.1)")}
        onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}>
        <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={getContrastColor(G)==="light"?"#fff":"#0a0a0a"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
        {cartCount > 0 && <span style={{ position:"absolute", top:-4, right:-4, background:"#e53e3e", color:"#fff", borderRadius:"50%", width:20, height:20, fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{cartCount}</span>}
      </button>

      {/* ── WHATSAPP BUTTON ────────────────────────────────── */}
      {(!storeConfig || storeConfig.whatsapp.enabled) && (
        <EditableFixed field="whatsapp" label="WhatsApp" bottom={24} right={24}>
          <button
            onClick={() => window.open(`https://wa.me/${(storeConfig?.whatsapp.number ?? "5491100000000").replace(/\D/g,"")}${storeConfig?.whatsapp?.message ? "?text=" + encodeURIComponent(storeConfig.whatsapp.message) : ""}`, "_blank")}
            style={{ position:"fixed", bottom:24, right:24, zIndex:500, width:52, height:52, borderRadius:"50%", background:"#25D366", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 20px rgba(37,211,102,0.4)", transition:"transform 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.transform="scale(1.1)")}
            onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </button>
        </EditableFixed>
      )}

    </div>
  );
}
