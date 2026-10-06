"use client";
import { useVistaTemplate, urlParaCompartirProducto } from "@/components/store/templates/shared/useVistaTemplate";
import type { CatalogoEmbebido } from "@/app/tienda/[slug]/productos/CatalogoGenerico";
import { CatalogoAurora, type EscenaCatalogo } from "@/components/store/templates/aurora/CatalogoAurora";
import { ColeccionEnFoco } from "@/components/store/templates/aurora/ColeccionEnFoco";
import { ProductoEnFoco } from "@/components/store/templates/aurora/ProductoEnFoco";
import { FichaAurora } from "@/components/store/templates/aurora/FichaAurora";
import { ResenasAurora } from "@/components/store/templates/aurora/ResenasAurora";
import { REDES_SOCIALES } from "@/components/store/templates/shared/redesSociales";
import { LanzamientoAurora } from "@/components/store/templates/aurora/LanzamientoAurora";
import { LookbookAurora, MAX_LOOKS } from "@/components/store/templates/aurora/LookbookAurora";
import { RecienLlegado } from "@/components/store/templates/aurora/RecienLlegado";
import { PreguntasAurora } from "@/components/store/templates/aurora/PreguntasAurora";
import { GarantiasAurora } from "@/components/store/templates/aurora/GarantiasAurora";
import { FraseAurora } from "@/components/store/templates/aurora/FraseAurora";
import { MayoristaAurora } from "@/components/store/templates/aurora/MayoristaAurora";
import { ElegirPortada, leerPiezasPortada, leerModoPortada, MAX_PORTADA } from "@/components/store/templates/aurora/ElegirPortada";
import { ChapitaBloque } from "@/components/store/templates/shared/ChapitaBloque";
import { ayudaDeBloque, idDeSuperficie } from "@/lib/ayudaBloques";
import { VolverAurora } from "@/components/store/templates/aurora/VolverAurora";
import { barraMs } from "@/types/store-config";
import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback, useSyncExternalStore, Fragment } from "react";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { usePushBell } from "@/contexts/PushBellContext";
import { useSesion } from "@/components/AuthProvider";
import StoreFollowButton from "@/components/store/StoreFollowButton";
import { EditableZone, EditableImageButton, EditableSectionBg, BgDragHandle, getContrastColor, contrasteWCAG, useEditContext, textoSobre } from "@/contexts/EditContext";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useCartLogic } from "@/hooks/useCartLogic";
import { catalogoTieneGeneros } from "@/lib/generos";
import { isDemoProductId } from "@/lib/demoProducts";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import VerifiedIconButton from "@/components/store/VerifiedIconButton";
import { CartDrawer, type CartTheme } from "@/components/store/templates/shared/CartDrawer";
import { PromoPrice } from "@/components/store/PromoDisplay";
import { resolveProductPromo } from "@/lib/promoDisplay";
import { CheckoutModal } from "@/components/store/templates/shared/CheckoutModal";
import { ContactForm } from "@/components/store/templates/shared/ContactForm";
import { NewsletterForm } from "@/components/store/templates/shared/NewsletterForm";
import { FadeImage } from "@/components/store/templates/shared/FadeImage";
import { HeroFoto } from "@/components/store/templates/shared/HeroFoto";
import { Coverflow } from "@/components/store/templates/shared/Coverflow";
import { GrillaProfunda } from "@/components/store/templates/shared/GrillaProfunda";
import { TarjetaAurora, type TintaTarjeta } from "@/components/store/templates/aurora/TarjetaAurora";
import { CLASES_LETRA, TITULO, TEXTO } from "@/components/store/templates/aurora/fuentes";
import { calcularVuelo, tarjetaVisible, MS_IDA, MS_VUELTA } from "@/components/store/templates/shared/vueloDeFicha";
import { vidrio, sombra, Inclinable } from "@/components/store/templates/shared/Materia";
import { SectionBlock } from "@/components/store/templates/shared/SectionBlock";
import { linksLegales } from "@/lib/politicas-tienda";
import { CAPAS } from "@/lib/capas-tienda";


const announcementMessages_DEFAULT = [
  "🚚 Envío gratis en compras mayores a $30.000",
  "🔄 Cambios sin cargo hasta 30 días",
  "💳 6 cuotas sin interés",
];

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior:"smooth" });

/** Un color con transparencia. El acento lo elige la dueña y casi siempre es
 *  un hex; si viniera en otro formato, `color-mix` lo resuelve igual. */
function conAlfa(color: string, a: number): string {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!hex) return `color-mix(in srgb, ${color} ${Math.round(a * 100)}%, transparent)`;
  const h = hex[1].length === 3 ? hex[1].split("").map(c => c + c).join("") : hex[1];
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* ── Ícono de carrito flotante — variantes para elegir en modo edición ── */
const CART_ICON_OPTIONS: React.ReactNode[] = [
  <Fragment key="bag"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></Fragment>,
  <Fragment key="cart"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></Fragment>,
  <Fragment key="basket"><path d="M5 11 2 7h20l-3 4"/><path d="M4 11h16l-1.7 8.5a2 2 0 0 1-2 1.5H7.7a2 2 0 0 1-2-1.5L4 11Z"/><path d="M9 11V8a3 3 0 0 1 6 0v3"/></Fragment>,
];

/* ── Garantías ─────────────────────────────────────────── */
const AU_STRIP_ICONS: React.ReactNode[][] = [
  [
    <svg key="truck"  width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    <svg key="box"    width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    <svg key="zap"    width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    <svg key="gift"   width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
  ],
  [
    <svg key="refresh"    width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16"/><polyline points="21 3 21 8 16 8"/><polyline points="3 21 3 16 8 16"/></svg>,
    <svg key="undo"       width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>,
    <svg key="check-circ" width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    <svg key="arrows-lr"  width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  ],
  [
    <svg key="shield" width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
    <svg key="lock"   width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    <svg key="card"   width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    <svg key="award"  width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  ],
  [
    <svg key="chat"    width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    <svg key="phone"   width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    <svg key="headset" width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>,
    <svg key="mail"    width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  ],
];

const GARANTIAS = [
  { title:"Envío gratis",           desc:"En compras mayores a $30.000" },
  { title:"Cambios sin cargo",      desc:"Hasta 30 días después de la compra" },
  { title:"Pago seguro",            desc:"Todos los medios de pago protegidos" },
  { title:"Atención personalizada", desc:"Respondemos en menos de 24 hs" },
];

const MODOS_VIDRIERA = [
  { valor: "destacados",       label: "Arranca con destacados" },
  { valor: "categorias",       label: "Arranca con categorías" },
  { valor: "solo-destacados",  label: "Sólo destacados" },
  { valor: "solo-categorias",  label: "Sólo categorías" },
] as const;
type ModoVidriera = typeof MODOS_VIDRIERA[number]["valor"];

// Sin "au-categorias": las categorías ya no son una sección propia con tres
// baldosas elegidas a mano, son el segundo mazo de la vidriera del hero — y
// entran todas las que la tienda tenga, no tres.
/* Nosotros y Contacto NO estan: son pantallas propias, y una pantalla no se
   reordena ni se oculta desde el editor — se entra a ella.
   Tampoco estan el banner horizontal, las ofertas, lo mas visto ni la prueba
   social: se sacaron de la portada por decision de disenio, para que la home sea
   mas corta. Los productos en oferta y los mas vistos siguen estando en el
   catalogo, que tiene sus filtros. */
/** Cuántas piezas muestra el bloque de productos de la portada. */
const VISTOS_EN_PORTADA = 8;

const AU_SECTION_IDS = ["au-lanzamiento", "au-garantias", "au-mayorista", "au-coleccion", "au-recien", "au-statement", "au-producto-foco", "au-lookbook", "au-productos", "au-resenas", "au-preguntas"];

