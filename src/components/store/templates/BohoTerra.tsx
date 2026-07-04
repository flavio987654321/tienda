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
import ReportStoreModal from "@/components/store/ReportStoreModal";
import VerifiedIconButton from "@/components/store/VerifiedIconButton";
import { CartDrawer, type CartTheme } from "@/components/store/templates/shared/CartDrawer";
import { CheckoutModal } from "@/components/store/templates/shared/CheckoutModal";
import { FadeImage } from "@/components/store/templates/shared/FadeImage";
import { SectionBlock } from "@/components/store/templates/shared/SectionBlock";
import { PromoBannerCarousel } from "@/components/store/templates/shared/PromoBannerCarousel";
import { parseVariantAttrs } from "@/lib/variantAttrs";
import { colorToSwatch } from "@/lib/colorSwatch";
import { discountPercent } from "@/lib/discount";

const SIZE_ATTRS = ["talle","size","talla","talles","sizes","tamaño","tamano","almacenamiento","ram","versión","version","formato","variante","material","sabor","peso/tamaño","peso"];

const BG  = "#faf7f2";
const S   = "#f0e9df";
const T   = "#2c2218";
const MID = "#9a8070";

type Product = StorefrontProduct;

/* ── Ícono de carrito flotante — variantes para elegir en modo edición ── */
const CART_ICON_OPTIONS: React.ReactNode[] = [
  <Fragment key="bag"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></Fragment>,
  <Fragment key="cart"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></Fragment>,
  <Fragment key="basket"><path d="M5 11 2 7h20l-3 4"/><path d="M4 11h16l-1.7 8.5a2 2 0 0 1-2 1.5H7.7a2 2 0 0 1-2-1.5L4 11Z"/><path d="M9 11V8a3 3 0 0 1 6 0v3"/></Fragment>,
];


const announcementMessages_DEFAULT = [
  "🌿 Envío gratis en compras mayores a $30.000",
  "🔄 Cambios sin cargo hasta 30 días",
  "🌱 6 cuotas sin interés",
];

const scrollTo = (id:string) => document.getElementById(id)?.scrollIntoView({ behavior:"smooth" });

const BT_SECTION_IDS = ["bt-mayorista", "bt-banner", "bt-coleccion", "bt-ofertas", "bt-masvisto", "bt-prueba-social", "bt-nosotros", "bt-contacto"];

