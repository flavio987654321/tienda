// Registro de aplicaciones disponibles en /dashboard/aplicaciones.
// Es un array estático (no una tabla en la base de datos): cada app hoy es
// interna y su estado de "instalada" ya se puede derivar de datos que
// existen en Store, así que no hace falta persistir nada nuevo todavía.
// `provider` queda preparado para el día que se sumen apps de desarrolladores
// externos, sin que eso implique construir esa sección ahora.

export type AppCategory = "ventas" | "analitica" | "marketing";

/** Íconos permitidos en `usage`. Son nombres y no componentes para que el
    registro siga siendo un módulo de datos, sin importar nada de React. */
export type UsageIcon = "auto" | "etiqueta" | "tienda" | "anuncio" | "chat" | "carrito" | "ia";

export type AppDefinition = {
  id: string;
  name: string;
  /** Explicación completa en lenguaje simple — se muestra en la tarjeta de la vidriera, no solo en la ficha. */
  description: string;
  /** 2-4 resultados concretos, cortos, sin jerga técnica. */
  benefits: string[];
  category: AppCategory;
  price: "gratis" | "pago";
  provider: "interno" | "externo";
  /** Marca dueña del servicio, se muestra como "Proporcionado por X". */
  providerName: string;
  /** Visible en la vidriera pero sin botón de instalar todavía — se muestra "Próximamente". */
  comingSoon?: boolean;

  /* ── Contenido largo de la ficha ────────────────────────────────────────────
     Todo lo de abajo es opcional: una app sin estos campos igual se ve bien,
     solo muestra menos secciones. Se completa a medida que cada integración
     está de verdad terminada, así no prometemos en pantalla algo que todavía
     no funciona. */

  /** Frase de una línea bajo el nombre en la ficha. Beneficio, no descripción. */
  tagline?: string;
  /** "Para qué sirve", en párrafos. Escrito para alguien que nunca oyó hablar del tema. */
  about?: string[];
  /** Cómo se usa DESPUÉS de instalarla — lo que hace el dueño, no lo que hace el
      sistema. Van con ícono y no numeradas a propósito: no son pasos en orden,
      son cosas distintas que se desbloquean, y numerarlas hacía creer que había
      que hacerlas una atrás de la otra. */
  usage?: { icon: UsageIcon; title: string; text: string }[];
  /** Qué tiene que tener listo antes de tocar Instalar. Si el requisito se
      resuelve en otro lado (crear un portfolio en Meta, por ejemplo), va con
      `link`: el texto prometía "te dejamos el link" y no había ningún link. */
  requirements?: { text: string; link?: { label: string; href: string } }[];
  /** Dudas reales que frenan a alguien no técnico. */
  faq?: { q: string; a: string }[];
  /** Renderiza la maqueta de "así se va a ver" en la ficha. */
  preview?: "meta-catalogo" | "whatsapp-catalogo";
};

/* Color de marca de cada app. Son clases completas (no interpoladas) para que
   el scanner de Tailwind las encuentre — `from-${x}` no se compila. */
const APP_ACCENT: Record<string, { band: string; chip: string; ring: string }> = {
  "meta-catalogo":    { band: "from-[#1877F2] via-[#C837AB] to-[#FF543E]", chip: "bg-indigo-50 text-indigo-700 border-indigo-200", ring: "group-hover:ring-indigo-200" },
  "google-analytics": { band: "from-[#F9AB00] to-[#E37400]",               chip: "bg-amber-50 text-amber-700 border-amber-200",    ring: "group-hover:ring-amber-200" },
  "facebook-pixel":   { band: "from-[#1877F2] to-[#0866FF]",               chip: "bg-blue-50 text-blue-700 border-blue-200",       ring: "group-hover:ring-blue-200" },
  "google-shopping":  { band: "from-[#4285F4] via-[#34A853] to-[#FBBC05]", chip: "bg-sky-50 text-sky-700 border-sky-200",          ring: "group-hover:ring-sky-200" },
  "whatsapp-catalogo":{ band: "from-[#25D366] to-[#128C7E]",               chip: "bg-emerald-50 text-emerald-700 border-emerald-200", ring: "group-hover:ring-emerald-200" },
};

