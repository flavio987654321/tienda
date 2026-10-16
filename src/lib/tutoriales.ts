/**
 * Los tutoriales en video de los tres paneles (16/10/26).
 *
 * Flavio los va grabando de a uno y los sube a YouTube como "no listado". La
 * sección se ve desde el primer día, con todos los videos que van a existir:
 * el que todavía no tiene link dice "Próximamente" y se puede tocar igual (avisa
 * que está en camino y lleva a la pantalla que explica). Así la lista sirve
 * también de guion: es lo que falta grabar.
 *
 * ── Para publicar un video ───────────────────────────────────────────────────
 * Pegar el link de YouTube en `video` (sirve el de "Compartir", el de la barra o
 * el de un short). Nada más: la tarjeta deja de decir "Próximamente" sola.
 *
 * Los videos van en YouTube y no en Supabase a propósito: cada reproducción
 * desde Supabase gasta egress, que ya se pasó de cuota una vez (12/10/26).
 *
 * `pantalla` es a dónde lleva "Ir a la pantalla" mientras no hay video; un
 * chequeo verifica que exista. `modo` deja un video sólo para las tiendas de
 * carrito (moda) o sólo para las de consulta (autos): cada panel muestra lo
 * suyo, igual que su menú.
 */
import { getStoreType } from "@/lib/storeTypes";

export type PanelConTutoriales = "tienda" | "afiliado" | "digitales";

export type Tutorial = {
  id: string;
  titulo: string;
  /** Una línea: qué vas a aprender. */
  bajada: string;
  /** El link de YouTube. Sin link, "Próximamente". */
  video?: string | null;
  pantalla?: string;
  modo?: "cart" | "inquiry";
  /** Sólo en los rubros con programa de afiliados. */
  conAfiliados?: boolean;
};

export type SeccionDeTutoriales = {
  id: string;
  titulo: string;
  bajada: string;
  modo?: "cart" | "inquiry";
  tutoriales: Tutorial[];
};

