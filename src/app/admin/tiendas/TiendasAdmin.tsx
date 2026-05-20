"use client";

import { useState } from "react";
import { Store, Package, Users, ShoppingBag, Globe, EyeOff, Calendar, RefreshCw, Power } from "lucide-react";

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

export default function TiendasAdmin({ stores: initial }: { stores: StoreRow[] }) {
  const [stores, setStores] = useState(initial);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function toggle(store: StoreRow, field: "isPublished" | "isActive") {
    setLoadingId(store.id + "-" + field);
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

  const activas = stores.filter(s => s.isActive && s.isPublished).length;
  const inactivas = stores.filter(s => !s.isPublished).length;

  return (
    <>
      {/* Totales */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center">
            <Store className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{stores.length}</p>
            <p className="text-xs text-indigo-400 font-medium">Total</p>
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center">
            <Globe className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{activas}</p>
            <p className="text-xs text-emerald-400 font-medium">Publicadas</p>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-500/20 bg-gray-500/10 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gray-500/20 border border-gray-500/20 flex items-center justify-center">
            <EyeOff className="h-5 w-5 text-gray-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{inactivas}</p>
            <p className="text-xs text-gray-400 font-medium">Sin publicar</p>
          </div>
        </div>
      </div>

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
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stores.map((s) => (
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
                      onClick={() => toggle(s, "isPublished")}
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
                      onClick={() => toggle(s, "isActive")}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
