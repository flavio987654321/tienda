import { prisma } from "@/lib/prisma";
import UsuariosAdmin from "./UsuariosAdmin";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  const users = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
    orderBy: { createdAt: "desc" },
    include: {
      subscription: { select: { status: true, plan: true, trialEndsAt: true } },
      store: { select: { name: true, isPublished: true } },
      _count: { select: { orders: true } },
    },
  });

  const serialized = users.map(u => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: undefined,
    subscription: u.subscription
      ? { ...u.subscription, trialEndsAt: u.subscription.trialEndsAt.toISOString() }
      : null,
  }));

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Usuarios</h1>
        <p className="text-gray-400 text-sm">{users.length} usuarios registrados</p>
      </div>
      <UsuariosAdmin users={serialized as any} />
    </div>
  );
}
