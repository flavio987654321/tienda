"use client";
import { useState, useEffect, useRef } from "react";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { EditableZone, EditableFixed, EditableImageButton, EditableSectionBg, getContrastColor } from "@/contexts/EditContext";

/* ── Mock data ─────────────────────────────────────────── */
const CATEGORIES = ["Todos", "Mujer", "Hombre", "Accesorios"];

const MOCK_PRODUCTS = [
  { id:"1",  name:"Blazer Estructurado",    price:58000, comparePrice:75000,  category:"Mujer",      description:"Blazer de corte sastre con hombreras sutiles. Tela italiana 100% lana virgen. Cierre con un botón dorado.",                   images:["https://picsum.photos/seed/noir1a/800/1067","https://picsum.photos/seed/noir1b/800/1067"],  sizes:["XS","S","M","L","XL"],   colors:["Negro","Camel","Gris"] },
  { id:"2",  name:"Pantalón Wide Leg",      price:42000, comparePrice:null,   category:"Mujer",      description:"Pantalón palazzo de tiro alto con caída impecable. Composición: 70% viscosa, 30% poliéster.",                                 images:["https://picsum.photos/seed/noir2a/800/1067","https://picsum.photos/seed/noir2b/800/1067"],  sizes:["XS","S","M","L"],        colors:["Negro","Crema"] },
  { id:"3",  name:"Trench Coat Premium",    price:95000, comparePrice:120000, category:"Mujer",      description:"Gabardina clásica con cinturón regulable. Ideal para entretiempo. Impermeable al agua.",                                       images:["https://picsum.photos/seed/noir3a/800/1067","https://picsum.photos/seed/noir3b/800/1067"],  sizes:["S","M","L","XL"],        colors:["Camel","Negro"] },
  { id:"4",  name:"Camisa Oxford",          price:29000, comparePrice:null,   category:"Hombre",     description:"Camisa de algodón Oxford 100%. Corte slim fit con cuello button-down. Lavable en lavarropas.",                                 images:["https://picsum.photos/seed/noir4a/800/1067","https://picsum.photos/seed/noir4b/800/1067"],  sizes:["S","M","L","XL","XXL"],  colors:["Blanco","Celeste","Negro"] },
  { id:"5",  name:"Chaqueta Denim",         price:48000, comparePrice:62000,  category:"Hombre",     description:"Chaqueta de jean stonewashed con detalles en contraste. Corte regular con bolsillos delanteros.",                              images:["https://picsum.photos/seed/noir5a/800/1067","https://picsum.photos/seed/noir5b/800/1067"],  sizes:["S","M","L","XL"],        colors:["Indigo","Negro"] },
  { id:"6",  name:"Vestido Lencero",        price:38000, comparePrice:null,   category:"Mujer",      description:"Vestido estilo lencero en seda artificial con tiritas finas. Largo midi. Perfecto para salidas nocturnas.",                    images:["https://picsum.photos/seed/noir6a/800/1067","https://picsum.photos/seed/noir6b/800/1067"],  sizes:["XS","S","M","L"],        colors:["Negro","Champagne","Bordo"] },
  { id:"7",  name:"Cinturón Cuero",         price:18000, comparePrice:null,   category:"Accesorios", description:"Cinturón de cuero vacuno con hebilla metálica dorada. Ancho 3cm. Disponible en varios colores.",                                images:["https://picsum.photos/seed/noir7a/800/1067","https://picsum.photos/seed/noir7b/800/1067"],  sizes:["S/M","L/XL"],            colors:["Negro","Marrón","Camel"] },
  { id:"8",  name:"Sweater Cashmere",       price:72000, comparePrice:89000,  category:"Hombre",     description:"Sweater de cashmere puro con cuello redondo. Tejido suave y cálido, ideal para capas.",                                        images:["https://picsum.photos/seed/noir8a/800/1067","https://picsum.photos/seed/noir8b/800/1067"],  sizes:["S","M","L","XL"],        colors:["Camel","Gris","Negro","Crema"] },
  { id:"9",  name:"Falda Plisada",          price:34000, comparePrice:42000,  category:"Mujer",      description:"Falda midi plisada en gasa de seda. Cintura elástica. Movimiento fluido perfecto para cualquier ocasión.",                     images:["https://picsum.photos/seed/noir9a/800/1067","https://picsum.photos/seed/noir9b/800/1067"],  sizes:["XS","S","M","L"],        colors:["Negro","Vino","Verde"] },
  { id:"10", name:"Mocasín Cuero Italiano", price:64000, comparePrice:null,   category:"Accesorios", description:"Mocasín artesanal en cuero vacuno italiano. Suela de cuero cosida a mano. Duración garantizada.",                              images:["https://picsum.photos/seed/noir10a/800/1067","https://picsum.photos/seed/noir10b/800/1067"],sizes:["36","37","38","39","40","41"],colors:["Negro","Marrón","Cognac"] },
  { id:"11", name:"Remera Premium Supima",  price:19000, comparePrice:null,   category:"Hombre",     description:"Remera de algodón Supima con corte boxy. El algodón más fino y suave del mercado. Lavado a 30°C.",                             images:["https://picsum.photos/seed/noir11a/800/1067","https://picsum.photos/seed/noir11b/800/1067"],sizes:["S","M","L","XL","XXL"],  colors:["Blanco","Negro","Gris"] },
  { id:"12", name:"Bolso Estructurado",     price:87000, comparePrice:110000, category:"Accesorios", description:"Bolso de mano en cuero genuino con herrajes dorados. Compartimento principal con cierre y bolsillo exterior.",                  images:["https://picsum.photos/seed/noir12a/800/1067","https://picsum.photos/seed/noir12b/800/1067"],sizes:["Único"],                 colors:["Negro","Cognac","Crema"] },
  { id:"13", name:"Cardigan Oversize",      price:46000, comparePrice:58000,  category:"Mujer",      description:"Cardigan de punto grueso con caída holgada. Ideal como capa sobre vestidos o con jeans. 100% algodón orgánico.",               images:["https://picsum.photos/seed/noir13a/800/1067","https://picsum.photos/seed/noir13b/800/1067"],sizes:["S/M","L/XL"],            colors:["Crema","Gris","Negro","Terracota"] },
  { id:"14", name:"Pantalón Chino Slim",    price:36000, comparePrice:null,   category:"Hombre",     description:"Pantalón chino en gabardina stretch. Corte slim con pinzas. Versátil para formal y casual.",                                   images:["https://picsum.photos/seed/noir14a/800/1067","https://picsum.photos/seed/noir14b/800/1067"],sizes:["S","M","L","XL","XXL"],  colors:["Beige","Verde Militar","Negro"] },
  { id:"15", name:"Gafas Sol Acetato",      price:28000, comparePrice:35000,  category:"Accesorios", description:"Gafas de sol en acetato italiano con lentes polarizados UV400. Estuche de cuero incluido.",                                    images:["https://picsum.photos/seed/noir15a/800/1067","https://picsum.photos/seed/noir15b/800/1067"],sizes:["Único"],                 colors:["Negro","Tortoise","Carey"] },
];

