"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Store, Package, Users, ShoppingBag, Globe, EyeOff, Calendar, RefreshCw, Power, Search, X, Trash2, AlertTriangle } from "lucide-react";

type PendingToggle = { store: StoreRow; field: "isPublished" | "isActive" };
type DeleteState = { store: StoreRow; step: 1 | 2; confirmSlug: string; loading: boolean; error: string };

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  isActive: boolean;
  isPublished: boolean;
  createdAt: string;
  owner: { name: string | null; email: string };
  _count: { products: number; affiliates: number; orders: number };
};

const STORE_FILTERS = [
  { value: "",           label: "Todas" },
  { value: "activas",    label: "Activas" },
  { value: "inactivas",  label: "Sin publicar" },
  { value: "eliminadas", label: "Eliminadas" },
] as const;

function isDeletedStore(s: StoreRow) { return s.slug.startsWith("deleted-"); }

function applyStoreFilter(stores: StoreRow[], filter: string): StoreRow[] {
  switch (filter) {
    case "activas":    return stores.filter(s => s.isActive && s.isPublished && !isDeletedStore(s));
    case "inactivas":  return stores.filter(s => !isDeletedStore(s) && (!s.isActive || !s.isPublished));
    case "eliminadas": return stores.filter(isDeletedStore);
    default:           return stores.filter(s => !isDeletedStore(s));
  }
}

