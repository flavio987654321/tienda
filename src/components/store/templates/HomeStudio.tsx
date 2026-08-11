"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FadeImage } from "@/components/store/templates/shared/FadeImage";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { usePushBell } from "@/contexts/PushBellContext";
import { useAuth } from "@/components/AuthProvider";
import StoreFollowButton from "@/components/store/StoreFollowButton";
import { EditableZone, EditableImageButton, EditableSectionBg, BgDragHandle, getContrastColor, getReadableAccentText, useEditContext, textoSobre } from "@/contexts/EditContext";
import { useStorefront, isDemoProductId, type StorefrontProduct } from "@/hooks/useStorefront";
import { resolveProductPromo, describePromo } from "@/lib/promoDisplay";
import { PromoTag } from "@/components/store/PromoDisplay";
import type { ActivePromotion } from "@/lib/pricing";
import { useCartLogic } from "@/hooks/useCartLogic";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ContactForm } from "@/components/store/templates/shared/ContactForm";
import { CartDrawer, type CartTheme } from "@/components/store/templates/shared/CartDrawer";
import { CheckoutModal } from "@/components/store/templates/shared/CheckoutModal";
import { PromoBannerCarousel } from "@/components/store/templates/shared/PromoBannerCarousel";
import { SectionBlock } from "@/components/store/templates/shared/SectionBlock";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import type { ImageOverride } from "@/types/store-config";
import { linksLegales } from "@/lib/politicas-tienda";

function smoothScrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}
function secBg(ov: ImageOverride | undefined, fallback: string): React.CSSProperties {
  if (ov?.url) return { backgroundImage: `url(${ov.url})`, backgroundSize: "cover", backgroundPosition: `${ov.posX ?? 50}% ${ov.posY ?? 50}%` };
  return { background: fallback };
}
function secText(ov: ImageOverride | undefined, bg: string): string {
  if (ov?.url) return ov.overlayType === "light" ? "#2c2218" : "#ffffff";
  return getContrastColor(bg) === "light" ? "#ffffff" : "#2c2218";
}
function secMid(ov: ImageOverride | undefined, bg: string): string {
  if (ov?.url) return ov.overlayType === "light" ? "#6b5c4a" : "rgba(255,255,255,0.65)";
  return getContrastColor(bg) === "light" ? "rgba(255,255,255,0.65)" : "#7a6a56";
}
function SectionOverlay({ ov }: { ov: ImageOverride | undefined }) {
  if (!ov?.url || ov.overlayType === "none") return null;
  return <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none",
    background: ov.overlayType==="light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.5})` }} />;
}
// Para fotos simples (hero, departamentos, nosotros, contacto, menú) que
// siempre muestran una imagen (de stock o subida) — la capa se aplica en
// cuanto el dueño la elige, aunque todavía no haya subido una foto propia.
function PhotoOverlay({ ov }: { ov: ImageOverride | undefined }) {
  if (!ov?.overlayType || ov.overlayType === "none") return null;
  return <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none",
    background: ov.overlayType==="light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.5})` }} />;
}
function fmtPrice(n: number, currency: string) {
  return `${currency === "ARS" ? "$" : currency} ${n.toLocaleString("es-AR")}`;
}

