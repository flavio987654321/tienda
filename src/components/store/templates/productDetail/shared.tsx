"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FadeImage } from "@/components/store/templates/shared/FadeImage";
import { CartDrawer, type CartTheme } from "@/components/store/templates/shared/CartDrawer";
import { CheckoutModal } from "@/components/store/templates/shared/CheckoutModal";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import { getContrastColor, getReadableAccentText } from "@/contexts/EditContext";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import type { useCartLogic } from "@/hooks/useCartLogic";
import type { StorefrontProduct } from "@/hooks/useStorefront";

export function fmtPrice(n: number, currency: string) {
  return `${currency === "ARS" ? "$" : currency} ${n.toLocaleString("es-AR")}`;
}

const SOCIAL_NETWORKS: ["instagram"|"facebook"|"tiktok"|"youtube"|"pinterest", string][] = [
  ["instagram", "Instagram"], ["facebook", "Facebook"], ["tiktok", "TikTok"], ["youtube", "YouTube"], ["pinterest", "Pinterest"],
];
function SocialIcon({ network }: { network: string }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (network) {
    case "instagram":
      return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>;
    case "facebook":
      return <svg {...common}><path d="M16 3h-2a5 5 0 0 0-5 5v3H6v4h3v8h4v-8h3l1-4h-4V8a1 1 0 0 1 1-1h3z"/></svg>;
    case "tiktok":
      return <svg {...common}><path d="M9 12a4 4 0 1 0 4 4V3a5 5 0 0 0 5 5"/></svg>;
    case "youtube":
      return <svg {...common}><rect x="2" y="5" width="20" height="14" rx="4"/><polygon points="10 9 16 12 10 15" fill="currentColor" stroke="none"/></svg>;
    case "pinterest":
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M9 18l2-7"/><path d="M8 11a4 4 0 1 1 7 2c-1 1.5-3 1-3-1"/></svg>;
    default:
      return null;
  }
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
  // Para pintar texto (no fondos de botón) con el color de acento sin que se
  // vuelva invisible si el dueño elige un acento muy claro — ver resolveDetailTheme.
  accentReadable: string;
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
  hasMercadoPago: boolean;
  isPreview: boolean;
  isOwner: boolean;
  socialLinks: Record<string, string> | undefined;
  accentOverride: string | undefined;
  footerBg: string | undefined;
  cart: ReturnType<typeof useCartLogic>;
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

// Stock de la combinación talle/color elegida, igual que en Ropa y Moda (D-06):
// busca la variante cuyo `name` (JSON con los atributos) o `value` coincide con
// lo seleccionado. Si el producto no tiene variantes cargadas, no se restringe.
function useSelectedVariantStock(product: StorefrontProduct, selectedSize: string, selectedColor: string) {
  return useMemo(() => {
    if (!product.variants.length) return null;
    const v = product.variants.find(v => {
      try {
        const a = JSON.parse(v.name);
        if (a && typeof a === "object") {
          const vals = Object.values(a).map((x) => String(x).toLowerCase());
          const sizeOk = !selectedSize || vals.includes(selectedSize.toLowerCase());
          const colorOk = !selectedColor || vals.includes(selectedColor.toLowerCase());
          return sizeOk && colorOk;
        }
      } catch {}
      return v.value.includes(selectedSize) && v.value.includes(selectedColor);
    }) ?? (product.variants.length === 1 ? product.variants[0] : null);
    return v?.stock ?? null;
  }, [product, selectedSize, selectedColor]);
}

function ProductReels({ theme, reelUrls }: { theme: DetailTheme; reelUrls: string[] }) {
  const [reelIndex, setReelIndex] = useState(0);
  if (reelUrls.length === 0) return null;
  const url = reelUrls[reelIndex];

  let media: React.ReactNode;
  if (/\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url)) {
    media = <video controls style={{ width: 170, aspectRatio: "9/16", objectFit: "cover", background: "#000", borderRadius: theme.radius }}><source src={url} /></video>;
  } else {
    let embedUrl = "";
    if (url.includes("youtube.com/shorts/")) { const id = url.split("shorts/")[1]?.split("?")[0]; embedUrl = `https://www.youtube.com/embed/${id}`; }
    else if (url.includes("youtu.be/")) { const id = url.split("youtu.be/")[1]?.split("?")[0]; embedUrl = `https://www.youtube.com/embed/${id}`; }
    else if (url.includes("youtube.com/watch")) { try { const id = new URL(url).searchParams.get("v"); if (id) embedUrl = `https://www.youtube.com/embed/${id}`; } catch {} }
    if (embedUrl) {
      media = <iframe src={embedUrl} allow="autoplay; encrypted-media" allowFullScreen style={{ width: 170, aspectRatio: "9/16", border: "none", borderRadius: theme.radius }} />;
    } else {
      const platform = url.includes("instagram") ? "Instagram Reel" : url.includes("tiktok") ? "TikTok" : "Video";
      media = (
        <a href={url} target="_blank" rel="noopener noreferrer"
          style={{ width: 170, aspectRatio: "9/16", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, border: `1px solid ${theme.cardBorder}`, textDecoration: "none", color: theme.text, borderRadius: theme.radius, background: theme.pageBg }}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill={theme.accent} stroke="none"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          <span style={{ fontSize: 11 }}>{platform}</span>
        </a>
      );
    }
  }

  return (
    <div style={{ borderTop: `1px solid ${theme.cardBorder}`, paddingTop: 16, marginTop: 8 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: theme.text, margin: "0 0 12px" }}>Videos del producto</p>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        {media}
        {reelUrls.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setReelIndex(i => (i - 1 + reelUrls.length) % reelUrls.length)}
              style={{ background: "none", border: `1px solid ${theme.cardBorder}`, color: theme.text, width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
            <div style={{ display: "flex", gap: 5 }}>
              {reelUrls.map((_, i) => (
                <button key={i} onClick={() => setReelIndex(i)}
                  style={{ width: 6, height: 6, borderRadius: "50%", background: i === reelIndex ? theme.accent : theme.cardBorder, border: "none", cursor: "pointer", padding: 0 }} />
              ))}
            </div>
            <button onClick={() => setReelIndex(i => (i + 1) % reelUrls.length)}
              style={{ background: "none", border: `1px solid ${theme.cardBorder}`, color: theme.text, width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          </div>
        )}
      </div>
    </div>
  );
}

// El template tiene un color de acento por defecto, pero si el vendedor elige
// uno distinto en Configuración avanzada hay que respetarlo. Se resuelve una
// sola vez por página (en cada *Detail.tsx) y ese mismo `theme` resuelto se
// pasa a ProductDetailBody/Footer/Overlays y al nav — así el carrito, el
// footer y el ícono del carrito quedan con el mismo color que el botón de
// compra, en vez de cada uno mirar el accent por defecto del template.
// Único lugar que sabe cómo armar el "?from=editor" / "&from=editor" — antes
// cada link de esta página armaba su propio ternario a mano, y era fácil
// olvidarlo en un link nuevo (pasó dos veces en esta misma página).
export function editorParam(isPreview: boolean, joiner: "?" | "&" = "?"): string {
  return isPreview ? `${joiner}from=editor` : "";
}

export function resolveDetailTheme(theme: DetailTheme, accentOverride: string | undefined): DetailTheme {
  const accent = accentOverride ?? theme.accent;
  return {
    ...theme,
    accent,
    accentText: getContrastColor(accent) === "light" ? "#ffffff" : "#111111",
    accentReadable: getReadableAccentText(accent, theme.pageBg, theme.text),
  };
}

export function ProductDetailBody({ theme, view }: { theme: DetailTheme; view: ProductDetailViewProps }) {
  const { slug, currency, whatsapp, product, related, hasMercadoPago, isPreview, activeImg, setActiveImg,
    selectedSize, setSelectedSize, selectedColor, setSelectedColor,
    needsSize, needsColor, canAdd, qty, setQty, addToCart, discount } = view;

  const [tab, setTab] = useState<"desc" | "specs">("desc");
  const [cp, setCp] = useState("");
  const [cpResult, setCpResult] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const selectedVariantStock = useSelectedVariantStock(product, selectedSize, selectedColor);
  const outOfStock = selectedVariantStock === 0;

  function goToImg(i: number) {
    setActiveImg((i + product.images.length) % product.images.length);
  }
  const imgSwipe = useTouchSwipe(
    () => goToImg(activeImg + 1),
    () => goToImg(activeImg - 1)
  );

  function pickColor(c: string) {
    setSelectedColor(c);
    const idx = product.imageItems.findIndex(img => img.variantValue?.toLowerCase() === c.toLowerCase());
    if (idx !== -1) setActiveImg(idx);
  }

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
        <Link href={`/tienda/${slug}${editorParam(isPreview)}`} style={{ color: theme.muted, textDecoration: "none" }}>Inicio</Link>
        <span>›</span>
        <Link href={`/tienda/${slug}/productos?categoria=${product.category}${editorParam(isPreview, "&")}`} style={{ color: theme.muted, textDecoration: "none" }}>{catLabel}</Link>
        <span>›</span>
        <span style={{ color: theme.text }}>{product.name}</span>
      </div>

      <div style={{ display: "grid", gap: 40 }} className="pdb-grid">
        <style>{`
          .pdb-grid{grid-template-columns:1fr}
          .pdb-gallery{display:flex; flex-direction:column; gap:10px}
          .pdb-thumbs{display:flex; flex-direction:row; gap:8px; overflow-x:auto; order:2}
          .pdb-main{order:1}
          @media(min-width:860px){
            .pdb-grid{grid-template-columns:minmax(360px,540px) 1fr; align-items:start}
            .pdb-gallery{flex-direction:row}
            .pdb-thumbs{flex-direction:column; overflow-x:visible; overflow-y:auto; order:0; width:76px; max-height:480px}
            .pdb-main{order:1; flex:1; min-width:0; max-width:460px}
          }
        `}</style>

        {/* Galería */}
        <div className="pdb-gallery">
          {product.images.length > 1 && (
            <div className="pdb-thumbs">
              {product.images.map((url, i) => (
                <button key={url + i} onClick={() => goToImg(i)}
                  style={{ flexShrink: 0, width: 72, height: 72, borderRadius: 8, overflow: "hidden", border: `2px solid ${i === activeImg ? theme.accent : "transparent"}`, padding: 0, cursor: "pointer", background: "none" }}>
                  <FadeImage src={url} alt="" width={72} height={72} style={{ objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}
          <div className="pdb-main" style={{ aspectRatio: "1/1", background: "#f8f8fa", borderRadius: theme.radius, overflow: "hidden", position: "relative", border: `1px solid ${theme.cardBorder}` }}
            {...imgSwipe}>
            {discount && (
              <div style={{ position: "absolute", top: 12, left: 12, zIndex: 1, background: "#dc2626", color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 100 }}>
                {discount}% OFF
              </div>
            )}
            {product.images[activeImg] ? (
              <FadeImage src={product.images[activeImg]} alt={product.name} fill sizes="(max-width: 860px) 100vw, 50vw" priority
                style={{ objectFit: "cover", cursor: "zoom-in" }}
                onClick={() => setLightboxSrc(product.images[activeImg])} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: theme.muted }}>Sin imagen</div>
            )}
            {product.images.length > 1 && (
              <>
                <button onClick={() => goToImg(activeImg - 1)} aria-label="Imagen anterior"
                  style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(20,20,20,0.55)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>‹</button>
                <button onClick={() => goToImg(activeImg + 1)} aria-label="Imagen siguiente"
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(20,20,20,0.55)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>›</button>
                <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(20,20,20,0.6)", color: "#fff", fontSize: 11, letterSpacing: 0.5, padding: "4px 10px", borderRadius: 100, zIndex: 2 }}>
                  {activeImg + 1} / {product.images.length}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Info */}
        <div>
          <p style={{ margin: "0 0 6px", fontSize: 11.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: theme.accentReadable }}>
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
          {hasMercadoPago ? (
            product.cuotas ? (
              <div style={{ margin: "0 0 24px" }}>
                <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: theme.text }}>
                  {product.cuotas} cuotas sin interés de {fmtPrice(product.price / product.cuotas, currency)}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  {["VISA", "MASTERCARD", "AMEX"].map(card => (
                    <span key={card} style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: theme.muted, border: `1px solid ${theme.cardBorder}`, borderRadius: 4, padding: "2px 6px" }}>{card}</span>
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: 11, color: theme.muted }}>Cuotas informativas, sujetas a las condiciones de tu tarjeta y banco.</p>
              </div>
            ) : (
              <p style={{ margin: "0 0 24px", fontSize: 12.5, color: theme.muted }}>Pagá con tarjeta de crédito o débito</p>
            )
          ) : null}

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
                  <button key={c} onClick={() => pickColor(c)}
                    style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      border: `1.5px solid ${selectedColor === c ? theme.accent : theme.cardBorder}`,
                      background: selectedColor === c ? `${theme.accent}14` : "transparent", color: theme.text }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedVariantStock !== null && outOfStock && (
            <p style={{ fontSize: 12.5, color: "#dc2626", fontWeight: 600, margin: "0 0 12px" }}>Sin stock en esta combinación</p>
          )}
          {selectedVariantStock !== null && selectedVariantStock > 0 && selectedVariantStock <= 5 && (
            <p style={{ fontSize: 12.5, color: "#d97706", fontWeight: 600, margin: "0 0 12px" }}>¡Últimas {selectedVariantStock} unidades!</p>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${theme.cardBorder}`, borderRadius: 8 }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ padding: "8px 14px", background: "none", border: "none", color: theme.text, cursor: "pointer", fontSize: 15 }}>−</button>
              <span style={{ fontSize: 13, fontWeight: 600, color: theme.text, minWidth: 20, textAlign: "center" }}>{qty}</span>
              <button onClick={() => setQty(qty + 1)} style={{ padding: "8px 14px", background: "none", border: "none", color: theme.text, cursor: "pointer", fontSize: 15 }}>+</button>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
            <button onClick={addToCart} disabled={!canAdd || outOfStock}
              style={{ flex: "1 1 200px", background: (canAdd && !outOfStock) ? theme.accent : "#d1d5db", color: (canAdd && !outOfStock) ? theme.accentText : "#6b7280",
                border: "none", padding: "14px 22px", fontWeight: 700, fontSize: 13.5, borderRadius: theme.radius, cursor: (canAdd && !outOfStock) ? "pointer" : "default" }}>
              {outOfStock ? "Sin stock" : "Agregar al carrito"}
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

        </div>
      </div>

      {/* Descripción / Especificaciones — ancho completo, debajo de la galería e info */}
      <div style={{ marginTop: 40 }}>
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
          <div style={{ borderRadius: theme.radius, overflow: "hidden" }}>
            {product.attributes.map((a, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "14px 18px", fontSize: 13.5, background: i % 2 === 0 ? `${theme.accent}0a` : "transparent" }}>
                <span style={{ color: theme.accentReadable, fontWeight: 600 }}>{a.key.toUpperCase()}</span>
                <span style={{ color: theme.muted }}>{a.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: theme.muted }}>Sin especificaciones cargadas.</p>
        )}

        <ProductReels theme={theme} reelUrls={product.reelUrls} />
      </div>

      {/* Relacionados */}
      {related.length > 0 && (
        <div style={{ marginTop: 56, position: "relative" }}>
          <h2 style={{ margin: "0 0 18px", fontSize: 19, fontWeight: 700, color: theme.text, fontFamily: theme.headingFont }}>También te puede interesar</h2>
          <button onClick={() => scrollCarousel(-1)} aria-label="Anterior"
            style={{ position: "absolute", left: -36, top: "38%", transform: "translateY(-50%)", width: 36,
              border: "none", background: "none", color: theme.text, opacity: 0.6, textShadow: "0 0 6px rgba(255,255,255,0.5), 0 0 6px rgba(0,0,0,0.5)", fontSize: 44, lineHeight: 1, cursor: "pointer", zIndex: 2,
              display: "none" }} className="pdb-arrow-l">‹</button>
          <button onClick={() => scrollCarousel(1)} aria-label="Siguiente"
            style={{ position: "absolute", right: -36, top: "38%", transform: "translateY(-50%)", width: 36,
              border: "none", background: "none", color: theme.text, opacity: 0.6, textShadow: "0 0 6px rgba(255,255,255,0.5), 0 0 6px rgba(0,0,0,0.5)", fontSize: 44, lineHeight: 1, cursor: "pointer", zIndex: 2,
              display: "none" }} className="pdb-arrow-r">›</button>
          <style>{`@media(min-width:640px){.pdb-arrow-l,.pdb-arrow-r{display:flex!important;align-items:center;justify-content:center}}`}</style>
          <div ref={carouselRef} style={{ display: "flex", gap: 16, overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 4 }}>
            {related.map(p => (
              <Link key={p.id} href={`/tienda/${slug}/producto/${p.id}${editorParam(isPreview)}`}
                style={{ flexShrink: 0, width: 170, scrollSnapAlign: "start", textDecoration: "none", color: "inherit" }}>
                <div style={{ aspectRatio: "1/1", background: "#f8f8fa", borderRadius: theme.radius, overflow: "hidden", marginBottom: 8, border: `1px solid ${theme.cardBorder}`, position: "relative" }}>
                  {p.images[0] && (
                    <FadeImage src={p.images[0]} alt={p.name} fill sizes="170px" style={{ objectFit: "cover" }} />
                  )}
                </div>
                <p style={{ margin: "0 0 4px", fontSize: 12.5, color: theme.text, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.name}</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: theme.text }}>{fmtPrice(p.price, currency)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox — zoom de la imagen principal */}
      {lightboxSrc && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(10,10,10,0.92)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}
          onClick={() => setLightboxSrc(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxSrc} alt="" style={{ maxWidth: "94vw", maxHeight: "94vh", objectFit: "contain", touchAction: "pinch-zoom" }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxSrc(null)} aria-label="Cerrar"
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 44, height: 44, borderRadius: "50%", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
      )}
    </div>
  );
}

function detailCartTheme(theme: DetailTheme): CartTheme {
  return { BG: theme.pageBg, S: theme.pageBg, T: theme.text, MID: theme.muted, border: theme.cardBorder, accent: theme.accent, accentText: theme.accentText, serif: theme.headingFont !== "inherit" ? theme.headingFont : undefined };
}

// Footer "completo" igual al de la página de inicio del template (nombre,
// copyright, redes sociales, políticas, reportar tienda) — un solo lugar
// para los 4 templates en vez de un footer simplificado por archivo.
export function ProductDetailFooter({ theme, bg: defaultBg = "#0a0a0a", view }: { theme: DetailTheme; bg?: string; view: ProductDetailViewProps }) {
  const { slug, storeName, socialLinks, isPreview, footerBg } = view;
  const [showReport, setShowReport] = useState(false);
  // El color de fondo lo elige el dueño en el editor (mismo campo que el footer
  // del home); si todavía no lo tocó, usamos el default propio del template.
  // El texto/iconos se recalculan según ese fondo para que siempre sean legibles.
  const bg = footerBg ?? defaultBg;
  const fg = getContrastColor(bg) === "dark" ? "#111111" : "#f5f5f5";
  // El acento puede no leerse sobre ESTE fondo (que es independiente del fondo
  // de la página) — si no se distingue, usamos el mismo color de texto que ya
  // elegimos para el resto del footer en vez de theme.accentReadable (pensado
  // para el fondo claro de la página, no para este).
  const brandColor = getReadableAccentText(theme.accent, bg, fg);

  return (
    <footer style={{ background: bg, padding: "32px 24px", textAlign: "center" }}>
      <p style={{ margin: "0 0 6px", fontWeight: 900, fontSize: 14, color: brandColor }}>{storeName}</p>
      <p style={{ margin: "0 0 12px", fontSize: 11, color: fg, opacity: 0.6 }}>
        © {new Date().getFullYear()} {storeName}. Todos los derechos reservados.
      </p>
      {(isPreview || SOCIAL_NETWORKS.some(([key]) => socialLinks?.[key])) && (
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 14 }}>
          {SOCIAL_NETWORKS.map(([key, label]) => {
            const url = socialLinks?.[key];
            if (!isPreview && !url) return null;
            return (
              <a key={key} href={url || "#"} target={url ? "_blank" : undefined} rel="noopener noreferrer" aria-label={label}
                onClick={e => { if (!url) e.preventDefault(); }}
                style={{ width: 30, height: 30, borderRadius: "50%", border: `1px solid ${fg}`, color: fg, opacity: url ? 0.7 : 0.3, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                <SocialIcon network={key} />
              </a>
            );
          })}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 16px" }}>
        {[["Política de devoluciones", "devoluciones"], ["Política de envíos", "envios"], ["Términos y condiciones", "terminos"]].map(([label, tipo]) => (
          <a key={tipo} href={`/tienda/${slug}/politicas?tipo=${tipo}`} style={{ fontSize: 10, color: fg, opacity: 0.55, textDecoration: "none" }}>{label}</a>
        ))}
        {!isPreview && (
          <button onClick={() => setShowReport(true)}
            style={{ fontSize: 10, color: fg, opacity: 0.55, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
            Reportar tienda
          </button>
        )}
      </div>
      {showReport && <ReportStoreModal slug={slug} onClose={() => setShowReport(false)} />}
    </footer>
  );
}

// Carrito + checkout + favoritos + toast — el mismo sistema real que usan
// los homes (CartDrawer/CheckoutModal compartidos), para que el ícono de
// carrito de esta página abra un panel acá mismo en vez de navegar a otro lado.
export function ProductDetailOverlays({ theme, view }: { theme: DetailTheme; view: ProductDetailViewProps }) {
  const { cart, isPreview, isOwner, whatsapp } = view;
  const { favorites, favoritesOpen, setFavoritesOpen, favoriteProducts, toggleFavorite, toastMsg } = cart;
  const cartTheme = detailCartTheme(theme);
  const whatsappConfig = whatsapp ? { enabled: true, number: whatsapp } : undefined;

  return (
    <>
      <CartDrawer cart={cart} theme={cartTheme} isOwner={isOwner} isPreview={isPreview} whatsapp={whatsappConfig} />
      <CheckoutModal cart={cart} theme={cartTheme} isPreview={isPreview} />

      <div style={{ position: "fixed", inset: 0, zIndex: isPreview ? 20000 : 205, pointerEvents: favoritesOpen ? "auto" : "none" }}>
        <div onClick={() => setFavoritesOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", opacity: favoritesOpen ? 1 : 0, transition: "opacity 0.3s" }} />
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 400, maxWidth: "100vw", background: theme.pageBg, transform: favoritesOpen ? "translateX(0)" : "translateX(100%)", transition: "transform 0.35s cubic-bezier(.4,0,.2,1)", display: "flex", flexDirection: "column", borderLeft: `1px solid ${theme.cardBorder}` }}>
          <div style={{ padding: "20px 24px 14px", borderBottom: `1px solid ${theme.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontWeight: 700, fontSize: 16, margin: 0, color: theme.text }}>Favoritos <span style={{ fontWeight: 400, fontSize: 13, color: theme.muted }}>({favorites.length})</span></p>
            <button onClick={() => setFavoritesOpen(false)} style={{ background: "none", border: "none", color: theme.text, fontSize: 22, cursor: "pointer" }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 24px" }}>
            {favoriteProducts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "52px 0", color: theme.muted }}>
                <p style={{ fontSize: 32, marginBottom: 12 }}>♡</p>
                <p style={{ fontSize: 13, lineHeight: 1.8 }}>No tenés favoritos aún.<br />Explorá el catálogo.</p>
              </div>
            ) : favoriteProducts.map(product => (
              <div key={product.id} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: `1px solid ${theme.cardBorder}` }}>
                {product.images[0] ? (
                  <FadeImage src={product.images[0]} alt="" width={80} height={60} style={{ objectFit: "cover", borderRadius: 4, flexShrink: 0, background: theme.cardBorder }} />
                ) : (
                  <div style={{ width: 80, height: 60, borderRadius: 4, flexShrink: 0, background: theme.cardBorder }} />
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px", color: theme.text }}>{product.name}</p>
                  <p style={{ fontSize: 13, color: theme.accentReadable, fontWeight: 700, margin: "0 0 10px" }}>{fmtPrice(product.price, "ARS")}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link href={`/tienda/${view.slug}/producto/${product.id}${editorParam(isPreview)}`} onClick={() => setFavoritesOpen(false)}
                      style={{ background: theme.accent, color: theme.accentText, border: "none", borderRadius: 4, padding: "7px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>
                      Ver
                    </Link>
                    <button onClick={() => toggleFavorite(product.id)}
                      style={{ background: "transparent", color: theme.muted, border: `1px solid ${theme.cardBorder}`, borderRadius: 4, padding: "7px 14px", fontSize: 11, cursor: "pointer" }}>
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {toastMsg && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: theme.text, color: theme.pageBg, padding: "12px 20px", fontSize: 13, fontWeight: 600, zIndex: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.35)", whiteSpace: "nowrap" }}>
          {toastMsg}
        </div>
      )}
    </>
  );
}
