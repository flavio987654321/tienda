import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  BUCKET_DIGITALES,
  MAX_PDF_BYTES,
  refDeArchivo,
  rutaDeRef,
  nombreDeArchivo,
  avisoDePeso,
} from "@/lib/subida-digital";
import { configDeposito, borrarDelDeposito, type ConfigDeposito } from "@/lib/deposito-digital";

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

/**
 * Le pregunta a Supabase por el objeto. Devuelve el tamaño real en bytes, o
 * `null` si no está.
 *
 * Va con `HEAD` sobre la ruta autenticada: no baja el archivo —serían 50 MB por
 * cada confirmación— y contesta con `content-length`.
 */
async function pesoReal({ supabaseUrl, serviceRoleKey }: ConfigDeposito, ruta: string): Promise<number | null> {
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
     que ESTE usuario puede haber recibido para ESTE producto. `rutaDeArchivo`
     la arma como `<cuenta>/<producto>/…`, así que se piden los dos tramos.

     Con la cuenta sola no alcanzaba, y no es teórico: alguien podía confirmar
     la ruta del archivo de SU producto A sobre su producto B. Los dos quedaban
     apuntando al MISMO objeto, y el día que reemplazara el archivo de A —que
     borra el objeto viejo, unas líneas más abajo— B quedaba publicado
     apuntando a la nada: se cobra y no hay nada que entregar. Es exactamente
     el fallo que estas dos rutas existen para evitar.

     El `..` se rechaza aparte: `a/../../b` empieza bien y sale igual. */
  if (!ruta.startsWith(`${user.id}/${productoId}/`) || ruta.includes("..")) {
    return NextResponse.json({ error: "Esa ruta no es tuya" }, { status: 403 });
  }

  /* Y que el producto sea de esta cuenta, por lo mismo que en la firma.
     Se trae el `archivoPath` de ahora porque si esto es un reemplazo hay que
     borrar el de antes; ver abajo. */
  const producto = await prisma.product.findFirst({
    /* `deletedAt: null` por lo mismo que en la firma: confirmar sobre un
       producto borrado deja un archivo que nadie va a alcanzar nunca. */
    where: { id: productoId, deletedAt: null, store: { ownerId: user.id } },
    select: { id: true, archivoPath: true },
  });
  if (!producto) {
    return NextResponse.json({ error: "Ese producto no existe" }, { status: 404 });
  }

  const config = configDeposito();
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

  /* ⚠️ Borrar el archivo de antes, si esto era un reemplazo.
   *
   * Sin esto, cada vez que alguien cambia el PDF queda uno viejo en el bucket
   * que **ya no apunta a ningún lado y no se puede alcanzar**: lo pagamos para
   * siempre sin que le sirva a nadie.
   *
   * Y no es sólo desprolijo, es una puerta: el permiso se puede pedir 30 veces
   * por hora, y a 50 MB cada uno son **1,5 GB por hora por cuenta** — en un plan
   * gratis que no pide tarjeta. Con el borrado, reemplazar cien veces deja un
   * archivo, no cien.
   *
   * Va DESPUÉS de guardar y a propósito: si se borrara antes y el guardado
   * fallara, el producto quedaría apuntando a un archivo que ya no está. Y si
   * falla el borrado no se corta el pedido —el producto ya apunta bien, que es
   * lo que importa—; queda el registro para poder barrerlo después. */
  const anterior = rutaDeRef(producto.archivoPath);
  if (anterior && anterior !== ruta) {
    const borrado = await borrarDelDeposito(config, anterior);
    if (borrado === "fallo") {
      console.error("[archivo-digital] quedó huérfano:", anterior);
    }
  }

  return NextResponse.json({
    ok: true,
    archivoNombre: actualizado.archivoNombre,
    archivoPeso: actualizado.archivoPeso,
    // No bloquea nada: es para que la pantalla lo muestre al lado del archivo.
    aviso: avisoDePeso(peso),
  });
}
