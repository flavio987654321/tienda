/**
 * Subida DIRECTA del navegador a Supabase, sin pasar por nuestro servidor.
 *
 * ── El muro, que es la razón de que esto exista ───────────────────────────────
 *
 * `/api/upload` recibe el archivo como cuerpo de un pedido y recién ahí lo manda
 * al storage. Eso funciona para una foto, y **no puede funcionar para un video**:
 * el cuerpo de un pedido tiene un techo que no lo ponemos nosotros.
 *
 *   · En producción (Vercel, funciones serverless): **4,5 MB**. Es un límite de
 *     la plataforma y no se puede levantar desde el código.
 *   · En desarrollo, Next corta antes y avisa: *"Request body exceeded 10MB"*.
 *
 * Mientras tanto el formulario le decía a la dueña **"hasta 50 MB"**, y el
 * servidor lo repetía en su propia validación. O sea que los dos estaban de
 * acuerdo en un número que ninguno de los dos podía cumplir: el archivo ni
 * siquiera llegaba a la validación — lo cortaba la plataforma antes, con un
 * error que no explica nada.
 *
 * Con la subida directa el archivo **no pasa por nosotros**. El servidor sólo
 * firma un permiso —dice a qué ruta se puede escribir y por cuánto tiempo— y el
 * navegador manda los bytes a Supabase. No hay cuerpo de pedido que pueda
 * desbordar, porque no hay pedido.
 *
 * ── Lo que se pierde, y con qué se reemplaza ──────────────────────────────────
 *
 * Pasando por el servidor podíamos mirar los BYTES del archivo y confirmar que
 * un "video/mp4" era de verdad un mp4 (`fileTypeFromBuffer`). Yendo directo,
 * nadie de este lado ve los bytes.
 *
 * Se reemplaza con dos cosas, y las dos las aplica Supabase sobre el archivo
 * real, no un `if` nuestro:
 *
 *   1. `allowed_mime_types` en el bucket — rechaza cualquier cosa que no sea un
 *      video. Sin esto, un permiso firmado para "un video" serviría para subir
 *      un HTML a un bucket PÚBLICO, que es un problema de verdad.
 *   2. `file_size_limit` en el bucket — el tope de tamaño de verdad. Nuestro
 *      chequeo de tamaño sigue existiendo pero es sólo cortesía: avisa antes de
 *      empezar a subir, en vez de después.
 *
 * Y la ruta la elige el SERVIDOR, nunca el cliente: si el navegador pudiera
 * decir dónde escribir, podría pisar el video de otra tienda.
 *
 * ── Por qué los videos tienen bucket propio ───────────────────────────────────
 *
 * Hasta ahora vivían en `product-images`, mezclados con las fotos. Para poner el
 * `allowed_mime_types` habría que declarar ahí los tipos de foto Y los de video
 * juntos, y tocar la configuración del bucket del que dependen TODAS las fotos
 * de TODAS las tiendas para arreglar los videos es cambiarle el motor a un auto
 * andando. Con bucket propio, si algo sale mal, sale mal sólo en los videos.
 *
 * Los videos viejos siguen donde están: sus direcciones no cambian.
 */

/** Público: un video de la tienda tiene que poder verse sin cuenta. */
export const BUCKET_VIDEOS = "store-videos";

/* 50 MB NO es un número elegido: es el techo global de subida del proyecto de
   Supabase, MEDIDO. Un bucket no puede pedir más que eso — al crearlo con 150 MB
   contesta 413 "The object exceeded the maximum allowed size" y el bucket
   directamente no se crea, con lo cual la subida falla sin explicar por qué.
   Probado: 50 entra, 100 no. Para subirlo hay que levantar el límite global en
   el panel de Supabase, y eso depende del plan. */
export const MAX_VIDEO_MB = 50;
export const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;

/* Arriba de esto conviene avisar aunque entre: un video de tienda que pesa 30 MB
   lo va a mirar muy poca gente desde el celular, y el que lo mire lo va a pagar
   con sus datos. No bloquea. */
export const VIDEO_PESADO_MB = 20;

export const TIPOS_VIDEO = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",
]);

/** La extensión que le corresponde a cada tipo. La pone el servidor a partir del
 *  tipo declarado y NO del nombre que manda el navegador: un nombre puede venir
 *  con `../` adentro o con una extensión que no tiene nada que ver. */
export const EXTENSION_DE_VIDEO: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/ogg": "ogv",
};

/** Cuánto vive el permiso de subida. Alcanza de sobra para 50 MB por una
 *  conexión mala, y no deja un permiso dando vueltas medio día. */
export const MINUTOS_DEL_PERMISO = 30;
