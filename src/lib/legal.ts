// Versión vigente de los Términos y Condiciones / Política de Privacidad
// generales (Dueños, Vendedores, Compradores). Subir este valor cada vez que
// el contenido cambie de forma sustantiva — dispara el banner de re-aceptación
// para usuarios que aceptaron una versión anterior.
//
// 1.6 (11/08/2026) — tres arreglos que salieron de revisar el texto, no de un
// cambio de producto:
//   · La sección 5 del Dueño decía "sos responsable de las comisiones que
//     acordés con tus afiliados" y la 6, en el mismo documento, "TiendaApps es
//     el responsable directo del pago de comisiones". Un afiliado que no cobraba
//     podía reclamarle al dueño con la 5 en la mano y el dueño mandarlo acá con
//     la 6. Gana la 6, que es la que describe cómo funciona de verdad: la 5
//     ahora habla solo de definir el porcentaje y avisar los cambios.
//   · El borrado definitivo de cuenta no estaba documentado en los términos del
//     Dueño. La sección 7 lo remitía a "la sección 8", que es Propiedad
//     intelectual — el número venía copiado de los términos del Cliente, donde
//     la 8 sí es cancelación de cuenta. Se agrega 7 quater con lo que el sistema
//     hace de verdad (anonimizar los registros fiscales en vez de borrarlos,
//     liberar el email, los bloqueos por pedidos y comisiones pendientes).
//   · Faltaba la solapa "Donante", que sí existe en la Política de Privacidad.
//     /comunidad manda a ?role=donor y quien venía de ahí caía en "Cliente" sin
//     aviso, aunque donar no requiere cuenta ni haber comprado nada.
//
// 1.5 (07/08/2026) — topes de productos. El plan Pro pasa a tener uno (1.000
// publicados), y aparece además un techo de 5.000 por tienda que corre para
// cualquier plan, Premium incluido. Ese segundo no es comercial: las tres rutas
// que crean productos (alta, importación de CSV y duplicar) no tenían ni tope de
// cantidad ni límite de ritmo, y como el plan se elige solo al registrarse y la
// prueba no pide tarjeta, un tope que mirara únicamente el plan no frenaba a
// quien lo quisiera evadir. Se documenta porque el usuario se lo puede chocar.
//
// 1.4 (20/07/2026) — promociones de tienda: tope del plan Pro (5 vigentes, más el
// de 10 cupones ahora bien definido), su borrado y respaldo en el cambio de rubro,
// y el bloqueo del cambio cuando hay ofertas que un cliente todavía puede usar.
// Suma también los carritos abandonados a la política de privacidad, que no
// figuraban en ningún lado, y aclara que el descuento de los cupones de premio de
// afiliados lo absorbe la tienda donde se canjean, no TiendaApps.
//
// 1.3 (15/07/2026) — cierre y reactivación de tienda, cierre automático por falta
// de pago con sus plazos, y aclaración de que una tienda cerrada no es una cuenta
// cancelada (la retención de datos no arranca al cerrar).
//
// Ojo: este valor estuvo clavado en "1.2" desde el 23/06 mientras los términos
// cambiaron seis veces (Meta, Google Analytics, cambio de rubro, entre otros), así
// que el banner nunca se disparó por ninguno de esos cambios. El bump a 1.3
// arrastró toda esa deuda de una.
export const CURRENT_TERMS_VERSION = "1.6";

/**
 * Condiciones del diseño colaborativo (/diseno-propio). Versión aparte de
 * CURRENT_TERMS_VERSION a propósito: los términos generales los acepta gente
 * registrada (dueños, vendedores, compradores) y subirlos dispara el banner de
 * re-aceptación para todos. El formulario de diseño, en cambio, lo llena
 * cualquiera sin registrarse, y su único compromiso es que el diseño que salga
 * de su idea se publica en el catálogo. Mezclarlos obligaría a media plataforma
 * a re-aceptar términos por algo que no la toca.
 *
 * 1.0 (21/07/2026) — versión inicial.
 */
export const DESIGN_BRIEF_TERMS_VERSION = "1.0";

/**
 * Qué cambió en la versión vigente, en criollo, para el email de aviso.
 *
 * Vive pegado a la versión a propósito: si subís CURRENT_TERMS_VERSION y no
 * tocás esto, el mail sale describiendo los cambios de la versión anterior.
 * Escribilo como se lo contarías a la dueña de una tienda, sin números de
 * sección ni "conforme a lo dispuesto".
 */
export const CURRENT_TERMS_SUMMARY: string[] = [
  "Aclaramos quién paga las comisiones de afiliados. Había dos partes del texto que decían cosas distintas: ahora queda escrito en un solo lugar que las paga TiendaApps directamente al afiliado, y que lo tuyo es definir el porcentaje y avisar si lo cambiás.",
  "Escribimos qué pasa cuando eliminás tu cuenta, que antes no estaba explicado en ningún lado: qué se borra, qué queda anonimizado por obligación fiscal, y por qué conviene cerrar la tienda en vez de eliminarla si lo único que querés es dejar de pagar.",
  "Si donaste a la Canasta Solidaria o a una Causa Libre, ahora tenés tu propia solapa en los términos. Antes te mandaba a la de Cliente, aunque para donar no hace falta tener cuenta ni haber comprado nunca.",
];

/**
 * Lo que se muestra al pie de /terminos y /privacidad. Vive acá, pegado a la
 * versión, para que no se puedan desincronizar: antes era un string literal
 * escrito a mano y duplicado en los dos archivos, y los propios documentos
 * afirman que "la fecha de última actualización al inicio de esta página siempre
 * refleja la versión vigente". Si subís la versión, actualizá esto también.
 */
export const TERMS_LAST_UPDATED = "agosto 2026";
