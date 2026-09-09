/**
 * Sacar un archivo del bucket privado de productos digitales.
 *
 * Está en su propio archivo porque hay DOS lugares que borran del depósito y
 * tienen que borrar igual: el reemplazo —cuando alguien sube un PDF nuevo sobre
 * uno que ya estaba— y el barrido del cron, cuando un producto borrado cumple
 * su cuarentena. Escrito dos veces, el día que Supabase cambie qué contesta se
 * entera uno y el otro no.
 *
 * Va acá y no en `subida-digital.ts` a propósito: ese archivo lo importa una
 * pantalla (`ProductosClient.tsx`), y la llave de servicio no puede ni rozar
 * algo que se manda al navegador.
 */

import { BUCKET_DIGITALES } from "./subida-digital";

/**
 * Cuánto se le deja el archivo a un producto YA BORRADO antes de sacarlo del
 * depósito.
 *
 * Son los mismos 30 días que dura el permiso de descarga (`DigitalDownload.
 * expiresAt`), y no por casualidad: un producto borrado no se puede comprar, así
 * que la última venta posible es anterior al borrado y su permiso vence, como
 * mucho, 30 días después. Cumplido el plazo no queda nadie con derecho a bajarlo.
 */
export const DIAS_CUARENTENA_ARCHIVO = 30;

/**
 * Cuántos archivos barre el cron por noche.
 *
 * Hay tope porque cada uno es un pedido a Supabase, y el cron diario entero
 * tiene 60 segundos —el techo del plan gratis de Vercel—. Sin esto, alguien que
 * borra doscientos productos el mismo día se lleva puesto lo que corra después.
 * Lo que quedó afuera se barre mañana; lo que importa es que se drene, no que
 * sea hoy.
 */
export const TOPE_BARRIDO = 50;

export type ConfigDeposito = { supabaseUrl: string; serviceRoleKey: string };

/** `null` si falta alguna de las dos variables: sin ellas no hay nada que hacer. */
export function configDeposito(): ConfigDeposito | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return { supabaseUrl, serviceRoleKey };
}

/**
 * Qué pasó con el borrado.
 *
 * `noEstaba` se separa de `fallo` y no es un detalle: quien llama tiene que
 * poder soltar la referencia igual. Si un objeto que ya no está contara como
 * error, el cron lo volvería a intentar todas las noches para siempre.
 */
export type ResultadoBorrado = "borrado" | "noEstaba" | "fallo";

/**
 * Cuánto vive el enlace firmado con el que se baja un archivo.
 *
 * Cinco minutos: alcanza de sobra para que arranque la descarga, y deja muerto
 * al enlace que quedó en el historial del navegador o pegado en un chat. El
 * archivo que ya empezó a bajar NO se corta cuando vence — la firma se comprueba
 * al pedirlo, no durante la transferencia.
 *
 * ⚠️ Es lo contrario del permiso de SUBIDA (`MINUTOS_DEL_PERMISO`, 30): aquél
 * tiene que aguantar 50 MB por una conexión mala; éste se usa en un segundo y
 * después sólo puede hacer daño.
 */
export const MINUTOS_DEL_ENLACE = 5;

/**
 * Un enlace de vida corta para bajar un archivo del bucket privado.
 *
 * ── Por qué firmado y no servido por nosotros ───────────────────────────────
 *
 * Porque el archivo baja **derecho de Supabase al navegador**, sin pasar por
 * nuestra función. Un PDF de 50 MB atravesando `/api` choca contra el techo de
 * 4,5 MB de la plataforma, y aunque no chocara nos haría pagar el tránsito dos
 * veces. El servidor decide QUIÉN puede bajar; el archivo lo entrega Supabase.
 */
