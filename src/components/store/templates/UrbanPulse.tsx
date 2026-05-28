"use client";
import { useState, useEffect, useRef } from "react";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { EditableZone, EditableFixed, EditableImageButton, EditableSectionBg, BgDragHandle, getContrastColor } from "@/contexts/EditContext";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";

type Product = StorefrontProduct;
type CartItem = { product: Product; size: string; color: string; variantId: string | null; qty: number };
type ContactStatus = "idle" | "sending" | "sent";
type CheckoutStatus = "idle" | "placing" | "done";

const CATEGORIES = ["Todos", "Mujer", "Hombre", "Accesorios"];

const ENVIO_OPTIONS = [
  { id:"retiro",   label:"Retiro en tienda",         price:0 },
  { id:"estandar", label:"Envío estándar",            price:3500 },
  { id:"express",  label:"Envío express (24hs)",      price:6500 },
];
const PAGO_OPTIONS = [
  { id:"transferencia", label:"Transferencia bancaria" },
  { id:"retirar",       label:"Pago al retirar / acordar" },
];

const TESTIMONIALS = [
  { name:"Valentina R.", text:"La calidad es increíble, se nota que es para alto rendimiento. Volví a comprar dos veces este mes.", stars:5 },
  { name:"Marcos D.", text:"El hoodie de training es lo mejor que compré. Cómodo, liviano y se ve súper bien en el gym.", stars:5 },
  { name:"Lucía P.", text:"Los leggings seamless no se corren ni se transparentan. Perfectos para cualquier entrenamiento.", stars:5 },
  { name:"Ignacio M.", text:"Atención rápida y envío en 48hs. Los shorts son de primera calidad.", stars:4 },
];

const TICKER = "NUEVA COLECCIÓN · ENVÍO GRATIS +$30.000 · 30 DÍAS DE CAMBIO · 6 CUOTAS SIN INTERÉS · ";

