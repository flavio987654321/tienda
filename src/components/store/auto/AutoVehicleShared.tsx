"use client";
import { useState, useEffect, useSyncExternalStore } from "react";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { esOpcionDeColor } from "@/lib/opciones";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import StoreProductReels from "@/components/store/ProductReels";
import { getContrastColor } from "@/contexts/EditContext";

export function fmtPrice(n: number, currency: string) {
  return (currency === "USD" ? "USD " : "$") + n.toLocaleString("es-AR");
}

// Tipo de puntero (touch vs mouse) leído sin efecto vía useSyncExternalStore.
// No cambia durante la sesión, por eso el subscribe es un no-op; el snapshot de
// servidor es "no touch" para que la hidratación coincida.
const noopSubscribe = () => () => {};
const getIsTouch = () => window.matchMedia("(pointer: coarse)").matches;

export function attr(p: StorefrontProduct, key: string): string {
  return p.attributes.find(a => a.key.toLowerCase() === key.toLowerCase())?.value ?? "";
}

// "Localidad, Provincia" (campos nuevos) con fallback a los campos viejos
// (Ubicación/Ciudad/"Ciudad / Zona") para vehículos publicados antes de que
// existieran los selectores de Provincia/Localidad/Código Postal.
export function vehicleLocation(p: StorefrontProduct): string {
  const combined = [attr(p, "Localidad"), attr(p, "Provincia")].filter(Boolean).join(", ");
  return combined || attr(p, "Ubicación") || attr(p, "Ciudad") || attr(p, "Ciudad / Zona") || "";
}

export function WaIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export const AUTO_SERVICES = [
  { key: "aceite",       label: "Aceite y filtros" },
  { key: "frenos",       label: "Frenos" },
  { key: "distribucion", label: "Distribución" },
  { key: "cubiertas",    label: "Cubiertas" },
  { key: "suspension",   label: "Suspensión" },
  { key: "electrico",    label: "Sist. eléctrico" },
  { key: "ac",           label: "Aire acond." },
  { key: "caja",         label: "Caja de cambios" },
];

function SpecIcon({ label, accent }: { label: string; accent: string }) {
  const p = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none",
    stroke: accent, strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const k = label.toLowerCase();
  if (k === "año")         return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
  if (k === "kilómetros")  return <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
  if (k === "motor")       return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>;
  if (k === "transmisión") return <svg {...p}><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>;
  if (k === "combustible") return <svg {...p}><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="22" x2="6" y2="2"/><path d="M10 22V8h4v14"/><path d="M10 12h4"/><path d="M20 11V8l-2-2"/><path d="M18 8h2v3"/></svg>;
  if (k === "tracción")    return <svg {...p}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>;
  if (k === "carrocería")  return <svg {...p}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
  if (k === "color")       return <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>;
  if (k === "puertas")     return <svg {...p}><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"/></svg>;
  if (k === "marca")       return <svg {...p}><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
  if (k === "modelo")      return <svg {...p}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
  if (k === "versión")     return <svg {...p}><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>;
  return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
}

export const AM_MODAL_CSS = `
  .am-modal-body { grid-template-columns: 1fr !important }
  @media(min-width:700px){ .am-modal-body { grid-template-columns: 3fr 2fr !important } }
  .am-specs-grid { grid-template-columns: 1fr !important }
  @media(min-width:560px){ .am-specs-grid { grid-template-columns: 1fr 1fr !important } }
  .am-similar-grid { grid-template-columns: repeat(2,1fr) !important }
  @media(min-width:560px){ .am-similar-grid { grid-template-columns: repeat(4,1fr) !important } }
  .am-img-wrap { flex-direction: column !important }
  .am-img-thumbs { flex-direction: row !important; overflow-x: auto !important; overflow-y: hidden !important; width: 100% !important; max-height: 64px !important; padding: 6px 8px !important }
  @media(min-width:700px){
    .am-img-wrap { flex-direction: row !important }
    .am-img-thumbs { flex-direction: column !important; overflow-x: hidden !important; overflow-y: auto !important; width: 80px !important; max-height: none !important; padding: 8px 6px !important }
  }
`;

