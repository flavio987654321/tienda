"use client";
import { useState, useEffect } from "react";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { EditableZone, EditableImageButton, getContrastColor, useEditContext } from "@/contexts/EditContext";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";

/* ── helpers ─────────────────────────────────────────────── */
function fmtPrice(n: number, currency: string) {
  return (currency === "USD" ? "USD " : "$") + n.toLocaleString("es-AR");
}
function attr(p: StorefrontProduct, key: string) {
  return p.attributes.find(a => a.key.toLowerCase() === key.toLowerCase())?.value ?? "";
}
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}
function WaIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

/* ── Vehicle modal ──────────────────────────────────────── */
function VehicleModal({ product, accent, currency, whatsapp, onClose }: {
  product: StorefrontProduct; accent: string; currency: string;
  whatsapp: { enabled: boolean; number: string }; onClose: () => void;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const imgs = product.images.length > 0 ? product.images : ["https://picsum.photos/seed/auto-ph/800/500"];
  const specs = [
    { label:"Marca",       value: attr(product, "Marca") },
    { label:"Año",         value: attr(product, "Año") },
    { label:"Kilómetros",  value: attr(product, "Km") ? `${attr(product,"Km")} km` : "" },
    { label:"Motor",       value: attr(product, "Motor") },
    { label:"Transmisión", value: attr(product, "Transmisión") },
    { label:"Combustible", value: attr(product, "Combustible") },
    { label:"Color",       value: attr(product, "Color") || (product.colors[0] ?? "") },
    { label:"Puertas",     value: attr(product, "Puertas") },
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
      style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.75)", zIndex:1000,
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:16, backdropFilter:"blur(4px)" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:"white", borderRadius:20, width:"100%", maxWidth:860,
          maxHeight:"90vh", overflowY:"auto", boxShadow:"0 30px 90px rgba(0,0,0,0.2)" }}>

        {/* header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"14px 20px", borderBottom:"1px solid #e2e8f0" }}>
          <p style={{ margin:0, fontSize:11, color:"#94a3b8", textTransform:"uppercase",
            letterSpacing:1, fontWeight:600 }}>{product.category}</p>
          <button onClick={onClose}
            style={{ background:"#f1f5f9", border:"none", color:"#475569", cursor:"pointer",
              width:32, height:32, borderRadius:"50%", fontSize:18, display:"flex",
              alignItems:"center", justifyContent:"center" }}>×</button>
        </div>

        {/* image */}
        <div style={{ position:"relative", background:"#f8fafc" }}>
          <img src={imgs[imgIdx]} alt={product.name}
            style={{ width:"100%", aspectRatio:"16/9", objectFit:"cover", display:"block" }} />
          {product.badge && (
            <div style={{ position:"absolute", top:12, left:12,
              background:accent, color:"white",
              fontSize:11, fontWeight:800, padding:"4px 12px", borderRadius:20 }}>
              {product.badge}
            </div>
          )}
          {imgs.length > 1 && (
            <>
              <button onClick={() => setImgIdx(i => (i-1+imgs.length)%imgs.length)}
                style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
                  background:"white", border:"none", color:"#334155",
                  width:36, height:36, borderRadius:"50%", cursor:"pointer", fontSize:18,
                  boxShadow:"0 2px 8px rgba(0,0,0,0.15)" }}>‹</button>
              <button onClick={() => setImgIdx(i => (i+1)%imgs.length)}
                style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                  background:"white", border:"none", color:"#334155",
                  width:36, height:36, borderRadius:"50%", cursor:"pointer", fontSize:18,
                  boxShadow:"0 2px 8px rgba(0,0,0,0.15)" }}>›</button>
              <div style={{ position:"absolute", bottom:12, left:"50%", transform:"translateX(-50%)",
                display:"flex", gap:6 }}>
                {imgs.map((_,i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    style={{ width:8, height:8, borderRadius:"50%", border:"none", cursor:"pointer",
                      background: i === imgIdx ? accent : "rgba(255,255,255,0.6)" }} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* info */}
        <div style={{ padding:"22px 20px 28px" }}>
          <h2 style={{ margin:"0 0 6px", fontSize:"clamp(20px,4vw,26px)", fontWeight:800, color:"#0f172a" }}>
            {product.name}
          </h2>
          <p style={{ margin:"0 0 18px", fontSize:"clamp(22px,4vw,28px)", fontWeight:900, color:accent }}>
            {fmtPrice(product.price, currency)}
          </p>
          {specs.length > 0 && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 16px",
              marginBottom:18, padding:16, background:"#f8fafc", borderRadius:12 }}>
              {specs.map(s => (
                <div key={s.label}>
                  <p style={{ margin:0, fontSize:10, color:"#94a3b8",
                    textTransform:"uppercase", letterSpacing:0.8, fontWeight:600 }}>{s.label}</p>
                  <p style={{ margin:"2px 0 0", fontSize:14, fontWeight:700, color:"#1e293b" }}>{s.value}</p>
                </div>
              ))}
            </div>
          )}
          {product.description && (
            <p style={{ margin:"0 0 18px", fontSize:14, color:"#64748b", lineHeight:1.7,
              padding:"12px 16px", background:"#f8fafc", borderRadius:10 }}>
              {product.description}
            </p>
          )}
          {whatsapp.enabled && waNumber && (
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                background:"#25d366", color:"white", textDecoration:"none",
                padding:"14px 20px", borderRadius:12, fontWeight:800, fontSize:15 }}>
              <WaIcon /> Consultar por WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
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
      style={{ background:"white", borderRadius:16, overflow:"hidden", cursor:"pointer",
        border:`2px solid ${hov ? accent : "#e2e8f0"}`,
        boxShadow: hov ? "0 12px 32px rgba(0,0,0,0.12)" : "0 2px 8px rgba(0,0,0,0.06)",
        transform: hov ? "translateY(-4px)" : "none", transition:"all 0.2s",
        display:"flex", flexDirection:"column" }}>
      <div style={{ position:"relative", aspectRatio:"16/10", overflow:"hidden", background:"#f8fafc" }}>
        <img src={img} alt={product.name}
          style={{ width:"100%", height:"100%", objectFit:"cover", display:"block",
            transform: hov ? "scale(1.04)" : "none", transition:"transform 0.4s" }} />
        {product.badge && (
          <div style={{ position:"absolute", top:10, left:10,
            background:accent, color:"white",
            fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:20 }}>
            {product.badge}
          </div>
        )}
        <div style={{ position:"absolute", bottom:10, right:10,
          background:"rgba(255,255,255,0.9)", color:"#475569",
          fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20 }}>
          {product.category}
        </div>
      </div>
      <div style={{ padding:16, flex:1, display:"flex", flexDirection:"column" }}>
        <p style={{ margin:"0 0 2px", fontSize:15, fontWeight:800, color:"#0f172a",
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{product.name}</p>
        <p style={{ margin:"0 0 12px", fontSize:20, fontWeight:900, color:accent }}>
          {fmtPrice(product.price, currency)}
        </p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"5px 8px", marginBottom:14 }}>
          {año && <Tag label={año} />}
          {km && <Tag label={`${km} km`} />}
          {motor && <Tag label={motor} />}
          {trans && <Tag label={trans} />}
          {comb && <Tag label={comb} />}
        </div>
        <div style={{ marginTop:"auto", background: hov ? accent : "#f1f5f9",
          color: hov ? "white" : "#475569",
          textAlign:"center", borderRadius:10, padding:"9px",
          fontSize:13, fontWeight:700, transition:"all 0.2s" }}>
          Ver detalles →
        </div>
      </div>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span style={{ background:"#f1f5f9", color:"#64748b", fontSize:11,
      padding:"3px 9px", borderRadius:20, fontWeight:500 }}>{label}</span>
  );
}

