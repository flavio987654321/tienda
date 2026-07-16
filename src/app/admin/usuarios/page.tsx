import { prisma } from "@/lib/prisma";
import { getSubscriptionStatus } from "@/lib/subscription";
import UsuariosAdmin, { type User } from "./UsuariosAdmin";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const { f = "" } = await searchParams;

  const users = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
    orderBy: { createdAt: "desc" },
    include: {
      // currentPeriodEnd/gracePeriodEndsAt hacen falta para el estado REAL: en la
      // base el status queda "ACTIVE" aunque la suscripción esté vencida, y el
      // valor vivo lo calcula getSubscriptionStatus. El admin mostraba el crudo,
      // así que una tienda vencida se veía "Activa".
      subscription: { select: { status: true, plan: true, tier: true, role: true, trialEndsAt: true, currentPeriodEnd: true, gracePeriodEndsAt: true } },
      store: { select: { name: true, isPublished: true, closedAt: true } },
      _count: { select: { orders: true } },
    },
  });

  const serialized = users.map(u => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: undefined,
    subscription: u.subscription
      ? {
          ...u.subscription,
          trialEndsAt: u.subscription.trialEndsAt.toISOString(),
          // El estado real, calculado en el server, es lo que se muestra. `status`
          // (el crudo) se manda igual porque el modal decide las acciones con él.
          statusReal: getSubscriptionStatus(u.subscription),
        }
      : null,
    store: u.store
      ? { ...u.store, closedAt: u.store.closedAt?.toISOString() ?? null }
      : null,
  }));

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Usuarios</h1>
        <p className="text-gray-400 text-sm">{users.length} usuarios registrados</p>
      </div>
      <UsuariosAdmin users={serialized as User[]} filter={f} />
    </div>
  );
}
