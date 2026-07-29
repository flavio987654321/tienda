import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { createNotification } from "@/lib/notifications";
import { sendNewReviewToOwnerEmail } from "@/lib/email";
import { ESTADOS_VENTA_CONFIRMADA_LISTA } from "@/lib/order-status";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "productId requerido" }, { status: 400 });

  const user = await getCurrentUser();

  const [reviews, reviewStats, userReview, eligibleOrder] = await Promise.all([
    prisma.review.findMany({
      where: { productId },
      include: { user: { select: { name: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { id: true },
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
            order: { buyerId: user.id, status: { in: ESTADOS_VENTA_CONFIRMADA_LISTA } },
          },
          select: { orderId: true },
        })
      : null,
  ]);

  const avg = reviewStats._avg.rating ?? 0;
  const total = reviewStats._count.id;
  const canReview = !!eligibleOrder && !userReview;

  return NextResponse.json({
    reviews,
    avg,
    total,
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
    where: { orderId, productId, order: { buyerId: user.id, status: { in: ESTADOS_VENTA_CONFIRMADA_LISTA } } },
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

  // Avisar a la dueña de la tienda — no debe bloquear ni romper la
  // respuesta si falla, la reseña ya quedó guardada.
  prisma.product
    .findUnique({
      where: { id: productId },
      select: {
        name: true,
        store: { select: { id: true, slug: true, ownerId: true, name: true, owner: { select: { email: true } } } },
      },
    })
    .then((product) => {
      if (!product) return;
      const reviewerName = review.user.name || "Una compradora";
      createNotification({
        userId: product.store.ownerId,
        type: "NEW_REVIEW",
        title: "Nueva reseña recibida",
        body: `${rating}★ en ${product.name} — ${reviewerName}`,
        link: `/tienda/${product.store.slug}/producto/${productId}`,
      });
      if (product.store.owner?.email) {
        sendNewReviewToOwnerEmail({
          ownerEmail: product.store.owner.email,
          storeName: product.store.name,
          storeSlug: product.store.slug,
          productId,
          productName: product.name,
          reviewerName,
          rating,
          comment,
        }).catch((e) => console.error("[email] nueva reseña:", e));
      }

      prisma.storeActivityEvent.create({
        data: {
          storeId: product.store.id,
          type: "NEW_REVIEW",
          data: JSON.stringify({
            rating,
            productName: product.name.slice(0, 50),
            reviewerName: reviewerName.slice(0, 30),
          }),
        },
      }).catch((e) => console.error("[activity] review:", e));

      prisma.review.count({ where: { product: { storeId: product.store.id } } })
        .then((count) => {
          if (count === 1) {
            return prisma.storeMilestone.upsert({
              where: { storeId_type: { storeId: product.store.id, type: "FIRST_REVIEW" } },
              create: { storeId: product.store.id, type: "FIRST_REVIEW" },
              update: {},
            });
          }
        })
        .catch((e) => console.error("[milestone] first review:", e));
    })
    .catch((e) => console.error("[reviews] aviso a dueña:", e));

  return NextResponse.json(review, { status: 201 });
}