const DEFAULT_ACCENT = { band: "from-slate-700 to-slate-900", chip: "bg-slate-50 text-slate-700 border-slate-200", ring: "group-hover:ring-slate-200" };

export function getAccent(id: string) {
  return APP_ACCENT[id] ?? DEFAULT_ACCENT;
}

export const CATEGORY_LABELS: Record<AppCategory, string> = {
  ventas: "Ventas",
  analitica: "Analítica",
  marketing: "Marketing",
};

export const APPS_REGISTRY: AppDefinition[] = [
  {
    id: "meta-catalogo",
    name: "Catálogo de Meta",
    description:
      "Conecta automáticamente todos tus productos a Facebook e Instagram, para que tus clientes los vean y los compren sin salir de esas apps.",
    benefits: [
      "Tus productos aparecen en la pestaña Tienda de tu Facebook",
      "Podés etiquetar productos en tus posts e historias de Instagram",
      "Se actualiza solo: si cambiás un precio o se agota el stock, se ve reflejado",
    ],
    category: "ventas",
    price: "gratis",
    provider: "interno",
    providerName: "Meta",
    tagline: "Que tus productos aparezcan en Facebook e Instagram, solos y actualizados todos los días.",
    preview: "meta-catalogo",
    about: [
      "Un catálogo de Meta es la lista de tus productos guardada adentro de Facebook. No es tu tienda: es una copia de tus productos que vive en Meta, con la foto, el nombre y el precio de cada uno.",
      "Sirve porque Facebook e Instagram solo pueden mostrar productos que estén en un catálogo. Sin catálogo no podés etiquetar un producto en una historia, no te aparece la pestaña Tienda en tu página, y tus anuncios no pueden mostrar precios.",
      "Armarlo a mano significa cargar cada producto de nuevo en Commerce Manager, uno por uno, y volver a corregirlos cada vez que cambiás un precio. Esta app hace ese trabajo sola: toma los productos que ya cargaste acá y se los manda a Meta todos los días.",
    ],
    usage: [
      {
        icon: "auto",
        title: "No tenés que hacer nada más",
        text: "Una vez instalada, trabaja sola. Todos los días a la mañana Meta lee tu catálogo y se actualiza. Si subís un producto nuevo, cambiás un precio o se te agota algo, al otro día ya está reflejado en Facebook e Instagram.",
      },
      {
        icon: "etiqueta",
        title: "Etiquetar productos en Instagram",
        text: "Cuando subís una foto o una historia, te aparece la opción de etiquetar productos. Tocás la prenda en la foto, elegís cuál es de tu catálogo, y quien la vea puede tocar la etiqueta y llegar directo a comprarla.",
      },
      {
        icon: "tienda",
        title: "La pestaña Tienda de tu página",
        text: "En tu página de Facebook aparece una solapa nueva con todos tus productos. Tus clientes los ven ahí adentro, con foto y precio, sin tener que salir de la app.",
      },
      {
        icon: "anuncio",
        title: "Anuncios con producto",
        text: "Si más adelante hacés publicidad paga, vas a poder armar anuncios que muestran productos puntuales con su precio, en vez de una sola imagen suelta.",
      },
    ],
    requirements: [
      {
        text: "Una cuenta de Facebook que administre tu negocio. La personal tuya sirve, siempre que sea la que maneja la página.",
      },
      {
        text: "Un portfolio comercial en Meta Business: es la cuenta gratuita donde Meta guarda tu negocio, tus catálogos y tus anuncios. Si no tenés uno, el paso 2 no va a encontrar nada y el wizard se traba ahí. Crealo antes, tarda dos minutos.",
        link: { label: "Crear mi portfolio comercial", href: "https://business.facebook.com/overview" },
      },
      {
        text: "Ser administradora del portfolio, no solo tener acceso. Si alguien más lo creó y te dio permisos limitados, Meta no nos deja ver los catálogos.",
        link: { label: "Revisar mis permisos en Meta", href: "https://business.facebook.com/settings/people" },
      },
      {
        text: "Al menos un producto cargado con foto: Meta rechaza los productos sin imagen.",
      },
    ],
    faq: [
      {
        q: "¿Le doy acceso a Meta a mi tienda?",
        a: "No. El acceso va al revés: nosotros le mandamos a Meta la lista de tus productos. Meta no entra a tu panel, no ve tus ventas, ni tus clientes, ni tus datos de cobro.",
      },
      {
        q: "¿Cuánto tarda en aparecer?",
        a: "El catálogo se crea al instante, pero Meta tarda entre unas horas y un día en procesar los productos la primera vez. Después se actualiza todos los días a la mañana.",
      },
      {
        q: "¿Y si tengo productos que no quiero mostrar?",
        a: "Los productos pausados y los que marcaste como solo mayorista no se envían. Tampoco los que no tienen foto.",
      },
      {
        q: "¿Puedo desinstalarla?",
        a: "Sí, cuando quieras y sin costo. Se corta la sincronización y tu catálogo queda como estaba en Meta, sin actualizarse más. Nada de tu tienda se borra.",
      },
      {
        q: "¿Para vender tengo que hacer algo más?",
        a: "Según tu país, Meta puede pedirte completar datos fiscales para habilitar el pago dentro de Facebook. Igual, aunque no lo completes, tus productos se muestran y el botón lleva a tu tienda para terminar la compra acá.",
      },
    ],
  },
  {
    id: "google-analytics",
    name: "Google Analytics",
    description:
      "Te muestra, con datos reales de Google, cuánta gente visita tu tienda, qué productos miran más y por dónde te encuentran.",
    benefits: [
      "Sabés cuántas visitas tenés por día",
      "Vés si tus clientes llegan por Instagram, WhatsApp, Google u otro lado",
      "Detectás qué productos generan más interés",
    ],
    category: "analitica",
    price: "gratis",
    provider: "interno",
    providerName: "Google",
  },
  {
    id: "facebook-pixel",
    name: "Meta Pixel",
    description:
      "Si hacés publicidad paga en Facebook o Instagram, esto le enseña a Meta qué tipo de personas terminan comprando en tu tienda, para mostrarles el anuncio a más gente parecida.",
    benefits: [
      "Tus anuncios rinden más con la misma plata invertida",
      "Podés mostrarle un anuncio a alguien que miró un producto y no compró",
      "Sin esto, Meta no tiene forma de saber si tus anuncios generan ventas",
    ],
    category: "marketing",
    price: "gratis",
    provider: "interno",
    providerName: "Meta",
  },
  {
    id: "google-shopping",
    name: "Google Shopping",
    description:
      "Mostrá tus productos gratis en la búsqueda de Google y en la pestaña Shopping, para que te encuentren clientes nuevos que ni sabían que existías.",
    benefits: [
      "Tus productos aparecen en Google sin pagar publicidad",
      "Se actualiza solo: si cambiás un precio o se agota el stock, se ve reflejado",
      "Funciona parecido al catálogo de Meta, pero del lado de Google",
    ],
    category: "ventas",
    price: "gratis",
    provider: "interno",
    providerName: "Google",
  },
  {
    id: "whatsapp-catalogo",
    name: "Catálogo en WhatsApp",
    description:
      "Mostrá tu catálogo de productos directo en tu WhatsApp Business, y activá gratis la inteligencia artificial de Meta para que les conteste a tus clientes sola, las 24 horas.",
    benefits: [
      "Tus clientes ven tus productos, precios y fotos sin salir de WhatsApp",
      "Se actualiza solo, es el mismo catálogo que usan Facebook e Instagram",
      "Podés activar gratis la IA de Meta para que responda consultas automáticamente",
    ],
    category: "ventas",
    price: "gratis",
    provider: "interno",
    providerName: "Meta",
    tagline: "Que tus clientes vean tus productos sin salir del chat, con el mismo catálogo que ya usás en Facebook e Instagram.",
    preview: "whatsapp-catalogo",
    about: [
      "Un catálogo en WhatsApp es tu vidriera adentro de la app. Cuando alguien te escribe, en vez de mandarle fotos sueltas y escribirle el precio a mano, toca el ícono de la tienda en tu perfil y ve todos tus productos con foto, nombre y precio.",
      "Es el mismo catálogo que esta plataforma ya le manda a Meta para Facebook e Instagram: no es una lista aparte que tengas que cargar de nuevo. Si cambiás un precio o se te agota algo acá, al otro día se ve reflejado en los tres lados a la vez.",
      "El último paso —decirle a Meta cuál de tus catálogos va en WhatsApp— lo hacés vos, una sola vez, desde el panel de Meta. No lo podemos hacer nosotros: Meta reserva ese permiso para las empresas que envían mensajes por WhatsApp, y nosotros no enviamos mensajes. Abajo te dejamos los lugares donde se hace.",
    ],
    usage: [
      {
        icon: "chat",
        title: "Tu vidriera dentro del chat",
        text: "En tu perfil de WhatsApp Business aparece un ícono de tienda. Quien te escriba puede tocarlo y recorrer tus productos ahí mismo, sin que vos le mandes nada.",
      },
      {
        icon: "carrito",
        title: "Te piden sin escribir",
        text: "Tu cliente elige los productos que quiere, arma el pedido y te lo manda como un mensaje con todo detallado. Se terminan los “cuánto sale el segundo de la foto”.",
      },
      {
        icon: "auto",
        title: "Se actualiza solo",
        text: "Es el mismo catálogo de Facebook e Instagram. Subís un producto acá y aparece en los tres lados. No hay que cargar nada dos veces ni acordarse de corregir precios en WhatsApp.",
      },
      {
        icon: "ia",
        title: "La IA de Meta, gratis",
        text: "Con el catálogo vinculado podés activar el asistente de Meta, que le contesta a tus clientes las 24 horas usando tus productos. Se activa desde la app de WhatsApp Business y no te cobra nada.",
      },
    ],
    requirements: [
      {
        text: "Tener instalada la app Catálogo de Meta acá. Es la que arma el catálogo y lo mantiene actualizado — sin eso no hay nada que vincular a WhatsApp.",
        link: { label: "Ir a Catálogo de Meta", href: "/dashboard/aplicaciones/meta-catalogo" },
      },
      {
        text: "La app WhatsApp Business en tu celular (la verde con la valijita, no el WhatsApp común). Es gratis y tu número puede ser el mismo que ya usás.",
        link: { label: "Descargar WhatsApp Business", href: "https://business.whatsapp.com/products/business-app" },
      },
      {
        text: "Tu WhatsApp Business vinculado a tu portfolio comercial de Meta. Es lo que hace que Meta sepa que ese número y ese catálogo son del mismo negocio. Se hace una vez, desde Meta Business Suite.",
        link: { label: "Abrir Meta Business Suite", href: "https://business.facebook.com/latest/settings/whatsapp_account" },
      },
    ],
    faq: [
      {
        q: "¿Por qué este último paso lo tengo que hacer yo?",
        a: "Porque Meta le da ese permiso solo a las empresas que mandan mensajes por WhatsApp: los chatbots, los sistemas de atención al cliente. Nosotros no mandamos mensajes, armamos tu catálogo. Podríamos pedirlo igual y esperar meses una respuesta que probablemente sea que no, o dejarte los cuatro clics acá y que lo tengas funcionando hoy. Elegimos lo segundo.",
      },
      {
        q: "¿Tengo que cargar mis productos de nuevo en WhatsApp?",
        a: "No, y ese es el punto. WhatsApp va a mostrar el mismo catálogo que ya te armamos para Facebook e Instagram. Vos cargás los productos una sola vez, acá.",
      },
      {
        q: "¿Pierdo mi WhatsApp normal?",
        a: "No. WhatsApp Business es una app aparte y podés usar el mismo número. Tus chats se pasan cuando la instalás y seguís hablando con todo el mundo igual.",
      },
      {
        q: "¿Mis clientes pagan por WhatsApp?",
        a: "No. Arman el pedido y te lo mandan como mensaje, y vos cerrás la venta como siempre. Si querés que paguen online, el link de tu tienda sigue siendo el camino.",
      },
      {
        q: "¿Puedo deshacerlo?",
        a: "Sí, desde el mismo lugar de Meta donde lo vinculaste. Sacás el catálogo de tu cuenta de WhatsApp y listo. Tus productos no se borran de ningún lado.",
      },
    ],
  },
];

export function getApp(id: string): AppDefinition | undefined {
  return APPS_REGISTRY.find((a) => a.id === id);
}
