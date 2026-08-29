import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import { fileTypeFromBuffer } from "file-type";
import { medirImagen, avisoDeFotoChica } from "@/lib/medidas-imagen";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { DIGITAL_BUCKET, MAX_ARCHIVO_DIGITAL_MB, MAX_ARCHIVO_DIGITAL_BYTES } from "@/lib/descargas";

export const runtime = "nodejs";

const MAX_FILE_SIZE_MB = 4;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_DOCUMENT_SIZE_MB = 15;
const MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * 1024 * 1024;
const MAX_VIDEO_SIZE_MB = 50;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
// El tope del archivo que se vende vive en lib/descargas (importado arriba), no
// acá: la validación del producto compara contra el mismo número y con dos
// copias se desalineaban. Subirlo NO alcanza para vender videos — el archivo
// viaja entero por esta función y el límite real lo pone la plataforma.
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/ogg"]);
const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  ...ALLOWED_IMAGE_TYPES,
]);
// Lo que se puede vender como producto digital. Es lo mismo que un documento
// más ZIP, que es como viaja un pack de plantillas (varios archivos juntos).
const ALLOWED_DIGITAL_TYPES = new Set([
  ...ALLOWED_DOCUMENT_TYPES,
  "application/zip",
  "application/x-zip-compressed",
  "application/epub+zip",
]);
const DEFAULT_BUCKET = "product-images";

/* Los documentos de identidad de los afiliados NO van con las fotos de producto.
   Iban al mismo bucket, y ese bucket es público a propósito (las fotos tienen que
   verse en la tienda sin login): un DNI ahí queda legible para cualquiera que
   tenga la dirección, sin sesión y para siempre. Lo único que lo cubría era que
   el nombre del archivo era difícil de adivinar, y encima se armaba con
   `Math.random()`, que no es aleatoriedad criptográfica.
   Ahora van a un bucket privado propio, y se leen con un link firmado y de vida
   corta que emite /api/vendedoras/cv/[id] después de verificar quién pregunta. */
const DOCS_BUCKET = process.env.SUPABASE_DOCS_BUCKET || "affiliate-docs";

/* El archivo que se vende tampoco va con las fotos de producto, y por el mismo
   motivo que el DNI de un afiliado: ese bucket es público a propósito. Un PDF
   pago ahí queda descargable por cualquiera que tenga la dirección, sin sesión y
   para siempre — o sea, el producto se regala solo.

   Bucket propio y privado. Se guarda la RUTA (`supabase://…`), no una URL, y
   quien compró la pide con un link firmado y de vida corta. Bucket aparte del de
   afiliados a propósito: son dos cosas con permisos distintos —un DNI lo mira el
   admin, un producto lo baja el comprador— y mezclarlas sería un lío el día que
   haya que dar acceso a uno sin dar el otro.

   El nombre y el tope se importan de lib/descargas, que es de donde también los
   leen la validación del producto y la ruta de entrega: con una copia en cada
   lado, cambiar el bucket en uno solo dejaba archivos que se suben pero no se
   pueden entregar. */

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

function getSupabaseStorageConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;

  if (!supabaseUrl || !serviceRoleKey) return null;
  return { supabaseUrl, serviceRoleKey, bucket };
}

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName) return fromName;
  return file.type.split("/")[1] || "bin";
}

const bucketsEnsured = new Set<string>();

async function ensureBucket(supabaseUrl: string, serviceRoleKey: string, bucket: string, isPublic: boolean) {
  if (bucketsEnsured.has(bucket)) return;
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
  const body = JSON.stringify({ id: bucket, name: bucket, public: isPublic });
  // Try to update existing bucket
  const updateRes = await fetch(`${supabaseUrl}/storage/v1/bucket/${bucket}`, {
    method: "PUT",
    headers,
    body,
  }).catch(() => null);
  if (!updateRes?.ok) {
    // Bucket might not exist yet — create it
    await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: "POST",
      headers,
      body,
    }).catch((err) => console.error("[upload] bucket creation failed:", err));
  }
  bucketsEnsured.add(bucket);
}

