import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getStoreSnapshot, getChecklistEstado } from "@/lib/asistente-insights";

export const dynamic = "force-dynamic";

// Sasha puede mencionar una acción (ej. "te faltan productos") basándose en lo
// que el modelo entendió de los datos del prompt, pero el botón solo debe
// mostrarse si la base de datos confirma que ese problema sigue siendo real
// AHORA — nunca confiar ciegamente en lo que generó el texto del modelo.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.role !== "OWNER") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      id: true,
      tipoTienda: true,
      isPublished: true,
      isVerified: true,
      logo: true,
      storeConfig: true,
      mpConnectedAt: true,
      _count: { select: { products: true } },
    },
  });
  if (!store) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const [snapshot, checklist] = await Promise.all([
    getStoreSnapshot(store.id, store.tipoTienda),
    Promise.resolve(
      getChecklistEstado({
        isPublished: store.isPublished,
        logo: store.logo,
        storeConfig: store.storeConfig,
        mpConnectedAt: store.mpConnectedAt,
        productCount: store._count.products,
        isVerified: store.isVerified,
      })
    ),
  ]);

  return NextResponse.json({
    CARRITOS_ABANDONADOS: snapshot.carritosAbandonadosPendientes > 0,
    PEDIDOS_PENDIENTES: snapshot.pedidosPendientes > 0,
    STOCK_BAJO: snapshot.productosStockBajo > 0,
    FALTA_DISENO: !checklist.hasTemplate,
    FALTA_PRODUCTOS: !checklist.hasProducts,
    FALTA_COBRO: !(checklist.hasMercadoPago || checklist.hasPaymentData),
  });
}
