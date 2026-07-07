import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth-session";
import { sendNewReviewToOwnerEmail } from "@/lib/email";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(_req.url);
  const productId = searchParams.get("productId");

  const store = await prisma.store.findUnique({ where: { slug }, select: { id: true } });
  if (!store) return NextResponse.json({ reviews: [] });

  function firstImage(images: string): string | null {
    try { const a = JSON.parse(images); return Array.isArray(a) && a[0] ? a[0] : null; }
    catch { return null; }
  }

  if (!productId) {
    const rows = await prisma.publicReview.findMany({
      where: { storeId: store.id, comment: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true, rating: true, comment: true, reviewer: true,
        verified: true, verifiedBy: true, createdAt: true,
        product: { select: { name: true, images: true } },
      },
    });
    const reviews = rows.map(r => ({
      ...r,
      product: { name: r.product.name, image: firstImage(r.product.images) },
    }));
    return NextResponse.json({ reviews });
  }

  const rows = await prisma.publicReview.findMany({
    where: { storeId: store.id, productId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, rating: true, comment: true, reviewer: true,
      verified: true, verifiedBy: true, createdAt: true,
      product: { select: { name: true, images: true } },
    },
  });
  const reviews = rows.map(r => ({
    ...r,
    product: { name: r.product.name, image: firstImage(r.product.images) },
  }));
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

  const { productId, rating, comment, reviewer, website, buyerEmail } = body;

  // Honeypot: bot detectado, responder con 201 falso para no revelar que fue bloqueado
  if (website) return NextResponse.json({ review: null }, { status: 201 });

  if (!productId || !rating || !reviewer?.trim()) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }
  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating inválido" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      ownerId: true,
      owner: { select: { email: true, name: true } },
      products: { where: { id: productId }, select: { id: true, name: true } },
    },
  });
  if (!store || !store.products.length) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  // Verificación automática: si viene email, buscar una Order DELIVERED de este comprador para este producto
  let verified = false;
  let verifiedBy: string | null = null;
  if (buyerEmail && typeof buyerEmail === "string" && buyerEmail.includes("@")) {
    const normalizedEmail = buyerEmail.trim().toLowerCase();
    const matchingOrder = await prisma.order.findFirst({
      where: {
        storeId: store.id,
        status: "DELIVERED",
        buyer: { email: { equals: normalizedEmail, mode: "insensitive" } },
        items: { some: { productId } },
      },
      select: { id: true },
    });
    if (matchingOrder) {
      verified = true;
      verifiedBy = "auto";
    }
  }

  const review = await prisma.publicReview.create({
    data: {
      storeId:    store.id,
      productId,
      rating:     Math.round(rating),
      comment:    comment?.trim() || null,
      reviewer:   reviewer.trim().slice(0, 80),
      verified,
      verifiedBy,
    },
    select: {
      id: true, rating: true, comment: true, reviewer: true,
      verified: true, verifiedBy: true, createdAt: true,
    },
  });

  const productName = store.products[0].name;
  const reviewerTrimmed = reviewer.trim().slice(0, 80);
  void Promise.all([
    prisma.notification.create({
      data: {
        userId:  store.ownerId,
        type:    "NEW_REVIEW",
        title:   "Nueva reseña recibida",
        body:    `${reviewerTrimmed} dejó ${Math.round(rating)}★ en ${productName}`,
        link:    "/dashboard/resenas",
      },
    }),
    sendNewReviewToOwnerEmail({
      ownerEmail:   store.owner.email!,
      storeName:    store.name,
      storeSlug:    slug,
      productId,
      productName,
      reviewerName: reviewerTrimmed,
      rating:       Math.round(rating),
      comment:      comment?.trim() || null,
    }),
  ]).catch(() => {});

  return NextResponse.json({ review }, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true, ownerId: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
  if (store.ownerId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { reviewId, verified } = body;
  if (!reviewId || typeof verified !== "boolean") {
    return NextResponse.json({ error: "reviewId y verified son requeridos" }, { status: 400 });
  }

  const existing = await prisma.publicReview.findFirst({
    where: { id: reviewId, storeId: store.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Reseña no encontrada" }, { status: 404 });

  const updated = await prisma.publicReview.update({
    where: { id: reviewId },
    data: {
      verified,
      verifiedBy: verified ? "owner" : null,
    },
    select: {
      id: true, verified: true, verifiedBy: true,
    },
  });

  return NextResponse.json({ review: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true, ownerId: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
  if (store.ownerId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { reviewId } = await req.json().catch(() => ({}));
  if (!reviewId) return NextResponse.json({ error: "reviewId requerido" }, { status: 400 });

  const review = await prisma.publicReview.findFirst({
    where: { id: reviewId, storeId: store.id },
    select: { id: true },
  });
  if (!review) return NextResponse.json({ error: "Reseña no encontrada" }, { status: 404 });

  await prisma.publicReview.delete({ where: { id: reviewId } });
  return NextResponse.json({ ok: true });
}
