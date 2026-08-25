"use client";
import { barraMs } from "@/types/store-config";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FadeImage } from "@/components/store/templates/shared/FadeImage";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { usePushBell } from "@/contexts/PushBellContext";
import { useSesion } from "@/components/AuthProvider";
import StoreFollowButton from "@/components/store/StoreFollowButton";
import { EditableZone, EditableImageButton, EditableSectionBg, BgDragHandle, getContrastColor, getReadableAccentText, useEditContext, textoSobre } from "@/contexts/EditContext";
import { useStorefront, isDemoProductId, type StorefrontProduct } from "@/hooks/useStorefront";
import { useCartLogic } from "@/hooks/useCartLogic";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ContactForm } from "@/components/store/templates/shared/ContactForm";
import { CartDrawer, type CartTheme } from "@/components/store/templates/shared/CartDrawer";
import { resolveProductPromo, describePromo } from "@/lib/promoDisplay";
import { PromoTag } from "@/components/store/PromoDisplay";
import type { ActivePromotion } from "@/lib/pricing";
import { CheckoutModal } from "@/components/store/templates/shared/CheckoutModal";
import { PromoBannerCarousel } from "@/components/store/templates/shared/PromoBannerCarousel";
import { SectionBlock } from "@/components/store/templates/shared/SectionBlock";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import type { ImageOverride } from "@/types/store-config";
import { linksLegales } from "@/lib/politicas-tienda";
import { CAPAS } from "@/lib/capas-tienda";

function smoothScrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}
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
  return getContrastColor(bg) === "light" ? "rgba(255,255,255,0.6)" : "#6b7280";
}
function SectionOverlay({ ov }: { ov: ImageOverride | undefined }) {
  if (!ov?.url || ov.overlayType === "none") return null;
  return (
    <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none",
      background: ov.overlayType==="light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.55})` }} />
  );
}
// Para fotos simples (hero, nosotros, contacto) que siempre muestran una imagen
// (de stock o subida) — a diferencia de los fondos de sección, acá la capa se
// aplica en cuanto el dueño la elige, aunque todavía no haya subido una foto propia.
function PhotoOverlay({ ov }: { ov: ImageOverride | undefined }) {
  if (!ov?.overlayType || ov.overlayType === "none") return null;
  return (
    <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none",
      background: ov.overlayType==="light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.55})` }} />
  );
}
function fmtPrice(n: number, currency: string) {
  return `${currency === "ARS" ? "$" : currency} ${n.toLocaleString("es-AR")}`;
}

const DEPARTAMENTOS_DEFAULT = [
  { id: "electrodomesticos", label: "Electrodomésticos" },
  { id: "pequenos-electrodomesticos", label: "Pequeños Electro" },
  { id: "celulares-y-accesorios", label: "Celulares" },
  { id: "informatica-y-gaming", label: "Informática y Gaming" },
  { id: "audio-imagen-y-video", label: "Audio y TV" },
  { id: "muebles-y-colchones", label: "Muebles y Colchones" },
  { id: "casa-y-jardin", label: "Casa y Jardín" },
];
const CATEGORY_OPTIONS = DEPARTAMENTOS_DEFAULT.map(d => ({ id: d.id, label: d.label }));

// Lista fija de siluetas para los círculos de "Comprá por departamento".
// El índice elegido para cada departamento se guarda en overrides (dept{i}IconIdx)
// y se puede cambiar con el botón "↻" en modo edición — no depende de la categoría.
function makeCategoryIcons(color: string): React.ReactNode[] {
  const common = { width: 30, height: 30, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return [
    <svg key="fridge" {...common}><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="5" y1="10" x2="19" y2="10"/><line x1="8.5" y1="6" x2="8.5" y2="6"/><line x1="8.5" y1="14" x2="8.5" y2="14"/></svg>,
    <svg key="blender" {...common}><path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><line x1="7" y1="3" x2="7" y2="6"/><line x1="11" y1="3" x2="11" y2="6"/></svg>,
    <svg key="phone" {...common}><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>,
    <svg key="monitor" {...common}><rect x="3" y="4" width="18" height="12" rx="1.5"/><line x1="8" y1="20" x2="16" y2="20"/><line x1="12" y1="16" x2="12" y2="20"/></svg>,
    <svg key="tv" {...common}><rect x="3" y="5" width="18" height="13" rx="1.5"/><path d="M10 9l4 2.5-4 2.5V9z" fill={color} stroke="none"/><line x1="8" y1="21" x2="16" y2="21"/></svg>,
    <svg key="sofa" {...common}><path d="M4 12V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M3 12h18v5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5z"/><line x1="5" y1="18" x2="5" y2="20"/><line x1="19" y1="18" x2="19" y2="20"/></svg>,
    <svg key="leaf" {...common}><path d="M12 21c-4-2-7-6-7-10a7 7 0 0 1 14 0c0 4-3 8-7 10z"/><line x1="12" y1="21" x2="12" y2="11"/></svg>,
    <svg key="bolt" {...common}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    <svg key="gift" {...common}><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
  ];
}

const CONFIANZA = [
  { fv: "trust1Title", fl: "trust1Desc", t: "Cuotas con tarjeta",   d: "Pagá en cuotas con tu tarjeta de crédito" },
  { fv: "trust2Title", fl: "trust2Desc", t: "Garantía oficial",    d: "Todos los productos con garantía del vendedor" },
  { fv: "trust3Title", fl: "trust3Desc", t: "Retiro en local",     d: "Coordiná el retiro sin costo de envío" },
  { fv: "trust4Title", fl: "trust4Desc", t: "Envío a todo el país", d: "Recibí tu compra donde estés" },
];

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

// Íconos cambiables con el botón "↻" en modo edición (mismo patrón que FashionNoir/AutoDrive)
const TRUST_ICONS: React.ReactNode[] = [
  <svg key="card" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  <svg key="shield" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  <svg key="store" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l1-5h16l1 5"/><path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/><path d="M4 9v10h16V9"/></svg>,
  <svg key="truck" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  <svg key="bolt" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  <svg key="gift" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
];

function ProductCard({ product, href, currency, isFavorite, onToggleFavorite, editMode, promotions }: {
  product: StorefrontProduct; href: string; currency: string; isFavorite: boolean; onToggleFavorite: () => void; editMode?: boolean; promotions?: ActivePromotion[];
}) {
  // Promo de tienda (Fase 4.5): el resolver dice qué mostrar (tachado + efectivo, o
  // un badge de 3×2 / envío gratis / condicional). Tiene prioridad sobre la "oferta"
  // (comparePrice), que es el precio de lista tachado del propio producto.
  const promo = resolveProductPromo(product, promotions);
  const compareDiscount = product.comparePrice && product.comparePrice > product.price ? Math.round((1 - product.price / product.comparePrice) * 100) : null;
  // Color de la NOTA del beneficio (no del tag): verde 3×2, teal envío, rojo % / monto.
  const badgeColor = promo.nxm ? "#16a34a" : (promo.freeShipping && !promo.hasPriceDrop && promo.pctOff == null) ? "#0d9488" : "#dc2626";
  // Los demos de relleno no existen en la base: antes de guardar el template, la tienda
  // pública todavía resuelve con el tipoTienda viejo y el detalle da "no disponible".
  const isUnclickableDemo = !editMode && isDemoProductId(product.id);
  return (
    <Link href={href} className="ep-card" onClick={e => { if (isUnclickableDemo) e.preventDefault(); }}
      style={{ textDecoration:"none", color:"inherit", background:"#fff", borderRadius:14, border:"1px solid #f0f0f0", overflow:"hidden", display:"block", cursor: isUnclickableDemo ? "default" : "pointer" }}>
      <div style={{ aspectRatio:"1/1", background:"#f8fafc", position:"relative" }}>
        {/* PROMO de tienda → tag naranja rectangular. OFERTA del producto → pill rojo. */}
        {promo.primaryPromo ? (
          <PromoTag tipo={promo.primaryPromo.type} label={describePromo(promo.primaryPromo).headline} size="sm" />
        ) : compareDiscount ? (
          <div style={{ position:"absolute", top:10, left:10, zIndex:1, background:"#dc2626", color:"#fff", fontSize:11, fontWeight:800, padding:"4px 9px", borderRadius:100 }}>{compareDiscount}% OFF</div>
        ) : null}
        <button onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(); }}
          aria-label="Favorito"
          style={{ position:"absolute", top:8, right:8, zIndex:1, width:30, height:30, borderRadius:"50%", background:"rgba(255,255,255,0.9)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill={isFavorite ? "#dc2626" : "none"} stroke={isFavorite ? "#dc2626" : "#6b7280"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        {product.images[0] ? (
          <FadeImage src={product.images[0]} alt={product.name} fill sizes="(max-width: 768px) 50vw, 25vw" style={{ objectFit:"cover" }} />
        ) : (
          <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"#cbd5e1", fontSize:13 }}>Sin imagen</div>
        )}
      </div>
      <div style={{ padding:"14px 16px" }}>
        <p style={{ margin:"0 0 6px", fontSize:13, fontWeight:600, color:"#111827", lineHeight:1.4, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{product.name}</p>
        {promo.hasPriceDrop ? (
          <>
            <p style={{ margin:0, fontSize:16, fontWeight:800, color:"#dc2626" }}>{fmtPrice(promo.effectivePrice, currency)}</p>
            <p style={{ margin:"2px 0 0", fontSize:12, color:"#9ca3af", textDecoration:"line-through" }}>{fmtPrice(promo.originalPrice, currency)}</p>
          </>
        ) : (
          <>
            <p style={{ margin:0, fontSize:16, fontWeight:800, color:"#111827" }}>{fmtPrice(product.price, currency)}</p>
            {product.comparePrice && product.comparePrice > product.price && (
              <p style={{ margin:"2px 0 0", fontSize:12, color:"#9ca3af", textDecoration:"line-through" }}>{fmtPrice(product.comparePrice, currency)}</p>
            )}
          </>
        )}
        {/* Nota clara del beneficio cuando no es un tachado directo (3×2 / condicional / envío). */}
        {promo.nxm && <p style={{ margin:"3px 0 0", fontSize:11.5, color:badgeColor, fontWeight:700 }}>Llevá {promo.nxm.n}, pagá {promo.nxm.m}</p>}
        {promo.pctOff != null && promo.minOrder != null && <p style={{ margin:"3px 0 0", fontSize:11.5, color:badgeColor, fontWeight:700 }}>{promo.pctOff}% desde {fmtPrice(promo.minOrder, currency)}</p>}
        {promo.freeShipping && !promo.nxm && !promo.hasPriceDrop && promo.pctOff == null && (
          <p style={{ margin:"3px 0 0", fontSize:11.5, color:badgeColor, fontWeight:700 }}>{promo.minOrder ? `Envío gratis desde ${fmtPrice(promo.minOrder, currency)}` : "Envío gratis"}</p>
        )}
        <p style={{ margin:"6px 0 0", fontSize:10.5, color:"#ea580c", fontWeight:600 }}>Pagá en cuotas con tarjeta</p>
      </div>
    </Link>
  );
}