async function uploadToSupabaseStorage(
  file: File,
  bytes: ArrayBuffer,
  folder = "products",
  opts: { bucket?: string; isPublic?: boolean } = {}
) {
  const config = getSupabaseStorageConfig();
  if (!config) {
    throw new Error("Falta configurar Supabase Storage en Vercel para subir archivos.");
  }

  const bucket = opts.bucket ?? config.bucket;
  const isPublic = opts.isPublic ?? true;

  await ensureBucket(config.supabaseUrl, config.serviceRoleKey, bucket, isPublic);

  const ext = extensionFor(file);
  // `randomUUID` en vez de `Math.random()`: el generador de JS es predecible a
  // partir de unas pocas salidas del mismo proceso, y para un bucket privado el
  // nombre dejó de ser lo único que protege el archivo — pero no hay motivo para
  // seguir usando un dado cargado.
  const filePath = `${folder}/${Date.now()}-${randomUUID()}.${ext}`;
  const uploadUrl = `${config.supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": file.type,
      "x-upsert": "false",
    },
    body: bytes,
  });
  const data = await res.json().catch(() => null) as { error?: string; message?: string } | null;

  if (!res.ok) {
    const message = data?.message || data?.error || "No se pudo subir la imagen a Supabase Storage";
    throw new Error(message);
  }

  // Un bucket privado no tiene URL pública: se guarda la RUTA, y quien tenga
  // permiso pide un link firmado. Ver /api/vendedoras/cv/[id].
  if (!isPublic) return `supabase://${bucket}/${filePath}`;

  return `${config.supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    if (!(await checkRateLimit(`upload:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS))) {
      return NextResponse.json(
        { error: "Demasiadas subidas en poco tiempo. Esperá un momento." },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const purpose = String(formData.get("purpose") || "image");
    const isDocument = purpose === "affiliate-doc";
    /* El archivo que se vende. Se mira el `purpose` y NO el tipo del archivo:
       un PDF puede ser tanto un producto digital como el DNI de un afiliado, y
       cada uno va a un bucket distinto. Es quien llama el que sabe cuál es. */
    const isArchivoDigital = purpose === "producto-digital";
    const isVideo = ALLOWED_VIDEO_TYPES.has(file?.type);
    if (!file) return NextResponse.json({ error: "No se recibio archivo" }, { status: 400 });
    if (isArchivoDigital) {
      if (!ALLOWED_DIGITAL_TYPES.has(file.type)) {
        return NextResponse.json({ error: "Solo se permiten PDF, Word, Excel, PowerPoint, ZIP, EPUB, TXT o imagenes" }, { status: 400 });
      }
      if (file.size > MAX_ARCHIVO_DIGITAL_BYTES) {
        return NextResponse.json(
          { error: `El archivo no puede superar ${MAX_ARCHIVO_DIGITAL_MB} MB. Para algo más pesado —un curso en video— conviene subirlo a YouTube o Vimeo y vender el acceso.` },
          { status: 413 }
        );
      }
    } else if (isDocument) {
      if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) {
        return NextResponse.json({ error: "Solo se permiten PDF, Word, Excel, PowerPoint, TXT o imagenes" }, { status: 400 });
      }
      if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
        return NextResponse.json({ error: `El archivo no puede superar ${MAX_DOCUMENT_SIZE_MB} MB` }, { status: 413 });
      }
    } else if (isVideo) {
      if (file.size > MAX_VIDEO_SIZE_BYTES) {
        return NextResponse.json({ error: `El video no puede superar ${MAX_VIDEO_SIZE_MB} MB` }, { status: 413 });
      }
    } else if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Solo se permiten imagenes JPG, PNG, WEBP o GIF" }, { status: 400 });
    } else if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: `La imagen no puede superar ${MAX_FILE_SIZE_MB} MB` }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();

    // Validar tipo real por magic bytes — no confiar en Content-Type del cliente.
    // Se saltea para documentos y para el archivo digital: un .docx, un .xlsx o
    // un .txt no tienen una firma que este validador reconozca, y rechazarlos
    // sería romper justo los formatos que el rubro existe para vender.
    if (!isDocument && !isArchivoDigital) {
      const detected = await fileTypeFromBuffer(Buffer.from(bytes));
      const allowedSet = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
      if (!detected || !allowedSet.has(detected.mime)) {
        return NextResponse.json(
          { error: isVideo ? "El archivo no es un video válido" : "El archivo no es una imagen válida" },
          { status: 400 }
        );
      }
    }

    /* Cuánto mide la foto, para poder avisar si va a verse borrosa.
       NO bloquea la subida: hay imágenes que son chicas con razón —un logo, un
       ícono— y rechazarlas sería peor que el problema. El aviso viaja junto a la
       url y lo muestra quien subió, que es el único que puede cambiarla.
       Sólo para imágenes: un video o un PDF no tienen este problema. */
    const esLogo = purpose === "logo";
    const aviso = !isDocument && !isArchivoDigital && !isVideo && !esLogo
      ? avisoDeFotoChica(medirImagen(Buffer.from(bytes)))
      : null;

    if (getSupabaseStorageConfig()) {
      const folder = isDocument ? "affiliate-docs"
        : isArchivoDigital ? "producto-digital"
        : isVideo ? "store-videos"
        : "products";
      // Los dos privados devuelven `supabase://bucket/path`, no una URL.
      const url = isDocument
        ? await uploadToSupabaseStorage(file, bytes, folder, { bucket: DOCS_BUCKET, isPublic: false })
        : isArchivoDigital
        ? await uploadToSupabaseStorage(file, bytes, folder, { bucket: DIGITAL_BUCKET, isPublic: false })
        : await uploadToSupabaseStorage(file, bytes, folder);
      return NextResponse.json({ url, ...(aviso ? { aviso } : {}) });
    }

    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Falta configurar Supabase Storage en Vercel para subir archivos." },
        { status: 500 }
      );
    }

    /* El respaldo local escribe en `public/uploads`, que Next sirve en abierto:
       ahí adentro no hay privado que valga. Para las fotos da igual —son
       públicas de todos modos— pero un archivo que se vende quedaría descargable
       por cualquiera que adivine el nombre. Se corta acá y en TODOS los
       entornos, no sólo en producción: el hueco se abre igual si alguien levanta
       esto en una máquina que otro puede alcanzar. */
    if (isArchivoDigital) {
      return NextResponse.json(
        { error: "Falta configurar Supabase Storage: el archivo del producto necesita el bucket privado y no se puede guardar en disco." },
        { status: 500 }
      );
    }

    const ext = extensionFor(file);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const buffer = Buffer.from(bytes);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), buffer);

    return NextResponse.json({ url: `/uploads/${fileName}`, ...(aviso ? { aviso } : {}) });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo subir la imagen" },
      { status: 500 }
    );
  }
}
