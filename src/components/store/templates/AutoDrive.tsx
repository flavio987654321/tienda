"use client";
import { useState, useEffect } from "react";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { EditableZone, EditableImageButton, EditableSectionBg, BgDragHandle, getContrastColor, useEditContext } from "@/contexts/EditContext";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";
import type { ImageOverride } from "@/types/store-config";

function fmtPrice(n: number, currency: string) {
  return (currency === "USD" ? "USD " : "$") + n.toLocaleString("es-AR");
}
function attr(p: StorefrontProduct, key: string) {
  return p.attributes.find(a => a.key.toLowerCase() === key.toLowerCase())?.value ?? "";
}
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

/* ── Section bg helpers ───────────────────────────────────── */
function secBg(ov: ImageOverride | undefined, fallback: string): React.CSSProperties {
  if (ov?.url) return { backgroundImage: `url(${ov.url})`, backgroundSize: "cover", backgroundPosition: `${ov.posX ?? 50}% ${ov.posY ?? 50}%` };
  return { background: fallback };
}
function secText(ov: ImageOverride | undefined, bg: string): string {
  if (ov?.url) return ov.overlayType === "light" ? "#0f172a" : "white";
  return getContrastColor(bg) === "light" ? "white" : "#0f172a";
}
function secMid(ov: ImageOverride | undefined, bg: string): string {
  if (ov?.url) return ov.overlayType === "light" ? "#475569" : "#94a3b8";
  return getContrastColor(bg) === "light" ? "#94a3b8" : "#64748b";
}
function SectionOverlay({ ov }: { ov: ImageOverride | undefined }) {
  if (!ov?.url || ov.overlayType === "none") return null;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
      background: ov.overlayType === "light"
        ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})`
        : `rgba(0,0,0,${ov.overlayOpacity ?? 0.45})` }} />
  );
}

function WaIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

const PRICE_RANGES = [
  { label: "Todos los precios", min: 0, max: Infinity },
  { label: "Hasta $15M",        min: 0, max: 15_000_000 },
  { label: "$15M – $35M",       min: 15_000_000, max: 35_000_000 },
  { label: "Más de $35M",       min: 35_000_000, max: Infinity },
];

/* ── Modal ────────────────────────────────────────────────── */
function VehicleModal({ product, accent, currency, whatsapp, onClose }: {
  product: StorefrontProduct; accent: string; currency: string;
  whatsapp: { enabled: boolean; number: string }; onClose: () => void;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const imgs = product.images.length > 0
    ? product.images
    : ["https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=75"];
  const condicion = attr(product, "Condición");
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
    `Hola! Me interesa el ${product.name}${attr(product, "Año") ? ` (${attr(product, "Año")})` : ""}. ¿Podés darme más info?`
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.8)",
        backdropFilter: "blur(6px)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "white", borderRadius: 20, width: "100%", maxWidth: 880,
          maxHeight: "92vh", overflowY: "auto", boxShadow: "0 40px 100px rgba(0,0,0,0.25)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 20px", borderBottom: "1px solid #e2e8f0", position: "sticky",
          top: 0, background: "white", zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ background: `${accent}15`, color: accent,
              fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
              {product.category}
            </span>
            {product.badge && (
              <span style={{ background: accent, color: getContrastColor(accent),
                fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                {product.badge}
              </span>
            )}
          </div>
          <button onClick={onClose}
            style={{ background: "#f1f5f9", border: "none", color: "#64748b",
              cursor: "pointer", width: 32, height: 32, borderRadius: "50%",
              fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <div style={{ position: "relative", background: "#f8fafc" }}>
          <img src={imgs[imgIdx]} alt={product.name}
            style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
          {imgs.length > 1 && (
            <>
              <button onClick={() => setImgIdx(i => (i - 1 + imgs.length) % imgs.length)}
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  background: "white", border: "none", color: "#334155",
                  width: 38, height: 38, borderRadius: "50%", cursor: "pointer", fontSize: 20,
                  boxShadow: "0 2px 10px rgba(0,0,0,0.15)" }}>‹</button>
              <button onClick={() => setImgIdx(i => (i + 1) % imgs.length)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "white", border: "none", color: "#334155",
                  width: 38, height: 38, borderRadius: "50%", cursor: "pointer", fontSize: 20,
                  boxShadow: "0 2px 10px rgba(0,0,0,0.15)" }}>›</button>
              <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
                display: "flex", gap: 6 }}>
                {imgs.map((_, i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    style={{ width: 8, height: 8, borderRadius: "50%", border: "none",
                      cursor: "pointer", background: i === imgIdx ? accent : "rgba(255,255,255,0.6)" }} />
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ padding: "20px 20px 28px" }}>
          {condicion && (
            <div style={{ marginBottom: 10 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                background: condicion === "0 km" || condicion === "Nuevo" ? "#dcfce7" :
                            condicion === "Casi nuevo" || condicion === "Muy bueno" ? "#dbeafe" :
                            condicion === "Bueno" ? "#fef3c7" : "#f1f5f9",
                color: condicion === "0 km" || condicion === "Nuevo" ? "#16a34a" :
                       condicion === "Casi nuevo" || condicion === "Muy bueno" ? "#2563eb" :
                       condicion === "Bueno" ? "#d97706" : "#64748b",
              }}>
                {condicion}
              </span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: "clamp(18px,3vw,24px)",
              fontWeight: 800, color: "#0f172a" }}>{product.name}</h2>
            <p style={{ margin: 0, fontSize: "clamp(20px,3vw,26px)",
              fontWeight: 900, color: accent }}>{fmtPrice(product.price, currency)}</p>
          </div>

          {specs.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)",
              gap: "10px 20px", marginBottom: 16,
              padding: "16px", background: "#f8fafc", borderRadius: 12 }}>
              {specs.map(s => (
                <div key={s.label} style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 10 }}>
                  <p style={{ margin: 0, fontSize: 9, color: "#94a3b8",
                    textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{s.label}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {product.description && (
            <p style={{ margin: "0 0 16px", fontSize: 14, color: "#64748b",
              lineHeight: 1.7, background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}>
              {product.description}
            </p>
          )}

          {whatsapp.enabled && waNumber && (
            <a href={`https://wa.me/${waNumber}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                background: "#25d366", color: "white", textDecoration: "none",
                padding: "14px 20px", borderRadius: 12, fontWeight: 800, fontSize: 15 }}>
              <WaIcon size={20} /> Consultar por WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Vehicle Card ─────────────────────────────────────────── */
