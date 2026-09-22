/**
 * Lo que Sasha sabe de Productos Digitales, en dos capas:
 *
 *   1. LO BÁSICO — va en CADA mensaje. Es lo que una persona que recién llega
 *      necesita para entender el negocio: qué es un producto digital, qué es
 *      un ebook, el embudo, cómo se cobra y cómo se entrega. Corto a
 *      propósito (~700 tokens): se paga en cada mensaje.
 *
 *   2. LOS ARTÍCULOS — se BUSCAN por la pregunta y van sólo los que pegan
 *      (dos como mucho). Meterlos todos en cada mensaje sería pagar la
 *      enciclopedia entera para contestar "¿cómo subo el PDF?".
 *
 * Todo lo de acá es texto nuestro. Sasha tiene prohibido inventar lo que no
 * está en estas capas ni en los datos de la cuenta; si no está, dice que no
 * sabe y manda a escribirnos.
 */

export const LO_BASICO = `QUÉ ES PRODUCTOS DIGITALES
Es la parte de TiendaApps para vender cosas que se entregan como archivo o acceso: ebooks (PDF), guías, plantillas, recetarios, cursos en PDF. No hay stock ni envío: la persona paga y recibe un link para bajar el archivo al instante. Se vende una vez y se entrega mil veces.

QUÉ ES UN EBOOK
Un libro digital: un PDF con lo que la persona sabe, escrito para que otro lo lea y le sirva (una guía de 30 páginas para arrancar a correr, un recetario sin gluten, una plantilla de presupuesto). Lo hace ella en Word, Canva o Google Docs y lo exporta como PDF, o lo escribe con la IA del panel (Starter y Pro) y lo revisa.

EL EMBUDO: PRINCIPAL, BONO Y UPSELL
- PRINCIPAL: el producto que se vende, con su página de venta y su precio.
- BONO: un regalo que va CON el principal para que la compra sea más fácil de decidir ("comprás la guía y te llevás la planilla de regalo"). No se vende solo.
- UPSELL: una segunda oferta que aparece justo después de pagar, en la pantalla de gracias, con un botón de un clic ("¿querés también el curso avanzado, con 30% menos?"). Es la venta más barata que existe: la persona ya confió y ya tiene la tarjeta en la mano.
Un embudo es esas tres piezas juntas. Vender un solo PDF también vale: el bono y el upsell se agregan después.

LA PÁGINA DE VENTA
Cada principal tiene su página: título, para quién es, qué trae, precio, botón de comprar, opiniones, preguntas frecuentes. Se arma con la IA (le contás de qué es y la escribe) y se edita sección por sección. Tiene una dirección propia para compartir por WhatsApp, Instagram o anuncios.

CÓMO COBRA Y CÓMO ENTREGA
Los pagos entran por Mercado Pago, a la cuenta de Mercado Pago de la vendedora (hay que conectarla una vez, desde Configuración → Pagos). TiendaApps cobra una comisión por venta. Cuando el pago se acredita, la persona recibe por mail un link de descarga que es sólo suyo, dura 30 días y sirve para 5 bajadas; la vendedora no tiene que hacer nada.

CARRITOS, CLIENTES Y OPINIONES
- Carrito abandonado: alguien llegó al pago y no pagó. Se ve en Carritos; en Pro se le manda solo un mail al día siguiente para recuperarlo.
- Clientes: la gente que pagó, con cuántas veces compró y si bajó su archivo. Desde ahí se le pide una opinión.
- Opinión verificada: sólo la puede escribir quien pagó, desde un link de su compra. La vendedora la publica o la esconde, nunca la edita. Sale en la página con la marca "Compra verificada".`;

export type Articulo = {
  slug: string;
  titulo: string;
  /** Palabras (sin acentos, en minúscula) por las que se encuentra. */
  palabras: string[];
  texto: string;
};