/* ── Component ─────────────────────────────────────────── */
export default function Aurora() {
  const [scrolled,           setScrolled]           = useState(false);
  const [activeGender,       setActiveGender]       = useState<string | null>(null);
  const [hoveredNavCat,      setHoveredNavCat]      = useState<string | null>(null);
  const [isMobile,           setIsMobile]           = useState(false);
  const [mobileMenuOpen,     setMobileMenuOpen]     = useState(false);
  /* Escape cierra el menú del celular (05/10/26: no lo cerraba). En captura
     y cortando la propagación, como en Chic: un Escape cierra UNA cosa, y
     así no llega también a `useCartLogic`. */
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", tecla, true);
    return () => window.removeEventListener("keydown", tecla, true);
  }, [mobileMenuOpen]);
  const [mobileCatsOpen,     setMobileCatsOpen]     = useState(false);
  const [mobileOpenCat,      setMobileOpenCat]      = useState<string | null>(null);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [announcementIdx,    setAnnouncementIdx]    = useState(0);
  const [showReport,     setShowReport]     = useState(false);
  const [lightboxSrc,    setLightboxSrc]    = useState<string|null>(null);
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
  const hasWA       = !storeConfig || storeConfig.whatsapp.enabled;
  const storefront  = useStorefront();
  const { products, promotions, loadingProducts, checkoutMode, isWholesale, ocultarPrecios, defaultCategories, shippingMethods, hasMercadoPago } = storefront;
  const isInquiryMode = checkoutMode === "inquiry" || ocultarPrecios;

  /* ── Las pantallas dejan de ser otras páginas ────────────────────────────────
   *
   * Aurora era la última que se iba de verdad: ocho links al catálogo con
   * `window.location.href`, que recarga todo. En la tienda publicada es un
   * parpadeo; en el EDITOR sacaba a la dueña de Diseño y encima le mostraba el
   * catálogo del template GUARDADO en vez del que estaba mirando.
   *
   * Mismo hook que ya usan Aire, Boho Terra, Urban Pulse y Chic Paris. El
   * catálogo, Nosotros y Contacto se dibujan acá adentro, entre la barra y el pie
   * de Aurora, y la dirección se acomoda sola para que el link se pueda compartir.
   *
   * La ficha del producto NO cambia: acá es un modal, y un modal nunca fue una
   * página que se abre. */
  const vista = useVistaTemplate({ isPreview, slug: storeConfig?.slug, templateId: "aurora" });
  /** Con qué filtro entrar al catálogo. Lo ponen los links antes de abrirlo. */
  const [filtroCatalogo, setFiltroCatalogo] = useState<CatalogoEmbebido>({});
  const abrirCatalogo = (filtro: CatalogoEmbebido = {}) => {
    setFiltroCatalogo(filtro);
    vista.irAlCatalogo();
  };

  /* El filtro del que LLEGA por la dirección: un link compartido, uno abierto en
     pestaña nueva o uno seguido desde Google. Suelto, el catálogo lo leía de la
     URL; embebido no puede, porque adentro de un template la dirección es la del
     template. Sin esto el filtro se perdía justo para el que no navegó, que es el
     único que no puede volver a ponerlo. Explicado largo en `UrbanPulse.tsx`. */
  const busquedaDeLaUrl = useSyncExternalStore(() => () => {}, () => window.location.search, () => "");
  const filtroDeLaUrl = useMemo<CatalogoEmbebido>(() => {
    const p = new URLSearchParams(busquedaDeLaUrl);
    const f: CatalogoEmbebido = {};
    const cat = p.get("categoria");     if (cat) f.categoria = cat;
    const sub = p.get("subcategoria");  if (sub) f.subcategoria = sub;
    if (p.get("oferta") === "true")    f.soloOfertas = true;
    if (p.get("destacado") === "true") f.masVistos = true;
    if (p.get("promo") === "true")     f.soloPromos = true;
    return f;
  }, [busquedaDeLaUrl]);
  /* Manda el filtro que puso un clic de acá adentro; si no hay, el de la
     dirección. Navegando adentro la URL queda en `/productos` sin nada colgando,
     así que no hay filtro viejo que pueda pisar al nuevo. */
  const filtroEfectivo = useMemo<CatalogoEmbebido>(
    () => ({ ...filtroDeLaUrl, ...filtroCatalogo }),
    [filtroDeLaUrl, filtroCatalogo]
  );
  /* `key` del catálogo: guarda el filtro en un `useState`, o sea que sólo mira lo
     que le llega en su PRIMER dibujado, y en la hidratación la dirección todavía
     no se puede leer. Con una clave hecha del filtro, cambiar de filtro es montar
     otro catálogo. */
  const claveCatalogo = [
    filtroEfectivo.categoria ?? "", filtroEfectivo.subcategoria ?? "",
    filtroEfectivo.soloOfertas ? "of" : "", filtroEfectivo.masVistos ? "mv" : "",
    filtroEfectivo.soloPromos ? "pr" : "",
  ].join("|");

  /* ── Ir a una sección de la portada, se esté donde se esté ───────────────────
     `scrollTo` busca una sección de la portada, y desde el catálogo la portada no
     está dibujada: el menú entero dejaría de hacer nada. Vuelve a la portada
     primero y recién ahí busca la sección, que se dibuja en el render siguiente
     — por eso queda anotada y la va a buscar el efecto de abajo. */
  const [seccionPendiente, setSeccionPendiente] = useState<string | null>(null);
  /** El menú nombra las dos pantallas propias y las secciones de la portada con
   *  la misma lista. Acá se separa: Nosotros y Contacto son pantallas; el resto,
   *  scroll. */
  const irAPantalla = (destino: string) => {
    if (destino === "nosotros") return vista.irANosotros();
    if (destino === "contacto") return vista.irAContacto();
    irASeccion(destino);
  };
  const irASeccion = (id: string) => {
    if (vista.enPortada) { scrollTo(id); return; }
    setSeccionPendiente(id);
    vista.irALaPortada();
  };
  useEffect(() => {
    if (!seccionPendiente || !vista.enPortada) return;
    const t = setTimeout(() => { scrollTo(seccionPendiente); setSeccionPendiente(null); }, 80);
    return () => clearTimeout(t);
  }, [seccionPendiente, vista.enPortada]);

  const categoryList = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(c => c && c !== "general"))];
    const base = cats.length > 0 ? cats : defaultCategories.slice(0, 6);
    return base;
  }, [products, defaultCategories]);

  /* Las categorías que van al mazo de la vidriera: SÓLO las que el dueño creó de
     verdad. `categoryList` no sirve porque en el editor `products` viene con los
     productos demo de relleno mezclados, y sus categorías entrarían a la pista
     como si fueran de la tienda — llevarían a un catálogo filtrado vacío.
     La excepción es el editor mientras la tienda no tiene ninguna categoría
     propia: ahí van las de los ejemplos, para que la dueña vea que el mazo
     existe y pueda elegirlo. Los clics del editor no llevan a ningún lado, así
     que el catálogo vacío no se llega a ver. */
  const categoriasBaldosa = useMemo(() => {
    const deLaLista = (lista: typeof products) =>
      [...new Set(lista.map(p => p.category).filter(c => c && c !== "general"))];
    const reales = deLaLista(products.filter(p => !isDemoProductId(p.id)));
    return reales.length === 0 && enEditor ? deLaLista(products) : reales;
  }, [products, enEditor]);

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
  const { editMode, overrides: textOverrides, setOverride, vistaCelular } = useEditContext();
  /* El año del copyright, calculado UNA vez y fuera del dibujado (igual que en
     Aire): preguntar la fecha mientras se dibuja puede dar dos resultados en dos
     dibujados seguidos, y React lo prohíbe. */
  const [ANIO] = useState(() => new Date().getFullYear());
  const [inquiryMessage, setInquiryMessage] = useState("");
  const cart = useCartLogic(storefront);
  const {
    setCartOpen,
    modalProduct, setModalProduct,
    searchOpen, setSearchOpen, searchQuery, setSearchQuery,
    favorites, favoritesOpen, setFavoritesOpen,
    userDropdownOpen, setUserDropdownOpen, userDropdownRef,
    toastMsg,
    cartCount,
    searchResults, favoriteProducts,
    fmt, showToast, openModal,
    toggleFavorite,
  } = cart;
  /* ── El vuelo de la ficha ──────────────────────────────────────────────────
     La cuenta vive en `vueloDeFicha`; acá sólo están los tres nodos que hacen
     falta para hacerla: de qué foto sale, cuál es la foto de la ficha, y cuál es
     la ficha entera —que es lo que realmente se mueve, porque la foto sola la
     recortaría el `overflow: hidden` del contenedor. */
  const fichaRef      = useRef<HTMLDivElement>(null);
  const fotoFichaRef  = useRef<HTMLDivElement>(null);
  const origenRef     = useRef<HTMLElement | null>(null);
  const [panelListo, setPanelListo] = useState(false);

  /** Abre la ficha recordando de qué foto salió, para que pueda volver. */
  const abrirFicha = useCallback((product: StorefrontProduct, e?: React.MouseEvent) => {
    const tarjeta = e?.currentTarget as HTMLElement | undefined;
    origenRef.current = tarjeta?.querySelector<HTMLElement>("[data-foto]") ?? null;
    // El panel arranca apagado ACÁ y no en el efecto: apagarlo desde el efecto
    // sería un setState en cascada, y además llegaría tarde — el primer cuadro
    // ya se habría pintado con el fondo negro de la vez anterior.
    setPanelListo(false);
    openModal(product);
  }, [openModal]);

  // La ida. `useLayoutEffect` y no `useEffect`: corre después de que la ficha
  // se montó pero ANTES de que el navegador pinte, así el primer cuadro que se
  // ve ya está achicado sobre la tarjeta. Con `useEffect` se alcanzaría a ver un
  // cuadro con la ficha entera abierta, que es el parpadeo que esto evita.
  useLayoutEffect(() => {
    if (!modalProduct) return;
    const ficha = fichaRef.current, foto = fotoFichaRef.current, desde = origenRef.current;
    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const vuelo = (!quieto && ficha && foto && tarjetaVisible(desde))
      ? calcularVuelo(desde!.getBoundingClientRect(), foto.getBoundingClientRect(), ficha.getBoundingClientRect())
      : null;

    if (!ficha || !vuelo) { setPanelListo(true); return; }

    ficha.style.transition = "none";
    ficha.style.transformOrigin = "0 0";
    ficha.style.transform = vuelo.transform;
    void ficha.getBoundingClientRect(); // fuerza el reflow: sin esto el navegador junta los dos estados y no hay animación
    ficha.style.transition = `transform ${MS_IDA}ms cubic-bezier(.22,.9,.28,1)`;
    ficha.style.transform = "none";
    const t = setTimeout(() => setPanelListo(true), Math.round(MS_IDA * 0.45));
    return () => clearTimeout(t);
  }, [modalProduct]);

  /** Cierra devolviendo la foto a su tarjeta. Si la tarjeta ya no está a la
      vista —porque scrolleaste—, se desvanece: volar hacia afuera se lee como
      un error. */
  const cerrarFicha = useCallback(() => {
    const ficha = fichaRef.current, foto = fotoFichaRef.current, desde = origenRef.current;
    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const vuelo = (!quieto && ficha && foto && tarjetaVisible(desde))
      ? calcularVuelo(desde!.getBoundingClientRect(), foto.getBoundingClientRect(), ficha.getBoundingClientRect())
      : null;

    const terminar = () => { setModalProduct(null); setLightboxSrc(null); origenRef.current = null; };
    if (!ficha || !vuelo) { terminar(); return; }

    setPanelListo(false);
    ficha.style.transition = `transform ${MS_VUELTA}ms cubic-bezier(.4,0,.7,.2)`;
    ficha.style.transform = vuelo.transform;
    setTimeout(terminar, MS_VUELTA);
  }, [setModalProduct, setLightboxSrc]);

  function openInquiry(product: StorefrontProduct) {
    setModalProduct(null);
    setInquiryMessage(`Hola, me interesa "${product.name}". ¿Me podés dar más información?`);
    /* La consulta se contesta en la pantalla de Contacto, que ya no es una
       sección de la portada: no alcanza con scrollear. */
    setTimeout(() => vista.irAContacto(), 100);
  }
  function shareProduct(product: StorefrontProduct) {
    /* La dirección de verdad del producto, no `?p=<id>`. El porqué está escrito
       en `urlParaCompartirProducto`. */
    navigator.clipboard.writeText(urlParaCompartirProducto(storeConfig?.slug, product.id)).catch(() => {});
    showToast("¡Link copiado al portapapeles!");
  }
  function whatsappShare(product: StorefrontProduct) {
    const phone = storeConfig?.whatsapp?.number?.replace(/\D/g, "");
    if (!phone) return;
    const h = new Date().getHours();
    const saludo = h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
    const text = `${saludo}! Me interesa el producto "${product.name}". ¿Me podés dar más información?`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
  }

  // Auto-open modal desde URL ?p=productId (D-05)
  useEffect(() => {
    if (!products.length) return;
    const productId = new URLSearchParams(window.location.search).get("p");
    if (!productId) return;
    const found = products.find(p => p.id === productId);
    if (found) openModal(found);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const ANNOUNCEMENT_BAR_H = 36;
  const promoBannerEnabled = storeConfig?.promoBanner?.enabled !== false;
  const announcementMessages = (storeConfig?.promoBanner?.messages?.filter(m => m.trim()) ?? []).length > 0
    ? storeConfig!.promoBanner!.messages!.filter(m => m.trim())
    : announcementMessages_DEFAULT;
  const showAnnouncement = promoBannerEnabled && announcementVisible;
  const announcementBarHeight = showAnnouncement ? ANNOUNCEMENT_BAR_H : 0;

  useScrollReveal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Dos medidas, no una.

     `isMobile` (<768) decide el DISEÑO de todo el template: las grillas, los
     paddings, si el menú es hamburguesa. `navApretada` decide solo el aire DE LA
     BARRA, y existe por una franja medida: entre 768 y 819 de ancho la barra usa
     el diseño de escritorio y NO ENTRA. Medido en la Aurora de origin/main a 768:
     el grupo de íconos de la derecha terminaba en 819 —51px afuera de la pantalla—
     y dos botones quedaban inalcanzables: Favoritos y la cuenta.

     No se sube el corte de `isMobile`: eso cambiaría el layout entero del template
     en toda esa franja, que es la de una tablet parada. Lo que no entra es la
     barra, así que se achica la barra. */
  const [navApretada, setNavApretada] = useState(false);
  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768);
      // 1060 y no 980: con la letra propia (Sora y Unbounded, más anchas que
      // Helvetica) el menú chocaba con los íconos a 980. Medido el 03/10/26.
      setNavApretada(window.innerWidth < 1060);
    };
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

  /* Cada cuanto rota el MENSAJE de la barra de promocion. Lo elige la duena;
     antes eran 3,5 segundos escritos a mano en los nueve templates que la
     dibujan. Ojo que NO es el carrusel de fotos: ese es `carruselMs`. */
  const msBarra = barraMs(storeConfig?.promoBanner?.intervalMs);
  useEffect(() => {
    if (!showAnnouncement) return;
    const interval = setInterval(() => {
      setAnnouncementIdx(i => (i + 1) % announcementMessages.length);
    }, msBarra);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAnnouncement, msBarra]);

  const changeGender = (g: string | null) => {
    setActiveGender(g);
  };

  /** Ver `catalogoTieneGeneros`: el filtro Mujer/Hombre solo aparece si el
   *  catálogo real tiene de los dos. Si no, son dos botones que no filtran. */
  const hayGeneros = useMemo(() => catalogoTieneGeneros(products), [products]);
  /* Y el que decide DÓNDE se apoya el menú, que es una pregunta distinta.
     `hayGeneros` sale de los productos, y los productos llegan por `fetch`
     después del primer dibujado: hasta que lleguen contesta "no" en todas las
     tiendas. Como sin género el grupo de "Categorías" se va contra la derecha,
     el menú se dibujaba a la derecha y se corría al centro un segundo después.
     Medido en Amaranta: 382 píxeles, en la barra de arriba, apenas entrás.
     `tieneGeneros` lo contesta el SERVIDOR, que tiene el catálogo en la mano
     antes de dibujar nada. Los botones y el filtro siguen colgados de
     `hayGeneros`: si los dos no coincidieran, lo peor que pasa es que quede un
     hueco: nunca dos botones que filtran la nada.
     Sin respuesta del servidor —la previa del editor, la galería suelta— cae a
     lo de siempre. */
  const generosParaElMenu = storeConfig?.tieneGeneros ?? hayGeneros;
  /* Mientras el navegador todavía no confirmó los géneros, los dos botones
     ocupan su lugar pero no se ven ni se pueden tocar. Reservar el hueco es la
     otra mitad del arreglo: sin esto el grupo entero se ensancha cuando
     aparecen, y como el menú se reparte con `space-between`, "Categorías"
     igual se corría —medido, 74px—. Con el hueco puesto no se mueve nada:
     los botones se encienden donde ya estaban. */
  const esperandoGeneros: React.CSSProperties = hayGeneros ? {} : { opacity: 0, pointerEvents: "none" };

  const allFiltered = useMemo(() => products.filter(p => {
    // `hayGeneros` también acá: si el catálogo cambia y el filtro desaparece,
    // un `activeGender` viejo dejaría la tienda filtrada sin nada que lo apague.
    if (hayGeneros && activeGender && p.gender !== activeGender && p.gender !== "unisex") return false;
    return true;
  }), [products, hayGeneros, activeGender]);
  /* La portada muestra las primeras VISTOS_EN_PORTADA; el resto está en el
     catálogo. Antes había acá un estado de categoría, subcategoría y "ver más"
     que nunca cambiaba (AU-10): filtrar por categoría es del catálogo. */
  const filtered    = allFiltered.slice(0, VISTOS_EN_PORTADA);

  /* ─ Colores base ─ */
  const G  = storeConfig?.colors.accent ?? "#8b5cf6";  // violeta de la escena
  const BG = "#06070d";  // el fondo de la escena
  const S  = "#0e0f1a";  // superficie apenas levantada
  const T  = "#f2f2f7";  // tinta
  // El texto que va ARRIBA de un relleno pintado con el acento. Viaja en
  // `cartTheme` al CartDrawer y al CheckoutModal compartidos, asi que si esta mal
  // se rompe el carrito y el checkout enteros.
  //
  // Estaba INVERTIDO: `getContrastColor(X) === "light"` significa "sobre X va texto
  // CLARO", y la rama devolvia el oscuro. Con el acento de fabrica de este template
  // daba un contraste ilegible. `textoSobre` mide con el ratio real de WCAG y no
  // puede equivocarse de lado.
  const accentText = textoSobre(G);
  const textoSobreAcento = accentText;

  /* ── Filos y luces ──────────────────────────────────────────────────────────
     Aurora nació de Fashion Noir y le quedaron cuarenta restos de su dorado
     —rgba(201,168,76,…)— y de su blanco crema. En una tienda violeta se veían
     amarillentos. Ahora hay dos cosas distintas:
       · el FILO: la línea fina de estructura (bordes, divisores). Es neutro,
         como el canto de las piezas de vidrio, y no compite con el acento.
       · la LUZ: los estados (lo elegido, el hover, los rótulos). Sale del acento
         que eligió la dueña, así que cambia con él. */
  const LINEA        = "rgba(242,242,247,0.08)";
  const LINEA_FUERTE = "rgba(242,242,247,0.14)";
  const luz = (a: number) => conAlfa(G, a);
  /** El acento usado como TEXTO sobre la escena. Si la dueña eligió un color
   *  oscuro, sobre el casi-negro de Aurora no se lee: ahí cae a la tinta.
   *  Se mide con el contraste real (3:1, el de WCAG para texto grande y
   *  rótulos) y no con `getReadableAccentText`: esa compara "claro u oscuro"
   *  y manda a blanco hasta el violeta de fábrica, que se lee perfecto. */
  const GT = contrasteWCAG(G, BG) >= 3 ? G : T;
  /* El precio rebajado y el tachado, iguales en la grilla y en la ficha. En la
     ficha eran #dc2626 y #444 —colores de un template CLARO—: el tachado, gris
     oscuro sobre casi negro, no se veía, y el "% OFF" era una pastilla verde
     clara pegada en la escena oscura. */
  const REBAJA  = "#f87171";
  /* Un botón que no se puede apretar se ve apagado, no "violeta clarito con
     letra negra": eso parecía otro color de botón, no uno deshabilitado. */
  const APAGADO_FONDO = "rgba(242,242,247,0.08)";
  const APAGADO_TEXTO = "rgba(242,242,247,0.38)";
  const TACHADO = "rgba(242,242,247,0.42)";
  /** Los menús que se abren arriba de la página: vidrio OSCURO. El de las
   *  tarjetas es casi transparente y sobre una foto el texto no se lee. */
  const vidrioMenu: React.CSSProperties = {
    background:"rgba(14,15,26,0.9)", backdropFilter:"blur(18px) saturate(150%)",
    WebkitBackdropFilter:"blur(18px) saturate(150%)", border:`1px solid ${LINEA_FUERTE}`,
    borderRadius:14, overflow:"hidden", boxShadow:"0 18px 50px rgba(0,0,0,0.55)",
  };

  // `forma`: las píldoras y el brillo de Aurora también en el carrito y el
  // checkout, que son los compartidos (la cuenta es una sola; la forma, de cada uno).
  const cartTheme: CartTheme = { BG, S, T, MID:"#555555", border:"rgba(242,242,247,0.1)", accent:G, accentText, serif:TITULO,
    forma: { boton:999, campo:14, foto:12, brillo:`0 0 30px ${luz(0.45)}` } };
  const nosotrosImageOv  = storeConfig?.imageOverrides?.["nosotrosImage"];
  /* La misma regla que la foto del hero: si la dueña no subió una, va una de
     SUS productos (la segunda con foto, para no repetir la del hero). Antes caía
     en una foto de stock de picsum, o sea un desconocido haciéndose pasar por la
     historia de la marca. Sin ninguna foto, el panel muestra la luz de la
     escena en vez de una imagen. */
  const nosotrosImageUrl: string | null = nosotrosImageOv?.url
    ?? (() => { const fotos = products.map(p => p.images[0]).filter((u): u is string => !!u); return fotos[1] ?? fotos[0] ?? null; })();
  const nosotrosPosX     = nosotrosImageOv?.posX ?? 50;
  const nosotrosPosY     = nosotrosImageOv?.posY ?? 50;

  // Section background images (stored as "sectionbg_<field>" in imageOverrides)
  const heroBgImg      = storeConfig?.imageOverrides?.["sectionbg_bgHero"];
  const statementBgImg = storeConfig?.imageOverrides?.["sectionbg_bgStatement"];
  const contactoBgImg  = storeConfig?.imageOverrides?.["sectionbg_bgContacto"];
  const footerBgImg    = storeConfig?.imageOverrides?.["sectionbg_bgFooter"];

  /* ── Lo que come la vidriera ────────────────────────────────────────────────
     Las fotos del hero: la que subió la tienda, y si no subió ninguna, las de
     sus propios productos. Nunca una foto de stock — una imagen de un
     desconocido haciéndose pasar por la colección es peor que no tener foto. */
  const heroUrl = heroBgImg?.url;
  /* La portada muestra UNA de dos cosas, la que la dueña eligió en el editor
     (`portadaModo`, ver `aurora/ElegirPortada`):
     - "productos": hasta cuatro productos con foto, cada uno con su tarjeta de
       nombre, precio y "Ver". Los elige ella (`heroPiezas`) o van los primeros.
     - "foto": su foto, sola y a pantalla completa, sin cuadraditos ni tarjeta.
     Antes se mezclaban (la foto primero y los productos después); ya no. Si
     eligió foto pero todavía no subió ninguna, siguen los productos: una
     portada vacía es peor. */
  const modoPortada = leerModoPortada(textOverrides["portadaModo"]?.text, !!heroUrl);
  const conFotoPropia = modoPortada === "foto" && !!heroUrl;
  const productosConFoto = useMemo(() => products.filter(p => p.images[0]), [products]);
  const heroElegidos = leerPiezasPortada(textOverrides["heroPiezas"]?.text);
  /* Sin useMemo a mano en estos dos: el compilador de React los memoiza solo,
     y con el manual (dependiendo de una clave armada con la lista de
     elegidos) se salteaba la optimización de todo el componente. */
  const elegidosConFoto = heroElegidos.map(id => productosConFoto.find(p => p.id === id)).filter((p): p is StorefrontProduct => !!p);
  const heroProductos = conFotoPropia ? [] : elegidosConFoto.length ? elegidosConFoto : productosConFoto.slice(0, MAX_PORTADA);
  const heroFotos = conFotoPropia && heroUrl ? [heroUrl] : heroProductos.map(p => p.images[0]);

  /* Los dos mazos del coverflow. Antes esto eran TRES baldosas de categoría
     elegidas a mano en el editor; ahora entran todas las que la tienda tenga de
     verdad, y el mazo se baraja con los destacados. */
  /* Las FOTOS van memorizadas; los botones se atan afuera.
     Están separados porque lo que cuesta es armar las piezas —recorrer los
     productos y contar por categoría— y eso sólo cambia cuando cambia el
     catálogo. En cambio `onElegir` ahora llama a `abrirCatalogo`, que nace de
     nuevo en cada render (el hook de pantallas devuelve funciones nuevas cada
     vez): metido adentro del memo lo obligaría a rehacerse siempre, y el aviso
     del lint sería correcto. Atando el botón afuera, el memo mantiene su lista de
     dependencias honesta y el trabajo caro se sigue salteando. */
  const piezasVidriera = useMemo(() => {
    const conFoto = products.filter(p => p.images[0]);
    return {
      destacados: conFoto.slice(0, 8).map(p => ({
        id: p.id,
        imagen: p.images[0],
        titulo: p.name,
        subtitulo: ocultarPrecios ? "Consultá precio" : fmt(p.price),
        etiqueta: p.category && p.category !== "general" ? p.category : undefined,
      })),
      categorias: categoriasBaldosa
        .map(cat => {
          const dela = conFoto.find(p => p.category === cat);
          const cuantos = products.filter(p => p.category === cat).length;
          return dela
            ? { id: cat, imagen: dela.images[0], titulo: cat, subtitulo: `${cuantos} ${cuantos === 1 ? "producto" : "productos"}` }
            : null;
        })
        // Una categoría sin ninguna foto no puede estar en una pista que ES
        // fotos: quedaría un panel gris en el medio de la fila.
        .filter((x): x is NonNullable<typeof x> => x !== null),
    };
  }, [products, categoriasBaldosa, ocultarPrecios, fmt]);

  /* Un arreglo nuevo por render no le mueve nada a `Coverflow`: en qué mazo y en
     qué tarjeta está parado lo guarda en `useState`, y sus dos efectos van con
     lista de dependencias vacía. Se miró antes de dejarlo así.
     Un mazo vacío no se ofrece: el botón para cambiar de mazo llevaría a nada. */
  const mazosTodos = [
    {
      id: "destacados",
      etiqueta: "Destacados",
      onElegir: (id: string) => {
        const p = products.find(x => x.id === id);
        if (p) openModal(p);
      },
      piezas: piezasVidriera.destacados,
    },
    {
      id: "categorias",
      etiqueta: "Categorías",
      onElegir: (cat: string) => abrirCatalogo({ categoria: cat }),
      piezas: piezasVidriera.categorias,
    },
  ].filter(m => m.piezas.length > 0);

  /* Con qué mazo arranca la vidriera, o si muestra uno solo. Lo elige la dueña
     en el editor y se guarda como un override más, igual que los íconos.
     Si eligió un mazo que la tienda no puede llenar ("sólo categorías" sin
     ninguna categoría con foto), se muestra lo que haya: la portada no se queda
     sin vidriera por una elección que hoy no tiene con qué cumplirse. */
  const modoVidriera = MODOS_VIDRIERA.some(m => m.valor === textOverrides["vidrieraMazos"]?.text)
    ? textOverrides["vidrieraMazos"]!.text as ModoVidriera
    : "destacados";
  const primero = modoVidriera.endsWith("categorias") ? "categorias" : "destacados";
  const ordenados = [...mazosTodos].sort((a, b) => (a.id === primero ? -1 : 0) - (b.id === primero ? -1 : 0));
  const mazosVidriera = modoVidriera.startsWith("solo-") && ordenados[0]?.id === primero
    ? ordenados.slice(0, 1)
    : ordenados;

  /* Que mostrar en el pie: un link a un filtro vacio es un link que miente.
     En el editor se muestran igual, para que la duenia vea que existen. */
  const hayOfertas = isPreview || products.some(p => p.comparePrice && p.comparePrice > p.price);
  const hayPromos  = isPreview || products.some(p => {
    const d = resolveProductPromo(p, promotions);
    return d.hasPriceDrop || d.nxm || d.freeShipping || d.pctOff != null;
  });

  const scn = storeConfig?.sectionColors ?? {};
  const garantiasBg    = scn["bgGarantias"]   ?? BG;
  const garantiasText  = getContrastColor(garantiasBg)   === "light" ? T : "#06070d";
  const statementBg    = scn["bgStatement"]   ?? BG;
  const statementText  = statementBgImg?.url
    ? (statementBgImg.overlayType === "light" ? "#06070d" : T)
    : (getContrastColor(statementBg) === "light" ? T : "#06070d");
  const nosotrosPanelBg= scn["bgNosotrosPanel"] ?? S;
  const nosotrosPanelText = getContrastColor(nosotrosPanelBg) === "light" ? T : "#06070d";
  const footerBg       = scn["bgFooter"]      ?? BG;
  const footerText     = footerBgImg?.url
    ? (footerBgImg.overlayType === "light" ? "#06070d" : T)
    : (getContrastColor(footerBg) === "light" ? T : "#06070d");
  const footerSubtleBorder = footerText === T ? "rgba(242,242,247,0.15)" : "rgba(0,0,0,0.15)";
  const footerInputBg  = footerText === T ? S : "rgba(0,0,0,0.06)";
  const productosBg    = scn["bgProductos"]   ?? BG;
  const productosText  = getContrastColor(productosBg)  === "light" ? T : "#06070d";
  const productosMid   = getContrastColor(productosBg)  === "light" ? "#888" : "#555";
  /** Los colores de la pieza de producto, iguales en la portada y en el catálogo. */
  const tintaTarjeta: TintaTarjeta = { G, GT, T, S, texto: productosText, mid: productosMid, rebaja: REBAJA };
  /** La escena (fondo, tinta, filos y luz) para las piezas de Aurora que viven en su propio archivo. */
  const escenaAurora: EscenaCatalogo = { BG, T, G, GT, LINEA, LINEA_FUERTE, luz, textoSobreAcento };
  const contactoBg     = scn["bgContacto"]    ?? BG;
  const contactoText   = contactoBgImg?.url
    ? (contactoBgImg.overlayType === "light" ? "#06070d" : T)
    : (getContrastColor(contactoBg) === "light" ? T : "#06070d");
  const contactoInputBg     = contactoText === T ? S : "rgba(0,0,0,0.06)";
  const contactoInputBorder = contactoText === T ? LINEA_FUERTE : "rgba(0,0,0,0.12)";

  return (
    /* `data-template-raiz`: de acá arranca `useVistaTemplate` para encontrar quién
       scrollea de verdad. En la tienda es la ventana; en el EDITOR el template vive
       adentro de un panel con scroll propio, y sin esto el catálogo aparecía a
       mitad de página, con el título arriba fuera de vista. */
    <div data-template-raiz className={CLASES_LETRA} style={{ fontFamily:TEXTO, background:BG, color:T, minHeight:"100vh",
      /* Dos toques seguidos en un botón que cambia de pantalla terminaban adentro
         de cualquier cosa: la pantalla cambia al instante y abajo del dedo queda
         otra. Ver el candado en `useVistaTemplate`. */
      pointerEvents: vista.cambiandoPantalla ? "none" : undefined }}>
      <style>{`
        .au-ofertas-row { scrollbar-width:none }
        .au-ofertas-row::-webkit-scrollbar { display:none }
        @keyframes au-wa-pulse { 0% { box-shadow:0 4px 20px rgba(37,211,102,0.4), 0 0 0 0 rgba(37,211,102,0.55); } 70% { box-shadow:0 4px 20px rgba(37,211,102,0.4), 0 0 0 14px rgba(37,211,102,0); } 100% { box-shadow:0 4px 20px rgba(37,211,102,0.4), 0 0 0 0 rgba(37,211,102,0); } }
        .au-wa-fab { background:linear-gradient(135deg,#2be374,#1fae57); animation:au-wa-pulse 2.4s ease-out infinite; }
        .au-wa-fab:hover { animation-play-state:paused; }
        .au-zoom-img { transition:transform 0.5s ease; }
        .au-zoom:hover .au-zoom-img { transform:scale(1.06); }
      `}</style>

      {/* ── ANNOUNCEMENT BAR ───────────────────────────────── */}
      {showAnnouncement && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top:0, left: isPreview ? undefined : 0, right: isPreview ? undefined : 0, zIndex: isPreview ? CAPAS.previaNavAlto : 110, height:ANNOUNCEMENT_BAR_H, background:G, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:12, fontWeight:600, color:textoSobreAcento, letterSpacing:1, display:"block", maxWidth:"100%", boxSizing:"border-box", padding:"0 40px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            <EditableZone field="announcementText" label="Barra de anuncios" noBadge>{announcementMessages[announcementIdx]}</EditableZone>
          </span>
          {/* Dots */}
          {/* 28×12 con la rayita abajo, como en Aire (05/10/26): de 6×4, cambiar de
              anuncio con el dedo era suerte. Más alto que 12 taparía el texto. */}
          <div style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)", display:"flex", gap:5 }}>
            {announcementMessages.map((_, i) => (
              <button key={i} onClick={() => setAnnouncementIdx(i)} aria-label={`Anuncio ${i + 1}`}
                style={{ background:"none", border:"none", padding:"0 0 4px", width:28, height:12, display:"grid", placeItems:"end center", cursor:"pointer" }}>
                <span aria-hidden style={{ display:"block", width: i === announcementIdx ? 16 : 6, height:3, borderRadius:999, background: i === announcementIdx ? textoSobreAcento : conAlfa(textoSobreAcento, 0.35), transition:"all 0.3s" }}/>
              </button>
            ))}
          </div>
          {/* Close */}
          <button onClick={() => setAnnouncementVisible(false)} aria-label="Cerrar anuncio"
            style={{ position:"absolute", right:4, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:textoSobreAcento, cursor:"pointer", fontSize:16, lineHeight:1, opacity:0.7, width:36, height:36, display:"grid", placeItems:"center", padding:0 }}>×</button>
        </div>
      )}

      {/* ── TOAST ──────────────────────────────────────────── */}
      {toastMsg && (
        // Una cápsula de vidrio con un punto de luz, como el resto de Aurora (era
        // un rectángulo del acento lleno).
        <div role="status" style={{ position:"fixed", bottom:32, left:"50%", transform:"translateX(-50%)", display:"flex", alignItems:"center", gap:10,
          background:"rgba(14,15,26,0.82)", backdropFilter:"blur(18px) saturate(150%)", WebkitBackdropFilter:"blur(18px) saturate(150%)",
          border:`1px solid ${luz(0.45)}`, color:T, borderRadius:999, padding:"11px 22px 11px 14px", fontSize:13, fontWeight:600,
          zIndex:CAPAS.barraAccion, maxWidth:"calc(100vw - 32px)", boxShadow:`0 14px 40px rgba(0,0,0,0.5), 0 0 30px ${luz(0.3)}` }}>
          <span aria-hidden style={{ width:22, height:22, flexShrink:0, borderRadius:999, display:"grid", placeItems:"center", background:G, color:textoSobreAcento, fontSize:12, boxShadow:`0 0 14px ${luz(0.8)}` }}>✓</span>
          <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{toastMsg}</span>
        </div>
      )}

      {/* ── SEARCH OVERLAY ─────────────────────────────────── */}
      {/* El buscador va a SU capa, no a la de la barra.

          Estaban las dos en `CAPAS.nav`, y al empatar gana la que se dibuja
          ultima — que es la barra. O sea que la barra le quedaba ENCIMA al
          buscador, y como la × del buscador va arriba a la derecha, terminaba
          justo abajo del boton del carrito: se la tocaba y el clic se lo comia
          la barra. Medido con el navegador: el clic sobre la × no llegaba nunca.
          `CAPAS.buscador` existe para esto exactamente y no la usaba nadie.

          Y ahora cierra tocando afuera. Antes no, asi que con la × tapada la
          unica salida era Escape — que nadie adivina. Se compara `target` con
          `currentTarget` para que tocar el campo o un resultado no cuente como
          "afuera". */}
      {searchOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) setSearchOpen(false); }} style={{ position:"fixed", inset:0, zIndex:CAPAS.buscador, background:"rgba(10,10,10,0.92)", backdropFilter:"blur(8px)", display:"flex", flexDirection:"column", alignItems:"center", paddingTop:120 }}>
          <button onClick={() => setSearchOpen(false)} aria-label="Cerrar búsqueda"
            style={{ position:"absolute", top:24, right:32, background:"none", border:"none", color:T, fontSize:28, cursor:"pointer", lineHeight:1 }}>×</button>
          <div style={{ width:"100%", maxWidth:640, padding:"0 24px" }}>
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={"Buscar productos..."}
              style={{ width:"100%", background:"transparent", border:"none", borderBottom:`2px solid ${G}`, color:T, fontSize:24, padding:"12px 0", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}
            />
          </div>
          {searchResults.length > 0 && (
            <div style={{ width:"100%", maxWidth:640, padding:"24px 24px 0", overflowY:"auto", maxHeight:"calc(100vh - 260px)" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
                {searchResults.map(p => (
                  <button key={p.id} onClick={() => openModal(p)}
                    style={{ background:"none", border:`1px solid ${LINEA_FUERTE}`, cursor:"pointer", textAlign:"left", padding:0, color:T }}>
                    <div style={{ position:"relative", width:"100%", aspectRatio:"3/4", background:S }}>
                      {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes="(max-width: 768px) 33vw, 200px" style={{ objectFit:"cover" }}/>}
                    </div>
                    <div style={{ padding:"10px 12px" }}>
                      <p style={{ fontSize:12, margin:"0 0 4px", fontWeight:500 }}>{p.name}</p>
                      <PromoPrice product={p} promotions={promotions} fmt={fmt} accent={G}
                        priceSize={13} compareSize={11} weight={700} ocultarPrecios={ocultarPrecios} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {searchQuery.trim().length > 0 && searchResults.length === 0 && (
            <p style={{ color:"rgba(242,242,247,0.65)", marginTop:32, fontSize:14 }}>Sin resultados para &quot;{searchQuery}&quot;</p>
          )}
        </div>
      )}

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <nav style={{ position: isPreview ? "sticky" : "fixed", top:announcementBarHeight, left: isPreview ? undefined : 0, right: isPreview ? undefined : 0, zIndex: isPreview ? CAPAS.previaNav : 100, transition:"background 0.4s, top 0.3s", background: (isPreview || scrolled) ? "rgba(6,7,13,0.86)" : "transparent", backdropFilter: (isPreview || scrolled) ? "blur(16px) saturate(140%)" : "none", borderBottom: (isPreview || scrolled) ? `1px solid rgba(255,255,255,0.08)` : "none" }}>
        {/* Sin el `maxWidth:1280`: el nav va de borde a borde, como el hero que
            tiene pegado abajo. Ver el comentario largo en `ChicParis.tsx`, que es la
            misma decisión para los tres templates. */}
        <div style={{ padding: navApretada ? "0 14px" : "0 32px", height:72, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <button onClick={() => irASeccion("hero")} style={{ background:"none", border:"none", cursor:"pointer", fontFamily:TITULO, fontSize: navApretada ? 15 : 18, fontWeight:400, letterSpacing: navApretada ? 2 : 5, color:T, maxWidth: navApretada ? 150 : 220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              <EditableZone field="storeName" label="Nombre de la tienda">{storeConfig?.storeName ?? "AURORA"}</EditableZone>
            </button>
            <VerifiedIconButton isVerified={storeConfig?.isVerified} info={storeConfig?.verifiedInfo} />
          </div>
          {/* Con géneros este grupo lleva Categorías + Mujer + Hombre y el
              `space-between` del padre lo deja centrado, que es donde va bien. Sin
              géneros queda "Categorías" sola en el medio de la barra, lejos de
              todo. El `marginLeft:auto` se come el espacio libre antes de que el
              `space-between` reparta, así que el grupo termina pegado al de la
              derecha. Cambia dónde se apoya el menú, no el menú. */}
          {!isMobile && <div style={{ display:"flex", gap: navApretada ? 16 : 28, alignItems:"center", minWidth:0,
            ...(generosParaElMenu ? {} : { marginLeft:"auto", marginRight:28 }) }}>
            {/* CATEGORÍAS dropdown */}
            <div style={{ position:"relative" }}
              onMouseEnter={() => setHoveredNavCat("__open__")}
              onMouseLeave={() => setHoveredNavCat(null)}>
              <button style={{ background:"none", border:"none", color:T, fontSize:11, letterSpacing: navApretada ? 1.2 : 3, cursor:"pointer", fontWeight:500, textTransform:"uppercase", opacity:0.8, display:"flex", alignItems:"center", gap:5 }}
                onMouseEnter={e => { e.currentTarget.style.opacity="1"; e.currentTarget.style.color=G; }}
                onMouseLeave={e => { e.currentTarget.style.opacity="0.8"; e.currentTarget.style.color=T; }}>
                Categorías <span style={{ fontSize:9, opacity:0.7 }}>▾</span>
              </button>
              {hoveredNavCat && (() => {
                const activeCat = hoveredNavCat === "__open__" ? (categoryList[0] ?? null) : hoveredNavCat;
                const activeSubs = activeCat ? (subcategoriesFor[activeCat] || []) : [];
                return (
                  <div style={{ position:"absolute", top:"100%", left:0, display:"flex", ...vidrioMenu, zIndex:CAPAS.panel }}>
                    {/* columna izquierda: categorías */}
                    <div style={{ minWidth:200, padding:"10px 0", borderRight: activeSubs.length > 0 ? `1px solid ${LINEA}` : "none" }}>
                      {categoryList.map(cat => {
                        const subs = subcategoriesFor[cat] || [];
                        return (
                          <button key={cat}
                            onMouseEnter={() => setHoveredNavCat(cat)}
                            onClick={() => { abrirCatalogo({ categoria: cat }); setHoveredNavCat(null); }}
                            style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", background: activeCat===cat ? luz(0.08) : "none", border:"none", color: activeCat===cat ? GT : T, padding:"9px 18px", fontSize:11, textAlign:"left", cursor:"pointer", letterSpacing:2, textTransform:"uppercase", transition:"background 0.15s" }}>
                            {cat}
                            {subs.length > 0 && <span style={{ opacity:0.5, fontSize:10 }}>›</span>}
                          </button>
                        );
                      })}
                    </div>
                    {/* columna derecha: subcategorías de la categoría activa */}
                    {activeSubs.length > 0 && (
                      <div style={{ minWidth:190, padding:"10px 0" }}>
                        <p style={{ margin:0, padding:"4px 18px 8px", fontSize:9, letterSpacing:2, textTransform:"uppercase", color:luz(0.55) }}>{activeCat}</p>
                        {activeSubs.map(sub => (
                          <button key={sub} onClick={() => { abrirCatalogo({ categoria: activeCat ?? "", subcategoria: sub }); setHoveredNavCat(null); }}
                            style={{ display:"block", width:"100%", background:"none", border:"none", color:T, padding:"8px 18px", fontSize:11, textAlign:"left", cursor:"pointer", letterSpacing:1, textTransform:"uppercase", transition:"background 0.15s" }}
                            onMouseEnter={e => (e.currentTarget.style.background=luz(0.08))}
                            onMouseLeave={e => (e.currentTarget.style.background="none")}>
                            {sub}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            {generosParaElMenu && (
              <>
                {/* MUJER */}
                <button onClick={() => { changeGender(activeGender === "mujer" ? null : "mujer"); irASeccion("productos"); }}
                  style={{ background:"none", border:"none", fontSize:11, letterSpacing: navApretada ? 1.2 : 3, cursor:"pointer", fontWeight:500, textTransform:"uppercase", transition:"opacity 0.2s, color 0.2s", color: activeGender==="mujer" ? GT : T, opacity: activeGender==="mujer" ? 1 : 0.8, ...esperandoGeneros }}
                  onMouseEnter={e => { e.currentTarget.style.opacity="1"; if(activeGender!=="mujer") e.currentTarget.style.color=G; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity=activeGender==="mujer"?"1":"0.8"; if(activeGender!=="mujer") e.currentTarget.style.color=T; }}>
                  Mujer
                </button>
                {/* HOMBRE */}
                <button onClick={() => { changeGender(activeGender === "hombre" ? null : "hombre"); irASeccion("productos"); }}
                  style={{ background:"none", border:"none", fontSize:11, letterSpacing: navApretada ? 1.2 : 3, cursor:"pointer", fontWeight:500, textTransform:"uppercase", transition:"opacity 0.2s, color 0.2s", color: activeGender==="hombre" ? GT : T, opacity: activeGender==="hombre" ? 1 : 0.8, ...esperandoGeneros }}
                  onMouseEnter={e => { e.currentTarget.style.opacity="1"; if(activeGender!=="hombre") e.currentTarget.style.color=G; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity=activeGender==="hombre"?"1":"0.8"; if(activeGender!=="hombre") e.currentTarget.style.color=T; }}>
                  Hombre
                </button>
              </>
            )}
            {/* NOSOTROS / CONTACTO */}
            {[["Nosotros","nosotros"],["Contacto","contacto"]].map(([label, target]) => (
              <button key={label} onClick={() => irAPantalla(target)}
                style={{ background:"none", border:"none", color:T, fontSize:11, letterSpacing: navApretada ? 1.2 : 3, cursor:"pointer", fontWeight:500, textTransform:"uppercase", opacity:0.8, transition:"opacity 0.2s, color 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.opacity="1"; e.currentTarget.style.color=G; }}
                onMouseLeave={e => { e.currentTarget.style.opacity="0.8"; e.currentTarget.style.color=T; }}>
                {label}
              </button>
            ))}
          </div>}
          <div style={{ display:"flex", alignItems:"center", gap: navApretada ? 8 : 12, flexShrink:0 }}>
            {/* Search icon */}
            <button onClick={() => setSearchOpen(true)} aria-label="Buscar" style={{ background:"none", border:"none", color:T, cursor:"pointer", padding:8, margin:-4, display:"flex", alignItems:"center" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            {/* Follow button */}
            {pushBell && storeConfig?.showPushBell && !isPreview && (
              <StoreFollowButton storeSlug={storeConfig?.slug ?? ""} color={T} size={20} />
            )}
            {/* Bell de novedades */}
            {pushBell && storeConfig?.showPushBell && !isPreview && (
              <button onClick={pushBell.openDrawer} aria-label="Novedades de la tienda" style={{ position:"relative", background:"none", border:"none", color:T, cursor:"pointer", padding:8, margin:-4, display:"flex", alignItems:"center" }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill={pushBell.followState === "following" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {pushBell.hasNew && <span style={{ position:"absolute", top:2, right:2, width:10, height:10, background:"#ef4444", borderRadius:"50%", border:"2px solid #06070d" }} />}
              </button>
            )}
            {/* Maquetas de la campanita: solo en el editor. En la demo publica de
                /plantillas no hay tienda que configurar. */}
            {enEditor && (
              <>
                {storeConfig?.showPushBell ? (
                  <button title="Los clientes pueden seguir tu tienda desde acá" style={{ position:"relative", padding:8, margin:-4, display:"flex", alignItems:"center", opacity:0.85, background:"none", border:"none", color:T, cursor:"default" }}>
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                  </button>
                ) : (
                  <button onClick={storeConfig?.onPreviewBellClick} title="🔒 Solo Plan Plus — tocá para activar" style={{ position:"relative", padding:8, margin:-4, display:"flex", alignItems:"center", opacity:0.38, background:"none", border:"none", color:T, cursor:"pointer" }}>
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                    <span style={{ position:"absolute", top:0, right:0, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
                  </button>
                )}
                {storeConfig?.showPushBell ? (
                  <button onClick={storeConfig.onPreviewBellClick} title="Campanita de novedades — clic para configurar" style={{ position:"relative", padding:8, margin:-4, display:"flex", alignItems:"center", opacity:0.85, background:"none", border:"none", color:T, cursor:"pointer" }}>
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  </button>
                ) : (
                  <button onClick={storeConfig?.onPreviewBellClick} title="🔒 Solo Plan Plus — tocá para activar" style={{ position:"relative", padding:8, margin:-4, display:"flex", alignItems:"center", opacity:0.38, background:"none", border:"none", color:T, cursor:"pointer" }}>
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    <span style={{ position:"absolute", top:0, right:0, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
                  </button>
                )}
              </>
            )}
            {/* Favorites icon */}
            {!isMobile && <button onClick={() => { setFavoritesOpen(true); setUserDropdownOpen(false); setCartOpen(false); }} aria-label="Favoritos" style={{ background:"none", border:"none", color:T, cursor:"pointer", position:"relative", padding:8, margin:-4, display:"flex", alignItems:"center" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill={favorites.length > 0 ? G : "none"} stroke={favorites.length > 0 ? G : "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {favorites.length > 0 && <span style={{ position:"absolute", top:-6, right:-6, background:G, color:textoSobreAcento, borderRadius:"50%", width:18, height:18, fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{favorites.length}</span>}
            </button>}
            {/* User icon */}
            <div ref={userDropdownRef} style={{ position:"relative" }}>
              <button onClick={() => { setUserDropdownOpen(o => !o); setFavoritesOpen(false); }} aria-label="Mi cuenta" style={{ background:"none", border:"none", color:T, cursor:"pointer", padding:8, margin:-4, display:"flex", alignItems:"center" }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </button>
              {userDropdownOpen && (
                <div style={{ position:"absolute", top:"calc(100% + 10px)", right:0, ...vidrioMenu, minWidth:190, zIndex:CAPAS.nav }}>
                  {cargando ? (<p style={{ padding:"14px 16px", margin:0, fontSize:12, opacity:0.65 }}>Cargando…</p>) : logueado ? (
                    <>
                      <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:luz(0.6), padding:"10px 16px 4px", margin:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {nombreMostrado}
                      </p>
                      <a href={panelHref} onClick={() => setUserDropdownOpen(false)}
                        style={{ display:"block", color:T, padding:"10px 16px", fontSize:13, textDecoration:"none", transition:"background 0.2s" }}
                        onMouseEnter={e => (e.currentTarget.style.background=luz(0.08))}
                        onMouseLeave={e => (e.currentTarget.style.background="none")}>{panelLabel}</a>
                      <div style={{ borderTop:`1px solid ${LINEA}`, margin:"4px 0" }}/>
                      <button onClick={() => { if (isPreview) return; setUserDropdownOpen(false); signOut("/"); }}
                        style={{ display:"block", width:"100%", background:"none", border:"none", color:"#f87171", padding:"10px 16px", fontSize:13, textAlign:"left", cursor: isPreview ? "default" : "pointer", opacity: isPreview ? 0.45 : 1, transition:"background 0.2s" }}
                        onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background="rgba(248,113,113,0.08)"; }}
                        onMouseLeave={e => (e.currentTarget.style.background="none")}>Cerrar sesión</button>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:luz(0.6), padding:"10px 16px 4px", margin:0 }}>Mi cuenta</p>
                      <a href={isPreview ? undefined : `/login?redirect=/tienda/${storeConfig?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)}
                        style={{ display:"block", color:T, padding:"10px 16px", fontSize:13, textDecoration:"none", cursor: isPreview ? "default" : "pointer", transition:"background 0.2s" }}
                        onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background=luz(0.08); }}
                        onMouseLeave={e => (e.currentTarget.style.background="none")}>Iniciar sesión</a>
                      <a href={isPreview ? undefined : `/registro?plan=buyer&redirect=/tienda/${storeConfig?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)}
                        style={{ display:"block", color:T, padding:"10px 16px", fontSize:13, textDecoration:"none", cursor: isPreview ? "default" : "pointer", transition:"background 0.2s" }}
                        onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background=luz(0.08); }}
                        onMouseLeave={e => (e.currentTarget.style.background="none")}>Registrarse</a>
                    </>
                  )}
                </div>
              )}
            </div>
            {/* El carrito también ARRIBA en computadora (05/10/26): estaba sólo el
                botón flotante de abajo, y con el carrito lleno el cliente lo buscaba en
                el encabezado. En celular no: no entra, y el flotante queda a mano. */}
            {!isMobile && (
              <button onClick={() => { setCartOpen(true); setUserDropdownOpen(false); setFavoritesOpen(false); }} aria-label={`Carrito, ${cartCount} ${cartCount === 1 ? "producto" : "productos"}`} style={{ background:"none", border:"none", color:T, cursor:"pointer", padding:8, margin:-4, display:"flex", alignItems:"center", position:"relative" }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                {cartCount > 0 && !editMode && <span style={{ position:"absolute", top:-2, right:-4, background:"#e53e3e", color:"#fff", borderRadius:999, minWidth:17, height:17, fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px" }}>{cartCount}</span>}
              </button>
            )}
            {isMobile && (
              <button onClick={() => { setMobileMenuOpen(o => !o); setMobileCatsOpen(false); setMobileOpenCat(null); }} aria-label="Menú" aria-expanded={mobileMenuOpen} style={{ background:"none", border:"none", color:T, cursor:"pointer", padding:8, margin:-4, display:"flex", flexDirection:"column", gap:4, alignItems:"center" }}>
                <span style={{ display:"block", width:20, height:2, background:T, transition:"all 0.3s", transform: mobileMenuOpen ? "rotate(45deg) translate(3px,3px)" : "none" }}/>
                <span style={{ display:"block", width:20, height:2, background:T, transition:"all 0.3s", opacity: mobileMenuOpen ? 0 : 1 }}/>
                <span style={{ display:"block", width:20, height:2, background:T, transition:"all 0.3s", transform: mobileMenuOpen ? "rotate(-45deg) translate(3px,-3px)" : "none" }}/>
              </button>
            )}
          </div>
        </div>
      </nav>
      {isMobile && mobileMenuOpen && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top: isPreview ? 0 : 72 + announcementBarHeight, left:0, right:0, bottom:0, background:BG, zIndex:CAPAS.menuMobile, overflowY:"auto", overscrollBehavior:"contain" }}>
          {/* Categorías — acordeón */}
          {categoryList.length > 0 && (
            <>
              <button onClick={() => setMobileCatsOpen(o => !o)}
                style={{ display:"flex", width:"100%", background:"none", border:"none", borderBottom:`1px solid ${LINEA}`, color:T, padding:"16px 24px", fontSize:12, textAlign:"left", cursor:"pointer", letterSpacing:3, textTransform:"uppercase", alignItems:"center", justifyContent:"space-between" }}>
                Categorías
                <span style={{ fontSize:10, opacity:0.55, transition:"transform 0.2s", transform: mobileCatsOpen ? "rotate(180deg)" : "none", display:"inline-block" }}>▾</span>
              </button>
              {mobileCatsOpen && categoryList.map(cat => {
                const subs = subcategoriesFor[cat] || [];
                return (
                  <Fragment key={cat}>
                    <button onClick={() => {
                      if (subs.length > 0) {
                        setMobileOpenCat(prev => prev === cat ? null : cat);
                      } else {
                        abrirCatalogo({ categoria: cat });
                        setMobileMenuOpen(false); setMobileCatsOpen(false);
                      }
                    }} style={{ display:"flex", width:"100%", background:luz(0.03), border:"none", borderBottom:`1px solid ${LINEA}`, color:T, padding:"13px 24px 13px 40px", fontSize:11, textAlign:"left", cursor:"pointer", letterSpacing:3, textTransform:"uppercase", alignItems:"center", justifyContent:"space-between" }}>
                      {cat}
                      {subs.length > 0 && <span style={{ fontSize:12, opacity:0.5, transition:"transform 0.2s", transform: mobileOpenCat===cat ? "rotate(90deg)" : "none", display:"inline-block" }}>›</span>}
                    </button>
                    {subs.length > 0 && mobileOpenCat === cat && subs.map(sub => (
                      <button key={sub} onClick={() => { abrirCatalogo({ categoria: cat, subcategoria: sub }); setMobileMenuOpen(false); setMobileCatsOpen(false); setMobileOpenCat(null); }}
                        style={{ display:"block", width:"100%", background:luz(0.05), border:"none", borderBottom:`1px solid ${LINEA}`, color:"rgba(242,242,247,0.7)", padding:"11px 24px 11px 60px", fontSize:11, textAlign:"left", cursor:"pointer", letterSpacing:2, textTransform:"uppercase" }}>
                        {sub}
                      </button>
                    ))}
                  </Fragment>
                );
              })}
            </>
          )}
          {hayGeneros && [["Mujer","mujer"],["Hombre","hombre"]].map(([label, g]) => (
            <button key={g} onClick={() => { changeGender(activeGender===g ? null : g); irASeccion("productos"); setMobileMenuOpen(false); }}
              style={{ display:"block", width:"100%", background:"none", border:"none", borderBottom:`1px solid ${LINEA}`, color: activeGender===g ? GT : T, padding:"16px 24px", fontSize:12, textAlign:"left", cursor:"pointer", letterSpacing:3, textTransform:"uppercase" }}>
              {label}
            </button>
          ))}
          {[["Nosotros","nosotros"],["Contacto","contacto"]].map(([label, target]) => (
            <button key={target} onClick={() => { irAPantalla(target); setMobileMenuOpen(false); }}
              style={{ display:"block", width:"100%", background:"none", border:"none", borderBottom:`1px solid ${LINEA}`, color:"rgba(242,242,247,0.6)", padding:"16px 24px", fontSize:12, textAlign:"left", cursor:"pointer", letterSpacing:3, textTransform:"uppercase" }}>
              {label}
            </button>
          ))}
          <button onClick={() => { setFavoritesOpen(true); setMobileMenuOpen(false); setUserDropdownOpen(false); setCartOpen(false); }}
            style={{ display:"block", width:"100%", background:"none", border:"none", color:"rgba(242,242,247,0.6)", padding:"16px 24px", fontSize:12, textAlign:"left", cursor:"pointer", letterSpacing:3, textTransform:"uppercase" }}>
            Favoritos {favorites.length > 0 && `(${favorites.length})`}
          </button>
        </div>
      )}

      {/* ── HERO ────────────────────────────────────────────────────────────
          Antes acá no había foto: el fondo ERA la escena de luz. Se veía bien
          pero no vendía nada — la luz abstracta no muestra el producto, y una
          tienda de ropa tiene fotos. Ahora la foto es el argumento del bloque, y
          por eso Aurora pasó a figurar con `bgHero` en `SECTION_BG_PHOTO`: el
          control de imagen del editor tiene que existir.

          Si la tienda no subió ninguna, se usan las fotos de sus propios
          productos. Nunca una de stock: una imagen de un desconocido haciéndose
          pasar por la colección es peor que no tener foto. */}
      {/* Desde acá hasta el pie es la PORTADA. El catálogo, Nosotros y Contacto
          se dibujan más abajo, entre la misma barra y el mismo pie. */}
      {vista.enPortada && (<>

      <section id="hero" style={{ position:"relative" }}>
        {/* Sin "Fondo": en la portada el color nunca se veía (siempre hay una
            foto encima). Va la chapita y el botón "Portada", que elige entre
            productos y foto propia y abre el panel de la foto. */}
        {editMode && <ChapitaBloque nombre="Banner principal" ayuda={ayudaDeBloque(idDeSuperficie("Banner principal"))} />}
        {editMode && (
          <ElegirPortada productos={productosConFoto} elegidos={heroElegidos.filter(id => productosConFoto.some(p => p.id === id))} modo={modoPortada} foto={heroUrl}
            tinta={T} acento={G} textoAcento={textoSobreAcento} linea={LINEA_FUERTE} fondoPanel="rgba(14,15,26,0.94)" />
        )}
        <HeroFoto
          imagenes={heroFotos}
          // El encuadre y la foto de celular son de la foto propia: con
          // productos no van (moverían las fotos de los productos).
          posicion={conFotoPropia && heroBgImg ? `${heroBgImg.posX ?? 50}% ${heroBgImg.posY ?? 50}%` : "center"}
          // La foto y el encuadre para el celular, si la dueña los eligió. Sin
          // ellos el celular usa los de PC, como siempre.
          imagenCelular={conFotoPropia ? heroBgImg?.urlMobile : undefined}
          posicionCelular={conFotoPropia && heroBgImg && (heroBgImg.posXMobile !== undefined || heroBgImg.posYMobile !== undefined)
            ? `${heroBgImg.posXMobile ?? heroBgImg.posX ?? 50}% ${heroBgImg.posYMobile ?? heroBgImg.posY ?? 50}%`
            : undefined}
          base={BG}
          tinta={T}
          acento={G}
          alto={isPreview ? `calc(78vh - ${announcementBarHeight}px)` : "min(78vh, 720px)"}
          // En la tienda publicada el nav va `fixed` y flota sobre el hero, así
          // que hay que dejarle su alto libre. En el editor va `sticky` y ocupa
          // su lugar en el flujo: reservarlo otra vez sería un hueco de 72px.
          margenNav={isPreview ? 0 : 72}
          celular={isMobile}
          // Con foto propia no hay piezas: ni cuadraditos de productos ni tarjeta.
          piezas={conFotoPropia ? undefined : heroProductos.map(p => {
            const promoHero = resolveProductPromo(p, promotions);
            return {
              titulo: p.name,
              precio: ocultarPrecios ? undefined : fmt(promoHero.hasPriceDrop ? promoHero.effectivePrice : p.price),
              onVer: (e: React.MouseEvent) => abrirFicha(p, e),
            };
          })}
          kicker={<EditableZone field="storeTagline" label="Tagline">{storeConfig?.storeTagline ?? "Nueva Temporada · Otoño 2025"}</EditableZone>}
          titulo={<EditableZone field="heroHeading" label="Título principal">Vestí tu esencia.</EditableZone>}
          texto={<EditableZone field="heroSubtext" label="Subtítulo hero">Piezas diseñadas para quienes eligen calidad sobre cantidad.</EditableZone>}
          acciones={
            <>
              {(editMode || !storeConfig?.textOverrides?.["heroCta"]?.hidden) && (
                <button onClick={() => irASeccion("productos")} style={{ background:G, color:textoSobreAcento, border:"none", borderRadius:999, padding:"15px 38px", fontSize:11, letterSpacing:2.5, fontWeight:600, textTransform:"uppercase", cursor:"pointer", boxShadow:sombra("oscuro",2) }}>
                  <EditableZone field="heroCta" label="Botón principal">Ver Colección</EditableZone>
                </button>
              )}
              {(editMode || !storeConfig?.textOverrides?.["heroCtaSecondary"]?.hidden) && (
                // El secundario es de vidrio: deja ver la foto a través, así que
                // se apoya en el fondo en vez de taparlo.
                <button onClick={vista.irANosotros} style={{ ...vidrio("oscuro"), color:T, borderRadius:999, padding:"15px 38px", fontSize:11, letterSpacing:2.5, fontWeight:500, textTransform:"uppercase", cursor:"pointer" }}>
                  <EditableZone field="heroCtaSecondary" label="Botón secundario">Nuestra Historia</EditableZone>
                </button>
              )}
            </>
          }
        />
        {/* La vidriera: destacados y categorías en la misma pista 3D. Va pegada
            al hero y sin fondo propio, así la foto de arriba se sigue en el
            teñido de la tarjeta elegida en vez de cortarse en un borde. */}
        {mazosVidriera.length > 0 && (
          <div style={{ position:"relative" }}>
            {/* La key lo vuelve a armar cuando cambian los mazos: el Coverflow
                guarda en qué mazo está parado, y ese número no vale para otra lista. */}
            <Coverflow key={mazosVidriera.map(m => m.id).join()} mazos={mazosVidriera} acento={G} base={BG} tinta={T} fundido />
            {/* No es un ajuste del celular: en esa vista no se ofrece, para que
                no parezca que cambia sólo ahí. */}
            {editMode && !vistaCelular && (
              <label style={{ position:"absolute", top:isMobile ? 52 : 18, left:16, zIndex:6, display:"flex", alignItems:"center", gap:8, ...vidrio("oscuro"), color:T, borderRadius:999, padding:"6px 8px 6px 14px", fontSize:11, letterSpacing:1, fontWeight:600 }}>
                🎠 Carrusel
                <select
                  value={modoVidriera}
                  onChange={e => setOverride("vidrieraMazos", { text: e.target.value })}
                  style={{ background:"rgba(0,0,0,.35)", color:T, border:"1px solid rgba(255,255,255,.2)", borderRadius:999, padding:"5px 10px", fontSize:11, cursor:"pointer" }}
                >
                  {MODOS_VIDRIERA.map(m => <option key={m.valor} value={m.valor} style={{ color:"#f2f2f7", background:"#14151f" }}>{m.label}</option>)}
                </select>
              </label>
            )}
          </div>
        )}
      </section>

      <div style={{ display:"flex", flexDirection:"column" }}>
      {/* ── LANZAMIENTO (ver `aurora/LanzamientoAurora`): sin fecha no existe ── */}
      <SectionBlock id="au-lanzamiento" label="Lanzamiento" isPreview={isPreview} defaultOrder={AU_SECTION_IDS}>
        <LanzamientoAurora products={products} imagen={storeConfig?.imageOverrides?.["lanzamientoImagen"]?.url}
          fmt={fmt} ocultarPrecios={ocultarPrecios} onAbrir={abrirFicha} onVerCatalogo={() => abrirCatalogo()}
          escena={escenaAurora} isMobile={isMobile} />
      </SectionBlock>

      <SectionBlock id="au-garantias" label="Garantías" isPreview={isPreview} defaultOrder={AU_SECTION_IDS}>
      {/* ── GARANTÍAS ──────────────────────────────────────── */}
      <GarantiasAurora fondo={garantiasBg} tinta={garantiasText} escena={escenaAurora} isMobile={isMobile}
        items={GARANTIAS.map((g, i) => {
          const iconIdx = (Math.abs(parseInt(textOverrides[`garantia${i+1}Icon`]?.text ?? "0") || 0)) % AU_STRIP_ICONS[i].length;
          const nextIdx = (iconIdx + 1) % AU_STRIP_ICONS[i].length;
          return {
            icono: AU_STRIP_ICONS[i][iconIdx],
            onCambiarIcono: editMode ? () => setOverride(`garantia${i+1}Icon`, { text: String(nextIdx) }) : undefined,
            titulo: <EditableZone field={`garantia${i+1}Title`} label={`Título garantía ${i+1}`}>{g.title}</EditableZone>,
            desc: <EditableZone field={`garantia${i+1}Desc`} label={`Descripción garantía ${i+1}`}>{g.desc}</EditableZone>,
          };
        })}>
        <EditableSectionBg field="bgGarantias" label="Fondo garantías" />
      </GarantiasAurora>
      </SectionBlock>

      {/* ── MAYORISTA — banner "Solicitá tu lista de precios" ── */}
      <SectionBlock id="au-mayorista" label="Mayorista" isPreview={isPreview} defaultOrder={AU_SECTION_IDS}>
      {isWholesale && (
        <MayoristaAurora onConsultar={vista.irAContacto} fondoPanel={S} escena={escenaAurora} isMobile={isMobile} />
      )}
      </SectionBlock>

      {/* ── COLECCIÓN EN FOCO (ver `aurora/ColeccionEnFoco`) ── */}
      <SectionBlock id="au-coleccion" label="Colección en foco" isPreview={isPreview} defaultOrder={AU_SECTION_IDS}>
        <ColeccionEnFoco products={products} categorias={categoriasBaldosa} promotions={promotions}
          fmt={fmt} ocultarPrecios={ocultarPrecios} favorites={favorites} onFavorito={toggleFavorite}
          onAbrir={abrirFicha} onVerColeccion={cat => abrirCatalogo({ categoria: cat })}
          tinta={tintaTarjeta} escena={escenaAurora} isMobile={isMobile} />
      </SectionBlock>

      {/* ── RECIÉN LLEGADO (ver `aurora/RecienLlegado`) ── */}
      <SectionBlock id="au-recien" label="Recién llegado" isPreview={isPreview} defaultOrder={AU_SECTION_IDS}>
        <RecienLlegado products={products} fmt={fmt} ocultarPrecios={ocultarPrecios} onAbrir={abrirFicha}
          escena={escenaAurora} isMobile={isMobile} />
      </SectionBlock>

      <SectionBlock id="au-statement" label="Frase de marca" isPreview={isPreview} defaultOrder={AU_SECTION_IDS}>
      {/* ── STATEMENT ──────────────────────────────────────── */}
      <FraseAurora fondo={statementBg} tinta={statementText} escena={escenaAurora} isMobile={isMobile}
        conLuz={!textOverrides["quoteText"]?.color}
        foto={statementBgImg?.url ? { url: statementBgImg.url, posicion: `${statementBgImg.posX ?? 50}% ${statementBgImg.posY ?? 50}%` } : null}
        velo={statementBgImg?.url && statementBgImg.overlayType !== "none" && (
          <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none", background: statementBgImg.overlayType === "light" ? `rgba(255,255,255,${statementBgImg.overlayOpacity ?? 0.5})` : `rgba(0,0,0,${statementBgImg.overlayOpacity ?? 0.45})` }} />
        )}
        texto={<EditableZone field="quoteText" label="Frase destacada">&quot;No compramos ropa. Compramos la versión de nosotros mismos que queremos ser.&quot;</EditableZone>}>
        <BgDragHandle imgKey="sectionbg_bgStatement" />
        <EditableSectionBg field="bgStatement" label="Fondo frase" />
      </FraseAurora>
      </SectionBlock>

      {/* ── PRODUCTO EN FOCO (ver `aurora/ProductoEnFoco`) ── */}
      <SectionBlock id="au-producto-foco" label="Producto en foco" isPreview={isPreview} defaultOrder={AU_SECTION_IDS}>
        <ProductoEnFoco products={products} promotions={promotions} fmt={fmt} ocultarPrecios={ocultarPrecios}
          favorites={favorites} onFavorito={toggleFavorite} onAbrir={abrirFicha}
          escena={escenaAurora} isMobile={isMobile} rebaja={REBAJA} tachado={TACHADO} />
      </SectionBlock>

      {/* ── LOOKBOOK (ver `aurora/LookbookAurora`): sin fotos no existe ── */}
      <SectionBlock id="au-lookbook" label="Lookbook" isPreview={isPreview} defaultOrder={AU_SECTION_IDS}>
        <LookbookAurora products={products} promotions={promotions} ejemplo={!storeConfig || (isPreview && !!(storeConfig.previewDemoPuro || storeConfig.demoPublica))}
          imagenes={Array.from({ length: MAX_LOOKS }, (_, i) => storeConfig?.imageOverrides?.[`lookbook${i + 1}`]?.url)}
          fmt={fmt} ocultarPrecios={ocultarPrecios} onAbrir={abrirFicha} escena={escenaAurora} isMobile={isMobile} />
      </SectionBlock>

      {/* ── PRODUCTOS ──────────────────────────────────────── */}
      <SectionBlock id="au-productos" label="Catálogo de productos" isPreview={isPreview} defaultOrder={AU_SECTION_IDS}>
      {/* `overflowX: clip`: la grilla tiene `perspective` para inclinar las
          tarjetas, y una tarjeta inclinada cuenta como más ancha de lo que se ve.
          A 1280 la página medía 1309 y se podía arrastrar de costado (medido el
          30/09/26). `clip` y no `hidden`: recorta sin volverse un contenedor con
          scroll propio, que rompería el `position: sticky` de adentro. */}
      <section id="productos" data-reveal style={{ background:productosBg, position:"relative", overflowX:"clip" }}>
        <EditableSectionBg field="bgProductos" label="Fondo productos" />
        <div style={{ padding: isMobile ? "48px 16px" : "80px 32px", maxWidth:1280, margin:"0 auto" }}>
        <div style={{ marginBottom:40 }}>
          <p style={{ fontFamily:TITULO, fontSize:24, fontWeight:300, letterSpacing:"-0.01em", color:productosText, margin:0 }}>
            {activeGender === "mujer" ? "Mujer" : activeGender === "hombre" ? "Hombre" : "Toda la colección"}
            <span style={{ fontSize:13, color:productosMid, fontFamily:TEXTO, fontWeight:400, marginLeft:12 }}>({allFiltered.length} piezas)</span>
          </p>
        </div>

        {loadingProducts && (
          <div style={{ textAlign:"center", padding:"60px 0", color:productosText, opacity:0.6 }}>
            <p style={{ fontSize:15 }}>Cargando productos...</p>
          </div>
        )}

        {/* Las piezas no aparecen ni suben: vienen desde lejos, giradas y
            desenfocadas, y se enderezan al apoyarse. Es el mismo espacio 3D del
            coverflow del hero aplicado al catálogo — que es lo que evita que la
            página sea "un bloque espectacular y después una tienda cualquiera".

            El mínimo de columna baja a 140 en celular para que sigan entrando
            dos por fila: con 260 quedaba una sola y el catálogo se volvía una
            tira infinita. */}
        <div style={{ marginBottom:48 }}>
        <GrillaProfunda min={isMobile ? 140 : 260} hueco={isMobile ? 12 : 24}>
          {!loadingProducts && filtered.map((product, indiceEnGrilla) => (
            <TarjetaAurora key={product.id} product={product} indice={indiceEnGrilla}
              promotions={promotions} fmt={fmt} ocultarPrecios={ocultarPrecios}
              favorito={favorites.includes(product.id)} onFavorito={() => toggleFavorite(product.id)}
              onAbrir={e => abrirFicha(product, e)} tinta={tintaTarjeta} />
          ))}
        </GrillaProfunda>
        </div>

        {/* Ver más / Ver toda la colección */}
        <div style={{ textAlign:"center" }}>
          <p style={{ fontSize:11, opacity:0.6, letterSpacing:2, marginBottom:24 }}>
            Mostrando {Math.min(VISTOS_EN_PORTADA, allFiltered.length)} de {allFiltered.length} piezas
          </p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            {/* Botón y no `<a href>`: el link iba a otra página y recargaba todo.
                Queda al lado del "Ver más", que ya era un botón. */}
            <button onClick={() => abrirCatalogo()}
              style={{ background:G, color:textoSobreAcento, border:"none", borderRadius:999, padding:"15px 38px", fontSize:11, letterSpacing:3, textTransform:"uppercase", fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"inline-block", transition:"opacity 0.2s", boxShadow:`0 0 34px ${luz(0.45)}` }}
              onMouseEnter={e => { e.currentTarget.style.opacity="0.85"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity="1"; }}>
              Ver toda la colección →
            </button>
          </div>
        </div>
        </div>
      </section>
      </SectionBlock>
      {/* ── LO QUE DICEN (ver `aurora/ResenasAurora`) ── */}
      <SectionBlock id="au-resenas" label="Reseñas de la tienda" isPreview={isPreview} defaultOrder={AU_SECTION_IDS}
        avisoAlOcultar="Ocultarlo también saca el botón para dejar reseñas de la tienda: es el único lugar desde donde se dejan.">
        <ResenasAurora slug={storeConfig?.slug} isPreview={isPreview} isOwner={isOwner}
          products={products} onAbrirProducto={openModal} escena={escenaAurora} isMobile={isMobile}
          capa={isPreview ? CAPAS.previaModal : CAPAS.modalTemplate} />
      </SectionBlock>
      {/* ── PREGUNTAS FRECUENTES (ver `aurora/PreguntasAurora`) ── */}
      <SectionBlock id="au-preguntas" label="Preguntas frecuentes" isPreview={isPreview} defaultOrder={AU_SECTION_IDS}>
        <PreguntasAurora envios={shippingMethods} mercadoPago={hasMercadoPago} pagos={storeConfig?.paymentInfo}
          legales={storeConfig?.legales} slug={storeConfig?.slug} isPreview={isPreview} fmt={fmt}
          onContacto={vista.irAContacto} conWhatsapp={!storeConfig || !!storeConfig.whatsapp?.enabled}
          escena={escenaAurora} isMobile={isMobile} />
      </SectionBlock>
      {/* Cierra el `flex column` que abre despues del hero y que le da el orden a
          los bloques. Antes cerraba despues de Contacto; ahora Contacto y Nosotros
          son pantallas propias y no bloques, asi que cierra con el ultimo bloque. */}
      </div>

      </>)}

      {/* ── EL CATÁLOGO, acá adentro ────────────────────────────────────────────
          Antes esto era otra página. Ahora se dibuja entre la barra y el pie de
          Aurora, con su propio vestido: `CatalogoGenerico` ya tiene tema para este
          template, así que embebido se ve igual que suelto, menos las dos cosas que
          acá sobran —su barra y su pie— que ya están puestas arriba y abajo. */}
      {vista.enCatalogo && (
        <div style={{ paddingTop: isPreview ? 0 : 72 + announcementBarHeight }}>
          {/* El catálogo PROPIO de Aurora (ver `CatalogoAurora`). Con los productos,
              el carrito, los favoritos y la ficha de esta misma pantalla: tocar una
              pieza abre la ficha de Aurora con su vuelo, no la genérica. */}
          <CatalogoAurora key={claveCatalogo}
            products={products} promotions={promotions} cargando={loadingProducts}
            inicial={{ categoria: filtroEfectivo.categoria, subcategoria: filtroEfectivo.subcategoria,
              soloOfertas: filtroEfectivo.soloOfertas, masVistos: filtroEfectivo.masVistos, soloPromos: filtroEfectivo.soloPromos }}
            fmt={fmt} ocultarPrecios={ocultarPrecios}
            favorites={favorites} onFavorito={toggleFavorite} onAbrir={abrirFicha} onVolver={vista.irALaPortada}
            tinta={tintaTarjeta}
            escena={escenaAurora}
            isMobile={isMobile} topeBarra={72 + announcementBarHeight}
            capaPanel={isPreview ? CAPAS.previaModal : CAPAS.modalTemplate} />
        </div>
      )}

      {/* ── NOSOTROS, acá adentro ─────────────────────────────────────────
          Antes era una sección más de la portada, a la que se llegaba scrolleando.
          Ahora es su propia pantalla, con su dirección, igual que en Aire: se puede
          compartir el link y se puede volver. */}
      {vista.enNosotros && (
        <div style={{ paddingTop: isPreview ? 0 : 72 + announcementBarHeight }}>
          <div style={{ maxWidth:1280, margin:"0 auto", padding:"18px clamp(16px,4vw,32px) 0" }}>
            <VolverAurora onClick={vista.irALaPortada} tinta={T} linea={LINEA_FUERTE} />
          </div>
      {/* ── NOSOTROS ───────────────────────────────────────────────────────
          Rehecho con el lenguaje de Aurora (ver AURORA.md, bloques heredados):
          la foto va en un marco de vidrio que se inclina con el mouse, con un
          halo del acento detrás; el texto en un panel de vidrio, y los cuatro
          números son paneles chicos con su cifra en luz. Lo que se edita es lo
          mismo de antes: la foto (con encuadre y velo), los textos y el fondo
          del panel. */}
      <section id="nosotros" data-reveal style={{ position:"relative", overflow:"hidden", background:BG }}>
        <div aria-hidden style={{ position:"absolute", inset:0, pointerEvents:"none",
          background:`radial-gradient(40% 50% at 22% 40%, ${luz(0.2)}, transparent 70%), radial-gradient(35% 45% at 85% 80%, ${luz(0.1)}, transparent 70%)` }} />
        <div style={{ position:"relative", maxWidth:1240, margin:"0 auto", padding: isMobile ? "28px 16px 56px" : "70px 40px 100px",
          display:"grid", gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1.05fr)", gap: isMobile ? 22 : 48, alignItems:"center" }}>
          <div style={{ perspective:"1400px" }}>
            <Inclinable grados={6} style={{ borderRadius: isMobile ? 22 : 28 }}>
              <div style={{ position:"relative", minHeight: isMobile ? 300 : 560, overflow:"hidden", borderRadius: isMobile ? 22 : 28,
                border:`1px solid ${LINEA_FUERTE}`, boxShadow:`0 40px 90px rgba(0,0,0,0.55), 0 0 80px ${luz(0.2)}` }}>
                {nosotrosImageUrl
                  ? <FadeImage src={nosotrosImageUrl} alt="Nuestra historia" fill sizes="(max-width: 768px) 100vw, 50vw" style={{ objectFit:"cover", objectPosition:`${nosotrosPosX}% ${nosotrosPosY}%` }}/>
                  : <div aria-hidden style={{ position:"absolute", inset:0, background:`radial-gradient(60% 70% at 30% 35%, ${luz(0.38)}, transparent 70%), radial-gradient(50% 60% at 75% 75%, ${luz(0.18)}, transparent 70%), ${S}` }} />}
                <BgDragHandle imgKey="nosotrosImage" />
                <EditableImageButton field="nosotrosImage" label="Imagen nosotros" />
                {(() => { const ov = storeConfig?.imageOverrides?.["nosotrosImage"]; if (ov?.overlayType === "none") return null; return <div style={{ position:"absolute", inset:0, pointerEvents:"none", background: ov?.overlayType === "light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.25})` : `rgba(10,10,10,${ov?.overlayOpacity ?? 0.25})` }} />; })()}
              </div>
            </Inclinable>
          </div>
          <div style={{ position:"relative", borderRadius: isMobile ? 22 : 28, padding: isMobile ? "30px 20px" : "54px 50px", background:nosotrosPanelBg,
            border:`1px solid ${LINEA_FUERTE}`, boxShadow:"0 30px 70px rgba(0,0,0,0.35)", display:"flex", flexDirection:"column", gap:20 }}>
            <EditableSectionBg field="bgNosotrosPanel" label="Fondo nosotros" />
            <div aria-hidden style={{ position:"absolute", top:0, left:28, right:28, height:1, background:`linear-gradient(90deg, transparent, ${luz(0.9)}, transparent)` }} />
            <div>
              <p style={{ fontSize:10, letterSpacing:5, color:GT, textTransform:"uppercase", margin:"0 0 16px", fontWeight:700 }}>
                <EditableZone field="aboutKicker" label="Kicker 'Nosotros'">Nuestra historia</EditableZone>
              </p>
              <h2 style={{ fontFamily:TITULO, fontSize: isMobile ? "clamp(24px,7vw,30px)" : "clamp(26px,2.8vw,40px)", fontWeight:300, letterSpacing:"-0.02em", lineHeight:1.15, margin:0, color:nosotrosPanelText }}>
                <EditableZone field="aboutHeading" label="Título 'Nosotros'">Creados para quienes eligen con intención.</EditableZone>
              </h2>
            </div>
            <p style={{ fontSize:14, opacity:0.65, lineHeight:1.85, color:nosotrosPanelText, margin:0 }}>
              <EditableZone field="aboutParagraph1" label="Párrafo 1 'Nosotros'">Nacimos con una premisa simple: crear piezas que duren más que una temporada. En un mundo saturado de fast fashion, apostamos por la confección artesanal, las telas de origen responsable y los diseños que no envejecen.</EditableZone>
            </p>
            <p style={{ fontSize:14, opacity:0.65, lineHeight:1.85, color:nosotrosPanelText, margin:0 }}>
              <EditableZone field="aboutParagraph2" label="Párrafo 2 'Nosotros'">Cada prenda pasa por un proceso riguroso de selección de materiales y control de calidad. Trabajamos con talleres locales y artesanos que comparten nuestra filosofía: menos piezas, más valor.</EditableZone>
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2, minmax(0,1fr))", gap: isMobile ? 10 : 12, paddingTop:6 }}>
              {([["aboutStat1","aboutStatLabel1","2018","Año de fundación"],["aboutStat2","aboutStatLabel2","100%","Producción local"],["aboutStat3","aboutStatLabel3","30+","Artesanos"],["aboutStat4","aboutStatLabel4","8 años","De trayectoria"]] as const).map(([fv,fl,n,label]) => (
                <div key={label} style={{ borderRadius:16, padding: isMobile ? "14px 14px" : "18px 18px", border:`1px solid ${nosotrosPanelText === T ? LINEA_FUERTE : "rgba(6,7,13,0.12)"}`,
                  background: nosotrosPanelText === T ? "rgba(255,255,255,0.04)" : "rgba(6,7,13,0.04)" }}>
                  <p style={{ fontFamily:TITULO, fontSize: isMobile ? 22 : 28, color:GT, margin:"0 0 6px", fontWeight:400, textShadow:`0 0 22px ${luz(0.45)}` }}><EditableZone field={fv} label={`Stat: ${n}`}>{n}</EditableZone></p>
                  <p style={{ fontSize:11, opacity:0.68, margin:0, lineHeight:1.4, color:nosotrosPanelText }}><EditableZone field={fl} label={`Etiqueta stat: ${label}`}>{label}</EditableZone></p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
        </div>
      )}

      {/* ── CONTACTO, acá adentro ─────────────────────────────────────────
          Antes era una sección más de la portada, a la que se llegaba scrolleando.
          Ahora es su propia pantalla, con su dirección, igual que en Aire: se puede
          compartir el link y se puede volver. */}
      {vista.enContacto && (
        <div style={{ paddingTop: isPreview ? 0 : 72 + announcementBarHeight }}>
          <div style={{ maxWidth:1280, margin:"0 auto", padding:"18px clamp(16px,4vw,32px) 0" }}>
            <VolverAurora onClick={vista.irALaPortada} tinta={T} linea={LINEA_FUERTE} />
          </div>
      {/* ── CONTACTO ───────────────────────────────────────── */}
      <section id="contacto" data-reveal style={{ position:"relative", borderTop:`1px solid ${LINEA}`, color:contactoText, ...(contactoBgImg?.url ? { backgroundImage:`url(${contactoBgImg.url})`, backgroundSize:"cover", backgroundPosition:`${contactoBgImg.posX ?? 50}% ${contactoBgImg.posY ?? 50}%` } : { background:contactoBg }) }}>
        <BgDragHandle imgKey="sectionbg_bgContacto" />
        <EditableSectionBg field="bgContacto" label="Fondo contacto" />
        {contactoBgImg?.url && contactoBgImg.overlayType !== "none" && (
          <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none", background: contactoBgImg.overlayType === "light" ? `rgba(255,255,255,${contactoBgImg.overlayOpacity ?? 0.5})` : `rgba(0,0,0,${contactoBgImg.overlayOpacity ?? 0.45})` }} />
        )}
        {/* Luz de escena detrás del panel, como en el resto de Aurora. */}
        {!contactoBgImg?.url && <div aria-hidden style={{ position:"absolute", inset:0, pointerEvents:"none", background:`radial-gradient(45% 55% at 50% 30%, ${luz(0.16)}, transparent 70%)` }} />}
        <div style={{ padding: isMobile ? "40px 16px 64px" : "80px 32px 110px", maxWidth:680, margin:"0 auto", position:"relative", zIndex:1 }}>
          <p style={{ fontSize:10, letterSpacing:5, color:GT, textAlign:"center", textTransform:"uppercase", marginBottom:12 }}><EditableZone field="contactKicker" label="Etiqueta contacto">Contacto</EditableZone></p>
          <h2 style={{ fontFamily:TITULO, fontSize:"clamp(22px,2.6vw,32px)", fontWeight:300, letterSpacing:"-0.02em", textAlign:"center", margin:"0 0 12px", color:contactoText }}>
            <EditableZone field="contactHeading" label="Título contacto">¿Tenés alguna consulta?</EditableZone>
          </h2>
          <p style={{ fontSize:14, opacity:0.68, textAlign:"center", marginBottom:48, lineHeight:1.7 }}>
            <EditableZone field="contactSubtext" label="Subtítulo contacto">Respondemos todos los mensajes en menos de 24 horas hábiles.</EditableZone>
          </p>

          {/* El formulario en un panel de vidrio, con los campos redondeados y
              el botón en píldora (AU-6: eran rectángulos de Fashion Noir). */}
          <div style={{ position:"relative", borderRadius: isMobile ? 22 : 28, padding: isMobile ? "24px 18px" : "36px 36px",
            background: contactoText === T ? "rgba(255,255,255,0.035)" : "rgba(6,7,13,0.035)", border:`1px solid ${contactoInputBorder}`,
            backdropFilter:"blur(16px) saturate(140%)", WebkitBackdropFilter:"blur(16px) saturate(140%)", boxShadow:"0 30px 70px rgba(0,0,0,0.3)" }}>
          <div aria-hidden style={{ position:"absolute", top:0, left:28, right:28, height:1, background:`linear-gradient(90deg, transparent, ${luz(0.9)}, transparent)` }} />
          <ContactForm
            storeId={storeConfig?.storeId} isPreview={isPreview} prefillMessage={inquiryMessage}
            accent={G} textColor={contactoText} mutedColor={contactoInputBorder}
            radius={14} buttonRadius={999}
            theme={{
              showLabels: true,
              labelStyle: { display:"block", fontSize:10, letterSpacing:3, textTransform:"uppercase", opacity:0.6, marginBottom:8 },
              twoColTop: true,
              inputBg: contactoInputBg,
              inputBorderColor: contactoInputBorder,
              focusBorderColor: G,
              inputPadding: "12px 16px",
              fontSize: 13,
              gap: 16,
              placeholders: { nombre: "Tu nombre", email: "tu@email.com", mensaje: "¿En qué podemos ayudarte?" },
              buttonLabel: "Enviar Mensaje",
              buttonStyle: { background:G, color:textoSobreAcento, padding:"16px", fontSize:12, fontWeight:800, letterSpacing:3, textTransform:"uppercase", boxShadow:`0 0 34px ${luz(0.45)}` },
            }}
            renderSent={reset => (
              <div style={{ textAlign:"center", padding:"60px 0" }}>
                <p style={{ fontSize:40, marginBottom:16 }}>✓</p>
                <p style={{ fontFamily:TITULO, fontSize:20, fontWeight:400, color:contactoText, marginBottom:8 }}>¡Mensaje enviado!</p>
                <p style={{ fontSize:13, opacity:0.68 }}>Te respondemos a la brevedad.</p>
                <button onClick={reset} style={{ marginTop:24, background:"transparent", color: contactoText === T ? GT : G, border:`1px solid ${luz(0.6)}`, borderRadius:999, padding:"11px 28px", fontSize:11, letterSpacing:2, cursor:"pointer", textTransform:"uppercase" }}>Enviar otro mensaje</button>
              </div>
            )}
          />
          </div>
        </div>
      </section>
        </div>
      )}

      <footer style={{ borderTop:`1px solid ${LINEA}`, marginTop:0, position:"relative", color:footerText, ...(footerBgImg?.url ? { backgroundImage:`url(${footerBgImg.url})`, backgroundSize:"cover", backgroundPosition:`${footerBgImg.posX ?? 50}% ${footerBgImg.posY ?? 50}%` } : { background:footerBg }) }}>
        <BgDragHandle imgKey="sectionbg_bgFooter" />
        <EditableSectionBg field="bgFooter" label="Fondo footer" nombreBloque="Pie de la tienda" />
        {footerBgImg?.url && footerBgImg.overlayType !== "none" && (
          <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none", background: footerBgImg.overlayType === "light" ? `rgba(255,255,255,${footerBgImg.overlayOpacity ?? 0.5})` : `rgba(0,0,0,${footerBgImg.overlayOpacity ?? 0.45})` }} />
        )}
        <div style={{ padding: isMobile ? "40px 20px 20px" : "60px 32px 32px", position:"relative", zIndex:1 }}>
        {/* El pie se acomoda solo, en vez de tener proporciones fijas.
              Eran cuatro columnas de 2fr 1fr 1fr 1.5fr y no entraban: medido, la pagina se
              podia arrastrar de costado 96px a 768 de ancho y 57px a 980. Cada vez que se
              corregia el corte aparecia otro ancho roto, que es lo que pasa cuando se tapa
              un desborde con un numero en vez de dejar que el contenido mande.
              `auto-fit` con un minimo de 210px pone las columnas que entren: cuatro en un
              monitor, dos en una tablet, una en el celular, sin que nadie elija el ancho.
              Se pierde el enfasis que tenia la columna de la marca (era mas ancha) y se
              gana que no se rompe.
              QUEDA ABIERTO: entre 1099 y 1101 de ancho, y SOLO en la pantalla de Contacto,
              la pagina todavia se arrastra 39px. Se aislo hasta esta primera columna —
              escondiendola el arrastre da cero, y escondiendo cualquiera de sus tres hijos
              por separado no—, pero no se encontro que la desborda: medida por medida sus
              cajas entran en la pista de 229px. Antes de este cambio esa franja arrastraba
              25px, o sea que empeoro 14px ahi y mejoro 96 y 57 en dos anchos comunes. */}
        <div style={{ maxWidth:1280, margin:"0 auto", display:"grid", gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "repeat(auto-fit, minmax(210px, 1fr))", gap: isMobile ? 28 : 40, marginBottom:40 }}>
          <div>
            {/* `overflowWrap:"anywhere"`: el nombre de la tienda es UNA palabra y a 28px con 6
                de espaciado mide mas que la columna que le toca. Una palabra sola no se parte
                por su cuenta, asi que empujaba la grilla y la pagina se arrastraba de
                costado: medido, 39px a 1100 de ancho. Ahora se parte antes que romper la
                pagina. Un nombre largo va a quedar en dos renglones, que es feo pero se lee;
                arrastrar la pagina para el costado no se lee. */}
            <span style={{ fontFamily:TITULO, fontSize:22, fontWeight:500, letterSpacing:4, color:GT, display:"block", marginBottom:16, maxWidth:"100%", overflowWrap:"anywhere" }}><EditableZone field="footerBrandName" label="Nombre en footer">{storeConfig?.storeName ?? "AURORA"}</EditableZone></span>
            <p style={{ fontSize:13, opacity:0.65, lineHeight:1.8, maxWidth:260 }}>
              <EditableZone field="footerDescription" label="Descripción del footer">Piezas de calidad para personas que saben lo que quieren. Diseño atemporal, confección impecable.</EditableZone>
            </p>
            {/* Las cinco redes que se cargan en Configuración (faltaba Pinterest:
                cargada, no aparecía). En el celular la fila sigue la alineación de
                la descripción de arriba (`data-cel-fila`, en globals.css). */}
            <div data-cel-fila={textOverrides.footerDescription?.celular?.align} style={{ display:"flex", flexWrap:"wrap", gap:12, marginTop:24 }}>
              {/* Logos de verdad y no "IG", "FB" en cuadraditos (AU-7): esferas de
                  vidrio que se encienden con el acento al pasar el mouse. */}
              {REDES_SOCIALES.map(({ clave, nombre, trazo }) => {
                const url = storeConfig?.socialLinks?.[clave];
                if (!isPreview && !url) return null;
                return (
                  <button key={clave} aria-label={nombre}
                    title={url ? nombre : `${nombre} — sin cargar. Se carga en Configuración → Redes sociales`}
                    /* `noopener`: sin eso la pestaña nueva queda con acceso a la
                       tienda que la abrió y puede mandarla a otra dirección. */
                    onClick={() => url && window.open(url, "_blank", "noopener,noreferrer")}
                    style={{ display:"grid", placeItems:"center", width:40, height:40, borderRadius:999, padding:0,
                      background: footerText === T ? "rgba(255,255,255,0.05)" : "rgba(6,7,13,0.05)", border:`1px solid ${footerSubtleBorder}`, color:footerText,
                      cursor: url ? "pointer" : "default", transition:"color .25s, border-color .25s, box-shadow .25s, background .25s", opacity: url ? 1 : 0.35 }}
                    onMouseEnter={e => { if (url) { e.currentTarget.style.borderColor=luz(0.6); e.currentTarget.style.color= footerText === T ? GT : G; e.currentTarget.style.boxShadow=`0 0 22px ${luz(0.45)}`; e.currentTarget.style.background=luz(0.1); } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor=footerSubtleBorder; e.currentTarget.style.color=footerText; e.currentTarget.style.boxShadow="none"; e.currentTarget.style.background= footerText === T ? "rgba(255,255,255,0.05)" : "rgba(6,7,13,0.05)"; }}>
                    <svg width={17} height={17} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d={trazo} /></svg>
                  </button>
                );
              })}
            </div>
          </div>
          {/* ── Los links del pie llevan a donde dicen ──────────────────────────
              Eran ocho y todos iban a DOS lugares: o bajaban al bloque de
              productos, o abrían Contacto. O sea que "Ofertas", "Más vendidos" y
              "Nueva temporada" hacían exactamente lo mismo, y cuatro de ellos
              —"Gift cards", "Envíos y devoluciones", "Talle y medidas" y "Cómo
              comprar"— prometían pantallas que no existen en ningún lado.

              Ahora cada uno abre el catálogo con SU filtro. "Nueva temporada" lo
              abre sin filtrar y eso es honesto: el catálogo llega ordenado por
              fecha (`createdAt: desc` en `/api/public/[slug]`), o sea que lo
              primero que se ve es lo último que entró.

              Esto ademas devuelve el acceso a las ofertas y a lo más vendido, que
              hasta recién eran dos bloques de la portada y se sacaron.

              Los cuatro links inventados se van en vez de apuntar a cualquier
              lado: un link que miente es peor que un link que no está. Cuando
              existan la guía de talles y las preguntas frecuentes, vuelven acá
              apuntando a ellas de verdad. "Envíos y devoluciones" no vuelve: sus
              documentos ya están en la barra de abajo, en este mismo pie. */}
          {([
            { title:"Tienda", links: [
              ["Nueva temporada", () => abrirCatalogo()] as [string, () => void],
              ["Más vendidos",    () => abrirCatalogo({ masVistos: true })] as [string, () => void],
              /* "Ofertas" es el precio TACHADO (`comparePrice`), y "Promociones" son
                 las promos vigentes (2x1, % off, envío gratis). En el catálogo son
                 dos filtros distintos, así que acá son dos links distintos — y cada
                 uno aparece solo si tiene algo detrás.
                 No es un detalle: medido en una tienda real, los tres productos
                 mostraban descuento en pantalla y NINGUNO tenía `comparePrice`. El
                 descuento venía de una promo. Un link "Ofertas" fijo habría llevado
                 a "0 resultados" con la tienda llena de precios rebajados.
                 Es la misma regla que ya usaba el bloque de ofertas que se sacó de
                 la portada: sin ofertas, no se ofrece. */
              ...(hayOfertas ? [["Ofertas", () => abrirCatalogo({ soloOfertas: true })] as [string, () => void]] : []),
              ...(hayPromos  ? [["Promociones", () => abrirCatalogo({ soloPromos: true })] as [string, () => void]] : []),
            ] },
            { title:"Ayuda", links: [
              ["Nuestra historia", () => vista.irANosotros()],
              ["Contacto",         () => vista.irAContacto()],
            ] },
          ] as { title: string; links: [string, () => void][] }[]).map(col => (
            <div key={col.title}>
              <p style={{ fontSize:10, letterSpacing:4, color:GT, textTransform:"uppercase", marginBottom:20, fontWeight:700 }}>{col.title}</p>
              {/* Botones y no párrafos con clic: un <p> no se alcanza con el
                  teclado y un lector de pantalla no lo anuncia como algo que se
                  puede apretar. Se ven igual que antes. */}
              {col.links.map(([label, ir]) => (
                <button key={label} type="button" onClick={ir}
                  style={{ display:"block", background:"none", border:"none", padding:0, font:"inherit", color:"inherit", textAlign:"left",
                    fontSize:13, opacity:0.45, marginBottom:10, cursor:"pointer", transition:"opacity 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.opacity="0.9")}
                  onMouseLeave={e => (e.currentTarget.style.opacity="0.45")}>
                  {label}
                </button>
              ))}
            </div>
          ))}
          <div>
            <p style={{ fontSize:10, letterSpacing:4, color:GT, textTransform:"uppercase", marginBottom:20, fontWeight:700 }}>Newsletter</p>
            <p style={{ fontSize:12, opacity:0.65, marginBottom:16, lineHeight:1.6 }}>
              <EditableZone field="newsletterText" label="Texto newsletter">Suscribite y recibí novedades antes que nadie. Sin spam.</EditableZone>
            </p>
            <div style={{ maxWidth: isMobile ? "100%" : 340 }}>
              <NewsletterForm
                slug={storeConfig?.slug} isPreview={isPreview}
                boton="OK" botonEnviando="…"
                theme={{
                  // Una cápsula de vidrio con el botón adentro (AU-6: eran un
                  // campo y un botón rectangulares pegados).
                  form:  { display:"flex", alignItems:"center", gap:6, padding:4, borderRadius:999, background:footerInputBg, border:`1px solid ${footerSubtleBorder}` },
                  input: { flex:1, minWidth:0, background:"transparent", border:"none", color:footerText, padding:"9px 14px", fontSize:12, outline:"none" },
                  boton: { flexShrink:0, background:G, color:textoSobreAcento, border:"none", borderRadius:999, padding:"10px 18px", fontSize:12, fontWeight:700, cursor:"pointer", letterSpacing:1, boxShadow:`0 0 20px ${luz(0.4)}` },
                  colorMensaje: footerText,
                  colorError: G,
                }}
              />
            </div>
          </div>
        </div>
        {isMobile ? (
          /* ── MOBILE: 2 filas centradas ── */
          <div style={{ borderTop:`1px solid rgba(242,242,247,0.05)`, paddingTop:20, paddingBottom:80, maxWidth:1280, margin:"0 auto", display:"flex", flexDirection:"column", gap:10, alignItems:"center" }}>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"4px 16px", justifyContent:"center" }}>
              {linksLegales(storeConfig?.slug, storeConfig?.legales, { enEditor: editMode }).map(({ clave: tipo, label }) => (
                editMode ? (
                  <button key={tipo} type="button" onClick={() => window.open("/dashboard/pagos", "_blank")}
                    title="Editar en Dashboard → Pagos"
                    style={{ fontSize:11, color:"inherit", opacity:0.55, background:"none", border:"none", cursor:"pointer", padding:0, letterSpacing:1, display:"inline-flex", alignItems:"center", gap:5 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.55"; }}>
                    {label}
                    <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                ) : (
                  <a key={tipo} href={`/tienda/${storeConfig?.slug ?? ""}/politicas?tipo=${tipo}`}
                    style={{ fontSize:11, color:"inherit", opacity:0.55, textDecoration:"none", letterSpacing:1 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.55"; }}>
                    {label}
                  </a>
                )
              ))}
              {!editMode && (
                <button onClick={() => setShowReport(true)}
                  style={{ fontSize:11, opacity:0.5, background:"none", border:"none", cursor:"pointer", color:"inherit", padding:0, letterSpacing:1 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.5"; }}>
                  Reportar tienda
                </button>
              )}
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"2px 12px", justifyContent:"center", textAlign:"center" }}>
              <p style={{ fontSize:11, opacity:0.5, margin:0 }}>
                <EditableZone field="footerCopyright" label="Copyright">© {ANIO} {storeConfig?.storeName ?? "AURORA"}. Todos los derechos reservados.</EditableZone>
              </p>
              <p style={{ fontSize:11, opacity:0.5, margin:0 }}>
                <EditableZone field="footerMadeIn" label="Hecho en">Hecho con ♥ en Argentina</EditableZone>
              </p>
            </div>
          </div>
        ) : (
          /* ── DESKTOP: fila izq/der original ── */
          <div style={{ borderTop:`1px solid rgba(242,242,247,0.05)`, paddingTop:24, paddingLeft: hasWA ? 110 : 0, paddingRight:110, maxWidth:1280, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"8px 24px" }}>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"0 20px" }}>
              {linksLegales(storeConfig?.slug, storeConfig?.legales, { enEditor: editMode }).map(({ clave: tipo, label }) => (
                editMode ? (
                  <button key={tipo} type="button" onClick={() => window.open("/dashboard/pagos", "_blank")}
                    title="Editar en Dashboard → Pagos"
                    style={{ fontSize:11, color:"inherit", opacity:0.55, background:"none", border:"none", cursor:"pointer", padding:0, letterSpacing:1, display:"inline-flex", alignItems:"center", gap:5 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.55"; }}>
                    {label}
                    <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                ) : (
                  <a key={tipo} href={`/tienda/${storeConfig?.slug ?? ""}/politicas?tipo=${tipo}`}
                    style={{ fontSize:11, color:"inherit", opacity:0.55, textDecoration:"none", letterSpacing:1 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.55"; }}>
                    {label}
                  </a>
                )
              ))}
            </div>
            <div style={{ display:"flex", gap:24, alignItems:"center", flexWrap:"wrap" }}>
              <p style={{ fontSize:11, opacity:0.5, margin:0 }}>
                <EditableZone field="footerCopyright" label="Copyright">© {ANIO} {storeConfig?.storeName ?? "AURORA"}. Todos los derechos reservados.</EditableZone>
              </p>
              <p style={{ fontSize:11, opacity:0.5, margin:0 }}>
                <EditableZone field="footerMadeIn" label="Hecho en">Hecho con ♥ en Argentina</EditableZone>
              </p>
              {!editMode && (
                <button onClick={() => setShowReport(true)}
                  style={{ fontSize:11, opacity:0.5, background:"none", border:"none", cursor:"pointer", color:"inherit", padding:0, letterSpacing:1 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.5"; }}>
                  Reportar tienda
                </button>
              )}
            </div>
          </div>
        )}
        </div>
      </footer>

      {showReport && (
        <ReportStoreModal slug={storeConfig?.slug ?? ""} onClose={() => setShowReport(false)} />
      )}

      {/* ── LA FICHA (ver `aurora/FichaAurora`) ───────────────────── */}
      {modalProduct && (
        <FichaAurora producto={modalProduct} cart={cart} products={products} promotions={promotions}
          slug={storeConfig?.slug} ocultarPrecios={ocultarPrecios} isMobile={isMobile} isPreview={isPreview}
          isOwner={isOwner} modoConsulta={isInquiryMode} isWholesale={isWholesale} hasWA={hasWA}
          escena={escenaAurora} tinta={tintaTarjeta} rebaja={REBAJA} tachado={TACHADO}
          apagadoFondo={APAGADO_FONDO} apagadoTexto={APAGADO_TEXTO}
          fichaRef={fichaRef} fotoFichaRef={fotoFichaRef} panelListo={panelListo}
          capa={isPreview ? CAPAS.previaModal : 600}
          onCerrar={cerrarFicha} onAmpliar={setLightboxSrc} onConsultar={openInquiry}
          onCopiarLink={shareProduct} onWhatsapp={whatsappShare} />
      )}

      <CheckoutModal cart={cart} theme={cartTheme} isPreview={isPreview} storeSlug={storeConfig?.slug ?? ""} />
      <CartDrawer cart={cart} theme={cartTheme} isOwner={isOwner} isPreview={isPreview} whatsapp={storeConfig?.whatsapp} />

      {/* ── FAVORITES DRAWER ───────────────────────────────── */}
      {/* `overflow:hidden`: el panel de favoritos vive corrido a la derecha cuando esta
          cerrado (`translateX(100%)`), y asi estirava el ancho de la pagina. Medido en
          la pantalla de Contacto a 768: 96px de arrastre lateral. Recortarlo no tapa
          nada — abierto el panel entra entero — y el cajon del carrito, que es
          compartido, ya usa `min(420px,100vw)` por lo mismo. */}
      <div style={{ position:"fixed", inset:0, overflow:"hidden", zIndex: isPreview ? CAPAS.previaModal : 155, pointerEvents: favoritesOpen ? "auto" : "none" }}>
        <div onClick={() => setFavoritesOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(10,10,10,0.6)", opacity: favoritesOpen ? 1 : 0, transition:"opacity 0.3s" }}/>
        <div style={{ position:"absolute", top:0, right:0, bottom:0, width:"min(420px, 100vw)", background:S, transform: favoritesOpen ? "translateX(0)" : "translateX(100%)", transition:"transform 0.35s cubic-bezier(.4,0,.2,1)", display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"24px 24px 16px", borderBottom:`1px solid rgba(242,242,247,0.07)`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <p style={{ fontFamily:TITULO, fontSize:16, fontWeight:400, margin:0 }}>{"Favoritos"} <span style={{ fontSize:13, color:"#555" }}>({favorites.length})</span></p>
            <button onClick={() => setFavoritesOpen(false)} style={{ background:"none", border:"none", color:T, fontSize:24, cursor:"pointer", lineHeight:1 }}>×</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"16px 24px" }}>
            {favoriteProducts.length === 0
              ? <div style={{ textAlign:"center", padding:"60px 0", opacity:0.35 }}>
                  <p style={{ fontSize:36, marginBottom:12 }}>♡</p>
                  <p style={{ fontSize:13, lineHeight:1.8 }}>No tenés favoritos aún.<br/>Guardá piezas que te gusten.</p>
                </div>
              : favoriteProducts.map(product => (
                <div key={product.id} style={{ display:"flex", gap:14, padding:"16px 0", borderBottom:`1px solid rgba(242,242,247,0.06)` }}>
                  {product.images[0] ? <FadeImage src={product.images[0]} alt={product.name} width={70} height={93} style={{ objectFit:"cover", flexShrink:0 }}/> : <div style={{ width:70, height:93, flexShrink:0, background:S }}/>}
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:14, margin:"0 0 3px", fontWeight:500 }}>{product.name}</p>
                    <PromoPrice product={product} promotions={promotions} fmt={fmt} accent={G}
                      priceSize={13} compareSize={11} weight={700} ocultarPrecios={ocultarPrecios}
                      gap={8} style={{ marginBottom:10 }} />
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={() => { setFavoritesOpen(false); openModal(product); }}
                        style={{ background:G, color:textoSobreAcento, border:"none", padding:"7px 14px", fontSize:10, letterSpacing:2, fontWeight:700, textTransform:"uppercase", cursor:"pointer" }}>
                        Ver producto
                      </button>
                      <button aria-label={favorites.includes(product.id) ? "Quitar de favoritos" : "Agregar a favoritos"} onClick={() => toggleFavorite(product.id)}
                        style={{ background:"transparent", color:"#666", border:"1px solid rgba(242,242,247,0.15)", padding:"7px 14px", fontSize:10, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", transition:"color 0.2s" }}
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

      {/* ── LIGHTBOX ───────────────────────────────────────── */}
      {lightboxSrc && (
        <div style={{ position:"fixed", inset:0, zIndex: isPreview ? CAPAS.previaModalAlto : 700, background:"rgba(0,0,0,0.97)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setLightboxSrc(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- el lightbox es la foto a pantalla completa con zoom de dos dedos: necesita el <img> nativo. next/image pide medidas fijas o un padre posicionado, y ninguna de las dos cosas conviven con maxWidth/maxHeight en viewport + touchAction pinch-zoom. */}
          <img src={lightboxSrc} alt="" style={{ maxWidth:"100vw", maxHeight:"100vh", objectFit:"contain", touchAction:"pinch-zoom" }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxSrc(null)} aria-label="Cerrar" style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", width:44, height:44, borderRadius:"50%", fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
      )}

      {/* ── FLOATING CART BUTTON ────────────────────────────── */}
      {!cart.cartOpen && !cart.checkoutOpen && (() => {
        const cartIconIdx = (Math.abs(parseInt(textOverrides["cartIcon"]?.text ?? "0") || 0)) % CART_ICON_OPTIONS.length;
        const nextCartIconIdx = (cartIconIdx + 1) % CART_ICON_OPTIONS.length;
        return (
          <div onClick={() => { if (!editMode) { setCartOpen(true); setFavoritesOpen(false); } }}
            role="button" tabIndex={0} aria-label="Carrito"
            onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && !editMode) { e.preventDefault(); setCartOpen(true); setFavoritesOpen(false); } }}
            style={{ position:"fixed", bottom:24, ...(hasWA ? {left:24} : {right:24}), zIndex:CAPAS.panel, width:52, height:52, borderRadius:"50%", background:G, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 6px 18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3)", transition:"transform 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.transform="scale(1.1)")}
            onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}>
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={getContrastColor(G)==="light"?"#fff":"#06070d"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{CART_ICON_OPTIONS[cartIconIdx]}</svg>
            {cartCount > 0 && !editMode && <span style={{ position:"absolute", top:-4, right:-4, background:"#e53e3e", color:"#fff", borderRadius:"50%", width:20, height:20, fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{cartCount}</span>}
            {editMode && (
              <button onClick={e => { e.stopPropagation(); setOverride("cartIcon", { text: String(nextCartIconIdx) }); }} title="Cambiar ícono del carrito"
                style={{ position:"absolute", inset:0, background:"rgba(99,102,241,0.9)", border:"none", borderRadius:"50%", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:18, opacity:0, transition:"opacity 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity="1")} onMouseLeave={e => (e.currentTarget.style.opacity="0")}>↻</button>
            )}
          </div>
        );
      })()}

      {/* ── WHATSAPP BUTTON ────────────────────────────────── */}
      {!cart.cartOpen && !cart.checkoutOpen && (!storeConfig || storeConfig.whatsapp.enabled) && (
        <button
          className="au-wa-fab" aria-label="Escribinos por WhatsApp"
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
