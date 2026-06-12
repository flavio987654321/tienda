"use client";
import { useState, useEffect } from "react";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import { getContrastColor } from "@/contexts/EditContext";

export function fmtPrice(n: number, currency: string) {
  return (currency === "USD" ? "USD " : "$") + n.toLocaleString("es-AR");
}

export function attr(p: StorefrontProduct, key: string): string {
  return p.attributes.find(a => a.key.toLowerCase() === key.toLowerCase())?.value ?? "";
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

export function VehicleModal({ product, accent, currency, whatsapp, products, onClose, onSelect }: {
  product: StorefrontProduct; accent: string; currency: string;
  whatsapp: { enabled: boolean; number: string };
  products: StorefrontProduct[];
  onClose: () => void;
  onSelect: (p: StorefrontProduct) => void;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => { setIsTouch(window.matchMedia("(pointer: coarse)").matches); }, []);
  const imgSwipe = useTouchSwipe(
    () => setImgIdx(i => (i + 1) % imgs.length),
    () => setImgIdx(i => (i - 1 + imgs.length) % imgs.length)
  );
  const imgs = product.images.length > 0
    ? product.images
    : ["https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80"];

  const año = attr(product, "Año");
  const km = attr(product, "Km");
  const condicion = attr(product, "Condición");
  const ubicacion = attr(product, "Ubicación") || attr(product, "Ciudad") || "";

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
    { label: "Color",       value: attr(product, "Color") || (product.colors[0] ?? "") },
    { label: "Puertas",     value: attr(product, "Puertas") ? `${attr(product, "Puertas")} puertas` : "" },
  ].filter(s => s.value);

  const similar = products
    .filter(p => p.id !== product.id && p.category === product.category)
    .slice(0, 4);

  const headerLine = [año, km ? `${Number(km).toLocaleString("es-AR")} km` : null, condicion]
    .filter(Boolean).join(" · ");

  const servicesRaw = attr(product, "Servicios");
  let servicesData: Record<string, boolean> = {};
  if (servicesRaw) { try { servicesData = JSON.parse(servicesRaw); } catch {} }
  const hasServices = Object.keys(servicesData).length > 0;

  const waNumber = whatsapp.number.replace(/\D/g, "");
  const waMsg = encodeURIComponent(`Hola! Me interesa el ${product.name}${año ? ` (${año})` : ""}. ¿Está disponible?`);

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
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
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
          <button onClick={onClose}
            style={{ background: "#f5f5f5", border: "none", cursor: "pointer",
              width: 32, height: 32, borderRadius: "50%", fontSize: 18,
              display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
            ×
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <div className="am-modal-body" style={{ display: "grid" }}>
            <div style={{ background: "#f0f0f0" }}>
              <div className="am-img-wrap" style={{ display: "flex" }}>
                {imgs.length > 1 && (
                  <div className="am-img-thumbs" style={{ display: "flex", gap: 4,
                    background: "#e4e4e4", flexShrink: 0 }}>
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
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
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
                  {imgs.length > 1 && (!mousePos || isTouch) && (
                    <>
                      <button onClick={() => setImgIdx(i => (i - 1 + imgs.length) % imgs.length)}
                        style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                          background: "rgba(255,255,255,0.9)", border: "none", width: 34, height: 34,
                          borderRadius: "50%", cursor: "pointer", fontSize: 20,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>‹</button>
                      <button onClick={() => setImgIdx(i => (i + 1) % imgs.length)}
                        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                          background: "rgba(255,255,255,0.9)", border: "none", width: 34, height: 34,
                          borderRadius: "50%", cursor: "pointer", fontSize: 20,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>›</button>
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
                  {headerLine && <p style={{ margin: 0, fontSize: 13, color: "#888" }}>{headerLine}</p>}
                  <h2 style={{ margin: 0, fontSize: "clamp(18px,2.5vw,24px)", fontWeight: 600,
                    color: "#333", lineHeight: 1.2 }}>{product.name}</h2>
                  {ubicacion && <p style={{ margin: 0, fontSize: 12, color: "#aaa" }}>📍 {ubicacion}</p>}
                  <div>
                    <p style={{ margin: 0, fontSize: "clamp(26px,3.5vw,34px)", fontWeight: 700,
                      color: "#333", letterSpacing: -1, lineHeight: 1 }}>
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
                      target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                        background: "#25d366", color: "white", textDecoration: "none",
                        padding: "14px 20px", borderRadius: 6, fontWeight: 700, fontSize: 14,
                        boxShadow: "0 4px 16px rgba(37,211,102,0.3)", marginTop: 4 }}>
                      <WaIcon size={18} /> Consultar por WhatsApp
                    </a>
                  )}
                  {hasServices && (
                    <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 14, marginTop: 4 }}>
                      <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "#555",
                        textTransform: "uppercase", letterSpacing: 0.5 }}>Historial de servicios</p>
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
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: "#333" }}>
                Características del vehículo
              </h3>
              <div className="am-specs-grid" style={{ display: "grid", gap: "0 32px" }}>
                {specs.map(s => (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#f0f0f0",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, fontSize: 12, color: "#666", fontWeight: 700 }}>
                      {s.label.charAt(0)}
                    </div>
                    <span style={{ fontSize: 13, color: "#555" }}>
                      {s.label}: <strong style={{ color: "#333" }}>{s.value}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {product.description && (
            <div style={{ padding: "0 28px 28px", borderTop: "1px solid #f0f0f0" }}>
              <p style={{ margin: 0, fontSize: 14, color: "#666", lineHeight: 1.75 }}>
                {product.description}
              </p>
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
    </div>
  );
}

export function VehicleCard({ product, accent, currency, theme = "light", onClick }: {
  product: StorefrontProduct; accent: string; currency: string;
  theme?: "dark" | "light"; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  const img = product.images[0]
    ?? "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=75";
  const año = attr(product, "Año");
  const km = attr(product, "Km");
  const trans = attr(product, "Transmisión");
  const comb = attr(product, "Combustible");
  const condicion = attr(product, "Condición");
  const ubicacion = attr(product, "Ubicación") || attr(product, "Ciudad") || "";

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
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        {product.badge && (
          <div style={{ position: "absolute", top: 10, left: 10,
            background: accent, color: getContrastColor(accent) === "light" ? "#fff" : "#111",
            fontSize: 10, fontWeight: 700, padding: "3px 10px",
            borderRadius: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>
            {product.badge}
          </div>
        )}
        {condicion && (
          <div style={{ position: "absolute", top: 10, right: 10,
            background: "rgba(0,0,0,0.55)", color: "#fff",
            fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>
            {condicion}
          </div>
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