export function VehicleModal({ product, accent, currency, whatsapp, products, onClose, onSelect, isFavorite, onToggleFavorite, storeId, isOwner, isPreview }: {
  product: StorefrontProduct; accent: string; currency: string;
  whatsapp: { enabled: boolean; number: string };
  products: StorefrontProduct[];
  onClose: () => void;
  onSelect: (p: StorefrontProduct) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  storeId?: string;
  isOwner?: boolean;
  isPreview?: boolean;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string|null>(null);
  const isTouch = useSyncExternalStore(noopSubscribe, getIsTouch, () => false);
  const imgSwipe = useTouchSwipe(
    () => setImgIdx(i => (i + 1) % imgs.length),
    () => setImgIdx(i => (i - 1 + imgs.length) % imgs.length)
  );
  const imgs = product.images.length > 0
    ? product.images
    : ["https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80"];

  const año = attr(product, "Año");
  const km = attr(product, "Km") || attr(product, "Kilómetros");
  const condicion = attr(product, "Condición");
  const ubicacion = vehicleLocation(product);

  const specs = [
    { label: "Marca",       value: attr(product, "Marca") },
    { label: "Modelo",      value: attr(product, "Modelo") },
    { label: "Versión",     value: attr(product, "Versión") },
    { label: "Año",         value: año },
    { label: "Kilómetros",  value: km ? `${Number(km).toLocaleString("es-AR")} km` : "" },
    { label: "Motor",       value: attr(product, "Motor") },
    { label: "Transmisión", value: attr(product, "Transmisión") },
    { label: "Combustible", value: attr(product, "Combustible") },
    { label: "Tracción",    value: attr(product, "Tracción") },
    { label: "Carrocería",  value: attr(product, "Carrocería") },
    { label: "Color",       value: attr(product, "Color") || (product.opciones.find(o => esOpcionDeColor(o.nombre))?.valores[0] ?? "") },
    { label: "Puertas",     value: attr(product, "Puertas") ? `${attr(product, "Puertas")} puertas` : "" },
  ].filter(s => s.value);

  const marca = attr(product, "Marca").toLowerCase();
  const others = products.filter(p => p.id !== product.id);
  const sameBrand = marca ? others.filter(p => attr(p, "Marca").toLowerCase() === marca) : [];
  const sameCat   = others.filter(p => p.category === product.category && !sameBrand.includes(p));
  const rest      = others.filter(p => !sameBrand.includes(p) && !sameCat.includes(p));
  const similar   = [...sameBrand, ...sameCat, ...rest].slice(0, 4);

  const servicesRaw = attr(product, "Servicios");
  let servicesData: Record<string, boolean> = {};
  if (servicesRaw) { try { servicesData = JSON.parse(servicesRaw); } catch {} }
  const hasServices = Object.keys(servicesData).length > 0;

  const waNumber = whatsapp.number.replace(/\D/g, "");
  const waMsg = encodeURIComponent(`Hola! Me interesa el ${product.name}${año ? ` (${año})` : ""}. ¿Está disponible?`);

  function registerLead() {
    if (!storeId || isOwner || isPreview) return;
    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, productId: product.id, productName: product.name, productPrice: product.price }),
    }).catch(() => {});
  }

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setImgIdx(i => (i - 1 + imgs.length) % imgs.length);
      if (e.key === "ArrowRight") setImgIdx(i => (i + 1) % imgs.length);
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [imgs.length, onClose]);

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 99999,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "20px 16px", backdropFilter: "blur(4px)", overflow: "hidden" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 8, width: "100%", maxWidth: 1100,
          margin: "auto 0", maxHeight: "calc(100vh - 40px)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 20px", borderBottom: "1px solid #ebebeb", flexShrink: 0,
          background: "#fff", borderRadius: "8px 8px 0 0" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {product.badge && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 3,
                background: accent, color: getContrastColor(accent) === "light" ? "#fff" : "#111",
                textTransform: "uppercase", letterSpacing: 0.8 }}>
                {product.badge}
              </span>
            )}
            {condicion && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 3,
                background: "#f0f0f0", color: "#666" }}>
                {condicion}
              </span>
            )}
            {product.category && (
              <span style={{ fontSize: 12, color: "#bbb" }}>{product.category}</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            {onToggleFavorite && (
              <button onClick={onToggleFavorite}
                style={{ background: "#f5f5f5", border: "none", cursor: "pointer",
                  width: 32, height: 32, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill={isFavorite ? accent : "none"} stroke={isFavorite ? accent : "#666"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </button>
            )}
            <button onClick={onClose} aria-label="Cerrar"
              style={{ background: "#f5f5f5", border: "none", cursor: "pointer",
                width: 32, height: 32, borderRadius: "50%", fontSize: 18,
                display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
              ×
            </button>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <div className="am-modal-body" style={{ display: "grid" }}>
            <div style={{ background: "#ffffff" }}>
              <div className="am-img-wrap" style={{ display: "flex" }}>
                {imgs.length > 1 && (
                  <div className="am-img-thumbs" style={{ display: "flex", gap: 4,
                    background: "#ffffff", flexShrink: 0, borderRight: "1px solid #f0f0f0" }}>
                    {imgs.map((src, i) => (
                      <button key={i} onClick={() => { setImgIdx(i); setMousePos(null); }}
                        style={{ flexShrink: 0, width: 68, height: 52, padding: 0, border: "none",
                          cursor: "pointer", borderRadius: 3, overflow: "hidden",
                          outline: i === imgIdx ? `2.5px solid ${accent}` : "2px solid transparent",
                          opacity: i === imgIdx ? 1 : 0.55, transition: "all 0.15s" }}>
                        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ flex: 1, position: "relative", aspectRatio: "4/3",
                  overflow: "hidden", cursor: isTouch ? "default" : "crosshair" }}
                  onMouseMove={e => {
                    if (isTouch) return;
                    const r = e.currentTarget.getBoundingClientRect();
                    setMousePos({
                      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
                      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
                    });
                  }}
                  onMouseLeave={() => setMousePos(null)}
                  {...imgSwipe}>
                  <img src={imgs[imgIdx]} alt={product.name}
                    style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", cursor: isTouch ? "zoom-in" : undefined, background: "#ffffff" }}
                    onClick={() => { if (isTouch) setLightboxSrc(imgs[imgIdx]); }} />
                  {mousePos && (
                    <div style={{
                      position: "absolute",
                      width: 110, height: 110,
                      left: `calc(${mousePos.x * 100}% - 55px)`,
                      top: `calc(${mousePos.y * 100}% - 55px)`,
                      border: "2px solid rgba(255,255,255,0.95)",
                      boxShadow: "0 0 0 1px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(0,0,0,0.08)",
                      background: "rgba(255,255,255,0.12)",
                      pointerEvents: "none", boxSizing: "border-box", zIndex: 2,
                    }} />
                  )}
                  {imgs.length > 1 && (
                    <>
                      <button onClick={() => { setImgIdx(i => (i - 1 + imgs.length) % imgs.length); setMousePos(null); }}
                        aria-label="Imagen anterior"
                        style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                          background: "rgba(0,0,0,0.52)", backdropFilter: "blur(6px)",
                          border: "1px solid rgba(255,255,255,0.18)", color: "#fff",
                          width: 40, height: 40, borderRadius: 10, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          zIndex: 3, transition: "background 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.80)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,0,0,0.52)")}>
                        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                      </button>
                      <button onClick={() => { setImgIdx(i => (i + 1) % imgs.length); setMousePos(null); }}
                        aria-label="Imagen siguiente"
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                          background: "rgba(0,0,0,0.52)", backdropFilter: "blur(6px)",
                          border: "1px solid rgba(255,255,255,0.18)", color: "#fff",
                          width: 40, height: 40, borderRadius: 10, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          zIndex: 3, transition: "background 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.80)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,0,0,0.52)")}>
                        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                    </>
                  )}
                  <div style={{ position: "absolute", bottom: 8, right: 8,
                    background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 11,
                    padding: "2px 8px", borderRadius: 4, pointerEvents: "none" }}>
                    {imgIdx + 1} / {imgs.length}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: "28px 28px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
              {mousePos ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 11, color: "#999", textAlign: "center" }}>Vista ampliada</p>
                  <div style={{
                    flex: 1, minHeight: 260,
                    backgroundImage: `url(${imgs[imgIdx]})`,
                    backgroundSize: "350%", backgroundRepeat: "no-repeat",
                    backgroundPositionX: `${mousePos.x * 100}%`,
                    backgroundPositionY: `${mousePos.y * 100}%`,
                    border: "1px solid #e0e0e0", borderRadius: 4, overflow: "hidden",
                  }} />
                </div>
              ) : (
                <>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                    {año && <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20,
                      background:"#eef2ff", color:"#4466bb", letterSpacing:0.3 }}>{año}</span>}
                    {km && <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20,
                      background:"#eef2ff", color:"#4466bb", letterSpacing:0.3 }}>{Number(km).toLocaleString("es-AR")} km</span>}
                    {condicion && <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20,
                      background:accent, color:"#fff", letterSpacing:0.3 }}>{condicion}</span>}
                  </div>
                  <h2 style={{ margin: 0, fontSize: "clamp(18px,2.5vw,26px)", fontWeight: 800,
                    color: "#1a2744", lineHeight: 1.15 }}>{product.name}</h2>
                  {ubicacion && (
                    <div style={{ display:"flex", alignItems:"center", gap:5, color:"#888", fontSize:12 }}>
                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      {ubicacion}
                    </div>
                  )}
                  <div style={{ borderLeft:`3px solid ${accent}`, paddingLeft:12 }}>
                    <p style={{ margin:"0 0 2px", fontSize:10, color:"#aaa", letterSpacing:1.5,
                      textTransform:"uppercase", fontWeight:600 }}>Precio</p>
                    <p style={{ margin: 0, fontSize: "clamp(26px,3.5vw,36px)", fontWeight: 800,
                      color: "#1a2744", letterSpacing: -1, lineHeight: 1 }}>
                      {fmtPrice(product.price, currency)}
                    </p>
                    {product.comparePrice && (
                      <p style={{ margin: "4px 0 0", fontSize: 14, color: "#bbb", textDecoration: "line-through" }}>
                        {fmtPrice(product.comparePrice, currency)}
                      </p>
                    )}
                  </div>
                  {whatsapp.enabled && waNumber && (
                    <a href={`https://wa.me/${waNumber}?text=${waMsg}`}
                      target="_blank" rel="noopener noreferrer" onClick={registerLead}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                        background: "#25d366", color: "white", textDecoration: "none",
                        padding: "14px 20px", borderRadius: 6, fontWeight: 700, fontSize: 14,
                        boxShadow: "0 4px 16px rgba(37,211,102,0.3)", marginTop: 4 }}>
                      <WaIcon size={18} /> Consultar por WhatsApp
                    </a>
                  )}
                  {hasServices && (
                    <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 14, marginTop: 4 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10 }}>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3-3a1 1 0 000-1.4l-1.6-1.6a1 1 0 00-1.4 0z"/>
                          <path d="M5 20L2 17 14 5l3 3L5 20z"/>
                        </svg>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#444",
                          textTransform: "uppercase", letterSpacing: 1 }}>Historial de servicios</p>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 10px" }}>
                        {AUTO_SERVICES.map(svc => (
                          <div key={svc.key} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <span style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 11, fontWeight: 800,
                              background: servicesData[svc.key] ? "#22c55e" : "#e8e8e8",
                              color: servicesData[svc.key] ? "white" : "#aaa" }}>
                              {servicesData[svc.key] ? "✓" : "✕"}
                            </span>
                            <span style={{ fontSize: 11, color: servicesData[svc.key] ? "#333" : "#bbb",
                              fontWeight: servicesData[svc.key] ? 500 : 400 }}>
                              {svc.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {specs.length > 0 && (
            <div style={{ padding: "24px 28px", borderTop: "1px solid #f0f0f0" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, margin:"0 0 16px" }}>
                <div style={{ width:4, height:18, borderRadius:2, background:accent, flexShrink:0 }}/>
                <h3 style={{ margin:0, fontSize:13, fontWeight:700, color:"#1a2744",
                  textTransform:"uppercase", letterSpacing:1 }}>
                  Características del vehículo
                </h3>
              </div>
              <div className="am-specs-grid" style={{ display: "grid", gap: "0 32px" }}>
                {specs.map(s => (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 0", borderBottom: "1px solid #f8f8f8" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8,
                      background: `${accent}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0 }}>
                      <SpecIcon label={s.label} accent={accent} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <span style={{ fontSize:10, color:"#aaa", display:"block",
                        letterSpacing:0.5, textTransform:"uppercase" }}>{s.label}</span>
                      <strong style={{ fontSize:13, color:"#222", fontWeight:600 }}>{s.value}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {product.description && (
            <div style={{ padding: "20px 28px 28px", borderTop: "1px solid #f0f0f0" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <line x1="10" y1="9" x2="8" y2="9"/>
                </svg>
                <span style={{ fontSize:11, fontWeight:700, color:"#444",
                  textTransform:"uppercase", letterSpacing:1.2 }}>Descripción</span>
                <div style={{ flex:1, height:1, background:"#f0f0f0" }}/>
              </div>
              <div className="product-rte" dangerouslySetInnerHTML={{ __html: product.description || "" }}
                style={{ fontSize: 14, color: "#555", lineHeight: 1.85 }} />
            </div>
          )}

          {product.reelUrls && product.reelUrls.length > 0 && (
            <div style={{ padding: "20px 28px 28px", borderTop: "1px solid #f0f0f0" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
                  <line x1="7" y1="2" x2="7" y2="22"/>
                  <line x1="17" y1="2" x2="17" y2="22"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <line x1="2" y1="7" x2="7" y2="7"/>
                  <line x1="2" y1="17" x2="7" y2="17"/>
                  <line x1="17" y1="17" x2="22" y2="17"/>
                  <line x1="17" y1="7" x2="22" y2="7"/>
                </svg>
                <span style={{ fontSize:11, fontWeight:700, color:"#444",
                  textTransform:"uppercase", letterSpacing:1.2 }}>Videos</span>
                <div style={{ flex:1, height:1, background:"#f0f0f0" }}/>
              </div>
              <StoreProductReels
                reelUrls={product.reelUrls}
                theme={{ accent, text: "#555", border: "#e8e8e8", radius: 10 }}
              />
            </div>
          )}

          {similar.length > 0 && (
            <div style={{ padding: "24px 28px 32px", borderTop: "1px solid #f0f0f0" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: "#333" }}>
                Estos vehículos también podrían interesarte
              </h3>
              <div className="am-similar-grid" style={{ display: "grid", gap: 12 }}>
                {similar.map(p => (
                  <div key={p.id} onClick={() => onSelect(p)}
                    style={{ cursor: "pointer", border: "1px solid #e0e0e0", borderRadius: 6,
                      overflow: "hidden", background: "#fff" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
                    <img src={p.images[0] || imgs[0]} alt={p.name}
                      style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                    <div style={{ padding: "10px 12px" }}>
                      <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 500, color: "#333",
                        overflow: "hidden", display: "-webkit-box",
                        WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{p.name}</p>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#333" }}>
                        {fmtPrice(p.price, currency)}
                      </p>
                      {(attr(p, "Año") || attr(p, "Km")) && (
                        <p style={{ margin: "3px 0 0", fontSize: 11, color: "#999" }}>
                          {[attr(p, "Año"), attr(p, "Km") && `${Number(attr(p, "Km")).toLocaleString("es-AR")} Km`].filter(Boolean).join(" | ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── LIGHTBOX ───────────────────────────────────────── */}
      {lightboxSrc && (
        <div style={{ position:"fixed", inset:0, zIndex:100000, background:"rgba(0,0,0,0.97)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="" style={{ maxWidth:"100vw", maxHeight:"100vh", objectFit:"contain", touchAction:"pinch-zoom" }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxSrc(null)} aria-label="Cerrar" style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", width:44, height:44, borderRadius:"50%", fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
      )}
    </div>
  );
}

export function VehicleCard({ product, accent, currency, theme = "light", onClick, isFavorite, onToggleFavorite }: {
  product: StorefrontProduct; accent: string; currency: string;
  theme?: "dark" | "light"; onClick: () => void;
  isFavorite?: boolean; onToggleFavorite?: () => void;
}) {
  const [hov, setHov] = useState(false);
  const img = product.images[0]
    ?? "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=75";
  const año = attr(product, "Año");
  const km = attr(product, "Km") || attr(product, "Kilómetros");
  const trans = attr(product, "Transmisión");
  const comb = attr(product, "Combustible");
  const condicion = attr(product, "Condición");
  const ubicacion = vehicleLocation(product);

  const D = theme === "dark";
  const cardBg    = D ? "#1e1e1e" : "#ffffff";
  const titleCol  = D ? "#f0f0f0" : "#333333";
  const priceCol  = D ? "#ffffff" : "#333333";
  const subCol    = D ? "#888"    : "#999";
  const borderCol = D ? (hov ? "#444" : "#2a2a2a") : (hov ? "#c8c8c8" : "#e0e0e0");

  const metaLine = [año, km ? `${Number(km).toLocaleString("es-AR")} km` : null, trans, comb]
    .filter(Boolean).join(" · ");

  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: cardBg, borderRadius: 6, overflow: "hidden", cursor: "pointer",
        border: `1px solid ${borderCol}`,
        boxShadow: hov ? `0 4px 20px rgba(0,0,0,${D ? 0.4 : 0.1})` : `0 1px 4px rgba(0,0,0,${D ? 0.3 : 0.06})`,
        transition: "box-shadow 0.2s, border-color 0.2s", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden",
        background: D ? "#111" : "#f5f5f5" }}>
        <img src={img} alt={product.name}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: D ? "#111" : "#ffffff" }}
          onError={e => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=75"; }} />
        {product.badge && (
          <div style={{ position: "absolute", top: 10, left: 10,
            background: accent, color: getContrastColor(accent) === "light" ? "#fff" : "#111",
            fontSize: 10, fontWeight: 700, padding: "3px 10px",
            borderRadius: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>
            {product.badge}
          </div>
        )}
        {condicion && (
          <div style={{ position: "absolute", bottom: 10, right: 10,
            background: "rgba(0,0,0,0.55)", color: "#fff",
            fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>
            {condicion}
          </div>
        )}
        {onToggleFavorite && (
          <button onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
            style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.9)",
              border: "none", cursor: "pointer", width: 30, height: 30, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill={isFavorite ? accent : "none"} stroke={isFavorite ? accent : "#666"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        )}
      </div>
      <div style={{ padding: "14px 16px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: titleCol, lineHeight: 1.35,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
          overflow: "hidden" }}>{product.name}</p>
        <p style={{ margin: 0, fontSize: "clamp(18px,2.2vw,22px)", fontWeight: 700, color: priceCol, letterSpacing: -0.5 }}>
          {fmtPrice(product.price, currency)}
        </p>
        {metaLine && <p style={{ margin: 0, fontSize: 12, color: subCol, lineHeight: 1.4 }}>{metaLine}</p>}
        {ubicacion && <p style={{ margin: 0, fontSize: 11, color: subCol }}>{ubicacion}</p>}
      </div>
    </div>
  );
}
