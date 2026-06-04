"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { EditableZone, EditableFixed, EditableImageButton, EditableSectionBg, BgDragHandle, getContrastColor, useEditContext } from "@/contexts/EditContext";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useCartLogic } from "@/hooks/useCartLogic";
import { ENVIO_OPTIONS, PAGO_OPTIONS } from "@/components/store/shared/cartTypes";
import PolicyEditorModal from "@/components/store/PolicyEditorModal";
import VerifiedIconButton from "@/components/store/VerifiedIconButton";

const SIZE_ATTRS = ["talle","size","talla","talles","sizes","tamaño","tamano","almacenamiento","ram","versión","version","formato","variante","material","sabor","peso/tamaño","peso"];

const BG  = "#faf7f2";
const S   = "#f0e9df";
const T   = "#2c2218";
const A   = "#b5652a";
const MID = "#9a8070";

type Product = StorefrontProduct;


const ANNOUNCEMENT_MESSAGES = [
  "🌿 Envío gratis en compras mayores a $30.000",
  "🔄 Cambios sin cargo hasta 30 días",
  "🌱 6 cuotas sin interés",
  "✨ Nueva colección artesanal disponible",
];

const scrollTo = (id:string) => document.getElementById(id)?.scrollIntoView({ behavior:"smooth" });

