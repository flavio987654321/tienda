"use client";
import { useState, useEffect } from "react";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { EditableZone, EditableImageButton, getContrastColor, useEditContext } from "@/contexts/EditContext";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";

/* ── helpers ──────────────────────────────────────────────── */
function fmtPrice(n: number, currency: string) {
  return (currency === "USD" ? "USD " : "$") + n.toLocaleString("es-AR");
}
function attr(p: StorefrontProduct, key: string) {
  return p.attributes.find(a => a.key.toLowerCase() === key.toLowerCase())?.value ?? "";
}
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

/* ── Vehicle inquiry modal ────────────────────────────────── */
function VehicleModal({ product, accent, currency, whatsapp, onClose }: {
  product: StorefrontProduct;
  accent: string;
  currency: string;
  whatsapp: { enabled: boolean; number: string };
  onClose: () => void;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const imgs = product.images.length > 0 ? product.images : ["https://picsum.photos/seed/auto-ph/800/500"];
  const specs = [
    { label: "Marca",       value: attr(product, "Marca") },
    { label: "Año",         value: attr(product, "Año") },
    { label: "Kilómetros",  value: attr(product, "Km") ? `${attr(product, "Km")} km` : "" },
    { label: "Motor",       value: attr(product, "Motor") },
    { label: "Transmisión", value: attr(product, "Transmisión") },
    { label: "Combustible", value: attr(product, "Combustible") },
    { label: "Color",       value: attr(product, "Color") || (product.colors[0] ?? "") },
    { label: "Puertas",     value: attr(product, "Puertas") },
  ].filter(s => s.value);

  const waNumber = whatsapp.number.replace(/\D/g, "");
  const waMsg = encodeURIComponent(`Hola! Me interesa el ${product.name}${attr(product,"Año") ? ` (${attr(product,"Año")})` : ""}. ¿Está disponible?`);
  const waUrl = `https://wa.me/${waNumber}?text=${waMsg}`;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000,
        display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:"#111", borderRadius:16, width:"100%", maxWidth:860,
          maxHeight:"90vh", overflowY:"auto", color:"white",
          boxShadow:"0 25px 80px rgba(0,0,0,0.8)" }}>

        {/* header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"14px 20px", borderBottom:"1px solid #222" }}>
          <p style={{ margin:0, fontSize:12, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>
            {product.category}
          </p>
          <button onClick={onClose}
            style={{ background:"none", border:"none", color:"#888", cursor:"pointer",
              fontSize:24, lineHeight:1, padding:"2px 8px" }}>×</button>
        </div>

        {/* image */}
        <div style={{ position:"relative", background:"#000" }}>
          <img src={imgs[imgIdx]} alt={product.name}
            style={{ width:"100%", aspectRatio:"16/9", objectFit:"cover", display:"block" }} />
          {product.badge && (
            <div style={{ position:"absolute", top:12, left:12,
              background:accent, color:getContrastColor(accent),
              fontSize:11, fontWeight:800, padding:"4px 10px", borderRadius:20,
              textTransform:"uppercase" }}>
              {product.badge}
            </div>
          )}
          {imgs.length > 1 && (
            <>
              <button onClick={() => setImgIdx(i => (i - 1 + imgs.length) % imgs.length)}
                style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)",
                  background:"rgba(0,0,0,0.6)", border:"none", color:"white",
                  width:36, height:36, borderRadius:"50%", cursor:"pointer", fontSize:18 }}>‹</button>
              <button onClick={() => setImgIdx(i => (i + 1) % imgs.length)}
                style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                  background:"rgba(0,0,0,0.6)", border:"none", color:"white",
                  width:36, height:36, borderRadius:"50%", cursor:"pointer", fontSize:18 }}>›</button>
              <div style={{ position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)",
                display:"flex", gap:6 }}>
                {imgs.map((_,i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    style={{ width:8, height:8, borderRadius:"50%", border:"none", cursor:"pointer",
                      background: i === imgIdx ? accent : "rgba(255,255,255,0.5)" }} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* info */}
        <div style={{ padding:"22px 20px 28px" }}>
          <h2 style={{ margin:"0 0 4px", fontSize:"clamp(20px,4vw,26px)", fontWeight:800 }}>{product.name}</h2>
          <p style={{ margin:"0 0 18px", fontSize:"clamp(22px,4vw,28px)", fontWeight:900, color:accent }}>
            {fmtPrice(product.price, currency)}
          </p>
          {specs.length > 0 && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 16px", marginBottom:18 }}>
              {specs.map(s => (
                <div key={s.label} style={{ borderBottom:"1px solid #222", paddingBottom:8 }}>
                  <p style={{ margin:0, fontSize:10, color:"#666", textTransform:"uppercase", letterSpacing:0.8 }}>{s.label}</p>
                  <p style={{ margin:"2px 0 0", fontSize:14, fontWeight:700, color:"#e0e0e0" }}>{s.value}</p>
                </div>
              ))}
            </div>
          )}
          {product.description && (
            <p style={{ margin:"0 0 18px", fontSize:14, color:"#999", lineHeight:1.6 }}>{product.description}</p>
          )}
          {whatsapp.enabled && waNumber && (
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                background:"#25d366", color:"white", textDecoration:"none",
                padding:"14px 20px", borderRadius:10, fontWeight:800, fontSize:15 }}>
              <WaIcon /> Consultar por WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function WaIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

/* ── Vehicle card ─────────────────────────────────────────── */
function VehicleCard({ product, accent, currency, onClick }: {
  product: StorefrontProduct; accent: string; currency: string; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  const img = product.images[0] ?? "https://picsum.photos/seed/auto-c/800/500";
  const año = attr(product, "Año");
  const km = attr(product, "Km");
  const motor = attr(product, "Motor");
  const trans = attr(product, "Transmisión");
  const comb = attr(product, "Combustible");

  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:"#111", borderRadius:12, overflow:"hidden", cursor:"pointer",
        border:`1px solid ${hov ? accent : "#222"}`,
        boxShadow: hov ? `0 12px 32px rgba(0,0,0,0.5)` : "0 2px 8px rgba(0,0,0,0.3)",
        transform: hov ? "translateY(-4px)" : "none", transition:"all 0.2s",
        display:"flex", flexDirection:"column" }}>
      <div style={{ position:"relative", aspectRatio:"16/10", overflow:"hidden" }}>
        <img src={img} alt={product.name}
          style={{ width:"100%", height:"100%", objectFit:"cover", display:"block",
            transform: hov ? "scale(1.05)" : "none", transition:"transform 0.4s" }} />
        {product.badge && (
          <div style={{ position:"absolute", top:10, left:10,
            background:accent, color:getContrastColor(accent),
            fontSize:10, fontWeight:800, padding:"3px 9px", borderRadius:20 }}>
            {product.badge}
          </div>
        )}
        <div style={{ position:"absolute", bottom:10, right:10,
          background:"rgba(0,0,0,0.7)", color:"#ccc", fontSize:11, padding:"3px 8px", borderRadius:6 }}>
          {product.category}
        </div>
      </div>
      <div style={{ padding:16, flex:1, display:"flex", flexDirection:"column" }}>
        <p style={{ margin:"0 0 4px", fontSize:16, fontWeight:800, color:"white",
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{product.name}</p>
        <p style={{ margin:"0 0 12px", fontSize:20, fontWeight:900, color:accent }}>{fmtPrice(product.price, currency)}</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"5px 8px", marginBottom:14 }}>
          {año && <Chip label={año} />}
          {km && <Chip label={`${km} km`} />}
          {motor && <Chip label={motor} />}
          {trans && <Chip label={trans} />}
          {comb && <Chip label={comb} />}
        </div>
        <div style={{ marginTop:"auto", background:accent, color:getContrastColor(accent),
          textAlign:"center", borderRadius:8, padding:"9px", fontSize:13, fontWeight:700 }}>
          Ver detalles →
        </div>
      </div>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span style={{ background:"#1e1e1e", color:"#999", fontSize:11,
      padding:"3px 8px", borderRadius:20, border:"1px solid #2a2a2a" }}>{label}</span>
  );
}