function VehicleCard({ product, accent, currency, theme = "light", onClick }: {
  product: StorefrontProduct; accent: string; currency: string;
  theme?: "dark" | "light"; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  const img = product.images[0]
    ?? "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=70";
  const año = attr(product, "Año");
  const km = attr(product, "Km");
  const motor = attr(product, "Motor");
  const trans = attr(product, "Transmisión");
  const comb = attr(product, "Combustible");
  const traccion = attr(product, "Tracción");
  const carroceria = attr(product, "Carrocería");
  const condicion = attr(product, "Condición");
  const marca = attr(product, "Marca");

  const L = theme === "light";
  const cardBg    = L ? "white" : "#1a2d4a";
  const borderCol = L ? "#e2e8f0" : "#2d4a6e";
  const titleCol  = L ? "#0f172a" : "white";
  const priceCol  = accent;
  const midCol    = L ? "#94a3b8" : "#64748b";
  const divider   = L ? "#f1f5f9" : "#1e3a5f";
  const chipBg    = L ? "#f1f5f9" : "rgba(255,255,255,0.08)";
  const chipCol   = L ? "#64748b" : "#94a3b8";
  const catBg     = L ? "rgba(255,255,255,0.92)" : "rgba(6,15,36,0.75)";
  const catCol    = L ? "#475569" : "#94a3b8";

  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: cardBg, borderRadius: 14, overflow: "hidden", cursor: "pointer",
        boxShadow: hov ? "0 16px 40px rgba(0,0,0,0.13)" : "0 2px 8px rgba(0,0,0,0.06)",
        transform: hov ? "translateY(-3px)" : "none",
        border: `1px solid ${hov ? accent : borderCol}`,
        transition: "all 0.2s", display: "flex", flexDirection: "column" }}>

      <div style={{ position: "relative", aspectRatio: "16/10", overflow: "hidden", background: "#f8fafc" }}>
        <img src={img} alt={product.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block",
            transform: hov ? "scale(1.05)" : "none", transition: "transform 0.5s" }} />
        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0,
          width: 4, background: hov ? accent : "transparent", transition: "background 0.2s" }} />
        {product.badge && (
          <div style={{ position: "absolute", top: 10, left: 10,
            background: product.badge === "OPORTUNIDAD" ? "#ef4444"
              : product.badge === "FINANCIADO" ? "#8b5cf6"
              : product.badge === "NUEVO" ? "#22c55e"
              : accent,
            color: "white", fontSize: 9, fontWeight: 800,
            padding: "3px 8px", borderRadius: 20, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {product.badge}
          </div>
        )}
        <div style={{ position: "absolute", bottom: 8, right: 8,
          background: catBg, color: catCol,
          fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20 }}>
          {product.category}
        </div>
      </div>

      <div style={{ padding: "14px 14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        {marca && (
          <span style={{ fontSize: 10, color: accent, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: 1 }}>{marca}</span>
        )}
        <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: titleCol,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {condicion && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
              background: condicion === "0 km" || condicion === "Nuevo" ? "#dcfce7" :
                          condicion === "Casi nuevo" || condicion === "Muy bueno" ? "#dbeafe" :
                          condicion === "Bueno" ? "#fef3c7" : chipBg,
              color: condicion === "0 km" || condicion === "Nuevo" ? "#16a34a" :
                     condicion === "Casi nuevo" || condicion === "Muy bueno" ? "#2563eb" :
                     condicion === "Bueno" ? "#d97706" : chipCol,
            }}>{condicion}</span>
          )}
          {año && <InfoChip val={año} bg={chipBg} col={chipCol} />}
          {km && <InfoChip val={`${km} km`} bg={chipBg} col={chipCol} />}
          {motor && <InfoChip val={motor} bg={chipBg} col={chipCol} />}
          {trans && <InfoChip val={trans} bg={`${accent}12`} col={accent} />}
          {comb && <InfoChip val={comb} bg={chipBg} col={chipCol} />}
          {traccion && <InfoChip val={traccion} bg={chipBg} col={chipCol} />}
          {carroceria && <InfoChip val={carroceria} bg={chipBg} col={chipCol} />}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginTop: "auto", paddingTop: 8,
          borderTop: `1px solid ${divider}` }}>
          <p style={{ margin: 0, fontSize: "clamp(16px,2.5vw,20px)", fontWeight: 900, color: priceCol }}>
            {fmtPrice(product.price, currency)}
            {product.comparePrice && (
              <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 500,
                color: midCol, textDecoration: "line-through" }}>
                {fmtPrice(product.comparePrice, currency)}
              </span>
            )}
          </p>
          <span style={{ fontSize: 12, fontWeight: 700, color: hov ? accent : midCol,
            transition: "color 0.2s" }}>Ver →</span>
        </div>
      </div>
    </div>
  );
}

