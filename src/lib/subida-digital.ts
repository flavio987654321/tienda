/* ══════════════════════════════════════════════════════════════════════════
   EL ARCHIVO DEL PRODUCTO DIGITAL
   ══════════════════════════════════════════════════════════════════════════

   El archivo NO es un dato del producto: **es el producto**. El título, el
   precio y la portada son el envoltorio. Por eso `loQueFalta` no deja publicar
   sin él — un producto publicado sin archivo se cobra y no se entrega.

   ── Por qué el navegador sube directo a Supabase ────────────────────────────

   Los bytes no pueden pasar por nuestro servidor: Next corta el cuerpo del
   pedido bastante antes de los 50 MB que pesa un ebook. Entonces el navegador
   pide un permiso firmado y sube solo.

   Y como del lado del servidor ya nadie ve los bytes, la validación de verdad
   **vive en el bucket** (`file_size_limit` + `allowed_mime_types`): la aplica
   Supabase sobre el archivo real y es mucho más difícil de saltear que un `if`
   nuestro. Lo de acá avisa antes de empezar a subir; lo del bucket manda.

   ── Y por qué el bucket es PRIVADO ─────────────────────────────────────────

   El de los videos es público, porque un video de tienda tiene que verse sin
   cuenta. Acá es al revés: si la dirección sirviera sola, **el ebook pago se
   bajaría sin comprarlo con sólo tenerla**. Se guarda la ruta, nunca una URL, y
   quien compró canjea su token por un link firmado de vida corta.

   La competencia ofrece además "pegar un link" a Drive o Dropbox, y su propio
   cartel explica por qué nosotros no: avisa que el link tiene que estar con
   permisos públicos —"cualquiera con el link puede ver"— o el comprador no
   entra. O sea que el archivo queda abierto en internet, sin vencimiento, sin
   tope de descargas y compartible por el primero que lo reciba. */

import { limpiarTexto } from "@/lib/texto-limpio";

/** Privado. Ver el porqué largo arriba. */
export const BUCKET_DIGITALES = "producto-digital";

/* 50 MB NO es un número elegido: es el techo global de subida del proyecto de
   Supabase, MEDIDO. Un bucket no puede pedir más que eso — al crearlo con 150 MB
   contesta 413 "The object exceeded the maximum allowed size" y el bucket
   directamente no se crea, con lo cual la subida falla con un 502 mudo. Probado:
   50 entra, 100 no. Levantarlo depende del plan de Supabase. */
export const MAX_PDF_MB = 50;
export const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;

/* Arriba de esto se avisa, SIN bloquear. Y no es capricho de tamaño: el bono va
   incluido y gratis con la compra, así que una sola venta arrastra el principal
   más todos sus bonos —en Pro son 6 archivos—. A 25 MB cada uno son 150 MB por
   venta, y ese tráfico lo paga la plataforma. No es "tu archivo es grande": es
   que tu archivo se multiplica en cada venta. */
export const PDF_PESADO_MB = 25;
export const PDF_PESADO_BYTES = PDF_PESADO_MB * 1024 * 1024;

/* Sólo PDF. Es lo que se vende en este mercado, se abre en cualquier aparato sin
   instalar nada, y es la superficie más angosta que podemos dejar. Un ZIP, en
   cambio, puede traer cualquier cosa adentro y nadie la mira. Se amplía el día
   que alguien lo pida, no antes. */
export const TIPO_PDF = "application/pdf";

/** Cuánto vive el permiso de subida. Alcanza para 50 MB por una conexión mala y
 *  no deja un permiso de escritura dando vueltas medio día. */
export const MINUTOS_DEL_PERMISO = 30;

/** El nombre que se guarda para mostrar. Se recorta porque se dibuja en la
 *  tarjeta y viaja en el mail de entrega. */
export const LARGO_NOMBRE_ARCHIVO = 120;

/* ── 🔲 Lo que falta, y va con la ENTREGA (Fase 5) ───────────────────────────
 *
 * Los dos salieron de repasar esto el 02/09/26 y ninguno se puede resolver
 * todavía: las dos respuestas dependen del permiso de descarga, que no existe.
 *
 * **1. Barrer el PDF de un producto borrado.** Borrar un producto es un borrado
 * BLANDO y el PDF se queda — y tiene que quedarse: quien ya compró tiene un
 * permiso que le dura 30 días, y borrar el archivo le rompe una compra que ya
 * pagó. Lo que falta es que después alguien lo limpie; hoy nadie lo hace, el
 * cron diario no toca el storage. Pasados los 30 días ese archivo no le sirve a
 * nadie y lo seguimos pagando. El plazo sale del permiso: barrerlo antes de que
 * exista es adivinar el número.
 *
 * **2. Reemplazar el PDF de un producto YA VENDIDO** le cambia el archivo a quien
 * lo compró antes: el token no guarda la ubicación, pide un link firmado del
 * archivo que el producto tiene AHORA. Para corregir una errata o publicar una
 * versión 2 está perfecto; para vender una cosa y entregar otra, no. Falta
 * decidir si se avisa, si se congela lo vendido, o si se acepta como está.
 *
 * ⚠️ **No confundir el 2 con el huérfano del reemplazo**, que sí está tapado en
 * `/archivo/confirmar`: aquél era el archivo VIEJO quedándose en el bucket sin
 * que nadie lo pudiera alcanzar. Éste es el comprador alcanzando el NUEVO. */

