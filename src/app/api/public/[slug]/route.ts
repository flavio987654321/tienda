import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const withSales = searchParams.get("withSales") === "1";

  const [store, currentUser] = await Promise.all([
    prisma.store.findFirst({
      where: { slug, isActive: true },
      include: {
        products: {
          where: { isActive: true, deletedAt: null },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            comparePrice: true,
            featured: true,
            precioMayorista: true,
            cantMinMayorista: true,
            preciosEscalonados: true,
            soloMayorista: true,
            cuotas: true,
            images: true,
            category: true,
            subcategory: true,
            reelUrls: true,
            gender: true,
            attributes: true,
            variants: {
              select: { id: true, name: true, value: true, stock: true, price: true },
              orderBy: { id: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 500,
        },
      },
    }),
    getCurrentUser(),
  ]);
  if (!store) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  const isOwner = !!currentUser && currentUser.id === store.ownerId;
  const hasMercadoPago = !!store.mpAccessToken;

  // El access/refresh token de Mercado Pago y la dirección física de
  // despacho (usada server-side para cotizar envío) nunca deben llegar al
  // navegador del visitante (este endpoint es público).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { mpAccessToken, mpRefreshToken, originStreet, originCity, originProvince, originPostalCode, ...safeStore } = store;

  // Productos marcados como "solo mayorista" no deben enviarse al navegador de
  // visitantes de tiendas que no tienen venta mayorista habilitada.
  // El filtrado ocurre AQUÍ en el servidor, nunca en el cliente, para que el
  // dato nunca viaje al navegador de un comprador retail.
  const visibleProducts = store.tieneVentaMayorista
    ? store.products
    : store.products.filter((p) => !p.soloMayorista);

  // Ranking de ventas — solo se calcula cuando se pide explícitamente (ej: panel de afiliadas)
  // para no sumar una consulta extra en cada visita normal de un comprador a la tienda.
  if (!withSales) return NextResponse.json({ store: { ...safeStore, products: visibleProducts }, isOwner, hasMercadoPago });

  const salesAgg = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: { storeId: store.id, status: { in: ["CONFIRMED", "SHIPPED", "DELIVERED"] } } },
    _sum: { quantity: true },
  });
  const salesMap = Object.fromEntries(salesAgg.map((s) => [s.productId, s._sum.quantity ?? 0]));
  const storeWithSales = {
    ...safeStore,
    products: visibleProducts
      .map((p) => ({ ...p, salesCount: salesMap[p.id] ?? 0 }))
      .sort((a, b) => b.salesCount - a.salesCount),
  };

  return NextResponse.json({ store: storeWithSales, isOwner, hasMercadoPago });
}
