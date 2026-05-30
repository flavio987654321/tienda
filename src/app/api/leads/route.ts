import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

// POST /api/leads — el cliente genera una consulta al presionar "Consultar por WhatsApp"
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storeId, affiliateId, productId, productName, productPrice, customerName, customerPhone, customerMessage } = body;

    if (!storeId || !productName || productPrice == null) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, affiliatesEnabled: true, commissionRate: true },
    });
    if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

    let resolvedAffiliateId: string | null = null;
    if (affiliateId) {
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
