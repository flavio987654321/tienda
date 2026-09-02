import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  BUCKET_DIGITALES,
  MAX_PDF_BYTES,
  TIPO_PDF,
  MINUTOS_DEL_PERMISO,
  validarSubida,
  rutaDeArchivo,
} from "@/lib/subida-digital";

export const runtime = "nodejs";

/**
 * Firma un permiso para que el NAVEGADOR suba el PDF directo a Supabase.
 *
 * Acá no viaja el archivo — viajan su tipo, su tamaño y de qué producto es. El
 * porqué largo está en `lib/subida-digital`: los bytes no pueden pasar por
 * nuestro servidor, así que la validación de verdad vive en el bucket.
 *
 * Lo que devuelve es un permiso de un solo uso, para UNA ruta que elige el
 * servidor y por media hora. **La ruta no se guarda todavía**: se guarda cuando
 * la subida está confirmada (ver `../confirmar`). Guardarla acá dejaría el
 * producto apuntando a la nada si la subida se corta a mitad de camino — y
 * `loQueFalta` lo daría por listo para publicar.
 */

type Config = { supabaseUrl: string; serviceRoleKey: string };

function configDeSupabase(): Config | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return { supabaseUrl, serviceRoleKey };
}

/* Que el bucket exista, PRIVADO y con los dos límites puestos.
 *
 * ⚠️ `public: false` es la línea más importante de este archivo. Con el bucket
 * público, la ruta sirve sola y el ebook pago se baja sin comprarlo: todo el
 * diseño del token no sirve de nada. Es una palabra, y no la ve nadie hasta que
 * es tarde.
 *
 * Los otros dos los aplica Supabase sobre el archivo REAL, que es lo único que
 * queda del lado del servidor cuando los bytes ya no pasan por acá. */
let bucketListo = false;
async function asegurarBucket({ supabaseUrl, serviceRoleKey }: Config): Promise<string | null> {
  if (bucketListo) return null;
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
  const body = JSON.stringify({
    id: BUCKET_DIGITALES,
    name: BUCKET_DIGITALES,
    public: false,
    file_size_limit: MAX_PDF_BYTES,
    allowed_mime_types: [TIPO_PDF],
  });

  // Primero actualizar; si no existe todavía, crear.
  const actualizado = await fetch(`${supabaseUrl}/storage/v1/bucket/${BUCKET_DIGITALES}`, {
    method: "PUT",
    headers,
    body,
  }).catch(() => null);

  if (!actualizado?.ok) {
    const creado = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: "POST",
      headers,
      body,
    }).catch(() => null);
    if (!creado?.ok) {
      /* Se devuelve lo que contestó Supabase y no un "no se pudo" a secas. Este
         mismo paso ya falló una vez con un 413 —el tope pedido era más alto que
         el global del proyecto— y sin el texto de la respuesta el error que
         llegaba arriba no decía absolutamente nada. */
      const detalle = creado ? await creado.text().catch(() => "") : "sin respuesta";
      return `Supabase rechazó la configuración del bucket (${creado?.status ?? "?"}): ${detalle.slice(0, 300)}`;
    }
  }

  bucketListo = true;
  return null;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  /* El rol se mira acá y no sólo en el layout: el layout dibuja pantallas y esto
     habilita una escritura en el storage. Una cuenta de tienda no tiene nada que
     subir a este bucket. */
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  /* Firmar es barato pero no gratis: cada permiso es una escritura habilitada.
     30 por hora alcanza de sobra para cargar un embudo entero con sus bonos y
     corregir alguno, y corta a quien use el bucket como depósito. */
  try {
    if (!(await checkRateLimit(`archivo-digital:${user.id}`, 30, 60 * 60_000))) {
      return NextResponse.json(
        { error: "Subiste muchos archivos seguidos. Probá de nuevo en un rato." },
        { status: 429 }
      );
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/archivo/firma");
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { productoId, tipo, tamano } = body as Record<string, unknown>;
  if (typeof productoId !== "string" || !productoId) {
    return NextResponse.json({ error: "Falta decir de qué producto es el archivo" }, { status: 400 });
  }

  const problemaArchivo = validarSubida({ tipo, tamano });
  if (problemaArchivo) {
    /* 413 y no 400 cuando el problema es el tamaño: es lo que la pantalla usa
       para distinguir "no se pudo" de "es muy grande". */
    const esTamano = typeof tamano === "number" && tamano > MAX_PDF_BYTES;
    return NextResponse.json({ error: problemaArchivo }, { status: esTamano ? 413 : 400 });
  }

  /* ⚠️ Que el producto sea DE ESTA CUENTA. Sin esto, el id del producto lo elige
     el navegador: cualquiera podría firmar un permiso apuntando al producto de
     otra persona y, al confirmar, reemplazarle el ebook que vende. */
  const producto = await prisma.product.findFirst({
    where: { id: productoId, store: { ownerId: user.id } },
    select: { id: true },
  });
  if (!producto) {
    return NextResponse.json({ error: "Ese producto no existe" }, { status: 404 });
  }

  const config = configDeSupabase();
  if (!config) {
    return NextResponse.json(
      { error: "Falta configurar Supabase Storage para subir archivos." },
      { status: 500 }
    );
  }

  const problemaBucket = await asegurarBucket(config);
  if (problemaBucket) {
    console.error("[archivo-digital]", problemaBucket);
    return NextResponse.json({ error: "No se pudo preparar la subida" }, { status: 502 });
  }

  const ruta = rutaDeArchivo(user.id, producto.id, randomUUID());

  const firmado = await fetch(
    `${config.supabaseUrl}/storage/v1/object/upload/sign/${BUCKET_DIGITALES}/${ruta}`,
    {
      method: "POST",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: MINUTOS_DEL_PERMISO * 60 }),
    }
  ).catch(() => null);

  if (!firmado?.ok) {
    const detalle = firmado ? await firmado.text().catch(() => "") : "sin respuesta";
    console.error("[archivo-digital] no se pudo firmar:", firmado?.status, detalle.slice(0, 300));
    return NextResponse.json({ error: "No se pudo preparar la subida" }, { status: 502 });
  }

  const datos = (await firmado.json().catch(() => null)) as { url?: string } | null;
  if (!datos?.url) {
    return NextResponse.json({ error: "No se pudo preparar la subida" }, { status: 502 });
  }

  return NextResponse.json({
    // A dónde manda el navegador los bytes.
    urlDeSubida: `${config.supabaseUrl}/storage/v1${datos.url}`,
    /* Y la ruta, que el navegador devuelve al confirmar. No es una dirección
       servible: sin el permiso firmado no abre nada. */
    ruta,
  });
}
