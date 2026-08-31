"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FadeImage } from "@/components/store/templates/shared/FadeImage";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { usePushBell } from "@/contexts/PushBellContext";
import { useSesion } from "@/components/AuthProvider";
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
  if (ov?.url) return ov.overlayType === "light" ? "#555555" : "rgba(255,255,255,0.65)";
  return getContrastColor(bg) === "light" ? "rgba(255,255,255,0.65)" : "#777777";
}
function SectionOverlay({ ov }: { ov: ImageOverride | undefined }) {
  if (!ov?.url || ov.overlayType === "none") return null;
  return <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none",
    background: ov.overlayType==="light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.5})` }} />;
}
// Para fotos simples (hero, nosotros) que siempre muestran una imagen (de
// stock o subida) — la capa se aplica en cuanto el dueño la elige, aunque
// todavía no haya subido una foto propia.
function PhotoOverlay({ ov }: { ov: ImageOverride | undefined }) {
  if (!ov?.overlayType || ov.overlayType === "none") return null;
  return <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none",
    background: ov.overlayType==="light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.5})` }} />;
}
function fmtPrice(n: number, currency: string) {
  return `${currency === "ARS" ? "$" : currency} ${n.toLocaleString("es-AR")}`;
}

const DEPARTAMENTOS = [
  { id: "electrodomesticos", label: "Electrodomésticos" },
  { id: "pequenos-electrodomesticos", label: "Pequeños Electro" },
  { id: "celulares-y-accesorios", label: "Celulares" },
  { id: "informatica-y-gaming", label: "Informática" },
  { id: "audio-imagen-y-video", label: "Audio y TV" },
  { id: "muebles-y-colchones", label: "Muebles" },
  { id: "casa-y-jardin", label: "Casa y Jardín" },
];
const CATEGORY_OPTIONS = DEPARTAMENTOS;