const EP_SECTION_IDS = ["ep-departamentos", "ep-confianza", "ep-ofertas", "ep-productos", "ep-promo", "ep-mayorista", "ep-nosotros", "ep-contacto"];

export default function ElectroPrime() {
  const config    = useStoreConfig();
  const pushBell  = usePushBell();
  const storefront = useStorefront();
  const { products, promotions, loadingProducts, isWholesale } = storefront;
  const cart = useCartLogic(storefront);
  const {
    favorites, favoritesOpen, setFavoritesOpen, favoriteProducts, toggleFavorite,
    cartCount, setCartOpen, toastMsg,
  } = cart;
  const { editMode, overrides, setOverride } = useEditContext();
  useScrollReveal();
  // editMode se activa apenas se entra a "Editando" un diseño, pero el tipoTienda
  // real recién queda persistido en la base cuando se aprieta "Guardar cambios".
  // Hasta entonces, la tienda pública no resuelve los productos demo de relleno.
  const canOpenDemo = editMode && !!config?.templateSaved;
  const isPreview = !!config?.previewFill;
  const isOwner   = !!config?.isOwner;
  const accent    = config?.colors.accent ?? "#ea580c";
  // El texto que va ARRIBA de un relleno pintado con el acento. Viaja en
  // `cartTheme` al CartDrawer y al CheckoutModal compartidos, asi que si esta mal
  // se rompe el carrito y el checkout enteros.
  //
  // Estaba INVERTIDO: `getContrastColor(X) === "light"` significa "sobre X va texto
  // CLARO", y la rama devolvia el oscuro. Con el acento de fabrica de este template
  // daba un contraste ilegible. `textoSobre` mide con el ratio real de WCAG y no
  // puede equivocarse de lado.
  const accentText = textoSobre(accent);
  // El acento se usa como color de TEXTO en varias secciones (no como fondo de
  // botón, eso ya lo resuelve accentText) — cada sección puede tener su propio
  // fondo personalizado, así que validamos contra el de cada una puntualmente.
  const accentOn = (bg: string, fallback: string) => getReadableAccentText(accent, bg, fallback);
  const cartTheme: CartTheme = { BG:"#ffffff", S:"#fafafa", T:"#111111", MID:"#6b7280", border:"#e5e5e5", accent, accentText };
  const currency  = config?.currency ?? "ARS";
  const storeName = config?.storeName ?? "ELECTRO PRIME";
  const whatsapp  = config?.whatsapp ?? { enabled:false, number:"", message:"" };
  // En modo edición lo mostramos con solo activarlo, para que se pueda previsualizar
  // antes de completar el número; en la tienda real hace falta el número sí o sí.
  const showWA    = whatsapp.enabled && (editMode || !!whatsapp.number);

  const { cargando, logueado, nombreMostrado, panelHref, panelLabel, signOut } = useSesion();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) setUserDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const iovr = config?.imageOverrides ?? {};
  const sc   = config?.sectionColors  ?? {};

  const heroBg      = sc["bgHero"] ?? "#111827";
  const heroImg     = iovr["sectionbg_bgHero"];
  const heroText    = secText(heroImg, heroBg);
  const heroMid     = secMid(heroImg, heroBg);
  const heroImgUrl  = iovr["heroImage"]?.url ?? "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1200&q=80";

  const depBg       = sc["bgDepartamentos"] ?? "#ffffff";
  const depImg      = iovr["sectionbg_bgDepartamentos"];
  const depText     = secText(depImg, depBg);

  const trustBg     = sc["bgConfianza"] ?? "#f8fafc";
  const trustImg    = iovr["sectionbg_bgConfianza"];
  const trustText   = secText(trustImg, trustBg);
  const trustMid    = secMid(trustImg, trustBg);

  const ofertasBg   = sc["bgOfertas"] ?? "#fff7ed";
  const ofertasImg  = iovr["sectionbg_bgOfertas"];
  const ofertasText = secText(ofertasImg, ofertasBg);

  const prodBg      = sc["bgProductos"] ?? "#ffffff";
  const prodImg     = iovr["sectionbg_bgProductos"];
  const prodText    = secText(prodImg, prodBg);

  const nosotrosBg  = sc["bgNosotros"] ?? "#f8fafc";
  const nosotrosImg = iovr["sectionbg_bgNosotros"];
  const nosText     = secText(nosotrosImg, nosotrosBg);
  const nosMid      = secMid(nosotrosImg, nosotrosBg);
  const nosotrosUrl = iovr["nosotrosImage"]?.url ?? "https://images.unsplash.com/photo-1556911073-38141963c9e0?auto=format&fit=crop&w=900&q=80";

  const contactImgUrl = iovr["contactImage"]?.url ?? "https://images.unsplash.com/photo-1556909114-44e3e70034e2?auto=format&fit=crop&w=900&q=80";
  const contactoBg  = sc["bgContacto"] ?? "#111827";
  const contactoImg = iovr["sectionbg_bgContacto"];
  const contactoText = secText(contactoImg, contactoBg);

  const footerBg    = sc["bgFooter"] ?? "#0a0a0a";
  const footerImg   = iovr["sectionbg_bgFooter"];
  const ftText      = secText(footerImg, footerBg);
  const ftMid       = secMid(footerImg, footerBg);

  const navBg       = sc["navBg"] ?? "#ffffff";
  const navDark     = getContrastColor(navBg) === "light";
  const navText     = navDark ? "#ffffff" : "#111827";
  const navTextMid  = navDark ? "rgba(255,255,255,0.7)" : "#6b7280";
  const navBorder   = navDark ? "rgba(255,255,255,0.15)" : "#e5e7eb";

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [annIdx, setAnnIdx]     = useState(0);
  const [annVisible, setAnnVisible] = useState(true);
  const ofertasScrollRef = useRef<HTMLDivElement>(null);
  function scrollOfertas(dir: 1 | -1) {
    const el = ofertasScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }

  const DEFAULTS = ["💳 Hasta 12 cuotas con tarjeta", "🛡️ Garantía oficial en todos los productos", "🚚 Envío a todo el país"];
  const promoBannerEnabled = config?.promoBanner?.enabled !== false;
  const annMessages = (config?.promoBanner?.messages?.filter(m => m.trim()) ?? []).length > 0
    ? config!.promoBanner!.messages!.filter(m => m.trim())
    : DEFAULTS;
  const showAnn = promoBannerEnabled && annVisible;
  const PROMO_H = 36;
  const NAV_H   = 64;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Cada cuanto rota el MENSAJE de la barra de promocion. Lo elige la duena;
     antes eran 3,5 segundos escritos a mano en los nueve templates que la
     dibujan. Ojo que NO es el carrusel de fotos: ese es `carruselMs`. */
  const msBarra = barraMs(config?.promoBanner?.intervalMs);
  useEffect(() => {
    if (!showAnn || annMessages.length <= 1) return;
    const id = setInterval(() => setAnnIdx(i => (i + 1) % annMessages.length), msBarra);
    return () => clearInterval(id);
  }, [showAnn, annMessages.length, msBarra]);

  /* Ver el comentario igual en Casa Clara: la casilla "Destacado" se sacó del
     formulario, así que filtrar por ella era filtrar por algo inmutable. */
  const showcased = products.slice(0, 8);
  const hasMore   = products.length > 8;
  const allOfertas = products.filter(p => p.comparePrice && p.comparePrice > p.price);
  const ofertas    = allOfertas.slice(0, 8);
  const hasMoreOfertas = allOfertas.length > 8;
  const catalogHref = `/tienda/${config?.slug ?? ""}/productos?t=electro-prime${isPreview ? "&from=editor" : ""}`;

  return (
    <div style={{ background:"#ffffff", color:"#111111", fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", minHeight:"100vh" }}>
      <style>{`
        .ep-nav-links { display:none }
        @media(min-width:768px){ .ep-nav-links { display:flex } .ep-burger { display:none } }
        .ep-dep-grid { display:flex; gap:14px; overflow-x:auto; padding-bottom:4px; scrollbar-width:none; justify-content:center; flex-wrap:wrap }
        .ep-dep-grid::-webkit-scrollbar { display:none }
        .ep-ofertas-row { scrollbar-width:none }
        .ep-ofertas-row::-webkit-scrollbar { display:none }
        .ep-dept-icon:hover > div { opacity:1 }
        .ep-trust-grid { grid-template-columns:repeat(2,1fr) }
        @media(min-width:768px){ .ep-trust-grid { grid-template-columns:repeat(4,1fr) } }
        .ep-prod-grid { grid-template-columns:repeat(2,1fr) }
        @media(min-width:640px){ .ep-prod-grid { grid-template-columns:repeat(3,1fr) } }
        @media(min-width:1024px){ .ep-prod-grid { grid-template-columns:repeat(4,1fr) } }
        .ep-about { grid-template-columns:1fr }
        @media(min-width:768px){ .ep-about { grid-template-columns:1fr 1fr } }
        .ep-card { transition:box-shadow 0.2s, transform 0.2s }
        .ep-card:hover { box-shadow:0 10px 30px rgba(0,0,0,0.1); transform:translateY(-3px) }
        @keyframes ep-spin { to { transform:rotate(360deg) } }
        .ep-megamenu { opacity:0; visibility:hidden; transform:translateY(-6px); transition:all 0.18s; }
        .ep-mega-wrap:hover .ep-megamenu, .ep-megamenu:hover { opacity:1; visibility:visible; transform:translateY(0); }
      `}</style>

      {/* ── PROMO BAR ── */}
      {showAnn && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top:0,
          left: isPreview ? undefined : 0, right: isPreview ? undefined : 0,
          zIndex: isPreview ? 10001 : 110, height:PROMO_H, background:accent,
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          {(() => {
            const bannerText = getContrastColor(accent) === "light" ? "#ffffff" : "#111111";
            return (
              <>
                <span style={{ fontSize:11, fontWeight:600, color:bannerText, letterSpacing:0.5 }}>{annMessages[annIdx]}</span>
                <button onClick={() => setAnnVisible(false)}
                  style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:bannerText, cursor:"pointer", fontSize:16, opacity:0.7 }}>×</button>
              </>
            );
          })()}
        </div>
      )}

      {/* ── NAV ── */}
      <nav style={{ position: isPreview ? "sticky" : "fixed", top: showAnn ? PROMO_H : 0,
        left: isPreview ? undefined : 0, right: isPreview ? undefined : 0, zIndex: isPreview ? 10000 : 100,
        background:navBg, borderBottom: scrolled ? `1px solid ${navBorder}` : "1px solid transparent",
        boxShadow: scrolled ? "0 2px 16px rgba(0,0,0,0.06)" : "none", transition:"all 0.3s", padding:"0 24px" }}>
        <div style={{ maxWidth:1240, margin:"0 auto", height:NAV_H, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontWeight:900, fontSize:18, color:navText, letterSpacing:-0.5 }}>
            <EditableZone field="storeName" label="Nombre de la tienda">{storeName}</EditableZone>
          </div>
          <div className="ep-nav-links" style={{ gap:30, alignItems:"center" }}>
            <div className="ep-mega-wrap" style={{ position:"relative" }}>
              <button onClick={() => smoothScrollTo("departamentos")}
                style={{ background:"none", border:"none", color:navTextMid, cursor:"pointer", fontSize:13, fontWeight:500, display:"flex", alignItems:"center", gap:4 }}>
                Departamentos <span style={{ fontSize:9 }}>▾</span>
              </button>
              <div className="ep-megamenu" style={{ position:"absolute", top:"calc(100% + 12px)", left:"50%", transform:"translateX(-50%)",
                background:"#fff", borderRadius:12, boxShadow:"0 16px 40px rgba(0,0,0,0.14)", padding:"14px", display:"grid",
                gridTemplateColumns:"repeat(2, 160px)", gap:"4px 18px", zIndex:CAPAS.nav }}>
                {CATEGORY_OPTIONS.map(c => (
                  <Link key={c.id} href={`/tienda/${config?.slug ?? ""}/productos?categoria=${c.id}&t=electro-prime${isPreview ? "&from=editor" : ""}`}
                    style={{ padding:"8px 10px", borderRadius:8, fontSize:12.5, color:"#374151", textDecoration:"none", whiteSpace:"nowrap" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    {c.label}
                  </Link>
                ))}
              </div>
            </div>
            {[["Productos","productos"],["Nosotros","nosotros"],["Contacto","contacto"]].map(([lbl,id]) => (
              <button key={id} onClick={() => smoothScrollTo(id)}
                style={{ background:"none", border:"none", color:navTextMid, cursor:"pointer", fontSize:13, fontWeight:500 }}>
                {lbl}
              </button>
            ))}
            <Link href={catalogHref} style={{ background:accent, color: getContrastColor(accent)==="light"?"#fff":"#111",
              padding:"9px 20px", fontSize:12, fontWeight:700, textDecoration:"none", borderRadius:8 }}>
              Ver catálogo
            </Link>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <button onClick={() => { setFavoritesOpen(true); setCartOpen(false); }} aria-label="Favoritos"
              style={{ position:"relative", background:"none", border:"none", color:navTextMid, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill={favorites.length > 0 ? accent : "none"} stroke={favorites.length > 0 ? accent : "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {favorites.length > 0 && <span style={{ position:"absolute", top:-4, right:-4, background:accent, color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{favorites.length}</span>}
            </button>
            {pushBell && config?.showPushBell && !isPreview && (
              <StoreFollowButton storeSlug={config?.slug ?? ""} color={navTextMid} size={20} />
            )}
            {pushBell && config?.showPushBell && !isPreview && (
              <button onClick={pushBell.openDrawer}
                style={{ position:"relative", background:"none", border:"none", color:navTextMid, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill={pushBell.followState==="following"?"currentColor":"none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {pushBell.hasNew && <span style={{ position:"absolute", top:2, right:2, width:10, height:10, background:"#ef4444", borderRadius:"50%", border:`2px solid ${navBg}` }} />}
              </button>
            )}
            <div ref={userDropdownRef} style={{ position:"relative" }}>
              <button onClick={() => setUserDropdownOpen(o => !o)}
                style={{ background:"none", border:"none", color:navTextMid, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </button>
              {userDropdownOpen && (
                <div style={{ position:"absolute", top:"calc(100% + 10px)", right:0, background:"#fff", border:`1px solid ${navBorder}`, minWidth:190, zIndex:CAPAS.flotante, boxShadow:"0 8px 28px rgba(0,0,0,0.18)", borderRadius:10, overflow:"hidden" }}>
                  {cargando ? (<p style={{ padding:"14px 16px", margin:0, fontSize:12, opacity:0.55 }}>Cargando…</p>) : logueado ? (
                    <>
                      <p style={{ padding:"10px 16px 4px", fontSize:11, color:"#9ca3af", margin:0, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{nombreMostrado}</p>
                      <a href={panelHref} onClick={() => setUserDropdownOpen(false)} style={{ display:"block", padding:"10px 16px", fontSize:13, color:"#111827", textDecoration:"none", borderBottom:"1px solid #f1f1f1" }}>{panelLabel}</a>
                      <button onClick={() => { if (isPreview) return; setUserDropdownOpen(false); signOut("/"); }}
                        style={{ display:"block", width:"100%", padding:"10px 16px", fontSize:13, color:"#dc2626", background:"none", border:"none", textAlign:"left", cursor: isPreview ? "default" : "pointer" }}>Cerrar sesión</button>
                    </>
                  ) : (
                    <>
                      <a href={isPreview ? undefined : `/login?redirect=/tienda/${config?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)} style={{ display:"block", padding:"12px 16px", fontSize:13, color:"#111827", textDecoration:"none", borderBottom:"1px solid #f1f1f1" }}>Iniciar sesión</a>
                      <a href={isPreview ? undefined : `/registro?plan=buyer&redirect=/tienda/${config?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)} style={{ display:"block", padding:"12px 16px", fontSize:13, color:"#111827", textDecoration:"none" }}>Registrarse</a>
                    </>
                  )}
                </div>
              )}
            </div>
            <button onClick={() => { setCartOpen(true); setFavoritesOpen(false); }} aria-label="Carrito" style={{ position:"relative", background:"none", border:"none", color:navTextMid, display:"flex", alignItems:"center", cursor:"pointer", padding:0 }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              {cartCount > 0 && <span style={{ position:"absolute", top:-4, right:-4, background:accent, color:accentText, borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{cartCount}</span>}
            </button>
            <button className="ep-burger" onClick={() => setMenuOpen(m => !m)}
              style={{ background:"none", border:`1px solid ${navBorder}`, color:navText, padding:"7px 11px", cursor:"pointer", fontSize:18 }}>
              {menuOpen ? "×" : "☰"}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div style={{ background:navBg, borderTop:`1px solid ${navBorder}`, padding:"8px 24px 18px" }}>
            {[["Departamentos","departamentos"],["Productos","productos"],["Nosotros","nosotros"],["Contacto","contacto"]].map(([lbl,id]) => (
              <button key={id} onClick={() => { smoothScrollTo(id); setMenuOpen(false); }}
                style={{ display:"block", width:"100%", background:"none", border:"none", color:navTextMid, textAlign:"left", padding:"11px 0", fontSize:13, fontWeight:500, borderBottom:`1px solid ${navBorder}` }}>
                {lbl}
              </button>
            ))}
            <Link href={catalogHref} style={{ display:"block", color:accentOn(navBg, navText), padding:"14px 0", fontSize:13, fontWeight:700, textDecoration:"none" }} onClick={() => setMenuOpen(false)}>
              Ver catálogo completo →
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{ paddingTop: isPreview ? 0 : (showAnn ? PROMO_H + NAV_H : NAV_H), position:"relative", ...secBg(heroImg, heroBg), minHeight: isPreview ? undefined : "70vh" }}>
        <BgDragHandle imgKey="sectionbg_bgHero" />
        <SectionOverlay ov={heroImg} />
        <EditableSectionBg field="bgHero" label="Fondo hero" nombreBloque="Banner principal" />
        <div style={{ position:"relative", zIndex:1, display:"flex", minHeight: isPreview ? 480 : "calc(70vh - 64px)" }}>
          <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"56px 28px", maxWidth:540 }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:8, background:`${accent}25`, border:`1px solid ${accent}`, color:accent, borderRadius:100, padding:"6px 16px", fontSize:12, fontWeight:700, marginBottom:24, width:"fit-content" }}>
              💳 <EditableZone field="heroBadge" label="Badge del hero">Hasta 12 cuotas sin recargo*</EditableZone>
            </span>
            <h1 style={{ margin:"0 0 18px", fontSize:"clamp(32px,5vw,56px)", fontWeight:900, color:heroText, letterSpacing:-1.5, lineHeight:1.05 }}>
              <EditableZone field="heroHeading" label="Título hero">Lo último en hogar y tecnología</EditableZone>
            </h1>
            <p style={{ margin:"0 0 32px", fontSize:15, color:heroMid, lineHeight:1.8, maxWidth:420 }}>
              <EditableZone field="heroSubtext" label="Subtítulo hero">Electrodomésticos, celulares, informática y muebles con garantía oficial y financiación en cuotas.</EditableZone>
            </p>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              <Link href={catalogHref} style={{ background:accent, color: getContrastColor(accent)==="light"?"#fff":"#111",
                padding:"15px 32px", fontWeight:700, fontSize:13, borderRadius:10, textDecoration:"none" }}>
                Ver catálogo
              </Link>
              {showWA && (
                <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}${whatsapp.message?"?text="+encodeURIComponent(whatsapp.message):""}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:`1.5px solid ${heroText==="#ffffff"?"rgba(255,255,255,0.35)":"#d1d5db"}`, color:heroText, textDecoration:"none", padding:"15px 24px", fontWeight:600, fontSize:13, borderRadius:10 }}>
                  Consultar
                </a>
              )}
            </div>
          </div>
          <div style={{ flex:1, position:"relative", overflow:"hidden", minHeight:320 }}>
            <FadeImage src={heroImgUrl} alt="Producto destacado" fill sizes="(max-width: 768px) 100vw, 50vw" priority
              style={{ objectFit:"cover", objectPosition:`${iovr["heroImage"]?.posX ?? 50}% ${iovr["heroImage"]?.posY ?? 50}%` }} />
            <PhotoOverlay ov={iovr["heroImage"]} />
            <BgDragHandle imgKey="heroImage" />
            <EditableImageButton field="heroImage" label="Imagen del hero" />
          </div>
        </div>
      </section>

      <div style={{ display:"flex", flexDirection:"column" }}>
      {/* ── DEPARTAMENTOS (editables: categoría + imagen + texto por botón) ── */}
      <SectionBlock id="ep-departamentos" label="Departamentos" isPreview={isPreview} defaultOrder={EP_SECTION_IDS}>
      <section id="departamentos" data-reveal style={{ position:"relative", ...secBg(depImg, depBg), padding:"56px 24px" }}>
        <BgDragHandle imgKey="sectionbg_bgDepartamentos" />
        <SectionOverlay ov={depImg} />
        <EditableSectionBg field="bgDepartamentos" label="Fondo departamentos" />
        <div style={{ position:"relative", zIndex:1, maxWidth:1240, margin:"0 auto" }}>
          <h2 style={{ margin:"0 0 24px", fontSize:"clamp(20px,3vw,28px)", fontWeight:800, color:depText, letterSpacing:-0.5, textAlign:"center" }}>
            <EditableZone field="depHeading" label="Título departamentos">Comprá por departamento</EditableZone>
          </h2>
          <div className="ep-dep-grid">
            {(() => {
              const CATEGORY_ICON_LIST = makeCategoryIcons(accent);
              const usedCategoryIds = DEPARTAMENTOS_DEFAULT.map((dd, j) => overrides[`dept${j}Cat`]?.text ?? dd.id);
              const items = DEPARTAMENTOS_DEFAULT.map((d, i) => {
                const catKey = `dept${i}Cat`;
                const categoryId = overrides[catKey]?.text ?? d.id;
                // Si no es el dueño editando, ocultamos los departamentos sin productos
                // para no mandar al cliente a un catálogo vacío.
                if (!editMode && !products.some(p => p.category === categoryId)) return null;
                const iconIdx = Math.abs(parseInt(overrides[`dept${i}IconIdx`]?.text ?? String(i)) || 0) % CATEGORY_ICON_LIST.length;
                const nextIconIdx = (iconIdx + 1) % CATEGORY_ICON_LIST.length;
                return (
                  <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0, minWidth:96 }}>
                    <Link href={`/tienda/${config?.slug ?? ""}/productos?categoria=${categoryId}&t=electro-prime${isPreview ? "&from=editor" : ""}`}
                      data-no-unsaved-guard={editMode ? "true" : undefined}
                      onClick={e => { if (editMode) e.preventDefault(); }}
                      style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, textDecoration:"none" }}>
                      <div className={editMode ? "ep-dept-icon" : undefined}
                        onClick={editMode ? (e => { e.preventDefault(); e.stopPropagation(); setOverride(`dept${i}IconIdx`, { text: String(nextIconIdx) }); }) : undefined}
                        title={editMode ? "Cambiar ícono" : undefined}
                        style={{ width:72, height:72, borderRadius:"50%", background:`${accent}12`, border:`1.5px solid ${accent}30`,
                        display:"flex", alignItems:"center", justifyContent:"center", position:"relative", cursor: editMode ? "pointer" : undefined }}>
                        {CATEGORY_ICON_LIST[iconIdx]}
                        {editMode && (
                          <div style={{ position:"absolute", inset:0, background:"rgba(99,102,241,0.9)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:15, opacity:0.8, transition:"opacity 0.15s", pointerEvents:"none" }}>↻</div>
                        )}
                      </div>
                      <span style={{ fontSize:11.5, fontWeight:600, color:depText, textAlign:"center", lineHeight:1.3 }}>
                        <EditableZone field={`dept${i}Label`} label={`Departamento ${i+1} — texto`}>{d.label}</EditableZone>
                      </span>
                    </Link>
                    {editMode && (
                      <select value={categoryId} onClick={e => e.stopPropagation()}
                        onChange={e => {
                          const newCat = e.target.value;
                          const conflictIdx = DEPARTAMENTOS_DEFAULT.findIndex((dd, j) => j !== i && usedCategoryIds[j] === newCat);
                          if (conflictIdx !== -1) setOverride(`dept${conflictIdx}Cat`, { text: categoryId });
                          setOverride(catKey, { text: newCat });
                        }}
                        title="A qué categoría apunta este botón"
                        style={{ marginTop:6, maxWidth:170, fontSize:10, border:"1px solid #6366f1", borderRadius:6, background:"#eef2ff", color:"#4338ca", cursor:"pointer", padding:"3px 4px" }}>
                        {CATEGORY_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    )}
                  </div>
                );
              }).filter(Boolean);
              if (!editMode && items.length === 0) {
                return <p style={{ margin:0, color:"#9ca3af", fontSize:14, textAlign:"center" }}>Todavía no hay categorías con productos cargados.</p>;
              }
              return items;
            })()}
          </div>
        </div>
      </section>
      </SectionBlock>

      {/* ── CONFIANZA ── */}
      <SectionBlock id="ep-confianza" label="Confianza" isPreview={isPreview} defaultOrder={EP_SECTION_IDS}>
      <section data-reveal style={{ position:"relative", ...secBg(trustImg, trustBg), borderTop:"1px solid rgba(0,0,0,0.06)", borderBottom:"1px solid rgba(0,0,0,0.06)" }}>
        <BgDragHandle imgKey="sectionbg_bgConfianza" />
        <SectionOverlay ov={trustImg} />
        <EditableSectionBg field="bgConfianza" label="Fondo confianza" />
        <div className="ep-trust-grid" style={{ position:"relative", zIndex:1, maxWidth:1240, margin:"0 auto", display:"grid" }}>
          {CONFIANZA.map((c, i) => {
            const iconIdx = Math.abs(parseInt(overrides[`trust${i+1}IconIdx`]?.text ?? String(i)) || 0) % TRUST_ICONS.length;
            const nextIdx = (iconIdx + 1) % TRUST_ICONS.length;
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"24px 20px", borderRight: i < 3 ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
                <span style={{ color:accentOn(trustBg, trustText), flexShrink:0, position:"relative", display:"flex" }}>
                  {TRUST_ICONS[iconIdx]}
                  {editMode && (
                    <button onClick={() => setOverride(`trust${i+1}IconIdx`, { text: String(nextIdx) })} title="Cambiar ícono"
                      style={{ position:"absolute", inset:-4, background:"rgba(99,102,241,0.9)", border:"none", borderRadius:4, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11, opacity:0.8, transition:"opacity 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.opacity="1")} onMouseLeave={e => (e.currentTarget.style.opacity="0.8")}>↻</button>
                  )}
                </span>
                <div>
                  <p style={{ margin:"0 0 2px", fontSize:13, fontWeight:700, color:trustText }}><EditableZone field={c.fv} label={`Sello ${i+1} título`}>{c.t}</EditableZone></p>
                  <p style={{ margin:0, fontSize:11.5, color:trustMid, lineHeight:1.5 }}><EditableZone field={c.fl} label={`Sello ${i+1} descripción`}>{c.d}</EditableZone></p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      </SectionBlock>

      {/* ── OFERTAS — carrusel con flechas ── */}
      <SectionBlock id="ep-ofertas" label="Ofertas" isPreview={isPreview} defaultOrder={EP_SECTION_IDS}>
      {ofertas.length > 0 && (
        <section data-reveal style={{ position:"relative", ...secBg(ofertasImg, ofertasBg), padding:"56px 24px" }}>
          <BgDragHandle imgKey="sectionbg_bgOfertas" />
          <SectionOverlay ov={ofertasImg} />
          <EditableSectionBg field="bgOfertas" label="Fondo ofertas" />
          <div style={{ position:"relative", zIndex:1, maxWidth:1240, margin:"0 auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:24, flexWrap:"wrap", gap:12 }}>
              <h2 style={{ margin:0, fontSize:"clamp(20px,3vw,28px)", fontWeight:800, color:ofertasText, letterSpacing:-0.5 }}>
                🔥 <EditableZone field="ofertasHeading" label="Título ofertas">Ofertas destacadas</EditableZone>
              </h2>
              {hasMoreOfertas && <Link href={`${catalogHref}&oferta=true`} style={{ fontSize:13, fontWeight:700, color:accentOn(ofertasBg, ofertasText), textDecoration:"none" }}>Ver todas las ofertas →</Link>}
            </div>
            <div style={{ position:"relative" }}>
              {ofertas.length > 4 && (
                <>
                  <button onClick={() => scrollOfertas(-1)} aria-label="Anterior"
                    style={{ position:"absolute", left:-36, top:"38%", transform:"translateY(-50%)", width:36,
                      border:"none", background:"none", color:ofertasText, opacity:0.6, textShadow:"0 0 6px rgba(255,255,255,0.5), 0 0 6px rgba(0,0,0,0.5)", fontSize:44, lineHeight:1, cursor:"pointer", zIndex:2,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
                  <button onClick={() => scrollOfertas(1)} aria-label="Siguiente"
                    style={{ position:"absolute", right:-36, top:"38%", transform:"translateY(-50%)", width:36,
                      border:"none", background:"none", color:ofertasText, opacity:0.6, textShadow:"0 0 6px rgba(255,255,255,0.5), 0 0 6px rgba(0,0,0,0.5)", fontSize:44, lineHeight:1, cursor:"pointer", zIndex:2,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
                </>
              )}
              <div ref={ofertasScrollRef} className="ep-ofertas-row" style={{ display:"flex", gap:18, overflowX:"auto", scrollSnapType:"x mandatory", paddingBottom:4 }}>
                {ofertas.map(p => (
                  <div key={p.id} style={{ flex:"0 0 240px", scrollSnapAlign:"start" }}>
                    <ProductCard product={p} currency={currency} editMode={canOpenDemo} promotions={promotions}
                      href={`/tienda/${config?.slug ?? ""}/producto/${p.id}${isPreview ? "?from=editor" : ""}`}
                      isFavorite={favorites.includes(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
      </SectionBlock>

      {/* ── PRODUCTOS ── */}
      <SectionBlock id="ep-productos" label="Catálogo de productos" isPreview={isPreview} defaultOrder={EP_SECTION_IDS}>
      <section id="productos" data-reveal style={{ position:"relative", ...secBg(prodImg, prodBg), padding:"64px 24px" }}>
        <BgDragHandle imgKey="sectionbg_bgProductos" />
        <SectionOverlay ov={prodImg} />
        <EditableSectionBg field="bgProductos" label="Fondo productos" />
        <div style={{ position:"relative", zIndex:1, maxWidth:1240, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:28, flexWrap:"wrap", gap:12 }}>
            <h2 style={{ margin:0, fontSize:"clamp(20px,3vw,28px)", fontWeight:800, color:prodText, letterSpacing:-0.5 }}>
              <EditableZone field="prodHeading" label="Título productos">Catálogo</EditableZone>
            </h2>
            {hasMore && (
              <Link href={catalogHref} style={{ fontSize:13, fontWeight:700, color:accentOn(prodBg, prodText), textDecoration:"none" }}>Ver todo →</Link>
            )}
          </div>

          {loadingProducts ? (
            <div style={{ textAlign:"center", padding:"60px 0" }}>
              <div style={{ width:36, height:36, border:`3px solid ${accent}`, borderTopColor:"transparent", borderRadius:"50%", animation:"ep-spin 0.8s linear infinite", margin:"0 auto" }} />
            </div>
          ) : showcased.length > 0 ? (
            <div className="ep-prod-grid" style={{ display:"grid", gap:18 }}>
              {showcased.map(p => (
                <ProductCard key={p.id} product={p} currency={currency} editMode={canOpenDemo} promotions={promotions}
                  href={`/tienda/${config?.slug ?? ""}/producto/${p.id}${isPreview ? "?from=editor" : ""}`}
                  isFavorite={favorites.includes(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:"60px 24px", border:"1px dashed #e5e7eb", borderRadius:12 }}>
              <p style={{ margin:0, color:"#9ca3af", fontSize:14 }}>Aún no hay productos publicados.</p>
            </div>
          )}
        </div>
      </section>
      </SectionBlock>

      {/* ── BANNER PROMOCIONAL ── */}
      <SectionBlock id="ep-promo" label="Banner promocional" isPreview={isPreview} defaultOrder={EP_SECTION_IDS}>
      <PromoBannerCarousel
        images={[config?.imageOverrides?.["promoBanner1"], config?.imageOverrides?.["promoBanner2"], config?.imageOverrides?.["promoBanner3"]]}
        demoImages={[
          "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1920&q=80",
          "https://images.unsplash.com/photo-1556911073-38141963c9e0?auto=format&fit=crop&w=1920&q=80",
          "https://images.unsplash.com/photo-1556909114-44e3e70034e2?auto=format&fit=crop&w=1920&q=80",
        ]}
        intervalMs={config?.bannerInterval ?? 4000}
        editMode={editMode}
        isPreview={isPreview}
        accent={accent}
        bg="#111827"
      />
      </SectionBlock>

      {/* ── MAYORISTA ── */}
      <SectionBlock id="ep-mayorista" label="Mayorista" isPreview={isPreview} defaultOrder={EP_SECTION_IDS}>
      {isWholesale && (
        <section data-reveal style={{ background:"#f8fafc", borderTop:"1px solid #f0f0f0", borderBottom:"1px solid #f0f0f0" }}>
          <div style={{ maxWidth:1240, margin:"0 auto", padding:"48px 24px", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", gap:16 }}>
            <span style={{ fontSize:11, letterSpacing:2, color:accentOn("#f8fafc", "#111827"), textTransform:"uppercase", fontWeight:700 }}>
              <EditableZone field="mayoristaKicker" label="Kicker mayorista">Venta mayorista</EditableZone>
            </span>
            <h2 style={{ fontSize:"clamp(22px,3.5vw,34px)", fontWeight:800, color:"#111827", margin:0 }}>
              <EditableZone field="mayoristaHeading" label="Título mayorista">¿Comprás para revender?</EditableZone>
            </h2>
            <p style={{ fontSize:14, color:"#6b7280", maxWidth:460, margin:0, lineHeight:1.7 }}>
              <EditableZone field="mayoristaSubtext" label="Subtítulo mayorista">Pedí precios especiales por cantidad para revendedores y distribuidores.</EditableZone>
            </p>
            <button onClick={() => smoothScrollTo("contacto")} style={{ background:accent, color: getContrastColor(accent)==="light"?"#fff":"#111", border:"none", padding:"13px 32px", fontSize:13, fontWeight:700, borderRadius:10, cursor:"pointer" }}>
              <EditableZone field="mayoristaCta" label="Texto botón mayorista">Consultar precios →</EditableZone>
            </button>
          </div>
        </section>
      )}
      </SectionBlock>

      {/* ── NOSOTROS ── */}
      <SectionBlock id="ep-nosotros" label="Nuestra historia" isPreview={isPreview} defaultOrder={EP_SECTION_IDS}>
      <section id="nosotros" data-reveal style={{ position:"relative", ...secBg(nosotrosImg, nosotrosBg), padding:"72px 24px" }}>
        <BgDragHandle imgKey="sectionbg_bgNosotros" />
        <SectionOverlay ov={nosotrosImg} />
        <EditableSectionBg field="bgNosotros" label="Fondo nosotros" />
        <div className="ep-about" style={{ position:"relative", zIndex:1, maxWidth:1240, margin:"0 auto", display:"grid", gap:48, alignItems:"center" }}>
          <div style={{ position:"relative" }}>
            <div style={{ borderRadius:18, overflow:"hidden", aspectRatio:"4/3", position:"relative" }}>
              <FadeImage src={nosotrosUrl} alt="Nuestro local" fill sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit:"cover", objectPosition:`${iovr["nosotrosImage"]?.posX ?? 50}% ${iovr["nosotrosImage"]?.posY ?? 50}%` }} />
              <PhotoOverlay ov={iovr["nosotrosImage"]} />
              <BgDragHandle imgKey="nosotrosImage" />
              <EditableImageButton field="nosotrosImage" label="Imagen sección Nosotros" />
            </div>
            <div style={{ position:"absolute", bottom:-18, right:-14, background:"#fff", borderRadius:14, padding:"14px 20px", boxShadow:"0 8px 30px rgba(0,0,0,0.12)", textAlign:"center", border:`2px solid ${accent}` }}>
              <p style={{ margin:0, fontSize:26, fontWeight:900, color:accentOn("#ffffff", "#111827"), lineHeight:1 }}>
                <EditableZone field="nosotrosAnios" label="Años de trayectoria">10+</EditableZone>
              </p>
              <p style={{ margin:"4px 0 0", fontSize:10.5, color:"#6b7280", whiteSpace:"nowrap" }}>años de trayectoria</p>
            </div>
          </div>
          <div>
            <p style={{ margin:"0 0 8px", fontSize:11, color:accentOn(nosotrosBg, nosText), textTransform:"uppercase", letterSpacing:2, fontWeight:700 }}>
              <EditableZone field="nosotrosKicker" label="Kicker nosotros">Nuestra tienda</EditableZone>
            </p>
            <h2 style={{ margin:"0 0 18px", fontSize:"clamp(22px,4vw,34px)", fontWeight:800, color:nosText, letterSpacing:-0.5 }}>
              <EditableZone field="nosotrosHeading" label="Título nosotros">Confianza en cada compra</EditableZone>
            </h2>
            <p style={{ margin:"0 0 14px", fontSize:14.5, color:nosMid, lineHeight:1.85 }}>
              <EditableZone field="nosotrosP1" label="Párrafo 1">Somos una tienda especializada en electrodomésticos, tecnología y hogar, con productos nuevos y garantía oficial en todo lo que vendemos.</EditableZone>
            </p>
            <p style={{ margin:"0 0 26px", fontSize:14.5, color:nosMid, lineHeight:1.85 }}>
              <EditableZone field="nosotrosP2" label="Párrafo 2">Te asesoramos para que encuentres el producto justo para tu casa, con financiación en cuotas y la mejor atención.</EditableZone>
            </p>
            {showWA && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}${whatsapp.message?"?text="+encodeURIComponent(whatsapp.message):""}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#25d366", color:"white", textDecoration:"none", padding:"13px 28px", borderRadius:10, fontWeight:700, fontSize:14 }}>
                Contactanos
              </a>
            )}
          </div>
        </div>
      </section>
      </SectionBlock>

      {/* ── CONTACTO — imagen + formulario ── */}
      <SectionBlock id="ep-contacto" label="Contacto" isPreview={isPreview} defaultOrder={EP_SECTION_IDS}>
      <section id="contacto" data-reveal style={{ position:"relative", ...secBg(contactoImg, contactoBg), padding:"64px 24px" }}>
        <BgDragHandle imgKey="sectionbg_bgContacto" />
        <SectionOverlay ov={contactoImg} />
        <EditableSectionBg field="bgContacto" label="Fondo contacto" />
        <div className="ep-contact-grid" style={{ position:"relative", zIndex:1, maxWidth:1080, margin:"0 auto", display:"grid", gap:0, borderRadius:20, overflow:"hidden", boxShadow:"0 24px 60px rgba(0,0,0,0.3)" }}>
          <style>{`.ep-contact-grid{grid-template-columns:1fr} @media(min-width:768px){.ep-contact-grid{grid-template-columns:1fr 1fr}}`}</style>
          <div style={{ position:"relative", minHeight:280 }}>
            <FadeImage src={contactImgUrl} alt="Atención al cliente" fill sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit:"cover", objectPosition:`${iovr["contactImage"]?.posX ?? 50}% ${iovr["contactImage"]?.posY ?? 50}%` }} />
            <PhotoOverlay ov={iovr["contactImage"]} />
            <BgDragHandle imgKey="contactImage" />
            <EditableImageButton field="contactImage" label="Imagen sección Contacto" />
          </div>
          <div style={{ background:"#fff", padding:36 }}>
            <p style={{ margin:"0 0 10px", fontSize:11, color:accentOn("#ffffff", "#111111"), textTransform:"uppercase", letterSpacing:2, fontWeight:700 }}>Contacto</p>
            <h2 style={{ margin:"0 0 12px", fontSize:"clamp(20px,3vw,26px)", fontWeight:800, color:"#111", letterSpacing:-0.5 }}>
              <EditableZone field="contactHeading" label="Título contacto">¿Tenés dudas sobre algún producto?</EditableZone>
            </h2>
            <p style={{ margin:"0 0 22px", fontSize:13.5, color:"#6b7280", lineHeight:1.8 }}>
              <EditableZone field="contactSubtext" label="Subtítulo contacto">Escribinos y te asesoramos antes de tu compra.</EditableZone>
            </p>
            <ContactForm storeId={config?.storeId} accent={accent} textColor="#111111" mutedColor="#6b7280" radius={10} isPreview={isPreview} />
          </div>
        </div>
        <div style={{ position:"relative", zIndex:1, maxWidth:1080, margin:"18px auto 0", display:"flex", justifyContent:"center", gap:20, flexWrap:"wrap" }}>
            <Link href={catalogHref} style={{ color:accentOn(contactoBg, contactoText), fontWeight:700, fontSize:13, textDecoration:"none" }}>Ver catálogo completo →</Link>
            {showWA && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}${whatsapp.message?"?text="+encodeURIComponent(whatsapp.message):""}`}
                target="_blank" rel="noopener noreferrer"
                style={{ color:"#25d366", textDecoration:"none", fontWeight:600, fontSize:13 }}>
                <EditableZone field="contactWhatsApp" label="Texto link WhatsApp">o escribinos por WhatsApp</EditableZone>
              </a>
            )}
        </div>
      </section>
      </SectionBlock>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ position:"relative", ...secBg(footerImg, footerBg), color:ftText, padding:"32px 24px", textAlign:"center" }}>
        <BgDragHandle imgKey="sectionbg_bgFooter" />
        <SectionOverlay ov={footerImg} />
        <EditableSectionBg field="bgFooter" label="Fondo footer" nombreBloque="Pie de la tienda" />
        <div style={{ position:"relative", zIndex:1 }}>
        <p style={{ margin:"0 0 6px", fontWeight:900, fontSize:14, color:accentOn(footerBg, ftText) }}>{storeName}</p>
        <p style={{ margin:"0 0 12px", fontSize:11, color:ftMid }}>
          © {new Date().getFullYear()} {storeName}. Todos los derechos reservados.
        </p>
        {(editMode || isPreview || SOCIAL_NETWORKS.some(([key]) => config?.socialLinks?.[key])) && (
          <div style={{ display:"flex", justifyContent:"center", gap:10, marginBottom:14 }}>
            {SOCIAL_NETWORKS.map(([key, label]) => {
              const url = config?.socialLinks?.[key];
              if (!editMode && !isPreview && !url) return null;
              return (
                <a key={key} href={url || "#"} target={url ? "_blank" : undefined} rel="noopener noreferrer" aria-label={label}
                  onClick={e => { if (!url) e.preventDefault(); }}
                  style={{ width:30, height:30, borderRadius:"50%", border:`1px solid ${ftMid}`, color:ftMid, display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none", opacity: url ? 1 : 0.35 }}>
                  <SocialIcon network={key} />
                </a>
              );
            })}
          </div>
        )}
        <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:"0 16px" }}>
          {linksLegales(config?.slug, config?.legales, { enEditor: isPreview }).map(({ clave: tipo, label }) => (
            <a key={tipo} href={`/tienda/${config?.slug ?? ""}/politicas?tipo=${tipo}`} style={{ fontSize:10, color:ftMid, opacity:0.6, textDecoration:"none" }}>{label}</a>
          ))}
          {!editMode && (
            <button onClick={() => setShowReport(true)}
              style={{ fontSize:10, color:ftMid, opacity:0.6, background:"none", border:"none", cursor:"pointer", padding:0, textDecoration:"underline" }}>
              Reportar tienda
            </button>
          )}
        </div>
        </div>
      </footer>

      {showReport && (
        <ReportStoreModal slug={config?.slug ?? ""} onClose={() => setShowReport(false)} />
      )}

      {/* ── FAVORITOS DRAWER ── */}
      <div style={{ position:"fixed", inset:0, zIndex: isPreview ? 20000 : 205, pointerEvents: favoritesOpen ? "auto" : "none" }}>
        <div onClick={() => setFavoritesOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.4)", opacity: favoritesOpen ? 1 : 0, transition:"opacity 0.3s" }} />
        <div style={{ position:"absolute", top:0, right:0, bottom:0, width:400, maxWidth:"100vw", background:"#fff", transform: favoritesOpen ? "translateX(0)" : "translateX(100%)", transition:"transform 0.35s cubic-bezier(.4,0,.2,1)", display:"flex", flexDirection:"column", borderLeft:"1px solid #e5e5e5" }}>
          <div style={{ padding:"20px 24px 14px", borderBottom:"1px solid #f0f0f0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <p style={{ fontWeight:700, fontSize:16, margin:0, color:"#111" }}>Favoritos <span style={{ fontWeight:400, fontSize:13, color:"#888" }}>({favorites.length})</span></p>
            <button onClick={() => setFavoritesOpen(false)} style={{ background:"none", border:"none", color:"#111", fontSize:22, cursor:"pointer" }}>×</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"14px 24px" }}>
            {favoriteProducts.length === 0 ? (
              <div style={{ textAlign:"center", padding:"52px 0", color:"#888" }}>
                <p style={{ fontSize:32, marginBottom:12 }}>♡</p>
                <p style={{ fontSize:13, lineHeight:1.8 }}>No tenés favoritos aún.<br/>Explorá el catálogo.</p>
              </div>
            ) : favoriteProducts.map(product => (
              <div key={product.id} style={{ display:"flex", gap:14, padding:"14px 0", borderBottom:"1px solid #f5f5f5" }}>
                {product.images[0] ? (
                  <FadeImage src={product.images[0]} alt={product.name} width={80} height={60} style={{ objectFit:"cover", borderRadius:4, flexShrink:0, background:"#f5f5f5" }} />
                ) : (
                  <div style={{ width:80, height:60, borderRadius:4, flexShrink:0, background:"#f5f5f5" }} />
                )}
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14, fontWeight:600, margin:"0 0 4px", color:"#111" }}>{product.name}</p>
                  <p style={{ fontSize:13, color:accentOn("#ffffff", "#111111"), fontWeight:700, margin:"0 0 10px" }}>{fmtPrice(product.price, currency)}</p>
                  <div style={{ display:"flex", gap:8 }}>
                    <Link href={`/tienda/${config?.slug ?? ""}/producto/${product.id}${isPreview ? "?from=editor" : ""}`}
                      onClick={e => { if (!canOpenDemo && isDemoProductId(product.id)) e.preventDefault(); else setFavoritesOpen(false); }}
                      style={{ background:accent, color: getContrastColor(accent)==="light"?"#fff":"#111", border:"none", borderRadius:4, padding:"7px 14px", fontSize:11, fontWeight:600, cursor:"pointer", textDecoration:"none" }}>
                      Ver
                    </Link>
                    <button onClick={() => toggleFavorite(product.id)}
                      style={{ background:"transparent", color:"#888", border:"1px solid #ddd", borderRadius:4, padding:"7px 14px", fontSize:11, cursor:"pointer" }}>
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CartDrawer cart={cart} theme={cartTheme} isOwner={isOwner} isPreview={isPreview} whatsapp={whatsapp} />
      <CheckoutModal cart={cart} theme={cartTheme} isPreview={isPreview} storeSlug={config?.slug ?? ""} />

      {toastMsg && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#111", color:"#fff", padding:"12px 20px", fontSize:13, fontWeight:600, zIndex:CAPAS.sobrePanel, boxShadow:"0 4px 20px rgba(0,0,0,0.35)", maxWidth:"calc(100vw - 32px)", textAlign:"center" }}>
          {toastMsg}
        </div>
      )}

      {showWA && (
        <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}${whatsapp.message?"?text="+encodeURIComponent(whatsapp.message):""}`}
          target="_blank" rel="noopener noreferrer"
          style={{ position:"fixed", bottom:24, right:24, zIndex:CAPAS.panel, background:"#25d366", color:"white", width:56, height:56,
            borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 24px rgba(37,211,102,0.45)", textDecoration:"none" }}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 6.32A8.86 8.86 0 0 0 12.07 3a8.86 8.86 0 0 0-7.65 13.43L3 21l4.74-1.24a8.86 8.86 0 0 0 4.33 1.1h.01c4.9 0 8.87-3.97 8.87-8.86 0-2.37-.92-4.6-2.35-6.68zm-5.53 13.63a7.37 7.37 0 0 1-3.76-1.03l-.27-.16-2.8.73.75-2.73-.18-.28a7.36 7.36 0 0 1-1.13-3.93c0-4.07 3.31-7.38 7.39-7.38a7.34 7.34 0 0 1 5.22 2.17 7.34 7.34 0 0 1 2.16 5.22c0 4.07-3.31 7.39-7.38 7.39zm4.04-5.53c-.22-.11-1.3-.64-1.5-.71-.2-.08-.35-.11-.5.11-.15.22-.57.71-.7.86-.13.15-.26.16-.48.06-.22-.11-.93-.34-1.77-1.09-.65-.58-1.09-1.3-1.22-1.52-.13-.22-.01-.34.1-.45.1-.11.22-.28.33-.42.11-.14.15-.24.22-.4.08-.16.04-.3-.04-.42-.08-.11-.5-1.2-.69-1.65-.18-.43-.37-.37-.51-.38-.13-.01-.28-.01-.43-.01-.15 0-.39.06-.6.28-.21.22-.8.78-.8 1.9 0 1.12.81 2.2.93 2.35.11.15 1.55 2.37 3.76 3.23 1.87.73 2.25.59 2.66.55.41-.04 1.3-.53 1.49-1.04.18-.51.18-.94.13-1.04-.06-.1-.22-.16-.44-.27z"/></svg>
        </a>
      )}
    </div>
  );
}