/* ── Main ─────────────────────────────────────────────────── */
export default function AutoMotor() {
  const config = useStoreConfig();
  const { products, loadingProducts } = useStorefront();
  const { editMode } = useEditContext();
  const accent = config?.colors.accent ?? "#e8a020";
  const currency = config?.currency ?? "ARS";
  const storeName = config?.storeName ?? "AUTO MOTOR";
  const whatsapp = config?.whatsapp ?? { enabled: false, number: "" };

  const heroBgUrl = config?.imageOverrides?.["heroBackground"]?.url
    ?? "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&q=80";
  const nosotrosUrl = config?.imageOverrides?.["nosotrosImage"]?.url
    ?? "https://images.unsplash.com/photo-1562141961-b1d3a55eedda?w=900&q=80";

  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<StorefrontProduct | null>(null);
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const categories = ["Todos", ...Array.from(new Set(products.map(p => p.category))).filter(Boolean)];
  const filtered = activeCategory === "Todos" ? products : products.filter(p => p.category === activeCategory);

  return (
    <div style={{ background:"#0a0a0a", color:"white", fontFamily:"'Inter','Segoe UI',sans-serif", minHeight:"100vh" }}>
      <style>{`
        @media(min-width:640px){.am-grid{grid-template-columns:repeat(2,1fr)!important}}
        @media(min-width:1024px){.am-grid{grid-template-columns:repeat(3,1fr)!important}}
        .am-nav-links{display:none!important}
        @media(min-width:768px){.am-nav-links{display:flex!important}.am-burger{display:none!important}}
        .am-stats{grid-template-columns:repeat(2,1fr)}
        @media(min-width:640px){.am-stats{grid-template-columns:repeat(4,1fr)!important}}
        .am-about{grid-template-columns:1fr!important}
        @media(min-width:768px){.am-about{grid-template-columns:1fr 1fr!important}}
      `}</style>

      {/* Navbar */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100,
        background: scrolled ? "rgba(10,10,10,0.97)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid #1e1e1e" : "none",
        transition:"all 0.3s", padding:"0 20px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", height:64, display:"flex",
          alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontWeight:900, fontSize:20, letterSpacing:2, color:accent }}>
            <EditableZone field="storeName" label="Nombre de la tienda">{storeName}</EditableZone>
          </div>
          <div className="am-nav-links" style={{ display:"flex", gap:28, alignItems:"center" }}>
            {["Catálogo","Servicios","Nosotros","Contacto"].map(item => (
              <button key={item} onClick={() => scrollTo(item.toLowerCase())}
                style={{ background:"none", border:"none", color:"#ccc", cursor:"pointer",
                  fontSize:14, fontWeight:500 }}
                onMouseEnter={e => (e.currentTarget.style.color = accent)}
                onMouseLeave={e => (e.currentTarget.style.color = "#ccc")}>
                {item}
              </button>
            ))}
            {whatsapp.enabled && whatsapp.number && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ background:accent, color:getContrastColor(accent), textDecoration:"none",
                  padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:700 }}>
                Consultar
              </a>
            )}
          </div>
          <button className="am-burger"
            onClick={() => setMenuOpen(m => !m)}
            style={{ background:"none", border:"1px solid #333", color:"white",
              padding:"6px 10px", borderRadius:8, cursor:"pointer", fontSize:18 }}>
            {menuOpen ? "×" : "☰"}
          </button>
        </div>
        {menuOpen && (
          <div style={{ background:"#0f0f0f", borderTop:"1px solid #1e1e1e",
            padding:"12px 20px 20px", display:"flex", flexDirection:"column", gap:4 }}>
            {["catálogo","servicios","nosotros","contacto"].map(item => (
              <button key={item} onClick={() => { scrollTo(item); setMenuOpen(false); }}
                style={{ background:"none", border:"none", color:"#ccc", cursor:"pointer",
                  textAlign:"left", padding:"10px 4px", fontSize:15, fontWeight:500,
                  textTransform:"capitalize", borderBottom:"1px solid #1a1a1a" }}>
                {item}
              </button>
            ))}
            {whatsapp.enabled && whatsapp.number && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ background:"#25d366", color:"white", textDecoration:"none",
                  padding:"11px 16px", borderRadius:8, fontWeight:700,
                  textAlign:"center", marginTop:10 }}>
                WhatsApp
              </a>
            )}
          </div>
        )}
      </nav>

      {/* Hero */}
      <section style={{ position:"relative", minHeight:"100svh", display:"flex",
        alignItems:"flex-end", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0,
          background:`url(${heroBgUrl}) center/cover no-repeat` }}>
          <div style={{ position:"absolute", inset:0,
            background:"linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.2) 100%)" }} />
        </div>
        <EditableImageButton field="heroBackground" label="Imagen de fondo del hero" />
        <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:1200,
          margin:"0 auto", padding:"0 20px 80px" }}>
          <p style={{ margin:"0 0 12px", fontSize:12, color:accent,
            textTransform:"uppercase", letterSpacing:3, fontWeight:700 }}>
            <EditableZone field="heroBadge" label="Badge hero">Concesionaria Oficial</EditableZone>
          </p>
          <h1 style={{ margin:"0 0 16px", fontSize:"clamp(32px,7vw,64px)", fontWeight:900,
            lineHeight:1.1, maxWidth:700, whiteSpace:"pre-line" }}>
            <EditableZone field="heroHeading" label="Título principal">{"Tu próximo\nvehículo te espera"}</EditableZone>
          </h1>
          <p style={{ margin:"0 0 32px", fontSize:"clamp(15px,2.5vw,18px)", color:"#bbb",
            maxWidth:500, lineHeight:1.6 }}>
            <EditableZone field="heroSubtext" label="Subtítulo hero">Los mejores autos y motos al mejor precio. Financiación disponible.</EditableZone>
          </p>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <button onClick={() => scrollTo("catálogo")}
              style={{ background:accent, color:getContrastColor(accent), border:"none",
                padding:"14px 28px", borderRadius:10, fontWeight:800, fontSize:15, cursor:"pointer" }}>
              <EditableZone field="heroCta" label="Botón principal">Ver catálogo</EditableZone>
            </button>
            {whatsapp.enabled && whatsapp.number && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ background:"transparent", color:"white", textDecoration:"none",
                  border:"2px solid rgba(255,255,255,0.4)", padding:"14px 28px",
                  borderRadius:10, fontWeight:700, fontSize:15 }}>
                <EditableZone field="heroCtaSecondary" label="Botón secundario">Hablar con asesor</EditableZone>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section style={{ background:accent, padding:"24px 20px" }}>
        <div className="am-stats"
          style={{ maxWidth:1200, margin:"0 auto", display:"grid",
            gridTemplateColumns:"repeat(2,1fr)" }}>
          {[
            { fv:"stat1", fl:"statLabel1", n:"500+", l:"Vehículos vendidos" },
            { fv:"stat2", fl:"statLabel2", n:"15",   l:"Años de experiencia" },
            { fv:"stat3", fl:"statLabel3", n:"98%",  l:"Clientes satisfechos" },
            { fv:"stat4", fl:"statLabel4", n:"12",   l:"Marcas disponibles" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign:"center", padding:"16px 8px",
              borderRight: i < 3 ? "1px solid rgba(0,0,0,0.15)" : "none" }}>
              <p style={{ margin:0, fontSize:"clamp(22px,5vw,32px)", fontWeight:900,
                color:getContrastColor(accent) }}>
                <EditableZone field={s.fv} label={`Stat ${i+1}`}>{s.n}</EditableZone>
              </p>
              <p style={{ margin:"2px 0 0", fontSize:11, color:getContrastColor(accent),
                opacity:0.75, textTransform:"uppercase", letterSpacing:0.5 }}>
                <EditableZone field={s.fl} label={`Etiqueta stat ${i+1}`}>{s.l}</EditableZone>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Catálogo */}
      <section id="catálogo" style={{ padding:"64px 20px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <p style={{ margin:"0 0 6px", fontSize:12, color:accent,
            textTransform:"uppercase", letterSpacing:3, fontWeight:700 }}>
            <EditableZone field="featuredLabel" label="Etiqueta destacado">Nuestro stock</EditableZone>
          </p>
          <h2 style={{ margin:"0 0 32px", fontSize:"clamp(24px,4vw,36px)", fontWeight:900 }}>
            <EditableZone field="categoriesHeading" label="Sección categorías">Catálogo de vehículos</EditableZone>
          </h2>

          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:32, overflowX:"auto",
            scrollbarWidth:"none", paddingBottom:4 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ background: activeCategory === cat ? accent : "#1a1a1a",
                  color: activeCategory === cat ? getContrastColor(accent) : "#999",
                  border: activeCategory === cat ? "none" : "1px solid #2a2a2a",
                  padding:"8px 16px", borderRadius:20, cursor:"pointer",
                  fontSize:13, fontWeight:600, whiteSpace:"nowrap" }}>
                {cat}
              </button>
            ))}
          </div>

          {loadingProducts ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:"#555" }}>Cargando vehículos…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:"#555" }}>No hay vehículos en esta categoría.</div>
          ) : (
            <div className="am-grid" style={{ display:"grid", gridTemplateColumns:"1fr", gap:20 }}>
              {filtered.map(p => (
                <VehicleCard key={p.id} product={p} accent={accent}
                  currency={currency} onClick={() => setSelected(p)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Servicios */}
      <section id="servicios" style={{ padding:"64px 20px", background:"#0f0f0f" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <p style={{ margin:"0 0 6px", fontSize:12, color:accent,
            textTransform:"uppercase", letterSpacing:3, fontWeight:700 }}>
            <EditableZone field="aboutKicker" label="Kicker 'Nosotros'">Por qué elegirnos</EditableZone>
          </p>
          <h2 style={{ margin:"0 0 40px", fontSize:"clamp(24px,4vw,36px)", fontWeight:900 }}>
            <EditableZone field="aboutHeading" label="Título 'Nosotros'">Servicios y garantías</EditableZone>
          </h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:20 }}>
            {[
              { icon:"🔍", fv:"garantia1Title", fl:"garantia1Desc", t:"Inspección completa", d:"Todos los vehículos pasan por revisión técnica de 150 puntos." },
              { icon:"📄", fv:"garantia2Title", fl:"garantia2Desc", t:"Documentación en regla", d:"Transferencia y trámites 100% legales incluidos." },
              { icon:"💳", fv:"garantia3Title", fl:"garantia3Desc", t:"Financiación disponible", d:"Planes de cuotas adaptados a tu presupuesto." },
              { icon:"🤝", fv:"garantia4Title", fl:"garantia4Desc", t:"Asesoramiento personalizado", d:"Te acompañamos en cada paso de la compra." },
            ].map((s, i) => (
              <div key={i} style={{ background:"#161616", borderRadius:12, padding:"24px 20px",
                border:"1px solid #1e1e1e" }}>
                <div style={{ fontSize:32, marginBottom:12 }}>{s.icon}</div>
                <p style={{ margin:"0 0 8px", fontSize:16, fontWeight:700 }}>
                  <EditableZone field={s.fv} label={`Garantía ${i+1} — Título`}>{s.t}</EditableZone>
                </p>
                <p style={{ margin:0, fontSize:13, color:"#888", lineHeight:1.6 }}>
                  <EditableZone field={s.fl} label={`Garantía ${i+1} — Descripción`}>{s.d}</EditableZone>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nosotros */}
      <section id="nosotros" style={{ padding:"64px 20px" }}>
        <div className="am-about"
          style={{ maxWidth:1200, margin:"0 auto", display:"grid",
            gridTemplateColumns:"1fr", gap:40, alignItems:"center" }}>
          <div style={{ position:"relative", borderRadius:16, overflow:"hidden", aspectRatio:"16/9" }}>
            <img src={nosotrosUrl} alt="Nosotros"
              style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            <EditableImageButton field="nosotrosImage" label="Imagen sección Nosotros" />
          </div>
          <div>
            <p style={{ margin:"0 0 8px", fontSize:12, color:accent,
              textTransform:"uppercase", letterSpacing:3, fontWeight:700 }}>
              <EditableZone field="contactKicker" label="Etiqueta contacto">Nuestra historia</EditableZone>
            </p>
            <h2 style={{ margin:"0 0 16px", fontSize:"clamp(22px,4vw,32px)", fontWeight:900 }}>
              <EditableZone field="aboutHeading2" label="Título sobre nosotros">Años de pasión por los vehículos</EditableZone>
            </h2>
            <p style={{ margin:"0 0 12px", fontSize:15, color:"#999", lineHeight:1.7 }}>
              <EditableZone field="aboutParagraph1" label="Párrafo 1 'Nosotros'">Somos una empresa familiar con más de una década en el mercado automotor. Nuestro compromiso es brindarte la mejor experiencia de compra con total transparencia.</EditableZone>
            </p>
            <p style={{ margin:0, fontSize:15, color:"#999", lineHeight:1.7 }}>
              <EditableZone field="aboutParagraph2" label="Párrafo 2 'Nosotros'">Contamos con un equipo de asesores especializados y taller propio para garantizar la calidad de cada vehículo en nuestro stock.</EditableZone>
            </p>
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" style={{ padding:"64px 20px", background:"#0f0f0f" }}>
        <div style={{ maxWidth:700, margin:"0 auto", textAlign:"center" }}>
          <p style={{ margin:"0 0 8px", fontSize:12, color:accent,
            textTransform:"uppercase", letterSpacing:3, fontWeight:700 }}>
            <EditableZone field="contactKicker2" label="Etiqueta contacto 2">Hablemos</EditableZone>
          </p>
          <h2 style={{ margin:"0 0 12px", fontSize:"clamp(24px,4vw,36px)", fontWeight:900 }}>
            <EditableZone field="contactHeading" label="Título contacto">¿Encontraste tu vehículo?</EditableZone>
          </h2>
          <p style={{ margin:"0 0 32px", fontSize:15, color:"#999", lineHeight:1.6 }}>
            <EditableZone field="contactSubtext" label="Subtítulo contacto">Contactanos y un asesor te responderá en minutos para coordinar una visita sin compromiso.</EditableZone>
          </p>
          {whatsapp.enabled && whatsapp.number && (
            <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:10,
                background:"#25d366", color:"white", textDecoration:"none",
                padding:"16px 32px", borderRadius:12, fontWeight:800, fontSize:16 }}>
              <WaIcon />
              <EditableZone field="contactWhatsApp" label="WhatsApp de contacto">Escribinos por WhatsApp</EditableZone>
            </a>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background:"#060606", padding:"28px 20px",
        borderTop:"1px solid #1a1a1a", textAlign:"center" }}>
        <p style={{ margin:"0 0 4px", fontWeight:900, fontSize:16, color:accent, letterSpacing:2 }}>
          {storeName}
        </p>
        <p style={{ margin:0, fontSize:12, color:"#555" }}>
          <EditableZone field="footerCopyright" label="Copyright">
            {`© ${new Date().getFullYear()} ${storeName}. Todos los derechos reservados.`}
          </EditableZone>
        </p>
      </footer>

      {/* Modal */}
      {selected && (
        <VehicleModal product={selected} accent={accent} currency={currency}
          whatsapp={whatsapp} onClose={() => setSelected(null)} />
      )}

      {/* WhatsApp FAB */}
      {!editMode && whatsapp.enabled && whatsapp.number && (
        <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}`}
          target="_blank" rel="noopener noreferrer"
          style={{ position:"fixed", bottom:20, right:20, zIndex:200,
            background:"#25d366", color:"white", width:54, height:54,
            borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 4px 16px rgba(37,211,102,0.4)", textDecoration:"none" }}>
          <WaIcon />
        </a>
      )}
    </div>
  );
}
