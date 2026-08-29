import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  DIGITAL_BUCKET,
  MAX_ARCHIVO_DIGITAL_MB,
  MAX_ARCHIVO_DIGITAL_BYTES,
  TIPOS_ARCHIVO_DIGITAL,
} from "@/lib/descargas";

export const runtime = "nodejs";

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * POST /api/upload/firma-digital → permiso para subir el archivo DIRECTO a Supabase.
 *
 * ── Por qué no pasa por nosotros ─────────────────────────────────────────────
 *
 * La subida normal (`/api/upload`) manda el archivo a nuestro servidor y desde
 * ahí a Supabase. Eso choca contra dos techos que no ponemos nosotros: Next
 * corta el cuerpo del pedido en 10 MB y la plataforma donde corre producción lo
 * corta bastante antes. Un archivo más pesado llega CORTADO, el servidor no lo
 * puede leer y contesta un 500 sin explicar nada.
 *
 * Acá el archivo no toca nuestro servidor: le firmamos al navegador un permiso
 * de subida y él se lo manda a Supabase. Los dos techos desaparecen, la subida
 * es más rápida y nuestro servidor deja de mover megas al pedo.
 *
 * ── Qué se cuida al no ver el archivo ────────────────────────────────────────
 *
 * Si el archivo no pasa por acá, no podemos mirarle los bytes. Lo que se hace en
 * su lugar es apretar el BUCKET, que es lo que Supabase sí aplica sin
 * preguntarnos: tope de peso y lista de tipos permitidos quedan configurados en
 * el bucket mismo. Un cliente que mienta el tipo o mande algo más pesado se
 * choca contra Supabase, no contra un `if` nuestro que podría saltearse.
 *
 * Y la RUTA la elige el servidor, nunca el cliente: si el navegador pudiera
 * pedir dónde escribir, podría pisar el archivo de otra tienda.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!(await checkRateLimit(`firma-digital:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS))) {
    return NextResponse.json({ error: "Demasiadas subidas en poco tiempo. Esperá un momento." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const nombre = typeof body?.nombre === "string" ? body.nombre : "";
  const tipo = typeof body?.tipo === "string" ? body.tipo : "";
  const peso = Number(body?.peso);

  if (!nombre || !tipo) {
    return NextResponse.json({ error: "Faltan datos del archivo" }, { status: 400 });
  }
  if (!TIPOS_ARCHIVO_DIGITAL.has(tipo)) {
    return NextResponse.json(
      { error: "Solo se permiten PDF, Word, Excel, PowerPoint, ZIP, EPUB, TXT o imágenes" },
      { status: 400 }
    );
  }
  /* El peso lo declara el cliente, así que este chequeo es sólo para darle un
     mensaje claro antes de que empiece a subir. El que MANDA es el tope del
     bucket, que Supabase aplica sobre los bytes de verdad. */
  if (!Number.isFinite(peso) || peso <= 0 || peso > MAX_ARCHIVO_DIGITAL_BYTES) {
    return NextResponse.json(
      { error: `El archivo no puede superar ${MAX_ARCHIVO_DIGITAL_MB} MB` },
      { status: 413 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Storage no configurado" }, { status: 500 });
  }

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };

  /* El bucket se crea o se actualiza con SUS PROPIOS límites. Es la diferencia
     con la subida vieja: acá el tope y los tipos no son un `if` que se ejecuta
     si el pedido pasa por nosotros — son configuración del bucket, y Supabase
     los aplica siempre, venga el archivo de donde venga.
     `public: false` es lo que hace que el archivo no tenga dirección propia. */
  const configBucket = JSON.stringify({
    id: DIGITAL_BUCKET,
    name: DIGITAL_BUCKET,
    public: false,
    file_size_limit: MAX_ARCHIVO_DIGITAL_BYTES,
    allowed_mime_types: [...TIPOS_ARCHIVO_DIGITAL],
  });
  const actualizado = await fetch(`${supabaseUrl}/storage/v1/bucket/${DIGITAL_BUCKET}`, {
    method: "PUT",
    headers,
    body: configBucket,
  }).catch(() => null);
  if (!actualizado?.ok) {
    // No existía todavía: se crea.
    const creado = await fetch(`${supabaseUrl}/storage/v1/bucket`, { method: "POST", headers, body: configBucket })
      .catch(() => null);
    if (!creado?.ok) {
      /* Se registra lo que CONTESTÓ Supabase, no un "no se pudo" a secas. Sin
         esto, un bucket que no se crea termina en un 502 mudo más abajo y hay
         que salir a preguntarle a Supabase a mano para enterarse del motivo.
         El caso real: `file_size_limit` por encima del tope global del proyecto
         devuelve 413 "The object exceeded the maximum allowed size" — el bucket
         no se crea y nada lo decía. */
      const detalle = await creado?.text().catch(() => "") ?? "(sin respuesta)";
      console.error("[firma-digital] no se pudo crear el bucket:", DIGITAL_BUCKET, creado?.status, detalle);
      return NextResponse.json(
        { error: "No se pudo preparar el espacio para el archivo. Avisale al equipo." },
        { status: 502 }
      );
    }
  }

  /* La ruta la arma el servidor. El nombre original NO se usa para armarla —
     sólo se le mira la extensión— porque un nombre puede traer barras, `..` o
     caracteres raros y terminaría escribiendo donde no va. */
  const extension = (nombre.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) || "bin";
  const ruta = `producto-digital/${Date.now()}-${randomUUID()}.${extension}`;

  const firma = await fetch(`${supabaseUrl}/storage/v1/object/upload/sign/${DIGITAL_BUCKET}/${ruta}`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  }).catch(() => null);

  const datos = (await firma?.json().catch(() => null)) as { url?: string; message?: string; error?: string } | null;
  if (!firma?.ok || !datos?.url) {
    // Con el motivo que dio Supabase: un 502 mudo obliga a salir a averiguarlo.
    console.error("[firma-digital] no se pudo firmar la subida", {
      bucket: DIGITAL_BUCKET,
      status: firma?.status,
      motivo: datos?.message || datos?.error || "(sin detalle)",
    });
    return NextResponse.json({ error: "No se pudo preparar la subida. Probá de nuevo." }, { status: 502 });
  }

  return NextResponse.json({
    // A dónde manda el navegador el archivo.
    urlDeSubida: `${supabaseUrl}/storage/v1${datos.url}`,
    // Lo que se guarda en el producto una vez que la subida terminó bien.
    archivoPath: `supabase://${DIGITAL_BUCKET}/${ruta}`,
  });
}
