"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import type { StorefrontProduct } from "@/hooks/useStorefront";

export function fmtPrice(n: number, currency: string) {
  return `${currency === "ARS" ? "$" : currency} ${n.toLocaleString("es-AR")}`;
}

export const HOGAR_TECH_LABELS: Record<string, string> = {
  "electrodomesticos": "Electrodomésticos",
  "pequenos-electrodomesticos": "Pequeños Electro",
  "celulares-y-accesorios": "Celulares y Accesorios",
  "informatica-y-gaming": "Informática y Gaming",
  "audio-imagen-y-video": "Audio, Imagen y Video",
  "muebles-y-colchones": "Muebles y Colchones",
  "casa-y-jardin": "Casa y Jardín",
};

export interface DetailTheme {
  pageBg: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  cardBorder: string;
  font: string;
  headingFont: string;
  radius: number;
}

export interface ProductDetailViewProps {
  slug: string;
  storeName: string;
  currency: string;
  whatsapp: string | null;
  product: StorefrontProduct;
  related: StorefrontProduct[];
  activeImg: number;
  setActiveImg: (i: number) => void;
  selectedSize: string;
  setSelectedSize: (s: string) => void;
  selectedColor: string;
  setSelectedColor: (s: string) => void;
  needsSize: boolean;
  needsColor: boolean;
  canAdd: boolean;
  qty: number;
  setQty: (n: number) => void;
  addToCart: () => void;
  cartCount: number;
  toastMsg: string | null;
  discount: number | null;
  catalogHref: string;
}