export const ARTICULOS: Articulo[] = [
  {
    slug: "primer-producto",
    titulo: "Por dónde empezar",
    palabras: ["empezar", "empiezo", "arrancar", "arranco", "primer", "primero", "nuevo", "nueva", "no se", "que hago", "pasos", "comienzo"],
    texto: `El orden que funciona: 1) Conectar Mercado Pago (Configuración → Pagos): sin eso nadie puede comprarte. 2) Crear el principal en Productos: nombre, precio y el PDF. 3) Armar la página de venta con la IA y leerla entera. 4) Publicar. 5) Compartir la dirección de la página. Los bonos, el upsell y los mails se agregan después de la primera venta, no antes.`,
  },
  {
    slug: "tema-del-ebook",
    titulo: "Qué ebook hacer",
    palabras: ["tema", "idea", "ideas", "sobre que", "de que", "que vendo", "que puedo vender", "nicho", "escribir", "contenido"],
    texto: `Un ebook que se vende resuelve UN problema concreto para UNA persona concreta: "recetas sin gluten para la semana" vende; "cocina saludable" no. Preguntas que ayudan: ¿qué te preguntan siempre? ¿qué sabés hacer que a otros les cuesta? ¿qué te hubiera gustado leer cuando empezaste? Entre 20 y 60 páginas alcanza: se paga por el resultado, no por el peso.`,
  },
  {
    slug: "precio",
    titulo: "Cuánto cobrar",
    palabras: ["precio", "cobrar", "cuanto", "vale", "caro", "barato", "pesos", "cobro"],
    texto: `Para un primer ebook en Argentina, entre $5.000 y $25.000 es lo común; una guía muy específica o con plantillas puede ir más arriba. Regla: el precio lo pone el problema que resuelve, no la cantidad de páginas. Arrancá con un precio que te parezca justo y probá: cambiarlo es un clic. El precio de bienvenida (Starter y Pro) muestra un descuento con reloj real a quien entra por primera vez.`,
  },
  {
    slug: "subir-pdf",
    titulo: "Subir el archivo",
    palabras: ["subir", "subo", "archivo", "pdf", "cargar", "cargo", "adjuntar", "peso", "mb", "formato"],
    texto: `En Productos, en la tarjeta del producto, "Subir PDF". Sólo PDF, hasta 50 MB; si pesa más, volvé a exportarlo en calidad para pantalla y baja muchísimo. Sube directo desde tu navegador, sin pasar por el panel. Se puede cambiar después: quien ya compró baja siempre la versión actual. Si la IA te escribió el ebook, el PDF se arma solo y queda cargado.`,
  },
  {
    slug: "pagina-de-venta",
    titulo: "La página de venta",
    palabras: ["pagina", "landing", "editar", "secciones", "titulo", "texto", "diseno", "colores", "armar la pagina", "ia"],
    texto: `Se arma desde Productos → la tarjeta → "Página". Con la IA: le contás de qué es el producto y para quién, y escribe todas las secciones; después se edita cada una (prender, apagar, cambiar texto y orden). Lo que más vende: el título dice el resultado ("Corré 5 km en 8 semanas"), la sección "para quién es" nombra a la persona, y hay un precio claro con un solo botón. La vista previa muestra cómo queda en celular, que es donde la ve casi todo el mundo.`,
  },
  {
    slug: "mercado-pago",
    titulo: "Conectar Mercado Pago",
    palabras: ["mercado pago", "mercadopago", "mp", "conectar", "cobrar", "pagos", "cuenta", "comision", "plata", "cuando cobro", "transferencia"],
    texto: `Configuración → Pagos → "Conectar Mercado Pago". Te lleva a Mercado Pago, autorizás, y volvés al panel conectada. La plata de cada venta entra en TU cuenta de Mercado Pago (no en TiendaApps), con la comisión de TiendaApps ya descontada. Se puede desconectar cuando quieras. No hay transferencia ni efectivo: sólo Mercado Pago, que es lo que permite entregar el archivo al instante.`,
  },
  {
    slug: "entrega",
    titulo: "Cómo recibe el comprador",
    palabras: ["entrega", "entregar", "descarga", "descargar", "bajar", "link", "mail de entrega", "no le llego", "vence", "token", "recibe"],
    texto: `Cuando Mercado Pago acredita el pago, el comprador recibe un mail con un link de descarga que es sólo suyo: dura 30 días y permite bajar el archivo hasta 5 veces (para el celular, la computadora, o si lo perdió). Si dice que no le llegó: que revise spam, y desde Ventas podés reenviárselo con un clic. En Ventas y en Clientes se ve si ya bajó el archivo. Compartirlo no le sirve a nadie: va atado a esa compra y se agota.`,
  },
  {
    slug: "bono-y-upsell",
    titulo: "Bono y upsell: cómo se usan",
    palabras: ["bono", "bonos", "regalo", "upsell", "upsells", "oferta", "gracias", "segunda oferta", "agregar", "combo"],
    texto: `El bono se crea desde la tarjeta del principal ("Agregar bono"): es otro archivo que va de regalo y se muestra en la página como "y además te llevás…". El upsell también se crea ahí: tiene precio propio y aparece sólo en la pantalla de gracias, después de pagar, con un botón de un clic. Bono bueno: algo rápido de usar (una planilla, una checklist). Upsell bueno: el paso siguiente del mismo tema, a un precio parecido o menor.`,
  },
  {
    slug: "compartir",
    titulo: "Compartir y traer visitas",
    palabras: ["compartir", "link", "direccion", "instagram", "whatsapp", "anuncios", "publicidad", "meta", "facebook", "visitas", "trafico", "utm", "dominio"],
    texto: `Cada producto tiene su dirección propia (Marketing → Enlaces): un link para la bio de Instagram, otro para WhatsApp, otro para anuncios. Cada uno lleva su etiqueta, así en Estadísticas se ve de dónde vino cada venta (Pro). En Pro también podés ponerle un dominio propio a cada producto. Lo que más funciona al principio: contarlo en historias con el link, y mandárselo a la gente que ya te lo pidió.`,
  },
  {
    slug: "carritos",
    titulo: "Carritos abandonados",
    palabras: ["carrito", "carritos", "abandonado", "abandonados", "no pago", "recuperar", "recuperacion"],
    texto: `Alguien llegó al pago y no pagó: queda en Carritos, con su mail. En Pro, al día siguiente le sale solo un mail con el link para terminar la compra (una sola vez, y nunca a quien pidió no recibir más). En los otros planes lo ves y podés escribirle vos. La oferta de salida (Starter y Pro) aparece cuando alguien está por cerrar la página de pago, con un descuento chico.`,
  },
  {
    slug: "estadisticas",
    titulo: "Leer las estadísticas",
    palabras: ["estadisticas", "conversion", "ventas", "visitas", "embudo", "cuanto vendi", "numeros", "mejor producto", "cual vende", "vende mejor", "vende mas", "anda mejor", "funciona mejor", "rinde", "comparar"],
    texto: `Estadísticas muestra cada producto por separado o todos juntos, por período. Ventas y descargas: todos los planes. Visitas y conversión de cada página (cuántos entraron y cuántos compraron): Starter y Pro. Embudo completo, de dónde vienen las visitas y campañas: Pro. Una conversión de 1 a 3 % es normal para tráfico frío; si la página tiene visitas y no vende, el problema es la página o el precio; si no tiene visitas, el problema es compartir más.`,
  },
  {
    slug: "clientes-y-opiniones",
    titulo: "Clientes y opiniones verificadas",
    palabras: ["clientes", "compradores", "opinion", "opiniones", "resena", "resenas", "testimonio", "testimonios", "verificada", "pedir opinion"],
    texto: `Clientes lista a quien te pagó: cuántas veces compró, si bajó su archivo, y filtros como "compraron X y no compraron Y" para ofrecerles el segundo producto. Desde cada cliente se le pide una opinión por mail o WhatsApp con un link que es sólo de su compra. Lo que escribe llega a Clientes → Opiniones, y vos la publicás o la escondés; el texto no se puede editar. Las publicadas salen en la página con "✓ Compra verificada". Starter y Pro pueden bajar la lista (planilla o para Meta Ads).`,
  },
  {
    slug: "mails",
    titulo: "Mails a compradores",
    palabras: ["mail", "mails", "correo", "correos", "newsletter", "campana", "escribirles", "avisar", "lanzamiento", "lanzar"],
    texto: `Marketing → Mail a tus compradores (Pro): un mail a la gente que ya te compró, con filtros por producto ("compraron la guía y no el curso"). Al publicar un producto nuevo, el panel te avisa cuántos clientes no lo tienen y te deja el mail escrito. Cada mail lleva el link para dejar de recibirlos, y a quien lo pidió no se le manda más.`,
  },
  {
    slug: "planes",
    titulo: "Los planes",
    palabras: ["plan", "planes", "free", "starter", "pro", "gratis", "pagar", "suscripcion", "que incluye", "limite", "cupo"],
    texto: `Free: 1 página de venta, 1 bono, la página armada con IA, cupones, ventas y descargas. Starter: más páginas, upsells, ebooks escritos con IA, textos y mails con IA, visitas y conversión, oferta de salida, precio de bienvenida, bajar listas y Sasha. Pro: más de todo, embudo y origen de visitas, mail automático de recuperación, mail a tus compradores y dominio propio por producto. Los números exactos están en Mi cuenta → Plan. Se cambia de plan cuando quieras.`,
  },
  {
    slug: "devoluciones",
    titulo: "Devoluciones y problemas con un pago",
    palabras: ["devolucion", "devolver", "reembolso", "contracargo", "reclamo", "se arrepintio", "cancelar"],
    texto: `Una devolución se hace desde Ventas, en la venta, y la plata vuelve por Mercado Pago. El link de descarga de esa compra deja de servir. Un contracargo es cuando el comprador reclama directo a su tarjeta; Mercado Pago lo resuelve y en Estadísticas queda separado del arrepentimiento. Un archivo que se bajó no se puede "devolver", así que conviene que la página diga bien qué trae.`,
  },
];

