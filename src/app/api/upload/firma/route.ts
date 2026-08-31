import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  BUCKET_VIDEOS,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_MB,
  TIPOS_VIDEO,
  EXTENSION_DE_VIDEO,
  MINUTOS_DEL_PERMISO,
} from "@/lib/subida-directa";

export const runtime = "nodejs";

/**
 * Firma un permiso para que el NAVEGADOR suba un video directo a Supabase.
 *
 * Acá no viaja el archivo — viaja su nombre, su tipo y su tamaño. El porqué
 * largo está en `lib/subida-directa`: el cuerpo de un pedido tiene un techo de
 * 4,5 MB en producción, y el formulario prometía 50.
 *
 * Lo que devuelve es un permiso de un solo uso, para UNA ruta que elige el
 * servidor y por media hora.
 */

type Config = { supabaseUrl: string; serviceRoleKey: string };

function configDeSupabase(): Config | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return { supabaseUrl, serviceRoleKey };
}

/* Que el bucket exista Y con los dos límites puestos.
   Los dos importan y los aplica Supabase sobre el archivo de verdad, que es lo
   único que queda del lado del servidor cuando los bytes ya no pasan por acá:
   `allowed_mime_types` es lo que impide que un permiso firmado "para un video"
   sirva para subir un HTML a un bucket público. */
let bucketListo = false;
async function asegurarBucket({ supabaseUrl, serviceRoleKey }: Config): Promise<string | null> {
  if (bucketListo) return null;
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
  const body = JSON.stringify({
    id: BUCKET_VIDEOS,
    name: BUCKET_VIDEOS,
    public: true,
    file_size_limit: MAX_VIDEO_BYTES,
    allowed_mime_types: [...TIPOS_VIDEO],
  });

  // Primero actualizar; si no existe todavía, crear.
  const actualizado = await fetch(`${supabaseUrl}/storage/v1/bucket/${BUCKET_VIDEOS}`, {
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
      /* Se devuelve lo que contestó Supabase, no un "no se pudo" a secas. Este
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

  /* Firmar es barato pero no gratis: cada permiso es una escritura habilitada en
     el storage. 20 por hora alcanza de sobra para cargar productos con sus tres
     videos y corta el que quiera usar la cuenta como depósito. */
  if (!(await checkRateLimit(`firma-video:${user.id}`, 20, 60 * 60_000))) {
    return NextResponse.json(
      { error: "Subiste muchos videos seguidos. Probá de nuevo en un rato." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const tipoContenido = typeof body?.tipoContenido === "string" ? body.tipoContenido : "";
  const tamano = typeof body?.tamano === "number" ? body.tamano : -1;

  if (!TIPOS_VIDEO.has(tipoContenido)) {
    return NextResponse.json(
      { error: "Ese formato de video no se puede subir. Usá MP4, WEBM, MOV u OGG." },
      { status: 400 }
    );
  }
  /* Este chequeo es cortesía: avisa antes de empezar a subir 50 MB. El que
     manda es el `file_size_limit` del bucket, porque lo aplica Supabase sobre
     los bytes reales y no sobre un número que declara el navegador. */
  if (!Number.isFinite(tamano) || tamano <= 0 || tamano > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { error: `El video no puede superar ${MAX_VIDEO_MB} MB` },
      { status: 413 }
    );
  }

  const config = configDeSupabase();
  if (!config) {
    return NextResponse.json(
      { error: "Falta configurar Supabase Storage para subir archivos." },
      { status: 500 }
    );
  }

  const problema = await asegurarBucket(config);
  if (problema) {
    console.error("[subida-directa]", problema);
    return NextResponse.json({ error: "No se pudo preparar la subida" }, { status: 502 });
  }

  /* La ruta la arma el SERVIDOR. Si la eligiera el navegador podría escribir
     sobre el video de otra tienda con sólo mandar su ruta. Del nombre original
     no se usa nada —ni siquiera la extensión, que sale del tipo declarado—
     porque un nombre puede traer `../` adentro. */
  const extension = EXTENSION_DE_VIDEO[tipoContenido] ?? "mp4";
  const ruta = `store-videos/${user.id}/${Date.now()}-${randomUUID()}.${extension}`;

  const firmado = await fetch(
    `${config.supabaseUrl}/storage/v1/object/upload/sign/${BUCKET_VIDEOS}/${ruta}`,
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
    console.error("[subida-directa] no se pudo firmar:", firmado?.status, detalle.slice(0, 300));
    return NextResponse.json({ error: "No se pudo preparar la subida" }, { status: 502 });
  }

  const datos = (await firmado.json().catch(() => null)) as { url?: string } | null;
  if (!datos?.url) {
    return NextResponse.json({ error: "No se pudo preparar la subida" }, { status: 502 });
  }

  return NextResponse.json({
    // A dónde manda el navegador los bytes.
    urlDeSubida: `${config.supabaseUrl}/storage/v1${datos.url}`,
    // Y con qué dirección queda el video una vez subido. La arma el servidor
    // para que el navegador no pueda inventarse una que apunte a otra cosa.
    urlFinal: `${config.supabaseUrl}/storage/v1/object/public/${BUCKET_VIDEOS}/${ruta}`,
  });
}
