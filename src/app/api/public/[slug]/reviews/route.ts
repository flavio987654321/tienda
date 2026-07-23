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
    const campos = {
      id: true, rating: true, comment: true, reviewer: true,
      verified: true, verifiedBy: true, createdAt: true,
      product: { select: { id: true, name: true, images: true } },
    } as const;

    const [deProducto, deTienda, stats] = await Promise.all([
      prisma.publicReview.findMany({
        where: { storeId: store.id, productId: { not: null }, comment: { not: null }, rating: { gte: 4 }, status: "APPROVED" },
        orderBy: { createdAt: "desc" }, take: 12, select: campos,
      }),
      // Las de tienda no se filtran por puntaje: ya pasaron por el dueño, que es
      // un filtro más fino que "4 o más". Filtrarlas otra vez sería descartar
      // algo que él eligió publicar a propósito.
      prisma.publicReview.findMany({
        where: { storeId: store.id, productId: null, comment: { not: null }, status: "APPROVED" },
        orderBy: { createdAt: "desc" }, take: 12, select: campos,
      }),
      // El promedio se saca sobre TODAS las publicadas —de los dos tipos— y no
      // solo sobre las que se muestran. Promediar únicamente las de 4★ y 5★
      // daría un número inflado que la tienda estaría publicando como si fuera
      // su reputación real. Las pendientes no cuentan: todavía no son públicas.
      prisma.publicReview.aggregate({
        where: { storeId: store.id, status: "APPROVED" },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    // Una reseña de TIENDA no tiene producto. Va `null` explícito y no un objeto
    // vacío: quien lo lea tiene que decidir qué mostrar, no descubrir a mitad de
    // camino que el nombre es "".
    const conProducto = (rows: typeof deProducto) => rows.map(r => ({
      ...r,
      product: r.product
        ? { id: r.product.id, name: r.product.name, image: firstImage(r.product.images) }
        : null,
    }));

    return NextResponse.json({
      // `reviews` conserva el nombre viejo a propósito: los otros templates ya
      // leen esa clave y no hay que tocarlos para que sigan andando.
      reviews: conProducto(deProducto),
      storeReviews: conProducto(deTienda),
      stats: {
        promedio: stats._avg.rating ?? 0,
        total: stats._count._all,
      },
    });
  }

  // `status: APPROVED` por si acaso: hoy las de producto nacen aprobadas y no se
  // pueden despublicar, pero si algún día eso cambia, esta lista no tiene que ser
  // la que se entere último y muestre algo que no debía verse.
  const rows = await prisma.publicReview.findMany({
    where: { storeId: store.id, productId, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, rating: true, comment: true, reviewer: true,
      verified: true, verifiedBy: true, createdAt: true,
      product: { select: { id: true, name: true, images: true } },
    },
  });
  // Acá el producto siempre está —se filtró por `productId`— pero el tipo ya no
  // lo garantiza, y encadenar un `!` sería mentirle al compilador justo donde nos
  // acaba de avisar bien.
  const reviews = rows.map(r => ({
    ...r,
    product: r.product
      ? { id: r.product.id, name: r.product.name, image: firstImage(r.product.images) }
      : null,
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

  // Sin producto, la reseña habla de la tienda entera: de la atención, del envío,
  // de la experiencia. Es un tipo distinto, no un dato que falta.
  const esDeTienda = !productId;

  if (!rating || !reviewer?.trim()) {
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
    },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  // El producto se busca aparte, y solo si vino uno.
  //
  // Antes venía en el `select` de la tienda como `products: { where: { id:
  // productId } }`. Con `productId` en undefined, Prisma IGNORA el filtro y
  // devuelve TODOS los productos: la validación de "producto no encontrado"
  // pasaba igual, y el mail al dueño salía nombrando un producto cualquiera de
  // la lista. Una reseña de tienda habría llegado disfrazada de reseña de otra
  // cosa.
  let producto: { id: string; name: string } | null = null;
  if (!esDeTienda) {
    producto = await prisma.product.findFirst({
      where: { id: productId, storeId: store.id },
      select: { id: true, name: true },
    });
    if (!producto) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }
  }

  // Verificación automática: si viene email, se busca un pedido ENTREGADO de esa
  // persona en esta tienda.
  //
  // Para una reseña de PRODUCTO tiene que haber comprado ESE producto. Para una
  // de TIENDA alcanza con haber comprado cualquier cosa acá: está opinando de la
  // atención y del envío, no de un artículo, y exigirle un producto puntual
  // dejaría sin sello a quien compró tres veces cosas distintas.
  let verified = false;
  let verifiedBy: string | null = null;
  if (buyerEmail && typeof buyerEmail === "string" && buyerEmail.includes("@")) {
    const normalizedEmail = buyerEmail.trim().toLowerCase();
    const matchingOrder = await prisma.order.findFirst({
      where: {
        storeId: store.id,
        status: "DELIVERED",
        buyer: { email: { equals: normalizedEmail, mode: "insensitive" } },
        ...(producto ? { items: { some: { productId: producto.id } } } : {}),
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
      productId:  producto?.id ?? null,
      rating:     Math.round(rating),
      comment:    comentario,
      reviewer:   reviewer.trim().slice(0, RESENADOR_MAX),
      verified,
      verifiedBy,
      // Las de producto salen publicadas al toque: están atadas a algo concreto
      // y le sirven a quien está por comprar ese producto. Las de tienda esperan
      // al dueño, porque van derecho a la portada y no hace falta ni fingir que
      // compraste para dejar una.
      status:     esDeTienda ? "PENDING" : "APPROVED",
    },
    select: {
      id: true, rating: true, comment: true, reviewer: true,
      verified: true, verifiedBy: true, createdAt: true, status: true,
    },
  });

  const reviewerTrimmed = reviewer.trim().slice(0, RESENADOR_MAX);
  const estrellas = Math.round(rating);
  void Promise.all([
    prisma.notification.create({
      data: {
        userId:  store.ownerId,
        type:    "NEW_REVIEW",
        // El aviso dice de qué tipo es y, si espera aprobación, lo dice. Una
        // reseña pendiente que se anuncia igual que una publicada se queda sin
        // aprobar para siempre: nada empuja al dueño a entrar.
        title:   esDeTienda ? "Nueva reseña de tu tienda" : "Nueva reseña recibida",
        body:    esDeTienda
          ? `${reviewerTrimmed} dejó ${estrellas}★ sobre tu tienda — esperando que la aprobes`
          : `${reviewerTrimmed} dejó ${estrellas}★ en ${producto!.name}`,
        link:    "/dashboard/resenas",
      },
    }),
    sendNewReviewToOwnerEmail({
      ownerEmail:   store.owner.email!,
      storeName:    store.name,
      storeSlug:    slug,
      productId:    producto?.id ?? null,
      productName:  producto?.name ?? null,
      reviewerName: reviewerTrimmed,
      rating:       estrellas,
      comment:      comentario,
      pendiente:    esDeTienda,
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

  // Dos acciones distintas por el mismo verbo: marcar como verificada, o
  // publicar/despublicar. Se piden por separado y nunca las dos juntas, así una
  // no puede pisar la otra por accidente.
  const { reviewId, verified, status } = body;
  const cambiaVerificacion = typeof verified === "boolean";
  const cambiaEstado = status === "APPROVED" || status === "PENDING";

  if (!reviewId || (!cambiaVerificacion && !cambiaEstado)) {
    return NextResponse.json({ error: "Hace falta reviewId y una acción: `verified` o `status`" }, { status: 400 });
  }

  const existing = await prisma.publicReview.findFirst({
    where: { id: reviewId, storeId: store.id },
    select: { id: true, productId: true },
  });
  if (!existing) return NextResponse.json({ error: "Reseña no encontrada" }, { status: 404 });

  // Una reseña de producto se publica sola y no tiene cola de aprobación. Dejar
  // que se la ponga en PENDING sería darle al dueño una forma de esconder las
  // malas de sus productos sin borrarlas — que es exactamente lo que el filtro
  // de la portada evita tener que hacer.
  if (cambiaEstado && existing.productId) {
    return NextResponse.json(
      { error: "Las reseñas de un producto no se aprueban ni se despublican: se publican solas." },
      { status: 400 }
    );
  }

  const updated = await prisma.publicReview.update({
    where: { id: reviewId },
    data: {
      ...(cambiaVerificacion && { verified, verifiedBy: verified ? "owner" : null }),
      ...(cambiaEstado && { status }),
    },
    select: {
      id: true, verified: true, verifiedBy: true, status: true,
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
