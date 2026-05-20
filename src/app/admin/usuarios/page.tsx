import { prisma } from "@/lib/prisma";
import { Users, Store, Zap, ShoppingCart, Shield, Calendar } from "lucide-react";

const ROLE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  OWNER:  { label: "Dueño",    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", icon: Store },
  SELLER: { label: "Afiliado", color: "text-purple-400 bg-purple-500/10 border-purple-500/20", icon: Zap },
  BUYER:  { label: "Cliente",  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: ShoppingCart },
  ADMIN:  { label: "Admin",    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", icon: Shield },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  TRIAL:     { label: "Trial",    color: "text-blue-400 bg-blue-500/10" },
  ACTIVE:    { label: "Activo",   color: "text-emerald-400 bg-emerald-500/10" },
  GRACE:     { label: "Gracia",   color: "text-yellow-400 bg-yellow-500/10" },
  EXPIRED:   { label: "Vencido",  color: "text-red-400 bg-red-500/10" },
  CANCELLED: { label: "Cancelado",color: "text-gray-400 bg-gray-500/10" },
};

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

  const totals = {
    OWNER:  users.filter(u => u.role === "OWNER").length,
    SELLER: users.filter(u => u.role === "SELLER").length,
    BUYER:  users.filter(u => u.role === "BUYER").length,
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Usuarios</h1>
        <p className="text-gray-400 text-sm">{users.length} usuarios registrados</p>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {(["OWNER", "SELLER", "BUYER"] as const).map((role) => {
          const { label, color, icon: Icon } = ROLE_LABELS[role];
          return (
            <div key={role} className={`rounded-2xl border p-5 flex items-center gap-4 ${color}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">{totals[role]}</p>
                <p className="text-xs font-medium opacity-80">{label}s</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabla */}
      <div className="bg-gray-900/50 border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Suscripción</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tienda</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pedidos</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => {
                const role = ROLE_LABELS[u.role] ?? ROLE_LABELS.BUYER;
                const sub = u.subscription ? STATUS_LABELS[u.subscription.status] : null;
                return (
                  <tr key={u.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-300 text-xs font-bold">
                            {(u.name ?? u.email)[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{u.name ?? "—"}</p>
                          <p className="text-gray-500 text-xs">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${role.color}`}>
                        <role.icon className="h-3 w-3" />
                        {role.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {sub ? (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sub.color}`}>
                          {sub.label} · {u.subscription!.plan === "ANNUAL" ? "Anual" : "Mensual"}
                        </span>
                      ) : (
                        <span className="text-gray-600 text-xs">Sin suscripción</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {u.store ? (
                        <div>
                          <p className="text-white text-xs font-medium">{u.store.name}</p>
                          <p className={`text-xs ${u.store.isPublished ? "text-emerald-400" : "text-gray-500"}`}>
                            {u.store.isPublished ? "Publicada" : "Sin publicar"}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-white text-sm font-semibold">{u._count.orders}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-gray-500 text-xs flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {new Date(u.createdAt).toLocaleDateString("es-AR")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