export async function enlaceDeDescarga(
  { supabaseUrl, serviceRoleKey }: ConfigDeposito,
  ruta: string,
): Promise<string | null> {
  const res = await fetch(`${supabaseUrl}/storage/v1/object/sign/${BUCKET_DIGITALES}/${ruta}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: MINUTOS_DEL_ENLACE * 60 }),
  }).catch(() => null);

  if (!res?.ok) return null;
  const datos = (await res.json().catch(() => null)) as { signedURL?: unknown } | null;
  if (typeof datos?.signedURL !== "string") return null;
  return `${supabaseUrl}/storage/v1${datos.signedURL}`;
}

/**
 * Poner un archivo en el bucket privado, **desde el servidor**.
 *
 * ── Por qué esto no existía hasta el ebook ─────────────────────────────────
 *
 * Porque hasta ahora los archivos los subía el navegador derecho a Supabase,
 * con un permiso firmado. Es lo correcto para un PDF que la persona ya tiene:
 * 50 MB pasando por nuestra función chocan contra el techo de 4,5 MB de la
 * plataforma y nos harían pagar el tránsito dos veces.
 *
 * El ebook es al revés: el archivo **nace en el servidor**. Nadie lo tiene que
 * subir, ya está acá. Mandarlo al navegador para que lo suba sería hacerlo
 * viajar dos veces para nada.
 *
 * Y entra sin problema en el techo: un ebook de treinta páginas de texto pesa
 * decenas de kilobytes. El techo de 4,5 MB es un problema de los PDF con
 * imágenes, no de éste.
 *
 * ⚠️ `upsert: false` a propósito. La ruta la arma el servidor y lleva la hora,
 * así que nunca debería chocar; si chocara, es que algo anda mal y es mejor
 * enterarse que pisar en silencio un archivo que alguien podría estar bajando.
 */
/**
 * ⚠️ CUÁNTO SE ESPERA A QUE SUBA, Y POR QUÉ TIENE QUE HABER UN NÚMERO.
 *
 * Esto corre adentro de una función con techo de 60 segundos —el armado del
 * ebook, la confirmación de una subida— y hasta el 09/09/26 el `fetch` no tenía
 * tiempo máximo. Un Supabase lento no devolvía un error: se quedaba colgado
 * hasta que la plataforma mataba la función entera, **con el archivo a medio
 * subir y sin que nadie escribiera la base**. Eso deja un archivo pago que no
 * apunta a ningún lado y un producto que sigue entregando el de antes.
 *
 * 30 segundos: de sobra para los 50 MB que aguanta un producto por la ruta que
 * pasa por el servidor, y la mitad del techo de la función, así que quien llama
 * todavía tiene lugar para contestar que salió mal.
 *
 * Encontrado en la auditoría del panel: era el único `fetch` a un tercero de
 * este ecosistema sin tiempo máximo. Los de Pexels y el del modelo ya tenían.
 */
const ESPERA_DE_SUBIDA = 30_000;

export async function subirAlDeposito(
  { supabaseUrl, serviceRoleKey }: ConfigDeposito,
  ruta: string,
  contenido: Buffer,
  tipo = "application/pdf",
): Promise<boolean> {
  const res = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET_DIGITALES}/${ruta}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": tipo,
      "x-upsert": "false",
    },
    body: new Uint8Array(contenido),
    signal: AbortSignal.timeout(ESPERA_DE_SUBIDA),
  }).catch(() => null);

  if (res?.ok) return true;
  console.error("[deposito-digital] no se pudo subir", { ruta, estado: res?.status });
  return false;
}

export async function borrarDelDeposito(
  { supabaseUrl, serviceRoleKey }: ConfigDeposito,
  ruta: string,
): Promise<ResultadoBorrado> {
  const res = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET_DIGITALES}/${ruta}`, {
    method: "DELETE",
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  }).catch(() => null);

  if (res?.ok) return "borrado";
  if (!res) return "fallo";
  if (res.status === 404) return "noEstaba";

  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️ SUPABASE NO CONTESTA 404 CUANDO EL OBJETO NO ESTÁ
     ══════════════════════════════════════════════════════════════════════════

     Contesta **400** y mete el 404 ADENTRO del cuerpo:

       {"statusCode":"404","error":"not_found","message":"Object not found",
        "code":"NoSuchKey"}

     Así que mirando sólo `res.status` la rama `noEstaba` de arriba **no se
     alcanzaba nunca** y un archivo que ya no está contaba como `fallo`. Que es
     exactamente lo que el comentario de `ResultadoBorrado` dice que no puede
     pasar: el barrido de la noche lo reintenta para siempre, porque nunca llega
     a soltar la referencia.

     Se encontró borrando a mano un producto de prueba cuyo archivo nunca se
     había subido: el borrado dijo "fallo" y el archivo no existía. */
  const cuerpo = await res.text().catch(() => "");
  if (/"statusCode"\s*:\s*"?404|NoSuchKey|not_found/.test(cuerpo)) return "noEstaba";

  console.error("[deposito-digital] no se pudo borrar", { ruta, estado: res.status });
  return "fallo";
}