const DEPARTAMENTOS = [
  { id: "muebles-y-colchones", label: "Muebles y Colchones", img: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=700&q=70", big: true },
  { id: "casa-y-jardin", label: "Casa y Jardín", img: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=500&q=70", big: false },
  { id: "electrodomesticos", label: "Electrodomésticos", img: "https://images.unsplash.com/photo-1556909114-44e3e70034e2?auto=format&fit=crop&w=500&q=70", big: false },
  { id: "pequenos-electrodomesticos", label: "Pequeños Electro", img: "https://images.unsplash.com/photo-1495195134817-aeb325a55b65?auto=format&fit=crop&w=500&q=70", big: false },
  { id: "audio-imagen-y-video", label: "Audio y TV", img: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=500&q=70", big: false },
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

function ProductCard({ product, href, currency, accent, bg, text, isFavorite, onToggleFavorite, editMode, promotions }: {
  product: StorefrontProduct; href: string; currency: string; accent: string; bg: string; text: string; isFavorite: boolean; onToggleFavorite: () => void; editMode?: boolean; promotions?: ActivePromotion[];
}) {
  const promo = resolveProductPromo(product, promotions);
  // Los demos de relleno no existen en la base: antes de guardar el template, la tienda
  // pública todavía resuelve con el tipoTienda viejo y el detalle da "no disponible".
  const isUnclickableDemo = !editMode && isDemoProductId(product.id);
  return (
    <Link href={href} onClick={e => { if (isUnclickableDemo) e.preventDefault(); }}
      style={{ textDecoration:"none", color:"inherit", display:"block", cursor: isUnclickableDemo ? "default" : "pointer" }}>
      <div style={{ aspectRatio:"4/5", background:"#f0ebe2", marginBottom:16, overflow:"hidden", position:"relative" }}>
        {promo.primaryPromo && <PromoTag tipo={promo.primaryPromo.type} label={describePromo(promo.primaryPromo).headline} size="sm" />}
        <button onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(); }}
          aria-label="Favorito"
          style={{ position:"absolute", top:10, right:10, zIndex:1, width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,0.92)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill={isFavorite ? accent : "none"} stroke={isFavorite ? accent : "#7a6a56"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        {product.images[0] ? (
          <FadeImage src={product.images[0]} alt={product.name} fill sizes="(max-width: 768px) 50vw, 25vw" style={{ objectFit:"cover" }} />
        ) : (
          <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"#c9bba9", fontSize:13 }}>Sin imagen</div>
        )}
      </div>
      <p style={{ margin:"0 0 6px", fontSize:14, fontWeight:500, color:"#2c2218" }}>{product.name}</p>
      <p style={{ margin:0, fontSize:15, fontWeight:600, color: promo.hasPriceDrop ? "#dc2626" : getReadableAccentText(accent, bg, text) }}>
        {promo.hasPriceDrop ? (
          <>
            {fmtPrice(promo.effectivePrice, currency)}
            <span style={{ marginLeft:8, fontSize:13, color:"#c9bba9", textDecoration:"line-through" }}>{fmtPrice(promo.originalPrice, currency)}</span>
          </>
        ) : (
          <>
            {fmtPrice(product.price, currency)}
            {product.comparePrice && product.comparePrice > product.price && (
              <span style={{ marginLeft:8, fontSize:13, color:"#c9bba9", textDecoration:"line-through" }}>{fmtPrice(product.comparePrice, currency)}</span>
            )}
          </>
        )}
      </p>
    </Link>
  );
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

const HS_SECTION_IDS = ["hs-departamentos", "hs-confianza", "hs-ofertas", "hs-productos", "hs-promo", "hs-mayorista", "hs-nosotros", "hs-contacto"];

export default function HomeStudio() {
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
  const isPreview = !!config?.previewFill;
  // editMode se activa apenas se entra a "Editando" un diseño, pero el tipoTienda
  // real recién queda persistido en la base cuando se aprieta "Guardar cambios".
  // Hasta entonces, la tienda pública no resuelve los productos demo de relleno.
  const canOpenDemo = editMode && !!config?.templateSaved;
  const isOwner   = !!config?.isOwner;
  const accent    = config?.colors.accent ?? "#b5652a";
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
  const cartTheme: CartTheme = { BG:"#faf8f4", S:"#fff", T:"#2c2218", MID:"#9a8a76", border:"#f1ece4", accent, accentText, serif:"Georgia, serif" };
  const currency  = config?.currency ?? "ARS";
  const storeName = config?.storeName ?? "HOME STUDIO";
  const whatsapp  = config?.whatsapp ?? { enabled:false, number:"", message:"" };
  // En modo edición lo mostramos con solo activarlo, para que se pueda previsualizar
  // antes de completar el número; en la tienda real hace falta el número sí o sí.
  const showWA    = whatsapp.enabled && (editMode || !!whatsapp.number);

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

  const heroBg      = sc["bgHero"] ?? "#2c2218";
  const heroImg     = iovr["sectionbg_bgHero"];
  const heroText    = secText(heroImg, heroBg);
  const heroMid     = secMid(heroImg, heroBg);
  const heroImgUrl  = iovr["heroImage"]?.url ?? "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1400&q=80";

  const depBg       = sc["bgDepartamentos"] ?? "#faf8f4";
  const depImg      = iovr["sectionbg_bgDepartamentos"];
  const depText     = secText(depImg, depBg);

  const trustBg     = sc["bgConfianza"] ?? "#faf8f4";
  const trustImg    = iovr["sectionbg_bgConfianza"];
  const trustMid    = secMid(trustImg, trustBg);

  const ofertasBg   = sc["bgOfertas"] ?? "#f0ebe2";
  const ofertasImg  = iovr["sectionbg_bgOfertas"];
  const ofertasText = secText(ofertasImg, ofertasBg);

  const prodBg      = sc["bgProductos"] ?? "#ffffff";
  const prodImg     = iovr["sectionbg_bgProductos"];
  const prodText    = secText(prodImg, prodBg);

  const nosotrosBg  = sc["bgNosotros"] ?? "#faf8f4";
  const nosotrosImg = iovr["sectionbg_bgNosotros"];
  const nosText     = secText(nosotrosImg, nosotrosBg);
  const nosMid      = secMid(nosotrosImg, nosotrosBg);
  const nosotrosUrl = iovr["nosotrosImage"]?.url ?? "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80";

  const contactoBg  = sc["bgContacto"] ?? "#2c2218";
  const contactoImg = iovr["sectionbg_bgContacto"];
  const conText     = secText(contactoImg, contactoBg);
  const conMid      = secMid(contactoImg, contactoBg);
  const contactoUrl = iovr["contactoImage"]?.url ?? "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1400&q=70";

  const footerBg    = sc["bgFooter"] ?? "#2c2218";
  const footerImg   = iovr["sectionbg_bgFooter"];
  const ftText      = secText(footerImg, footerBg);
  const ftMid       = secMid(footerImg, footerBg);

  const navBg       = sc["navBg"] ?? "#faf8f4";
  const navDark     = getContrastColor(navBg) === "light";
  const navText     = navDark ? "#ffffff" : "#2c2218";
  const navTextMid  = navDark ? "rgba(255,255,255,0.7)" : "#7a6a56";
  const navBorder   = navDark ? "rgba(255,255,255,0.15)" : "rgba(181,101,41,0.18)";

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [annIdx, setAnnIdx]     = useState(0);
  const [annVisible, setAnnVisible] = useState(true);

  const DEFAULTS = ["🌿 Diseño que transforma tu hogar", "💳 Cuotas con tarjeta", "🚚 Envíos a todo el país"];
  const promoBannerEnabled = config?.promoBanner?.enabled !== false;
  const annMessages = (config?.promoBanner?.messages?.filter(m => m.trim()) ?? []).length > 0
    ? config!.promoBanner!.messages!.filter(m => m.trim())
    : DEFAULTS;
  const showAnn = promoBannerEnabled && annVisible;
  const PROMO_H = 36;
  const NAV_H   = 68;

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
  const showcased = (featuredProducts.length > 0 ? featuredProducts : products).slice(0, 6);
  const hasMore   = (featuredProducts.length > 0 ? featuredProducts : products).length > 6;
  const allOfertas = products.filter(p => p.comparePrice && p.comparePrice > p.price);
  const ofertas    = allOfertas.slice(0, 6);
  const hasMoreOfertas = allOfertas.length > 6;
  const catalogHref = `/tienda/${config?.slug ?? ""}/productos?t=home-studio${isPreview ? "&from=editor" : ""}`;

  return (
    <div style={{ background:"#faf8f4", color:"#2c2218", fontFamily:"Inter, system-ui, sans-serif", minHeight:"100vh" }}>
      <style>{`
        .hs-nav-links { display:none }
        @media(min-width:768px){ .hs-nav-links { display:flex } .hs-burger { display:none } }
        .hs-mosaic { display:grid; grid-template-columns:1fr; gap:16px }
        @media(min-width:700px){ .hs-mosaic { grid-template-columns:repeat(4,1fr); grid-auto-rows:160px; grid-auto-flow:dense } }
        .hs-mosaic-big { grid-column:span 2; grid-row:span 2 }
        .hs-mosaic-card { position:relative; border-radius:18px; overflow:hidden; text-decoration:none; display:block; min-height:160px }
        .hs-mosaic-card img { width:100%; height:100%; object-fit:cover; position:absolute; inset:0; transition:transform 0.5s }
        .hs-mosaic-card:hover img { transform:scale(1.06) }
        .hs-prod-grid { grid-template-columns:1fr }
        @media(min-width:600px){ .hs-prod-grid { grid-template-columns:repeat(2,1fr) } }
        @media(min-width:1024px){ .hs-prod-grid { grid-template-columns:repeat(3,1fr) } }
        .hs-about { grid-template-columns:1fr }
        @media(min-width:768px){ .hs-about { grid-template-columns:1fr 1fr } }
        @keyframes hs-spin { to { transform:rotate(360deg) } }
        .hs-megamenu { opacity:0; visibility:hidden; transform:translateY(-6px); transition:all 0.2s; }
        .hs-mega-wrap:hover .hs-megamenu, .hs-megamenu:hover { opacity:1; visibility:visible; transform:translateY(0); }
      `}</style>

      {showAnn && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top:0,
          left: isPreview ? undefined : 0, right: isPreview ? undefined : 0,
          zIndex: isPreview ? 10001 : 110, height:PROMO_H, background:accent,
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:11, fontWeight:600, color:"#fff", letterSpacing:0.5 }}>{annMessages[annIdx]}</span>
          <button onClick={() => setAnnVisible(false)}
            style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#fff", cursor:"pointer", fontSize:16, opacity:0.7 }}>×</button>
        </div>
      )}

      <nav style={{ position: isPreview ? "sticky" : "fixed", top: showAnn ? PROMO_H : 0,
        left: isPreview ? undefined : 0, right: isPreview ? undefined : 0, zIndex: isPreview ? 10000 : 100,
        background:navBg, borderBottom: scrolled ? `1px solid ${navBorder}` : "1px solid transparent",
        boxShadow: scrolled ? "0 2px 16px rgba(0,0,0,0.05)" : "none", transition:"all 0.3s", padding:"0 28px" }}>
        <div style={{ maxWidth:1240, margin:"0 auto", height:NAV_H, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontWeight:700, fontSize:18, color:navText, letterSpacing:1, fontFamily:"Georgia, serif" }}>
            <EditableZone field="storeName" label="Nombre de la tienda">{storeName}</EditableZone>
          </div>
          <div className="hs-nav-links" style={{ gap:32, alignItems:"center" }}>
            <div className="hs-mega-wrap" style={{ position:"relative" }}>
              <button onClick={() => smoothScrollTo("departamentos")}
                style={{ background:"none", border:"none", color:navTextMid, cursor:"pointer", fontSize:13, fontWeight:500, display:"flex", alignItems:"center", gap:4 }}>
                Departamentos <span style={{ fontSize:9 }}>▾</span>
              </button>
              <div className="hs-megamenu" style={{ position:"absolute", top:"calc(100% + 14px)", left:"50%", transform:"translateX(-50%)",
                background:"#fff", borderRadius:2, boxShadow:"0 18px 44px rgba(44,34,24,0.16)", zIndex:200, border:"1px solid rgba(181,101,41,0.15)",
                display:"flex", overflow:"hidden", width:460 }}>
                <div style={{ width:160, flexShrink:0, position:"relative" }}>
                  <FadeImage src={iovr["megaMenuImage"]?.url ?? "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=300&q=70"} alt="" fill sizes="160px"
                    style={{ objectFit:"cover", objectPosition:`${iovr["megaMenuImage"]?.posX ?? 50}% ${iovr["megaMenuImage"]?.posY ?? 50}%` }} />
                  <PhotoOverlay ov={iovr["megaMenuImage"]} />
                  <BgDragHandle imgKey="megaMenuImage" />
                  <EditableImageButton field="megaMenuImage" label="Imagen del menú Departamentos" />
                </div>
                <div style={{ flex:1, padding:"18px 20px", display:"flex", flexDirection:"column", gap:2 }}>
                  <p style={{ margin:"0 0 6px", fontSize:10.5, color:"#b5652a", textTransform:"uppercase", letterSpacing:1.5, fontFamily:"Georgia, serif" }}>Departamentos</p>
                  {CATEGORY_OPTIONS.map(c => (
                    <Link key={c.id} href={`/tienda/${config?.slug ?? ""}/productos?categoria=${c.id}&t=home-studio${isPreview ? "&from=editor" : ""}`}
                      style={{ padding:"7px 0", fontSize:12.5, color:"#5c4a36", textDecoration:"none", whiteSpace:"nowrap", borderBottom:"1px solid #f5efe6" }}>
                      {c.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            {[["Productos","productos"],["Nosotros","nosotros"],["Contacto","contacto"]].map(([lbl,id]) => (
              <button key={id} onClick={() => smoothScrollTo(id)} style={{ background:"none", border:"none", color:navTextMid, cursor:"pointer", fontSize:13, fontWeight:500 }}>{lbl}</button>
            ))}
            <Link href={catalogHref} style={{ background:accent, color:"#fff", padding:"10px 22px", fontSize:12, fontWeight:700, textDecoration:"none", borderRadius:4 }}>Ver catálogo</Link>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <button onClick={() => { setFavoritesOpen(true); setCartOpen(false); }} aria-label="Favoritos"
              style={{ position:"relative", background:"none", border:"none", color:navTextMid, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill={favorites.length > 0 ? accent : "none"} stroke={favorites.length > 0 ? accent : "currentColor"} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {favorites.length > 0 && <span style={{ position:"absolute", top:-4, right:-4, background:accent, color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{favorites.length}</span>}
            </button>
            {pushBell && config?.showPushBell && !isPreview && (
              <StoreFollowButton storeSlug={config?.slug ?? ""} color={navTextMid} size={20} />
            )}
            {pushBell && config?.showPushBell && !isPreview && (
              <button onClick={pushBell.openDrawer}
                style={{ position:"relative", background:"none", border:"none", color:navTextMid, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill={pushBell.followState==="following"?"currentColor":"none"} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {pushBell.hasNew && <span style={{ position:"absolute", top:2, right:2, width:10, height:10, background:"#ef4444", borderRadius:"50%", border:`2px solid ${navBg}` }} />}
              </button>
            )}
            <div ref={userDropdownRef} style={{ position:"relative" }}>
              <button onClick={() => setUserDropdownOpen(o => !o)}
                style={{ background:"none", border:"none", color:navTextMid, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </button>
              {userDropdownOpen && (
                <div style={{ position:"absolute", top:"calc(100% + 10px)", right:0, background:"#fff", border:`1px solid ${navBorder}`, minWidth:190, zIndex:300, boxShadow:"0 8px 28px rgba(44,34,24,0.16)", overflow:"hidden" }}>
                  {user ? (
                    <>
                      <p style={{ padding:"10px 16px 4px", fontSize:11, color:"#9a8a76", margin:0, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user.name || user.email.split("@")[0]}</p>
                      <a href={panelHref} onClick={() => setUserDropdownOpen(false)} style={{ display:"block", padding:"10px 16px", fontSize:13, color:"#2c2218", textDecoration:"none", borderBottom:"1px solid #f1ece4" }}>{panelLabel}</a>
                      <button onClick={() => { if (isPreview) return; setUserDropdownOpen(false); signOut("/"); }}
                        style={{ display:"block", width:"100%", padding:"10px 16px", fontSize:13, color:"#b91c1c", background:"none", border:"none", textAlign:"left", cursor: isPreview ? "default" : "pointer" }}>Cerrar sesión</button>
                    </>
                  ) : (
                    <>
                      <a href={isPreview ? undefined : `/login?redirect=/tienda/${config?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)} style={{ display:"block", padding:"12px 16px", fontSize:13, color:"#2c2218", textDecoration:"none", borderBottom:"1px solid #f1ece4" }}>Iniciar sesión</a>
                      <a href={isPreview ? undefined : `/registro?plan=buyer&redirect=/tienda/${config?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)} style={{ display:"block", padding:"12px 16px", fontSize:13, color:"#2c2218", textDecoration:"none" }}>Registrarse</a>
                    </>
                  )}
                </div>
              )}
            </div>
            <button onClick={() => { setCartOpen(true); setFavoritesOpen(false); }} aria-label="Carrito" style={{ position:"relative", background:"none", border:"none", color:navTextMid, display:"flex", alignItems:"center", cursor:"pointer", padding:0 }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              {cartCount > 0 && <span style={{ position:"absolute", top:-4, right:-4, background:accent, color:accentText, borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{cartCount}</span>}
            </button>
            <button className="hs-burger" onClick={() => setMenuOpen(m => !m)}
              style={{ background:"none", border:`1px solid ${navBorder}`, color:navText, padding:"7px 11px", cursor:"pointer", fontSize:18 }}>{menuOpen ? "×" : "☰"}</button>
          </div>
        </div>
        {menuOpen && (
          <div style={{ background:navBg, borderTop:`1px solid ${navBorder}`, padding:"8px 28px 18px" }}>
            {[["Departamentos","departamentos"],["Productos","productos"],["Nosotros","nosotros"],["Contacto","contacto"]].map(([lbl,id]) => (
              <button key={id} onClick={() => { smoothScrollTo(id); setMenuOpen(false); }}
                style={{ display:"block", width:"100%", background:"none", border:"none", color:navTextMid, textAlign:"left", padding:"11px 0", fontSize:13, fontWeight:500, borderBottom:`1px solid ${navBorder}` }}>{lbl}</button>
            ))}
            <Link href={catalogHref} style={{ display:"block", color:accentOn(navBg, navText), padding:"14px 0", fontSize:13, fontWeight:700, textDecoration:"none" }} onClick={() => setMenuOpen(false)}>Ver catálogo completo →</Link>
          </div>
        )}
      </nav>

      {/* ── HERO — imagen de ambiente, texto centrado abajo ── */}
      <section style={{ paddingTop: isPreview ? 0 : (showAnn ? PROMO_H + NAV_H : NAV_H), position:"relative", height: isPreview ? 520 : "88vh", minHeight:480, display:"flex", alignItems:"flex-end", ...secBg(heroImg, heroBg) }}>
        <BgDragHandle imgKey="sectionbg_bgHero" />
        {!heroImg?.url && (
          <>
            <FadeImage src={heroImgUrl} alt="Ambiente" fill sizes="100vw" priority
              style={{ objectFit:"cover", objectPosition:`${iovr["heroImage"]?.posX ?? 50}% ${iovr["heroImage"]?.posY ?? 50}%` }} />
            <PhotoOverlay ov={iovr["heroImage"]} />
            <BgDragHandle imgKey="heroImage" />
          </>
        )}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(20,15,8,0.78), rgba(20,15,8,0.15) 55%)" }} />
        <SectionOverlay ov={heroImg} />
        <EditableSectionBg field="bgHero" label="Fondo hero" />
        <EditableImageButton field="heroImage" label="Imagen del hero" />
        <div style={{ position:"relative", zIndex:1, maxWidth:680, margin:"0 auto", padding:"0 24px 64px", textAlign:"center" }}>
          <p style={{ margin:"0 0 14px", fontSize:11, color:"#e8cba8", textTransform:"uppercase", letterSpacing:4, fontWeight:600 }}>
            <EditableZone field="heroKicker" label="Etiqueta hero">Diseñá tu espacio</EditableZone>
          </p>
          <h1 style={{ margin:"0 0 18px", fontSize:"clamp(30px,5vw,52px)", fontWeight:600, color:heroText, fontFamily:"Georgia, serif", lineHeight:1.15 }}>
            <EditableZone field="heroHeading" label="Título hero">Tu hogar, a tu manera</EditableZone>
          </h1>
          <p style={{ margin:"0 0 30px", fontSize:15, color:heroMid, lineHeight:1.8 }}>
            <EditableZone field="heroSubtext" label="Subtítulo hero">Muebles, decoración y electrodomésticos para crear el espacio que soñás.</EditableZone>
          </p>
          <Link href={catalogHref} style={{ display:"inline-block", background:accent, color:"#fff", padding:"15px 36px", fontWeight:600, fontSize:13, borderRadius:4, textDecoration:"none", letterSpacing:0.5 }}>
            Explorar catálogo
          </Link>
        </div>
      </section>

      <div style={{ display:"flex", flexDirection:"column" }}>
      {/* ── DEPARTAMENTOS — mosaico desigual ── */}
      <SectionBlock id="hs-departamentos" label="Departamentos" isPreview={isPreview} defaultOrder={HS_SECTION_IDS}>
      <section id="departamentos" data-reveal style={{ position:"relative", ...secBg(depImg, depBg), padding:"64px 24px" }}>
        <BgDragHandle imgKey="sectionbg_bgDepartamentos" />
        <SectionOverlay ov={depImg} />
        <EditableSectionBg field="bgDepartamentos" label="Fondo departamentos" />
        <div style={{ position:"relative", zIndex:1, maxWidth:1240, margin:"0 auto" }}>
          <h2 style={{ margin:"0 0 28px", fontSize:"clamp(22px,3.5vw,32px)", fontWeight:600, color:depText, fontFamily:"Georgia, serif" }}>
            <EditableZone field="depHeading" label="Título departamentos">Por dónde empezar</EditableZone>
          </h2>
          <div className="hs-mosaic">
            {(() => {
              // Para clientes reales, ocultamos los departamentos sin productos (no
              // tiene sentido mandarlos a un catálogo vacío). Si el departamento que
              // ocultamos era justo el "grande" del mosaico, promovemos al primero que
              // quede visible — así el mosaico nunca pierde su jerarquía visual y no
              // se ve como una fila pareja de tarjetas chicas.
              const visible = DEPARTAMENTOS.map((d, i) => {
                const catKey = `dept${i}Cat`;
                const categoryId = overrides[catKey]?.text ?? d.id;
                return { d, i, catKey, categoryId };
              }).filter(({ categoryId }) => editMode || products.some(p => p.category === categoryId));
              if (!editMode && visible.length === 0) {
                return <p style={{ margin:0, color:"#9a8a76", fontSize:14 }}>Todavía no hay categorías con productos cargados.</p>;
              }
              const hasBigVisible = visible.some(({ d }) => d.big);
              const usedCategoryIds = DEPARTAMENTOS.map((dd, j) => overrides[`dept${j}Cat`]?.text ?? dd.id);
              return visible.map(({ d, i, catKey, categoryId }, idx) => {
                const isBig = d.big || (!hasBigVisible && idx === 0);
                return (
                  <div key={i} style={{ position:"relative" }} className={isBig ? "hs-mosaic-big" : undefined}>
                    <Link href={`/tienda/${config?.slug ?? ""}/productos?categoria=${categoryId}&t=home-studio${isPreview ? "&from=editor" : ""}`}
                      data-no-unsaved-guard={editMode ? "true" : undefined}
                      onClick={e => { if (editMode) e.preventDefault(); }}
                      className="hs-mosaic-card" style={{ height:"100%" }}>
                      <FadeImage src={iovr[`dept${i}Image`]?.url ?? d.img} alt={d.label} fill sizes="(max-width: 768px) 50vw, 400px"
                        style={{ objectFit:"cover", objectPosition:`${iovr[`dept${i}Image`]?.posX ?? 50}% ${iovr[`dept${i}Image`]?.posY ?? 50}%` }} />
                      <PhotoOverlay ov={iovr[`dept${i}Image`]} />
                      <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(20,15,8,0.65), transparent 55%)" }} />
                      <span style={{ position:"absolute", bottom:16, left:18, color:"#fff", fontSize: isBig ? 18 : 14, fontWeight:600 }}>
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
                        style={{ position:"absolute", top:8, left:8, zIndex:2, maxWidth:120, fontSize:11, border:`1px solid ${accent}`, borderRadius:6, background:"#fff", color:"#5c4a36", cursor:"pointer", padding:"3px 6px" }}>
                        {CATEGORY_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </section>
      </SectionBlock>

      {/* ── CONFIANZA — línea de texto elegante, sin íconos ── */}
      <SectionBlock id="hs-confianza" label="Confianza" isPreview={isPreview} defaultOrder={HS_SECTION_IDS}>
      <section data-reveal style={{ position:"relative", ...secBg(trustImg, trustBg), padding:"28px 24px", borderTop:"1px solid rgba(181,101,41,0.15)", borderBottom:"1px solid rgba(181,101,41,0.15)" }}>
        <BgDragHandle imgKey="sectionbg_bgConfianza" />
        <SectionOverlay ov={trustImg} />
        <EditableSectionBg field="bgConfianza" label="Fondo confianza" />
        <div style={{ position:"relative", zIndex:1, maxWidth:1000, margin:"0 auto", display:"flex", flexWrap:"wrap", justifyContent:"center", gap:22, fontSize:12.5, color:trustMid, fontWeight:500, letterSpacing:0.3 }}>
          {[
            { field:"trustLine1", def:"Cuotas con tarjeta" },
            { field:"trustLine2", def:"Garantía oficial" },
            { field:"trustLine3", def:"Envíos a todo el país" },
            { field:"trustLine4", def:"Retiro sin cargo en local" },
          ].map(({ field, def }) => (
            <span key={field} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:accent, flexShrink:0 }} />
              <EditableZone field={field} label="Frase de confianza">{def}</EditableZone>
            </span>
          ))}
        </div>
      </section>
      </SectionBlock>

      {/* ── OFERTAS ── */}
      <SectionBlock id="hs-ofertas" label="Ofertas" isPreview={isPreview} defaultOrder={HS_SECTION_IDS}>
      {ofertas.length > 0 && (
        <section data-reveal style={{ position:"relative", ...secBg(ofertasImg, ofertasBg), padding:"56px 24px" }}>
          <BgDragHandle imgKey="sectionbg_bgOfertas" />
          <SectionOverlay ov={ofertasImg} />
          <EditableSectionBg field="bgOfertas" label="Fondo ofertas" />
          <div style={{ position:"relative", zIndex:1, maxWidth:1240, margin:"0 auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:28, flexWrap:"wrap", gap:12 }}>
              <h2 style={{ margin:0, fontSize:"clamp(20px,3vw,26px)", fontWeight:600, color:ofertasText, fontFamily:"Georgia, serif" }}>
                🌿 <EditableZone field="ofertasHeading" label="Título ofertas">Ofertas de temporada</EditableZone>
              </h2>
              {hasMoreOfertas && <Link href={`${catalogHref}&oferta=true`} style={{ fontSize:13, fontWeight:600, color:accentOn(ofertasBg, ofertasText), textDecoration:"none" }}>Ver todas las ofertas →</Link>}
            </div>
            <div className="hs-prod-grid" style={{ display:"grid", gap:32 }}>
              {ofertas.map(p => (
                <ProductCard key={p.id} product={p} currency={currency} accent={accent} bg={ofertasBg} text={ofertasText} editMode={canOpenDemo} promotions={promotions}
                  href={`/tienda/${config?.slug ?? ""}/producto/${p.id}${isPreview ? "?from=editor" : ""}`}
                  isFavorite={favorites.includes(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} />
              ))}
            </div>
          </div>
        </section>
      )}
      </SectionBlock>

      {/* ── PRODUCTOS — grid espaciado, estilo revista ── */}
      <SectionBlock id="hs-productos" label="Catálogo de productos" isPreview={isPreview} defaultOrder={HS_SECTION_IDS}>
      <section id="productos" data-reveal style={{ position:"relative", ...secBg(prodImg, prodBg), padding:"72px 24px" }}>
        <BgDragHandle imgKey="sectionbg_bgProductos" />
        <SectionOverlay ov={prodImg} />
        <EditableSectionBg field="bgProductos" label="Fondo productos" />
        <div style={{ position:"relative", zIndex:1, maxWidth:1240, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:36, flexWrap:"wrap", gap:12 }}>
            <h2 style={{ margin:0, fontSize:"clamp(22px,3.5vw,30px)", fontWeight:600, color:prodText, fontFamily:"Georgia, serif" }}>
              <EditableZone field="prodHeading" label="Título productos">Seleccionados para vos</EditableZone>
            </h2>
            {hasMore && <Link href={catalogHref} style={{ fontSize:13, fontWeight:600, color:accentOn(prodBg, prodText), textDecoration:"none" }}>Ver todo →</Link>}
          </div>

          {loadingProducts ? (
            <div style={{ textAlign:"center", padding:"60px 0" }}>
              <div style={{ width:36, height:36, border:`3px solid ${accent}`, borderTopColor:"transparent", borderRadius:"50%", animation:"hs-spin 0.8s linear infinite", margin:"0 auto" }} />
            </div>
          ) : showcased.length > 0 ? (
            <div className="hs-prod-grid" style={{ display:"grid", gap:40 }}>
              {showcased.map(p => (
                <ProductCard key={p.id} product={p} currency={currency} accent={accent} bg={prodBg} text={prodText} editMode={canOpenDemo} promotions={promotions}
                  href={`/tienda/${config?.slug ?? ""}/producto/${p.id}${isPreview ? "?from=editor" : ""}`}
                  isFavorite={favorites.includes(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:"60px 24px", border:"1px dashed rgba(181,101,41,0.3)" }}>
              <p style={{ margin:0, color:"#9a8a76", fontSize:14 }}>Aún no hay productos publicados.</p>
            </div>
          )}
        </div>
      </section>
      </SectionBlock>

      {/* ── BANNER PROMOCIONAL ── */}
      <SectionBlock id="hs-promo" label="Banner promocional" isPreview={isPreview} defaultOrder={HS_SECTION_IDS}>
      <PromoBannerCarousel
        images={[config?.imageOverrides?.["promoBanner1"], config?.imageOverrides?.["promoBanner2"], config?.imageOverrides?.["promoBanner3"]]}
        demoImages={[
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1920&q=80",
          "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1920&q=80",
          "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1920&q=80",
        ]}
        intervalMs={config?.bannerInterval ?? 4000}
        editMode={editMode}
        isPreview={isPreview}
        accent={accent}
        bg="#2c2218"
      />
      </SectionBlock>

      {/* ── MAYORISTA ── */}
      <SectionBlock id="hs-mayorista" label="Mayorista" isPreview={isPreview} defaultOrder={HS_SECTION_IDS}>
      {isWholesale && (
        <section data-reveal style={{ background:"#f0ebe2", borderTop:"1px solid rgba(181,101,41,0.15)", borderBottom:"1px solid rgba(181,101,41,0.15)" }}>
          <div style={{ maxWidth:1240, margin:"0 auto", padding:"48px 24px", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", gap:16 }}>
            <span style={{ fontSize:11, letterSpacing:2, color:accentOn("#f0ebe2", "#2c2218"), textTransform:"uppercase", fontWeight:700 }}>
              <EditableZone field="mayoristaKicker" label="Kicker mayorista">Venta mayorista</EditableZone>
            </span>
            <h2 style={{ fontSize:"clamp(22px,3.5vw,32px)", fontWeight:600, color:"#2c2218", margin:0, fontFamily:"Georgia, serif" }}>
              <EditableZone field="mayoristaHeading" label="Título mayorista">Precios especiales por cantidad</EditableZone>
            </h2>
            <button onClick={() => smoothScrollTo("contacto")} style={{ background:accent, color:"#fff", border:"none", padding:"13px 32px", fontSize:13, fontWeight:600, borderRadius:4, cursor:"pointer" }}>
              <EditableZone field="mayoristaCta" label="Texto botón mayorista">Consultar →</EditableZone>
            </button>
          </div>
        </section>
      )}
      </SectionBlock>

      {/* ── NOSOTROS — imagen + texto narrativo ── */}
      <SectionBlock id="hs-nosotros" label="Nuestra historia" isPreview={isPreview} defaultOrder={HS_SECTION_IDS}>
      <section id="nosotros" data-reveal style={{ position:"relative", ...secBg(nosotrosImg, nosotrosBg), padding:"72px 24px" }}>
        <BgDragHandle imgKey="sectionbg_bgNosotros" />
        <SectionOverlay ov={nosotrosImg} />
        <EditableSectionBg field="bgNosotros" label="Fondo nosotros" />
        <div className="hs-about" style={{ position:"relative", zIndex:1, maxWidth:1240, margin:"0 auto", display:"grid", gap:56, alignItems:"center" }}>
          <div style={{ position:"relative", borderRadius:8, overflow:"hidden", aspectRatio:"4/3" }}>
            <FadeImage src={nosotrosUrl} alt="Nuestro espacio" fill sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit:"cover", objectPosition:`${iovr["nosotrosImage"]?.posX ?? 50}% ${iovr["nosotrosImage"]?.posY ?? 50}%` }} />
            <PhotoOverlay ov={iovr["nosotrosImage"]} />
            <BgDragHandle imgKey="nosotrosImage" />
            <EditableImageButton field="nosotrosImage" label="Imagen sección Nosotros" />
          </div>
          <div>
            <p style={{ margin:"0 0 10px", fontSize:11, color:accentOn(nosotrosBg, nosText), textTransform:"uppercase", letterSpacing:2, fontWeight:700 }}>
              <EditableZone field="nosotrosKicker" label="Kicker nosotros">Nuestra historia</EditableZone>
            </p>
            <h2 style={{ margin:"0 0 20px", fontSize:"clamp(22px,4vw,32px)", fontWeight:600, color:nosText, fontFamily:"Georgia, serif" }}>
              <EditableZone field="nosotrosHeading" label="Título nosotros">Hogares con identidad propia</EditableZone>
            </h2>
            <p style={{ margin:"0 0 16px", fontSize:14.5, color:nosMid, lineHeight:1.9 }}>
              <EditableZone field="nosotrosP1" label="Párrafo 1">Creemos que cada casa cuenta una historia. Por eso seleccionamos muebles, electrodomésticos y objetos de decoración que acompañan tu día a día con calidez y buen diseño.</EditableZone>
            </p>
            <p style={{ margin:"0 0 28px", fontSize:14.5, color:nosMid, lineHeight:1.9 }}>
              <EditableZone field="nosotrosP2" label="Párrafo 2">Te acompañamos en el proceso, desde elegir el sillón perfecto hasta renovar tu cocina, con asesoramiento personalizado y cuotas accesibles.</EditableZone>
            </p>
            {showWA && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}${whatsapp.message?"?text="+encodeURIComponent(whatsapp.message):""}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#25d366", color:"white", textDecoration:"none", padding:"13px 28px", borderRadius:4, fontWeight:600, fontSize:14 }}>
                Contactanos
              </a>
            )}
          </div>
        </div>
      </section>
      </SectionBlock>

      {/* ── CONTACTO — fondo de imagen cálida ── */}
      <SectionBlock id="hs-contacto" label="Contacto" isPreview={isPreview} defaultOrder={HS_SECTION_IDS}>
      <section id="contacto" data-reveal style={{ position:"relative", padding:"80px 24px", overflow:"hidden" }}>
        {!contactoImg?.url && (
          <>
            <FadeImage src={contactoUrl} alt="" fill sizes="100vw"
              style={{ objectFit:"cover", objectPosition:`${iovr["contactoImage"]?.posX ?? 50}% ${iovr["contactoImage"]?.posY ?? 50}%` }} />
            <PhotoOverlay ov={iovr["contactoImage"]} />
            <BgDragHandle imgKey="contactoImage" />
          </>
        )}
        <div style={{ position:"absolute", inset:0, background:"rgba(20,15,8,0.72)" }} />
        <BgDragHandle imgKey="sectionbg_bgContacto" />
        <SectionOverlay ov={contactoImg} />
        <EditableSectionBg field="bgContacto" label="Fondo contacto" />
        <EditableImageButton field="contactoImage" label="Imagen de fondo (contacto)" />
        <div style={{ position:"relative", zIndex:1, maxWidth:920, margin:"0 auto", display:"grid", gap:36 }} className="hs-contact-grid">
          <style>{`.hs-contact-grid{grid-template-columns:1fr} @media(min-width:768px){.hs-contact-grid{grid-template-columns:1fr 1fr; text-align:left}}`}</style>
          <div style={{ textAlign:"center" }}>
            <p style={{ margin:"0 0 10px", fontSize:11, color:"#e8cba8", textTransform:"uppercase", letterSpacing:2, fontWeight:700 }}>Contacto</p>
            <h2 style={{ margin:"0 0 16px", fontSize:"clamp(24px,4vw,32px)", fontWeight:600, color:conText, fontFamily:"Georgia, serif" }}>
              <EditableZone field="contactHeading" label="Título contacto">Conversemos sobre tu espacio</EditableZone>
            </h2>
            <p style={{ margin:"0 0 20px", fontSize:14.5, color:conMid, lineHeight:1.85 }}>
              <EditableZone field="contactSubtext" label="Subtítulo contacto">Contanos qué estás buscando y te ayudamos a encontrarlo.</EditableZone>
            </p>
            <Link href={catalogHref} style={{ display:"inline-flex", color:"#e8cba8", fontWeight:700, fontSize:13, textDecoration:"none", fontFamily:"Georgia, serif" }}>Ver catálogo completo →</Link>
            {showWA && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}${whatsapp.message?"?text="+encodeURIComponent(whatsapp.message):""}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginTop:16, color:"#6ee7a0", textDecoration:"none", fontWeight:600, fontSize:13 }}>
                <EditableZone field="contactWhatsApp" label="Texto link WhatsApp">o escribinos por WhatsApp</EditableZone>
              </a>
            )}
          </div>
          <div style={{ background:"#fff", borderRadius:4, padding:28 }}>
            <ContactForm storeId={config?.storeId} accent={accent} textColor="#2c2218" mutedColor="#9a8a76" radius={4} isPreview={isPreview} />
          </div>
        </div>
      </section>
      </SectionBlock>
      </div>

      <footer style={{ position:"relative", ...secBg(footerImg, footerBg), color:ftText, padding:"32px 24px", textAlign:"center" }}>
        <BgDragHandle imgKey="sectionbg_bgFooter" />
        <SectionOverlay ov={footerImg} />
        <EditableSectionBg field="bgFooter" label="Fondo footer" />
        <div style={{ position:"relative", zIndex:1 }}>
        <p style={{ margin:"0 0 6px", fontWeight:600, fontSize:15, color:accentOn(footerBg, ftText), fontFamily:"Georgia, serif" }}>{storeName}</p>
        <p style={{ margin:"0 0 12px", fontSize:11, color:ftMid }}>© {new Date().getFullYear()} {storeName}. Todos los derechos reservados.</p>
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
            <a key={tipo} href={`/tienda/${config?.slug ?? ""}/politicas?tipo=${tipo}`} style={{ fontSize:10, color:ftMid, opacity:0.7, textDecoration:"none" }}>{label}</a>
          ))}
          {!editMode && (
            <button onClick={() => setShowReport(true)}
              style={{ fontSize:10, color:ftMid, opacity:0.7, background:"none", border:"none", cursor:"pointer", padding:0, textDecoration:"underline" }}>
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
        <div style={{ position:"absolute", top:0, right:0, bottom:0, width:400, maxWidth:"100vw", background:"#fff", transform: favoritesOpen ? "translateX(0)" : "translateX(100%)", transition:"transform 0.35s cubic-bezier(.4,0,.2,1)", display:"flex", flexDirection:"column", borderLeft:"1px solid #f1ece4" }}>
          <div style={{ padding:"20px 24px 14px", borderBottom:"1px solid #f1ece4", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <p style={{ fontWeight:600, fontSize:16, margin:0, color:"#2c2218", fontFamily:"Georgia, serif" }}>Favoritos <span style={{ fontWeight:400, fontSize:13, color:"#9a8a76" }}>({favorites.length})</span></p>
            <button onClick={() => setFavoritesOpen(false)} style={{ background:"none", border:"none", color:"#2c2218", fontSize:22, cursor:"pointer" }}>×</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"14px 24px" }}>
            {favoriteProducts.length === 0 ? (
              <div style={{ textAlign:"center", padding:"52px 0", color:"#9a8a76" }}>
                <p style={{ fontSize:32, marginBottom:12 }}>♡</p>
                <p style={{ fontSize:13, lineHeight:1.8 }}>No tenés favoritos aún.<br/>Explorá el catálogo.</p>
              </div>
            ) : favoriteProducts.map(product => (
              <div key={product.id} style={{ display:"flex", gap:14, padding:"14px 0", borderBottom:"1px solid #f5f1ea" }}>
                {product.images[0] ? (
                  <FadeImage src={product.images[0]} alt={product.name} width={80} height={60} style={{ objectFit:"cover", flexShrink:0, background:"#f0ebe2" }} />
                ) : (
                  <div style={{ width:80, height:60, flexShrink:0, background:"#f0ebe2" }} />
                )}
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14, fontWeight:500, margin:"0 0 4px", color:"#2c2218" }}>{product.name}</p>
                  <p style={{ fontSize:13, color:accentOn("#ffffff", "#2c2218"), fontWeight:600, margin:"0 0 10px" }}>{fmtPrice(product.price, currency)}</p>
                  <div style={{ display:"flex", gap:8 }}>
                    <Link href={`/tienda/${config?.slug ?? ""}/producto/${product.id}${isPreview ? "?from=editor" : ""}`}
                      onClick={e => { if (!canOpenDemo && isDemoProductId(product.id)) e.preventDefault(); else setFavoritesOpen(false); }}
                      style={{ background:accent, color:"#fff", border:"none", borderRadius:4, padding:"7px 14px", fontSize:11, fontWeight:600, cursor:"pointer", textDecoration:"none" }}>
                      Ver
                    </Link>
                    <button onClick={() => toggleFavorite(product.id)}
                      style={{ background:"transparent", color:"#9a8a76", border:"1px solid #e4dccf", borderRadius:4, padding:"7px 14px", fontSize:11, cursor:"pointer" }}>
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
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#2c2218", color:"#fff", padding:"12px 20px", fontSize:13, fontWeight:600, zIndex:600, boxShadow:"0 4px 20px rgba(0,0,0,0.35)", maxWidth:"calc(100vw - 32px)", textAlign:"center" }}>
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
