"use client";
import { useState, useEffect, useMemo } from "react";
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
function smoothScrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

/* ── Section bg helpers ──────────────────────────────────── */
function secBg(ov: ImageOverride | undefined, fallback: string): React.CSSProperties {
  if (ov?.url) return { backgroundImage: `url(${ov.url})`, backgroundSize: "cover", backgroundPosition: `${ov.posX ?? 50}% ${ov.posY ?? 50}%` };
  return { background: fallback };
}
function secText(ov: ImageOverride | undefined, bg: string): string {
  if (ov?.url) return ov.overlayType === "light" ? "#111111" : "#ffffff";
  return getContrastColor(bg) === "light" ? "#ffffff" : "#111111";
}
function secMid(ov: ImageOverride | undefined, bg: string): string {
  if (ov?.url) return ov.overlayType === "light" ? "#555555" : "rgba(255,255,255,0.6)";
  return getContrastColor(bg) === "light" ? "rgba(255,255,255,0.55)" : "#888888";
}
function SectionOverlay({ ov }: { ov: ImageOverride | undefined }) {
  if (!ov?.url || ov.overlayType === "none") return null;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
      background: ov.overlayType === "light"
        ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})`
        : `rgba(0,0,0,${ov.overlayOpacity ?? 0.55})` }} />
  );
}

function WaIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
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
    : ["https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80"];
  const condicion = attr(product, "Condición");
  const specs = [
    { label: "Marca",       value: attr(product, "Marca") },
    { label: "Modelo",      value: attr(product, "Modelo") },
    { label: "Versión",     value: attr(product, "Versión") },
    { label: "Año",         value: attr(product, "Año") },
    { label: "Kilómetros",  value: attr(product, "Km") ? `${Number(attr(product, "Km")).toLocaleString("es-AR")} km` : "" },
    { label: "Motor",       value: attr(product, "Motor") },
    { label: "Transmisión", value: attr(product, "Transmisión") },
    { label: "Combustible", value: attr(product, "Combustible") },
    { label: "Tracción",    value: attr(product, "Tracción") },
    { label: "Carrocería",  value: attr(product, "Carrocería") },
    { label: "Color",       value: attr(product, "Color") || (product.colors[0] ?? "") },
    { label: "Puertas",     value: attr(product, "Puertas") ? `${attr(product, "Puertas")} puertas` : "" },
  ].filter(s => s.value);

  const condColor = condicion === "0 km" || condicion === "Nuevo"
    ? { bg: "#f0fdf4", fg: "#16a34a" }
    : condicion === "Casi nuevo" || condicion === "Muy bueno"
    ? { bg: "#eff6ff", fg: "#2563eb" }
    : condicion === "Bueno"
    ? { bg: "#fff7ed", fg: "#ea580c" }
    : { bg: "#f8fafc", fg: "#64748b" };

  const waNumber = whatsapp.number.replace(/\D/g, "");
  const waMsg = encodeURIComponent(`Hola! Me interesa el ${product.name}${attr(product, "Año") ? ` (${attr(product, "Año")})` : ""}. ¿Está disponible?`);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setImgIdx(i => (i - 1 + imgs.length) % imgs.length);
      if (e.key === "ArrowRight") setImgIdx(i => (i + 1) % imgs.length);
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [imgs.length]);

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
        backdropFilter: "blur(12px)" }}>
      <div onClick={e => e.stopPropagation()}
        className="am-modal"
        style={{ background: "#ffffff", borderRadius: 4, width: "100%", maxWidth: 1060,
          maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column",
          boxShadow: "0 40px 100px rgba(0,0,0,0.5)" }}>

        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 20px", borderBottom: "1px solid #f0f0f0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {condicion && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: 2,
                textTransform: "uppercase", letterSpacing: 1,
                background: condColor.bg, color: condColor.fg }}>
                {condicion}
              </span>
            )}
            {product.badge && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: 2,
                textTransform: "uppercase", letterSpacing: 1,
                background: accent, color: getContrastColor(accent) }}>
                {product.badge}
              </span>
            )}
            <span style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: 2, marginLeft: 4 }}>
              {product.category}
            </span>
          </div>
          <button onClick={onClose}
            style={{ background: "none", border: "none", color: "#888",
              cursor: "pointer", width: 36, height: 36, borderRadius: "50%",
              fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.color = "#111"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#888"; }}>
            ×
          </button>
        </div>

        <div className="am-modal-body"
          style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

          {/* image */}
          <div className="am-modal-left"
            style={{ display: "flex", flexDirection: "column", background: "#111", flexShrink: 0 }}>
            <div style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: 0 }}>
              <img src={imgs[imgIdx]} alt={product.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              {imgs.length > 1 && (
                <>
                  <button onClick={() => setImgIdx(i => (i - 1 + imgs.length) % imgs.length)}
                    style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                      background: "rgba(255,255,255,0.9)", border: "none", color: "#111",
                      width: 40, height: 40, borderRadius: "50%", cursor: "pointer",
                      fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
                    ‹
                  </button>
                  <button onClick={() => setImgIdx(i => (i + 1) % imgs.length)}
                    style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                      background: "rgba(255,255,255,0.9)", border: "none", color: "#111",
                      width: 40, height: 40, borderRadius: "50%", cursor: "pointer",
                      fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
                    ›
                  </button>
                  <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
                    display: "flex", gap: 6 }}>
                    {imgs.map((_, i) => (
                      <button key={i} onClick={() => setImgIdx(i)}
                        style={{ width: i === imgIdx ? 22 : 7, height: 7, borderRadius: 4,
                          border: "none", cursor: "pointer", transition: "all 0.2s",
                          background: i === imgIdx ? accent : "rgba(255,255,255,0.5)" }} />
                    ))}
                  </div>
                </>
              )}
            </div>
            {imgs.length > 1 && (
              <div style={{ display: "flex", gap: 2, padding: "6px", background: "#111",
                overflowX: "auto", flexShrink: 0 }}>
                {imgs.map((src, i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    style={{ flexShrink: 0, width: 62, height: 42, padding: 0, border: "none",
                      cursor: "pointer", overflow: "hidden",
                      outline: i === imgIdx ? `2px solid ${accent}` : "2px solid transparent",
                      transition: "outline 0.15s", opacity: i === imgIdx ? 1 : 0.45 }}>
                    <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* info */}
          <div className="am-modal-right"
            style={{ flex: 1, overflowY: "auto", padding: "28px 26px 32px", minWidth: 0 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: "clamp(18px,2.5vw,26px)",
              fontWeight: 800, color: "#111", lineHeight: 1.15, letterSpacing: -0.5 }}>
              {product.name}
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: "clamp(26px,3.5vw,34px)",
              fontWeight: 900, color: accent, letterSpacing: -1, lineHeight: 1 }}>
              {fmtPrice(product.price, currency)}
              {product.comparePrice && (
                <span style={{ marginLeft: 10, fontSize: 16, fontWeight: 400,
                  color: "#bbb", textDecoration: "line-through" }}>
                  {fmtPrice(product.comparePrice, currency)}
                </span>
              )}
            </p>

            {specs.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
                marginBottom: 22, borderRadius: 0, overflow: "hidden",
                border: "1px solid #ebebeb" }}>
                {specs.map((s, i) => (
                  <div key={s.label} style={{ padding: "12px 16px", background: i % 2 === 0 ? "#fafafa" : "#fff",
                    borderBottom: "1px solid #ebebeb", borderRight: i % 2 === 0 ? "1px solid #ebebeb" : "none" }}>
                    <p style={{ margin: 0, fontSize: 9, color: "#aaa", textTransform: "uppercase",
                      letterSpacing: 1.5, fontWeight: 600 }}>{s.label}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 700, color: "#222" }}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {product.description && (
              <p style={{ margin: "0 0 22px", fontSize: 13, color: "#666", lineHeight: 1.85,
                borderLeft: `3px solid ${accent}`, paddingLeft: 14 }}>
                {product.description}
              </p>
            )}

            {whatsapp.enabled && waNumber && (
              <a href={`https://wa.me/${waNumber}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  background: "#25d366", color: "white", textDecoration: "none",
                  padding: "15px 20px", borderRadius: 4, fontWeight: 800, fontSize: 14,
                  letterSpacing: 0.3 }}>
                <WaIcon size={20} /> Consultar por WhatsApp
              </a>
            )}
          </div>
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
    ?? "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=75";
  const año = attr(product, "Año");
  const km = attr(product, "Km");
  const motor = attr(product, "Motor");
  const trans = attr(product, "Transmisión");
  const comb = attr(product, "Combustible");
  const condicion = attr(product, "Condición");
  const marca = attr(product, "Marca");

  const D = theme === "dark";
  const cardBg   = D ? "#1a1a1a" : "#ffffff";
  const titleCol = D ? "#ffffff" : "#111111";
  const midCol   = D ? "#888888" : "#999999";
  const divider  = D ? "#2a2a2a" : "#f0f0f0";
  const chipBg   = D ? "#2a2a2a" : "#f5f5f5";
  const chipCol  = D ? "#aaaaaa" : "#666666";

  const condColor = condicion === "0 km" || condicion === "Nuevo" ? { bg: "#f0fdf4", fg: "#16a34a" }
    : condicion === "Casi nuevo" || condicion === "Muy bueno" ? { bg: "#eff6ff", fg: "#2563eb" }
    : condicion === "Bueno" ? { bg: "#fff7ed", fg: "#ea580c" }
    : null;

  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: cardBg, borderRadius: 2, overflow: "hidden", cursor: "pointer",
        border: `1px solid ${D ? (hov ? accent + "66" : "#2a2a2a") : (hov ? accent + "44" : "#ebebeb")}`,
        boxShadow: hov ? `0 16px 48px rgba(0,0,0,${D ? 0.5 : 0.12})` : `0 2px 8px rgba(0,0,0,${D ? 0.3 : 0.05})`,
        transition: "all 0.25s", display: "flex", flexDirection: "column",
        transform: hov ? "translateY(-4px)" : "none" }}>

      <div style={{ position: "relative", aspectRatio: "16/10", overflow: "hidden",
        background: D ? "#111" : "#f8f8f8" }}>
        <img src={img} alt={product.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block",
            transform: hov ? "scale(1.07)" : "none", transition: "transform 0.6s ease" }} />
        {/* accent bar on hover */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
          background: hov ? accent : "transparent", transition: "background 0.2s" }} />
        {product.badge && (
          <div style={{ position: "absolute", top: 0, left: 0,
            background: accent, color: getContrastColor(accent),
            fontSize: 9, fontWeight: 800, padding: "5px 12px",
            textTransform: "uppercase", letterSpacing: 1.5 }}>
            {product.badge}
          </div>
        )}
        {condColor && condicion && (
          <div style={{ position: "absolute", top: 10, right: 10,
            background: D ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)",
            color: condColor.fg,
            fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 2,
            textTransform: "uppercase", letterSpacing: 0.5 }}>
            {condicion}
          </div>
        )}
      </div>

      <div style={{ padding: "18px 20px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        {marca && (
          <p style={{ margin: 0, fontSize: 10, color: accent, textTransform: "uppercase",
            letterSpacing: 2.5, fontWeight: 700 }}>{marca}</p>
        )}
        <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: titleCol, letterSpacing: -0.3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {año && <span style={{ background: chipBg, color: chipCol, fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 2 }}>{año}</span>}
          {km && <span style={{ background: chipBg, color: chipCol, fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 2 }}>{Number(km).toLocaleString("es-AR")} km</span>}
          {motor && <span style={{ background: chipBg, color: chipCol, fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 2 }}>{motor}</span>}
          {trans && <span style={{ background: `${accent}14`, color: accent, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 2 }}>{trans}</span>}
          {comb && <span style={{ background: chipBg, color: chipCol, fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 2 }}>{comb}</span>}
        </div>

        <div style={{ marginTop: "auto", paddingTop: 14, borderTop: `1px solid ${divider}`,
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ margin: 0, fontSize: "clamp(18px,2.5vw,22px)", fontWeight: 900, color: accent, letterSpacing: -0.5 }}>
            {fmtPrice(product.price, currency)}
          </p>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase",
            color: hov ? accent : midCol, transition: "color 0.2s" }}>Ver →</span>
        </div>
      </div>
    </div>
  );
}

