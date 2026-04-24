import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "productId requerido" }, { status: 400 });

  const user = await getCurrentUser();

  const [reviews, userReview, eligibleOrder] = await Promise.all([
    prisma.review.findMany({
      where: { productId },
      include: { user: { select: { name: true, image: true } } },
      orderBy: { createdAt: "desc" },
    }),
    user
      ? prisma.review.findUnique({
          where: { userId_productId: { userId: user.id, productId } },
          select: { id: true, rating: true, comment: true },
        })
      : null,
    user
      ? prisma.orderItem.findFirst({
          where: {
            productId,
            order: { buyerId: user.id, status: { in: ["CONFIRMED", "SHIPPED", "DELIVERED"] } },
          },
          select: { orderId: true },
        })
      : null,
  ]);

  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const canReview = !!eligibleOrder && !userReview;

  return NextResponse.json({
    reviews,
    avg,
    total: reviews.length,
    canReview,
    eligibleOrderId: eligibleOrder?.orderId ?? null,
    userReview: userReview ?? null,
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const productId = String(body.productId || "").trim();
  const orderId = String(body.orderId || "").trim();
  const rating = Math.floor(Number(body.rating));
  const comment = body.comment?.trim() || null;

  if (!productId || !orderId) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "El rating debe ser un número entero entre 1 y 5" }, { status: 400 });
  }
  if (comment && comment.length > 1000) {
    return NextResponse.json({ error: "El comentario no puede superar 1000 caracteres" }, { status: 400 });
  }

  // Verificar que el usuario compró este producto en este pedido
  const orderItem = await prisma.orderItem.findFirst({
    where: { orderId, productId, order: { buyerId: user.id, status: { in: ["CONFIRMED", "SHIPPED", "DELIVERED"] } } },
  });
  if (!orderItem) {
    return NextResponse.json({ error: "Solo podés reseñar productos que compraste y fueron confirmados" }, { status: 403 });
  }

  const existing = await prisma.review.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Ya reseñaste este producto" }, { status: 409 });
  }

  const review = await prisma.review.create({
    data: { userId: user.id, productId, orderId, rating, comment },
    include: { user: { select: { name: true, image: true } } },
  });

  return NextResponse.json(review, { status: 201 });
}
