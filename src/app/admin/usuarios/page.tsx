import { prisma } from "@/lib/prisma";
import { getSubscriptionStatus } from "@/lib/subscription";
import UsuariosAdmin, { type User } from "./UsuariosAdmin";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string; q?: string }>;
}) {
  const { f = "", q = "" } = await searchParams;

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

  /* Cómo entra cada uno. Lo guarda Supabase en `auth.users`, no nuestra tabla:
     se lee de una vez para toda la lista. Si no se puede leer, la lista sale
     igual, sin la etiqueta. */
  const entraCon = new Map<string, string[]>();
  try {
    /* La contraseña se mira en sí misma y no en la lista de proveedores: quien
       entró con Google y después agregó una no siempre figura con "email". */
    const filas = await prisma.$queryRaw<{ id: string; providers: unknown; con_clave: boolean }[]>`
      SELECT id::text AS id, raw_app_meta_data->'providers' AS providers,
             coalesce(encrypted_password, '') <> '' AS con_clave
      FROM auth.users WHERE id::text = ANY(${users.map((u) => u.id)})`;
    for (const f of filas) {
      const lista = Array.isArray(f.providers) ? f.providers.filter((x): x is string => typeof x === "string") : [];
      entraCon.set(f.id, [...lista.filter((x) => x !== "email"), ...(f.con_clave ? ["email"] : [])]);
    }
  } catch (e) {
    console.error("[admin usuarios] no se pudo leer cómo entra cada uno:", e instanceof Error ? e.message : e);
  }

  const serialized = users.map(u => ({
    ...u,
    entraCon: entraCon.get(u.id) ?? [],
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
      <UsuariosAdmin users={serialized as User[]} filter={f} busqueda={q} />
    </div>
  );
}
