"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

const SOCIAL_ICONS: Record<string, { path: string; color: string; gradient?: string }> = {
  instagram: { path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z", color: "#E1306C", gradient: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" },
  facebook:  { path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z", color: "#1877F2" },
  tiktok:    { path: "M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.95a8.16 8.16 0 004.77 1.52V7.03a4.85 4.85 0 01-1-.34z", color: "#010101" },
  whatsapp:  { path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z", color: "#25D366" },
  email:     { path: "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z", color: "#6366f1" },
};

// Previene href con javascript: o data: — segunda línea de defensa
function safeHref(url: unknown): string {
  if (!url || typeof url !== "string") return "#";
  try {
    const { protocol } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return "#";
  } catch {
    if (!url.startsWith("/") && url !== "#") return "#";
  }
  return url;
}

function SocialIconCircle({ network, size = 40, forButton = false }: { network: string; size?: number; forButton?: boolean }) {
  const meta = SOCIAL_ICONS[network.toLowerCase()] ?? SOCIAL_ICONS.email;
  const bg = meta.gradient ?? meta.color;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:`${size}px`, height:`${size}px`, borderRadius:"999px", background: forButton ? "rgba(255,255,255,0.2)" : bg, flexShrink:0 }}>
      <svg viewBox="0 0 24 24" fill="white" width={size * 0.45} height={size * 0.45}><path d={meta.path}/></svg>
    </span>
  );
}
function BannerCarouselBlock({ block, primaryColor, fontFamily }: { block: any; primaryColor: string; fontFamily: string }) {
  const p = block.props;
  const slides: any[] = Array.isArray(p.slides) ? p.slides : [];
  const [idx, setIdx] = useState(0);
  // Porcentaje de alto relativo al ancho — igual en cualquier pantalla
  const RATIOS: Record<string,string> = { sm:"25%", md:"35%", lg:"47%", xl:"56.25%" };
  const paddingBottom = RATIOS[String(p.height||"md")] || "35%";
  const cur = slides[idx % Math.max(1, slides.length)] || {};
  const overlayOpacity = Number(p.overlayOpacity ?? 35) / 100;
  const textColor = String(p.textColor || "#ffffff");
  const textAlign = String(p.textAlign || "center");

  useEffect(() => {
    if (p.autoplay === false || slides.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % slides.length), (Number(p.speed) || 4) * 1000);
    return () => clearInterval(t);
  }, [p.autoplay, p.speed, slides.length]);

  return (
    <div style={{ position:"relative", width:"100%", paddingBottom, overflow:"hidden", fontFamily, background:"#1f2937", userSelect:"none" }}>
      <div style={{ position:"absolute", inset:0 }}>
        {/* Todas las imágenes apiladas — solo la activa tiene opacity:1, el resto opacity:0 */}
        {slides.length === 0 && <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,#4f46e5,#7c3aed)" }}/>}
        {slides.map((slide, i) => (
          slide.image
            ? <img key={i} src={slide.image} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:`${slide.focalX??50}% ${slide.focalY??50}%`, opacity: i === idx ? 1 : 0, transition:"opacity 0.6s ease" }}/>
            : <div key={i} style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", opacity: i === idx ? 1 : 0, transition:"opacity 0.6s ease" }}/>
        ))}
        <div style={{ position:"absolute", inset:0, background:String(p.overlayColor||"#000000"), opacity:overlayOpacity }}/>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:textAlign==="center"?"center":textAlign==="right"?"flex-end":"flex-start", justifyContent:"center", padding:"32px 48px", textAlign:textAlign as React.CSSProperties["textAlign"], gap:"12px" }}>
          {cur.showTitle!==false && cur.title && <h2 style={{ fontSize:"clamp(24px,4vw,48px)", fontWeight:900, color:textColor, lineHeight:1.1, margin:0 }}>{cur.title}</h2>}
          {cur.showSubtitle!==false && cur.subtitle && <p style={{ fontSize:"clamp(14px,1.5vw,18px)", color:textColor, opacity:0.9, margin:0, maxWidth:"560px" }}>{cur.subtitle}</p>}
          {cur.showButton!==false && cur.buttonText && (
            <a href={safeHref(cur.buttonUrl)} style={{ display:"inline-block", background:primaryColor, color:"#fff", padding:"12px 28px", borderRadius:"999px", fontSize:"14px", fontWeight:800, textDecoration:"none", marginTop:"4px" }}>
              {cur.buttonText}
            </a>
          )}
        </div>
        {p.showDots!==false && slides.length > 1 && (
          <div style={{ position:"absolute", bottom:"14px", left:0, right:0, display:"flex", justifyContent:"center", gap:"6px" }}>
            {slides.map((_:any,i:number)=>(
              <button key={i} onClick={()=>setIdx(i)} style={{ width:i===idx?"22px":"8px", height:"8px", borderRadius:"4px", background:i===idx?"#fff":"rgba(255,255,255,0.45)", border:"none", cursor:"pointer", padding:0, transition:"width 0.25s" }}/>
            ))}
          </div>
        )}
        {p.showArrows!==false && slides.length > 1 && (
          <>
            <button onClick={()=>setIdx(i=>(i-1+slides.length)%slides.length)} style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", background:"rgba(0,0,0,0.35)", border:"none", borderRadius:"50%", width:"36px", height:"36px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:"20px" }}>‹</button>
            <button onClick={()=>setIdx(i=>(i+1)%slides.length)} style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", background:"rgba(0,0,0,0.35)", border:"none", borderRadius:"50%", width:"36px", height:"36px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:"20px" }}>›</button>
          </>
        )}
      </div>
    </div>
  );
}

import {
  Heart,
  Loader2,
  Mail,
  Menu,
  MessageCircle,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Truck,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { getStoreType } from "@/lib/storeTypes";

const COLOR_NAMES: Record<string, string> = {
  rojo:"#ef4444", red:"#ef4444", azul:"#3b82f6", blue:"#3b82f6",
  verde:"#22c55e", green:"#22c55e", negro:"#111827", black:"#111827",
  blanco:"#f9fafb", white:"#f9fafb", amarillo:"#eab308", yellow:"#eab308",
  naranja:"#f97316", orange:"#f97316", rosa:"#ec4899", pink:"#ec4899",
  violeta:"#8b5cf6", purple:"#8b5cf6", lila:"#c084fc",
  gris:"#9ca3af", gray:"#9ca3af", grey:"#9ca3af",
  marron:"#92400e", brown:"#92400e", beige:"#d4b896",
  celeste:"#67e8f9", turquesa:"#2dd4bf", turquoise:"#2dd4bf",
  dorado:"#d97706", gold:"#d97706", plateado:"#e2e8f0", silver:"#e2e8f0",
  bordo:"#881337", coral:"#fb7185", mostaza:"#ca8a04", nude:"#f5d5ba",
};
function parseVariantAttrs(v: { name: string; value: string }): { name: string; value: string }[] {
  if (typeof v.name === "string" && v.name.startsWith("{")) {
    try {
      const obj = JSON.parse(v.name) as Record<string, string>;
      const entries = Object.entries(obj).filter(([, val]) => val);
      if (entries.length > 0) return entries.map(([k, val]) => ({ name: k, value: val }));
    } catch {}
  }
  return [{ name: v.name || "Variante", value: v.value }];
}

function variantToColor(value: string): string | null {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
  return COLOR_NAMES[v.toLowerCase()] ?? null;
}

type Variant = {
  id: string;
  name: string;
  value: string;
  stock: number;
  price: number | null;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  precioMayorista: number | null;
  cantMinMayorista: number | null;
  images: string;
  reelUrls: string;
  category: string;
  subcategory: string | null;
  variants: Variant[];
};

type Store = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo: string | null;
  logoColor: string | null;
  banner: string | null;
  tagline: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  templateId: string;
  productLayout: string;
  heroStyle: string;
  showPrices: boolean;
  showStock: boolean;
  showRatings: boolean;
  announcementBar: string | null;
  announcementBarColor: string;
  navbarStyle: string;
  buttonStyle: string;
  cardRadius: string;
  cardShadow: string;
  backgroundStyle: string;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  whatsappNumber: string | null;
  showWhatsappButton: boolean;
  tipoTienda: string | null;
  footerText: string | null;
  footerDescription: string | null;
  footerShowLegal: boolean;
  policyReturns: string | null;
  policyShipping: string | null;
  policyTerms: string | null;
  policyReturnsActive: boolean;
  policyShippingActive: boolean;
  policyTermsActive: boolean;
  currency: string;
  pageBlocks: string;
  navLinks: string;
  owner: { name: string | null; email: string };
  products: Product[];
  mpConnected: boolean;
};

type CartItem = {
  productId: string;
  variantId: string | null;
  name: string;
  variantLabel: string | null;
  price: number;
  precioMayorista: number | null;
  cantMinMayorista: number | null;
  quantity: number;
  maxStock: number | null;
  image: string | null;
};

type PreviewViewport = "desktop" | "tablet" | "mobile";
type TextPosition = { x: number; y: number };
type PositionedTextItem = {
  id: string;
  content: ReactNode;
  defaultPos: TextPosition;
  className?: string;
  style?: CSSProperties;
};

type Customer = {
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string;
};

const SHIPPING_OPTIONS = [
  { id: "pickup", label: "Retiro en local / acordar", cost: 0 },
  { id: "standard", label: "Envio estandar", cost: 3500 },
  { id: "national", label: "Envio nacional", cost: 6500 },
];

const PAYMENT_OPTIONS = [
  { id: "transfer", label: "Transferencia bancaria" },
  { id: "cash", label: "Pago al retirar / acordar" },
];

const RADIUS: Record<string, string> = {
  none: "rounded-none",
  sm: "rounded-md",
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-[28px]",
};

const SHADOW: Record<string, string> = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-xl",
};

const GRID: Record<string, string> = {
  grid2: "grid-cols-1 sm:grid-cols-2",
  grid3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  grid4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  list: "grid-cols-1",
};

type ImageItem = { url: string; variantValue?: string };

function parseImages(images: string): ImageItem[] {
  try {
    const parsed = JSON.parse(images);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(Boolean)
      .map((item) =>
        typeof item === "string"
          ? { url: item }
          : { url: (item as any).url || "", variantValue: (item as any).variantValue }
      )
      .filter((item) => item.url);
  } catch {
    return [];
  }
}

function parseReelUrls(reelUrls: string | null | undefined) {
  try {
    const parsed = JSON.parse(reelUrls || "[]");
    return Array.isArray(parsed) ? parsed.filter((url): url is string => typeof url === "string" && url.trim().length > 0) : [];
  } catch {
    return [];
  }
}

function money(value: number, currency = "ARS") {
  if (currency === "USD") return `U$D ${value.toLocaleString("es-AR")}`;
  return `$${value.toLocaleString("es-AR")}`;
}

function formatCategoryLabel(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function socialUrl(kind: "instagram" | "facebook" | "tiktok" | "whatsapp" | "email", value: string) {
  const clean = value.trim();
  if (!clean) return "";
  if (kind === "email") return `mailto:${clean}`;
  if (kind === "whatsapp") return `https://wa.me/${onlyDigits(clean)}`;
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
  const handle = clean.replace(/^@/, "");
  if (kind === "instagram") return `https://instagram.com/${handle}`;
  if (kind === "facebook") return `https://facebook.com/${handle}`;
  return `https://tiktok.com/@${handle}`;
}

function buttonClass(style: string) {
  if (style === "pill") return "rounded-full";
  if (style === "square") return "rounded-none";
  if (style === "outline") return "rounded-xl border-2 bg-transparent";
  return "rounded-xl";
}

function readableText(hex: string) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 170 ? "#111827" : "#ffffff";
}

function ProductImage({ image, name, className = "", fit = "cover" }: { image: string | null; name: string; className?: string; fit?: "cover" | "contain" }) {
  return image ? (
    <img src={image} alt={name} className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"} ${className}`} />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-gray-100">
      <Package className="h-10 w-10 text-gray-300" />
    </div>
  );
}

type PageBlock = { id: string; type: string; props: Record<string, string | number | boolean> };

function parseBlocks(pageBlocks: string): PageBlock[] {
  try {
    const parsed = JSON.parse(pageBlocks || "[]");
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.blocks)) return parsed.blocks;
    return [];
  } catch {
    return [];
  }
}

function parseModalConfig(pageBlocks: string): { sizeChart: boolean; sizeChartTitle: string; showReels: boolean; reelUrls: string[]; buttonText: string; accentColor: string; showDescription: boolean; showColors: boolean; showReviews: boolean } {
  try {
    const parsed = JSON.parse(pageBlocks || "[]");
    const mc = parsed?.modalConfig || {};
    return {
      sizeChart: Boolean(mc.sizeChart),
      sizeChartTitle: mc.sizeChartTitle || "Tabla de talles",
      showReels: Boolean(mc.showReels),
      reelUrls: parseReelUrls(mc.reelUrls),
      buttonText: mc.buttonText || "Agregar al carrito",
      accentColor: mc.accentColor || "",
      showColors: mc.showColors !== false,
      showDescription: mc.showDescription !== false,
      showReviews: mc.showReviews !== false,
    };
  } catch {
    return { sizeChart: false, sizeChartTitle: "Tabla de talles", showReels: false, reelUrls: [], buttonText: "Agregar al carrito", accentColor: "", showDescription: true, showColors: true, showReviews: true };
  }
}

function getViewportFromWidth(width: number): PreviewViewport {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function getViewportTextPositions(props: Record<string, any>, viewport: PreviewViewport): Record<string, TextPosition> {
  const all = props.textPositions;
  if (!all || typeof all !== "object") return {};
  const current = all[viewport];
  return current && typeof current === "object" ? current : {};
}

function PositionedTextLayer({
  blockProps,
  viewport,
  items,
  style,
  className = "",
}: {
  blockProps: Record<string, any>;
  viewport: PreviewViewport;
  items: PositionedTextItem[];
  style?: CSSProperties;
  className?: string;
}) {
  const stored = getViewportTextPositions(blockProps, viewport);
  const desktopFallback = viewport !== "desktop" ? getViewportTextPositions(blockProps, "desktop") : {};

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {items.map((item) => {
        const pos = stored[item.id] ?? desktopFallback[item.id] ?? item.defaultPos;
        return (
          <div
            key={item.id}
            className={item.className}
            style={{
              position: "absolute",
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: "translate(-50%, -50%)",
              ...item.style,
            }}
          >
            {item.content}
          </div>
        );
      })}
    </div>
  );
}

function isLightHex(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

function ContactBlock({ storeSlug, p, primaryColor, fontFamily }: { storeSlug: string; p: Record<string, unknown>; primaryColor: string; fontFamily: string }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const heading = String(p.heading || "Contacto");
  const subtitle = String(p.subtitle || "¿Tenés alguna pregunta? Escribinos.");
  const bgColor = String(p.bgColor || "#111827");
  const bgImage = String(p.bgImage || "");
  const isLight = !bgImage && isLightHex(bgColor);
  const textColor = String(p.textColor || (isLight ? "#111827" : "#ffffff"));
  const btnColor = String(p.buttonColor || primaryColor);
  const btnText = String(p.buttonText || "Enviar mensaje");
  const showName = p.showName !== false;
  const showEmail = p.showEmail !== false;
  const showPhone = Boolean(p.showPhone);
  const showMessage = p.showMessage !== false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/public/${storeSlug}/contacto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error al enviar");
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Error al enviar el mensaje");
    }
  }

  const inputCls = isLight
    ? "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
    : "w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:border-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 backdrop-blur";

  return (
    <section style={{ fontFamily, backgroundColor: bgColor, color: textColor, position: "relative" }}>
      {bgImage && (
        <img src={bgImage} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.35 }} />
      )}
      <div style={{ position: "relative", maxWidth: "640px", margin: "0 auto", padding: "64px 24px" }}>
        <h2 style={{ fontSize: p.headingSize==="sm"?"22px":p.headingSize==="md"?"28px":p.headingSize==="lg"?"34px":"clamp(28px,4vw,44px)", fontWeight: 900, color: textColor, margin: "0 0 8px", textAlign: "center" }}>{heading}</h2>
        {subtitle && <p style={{ textAlign: "center", opacity: 0.75, marginBottom: "32px", fontSize: "15px" }}>{subtitle}</p>}

        {status === "success" ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>✅</div>
            <p style={{ fontSize: "18px", fontWeight: 700, color: textColor }}>¡Mensaje enviado!</p>
            <p style={{ opacity: 0.7, marginTop: "6px" }}>Te respondemos a la brevedad.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {showName && (
              <input className={inputCls} type="text" placeholder="Nombre completo" value={form.name} required
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            )}
            {showEmail && (
              <input className={inputCls} type="email" placeholder="Email" value={form.email} required
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            )}
            {showPhone && (
              <input className={inputCls} type="tel" placeholder="Teléfono" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            )}
            {showMessage && (
              <textarea className={inputCls} placeholder="Tu mensaje" value={form.message} rows={4} required
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))} style={{ resize: "none" }} />
            )}
            {status === "error" && <p style={{ color: "#fca5a5", fontSize: "13px" }}>{errorMsg}</p>}
            <button type="submit" disabled={status === "loading"}
              style={{ marginTop: "4px", backgroundColor: btnColor, color: "#fff", border: "none", borderRadius: "999px", padding: "14px 32px", fontSize: "15px", fontWeight: 800, cursor: "pointer", opacity: status === "loading" ? 0.7 : 1 }}>
              {status === "loading" ? "Enviando..." : btnText}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function isStarterBlocks(blocks: PageBlock[]) {
  if (blocks.length !== 3) return false;
  const [hero, text, products] = blocks;
  return (
    hero?.type === "hero" &&
    text?.type === "text" &&
    products?.type === "products" &&
    hero.props.title === "¡Bienvenidos a mi tienda!" &&
    text.props.heading === "Sobre nosotros" &&
    products.props.heading === "Nuestros productos"
  );
}

