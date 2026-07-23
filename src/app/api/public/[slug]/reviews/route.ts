import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth-session";
import { sendNewReviewToOwnerEmail } from "@/lib/email";
import { getClientIp } from "@/lib/request-ip";
import { verifyTurnstile } from "@/lib/turnstile";
import { parseFirstImage } from "@/lib/metaFeed";
import { COMENTARIO_MAX, RESENADOR_MAX } from "@/lib/reviews";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(_req.url);
  const productId = searchParams.get("productId");

  const store = await prisma.store.findUnique({ where: { slug }, select: { id: true } });
  if (!store) return NextResponse.json({ reviews: [] });

  // `images` guarda `[{ url, variantValue }]`, no `["url"]`. La copia local que
  // había acá devolvía el OBJETO entero como si fuera la URL, así que la foto del
  // producto en las reseñas nunca se vio: al template le llegaba un objeto donde
  // esperaba un string. `parseFirstImage` entiende las dos formas —quedan
  // productos viejos guardados como lista de strings— y es la que usa el resto
  // del sistema.
  const firstImage = parseFirstImage;

  // ── Portada ────────────────────────────────────────────────────────────────
  // Sin `productId` esto alimenta el bloque de prueba social de la home, que es
  // la parte más visible de la tienda.
  //
  // Antes traía las 12 más recientes con comentario, sin mirar el puntaje: una
  // reseña de 1★ ("no me llegó nunca") aparecía en la portada, abajo del título
  // "Lo que dicen nuestras clientas", al instante y antes de que el dueño llegara
  // a leer el mail de aviso. El único remedio era borrarla.
  //
  // A la PORTADA suben solo las de 4★ y 5★. No es censura: la reseña mala sigue
  // publicada y visible en su producto, que es donde le sirve a quien está por
  // comprar ese producto. Lo que deja de pasar es que la elija como cartel de
  // entrada de la tienda alguien que no es el dueño.
  if (!productId) {
    const [rows, stats] = await Promise.all([
      prisma.publicReview.findMany({
        where: { storeId: store.id, comment: { not: null }, rating: { gte: 4 } },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true, rating: true, comment: true, reviewer: true,
          verified: true, verifiedBy: true, createdAt: true,
          product: { select: { id: true, name: true, images: true } },
        },
      }),
      // El promedio se saca sobre TODAS las reseñas, no solo sobre las que se
      // muestran. Promediar únicamente las de 4★ y 5★ daría un número inflado
      // que la tienda estaría publicando como si fuera su reputación real.
      prisma.publicReview.aggregate({
        where: { storeId: store.id },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);
    const reviews = rows.map(r => ({
      ...r,
      product: { id: r.product.id, name: r.product.name, image: firstImage(r.product.images) },
    }));
    return NextResponse.json({
      reviews,
      stats: {
        promedio: stats._avg.rating ?? 0,
        total: stats._count._all,
      },
    });
  }

  const rows = await prisma.publicReview.findMany({
    where: { storeId: store.id, productId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, rating: true, comment: true, reviewer: true,
      verified: true, verifiedBy: true, createdAt: true,
      product: { select: { id: true, name: true, images: true } },
    },
  });
  const reviews = rows.map(r => ({
    ...r,
    product: { id: r.product.id, name: r.product.name, image: firstImage(r.product.images) },
  }));
  return NextResponse.json({ reviews });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const ip = getClientIp(req);
  if (!(await checkRateLimit(`review:${ip}`, 3, 10 * 60_000))) {
    return NextResponse.json({ error: "Demasiadas reseñas. Esperá un momento." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { productId, rating, comment, reviewer, website, buyerEmail, turnstileToken } = body;

  // Honeypot: bot detectado, responder con 201 falso para no revelar que fue bloqueado
  if (website) return NextResponse.json({ review: null }, { status: 201 });

  if (!productId || !rating || !reviewer?.trim()) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }
  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating inválido" }, { status: 400 });
  }

  // El comentario NO tenía ningún tope: ni en el formulario ni acá. `reviewer` sí
  // lo tenía (80), el comentario no. Cualquiera podía mandar un texto de megas
  // por POST —sin pasar por el formulario— y quedaba guardado y publicado.
  //
  // Y no era solo la base: las tarjetas de la portada están en una fila que las
  // estira a todas al alto de la más alta. Una sola reseña larguísima dejaba la
  // portada arruinada hasta que el dueño la borrara a mano.
  //
  // El tope va acá y no solo en el formulario porque el del formulario se saltea
  // mandando el POST directo. Se recorta en vez de rechazar: quien escribió de
  // más igual dejó su reseña, no pierde lo que puso.
  const comentario = typeof comment === "string" ? comment.trim().slice(0, COMENTARIO_MAX) || null : null;

  // Captcha al final: un error de campos no consume el token (es de un solo uso)
  if (!(await verifyTurnstile(turnstileToken, ip, "review"))) {
    return NextResponse.json({ error: "No pudimos verificar que sos una persona. Intentá de nuevo." }, { status: 400 });
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
      comment:    comentario,
      reviewer:   reviewer.trim().slice(0, RESENADOR_MAX),
      verified,
      verifiedBy,
    },
    select: {
      id: true, rating: true, comment: true, reviewer: true,
      verified: true, verifiedBy: true, createdAt: true,
    },
  });

  const productName = store.products[0].name;
  const reviewerTrimmed = reviewer.trim().slice(0, RESENADOR_MAX);
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
      comment:      comentario,
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
