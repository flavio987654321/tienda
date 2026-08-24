"use client";
import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { usePathname } from "next/navigation";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { usePushBell } from "@/contexts/PushBellContext";
import { useSesion } from "@/components/AuthProvider";
import StoreFollowButton from "@/components/store/StoreFollowButton";
import { useHomeReviews, type EjemplosDeResenas } from "@/hooks/useHomeReviews";
import { ResenaComentario } from "@/components/store/templates/shared/ResenaComentario";
import { EditableZone, EditableImageButton, EditableSectionBg, BgDragHandle, getContrastColor, useEditContext, textoSobre } from "@/contexts/EditContext";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useCartLogic } from "@/hooks/useCartLogic";
import { masVistos } from "@/lib/masVistos";
import { linksLegales } from "@/lib/politicas-tienda";
import { catalogoTieneGeneros } from "@/lib/generos";
import { fotoDesdeProductos } from "@/lib/categoryTiles";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import VerifiedIconButton from "@/components/store/VerifiedIconButton";
import { CartDrawer, type CartTheme } from "@/components/store/templates/shared/CartDrawer";
import { OfferBadge } from "@/components/store/OfferBadge";
import { PromoTag, PromoPrice } from "@/components/store/PromoDisplay";
import { resolveProductPromo, describePromo } from "@/lib/promoDisplay";
import { CheckoutModal } from "@/components/store/templates/shared/CheckoutModal";
import { NewsletterForm } from "@/components/store/templates/shared/NewsletterForm";
import { ContactForm } from "@/components/store/templates/shared/ContactForm";
import { FadeImage } from "@/components/store/templates/shared/FadeImage";
import { SectionBlock } from "@/components/store/templates/shared/SectionBlock";
import { discountPercent } from "@/lib/discount";
/* La ficha de producto, para dibujarla adentro de la portada sin cambiar de
   página. `ProductDetailBody` es el CUERPO compartido —galería, opciones,
   carrito, descripción, reseñas, similares— y no dibuja ni barra ni pie, que es
   justo lo que hace falta: la barra y el pie los pone Aire, los suyos. El vestido
   sale de `AireDetail`, la misma ficha de la página suelta, para que las dos
   entradas al producto se vean iguales. */
import { ProductDetailBody, resolveDetailTheme, type ProductDetailViewProps } from "@/components/store/templates/productDetail/shared";
import { themeBase as temaFichaAire } from "@/components/store/templates/productDetail/AireDetail";
import { opcionesAElegir, valoresElegidos } from "@/lib/opciones";
import { resolveVariantPrice } from "@/lib/variantPrice";
import { CAPAS } from "@/lib/capas-tienda";
/* Qué productos van en la vitrina de la portada: la regla en `vitrina.ts` (una
   sola para los cinco templates de moda) y el engranaje que la elige, que se
   dibuja sobre el bloque. */
import { productosDeLaVitrina, leerModo, leerElegidos } from "@/lib/vitrina";
import { BotonVitrina } from "@/components/store/templates/shared/BotonVitrina";
import { COMENTARIO_MAX, RESENADOR_MAX } from "@/lib/reviews";



/* Las reseñas de EJEMPLO de la PORTADA. Mismo motivo que las de la ficha, y
   también propias de este template: si los diez muestran los mismos testimonios,
   la galería de templates se ve clonada. Nunca se publican — el hook las cambia
   por las reales apenas hay una. */
const EJEMPLOS_RESENAS_AIRE: EjemplosDeResenas = {
  producto: [
    { id:"ai-p1", rating:5, reviewer:"Camila O.", verified:true,  verifiedBy:"auto",
      comment:"Pedí el talle que decía la guía y calzó perfecto. La tela es bastante mejor de lo que esperaba por lo que salió." },
    { id:"ai-p2", rating:5, reviewer:"Julián B.", verified:false, verifiedBy:null,
      comment:"Llegó en tres días y venía envuelto en papel de seda. Se nota que lo preparan con ganas." },
    { id:"ai-p3", rating:5, reviewer:"Malena T.", verified:true,  verifiedBy:"owner",
      comment:"Es la tercera vez que compro acá. Nunca me falló una prenda y los colores son tal cual la foto." },
    { id:"ai-p4", rating:4, reviewer:"Sofía R.",  verified:false, verifiedBy:null,
      comment:"Divino y muy cómodo. Le pongo cuatro porque me hubiese gustado que viniera en más colores." },
  ],
  tienda: [
    { id:"ai-t1", rating:5, reviewer:"Agustina V.", verified:true,  verifiedBy:"auto",
      comment:"Les escribí por WhatsApp un domingo y me contestaron igual. Me ayudaron a elegir el talle y acerté." },
    { id:"ai-t2", rating:5, reviewer:"Nicolás F.",  verified:false, verifiedBy:null,
      comment:"Tuve que cambiar un talle y fue sin vueltas. Primera vez que un cambio online me resulta fácil." },
  ],
};



const announcementMessages_DEFAULT = [
  "🚚 Envío gratis en compras mayores a $30.000",
  "🔄 Cambios sin cargo hasta 30 días",
  "💳 6 cuotas sin interés",
];

/* ── Ícono de carrito flotante — variantes para elegir en modo edición ── */
const CART_ICON_OPTIONS: React.ReactNode[] = [
  <Fragment key="bag"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></Fragment>,
  <Fragment key="cart"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></Fragment>,
  <Fragment key="basket"><path d="M5 11 2 7h20l-3 4"/><path d="M4 11h16l-1.7 8.5a2 2 0 0 1-2 1.5H7.7a2 2 0 0 1-2-1.5L4 11Z"/><path d="M9 11V8a3 3 0 0 1 6 0v3"/></Fragment>,
];

/* ── Los iconos de la franja de garantias ────────────────────────────────────
   Cuatro juegos de cuatro. La dueña cambia el de cada garantia desde el editor
   tocando el icono, y la eleccion se guarda en `garantiaNIcon`. Son cuatro y no
   uno porque "envio" se dibuja de varias formas y ninguna es obviamente la
   correcta para todos los rubros. */
const AIRE_STRIP_ICONS: React.ReactNode[][] = [
  [
    <svg key="truck"  width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    <svg key="box"    width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    <svg key="zap"    width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    <svg key="gift"   width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
  ],
  [
    <svg key="refresh"    width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16"/><polyline points="21 3 21 8 16 8"/><polyline points="3 21 3 16 8 16"/></svg>,
    <svg key="undo"       width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>,
    <svg key="check-circ" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    <svg key="arrows-lr"  width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  ],
  [
    <svg key="shield" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
    <svg key="lock"   width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    <svg key="card"   width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    <svg key="award"  width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  ],
  [
    <svg key="chat"    width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    <svg key="phone"   width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    <svg key="headset" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>,
    <svg key="mail"    width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  ],
];

/* La dirección de la pantalla de contacto de una tienda.
 *
 * Se compara ENTERA y no con un "termina en /contacto": una tienda cuyo slug
 * fuera justamente "contacto" tiene su portada en /tienda/contacto, que también
 * termina así — y le habríamos abierto la pantalla de contacto en lugar de su
 * portada, para siempre y sin que se entienda por qué. */
const RUTA_CONTACTO = /^\/tienda\/[^/]+\/contacto\/?$/;
/* Y la del catálogo completo. Misma comparación entera por el mismo motivo. */
const RUTA_CATALOGO = /^\/tienda\/[^/]+\/productos\/?$/;
/* La de un producto. Ésta además CAPTURA el id, que es lo que se busca en el
   catálogo ya cargado en memoria para saber qué ficha dibujar. */
const RUTA_PRODUCTO = /^\/tienda\/[^/]+\/producto\/([^/]+)\/?$/;

/* ── El botón de volver ───────────────────────────────────────────────────────
 *
 * Redondo y ARRIBA A LA IZQUIERDA, que es donde se busca un "atrás". Antes era un
 * link de texto centrado al PIE de la pantalla: para volver había que recorrer
 * todo el catálogo hasta abajo, o usar el botón del navegador — que quien llegó
 * por un link compartido no tiene.
 *
 * Toma la forma del botón de "Explorar tiendas" (`VisitorBackButton`), que es el
 * atrás que la plataforma ya usa. Los COLORES no: aquel es oscuro y translúcido
 * porque vive encima de fotos; éste va sobre el papel claro de Aire, así que usa
 * la superficie y la línea del template. Misma forma, la ropa de acá.
 *
 * No va `fixed` como aquel: se pisarían, están los dos arriba a la izquierda.
 * Éste viaja con el contenido, arriba del título.
 *
 * `destino` es adónde vuelve, y NO es siempre la portada: desde la ficha de un
 * producto se vuelve al catálogo. Va en el `title` y en el `aria-label`, que es
 * lo único que lo dice — una flecha sola no distingue un atrás de otro. Por eso
 * el texto no se pierde al cambiar de forma: se muda al globito y al lector de
 * pantalla, en vez de desaparecer.
 */