export default function StorefrontClient({
  store,
  affiliateId,
  initialProductId,
  userId,
  initialFavoriteIds = [],
  isPwa = false,
}: {
  store: Store;
  affiliateId?: string;
  initialProductId?: string;
  userId?: string;
  initialFavoriteIds?: string[];
  isPwa?: boolean;
}) {
  const [splashVisible, setSplashVisible] = useState(isPwa);
  const [splashFading, setSplashFading] = useState(false);
  const [splashMounted, setSplashMounted] = useState(false);

  useEffect(() => {
    if (!isPwa) return;
    const mountTimer = setTimeout(() => setSplashMounted(true), 50);
    const fadeTimer = setTimeout(() => setSplashFading(true), 1700);
    const hideTimer = setTimeout(() => setSplashVisible(false), 2250);
    return () => { clearTimeout(mountTimer); clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, [isPwa]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [imgIndex, setImgIndex] = useState(0);
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});
  const [selectionError, setSelectionError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const panRef = useRef<{ active: boolean; moved: boolean; startX: number; startY: number; originX: number; originY: number }>({ active: false, moved: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const touchStartX = useRef(0);
  const reelsRef = useRef<HTMLDivElement>(null);
  const reelsDrag = useRef({ isDown: false, startX: 0, scrollLeft: 0, hasMoved: false });
  const dropdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [productReviews, setProductReviews] = useState<{ id: string; rating: number; comment: string | null; createdAt: string; user: { name: string | null; image: string | null } }[]>([]);
  const [reviewsAvg, setReviewsAvg] = useState(0);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [eligibleOrderId, setEligibleOrderId] = useState<string | null>(null);
  const [userReview, setUserReview] = useState<{ id: string; rating: number; comment: string | null } | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [viewport, setViewport] = useState<PreviewViewport>("desktop");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [openCart, setOpenCart] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [expandedDrawerItem, setExpandedDrawerItem] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [subcategory, setSubcategory] = useState("all");
  const [shippingMethod, setShippingMethod] = useState(SHIPPING_OPTIONS[0].id);
  const paymentOptions = store.mpConnected
    ? [...PAYMENT_OPTIONS, { id: "mercadopago", label: "Pagar con MercadoPago (tarjeta / débito / MP)" }]
    : PAYMENT_OPTIONS;
  const [paymentProvider, setPaymentProvider] = useState(PAYMENT_OPTIONS[0].id);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set(initialFavoriteIds));
  const [togglingFav, setTogglingFav] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer>({
    name: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    province: "",
    postalCode: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [successOrderId, setSuccessOrderId] = useState("");
  const [highlightProductId, setHighlightProductId] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discount: number } | null>(null);
  const [saveCustomerData, setSaveCustomerData] = useState(false);

  type NavLink = { id: string; label: string; type: "filter" | "url" | "section"; value: string };
  type NavConfig = { layout: "right" | "center"; showSearch: boolean; links: NavLink[]; mode?: "links" | "hamburger"; bgColor?: string; textColor?: string; searchStyle?: "icon" | "bar"; };

  const categories = useMemo(() => [...new Set(store.products.map((p) => p.category).filter(Boolean))], [store.products]);
  const subcategories = useMemo(
    () => [
      ...new Set(
        store.products
          .filter((product) => category === "all" || product.category === category)
          .map((product) => product.subcategory)
          .filter(Boolean)
      ),
    ] as string[],
    [category, store.products]
  );
  const products = store.products.filter((product) => {
    if (category !== "all" && product.category !== category) return false;
    if (subcategory !== "all" && product.subcategory !== subcategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!product.name.toLowerCase().includes(q) && !(product.description || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function getSubsForCategory(cat: string): string[] {
    if (!cat || cat === "all") return [];
    return [...new Set(store.products.filter(p => p.category === cat).map(p => p.subcategory).filter(Boolean))] as string[];
  }
  function effectivePrice(item: CartItem): number {
    if (item.precioMayorista && item.cantMinMayorista && item.quantity >= item.cantMinMayorista) {
      return item.precioMayorista;
    }
    return item.price;
  }
  const subtotal = cart.reduce((sum, item) => sum + effectivePrice(item) * item.quantity, 0);
  const shipping = SHIPPING_OPTIONS.find((option) => option.id === shippingMethod) ?? SHIPPING_OPTIONS[0];
  const couponDiscount = appliedCoupon ? Math.min(appliedCoupon.discount, subtotal) : 0;
  const total = subtotal - couponDiscount + shipping.cost;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const firstProducts = store.products.slice(0, 3).map((product) => ({ product, image: parseImages(product.images)[0]?.url ?? null }));
  const heroImage = store.banner || firstProducts[0]?.image || null;
  const textColor = readableText(store.primaryColor);
  const isInquiry = getStoreType(store.tipoTienda || "GENERAL").checkoutMode === "inquiry";

  function consultarWhatsApp(product: Product) {
    const num = (store.whatsappNumber || "").replace(/\D/g, "");
    if (!num) return;
    const precio = money(product.price, store.currency);
    const msg = encodeURIComponent(`Hola! Me interesa: ${product.name} - ${precio}. ¿Está disponible?`);

    // Registrar lead en background (no bloquea la apertura de WhatsApp)
    if (affiliateId) {
      fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id,
          affiliateId,
          productId: product.id,
          productName: product.name,
          productPrice: product.price,
        }),
      }).catch(() => {});
    }

    window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
  }
  const isDark = store.templateId === "tech";
  const isKids = store.templateId === "kids";
  function hexIsDark(hex: string): boolean {
    const h = hex.replace("#", "");
    if (h.length < 6) return false;
    const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
    return (r*299 + g*587 + b*114) / 1000 < 128;
  }
  const isSplit = ["fashion", "luxury", "boutique"].includes(store.templateId);
  const isMarket = store.templateId === "market";
  const isColorful = store.templateId === "colorful" || store.templateId === "kids";
  const pageBlocks = useMemo(() => parseBlocks(store.pageBlocks), [store.pageBlocks]);
  const modalCfg = useMemo(() => parseModalConfig(store.pageBlocks), [store.pageBlocks]);
  const contentBlocks = isStarterBlocks(pageBlocks) ? [] : pageBlocks;
  const navbarBlock = contentBlocks.find(b => b.type === "navbar") ?? null;
  const navConfig = useMemo<NavConfig>(() => {
    if (navbarBlock?.props?.navConfig) {
      try {
        const parsed = JSON.parse(String(navbarBlock.props.navConfig));
        if (Array.isArray(parsed)) return { layout: "right", showSearch: false, links: parsed };
        return { layout: parsed.layout || "right", showSearch: Boolean(parsed.showSearch), links: Array.isArray(parsed.links) ? parsed.links : [], mode: parsed.mode || undefined, bgColor: parsed.bgColor || undefined, textColor: parsed.textColor || undefined, searchStyle: parsed.searchStyle || undefined };
      } catch {}
    }
    try {
      const parsed = JSON.parse(store.navLinks || "[]");
      if (Array.isArray(parsed)) return { layout: "right", showSearch: false, links: parsed };
      return { layout: parsed.layout || "right", showSearch: Boolean(parsed.showSearch), links: Array.isArray(parsed.links) ? parsed.links : [], mode: parsed.mode || undefined, bgColor: parsed.bgColor || undefined, textColor: parsed.textColor || undefined, searchStyle: parsed.searchStyle || undefined };
    } catch { return { layout: "right", showSearch: false, links: [] }; }
  }, [navbarBlock, store.navLinks]);
  const parsedNavLinks = navConfig.links;
  // Smart hover: adapt to nav background color (custom or template-based)
  const navBgIsDark = navConfig.bgColor ? hexIsDark(navConfig.bgColor) : isDark;
  const navHoverBg = navBgIsDark ? "hover:bg-white/10" : "hover:bg-black/10";
  const sectionBlockIds = useMemo(() => {
    const ids = new Set<string>();
    parsedNavLinks.filter(l => l.type === "section").forEach(l => {
      try {
        const parsed = JSON.parse(l.value || "[]");
        if (Array.isArray(parsed)) parsed.forEach((id: string) => ids.add(id));
        else ids.add(l.value);
      } catch { if (l.value) ids.add(l.value); }
    });
    return ids;
  }, [parsedNavLinks]);
  const openSectionBlocks = useMemo(() => {
    if (!openSection) return [];
    try {
      const ids = JSON.parse(openSection);
      if (Array.isArray(ids)) return ids.map((id: string) => contentBlocks.find(b => b.id === id)).filter(Boolean) as typeof contentBlocks;
    } catch {}
    const b = contentBlocks.find(b => b.id === openSection);
    return b ? [b] : [];
  }, [openSection, contentBlocks]);
  const hasCustomHeroBlock = contentBlocks.some((block) => block.type === "hero");
  const hasCustomProductBlock = contentBlocks.some((block) => block.type === "products");
  const cardRadius = RADIUS[store.cardRadius] ?? RADIUS.md;
  const cardShadow = SHADOW[store.cardShadow] ?? SHADOW.sm;
  const buttonRadius = buttonClass(store.buttonStyle);
  const productGrid = GRID[store.productLayout] ?? GRID.grid3;

  useEffect(() => {
    const handleResize = () => setViewport(getViewportFromWidth(window.innerWidth));
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function openProduct(product: Product) {
    setSelectedProduct(product);
    setImgIndex(0);
    setSelectedAttrs({});
    setSelectionError(false);
    setZoomLevel(1);
  }

  function closeProduct() {
    setSelectedProduct(null);
    setImgIndex(0);
    setSelectedAttrs({});
    setSelectionError(false);
    setZoomLevel(1);
  }

  function selectAttr(groupName: string, value: string) {
    if (!selectedProduct) return;
    setSelectionError(false);

    // Toggle off if ya seleccionado
    if (selectedAttrs[groupName] === value) {
      const next = { ...selectedAttrs };
      delete next[groupName];
      setSelectedAttrs(next);
      return;
    }

    const next = { ...selectedAttrs, [groupName]: value };

    // Auto-seleccionar otros grupos si solo queda 1 opción disponible
    const groupKeys = new Set<string>();
    selectedProduct.variants.forEach((v) =>
      parseVariantAttrs(v).forEach((p) => { if (p.value) groupKeys.add(p.name); })
    );
    groupKeys.forEach((otherGroup) => {
      if (otherGroup === groupName || next[otherGroup]) return;
      const avail = new Set<string>();
      selectedProduct.variants
        .filter((v) => {
          if (v.stock === 0) return false;
          const va = Object.fromEntries(parseVariantAttrs(v).map((p) => [p.name, p.value]));
          return Object.entries(next).every(([k, val]) => va[k] === val);
        })
        .forEach((v) => {
          const val = parseVariantAttrs(v).find((p) => p.name === otherGroup)?.value;
          if (val) avail.add(val);
        });
      if (avail.size === 1) next[otherGroup] = [...avail][0];
    });

    setSelectedAttrs(next);

    // Cambiar imagen si es atributo de color
    const isColor = groupName.toLowerCase().includes("color") || groupName.toLowerCase().includes("tono");
    if (isColor && selectedProduct) {
      const imgs = parseImages(selectedProduct.images);
      const idx = imgs.findIndex((img) => img.variantValue === value);
      if (idx !== -1) showImage(idx);
    }
  }

  function addSpecificVariantToCart(product: Product, variant: Product["variants"][0]) {
    const imgs = parseImages(product.images);
    const price = variant.price ?? product.price;
    const variantId = variant.id;
    const maxStock = variant.stock;
    const key = `${product.id}:${variantId}`;
    const colorAttr = parseVariantAttrs(variant).find(
      (p) => p.name.toLowerCase().includes("color") || p.name.toLowerCase().includes("tono")
    );
    const assignedImg = colorAttr ? imgs.find((img) => img.variantValue === colorAttr.value) : null;
    const image = assignedImg?.url ?? imgs[0]?.url ?? null;

    setCart((prev) => {
      const existing = prev.find((item) => `${item.productId}:${item.variantId ?? "base"}` === key);
      if (existing) {
        return prev.map((item) =>
          `${item.productId}:${item.variantId ?? "base"}` === key
            ? { ...item, quantity: maxStock ? Math.min(item.quantity + 1, maxStock) : item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          variantId,
          name: product.name,
          variantLabel: parseVariantAttrs(variant).filter((p) => p.value).map((p) => `${p.name}: ${p.value}`).join(", "),
          price,
          precioMayorista: product.precioMayorista ?? null,
          cantMinMayorista: product.cantMinMayorista ?? null,
          quantity: product.cantMinMayorista ?? 1,
          maxStock,
          image,
        },
      ];
    });
    setOpenCart(true);
  }

  function showImage(index: number) {
    setImgIndex(index);
    setZoomLevel(1);
    setPanX(0);
    setPanY(0);
  }

  useEffect(() => {
    if (!selectedProduct) return;
    setReviewsLoading(true);
    setProductReviews([]);
    setCanReview(false);
    setEligibleOrderId(null);
    setUserReview(null);
    setReviewRating(0);
    setReviewComment("");
    setReviewError("");
    setReviewSuccess(false);
    fetch(`/api/reviews?productId=${selectedProduct.id}`)
      .then((r) => r.json())
      .then((data) => {
        setProductReviews(data.reviews || []);
        setReviewsAvg(data.avg || 0);
        setReviewsTotal(data.total || 0);
        setCanReview(data.canReview || false);
        setEligibleOrderId(data.eligibleOrderId || null);
        setUserReview(data.userReview || null);
        setReviewsLoading(false);
      })
      .catch(() => setReviewsLoading(false));
  }, [selectedProduct?.id]);

  async function submitReview() {
    if (!selectedProduct || !eligibleOrderId || reviewRating === 0) return;
    setReviewSubmitting(true);
    setReviewError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProduct.id, orderId: eligibleOrderId, rating: reviewRating, comment: reviewComment.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewError(data.error || "No se pudo enviar la reseña");
      } else {
        setReviewSuccess(true);
        setCanReview(false);
        setUserReview({ id: data.id, rating: reviewRating, comment: reviewComment.trim() || null });
        setProductReviews((prev) => [data, ...prev]);
        setReviewsTotal((prev) => prev + 1);
        setReviewsAvg((prev) => {
          const newTotal = reviewsTotal + 1;
          return Math.round(((prev * reviewsTotal + reviewRating) / newTotal) * 10) / 10;
        });
      }
    } catch {
      setReviewError("No se pudo enviar la reseña");
    } finally {
      setReviewSubmitting(false);
    }
  }

  useEffect(() => {
    if (!initialProductId) return;
    const product = store.products.find((item) => item.id === initialProductId);
    if (!product) return;

    setCategory(product.category || "all");
    setSubcategory(product.subcategory || "all");
    setHighlightProductId(product.id);

    const timer = window.setTimeout(() => {
      document.getElementById(`producto-${product.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    const clearHighlight = window.setTimeout(() => setHighlightProductId(null), 3800);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clearHighlight);
    };
  }, [initialProductId, store.products]);

  useEffect(() => {
    if (subcategory !== "all" && !subcategories.includes(subcategory)) {
      setSubcategory("all");
    }
  }, [subcategory, subcategories]);

  // Cargar carrito guardado al montar
  useEffect(() => {
    const saved = localStorage.getItem(`tiendaapps_cart_${store.id}`);
    if (!saved) return;
    try {
      const items: CartItem[] = JSON.parse(saved);
      const valid = items.filter((item) => store.products.some((p) => p.id === item.productId));
      if (valid.length > 0) setCart(valid);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistir carrito cuando cambia
  useEffect(() => {
    const key = `tiendaapps_cart_${store.id}`;
    if (cart.length > 0) {
      localStorage.setItem(key, JSON.stringify(cart));
    } else {
      localStorage.removeItem(key);
    }
  }, [cart, store.id]);

  // Pre-llenar datos del comprador desde la última compra
  useEffect(() => {
    const saved = localStorage.getItem("tiendaapps_customer");
    if (!saved) return;
    try {
      setCustomer(JSON.parse(saved));
      setSaveCustomerData(true);
    } catch {}
  }, []);

  function updateCustomer(field: keyof Customer, value: string) {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  }

  async function toggleFavorite(productId: string) {
    if (!userId) { window.location.href = `/login?redirect=/tienda/${store.slug}`; return; }
    if (togglingFav === productId) return;
    setTogglingFav(productId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });
    try {
      await fetch("/api/favoritos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
    } catch {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.has(productId) ? next.delete(productId) : next.add(productId);
        return next;
      });
    } finally {
      setTogglingFav(null);
    }
  }

  function addToCart(product: Product) {
    const variant = product.variants.find((item) => item.stock > 0) ?? product.variants[0];
    const images = parseImages(product.images);
    const price = variant?.price ?? product.price;
    const variantId = variant?.id ?? null;
    const maxStock = variant ? variant.stock : null;
    const key = `${product.id}:${variantId ?? "base"}`;

    setCart((prev) => {
      const existing = prev.find((item) => `${item.productId}:${item.variantId ?? "base"}` === key);
      if (existing) {
        return prev.map((item) =>
          `${item.productId}:${item.variantId ?? "base"}` === key
            ? { ...item, quantity: maxStock ? Math.min(item.quantity + 1, maxStock) : item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          variantId,
          name: product.name,
          variantLabel: variant ? parseVariantAttrs(variant).filter(p => p.value).map(p => `${p.name}: ${p.value}`).join(", ") : null,
          price,
          precioMayorista: product.precioMayorista ?? null,
          cantMinMayorista: product.cantMinMayorista ?? null,
          quantity: product.cantMinMayorista ?? 1,
          maxStock,
          image: images[0]?.url ?? null,
        },
      ];
    });
    setOpenCart(true);
  }

  function changeQty(productId: string, variantId: string | null, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId || item.variantId !== variantId) return item;
          const next = item.maxStock ? Math.min(item.quantity + delta, item.maxStock) : item.quantity + delta;
          const min = item.cantMinMayorista ?? 1;
          // Si baja del mínimo mayorista, va a 0 (se elimina del carrito)
          const clamped = next < min && next > 0 ? 0 : next;
          return { ...item, quantity: clamped };
        })
        .filter((item) => item.quantity > 0)
    );
  }

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError("");
    const res = await fetch("/api/cupones/validar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, storeId: store.id, subtotal }),
    });
    const data = await res.json();
    setCouponLoading(false);
    if (!res.ok) { setCouponError(data.error || "Cupón inválido"); return; }
    setAppliedCoupon({ id: data.coupon.id, code: data.coupon.code, discount: data.discount });
    setCouponInput("");
  }

  async function submitCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!cart.length) return;

    setSubmitting(true);
    setCheckoutError("");
    setSuccessOrderId("");

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: store.id,
        affiliateId,
        couponId: appliedCoupon?.id ?? null,
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        customer,
        shippingMethod,
        paymentProvider,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setSubmitting(false);
      setCheckoutError(data.error || "No se pudo crear el pedido");
      return;
    }

    // Si eligió MercadoPago, crear preferencia y redirigir
    if (paymentProvider === "mercadopago") {
      const mpRes = await fetch("/api/mp/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.order.id }),
      });
      const mpData = await mpRes.json();
      setSubmitting(false);
      if (!mpRes.ok) {
        setCheckoutError(mpData.error || "No se pudo iniciar el pago con MercadoPago");
        return;
      }
      window.location.href = mpData.initPoint;
      return;
    }

    setSubmitting(false);
    setSuccessOrderId(data.order.id);
    setCart([]);
    setAppliedCoupon(null);
    setCouponInput("");
    localStorage.removeItem(`tiendaapps_cart_${store.id}`);
    if (saveCustomerData) {
      localStorage.setItem("tiendaapps_customer", JSON.stringify({ ...customer, notes: "" }));
    } else {
      localStorage.removeItem("tiendaapps_customer");
    }
  }

  function renderHero() {
    if (store.heroStyle === "minimal") {
      return (
        <section className={`border-b ${isDark ? "border-white/10 bg-gray-950 text-white" : "border-gray-100 bg-white text-gray-950"}`}>
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-12 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: store.accentColor }}>{store.tagline || "Nueva coleccion"}</p>
              <h1 className="mt-2 text-4xl font-black md:text-6xl">{store.name}</h1>
              {store.description && <p className={`mt-3 max-w-2xl text-base ${isDark ? "text-gray-300" : "text-gray-500"}`}>{store.description}</p>}
            </div>
            <a href="#productos" className={`inline-flex items-center justify-center px-5 py-3 text-sm font-bold ${buttonRadius}`} style={{ backgroundColor: store.primaryColor, color: textColor }}>
              Ver productos
            </a>
          </div>
        </section>
      );
    }

    if (isKids) {
      return (
        <section className="px-3 pt-3">
          <div
            className="relative mx-auto flex min-h-[260px] max-w-7xl flex-col items-center justify-center overflow-hidden rounded-[36px] px-6 py-12 text-center text-white shadow-sm md:min-h-[340px]"
            style={{
              background: heroImage
                ? `linear-gradient(rgba(0,0,0,.18),rgba(0,0,0,.18)), url(${heroImage}) center/cover`
                : `linear-gradient(135deg, ${store.primaryColor}, ${store.accentColor})`,
            }}
          >
            <span className="mb-2 text-5xl drop-shadow-lg">🎀</span>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] opacity-75">{store.tagline || "Para los mas peques"}</p>
            <h1 className="max-w-3xl text-4xl font-black drop-shadow md:text-6xl">{store.name}</h1>
            {store.description && <p className="mt-3 max-w-xl text-sm font-semibold text-white/80 md:text-base">{store.description}</p>}
            <a href="#productos" className="mt-6 rounded-full bg-white px-7 py-3 text-sm font-black shadow-lg" style={{ color: store.primaryColor }}>
              ¡Ver todo!
            </a>
            <div className="absolute left-6 top-6 text-3xl opacity-60">✨</div>
            <div className="absolute right-7 top-8 text-2xl opacity-60">🌈</div>
          </div>
        </section>
      );
    }

    if (isSplit) {
      return (
        <section className={`${isDark ? "bg-gray-950 text-white" : "bg-white text-gray-950"}`}>
          <div className="mx-auto grid min-h-[520px] max-w-7xl md:grid-cols-[0.95fr_1.05fr]">
            <div className="flex flex-col justify-center px-6 py-14 md:px-12">
              <div className="mb-5 h-1.5 w-20" style={{ backgroundColor: store.accentColor }} />
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: store.primaryColor }}>
                {store.tagline || "Tienda online"}
              </p>
              <h1 className="text-5xl font-black leading-[0.95] md:text-7xl">{store.name}</h1>
              {store.description && <p className={`mt-6 max-w-xl text-lg leading-8 ${isDark ? "text-gray-300" : "text-gray-600"}`}>{store.description}</p>}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a href="#productos" className={`px-6 py-3 text-sm font-bold ${buttonRadius}`} style={{ backgroundColor: store.primaryColor, color: textColor }}>
                  Comprar ahora
                </a>
                <span className="text-sm font-semibold">{store.products.length} productos activos</span>
              </div>
            </div>
            <div className="grid min-h-[360px] grid-cols-2 gap-3 p-4 md:min-h-full">
              <div className="col-span-2 overflow-hidden rounded-[32px] md:col-span-1">
                <ProductImage image={heroImage} name={store.name} />
              </div>
              <div className="grid gap-3">
                <div className="overflow-hidden rounded-[24px]">
                  <ProductImage image={firstProducts[1]?.image ?? heroImage} name={firstProducts[1]?.product.name ?? store.name} />
                </div>
                <div className="overflow-hidden rounded-[24px]" style={{ backgroundColor: store.secondaryColor }}>
                  <ProductImage image={firstProducts[2]?.image ?? null} name={firstProducts[2]?.product.name ?? store.name} />
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="relative overflow-hidden text-center" style={{ backgroundColor: store.primaryColor, color: textColor }}>
        {heroImage && <img src={heroImage} alt={store.name} className="absolute inset-0 h-full w-full object-cover opacity-30" />}
        <div className="relative mx-auto flex min-h-[420px] max-w-4xl flex-col items-center justify-center px-6 py-16">
          {store.logo && <img src={store.logo} alt={store.name} className="mb-5 h-20 w-20 rounded-2xl object-cover ring-4 ring-white/30" />}
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] opacity-80">{store.tagline || "Tienda online"}</p>
          <h1 className="text-5xl font-black md:text-7xl">{store.name}</h1>
          {store.description && <p className="mt-5 max-w-2xl text-lg opacity-85">{store.description}</p>}
          <a href="#productos" className={`mt-8 bg-white px-6 py-3 text-sm font-bold ${buttonRadius}`} style={{ color: store.primaryColor }}>
            Ver coleccion
          </a>
        </div>
      </section>
    );
  }

  function renderProductCard(product: Product, index: number) {
    const images = parseImages(product.images);
    const image = images[0]?.url ?? null;
    const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
    const hasDiscount = product.comparePrice && product.comparePrice > product.price;
    const available = product.variants.length === 0 || totalStock > 0;
    const list = store.productLayout === "list";
    const featured = store.templateId === "boutique" && index === 0 && !list;

    if (isKids && !list) {
      const emoji = ["🦄", "⭐", "🎀", "🌈", "🎉", "🍭"][index % 6];
      const bg = [`${store.primaryColor}18`, `${store.accentColor}18`, "#fce7f3", "#ede9fe", "#dcfce7", "#fff7ed"][index % 6];

      return (
        <article
          id={`producto-${product.id}`}
          key={product.id}
          className="relative flex h-full flex-col overflow-hidden rounded-[28px] border-2 border-white bg-white text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
        >
          {highlightProductId === product.id && (
            <div className="absolute inset-0 rounded-[28px] border-[3px] border-indigo-400 pointer-events-none z-20 shadow-[0_0_0_4px_rgba(99,102,241,0.15)]" />
          )}
          <div className="relative aspect-square max-h-72 p-3 shrink-0" style={{ backgroundColor: bg }}>
            <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-20">{emoji}</div>
            <div className="relative h-full overflow-hidden rounded-[22px] cursor-pointer" onClick={() => openProduct(product)}>
              <ProductImage image={image} name={product.name} fit="contain" className="transition duration-500 hover:scale-105" />
            </div>
            {hasDiscount && <span className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-black text-white" style={{ backgroundColor: store.accentColor }}>OFERTA ✨</span>}
            <button
              onClick={() => toggleFavorite(product.id)}
              aria-label={favoriteIds.has(product.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
              className="absolute right-3 top-3 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
            >
              <Heart className={`h-4 w-4 transition-colors ${favoriteIds.has(product.id) ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
            </button>
            {!available && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-gray-500">Sin stock</span>
              </div>
            )}
          </div>
          <div className="p-4 flex flex-col flex-1">
            <p className="text-base font-black leading-tight text-gray-950">{product.name}</p>
            {product.description && <p className="mt-1 line-clamp-2 text-sm text-gray-500">{product.description}</p>}
            {(() => {
              const colorPairs = product.variants.flatMap(v => {
                return parseVariantAttrs(v)
                  .filter(p => p.name.toLowerCase().includes("color") || p.name.toLowerCase().includes("tono"))
                  .map(p => ({ id: `${v.id}:${p.name}:${p.value}`, value: p.value, stock: v.stock }));
              }).filter((item, idx, arr) => arr.findIndex(x => x.value === item.value) === idx);
              if (colorPairs.length === 0) return null;
              return (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {colorPairs.slice(0, 8).map((v) => {
                    const bg = variantToColor(v.value);
                    return bg
                      ? <span key={v.id} title={v.value} className={`h-4 w-4 rounded-full border border-white ring-1 ring-gray-200 shrink-0 inline-block ${v.stock === 0 ? "opacity-30" : ""}`} style={{ backgroundColor: bg }} />
                      : <span key={v.id} className={`rounded-full border border-gray-200 px-1.5 text-[10px] text-gray-600 ${v.stock === 0 ? "opacity-30 line-through" : ""}`}>{v.value}</span>;
                  })}
                </div>
              );
            })()}
            {store.showPrices && <p className="mt-2 text-lg font-black" style={{ color: store.primaryColor }}>{money(product.price, store.currency)}</p>}
            {store.showStock && product.variants.length > 0 && <p className={`mt-1 text-xs font-semibold ${available ? "text-emerald-600" : "text-red-500"}`}>{available ? `${totalStock} disponibles` : "Sin stock"}</p>}
            {isInquiry ? (
              <button
                type="button"
                onClick={() => consultarWhatsApp(product)}
                disabled={!store.whatsappNumber}
                className="mt-auto flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-base font-black text-white transition disabled:opacity-40"
                style={{ backgroundColor: "#25D366" }}
              >
                <MessageCircle className="h-4 w-4" />
                Consultar
              </button>
            ) : (
              <button
                type="button"
                disabled={!available}
                onClick={() => addToCart(product)}
                className="mt-auto flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-base font-black text-white transition disabled:opacity-40"
                style={{ backgroundColor: store.primaryColor }}
              >
                <ShoppingBag className="h-4 w-4" />
                {!available ? "Sin stock" : "¡Lo quiero!"}
              </button>
            )}
          </div>
        </article>
      );
    }

    return (
      <article
        id={`producto-${product.id}`}
        key={product.id}
        className={`relative flex h-full flex-col ${featured ? "sm:col-span-2 sm:row-span-2" : ""} ${list ? "grid grid-cols-[150px_1fr] md:grid-cols-[220px_1fr]" : ""} overflow-hidden border transition duration-300 hover:-translate-y-0.5 ${cardRadius} ${cardShadow} ${
          isDark ? "border-white/10 bg-white/5 text-white" : "border-gray-100 bg-white text-gray-950"
        }`}
      >
        {highlightProductId === product.id && (
          <div className={`absolute inset-0 border-[3px] border-indigo-400 pointer-events-none z-20 shadow-[0_0_0_4px_rgba(99,102,241,0.15)] ${cardRadius}`} />
        )}
        <div className={`${list ? "h-full min-h-40" : featured ? "aspect-[4/3]" : "aspect-square max-h-72"} relative overflow-hidden shrink-0 ${isColorful ? "p-2" : ""}`} style={{ backgroundColor: store.secondaryColor }}>
          <div className={`h-full w-full overflow-hidden cursor-pointer ${isColorful ? "rounded-2xl" : ""}`} onClick={() => openProduct(product)}>
            <ProductImage image={image} name={product.name} fit="contain" className="transition duration-500 hover:scale-105" />
          </div>
          {hasDiscount && <span className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-black text-white" style={{ backgroundColor: store.accentColor }}>OFERTA</span>}
          <button
            onClick={() => toggleFavorite(product.id)}
            aria-label={favoriteIds.has(product.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
            className="absolute right-2 top-2 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          >
            <Heart className={`h-4 w-4 transition-colors ${favoriteIds.has(product.id) ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
          </button>
          {!available && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/35">
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-700">Sin stock</span>
            </div>
          )}
        </div>
        <div className={`${featured ? "p-6" : "p-4"} flex flex-col flex-1`}>
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`${featured ? "text-2xl" : "text-base"} font-black leading-tight break-words`}>{product.name}</p>
              {product.description && <p className={`mt-1 line-clamp-2 text-sm ${isDark ? "text-gray-300" : "text-gray-500"}`}>{product.description}</p>}
            </div>
            {store.showRatings && (
              <div className="flex shrink-0 gap-0.5 pt-1 text-yellow-400">
                {[1, 2, 3, 4, 5].map((item) => <Star key={item} className="h-3 w-3 fill-current" />)}
              </div>
            )}
          </div>
          {store.showPrices && (
            <div className="flex items-center gap-2">
              <span className="text-lg font-black">{money(product.price, store.currency)}</span>
              {hasDiscount && <span className={`text-sm line-through ${isDark ? "text-gray-500" : "text-gray-400"}`}>{money(product.comparePrice!, store.currency)}</span>}
            </div>
          )}
          {store.showStock && product.variants.length > 0 && (
            <p className={`mt-1 text-xs font-semibold ${available ? "text-emerald-600" : "text-red-500"}`}>{available ? `${totalStock} disponibles` : "Sin stock"}</p>
          )}
          {(() => {
            const colorPairs = product.variants.flatMap(v => {
              return parseVariantAttrs(v)
                .filter(p => p.name.toLowerCase().includes("color") || p.name.toLowerCase().includes("tono"))
                .map(p => ({ id: `${v.id}:${p.name}:${p.value}`, value: p.value, stock: v.stock }));
            }).filter((item, idx, arr) => arr.findIndex(x => x.value === item.value) === idx);
            const otherPairs = product.variants.flatMap(v => {
              return parseVariantAttrs(v)
                .filter(p => !p.name.toLowerCase().includes("color") && !p.name.toLowerCase().includes("tono"))
                .map(p => ({ id: `${v.id}:${p.name}:${p.value}`, value: p.value, stock: v.stock }));
            }).filter((item, idx, arr) => arr.findIndex(x => x.value === item.value) === idx);
            return (
              <>
                {colorPairs.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {colorPairs.slice(0, 8).map((v) => {
                      const bg = variantToColor(v.value);
                      return bg
                        ? <span key={v.id} title={v.value} className={`h-4 w-4 rounded-full border border-white ring-1 ring-gray-200 shrink-0 inline-block ${v.stock === 0 ? "opacity-30" : ""}`} style={{ backgroundColor: bg }} />
                        : <span key={v.id} className={`rounded-full border border-gray-200 px-1.5 text-[10px] text-gray-600 ${v.stock === 0 ? "opacity-30 line-through" : ""}`}>{v.value}</span>;
                    })}
                  </div>
                )}
                {otherPairs.length > 0 && <p className={`mt-1 text-xs ${isDark ? "text-gray-400" : "text-gray-400"}`}>{otherPairs.map(v => v.value).join(", ")}</p>}
              </>
            );
          })()}
          {isInquiry ? (
            <button
              type="button"
              onClick={() => consultarWhatsApp(product)}
              disabled={!store.whatsappNumber}
              className={`mt-auto flex w-full items-center justify-center gap-2 px-4 py-2.5 text-base font-bold transition disabled:opacity-40 ${buttonRadius}`}
              style={{ backgroundColor: "#25D366", color: "#fff" }}
            >
              <MessageCircle className="h-4 w-4" />
              Consultar
            </button>
          ) : (
            <button
              type="button"
              disabled={!available}
              onClick={() => addToCart(product)}
              className={`mt-auto flex w-full items-center justify-center gap-2 px-4 py-2.5 text-base font-bold transition disabled:opacity-40 ${buttonRadius}`}
              style={{
                backgroundColor: store.buttonStyle === "outline" ? "transparent" : store.primaryColor,
                borderColor: store.primaryColor,
                color: store.buttonStyle === "outline" ? store.primaryColor : textColor,
              }}
            >
              <ShoppingBag className="h-4 w-4" />
              {!available ? "Sin stock" : "Agregar"}
            </button>
          )}
        </div>
      </article>
    );
  }

  function renderBlocks() {
    const blocks = contentBlocks;
    if (!blocks.length) return null;

    const isInOpenSection = (id: string) => openSectionBlocks.some(b => b.id === id);

    return (
      <div className="space-y-0">
        {blocks.map((block) => {
          if (block.type === "navbar") return null;
          // Section mode: only render blocks belonging to the open section
          if (openSection) {
            if (!isInOpenSection(block.id)) return null;
          } else {
            if (sectionBlockIds.has(block.id)) return null;
          }
          const p = block.props as Record<string, any>;
          if (block.type === "products") {
            const categoryFilter = String(p.categoryFilter || "all");
            const subcategoryFilter = String(p.subcategoryFilter || "all");
            const blockProducts =
              categoryFilter === "all"
                ? store.products.filter((product) => {
                    if (p.showCategoryTabs === true) {
                      if (category !== "all" && product.category !== category) return false;
                      if (subcategory !== "all" && product.subcategory !== subcategory) return false;
                    }
                    return subcategoryFilter === "all" || product.subcategory === subcategoryFilter;
                  })
                : store.products.filter((product) => {
                    if (product.category !== categoryFilter) return false;
                    return subcategoryFilter === "all" || product.subcategory === subcategoryFilter;
                  });
            const sortBy = String(p.sortBy || "default");
            const sortedBlockProducts = [...blockProducts].sort((a, b) => {
              if (sortBy === "price_asc") return a.price - b.price;
              if (sortBy === "price_desc") return b.price - a.price;
              if (sortBy === "name_asc") return a.name.localeCompare(b.name, "es");
              if (sortBy === "name_desc") return b.name.localeCompare(a.name, "es");
              return 0;
            });
            const columns = Math.max(1, Number(p.columns) || 3);
            const layoutMode = String(p.layoutMode || "grid");
            const gridClass = columns >= 5
              ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
              : columns === 4
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
                : columns === 1
                  ? "grid-cols-1"
                : columns === 2
                  ? "grid-cols-1 md:grid-cols-2"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

            return (
              <section key={block.id} id={block.id} style={{ fontFamily: store.fontFamily, backgroundColor: String(p.bgColor || "transparent") }}><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
                {p.showHeading !== false && (
                  <div className="mb-7 text-center">
                    <h2 className={`font-black break-words ${p.headingSize === "sm" ? "text-xl" : p.headingSize === "md" ? "text-2xl" : p.headingSize === "xl" ? "text-4xl" : "text-3xl"}`} style={{ color: String(p.color || store.primaryColor) }}>{p.heading || "Nuestros productos"}</h2>
                    {p.subheading && <p className={`mt-2 ${p.subheadingSize === "sm" ? "text-sm" : p.subheadingSize === "lg" ? "text-lg" : "text-base"} ${isDark ? "text-gray-400" : "text-gray-500"}`} style={{ color: p.subheadingColor || undefined }}>{p.subheading}</p>}
                    {categoryFilter !== "all" && <p className={`mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{formatCategoryLabel(categoryFilter)}{subcategoryFilter !== "all" ? ` / ${formatCategoryLabel(subcategoryFilter)}` : ""}</p>}
                  </div>
                )}

                {categoryFilter === "all" && p.showCategoryTabs === true && categories.length > 1 && (
                  <div className="mb-6 flex justify-center gap-2 overflow-x-auto pb-1">
                    <button onClick={() => { setCategory("all"); setSubcategory("all"); }} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${category === "all" ? "text-white" : isDark ? "bg-white/10 text-white" : "bg-white text-gray-600"}`} style={category === "all" ? { backgroundColor: String(p.color || store.primaryColor) } : undefined}>Todo</button>
                    {categories.map((cat) => (
                      <button key={cat} onClick={() => { setCategory(cat); setSubcategory("all"); }} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold capitalize ${category === cat ? "text-white" : isDark ? "bg-white/10 text-white" : "bg-white text-gray-600"}`} style={category === cat ? { backgroundColor: String(p.color || store.primaryColor) } : undefined}>{formatCategoryLabel(cat)}</button>
                    ))}
                  </div>
                )}

                {categoryFilter === "all" && p.showCategoryTabs === true && subcategories.length > 1 && (
                  <div className="mb-6 flex justify-center gap-2 overflow-x-auto pb-1">
                    <button onClick={() => setSubcategory("all")} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${subcategory === "all" ? "text-white" : isDark ? "bg-white/10 text-white" : "bg-white text-gray-600"}`} style={subcategory === "all" ? { backgroundColor: String(p.color || store.accentColor) } : undefined}>Todo {category === "all" ? "" : formatCategoryLabel(category)}</button>
                    {subcategories.map((subcat) => (
                      <button key={subcat} onClick={() => setSubcategory(subcat)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold capitalize ${subcategory === subcat ? "text-white" : isDark ? "bg-white/10 text-white" : "bg-white text-gray-600"}`} style={subcategory === subcat ? { backgroundColor: String(p.color || store.accentColor) } : undefined}>{formatCategoryLabel(subcat)}</button>
                    ))}
                  </div>
                )}

                {blockProducts.length ? (
                  layoutMode === "carousel" ? (
                    <div className="flex gap-5 overflow-x-auto pb-3" style={{ scrollSnapType: "x mandatory" }}>
                      {sortedBlockProducts.map((product, index) => (
                        <div
                          key={product.id}
                          className="shrink-0"
                          style={{
                            width: `calc((100% - ${(columns - 1) * 20}px) / ${columns})`,
                            minWidth: columns === 1 ? "100%" : "200px",
                            scrollSnapAlign: "start",
                          }}
                        >
                          {renderProductCard(product, index)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`grid items-stretch gap-5 ${gridClass}${columns === 1 ? " max-w-sm mx-auto w-full" : ""}`}>{sortedBlockProducts.map(renderProductCard)}</div>
                  )
                ) : (
                  <div className={`py-16 text-center ${isDark ? "text-gray-400" : "text-gray-400"}`}>
                    <Package className="mx-auto mb-3 h-10 w-10 opacity-40" />
                    <p>No hay productos en esta categoria</p>
                  </div>
                )}
              </div></section>
            );
          }
          if (block.type === "text") return (
            <div key={block.id} id={block.id} style={{ fontFamily: store.fontFamily, backgroundColor: String(p.bgColor || "transparent") }}><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
              <PositionedTextLayer
                blockProps={p}
                viewport={viewport}
                style={{ minHeight: "170px" }}
                items={[
                  ...(p.heading ? [{
                    id: "heading",
                    defaultPos: { x: p.align === "left" ? 8 : p.align === "right" ? 42 : 20, y: 18 },
                    style: { width: "min(76%, 560px)", textAlign: (p.align || "center") as "left" | "center" | "right" },
                    content: <h2 className={`mb-4 font-black ${p.headingSize==="sm"?"text-xl":p.headingSize==="md"?"text-2xl":p.headingSize==="xl"?"text-4xl md:text-5xl":"text-3xl md:text-4xl"}`} style={{ color: String(p.color || store.primaryColor) }}>{p.heading}</h2>,
                  }] : []),
                  ...(p.body ? [{
                    id: "body",
                    defaultPos: { x: p.align === "left" ? 8 : p.align === "right" ? 42 : 20, y: 46 },
                    style: { width: "min(82%, 640px)", textAlign: (p.align || "center") as "left" | "center" | "right" },
                    content: <p className="text-base leading-relaxed" style={{ color: String(p.textColor || "#6b7280") }}>{p.body}</p>,
                  }] : []),
                ]}
              />
            </div></div>
          );
          if (block.type === "banner") return (
            <div key={block.id} id={block.id} className="rounded-2xl px-6 py-3" style={{ backgroundColor: p.bgColor || store.accentColor, color: p.textColor || "#fff" }}>
              <PositionedTextLayer
                blockProps={p}
                viewport={viewport}
                style={{ minHeight: "32px" }}
                items={[
                  {
                    id: "text",
                    defaultPos: { x: 26, y: 18 },
                    style: { width: "min(72%, 520px)", textAlign: "center" as const },
                    content: <p className={`text-center font-bold ${p.textSize==="sm"?"text-xs":p.textSize==="lg"?"text-base":p.textSize==="xl"?"text-xl":"text-sm"}`}>{p.text || "Anuncio"}</p>,
                  },
                ]}
              />
            </div>
          );
          if (block.type === "banner-group") {
            return <div key={block.id} id={block.id}><BannerCarouselBlock block={block} primaryColor={store.primaryColor} fontFamily={store.fontFamily} /></div>;
          }
          if (block.type === "cta") return (
            <div key={block.id} id={block.id} className="mx-4 rounded-3xl p-8 sm:mx-6 sm:p-12" style={{ backgroundColor: p.bgColor || store.primaryColor, color: p.textColor || "#fff", fontFamily: store.fontFamily }}>
              <PositionedTextLayer
                blockProps={p}
                viewport={viewport}
                style={{ minHeight: "180px" }}
                items={[
                  {
                    id: "heading",
                    defaultPos: { x: 28, y: 16 },
                    style: { width: "min(72%, 520px)", textAlign: "center" as const },
                    content: <h2 className={`font-black ${p.headingSize==="sm"?"text-2xl":p.headingSize==="md"?"text-3xl":p.headingSize==="lg"?"text-3xl md:text-4xl":"text-4xl md:text-5xl"}`}>{p.heading || "¿Lista para comprar?"}</h2>,
                  },
                  ...(p.sub ? [{
                    id: "sub",
                    defaultPos: { x: 27, y: 40 },
                    style: { width: "min(72%, 520px)", textAlign: "center" as const },
                    content: <p className="opacity-75">{p.sub}</p>,
                  }] : []),
                  {
                    id: "buttonText",
                    defaultPos: { x: 36, y: 66 },
                    content: (
                      <a href={p.buttonUrl ? safeHref(p.buttonUrl) : "#productos"} className="inline-block rounded-full bg-white px-8 py-3 text-sm font-black" style={{ color: p.bgColor || store.primaryColor }}>
                        {p.buttonText || "Ver catálogo"}
                      </a>
                    ),
                  },
                ]}
              />
            </div>
          );
          if (block.type === "image-text") {
            const pos = String(p.imagePosition || "left");
            const isVertical = pos === "top" || pos === "bottom";
            const imageFit = String(p.imageFit || "cover") as "cover" | "contain";
            const imageWidth = Math.min(70, Math.max(30, Number(p.imageWidth) || 50));
            const imageHeight = Math.min(520, Math.max(180, Number(p.imageHeight) || 320));
            const stackedImageText = viewport !== "desktop" || isVertical;
            const radiusMap: Record<string,string> = { redondeada:"18px", cuadrada:"0px", circulo:"50%", ovalada:"50px" };
            const imageRadius = radiusMap[String(p.imageRadius || "redondeada")] || "18px";
            const isRound = p.imageRadius === "circulo" || p.imageRadius === "ovalada";
            const flexDir = isVertical
              ? (pos === "bottom" ? "column-reverse" : "column")
              : (pos === "right" ? "row-reverse" : "row");
            const imgContainerStyle: React.CSSProperties = isRound ? {
              flex: "0 0 auto",
              alignSelf: "center",
              aspectRatio: p.imageRadius === "circulo" ? "1 / 1" : "3 / 4",
              borderRadius: imageRadius,
              overflow: "hidden",
              backgroundColor: String(p.imageBgColor || "#f3f4f6"),
              width: stackedImageText ? "60%" : `${imageWidth}%`,
            } : {
              flex: stackedImageText ? "1 1 auto" : `0 0 ${imageWidth}%`,
              width: stackedImageText && !isVertical ? "100%" : undefined,
              minHeight: `${imageHeight}px`,
              borderRadius: imageRadius,
              overflow: "hidden",
              backgroundColor: String(p.imageBgColor || "#f3f4f6"),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            };
            return (
              <div key={block.id} id={block.id} style={{ fontFamily: store.fontFamily, backgroundColor: String(p.bgColor || "transparent") }}>
                <div style={{ display:"flex", flexDirection: flexDir as React.CSSProperties["flexDirection"], gap:"32px", alignItems: isRound ? "center" : "stretch", padding:"32px 24px", maxWidth:"1280px", margin:"0 auto" }}>
                  <div style={imgContainerStyle}>
                    {p.image ? <img src={String(p.image)} alt="" style={{ width:"100%", height:"100%", objectFit: imageFit, objectPosition: "center", display:"block" }} /> : <Package className="h-12 w-12 text-gray-300" />}
                  </div>
                  <div style={{ flex:`1 1 ${100-imageWidth}%`, width: stackedImageText && !isVertical ? "100%" : undefined, display:"flex", flexDirection:"column", justifyContent:"center" }}>
                    <PositionedTextLayer
                      blockProps={p}
                      viewport={viewport}
                      style={{ minHeight: `${imageHeight}px` }}
                      items={[
                        ...(p.heading ? [{
                          id: "heading",
                          defaultPos: { x: 6, y: 28 },
                          style: { width: "min(90%, 420px)", textAlign: "left" as const },
                          content: <h2 className={`mb-4 font-black ${p.headingSize==="sm"?"text-xl":p.headingSize==="md"?"text-2xl":p.headingSize==="xl"?"text-4xl":"text-3xl"}`} style={{ color: String(p.color || store.primaryColor) }}>{p.heading}</h2>,
                        }] : []),
                        ...(p.body ? [{
                          id: "body",
                          defaultPos: { x: 6, y: 44 },
                          style: { width: "min(92%, 460px)", textAlign: "left" as const },
                          content: <p className="leading-relaxed" style={{ color: String(p.textColor || "#6b7280") }}>{p.body}</p>,
                        }] : []),
                      ]}
                    />
                  </div>
                </div>
              </div>
            );
          }
          if (block.type === "socials") {
            const layout = String(p.layout || "icons");
            const heading = String(p.heading || "Seguinos y contactanos");
            const blockColor = String(p.color || store.primaryColor);
            const blockTextColor = readableText(blockColor);
            const blockBg = String(p.bgColor || (isDark ? "rgba(255,255,255,.03)" : "#ffffff"));
            // Build items from block-level URLs, fall back to store-level
            const channelOrder: string[] = Array.isArray(p.channelOrder) ? p.channelOrder : ["showInstagram","showFacebook","showTiktok","showWhatsapp","showEmail"];
            const blockItems = [
              { key:"showInstagram", label:"Instagram", network:"instagram", href: p.instagramUrl ? socialUrl("instagram", p.instagramUrl) : store.instagramUrl ? socialUrl("instagram", store.instagramUrl) : null },
              { key:"showFacebook",  label:"Facebook",  network:"facebook",  href: p.facebookUrl  ? socialUrl("facebook",  p.facebookUrl)  : store.facebookUrl  ? socialUrl("facebook",  store.facebookUrl)  : null },
              { key:"showTiktok",    label:"TikTok",    network:"tiktok",    href: p.tiktokUrl    ? socialUrl("tiktok",    p.tiktokUrl)    : store.tiktokUrl    ? socialUrl("tiktok",    store.tiktokUrl)    : null },
              { key:"showWhatsapp",  label:"WhatsApp",  network:"whatsapp",  href: p.whatsappNumber ? socialUrl("whatsapp", p.whatsappNumber) : store.whatsappNumber ? socialUrl("whatsapp", store.whatsappNumber) : null },
              { key:"showEmail",     label:"Email",     network:"email",     href: p.emailAddress ? `mailto:${p.emailAddress}` : store.owner.email ? `mailto:${store.owner.email}` : null },
            ]
              .sort((a,b) => channelOrder.indexOf(a.key) - channelOrder.indexOf(b.key))
              .filter((item) => p[item.key] !== false && item.href) as { key:string; label:string; network:string; href:string }[];
            const visibleItems = blockItems;
            if (!visibleItems.length) return null;

            if (layout === "card") {
              return (
                <section key={block.id} id={block.id} className="px-4 py-8 sm:px-6" style={{ fontFamily: store.fontFamily, backgroundColor: blockBg }}>
                  <div className={`mx-auto max-w-xl border p-6 text-center ${cardRadius} ${cardShadow}`} style={{ borderColor: `${blockColor}22`, backgroundColor: blockBg }}>
                    {p.showHeading !== false && (
                      <div className="mb-5">
                        <PositionedTextLayer
                          blockProps={p}
                          viewport={viewport}
                          style={{ minHeight: "54px" }}
                          items={[
                            {
                              id: "heading",
                              defaultPos: { x: 32, y: 14 },
                              style: { width: "min(72%, 440px)", textAlign: "center" as const },
                              content: <h2 className={`font-black ${p.headingSize==="sm"?"text-lg":p.headingSize==="md"?"text-xl":p.headingSize==="xl"?"text-3xl md:text-4xl":"text-2xl"}`} style={{ color: blockColor }}>{heading}</h2>,
                            },
                          ]}
                        />
                      </div>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {visibleItems.map((item) => (
                        <a
                          key={item.label}
                          href={item.href}
                          target={item.label === "Email" ? undefined : "_blank"}
                          rel={item.label === "Email" ? undefined : "noreferrer"}
                          className={`flex items-center justify-center gap-3 border px-4 py-3 text-sm font-black transition hover:-translate-y-0.5 ${buttonRadius}`}
                          style={{ borderColor: `${blockColor}44`, color: blockColor }}
                        >
                          <SocialIconCircle network={item.network} size={32} />
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </section>
              );
            }

            return (
              <section key={block.id} id={block.id} className="px-4 py-8 text-center sm:px-6" style={{ fontFamily: store.fontFamily, backgroundColor: blockBg }}>
                {p.showHeading !== false && (
                  <div className="mb-5">
                    <PositionedTextLayer
                      blockProps={p}
                      viewport={viewport}
                      style={{ minHeight: "54px" }}
                      items={[
                        {
                          id: "heading",
                          defaultPos: { x: 32, y: 14 },
                          style: { width: "min(72%, 440px)", textAlign: "center" as const },
                          content: <h2 className="text-2xl font-black" style={{ color: blockColor }}>{heading}</h2>,
                        },
                      ]}
                    />
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {visibleItems.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target={item.label === "Email" ? undefined : "_blank"}
                      rel={item.label === "Email" ? undefined : "noreferrer"}
                      aria-label={item.label}
                      className={`inline-flex items-center justify-center gap-2 font-black transition hover:-translate-y-0.5 ${layout === "buttons" ? `px-5 py-3 text-sm ${buttonRadius}` : "h-12 min-w-12 rounded-full px-3 text-xs"}`}
                      style={{
                        backgroundColor: layout === "buttons" ? blockColor : isDark ? "rgba(255,255,255,.08)" : "#ffffff",
                        color: layout === "buttons" ? blockTextColor : blockColor,
                        border: layout === "buttons" ? "none" : `1px solid ${blockColor}33`,
                      }}
                    >
                      <SocialIconCircle network={item.network} size={28} forButton={layout === "buttons"} />
                      {layout === "buttons" ? item.label : <span className="sr-only">{item.label}</span>}
                    </a>
                  ))}
                </div>
              </section>
            );
          }
          if (block.type === "hero") return (
            <div key={block.id} id={block.id} className="overflow-hidden px-6 py-14 text-white sm:px-8 sm:py-16"
              style={{ background: p.bgColor || store.primaryColor, color: p.textColor || "#fff", fontFamily: store.fontFamily, minHeight: p.blockMinHeight > 0 ? `${p.blockMinHeight}px` : p.height === "xl" ? "480px" : p.height === "lg" ? "360px" : p.height === "sm" ? "180px" : "260px" }}>
              <PositionedTextLayer
                blockProps={p}
                viewport={viewport}
                style={{ minHeight: p.blockMinHeight > 0 ? `${p.blockMinHeight}px` : p.height === "xl" ? "480px" : p.height === "lg" ? "360px" : p.height === "sm" ? "180px" : "260px" }}
                items={[
                  {
                    id: "title",
                    defaultPos: { x: p.layout === "left" ? 8 : p.layout === "right" ? 54 : 28, y: 18 },
                    style: { width: "min(72%, 520px)", textAlign: (p.layout || "center") as "left" | "center" | "right" },
                    content: <h2 className={`mb-3 font-black drop-shadow ${p.headingSize==="sm"?"text-2xl":p.headingSize==="md"?"text-3xl":p.headingSize==="lg"?"text-3xl md:text-4xl":"text-4xl md:text-5xl"}`}>{p.title || store.name}</h2>,
                  },
                  ...(p.subtitle ? [{
                    id: "subtitle",
                    defaultPos: { x: p.layout === "left" ? 8 : p.layout === "right" ? 54 : 28, y: 40 },
                    style: { width: "min(72%, 520px)", textAlign: (p.layout || "center") as "left" | "center" | "right" },
                    content: <p className="max-w-xl opacity-80">{p.subtitle}</p>,
                  }] : []),
                  ...(p.buttonText ? [{
                    id: "buttonText",
                    defaultPos: { x: (p.layout === "left" ? 8 : p.layout === "right" ? 54 : 28) + (p.layout === "center" ? 10 : 0), y: 65 },
                    content: <a href={p.buttonUrl ? safeHref(p.buttonUrl) : "#productos"} className="inline-block rounded-full bg-white px-8 py-3 text-sm font-black" style={{ color: p.bgColor || store.primaryColor }}>{p.buttonText}</a>,
                  }] : []),
                ]}
              />
            </div>
          );
          if (block.type === "spacer") {
            const heights: Record<string,string> = { xs:"12px",sm:"28px",md:"56px",lg:"100px",xl:"150px" };
            const h = heights[String(p.height||"md")] || "80px";
            const hasContent = p.text || p.emoji;
            const lineStyle = String(p.lineStyle || "none");
            const lineColor = String(p.lineColor || "#e5e7eb");
            const line = lineStyle !== "none" ? <div style={{flex:1,borderTop:`1.5px ${lineStyle} ${lineColor}`}}/> : null;
            return (
              <div key={block.id} id={block.id} style={{
                minHeight: h,
                background: String(p.bgColor || "transparent"),
                display:"flex", alignItems:"center", justifyContent:"center",
                padding: hasContent || lineStyle !== "none" ? "0 32px" : "0",
              }}>
                {(hasContent || lineStyle !== "none") ? (
                  <div style={{display:"flex",alignItems:"center",gap:"16px",width:"100%"}}>
                    {line}
                    {hasContent && (
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",flexShrink:0}}>
                        {p.emoji && <span style={{fontSize:"24px",lineHeight:1}}>{String(p.emoji)}</span>}
                        {p.text && <span style={{fontSize:"14px",fontWeight:600,color:String(p.textColor||"#374151"),whiteSpace:"nowrap"}}>{String(p.text)}</span>}
                      </div>
                    )}
                    {line}
                  </div>
                ) : null}
              </div>
            );
          }
          if (block.type === "divider") return (
            <div key={block.id} id={block.id} className="py-2">
              <hr style={{ border: "none", borderTop: `2px ${p.style || "solid"} ${p.color || "#e5e7eb"}` }} />
            </div>
          );
          if (block.type === "contacto") return (
            <div key={block.id} id={block.id}>
              <ContactBlock storeSlug={store.slug} p={p} primaryColor={store.primaryColor} fontFamily={store.fontFamily} />
            </div>
          );
          if (block.type === "video") {
            const url = String(p.videoUrl || "");
            let embedSrc = "";
            if (url) {
              try {
                const u = new URL(url);
                if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
                  const vid = u.searchParams.get("v") || u.pathname.split("/").pop() || "";
                  embedSrc = `https://www.youtube.com/embed/${vid}`;
                } else if (u.hostname.includes("vimeo.com")) {
                  const vid = u.pathname.split("/").filter(Boolean).pop() || "";
                  embedSrc = `https://player.vimeo.com/video/${vid}`;
                } else {
                  embedSrc = url;
                }
              } catch {}
            }
            const ratios: Record<string,string> = { "16:9":"56.25%", "4:3":"75%", "1:1":"100%" };
            const paddingBottom = ratios[String(p.aspectRatio||"16:9")] || "56.25%";
            const isDirectVideo = embedSrc && !embedSrc.includes("youtube") && !embedSrc.includes("vimeo");
            const vWidth = Number(p.videoWidth || 100);
            const vX = Number(p.videoX ?? 50);
            const vMarginLeft = `${Math.max(0, (vX / 100) * Math.max(0, 100 - vWidth))}%`;
            const txtColor = String(p.textColor || store.primaryColor);
            const txtShadow = p.textShadow ? "0 1px 4px rgba(0,0,0,0.55)" : "none";
            const txtAlign = (p.textAlign || "center") as "left" | "center" | "right";
            const videoEl = embedSrc ? (
              <div style={{ position:"relative", paddingBottom, height:0, overflow:"hidden", borderRadius:"12px" }}>
                {isDirectVideo
                  ? <video src={embedSrc} controls autoPlay={!!p.autoplay} muted={!!p.muted} loop={!!p.loop} style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", borderRadius:"12px" }}/>
                  : <iframe src={embedSrc} title={String(p.heading||"Video")} style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", border:"none", borderRadius:"12px" }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>
                }
              </div>
            ) : null;
            // Mobile/tablet: stacked layout (text above, video full-width)
            if (viewport !== "desktop") {
              return (
                <div key={block.id} id={block.id} style={{ fontFamily:store.fontFamily, backgroundColor:String(p.bgColor||"transparent"), padding:"16px" }}>
                  {p.heading && <div style={{ fontSize:p.headingSize==="sm"?"13px":p.headingSize==="md"?"16px":p.headingSize==="xl"?"26px":"20px", fontWeight:700, color:txtColor, textAlign:txtAlign, marginBottom:"6px", lineHeight:1.3, textShadow:txtShadow }}>{String(p.heading)}</div>}
                  {p.subtitle && <div style={{ fontSize:p.subtitleSize==="sm"?"11px":p.subtitleSize==="md"?"13px":p.subtitleSize==="xl"?"18px":"15px", fontWeight:400, color:txtColor, opacity:0.85, textAlign:txtAlign, marginBottom:"10px", lineHeight:1.5, textShadow:p.textShadow?"0 1px 3px rgba(0,0,0,0.45)":"none" }}>{String(p.subtitle)}</div>}
                  {videoEl}
                </div>
              );
            }
            // Desktop: overlay layout with positioned text
            return (
              <div key={block.id} id={block.id} style={{ fontFamily: store.fontFamily, backgroundColor: String(p.bgColor||"transparent"), padding: "20px" }}>
                <div style={{ display:"flex", alignItems:"flex-start" }}>
                  <div style={{ width:`${vWidth}%`, marginLeft:vMarginLeft, flexShrink:0, position:"relative" }}>
                    {videoEl}
                    {(p.heading || p.subtitle) && (
                      <PositionedTextLayer
                        blockProps={p}
                        viewport={viewport}
                        style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"visible" }}
                        items={[
                          ...(p.heading ? [{
                            id: "heading",
                            defaultPos: { x: 50, y: 20 },
                            style: { maxWidth:"260px", textAlign:txtAlign, wordBreak:"break-word" as const, pointerEvents:"none" as const },
                            content: <div style={{ fontSize:p.headingSize==="sm"?"13px":p.headingSize==="md"?"16px":p.headingSize==="xl"?"26px":"20px", fontWeight:700, color:txtColor, lineHeight:1.3, textShadow:txtShadow }}>{String(p.heading)}</div>,
                          }] : []),
                          ...(p.subtitle ? [{
                            id: "subtitle",
                            defaultPos: { x: 50, y: 40 },
                            style: { maxWidth:"260px", textAlign:txtAlign, wordBreak:"break-word" as const, pointerEvents:"none" as const },
                            content: <div style={{ fontSize:p.subtitleSize==="sm"?"11px":p.subtitleSize==="md"?"13px":p.subtitleSize==="xl"?"18px":"15px", fontWeight:400, color:txtColor, opacity:0.85, lineHeight:1.5, textShadow:p.textShadow?"0 1px 3px rgba(0,0,0,0.45)":"none" }}>{String(p.subtitle)}</div>,
                          }] : []),
                        ]}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          }
          if (block.type === "gallery") {
            const images: string[] = Array.isArray(p.images) ? p.images.filter((x:any) => typeof x === "string" && x) : [];
            const columns = Math.max(2, Math.min(4, Number(p.columns)||3));
            const gridClass = columns === 2 ? "grid-cols-1 sm:grid-cols-2" : columns === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3";
            return (
              <div key={block.id} id={block.id} className="px-4 py-8 sm:px-6" style={{ fontFamily: store.fontFamily, backgroundColor: String(p.bgColor||"transparent") }}>
                <div className="mx-auto max-w-7xl">
                  {p.heading && <h2 className={`mb-6 font-black text-center ${p.headingSize==="sm"?"text-xl":p.headingSize==="md"?"text-2xl":p.headingSize==="xl"?"text-4xl":"text-3xl"}`} style={{ color: store.primaryColor }}>{String(p.heading)}</h2>}
                  {images.length > 0 ? (
                    <div className={`grid gap-3 ${gridClass}`}>
                      {images.map((src, i) => (
                        <div key={i} className="aspect-square overflow-hidden rounded-2xl bg-gray-100">
                          <img src={src} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"/>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center text-gray-300">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="mx-auto mb-3 h-10 w-10"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                      <p>Agregá imágenes en el panel</p>
                    </div>
                  )}
                </div>
              </div>
            );
          }
          if (block.type === "faq") {
            const items: {id:string;question:string;answer:string}[] = Array.isArray(p.items) ? p.items : [];
            const accentColor = String(p.accentColor || store.primaryColor);
            return (
              <div key={block.id} id={block.id} className="px-4 py-10 sm:px-6" style={{ fontFamily: store.fontFamily, backgroundColor: String(p.bgColor||"#ffffff") }}>
                <div className="mx-auto max-w-2xl">
                  {p.heading && <h2 className={`mb-8 font-black text-center ${p.headingSize==="sm"?"text-2xl":p.headingSize==="md"?"text-3xl":p.headingSize==="lg"?"text-3xl md:text-4xl":"text-4xl md:text-5xl"}`} style={{ color: String(p.textColor||store.primaryColor) }}>{String(p.heading)}</h2>}
                  {items.length > 0 ? (
                    <div className="space-y-2">
                      {items.map((item) => (
                        <details key={item.id} className="group rounded-2xl border overflow-hidden" style={{ borderColor: `${accentColor}30` }}>
                          <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 font-semibold text-sm list-none" style={{ color: String(p.textColor||"#111827") }}>
                            <span>{item.question}</span>
                            <span className="shrink-0 transition-transform duration-200 group-open:rotate-180" style={{ color: accentColor }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={16} height={16}><path d="M6 9l6 6 6-6"/></svg>
                            </span>
                          </summary>
                          <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: String(p.textColor ? `${p.textColor}bb` : "#6b7280"), borderTop: `1px solid ${accentColor}20` }}>
                            <div className="pt-3">{item.answer}</div>
                          </div>
                        </details>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 py-8">Agregá preguntas frecuentes en el panel</p>
                  )}
                </div>
              </div>
            );
          }
          if (block.type === "testimonios") {
            const items: {id:string;name:string;text:string;rating:number;avatar:string}[] = Array.isArray(p.items) ? p.items : [];
            const layout = String(p.layout || "grid");
            return (
              <div key={block.id} id={block.id} className="px-4 py-10 sm:px-6" style={{ fontFamily: store.fontFamily, backgroundColor: String(p.bgColor||"#f9fafb") }}>
                <div className="mx-auto max-w-6xl">
                  {p.heading && <h2 className={`mb-8 font-black text-center ${p.headingSize==="sm"?"text-2xl":p.headingSize==="md"?"text-3xl":p.headingSize==="lg"?"text-3xl md:text-4xl":"text-4xl md:text-5xl"}`} style={{ color: String(p.textColor||store.primaryColor) }}>{String(p.heading)}</h2>}
                  {items.length > 0 ? (
                    <div className={layout === "carousel"
                      ? "flex gap-4 overflow-x-auto pb-3"
                      : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    }>
                      {items.map((item) => (
                        <div key={item.id} className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ${layout === "carousel" ? "shrink-0 w-72" : ""}`}>
                          <div className="mb-3 flex">
                            {Array.from({length: 5}).map((_,i) => (
                              <svg key={i} viewBox="0 0 24 24" fill={i < (item.rating||5) ? "#f59e0b" : "#e5e7eb"} width={16} height={16}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            ))}
                          </div>
                          <p className="mb-4 text-sm leading-relaxed" style={{ color: String(p.textColor||"#374151") }}>&ldquo;{item.text}&rdquo;</p>
                          <div className="flex items-center gap-2.5">
                            {item.avatar
                              ? <img src={item.avatar} alt={item.name} className="h-9 w-9 rounded-full object-cover"/>
                              : <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-black" style={{ background: store.primaryColor }}>{(item.name||"?").charAt(0).toUpperCase()}</div>
                            }
                            <p className="text-sm font-bold" style={{ color: String(p.textColor||"#111827") }}>{item.name || "Cliente"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 py-8">Agregá testimonios en el panel</p>
                  )}
                </div>
              </div>
            );
          }
          if (block.type === "mapa") {
            const mapUrl = String(p.mapEmbedUrl || "");
            const isSafeMapUrl = mapUrl.startsWith("https://www.google.com/maps/embed") || mapUrl.startsWith("https://maps.google.com/");
            const heights: Record<string,string> = { sm:"280px", md:"400px", lg:"520px" };
            const mapHeight = heights[String(p.height||"md")] || "400px";
            return (
              <div key={block.id} id={block.id} className="px-4 py-8 sm:px-6" style={{ fontFamily: store.fontFamily, backgroundColor: String(p.bgColor||"#ffffff") }}>
                <div className="mx-auto max-w-4xl">
                  {p.heading && <h2 className={`mb-6 font-black text-center ${p.headingSize==="sm"?"text-xl":p.headingSize==="md"?"text-2xl":p.headingSize==="xl"?"text-4xl":"text-3xl"}`} style={{ color: store.primaryColor }}>{String(p.heading)}</h2>}
                  {isSafeMapUrl ? (
                    <iframe
                      src={mapUrl}
                      width="100%" height={mapHeight}
                      style={{ border:0, borderRadius:"16px", display:"block" }}
                      allowFullScreen loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Mapa"
                    />
                  ) : (
                    <div style={{ height:mapHeight, background:"#f3f4f6", borderRadius:"16px", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"8px" }}>
                      <svg viewBox="0 0 24 24" fill="#9ca3af" width={40} height={40}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                      <p style={{ color:"#9ca3af", fontSize:"13px" }}>Pegá la URL del mapa en el panel</p>
                    </div>
                  )}
                  {p.showAddress !== false && p.address && (
                    <p className="mt-3 text-center text-sm text-gray-500">{String(p.address)}</p>
                  )}
                </div>
              </div>
            );
          }
          if (block.type === "nosotros") {
            const members: {id:string;name:string;role:string;image:string;bio:string}[] = Array.isArray(p.members) ? p.members as any[] : [];
            const features: {id:string;number:string;title:string;desc:string}[] = Array.isArray(p.features) ? p.features as any[] : [];
            return (
              <div key={block.id} id={block.id} style={{ backgroundColor: String(p.bgColor || "#ffffff"), color: String(p.textColor || "#111827") }}>
                {/* Header */}
                <div className="mx-auto max-w-4xl px-6 py-16 pb-10">
                  {p.tag && <span className="mb-4 inline-block rounded-full border border-current px-4 py-1 text-xs font-black tracking-widest opacity-60">{String(p.tag)}</span>}
                  <h1 className={`mb-4 font-black leading-tight ${p.headingSize==="sm"?"text-2xl":p.headingSize==="md"?"text-3xl":p.headingSize==="lg"?"text-3xl md:text-4xl":"text-4xl md:text-5xl"}`} style={{ color: String(p.textColor || "#111827") }}>{String(p.heading || "¿Quiénes somos?")}</h1>
                  {p.subtitle && <p className="text-lg opacity-65">{String(p.subtitle)}</p>}
                </div>
                {/* Members */}
                {p.showMembers && members.length > 0 && (
                  <div className="mx-auto max-w-4xl px-6 pb-12 grid grid-cols-1 gap-6 md:grid-cols-2">
                    {members.map(m => (
                      <div key={m.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                        {m.image && <img src={m.image} alt={m.name} className="h-64 w-full object-cover" />}
                        <div className="p-6">
                          {m.name && <h3 className="mb-1 text-xl font-black text-gray-900">{m.name}</h3>}
                          {m.role && <p className="mb-3 text-sm text-gray-400">{m.role}</p>}
                          {m.bio && <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">{m.bio}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Text section (mission/vision) */}
                {p.showTextSection && (
                  <div className="mx-auto max-w-4xl px-6 pb-12">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8">
                      {p.textSectionHeading && <h2 className="mb-6 text-center text-2xl font-black text-gray-900">{String(p.textSectionHeading)}</h2>}
                      {p.textSectionBody && <p className="text-center text-base leading-relaxed text-gray-700 whitespace-pre-line">{String(p.textSectionBody)}</p>}
                    </div>
                  </div>
                )}
                {/* Features grid */}
                {p.showFeatures && features.length > 0 && (
                  <div style={{ backgroundColor: String(p.featuresBgColor || "#1e3a5f") }} className="py-16">
                    <div className="mx-auto max-w-5xl px-6">
                      {p.featuresHeading && <h2 className="mb-3 text-center text-3xl font-black text-white">{String(p.featuresHeading)}</h2>}
                      {p.featuresSubtitle && <p className="mb-10 text-center text-white/65">{String(p.featuresSubtitle)}</p>}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {features.map(f => (
                          <div key={f.id} className="rounded-2xl border border-white/10 bg-white/10 p-6">
                            {f.number && <p className="mb-2 text-4xl font-black text-white/70">{f.number}</p>}
                            {f.title && <h3 className="mb-2 font-black text-white">{f.title}</h3>}
                            {f.desc && <p className="text-sm text-white/65">{f.desc}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  }

  return (
    <>
    {splashVisible && (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: store.logoColor || store.primaryColor || "#6366f1",
          opacity: splashFading ? 0 : splashMounted ? 1 : 0,
          transform: splashFading ? "scale(1.06)" : splashMounted ? "scale(1)" : "scale(0.92)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
          pointerEvents: "none",
        }}
      >
        {store.logo ? (
          <img
            src={store.logo}
            alt={store.name}
            style={{ width: 96, height: 96, borderRadius: 24, objectFit: "cover",
              boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}
          />
        ) : (
          <div style={{ width: 96, height: 96, borderRadius: 24, background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 40, fontWeight: 900, color: "#fff" }}>
              {store.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        <p style={{ marginTop: 20, color: "#fff", fontWeight: 800, fontSize: 22,
          letterSpacing: "-0.02em", textAlign: "center", padding: "0 24px" }}>
          {store.name}
        </p>
        {store.tagline && (
          <p style={{ marginTop: 8, color: "rgba(255,255,255,0.75)", fontSize: 14, textAlign: "center", padding: "0 32px" }}>
            {store.tagline}
          </p>
        )}
      </div>
    )}
    <div
      className={`min-h-screen ${isDark ? "bg-gray-950 text-white" : "text-gray-950"}`}
      style={{
        fontFamily: store.fontFamily,
        background:
          isKids
            ? `linear-gradient(160deg, ${store.primaryColor}14, ${store.accentColor}14, #ffffff)`
            : store.backgroundStyle === "gradient"
            ? `linear-gradient(135deg, ${store.secondaryColor}, #ffffff 45%, ${store.primaryColor}22)`
            : store.backgroundStyle === "pattern"
              ? `radial-gradient(circle at 20px 20px, ${store.primaryColor}14 2px, transparent 3px), ${isDark ? "#030712" : store.secondaryColor}`
              : isDark
                ? "#030712"
                : store.secondaryColor,
      }}
    >
      {store.announcementBar && (
        <div className="px-4 py-2 text-center text-sm font-bold text-white" style={{ backgroundColor: store.announcementBarColor }}>
          {store.announcementBar}
        </div>
      )}

      <header className={`${store.navbarStyle === "transparent" && !navConfig.bgColor ? "absolute left-0 right-0 z-30 bg-transparent" : isDark && !navConfig.bgColor ? "relative z-30 border-b border-white/10 bg-gray-950/90" : "relative z-30 border-b border-gray-100 bg-white/95"} backdrop-blur`} style={{ fontFamily: store.fontFamily, ...(navConfig.bgColor ? { background: navConfig.bgColor, borderColor: "transparent" } : {}) }}>
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
          {/* Logo */}
          {(()=>{
            const logoText = String(navbarBlock?.props?.logoText || store.name || "");
            const logoUrl = String(navbarBlock?.props?.logoUrl || store.logo || "") || undefined;
            return (
              <a href={`/tienda/${store.slug}`} className="flex shrink-0 items-center gap-3 font-black" style={navConfig.textColor ? { color: navConfig.textColor } : undefined}>
                {logoUrl ? <img src={logoUrl} alt={logoText} className="h-10 w-10 rounded-xl object-cover" /> : <ShoppingBag className="h-7 w-7" style={{ color: navConfig.textColor || store.primaryColor }} />}
                <span>{logoText}</span>
              </a>
            );
          })()}

          {/* Nav links — centered */}
          {navConfig.layout === "center" && parsedNavLinks.length > 0 && navConfig.mode !== "hamburger" && (
            <nav className={`hidden flex-1 items-center justify-center gap-1 md:flex`} style={{ color: navConfig.textColor || (isDark ? "#e5e7eb" : "#374151") }}>
              {parsedNavLinks.map((link) => {
                const subs = link.type === "filter" ? getSubsForCategory(link.value) : [];
                const isActive = link.type === "filter" && category === link.value;
                return (
                  <div key={link.id} className="relative" onMouseEnter={() => { if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current); subs.length > 0 && setOpenDropdown(link.id); }} onMouseLeave={() => { dropdownTimerRef.current = setTimeout(() => setOpenDropdown(null), 150); }}>
                    {link.type === "filter" ? (
                      <button type="button" onClick={() => { setCategory(link.value); setSubcategory("all"); setSearchQuery(""); }}
                        className={`flex items-center gap-1 rounded-lg px-3 py-2 text-base font-semibold transition-colors ${isActive ? "text-white" : navHoverBg}`}
                        style={isActive ? { backgroundColor: store.primaryColor } : undefined}>
                        {link.label}
                        {subs.length > 0 && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5"><path d="M6 9l6 6 6-6"/></svg>}
                      </button>
                    ) : link.type === "section" ? (
                      <button type="button" onClick={() => setOpenSection(link.value)} className={`flex items-center rounded-lg px-3 py-2 text-base font-semibold transition-colors ${navHoverBg}`}>{link.label}</button>
                    ) : (
                      <a href={safeHref(link.value)} className={`flex items-center rounded-lg px-3 py-2 text-base font-semibold transition-colors ${navHoverBg}`}>{link.label}</a>
                    )}
                    {subs.length > 0 && openDropdown === link.id && (
                      <div className={`absolute left-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-xl border shadow-xl ${isDark ? "border-white/10 bg-gray-900" : "border-gray-100 bg-white"}`}>
                        {subs.map((sub) => (
                          <button key={sub} type="button" onClick={() => { setCategory(link.value); setSubcategory(sub); setOpenDropdown(null); setSearchQuery(""); }}
                            className={`flex w-full items-center px-4 py-2.5 text-left text-sm font-medium capitalize transition-colors ${subcategory === sub ? "font-bold" : ""} ${navHoverBg}`}
                            style={subcategory === sub ? { color: store.primaryColor } : undefined}>
                            {sub}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          )}

          {/* Spacer for right layout */}
          {navConfig.layout !== "center" && navConfig.mode !== "hamburger" && <div className="hidden flex-1 md:block" />}
          {navConfig.mode === "hamburger" && <div className="flex-1" />}

          {/* Nav links — right */}
          {navConfig.layout !== "center" && parsedNavLinks.length > 0 && navConfig.mode !== "hamburger" && (
            <nav className={`hidden items-center gap-1 md:flex`} style={{ color: navConfig.textColor || (isDark ? "#e5e7eb" : "#374151") }}>
              {parsedNavLinks.map((link) => {
                const subs = link.type === "filter" ? getSubsForCategory(link.value) : [];
                const isActive = link.type === "filter" && category === link.value;
                return (
                  <div key={link.id} className="relative" onMouseEnter={() => { if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current); subs.length > 0 && setOpenDropdown(link.id); }} onMouseLeave={() => { dropdownTimerRef.current = setTimeout(() => setOpenDropdown(null), 150); }}>
                    {link.type === "filter" ? (
                      <button type="button" onClick={() => { setCategory(link.value); setSubcategory("all"); setSearchQuery(""); }}
                        className={`flex items-center gap-1 rounded-lg px-3 py-2 text-base font-semibold transition-colors ${isActive ? "text-white" : navHoverBg}`}
                        style={isActive ? { backgroundColor: store.primaryColor } : undefined}>
                        {link.label}
                        {subs.length > 0 && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5"><path d="M6 9l6 6 6-6"/></svg>}
                      </button>
                    ) : link.type === "section" ? (
                      <button type="button" onClick={() => setOpenSection(link.value)} className={`flex items-center rounded-lg px-3 py-2 text-base font-semibold transition-colors ${navHoverBg}`}>{link.label}</button>
                    ) : (
                      <a href={safeHref(link.value)} className={`flex items-center rounded-lg px-3 py-2 text-base font-semibold transition-colors ${navHoverBg}`}>{link.label}</a>
                    )}
                    {subs.length > 0 && openDropdown === link.id && (
                      <div className={`absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-xl border shadow-xl ${isDark ? "border-white/10 bg-gray-900" : "border-gray-100 bg-white"}`}>
                        {subs.map((sub) => (
                          <button key={sub} type="button" onClick={() => { setCategory(link.value); setSubcategory(sub); setOpenDropdown(null); setSearchQuery(""); }}
                            className={`flex w-full items-center px-4 py-2.5 text-left text-sm font-medium capitalize transition-colors ${navHoverBg}`}
                            style={subcategory === sub ? { color: store.primaryColor } : undefined}>
                            {sub}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          )}

          {/* Right icons */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Search */}
            {navConfig.showSearch && navConfig.searchStyle === "bar" && (
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 ${navBgIsDark ? "border-white/20 bg-white/10 text-white" : "border-gray-200 bg-black/5 text-gray-900"}`}
                style={navConfig.textColor ? { color: navConfig.textColor, borderColor: `${navConfig.textColor}33` } : undefined}>
                <Search className="h-4 w-4 shrink-0 opacity-50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar productos..."
                  className="w-36 bg-transparent text-sm outline-none placeholder:opacity-50"
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery("")} className="opacity-50 hover:opacity-100">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
            {navConfig.showSearch && (navConfig.searchStyle ?? "icon") === "icon" && (
              <div className="flex items-center">
                {searchOpen ? (
                  <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 ${navBgIsDark ? "border-white/20 bg-white/10 text-white" : "border-gray-200 bg-black/5 text-gray-900"}`}>
                    <Search className="h-4 w-4 shrink-0 opacity-60" />
                    <input
                      autoFocus
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Buscar productos..."
                      className="w-40 bg-transparent text-sm outline-none placeholder:opacity-50"
                      onKeyDown={e => { if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); } }}
                    />
                    <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="opacity-50 hover:opacity-100">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setSearchOpen(true)}
                    className={`rounded-lg p-2 transition-colors ${navHoverBg}`}
                    style={{ color: navConfig.textColor || (isDark ? "white" : "#4b5563") }}
                    aria-label="Buscar">
                    <Search className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}

            {/* Hamburger */}
            {parsedNavLinks.length > 0 && (
              <button type="button" onClick={() => setMenuOpen(true)}
                className={`flex items-center justify-center rounded-lg p-2 ${navConfig.mode === "hamburger" ? "" : "md:hidden"} ${navHoverBg}`}
                style={{ color: navConfig.textColor || (isDark ? "white" : "#374151") }}
                aria-label="Menú">
                <Menu className="h-5 w-5" />
              </button>
            )}

            {/* Cart */}
            {!isInquiry && (
              <button type="button" onClick={() => setOpenCart(true)} className="relative p-2">
                <ShoppingBag className="h-6 w-6" style={{ color: navConfig.textColor || (isDark ? "white" : "#111827") }} />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className={`fixed inset-0 z-50 ${navConfig.mode !== "hamburger" ? "md:hidden" : ""} ${menuOpen ? "" : "pointer-events-none"}`}>
          <div className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${menuOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setMenuOpen(false)} />
          <div className={`absolute right-0 top-0 bottom-0 w-72 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${menuOpen ? "translate-x-0" : "translate-x-full"} ${isDark ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`} style={{ fontFamily: store.fontFamily }}>
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "#f3f4f6" }}>
              <span className="font-black text-lg">{String(navbarBlock?.props?.logoText || store.name || "")}</span>
              <button type="button" onClick={() => setMenuOpen(false)} className={`rounded-lg p-1.5 ${navHoverBg}`}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {navConfig.showSearch && (
              <div className={`mx-4 mt-4 flex items-center gap-2 rounded-xl border px-3 py-2 ${isDark ? "border-white/20 bg-white/10" : "border-gray-200 bg-gray-50"}`}>
                <Search className="h-4 w-4 shrink-0 opacity-50" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar productos..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-50" />
              </div>
            )}
            <nav className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
              {parsedNavLinks.map((link) => {
                const subs = link.type === "filter" ? getSubsForCategory(link.value) : [];
                const isActive = link.type === "filter" && category === link.value;
                return (
                  <div key={link.id}>
                    {link.type === "filter" ? (
                      <button type="button"
                        onClick={() => {
                          setCategory(link.value); setSubcategory("all"); setSearchQuery("");
                          if (subs.length > 0) {
                            setExpandedDrawerItem(expandedDrawerItem === link.id ? null : link.id);
                          } else {
                            setMenuOpen(false);
                          }
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${isActive ? "text-white" : navHoverBg}`}
                        style={isActive ? { backgroundColor: store.primaryColor } : undefined}>
                        {link.label}
                        {subs.length > 0 && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                            className={`h-3.5 w-3.5 opacity-60 transition-transform ${expandedDrawerItem === link.id ? "rotate-180" : ""}`}>
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        )}
                      </button>
                    ) : link.type === "section" ? (
                      <button type="button" onClick={() => { setOpenSection(link.value); setMenuOpen(false); }}
                        className={`flex w-full items-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${navHoverBg}`}>
                        {link.label}
                      </button>
                    ) : (
                      <a href={safeHref(link.value)} onClick={() => setMenuOpen(false)}
                        className={`flex w-full items-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${navHoverBg}`}>
                        {link.label}
                      </a>
                    )}
                    {subs.length > 0 && expandedDrawerItem === link.id && (
                      <div className="ml-4 flex flex-col gap-0.5 pb-1">
                        {subs.map(sub => (
                          <button key={sub} type="button" onClick={() => { setSubcategory(sub); setMenuOpen(false); setExpandedDrawerItem(null); }}
                            className={`flex w-full items-center rounded-lg px-4 py-2 text-left text-sm capitalize transition-colors ${subcategory === sub ? "font-bold" : "opacity-70"} ${navHoverBg}`}
                            style={subcategory === sub ? { color: store.primaryColor } : undefined}>
                            {sub}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>

      {hasCustomHeroBlock && !openSection && renderHero()}

      {renderBlocks()}


      <footer className={`${isDark ? "border-t border-white/10 bg-gray-950 text-gray-400" : "border-t border-gray-100 bg-white text-gray-500"} px-6 py-10 text-sm`} style={{ fontFamily: store.fontFamily }}>
        <div className="mx-auto max-w-4xl">
          {/* Nombre + descripción */}
          <div className="mb-6 text-center">
            <p className={`font-black text-base ${isDark ? "text-white" : "text-gray-900"}`}>{store.name}</p>
            {(store.footerDescription || store.footerText) && (
              <p className="mt-1 text-xs opacity-70 max-w-sm mx-auto">{store.footerDescription || store.footerText}</p>
            )}
          </div>

          {/* Políticas legales */}
          {store.footerShowLegal && (
            (store.policyReturnsActive && store.policyReturns) ||
            (store.policyShippingActive && store.policyShipping) ||
            (store.policyTermsActive && store.policyTerms)
          ) && (
            <div className="mb-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs opacity-60">
              {store.policyReturnsActive && store.policyReturns && (
                <a href={`/tienda/${store.slug}/politicas?tipo=devoluciones`} className="hover:opacity-80 transition-opacity">
                  Política de devoluciones
                </a>
              )}
              {store.policyShippingActive && store.policyShipping && (
                <a href={`/tienda/${store.slug}/politicas?tipo=envios`} className="hover:opacity-80 transition-opacity">
                  Política de envíos
                </a>
              )}
              {store.policyTermsActive && store.policyTerms && (
                <a href={`/tienda/${store.slug}/politicas?tipo=terminos`} className="hover:opacity-80 transition-opacity">
                  Términos y condiciones
                </a>
              )}
            </div>
          )}

          {/* Copyright */}
          <p className="text-center text-xs opacity-50">© {new Date().getFullYear()} {store.name}</p>
        </div>
      </footer>

      {store.showWhatsappButton && store.whatsappNumber && (
        <a
          href={socialUrl("whatsapp", store.whatsappNumber)}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-6 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </a>
      )}



      {affiliateId && (
        <div className="fixed bottom-5 left-5 z-20 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 shadow-sm">
          Compra atribuida a un afiliado
        </div>
      )}

      {selectedProduct && (() => {
        const imgs = parseImages(selectedProduct.images);
        const productReels = parseReelUrls(selectedProduct.reelUrls);
        const hasMany = imgs.length > 1;
        const clampedIdx = Math.min(imgIndex, imgs.length - 1);
        const totalStock = selectedProduct.variants.reduce((s, v) => s + v.stock, 0);
        const available = selectedProduct.variants.length === 0 || totalStock > 0;

        // attrGroups con disponibilidad cross-filtered según selección actual
        const attrGroupsModal: Record<string, { id: string; value: string; available: boolean }[]> = {};
        selectedProduct.variants.forEach((v) => {
          parseVariantAttrs(v).forEach(({ name: attrName, value: attrValue }) => {
            if (!attrValue) return;
            if (!attrGroupsModal[attrName]) attrGroupsModal[attrName] = [];
            if (!attrGroupsModal[attrName].find((e) => e.value === attrValue))
              attrGroupsModal[attrName].push({ id: `${v.id}:${attrName}:${attrValue}`, value: attrValue, available: false });
          });
        });
        Object.keys(attrGroupsModal).forEach((groupName) => {
          const otherSelected = { ...selectedAttrs };
          delete otherSelected[groupName];
          attrGroupsModal[groupName].forEach((item) => {
            item.available = selectedProduct.variants.some((v) => {
              if (v.stock === 0) return false;
              const va = Object.fromEntries(parseVariantAttrs(v).map((p) => [p.name, p.value]));
              if (va[groupName] !== item.value) return false;
              return Object.entries(otherSelected).every(([k, val]) => va[k] === val);
            });
          });
        });
        const resolvedVariant = Object.keys(selectedAttrs).length > 0
          ? selectedProduct.variants.find((v) => {
              const va = Object.fromEntries(parseVariantAttrs(v).map((p) => [p.name, p.value]));
              return Object.entries(selectedAttrs).every(([k, val]) => va[k] === val);
            }) ?? null
          : null;
        const needsSelection = selectedProduct.variants.length > 1;
        const isReady = !needsSelection || resolvedVariant !== null;
        const canZoomIn = imgs.length > 0 && zoomLevel < 3;
        const canZoomOut = zoomLevel > 1;

        const gallery = (
          <div
            className="relative h-72 w-full shrink-0 bg-gray-100 md:h-full md:w-[58%] md:shrink-0"
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (zoomLevel > 1) return;
              const diff = touchStartX.current - e.changedTouches[0].clientX;
              if (Math.abs(diff) > 40) {
                if (diff > 0) showImage(Math.min(clampedIdx + 1, imgs.length - 1));
                else showImage(Math.max(clampedIdx - 1, 0));
              }
            }}
          >
            {imgs.length > 0 ? (
              <div
                className="h-full w-full overflow-hidden select-none"
                style={{ cursor: zoomLevel > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in" }}
                onMouseDown={(e) => {
                  if (zoomLevel <= 1) return;
                  panRef.current = { active: true, moved: false, startX: e.clientX, startY: e.clientY, originX: panX, originY: panY };
                  setIsDragging(true);
                  e.preventDefault();
                }}
                onMouseMove={(e) => {
                  if (!panRef.current.active) return;
                  panRef.current.moved = true;
                  setPanX(panRef.current.originX + e.clientX - panRef.current.startX);
                  setPanY(panRef.current.originY + e.clientY - panRef.current.startY);
                }}
                onMouseUp={() => { panRef.current.active = false; setIsDragging(false); }}
                onMouseLeave={() => { panRef.current.active = false; setIsDragging(false); }}
                onClick={() => {
                  if (panRef.current.moved) { panRef.current.moved = false; return; }
                  if (zoomLevel > 1) { setZoomLevel(1); setPanX(0); setPanY(0); }
                  else setZoomLevel(2);
                }}
              >
                <img
                  src={imgs[clampedIdx]?.url ?? ""}
                  alt={selectedProduct.name}
                  draggable={false}
                  className="h-full w-full object-contain transition-transform duration-200"
                  style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`, transformOrigin: "center center" }}
                />
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package className="h-16 w-16 text-gray-200" />
              </div>
            )}
            {imgs.length > 0 && (
              <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomLevel((current) => Math.max(1, current - 0.5))}
                  disabled={!canZoomOut}
                  aria-label="Alejar imagen"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow transition disabled:opacity-40"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((current) => Math.min(3, current + 0.5))}
                  disabled={!canZoomIn}
                  aria-label="Acercar imagen"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow transition disabled:opacity-40"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
            )}
            {imgs.length > 0 && (
              <div className="absolute bottom-3 left-3 z-10 rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                {zoomLevel > 1 ? `${zoomLevel.toFixed(1)}x` : "Toca para zoom"}
              </div>
            )}
            {hasMany && clampedIdx > 0 && (
              <button type="button" onClick={() => showImage(clampedIdx - 1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 text-gray-700"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
            )}
            {hasMany && clampedIdx < imgs.length - 1 && (
              <button type="button" onClick={() => showImage(clampedIdx + 1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 text-gray-700"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            )}
            {hasMany && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {imgs.map((_, i) => (
                  <button key={i} type="button" onClick={() => showImage(i)}
                    className={`h-1.5 rounded-full transition-all ${i === clampedIdx ? "w-4 bg-white" : "w-1.5 bg-white/50"}`} />
                ))}
              </div>
            )}
          </div>
        );

        const content = (
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            <div className="p-5">
              {/* 1. Título + favorito */}
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-black text-gray-950">{selectedProduct.name}</h2>
                <button type="button" onClick={() => toggleFavorite(selectedProduct.id)}
                  aria-label={favoriteIds.has(selectedProduct.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                  className="shrink-0 h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-red-50 transition-colors">
                  <Heart className={`h-4 w-4 ${favoriteIds.has(selectedProduct.id) ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
                </button>
              </div>

              {/* 2. Precio */}
              {store.showPrices && (
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black" style={{ color: modalCfg.accentColor || store.primaryColor }}>
                      {money(selectedProduct.price, store.currency)}
                    </span>
                    {selectedProduct.comparePrice && selectedProduct.comparePrice > selectedProduct.price && (
                      <span className="text-sm text-gray-400 line-through">{money(selectedProduct.comparePrice, store.currency)}</span>
                    )}
                  </div>
                  {selectedProduct.precioMayorista && selectedProduct.cantMinMayorista && (
                    <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                      <Package className="h-3 w-3" />
                      Comprá {selectedProduct.cantMinMayorista}+ y pagá {money(selectedProduct.precioMayorista, store.currency)} c/u
                    </div>
                  )}
                </div>
              )}

              {/* 3. Variantes (colores + talles como chips) */}
              {Object.keys(attrGroupsModal).length > 0 && (
                <div className="mt-4 space-y-3">
                  {Object.entries(attrGroupsModal).map(([groupName, items]) => {
                    const isColor = groupName.toLowerCase().includes("color") || groupName.toLowerCase().includes("tono");
                    if (isColor && !modalCfg.showColors) return null;
                    if (!isColor && modalCfg.sizeChart) return null;
                    const selected = selectedAttrs[groupName];
                    return (
                      <div key={groupName}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                          {groupName}{selected ? <span className="ml-2 normal-case text-gray-700 font-bold">{selected}</span> : null}
                        </p>
                        {isColor ? (
                          <div className="flex flex-wrap gap-2">
                            {items.map((item) => {
                              const bg = variantToColor(item.value);
                              const isSelected = selected === item.value;
                              return bg ? (
                                <button key={item.id} type="button" title={item.value}
                                  onClick={() => selectAttr(groupName, item.value)}
                                  className={`h-7 w-7 rounded-full border-2 transition-all ${item.available ? "hover:scale-110 cursor-pointer" : "opacity-30 cursor-not-allowed"} ${isSelected ? "border-gray-800 ring-2 ring-offset-1 ring-gray-600 scale-110" : "border-gray-200"}`}
                                  style={{ backgroundColor: bg }} />
                              ) : (
                                <button key={item.id} type="button"
                                  onClick={() => selectAttr(groupName, item.value)}
                                  className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${item.available ? "cursor-pointer hover:bg-gray-50" : "cursor-not-allowed text-gray-300 line-through border-gray-100"} ${isSelected ? "border-gray-800 bg-gray-100 font-semibold text-gray-900" : "border-gray-200 text-gray-700"}`}>{item.value}</button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {items.map((item) => {
                              const isSelected = selected === item.value;
                              return (
                                <button key={item.id} type="button"
                                  onClick={() => selectAttr(groupName, item.value)}
                                  className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${item.available ? "cursor-pointer hover:bg-gray-50" : "cursor-not-allowed text-gray-300 line-through border-gray-100"} ${isSelected ? "border-gray-800 bg-gray-100 font-semibold text-gray-900" : "border-gray-200 text-gray-700"}`}>{item.value}</button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 4. Tabla de talles (cuando sizeChart está activo) */}
              {modalCfg.sizeChart && (() => {
                const isSizeKey = (name: string) =>
                  name.toLowerCase().includes("tall") ||
                  name.toLowerCase().includes("size") ||
                  name.toLowerCase().includes("talla");
                // Encontrar el nombre del atributo de talle
                const sizeGroupName = Object.keys(attrGroupsModal).find(isSizeKey) ?? null;
                // Filtrar variantes compatibles con la selección de attrs no-talle
                const nonSizeSelected = Object.fromEntries(
                  Object.entries(selectedAttrs).filter(([k]) => !isSizeKey(k))
                );
                const compatibleVariants = selectedProduct.variants.filter((v) => {
                  const va = Object.fromEntries(parseVariantAttrs(v).map((p) => [p.name, p.value]));
                  return Object.entries(nonSizeSelected).every(([k, val]) => va[k] === val);
                });
                const rows = compatibleVariants.map((v) => {
                  const pairs = parseVariantAttrs(v);
                  const sizeAttr = pairs.find((p) => isSizeKey(p.name));
                  return sizeAttr ? { ...v, sizeValue: sizeAttr.value } : null;
                }).filter(Boolean) as (Variant & { sizeValue: string })[];
                const uniqueRows = rows.filter((r, i) => rows.findIndex((x) => x.sizeValue === r.sizeValue) === i);
                if (uniqueRows.length === 0) return null;
                const selectedSize = sizeGroupName ? selectedAttrs[sizeGroupName] : null;
                return (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                      {modalCfg.sizeChartTitle}
                      {selectedSize && <span className="ml-2 normal-case text-gray-700 font-bold">{selectedSize}</span>}
                    </p>
                    <div className="overflow-hidden rounded-xl border border-gray-100">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ backgroundColor: (modalCfg.accentColor || store.primaryColor) + "15" }}>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700 text-xs">Talle</th>
                            <th className="px-3 py-2 text-center font-semibold text-gray-700 text-xs">Disponible</th>
                            <th className="px-3 py-2 text-center font-semibold text-gray-700 text-xs">Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uniqueRows.map((v, i) => {
                            const isSelected = selectedSize === v.sizeValue;
                            const rowBg = isSelected
                              ? (modalCfg.accentColor || store.primaryColor) + "20"
                              : i % 2 === 0 ? "white" : "#f9fafb";
                            return (
                              <tr key={v.id}
                                onClick={() => sizeGroupName && selectAttr(sizeGroupName, v.sizeValue)}
                                className={`transition-colors ${sizeGroupName ? (v.stock > 0 ? "cursor-pointer hover:bg-gray-100" : "cursor-not-allowed opacity-50") : ""}`}
                                style={{ backgroundColor: rowBg }}>
                                <td className="px-3 py-2 font-bold text-gray-900 flex items-center gap-2">
                                  {v.sizeValue}
                                  {isSelected && <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: modalCfg.accentColor || store.primaryColor }}>✓</span>}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {v.stock > 0
                                    ? <span className="font-bold text-emerald-500">✓</span>
                                    : <span className="font-bold text-red-400">✗</span>}
                                </td>
                                <td className="px-3 py-2 text-center text-xs text-gray-500">
                                  {v.stock > 0 ? `${v.stock} u.` : "Sin stock"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* 5. Botón de acción */}
              {isInquiry ? (
                <button
                  type="button"
                  onClick={() => { consultarWhatsApp(selectedProduct); closeProduct(); }}
                  disabled={!store.whatsappNumber}
                  className={`mt-5 flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-bold transition disabled:opacity-40 ${buttonRadius}`}
                  style={{ backgroundColor: "#25D366", color: "#fff" }}
                >
                  <MessageCircle className="h-4 w-4" />
                  Consultar por WhatsApp
                </button>
              ) : (
                <>
                  {selectionError && (
                    <p className="mt-3 text-center text-xs font-semibold text-red-500">
                      Elegí una variante para continuar
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={!available}
                    onClick={() => {
                      if (!available) return;
                      if (needsSelection && !isReady) { setSelectionError(true); return; }
                      if (resolvedVariant) {
                        addSpecificVariantToCart(selectedProduct, resolvedVariant);
                      } else if (!needsSelection && selectedProduct.variants.length === 1) {
                        addSpecificVariantToCart(selectedProduct, selectedProduct.variants[0]);
                      } else {
                        addToCart(selectedProduct);
                      }
                      closeProduct();
                    }}
                    className={`mt-3 flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-bold transition disabled:opacity-40 ${buttonRadius} ${selectionError ? "animate-pulse" : ""}`}
                    style={{ backgroundColor: modalCfg.accentColor || store.primaryColor, color: textColor }}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {!available ? "Sin stock" : needsSelection && !isReady ? "Elegí una variante" : (modalCfg.buttonText || "Agregar al carrito")}
                  </button>
                </>
              )}

              {/* 6. Videos del producto — arriba para mayor visibilidad */}
              {modalCfg.showReels && productReels.length > 0 && (
                <div className="mt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-gray-100" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Videos del producto</span>
                    <div className="h-px flex-1 bg-gray-100" />
                  </div>
                  <div
                    ref={reelsRef}
                    className="flex gap-3 overflow-x-auto pb-1"
                    style={{ scrollbarWidth: "none", cursor: "grab", touchAction: "pan-x", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
                    onPointerDown={(e) => {
                      const el = reelsRef.current;
                      if (!el) return;
                      reelsDrag.current = { isDown: true, startX: e.pageX, scrollLeft: el.scrollLeft, hasMoved: false };
                      el.style.cursor = "grabbing";
                    }}
                    onPointerMove={(e) => {
                      const drag = reelsDrag.current;
                      if (!drag.isDown) return;
                      const dx = e.pageX - drag.startX;
                      if (!drag.hasMoved && Math.abs(dx) < 5) return;
                      drag.hasMoved = true;
                      const el = reelsRef.current;
                      if (!el) return;
                      el.scrollLeft = drag.scrollLeft - dx;
                      el.querySelectorAll("video").forEach((v) => ((v as HTMLElement).style.pointerEvents = "none"));
                    }}
                    onPointerUp={() => {
                      reelsDrag.current.isDown = false;
                      const el = reelsRef.current;
                      if (!el) return;
                      el.style.cursor = "grab";
                      el.querySelectorAll("video").forEach((v) => ((v as HTMLElement).style.pointerEvents = ""));
                    }}
                    onPointerLeave={() => {
                      reelsDrag.current.isDown = false;
                      const el = reelsRef.current;
                      if (!el) return;
                      el.style.cursor = "grab";
                      el.querySelectorAll("video").forEach((v) => ((v as HTMLElement).style.pointerEvents = ""));
                    }}
                  >
                    {productReels.map((url, i) => (
                      <div key={i} className="relative shrink-0">
                        <video
                          src={url}
                          controls
                          className="h-56 w-32 rounded-2xl object-cover bg-black shadow-md"
                          style={{ minWidth: "8rem" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 7. Descripción */}
              {selectedProduct.description && modalCfg.showDescription && (
                <p className="mt-4 text-sm leading-relaxed text-gray-500">{selectedProduct.description}</p>
              )}
            </div>

            {/* Reviews section */}
            {modalCfg.showReviews && (
            <div className="border-t border-gray-100 p-5 pb-8">
              {/* Header con rating resumen */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-base">
                  Opiniones
                  {!reviewsLoading && reviewsTotal > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-400">{reviewsTotal} reseña{reviewsTotal !== 1 ? "s" : ""}</span>
                  )}
                </h3>
                {!reviewsLoading && reviewsAvg > 0 && (
                  <div className="flex items-center gap-1.5 bg-yellow-50 rounded-xl px-3 py-1.5">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-black text-gray-900">{reviewsAvg.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* Formulario de reseña */}
              {!reviewsLoading && canReview && !reviewSuccess && (
                <div className="mb-5 rounded-2xl bg-indigo-50 p-4 border border-indigo-100">
                  <p className="mb-3 text-sm font-semibold text-indigo-700">¿Qué te pareció este producto?</p>
                  <div className="mb-3 flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} type="button" onClick={() => setReviewRating(s)}>
                        <Star className={`h-8 w-8 transition-colors ${s <= reviewRating ? "fill-yellow-400 text-yellow-400" : "text-gray-200 hover:text-yellow-300"}`} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Contá tu experiencia (opcional)"
                    rows={3}
                    maxLength={1000}
                    className="w-full resize-none rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  {reviewError && <p className="mt-1 text-xs text-red-500">{reviewError}</p>}
                  <button
                    type="button"
                    disabled={reviewRating === 0 || reviewSubmitting}
                    onClick={submitReview}
                    className="mt-3 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40 hover:bg-indigo-700 transition-colors"
                  >
                    {reviewSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Publicar reseña
                  </button>
                </div>
              )}
              {reviewSuccess && (
                <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700 flex items-center gap-2">
                  <Star className="h-4 w-4 fill-green-500 text-green-500 shrink-0" />
                  ¡Gracias! Tu reseña ya está publicada.
                </div>
              )}
              {!reviewsLoading && userReview && !reviewSuccess && (
                <div className="mb-4 rounded-2xl bg-gray-50 p-4 border border-gray-100">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Tu reseña</p>
                  <div className="flex gap-0.5 mb-1.5">
                    {[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`h-4 w-4 ${s <= userReview.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />)}
                  </div>
                  {userReview.comment && <p className="text-sm text-gray-600">{userReview.comment}</p>}
                </div>
              )}

              {reviewsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-300" /></div>
              ) : productReviews.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">Todavía no hay reseñas para este producto.</p>
              ) : (
                <div className="space-y-0">
                  {productReviews.map((r) => (
                    <div key={r.id} className="border-b border-gray-50 py-4 last:border-0">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 font-bold text-indigo-600 text-xs">
                          {r.user.image ? <img src={r.user.image} alt="" className="h-full w-full object-cover" /> : (r.user.name?.[0]?.toUpperCase() ?? "?")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{r.user.name || "Comprador"}</p>
                          <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}</p>
                        </div>
                        <div className="flex gap-0.5 shrink-0">
                          {[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />)}
                        </div>
                      </div>
                      {r.comment && <p className="mt-2 ml-10 text-sm text-gray-600 leading-relaxed">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
          </div>
        );

        return (
          <div className="fixed inset-0 z-50">
            <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeProduct} />
            {/* Mobile: flex-col bottom sheet | Desktop: flex-row centered */}
            <div className="absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:inset-0 md:m-auto md:h-[82vh] md:max-w-3xl md:flex-row md:rounded-3xl">
              <button type="button" onClick={closeProduct}
                className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow backdrop-blur-sm">
                <X className="h-4 w-4 text-gray-700" />
              </button>
              {gallery}
              {content}
            </div>
          </div>
        );
      })()}

      {openCart && !isInquiry && (
        <div className="fixed inset-0 z-40">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setOpenCart(false)} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white text-gray-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-lg font-bold text-gray-900">Checkout</p>
                <p className="text-xs text-gray-400">Pedido para {store.name}</p>
              </div>
              <button type="button" onClick={() => setOpenCart(false)} className="rounded-full p-2 text-gray-400 hover:bg-gray-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitCheckout} className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {successOrderId && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                    <p className="font-bold mb-1">¡Pedido creado con éxito!</p>
                    <p>La tienda va a confirmarlo cuando reciba el pago. Te llegará un email con los detalles.</p>
                  </div>
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm">
                    <p className="font-semibold text-indigo-800 mb-1">¿Querés comprar más fácil la próxima vez?</p>
                    <p className="text-indigo-500 text-xs mb-3">Creá tu cuenta gratis en TiendaApps y guardá tus favoritos, historial de pedidos y datos de envío.</p>
                    <a
                      href="https://tiendaapps.com/registro?plan=buyer"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors"
                    >
                      Crear cuenta gratis →
                    </a>
                  </div>
                </div>
              )}
              {checkoutError && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{checkoutError}</div>}

              <div className="space-y-3">
                {cart.length === 0 ? (
                  <p className="text-sm text-gray-400">El carrito esta vacio.</p>
                ) : (
                  cart.map((item) => (
                    <div key={`${item.productId}:${item.variantId ?? "base"}`} className="flex gap-3 rounded-2xl border border-gray-100 p-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                        <ProductImage image={item.image} name={item.name} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{item.name}</p>
                        {item.variantLabel && <p className="text-xs text-gray-400">{item.variantLabel}</p>}
                        {item.precioMayorista && item.cantMinMayorista && item.quantity >= item.cantMinMayorista ? (
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-indigo-600">{money(item.precioMayorista, store.currency)}</p>
                            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">Mayor</span>
                          </div>
                        ) : (
                          <p className="text-sm font-bold text-gray-900">{money(item.price, store.currency)}</p>
                        )}
                        {item.cantMinMayorista && (
                          <p className="text-[10px] text-gray-400">Mín. {item.cantMinMayorista} u.</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => changeQty(item.productId, item.variantId, -1)} className="rounded-lg border border-gray-200 p-1">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                        <button type="button" onClick={() => changeQty(item.productId, item.variantId, 1)} className="rounded-lg border border-gray-200 p-1">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <>
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-gray-900">Datos del comprador</p>
                    <input required value={customer.name} onChange={(e) => updateCustomer("name", e.target.value)} placeholder="Nombre y apellido" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    <input required type="email" value={customer.email} onChange={(e) => updateCustomer("email", e.target.value)} placeholder="Email" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    <input value={customer.phone} onChange={(e) => updateCustomer("phone", e.target.value)} placeholder="Telefono" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    <input value={customer.street} onChange={(e) => updateCustomer("street", e.target.value)} placeholder="Direccion" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    <div className="grid grid-cols-2 gap-2">
                      <input value={customer.city} onChange={(e) => updateCustomer("city", e.target.value)} placeholder="Ciudad" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                      <input value={customer.province} onChange={(e) => updateCustomer("province", e.target.value)} placeholder="Provincia" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <input value={customer.postalCode} onChange={(e) => updateCustomer("postalCode", e.target.value)} placeholder="Codigo postal" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={saveCustomerData}
                      onChange={(e) => setSaveCustomerData(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 accent-indigo-500"
                    />
                    <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors select-none">
                      Recordar mis datos para la próxima compra
                    </span>
                  </label>

                  <div className="space-y-2">
                    <p className="text-sm font-bold text-gray-900">Envio</p>
                    {SHIPPING_OPTIONS.map((option) => (
                      <label key={option.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm">
                        <span><input type="radio" name="shipping" checked={shippingMethod === option.id} onChange={() => setShippingMethod(option.id)} className="mr-2" />{option.label}</span>
                        <span className="font-semibold">{option.cost ? money(option.cost, store.currency) : "Gratis"}</span>
                      </label>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-bold text-gray-900">Pago</p>
                    {paymentOptions.map((option) => (
                      <label
                        key={option.id}
                        className={`block cursor-pointer rounded-xl border px-3 py-2 text-sm ${
                          option.id === "mercadopago"
                            ? "border-[#009EE3] bg-[#f0faff]"
                            : "border-gray-200"
                        }`}
                      >
                        <input type="radio" name="payment" checked={paymentProvider === option.id} onChange={() => setPaymentProvider(option.id)} className="mr-2" />
                        {option.id === "mercadopago" && (
                          <span className="inline-block mr-1.5 align-middle">
                            <svg width="16" height="16" viewBox="0 0 32 32" fill="none" style={{ display:"inline", verticalAlign:"middle" }}>
                              <rect width="32" height="32" rx="8" fill="#009EE3"/>
                              <path d="M6 16.5C6 16.5 9.5 11 16 11C22.5 11 26 16.5 26 16.5C26 16.5 22.5 22 16 22C9.5 22 6 16.5 6 16.5Z" fill="white"/>
                              <circle cx="16" cy="16.5" r="3.5" fill="#009EE3"/>
                            </svg>
                          </span>
                        )}
                        {option.label}
                      </label>
                    ))}
                  </div>

                  <textarea value={customer.notes} onChange={(e) => updateCustomer("notes", e.target.value)} placeholder="Notas para la tienda" rows={3} className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />

                  {/* Cupón */}
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm">
                      <span className="font-semibold text-green-700">Cupón <code className="font-black">{appliedCoupon.code}</code> aplicado</span>
                      <button type="button" onClick={() => setAppliedCoupon(null)} className="text-xs text-green-600 underline hover:text-green-800">Quitar</button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                          placeholder="Código de cupón"
                          maxLength={20}
                          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono uppercase outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={applyCoupon}
                          disabled={couponLoading || !couponInput.trim()}
                          className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                        >
                          {couponLoading ? "..." : "Aplicar"}
                        </button>
                      </div>
                      {couponError && <p className="text-xs text-red-500">{couponError}</p>}
                    </div>
                  )}

                  <div className="rounded-2xl bg-gray-50 p-4 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal, store.currency)}</strong></div>
                    {couponDiscount > 0 && <div className="mt-1 flex justify-between text-green-600"><span>Descuento</span><strong>-{money(couponDiscount, store.currency)}</strong></div>}
                    <div className="mt-1 flex justify-between"><span>Envio</span><strong>{shipping.cost ? money(shipping.cost, store.currency) : "Gratis"}</strong></div>
                    <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-base"><span>Total</span><strong>{money(total, store.currency)}</strong></div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50 ${
                      paymentProvider === "mercadopago" ? "bg-[#009EE3] hover:bg-[#0088c7]" : "bg-gray-950"
                    }`}
                  >
                    {submitting ? (
                      <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    ) : paymentProvider === "mercadopago" ? (
                      "Pagar con MercadoPago →"
                    ) : (
                      "Crear pedido"
                    )}
                  </button>
                </>
              )}
            </form>
          </aside>
        </div>
      )}
    </div>
    </>
  );
}
