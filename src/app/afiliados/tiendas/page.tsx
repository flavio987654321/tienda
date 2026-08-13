"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Fuse from "fuse.js";
import { useAuth } from "@/components/AuthProvider";
import {
  ArrowLeft, Store, Search, Send, Loader2, ShoppingBag, Star, Package, X, Ticket,
} from "lucide-react";

interface StoreItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  commissionRate: number;
  primaryColor: string;
  affiliatesEnabled: boolean;
  acceptsRewardCoupons: boolean;
  _count: { products: number };
  owner: { name: string | null };
  affiliates: { id: string; status: string; isActive: boolean }[];
}

function scoreStore(s: StoreItem) {
  return s.commissionRate * 10 + s._count.products;
}

export default function TiendasPage() {
  const { status: sessionStatus } = useAuth();
  const router = useRouter();
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/vendedoras?mode=tiendas-disponibles")
      .then((r) => r.json())
      .then(({ stores }) => {
        setStores(stores ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const available = useMemo(
    () =>
      stores
        .filter((s) => s.affiliates.length === 0 || ["REJECTED", "REMOVED"].includes(s.affiliates[0]?.status))
        .sort((a, b) => scoreStore(b) - scoreStore(a)),
    [stores]
  );

  // Búsqueda difusa: tolera errores de tipeo y coincidencias parciales
  const fuse = useMemo(
    () =>
      new Fuse(available, {
        keys: ["name", "owner.name", "description"],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [available]
  );

  const filtered = search.trim() ? fuse.search(search.trim()).map((r) => r.item) : available;

  function handleApply(store: StoreItem) {
    if (sessionStatus !== "authenticated") {
      router.push("/login");
      return;
    }
    router.push(`/afiliados?apply=${store.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#030712]">
      {/* Mismo caso que Premios: era `sticky top-0 z-40` compitiendo con la
          navegación del panel, que ya está pegada arriba con ese mismo z-index.
          El que gana es el que va después en el HTML, así que esta barra le
          tapaba los menús a la de arriba. */}
      <nav className="bg-white/90 dark:bg-gray-950/90 border-b border-gray-200 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/afiliados" className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Volver</span>
          </Link>
          <div className="flex items-center gap-2.5 ml-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-xl flex items-center justify-center">
              <ShoppingBag className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-base font-bold text-gray-900 dark:text-white">Explorar tiendas</span>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Tiendas disponibles</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Ordenadas por mejor comisión y catálogo más amplio.
            {!loading && available.length > 0 && ` ${available.length} tiendas para postularte.`}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, dueña o descripción..."
            className="w-full pl-11 pr-10 py-3.5 bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-white/10 rounded-2xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-500/50 transition-all shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-white/5 rounded-3xl p-16 text-center shadow-sm">
            <Store className="h-10 w-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            {search ? (
              <>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Sin resultados para &quot;{search}&quot;</p>
                <button onClick={() => setSearch("")} className="text-indigo-500 dark:text-indigo-400 text-sm mt-2 hover:underline">Limpiar búsqueda</button>
              </>
            ) : (
              <>
                <p className="text-gray-500 dark:text-gray-400">No hay tiendas disponibles por ahora.</p>
                <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">Volvé más tarde para ver nuevas oportunidades.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((store, i) => {
              const isTop = i < 3 && !search;
              return (
                <motion.div
                  key={store.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-white/8 rounded-3xl overflow-hidden hover:border-gray-300 dark:hover:border-white/15 transition-all shadow-sm relative"
                >
                  {isTop && (
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <Star className="h-2.5 w-2.5" /> Top
                    </div>
                  )}
                  {/* Header */}
                  <div className="h-20 flex items-center justify-center relative" style={{ backgroundColor: store.primaryColor + "20" }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: store.primaryColor }}>
                      <Store className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="text-xs bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 px-2.5 py-1 rounded-full font-bold">
                        {store.commissionRate}% comisión
                      </span>
                    </div>
                  </div>
                  {/* Body */}
                  <div className="p-5">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-0.5">{store.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      por {store.owner.name ?? "Anónimo"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {store._count.products} productos
                      </span>
                      {store.acceptsRewardCoupons && (
                        <span className="flex items-center gap-1 text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded-full font-medium">
                          <Ticket className="h-3 w-3" /> Acepta cupones
                        </span>
                      )}
                    </div>
                    {store.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">{store.description}</p>
                    )}
                    <div className="flex gap-2">
                      <Link
                        href={`/tienda/${store.slug}`}
                        target="_blank"
                        className="flex-1 text-center py-2.5 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 rounded-xl text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all font-medium"
                      >
                        Ver tienda
                      </Link>
                      <button
                        onClick={() => handleApply(store)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl text-xs font-semibold transition-all"
                      >
                        <Send className="h-3 w-3" /> Postularme
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
