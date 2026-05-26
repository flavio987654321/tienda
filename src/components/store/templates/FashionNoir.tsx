"use client";
import { useState, useEffect } from "react";

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

const fmt = (n: number) => "$" + n.toLocaleString("es-AR");
const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior:"smooth" });

/* ── Garantías ─────────────────────────────────────────── */
const GARANTIAS = [
  { icon:"🚚", title:"Envío gratis", desc:"En compras mayores a $30.000" },
  { icon:"🔄", title:"Cambios sin cargo", desc:"Hasta 30 días después de la compra" },
  { icon:"🔒", title:"Pago seguro", desc:"Todos los medios de pago protegidos" },
  { icon:"💬", title:"Atención personalizada", desc:"Respondemos en menos de 24 hs" },
];

/* ── Component ─────────────────────────────────────────── */
export default function FashionNoir() {
  const [scrolled,       setScrolled]       = useState(false);
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [cartItems,      setCartItems]      = useState<CartItem[]>([]);
  const [cartOpen,       setCartOpen]       = useState(false);
  const [modalProduct,   setModalProduct]   = useState<Product | null>(null);
  const [modalImg,       setModalImg]       = useState(0);
  const [selectedSize,   setSelectedSize]   = useState("");
  const [selectedColor,  setSelectedColor]  = useState("");
  const [qty,            setQty]            = useState(1);
  const [hoveredId,      setHoveredId]      = useState<string | null>(null);
  const [contactStatus,  setContactStatus]  = useState<ContactStatus>("idle");
  const [contactForm,    setContactForm]    = useState({ nombre:"", email:"", mensaje:"" });
  const [toastMsg,       setToastMsg]       = useState<string | null>(null);
  const [visibleCount,   setVisibleCount]   = useState(8);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const cartTotal = cartItems.reduce((s, i) => s + i.product.price * i.qty, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);

  const changeCategory = (cat: string) => { setActiveCategory(cat); setVisibleCount(8); };

  const allFiltered = activeCategory === "Todos" ? MOCK_PRODUCTS : MOCK_PRODUCTS.filter(p => p.category === activeCategory);
  const filtered    = allFiltered.slice(0, visibleCount);
  const hasMore     = visibleCount < allFiltered.length;

  const handleContact = (e: React.FormEvent) => {
    e.preventDefault();
    setContactStatus("sending");
    setTimeout(() => { setContactStatus("sent"); setContactForm({ nombre:"", email:"", mensaje:"" }); }, 1400);
  };

  /* ─ Colores base ─ */
  const G = "#c9a84c";  // gold
  const BG = "#0a0a0a"; // background
  const S  = "#111";    // surface
  const T  = "#f0ebe3"; // text

  return (
    <div style={{ fontFamily:"'Helvetica Neue', Arial, sans-serif", background:BG, color:T, minHeight:"100vh" }}>

      {/* ── TOAST ──────────────────────────────────────────── */}
      {toastMsg && (
        <div style={{ position:"fixed", bottom:32, left:"50%", transform:"translateX(-50%)", background:G, color:BG, padding:"12px 28px", fontSize:13, fontWeight:700, zIndex:999, whiteSpace:"nowrap", boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
          ✓ {toastMsg}
        </div>
      )}

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, transition:"background 0.4s", background: scrolled ? "rgba(10,10,10,0.97)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none", borderBottom: scrolled ? `1px solid rgba(201,168,76,0.15)` : "none" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 32px", height:72, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <button onClick={() => scrollTo("hero")} style={{ background:"none", border:"none", cursor:"pointer", fontFamily:"Georgia, serif", fontSize:26, fontWeight:700, letterSpacing:6, color:G }}>NOIR</button>
          <div style={{ display:"flex", gap:32 }}>
            {[["Mujer","productos"],["Hombre","productos"],["Accesorios","productos"],["Nosotros","nosotros"],["Contacto","contacto"]].map(([label, target]) => (
              <button key={label} onClick={() => { if (label === "Mujer" || label === "Hombre" || label === "Accesorios") changeCategory(label); scrollTo(target); }}
                style={{ background:"none", border:"none", color:T, fontSize:11, letterSpacing:3, cursor:"pointer", fontWeight:500, textTransform:"uppercase", opacity:0.8, transition:"opacity 0.2s, color 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.opacity="1"; e.currentTarget.style.color=G; }}
                onMouseLeave={e => { e.currentTarget.style.opacity="0.8"; e.currentTarget.style.color=T; }}
              >{label}</button>
            ))}
          </div>
          <button onClick={() => setCartOpen(true)} style={{ background:"none", border:"none", color:T, cursor:"pointer", position:"relative", padding:4 }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            {cartCount > 0 && <span style={{ position:"absolute", top:-6, right:-6, background:G, color:BG, borderRadius:"50%", width:18, height:18, fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{cartCount}</span>}
          </button>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section id="hero" style={{ position:"relative", height:"100vh", minHeight:600, overflow:"hidden" }}>
        <img src="https://picsum.photos/seed/noir-hero/1920/1080" alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}/>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right, rgba(10,10,10,0.8) 45%, rgba(10,10,10,0.15))" }}/>
        <div style={{ position:"relative", height:"100%", display:"flex", alignItems:"center", padding:"0 80px", maxWidth:1280, margin:"0 auto" }}>
          <div style={{ maxWidth:520 }}>
            <p style={{ fontSize:11, letterSpacing:5, color:G, marginBottom:20, textTransform:"uppercase" }}>Nueva Temporada · Otoño 2025</p>
            <h1 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(42px,6vw,80px)", fontWeight:700, lineHeight:1.05, margin:"0 0 20px", color:T }}>Vestí<br/>tu esencia.</h1>
            <p style={{ fontSize:16, opacity:0.75, lineHeight:1.7, marginBottom:40, maxWidth:380 }}>Piezas diseñadas para quienes eligen calidad sobre cantidad. Colecciones cápsula para cada estilo de vida.</p>
            <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
              <button onClick={() => scrollTo("productos")} style={{ background:G, color:BG, border:"none", padding:"14px 36px", fontSize:12, letterSpacing:3, fontWeight:700, textTransform:"uppercase", cursor:"pointer" }}>Ver Colección</button>
              <button onClick={() => scrollTo("nosotros")} style={{ background:"transparent", color:T, border:`1px solid rgba(240,235,227,0.4)`, padding:"14px 36px", fontSize:12, letterSpacing:3, fontWeight:500, textTransform:"uppercase", cursor:"pointer" }}>Nuestra Historia</button>
            </div>
          </div>
        </div>
        <div style={{ position:"absolute", bottom:32, left:"50%", transform:"translateX(-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:8, opacity:0.45 }}>
          <span style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase" }}>Scroll</span>
          <div style={{ width:1, height:40, background:T }}/>
        </div>
      </section>

      {/* ── GARANTÍAS ──────────────────────────────────────── */}
      <section style={{ borderTop:`1px solid rgba(201,168,76,0.12)`, borderBottom:`1px solid rgba(201,168,76,0.12)` }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(4,1fr)" }}>
          {GARANTIAS.map((g, i) => (
            <div key={i} style={{ padding:"28px 32px", display:"flex", alignItems:"center", gap:16, borderRight: i < 3 ? `1px solid rgba(201,168,76,0.1)` : "none" }}>
              <span style={{ fontSize:28 }}>{g.icon}</span>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:T, margin:"0 0 4px" }}>{g.title}</p>
                <p style={{ fontSize:11, opacity:0.45, margin:0, lineHeight:1.5 }}>{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CATEGORÍAS ─────────────────────────────────────── */}
      <section id="categorias" style={{ padding:"80px 32px", maxWidth:1280, margin:"0 auto" }}>
        <p style={{ fontSize:11, letterSpacing:5, color:G, textAlign:"center", marginBottom:48, textTransform:"uppercase" }}>Colecciones</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          {[
            { label:"Mujer",      img:"https://picsum.photos/seed/noir-cat1/800/1200" },
            { label:"Hombre",     img:"https://picsum.photos/seed/noir-cat2/800/1200" },
            { label:"Accesorios", img:"https://picsum.photos/seed/noir-cat3/800/1200" },
          ].map(cat => (
            <button key={cat.label} onClick={() => { changeCategory(cat.label); scrollTo("productos"); }}
              style={{ position:"relative", aspectRatio:"2/3", overflow:"hidden", background:S, cursor:"pointer", border:"none", display:"block" }}>
              <img src={cat.img} alt={cat.label} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform 0.6s ease" }}
                onMouseEnter={e => (e.currentTarget.style.transform="scale(1.06)")}
                onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}/>
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(10,10,10,0.75) 30%, transparent)" }}/>
              <div style={{ position:"absolute", bottom:32, left:0, right:0, textAlign:"center" }}>
                <p style={{ fontFamily:"Georgia, serif", fontSize:24, color:T, margin:0, fontWeight:700 }}>{cat.label}</p>
                <p style={{ fontSize:10, letterSpacing:4, color:G, marginTop:8, textTransform:"uppercase" }}>Ver más →</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── STATEMENT ──────────────────────────────────────── */}
      <section style={{ padding:"72px 32px", borderTop:`1px solid rgba(201,168,76,0.1)`, borderBottom:`1px solid rgba(201,168,76,0.1)`, textAlign:"center" }}>
        <p style={{ fontFamily:"Georgia, serif", fontSize:"clamp(20px,3.5vw,40px)", color:T, opacity:0.88, maxWidth:760, margin:"0 auto", lineHeight:1.5, fontStyle:"italic" }}>
          "No compramos ropa. Compramos la versión de nosotros mismos que queremos ser."
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
                {cat}
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
              Ver más
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
            <img src="https://picsum.photos/seed/noir-about/900/700" alt="Nuestra historia" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
            <div style={{ position:"absolute", inset:0, background:"rgba(10,10,10,0.25)" }}/>
          </div>
          <div style={{ padding:"80px 72px", display:"flex", flexDirection:"column", justifyContent:"center", gap:24 }}>
            <div>
              <p style={{ fontSize:10, letterSpacing:5, color:G, textTransform:"uppercase", marginBottom:16 }}>Nuestra historia</p>
              <h2 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(28px,3vw,42px)", lineHeight:1.2, margin:"0 0 24px", color:T }}>Creados para quienes<br/>eligen con intención.</h2>
            </div>
            <p style={{ fontSize:14, opacity:0.65, lineHeight:1.85 }}>NOIR nació en 2018 con una premisa simple: crear piezas que duren más que una temporada. En un mundo saturado de fast fashion, apostamos por la confección artesanal, las telas de origen responsable y los diseños que no envejecen.</p>
            <p style={{ fontSize:14, opacity:0.65, lineHeight:1.85 }}>Cada prenda pasa por un proceso riguroso de selección de materiales y control de calidad. Trabajamos con talleres locales y artesanos que comparten nuestra filosofía: menos piezas, más valor.</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, paddingTop:8 }}>
              {[["2018","Año de fundación"],["100%","Producción local"],["30+","Artesanos que trabajan con nosotros"],["8 años","De trayectoria"]].map(([n, label]) => (
                <div key={label}>
                  <p style={{ fontFamily:"Georgia, serif", fontSize:32, color:G, margin:"0 0 4px", fontWeight:700 }}>{n}</p>
                  <p style={{ fontSize:11, opacity:0.5, margin:0, lineHeight:1.4 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACTO ───────────────────────────────────────── */}
      <section id="contacto" style={{ padding:"80px 32px", borderTop:`1px solid rgba(201,168,76,0.1)` }}>
        <div style={{ maxWidth:640, margin:"0 auto" }}>
          <p style={{ fontSize:10, letterSpacing:5, color:G, textAlign:"center", textTransform:"uppercase", marginBottom:12 }}>Contacto</p>
          <h2 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(24px,3vw,38px)", textAlign:"center", margin:"0 0 12px", color:T }}>¿Tenés alguna consulta?</h2>
          <p style={{ fontSize:14, opacity:0.5, textAlign:"center", marginBottom:48, lineHeight:1.7 }}>Respondemos todos los mensajes en menos de 24 horas hábiles.</p>

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
      <footer style={{ borderTop:`1px solid rgba(201,168,76,0.12)`, padding:"60px 32px 32px", marginTop:0 }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1.5fr", gap:48, marginBottom:48 }}>
          <div>
            <span style={{ fontFamily:"Georgia, serif", fontSize:28, fontWeight:700, letterSpacing:6, color:G, display:"block", marginBottom:16 }}>NOIR</span>
            <p style={{ fontSize:13, opacity:0.45, lineHeight:1.8, maxWidth:260 }}>Piezas de calidad para personas que saben lo que quieren. Diseño atemporal, confección impecable.</p>
            <div style={{ display:"flex", gap:12, marginTop:24 }}>
              {["IG","FB","TK","YT"].map(s => (
                <button key={s} style={{ background:"none", border:`1px solid rgba(240,235,227,0.15)`, color:T, width:34, height:34, fontSize:10, fontWeight:700, cursor:"pointer", letterSpacing:1, transition:"all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=G; e.currentTarget.style.color=G; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(240,235,227,0.15)"; e.currentTarget.style.color=T; }}>
                  {s}
                </button>
              ))}
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
            <p style={{ fontSize:12, opacity:0.45, marginBottom:16, lineHeight:1.6 }}>Suscribite y recibí novedades antes que nadie. Sin spam.</p>
            <div style={{ display:"flex" }}>
              <input placeholder="tu@email.com" style={{ flex:1, background:S, border:`1px solid rgba(201,168,76,0.25)`, borderRight:"none", color:T, padding:"11px 14px", fontSize:12, outline:"none" }}/>
              <button style={{ background:G, color:BG, border:"none", padding:"11px 18px", fontSize:12, fontWeight:700, cursor:"pointer", letterSpacing:1 }}>OK</button>
            </div>
          </div>
        </div>
        <div style={{ borderTop:`1px solid rgba(240,235,227,0.05)`, paddingTop:24, display:"flex", justifyContent:"space-between", alignItems:"center", maxWidth:1280, margin:"0 auto" }}>
          <p style={{ fontSize:11, opacity:0.25, margin:0 }}>© 2025 NOIR Fashion. Todos los derechos reservados.</p>
          <p style={{ fontSize:11, opacity:0.25, margin:0 }}>Hecho con ♥ en Argentina</p>
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
                Agregar al Carrito · {fmt(modalProduct.price * qty)}
              </button>
            </div>
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
              <button style={{ width:"100%", background:G, color:BG, border:"none", padding:"16px", fontSize:12, fontWeight:800, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", marginBottom:10 }}>
                Finalizar Compra
              </button>
              <button onClick={() => setCartOpen(false)} style={{ width:"100%", background:"transparent", color:T, border:`1px solid rgba(240,235,227,0.15)`, padding:"12px", fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer" }}>
                Seguir Comprando
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