type Product = typeof MOCK_PRODUCTS[0];
type CartItem = { product: Product; size: string; color: string; qty: number };
type ContactStatus = "idle" | "sending" | "sent";
type CheckoutStatus = "idle" | "placing" | "done";

const ENVIO_OPTIONS = [
  { id:"retiro",   label:"Retiro en local / acordar", price:0 },
  { id:"estandar", label:"Envío estándar",             price:3500 },
  { id:"nacional", label:"Envío nacional",             price:6500 },
];
const PAGO_OPTIONS = [
  { id:"transferencia", label:"Transferencia bancaria" },
  { id:"retirar",       label:"Pago al retirar / acordar" },
];


const ANNOUNCEMENT_MESSAGES = [
  "🚚 Envío gratis en compras mayores a $30.000",
  "🔄 Cambios sin cargo hasta 30 días",
  "💳 6 cuotas sin interés",
  "✨ Nueva colección disponible",
];

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior:"smooth" });

/* ── Garantías ─────────────────────────────────────────── */
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
  const [scrolled,            setScrolled]            = useState(false);
  const [activeCategory,      setActiveCategory]      = useState("Todos");
  const [cartItems,           setCartItems]           = useState<CartItem[]>([]);
  const [cartOpen,            setCartOpen]            = useState(false);
  const [modalProduct,        setModalProduct]        = useState<Product | null>(null);
  const [modalImg,            setModalImg]            = useState(0);
  const [selectedSize,        setSelectedSize]        = useState("");
  const [selectedColor,       setSelectedColor]       = useState("");
  const [qty,                 setQty]                 = useState(1);
  const [hoveredId,           setHoveredId]           = useState<string | null>(null);
  const [contactStatus,       setContactStatus]       = useState<ContactStatus>("idle");
  const [contactForm,         setContactForm]         = useState({ nombre:"", email:"", mensaje:"" });
  const [toastMsg,            setToastMsg]            = useState<string | null>(null);
  const [visibleCount,        setVisibleCount]        = useState(8);
  const [checkoutOpen,        setCheckoutOpen]        = useState(false);
  const [checkoutStatus,      setCheckoutStatus]      = useState<CheckoutStatus>("idle");
  const [envioId,             setEnvioId]             = useState("retiro");
  const [pagoId,              setPagoId]              = useState("transferencia");
  const [coupon,              setCoupon]              = useState("");
  const [notas,               setNotas]               = useState("");
  const [rememberData,        setRememberData]        = useState(false);
  const [buyerForm,           setBuyerForm]           = useState({ nombre:"", email:"", telefono:"", direccion:"", ciudad:"", provincia:"", cp:"" });
  // New states
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [announcementIdx,     setAnnouncementIdx]     = useState(0);
  const [searchOpen,          setSearchOpen]          = useState(false);
  const [searchQuery,         setSearchQuery]         = useState("");
  const [favorites,           setFavorites]           = useState<string[]>([]);
  const [favoritesOpen,       setFavoritesOpen]       = useState(false);
  const [userDropdownOpen,    setUserDropdownOpen]    = useState(false);

  const userDropdownRef = useRef<HTMLDivElement>(null);

  const ANNOUNCEMENT_BAR_H = 36;
  const announcementBarHeight = announcementVisible ? ANNOUNCEMENT_BAR_H : 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Rotating announcement messages
  useEffect(() => {
    if (!announcementVisible) return;
    const interval = setInterval(() => {
      setAnnouncementIdx(i => (i + 1) % ANNOUNCEMENT_MESSAGES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [announcementVisible]);

  // Close user dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userDropdownOpen]);

  // Close search on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSearchOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const fmt = (n: number) => "$" + n.toLocaleString("es-AR");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const openModal = (p: Product) => {
    setModalProduct(p);
    setModalImg(0);
    setSelectedSize(p.sizes[0]);
    setSelectedColor(p.colors[0]);
    setQty(1);
    setSearchOpen(false);
  };

  const addToCart = () => {
    if (!modalProduct) return;
    setCartItems(prev => {
      const existing = prev.find(i => i.product.id === modalProduct.id && i.size === selectedSize && i.color === selectedColor);
      if (existing) return prev.map(i => i === existing ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { product: modalProduct, size: selectedSize, color: selectedColor, qty }];
    });
    setModalProduct(null);
    showToast(`${modalProduct.name} agregado al carrito`);
    setCartOpen(true);
  };

  const removeFromCart = (idx: number) => setCartItems(prev => prev.filter((_, i) => i !== idx));
  const updateQty = (idx: number, delta: number) => setCartItems(prev => prev.map((item, i) => i === idx ? { ...item, qty: Math.max(1, item.qty + delta) } : item));

  const cartTotal  = cartItems.reduce((s, i) => s + i.product.price * i.qty, 0);
  const cartCount  = cartItems.reduce((s, i) => s + i.qty, 0);
  const envioPrice = ENVIO_OPTIONS.find(o => o.id === envioId)?.price ?? 0;
  const orderTotal = cartTotal + envioPrice;

  const openCheckout = () => { setCartOpen(false); setCheckoutStatus("idle"); setCheckoutOpen(true); };
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutStatus("placing");
    setTimeout(() => { setCheckoutStatus("done"); setCartItems([]); }, 1600);
  };

  const changeCategory = (cat: string) => { setActiveCategory(cat); setVisibleCount(8); };

  const allFiltered = activeCategory === "Todos" ? MOCK_PRODUCTS : MOCK_PRODUCTS.filter(p => p.category === activeCategory);
  const filtered    = allFiltered.slice(0, visibleCount);
  const hasMore     = visibleCount < allFiltered.length;

  const handleContact = (e: React.FormEvent) => {
    e.preventDefault();
    setContactStatus("sending");
    setTimeout(() => { setContactStatus("sent"); setContactForm({ nombre:"", email:"", mensaje:"" }); }, 1400);
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const searchResults = searchQuery.trim().length > 0
    ? MOCK_PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const favoriteProducts = MOCK_PRODUCTS.filter(p => favorites.includes(p.id));

  const storeConfig = useStoreConfig();

  /* ─ Colores base ─ */
  const G  = storeConfig?.colors.accent ?? "#c9a84c";  // gold / accent
  const BG = "#0a0a0a";  // background
  const S  = "#111";     // surface
  const T  = "#f0ebe3";  // text

  /* ─ Hero image con override dinámico ─ */
  const heroImageOv       = storeConfig?.imageOverrides?.["heroBackground"];
  const heroImageUrl      = heroImageOv?.url ?? "https://picsum.photos/seed/noir-hero/1920/1080";
  const heroOverlayType   = heroImageOv?.overlayType ?? "dark";
  const heroOverlayOpacity = heroImageOv?.overlayOpacity ?? 0.6;

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
  const nosotrosImageUrl = storeConfig?.imageOverrides?.["nosotrosImage"]?.url ?? "https://picsum.photos/seed/noir-about/900/700";

  const scn = storeConfig?.sectionColors ?? {};
  const garantiasBg    = scn["bgGarantias"]   ?? BG;
  const garantiasText  = getContrastColor(garantiasBg)   === "light" ? T : "#0a0a0a";
  const statementBg    = scn["bgStatement"]   ?? BG;
  const statementText  = getContrastColor(statementBg)   === "light" ? T : "#0a0a0a";
  const nosotrosPanelBg= scn["bgNosotrosPanel"] ?? S;
  const nosotrosPanelText = getContrastColor(nosotrosPanelBg) === "light" ? T : "#0a0a0a";
  const footerBg       = scn["bgFooter"]      ?? BG;

  return (
    <div style={{ fontFamily:"'Helvetica Neue', Arial, sans-serif", background:BG, color:T, minHeight:"100vh" }}>

      {/* ── ANNOUNCEMENT BAR ───────────────────────────────── */}
      {announcementVisible && (
        <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:110, height:ANNOUNCEMENT_BAR_H, background:G, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:12, fontWeight:600, color:BG, letterSpacing:1 }}>
            <EditableZone field="announcementText" label="Barra de anuncios" noBadge>{ANNOUNCEMENT_MESSAGES[announcementIdx]}</EditableZone>
          </span>
          {/* Dots */}
          <div style={{ position:"absolute", bottom:5, left:"50%", transform:"translateX(-50%)", display:"flex", gap:5 }}>
            {ANNOUNCEMENT_MESSAGES.map((_, i) => (
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
                      <p style={{ fontSize:13, color:G, fontWeight:700, margin:0 }}>{fmt(p.price)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {searchQuery.trim().length > 0 && searchResults.length === 0 && (
            <p style={{ color:"rgba(240,235,227,0.4)", marginTop:32, fontSize:14 }}>Sin resultados para "{searchQuery}"</p>
          )}
        </div>
      )}

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <nav style={{ position:"fixed", top:announcementBarHeight, left:0, right:0, zIndex:100, transition:"background 0.4s, top 0.3s", background: scrolled ? "rgba(10,10,10,0.97)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none", borderBottom: scrolled ? `1px solid rgba(201,168,76,0.15)` : "none" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 32px", height:72, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <button onClick={() => scrollTo("hero")} style={{ background:"none", border:"none", cursor:"pointer", fontFamily:"Georgia, serif", fontSize:26, fontWeight:700, letterSpacing:6, color:G, maxWidth:240, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flexShrink:0 }}>
            <EditableZone field="storeName" label="Nombre de la tienda">{storeConfig?.storeName ?? "NOIR"}</EditableZone>
          </button>
          <div style={{ display:"flex", gap:32 }}>
            {[["Mujer","productos"],["Hombre","productos"],["Accesorios","productos"],["Nosotros","nosotros"],["Contacto","contacto"]].map(([label, target]) => (
              <button key={label} onClick={() => { if (label === "Mujer" || label === "Hombre" || label === "Accesorios") changeCategory(label); scrollTo(target); }}
                style={{ background:"none", border:"none", color:T, fontSize:11, letterSpacing:3, cursor:"pointer", fontWeight:500, textTransform:"uppercase", opacity:0.8, transition:"opacity 0.2s, color 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.opacity="1"; e.currentTarget.style.color=G; }}
                onMouseLeave={e => { e.currentTarget.style.opacity="0.8"; e.currentTarget.style.color=T; }}
              >{label}</button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {/* Search icon */}
            <button onClick={() => setSearchOpen(true)} style={{ background:"none", border:"none", color:T, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            {/* Favorites icon */}
            <button onClick={() => setFavoritesOpen(true)} style={{ background:"none", border:"none", color:T, cursor:"pointer", position:"relative", padding:4, display:"flex", alignItems:"center" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill={favorites.length > 0 ? G : "none"} stroke={favorites.length > 0 ? G : "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {favorites.length > 0 && <span style={{ position:"absolute", top:-6, right:-6, background:G, color:BG, borderRadius:"50%", width:18, height:18, fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{favorites.length}</span>}
            </button>
            {/* User icon */}
            <div ref={userDropdownRef} style={{ position:"relative" }}>
              <button onClick={() => setUserDropdownOpen(o => !o)} style={{ background:"none", border:"none", color:T, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </button>
              {userDropdownOpen && (
                <div style={{ position:"absolute", top:"calc(100% + 10px)", right:0, background:"#1a1a1a", border:`1px solid rgba(201,168,76,0.2)`, minWidth:180, zIndex:200, boxShadow:"0 8px 32px rgba(0,0,0,0.5)" }}>
                  <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:"rgba(201,168,76,0.6)", padding:"10px 16px 4px", margin:0 }}>{"Mi cuenta"}</p>
                  {["Iniciar sesión", "Registrarse"].map(item => (
                    <button key={item} style={{ display:"block", width:"100%", background:"none", border:"none", color:T, padding:"10px 16px", fontSize:13, textAlign:"left", cursor:"pointer", transition:"background 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.background="rgba(201,168,76,0.08)")}
                      onMouseLeave={e => (e.currentTarget.style.background="none")}>{item}</button>
                  ))}
                  <div style={{ borderTop:`1px solid rgba(201,168,76,0.12)`, margin:"4px 0" }}/>
                  {["Mis pedidos", "Mi perfil"].map(item => (
                    <button key={item} style={{ display:"block", width:"100%", background:"none", border:"none", color:T, padding:"10px 16px", fontSize:13, textAlign:"left", cursor:"pointer", transition:"background 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.background="rgba(201,168,76,0.08)")}
                      onMouseLeave={e => (e.currentTarget.style.background="none")}>{item}</button>
                  ))}
                </div>
              )}
            </div>
            {/* Cart icon */}
            <button onClick={() => setCartOpen(true)} style={{ background:"none", border:"none", color:T, cursor:"pointer", position:"relative", padding:4 }}>
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              {cartCount > 0 && <span style={{ position:"absolute", top:-6, right:-6, background:G, color:BG, borderRadius:"50%", width:18, height:18, fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{cartCount}</span>}
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section id="hero" style={{ position:"relative", height:"100vh", minHeight:600, overflow:"hidden" }}>
        <img src={heroImageUrl} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}/>
        {heroOverlayType !== "none" && (
          <div style={{ position:"absolute", inset:0, background:heroGradient }}/>
        )}
        <EditableImageButton field="heroBackground" label="Cambiar imagen" />
        <div style={{ position:"relative", height:"100%", display:"flex", alignItems:"center", padding:"0 80px", maxWidth:1280, margin:"0 auto" }}>
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
              <button onClick={() => scrollTo("productos")} style={{ background:G, color:BG, border:"none", padding:"14px 36px", fontSize:12, letterSpacing:3, fontWeight:700, textTransform:"uppercase", cursor:"pointer" }}>
                <EditableZone field="heroCta" label="Botón principal">Ver Colección</EditableZone>
              </button>
              <button onClick={() => scrollTo("nosotros")} style={{ background:"transparent", color:heroTextColor, border:`1px solid rgba(240,235,227,0.4)`, padding:"14px 36px", fontSize:12, letterSpacing:3, fontWeight:500, textTransform:"uppercase", cursor:"pointer" }}>
                <EditableZone field="heroCtaSecondary" label="Botón secundario">Nuestra Historia</EditableZone>
              </button>
            </div>
          </div>
        </div>
        <div style={{ position:"absolute", bottom:32, left:"50%", transform:"translateX(-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:8, opacity:0.45 }}>
          <span style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:heroTextColor }}>Scroll</span>
          <div style={{ width:1, height:40, background:heroTextColor }}/>
        </div>
      </section>

      {/* ── GARANTÍAS ──────────────────────────────────────── */}
      <section style={{ borderTop:`1px solid rgba(201,168,76,0.12)`, borderBottom:`1px solid rgba(201,168,76,0.12)`, background:garantiasBg, position:"relative" }}>
        <EditableSectionBg field="bgGarantias" label="Fondo garantías" />
        <div style={{ maxWidth:1280, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(4,1fr)" }}>
          {GARANTIAS.map((g, i) => (
            <div key={i} style={{ padding:"28px 32px", display:"flex", alignItems:"center", gap:16, borderRight: i < 3 ? `1px solid rgba(201,168,76,0.1)` : "none" }}>
              <span style={{ color:G, flexShrink:0 }}>{g.svg}</span>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:garantiasText, margin:"0 0 4px" }}><EditableZone field={`garantia${i+1}Title`} label={`Título garantía ${i+1}`}>{g.title}</EditableZone></p>
                <p style={{ fontSize:11, opacity:0.45, margin:0, lineHeight:1.5, color:garantiasText }}><EditableZone field={`garantia${i+1}Desc`} label={`Descripción garantía ${i+1}`}>{g.desc}</EditableZone></p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CATEGORÍAS ─────────────────────────────────────── */}
      <section id="categorias" style={{ padding:"80px 32px", maxWidth:1280, margin:"0 auto" }}>
        <p style={{ fontSize:11, letterSpacing:5, color:G, textAlign:"center", marginBottom:48, textTransform:"uppercase" }}>
          <EditableZone field="categoriesHeading" label="Título sección categorías">Colecciones</EditableZone>
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          {[
            { label:"Mujer",      img: catMujerUrl,      field:"catMujer" },
            { label:"Hombre",     img: catHombreUrl,     field:"catHombre" },
            { label:"Accesorios", img: catAccesoriosUrl, field:"catAccesorios" },
          ].map(cat => (
            <button key={cat.label} onClick={() => { changeCategory(cat.label); scrollTo("productos"); }}
              style={{ position:"relative", aspectRatio:"2/3", overflow:"hidden", background:S, cursor:"pointer", border:"none", display:"block" }}>
              <img src={cat.img} alt={cat.label} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform 0.6s ease" }}
                onMouseEnter={e => (e.currentTarget.style.transform="scale(1.06)")}
                onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}/>
              <EditableImageButton field={cat.field} label={`Imagen ${cat.label}`} />
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(10,10,10,0.75) 30%, transparent)" }}/>
              <div style={{ position:"absolute", bottom:32, left:0, right:0, textAlign:"center" }}>
                <p style={{ fontFamily:"Georgia, serif", fontSize:24, color:T, margin:0, fontWeight:700 }}>{cat.label}</p>
                <p style={{ fontSize:10, letterSpacing:4, color:G, marginTop:8, textTransform:"uppercase" }}>{"Ver más"} →</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── STATEMENT ──────────────────────────────────────── */}
      <section style={{ padding:"72px 32px", borderTop:`1px solid rgba(201,168,76,0.1)`, borderBottom:`1px solid rgba(201,168,76,0.1)`, textAlign:"center", background:statementBg, position:"relative" }}>
        <EditableSectionBg field="bgStatement" label="Fondo frase" />
        <p style={{ fontFamily:"Georgia, serif", fontSize:"clamp(20px,3.5vw,40px)", color:statementText, opacity:0.88, maxWidth:760, margin:"0 auto", lineHeight:1.5, fontStyle:"italic" }}>
          <EditableZone field="quoteText" label="Frase destacada">"No compramos ropa. Compramos la versión de nosotros mismos que queremos ser."</EditableZone>
        </p>
        <div style={{ width:56, height:1, background:G, margin:"28px auto 0" }}/>
      </section>

      {/* ── PRODUCTOS ──────────────────────────────────────── */}
      <section id="productos" style={{ padding:"80px 32px", maxWidth:1280, margin:"0 auto" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:40, flexWrap:"wrap", gap:16 }}>
          <p style={{ fontFamily:"Georgia, serif", fontSize:28, color:T, margin:0 }}>
            {activeCategory === "Todos" ? "Toda la Colección" : activeCategory}
            <span style={{ fontSize:14, color:"#555", fontFamily:"sans-serif", fontWeight:400, marginLeft:12 }}>({allFiltered.length} piezas)</span>
          </p>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => changeCategory(cat)}
                style={{ background: activeCategory===cat ? G : "transparent", color: activeCategory===cat ? BG : T, border:`1px solid ${activeCategory===cat ? G : "rgba(240,235,227,0.2)"}`, padding:"8px 20px", fontSize:11, letterSpacing:2, cursor:"pointer", fontWeight:600, textTransform:"uppercase", transition:"all 0.2s" }}>
                {cat === "Todos" ? "Todos" : cat}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:24, marginBottom:48 }}>
          {filtered.map(product => (
            <div key={product.id} onClick={() => openModal(product)} onMouseEnter={() => setHoveredId(product.id)} onMouseLeave={() => setHoveredId(null)}
              style={{ cursor:"pointer" }}>
              <div style={{ position:"relative", aspectRatio:"3/4", overflow:"hidden", background:S, marginBottom:16 }}>
                <img src={product.images[0]} alt={product.name} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform 0.5s ease", transform: hoveredId===product.id ? "scale(1.05)" : "scale(1)" }}/>
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
              <p style={{ fontSize:11, color:"#666", letterSpacing:2, textTransform:"uppercase", margin:"0 0 6px" }}>{product.category}</p>
              <p style={{ fontSize:16, color:T, margin:"0 0 8px", fontWeight:500 }}>{product.name}</p>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <span style={{ fontSize:17, fontWeight:700, color:G }}>{fmt(product.price)}</span>
                {product.comparePrice && <span style={{ fontSize:13, color:"#444", textDecoration:"line-through" }}>{fmt(product.comparePrice)}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Ver más / contador */}
        <div style={{ textAlign:"center" }}>
          <p style={{ fontSize:11, opacity:0.35, letterSpacing:2, marginBottom:20 }}>
            Mostrando {Math.min(visibleCount, allFiltered.length)} de {allFiltered.length} piezas
          </p>
          {hasMore && (
            <button onClick={() => setVisibleCount(v => v + 4)}
              style={{ background:"transparent", color:T, border:`1px solid rgba(240,235,227,0.25)`, padding:"14px 48px", fontSize:11, letterSpacing:3, textTransform:"uppercase", fontWeight:600, cursor:"pointer", transition:"all 0.25s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=G; e.currentTarget.style.color=G; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(240,235,227,0.25)"; e.currentTarget.style.color=T; }}>
              {"Ver más"}
            </button>
          )}
          {!hasMore && allFiltered.length > 8 && (
            <button onClick={() => { setVisibleCount(8); scrollTo("productos"); }}
              style={{ background:"transparent", color:"#444", border:"1px solid rgba(240,235,227,0.08)", padding:"12px 36px", fontSize:10, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", transition:"all 0.25s" }}
              onMouseEnter={e => (e.currentTarget.style.color=T)}
              onMouseLeave={e => (e.currentTarget.style.color="#444")}>
              ↑ Volver al inicio
            </button>
          )}
        </div>
      </section>

      {/* ── NOSOTROS ───────────────────────────────────────── */}
      <section id="nosotros" style={{ borderTop:`1px solid rgba(201,168,76,0.1)` }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr" }}>
          <div style={{ position:"relative", minHeight:560, overflow:"hidden" }}>
            <img src={nosotrosImageUrl} alt="Nuestra historia" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
            <EditableImageButton field="nosotrosImage" label="Imagen nosotros" />
            <div style={{ position:"absolute", inset:0, background:"rgba(10,10,10,0.25)" }}/>
          </div>
          <div style={{ padding:"80px 72px", display:"flex", flexDirection:"column", justifyContent:"center", gap:24, background:nosotrosPanelBg, position:"relative" }}>
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
      <section id="contacto" style={{ padding:"80px 32px", borderTop:`1px solid rgba(201,168,76,0.1)` }}>
        <div style={{ maxWidth:640, margin:"0 auto" }}>
          <p style={{ fontSize:10, letterSpacing:5, color:G, textAlign:"center", textTransform:"uppercase", marginBottom:12 }}><EditableZone field="contactKicker" label="Etiqueta contacto">Contacto</EditableZone></p>
          <h2 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(24px,3vw,38px)", textAlign:"center", margin:"0 0 12px", color:T }}>
            <EditableZone field="contactHeading" label="Título contacto">¿Tenés alguna consulta?</EditableZone>
          </h2>
          <p style={{ fontSize:14, opacity:0.5, textAlign:"center", marginBottom:48, lineHeight:1.7 }}>
            <EditableZone field="contactSubtext" label="Subtítulo contacto">Respondemos todos los mensajes en menos de 24 horas hábiles.</EditableZone>
          </p>

          {contactStatus === "sent" ? (
            <div style={{ textAlign:"center", padding:"60px 0" }}>
              <p style={{ fontSize:40, marginBottom:16 }}>✓</p>
              <p style={{ fontFamily:"Georgia, serif", fontSize:22, color:T, marginBottom:8 }}>¡Mensaje enviado!</p>
              <p style={{ fontSize:13, opacity:0.5 }}>Te respondemos a la brevedad.</p>
              <button onClick={() => setContactStatus("idle")} style={{ marginTop:24, background:"transparent", color:G, border:`1px solid ${G}`, padding:"10px 28px", fontSize:11, letterSpacing:2, cursor:"pointer", textTransform:"uppercase" }}>Enviar otro mensaje</button>
            </div>
          ) : (
            <form onSubmit={handleContact} style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <div>
                  <label style={{ display:"block", fontSize:10, letterSpacing:3, textTransform:"uppercase", opacity:0.6, marginBottom:8 }}>Nombre</label>
                  <input required value={contactForm.nombre} onChange={e => setContactForm(f => ({...f, nombre:e.target.value}))}
                    placeholder="Tu nombre" style={{ width:"100%", background:S, border:`1px solid rgba(201,168,76,0.2)`, color:T, padding:"12px 16px", fontSize:13, outline:"none", boxSizing:"border-box" }}
                    onFocus={e => (e.target.style.borderColor=G)} onBlur={e => (e.target.style.borderColor="rgba(201,168,76,0.2)")}/>
                </div>
                <div>
                  <label style={{ display:"block", fontSize:10, letterSpacing:3, textTransform:"uppercase", opacity:0.6, marginBottom:8 }}>Email</label>
                  <input required type="email" value={contactForm.email} onChange={e => setContactForm(f => ({...f, email:e.target.value}))}
                    placeholder="tu@email.com" style={{ width:"100%", background:S, border:`1px solid rgba(201,168,76,0.2)`, color:T, padding:"12px 16px", fontSize:13, outline:"none", boxSizing:"border-box" }}
                    onFocus={e => (e.target.style.borderColor=G)} onBlur={e => (e.target.style.borderColor="rgba(201,168,76,0.2)")}/>
                </div>
              </div>
              <div>
                <label style={{ display:"block", fontSize:10, letterSpacing:3, textTransform:"uppercase", opacity:0.6, marginBottom:8 }}>Mensaje</label>
                <textarea required rows={5} value={contactForm.mensaje} onChange={e => setContactForm(f => ({...f, mensaje:e.target.value}))}
                  placeholder="¿En qué podemos ayudarte?" style={{ width:"100%", background:S, border:`1px solid rgba(201,168,76,0.2)`, color:T, padding:"12px 16px", fontSize:13, outline:"none", resize:"vertical", fontFamily:"inherit", boxSizing:"border-box" }}
                  onFocus={e => (e.target.style.borderColor=G)} onBlur={e => (e.target.style.borderColor="rgba(201,168,76,0.2)")}/>
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
      <footer style={{ borderTop:`1px solid rgba(201,168,76,0.12)`, padding:"60px 32px 32px", marginTop:0, background:footerBg, position:"relative" }}>
        <EditableSectionBg field="bgFooter" label="Fondo footer" />
        <div style={{ maxWidth:1280, margin:"0 auto", display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1.5fr", gap:48, marginBottom:48 }}>
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
                    style={{ background:"none", border:`1px solid rgba(240,235,227,0.15)`, color:T, width:34, height:34, fontSize:10, fontWeight:700, cursor: url ? "pointer" : "default", letterSpacing:1, transition:"all 0.2s", opacity: url ? 1 : 0.35 }}
                    onMouseEnter={e => { if(url){ e.currentTarget.style.borderColor=G; e.currentTarget.style.color=G; }}}
                    onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(240,235,227,0.15)"; e.currentTarget.style.color=T; }}>
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
            <div style={{ display:"flex" }}>
              <input placeholder="tu@email.com" style={{ flex:1, background:S, border:`1px solid rgba(201,168,76,0.25)`, borderRight:"none", color:T, padding:"11px 14px", fontSize:12, outline:"none" }}/>
              <button style={{ background:G, color:BG, border:"none", padding:"11px 18px", fontSize:12, fontWeight:700, cursor:"pointer", letterSpacing:1 }}>OK</button>
            </div>
          </div>
        </div>
        <div style={{ borderTop:`1px solid rgba(240,235,227,0.05)`, paddingTop:24, display:"flex", justifyContent:"space-between", alignItems:"center", maxWidth:1280, margin:"0 auto" }}>
          <p style={{ fontSize:11, opacity:0.25, margin:0 }}>
            <EditableZone field="footerCopyright" label="Copyright">© 2025 NOIR Fashion. Todos los derechos reservados.</EditableZone>
          </p>
          <p style={{ fontSize:11, opacity:0.25, margin:0 }}>
            <EditableZone field="footerMadeIn" label="Hecho en">Hecho con ♥ en Argentina</EditableZone>
          </p>
        </div>
      </footer>

      {/* ── MODAL PRODUCTO ─────────────────────────────────── */}
      {modalProduct && (
        <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setModalProduct(null)}>
          <div style={{ position:"absolute", inset:0, background:"rgba(10,10,10,0.88)", backdropFilter:"blur(8px)" }}/>
          <div style={{ position:"relative", background:S, maxWidth:960, width:"calc(100% - 48px)", maxHeight:"92vh", overflow:"auto", display:"grid", gridTemplateColumns:"1fr 1fr" }} onClick={e => e.stopPropagation()}>
            <div>
              <img src={modalProduct.images[modalImg]} alt="" style={{ width:"100%", aspectRatio:"3/4", objectFit:"cover", display:"block" }}/>
              <div style={{ display:"flex", gap:8, padding:"12px 16px", background:"#0d0d0d" }}>
                {modalProduct.images.map((img, i) => (
                  <button key={i} onClick={() => setModalImg(i)} style={{ width:56, height:56, padding:2, border: i===modalImg ? `1px solid ${G}` : "1px solid transparent", background:"none", cursor:"pointer" }}>
                    <img src={img} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding:"40px 36px", display:"flex", flexDirection:"column", gap:20 }}>
              <button onClick={() => setModalProduct(null)} style={{ alignSelf:"flex-end", background:"none", border:`1px solid rgba(240,235,227,0.2)`, color:T, width:34, height:34, cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
              <div>
                <p style={{ fontSize:10, letterSpacing:4, color:G, textTransform:"uppercase", marginBottom:8 }}>{modalProduct.category}</p>
                <h2 style={{ fontFamily:"Georgia, serif", fontSize:26, margin:0, lineHeight:1.2 }}>{modalProduct.name}</h2>
              </div>
              <div style={{ display:"flex", gap:12, alignItems:"baseline" }}>
                <span style={{ fontSize:24, fontWeight:700, color:G }}>{fmt(modalProduct.price)}</span>
                {modalProduct.comparePrice && <span style={{ fontSize:15, color:"#444", textDecoration:"line-through" }}>{fmt(modalProduct.comparePrice)}</span>}
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
                  <button onClick={() => setQty(q => q+1)} style={{ width:38, height:38, background:"none", border:"none", color:T, fontSize:20, cursor:"pointer" }}>+</button>
                </div>
              </div>

              <button onClick={addToCart} style={{ background:G, color:BG, border:"none", padding:"16px", fontSize:12, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", marginTop:"auto" }}>
                {"Agregar al Carrito"} · {fmt(modalProduct.price * qty)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CHECKOUT ───────────────────────────────────────── */}
      {checkoutOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:300, display:"flex", alignItems:"flex-start", justifyContent:"flex-end" }}>
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
                <p style={{ fontSize:13, opacity:0.5, lineHeight:1.8, marginBottom:32 }}>Te contactamos a la brevedad para confirmar y coordinar el envío o retiro.</p>
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
                    {([ ["ciudad","Ciudad"], ["provincia","Provincia"] ] as const).map(([field, ph]) => (
                      <input key={field} required placeholder={ph}
                        value={buyerForm[field]} onChange={e => setBuyerForm(f => ({...f, [field]:e.target.value}))}
                        style={{ background:"#171717", border:`1px solid rgba(201,168,76,0.15)`, color:T, padding:"11px 14px", fontSize:13, outline:"none", boxSizing:"border-box" }}
                        onFocus={e => (e.target.style.borderColor=G)} onBlur={e => (e.target.style.borderColor="rgba(201,168,76,0.15)")}/>
                    ))}
                  </div>
                  <input placeholder="Código postal" value={buyerForm.cp} onChange={e => setBuyerForm(f => ({...f, cp:e.target.value}))}
                    style={{ display:"block", width:"100%", marginBottom:10, background:"#171717", border:`1px solid rgba(201,168,76,0.15)`, color:T, padding:"11px 14px", fontSize:13, outline:"none", boxSizing:"border-box" }}
                    onFocus={e => (e.target.style.borderColor=G)} onBlur={e => (e.target.style.borderColor="rgba(201,168,76,0.15)")}/>
                  <label style={{ display:"flex", alignItems:"center", gap:10, fontSize:12, opacity:0.5, cursor:"pointer", marginBottom:28 }}>
                    <input type="checkbox" checked={rememberData} onChange={e => setRememberData(e.target.checked)} style={{ accentColor:G }}/>
                    Recordar mis datos para la próxima compra
                  </label>

                  {/* envío */}
                  <p style={{ fontSize:13, fontWeight:700, color:T, marginBottom:14, letterSpacing:1 }}>Envío</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:28 }}>
                    {ENVIO_OPTIONS.map(opt => (
                      <label key={opt.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", border:`1px solid ${envioId===opt.id ? G : "rgba(240,235,227,0.1)"}`, cursor:"pointer", transition:"border-color 0.2s" }}>
                        <span style={{ display:"flex", alignItems:"center", gap:12 }}>
                          <input type="radio" name="envio" value={opt.id} checked={envioId===opt.id} onChange={() => setEnvioId(opt.id)} style={{ accentColor:G }}/>
                          <span style={{ fontSize:13, color:T }}>{opt.label}</span>
                        </span>
                        <span style={{ fontSize:13, fontWeight:700, color: opt.price===0 ? G : T }}>{opt.price===0 ? "Gratis" : fmt(opt.price)}</span>
                      </label>
                    ))}
                  </div>

                  {/* pago */}
                  <p style={{ fontSize:13, fontWeight:700, color:T, marginBottom:14, letterSpacing:1 }}>Pago</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:28 }}>
                    {PAGO_OPTIONS.map(opt => (
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
                    <button type="button" style={{ background:"transparent", border:`1px solid rgba(201,168,76,0.15)`, color:"#666", padding:"11px 18px", fontSize:11, letterSpacing:2, cursor:"pointer" }}>Aplicar</button>
                  </div>

                  {/* resumen de totales */}
                  <div style={{ borderTop:`1px solid rgba(240,235,227,0.07)`, paddingTop:20 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                      <span style={{ fontSize:13, opacity:0.55 }}>Subtotal</span>
                      <span style={{ fontSize:13, opacity:0.55 }}>{fmt(cartTotal)}</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
                      <span style={{ fontSize:13, opacity:0.55 }}>Envío</span>
                      <span style={{ fontSize:13, opacity:0.55 }}>{envioPrice===0 ? "Gratis" : fmt(envioPrice)}</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ fontSize:16, fontWeight:700, color:T }}>Total</span>
                      <span style={{ fontSize:20, fontWeight:800, color:G }}>{fmt(orderTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* botón crear pedido */}
                <div style={{ padding:"16px 28px 28px", borderTop:`1px solid rgba(240,235,227,0.06)`, flexShrink:0 }}>
                  <button type="submit" disabled={checkoutStatus==="placing"}
                    style={{ width:"100%", background:G, color:BG, border:"none", padding:"16px", fontSize:12, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", opacity:checkoutStatus==="placing"?0.7:1, transition:"opacity 0.2s" }}>
                    {checkoutStatus==="placing" ? "Procesando..." : "Crear pedido"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── CARRITO ────────────────────────────────────────── */}
      <div style={{ position:"fixed", inset:0, zIndex:150, pointerEvents: cartOpen ? "auto" : "none" }}>
        <div onClick={() => setCartOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(10,10,10,0.6)", opacity: cartOpen ? 1 : 0, transition:"opacity 0.3s" }}/>
        <div style={{ position:"absolute", top:0, right:0, bottom:0, width:420, background:S, transform: cartOpen ? "translateX(0)" : "translateX(100%)", transition:"transform 0.35s cubic-bezier(.4,0,.2,1)", display:"flex", flexDirection:"column" }}>
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
              <button onClick={openCheckout} style={{ width:"100%", background:G, color:BG, border:"none", padding:"16px", fontSize:12, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", marginBottom:10 }}>
                {"Finalizar Compra"}
              </button>
              <button onClick={() => setCartOpen(false)} style={{ width:"100%", background:"transparent", color:T, border:`1px solid rgba(240,235,227,0.15)`, padding:"12px", fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer" }}>
                Seguir Comprando
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── FAVORITES DRAWER ───────────────────────────────── */}
      <div style={{ position:"fixed", inset:0, zIndex:155, pointerEvents: favoritesOpen ? "auto" : "none" }}>
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
                    <p style={{ fontSize:13, color:G, fontWeight:700, margin:"0 0 10px" }}>{fmt(product.price)}</p>
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