function BotonVolver({ onClick, destino, S, LN, T, G }: {
  onClick: () => void; destino: string; S: string; LN: string; T: string; G: string;
}) {
  return (
    <button type="button" onClick={onClick} title={destino} aria-label={destino}
      style={{ width:40, height:40, borderRadius:"50%", background:S, border:`1px solid ${LN}`, color:T,
        display:"grid", placeItems:"center", cursor:"pointer", padding:0, flexShrink:0,
        boxShadow:"0 2px 10px rgba(20,22,26,0.06)", transition:"border-color 0.2s, color 0.2s, transform 0.2s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.color = G; e.currentTarget.style.transform = "scale(1.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = LN; e.currentTarget.style.color = T; e.currentTarget.style.transform = "scale(1)"; }}>
      <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
}

/* De a cuántos productos crece el catálogo cuando se toca "Ver más". */
const PASO_CATALOGO = 24;
const GARANTIAS = [
  {
    title:"Envío gratis", desc:"En compras mayores a $30.000",
    svg: <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  },
  {
    title:"Cambios sin cargo", desc:"Hasta 30 días después de la compra",
    svg: <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16"/><polyline points="21 3 21 8 16 8"/><polyline points="3 21 3 16 8 16"/></svg>,
  },
  {
    title:"Pago seguro", desc:"Todos los medios de pago protegidos",
    svg: <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
  },
  {
    title:"Atención personalizada", desc:"Respondemos en menos de 24 hs",
    svg: <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  },
];

/* Las secciones que el dueño puede reordenar y apagar. Hoy hay UNA. Las demas
   se agregan a medida que se construyen: un id listado aca sin bloque que lo
   dibuje le aparece al dueño en el editor como una seccion que puede prender y
   apagar, y no hace nada. */
const AIRE_SECTION_IDS = ["ai-tira", "ai-productos", "ai-garantias", "ai-destacados", "ai-resenas", "ai-newsletter"];

/* ── Component ─────────────────────────────────────────── */
export default function Aire() {
  const [scrolled,           setScrolled]           = useState(false);
  const [activeCategory,     setActiveCategory]     = useState("Todos");
  const [activeGender,       setActiveGender]       = useState<string | null>(null);
  const [hoveredNavCat,      setHoveredNavCat]      = useState<string | null>(null);
  /** Cuántos productos se muestran antes del "Ver más". Lo reinician el filtro
   *  de la franja y el de género, para no dejar el contador de una categoría
   *  aplicado sobre otra. */
  /** Qué tarjeta tiene el mouse encima, para agrandarle la foto. */
  const [hoveredId,          setHoveredId]          = useState<string | null>(null);
  const [isMobile,           setIsMobile]           = useState(false);
  const [mobileMenuOpen,     setMobileMenuOpen]     = useState(false);
  const [mobileCatsOpen,     setMobileCatsOpen]     = useState(false);
  const [mobileOpenCat,      setMobileOpenCat]      = useState<string | null>(null);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [announcementIdx,    setAnnouncementIdx]    = useState(0);
  const [heroIdx,            setHeroIdx]            = useState(0);
  const [activeSubcategory,  setActiveSubcategory]  = useState<string | null>(null);
  /** Qué colección se está mirando, si el comprador tocó una de las baldosas.
   *  `null` es "todo el catálogo". Es EXCLUYENTE con el filtro de categoría de la
   *  franja: elegir una apaga la otra. Combinarlas daría cruces como "ofertas de
   *  camperas" que casi siempre salen vacíos, y una grilla vacía después de tocar
   *  algo se lee como que la tienda no anda. */
  const [modo,               setModo]               = useState<null | "ofertas" | "masvisto" | "nuevos">(null);
  /** Corta el doble envio en la misma vuelta, antes de que el estado se entere. */
  const [showReport,     setShowReport]     = useState(false);
  useEffect(() => {
    const allowsPinch = (el: Element | null) => {
      while (el) { if ((el as HTMLElement).style?.touchAction?.includes("pinch-zoom")) return true; el = el.parentElement; }
      return false;
    };
    const preventPinch = (e: TouchEvent) => { if (e.touches.length > 1 && !allowsPinch(e.target as Element)) e.preventDefault(); };
    const preventGesture = (e: Event) => { if (!allowsPinch(e.target as Element)) e.preventDefault(); };
    document.addEventListener("touchmove", preventPinch, { passive: false });
    document.addEventListener("gesturestart", preventGesture as EventListener);
    document.addEventListener("gesturechange", preventGesture as EventListener);
    return () => {
      document.removeEventListener("touchmove", preventPinch);
      document.removeEventListener("gesturestart", preventGesture as EventListener);
      document.removeEventListener("gesturechange", preventGesture as EventListener);
    };
  }, []);

  const storeConfig = useStoreConfig();
  const pushBell = usePushBell();
  const { cargando, logueado, nombreMostrado, panelHref, panelLabel, signOut } = useSesion();
  const isPreview   = !!storeConfig?.previewFill;
  /** Rellenar con ejemplos y hablarle a la dueña son dos cosas distintas: la demo
   *  pública de `/plantillas/[id]` necesita lo primero y no lo segundo. */
  const enEditor    = isPreview && !storeConfig?.demoPublica;
  const isOwner     = !!storeConfig?.isOwner;
  const storefront  = useStorefront();
  const { products, promotions, loadingProducts, checkoutMode, ocultarPrecios, defaultCategories, currency, hasMercadoPago } = storefront;
  const isInquiryMode = checkoutMode === "inquiry" || ocultarPrecios;

  /* ── Portada o pantalla de contacto ─────────────────────────────────────────
     En la tienda de verdad lo decide la DIRECCIÓN: /tienda/xxx/contacto es una
     página aparte, con su propio título de pestaña, que se puede compartir sola
     y a la que el botón "atrás" del navegador vuelve como corresponde.

     En el editor no hay direcciones que valgan —la vista previa vive adentro de
     un panel— así que ahí lo decide un estado. Lo cambia el MISMO botón
     "Contacto", de modo que la dueña entra a editar esta pantalla igual que
     entra a la portada, sin tener que aprender otra cosa. */
  const rutaActual = usePathname() ?? "";
  /* Los parámetros de la dirección se leen del navegador y NO con
     `useSearchParams`. Ese hook obliga a envolver el árbol en un <Suspense>, y
     sin eso el template rompe con error 500 — medido: se cayó /preview/aire
     entero al agregarlo. El resto del proyecto ya lee así (ver `isPreview` en
     la ficha del producto).

     Se lee UNA vez al montar, que es cuando importa: la categoría llega en un
     link de entrada. Después manda lo que toque el visitante. */
  const [paramsUrl] = useState(() => new URLSearchParams(typeof window === "undefined" ? "" : window.location.search));
  /* Qué pantalla se está mirando.

     En la tienda de verdad lo dice la DIRECCIÓN: la portada, /contacto y
     /productos son tres páginas con su propio título de pestaña, que se pueden
     compartir sueltas y a las que el botón "atrás" del navegador vuelve como
     corresponde.

     En el editor no hay direcciones que valgan —la vista previa vive adentro de
     un panel— así que ahí lo decide un estado. Lo cambian los MISMOS botones del
     menú, de modo que la dueña entra a editar cualquiera de las tres igual que
     entra a la portada, sin tener que aprender otra cosa. */
  const [vistaEnPreview, setVistaEnPreview] = useState<"portada" | "contacto" | "catalogo" | "producto">("portada");
  /* Qué producto se está mirando en la vista previa. En la tienda de verdad esto
     lo dice la dirección; en la previa no hay dirección que valga, así que el id
     se guarda acá. */
  const [productoEnPreview, setProductoEnPreview] = useState<string | null>(null);
  const enContacto = isPreview ? vistaEnPreview === "contacto" : RUTA_CONTACTO.test(rutaActual);
  const enCatalogo = isPreview ? vistaEnPreview === "catalogo" : RUTA_CATALOGO.test(rutaActual);
  /* El id del producto abierto, o null si no hay ninguno. Es el id y no un
     booleano porque de él sale QUÉ ficha dibujar, y porque cambiar de un producto
     a otro —tocando un "similar"— tiene que notarse: con un booleano las dos
     situaciones son la misma y la ficha no se enteraría de que cambió. */
  const productoAbierto = isPreview
    ? (vistaEnPreview === "producto" ? productoEnPreview : null)
    : (RUTA_PRODUCTO.exec(rutaActual)?.[1] ?? null);
  const enProducto = !!productoAbierto;
  const enPortada  = !enContacto && !enCatalogo && !enProducto;
  const urlTienda  = `/tienda/${storeConfig?.slug ?? ""}`;

  /* Llegar a la portada la deja como está cuando se entra de cero: sin filtrar.

     El filtro de categoría es UNO SOLO y lo comparten dos pantallas: la franja
     de la portada y la lista del costado del catálogo. Eso está bien mientras se
     navega —tocar "Remeras" en el menú lleva al catálogo YA en remeras, que es
     justo lo que se pidió—, pero se colaba de vuelta: al volver a la portada, el
     bloque de productos seguía mostrando sólo remeras. Y el visitante nunca tocó
     la franja: eligió una categoría para el CATÁLOGO, y le quedó cambiada la
     pantalla de la que venía.

     Se lee mal de las dos formas posibles: o parece que la tienda tiene cuatro
     remeras y nada más, o parece que el bloque quedó trabado. La portada es la
     puerta de entrada; tiene que mostrar todo, como la primera vez.

     Se reinicia al ENTRAR, no mientras se está: quien filtra la franja estando
     en la portada la ve filtrada, que es para lo que la tocó. Y va acá y no
     adentro de `irALaPortada` para que valga por todos los caminos de vuelta —el
     botón redondo, el logo, "atrás" del navegador— y no sólo por uno.

     Se ajusta durante el dibujado, el patrón que recomienda React para esto. */
  const [portadaPrevia, setPortadaPrevia] = useState(enPortada);
  if (enPortada !== portadaPrevia) {
    setPortadaPrevia(enPortada);
    if (enPortada) {
      setModo(null);
      setActiveCategory("Todos");
      setActiveSubcategory(null);
      setActiveGender(null);
    }
  }
  /* Cambiar de pantalla NO es irse a otra página.

     Antes era `router.push(url)`: Aire se desmontaba entero, el servidor volvía a
     dibujar la pantalla nueva y el visitante veía el parpadeo de una carga. Tres
     pantallas que son el mismo template, y entre una y otra la tienda se apagaba
     y se prendía.

     Ahora se cambia SÓLO la dirección, con la History API del navegador. Next la
     acepta a propósito y la sincroniza con `usePathname` —está documentado en
     `01-getting-started/04-linking-and-navigating.md`— y de `usePathname` salen
     justamente `enContacto` y `enCatalogo`, tres líneas más arriba. O sea: se
     escribe la dirección nueva, `usePathname` la devuelve, y Aire se redibuja
     como catálogo sin que haya viajado nada. El árbol no se desmonta: el carrito
     con cosas adentro, lo que se venía filtrando y la posición del scroll siguen
     en pie.

     Y la dirección igual CAMBIA, que es la mitad que suele perderse cuando algo
     "abre ahí mismo": el botón atrás vuelve como corresponde (`popstate` mueve
     `usePathname` y la pantalla se va sola), y el link que el visitante copia de
     la barra sigue siendo el de la pantalla que está mirando. Entrando de cero
     por esa dirección la dibuja el servidor, como siempre.

     Lo único que esto no mueve es el título de la pestaña, que lo pone el
     servidor al entrar. */
  /* Subir arriba del todo al cambiar de pantalla.

     No alcanza con `window.scrollTo`. En la tienda de verdad la que scrollea es
     la ventana y funciona; en el EDITOR el template vive adentro de un panel con
     scroll propio (`overflowY:auto` en configuracion/page.tsx), y ahí la ventana
     no se mueve un pixel porque no es la que está scrolleada. Se veía así: la
     dueña tocaba "Ofertas", el catálogo aparecía —pero a mitad de página, con el
     título arriba fuera de vista— y parecía que el clic había hecho cualquier
     cosa.

     Entonces se busca quién scrollea de verdad: se sube por los padres desde la
     raíz del template hasta encontrar el primero que tenga scroll propio, y se
     lo sube a él. Si no hay ninguno —la tienda publicada—, queda la ventana, que
     es el caso de siempre.

     La raíz se busca por `data-aire-raiz` y no con un `useRef`: el lint del repo
     (`react-hooks/refs`) marca error si una función que lee un ref queda al
     alcance del dibujado, y ésta la llaman handlers que se arman ahí. Buscarla
     en el documento hace exactamente lo mismo y no arrastra esa regla. */
  const subirArriba = () => {
    window.scrollTo({ top: 0 });
    let n = document.querySelector<HTMLElement>("[data-aire-raiz]")?.parentElement ?? null;
    while (n) {
      const ov = getComputedStyle(n).overflowY;
      if ((ov === "auto" || ov === "scroll") && n.scrollHeight > n.clientHeight) { n.scrollTop = 0; return; }
      n = n.parentElement;
    }
  };

  const irA = (vista: "portada" | "contacto" | "catalogo", url: string) => {
    /* Acá había un `if (editMode) return`, y dejaba el editor sin salida: tocar
       "Catálogo" o "Contacto" mientras se editaba no hacía NADA. O sea que las
       otras pantallas del template no se podían ni mirar ni acomodar — se editaba
       la portada y el resto quedaba a ciegas. Editando se navega igual que en la
       tienda: es lo que hay que poder hacer para editar el template entero. */
    if (isPreview) { setVistaEnPreview(vista); subirArriba(); return; }
    window.history.pushState(null, "", url);
    subirArriba();
  };
  const irAContacto  = () => irA("contacto", `${urlTienda}/contacto`);
  const irAlCatalogo = () => irA("catalogo", `${urlTienda}/productos`);
  const irALaPortada = () => irA("portada", urlTienda);

  /* Ir al catálogo YA filtrado por una categoría.

     Los cuatro lugares del menú que llevan a una categoría hacían
     `window.location.href = "/tienda/" + slug + "/productos?categoria=..."`.
     Dos problemas: recargaban la página entera teniendo el catálogo acá
     mismo, y sin slug —la vista previa suelta— armaban
     `/tienda/undefined/productos`, que es un 404 con la palabra `undefined`
     a la vista.

     Y el peor de los dos: el `?categoria=` no lo leía nadie. El catálogo de
     Aire lo dibuja el template, no la página vieja que sí lo miraba, así que
     el link llevaba al catálogo SIN filtrar. */
  const irAlCatalogoCon = (cat: string, sub?: string | null) => {
    setModo(null);
    setActiveCategory(cat);
    setActiveSubcategory(sub ?? null);
    irAlCatalogo();
  };

  /* Abrir un producto es IR A SU PÁGINA, no abrir una ventanita encima.

     El modal servía para espiar sin perder el lugar en la grilla, pero también
     era el techo: no se puede compartir por link, Google no lo ve, y todo lo
     que el vendedor cargó —las fotos, el video, las medidas, las reseñas— tenía
     que caber en una cajita con scroll propio. La ficha entera existe desde
     antes y la usaban otros templates; Aire ahora también.

     Y abre SIEMPRE, también editando. Acá había un `if (editMode) return` —el
     tercero de la misma familia, después del de `irA` y el de las baldosas— con
     la idea de que en el editor el clic sobre una tarjeta es para acomodar la
     tarjeta y no para irse. Pero en la tarjeta no hay nada que acomodar: los
     textos que la dueña escribe son los del producto y se editan en Productos,
     no acá. Lo único que lograba era que la FICHA —una pantalla entera del
     template, con sus fotos, sus medidas y sus reseñas— no se pudiera ni mirar
     desde diseño. Y ya no hace falta que lo impida: desde que la ficha abre en
     el lugar, tocar un producto no saca a nadie del editor.

     Que el clic no haga nada nunca es una opción: quien toca una foto de
     producto espera abrirla, y si no pasa nada la conclusión es que está roto. */
  const abrirProducto = (product: StorefrontProduct) => {
    /* Cargar el producto en el carrito ANTES de mostrar la ficha. `openModal` no
       abre ninguna ventana —el nombre le quedó de cuando esto era un modal—: deja
       elegido el producto, la foto del color que corresponde, las opciones que no
       tienen alternativa y la cantidad. Sin esto la ficha se dibuja pero el botón
       de agregar no tiene producto sobre el cual trabajar. */
    openModal(product);
    const s = storeConfig?.slug;
    /* Sin dirección de tienda —la previa del editor, o /preview/aire suelto— no
       hay dirección que escribir, así que la pantalla la manda el estado. Antes
       acá había un `window.open` a una pestaña nueva y, sin tienda, un aviso de
       que la ficha se veía en la tienda publicada. Las dos cosas sobran: la ficha
       ahora se dibuja acá mismo, con los datos que ya están en memoria. */
    if (isPreview || !s) {
      setVistaEnPreview("producto");
      setProductoEnPreview(product.id);
      subirArriba();
      return;
    }
    window.history.pushState(null, "", `/tienda/${s}/producto/${product.id}`);
    subirArriba();
  };

  /* Ir a una sección de la portada.
     Vivía afuera del componente y era un `getElementById(...)?.scrollIntoView()`
     pelado. En las pantallas que no son la portada esas secciones no están
     dibujadas, así que ese `?.` se comía el clic en silencio: tocabas "Catálogo"
     o una categoría y la página se quedaba quieta, sin ir a ningún lado y sin
     decir por qué. Ahora, si el destino no existe, primero se vuelve a la
     portada. (En el catálogo sí existe `#productos`: es la grilla completa, así
     que filtrar por categoría desde el menú funciona ahí mismo.) */
  const irASeccion = (id: string) => {
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: "smooth" }); return; }
    irALaPortada();
  };

  /* Cuántas tarjetas se dibujan en el catálogo. De a 24: una tienda con 500
     productos no puede dibujarlos todos de una — son 500 fotos pedidas al mismo
     tiempo y el celular se arrastra. */
  const [mostrados, setMostrados] = useState(PASO_CATALOGO);
  /* Y vuelve a 24 cada vez que cambia el filtro. Sin esto, alguien que apretó
     "Ver más" tres veces y después elegía una categoría con ocho productos
     seguía "mostrando 96": no se notaba, hasta que volvía a Todos y aparecían
     noventa y seis de golpe sin haberlo pedido. Se ajusta durante el dibujado,
     que es lo que recomienda React para esto, y no con un efecto. */
  const firmaFiltro = `${modo ?? ""}|${activeGender ?? ""}|${activeCategory}|${activeSubcategory ?? ""}`;
  const [firmaPrevia, setFirmaPrevia] = useState(firmaFiltro);
  if (firmaFiltro !== firmaPrevia) { setFirmaPrevia(firmaFiltro); setMostrados(PASO_CATALOGO); }

  /* En celular la lista de filtros arranca plegada: abierta ocupa la pantalla
     entera y hay que pasarla de largo para llegar a los productos. */
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  /* La categoría también puede llegar EN LA DIRECCIÓN.

     El pie arma `/productos?categoria=remeras`, y ese link se comparte y se
     guarda en favoritos. Si el catálogo no lo mira, quien lo abre cae en
     "Todos" sin entender por qué el link no hizo nada.

     Se ajusta durante el dibujado —el patrón que recomienda React para esto—
     y una sola vez por dirección: después manda lo que toque el visitante. */
  const catDeLaUrl = paramsUrl.get("categoria");
  const subDeLaUrl = paramsUrl.get("subcategoria");
  const [catUrlAplicada, setCatUrlAplicada] = useState<string | null>(null);
  if (enCatalogo && catDeLaUrl && catDeLaUrl !== catUrlAplicada) {
    setCatUrlAplicada(catDeLaUrl);
    setModo(null);
    setActiveCategory(catDeLaUrl);
    setActiveSubcategory(subDeLaUrl);
  }



  const categoryList = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(c => c && c !== "general"))];
    const base = cats.length > 0 ? cats : defaultCategories.slice(0, 6);
    return base;
  }, [products, defaultCategories]);

  const subcategoriesFor = useMemo(() => {
    const map: Record<string, string[]> = {};
    products.forEach(p => {
      if (p.subcategory && p.category) {
        if (!map[p.category]) map[p.category] = [];
        if (!map[p.category].includes(p.subcategory)) map[p.category].push(p.subcategory);
      }
    });
    return map;
  }, [products]);
  const { editMode, overrides: textOverrides, setOverride } = useEditContext();
  /* `lockScrollOnModal: false` — Aire NO tiene ventanita de producto.
     El carrito trae un candado que congela el `<body>` (`overflow:hidden` +
     `position:fixed`) mientras hay un producto elegido. Tiene sentido cuando la
     ficha flota encima: lo de atrás no se tiene que mover. Acá la ficha ES la
     página, así que ese candado congela la pantalla que el visitante está
     leyendo — no se puede bajar a las reseñas ni a los similares. Y como el
     producto elegido no se suelta al volver al catálogo, el congelamiento se
     arrastra al resto del template.
     La página suelta del producto ya lo apagaba por lo mismo (ver
     `ProductDetailClient`); Aire dibuja esa misma ficha y necesita lo mismo. */
  const cart = useCartLogic({ ...storefront, lockScrollOnModal: false });
  const {
    setCartOpen,
    searchOpen, setSearchOpen, searchQuery, setSearchQuery,
    favorites, favoritesOpen, setFavoritesOpen,
    userDropdownOpen, setUserDropdownOpen, userDropdownRef,
    toastMsg,
    cartCount,
    searchResults, favoriteProducts,
    fmt, agregarDirecto,
    toggleFavorite,
    /* Lo que necesita la ficha de producto dibujada acá adentro. Todo esto ya
       estaba resuelto en `useCartLogic` y lo usan los otros templates; Aire
       simplemente no se lo venía pidiendo. La foto activa de la galería es
       `modalImg` y no un estado nuevo a propósito: el hook ya tiene el ida y
       vuelta entre la foto y el color elegido, y con un estado propio esa
       sincronización se rompería. */
    openModal, modalImg, setModalImg,
    seleccion, setOpcion, qty, setQty, addToCart,
  } = cart;

  /* Cargar la ficha cuando el producto lo eligió la DIRECCIÓN y no un clic.
     Pasa en tres situaciones y las tres son de verdad: alguien entra por un link
     compartido, alguien vuelve con el botón "atrás", o alguien toca un producto
     "similar" adentro de la ficha —esos son links y no pasan por `abrirProducto`—.
     En todas, `abrirProducto` no corrió y sin esto la ficha se dibujaría con el
     producto anterior, o sin ninguno.

     Es un ajuste durante el dibujado y no un efecto, igual que el reinicio del
     "Ver más" de más arriba: es el patrón de React para "poner el estado al día
     cuando cambia algo de afuera", y evita el parpadeo de dibujar una vez con el
     producto viejo antes de corregirlo.

     `products` puede no haber llegado todavía: en ese caso no se marca nada y se
     vuelve a intentar en el dibujado siguiente, cuando el catálogo esté. */
  const [fichaCargada, setFichaCargada] = useState<string | null>(null);
  if (enProducto && productoAbierto !== fichaCargada) {
    const p = products.find(x => x.id === productoAbierto);
    if (p) { setFichaCargada(productoAbierto); openModal(p); }
  } else if (!enProducto && fichaCargada !== null) {
    // Al salir de la ficha se olvida cuál era, para que volver a abrir ESE mismo
    // producto la reconstruya en vez de mostrarla como quedó la vez pasada.
    setFichaCargada(null);
  }


  /* Acá había un efecto que leía `?p=<id>` de la dirección y abría el modal de
     ese producto: era la forma de que un link compartido llevara a algo. Ya no
     hace falta —cada producto tiene su propia página— y el botón de compartir
     ahora copia esa dirección. Los links viejos con `?p=` no se rompen: caen en
     la portada, que es donde caían antes si el producto ya no existía. */

  /* Las reseñas de un producto las carga ahora su PÁGINA, no el template: acá ya
     no hay ninguna ficha abierta de la que hablar. Las de la portada —el bloque
     con flechas— siguen siendo otra cosa y viven en `useHomeReviews`. */

  /* ── Las reseñas de la PORTADA ──────────────────────────────────────────────
     La lógica —de dónde salen, cuáles suben, el promedio, borrar una, publicar
     una nueva— vive entera en `useHomeReviews`. Acá sólo se dibuja.

     A diferencia del resto de los templates, este bloque NO tiene pestañas. Las
     dos listas —las que hablan de un producto y las que hablan de la tienda— van
     mezcladas en una sola fila que se mueve con flechas. Dos pestañas arriba de
     un carrusel son dos controles peleando por el mismo lugar, y la pestaña
     vacía hacía que la tienda pareciera sin reseñas teniéndolas al lado.

     Se INTERCALAN, arrancando por una de producto. Puestas primero todas las de
     tienda —que es el orden en que el dueño las aprobó— el bloque abría con dos
     tarjetas de puro texto, y la foto de la prenda al lado es justo lo que lo
     hace distinto de un muro de testimonios. */
  const resenas = useHomeReviews({
    slug: storeConfig?.slug, isPreview, isOwner,
    productos: products.map(p => ({ id: p.id, name: p.name, images: p.images })),
    ejemplos: EJEMPLOS_RESENAS_AIRE,
  });
  const tarjetasResena = useMemo(() => {
    // Las de producto traen la foto del producto; las de tienda no tienen ninguna
    // que no haya que inventar. Intercaladas, la fila alterna entre una y otra en
    // vez de amontonar todas las de texto de un lado.
    const conFoto = resenas.deProducto;
    const sinFoto = resenas.deTienda;
    const mezcla: typeof conFoto = [];
    for (let i = 0; i < Math.max(conFoto.length, sinFoto.length); i++) {
      if (conFoto[i]) mezcla.push(conFoto[i]);
      if (sinFoto[i]) mezcla.push(sinFoto[i]);
    }
    // Doce y no todas: el servidor ya manda hasta 12 de cada tipo, y una fila de
    // veinticuatro tarjetas es una que nadie termina de recorrer.
    return mezcla.slice(0, 12);
  }, [resenas.deProducto, resenas.deTienda]);
  const resenaVacia = tarjetasResena.length === 0;

  /* Las flechas. Se prenden y se apagan MIDIENDO el desplazamiento, no llevando
     un índice propio: la fila también se mueve con el dedo, con la rueda y con
     el teclado, y un índice se desincroniza apenas el visitante la arrastra. */
  const pistaResenas = useRef<HTMLDivElement>(null);
  const [puedeIzq, setPuedeIzq] = useState(false);
  const [puedeDer, setPuedeDer] = useState(false);
  useEffect(() => {
    const el = pistaResenas.current;
    if (!el) return;
    const medir = () => {
      const sobra = el.scrollWidth - el.clientWidth;
      setPuedeIzq(el.scrollLeft > 8);
      setPuedeDer(sobra > 8 && el.scrollLeft < sobra - 8);
    };
    medir();
    // El ResizeObserver es por el celular que gira y por el editor, que cambia
    // el ancho del lienzo sin recargar: sin esto la flecha derecha queda apagada
    // en una pantalla donde ya hay de sobra para desplazar.
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    el.addEventListener("scroll", medir, { passive: true });
    return () => { ro.disconnect(); el.removeEventListener("scroll", medir); };
  }, [tarjetasResena.length]);

  const moverResenas = (dir: 1 | -1) => {
    const el = pistaResenas.current;
    if (!el) return;
    // Una tarjeta por vez, no la pantalla entera: con dos a la vista, saltar de a
    // una deja siempre una conocida en pantalla y se lee como que la fila se
    // movió, en vez de como que cambió todo el contenido de golpe.
    const paso = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? el.clientWidth;
    el.scrollBy({ left: dir * (paso + 14), behavior: "smooth" });
  };

  const ANNOUNCEMENT_BAR_H = 36;
  const promoBannerEnabled = storeConfig?.promoBanner?.enabled !== false;
  const announcementMessages = (storeConfig?.promoBanner?.messages?.filter(m => m.trim()) ?? []).length > 0
    ? storeConfig!.promoBanner!.messages!.filter(m => m.trim())
    : announcementMessages_DEFAULT;
  const showAnnouncement = promoBannerEnabled && announcementVisible;
  const announcementBarHeight = showAnnouncement ? ANNOUNCEMENT_BAR_H : 0;

  /* Cuánto mide la barra de arriba, MEDIDO.

     En la tienda publicada la barra va despegada de la página y hay que
     devolverle su lugar con un hueco del mismo alto. El primer intento le puso
     64px a mano y quedó mal en los dos lados: mide 69 en escritorio y 59 en
     celular, porque el relleno cambia con el ancho. Cinco píxeles de barra
     encima del título no se ven en una captura, pero están.

     Medirla se arregla sola el día que cambie el relleno, o cuando el nombre de
     la tienda sea tan largo que la barra crezca. */
  const barraRef = useRef<HTMLElement>(null);
  const [altoBarra, setAltoBarra] = useState(104);
  useEffect(() => {
    const el = barraRef.current;
    if (!el) return;
    const medir = () => setAltoBarra(el.getBoundingClientRect().height + announcementBarHeight);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [announcementBarHeight]);

  useScrollReveal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      const y = window.scrollY;
      document.body.dataset.scrollY = String(y);
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${y}px`;
      document.body.style.width = "100%";
    } else {
      const y = parseInt(document.body.dataset.scrollY || "0");
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      if (y) window.scrollTo(0, y);
      document.body.dataset.scrollY = "";
    }
    return () => {
      const y = parseInt(document.body.dataset.scrollY || "0");
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      if (y) window.scrollTo(0, y);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!showAnnouncement) return;
    const interval = setInterval(() => {
      setAnnouncementIdx(i => (i + 1) % announcementMessages.length);
    }, 3500);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAnnouncement]);

  /* Filtrar por categoria SIN cambiar de pagina, que es lo que hace la franja
     de arriba. Ademas de la categoria hay que limpiar la subcategoria y volver
     la subcategoria: sin eso, al pasar de "Camperas > Inflables" a "Remeras"
     quedaba filtrando por una subcategoria que la categoria nueva no tiene, y
     la grilla salia vacia. */
  const aplicarCategoria = (cat: string) => {
    setModo(null);
    setActiveCategory(cat);
    setActiveSubcategory(null);
    irASeccion("productos");
  };

  const changeGender = (g: string | null) => {
    setModo(null);
    setActiveGender(g);
    setActiveCategory("Todos");
    setActiveSubcategory(null);
  };

  /** Ver `catalogoTieneGeneros`: el filtro Mujer/Hombre solo aparece si el
   *  catálogo real tiene de los dos. Si no, son dos botones que no filtran. */
  const hayGeneros = useMemo(() => catalogoTieneGeneros(products), [products]);

  /** Cuántos productos entran en la portada.
   *
   *  SEIS: la grilla tiene 6 columnas en pantalla grande, 3 en tablet y 2 en
   *  celular, y 6 es divisible por las tres, así que la última fila siempre queda
   *  completa. Con 8 quedaba una fila de 6 y otra de 2 sueltos abajo, que se lee
   *  como que la página se cortó. */
  const EN_PORTADA = 6;

  /* ── Las tres colecciones de las baldosas ──────────────────────────────────
     OFERTAS junta las dos formas de "está más barato": el precio tachado
     (`comparePrice`) y las promociones (3x2, %, etc.). Se juntan porque medido
     en las tiendas reales NUNCA conviven —Girly Store tiene 13 ofertas y cero
     promos; TiendaApps y Amaranta tienen promos y cero ofertas— así que dos
     baldosas separadas garantizan que cada tienda vea una vacía. Y para el
     comprador son lo mismo: no distingue "tachado" de "3x2", los dos son que
     sale menos.

     LO MÁS VISTO sale del helper compartido, que exige un mínimo de productos
     con vistas reales antes de mostrarse: un ranking de tres productos con una
     visita cada uno no es un ranking.

     NOVEDADES son los últimos 30 días. */
  const enOferta = useMemo(() => products.filter(prod => {
    if (prod.comparePrice != null && prod.comparePrice > prod.price) return true;
    return !!resolveProductPromo(prod, promotions).primaryPromo;
  }), [products, promotions]);

  const vistos = useMemo(() => masVistos(products, { relleno: isPreview }), [products, isPreview]);

  /* NOVEDADES: los últimos que entraron, ordenados por fecha de carga.

     NO son "los de los últimos 30 días", que es lo primero que uno escribe. Dos
     motivos, y el segundo es el que manda:

     1. Una tienda que no carga nada en un mes se queda sin la sección, justo
        cuando más le convendría que le vean el catálogo.
     2. Preguntar la hora durante el dibujado hace que el mismo componente pueda
        dar resultados distintos en dos dibujados seguidos, sin que haya cambiado
        ningún dato. React lo prohíbe y el lint lo marca. Ordenar por fecha no
        necesita saber qué día es hoy.

     Y sólo aparece si el catálogo tiene MÁS productos de los que muestra: con 6
     productos en total, "lo último que entró" son todos, y la baldosa estaría
     prometiendo una selección que no seleccionó nada. */
  const novedades = useMemo(() => {
    // El corte es EN_PORTADA y no un número aparte: la baldosa tiene sentido
    // cuando "lo último" es un recorte de algo más grande. Con seis productos en
    // total, los seis últimos son todos, y la baldosa no seleccionó nada.
    if (products.length <= EN_PORTADA) return [];
    return products
      .filter(prod => !!prod.createdAt)
      // Las fechas vienen en ISO, que se ordena bien como texto: comparar así
      // evita construir un Date por producto en cada comparación del sort.
      .sort((a, b) => (a.createdAt! < b.createdAt! ? 1 : a.createdAt! > b.createdAt! ? -1 : 0));
  }, [products]);
  /** Las baldosas que SE DIBUJAN. Una colección sin nada adentro no aparece: una
   *  baldosa grande con foto que lleva a una grilla vacía es un callejón sin
   *  salida en el lugar más visible de la página. */
  const colecciones = useMemo(() => ([
    { id: "ofertas"  as const, titulo: "Ofertas",      bajada: "Lo que está más barato ahora", lista: enOferta },
    { id: "masvisto" as const, titulo: "Lo más visto", bajada: "Lo que más miran los compradores", lista: vistos.lista },
    { id: "nuevos"   as const, titulo: "Novedades",    bajada: "Lo último que entró", lista: novedades },
  ].filter(c => c.lista.length > 0)), [enOferta, vistos.lista, novedades]);

  /* Lo que la grilla muestra, en dos pasos: primero TODO lo que pasa los filtros
     —para poder decir "mostrando 8 de 34"— y recien despues el recorte.

     `hayGeneros` tambien entra en el filtro de genero: si el catalogo cambia y el
     filtro Mujer/Hombre deja de existir, un `activeGender` viejo dejaria la
     tienda filtrada sin ningun control a la vista que lo apague. */
  const allFiltered = useMemo(() => (
    modo === "ofertas"  ? enOferta :
    modo === "masvisto" ? vistos.lista :
    modo === "nuevos"   ? novedades :
    products
  ).filter(prod => {
    if (hayGeneros && activeGender && prod.gender !== activeGender && prod.gender !== "unisex") return false;
    if (activeCategory !== "Todos" && prod.category !== activeCategory) return false;
    if (activeSubcategory && prod.subcategory !== activeSubcategory) return false;
    return true;
  }), [products, modo, enOferta, vistos.lista, novedades, hayGeneros, activeGender, activeCategory, activeSubcategory]);

  /* Los seis que se ven. Antes era `allFiltered.slice(0, EN_PORTADA)` a secas —
     siempre los últimos cargados, sin forma de tocarlo. Ahora lo decide la dueña
     desde el engranaje del bloque (ver `vitrina.ts`).

     El recorte va DESPUÉS de los filtros y no antes: con "Remeras" puesto en la
     franja, la vitrina tiene que elegir entre las remeras, no elegir seis de todo
     el catálogo y después tirar las que no son remeras —que dejaría el bloque
     casi vacío sin explicación.

     Y sólo manda cuando NO hay una colección puesta: si el comprador tocó
     "Ofertas", lo que tiene que ver son ofertas, no la vitrina que armó la dueña.
     Ahí el criterio ya lo eligió él. */
  const filtered = useMemo(() => (
    modo
      ? allFiltered.slice(0, EN_PORTADA)
      : productosDeLaVitrina(allFiltered, EN_PORTADA, {
          modo: leerModo(textOverrides["vitrinaModo"]?.text),
          elegidos: leerElegidos(textOverrides["vitrinaIds"]?.text),
        })
  ), [allFiltered, modo, textOverrides]);

  /* Acá se calculaban los "productos similares" del modal. Ahora los arma la
     página del producto, que tiene su propio bloque de relacionados. */

  /* ─ Colores base ────────────────────────────────────────────────────────────
     Aire es un template CLARO, y eso da vuelta una regla que en los oscuros se da
     por sentada: acá `T` es la TINTA (oscura) y `BG` es el PAPEL (claro).

     Importa porque cada sección deja que la dueña le cambie el fondo, y el color
     del texto se decide después con `getContrastColor`. En un template oscuro se
     escribe `=== "light" ? T : "#0a0a0a"` porque ahí T es el color claro. Copiar
     esa línea acá pinta el texto del mismo color que el papel: la sección queda
     en blanco, y no hay ningún error en la consola que lo delate.

     La forma correcta, para cuando vuelva la primera sección con fondo editable:

         const tintaSobre = (fondo: string) =>
           getContrastColor(fondo) === "light" ? "#ffffff" : T;

     Una sola función que responda la pregunta, y no se puede escribir al revés.
     Hoy no está declarada porque no la usa nadie: todas las secciones que la
     necesitaban se borraron.                                                    */
  const G  = storeConfig?.colors.accent ?? "#1f5c3d";  // acento (lo cambia la dueña)
  const BG = "#f4f4f1";  // papel
  const S  = "#ffffff";  // tarjeta
  const T  = "#14161a";  // tinta
  const T2 = "#6f7478";  // tinta suave, para lo secundario
  const LN = "#e5e5df";  // línea
  const RAD = 20;        // el radio de las tarjetas, en un solo lugar

  /* El ancho del contenido y el margen lateral, en UN solo lugar. La barra de
     arriba, el hero y la franja de categorías los comparten: si cada uno trae el
     suyo, en una pantalla ancha el hero llega casi al borde y la franja queda
     angosta y flotando en el medio, sin alinearse con nada. Los tres tienen que
     arrancar y terminar en la misma línea vertical. */
  const ANCHO  = 1360;
  const MARGEN = isMobile ? 12 : 24;

  /* El texto que va ARRIBA de un relleno pintado con el acento. Viaja en
     `cartTheme` al CartDrawer y al CheckoutModal compartidos, así que si está mal
     se rompen el carrito y el checkout enteros. `textoSobre` lo mide con el ratio
     real de WCAG en vez de adivinar. */
  const accentText = textoSobre(G);
  /* Ojo con el orden: en `CartTheme`, `BG` es el fondo del cajón y `S` el de las
     filas de adentro. Acá van cruzados a propósito —cajón blanco, filas en
     papel— para que las filas se despeguen del fondo. En un template oscuro es
     al revés, y por eso no se puede copiar la línea de uno a otro. */
  const cartTheme: CartTheme = { BG:S, S:BG, T, MID:T2, border:LN, accent:G, accentText, serif:"inherit" };

  /* ── Lo que la ficha de producto necesita para dibujarse acá adentro ────────
     El cuerpo compartido pide todo junto en un objeto. Nada de esto se calcula
     de nuevo: sale del catálogo que Aire ya tiene en memoria y del carrito que
     ya está andando, que es justamente por qué la ficha puede aparecer sin ir a
     buscar nada al servidor.
     `null` cuando no hay ficha abierta, o cuando el id de la dirección no existe
     en el catálogo — un link viejo a un producto borrado. */
  const fichaProducto = useMemo<ProductDetailViewProps | null>(() => {
    if (!enProducto) return null;
    const product = products.find(p => p.id === productoAbierto);
    if (!product) return null;
    const slug = storeConfig?.slug ?? "";
    // Falta elegir algo si alguna opción CON alternativas quedó sin responder.
    // Las de un solo valor no cuentan: ahí no hay nada que elegir.
    const canAdd = opcionesAElegir(product.opciones).every(o => !!seleccion[o.nombre]);
    const precioVariante = resolveVariantPrice(product.variants, valoresElegidos(seleccion));
    const precioMostrado = precioVariante ?? product.price;
    // Con una variante de precio propio el "antes" tachado no aplica: ese
    // comparativo es del precio base y compararlo contra otro número miente.
    const discount = !precioVariante && product.comparePrice && product.comparePrice > product.price
      ? discountPercent(product.price, product.comparePrice) : null;
    return {
      slug,
      storeName: storeConfig?.storeName ?? "",
      currency,
      whatsapp: storeConfig?.whatsapp?.enabled ? (storeConfig?.whatsapp?.number ?? null) : null,
      product,
      related: products.filter(p => p.id !== product.id && p.category === product.category).slice(0, 6),
      hasMercadoPago,
      isPreview, isOwner,
      socialLinks: storeConfig?.socialLinks,
      legales: storeConfig?.legales,
      esAutos: false,   // Aire es de ropa
      accentOverride: G,
      footerBg: undefined,   // el pie lo dibuja Aire, no el cuerpo de la ficha
      cart,
      activeImg: modalImg, setActiveImg: setModalImg,
      seleccion, setOpcion,
      canAdd, qty, setQty, addToCart,
      cartCount, toastMsg, discount,
      promo: resolveProductPromo({ id: product.id, price: precioMostrado, category: product.category }, promotions),
      catalogHref: `/tienda/${slug}/productos`,
    };
  }, [enProducto, productoAbierto, products, promotions, storeConfig, currency, hasMercadoPago,
      isPreview, isOwner, G, cart, modalImg, setModalImg, seleccion, setOpcion, qty, setQty,
      addToCart, cartCount, toastMsg]);

  const temaFicha = useMemo(() => resolveDetailTheme(temaFichaAire, G), [G]);

  /* ─ Las fotos del hero ───────────────────────────────────────────────────────
     Hasta TRES, que rotan solas, con el numerito abajo para saltar entre ellas.

     Dos reglas que parecen detalles y no lo son:

     1. Si la dueña subió aunque sea UNA foto, se muestran sólo las suyas. Las de
        ejemplo desaparecen todas juntas. La alternativa —rellenar las ranuras
        vacías con ejemplos— deja su foto rotando con dos de stock, y el editor
        le estaría mostrando una tienda que no es la suya.
     2. En la tienda publicada NO hay ejemplos. Sin ninguna foto subida queda el
        panel del acento. El template del que salió esta ranura caía en un
        `picsum.photos` fijo: la foto de un desconocido haciéndose pasar por la
        campaña de la tienda, en el lugar más visible de la página.             */
  const HERO_RANURAS = ["heroBackground", "heroBackground2", "heroBackground3"] as const;
  const HERO_DEMOS = [
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1920&q=80",
  ];
  const heroSubidas = HERO_RANURAS
    .map(campo => ({ campo, ov: storeConfig?.imageOverrides?.[campo] }))
    .filter(s => !!s.ov?.url);
  const heroSlides =
    heroSubidas.length > 0
      ? heroSubidas.map(s => ({ campo: s.campo, ov: s.ov, url: s.ov!.url! }))
      : isPreview
      ? HERO_RANURAS.map((campo, i) => ({ campo, ov: undefined, url: HERO_DEMOS[i] }))
      : [];

  /* `% length` y no el índice pelado: si la dueña borra una foto mientras el
     carrusel está en la tercera, el índice queda apuntando a una que ya no está
     y el hero se dibuja vacío hasta el próximo giro. */
  const heroIdxSeguro  = heroSlides.length > 0 ? heroIdx % heroSlides.length : 0;
  const heroActual     = heroSlides[heroIdxSeguro];
  const heroImageUrl   = heroActual?.url ?? null;
  const heroCampoActual = heroActual?.campo ?? "heroBackground";
  const heroImageOv    = heroActual?.ov;
  const heroOverlayType    = heroImageOv?.overlayType ?? "light";
  const heroOverlayOpacity = heroImageOv?.overlayOpacity ?? 0.35;
  /* No hay `heroPosX`/`heroPosY` sueltos: cada una de las tres fotos lleva SU
     propio encuadre, y se lee ahi donde se dibuja (`slide.ov?.posX`). Una sola
     posicion para las tres desencuadraba dos de cada tres. */

  /* Con velo claro el titular va en tinta; con velo oscuro, en blanco.

     SIN FOTO el panel es una tarjeta clara, no un bloque del color de la marca.
     Antes se pintaba entero con el acento, y eso reventaba en cuanto el acento
     no era discreto: una tienda con amarillo flúor abría con medio metro de
     amarillo flúor, que no es el template ni es una decisión que haya tomado
     nadie — es el relleno gritando. Y le pasa justo a la tienda que todavía no
     subió su foto de portada, o sea a la que peor le viene una primera
     impresión así.

     Ahora el acento aparece donde tiene que aparecer: la etiqueta de arriba y
     el botón. El resto es papel, como el resto del template. */
  const heroTextColor   = !heroImageUrl ? T : heroOverlayType === "light" ? T : "#ffffff";
  const heroAccentColor = !heroImageUrl ? G : heroOverlayType === "light" ? G : "#ffffff";
  const heroGradient = heroOverlayType === "none"
    ? "none"
    : heroOverlayType === "light"
    ? `linear-gradient(to right, rgba(255,255,255,${Math.min(1, heroOverlayOpacity + 0.35)}) 38%, rgba(255,255,255,${heroOverlayOpacity * 0.25}))`
    : `linear-gradient(to right, rgba(10,12,14,${Math.min(1, heroOverlayOpacity + 0.25)}) 38%, rgba(10,12,14,${heroOverlayOpacity * 0.25}))`;

  /* Aca vivia el bloque de colores por seccion: un fondo y un color de texto
     por cada bloque de la portada, que la dueña puede cambiar desde el editor.
     Se fue entero con las secciones — cada linea de ese bloque existia para
     UNA seccion, y todas se referenciaban entre si, asi que no quedaba nada
     en pie. Vuelve de a pedazos: cuando se reconstruya una seccion, se agrega
     el par que esa seccion necesita y nada mas. */

  /* Los fondos que la dueña puede cambiar por seccion, y el color de texto que
     va sobre cada uno. Vuelven de a uno, junto con la seccion que los usa.

     `tintaSobre` y no un ternario escrito a mano: en un template CLARO `T` es la
     tinta OSCURA, asi que la formula de un template oscuro —`=== "light" ? T :
     "#0a0a0a"`— pinta el texto del mismo color que el papel. La seccion queda en
     blanco y no hay error en la consola que lo delate. */
  const tintaSobre = (fondo: string) => getContrastColor(fondo) === "light" ? "#ffffff" : T;
  const scn = storeConfig?.sectionColors ?? {};
  const productosBg   = scn["bgProductos"] ?? BG;
  const productosText = tintaSobre(productosBg);
  const productosMid  = productosText === T ? T2 : "rgba(255,255,255,0.72)";
  /* La franja de categorías no tenía fondo editable: era el único bloque de la
     portada sin su botón "Fondo", así que quedaba clavada en el color del
     template mientras los de arriba y abajo se podían pintar. Se notaba
     justamente porque los vecinos sí cambian: la franja quedaba como una banda
     ajena en el medio. */
  const tiraBg   = scn["bgTira"] ?? BG;
  /* Las colecciones y el PAPEL de alrededor de la tarjeta de suscripción: los
     otros dos bloques que no tenían fondo propio. El de la tarjeta de suscripción
     es aparte (`bgNewsletter`) — son dos superficies distintas y se pintan por
     separado. */
  const coleccionesBg      = scn["bgColecciones"] ?? BG;
  const newsletterMarcoBg  = scn["bgNewsletterMarco"] ?? BG;
  const garantiasBg   = scn["bgGarantias"] ?? S;
  const garantiasText = tintaSobre(garantiasBg);
  /* ─ La pantalla de contacto ────────────────────────────────────────────────
     Blanco de fábrica, como las reseñas: es una página entera, y el papel de la
     portada ahí solo se leería como un fondo apagado sin nada que lo corte. */
  /* ─ El catálogo completo ───────────────────────────────────────────────────
     Papel y no blanco, al revés que contacto: acá lo que manda son las fotos,
     y las tarjetas son blancas. Sobre blanco no se despegarían del fondo. */
  const catalogoBg      = scn["bgCatalogo"] ?? BG;
  const catalogoText    = tintaSobre(catalogoBg);
  const catalogoMid     = catalogoText === T ? T2 : "rgba(255,255,255,0.72)";
  const catalogoTarjeta = catalogoText === T ? S : "rgba(255,255,255,0.07)";
  const catalogoBorde   = catalogoText === T ? LN : "rgba(255,255,255,0.16)";
  const contactoBg      = scn["bgContacto"] ?? S;
  const contactoText    = tintaSobre(contactoBg);
  const contactoMid     = contactoText === T ? T2 : "rgba(255,255,255,0.72)";
  const contactoTarjeta = contactoText === T ? BG : "rgba(255,255,255,0.07)";
  const contactoBorde   = contactoText === T ? LN : "rgba(255,255,255,0.16)";
  /* La foto de la pantalla de contacto: la sube la dueña, y si no subió ninguna
     queda una de ATENCIÓN — una persona, no una prenda.
     Antes acá terminaba en null: sin foto no había segunda columna y el
     formulario quedaba solo en el medio de la pantalla.
     Se probó rellenar con la foto de un producto de la tienda —el criterio que
     usan las baldosas de categorías— y queda mal: en la pantalla de escribirle a
     alguien aparecía una campera recortada sobre blanco, que es una foto de
     catálogo y no dice nada de contacto. La página de contacto habla de personas
     que responden, así que la foto tiene que ser de eso.
     Es la MISMA en el editor y en la tienda publicada: si la dueña la ve al
     acomodar su tienda, es la que va a estar cuando publique. Y está el botón
     para cambiarla por la suya —su local, su taller, ella— que es lo que
     conviene y lo que dice el panel. */
  const contactoFoto = storeConfig?.imageOverrides?.["contactoFoto"]?.url
    ?? "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1100&q=75";
  const whatsappLimpio = storeConfig?.whatsapp?.number?.replace(/\D/g, "") ?? "";
  const hayWhatsappContacto = !!storeConfig?.whatsapp?.enabled && !!whatsappLimpio;
  /* ─ Reseñas ────────────────────────────────────────────────────────────────
     BLANCO de fábrica, no papel: el bloque de arriba (las colecciones) va sobre
     el papel y el de abajo es oscuro, así que la banda blanca del medio es lo
     que separa una cosa de la otra. Las tarjetas de adentro sí van en papel,
     para que se despeguen del fondo sin necesidad de sombra. */
  const resenasBg     = scn["bgResenas"] ?? S;
  const resenasText   = tintaSobre(resenasBg);
  const resenasMid    = resenasText === T ? T2 : "rgba(255,255,255,0.72)";
  const resenaTarjeta = resenasText === T ? BG : "rgba(255,255,255,0.07)";
  const resenaBorde   = resenasText === T ? LN : "rgba(255,255,255,0.16)";
  /* ─ El bloque de suscripción ────────────────────────────────────────────────
     Es el único macizo de la página: corta el papel antes del pie. De fábrica va
     en la tinta —casi negro— y no en el acento, porque el acento ya pinta todos
     los botones y un bloque entero de ese color los deja sin destacarse.

     Acepta una FOTO de fondo, y está pensado para que una foto regular no lo
     arruine, que es el riesgo real: acá no se sube una foto de campaña, se sube
     lo que haya. Tres decisiones para eso:

       · el velo de fábrica es fuerte (0.55) y no suave, así el texto se lee
         sobre cualquier cosa desde el primer momento;
       · el velo es un DEGRADADO, más cerrado del lado del texto y más abierto
         del lado del formulario, así la foto igual se ve;
       · la foto es fondo y no protagonista, así que si mide poco se nota mucho
         menos que en una ficha de producto — donde la prenda ES la foto.

     Si la dueña baja el velo a cero, el texto puede volverse ilegible. Eso lo
     decide ella desde el mismo panel que le muestra el resultado en vivo. */
  const newsletterBgImg  = storeConfig?.imageOverrides?.["sectionbg_bgNewsletter"];
  const newsletterVelo   = newsletterBgImg?.overlayType ?? "dark";
  const newsletterVeloOp = newsletterBgImg?.overlayOpacity ?? 0.55;
  const newsletterBg     = scn["bgNewsletter"] ?? T;
  const newsletterText   = newsletterBgImg?.url
    ? (newsletterVelo === "light" ? T : "#ffffff")
    : tintaSobre(newsletterBg);
  const newsletterBorde  = newsletterText === T ? LN : "rgba(255,255,255,0.16)";
  /* ─ El pie ──────────────────────────────────────────────────────────────────
     CLARO de fábrica. El bloque de suscripción que queda justo arriba ya es
     macizo y oscuro; un pie oscuro pegado abajo se lee como una sola mancha y se
     pierde el corte entre las dos cosas. La dueña lo puede cambiar igual. */
  const footerBg    = scn["bgFooter"] ?? S;
  const footerText  = tintaSobre(footerBg);
  const footerBorde = footerText === T ? LN : "rgba(255,255,255,0.16)";

  /* El año del copyright, calculado UNA vez y fuera del dibujado. Preguntar la
     fecha mientras se dibuja hace que el mismo componente pueda dar resultados
     distintos en dos dibujados seguidos, y React lo prohíbe — es el mismo error
     que ya había cometido con "Novedades". */
  const [ANIO] = useState(() => new Date().getFullYear());

  /* Las columnas de links del pie. Una columna sin nada adentro NO se devuelve:
     una tienda que todavía no cargó sus políticas no tiene por qué mostrar un
     título "Ayuda" con el vacío debajo. */
  const columnasPie = useMemo(() => {
    const cols: { titulo: string; items: { label: string; href: string }[] }[] = [];
    const conEditor = isPreview ? "t=aire&from=editor&" : "";

    if (categoryList.length > 0) {
      cols.push({
        titulo: "Catálogo",
        // Hasta cinco. Con veinte categorías la columna se vuelve una lista
        // interminable que estira el pie más que toda la portada.
        items: categoryList.slice(0, 5).map(cat => ({
          label: cat,
          href: `/tienda/${storeConfig?.slug ?? ""}/productos?${conEditor}categoria=${encodeURIComponent(cat)}`,
        })),
      });
    }

    /* Las políticas. En el editor se muestran las cuatro aunque no estén
       publicadas —para que la dueña vea dónde van y se acuerde de cargarlas— y
       en la tienda real sólo las que publicó. Eso lo decide `linksLegales`, que
       es el mismo helper que usan el resto de los templates y el mail. */
    const legales = linksLegales(storeConfig?.slug, storeConfig?.legales, { enEditor });
    if (legales.length > 0) {
      cols.push({ titulo: "Ayuda", items: legales.map(l => ({ label: l.label, href: l.href })) });
    }

    const contacto: { label: string; href: string }[] = [];
    const wa = storeConfig?.whatsapp?.number?.replace(/\D/g, "");
    if (storeConfig?.whatsapp?.enabled && wa) {
      contacto.push({ label: "Escribinos por WhatsApp", href: `https://wa.me/${wa}` });
    }
    contacto.push({
      label: "Ver todo el catálogo",
      href: `/tienda/${storeConfig?.slug ?? ""}/productos${isPreview ? "?t=aire&from=editor" : ""}`,
    });
    cols.push({ titulo: "Contacto", items: contacto });

    return cols;
  }, [categoryList, storeConfig?.slug, storeConfig?.legales, storeConfig?.whatsapp?.enabled, storeConfig?.whatsapp?.number, isPreview, enEditor]);

  /* El velo que va sobre la foto del bloque de suscripción: más cerrado del lado
     del texto y más abierto del lado del formulario, para que la foto se vea sin
     comerse la legibilidad. */
  const newsletterVeloFondo = newsletterVelo === "none"
    ? "none"
    : newsletterVelo === "light"
    ? `linear-gradient(to right, rgba(255,255,255,${Math.min(1, newsletterVeloOp + 0.3)}) 30%, rgba(255,255,255,${newsletterVeloOp * 0.55}))`
    : `linear-gradient(to right, rgba(12,14,16,${Math.min(1, newsletterVeloOp + 0.25)}) 30%, rgba(12,14,16,${newsletterVeloOp * 0.55}))`;

  /* Cual de los tres dibujos de carrito eligio la dueña. Vivia dentro del boton
     flotante; ese boton ya no existe —el carrito subio a la barra— pero la
     opcion si, y borrarla le sacaria un ajuste que ya podia tocar. */
  const cartIconIdx = (Math.abs(parseInt(textOverrides["cartIcon"]?.text ?? "0") || 0)) % CART_ICON_OPTIONS.length;
  const nextCartIconIdx = (cartIconIdx + 1) % CART_ICON_OPTIONS.length;
  /* El carrusel del hero. Con una sola foto NO se arma el intervalo: un
     `setInterval` que cada seis segundos vuelve a poner el mismo cero fuerza
     un render de la portada entera para siempre, sin que cambie nada. */
  useEffect(() => {
    if (heroSlides.length < 2) return;
    const t = setInterval(() => setHeroIdx(i => (i + 1) % heroSlides.length), 6000);
    return () => clearInterval(t);
  }, [heroSlides.length]);

  /* La tarjeta de un producto.

     Vive acá y no adentro de la grilla porque la dibujan DOS pantallas: los seis
     de la portada y el catálogo completo. Escrita en los dos lados, el día que
     se le cambie algo —el precio tachado, la estrella, el botón de comprar— se
     cambia en uno y el otro queda distinto sin que nadie se entere.

     El `key` va adentro del cuerpo, no en quien la llama: así se puede usar
     directamente como `lista.map(tarjetaProducto)`. */
  const tarjetaProducto = (product: StorefrontProduct) => {
      const promo = resolveProductPromo(product, promotions);
      const esFav = favorites.includes(product.id);
      const agotado = product.variants.length > 0 && product.variants.reduce((n, v) => n + (v.stock || 0), 0) === 0;
      return (
        <div key={product.id} className="ai-card" onClick={() => abrirProducto(product)}
          onMouseEnter={() => setHoveredId(product.id)} onMouseLeave={() => setHoveredId(null)}
          style={{ position:"relative", background:S, border:`1px solid ${LN}`, borderRadius:16, overflow:"hidden", display:"flex", flexDirection:"column", cursor:"pointer" }}>

          {(() => {
            if (promo.primaryPromo) return <PromoTag tipo={promo.primaryPromo.type} label={describePromo(promo.primaryPromo).headline} size="sm" />;
            const enOferta = !!product.comparePrice && product.comparePrice > product.price;
            if (!enOferta) return null;
            return <OfferBadge badge={product.offerBadge} pct={discountPercent(product.price, product.comparePrice)} size="sm" />;
          })()}

          {/* ── La foto: hueco 3/4 ─────────────────────────────────────
              Medido contra el catálogo real: de las primeras 30 fotos de
              producto de las tiendas, 29 son más altas que 4:5 y ninguna
              es cuadrada. Son fotos de celular, que salen 3:4. Con un
              hueco más cuadrado se les recortaba la cabeza o los pies. */}
          <div style={{ position:"relative", aspectRatio:"4/5", overflow:"hidden", background:BG }}>
            {product.images[0] && (
              <FadeImage src={product.images[0]} alt={product.name} fill sizes="(max-width: 768px) 50vw, 200px"
                style={{ objectFit:"cover", transition:"transform 0.5s ease", transform: hoveredId === product.id ? "scale(1.05)" : "scale(1)" }}
                onError={e => { e.currentTarget.style.opacity = "0"; }}/>
            )}
            {agotado && (
              <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(12,14,16,0.78)", display:"grid", placeItems:"center", padding:"7px 0", zIndex:2 }}>
                <span style={{ color:"#fff", fontSize:9, fontWeight:800, letterSpacing:2.5, textTransform:"uppercase" }}>Sin stock</span>
              </div>
            )}
            {/* El corazón va sin círculo de fondo. Sobre una foto clara se
                perdería, así que lleva una sombra blanca en vez de una caja. */}
            <button onClick={e => { e.stopPropagation(); toggleFavorite(product.id); }}
              aria-label={esFav ? "Quitar de favoritos" : "Agregar a favoritos"}
              style={{ position:"absolute", top:9, right:9, background:"none", border:"none", padding:3, cursor:"pointer", zIndex:3, lineHeight:0, transition:"transform 0.2s", filter:"drop-shadow(0 1px 3px rgba(255,255,255,0.95))" }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.15)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill={esFav ? G : "none"} stroke={esFav ? G : T} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
          </div>

          <div style={{ padding: isMobile ? "10px 10px 10px" : "11px 12px 11px", display:"flex", flexDirection:"column", gap:2, flex:1 }}>
            {/* El nombre arriba y la categoría como bajada. Lo que el
                comprador busca en una grilla es QUÉ es la prenda; la
                categoría es la aclaración, no el título. */}
            {/* Dos renglones SIEMPRE: los reserva aunque el nombre entre en
                uno, y corta con puntos suspensivos si no entra en dos.
                Sin esto, en celular —dos columnas, nombres mas angostos—
                una tarjeta con nombre corto medía 346px y la de al lado
                364, y la fila quedaba con los precios a distinta altura. */}
            <p style={{ fontSize:11.5, color:T, margin:0, fontWeight:700, lineHeight:1.22, textTransform:"uppercase", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", minHeight:"2.44em" }}>{product.name}</p>
            <p style={{ fontSize:10.5, color:T2, margin:0, lineHeight:1.25 }}>{product.category}</p>

            {/* `minHeight` de dos renglones: los productos EN OFERTA llevan
                el precio viejo tachado abajo y los demas no, asi que en una
                fila mezclada las tarjetas quedaban con 17px de diferencia y
                los botones de carrito a distinta altura. Se reserva el
                renglon siempre, este o no. */}
            {/* El precio viejo tachado va AL LADO y no abajo. Puesto abajo
                eran 24px mas por tarjeta —144 en una fila de seis— y ademas
                obligaba a reservar el renglon en las que NO estan en oferta,
                para que la fila no quedara despareja. Al lado no hace falta
                reservar nada. */}
            <div style={{ display:"flex", alignItems:"baseline", gap:6, flexWrap:"wrap", minWidth:0, marginTop:"auto", paddingTop:7 }}>
              {ocultarPrecios ? (
                <span style={{ fontSize:13, fontWeight:800, color:T }}>Consultá precio</span>
              ) : promo.hasPriceDrop ? (
                <>
                  <span style={{ fontSize:14.5, fontWeight:800, color:"#dc2626", lineHeight:1.2 }}>{fmt(promo.effectivePrice)}</span>
                  <span style={{ fontSize:11, color:T2, textDecoration:"line-through" }}>{fmt(promo.originalPrice)}</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize:14.5, fontWeight:800, color:T, lineHeight:1.2 }}>{fmt(product.price)}</span>
                  {product.comparePrice && <span style={{ fontSize:11, color:T2, textDecoration:"line-through" }}>{fmt(product.comparePrice)}</span>}
                </>
              )}
            </div>

            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, paddingTop:6, minHeight:32 }}>
              {/* ── La estrella ─────────────────────────────────────────
                  Se dibuja SOLO si el producto tiene al menos una reseña.
                  Un producto sin puntuar no lleva "0,0 ★": ese número no
                  se lee como "todavía nadie opinó", se lee como "lo
                  puntuaron pésimo" — y sería lo que verían los 112
                  productos del catálogo hoy, porque no hay ninguna reseña
                  cargada todavía.

                  El hueco se reserva igual con `minHeight`, así una
                  tarjeta con estrella y otra sin ella miden lo mismo y la
                  grilla no queda con los botones a distinta altura. */}
              {typeof product.rating === "number" && (product.reviewCount ?? 0) > 0 ? (
                <span title={`${product.reviewCount} ${product.reviewCount === 1 ? "opinión" : "opiniones"}`}
                  style={{ display:"inline-flex", alignItems:"center", gap:4, minWidth:0 }}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="#f59e0b" aria-hidden><path d="M12 2l2.9 6.26 6.85.72-5.12 4.6 1.46 6.72L12 16.9l-6.09 3.4 1.46-6.72L2.25 8.98l6.85-.72z"/></svg>
                  <span style={{ fontSize:11.5, fontWeight:700, color:T }}>{product.rating.toFixed(1).replace(".", ",")}</span>
                  <span style={{ fontSize:11, color:T2 }}>({product.reviewCount})</span>
                </span>
              ) : <span />}

              {/* ── Comprar sin abrir la ficha ─────────────────────────
                  Si la prenda tiene talle o color, `agregarDirecto`
                  devuelve `false` y se abre la ficha para que elija: un
                  pedido sin talle no se puede despachar y arreglarlo
                  cuesta un llamado. Un clic de más sale mucho más barato. */}
              {!isInquiryMode && !agotado && (
                <button onClick={e => { e.stopPropagation(); if (!agregarDirecto(product)) abrirProducto(product); }}
                  aria-label={`Agregar ${product.name} al carrito`} title="Agregar al carrito"
                  style={{ flexShrink:0, width:32, height:32, borderRadius:9, background:BG, border:`1px solid ${LN}`, color:T, cursor:"pointer", display:"grid", placeItems:"center", transition:"background 0.18s, color 0.18s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = G; e.currentTarget.style.color = accentText; }}
                  onMouseLeave={e => { e.currentTarget.style.background = BG; e.currentTarget.style.color = T; }}>
                  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                </button>
              )}
            </div>
          </div>
        </div>
      );
  };

  return (
    <div data-aire-raiz style={{ fontFamily:"system-ui, -apple-system, 'Segoe UI', Arial, sans-serif", background:BG, color:T, minHeight:"100vh" }}>
      <style>{`
        .ai-ofertas-row { scrollbar-width:none }
        .ai-ofertas-row::-webkit-scrollbar { display:none }
        /* Las columnas de la grilla: 2 en celular, 3 en tablet, 6 en pantalla
           grande. FIJAS, y no calculadas solas con auto-fill.

           El auto-fill parece mejor hasta que uno mira cuantas quedan: entre 900
           y 1100px de ancho daba 4 y 5 columnas, y ahi ninguna cantidad de
           productos llena la ultima fila. Con 2/3/6 alcanza con mostrar de a 6
           —que es divisible por 3 y por 2— para que la ultima fila SIEMPRE quede
           completa, en cualquier pantalla. Una fila con dos productos sueltos al
           final se lee como que la pagina se corto. */
        /* Las baldosas de colecciones. Apiladas hasta 1024 y en fila a partir de
           ahi. El corte NO es el de celular (768): en tablet, tres baldosas en
           fila quedan de 231px de ancho, y ahi no entran un titulo, una bajada y
           un boton sin amontonarse. Apiladas a lo ancho se leen bien.

           La cantidad de columnas viene en --cols porque no es fija: una
           coleccion sin contenido no se dibuja, asi que pueden ser 1, 2 o 3. */
        /* El bloque de suscripcion: apilado hasta 1024, en fila a partir de ahi.
           El corte NO es el de celular (768) por la misma razon que las
           colecciones: en tablet, el formulario se lleva 370px de los 720 y al
           texto le quedan 310. Ahi el parrafo se parte en cinco renglones y el
           bloque pasa de 249px de alto a 398. Apilado entra en dos renglones. */
        /* El pie. En celular la marca va a lo ancho y las columnas de links de a
           DOS, no de a una: apiladas en una sola el pie media 820px de alto, mas
           que la portada entera, y para llegar al final habia que hacer scroll
           por una lista de once links en fila india. */
        .ai-pie { display:grid; gap:28px; grid-template-columns:1fr }
        .ai-pie-cols { display:grid; gap:24px; grid-template-columns:repeat(2,1fr) }
        @media (min-width:1024px) {
          .ai-pie { grid-template-columns:1.5fr 2.5fr; gap:40px }
          .ai-pie-cols { gap:36px; grid-template-columns:repeat(var(--cols,3),1fr) }
        }
        .ai-suscripcion { display:flex; flex-direction:column; align-items:stretch; gap:22px }
        .ai-suscripcion > :last-child { width:100% }
        @media (min-width:1024px) {
          .ai-suscripcion { flex-direction:row; align-items:center; justify-content:space-between; gap:40px }
          .ai-suscripcion > :last-child { width:370px; flex-shrink:0 }
        }
        .ai-colecciones { display:grid; gap:12px; grid-template-columns:1fr }
        .ai-colecciones > button { height:190px }
        @media (min-width:1024px) {
          .ai-colecciones { gap:14px; grid-template-columns:repeat(var(--cols,3),1fr) }
          .ai-colecciones > button { height:330px }
        }
        .ai-grilla { display:grid; gap:10px; grid-template-columns:repeat(2,1fr) }
        @media (min-width:768px)  { .ai-grilla { gap:14px; grid-template-columns:repeat(3,1fr) } }
        @media (min-width:1024px) { .ai-grilla { gap:14px; grid-template-columns:repeat(6,1fr) } }
        /* La fila de reseñas. Los cortes viven acá y no en isMobile porque el
           editor cambia el ancho del lienzo sin recargar, y isMobile se mide una
           sola vez: la fila se quedaba con las tarjetas del ancho equivocado.
           (Sin comillas invertidas: esto vive adentro de un template literal y
           una comilla invertida lo cierra a la mitad.) */
        .ai-resenas { display:flex; gap:12px; overflow-x:auto; align-items:stretch; scroll-snap-type:x mandatory; scrollbar-width:none }
        .ai-resenas::-webkit-scrollbar { display:none }
        .ai-resenas > article { flex:0 0 100%; min-width:0; display:flex; gap:10px; scroll-snap-align:start }
        @media (min-width:768px) {
          .ai-resenas { gap:14px }
          /* El alto minimo es para la FOTO: se estira al alto del texto, y con dos
             renglones quedaba una tira finita que no se leia como una foto. En
             celular no va: ahi la tarjeta es sola y un minimo la deja con un hueco
             vacio abajo. */
          .ai-resenas > article { flex-basis:calc((100% - 14px) / 2); gap:12px; min-height:200px }
        }
        /* Las dos columnas de la pantalla de contacto. En celular van apiladas y
           la foto necesita un alto propio: se dibuja con fill, que se estira al
           padre, y un padre sin alto la deja en cero. En escritorio no hace falta
           —la fila la estira al alto del formulario— y un minimo ahi la obligaria
           a ser mas alta que el formulario sin motivo. */
        /* El catalogo: filtros al costado y grilla al lado. En celular los
           filtros van arriba, plegados, y la grilla abajo. */
        .ai-catalogo { display:grid; gap:20px; grid-template-columns:1fr; align-items:start }
        @media (min-width:1024px) { .ai-catalogo { gap:32px; grid-template-columns:264px 1fr } }
        .ai-grilla-catalogo { display:grid; gap:12px; grid-template-columns:repeat(2,1fr) }
        @media (min-width:768px)  { .ai-grilla-catalogo { gap:14px; grid-template-columns:repeat(3,1fr) } }
        @media (min-width:1440px) { .ai-grilla-catalogo { grid-template-columns:repeat(4,1fr) } }
        .ai-contacto { display:grid; gap:24px; grid-template-columns:1fr }
        .ai-contacto > :last-child { min-height:280px }
        @media (min-width:1024px) {
          .ai-contacto { gap:52px; grid-template-columns:repeat(var(--cols,2),1fr); align-items:stretch }
          .ai-contacto > :last-child { min-height:0 }
        }
        /* Al saltar a una seccion desde el menu, la barra de arriba se comia sus
           primeros cien pixeles: el titulo quedaba debajo de la barra y parecia
           que el salto habia caido mal. Pasa igual con la barra fija de la tienda
           y con la pegajosa de la vista previa, asi que va siempre. */
        section[id] { scroll-margin-top: ${altoBarra + 8}px }
        .ai-tira { scrollbar-width:none }
        .ai-tira::-webkit-scrollbar { display:none }
        @keyframes ai-wa-pulse { 0% { box-shadow:0 4px 20px rgba(37,211,102,0.35), 0 0 0 0 rgba(37,211,102,0.5); } 70% { box-shadow:0 4px 20px rgba(37,211,102,0.35), 0 0 0 14px rgba(37,211,102,0); } 100% { box-shadow:0 4px 20px rgba(37,211,102,0.35), 0 0 0 0 rgba(37,211,102,0); } }
        .ai-wa-fab { background:linear-gradient(135deg,#2be374,#1fae57); animation:ai-wa-pulse 2.4s ease-out infinite; }
        .ai-wa-fab:hover { animation-play-state:paused; }
        /* ── Cómo entran los bloques al bajar ───────────────────────────────
           El reveal global (globals.css) mueve la SECCION entera 44px de una
           pieza. Acá se acorta a 26: este template respira, y un salto largo se
           lee como un tiron en vez de como algo que aparece.

           Lo que le da el aire es lo otro: las tarjetas de adentro entran DE A
           UNA, con siete centesimas entre una y la siguiente. Es la misma idea
           que el hover del template — mover poco, en el momento justo, en vez
           de pintar.

           Esta hecho con animation y NO con transition a proposito. Las
           tarjetas ya usan transform para levantarse al pasar el mouse; una
           transition sobre la misma propiedad se pelearia con esa. Con
           animation-fill-mode en backwards la animacion suelta el transform
           apenas termina y el hover queda libre.

           Antes de entrar se apaga solo la OPACIDAD, por lo mismo: tocar el
           transform ahi volveria a pisar el hover. */
        [data-reveal] { transform:translateY(26px); transition-duration:0.8s }
        @keyframes ai-entra { from { opacity:0; transform:translateY(26px) } to { opacity:1; transform:none } }
        [data-reveal]:not(.in-view) .ai-entrada > * { opacity:0 }
        [data-reveal].in-view .ai-entrada > * { animation:ai-entra 0.62s cubic-bezier(.22,1,.36,1) backwards }
        /* Los retardos van DESPUES y con el mismo prefijo que la regla de arriba,
           y no sueltos como .ai-entrada > :nth-child(2). La forma corta de
           animation reescribe animation-delay a cero, asi que una regla mas
           especifica la pisaba y las seis tarjetas entraban juntas. Medido: sin
           esto, las seis pasaban de 0 a 1 en la misma centesima. */
        [data-reveal].in-view .ai-entrada > :nth-child(2)   { animation-delay:70ms }
        [data-reveal].in-view .ai-entrada > :nth-child(3)   { animation-delay:140ms }
        [data-reveal].in-view .ai-entrada > :nth-child(4)   { animation-delay:210ms }
        [data-reveal].in-view .ai-entrada > :nth-child(5)   { animation-delay:280ms }
        [data-reveal].in-view .ai-entrada > :nth-child(6)   { animation-delay:350ms }
        /* De la septima en adelante, todas juntas. Con doce reseñas, seguir
           sumando dejaria la ultima entrando casi un segundo tarde — y para
           entonces el visitante ya paso de largo. */
        [data-reveal].in-view .ai-entrada > :nth-child(n+7) { animation-delay:420ms }
        .ai-zoom-img { transition:transform 0.6s cubic-bezier(.2,.7,.3,1); }
        .ai-zoom:hover .ai-zoom-img { transform:scale(1.05); }
        /* La tarjeta que se levanta apenas al pasar el mouse. Es TODO el efecto de
           hover del template: sin bordes que aparecen ni colores que cambian. En un
           diseño con este espacio, mover dos píxeles se nota más que pintar. */
        .ai-card { transition:transform .25s ease, box-shadow .25s ease; }
        .ai-card:hover { transform:translateY(-3px); box-shadow:0 14px 34px rgba(20,22,26,0.10); }
        @media (prefers-reduced-motion: reduce) {
          /* Nada se mueve: los bloques y las tarjetas aparecen y ya. */
          [data-reveal] { transform:none; transition:none }
          .ai-entrada > * { animation:none !important; opacity:1 !important }
          .ai-card, .ai-zoom-img { transition:none }
          .ai-card:hover { transform:none }
          .ai-wa-fab { animation:none }
        }
      `}</style>

      {/* ── BARRA DE ANUNCIOS ──────────────────────────────── */}
      {showAnnouncement && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top:0, left: isPreview ? undefined : 0, right: isPreview ? undefined : 0, zIndex: isPreview ? 10001 : 110, height:ANNOUNCEMENT_BAR_H, background:G, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:12, fontWeight:600, color:accentText, letterSpacing:0.3 }}>
            <EditableZone field="announcementText" label="Barra de anuncios" noBadge>{announcementMessages[announcementIdx]}</EditableZone>
          </span>
          <div style={{ position:"absolute", bottom:5, left:"50%", transform:"translateX(-50%)", display:"flex", gap:5 }}>
            {announcementMessages.map((_, i) => (
              <button key={i} onClick={() => setAnnouncementIdx(i)} aria-label={`Anuncio ${i + 1}`}
                style={{ width: i === announcementIdx ? 16 : 6, height:3, border:"none", borderRadius:999, background:accentText, opacity: i === announcementIdx ? 0.95 : 0.4, cursor:"pointer", padding:0, transition:"all 0.3s" }}/>
            ))}
          </div>
          <button onClick={() => setAnnouncementVisible(false)} aria-label="Cerrar anuncio"
            style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:accentText, cursor:"pointer", fontSize:16, lineHeight:1, opacity:0.75 }}>×</button>
        </div>
      )}

      {/* ── AVISO FLOTANTE ─────────────────────────────────── */}
      {toastMsg && (
        <div style={{ position:"fixed", bottom:32, left:"50%", transform:"translateX(-50%)", background:T, color:"#ffffff", padding:"13px 26px", fontSize:13.5, fontWeight:600, borderRadius:999, zIndex:CAPAS.barraAccion, maxWidth:"calc(100vw - 32px)", textAlign:"center", boxShadow:"0 12px 34px rgba(20,22,26,0.28)" }}>
          ✓ {toastMsg}
        </div>
      )}

      {/* ── BUSCADOR ───────────────────────────────────────────────────────────
          El velo va en papel y no en negro. Con un velo oscuro sobre un template
          claro, abrir el buscador apaga la tienda entera y se siente otro sitio. */}
      {searchOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:CAPAS.nav, background:"rgba(244,244,241,0.94)", backdropFilter:"blur(10px)", display:"flex", flexDirection:"column", alignItems:"center", paddingTop:110 }}>
          <button onClick={() => setSearchOpen(false)} aria-label="Cerrar búsqueda"
            style={{ position:"absolute", top:20, right:24, width:40, height:40, borderRadius:999, background:S, border:`1px solid ${LN}`, color:T, fontSize:22, cursor:"pointer", lineHeight:1, display:"grid", placeItems:"center" }}>×</button>
          <div style={{ width:"100%", maxWidth:660, padding:"0 24px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, background:S, border:`1px solid ${LN}`, borderRadius:999, padding:"6px 10px 6px 22px", boxShadow:"0 10px 30px rgba(20,22,26,0.06)" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={T2} strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/></svg>
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar productos..."
                style={{ flex:1, background:"transparent", border:"none", color:T, fontSize:17, padding:"14px 0", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}
              />
            </div>
          </div>
          {searchResults.length > 0 && (
            <div style={{ width:"100%", maxWidth:660, padding:"22px 24px 0", overflowY:"auto", maxHeight:"calc(100vh - 250px)" }}>
              <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(3,1fr)", gap:14 }}>
                {searchResults.map(p => (
                  <button key={p.id} onClick={() => abrirProducto(p)} className="ai-card"
                    style={{ background:S, border:`1px solid ${LN}`, borderRadius:RAD - 4, cursor:"pointer", textAlign:"left", padding:0, color:T, overflow:"hidden" }}>
                    <div style={{ position:"relative", width:"100%", aspectRatio:"1/1", background:BG }}>
                      {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes="(max-width: 768px) 50vw, 200px" style={{ objectFit:"cover" }}/>}
                    </div>
                    <div style={{ padding:"10px 12px 12px" }}>
                      <p style={{ fontSize:12.5, margin:"0 0 5px", fontWeight:600, lineHeight:1.3 }}>{p.name}</p>
                      <PromoPrice product={p} promotions={promotions} fmt={fmt} accent={G}
                        priceSize={13} compareSize={11} weight={800} ocultarPrecios={ocultarPrecios} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {searchQuery.trim().length > 0 && searchResults.length === 0 && (
            <p style={{ color:T2, marginTop:30, fontSize:14 }}>Sin resultados para &quot;{searchQuery}&quot;</p>
          )}
        </div>
      )}

      {/* ── BARRA DE ARRIBA ────────────────────────────────────────────────────
          Tres bloques: marca a la izquierda, links al medio, acciones a la
          derecha. Los links van al MEDIO de verdad (el bloque del centro se
          estira y centra su contenido), no empujados por el `space-between` —
          con esa cuenta, un nombre de tienda largo corría el menú a un costado y
          cada tienda tenía el menú en un lugar distinto.

          Los links se escriben como se habla: "Catálogo", no "C A T Á L O G O".
          El interletrado grande era la firma del template de lujo que este
          reemplaza, y es lo que más lo delataba aunque el fondo fuera blanco. */}
      <nav ref={barraRef} style={{ position: isPreview ? "sticky" : "fixed", top:announcementBarHeight, left: isPreview ? undefined : 0, right: isPreview ? undefined : 0, zIndex: isPreview ? 10000 : 100, transition:"border-color 0.3s", background:"rgba(255,255,255,0.94)", backdropFilter:"blur(12px)", borderBottom:`1px solid ${scrolled ? LN : "transparent"}` }}>
        {/* DOS cajas y no una: la de afuera pone el margen lateral, la de adentro
            el ancho maximo. Con las dos cosas en la misma caja el maxWidth recorta
            primero y el padding come 24px mas para adentro, asi que en un monitor
            ancho la barra arrancaba 24px corrida respecto del hero y de la franja.
            Es la misma cuenta que usan el hero, la franja y la grilla. */}
        <div style={{ padding: `0 ${MARGEN}px` }}>
        <div style={{ maxWidth:ANCHO, margin:"0 auto", height: isMobile ? 58 : 68, display:"flex", alignItems:"center", gap:16 }}>

          {/* ── La marca ── */}
          {/* minWidth 0 y sin flexShrink 0: la marca es lo unico que puede
              ceder ancho cuando no entra todo. Con flexShrink 0 un nombre de
              tienda largo empujaba los botones fuera de la pantalla en celular,
              y la pagina entera quedaba con scroll horizontal. */}
          <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
            <button onClick={() => (enContacto ? irALaPortada() : irASeccion("hero"))} aria-label="Ir al inicio"
              style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
              {/* La marca dibujada. Es geométrica y se pinta con el acento a
                  propósito: el logo que la dueña sube en Ajustes NO llega hasta
                  acá (no viaja en la config que reciben los templates), así que
                  cualquier dibujo más específico sería el logo de otra tienda. */}
              <span aria-hidden style={{ width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius:10, background:G, display:"grid", placeItems:"center", flexShrink:0 }}>
                <svg width={isMobile ? 15 : 17} height={isMobile ? 15 : 17} viewBox="0 0 24 24" fill="none" stroke={accentText} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 14h9a3 3 0 1 0-3-3"/><path d="M3 9h6"/><path d="M3 19h13a3 3 0 1 0-3-3"/>
                </svg>
              </span>
              <span style={{ display:"flex", flexDirection:"column", alignItems:"flex-start", lineHeight:1.05, maxWidth: isMobile ? 118 : 210, minWidth:0, overflow:"hidden" }}>
                <span style={{ fontSize: isMobile ? 15 : 17, fontWeight:800, letterSpacing:"-0.4px", textTransform:"uppercase", color:T, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"100%" }}>
                  <EditableZone field="storeName" label="Nombre de la tienda">{storeConfig?.storeName ?? "AIRE"}</EditableZone>
                </span>
                {!isMobile && (
                  <span style={{ fontSize:8, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:T2, marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"100%" }}>
                    <EditableZone field="navTagline" label="Bajada del logo">Tienda online</EditableZone>
                  </span>
                )}
              </span>
            </button>
            <VerifiedIconButton isVerified={storeConfig?.isVerified} info={storeConfig?.verifiedInfo} />
          </div>

          {/* ── Los links, al medio ── */}
          {!isMobile && (
            <div style={{ flex:1, display:"flex", gap:24, alignItems:"center", justifyContent:"center", minWidth:0 }}>
              {/* Lleva a la PÁGINA del catálogo, no a la grilla de la portada.
                  Antes bajaba a los seis destacados y ahí se quedaba: el link que
                  más se parece a "mostrame todo" era justo el único que no
                  llevaba a todo. Ahora los dos links del menú abren su página. */}
              <button onClick={irAlCatalogo}
                style={{ background:"none", border:"none", color: enCatalogo ? G : T, fontSize:14, cursor:"pointer", fontWeight: enCatalogo ? 700 : 500, padding:"6px 2px", fontFamily:"inherit", whiteSpace:"nowrap" }}
                onMouseEnter={e => (e.currentTarget.style.color=G)} onMouseLeave={e => (e.currentTarget.style.color = enCatalogo ? G : T)}>
                Catálogo
              </button>

              {categoryList.length > 0 && (
                <div style={{ position:"relative" }}
                  onMouseEnter={() => setHoveredNavCat("__open__")}
                  onMouseLeave={() => setHoveredNavCat(null)}>
                  <button style={{ background:"none", border:"none", color:T, fontSize:14, cursor:"pointer", fontWeight:500, display:"flex", alignItems:"center", gap:5, padding:"6px 2px", fontFamily:"inherit", whiteSpace:"nowrap" }}
                    onMouseEnter={e => (e.currentTarget.style.color=G)} onMouseLeave={e => (e.currentTarget.style.color=T)}>
                    Categorías <span style={{ fontSize:9, opacity:0.6 }}>▾</span>
                  </button>
                  {hoveredNavCat && (() => {
                    const activeCat = hoveredNavCat === "__open__" ? (categoryList[0] ?? null) : hoveredNavCat;
                    const activeSubs = activeCat ? (subcategoriesFor[activeCat] || []) : [];
                    return (
                      /* El hueco de 10px entre "Categorías" y el panel es parte del
                         menú, no aire muerto. Antes el panel arrancaba en
                         `calc(100% + 10px)`: bajando el mouse para elegir una
                         categoría se cruzaban 10px sin nada, ahí se disparaba el
                         "salió del menú" y el panel se cerraba en la cara. Nunca se
                         llegaba a tocar una categoría.
                         Ahora la caja de afuera empieza pegada al botón y separa lo
                         visible con `paddingTop`: se ve idéntico, pero el camino
                         entre el botón y las categorías está cubierto. */
                      /* Anclado a la IZQUIERDA, no centrado.
                         El panel cambia de ancho: con subcategorías son dos columnas
                         (~400px), sin ellas es una sola (~210px). Centrado, ese cambio
                         mueve TODO el panel de lugar — pasando de "camperas" (que tiene)
                         a "buzos" (que no tiene) la lista saltaba unos 95px al costado,
                         debajo del mouse, y lo que estabas por tocar se corría solo.
                         Anclado a la izquierda, el borde izquierdo queda fijo: crece y
                         se encoge sólo hacia la derecha, y la lista nunca se mueve. */
                      <div style={{ position:"absolute", top:"100%", left:0, paddingTop:10, zIndex:CAPAS.panel }}>
                      <div style={{ display:"flex", background:S, border:`1px solid ${LN}`, borderRadius:16, overflow:"hidden", boxShadow:"0 18px 44px rgba(20,22,26,0.13)" }}>
                        <div style={{ minWidth:210, padding:8, borderRight: activeSubs.length > 0 ? `1px solid ${LN}` : "none" }}>
                          {categoryList.map(cat => {
                            const subs = subcategoriesFor[cat] || [];
                            return (
                              <button key={cat}
                                onMouseEnter={() => setHoveredNavCat(cat)}
                                onClick={() => { irAlCatalogoCon(cat); setHoveredNavCat(null); }}
                                style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, width:"100%", background: activeCat===cat ? "rgba(20,22,26,0.05)" : "none", border:"none", borderRadius:10, color: activeCat===cat ? G : T, padding:"9px 12px", fontSize:13.5, fontWeight: activeCat===cat ? 700 : 500, textAlign:"left", cursor:"pointer", fontFamily:"inherit", transition:"background 0.15s" }}>
                                {cat}
                                {subs.length > 0 && <span style={{ opacity:0.45, fontSize:11 }}>›</span>}
                              </button>
                            );
                          })}
                        </div>
                        {activeSubs.length > 0 && (
                          <div style={{ minWidth:190, padding:8 }}>
                            <p style={{ margin:0, padding:"6px 12px 8px", fontSize:10, letterSpacing:1.4, textTransform:"uppercase", fontWeight:700, color:T2 }}>{activeCat}</p>
                            {activeSubs.map(sub => (
                              <button key={sub} onClick={() => { irAlCatalogoCon(activeCat ?? "Todos", sub); setHoveredNavCat(null); }}
                                style={{ display:"block", width:"100%", background:"none", border:"none", borderRadius:10, color:T, padding:"9px 12px", fontSize:13.5, textAlign:"left", cursor:"pointer", fontFamily:"inherit", transition:"background 0.15s" }}
                                onMouseEnter={e => (e.currentTarget.style.background="rgba(20,22,26,0.05)")}
                                onMouseLeave={e => (e.currentTarget.style.background="none")}>
                                {sub}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {hayGeneros && (["mujer", "hombre"] as const).map(g => (
                <button key={g} onClick={() => { changeGender(activeGender === g ? null : g); irASeccion("productos"); }}
                  style={{ background:"none", border:"none", fontSize:14, cursor:"pointer", fontWeight: activeGender===g ? 700 : 500, color: activeGender===g ? G : T, padding:"6px 2px", fontFamily:"inherit", whiteSpace:"nowrap" }}
                  onMouseEnter={e => { if (activeGender!==g) e.currentTarget.style.color=G; }}
                  onMouseLeave={e => { if (activeGender!==g) e.currentTarget.style.color=T; }}>
                  {g === "mujer" ? "Mujer" : "Hombre"}
                </button>
              ))}

              {/* "Nosotros" no está: apuntaba a una sección que se borró al
                  rediseñar el template y no hacía nada. Un link que no lleva a
                  ningún lado es peor que un link menos. */}
              <button onClick={irAContacto}
                style={{ background:"none", border:"none", color: enContacto ? G : T, fontSize:14, cursor:"pointer", fontWeight: enContacto ? 700 : 500, padding:"6px 2px", fontFamily:"inherit", whiteSpace:"nowrap" }}
                onMouseEnter={e => (e.currentTarget.style.color=G)} onMouseLeave={e => (e.currentTarget.style.color = enContacto ? G : T)}>
                Contacto
              </button>
            </div>
          )}

          {/* ── Las acciones ── */}
          <div style={{ display:"flex", alignItems:"center", gap: isMobile ? 4 : 6, flexShrink:0, marginLeft: isMobile ? "auto" : 0 }}>
            <button onClick={() => setSearchOpen(true)} aria-label="Buscar" style={{ background:"none", border:"none", color:T, cursor:"pointer", width:38, height:38, borderRadius:999, display:"grid", placeItems:"center" }}
              onMouseEnter={e => (e.currentTarget.style.background="rgba(20,22,26,0.05)")} onMouseLeave={e => (e.currentTarget.style.background="none")}>
              <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>

            {pushBell && storeConfig?.showPushBell && !isPreview && (
              <StoreFollowButton storeSlug={storeConfig?.slug ?? ""} color={T} size={19} />
            )}
            {pushBell && storeConfig?.showPushBell && !isPreview && (
              <button onClick={pushBell.openDrawer} aria-label="Novedades" style={{ position:"relative", background:"none", border:"none", color:T, cursor:"pointer", width:38, height:38, borderRadius:999, display:"grid", placeItems:"center" }}>
                <svg width={19} height={19} viewBox="0 0 24 24" fill={pushBell.followState === "following" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {pushBell.hasNew && <span style={{ position:"absolute", top:5, right:5, width:9, height:9, background:"#ef4444", borderRadius:"50%", border:"2px solid #ffffff" }} />}
              </button>
            )}
            {/* Maquetas de la campanita: solo en el editor, y solo en pantalla
                grande. En un celular de 360 estas dos son 84px que no sobran —
                empujaban el carrito fuera de la pantalla— y no hacen falta:
                sirven para que la dueña vea como queda y las puede mirar en la
                previa de escritorio. En la demo publica de /plantillas no
                aparecen nunca, porque no hay tienda que configurar. */}
            {enEditor && !isMobile && (
              <>
                <button onClick={storeConfig?.showPushBell ? undefined : storeConfig?.onPreviewBellClick}
                  title={storeConfig?.showPushBell ? "Los clientes pueden seguir tu tienda desde acá" : "🔒 Solo Plan Plus — tocá para activar"}
                  style={{ position:"relative", width:38, height:38, borderRadius:999, display:"grid", placeItems:"center", opacity: storeConfig?.showPushBell ? 0.85 : 0.38, background:"none", border:"none", color:T, cursor: storeConfig?.showPushBell ? "default" : "pointer" }}>
                  <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                  {!storeConfig?.showPushBell && <span style={{ position:"absolute", top:3, right:3, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"grid", placeItems:"center", fontSize:8, color:"#fff", fontWeight:800 }}>★</span>}
                </button>
                <button onClick={storeConfig?.onPreviewBellClick}
                  title={storeConfig?.showPushBell ? "Campanita de novedades — clic para configurar" : "🔒 Solo Plan Plus — tocá para activar"}
                  style={{ position:"relative", width:38, height:38, borderRadius:999, display:"grid", placeItems:"center", opacity: storeConfig?.showPushBell ? 0.85 : 0.38, background:"none", border:"none", color:T, cursor:"pointer" }}>
                  <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  {!storeConfig?.showPushBell && <span style={{ position:"absolute", top:3, right:3, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"grid", placeItems:"center", fontSize:8, color:"#fff", fontWeight:800 }}>★</span>}
                </button>
              </>
            )}

            {!isMobile && (
              <button onClick={() => { setFavoritesOpen(true); setUserDropdownOpen(false); setCartOpen(false); }} aria-label="Favoritos"
                style={{ background:"none", border:"none", color:T, cursor:"pointer", position:"relative", width:38, height:38, borderRadius:999, display:"grid", placeItems:"center" }}
                onMouseEnter={e => (e.currentTarget.style.background="rgba(20,22,26,0.05)")} onMouseLeave={e => (e.currentTarget.style.background="none")}>
                <svg width={19} height={19} viewBox="0 0 24 24" fill={favorites.length > 0 ? G : "none"} stroke={favorites.length > 0 ? G : "currentColor"} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {favorites.length > 0 && <span style={{ position:"absolute", top:2, right:2, background:G, color:accentText, borderRadius:999, minWidth:17, height:17, fontSize:10, fontWeight:800, display:"grid", placeItems:"center", padding:"0 4px" }}>{favorites.length}</span>}
              </button>
            )}

            {/* ── Entrar / Mi cuenta ── */}
            <div ref={userDropdownRef} style={{ position:"relative" }}>
              <button onClick={() => { setUserDropdownOpen(o => !o); setFavoritesOpen(false); }}
                aria-label="Mi cuenta"
                style={{ display:"flex", alignItems:"center", gap:8, background:S, border:`1px solid ${LN}`, borderRadius:999, color:T, cursor:"pointer", padding: isMobile ? "0" : "9px 16px 9px 13px", width: isMobile ? 38 : undefined, height: isMobile ? 38 : undefined, justifyContent:"center", fontSize:13.5, fontWeight:600, fontFamily:"inherit" }}>
                <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {!isMobile && <span style={{ whiteSpace:"nowrap", maxWidth:110, overflow:"hidden", textOverflow:"ellipsis" }}>{cargando ? "…" : logueado ? (nombreMostrado || "Mi cuenta") : "Entrar"}</span>}
              </button>
              {userDropdownOpen && (
                <div style={{ position:"absolute", top:"calc(100% + 10px)", right:0, background:S, border:`1px solid ${LN}`, borderRadius:14, padding:6, minWidth:210, zIndex:CAPAS.nav, boxShadow:"0 16px 40px rgba(20,22,26,0.14)" }}>
                  {cargando ? (<p style={{ padding:"12px 14px", margin:0, fontSize:13, color:T2 }}>Cargando…</p>) : logueado ? (
                    <>
                      <p style={{ fontSize:10.5, letterSpacing:1.4, textTransform:"uppercase", fontWeight:700, color:T2, padding:"10px 14px 6px", margin:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {nombreMostrado}
                      </p>
                      <a href={panelHref} onClick={() => setUserDropdownOpen(false)}
                        style={{ display:"block", color:T, padding:"11px 14px", fontSize:13.5, textDecoration:"none", borderRadius:10, transition:"background 0.2s" }}
                        onMouseEnter={e => (e.currentTarget.style.background="rgba(20,22,26,0.05)")}
                        onMouseLeave={e => (e.currentTarget.style.background="none")}>{panelLabel}</a>
                      <div style={{ borderTop:`1px solid ${LN}`, margin:"5px 8px" }}/>
                      <button onClick={() => { if (isPreview) return; setUserDropdownOpen(false); signOut("/"); }}
                        style={{ display:"block", width:"100%", background:"none", border:"none", borderRadius:10, color:"#dc2626", padding:"11px 14px", fontSize:13.5, textAlign:"left", cursor: isPreview ? "default" : "pointer", opacity: isPreview ? 0.45 : 1, fontFamily:"inherit", transition:"background 0.2s" }}
                        onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background="rgba(220,38,38,0.07)"; }}
                        onMouseLeave={e => (e.currentTarget.style.background="none")}>Cerrar sesión</button>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize:10.5, letterSpacing:1.4, textTransform:"uppercase", fontWeight:700, color:T2, padding:"10px 14px 6px", margin:0 }}>Mi cuenta</p>
                      {[["Iniciar sesión", `/login?redirect=/tienda/${storeConfig?.slug}`], ["Crear cuenta", `/registro?plan=buyer&redirect=/tienda/${storeConfig?.slug}`]].map(([label, href]) => (
                        <a key={label} href={isPreview ? undefined : href} onClick={() => !isPreview && setUserDropdownOpen(false)}
                          style={{ display:"block", color:T, padding:"11px 14px", fontSize:13.5, textDecoration:"none", borderRadius:10, cursor: isPreview ? "default" : "pointer", transition:"background 0.2s" }}
                          onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background="rgba(20,22,26,0.05)"; }}
                          onMouseLeave={e => (e.currentTarget.style.background="none")}>{label}</a>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── El carrito ─────────────────────────────────────────────────
                Acá, en la barra, y no flotando abajo. Es el botón que más se
                busca de toda la tienda: abajo a la izquierda compartía esquina
                con el de WhatsApp y los dos se tapaban entre sí en un celular.
                En celular queda sólo el ícono con el número: la palabra
                "Carrito" no entra sin comerse el nombre de la tienda.        */}
            {/* La caja existe para colgarle encima el cambiador de ícono del editor.
                Antes ese botón vivía ADENTRO del botón del carrito, y HTML no
                permite un botón dentro de otro: React lo marcaba como error de
                hidratación en la consola del editor. Se veía igual, pero es de esas
                cosas que un día rompen sin avisar.
                Los otros cuatro templates que tienen este mismo cambiador nunca lo
                sufrieron porque su carrito es un `<div role="button">`, que sí puede
                contener uno. Acá el carrito es un `<button>` de verdad, así que el
                cambiador se cuelga afuera y se apoya encima. */}
            <div style={{ position:"relative", display:"inline-flex" }}>
            <button onClick={() => { if (editMode) return; setCartOpen(true); setFavoritesOpen(false); setUserDropdownOpen(false); }}
              aria-label={`Carrito${cartCount > 0 ? ` (${cartCount})` : ""}`}
              style={{ position:"relative", display:"flex", alignItems:"center", gap:9, background:G, color:accentText, border:"none", borderRadius:999, cursor: editMode ? "default" : "pointer", padding: isMobile ? "0" : "10px 15px 10px 14px", width: isMobile ? 40 : undefined, height: isMobile ? 40 : undefined, justifyContent:"center", fontSize:13.5, fontWeight:700, fontFamily:"inherit", transition:"opacity 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity="0.9")} onMouseLeave={e => (e.currentTarget.style.opacity="1")}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{CART_ICON_OPTIONS[cartIconIdx]}</svg>
              {!isMobile && <span>Carrito</span>}
              <span style={{ background: isMobile ? "#ef4444" : "rgba(0,0,0,0.22)", color: isMobile ? "#fff" : accentText, borderRadius:999, minWidth:20, height:20, fontSize:11, fontWeight:800, display:"grid", placeItems:"center", padding:"0 5px", ...(isMobile ? { position:"absolute", top:-3, right:-3, minWidth:18, height:18, fontSize:10 } : {}) }}>{cartCount}</span>
            </button>
            {editMode && (
              <button onClick={e => { e.stopPropagation(); setOverride("cartIcon", { text: String(nextCartIconIdx) }); }} title="Cambiar ícono del carrito"
                style={{ position:"absolute", inset:0, background:"rgba(99,102,241,0.9)", border:"none", borderRadius:999, cursor:"pointer", display:"grid", placeItems:"center", color:"#fff", fontSize:15, opacity:0, transition:"opacity 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity="1")} onMouseLeave={e => (e.currentTarget.style.opacity="0")}>↻</button>
            )}
            </div>

            {isMobile && (
              <button onClick={() => { setMobileMenuOpen(o => !o); setMobileCatsOpen(false); setMobileOpenCat(null); }}
                aria-label="Menú" aria-expanded={mobileMenuOpen}
                style={{ background:"none", border:"none", color:T, cursor:"pointer", width:38, height:38, borderRadius:999, display:"flex", flexDirection:"column", gap:4, alignItems:"center", justifyContent:"center" }}>
                <span style={{ display:"block", width:19, height:2, borderRadius:2, background:T, transition:"all 0.3s", transform: mobileMenuOpen ? "rotate(45deg) translate(4px,4px)" : "none" }}/>
                <span style={{ display:"block", width:19, height:2, borderRadius:2, background:T, transition:"all 0.3s", opacity: mobileMenuOpen ? 0 : 1 }}/>
                <span style={{ display:"block", width:19, height:2, borderRadius:2, background:T, transition:"all 0.3s", transform: mobileMenuOpen ? "rotate(-45deg) translate(4px,-4px)" : "none" }}/>
              </button>
            )}
          </div>
        </div>
        </div>
      </nav>

      {/* El hueco que deja la barra.

          En la tienda publicada la barra de arriba y la de anuncios van `fixed`:
          se despegan de la página y no ocupan lugar. Sin esto, los ~100px que
          miden quedaban ENCIMA del contenido — el hero, el título de contacto y
          el del catálogo arrancaban tapados por una barra opaca.

          No se ve en la vista previa porque ahí las barras son `sticky` y sí
          ocupan su lugar. Por eso pasó: se probó todo en la previa.

          Va como un elemento vacío y no como `padding-top` de cada pantalla
          para que valga para las tres —y para la que venga— sin que haya que
          acordarse. */}
      {!isPreview && <div aria-hidden style={{ height: altoBarra }} />}

      {/* ── MENÚ DE CELULAR ────────────────────────────────────────────────── */}
      {isMobile && mobileMenuOpen && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top: isPreview ? 0 : 64 + announcementBarHeight, left:0, right:0, bottom:0, background:BG, zIndex:CAPAS.menuMobile, overflowY:"auto", overscrollBehavior:"contain", padding:"14px 14px 40px" }}>
          {categoryList.length > 0 && (
            <div style={{ background:S, border:`1px solid ${LN}`, borderRadius:RAD, overflow:"hidden", marginBottom:12 }}>
              <button onClick={() => setMobileCatsOpen(o => !o)}
                style={{ display:"flex", width:"100%", background:"none", border:"none", color:T, padding:"16px 18px", fontSize:15, fontWeight:700, textAlign:"left", cursor:"pointer", alignItems:"center", justifyContent:"space-between", fontFamily:"inherit" }}>
                Categorías
                <span style={{ fontSize:11, color:T2, transition:"transform 0.2s", transform: mobileCatsOpen ? "rotate(180deg)" : "none", display:"inline-block" }}>▾</span>
              </button>
              {mobileCatsOpen && categoryList.map(cat => {
                const subs = subcategoriesFor[cat] || [];
                return (
                  <Fragment key={cat}>
                    <button onClick={() => {
                      if (subs.length > 0) {
                        setMobileOpenCat(prev => prev === cat ? null : cat);
                      } else {
                        irAlCatalogoCon(cat);
                        setMobileMenuOpen(false); setMobileCatsOpen(false);
                      }
                    }} style={{ display:"flex", width:"100%", background:"none", border:"none", borderTop:`1px solid ${LN}`, color: activeCategory===cat ? G : T, padding:"14px 18px 14px 30px", fontSize:14, fontWeight:500, textAlign:"left", cursor:"pointer", alignItems:"center", justifyContent:"space-between", fontFamily:"inherit" }}>
                      {cat}
                      {subs.length > 0 && <span style={{ fontSize:13, color:T2, transition:"transform 0.2s", transform: mobileOpenCat===cat ? "rotate(90deg)" : "none", display:"inline-block" }}>›</span>}
                    </button>
                    {subs.length > 0 && mobileOpenCat === cat && subs.map(sub => (
                      <button key={sub} onClick={() => { irAlCatalogoCon(cat, sub); setMobileMenuOpen(false); setMobileCatsOpen(false); setMobileOpenCat(null); }}
                        style={{ display:"block", width:"100%", background:"rgba(20,22,26,0.02)", border:"none", borderTop:`1px solid ${LN}`, color: activeSubcategory===sub ? G : T2, padding:"12px 18px 12px 44px", fontSize:13.5, textAlign:"left", cursor:"pointer", fontFamily:"inherit" }}>
                        {sub}
                      </button>
                    ))}
                  </Fragment>
                );
              })}
            </div>
          )}

          <div style={{ background:S, border:`1px solid ${LN}`, borderRadius:RAD, overflow:"hidden" }}>
            {hayGeneros && (["mujer","hombre"] as const).map((g, i) => (
              <button key={g} onClick={() => { changeGender(activeGender===g ? null : g); irASeccion("productos"); setMobileMenuOpen(false); }}
                style={{ display:"block", width:"100%", background:"none", border:"none", borderTop: i > 0 ? `1px solid ${LN}` : "none", color: activeGender===g ? G : T, padding:"16px 18px", fontSize:15, fontWeight: activeGender===g ? 700 : 500, textAlign:"left", cursor:"pointer", fontFamily:"inherit" }}>
                {g === "mujer" ? "Mujer" : "Hombre"}
              </button>
            ))}
            {/* El catalogo completo, con su propia pantalla. El menu de celular
                no lo tenia: desde el telefono solo se llegaba por el "Ver todo"
                de la portada, que hay que ir a buscar bajando. */}
            <button onClick={() => { irAlCatalogo(); setMobileMenuOpen(false); }}
              style={{ display:"block", width:"100%", background:"none", border:"none", borderTop:`1px solid ${LN}`, color: enCatalogo ? G : T, padding:"16px 18px", fontSize:15, fontWeight: enCatalogo ? 700 : 500, textAlign:"left", cursor:"pointer", fontFamily:"inherit" }}>
              Catálogo
            </button>
            <button onClick={() => { irAContacto(); setMobileMenuOpen(false); }}
              style={{ display:"block", width:"100%", background:"none", border:"none", borderTop:`1px solid ${LN}`, color: enContacto ? G : T, padding:"16px 18px", fontSize:15, fontWeight: enContacto ? 700 : 500, textAlign:"left", cursor:"pointer", fontFamily:"inherit" }}>
              Contacto
            </button>
            <button onClick={() => { setFavoritesOpen(true); setMobileMenuOpen(false); setUserDropdownOpen(false); setCartOpen(false); }}
              style={{ display:"block", width:"100%", background:"none", border:"none", borderTop:`1px solid ${LN}`, color:T, padding:"16px 18px", fontSize:15, fontWeight:500, textAlign:"left", cursor:"pointer", fontFamily:"inherit" }}>
              Favoritos {favorites.length > 0 && <span style={{ color:G, fontWeight:800 }}>({favorites.length})</span>}
            </button>
          </div>
        </div>
      )}

      {/* La portada entera. En la pantalla de contacto no se dibuja NADA de
          esto: el hero, las secciones que la dueña reordena y la franja de
          categorías son de la portada, no de una página de contacto. Lo que sí
          queda de las dos son la barra de arriba y el pie, que están afuera. */}
      {enPortada && (<>

      {/* ── HERO ───────────────────────────────────────────────────────────────
          Una TARJETA con esquinas redondeadas y aire alrededor, no una foto a
          sangre de pantalla completa. No es decoración: una foto a sangre pide
          una foto de campaña, y cualquier otra cosa —una prenda sobre fondo
          blanco, una foto sacada con el celular— se ve estirada y descuadrada a
          ese tamaño. Dentro de una tarjeta con margen, esa misma foto queda
          contenida y se banca medir menos.                                     */}
      <section id="hero" style={{ padding: `${isMobile ? 12 : 16}px ${MARGEN}px 0` }}>
        <div style={{ position:"relative", maxWidth:ANCHO, margin:"0 auto", overflow:"hidden", borderRadius: isMobile ? RAD : RAD + 4, background: heroImageUrl ? BG : S, border: heroImageUrl ? "none" : `1px solid ${LN}`, minHeight: isMobile ? 430 : 496, display:"flex", alignItems:"center" }}>
          {/* Las fotos van TODAS montadas y se cruzan con opacidad, en vez de
              montar y desmontar la que toca. Cambiando el `src` de una sola, cada
              giro pide la imagen nueva y deja un parpadeo en blanco mientras
              carga — y en un celular con datos, ese parpadeo dura. */}
          {heroSlides.map((slide, i) => (
            <FadeImage key={slide.campo} src={slide.url} alt="" fill priority={i === 0} sizes="100vw"
              style={{ objectFit:"cover", objectPosition:`${slide.ov?.posX ?? 50}% ${slide.ov?.posY ?? 50}%`, opacity: i === heroIdxSeguro ? 1 : 0, transition:"opacity 0.7s ease" }}/>
          ))}
          {heroImageUrl && heroOverlayType !== "none" && (
            <div style={{ position:"absolute", inset:0, background:heroGradient }}/>
          )}
          <BgDragHandle imgKey={heroCampoActual} />
          <EditableImageButton field={heroCampoActual} label="Cambiar imagen"
            panelLabel={`Foto ${heroIdxSeguro + 1} del hero`}
            panelNote="El hero admite hasta tres fotos, que rotan solas. Elegí el número de abajo a la izquierda para cambiar cada una." />

          <div style={{ position:"relative", width:"100%", padding: isMobile ? "30px 20px 58px" : "44px 52px 58px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:36 }}>
            <div style={{ maxWidth:560 }}>
              <p style={{ display:"inline-block", fontSize:10.5, letterSpacing:1.8, fontWeight:700, textTransform:"uppercase", color:heroAccentColor, background: heroTextColor === T ? "rgba(255,255,255,0.78)" : "rgba(20,22,26,0.32)", padding:"8px 15px", borderRadius:999, margin:"0 0 22px" }}>
                <EditableZone field="storeTagline" label="Etiqueta del hero">{storeConfig?.storeTagline ?? "Nueva temporada"}</EditableZone>
              </p>
              {/* El titular: 3.6vw con techo en 54. Estaba en 6vw con techo en 74,
                  que en un monitor ancho se comia media tarjeta y dejaba al resto
                  del hero pareciendo vacio. En el diseño de referencia el titular
                  ocupa un tercio del alto de la tarjeta, no la mitad. */}
              <h1 style={{ fontSize:"clamp(30px,3.6vw,54px)", fontWeight:800, lineHeight:1.0, letterSpacing:"-1.4px", margin:"0 0 16px", color:heroTextColor, textTransform:"uppercase" }}>
                <EditableZone field="heroHeading" label="Título principal">Ropa que se usa todos los días</EditableZone>
              </h1>
              <p style={{ fontSize:14.5, opacity:0.82, lineHeight:1.6, marginBottom:26, maxWidth:370, color:heroTextColor }}>
                <EditableZone field="heroSubtext" label="Subtítulo hero">Prendas elegidas de a una, para que te duren más de una temporada.</EditableZone>
              </p>
              <div style={{ display:"flex", gap:18, flexWrap:"wrap", alignItems:"center" }}>
                {(editMode || !storeConfig?.textOverrides?.["heroCta"]?.hidden) && (
                  <button onClick={() => irASeccion("productos")}
                    style={{ display:"inline-flex", alignItems:"center", gap:12, background:G, color:accentText, border:"none", padding:"7px 7px 7px 22px", fontSize:13.5, fontWeight:700, borderRadius:999, cursor:"pointer", fontFamily:"inherit" }}>
                    <EditableZone field="heroCta" label="Botón principal">Ver productos</EditableZone>
                    {/* La flecha va dentro de un círculo claro y no suelta al lado:
                        es lo que le da al botón el peso de "acá se empieza". */}
                    <span aria-hidden style={{ width:32, height:32, borderRadius:"50%", background: accentText === "#fff" ? "rgba(255,255,255,0.94)" : "rgba(20,22,26,0.9)", color: accentText === "#fff" ? G : "#ffffff", display:"grid", placeItems:"center", flexShrink:0 }}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h13"/><path d="M13 6l6 6-6 6"/></svg>
                    </span>
                  </button>
                )}
                {/* El segundo botón iba a "nosotros", una sección que se borró al
                    rediseñar el template: no hacía absolutamente nada. Ahora lleva
                    a la pantalla de contacto. */}
                {(editMode || !storeConfig?.textOverrides?.["heroCtaSecondary"]?.hidden) && (
                  <button onClick={irAContacto}
                    style={{ background:"transparent", color:heroTextColor, border:"none", padding:"12px 4px", fontSize:13.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit", opacity:0.9 }}>
                    <EditableZone field="heroCtaSecondary" label="Botón secundario">Escribinos</EditableZone>
                  </button>
                )}
              </div>
            </div>

            {/* Las tres fichas al costado. Sólo en pantalla grande: en un celular
                taparían la foto entera, y lo mismo ya está en la franja de
                garantías, que en celular queda justo debajo. */}
            {!isMobile && (
              <div style={{ display:"flex", flexDirection:"column", gap:10, flexShrink:0 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:11, background:"rgba(255,255,255,0.93)", backdropFilter:"blur(8px)", borderRadius:13, padding:"11px 16px", minWidth:196, boxShadow:"0 5px 16px rgba(20,22,26,0.10)" }}>
                    <span style={{ color:G, display:"grid", placeItems:"center", flexShrink:0, width:34, height:34, borderRadius:10, background:"rgba(20,22,26,0.05)" }}>{GARANTIAS[i].svg}</span>
                    <div>
                      <p style={{ fontSize:12, fontWeight:700, color:T, margin:0, lineHeight:1.25 }}>
                        <EditableZone field={`heroFicha${i + 1}Title`} label={`Ficha ${i + 1} del hero`}>{GARANTIAS[i].title}</EditableZone>
                      </p>
                      <p style={{ fontSize:10.5, color:T2, margin:"2px 0 0", lineHeight:1.35 }}>
                        <EditableZone field={`heroFicha${i + 1}Desc`} label={`Ficha ${i + 1} del hero — detalle`}>{GARANTIAS[i].desc}</EditableZone>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 01 · 02 · 03 → ──────────────────────────────────────────────
              Números y no bolitas. Con bolitas no se sabe cuántas fotos hay
              hasta contarlas, y sobre una foto con detalle desaparecen. Con una
              sola foto no se dibuja nada: un "01" solo no es un control, es un
              adorno que dice que falta algo.                                  */}
          {heroSlides.length > 1 && (
            <div style={{ position:"absolute", left: isMobile ? 22 : 60, bottom: isMobile ? 22 : 30, display:"flex", alignItems:"center", gap:14, zIndex:2 }}>
              {heroSlides.map((_, i) => (
                <button key={i} onClick={() => setHeroIdx(i)} aria-label={`Foto ${i + 1}`}
                  aria-current={i === heroIdxSeguro}
                  style={{ background:"none", border:"none", padding:"2px 0", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight: i === heroIdxSeguro ? 800 : 600, color:heroTextColor, opacity: i === heroIdxSeguro ? 1 : 0.45, borderBottom: i === heroIdxSeguro ? `2px solid ${heroTextColor}` : "2px solid transparent", lineHeight:1.4 }}>
                  {String(i + 1).padStart(2, "0")}
                </button>
              ))}
              <button onClick={() => setHeroIdx(i => (i + 1) % heroSlides.length)} aria-label="Foto siguiente"
                style={{ background:"none", border:"none", padding:"2px 4px", cursor:"pointer", color:heroTextColor, opacity:0.7, display:"grid", placeItems:"center" }}>
                <svg width={20} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15"/><path d="M14 6l6 6-6 6"/></svg>
              </button>
            </div>
          )}
        </div>
      </section>

      <div style={{ display:"flex", flexDirection:"column" }}>

      <SectionBlock id="ai-tira" label="Franja de categorías" isPreview={isPreview} defaultOrder={AIRE_SECTION_IDS}>
      {/* ── FRANJA DE CATEGORÍAS ───────────────────────────────────────────────
          La barra blanca justo debajo del hero: una fila de categorías separadas
          por líneas verticales.

          FILTRA LA GRILLA DE ABAJO, no lleva a otra página. Es la diferencia con
          las baldosas grandes y con el desplegable del menú, que sí navegan. Si
          las tres hicieran lo mismo, dos sobrarían — y ésta es la que está mejor
          ubicada para filtrar: cae entre el hero y los productos, que es donde el
          comprador decide adónde va.

          El dibujito de cada una es la FOTO de un producto de esa categoría, no
          un ícono. Un juego de íconos fijo no le puede acertar a categorías que
          escribe cada dueña con sus palabras —"buzos", "ropa de bebé", "lo
          nuevo"—: terminarían todas con el mismo ícono genérico, que es peor que
          no tener ninguno. `fotoDesdeProductos` es el mismo helper que usan las
          baldosas grandes, así que las dos muestran la misma foto para la misma
          categoría. Sin foto queda la inicial.                                 */}
      {categoryList.length > 1 && (
      <section data-reveal style={{ background:tiraBg, position:"relative", padding: `${isMobile ? 10 : 14}px ${MARGEN}px 0` }}>
        <EditableSectionBg field="bgTira" label="Fondo de la franja de categorías" />
        <div className="ai-tira" style={{ maxWidth:ANCHO, margin:"0 auto", background:S, border:`1px solid ${LN}`, borderRadius: isMobile ? RAD - 4 : RAD, display:"flex", alignItems:"stretch", overflowX:"auto", scrollSnapType:"x proximity" }}>
          {(() => {
            const items: { clave: string; etiqueta: string; foto: string | null; activo: boolean; alTocar: () => void }[] = [
              {
                clave: "__todos__", etiqueta: "Todo", foto: null,
                activo: activeCategory === "Todos",
                alTocar: () => aplicarCategoria("Todos"),
              },
              ...categoryList.map(cat => ({
                clave: cat, etiqueta: cat, foto: fotoDesdeProductos(cat, products),
                activo: activeCategory === cat,
                alTocar: () => aplicarCategoria(cat),
              })),
            ];
            /* Filtra estando en modo edición, igual que en la tienda. Antes no: la
               franja quedaba pintada pero muerta, y como lo único que hace es
               filtrar la grilla de abajo, no había forma de ver desde el editor
               cómo queda la portada con una categoría puesta. No pisa nada
               editable —las etiquetas son las categorías de los productos, no
               textos que la dueña escriba— y se deshace tocando "Todo". */
            return items.map((it, i) => (
              <button key={it.clave} onClick={it.alTocar}
                aria-pressed={it.activo}
                style={{ flex:"1 0 auto", display:"flex", alignItems:"center", justifyContent:"center", gap:10, background: it.activo ? "rgba(20,22,26,0.05)" : "none", border:"none", borderRight: i < items.length - 1 ? `1px solid ${LN}` : "none", padding: isMobile ? "12px 15px" : "13px 18px", cursor:"pointer", fontFamily:"inherit", scrollSnapAlign:"start", transition:"background 0.18s", minWidth: isMobile ? 108 : 0, whiteSpace:"nowrap" }}
                onMouseEnter={e => { if (!it.activo) e.currentTarget.style.background="rgba(20,22,26,0.03)"; }}
                onMouseLeave={e => { if (!it.activo) e.currentTarget.style.background="none"; }}>
                <span aria-hidden style={{ width:28, height:28, borderRadius:"50%", overflow:"hidden", flexShrink:0, background: it.foto ? BG : "rgba(20,22,26,0.05)", display:"grid", placeItems:"center", position:"relative", border: it.activo ? `1.5px solid ${G}` : "none" }}>
                  {it.clave === "__todos__" ? (
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={it.activo ? G : T2} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
                  ) : it.foto ? (
                    <FadeImage src={it.foto} alt="" fill sizes="32px" style={{ objectFit:"cover" }}/>
                  ) : (
                    <span style={{ fontSize:13, fontWeight:800, color: it.activo ? G : T2, textTransform:"uppercase" }}>{it.etiqueta.slice(0, 1)}</span>
                  )}
                </span>
                <span style={{ fontSize:13, fontWeight: it.activo ? 700 : 500, color: it.activo ? G : T, overflow:"hidden", textOverflow:"ellipsis", maxWidth:150 }}>{it.etiqueta}</span>
              </button>
            ));
          })()}
        </div>
      </section>
      )}
      </SectionBlock>

      <SectionBlock id="ai-productos" label="Catálogo de productos" isPreview={isPreview} defaultOrder={AIRE_SECTION_IDS}>
      {/* ── CATÁLOGO ───────────────────────────────────────────────────────────
          La grilla. Seis tarjetas por fila en pantalla grande, dos en celular.

          Cada producto es una TARJETA blanca con borde, no una foto suelta con el
          texto debajo. Va contra lo que suele pedir un diseño de moda —una foto
          de campaña sin marco se ve mejor—, pero eso sólo es cierto si TODAS las
          fotos están recortadas igual, con el mismo fondo y la misma luz. Un
          catálogo real no es así: una prenda sobre blanco al lado de una foto
          sacada en un probador con luz amarilla, las dos sin marco, se lee como
          un error de la página. La tarjeta le da a cada foto un recuadro propio
          del mismo tamaño, y las diferencias dejan de leerse como desprolijidad. */}
      <section id="productos" data-reveal style={{ background:productosBg, position:"relative" }}>
        <EditableSectionBg field="bgProductos" label="Fondo productos" />
        {/* Dos cajas, igual que la barra y el hero: la de afuera pone el margen
            lateral, la de adentro el ancho maximo. Las dos cosas juntas en la
            misma caja dejaban la grilla 24px mas adentro que todo lo demas en un
            monitor ancho — invisible en una notebook, evidente en un monitor. */}
        <div style={{ padding: `${isMobile ? 26 : 40}px ${MARGEN}px` }}>
        <div style={{ maxWidth:ANCHO, margin:"0 auto" }}>

          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, marginBottom: isMobile ? 16 : 22 }}>
            {/* El titulo dice QUE se esta mirando. Sin esto, tocar "Ofertas" en una
                baldosa cambiaba la grilla sin decir por que: el comprador ve otros
                productos bajo el mismo titulo de siempre y no sabe si filtro algo o
                si la pagina se equivoco. */}
            <h2 style={{ fontSize: isMobile ? 17 : 21, fontWeight:800, letterSpacing:"-0.4px", color:productosText, margin:0, textTransform:"uppercase", lineHeight:1.2 }}>
              {modo
                ? (colecciones.find(c => c.id === modo)?.titulo ?? "Catálogo")
                : <EditableZone field="productsHeading" label="Título del catálogo">Elegí lo tuyo</EditableZone>}
              {!modo && activeCategory !== "Todos" && <span style={{ color:G }}> · {activeCategory}</span>}
            </h2>
            {/* El "Ver todo" y el engranaje van JUNTOS y pegados a la derecha.
                Sueltos como hermanos del `space-between`, el flex los repartía en
                tres: título a la izquierda, "Ver todo" en el MEDIO de la nada y el
                engranaje contra el borde. "Ver todo" flotando en el medio no se lee
                como el par del título ni como parte de nada. */}
            <div style={{ display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
            {modo ? (
              /* Con una coleccion elegida el link tiene que ser la SALIDA, no
                 "ver todo" a otra pagina: el comprador acaba de filtrar y lo que
                 necesita es poder deshacerlo sin irse de la portada. */
              <button onClick={() => setModo(null)}
                style={{ flexShrink:0, background:"none", border:"none", fontSize:13, fontWeight:600, color:G, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:7, whiteSpace:"nowrap", fontFamily:"inherit", padding:0 }}>
                <span aria-hidden>←</span> Volver a todo
              </button>
            ) : (
              /* Un BOTÓN, no un link. Era un `<a href>`, y un link se lleva al
                 navegador a otra página aunque todo el resto del template ya no lo
                 haga. En el editor eso era la única puerta que quedaba abierta: se
                 tocaba "Ver todo" y la dueña terminaba fuera de Diseño, con la
                 tienda publicada en pantalla. */
              <button type="button" onClick={irAlCatalogo}
                style={{ flexShrink:0, fontSize:13, fontWeight:500, color:productosMid, background:"none", border:"none", padding:0, fontFamily:"inherit", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:7, whiteSpace:"nowrap" }}
                onMouseEnter={e => (e.currentTarget.style.color = G)}
                onMouseLeave={e => (e.currentTarget.style.color = productosMid)}>
                Ver todo <span aria-hidden>→</span>
              </button>
            )}
            {/* El engranaje para elegir QUÉ productos van acá. Sólo en edición, y
                pegado al "Ver todo" porque es la misma esquina donde ya se mira
                este bloque. Con una colección puesta no aparece: ahí la grilla la
                está eligiendo la colección, y dos criterios a la vez no se
                entienden. */}
            {!modo && <BotonVitrina products={products} cuantos={EN_PORTADA} acento={G} />}
            </div>
          </div>

          {loadingProducts && (
            <p style={{ textAlign:"center", padding:"50px 0", color:productosMid, fontSize:14.5, margin:0 }}>Cargando productos…</p>
          )}

          {!loadingProducts && allFiltered.length === 0 && (
            <p style={{ textAlign:"center", padding:"50px 0", color:productosMid, fontSize:14.5, margin:0 }}>
              {activeCategory === "Todos" ? "Todavía no hay productos cargados." : `No hay nada en "${activeCategory}" por ahora.`}
            </p>
          )}

          {/* `minmax(190px,1fr)` da seis columnas en un monitor ancho y baja solo a
              cinco, cuatro y tres al angostarse. Con un `repeat(6,1fr)` fijo, en
              una notebook las tarjetas quedaban de 150px y la foto ilegible. */}
          <div className="ai-grilla ai-entrada">
            {!loadingProducts && filtered.map(tarjetaProducto)}
          </div>

          {/* Acá NO va un "Ver más". La portada muestra una fila y listo; para el
              resto está "Ver todo", arriba a la derecha, que lleva al catálogo
              completo. Tener los dos es ofrecer dos caminos para lo mismo, y el de
              "Ver más" es el peor de los dos: alarga la portada sin llevar a
              ningún lado. */}
        </div>
        </div>
      </section>
      </SectionBlock>

      <SectionBlock id="ai-garantias" label="Garantías" isPreview={isPreview} defaultOrder={AIRE_SECTION_IDS}>
      {/* ── GARANTÍAS ──────────────────────────────────────────────────────────
          Las cuatro razones para comprar acá, en una tarjeta propia debajo del
          catálogo. Va en tarjeta y no como franja a todo lo ancho porque sobre
          papel claro una franja sin borde no se despega del fondo, y las cuatro
          cosas se leen como texto suelto en vez de como un bloque.              */}
      <section data-reveal style={{ background:BG, position:"relative", padding: `${isMobile ? 4 : 6}px ${MARGEN}px ${isMobile ? 26 : 34}px` }}>
        <EditableSectionBg field="bgGarantias" label="Fondo garantías" />
        <div className="ai-entrada" style={{ maxWidth:ANCHO, margin:"0 auto", background:garantiasBg, border:`1px solid ${LN}`, borderRadius:16, display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", overflow:"hidden" }}>
          {GARANTIAS.map((g, i) => {
            const iconIdx = (Math.abs(parseInt(textOverrides[`garantia${i+1}Icon`]?.text ?? "0") || 0)) % AIRE_STRIP_ICONS[i].length;
            const proximoIdx = (iconIdx + 1) % AIRE_STRIP_ICONS[i].length;
            /* En celular son dos columnas, así que la única línea que queda es la
               que separa las dos FILAS. En escritorio no hay ninguna: los cuatro
               se separan solos con el espacio, y una línea vertical hacía que la
               barra se leyera como una tabla. */
            const bordeAbajo = isMobile && i < 2;
            return (
              <div key={i} style={{ padding: isMobile ? "15px 13px" : "20px 22px", display:"flex", alignItems:"center", gap:13, borderBottom: bordeAbajo ? `1px solid ${LN}` : "none" }}>
                <span style={{ color:G, flexShrink:0, position:"relative", width:42, height:42, borderRadius:12, background: garantiasText === T ? "rgba(20,22,26,0.05)" : "rgba(255,255,255,0.12)", display:"grid", placeItems:"center" }}>
                  {AIRE_STRIP_ICONS[i][iconIdx]}
                  {editMode && (
                    <button onClick={() => setOverride(`garantia${i+1}Icon`, { text: String(proximoIdx) })} title="Cambiar ícono"
                      style={{ position:"absolute", inset:0, background:"rgba(99,102,241,0.9)", border:"none", borderRadius:12, cursor:"pointer", display:"grid", placeItems:"center", color:"#fff", fontSize:13, opacity:0, transition:"opacity 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = "1")} onMouseLeave={e => (e.currentTarget.style.opacity = "0")}>↻</button>
                  )}
                </span>
                <div style={{ minWidth:0 }}>
                  <p style={{ fontSize:12.5, fontWeight:700, color:garantiasText, margin:"0 0 3px", lineHeight:1.25 }}>
                    <EditableZone field={`garantia${i+1}Title`} label={`Título garantía ${i+1}`}>{g.title}</EditableZone>
                  </p>
                  <p style={{ fontSize:11, opacity:0.62, margin:0, lineHeight:1.4, color:garantiasText }}>
                    <EditableZone field={`garantia${i+1}Desc`} label={`Descripción garantía ${i+1}`}>{g.desc}</EditableZone>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      </SectionBlock>

      <SectionBlock id="ai-destacados" label="Colecciones" isPreview={isPreview} defaultOrder={AIRE_SECTION_IDS}>
      {/* ── COLECCIONES ────────────────────────────────────────────────────────
          Las baldosas grandes con foto. NO son categorías: las categorías ya
          están en la franja de arriba y en el menú, y ponerlas acá sería el mismo
          destino por tercera vez. Son las tres colecciones que el catálogo arma
          solo — lo que está en oferta, lo que más miran, lo último que entró.

          Filtran la grilla de arriba, no llevan a otra página. Es lo mismo que
          hace la franja, así que las dos formas de mirar el catálogo se comportan
          igual y el comprador no tiene que aprender dos.

          La FOTO sale de un producto de esa misma colección. No hay una foto de
          "Ofertas" que se pueda inventar, y una de stock sería la foto de un
          desconocido presentando la oferta de la tienda. Si ningún producto de la
          colección tiene foto, queda el panel del acento con el nombre grande. */}
      {colecciones.length > 0 && (
      <section data-reveal style={{ background:coleccionesBg, position:"relative", padding: `${isMobile ? 8 : 12}px ${MARGEN}px ${isMobile ? 26 : 36}px` }}>
        <EditableSectionBg field="bgColecciones" label="Fondo de las colecciones" />
        <div className="ai-colecciones ai-entrada" style={{ maxWidth:ANCHO, margin:"0 auto", ["--cols" as string]: colecciones.length }}>
          {colecciones.map(c => {
            const foto = c.lista.find(prod => prod.images[0])?.images[0] ?? null;
            /* Las baldosas ya NO son un interruptor: llevan al catálogo. `elegida`
               marcaba cuál estaba filtrando la grilla de la portada, y esa grilla no
               se filtra más desde acá — llegando a la portada `modo` está siempre en
               nada, así que era una marca que no se encendía nunca. Cuál colección
               está puesta ahora se ve en el catálogo, que es donde se aterriza. */
            return (
              <button key={c.id} className="ai-zoom ai-card"
                onClick={() => {
                  /* Acá había un `if (editMode) return`, y era el mismo agujero que
                     tenía `irA`: editando, las tres baldosas no hacían NADA. La
                     pantalla a la que llevan —el catálogo mostrando esa colección—
                     quedaba imposible de mirar y de acomodar desde el editor.
                     Y no hay nada que editar en la baldosa misma que el clic pueda
                     pisar: el título y la bajada los arma el template a partir de
                     los productos, no son textos que la dueña escriba. */
                  setModo(c.id);
                  setActiveCategory("Todos");
                  setActiveSubcategory(null);
                  /* Al CATÁLOGO, no a la grilla de la portada.
                     Antes filtraba la grilla de arriba, y esa grilla muestra SEIS
                     productos. Una tienda con cuarenta cosas en oferta abría
                     "Ofertas" y veía seis: la baldosa prometía una colección y
                     entregaba una muestra, sin decir que había más.
                     Llevar al catálogo dejó de tener costo desde que el catálogo
                     abre en el lugar: no se cambia de página, no parpadea, y allá
                     entran todos con "Ver más" y con los filtros al costado. */
                  irAlCatalogo();
                }}
                style={{ position:"relative", overflow:"hidden", borderRadius:RAD, background: foto ? BG : G, border: `1px solid ${LN}`, cursor:"pointer", padding:0, textAlign:"left", display:"block" }}>
                {foto && <FadeImage className="ai-zoom-img" src={foto} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit:"cover" }}/>}
                {/* El velo va SOLO si hay foto: sobre el panel del acento dejaba una
                    mancha oscura en la mitad de abajo, sin nada que oscurecer. */}
                {foto && <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(12,14,16,0.82) 0%, rgba(12,14,16,0.28) 45%, transparent 72%)", pointerEvents:"none" }}/>}
                <div style={{ position:"absolute", left:0, right:0, bottom:0, padding: isMobile ? "16px 18px" : "20px 20px" }}>
                  <p style={{ fontSize: isMobile ? 18 : 20, fontWeight:800, letterSpacing:"-0.4px", color: foto ? "#ffffff" : accentText, margin:0, textTransform:"uppercase", lineHeight:1.1 }}>{c.titulo}</p>
                  <p style={{ fontSize:12, color: foto ? "rgba(255,255,255,0.82)" : accentText, opacity: foto ? 1 : 0.85, margin:"6px 0 0", lineHeight:1.35 }}>{c.bajada}</p>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:7, marginTop:14, fontSize:12.5, fontWeight:700, padding:"9px 15px", borderRadius:999, background: foto ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.18)", color: foto ? T : accentText }}>
                    Ver <span aria-hidden>→</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
      )}
      </SectionBlock>

      <SectionBlock id="ai-resenas" label="Reseñas" isPreview={isPreview} defaultOrder={AIRE_SECTION_IDS}
        avisoAlOcultar="Si lo ocultás, tus clientes dejan de poder opinar sobre la TIENDA: el botón para dejar una opinión vive adentro de este bloque. Las reseñas de cada producto siguen funcionando desde su ficha. Las que ya tenés no se borran, pero dejan de verse.">
      {/* ── RESEÑAS ────────────────────────────────────────────────────────────
          Una fila que se corre con flechas: dos tarjetas a la vista en pantalla
          grande, una en celular.

          Se muestran de a pocas y no todas en una grilla a propósito. Una grilla
          de nueve testimonios se lee como un muro publicitario y se saltea
          entera; dos tarjetas grandes, con la foto de la prenda al lado, se leen.

          La FOTO es la del producto reseñado, no la cara de quien escribió: no
          tenemos fotos de los compradores, y ponerle un retrato de banco de
          imágenes a un testimonio real es inventarle una persona. La prenda sí es
          verdad, y además es lo que quiere ver el que está leyendo.

          El bloque se dibuja SIEMPRE, aunque no haya ni una reseña: adentro está
          el botón para dejar la primera. Escondido cuando está vacío, una tienda
          nueva no tendría nunca de dónde arrancar. Lo que cambia con cero es el
          texto — deja de afirmar que los clientes dicen algo y pasa a invitar. */}
      <section data-reveal style={{ background:resenasBg, position:"relative" }}>
        <EditableSectionBg field="bgResenas" label="Fondo reseñas" />
        {/* Dos cajas, igual que el resto: la de afuera pone el margen lateral, la
            de adentro el ancho máximo. Las dos cosas en la misma caja dejan el
            bloque 24px más adentro que la barra y la grilla en un monitor ancho. */}
        <div style={{ padding: `${isMobile ? 28 : 42}px ${MARGEN}px` }}>
        <div style={{ maxWidth:ANCHO, margin:"0 auto" }}>

          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, marginBottom: isMobile ? 16 : 22 }}>
            <div style={{ minWidth:0 }}>
              <h2 style={{ fontSize: isMobile ? 17 : 21, fontWeight:800, letterSpacing:"-0.4px", color:resenasText, margin:0, textTransform:"uppercase", lineHeight:1.2 }}>
                {resenas.sinNada
                  ? "¿Ya compraste? Contanos"
                  : <EditableZone field="reviewsHeading" label="Título de reseñas">Lo que dicen</EditableZone>}
              </h2>
              {/* El promedio sale del hook y no de un número escrito al lado que
                  hay que acordarse de cambiar. En el editor es el de los
                  ejemplos; en la tienda publicada, el de la base. */}
              {!resenas.sinNada && resenas.totalMostrado > 0 && (
                <p style={{ margin:"7px 0 0", fontSize:13, color:resenasMid, display:"flex", alignItems:"center", gap:7 }}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="#f59e0b" aria-hidden><path d="M12 2l2.9 6.26 6.85.72-5.12 4.6 1.46 6.72L12 16.9l-6.09 3.4 1.46-6.72L2.25 8.98l6.85-.72z"/></svg>
                  <strong style={{ color:resenasText, fontWeight:700 }}>{resenas.promedioMostrado.toFixed(1).replace(".", ",")}</strong>
                  · {resenas.totalMostrado} {resenas.totalMostrado === 1 ? "opinión" : "opiniones"}
                </p>
              )}
            </div>

            {/* Las flechas. Sólo si hay más de lo que entra: con dos tarjetas en
                una pantalla que muestra dos, son dos botones que no hacen nada. */}
            {(puedeIzq || puedeDer) && (
              <div style={{ display:"flex", gap:9, flexShrink:0 }}>
                {([[-1, "Anterior", puedeIzq, "M15 18l-6-6 6-6"], [1, "Siguiente", puedeDer, "M9 18l6-6-6-6"]] as const).map(([dir, nombre, activa, d]) => (
                  <button key={nombre} type="button" onClick={() => moverResenas(dir)} disabled={!activa} aria-label={nombre}
                    style={{ width:44, height:44, borderRadius:"50%", background: activa ? S : "transparent", border:`1px solid ${resenaBorde}`, color:resenasText, cursor: activa ? "pointer" : "default", opacity: activa ? 1 : 0.3, display:"grid", placeItems:"center", padding:0, transition:"all 0.2s" }}
                    onMouseEnter={e => { if (activa) { e.currentTarget.style.background = G; e.currentTarget.style.color = accentText; e.currentTarget.style.borderColor = G; } }}
                    onMouseLeave={e => { e.currentTarget.style.background = activa ? S : "transparent"; e.currentTarget.style.color = resenasText; e.currentTarget.style.borderColor = resenaBorde; }}>
                    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Cuando no hay ninguna ── */}
          {tarjetasResena.length === 0 ? (
            <div style={{ background:resenaTarjeta, border:`1px solid ${resenaBorde}`, borderRadius:RAD, padding: isMobile ? "26px 20px" : "34px 30px", textAlign:"center" }}>
              <p style={{ margin:0, fontSize: isMobile ? 14 : 15, color:resenasText, lineHeight:1.6, fontWeight:600 }}>
                Todavía nadie dejó su opinión.
              </p>
              <p style={{ margin:"8px auto 0", fontSize:13, color:resenasMid, lineHeight:1.6, maxWidth:420 }}>
                Si ya compraste, contá cómo te fue. Es lo primero que mira quien
                está por comprar acá por primera vez.
              </p>
            </div>
          ) : (
            <div className="ai-resenas ai-entrada" ref={pistaResenas}>
              {tarjetasResena.map(r => {
                const foto = r.product?.image ?? null;
                // El producto REAL del catálogo, para poder abrir la ficha desde
                // la foto. Puede no estar: una reseña sobrevive al producto si el
                // dueño lo despublica, y ahí la tarjeta se queda sin adónde ir.
                const prodReal = r.product ? products.find(p => p.id === r.product!.id) : undefined;
                const inicial = r.reviewer.trim().charAt(0).toUpperCase() || "?";
                return (
                  <article key={r.id}>
                    {foto ? (
                      <div onClick={() => prodReal && abrirProducto(prodReal)}
                        title={prodReal ? r.product?.name : undefined}
                        style={{ position:"relative", flexShrink:0, width: isMobile ? 104 : 168, borderRadius:RAD, overflow:"hidden", background:BG, cursor: prodReal ? "pointer" : "default" }}>
                        <FadeImage src={foto} alt={r.product?.name ?? ""} fill sizes="180px" style={{ objectFit:"cover" }}/>
                      </div>
                    ) : (
                      /* Una reseña de la TIENDA no habla de ningún producto, así
                         que no hay foto que poner sin inventarla — y ponerle la de
                         una prenda cualquiera sería hacerle decir algo que no dijo.

                         El hueco tampoco servía: al lado de una tarjeta con foto se
                         lee como una imagen que no cargó. Va el panel de la marca,
                         que llena el lugar y además DICE de qué tipo es la reseña.
                         Así se distingue de un vistazo cuál habla de una prenda y
                         cuál de cómo fue comprar acá. */
                      <div style={{ flexShrink:0, width: isMobile ? 104 : 168, borderRadius:RAD, background:G, color:accentText, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, padding:12, textAlign:"center" }}>
                        <svg aria-hidden width={isMobile ? 26 : 34} height={isMobile ? 26 : 34} viewBox="0 0 24 24" fill="none" stroke={accentText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 14h9a3 3 0 1 0-3-3"/><path d="M3 9h6"/><path d="M3 19h13a3 3 0 1 0-3-3"/>
                        </svg>
                        <span style={{ fontSize: isMobile ? 9.5 : 10.5, fontWeight:700, letterSpacing:0.7, textTransform:"uppercase", lineHeight:1.35, opacity:0.92 }}>
                          Sobre la tienda
                        </span>
                      </div>
                    )}
                    <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", background:resenaTarjeta, border:`1px solid ${resenaBorde}`, borderRadius:RAD, padding: isMobile ? "18px 18px" : "24px 26px" }}>
                      <ResenaComentario
                        texto={r.comment ?? ""}
                        acento={G}
                        lineas={isMobile ? 5 : 4}
                        estiloTexto={{ fontSize: isMobile ? 13.5 : 15, lineHeight:1.65, color:resenasText, fontWeight:500 }}
                        textoBoton={{ desplegar: "Leer todo", irA: "Ver la reseña →" }}
                      />

                      <div style={{ display:"flex", alignItems:"center", gap:11, marginTop:18 }}>
                        {/* La inicial en un círculo, no un retrato inventado. */}
                        <span aria-hidden style={{ flexShrink:0, width:38, height:38, borderRadius:"50%", background:G, color:accentText, display:"grid", placeItems:"center", fontSize:15, fontWeight:800 }}>
                          {inicial}
                        </span>
                        <div style={{ minWidth:0, flex:1 }}>
                          <p style={{ margin:0, fontSize:13.5, fontWeight:700, color:resenasText, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                            {r.reviewer}
                            {r.verified && (
                              <span title="Compra verificada" style={{ marginLeft:6, color:G, fontSize:12 }}>✓</span>
                            )}
                          </p>
                          <div style={{ display:"flex", alignItems:"center", gap:1, marginTop:3 }} aria-label={`${r.rating} de 5`}>
                            {[1,2,3,4,5].map(s => (
                              <svg key={s} width={12} height={12} viewBox="0 0 24 24" fill={s <= r.rating ? "#f59e0b" : (resenasText === T ? "rgba(20,22,26,0.15)" : "rgba(255,255,255,0.2)")} aria-hidden>
                                <path d="M12 2l2.9 6.26 6.85.72-5.12 4.6 1.46 6.72L12 16.9l-6.09 3.4 1.46-6.72L2.25 8.98l6.85-.72z"/>
                              </svg>
                            ))}
                          </div>
                        </div>
                        {/* Borrar: sólo el dueño, y sólo en la tienda de verdad —
                            en el editor las reseñas son de ejemplo y el botón
                            estaría ofreciendo borrar algo que no existe. */}
                        {isOwner && !isPreview && (
                          <button type="button" onClick={() => resenas.borrar(r.id)} title="Eliminar reseña"
                            style={{ flexShrink:0, width:30, height:30, borderRadius:"50%", background:"none", border:`1px solid ${resenaBorde}`, color:resenasMid, cursor:"pointer", display:"grid", placeItems:"center", padding:0, fontSize:14, lineHeight:1 }}>
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* ── Dejar la propia ──────────────────────────────────────────────
              Va abajo y no arriba: primero se lee lo que dijeron los demás y
              recién después aparece la invitación. Es el único lugar de toda la
              tienda desde donde se puede dejar una reseña de la TIENDA — las de
              producto se dejan en la ficha—, así que no se puede esconder. */}
          <div style={{ marginTop: isMobile ? 18 : 22, display:"flex", alignItems:"center", justifyContent:"center", gap:10, flexWrap:"wrap" }}>
            <button type="button" onClick={resenas.abrirModal}
              style={{ background: resenaVacia ? G : "transparent", color: resenaVacia ? accentText : resenasText, border:`1px solid ${resenaVacia ? G : resenaBorde}`, borderRadius:999, padding:"12px 26px", fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = G; e.currentTarget.style.color = accentText; e.currentTarget.style.borderColor = G; }}
              onMouseLeave={e => { e.currentTarget.style.background = resenaVacia ? G : "transparent"; e.currentTarget.style.color = resenaVacia ? accentText : resenasText; e.currentTarget.style.borderColor = resenaVacia ? G : resenaBorde; }}>
              Dejá tu opinión
            </button>
          </div>

          {/* El cartel del editor. Le dice a la dueña qué va a ver la gente en su
              tienda publicada, que no es lo que está viendo ella acá. */}
          {enEditor && (
            <div style={{ marginTop:14, display:"flex", gap:9, padding:"11px 14px", background:"rgba(245,158,11,0.10)", border:"1px solid rgba(245,158,11,0.30)", borderRadius:12 }}>
              <span aria-hidden style={{ flexShrink:0, fontSize:13, lineHeight:1.5 }}>⚠️</span>
              <p style={{ margin:0, fontSize:12, color:resenasText, opacity:0.85, lineHeight:1.6 }}>
                {resenas.totalReal === 0
                  ? <><strong>Estas reseñas son de ejemplo.</strong> Tu tienda todavía no tiene ninguna: están para que veas cómo queda el bloque lleno. No se publican, y desaparecen solas en cuanto llegue la primera de verdad.</>
                  : <>Hoy tenés <strong>{resenas.totalReal} {resenas.totalReal === 1 ? "reseña" : "reseñas"}</strong> y {resenas.enPortadaReal === 1 ? "aparece" : "aparecen"} <strong>{resenas.enPortadaReal}</strong> acá: las de 4★ y 5★ con comentario, más las de tu tienda que hayas aprobado. Las que ves ahora son de ejemplo.</>}
              </p>
            </div>
          )}

        </div>
        </div>
      </section>
      </SectionBlock>

      <SectionBlock id="ai-newsletter" label="Suscripción" isPreview={isPreview} defaultOrder={AIRE_SECTION_IDS}>
      {/* ── SUSCRIPCIÓN ────────────────────────────────────────────────────────
          El bloque ancho antes del pie: texto a la izquierda, formulario a la
          derecha.

          En el diseño de referencia acá va un "club de socios" con una tarjeta
          dibujada y cuatro promesas: 5% de cashback, acceso anticipado,
          descuentos exclusivos y regalo de cumpleaños. Nada de eso existe en la
          plataforma — no hay saldo que acumular ni forma de canjearlo, y el
          comerciante no tiene dónde verlo. Dibujarlo sería prometerle al
          comprador algo que nadie le puede dar, en el bloque más grande de la
          página.

          Queda el mismo lugar y el mismo peso visual, con lo único que sí
          funciona de punta a punta: dejar el mail para enterarse de las ofertas.
          El formulario es el compartido, que ya trae la validación, el captcha,
          el candado del doble click y la confirmación por mail.

          Y no se dibuja la tarjeta de socio: parecía una tarjeta física.       */}
      {/* DOS fondos, y son dos cosas distintas: la TARJETA negra y el PAPEL que
          queda alrededor. El de la tarjeta ya estaba (adentro, con su foto y su
          velo); el de alrededor no existía, así que la franja de papel a los
          costados quedaba clavada en el color del template mientras la tarjeta se
          podía pintar de cualquier cosa. Con la tarjeta en un color y el papel en
          otro no había forma de acordarlos. */}
      <section data-reveal style={{ background:newsletterMarcoBg, position:"relative", padding: `${isMobile ? 4 : 6}px ${MARGEN}px ${isMobile ? 26 : 38}px` }}>
        <EditableSectionBg field="bgNewsletterMarco" label="Fondo alrededor de la tarjeta" />
        <BgDragHandle imgKey="sectionbg_bgNewsletter" />
        <div style={{ position:"relative", overflow:"hidden", maxWidth:ANCHO, margin:"0 auto", background:newsletterBg, borderRadius:RAD }}>
          {newsletterBgImg?.url && (
            <>
              <FadeImage src={newsletterBgImg.url} alt="" fill sizes="100vw"
                style={{ objectFit:"cover", objectPosition:`${newsletterBgImg.posX ?? 50}% ${newsletterBgImg.posY ?? 50}%` }}/>
              {newsletterVelo !== "none" && <div style={{ position:"absolute", inset:0, background:newsletterVeloFondo, pointerEvents:"none" }}/>}
            </>
          )}
          <EditableSectionBg field="bgNewsletter" label="Fondo de la suscripción" />
          <div className="ai-suscripcion" style={{ position:"relative", padding: isMobile ? "28px 22px" : "40px 44px" }}>

          {/* TODO el texto cuelga de este borde izquierdo: título, explicación y
              letra chica. Repartido en las dos columnas quedaban dos textos
              chiquitos con dos alineaciones distintas debajo del mismo input. */}
          <div style={{ flex:1, minWidth:0, maxWidth: isMobile ? undefined : 560 }}>
            <h2 style={{ fontSize: isMobile ? 21 : 28, fontWeight:800, letterSpacing:"-0.8px", color:newsletterText, margin:0, lineHeight:1.12, textTransform:"uppercase" }}>
              <EditableZone field="newsletterHeading" label="Título de la suscripción">Enterate antes que nadie</EditableZone>
            </h2>
            <p style={{ fontSize: isMobile ? 14 : 15, color:newsletterText, opacity:0.8, margin:"12px 0 0", lineHeight:1.55, maxWidth:460 }}>
              <EditableZone field="newsletterText" label="Texto de la suscripción">Dejanos tu mail y te avisamos cuando entren cosas nuevas o haya una oferta. Sin spam, y te podés dar de baja cuando quieras.</EditableZone>
            </p>
            <p style={{ fontSize:11.5, color:newsletterText, opacity:0.52, margin:"10px 0 0", lineHeight:1.45 }}>
              Te llega un mail para confirmar. Suscribirse es gratis.
            </p>
          </div>

          <div style={{ maxWidth:"100%" }}>
            <NewsletterForm
              slug={storeConfig?.slug}
              isPreview={isPreview}
              placeholder="tu@email.com"
              boton="Suscribirme"
              theme={{
                /* El input y el botón viajan pegados dentro de una cápsula, como
                   el buscador. `overflow:hidden` recorta las esquinas cuadradas
                   del input contra el radio de la cápsula. */
                form: { display:"flex", gap:0, background:S, borderRadius:999, padding:4, border:`1px solid ${newsletterBorde}`, overflow:"hidden" },
                input: { flex:1, minWidth:0, border:"none", outline:"none", background:"transparent", color:T, fontSize:14, padding:"12px 8px 12px 18px", fontFamily:"inherit" },
                boton: { flexShrink:0, background:G, color:accentText, border:"none", borderRadius:999, padding:"12px 22px", fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" },
                colorMensaje: newsletterText,
                colorError: "#dc2626",
              }}
            />
          </div>
          </div>
        </div>
      </section>
      </SectionBlock>

      {/* Cierra el contenedor de las secciones reordenables. Las cinco —franja,
          catalogo, garantias, colecciones y suscripcion— tienen que ser HERMANAS
          dentro de este mismo div: SectionBlock las reordena con el `order` de
          flexbox, que solo compara hermanos. Una seccion que quede afuera se ve,
          pero no se puede mover ni apagar. */}
      </div>

      </>)}

      {/* ── PANTALLA DE CONTACTO ───────────────────────────────────────────────
          Es una PÁGINA aparte, no un bloque más de la portada. Tiene su propia
          dirección (/tienda/xxx/contacto), su propio título de pestaña y se
          puede compartir sola.

          Un formulario de contacto abajo de todo, después de las reseñas y de la
          suscripción, es lo último que ve alguien que bajó hasta el final — y
          quien quiere escribir no baja: busca "Contacto" arriba. Sacándolo de la
          portada gana las dos cosas: la portada se acorta y el que quiere
          escribir llega en un clic.

          La barra de arriba y el pie son los MISMOS de la portada, no una copia:
          este bloque vive adentro del template y todo lo de alrededor ya está
          dibujado. Así el carrito sigue lleno, los colores son los mismos y no
          hay dos pies que se puedan desincronizar. */}
      {enContacto && (
      <section data-reveal style={{ background:contactoBg, position:"relative" }}>
        <EditableSectionBg field="bgContacto" label="Fondo del contacto" />
        <div style={{ padding: `${isMobile ? 30 : 54}px ${MARGEN}px ${isMobile ? 40 : 64}px` }}>
        <div style={{ maxWidth:ANCHO, margin:"0 auto" }}>

          <div style={{ marginBottom: isMobile ? 14 : 20 }}>
            <BotonVolver onClick={irALaPortada} destino="Volver a la tienda"
              S={contactoTarjeta} LN={contactoBorde} T={contactoText} G={G} />
          </div>

          {/* El título grande, centrado. En esta pantalla no compite con nada:
              es lo único que hay arriba, así que puede ser grande de verdad. */}

          <h1 style={{ fontSize: isMobile ? 40 : 82, fontWeight:800, letterSpacing:"-0.04em", color:contactoText, margin:"0 0 6px", textAlign:"center", lineHeight:1.02 }}>
            <EditableZone field="contactoTitulo" label="Título de contacto">Escribinos</EditableZone>
          </h1>
          <p style={{ margin:"0 auto", maxWidth:520, textAlign:"center", fontSize: isMobile ? 14 : 15.5, color:contactoMid, lineHeight:1.65 }}>
            <EditableZone field="contactoBajada" label="Bajada de contacto">
              Contanos qué estás buscando y te respondemos. Talles, envíos, cambios: lo que necesites.
            </EditableZone>
          </p>

          {/* Hoy SIEMPRE hay foto —la sube la dueña o queda la de atención— así que
              lo normal son dos columnas. La rama de una sola queda igual, de red:
              si mañana se decide que alguna tienda no lleve foto, el formulario se
              centra en un ancho de lectura en vez de estirarse. Estirado a 1360 los
              campos miden 1230 y la pantalla se lee rota, como sin terminar. */}
          <div className="ai-contacto" style={{ marginTop: isMobile ? 30 : 48, ["--cols" as string]: contactoFoto ? 2 : 1,
                 ...(contactoFoto ? {} : { maxWidth: 620, marginLeft:"auto", marginRight:"auto" }) }}>

            {/* ── El formulario ── */}
            <div style={{ minWidth:0 }}>
              <h2 style={{ fontSize: isMobile ? 19 : 23, fontWeight:800, letterSpacing:"-0.4px", color:contactoText, margin:"0 0 22px" }}>
                <EditableZone field="contactoFormTitulo" label="Título del formulario">Mandanos un mensaje</EditableZone>
              </h2>

              {/* Campos con una línea abajo y no con caja: en una pantalla clara
                  y con este espacio, cuatro rectángulos con borde se leen como un
                  trámite. La línea alcanza para saber dónde escribir. */}
              <ContactForm
                storeId={storeConfig?.storeId} isPreview={isPreview}
                accent={G} textColor={contactoText} mutedColor={contactoMid}
                variant="underline" radius={0} buttonRadius={999}
                theme={{
                  showLabels: true,
                  labelStyle: { fontSize:13, fontWeight:700, color:contactoText, marginBottom:2 },
                  twoColTop: false,
                  fontSize: 14.5,
                  gap: 22,
                  inputPadding: "10px 2px",
                  focusBorderColor: G,
                  placeholders: { nombre: "Tu nombre", email: "Tu email", mensaje: "Contanos en qué te podemos ayudar" },
                  buttonLabel: "Enviar mensaje",
                  buttonFullWidth: false,
                  buttonAlign: isMobile ? "stretch" : "flex-start",
                  buttonStyle: { background:G, color:accentText, padding:"14px 34px", fontSize:14, fontWeight:700, border:"none", fontFamily:"inherit" },
                }}
                renderSent={reset => (
                  <div style={{ background:contactoTarjeta, border:`1px solid ${contactoBorde}`, borderRadius:RAD, padding: isMobile ? "28px 22px" : "38px 32px", textAlign:"center" }}>
                    <div aria-hidden style={{ width:54, height:54, borderRadius:"50%", background:G, color:accentText, display:"grid", placeItems:"center", margin:"0 auto 16px" }}>
                      <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={accentText} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <p style={{ margin:"0 0 6px", fontSize:18, fontWeight:800, color:contactoText, letterSpacing:"-0.3px" }}>Mensaje enviado</p>
                    <p style={{ margin:"0 0 18px", fontSize:13.5, color:contactoMid, lineHeight:1.6 }}>Te respondemos a la brevedad.</p>
                    <button onClick={reset}
                      style={{ background:"transparent", color:contactoText, border:`1px solid ${contactoBorde}`, borderRadius:999, padding:"11px 24px", fontSize:13.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                      Enviar otro
                    </button>
                  </div>
                )}
              />

              {/* WhatsApp aparte del formulario, y sólo si la dueña lo cargó. Es
                  la otra forma de escribir, no una decoración: quien quiere una
                  respuesta ahora no llena un formulario. */}
              {hayWhatsappContacto && (
                <a href={`https://wa.me/${whatsappLimpio}`} target="_blank" rel="noopener noreferrer"
                  style={{ marginTop:26, display:"inline-flex", alignItems:"center", gap:10, background:"transparent", color:contactoText, border:`1px solid ${contactoBorde}`, borderRadius:999, padding:"12px 22px", fontSize:13.5, fontWeight:600, textDecoration:"none" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.color = G; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = contactoBorde; e.currentTarget.style.color = contactoText; }}>
                  <svg width={17} height={17} viewBox="0 0 24 24" fill="#25d366" aria-hidden><path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5 0-.2 0-.4 0-.5 0-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1 2.9 1.2 3.1c.1.2 2.1 3.2 5 4.4.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z"/></svg>
                  Escribinos por WhatsApp
                </a>
              )}
            </div>

            {/* ── La foto ──
                La sube la dueña, y hasta que lo haga queda una de atención al
                cliente. Es la misma en el editor y en la tienda publicada, así que
                lo que acomoda es lo que va a salir. */}
            {contactoFoto && (
              <div style={{ position:"relative", minWidth:0, borderRadius: isMobile ? RAD : RAD + 4, overflow:"hidden", background:BG }}>
                <EditableImageButton field="contactoFoto" label="Cambiar imagen"
                  panelLabel="Foto de la pantalla de contacto"
                  panelNote="Se ve al lado del formulario. Una foto de tu local, de tu taller o tuya trabajando funciona mejor que una de catálogo." />
                <FadeImage src={contactoFoto} alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" style={{ objectFit:"cover" }}/>
              </div>
            )}
          </div>

        </div>
        </div>
      </section>
      )}


      {/* ── LA FICHA DE PRODUCTO, acá adentro ──────────────────────────────────
          Tocar un producto NO cambia de página. La ficha aparece entre la barra y
          el pie de Aire, que son los mismos de siempre y no se redibujan: el
          carrito con cosas adentro y lo que se venía filtrando siguen en pie, y
          cerrar la ficha devuelve la grilla como estaba.

          El cuerpo es el COMPARTIDO, el mismo que usa la página suelta del
          producto y los otros seis templates. Acá no se copió ni una línea de
          galería, opciones, reseñas o similares: si se arregla algo allá, se
          arregla en las dos entradas a la vez.

          El pie que trae `AireDetail` NO viene, y está bien: ese archivo dibuja
          una página entera porque allá no hay template alrededor. Acá el pie ya
          está, abajo. Lo único que se comparte con él es el vestido.

          `fichaProducto` en null con la ficha abierta es un link a un producto que
          ya no existe. Se lo dice y se ofrece el catálogo, en vez de dejar la
          pantalla en blanco. */}
      {enProducto && (
        <section style={{ background:BG, padding: `${isMobile ? 18 : 30}px ${MARGEN}px ${isMobile ? 30 : 52}px` }}>
          <div style={{ maxWidth:ANCHO, margin:"0 auto" }}>
            {/* El mismo botón redondo del catálogo y de contacto, y no el link de
                texto que había acá. Las tres pantallas tienen un atrás y tenían que
                verse igual: dos flechas distintas para lo mismo se leen como dos
                cosas distintas. Lo que cambia es adónde vuelve — desde la ficha se
                vuelve al CATÁLOGO, no a la portada: es de donde se vino. */}
            <div style={{ marginBottom:14 }}>
              <BotonVolver onClick={irAlCatalogo} destino="Volver al catálogo"
                S={S} LN={LN} T={T} G={G} />
            </div>
            {fichaProducto ? (
              /* Los "similares" del cuerpo compartido son links de verdad, para que
                 se puedan copiar y abrir en otra pestaña. Pero un clic común no
                 tiene que sacar de la página, así que se atiende acá: se mira si lo
                 tocado fue un link a un producto de ESTA tienda y, si lo fue, se
                 abre la ficha en el lugar. Se resuelve mirando el clic al vuelo y no
                 tocando el cuerpo compartido, que es de los otros seis templates. */
              <div onClick={e => {
                const a = (e.target as HTMLElement).closest("a");
                const href = a?.getAttribute("href");
                const id = href && RUTA_PRODUCTO.exec(href.split("?")[0])?.[1];
                const p = id && products.find(x => x.id === id);
                if (!p) return;
                e.preventDefault();
                abrirProducto(p);
              }}>
                <ProductDetailBody theme={temaFicha} view={fichaProducto} />
              </div>
            ) : loadingProducts ? (
              <p style={{ textAlign:"center", padding:"50px 0", color:T2, fontSize:14.5, margin:0 }}>Cargando…</p>
            ) : (
              <div style={{ textAlign:"center", padding:"46px 0" }}>
                <p style={{ margin:"0 0 6px", fontSize:17, fontWeight:800, color:T }}>Producto no disponible</p>
                <p style={{ margin:0, fontSize:13.5, color:T2 }}>Puede haber sido eliminado o ya no está a la venta.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── PANTALLA DE CATÁLOGO ───────────────────────────────────────────────
          La lista completa, con los filtros al costado. Es una PÁGINA aparte
          (/tienda/xxx/productos), no un bloque de la portada.

          Hasta acá esta dirección mostraba un catálogo genérico, el mismo para
          los once templates: sin la barra de arriba de la tienda, con un pie
          centrado que no era el suyo. Se salía del template sin querer. Este
          vive adentro de Aire, así que la barra, el carrito y el pie vienen
          puestos y son los mismos de la portada.

          Los filtros van en una COLUMNA al costado y no en fichas arriba. Con
          quince categorías, las fichas se convierten en una tira que se corre
          sola y en la que no se ve dónde estás parado; una lista vertical se lee
          entera de un vistazo y deja marcada la que elegiste. En celular no hay
          costado, así que la misma lista se pliega detrás de su título. */}
      {enCatalogo && (
      <section id="productos" data-reveal style={{ background:catalogoBg, position:"relative" }}>
        <EditableSectionBg field="bgCatalogo" label="Fondo del catálogo" />
        <div style={{ padding: `${isMobile ? 26 : 44}px ${MARGEN}px ${isMobile ? 34 : 60}px` }}>
        <div style={{ maxWidth:ANCHO, margin:"0 auto" }}>

          <div style={{ marginBottom: isMobile ? 14 : 20 }}>
            <BotonVolver onClick={irALaPortada} destino="Volver a la tienda"
              S={catalogoTarjeta} LN={catalogoBorde} T={catalogoText} G={G} />
          </div>

          <h1 style={{ fontSize: isMobile ? 34 : 68, fontWeight:800, letterSpacing:"-0.04em", color:catalogoText, margin:"0 0 6px", textAlign:"center", lineHeight:1.03 }}>
            {/* Con una colección puesta, el título DICE cuál. Llegar desde la
                baldosa "Ofertas" a una pantalla que sigue diciendo "Todo el
                catálogo" mientras muestra la mitad de los productos se lee como
                que faltan cosas, no como que hay un filtro. El título editable
                vuelve apenas se saca la colección. */}
            {modo
              ? (colecciones.find(c => c.id === modo)?.titulo ?? "Catálogo")
              : <EditableZone field="catalogoTitulo" label="Título del catálogo">Todo el catálogo</EditableZone>}
          </h1>
          <p style={{ margin:"0 0 28px", textAlign:"center", fontSize:13.5, color:catalogoMid }}>
            {loadingProducts
              ? "Cargando…"
              : `${allFiltered.length} ${allFiltered.length === 1 ? "producto" : "productos"}${activeCategory !== "Todos" ? ` en ${activeCategory}` : ""}`}
          </p>

          <div className="ai-catalogo">

            {/* ── Los filtros ── */}
            <aside style={{ minWidth:0 }}>

              {/* ── Colecciones ──
                  Las MISMAS tres de las baldosas de la portada: lo que está en
                  oferta, lo que más miran, lo último que entró. Tocar una baldosa
                  ahora trae acá, y si al llegar no hubiera dónde ver cuál está
                  puesta —ni cómo sacarla— el catálogo se vería filtrado sin
                  explicación y sin salida.
                  Va ARRIBA de las categorías porque es el corte más grueso: una
                  colección puede tener prendas de todas las categorías, no al revés.
                  Sólo se dibuja si hay alguna: en una tienda sin ofertas, sin
                  vistas suficientes y con menos de siete productos, las tres listas
                  quedan vacías y serían tres filtros que no filtran nada. */}
              {colecciones.length > 0 && (!isMobile || filtrosAbiertos) && (
                <div style={{ marginBottom:14, background:catalogoTarjeta, border:`1px solid ${catalogoBorde}`, borderRadius:RAD, overflow:"hidden" }}>
                  <p style={{ margin:0, padding:"16px 18px", fontSize:15, fontWeight:800, color:catalogoText, letterSpacing:"-0.3px" }}>Colecciones</p>
                  {[{ id:null, titulo:"Todo el catálogo" }, ...colecciones.map(c => ({ id:c.id as string | null, titulo:c.titulo }))].map(op => {
                    const elegida = modo === op.id;
                    return (
                      <button key={op.id ?? "todo"} type="button"
                        onClick={() => { setModo(op.id as typeof modo); if (isMobile) setFiltrosAbiertos(false); }}
                        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, padding:"13px 18px", background:"none", border:"none", borderTop:`1px solid ${catalogoBorde}`, cursor:"pointer", fontFamily:"inherit", fontSize:14, textAlign:"left", color: elegida ? catalogoText : catalogoMid, fontWeight: elegida ? 700 : 500 }}
                        onMouseEnter={e => { if (!elegida) e.currentTarget.style.color = G; }}
                        onMouseLeave={e => { if (!elegida) e.currentTarget.style.color = catalogoMid; }}>
                        <span style={{ minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{op.titulo}</span>
                        <span aria-hidden style={{ flexShrink:0, width:20, height:20, borderRadius:"50%", border:`1.5px solid ${elegida ? G : catalogoBorde}`, background: elegida ? G : "transparent", display:"grid", placeItems:"center" }}>
                          {elegida && (
                            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={accentText} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div style={{ background:catalogoTarjeta, border:`1px solid ${catalogoBorde}`, borderRadius:RAD, overflow:"hidden" }}>
                <button type="button"
                  onClick={() => { if (isMobile) setFiltrosAbiertos(v => !v); }}
                  aria-expanded={!isMobile || filtrosAbiertos}
                  style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, background:"none", border:"none", padding:"16px 18px", cursor: isMobile ? "pointer" : "default", fontFamily:"inherit" }}>
                  <span style={{ fontSize:15, fontWeight:800, color:catalogoText, letterSpacing:"-0.3px" }}>Categorías</span>
                  {/* La flecha sólo en celular: en escritorio la lista está
                      siempre abierta y una flecha que no hace nada es una promesa
                      incumplida. */}
                  {isMobile && (
                    <span aria-hidden style={{ color:catalogoMid, fontSize:11, transform: filtrosAbiertos ? "rotate(180deg)" : "none", transition:"transform 0.2s" }}>▼</span>
                  )}
                </button>

                {(!isMobile || filtrosAbiertos) && (
                  <div>
                    {/* Las categorias vienen en minuscula de la base ("remeras"),
                        asi que se capitalizan con CSS. "Todos los productos" NO:
                        el capitalize de CSS pone mayuscula en CADA palabra y lo
                        dejaba escrito "Todos Los Productos". */}
                    {[{ v:"Todos", label:"Todos los productos", tal:true }, ...categoryList.map(c => ({ v:c, label:c, tal:false }))].map(op => {
                      const elegida = activeCategory === op.v && !modo;
                      return (
                        <button key={op.v} type="button"
                          onClick={() => { aplicarCategoria(op.v); if (isMobile) setFiltrosAbiertos(false); }}
                          style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, padding:"13px 18px", background:"none", border:"none", borderTop:`1px solid ${catalogoBorde}`, cursor:"pointer", fontFamily:"inherit", fontSize:14, textAlign:"left", color: elegida ? catalogoText : catalogoMid, fontWeight: elegida ? 700 : 500 }}
                          onMouseEnter={e => { if (!elegida) e.currentTarget.style.color = G; }}
                          onMouseLeave={e => { if (!elegida) e.currentTarget.style.color = catalogoMid; }}>
                          <span style={{ minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textTransform: op.tal ? "none" : "capitalize" }}>{op.label}</span>
                          <span aria-hidden style={{ flexShrink:0, width:20, height:20, borderRadius:"50%", border:`1.5px solid ${elegida ? G : catalogoBorde}`, background: elegida ? G : "transparent", display:"grid", placeItems:"center" }}>
                            {elegida && (
                              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={accentText} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* El filtro de género sólo si el catálogo tiene de los dos. Ver
                  `catalogoTieneGeneros`: con todo de un solo género son tres
                  botones que no filtran nada. */}
              {hayGeneros && (!isMobile || filtrosAbiertos) && (
                <div style={{ marginTop:14, background:catalogoTarjeta, border:`1px solid ${catalogoBorde}`, borderRadius:RAD, overflow:"hidden" }}>
                  <p style={{ margin:0, padding:"16px 18px", fontSize:15, fontWeight:800, color:catalogoText, letterSpacing:"-0.3px" }}>Para quién</p>
                  {([null, "mujer", "hombre"] as const).map(g => {
                    const elegido = activeGender === g;
                    return (
                      <button key={g ?? "todos"} type="button" onClick={() => changeGender(g)}
                        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, padding:"13px 18px", background:"none", border:"none", borderTop:`1px solid ${catalogoBorde}`, cursor:"pointer", fontFamily:"inherit", fontSize:14, textAlign:"left", color: elegido ? catalogoText : catalogoMid, fontWeight: elegido ? 700 : 500 }}>
                        <span>{g === null ? "Todos" : g === "mujer" ? "Mujer" : "Hombre"}</span>
                        <span aria-hidden style={{ flexShrink:0, width:20, height:20, borderRadius:"50%", border:`1.5px solid ${elegido ? G : catalogoBorde}`, background: elegido ? G : "transparent", display:"grid", placeItems:"center" }}>
                          {elegido && (
                            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={accentText} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </aside>

            {/* ── La grilla ── */}
            <div style={{ minWidth:0 }}>
              {loadingProducts ? (
                <p style={{ textAlign:"center", padding:"60px 0", color:catalogoMid, fontSize:14.5, margin:0 }}>Cargando productos…</p>
              ) : allFiltered.length === 0 ? (
                <div style={{ textAlign:"center", padding:"60px 20px", background:catalogoTarjeta, border:`1px solid ${catalogoBorde}`, borderRadius:RAD }}>
                  <p style={{ margin:"0 0 6px", fontSize:15, fontWeight:700, color:catalogoText }}>
                    {activeCategory === "Todos" ? "Todavía no hay productos cargados." : `No hay nada en "${activeCategory}".`}
                  </p>
                  {activeCategory !== "Todos" && (
                    <button type="button" onClick={() => aplicarCategoria("Todos")}
                      style={{ marginTop:12, background:"none", border:"none", color:G, fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      Ver todo el catálogo
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="ai-grilla-catalogo ai-entrada">
                    {allFiltered.slice(0, mostrados).map(tarjetaProducto)}
                  </div>

                  {/* De a 24. Una tienda con 500 productos no puede dibujarlos
                      todos de una: son 500 fotos pedidas al mismo tiempo y el
                      celular se arrastra. */}
                  {allFiltered.length > mostrados && (
                    <div style={{ textAlign:"center", marginTop:26 }}>
                      <button type="button" onClick={() => setMostrados(n => n + PASO_CATALOGO)}
                        style={{ background:"transparent", color:catalogoText, border:`1px solid ${catalogoBorde}`, borderRadius:999, padding:"13px 30px", fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}
                        onMouseEnter={e => { e.currentTarget.style.background = G; e.currentTarget.style.color = accentText; e.currentTarget.style.borderColor = G; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = catalogoText; e.currentTarget.style.borderColor = catalogoBorde; }}>
                        Ver más ({allFiltered.length - mostrados} {allFiltered.length - mostrados === 1 ? "restante" : "restantes"})
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

        </div>
        </div>
      </section>
      )}

      {/* ── PIE ────────────────────────────────────────────────────────────────
          CLARO, no oscuro. El bloque de suscripción que queda justo arriba ya es
          macizo y oscuro; un pie oscuro pegado abajo se lee como una sola mancha
          de media pantalla y se pierde el corte entre las dos cosas.

          Queda AFUERA del contenedor de secciones reordenables a propósito: el
          pie va último siempre. Poder moverlo al medio de la página no es una
          libertad que le falte a nadie.

          Las columnas que no tienen nada NO se dibujan. Una tienda sin políticas
          cargadas no tiene por qué mostrar un título "Ayuda" con nada debajo. */}
      <footer style={{ background:footerBg, borderTop:`1px solid ${LN}`, color:footerText, position:"relative" }}>
        <EditableSectionBg field="bgFooter" label="Fondo del pie" />
        <div style={{ padding: `${isMobile ? 34 : 52}px ${MARGEN}px ${isMobile ? 22 : 28}px` }}>
        <div style={{ maxWidth:ANCHO, margin:"0 auto" }}>

          <div className="ai-pie" style={{ ["--cols" as string]: columnasPie.length }}>

            {/* ── La marca ── */}
            <div style={{ minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                <span aria-hidden style={{ width:32, height:32, borderRadius:10, background:G, display:"grid", placeItems:"center", flexShrink:0 }}>
                  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={accentText} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 14h9a3 3 0 1 0-3-3"/><path d="M3 9h6"/><path d="M3 19h13a3 3 0 1 0-3-3"/>
                  </svg>
                </span>
                <span style={{ fontSize:17, fontWeight:800, letterSpacing:"-0.4px", textTransform:"uppercase", color:footerText, overflowWrap:"anywhere" }}>
                  <EditableZone field="footerBrandName" label="Nombre en el pie">{storeConfig?.storeName ?? "AIRE"}</EditableZone>
                </span>
              </div>
              <p style={{ fontSize:13, opacity:0.62, lineHeight:1.65, margin:0, maxWidth:300 }}>
                <EditableZone field="footerDescription" label="Descripción del pie">Ropa elegida a mano, con envíos a todo el país. Escribinos y te respondemos.</EditableZone>
              </p>

              {/* Las redes: sólo las que la dueña cargó. En el editor se muestran
                  todas apagadas, para que sepa que existen y las pueda llenar. */}
              {(() => {
                const redes = ([
                  ["instagram", "Instagram", <path key="ig" d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.22 1 .48 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2a3.8 3.8 0 0 1-.9 1.4c-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4a3.8 3.8 0 0 1-1.4-.9 3.8 3.8 0 0 1-.9-1.4c-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Z"/>],
                  ["facebook",  "Facebook",  <path key="fb" d="M15.5 8.5h-2v-1c0-.6.1-1 .9-1h1.1V4.1c-.3 0-1-.1-1.8-.1-1.9 0-3.2 1.1-3.2 3.2v1.3H8.5v2.6h2v6.9h3v-6.9h2.1l.4-2.6Z"/>],
                  ["tiktok",    "TikTok",    <path key="tk" d="M16.5 3c.3 1.9 1.4 3.1 3.3 3.3v2.6c-1.1.1-2.1-.2-3.2-.9v4.9c0 4.5-4.9 5.9-7 2.7-1.3-2.1-.5-5.7 3.5-5.9v2.7c-.3 0-.6.1-1 .2-1 .3-1.5.9-1.4 1.9.3 1.9 3.8 2.4 3.5-1.2V3h2.3Z"/>],
                  ["youtube",   "YouTube",   <path key="yt" d="M21.6 7.2c-.2-.9-.9-1.6-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8c.2.9.9 1.6 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8ZM10 15V9l5.2 3L10 15Z"/>],
                  ["pinterest", "Pinterest", <path key="pt" d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.9 0 1.3.6 1.3 1.4 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.8 1.5 1.8 1.8 0 3.1-1.9 3.1-4.6 0-2.4-1.7-4.1-4.2-4.1a4.8 4.8 0 0 0-5 4.8c0 1 .4 2 .9 2.5.1.1.1.2.1.3l-.3 1c0 .2-.1.3-.3.2-1.2-.6-2-2.3-2-3.7 0-3 2.2-5.8 6.3-5.8 3.3 0 5.9 2.4 5.9 5.5 0 3.3-2.1 5.9-5 5.9-1 0-1.9-.5-2.2-1.1l-.6 2.3c-.2.8-.8 1.9-1.2 2.5A10 10 0 1 0 12 2Z"/>],
                ] as const);
                const visibles = redes.filter(([k]) => isPreview || !!storeConfig?.socialLinks?.[k]);
                if (visibles.length === 0) return null;
                return (
                  <div style={{ display:"flex", gap:9, marginTop:20, flexWrap:"wrap" }}>
                    {visibles.map(([k, nombre, icono]) => {
                      const url = storeConfig?.socialLinks?.[k];
                      return (
                        <button key={k} onClick={() => url && window.open(url, "_blank", "noopener,noreferrer")}
                          aria-label={nombre} title={url ? nombre : `${nombre} — sin cargar`}
                          style={{ width:36, height:36, borderRadius:"50%", background:"none", border:`1px solid ${footerBorde}`, color:footerText, cursor: url ? "pointer" : "default", opacity: url ? 1 : 0.3, display:"grid", placeItems:"center", transition:"all 0.2s", padding:0 }}
                          onMouseEnter={e => { if (url) { e.currentTarget.style.background = G; e.currentTarget.style.color = accentText; e.currentTarget.style.borderColor = G; } }}
                          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = footerText; e.currentTarget.style.borderColor = footerBorde; }}>
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">{icono}</svg>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* ── Las columnas de links ── */}
            <div className="ai-pie-cols">
            {columnasPie.map(col => (
              <div key={col.titulo} style={{ minWidth:0 }}>
                <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.6, textTransform:"uppercase", color:footerText, opacity:0.5, margin:"0 0 14px" }}>{col.titulo}</p>
                <ul style={{ listStyle:"none", padding:0, margin:0, display:"flex", flexDirection:"column", gap:10 }}>
                  {col.items.map(it => (
                    <li key={it.label}>
                      {/* El de WhatsApp es el unico que sale del sitio: se abre
                          en otra pestaña para no sacar al comprador de la tienda
                          en el medio de una compra. `noreferrer` va junto con
                          `_blank` siempre, si no la pagina nueva queda con acceso
                          a la que la abrio. */}
                      <a href={it.href}
                        {...(it.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : null)}
                        style={{ fontSize:13, color:footerText, opacity:0.72, textDecoration:"none", lineHeight:1.4, overflowWrap:"anywhere", cursor:"pointer" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = "1"; (e.currentTarget as HTMLAnchorElement).style.color = G; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = "0.72"; (e.currentTarget as HTMLAnchorElement).style.color = footerText; }}>
                        {it.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            </div>
          </div>

          {/* ── La línea de abajo ── */}
          <div style={{ borderTop:`1px solid ${footerBorde}`, marginTop: isMobile ? 28 : 40, paddingTop:18, display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"space-between", gap:12 }}>
            <p style={{ fontSize:12, opacity:0.5, margin:0 }}>
              <EditableZone field="footerCopyright" label="Aviso de copyright">© {ANIO} {storeConfig?.storeName ?? "Aire"}. Todos los derechos reservados.</EditableZone>
            </p>
            <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
              <p style={{ fontSize:12, opacity:0.5, margin:0 }}>
                <EditableZone field="footerMadeIn" label="Hecho en">Hecho con ♥ en Argentina</EditableZone>
              </p>
              {/* Reportar la tienda es una función de la plataforma, no del
                  template: tiene que estar en los diez, y no se le esconde al
                  comprador. No aparece en el editor porque ahí la dueña se
                  estaría reportando a sí misma. */}
              {!editMode && (
                <button onClick={() => setShowReport(true)}
                  style={{ fontSize:12, opacity:0.35, background:"none", border:"none", cursor:"pointer", color:"inherit", padding:0, fontFamily:"inherit" }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.75"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "0.35"; }}>
                  Reportar tienda
                </button>
              )}
            </div>
          </div>
        </div>
        </div>
      </footer>

      {showReport && (
        <ReportStoreModal slug={storeConfig?.slug ?? ""} onClose={() => setShowReport(false)} />
      )}

      {/* ── MODAL PRODUCTO ─────────────────────────────────── */}
      {/* Acá vivía el modal del producto: 408 líneas de ficha metidas adentro de
          una ventanita. Se fue entero. Aire abre la PÁGINA del producto
          (/tienda/xxx/producto/yyy), que es la misma que ya usaban otros seis
          templates y que además se puede compartir y la ve Google.

          No se dejó apagado por las dudas: 408 líneas que nadie puede abrir se
          pudren solas — se les cambia el precio o el carrito en un lado y nadie
          se acuerda de este. */}

      {/* ── DEJAR UNA RESEÑA DE LA TIENDA ──────────────────────────────────────
          Sale del bloque de reseñas de la portada. NO habla de un producto: habla
          de la atención, del envío, de cómo fue comprar acá. Por eso nace
          PENDIENTE y no se publica hasta que el dueño la aprueba — un formulario
          público de "opiná sobre esta tienda" es lo más fácil de spamear que hay,
          ni siquiera hace falta fingir que compraste.

          El paso de confirmación existe porque una reseña no se puede editar
          después: se manda una vez y queda. Antes de mandarla se le repite a la
          persona con qué nombre y con cuántas estrellas se va a publicar. */}
      {resenas.modalAbierto && (
        <div onClick={resenas.cerrarModal}
          style={{ position:"fixed", inset:0, background:"rgba(20,22,26,0.55)", backdropFilter:"blur(3px)", zIndex:CAPAS.modalTemplate, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:S, color:T, borderRadius:RAD, width:"100%", maxWidth:440, maxHeight:"90vh", overflowY:"auto", padding: isMobile ? "24px 20px" : "30px 30px", position:"relative", boxShadow:"0 24px 70px rgba(20,22,26,0.28)" }}>
            <button onClick={resenas.cerrarModal} aria-label="Cerrar"
              style={{ position:"absolute", top:14, right:14, width:34, height:34, borderRadius:"50%", background:BG, border:"none", color:T2, fontSize:17, lineHeight:1, cursor:"pointer", display:"grid", placeItems:"center", padding:0 }}>×</button>

            {resenas.listo ? (
              /* No se agrega a la lista: nace pendiente y todavía no es pública.
                 Meterla en pantalla haría creer que ya se publicó, y al recargar
                 habría desaparecido sin ninguna explicación. */
              <div style={{ textAlign:"center", padding:"14px 0 4px" }}>
                <div aria-hidden style={{ width:52, height:52, borderRadius:"50%", background:G, color:accentText, display:"grid", placeItems:"center", margin:"0 auto 16px", fontSize:24 }}>✓</div>
                <h3 style={{ margin:"0 0 8px", fontSize:18, fontWeight:800, letterSpacing:"-0.3px", color:T }}>¡Gracias!</h3>
                <p style={{ margin:"0 0 20px", fontSize:13.5, color:T2, lineHeight:1.6 }}>
                  Tu reseña le llegó a la tienda. Se publica en cuanto la revisen.
                </p>
                <button type="button" onClick={resenas.cerrarModal}
                  style={{ background:G, color:accentText, border:"none", borderRadius:999, padding:"12px 28px", fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={resenas.enviar} style={{ display:"flex", flexDirection:"column", gap:13 }}>
                <div>
                  <h3 style={{ margin:"0 0 5px", fontSize:18, fontWeight:800, letterSpacing:"-0.3px", color:T, paddingRight:36 }}>Contanos cómo te fue</h3>
                  <p style={{ margin:0, fontSize:12.5, color:T2, lineHeight:1.55 }}>
                    De la tienda en general: la atención, el envío, cómo llegó.
                  </p>
                </div>

                {resenas.error && (
                  <p style={{ margin:0, fontSize:12, color:"#b91c1c", background:"rgba(220,38,38,0.08)", border:"1px solid rgba(220,38,38,0.28)", borderRadius:10, padding:"10px 13px", lineHeight:1.5 }}>
                    ⚠ {resenas.error}
                  </p>
                )}

                {/* Trampa para bots: invisible para una persona, irresistible
                    para un robot que rellena todos los campos que encuentra. */}
                <input value={resenas.honeypot} onChange={e => resenas.setHoneypot(e.target.value)}
                  name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
                  style={{ opacity:0, height:0, position:"absolute", pointerEvents:"none" }} />

                <div style={{ display:"flex", gap:5 }}>
                  {[1,2,3,4,5].map(s => (
                    <button key={s} type="button" onClick={() => resenas.setForm(p => ({ ...p, rating: s }))}
                      aria-label={`${s} de 5`}
                      style={{ background:"none", border:"none", padding:2, cursor:"pointer", lineHeight:0 }}>
                      <svg width={28} height={28} viewBox="0 0 24 24" fill={s <= resenas.form.rating ? "#f59e0b" : "rgba(20,22,26,0.15)"} aria-hidden>
                        <path d="M12 2l2.9 6.26 6.85.72-5.12 4.6 1.46 6.72L12 16.9l-6.09 3.4 1.46-6.72L2.25 8.98l6.85-.72z"/>
                      </svg>
                    </button>
                  ))}
                </div>

                <input value={resenas.form.reviewer} maxLength={RESENADOR_MAX} required
                  onChange={e => resenas.setForm(p => ({ ...p, reviewer: e.target.value }))}
                  placeholder="Tu nombre"
                  style={{ background:BG, border:`1px solid ${LN}`, borderRadius:12, color:T, padding:"12px 14px", fontSize:13.5, outline:"none", fontFamily:"inherit", width:"100%", boxSizing:"border-box" }} />

                <div>
                  <input value={resenas.form.email} type="email" maxLength={120} autoComplete="email"
                    onChange={e => resenas.setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="Tu email (opcional)"
                    style={{ background:BG, border:`1px solid ${LN}`, borderRadius:12, color:T, padding:"12px 14px", fontSize:13.5, outline:"none", fontFamily:"inherit", width:"100%", boxSizing:"border-box" }} />
                  <p style={{ margin:"6px 2px 0", fontSize:11, color:T2, lineHeight:1.5 }}>
                    Si compraste acá, tu reseña sale con el sello &ldquo;✓ Compra verificada&rdquo;. El email no se muestra.
                  </p>
                </div>

                <textarea value={resenas.form.comment} rows={3} maxLength={COMENTARIO_MAX}
                  onChange={e => resenas.setForm(p => ({ ...p, comment: e.target.value }))}
                  placeholder="Contá tu experiencia (opcional)"
                  style={{ background:BG, border:`1px solid ${LN}`, borderRadius:12, color:T, padding:"12px 14px", fontSize:13.5, outline:"none", resize:"none", fontFamily:"inherit", width:"100%", boxSizing:"border-box" }} />
                {/* El contador aparece cerca del final y no desde la primera
                    letra: hasta ahí no le sirve a nadie y sólo mete ruido. */}
                {resenas.form.comment.length > COMENTARIO_MAX - 80 && (
                  <p style={{ margin:"-8px 2px 0", fontSize:11, color: resenas.form.comment.length >= COMENTARIO_MAX ? "#b91c1c" : T2, textAlign:"right" }}>
                    {resenas.form.comment.length} / {COMENTARIO_MAX}
                  </p>
                )}

                {!isPreview && resenas.captcha.widget}

                {resenas.confirmando ? (
                  <div style={{ background:BG, border:`1px solid ${LN}`, borderRadius:14, padding:"14px 16px" }}>
                    <p style={{ margin:"0 0 12px", fontSize:12.5, color:T, lineHeight:1.6 }}>
                      Se publica con tu nombre, <strong>{resenas.form.reviewer.trim()}</strong>, y {resenas.form.rating} de 5 estrellas. ¿La mandamos?
                    </p>
                    <div style={{ display:"flex", gap:9 }}>
                      <button type="submit" disabled={resenas.enviando || !resenas.captcha.ready}
                        style={{ flex:1, background:G, color:accentText, border:"none", borderRadius:999, padding:"12px", fontSize:13, fontWeight:700, cursor: resenas.enviando ? "default" : "pointer", opacity: resenas.enviando ? 0.6 : 1, fontFamily:"inherit" }}>
                        {resenas.enviando ? "Enviando..." : "Sí, enviar"}
                      </button>
                      <button type="button" onClick={() => resenas.setConfirmando(false)} disabled={resenas.enviando}
                        style={{ flex:1, background:"transparent", color:T2, border:`1px solid ${LN}`, borderRadius:999, padding:"12px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                        Volver
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" disabled={!resenas.puedeEnviar}
                    onClick={() => resenas.setConfirmando(true)}
                    title={resenas.bloqueo ? undefined : resenas.valida ? undefined : "Escribí tu nombre y elegí cuántas estrellas"}
                    style={{ background: resenas.puedeEnviar ? G : BG, color: resenas.puedeEnviar ? accentText : T2, border: resenas.puedeEnviar ? "none" : `1px solid ${LN}`, borderRadius:999, padding:"14px", fontSize:13.5, fontWeight:700, cursor: resenas.puedeEnviar ? "pointer" : "default", fontFamily:"inherit" }}>
                    Enviar mi reseña
                  </button>
                )}

                {/* Por qué el botón no va a mandar, DICHO. El dueño mirando su
                    tienda publicada escribía todo, apretaba, y no pasaba nada. */}
                {resenas.bloqueo && (
                  <p style={{ margin:0, fontSize:11.5, color:T2, lineHeight:1.55, textAlign:"center" }}>
                    {resenas.bloqueo === "preview"
                      ? "Vista previa: el formulario funciona en tu tienda publicada."
                      : "Sos el dueño de esta tienda: no podés dejarte una reseña a vos mismo."}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      <CheckoutModal cart={cart} theme={cartTheme} isPreview={isPreview} storeSlug={storeConfig?.slug ?? ""} />
      <CartDrawer cart={cart} theme={cartTheme} isOwner={isOwner} isPreview={isPreview} whatsapp={storeConfig?.whatsapp} />

      {/* ── FAVORITES DRAWER ───────────────────────────────── */}
      <div style={{ position:"fixed", inset:0, zIndex: isPreview ? 20000 : 155, pointerEvents: favoritesOpen ? "auto" : "none" }}>
        <div onClick={() => setFavoritesOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(10,10,10,0.6)", opacity: favoritesOpen ? 1 : 0, transition:"opacity 0.3s" }}/>
        <div style={{ position:"absolute", top:0, right:0, bottom:0, width:"min(420px, 100vw)", background:S, transform: favoritesOpen ? "translateX(0)" : "translateX(100%)", transition:"transform 0.35s cubic-bezier(.4,0,.2,1)", display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"24px 24px 16px", borderBottom:`1px solid rgba(20,22,26,0.07)`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <p style={{ fontSize:18, margin:0 }}>{"Favoritos"} <span style={{ fontSize:13, color:"#555" }}>({favorites.length})</span></p>
            <button onClick={() => setFavoritesOpen(false)} style={{ background:"none", border:"none", color:T, fontSize:24, cursor:"pointer", lineHeight:1 }}>×</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"16px 24px" }}>
            {favoriteProducts.length === 0
              ? <div style={{ textAlign:"center", padding:"60px 0", opacity:0.35 }}>
                  <p style={{ fontSize:36, marginBottom:12 }}>♡</p>
                  <p style={{ fontSize:13, lineHeight:1.8 }}>No tenés favoritos aún.<br/>Guardá piezas que te gusten.</p>
                </div>
              : favoriteProducts.map(product => (
                <div key={product.id} style={{ display:"flex", gap:14, padding:"16px 0", borderBottom:`1px solid rgba(20,22,26,0.05)` }}>
                  {product.images[0] ? <FadeImage src={product.images[0]} alt={product.name} width={70} height={93} style={{ objectFit:"cover", flexShrink:0 }}/> : <div style={{ width:70, height:93, flexShrink:0, background:S }}/>}
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:14, margin:"0 0 3px", fontWeight:500 }}>{product.name}</p>
                    <PromoPrice product={product} promotions={promotions} fmt={fmt} accent={G}
                      priceSize={13} compareSize={11} weight={700} ocultarPrecios={ocultarPrecios}
                      gap={8} style={{ marginBottom:10 }} />
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={() => { setFavoritesOpen(false); abrirProducto(product); }}
                        style={{ background:G, color:accentText, border:"none", padding:"7px 14px", fontSize:10, letterSpacing:2, fontWeight:700, textTransform:"uppercase", cursor:"pointer" }}>
                        Ver producto
                      </button>
                      <button onClick={() => toggleFavorite(product.id)}
                        style={{ background:"transparent", color:"#666", border:"1px solid rgba(20,22,26,0.10)", padding:"7px 14px", fontSize:10, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", transition:"color 0.2s" }}
                        onMouseEnter={e => (e.currentTarget.style.color=T)}
                        onMouseLeave={e => (e.currentTarget.style.color="#666")}>
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* Acá vivía el visor de foto a pantalla completa. Lo abría la ficha del
          producto dentro del modal; sin modal, nada lo abría nunca. La foto a
          pantalla completa la tiene ahora la página del producto. */}

      {/* El botón flotante del carrito se sacó: el carrito vive en la barra de
         arriba. Tenerlo en los dos lados no es redundancia inofensiva — en un
         celular la burbuja se apoya en la misma esquina que el botón de
         WhatsApp y se tapan entre sí, y el comprador toca el que no quería. */}

      {/* ── WHATSAPP BUTTON ────────────────────────────────── */}
      {!cart.cartOpen && !cart.checkoutOpen && (!storeConfig || storeConfig.whatsapp.enabled) && (
        <button
          className="ai-wa-fab"
          onClick={() => { if (editMode) return; window.open(`https://wa.me/${(storeConfig?.whatsapp.number ?? "5491100000000").replace(/\D/g,"")}${storeConfig?.whatsapp?.message ? "?text=" + encodeURIComponent(storeConfig.whatsapp.message) : ""}`, "_blank"); }}
          style={{ position:"fixed", bottom:24, right:24, zIndex:CAPAS.panel, width:52, height:52, borderRadius:"50%", border:"none", cursor: editMode ? "default" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"transform 0.2s" }}
          onMouseEnter={e => { if (!editMode) e.currentTarget.style.transform="scale(1.1)"; }}
          onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </button>
      )}

    </div>
  );
}
