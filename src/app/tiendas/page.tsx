"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Store, Eye, Search, ChevronLeft, ChevronRight, Package } from "lucide-react";

type StoreItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  primaryColor: string;
  totalProducts: number;
  totalOrders: number;
  categories: string[];
  coverImg: string | null;
  banner: string | null;
};

const CATEGORIES = ["Todas", "ropa", "joyeria", "hogar", "tecnologia", "deportes", "belleza", "alimentacion", "infantil", "general"];
const CATEGORY_LABELS: Record<string, string> = {
  Todas: "Todas",
  ropa: "Ropa",
  joyeria: "Joyería",
  hogar: "Hogar",
  tecnologia: "Tecnología",
  deportes: "Deportes",
  belleza: "Belleza",
  alimentacion: "Alimentación",
  infantil: "Infantil",
  general: "General",
};

export default function TiendasPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("Todas");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchStores = useCallback(async (p: number, cat: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "12" });
      if (cat && cat !== "Todas") params.set("category", cat);
      const res = await fetch(`/api/stores?${params}`);
      const data = await res.json();
      setStores(data.stores ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores(page, category);
  }, [page, category, fetchStores]);

  function handleCategory(cat: string) {
    setCategory(cat);
    setPage(1);
  }

  const filtered = search.trim()
    ? stores.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : stores;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Link href="/" className="text-indigo-600 font-bold text-lg tracking-tight shrink-0">
            ← MiTienda
          </Link>
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tienda..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        {/* Filtros */}
        <div className="max-w-7xl mx-auto px-6 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategory(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                category === cat
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Título */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900">Tiendas activas</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {loading ? "Cargando..." : `${total} tienda${total !== 1 ? "s" : ""} encontrada${total !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl overflow-hidden animate-pulse">
                <div className="h-44 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded-full w-3/4" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">
              {search ? "Sin resultados para esa búsqueda" : "Todavía no hay tiendas en esta categoría"}
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              {search ? "Probá con otro nombre." : "Las primeras tiendas están por llegar. ¡Sé la primera!"}
            </p>
            <Link href="/registro" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
              Crear mi tienda
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((store) => (
              <Link
                key={store.id}
                href={`/tienda/${store.slug}`}
                className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group block"
              >
                <div className="relative overflow-hidden h-44">
                  {store.coverImg || store.banner ? (
                    <img
                      src={(store.coverImg || store.banner)!}
                      alt={store.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: store.primaryColor + "18" }}>
                      <Store className="h-14 w-14 opacity-25" style={{ color: store.primaryColor }} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  {store.categories[0] && (
                    <div className="absolute bottom-3 left-3">
                      <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full border border-white/20 capitalize">
                        {store.categories[0]}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-gray-900 text-sm">{store.name}</h3>
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: store.primaryColor }} />
                  </div>
                  {store.description && (
                    <p className="text-xs text-gray-400 line-clamp-1 mb-2">{store.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{store.totalProducts} productos</span>
                    <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: store.primaryColor }}>
                      <Eye className="h-3.5 w-3.5" /> Ver tienda
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Paginación */}
        {!loading && pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-12">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <span className="text-sm text-gray-500">
              Página {page} de {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