/* ── Main ─────────────────────────────────────────────────── */
export default function AutoDrive() {
  const config = useStoreConfig();
  const { products, loadingProducts } = useStorefront();
  const { editMode } = useEditContext();
  const accent = config?.colors.accent ?? "#2563eb";
  const currency = config?.currency ?? "ARS";
  const storeName = config?.storeName ?? "AUTO DRIVE";
  const whatsapp = config?.whatsapp ?? { enabled: false, number: "" };

  const heroImgUrl = config?.imageOverrides?.["heroImage"]?.url
    ?? "https://images.unsplash.com/photo-1567818735868-e71b99932e29?w=900&q=80";
  const nosotrosUrl = config?.imageOverrides?.["nosotrosImage"]?.url
    ?? "https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?w=900&q=80";

  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<StorefrontProduct | null>(null);
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const categories = ["Todos", ...Array.from(new Set(products.map(p => p.category))).filter(Boolean)];
  const filtered = products.filter(p => {
    const matchCat = activeCategory === "Todos" || p.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q)
      || p.attributes.some(a => a.value.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  return (
    <div style={{ background:"#f0f4f8", color:"#0f172a",
      fontFamily:"'Inter','Segoe UI',sans-serif", minHeight:"100vh" }}>
      <style>{`
        @media(min-width:640px){.ad-grid{grid-template-columns:repeat(2,1fr)!important}}
        @media(min-width:1024px){.ad-grid{grid-template-columns:repeat(3,1fr)!important}}
        .ad-nav-links{display:none!important}
        @media(min-width:768px){.ad-nav-links{display:flex!important}.ad-burger{display:none!important}}
        .ad-hero-inner{flex-direction:column!important}
        @media(min-width:768px){.ad-hero-inner{flex-direction:row!important;align-items:center!important}}
        .ad-about{grid-template-columns:1fr!important}
        @media(min-width:768px){.ad-about{grid-template-columns:1fr 1fr!important}}
        .ad-stats{grid-template-columns:repeat(2,1fr)}
        @media(min-width:640px){.ad-stats{grid-template-columns:repeat(4,1fr)!important}}
      `}</style>

      {/* Navbar */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100,
        background:"rgba(255,255,255,0.97)", backdropFilter:"blur(12px)",
        borderBottom:"1px solid #e2e8f0",
        boxShadow: scrolled ? "0 2px 12px rgba(0,0,0,0.08)" : "none",
        transition:"all 0.3s", padding:"0 20px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", height:60,
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontWeight:900, fontSize:18, letterSpacing:1, color:accent }}>
            <EditableZone field="storeName" label="Nombre de la tienda">{storeName}</EditableZone>
          </div>
          <div className="ad-nav-links" style={{ display:"flex", gap:24, alignItems:"center" }}>
            {["Catálogo","Servicios","Nosotros","Contacto"].map(item => (
              <button key={item} onClick={() => scrollTo(item.toLowerCase())}
                style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer",
                  fontSize:14, fontWeight:500 }}
                onMouseEnter={e => (e.currentTarget.style.color = accent)}
                onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}>
                {item}
              </button>
            ))}
            {whatsapp.enabled && whatsapp.number && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ background:accent, color:"white", textDecoration:"none",
                  padding:"8px 18px", borderRadius:8, fontSize:13, fontWeight:700 }}>
                Consultar
              </a>
            )}
          </div>
          <button className="ad-burger"
            onClick={() => setMenuOpen(m => !m)}
            style={{ background:"none", border:"1px solid #e2e8f0", color:"#475569",
              padding:"6px 10px", borderRadius:8, cursor:"pointer", fontSize:18 }}>
            {menuOpen ? "×" : "☰"}
          </button>
        </div>
        {menuOpen && (
          <div style={{ background:"white", borderTop:"1px solid #e2e8f0",
            padding:"12px 20px 20px", display:"flex", flexDirection:"column", gap:4 }}>
            {["catálogo","servicios","nosotros","contacto"].map(item => (
              <button key={item} onClick={() => { scrollTo(item); setMenuOpen(false); }}
                style={{ background:"none", border:"none", color:"#475569", cursor:"pointer",
                  textAlign:"left", padding:"10px 4px", fontSize:15, fontWeight:500,
                  textTransform:"capitalize", borderBottom:"1px solid #f1f5f9" }}>
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
      <section style={{ paddingTop:60, background:"white", overflow:"hidden",
        borderBottom:"1px solid #e2e8f0" }}>
        <div className="ad-hero-inner"
          style={{ maxWidth:1200, margin:"0 auto", padding:"48px 20px",
            display:"flex", gap:40, alignItems:"center" }}>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:"0 0 10px", fontSize:12, color:accent,
              textTransform:"uppercase", letterSpacing:3, fontWeight:700 }}>
              <EditableZone field="heroBadge" label="Badge hero">Concesionaria Oficial</EditableZone>
            </p>
            <h1 style={{ margin:"0 0 16px", fontSize:"clamp(28px,5vw,52px)", fontWeight:900,
              lineHeight:1.1, color:"#0f172a", whiteSpace:"pre-line" }}>
              <EditableZone field="heroHeading" label="Título principal">{"Encontrá tu\npróximo vehículo"}</EditableZone>
            </h1>
            <p style={{ margin:"0 0 28px", fontSize:"clamp(14px,2vw,17px)", color:"#64748b", lineHeight:1.7 }}>
              <EditableZone field="heroSubtext" label="Subtítulo hero">El catálogo más completo en autos y motos. Financiación en cuotas, sin complicaciones.</EditableZone>
            </p>
            {/* Search */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <div style={{ position:"relative", flex:1, minWidth:200 }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
                  stroke="#94a3b8" strokeWidth={2} strokeLinecap="round"
                  style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}>
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por marca, modelo..."
                  style={{ width:"100%", paddingLeft:36, paddingRight:14, paddingTop:12,
                    paddingBottom:12, border:"2px solid #e2e8f0", borderRadius:10,
                    fontSize:14, outline:"none", background:"#f8fafc", boxSizing:"border-box" }}
                  onFocus={e => (e.currentTarget.style.borderColor = accent)}
                  onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")} />
              </div>
              <button onClick={() => scrollTo("catálogo")}
                style={{ background:accent, color:"white", border:"none",
                  padding:"12px 20px", borderRadius:10, fontWeight:700,
                  fontSize:14, cursor:"pointer", whiteSpace:"nowrap" }}>
                Buscar
              </button>
            </div>
          </div>

          {/* Hero image */}
          <div style={{ flex:1, minWidth:0, borderRadius:20, overflow:"hidden",
            aspectRatio:"4/3", maxWidth:520, position:"relative" }}>
            <img src={heroImgUrl} alt="Vehículo destacado"
              style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
            <EditableImageButton field="heroImage" label="Imagen del hero" />
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section style={{ background:accent, padding:"20px" }}>
        <div className="ad-stats"
          style={{ maxWidth:1200, margin:"0 auto",
            display:"grid", gridTemplateColumns:"repeat(2,1fr)" }}>
          {[
            { fv:"stat1", fl:"statLabel1", n:"500+", l:"Vehículos" },
            { fv:"stat2", fl:"statLabel2", n:"15",   l:"Años en el mercado" },
            { fv:"stat3", fl:"statLabel3", n:"98%",  l:"Satisfacción" },
            { fv:"stat4", fl:"statLabel4", n:"12",   l:"Marcas" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign:"center", padding:"14px 8px",
              borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.2)" : "none" }}>
              <p style={{ margin:0, fontSize:"clamp(20px,4vw,28px)", fontWeight:900, color:"white" }}>
                <EditableZone field={s.fv} label={`Stat ${i+1}`}>{s.n}</EditableZone>
              </p>
              <p style={{ margin:"2px 0 0", fontSize:11, color:"rgba(255,255,255,0.8)",
                textTransform:"uppercase", letterSpacing:0.5 }}>
                <EditableZone field={s.fl} label={`Etiqueta stat ${i+1}`}>{s.l}</EditableZone>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Catálogo */}
      <section id="catálogo" style={{ padding:"56px 20px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"flex-end", flexWrap:"wrap", gap:16, marginBottom:28 }}>
            <div>
              <p style={{ margin:"0 0 4px", fontSize:11, color:accent,
                textTransform:"uppercase", letterSpacing:3, fontWeight:700 }}>
                <EditableZone field="featuredLabel" label="Etiqueta destacado">Nuestro stock</EditableZone>
              </p>
              <h2 style={{ margin:0, fontSize:"clamp(22px,4vw,32px)", fontWeight:900 }}>
                <EditableZone field="categoriesHeading" label="Sección categorías">Catálogo completo</EditableZone>
              </h2>
            </div>
            <p style={{ margin:0, fontSize:14, color:"#94a3b8" }}>
              {filtered.length} vehículo{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:28,
            overflowX:"auto", scrollbarWidth:"none", paddingBottom:4 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ background: activeCategory === cat ? accent : "white",
                  color: activeCategory === cat ? "white" : "#64748b",
                  border: activeCategory === cat ? "none" : "1px solid #e2e8f0",
                  padding:"7px 16px", borderRadius:20, cursor:"pointer",
                  fontSize:13, fontWeight:600, whiteSpace:"nowrap" }}>
                {cat}
              </button>
            ))}
          </div>

          {loadingProducts ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8" }}>Cargando vehículos…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8" }}>No se encontraron vehículos.</div>
          ) : (
            <div className="ad-grid" style={{ display:"grid", gridTemplateColumns:"1fr", gap:20 }}>
              {filtered.map(p => (
                <VehicleCard key={p.id} product={p} accent={accent}
                  currency={currency} onClick={() => setSelected(p)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Servicios */}
      <section id="servicios" style={{ padding:"56px 20px", background:"white",
        borderTop:"1px solid #e2e8f0" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <p style={{ margin:"0 0 4px", fontSize:11, color:accent,
            textTransform:"uppercase", letterSpacing:3, fontWeight:700, textAlign:"center" }}>
            <EditableZone field="aboutKicker" label="Kicker 'Nosotros'">Por qué elegirnos</EditableZone>
          </p>
          <h2 style={{ margin:"0 0 40px", fontSize:"clamp(22px,4vw,32px)", fontWeight:900, textAlign:"center" }}>
            <EditableZone field="aboutHeading" label="Título 'Nosotros'">Comprá con confianza</EditableZone>
          </h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:20 }}>
            {[
              { icon:"🔎", fv:"garantia1Title", fl:"garantia1Desc", t:"Inspección 150 puntos", d:"Cada vehículo pasa por revisión técnica completa antes de publicarse." },
              { icon:"📋", fv:"garantia2Title", fl:"garantia2Desc", t:"Documentación en regla", d:"Transferencia y trámites legales gestionados por nosotros." },
              { icon:"💰", fv:"garantia3Title", fl:"garantia3Desc", t:"Financiación", d:"Planes de cuotas disponibles. Consultá las condiciones." },
              { icon:"💬", fv:"garantia4Title", fl:"garantia4Desc", t:"Atención personalizada", d:"Un asesor exclusivo para acompañarte en todo el proceso." },
            ].map((s, i) => (
              <div key={i} style={{ padding:"24px 20px", borderRadius:16,
                border:"1px solid #e2e8f0", background:"#f8fafc" }}>
                <div style={{ fontSize:28, marginBottom:12 }}>{s.icon}</div>
                <p style={{ margin:"0 0 8px", fontSize:15, fontWeight:700, color:"#0f172a" }}>
                  <EditableZone field={s.fv} label={`Garantía ${i+1} — Título`}>{s.t}</EditableZone>
                </p>
                <p style={{ margin:0, fontSize:13, color:"#64748b", lineHeight:1.6 }}>
                  <EditableZone field={s.fl} label={`Garantía ${i+1} — Descripción`}>{s.d}</EditableZone>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nosotros */}
      <section id="nosotros" style={{ padding:"56px 20px" }}>
        <div className="ad-about"
          style={{ maxWidth:1200, margin:"0 auto",
            display:"grid", gridTemplateColumns:"1fr", gap:40, alignItems:"center" }}>
          <div style={{ borderRadius:20, overflow:"hidden", aspectRatio:"4/3", position:"relative" }}>
            <img src={nosotrosUrl} alt="Nosotros"
              style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            <EditableImageButton field="nosotrosImage" label="Imagen sección Nosotros" />
          </div>
          <div>
            <p style={{ margin:"0 0 8px", fontSize:11, color:accent,
              textTransform:"uppercase", letterSpacing:3, fontWeight:700 }}>
              <EditableZone field="contactKicker" label="Etiqueta contacto">Nuestra empresa</EditableZone>
            </p>
            <h2 style={{ margin:"0 0 16px", fontSize:"clamp(22px,4vw,32px)", fontWeight:900 }}>
              <EditableZone field="aboutHeading2" label="Título sobre nosotros">Pasión por los vehículos desde 2010</EditableZone>
            </h2>
            <p style={{ margin:"0 0 14px", fontSize:15, color:"#64748b", lineHeight:1.7 }}>
              <EditableZone field="aboutParagraph1" label="Párrafo 1 'Nosotros'">Somos una empresa familiar con más de 15 años en el mercado automotor. Nos especializamos en brindar la mejor experiencia de compra con total transparencia.</EditableZone>
            </p>
            <p style={{ margin:0, fontSize:15, color:"#64748b", lineHeight:1.7 }}>
              <EditableZone field="aboutParagraph2" label="Párrafo 2 'Nosotros'">Nuestro equipo de asesores especializados y taller propio garantizan la calidad de cada vehículo antes de llegar a tu mano.</EditableZone>
            </p>
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" style={{ padding:"56px 20px", background:"white",
        borderTop:"1px solid #e2e8f0" }}>
        <div style={{ maxWidth:600, margin:"0 auto", textAlign:"center" }}>
          <p style={{ margin:"0 0 8px", fontSize:11, color:accent,
            textTransform:"uppercase", letterSpacing:3, fontWeight:700 }}>
            <EditableZone field="contactKicker2" label="Etiqueta contacto 2">Contacto</EditableZone>
          </p>
          <h2 style={{ margin:"0 0 12px", fontSize:"clamp(22px,4vw,32px)", fontWeight:900 }}>
            <EditableZone field="contactHeading" label="Título contacto">¿Te interesa algún vehículo?</EditableZone>
          </h2>
          <p style={{ margin:"0 0 28px", fontSize:15, color:"#64748b", lineHeight:1.6 }}>
            <EditableZone field="contactSubtext" label="Subtítulo contacto">Escribinos y coordinamos una visita sin costo. Respondemos en menos de 24 hs.</EditableZone>
          </p>
          {whatsapp.enabled && whatsapp.number && (
            <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:10,
                background:"#25d366", color:"white", textDecoration:"none",
                padding:"15px 28px", borderRadius:12, fontWeight:800, fontSize:15 }}>
              <WaIcon />
              <EditableZone field="contactWhatsApp" label="WhatsApp de contacto">Escribinos por WhatsApp</EditableZone>
            </a>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background:"#0f172a", color:"#94a3b8",
        padding:"24px 20px", textAlign:"center" }}>
        <p style={{ margin:"0 0 4px", fontWeight:900, fontSize:16, color:accent, letterSpacing:1 }}>
          {storeName}
        </p>
        <p style={{ margin:0, fontSize:12 }}>
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
            borderRadius:"50%", display:"flex", alignItems:"center",
            justifyContent:"center", boxShadow:"0 4px 16px rgba(37,211,102,0.4)",
            textDecoration:"none" }}>
          <WaIcon />
        </a>
      )}
    </div>
  );
}