export default function BohoTerra() {
  type PReview = { id: string; rating: number; comment: string | null; reviewer: string; createdAt: string };
  const [reviews,        setReviews]        = useState<PReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewForm,     setReviewForm]     = useState({ reviewer: "", rating: 5, comment: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone,     setReviewDone]     = useState(false);

  const storeConfig = useStoreConfig();
  const isPreview   = !!storeConfig?.previewFill;
  const isOwner     = !!storeConfig?.isOwner;
  const blockBuy    = isPreview || isOwner;
  const storefront  = useStorefront();
  const { products, checkoutMode, isWholesale, ocultarPrecios, defaultCategories, featuredCategories } = storefront;
  const { editMode } = useEditContext();
  const isInquiryMode = checkoutMode === "inquiry" || ocultarPrecios;

  const categoryList = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(c => c && c !== "general"))];
    const base = cats.length > 0 ? cats : defaultCategories.slice(0, 6);
    return featuredCategories.length > 0 ? base.filter(c => featuredCategories.includes(c)) : base;
  }, [products, defaultCategories, featuredCategories]);
  const CATEGORIES = useMemo(() => ["Todos", ...categoryList], [categoryList]);

  // eslint-disable-next-line @typescript-eslint/no-shadow
  const A = storeConfig?.colors.accent ?? "#b5652a";
  const sc = storeConfig?.sectionColors ?? {};
  const heroLeftBg = sc["bgHeroLeft"] ?? BG;
  const heroLeftText = getContrastColor(heroLeftBg) === "light" ? "#faf7f2" : "#2c2218";
  const heroLeftMid = getContrastColor(heroLeftBg) === "light" ? "#d5c9be" : "#9a8070";
  const coleccionBg   = sc["bgColeccion"] ?? BG;
  const coleccionText = getContrastColor(coleccionBg) === "light" ? "#faf7f2" : "#2c2218";
  const coleccionMid  = getContrastColor(coleccionBg) === "light" ? "#d5c9be" : "#9a8070";
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
  const [carouselIdx,         setCarouselIdx]         = useState(0);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [announcementIdx,     setAnnouncementIdx]     = useState(0);
  const [openPolicyField,     setOpenPolicyField]     = useState<string | null>(null);
  const [isMobile,            setIsMobile]            = useState(false);
  const [reelIndex,           setReelIndex]           = useState(0);
  const [mobileMenuOpen,      setMobileMenuOpen]      = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

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

  const selectedVariantStock = useMemo(() => {
    if (!modalProduct?.variants.length) return null;
    const v = modalProduct.variants.find(v => {
      try {
        const a = JSON.parse(v.name);
        if (a && typeof a === "object") {
          const vals = Object.values(a).map((x: any) => String(x).toLowerCase());
          const sizeOk = !selectedSize  || vals.includes(selectedSize.toLowerCase());
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
    if (!showAnnouncement) return;
    const interval = setInterval(() => {
      setAnnouncementIdx(i => (i + 1) % ANNOUNCEMENT_MESSAGES.length);
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
      try { const a = JSON.parse(v.name); return typeof a === "object" && Object.values(a).some((x: any) => String(x).toLowerCase() === selectedColor.toLowerCase()); } catch { return false; }
    });
    if (!colorVariants.length) return;
    const best = colorVariants.find(v => v.stock > 0) ?? colorVariants[0];
    try {
      const a = JSON.parse(best.name);
      const sizeKey = Object.keys(a).find(k => SIZE_ATTRS.includes(k.toLowerCase()));
      if (sizeKey && a[sizeKey] && a[sizeKey] !== selectedSize) setSelectedSize(a[sizeKey]);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColor, modalProduct?.id]);

  // Al cambiar talle: sync color + imagen si el combo talle+color actual no existe
  useEffect(() => {
    if (!modalProduct || !selectedSize) return;
    if (selectedColor) {
      const hasCombo = modalProduct.variants.some(v => {
        try {
          const a = JSON.parse(v.name);
          if (typeof a !== "object") return false;
          const vals = Object.values(a).map((x: any) => String(x).toLowerCase());
          return vals.includes(selectedSize.toLowerCase()) && vals.includes(selectedColor.toLowerCase());
        } catch { return false; }
      });
      if (hasCombo) return;
    }
    const sizeVariants = modalProduct.variants.filter(v => {
      try {
        const a = JSON.parse(v.name);
        if (typeof a !== "object") return false;
        return Object.entries(a).some(([k, val]: any) => SIZE_ATTRS.includes(k.toLowerCase()) && String(val).toLowerCase() === selectedSize.toLowerCase());
      } catch { return false; }
    });
    if (!sizeVariants.length) return;
    const best = sizeVariants.find(v => v.stock > 0) ?? sizeVariants[0];
    try {
      const a = JSON.parse(best.name);
      const colorKey = Object.keys(a).find((k: string) => ["color","colour","colores","colors","tono"].includes(k.toLowerCase()));
      if (colorKey && a[colorKey]) {
        const newColor = String(a[colorKey]);
        if (newColor !== selectedColor) {
          setSelectedColor(newColor);
          const imgIdx = modalProduct.imageItems.findIndex(
            img => img.variantValue && img.variantValue.toLowerCase() === newColor.toLowerCase()
          );
          if (imgIdx !== -1) setModalImg(imgIdx);
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSize, modalProduct?.id]);

  const CARDS_PER_VIEW = isMobile ? 1 : 3;
  const CAROUSEL_LIMIT = CARDS_PER_VIEW * 2;
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

  const changeCategory = (cat:string) => { setActiveCategory(cat); setCarouselIdx(0); };
  const changeGender = (g: string | null) => { setActiveGender(g); setActiveCategory("Todos"); setCarouselIdx(0); };

  const allFiltered = products.filter(p => {
    if (activeGender && p.gender !== activeGender && p.gender !== "unisex") return false;
    if (activeCategory !== "Todos" && p.category !== activeCategory) return false;
    return true;
  });
  const carouselProducts = allFiltered.slice(0, CAROUSEL_LIMIT);
  const maxIdx      = Math.max(0, carouselProducts.length - CARDS_PER_VIEW);
  const prevSlide   = () => setCarouselIdx(i => Math.max(0, i - 1));
  const nextSlide   = () => setCarouselIdx(i => Math.min(maxIdx, i + 1));

  const iStyle:React.CSSProperties = { display:"block", width:"100%", marginBottom:10, background:"#fff", border:`1px solid #d5c9be`, color:T, padding:"11px 14px", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };
  const onFI = (e:React.FocusEvent<HTMLInputElement|HTMLTextAreaElement>) => (e.target.style.borderColor=A);
  const onBI = (e:React.FocusEvent<HTMLInputElement|HTMLTextAreaElement>) => (e.target.style.borderColor="#d5c9be");

  return (
    <div style={{ fontFamily:"'Helvetica Neue', Arial, sans-serif", background:BG, color:T, minHeight:"100vh" }}>

      {/* ── ANNOUNCEMENT BAR ───────────────────────────────── */}
      {showAnnouncement && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top:0, left: isPreview ? undefined : 0, right: isPreview ? undefined : 0, zIndex:110, height:ANNOUNCEMENT_BAR_H, background:A, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:12, fontWeight:600, color:"#fff", letterSpacing:1 }}>
            <EditableZone field="announcementText" label="Barra de anuncios" noBadge>{ANNOUNCEMENT_MESSAGES[announcementIdx]}</EditableZone>
          </span>
          {/* Dots */}
          <div style={{ position:"absolute", bottom:5, left:"50%", transform:"translateX(-50%)", display:"flex", gap:5 }}>
            {ANNOUNCEMENT_MESSAGES.map((_, i) => (
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
          <button onClick={() => setSearchOpen(false)}
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
                    <img src={p.images[0]} alt={p.name} style={{ width:"100%", aspectRatio:"3/4", objectFit:"cover", display:"block" }}/>
                    <div style={{ padding:"10px 12px" }}>
                      <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:12, margin:"0 0 4px" }}>{p.name}</p>
                      <p style={{ fontSize:13, color:A, fontWeight:700, margin:0 }}>{ocultarPrecios ? "Consultá precio" : fmt(p.price)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {searchQuery.trim().length > 0 && searchResults.length === 0 && (
            <p style={{ color:MID, marginTop:32, fontSize:14 }}>Sin resultados para "{searchQuery}"</p>
          )}
        </div>
      )}

      {/* ── NAVBAR */}
      <nav style={{ position: isPreview ? "sticky" : "fixed", top:announcementBarHeight, left: isPreview ? undefined : 0, right: isPreview ? undefined : 0, zIndex:100, background: scrolled ? "rgba(250,247,242,0.96)" : BG, borderBottom:`1px solid rgba(44,34,24,0.07)`, backdropFilter: scrolled ? "blur(10px)" : "none", transition:"all 0.3s" }}>
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
                onMouseLeave={() => setHoveredNavCat(null)}>
                <button style={{ background:"none", border:"none", fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", color:MID, display:"flex", alignItems:"center", gap:4 }}
                  onMouseEnter={e => (e.currentTarget.style.color = T)}
                  onMouseLeave={e => (e.currentTarget.style.color = MID)}>
                  Categorías <span style={{ fontSize:9, opacity:0.6 }}>▾</span>
                </button>
                {hoveredNavCat && (
                  <>
                  <div style={{ position:"absolute", top:"100%", left:0, right:0, height:10, zIndex:499 }} />
                  <div style={{ position:"absolute", top:"calc(100% + 10px)", left:0, background:"#faf7f2", border:`1px solid rgba(44,34,24,0.12)`, minWidth:180, zIndex:500, padding:"6px 0", boxShadow:"0 12px 40px rgba(44,34,24,0.12)" }}>
                    {categoryList.map(cat => (
                      <button key={cat} onClick={() => { changeCategory(cat); scrollTo("coleccion"); setHoveredNavCat(null); }}
                        style={{ display:"block", width:"100%", background:"none", border:"none", color:T, padding:"9px 16px", fontSize:11, textAlign:"left", cursor:"pointer", letterSpacing:2, textTransform:"uppercase" }}>
                        {cat}
                      </button>
                    ))}
                  </div>
                  </>
                )}
              </div>
              <button onClick={() => { changeGender(activeGender==="mujer" ? null : "mujer"); scrollTo("coleccion"); }}
                style={{ background:"none", border:"none", fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", color: activeGender==="mujer" ? A : MID }}>Mujer</button>
              <button onClick={() => { changeGender(activeGender==="hombre" ? null : "hombre"); scrollTo("coleccion"); }}
                style={{ background:"none", border:"none", fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", color: activeGender==="hombre" ? A : MID }}>Hombre</button>
            </div>
          )}
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {!isMobile && <button onClick={()=>scrollTo("nosotros")} style={{ background:"none", border:"none", color:MID, fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer" }}><EditableZone field="navHistoriaLabel" label="Enlace Nuestra Historia">Nuestra Historia</EditableZone></button>}
            <button onClick={() => setSearchOpen(true)} style={{ background:"none", border:"none", color:T, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            {!isMobile && (
              <button onClick={() => setFavoritesOpen(true)} style={{ background:"none", border:"none", color:T, cursor:"pointer", position:"relative", padding:4, display:"flex", alignItems:"center" }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill={favorites.length > 0 ? A : "none"} stroke={favorites.length > 0 ? A : "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {favorites.length > 0 && <span style={{ position:"absolute", top:-5, right:-5, background:A, color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{favorites.length}</span>}
              </button>
            )}
            <button onClick={()=>setCartOpen(true)} style={{ background:"none", border:"none", color:T, cursor:"pointer", position:"relative", display:"flex", alignItems:"center", padding:4 }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              {cartCount>0 && <span style={{ position:"absolute", top:-5, right:-5, background:A, color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{cartCount}</span>}
            </button>
            {isMobile && (
              <button onClick={() => setMobileMenuOpen(o => !o)} style={{ background:"none", border:"none", color:T, cursor:"pointer", padding:4, display:"flex", alignItems:"center", flexDirection:"column", gap:4 }}>
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
        <div style={{ position: isPreview ? "sticky" : "fixed", top: isPreview ? 0 : 60 + announcementBarHeight, left:0, right:0, bottom:0, background:BG, zIndex:99, overflowY:"auto", paddingTop:8 }}>
          {categoryList.map(cat => (
            <button key={cat} onClick={() => { changeCategory(cat); scrollTo("coleccion"); setMobileMenuOpen(false); }}
              style={{ display:"block", width:"100%", background:"none", border:"none", borderBottom:`1px solid rgba(44,34,24,0.06)`, color:T, padding:"16px 24px", fontSize:13, textAlign:"left", cursor:"pointer", letterSpacing:2, textTransform:"uppercase" }}>
              {cat}
            </button>
          ))}
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
          <button onClick={() => { setFavoritesOpen(true); setMobileMenuOpen(false); }}
            style={{ display:"block", width:"100%", background:"none", border:"none", color:MID, padding:"16px 24px", fontSize:13, textAlign:"left", cursor:"pointer", letterSpacing:2, textTransform:"uppercase" }}>
            Favoritos {favorites.length > 0 && `(${favorites.length})`}
          </button>
        </div>
      )}

      {/* ── HERO — fondo crema con tipografía grande + foto al costado */}
      <section id="inicio" style={{ paddingTop: 60 + announcementBarHeight, minHeight:"100vh", display:"flex", alignItems:"stretch", flexDirection: isMobile ? "column" : "row" }}>
        <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding: isMobile ? "20px 20px 40px" : "80px 80px 80px 80px", maxWidth: isMobile ? "100%" : 600, background:heroLeftBg, position:"relative" }}>
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
            <img src={heroImage1Ov?.url ?? "https://picsum.photos/seed/terra-h1/600/900"} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:`${heroImage1Ov?.posX ?? 50}% ${heroImage1Ov?.posY ?? 50}%`, display:"block" }}/>
            <BgDragHandle imgKey="heroImage1" />
            <EditableImageButton field="heroImage1" label="Imagen hero izquierda" />
          </div>
          <div style={{ overflow:"hidden", position:"relative" }}>
            <img src={heroImage2Ov?.url ?? "https://picsum.photos/seed/terra-h2/600/500"} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:`${heroImage2Ov?.posX ?? 50}% ${heroImage2Ov?.posY ?? 50}%`, display:"block" }}/>
            <BgDragHandle imgKey="heroImage2" />
            <EditableImageButton field="heroImage2" label="Imagen hero superior" />
          </div>
          <div style={{ overflow:"hidden", position:"relative" }}>
            <img src={heroImage3Ov?.url ?? "https://picsum.photos/seed/terra-h3/600/500"} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:`${heroImage3Ov?.posX ?? 50}% ${heroImage3Ov?.posY ?? 50}%`, display:"block" }}/>
            <BgDragHandle imgKey="heroImage3" />
            <EditableImageButton field="heroImage3" label="Imagen hero inferior" />
          </div>
        </div>
      </section>

      {/* ── MAYORISTA — banner "Solicitá tu lista de precios" ── */}
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
        <div style={{ position:"relative" }}>
          {/* área deslizante */}
          <div ref={carouselRef} style={{ overflow:"hidden", padding: isMobile ? "0 16px" : "0 40px" }}>
            <div style={{ display:"flex", gap:20, transition:"transform 0.45s cubic-bezier(.4,0,.2,1)", transform:`translateX(calc(-${carouselIdx} * (100% / ${CARDS_PER_VIEW} + 20px / ${CARDS_PER_VIEW})))` }}>
              {carouselProducts.map(product=>(
                <div key={product.id}
                  style={{ flexShrink:0, width:`calc((100% - ${(CARDS_PER_VIEW-1)*20}px) / ${CARDS_PER_VIEW})`, cursor:"pointer", position:"relative" }}
                  onClick={()=>openModal(product)}>
                  {/* foto */}
                  <div style={{ position:"relative", aspectRatio:"3/4", overflow:"hidden", background:S, marginBottom:16 }}
                    onMouseEnter={e=>{ const img = e.currentTarget.querySelector("img") as HTMLImageElement; if(img) img.style.transform="scale(1.05)"; }}
                    onMouseLeave={e=>{ const img = e.currentTarget.querySelector("img") as HTMLImageElement; if(img) img.style.transform="scale(1)"; }}>
                    <img src={product.images[0]} alt={product.name} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform 0.55s ease" }}/>
                    {product.comparePrice && (
                      <div style={{ position:"absolute", top:14, left:14, background:A, color:"#fff", fontSize:9, fontWeight:600, letterSpacing:2, padding:"4px 10px", textTransform:"uppercase" }}>Oferta</div>
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
            style={{ display:"inline-block", border:`1px solid ${T}`, color:T, background:"transparent", padding:"14px 40px", fontSize:11, letterSpacing:3, textTransform:"uppercase", textDecoration:"none", transition:"all 0.2s", fontFamily:"Georgia, serif", fontStyle:"italic" }}
            onMouseEnter={e=>{ e.currentTarget.style.background=T; e.currentTarget.style.color=coleccionBg; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T; }}>
            Ver colección completa
          </a>
        </div>
      </section>

      {/* ── NOSOTROS — imagen full width + texto encima */}
      <section id="nosotros" data-reveal style={{ background:nosotrosBg, position:"relative" }}>
        <EditableSectionBg field="bgNosotros" label="Fondo nosotros" />
        {/* foto ancha */}
        <div style={{ position:"relative", height:400, overflow:"hidden" }}>
          <img src={nosotrosImageOv?.url ?? "https://picsum.photos/seed/terra-about/1920/600"} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:`${nosotrosImageOv?.posX ?? 50}% ${nosotrosImageOv?.posY ?? 35}%` }}/>
          <BgDragHandle imgKey="nosotrosImage" />
          <EditableImageButton field="nosotrosImage" label="Imagen nosotros" />
          <div style={{ position:"absolute", inset:0, background:"rgba(44,34,24,0.45)" }}/>
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
            <p style={{ fontSize:15, color:nosotrosText, lineHeight:1.9, marginBottom:20 }}><EditableZone field="aboutParagraph1" label="Párrafo 1 'Nosotros'" block>Terra nació en Mendoza en 2019 como un pequeño taller de confección artesanal. Hoy somos un equipo de 12 personas que diseña, tiñe y cose cada prenda con materiales de origen responsable.</EditableZone></p>
            <p style={{ fontSize:15, color:nosotrosMid, lineHeight:1.9 }}><EditableZone field="aboutParagraph2" label="Párrafo 2 'Nosotros'" block>Trabajamos con productores locales de lino, alpaca y algodón orgánico. Nuestras tinturas son 100% vegetales: cúrcuma, añil, madreselva y cochinilla.</EditableZone></p>
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

      {/* ── CONTACTO — imagen de fondo + form superpuesto */}
      <section id="contacto" data-reveal style={{ position:"relative", overflow:"hidden" }}>
        <img src={contactBgOv?.url ?? "https://picsum.photos/seed/terra-contact/1920/700"} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:`${contactBgOv?.posX ?? 50}% ${contactBgOv?.posY ?? 60}%` }}/>
        <BgDragHandle imgKey="contactBackground" />
        <EditableImageButton field="contactBackground" label="Imagen fondo contacto" />
        <div style={{ position:"absolute", inset:0, background:"rgba(250,247,242,0.88)" }}/>
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
        <div style={{ borderTop:`1px solid rgba(44,34,24,0.07)`, padding: isMobile ? "16px" : "16px 40px", maxWidth:1280, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"8px 24px" }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"0 16px" }}>
            {[
              { label: "Política de devoluciones", tipo: "devoluciones", policyField: "policyReturns" },
              { label: "Política de envíos",       tipo: "envios",       policyField: "policyShipping" },
              { label: "Términos y condiciones",   tipo: "terminos",     policyField: "policyTerms" },
            ].map(({ label, tipo, policyField }) => (
              editMode ? (
                <button key={tipo} type="button" onClick={() => setOpenPolicyField(policyField)}
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
          <p style={{ fontSize:11, color:footerMid, margin:0, opacity:0.6 }}>
            <EditableZone field="footerCopyright" label="Copyright">© 2025 Terra · Moda consciente · Mendoza, Argentina</EditableZone>
          </p>

        </div>
        </div>
      </footer>

      {openPolicyField && (
        <PolicyEditorModal field={openPolicyField} onClose={() => setOpenPolicyField(null)} />
      )}

      {/* ── MODAL PRODUCTO */}
      {modalProduct && (
        <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setModalProduct(null)}>
          <div style={{ position:"absolute", inset:0, background:"rgba(44,34,24,0.65)", backdropFilter:"blur(8px)" }}/>
          <div style={{ position:"relative", background:"#fff", maxWidth:920, width:"calc(100% - 32px)", maxHeight:"92vh", overflow:"auto", display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }} onClick={e=>e.stopPropagation()}>
            <div>
              <div style={{ position:"relative" }}>
                <img src={modalProduct.images[modalImg]} alt="" style={{ width:"100%", aspectRatio:"3/4", objectFit:"cover", display:"block" }}/>
                {modalProduct.images.length > 1 && (<>
                  <button onClick={() => setModalImg(i => (i - 1 + modalProduct.images.length) % modalProduct.images.length)}
                    style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.85)", border:"none", width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>‹</button>
                  <button onClick={() => setModalImg(i => (i + 1) % modalProduct.images.length)}
                    style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.85)", border:"none", width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>›</button>
                </>)}
              </div>
              <div style={{ display:"flex", gap:8, padding:"10px 14px", background:S }}>
                {modalProduct.images.map((img,i)=>(
                  <button key={i} onClick={()=>setModalImg(i)} style={{ width:52, height:52, padding:2, border:i===modalImg?`2px solid ${A}`:"2px solid transparent", background:"none", cursor:"pointer" }}>
                    <img src={img} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding:"40px 36px", display:"flex", flexDirection:"column", gap:18 }}>
              <button onClick={()=>setModalProduct(null)} style={{ alignSelf:"flex-end", background:"none", border:`1px solid rgba(44,34,24,0.2)`, color:T, width:32, height:32, cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
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
                <button onClick={() => whatsappShare(modalProduct)}
                  style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"1px solid rgba(37,211,102,0.3)", color:"rgba(37,211,102,0.7)", padding:"5px 12px", fontSize:10, letterSpacing:1, cursor:"pointer", transition:"color 0.2s" }}
                  onMouseEnter={e=>(e.currentTarget.style.color="#25D366")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(37,211,102,0.7)")}>
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M11.897 0C5.395 0 .13 5.266.13 11.767c0 2.078.545 4.03 1.495 5.727L.057 24l6.7-1.757A11.71 11.71 0 0 0 11.897 23.534c6.503 0 11.768-5.265 11.768-11.767C23.67 5.266 18.4 0 11.897 0zm0 21.536h-.004a9.726 9.726 0 0 1-4.96-1.358l-.356-.211-3.678.965.982-3.581-.232-.368A9.73 9.73 0 0 1 2.158 11.767C2.158 6.355 6.551 2 11.897 2c2.581 0 5.007 1.007 6.831 2.831a9.604 9.604 0 0 1 2.828 6.83c0 5.347-4.393 9.875-9.659 9.875z"/></svg>
                  WhatsApp
                </button>
              </div>
              <div style={{ display:"flex", gap:12, alignItems:"baseline" }}>
                <span style={{ fontSize:22, fontWeight:700, color:A }}>{ocultarPrecios ? "Consultá precio" : fmt(modalProduct.price)}</span>
                {!ocultarPrecios && modalProduct.comparePrice && <span style={{ fontSize:14, color:MID, textDecoration:"line-through" }}>{fmt(modalProduct.comparePrice)}</span>}
              </div>
              <p style={{ fontSize:13, color:MID, lineHeight:1.8, borderTop:`1px solid rgba(44,34,24,0.07)`, paddingTop:14 }}>{modalProduct.description}</p>
              <div>
                <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", marginBottom:8, color:MID }}>Color: <strong style={{ color:T }}>{selectedColor}</strong></p>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {modalProduct.colors.map(c=>(
                    <button key={c} onClick={()=>setSelectedColor(c)}
                      style={{ padding:"6px 14px", fontSize:11, border:selectedColor===c?`1.5px solid ${A}`:"1px solid rgba(44,34,24,0.18)", background:selectedColor===c?"rgba(181,101,42,0.08)":"transparent", color:T, cursor:"pointer" }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", marginBottom:8, color:MID }}>Talle: <strong style={{ color:T }}>{selectedSize}</strong></p>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {modalProduct.sizes.map(s=>(
                    <button key={s} onClick={()=>setSelectedSize(s)}
                      style={{ width:46, height:46, fontSize:12, border:selectedSize===s?`1.5px solid ${A}`:"1px solid rgba(44,34,24,0.18)", background:selectedSize===s?"rgba(181,101,42,0.08)":"transparent", color:T, cursor:"pointer" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <span style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:MID }}>Cantidad</span>
                <div style={{ display:"flex", alignItems:"center", border:`1px solid rgba(44,34,24,0.18)` }}>
                  <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{ width:36, height:36, background:"none", border:"none", color:T, fontSize:18, cursor:"pointer" }}>−</button>
                  <span style={{ width:36, textAlign:"center", fontSize:14 }}>{qty}</span>
                  <button onClick={()=>setQty(q=>q+1)} style={{ width:36, height:36, background:"none", border:"none", color:T, fontSize:18, cursor:"pointer" }}>+</button>
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
              {isInquiryMode ? (
                <button onClick={() => openInquiry(modalProduct)} style={{ background:A, color:"#fff", border:"none", padding:"15px", fontSize:11, letterSpacing:4, textTransform:"uppercase", cursor:"pointer", marginTop:"auto" }}>
                  Consultar disponibilidad
                </button>
              ) : (
              <button onClick={addToCart} disabled={selectedVariantStock === 0}
                style={{ background: selectedVariantStock === 0 ? "rgba(181,101,42,0.3)" : A, color:"#fff", border:"none", padding:"15px", fontSize:11, letterSpacing:4, textTransform:"uppercase", cursor: selectedVariantStock === 0 ? "not-allowed" : "pointer", marginTop:"auto" }}>
                {selectedVariantStock === 0 ? "Sin stock" : `Agregar al Carrito · ${fmt(modalProduct.price*qty)}`}
              </button>
              )}

              {/* Reseñas — D-04 */}
              <div style={{ borderTop:`1px solid rgba(44,34,24,0.1)`, paddingTop:20, marginTop:20 }}>
                <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:14, color:T, margin:"0 0 14px" }}>
                  Reseñas{reviews.length > 0 && ` (${reviews.length})`}
                </p>
                {reviewsLoading ? (
                  <p style={{ fontSize:12, color:MID }}>Cargando...</p>
                ) : reviews.length > 0 ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:20 }}>
                    {reviews.map(r => (
                      <div key={r.id} style={{ borderBottom:`1px solid rgba(44,34,24,0.07)`, paddingBottom:14 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontSize:12, fontWeight:600, color:T }}>{r.reviewer}</span>
                          <span style={{ fontSize:14, color:A }}>{[1,2,3,4,5].map(s => s <= r.rating ? "★" : "☆").join("")}</span>
                        </div>
                        {r.comment && <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:12, color:MID, margin:0, lineHeight:1.7 }}>{r.comment}</p>}
                      </div>
                    ))}
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
                      <input value={reviewForm.reviewer} onChange={e => !isPreview && setReviewForm(p => ({ ...p, reviewer: e.target.value }))}
                        placeholder="Tu nombre" readOnly={isPreview}
                        style={{ border:`1px solid rgba(44,34,24,0.2)`, padding:"9px 12px", fontSize:12, outline:"none", background:"#faf7f2" }} />
                      <div style={{ display:"flex", gap:4 }}>
                        {[1,2,3,4,5].map(s => (
                          <button key={s} type="button" onClick={() => !isPreview && setReviewForm(p => ({ ...p, rating: s }))}
                            style={{ background:"none", border:"none", fontSize:20, cursor: isPreview ? "default" : "pointer", color: s <= reviewForm.rating ? A : "rgba(44,34,24,0.2)", padding:"2px" }}>★</button>
                        ))}
                      </div>
                      <textarea value={reviewForm.comment} onChange={e => !isPreview && setReviewForm(p => ({ ...p, comment: e.target.value }))}
                        placeholder="Comentario (opcional)" rows={3} readOnly={isPreview}
                        style={{ border:`1px solid rgba(44,34,24,0.2)`, padding:"9px 12px", fontSize:12, resize:"none", outline:"none", background:"#faf7f2" }} />
                      <button type="submit" disabled={isPreview || !reviewForm.reviewer.trim()}
                        style={{ background: isPreview || !reviewForm.reviewer.trim() ? "rgba(181,101,42,0.3)" : A, color:"#fff", border:"none", padding:"12px", fontSize:11, letterSpacing:3, textTransform:"uppercase", cursor: isPreview ? "default" : "pointer" }}>
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
      )}

      {/* ── CARRITO */}
      <div style={{ position:"fixed", inset:0, zIndex:150, pointerEvents:cartOpen?"auto":"none" }}>
        <div onClick={()=>setCartOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(44,34,24,0.4)", opacity:cartOpen?1:0, transition:"opacity 0.3s" }}/>
        <div style={{ position:"absolute", top:0, right:0, bottom:0, width: isMobile ? "100vw" : 400, background:"#fff", transform:cartOpen?"translateX(0)":"translateX(100%)", transition:"transform 0.35s cubic-bezier(.4,0,.2,1)", display:"flex", flexDirection:"column", borderLeft:`1px solid rgba(44,34,24,0.08)` }}>
          <div style={{ padding:"20px 24px 14px", borderBottom:`1px solid rgba(44,34,24,0.06)`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:18, margin:0, color:T }}>Tu carrito <span style={{ fontStyle:"normal", fontSize:13, color:MID, fontFamily:"'Helvetica Neue', sans-serif" }}>({cartCount})</span></p>
            <button onClick={()=>setCartOpen(false)} style={{ background:"none", border:"none", color:T, fontSize:22, cursor:"pointer" }}>×</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"14px 24px" }}>
            {cartItems.length===0
              ? <div style={{ textAlign:"center", padding:"52px 0", color:MID }}><p style={{ fontSize:32, marginBottom:12 }}>🌿</p><p style={{ fontSize:13, lineHeight:1.8 }}>Tu carrito está vacío.<br/>Explorá la colección.</p></div>
              : cartItems.map((item,idx)=>(
                <div key={idx} style={{ display:"flex", gap:14, padding:"14px 0", borderBottom:`1px solid rgba(44,34,24,0.05)` }}>
                  <img src={item.product.images[0]} alt="" style={{ width:64, height:86, objectFit:"cover", flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:14, margin:"0 0 3px", color:T }}>{item.product.name}</p>
                    <p style={{ fontSize:11, color:MID, margin:"0 0 10px" }}>{item.color} · Talle {item.size}</p>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ display:"flex", alignItems:"center", border:`1px solid rgba(44,34,24,0.12)` }}>
                        <button onClick={()=>updateQty(idx,-1)} style={{ width:26, height:26, background:"none", border:"none", color:T, cursor:"pointer", fontSize:15 }}>−</button>
                        <span style={{ width:22, textAlign:"center", fontSize:13 }}>{item.qty}</span>
                        <button onClick={()=>updateQty(idx,1)} style={{ width:26, height:26, background:"none", border:"none", color:T, cursor:"pointer", fontSize:15 }}>+</button>
                      </div>
                      <span style={{ fontWeight:700, fontSize:14, color:A }}>{fmt(item.product.price*item.qty)}</span>
                    </div>
                  </div>
                  <button onClick={()=>removeFromCart(idx)} style={{ background:"none", border:"none", color:MID, cursor:"pointer", fontSize:17, alignSelf:"flex-start" }}
                    onMouseEnter={e=>(e.currentTarget.style.color=T)} onMouseLeave={e=>(e.currentTarget.style.color=MID)}>×</button>
                </div>
              ))
            }
          </div>
          {cartItems.length>0 && (
            <div style={{ padding:"14px 24px 28px", borderTop:`1px solid rgba(44,34,24,0.06)` }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:18 }}>
                <span style={{ fontSize:13, color:T }}>Total</span>
                <span style={{ fontSize:20, fontWeight:700, color:A }}>{fmt(cartTotal)}</span>
              </div>
              {wholesaleWarnings.length > 0 && (
                <div style={{ marginBottom:12, padding:"10px 14px", background:"rgba(234,179,8,0.07)", borderLeft:"3px solid #eab308", borderRadius:"0 6px 6px 0" }}>
                  <p style={{ fontSize:11, margin:0, color:"#ca8a04", fontWeight:600 }}>Cantidad mínima no alcanzada</p>
                  {wholesaleWarnings.map((item, i) => (
                    <p key={i} style={{ fontSize:10, margin:"4px 0 0", color:"rgba(44,34,24,0.5)" }}>
                      {item.product.name}: mín. {item.product.cantMinMayorista} uds.
                    </p>
                  ))}
                </div>
              )}
              <button onClick={blockBuy ? undefined : openCheckout} disabled={blockBuy} title={isOwner ? "No podés comprar en tu propia tienda" : isPreview ? "No disponible en modo edición" : undefined} style={{ width:"100%", background: blockBuy ? "rgba(181,101,42,0.2)" : A, color: blockBuy ? "rgba(44,34,24,0.3)" : "#fff", border:"none", padding:"14px", fontSize:11, letterSpacing:4, textTransform:"uppercase", cursor: blockBuy ? "not-allowed" : "pointer", marginBottom:8 }}>{isOwner ? "No disponible para el dueño" : isPreview ? "Solo en la tienda real" : "Finalizar Compra"}</button>
              <button onClick={()=>setCartOpen(false)} style={{ width:"100%", background:"transparent", color:T, border:`1px solid rgba(44,34,24,0.2)`, padding:"12px", fontSize:10, letterSpacing:3, textTransform:"uppercase", cursor:"pointer" }}>Seguir Comprando</button>
              {storeConfig?.whatsapp?.enabled && storeConfig.whatsapp.number && (
                <a
                  href={`https://wa.me/${storeConfig.whatsapp.number.replace(/\D/g,"")}`}
                  target="_blank" rel="noreferrer"
                  style={{ display:"flex", alignItems:"center", gap:10, marginTop:12, padding:"10px 14px", background:"rgba(37,211,102,0.07)", borderRadius:6, textDecoration:"none", border:"1px solid rgba(37,211,102,0.2)" }}
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="#25D366" style={{ flexShrink:0 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  <div>
                    <p style={{ fontSize:10, margin:0, color:"rgba(44,34,24,0.45)", letterSpacing:1 }}>¿Tenés dudas?</p>
                    <p style={{ fontSize:12, margin:0, color:"#25D366", fontWeight:600 }}>Consultá por WhatsApp</p>
                  </div>
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── FAVORITES DRAWER ───────────────────────────────── */}
      <div style={{ position:"fixed", inset:0, zIndex:155, pointerEvents: favoritesOpen ? "auto" : "none" }}>
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
                  <img src={product.images[0]} alt="" style={{ width:64, height:86, objectFit:"cover", flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:14, margin:"0 0 4px", color:T }}>{product.name}</p>
                    <p style={{ fontSize:13, color:A, fontWeight:700, margin:"0 0 10px" }}>{ocultarPrecios ? "Consultá precio" : fmt(product.price)}</p>
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

      {/* ── CHECKOUT */}
      {checkoutOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:300, display:"flex", justifyContent:"flex-end" }}>
          <div onClick={()=>setCheckoutOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(44,34,24,0.5)", backdropFilter:"blur(6px)" }}/>
          <div style={{ position:"relative", width:480, maxWidth:"100vw", height:"100vh", background:"#fff", display:"flex", flexDirection:"column", borderLeft:`1px solid rgba(44,34,24,0.1)` }}>
            <div style={{ padding:"20px 28px 14px", borderBottom:`1px solid rgba(44,34,24,0.07)`, display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexShrink:0 }}>
              <div>
                <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:18, margin:"0 0 4px", color:T }}>Checkout</p>
                <p style={{ fontSize:11, color:MID, margin:0, letterSpacing:1 }}>Pedido para Terra</p>
              </div>
              <button onClick={()=>setCheckoutOpen(false)} style={{ background:"none", border:"none", color:T, fontSize:22, cursor:"pointer" }}>×</button>
            </div>
            {checkoutStatus==="done" ? (
              <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:48, textAlign:"center" }}>
                <div style={{ width:60, height:60, borderRadius:"50%", border:`1.5px solid ${A}`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
                  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={A} strokeWidth={2} strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:22, color:T, marginBottom:10 }}>¡Pedido recibido!</p>
                <p style={{ fontSize:13, color:MID, lineHeight:1.8, marginBottom:28 }}>Te contactamos a la brevedad para confirmar.</p>
                <button onClick={()=>{ setCheckoutOpen(false); setCheckoutStatus("idle"); }}
                  style={{ background:A, color:"#fff", border:"none", padding:"13px 32px", fontSize:11, letterSpacing:3, textTransform:"uppercase", cursor:"pointer" }}>
                  Seguir comprando
                </button>
              </div>
            ) : (
              <form onSubmit={handlePlaceOrder} style={{ flex:1, display:"flex", flexDirection:"column", overflowY:"auto" }}>
                <div style={{ padding:"20px 28px", flex:1 }}>
                  {cartItems.map((item,idx)=>(
                    <div key={idx} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:`1px solid rgba(44,34,24,0.05)` }}>
                      <img src={item.product.images[0]} alt="" style={{ width:50, height:66, objectFit:"cover", flexShrink:0 }}/>
                      <div style={{ flex:1 }}>
                        <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:13, margin:"0 0 2px", color:T }}>{item.product.name}</p>
                        <p style={{ fontSize:11, color:MID, margin:"0 0 4px" }}>Talle {item.size} · {item.color}</p>
                        <p style={{ fontSize:13, color:A, fontWeight:700, margin:0 }}>{fmt(item.product.price)}</p>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", border:`1px solid rgba(44,34,24,0.12)`, height:26, flexShrink:0 }}>
                        <button type="button" onClick={()=>updateQty(idx,-1)} style={{ width:26, height:26, background:"none", border:"none", color:T, cursor:"pointer", fontSize:14 }}>−</button>
                        <span style={{ width:22, textAlign:"center", fontSize:12 }}>{item.qty}</span>
                        <button type="button" onClick={()=>updateQty(idx,1)} style={{ width:26, height:26, background:"none", border:"none", color:T, cursor:"pointer", fontSize:14 }}>+</button>
                      </div>
                    </div>
                  ))}
                  <p style={{ fontSize:12, fontWeight:600, color:T, margin:"20px 0 10px", letterSpacing:1 }}>Datos del comprador</p>
                  {([["nombre","Nombre y apellido","text"],["email","Email","email"],["telefono","Teléfono","tel"],["direccion","Dirección","text"]] as const).map(([f,ph,t])=>(
                    <input key={f} required type={t} placeholder={ph} value={buyerForm[f]} onChange={e=>setBuyerForm(p=>({...p,[f]:e.target.value}))} style={iStyle} onFocus={onFI} onBlur={onBI}/>
                  ))}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                    {([["ciudad","Ciudad"],["provincia","Provincia"]] as const).map(([f,ph])=>(
                      <input key={f} required placeholder={ph} value={buyerForm[f]} onChange={e=>setBuyerForm(p=>({...p,[f]:e.target.value}))}
                        style={{ background:"#fff", border:`1px solid #d5c9be`, color:T, padding:"11px 14px", fontSize:13, outline:"none", boxSizing:"border-box" as const }}
                        onFocus={onFI} onBlur={onBI}/>
                    ))}
                  </div>
                  <input placeholder="Código postal" value={buyerForm.cp} onChange={e=>setBuyerForm(p=>({...p,cp:e.target.value}))} style={iStyle} onFocus={onFI} onBlur={onBI}/>
                  <label style={{ display:"flex", alignItems:"center", gap:10, fontSize:12, color:MID, cursor:"pointer", marginBottom:20 }}>
                    <input type="checkbox" checked={rememberData} onChange={e=>setRememberData(e.target.checked)} style={{ accentColor:A }}/>
                    Recordar mis datos
                  </label>
                  <p style={{ fontSize:12, fontWeight:600, color:T, marginBottom:10, letterSpacing:1 }}>Envío</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:20 }}>
                    {ENVIO_OPTIONS.map(opt=>(
                      <label key={opt.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", border:`1px solid ${envioId===opt.id?A:"rgba(44,34,24,0.14)"}`, cursor:"pointer", transition:"border-color 0.2s" }}>
                        <span style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <input type="radio" name="envio" value={opt.id} checked={envioId===opt.id} onChange={()=>setEnvioId(opt.id)} style={{ accentColor:A }}/>
                          <span style={{ fontSize:13, color:T }}>{opt.label}</span>
                        </span>
                        <span style={{ fontSize:13, fontWeight:700, color:opt.price===0?A:T }}>{opt.price===0?"Gratis":fmt(opt.price)}</span>
                      </label>
                    ))}
                  </div>
                  <p style={{ fontSize:12, fontWeight:600, color:T, marginBottom:10, letterSpacing:1 }}>Pago</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:20 }}>
                    {PAGO_OPTIONS.map(opt=>(
                      <label key={opt.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", border:`1px solid ${pagoId===opt.id?A:"rgba(44,34,24,0.14)"}`, cursor:"pointer", transition:"border-color 0.2s" }}>
                        <input type="radio" name="pago" value={opt.id} checked={pagoId===opt.id} onChange={()=>setPagoId(opt.id)} style={{ accentColor:A }}/>
                        <span style={{ fontSize:13, color:T }}>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  <textarea placeholder="Notas para la tienda" rows={3} value={notas} onChange={e=>setNotas(e.target.value)}
                    style={{ display:"block", width:"100%", marginBottom:16, background:"#fff", border:`1px solid #d5c9be`, color:T, padding:"11px 14px", fontSize:13, outline:"none", resize:"vertical", fontFamily:"inherit", boxSizing:"border-box" }}
                    onFocus={onFI} onBlur={onBI}/>
                  <div style={{ display:"flex", marginBottom:20 }}>
                    <input placeholder="CÓDIGO DE CUPÓN" value={coupon} onChange={e=>setCoupon(e.target.value)}
                      style={{ flex:1, background:"#fff", border:`1px solid #d5c9be`, borderRight:"none", color:T, padding:"11px 14px", fontSize:11, letterSpacing:2, outline:"none" }}
                      onFocus={onFI} onBlur={onBI}/>
                    <button type="button" onClick={handleApplyCoupon} style={{ background:"transparent", border:`1px solid #d5c9be`, color:A, padding:"11px 16px", fontSize:11, letterSpacing:2, cursor:"pointer" }}>Aplicar</button>
                  </div>
                  {couponError && <p style={{ fontSize:11, color:"#dc2626", marginBottom:8, marginTop:-12 }}>{couponError}</p>}
                  {appliedCoupon && (
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, padding:"8px 12px", background:`rgba(181,101,42,0.08)`, border:`1px solid rgba(181,101,42,0.2)` }}>
                      <span style={{ fontSize:12, color:A }}>Cupón {appliedCoupon.code} aplicado</span>
                      <button type="button" onClick={()=>setAppliedCoupon(null)} style={{ background:"none", border:"none", color:MID, cursor:"pointer", fontSize:12 }}>✕</button>
                    </div>
                  )}
                  <div style={{ borderTop:`1px solid rgba(44,34,24,0.07)`, paddingTop:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontSize:13, color:MID }}>Subtotal</span><span style={{ fontSize:13, color:MID }}>{fmt(cartTotal)}</span>
                    </div>
                    {couponDiscount > 0 && (
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                        <span style={{ fontSize:13, color:A }}>Descuento cupón</span><span style={{ fontSize:13, color:A }}>-{fmt(couponDiscount)}</span>
                      </div>
                    )}
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                      <span style={{ fontSize:13, color:MID }}>Envío</span><span style={{ fontSize:13, color:MID }}>{envioPrice===0?"Gratis":fmt(envioPrice)}</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ fontSize:16, fontWeight:700, color:T }}>Total</span>
                      <span style={{ fontSize:20, fontWeight:800, color:A }}>{fmt(orderTotal)}</span>
                    </div>
                    {checkoutError && <p style={{ fontSize:12, color:"#dc2626", marginTop:10 }}>{checkoutError}</p>}
                  </div>
                </div>
                <div style={{ padding:"14px 28px 24px", borderTop:`1px solid rgba(44,34,24,0.07)`, flexShrink:0 }}>
                  <button type="submit" disabled={checkoutStatus==="placing"}
                    style={{ width:"100%", background:A, color:"#fff", border:"none", padding:"15px", fontSize:11, letterSpacing:4, textTransform:"uppercase", cursor:"pointer", opacity:checkoutStatus==="placing"?0.7:1 }}>
                    {checkoutStatus==="placing"?"Procesando...":"Crear pedido"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── WHATSAPP BUTTON ────────────────────────────────── */}
      {(!storeConfig || storeConfig.whatsapp.enabled) && (
        <EditableFixed field="whatsapp" label="WhatsApp" bottom={24} right={24}>
          <button
            onClick={() => window.open(`https://wa.me/${(storeConfig?.whatsapp.number ?? "5491100000000").replace(/\D/g,"")}`, "_blank")}
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
