import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  BUCKET_DIGITALES,
  MAX_PDF_BYTES,
  refDeArchivo,
  nombreDeArchivo,
  avisoDePeso,
} from "@/lib/subida-digital";

export const runtime = "nodejs";

/**
 * Cierra la subida: comprueba que el archivo esté DE VERDAD en el bucket y recién
 * ahí lo escribe en el producto.
 *
 * ── Por qué existe una segunda ruta ─────────────────────────────────────────
 *
 * Porque el paso del medio —los bytes— no pasa por nosotros. Si `archivoPath` se
 * guardara al firmar el permiso, una subida cortada a la mitad dejaría el
 * producto apuntando a un archivo que no existe, `loQueFalta` lo daría por listo
 * y se podría publicar. Se cobra y no hay nada que entregar.
 *
 * ── Y por qué el servidor va a MIRAR el archivo ─────────────────────────────
 *
 * Este pedido lo manda el navegador, así que "ya lo subí" es una afirmación de
 * la parte interesada. Sin comprobarla, alcanza con llamar acá sin haber subido
 * nada para marcar el producto como entregable. Por eso se le pregunta a
 * Supabase si el objeto existe, y de paso se le cree a él el tamaño y no al
 * navegador.
 */

type Config = { supabaseUrl: string; serviceRoleKey: string };

function configDeSupabase(): Config | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return { supabaseUrl, serviceRoleKey };
}

/**
 * Le pregunta a Supabase por el objeto. Devuelve el tamaño real en bytes, o
 * `null` si no está.
 *
 * Va con `HEAD` sobre la ruta autenticada: no baja el archivo —serían 50 MB por
 * cada confirmación— y contesta con `content-length`.
 */
async function pesoReal({ supabaseUrl, serviceRoleKey }: Config, ruta: string): Promise<number | null> {
  const res = await fetch(`${supabaseUrl}/storage/v1/object/authenticated/${BUCKET_DIGITALES}/${ruta}`, {
    method: "HEAD",
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  }).catch(() => null);

  if (!res?.ok) return null;
  const largo = Number(res.headers.get("content-length"));
  return Number.isFinite(largo) && largo > 0 ? largo : null;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    if (!(await checkRateLimit(`archivo-confirmar:${user.id}`, 60, 60 * 60_000))) {
      return NextResponse.json(
        { error: "Demasiados intentos seguidos. Esperá un momento." },
        { status: 429 }
      );
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/archivo/confirmar");
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { productoId, ruta, nombre } = body as Record<string, unknown>;
  if (typeof productoId !== "string" || !productoId) {
    return NextResponse.json({ error: "Falta decir de qué producto es el archivo" }, { status: 400 });
  }
  if (typeof ruta !== "string" || !ruta) {
    return NextResponse.json({ error: "Falta la ruta del archivo" }, { status: 400 });
  }

  /* ⚠️ La ruta la manda el navegador, así que se comprueba que sea una de las
     que ESTE usuario puede haber recibido. `rutaDeArchivo` la arma empezando por
     el id de la cuenta; sin esta línea, alguien podría confirmar apuntando al
     archivo de otra persona y quedarse con su ebook en su propio producto.
     El `..` se rechaza aparte: `a/../../b` empieza bien y sale igual. */
  if (!ruta.startsWith(`${user.id}/`) || ruta.includes("..")) {
    return NextResponse.json({ error: "Esa ruta no es tuya" }, { status: 403 });
  }

  /* Y que el producto sea de esta cuenta, por lo mismo que en la firma. */
  const producto = await prisma.product.findFirst({
    where: { id: productoId, store: { ownerId: user.id } },
    select: { id: true },
  });
  if (!producto) {
    return NextResponse.json({ error: "Ese producto no existe" }, { status: 404 });
  }

  const config = configDeSupabase();
  if (!config) {
    return NextResponse.json({ error: "Falta configurar Supabase Storage." }, { status: 500 });
  }

  /* Acá está el chequeo que justifica toda la ruta: ¿existe el archivo? */
  const peso = await pesoReal(config, ruta);
  if (peso === null) {
    return NextResponse.json(
      { error: "No encontramos el archivo subido. Probá de nuevo." },
      { status: 409 }
    );
  }
  /* El bucket ya rechaza lo que se pase, así que esto no debería saltar nunca.
     Está por si algún día alguien afloja el `file_size_limit` sin acordarse de
     que este número también existe. */
  if (peso > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "El archivo subido es más grande de lo permitido." }, { status: 413 });
  }

  const actualizado = await prisma.product.update({
    where: { id: producto.id },
    data: {
      archivoPath: refDeArchivo(ruta),
      archivoNombre: nombreDeArchivo(nombre),
      // El tamaño sale de Supabase, no del navegador: es el único de los dos que
      // vio el archivo de verdad.
      archivoPeso: peso,
    },
    select: { id: true, archivoNombre: true, archivoPeso: true },
  });

  return NextResponse.json({
    ok: true,
    archivoNombre: actualizado.archivoNombre,
    archivoPeso: actualizado.archivoPeso,
    // No bloquea nada: es para que la pantalla lo muestre al lado del archivo.
    aviso: avisoDePeso(peso),
  });
}
