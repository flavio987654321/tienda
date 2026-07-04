import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// CUID2 / CUID pattern: solo alfanumérico, longitud razonable.
// Previene inyecciones y evita procesar IDs basura de bots.
const VALID_ID = /^[a-zA-Z0-9_-]{1,64}$/;

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

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
