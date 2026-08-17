import {
  TrendingUp, ShoppingBag, MessageCircle, Package, Tag, BadgePercent, ShoppingCart,
  Users, Star, Bell, Store, Settings, LayoutGrid, Wallet, BarChart2, CreditCard,
  Eye, ArrowRight, MousePointerClick, SlidersHorizontal, Save, ExternalLink,
} from "lucide-react";

export type Texto = { title: string; body: string };
export type Paso = Texto & {
  icon: React.ElementType;
  /** Variante del texto según el rubro de la tienda (`Store.tipoTienda`). */
  porTipo?: Record<string, Texto>;
};
export type Guion = Record<string, Paso>;

/* Los guiones se indexan por el `data-tour` que lleva el elemento a señalar.
   Ningún guion decide qué pasos se muestran: eso lo resuelve el motor mirando
   qué elementos existen en pantalla, así que un paso cuyo botón no está —
   porque el rubro lo esconde o porque todavía no aplica— se saltea solo. */

/* ── Panel: el menú lateral ──────────────────────────────────────────────
   Va en el orden del menú y no en el de esta lista (`orden="dom"`): así el
   resaltado baja derecho en vez de saltar, y si mañana se reordena el menú el
   tour lo sigue sin que nadie toque esto. */
export const TOUR_PANEL_KEY = "tiendaapps_tour_done";

export const GUION_PANEL: Guion = {
  inicio: {
    icon: TrendingUp,
    title: "Panel principal",
    body: "El resumen de tu tienda: ventas, pedidos, afiliados y la guía de configuración inicial.",
    porTipo: {
      AUTOS: {
        title: "Panel principal",
        body: "El resumen de tu concesionaria: consultas recibidas, vehículos disponibles y la guía de configuración inicial.",
      },
    },
  },
  pedidos: {
    icon: ShoppingBag,
    title: "Pedidos",
    body: "Cuando un cliente compra, el pedido aparece acá. Lo confirmás, lo marcás como enviado y después como entregado.",
  },
  consultas: {
    icon: MessageCircle,
    title: "Consultas de clientes",
    body: "Cuando alguien completa el formulario de contacto, la consulta llega acá. Podés responderle por WhatsApp desde el panel.",
  },
  productos: {
    icon: Package,
    title: "Tus productos",
    body: "Agregá, editá o importá productos desde un CSV. Con uno solo ya podés compartir tu tienda.",
    porTipo: {
      AUTOS: {
        title: "Tus vehículos",
        body: "Cargá autos, motos o camionetas con fotos, precio, ficha técnica y estado: Disponible, Reservado o Vendido.",
      },
    },
  },
  cupones: {
    icon: Tag,
    title: "Cupones de descuento",
    body: "Códigos de descuento para tus clientes: monto fijo o porcentaje, con límite de usos y fecha de vencimiento.",
  },
  promociones: {
    icon: BadgePercent,
    title: "Promociones",
    body: "Ofertas que se aplican solas en el carrito, sin que el cliente tenga que escribir ningún código: 2x1, descuentos por cantidad o por monto de compra.",
  },
  "carritos-abandonados": {
    icon: ShoppingCart,
    title: "Carritos abandonados",
    body: "Cuando alguien carga productos pero no termina de comprar, queda registrado acá. Podés mandarle un recordatorio automático por email.",
  },
  afiliados: {
    icon: Users,
    title: "Afiliados",
    body: "Invitá vendedores que promocionen tu tienda y cobrá por cada venta que generen. Necesita MercadoPago conectado: las comisiones se acreditan solas.",
    porTipo: {
      AUTOS: {
        title: "Afiliados",
        body: "Invitá vendedores externos que te traigan clientes. Vos definís la comisión por venta concretada y se acredita sola cuando confirmás la consulta.",
      },
    },
  },
  resenas: {
    icon: Star,
    title: "Reseñas",
    body: "Las opiniones que dejan tus compradores. Vos decidís cuáles se publican en la tienda y podés responderlas.",
  },
  notificaciones: {
    icon: Bell,
    title: "Notificaciones push",
    body: "Mensajes directos a las personas que activaron notificaciones en tu tienda. Disponible en plan Premium.",
    porTipo: {
      AUTOS: {
        title: "Notificaciones push",
        body: "Novedades o alertas de vehículos nuevos para quienes activaron notificaciones en tu sitio. Disponible en plan Premium.",
      },
    },
  },
  diseno: {
    icon: Store,
    title: "Diseño de tu tienda",
    body: "Elegí una plantilla y personalizá colores, imágenes y textos para que tu tienda no se parezca a ninguna otra.",
    porTipo: {
      AUTOS: {
        title: "Diseño de tu sitio",
        body: "Elegí plantilla y personalizá colores, banners y textos para mostrar tu flota de manera profesional.",
      },
    },
  },
  aplicaciones: {
    icon: LayoutGrid,
    title: "Aplicaciones",
    body: "Conectá tu tienda con otras herramientas, como el catálogo de Facebook y WhatsApp.",
  },
  configuracion: {
    icon: Settings,
    title: "Configuración",
    body: "Todo lo que no es el diseño: tu logo, la dirección web, el WhatsApp, tus redes, la moneda y cómo aparecés en Google. Está dividida en secciones, con un buscador arriba.",
  },
  pagos: {
    icon: Wallet,
    title: "Pagos y envíos",
    body: "Cómo cobrás (CBU, alias o efectivo) y tus opciones de envío, con precio fijo o a coordinar. El cliente ve todo esto al finalizar la compra.",
    porTipo: {
      AUTOS: {
        title: "Legal y políticas",
        body: "Tus términos y condiciones y la política de devoluciones. Tus clientes las abren desde el pie de página del sitio.",
      },
    },
  },
  metricas: {
    icon: BarChart2,
    title: "Estadísticas",
    body: "Cuánta gente entra, qué mira y qué compra. Sirve para saber qué productos empujar y en qué días te va mejor.",
    porTipo: {
      AUTOS: {
        title: "Estadísticas",
        body: "Cuánta gente entra, qué vehículos mira y de dónde llegan las consultas. Sirve para saber qué publicar y cuándo.",
      },
    },
  },
  "mi-plan": {
    icon: CreditCard,
    title: "Mi plan",
    body: "Tu plan actual y qué te habilita. Acá lo cambiás cuando necesites dominio propio, notificaciones push o más productos.",
  },
};