export default function TiendasAdmin({ stores: initial, filter: activeFilter }: { stores: StoreRow[]; filter: string }) {
  const baseStores = useMemo(() => applyStoreFilter(initial, activeFilter), [initial, activeFilter]);
  const [stores, setStores] = useState(baseStores);
  useEffect(() => { setStores(baseStores); }, [baseStores]);

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<PendingToggle | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return stores;
    return stores.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.slug.toLowerCase().includes(q) ||
      s.owner.name?.toLowerCase().includes(q) ||
      s.owner.email.toLowerCase().includes(q)
    );
  }, [stores, query]);

  async function toggle(store: StoreRow, field: "isPublished" | "isActive") {
    setLoadingId(store.id + "-" + field);
    setPending(null);
    try {
      const res = await fetch(`/api/admin/tiendas/${store.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !store[field] }),
      });
      if (res.ok) {
        setStores(prev => prev.map(s => s.id === store.id ? { ...s, [field]: !store[field] } : s));
      }
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteState) return;
    if (deleteState.confirmSlug.trim() !== deleteState.store.slug) {
      setDeleteState(d => d ? { ...d, error: "El slug no coincide. Verificá que esté escrito exactamente igual." } : null);
      return;
    }
    setDeleteState(d => d ? { ...d, loading: true, error: "" } : null);
    try {
      const res = await fetch(`/api/admin/tiendas/${deleteState.store.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmSlug: deleteState.confirmSlug.trim() }),
      });
      if (res.ok) {
        setStores(prev => prev.filter(s => s.id !== deleteState.store.id));
        setDeleteState(null);
      } else {
        const err = await res.json();
        setDeleteState(d => d ? { ...d, loading: false, error: err.error ?? "Error al eliminar." } : null);
      }
    } catch {
      setDeleteState(d => d ? { ...d, loading: false, error: "Error de conexión." } : null);
    }
  }

  function confirmLabel(p: PendingToggle) {
    if (p.field === "isPublished") return p.store.isPublished ? "dejar de publicar" : "publicar";
    return p.store.isActive ? "desactivar" : "activar";
  }

  const stats = useMemo(() => ({
    total:     initial.filter(s => !isDeletedStore(s)).length,
    activas:   initial.filter(s => s.isActive && s.isPublished && !isDeletedStore(s)).length,
    inactivas: initial.filter(s => !isDeletedStore(s) && (!s.isActive || !s.isPublished)).length,
    eliminadas: initial.filter(isDeletedStore).length,
  }), [initial]);

  return (
    <>
      {/* Resumen clicable */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Link href="/admin/tiendas" className={`rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 flex items-center gap-3 hover:opacity-80 transition-all ${activeFilter === "" ? "ring-2 ring-white/20" : ""}`}>
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <Store className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-xl font-black text-white">{stats.total}</p>
            <p className="text-xs text-indigo-400 font-medium">Total</p>
          </div>
        </Link>
        <Link href="/admin/tiendas?f=activas" className={`rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 flex items-center gap-3 hover:opacity-80 transition-all ${activeFilter === "activas" ? "ring-2 ring-white/20" : ""}`}>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Globe className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-xl font-black text-white">{stats.activas}</p>
            <p className="text-xs text-emerald-400 font-medium">Activas</p>
          </div>
        </Link>
        <Link href="/admin/tiendas?f=inactivas" className={`rounded-2xl border border-gray-500/20 bg-gray-500/10 p-4 flex items-center gap-3 hover:opacity-80 transition-all ${activeFilter === "inactivas" ? "ring-2 ring-white/20" : ""}`}>
          <div className="w-9 h-9 rounded-xl bg-gray-500/20 border border-gray-500/20 flex items-center justify-center flex-shrink-0">
            <EyeOff className="h-4 w-4 text-gray-400" />
          </div>
          <div>
            <p className="text-xl font-black text-white">{stats.inactivas}</p>
            <p className="text-xs text-gray-400 font-medium">Sin publicar</p>
          </div>
        </Link>
        <Link href="/admin/tiendas?f=eliminadas" className={`rounded-2xl border border-red-500/20 bg-red-500/10 p-4 flex items-center gap-3 hover:opacity-80 transition-all ${activeFilter === "eliminadas" ? "ring-2 ring-white/20" : ""}`}>
          <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/20 flex items-center justify-center flex-shrink-0">
            <Trash2 className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <p className="text-xl font-black text-white">{stats.eliminadas}</p>
            <p className="text-xs text-red-400 font-medium">Eliminadas</p>
          </div>
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STORE_FILTERS.map(({ value, label }) => (
          <Link
            key={value}
            href={value ? `/admin/tiendas?f=${value}` : "/admin/tiendas"}
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
          placeholder="Buscar por nombre, slug o dueño..."
          className="w-full bg-gray-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Modal de confirmación */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">¿Confirmar acción?</p>
                <p className="text-gray-400 text-xs mt-0.5">Esta acción afecta la tienda en producción</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-5">
              Vas a <strong className="text-white">{confirmLabel(pending)}</strong> la tienda{" "}
              <strong className="text-white">{pending.store.name}</strong>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => toggle(pending.store, pending.field)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
              >
                Confirmar
              </button>
              <button
                onClick={() => setPending(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold py-2.5 rounded-xl border border-white/10 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal eliminar tienda */}
      {deleteState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">

            {deleteState.step === 1 ? (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-base">Eliminar tienda</p>
                    <p className="text-gray-400 text-xs mt-0.5">Esta acción es irreversible</p>
                  </div>
                </div>

                <div className="bg-red-950/40 border border-red-500/20 rounded-xl p-4 mb-5 space-y-2">
                  <p className="text-red-300 text-sm font-semibold mb-3">¿Qué se va a eliminar?</p>
                  <div className="space-y-1.5 text-sm">
                    <p className="flex items-center gap-2 text-red-300"><Trash2 className="h-3.5 w-3.5 shrink-0" /> Diseño y bloques de la página</p>
                    <p className="flex items-center gap-2 text-red-300"><Trash2 className="h-3.5 w-3.5 shrink-0" /> Productos e imágenes</p>
                    <p className="flex items-center gap-2 text-red-300"><Trash2 className="h-3.5 w-3.5 shrink-0" /> Cupones activos</p>
                    <p className="flex items-center gap-2 text-red-300"><Trash2 className="h-3.5 w-3.5 shrink-0" /> Afiliados desactivados</p>
                  </div>
                  <div className="border-t border-red-500/20 mt-3 pt-3 space-y-1.5 text-sm">
                    <p className="flex items-center gap-2 text-gray-400"><span className="text-green-400">✓</span> El historial de pedidos se conserva (AFIP)</p>
                    <p className="flex items-center gap-2 text-gray-400"><span className="text-green-400">✓</span> La cuenta del dueño queda activa (como comprador)</p>
                    <p className="flex items-center gap-2 text-gray-400"><span className="text-green-400">✓</span> Los saldos de afiliados en billetera quedan disponibles</p>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-3 mb-5 flex items-center gap-3">
                  <Store className="h-4 w-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-white text-sm font-semibold">{deleteState.store.name}</p>
                    <p className="text-gray-500 text-xs">/{deleteState.store.slug}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setDeleteState(null)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold border border-white/10 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={() => setDeleteState(d => d ? { ...d, step: 2 } : null)}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
                    <Trash2 className="h-4 w-4" /> Continuar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <Trash2 className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-base">Confirmación final</p>
                    <p className="text-gray-400 text-xs mt-0.5">Escribí el slug exacto para confirmar</p>
                  </div>
                </div>

                <p className="text-gray-300 text-sm mb-2">
                  Para eliminar <strong className="text-white">{deleteState.store.name}</strong>, escribí el slug exacto:
                </p>
                <p className="text-red-400 font-mono text-sm bg-red-950/30 border border-red-500/20 rounded-lg px-3 py-2 mb-4 select-all">
                  {deleteState.store.slug}
                </p>

                <input
                  type="text"
                  value={deleteState.confirmSlug}
                  onChange={e => setDeleteState(d => d ? { ...d, confirmSlug: e.target.value, error: "" } : null)}
                  placeholder={deleteState.store.slug}
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-mono mb-4"
                  autoFocus
                />

                {deleteState.error && (
                  <p className="text-sm text-red-400 bg-red-950/40 border border-red-500/20 rounded-xl px-4 py-2.5 mb-4">
                    {deleteState.error}
                  </p>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setDeleteState(d => d ? { ...d, step: 1, confirmSlug: "", error: "" } : null)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold border border-white/10 transition-colors">
                    Atrás
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteState.loading || deleteState.confirmSlug.trim() !== deleteState.store.slug}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                    {deleteState.loading
                      ? <><RefreshCw className="h-4 w-4 animate-spin" /> Eliminando...</>
                      : <><Trash2 className="h-4 w-4" /> Eliminar definitivamente</>
                    }
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-gray-900/50 border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tienda</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dueño</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Publicada</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Activa</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Productos</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Afiliados</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pedidos</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Creada</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-gray-500 text-sm">
                    {query
                      ? `No se encontraron tiendas para "${query}"`
                      : "No hay tiendas en esta categoría"}
                  </td>
                </tr>
              )}
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: s.primaryColor + "22" }}
                      >
                        <Store className="h-4 w-4" style={{ color: s.primaryColor }} />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{s.name}</p>
                        <p className="text-gray-500 text-xs">/{s.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-white text-xs font-medium">{s.owner.name ?? "—"}</p>
                    <p className="text-gray-500 text-xs">{s.owner.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => setPending({ store: s, field: "isPublished" })}
                      disabled={loadingId === s.id + "-isPublished"}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${
                        s.isPublished
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                          : "bg-gray-500/10 text-gray-400 border-gray-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20"
                      }`}
                    >
                      {loadingId === s.id + "-isPublished" ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Globe className="h-3 w-3" />
                      )}
                      {s.isPublished ? "Publicada" : "Sin publicar"}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => setPending({ store: s, field: "isActive" })}
                      disabled={loadingId === s.id + "-isActive"}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${
                        s.isActive
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20"
                      }`}
                    >
                      {loadingId === s.id + "-isActive" ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Power className="h-3 w-3" />
                      )}
                      {s.isActive ? "Activa" : "Inactiva"}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-white text-sm font-semibold">
                      <Package className="h-3.5 w-3.5 text-gray-500" />
                      {s._count.products}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-white text-sm font-semibold">
                      <Users className="h-3.5 w-3.5 text-gray-500" />
                      {s._count.affiliates}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-white text-sm font-semibold">
                      <ShoppingBag className="h-3.5 w-3.5 text-gray-500" />
                      {s._count.orders}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-gray-500 text-xs flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {new Date(s.createdAt).toLocaleDateString("es-AR")}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => setDeleteState({ store: s, step: 1, confirmSlug: "", loading: false, error: "" })}
                      title="Eliminar tienda"
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all"
                    >
                      <Trash2 className="h-3 w-3" /> Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
