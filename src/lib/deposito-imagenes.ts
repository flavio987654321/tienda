import { writeFile, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import { CACHE_DE_UN_ANIO } from "@/lib/subida-directa";

/**
 * Dónde se guardan las imágenes, en un solo lugar.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POR QUÉ SE SACÓ DE `/api/upload`
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Esa ruta guarda lo que sube una persona **desde el navegador**: recibe un
 * `File`, lo valida y lo escribe. Desde el 09/09/26 el servidor también genera
 * una imagen por su cuenta —la tapa del ebook, ver `tapa-imagen`— y necesita
 * escribirla en el mismo lugar y de la misma forma.
 *
 * La alternativa era copiar acá las cuarenta líneas de la subida. Dos copias
 * del mismo guardado se separan solas: una arregla el `cache-control` y la otra
 * no, una crea el depósito si falta y la otra tira 404. Es exactamente el bug
 * que ya nos pasó con los topes de subida.
 *
 * Así que esto es lo que hacía la ruta, movido tal cual, y la ruta ahora llama
 * acá. Lo que sigue viviendo allá es lo que sólo tiene sentido con un pedido
 * adelante: los topes de peso, los tipos permitidos y el freno por cuenta.
 *
 * ── Las dos formas de guardar, y por qué hay dos ───────────────────────────
 *
 * En producción va a Supabase Storage. En desarrollo, si no hay Supabase
 * configurado, se escribe en `public/uploads` y se devuelve una ruta relativa
 * — así se puede programar sin claves de nada. `imagenValida` acepta las dos.
 */

/** Lo que hace falta para guardar en Supabase, o `null` si no está configurado. */
export function configDeImagenes(): { url: string; clave: string; deposito: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const deposito = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
  if (!url || !clave) return null;
  return { url, clave, deposito };
}

/**
 * ⚠️ Se recuerda cuáles ya se crearon para no pedirlo en cada subida.
 *
 * Vive en el proceso, así que una función nueva lo vuelve a hacer una vez. Es a
 * propósito: el costo es un pedido por arranque y lo que evita es que una
 * instalación nueva —o un depósito borrado a mano— devuelva 404 en la primera
 * subida y nadie entienda por qué.
 */
const yaCreados = new Set<string>();

/**
 * ⚠️ Cuánto se espera. El servidor guarda imágenes adentro de funciones con
 * techo de 60 segundos —el armado del ebook, por ejemplo— y un `fetch` sin
 * tiempo máximo no falla: se cuelga hasta que matan la función, con lo que se
 * estaba haciendo por la mitad. 20 segundos es de sobra para una imagen que
 * pesa cientos de kilobytes.
 */
const ESPERA = 20_000;

async function asegurarDeposito(
  url: string, clave: string, deposito: string, publico: boolean,
): Promise<void> {
  if (yaCreados.has(deposito)) return;
  const cabeceras = {
    apikey: clave,
    Authorization: `Bearer ${clave}`,
    "Content-Type": "application/json",
  };
  const cuerpo = JSON.stringify({ id: deposito, name: deposito, public: publico });

  /* Primero se intenta actualizar el que ya está; si no existe, se crea. */
  const actualizar = await fetch(`${url}/storage/v1/bucket/${deposito}`, {
    method: "PUT", headers: cabeceras, body: cuerpo, signal: AbortSignal.timeout(ESPERA),
  }).catch(() => null);

  if (!actualizar?.ok) {
    await fetch(`${url}/storage/v1/bucket`, {
      method: "POST", headers: cabeceras, body: cuerpo, signal: AbortSignal.timeout(ESPERA),
    }).catch((e) => console.error("[deposito-imagenes] no se pudo crear el depósito:", e));
  }
  yaCreados.add(deposito);
}

/**
 * Guardar bytes y devolver la dirección con la que se van a leer.
 *
 * ⚠️ Un depósito privado NO tiene dirección pública: devuelve `supabase://…` y
 * quien tenga permiso pide un link firmado. Ver `/api/vendedoras/cv/[id]`.
 */
export async function guardarImagen(
  bytes: ArrayBuffer | Buffer,
  { extension, tipo, carpeta = "products", deposito, publico = true }: {
    extension: string;
    /** El `content-type` con el que se va a servir. */
    tipo: string;
    carpeta?: string;
    deposito?: string;
    publico?: boolean;
  },
): Promise<string> {
  const config = configDeImagenes();
  if (!config) {
    throw new Error("Falta configurar Supabase Storage en Vercel para subir archivos.");
  }

  const cual = deposito ?? config.deposito;
  await asegurarDeposito(config.url, config.clave, cual, publico);

  /* `randomUUID` y no `Math.random()`: el generador de JS es predecible a partir
     de unas pocas salidas del mismo proceso. Para un depósito privado, el nombre
     dejó de ser lo único que protege el archivo, pero no hay ningún motivo para
     seguir usando un dado cargado. */
  const ruta = `${carpeta}/${Date.now()}-${randomUUID()}.${extension}`;

  const res = await fetch(`${config.url}/storage/v1/object/${cual}/${ruta}`, {
    method: "POST",
    headers: {
      apikey: config.clave,
      Authorization: `Bearer ${config.clave}`,
      "Content-Type": tipo,
      "x-upsert": "false",
      /* ⚠️ Sin esta línea Supabase sirve todo con "no-cache" y cada visita
         vuelve a bajar las fotos enteras. Ver `CACHE_DE_UN_ANIO`. */
      "cache-control": CACHE_DE_UN_ANIO,
    },
    body: bytes as BodyInit,
    signal: AbortSignal.timeout(ESPERA),
  });

  if (!res.ok) {
    const datos = await res.json().catch(() => null) as { error?: string; message?: string } | null;
    throw new Error(datos?.message || datos?.error || "No se pudo subir la imagen a Supabase Storage");
  }

  if (!publico) return `supabase://${cual}/${ruta}`;
  return `${config.url}/storage/v1/object/public/${cual}/${ruta}`;
}

/**
 * El respaldo de desarrollo: al disco, en `public/uploads`.
 *
 * ⚠️ Sólo sirve mientras se programa. En producción el disco de la función es
 * de mentira —se borra con cada despliegue y no lo comparten dos funciones—, así
 * que quien llama tiene que haber probado antes que hay Supabase. La única razón
 * de que exista es poder trabajar sin claves de nada.
 */
export async function guardarImagenEnDisco(
  bytes: ArrayBuffer | Buffer, extension: string,
): Promise<string> {
  const nombre = `${Date.now()}-${randomUUID()}.${extension}`;
  const carpeta = path.join(process.cwd(), "public", "uploads");
  await mkdir(carpeta, { recursive: true });
  await writeFile(path.join(carpeta, nombre), Buffer.from(bytes as ArrayBuffer));
  return `/uploads/${nombre}`;
}