const GARANTIAS = [
  { title:"Envío gratis", desc:"En compras +$30.000", svg:<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
  { title:"30 días de cambio", desc:"Sin cargo", svg:<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16"/><polyline points="21 3 21 8 16 8"/><polyline points="3 21 3 16 8 16"/></svg> },
  { title:"Pago seguro", desc:"100% protegido", svg:<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg> },
  { title:"Soporte 24/7", desc:"Siempre disponibles", svg:<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
];

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior:"smooth" });

export default function UrbanPulse() {
  const [scrolled,         setScrolled]         = useState(false);
  const [activeCategory,   setActiveCategory]   = useState("Todos");
  const [cartItems,        setCartItems]        = useState<CartItem[]>([]);
  const [cartOpen,         setCartOpen]         = useState(false);
  const [modalProduct,     setModalProduct]     = useState<Product | null>(null);
  const [modalImg,         setModalImg]         = useState(0);
  const [selectedSize,     setSelectedSize]     = useState("");
  const [selectedColor,    setSelectedColor]    = useState("");
  const [qty,              setQty]              = useState(1);
  const [contactStatus,    setContactStatus]    = useState<ContactStatus>("idle");
  const [contactForm,      setContactForm]      = useState({ nombre:"", email:"", mensaje:"" });
  const [toastMsg,         setToastMsg]         = useState<string | null>(null);
  const [visibleCount,     setVisibleCount]     = useState(8);
  const [checkoutOpen,     setCheckoutOpen]     = useState(false);
  const [checkoutStatus,   setCheckoutStatus]   = useState<CheckoutStatus>("idle");
  const [envioId,          setEnvioId]          = useState("retiro");
  const [pagoId,           setPagoId]           = useState("transferencia");
  const [coupon,           setCoupon]           = useState("");
  const [couponError,      setCouponError]      = useState("");
  const [appliedCoupon,    setAppliedCoupon]    = useState<{ id: string; code: string; discount: number } | null>(null);
  const [checkoutError,    setCheckoutError]    = useState("");
  const [notas,            setNotas]            = useState("");
  const [rememberData,     setRememberData]     = useState(false);
  const [buyerForm,        setBuyerForm]        = useState({ nombre:"", email:"", telefono:"", direccion:"", ciudad:"", provincia:"", cp:"" });
  const [searchOpen,       setSearchOpen]       = useState(false);
  const [searchQuery,      setSearchQuery]      = useState("");
  const [favorites,        setFavorites]        = useState<string[]>([]);
  const [favoritesOpen,    setFavoritesOpen]    = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const userDropdownRef = useRef<HTMLDivElement>(null);

  const storeConfig = useStoreConfig();
  const { products, resolveVariantId, validateCoupon, placeOrder } = useStorefront();

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

  const fmt = (n: number) => "$" + n.toLocaleString("es-AR");

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") { setSearchOpen(false); setModalProduct(null); } };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node))
        setUserDropdownOpen(false);
    };
    if (userDropdownOpen) document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [userDropdownOpen]);

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 2500); };

  const openModal = (p: Product) => {
    setModalProduct(p); setModalImg(0);
    setSelectedSize(p.sizes[0]); setSelectedColor(p.colors[0]); setQty(1);
    setSearchOpen(false);
  };

  const addToCart = () => {
    if (!modalProduct) return;
    const variantId = resolveVariantId(modalProduct, selectedSize, selectedColor);
    setCartItems(prev => {
      const ex = prev.find(i => i.product.id === modalProduct.id && i.size === selectedSize && i.color === selectedColor);
      if (ex) return prev.map(i => i === ex ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { product: modalProduct, size: selectedSize, color: selectedColor, variantId, qty }];
    });
    showToast(`${modalProduct.name} agregado`);
    setModalProduct(null);
    setCartOpen(true);
  };

  const removeFromCart = (idx: number) => setCartItems(prev => prev.filter((_, i) => i !== idx));
  const updateQty = (idx: number, delta: number) =>
    setCartItems(prev => prev.map((item, i) => i === idx ? { ...item, qty: Math.max(1, item.qty + delta) } : item));

  const cartTotal      = cartItems.reduce((s, i) => s + i.product.price * i.qty, 0);
  const cartCount      = cartItems.reduce((s, i) => s + i.qty, 0);
  const envioPrice     = ENVIO_OPTIONS.find(o => o.id === envioId)?.price ?? 0;
  const couponDiscount = appliedCoupon?.discount ?? 0;
  const orderTotal     = cartTotal + envioPrice - couponDiscount;

  const openCheckout = () => { setCartOpen(false); setCheckoutStatus("idle"); setCheckoutError(""); setCheckoutOpen(true); };

  const handleApplyCoupon = async () => {
    setCouponError("");
    if (!coupon.trim()) return;
    const subtotal = cartItems.reduce((s, i) => s + i.product.price * i.qty, 0);
    const res = await validateCoupon(coupon, subtotal);
    if ("error" in res) { setCouponError(res.error); return; }
    setAppliedCoupon({ id: res.coupon.id, code: res.coupon.code, discount: res.discount });
    setCoupon("");
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutStatus("placing"); setCheckoutError("");
    const res = await placeOrder({
      cartItems: cartItems.map(item => ({ productId: item.product.id, variantId: item.variantId, quantity: item.qty })),
      customer: { name: buyerForm.nombre, email: buyerForm.email, phone: buyerForm.telefono, street: buyerForm.direccion, city: buyerForm.ciudad, province: buyerForm.provincia, postalCode: buyerForm.cp, notes: notas },
      shippingMethod: envioId === "retiro" ? "pickup" : envioId === "estandar" ? "standard" : "national",
      paymentProvider: pagoId, couponId: appliedCoupon?.id ?? null,
    });
    if (!res.ok) { setCheckoutStatus("idle"); setCheckoutError(res.error ?? "Error al procesar"); return; }
    setCheckoutStatus("done"); setCartItems([]); setAppliedCoupon(null);
  };

  const changeCategory = (cat: string) => { setActiveCategory(cat); setVisibleCount(8); };

  const allFiltered = activeCategory === "Todos" ? products : products.filter(p => p.category === activeCategory);
  const filtered    = allFiltered.slice(0, visibleCount);
  const hasMore     = visibleCount < allFiltered.length;

  const handleContact = (e: React.FormEvent) => {
    e.preventDefault();
    setContactStatus("sending");
    setTimeout(() => { setContactStatus("sent"); setContactForm({ nombre:"", email:"", mensaje:"" }); }, 1400);
  };

  const toggleFavorite = (id: string) =>
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);

  const searchResults = searchQuery.trim().length > 0
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const favoriteProducts = products.filter(p => favorites.includes(p.id));
  const featuredProduct  = products[7] ?? products[0] ?? null;

  const iconBtn = { background:"none", border:"none", cursor:"pointer", color:DARK, padding:6, display:"flex", alignItems:"center" } as const;

  return (
    <div style={{ fontFamily:"'Inter','Helvetica Neue',Arial,sans-serif", background:BG, color:DARK, minHeight:"100vh" }}>
      <style>{`
        @keyframes up-ticker { from { transform:translateX(0); } to { transform:translateX(-50%); } }
        .up-ticker { display:inline-flex; white-space:nowrap; animation:up-ticker 28s linear infinite; }
        @keyframes up-fade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .up-fade { animation:up-fade 0.25s ease; }
        .up-stroke { -webkit-text-stroke:2px #0f0f0f; color:transparent; }
        .up-prod-img { transition:transform 0.5s ease; }
        .up-prod:hover .up-prod-img { transform:scale(1.06); }
        .up-cat:hover img { transform:scale(1.08); }
        .up-cat img { transition:transform 0.5s ease; }
      `}</style>

      {/* TOAST */}
      {toastMsg && (
        <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", background:DARK, color:ACC, padding:"12px 28px", fontSize:11, fontWeight:900, letterSpacing:2, textTransform:"uppercase", zIndex:9999 }}>
          {toastMsg}
        </div>
      )}

      {/* TICKER */}
      <div style={{ background:DARK, overflow:"hidden", height:36, display:"flex", alignItems:"center" }}>
        <div className="up-ticker">
          {[TICKER, TICKER].map((t, ri) => (
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

      {/* NAVBAR */}
      <nav style={{ position:"sticky", top:0, zIndex:100, background: scrolled ? WHITE : "rgba(245,245,245,0.95)", borderBottom: scrolled ? `3px solid ${DARK}` : "3px solid transparent", backdropFilter:"blur(8px)", transition:"all 0.3s", padding:"0 40px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontWeight:900, fontSize:18, letterSpacing:4, textTransform:"uppercase", maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flexShrink:0 }}>
          <EditableZone field="storeName" label="Nombre de la tienda">
            {storeConfig?.storeName ?? <span>URBAN<span style={{ background:DARK, color:ACC, padding:"3px 7px", marginLeft:2 }}>PULSE</span></span>}
          </EditableZone>
        </div>
        <div style={{ display:"flex", gap:32 }}>
          {[["Mujeres","Mujer"],["Hombres","Hombre"],["Accesorios","Accesorios"]].map(([label, cat]) => (
            <button key={label} onClick={() => { changeCategory(cat); scrollTo("productos"); }}
              style={{ background:"none", border:"none", borderBottom:"2px solid transparent", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", color:DARK, padding:"4px 0", transition:"border-color 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderBottomColor = ACC; e.currentTarget.style.background = "none"; }}
              onMouseLeave={e => { e.currentTarget.style.borderBottomColor = "transparent"; }}
            >{label}</button>
          ))}
          <button onClick={() => scrollTo("nosotros")}
            style={{ background:"none", border:"none", borderBottom:"2px solid transparent", fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", color:DARK, padding:"4px 0", transition:"border-color 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderBottomColor = ACC; }}
            onMouseLeave={e => { e.currentTarget.style.borderBottomColor = "transparent"; }}
          >Nosotros</button>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={() => setSearchOpen(true)} style={iconBtn}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
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
          <button onClick={() => setCartOpen(true)}
            style={{ background:DARK, border:"none", color:ACC, padding:"10px 18px", display:"flex", alignItems:"center", gap:6, fontSize:11, fontWeight:900, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", marginLeft:8 }}>
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            {cartCount > 0 ? cartCount : "Carrito"}
          </button>
        </div>
      </nav>

      {/* HERO — diagonal split */}
      <section style={{ display:"grid", gridTemplateColumns:"55% 45%", minHeight:"calc(100vh - 100px)", overflow:"hidden" }}>
        <div style={{ background:heroLeftUpBg, display:"flex", flexDirection:"column", justifyContent:"flex-end", padding:"80px 64px", clipPath:"polygon(0 0, 100% 0, 91% 100%, 0 100%)", position:"relative" }}>
          <EditableSectionBg field="bgHeroLeft" label="Fondo hero" />
          <span style={{ color:ACC, fontSize:10, letterSpacing:6, fontWeight:800, textTransform:"uppercase", marginBottom:20, display:"block" }}>
            <EditableZone field="storeTagline" label="Tagline">{storeConfig?.storeTagline ?? "▶ Nueva Colección 2025"}</EditableZone>
          </span>
          <h1 style={{ color:heroLeftUpText, fontSize:"clamp(58px,7.5vw,108px)", fontWeight:900, lineHeight:0.88, margin:"0 0 28px", textTransform:"uppercase", letterSpacing:"-2px" }}>
            <EditableZone field="heroHeading" label="Título principal">MOVE FASTER. GO HARDER.</EditableZone>
          </h1>
          <p style={{ color:heroLeftUpMid, fontSize:15, maxWidth:360, marginBottom:40, lineHeight:1.7 }}>
            <EditableZone field="heroSubtext" label="Subtítulo hero">Ropa deportiva de alta performance para quienes no conocen los límites.</EditableZone>
          </p>
          <div style={{ display:"flex", gap:12 }}>
            <button onClick={() => scrollTo("productos")}
              style={{ background:ACC, color:DARK, border:"none", padding:"16px 36px", fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor:"pointer" }}>
              <EditableZone field="heroCta" label="Botón principal">Ver Colección</EditableZone>
            </button>
            <button onClick={() => scrollTo("featured")}
              style={{ background:"none", color:heroLeftUpText, border:`2px solid ${heroLeftUpMid}`, padding:"16px 36px", fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor:"pointer" }}>
              <EditableZone field="heroCtaSecondary" label="Botón secundario">Featured Drop</EditableZone>
            </button>
          </div>
        </div>
        <div style={{ position:"relative", overflow:"hidden" }}>
          <img src={storeConfig?.imageOverrides?.["heroImage"]?.url ?? "https://picsum.photos/seed/up_hero/800/900"} alt="Hero" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:`${storeConfig?.imageOverrides?.["heroImage"]?.posX ?? 50}% ${storeConfig?.imageOverrides?.["heroImage"]?.posY ?? 50}%`, display:"block" }} />
          <BgDragHandle imgKey="heroImage" />
          <EditableImageButton field="heroImage" label="Imagen hero" />
          <div style={{ position:"absolute", top:36, right:36, background:ACC, color:DARK, padding:"12px 20px", fontWeight:900, fontSize:10, letterSpacing:4, textTransform:"uppercase" }}>
            <EditableZone field="heroNewDropBadge" label="Badge hero">New Drop</EditableZone>
          </div>
        </div>
      </section>

      {/* GARANTÍAS */}
      <section style={{ background:garantiasUpBg, borderTop:`3px solid ${DARK}`, borderBottom:`3px solid ${DARK}`, position:"relative" }}>
        <EditableSectionBg field="bgGarantias" label="Fondo garantías" />
        <div style={{ maxWidth:1200, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(4,1fr)" }}>
          {GARANTIAS.map((g, i) => (
            <div key={g.title} style={{ display:"flex", alignItems:"center", gap:12, padding:"18px 24px", borderRight: i < 3 ? `1px solid rgba(0,0,0,0.1)` : "none" }}>
              <span style={{ color:garantiasUpText }}>{g.svg}</span>
              <div>
                <p style={{ margin:0, fontSize:11, fontWeight:900, letterSpacing:1, textTransform:"uppercase", color:garantiasUpText }}><EditableZone field={`garantia${i+1}Title`} label={`Título garantía ${i+1}`}>{g.title}</EditableZone></p>
                <p style={{ margin:0, fontSize:11, color:garantiasUpText, opacity:0.6 }}><EditableZone field={`garantia${i+1}Desc`} label={`Descripción garantía ${i+1}`}>{g.desc}</EditableZone></p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORY TILES */}
      <section style={{ background:categoriesBgUp, position:"relative" }}>
        <EditableSectionBg field="bgCategorias" label="Fondo categorías" />
        <div style={{ padding:"80px 40px", maxWidth:1200, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:40 }}>
          <h2 style={{ fontSize:"clamp(36px,4vw,52px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-1px", margin:0, lineHeight:1, color:categoriasText }}>
            <EditableZone field="categoriesHeading" label="Título sección categorías">Explorá la tienda</EditableZone>
          </h2>
          <button onClick={() => scrollTo("productos")}
            style={{ background:"none", border:`2px solid ${categoriasText}`, color:categoriasText, padding:"10px 24px", fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor:"pointer" }}>
            <EditableZone field="categoryViewAll" label="Botón ver todo">Ver todo →</EditableZone>
          </button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:4 }}>
          {[
            { label:"Mujer",      cat:"Mujer",      img: storeConfig?.imageOverrides?.["catMujer"]?.url ?? "https://picsum.photos/seed/up_cat1/600/700",      field:"catMujer" },
            { label:"Hombre",     cat:"Hombre",     img: storeConfig?.imageOverrides?.["catHombre"]?.url ?? "https://picsum.photos/seed/up_cat2/600/700",     field:"catHombre" },
            { label:"Accesorios", cat:"Accesorios", img: storeConfig?.imageOverrides?.["catAccesorios"]?.url ?? "https://picsum.photos/seed/up_cat3/600/700", field:"catAccesorios" },
          ].map(c => (
            <div key={c.label} className="up-cat" onClick={() => { changeCategory(c.cat); scrollTo("productos"); }}
              style={{ position:"relative", aspectRatio:"3/4", overflow:"hidden", cursor:"pointer" }}>
              <img src={c.img} alt={c.label} style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:`${storeConfig?.imageOverrides?.[c.field]?.posX ?? 50}% ${storeConfig?.imageOverrides?.[c.field]?.posY ?? 50}%`, display:"block" }} />
              <BgDragHandle imgKey={c.field} />
              <EditableImageButton field={c.field} label={`Imagen ${c.label}`} />
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

      {/* FEATURED DROP */}
      {featuredProduct && (
      <section id="featured" style={{ background:featuredBg, padding:"80px 40px", position:"relative" }}>
        <EditableSectionBg field="bgFeatured" label="Fondo featured" />
        <div style={{ maxWidth:1100, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:0, alignItems:"center" }}>
          <div style={{ position:"relative" }}>
            <img src={featuredProduct.images[0]} alt={featuredProduct.name} style={{ width:"100%", aspectRatio:"3/4", objectFit:"cover", display:"block" }} />
            {featuredProduct.badge && (
              <span style={{ position:"absolute", top:20, left:20, background:ACC, color:DARK, padding:"6px 14px", fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase" }}>
                {featuredProduct.badge}
              </span>
            )}
          </div>
          <div style={{ padding:"60px 56px" }}>
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
              <span style={{ color:ACC, fontSize:36, fontWeight:900 }}>{fmt(featuredProduct.price)}</span>
              {featuredProduct.comparePrice && <span style={{ color:featuredText, opacity:0.25, fontSize:20, textDecoration:"line-through" }}>{fmt(featuredProduct.comparePrice)}</span>}
            </div>
            <button onClick={() => openModal(featuredProduct)}
              style={{ width:"100%", background:ACC, color:DARK, border:"none", padding:"18px", fontSize:11, fontWeight:900, letterSpacing:4, textTransform:"uppercase", cursor:"pointer" }}>
              Agregar al Carrito
            </button>
          </div>
        </div>
      </section>
      )}

      {/* PRODUCTS */}
      <section id="productos" style={{ background:productosBgUp, position:"relative" }}>
        <EditableSectionBg field="bgProductos" label="Fondo productos" />
        <div style={{ padding:"80px 40px", maxWidth:1200, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:40 }}>
          <h2 style={{ fontSize:"clamp(32px,4vw,44px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-1px", margin:0, color:productosTextUp }}><EditableZone field="collectionHeading" label="Título sección productos">Colección</EditableZone></h2>
          <div style={{ display:"flex", border:`2px solid ${productosTextUp}` }}>
            {CATEGORIES.map((cat, i) => (
              <button key={cat} onClick={() => changeCategory(cat)}
                style={{ background: activeCategory === cat ? DARK : WHITE, color: activeCategory === cat ? ACC : DARK, border:"none", borderRight: i < CATEGORIES.length - 1 ? `1px solid ${DARK}` : "none", padding:"10px 18px", fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", transition:"all 0.2s" }}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:4 }}>
          {filtered.map((product, idx) => {
            const big = idx === 0 || idx === 5;
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
                      {product.comparePrice && <p style={{ margin:0, fontSize:11, color:MID, textDecoration:"line-through" }}>{fmt(product.comparePrice)}</p>}
                      <p style={{ margin:0, fontSize:15, fontWeight:900, color: product.comparePrice ? RED : DARK }}>{fmt(product.price)}</p>
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
        {hasMore && (
          <div style={{ textAlign:"center", marginTop:40 }}>
            <button onClick={() => setVisibleCount(v => v + 4)}
              style={{ background:"none", border:`3px solid ${productosTextUp}`, color:productosTextUp, padding:"16px 52px", fontSize:11, fontWeight:900, letterSpacing:4, textTransform:"uppercase", cursor:"pointer" }}>
              Cargar más
            </button>
          </div>
        )}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ background:testimonialsBgUp, padding:"80px 0", position:"relative" }}>
        <EditableSectionBg field="bgTestimonios" label="Fondo testimonios" />
        <div style={{ padding:"0 40px", marginBottom:36, position:"relative", zIndex:1 }}>
          <h2 style={{ color:testimonialsText, fontSize:"clamp(30px,3.5vw,42px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-1px", margin:0 }}>
            <EditableZone field="testimonialsHeading" label="Título testimonios">Lo que dicen nuestros clientes</EditableZone>
          </h2>
        </div>
        <div style={{ display:"flex", gap:4, overflowX:"auto", padding:"0 40px 4px", scrollbarWidth:"none", position:"relative", zIndex:1 }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} style={{ flex:"0 0 300px", background:testimonialsCardBg, border:`1px solid ${testimonialsCardBorder}`, padding:"28px" }}>
              <div style={{ display:"flex", gap:3, marginBottom:14 }}>
                {Array.from({length:5}).map((_,si) => (
                  <svg key={si} width={13} height={13} viewBox="0 0 24 24" fill={si < t.stars ? ACC : testimonialsMid} stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                ))}
              </div>
              <p style={{ color:testimonialsMid, fontSize:13, lineHeight:1.7, margin:"0 0 18px" }}>"{t.text}"</p>
              <p style={{ color:ACC, fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", margin:0 }}>{t.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* NOSOTROS */}
      <section id="nosotros" style={{ background:nosotrosBgUp, position:"relative" }}>
        <EditableSectionBg field="bgNosotros" label="Fondo nosotros" />
        <div style={{ padding:"100px 40px", maxWidth:1200, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"center", position:"relative", zIndex:1 }}>
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
      <section id="contacto" style={{ position:"relative", ...(contactBgImg?.url ? { backgroundImage:`url(${contactBgImg.url})`, backgroundSize:"cover", backgroundPosition:`${contactBgImg.posX ?? 50}% ${contactBgImg.posY ?? 50}%` } : { background:contactUpBg }) }}>
        <BgDragHandle imgKey="sectionbg_bgContacto" />
        <EditableSectionBg field="bgContacto" label="Fondo contacto" />
        {contactBgImg?.url && contactBgImg.overlayType !== "none" && (
          <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none", background: contactBgImg.overlayType === "light" ? `rgba(255,255,255,${contactBgImg.overlayOpacity ?? 0.5})` : `rgba(0,0,0,${contactBgImg.overlayOpacity ?? 0.45})` }} />
        )}
        <div style={{ position:"relative", zIndex:1, padding:"80px 40px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:80 }}>
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
        <div style={{ padding:"60px 40px 28px", position:"relative", zIndex:1 }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:40, marginBottom:48 }}>
            <div>
              <div style={{ fontWeight:900, fontSize:24, letterSpacing:4, textTransform:"uppercase", color:footerUpText, marginBottom:16 }}>
                URBAN<span style={{ color:ACC }}>PULSE</span>
              </div>
              <p style={{ color:footerUpMid, fontSize:13, lineHeight:1.8, maxWidth:260 }}>
                <EditableZone field="footerDescription" label="Descripción footer">Ropa deportiva de alta performance. Para quienes van más rápido.</EditableZone>
              </p>
            </div>
            {[
              { title:"Tienda", links:["Mujer","Hombre","Accesorios","Novedades","Sale"] },
              { title:"Ayuda", links:["Guía de talles","Envíos","Devoluciones","FAQ","Contacto"] },
              { title:"Empresa", links:["Nosotros","Prensa","Empleo","Sustentabilidad"] },
            ].map(col => (
              <div key={col.title}>
                <p style={{ color:footerUpText, fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", margin:"0 0 18px" }}>{col.title}</p>
                {col.links.map(link => (
                  <a key={link} href="#" style={{ display:"block", color:footerUpMid, fontSize:13, textDecoration:"none", marginBottom:10 }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.color = ACC; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.color = footerUpMid; }}>
                    {link}
                  </a>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop:`1px solid ${footerUpMid}`, paddingTop:22, display:"flex", justifyContent:"space-between" }}>
            <p style={{ color:footerUpMid, fontSize:12, margin:0 }}><EditableZone field="footerCopyright" label="Copyright">© 2025 UrbanPulse. Todos los derechos reservados.</EditableZone></p>
            <p style={{ color:footerUpMid, fontSize:12, margin:0 }}><EditableZone field="footerMadeIn" label="Hecho en">Hecho en Argentina</EditableZone></p>
          </div>
        </div>
        </div>
      </footer>

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
                    <p style={{ color:ACC, fontWeight:900, fontSize:13, margin:0 }}>{fmt(p.price)}</p>
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
                      <p style={{ margin:"0 0 10px", fontSize:14, fontWeight:900 }}>{fmt(p.price)}</p>
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
            <div style={{ background:WHITE, width:"100%", maxWidth:860, maxHeight:"92vh", overflowY:"auto", display:"grid", gridTemplateColumns:"1fr 1fr", position:"relative" }}>
              <button onClick={() => setModalProduct(null)} style={{ position:"absolute", top:0, right:0, background:DARK, border:"none", color:ACC, width:40, height:40, fontSize:18, cursor:"pointer", zIndex:10, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
              <div>
                <img src={modalProduct.images[modalImg]} alt={modalProduct.name} style={{ width:"100%", aspectRatio:"3/4", objectFit:"cover", display:"block" }} />
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
                <h3 style={{ margin:"0 0 18px", fontSize:24, fontWeight:900, textTransform:"uppercase", letterSpacing:"-0.5px" }}>{modalProduct.name}</h3>
                <div style={{ display:"flex", gap:14, alignItems:"baseline", marginBottom:22 }}>
                  <span style={{ fontSize:28, fontWeight:900, color: modalProduct.comparePrice ? RED : DARK }}>{fmt(modalProduct.price)}</span>
                  {modalProduct.comparePrice && <span style={{ fontSize:15, color:MID, textDecoration:"line-through" }}>{fmt(modalProduct.comparePrice)}</span>}
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
                <button onClick={addToCart}
                  style={{ width:"100%", background:DARK, color:ACC, border:"none", padding:"16px", fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", marginBottom:10 }}>
                  Agregar · {fmt(modalProduct.price * qty)}
                </button>
                <button onClick={() => toggleFavorite(modalProduct.id)}
                  style={{ width:"100%", background:"none", border:`2px solid ${DARK}`, color:DARK, padding:"12px", fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill={favorites.includes(modalProduct.id) ? DARK : "none"} stroke={DARK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  {favorites.includes(modalProduct.id) ? "Guardado" : "Guardar en favoritos"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CART DRAWER */}
      {cartOpen && (
        <div className="up-fade" style={{ position:"fixed", inset:0, zIndex:700 }}>
          <div onClick={() => setCartOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)" }} />
          <div style={{ position:"absolute", right:0, top:0, bottom:0, width:440, background:WHITE, display:"flex", flexDirection:"column" }}>
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
                <button onClick={openCheckout} style={{ width:"100%", background:DARK, color:ACC, border:"none", padding:"18px", fontSize:11, fontWeight:900, letterSpacing:4, textTransform:"uppercase", cursor:"pointer" }}>
                  Finalizar Compra →
                </button>
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
    </div>
  );
}
