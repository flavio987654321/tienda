import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { rutaDeArchivo, refDeArchivo, rutaDeRef, nombreDeArchivo } from "@/lib/subida-digital";
import { configDeposito, subirAlDeposito, borrarDelDeposito } from "@/lib/deposito-digital";
import { leerIndice, leerCapitulos } from "@/lib/ebook-ia";
import { armarPDF } from "@/lib/ebook-pdf";
import { estadoDelBorrador, tomarElCandado, soltarElCandado } from "@/lib/ebook-borrador";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Armar el PDF y colgarlo del producto.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LA ÚNICA DE LAS TRES QUE NO LLAMA AL MODELO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Todo lo que se escribe ya está guardado. Acá se junta, se dibuja el PDF, se
 * sube al depósito y recién ahí se le pone al producto — en ese orden, que es
 * el mismo de la subida a mano y por el mismo motivo: si se guardara la
 * referencia antes de que el archivo esté arriba, el producto quedaría
 * apuntando a algo que no existe, `loQueFalta` lo daría por listo y se podría
 * publicar. **Se cobra y no hay nada que entregar.**
 *
 * ── Por qué también toma el candado ────────────────────────────────────────
 *
 * Porque dos pedidos a la vez subirían dos archivos y el producto se quedaría
 * con uno solo: el otro queda en el depósito sin que nadie lo pueda alcanzar, y
 * lo pagamos para siempre.
 */

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }

  /* No llama al modelo, así que no lleva los topes de IA. Sí un freno común:
     esto sube archivos y escribe en la base. */
  try {
    if (!(await checkRateLimit(`ebook-armar:${user.id}`, 30, 60 * 60_000))) {
      return NextResponse.json({ error: "Demasiados intentos seguidos. Esperá un momento." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/ia/ebook/armar");
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const productoId = typeof body?.productoId === "string" ? body.productoId : "";
  if (!productoId) {
    return NextResponse.json({ error: "Falta decir de qué producto es el ebook." }, { status: 400 });
  }

  const producto = await prisma.product.findFirst({
    where: { id: productoId, deletedAt: null, store: { ownerId: user.id } },
    select: {
      id: true,
      archivoPath: true,
      store: { select: { name: true } },
      ebookIA: {
        select: {
          id: true, estado: true, titulo: true, indice: true, capitulos: true,
          trabajandoDesde: true, error: true, reintentos: true,
        },
      },
    },
  });
  if (!producto?.ebookIA) {
    return NextResponse.json({ error: "Este producto todavía no tiene un ebook empezado." }, { status: 404 });
  }

  const ebook = producto.ebookIA;
  const indice = leerIndice(ebook.indice);
  const capitulos = leerCapitulos(ebook.capitulos);

  /* ⚠️ No se arma un ebook al que le falta un capítulo. Sería entregar un
     archivo cortado a la mitad, y encima marcar el producto como entregable. */
  if (capitulos.length === 0 || capitulos.length < indice.length) {
    return NextResponse.json({
      error: "Todavía falta escribir algún capítulo.",
      ebook: estadoDelBorrador(ebook),
    }, { status: 409 });
  }

  const config = configDeposito();
  if (!config) {
    return NextResponse.json({ error: "Falta configurar Supabase Storage." }, { status: 500 });
  }

  const marca = await tomarElCandado(ebook.id);
  if (!marca) {
    return NextResponse.json({
      error: "Se está armando en este momento. Esperá unos segundos.",
      ebook: estadoDelBorrador(ebook),
    }, { status: 409 });
  }

  let pdf: Buffer;
  try {
    pdf = await armarPDF({
      titulo: ebook.titulo,
      /* La promesa de la tapa no se guardó aparte: el resumen del primer
         capítulo cumple la misma función y sale del mismo temario. */
      promesa: indice[0]?.resumen ?? "",
      /* Quién lo vende. El ebook es de esa persona, no nuestro. */
      autor: producto.store?.name ?? "",
      capitulos,
    });
  } catch (e) {
    console.error("[ia-ebook-armar] falló el armado del PDF", { ebookId: ebook.id, e });
    await soltarElCandado(ebook.id, marca, "No pudimos armar el PDF.");
    return NextResponse.json({ error: "No pudimos armar el PDF. Probá de nuevo." }, { status: 500 });
  }

  /* La ruta la arma el servidor, nunca el cliente: si la eligiera el navegador
     podría escribir encima del archivo de otra cuenta con sólo mandar su ruta. */
  const ruta = rutaDeArchivo(user.id, producto.id, randomUUID());

  const subido = await subirAlDeposito(config, ruta, pdf);
  if (!subido) {
    await soltarElCandado(ebook.id, marca, "No pudimos guardar el archivo.");
    return NextResponse.json({ error: "No pudimos guardar el archivo. Probá de nuevo." }, { status: 502 });
  }

  /* Recién ahora se le pone al producto: el archivo ya está arriba. */
  const anterior = rutaDeRef(producto.archivoPath);
  try {
    await prisma.$transaction([
      prisma.product.update({
        where: { id: producto.id },
        data: {
          archivoPath: refDeArchivo(ruta),
          archivoNombre: nombreDeArchivo(`${ebook.titulo}.pdf`),
          archivoPeso: pdf.length,
        },
      }),
      prisma.ebookIA.update({
        where: { id: ebook.id },
        data: { estado: "LISTO", trabajandoDesde: null, error: null },
      }),
    ]);
  } catch (e) {
    console.error("[ia-ebook-armar] no se pudo guardar la referencia", { ebookId: ebook.id, e });
    /* El archivo quedó arriba sin que nadie lo apunte. Se borra para no
       pagarlo para siempre; si el borrado falla, queda anotado. */
    if ((await borrarDelDeposito(config, ruta)) === "fallo") {
      console.error("[ia-ebook-armar] quedó huérfano:", ruta);
    }
    await soltarElCandado(ebook.id, marca, "No pudimos guardar el archivo.");
    return NextResponse.json({ error: "No pudimos guardar el archivo. Probá de nuevo." }, { status: 500 });
  }

  /* ⚠️ Borrar el de antes, si esto reemplazó a un archivo que ya estaba.
     Sin esto, cada ebook rehecho deja uno viejo en el depósito que ya no apunta
     a ningún lado. Va DESPUÉS de guardar: si se borrara antes y el guardado
     fallara, el producto quedaría apuntando a un archivo que ya no está. */
  if (anterior && anterior !== ruta) {
    if ((await borrarDelDeposito(config, anterior)) === "fallo") {
      console.error("[ia-ebook-armar] quedó huérfano el anterior:", anterior);
    }
  }

  return NextResponse.json({
    ok: true,
    listo: true,
    peso: pdf.length,
    ebook: estadoDelBorrador({ ...ebook, estado: "LISTO", trabajandoDesde: null, error: null }),
  });
}
