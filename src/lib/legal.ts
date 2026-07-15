// Versión vigente de los Términos y Condiciones / Política de Privacidad
// generales (Dueños, Vendedores, Compradores). Subir este valor cada vez que
// el contenido cambie de forma sustantiva — dispara el banner de re-aceptación
// para usuarios que aceptaron una versión anterior.
//
// 1.3 (15/07/2026) — cierre y reactivación de tienda, cierre automático por falta
// de pago con sus plazos, y aclaración de que una tienda cerrada no es una cuenta
// cancelada (la retención de datos no arranca al cerrar).
//
// Ojo: este valor estuvo clavado en "1.2" desde el 23/06 mientras los términos
// cambiaron seis veces (Meta, Google Analytics, cambio de rubro, entre otros), así
// que el banner nunca se disparó por ninguno de esos cambios. Este bump arrastra
// toda esa deuda de una: quien acepte ahora acepta también lo de julio.
export const CURRENT_TERMS_VERSION = "1.3";

/**
 * Lo que se muestra al pie de /terminos y /privacidad. Vive acá, pegado a la
 * versión, para que no se puedan desincronizar: antes era un string literal
 * escrito a mano y duplicado en los dos archivos, y los propios documentos
 * afirman que "la fecha de última actualización al inicio de esta página siempre
 * refleja la versión vigente". Si subís la versión, actualizá esto también.
 */
export const TERMS_LAST_UPDATED = "julio 2026";
