"use client";
import { barraMs } from "@/types/store-config";
import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { usePushBell } from "@/contexts/PushBellContext";
import { useSesion } from "@/components/AuthProvider";
import StoreFollowButton from "@/components/store/StoreFollowButton";
import { useResenasProducto, type ResenaProducto } from "@/hooks/useResenasProducto";
import { EditableZone, EditableImageButton, EditableSectionBg, BgDragHandle, getContrastColor, getReadableAccentText, getReadableAccentFill, textoSobre, useEditContext } from "@/contexts/EditContext";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useCartLogic } from "@/hooks/useCartLogic";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import { useSombrasScroll } from "@/components/store/useSombrasScroll";
import { useHomeReviews, type EjemplosDeResenas } from "@/hooks/useHomeReviews";
import { COMENTARIO_MAX, RESENADOR_MAX } from "@/lib/reviews";
import { tintaSobreFoto, sombraSobreFoto } from "@/lib/section-bg";
import { DescripcionPlegable } from "@/components/store/templates/shared/DescripcionPlegable";
import { masVistos, MIN_MAS_VISTOS } from "@/lib/masVistos";
import { catalogoTieneGeneros } from "@/lib/generos";
import { opcionesVisibles } from "@/lib/opciones";
import {  } from "@/hooks/useStorefront";
import { esOpcionDeColor, valoresElegidos } from "@/lib/opciones";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import VerifiedIconButton from "@/components/store/VerifiedIconButton";
import { CartDrawer, type CartTheme } from "@/components/store/templates/shared/CartDrawer";
import { OfferBadge } from "@/components/store/OfferBadge";
import { PromoTag, PromoBlock, PromoPrice, PALETA_PROMO_TIERRA } from "@/components/store/PromoDisplay";
import { resolveProductPromo, describePromo } from "@/lib/promoDisplay";
import { CheckoutModal } from "@/components/store/templates/shared/CheckoutModal";
import { ContactForm } from "@/components/store/templates/shared/ContactForm";
import { NewsletterForm } from "@/components/store/templates/shared/NewsletterForm";
import { FadeImage } from "@/components/store/templates/shared/FadeImage";
import StoreProductReels from "@/components/store/ProductReels";
import { SectionBlock } from "@/components/store/templates/shared/SectionBlock";
import { PromoBannerCarousel } from "@/components/store/templates/shared/PromoBannerCarousel";
import { colorToSwatch } from "@/lib/colorSwatch";
import { discountPercent } from "@/lib/discount";
import { resolveVariantPrice } from "@/lib/variantPrice";
import { useTurnstile } from "@/components/Turnstile";
import { linksLegales } from "@/lib/politicas-tienda";
import { CAPAS } from "@/lib/capas-tienda";
/* Qué productos van en el carrusel de la portada: la regla compartida con los
   otros templates de moda, y el engranaje que la elige sobre el bloque. */
import { productosDeLaVitrina, leerModo, leerElegidos } from "@/lib/vitrina";
import { BotonVitrina } from "@/components/store/templates/shared/BotonVitrina";
/* El catálogo, para dibujarlo acá adentro en vez de mandar al navegador a otra
   página. Es EL MISMO que ya se veía: mismo componente, mismo vestido de Boho
   Terra. Lo único que cambia es dónde vive — adentro del template, con su barra
   y su pie— y que por eso funciona sin salirse del editor. */
import CatalogoGenerico, { type CatalogoEmbebido } from "@/app/tienda/[slug]/productos/CatalogoGenerico";
import { useVistaTemplate, urlParaCompartirProducto } from "@/components/store/templates/shared/useVistaTemplate";


const BG  = "#faf7f2";
const S   = "#f0e9df";
const T   = "#2c2218";
const MID = "#9a8070";

type Product = StorefrontProduct;

/* ── Ícono de carrito flotante — variantes para elegir en modo edición ── */
const CART_ICON_OPTIONS: React.ReactNode[] = [
  <Fragment key="bag"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></Fragment>,
  <Fragment key="cart"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></Fragment>,
  <Fragment key="basket"><path d="M5 11 2 7h20l-3 4"/><path d="M4 11h16l-1.7 8.5a2 2 0 0 1-2 1.5H7.7a2 2 0 0 1-2-1.5L4 11Z"/><path d="M9 11V8a3 3 0 0 1 6 0v3"/></Fragment>,
];


const announcementMessages_DEFAULT = [
  "🌿 Envío gratis en compras mayores a $30.000",
  "🔄 Cambios sin cargo hasta 30 días",
  "🌱 6 cuotas sin interés",
];

/* ── Cómo habla esta tienda ──────────────────────────────────────────────────
   El template ya dice "piezas" y "Ver pieza" en toda la portada, pero el carrito
   es compartido y ahí volvía a decir "3 productos" y "Quitar del carrito". La
   voz se cortaba justo en el paso donde el comprador decide.
   Sólo son las palabras: la cuenta, el motor de precios y el checkout siguen
   siendo exactamente los mismos que usan los otros ocho templates. */
const VOCABULARIO_CARRITO = {
  titulo: "Tu selección",
  cerrar: "Cerrar la selección",
  vacioIcono: "🌿",
  vacio: "Todavía no elegiste ninguna pieza.",
  vacioSub: "Recorré la colección.",
  quitar: "Sacar de la selección",
  unidad: "pieza",
  unidades: "piezas",
  finalizar: "Llevar estas piezas",
  seguir: "Seguir mirando",
};

/* Las reseñas de ejemplo del editor, con la voz de ESTA tienda: fibras naturales,
   tinturas vegetales, taller. Son propias y no compartidas a propósito — si los
   diez templates mostraran los mismos textos, las previews se verían clonadas. */
const EJEMPLOS_RESENAS: EjemplosDeResenas = {
  producto: [
    { id:"bt-p1", rating:5, reviewer:"Malena T.", verified:true,  verifiedBy:"auto",
      comment:"El lino es hermoso de verdad, se siente distinto apenas lo tocás. Y el color no se movió después de varios lavados." },
    { id:"bt-p2", rating:5, reviewer:"Josefina R.", verified:false, verifiedBy:null,
      comment:"Me encantó saber de qué está hecha cada pieza. Se nota el trabajo a mano en las terminaciones." },
    { id:"bt-p3", rating:4, reviewer:"Camila V.", verified:true,  verifiedBy:"owner",
      comment:"La tela es preciosa y cae divino. Le saco una estrella porque me quedó un poco más larga de lo que esperaba." },
  ],
  tienda: [
    { id:"bt-t1", rating:5, reviewer:"Delfina A.", verified:true,  verifiedBy:"auto",
      comment:"Vino envuelto en papel, con una nota escrita a mano. Se nota que le ponen cuidado a cada envío." },
    { id:"bt-t2", rating:5, reviewer:"Renata B.", verified:false, verifiedBy:null,
      comment:"Les consulté por el talle y me respondieron con paciencia hasta que estuve segura. Volvería a comprar." },
  ],
};

/* Las reseñas de EJEMPLO de la vista rápida, para el editor. Sin esto el bloque
   aparecía vacío mientras la dueña acomoda la tienda y no había forma de ver cómo
   queda lleno — que es justo para lo que sirve el editor.
   Nunca se publican: el hook las muestra sólo con `isPreview` y desaparecen solas
   en cuanto llega la primera de verdad. Y son propias de este template, con su
   voz, por el mismo motivo que las de la portada. */
const RESENAS_EJEMPLO: ResenaProducto[] = [
  { id:"bt-ej-1", rating:5, comment:"El lino es tal cual la foto y el talle justo. Llegó envuelto en papel, con una nota a mano.", reviewer:"Malena T.", verified:true,  verifiedBy:"auto",  createdAt:"2026-07-18T14:00:00.000Z" },
  { id:"bt-ej-2", rating:5, comment:"Se nota el trabajo artesanal en las terminaciones. El color no se movió después de varios lavados.", reviewer:"Josefina R.", verified:false, verifiedBy:null,   createdAt:"2026-07-11T14:00:00.000Z" },
  { id:"bt-ej-3", rating:4, comment:"La tela es preciosa y cae divino. Me quedó un poco más larga de lo que esperaba, pero la recomiendo.", reviewer:"Camila V.", verified:true,  verifiedBy:"owner", createdAt:"2026-06-29T14:00:00.000Z" },
];
const PASO_RESENAS = 5;

const scrollTo = (id:string) => document.getElementById(id)?.scrollIntoView({ behavior:"smooth" });

const BT_SECTION_IDS = ["bt-mayorista", "bt-banner", "bt-coleccion", "bt-ofertas", "bt-masvisto", "bt-prueba-social", "bt-nosotros", "bt-contacto"];

