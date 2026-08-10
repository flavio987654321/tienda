import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { visitaLegitima } from "@/lib/visita-legitima";

// CUID2 / CUID pattern: solo alfanumérico, longitud razonable.
// Previene inyecciones y evita procesar IDs basura de bots.
const VALID_ID = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Cuántas vistas de producto se le aceptan a una misma IP por hora.
 *
 * Este endpoint no tenía NINGÚN tope: ni bots, ni origen, ni límite. Validaba
 * bien que el producto fuera de esa tienda —o sea que nadie podía inflar el de
 * otra— pero después dejaba subir el contador en un bucle, y `viewCount` es lo
 * que ordena "Lo más visto" en la tienda. Con eso, cualquiera podía poner el
 * producto que quisiera arriba de todo en la vidriera de una tienda ajena.
 *
 * El cliente ya deduplica una vista por producto cada 24 h, así que una persona
 * real dispara una por producto que mira. 60 por hora deja recorrer un catálogo
 * entero de un tirón sin quedarse corto.
 */
const MAX_VISTAS_POR_IP = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!(await visitaLegitima(req, `product-view:${slug}`, MAX_VISTAS_POR_IP))) {
    return NextResponse.json({ ok: true, contada: false });
  }

  let productId: unknown;
  try {
    ({ productId } = await req.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (typeof productId !== "string" || !VALID_ID.test(productId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Verificar que el producto existe en ESTA tienda, está activo y no fue borrado.
  // Sin esta validación, cualquiera podría inflar viewCount de productos de otra tienda.
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      store: { slug, isActive: true },
      isActive: true,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!product) return NextResponse.json({ ok: false }, { status: 404 });

  // Incremento atómico — sin race conditions entre peticiones simultáneas.
  await prisma.product.update({
    where: { id: productId },
    data: { viewCount: { increment: 1 } },
  });

  return NextResponse.json({ ok: true });
}
