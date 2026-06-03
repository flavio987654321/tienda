"use client";
import { useState, useEffect } from "react";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { EditableZone, EditableImageButton, getContrastColor, useEditContext } from "@/contexts/EditContext";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";

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

/* ── Modal ─────────────────────────────────────────────────── */
function VehicleModal({ product, accent, currency, whatsapp, onClose }: {
  product: StorefrontProduct; accent: string; currency: string;
  whatsapp: { enabled: boolean; number: string }; onClose: () => void;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const imgs = product.images.length > 0
    ? product.images
    : ["https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=75"];
  const specs = [
    { label: "Marca",       value: attr(product, "Marca") },
    { label: "Modelo",      value: attr(product, "Modelo") },
    { label: "Versión",     value: attr(product, "Versión") },
    { label: "Año",         value: attr(product, "Año") },
    { label: "Kilómetros",  value: attr(product, "Km") ? `${attr(product, "Km")} km` : "" },
    { label: "Motor",       value: attr(product, "Motor") },
    { label: "Transmisión", value: attr(product, "Transmisión") },
    { label: "Combustible", value: attr(product, "Combustible") },
    { label: "Tracción",    value: attr(product, "Tracción") },
    { label: "Carrocería",  value: attr(product, "Carrocería") },
    { label: "Color",       value: attr(product, "Color") || (product.colors[0] ?? "") },
    { label: "Puertas",     value: attr(product, "Puertas") ? `${attr(product, "Puertas")} puertas` : "" },
  ].filter(s => s.value);

  const waNumber = whatsapp.number.replace(/\D/g, "");
  const waMsg = encodeURIComponent(
    `Hola! Me interesa el ${product.name}${attr(product, "Año") ? ` (${attr(product, "Año")})` : ""}. ¿Está disponible?`
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#0d0d0d", borderRadius: 16, width: "100%", maxWidth: 900,
          maxHeight: "90vh", overflowY: "auto", border: `1px solid ${accent}33` }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 20px", borderBottom: "1px solid #1e1e1e" }}>
          <span style={{ fontSize: 11, color: accent, textTransform: "uppercase",
            letterSpacing: 2, fontWeight: 700 }}>{product.category}</span>
          <button onClick={onClose}
            style={{ background: "#1a1a1a", border: "none", color: "#888", cursor: "pointer",
              width: 32, height: 32, borderRadius: "50%", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {/* image carousel */}
        <div style={{ position: "relative", background: "#000" }}>
          <img src={imgs[imgIdx]} alt={product.name}
            style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
          {product.badge && (
            <div style={{ position: "absolute", top: 14, left: 14,
              background: accent, color: getContrastColor(accent),
              fontSize: 10, fontWeight: 900, padding: "4px 12px", borderRadius: 2,
              textTransform: "uppercase", letterSpacing: 1 }}>
              {product.badge}
            </div>
          )}
          {imgs.length > 1 && (
            <>
              <button onClick={() => setImgIdx(i => (i - 1 + imgs.length) % imgs.length)}
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  background: "rgba(0,0,0,0.7)", border: `1px solid ${accent}44`, color: accent,
                  width: 36, height: 36, borderRadius: "50%", cursor: "pointer", fontSize: 18 }}>‹</button>
              <button onClick={() => setImgIdx(i => (i + 1) % imgs.length)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "rgba(0,0,0,0.7)", border: `1px solid ${accent}44`, color: accent,
                  width: 36, height: 36, borderRadius: "50%", cursor: "pointer", fontSize: 18 }}>›</button>
              <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
                display: "flex", gap: 6 }}>
                {imgs.map((_, i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    style={{ width: i === imgIdx ? 20 : 8, height: 8, borderRadius: 4, border: "none",
                      cursor: "pointer", background: i === imgIdx ? accent : "rgba(255,255,255,0.3)",
                      transition: "all 0.2s" }} />
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ padding: "24px 20px 28px" }}>
          <h2 style={{ margin: "0 0 6px", fontSize: "clamp(20px,4vw,26px)", fontWeight: 900, color: "white" }}>
            {product.name}
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: "clamp(22px,4vw,30px)", fontWeight: 900, color: accent }}>
            {fmtPrice(product.price, currency)}
          </p>

          {specs.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "1px",
              marginBottom: 20, background: "#1a1a1a", borderRadius: 10, overflow: "hidden",
              border: "1px solid #1e1e1e" }}>
              {specs.map(s => (
                <div key={s.label} style={{ padding: "12px 14px", background: "#111" }}>
                  <p style={{ margin: 0, fontSize: 9, color: accent, textTransform: "uppercase",
                    letterSpacing: 1, fontWeight: 700 }}>{s.label}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: "#e0e0e0" }}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {product.description && (
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#777", lineHeight: 1.7,
              borderLeft: `2px solid ${accent}`, paddingLeft: 12 }}>{product.description}</p>
          )}

          {whatsapp.enabled && waNumber && (
            <a href={`https://wa.me/${waNumber}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                background: "#25d366", color: "white", textDecoration: "none",
                padding: "15px 20px", borderRadius: 10, fontWeight: 800, fontSize: 15 }}>
              <WaIcon /> Consultar por WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Horizontal Vehicle Card (desktop: landscape) ─────────── */
function VehicleCard({ product, accent, currency, onClick }: {
  product: StorefrontProduct; accent: string; currency: string; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  const img = product.images[0]
    ?? "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=75";
  const año = attr(product, "Año");
  const km = attr(product, "Km");
  const motor = attr(product, "Motor");
  const trans = attr(product, "Transmisión");
  const comb = attr(product, "Combustible");
  const traccion = attr(product, "Tracción");
  const carroceria = attr(product, "Carrocería");
  const marca = attr(product, "Marca");

  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="am-card"
      style={{ background: "#0f0f0f", borderRadius: 12, overflow: "hidden", cursor: "pointer",
        border: `1px solid ${hov ? accent : "#1e1e1e"}`,
        boxShadow: hov ? `0 0 24px ${accent}22` : "none",
        transition: "all 0.25s", display: "flex", flexDirection: "column" }}>

      {/* image */}
      <div className="am-card-img"
        style={{ position: "relative", overflow: "hidden", flexShrink: 0 }}>
        <img src={img} alt={product.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block",
            transform: hov ? "scale(1.04)" : "none", transition: "transform 0.5s" }} />
        {product.badge && (
          <div style={{ position: "absolute", top: 12, left: 0,
            background: accent, color: getContrastColor(accent),
            fontSize: 10, fontWeight: 900, padding: "5px 12px 5px 10px",
            borderRadius: "0 4px 4px 0", textTransform: "uppercase", letterSpacing: 1 }}>
            {product.badge}
          </div>
        )}
        <div style={{ position: "absolute", bottom: 10, right: 10,
          background: "rgba(0,0,0,0.75)", color: "#aaa",
          fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 20 }}>
          {product.category}
        </div>
      </div>

      {/* info */}
      <div className="am-card-info"
        style={{ padding: "18px 18px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        {marca && (
          <p style={{ margin: 0, fontSize: 10, color: accent, textTransform: "uppercase",
            letterSpacing: 2, fontWeight: 700 }}>{marca}</p>
        )}
        <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "white",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</p>
        <p style={{ margin: 0, fontSize: "clamp(20px,3vw,24px)", fontWeight: 900, color: accent }}>
          {fmtPrice(product.price, currency)}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px",
          paddingTop: 8, borderTop: "1px solid #1a1a1a" }}>
          {año && <Spec icon="📅" label="Año" val={año} />}
          {km && <Spec icon="🛣️" label="Km" val={`${km} km`} />}
          {motor && <Spec icon="⚙️" label="Motor" val={motor} />}
          {trans && <Spec icon="🔧" label="Caja" val={trans} />}
          {comb && <Spec icon="⛽" label="Combustible" val={comb} />}
          {traccion && <Spec icon="🔄" label="Tracción" val={traccion} />}
          {carroceria && <Spec icon="🚗" label="Carrocería" val={carroceria} />}
        </div>

        <button style={{ marginTop: "auto", background: hov ? accent : "transparent",
          color: hov ? getContrastColor(accent) : accent,
          border: `1px solid ${accent}`,
          borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700,
          cursor: "pointer", transition: "all 0.2s", textAlign: "center" }}>
          Ver detalles →
        </button>
      </div>
    </div>
  );
}

function Spec({ icon, label, val }: { icon: string; label: string; val: string }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 9, color: "#555", textTransform: "uppercase",
        letterSpacing: 0.8 }}>{label}</p>
      <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 700, color: "#ccc" }}>{val}</p>
    </div>
  );
}

/* ── Featured Vehicle (destacado grande) ──────────────────── */
function FeaturedVehicle({ product, accent, currency, onClick }: {
  product: StorefrontProduct; accent: string; currency: string; onClick: () => void;
}) {
  const img = product.images[0]
    ?? "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80";
  const año = attr(product, "Año");
  const km = attr(product, "Km");
  const motor = attr(product, "Motor");
  const trans = attr(product, "Transmisión");
  const traccion = attr(product, "Tracción");
  const carroceria = attr(product, "Carrocería");

  return (
    <div onClick={onClick}
      className="am-featured"
      style={{ borderRadius: 16, overflow: "hidden", cursor: "pointer",
        border: `1px solid ${accent}55`, display: "flex", flexDirection: "column",
        background: "#0d0d0d" }}>
      <div className="am-featured-img"
        style={{ position: "relative", overflow: "hidden", flexShrink: 0 }}>
        <img src={img} alt={product.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0,
          background: "linear-gradient(to right, rgba(0,0,0,0.7) 0%, transparent 60%)" }} />
        <div className="am-featured-overlay"
          style={{ position: "absolute", inset: 0, padding: "28px 32px",
            display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          {product.badge && (
            <span style={{ display: "inline-block", marginBottom: 10,
              background: accent, color: getContrastColor(accent),
              fontSize: 10, fontWeight: 900, padding: "5px 14px",
              borderRadius: 2, textTransform: "uppercase", letterSpacing: 1, alignSelf: "flex-start" }}>
              {product.badge}
            </span>
          )}
          <p style={{ margin: "0 0 4px", fontSize: 12, color: accent,
            textTransform: "uppercase", letterSpacing: 3, fontWeight: 700 }}>
            {product.category}
          </p>
          <h3 style={{ margin: "0 0 8px", fontSize: "clamp(22px,3.5vw,32px)",
            fontWeight: 900, color: "white", lineHeight: 1.2 }}>{product.name}</h3>
          <p style={{ margin: 0, fontSize: "clamp(24px,4vw,36px)", fontWeight: 900, color: accent }}>
            {fmtPrice(product.price, currency)}
          </p>
        </div>
      </div>
      <div className="am-featured-info"
        style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {año && <SpecBig label="Año" val={año} accent={accent} />}
          {km && <SpecBig label="Kilómetros" val={`${km} km`} accent={accent} />}
          {motor && <SpecBig label="Motor" val={motor} accent={accent} />}
          {trans && <SpecBig label="Transmisión" val={trans} accent={accent} />}
          {traccion && <SpecBig label="Tracción" val={traccion} accent={accent} />}
          {carroceria && <SpecBig label="Carrocería" val={carroceria} accent={accent} />}
        </div>
        {product.description && (
          <p style={{ margin: 0, fontSize: 13, color: "#888", lineHeight: 1.6 }}>
            {product.description}
          </p>
        )}
        <button
          style={{ background: accent, color: getContrastColor(accent), border: "none",
            borderRadius: 10, padding: "14px 24px", fontWeight: 800, fontSize: 15,
            cursor: "pointer", alignSelf: "flex-start" }}>
          Ver vehículo completo →
        </button>
      </div>
    </div>
  );
}

function SpecBig({ label, val, accent }: { label: string; val: string; accent: string }) {
  return (
    <div style={{ borderLeft: `2px solid ${accent}`, paddingLeft: 10 }}>
      <p style={{ margin: 0, fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>{label}</p>
      <p style={{ margin: "3px 0 0", fontSize: 15, fontWeight: 700, color: "#ddd" }}>{val}</p>
    </div>
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
    ?? "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1920&q=80";
  const nosotrosUrl = config?.imageOverrides?.["nosotrosImage"]?.url
    ?? "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=900&q=80";

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
  const featured = products.find(p => p.badge === "DESTACADO") ?? products[0] ?? null;

  return (
    <div style={{ background: "#080808", color: "white",
      fontFamily: "'Inter','Segoe UI',sans-serif", minHeight: "100vh" }}>
      <style>{`
        /* cards: vertical mobile → horizontal desktop */
        .am-card { flex-direction: column !important }
        .am-card-img { aspect-ratio: 16/10; width: 100% }
        @media(min-width:640px){
          .am-card { flex-direction: row !important }
          .am-card-img { width: 42% !important; aspect-ratio: unset !important; min-height: 200px }
          .am-card-info { justify-content: center }
        }
        /* grid: 1 col → 2 col */
        .am-grid { grid-template-columns: 1fr !important }
        @media(min-width:700px){ .am-grid { grid-template-columns: repeat(2,1fr) !important } }
        /* featured */
        .am-featured { flex-direction: column !important }
        .am-featured-img { aspect-ratio: 16/8; width: 100% }
        .am-featured-overlay { display: flex !important }
        @media(min-width:768px){
          .am-featured { flex-direction: row !important }
          .am-featured-img { width: 55% !important; aspect-ratio: unset !important; min-height: 340px }
          .am-featured-info { flex: 1 }
        }
        /* nav */
        .am-nav-links { display: none !important }
        @media(min-width:768px){ .am-nav-links { display: flex !important } .am-burger { display: none !important } }
        /* stats */
        .am-stats { grid-template-columns: repeat(2,1fr) }
        @media(min-width:640px){ .am-stats { grid-template-columns: repeat(4,1fr) !important } }
        /* about */
        .am-about { grid-template-columns: 1fr !important }
        @media(min-width:768px){ .am-about { grid-template-columns: 1fr 1fr !important } }
      `}</style>

      {/* Navbar */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? "rgba(8,8,8,0.98)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? `1px solid ${accent}22` : "none",
        transition: "all 0.3s", padding: "0 20px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", height: 64,
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: 3,
            color: accent, textTransform: "uppercase" }}>
            <EditableZone field="storeName" label="Nombre de la tienda">{storeName}</EditableZone>
          </div>
          <div className="am-nav-links"
            style={{ display: "flex", gap: 28, alignItems: "center" }}>
            {["Catálogo", "Servicios", "Nosotros", "Contacto"].map(item => (
              <button key={item} onClick={() => scrollTo(item.toLowerCase())}
                style={{ background: "none", border: "none", color: "#999", cursor: "pointer",
                  fontSize: 13, fontWeight: 500, letterSpacing: 0.5,
                  textTransform: "uppercase" }}
                onMouseEnter={e => (e.currentTarget.style.color = accent)}
                onMouseLeave={e => (e.currentTarget.style.color = "#999")}>
                {item}
              </button>
            ))}
            {whatsapp.enabled && whatsapp.number && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ background: accent, color: getContrastColor(accent),
                  textDecoration: "none", padding: "8px 18px", borderRadius: 6,
                  fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>
                Consultar
              </a>
            )}
          </div>
          <button className="am-burger" onClick={() => setMenuOpen(m => !m)}
            style={{ background: "none", border: `1px solid ${accent}44`,
              color: accent, padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: 18 }}>
            {menuOpen ? "×" : "☰"}
          </button>
        </div>
        {menuOpen && (
          <div style={{ background: "#0a0a0a", borderTop: `1px solid ${accent}22`,
            padding: "12px 20px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
            {["catálogo", "servicios", "nosotros", "contacto"].map(item => (
              <button key={item} onClick={() => { scrollTo(item); setMenuOpen(false); }}
                style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer",
                  textAlign: "left", padding: "10px 4px", fontSize: 14, fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid #111" }}>
                {item}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Hero — full-screen cinematic */}
      <section style={{ position: "relative", minHeight: "100svh",
        display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0,
          backgroundImage: `url(${heroBgUrl})`,
          backgroundSize: "cover", backgroundPosition: "center" }}>
          <div style={{ position: "absolute", inset: 0,
            background: "linear-gradient(135deg, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.2) 100%)" }} />
        </div>
        <EditableImageButton field="heroBackground" label="Imagen de fondo del hero" />

        {/* thin gold vertical line */}
        <div style={{ position: "absolute", left: 40, top: "20%", bottom: "20%", width: 1,
          background: `linear-gradient(to bottom, transparent, ${accent}, transparent)`,
          opacity: 0.4 }} />

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 1200,
          margin: "0 auto", padding: "0 20px 80px 44px" }}>
          <p style={{ margin: "0 0 14px", fontSize: 11, color: accent,
            textTransform: "uppercase", letterSpacing: 4, fontWeight: 700 }}>
            <EditableZone field="heroBadge" label="Badge hero">Concesionaria Oficial</EditableZone>
          </p>
          <h1 style={{ margin: "0 0 18px", fontSize: "clamp(36px,7vw,72px)",
            fontWeight: 900, lineHeight: 1.0, maxWidth: 700, letterSpacing: -1 }}>
            <EditableZone field="heroHeading" label="Título principal">{"Tu próximo\nvehículo\nte espera."}</EditableZone>
          </h1>
          <p style={{ margin: "0 0 36px", fontSize: "clamp(14px,2vw,17px)", color: "#777",
            maxWidth: 440, lineHeight: 1.7 }}>
            <EditableZone field="heroSubtext" label="Subtítulo">Stock premium · Financiación disponible · Transferencia en regla.</EditableZone>
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("catálogo")}
              style={{ background: accent, color: getContrastColor(accent), border: "none",
                padding: "14px 32px", borderRadius: 6, fontWeight: 800,
                fontSize: 13, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase" }}>
              <EditableZone field="heroCta" label="Botón principal">Ver catálogo</EditableZone>
            </button>
            {whatsapp.enabled && whatsapp.number && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8,
                  background: "transparent", color: "white", textDecoration: "none",
                  border: "1px solid rgba(255,255,255,0.25)", padding: "14px 24px",
                  borderRadius: 6, fontWeight: 700, fontSize: 13 }}>
                <WaIcon />
                <EditableZone field="heroCtaSecondary" label="Botón secundario">Hablar con asesor</EditableZone>
              </a>
            )}
          </div>
        </div>

        {/* scroll hint */}
        <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.4 }}>
          <div style={{ width: 1, height: 40, background: `linear-gradient(to bottom, transparent, ${accent})` }} />
          <span style={{ fontSize: 9, letterSpacing: 3, color: accent, textTransform: "uppercase" }}>scroll</span>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: accent }}>
        <div className="am-stats"
          style={{ maxWidth: 1200, margin: "0 auto", display: "grid",
            gridTemplateColumns: "repeat(2,1fr)" }}>
          {[
            { fv: "stat1", fl: "statLabel1", n: "500+", l: "Vehículos vendidos" },
            { fv: "stat2", fl: "statLabel2", n: "15",   l: "Años de experiencia" },
            { fv: "stat3", fl: "statLabel3", n: "98%",  l: "Clientes satisfechos" },
            { fv: "stat4", fl: "statLabel4", n: "12",   l: "Marcas disponibles" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center", padding: "20px 8px",
              borderRight: i % 2 === 0 ? "1px solid rgba(0,0,0,0.12)" : "none",
              borderBottom: i < 2 ? "1px solid rgba(0,0,0,0.12)" : "none" }}>
              <p style={{ margin: 0, fontSize: "clamp(24px,5vw,34px)", fontWeight: 900,
                color: getContrastColor(accent) }}>
                <EditableZone field={s.fv} label={`Stat ${i+1}`}>{s.n}</EditableZone>
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 10, color: getContrastColor(accent),
                opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>
                <EditableZone field={s.fl} label={`Etiqueta stat ${i+1}`}>{s.l}</EditableZone>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured vehicle */}
      {!loadingProducts && featured && (
        <section style={{ padding: "72px 20px 0", background: "#080808" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
              <div style={{ width: 32, height: 1, background: accent }} />
              <p style={{ margin: 0, fontSize: 11, color: accent,
                textTransform: "uppercase", letterSpacing: 4, fontWeight: 700 }}>
                <EditableZone field="featuredLabel" label="Etiqueta vehículo destacado">Vehículo destacado</EditableZone>
              </p>
            </div>
            <FeaturedVehicle product={featured} accent={accent}
              currency={currency} onClick={() => setSelected(featured)} />
          </div>
        </section>
      )}

      {/* Catálogo */}
      <section id="catálogo" style={{ padding: "72px 20px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
            <div style={{ width: 32, height: 1, background: accent }} />
            <p style={{ margin: 0, fontSize: 11, color: accent,
              textTransform: "uppercase", letterSpacing: 4, fontWeight: 700 }}>
              <EditableZone field="catalogKicker" label="Etiqueta catálogo">Nuestro stock</EditableZone>
            </p>
          </div>
          <h2 style={{ margin: "0 0 32px 48px", fontSize: "clamp(24px,4vw,38px)", fontWeight: 900 }}>
            <EditableZone field="categoriesHeading" label="Título catálogo">Catálogo de vehículos</EditableZone>
          </h2>

          {/* category filters */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ background: activeCategory === cat ? accent : "transparent",
                  color: activeCategory === cat ? getContrastColor(accent) : "#666",
                  border: activeCategory === cat ? "none" : "1px solid #2a2a2a",
                  padding: "8px 18px", borderRadius: 2, cursor: "pointer",
                  fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                {cat}
              </button>
            ))}
          </div>

          {loadingProducts ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#333" }}>
              Cargando vehículos…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#333" }}>
              No hay vehículos en esta categoría.
            </div>
          ) : (
            <div className="am-grid" style={{ display: "grid", gap: 16 }}>
              {filtered.map(p => (
                <VehicleCard key={p.id} product={p} accent={accent}
                  currency={currency} onClick={() => setSelected(p)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Servicios */}
      <section id="servicios" style={{ padding: "72px 20px",
        borderTop: `1px solid ${accent}22`, borderBottom: `1px solid ${accent}22` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
            <div style={{ width: 32, height: 1, background: accent }} />
            <p style={{ margin: 0, fontSize: 11, color: accent,
              textTransform: "uppercase", letterSpacing: 4, fontWeight: 700 }}>
              <EditableZone field="aboutKicker" label="Kicker servicios">Por qué elegirnos</EditableZone>
            </p>
          </div>
          <h2 style={{ margin: "0 0 48px 48px", fontSize: "clamp(22px,4vw,34px)", fontWeight: 900 }}>
            <EditableZone field="aboutHeading" label="Título servicios">Servicios y garantías</EditableZone>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 1,
            background: "#1a1a1a", border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden" }}>
            {[
              { fv: "garantia1Title", fl: "garantia1Desc", t: "Inspección técnica", d: "Revisión de 150 puntos antes de la venta." },
              { fv: "garantia2Title", fl: "garantia2Desc", t: "Documentación legal", d: "Transferencia y trámites 100% en regla." },
              { fv: "garantia3Title", fl: "garantia3Desc", t: "Financiación", d: "Planes de cuotas adaptados a tu presupuesto." },
              { fv: "garantia4Title", fl: "garantia4Desc", t: "Asesoría personal", d: "Te acompañamos en cada paso del proceso." },
            ].map((s, i) => (
              <div key={i} style={{ background: "#0d0d0d", padding: "28px 24px",
                borderLeft: i === 0 ? "none" : "1px solid #1a1a1a" }}>
                <div style={{ width: 36, height: 3, background: accent, borderRadius: 2, marginBottom: 18 }} />
                <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 800, color: "white" }}>
                  <EditableZone field={s.fv} label={`Servicio ${i+1} — Título`}>{s.t}</EditableZone>
                </p>
                <p style={{ margin: 0, fontSize: 13, color: "#666", lineHeight: 1.6 }}>
                  <EditableZone field={s.fl} label={`Servicio ${i+1} — Desc`}>{s.d}</EditableZone>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nosotros */}
      <section id="nosotros" style={{ padding: "72px 20px" }}>
        <div className="am-about"
          style={{ maxWidth: 1200, margin: "0 auto", display: "grid",
            gridTemplateColumns: "1fr", gap: 56, alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
              <div style={{ width: 32, height: 1, background: accent }} />
              <p style={{ margin: 0, fontSize: 11, color: accent,
                textTransform: "uppercase", letterSpacing: 4, fontWeight: 700 }}>
                <EditableZone field="contactKicker" label="Etiqueta nosotros">Nuestra historia</EditableZone>
              </p>
            </div>
            <h2 style={{ margin: "0 0 20px 48px", fontSize: "clamp(22px,4vw,34px)", fontWeight: 900 }}>
              <EditableZone field="aboutHeading2" label="Título nosotros">Años de pasión por los vehículos</EditableZone>
            </h2>
            <p style={{ margin: "0 0 14px 48px", fontSize: 15, color: "#666", lineHeight: 1.8 }}>
              <EditableZone field="aboutParagraph1" label="Párrafo 1 Nosotros">Somos una empresa familiar con más de una década en el mercado automotor. Nuestro compromiso es la transparencia total en cada operación.</EditableZone>
            </p>
            <p style={{ margin: "0 0 28px 48px", fontSize: 15, color: "#666", lineHeight: 1.8 }}>
              <EditableZone field="aboutParagraph2" label="Párrafo 2 Nosotros">Contamos con asesores especializados y taller propio para garantizar la calidad de cada vehículo en nuestro stock.</EditableZone>
            </p>
            {whatsapp.enabled && whatsapp.number && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ marginLeft: 48, display: "inline-flex", alignItems: "center", gap: 8,
                  background: accent, color: getContrastColor(accent), textDecoration: "none",
                  padding: "12px 24px", borderRadius: 6, fontWeight: 800, fontSize: 13 }}>
                <WaIcon /> Consultar ahora
              </a>
            )}
          </div>
          <div style={{ position: "relative", borderRadius: 12, overflow: "hidden",
            aspectRatio: "4/3" }}>
            <img src={nosotrosUrl} alt="Nosotros"
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0,
              background: `linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.7))` }} />
            <EditableImageButton field="nosotrosImage" label="Imagen sección Nosotros" />
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" style={{ padding: "72px 20px", background: "#040404",
        borderTop: `1px solid ${accent}22` }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <div style={{ width: 48, height: 1, background: accent, margin: "0 auto 20px" }} />
          <h2 style={{ margin: "0 0 12px", fontSize: "clamp(26px,5vw,42px)",
            fontWeight: 900, letterSpacing: -1 }}>
            <EditableZone field="contactHeading" label="Título contacto">¿Encontraste tu vehículo?</EditableZone>
          </h2>
          <p style={{ margin: "0 0 36px", fontSize: 15, color: "#666", lineHeight: 1.7 }}>
            <EditableZone field="contactSubtext" label="Subtítulo contacto">Contactanos y un asesor te responde en minutos para coordinar una visita sin compromiso.</EditableZone>
          </p>
          {whatsapp.enabled && whatsapp.number && (
            <a href={`https://wa.me/${whatsapp.number.replace(/\D/g, "")}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 12,
                background: "#25d366", color: "white", textDecoration: "none",
                padding: "18px 36px", borderRadius: 8, fontWeight: 900, fontSize: 16 }}>
              <WaIcon />
              <EditableZone field="contactWhatsApp" label="WhatsApp de contacto">Escribinos por WhatsApp</EditableZone>
            </a>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "#030303", padding: "24px 20px",
        borderTop: `1px solid ${accent}22`, textAlign: "center" }}>
        <p style={{ margin: "0 0 4px", fontWeight: 900, fontSize: 14,
          color: accent, letterSpacing: 3, textTransform: "uppercase" }}>
          {storeName}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: "#333" }}>
          <EditableZone field="footerCopyright" label="Copyright">
            {`© ${new Date().getFullYear()} ${storeName}. Todos los derechos reservados.`}
          </EditableZone>
        </p>
      </footer>

      {selected && (
        <VehicleModal product={selected} accent={accent} currency={currency}
          whatsapp={whatsapp} onClose={() => setSelected(null)} />
      )}

      {!editMode && whatsapp.enabled && whatsapp.number && (
        <a href={`https://wa.me/${whatsapp.number.replace(/\D/g, "")}`}
          target="_blank" rel="noopener noreferrer"
          style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200,
            background: "#25d366", color: "white", width: 54, height: 54,
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(37,211,102,0.4)", textDecoration: "none" }}>
          <WaIcon />
        </a>
      )}
    </div>
  );
}
