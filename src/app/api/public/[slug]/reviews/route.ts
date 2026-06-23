import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(_req.url);
  const productId = searchParams.get("productId");
  if (!productId) return NextResponse.json({ reviews: [] });

  const store = await prisma.store.findUnique({ where: { slug }, select: { id: true } });
  if (!store) return NextResponse.json({ reviews: [] });

  const reviews = await prisma.publicReview.findMany({
    where: { storeId: store.id, productId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, rating: true, comment: true, reviewer: true, createdAt: true },
  });

  return NextResponse.json({ reviews });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!(await checkRateLimit(`review:${ip}`, 3, 10 * 60_000))) {
    return NextResponse.json({ error: "Demasiadas reseñas. Esperá un momento." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { productId, rating, comment, reviewer } = body;
  if (!productId || !rating || !reviewer?.trim()) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }
  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating inválido" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true, products: { where: { id: productId }, select: { id: true } } },
  });
  if (!store || !store.products.length) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  const review = await prisma.publicReview.create({
    data: {
      storeId:   store.id,
      productId,
      rating:    Math.round(rating),
      comment:   comment?.trim() || null,
      reviewer:  reviewer.trim().slice(0, 80),
    },
    select: { id: true, rating: true, comment: true, reviewer: true, createdAt: true },
  });

  return NextResponse.json({ review }, { status: 201 });
}
