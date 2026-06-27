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
    select: { id: true },
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

  const [carts, total] = store
    ? await Promise.all([
        prisma.abandonedCart.findMany({
          where: where!,
          orderBy: { lastActivityAt: "desc" },
          take: PAGE_SIZE,
          skip: (page - 1) * PAGE_SIZE,
        }),
        prisma.abandonedCart.count({ where: where! }),
      ])
    : [[], 0];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/dashboard/carritos-abandonados?${qs}` : "/dashboard/carritos-abandonados";
  }

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

  return (
    <DashboardLayout userName={user.name} userEmail={user.email} userId={user.id}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Carritos abandonados</h1>
        <p className="text-gray-500 mt-1">
          Personas que dejaron datos de contacto en el checkout pero no completaron la compra. Les mandamos un recordatorio automático; también podés reenviarlo manualmente.
        </p>
      </div>

      <form action="/dashboard/carritos-abandonados" method="get" className="mb-5">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Buscar por nombre, email o teléfono..."
          className="w-full max-w-md rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none"
        />
      </form>

      <CarritosAbandonadosClient carts={rows} search={search || undefined} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-6">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Link>
          ) : <span />}
          <p className="text-sm text-gray-400">Página {page} de {totalPages}</p>
          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </Link>
          ) : <span />}
        </div>
      )}
    </DashboardLayout>
  );
}