function ProductCard({ product, href, currency, accent, bg, text, isFavorite, onToggleFavorite, editMode, promotions }: {
  product: StorefrontProduct; href: string; currency: string; accent: string; bg: string; text: string; isFavorite: boolean; onToggleFavorite: () => void; editMode?: boolean; promotions?: ActivePromotion[];
}) {
  const promo = resolveProductPromo(product, promotions);
  // Los demos de relleno no existen en la base: antes de guardar el template, la tienda
  // pública todavía resuelve con el tipoTienda viejo y el detalle da "no disponible".
  const isUnclickableDemo = !editMode && isDemoProductId(product.id);
  return (
    <Link href={href} className="cc-prod-link" onClick={e => { if (isUnclickableDemo) e.preventDefault(); }}
      style={{ textDecoration:"none", color:"inherit", display:"block", cursor: isUnclickableDemo ? "default" : "pointer" }}>
      <div style={{ aspectRatio:"1/1", background:"#fafafa", marginBottom:14, overflow:"hidden", position:"relative" }}>
        {promo.primaryPromo && <PromoTag tipo={promo.primaryPromo.type} label={describePromo(promo.primaryPromo).headline} size="sm" />}
        <button onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(); }}
          aria-label="Favorito"
          style={{ position:"absolute", top:8, right:8, zIndex:1, width:28, height:28, borderRadius:"50%", background:"rgba(255,255,255,0.92)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill={isFavorite ? accent : "none"} stroke={isFavorite ? accent : "#999"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        {product.images[0] ? (
          <FadeImage src={product.images[0]} alt={product.name} fill sizes="(max-width: 768px) 50vw, 25vw" style={{ objectFit:"cover" }} />
        ) : (
          <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"#d4d4d4", fontSize:12 }}>Sin imagen</div>
        )}
      </div>
      <p style={{ margin:"0 0 4px", fontSize:13, color:"#222", lineHeight:1.4 }}>{product.name}</p>
      <p style={{ margin:0, fontSize:13, color: promo.hasPriceDrop ? "#dc2626" : getReadableAccentText(accent, bg, text), fontWeight:600 }}>
        {promo.hasPriceDrop ? (
          <>
            {fmtPrice(promo.effectivePrice, currency)}
            <span style={{ marginLeft:8, textDecoration:"line-through", color:"#ccc" }}>{fmtPrice(promo.originalPrice, currency)}</span>
          </>
        ) : (
          <>
            {fmtPrice(product.price, currency)}
            {product.comparePrice && product.comparePrice > product.price && (
              <span style={{ marginLeft:8, textDecoration:"line-through", color:"#ccc" }}>{fmtPrice(product.comparePrice, currency)}</span>
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

const CC_SECTION_IDS = ["cc-departamentos", "cc-ofertas", "cc-productos", "cc-promo", "cc-nosotros", "cc-contacto"];

export default function CasaClara() {
  const config    = useStoreConfig();
  const pushBell  = usePushBell();
  const storefront = useStorefront();
  const { products, promotions, loadingProducts } = storefront;
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
  const accent    = config?.colors.accent ?? "#0f172a";
  // El texto que va ARRIBA de un relleno pintado con el acento. Viaja en
  // `cartTheme` al CartDrawer y al CheckoutModal compartidos, asi que si esta mal
  // se rompe el carrito y el checkout enteros.
  //
  // Estaba INVERTIDO: `getContrastColor(X) === "light"` significa "sobre X va texto
  // CLARO", y la rama devolvia el oscuro. Con el acento de fabrica de este template
  // daba un contraste ilegible. `textoSobre` mide con el ratio real de WCAG y no
  // puede equivocarse de lado.
  const accentText = textoSobre(accent);
  const cartTheme: CartTheme = { BG:"#ffffff", S:"#fafafa", T:"#111111", MID:"#888888", border:"#ededed", accent, accentText };
  const currency  = config?.currency ?? "ARS";
  const storeName = config?.storeName ?? "CASA CLARA";
  const whatsapp  = config?.whatsapp ?? { enabled:false, number:"", message:"" };
  // En modo edición lo mostramos con solo activarlo, para que se pueda previsualizar
  // antes de completar el número; en la tienda real hace falta el número sí o sí.
  const showWA    = whatsapp.enabled && (editMode || !!whatsapp.number);

  const { cargando, logueado, nombreMostrado, panelHref, panelLabel, signOut } = useSesion();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const ofertasScrollRef = useRef<HTMLDivElement>(null);
  function scrollOfertas(dir: 1 | -1) {
    const el = ofertasScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) setUserDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const iovr = config?.imageOverrides ?? {};
  const sc   = config?.sectionColors  ?? {};

  const footerBg    = sc["bgFooter"] ?? "#ffffff";
  const footerImg   = iovr["sectionbg_bgFooter"];
  const ftText      = secText(footerImg, footerBg);
  const ftMid       = secMid(footerImg, footerBg);

  const heroBg      = sc["bgHero"] ?? "#ffffff";
  const heroImg     = iovr["sectionbg_bgHero"];
  const heroText    = secText(heroImg, heroBg);
  const heroMid     = secMid(heroImg, heroBg);
  const heroImgUrl  = iovr["heroImage"]?.url ?? "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=900&q=80";

  const ofertasBg   = sc["bgOfertas"] ?? "#ffffff";
  const ofertasImg  = iovr["sectionbg_bgOfertas"];
  const ofertasText = secText(ofertasImg, ofertasBg);

  const prodBg      = sc["bgProductos"] ?? "#ffffff";
  const prodImg     = iovr["sectionbg_bgProductos"];
  const prodText    = secText(prodImg, prodBg);
  const prodMid     = secMid(prodImg, prodBg);

  const nosotrosBg  = sc["bgNosotros"] ?? "#fafafa";
  const nosotrosImg = iovr["sectionbg_bgNosotros"];
  const nosText     = secText(nosotrosImg, nosotrosBg);
  const nosMid      = secMid(nosotrosImg, nosotrosBg);
  const nosotrosImgUrl = iovr["nosotrosImage"]?.url ?? "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80";

  const contactoBg  = sc["bgContacto"] ?? "#ffffff";
  const contactoImg = iovr["sectionbg_bgContacto"];
  const conText     = secText(contactoImg, contactoBg);
  const conMid      = secMid(contactoImg, contactoBg);

  const navBg       = sc["navBg"] ?? "#ffffff";
  const navDark     = getContrastColor(navBg) === "light";
  const navText     = navDark ? "#ffffff" : "#111111";
  const navTextMid  = navDark ? "rgba(255,255,255,0.65)" : "#888888";
  const navBorder   = navDark ? "rgba(255,255,255,0.15)" : "#ededed";

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const NAV_H = 60;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Antes esto filtraba por la casilla "Destacado" del producto y caía a todos
     si no había ninguno. La casilla se sacó —qué muestra un bloque de la portada
     es una decisión de diseño, no de la ficha de cada producto— así que la rama
     de destacados quedaba viva leyendo un dato que ya nadie puede cambiar. */
  const showcased = products.slice(0, 9);
  const hasMore   = products.length > 9;
  const allOfertas = products.filter(p => p.comparePrice && p.comparePrice > p.price);
  const ofertas    = allOfertas.slice(0, 6);
  const hasMoreOfertas = allOfertas.length > 6;
  const catalogHref = `/tienda/${config?.slug ?? ""}/productos?t=casa-clara${isPreview ? "&from=editor" : ""}`;

  return (
    <div style={{ background:"#ffffff", color:"#111111", fontFamily:"Inter, system-ui, sans-serif", minHeight:"100vh" }}>
      <style>{`
        .cc-nav-links { display:none }
        @media(min-width:768px){ .cc-nav-links { display:flex } .cc-burger { display:none } }
        .cc-dep-row { display:flex; gap:0; overflow-x:auto; scrollbar-width:none; justify-content:center; flex-wrap:wrap }
        .cc-dep-row::-webkit-scrollbar { display:none }
        .cc-ofertas-row { scrollbar-width:none }
        .cc-ofertas-row::-webkit-scrollbar { display:none }
        .cc-prod-grid { grid-template-columns:repeat(2,1fr) }
        @media(min-width:640px){ .cc-prod-grid { grid-template-columns:repeat(3,1fr) } }
        .cc-prod-link { transition:opacity 0.2s }
        .cc-prod-link:hover { opacity:0.7 }
        .cc-megamenu { opacity:0; visibility:hidden; transform:translateY(-6px); transition:all 0.18s; }
        .cc-mega-wrap:hover .cc-megamenu, .cc-megamenu:hover { opacity:1; visibility:visible; transform:translateY(0); }
      `}</style>

      <nav style={{ position: isPreview ? "sticky" : "fixed", top:0,
        left: isPreview ? undefined : 0, right: isPreview ? undefined : 0, zIndex: isPreview ? CAPAS.previaNav : 100,
        background:navBg, borderBottom: `1px solid ${navBorder}`,
        boxShadow: scrolled ? "0 1px 0 rgba(0,0,0,0.03)" : "none", transition:"all 0.3s", padding:"0 24px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", height:NAV_H, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontWeight:600, fontSize:15, color:navText, letterSpacing:2, textTransform:"uppercase" }}>
            <EditableZone field="storeName" label="Nombre de la tienda">{storeName}</EditableZone>
          </div>
          <div className="cc-nav-links" style={{ gap:28, alignItems:"center" }}>
            <div className="cc-mega-wrap" style={{ position:"relative" }}>
              <button onClick={() => smoothScrollTo("departamentos")}
                style={{ background:"none", border:"none", color:navTextMid, cursor:"pointer", fontSize:12, letterSpacing:0.5, display:"flex", alignItems:"center", gap:4 }}>
                Departamentos <span style={{ fontSize:8 }}>▾</span>
              </button>
              <div className="cc-megamenu" style={{ position:"absolute", top:"calc(100% + 14px)", right:0,
                background:"#fff", padding:0, display:"flex", flexDirection:"column", zIndex:CAPAS.nav, border:"1px solid #ededed", minWidth:200 }}>
                {CATEGORY_OPTIONS.map(c => (
                  <Link key={c.id} href={`/tienda/${config?.slug ?? ""}/productos?categoria=${c.id}&t=casa-clara${isPreview ? "&from=editor" : ""}`}
                    style={{ padding:"12px 18px", fontSize:11.5, letterSpacing:0.5, color:"#444", textDecoration:"none", whiteSpace:"nowrap", textAlign:"right", borderBottom:"1px solid #f5f5f5" }}>
                    {c.label}
                  </Link>
                ))}
              </div>
            </div>
            {[["Productos","productos"],["Nosotros","nosotros"],["Contacto","contacto"]].map(([lbl,id]) => (
              <button key={id} onClick={() => smoothScrollTo(id)} style={{ background:"none", border:"none", color:navTextMid, cursor:"pointer", fontSize:12, letterSpacing:0.5 }}>{lbl}</button>
            ))}
            <Link href={catalogHref} style={{ color:navText, fontSize:12, textDecoration:"underline", textUnderlineOffset:3 }}>Ver catálogo</Link>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <button onClick={() => { setFavoritesOpen(true); setCartOpen(false); }} aria-label="Favoritos"
              style={{ position:"relative", background:"none", border:"none", color:navTextMid, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill={favorites.length > 0 ? accent : "none"} stroke={favorites.length > 0 ? accent : "currentColor"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {favorites.length > 0 && <span style={{ position:"absolute", top:-4, right:-4, background:accent, color:"#fff", borderRadius:"50%", width:14, height:14, fontSize:8, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{favorites.length}</span>}
            </button>
            {pushBell && config?.showPushBell && !isPreview && (
              <StoreFollowButton storeSlug={config?.slug ?? ""} color={navTextMid} size={18} />
            )}
            {pushBell && config?.showPushBell && !isPreview && (
              <button onClick={pushBell.openDrawer}
                style={{ position:"relative", background:"none", border:"none", color:navTextMid, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill={pushBell.followState==="following"?"currentColor":"none"} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {pushBell.hasNew && <span style={{ position:"absolute", top:2, right:2, width:9, height:9, background:"#ef4444", borderRadius:"50%", border:`2px solid ${navBg}` }} />}
              </button>
            )}
            <div ref={userDropdownRef} style={{ position:"relative" }}>
              <button onClick={() => setUserDropdownOpen(o => !o)}
                style={{ background:"none", border:"none", color:navTextMid, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </button>
              {userDropdownOpen && (
                <div style={{ position:"absolute", top:"calc(100% + 10px)", right:0, background:"#fff", border:`1px solid ${navBorder}`, minWidth:180, zIndex:CAPAS.flotante, boxShadow:"0 8px 24px rgba(0,0,0,0.1)" }}>
                  {cargando ? (<p style={{ padding:"14px 16px", margin:0, fontSize:12, opacity:0.55 }}>Cargando…</p>) : logueado ? (
                    <>
                      <p style={{ padding:"10px 14px 4px", fontSize:11, color:"#999", margin:0, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{nombreMostrado}</p>
                      <a href={panelHref} onClick={() => setUserDropdownOpen(false)} style={{ display:"block", padding:"10px 14px", fontSize:12.5, color:"#111", textDecoration:"none", borderBottom:"1px solid #f0f0f0" }}>{panelLabel}</a>
                      <button onClick={() => { if (isPreview) return; setUserDropdownOpen(false); signOut("/"); }}
                        style={{ display:"block", width:"100%", padding:"10px 14px", fontSize:12.5, color:"#b91c1c", background:"none", border:"none", textAlign:"left", cursor: isPreview ? "default" : "pointer" }}>Cerrar sesión</button>
                    </>
                  ) : (
                    <>
                      <a href={isPreview ? undefined : `/login?redirect=/tienda/${config?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)} style={{ display:"block", padding:"11px 14px", fontSize:12.5, color:"#111", textDecoration:"none", borderBottom:"1px solid #f0f0f0" }}>Iniciar sesión</a>
                      <a href={isPreview ? undefined : `/registro?plan=buyer&redirect=/tienda/${config?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)} style={{ display:"block", padding:"11px 14px", fontSize:12.5, color:"#111", textDecoration:"none" }}>Registrarse</a>
                    </>
                  )}
                </div>
              )}
            </div>
            <button onClick={() => { setCartOpen(true); setFavoritesOpen(false); }} aria-label="Carrito" style={{ position:"relative", background:"none", border:"none", color:navTextMid, display:"flex", alignItems:"center", cursor:"pointer", padding:0 }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              {cartCount > 0 && <span style={{ position:"absolute", top:-4, right:-4, background:accent, color:accentText, borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{cartCount}</span>}
            </button>
            <button className="cc-burger" onClick={() => setMenuOpen(m => !m)}
              style={{ background:"none", border:"none", color:navText, padding:4, cursor:"pointer", fontSize:18 }}>{menuOpen ? "×" : "☰"}</button>
          </div>
        </div>
        {menuOpen && (
          <div style={{ background:navBg, borderTop:`1px solid ${navBorder}`, padding:"6px 24px 16px" }}>
            {[["Departamentos","departamentos"],["Productos","productos"],["Nosotros","nosotros"],["Contacto","contacto"]].map(([lbl,id]) => (
              <button key={id} onClick={() => { smoothScrollTo(id); setMenuOpen(false); }}
                style={{ display:"block", width:"100%", background:"none", border:"none", color:navTextMid, textAlign:"left", padding:"10px 0", fontSize:12.5, borderBottom:`1px solid ${navBorder}` }}>{lbl}</button>
            ))}
            <Link href={catalogHref} style={{ display:"block", color:navText, padding:"12px 0", fontSize:12.5, textDecoration:"underline" }} onClick={() => setMenuOpen(false)}>Ver catálogo completo</Link>
          </div>
        )}
      </nav>

      {/* ── HERO — minimalista, producto centrado ── */}
      <section style={{ paddingTop: isPreview ? 24 : NAV_H, position:"relative", ...secBg(heroImg, heroBg) }}>
        <BgDragHandle imgKey="sectionbg_bgHero" />
        <SectionOverlay ov={heroImg} />
        <EditableSectionBg field="bgHero" label="Fondo hero" nombreBloque="Banner principal" />
        <div style={{ position:"relative", zIndex:1, maxWidth:1100, margin:"0 auto", padding:"64px 24px 0", textAlign:"center" }}>
          <p style={{ margin:"0 0 18px", fontSize:11, color:heroMid, textTransform:"uppercase", letterSpacing:3 }}>
            <EditableZone field="heroKicker" label="Etiqueta hero">Hogar y Tecnología</EditableZone>
          </p>
          <h1 style={{ margin:"0 0 40px", fontSize:"clamp(26px,4vw,40px)", fontWeight:500, color:heroText, letterSpacing:-0.5, maxWidth:560, marginLeft:"auto", marginRight:"auto", lineHeight:1.3 }}>
            <EditableZone field="heroHeading" label="Título hero">Lo esencial, bien elegido</EditableZone>
          </h1>
          <div style={{ maxWidth:420, margin:"0 auto", aspectRatio:"1/1", background:"#fafafa", position:"relative" }}>
            <FadeImage src={heroImgUrl} alt="Producto destacado" fill sizes="420px" priority
              style={{ objectFit:"cover", objectPosition:`${iovr["heroImage"]?.posX ?? 50}% ${iovr["heroImage"]?.posY ?? 50}%` }} />
            <PhotoOverlay ov={iovr["heroImage"]} />
            <BgDragHandle imgKey="heroImage" />
            <EditableImageButton field="heroImage" label="Imagen del hero" />
          </div>
          <Link href={catalogHref} style={{ display:"inline-block", marginTop:28, fontSize:12.5, color:heroText, textDecoration:"underline", textUnderlineOffset:3, letterSpacing:0.3 }}>
            Ver catálogo completo
          </Link>
        </div>

        {/* confianza — línea chica al pie del hero */}
        <div style={{ position:"relative", zIndex:1, textAlign:"center", padding:"36px 24px", marginTop:24, borderTop:"1px solid #f0f0f0" }}>
          <p style={{ margin:0, fontSize:11.5, color:heroMid, letterSpacing:0.4 }}>
            <EditableZone field="trustLine" label="Línea de confianza">Cuotas con tarjeta · Garantía oficial · Envíos a todo el país</EditableZone>
          </p>
        </div>
      </section>

      <div style={{ display:"flex", flexDirection:"column" }}>
      {/* ── DEPARTAMENTOS — lista editorial en una fila ── */}
      <SectionBlock id="cc-departamentos" label="Departamentos" isPreview={isPreview} defaultOrder={CC_SECTION_IDS}>
      <section id="departamentos" data-reveal style={{ borderTop:"1px solid #f0f0f0", borderBottom:"1px solid #f0f0f0" }}>
        <div className="cc-dep-row" style={{ maxWidth:1100, margin:"0 auto" }}>
          {(() => {
          const usedCategoryIds = DEPARTAMENTOS.map((dd, j) => overrides[`dept${j}Cat`]?.text ?? dd.id);
          const items = DEPARTAMENTOS.map((d, i) => {
            const catKey = `dept${i}Cat`;
            const categoryId = overrides[catKey]?.text ?? d.id;
            // Si no es el dueño editando, ocultamos los departamentos sin productos
            // para no mandar al cliente a un catálogo vacío.
            if (!editMode && !products.some(p => p.category === categoryId)) return null;
            return (
              <div key={i} style={{ position:"relative", flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center",
                borderRight: i < DEPARTAMENTOS.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                <Link href={`/tienda/${config?.slug ?? ""}/productos?categoria=${categoryId}&t=casa-clara${isPreview ? "&from=editor" : ""}`}
                  data-no-unsaved-guard={editMode ? "true" : undefined}
                  onClick={e => { if (editMode) e.preventDefault(); }}
                  style={{ display:"block", padding:"16px 22px", fontSize:12.5, color:"#444", textDecoration:"none", whiteSpace:"nowrap" }}>
                  <EditableZone field={`dept${i}Label`} label={`Departamento ${i+1} — texto`}>{d.label}</EditableZone>
                </Link>
                {editMode && (
                  <select value={categoryId} onClick={e => e.stopPropagation()}
                    onChange={e => {
                      const newCat = e.target.value;
                      const conflictIdx = DEPARTAMENTOS.findIndex((dd, j) => j !== i && usedCategoryIds[j] === newCat);
                      if (conflictIdx !== -1) setOverride(`dept${conflictIdx}Cat`, { text: categoryId });
                      setOverride(catKey, { text: newCat });
                    }}
                    title="A qué categoría apunta este link"
                    style={{ marginBottom:6, maxWidth:140, fontSize:10, border:"1px solid #111", borderRadius:4, background:"#fff", color:"#111", cursor:"pointer", padding:"2px 4px" }}>
                    {CATEGORY_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                )}
              </div>
            );
          }).filter(Boolean);
          if (!editMode && items.length === 0) {
            return <p style={{ margin:"40px auto", color:prodMid, fontSize:13, textAlign:"center" }}>Todavía no hay categorías con productos cargados.</p>;
          }
          return items;
          })()}
        </div>
      </section>
      </SectionBlock>

      {/* ── OFERTAS ── */}
      <SectionBlock id="cc-ofertas" label="Ofertas" isPreview={isPreview} defaultOrder={CC_SECTION_IDS}>
      {ofertas.length > 0 && (
        <section data-reveal style={{ position:"relative", ...secBg(ofertasImg, ofertasBg), padding:"56px 24px", borderTop:"1px solid #f0f0f0" }}>
          <BgDragHandle imgKey="sectionbg_bgOfertas" />
          <SectionOverlay ov={ofertasImg} />
          <EditableSectionBg field="bgOfertas" label="Fondo ofertas" />
          <div style={{ position:"relative", zIndex:1, maxWidth:1100, margin:"0 auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:28, flexWrap:"wrap", gap:12 }}>
              <h2 style={{ margin:0, fontSize:"clamp(18px,2.5vw,22px)", fontWeight:500, color:ofertasText, letterSpacing:0.3 }}>
                <EditableZone field="ofertasHeading" label="Título ofertas">Ofertas</EditableZone>
              </h2>
              {hasMoreOfertas && <Link href={`${catalogHref}&oferta=true`} style={{ fontSize:12, color:prodMid, textDecoration:"underline" }}>Ver todas las ofertas</Link>}
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
              <div ref={ofertasScrollRef} className="cc-ofertas-row" style={{ display:"flex", gap:28, overflowX:"auto", scrollSnapType:"x mandatory", paddingBottom:4 }}>
                {ofertas.map(p => (
                  <div key={p.id} style={{ flex:"0 0 220px", scrollSnapAlign:"start" }}>
                    <ProductCard product={p} currency={currency} accent={accent} bg={ofertasBg} text={ofertasText} editMode={canOpenDemo} promotions={promotions}
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

      {/* ── PRODUCTOS — grid limpio, mucho blanco ── */}
      <SectionBlock id="cc-productos" label="Catálogo de productos" isPreview={isPreview} defaultOrder={CC_SECTION_IDS}>
      <section id="productos" data-reveal style={{ position:"relative", ...secBg(prodImg, prodBg), padding:"72px 24px" }}>
        <BgDragHandle imgKey="sectionbg_bgProductos" />
        <SectionOverlay ov={prodImg} />
        <EditableSectionBg field="bgProductos" label="Fondo productos" />
        <div style={{ position:"relative", zIndex:1, maxWidth:1100, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:40 }}>
            <h2 style={{ margin:0, fontSize:"clamp(18px,2.5vw,22px)", fontWeight:500, color:prodText, letterSpacing:0.3 }}>
              <EditableZone field="prodHeading" label="Título productos">Catálogo</EditableZone>
            </h2>
            {hasMore && <Link href={catalogHref} style={{ fontSize:12, color:prodMid, textDecoration:"underline" }}>Ver todo</Link>}
          </div>

          {loadingProducts ? (
            <p style={{ textAlign:"center", color:prodMid, fontSize:13, padding:"40px 0" }}>Cargando...</p>
          ) : showcased.length > 0 ? (
            <div className="cc-prod-grid" style={{ display:"grid", gap:"48px 28px" }}>
              {showcased.map(p => (
                <ProductCard key={p.id} product={p} currency={currency} accent={accent} bg={prodBg} text={prodText} editMode={canOpenDemo} promotions={promotions}
                  href={`/tienda/${config?.slug ?? ""}/producto/${p.id}${isPreview ? "?from=editor" : ""}`}
                  isFavorite={favorites.includes(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} />
              ))}
            </div>
          ) : (
            <p style={{ textAlign:"center", color:prodMid, fontSize:13, padding:"40px 0" }}>Aún no hay productos publicados.</p>
          )}
        </div>
      </section>
      </SectionBlock>

      {/* ── BANNER PROMOCIONAL ── */}
      <SectionBlock id="cc-promo" label="Banner promocional" isPreview={isPreview} defaultOrder={CC_SECTION_IDS}>
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
        bg="#0f172a"
      />
      </SectionBlock>

      {/* ── NOSOTROS — imagen + texto ── */}
      <SectionBlock id="cc-nosotros" label="Nuestra historia" isPreview={isPreview} defaultOrder={CC_SECTION_IDS}>
      <section id="nosotros" data-reveal style={{ position:"relative", ...secBg(nosotrosImg, nosotrosBg), padding:"72px 24px", borderTop:"1px solid #f0f0f0" }}>
        <BgDragHandle imgKey="sectionbg_bgNosotros" />
        <SectionOverlay ov={nosotrosImg} />
        <EditableSectionBg field="bgNosotros" label="Fondo nosotros" />
        <div className="cc-nos-grid" style={{ position:"relative", zIndex:1, maxWidth:1000, margin:"0 auto", display:"grid", gap:48, alignItems:"center" }}>
          <style>{`.cc-nos-grid{grid-template-columns:1fr} @media(min-width:768px){.cc-nos-grid{grid-template-columns:1fr 1fr}}`}</style>
          <div style={{ aspectRatio:"4/3", background:"#fafafa", position:"relative", overflow:"hidden" }}>
            <FadeImage src={nosotrosImgUrl} alt="Nuestra selección" fill sizes="(max-width: 768px) 100vw, 500px"
              style={{ objectFit:"cover", objectPosition:`${iovr["nosotrosImage"]?.posX ?? 50}% ${iovr["nosotrosImage"]?.posY ?? 50}%` }} />
            <PhotoOverlay ov={iovr["nosotrosImage"]} />
            <BgDragHandle imgKey="nosotrosImage" />
            <EditableImageButton field="nosotrosImage" label="Imagen sección Nosotros" />
          </div>
          <div>
            <p style={{ margin:"0 0 18px", fontSize:11, color:nosMid, textTransform:"uppercase", letterSpacing:3 }}>
              <EditableZone field="nosotrosKicker" label="Kicker nosotros">Nosotros</EditableZone>
            </p>
            <h2 style={{ margin:"0 0 20px", fontSize:"clamp(20px,3vw,26px)", fontWeight:500, color:nosText, lineHeight:1.4 }}>
              <EditableZone field="nosotrosHeading" label="Título nosotros">Productos elegidos con criterio, sin vueltas</EditableZone>
            </h2>
            <p style={{ margin:0, fontSize:14, color:nosMid, lineHeight:1.9 }}>
              <EditableZone field="nosotrosP1" label="Párrafo">Seleccionamos cada producto que vendemos. Calidad, garantía y buen precio, sin relleno innecesario.</EditableZone>
            </p>
          </div>
        </div>
      </section>
      </SectionBlock>

      {/* ── CONTACTO — minimal ── */}
      <SectionBlock id="cc-contacto" label="Contacto" isPreview={isPreview} defaultOrder={CC_SECTION_IDS}>
      <section id="contacto" data-reveal style={{ position:"relative", ...secBg(contactoImg, contactoBg), padding:"64px 24px", borderTop:"1px solid #f0f0f0" }}>
        <BgDragHandle imgKey="sectionbg_bgContacto" />
        <SectionOverlay ov={contactoImg} />
        <EditableSectionBg field="bgContacto" label="Fondo contacto" />
        <div style={{ position:"relative", zIndex:1, maxWidth:880, margin:"0 auto", display:"grid", gap:0 }} className="cc-contact-grid">
          <style>{`.cc-contact-grid{grid-template-columns:1fr} @media(min-width:768px){.cc-contact-grid{grid-template-columns:1fr 1px 1fr; gap:48px; text-align:left}}`}</style>
          <div style={{ textAlign:"center" }}>
            <p style={{ margin:"0 0 14px", fontSize:10.5, color:conMid, textTransform:"uppercase", letterSpacing:3 }}>Contacto</p>
            <h2 style={{ margin:"0 0 16px", fontSize:"clamp(20px,2.8vw,24px)", fontWeight:500, color:conText }}>
              <EditableZone field="contactHeading" label="Título contacto">¿Tenés alguna consulta?</EditableZone>
            </h2>
            <p style={{ margin:"0 0 20px", fontSize:13.5, color:conMid, lineHeight:1.8 }}>
              <EditableZone field="contactSubtext" label="Subtítulo contacto">Escribinos y te respondemos a la brevedad.</EditableZone>
            </p>
            <Link href={catalogHref} style={{ display:"inline-flex", color:"#111", fontSize:12.5, textDecoration:"underline", textUnderlineOffset:3 }}>Ver catálogo completo</Link>
            {showWA && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g,"")}${whatsapp.message?"?text="+encodeURIComponent(whatsapp.message):""}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginTop:14, color:"#1a9e4f", textDecoration:"none", fontWeight:600, fontSize:12.5 }}>
                <EditableZone field="contactWhatsApp" label="Texto link WhatsApp">o escribinos por WhatsApp</EditableZone>
              </a>
            )}
          </div>
          <div className="cc-contact-divider" style={{ display:"none", background:"#ececec" }} />
          <div style={{ paddingTop:24 }}>
            <ContactForm storeId={config?.storeId} accent="#111111" textColor="#111111" mutedColor="#999999" variant="underline" isPreview={isPreview} />
          </div>
        </div>
        <style>{`@media(min-width:768px){.cc-contact-divider{display:block!important}}`}</style>
      </section>
      </SectionBlock>
      </div>

      <footer style={{ position:"relative", ...secBg(footerImg, footerBg), color:ftText, padding:"28px 24px", textAlign:"center", borderTop: footerImg?.url ? "none" : "1px solid #f0f0f0" }}>
        <BgDragHandle imgKey="sectionbg_bgFooter" />
        <SectionOverlay ov={footerImg} />
        <EditableSectionBg field="bgFooter" label="Fondo footer" nombreBloque="Pie de la tienda" />
        <div style={{ position:"relative", zIndex:1 }}>
        <p style={{ margin:"0 0 10px", fontSize:11, color:ftMid }}>© {new Date().getFullYear()} {storeName}</p>
        {(editMode || isPreview || SOCIAL_NETWORKS.some(([key]) => config?.socialLinks?.[key])) && (
          <div style={{ display:"flex", justifyContent:"center", gap:10, marginBottom:12 }}>
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
        <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:"0 14px" }}>
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
      <div style={{ position:"fixed", inset:0, zIndex: isPreview ? CAPAS.previaModal : 205, pointerEvents: favoritesOpen ? "auto" : "none" }}>
        <div onClick={() => setFavoritesOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.4)", opacity: favoritesOpen ? 1 : 0, transition:"opacity 0.3s" }} />
        <div style={{ position:"absolute", top:0, right:0, bottom:0, width:380, maxWidth:"100vw", background:"#fff", transform: favoritesOpen ? "translateX(0)" : "translateX(100%)", transition:"transform 0.35s cubic-bezier(.4,0,.2,1)", display:"flex", flexDirection:"column", borderLeft:"1px solid #f0f0f0" }}>
          <div style={{ padding:"18px 22px 12px", borderBottom:"1px solid #f0f0f0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <p style={{ fontWeight:500, fontSize:14, margin:0, color:"#111" }}>Favoritos <span style={{ fontWeight:400, fontSize:12.5, color:"#aaa" }}>({favorites.length})</span></p>
            <button onClick={() => setFavoritesOpen(false)} style={{ background:"none", border:"none", color:"#111", fontSize:20, cursor:"pointer" }}>×</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"12px 22px" }}>
            {favoriteProducts.length === 0 ? (
              <div style={{ textAlign:"center", padding:"48px 0", color:"#aaa" }}>
                <p style={{ fontSize:28, marginBottom:10 }}>♡</p>
                <p style={{ fontSize:12.5, lineHeight:1.8 }}>No tenés favoritos aún.<br/>Explorá el catálogo.</p>
              </div>
            ) : favoriteProducts.map(product => (
              <div key={product.id} style={{ display:"flex", gap:12, padding:"12px 0", borderBottom:"1px solid #f5f5f5" }}>
                {product.images[0] ? (
                  <FadeImage src={product.images[0]} alt={product.name} width={72} height={54} style={{ objectFit:"cover", flexShrink:0, background:"#fafafa" }} />
                ) : (
                  <div style={{ width:72, height:54, flexShrink:0, background:"#fafafa" }} />
                )}
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, margin:"0 0 4px", color:"#111" }}>{product.name}</p>
                  <p style={{ fontSize:12.5, color:getReadableAccentText(accent, "#ffffff", "#111111"), fontWeight:600, margin:"0 0 8px" }}>{fmtPrice(product.price, currency)}</p>
                  <div style={{ display:"flex", gap:8 }}>
                    <Link href={`/tienda/${config?.slug ?? ""}/producto/${product.id}${isPreview ? "?from=editor" : ""}`}
                      onClick={e => { if (!canOpenDemo && isDemoProductId(product.id)) e.preventDefault(); else setFavoritesOpen(false); }}
                      style={{ fontSize:11, color:"#111", textDecoration:"underline" }}>
                      Ver
                    </Link>
                    <button onClick={() => toggleFavorite(product.id)}
                      style={{ background:"none", color:"#aaa", border:"none", fontSize:11, cursor:"pointer" }}>
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
          style={{ position:"fixed", bottom:24, right:24, zIndex:CAPAS.panel, background:"#25d366", color:"white", width:52, height:52,
            borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 20px rgba(37,211,102,0.4)", textDecoration:"none" }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 6.32A8.86 8.86 0 0 0 12.07 3a8.86 8.86 0 0 0-7.65 13.43L3 21l4.74-1.24a8.86 8.86 0 0 0 4.33 1.1h.01c4.9 0 8.87-3.97 8.87-8.86 0-2.37-.92-4.6-2.35-6.68zm-5.53 13.63a7.37 7.37 0 0 1-3.76-1.03l-.27-.16-2.8.73.75-2.73-.18-.28a7.36 7.36 0 0 1-1.13-3.93c0-4.07 3.31-7.38 7.39-7.38a7.34 7.34 0 0 1 5.22 2.17 7.34 7.34 0 0 1 2.16 5.22c0 4.07-3.31 7.39-7.38 7.39zm4.04-5.53c-.22-.11-1.3-.64-1.5-.71-.2-.08-.35-.11-.5.11-.15.22-.57.71-.7.86-.13.15-.26.16-.48.06-.22-.11-.93-.34-1.77-1.09-.65-.58-1.09-1.3-1.22-1.52-.13-.22-.01-.34.1-.45.1-.11.22-.28.33-.42.11-.14.15-.24.22-.4.08-.16.04-.3-.04-.42-.08-.11-.5-1.2-.69-1.65-.18-.43-.37-.37-.51-.38-.13-.01-.28-.01-.43-.01-.15 0-.39.06-.6.28-.21.22-.8.78-.8 1.9 0 1.12.81 2.2.93 2.35.11.15 1.55 2.37 3.76 3.23 1.87.73 2.25.59 2.66.55.41-.04 1.3-.53 1.49-1.04.18-.51.18-.94.13-1.04-.06-.1-.22-.16-.44-.27z"/></svg>
        </a>
      )}
    </div>
  );
}
