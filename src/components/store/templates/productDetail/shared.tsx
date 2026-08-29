"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FadeImage } from "@/components/store/templates/shared/FadeImage";
import { CartDrawer, type CartTheme } from "@/components/store/templates/shared/CartDrawer";
import { CheckoutModal } from "@/components/store/templates/shared/CheckoutModal";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import StoreProductReels from "@/components/store/ProductReels";
import { getContrastColor, getReadableAccentText } from "@/contexts/EditContext";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import { resolveVariantPrice } from "@/lib/variantPrice";
import { buscarVariante } from "@/lib/variantMatch";
import { opcionesVisibles } from "@/lib/opciones";
import type { SeleccionOpciones } from "@/hooks/useStorefront";
import { esOpcionDeColor, valoresElegidos } from "@/lib/opciones";
import { colorToSwatch } from "@/lib/colorSwatch";
import { useTurnstile } from "@/components/Turnstile";
import { PromoTag, PromoBlock, type PaletaPromo } from "@/components/store/PromoDisplay";
import { ResenaComentario } from "@/components/store/templates/shared/ResenaComentario";
import { describePromo, type ProductPromoDisplay } from "@/lib/promoDisplay";
import type { useCartLogic } from "@/hooks/useCartLogic";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import type { ActivePromotion } from "@/lib/pricing";
import type { VerifiedInfo } from "@/components/store/VerifiedIconButton";
import { linksLegales, type ClaveLegal } from "@/lib/politicas-tienda";
import { CAPAS } from "@/lib/capas-tienda";

