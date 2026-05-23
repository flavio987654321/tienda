"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Store, Zap, ShoppingCart, Shield, Calendar, X, RefreshCw, Ban, CheckCircle, Search, Trash2, AlertTriangle } from "lucide-react";

type Sub = {
  status: string;
  plan: string;
  tier: string;
  role: string;
  trialEndsAt: string;
};

function getTierLabel(sub: Sub): string {
  if (sub.role === "AFFILIATE") return "Afiliado";
  if (sub.tier === "PREMIUM") return "Tienda Premium";
  return "Tienda Pro";
}

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

const USER_FILTERS = [
  { value: "",          label: "Todos",     color: "text-gray-300" },
  { value: "activos",   label: "Activos",   color: "text-emerald-400" },
  { value: "duenos",    label: "Dueños",    color: "text-indigo-400" },
  { value: "afiliados", label: "Afiliados", color: "text-purple-400" },
  { value: "clientes",  label: "Clientes",  color: "text-teal-400" },
  { value: "baneados",  label: "Baneados",  color: "text-red-400" },
  { value: "eliminados",label: "Eliminados",color: "text-gray-500" },
] as const;

function applyUserFilter(users: User[], filter: string): User[] {
  const isDeleted = (u: User) => u.email.endsWith(".invalid");
  const isActive  = (u: User) => !u.banned && !isDeleted(u);
  switch (filter) {
    case "activos":    return users.filter(isActive);
    case "duenos":     return users.filter(u => u.role === "OWNER"  && isActive(u));
    case "afiliados":  return users.filter(u => u.role === "SELLER" && isActive(u));
    case "clientes":   return users.filter(u => u.role === "BUYER"  && isActive(u));
    case "baneados":   return users.filter(u => u.banned && !isDeleted(u));
    case "eliminados": return users.filter(isDeleted);
    default:           return users.filter(u => !isDeleted(u));
  }
}

