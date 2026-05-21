import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { createNotificationMany } from "@/lib/notifications";

// GET — devuelve los bloqueadores y el nombre de la tienda
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      name: true,
      orders: {
        where: { status: { in: ["PENDING", "PROCESSING"] } },
        select: { id: true },
      },
      affiliates: {
        where: { isActive: true },
        select: { wallet: { select: { balance: true } } },
      },
    },
  });

  if (!store) return NextResponse.json({ storeName: "", pendingOrders: 0, pendingBalances: 0 });

  const pendingOrders = store.orders.length;
  const pendingBalances = store.affiliates
    .filter((a) => a.wallet && a.wallet.balance > 0)
    .reduce((sum, a) => sum + (a.wallet?.balance ?? 0), 0);

  return NextResponse.json({ storeName: store.name, pendingOrders, pendingBalances });
}

// DELETE — elimina la tienda o la cuenta completa
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { target, confirm } = await req.json() as { target: "store" | "account"; confirm: string };

  if (!["store", "account"].includes(target)) {
    return NextResponse.json({ error: "Target inválido" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    include: {
      orders: {
        where: { status: { in: ["PENDING", "PROCESSING"] } },
        select: { id: true },
      },
      affiliates: {
        where: { isActive: true },
        select: { userId: true, wallet: { select: { balance: true } } },
      },
    },
  });

  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  // Validar confirmación
  if (confirm !== store.name) {
    return NextResponse.json({ error: "El nombre ingresado no coincide con el de tu tienda" }, { status: 400 });
  }

  // Verificar bloqueadores
  const pendingOrders = store.orders.length;
  const pendingBalances = store.affiliates
    .filter((a) => a.wallet && a.wallet.balance > 0)
    .reduce((sum, a) => sum + (a.wallet?.balance ?? 0), 0);

  if (pendingOrders > 0 || pendingBalances > 0) {
    return NextResponse.json({ error: "Bloqueado", pendingOrders, pendingBalances }, { status: 409 });
  }

  // Notificar a afiliados activos
  const affiliateUserIds = store.affiliates.map((a) => a.userId);
  if (affiliateUserIds.length > 0) {
    await createNotificationMany(
      affiliateUserIds.map((userId) => ({
        userId,
        type: "STORE_CLOSED",
        title: `${store.name} cerró su tienda`,
        body: "Tu link de afiliado fue desactivado. Los saldos ya acreditados en tu billetera siguen disponibles para retirar.",
        link: "/vendedoras",
      }))
    );
  }

  // Desactivar afiliados y ocultar tienda (soft delete)
  await prisma.$transaction([
    prisma.affiliate.updateMany({
      where: { storeId: store.id, isActive: true },
      data: { isActive: false, status: "REMOVED" },
    }),
    prisma.store.update({
      where: { id: store.id },
      data: {
        isActive: false,
        isPublished: false,
        affiliatesEnabled: false,
        name: `[Eliminada] ${store.name}`,
        slug: `deleted-${store.id}`,
      },
    }),
  ]);

  // Si elimina cuenta: anonimizar datos personales (conserva historial por AFIP)
  if (target === "account") {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: "Usuario eliminado",
        email: `deleted_${user.id}@deleted.mitienda.ar`,
        password: null,
        image: null,
        bio: null,
        phone: null,
        instagramHandle: null,
      },
    });
  }

  return NextResponse.json({ ok: true, target });
}
