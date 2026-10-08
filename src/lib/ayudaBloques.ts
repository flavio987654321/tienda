/* ══════════════════════════════════════════════════════════════════════════
   "¿PARA QUÉ SIRVE?" DE CADA BLOQUE (el ⓘ del editor)
   ══════════════════════════════════════════════════════════════════════════

   Lo que lee la dueña al tocar el ⓘ al lado del nombre de un bloque, editando
   (Flavio, 04/10/26: "explicar para qué es cada cosa"). Todos en un solo lugar
   para que digan las cosas igual en los diez templates y no se desparramen.

   Cada texto tiene dos partes, en este orden:
   - PARA QUÉ SIRVE, en una frase y pensando en vender;
   - CUÁNDO NO SE VE, si el bloque se esconde solo en la tienda publicada
     (sin ofertas, sin reseñas, sin fotos…). Es lo que más confunde: lo activó
     y no aparece.

   Se buscan por el id del bloque SIN el prefijo del template ("ai-", "bt-",
   "up-", "cp-", "au-"), así "resenas" vale para todos. Si un template necesita
   otro texto, va con el id entero en `POR_ID`, que gana. Sólo se ven editando:
   nunca en la vista previa, ni en la tienda publicada, ni en la demo pública. */

const POR_TIPO: Record<string, string> = {
  // Portada y catálogo
  productos: "Tus productos, para que el cliente los mire y entre a cada uno. Es el corazón de la tienda: conviene dejarlo arriba.",
  tira: "Accesos rápidos a tus categorías. Ayuda a que el cliente vaya directo a lo que busca sin recorrer todo.",
  categorias: "Accesos grandes a tus categorías, con foto. Ayuda a que el cliente vaya directo a lo que busca.",
  destacados: "Tres colecciones que se arman solas: lo que está en oferta, lo más visto y lo último que entró. Cada una lleva al catálogo filtrado. Si una todavía no tiene productos, no aparece.",
  coleccion: "Una selección de productos para mostrar con más protagonismo, como una vidriera.",
  featured: "Un producto en grande, para empujar el que más te interesa vender. Podés elegirlo o dejar que vaya rotando solo; si no elegís, va el primero de tu catálogo.",
  "producto-foco": "Un producto en grande, para empujar el que más te interesa vender. Si no elegís ninguno, va el más visto.",
  recien: "Lo último que cargaste, para que quien vuelve vea que hay novedades. Aparece cuando tenés al menos 3 productos con foto.",
  ofertas: "Lo que está más barato hoy: productos con precio rebajado o con una promoción que les baja el precio. Se arma solo; si no tenés nada en oferta, en tu tienda no aparece.",
  masvisto: "Lo que más miran tus clientes, ordenado por visitas reales. Se arma solo y aparece en tu tienda recién cuando hay suficientes visitas para que sea verdad.",
  lookbook: "Una foto de alguien vestido con tu ropa, con una marca sobre cada prenda: el cliente la toca y la compra. Vende el conjunto entero. Sin foto, en tu tienda no aparece.",
  lanzamiento: "Una cuenta regresiva para un producto que todavía no salió: genera expectativa. Sin fecha, en tu tienda no aparece; cuando llega la fecha, pasa a \"Ya disponible\".",
  statement: "Una frase grande que dice quién sos o qué vendés. Le da personalidad a la tienda entre bloque y bloque de productos.",
  banner: "Banners horizontales con tus promociones o novedades, que van pasando solos. Sin ninguna foto cargada, en tu tienda no aparece.",
  mayorista: "Avisa que vendés por mayor y cómo funciona. Aparece sólo si tu tienda tiene activada la venta mayorista.",

  // Confianza
  garantias: "Las razones para comprarte a vos: envío, cambios, pago seguro. Dan confianza a quien no te conoce. Revisá que digan lo que de verdad ofrecés.",
  strip: "Las razones para comprarte a vos: envío, cambios, pago seguro. Dan confianza a quien no te conoce. Revisá que digan lo que de verdad ofrecés.",
  resenas: "Lo que opinan tus clientes de vos y de tus productos: es lo primero que mira alguien que no te conoce. Sin reseñas, en tu tienda va sólo una franja finita para que dejen la primera.",
  testimonios: "Lo que opinan tus clientes de vos y de tus productos: es lo primero que mira alguien que no te conoce. Sin reseñas, en tu tienda va sólo una franja finita para que dejen la primera.",
  "prueba-social": "Lo que opinan tus clientes de vos y de tus productos: es lo primero que mira alguien que no te conoce. Sin reseñas, en tu tienda va sólo una franja finita para que dejen la primera.",
  preguntas: "Las dudas de siempre antes de comprar (envíos, pagos, cambios, talles), contestadas con lo que ya cargaste. Te ahorra mensajes y le saca dudas al cliente en el momento.",

  // La marca y el contacto
  nosotros: "Tu historia: quién está detrás de la tienda. La gente le compra a personas; contarlo genera confianza.",
  contacto: "Cómo escribirte: formulario, WhatsApp y redes. Si lo ocultás, el botón \"Escribinos\" de las preguntas lleva a tu WhatsApp.",
  newsletter: "Para que te dejen su mail y enterarse de ofertas y novedades. Es la forma de volver a hablarles a los que ya te conocen.",
  novedades: "Para que te dejen su mail y avisarles cuando entra una unidad o baja un precio. Les escribís desde Notificaciones. Si lo ocultás, nadie puede dejar su correo y tus avisos salen sólo por push.",
};

