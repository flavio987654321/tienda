import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const { newType } = await req.json();
  if (!newType) return NextResponse.json({ error: "Falta el nuevo tipo de tienda" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    // ── Pedidos y sus dependientes ──
    await tx.orderStatusLog.deleteMany({ where: { order: { storeId: store.id } } });
    await tx.orderItem.deleteMany({ where: { order: { storeId: store.id } } });
    await tx.payment.deleteMany({ where: { order: { storeId: store.id } } });
    await tx.shipping.deleteMany({ where: { order: { storeId: store.id } } });
    await tx.order.deleteMany({ where: { storeId: store.id } });

    // ── Productos y sus dependientes ──
    await tx.review.deleteMany({ where: { product: { storeId: store.id } } });
    await tx.publicReview.deleteMany({ where: { storeId: store.id } });
    await tx.favorite.deleteMany({ where: { product: { storeId: store.id } } });
    await tx.product.deleteMany({ where: { storeId: store.id } });

    // ── Consultas y cupones ──
    await tx.lead.deleteMany({ where: { storeId: store.id } });
    await tx.coupon.deleteMany({ where: { storeId: store.id } });

    // ── Campañas push y visitas ──
    await tx.pushCampaign.deleteMany({ where: { storeId: store.id } });
    await tx.storeView.deleteMany({ where: { storeId: store.id } });

    // ── Afiliados: goals, clicks y comisiones ──
    await tx.affiliateGoal.deleteMany({ where: { storeId: store.id } });
    await tx.affiliateClick.deleteMany({ where: { storeId: store.id } });
    await tx.commission.deleteMany({ where: { affiliate: { storeId: store.id } } });
    await tx.walletWithdrawal.deleteMany({ where: { wallet: { affiliate: { storeId: store.id } } } });
    await tx.wallet.deleteMany({ where: { affiliate: { storeId: store.id } } });
    // ── Actualizar tipo + resetear template y contenido visual ──
    // Se conservan: logo, colores, fuente, redes sociales, MercadoPago, verificación
    await tx.store.update({
      where: { id: store.id },
      data: {
        tipoTienda: newType,
        tipoTiendaConfigurado: true,
        // Template y config del editor → arrancar de cero (los templates son tipo-específicos)
        templateId: "default",
        storeConfig: "{}",
        previewImage: null,
        // Bloques de página y nav → limpiar (estaban pensados para el tipo anterior)
        pageBlocks: "[]",
        navLinks: "[]",
        // Anuncio → limpiar
        announcementBar: null,
        // Layout de productos → volver al default
        productLayout: "grid3",
        heroStyle: "full",
        // No publicar hasta que el nuevo tipo esté configurado
        isPublished: false,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