/* ── Category Tile ─────────────────────────────────────────── */
function CategoryTile({ cat, count, accent, active, onClick, dark }: {
  cat: string; count: number; accent: string; active: boolean; dark: boolean; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  const on = active || hov;
  const bg = dark
    ? (on ? accent : "#1a1a1a")
    : (on ? accent : "#f5f5f5");
  const col = on ? getContrastColor(accent) : (dark ? "#aaa" : "#555");
  const sub = on ? getContrastColor(accent) + "bb" : (dark ? "#555" : "#aaa");
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: bg, border: `1px solid ${on ? accent : (dark ? "#2a2a2a" : "#e8e8e8")}`,
        borderRadius: 2, padding: "18px 16px", cursor: "pointer", textAlign: "left",
        transition: "all 0.2s", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: col,
        textTransform: "uppercase", letterSpacing: 1.5, lineHeight: 1.2 }}>
        {cat}
      </span>
      <span style={{ fontSize: 10, fontWeight: 500, color: sub }}>
        {count} unidad{count !== 1 ? "es" : ""}
      </span>
    </button>
  );
}

/* ── Main ─────────────────────────────────────────────────── */
export default function AutoMotor() {
  const config = useStoreConfig();
  const { products, loadingProducts } = useStorefront();
  const { editMode } = useEditContext();
  const accent = config?.colors.accent ?? "#c9a227";
  const currency = config?.currency ?? "ARS";
  const storeName = config?.storeName ?? "AUTO MOTOR";
  const whatsapp = config?.whatsapp ?? { enabled: false, number: "" };

  const heroBgUrl = config?.imageOverrides?.["heroBackground"]?.url
    ?? "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1920&q=80";
  const nosotrosUrl = config?.imageOverrides?.["nosotrosImage"]?.url
    ?? "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=900&q=80";

  const sc   = config?.sectionColors ?? {};
  const iovr = config?.imageOverrides ?? {};

  const statsBg    = sc["bgStats"]     ?? "#111111";
  const statsImg   = iovr["sectionbg_bgStats"];
  const statsText  = secText(statsImg, statsBg);

  const catsSectionBg  = sc["bgCategorias"] ?? "#f8f8f8";
  const catsSectionImg = iovr["sectionbg_bgCategorias"];
  const catsText       = secText(catsSectionImg, catsSectionBg);
  const catsMid        = secMid(catsSectionImg, catsSectionBg);
  const catsDark       = catsText === "#ffffff";

  const featuredBg  = sc["bgFeatured"] ?? "#111111";
  const featuredImg = iovr["sectionbg_bgFeatured"];
  const featText    = secText(featuredImg, featuredBg);
  const featMid     = secMid(featuredImg, featuredBg);

  const catalogoBg  = sc["bgCatalogo"]  ?? "#ffffff";
  const catalogoImg = iovr["sectionbg_bgCatalogo"];
  const catText     = secText(catalogoImg, catalogoBg);
  const catMid      = secMid(catalogoImg, catalogoBg);
  const catTheme    = catText === "#ffffff" ? "dark" as const : "light" as const;

  const serviciosBg = sc["bgServicios"] ?? "#0a0a0a";
  const serviciosImg= iovr["sectionbg_bgServicios"];
  const svcText     = secText(serviciosImg, serviciosBg);
  const svcMid      = secMid(serviciosImg, serviciosBg);
  const svcIsLight  = svcText === "#111111";
  const svcCardBg   = svcIsLight ? "#f8f8f8" : "#1a1a1a";
  const svcCardBor  = svcIsLight ? "#e8e8e8" : "#2a2a2a";

  const nosotrosBg  = sc["bgNosotros"]  ?? "#111111";
  const nosotrosImg = iovr["sectionbg_bgNosotros"];
  const nosText     = secText(nosotrosImg, nosotrosBg);
  const nosMid      = secMid(nosotrosImg, nosotrosBg);

  const contactoBg  = sc["bgContacto"]  ?? "#ffffff";
  const contactoImg = iovr["sectionbg_bgContacto"];
  const conText     = secText(contactoImg, contactoBg);
  const conMid      = secMid(contactoImg, contactoBg);

  const footerBg   = sc["bgFooter"]    ?? "#0a0a0a";
  const footerImg  = iovr["sectionbg_bgFooter"];
  const ftText     = secText(footerImg, footerBg);
  const ftMid      = secMid(footerImg, footerBg);

  const [menuOpen, setMenuOpen]       = useState(false);
  const [selected, setSelected]       = useState<StorefrontProduct | null>(null);
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [scrolled, setScrolled]       = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const categoryList = useMemo(() =>
    Array.from(new Set(products.map(p => p.category))).filter(Boolean), [products]);
  const categories = useMemo(() => ["Todos", ...categoryList], [categoryList]);
  const categoryCount = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach(p => { if (p.category) map[p.category] = (map[p.category] ?? 0) + 1; });
    return map;
  }, [products]);

  const featured = products.find(p => p.badge === "DESTACADO") ?? products[0] ?? null;
  const filtered = activeCategory === "Todos" ? products : products.filter(p => p.category === activeCategory);

  return (
    <div style={{ background: "#ffffff", color: "#111111",
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", minHeight: "100vh" }}>
      <style>{`
        .am-grid { grid-template-columns: 1fr !important }
        @media(min-width:560px){ .am-grid { grid-template-columns: repeat(2,1fr) !important } }
        @media(min-width:960px){ .am-grid { grid-template-columns: repeat(3,1fr) !important } }
        .am-cats { grid-template-columns: repeat(2,1fr) !important }
        @media(min-width:480px){ .am-cats { grid-template-columns: repeat(3,1fr) !important } }
        @media(min-width:768px){ .am-cats { grid-template-columns: repeat(4,1fr) !important } }
        @media(min-width:1024px){ .am-cats { grid-template-columns: repeat(6,1fr) !important } }
        .am-nav-links { display: none !important }
        @media(min-width:768px){ .am-nav-links { display: flex !important } .am-burger { display: none !important } }
        .am-stats { grid-template-columns: repeat(2,1fr) }
        @media(min-width:640px){ .am-stats { grid-template-columns: repeat(4,1fr) !important } }
        .am-about { grid-template-columns: 1fr !important }
        @media(min-width:768px){ .am-about { grid-template-columns: 1fr 1fr !important } }
        .am-modal { flex-direction: column !important }
        .am-modal-body { flex-direction: column !important }
        .am-modal-left { width: 100% !important; max-height: 55vw; min-height: 220px }
        .am-modal-right { max-height: 50vh; overflow-y: auto }
        @media(min-width:700px){
          .am-modal-body { flex-direction: row !important }
          .am-modal-left { width: 52% !important; max-height: unset !important }
          .am-modal-right { max-height: unset !important }
        }
        .am-svc { grid-template-columns: 1fr !important }
        @media(min-width:560px){ .am-svc { grid-template-columns: repeat(2,1fr) !important } }
        @media(min-width:900px){ .am-svc { grid-template-columns: repeat(4,1fr) !important } }
      `}</style>

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? "rgba(255,255,255,0.97)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid #ebebeb" : "none",
        transition: "all 0.35s", padding: "0 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", height: 68,
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: 4,
            color: scrolled ? "#111" : "white", textTransform: "uppercase",
            transition: "color 0.35s" }}>
            <EditableZone field="storeName" label="Nombre de la tienda">{storeName}</EditableZone>
          </div>
          <div className="am-nav-links" style={{ display: "flex", gap: 36, alignItems: "center" }}>
            {[["Catálogo", "catálogo"], ["Servicios", "servicios"], ["Nosotros", "nosotros"], ["Contacto", "contacto"]].map(([label, id]) => (
              <button key={id} onClick={() => smoothScrollTo(id)}
                style={{ background: "none", border: "none",
                  color: scrolled ? "#888" : "rgba(255,255,255,0.65)",
                  cursor: "pointer", fontSize: 11, fontWeight: 600,
                  letterSpacing: 2, textTransform: "uppercase", transition: "color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = accent)}
                onMouseLeave={e => (e.currentTarget.style.color = scrolled ? "#888" : "rgba(255,255,255,0.65)")}>
                {label}
              </button>
            ))}
            {whatsapp.enabled && whatsapp.number && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ background: accent, color: getContrastColor(accent),
                  textDecoration: "none", padding: "9px 22px",
                  fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>
                Consultar
              </a>
            )}
          </div>
          <button className="am-burger" onClick={() => setMenuOpen(m => !m)}
            style={{ background: "none", border: `1px solid ${scrolled ? "#e0e0e0" : "rgba(255,255,255,0.3)"}`,
              color: scrolled ? "#555" : "white", padding: "7px 11px", cursor: "pointer", fontSize: 18 }}>
            {menuOpen ? "×" : "☰"}
          </button>
        </div>
        {menuOpen && (
          <div style={{ background: "#fff", borderTop: "1px solid #ebebeb",
            padding: "8px 32px 20px" }}>
            {[["Catálogo", "catálogo"], ["Servicios", "servicios"], ["Nosotros", "nosotros"], ["Contacto", "contacto"]].map(([label, id]) => (
              <button key={id} onClick={() => { smoothScrollTo(id); setMenuOpen(false); }}
                style={{ display: "block", width: "100%", background: "none", border: "none",
                  color: "#555", cursor: "pointer", textAlign: "left",
                  padding: "12px 0", fontSize: 12, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: 2, borderBottom: "1px solid #f5f5f5" }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section style={{ position: "relative", height: "100svh", minHeight: 600,
        display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0,
          backgroundImage: `url(${heroBgUrl})`,
          backgroundSize: "cover", backgroundPosition: "center 40%" }}>
          <div style={{ position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.1) 100%)" }} />
        </div>
        <EditableImageButton field="heroBackground" label="Imagen de fondo del hero" />
        <div style={{ position: "relative", zIndex: 1, width: "100%",
          maxWidth: 1200, margin: "0 auto", padding: "0 32px 80px" }}>
          <p style={{ margin: "0 0 16px", fontSize: 10, color: accent,
            textTransform: "uppercase", letterSpacing: 5, fontWeight: 700 }}>
            <EditableZone field="heroBadge" label="Badge hero">Concesionaria Oficial</EditableZone>
          </p>
          <h1 style={{ margin: "0 0 18px", fontSize: "clamp(40px,7vw,80px)",
            fontWeight: 900, lineHeight: 0.92, color: "white", letterSpacing: -2,
            maxWidth: 720, textTransform: "uppercase" }}>
            <EditableZone field="heroHeading" label="Título principal">{"Tu próximo\nvehículo\nte espera."}</EditableZone>
          </h1>
          <p style={{ margin: "0 0 36px", fontSize: "clamp(14px,1.8vw,16px)",
            color: "rgba(255,255,255,0.55)", maxWidth: 400, lineHeight: 1.85,
            fontWeight: 300, letterSpacing: 0.3 }}>
            <EditableZone field="heroSubtext" label="Subtítulo">Stock premium · Financiación disponible · Transferencia en regla.</EditableZone>
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => smoothScrollTo("catálogo")}
              style={{ background: accent, color: getContrastColor(accent), border: "none",
                padding: "15px 36px", fontWeight: 800, fontSize: 12,
                cursor: "pointer", letterSpacing: 2, textTransform: "uppercase" }}>
              <EditableZone field="heroCta" label="Botón principal">Ver catálogo</EditableZone>
            </button>
            {whatsapp.enabled && whatsapp.number && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8,
                  background: "transparent", color: "rgba(255,255,255,0.8)",
                  textDecoration: "none", border: "1px solid rgba(255,255,255,0.25)",
                  padding: "15px 28px", fontWeight: 600, fontSize: 12,
                  letterSpacing: 1, textTransform: "uppercase" }}>
                <WaIcon />
                <EditableZone field="heroCtaSecondary" label="Botón secundario">Hablar con asesor</EditableZone>
              </a>
            )}
          </div>
        </div>
        {!loadingProducts && (
          <div style={{ position: "absolute", bottom: 28, right: 32,
            fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 2, textTransform: "uppercase" }}>
            {products.length} vehículos en stock
          </div>
        )}
      </section>

      {/* ── Stats ──────────────────────────────────────────── */}
      <section style={{ position: "relative", ...secBg(statsImg, statsBg) }}>
        <BgDragHandle imgKey="sectionbg_bgStats" />
        <SectionOverlay ov={statsImg} />
        <EditableSectionBg field="bgStats" label="Fondo estadísticas" />
        <div className="am-stats" style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", display: "grid" }}>
          {[
            { fv: "stat1", fl: "statLabel1", n: "500+", l: "Vehículos vendidos" },
            { fv: "stat2", fl: "statLabel2", n: "15",   l: "Años de experiencia" },
            { fv: "stat3", fl: "statLabel3", n: "98%",  l: "Clientes satisfechos" },
            { fv: "stat4", fl: "statLabel4", n: "12",   l: "Marcas disponibles" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center", padding: "30px 10px",
              borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
              borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <p style={{ margin: 0, fontSize: "clamp(28px,5vw,40px)", fontWeight: 900, color: statsText, letterSpacing: -1 }}>
                <EditableZone field={s.fv} label={`Stat ${i+1}`}>{s.n}</EditableZone>
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 10, color: statsText,
                opacity: 0.45, textTransform: "uppercase", letterSpacing: 2, fontWeight: 500 }}>
                <EditableZone field={s.fl} label={`Etiqueta stat ${i+1}`}>{s.l}</EditableZone>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categorías ─────────────────────────────────────── */}
      {categoryList.length > 0 && (
        <section style={{ padding: "64px 32px", position: "relative", ...secBg(catsSectionImg, catsSectionBg) }}>
          <BgDragHandle imgKey="sectionbg_bgCategorias" />
          <SectionOverlay ov={catsSectionImg} />
          <EditableSectionBg field="bgCategorias" label="Fondo categorías" />
          <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between",
              flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
              <div>
                <p style={{ margin: "0 0 6px", fontSize: 10, color: accent,
                  textTransform: "uppercase", letterSpacing: 4, fontWeight: 700 }}>
                  <EditableZone field="catsKicker" label="Kicker categorías">Explorá por tipo</EditableZone>
                </p>
                <h2 style={{ margin: 0, fontSize: "clamp(22px,4vw,32px)",
                  fontWeight: 900, color: catsText, letterSpacing: -0.5 }}>
                  <EditableZone field="catsHeading" label="Título categorías">Categorías disponibles</EditableZone>
                </h2>
              </div>
              {activeCategory !== "Todos" && (
                <button onClick={() => { setActiveCategory("Todos"); smoothScrollTo("catálogo"); }}
                  style={{ background: "none", border: `1px solid ${catsMid}55`, color: catsMid,
                    padding: "8px 18px", cursor: "pointer", fontSize: 10,
                    fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
                  Ver todos →
                </button>
              )}
            </div>
            <div className="am-cats" style={{ display: "grid", gap: 8 }}>
              {categoryList.map(cat => (
                <CategoryTile key={cat} cat={cat} count={categoryCount[cat] ?? 0}
                  accent={accent} active={activeCategory === cat} dark={catsDark}
                  onClick={() => { setActiveCategory(cat); smoothScrollTo("catálogo"); }} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured ───────────────────────────────────────── */}
      {!loadingProducts && featured && (
        <section style={{ padding: "72px 32px 0", position: "relative", ...secBg(featuredImg, featuredBg) }}>
          <BgDragHandle imgKey="sectionbg_bgFeatured" />
          <SectionOverlay ov={featuredImg} />
          <EditableSectionBg field="bgFeatured" label="Fondo vehículo destacado" />
          <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto" }}>
            <p style={{ margin: "0 0 20px", fontSize: 10, color: accent,
              textTransform: "uppercase", letterSpacing: 5, fontWeight: 700 }}>
              <EditableZone field="featuredLabel" label="Etiqueta destacado">Vehículo destacado</EditableZone>
            </p>
            {/* Featured banner */}
            <div onClick={() => setSelected(featured)}
              style={{ position: "relative", borderRadius: 2, overflow: "hidden",
                aspectRatio: "21/9", cursor: "pointer", border: `1px solid ${accent}22` }}>
              <img src={featured.images[0] ?? heroBgUrl} alt={featured.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0,
                background: "linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)" }} />
              <div style={{ position: "absolute", inset: 0, padding: "clamp(20px,5vw,48px)",
                display: "flex", flexDirection: "column", justifyContent: "flex-end", maxWidth: "50%" }}>
                {featured.badge && (
                  <span style={{ alignSelf: "flex-start", marginBottom: 12,
                    background: accent, color: getContrastColor(accent),
                    fontSize: 9, fontWeight: 800, padding: "4px 14px",
                    textTransform: "uppercase", letterSpacing: 2 }}>
                    {featured.badge}
                  </span>
                )}
                <p style={{ margin: "0 0 4px", fontSize: 10, color: accent,
                  textTransform: "uppercase", letterSpacing: 4, fontWeight: 700 }}>
                  {featured.category}
                </p>
                <h3 style={{ margin: "0 0 8px", fontSize: "clamp(18px,3vw,34px)",
                  fontWeight: 900, color: "white", lineHeight: 1.05, letterSpacing: -0.5 }}>
                  {featured.name}
                </h3>
                <p style={{ margin: "0 0 20px", fontSize: "clamp(20px,3.5vw,36px)",
                  fontWeight: 900, color: accent, lineHeight: 1, letterSpacing: -1 }}>
                  {fmtPrice(featured.price, currency)}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                  {[attr(featured,"Condición"), attr(featured,"Año"),
                    attr(featured,"Km") ? `${Number(attr(featured,"Km")).toLocaleString("es-AR")} km` : "",
                    attr(featured,"Motor")].filter(Boolean).map((v, i) => (
                    <span key={i} style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)",
                      fontSize: 10, fontWeight: 600, padding: "4px 12px" }}>{v}</span>
                  ))}
                </div>
                <button style={{ alignSelf: "flex-start",
                  background: "transparent", color: "white", border: "1px solid rgba(255,255,255,0.4)",
                  padding: "10px 24px", fontWeight: 700, fontSize: 11,
                  cursor: "pointer", letterSpacing: 2, textTransform: "uppercase" }}>
                  Ver detalle →
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Catálogo ───────────────────────────────────────── */}
      <section id="catálogo" style={{ padding: "72px 32px", position: "relative", ...secBg(catalogoImg, catalogoBg) }}>
        <BgDragHandle imgKey="sectionbg_bgCatalogo" />
        <SectionOverlay ov={catalogoImg} />
        <EditableSectionBg field="bgCatalogo" label="Fondo catálogo" />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end",
            flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 10, color: accent,
                textTransform: "uppercase", letterSpacing: 4, fontWeight: 700 }}>
                <EditableZone field="catalogKicker" label="Etiqueta catálogo">Nuestro stock</EditableZone>
              </p>
              <h2 style={{ margin: 0, fontSize: "clamp(24px,4vw,38px)",
                fontWeight: 900, color: catText, letterSpacing: -0.5 }}>
                <EditableZone field="categoriesHeading" label="Título catálogo">Catálogo de vehículos</EditableZone>
              </h2>
            </div>
            <span style={{ fontSize: 12, color: catMid }}>
              {filtered.length} vehículo{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 36 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ background: activeCategory === cat ? accent : "transparent",
                  color: activeCategory === cat ? getContrastColor(accent) : catMid,
                  border: `1px solid ${activeCategory === cat ? accent : catMid + "44"}`,
                  padding: "7px 18px", cursor: "pointer",
                  fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
                  transition: "all 0.15s" }}>
                {cat}
              </button>
            ))}
          </div>

          {loadingProducts ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: catMid }}>Cargando vehículos…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: catMid }}>
              No hay vehículos en esta categoría.
            </div>
          ) : (
            <div className="am-grid" style={{ display: "grid", gap: 20 }}>
              {filtered.map(p => (
                <VehicleCard key={p.id} product={p} accent={accent}
                  currency={currency} theme={catTheme} onClick={() => setSelected(p)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Servicios ──────────────────────────────────────── */}
      <section id="servicios" style={{ padding: "80px 32px", position: "relative",
        ...secBg(serviciosImg, serviciosBg) }}>
        <BgDragHandle imgKey="sectionbg_bgServicios" />
        <SectionOverlay ov={serviciosImg} />
        <EditableSectionBg field="bgServicios" label="Fondo servicios" />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ margin: "0 0 8px", fontSize: 10, color: accent,
              textTransform: "uppercase", letterSpacing: 4, fontWeight: 700 }}>
              <EditableZone field="aboutKicker" label="Kicker servicios">Por qué elegirnos</EditableZone>
            </p>
            <h2 style={{ margin: 0, fontSize: "clamp(24px,4vw,38px)",
              fontWeight: 900, color: svcText, letterSpacing: -0.5 }}>
              <EditableZone field="aboutHeading" label="Título servicios">Servicios y garantías</EditableZone>
            </h2>
          </div>
          <div className="am-svc" style={{ display: "grid", gap: 16 }}>
            {[
              { fv: "garantia1Title", fl: "garantia1Desc", t: "Inspección técnica", d: "Revisión de 150 puntos antes de la venta." },
              { fv: "garantia2Title", fl: "garantia2Desc", t: "Documentación legal", d: "Transferencia y trámites 100% en regla." },
              { fv: "garantia3Title", fl: "garantia3Desc", t: "Financiación", d: "Planes de cuotas adaptados a tu presupuesto." },
              { fv: "garantia4Title", fl: "garantia4Desc", t: "Asesoría personal", d: "Te acompañamos en cada paso del proceso." },
            ].map((s, i) => (
              <div key={i} style={{ background: svcCardBg, padding: "32px 28px",
                border: `1px solid ${svcCardBor}`, borderTop: `3px solid ${accent}` }}>
                <p style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 800, color: svcText, letterSpacing: -0.3 }}>
                  <EditableZone field={s.fv} label={`Servicio ${i+1} — Título`}>{s.t}</EditableZone>
                </p>
                <p style={{ margin: 0, fontSize: 13, color: svcMid, lineHeight: 1.8, fontWeight: 400 }}>
                  <EditableZone field={s.fl} label={`Servicio ${i+1} — Desc`}>{s.d}</EditableZone>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Nosotros ───────────────────────────────────────── */}
      <section id="nosotros" style={{ padding: "80px 32px", position: "relative", ...secBg(nosotrosImg, nosotrosBg) }}>
        <BgDragHandle imgKey="sectionbg_bgNosotros" />
        <SectionOverlay ov={nosotrosImg} />
        <EditableSectionBg field="bgNosotros" label="Fondo nosotros" />
        <div className="am-about" style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto",
          display: "grid", gap: 64, alignItems: "center" }}>
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 10, color: accent,
              textTransform: "uppercase", letterSpacing: 4, fontWeight: 700 }}>
              <EditableZone field="contactKicker" label="Etiqueta nosotros">Nuestra historia</EditableZone>
            </p>
            <h2 style={{ margin: "0 0 24px", fontSize: "clamp(24px,4vw,38px)",
              fontWeight: 900, color: nosText, letterSpacing: -0.5 }}>
              <EditableZone field="aboutHeading2" label="Título nosotros">Años de pasión por los vehículos</EditableZone>
            </h2>
            <p style={{ margin: "0 0 16px", fontSize: 15, color: nosMid, lineHeight: 2, fontWeight: 300 }}>
              <EditableZone field="aboutParagraph1" label="Párrafo 1">Somos una empresa familiar con más de una década en el mercado automotor. Nuestro compromiso es la transparencia total en cada operación.</EditableZone>
            </p>
            <p style={{ margin: "0 0 36px", fontSize: 15, color: nosMid, lineHeight: 2, fontWeight: 300 }}>
              <EditableZone field="aboutParagraph2" label="Párrafo 2">Contamos con asesores especializados y taller propio para garantizar la calidad de cada vehículo en nuestro stock.</EditableZone>
            </p>
            {whatsapp.enabled && whatsapp.number && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8,
                  background: accent, color: getContrastColor(accent), textDecoration: "none",
                  padding: "13px 28px", fontWeight: 800, fontSize: 12,
                  letterSpacing: 1.5, textTransform: "uppercase" }}>
                <WaIcon /> Consultar ahora
              </a>
            )}
          </div>
          <div style={{ position: "relative", overflow: "hidden", aspectRatio: "4/3" }}>
            <img src={nosotrosUrl} alt="Nosotros"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <EditableImageButton field="nosotrosImage" label="Imagen sección Nosotros" />
          </div>
        </div>
      </section>

      {/* ── Contacto ───────────────────────────────────────── */}
      <section id="contacto" style={{ padding: "100px 32px", position: "relative",
        ...secBg(contactoImg, contactoBg), borderTop: "1px solid #ebebeb" }}>
        <BgDragHandle imgKey="sectionbg_bgContacto" />
        <SectionOverlay ov={contactoImg} />
        <EditableSectionBg field="bgContacto" label="Fondo contacto" />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <p style={{ margin: "0 0 8px", fontSize: 10, color: accent,
            textTransform: "uppercase", letterSpacing: 4, fontWeight: 700 }}>Contacto</p>
          <h2 style={{ margin: "0 0 16px", fontSize: "clamp(28px,5vw,52px)",
            fontWeight: 900, color: conText, letterSpacing: -1, lineHeight: 1.0 }}>
            <EditableZone field="contactHeading" label="Título contacto">¿Encontraste tu vehículo?</EditableZone>
          </h2>
          <p style={{ margin: "0 0 40px", fontSize: 15, color: conMid,
            lineHeight: 1.9, fontWeight: 300, maxWidth: 460, marginInline: "auto" }}>
            <EditableZone field="contactSubtext" label="Subtítulo">Contactanos y un asesor te responde en minutos para coordinar una visita sin compromiso.</EditableZone>
          </p>
          {whatsapp.enabled && whatsapp.number && (
            <a href={`https://wa.me/${whatsapp.number.replace(/\D/g, "")}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 12,
                background: "#25d366", color: "white", textDecoration: "none",
                padding: "18px 44px", fontWeight: 900, fontSize: 15,
                boxShadow: "0 12px 40px rgba(37,211,102,0.3)", letterSpacing: 0.3 }}>
              <WaIcon size={22} />
              <EditableZone field="contactWhatsApp" label="WhatsApp de contacto">Escribinos por WhatsApp</EditableZone>
            </a>
          )}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer style={{ position: "relative", padding: "32px",
        ...secBg(footerImg, footerBg), borderTop: `1px solid rgba(255,255,255,0.06)`,
        textAlign: "center" }}>
        <BgDragHandle imgKey="sectionbg_bgFooter" />
        <SectionOverlay ov={footerImg} />
        <EditableSectionBg field="bgFooter" label="Fondo footer" />
        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ margin: "0 0 6px", fontWeight: 900, fontSize: 12,
            color: accent, letterSpacing: 5, textTransform: "uppercase" }}>
            {storeName}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: ftMid, letterSpacing: 0.5 }}>
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
          style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200,
            background: "#25d366", color: "white", width: 56, height: 56,
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 24px rgba(37,211,102,0.45)", textDecoration: "none" }}>
          <WaIcon size={24} />
        </a>
      )}
    </div>
  );
}