export default function UsuariosAdmin({ users: initial, filter: activeFilter }: { users: User[]; filter: string }) {
  const baseUsers = useMemo(() => applyUserFilter(initial, activeFilter), [initial, activeFilter]);
  const [users, setUsers] = useState(baseUsers);
  useEffect(() => { setUsers(baseUsers); }, [baseUsers]);

  const [subModal, setSubModal] = useState<User | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [deleteModal, setDeleteModal] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.store?.name.toLowerCase().includes(q) ||
      ROLE_LABELS[u.role]?.label.toLowerCase().includes(q)
    );
  }, [users, query]);

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

  async function deleteUser(user: User) {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${user.id}`, { method: "DELETE" });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== user.id));
        setDeleteModal(null);
        setDeleteConfirm("");
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  const activeOnly = useMemo(() => initial.filter(u => !u.banned && !u.email.endsWith(".invalid")), [initial]);
  const totals = {
    OWNER:    activeOnly.filter(u => u.role === "OWNER").length,
    SELLER:   activeOnly.filter(u => u.role === "SELLER").length,
    BUYER:    activeOnly.filter(u => u.role === "BUYER").length,
    baneados: initial.filter(u => u.banned && !u.email.endsWith(".invalid")).length,
    eliminados: initial.filter(u => u.email.endsWith(".invalid")).length,
  };

  return (
    <>
      {/* Resumen clicable */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
        {([
          { role: "OWNER",  href: "/admin/usuarios?f=duenos",    count: totals.OWNER },
          { role: "SELLER", href: "/admin/usuarios?f=afiliados", count: totals.SELLER },
          { role: "BUYER",  href: "/admin/usuarios?f=clientes",  count: totals.BUYER },
        ] as const).map(({ role, href, count }) => {
          const { label, color, icon: Icon } = ROLE_LABELS[role];
          const isActive = activeFilter === (role === "OWNER" ? "duenos" : role === "SELLER" ? "afiliados" : "clientes");
          return (
            <Link key={role} href={href} className={`rounded-2xl border p-4 flex items-center gap-3 transition-all hover:opacity-80 ${color} ${isActive ? "ring-2 ring-white/20" : ""}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-black text-white">{count}</p>
                <p className="text-xs font-medium opacity-80">{label}s</p>
              </div>
            </Link>
          );
        })}
        <Link href="/admin/usuarios?f=baneados" className={`rounded-2xl border border-red-500/20 bg-red-500/10 p-4 flex items-center gap-3 transition-all hover:opacity-80 ${activeFilter === "baneados" ? "ring-2 ring-white/20" : ""}`}>
          <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/20 flex items-center justify-center flex-shrink-0">
            <Ban className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <p className="text-xl font-black text-white">{totals.baneados}</p>
            <p className="text-xs text-red-400 font-medium">Baneados</p>
          </div>
        </Link>
        <Link href="/admin/usuarios?f=eliminados" className={`rounded-2xl border border-gray-500/20 bg-gray-500/10 p-4 flex items-center gap-3 transition-all hover:opacity-80 ${activeFilter === "eliminados" ? "ring-2 ring-white/20" : ""}`}>
          <div className="w-9 h-9 rounded-xl bg-gray-500/20 border border-gray-500/20 flex items-center justify-center flex-shrink-0">
            <Trash2 className="h-4 w-4 text-gray-400" />
          </div>
          <div>
            <p className="text-xl font-black text-white">{totals.eliminados}</p>
            <p className="text-xs text-gray-400 font-medium">Eliminados</p>
          </div>
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {USER_FILTERS.map(({ value, label }) => (
          <Link
            key={value}
            href={value ? `/admin/usuarios?f=${value}` : "/admin/usuarios"}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
              activeFilter === value
                ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/30"
                : "text-gray-400 border-white/10 hover:text-white hover:border-white/20 bg-transparent"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por nombre, email, tienda o rol..."
          className="w-full bg-gray-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        )}
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-500 text-sm">
                    {query
                      ? `No se encontraron usuarios para "${query}"`
                      : "No hay usuarios en esta categoría"}
                  </td>
                </tr>
              )}
              {filtered.map((u) => {
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
                          {getTierLabel(u.subscription!)} · {sub.label} · {u.subscription!.plan === "ANNUAL" ? "Anual" : "Mensual"}
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
                      <div className="flex items-center gap-2">
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
                        <button
                          onClick={() => { setDeleteModal(u); setDeleteConfirm(""); }}
                          title="Eliminar cuenta completa"
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-800 text-gray-500 hover:bg-red-950/60 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal eliminar cuenta */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setDeleteModal(null); setDeleteConfirm(""); }}>
          <div className="bg-gray-900 border border-red-500/20 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-bold">Eliminar cuenta completa</h3>
                <p className="text-gray-400 text-xs mt-1">
                  Esta acción es <span className="text-red-400 font-semibold">permanente e irreversible</span>. Se borrará todo:
                  cuenta, tienda, productos, pedidos, afiliaciones, suscripción, términos aceptados e historial completo.
                </p>
              </div>
            </div>

            <div className="bg-gray-800/60 rounded-xl p-3 mb-5 text-sm">
              <p className="text-gray-500 text-xs mb-1">Usuario a eliminar</p>
              <p className="text-white font-semibold">{deleteModal.name ?? "—"}</p>
              <p className="text-gray-400 text-xs">{deleteModal.email}</p>
            </div>

            <div className="mb-5">
              <label className="text-gray-400 text-xs mb-2 block">
                Escribí el email <span className="text-white font-semibold">{deleteModal.email}</span> para confirmar
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder={deleteModal.email}
                className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteModal(null); setDeleteConfirm(""); }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-sm font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteUser(deleteModal)}
                disabled={deleteConfirm !== deleteModal.email || deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleteLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleteLoading ? "Eliminando..." : "Eliminar todo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suscripción */}
      {subModal && subModal.subscription && (() => {
        const s = subModal.subscription;
        const isLoading = loadingId === subModal.id + "-sub";
        const isAffiliate = s.role === "AFFILIATE";

        const statusActions: { label: string; body: object; color: string }[] = [];
        if (s.status === "TRIAL") {
          statusActions.push(
            { label: "Extender trial +7 días",  body: { extendDays: 7 },           color: "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20" },
            { label: "Extender trial +30 días", body: { extendDays: 30 },           color: "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border-indigo-500/20" },
            { label: "Activar ahora",           body: { status: "ACTIVE" },         color: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20" },
            { label: "Vencer ahora",            body: { status: "EXPIRED" },        color: "bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20" },
          );
        } else if (s.status === "ACTIVE") {
          statusActions.push(
            { label: "Vencer ahora",            body: { status: "EXPIRED" },        color: "bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20" },
            { label: "Cancelar suscripción",    body: { status: "CANCELLED" },      color: "bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 border-gray-500/20" },
          );
        } else if (s.status === "GRACE") {
          statusActions.push(
            { label: "Activar",                 body: { status: "ACTIVE" },         color: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20" },
            { label: "Cancelar",                body: { status: "CANCELLED" },      color: "bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 border-gray-500/20" },
          );
        } else {
          statusActions.push(
            { label: "Dar trial (30 días)",     body: { extendDays: 30 },           color: "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20" },
            { label: "Activar directamente",    body: { status: "ACTIVE" },         color: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20" },
          );
        }

        return (
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

              {/* Info actual */}
              <div className="space-y-0 mb-5 bg-gray-800/40 rounded-xl overflow-hidden">
                <div className="flex justify-between items-center px-4 py-3 border-b border-white/5">
                  <span className="text-gray-400 text-sm">Estado</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_LABELS[s.status]?.color}`}>
                    {STATUS_LABELS[s.status]?.label}
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-3 border-b border-white/5">
                  <span className="text-gray-400 text-sm">Tipo</span>
                  <span className="text-white text-sm font-semibold">{getTierLabel(s)}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-3 border-b border-white/5">
                  <span className="text-gray-400 text-sm">Facturación</span>
                  <span className="text-white text-sm font-semibold">{s.plan === "ANNUAL" ? "Anual" : "Mensual"}</span>
                </div>
                {s.status === "TRIAL" && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-gray-400 text-sm">Trial vence</span>
                    <span className="text-white text-sm">{new Date(s.trialEndsAt).toLocaleDateString("es-AR")}</span>
                  </div>
                )}
              </div>

              {/* Cambiar tipo de plan */}
              <div className="mb-4">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Tipo de plan</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Tienda Pro",     body: { tier: "BASIC" } },
                    { label: "Tienda Premium", body: { tier: "PREMIUM" } },
                    { label: "Afiliado",       body: { tier: "AFFILIATE" } },
                  ].map(({ label, body }) => {
                    const active =
                      (body.tier === "AFFILIATE" && isAffiliate) ||
                      (body.tier === "BASIC"     && !isAffiliate && s.tier === "BASIC") ||
                      (body.tier === "PREMIUM"   && !isAffiliate && s.tier === "PREMIUM");
                    return (
                      <button
                        key={label}
                        onClick={() => changeSub(subModal.id, body)}
                        disabled={isLoading || active}
                        className={`text-xs font-semibold py-2 rounded-lg border transition-all disabled:cursor-default ${
                          active
                            ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                            : "bg-gray-800 text-gray-400 border-white/5 hover:border-indigo-500/30 hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cambiar facturación (solo si no es afiliado) */}
              {!isAffiliate && (
                <div className="mb-5">
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Facturación</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Mensual", body: { plan: "MONTHLY" } },
                      { label: "Anual",   body: { plan: "ANNUAL" } },
                    ].map(({ label, body }) => {
                      const active = (body.plan === "MONTHLY" && s.plan === "MONTHLY") || (body.plan === "ANNUAL" && s.plan === "ANNUAL");
                      return (
                        <button
                          key={label}
                          onClick={() => changeSub(subModal.id, body)}
                          disabled={isLoading || active}
                          className={`text-xs font-semibold py-2 rounded-lg border transition-all disabled:cursor-default ${
                            active
                              ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                              : "bg-gray-800 text-gray-400 border-white/5 hover:border-indigo-500/30 hover:text-white"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Acciones de estado (contextuales) */}
              <div className="space-y-2">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Acciones</p>
                {statusActions.map(({ label, body, color }) => (
                  <button
                    key={label}
                    onClick={() => changeSub(subModal.id, body)}
                    disabled={isLoading}
                    className={`w-full text-sm font-semibold py-2.5 rounded-xl border transition-all disabled:opacity-50 ${color}`}
                  >
                    {isLoading ? "Guardando..." : label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