/* ── Diseños, paso 2: mirando una plantilla ──────────────────────────────
   Una bienvenida de tres pasos que termina empujando al botón que lleva al
   editor. Va en el orden de esta lista y no en el del DOM (`orden="guion"`),
   porque la barra tiene los botones a los costados y la vista previa abajo:
   leído del DOM el tour arrancaría por "volver" en vez de por lo que se ve. */
export const TOUR_PREVIEW_KEY = "tiendaapps_tour_diseno_preview";

export const GUION_PREVIEW: Guion = {
  "pv-lienzo": {
    icon: Eye,
    title: "Así se va a ver tu tienda",
    body: "Es una vista previa de verdad, con este diseño aplicado. Movete por ella como lo haría un cliente para ver si te gusta.",
  },
  "pv-volver": {
    icon: LayoutGrid,
    title: "Probá los que quieras",
    body: "Volvé a la galería y abrí otro diseño las veces que haga falta. Mirar no cambia nada: tu tienda sigue como está hasta que elijas uno.",
  },
  "pv-usar": {
    icon: ArrowRight,
    title: "Cuando te decidas, entrás a editarlo",
    body: "Con este botón pasás al editor, donde vas a poder cambiarle los textos, las fotos y los colores. Tampoco ahí se publica nada hasta que guardes.",
  },
};

/* ── Diseños, paso 3: el editor ──────────────────────────────────────────
   El tour que más falta hacía: la pantalla no explica sola que la vista previa
   se toca ni que hay ajustes que solo viven en el modal de la ⚙. */
export const TOUR_EDITOR_KEY = "tiendaapps_tour_diseno_editor";

export const GUION_EDITOR: Guion = {
  "ed-lienzo": {
    icon: MousePointerClick,
    title: "Todo esto se edita tocándolo",
    body: "No es una foto: hacé clic en cualquier título, texto o imagen de la página y se abre el editor de ese elemento. Desde ahí también cambiás el color de cada sección, y podés ocultarlas o cambiarles el orden.",
  },
  "ed-avanzada": {
    icon: SlidersHorizontal,
    title: "Configuración avanzada",
    body: "Lo visual que no se toca haciendo clic en la página: el color de acento, la barra de avisos de arriba, la velocidad del carrusel y el flyer. Se guarda con \"Guardar y cerrar\". Tu WhatsApp, tus redes, la moneda y el SEO ya no están acá — se configuran en Configuración.",
  },
  "ed-guardar": {
    icon: Save,
    title: "Nada se publica hasta acá",
    body: "Podés probar todo lo que quieras: tu tienda sigue como está hasta que apretás este botón. Si te vas sin guardar, te avisamos antes de salir.",
  },
  "ed-ver": {
    icon: ExternalLink,
    title: "Mirala como un cliente",
    body: "Abre tu tienda publicada en otra pestaña, tal cual la ve alguien que entra de afuera. Acordate de guardar antes, si no vas a ver la versión anterior.",
  },
  "ed-cambiar": {
    icon: LayoutGrid,
    title: "¿Te arrepentiste del diseño?",
    body: "Volvés a la galería y elegís otro. Los textos y las fotos que cargaste se mantienen, así que probar un diseño distinto no te hace empezar de cero.",
  },
};