export function ProductDetailBody({ theme, view }: { theme: DetailTheme; view: ProductDetailViewProps }) {
  const { slug, currency, whatsapp, product, related, activeImg, setActiveImg,
    selectedSize, setSelectedSize, selectedColor, setSelectedColor,
    needsSize, needsColor, canAdd, qty, setQty, addToCart, discount, catalogHref } = view;

  const [tab, setTab] = useState<"desc" | "specs">("desc");
  const [cp, setCp] = useState("");
  const [cpResult, setCpResult] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  function scrollCarousel(dir: 1 | -1) {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }

  const catLabel = HOGAR_TECH_LABELS[product.category] ?? product.category;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 24px 64px" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, fontSize: 12.5, color: theme.muted, marginBottom: 22 }}>
        <Link href={`/tienda/${slug}`} style={{ color: theme.muted, textDecoration: "none" }}>Inicio</Link>
        <span>›</span>
        <Link href={`${catalogHref}?categoria=${product.category}`} style={{ color: theme.muted, textDecoration: "none" }}>{catLabel}</Link>
        <span>›</span>
        <span style={{ color: theme.text }}>{product.name}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 40 }} className="pdb-grid">
        <style>{`.pdb-grid{grid-template-columns:1fr} @media(min-width:860px){.pdb-grid{grid-template-columns:1fr 1fr}}`}</style>

        {/* Galería */}
        <div>
          <div style={{ aspectRatio: "1/1", background: "#f8f8fa", borderRadius: theme.radius, overflow: "hidden", marginBottom: 12, position: "relative", border: `1px solid ${theme.cardBorder}` }}>
            {discount && (
              <div style={{ position: "absolute", top: 12, left: 12, zIndex: 1, background: "#dc2626", color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 100 }}>
                {discount}% OFF
              </div>
            )}
            {product.images[activeImg] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[activeImg]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: theme.muted }}>Sin imagen</div>
            )}
          </div>
          {product.images.length > 1 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
              {product.images.map((url, i) => (
                <button key={url + i} onClick={() => setActiveImg(i)}
                  style={{ flexShrink: 0, width: 64, height: 64, borderRadius: 8, overflow: "hidden", border: `2px solid ${i === activeImg ? theme.accent : "transparent"}`, padding: 0, cursor: "pointer", background: "none" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p style={{ margin: "0 0 6px", fontSize: 11.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: theme.accent }}>
            {product.attributes.find(a => a.key.toLowerCase() === "marca")?.value ?? catLabel}
          </p>
          <h1 style={{ margin: "0 0 16px", fontSize: "clamp(22px,3vw,30px)", fontWeight: 700, color: theme.text, fontFamily: theme.headingFont, lineHeight: 1.2 }}>
            {product.name}
          </h1>

          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 2 }}>
            {product.comparePrice && product.comparePrice > product.price && (
              <span style={{ fontSize: 15, color: theme.muted, textDecoration: "line-through" }}>{fmtPrice(product.comparePrice, currency)}</span>
            )}
            {discount && (
              <span style={{ background: theme.accent, color: theme.accentText, fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 6 }}>{discount}%OFF</span>
            )}
          </div>
          <p style={{ margin: "0 0 6px", fontSize: 30, fontWeight: 800, color: theme.text }}>{fmtPrice(product.price, currency)}</p>
          <p style={{ margin: "0 0 24px", fontSize: 12.5, color: theme.muted }}>Pagá en cuotas con tarjeta de crédito</p>

          {needsSize && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: theme.text, margin: "0 0 8px" }}>Tamaño</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {product.sizes.map(s => (
                  <button key={s} onClick={() => setSelectedSize(s)}
                    style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      border: `1.5px solid ${selectedSize === s ? theme.accent : theme.cardBorder}`,
                      background: selectedSize === s ? `${theme.accent}14` : "transparent", color: theme.text }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {needsColor && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: theme.text, margin: "0 0 8px" }}>Color</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {product.colors.map(c => (
                  <button key={c} onClick={() => setSelectedColor(c)}
                    style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      border: `1.5px solid ${selectedColor === c ? theme.accent : theme.cardBorder}`,
                      background: selectedColor === c ? `${theme.accent}14` : "transparent", color: theme.text }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${theme.cardBorder}`, borderRadius: 8 }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ padding: "8px 14px", background: "none", border: "none", color: theme.text, cursor: "pointer", fontSize: 15 }}>−</button>
              <span style={{ fontSize: 13, fontWeight: 600, color: theme.text, minWidth: 20, textAlign: "center" }}>{qty}</span>
              <button onClick={() => setQty(qty + 1)} style={{ padding: "8px 14px", background: "none", border: "none", color: theme.text, cursor: "pointer", fontSize: 15 }}>+</button>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
            <button onClick={addToCart} disabled={!canAdd}
              style={{ flex: "1 1 200px", background: canAdd ? theme.accent : "#d1d5db", color: canAdd ? theme.accentText : "#6b7280",
                border: "none", padding: "14px 22px", fontWeight: 700, fontSize: 13.5, borderRadius: theme.radius, cursor: canAdd ? "pointer" : "default" }}>
              Agregar al carrito
            </button>
            {whatsapp && (
              <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola! Te consulto sobre ${product.name}`)}`}
                target="_blank" rel="noopener noreferrer"
                style={{ flex: "1 1 200px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: `1.5px solid #25d366`, color: "#1a9e4f",
                  textDecoration: "none", padding: "14px 22px", fontWeight: 700, fontSize: 13.5, borderRadius: theme.radius }}>
                Consultar por WhatsApp
              </a>
            )}
          </div>

          {/* Calculadora de envío */}
          <div style={{ border: `1px solid ${theme.cardBorder}`, borderRadius: theme.radius, padding: "16px 18px", marginBottom: 24 }}>
            <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: theme.text }}>Calcular envío</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={cp} onChange={e => setCp(e.target.value)} placeholder="Código postal" maxLength={8}
                style={{ flex: 1, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: theme.text, background: "transparent" }} />
              <button onClick={() => setCpResult(cp.trim() ? "El vendedor coordina el envío con vos por WhatsApp tras la compra." : null)}
                style={{ background: theme.text, color: theme.pageBg, border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                Calcular
              </button>
            </div>
            {cpResult && <p style={{ margin: "10px 0 0", fontSize: 12, color: theme.muted, lineHeight: 1.6 }}>{cpResult}</p>}
          </div>

          {/* Tabs */}
          <div style={{ borderBottom: `1px solid ${theme.cardBorder}`, display: "flex", gap: 24, marginBottom: 16 }}>
            {([["desc", "Descripción"], ["specs", "Especificaciones"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 10px", fontSize: 13.5, fontWeight: 700,
                  color: tab === key ? theme.accent : theme.muted, borderBottom: tab === key ? `2px solid ${theme.accent}` : "2px solid transparent" }}>
                {label}
              </button>
            ))}
          </div>
          {tab === "desc" ? (
            <p style={{ margin: 0, fontSize: 13.5, color: theme.muted, lineHeight: 1.85, whiteSpace: "pre-line" }}>
              {product.description || "Sin descripción disponible."}
            </p>
          ) : product.attributes.length > 0 ? (
            <div style={{ border: `1px solid ${theme.cardBorder}`, borderRadius: theme.radius, overflow: "hidden" }}>
              {product.attributes.map((a, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", fontSize: 13, borderTop: i > 0 ? `1px solid ${theme.cardBorder}` : "none" }}>
                  <span style={{ color: theme.muted }}>{a.key}</span>
                  <span style={{ color: theme.text, fontWeight: 600 }}>{a.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: theme.muted }}>Sin especificaciones cargadas.</p>
          )}
        </div>
      </div>

      {/* Relacionados */}
      {related.length > 0 && (
        <div style={{ marginTop: 56, position: "relative" }}>
          <h2 style={{ margin: "0 0 18px", fontSize: 19, fontWeight: 700, color: theme.text, fontFamily: theme.headingFont }}>También te puede interesar</h2>
          <button onClick={() => scrollCarousel(-1)} aria-label="Anterior"
            style={{ position: "absolute", left: -16, top: "58%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%",
              border: `1px solid ${theme.cardBorder}`, background: theme.pageBg, color: theme.text, cursor: "pointer", zIndex: 2, display: "none" }} className="pdb-arrow-l">‹</button>
          <button onClick={() => scrollCarousel(1)} aria-label="Siguiente"
            style={{ position: "absolute", right: -16, top: "58%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%",
              border: `1px solid ${theme.cardBorder}`, background: theme.pageBg, color: theme.text, cursor: "pointer", zIndex: 2, display: "none" }} className="pdb-arrow-r">›</button>
          <style>{`@media(min-width:640px){.pdb-arrow-l,.pdb-arrow-r{display:flex!important;align-items:center;justify-content:center}}`}</style>
          <div ref={carouselRef} style={{ display: "flex", gap: 16, overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 4 }}>
            {related.map(p => (
              <Link key={p.id} href={`/tienda/${slug}/producto/${p.id}`}
                style={{ flexShrink: 0, width: 170, scrollSnapAlign: "start", textDecoration: "none", color: "inherit" }}>
                <div style={{ aspectRatio: "1/1", background: "#f8f8fa", borderRadius: theme.radius, overflow: "hidden", marginBottom: 8, border: `1px solid ${theme.cardBorder}` }}>
                  {p.images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </div>
                <p style={{ margin: "0 0 4px", fontSize: 12.5, color: theme.text, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.name}</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: theme.text }}>{fmtPrice(p.price, currency)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