/**
 * Si la subida se puede intentar, o por qué no.
 *
 * Devuelve el mensaje tal como se le muestra a la persona: en castellano y
 * diciendo qué hacer, no un código.
 */
export function validarSubida(p: { tipo: unknown; tamano: unknown }): string | null {
  if (p.tipo !== TIPO_PDF) return "El archivo tiene que ser un PDF.";

  const t = p.tamano;
  if (typeof t !== "number" || !Number.isFinite(t) || t <= 0) {
    return "No se pudo leer el tamaño del archivo.";
  }
  /* ⚠️ El mensaje dice qué hacer y no sólo qué pasó. "Máximo 50 MB" deja a la
     persona sin salida; el caso real que lo destapó fue una guía de 46 páginas
     exportada en calidad de imprenta que pesaba 117 MB, y en calidad de pantalla
     baja a unos pocos. */
  if (t > MAX_PDF_BYTES) {
    return `El PDF supera los ${MAX_PDF_MB} MB. Volvé a exportarlo en calidad para pantalla y va a pesar mucho menos.`;
  }
  return null;
}

/**
 * El aviso de peso, para un archivo que SÍ entra. `null` si no hace falta.
 *
 * No bloquea a propósito: el archivo es válido y la decisión es de la vendedora.
 * Pero conviene que sepa que lo paga en cada venta.
 */
export function avisoDePeso(bytes: number): string | null {
  if (!Number.isFinite(bytes) || bytes <= PDF_PESADO_BYTES) return null;
  return "El archivo es pesado y tus compradores lo van a bajar entero. Si lo exportás en calidad para pantalla se descarga mucho más rápido.";
}

/**
 * La ruta adentro del bucket. **La arma el servidor, nunca el cliente.**
 *
 * Si la eligiera el navegador podría escribir encima del archivo de otra cuenta
 * con sólo mandar su ruta. Del nombre original no se usa NADA —ni la extensión,
 * que es siempre `pdf` porque es el único tipo que entra— porque un nombre puede
 * traer `../` adentro.
 *
 * Lleva el id de la cuenta y el del producto para que se pueda auditar de dónde
 * salió cada archivo mirando la ruta, sin cruzar con la base.
 */
export function rutaDeArchivo(userId: string, productoId: string, uuid: string): string {
  return `${userId}/${productoId}/${Date.now()}-${uuid}.pdf`;
}

/**
 * Lo que se guarda en `archivoPath`: `supabase://<bucket>/<ruta>`.
 *
 * ⚠️ **Nunca una URL servible.** Si en esa columna hubiera una dirección que
 * funciona sola, el archivo pago se bajaría sin comprarlo con sólo tenerla.
 * Guardar una referencia y no una dirección es lo que obliga a pasar por el
 * token para bajarlo.
 */
export function refDeArchivo(ruta: string): string {
  return `supabase://${BUCKET_DIGITALES}/${ruta}`;
}

/**
 * La vuelta: de la referencia guardada a la ruta del bucket, para poder firmar
 * la descarga. `null` si no es una referencia nuestra.
 *
 * Vive al lado de `refDeArchivo` porque son un par: escritas en dos archivos
 * distintos, el día que cambie el formato una se entera y la otra no.
 */
export function rutaDeRef(ref: unknown): string | null {
  if (typeof ref !== "string") return null;
  const prefijo = `supabase://${BUCKET_DIGITALES}/`;
  if (!ref.startsWith(prefijo)) return null;
  const ruta = ref.slice(prefijo.length);
  /* Un `..` en la ruta guardada saldría del prefijo de la cuenta al firmar. No
     debería poder pasar —la ruta la arma el servidor— pero esto se lee para
     entregar un archivo pago, y ahí no se confía ni en lo propio. */
  if (!ruta || ruta.includes("..")) return null;
  return ruta;
}

/** El nombre para mostrar, limpio y acotado. `null` si no vino nada usable. */
export function nombreDeArchivo(valor: unknown): string | null {
  return limpiarTexto(valor, LARGO_NOMBRE_ARCHIVO);
}