/** "¿Cómo subo el PDF?" → "como subo el pdf" */
export function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Los artículos que pegan con la pregunta, de más a menos, dos como mucho.
 * Cuenta cuántas palabras clave aparecen; si ninguna, no manda ninguno y
 * Sasha contesta con lo básico o dice que no sabe.
 */
export function buscarArticulos(pregunta: string, maximo = 2): Articulo[] {
  const q = ` ${normalizar(pregunta)} `;
  if (!q.trim()) return [];
  return ARTICULOS
    .map((a) => ({ a, puntos: a.palabras.filter((p) => q.includes(` ${normalizar(p)} `)).length }))
    .filter((x) => x.puntos > 0)
    .sort((x, y) => y.puntos - x.puntos)
    .slice(0, maximo)
    .map((x) => x.a);
}

/* ── A dónde puede mandar ──────────────────────────────────────────────────
 *
 * Lista blanca, y vive acá —en el saber, que no importa nada del servidor—
 * porque la usan LOS DOS lados: el prompt, para decirle al modelo qué
 * direcciones existen, y la burbuja, para decidir si pinta el botón. En dos
 * archivos se desincronizan, y el síntoma es un botón nuestro que lleva a un
 * 404 porque el modelo escribió una dirección que suena bien.
 */
export const PANTALLAS_DEL_PANEL: Record<string, string> = {
  "/digitales": "Ir al panel",
  "/digitales/productos": "Ir a Productos",
  "/digitales/ventas": "Ir a Ventas",
  "/digitales/clientes": "Ir a Clientes",
  "/digitales/clientes/opiniones": "Ver las opiniones",
  "/digitales/carritos": "Ver los carritos",
  "/digitales/estadisticas": "Ver las estadísticas",
  "/digitales/marketing": "Ir a Marketing",
  "/digitales/marketing/enlaces": "Ver los enlaces",
  "/digitales/marketing/cupones": "Ir a Cupones",
  "/digitales/marketing/compradores": "Escribirles a tus compradores",
  "/digitales/configuracion": "Ir a Configuración",
  "/digitales/mi-cuenta": "Ir a Mi cuenta",
};
