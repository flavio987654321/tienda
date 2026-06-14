"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BadgeCheck, Eye, Search, ChevronLeft, ChevronRight, Package, ArrowLeft } from "lucide-react";

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
  heroImg: string | null;
  isVerified: boolean;
  updatedAt: number;
};

export default function TiendasPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchStores = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "12" });
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
    fetchStores(page);
  }, [page, fetchStores]);

  const filtered = search.trim()
    ? stores.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : stores;

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <style>{`
        .card-hover { transition: transform 0.3s cubic-bezier(.4,0,.2,1), box-shadow 0.3s cubic-bezier(.4,0,.2,1), border-color 0.3s; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 24px 48px rgba(0,0,0,.6); border-color: rgba(255,255,255,.12) !important; }
        .search-input::placeholder { color: #404040; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 bg-[#080808]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors group shrink-0"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-semibold tracking-widest uppercase">TiendaApps</span>
          </Link>

          <div className="w-px h-5 bg-white/10 shrink-0" />

          <div className="flex-1 relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tienda..."
              className="search-input w-full bg-transparent pl-6 py-1.5 text-sm text-white focus:outline-none border-b border-white/10 focus:border-white/30 transition-colors"
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6">
        {/* ── HERO TEXT ── */}
        <div className="pt-16 pb-12 border-b border-white/5">
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-white/30 mb-4">
            Directorio
          </p>
          <div className="flex items-end justify-between gap-4">
            <h1 className="text-6xl sm:text-7xl font-black tracking-tighter leading-none text-white">
              Tiendas
            </h1>
            <p className="text-white/25 text-sm font-medium pb-2 shrink-0">
              {loading ? "—" : `${total} activa${total !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {/* ── GRID ── */}
        <div className="py-12">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-[#111] rounded-2xl overflow-hidden animate-pulse border border-white/5">
                  <div className="h-48 bg-white/5" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-white/5 rounded-full w-2/3" />
                    <div className="h-3 bg-white/5 rounded-full w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-32">
              <div className="w-14 h-14 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Package className="h-6 w-6 text-white/20" />
              </div>
              <h2 className="text-xl font-bold text-white/60 mb-2">
                {search ? "Sin resultados" : "Sin tiendas aún"}
              </h2>
              <p className="text-white/25 text-sm mb-8">
                {search ? "Probá con otro nombre." : "Las primeras tiendas están por llegar."}
              </p>
              <Link
                href="/registro"
                className="inline-flex items-center gap-2 border border-white/15 text-white/70 hover:border-white/40 hover:text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all"
              >
                Crear mi tienda
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((store) => (
                <Link
                  key={store.id}
                  href={`/tienda/${store.slug}`}
                  className="card-hover bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden block group"
                >
                  {/* Preview */}
                  <div className="relative overflow-hidden h-48 bg-[#0d0d0d]">
                    <iframe
                      src={`/tienda/${store.slug}`}
                      className="absolute border-0 pointer-events-none"
                      style={{
                        top: "-20px",
                        left: "calc(50% - 160px)",
                        width: "1280px",
                        height: "800px",
                        transform: "scale(0.25)",
                        transformOrigin: "top left",
                      }}
                      loading="lazy"
                      tabIndex={-1}
                      aria-hidden="true"
                      title=""
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />

                    {store.isVerified && (
                      <div className="absolute top-3 right-3">
                        <div className="flex items-center gap-1 bg-white text-[#080808] text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
                          <BadgeCheck className="h-3 w-3" />
                          Verificado
                        </div>
                      </div>
                    )}

                    {store.categories[0] && (
                      <div className="absolute bottom-3 left-3">
                        <span className="text-white/50 text-[11px] font-medium px-2.5 py-1 rounded-full border border-white/10 bg-black/40 backdrop-blur-sm capitalize">
                          {store.categories[0]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-white text-[15px] leading-tight group-hover:text-white transition-colors truncate">
                        {store.name}
                      </h3>
                      <div
                        className="w-2 h-2 rounded-full shrink-0 mt-1.5 opacity-70"
                        style={{ backgroundColor: store.primaryColor }}
                      />
                    </div>

                    {store.description && (
                      <p className="text-white/30 text-xs line-clamp-1 mb-4 leading-relaxed">
                        {store.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <span className="text-[11px] text-white/25 font-medium">
                        {store.totalProducts} productos
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white/40 group-hover:text-white/70 transition-colors">
                        <Eye className="h-3.5 w-3.5" />
                        Ver tienda
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* ── PAGINACIÓN ── */}
          {!loading && pages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-16">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-white/40 hover:text-white hover:border-white/25 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>
              <span className="text-xs text-white/20 font-medium tabular-nums">
                {page} / {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-white/40 hover:text-white hover:border-white/25 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              >
                Siguiente <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