function InfoChip({ val, bg, col }: { val: string; bg: string; col: string }) {
  return (
    <span style={{ background: bg, color: col, fontSize: 10, fontWeight: 600,
      padding: "2px 8px", borderRadius: 20 }}>{val}</span>
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
    ?? "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=900&q=80";
  const nosotrosUrl = config?.imageOverrides?.["nosotrosImage"]?.url
    ?? "https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?auto=format&fit=crop&w=900&q=80";

  /* ── Section bg / text colors ─────────────────────────── */
  const sc   = config?.sectionColors ?? {};
  const iovr = config?.imageOverrides ?? {};

  const heroBg    = sc["bgHero"]      ?? "white";
  const heroImg   = iovr["sectionbg_bgHero"];
  const heroText  = secText(heroImg, heroBg);
  const heroMid   = secMid(heroImg, heroBg);

  const statsBg   = sc["bgStats"]     ?? accent;
  const statsImg  = iovr["sectionbg_bgStats"];
  const statsText = secText(statsImg, statsBg);

  const catalogoBg  = sc["bgCatalogo"]  ?? "#f8fafc";
  const catalogoImg = iovr["sectionbg_bgCatalogo"];
  const catText     = secText(catalogoImg, catalogoBg);
  const catMid      = secMid(catalogoImg, catalogoBg);
  const catTheme    = catText === "white" ? "dark" as const : "light" as const;

  const serviciosBg  = sc["bgServicios"] ?? "white";
  const serviciosImg = iovr["sectionbg_bgServicios"];
  const svcText      = secText(serviciosImg, serviciosBg);
  const svcMid       = secMid(serviciosImg, serviciosBg);
  const svcIsLight   = svcText === "#0f172a";
  const svcCardBg    = svcIsLight ? "#f8fafc" : "rgba(255,255,255,0.07)";
  const svcCardBorder= svcIsLight ? "#e2e8f0" : "rgba(255,255,255,0.12)";

  const nosotrosBg  = sc["bgNosotros"]  ?? "#f8fafc";
  const nosotrosImg2= iovr["sectionbg_bgNosotros"];
  const nosText     = secText(nosotrosImg2, nosotrosBg);
  const nosMid      = secMid(nosotrosImg2, nosotrosBg);

  const contactoBg  = sc["bgContacto"]  ?? "white";
  const contactoImg = iovr["sectionbg_bgContacto"];
  const conText     = secText(contactoImg, contactoBg);
  const conMid      = secMid(contactoImg, contactoBg);

  const footerBg    = sc["bgFooter"]    ?? "#0f172a";
  const footerImg   = iovr["sectionbg_bgFooter"];
  const ftText      = secText(footerImg, footerBg);
  const ftMid       = secMid(footerImg, footerBg);

  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<StorefrontProduct | null>(null);
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [activePriceRange, setActivePriceRange] = useState(0);
  const [search, setSearch] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const categories = ["Todos", ...Array.from(new Set(products.map(p => p.category))).filter(Boolean)];
  const pr = PRICE_RANGES[activePriceRange];
  const filtered = products.filter(p => {
    const matchCat = activeCategory === "Todos" || p.category === activeCategory;
    const matchPrice = p.price >= pr.min && p.price <= pr.max;
    const q = search.toLowerCase().trim();
    const matchSearch = !q || p.name.toLowerCase().includes(q)
      || p.attributes.some(a => a.value.toLowerCase().includes(q));
    return matchCat && matchPrice && matchSearch;
  });

  return (
    <div style={{ background: "#f8fafc", color: "#0f172a",
      fontFamily: "'Inter','Segoe UI',sans-serif", minHeight: "100vh" }}>
      <style>{`
        .ad-grid { grid-template-columns: 1fr !important }
        @media(min-width:560px){ .ad-grid { grid-template-columns: repeat(2,1fr) !important } }
        @media(min-width:900px){ .ad-grid { grid-template-columns: repeat(3,1fr) !important } }
        .ad-nav-links { display: none !important }
        @media(min-width:768px){ .ad-nav-links { display: flex !important } .ad-burger { display: none !important } }
        .ad-hero { flex-direction: column !important }
        @media(min-width:768px){ .ad-hero { flex-direction: row !important; align-items: stretch !important } }
        .ad-about { grid-template-columns: 1fr !important }
        @media(min-width:768px){ .ad-about { grid-template-columns: 1fr 1fr !important } }
        .ad-stats { grid-template-columns: repeat(2,1fr) }
        @media(min-width:640px){ .ad-stats { grid-template-columns: repeat(4,1fr) !important } }
        .ad-search { width: 100% !important; box-sizing: border-box }
      `}</style>

      {/* Navbar */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "white",
        boxShadow: scrolled ? "0 2px 16px rgba(0,0,0,0.08)" : "0 1px 0 #e2e8f0",
        transition: "box-shadow 0.3s", padding: "0 20px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", height: 58,
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 900, fontSize: 17, color: accent, letterSpacing: 0.5 }}>
            <EditableZone field="storeName" label="Nombre de la tienda">{storeName}</EditableZone>
          </div>
          <div className="ad-nav-links" style={{ display: "flex", gap: 24, alignItems: "center" }}>
            {["Catálogo", "Servicios", "Nosotros", "Contacto"].map(item => (
              <button key={item} onClick={() => scrollTo(item.toLowerCase())}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer",
                  fontSize: 14, fontWeight: 500 }}
                onMouseEnter={e => (e.currentTarget.style.color = accent)}
                onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}>
                {item}
              </button>
            ))}
            {whatsapp.enabled && whatsapp.number && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6,
                  background: "#25d366", color: "white", textDecoration: "none",
                  padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
                <WaIcon size={14} /> WhatsApp
              </a>
            )}
          </div>
          <button className="ad-burger" onClick={() => setMenuOpen(m => !m)}
            style={{ background: "none", border: "1px solid #e2e8f0", color: "#475569",
              padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontSize: 18 }}>
            {menuOpen ? "×" : "☰"}
          </button>
        </div>
        {menuOpen && (
          <div style={{ background: "white", borderTop: "1px solid #e2e8f0",
            padding: "10px 20px 18px", display: "flex", flexDirection: "column", gap: 2 }}>
            {["Catálogo", "Servicios", "Nosotros", "Contacto"].map(item => (
              <button key={item} onClick={() => { scrollTo(item.toLowerCase()); setMenuOpen(false); }}
                style={{ background: "none", border: "none", color: "#475569", cursor: "pointer",
                  textAlign: "left", padding: "10px 4px", fontSize: 15, fontWeight: 500,
                  borderBottom: "1px solid #f1f5f9" }}>
                {item}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: 58, position: "relative", ...secBg(heroImg, heroBg),
        borderBottom: "1px solid #e2e8f0" }}>
        <BgDragHandle imgKey="sectionbg_bgHero" />
        <SectionOverlay ov={heroImg} />
        <EditableSectionBg field="bgHero" label="Fondo hero" />
        <div className="ad-hero" style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", display: "flex" }}>
          <div style={{ flex: "0 0 auto", padding: "48px 20px 48px",
            display: "flex", flexDirection: "column", justifyContent: "center" }}
            className="ad-hero-left">
            <p style={{ margin: "0 0 10px", fontSize: 11, color: accent,
              textTransform: "uppercase", letterSpacing: 3, fontWeight: 700 }}>
              <EditableZone field="heroBadge" label="Badge hero">Concesionaria Oficial</EditableZone>
            </p>
            <h1 style={{ margin: "0 0 12px", fontSize: "clamp(26px,4vw,48px)",
              fontWeight: 900, lineHeight: 1.1, color: heroText }}>
              <EditableZone field="heroHeading" label="Título principal">{"Encontrá el\nvehículo ideal"}</EditableZone>
            </h1>
            <p style={{ margin: "0 0 24px", fontSize: "clamp(13px,1.8vw,16px)",
              color: heroMid, lineHeight: 1.7 }}>
              <EditableZone field="heroSubtext" label="Subtítulo">El mayor catálogo en autos y motos. Financiación disponible, entrega rápida.</EditableZone>
            </p>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
                  stroke="#94a3b8" strokeWidth={2} strokeLinecap="round"
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input className="ad-search" value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar marca, modelo, año..."
                  style={{ paddingLeft: 36, paddingRight: 14, paddingTop: 12, paddingBottom: 12,
                    border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 14,
                    outline: "none", background: "#f8fafc" }}
                  onFocus={e => (e.currentTarget.style.borderColor = accent)}
                  onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")} />
              </div>
              <button onClick={() => scrollTo("catálogo")}
                style={{ background: accent, color: "white", border: "none",
                  padding: "0 20px", borderRadius: 10, fontWeight: 700,
                  fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>
                Buscar
              </button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["Sedanes", "SUVs", "Pickups", "Motos"].map(cat => (
                <button key={cat}
                  onClick={() => { setActiveCategory(cat); scrollTo("catálogo"); }}
                  style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0",
                    padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    cursor: "pointer" }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${accent}15`; e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#475569"; }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, position: "relative", minHeight: 260, overflow: "hidden",
            background: "#0f172a" }}>
            <img src={heroImgUrl} alt="Vehículo destacado"
              style={{ width: "100%", height: "100%", objectFit: "cover",
                display: "block", opacity: 0.9 }} />
            <div style={{ position: "absolute", inset: 0,
              background: "linear-gradient(to right, white 0%, transparent 20%)" }} />
            <EditableImageButton field="heroImage" label="Imagen del hero" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ position: "relative", ...secBg(statsImg, statsBg) }}>
        <BgDragHandle imgKey="sectionbg_bgStats" />
        <SectionOverlay ov={statsImg} />
        <EditableSectionBg field="bgStats" label="Fondo estadísticas" />
        <div className="ad-stats" style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(2,1fr)" }}>
          {[
            { fv: "stat1", fl: "statLabel1", n: "500+", l: "Vehículos" },
            { fv: "stat2", fl: "statLabel2", n: "15",   l: "Años en el mercado" },
            { fv: "stat3", fl: "statLabel3", n: "98%",  l: "Satisfacción" },
            { fv: "stat4", fl: "statLabel4", n: "12",   l: "Marcas" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center", padding: "16px 8px",
              borderRight: i % 2 === 0 ? "1px solid rgba(0,0,0,0.12)" : "none",
              borderBottom: i < 2 ? "1px solid rgba(0,0,0,0.12)" : "none" }}>
              <p style={{ margin: 0, fontSize: "clamp(20px,4vw,28px)", fontWeight: 900, color: statsText }}>
                <EditableZone field={s.fv} label={`Stat ${i+1}`}>{s.n}</EditableZone>
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 10, color: statsText,
                opacity: 0.7, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <EditableZone field={s.fl} label={`Etiqueta stat ${i+1}`}>{s.l}</EditableZone>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Catálogo */}
      <section id="catálogo" style={{ padding: "48px 20px", position: "relative", ...secBg(catalogoImg, catalogoBg) }}>
        <BgDragHandle imgKey="sectionbg_bgCatalogo" />
        <SectionOverlay ov={catalogoImg} />
        <EditableSectionBg field="bgCatalogo" label="Fondo catálogo" />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: 11, color: accent,
                textTransform: "uppercase", letterSpacing: 3, fontWeight: 700 }}>
                <EditableZone field="featuredLabel" label="Etiqueta catálogo">Nuestro stock</EditableZone>
              </p>
              <h2 style={{ margin: 0, fontSize: "clamp(20px,4vw,30px)", fontWeight: 900, color: catText }}>
                <EditableZone field="categoriesHeading" label="Título catálogo">Catálogo completo</EditableZone>
              </h2>
            </div>
            <span style={{ fontSize: 13, color: catMid, fontWeight: 500 }}>
              {filtered.length} vehículo{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ background: activeCategory === cat ? accent : "transparent",
                  color: activeCategory === cat ? "white" : catMid,
                  border: activeCategory === cat ? "none" : `1px solid ${catMid}44`,
                  padding: "6px 14px", borderRadius: 20, cursor: "pointer",
                  fontSize: 12, fontWeight: 600 }}>
                {cat}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 28 }}>
            {PRICE_RANGES.map((range, i) => (
              <button key={i} onClick={() => setActivePriceRange(i)}
                style={{ background: activePriceRange === i ? `${accent}15` : "transparent",
                  color: activePriceRange === i ? accent : catMid,
                  border: `1px solid ${activePriceRange === i ? accent : `${catMid}44`}`,
                  padding: "5px 12px", borderRadius: 6, cursor: "pointer",
                  fontSize: 11, fontWeight: 600 }}>
                {range.label}
              </button>
            ))}
          </div>

          {loadingProducts ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: catMid }}>
              Cargando vehículos…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: catMid }}>
              No se encontraron vehículos con esos filtros.
            </div>
          ) : (
            <div className="ad-grid" style={{ display: "grid", gap: 16 }}>
              {filtered.map(p => (
                <VehicleCard key={p.id} product={p} accent={accent}
                  currency={currency} theme={catTheme} onClick={() => setSelected(p)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Servicios */}
      <section id="servicios" style={{ padding: "56px 20px", position: "relative",
        ...secBg(serviciosImg, serviciosBg), borderTop: "1px solid #e2e8f0" }}>
        <BgDragHandle imgKey="sectionbg_bgServicios" />
        <SectionOverlay ov={serviciosImg} />
        <EditableSectionBg field="bgServicios" label="Fondo servicios" />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto" }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, color: accent,
            textTransform: "uppercase", letterSpacing: 3, fontWeight: 700, textAlign: "center" }}>
            <EditableZone field="aboutKicker" label="Kicker servicios">Por qué elegirnos</EditableZone>
          </p>
          <h2 style={{ margin: "0 0 40px", fontSize: "clamp(20px,4vw,30px)",
            fontWeight: 900, textAlign: "center", color: svcText }}>
            <EditableZone field="aboutHeading" label="Título servicios">Comprá con confianza</EditableZone>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
            {[
              { icon: "🔎", fv: "garantia1Title", fl: "garantia1Desc", t: "Inspección 150 puntos", d: "Cada vehículo pasa revisión técnica completa antes de publicarse." },
              { icon: "📋", fv: "garantia2Title", fl: "garantia2Desc", t: "Documentación en regla", d: "Transferencia y trámites gestionados por nosotros." },
              { icon: "💳", fv: "garantia3Title", fl: "garantia3Desc", t: "Financiación", d: "Planes de cuotas disponibles según perfil crediticio." },
              { icon: "💬", fv: "garantia4Title", fl: "garantia4Desc", t: "Asesor exclusivo", d: "Un asesor te acompaña en todo el proceso sin costo." },
            ].map((s, i) => (
              <div key={i}
                style={{ padding: "22px 20px", borderRadius: 14,
                  border: `1px solid ${svcCardBorder}`,
                  background: svcCardBg,
                  borderTop: `3px solid ${accent}` }}>
                <div style={{ fontSize: 26, marginBottom: 12 }}>{s.icon}</div>
                <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: svcText }}>
                  <EditableZone field={s.fv} label={`Servicio ${i+1} — Título`}>{s.t}</EditableZone>
                </p>
                <p style={{ margin: 0, fontSize: 13, color: svcMid, lineHeight: 1.6 }}>
                  <EditableZone field={s.fl} label={`Servicio ${i+1} — Desc`}>{s.d}</EditableZone>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nosotros */}
      <section id="nosotros" style={{ padding: "56px 20px", position: "relative", ...secBg(nosotrosImg2, nosotrosBg) }}>
        <BgDragHandle imgKey="sectionbg_bgNosotros" />
        <SectionOverlay ov={nosotrosImg2} />
        <EditableSectionBg field="bgNosotros" label="Fondo nosotros" />
        <div className="ad-about" style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto",
          display: "grid", gridTemplateColumns: "1fr", gap: 40, alignItems: "center" }}>
          <div style={{ borderRadius: 20, overflow: "hidden", aspectRatio: "4/3", position: "relative" }}>
            <img src={nosotrosUrl} alt="Nosotros"
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <EditableImageButton field="nosotrosImage" label="Imagen sección Nosotros" />
          </div>
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 11, color: accent,
              textTransform: "uppercase", letterSpacing: 3, fontWeight: 700 }}>
              <EditableZone field="contactKicker" label="Etiqueta nosotros">Nuestra empresa</EditableZone>
            </p>
            <h2 style={{ margin: "0 0 16px", fontSize: "clamp(20px,4vw,30px)", fontWeight: 900, color: nosText }}>
              <EditableZone field="aboutHeading2" label="Título nosotros">Pasión por los vehículos desde 2010</EditableZone>
            </h2>
            <p style={{ margin: "0 0 12px", fontSize: 15, color: nosMid, lineHeight: 1.8 }}>
              <EditableZone field="aboutParagraph1" label="Párrafo 1">Somos una empresa familiar con más de 15 años en el mercado automotor, especializados en brindar la mejor experiencia de compra con total transparencia.</EditableZone>
            </p>
            <p style={{ margin: "0 0 24px", fontSize: 15, color: nosMid, lineHeight: 1.8 }}>
              <EditableZone field="aboutParagraph2" label="Párrafo 2">Nuestro equipo de asesores y taller propio garantizan la calidad de cada vehículo antes de llegar a tus manos.</EditableZone>
            </p>
            {whatsapp.enabled && whatsapp.number && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8,
                  background: "#25d366", color: "white", textDecoration: "none",
                  padding: "12px 22px", borderRadius: 10, fontWeight: 800, fontSize: 14 }}>
                <WaIcon /> Contactanos
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" style={{ padding: "56px 20px", position: "relative",
        ...secBg(contactoImg, contactoBg), borderTop: "1px solid #e2e8f0" }}>
        <BgDragHandle imgKey="sectionbg_bgContacto" />
        <SectionOverlay ov={contactoImg} />
        <EditableSectionBg field="bgContacto" label="Fondo contacto" />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 580, margin: "0 auto", textAlign: "center" }}>
          <div style={{ width: 40, height: 4, background: accent,
            borderRadius: 2, margin: "0 auto 20px" }} />
          <h2 style={{ margin: "0 0 12px", fontSize: "clamp(22px,4vw,32px)", fontWeight: 900, color: conText }}>
            <EditableZone field="contactHeading" label="Título contacto">¿Te interesa algún vehículo?</EditableZone>
          </h2>
          <p style={{ margin: "0 0 28px", fontSize: 15, color: conMid, lineHeight: 1.6 }}>
            <EditableZone field="contactSubtext" label="Subtítulo">Escribinos y coordinamos una visita sin costo. Respondemos en minutos.</EditableZone>
          </p>
          {whatsapp.enabled && whatsapp.number && (
            <a href={`https://wa.me/${whatsapp.number.replace(/\D/g, "")}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 10,
                background: "#25d366", color: "white", textDecoration: "none",
                padding: "15px 28px", borderRadius: 12, fontWeight: 800, fontSize: 15 }}>
              <WaIcon size={20} />
              <EditableZone field="contactWhatsApp" label="WhatsApp de contacto">Escribinos por WhatsApp</EditableZone>
            </a>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ position: "relative", padding: "24px 20px",
        ...secBg(footerImg, footerBg), textAlign: "center" }}>
        <BgDragHandle imgKey="sectionbg_bgFooter" />
        <SectionOverlay ov={footerImg} />
        <EditableSectionBg field="bgFooter" label="Fondo footer" />
        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ margin: "0 0 4px", fontWeight: 900, fontSize: 15, color: accent }}>
            {storeName}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: ftMid }}>
            <EditableZone field="footerCopyright" label="Copyright">
              {`© ${new Date().getFullYear()} ${storeName}. Todos los derechos reservados.`}
            </EditableZone>
          </p>
        </div>
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
          <WaIcon size={22} />
        </a>
      )}
    </div>
  );
}
