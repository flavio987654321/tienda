import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// GET - obtiene la meta del mes actual para la tienda del afiliado (vista afiliado)
// o para la tienda del dueño (vista dueño, query param ?owner=1)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const isOwner = searchParams.get("owner") === "1";
  const month = searchParams.get("month") ?? currentMonth();

  if (isOwner) {
    const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
    if (!store) return NextResponse.json({ error: "No tenés tienda" }, { status: 404 });

    const goal = await prisma.affiliateGoal.findUnique({
      where: { storeId_month: { storeId: store.id, month } },
    });
    return NextResponse.json({ goal, month });
  }

  // Vista afiliado: devuelve las metas de todas sus tiendas activas + progreso
  const affiliates = await prisma.affiliate.findMany({
    where: { userId: user.id, isActive: true, status: "APPROVED" },
    select: { id: true, storeId: true, store: { select: { name: true } } },
  });

  const results = await Promise.all(
    affiliates.map(async (aff) => {
      const goal = await prisma.affiliateGoal.findUnique({
        where: { storeId_month: { storeId: aff.storeId, month } },
      });

      if (!goal) return { storeId: aff.storeId, storeName: aff.store.name, goal: null, earned: 0, progress: 0 };

      // Sumar comisiones PAGADAS del mes
      const startOfMonth = new Date(`${month}-01T00:00:00Z`);
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      const commissions = await prisma.commission.aggregate({
        where: {
          affiliateId: aff.id,
          status: "PAID",
          createdAt: { gte: startOfMonth, lt: endOfMonth },
        },
        _sum: { amount: true },
      });

      const earned = commissions._sum.amount ?? 0;
      const progress = Math.min(Math.round((earned / goal.targetAmount) * 100), 100);

      return {
        storeId: aff.storeId,
        storeName: aff.store.name,
        goal,
        earned,
        progress,
        month,
      };
    })
  );

  return NextResponse.json({ goals: results.filter((r) => r.goal !== null), month });
}

// PUT - dueño crea/actualiza la meta del mes
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) return NextResponse.json({ error: "No tenés tienda" }, { status: 404 });

  const body = await req.json();
  const month = body.month ?? currentMonth();
  const targetAmount = parseFloat(body.targetAmount);

  if (!targetAmount || targetAmount < 1000) {
    return NextResponse.json({ error: "La meta mínima es $1.000" }, { status: 400 });
  }

  /* `bonusRate` ya no se pide ni se actualiza, y se escribe en 0.
   *
   * Una meta prometía un porcentaje extra de comisión al que la superara, y ese
   * extra NO lo acredita nadie: la columna se guardaba, se dibujaba en las dos
   * pantallas y ahí terminaba. Prometer plata que no se paga es lo peor que
   * puede hacer un panel de comisiones, y encima choca con los términos que el
   * dueño acepta, que prohíben arreglar compensaciones por fuera de la
   * plataforma.
   *
   * Para que el bonus exista de verdad hay que resolver antes de dónde sale la
   * plata: la comisión normal se retiene de cada venta cuando entra el pago, y
   * un premio de fin de mes no tiene venta de la cual retenerse. Eso es un
   * mecanismo de cobro nuevo, no un campo más.
   *
   * La columna queda en la base —sigue siendo `Float` obligatorio, por eso el
   * 0— para no migrar de ida y de vuelta si algún día se construye. Lo que se
   * va es la promesa, no el lugar donde guardarla. */
  const goal = await prisma.affiliateGoal.upsert({
    where: { storeId_month: { storeId: store.id, month } },
    create: { storeId: store.id, month, targetAmount, bonusRate: 0 },
    update: { targetAmount },
  });

  return NextResponse.json({ goal });
}

// DELETE - dueño elimina la meta del mes
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) return NextResponse.json({ error: "No tenés tienda" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") ?? currentMonth();

  await prisma.affiliateGoal.deleteMany({
    where: { storeId: store.id, month },
  });

  return NextResponse.json({ ok: true });
}
