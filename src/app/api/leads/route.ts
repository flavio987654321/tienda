import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { soportaAfiliados } from "@/lib/storeTypes";
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
    const body = await req.json();
    const { storeId, affiliateId, productId, productName, productPrice, customerName, customerPhone, customerMessage } = body;

    if (!storeId || !productName || productPrice == null) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, affiliatesEnabled: true, commissionRate: true, tipoTienda: true },
    });
    if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

    /* El corte que importa de verdad, porque acá es donde nacería la comisión:
       si el rubro no tiene afiliados habilitados, la consulta se guarda igual
       —el dueño la necesita— pero sin dueño de la comisión y sin porcentaje.
       La consulta sigue funcionando; lo único que no pasa es que se prometa
       plata que todavía no sabemos cómo pagar. */
    let resolvedAffiliateId: string | null = null;
    if (affiliateId && soportaAfiliados(store.tipoTienda)) {
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
        productId: productId || null,
        productName,
        productPrice: Number(productPrice),
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        customerMessage: customerMessage || null,
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
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
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