export const TUTORIALES: Record<PanelConTutoriales, SeccionDeTutoriales[]> = {
  tienda: [
    {
      id: "primeros-pasos",
      titulo: "Primeros pasos",
      bajada: "Para arrancar: qué hay en el panel y cómo dejar la tienda lista para vender.",
      tutoriales: [
        { id: "recorrido", titulo: "Recorrido por el panel", bajada: "Qué hay en cada parte del menú y para qué sirve.", pantalla: "/dashboard" },
        { id: "rubro", titulo: "Elegir el rubro de tu tienda", bajada: "Qué cambia según el rubro y por qué conviene elegirlo bien.", pantalla: "/dashboard/productos" },
        { id: "publicar", titulo: "Publicar tu tienda", bajada: "De la vista previa a la tienda abierta al público.", pantalla: "/dashboard/configuracion" },
      ],
    },
    {
      id: "diseno",
      titulo: "Diseño de la tienda",
      bajada: "Cómo se ve tu tienda: el diseño, los textos, las fotos y el orden de los bloques.",
      tutoriales: [
        { id: "elegir-diseno", titulo: "Elegir el diseño", bajada: "Probar los diseños sin perder lo que ya armaste.", pantalla: "/dashboard/configuracion" },
        { id: "textos-fotos", titulo: "Cambiar textos y fotos", bajada: "Tocar cualquier texto o foto de la vista previa y editarlo ahí mismo.", pantalla: "/dashboard/configuracion" },
        { id: "bloques", titulo: "Mover, ocultar y ordenar los bloques", bajada: "Armar la portada con lo que te sirve, también distinto en el celular.", pantalla: "/dashboard/configuracion" },
        { id: "colores", titulo: "Colores y fondos", bajada: "El color de la tienda y el fondo de cada bloque.", pantalla: "/dashboard/configuracion" },
        { id: "cartelera", titulo: "La cartelera y el destacado", bajada: "Los carteles con foto grande y el producto que va primero.", pantalla: "/dashboard/configuracion" },
      ],
    },
    {
      id: "vender-moda",
      titulo: "Productos y ventas",
      bajada: "Cargar lo que vendés y seguir cada pedido.",
      modo: "cart",
      tutoriales: [
        { id: "cargar-producto", titulo: "Cargar un producto", bajada: "Fotos, precio, talles y colores, paso a paso.", pantalla: "/dashboard/productos" },
        { id: "fotos-que-venden", titulo: "Fotos que venden", bajada: "Cómo sacar y ordenar las fotos para que se vean bien en la tienda.", pantalla: "/dashboard/productos" },
        { id: "pedidos", titulo: "Los pedidos, de punta a punta", bajada: "Cómo llega un pedido y cómo llevarlo de pendiente a entregado.", pantalla: "/dashboard/pedidos" },
        { id: "carritos", titulo: "Carritos abandonados", bajada: "Recuperar a quien llenó el carrito y no compró.", pantalla: "/dashboard/carritos-abandonados" },
        { id: "resenas", titulo: "Reseñas", bajada: "Ver y responder lo que opinan tus clientes.", pantalla: "/dashboard/resenas" },
      ],
    },
    {
      id: "vender-autos",
      titulo: "Vehículos y consultas",
      bajada: "Publicar el stock y no perder ninguna consulta.",
      modo: "inquiry",
      tutoriales: [
        { id: "cargar-vehiculo", titulo: "Cargar un vehículo", bajada: "La ficha técnica, las fotos, los papeles y el precio.", pantalla: "/dashboard/productos" },
        { id: "consultas", titulo: "Responder las consultas", bajada: "Dónde llegan, cómo contestarlas y marcar cómo terminó cada una.", pantalla: "/dashboard/consultas" },
        { id: "tasaciones", titulo: "Las tasaciones de usados", bajada: "Ver lo que te ofrecen y mandar tu oferta.", pantalla: "/dashboard/tasaciones" },
        { id: "busquedas", titulo: "Búsquedas: \"Avisame si entra\"", bajada: "Avisarle a quien busca un modelo cuando lo tenés.", pantalla: "/dashboard/busquedas" },
        { id: "stock-ganancia", titulo: "Stock y ganancia", bajada: "Los gastos de cada vehículo y cuánto te deja la venta.", pantalla: "/dashboard/stock" },
        { id: "agencia", titulo: "La página de la agencia", bajada: "Dirección, horarios, equipo, garantía y fotos del salón.", pantalla: "/dashboard/configuracion" },
      ],
    },
    {
      id: "promocionar",
      titulo: "Promocionar",
      bajada: "Traer más gente y que vuelva.",
      tutoriales: [
        { id: "cupones", titulo: "Cupones de descuento", bajada: "Crear un cupón y compartirlo.", pantalla: "/dashboard/cupones", modo: "cart" },
        { id: "promociones", titulo: "Promociones", bajada: "Ofertas por cantidad y precios rebajados.", pantalla: "/dashboard/promociones", modo: "cart" },
        { id: "afiliados", titulo: "Vender con afiliados", bajada: "Sumar gente que venda por vos y pagarle su comisión.", pantalla: "/dashboard/vendedoras", conAfiliados: true },
        { id: "notificaciones", titulo: "Mandar novedades", bajada: "Avisos al celular y por mail a quien sigue tu tienda.", pantalla: "/dashboard/notificaciones" },
      ],
    },
    {
      id: "cuenta",
      titulo: "Tu cuenta",
      bajada: "Cobros, datos de la tienda, números y plan.",
      tutoriales: [
        { id: "cobros", titulo: "Configurar los cobros", bajada: "Conectar tu forma de cobro para recibir la plata.", pantalla: "/dashboard/pagos", modo: "cart" },
        { id: "legal-autos", titulo: "Legal: garantía y condiciones", bajada: "Lo que la agencia tiene que dejar escrito.", pantalla: "/dashboard/pagos", modo: "inquiry" },
        { id: "configuracion", titulo: "Configuración de la tienda", bajada: "Contacto, redes, dominio y seguridad de la cuenta.", pantalla: "/dashboard/ajustes" },
        { id: "estadisticas", titulo: "Leer las estadísticas", bajada: "Cuánta gente entra, de dónde viene y qué mira.", pantalla: "/dashboard/metricas" },
        { id: "plan", titulo: "Tu plan", bajada: "Qué incluye cada plan y cómo cambiarlo.", pantalla: "/dashboard/mi-plan" },
      ],
    },
  ],

  afiliado: [
    {
      id: "primeros-pasos",
      titulo: "Primeros pasos",
      bajada: "Cómo funciona ser afiliado y cómo arrancar.",
      tutoriales: [
        { id: "como-funciona", titulo: "Cómo funciona ser afiliado", bajada: "Vendés productos de otras tiendas y ganás una comisión por cada venta.", pantalla: "/afiliados" },
        { id: "sumarte", titulo: "Sumarte a una tienda", bajada: "Buscar tiendas, pedir sumarte y qué pasa después.", pantalla: "/afiliados/tiendas" },
        { id: "tu-link", titulo: "Tu link de afiliado", bajada: "Qué es, dónde está y por qué cada venta con tu link es tuya.", pantalla: "/afiliados" },
      ],
    },
    {
      id: "vender",
      titulo: "Vender",
      bajada: "Las herramientas para compartir y vender más.",
      tutoriales: [
        { id: "plantillas", titulo: "Plantillas de mensajes", bajada: "Textos listos para WhatsApp e Instagram.", pantalla: "/afiliados/plantillas" },
        { id: "kit", titulo: "Kit de contenido", bajada: "Bajar fotos y textos de cada producto para publicar.", pantalla: "/afiliados/kit" },
        { id: "pedidos", titulo: "Tus pedidos", bajada: "Seguir las ventas que hiciste y en qué estado están.", pantalla: "/afiliados/pedidos" },
      ],
    },
    {
      id: "ganar",
      titulo: "Ganar",
      bajada: "Tus comisiones, premios y cómo vas.",
      tutoriales: [
        { id: "comisiones", titulo: "Tus comisiones", bajada: "Cuándo se confirma una comisión y cómo cobrás.", pantalla: "/afiliados/billetera" },
        { id: "premios-metas", titulo: "Premios y metas", bajada: "Ponerte metas y ganar premios por vender.", pantalla: "/afiliados/premios" },
        { id: "ranking", titulo: "El ranking", bajada: "Cómo se arma y cómo subir.", pantalla: "/afiliados/ranking" },
        { id: "estadisticas", titulo: "Tus estadísticas", bajada: "Cuánta gente entró por tu link y cuántos compraron.", pantalla: "/afiliados/estadisticas" },
        { id: "seguridad", titulo: "Proteger tu cuenta", bajada: "La verificación en dos pasos, en un minuto.", pantalla: "/afiliados/seguridad" },
      ],
    },
  ],

  digitales: [
    {
      id: "primeros-pasos",
      titulo: "Primeros pasos",
      bajada: "Qué hay en el panel y cómo vender tu primer producto.",
      tutoriales: [
        { id: "recorrido", titulo: "Recorrido por el panel", bajada: "Qué hay en cada parte del menú y para qué sirve.", pantalla: "/digitales" },
        { id: "cobros", titulo: "Conectar los cobros", bajada: "Lo primero: sin esto no se puede vender.", pantalla: "/digitales/configuracion" },
        { id: "primer-producto", titulo: "Crear tu primer producto", bajada: "De la idea a la página lista para vender.", pantalla: "/digitales/productos" },
      ],
    },
    {
      id: "productos",
      titulo: "Tus productos",
      bajada: "Armar el producto, su página y lo que se entrega.",
      tutoriales: [
        { id: "con-ia", titulo: "Crear un producto con IA", bajada: "Ebooks, recetarios e infografías hechos con la IA, y cómo retocarlos.", pantalla: "/digitales/productos" },
        { id: "archivo", titulo: "Subir tu propio archivo", bajada: "Qué se puede subir y cómo le llega al comprador.", pantalla: "/digitales/productos" },
        { id: "pagina", titulo: "La página de venta", bajada: "Textos, fotos y el orden de la página que ve el comprador.", pantalla: "/digitales/productos" },
        { id: "bonos", titulo: "Bonos", bajada: "Sumar regalos al producto para que valga más.", pantalla: "/digitales/productos" },
      ],
    },
    {
      id: "ventas",
      titulo: "Ventas y clientes",
      bajada: "Seguir lo que vendés y a quién.",
      tutoriales: [
        { id: "ventas", titulo: "Tus ventas", bajada: "Cada venta, su estado y qué hacer si algo falla.", pantalla: "/digitales/ventas" },
        { id: "clientes", titulo: "Tus clientes", bajada: "Quién te compró y cuánto.", pantalla: "/digitales/clientes" },
        { id: "carritos", titulo: "Carritos", bajada: "Quién empezó a comprar y no terminó, y cómo recuperarlo.", pantalla: "/digitales/carritos" },
        { id: "estadisticas", titulo: "Las estadísticas", bajada: "Visitas, de dónde vienen y cuántas terminan en venta.", pantalla: "/digitales/estadisticas" },
      ],
    },
    {
      id: "marketing",
      titulo: "Marketing",
      bajada: "Las herramientas para vender más, una por una.",
      tutoriales: [
        { id: "enlaces", titulo: "Enlaces para compartir", bajada: "Un link por red para saber de dónde viene cada venta.", pantalla: "/digitales/marketing/enlaces" },
        { id: "cupones", titulo: "Cupones de descuento", bajada: "Crear un cupón y compartirlo.", pantalla: "/digitales/marketing/cupones" },
        { id: "bienvenida", titulo: "Precio de bienvenida", bajada: "Un precio más bajo con un reloj que cuenta hacia atrás, de verdad.", pantalla: "/digitales/marketing/bienvenida" },
        { id: "salida", titulo: "Oferta de salida", bajada: "La última oferta para quien se va del pago sin pagar.", pantalla: "/digitales/marketing/salida" },
        { id: "upsells", titulo: "Upsells", bajada: "Sumar un producto más antes y después de pagar.", pantalla: "/digitales/marketing/upsells" },
        { id: "compradores", titulo: "Mail a tus compradores", bajada: "Un mail a todos los que te compraron, para lanzar o avisar algo.", pantalla: "/digitales/marketing/compradores" },
        { id: "reels", titulo: "Contenido para reels", bajada: "Videos gratis para reels, publicaciones y anuncios.", pantalla: "/digitales/marketing/reels" },
        { id: "pixel", titulo: "Píxel de Meta y Analytics", bajada: "Conectarlos para medir tus anuncios.", pantalla: "/digitales/configuracion" },
      ],
    },
    {
      id: "cuenta",
      titulo: "Tu cuenta",
      bajada: "Configuración, plan y seguridad.",
      tutoriales: [
        { id: "configuracion", titulo: "La configuración", bajada: "Datos del negocio, legales, dominio y avisos de venta.", pantalla: "/digitales/configuracion" },
        { id: "plan", titulo: "Tu plan", bajada: "Qué incluye cada plan y cómo cambiarlo.", pantalla: "/digitales/mi-cuenta" },
      ],
    },
  ],
};