// `maximumFractionDigits: 0` y no el valor de fábrica, que son TRES decimales.
// Casi todo lo que llega acá ya viene entero —`pricing.ts` redondea a peso en
// `roundMoney`, y ahí está escrito el porqué: en Argentina los precios se
// muestran y se cobran en pesos enteros—, pero la cuota se calcula dividiendo
// acá nomás y ninguna división cae redonda: la ficha decía "3 cuotas sin interés
// de $ 63.333,333". El redondeo va en el formateador y no en cada cuenta para
// que el próximo número que se divida no tenga que acordarse.
export function fmtPrice(n: number, currency: string) {
  return `${currency === "ARS" ? "$" : currency} ${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
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

  /**
   * Cómo se VISTE esta ficha, además de con qué colores.
   *
   * Mismo criterio que el descriptor del modal del catálogo: cada template
   * declara sólo lo que cambia y hereda el resto. La alternativa era un
   * `if (template === "boho-terra")` repartido por las 755 líneas de este
   * archivo, y ya sabemos cómo termina eso — pasó con `esUP` en el modal, y
   * convertir treinta ternarias en condiciones de tres ramas no se puede.
   *
   * Todo opcional: sin nada, la ficha se ve exactamente como hasta ahora.
   */
  vestido?: VestidoFicha;
}

export type VestidoFicha = {
  /** Los títulos de sección: "Descripción", "Reseñas", "También te puede…". */
  tituloSeccion?: React.CSSProperties;
  /** Una rayita debajo del título, como usa Boho Terra. */
  tituloRayita?: boolean;
  /** Cómo se llama la solapa de la ficha técnica. Boho Terra le dice "La pieza". */
  rotuloDescripcion?: string;
  rotuloEspecificaciones?: string;
  /** El nombre del producto. */
  nombre?: React.CSSProperties;

  /**
   * Los colores de los carteles de promoción (el chip sobre la foto y el cuadro
   * de "¡3×2!").
   *
   * Sin esto salen con la paleta por defecto, que es violeta y azul. En una
   * tienda negra con amarillo flúor ese azul no pertenece a nada: es el único
   * color de la pantalla que no eligió nadie. Cada template pasa la misma paleta
   * que ya usa en su catálogo, así el cartel de la ficha y el de la tarjeta del
   * listado son el mismo cartel.
   */
  paletaPromo?: PaletaPromo;

  /**
   * La columna de compra como un panel aparte, en vez de apoyada sobre el mismo
   * fondo que el resto.
   *
   * Es lo que más distingue a un template de otro y lo que más se mira: Urban
   * Pulse la dibuja como una losa blanca con un filo negro grueso al costado, y
   * sin eso la ficha queda con los colores del template pero con la forma de
   * cualquier otra.
   *
   * No son `CSSProperties` sueltas porque el filo cambia de lado según el ancho:
   * al costado mientras las dos columnas están una al lado de la otra, y arriba
   * cuando se apilan —abajo de 860px— que es donde un filo a la izquierda se
   * leería como una barra decorativa colgando de la nada. Es también lo que hace
   * el modal del template en celular. Con un objeto de estilo no se puede
   * expresar eso; con estos campos, el cuerpo compartido arma las dos reglas.
   */
  panelCompra?: {
    fondo?: string;
    filo?: string;
    filoGrosor?: number;
    padding?: string;
  };

  /** Cómo se marca la miniatura que se está viendo. */
  miniaturaActiva?: { borde: string; grosor: number };

  /** El precio grande. */
  precio?: React.CSSProperties;

  /**
   * Cómo se muestra el comentario de una reseña.
   *
   * El recorte y el "Leer todo" los pone `ResenaComentario`, el mismo componente
   * que ya usan los templates en su bloque de opiniones y en su vista rápida. La
   * ficha antes imprimía el comentario entero por su cuenta: una sola reseña
   * larga estiraba la página y empujaba para abajo todo lo que venía después,
   * productos similares incluidos. En el template eso no podía pasar.
   *
   * Lo que se puede cambiar es cómo se VE, no cómo funciona: cada template
   * recorta a la altura que le queda bien y escribe el botón como habla.
   */
  resenaComentario?: {
    /** Cuántas líneas se muestran antes de recortar. */
    lineas?: number;
    /** El texto del botón que lo despliega. */
    desplegar?: string;
    /**
     * Comillas alrededor del texto. Van apagadas por defecto: los dos templates
     * que ya tienen reseñas de producto las apagan ahí y las usan sólo en los
     * testimonios de la portada, que es otra cosa —ahí la frase se muestra como
     * cita, acá es lo que alguien opinó del producto.
     */
    comillas?: boolean;
  };

  /* ── La columna de compra ────────────────────────────────────────────────
     Lo que se mira para decidir: precio, talle, color, cantidad y el botón.
     Es la parte de la ficha que más se parecía a "otra página": el modal del
     template la tiene con mayúsculas espaciadas y esquinas rectas, y acá salía
     con rótulos en negrita común y todo redondeado a 8px. */

  /**
   * La tipografía de los rótulos TALLE / COLOR / CANTIDAD.
   *
   * Los tres van juntos a propósito: son la misma clase de rótulo, y verlos con
   * tres pesos distintos es lo que hace que una columna se lea desprolija.
   */
  rotuloOpcion?: React.CSSProperties;
  /** Los chips de talle como cuadrados fijos, no como pastillas con el texto adentro. */
  chipTalleCuadrado?: boolean;
  /** El precio en el color de acento del template, no en el de texto. */
  precioAcento?: boolean;
  /**
   * El botón de comprar a todo el ancho, en mayúsculas espaciadas y con el
   * total adentro ("Agregar al carrito · $60.000").
   *
   * El precio adentro no es decoración: con cantidad 2 y una promo 3×2, el
   * número de arriba ya no es lo que se va a cobrar. El modal lo muestra ahí
   * desde siempre y la ficha no.
   */
  botonCompraDestacado?: boolean;
  /** La inicial de quien dejó una reseña, en círculo. Boho Terra no redondea nada. */
  avatarRedondo?: boolean;
  /**
   * El formulario de reseña arranca cerrado, detrás de un botón.
   *
   * Es lo que hace el modal de Boho Terra, y tiene razón: desplegado son seis
   * campos ocupando media pantalla para algo que hace una de cada cien personas
   * que miran el producto. Lo que la mayoría quiere es LEER las reseñas.
   */
  resenaFormPlegado?: boolean;
  /**
   * Y cuando se abre, lo hace en una ventana flotante encima de la ficha, no
   * desplegándose abajo.
   *
   * Es lo que hace el modal del template. La diferencia importa: desplegado, la
   * página se estira de golpe y quien venía leyendo reseñas pierde el lugar.
   */
  resenaFormModal?: boolean;
  /** El botón que abre el formulario cuando está plegado. */
  botonEscribirResena?: string;
  /**
   * Y con qué forma se dibuja ese botón.
   *
   * El de fábrica es un rectángulo con el texto en mayúsculas y muy espaciado,
   * que es como escriben los templates oscuros. En uno claro y redondeado eso se
   * lee como de otro sitio: el mismo botón, en la portada, es una cápsula con el
   * texto escrito como se habla. Se mezcla DESPUÉS del estilo base, así que
   * alcanza con declarar lo que cambia.
   */
  botonEscribirResenaEstilo?: React.CSSProperties;
  /** Cuando el producto todavía no tiene ninguna. */
  textoSinResenas?: string;
  /** Boho Terra les dice "Productos similares". */
  rotuloSimilares?: string;
};

/* Las perillas que NO llevan un valor de fábrica: `undefined` significa "como
   estaba siempre", y la ficha las esquiva del todo. Ponerles un default acá les
   cambiaría el aspecto de golpe a las fichas que ya andaban.
   Están juntas en un tipo para que agregar una perilla sea tocar un solo lugar en
   vez de repetir la lista tres veces. */
type PerillaSinDefault =
  | "tituloSeccion" | "nombre" | "paletaPromo" | "panelCompra"
  | "miniaturaActiva" | "precio" | "resenaComentario"
  | "botonEscribirResenaEstilo";

/** Lo que rige cuando el template no dice nada. Es la ficha de siempre. */
export const VESTIDO_FICHA_BASE: Required<Omit<VestidoFicha, PerillaSinDefault>> & Pick<VestidoFicha, PerillaSinDefault> = {
  paletaPromo: undefined,
  panelCompra: undefined,
  miniaturaActiva: undefined,
  precio: undefined,
  resenaComentario: undefined,
  tituloRayita: false,
  rotuloDescripcion: "Descripción",
  rotuloEspecificaciones: "Especificaciones",
  tituloSeccion: { fontSize: 13, fontWeight: 700 },
  nombre: undefined,
  rotuloOpcion: { fontSize: 13, fontWeight: 600 },
  chipTalleCuadrado: false,
  precioAcento: false,
  botonCompraDestacado: false,
  avatarRedondo: true,
  resenaFormPlegado: false,
  resenaFormModal: false,
  botonEscribirResena: "Escribí tu reseña",
  botonEscribirResenaEstilo: undefined,
  textoSinResenas: "Todavía no hay reseñas para este producto.",
  rotuloSimilares: "También te puede interesar",
};

/** El vestido resuelto de un tema: lo suyo sobre la base. */
export function vestidoDe(theme: DetailTheme) {
  return { ...VESTIDO_FICHA_BASE, ...(theme.vestido ?? {}) };
}

/**
 * Un título de sección, con el vestido del template puesto.
 *
 * Estaba escrito a mano cinco veces con los mismos `fontSize: 13, fontWeight:
 * 700`. Con cinco copias, vestirlo distinto en un template era encontrar las
 * cinco — y la que se olvidara iba a quedar con la tipografía de otro.
 */
export function TituloSeccion({ theme, children, style }: { theme: DetailTheme; children: React.ReactNode; style?: React.CSSProperties }) {
  const v = vestidoDe(theme);
  return (
    <div style={{ marginBottom: 12, ...style }}>
      <p style={{ color: theme.text, margin: 0, fontFamily: theme.headingFont, ...v.tituloSeccion }}>{children}</p>
      {v.tituloRayita && (
        <span style={{ display: "block", width: 28, height: 1, background: theme.accentReadable, marginTop: 7 }} />
      )}
    </div>
  );
}

/**
 * El rótulo de una opción de compra: TALLE, COLOR, CANTIDAD.
 *
 * Es su propio componente por lo mismo que `TituloSeccion`: los tres estaban
 * escritos a mano con los mismos `fontSize: 13, fontWeight: 600`, y vestirlos
 * distinto en un template era acordarse de los tres.
 */
export function RotuloOpcion({ theme, children, style }: { theme: DetailTheme; children: React.ReactNode; style?: React.CSSProperties }) {
  const v = vestidoDe(theme);
  return <p style={{ color: theme.muted, margin: 0, ...v.rotuloOpcion, ...style }}>{children}</p>;
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
  /** Qué políticas legales linkea el pie. Ver `lib/politicas-tienda`. */
  legales: ClaveLegal[] | undefined;
  /** El rubro de la tienda. Lo usan los nombres de las políticas del pie. */
  tipoTienda?: string | null;
  accentOverride: string | undefined;
  footerBg: string | undefined;
  cart: ReturnType<typeof useCartLogic>;
  activeImg: number;
  setActiveImg: (i: number) => void;
  /** Lo elegido, por nombre de opción: `{ Talle: "M", Color: "Negro" }`. */
  seleccion: SeleccionOpciones;
  setOpcion: (nombre: string, valor: string) => void;
  canAdd: boolean;
  qty: number;
  setQty: (n: number) => void;
  addToCart: () => void;
  cartCount: number;
  toastMsg: string | null;
  discount: number | null;
  promo: ProductPromoDisplay;
  catalogHref: string;

  /* ── Lo que necesita una BARRA de arriba completa ───────────────────────────
   * Todo opcional: lo llena la página suelta del producto (`ProductDetailClient`),
   * que es la que entra por un link compartido y por Google y necesita dibujar la
   * misma barra que la tienda. Aire dibuja esta ficha adentro de su portada
   * también, y ahí la barra es la del template, así que no manda nada de esto.
   * Un `*Detail.tsx` que no lo use no se entera. */
  /** Todo el catálogo — para el buscador de la barra y el menú de categorías. */
  products?: StorefrontProduct[];
  /** Las promos vivas, para poder mostrar precio en los resultados del buscador. */
  promotions?: ActivePromotion[];
  /** La tienda esconde los precios al público. */
  ocultarPrecios?: boolean;
  /** El dueño tiene Plan Plus y quien mira no es él: se puede seguir la tienda. */
  showPushBell?: boolean;
  isVerified?: boolean;
  verifiedInfo?: VerifiedInfo;
  promoBanner?: { enabled: boolean; messages?: string[] } | null;
  /** La bajada del logo. Cadena vacía = la dueña la apagó. */
  navTagline?: string | null;
}

/**
 * Stock de la combinación elegida.
 *
 * Era una CUARTA copia del mismo buscador de variante —había otras tres, y una
 * estaba rota (ver `lib/variantMatch.ts`)—. Ahora usa el compartido, así que las
 * cuatro pantallas no pueden volver a opinar distinto sobre qué variante es la
 * que el comprador está mirando.
 */
function useSelectedVariantStock(product: StorefrontProduct, seleccion: SeleccionOpciones) {
  return useMemo(
    () => buscarVariante(product.variants, valoresElegidos(seleccion))?.stock ?? null,
    [product, seleccion],
  );
}

function ProductReels({ theme, reelUrls }: { theme: DetailTheme; reelUrls: string[] }) {
  if (reelUrls.length === 0) return null;

  return (
    <div style={{ borderTop: `1px solid ${theme.cardBorder}`, paddingTop: 16, marginTop: 8 }}>
      <TituloSeccion theme={theme}>Videos del producto</TituloSeccion>
      <StoreProductReels
        reelUrls={reelUrls}
        theme={{ accent: theme.accent, text: theme.text, border: theme.cardBorder, radius: theme.radius }}
      />
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
  const { slug, currency, whatsapp, product, related, hasMercadoPago, isPreview, isOwner, activeImg, setActiveImg,
    seleccion, setOpcion, canAdd, qty, setQty, addToCart, discount, promo } = view;

  const [tab, setTab] = useState<"desc" | "specs">("desc");
  const vestido = vestidoDe(theme);
  // Arranca abierto salvo que el template pida lo contrario: asi los que ya
  // andaban no cambian de comportamiento.
  const [formResenaAbierto, setFormResenaAbierto] = useState(!vestidoDe(theme).resenaFormPlegado);
  const [cp, setCp] = useState("");
  const [cpResult, setCpResult] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  type PReview = { id: string; rating: number; comment: string | null; reviewer: string; createdAt: string };
  const [reviews, setReviews] = useState<PReview[]>([]);
  const [reviewsShown, setReviewsShown] = useState(5);
  const [reviewForm, setReviewForm] = useState({ reviewer: "", rating: 5, comment: "", email: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);
  const [reviewHoneypot, setReviewHoneypot] = useState("");
  const reviewCaptcha = useTurnstile("review");

  /* ── "Cargando reseñas" se deduce, no se avisa ──────────────────────────────
     `reviewsDe` es de qué producto son las reseñas que hay en memoria, y se pone
     recién cuando la respuesta llegó. Mientras no coincida con el que se está
     mirando, se están trayendo.
     Antes era un `setReviewsLoading(true)` adentro del efecto, que es lo que el
     lint del repo marca como error (`react-hooks/set-state-in-effect`) y con
     razón: obliga a un render entero sólo para anotar que se empezó a pedir, y
     el pedido ni siquiera salió todavía. Derivado no hace falta ese render.
     Las mismas dos condiciones que el efecto: si no hay slug o no hay producto no
     se pide nada, y entonces tampoco se está cargando — sin esto quedaría girando
     para siempre. */
  const [reviewsDe, setReviewsDe] = useState<string | null>(null);
  const reviewsLoading = !!slug && !!product.id && reviewsDe !== product.id;

  /* ── Y el formulario se limpia al cambiar de producto ───────────────────────
     Se puede pasar a otro producto sin recargar la página, tocando uno de los
     similares. Sin esto, el "¡Gracias por tu reseña!" del anterior queda puesto
     sobre el nuevo y parece que ya opinaste sobre éste.
     Va en el render y no en un efecto a propósito: es el patrón que React
     documenta para ajustar estado cuando cambia una prop. En un efecto, el estado
     viejo alcanza a pintarse una vez antes de limpiarse. */
  const [formDe, setFormDe] = useState(product.id);
  if (formDe !== product.id) {
    setFormDe(product.id);
    setReviewDone(false);
    setReviewsShown(5);
    setReviewForm(p => ({ ...p, rating: 5, comment: "" }));
  }

  useEffect(() => {
    if (!slug || !product.id) return;
    // Si se cambia de producto con el pedido en el aire, la respuesta del anterior
    // llega después y pisaría las reseñas del que se está mirando.
    let vigente = true;
    fetch(`/api/public/${slug}/reviews?productId=${product.id}`)
      .then(r => r.ok ? r.json() : { reviews: [] })
      .then(d => { if (vigente) setReviews(d.reviews ?? []); })
      .catch(() => { if (vigente) setReviews([]); })
      .finally(() => { if (vigente) setReviewsDe(product.id); });
    return () => { vigente = false; };
  }, [slug, product.id]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (isPreview || isOwner || reviewHoneypot || !reviewForm.reviewer.trim()) return;
    setReviewSubmitting(true);
    try {
      const res = await fetch(`/api/public/${slug}/reviews`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, rating: reviewForm.rating, comment: reviewForm.comment, reviewer: reviewForm.reviewer, buyerEmail: reviewForm.email.trim() || undefined, website: reviewHoneypot, turnstileToken: reviewCaptcha.token }),
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(p => [data.review, ...p]);
        setReviewForm({ reviewer: "", rating: 5, comment: "", email: "" });
        setReviewDone(true);
      }
    } catch {}
    finally { reviewCaptcha.reset(); setReviewSubmitting(false); }
  }
  const carouselRef = useRef<HTMLDivElement>(null);

  const selectedVariantStock = useSelectedVariantStock(product, seleccion);
  const outOfStock = selectedVariantStock === 0;
  const variantPrice = resolveVariantPrice(product.variants, valoresElegidos(seleccion));
  const displayPrice = variantPrice ?? product.price;

  // Cuántas unidades se pagan de verdad con una promo N×M puesta: con 3×2 y
  // cantidad 3 se pagan 2. Lo usa el aviso de la promo y el total del botón, y
  // se calcula UNA vez: escrito en los dos lados, el día que cambie la regla
  // uno de los dos números va a quedar viejo — y el que quede viejo es el que
  // se cobra.
  const nxmPagadas = promo.nxm ? qty - Math.floor(qty / promo.nxm.n) * (promo.nxm.n - promo.nxm.m) : null;
  // El precio de UNA unidad que el comprador paga de verdad: con una promo que
  // baja el precio es el rebajado, si no el de lista (o el de la variante).
  //
  // Tiene nombre porque estaba escrito dos veces y una de las dos estaba mal. El
  // total del botón lo tenía bien; el renglón de las cuotas dividía `displayPrice`
  // —el precio SIN la promo— y quedaba así, con un 20% puesto:
  //
  //     $ 190.000  20%OFF
  //     $ 152.000                      ← lo que se cobra
  //     3 cuotas sin interés de $ 63.333   ← × 3 = 190.000, o sea el precio viejo
  //
  // Las cuotas sumaban más que el precio, abajo del precio. Ahora sale de acá y
  // no puede volver a separarse.
  const precioUnitarioReal = promo.hasPriceDrop ? promo.effectivePrice : displayPrice;
  const totalCompra = nxmPagadas != null
    ? nxmPagadas * displayPrice
    : precioUnitarioReal * qty;

  function goToImg(i: number) {
    setActiveImg((i + product.images.length) % product.images.length);
  }
  const imgSwipe = useTouchSwipe(
    () => goToImg(activeImg + 1),
    () => goToImg(activeImg - 1)
  );

  /**
   * Elegir un valor y, si hay una foto atada a ese valor, mostrarla.
   *
   * Antes era `pickColor` y sólo servía para el color. Ahora vale para cualquier
   * opción: la foto se busca contra el valor elegido, sin preguntar de qué opción
   * viene.
   */
  function elegirOpcion(nombre: string, valor: string) {
    setOpcion(nombre, valor);
    const idx = product.imageItems.findIndex(img => img.variantValue?.toLowerCase() === valor.toLowerCase());
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
        {/* Los dos links llevan padding vertical: medidos en un celular de 360
            eran de 19px de alto —el alto de la letra— y son la forma de volver a
            la categoría desde la ficha. El `gap` de la fila ya separaba lo
            suficiente, así que el blanco crece sin que se mueva nada de lugar. */}
        <Link href={`/tienda/${slug}${editorParam(isPreview)}`} style={{ color: theme.muted, textDecoration: "none", display: "inline-block", padding: "5px 0" }}>Inicio</Link>
        <span>›</span>
        <Link href={`/tienda/${slug}/productos?categoria=${product.category}${editorParam(isPreview, "&")}`} style={{ color: theme.muted, textDecoration: "none", display: "inline-block", padding: "5px 0" }}>{catLabel}</Link>
        <span>›</span>
        <span style={{ color: theme.text }}>{product.name}</span>
      </div>

      <div style={{ display: "grid", gap: 40 }} className="pdb-grid">
        <style>{`
          .pdb-grid{grid-template-columns:1fr}
          /* min-width:0 en las tres, y no es de adorno.

             La fila de miniaturas mide lo que suman las miniaturas: con cinco
             fotos son 5x72 mas cuatro separaciones = 392px. Como hija de un flex
             en columna, su ancho minimo por defecto es su contenido, asi que
             estiraba la galeria a 392 adentro de una pantalla de 360 y empujaba
             la pagina entera. Medido: 56px de desplazamiento horizontal en un
             telefono, en los CUATRO templates que ya usan esta ficha. El
             overflow-x:auto de la fila no alcanzaba: no puede recortar si el
             padre la deja crecer.

             Con esto la fila se corre con el dedo, que es lo que se esperaba
             desde el principio. */
          .pdb-grid>*{min-width:0}
          .pdb-gallery{display:flex; flex-direction:column; gap:10px; min-width:0}
          .pdb-thumbs{display:flex; flex-direction:row; gap:8px; overflow-x:auto; order:2; min-width:0}
          .pdb-main{order:1}
          ${vestido.panelCompra ? `
          .pdb-buy{
            ${vestido.panelCompra.fondo ? `background:${vestido.panelCompra.fondo};` : ""}
            ${vestido.panelCompra.padding ? `padding:${vestido.panelCompra.padding};` : ""}
            ${vestido.panelCompra.filo ? `border-top:${vestido.panelCompra.filoGrosor ?? 3}px solid ${vestido.panelCompra.filo};` : ""}
          }` : ""}
          @media(min-width:860px){
            .pdb-grid{grid-template-columns:minmax(360px,540px) 1fr; align-items:start}
            .pdb-gallery{flex-direction:row}
            .pdb-thumbs{flex-direction:column; overflow-x:visible; overflow-y:auto; order:0; width:76px; max-height:480px}
            .pdb-main{order:1; flex:1; min-width:0; max-width:460px}
            ${vestido.panelCompra?.filo ? `
            /* Con las dos columnas lado a lado el filo separa por el costado; al
               apilarse (la regla de arriba) pasa a estar arriba. */
            .pdb-buy{ border-top:none; border-left:${vestido.panelCompra.filoGrosor ?? 3}px solid ${vestido.panelCompra.filo}; }` : ""}
          }
        `}</style>

        {/* Galería */}
        <div className="pdb-gallery">
          {product.images.length > 1 && (
            <div className="pdb-thumbs">
              {product.images.map((url, i) => (
                <button key={url + i} onClick={() => goToImg(i)}
                  style={{
                    flexShrink: 0, width: 72, height: 72, overflow: "hidden", padding: 0, cursor: "pointer", background: "none",
                    // Con `miniaturaActiva` la marca es un filo grueso del color que
                    // pida el template y la esquina la del tema; sin ella queda el
                    // borde de acento redondeado de siempre.
                    ...(vestido.miniaturaActiva
                      ? {
                          borderRadius: theme.radius,
                          border: i === activeImg
                            ? `${vestido.miniaturaActiva.grosor}px solid ${vestido.miniaturaActiva.borde}`
                            : `1px solid ${theme.cardBorder}`,
                          opacity: i === activeImg ? 1 : 0.55,
                        }
                      : { borderRadius: 8, border: `2px solid ${i === activeImg ? theme.accent : "transparent"}` }),
                  }}>
                  <FadeImage src={url} alt="" width={72} height={72} style={{ objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}
          <div className="pdb-main" style={{ aspectRatio: "1/1", background: "#f8f8fa", borderRadius: theme.radius, overflow: "hidden", position: "relative", border: `1px solid ${theme.cardBorder}` }}
            {...imgSwipe}>
            {promo.primaryPromo ? (
              <PromoTag tipo={promo.primaryPromo.type} label={describePromo(promo.primaryPromo).headline} size="sm" paleta={vestido.paletaPromo} />
            ) : discount ? (
              <div style={{ position: "absolute", top: 12, left: 12, zIndex: 1, background: "#dc2626", color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 100 }}>
                {discount}% OFF
              </div>
            ) : null}
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

        {/* Info — con `panelCompra`, esta columna se dibuja como una losa aparte
            (fondo propio, filo, respiro adentro) en vez de apoyarse sobre el
            mismo fondo que el resto de la página. Las reglas están en el bloque
            de estilos de arriba porque el filo cambia de lado según el ancho. */}
        <div className="pdb-buy">
          <p style={{ margin: "0 0 6px", fontSize: 11.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: theme.accentReadable }}>
            {product.attributes.find(a => a.key.toLowerCase() === "marca")?.value ?? catLabel}
          </p>
          <h1 style={{ margin: "0 0 16px", fontSize: "clamp(22px,3vw,30px)", fontWeight: 700, color: theme.text, fontFamily: theme.headingFont, lineHeight: 1.2, ...vestido.nombre }}>
            {product.name}
          </h1>

          {promo.hasPriceDrop ? (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 2, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, color: theme.muted, textDecoration: "line-through" }}>{fmtPrice(promo.originalPrice, currency)}</span>
                {promo.pctOff != null && <span style={{ background: theme.accent, color: theme.accentText, fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 6 }}>{promo.pctOff}%OFF</span>}
              </div>
              <p style={{ margin: "0 0 6px", fontSize: 30, fontWeight: 800, ...vestido.precio, color: "#dc2626" }}>{fmtPrice(promo.effectivePrice, currency)}</p>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 2 }}>
                {!variantPrice && product.comparePrice && product.comparePrice > product.price && (
                  <span style={{ fontSize: 15, color: theme.muted, textDecoration: "line-through" }}>{fmtPrice(product.comparePrice, currency)}</span>
                )}
                {!variantPrice && discount && (
                  <span style={{ background: theme.accent, color: theme.accentText, fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 6 }}>{discount}%OFF</span>
                )}
              </div>
              {/* El color va DESPUÉS del vestido a propósito: `precio` ajusta el
                  tamaño y el peso, pero quién decide el color sigue siendo
                  `precioAcento`, que ya tiene en cuenta si el acento se lee sobre
                  el fondo de la página. */}
              <p style={{ margin: "0 0 6px", fontSize: 30, fontWeight: 800, ...vestido.precio, color: vestido.precioAcento ? theme.accentReadable : theme.text }}>{fmtPrice(displayPrice, currency)}</p>
            </>
          )}
          {promo.primaryPromo && <div style={{ marginBottom: 12 }}><PromoBlock promo={promo.primaryPromo} freeShippingExtra={promo.freeShipping} paleta={vestido.paletaPromo} /></div>}
          {product.offerNote && (
            <div style={{ fontSize: 13, color: "#059669", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "7px 12px", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <span>📋</span><span>{product.offerNote}</span>
            </div>
          )}
          {hasMercadoPago ? (
            product.cuotas ? (
              <div style={{ margin: "0 0 24px" }}>
                <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: theme.text }}>
                  {product.cuotas} cuotas sin interés de {fmtPrice(precioUnitarioReal / product.cuotas, currency)}
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

          {/* Un bucle por las opciones que tenga el producto, en vez de un bloque
              fijo para "Talle" y otro para "Color". Cada una se llama como la
              llamó quien cargó el producto, así que un collar dice "Largo" y no
              "Talle". La regla de qué se muestra y cómo está en `opcionesVisibles`
              —una sola vez para las seis pantallas que dibujan opciones—. */}
          {opcionesVisibles(product.opciones).map(op => {
            // Un solo valor que informa algo ("45cm"): va como texto. No hay nada
            // que elegir, y un botón que no puede cambiar nada se lee como que la
            // página se colgó.
            if (op.tipo === "dato") {
              return (
                <div key={op.nombre} style={{ marginBottom: 16 }}>
                  <RotuloOpcion theme={theme} style={{ marginBottom: 8 }}>{op.nombre}</RotuloOpcion>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: theme.text }}>{op.valor}</p>
                </div>
              );
            }
            const conMuestra = esOpcionDeColor(op.nombre);
            return (
              <div key={op.nombre} style={{ marginBottom: 16 }}>
                <RotuloOpcion theme={theme} style={{ marginBottom: 8 }}>{op.nombre}</RotuloOpcion>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {op.valores.map(valor => {
                    const elegido = seleccion[op.nombre] === valor;
                    // El puntito del color va en las dos pantallas o en ninguna: en
                    // el modal está y acá faltaba, así que el mismo "Negro" se
                    // elegía mirando una muestra en el catálogo y leyendo una
                    // palabra en la ficha. Para los nombres que no se reconocen
                    // —"Petróleo"— la muestra es lo único que dice de qué color es.
                    const swatch = conMuestra ? colorToSwatch(valor) : null;
                    return (
                      <button key={valor} onClick={() => elegirOpcion(op.nombre, valor)}
                        style={{ borderRadius: theme.radius, fontSize: 13, fontWeight: 600, cursor: "pointer",
                          border: `1.5px solid ${elegido ? theme.accent : theme.cardBorder}`,
                          background: elegido ? `${theme.accent}14` : "transparent", color: theme.text,
                          // Cuadrado fijo o pastilla, según el template. Con valores
                          // de largo distinto ("S" y "XXL") las pastillas quedan de
                          // anchos salteados; el cuadrado los alinea en grilla. El
                          // cuadrado es para los que se leen de un vistazo, no para
                          // los que llevan muestra de color al lado.
                          ...(vestido.chipTalleCuadrado && !conMuestra
                            ? { width: 46, height: 46, padding: 0 }
                            : { display: "flex", alignItems: "center", gap: 7, padding: "8px 16px" }),
                        }}>
                        {swatch && <span style={{ width: 14, height: 14, borderRadius: "50%", background: swatch, border: `1px solid ${theme.cardBorder}`, flexShrink: 0 }} />}
                        {valor}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "20px 0" }}>
            <RotuloOpcion theme={theme}>Cantidad</RotuloOpcion>
            <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${theme.cardBorder}`, borderRadius: theme.radius }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ padding: "8px 14px", background: "none", border: "none", color: theme.text, cursor: "pointer", fontSize: 15 }}>−</button>
              <span style={{ fontSize: 13, fontWeight: 600, color: theme.text, minWidth: 20, textAlign: "center" }}>{qty}</span>
              <button onClick={() => setQty(qty + 1)} style={{ padding: "8px 14px", background: "none", border: "none", color: theme.text, cursor: "pointer", fontSize: 15 }}>+</button>
            </div>
          </div>

          {/* El aviso de stock va DEBAJO de la cantidad, pegado al botón, no entre
              los colores y el selector: es lo que limita cuánto se puede llevar, y
              arriba quedaba lejos de la decisión que condiciona. Mismo orden que el
              panel del modal. */}
          {selectedVariantStock !== null && outOfStock && (
            <p style={{ fontSize: 12.5, color: "#dc2626", fontWeight: 600, margin: "0 0 12px" }}>Sin stock en esta combinación</p>
          )}
          {selectedVariantStock !== null && selectedVariantStock > 0 && selectedVariantStock <= 5 && (
            <p style={{ fontSize: 12.5, color: "#d97706", fontWeight: 600, margin: "0 0 12px" }}>¡Últimas {selectedVariantStock} unidades!</p>
          )}

          {/* 3×2 en vivo: progreso del beneficio N×M según la cantidad. */}
          {promo.nxm && nxmPagadas != null && (() => {
            const { n, m } = promo.nxm;
            const free = qty - nxmPagadas;
            const toNext = (n - (qty % n)) % n;
            return (
              <div style={{ fontSize: 12.5, fontWeight: 700, padding: "9px 12px", borderRadius: 8, margin: "0 0 20px", background: free > 0 ? "rgba(22,163,74,0.10)" : "#fff7ed", border: `1px solid ${free > 0 ? "rgba(22,163,74,0.28)" : "#fed7aa"}`, color: free > 0 ? "#16a34a" : "#c2410c" }}>
                {free > 0
                  ? `🎉 Llevás ${qty}, pagás ${nxmPagadas} · ${free} gratis${toNext > 0 ? ` — sumá ${toNext} y llevás otra gratis` : ""}`
                  : `Promo ${n}×${m} · sumá ${toNext} más y una te sale gratis`}
              </div>
            );
          })()}

          {/* Destacado, el botón ocupa el ancho entero y WhatsApp pasa a la fila
              de abajo: son dos cosas distintas —comprar y preguntar— y a la par
              se leían como dos opciones del mismo peso. */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
            <button onClick={addToCart} disabled={!canAdd || outOfStock}
              style={{ flex: vestido.botonCompraDestacado ? "1 1 100%" : "1 1 200px",
                background: (canAdd && !outOfStock) ? theme.accent : "#d1d5db", color: (canAdd && !outOfStock) ? theme.accentText : "#6b7280",
                border: "none", padding: "14px 22px", fontWeight: 700, fontSize: 13.5, borderRadius: theme.radius, cursor: (canAdd && !outOfStock) ? "pointer" : "default",
                ...(vestido.botonCompraDestacado ? { padding: "15px 22px", fontSize: 11, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase" as const } : {}) }}>
              {outOfStock ? "Sin stock"
                : vestido.botonCompraDestacado ? `Agregar al carrito · ${fmtPrice(totalCompra, currency)}`
                : "Agregar al carrito"}
            </button>
            {whatsapp && (
              <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola! Te consulto sobre ${product.name}`)}`}
                target="_blank" rel="noopener noreferrer"
                style={{ flex: vestido.botonCompraDestacado ? "1 1 100%" : "1 1 200px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: `1.5px solid #25d366`, color: "#1a9e4f",
                  textDecoration: "none", padding: "14px 22px", fontWeight: 700, fontSize: 13.5, borderRadius: theme.radius }}>
                Consultar por WhatsApp
              </a>
            )}
          </div>

          {/* Calculadora de envío */}
          <div style={{ border: `1px solid ${theme.cardBorder}`, borderRadius: theme.radius, padding: "16px 18px", marginBottom: 24 }}>
            <TituloSeccion theme={theme} style={{ marginBottom: 10 }}>Calcular envío</TituloSeccion>
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
          {/* Los rótulos salen del vestido: Boho Terra a la ficha técnica le
              dice "La pieza", que es como habla el template en el modal. */}
          {([["desc", vestido.rotuloDescripcion], ["specs", vestido.rotuloEspecificaciones]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 10px", fontSize: 13.5, fontWeight: 700,
                color: tab === key ? theme.accent : theme.muted, borderBottom: tab === key ? `2px solid ${theme.accent}` : "2px solid transparent" }}>
              {label}
            </button>
          ))}
        </div>
        {tab === "desc" ? (
          <div
            className="product-rte"
            dangerouslySetInnerHTML={{ __html: product.description || "<p>Sin descripción disponible.</p>" }}
            style={{ margin: 0, fontSize: 13.5, color: theme.muted, lineHeight: 1.85 }}
          />
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

      {/* Reseñas */}
      <div style={{ marginTop: 40, borderTop: `1px solid ${theme.cardBorder}`, paddingTop: 32 }}>
        <TituloSeccion theme={theme} style={{ marginBottom: 20 }}>
          Reseñas{reviews.length > 0 && ` (${reviews.length})`}
        </TituloSeccion>
        {reviewsLoading ? (
          <p style={{ fontSize: 13, color: theme.muted }}>Cargando...</p>
        ) : reviews.length > 0 ? (
          <div style={{ marginBottom: 32 }}>
            {(() => {
              const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
              const dist = [5,4,3,2,1].map(s => ({ stars: s, count: reviews.filter(r => r.rating === s).length }));
              return (
                <div style={{ display: "flex", gap: 24, alignItems: "center", marginBottom: 24, padding: "16px 20px", background: `${theme.accent}08`, border: `1px solid ${theme.cardBorder}`, borderRadius: theme.radius }}>
                  <div style={{ textAlign: "center", minWidth: 60 }}>
                    <p style={{ fontSize: 36, fontWeight: 800, color: theme.text, margin: 0, lineHeight: 1 }}>{avg.toFixed(1)}</p>
                    <div style={{ display: "flex", gap: 2, justifyContent: "center", margin: "6px 0 4px" }}>
                      {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: 12, color: s <= Math.round(avg) ? theme.accent : theme.cardBorder }}>★</span>)}
                    </div>
                    <p style={{ fontSize: 10, color: theme.muted, margin: 0 }}>{reviews.length} reseña{reviews.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                    {dist.map(d => (
                      <div key={d.stars} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 10, color: theme.accentReadable, minWidth: 16, textAlign: "right", fontWeight: 600 }}>{d.stars}★</span>
                        <div style={{ flex: 1, height: 5, background: theme.cardBorder, borderRadius: theme.radius, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${reviews.length ? (d.count / reviews.length) * 100 : 0}%`, background: theme.accent, borderRadius: theme.radius }} />
                        </div>
                        <span style={{ fontSize: 10, color: theme.muted, minWidth: 14, textAlign: "right" }}>{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {reviews.slice(0, reviewsShown).map((r, i) => (
                <div key={r.id} style={{ display: "flex", gap: 14, padding: "18px 0", borderBottom: i < Math.min(reviewsShown, reviews.length) - 1 ? `1px solid ${theme.cardBorder}` : "none" }}>
                  {/* La inicial de quien reseñó. Redonda o con el radio del
                      template: en Boho Terra no hay una sola esquina redondeada
                      en toda la tienda, y un círculo ahí canta. */}
                  <div style={{ width: 38, height: 38, borderRadius: vestido.avatarRedondo ? "50%" : theme.radius, flexShrink: 0, background: `${theme.accent}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: theme.accentReadable }}>
                    {r.reviewer.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{r.reviewer}</span>
                      <span style={{ fontSize: 11, color: theme.muted }}>{new Date(r.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                    <div style={{ display: "flex", gap: 1, marginBottom: r.comment ? 8 : 0 }}>
                      {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: 13, color: s <= r.rating ? theme.accent : theme.cardBorder }}>★</span>)}
                    </div>
                    {/* El mismo componente que usan los templates en su bloque de
                        opiniones y en su vista rápida. Acá se imprimía el
                        comentario entero: una reseña larga estiraba la ficha y
                        empujaba para abajo todo lo que venía después.
                        Sin `onVerMas`, el botón despliega el texto acá mismo — que
                        es lo que corresponde: ya estás en la ficha del producto, no
                        hay a dónde llevarte. */}
                    {r.comment && (
                      <ResenaComentario
                        texto={r.comment}
                        acento={theme.accentReadable}
                        estiloTexto={{ fontSize: 13.5, color: theme.muted, lineHeight: 1.7 }}
                        comillas={vestido.resenaComentario?.comillas ?? false}
                        lineas={vestido.resenaComentario?.lineas ?? 6}
                        // `irA` es el texto del botón cuando lleva a otra pantalla;
                        // acá no lleva a ninguna, así que no se usa nunca.
                        textoBoton={{ desplegar: vestido.resenaComentario?.desplegar ?? "Leer todo", irA: "" }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
            {reviews.length > reviewsShown && (
              <button onClick={() => setReviewsShown(n => n + 10)} style={{ marginTop: 16, background: "none", border: `1.5px solid ${theme.cardBorder}`, color: theme.accentReadable, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "9px 22px", borderRadius: theme.radius }}>
                Ver más reseñas ({reviews.length - reviewsShown})
              </button>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: theme.muted, marginBottom: 24 }}>{vestido.textoSinResenas}</p>
        )}
        {isOwner ? (
          <p style={{ fontSize: 12, color: theme.muted, fontStyle: "italic" }}>El dueño no puede dejar reseñas en su propia tienda.</p>
        ) : reviewDone ? (
          <p style={{ fontSize: 13, color: theme.accent, fontWeight: 700 }}>¡Gracias por tu reseña!</p>
        ) : !formResenaAbierto ? (
          /* Plegado: sólo el botón. Los seis campos desplegados ocupan media
             pantalla para algo que hace una de cada cien personas que miran el
             producto — la mayoría viene a LEER las reseñas, no a escribir una. */
          <button
            onClick={() => setFormResenaAbierto(true)}
            style={{
              background: "none", border: `1.5px solid ${theme.accentReadable}`, color: theme.accentReadable,
              padding: "12px 28px", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
              cursor: "pointer", borderRadius: theme.radius, fontFamily: theme.font,
              ...vestido.botonEscribirResenaEstilo,
            }}
          >
            {vestido.botonEscribirResena}
          </button>
        ) : (
          /* Con `resenaFormModal`, el formulario vive en una ventana flotante
             encima de la ficha — no desplegado abajo. Es lo que hace el modal
             del template: la ficha no se estira, y quien está leyendo reseñas no
             pierde el lugar donde iba.
             El velo cierra al tocarlo; el contenido no, por el stopPropagation. */
          <div
            style={vestido.resenaFormModal ? {
              position: "fixed", inset: 0, zIndex: CAPAS.sobrePanelAlto,
              background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
            } : undefined}
            onClick={vestido.resenaFormModal ? () => setFormResenaAbierto(false) : undefined}
          >
          <div
            style={vestido.resenaFormModal ? {
              position: "relative", background: theme.pageBg, width: "100%", maxWidth: 460,
              maxHeight: "92vh", overflowY: "auto", padding: "30px 28px 26px", borderRadius: theme.radius,
            } : { position: "relative", maxWidth: 480 }}
            onClick={vestido.resenaFormModal ? e => e.stopPropagation() : undefined}
          >
            {isPreview && <div style={{ position: "absolute", inset: 0, zIndex: 10, cursor: "default" }} onClick={e => e.stopPropagation()} />}
            {vestido.resenaFormModal && (
              <>
                <button onClick={() => setFormResenaAbierto(false)} aria-label="Cerrar"
                  style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: theme.muted, width: 32, height: 32, cursor: "pointer", fontSize: 22, lineHeight: 1 }}>×</button>
                {/* De qué producto es: esta ventana tapa la ficha. */}
                <p style={{ margin: "0 0 16px", fontSize: 12, color: theme.muted, lineHeight: 1.5 }}>
                  Sobre <strong style={{ color: theme.text }}>{product.name}</strong>.
                </p>
              </>
            )}
            <TituloSeccion theme={theme}>{vestido.resenaFormModal ? "Tu reseña" : "Dejá tu reseña"}</TituloSeccion>
            <form onSubmit={isPreview ? e => e.preventDefault() : submitReview} style={{ display: "flex", flexDirection: "column", gap: 10, opacity: isPreview ? 0.55 : 1 }}>
              <input value={reviewHoneypot} onChange={e => setReviewHoneypot(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ opacity: 0, height: 0, position: "absolute", pointerEvents: "none" }} />
              <input value={reviewForm.reviewer} onChange={e => !isPreview && setReviewForm(p => ({ ...p, reviewer: e.target.value }))}
                placeholder="Tu nombre" readOnly={isPreview}
                style={{ border: `1px solid ${theme.cardBorder}`, borderRadius: theme.radius, padding: "9px 12px", fontSize: 13, color: theme.text, background: "transparent", outline: "none" }} />
              <div>
                <input value={reviewForm.email} onChange={e => !isPreview && setReviewForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="Tu email (opcional — verifica tu compra)" type="email" readOnly={isPreview} autoComplete="email"
                  style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${theme.cardBorder}`, borderRadius: theme.radius, padding: "9px 12px", fontSize: 13, color: theme.text, background: "transparent", outline: "none" }} />
                <p style={{ fontSize: 10, color: theme.muted, margin: "3px 0 0", lineHeight: 1.4 }}>
                  Si compraste acá, tu reseña mostrará &ldquo;✓ Compra verificada&rdquo;. El email no se publica.
                </p>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {[1,2,3,4,5].map(s => (
                  <button key={s} type="button" onClick={() => !isPreview && setReviewForm(p => ({ ...p, rating: s }))}
                    style={{ background: "none", border: "none", fontSize: 24, cursor: isPreview ? "default" : "pointer", color: s <= reviewForm.rating ? theme.accent : theme.cardBorder, padding: "2px" }}>★</button>
                ))}
              </div>
              <textarea value={reviewForm.comment} onChange={e => !isPreview && setReviewForm(p => ({ ...p, comment: e.target.value }))}
                placeholder="Comentario (opcional)" rows={3} readOnly={isPreview}
                style={{ border: `1px solid ${theme.cardBorder}`, borderRadius: theme.radius, padding: "9px 12px", fontSize: 13, color: theme.text, background: "transparent", resize: "none", outline: "none" }} />
              {!isPreview && reviewCaptcha.widget}
              <button type="submit" disabled={isPreview || reviewSubmitting || !reviewForm.reviewer.trim() || !reviewCaptcha.ready}
                style={{ background: isPreview || reviewSubmitting || !reviewForm.reviewer.trim() ? theme.cardBorder : theme.accent, color: isPreview || reviewSubmitting || !reviewForm.reviewer.trim() ? theme.muted : theme.accentText, border: "none", padding: "12px", fontSize: 13, fontWeight: 700, borderRadius: theme.radius, cursor: isPreview || reviewSubmitting || !reviewForm.reviewer.trim() ? "not-allowed" : "pointer" }}>
                {reviewSubmitting ? "Publicando..." : "Publicar reseña"}
              </button>
            </form>
            {isPreview && <p style={{ fontSize: 10, color: theme.muted, fontStyle: "italic", marginTop: 6 }}>Vista previa — solo disponible en la tienda real.</p>}
          </div>
          </div>
        )}
      </div>

      {/* Relacionados */}
      {related.length > 0 && (
        <div style={{ marginTop: 56, position: "relative" }}>
          <TituloSeccion theme={theme} style={{ marginBottom: 18 }}>{vestido.rotuloSimilares}</TituloSeccion>
          <button onClick={() => scrollCarousel(-1)} aria-label="Anterior"
            style={{ position: "absolute", left: -36, top: "38%", transform: "translateY(-50%)", width: 36,
              border: "none", background: "none", color: theme.text, opacity: 0.6, textShadow: "0 0 6px rgba(255,255,255,0.5), 0 0 6px rgba(0,0,0,0.5)", fontSize: 44, lineHeight: 1, cursor: "pointer", zIndex: 2,
              display: "none" }} className="pdb-arrow-l">‹</button>
          <button onClick={() => scrollCarousel(1)} aria-label="Siguiente"
            style={{ position: "absolute", right: -36, top: "38%", transform: "translateY(-50%)", width: 36,
              border: "none", background: "none", color: theme.text, opacity: 0.6, textShadow: "0 0 6px rgba(255,255,255,0.5), 0 0 6px rgba(0,0,0,0.5)", fontSize: 44, lineHeight: 1, cursor: "pointer", zIndex: 2,
              display: "none" }} className="pdb-arrow-r">›</button>
          <style>{`@media(min-width:640px){.pdb-arrow-l,.pdb-arrow-r{display:flex!important;align-items:center;justify-content:center}}
/* Las flechas viven FUERA del carrusel, en el margen. Pero margen hay solo si la
   pantalla es mas ancha que el contenido (1200) mas sus 24 de aire a cada lado
   mas los 36 que mide la flecha: 1320. Debajo de eso quedaban colgadas fuera de
   la pantalla y empujaban la pagina entera — 12px de desplazamiento horizontal
   medidos en 768, en todos los templates. Abajo de 1320 se meten adentro. */
@media(max-width:1319px){.pdb-arrow-l{left:0!important}.pdb-arrow-r{right:0!important}}`}</style>
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
        <div style={{ position: "fixed", inset: 0, zIndex: CAPAS.panel, background: "rgba(10,10,10,0.92)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}
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
  const { slug, storeName, socialLinks, isPreview, footerBg, legales, tipoTienda } = view;
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
        {linksLegales(slug, legales, { tipoTienda, enEditor: isPreview }).map(({ clave, label, href }) => (
          <a key={clave} href={href} style={{ fontSize: 10, color: fg, opacity: 0.55, textDecoration: "none" }}>{label}</a>
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
  const { cart, isPreview, isOwner, whatsapp, slug } = view;
  const { favorites, favoritesOpen, setFavoritesOpen, favoriteProducts, toggleFavorite, toastMsg } = cart;
  const cartTheme = detailCartTheme(theme);
  const whatsappConfig = whatsapp ? { enabled: true, number: whatsapp } : undefined;

  return (
    <>
      <CartDrawer cart={cart} theme={cartTheme} isOwner={isOwner} isPreview={isPreview} whatsapp={whatsappConfig} />
      <CheckoutModal cart={cart} theme={cartTheme} isPreview={isPreview} storeSlug={slug} />

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
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: theme.text, color: theme.pageBg, padding: "12px 20px", fontSize: 13, fontWeight: 600, zIndex: CAPAS.sobrePanel, boxShadow: "0 4px 20px rgba(0,0,0,0.35)", maxWidth:"calc(100vw - 32px)", textAlign:"center" }}>
          {toastMsg}
        </div>
      )}
    </>
  );
}
