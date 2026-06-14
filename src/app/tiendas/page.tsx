"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  BadgeCheck, Eye, Search, ChevronLeft, ChevronRight,
  Package, ArrowLeft, LayoutGrid, Shirt, Car, Monitor,
  Home, Utensils, Sparkles, Dumbbell, PawPrint, BookOpen, Store,
} from "lucide-react";
import { STORE_TYPES } from "@/lib/storeTypes";
import type { LucideIcon } from "lucide-react";

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
  tipoTienda: string;
  updatedAt: number;
};

const TYPE_ICONS: Record<string, LucideIcon> = {
  TODAS:     LayoutGrid,
  ROPA:      Shirt,
  AUTOS:     Car,
  TECH:      Monitor,
  HOGAR:     Home,
  ALIMENTOS: Utensils,
  BELLEZA:   Sparkles,
  DEPORTE:   Dumbbell,
  MASCOTAS:  PawPrint,
  LIBROS:    BookOpen,
  GENERAL:   Store,
};

const ALL_TAB = { id: "TODAS", label: "Todas" };

export default function TiendasPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [tipo, setTipo] = useState("TODAS");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchStores = useCallback(async (p: number, t: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "12" });
      if (t !== "TODAS") params.set("tipoTienda", t);
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
    fetchStores(page, tipo);
  }, [page, tipo, fetchStores]);

  function handleTipo(t: string) {
    setTipo(t);
    setPage(1);
  }

  function scrollTabs(dir: "left" | "right") {
    scrollRef.current?.scrollBy({ left: dir === "right" ? 220 : -220, behavior: "smooth" });
  }

  const filtered = search.trim()
    ? stores.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : stores;

  const tabs = [ALL_TAB, ...STORE_TYPES.map((t) => ({ id: t.id, label: t.label }))];
  const activeConfig = STORE_TYPES.find((t) => t.id === tipo);

  return (
    <div className="min-h-screen bg-[#f8f7f5]">
      <style>{`
        .store-card { transition: transform .25s cubic-bezier(.4,0,.2,1), box-shadow .25s cubic-bezier(.4,0,.2,1); }
        .store-card:hover { transform: translateY(-3px); box-shadow: 0 16px 40px rgba(0,0,0,.10); }
        .tabs-scroll::-webkit-scrollbar { display: none; }
        .tabs-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .arrow-fade { background: linear-gradient(to right, #f8f7f5 60%, transparent); }
        .arrow-fade-r { background: linear-gradient(to left, #f8f7f5 60%, transparent); }
      `}</style>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 bg-[#f8f7f5]/95 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 transition-colors group shrink-0"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-semibold tracking-widest uppercase hidden sm:block">TiendaApps</span>
          </Link>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tienda..."
              className="w-full bg-white border border-black/8 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
            />
          </div>
        </div>

        {/* ── TABS CON FLECHAS ── */}
        <div className="relative max-w-7xl mx-auto">
          {/* Flecha izquierda */}
          <div className="arrow-fade absolute left-0 top-0 bottom-0 w-12 z-10 flex items-center pointer-events-none">
            <button
              onClick={() => scrollTabs("left")}
              className="pointer-events-auto ml-1 w-7 h-7 rounded-full bg-white border border-black/10 shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Scroll container */}
          <div
            ref={scrollRef}
            className="tabs-scroll flex gap-2 overflow-x-auto px-10 pb-3 pt-1"
          >
            {tabs.map((tab) => {
              const active = tipo === tab.id;
              const Icon = TYPE_ICONS[tab.id];
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTipo(tab.id)}
                  className={`shrink-0 flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap border transition-all duration-150 ${
                    active
                      ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                      : "bg-white text-gray-500 border-black/8 hover:border-gray-300 hover:text-gray-800"
                  }`}
                >
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Flecha derecha */}
          <div className="arrow-fade-r absolute right-0 top-0 bottom-0 w-12 z-10 flex items-center justify-end pointer-events-none">
            <button
              onClick={() => scrollTabs("right")}
              className="pointer-events-auto mr-1 w-7 h-7 rounded-full bg-white border border-black/10 shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Título de sección */}
        <div className="mb-6">
          {tipo === "TODAS" ? (
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Tiendas activas</h1>
              <p className="text-gray-400 text-sm mt-0.5">
                {loading ? "Cargando…" : `${total} tienda${total !== 1 ? "s" : ""}`}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {activeConfig && (() => {
                const Icon = TYPE_ICONS[activeConfig.id];
                return Icon ? (
                  <div className="w-10 h-10 rounded-xl bg-white border border-black/8 flex items-center justify-center shadow-sm">
                    <Icon className="h-5 w-5 text-gray-700" />
                  </div>
                ) : null;
              })()}
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">{activeConfig?.label}</h1>
                <p className="text-gray-400 text-sm mt-0.5">
                  {loading ? "Cargando…" : `${total} tienda${total !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse border border-black/5">
                <div className="h-44 bg-gray-100" />
                <div className="p-4 space-y-2.5">
                  <div className="h-4 bg-gray-100 rounded-full w-2/3" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-28">
            <div className="w-14 h-14 rounded-2xl bg-white border border-black/8 flex items-center justify-center mx-auto mb-4 shadow-sm">
              {activeConfig && TYPE_ICONS[activeConfig.id]
                ? (() => { const Icon = TYPE_ICONS[activeConfig.id]; return <Icon className="h-6 w-6 text-gray-400" />; })()
                : <Package className="h-6 w-6 text-gray-400" />
              }
            </div>
            <h2 className="text-xl font-bold text-gray-600 mb-2">
              {search ? "Sin resultados para esa búsqueda" : "Todavía no hay tiendas en esta categoría"}
            </h2>
            <p className="text-gray-400 text-sm mb-7">
              {search ? "Probá con otro nombre." : "¡Sé el primero en abrir una!"}
            </p>
            <Link
              href="/registro"
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-700 transition-colors"
            >
              Crear mi tienda
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((store) => {
              const storeTypeIcon = TYPE_ICONS[store.tipoTienda];
              return (
                <Link
                  key={store.id}
                  href={`/tienda/${store.slug}`}
                  className="store-card bg-white rounded-2xl overflow-hidden border border-black/[0.06] group block"
                >
                  {/* Preview */}
                  <div className="relative overflow-hidden h-44 bg-gray-50">
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

                    {store.isVerified && (
                      <div className="absolute top-2.5 right-2.5">
                        <div className="flex items-center gap-1 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow">
                          <BadgeCheck className="h-3 w-3" />
                          Verificado
                        </div>
                      </div>
                    )}

                    {storeTypeIcon && (() => {
                      const Icon = storeTypeIcon;
                      return (
                        <div className="absolute top-2.5 left-2.5 w-7 h-7 rounded-lg bg-white/90 backdrop-blur-sm border border-black/5 shadow-sm flex items-center justify-center">
                          <Icon className="h-3.5 w-3.5 text-gray-600" />
                        </div>
                      );
                    })()}
                  </div>

                  {/* Accent bar */}
                  <div className="h-0.5" style={{ backgroundColor: store.primaryColor + "80" }} />

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-bold text-gray-900 text-sm leading-snug truncate group-hover:text-indigo-600 transition-colors">
                        {store.name}
                      </h3>
                      <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: store.primaryColor }} />
                    </div>

                    {store.description && (
                      <p className="text-xs text-gray-400 line-clamp-1 mb-3">{store.description}</p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-[11px] text-gray-400 font-medium">
                        {store.totalProducts} producto{store.totalProducts !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-gray-400 group-hover:text-indigo-600 transition-colors">
                        <Eye className="h-3.5 w-3.5" />
                        Ver tienda
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Paginación */}
        {!loading && pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-12">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-black/10 text-sm font-semibold text-gray-500 bg-white hover:border-gray-300 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <span className="text-sm text-gray-400 tabular-nums font-medium">{page} / {pages}</span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-black/10 text-sm font-semibold text-gray-500 bg-white hover:border-gray-300 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
