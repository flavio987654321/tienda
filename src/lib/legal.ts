// Versión vigente de los Términos y Condiciones / Política de Privacidad
// generales (Dueños, Vendedores, Compradores). Subir este valor cada vez que
// el contenido cambie de forma sustantiva — dispara el banner de re-aceptación
// para usuarios que aceptaron una versión anterior.
//
// 1.7 (03/09/2026) — Productos Digitales, y un arreglo que sale de él.
//   · Faltaba la solapa "Productos Digitales" en los dos documentos, y el
//     problema no era que faltara: era que le dábamos OTRO. El registro armaba
//     el link con una cadena de tres condiciones —seller, owner, y todo lo demás
//     a "buyer"— escrita cuando los tipos de cuenta eran tres. Al aparecer el
//     cuarto, quien se registraba en Productos Digitales aceptaba los términos
//     del Cliente: el documento de alguien que COMPRA en una tienda, y el que
//     promete 10 días de arrepentimiento para todo. Ahora el rol viaja entero.
//   · Los archivos de descarga inmediata están exceptuados del derecho de
//     arrepentimiento por el art. 1116 inc. b del Código Civil y Comercial. Se
//     escribe en el punto 6 ter del Cliente y se nombra la excepción en el
//     punto 7 de sus derechos, con las dos condiciones que la sostienen: si no
//     lo descargó el derecho corre completo, y la garantía que ofrezca quien
//     vende le gana a la excepción ("excepto pacto en contrario").
//   · La privacidad no declaraba dos datos personales que el sistema empezó a
//     guardar: la dirección IP de quien acepta esa condición antes de pagar, y
//     la IP y el navegador de cada descarga. Estaban en los términos y faltaban
//     ahí. Se declaran en las dos solapas —la de quien vende y la de quien
//     compra— con su finalidad, su base legal y su plazo.
//   · El aviso de TRANSFERENCIA INTERNACIONAL estaba escrito en una sola solapa
//     —la de Dueño de tienda— y es un hecho de la plataforma entera: la base
//     corre en aws-1-us-east-2 y el hosting también. O sea que los datos de quien
//     vende afiliado, de quien compra, de quien dona y de quien vende productos
//     digitales salían del país exactamente igual, y ninguno de los cuatro lo
//     estaba leyendo. Lo exige el art. 12 de la Ley 25.326. Ahora está en las
//     cinco, desde una sola constante para que no se puedan desincronizar.
//     Salió de comparar nuestro temario contra el de un competidor —ellos sí
//     tenían su propia sección— y de mirar a dónde apunta de verdad la base.
//   · Se nombra el DOBLE ROL en la solapa de Productos Digitales: sobre los
//     datos de su cuenta el responsable es TiendaApps; sobre los de sus
//     compradores el responsable es quien vende, y nosotros somos el encargado.
//     No es una formalidad: define a quién le llega un pedido de acceso o de
//     borrado de un comprador. Antes estaba dicho como una obligación suelta
//     ("respondés vos por ese uso") y no como lo que es.
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
export const CURRENT_TERMS_VERSION = "1.7";

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
  "Si vendés productos digitales, ahora tenés tu propia solapa en los términos y en la privacidad. Antes te mandaba a la de Cliente, que es la de alguien que compra en una tienda: no decía nada de tu comisión ni de cómo se entrega un archivo, y encima te prometía diez días de arrepentimiento sobre tus propias ventas.",
  "Escribimos qué pasa con la devolución de un archivo que ya se descargó. Si todavía no lo bajaste, tenés tus diez días como en cualquier compra por internet. Si ya lo bajaste, no corresponde — lo dice el Código Civil y Comercial— y por eso ahora te lo mostramos antes de pagar y te pedimos que lo aceptes. Y si quien vende ofrece una garantía en su página, esa garantía vale igual.",
  "Contamos qué guardamos de una descarga: la fecha, la dirección IP y el navegador. Sirve para poder demostrar que el archivo se entregó si algún día se discute el cobro, y para nada más. No se usa para publicidad y se borra junto con el enlace de descarga.",
];

/**
 * Lo que se muestra al pie de /terminos y /privacidad. Vive acá, pegado a la
 * versión, para que no se puedan desincronizar: antes era un string literal
 * escrito a mano y duplicado en los dos archivos, y los propios documentos
 * afirman que "la fecha de última actualización al inicio de esta página siempre
 * refleja la versión vigente". Si subís la versión, actualizá esto también.
 */
export const TERMS_LAST_UPDATED = "septiembre 2026";
