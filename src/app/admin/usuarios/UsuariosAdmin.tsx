"use client";

import { useState } from "react";
import { Store, Zap, ShoppingCart, Shield, Calendar, X, RefreshCw, Ban, CheckCircle } from "lucide-react";

type Sub = {
  status: string;
  plan: string;
  trialEndsAt: string;
};

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  banned: boolean;
  createdAt: string;
  subscription: Sub | null;
  store: { name: string; isPublished: boolean } | null;
  _count: { orders: number };
};

const ROLE_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  OWNER:  { label: "Dueño",    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", icon: Store },
  SELLER: { label: "Afiliado", color: "text-purple-400 bg-purple-500/10 border-purple-500/20", icon: Zap },
  BUYER:  { label: "Cliente",  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: ShoppingCart },
  ADMIN:  { label: "Admin",    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", icon: Shield },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  TRIAL:     { label: "Trial",     color: "text-blue-400 bg-blue-500/10" },
  ACTIVE:    { label: "Activo",    color: "text-emerald-400 bg-emerald-500/10" },
  GRACE:     { label: "Gracia",    color: "text-yellow-400 bg-yellow-500/10" },
  EXPIRED:   { label: "Vencido",   color: "text-red-400 bg-red-500/10" },
  CANCELLED: { label: "Cancelado", color: "text-gray-400 bg-gray-500/10" },
};

export default function UsuariosAdmin({ users: initial }: { users: User[] }) {
  const [users, setUsers] = useState(initial);
  const [subModal, setSubModal] = useState<User | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function toggleBan(user: User) {
    setLoadingId(user.id + "-ban");
    try {
      const res = await fetch(`/api/admin/usuarios/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned: !user.banned }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, banned: !user.banned } : u));
      }
    } finally {
      setLoadingId(null);
    }
  }

  async function changeSub(userId: string, body: object) {
    setLoadingId(userId + "-sub");
    try {
      const res = await fetch(`/api/admin/suscripciones/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(prev => prev.map(u =>
          u.id === userId
            ? { ...u, subscription: u.subscription ? { ...u.subscription, ...data } : null }
            : u
        ));
        setSubModal(prev => prev?.id === userId ? { ...prev, subscription: prev.subscription ? { ...prev.subscription, ...data } : null } : prev);
      }
    } finally {
      setLoadingId(null);
    }
  }

  const totals = {
    OWNER:  users.filter(u => u.role === "OWNER").length,
    SELLER: users.filter(u => u.role === "SELLER").length,
    BUYER:  users.filter(u => u.role === "BUYER").length,
  };

  return (
    <>
      {/* Resumen */}
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
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => {
                const role = ROLE_LABELS[u.role] ?? ROLE_LABELS.BUYER;
                const sub = u.subscription ? STATUS_LABELS[u.subscription.status] : null;
                const isBanLoading = loadingId === u.id + "-ban";

                return (
                  <tr key={u.id} className={`transition-colors ${u.banned ? "bg-red-950/20" : "hover:bg-white/[0.02]"}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${u.banned ? "bg-red-500/20" : "bg-indigo-500/20"}`}>
                          <span className={`text-xs font-bold ${u.banned ? "text-red-400" : "text-indigo-300"}`}>
                            {(u.name ?? u.email)[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${u.banned ? "text-red-400 line-through" : "text-white"}`}>{u.name ?? "—"}</p>
                          <p className="text-gray-500 text-xs">{u.email}</p>
                          {u.banned && <p className="text-red-500 text-xs font-semibold mt-0.5">BANEADO</p>}
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
                        <button
                          onClick={() => setSubModal(u)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-opacity hover:opacity-70 ${sub.color}`}
                        >
                          {sub.label} · {u.subscription!.plan === "ANNUAL" ? "Anual" : "Mensual"}
                        </button>
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
                    <td className="px-5 py-4">
                      <button
                        onClick={() => toggleBan(u)}
                        disabled={isBanLoading}
                        title={u.banned ? "Desbanear usuario" : "Banear usuario"}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 ${
                          u.banned
                            ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        }`}
                      >
                        {isBanLoading ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : u.banned ? (
                          <><CheckCircle className="h-3 w-3" /> Desbanear</>
                        ) : (
                          <><Ban className="h-3 w-3" /> Banear</>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal suscripción */}
      {subModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSubModal(null)}>
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-bold">Suscripción</h3>
                <p className="text-gray-500 text-xs mt-0.5">{subModal.name ?? subModal.email}</p>
              </div>
              <button onClick={() => setSubModal(null)} className="text-gray-500 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {subModal.subscription && (
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-gray-400 text-sm">Estado</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_LABELS[subModal.subscription.status]?.color}`}>
                    {STATUS_LABELS[subModal.subscription.status]?.label}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-gray-400 text-sm">Plan</span>
                  <span className="text-white text-sm font-semibold">{subModal.subscription.plan === "ANNUAL" ? "Anual" : "Mensual"}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400 text-sm">Trial vence</span>
                  <span className="text-white text-sm">{new Date(subModal.subscription.trialEndsAt).toLocaleDateString("es-AR")}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Cambiar estado</p>
              {[
                { label: "Activar", status: "ACTIVE", color: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20" },
                { label: "Extender trial +7 días", extendDays: 7, color: "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20" },
                { label: "Extender trial +30 días", extendDays: 30, color: "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border-indigo-500/20" },
                { label: "Vencer ahora", status: "EXPIRED", color: "bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20" },
                { label: "Cancelar", status: "CANCELLED", color: "bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 border-gray-500/20" },
              ].map(({ label, status, extendDays, color }) => (
                <button
                  key={label}
                  onClick={() => changeSub(subModal.id, status ? { status } : { extendDays })}
                  disabled={loadingId === subModal.id + "-sub"}
                  className={`w-full text-sm font-semibold py-2.5 rounded-xl border transition-all disabled:opacity-50 ${color}`}
                >
                  {loadingId === subModal.id + "-sub" ? "Guardando..." : label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
