import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { consultaGeneraComision } from "@/lib/storeTypes";
import { checkRateLimitConRespaldo } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

// POST /api/leads — el cliente genera una consulta al presionar "Consultar por WhatsApp"
export async function POST(req: NextRequest) {
  /* Sin sesión y sin techo era el endpoint más fácil de inundar de todo el
     proyecto: cualquiera con el id de una tienda podía escribirle mil consultas
     falsas y taparle la bandeja al dueño, que es justo donde le entran los
     interesados de verdad.
     Va por IP y no por tienda: el que consulta no está logueado, y limitar por
     tienda dejaría que una sola persona le tape la bandeja a muchas. Diez por
     hora es de sobra para alguien mirando autos.
     Con respaldo porque acá no se paga nada por uso: si Redis se cae, es mejor
     seguir tomando consultas con un techo aproximado que rechazarlas todas. */
  const ip = getClientIp(req);
  const { permitido } = await checkRateLimitConRespaldo(`lead:${ip}`, 10, 60 * 60_000, {
    limiteFallback: 10,
    limiteFallbackGlobal: 200,
  });
  if (!permitido) {
    return NextResponse.json(
      { error: "Enviaste muchas consultas seguidas. Esperá un momento." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const { storeId, affiliateId, productId, leadId, customerName, customerPhone, customerMessage } = body ?? {};

    if (typeof storeId !== "string" || typeof productId !== "string" || !storeId || !productId) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, ownerId: true, commissionRate: true, tipoTienda: true, isActive: true, isPublished: true, closedAt: true, owner: { select: { banned: true } } },
    });
    // Una tienda sin publicar, cerrada o de un dueño baneado no toma consultas
    // (06/10/26): antes se guardaban igual y le llenaban la bandeja a nadie.
    if (!store || !store.isActive || !store.isPublished || store.closedAt || store.owner?.banned) {
      return NextResponse.json({ error: "Esta tienda no está disponible" }, { status: 404 });
    }

    /* Techo por TIENDA, además del de IP (06/10/26). El de IP solo no alcanza:
       rotando IPs se le tapaba la bandeja a una tienda con cientos de consultas
       falsas. 200 por hora es muchísimo más de lo que recibe una concesionaria. */
    const porTienda = await checkRateLimitConRespaldo(`lead-tienda:${store.id}`, 200, 60 * 60_000, {
      limiteFallback: 200,
      limiteFallbackGlobal: 2000,
    });
    if (!porTienda.permitido) {
      return NextResponse.json({ error: "La tienda está recibiendo muchas consultas. Probá en un rato o escribile por WhatsApp." }, { status: 429 });
    }

    /* ── El precio sale de la BASE, no del navegador (05/10/26) ──────────────
       La comisión del afiliado se calcula con `productPrice` al confirmar la
       consulta. Antes ese número lo mandaba quien hacía el POST: un afiliado
       (su id es público, va en los links `?ref=`) podía crear una consulta con
       el precio inflado y, si la dueña la confirmaba, cobrar la comisión sobre
       un auto que no valía eso. Tampoco se miraba que el producto fuera de esta
       tienda. Ahora el nombre y el precio son los del producto real, y si no es
       de la tienda no hay consulta.
       Y tiene que estar a la venta (06/10/26): un vehículo vendido u oculto no
       toma consultas aunque el modal haya quedado abierto. Uno RESERVADO sí:
       sigue visible y alguien puede querer quedar primero en la lista. */
    const product = await prisma.product.findFirst({
      where: { id: productId, storeId: store.id, deletedAt: null, isActive: true },
      select: { id: true, name: true, price: true },
    });
    if (!product) return NextResponse.json({ error: "Este vehículo ya no está disponible" }, { status: 404 });

    // Textos libres: sólo texto, sin caracteres de control y con tope de largo.
    const texto = (v: unknown, max: number) =>
      typeof v === "string" && v.trim() ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max) : null;
    const datos = {
      customerName: texto(customerName, 80),
      customerPhone: texto(customerPhone, 30),
      customerMessage: texto(customerMessage, 1000),
    };

    /* ── Completar la consulta que abrió el botón de WhatsApp (06/10/26) ─────
       Tocar WhatsApp registra la consulta sin datos (el chat sigue afuera). Si
       después la persona deja nombre y teléfono en el formulario, se completan
       en ESA consulta en vez de crear otra: la dueña ve una sola fila, con
       contacto. Sólo la que se acaba de abrir (30 min), del mismo vehículo y
       todavía sin datos: el id solo lo tiene el navegador que la creó. */
    if (typeof leadId === "string" && leadId) {
      const completada = await prisma.lead.updateMany({
        where: {
          id: leadId, storeId: store.id, productId: product.id, status: "PENDING",
          customerName: null, customerPhone: null,
          createdAt: { gte: new Date(Date.now() - 30 * 60_000) },
        },
        data: datos,
      });
      if (completada.count > 0) return NextResponse.json({ leadId }, { status: 200 });
      // Si no se pudo (venció, ya tenía datos), se crea una nueva abajo.
    }

    /* El corte que importa de verdad, porque acá es donde nacería la comisión.
       Una consulta no cobra nada por la plataforma, así que sólo genera
       comisión en un rubro que vende POR consulta y tiene afiliados habilitados
       (`consultaGeneraComision`; hoy, ninguno). Si no, la consulta se guarda
       igual —el dueño la necesita— pero sin afiliado y sin porcentaje. */
    let resolvedAffiliateId: string | null = null;
    if (typeof affiliateId === "string" && affiliateId && consultaGeneraComision(store.tipoTienda)) {
      const aff = await prisma.affiliate.findFirst({
        where: { id: affiliateId, storeId, isActive: true },
        select: { id: true },
      });
      if (aff) resolvedAffiliateId = aff.id;
    }

    const lead = await prisma.lead.create({
      data: {
        storeId,
        affiliateId: resolvedAffiliateId,
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        ...datos,
        status: "PENDING",
        commissionRate: resolvedAffiliateId ? store.commissionRate : null,
      },
    });

    return NextResponse.json({ leadId: lead.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// GET /api/leads — el dueño ve sus consultas
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const countOnly = url.searchParams.get("count") === "1";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1") || 1);
  const take = 20;

  const where = { storeId: store.id, ...(status ? { status } : {}) };

  if (countOnly) {
    const count = await prisma.lead.count({ where });
    return NextResponse.json({ count });
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
      include: {
        affiliate: { select: { id: true, user: { select: { name: true, email: true } } } },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({ leads, total, page, pages: Math.ceil(total / take) });
}