const POR_ID: Record<string, string> = {
  "au-coleccion": "Una categoría en primer plano, con tres de sus productos, como una vidriera. Si no elegís ninguna, va la que más productos tiene.",
  "bt-ofertas": "Lo que está más barato hoy: los productos con precio rebajado (un precio anterior tachado). Se arma solo; si no tenés ninguno rebajado, en tu tienda no aparece.",
  "bt-coleccion": "Un carrusel con tus productos, para recorrerlos de a varios sin salir de la portada.",
};

/* Las superficies que NO son bloques (no se mueven ni se ocultan: el pie, las
   pantallas de contacto y catálogo, la portada de Aurora). Llevan la misma
   chapita con su nombre, así que se buscan por ese nombre, con el id
   "superficie:<nombre>" que les arma `idDeSuperficie`. */
const POR_SUPERFICIE: Record<string, string> = {
  "Pie de la tienda": "El final de cada página: tus datos, redes, links útiles y las políticas de la tienda. Está en todas las páginas, no sólo en la portada.",
  "Banner principal": "Lo primero que ve el cliente al entrar: tiene que decir en un segundo qué vendés y llevarlo a tus productos. Una buena foto acá cambia toda la tienda.",
  "Pantalla de contacto": "La página de contacto: formulario, WhatsApp, mail y redes. Es adonde llegan los botones \"Escribinos\" y \"Contacto\".",
  "Pantalla del catálogo": "La página con todos tus productos y los filtros. Es adonde llevan \"Ver todo\", las categorías y el buscador.",
  "Pantalla de Nosotros": "La página con tu historia. La gente le compra a personas: contar quién está detrás genera confianza.",
  "Suscripción": "Para que te dejen su mail y enterarse de ofertas y novedades. Es la forma de volver a hablarles a los que ya te conocen.",
};
export const idDeSuperficie = (nombre: string) => `superficie:${nombre}`;

/** El texto del ⓘ para un bloque, o `undefined` si no hay (no se muestra el ⓘ). */
export function ayudaDeBloque(id: string): string | undefined {
  if (id.startsWith("superficie:")) return POR_SUPERFICIE[id.slice("superficie:".length)];
  if (POR_ID[id]) return POR_ID[id];
  const tipo = id.replace(/^[a-z]{2}-/, "");
  return POR_TIPO[tipo];
}