export default function BohoTerra() {
  // El tipo local de las reseñas se fue con el fetch propio: ahora la forma la
  // define `HomeReview`, en el hook compartido.
  const [reviewCarouselPage, setReviewCarouselPage] = useState(0);
  const [reviewForm,     setReviewForm]     = useState({ reviewer: "", rating: 5, comment: "", email: "" });
  const reviewCaptcha = useTurnstile("review");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone,     setReviewDone]     = useState(false);
  const [resenaModalOpen, setResenaModalOpen] = useState(false);
  const [reviewError,    setReviewError]    = useState<string | null>(null);
  /** Corta el doble envío en la misma vuelta, antes de que el estado se entere. */
  const enviandoResena = useRef(false);
  const [reviewHoneypot, setReviewHoneypot] = useState("");

  const storeConfig = useStoreConfig();
  const pushBell = usePushBell();
  const { cargando, logueado, nombreMostrado, panelHref, panelLabel, signOut } = useSesion();
  const isPreview   = !!storeConfig?.previewFill;
  /** La demo pública de un diseño (`/plantillas/[id]`): necesita el relleno de
   *  ejemplos, pero nada de lo que le habla a la dueña de una tienda. */
  const demoPublica = !!storeConfig?.demoPublica;
  /** Rellenar con ejemplos y hablarle a la dueña son dos cosas distintas: en la
   *  demo pública hace falta lo primero y no lo segundo. */
  const enEditor    = isPreview && !demoPublica;
  const isOwner     = !!storeConfig?.isOwner;
  const hasWA       = !storeConfig || storeConfig.whatsapp.enabled;
  const storefront  = useStorefront();
  const { products, promotions, checkoutMode, isWholesale, ocultarPrecios, defaultCategories } = storefront;
  const { editMode, overrides: textOverrides, setOverride } = useEditContext();
  const isInquiryMode = checkoutMode === "inquiry" || ocultarPrecios;

  /* ── Portada o catálogo, SIN irse a otra página ─────────────────────────────
     Los siete links al catálogo eran `window.location.href`, que recarga todo.
     En la tienda publicada eso es un parpadeo; en el EDITOR sacaba a la dueña de
     Diseño, y encima le mostraba el catálogo del template GUARDADO en vez del que
     estaba mirando — con Aire elegido y Boho Terra en la previa, tocar "catálogo"
     abría el catálogo de Aire.
     Ahora el catálogo se dibuja acá adentro, entre la barra y el pie de Boho
     Terra, con su vestido. Ver `useVistaTemplate`. */
  const vista = useVistaTemplate({ isPreview, slug: storeConfig?.slug, templateId: "boho-terra" });
  /** Con qué filtro entrar al catálogo. Lo ponen los links antes de abrirlo. */
  const [filtroCatalogo, setFiltroCatalogo] = useState<CatalogoEmbebido>({});
  const abrirCatalogo = (filtro: CatalogoEmbebido = {}) => {
    setFiltroCatalogo(filtro);
    vista.irAlCatalogo();
  };

  const categoryList = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(c => c && c !== "general"))];
    const base = cats.length > 0 ? cats : defaultCategories.slice(0, 6);
    return base;
  }, [products, defaultCategories]);
  const A = storeConfig?.colors.accent ?? "#b5652a";
  // El acento usado como TEXTO sobre el panel blanco del modal. El terracota de
  // fábrica se lee perfecto, pero el acento lo elige la dueña: con uno claro
  // —arena, crema, marfil— la ficha de materiales quedaba escrita en blanco
  // sobre blanco. `getReadableAccentText` devuelve el acento tal cual cuando se
  // despega del fondo y cae al color de texto del template cuando no.
  const ATextoBlanco = getReadableAccentText(A, "#ffffff", T);
  // Y la otra mitad: el acento usado para MARCAR (el borde del color y el talle
  // elegidos, el de la miniatura activa). Es otra pregunta —ahí no importa si se
  // lee, importa si se distingue como superficie—, por eso va con el helper de
  // relleno y no con el de texto. Sin esto, con un acento claro el comprador no
  // ve cuál talle tiene seleccionado.
  const AMarcaBlanco = getReadableAccentFill(A, "#ffffff", T);
  // La tinta ARRIBA del acento cuando se usa de relleno (el botón de comprar).
  // Estaba clavada en "#fff": con un acento claro —arena, crema— era blanco sobre
  // blanco en el botón que cierra la venta.
  // Va con `getContrastColor` y no con `textoSobre`, a propósito y contra lo que
  // parece: sobre el terracota de fábrica los dos candidatos empatan (4.32 el
  // blanco, 4.37 el negro), así que `textoSobre` daría vuelta la tinta a negro
  // ganando 0.05 de contraste y cambiándole el aspecto a todas las tiendas que
  // no tocaron el acento. Este es además el criterio que usa el modal del
  // catálogo para el mismo botón, y que las dos fichas coincidan es el punto.
  const AMarcaTexto  = getContrastColor(AMarcaBlanco) === "light" ? "#fff" : "#111";
  /* Un solo título de sección para TODO el modal (La pieza, Descripción, Videos,
     Reseñas). Antes cada uno tenía el suyo —9px con opacidad 0.6, 9px sin peso,
     Georgia itálica de 14— y leído de corrido no se veía dónde terminaba una
     sección y empezaba la otra. Es además el mismo que usa el modal del catálogo
     para este template, que es lo que hace que las dos fichas del mismo producto
     se lean igual. */
  const tituloModal: React.CSSProperties = {
    margin: "0 0 12px", fontSize: 9, fontWeight: 600, letterSpacing: 3,
    textTransform: "uppercase", color: MID, opacity: 0.75,
  };
  const sc = storeConfig?.sectionColors ?? {};
  const heroLeftBg = sc["bgHeroLeft"] ?? BG;
  const heroLeftText = getContrastColor(heroLeftBg) === "light" ? "#faf7f2" : "#2c2218";
  const heroLeftMid = getContrastColor(heroLeftBg) === "light" ? "#d5c9be" : "#9a8070";
  const coleccionBg   = sc["bgColeccion"] ?? BG;
  const coleccionText = getContrastColor(coleccionBg) === "light" ? "#faf7f2" : "#2c2218";
  const coleccionMid  = getContrastColor(coleccionBg) === "light" ? "#d5c9be" : "#9a8070";
  // Los botones "Ver Colección" y "Ver colección completa" se dan vuelta al pasarles
  // el mouse: se pintan del color del texto de la sección. La etiqueta de adentro
  // usaba el color del FONDO, y eso fallaba dos veces (ver el comentario largo en
  // UrbanPulse): un fondo en degradado no es un `color:` válido y el navegador tira
  // la declaración, y un fondo de tono intermedio da una etiqueta que apenas se
  // despega del relleno. Se elige midiendo contra el relleno del propio botón.
  const heroLeftBotonText  = textoSobre(heroLeftText);
  const coleccionBotonText = textoSobre(coleccionText);
  const ofertasBg   = sc["bgOfertas"] ?? S;
  const ofertasText = getContrastColor(ofertasBg) === "light" ? "#faf7f2" : "#2c2218";
  const masVistoBg   = sc["bgMasVisto"] ?? BG;
  const masVistoText = getContrastColor(masVistoBg) === "light" ? "#faf7f2" : "#2c2218";
  const nosotrosBg = sc["bgNosotros"] ?? S;
  const nosotrosText = getContrastColor(nosotrosBg) === "light" ? "#faf7f2" : "#2c2218";
  const nosotrosMid = getContrastColor(nosotrosBg) === "light" ? "#d5c9be" : "#9a8070";
  const footerBg   = sc["bgFooter"]      ?? S;
  const footerText = getContrastColor(footerBg) === "light" ? "#faf7f2" : T;
  const footerMid  = getContrastColor(footerBg) === "light" ? "#d5c9be" : MID;

  // Image overrides with focal point positions
  const heroImage1Ov      = storeConfig?.imageOverrides?.["heroImage1"];
  const heroImage2Ov      = storeConfig?.imageOverrides?.["heroImage2"];
  const heroImage3Ov      = storeConfig?.imageOverrides?.["heroImage3"];
  const nosotrosImageOv   = storeConfig?.imageOverrides?.["nosotrosImage"];
  const contactBgOv       = storeConfig?.imageOverrides?.["contactBackground"];

  // Newsletter strip — fondo propio, separado del footer
  const newsletterBg    = sc["bgNewsletter"]  ?? A;
  const newsletterBgImg = storeConfig?.imageOverrides?.["sectionbg_bgNewsletter"];
  const newsletterText  = newsletterBgImg?.url
    ? (newsletterBgImg.overlayType === "light" ? T : "#faf7f2")
    : (getContrastColor(newsletterBg) === "light" ? "#faf7f2" : T);
  const isDarkNewsletter = newsletterText === "#faf7f2";
  const newsletterMid   = isDarkNewsletter ? "rgba(255,255,255,0.65)" : "rgba(44,34,24,0.55)";
  const newsletterInputBg     = isDarkNewsletter ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.06)";
  const newsletterInputBorder = isDarkNewsletter ? "rgba(255,255,255,0.3)"  : "rgba(0,0,0,0.15)";

  const [scrolled,            setScrolled]            = useState(false);
  const [activeCategory,      setActiveCategory]      = useState("Todos");
  const [activeGender,        setActiveGender]        = useState<string | null>(null);
  const [hoveredNavCat,       setHoveredNavCat]       = useState<string | null>(null);
  const [desktopOpenCat,      setDesktopOpenCat]      = useState<string | null>(null);
  const [carouselIdx,         setCarouselIdx]         = useState(0);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [announcementIdx,     setAnnouncementIdx]     = useState(0);
  const [showReport,          setShowReport]          = useState(false);
  const [isMobile,            setIsMobile]            = useState(false);
  /* Segundo corte, sólo para los carruseles. `isMobile` (768) no alcanzaba: entre
     768 y 1200 tres tarjetas ya entran cómodas, pero cuatro quedarían de ~210px y
     la prenda no se ve. De 1200 para arriba entran las cuatro a ~273, que es la
     medida de las de "Lo más visto". */
  const [esAncho,             setEsAncho]             = useState(false);
  const [mobileMenuOpen,      setMobileMenuOpen]      = useState(false);
  const [mobileCatsOpen,      setMobileCatsOpen]      = useState(false);
  const [mobileOpenCat,       setMobileOpenCat]       = useState<string | null>(null);
  const [lightboxSrc,         setLightboxSrc]         = useState<string|null>(null);
  const [ofertasIdx,          setOfertasIdx]          = useState(0);
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
  const carouselRef = useRef<HTMLDivElement>(null);

  const cart = useCartLogic(storefront);
  const {
    setCartOpen,
    modalProduct, setModalProduct, modalImg, setModalImg,
    seleccion, setOpcion,
    qty, setQty, selectedVariantStock, sinStock,
    searchOpen, setSearchOpen, searchQuery, setSearchQuery,
    favorites, favoritesOpen, setFavoritesOpen,
    userDropdownOpen, setUserDropdownOpen, userDropdownRef,
    toastMsg,
    cartCount,
    searchResults, favoriteProducts,
    fmt, showToast, openModal, addToCart, modalScrollRef,
    toggleFavorite,
  } = cart;
  // El texto que va ARRIBA de un relleno pintado con el acento. Estaba clavado en
  // "#fff": con la terracota de fábrica queda blanco sobre naranja —justo en el
  // límite— y con cualquier acento claro que elija la dueña, blanco sobre claro.
  // No estaba invertido como en los otros cinco templates: directamente no miraba
  // el acento.
  const accentText = textoSobre(A);
  const cartTheme: CartTheme = { BG:"#ffffff", S, T, MID, border:"rgba(44,34,24,0.1)", accent:A, accentText, serif:"Georgia, serif" };
  const variantPrice = modalProduct ? resolveVariantPrice(modalProduct.variants, valoresElegidos(seleccion)) : null;
  const displayPrice = variantPrice ?? (modalProduct?.price ?? 0);
  // Promo de tienda del producto abierto en el modal (usa displayPrice para respetar variantes).
  const modalPromo = modalProduct ? resolveProductPromo({ id: modalProduct.id, price: displayPrice, category: modalProduct.category }, promotions) : null;
  // 3×2 en vivo: unidades que se PAGAN a la cantidad elegida (misma cuenta que el motor).
  const nxmPaid = modalPromo?.nxm ? qty - Math.floor(qty / modalPromo.nxm.n) * (modalPromo.nxm.n - modalPromo.nxm.m) : null;
  const imgSwipe = useTouchSwipe(
    () => { if (modalProduct) setModalImg(i => (i + 1) % modalProduct.images.length); },
    () => { if (modalProduct) setModalImg(i => (i - 1 + modalProduct.images.length) % modalProduct.images.length); }
  );

  // ── Alto de la columna de la foto ───────────────────────────────────────────
  // El panel de compra se recorta al alto de la columna de la izquierda y scrollea
  // por dentro, con la barra escondida. Sin esto, una descripción larga estiraba el
  // modal entero: la columna de la foto quedaba con media pantalla de aire muerto
  // abajo y el bloque de reseñas arrancaba en un lugar distinto según el producto.
  // Se MIDE en vez de calcularse porque el alto depende de cuántas miniaturas y
  // cuántos reels tenga cada uno. Sólo en escritorio: en celular las columnas se
  // apilan y un alto fijo cortaría el contenido.
  // Es el mismo mecanismo que ya usan Chic Paris y el modal del catálogo.
  const colFotoRef = useRef<HTMLDivElement>(null);
  const [altoColFoto, setAltoColFoto] = useState<number | null>(null);
  useEffect(() => {
    const el = colFotoRef.current;
    if (isMobile || !modalProduct || !el) return;
    const ro = new ResizeObserver(() => {
      const alto = el.offsetHeight;
      setAltoColFoto(prev => (prev === alto ? prev : alto));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobile, modalProduct]);
  // Derivado y no un `setState(null)` adentro del efecto: apagarlo con estado
  // dispara un render en cascada (y lo marca el lint). Al reabrir el modal el
  // ResizeObserver mide de nuevo apenas observa, así que no queda un alto viejo.
  const altoPanel = isMobile || !modalProduct ? null : altoColFoto;
  // Con la barra escondida no queda ninguna señal de que hay más para leer. Los
  // degradados la reponen, y sólo cuando de verdad falta contenido de ese lado.
  const { ref: panelRef, arriba: sombraArriba, abajo: sombraAbajo } =
    useSombrasScroll<HTMLDivElement>([altoPanel, modalProduct?.id]);

  const [inquiryMessage, setInquiryMessage] = useState("");
  function openInquiry(product: Product) {
    setModalProduct(null);
    setInquiryMessage(`Hola, me interesa "${product.name}". ¿Me podés dar más información?`);
    setTimeout(() => scrollTo("contacto"), 100);
  }
  /* La dirección de verdad del producto, no `?p=<id>`. El porqué está escrito en
     `urlParaCompartirProducto`. La ficha que contesta esa dirección es
     `BohoTerraDetail`, con el menú y el pie de este mismo template. */
  function shareProduct(product: Product) {
    navigator.clipboard.writeText(urlParaCompartirProducto(storeConfig?.slug, product.id)).catch(() => {});
    showToast("¡Link copiado al portapapeles!");
  }
  function whatsappShare(product: Product) {
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

  // Las reseñas de la portada. La FUNCIÓN —qué sube, las dos pestañas, el
  // promedio, borrar y publicar— es compartida; el diseño está más abajo y es de
  // este template. Ver `useHomeReviews`.
  //
  // Antes acá había un fetch propio que traía SOLO `d.reviews`, o sea las de
  // producto: las reseñas de TIENDA —las que hablan de la atención y del envío—
  // llegaban en `storeReviews` y se tiraban a la basura sin que nadie lo supiera.
  // Y no había forma de dejar una: el bloque se escondía con cero reseñas, así
  // que una tienda nueva no tenía cómo conseguir la primera.
  const resenas = useHomeReviews({
    slug: storeConfig?.slug,
    isPreview, isOwner,
    productos: products,
    ejemplos: EJEMPLOS_RESENAS,
  });

  // Las reseñas del producto abierto: carga, paginado, promedio y total. Antes
  // esto estaba escrito acá a mano —igual que en los otros tres templates de moda
  // y en la página de listado— y traía los tres bugs que describe el hook: sin
  // paginar (con 200 reseñas se llegaba a la 50 y las demás no existían), el
  // promedio calculado sobre las que habían llegado, y las reseñas del producto
  // anterior pegadas en la ficha si abrías dos seguidos.
  const resenasProd = useResenasProducto({
    slug: storeConfig?.slug, productId: modalProduct?.id,
    paso: PASO_RESENAS, ejemplos: RESENAS_EJEMPLO, isPreview,
  });

  useEffect(() => {
    if (!modalProduct) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de una interacción (abrir otra ficha), no se puede calcular durante el render
    setReviewDone(false);
    // Y el formulario cerrado: si quedó abierto de la ficha anterior, al abrir otra
    // aparecería el formulario encima antes de que se vea el producto.
    setResenaModalOpen(false);
    setReviewError(null);
    setReviewForm(p => ({ ...p, rating: 5, comment: "" }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalProduct?.id]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    // `enviandoResena` es un REF y no el estado `reviewSubmitting`: poner estado no
    // es inmediato, así que entre el primer submit y el re-render que apaga el
    // botón entran dos envíos. Y el submit también sale con Enter desde un campo,
    // que ni siquiera pasa por el botón deshabilitado. El ref se cierra en la misma
    // vuelta y es lo único que corta de verdad el doble envío.
    if (isPreview || isOwner || reviewHoneypot || enviandoResena.current) return;
    const slug = storeConfig?.slug;
    if (!modalProduct || !slug || !reviewForm.reviewer.trim()) return;
    enviandoResena.current = true;
    setReviewSubmitting(true);
    try {
      const res = await fetch(`/api/public/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: modalProduct.id, rating: reviewForm.rating, comment: reviewForm.comment, reviewer: reviewForm.reviewer, buyerEmail: reviewForm.email.trim() || undefined, turnstileToken: reviewCaptcha.token }),
      });
      if (res.ok) {
        const data = await res.json();
        resenasProd.agregar(data.review);
        setReviewForm({ reviewer: "", rating: 5, comment: "", email: "" });
        setReviewError(null);
        // Se cierra el modal del formulario: si no, queda abierto y vacío tapando
        // la reseña que la persona acaba de publicar, que es justo lo que quiere ver.
        setResenaModalOpen(false);
        setReviewDone(true); setTimeout(() => setReviewDone(false), 4000);
      } else {
        // Antes esto era silencio: se apagaba el "Publicando...", el botón volvía a
        // habilitarse y el comprador no sabía si se había publicado. El servidor
        // manda el motivo —captcha vencido, nombre corto, demasiadas seguidas— y se
        // muestra tal cual. Es el mismo arreglo que Chic Paris ya tenía (CP-12).
        const d = await res.json().catch(() => null);
        setReviewError(d?.error || "No se pudo publicar tu reseña. Probá de nuevo en un momento.");
      }
    } catch {
      setReviewError("No se pudo conectar. Revisá tu internet y probá de nuevo.");
    } finally { enviandoResena.current = false; reviewCaptcha.reset(); setReviewSubmitting(false); }
  }

  const ANNOUNCEMENT_BAR_H = 36;
  const promoBannerEnabled = storeConfig?.promoBanner?.enabled !== false;
  const announcementMessages = (storeConfig?.promoBanner?.messages?.filter(m => m.trim()) ?? []).length > 0
    ? storeConfig!.promoBanner!.messages!.filter(m => m.trim())
    : announcementMessages_DEFAULT;
  const showAnnouncement = promoBannerEnabled && announcementVisible;
  const announcementBarHeight = showAnnouncement ? ANNOUNCEMENT_BAR_H : 0;

  useScrollReveal();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const check = () => { setIsMobile(window.innerWidth < 768); setEsAncho(window.innerWidth >= 1200); };
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


  const CARDS_PER_VIEW = isMobile ? 1 : esAncho ? 4 : 3;
  const CAROUSEL_LIMIT = 8;
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

  const changeGender = (g: string | null) => { setActiveGender(g); setActiveCategory("Todos"); setCarouselIdx(0); };

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
    if (activeCategory !== "Todos" && p.category !== activeCategory) return false;
    return true;
  }), [products, hayGeneros, activeGender, activeCategory]);
  /* Las ocho del carrusel. Antes era el `slice` a secas —siempre las últimas
     cargadas— y una tienda con cincuenta piezas tenía cuarenta y dos que no
     aparecían nunca en la portada. Ahora lo elige la dueña desde el engranaje del
     bloque; la regla es la misma que usa Aire, en `vitrina.ts`.

     El recorte va DESPUÉS de los filtros: con "Mujer" puesto, la vitrina elige
     entre lo de mujer y no ocho de todo el catálogo para después tirar la mitad. */
  const carouselProducts = useMemo(() => productosDeLaVitrina(allFiltered, CAROUSEL_LIMIT, {
    modo: leerModo(textOverrides["vitrinaModo"]?.text),
    elegidos: leerElegidos(textOverrides["vitrinaIds"]?.text),
  }), [allFiltered, textOverrides]);

  const similarProducts = useMemo(() => {
    if (!modalProduct) return [];
    const others = products.filter(p => p.id !== modalProduct.id);
    const sameSub = modalProduct.subcategory ? others.filter(p => p.subcategory === modalProduct.subcategory) : [];
    const sameCat = others.filter(p => p.category === modalProduct.category && !sameSub.includes(p));
    const rest = others.filter(p => !sameSub.includes(p) && !sameCat.includes(p));
    return [...sameSub, ...sameCat, ...rest].slice(0, 4);
  }, [products, modalProduct]);
  const maxIdx      = Math.max(0, carouselProducts.length - CARDS_PER_VIEW);
  /* Al ensancharse la ventana entran más tarjetas por vista y el tope baja: con 8
     productos, en 3 por vista el último índice es 5 y en 4 es 4. Si el visitante
     estaba en el 5 y agranda, el carrusel se corre de más y muestra un hueco al
     final. Se acota acá, al dibujar, y no con un `setState` en un efecto: no hace
     falta guardar el número corregido, sólo usarlo. */
  const idxColeccion = Math.min(carouselIdx, maxIdx);
  const prevSlide   = () => setCarouselIdx(() => Math.max(0, idxColeccion - 1));
  const nextSlide   = () => setCarouselIdx(() => Math.min(maxIdx, idxColeccion + 1));
  const carouselSwipe = useTouchSwipe(nextSlide, prevSlide);

  const allOfertas = useMemo(() => products.filter(p => p.comparePrice && p.comparePrice > p.price), [products]);
  const ofertasProducts = (allOfertas.length > 0 ? allOfertas : products).slice(0, 8);
  const ofertasHasMore = allOfertas.length > 8;
  const ofertasMaxIdx = Math.max(0, ofertasProducts.length - CARDS_PER_VIEW);
  const idxOfertas = Math.min(ofertasIdx, ofertasMaxIdx);
  const prevOferta = () => setOfertasIdx(() => Math.max(0, idxOfertas - 1));
  const nextOferta = () => setOfertasIdx(() => Math.min(ofertasMaxIdx, idxOfertas + 1));
  const ofertasSwipe = useTouchSwipe(nextOferta, prevOferta);

  return (
    <div data-template-raiz style={{ fontFamily:"'Helvetica Neue', Arial, sans-serif", background:BG, color:T, minHeight:"100vh",
      /* Recién cambiada la pantalla, los clics no entran por 400ms: es lo que
         evita que el segundo toque de un doble toque caiga sobre lo que quedó
         abajo del dedo. Ver el candado en `useVistaTemplate`. */
      pointerEvents: vista.cambiandoPantalla ? "none" : undefined }}>
      <style>{`
        @keyframes bt-wa-pulse { 0% { box-shadow:0 4px 20px rgba(37,211,102,0.4), 0 0 0 0 rgba(37,211,102,0.55); } 70% { box-shadow:0 4px 20px rgba(37,211,102,0.4), 0 0 0 14px rgba(37,211,102,0); } 100% { box-shadow:0 4px 20px rgba(37,211,102,0.4), 0 0 0 0 rgba(37,211,102,0); } }
        .bt-wa-fab { background:linear-gradient(135deg,#2be374,#1fae57); animation:bt-wa-pulse 2.4s ease-out infinite; }
        .bt-wa-fab:hover { animation-play-state:paused; }
        .bt-zoom-img { transition:transform 0.5s ease; }
        .bt-zoom:hover .bt-zoom-img { transform:scale(1.06); }
        .bt-sin-barra::-webkit-scrollbar { display:none }
        .bt-sin-barra { scrollbar-width:none; -ms-overflow-style:none }
      `}</style>

      {/* ── ANNOUNCEMENT BAR ───────────────────────────────── */}
      {showAnnouncement && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top:0, left: isPreview ? undefined : 0, right: isPreview ? undefined : 0, zIndex: isPreview ? 10001 : 110, height:ANNOUNCEMENT_BAR_H, background:A, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:12, fontWeight:600, color:"#fff", letterSpacing:1 }}>
            <EditableZone field="announcementText" label="Barra de anuncios" noBadge>{announcementMessages[announcementIdx]}</EditableZone>
          </span>
          {/* Dots */}
          <div style={{ position:"absolute", bottom:5, left:"50%", transform:"translateX(-50%)", display:"flex", gap:5 }}>
            {announcementMessages.map((_, i) => (
              <button key={i} onClick={() => setAnnouncementIdx(i)}
                style={{ width: i === announcementIdx ? 16 : 6, height:4, border:"none", borderRadius:2, background: i === announcementIdx ? "#fff" : "rgba(255,255,255,0.35)", cursor:"pointer", padding:0, transition:"all 0.3s" }}/>
            ))}
          </div>
          {/* Close */}
          <button onClick={() => setAnnouncementVisible(false)}
            style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#fff", cursor:"pointer", fontSize:16, lineHeight:1, opacity:0.8 }}>×</button>
        </div>
      )}

      {/* TOAST */}
      {toastMsg && (
        <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", background:T, color:BG, padding:"10px 24px", fontSize:12, fontWeight:600, zIndex:CAPAS.barraAccion, maxWidth:"calc(100vw - 32px)", textAlign:"center", letterSpacing:1 }}>
          ✓ {toastMsg}
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
        <div onClick={e => { if (e.target === e.currentTarget) setSearchOpen(false); }} style={{ position:"fixed", inset:0, zIndex:CAPAS.buscador, background:"rgba(250,247,242,0.96)", backdropFilter:"blur(8px)", display:"flex", flexDirection:"column", alignItems:"center", paddingTop:120 }}>
          <button onClick={() => setSearchOpen(false)} aria-label="Cerrar búsqueda"
            style={{ position:"absolute", top:24, right:32, background:"none", border:"none", color:T, fontSize:28, cursor:"pointer", lineHeight:1 }}>×</button>
          <div style={{ width:"100%", maxWidth:640, padding:"0 24px" }}>
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={"Buscar productos..."}
              style={{ width:"100%", background:"transparent", border:"none", borderBottom:`2px solid ${A}`, color:T, fontSize:24, padding:"12px 0", outline:"none", fontFamily:"'Helvetica Neue', Arial, sans-serif", boxSizing:"border-box" }}
            />
          </div>
          {searchResults.length > 0 && (
            <div style={{ width:"100%", maxWidth:640, padding:"24px 24px 0", overflowY:"auto", maxHeight:"calc(100vh - 260px)" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
                {searchResults.map(p => (
                  <button key={p.id} onClick={() => openModal(p)}
                    style={{ background:"none", border:`1px solid rgba(181,101,42,0.2)`, cursor:"pointer", textAlign:"left", padding:0, color:T }}>
                    <div style={{ position:"relative", width:"100%", aspectRatio:"3/4", background:S }}>
                      {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes="(max-width: 768px) 33vw, 200px" style={{ objectFit:"cover" }}/>}
                    </div>
                    <div style={{ padding:"10px 12px" }}>
                      <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:12, margin:"0 0 4px" }}>{p.name}</p>
                      <PromoPrice product={p} promotions={promotions} fmt={fmt} accent={A}
                        priceSize={13} compareSize={11} weight={700} ocultarPrecios={ocultarPrecios} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {searchQuery.trim().length > 0 && searchResults.length === 0 && (
            <p style={{ color:MID, marginTop:32, fontSize:14 }}>Sin resultados para &ldquo;{searchQuery}&rdquo;</p>
          )}
        </div>
      )}

      {/* ── NAVBAR */}
      <nav style={{ position: isPreview ? "sticky" : "fixed", top:announcementBarHeight, left: isPreview ? undefined : 0, right: isPreview ? undefined : 0, zIndex: isPreview ? 10000 : 100, background: scrolled ? "rgba(250,247,242,0.96)" : BG, borderBottom:`1px solid rgba(44,34,24,0.07)`, backdropFilter: scrolled ? "blur(10px)" : "none", transition:"all 0.3s" }}>
        {/* Sin el `maxWidth:1280`: el nav va de borde a borde, como el hero que
            tiene pegado abajo. Ver el comentario largo en `ChicParis.tsx`, que es la
            misma decisión para los tres templates. */}
        <div style={{ padding:"0 20px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
            <button onClick={()=>scrollTo("inicio")} style={{ background:"none", border:"none", cursor:"pointer", fontFamily:"Georgia, serif", fontSize:20, fontStyle:"italic", color:T, letterSpacing:2, maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              <EditableZone field="storeName" label="Nombre de la tienda">{storeConfig?.storeName ?? "Terra"}</EditableZone>
            </button>
            <VerifiedIconButton isVerified={storeConfig?.isVerified} info={storeConfig?.verifiedInfo} />
          </div>
          {!isMobile && (
            /* Cuando la tienda usa géneros, este grupo lleva Categorías + Mujer +
               Hombre y el `space-between` del padre lo deja centrado, que es donde
               va bien. Cuando NO los usa —el caso de la mayoría— queda "Categorías"
               sola flotando en el medio de la barra, sin nada alrededor y lejos de
               todo lo demás.
               El `marginLeft:auto` se come todo el espacio libre antes de que el
               `space-between` reparta, así que este grupo termina pegado al de la
               derecha, al lado de Nuestra Historia. Es eso y no mover el JSX de
               lugar: el menú es el mismo, cambia dónde se apoya. */
            <div style={{ display:"flex", gap:20, alignItems:"center",
              ...(generosParaElMenu ? {} : { marginLeft:"auto", marginRight:20 }) }}>
              {/* CATEGORÍAS dropdown */}
              <div style={{ position:"relative" }}
                onMouseEnter={() => setHoveredNavCat("__open__")}
                onMouseLeave={() => { setHoveredNavCat(null); setDesktopOpenCat(null); }}>
                <button style={{ background:"none", border:"none", fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", color:MID, display:"flex", alignItems:"center", gap:4 }}
                  onMouseEnter={e => (e.currentTarget.style.color = T)}
                  onMouseLeave={e => (e.currentTarget.style.color = MID)}>
                  Categorías <span style={{ fontSize:9, opacity:0.6 }}>▾</span>
                </button>
                {hoveredNavCat && (() => {
                  const activeCat = desktopOpenCat ?? "";
                  const activeSubs = subcategoriesFor[activeCat] || [];
                  return (
                    <>
                    <div style={{ position:"absolute", top:"100%", left:0, right:0, height:10, zIndex:CAPAS.veloPanel }} />
                    <div style={{ position:"absolute", top:"calc(100% + 10px)", left:0, background:"#faf7f2", border:`1px solid rgba(44,34,24,0.12)`, borderRadius:18, zIndex:CAPAS.panel, padding:16, boxShadow:"0 12px 40px rgba(44,34,24,0.12)", maxWidth:340 }}>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                        {categoryList.map(cat => {
                          const subs = subcategoriesFor[cat] || [];
                          const open = desktopOpenCat === cat;
                          return (
                            <button key={cat} onClick={() => {
                              if (subs.length > 0) { setDesktopOpenCat(open ? null : cat); }
                              else { abrirCatalogo({ categoria: cat }); setHoveredNavCat(null); }
                            }}
                              style={{ background: open ? T : "rgba(44,34,24,0.06)", border:`1px solid ${open ? T : "rgba(44,34,24,0.1)"}`, borderRadius:999, color: open ? "#faf7f2" : T, padding:"7px 16px", fontSize:10.5, cursor:"pointer", letterSpacing:1.5, textTransform:"uppercase", transition:"background 0.2s, color 0.2s, border-color 0.2s, transform 0.15s", transform:"scale(1)" }}
                              onMouseEnter={e => { if (!open) { e.currentTarget.style.background = "rgba(44,34,24,0.12)"; e.currentTarget.style.borderColor = "rgba(44,34,24,0.3)"; } e.currentTarget.style.transform = "scale(1.05)"; }}
                              onMouseLeave={e => { if (!open) { e.currentTarget.style.background = "rgba(44,34,24,0.06)"; e.currentTarget.style.borderColor = "rgba(44,34,24,0.1)"; } e.currentTarget.style.transform = "scale(1)"; }}>
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                      {desktopOpenCat && activeSubs.length > 0 && (
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:12, paddingTop:12, borderTop:"1px dashed rgba(44,34,24,0.15)" }}>
                          {activeSubs.map(sub => (
                            <button key={sub} onClick={() => { abrirCatalogo({ categoria: activeCat, subcategoria: sub }); setHoveredNavCat(null); setDesktopOpenCat(null); }}
                              style={{ background:"none", border:"1px solid rgba(44,34,24,0.2)", borderRadius:999, color:MID, padding:"5px 12px", fontSize:10, cursor:"pointer", letterSpacing:0.5, textTransform:"uppercase", transition:"background 0.15s, color 0.15s" }}
                              onMouseEnter={e => { e.currentTarget.style.background = "rgba(44,34,24,0.06)"; e.currentTarget.style.color = T; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = MID; }}>
                              {sub}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    </>
                  );
                })()}
              </div>
              {generosParaElMenu && (
                <>
                  <button onClick={() => { changeGender(activeGender==="mujer" ? null : "mujer"); scrollTo("coleccion"); }}
                    style={{ background:"none", border:"none", fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", color: activeGender==="mujer" ? A : MID, ...esperandoGeneros }}>Mujer</button>
                  <button onClick={() => { changeGender(activeGender==="hombre" ? null : "hombre"); scrollTo("coleccion"); }}
                    style={{ background:"none", border:"none", fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", color: activeGender==="hombre" ? A : MID, ...esperandoGeneros }}>Hombre</button>
                </>
              )}
            </div>
          )}
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {!isMobile && <button onClick={()=>scrollTo("nosotros")} style={{ background:"none", border:"none", color:MID, fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer" }}><EditableZone field="navHistoriaLabel" label="Enlace Nuestra Historia">Nuestra Historia</EditableZone></button>}
            <button onClick={() => setSearchOpen(true)} aria-label="Buscar" style={{ background:"none", border:"none", color:T, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            {pushBell && storeConfig?.showPushBell && !isPreview && (
              <StoreFollowButton storeSlug={storeConfig?.slug ?? ""} color={T} size={18} />
            )}
            {pushBell && storeConfig?.showPushBell && !isPreview && (
              <button onClick={pushBell.openDrawer} style={{ position:"relative", background:"none", border:"none", color:T, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill={pushBell.followState === "following" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {pushBell.hasNew && <span style={{ position:"absolute", top:2, right:2, width:10, height:10, background:"#ef4444", borderRadius:"50%", border:"2px solid #faf7f2" }} />}
              </button>
            )}
            {/* Maquetas de la campanita: solo en el editor. En la demo publica de
                /plantillas no hay tienda que configurar. */}
            {enEditor && (
              <>
                {storeConfig?.showPushBell ? (
                  <button title="Los clientes pueden seguir tu tienda desde acá" style={{ position:"relative", padding:4, display:"flex", alignItems:"center", opacity:0.85, background:"none", border:"none", color:T, cursor:"default" }}>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                  </button>
                ) : (
                  <button onClick={storeConfig?.onPreviewBellClick} title="🔒 Solo Plan Plus — tocá para activar" style={{ position:"relative", padding:4, display:"flex", alignItems:"center", opacity:0.38, background:"none", border:"none", color:T, cursor:"pointer" }}>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                    <span style={{ position:"absolute", top:0, right:0, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
                  </button>
                )}
                {storeConfig?.showPushBell ? (
                  <button onClick={storeConfig.onPreviewBellClick} title="Campanita de novedades — clic para configurar" style={{ position:"relative", padding:4, display:"flex", alignItems:"center", opacity:0.85, background:"none", border:"none", color:T, cursor:"pointer" }}>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  </button>
                ) : (
                  <button onClick={storeConfig?.onPreviewBellClick} title="🔒 Solo Plan Plus — tocá para activar" style={{ position:"relative", padding:4, display:"flex", alignItems:"center", opacity:0.38, background:"none", border:"none", color:T, cursor:"pointer" }}>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    <span style={{ position:"absolute", top:0, right:0, width:12, height:12, background:"#f59e0b", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"white", fontWeight:800 }}>★</span>
                  </button>
                )}
              </>
            )}
            {!isMobile && (
              <button onClick={() => { setFavoritesOpen(true); setUserDropdownOpen(false); setCartOpen(false); }} aria-label="Favoritos" style={{ background:"none", border:"none", color:T, cursor:"pointer", position:"relative", padding:4, display:"flex", alignItems:"center" }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill={favorites.length > 0 ? A : "none"} stroke={favorites.length > 0 ? A : "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {favorites.length > 0 && <span style={{ position:"absolute", top:-5, right:-5, background:A, color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{favorites.length}</span>}
              </button>
            )}
            {/* User icon */}
            {!isMobile && (
              <div ref={userDropdownRef} style={{ position:"relative" }}>
                <button onClick={() => { setUserDropdownOpen(o => !o); setFavoritesOpen(false); }} style={{ background:"none", border:"none", color:T, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </button>
                {userDropdownOpen && (
                  <div style={{ position:"absolute", top:"calc(100% + 10px)", right:0, background:"#faf7f2", border:`1px solid rgba(44,34,24,0.12)`, borderRadius:10, minWidth:190, zIndex:CAPAS.nav, boxShadow:"0 8px 28px rgba(44,34,24,0.12)", overflow:"hidden" }}>
                    {cargando ? (<p style={{ padding:"14px 16px", margin:0, fontSize:12, opacity:0.55 }}>Cargando…</p>) : logueado ? (
                      <>
                        <p style={{ padding:"10px 16px 4px", fontSize:11, color:"rgba(44,34,24,0.45)", margin:0, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {nombreMostrado}
                        </p>
                        <a href={panelHref} onClick={() => setUserDropdownOpen(false)}
                          style={{ display:"block", padding:"10px 16px", fontSize:13, color:T, textDecoration:"none", borderBottom:`1px solid rgba(44,34,24,0.06)` }}
                          onMouseEnter={e => (e.currentTarget.style.background="rgba(44,34,24,0.04)")}
                          onMouseLeave={e => (e.currentTarget.style.background="transparent")}>{panelLabel}</a>
                        <button onClick={() => { if (isPreview) return; setUserDropdownOpen(false); signOut("/"); }}
                          style={{ display:"block", width:"100%", padding:"10px 16px", fontSize:13, color:"#dc2626", background:"none", border:"none", textAlign:"left", cursor: isPreview ? "default" : "pointer", opacity: isPreview ? 0.45 : 1 }}
                          onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background="rgba(220,38,38,0.06)"; }}
                          onMouseLeave={e => (e.currentTarget.style.background="transparent")}>Cerrar sesión</button>
                      </>
                    ) : (
                      <>
                        <a href={isPreview ? undefined : `/login?redirect=/tienda/${storeConfig?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)}
                          style={{ display:"block", padding:"12px 16px", fontSize:13, color:T, textDecoration:"none", borderBottom:`1px solid rgba(44,34,24,0.06)`, cursor: isPreview ? "default" : "pointer" }}
                          onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background="rgba(44,34,24,0.04)"; }}
                          onMouseLeave={e => (e.currentTarget.style.background="transparent")}>Iniciar sesión</a>
                        <a href={isPreview ? undefined : `/registro?plan=buyer&redirect=/tienda/${storeConfig?.slug}`} onClick={() => !isPreview && setUserDropdownOpen(false)}
                          style={{ display:"block", padding:"12px 16px", fontSize:13, color:T, textDecoration:"none", cursor: isPreview ? "default" : "pointer" }}
                          onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background="rgba(44,34,24,0.04)"; }}
                          onMouseLeave={e => (e.currentTarget.style.background="transparent")}>Registrarse</a>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            {isMobile && (
              <button onClick={() => { setMobileMenuOpen(o => !o); setMobileCatsOpen(false); setMobileOpenCat(null); }} style={{ background:"none", border:"none", color:T, cursor:"pointer", padding:4, display:"flex", alignItems:"center", flexDirection:"column", gap:4 }}>
                <span style={{ display:"block", width:22, height:2, background:T, transition:"all 0.3s", transform: mobileMenuOpen ? "rotate(45deg) translate(4px, 4px)" : "none" }}/>
                <span style={{ display:"block", width:22, height:2, background:T, transition:"all 0.3s", opacity: mobileMenuOpen ? 0 : 1 }}/>
                <span style={{ display:"block", width:22, height:2, background:T, transition:"all 0.3s", transform: mobileMenuOpen ? "rotate(-45deg) translate(4px, -4px)" : "none" }}/>
              </button>
            )}
          </div>
        </div>
      </nav>
      {/* ── MOBILE MENU */}
      {isMobile && mobileMenuOpen && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top: isPreview ? 0 : 60 + announcementBarHeight, left:0, right:0, bottom:0, background:BG, zIndex:CAPAS.menuMobile, overflowY:"auto", overscrollBehavior:"contain", paddingTop:8 }}>
          {/* Categorías — acordeón colapsable */}
          {categoryList.length > 0 && (
            <>
              <button onClick={() => setMobileCatsOpen(o => !o)}
                style={{ display:"flex", width:"100%", background:"none", border:"none", borderBottom:`1px solid rgba(44,34,24,0.06)`, color:T, padding:"16px 24px", fontSize:13, textAlign:"left", cursor:"pointer", letterSpacing:2, textTransform:"uppercase", alignItems:"center", justifyContent:"space-between" }}>
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
                    }} style={{ display:"flex", width:"100%", background:"rgba(44,34,24,0.03)", border:"none", borderBottom:`1px solid rgba(44,34,24,0.04)`, color: activeCategory===cat ? A : T, padding:"13px 24px 13px 40px", fontSize:12, textAlign:"left", cursor:"pointer", letterSpacing:2, textTransform:"uppercase", alignItems:"center", justifyContent:"space-between" }}>
                      {cat}
                      {subs.length > 0 && <span style={{ fontSize:12, opacity:0.5, transition:"transform 0.2s", transform: mobileOpenCat===cat ? "rotate(90deg)" : "none", display:"inline-block" }}>›</span>}
                    </button>
                    {subs.length > 0 && mobileOpenCat === cat && subs.map(sub => (
                      <button key={sub} onClick={() => { abrirCatalogo({ categoria: cat, subcategoria: sub }); setMobileMenuOpen(false); setMobileCatsOpen(false); setMobileOpenCat(null); }}
                        style={{ display:"block", width:"100%", background:"rgba(44,34,24,0.05)", border:"none", borderBottom:`1px solid rgba(44,34,24,0.03)`, color:MID, padding:"11px 24px 11px 60px", fontSize:11, textAlign:"left", cursor:"pointer", letterSpacing:2, textTransform:"uppercase" }}>
                        {sub}
                      </button>
                    ))}
                  </Fragment>
                );
              })}
            </>
          )}
          {hayGeneros && [["Mujer","mujer"],["Hombre","hombre"]].map(([label, g]) => (
            <button key={g} onClick={() => { changeGender(activeGender===g ? null : g); scrollTo("coleccion"); setMobileMenuOpen(false); }}
              style={{ display:"block", width:"100%", background:"none", border:"none", borderBottom:`1px solid rgba(44,34,24,0.06)`, color: activeGender===g ? A : T, padding:"16px 24px", fontSize:13, textAlign:"left", cursor:"pointer", letterSpacing:2, textTransform:"uppercase" }}>
              {label}
            </button>
          ))}
          <button onClick={() => { scrollTo("nosotros"); setMobileMenuOpen(false); }}
            style={{ display:"block", width:"100%", background:"none", border:"none", borderBottom:`1px solid rgba(44,34,24,0.06)`, color:MID, padding:"16px 24px", fontSize:13, textAlign:"left", cursor:"pointer", letterSpacing:2, textTransform:"uppercase" }}>
            Nuestra Historia
          </button>
          <button onClick={() => { setFavoritesOpen(true); setMobileMenuOpen(false); setUserDropdownOpen(false); setCartOpen(false); }}
            style={{ display:"block", width:"100%", background:"none", border:"none", borderBottom:`1px solid rgba(44,34,24,0.06)`, color:MID, padding:"16px 24px", fontSize:13, textAlign:"left", cursor:"pointer", letterSpacing:2, textTransform:"uppercase" }}>
            Favoritos {favorites.length > 0 && `(${favorites.length})`}
          </button>
          {/* Cuenta — mismo contenido que el dropdown de escritorio, adaptado a lista */}
          {cargando ? (<p style={{ padding:"14px 16px", margin:0, fontSize:12, opacity:0.55 }}>Cargando…</p>) : logueado ? (
            <>
              <a href={panelHref} onClick={() => setMobileMenuOpen(false)}
                style={{ display:"block", width:"100%", background:"none", border:"none", color:T, padding:"16px 24px", fontSize:13, textAlign:"left", letterSpacing:2, textTransform:"uppercase", textDecoration:"none" }}>
                {panelLabel}
              </a>
              <button onClick={() => { if (isPreview) return; setMobileMenuOpen(false); signOut("/"); }}
                style={{ display:"block", width:"100%", background:"none", border:"none", color:"#dc2626", padding:"16px 24px", fontSize:13, textAlign:"left", cursor: isPreview ? "default" : "pointer", letterSpacing:2, textTransform:"uppercase", opacity: isPreview ? 0.45 : 1 }}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <a href={isPreview ? undefined : `/login?redirect=/tienda/${storeConfig?.slug}`} onClick={() => !isPreview && setMobileMenuOpen(false)}
                style={{ display:"block", width:"100%", background:"none", border:"none", color:T, padding:"16px 24px", fontSize:13, textAlign:"left", letterSpacing:2, textTransform:"uppercase", textDecoration:"none", cursor: isPreview ? "default" : "pointer" }}>
                Iniciar sesión
              </a>
              <a href={isPreview ? undefined : `/registro?plan=buyer&redirect=/tienda/${storeConfig?.slug}`} onClick={() => !isPreview && setMobileMenuOpen(false)}
                style={{ display:"block", width:"100%", background:"none", border:"none", color:T, padding:"16px 24px", fontSize:13, textAlign:"left", letterSpacing:2, textTransform:"uppercase", textDecoration:"none", cursor: isPreview ? "default" : "pointer" }}>
                Registrarse
              </a>
            </>
          )}
        </div>
      )}

      {/* ── EL CATÁLOGO, acá adentro ───────────────────────────────────────────
          Es EL MISMO catálogo que se veía antes: mismo componente, mismo vestido
          de Boho Terra. No se rediseñó nada. Lo único que cambió es dónde vive.

          Antes era una página aparte y llegar ahí recargaba el navegador entero.
          Ahora se dibuja entre la barra y el pie de Boho Terra, que son los suyos
          y ya están puestos — por eso va `sinPie`, o quedarían dos pies pegados.

          `template` va a mano y no sale de la base: eso es justamente lo que
          estaba mal. Con Aire guardado y Boho Terra en la previa, el catálogo se
          dibujaba con el vestido de Aire. Acá el template ya sabe cuál es.

          `enEditor` va explícito por lo mismo. El catálogo lo daba por sentado
          —"si me embeben, es el editor"— y acá eso es falso: éste es el catálogo
          de la tienda PUBLICADA. El porqué largo, con lo que se apagaba, está en
          el tipo `CatalogoEmbebido`. */}
      {vista.enCatalogo && (
        <CatalogoGenerico embebido={{ ...filtroCatalogo, slug: storeConfig?.slug ?? "", template: "boho-terra", sinPie: true, enEditor: isPreview }} />
      )}

      {vista.enPortada && (<>

      {/* ── HERO — fondo crema con tipografía grande + foto al costado */}
      <section id="inicio" style={{ paddingTop: isPreview ? 0 : 60 + announcementBarHeight, minHeight: isMobile ? "auto" : "100vh", display:"flex", alignItems:"stretch", flexDirection: isMobile ? "column" : "row" }}>
        <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent: isMobile ? "flex-start" : "center", padding: isMobile ? "40px 20px 48px" : "80px 80px 80px 80px", maxWidth: isMobile ? "100%" : 600, background:heroLeftBg, position:"relative" }}>
          <EditableSectionBg field="bgHeroLeft" label="Fondo hero" nombreBloque="Banner principal" />
          <p style={{ fontSize:11, letterSpacing:5, color:A, textTransform:"uppercase", marginBottom:24 }}>
            <EditableZone field="storeTagline" label="Tagline">{storeConfig?.storeTagline ?? "Nueva temporada · 2025"}</EditableZone>
          </p>
          <h1 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(52px,6vw,90px)", fontWeight:400, lineHeight:1, margin:"0 0 32px", color:heroLeftText, fontStyle:"italic" }}>
            <EditableZone field="heroHeading" label="Título principal">Lo natural siempre vuelve.</EditableZone>
          </h1>
          <p style={{ fontSize:15, color:heroLeftMid, lineHeight:1.8, marginBottom:48, maxWidth:380 }}>
            <EditableZone field="heroSubtext" label="Subtítulo hero">Ropa hecha con fibras naturales y tinturas vegetales. Artesanal, local, consciente.</EditableZone>
          </p>
          {/* En celular el botón va centrado: la columna ocupa todo el ancho y el
              botón, que mide lo que dice, quedaba pegado a la izquierda con medio
              renglón vacío al lado. En escritorio sigue arrancando a la izquierda,
              alineado con el título y el subtítulo. */}
          {(editMode || !storeConfig?.textOverrides?.["heroCta"]?.hidden) && (
            <button onClick={()=>scrollTo("coleccion")} style={{ alignSelf: isMobile ? "center" : "flex-start", background:"none", color:heroLeftText, border:`1.5px solid ${heroLeftText}`, padding:"14px 40px", fontSize:11, letterSpacing:4, textTransform:"uppercase", cursor:"pointer", transition:"all 0.25s" }}
              onMouseEnter={e=>{ e.currentTarget.style.background=heroLeftText; e.currentTarget.style.color=heroLeftBotonText; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="none"; e.currentTarget.style.color=heroLeftText; }}>
              <EditableZone field="heroCta" label="Botón principal">Ver Colección</EditableZone>
            </button>
          )}
        </div>
        {/* fotos apiladas */}
        <div style={{ flex:1, display: isMobile ? "none" : "grid", gridTemplateRows:"1fr 1fr", gridTemplateColumns:"1fr 1fr", gap:4, padding:4 }}>
          <div style={{ overflow:"hidden", gridRow:"1/3", position:"relative" }}>
            <FadeImage src={heroImage1Ov?.url ?? "https://picsum.photos/seed/terra-h1/600/900"} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" style={{ objectFit:"cover", objectPosition:`${heroImage1Ov?.posX ?? 50}% ${heroImage1Ov?.posY ?? 50}%` }}/>
            {heroImage1Ov?.overlayType && heroImage1Ov.overlayType !== "none" && (
              <div style={{ position:"absolute", inset:0, pointerEvents:"none", background: heroImage1Ov.overlayType === "light" ? `rgba(255,255,255,${heroImage1Ov.overlayOpacity ?? 0.45})` : `rgba(44,34,24,${heroImage1Ov.overlayOpacity ?? 0.45})` }} />
            )}
            <BgDragHandle imgKey="heroImage1" />
            <EditableImageButton field="heroImage1" label="Imagen hero izquierda" />
          </div>
          <div style={{ overflow:"hidden", position:"relative" }}>
            <FadeImage src={heroImage2Ov?.url ?? "https://picsum.photos/seed/terra-h2/600/500"} alt="" fill sizes="25vw" style={{ objectFit:"cover", objectPosition:`${heroImage2Ov?.posX ?? 50}% ${heroImage2Ov?.posY ?? 50}%` }}/>
            {heroImage2Ov?.overlayType && heroImage2Ov.overlayType !== "none" && (
              <div style={{ position:"absolute", inset:0, pointerEvents:"none", background: heroImage2Ov.overlayType === "light" ? `rgba(255,255,255,${heroImage2Ov.overlayOpacity ?? 0.45})` : `rgba(44,34,24,${heroImage2Ov.overlayOpacity ?? 0.45})` }} />
            )}
            <BgDragHandle imgKey="heroImage2" />
            <EditableImageButton field="heroImage2" label="Imagen hero superior" />
          </div>
          <div style={{ overflow:"hidden", position:"relative" }}>
            <FadeImage src={heroImage3Ov?.url ?? "https://picsum.photos/seed/terra-h3/600/500"} alt="" fill sizes="25vw" style={{ objectFit:"cover", objectPosition:`${heroImage3Ov?.posX ?? 50}% ${heroImage3Ov?.posY ?? 50}%` }}/>
            {heroImage3Ov?.overlayType && heroImage3Ov.overlayType !== "none" && (
              <div style={{ position:"absolute", inset:0, pointerEvents:"none", background: heroImage3Ov.overlayType === "light" ? `rgba(255,255,255,${heroImage3Ov.overlayOpacity ?? 0.45})` : `rgba(44,34,24,${heroImage3Ov.overlayOpacity ?? 0.45})` }} />
            )}
            <BgDragHandle imgKey="heroImage3" />
            <EditableImageButton field="heroImage3" label="Imagen hero inferior" />
          </div>
        </div>
      </section>

      <div style={{ display:"flex", flexDirection:"column" }}>
      {/* ── MAYORISTA — banner "Solicitá tu lista de precios" ── */}
      <SectionBlock id="bt-mayorista" label="Mayorista" isPreview={isPreview} defaultOrder={BT_SECTION_IDS}>
      {isWholesale && (
        <section data-reveal style={{ background:S, borderTop:`1px solid rgba(181,101,42,0.2)`, borderBottom:`1px solid rgba(181,101,42,0.2)` }}>
          <div style={{ maxWidth:1280, margin:"0 auto", padding:"60px 40px", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", gap:20 }}>
            <span style={{ fontSize:10, letterSpacing:4, color:A, textTransform:"uppercase", fontWeight:700, border:`1px solid ${A}`, padding:"4px 12px", borderRadius:20 }}>Tienda mayorista</span>
            <h2 style={{ fontSize:"clamp(26px,3.5vw,44px)", fontWeight:400, color:T, margin:0, fontFamily:"Georgia, 'Times New Roman', serif", lineHeight:1.25, fontStyle:"italic" }}>
              Solicitá tu lista de <strong style={{ fontStyle:"normal", color:A }}>precios</strong>
            </h2>
            <p style={{ fontSize:14, color:MID, maxWidth:480, margin:0, lineHeight:1.7 }}>
              Precios exclusivos para revendedores y distribuidores. Completá el formulario de contacto y te respondemos con tu lista personalizada en menos de 24 hs.
            </p>
            <button onClick={() => scrollTo("contacto")}
              style={{ background:A, color:"#fff", border:"none", padding:"13px 36px", fontSize:12, fontWeight:700, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", borderRadius:30, marginTop:4 }}>
              Consultar ahora
            </button>
          </div>
        </section>
      )}
      </SectionBlock>

      {/* ── BANNER HORIZONTAL ──────────────────────────────── */}
      <SectionBlock id="bt-banner" label="Banner horizontal" isPreview={isPreview} defaultOrder={BT_SECTION_IDS}>
        <PromoBannerCarousel
          images={[storeConfig?.imageOverrides?.["promoBanner1"], storeConfig?.imageOverrides?.["promoBanner2"], storeConfig?.imageOverrides?.["promoBanner3"]]}
          demoImages={[
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1920&q=80",
            "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1920&q=80",
            "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1920&q=80",
          ]}
          intervalMs={storeConfig?.bannerInterval ?? 4000}
          editMode={editMode}
          isPreview={isPreview}
          accent={A}
          bg={BG}
        />
      </SectionBlock>

      <SectionBlock id="bt-coleccion" label="Colección" isPreview={isPreview} defaultOrder={BT_SECTION_IDS}>
      {/* ── COLECCIÓN — carrusel */}
      <section id="coleccion" data-reveal style={{ padding:"80px 0", background:coleccionBg, position:"relative" }}>
        <EditableSectionBg field="bgColeccion" label="Fondo colección" />
        {/* encabezado */}
        <div style={{ maxWidth:1280, margin:"0 auto", paddingLeft: isMobile ? 16 : 40, paddingRight: isMobile ? 16 : 40, paddingTop: 0, paddingBottom: 24, marginBottom:40, borderBottom:`1px solid rgba(44,34,24,0.1)` }}>
          {/* El título del bloque más grande de la portada era el único que no se
              podía editar. No estaba envuelto en `EditableZone` como el resto y no
              había forma de tocarlo desde el editor.
              Se puede editar SÓLO cuando dice el texto de fábrica. Cuando el
              visitante filtra, el título pasa a ser el nombre del filtro —"Mujer",
              "Camperas"— y eso es un dato, no una frase de la tienda: dejarlo
              editable ahí sería ofrecerle a la dueña cambiar un texto que
              desaparece apenas alguien toca un botón. */}
          <h2 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(22px,2.5vw,32px)", fontWeight:400, fontStyle:"italic", margin:0, color:coleccionText }}>
            {activeGender==="mujer" ? "Mujer"
             : activeGender==="hombre" ? "Hombre"
             : activeCategory!=="Todos" ? activeCategory
             : <EditableZone field="coleccionTitle" label="Título colección">Toda la colección</EditableZone>}
          </h2>
          {/* El número decía `allFiltered.length` pero el carrusel muestra
              `slice(0, CAROUSEL_LIMIT)` = 8. Una tienda con 50 productos anunciaba
              "50 piezas" al lado del título y el carrusel se plantaba en la octava,
              sin ninguna señal de que ahí se acababa lo que este bloque muestra.
              El número está pegado al título: se lee como una promesa DEL BLOQUE.
              Ahora dice las dos cosas cuando no coinciden. */}
          <p style={{ fontSize:12, color:coleccionMid, margin:"6px 0 0" }}>
            {allFiltered.length > CAROUSEL_LIMIT
              ? `${CAROUSEL_LIMIT} de ${allFiltered.length} piezas`
              : `${allFiltered.length} ${allFiltered.length === 1 ? "pieza" : "piezas"}`}
          </p>
          {/* El engranaje para elegir QUÉ ocho van acá. Sólo en edición, y sobre el
              bloque: es una decisión que se toma mirando el carrusel lleno. */}
          <div style={{ marginTop:10 }}>
            <BotonVitrina products={products} cuantos={CAROUSEL_LIMIT} acento={A} />
          </div>
        </div>

        {/* Filtrar hasta dejarla vacía mostraba "0 piezas" y abajo el hueco del
            carrusel, en blanco: ni un cartel, ni forma de volver. Se llega apretando
            "Mujer" u "Hombre" en una tienda que carga género y vende para uno solo —
            esos dos botones están siempre en el menú, sin chequear si hay algo detrás.
            El botón de volver es lo importante: sin él hay que adivinar que se sale
            tocando de nuevo el mismo filtro que te dejó acá. */}
        {allFiltered.length === 0 ? (
          <div style={{ textAlign:"center", padding: isMobile ? "48px 24px" : "72px 40px" }}>
            <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize: isMobile ? 18 : 22, color:coleccionText, margin:"0 0 10px" }}>
              No hay piezas en esta selección
            </p>
            <p style={{ fontSize:13, color:coleccionMid, margin:"0 0 24px" }}>
              Probá con otra categoría, o mirá la colección completa.
            </p>
            <button onClick={() => { setActiveGender(null); setActiveCategory("Todos"); setCarouselIdx(0); }}
              style={{ border:`1px solid ${coleccionText}`, color:coleccionText, background:"transparent", padding:"12px 32px", fontSize:11, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", fontFamily:"Georgia, serif", fontStyle:"italic" }}>
              Ver toda la colección
            </button>
          </div>
        ) : (<>
        {/* carrusel — overflow visible para que se vean las tarjetas */}
        {/* El `maxWidth:1280` no estaba, y el encabezado de esta misma sección SÍ
            lo tiene: en una pantalla ancha la línea del título terminaba bastante
            antes que las tarjetas, que se iban de borde a borde. Además las dejaba
            enormes —tres repartiéndose 1700px son ~550 cada una, contra los ~300 de
            "Lo más visto"— y el mismo producto se veía de dos tamaños muy distintos
            según en qué bloque apareciera. Es el ancho que usa todo el resto. */}
        {/* El espacio de las flechas es un PASILLO de este contenedor, no relleno
            del carril de adentro. Estando adentro, las tarjetas se asomaban en esa
            franja —el `overflow:hidden` recorta en el borde del padding, no antes—
            y las flechas quedaban encima de la prenda. Acá afuera, el carril
            termina donde termina la última tarjeta y las flechas viven al costado.
            El pasillo se reserva aunque la flecha de ese lado no esté dibujada (en
            la primera vista no hay "anterior"): si apareciera y desapareciera, el
            carrusel entero se correría de lugar al pasar de página. */}
        <div style={{ position:"relative", maxWidth:1280, margin:"0 auto", boxSizing:"border-box",
                      padding: isMobile ? 0 : (maxIdx > 0 ? "0 56px" : 0) }} {...carouselSwipe}>
          {/* área deslizante */}
          <div ref={carouselRef} style={{ overflow:"hidden", padding: isMobile ? "0 16px" : 0 }}>
            <div style={{ display:"flex", gap:20, transition:"transform 0.45s cubic-bezier(.4,0,.2,1)", transform: isMobile ? `translateX(calc(-${idxColeccion} * (85% + 20px)))` : `translateX(calc(-${idxColeccion} * (100% / ${CARDS_PER_VIEW} + 20px / ${CARDS_PER_VIEW})))` }}>
              {carouselProducts.map(product=>{
                const promo = resolveProductPromo(product, promotions);
                return (
                <div key={product.id}
                  style={{ flexShrink:0, width: isMobile ? "85%" : `calc((100% - ${(CARDS_PER_VIEW-1)*20}px) / ${CARDS_PER_VIEW})`, cursor:"pointer", position:"relative" }}
                  onClick={()=>openModal(product)}>
                  {(() => {
                    // PROMO de tienda → tag naranja; OFERTA del producto → badge rojo.
                    if (promo.primaryPromo) return <PromoTag tipo={promo.primaryPromo.type} label={describePromo(promo.primaryPromo).headline} size="md" paleta={PALETA_PROMO_TIERRA} />;
                    const hasOffer = !!product.comparePrice && product.comparePrice > product.price;
                    if (!hasOffer) return null;
                    return <OfferBadge badge={product.offerBadge} pct={discountPercent(product.price, product.comparePrice)} size="md" />;
                  })()}
                  {/* foto */}
                  <div style={{ position:"relative", aspectRatio:"3/4", overflow:"hidden", background:S, marginBottom:16 }}
                    onMouseEnter={e=>{ const img = e.currentTarget.querySelector("img") as HTMLImageElement; if(img) img.style.transform="scale(1.05)"; }}
                    onMouseLeave={e=>{ const img = e.currentTarget.querySelector("img") as HTMLImageElement; if(img) img.style.transform="scale(1)"; }}>
                    {product.images[0] && <FadeImage src={product.images[0]} alt={product.name} fill sizes={isMobile ? "85vw" : "30vw"} style={{ objectFit:"cover", transition:"transform 0.55s ease" }}/>}
                    {(() => {
                      const isSoldOut = product.variants.length > 0 && product.variants.reduce((s, v) => s + (v.stock || 0), 0) === 0;
                      if (!isSoldOut) return null;
                      return <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(44,34,24,0.7)", display:"flex", alignItems:"center", justifyContent:"center", padding:"9px 0", zIndex:2 }}><span style={{ color:"#f5f0e8", fontSize:9, fontWeight:700, letterSpacing:4, textTransform:"uppercase" }}>Sin stock</span></div>;
                    })()}
                    <div style={{ position:"absolute", bottom:14, left:0, right:0, textAlign:"center" }}>
                      <span style={{ background:"rgba(250,247,242,0.92)", color:T, fontSize:10, letterSpacing:2, textTransform:"uppercase", padding:"7px 18px" }}>Ver pieza</span>
                    </div>
                    {/* Favorite button */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleFavorite(product.id); }}
                      style={{ position:"absolute", top:14, right:14, background:"rgba(250,247,242,0.85)", border:"none", borderRadius:"50%", width:30, height:30, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"transform 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.transform="scale(1.1)")}
                      onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill={favorites.includes(product.id) ? A : "none"} stroke={favorites.includes(product.id) ? A : T} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    </button>
                  </div>
                  {/* info */}
                  <p style={{ fontSize:10, color:A, letterSpacing:3, textTransform:"uppercase", margin:"0 0 5px" }}>{product.category}</p>
                  <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:17, color:coleccionText, margin:"0 0 8px", lineHeight:1.3 }}>{product.name}</p>
                  <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                    {ocultarPrecios ? (
                      <span style={{ fontSize:16, fontWeight:700, color:coleccionText }}>Consultá precio</span>
                    ) : promo.hasPriceDrop ? (
                      <>
                        <span style={{ fontSize:16, fontWeight:700, color:"#dc2626" }}>{fmt(promo.effectivePrice)}</span>
                        <span style={{ fontSize:13, color:coleccionMid, textDecoration:"line-through" }}>{fmt(promo.originalPrice)}</span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize:16, fontWeight:700, color:coleccionText }}>{fmt(product.price)}</span>
                        {product.comparePrice && <span style={{ fontSize:13, color:coleccionMid, textDecoration:"line-through" }}>{fmt(product.comparePrice)}</span>}
                      </>
                    )}
                  </div>
                </div>
                );})}
            </div>
          </div>

          {/* flechas */}
          {idxColeccion > 0 && (
            <button onClick={prevSlide} style={{ position:"absolute", left:0, top:"38%", transform:"translateY(-50%)", background:BG, border:`1px solid rgba(44,34,24,0.18)`, width:44, height:44, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", zIndex:10 }}
              onMouseEnter={e=>{ e.currentTarget.style.background=T; (e.currentTarget.querySelector("svg") as SVGElement).style.stroke=BG; }}
              onMouseLeave={e=>{ e.currentTarget.style.background=BG; (e.currentTarget.querySelector("svg") as SVGElement).style.stroke=T; }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={T} strokeWidth={1.8} strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          )}
          {idxColeccion < maxIdx && (
            <button onClick={nextSlide} style={{ position:"absolute", right:0, top:"38%", transform:"translateY(-50%)", background:BG, border:`1px solid rgba(44,34,24,0.18)`, width:44, height:44, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", zIndex:10 }}
              onMouseEnter={e=>{ e.currentTarget.style.background=T; (e.currentTarget.querySelector("svg") as SVGElement).style.stroke=BG; }}
              onMouseLeave={e=>{ e.currentTarget.style.background=BG; (e.currentTarget.querySelector("svg") as SVGElement).style.stroke=T; }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={T} strokeWidth={1.8} strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          )}
        </div>

        {/* puntos indicadores */}
        {maxIdx > 0 && (
          <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:32 }}>
            {Array.from({ length: maxIdx + 1 }).map((_, i) => (
              <button key={i} onClick={()=>setCarouselIdx(i)}
                style={{ width: i===idxColeccion ? 28 : 8, height:8, border:"none", borderRadius:4, background: i===idxColeccion ? A : "rgba(44,34,24,0.2)", cursor:"pointer", padding:0, transition:"all 0.3s" }}/>
            ))}
          </div>
        )}
        </>)}

        {/* Ver colección completa — queda SIEMPRE, también con la selección vacía:
            es la salida más útil que puede haber en ese momento. */}
        <div style={{ textAlign:"center", marginTop:48 }}>
          <button type="button" onClick={() => abrirCatalogo()}
            style={{ display:"inline-block", border:`1px solid ${coleccionText}`, color:coleccionText, background:"transparent", padding:"14px 40px", fontSize:11, letterSpacing:3, textTransform:"uppercase", textDecoration:"none", transition:"all 0.2s", fontFamily:"Georgia, serif", fontStyle:"italic", cursor:"pointer" }}
            onMouseEnter={e=>{ e.currentTarget.style.background=coleccionText; e.currentTarget.style.color=coleccionBotonText; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=coleccionText; }}>
            <EditableZone field="coleccionCta" label="Botón ver colección">Ver colección completa</EditableZone>
          </button>
        </div>
      </section>
      </SectionBlock>

      {/* ── OFERTAS ────────────────────────────────────────── */}
      <SectionBlock id="bt-ofertas" label="Ofertas" isPreview={isPreview} defaultOrder={BT_SECTION_IDS}>
        {(allOfertas.length > 0 || isPreview) && (
          <section data-reveal style={{ padding:"80px 0", background:ofertasBg, position:"relative" }}>
            <EditableSectionBg field="bgOfertas" label="Fondo ofertas" />
            <div style={{ maxWidth:1280, margin:"0 auto", paddingLeft: isMobile ? 16 : 40, paddingRight: isMobile ? 16 : 40, paddingTop: 0, paddingBottom: 24, marginBottom:40, borderBottom:`1px solid rgba(44,34,24,0.1)` }}>
              <p style={{ fontSize:10, letterSpacing:5, color:A, textTransform:"uppercase", margin:"0 0 8px", fontFamily:"Georgia, serif", fontStyle:"italic" }}><EditableZone field="ofertasKicker" label="Texto sobre Ofertas">Aprovechá</EditableZone></p>
              <h2 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(22px,2.5vw,32px)", fontWeight:400, fontStyle:"italic", margin:0, color:ofertasText }}><EditableZone field="ofertasTitle" label="Título Ofertas">Ofertas</EditableZone></h2>
            </div>
            {/* Mismo caso que el carrusel de la colección: el encabezado va a 1280
                y las tarjetas se iban de borde a borde. */}
            {/* Mismo pasillo que el carrusel de la colección. */}
            <div style={{ position:"relative", maxWidth:1280, margin:"0 auto", boxSizing:"border-box",
                          padding: isMobile ? 0 : (ofertasMaxIdx > 0 ? "0 56px" : 0) }} {...ofertasSwipe}>
              <div style={{ overflow:"hidden", padding: isMobile ? (ofertasMaxIdx > 0 ? "0 60px" : "0 16px") : 0 }}>
                <div style={{ display:"flex", gap:20, transition:"transform 0.45s cubic-bezier(.4,0,.2,1)", transform: isMobile ? `translateX(calc(-${idxOfertas} * (85% + 20px)))` : `translateX(calc(-${idxOfertas} * (100% / ${CARDS_PER_VIEW} + 20px / ${CARDS_PER_VIEW})))` }}>
                  {ofertasProducts.map(p => {
                    // El "-30%" tiene que decir el MISMO descuento que el precio de
                    // abajo. Si hay promo de tienda vigente manda ella; si no, sale
                    // de la oferta del producto (comparePrice), como antes.
                    const promoP = resolveProductPromo(p, promotions);
                    const pct = promoP.hasPriceDrop
                      ? promoP.pctOff
                      : (p.comparePrice && p.comparePrice > p.price ? Math.round((1 - p.price / p.comparePrice) * 100) : null);
                    return (
                      <div key={p.id} onClick={() => openModal(p)} className="bt-zoom"
                        style={{ flexShrink:0, width: isMobile ? "85%" : `calc((100% - ${(CARDS_PER_VIEW-1)*20}px) / ${CARDS_PER_VIEW})`, cursor:"pointer", position:"relative" }}>
                        <div style={{ position:"relative", aspectRatio:"3/4", overflow:"hidden", background:BG, marginBottom:16 }}>
                          {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes={isMobile ? "85vw" : "30vw"} className="bt-zoom-img" style={{ objectFit:"cover" }} />}
                          {pct && <div style={{ position:"absolute", top:14, left:14, background:A, color:"#fff", fontSize:9, fontWeight:600, letterSpacing:2, padding:"4px 10px", textTransform:"uppercase" }}>Oferta -{pct}%</div>}
                        </div>
                        <p style={{ fontSize:10, color:A, letterSpacing:3, textTransform:"uppercase", margin:"0 0 5px" }}>{p.category}</p>
                        <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:17, color:ofertasText, margin:"0 0 8px", lineHeight:1.3 }}>{p.name}</p>
                        <PromoPrice product={p} promotions={promotions} fmt={fmt} accent={ofertasText}
                          priceSize={16} compareSize={13} weight={700} ocultarPrecios={ocultarPrecios}
                          gap={10} align="center" />
                      </div>
                    );
                  })}
                </div>
              </div>
              {idxOfertas > 0 && (
                <button onClick={prevOferta} style={{ position:"absolute", left:0, top:"38%", transform:"translateY(-50%)", background:BG, border:`1px solid rgba(44,34,24,0.18)`, width:44, height:44, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10 }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={T} strokeWidth={1.8} strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
              )}
              {idxOfertas < ofertasMaxIdx && (
                <button onClick={nextOferta} style={{ position:"absolute", right:0, top:"38%", transform:"translateY(-50%)", background:BG, border:`1px solid rgba(44,34,24,0.18)`, width:44, height:44, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10 }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={T} strokeWidth={1.8} strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              )}
            </div>
            {ofertasHasMore && (
              <div style={{ textAlign:"center", marginTop:32 }}>
                <button onClick={() => { abrirCatalogo({ soloOfertas: true }); }}
                  style={{ display:"inline-block", border:`1px solid ${ofertasText}`, color:ofertasText, background:"transparent", padding:"14px 40px", fontSize:11, letterSpacing:3, textTransform:"uppercase", fontFamily:"Georgia, serif", fontStyle:"italic", cursor:"pointer" }}><EditableZone field="ofertasCta" label="Botón ver todas las ofertas">Ver todas las ofertas</EditableZone></button>
              </div>
            )}
          </section>
        )}
      </SectionBlock>

      {/* ── LO MÁS VISTO ───────────────────────────────────── */}
      <SectionBlock id="bt-masvisto" label="Lo más visto" isPreview={isPreview} defaultOrder={BT_SECTION_IDS}>
        {(() => {
          // Vistas reales de compradores. En el editor se rellena para poder
          // configurar la sección; en la tienda real, si no hay datos no se muestra.
          const { lista: displayList, conVistas, esRelleno } = masVistos(products, { relleno: isPreview });
          const hasMore = conVistas > displayList.length;
          if (displayList.length === 0) return null;
          return (
            <section data-reveal style={{ position:"relative", background:masVistoBg, padding: isMobile ? "48px 16px" : "80px 32px", borderTop:`1px solid rgba(44,34,24,0.08)` }}>
              <EditableSectionBg field="bgMasVisto" label="Fondo lo más visto" />
              <div style={{ maxWidth:1280, margin:"0 auto" }}>
                <div style={{ marginBottom:40 }}>
                  <p style={{ fontSize:10, letterSpacing:5, color:A, textTransform:"uppercase", margin:"0 0 8px", fontFamily:"Georgia, serif", fontStyle:"italic" }}><EditableZone field="masVistoKicker" label="Texto sobre Lo más visto">Tendencia</EditableZone></p>
                  <h2 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(22px,2.5vw,32px)", fontWeight:400, fontStyle:"italic", margin:0, color:masVistoText }}><EditableZone field="masVistoTitle" label="Título Lo más visto">Lo más visto</EditableZone></h2>
                </div>
                {/* Solo el dueño, y solo en el editor: la sección se está viendo con
                    relleno porque la tienda todavía no juntó vistas. */}
                {esRelleno && enEditor && (
                  <p style={{ margin:"-24px 0 24px", fontSize:12, color:"#b45309", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:6, padding:"8px 12px" }}>
                    Todavía no hay suficientes vistas de compradores, así que te mostramos productos de ejemplo
                    para que puedas darle formato. <b>En tu tienda esta sección aparece sola</b> cuando al menos
                    {" "}{MIN_MAS_VISTOS} productos hayan sido vistos.
                  </p>
                )}
                <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap:16 }}>
                  {displayList.map((p) => (
                    <div key={p.id} onClick={() => openModal(p)} className="bt-zoom" style={{ cursor:"pointer" }}>
                      {/* Sin el "#1, #2…" de antes: numerar sugiere un ranking firme
                          donde la diferencia real suele ser de una sola visita. */}
                      <div style={{ position:"relative", width:"100%", aspectRatio:"3/4", background:"#ede8e0", overflow:"hidden" }}>
                        {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="bt-zoom-img" style={{ objectFit:"cover" }} />}
                      </div>
                      <div style={{ padding:"10px 0 0" }}>
                        <p style={{ margin:"0 0 4px", fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:14, color:masVistoText }}>{p.name}</p>
                        <PromoPrice product={p} promotions={promotions} fmt={fmt} accent={masVistoText}
                          priceSize={14} compareSize={11} weight={700} ocultarPrecios={ocultarPrecios}
                          consultaLabel="Consultá" />
                      </div>
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <div style={{ textAlign:"center", marginTop:32 }}>
                    <button onClick={() => { abrirCatalogo({ masVistos: true }); }}
                      style={{ display:"inline-block", border:`1px solid ${masVistoText}`, color:masVistoText, background:"transparent", padding:"14px 40px", fontSize:11, letterSpacing:3, textTransform:"uppercase", fontFamily:"Georgia, serif", fontStyle:"italic", cursor:"pointer" }}><EditableZone field="masVistoCta" label="Botón ver más">Ver más</EditableZone></button>
                  </div>
                )}
              </div>
            </section>
          );
        })()}
      </SectionBlock>

      <SectionBlock id="bt-prueba-social" label="Prueba social" isPreview={isPreview} defaultOrder={BT_SECTION_IDS}
        avisoAlOcultar="Si lo ocultás, tus clientes dejan de poder opinar sobre la TIENDA: el botón para dejar una opinión vive adentro de este bloque. Las reseñas de cada producto siguen funcionando desde su ficha. Las que ya tenés no se borran, pero dejan de verse.">
        {(() => {
          const allReviews = resenas.lista;
          // El bloque se dibuja SIEMPRE, aun sin una sola reseña: adentro está el
          // botón para dejar la primera. Escondiéndolo con cero, una tienda nueva
          // no tenía nunca cómo arrancar — el único lugar desde donde se deja una
          // aparecía recién cuando ya había una.
          const idx = allReviews.length ? Math.min(reviewCarouselPage, allReviews.length - 1) : 0;
          const r = allReviews[idx];
          const cambiarTab = (t: "tienda" | "producto") => { resenas.setTab(t); setReviewCarouselPage(0); };
          return (
            <section data-reveal style={{ position:"relative", background: sc["bgPruebaSocial"] ?? BG, padding: isMobile ? "64px 24px" : "96px 40px", borderTop:`1px solid rgba(44,34,24,0.08)`, textAlign:"center" }}>
              <EditableSectionBg field="bgPruebaSocial" label="Fondo prueba social" />
              <div style={{ maxWidth:720, margin:"0 auto" }}>
                {/* Las dos pestañas. Las reseñas de TIENDA hablan de la atención y
                    del envío, y no colgaban de ningún producto: antes se pedían al
                    servidor y se descartaban, así que no había dónde verlas. */}
                <div style={{ display:"flex", justifyContent:"center", gap:28, marginBottom:32 }}>
                  {([["tienda","La tienda"],["producto","Los productos"]] as const).map(([id, texto]) => (
                    <button key={id} onClick={() => cambiarTab(id)}
                      style={{ background:"none", border:"none", padding:"0 0 6px", cursor:"pointer", fontSize:10, letterSpacing:3, textTransform:"uppercase",
                               color: resenas.tab === id ? T : MID,
                               borderBottom: resenas.tab === id ? `1px solid ${ATextoBlanco}` : "1px solid transparent" }}>
                      {texto}
                    </button>
                  ))}
                </div>
                <p style={{ fontFamily:"Georgia, serif", fontSize:isMobile ? 52 : 72, color:A, lineHeight:0.6, margin:"0 0 16px", opacity:0.35 }}>&ldquo;</p>
                {!r ? (
                  /* Sin ninguna reseña el título no puede afirmar que los clientes
                     dicen algo: invita a ser el primero, que es de lo único que se
                     puede hablar en ese caso. */
                  <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize: isMobile ? 17 : 20, color:MID, lineHeight:1.85, margin:"0 0 28px" }}>
                    {resenas.tab === "tienda"
                      ? "Todavía nadie contó cómo fue su compra acá. Puede ser tu historia la primera."
                      : "Todavía no hay reseñas de las piezas. Cuando alguien cuente cómo le quedó, va a aparecer acá."}
                  </p>
                ) : (<>
                <div style={{ display:"flex", justifyContent:"center", gap:4, marginBottom:20 }}>
                  {[1,2,3,4,5].map(s => <span key={s} style={{ color: s <= r.rating ? A : "rgba(44,34,24,0.12)", fontSize:14 }}>★</span>)}
                </div>
                <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize: isMobile ? 17 : 20, color:T, lineHeight:1.85, margin:"0 0 28px" }}>{r.comment}</p>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  {r.product?.image && (
                    <FadeImage src={r.product.image} alt={r.product?.name ?? ""} width={44} height={44} style={{ objectFit:"cover", borderRadius:6, border:`1px solid rgba(44,34,24,0.12)` }} />
                  )}
                  <p style={{ fontSize:12, fontWeight:600, color:T, margin:0, letterSpacing:2, textTransform:"uppercase" }}>{r.reviewer}</p>
                  {r.product?.name && <p style={{ fontSize:11, color:MID, margin:0 }}>{r.product.name}</p>}
                  {/* "auto" = el sistema cruzó un pedido ENTREGADO con ese email y
                      ese producto. "owner" = lo marcó el dueño a mano. Decir
                      "Compra verificada" en los dos casos es afirmarle al
                      comprador una compra que nadie comprobó. El panel del dueño
                      ya los distinguía; el que mentía era este cartel. */}
                  {r.verified && (
                    <p style={{ fontSize:10, fontWeight:600, color: r.verifiedBy === "auto" ? "#16a34a" : MID, margin:"4px 0 0", letterSpacing:0.5 }}>
                      {r.verifiedBy === "auto" ? "✓ Compra verificada" : "✓ Verificada por la tienda"}
                    </p>
                  )}
                </div>
                {allReviews.length > 1 && (
                  <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:10, marginTop:36 }}>
                    <button onClick={() => setReviewCarouselPage(p => Math.max(0, p - 1))} disabled={idx === 0}
                      style={{ background:"none", border:`1px solid rgba(44,34,24,0.2)`, color:T, width:32, height:32, borderRadius:"50%", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.25 : 1, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
                    <div style={{ display:"flex", gap:6 }}>
                      {allReviews.map((_,i) => (
                        <button key={i} onClick={() => setReviewCarouselPage(i)}
                          style={{ width: i === idx ? 18 : 6, height:6, borderRadius:3, background: i === idx ? A : "rgba(44,34,24,0.15)", border:"none", cursor:"pointer", padding:0, transition:"all 0.25s" }} />
                      ))}
                    </div>
                    <button onClick={() => setReviewCarouselPage(p => Math.min(allReviews.length - 1, p + 1))} disabled={idx === allReviews.length - 1}
                      style={{ background:"none", border:`1px solid rgba(44,34,24,0.2)`, color:T, width:32, height:32, borderRadius:"50%", cursor: idx === allReviews.length - 1 ? "default" : "pointer", opacity: idx === allReviews.length - 1 ? 0.25 : 1, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
                  </div>
                )}
                {isOwner && !isPreview && (
                  /* `resenas.borrar` pregunta antes y saca la tarjeta RECIÉN con la
                     confirmación del servidor. El borrado de acá no miraba si la
                     respuesta había salido bien: con el fetch fallando, el dueño la
                     veía desaparecer, se quedaba tranquilo, y al día siguiente
                     seguía publicada. */
                  <button onClick={() => { resenas.borrar(r.id); setReviewCarouselPage(0); }}
                    style={{ marginTop:16, background:"none", border:"none", color:"rgba(44,34,24,0.25)", cursor:"pointer", fontSize:11, letterSpacing:1 }}
                    onMouseEnter={e => (e.currentTarget.style.color="#dc2626")}
                    onMouseLeave={e => (e.currentTarget.style.color="rgba(44,34,24,0.25)")}>
                    Eliminar esta reseña
                  </button>
                )}
                </>)}
                {/* Dejar la propia. Vive en la pestaña de tienda porque es la única
                    reseña que se puede escribir sin haber abierto un producto. */}
                {resenas.tab === "tienda" && (
                  <div style={{ marginTop: r ? 36 : 8 }}>
                    <button onClick={resenas.abrirModal}
                      style={{ background:"none", border:`1px solid ${ATextoBlanco}`, color:ATextoBlanco, padding:"11px 26px", fontSize:10, fontWeight:700, letterSpacing:3, textTransform:"uppercase", cursor:"pointer" }}>
                      Dejá tu opinión
                    </button>
                  </div>
                )}
              </div>
            </section>
          );
        })()}
      </SectionBlock>

      <SectionBlock id="bt-nosotros" label="Nuestra historia" isPreview={isPreview} defaultOrder={BT_SECTION_IDS}>
      {/* ── NOSOTROS — imagen full width + texto encima */}
      <section id="nosotros" data-reveal style={{ background:nosotrosBg, position:"relative" }}>
        <EditableSectionBg field="bgNosotros" label="Fondo nosotros" />
        {/* foto ancha */}
        <div style={{ position:"relative", width:"100%", height:400, overflow:"hidden" }}>
          <FadeImage src={nosotrosImageOv?.url ?? "https://picsum.photos/seed/terra-about/1920/600"} alt="" fill sizes="100vw" style={{ objectFit:"cover", objectPosition:`${nosotrosImageOv?.posX ?? 50}% ${nosotrosImageOv?.posY ?? 35}%` }}/>
          <BgDragHandle imgKey="nosotrosImage" />
          <EditableImageButton field="nosotrosImage" label="Imagen nosotros" />
          <div style={{ position:"absolute", inset:0, background: nosotrosImageOv?.overlayType === "none" ? "transparent" : nosotrosImageOv?.overlayType === "light" ? `rgba(255,255,255,${nosotrosImageOv?.overlayOpacity ?? 0.45})` : `rgba(44,34,24,${nosotrosImageOv?.overlayOpacity ?? 0.45})` }}/>
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <p style={{ fontFamily:"Georgia, serif", fontSize:"clamp(24px,4vw,54px)", fontStyle:"italic", color:"#faf7f2", textAlign:"center", lineHeight:1.3 }}>
              <EditableZone field="quoteText" label="Frase destacada">Hechas con las manos y el corazón.</EditableZone>
            </p>
          </div>
        </div>
        {/* texto + stats */}
        <div style={{ maxWidth:1280, margin:"0 auto", padding: isMobile ? "48px 20px" : "72px 40px", display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr", gap: isMobile ? 32 : 80, alignItems:"start" }}>
          <div>
            <p style={{ fontSize:10, letterSpacing:5, color:A, textTransform:"uppercase", marginBottom:16 }}><EditableZone field="aboutKicker" label="Etiqueta 'Nosotros'">Nuestra historia</EditableZone></p>
            <p style={{ fontSize:15, color:nosotrosText, lineHeight:1.9, marginBottom:20 }}><EditableZone field="aboutParagraph1" label="Párrafo 1 'Nosotros'">Terra nació en Mendoza en 2019 como un pequeño taller de confección artesanal. Hoy somos un equipo de 12 personas que diseña, tiñe y cose cada prenda con materiales de origen responsable.</EditableZone></p>
            <p style={{ fontSize:15, color:nosotrosMid, lineHeight:1.9 }}><EditableZone field="aboutParagraph2" label="Párrafo 2 'Nosotros'">Trabajamos con productores locales de lino, alpaca y algodón orgánico. Nuestras tinturas son 100% vegetales: cúrcuma, añil, madreselva y cochinilla.</EditableZone></p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:32 }}>
            {([["aboutStat1","aboutStatLabel1","2019","Año de fundación"],["aboutStat2","aboutStatLabel2","100%","Fibras naturales"],["aboutStat3","aboutStatLabel3","12","Artesanas"],["aboutStat4","aboutStatLabel4","Mendoza","Origen"]] as const).map(([fv,fl,n,label])=>(
              <div key={label} style={{ borderTop:`2px solid ${A}`, paddingTop:16 }}>
                <p style={{ fontFamily:"Georgia, serif", fontSize:36, fontStyle:"italic", color:A, margin:"0 0 6px" }}><EditableZone field={fv} label={`Stat: ${n}`}>{n}</EditableZone></p>
                <p style={{ fontSize:12, color:MID, margin:0, letterSpacing:1, textTransform:"uppercase" }}><EditableZone field={fl} label={`Etiqueta stat: ${label}`}>{label}</EditableZone></p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </SectionBlock>

      <SectionBlock id="bt-contacto" label="Contacto" isPreview={isPreview} defaultOrder={BT_SECTION_IDS}>
      {/* ── CONTACTO — imagen de fondo + form superpuesto */}
      <section id="contacto" data-reveal style={{ position:"relative", overflow:"hidden" }}>
        <FadeImage src={contactBgOv?.url ?? "https://picsum.photos/seed/terra-contact/1920/700"} alt="" fill sizes="100vw" style={{ objectFit:"cover", objectPosition:`${contactBgOv?.posX ?? 50}% ${contactBgOv?.posY ?? 60}%` }}/>
        <BgDragHandle imgKey="contactBackground" />
        <EditableImageButton field="contactBackground" label="Imagen fondo contacto" />
        <div style={{ position:"absolute", inset:0, background: contactBgOv?.overlayType === "none" ? "transparent" : contactBgOv?.overlayType === "dark" ? `rgba(0,0,0,${contactBgOv?.overlayOpacity ?? 0.88})` : `rgba(250,247,242,${contactBgOv?.overlayOpacity ?? 0.88})` }}/>
        {/* La tinta la manda la CAPA, no el color de la sección. Antes este bloque
            se pintaba con el marrón de siempre pase lo que pase: al bajar la capa
            oscura al 10% sobre una foto, el título quedaba marrón sobre marrón y
            se perdía. Con la capa en "ninguna" no hay ninguna señal, así que se
            queda con los colores del template — adivinar sería peor. */}
        {(() => {
          const tinta = tintaSobreFoto(contactBgOv, !!(contactBgOv?.url ?? true));
          const cT   = tinta === "clara" ? "#faf7f2" : tinta === "oscura" ? T : T;
          const cMID = tinta === "clara" ? "rgba(250,247,242,0.75)" : MID;
          const cA   = tinta === "clara" ? "#f0c9a8" : A;
          const linea = tinta === "clara" ? "rgba(250,247,242,0.22)" : "rgba(44,34,24,0.08)";
          // El halo es lo que salva la capa floja: con la foto a la vista, ningún
          // color solo alcanza contra un farol encendido al lado de una sombra.
          const sombra = tinta ? sombraSobreFoto(tinta) : undefined;
          return (
        <div style={{ position:"relative", maxWidth:1280, margin:"0 auto", padding: isMobile ? "48px 20px" : "80px 40px", display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 0 : 80, alignItems:"center", minHeight: isMobile ? "auto" : 500 }}>
          {/* izq — texto e info */}
          <div style={{ textShadow: sombra }}>
            <p style={{ fontSize:10, letterSpacing:5, color:cA, textTransform:"uppercase", marginBottom:20 }}><EditableZone field="contactKicker" label="Etiqueta contacto">Escribinos</EditableZone></p>
            <h2 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(30px,4vw,56px)", fontStyle:"italic", fontWeight:400, margin:"0 0 28px", color:cT, lineHeight:1.1 }}><EditableZone field="contactHeading" label="Título contacto" block>Estamos para ayudarte.</EditableZone></h2>
            <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
              {[
                { label:"Email",     val:"hola@terra.com.ar",       field:"contactEmail" },
                { label:"Ubicación", val:"Belgrano 456, Mendoza",   field:"contactUbicacion" },
                { label:"Instagram", val:"@terra.indumentaria",     field:"contactInstagram" },
                { label:"Horario",   val:"Lun–Vie 9 a 18 hs",      field:"contactHorario" },
              ].map(item=>(
                <div key={item.label} style={{ display:"flex", gap:20, alignItems:"baseline", borderBottom:`1px solid ${linea}`, paddingBottom:14 }}>
                  <span style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:cA, minWidth:80 }}>{item.label}</span>
                  <span style={{ fontSize:14, color:cMID }}><EditableZone field={item.field} label={item.label}>{item.val}</EditableZone></span>
                </div>
              ))}
            </div>
          </div>
          {/* der — formulario */}
          <div style={{ background:"#fff", padding: isMobile ? "32px 20px" : "40px 36px" }}>
            <ContactForm
              storeId={storeConfig?.storeId} isPreview={isPreview} prefillMessage={inquiryMessage}
              accent={A} textColor={T} mutedColor="#d5c9be"
              radius={0} buttonRadius={0}
              theme={{
                twoColTop: false,
                inputBg: "#faf7f2",
                inputBorderColor: "#d5c9be",
                focusBorderColor: A,
                inputPadding: "11px 14px",
                fontSize: 13,
                gap: 12,
                intro: <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:18, color:T, margin:"0 0 12px" }}><EditableZone field="contactFormHeading" label="Subtítulo formulario">Mandanos un mensaje</EditableZone></p>,
                placeholders: { nombre: "Tu nombre", email: "tu@email.com", mensaje: "Tu mensaje" },
                buttonLabel: "Enviar Mensaje",
                // El botón que manda el mensaje iba con el acento crudo y la tinta
                // clavada en blanco: con un acento claro, blanco sobre blanco.
                buttonStyle: { width:"100%", background:AMarcaBlanco, color:AMarcaTexto, padding:"14px", fontSize:11, letterSpacing:4, textTransform:"uppercase" },
              }}
              renderSent={reset => (
                <div style={{ textAlign:"center", padding:"40px 0" }}>
                  <div style={{ width:56, height:56, borderRadius:"50%", border:`1.5px solid ${A}`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={A} strokeWidth={2} strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:20, color:T, marginBottom:8 }}>¡Mensaje enviado!</p>
                  <p style={{ fontSize:13, color:MID, marginBottom:20 }}>Te respondemos a la brevedad.</p>
                  <button onClick={reset} style={{ background:"transparent", color:A, border:`1px solid ${A}`, padding:"9px 24px", fontSize:11, letterSpacing:2, cursor:"pointer", textTransform:"uppercase" }}>Enviar otro</button>
                </div>
              )}
            />
          </div>
        </div>
          );
        })()}
      </section>
      </SectionBlock>
      </div>

      </>)}

      {/* ── FOOTER — franja mínima con newsletter prominente */}
      <footer style={{ background:footerBg, borderTop:`1px solid rgba(44,34,24,0.1)` }}>
        {/* newsletter strip */}
        <div style={{ position:"relative", ...(newsletterBgImg?.url ? { backgroundImage:`url(${newsletterBgImg.url})`, backgroundSize:"cover", backgroundPosition:`${newsletterBgImg.posX ?? 50}% ${newsletterBgImg.posY ?? 50}%` } : { background:newsletterBg }) }}>
          <BgDragHandle imgKey="sectionbg_bgNewsletter" />
          <EditableSectionBg field="bgNewsletter" label="Fondo newsletter" nombreBloque="Suscripción" />
          {newsletterBgImg?.url && newsletterBgImg.overlayType !== "none" && (
            <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none", background: newsletterBgImg.overlayType === "light" ? `rgba(255,255,255,${newsletterBgImg.overlayOpacity ?? 0.5})` : `rgba(0,0,0,${newsletterBgImg.overlayOpacity ?? 0.45})` }} />
          )}
          <div style={{ position:"relative", zIndex:1, padding:"36px 40px" }}>
          <div style={{ maxWidth:1280, margin:"0 auto", display:"flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent:"space-between", gap:32, flexWrap:"wrap" }}>
            <div>
              <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:20, color:newsletterText, margin:"0 0 4px" }}><EditableZone field="newsletterText" label="Título newsletter">Suscribite al newsletter</EditableZone></p>
              <p style={{ fontSize:12, color:newsletterMid, margin:0, letterSpacing:1 }}><EditableZone field="newsletterSubtext" label="Subtítulo newsletter">Novedades, lanzamientos y descuentos exclusivos</EditableZone></p>
            </div>
            <div style={{ flexShrink:0, width: isMobile ? "100%" : "auto" }}>
              <NewsletterForm
                slug={storeConfig?.slug} isPreview={isPreview}
                theme={{
                  // Apilados en celular: pegados, "SUSCRIBIRSE" con espaciado se
                  // lleva la mitad del ancho y al input le quedan ~160px.
                  form:  { display:"flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 10 : 0 },
                  // Los cuatro lados sueltos y ninguno con el atajo `border`:
                  // mezclarlos hace que React tenga que sacar `borderRight` al
                  // cambiar de ancho, y avisa por consola que eso da bugs de
                  // estilo. Es el mismo choque que ya apareció en el modal.
                  input: { width: isMobile ? "100%" : 260, minWidth:0, background:newsletterInputBg, borderTop:`1px solid ${newsletterInputBorder}`, borderBottom:`1px solid ${newsletterInputBorder}`, borderLeft:`1px solid ${newsletterInputBorder}`, borderRight: isMobile ? `1px solid ${newsletterInputBorder}` : "none", color:newsletterText, padding:"12px 16px", fontSize:13, outline:"none" },
                  boton: { flexShrink:0, width: isMobile ? "100%" : undefined, background:T, color:BG, border:"none", padding:"12px 24px", fontSize:11, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", fontWeight:600 },
                  colorMensaje: newsletterText,
                  // El rojo de fábrica puede desaparecer sobre un fondo de
                  // acento oscuro. Se usa la tinta ya calculada para esta franja.
                  colorError: newsletterText,
                }}
              />
            </div>
          </div>
          </div>
        </div>
        {/* links + copyright — este div es el fondo del footer propiamente dicho */}
        <div style={{ position:"relative" }}>
        <EditableSectionBg field="bgFooter" label="Fondo footer" nombreBloque="Pie de la tienda" />
        <div style={{ maxWidth:1280, margin:"0 auto", padding: isMobile ? "20px 16px" : "28px 40px", display:"flex", alignItems:"center", justifyContent: isMobile ? "center" : "space-between", flexWrap:"wrap", gap:20 }}>
          <span style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:20, color:footerText, letterSpacing:2 }}><EditableZone field="footerBrandName" label="Nombre en footer">Terra</EditableZone></span>
          {/* Envuelve en celular: los cinco enlaces no entran en una línea de
              360px y el último quedaba cortado contra el borde. */}
          <div style={{ display:"flex", flexWrap:"wrap", justifyContent: isMobile ? "center" : undefined, gap: isMobile ? "10px 18px" : 24 }}>
            {[["Colección","coleccion"],["Nosotros","nosotros"],["Contacto","contacto"],["Envíos","contacto"],["Devoluciones","contacto"]].map(([l,t])=>(
              <button key={l} onClick={()=>scrollTo(t)} style={{ background:"none", border:"none", color:footerMid, fontSize:12, cursor:"pointer", transition:"color 0.2s" }}
                onMouseEnter={e=>(e.currentTarget.style.color=footerText)}
                onMouseLeave={e=>(e.currentTarget.style.color=footerMid)}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {([["IG","instagram"],["FB","facebook"],["PT","pinterest"]] as const).map(([label, key]) => {
              const url = storeConfig?.socialLinks?.[key];
              if (!isPreview && !url) return null;
              return (
                <button key={label}
                  onClick={() => url && window.open(url, "_blank")}
                  style={{ background:"none", border:`1px solid ${footerMid}33`, color:footerMid, width:32, height:32, fontSize:9, fontWeight:700, cursor: url ? "pointer" : "default", letterSpacing:1, transition:"all 0.2s", opacity: url ? 1 : 0.35 }}
                  onMouseEnter={e=>{ if(url){ e.currentTarget.style.borderColor=A; e.currentTarget.style.color=A; }}}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=`${footerMid}33`; e.currentTarget.style.color=footerMid; }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        {/* En escritorio los botones flotantes se esquivan por el costado, que ahí
            sobra ancho. En celular no: 90px de cada lado dejaban 188px útiles a
            360px de pantalla y cada política caía en su propio renglón. Como los
            botones flotan sobre el BORDE INFERIOR de la pantalla, alcanza con
            despejarlos por altura —van a 24px del piso y miden 52/56— y así la
            barra recupera el ancho completo. */}
        <div style={{ borderTop:`1px solid rgba(44,34,24,0.07)`, paddingTop: 16, paddingBottom: isMobile ? 92 : 16, paddingLeft: isMobile ? 16 : (hasWA ? 110 : 40), paddingRight: isMobile ? 16 : 110, maxWidth:1280, margin:"0 auto", display:"flex", alignItems:"center", justifyContent: isMobile ? "center" : "space-between", flexWrap:"wrap", gap:"8px 24px", textAlign: isMobile ? "center" : undefined }}>
          <div style={{ display:"flex", flexWrap:"wrap", justifyContent: isMobile ? "center" : undefined, gap:"4px 16px" }}>
            {linksLegales(storeConfig?.slug, storeConfig?.legales, { enEditor: editMode }).map(({ clave: tipo, label }) => (
              editMode ? (
                <button key={tipo} type="button" onClick={() => window.open("/dashboard/pagos", "_blank")}
                  title="Editar en Dashboard → Pagos"
                  style={{ fontSize:11, color:footerMid, opacity:0.55, background:"none", border:"none", cursor:"pointer", padding:0, display:"inline-flex", alignItems:"center", gap:4 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.55"; }}>
                  {label}
                  <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              ) : (
                <a key={tipo} href={`/tienda/${storeConfig?.slug ?? ""}/politicas?tipo=${tipo}`}
                  style={{ fontSize:11, color:footerMid, opacity:0.55, textDecoration:"none" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.55"; }}>
                  {label}
                </a>
              )
            ))}
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", justifyContent: isMobile ? "center" : undefined, gap:"8px 16px", alignItems:"center" }}>
            <p style={{ fontSize:11, color:footerMid, margin:0, opacity:0.6 }}>
              <EditableZone field="footerCopyright" label="Copyright">© 2025 Terra · Moda consciente · Mendoza, Argentina</EditableZone>
            </p>
            {!editMode && (
              <button onClick={() => setShowReport(true)}
                style={{ fontSize:11, color:footerMid, opacity:0.5, background:"none", border:"none", cursor:"pointer", padding:0 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.5"; }}>
                Reportar tienda
              </button>
            )}
          </div>

        </div>
        </div>
      </footer>

      {showReport && (
        <ReportStoreModal slug={storeConfig?.slug ?? ""} onClose={() => setShowReport(false)} />
      )}

      {/* ── MODAL PRODUCTO */}
      {modalProduct && (
        <div style={{ position:"fixed", inset:0, zIndex: isPreview ? 20000 : 600, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>{ setModalProduct(null); setLightboxSrc(null); }}>
          <div style={{ position:"absolute", inset:0, background:"rgba(44,34,24,0.65)", backdropFilter:"blur(8px)" }}/>
          <div style={{ position:"relative", background:"#fff", maxWidth:920, width:"calc(100% - 32px)", maxHeight: isPreview ? "100%" : "92vh", overflow:"hidden", display:"flex", flexDirection:"column" }} onClick={e=>e.stopPropagation()}>
            <button onClick={()=>{ setModalProduct(null); setLightboxSrc(null); }} aria-label="Cerrar" style={{ position:"absolute", top:8, right:8, zIndex:10, background:"rgba(44,34,24,0.65)", border:"none", color:"#fff", width:36, height:36, cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
            {/* El ref es el que `openModal` manda arriba al abrir otra ficha: los
                "productos similares" están al final, así que el que toca uno está
                siempre abajo de todo. */}
            <div ref={modalScrollRef} style={{ overflow:"auto", flex:1, minHeight:0, display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
            {/* El aire de la columna de la foto lo pone la COLUMNA, no cada bloque:
                así la foto, las miniaturas y los videos arrancan todos en la misma
                vertical. Antes la foto iba pegada al borde del modal y la tira de
                miniaturas se dibujaba sobre una banda arena a todo lo ancho — el
                modal del catálogo la tiene metida 28px y sin banda, y era de las
                diferencias que más se notaban al poner las dos fichas al lado. */}
            <div ref={colFotoRef} style={{ alignSelf:"start", boxSizing:"border-box", padding: isMobile ? 0 : "28px 0 28px 28px" }}>
              <div style={{ position:"relative", width:"100%", aspectRatio:"3/4" }} {...imgSwipe}>
                {modalProduct.images[modalImg] && (
                  <FadeImage src={modalProduct.images[modalImg]} alt="" fill sizes="(max-width: 768px) 100vw, 460px" style={{ objectFit:"cover", cursor:"zoom-in" }}
                    onClick={() => setLightboxSrc(modalProduct.images[modalImg])} />
                )}
                {(() => {
                  if (modalPromo?.primaryPromo) return <PromoTag tipo={modalPromo.primaryPromo.type} label={describePromo(modalPromo.primaryPromo).headline} paleta={PALETA_PROMO_TIERRA} />;
                  const hasOffer = !variantPrice && !!modalProduct.comparePrice && modalProduct.comparePrice > modalProduct.price;
                  if (!hasOffer) return null;
                  return <OfferBadge badge={modalProduct.offerBadge} pct={discountPercent(modalProduct.price, modalProduct.comparePrice)} size="md" />;
                })()}
                {modalProduct.images.length > 1 && (<>
                  <button onClick={() => setModalImg(i => (i - 1 + modalProduct.images.length) % modalProduct.images.length)}
                    aria-label="Imagen anterior"
                    style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.85)", border:"none", width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>‹</button>
                  <button onClick={() => setModalImg(i => (i + 1) % modalProduct.images.length)}
                    aria-label="Imagen siguiente"
                    style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.85)", border:"none", width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>›</button>
                </>)}
              </div>
              <div style={{ display:"flex", gap:8, padding: isMobile ? "10px 14px 0" : "10px 0 0", overflowX:"auto" }}>
                {modalProduct.images.map((img,i)=>(
                  /* Contra blanco y no contra la banda arena, que ya no está. */
                  <button key={i} onClick={()=>setModalImg(i)} style={{ position:"relative", width:52, height:52, flexShrink:0, padding:2, border:i===modalImg?`2px solid ${AMarcaBlanco}`:"2px solid transparent", background:"none", cursor:"pointer" }}>
                    <FadeImage src={img} alt="" fill sizes="52px" style={{ objectFit:"cover" }}/>
                  </button>
                ))}
              </div>
              {modalProduct.reelUrls.length > 0 && (
                <div style={{ padding: isMobile ? "18px 16px 0" : "22px 0 0" }}>
                  <p style={tituloModal}>Videos del producto</p>
                  {/* `ancho` no se pasaba, así que caía en los 104px de fábrica —
                      justo el caso que el propio componente documenta como "queda
                      de estampilla al lado de una foto de 470". El modal del
                      catálogo ya pasaba 160/120; van los mismos números. */}
                  <StoreProductReels
                    reelUrls={modalProduct.reelUrls}
                    ancho={isMobile ? 120 : 160}
                    theme={{ accent: A, text: T, border: "rgba(44,34,24,0.14)", radius: 8 }}
                  />
                </div>
              )}
            </div>
            {/* `minWidth:0` no estaba: una columna de grid mide por su contenido,
                así que un nombre largo sin espacios o una tabla de atributos ancha
                empujaban esta columna y le robaban ancho a la foto en vez de
                partirse. El modal del catálogo ya lo tenía. */}
            <div style={{ position:"relative", display:"flex", minWidth:0 }}>
            {/* Degradados: reponen la señal que se perdió al esconder la barra.
                Aparecen sólo si de verdad queda contenido de ese lado. */}
            {sombraArriba && (
              <div style={{ position:"absolute", left:0, right:0, top:0, height:28, zIndex:2, pointerEvents:"none",
                            background:"linear-gradient(to top, transparent, #ffffff)" }} />
            )}
            {sombraAbajo && (
              <div style={{ position:"absolute", left:0, right:0, bottom:0, height:44, zIndex:2, pointerEvents:"none",
                            background:"linear-gradient(to bottom, transparent, #ffffff)" }} />
            )}
            <div ref={panelRef} className="bt-sin-barra" style={{ flex:1, padding: isMobile ? "20px 20px" : "40px 36px", display:"flex", flexDirection:"column", gap:18, minHeight:0, minWidth:0, boxSizing:"border-box",
                          ...(altoPanel ? { maxHeight: altoPanel, overflowY:"auto" as const } : {}) }}>
              <div>
                <p style={{ fontSize:10, letterSpacing:4, color:ATextoBlanco, textTransform:"uppercase", marginBottom:6 }}>{modalProduct.category}</p>
                <h2 style={{ fontFamily:"Georgia, serif", fontSize:24, fontStyle:"italic", margin:0, lineHeight:1.2, color:T }}>{modalProduct.name}</h2>
              </div>
              <div style={{ display:"flex", gap:12, alignItems:"baseline", flexWrap:"wrap" }}>
                {ocultarPrecios ? (
                  <span style={{ fontSize:22, fontWeight:700, color:ATextoBlanco }}>Consultá precio</span>
                ) : modalPromo?.hasPriceDrop ? (
                  <>
                    <span style={{ fontSize:22, fontWeight:700, color:"#dc2626" }}>{fmt(modalPromo.effectivePrice)}</span>
                    <span style={{ fontSize:14, color:MID, textDecoration:"line-through" }}>{fmt(modalPromo.originalPrice)}</span>
                    {modalPromo.pctOff != null && <span style={{ fontSize:12, fontWeight:800, color:"#16a34a", background:"#dcfce7", padding:"2px 8px", borderRadius:4 }}>{modalPromo.pctOff}% OFF</span>}
                  </>
                ) : (
                  <>
                    <span style={{ fontSize:22, fontWeight:700, color:ATextoBlanco }}>{fmt(displayPrice)}</span>
                    {!variantPrice && modalProduct.comparePrice && <span style={{ fontSize:14, color:MID, textDecoration:"line-through" }}>{fmt(modalProduct.comparePrice)}</span>}
                  </>
                )}
              </div>
              {modalPromo?.primaryPromo && <PromoBlock promo={modalPromo.primaryPromo} freeShippingExtra={modalPromo.freeShipping} paleta={PALETA_PROMO_TIERRA} />}
              {!ocultarPrecios && modalProduct.offerNote && (
                <div style={{ fontSize:12, color:"#059669", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:4, padding:"5px 10px", display:"flex", alignItems:"center", gap:6 }}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>{modalProduct.offerNote}</span>
                </div>
              )}
              {/* Talle primero y color después, el mismo orden que el modal del
                  catálogo. Estaban al revés y era la diferencia más visible entre
                  las dos fichas del mismo producto.
                  Los títulos van a secas: repetir el valor elegido ("TALLE: 32")
                  es decir dos veces lo mismo, y el chip marcado ya lo dice.
                  El `length > 0` no estaba: sin talles cargados, el panel dibujaba
                  el rótulo "TALLE" con la fila de chips vacía debajo. */}
              {/* Un bloque por opción, con el nombre que le puso quien cargó el
                  producto: un collar dice "Largo" y no "Talle". Antes eran dos
                  bloques fijos con las dos palabras escritas a mano. */}
              {opcionesVisibles(modalProduct.opciones).map(op => {
                // Un solo valor que informa algo ("45cm") va como texto: no hay
                // nada que elegir y un chip que no cambia nada confunde.
                if (op.tipo === "dato") return (
                  <div key={op.nombre}>
                    <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", marginBottom:8, color:MID }}>{op.nombre}</p>
                    <p style={{ margin:0, fontSize:13, color:T }}>{op.valor}</p>
                  </div>
                );
                const conMuestra = esOpcionDeColor(op.nombre);
                return (
                  <div key={op.nombre}>
                    <p style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", marginBottom:8, color:MID }}>{op.nombre}</p>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {op.valores.map(valor => {
                        const elegido = seleccion[op.nombre] === valor;
                        const agotado = sinStock(op.nombre, valor);
                        const swatch = conMuestra ? colorToSwatch(valor) : null;
                        return (
                          <button key={valor} onClick={()=>setOpcion(op.nombre, valor)}
                            style={{ fontSize: conMuestra ? 11 : 12, border: elegido ? `1.5px solid ${AMarcaBlanco}` : "1px solid rgba(44,34,24,0.18)", background: elegido ? `${AMarcaBlanco}14` : "transparent", color:T, cursor:"pointer",
                              opacity: agotado ? 0.35 : 1, textDecoration: agotado ? "line-through" : "none",
                              // El cuadrado es para los valores que se leen de un
                              // vistazo; los que llevan muestra de color al lado
                              // necesitan la pastilla para que entre el puntito.
                              ...(conMuestra
                                ? { display:"flex", alignItems:"center", gap:7, padding:"6px 14px" }
                                : { width:46, height:46 }) }}>
                            {swatch && <span style={{ width:14, height:14, borderRadius:"50%", background:swatch, border:"1px solid rgba(44,34,24,0.2)", flexShrink:0 }} />}
                            {valor}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <span style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:MID }}>Cantidad</span>
                <div style={{ display:"flex", alignItems:"center", border:`1px solid rgba(44,34,24,0.18)` }}>
                  <button onClick={()=>setQty(q=>Math.max(isWholesale && modalProduct.cantMinMayorista ? modalProduct.cantMinMayorista : 1,q-1))} style={{ width:36, height:36, background:"none", border:"none", color:T, fontSize:18, cursor:"pointer" }}>−</button>
                  <span style={{ width:36, textAlign:"center", fontSize:14 }}>{qty}</span>
                  <button onClick={()=>setQty(q=>selectedVariantStock !== null ? Math.min(selectedVariantStock, q+1) : q+1)} style={{ width:36, height:36, background:"none", border:"none", color:T, fontSize:18, cursor:"pointer" }}>+</button>
                </div>
              </div>
              {/* 3×2 en vivo: progreso del beneficio N×M según la cantidad. */}
              {modalPromo?.nxm && nxmPaid != null && (() => {
                const { n, m } = modalPromo.nxm;
                const free = qty - nxmPaid;
                const toNext = (n - (qty % n)) % n;
                return (
                  <div style={{ fontSize:12.5, fontWeight:700, padding:"9px 12px", borderRadius:6, background: free > 0 ? "rgba(22,163,74,0.10)" : "#fff7ed", border:`1px solid ${free > 0 ? "rgba(22,163,74,0.28)" : "#fed7aa"}`, color: free > 0 ? "#16a34a" : "#c2410c" }}>
                    {free > 0
                      ? `🎉 Llevás ${qty}, pagás ${nxmPaid} · ${free} gratis${toNext > 0 ? ` — sumá ${toNext} y llevás otra gratis` : ""}`
                      : `Promo ${n}×${m} · sumá ${toNext} más y una te sale gratis`}
                  </div>
                );
              })()}
              {/* Stock por variante */}
              {selectedVariantStock !== null && selectedVariantStock === 0 && (
                <p style={{ fontSize:12, color:"#888", fontWeight:500, margin:0 }}>Sin stock en esta combinación</p>
              )}
              {selectedVariantStock !== null && selectedVariantStock > 0 && selectedVariantStock <= 5 && (
                <p style={{ fontSize:12, color:"#ef4444", fontWeight:600, margin:0 }}>¡Últimas {selectedVariantStock} unidades!</p>
              )}
              {!isMobile && (
                <div style={{ borderTop:`1px solid rgba(44,34,24,0.1)`, marginTop:4, paddingTop:16 }}>
                  {isInquiryMode ? (
                <button onClick={() => openInquiry(modalProduct)} style={{ background:AMarcaBlanco, color:AMarcaTexto, border:"none", padding:"15px", fontSize:11, letterSpacing:4, textTransform:"uppercase", cursor:"pointer", width:"100%" }}>
                  Consultar disponibilidad
                </button>
              ) : (
                <button onClick={addToCart} disabled={selectedVariantStock === 0}
                  style={{ background: selectedVariantStock === 0 ? `${AMarcaBlanco}4d` : AMarcaBlanco, color:AMarcaTexto, border:"none", padding:"15px", fontSize:11, letterSpacing:4, textTransform:"uppercase", cursor: selectedVariantStock === 0 ? "not-allowed" : "pointer", width:"100%" }}>
                  {selectedVariantStock === 0 ? "Sin stock" : `Agregar al Carrito · ${fmt(nxmPaid != null ? nxmPaid*displayPrice : (modalPromo?.hasPriceDrop ? modalPromo.effectivePrice : displayPrice)*qty)}`}
                </button>
              )}</div>)}

              {/* ── Lo que se LEE: la ficha de la pieza y después la descripción ──
                  Van juntas y debajo del botón, no arriba. Son dos criterios que
                  parecen pelearse y no se pelean:

                  · Comprar va PRIMERO. Talle, color, cantidad y el botón, todo
                    junto y arriba de lo que se lee. Antes había que pasar la
                    descripción entera para llegar a elegir el talle.
                  · La ficha va antes que la DESCRIPCIÓN. En los tres templates de
                    ropa los atributos se tratan como "datos técnicos" que se miran
                    al final. Acá no: una tienda que vende fibras naturales y
                    tinturas vegetales tiene el material, el origen y el taller como
                    ARGUMENTO DE VENTA, que es la razón por la que alguien paga más
                    que en fast fashion.

                  Este es además el orden del modal del catálogo (`fichaPrimero` en
                  su tabla de vestidos). Que las dos fichas del mismo producto se
                  lean igual es el punto de todo esto.

                  Los datos son los que la dueña ya carga en la ficha del producto
                  —no hay campo nuevo— y si no cargó ninguno el bloque no se dibuja.
                  El dibujo también es propio: Chic Paris y Fashion Noir usan la
                  tabla rayada; acá van filas al aire con el valor en la serif
                  itálica del template, que es como está escrito el resto. */}
              {(() => {
                const attrs = modalProduct.attributes ?? [];
                const condicionAttr = attrs.find(a => a.key === "Condición");
                const serviciosAttr = attrs.find(a => a.key === "Servicios");
                const otherAttrs = attrs.filter(a => a.key !== "Condición" && a.key !== "Servicios");
                let servicios: string[] = [];
                if (serviciosAttr) { try { servicios = Object.entries(JSON.parse(serviciosAttr.value)).filter(([, v]) => v).map(([k]) => k); } catch {} }
                if (!condicionAttr && otherAttrs.length === 0 && servicios.length === 0) return null;
                return (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {condicionAttr && (
                      <span style={{ alignSelf:"flex-start", fontSize:10, letterSpacing:2, textTransform:"uppercase", fontWeight:600, color:ATextoBlanco, border:`1px solid ${ATextoBlanco}`, padding:"4px 10px", fontFamily:"Georgia, serif", fontStyle:"italic" }}>{condicionAttr.value}</span>
                    )}
                    {otherAttrs.length > 0 && (
                      <div>
                        <p style={tituloModal}>La pieza</p>
                        {otherAttrs.map(a => (
                          <div key={a.key} style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:16, padding:"9px 0", borderBottom:`1px solid rgba(44,34,24,0.07)` }}>
                            <span style={{ fontSize:10, fontWeight:600, color:MID, textTransform:"uppercase", letterSpacing:1.5, flexShrink:0 }}>{a.key}</span>
                            <span style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:14, color:T, textAlign:"right", minWidth:0, overflowWrap:"anywhere" }}>{a.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {servicios.length > 0 && (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                        {servicios.map(k => (
                          <span key={k} style={{ fontSize:10, letterSpacing:1, padding:"4px 10px", border:`1px solid rgba(44,34,24,0.18)`, color:MID }}>✓ {k}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
              <div style={{ borderTop:`1px solid rgba(44,34,24,0.07)`, paddingTop:14 }}>
                <p style={tituloModal}>Descripción</p>
                <DescripcionPlegable
                  html={modalProduct.description || ""}
                  style={{ fontSize:13, color:MID, lineHeight:1.8 }}
                  plegar={isMobile}
                  fundido="#fff"
                  boton={{ border:`1px solid ${ATextoBlanco}`, color:ATextoBlanco, padding:"8px 18px", fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", fontFamily:"Georgia, serif", fontStyle:"italic" }}
                />
              </div>
              {/* ── Compartir ─────────────────────────────────────────────────
                  Estaba ARRIBA, entre el nombre y el precio, empujando el precio
                  fuera de la parte del panel que mas se mira. Compartir es lo que
                  se hace DESPUES de decidir, no antes de saber cuanto cuesta: va
                  al final, debajo del boton de comprar. Mismo criterio y mismo
                  motivo que en el modal de Urban Pulse. */}
              <div style={{ display:"flex", gap:6, marginTop:8 }}>
                <button onClick={() => shareProduct(modalProduct)}
                  style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:`1px solid rgba(44,34,24,0.15)`, color:"rgba(44,34,24,0.4)", padding:"5px 12px", fontSize:10, letterSpacing:1, cursor:"pointer", transition:"color 0.2s" }}
                  onMouseEnter={e=>(e.currentTarget.style.color=T)} onMouseLeave={e=>(e.currentTarget.style.color="rgba(44,34,24,0.4)")}>
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  Copiar link
                </button>
                {hasWA && (
                <button onClick={() => whatsappShare(modalProduct)}
                  style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"1px solid rgba(37,211,102,0.3)", color:"rgba(37,211,102,0.7)", padding:"5px 12px", fontSize:10, letterSpacing:1, cursor:"pointer", transition:"color 0.2s" }}
                  onMouseEnter={e=>(e.currentTarget.style.color="#25D366")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(37,211,102,0.7)")}>
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M11.897 0C5.395 0 .13 5.266.13 11.767c0 2.078.545 4.03 1.495 5.727L.057 24l6.7-1.757A11.71 11.71 0 0 0 11.897 23.534c6.503 0 11.768-5.265 11.768-11.767C23.67 5.266 18.4 0 11.897 0zm0 21.536h-.004a9.726 9.726 0 0 1-4.96-1.358l-.356-.211-3.678.965.982-3.581-.232-.368A9.73 9.73 0 0 1 2.158 11.767C2.158 6.355 6.551 2 11.897 2c2.581 0 5.007 1.007 6.831 2.831a9.604 9.604 0 0 1 2.828 6.83c0 5.347-4.393 9.875-9.659 9.875z"/></svg>
                  WhatsApp
                </button>
                )}
              </div>

            </div>
            </div>

            {/* ── Reseñas — a lo ANCHO, no adentro del panel ──────────────────
                Vivían dentro de la columna de compra, que en escritorio es la
                mitad del modal: eran lo más largo del panel, lo estiraban muy por
                debajo de la foto y encima se leían en media pantalla. Acá abajo
                entran a lo ancho, igual que en el modal del catálogo. */}
            <div style={{ gridColumn: isMobile ? undefined : "1 / -1", paddingTop:24, paddingLeft: isMobile ? 20 : 36, paddingRight: isMobile ? 20 : 36, paddingBottom: isMobile ? 28 : 36, borderTop:`1px solid rgba(44,34,24,0.08)` }}>
                <p style={{ ...tituloModal, marginBottom:20 }}>
                  Reseñas{resenasProd.total > 0 && ` (${resenasProd.total})`}
                </p>
                {/* Sólo en el editor, y sólo si el producto no tiene ninguna real.
                    Dice que son de mentira ANTES de que la dueña las lea: sin este
                    cartel, tres reseñas con nombre y fecha en su propia tienda se
                    leen como clientas de verdad. */}
                {resenasProd.usandoEjemplos && enEditor && (
                  <div style={{ display:"flex", gap:9, margin:"0 0 16px", padding:"10px 13px", background:"#fffbeb", border:"1px solid #fde68a" }}>
                    <span style={{ flexShrink:0, fontSize:13, lineHeight:1.4 }}>⚠️</span>
                    <p style={{ margin:0, fontSize:11.5, color:"#92400e", lineHeight:1.55 }}>
                      <strong>Estas reseñas son de ejemplo.</strong> Este producto todavía no tiene ninguna:
                      están para que veas cómo queda el bloque. No se publican y desaparecen solas en cuanto
                      llegue la primera de verdad.
                    </p>
                  </div>
                )}
                {/* El botón va ACÁ, arriba de la lista, y abre el formulario en su
                    propio modal. Antes el formulario estaba escrito al final del
                    bloque: con varias reseñas cargadas había que bajarlas todas
                    para llegar a escribir la propia. Es el mismo cambio que ya
                    tenía el modal del catálogo. */}
                {!isOwner && !reviewDone && (
                  <button type="button" onClick={() => { setReviewError(null); setResenaModalOpen(true); }}
                    style={{ marginBottom:18, background:"none", border:`1px solid ${ATextoBlanco}`, color:ATextoBlanco, padding:"10px 22px", fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", cursor:"pointer" }}>
                    Escribí tu reseña
                  </button>
                )}
                {resenasProd.cargando ? (
                  <p style={{ fontSize:12, color:MID }}>Cargando...</p>
                ) : resenasProd.lista.length > 0 ? (
                  <div style={{ marginBottom:24 }}>
                    {(() => {
                      // El promedio, el total y las barras salen de la base, no de
                      // las reseñas que llegaron (ver `useResenasProducto`).
                      const avg = resenasProd.promedio;
                      const dist = [5,4,3,2,1].map(s => ({ stars:s, count: resenasProd.distribucion[s] ?? 0 }));
                      return (
                        <div style={{ display:"flex", gap:20, alignItems:"center", marginBottom:20, padding:"14px 16px", background:"rgba(44,34,24,0.04)", border:`1px solid rgba(44,34,24,0.1)`, borderRadius:4 }}>
                          <div style={{ textAlign:"center", minWidth:56 }}>
                            <p style={{ fontSize:34, fontWeight:700, color:T, margin:0, lineHeight:1, fontFamily:"Georgia, serif" }}>{avg.toFixed(1)}</p>
                            <div style={{ display:"flex", gap:2, justifyContent:"center", margin:"6px 0 4px" }}>
                              {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize:11, color: s <= Math.round(avg) ? A : "rgba(44,34,24,0.15)" }}>★</span>)}
                            </div>
                            <p style={{ fontSize:9, color:MID, margin:0, fontStyle:"italic", fontFamily:"Georgia, serif" }}>{resenasProd.total} reseña{resenasProd.total !== 1 ? "s" : ""}</p>
                          </div>
                          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}>
                            {dist.map(d => (
                              <div key={d.stars} style={{ display:"flex", alignItems:"center", gap:8 }}>
                                <span style={{ fontSize:9, color:A, minWidth:14, textAlign:"right" }}>{d.stars}★</span>
                                <div style={{ flex:1, height:4, background:"rgba(44,34,24,0.08)", borderRadius:2, overflow:"hidden" }}>
                                  <div style={{ height:"100%", width:`${resenasProd.total ? (d.count / resenasProd.total) * 100 : 0}%`, background:A, borderRadius:2 }} />
                                </div>
                                <span style={{ fontSize:9, color:MID, minWidth:12, textAlign:"right" }}>{d.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    <div style={{ display:"flex", flexDirection:"column" }}>
                      {resenasProd.lista.slice(0, resenasProd.mostradas).map((r, i) => (
                        <div key={r.id} style={{ display:"flex", gap:12, padding:"16px 0", borderBottom: i < Math.min(resenasProd.mostradas, resenasProd.lista.length) - 1 ? `1px solid rgba(44,34,24,0.07)` : "none" }}>
                          <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0, background:`${A}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:600, color:A }}>
                            {r.reviewer.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                                <span style={{ fontSize:13, fontWeight:600, color:T }}>{r.reviewer}</span>
                                {r.verified && (
                                  <span style={{ fontSize:10, fontWeight:600, color:"#16a34a", background:"#f0fdf4", border:"1px solid #bbf7d0", padding:"1px 6px", borderRadius:20 }}>✓ Verificada</span>
                                )}
                              </div>
                              <span style={{ fontSize:10, color:MID, fontStyle:"italic", fontFamily:"Georgia, serif" }}>{new Date(r.createdAt).toLocaleDateString("es-AR", { day:"numeric", month:"short", year:"numeric" })}</span>
                            </div>
                            <div style={{ display:"flex", gap:1, marginBottom: r.comment ? 8 : 0 }}>
                              {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize:12, color: s <= r.rating ? A : "rgba(44,34,24,0.15)" }}>★</span>)}
                            </div>
                            {r.comment && <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:12, color:MID, margin:0, lineHeight:1.7 }}>{r.comment}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {resenasProd.hayMas && (
                      <button onClick={resenasProd.verMas} disabled={resenasProd.cargandoMas} style={{ marginTop:14, background:"none", border:`1px solid rgba(44,34,24,0.2)`, color:A, fontSize:10, fontWeight:600, cursor: resenasProd.cargandoMas ? "default" : "pointer", padding:"8px 20px", fontFamily:"Georgia, serif", fontStyle:"italic", display:"block" }}>
                        {resenasProd.cargandoMas ? "Cargando…" : `Ver más (${resenasProd.faltan})`}
                      </button>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize:12, color:MID, marginBottom:16 }}>Sé el primero en dejar una reseña.</p>
                )}
                {isOwner && (
                  <p style={{ fontSize:11, color:MID, fontStyle:"italic" }}>El dueño no puede dejar reseñas en su propia tienda.</p>
                )}
                {reviewDone && (
                  <p style={{ fontSize:12, color:ATextoBlanco, fontWeight:600 }}>¡Gracias por tu reseña!</p>
                )}
              </div>
            {(() => {
              if (similarProducts.length === 0) return null;
              return (
                <div style={{ gridColumn: isMobile ? undefined : "1 / -1", paddingTop: 24, paddingLeft: isMobile ? 20 : 36, paddingRight: isMobile ? 20 : 36, paddingBottom: isMobile ? 28 : 36, borderTop:`1px solid rgba(44,34,24,0.08)` }}>
                  <p style={{ fontSize:10, letterSpacing:3, color:ATextoBlanco, textTransform:"uppercase", margin:"0 0 14px" }}>Productos similares</p>
                  <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap:14 }}>
                    {similarProducts.map(p => (
                      <div key={p.id} onClick={() => openModal(p)} style={{ cursor:"pointer" }}>
                        <div style={{ position:"relative", width:"100%", aspectRatio:"3/4", background:S }}>
                          {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes="(max-width: 768px) 50vw, 25vw" style={{ objectFit:"cover" }} />}
                          {/* Las tarjetas salían PELADAS: el mismo producto mostraba
                              su 3×2 en la grilla y en el catálogo, y acá no. El precio
                              de abajo ya venía descontado, así que el descuento estaba
                              aplicado pero sin decir por qué. */}
                          {(() => {
                            const pr = resolveProductPromo(p, promotions);
                            if (pr.primaryPromo) return <PromoTag tipo={pr.primaryPromo.type} label={describePromo(pr.primaryPromo).headline} size="sm" paleta={PALETA_PROMO_TIERRA} />;
                            const enOferta = !!p.comparePrice && p.comparePrice > p.price;
                            if (!enOferta && !p.offerBadge) return null;
                            return <OfferBadge badge={p.offerBadge ?? null} pct={enOferta ? discountPercent(p.price, p.comparePrice) : null} size="sm" />;
                          })()}
                        </div>
                        <p style={{ margin:"8px 0 2px", fontSize:12, color:T, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical" as const }}>{p.name}</p>
                        <PromoPrice product={p} promotions={promotions} fmt={fmt} accent={A}
                          priceSize={13} weight={700} ocultarPrecios={ocultarPrecios} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            </div>
            {isMobile && (
              <div style={{ borderTop:`1px solid rgba(44,34,24,0.12)`, padding:"12px 16px 16px", background:"#fff", flexShrink:0 }}>
                <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:10 }}>
                  {/* El total de mobile ignoraba las promos: mostraba precio × cantidad
                      mientras el botón de desktop ya descontaba. Ahora los dos usan la
                      misma cuenta (N×M primero, después baja de precio, después × qty). */}
                  <span style={{ fontSize:20, fontWeight:700, color:ATextoBlanco }}>{ocultarPrecios ? "Consultá precio" : fmt(nxmPaid != null ? nxmPaid*displayPrice : (modalPromo?.hasPriceDrop ? modalPromo.effectivePrice : displayPrice)*qty)}</span>
                  {/* `!!` y no `comparePrice &&` a secas: con `comparePrice` en 0 el
                      `&&` devuelve 0 y React dibuja un "0" suelto en la barra, al
                      lado del precio. Es el mismo UP-7 que ya pasó en Ofertas. */}
                  {!variantPrice && !ocultarPrecios && !!modalProduct.comparePrice && <span style={{ fontSize:12, color:MID, textDecoration:"line-through" }}>{fmt(modalProduct.comparePrice)}</span>}
                  {qty > 1 && <span style={{ fontSize:11, color:MID }}>× {qty}</span>}
                </div>
                {isInquiryMode ? (
                  <button onClick={() => openInquiry(modalProduct)}
                    style={{ width:"100%", background:AMarcaBlanco, color:AMarcaTexto, border:"none", padding:"15px", fontSize:11, letterSpacing:4, textTransform:"uppercase", cursor:"pointer" }}>
                    Consultar disponibilidad
                  </button>
                ) : (
                  <button onClick={addToCart} disabled={selectedVariantStock === 0}
                    style={{ width:"100%", background: selectedVariantStock === 0 ? `${AMarcaBlanco}4d` : AMarcaBlanco, color:AMarcaTexto, border:"none", padding:"15px", fontSize:11, letterSpacing:4, textTransform:"uppercase", cursor: selectedVariantStock === 0 ? "not-allowed" : "pointer" }}>
                    {selectedVariantStock === 0 ? "Sin stock" : "Agregar al Carrito"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <CartDrawer cart={cart} theme={cartTheme} isOwner={isOwner} isPreview={isPreview} whatsapp={storeConfig?.whatsapp} vocabulario={VOCABULARIO_CARRITO} />

      {/* ── FAVORITES DRAWER ───────────────────────────────── */}
      <div style={{ position:"fixed", inset:0, zIndex: isPreview ? 20000 : 155, pointerEvents: favoritesOpen ? "auto" : "none" }}>
        <div onClick={() => setFavoritesOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(44,34,24,0.4)", opacity: favoritesOpen ? 1 : 0, transition:"opacity 0.3s" }}/>
        <div style={{ position:"absolute", top:0, right:0, bottom:0, width:400, background:"#fff", transform: favoritesOpen ? "translateX(0)" : "translateX(100%)", transition:"transform 0.35s cubic-bezier(.4,0,.2,1)", display:"flex", flexDirection:"column", borderLeft:`1px solid rgba(44,34,24,0.08)` }}>
          <div style={{ padding:"20px 24px 14px", borderBottom:`1px solid rgba(44,34,24,0.06)`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:18, margin:0, color:T }}>{"Favoritos"} <span style={{ fontStyle:"normal", fontSize:13, color:MID, fontFamily:"'Helvetica Neue', sans-serif" }}>({favorites.length})</span></p>
            <button onClick={() => setFavoritesOpen(false)} style={{ background:"none", border:"none", color:T, fontSize:22, cursor:"pointer" }}>×</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"14px 24px" }}>
            {favoriteProducts.length === 0
              ? <div style={{ textAlign:"center", padding:"52px 0", color:MID }}>
                  <p style={{ fontSize:32, marginBottom:12 }}>♡</p>
                  <p style={{ fontSize:13, lineHeight:1.8 }}>No tenés favoritos aún.<br/>Explorá la colección.</p>
                </div>
              : favoriteProducts.map(product => (
                <div key={product.id} style={{ display:"flex", gap:14, padding:"14px 0", borderBottom:`1px solid rgba(44,34,24,0.05)` }}>
                  {product.images[0] ? <FadeImage src={product.images[0]} alt={product.name} width={64} height={86} style={{ objectFit:"cover", flexShrink:0 }}/> : <div style={{ width:64, height:86, flexShrink:0, background:S }}/>}
                  <div style={{ flex:1 }}>
                    <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:14, margin:"0 0 4px", color:T }}>{product.name}</p>
                    <PromoPrice product={product} promotions={promotions} fmt={fmt} accent={A}
                      priceSize={13} compareSize={11} weight={700} ocultarPrecios={ocultarPrecios}
                      gap={8} style={{ marginBottom:10 }} />
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={() => { setFavoritesOpen(false); openModal(product); }}
                        style={{ background:A, color:"#fff", border:"none", padding:"7px 14px", fontSize:10, letterSpacing:2, fontWeight:600, textTransform:"uppercase", cursor:"pointer" }}>
                        Ver producto
                      </button>
                      <button onClick={() => toggleFavorite(product.id)}
                        style={{ background:"transparent", color:MID, border:`1px solid rgba(44,34,24,0.18)`, padding:"7px 14px", fontSize:10, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", transition:"color 0.2s" }}
                        onMouseEnter={e => (e.currentTarget.style.color=T)}
                        onMouseLeave={e => (e.currentTarget.style.color=MID)}>
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

      <CheckoutModal cart={cart} theme={cartTheme} isPreview={isPreview} storeSlug={storeConfig?.slug ?? ""} />

      {/* ── MODAL: reseña de la TIENDA ──────────────────────────────────────
          Lo abre "Dejá tu opinión", en la pestaña "La tienda" de la portada. Es la
          única reseña que se puede escribir sin haber abierto un producto: habla
          de la atención, del envío y de cómo fue comprar acá.
          La lógica es la compartida (`useHomeReviews`); el dibujo es de este
          template. */}
      {resenas.modalAbierto && (
        <div onClick={resenas.cerrarModal}
          style={{ position:"fixed", inset:0, background:"rgba(44,34,24,0.6)", backdropFilter:"blur(4px)", zIndex: isPreview ? 20000 : 900, display:"flex", alignItems: isMobile ? "flex-end" : "center", justifyContent:"center", padding: isMobile ? 0 : 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:"#fff", width:"100%", maxWidth:460, maxHeight:"92vh", overflowY:"auto", position:"relative" }}>
            <button onClick={resenas.cerrarModal} aria-label="Cerrar"
              style={{ position:"absolute", top:10, right:10, zIndex:2, background:"none", border:"none", color:MID, width:32, height:32, cursor:"pointer", fontSize:22, lineHeight:1 }}>×</button>
            <div style={{ padding: isMobile ? "28px 22px 26px" : "32px 30px 28px" }}>
              {resenas.listo ? (
                /* Nace pendiente de aprobación: si dijera "¡Publicada!" y no
                   apareciera, la persona pensaría que se perdió y la escribiría
                   de nuevo. */
                <div style={{ textAlign:"center", padding:"8px 0" }}>
                  <div style={{ fontSize:34, marginBottom:10, color:ATextoBlanco }}>✓</div>
                  <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:19, color:T, margin:"0 0 8px" }}>¡Gracias por tu opinión!</p>
                  <p style={{ margin:"0 0 22px", fontSize:12.5, color:MID, lineHeight:1.6 }}>
                    La tienda la revisa antes de publicarla, así que todavía no la vas a ver acá.
                  </p>
                  <button type="button" onClick={resenas.cerrarModal}
                    style={{ background:AMarcaBlanco, color:AMarcaTexto, border:"none", padding:"12px 34px", fontSize:10, fontWeight:700, letterSpacing:3, textTransform:"uppercase", cursor:"pointer" }}>
                    Cerrar
                  </button>
                </div>
              ) : (
                <form onSubmit={resenas.enviar} style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <div>
                    <p style={{ fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:20, color:T, margin:"0 0 6px" }}>Contanos cómo te fue</p>
                    <p style={{ margin:0, fontSize:12, color:MID, lineHeight:1.5 }}>
                      Tu opinión sobre la atención, el envío y la experiencia de comprar acá.
                    </p>
                  </div>
                  {resenas.error && (
                    <p style={{ margin:0, fontSize:11.5, color:"#b91c1c", background:"#fef2f2", border:"1px solid #fecaca", padding:"9px 12px", lineHeight:1.5 }}>
                      ⚠ {resenas.error}
                    </p>
                  )}
                  {/* Trampa para bots: invisible para una persona, irresistible
                      para un robot que completa todo lo que encuentra. */}
                  <input value={resenas.honeypot} onChange={e => resenas.setHoneypot(e.target.value)}
                    tabIndex={-1} autoComplete="off" aria-hidden="true"
                    style={{ position:"absolute", left:-9999, width:1, height:1, opacity:0 }} />
                  <div style={{ display:"flex", gap:4 }}>
                    {[1,2,3,4,5].map(s => (
                      <button key={s} type="button" onClick={() => resenas.setForm(p => ({ ...p, rating: s }))}
                        aria-label={`${s} de 5 estrellas`}
                        style={{ background:"none", border:"none", fontSize:26, lineHeight:1, padding:"2px", cursor:"pointer", color: s <= resenas.form.rating ? ATextoBlanco : "rgba(44,34,24,0.2)" }}>★</button>
                    ))}
                  </div>
                  <input value={resenas.form.reviewer} maxLength={RESENADOR_MAX} required
                    onChange={e => resenas.setForm(p => ({ ...p, reviewer: e.target.value }))}
                    placeholder="Tu nombre"
                    style={{ border:`1px solid rgba(44,34,24,0.2)`, padding:"10px 12px", fontSize:13, outline:"none", background:"#faf7f2", color:T }} />
                  <div>
                    <input value={resenas.form.email} type="email" maxLength={120} autoComplete="email"
                      onChange={e => resenas.setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="Tu email (opcional — verifica tu compra)"
                      style={{ width:"100%", boxSizing:"border-box", border:`1px solid rgba(44,34,24,0.2)`, padding:"10px 12px", fontSize:13, outline:"none", background:"#faf7f2", color:T }} />
                    <p style={{ fontSize:10.5, color:MID, margin:"4px 0 0", lineHeight:1.4 }}>
                      Si compraste acá, tu reseña aparecerá con el sello &ldquo;✓ Compra verificada&rdquo;. El email no se muestra.
                    </p>
                  </div>
                  <textarea value={resenas.form.comment} rows={3} maxLength={COMENTARIO_MAX}
                    onChange={e => resenas.setForm(p => ({ ...p, comment: e.target.value }))}
                    placeholder="Comentario (opcional)"
                    style={{ border:`1px solid rgba(44,34,24,0.2)`, padding:"10px 12px", fontSize:13, resize:"none", outline:"none", background:"#faf7f2", color:T, fontFamily:"inherit" }} />
                  {resenas.form.comment.length > COMENTARIO_MAX - 80 && (
                    <p style={{ margin:"-6px 0 0", fontSize:10, color: resenas.form.comment.length >= COMENTARIO_MAX ? "#dc2626" : MID, textAlign:"right" }}>
                      {resenas.form.comment.length} / {COMENTARIO_MAX}
                    </p>
                  )}
                  {!isPreview && resenas.captcha.widget}
                  {resenas.confirmando ? (
                    <>
                      <p style={{ margin:0, fontSize:12, color:MID, lineHeight:1.6 }}>
                        Se publica con tu nombre, <strong style={{ color:T }}>{resenas.form.reviewer.trim()}</strong>, y {resenas.form.rating} de 5 estrellas. ¿La mandamos?
                      </p>
                      <div style={{ display:"flex", gap:8 }}>
                        <button type="submit" disabled={resenas.enviando || !resenas.captcha.ready}
                          style={{ flex:1, background:AMarcaBlanco, color:AMarcaTexto, border:"none", padding:"13px", fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", cursor: resenas.enviando ? "default" : "pointer", opacity: resenas.enviando ? 0.6 : 1 }}>
                          {resenas.enviando ? "Enviando..." : "Sí, enviar"}
                        </button>
                        <button type="button" onClick={() => resenas.setConfirmando(false)} disabled={resenas.enviando}
                          style={{ background:"none", border:`1px solid rgba(44,34,24,0.2)`, color:T, padding:"13px 20px", fontSize:10, letterSpacing:2, textTransform:"uppercase", cursor:"pointer" }}>
                          Volver
                        </button>
                      </div>
                    </>
                  ) : (
                    <button type="button" disabled={!resenas.puedeEnviar}
                      onClick={() => resenas.setConfirmando(true)}
                      title={resenas.bloqueo || resenas.valida ? undefined : "Escribí tu nombre y elegí cuántas estrellas"}
                      style={{ background: resenas.puedeEnviar ? AMarcaBlanco : "#ededed", color: resenas.puedeEnviar ? AMarcaTexto : "#9a9a9a", border:"none", padding:"14px", fontSize:10, fontWeight:700, letterSpacing:3, textTransform:"uppercase", cursor: resenas.puedeEnviar ? "pointer" : "default" }}>
                      Dejar mi reseña
                    </button>
                  )}
                  {/* El botón se apaga por dos motivos distintos y ninguno se adivina
                      mirándolo. Sin este aviso, el dueño escribía todo, apretaba y no
                      pasaba nada. */}
                  {resenas.bloqueo && !demoPublica && (
                    <p style={{ margin:0, fontSize:10.5, color:MID, fontStyle:"italic", textAlign:"center", lineHeight:1.5 }}>
                      {resenas.bloqueo === "preview"
                        ? "Vista previa — el formulario funciona en tu tienda publicada."
                        : "Sos el dueño de esta tienda: las reseñas las dejan tus clientes."}
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: reseña del producto ──────────────────────────────────────
          Lo abre "Escribí tu reseña", que está arriba de la lista. Antes el
          formulario era lo último de la ficha: con varias reseñas cargadas había
          que bajarlas todas para llegar a escribir la propia.
          El zIndex va entre medio a propósito: por encima de la ficha (600) y por
          debajo del lightbox (700), que es el que siempre tiene que ganar. */}
      {modalProduct && resenaModalOpen && (
        <div style={{ position:"fixed", inset:0, zIndex: isPreview ? 20000 : 650, background:"rgba(44,34,24,0.6)", backdropFilter:"blur(4px)", display:"flex", alignItems: isMobile ? "flex-end" : "center", justifyContent:"center", padding: isMobile ? 0 : 20 }}
          onClick={() => setResenaModalOpen(false)}>
          <div style={{ background:"#fff", width:"100%", maxWidth:460, maxHeight:"92vh", overflowY:"auto", position:"relative" }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setResenaModalOpen(false)} aria-label="Cerrar"
              style={{ position:"absolute", top:10, right:10, background:"none", border:"none", color:MID, width:32, height:32, cursor:"pointer", fontSize:22, lineHeight:1 }}>×</button>
            <div style={{ padding: isMobile ? "28px 22px 26px" : "30px 28px 26px" }}>
              <p style={{ ...tituloModal, marginBottom:4 }}>Tu reseña</p>
              {/* De qué producto es: este modal tapa la ficha. */}
              <p style={{ margin:"0 0 16px", fontSize:12, color:MID, lineHeight:1.5 }}>
                Sobre <strong style={{ color:T }}>{modalProduct.name}</strong>.
              </p>
              <div style={{ position:"relative" }}>
                {isPreview && <div style={{ position:"absolute", inset:0, zIndex:10, cursor:"default" }} onClick={e => e.stopPropagation()} />}
                <form onSubmit={isPreview ? e => e.preventDefault() : submitReview} style={{ display:"flex", flexDirection:"column", gap:10, opacity: isPreview ? 0.55 : 1 }}>
                  {reviewError && (
                    <p style={{ margin:0, fontSize:11.5, color:"#b91c1c", background:"#fef2f2", border:"1px solid #fecaca", padding:"9px 12px", lineHeight:1.5 }}>
                      ⚠ {reviewError}
                    </p>
                  )}
                  {/* Trampa para bots: invisible para una persona, irresistible para
                      un robot que completa todo lo que encuentra. El servidor la
                      mira y contesta un 201 falso, así el bot ni se entera. */}
                  <input value={reviewHoneypot} onChange={e => setReviewHoneypot(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ opacity:0, height:0, position:"absolute", pointerEvents:"none" }} />
                  <input value={reviewForm.reviewer} onChange={e => !isPreview && setReviewForm(p => ({ ...p, reviewer: e.target.value }))}
                    placeholder="Tu nombre" readOnly={isPreview} maxLength={RESENADOR_MAX}
                    style={{ border:`1px solid rgba(44,34,24,0.2)`, padding:"10px 12px", fontSize:13, outline:"none", background:"#faf7f2", color:T }} />
                  <div>
                    <input value={reviewForm.email} onChange={e => !isPreview && setReviewForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="Tu email (opcional — verifica tu compra)" type="email" readOnly={isPreview} autoComplete="email" maxLength={120}
                      style={{ width:"100%", boxSizing:"border-box", border:`1px solid rgba(44,34,24,0.2)`, padding:"10px 12px", fontSize:13, outline:"none", background:"#faf7f2", color:T }} />
                    <p style={{ fontSize:10.5, color:MID, margin:"4px 0 0", lineHeight:1.4 }}>
                      Si compraste acá, tu reseña aparecerá con el sello &ldquo;✓ Compra verificada&rdquo;. El email no se muestra.
                    </p>
                  </div>
                  <div style={{ display:"flex", gap:4 }}>
                    {[1,2,3,4,5].map(s => (
                      <button key={s} type="button" onClick={() => !isPreview && setReviewForm(p => ({ ...p, rating: s }))}
                        aria-label={`${s} de 5 estrellas`}
                        style={{ background:"none", border:"none", fontSize:24, lineHeight:1, cursor: isPreview ? "default" : "pointer", color: s <= reviewForm.rating ? ATextoBlanco : "rgba(44,34,24,0.2)", padding:"2px" }}>★</button>
                    ))}
                  </div>
                  {/* El tope también está en el servidor, que es el que manda: este
                      de acá sólo evita que alguien escriba de más y le recorten sin
                      avisar. */}
                  <textarea value={reviewForm.comment} onChange={e => !isPreview && setReviewForm(p => ({ ...p, comment: e.target.value }))}
                    placeholder="Comentario (opcional)" rows={3} readOnly={isPreview} maxLength={COMENTARIO_MAX}
                    style={{ border:`1px solid rgba(44,34,24,0.2)`, padding:"10px 12px", fontSize:13, resize:"none", outline:"none", background:"#faf7f2", color:T, fontFamily:"inherit" }} />
                  {!isPreview && reviewCaptcha.widget}
                  <button type="submit" disabled={isPreview || reviewSubmitting || !reviewForm.reviewer.trim() || !reviewCaptcha.ready}
                    style={{ background: isPreview || reviewSubmitting || !reviewForm.reviewer.trim() ? `${AMarcaBlanco}4d` : AMarcaBlanco, color:AMarcaTexto, border:"none", padding:"13px", fontSize:11, fontWeight:700, letterSpacing:3, textTransform:"uppercase", cursor: isPreview ? "default" : "pointer" }}>
                    {reviewSubmitting ? "Publicando..." : "Publicar reseña"}
                  </button>
                </form>
                {enEditor && (
                  <p style={{ margin:"10px 0 0", fontSize:10, color:MID, fontStyle:"italic", textAlign:"center" }}>
                    Vista previa — el formulario funciona en tu tienda publicada.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX ───────────────────────────────────────── */}
      {lightboxSrc && (
        <div style={{ position:"fixed", inset:0, zIndex: isPreview ? 20001 : 700, background:"rgba(0,0,0,0.97)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setLightboxSrc(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- el lightbox es la foto a pantalla completa con zoom de dos dedos: necesita el <img> nativo. next/image pide medidas fijas o un padre posicionado, y ninguna de las dos cosas conviven con maxWidth/maxHeight en viewport + touchAction pinch-zoom. */}
          <img src={lightboxSrc} alt="" style={{ maxWidth:"100vw", maxHeight:"100vh", objectFit:"contain", touchAction:"pinch-zoom" }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxSrc(null)} aria-label="Cerrar" style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", width:44, height:44, borderRadius:"50%", fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
      )}

      {/* ── FLOATING CART BUTTON ────────────────────────────── */}
      {/* Cuando WA está activo, el carrito se apila encima (bottom:84) para evitar posición left:24 que queda fuera del frame en preview */}
      {!cart.cartOpen && !cart.checkoutOpen && (() => {
        const cartIconIdx = (Math.abs(parseInt(textOverrides["cartIcon"]?.text ?? "0") || 0)) % CART_ICON_OPTIONS.length;
        const nextCartIconIdx = (cartIconIdx + 1) % CART_ICON_OPTIONS.length;
        return (
          <div onClick={() => { if (!editMode) { setCartOpen(true); setFavoritesOpen(false); } }}
            role="button" tabIndex={0} aria-label="Carrito"
            onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && !editMode) { e.preventDefault(); setCartOpen(true); setFavoritesOpen(false); } }}
            style={{ position:"fixed", bottom:24, ...(hasWA ? {left:24} : {right:24}), zIndex:CAPAS.panel, width:52, height:52, borderRadius:"50%", background:A, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 6px 18px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)", transition:"transform 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.transform="scale(1.1)")}
            onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}>
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={getContrastColor(A)==="light"?"#fff":"#1a0e08"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{CART_ICON_OPTIONS[cartIconIdx]}</svg>
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
          className="bt-wa-fab"
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
