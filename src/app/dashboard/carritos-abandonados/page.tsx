export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import CarritosAbandonadosClient from "./CarritosAbandonadosClient";

const PAGE_SIZE = 15;

type SnapshotItem = { name: string; price: number; qty: number; image?: string | null };
type Props = { searchParams: Promise<{ page?: string; q?: string }> };

export default async function CarritosAbandonadosPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { page: pageParam, q: qParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const search = (qParam ?? "").trim();

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, slug: true, name: true },
  });

  const where = store
    ? {
        storeId: store.id,
        recoveredAt: null,
        ...(search
          ? {
              OR: [
                { customerName: { contains: search, mode: "insensitive" as const } },
                { customerEmail: { contains: search, mode: "insensitive" as const } },
                { customerPhone: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      }
    : null;

  const [carts, total, totalPending, recoveredCount, recoveredRevenue] = store
    ? await Promise.all([
        prisma.abandonedCart.findMany({
          where: where!,
          orderBy: { lastActivityAt: "desc" },
          take: PAGE_SIZE,
          skip: (page - 1) * PAGE_SIZE,
        }),
        prisma.abandonedCart.count({ where: where! }),
        prisma.abandonedCart.count({ where: { storeId: store.id, recoveredAt: null } }),
        prisma.abandonedCart.count({ where: { storeId: store.id, recoveredAt: { not: null } } }),
        prisma.abandonedCart.aggregate({
          where: { storeId: store.id, recoveredAt: { not: null } },
          _sum: { total: true },
        }),
      ])
    : [[], 0, 0, 0, { _sum: { total: null } }];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const rows = carts.map((cart) => {
    let items: SnapshotItem[] = [];
    try {
      items = JSON.parse(cart.items);
    } catch { /* noop */ }
    return {
      id: cart.id,
      customerName: cart.customerName,
      customerEmail: cart.customerEmail,
      customerPhone: cart.customerPhone,
      items,
      total: cart.total,
      lastActivityAt: cart.lastActivityAt.toISOString(),
      reminderSent: Boolean(cart.reminderSentAt),
    };
  });

  const stats = {
    pending: totalPending,
    recovered: recoveredCount,
    recoveredRevenue: recoveredRevenue._sum.total ?? 0,
  };

  return (
    <DashboardLayout userName={user.name} userEmail={user.email} userId={user.id}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Carritos abandonados</h1>
        <p className="text-gray-500 mt-1 max-w-2xl text-sm">
          Personas que dejaron su contacto en el checkout pero no completaron la compra.
          El sistema les manda un recordatorio automático por email al cabo de 1 hora.
          También podés contactarlos vos directamente por email o WhatsApp, y opcionalmente ofrecerles un cupón de descuento para cerrar la venta.
        </p>
      </div>

      <CarritosAbandonadosClient
        carts={rows}
        search={search || undefined}
        storeSlug={store?.slug ?? ""}
        storeName={store?.name ?? ""}
        stats={stats}
        page={page}
        totalPages={totalPages}
        total={total}
      />
    </DashboardLayout>
  );
}
