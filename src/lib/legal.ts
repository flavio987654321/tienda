// Versión vigente de los Términos y Condiciones / Política de Privacidad
// generales (Dueños, Vendedores, Compradores). Subir este valor cada vez que
// el contenido cambie de forma sustantiva — dispara el banner de re-aceptación
// para usuarios que aceptaron una versión anterior.
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
export const CURRENT_TERMS_VERSION = "1.4";

/**
 * Qué cambió en la versión vigente, en criollo, para el email de aviso.
 *
 * Vive pegado a la versión a propósito: si subís CURRENT_TERMS_VERSION y no
 * tocás esto, el mail sale describiendo los cambios de la versión anterior.
 * Escribilo como se lo contarías a la dueña de una tienda, sin números de
 * sección ni "conforme a lo dispuesto".
 */
export const CURRENT_TERMS_SUMMARY: string[] = [
  "Sumamos las promociones de tienda: cuántas podés tener según tu plan, y qué pasa con ellas si cambiás de rubro.",
  "Aclaramos los topes del plan Pro: cuentan lo que tenés vigente, no lo que creaste alguna vez, y los cupones de la ruleta no ocupan lugar.",
  "Ahora no se puede cambiar de rubro con cupones o promociones que tus clientes todavía puedan usar: los das de baja vos, para que no desaparezcan sin que te enteres.",
  "Explicamos qué pasa con los carritos que alguien deja sin comprar: qué datos se guardan, para qué, y que se borran solos a los 45 días.",
];

/**
 * Lo que se muestra al pie de /terminos y /privacidad. Vive acá, pegado a la
 * versión, para que no se puedan desincronizar: antes era un string literal
 * escrito a mano y duplicado en los dos archivos, y los propios documentos
 * afirman que "la fecha de última actualización al inicio de esta página siempre
 * refleja la versión vigente". Si subís la versión, actualizá esto también.
 */
export const TERMS_LAST_UPDATED = "julio 2026";
