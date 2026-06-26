"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FadeImage } from "@/components/store/templates/shared/FadeImage";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { usePushBell } from "@/contexts/PushBellContext";
import { useAuth } from "@/components/AuthProvider";
import StoreFollowButton from "@/components/store/StoreFollowButton";
import { EditableZone, EditableImageButton, EditableSectionBg, BgDragHandle, getContrastColor, getReadableAccentText, useEditContext } from "@/contexts/EditContext";
import { useStorefront, isDemoProductId, type StorefrontProduct } from "@/hooks/useStorefront";
import { useCartLogic } from "@/hooks/useCartLogic";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ContactForm } from "@/components/store/templates/shared/ContactForm";
import { CartDrawer, type CartTheme } from "@/components/store/templates/shared/CartDrawer";
import { CheckoutModal } from "@/components/store/templates/shared/CheckoutModal";
import { PromoBannerCarousel } from "@/components/store/templates/shared/PromoBannerCarousel";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import type { ImageOverride } from "@/types/store-config";

function smoothScrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}
function secBg(ov: ImageOverride | undefined, fallback: string): React.CSSProperties {
  if (ov?.url) return { backgroundImage: `url(${ov.url})`, backgroundSize: "cover", backgroundPosition: `${ov.posX ?? 50}% ${ov.posY ?? 50}%` };
  return { background: fallback };
}
function secText(ov: ImageOverride | undefined, bg: string): string {
  if (ov?.url) return ov.overlayType === "light" ? "#111111" : "#ffffff";
  return getContrastColor(bg) === "light" ? "#ffffff" : "#0f0f1a";
}
function secMid(ov: ImageOverride | undefined, bg: string): string {
  if (ov?.url) return ov.overlayType === "light" ? "#555555" : "rgba(255,255,255,0.6)";
  return getContrastColor(bg) === "light" ? "rgba(255,255,255,0.6)" : "#6b6b80";
}
function SectionOverlay({ ov }: { ov: ImageOverride | undefined }) {
  if (!ov?.url || ov.overlayType === "none") return null;
  return <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none",
    background: ov.overlayType==="light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.55})` }} />;
}
// Para fotos simples (hero, departamentos, contacto) que siempre muestran una
// imagen (de stock o subida) — la capa se aplica en cuanto el dueño la elige,
// aunque todavía no haya subido una foto propia.
function PhotoOverlay({ ov }: { ov: ImageOverride | undefined }) {
  if (!ov?.overlayType || ov.overlayType === "none") return null;
  return <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none",
    background: ov.overlayType==="light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.55})` }} />;
}
function fmtPrice(n: number, currency: string) {
  return `${currency === "ARS" ? "$" : currency} ${n.toLocaleString("es-AR")}`;
}