export default function BohoTerra() {
  type PReview = { id: string; rating: number; comment: string | null; reviewer: string; verified: boolean; verifiedBy: string | null; createdAt: string; product?: { name: string; image: string | null } };
  type HomeReview = PReview;
  const [reviews,        setReviews]        = useState<PReview[]>([]);
  const [homeReviews,    setHomeReviews]    = useState<HomeReview[]>([]);
  const [reviewCarouselPage, setReviewCarouselPage] = useState(0);
  const [reviewsShown,   setReviewsShown]   = useState(5);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewForm,     setReviewForm]     = useState({ reviewer: "", rating: 5, comment: "", email: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone,     setReviewDone]     = useState(false);
  const [reviewHoneypot, setReviewHoneypot] = useState("");

  const storeConfig = useStoreConfig();
  const pushBell = usePushBell();
  const { user, signOut } = useAuth();
  const panelHref = user?.role === "ADMIN" ? "/admin" : user?.role === "OWNER" ? "/dashboard" : user?.role === "SELLER" ? "/afiliados" : "/mi-cuenta";
  const panelLabel = user?.role === "ADMIN" ? "Admin" : user?.role === "OWNER" ? "Mi tienda" : user?.role === "SELLER" ? "Mi panel" : "Mi cuenta";
  const isPreview   = !!storeConfig?.previewFill;
  const isOwner     = !!storeConfig?.isOwner;
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
  const A = storeConfig?.colors.accent ?? "#b5652a";
  const sc = storeConfig?.sectionColors ?? {};
  const heroLeftBg = sc["bgHeroLeft"] ?? BG;
  const heroLeftText = getContrastColor(heroLeftBg) === "light" ? "#faf7f2" : "#2c2218";
  const heroLeftMid = getContrastColor(heroLeftBg) === "light" ? "#d5c9be" : "#9a8070";
  const coleccionBg   = sc["bgColeccion"] ?? BG;
  const coleccionText = getContrastColor(coleccionBg) === "light" ? "#faf7f2" : "#2c2218";
  const coleccionMid  = getContrastColor(coleccionBg) === "light" ? "#d5c9be" : "#9a8070";
  const ofertasBg   = sc["bgOfertas"] ?? S;
  const ofertasText = getContrastColor(ofertasBg) === "light" ? "#faf7f2" : "#2c2218";
  const ofertasMid  = getContrastColor(ofertasBg) === "light" ? "#d5c9be" : "#9a8070";
  const masVistoBg   = sc["bgMasVisto"] ?? BG;
  const masVistoText = getContrastColor(masVistoBg) === "light" ? "#faf7f2" : "#2c2218";
  const nosotrosBg = sc["bgNosotros"] ?? S;
  const nosotrosText = getContrastColor(nosotrosBg) === "light" ? "#faf7f2" : "#2c2218";
  const nosotrosMid = getContrastColor(nosotrosBg) === "light" ? "#d5c9be" : "#9a8070";
  const footerBg   = sc["bgFooter"]      ?? S;
  const footerText = getContrastColor(footerBg) === "light" ? "#faf7f2" : T;
  const footerMid  = getContrastColor(footerBg) === "light" ? "#d5c9be" : MID;

  // Image overrides with focal point positions
  const heroImage1Ov      = storeConfig?.imageOverrides?.["heroImage1"];
  const heroImage2Ov      = storeConfig?.imageOverrides?.["heroImage2"];
  const heroImage3Ov      = storeConfig?.imageOverrides?.["heroImage3"];
  const nosotrosImageOv   = storeConfig?.imageOverrides?.["nosotrosImage"];
  const contactBgOv       = storeConfig?.imageOverrides?.["contactBackground"];

  // Newsletter strip — fondo propio, separado del footer
  const newsletterBg    = sc["bgNewsletter"]  ?? A;
  const newsletterBgImg = storeConfig?.imageOverrides?.["sectionbg_bgNewsletter"];
  const newsletterText  = newsletterBgImg?.url
    ? (newsletterBgImg.overlayType === "light" ? T : "#faf7f2")
    : (getContrastColor(newsletterBg) === "light" ? "#faf7f2" : T);
  const isDarkNewsletter = newsletterText === "#faf7f2";
  const newsletterMid   = isDarkNewsletter ? "rgba(255,255,255,0.65)" : "rgba(44,34,24,0.55)";
  const newsletterInputBg     = isDarkNewsletter ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.06)";
  const newsletterInputBorder = isDarkNewsletter ? "rgba(255,255,255,0.3)"  : "rgba(0,0,0,0.15)";

  const [scrolled,            setScrolled]            = useState(false);
  const [activeCategory,      setActiveCategory]      = useState("Todos");
  const [activeGender,        setActiveGender]        = useState<string | null>(null);
  const [hoveredNavCat,       setHoveredNavCat]       = useState<string | null>(null);
  const [desktopOpenCat,      setDesktopOpenCat]      = useState<string | null>(null);
  const [carouselIdx,         setCarouselIdx]         = useState(0);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [announcementIdx,     setAnnouncementIdx]     = useState(0);
  const [showReport,          setShowReport]          = useState(false);
  const [isMobile,            setIsMobile]            = useState(false);
  const [reelIndex,           setReelIndex]           = useState(0);
  const [mobileMenuOpen,      setMobileMenuOpen]      = useState(false);
  const [mobileCatsOpen,      setMobileCatsOpen]      = useState(false);
  const [mobileOpenCat,       setMobileOpenCat]       = useState<string | null>(null);
  const [lightboxSrc,         setLightboxSrc]         = useState<string|null>(null);
  const [ofertasIdx,          setOfertasIdx]          = useState(0);
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
  const carouselRef = useRef<HTMLDivElement>(null);

  const cart = useCartLogic(storefront);
  const {
    setCartOpen,
    modalProduct, setModalProduct, modalImg, setModalImg,
    selectedSize, setSelectedSize, selectedColor, setSelectedColor,
    qty, setQty, selectedVariantStock, outOfStockSizes,
    searchOpen, setSearchOpen, searchQuery, setSearchQuery,
    favorites, favoritesOpen, setFavoritesOpen,
    userDropdownOpen, setUserDropdownOpen, userDropdownRef,
    toastMsg, contactStatus, setContactStatus, contactForm, setContactForm,
    cartCount,
    searchResults, favoriteProducts,
    fmt, showToast, openModal, addToCart,
    handleContact, toggleFavorite,
  } = cart;
  const cartTheme: CartTheme = { BG:"#ffffff", S, T, MID, border:"rgba(44,34,24,0.1)", accent:A, accentText:"#fff", serif:"Georgia, serif" };
  const imgSwipe = useTouchSwipe(
    () => { if (modalProduct) setModalImg(i => (i + 1) % modalProduct.images.length); },
    () => { if (modalProduct) setModalImg(i => (i - 1 + modalProduct.images.length) % modalProduct.images.length); }
  );

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeConfig?.slug]);

  // Cargar reseñas al abrir modal (D-04): sincroniza el estado de reseñas con el modalProduct.id actual (fetch + reset), patrón estándar de "fetch on id change"
  useEffect(() => {
    const slug = storeConfig?.slug;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!modalProduct || !slug) { setReviews([]); return; }
    setReviewsLoading(true); setReviewDone(false); setReelIndex(0); setReviewsShown(5);
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
    if (isPreview || isOwner || reviewHoneypot) return;
    const slug = storeConfig?.slug;
    if (!modalProduct || !slug || !reviewForm.reviewer.trim()) return;
    setReviewSubmitting(true);
    const res = await fetch(`/api/public/${slug}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: modalProduct.id, rating: reviewForm.rating, comment: reviewForm.comment, reviewer: reviewForm.reviewer, buyerEmail: reviewForm.email.trim() || undefined }),
    });
    if (res.ok) {
      const data = await res.json();
      setReviews(p => [data.review, ...p]);
      setReviewForm({ reviewer: "", rating: 5, comment: "", email: "" });
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
    const fn = () => setScrolled(window.scrollY > 40);
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
      img => img.variantValue && img.variantValue.toLowerCase() === selectedColor.toLowerCase()
    );
    if (imgIdx !== -1) setModalImg(imgIdx);
    const colorVariants = modalProduct.variants.filter(v => {
      const a = parseVariantAttrs(v.name);
      return !!a && Object.values(a).some((x: unknown) => String(x).toLowerCase() === selectedColor.toLowerCase());
    });
    if (!colorVariants.length) return;
    const best = colorVariants.find(v => v.stock > 0) ?? colorVariants[0];
    const bestAttrs = parseVariantAttrs(best.name);
    if (bestAttrs) {
      const sizeKey = Object.keys(bestAttrs).find(k => SIZE_ATTRS.includes(k.toLowerCase()));
      if (sizeKey && bestAttrs[sizeKey] && bestAttrs[sizeKey] !== selectedSize) setSelectedSize(String(bestAttrs[sizeKey]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColor, modalProduct?.id]);

  // Al cambiar talle: sync color + imagen si el combo talle+color actual no existe
  useEffect(() => {
    if (!modalProduct || !selectedSize) return;
    if (selectedColor) {
      const hasCombo = modalProduct.variants.some(v => {
        const a = parseVariantAttrs(v.name);
        if (!a) return false;
        const vals = Object.values(a).map((x: unknown) => String(x).toLowerCase());
        return vals.includes(selectedSize.toLowerCase()) && vals.includes(selectedColor.toLowerCase());
      });
      if (hasCombo) return;
    }
    const sizeVariants = modalProduct.variants.filter(v => {
      const a = parseVariantAttrs(v.name);
      if (!a) return false;
      return Object.entries(a).some(([k, val]: [string, unknown]) => SIZE_ATTRS.includes(k.toLowerCase()) && String(val).toLowerCase() === selectedSize.toLowerCase());
    });
    if (!sizeVariants.length) return;
    const best = sizeVariants.find(v => v.stock > 0) ?? sizeVariants[0];
    const bestAttrs = parseVariantAttrs(best.name);
    if (bestAttrs) {
      const colorKey = Object.keys(bestAttrs).find((k: string) => ["color","colour","colores","colors","tono"].includes(k.toLowerCase()));
      if (colorKey && bestAttrs[colorKey]) {
        const newColor = String(bestAttrs[colorKey]);
        if (newColor !== selectedColor) {
          setSelectedColor(newColor);
          const imgIdx = modalProduct.imageItems.findIndex(
            img => img.variantValue && img.variantValue.toLowerCase() === newColor.toLowerCase()
          );
          if (imgIdx !== -1) setModalImg(imgIdx);
        }
      }
    }
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

  // Al cambiar de imagen (flechas/miniaturas): sync color si esa foto pertenece a otra variante
  useEffect(() => {
    if (!modalProduct) return;
    const img = modalProduct.imageItems[modalImg];
    if (img?.variantValue && img.variantValue.toLowerCase() !== selectedColor?.toLowerCase()) {
      setSelectedColor(img.variantValue);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalImg]);

  const CARDS_PER_VIEW = isMobile ? 1 : 3;
  const CAROUSEL_LIMIT = 8;
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

  const changeGender = (g: string | null) => { setActiveGender(g); setActiveCategory("Todos"); setCarouselIdx(0); };

  const allFiltered = useMemo(() => products.filter(p => {
    if (activeGender && p.gender !== activeGender && p.gender !== "unisex") return false;
    if (activeCategory !== "Todos" && p.category !== activeCategory) return false;
    return true;
  }), [products, activeGender, activeCategory]);
  const carouselProducts = allFiltered.slice(0, CAROUSEL_LIMIT);

  const similarProducts = useMemo(() => {
    if (!modalProduct) return [];
    const others = products.filter(p => p.id !== modalProduct.id);
    const sameSub = modalProduct.subcategory ? others.filter(p => p.subcategory === modalProduct.subcategory) : [];
    const sameCat = others.filter(p => p.category === modalProduct.category && !sameSub.includes(p));
    const rest = others.filter(p => !sameSub.includes(p) && !sameCat.includes(p));
    return [...sameSub, ...sameCat, ...rest].slice(0, 4);
  }, [products, modalProduct]);
  const maxIdx      = Math.max(0, carouselProducts.length - CARDS_PER_VIEW);
  const prevSlide   = () => setCarouselIdx(i => Math.max(0, i - 1));
  const nextSlide   = () => setCarouselIdx(i => Math.min(maxIdx, i + 1));
  const carouselSwipe = useTouchSwipe(nextSlide, prevSlide);

  const allOfertas = useMemo(() => products.filter(p => p.comparePrice && p.comparePrice > p.price), [products]);
  const ofertasProducts = (allOfertas.length > 0 ? allOfertas : products).slice(0, 8);
  const ofertasHasMore = allOfertas.length > 8;
  const ofertasMaxIdx = Math.max(0, ofertasProducts.length - CARDS_PER_VIEW);
  const prevOferta = () => setOfertasIdx(i => Math.max(0, i - 1));
  const nextOferta = () => setOfertasIdx(i => Math.min(ofertasMaxIdx, i + 1));
  const ofertasSwipe = useTouchSwipe(nextOferta, prevOferta);

  const iStyle:React.CSSProperties = { display:"block", width:"100%", marginBottom:10, background:"#fff", border:`1px solid #d5c9be`, color:T, padding:"11px 14px", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };
  const onFI = (e:React.FocusEvent<HTMLInputElement|HTMLTextAreaElement>) => (e.target.style.borderColor=A);
  const onBI = (e:React.FocusEvent<HTMLInputElement|HTMLTextAreaElement>) => (e.target.style.borderColor="#d5c9be");

  return (
    <div style={{ fontFamily:"'Helvetica Neue', Arial, sans-serif", background:BG, color:T, minHeight:"100vh" }}>
      <style>{`
        @keyframes bt-wa-pulse { 0% { box-shadow:0 4px 20px rgba(37,211,102,0.4), 0 0 0 0 rgba(37,211,102,0.55); } 70% { box-shadow:0 4px 20px rgba(37,211,102,0.4), 0 0 0 14px rgba(37,211,102,0); } 100% { box-shadow:0 4px 20px rgba(37,211,102,0.4), 0 0 0 0 rgba(37,211,102,0); } }
        .bt-wa-fab { background:linear-gradient(135deg,#2be374,#1fae57); animation:bt-wa-pulse 2.4s ease-out infinite; }
        .bt-wa-fab:hover { animation-play-state:paused; }
        .bt-zoom-img { transition:transform 0.5s ease; }
        .bt-zoom:hover .bt-zoom-img { transform:scale(1.06); }
      `}</style>

      {/* ── ANNOUNCEMENT BAR ───────────────────────────────── */}
      {showAnnouncement && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top:0, left: isPreview ? undefined : 0, right: isPreview ? undefined : 0, zIndex: isPreview ? 10001 : 110, height:ANNOUNCEMENT_BAR_H, background:A, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:12, fontWeight:600, color:"#fff", letterSpacing:1 }}>
            <EditableZone field="announcementText" label="Barra de anuncios" noBadge>{announcementMessages[announcementIdx]}</EditableZone>
          </span>
          {/* Dots */}
          <div style={{ position:"absolute", bottom:5, left:"50%", transform:"translateX(-50%)", display:"flex", gap:5 }}>
            {announcementMessages.map((_, i) => (
              <button key={i} onClick={() => setAnnouncementIdx(i)}
                style={{ width: i === announcementIdx ? 16 : 6, height:4, border:"none", borderRadius:2, background: i === announcementIdx ? "#fff" : "rgba(255,255,255,0.35)", cursor:"pointer", padding:0, transition:"all 0.3s" }}/>
            ))}
          </div>
          {/* Close */}
          <button onClick={() => setAnnouncementVisible(false)}
            style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#fff", cursor:"pointer", fontSize:16, lineHeight:1, opacity:0.8 }}>×</button>
        </div>
      )}

      {/* TOAST */}
      {toastMsg && (
        <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", background:T, color:BG, padding:"10px 24px", fontSize:12, fontWeight:600, zIndex:999, whiteSpace:"nowrap", letterSpacing:1 }}>
          ✓ {toastMsg}
        </div>
      )}

      {/* ── SEARCH OVERLAY ─────────────────────────────────── */}
      {searchOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(250,247,242,0.96)", backdropFilter:"blur(8px)", display:"flex", flexDirection:"column", alignItems:"center", paddingTop:120 }}>
          <button onClick={() => setSearchOpen(false)} aria-label="Cerrar búsqueda"
            style={{ position:"absolute", top:24, right:32, background:"none", border:"none", color:T, fontSize:28, cursor:"pointer", lineHeight:1 }}>×</button>
          <div style={{ width:"100%", maxWidth:640, padding:"0 24px" }}>
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={"Buscar productos..."}
              style={{ width:"100%", background:"transparent", border:"none", borderBottom:`2px solid ${A}`, color:T, fontSize:24, padding:"12px 0", outline:"none", fontFamily:"'Helvetica Neue', Arial, sans-serif", boxSizing:"border-box" }}
            />
          </div>
          {searchResults.length > 0 && (
            <div style={{ width:"100%", maxWidth:640, padding:"24px 24px 0", overflowY:"auto", maxHeight:"calc(100vh - 260px)" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
                {searchResults.map(p => (
                  <button key={p.id} onClick={() => openModal(p)}
                    style={{ background:"none", border:`1px solid rgba(181,101,42,0.2)`, cursor:"pointer", textAlign:"left", padding:0, color:T }}>
                    <div style={{ position:"relative", width:"100%", aspectRatio:"3/4", background:S }}>
                      {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes="(max-width: 768px) 33vw, 200px" style={{ objectFit:"cover" }}/>}
                    </div>
                    <div style={{ padding:"10px 12px" }}>
                      <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:12, margin:"0 0 4px" }}>{p.name}</p>
                      <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                        <p style={{ fontSize:13, color:A, fontWeight:700, margin:0 }}>{ocultarPrecios ? "Consultá precio" : fmt(p.price)}</p>
                        {!ocultarPrecios && p.comparePrice && p.comparePrice > p.price && <p style={{ fontSize:11, color:MID, textDecoration:"line-through", margin:0 }}>{fmt(p.comparePrice)}</p>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {searchQuery.trim().length > 0 && searchResults.length === 0 && (
            <p style={{ color:MID, marginTop:32, fontSize:14 }}>Sin resultados para &ldquo;{searchQuery}&rdquo;</p>
          )}
        </div>
      )}

      {/* ── NAVBAR */}
      <nav style={{ position: isPreview ? "sticky" : "fixed", top:announcementBarHeight, left: isPreview ? undefined : 0, right: isPreview ? undefined : 0, zIndex: isPreview ? 10000 : 100, background: scrolled ? "rgba(250,247,242,0.96)" : BG, borderBottom:`1px solid rgba(44,34,24,0.07)`, backdropFilter: scrolled ? "blur(10px)" : "none", transition:"all 0.3s" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 20px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
            <button onClick={()=>scrollTo("inicio")} style={{ background:"none", border:"none", cursor:"pointer", fontFamily:"Georgia, serif", fontSize:20, fontStyle:"italic", color:T, letterSpacing:2, maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              <EditableZone field="storeName" label="Nombre de la tienda">{storeConfig?.storeName ?? "Terra"}</EditableZone>
            </button>
            <VerifiedIconButton isVerified={storeConfig?.isVerified} info={storeConfig?.verifiedInfo} />
          </div>
          {!isMobile && (
            <div style={{ display:"flex", gap:20, alignItems:"center" }}>
              {/* CATEGORÍAS dropdown */}
              <div style={{ position:"relative" }}
                onMouseEnter={() => setHoveredNavCat("__open__")}
                onMouseLeave={() => { setHoveredNavCat(null); setDesktopOpenCat(null); }}>
                <button style={{ background:"none", border:"none", fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", color:MID, display:"flex", alignItems:"center", gap:4 }}
                  onMouseEnter={e => (e.currentTarget.style.color = T)}
                  onMouseLeave={e => (e.currentTarget.style.color = MID)}>
                  Categorías <span style={{ fontSize:9, opacity:0.6 }}>▾</span>
                </button>
                {hoveredNavCat && (() => {
                  const activeCat = desktopOpenCat ?? "";
                  const activeSubs = subcategoriesFor[activeCat] || [];
                  return (
                    <>
                    <div style={{ position:"absolute", top:"100%", left:0, right:0, height:10, zIndex:499 }} />
                    <div style={{ position:"absolute", top:"calc(100% + 10px)", left:0, background:"#faf7f2", border:`1px solid rgba(44,34,24,0.12)`, borderRadius:18, zIndex:500, padding:16, boxShadow:"0 12px 40px rgba(44,34,24,0.12)", maxWidth:340 }}>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                        {categoryList.map(cat => {
                          const subs = subcategoriesFor[cat] || [];
                          const open = desktopOpenCat === cat;
                          return (
                            <button key={cat} onClick={() => {
                              if (subs.length > 0) { setDesktopOpenCat(open ? null : cat); }
                              else { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=boho-terra${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat)}`; setHoveredNavCat(null); }
                            }}
                              style={{ background: open ? T : "rgba(44,34,24,0.06)", border:`1px solid ${open ? T : "rgba(44,34,24,0.1)"}`, borderRadius:999, color: open ? "#faf7f2" : T, padding:"7px 16px", fontSize:10.5, cursor:"pointer", letterSpacing:1.5, textTransform:"uppercase", transition:"background 0.2s, color 0.2s, border-color 0.2s, transform 0.15s", transform:"scale(1)" }}
                              onMouseEnter={e => { if (!open) { e.currentTarget.style.background = "rgba(44,34,24,0.12)"; e.currentTarget.style.borderColor = "rgba(44,34,24,0.3)"; } e.currentTarget.style.transform = "scale(1.05)"; }}
                              onMouseLeave={e => { if (!open) { e.currentTarget.style.background = "rgba(44,34,24,0.06)"; e.currentTarget.style.borderColor = "rgba(44,34,24,0.1)"; } e.currentTarget.style.transform = "scale(1)"; }}>
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                      {desktopOpenCat && activeSubs.length > 0 && (
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:12, paddingTop:12, borderTop:"1px dashed rgba(44,34,24,0.15)" }}>
                          {activeSubs.map(sub => (
                            <button key={sub} onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=boho-terra${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(activeCat)}&subcategoria=${encodeURIComponent(sub)}`; setHoveredNavCat(null); setDesktopOpenCat(null); }}
                              style={{ background:"none", border:"1px solid rgba(44,34,24,0.2)", borderRadius:999, color:MID, padding:"5px 12px", fontSize:10, cursor:"pointer", letterSpacing:0.5, textTransform:"uppercase", transition:"background 0.15s, color 0.15s" }}
                              onMouseEnter={e => { e.currentTarget.style.background = "rgba(44,34,24,0.06)"; e.currentTarget.style.color = T; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = MID; }}>
                              {sub}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    </>
                  );
                })()}
              </div>
              <button onClick={() => { changeGender(activeGender==="mujer" ? null : "mujer"); scrollTo("coleccion"); }}
                style={{ background:"none", border:"none", fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", color: activeGender==="mujer" ? A : MID }}>Mujer</button>
              <button onClick={() => { changeGender(activeGender==="hombre" ? null : "hombre"); scrollTo("coleccion"); }}
                style={{ background:"none", border:"none", fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", color: activeGender==="hombre" ? A : MID }}>Hombre</button>
            </div>
          )}
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {!isMobile && <button onClick={()=>scrollTo("nosotros")} style={{ background:"none", border:"none", color:MID, fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer" }}><EditableZone field="navHistoriaLabel" label="Enlace Nuestra Historia">Nuestra Historia</EditableZone></button>}
            <button onClick={() => setSearchOpen(true)} aria-label="Buscar" style={{ background:"none", border:"none", color:T, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            {pushBell && storeConfig?.showPushBell && !isPreview && (
              <StoreFollowButton storeSlug={storeConfig?.slug ?? ""} color={T} size={18} />
            )}
            {pushBell && storeConfig?.showPushBell && !isPreview && (
              <button onClick={pushBell.openDrawer} style={{ position:"relative", background:"none", border:"none", color:T, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill={pushBell.followState === "following" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {pushBell.hasNew && <span style={{ position:"absolute", top:2, right:2, width:10, height:10, background:"#ef4444", borderRadius:"50%", border:"2px solid #faf7f2" }} />}
              </button>
            )}
            {isPreview && (
              <>
                {storeConfig?.showPushBell ? (
                  <button title="Los clientes pueden seguir tu tienda desde acá" style={{ position:"relative", padding:4, display:"flex", alignItems:"center", opacity:0.85, background:"none", border:"none", color:T, cursor:"default" }}>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                  </button>
                ) : (
                  <button onClick={storeConfig?.onPreviewBellClick} title="🔒 Solo Plan Plus — tocá para activar" style={{ position:"relative", padding:4, display:"flex", alignItems:"center", opacity:0.38, background:"none", border:"none", color:T, cursor:"pointer" }}>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                    <span style={{ position:"absolute", top:0, right:0, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
                  </button>
                )}
                {storeConfig?.showPushBell ? (
                  <button onClick={storeConfig.onPreviewBellClick} title="Campanita de novedades — clic para configurar" style={{ position:"relative", padding:4, display:"flex", alignItems:"center", opacity:0.85, background:"none", border:"none", color:T, cursor:"pointer" }}>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  </button>
                ) : (
                  <button onClick={storeConfig?.onPreviewBellClick} title="🔒 Solo Plan Plus — tocá para activar" style={{ position:"relative", padding:4, display:"flex", alignItems:"center", opacity:0.38, background:"none", border:"none", color:T, cursor:"pointer" }}>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    <span style={{ position:"absolute", top:0, right:0, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
                  </button>
                )}
              </>
            )}
            {!isMobile && (
              <button onClick={() => { setFavoritesOpen(true); setUserDropdownOpen(false); setCartOpen(false); }} aria-label="Favoritos" style={{ background:"none", border:"none", color:T, cursor:"pointer", position:"relative", padding:4, display:"flex", alignItems:"center" }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill={favorites.length > 0 ? A : "none"} stroke={favorites.length > 0 ? A : "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {favorites.length > 0 && <span style={{ position:"absolute", top:-5, right:-5, background:A, color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{favorites.length}</span>}
              </button>
            )}
            {/* User icon */}
            {!isMobile && (
              <div ref={userDropdownRef} style={{ position:"relative" }}>
                <button onClick={() => { setUserDropdownOpen(o => !o); setFavoritesOpen(false); }} style={{ background:"none", border:"none", color:T, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </button>
                {userDropdownOpen && (
                  <div style={{ position:"absolute", top:"calc(100% + 10px)", right:0, background:"#faf7f2", border:`1px solid rgba(44,34,24,0.12)`, borderRadius:10, minWidth:190, zIndex:200, boxShadow:"0 8px 28px rgba(44,34,24,0.12)", overflow:"hidden" }}>
                    {user ? (
                      <>
                        <p style={{ padding:"10px 16px 4px", fontSize:11, color:"rgba(44,34,24,0.45)", margin:0, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {user.name || user.email.split("@")[0]}
                        </p>
                        <a href={panelHref} onClick={() => setUserDropdownOpen(false)}
                          style={{ display:"block", padding:"10px 16px", fontSize:13, color:T, textDecoration:"none", borderBottom:`1px solid rgba(44,34,24,0.06)` }}
                          onMouseEnter={e => (e.currentTarget.style.background="rgba(44,34,24,0.04)")}
                          onMouseLeave={e => (e.currentTarget.style.background="transparent")}>{panelLabel}</a>
                        <button onClick={() => { if (isPreview) return; setUserDropdownOpen(false); signOut("/"); }}
                          style={{ display:"block", width:"100%", padding:"10px 16px", fontSize:13, color:"#dc2626", background:"none", border:"none", textAlign:"left", cursor: isPreview ? "default" : "pointer", opacity: isPreview ? 0.45 : 1 }}
                          onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background="rgba(220,38,38,0.06)"; }}
                          onMouseLeave={e => (e.currentTarget.style.background="transparent")}>Cerrar sesión</button>
                      </>
                    ) : (
                      <>
                        <a href={isPreview ? undefined : `/login?redirect=/tienda/${storeConfig?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)}
                          style={{ display:"block", padding:"12px 16px", fontSize:13, color:T, textDecoration:"none", borderBottom:`1px solid rgba(44,34,24,0.06)`, cursor: isPreview ? "default" : "pointer" }}
                          onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background="rgba(44,34,24,0.04)"; }}
                          onMouseLeave={e => (e.currentTarget.style.background="transparent")}>Iniciar sesión</a>
                        <a href={isPreview ? undefined : `/registro?plan=buyer&redirect=/tienda/${storeConfig?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)}
                          style={{ display:"block", padding:"12px 16px", fontSize:13, color:T, textDecoration:"none", cursor: isPreview ? "default" : "pointer" }}
                          onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background="rgba(44,34,24,0.04)"; }}
                          onMouseLeave={e => (e.currentTarget.style.background="transparent")}>Registrarse</a>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            {isMobile && (
              <button onClick={() => { setMobileMenuOpen(o => !o); setMobileCatsOpen(false); setMobileOpenCat(null); }} style={{ background:"none", border:"none", color:T, cursor:"pointer", padding:4, display:"flex", alignItems:"center", flexDirection:"column", gap:4 }}>
                <span style={{ display:"block", width:22, height:2, background:T, transition:"all 0.3s", transform: mobileMenuOpen ? "rotate(45deg) translate(4px, 4px)" : "none" }}/>
                <span style={{ display:"block", width:22, height:2, background:T, transition:"all 0.3s", opacity: mobileMenuOpen ? 0 : 1 }}/>
                <span style={{ display:"block", width:22, height:2, background:T, transition:"all 0.3s", transform: mobileMenuOpen ? "rotate(-45deg) translate(4px, -4px)" : "none" }}/>
              </button>
            )}
          </div>
        </div>
      </nav>
      {/* ── MOBILE MENU */}
      {isMobile && mobileMenuOpen && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top: isPreview ? 0 : 60 + announcementBarHeight, left:0, right:0, bottom:0, background:BG, zIndex:99, overflowY:"auto", overscrollBehavior:"contain", paddingTop:8 }}>
          {/* Categorías — acordeón colapsable */}
          {categoryList.length > 0 && (
            <>
              <button onClick={() => setMobileCatsOpen(o => !o)}
                style={{ display:"flex", width:"100%", background:"none", border:"none", borderBottom:`1px solid rgba(44,34,24,0.06)`, color:T, padding:"16px 24px", fontSize:13, textAlign:"left", cursor:"pointer", letterSpacing:2, textTransform:"uppercase", alignItems:"center", justifyContent:"space-between" }}>
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
                        window.location.href = `/tienda/${storeConfig?.slug}/productos?t=boho-terra${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat)}`;
                        setMobileMenuOpen(false); setMobileCatsOpen(false);
                      }
                    }} style={{ display:"flex", width:"100%", background:"rgba(44,34,24,0.03)", border:"none", borderBottom:`1px solid rgba(44,34,24,0.04)`, color: activeCategory===cat ? A : T, padding:"13px 24px 13px 40px", fontSize:12, textAlign:"left", cursor:"pointer", letterSpacing:2, textTransform:"uppercase", alignItems:"center", justifyContent:"space-between" }}>
                      {cat}
                      {subs.length > 0 && <span style={{ fontSize:12, opacity:0.5, transition:"transform 0.2s", transform: mobileOpenCat===cat ? "rotate(90deg)" : "none", display:"inline-block" }}>›</span>}
                    </button>
                    {subs.length > 0 && mobileOpenCat === cat && subs.map(sub => (
                      <button key={sub} onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=boho-terra${isPreview ? "&from=editor" : ""}&categoria=${encodeURIComponent(cat)}&subcategoria=${encodeURIComponent(sub)}`; setMobileMenuOpen(false); setMobileCatsOpen(false); setMobileOpenCat(null); }}
                        style={{ display:"block", width:"100%", background:"rgba(44,34,24,0.05)", border:"none", borderBottom:`1px solid rgba(44,34,24,0.03)`, color:MID, padding:"11px 24px 11px 60px", fontSize:11, textAlign:"left", cursor:"pointer", letterSpacing:2, textTransform:"uppercase" }}>
                        {sub}
                      </button>
                    ))}
                  </Fragment>
                );
              })}
            </>
          )}
          {[["Mujer","mujer"],["Hombre","hombre"]].map(([label, g]) => (
            <button key={g} onClick={() => { changeGender(activeGender===g ? null : g); scrollTo("coleccion"); setMobileMenuOpen(false); }}
              style={{ display:"block", width:"100%", background:"none", border:"none", borderBottom:`1px solid rgba(44,34,24,0.06)`, color: activeGender===g ? A : T, padding:"16px 24px", fontSize:13, textAlign:"left", cursor:"pointer", letterSpacing:2, textTransform:"uppercase" }}>
              {label}
            </button>
          ))}
          <button onClick={() => { scrollTo("nosotros"); setMobileMenuOpen(false); }}
            style={{ display:"block", width:"100%", background:"none", border:"none", borderBottom:`1px solid rgba(44,34,24,0.06)`, color:MID, padding:"16px 24px", fontSize:13, textAlign:"left", cursor:"pointer", letterSpacing:2, textTransform:"uppercase" }}>
            Nuestra Historia
          </button>
          <button onClick={() => { setFavoritesOpen(true); setMobileMenuOpen(false); setUserDropdownOpen(false); setCartOpen(false); }}
            style={{ display:"block", width:"100%", background:"none", border:"none", borderBottom:`1px solid rgba(44,34,24,0.06)`, color:MID, padding:"16px 24px", fontSize:13, textAlign:"left", cursor:"pointer", letterSpacing:2, textTransform:"uppercase" }}>
            Favoritos {favorites.length > 0 && `(${favorites.length})`}
          </button>
          {/* Cuenta — mismo contenido que el dropdown de escritorio, adaptado a lista */}
          {user ? (
            <>
              <a href={panelHref} onClick={() => setMobileMenuOpen(false)}
                style={{ display:"block", width:"100%", background:"none", border:"none", color:T, padding:"16px 24px", fontSize:13, textAlign:"left", letterSpacing:2, textTransform:"uppercase", textDecoration:"none" }}>
                {panelLabel}
              </a>
              <button onClick={() => { if (isPreview) return; setMobileMenuOpen(false); signOut("/"); }}
                style={{ display:"block", width:"100%", background:"none", border:"none", color:"#dc2626", padding:"16px 24px", fontSize:13, textAlign:"left", cursor: isPreview ? "default" : "pointer", letterSpacing:2, textTransform:"uppercase", opacity: isPreview ? 0.45 : 1 }}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <a href={isPreview ? undefined : `/login?redirect=/tienda/${storeConfig?.slug}`} onClick={() => !isPreview && setMobileMenuOpen(false)}
                style={{ display:"block", width:"100%", background:"none", border:"none", color:T, padding:"16px 24px", fontSize:13, textAlign:"left", letterSpacing:2, textTransform:"uppercase", textDecoration:"none", cursor: isPreview ? "default" : "pointer" }}>
                Iniciar sesión
              </a>
              <a href={isPreview ? undefined : `/registro?plan=buyer&redirect=/tienda/${storeConfig?.slug}`} onClick={() => !isPreview && setMobileMenuOpen(false)}
                style={{ display:"block", width:"100%", background:"none", border:"none", color:T, padding:"16px 24px", fontSize:13, textAlign:"left", letterSpacing:2, textTransform:"uppercase", textDecoration:"none", cursor: isPreview ? "default" : "pointer" }}>
                Registrarse
              </a>
            </>
          )}
        </div>
      )}

      {/* ── HERO — fondo crema con tipografía grande + foto al costado */}
      <section id="inicio" style={{ paddingTop: isPreview ? 0 : 60 + announcementBarHeight, minHeight: isMobile ? "auto" : "100vh", display:"flex", alignItems:"stretch", flexDirection: isMobile ? "column" : "row" }}>
        <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent: isMobile ? "flex-start" : "center", padding: isMobile ? "40px 20px 48px" : "80px 80px 80px 80px", maxWidth: isMobile ? "100%" : 600, background:heroLeftBg, position:"relative" }}>
          <EditableSectionBg field="bgHeroLeft" label="Fondo hero" />
          <p style={{ fontSize:11, letterSpacing:5, color:A, textTransform:"uppercase", marginBottom:24 }}>
            <EditableZone field="storeTagline" label="Tagline">{storeConfig?.storeTagline ?? "Nueva temporada · 2025"}</EditableZone>
          </p>
          <h1 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(52px,6vw,90px)", fontWeight:400, lineHeight:1, margin:"0 0 32px", color:heroLeftText, fontStyle:"italic" }}>
            <EditableZone field="heroHeading" label="Título principal">Lo natural siempre vuelve.</EditableZone>
          </h1>
          <p style={{ fontSize:15, color:heroLeftMid, lineHeight:1.8, marginBottom:48, maxWidth:380 }}>
            <EditableZone field="heroSubtext" label="Subtítulo hero">Ropa hecha con fibras naturales y tinturas vegetales. Artesanal, local, consciente.</EditableZone>
          </p>
          {(editMode || !storeConfig?.textOverrides?.["heroCta"]?.hidden) && (
            <button onClick={()=>scrollTo("coleccion")} style={{ alignSelf:"flex-start", background:"none", color:heroLeftText, border:`1.5px solid ${heroLeftText}`, padding:"14px 40px", fontSize:11, letterSpacing:4, textTransform:"uppercase", cursor:"pointer", transition:"all 0.25s" }}
              onMouseEnter={e=>{ e.currentTarget.style.background=heroLeftText; e.currentTarget.style.color=heroLeftBg; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="none"; e.currentTarget.style.color=heroLeftText; }}>
              <EditableZone field="heroCta" label="Botón principal">Ver Colección</EditableZone>
            </button>
          )}
        </div>
        {/* fotos apiladas */}
        <div style={{ flex:1, display: isMobile ? "none" : "grid", gridTemplateRows:"1fr 1fr", gridTemplateColumns:"1fr 1fr", gap:4, padding:4 }}>
          <div style={{ overflow:"hidden", gridRow:"1/3", position:"relative" }}>
            <FadeImage src={heroImage1Ov?.url ?? "https://picsum.photos/seed/terra-h1/600/900"} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" style={{ objectFit:"cover", objectPosition:`${heroImage1Ov?.posX ?? 50}% ${heroImage1Ov?.posY ?? 50}%` }}/>
            {heroImage1Ov?.overlayType && heroImage1Ov.overlayType !== "none" && (
              <div style={{ position:"absolute", inset:0, pointerEvents:"none", background: heroImage1Ov.overlayType === "light" ? `rgba(255,255,255,${heroImage1Ov.overlayOpacity ?? 0.45})` : `rgba(44,34,24,${heroImage1Ov.overlayOpacity ?? 0.45})` }} />
            )}
            <BgDragHandle imgKey="heroImage1" />
            <EditableImageButton field="heroImage1" label="Imagen hero izquierda" />
          </div>
          <div style={{ overflow:"hidden", position:"relative" }}>
            <FadeImage src={heroImage2Ov?.url ?? "https://picsum.photos/seed/terra-h2/600/500"} alt="" fill sizes="25vw" style={{ objectFit:"cover", objectPosition:`${heroImage2Ov?.posX ?? 50}% ${heroImage2Ov?.posY ?? 50}%` }}/>
            {heroImage2Ov?.overlayType && heroImage2Ov.overlayType !== "none" && (
              <div style={{ position:"absolute", inset:0, pointerEvents:"none", background: heroImage2Ov.overlayType === "light" ? `rgba(255,255,255,${heroImage2Ov.overlayOpacity ?? 0.45})` : `rgba(44,34,24,${heroImage2Ov.overlayOpacity ?? 0.45})` }} />
            )}
            <BgDragHandle imgKey="heroImage2" />
            <EditableImageButton field="heroImage2" label="Imagen hero superior" />
          </div>
          <div style={{ overflow:"hidden", position:"relative" }}>
            <FadeImage src={heroImage3Ov?.url ?? "https://picsum.photos/seed/terra-h3/600/500"} alt="" fill sizes="25vw" style={{ objectFit:"cover", objectPosition:`${heroImage3Ov?.posX ?? 50}% ${heroImage3Ov?.posY ?? 50}%` }}/>
            {heroImage3Ov?.overlayType && heroImage3Ov.overlayType !== "none" && (
              <div style={{ position:"absolute", inset:0, pointerEvents:"none", background: heroImage3Ov.overlayType === "light" ? `rgba(255,255,255,${heroImage3Ov.overlayOpacity ?? 0.45})` : `rgba(44,34,24,${heroImage3Ov.overlayOpacity ?? 0.45})` }} />
            )}
            <BgDragHandle imgKey="heroImage3" />
            <EditableImageButton field="heroImage3" label="Imagen hero inferior" />
          </div>
        </div>
      </section>

      <div style={{ display:"flex", flexDirection:"column" }}>
      {/* ── MAYORISTA — banner "Solicitá tu lista de precios" ── */}
      <SectionBlock id="bt-mayorista" label="Mayorista" isPreview={isPreview} defaultOrder={BT_SECTION_IDS}>
      {isWholesale && (
        <section data-reveal style={{ background:S, borderTop:`1px solid rgba(181,101,42,0.2)`, borderBottom:`1px solid rgba(181,101,42,0.2)` }}>
          <div style={{ maxWidth:1280, margin:"0 auto", padding:"60px 40px", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", gap:20 }}>
            <span style={{ fontSize:10, letterSpacing:4, color:A, textTransform:"uppercase", fontWeight:700, border:`1px solid ${A}`, padding:"4px 12px", borderRadius:20 }}>Tienda mayorista</span>
            <h2 style={{ fontSize:"clamp(26px,3.5vw,44px)", fontWeight:400, color:T, margin:0, fontFamily:"Georgia, 'Times New Roman', serif", lineHeight:1.25, fontStyle:"italic" }}>
              Solicitá tu lista de <strong style={{ fontStyle:"normal", color:A }}>precios</strong>
            </h2>
            <p style={{ fontSize:14, color:MID, maxWidth:480, margin:0, lineHeight:1.7 }}>
              Precios exclusivos para revendedores y distribuidores. Completá el formulario de contacto y te respondemos con tu lista personalizada en menos de 24 hs.
            </p>
            <button onClick={() => scrollTo("contacto")}
              style={{ background:A, color:"#fff", border:"none", padding:"13px 36px", fontSize:12, fontWeight:700, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", borderRadius:30, marginTop:4 }}>
              Consultar ahora
            </button>
          </div>
        </section>
      )}
      </SectionBlock>

      {/* ── BANNER HORIZONTAL ──────────────────────────────── */}
      <SectionBlock id="bt-banner" label="Banner horizontal" isPreview={isPreview} defaultOrder={BT_SECTION_IDS}>
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
          accent={A}
          bg={BG}
        />
      </SectionBlock>

      <SectionBlock id="bt-coleccion" label="Colección" isPreview={isPreview} defaultOrder={BT_SECTION_IDS}>
      {/* ── COLECCIÓN — carrusel */}
      <section id="coleccion" data-reveal style={{ padding:"80px 0", background:coleccionBg, position:"relative" }}>
        <EditableSectionBg field="bgColeccion" label="Fondo colección" />
        {/* encabezado */}
        <div style={{ maxWidth:1280, margin:"0 auto", padding: isMobile ? "0 16px" : "0 40px", marginBottom:40, borderBottom:`1px solid rgba(44,34,24,0.1)`, paddingBottom:24 }}>
          <h2 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(22px,2.5vw,32px)", fontWeight:400, fontStyle:"italic", margin:0, color:coleccionText }}>
            {activeGender==="mujer" ? "Mujer" : activeGender==="hombre" ? "Hombre" : activeCategory==="Todos" ? "Toda la colección" : activeCategory}
          </h2>
          <p style={{ fontSize:12, color:coleccionMid, margin:"6px 0 0" }}>{allFiltered.length} piezas</p>
        </div>

        {/* carrusel — overflow visible para que se vean las tarjetas */}
        <div style={{ position:"relative" }} {...carouselSwipe}>
          {/* área deslizante */}
          <div ref={carouselRef} style={{ overflow:"hidden", padding: isMobile ? "0 16px" : "0 40px" }}>
            <div style={{ display:"flex", gap:20, transition:"transform 0.45s cubic-bezier(.4,0,.2,1)", transform: isMobile ? `translateX(calc(-${carouselIdx} * (85% + 20px)))` : `translateX(calc(-${carouselIdx} * (100% / ${CARDS_PER_VIEW} + 20px / ${CARDS_PER_VIEW})))` }}>
              {carouselProducts.map(product=>(
                <div key={product.id}
                  style={{ flexShrink:0, width: isMobile ? "85%" : `calc((100% - ${(CARDS_PER_VIEW-1)*20}px) / ${CARDS_PER_VIEW})`, cursor:"pointer", position:"relative" }}
                  onClick={()=>openModal(product)}>
                  {/* foto */}
                  <div style={{ position:"relative", aspectRatio:"3/4", overflow:"hidden", background:S, marginBottom:16 }}
                    onMouseEnter={e=>{ const img = e.currentTarget.querySelector("img") as HTMLImageElement; if(img) img.style.transform="scale(1.05)"; }}
                    onMouseLeave={e=>{ const img = e.currentTarget.querySelector("img") as HTMLImageElement; if(img) img.style.transform="scale(1)"; }}>
                    {product.images[0] && <FadeImage src={product.images[0]} alt={product.name} fill sizes={isMobile ? "85vw" : "30vw"} style={{ objectFit:"cover", transition:"transform 0.55s ease" }}/>}
                    {discountPercent(product.price, product.comparePrice) !== null && (
                      <div style={{ position:"absolute", top:14, left:14, background:A, color:"#fff", fontSize:9, fontWeight:600, letterSpacing:2, padding:"4px 10px", textTransform:"uppercase" }}>Oferta -{discountPercent(product.price, product.comparePrice)}%</div>
                    )}
                    <div style={{ position:"absolute", bottom:14, left:0, right:0, textAlign:"center" }}>
                      <span style={{ background:"rgba(250,247,242,0.92)", color:T, fontSize:10, letterSpacing:2, textTransform:"uppercase", padding:"7px 18px" }}>Ver pieza</span>
                    </div>
                    {/* Favorite button */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleFavorite(product.id); }}
                      style={{ position:"absolute", top:14, right:14, background:"rgba(250,247,242,0.85)", border:"none", borderRadius:"50%", width:30, height:30, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"transform 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.transform="scale(1.1)")}
                      onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill={favorites.includes(product.id) ? A : "none"} stroke={favorites.includes(product.id) ? A : T} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    </button>
                  </div>
                  {/* info */}
                  <p style={{ fontSize:10, color:A, letterSpacing:3, textTransform:"uppercase", margin:"0 0 5px" }}>{product.category}</p>
                  <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:17, color:coleccionText, margin:"0 0 8px", lineHeight:1.3 }}>{product.name}</p>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <span style={{ fontSize:16, fontWeight:700, color:coleccionText }}>{ocultarPrecios ? "Consultá precio" : fmt(product.price)}</span>
                    {!ocultarPrecios && product.comparePrice && <span style={{ fontSize:13, color:coleccionMid, textDecoration:"line-through" }}>{fmt(product.comparePrice)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* flechas */}
          {carouselIdx > 0 && (
            <button onClick={prevSlide} style={{ position:"absolute", left:0, top:"38%", transform:"translateY(-50%)", background:BG, border:`1px solid rgba(44,34,24,0.18)`, width:44, height:44, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", zIndex:10 }}
              onMouseEnter={e=>{ e.currentTarget.style.background=T; (e.currentTarget.querySelector("svg") as SVGElement).style.stroke=BG; }}
              onMouseLeave={e=>{ e.currentTarget.style.background=BG; (e.currentTarget.querySelector("svg") as SVGElement).style.stroke=T; }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={T} strokeWidth={1.8} strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          )}
          {carouselIdx < maxIdx && (
            <button onClick={nextSlide} style={{ position:"absolute", right:0, top:"38%", transform:"translateY(-50%)", background:BG, border:`1px solid rgba(44,34,24,0.18)`, width:44, height:44, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", zIndex:10 }}
              onMouseEnter={e=>{ e.currentTarget.style.background=T; (e.currentTarget.querySelector("svg") as SVGElement).style.stroke=BG; }}
              onMouseLeave={e=>{ e.currentTarget.style.background=BG; (e.currentTarget.querySelector("svg") as SVGElement).style.stroke=T; }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={T} strokeWidth={1.8} strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          )}
        </div>

        {/* puntos indicadores */}
        {maxIdx > 0 && (
          <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:32 }}>
            {Array.from({ length: maxIdx + 1 }).map((_, i) => (
              <button key={i} onClick={()=>setCarouselIdx(i)}
                style={{ width: i===carouselIdx ? 28 : 8, height:8, border:"none", borderRadius:4, background: i===carouselIdx ? A : "rgba(44,34,24,0.2)", cursor:"pointer", padding:0, transition:"all 0.3s" }}/>
            ))}
          </div>
        )}

        {/* Ver colección completa */}
        <div style={{ textAlign:"center", marginTop:48 }}>
          <a href={`/tienda/${storeConfig?.slug}/productos?t=boho-terra${isPreview ? "&from=editor" : ""}`}
            style={{ display:"inline-block", border:`1px solid ${coleccionText}`, color:coleccionText, background:"transparent", padding:"14px 40px", fontSize:11, letterSpacing:3, textTransform:"uppercase", textDecoration:"none", transition:"all 0.2s", fontFamily:"Georgia, serif", fontStyle:"italic" }}
            onMouseEnter={e=>{ e.currentTarget.style.background=coleccionText; e.currentTarget.style.color=coleccionBg; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=coleccionText; }}>
            Ver colección completa
          </a>
        </div>
      </section>
      </SectionBlock>

      {/* ── OFERTAS ────────────────────────────────────────── */}
      <SectionBlock id="bt-ofertas" label="Ofertas" isPreview={isPreview} defaultOrder={BT_SECTION_IDS}>
        {(allOfertas.length > 0 || isPreview) && (
          <section data-reveal style={{ padding:"80px 0", background:ofertasBg, position:"relative" }}>
            <EditableSectionBg field="bgOfertas" label="Fondo ofertas" />
            <div style={{ maxWidth:1280, margin:"0 auto", padding: isMobile ? "0 16px" : "0 40px", marginBottom:40, borderBottom:`1px solid rgba(44,34,24,0.1)`, paddingBottom:24 }}>
              <p style={{ fontSize:10, letterSpacing:5, color:A, textTransform:"uppercase", margin:"0 0 8px", fontFamily:"Georgia, serif", fontStyle:"italic" }}><EditableZone field="ofertasKicker" label="Texto sobre Ofertas">Aprovechá</EditableZone></p>
              <h2 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(22px,2.5vw,32px)", fontWeight:400, fontStyle:"italic", margin:0, color:ofertasText }}><EditableZone field="ofertasTitle" label="Título Ofertas">Ofertas</EditableZone></h2>
            </div>
            <div style={{ position:"relative" }} {...ofertasSwipe}>
              <div style={{ overflow:"hidden", padding: ofertasMaxIdx > 0 ? (isMobile ? "0 60px" : "0 64px") : (isMobile ? "0 16px" : "0 40px") }}>
                <div style={{ display:"flex", gap:20, transition:"transform 0.45s cubic-bezier(.4,0,.2,1)", transform: isMobile ? `translateX(calc(-${ofertasIdx} * (85% + 20px)))` : `translateX(calc(-${ofertasIdx} * (100% / ${CARDS_PER_VIEW} + 20px / ${CARDS_PER_VIEW})))` }}>
                  {ofertasProducts.map(p => {
                    const pct = p.comparePrice && p.comparePrice > p.price ? Math.round((1 - p.price / p.comparePrice) * 100) : null;
                    return (
                      <div key={p.id} onClick={() => openModal(p)} className="bt-zoom"
                        style={{ flexShrink:0, width: isMobile ? "85%" : `calc((100% - ${(CARDS_PER_VIEW-1)*20}px) / ${CARDS_PER_VIEW})`, cursor:"pointer", position:"relative" }}>
                        <div style={{ position:"relative", aspectRatio:"3/4", overflow:"hidden", background:BG, marginBottom:16 }}>
                          {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes={isMobile ? "85vw" : "30vw"} className="bt-zoom-img" style={{ objectFit:"cover" }} />}
                          {pct && <div style={{ position:"absolute", top:14, left:14, background:A, color:"#fff", fontSize:9, fontWeight:600, letterSpacing:2, padding:"4px 10px", textTransform:"uppercase" }}>Oferta -{pct}%</div>}
                        </div>
                        <p style={{ fontSize:10, color:A, letterSpacing:3, textTransform:"uppercase", margin:"0 0 5px" }}>{p.category}</p>
                        <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:17, color:ofertasText, margin:"0 0 8px", lineHeight:1.3 }}>{p.name}</p>
                        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                          <span style={{ fontSize:16, fontWeight:700, color:ofertasText }}>{ocultarPrecios ? "Consultá precio" : fmt(p.price)}</span>
                          {p.comparePrice && p.comparePrice > p.price && <span style={{ fontSize:13, color:ofertasMid, textDecoration:"line-through" }}>{fmt(p.comparePrice)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {ofertasIdx > 0 && (
                <button onClick={prevOferta} style={{ position:"absolute", left:0, top:"38%", transform:"translateY(-50%)", background:BG, border:`1px solid rgba(44,34,24,0.18)`, width:44, height:44, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10 }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={T} strokeWidth={1.8} strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
              )}
              {ofertasIdx < ofertasMaxIdx && (
                <button onClick={nextOferta} style={{ position:"absolute", right:0, top:"38%", transform:"translateY(-50%)", background:BG, border:`1px solid rgba(44,34,24,0.18)`, width:44, height:44, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10 }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={T} strokeWidth={1.8} strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              )}
            </div>
            {ofertasHasMore && (
              <div style={{ textAlign:"center", marginTop:32 }}>
                <button onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=boho-terra${isPreview ? "&from=editor" : ""}&oferta=true`; }}
                  style={{ display:"inline-block", border:`1px solid ${ofertasText}`, color:ofertasText, background:"transparent", padding:"14px 40px", fontSize:11, letterSpacing:3, textTransform:"uppercase", fontFamily:"Georgia, serif", fontStyle:"italic", cursor:"pointer" }}><EditableZone field="ofertasCta" label="Botón ver todas las ofertas">Ver todas las ofertas</EditableZone></button>
              </div>
            )}
          </section>
        )}
      </SectionBlock>

      {/* ── LO MÁS VISTO ───────────────────────────────────── */}
      <SectionBlock id="bt-masvisto" label="Lo más visto" isPreview={isPreview} defaultOrder={BT_SECTION_IDS}>
        {(() => {
          const featured = products.filter(p => p.featured);
          const base = featured.length > 0 ? featured : products;
          const pool = [...base].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
          const displayList = pool.slice(0, 8);
          const hasMore = pool.length > 8;
          if (displayList.length === 0) return null;
          return (
            <section data-reveal style={{ position:"relative", background:masVistoBg, padding: isMobile ? "48px 16px" : "80px 32px", borderTop:`1px solid rgba(44,34,24,0.08)` }}>
              <EditableSectionBg field="bgMasVisto" label="Fondo lo más visto" />
              <div style={{ maxWidth:1280, margin:"0 auto" }}>
                <div style={{ marginBottom:40 }}>
                  <p style={{ fontSize:10, letterSpacing:5, color:A, textTransform:"uppercase", margin:"0 0 8px", fontFamily:"Georgia, serif", fontStyle:"italic" }}><EditableZone field="masVistoKicker" label="Texto sobre Lo más visto">Tendencia</EditableZone></p>
                  <h2 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(22px,2.5vw,32px)", fontWeight:400, fontStyle:"italic", margin:0, color:masVistoText }}><EditableZone field="masVistoTitle" label="Título Lo más visto">Lo más visto</EditableZone></h2>
                </div>
                <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap:16 }}>
                  {displayList.map((p, idx) => (
                    <div key={p.id} onClick={() => openModal(p)} className="bt-zoom" style={{ cursor:"pointer" }}>
                      <div style={{ position:"relative", width:"100%", aspectRatio:"3/4", background:"#ede8e0", overflow:"hidden" }}>
                        {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="bt-zoom-img" style={{ objectFit:"cover" }} />}
                        <span style={{ position:"absolute", top:10, left:10, background:"rgba(44,34,24,0.75)", color:A, fontSize:10, fontWeight:700, padding:"4px 10px" }}>#{idx + 1}</span>
                      </div>
                      <div style={{ padding:"10px 0 0" }}>
                        <p style={{ margin:"0 0 4px", fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:14, color:masVistoText }}>{p.name}</p>
                        <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                          <span style={{ fontSize:14, fontWeight:700, color:masVistoText }}>{ocultarPrecios ? "Consultá" : fmt(p.price)}</span>
                          {!ocultarPrecios && p.comparePrice && p.comparePrice > p.price && <span style={{ fontSize:11, color:masVistoText, opacity:0.45, textDecoration:"line-through" }}>{fmt(p.comparePrice)}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <div style={{ textAlign:"center", marginTop:32 }}>
                    <button onClick={() => { window.location.href = `/tienda/${storeConfig?.slug}/productos?t=boho-terra${isPreview ? "&from=editor" : ""}${featured.length > 0 ? "&destacado=true" : ""}`; }}
                      style={{ display:"inline-block", border:`1px solid ${masVistoText}`, color:masVistoText, background:"transparent", padding:"14px 40px", fontSize:11, letterSpacing:3, textTransform:"uppercase", fontFamily:"Georgia, serif", fontStyle:"italic", cursor:"pointer" }}><EditableZone field="masVistoCta" label="Botón ver más">Ver más</EditableZone></button>
                  </div>
                )}
              </div>
            </section>
          );
        })()}
      </SectionBlock>

      <SectionBlock id="bt-prueba-social" label="Prueba social" isPreview={isPreview} defaultOrder={BT_SECTION_IDS}>
        {(() => {
          const PREVIEW_REVIEWS: HomeReview[] = [
            { id:"p1", rating:5, comment:"Calidad increíble y llegó rapidísimo. Ya compré tres veces y siempre perfecta.", reviewer:"María L.", verified:true, verifiedBy:"auto", createdAt:"", product:{ name:"Vestido lino", image:null } },
            { id:"p2", rating:5, comment:"El diseño es exactamente como en las fotos. Me enamoré cuando lo vi puesto.", reviewer:"Sofía M.", verified:false, verifiedBy:null, createdAt:"", product:{ name:"Blazer oversize", image:null } },
            { id:"p3", rating:5, comment:"Excelente atención y envío super rápido. La recomiendo sin dudarlo.", reviewer:"Valentina R.", verified:true, verifiedBy:"owner", createdAt:"", product:{ name:"Bolso tejido", image:null } },
          ];
          const allReviews = isPreview ? PREVIEW_REVIEWS : homeReviews;
          if (allReviews.length === 0) return null;
          const idx = Math.min(reviewCarouselPage, allReviews.length - 1);
          const r = allReviews[idx];
          async function deleteHomeReview(reviewId: string) {
            if (!storeConfig?.slug) return;
            await fetch(`/api/public/${storeConfig.slug}/reviews`, {
              method:"DELETE", headers:{"Content-Type":"application/json"},
              body: JSON.stringify({ reviewId }),
            });
            setHomeReviews(prev => prev.filter(x => x.id !== reviewId));
            setReviewCarouselPage(0);
          }
          return (
            <section data-reveal style={{ position:"relative", background: sc["bgPruebaSocial"] ?? BG, padding: isMobile ? "64px 24px" : "96px 40px", borderTop:`1px solid rgba(44,34,24,0.08)`, textAlign:"center" }}>
              <EditableSectionBg field="bgPruebaSocial" label="Fondo prueba social" />
              <div style={{ maxWidth:720, margin:"0 auto" }}>
                <p style={{ fontFamily:"Georgia, serif", fontSize:isMobile ? 52 : 72, color:A, lineHeight:0.6, margin:"0 0 16px", opacity:0.35 }}>&ldquo;</p>
                <div style={{ display:"flex", justifyContent:"center", gap:4, marginBottom:20 }}>
                  {[1,2,3,4,5].map(s => <span key={s} style={{ color: s <= r.rating ? A : "rgba(44,34,24,0.12)", fontSize:14 }}>★</span>)}
                </div>
                <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize: isMobile ? 17 : 20, color:T, lineHeight:1.85, margin:"0 0 28px" }}>{r.comment}</p>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  {r.product?.image && (
                    <img src={r.product.image} alt={r.product?.name ?? ""} style={{ width:44, height:44, objectFit:"cover", borderRadius:6, border:`1px solid rgba(44,34,24,0.12)` }} />
                  )}
                  <p style={{ fontSize:12, fontWeight:600, color:T, margin:0, letterSpacing:2, textTransform:"uppercase" }}>{r.reviewer}</p>
                  {r.product?.name && <p style={{ fontSize:11, color:MID, margin:0 }}>{r.product.name}</p>}
                  {r.verified && (
                    <p style={{ fontSize:10, fontWeight:600, color:"#16a34a", margin:"4px 0 0", letterSpacing:0.5 }}>✓ Compra verificada</p>
                  )}
                </div>
                {allReviews.length > 1 && (
                  <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:10, marginTop:36 }}>
                    <button onClick={() => setReviewCarouselPage(p => Math.max(0, p - 1))} disabled={idx === 0}
                      style={{ background:"none", border:`1px solid rgba(44,34,24,0.2)`, color:T, width:32, height:32, borderRadius:"50%", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.25 : 1, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
                    <div style={{ display:"flex", gap:6 }}>
                      {allReviews.map((_,i) => (
                        <button key={i} onClick={() => setReviewCarouselPage(i)}
                          style={{ width: i === idx ? 18 : 6, height:6, borderRadius:3, background: i === idx ? A : "rgba(44,34,24,0.15)", border:"none", cursor:"pointer", padding:0, transition:"all 0.25s" }} />
                      ))}
                    </div>
                    <button onClick={() => setReviewCarouselPage(p => Math.min(allReviews.length - 1, p + 1))} disabled={idx === allReviews.length - 1}
                      style={{ background:"none", border:`1px solid rgba(44,34,24,0.2)`, color:T, width:32, height:32, borderRadius:"50%", cursor: idx === allReviews.length - 1 ? "default" : "pointer", opacity: idx === allReviews.length - 1 ? 0.25 : 1, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
                  </div>
                )}
                {isOwner && !isPreview && (
                  <button onClick={() => deleteHomeReview(r.id)}
                    style={{ marginTop:16, background:"none", border:"none", color:"rgba(44,34,24,0.25)", cursor:"pointer", fontSize:11, letterSpacing:1 }}
                    onMouseEnter={e => (e.currentTarget.style.color="#dc2626")}
                    onMouseLeave={e => (e.currentTarget.style.color="rgba(44,34,24,0.25)")}>
                    Eliminar esta reseña
                  </button>
                )}
              </div>
            </section>
          );
        })()}
      </SectionBlock>

      <SectionBlock id="bt-nosotros" label="Nuestra historia" isPreview={isPreview} defaultOrder={BT_SECTION_IDS}>
      {/* ── NOSOTROS — imagen full width + texto encima */}
      <section id="nosotros" data-reveal style={{ background:nosotrosBg, position:"relative" }}>
        <EditableSectionBg field="bgNosotros" label="Fondo nosotros" />
        {/* foto ancha */}
        <div style={{ position:"relative", width:"100%", height:400, overflow:"hidden" }}>
          <FadeImage src={nosotrosImageOv?.url ?? "https://picsum.photos/seed/terra-about/1920/600"} alt="" fill sizes="100vw" style={{ objectFit:"cover", objectPosition:`${nosotrosImageOv?.posX ?? 50}% ${nosotrosImageOv?.posY ?? 35}%` }}/>
          <BgDragHandle imgKey="nosotrosImage" />
          <EditableImageButton field="nosotrosImage" label="Imagen nosotros" />
          <div style={{ position:"absolute", inset:0, background: nosotrosImageOv?.overlayType === "none" ? "transparent" : nosotrosImageOv?.overlayType === "light" ? `rgba(255,255,255,${nosotrosImageOv?.overlayOpacity ?? 0.45})` : `rgba(44,34,24,${nosotrosImageOv?.overlayOpacity ?? 0.45})` }}/>
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <p style={{ fontFamily:"Georgia, serif", fontSize:"clamp(24px,4vw,54px)", fontStyle:"italic", color:"#faf7f2", textAlign:"center", lineHeight:1.3 }}>
              <EditableZone field="quoteText" label="Frase destacada">Hechas con las manos y el corazón.</EditableZone>
            </p>
          </div>
        </div>
        {/* texto + stats */}
        <div style={{ maxWidth:1280, margin:"0 auto", padding: isMobile ? "48px 20px" : "72px 40px", display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr", gap: isMobile ? 32 : 80, alignItems:"start" }}>
          <div>
            <p style={{ fontSize:10, letterSpacing:5, color:A, textTransform:"uppercase", marginBottom:16 }}><EditableZone field="aboutKicker" label="Etiqueta 'Nosotros'">Nuestra historia</EditableZone></p>
            <p style={{ fontSize:15, color:nosotrosText, lineHeight:1.9, marginBottom:20 }}><EditableZone field="aboutParagraph1" label="Párrafo 1 'Nosotros'">Terra nació en Mendoza en 2019 como un pequeño taller de confección artesanal. Hoy somos un equipo de 12 personas que diseña, tiñe y cose cada prenda con materiales de origen responsable.</EditableZone></p>
            <p style={{ fontSize:15, color:nosotrosMid, lineHeight:1.9 }}><EditableZone field="aboutParagraph2" label="Párrafo 2 'Nosotros'">Trabajamos con productores locales de lino, alpaca y algodón orgánico. Nuestras tinturas son 100% vegetales: cúrcuma, añil, madreselva y cochinilla.</EditableZone></p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:32 }}>
            {([["aboutStat1","aboutStatLabel1","2019","Año de fundación"],["aboutStat2","aboutStatLabel2","100%","Fibras naturales"],["aboutStat3","aboutStatLabel3","12","Artesanas"],["aboutStat4","aboutStatLabel4","Mendoza","Origen"]] as const).map(([fv,fl,n,label])=>(
              <div key={label} style={{ borderTop:`2px solid ${A}`, paddingTop:16 }}>
                <p style={{ fontFamily:"Georgia, serif", fontSize:36, fontStyle:"italic", color:A, margin:"0 0 6px" }}><EditableZone field={fv} label={`Stat: ${n}`}>{n}</EditableZone></p>
                <p style={{ fontSize:12, color:MID, margin:0, letterSpacing:1, textTransform:"uppercase" }}><EditableZone field={fl} label={`Etiqueta stat: ${label}`}>{label}</EditableZone></p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </SectionBlock>

      <SectionBlock id="bt-contacto" label="Contacto" isPreview={isPreview} defaultOrder={BT_SECTION_IDS}>
      {/* ── CONTACTO — imagen de fondo + form superpuesto */}
      <section id="contacto" data-reveal style={{ position:"relative", overflow:"hidden" }}>
        <FadeImage src={contactBgOv?.url ?? "https://picsum.photos/seed/terra-contact/1920/700"} alt="" fill sizes="100vw" style={{ objectFit:"cover", objectPosition:`${contactBgOv?.posX ?? 50}% ${contactBgOv?.posY ?? 60}%` }}/>
        <BgDragHandle imgKey="contactBackground" />
        <EditableImageButton field="contactBackground" label="Imagen fondo contacto" />
        <div style={{ position:"absolute", inset:0, background: contactBgOv?.overlayType === "none" ? "transparent" : contactBgOv?.overlayType === "dark" ? `rgba(0,0,0,${contactBgOv?.overlayOpacity ?? 0.88})` : `rgba(250,247,242,${contactBgOv?.overlayOpacity ?? 0.88})` }}/>
        <div style={{ position:"relative", maxWidth:1280, margin:"0 auto", padding: isMobile ? "48px 20px" : "80px 40px", display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 0 : 80, alignItems:"center", minHeight: isMobile ? "auto" : 500 }}>
          {/* izq — texto e info */}
          <div>
            <p style={{ fontSize:10, letterSpacing:5, color:A, textTransform:"uppercase", marginBottom:20 }}><EditableZone field="contactKicker" label="Etiqueta contacto">Escribinos</EditableZone></p>
            <h2 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(30px,4vw,56px)", fontStyle:"italic", fontWeight:400, margin:"0 0 28px", color:T, lineHeight:1.1 }}><EditableZone field="contactHeading" label="Título contacto" block>Estamos para ayudarte.</EditableZone></h2>
            <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
              {[
                { label:"Email",     val:"hola@terra.com.ar",       field:"contactEmail" },
                { label:"Ubicación", val:"Belgrano 456, Mendoza",   field:"contactUbicacion" },
                { label:"Instagram", val:"@terra.indumentaria",     field:"contactInstagram" },
                { label:"Horario",   val:"Lun–Vie 9 a 18 hs",      field:"contactHorario" },
              ].map(item=>(
                <div key={item.label} style={{ display:"flex", gap:20, alignItems:"baseline", borderBottom:`1px solid rgba(44,34,24,0.08)`, paddingBottom:14 }}>
                  <span style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:A, minWidth:80 }}>{item.label}</span>
                  <span style={{ fontSize:14, color:MID }}><EditableZone field={item.field} label={item.label}>{item.val}</EditableZone></span>
                </div>
              ))}
            </div>
          </div>
          {/* der — formulario */}
          <div style={{ background:"#fff", padding: isMobile ? "32px 20px" : "40px 36px" }}>
            {contactStatus==="sent" ? (
              <div style={{ textAlign:"center", padding:"40px 0" }}>
                <div style={{ width:56, height:56, borderRadius:"50%", border:`1.5px solid ${A}`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={A} strokeWidth={2} strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:20, color:T, marginBottom:8 }}>¡Mensaje enviado!</p>
                <p style={{ fontSize:13, color:MID, marginBottom:20 }}>Te respondemos a la brevedad.</p>
                <button onClick={()=>setContactStatus("idle")} style={{ background:"transparent", color:A, border:`1px solid ${A}`, padding:"9px 24px", fontSize:11, letterSpacing:2, cursor:"pointer", textTransform:"uppercase" }}>Enviar otro</button>
              </div>
            ) : (
              <form onSubmit={handleContact}>
                <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:18, color:T, margin:"0 0 24px" }}><EditableZone field="contactFormHeading" label="Subtítulo formulario">Mandanos un mensaje</EditableZone></p>
                <input required placeholder="Tu nombre" value={contactForm.nombre} onChange={e=>setContactForm(f=>({...f,nombre:e.target.value}))}
                  style={{...iStyle, marginBottom:12}} onFocus={onFI} onBlur={onBI}/>
                <input required type="email" placeholder="tu@email.com" value={contactForm.email} onChange={e=>setContactForm(f=>({...f,email:e.target.value}))}
                  style={{...iStyle, marginBottom:12}} onFocus={onFI} onBlur={onBI}/>
                <textarea required rows={4} placeholder="Tu mensaje" value={contactForm.mensaje} onChange={e=>setContactForm(f=>({...f,mensaje:e.target.value}))}
                  style={{ display:"block", width:"100%", background:"#faf7f2", border:`1px solid #d5c9be`, color:T, padding:"11px 14px", fontSize:13, outline:"none", resize:"none", fontFamily:"inherit", boxSizing:"border-box", marginBottom:16 }}
                  onFocus={onFI} onBlur={onBI}/>
                <button type="submit" disabled={contactStatus==="sending"}
                  style={{ width:"100%", background:A, color:"#fff", border:"none", padding:"14px", fontSize:11, letterSpacing:4, textTransform:"uppercase", cursor:"pointer", opacity:contactStatus==="sending"?0.6:1 }}>
                  {contactStatus==="sending" ? "Enviando..." : "Enviar Mensaje"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
      </SectionBlock>
      </div>

      {/* ── FOOTER — franja mínima con newsletter prominente */}
      <footer style={{ background:footerBg, borderTop:`1px solid rgba(44,34,24,0.1)` }}>
        {/* newsletter strip */}
        <div style={{ position:"relative", ...(newsletterBgImg?.url ? { backgroundImage:`url(${newsletterBgImg.url})`, backgroundSize:"cover", backgroundPosition:`${newsletterBgImg.posX ?? 50}% ${newsletterBgImg.posY ?? 50}%` } : { background:newsletterBg }) }}>
          <BgDragHandle imgKey="sectionbg_bgNewsletter" />
          <EditableSectionBg field="bgNewsletter" label="Fondo newsletter" />
          {newsletterBgImg?.url && newsletterBgImg.overlayType !== "none" && (
            <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none", background: newsletterBgImg.overlayType === "light" ? `rgba(255,255,255,${newsletterBgImg.overlayOpacity ?? 0.5})` : `rgba(0,0,0,${newsletterBgImg.overlayOpacity ?? 0.45})` }} />
          )}
          <div style={{ position:"relative", zIndex:1, padding:"36px 40px" }}>
          <div style={{ maxWidth:1280, margin:"0 auto", display:"flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent:"space-between", gap:32, flexWrap:"wrap" }}>
            <div>
              <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:20, color:newsletterText, margin:"0 0 4px" }}><EditableZone field="newsletterText" label="Título newsletter">Suscribite al newsletter</EditableZone></p>
              <p style={{ fontSize:12, color:newsletterMid, margin:0, letterSpacing:1 }}><EditableZone field="newsletterSubtext" label="Subtítulo newsletter">Novedades, lanzamientos y descuentos exclusivos</EditableZone></p>
            </div>
            <div style={{ display:"flex", flexShrink:0 }}>
              <input placeholder="tu@email.com" style={{ width: isMobile ? "100%" : 260, background:newsletterInputBg, border:`1px solid ${newsletterInputBorder}`, borderRight:"none", color:newsletterText, padding:"12px 16px", fontSize:13, outline:"none" }}/>
              <button style={{ background:T, color:BG, border:"none", padding:"12px 24px", fontSize:11, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", fontWeight:600 }}>Suscribirse</button>
            </div>
          </div>
          </div>
        </div>
        {/* links + copyright — este div es el fondo del footer propiamente dicho */}
        <div style={{ position:"relative" }}>
        <EditableSectionBg field="bgFooter" label="Fondo footer" />
        <div style={{ maxWidth:1280, margin:"0 auto", padding: isMobile ? "20px 16px" : "28px 40px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:20 }}>
          <span style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:20, color:footerText, letterSpacing:2 }}><EditableZone field="footerBrandName" label="Nombre en footer">Terra</EditableZone></span>
          <div style={{ display:"flex", gap:24 }}>
            {[["Colección","coleccion"],["Nosotros","nosotros"],["Contacto","contacto"],["Envíos","contacto"],["Devoluciones","contacto"]].map(([l,t])=>(
              <button key={l} onClick={()=>scrollTo(t)} style={{ background:"none", border:"none", color:footerMid, fontSize:12, cursor:"pointer", transition:"color 0.2s" }}
                onMouseEnter={e=>(e.currentTarget.style.color=footerText)}
                onMouseLeave={e=>(e.currentTarget.style.color=footerMid)}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {([["IG","instagram"],["FB","facebook"],["PT","pinterest"]] as const).map(([label, key]) => {
              const url = storeConfig?.socialLinks?.[key];
              if (!isPreview && !url) return null;
              return (
                <button key={label}
                  onClick={() => url && window.open(url, "_blank")}
                  style={{ background:"none", border:`1px solid ${footerMid}33`, color:footerMid, width:32, height:32, fontSize:9, fontWeight:700, cursor: url ? "pointer" : "default", letterSpacing:1, transition:"all 0.2s", opacity: url ? 1 : 0.35 }}
                  onMouseEnter={e=>{ if(url){ e.currentTarget.style.borderColor=A; e.currentTarget.style.color=A; }}}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=`${footerMid}33`; e.currentTarget.style.color=footerMid; }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ borderTop:`1px solid rgba(44,34,24,0.07)`, padding: isMobile ? "16px" : "16px 40px", paddingLeft: hasWA ? (isMobile ? 90 : 110) : (isMobile ? 16 : 40), paddingRight: isMobile ? 90 : 110, maxWidth:1280, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"8px 24px" }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"0 16px" }}>
            {[
              { label: "Política de devoluciones", tipo: "devoluciones" },
              { label: "Política de envíos",       tipo: "envios" },
              { label: "Términos y condiciones",   tipo: "terminos" },
            ].map(({ label, tipo }) => (
              editMode ? (
                <button key={tipo} type="button" onClick={() => window.open("/dashboard/pagos", "_blank")}
                  title="Editar en Dashboard → Pagos"
                  style={{ fontSize:11, color:footerMid, opacity:0.55, background:"none", border:"none", cursor:"pointer", padding:0, display:"inline-flex", alignItems:"center", gap:4 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.55"; }}>
                  {label}
                  <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              ) : (
                <a key={tipo} href={`/tienda/${storeConfig?.slug ?? ""}/politicas?tipo=${tipo}`}
                  style={{ fontSize:11, color:footerMid, opacity:0.55, textDecoration:"none" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.55"; }}>
                  {label}
                </a>
              )
            ))}
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"8px 16px", alignItems:"center" }}>
            <p style={{ fontSize:11, color:footerMid, margin:0, opacity:0.6 }}>
              <EditableZone field="footerCopyright" label="Copyright">© 2025 Terra · Moda consciente · Mendoza, Argentina</EditableZone>
            </p>
            {!editMode && (
              <button onClick={() => setShowReport(true)}
                style={{ fontSize:11, color:footerMid, opacity:0.5, background:"none", border:"none", cursor:"pointer", padding:0 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.5"; }}>
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

      {/* ── MODAL PRODUCTO */}
      {modalProduct && (
        <div style={{ position:"fixed", inset:0, zIndex: isPreview ? 20000 : 600, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>{ setModalProduct(null); setLightboxSrc(null); }}>
          <div style={{ position:"absolute", inset:0, background:"rgba(44,34,24,0.65)", backdropFilter:"blur(8px)" }}/>
          <div style={{ position:"relative", background:"#fff", maxWidth:920, width:"calc(100% - 32px)", maxHeight: isPreview ? "100%" : "92vh", overflow:"hidden", display:"flex", flexDirection:"column" }} onClick={e=>e.stopPropagation()}>
            <button onClick={()=>{ setModalProduct(null); setLightboxSrc(null); }} style={{ position:"absolute", top:8, right:8, zIndex:10, background:"rgba(44,34,24,0.65)", border:"none", color:"#fff", width:36, height:36, cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
            <div style={{ overflow:"auto", flex:1, minHeight:0, display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
            <div>
              <div style={{ position:"relative", width:"100%", aspectRatio:"3/4" }} {...imgSwipe}>
                {modalProduct.images[modalImg] && (
                  <FadeImage src={modalProduct.images[modalImg]} alt="" fill sizes="(max-width: 768px) 100vw, 460px" style={{ objectFit:"cover", cursor:"zoom-in" }}
                    onClick={() => setLightboxSrc(modalProduct.images[modalImg])} />
                )}
                {modalProduct.images.length > 1 && (<>
                  <button onClick={() => setModalImg(i => (i - 1 + modalProduct.images.length) % modalProduct.images.length)}
                    style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.85)", border:"none", width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>‹</button>
                  <button onClick={() => setModalImg(i => (i + 1) % modalProduct.images.length)}
                    style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.85)", border:"none", width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>›</button>
                </>)}
              </div>
              <div style={{ display:"flex", gap:8, padding:"10px 14px", background:S }}>
                {modalProduct.images.map((img,i)=>(
                  <button key={i} onClick={()=>setModalImg(i)} style={{ position:"relative", width:52, height:52, padding:2, border:i===modalImg?`2px solid ${A}`:"2px solid transparent", background:"none", cursor:"pointer" }}>
                    <FadeImage src={img} alt="" fill sizes="52px" style={{ objectFit:"cover" }}/>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: isMobile ? "20px 20px" : "40px 36px", display:"flex", flexDirection:"column", gap:18 }}>
              <div>
                <p style={{ fontSize:10, letterSpacing:4, color:A, textTransform:"uppercase", marginBottom:6 }}>{modalProduct.category}</p>
                <h2 style={{ fontFamily:"Georgia, serif", fontSize:24, fontStyle:"italic", margin:0, lineHeight:1.2, color:T }}>{modalProduct.name}</h2>
              </div>
              <div style={{ display:"flex", gap:6, marginTop:8 }}>
                <button onClick={() => shareProduct(modalProduct)}
                  style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:`1px solid rgba(44,34,24,0.15)`, color:"rgba(44,34,24,0.4)", padding:"5px 12px", fontSize:10, letterSpacing:1, cursor:"pointer", transition:"color 0.2s" }}
                  onMouseEnter={e=>(e.currentTarget.style.color=T)} onMouseLeave={e=>(e.currentTarget.style.color="rgba(44,34,24,0.4)")}>
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  Copiar link
                </button>
                {hasWA && (
                <button onClick={() => whatsappShare(modalProduct)}
                  style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"1px solid rgba(37,211,102,0.3)", color:"rgba(37,211,102,0.7)", padding:"5px 12px", fontSize:10, letterSpacing:1, cursor:"pointer", transition:"color 0.2s" }}
                  onMouseEnter={e=>(e.currentTarget.style.color="#25D366")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(37,211,102,0.7)")}>
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M11.897 0C5.395 0 .13 5.266.13 11.767c0 2.078.545 4.03 1.495 5.727L.057 24l6.7-1.757A11.71 11.71 0 0 0 11.897 23.534c6.503 0 11.768-5.265 11.768-11.767C23.67 5.266 18.4 0 11.897 0zm0 21.536h-.004a9.726 9.726 0 0 1-4.96-1.358l-.356-.211-3.678.965.982-3.581-.232-.368A9.73 9.73 0 0 1 2.158 11.767C2.158 6.355 6.551 2 11.897 2c2.581 0 5.007 1.007 6.831 2.831a9.604 9.604 0 0 1 2.828 6.83c0 5.347-4.393 9.875-9.659 9.875z"/></svg>
                  WhatsApp
                </button>
                )}
              </div>
              <div style={{ display:"flex", gap:12, alignItems:"baseline" }}>
                <span style={{ fontSize:22, fontWeight:700, color:A }}>{ocultarPrecios ? "Consultá precio" : fmt(modalProduct.price)}</span>
                {!ocultarPrecios && modalProduct.comparePrice && <span style={{ fontSize:14, color:MID, textDecoration:"line-through" }}>{fmt(modalProduct.comparePrice)}</span>}
              </div>
              <p style={{ fontSize:13, color:MID, lineHeight:1.8, borderTop:`1px solid rgba(44,34,24,0.07)`, paddingTop:14 }}>{modalProduct.description}</p>
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
                      <span style={{ alignSelf:"flex-start", fontSize:10, letterSpacing:2, textTransform:"uppercase", fontWeight:600, color:A, border:`1px solid ${A}`, padding:"4px 10px", fontFamily:"Georgia, serif", fontStyle:"italic" }}>{condicionAttr.value}</span>
                    )}
                    {otherAttrs.length > 0 && (
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        {otherAttrs.map(a => (
                          <p key={a.key} style={{ fontSize:12, color:MID, margin:0 }}><span style={{ color:T, opacity:0.7 }}>{a.key}:</span> {a.value}</p>
                        ))}
                      </div>
                    )}
                    {servicios.length > 0 && (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                        {servicios.map(k => (
                          <span key={k} style={{ fontSize:10, letterSpacing:1, padding:"4px 10px", border:`1px solid rgba(44,34,24,0.18)`, color:MID }}>✓ {k}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
              <div>
                <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", marginBottom:8, color:MID }}>Color: <strong style={{ color:T }}>{selectedColor}</strong></p>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {modalProduct.colors.map(c=>{
                    const swatch = colorToSwatch(c);
                    return (
                      <button key={c} onClick={()=>setSelectedColor(c)}
                        style={{ display:"flex", alignItems:"center", gap:7, padding:"6px 14px", fontSize:11, border:selectedColor===c?`1.5px solid ${A}`:"1px solid rgba(44,34,24,0.18)", background:selectedColor===c?"rgba(181,101,42,0.08)":"transparent", color:T, cursor:"pointer" }}>
                        {swatch && <span style={{ width:14, height:14, borderRadius:"50%", background:swatch, border:"1px solid rgba(44,34,24,0.2)", flexShrink:0 }} />}
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", marginBottom:8, color:MID }}>Talle: <strong style={{ color:T }}>{selectedSize}</strong></p>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {modalProduct.sizes.map(s=>{
                    const outOfStock = outOfStockSizes.has(s);
                    return (
                      <button key={s} onClick={()=>setSelectedSize(s)}
                        style={{ width:46, height:46, fontSize:12, border:selectedSize===s?`1.5px solid ${A}`:"1px solid rgba(44,34,24,0.18)", background:selectedSize===s?"rgba(181,101,42,0.08)":"transparent", color:T, cursor:"pointer", opacity: outOfStock ? 0.35 : 1, textDecoration: outOfStock ? "line-through" : "none" }}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <span style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:MID }}>Cantidad</span>
                <div style={{ display:"flex", alignItems:"center", border:`1px solid rgba(44,34,24,0.18)` }}>
                  <button onClick={()=>setQty(q=>Math.max(isWholesale && modalProduct.cantMinMayorista ? modalProduct.cantMinMayorista : 1,q-1))} style={{ width:36, height:36, background:"none", border:"none", color:T, fontSize:18, cursor:"pointer" }}>−</button>
                  <span style={{ width:36, textAlign:"center", fontSize:14 }}>{qty}</span>
                  <button onClick={()=>setQty(q=>selectedVariantStock !== null ? Math.min(selectedVariantStock, q+1) : q+1)} style={{ width:36, height:36, background:"none", border:"none", color:T, fontSize:18, cursor:"pointer" }}>+</button>
                </div>
              </div>
              {/* Stock por variante */}
              {selectedVariantStock !== null && selectedVariantStock === 0 && (
                <p style={{ fontSize:12, color:"#888", fontWeight:500, margin:0 }}>Sin stock en esta combinación</p>
              )}
              {selectedVariantStock !== null && selectedVariantStock > 0 && selectedVariantStock <= 5 && (
                <p style={{ fontSize:12, color:"#ef4444", fontWeight:600, margin:0 }}>¡Últimas {selectedVariantStock} unidades!</p>
              )}
              {/* Videos del producto — carrusel vertical 9:16 */}
              {modalProduct.reelUrls.length > 0 && (
                <div style={{ borderTop:`1px solid rgba(44,34,24,0.1)`, paddingTop:14, marginBottom:4 }}>
                  <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", marginBottom:10, color:MID }}>Videos</p>
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
                          style={{ width:160, aspectRatio:"9/16", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, border:`1px solid rgba(44,34,24,0.14)`, textDecoration:"none", color:"#2c2218", borderRadius:8, background:S }}>
                          <svg width={24} height={24} viewBox="0 0 24 24" fill={A} stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          <span style={{ fontSize:11 }}>{platform}</span>
                        </a>
                      );
                    })()}
                    {modalProduct.reelUrls.length > 1 && (
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <button onClick={() => setReelIndex(i => (i - 1 + modalProduct.reelUrls.length) % modalProduct.reelUrls.length)}
                          style={{ background:"none", border:`1px solid rgba(44,34,24,0.2)`, color:"#2c2218", width:30, height:30, borderRadius:"50%", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
                        <div style={{ display:"flex", gap:5 }}>
                          {modalProduct.reelUrls.map((_, i) => (
                            <button key={i} onClick={() => setReelIndex(i)}
                              style={{ width:6, height:6, borderRadius:"50%", background: i === reelIndex ? A : "rgba(44,34,24,0.2)", border:"none", cursor:"pointer", padding:0 }} />
                          ))}
                        </div>
                        <button onClick={() => setReelIndex(i => (i + 1) % modalProduct.reelUrls.length)}
                          style={{ background:"none", border:`1px solid rgba(44,34,24,0.2)`, color:"#2c2218", width:30, height:30, borderRadius:"50%", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!isMobile && (isInquiryMode ? (
                <button onClick={() => openInquiry(modalProduct)} style={{ background:A, color:"#fff", border:"none", padding:"15px", fontSize:11, letterSpacing:4, textTransform:"uppercase", cursor:"pointer", marginTop:"auto" }}>
                  Consultar disponibilidad
                </button>
              ) : (
                <button onClick={addToCart} disabled={selectedVariantStock === 0}
                  style={{ background: selectedVariantStock === 0 ? "rgba(181,101,42,0.3)" : A, color:"#fff", border:"none", padding:"15px", fontSize:11, letterSpacing:4, textTransform:"uppercase", cursor: selectedVariantStock === 0 ? "not-allowed" : "pointer", marginTop:"auto" }}>
                  {selectedVariantStock === 0 ? "Sin stock" : `Agregar al Carrito · ${fmt(modalProduct.price*qty)}`}
                </button>
              ))}

              {/* Reseñas — D-04 */}
              <div style={{ borderTop:`1px solid rgba(44,34,24,0.1)`, paddingTop:20, marginTop:20 }}>
                <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:14, color:T, margin:"0 0 14px" }}>
                  Reseñas{reviews.length > 0 && ` (${reviews.length})`}
                </p>
                {reviewsLoading ? (
                  <p style={{ fontSize:12, color:MID }}>Cargando...</p>
                ) : reviews.length > 0 ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:20 }}>
                    {reviews.slice(0, reviewsShown).map(r => (
                      <div key={r.id} style={{ borderBottom:`1px solid rgba(44,34,24,0.07)`, paddingBottom:14, display:"flex", gap:10 }}>
                        {r.product?.image && (
                          <img src={r.product.image} alt={r.product?.name ?? ""} style={{ width:44, height:44, objectFit:"cover", borderRadius:6, border:`1px solid rgba(44,34,24,0.10)`, flexShrink:0 }} />
                        )}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                              <span style={{ fontSize:12, fontWeight:600, color:T }}>{r.reviewer}</span>
                              {r.product?.name && <span style={{ fontSize:11, color:MID }}>{r.product.name}</span>}
                              {r.verified && (
                                <span style={{ fontSize:10, fontWeight:600, color:"#16a34a", background:"#f0fdf4", border:"1px solid #bbf7d0", padding:"1px 6px", borderRadius:20 }}>
                                  ✓ Compra verificada
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize:14, color:A }}>{[1,2,3,4,5].map(s => s <= r.rating ? "★" : "☆").join("")}</span>
                          </div>
                          {r.comment && <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:12, color:MID, margin:0, lineHeight:1.7 }}>{r.comment}</p>}
                        </div>
                      </div>
                    ))}
                    {reviews.length > reviewsShown && (
                      <button onClick={() => setReviewsShown(n => n + 10)} style={{ alignSelf:"flex-start", background:"none", border:"none", color:A, fontSize:11, fontWeight:600, cursor:"pointer", padding:0, textDecoration:"underline", fontFamily:"Georgia, serif", fontStyle:"italic" }}>
                        Ver más reseñas ({reviews.length - reviewsShown})
                      </button>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize:12, color:MID, marginBottom:16 }}>Sé el primero en dejar una reseña.</p>
                )}
                {isOwner ? (
                  <p style={{ fontSize:11, color:MID, fontStyle:"italic" }}>El dueño no puede dejar reseñas en su propia tienda.</p>
                ) : reviewDone ? (
                  <p style={{ fontSize:12, color:A, fontWeight:600 }}>¡Gracias por tu reseña!</p>
                ) : (
                  <div style={{ position:"relative" }}>
                    {isPreview && <div style={{ position:"absolute", inset:0, zIndex:10, cursor:"default" }} onClick={e => e.stopPropagation()} />}
                    <form onSubmit={isPreview ? e => e.preventDefault() : submitReview} style={{ display:"flex", flexDirection:"column", gap:10, opacity: isPreview ? 0.55 : 1 }}>
                      <input value={reviewHoneypot} onChange={e => setReviewHoneypot(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ opacity:0, height:0, position:"absolute", pointerEvents:"none" }} />
                      <input value={reviewForm.reviewer} onChange={e => !isPreview && setReviewForm(p => ({ ...p, reviewer: e.target.value }))}
                        placeholder="Tu nombre" readOnly={isPreview}
                        style={{ border:`1px solid rgba(44,34,24,0.2)`, padding:"9px 12px", fontSize:12, outline:"none", background:"#faf7f2" }} />
                      <div>
                        <input value={reviewForm.email} onChange={e => !isPreview && setReviewForm(p => ({ ...p, email: e.target.value }))}
                          placeholder="Tu email (opcional — verifica tu compra)" type="email" readOnly={isPreview} autoComplete="email"
                          style={{ width:"100%", boxSizing:"border-box", border:`1px solid rgba(44,34,24,0.2)`, padding:"9px 12px", fontSize:12, outline:"none", background:"#faf7f2" }} />
                        <p style={{ fontSize:10, color:"rgba(44,34,24,0.4)", margin:"3px 0 0", fontFamily:"Georgia, serif", fontStyle:"italic", lineHeight:1.4 }}>
                          Si compraste acá, tu reseña aparecerá con el sello &ldquo;✓ Compra verificada&rdquo;. El email no se muestra.
                        </p>
                      </div>
                      <div style={{ display:"flex", gap:4 }}>
                        {[1,2,3,4,5].map(s => (
                          <button key={s} type="button" onClick={() => !isPreview && setReviewForm(p => ({ ...p, rating: s }))}
                            style={{ background:"none", border:"none", fontSize:20, cursor: isPreview ? "default" : "pointer", color: s <= reviewForm.rating ? A : "rgba(44,34,24,0.2)", padding:"2px" }}>★</button>
                        ))}
                      </div>
                      <textarea value={reviewForm.comment} onChange={e => !isPreview && setReviewForm(p => ({ ...p, comment: e.target.value }))}
                        placeholder="Comentario (opcional)" rows={3} readOnly={isPreview}
                        style={{ border:`1px solid rgba(44,34,24,0.2)`, padding:"9px 12px", fontSize:12, resize:"none", outline:"none", background:"#faf7f2" }} />
                      <button type="submit" disabled={isPreview || reviewSubmitting || !reviewForm.reviewer.trim()}
                        style={{ background: isPreview || reviewSubmitting || !reviewForm.reviewer.trim() ? "rgba(181,101,42,0.3)" : A, color:"#fff", border:"none", padding:"12px", fontSize:11, letterSpacing:3, textTransform:"uppercase", cursor: isPreview ? "default" : "pointer" }}>
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
                <div style={{ gridColumn: isMobile ? undefined : "1 / -1", padding: isMobile ? "20px 20px 28px" : "0 36px 36px", borderTop:`1px solid rgba(44,34,24,0.08)`, paddingTop:24 }}>
                  <p style={{ fontSize:10, letterSpacing:4, color:MID, textTransform:"uppercase", margin:"0 0 16px" }}>Productos similares</p>
                  <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap:14 }}>
                    {similarProducts.map(p => (
                      <div key={p.id} onClick={() => openModal(p)} style={{ cursor:"pointer" }}>
                        <div style={{ position:"relative", width:"100%", aspectRatio:"3/4", background:S }}>
                          {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes="(max-width: 768px) 50vw, 25vw" style={{ objectFit:"cover" }} />}
                        </div>
                        <p style={{ margin:"8px 0 2px", fontSize:12, color:T, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical" as const }}>{p.name}</p>
                        <p style={{ margin:0, fontSize:13, fontWeight:700, color:A }}>{ocultarPrecios ? "Consultá precio" : fmt(p.price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            </div>
            {isMobile && (
              <div style={{ borderTop:`1px solid rgba(44,34,24,0.12)`, padding:"12px 16px 16px", background:"#fff", flexShrink:0 }}>
                <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:10 }}>
                  <span style={{ fontSize:20, fontWeight:700, color:A }}>{ocultarPrecios ? "Consultá precio" : fmt(modalProduct.price * qty)}</span>
                  {!ocultarPrecios && modalProduct.comparePrice && <span style={{ fontSize:12, color:MID, textDecoration:"line-through" }}>{fmt(modalProduct.comparePrice)}</span>}
                  {qty > 1 && <span style={{ fontSize:11, color:MID }}>× {qty}</span>}
                </div>
                {isInquiryMode ? (
                  <button onClick={() => openInquiry(modalProduct)}
                    style={{ width:"100%", background:A, color:"#fff", border:"none", padding:"15px", fontSize:11, letterSpacing:4, textTransform:"uppercase", cursor:"pointer" }}>
                    Consultar disponibilidad
                  </button>
                ) : (
                  <button onClick={addToCart} disabled={selectedVariantStock === 0}
                    style={{ width:"100%", background: selectedVariantStock === 0 ? "rgba(181,101,42,0.3)" : A, color:"#fff", border:"none", padding:"15px", fontSize:11, letterSpacing:4, textTransform:"uppercase", cursor: selectedVariantStock === 0 ? "not-allowed" : "pointer" }}>
                    {selectedVariantStock === 0 ? "Sin stock" : "Agregar al Carrito"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <CartDrawer cart={cart} theme={cartTheme} isOwner={isOwner} isPreview={isPreview} whatsapp={storeConfig?.whatsapp} />

      {/* ── FAVORITES DRAWER ───────────────────────────────── */}
      <div style={{ position:"fixed", inset:0, zIndex: isPreview ? 20000 : 155, pointerEvents: favoritesOpen ? "auto" : "none" }}>
        <div onClick={() => setFavoritesOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(44,34,24,0.4)", opacity: favoritesOpen ? 1 : 0, transition:"opacity 0.3s" }}/>
        <div style={{ position:"absolute", top:0, right:0, bottom:0, width:400, background:"#fff", transform: favoritesOpen ? "translateX(0)" : "translateX(100%)", transition:"transform 0.35s cubic-bezier(.4,0,.2,1)", display:"flex", flexDirection:"column", borderLeft:`1px solid rgba(44,34,24,0.08)` }}>
          <div style={{ padding:"20px 24px 14px", borderBottom:`1px solid rgba(44,34,24,0.06)`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:18, margin:0, color:T }}>{"Favoritos"} <span style={{ fontStyle:"normal", fontSize:13, color:MID, fontFamily:"'Helvetica Neue', sans-serif" }}>({favorites.length})</span></p>
            <button onClick={() => setFavoritesOpen(false)} style={{ background:"none", border:"none", color:T, fontSize:22, cursor:"pointer" }}>×</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"14px 24px" }}>
            {favoriteProducts.length === 0
              ? <div style={{ textAlign:"center", padding:"52px 0", color:MID }}>
                  <p style={{ fontSize:32, marginBottom:12 }}>♡</p>
                  <p style={{ fontSize:13, lineHeight:1.8 }}>No tenés favoritos aún.<br/>Explorá la colección.</p>
                </div>
              : favoriteProducts.map(product => (
                <div key={product.id} style={{ display:"flex", gap:14, padding:"14px 0", borderBottom:`1px solid rgba(44,34,24,0.05)` }}>
                  {product.images[0] ? <FadeImage src={product.images[0]} alt={product.name} width={64} height={86} style={{ objectFit:"cover", flexShrink:0 }}/> : <div style={{ width:64, height:86, flexShrink:0, background:S }}/>}
                  <div style={{ flex:1 }}>
                    <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:14, margin:"0 0 4px", color:T }}>{product.name}</p>
                    <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:10 }}>
                      <p style={{ fontSize:13, color:A, fontWeight:700, margin:0 }}>{ocultarPrecios ? "Consultá precio" : fmt(product.price)}</p>
                      {!ocultarPrecios && product.comparePrice && product.comparePrice > product.price && <p style={{ fontSize:11, color:MID, textDecoration:"line-through", margin:0 }}>{fmt(product.comparePrice)}</p>}
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={() => { setFavoritesOpen(false); openModal(product); }}
                        style={{ background:A, color:"#fff", border:"none", padding:"7px 14px", fontSize:10, letterSpacing:2, fontWeight:600, textTransform:"uppercase", cursor:"pointer" }}>
                        Ver producto
                      </button>
                      <button onClick={() => toggleFavorite(product.id)}
                        style={{ background:"transparent", color:MID, border:`1px solid rgba(44,34,24,0.18)`, padding:"7px 14px", fontSize:10, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", transition:"color 0.2s" }}
                        onMouseEnter={e => (e.currentTarget.style.color=T)}
                        onMouseLeave={e => (e.currentTarget.style.color=MID)}>
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

      <CheckoutModal cart={cart} theme={cartTheme} isPreview={isPreview} storeSlug={storeConfig?.slug ?? ""} />

      {/* ── LIGHTBOX ───────────────────────────────────────── */}
      {lightboxSrc && (
        <div style={{ position:"fixed", inset:0, zIndex: isPreview ? 20001 : 700, background:"rgba(0,0,0,0.97)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="" style={{ maxWidth:"100vw", maxHeight:"100vh", objectFit:"contain", touchAction:"pinch-zoom" }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxSrc(null)} style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", width:44, height:44, borderRadius:"50%", fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
      )}

      {/* ── FLOATING CART BUTTON ────────────────────────────── */}
      {/* Cuando WA está activo, el carrito se apila encima (bottom:84) para evitar posición left:24 que queda fuera del frame en preview */}
      {!cart.cartOpen && !cart.checkoutOpen && (() => {
        const cartIconIdx = (Math.abs(parseInt(textOverrides["cartIcon"]?.text ?? "0") || 0)) % CART_ICON_OPTIONS.length;
        const nextCartIconIdx = (cartIconIdx + 1) % CART_ICON_OPTIONS.length;
        return (
          <div onClick={() => { if (!editMode) { setCartOpen(true); setFavoritesOpen(false); } }}
            role="button" tabIndex={0} aria-label="Carrito"
            onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && !editMode) { e.preventDefault(); setCartOpen(true); setFavoritesOpen(false); } }}
            style={{ position:"fixed", bottom:24, ...(hasWA ? {left:24} : {right:24}), zIndex:500, width:52, height:52, borderRadius:"50%", background:A, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 6px 18px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)", transition:"transform 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.transform="scale(1.1)")}
            onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}>
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={getContrastColor(A)==="light"?"#fff":"#1a0e08"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{CART_ICON_OPTIONS[cartIconIdx]}</svg>
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
      {!cart.cartOpen && !cart.checkoutOpen && (!storeConfig || storeConfig.whatsapp.enabled) && (
        <button
          className="bt-wa-fab"
          onClick={() => { if (editMode) return; window.open(`https://wa.me/${(storeConfig?.whatsapp.number ?? "5491100000000").replace(/\D/g,"")}${storeConfig?.whatsapp?.message ? "?text=" + encodeURIComponent(storeConfig.whatsapp.message) : ""}`, "_blank"); }}
          style={{ position:"fixed", bottom:24, right:24, zIndex:500, width:52, height:52, borderRadius:"50%", border:"none", cursor: editMode ? "default" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"transform 0.2s" }}
          onMouseEnter={e => { if (!editMode) e.currentTarget.style.transform="scale(1.1)"; }}
          onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </button>
      )}

    </div>
  );
}