/**
 * El id del video de un link de YouTube, o null si no es uno. Acepta el de
 * "Compartir" (youtu.be), el de la barra (watch?v=), el de un short, el de
 * embed, o el id suelto.
 */
export function idDeYoutube(link: string | null | undefined): string | null {
  const s = (link ?? "").trim();
  if (!s) return null;
  if (/^[\w-]{11}$/.test(s)) return s;
  let u: URL;
  try { u = new URL(s); } catch { return null; }
  const host = u.hostname.replace(/^(www\.|m\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = u.searchParams.get("v") ?? (/^\/(shorts|embed|live)\/([\w-]+)/.exec(u.pathname)?.[2] ?? null);
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

/** Los tutoriales que le tocan a un panel; en el de tiendas, según el rubro (sin rubro, todos). */
export function tutorialesPara(panel: PanelConTutoriales, rubro?: string | null): SeccionDeTutoriales[] {
  const tipo = panel === "tienda" && rubro ? getStoreType(rubro) : null;
  const sirve = (x: { modo?: "cart" | "inquiry"; conAfiliados?: boolean }) =>
    !tipo || ((!x.modo || x.modo === tipo.checkoutMode) && (!x.conAfiliados || tipo.supportsAffiliates));
  return TUTORIALES[panel]
    .filter(sirve)
    .map((s) => ({ ...s, tutoriales: s.tutoriales.filter(sirve) }))
    .filter((s) => s.tutoriales.length > 0);
}