const DEPARTAMENTOS = [
  { id: "celulares-y-accesorios", label: "Celulares", img: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=500&q=70" },
  { id: "informatica-y-gaming", label: "Informática y Gaming", img: "https://images.unsplash.com/photo-1593640495253-23196b27a87f?auto=format&fit=crop&w=500&q=70" },
  { id: "audio-imagen-y-video", label: "Audio y TV", img: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=500&q=70" },
  { id: "electrodomesticos", label: "Electrodomésticos", img: "https://images.unsplash.com/photo-1556909114-44e3e70034e2?auto=format&fit=crop&w=500&q=70" },
  { id: "pequenos-electrodomesticos", label: "Pequeños Electro", img: "https://images.unsplash.com/photo-1495195134817-aeb325a55b65?auto=format&fit=crop&w=500&q=70" },
  { id: "muebles-y-colchones", label: "Muebles y Colchones", img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=500&q=70" },
];

const CATEGORY_OPTIONS = [
  { id: "electrodomesticos", label: "Electrodomésticos" },
  { id: "pequenos-electrodomesticos", label: "Pequeños Electro" },
  { id: "celulares-y-accesorios", label: "Celulares" },
  { id: "informatica-y-gaming", label: "Informática y Gaming" },
  { id: "audio-imagen-y-video", label: "Audio y TV" },
  { id: "muebles-y-colchones", label: "Muebles y Colchones" },
  { id: "casa-y-jardin", label: "Casa y Jardín" },
];

function CategoryIcon({ id, color }: { id: string; color: string }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (id) {
    case "electrodomesticos":
      return <svg {...common}><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="5" y1="10" x2="19" y2="10"/><line x1="8.5" y1="6" x2="8.5" y2="6"/><line x1="8.5" y1="14" x2="8.5" y2="14"/></svg>;
    case "pequenos-electrodomesticos":
      return <svg {...common}><path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><line x1="7" y1="3" x2="7" y2="6"/><line x1="11" y1="3" x2="11" y2="6"/></svg>;
    case "celulares-y-accesorios":
      return <svg {...common}><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>;
    case "informatica-y-gaming":
      return <svg {...common}><rect x="3" y="4" width="18" height="12" rx="1.5"/><line x1="8" y1="20" x2="16" y2="20"/><line x1="12" y1="16" x2="12" y2="20"/></svg>;
    case "audio-imagen-y-video":
      return <svg {...common}><rect x="3" y="5" width="18" height="13" rx="1.5"/><path d="M10 9l4 2.5-4 2.5V9z" fill={color} stroke="none"/><line x1="8" y1="21" x2="16" y2="21"/></svg>;
    case "muebles-y-colchones":
      return <svg {...common}><path d="M4 12V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M3 12h18v5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5z"/><line x1="5" y1="18" x2="5" y2="20"/><line x1="19" y1="18" x2="19" y2="20"/></svg>;
    case "casa-y-jardin":
      return <svg {...common}><path d="M12 21c-4-2-7-6-7-10a7 7 0 0 1 14 0c0 4-3 8-7 10z"/><line x1="12" y1="21" x2="12" y2="11"/></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="9"/></svg>;
  }
}

function ProductCard({ product, href, currency, isFavorite, onToggleFavorite, editMode }: {
  product: StorefrontProduct; href: string; currency: string; isFavorite: boolean; onToggleFavorite: () => void; editMode?: boolean;
}) {
  const discount = product.comparePrice && product.comparePrice > product.price ? Math.round((1 - product.price / product.comparePrice) * 100) : null;
  const specs = product.attributes.slice(0, 2);
  // Los demos de relleno no existen en la base: antes de guardar el template, la tienda
  // pública todavía resuelve con el tipoTienda viejo y el detalle da "no disponible".
  const isUnclickableDemo = !editMode && isDemoProductId(product.id);
  return (
    <Link href={href} className="tn-card" onClick={e => { if (isUnclickableDemo) e.preventDefault(); }}
      style={{ textDecoration:"none", color:"inherit", background:"#fff", borderRadius:16, border:"1px solid #ececf5", overflow:"hidden", display:"block", cursor: isUnclickableDemo ? "default" : "pointer" }}>
      <div style={{ aspectRatio:"1/1", background:"#fafaff", position:"relative", overflow:"hidden" }}>
        {discount && <div style={{ position:"absolute", top:10, left:10, zIndex:1, background:"#7c3aed", color:"#fff", fontSize:11, fontWeight:800, padding:"4px 9px", borderRadius:100 }}>{discount}% OFF</div>}
        <button onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(); }}
          aria-label="Favorito"
          style={{ position:"absolute", top:8, right:8, zIndex:1, width:30, height:30, borderRadius:"50%", background:"rgba(255,255,255,0.9)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill={isFavorite ? "#7c3aed" : "none"} stroke={isFavorite ? "#7c3aed" : "#6b6b80"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        {product.images[0] ? (
          <FadeImage src={product.images[0]} alt={product.name} fill sizes="(max-width: 768px) 50vw, 25vw" style={{ objectFit:"cover" }} />
        ) : (
          <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"#c4c4d8", fontSize:13 }}>Sin imagen</div>
        )}
        {specs.length > 0 && (
          <div className="tn-spec-overlay">
            {specs.map((s, i) => (
              <p key={i} style={{ margin:0, fontSize:10.5, color:"#fff", opacity:0.85, lineHeight:1.6 }}><strong>{s.key}:</strong> {s.value}</p>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding:"14px 16px" }}>
        <p style={{ margin:"0 0 6px", fontSize:13, fontWeight:600, color:"#0f0f1a", lineHeight:1.4, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{product.name}</p>
        <p style={{ margin:0, fontSize:16, fontWeight:800, color:"#0f0f1a" }}>{fmtPrice(product.price, currency)}</p>
        {product.comparePrice && product.comparePrice > product.price && (
          <p style={{ margin:"2px 0 0", fontSize:12, color:"#9a9ab0", textDecoration:"line-through" }}>{fmtPrice(product.comparePrice, currency)}</p>
        )}
      </div>
    </Link>
  );
}

const CONFIANZA = [
  { fv: "trust1Title", fl: "trust1Desc", iconDefault: 0, t: "Cuotas", d: "Con tu tarjeta de crédito" },
  { fv: "trust2Title", fl: "trust2Desc", iconDefault: 1, t: "Garantía", d: "Oficial en todo el catálogo" },
  { fv: "trust3Title", fl: "trust3Desc", iconDefault: 4, t: "Stock real", d: "Lo que ves es lo que hay" },
  { fv: "trust4Title", fl: "trust4Desc", iconDefault: 3, t: "Envíos", d: "A todo el país" },
];

// Íconos cambiables con el botón "↻" en modo edición (mismo patrón que FashionNoir/AutoDrive)
const TRUST_ICONS: React.ReactNode[] = [
  <svg key="card" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  <svg key="shield" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  <svg key="store" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l1-5h16l1 5"/><path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/><path d="M4 9v10h16V9"/></svg>,
  <svg key="truck" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  <svg key="bolt" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  <svg key="gift" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
  <svg key="swap" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  <svg key="chat" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
];
const BENEF_ICON_DEFAULTS = [4, 6, 7, 1]; // bolt, swap, chat, shield

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

export default function TechNova() {
  const config    = useStoreConfig();
  const pushBell  = usePushBell();
  const storefront = useStorefront();
  const { products, loadingProducts } = storefront;
  const cart = useCartLogic(storefront);
  const {
    favorites, favoritesOpen, setFavoritesOpen, favoriteProducts, toggleFavorite,
    cartCount, setCartOpen, toastMsg,
  } = cart;
  const { editMode, overrides, setOverride } = useEditContext();
  useScrollReveal();
  const isPreview = !!config?.previewFill;
  // editMode se activa apenas se entra a "Editando" un diseño, pero el tipoTienda
  // real recién queda persistido en la base cuando se aprieta "Guardar cambios".
  // Hasta entonces, la tienda pública no resuelve los productos demo de relleno.
  const canOpenDemo = editMode && !!config?.templateSaved;
  const isOwner   = !!config?.isOwner;
  const accent    = config?.colors.accent ?? "#7c3aed";
  const accentText = getContrastColor(accent) === "light" ? "#111" : "#fff";
  // El acento se usa como color de TEXTO en varias secciones (no como fondo de
  // botón, eso ya lo resuelve accentText) — cada sección puede tener su propio
  // fondo personalizado, así que validamos contra el de cada una puntualmente.
  const accentOn = (bg: string, fallback: string) => getReadableAccentText(accent, bg, fallback);
  const cartTheme: CartTheme = { BG:"#ffffff", S:"#fafafa", T:"#111111", MID:"#6b6b80", border:"#e5e5e5", accent, accentText };
  const currency  = config?.currency ?? "ARS";
  const storeName = config?.storeName ?? "TECH NOVA";
  const whatsapp  = config?.whatsapp ?? { enabled:false, number:"", message:"" };
  // En modo edición lo mostramos con solo activarlo, para que se pueda previsualizar
  // antes de completar el número; en la tienda real hace falta el número sí o sí.
  const showWA    = whatsapp.enabled && (editMode || !!whatsapp.number);
  const social    = config?.socialLinks;

  const { user, signOut } = useAuth();
  const panelHref = user?.role === "ADMIN" ? "/admin" : user?.role === "OWNER" ? "/dashboard" : user?.role === "SELLER" ? "/afiliados" : "/mi-cuenta";
  const panelLabel = user?.role === "ADMIN" ? "Admin" : user?.role === "OWNER" ? "Mi tienda" : user?.role === "SELLER" ? "Mi panel" : "Mi cuenta";
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

  const heroBg      = sc["bgHero"] ?? "#fafaff";
  const heroImg     = iovr["sectionbg_bgHero"];
  const heroText    = secText(heroImg, heroBg);
  const heroMid     = secMid(heroImg, heroBg);

  const ofertasBg   = sc["bgOfertas"] ?? "#fafaff";
  const ofertasImg  = iovr["sectionbg_bgOfertas"];
  const ofertasText = secText(ofertasImg, ofertasBg);
  const heroImgUrl  = iovr["heroImage"]?.url ?? "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80";

  const depBg       = sc["bgDepartamentos"] ?? "#ffffff";
  const depImg      = iovr["sectionbg_bgDepartamentos"];
  const depText     = secText(depImg, depBg);

  const trustBg     = sc["bgConfianza"] ?? "#fafaff";
  const trustImg    = iovr["sectionbg_bgConfianza"];
  const trustText   = secText(trustImg, trustBg);
  const trustMid    = secMid(trustImg, trustBg);

  const prodBg      = sc["bgProductos"] ?? "#ffffff";
  const prodImg     = iovr["sectionbg_bgProductos"];
  const prodText    = secText(prodImg, prodBg);

  const benefBg     = sc["bgNosotros"] ?? "#fafaff";
  const benefImg    = iovr["sectionbg_bgNosotros"];
  const benefText   = secText(benefImg, benefBg);
  const benefMid    = secMid(benefImg, benefBg);

  const contactoBg  = sc["bgContacto"] ?? "#0f0f1a";
  const contactoImg = iovr["sectionbg_bgContacto"];
  const conText     = secText(contactoImg, contactoBg);
  const conMid      = secMid(contactoImg, contactoBg);
  const contactoUrl = iovr["contactoImage"]?.url ?? "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=70";

  const footerBg    = sc["bgFooter"] ?? "#0a0a12";
  const footerImg   = iovr["sectionbg_bgFooter"];
  const ftText      = secText(footerImg, footerBg);
  const ftMid       = secMid(footerImg, footerBg);

  const navBg       = sc["navBg"] ?? "#0f0f1a";
  const navDark     = getContrastColor(navBg) === "light";
  const navText     = navDark ? "#ffffff" : "#0f0f1a";
  const navTextMid  = navDark ? "rgba(255,255,255,0.7)" : "#6b6b80";
  const navBorder   = navDark ? "rgba(255,255,255,0.15)" : "#ececf5";

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [annIdx, setAnnIdx]     = useState(0);
  const [annVisible, setAnnVisible] = useState(true);
  const depScrollRef     = useRef<HTMLDivElement>(null);
  const ofertasScrollRef = useRef<HTMLDivElement>(null);
  const prodScrollRef    = useRef<HTMLDivElement>(null);
  function scrollRow(ref: React.RefObject<HTMLDivElement | null>, dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }

  const DEFAULTS = ["⚡ Stock real y entrega inmediata", "💳 Cuotas con todas las tarjetas", "🛡️ Garantía oficial"];
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

  useEffect(() => {
    if (!showAnn || annMessages.length <= 1) return;
    const id = setInterval(() => setAnnIdx(i => (i + 1) % annMessages.length), 3500);
    return () => clearInterval(id);
  }, [showAnn, annMessages.length]);

  const featuredProducts = products.filter(p => p.featured);
  const showcased = (featuredProducts.length > 0 ? featuredProducts : products).slice(0, 8);
  const hasMore   = (featuredProducts.length > 0 ? featuredProducts : products).length > 8;
  const allOfertas = products.filter(p => p.comparePrice && p.comparePrice > p.price);
  const ofertas    = allOfertas.slice(0, 8);
  const hasMoreOfertas = allOfertas.length > 8;
  const catalogHref = `/tienda/${config?.slug ?? ""}/productos?t=tech-nova${isPreview ? "&from=editor" : ""}`;
  const socialNets: ["instagram"|"facebook"|"tiktok"|"youtube"|"pinterest", string][] = [["instagram","Instagram"],["facebook","Facebook"],["tiktok","TikTok"],["youtube","YouTube"],["pinterest","Pinterest"]];

  return (
    <div style={{ background:"#ffffff", color:"#0f0f1a", fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", minHeight:"100vh" }}>
      <style>{`
        .tn-nav-links { display:none }
        @media(min-width:768px){ .tn-nav-links { display:flex } .tn-burger { display:none } }
        .tn-dep-row, .tn-prod-row { scrollbar-width:none }
        .tn-dep-row::-webkit-scrollbar, .tn-prod-row::-webkit-scrollbar { display:none }
        .tn-dep-item { flex:0 0 80% }
        @media(min-width:560px){ .tn-dep-item { flex:0 0 calc((100% - 16px)/2) } }
        @media(min-width:860px){ .tn-dep-item { flex:0 0 calc((100% - 32px)/3) } }
        .tn-prod-item { flex:0 0 80% }
        @media(min-width:480px){ .tn-prod-item { flex:0 0 calc((100% - 18px)/2) } }
        @media(min-width:768px){ .tn-prod-item { flex:0 0 calc((100% - 36px)/3) } }
        @media(min-width:1024px){ .tn-prod-item { flex:0 0 calc((100% - 54px)/4) } }
        .tn-trust-grid { grid-template-columns:repeat(2,1fr) }
        @media(min-width:768px){ .tn-trust-grid { grid-template-columns:repeat(4,1fr) } }
        .tn-benef-grid { grid-template-columns:1fr }
        @media(min-width:640px){ .tn-benef-grid { grid-template-columns:repeat(2,1fr) } }
        .tn-dep-card { position:relative; border-radius:16px; overflow:hidden; aspect-ratio:4/3; text-decoration:none; display:block; transition:transform 0.25s }
        .tn-dep-card:hover { transform:translateY(-4px) }
        .tn-dep-card img { width:100%; height:100%; object-fit:cover; transition:transform 0.4s }
        .tn-dep-card:hover img { transform:scale(1.08) }
        .tn-card { position:relative; transition:box-shadow 0.2s, transform 0.2s }
        .tn-card:hover { transform:translateY(-3px); box-shadow:0 14px 34px rgba(124,58,237,0.14) }
        .tn-spec-overlay { position:absolute; inset:auto 0 0 0; background:rgba(15,15,26,0.92); padding:10px 12px; opacity:0; transform:translateY(8px); transition:all 0.2s; }
        .tn-card:hover .tn-spec-overlay { opacity:1; transform:translateY(0); }
        @keyframes tn-spin { to { transform:rotate(360deg) } }
        @keyframes tn-float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-14px) } }
        .tn-floating { animation:tn-float 5s ease-in-out infinite }
        .tn-megamenu { opacity:0; visibility:hidden; transform:translateY(-6px); transition:all 0.18s; }
        .tn-mega-wrap:hover .tn-megamenu, .tn-megamenu:hover { opacity:1; visibility:visible; transform:translateY(0); }
      `}</style>

      {showAnn && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top:0,
          left: isPreview ? undefined : 0, right: isPreview ? undefined : 0,
          zIndex: isPreview ? 10001 : 110, height:PROMO_H, background:accent,
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:11, fontWeight:600, color: getContrastColor(accent)==="light"?"#fff":"#111", letterSpacing:0.5 }}>{annMessages[annIdx]}</span>
          <button onClick={() => setAnnVisible(false)}
            style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color: getContrastColor(accent)==="light"?"#fff":"#111", cursor:"pointer", fontSize:16, opacity:0.7 }}>×</button>
        </div>
      )}

      <nav style={{ position: isPreview ? "sticky" : "fixed", top: showAnn ? PROMO_H : 0,
        left: isPreview ? undefined : 0, right: isPreview ? undefined : 0, zIndex: isPreview ? 10000 : 100,
        background:navBg, borderBottom: scrolled ? `1px solid ${navBorder}` : "1px solid transparent",
        boxShadow: scrolled ? "0 2px 16px rgba(0,0,0,0.06)" : "none", transition:"all 0.3s", padding:"0 24px" }}>
        <div style={{ maxWidth:1240, margin:"0 auto", height:NAV_H, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontWeight:900, fontSize:18, color:navText, letterSpacing:-0.5 }}>
            <EditableZone field="storeName" label="Nombre de la tienda">{storeName}</EditableZone>
          </div>
          <div className="tn-nav-links" style={{ gap:30, alignItems:"center" }}>
            <div className="tn-mega-wrap">
              <button onClick={() => smoothScrollTo("departamentos")}
                style={{ background:"none", border:"none", color:navTextMid, cursor:"pointer", fontSize:13, fontWeight:500, display:"flex", alignItems:"center", gap:4 }}>
                Departamentos <span style={{ fontSize:9 }}>▾</span>
              </button>
              <div className="tn-megamenu" style={{ position:"absolute", top:"100%", left:0, right:0,
                background:"#ffffff", borderTop:"1px solid #ececf5", boxShadow:"0 24px 50px rgba(15,15,26,0.12)", padding:"28px 24px", zIndex:200 }}>
                <div style={{ maxWidth:1240, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10 }}>
                  {CATEGORY_OPTIONS.map(c => (
                    <Link key={c.id} href={`/tienda/${config?.slug ?? ""}/productos?categoria=${c.id}&t=tech-nova${isPreview ? "&from=editor" : ""}`}
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:12, fontSize:12.5, fontWeight:600, color:"#0f0f1a",
                        textDecoration:"none", background:"#fafaff", border:"1px solid #ececf5" }}
                      onMouseEnter={e => (e.currentTarget.style.background = `${accent}14`)}
                      onMouseLeave={e => (e.currentTarget.style.background = "#fafaff")}>
                      <CategoryIcon id={c.id} color={accent} />{c.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            {[["Productos","productos"],["Beneficios","beneficios"],["Contacto","contacto"]].map(([lbl,id]) => (
              <button key={id} onClick={() => smoothScrollTo(id)} style={{ background:"none", border:"none", color:navTextMid, cursor:"pointer", fontSize:13, fontWeight:500 }}>{lbl}</button>
            ))}
            <Link href={catalogHref} style={{ background:accent, color:"#fff", padding:"9px 20px", fontSize:12, fontWeight:700, textDecoration:"none", borderRadius:100 }}>Ver catálogo</Link>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <button onClick={() => { setFavoritesOpen(true); setCartOpen(false); }}
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
                <div style={{ position:"absolute", top:"calc(100% + 10px)", right:0, background:"#fff", border:`1px solid ${navBorder}`, minWidth:190, zIndex:300, boxShadow:"0 8px 28px rgba(0,0,0,0.18)", borderRadius:10, overflow:"hidden" }}>
                  {user ? (
                    <>
                      <p style={{ padding:"10px 16px 4px", fontSize:11, color:"#9a9ab0", margin:0, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user.name || user.email.split("@")[0]}</p>
                      <a href={panelHref} onClick={() => setUserDropdownOpen(false)} style={{ display:"block", padding:"10px 16px", fontSize:13, color:"#0f0f1a", textDecoration:"none", borderBottom:"1px solid #f1f1f5" }}>{panelLabel}</a>
                      <button onClick={() => { if (isPreview) return; setUserDropdownOpen(false); signOut("/"); }}
                        style={{ display:"block", width:"100%", padding:"10px 16px", fontSize:13, color:"#dc2626", background:"none", border:"none", textAlign:"left", cursor: isPreview ? "default" : "pointer" }}>Cerrar sesión</button>
                    </>
                  ) : (
                    <>
                      <a href={isPreview ? undefined : `/login?redirect=/tienda/${config?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)} style={{ display:"block", padding:"12px 16px", fontSize:13, color:"#0f0f1a", textDecoration:"none", borderBottom:"1px solid #f1f1f5" }}>Iniciar sesión</a>
                      <a href={isPreview ? undefined : `/registro?plan=buyer&redirect=/tienda/${config?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)} style={{ display:"block", padding:"12px 16px", fontSize:13, color:"#0f0f1a", textDecoration:"none" }}>Registrarse</a>
                    </>
                  )}
                </div>
              )}
            </div>
            <button onClick={() => { setCartOpen(true); setFavoritesOpen(false); }} aria-label="Carrito" style={{ position:"relative", background:"none", border:"none", color:navTextMid, display:"flex", alignItems:"center", cursor:"pointer", padding:0 }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              {cartCount > 0 && <span style={{ position:"absolute", top:-4, right:-4, background:accent, color:accentText, borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{cartCount}</span>}
            </button>
            <button className="tn-burger" onClick={() => setMenuOpen(m => !m)}
              style={{ background:"none", border:`1px solid ${navBorder}`, color:navText, padding:"7px 11px", cursor:"pointer", fontSize:18 }}>{menuOpen ? "×" : "☰"}</button>
          </div>
        </div>
        {menuOpen && (
          <div style={{ background:navBg, borderTop:`1px solid ${navBorder}`, padding:"8px 24px 18px" }}>
            {[["Departamentos","departamentos"],["Productos","productos"],["Beneficios","beneficios"],["Contacto","contacto"]].map(([lbl,id]) => (
              <button key={id} onClick={() => { smoothScrollTo(id); setMenuOpen(false); }}
                style={{ display:"block", width:"100%", background:"none", border:"none", color:navTextMid, textAlign:"left", padding:"11px 0", fontSize:13, fontWeight:500, borderBottom:`1px solid ${navBorder}` }}>{lbl}</button>
            ))}
            <Link href={catalogHref} style={{ display:"block", color:accentOn(navBg, navText), padding:"14px 0", fontSize:13, fontWeight:700, textDecoration:"none" }} onClick={() => setMenuOpen(false)}>Ver catálogo completo →</Link>
          </div>
        )}
      </nav>

      {/* ── HERO — split, producto flotante a la derecha ── */}
      <section style={{ paddingTop: isPreview ? 0 : (showAnn ? PROMO_H + NAV_H : NAV_H), position:"relative", ...secBg(heroImg, heroBg) }}>
        <BgDragHandle imgKey="sectionbg_bgHero" />
        <SectionOverlay ov={heroImg} />
        <EditableSectionBg field="bgHero" label="Fondo hero" />
        <div style={{ position:"relative", zIndex:1, maxWidth:1240, margin:"0 auto", display:"flex", flexWrap:"wrap", alignItems:"center", minHeight: isPreview ? 460 : "calc(80vh - 64px)" }}>
          <div style={{ flex:"1 1 380px", padding:"56px 24px" }}>
            <p style={{ margin:"0 0 16px", fontSize:11, color:accentOn(heroBg, heroText), textTransform:"uppercase", letterSpacing:3, fontWeight:700 }}>
              <EditableZone field="heroKicker" label="Etiqueta hero">Tecnología que conecta tu vida</EditableZone>
            </p>
            <h1 style={{ margin:"0 0 20px", fontSize:"clamp(32px,5vw,54px)", fontWeight:900, color:heroText, letterSpacing:-1.5, lineHeight:1.05 }}>
              <EditableZone field="heroHeading" label="Título hero">Lo nuevo siempre cerca tuyo</EditableZone>
            </h1>
            <p style={{ margin:"0 0 30px", fontSize:15, color:heroMid, lineHeight:1.8, maxWidth:420 }}>
              <EditableZone field="heroSubtext" label="Subtítulo hero">Celulares, gaming, informática y audio con stock real y entrega rápida.</EditableZone>
            </p>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              <Link href={catalogHref} style={{ background:accent, color:"#fff", padding:"15px 32px", fontWeight:700, fontSize:13, borderRadius:100, textDecoration:"none" }}>Ver catálogo</Link>
              {showWA && (
                <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}${whatsapp.message?"?text="+encodeURIComponent(whatsapp.message):""}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:`1.5px solid ${heroText==="#ffffff"?"rgba(255,255,255,0.35)":"#d8d8e8"}`, color:heroText, textDecoration:"none", padding:"15px 24px", fontWeight:600, fontSize:13, borderRadius:100 }}>
                  Consultar
                </a>
              )}
            </div>
          </div>
          <div style={{ flex:"1 1 420px", position:"relative", display:"flex", justifyContent:"center", padding:"24px", minHeight:380 }}>
            <div style={{ position:"absolute", width:440, height:440, borderRadius:"50%", background:`${accent}22`, filter:"blur(50px)", zIndex:0 }} />
            <div className="tn-floating" style={{ position:"relative", zIndex:1, width:"min(420px,100%)", aspectRatio:"4/5", borderRadius:24, overflow:"hidden", boxShadow:"0 30px 60px rgba(124,58,237,0.25)" }}>
              <FadeImage src={heroImgUrl} alt="Producto destacado" fill sizes="(max-width: 768px) 100vw, 420px" priority
                style={{ objectFit:"cover", objectPosition:`${iovr["heroImage"]?.posX ?? 50}% ${iovr["heroImage"]?.posY ?? 50}%` }} />
              <PhotoOverlay ov={iovr["heroImage"]} />
              <BgDragHandle imgKey="heroImage" />
              <EditableImageButton field="heroImage" label="Imagen del hero" />
            </div>
          </div>
        </div>
      </section>

      {/* ── DEPARTAMENTOS — tarjetas grandes con imagen de fondo ── */}
      <section id="departamentos" data-reveal style={{ position:"relative", ...secBg(depImg, depBg), padding:"64px 24px" }}>
        <BgDragHandle imgKey="sectionbg_bgDepartamentos" />
        <SectionOverlay ov={depImg} />
        <EditableSectionBg field="bgDepartamentos" label="Fondo departamentos" />
        <div style={{ position:"relative", zIndex:1, maxWidth:1240, margin:"0 auto" }}>
          <h2 style={{ margin:"0 0 28px", fontSize:"clamp(22px,3.5vw,32px)", fontWeight:800, color:depText, letterSpacing:-0.5 }}>
            <EditableZone field="depHeading" label="Título departamentos">Explorá por categoría</EditableZone>
          </h2>
          {(() => {
            const usedCategoryIds = DEPARTAMENTOS.map((dd, j) => overrides[`dept${j}Cat`]?.text ?? dd.id);
            const items = DEPARTAMENTOS.map((d, i) => {
                const catKey = `dept${i}Cat`;
                const categoryId = overrides[catKey]?.text ?? d.id;
                // Si no es el dueño editando, ocultamos los departamentos sin productos
                // para no mandar al cliente a un catálogo vacío.
                if (!editMode && !products.some(p => p.category === categoryId)) return null;
                return (
                  <div key={i} className="tn-dep-item" style={{ position:"relative", scrollSnapAlign:"start" }}>
                    <Link className="tn-dep-card" href={`/tienda/${config?.slug ?? ""}/productos?categoria=${categoryId}&t=tech-nova${isPreview ? "&from=editor" : ""}`}
                      data-no-unsaved-guard={editMode ? "true" : undefined}
                      onClick={e => { if (editMode) e.preventDefault(); }}>
                      <FadeImage src={iovr[`dept${i}Image`]?.url ?? d.img} alt={d.label} fill sizes="(max-width: 768px) 50vw, 300px"
                        style={{ objectFit:"cover", objectPosition:`${iovr[`dept${i}Image`]?.posX ?? 50}% ${iovr[`dept${i}Image`]?.posY ?? 50}%` }} />
                      <PhotoOverlay ov={iovr[`dept${i}Image`]} />
                      <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(15,15,26,0.75), transparent 60%)" }} />
                      <span style={{ position:"absolute", bottom:16, left:18, color:"#fff", fontSize:15, fontWeight:700 }}>
                        <EditableZone field={`dept${i}Label`} label={`Departamento ${i+1} — texto`}>{d.label}</EditableZone>
                      </span>
                      <div onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
                        <BgDragHandle imgKey={`dept${i}Image`} />
                        <EditableImageButton field={`dept${i}Image`} label={`Departamento ${i+1} — imagen`} compact />
                      </div>
                    </Link>
                    {editMode && (
                      <select value={categoryId} onClick={e => e.stopPropagation()}
                        onChange={e => {
                          const newCat = e.target.value;
                          const conflictIdx = DEPARTAMENTOS.findIndex((dd, j) => j !== i && usedCategoryIds[j] === newCat);
                          if (conflictIdx !== -1) setOverride(`dept${conflictIdx}Cat`, { text: categoryId });
                          setOverride(catKey, { text: newCat });
                        }}
                        title="A qué categoría apunta esta tarjeta"
                        style={{ position:"absolute", top:8, left:8, zIndex:2, maxWidth:120, fontSize:11, border:"1px solid #7c3aed", borderRadius:8, background:"#fff", color:"#4c1d95", cursor:"pointer", padding:"3px 6px" }}>
                        {CATEGORY_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    )}
                  </div>
                );
              }).filter(Boolean);
            if (!editMode && items.length === 0) {
              return <p style={{ margin:0, color:"#9a9ab0", fontSize:14, textAlign:"center" }}>Todavía no hay categorías con productos cargados.</p>;
            }
            return (
              <div style={{ position:"relative" }}>
                {DEPARTAMENTOS.length > 3 && items.length > 3 && (
                  <>
                    <button onClick={() => scrollRow(depScrollRef, -1)} aria-label="Anterior"
                      style={{ position:"absolute", left:-36, top:"42%", transform:"translateY(-50%)", width:36,
                        border:"none", background:"none", color:depText, opacity:0.6, textShadow:"0 0 6px rgba(255,255,255,0.5), 0 0 6px rgba(0,0,0,0.5)", fontSize:44, lineHeight:1, cursor:"pointer", zIndex:2,
                        display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
                    <button onClick={() => scrollRow(depScrollRef, 1)} aria-label="Siguiente"
                      style={{ position:"absolute", right:-36, top:"42%", transform:"translateY(-50%)", width:36,
                        border:"none", background:"none", color:depText, opacity:0.6, textShadow:"0 0 6px rgba(255,255,255,0.5), 0 0 6px rgba(0,0,0,0.5)", fontSize:44, lineHeight:1, cursor:"pointer", zIndex:2,
                        display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
                  </>
                )}
                <div ref={depScrollRef} className="tn-dep-row" style={{ display:"flex", gap:16, overflowX:"auto", scrollSnapType:"x mandatory", paddingBottom:4 }}>
                  {items}
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ── CONFIANZA — tarjetas con borde ── */}
      <section data-reveal style={{ position:"relative", ...secBg(trustImg, trustBg), padding:"56px 24px" }}>
        <BgDragHandle imgKey="sectionbg_bgConfianza" />
        <SectionOverlay ov={trustImg} />
        <EditableSectionBg field="bgConfianza" label="Fondo confianza" />
        <div className="tn-trust-grid" style={{ position:"relative", zIndex:1, maxWidth:1240, margin:"0 auto", display:"grid", gap:14 }}>
          {CONFIANZA.map((c, i) => {
            const iconIdx = Math.abs(parseInt(overrides[`trust${i+1}IconIdx`]?.text ?? String(c.iconDefault)) || 0) % TRUST_ICONS.length;
            const nextIdx = (iconIdx + 1) % TRUST_ICONS.length;
            return (
              <div key={i} style={{ textAlign:"center", padding:"28px 18px", borderRadius:16, border:`1.5px solid ${accent}25`, background: trustText==="#ffffff" ? "rgba(255,255,255,0.04)" : "#fff" }}>
                <div style={{ marginBottom:10, color:accentOn(trustText==="#ffffff" ? trustBg : "#ffffff", trustText), position:"relative", display:"inline-flex" }}>
                  {TRUST_ICONS[iconIdx]}
                  {editMode && (
                    <button onClick={() => setOverride(`trust${i+1}IconIdx`, { text: String(nextIdx) })} title="Cambiar ícono"
                      style={{ position:"absolute", inset:-6, background:"rgba(124,58,237,0.9)", border:"none", borderRadius:4, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11, opacity:0.8, transition:"opacity 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.opacity="1")} onMouseLeave={e => (e.currentTarget.style.opacity="0.8")}>↻</button>
                  )}
                </div>
                <p style={{ margin:"0 0 4px", fontSize:13.5, fontWeight:700, color:trustText }}><EditableZone field={c.fv} label={`Sello ${i+1} título`}>{c.t}</EditableZone></p>
                <p style={{ margin:0, fontSize:11.5, color:trustMid }}><EditableZone field={c.fl} label={`Sello ${i+1} descripción`}>{c.d}</EditableZone></p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── OFERTAS ── */}
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
                  <button onClick={() => scrollRow(ofertasScrollRef, -1)} aria-label="Anterior"
                    style={{ position:"absolute", left:-36, top:"38%", transform:"translateY(-50%)", width:36,
                      border:"none", background:"none", color:ofertasText, opacity:0.6, textShadow:"0 0 6px rgba(255,255,255,0.5), 0 0 6px rgba(0,0,0,0.5)", fontSize:44, lineHeight:1, cursor:"pointer", zIndex:2,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
                  <button onClick={() => scrollRow(ofertasScrollRef, 1)} aria-label="Siguiente"
                    style={{ position:"absolute", right:-36, top:"38%", transform:"translateY(-50%)", width:36,
                      border:"none", background:"none", color:ofertasText, opacity:0.6, textShadow:"0 0 6px rgba(255,255,255,0.5), 0 0 6px rgba(0,0,0,0.5)", fontSize:44, lineHeight:1, cursor:"pointer", zIndex:2,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
                </>
              )}
              <div ref={ofertasScrollRef} className="tn-prod-row" style={{ display:"flex", gap:18, overflowX:"auto", scrollSnapType:"x mandatory", paddingBottom:4 }}>
                {ofertas.map(p => (
                  <div key={p.id} className="tn-prod-item" style={{ scrollSnapAlign:"start" }}>
                    <ProductCard product={p} currency={currency} editMode={canOpenDemo}
                      href={`/tienda/${config?.slug ?? ""}/producto/${p.id}${isPreview ? "?from=editor" : ""}`}
                      isFavorite={favorites.includes(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── PRODUCTOS — specs aparecen al hover ── */}
      <section id="productos" data-reveal style={{ position:"relative", ...secBg(prodImg, prodBg), padding:"64px 24px" }}>
        <BgDragHandle imgKey="sectionbg_bgProductos" />
        <SectionOverlay ov={prodImg} />
        <EditableSectionBg field="bgProductos" label="Fondo productos" />
        <div style={{ position:"relative", zIndex:1, maxWidth:1240, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:28, flexWrap:"wrap", gap:12 }}>
            <h2 style={{ margin:0, fontSize:"clamp(20px,3vw,28px)", fontWeight:800, color:prodText, letterSpacing:-0.5 }}>
              <EditableZone field="prodHeading" label="Título productos">Lo más buscado</EditableZone>
            </h2>
            {hasMore && <Link href={catalogHref} style={{ fontSize:13, fontWeight:700, color:accentOn(prodBg, prodText), textDecoration:"none" }}>Ver todo →</Link>}
          </div>

          {loadingProducts ? (
            <div style={{ textAlign:"center", padding:"60px 0" }}>
              <div style={{ width:36, height:36, border:`3px solid ${accent}`, borderTopColor:"transparent", borderRadius:"50%", animation:"tn-spin 0.8s linear infinite", margin:"0 auto" }} />
            </div>
          ) : showcased.length > 0 ? (
            <div style={{ position:"relative" }}>
              {showcased.length > 4 && (
                <>
                  <button onClick={() => scrollRow(prodScrollRef, -1)} aria-label="Anterior"
                    style={{ position:"absolute", left:-36, top:"38%", transform:"translateY(-50%)", width:36,
                      border:"none", background:"none", color:prodText, opacity:0.6, textShadow:"0 0 6px rgba(255,255,255,0.5), 0 0 6px rgba(0,0,0,0.5)", fontSize:44, lineHeight:1, cursor:"pointer", zIndex:2,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
                  <button onClick={() => scrollRow(prodScrollRef, 1)} aria-label="Siguiente"
                    style={{ position:"absolute", right:-36, top:"38%", transform:"translateY(-50%)", width:36,
                      border:"none", background:"none", color:prodText, opacity:0.6, textShadow:"0 0 6px rgba(255,255,255,0.5), 0 0 6px rgba(0,0,0,0.5)", fontSize:44, lineHeight:1, cursor:"pointer", zIndex:2,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
                </>
              )}
              <div ref={prodScrollRef} className="tn-prod-row" style={{ display:"flex", gap:18, overflowX:"auto", scrollSnapType:"x mandatory", paddingBottom:4 }}>
                {showcased.map(p => (
                  <div key={p.id} className="tn-prod-item" style={{ scrollSnapAlign:"start" }}>
                    <ProductCard product={p} currency={currency} editMode={canOpenDemo}
                      href={`/tienda/${config?.slug ?? ""}/producto/${p.id}${isPreview ? "?from=editor" : ""}`}
                      isFavorite={favorites.includes(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:"60px 24px", border:"1px dashed #ececf5", borderRadius:12 }}>
              <p style={{ margin:0, color:"#9a9ab0", fontSize:14 }}>Aún no hay productos publicados.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── BANNER PROMOCIONAL ── */}
      <PromoBannerCarousel
        images={[config?.imageOverrides?.["promoBanner1"], config?.imageOverrides?.["promoBanner2"], config?.imageOverrides?.["promoBanner3"]]}
        demoImages={[
          "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=80",
          "https://images.unsplash.com/photo-1593640495253-23196b27a87f?auto=format&fit=crop&w=1920&q=80",
          "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=1920&q=80",
        ]}
        intervalMs={config?.bannerInterval ?? 4000}
        editMode={editMode}
        isPreview={isPreview}
        accent={accent}
        bg="#0f0f1a"
      />

      {/* ── BENEFICIOS — lista con íconos ── */}
      <section id="beneficios" data-reveal style={{ position:"relative", ...secBg(benefImg, benefBg), padding:"64px 24px" }}>
        <BgDragHandle imgKey="sectionbg_bgNosotros" />
        <SectionOverlay ov={benefImg} />
        <EditableSectionBg field="bgNosotros" label="Fondo beneficios" />
        <div style={{ position:"relative", zIndex:1, maxWidth:1240, margin:"0 auto" }}>
          <p style={{ margin:"0 0 8px", fontSize:11, color:accentOn(benefBg, benefText), textTransform:"uppercase", letterSpacing:2, fontWeight:700 }}>
            <EditableZone field="benefKicker" label="Kicker beneficios">Por qué elegirnos</EditableZone>
          </p>
          <h2 style={{ margin:"0 0 32px", fontSize:"clamp(22px,4vw,32px)", fontWeight:800, color:benefText, letterSpacing:-0.5 }}>
            <EditableZone field="benefHeading" label="Título beneficios">Beneficios de comprar acá</EditableZone>
          </h2>
          <div className="tn-benef-grid" style={{ display:"grid", gap:18 }}>
            {[
              { field:"benef1", def:"Entrega inmediata en productos con stock" },
              { field:"benef2", def:"Cambios sin cargo dentro de los primeros 10 días" },
              { field:"benef3", def:"Asesoramiento antes de comprar por WhatsApp" },
              { field:"benef4", def:"Compra protegida con Mercado Pago" },
            ].map(({ field, def }, i) => {
              const iconIdx = Math.abs(parseInt(overrides[`${field}IconIdx`]?.text ?? String(BENEF_ICON_DEFAULTS[i])) || 0) % TRUST_ICONS.length;
              const nextIdx = (iconIdx + 1) % TRUST_ICONS.length;
              return (
                <div key={field} style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
                  <div style={{ width:42, height:42, borderRadius:12, background:`${accent}15`, color:accent, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, position:"relative" }}>
                    {TRUST_ICONS[iconIdx]}
                    {editMode && (
                      <button onClick={() => setOverride(`${field}IconIdx`, { text: String(nextIdx) })} title="Cambiar ícono"
                        style={{ position:"absolute", inset:0, background:"rgba(124,58,237,0.9)", border:"none", borderRadius:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:14, opacity:0.8, transition:"opacity 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.opacity="1")} onMouseLeave={e => (e.currentTarget.style.opacity="0.8")}>↻</button>
                    )}
                  </div>
                  <p style={{ margin:0, fontSize:14, color:benefMid, lineHeight:1.7, paddingTop:8 }}>
                    <EditableZone field={field} label="Beneficio">{def}</EditableZone>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CONTACTO — foto de fondo + tarjeta flotante con glow ── */}
      <section id="contacto" data-reveal style={{ position:"relative", padding:"90px 24px", overflow:"hidden", display:"flex", justifyContent:"center" }}>
        {!contactoImg?.url && (
          <>
            <FadeImage src={contactoUrl} alt="" fill sizes="100vw"
              style={{ objectFit:"cover", objectPosition:`${iovr["contactoImage"]?.posX ?? 50}% ${iovr["contactoImage"]?.posY ?? 50}%` }} />
            <PhotoOverlay ov={iovr["contactoImage"]} />
            <BgDragHandle imgKey="contactoImage" />
          </>
        )}
        {contactoImg?.url && <div style={{ position:"absolute", inset:0, ...secBg(contactoImg, contactoBg) }} />}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg, rgba(15,15,26,0.75), rgba(15,15,26,0.92))" }} />
        <BgDragHandle imgKey="sectionbg_bgContacto" />
        <EditableSectionBg field="bgContacto" label="Fondo contacto" />
        <EditableImageButton field="contactoImage" label="Imagen de fondo (contacto)" />
        <div style={{ position:"absolute", width:380, height:380, borderRadius:"50%", background:`${accent}40`, filter:"blur(60px)", zIndex:0 }} />
        <div style={{ position:"relative", zIndex:1, maxWidth:480, width:"100%", textAlign:"center" }}>
          <p style={{ margin:"0 0 10px", fontSize:11, color:accentOn("#0f0f1a", conText), textTransform:"uppercase", letterSpacing:2, fontWeight:700 }}>Contacto</p>
          <h2 style={{ margin:"0 0 14px", fontSize:"clamp(24px,4vw,32px)", fontWeight:800, color:conText, letterSpacing:-0.5 }}>
            <EditableZone field="contactHeading" label="Título contacto">Hablemos</EditableZone>
          </h2>
          <p style={{ margin:"0 0 28px", fontSize:14.5, color:conMid, lineHeight:1.85 }}>
            <EditableZone field="contactSubtext" label="Subtítulo contacto">Dejanos tu consulta y te respondemos a la brevedad.</EditableZone>
          </p>
          <div style={{ background:"rgba(255,255,255,0.97)", backdropFilter:"blur(10px)", borderRadius:20, padding:30,
            boxShadow:`0 30px 70px ${accent}33`, border:"1px solid rgba(255,255,255,0.4)", textAlign:"left" }}>
            <ContactForm storeId={config?.storeId} accent={accent} textColor="#0f0f1a" mutedColor="#6b6b80" radius={10} isPreview={isPreview} />
          </div>
          <div style={{ display:"flex", justifyContent:"center", gap:20, marginTop:24, flexWrap:"wrap" }}>
            <Link href={catalogHref} style={{ color:accentOn("#0f0f1a", conText), fontWeight:700, fontSize:13, textDecoration:"none" }}>Ver catálogo completo →</Link>
            {showWA && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}${whatsapp.message?"?text="+encodeURIComponent(whatsapp.message):""}`}
                target="_blank" rel="noopener noreferrer"
                style={{ color:"#25d366", textDecoration:"none", fontWeight:600, fontSize:13 }}>
                <EditableZone field="contactWhatsApp" label="Texto link WhatsApp">o escribinos por WhatsApp</EditableZone>
              </a>
            )}
          </div>
          {(editMode || isPreview || socialNets.some(([key]) => social?.[key])) && (
            <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:10, marginTop:20 }}>
              {socialNets.map(([key, label]) => {
                const url = social?.[key];
                if (!editMode && !isPreview && !url) return null;
                return (
                  <a key={key} href={url || "#"} target={url ? "_blank" : undefined} rel="noopener noreferrer"
                    onClick={e => { if (!url) e.preventDefault(); }}
                    style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:100, border:`1px solid ${conText==="#ffffff"?"rgba(255,255,255,0.15)":"#ececf5"}`, textDecoration:"none", color:conText, fontSize:12.5, fontWeight:600, opacity: url ? 1 : 0.4 }}>
                    <SocialIcon network={key} /> {label}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <footer style={{ position:"relative", ...secBg(footerImg, footerBg), color:ftText, padding:"32px 24px", textAlign:"center" }}>
        <BgDragHandle imgKey="sectionbg_bgFooter" />
        <SectionOverlay ov={footerImg} />
        <EditableSectionBg field="bgFooter" label="Fondo footer" />
        <div style={{ position:"relative", zIndex:1 }}>
        <p style={{ margin:"0 0 6px", fontWeight:900, fontSize:14, color:accentOn(footerBg, ftText) }}>{storeName}</p>
        <p style={{ margin:"0 0 12px", fontSize:11, color:ftMid }}>© {new Date().getFullYear()} {storeName}. Todos los derechos reservados.</p>
        <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:"0 16px" }}>
          {[["Política de devoluciones","devoluciones"],["Política de envíos","envios"],["Términos y condiciones","terminos"]].map(([label, tipo]) => (
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
        <div style={{ position:"absolute", top:0, right:0, bottom:0, width:400, maxWidth:"100vw", background:"#fff", transform: favoritesOpen ? "translateX(0)" : "translateX(100%)", transition:"transform 0.35s cubic-bezier(.4,0,.2,1)", display:"flex", flexDirection:"column", borderLeft:"1px solid #ececf5" }}>
          <div style={{ padding:"20px 24px 14px", borderBottom:"1px solid #f1f1f5", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <p style={{ fontWeight:700, fontSize:16, margin:0, color:"#0f0f1a" }}>Favoritos <span style={{ fontWeight:400, fontSize:13, color:"#9a9ab0" }}>({favorites.length})</span></p>
            <button onClick={() => setFavoritesOpen(false)} style={{ background:"none", border:"none", color:"#0f0f1a", fontSize:22, cursor:"pointer" }}>×</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"14px 24px" }}>
            {favoriteProducts.length === 0 ? (
              <div style={{ textAlign:"center", padding:"52px 0", color:"#9a9ab0" }}>
                <p style={{ fontSize:32, marginBottom:12 }}>♡</p>
                <p style={{ fontSize:13, lineHeight:1.8 }}>No tenés favoritos aún.<br/>Explorá el catálogo.</p>
              </div>
            ) : favoriteProducts.map(product => (
              <div key={product.id} style={{ display:"flex", gap:14, padding:"14px 0", borderBottom:"1px solid #f5f5fa" }}>
                {product.images[0] ? (
                  <FadeImage src={product.images[0]} alt="" width={80} height={60} style={{ objectFit:"cover", borderRadius:8, flexShrink:0, background:"#fafaff" }} />
                ) : (
                  <div style={{ width:80, height:60, borderRadius:8, flexShrink:0, background:"#fafaff" }} />
                )}
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14, fontWeight:600, margin:"0 0 4px", color:"#0f0f1a" }}>{product.name}</p>
                  <p style={{ fontSize:13, color:accentOn("#ffffff", "#0f0f1a"), fontWeight:700, margin:"0 0 10px" }}>{fmtPrice(product.price, currency)}</p>
                  <div style={{ display:"flex", gap:8 }}>
                    <Link href={`/tienda/${config?.slug ?? ""}/producto/${product.id}${isPreview ? "?from=editor" : ""}`}
                      onClick={e => { if (!canOpenDemo && isDemoProductId(product.id)) e.preventDefault(); else setFavoritesOpen(false); }}
                      style={{ background:accent, color:"#fff", border:"none", borderRadius:100, padding:"7px 14px", fontSize:11, fontWeight:600, cursor:"pointer", textDecoration:"none" }}>
                      Ver
                    </Link>
                    <button onClick={() => toggleFavorite(product.id)}
                      style={{ background:"transparent", color:"#9a9ab0", border:"1px solid #ececf5", borderRadius:100, padding:"7px 14px", fontSize:11, cursor:"pointer" }}>
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
      <CheckoutModal cart={cart} theme={cartTheme} isPreview={isPreview} />

      {toastMsg && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#111", color:"#fff", padding:"12px 20px", fontSize:13, fontWeight:600, zIndex:600, boxShadow:"0 4px 20px rgba(0,0,0,0.35)", whiteSpace:"nowrap" }}>
          {toastMsg}
        </div>
      )}

      {showWA && (
        <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}${whatsapp.message?"?text="+encodeURIComponent(whatsapp.message):""}`}
          target="_blank" rel="noopener noreferrer"
          style={{ position:"fixed", bottom:24, right:24, zIndex:500, background:"#25d366", color:"white", width:56, height:56,
            borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 24px rgba(37,211,102,0.45)", textDecoration:"none" }}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 6.32A8.86 8.86 0 0 0 12.07 3a8.86 8.86 0 0 0-7.65 13.43L3 21l4.74-1.24a8.86 8.86 0 0 0 4.33 1.1h.01c4.9 0 8.87-3.97 8.87-8.86 0-2.37-.92-4.6-2.35-6.68zm-5.53 13.63a7.37 7.37 0 0 1-3.76-1.03l-.27-.16-2.8.73.75-2.73-.18-.28a7.36 7.36 0 0 1-1.13-3.93c0-4.07 3.31-7.38 7.39-7.38a7.34 7.34 0 0 1 5.22 2.17 7.34 7.34 0 0 1 2.16 5.22c0 4.07-3.31 7.39-7.38 7.39zm4.04-5.53c-.22-.11-1.3-.64-1.5-.71-.2-.08-.35-.11-.5.11-.15.22-.57.71-.7.86-.13.15-.26.16-.48.06-.22-.11-.93-.34-1.77-1.09-.65-.58-1.09-1.3-1.22-1.52-.13-.22-.01-.34.1-.45.1-.11.22-.28.33-.42.11-.14.15-.24.22-.4.08-.16.04-.3-.04-.42-.08-.11-.5-1.2-.69-1.65-.18-.43-.37-.37-.51-.38-.13-.01-.28-.01-.43-.01-.15 0-.39.06-.6.28-.21.22-.8.78-.8 1.9 0 1.12.81 2.2.93 2.35.11.15 1.55 2.37 3.76 3.23 1.87.73 2.25.59 2.66.55.41-.04 1.3-.53 1.49-1.04.18-.51.18-.94.13-1.04-.06-.1-.22-.16-.44-.27z"/></svg>
        </a>
      )}
    </div>
  );
}
