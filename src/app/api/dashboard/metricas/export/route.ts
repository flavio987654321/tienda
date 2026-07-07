import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true, slug: true },
  });
  if (!store) return NextResponse.json({ error: "Sin tienda" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const raw = parseInt(searchParams.get("range") ?? "30", 10);
  const range = isNaN(raw) || raw < 7 ? 30 : Math.min(raw, 90);

  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const days: { dateStr: string; revenue: number; orders: number; visits: number }[] = [];
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date(todayUtc);
    d.setUTCDate(d.getUTCDate() - i);
    days.push({ dateStr: d.toISOString().slice(0, 10), revenue: 0, orders: 0, visits: 0 });
  }

  const startDate = new Date(days[0].dateStr + "T00:00:00.000Z");
  const endDate = new Date(todayUtc);
  endDate.setUTCDate(endDate.getUTCDate() + 1);

  const CONFIRMED = ["CONFIRMED", "SHIPPED", "DELIVERED"];

  const [orders, views] = await Promise.all([
    prisma.order.findMany({
      where: { storeId: store.id, createdAt: { gte: startDate, lt: endDate }, status: { not: "CANCELLED" } },
      select: { total: true, status: true, createdAt: true },
    }),
    prisma.storeView.findMany({
      where: { storeId: store.id, date: { gte: days[0].dateStr, lte: days[days.length - 1].dateStr } },
      select: { date: true, count: true },
    }).catch(() => [] as { date: string; count: number }[]),
  ]);

  for (const o of orders) {
    const dateStr = o.createdAt.toISOString().slice(0, 10);
    const day = days.find(d => d.dateStr === dateStr);
    if (day) {
      day.orders++;
      if (CONFIRMED.includes(o.status)) day.revenue += o.total;
    }
  }
  for (const v of views) {
    const day = days.find(d => d.dateStr === v.date);
    if (day) day.visits += v.count;
  }

  const totalRevenue = days.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = days.reduce((s, d) => s + d.orders, 0);
  const totalVisits = days.reduce((s, d) => s + d.visits, 0);

  const safeName = store.name.replace(/[",\r\n]/g, " ").trim();
  const lines = [
    `# Métricas de ${safeName} — últimos ${range} días`,
    `# Exportado el ${new Date().toLocaleDateString("es-AR")}`,
    ``,
    `# RESUMEN`,
    `Ingresos totales,${totalRevenue}`,
    `Pedidos totales,${totalOrders}`,
    `Visitas totales,${totalVisits}`,
    `Ticket promedio,${totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0}`,
    ``,
    `# DETALLE DIARIO`,
    `Fecha,Ingresos (ARS),Pedidos,Visitas`,
    ...days.map(d => `${d.dateStr},${d.revenue},${d.orders},${d.visits}`),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="metricas-${store.slug}-${range}d.csv"`,
    },
  });
}
