"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  BadgeCheck, Eye, Search, ChevronLeft, ChevronRight,
  Package, ArrowLeft, LayoutGrid, Shirt, Car,
  Home, Utensils, Store, Download,
} from "lucide-react";
import { STORE_TYPES } from "@/lib/storeTypes";
import type { TiendaDirectorio } from "@/lib/tiendasDirectorio";
import type { LucideIcon } from "lucide-react";

type StoreItem = TiendaDirectorio;

const TYPE_ICONS: Record<string, LucideIcon> = {
  TODAS:     LayoutGrid,
  ROPA:      Shirt,
  AUTOS:     Car,
  HOGAR_TECH: Home,
  GASTRONOMIA: Utensils,
  DIGITAL:   Download,
  GENERAL:   Store,
};

const ALL_TAB = { id: "TODAS", label: "Todas" };
const tabs = [ALL_TAB, ...STORE_TYPES.map((t) => ({ id: t.id, label: t.label }))];

type ArrowState = Record<string, { left: boolean; right: boolean }>;

export default function TiendasPage({ tiendasIniciales }: { tiendasIniciales: StoreItem[] }) {
  // Arranca CON las tiendas puestas, no vacío: son las que el servidor ya
  // dibujó en el HTML. Si arrancara vacío, React borraría del DOM las tarjetas
  // que acaban de llegar para volver a poner los esqueletos, y el visitante
  // vería parpadear la página entera por nada.
  const [allStores, setAllStores] = useState<StoreItem[]>(tiendasIniciales);
  const [loading, setLoading] = useState(tiendasIniciales.length === 0);
  const [tipo, setTipo] = useState("TODAS");
  const [search, setSearch] = useState("");
  const [arrows, setArrows] = useState<ArrowState>({});

  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const carouselRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Sólo si el servidor no pudo traerlas (la base caída, por ejemplo). En el
  // camino normal no se pide nada: el dato ya vino con la página.
  useEffect(() => {
    if (tiendasIniciales.length > 0) return;
    fetch("/api/stores?limit=100")
      .then((r) => r.json())
      .then((data) => setAllStores(data.stores ?? []))
      .finally(() => setLoading(false));
  }, [tiendasIniciales.length]);

  const checkArrows = useCallback((id: string) => {
    const el = carouselRefs.current[id];
    if (!el) return;
    setArrows((prev) => ({
      ...prev,
      [id]: {
        left: el.scrollLeft > 2,
        right: Math.ceil(el.scrollLeft) < el.scrollWidth - el.clientWidth - 2,
      },
    }));
  }, []);

  // Re-init listeners whenever visible groups change
  const searchFiltered = search.trim()
    ? allStores.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : allStores;

  const groups = STORE_TYPES
    .map((t) => ({ ...t, stores: searchFiltered.filter((s) => s.tipoTienda === t.id) }))
    .filter((g) => g.stores.length > 0);

  const visibleGroups = tipo === "TODAS" ? groups : groups.filter((g) => g.id === tipo);
  const visibleGroupIds = visibleGroups.map((g) => g.id).join(",");

  useEffect(() => {
    if (loading) return;
    const cleanups: Array<() => void> = [];

    const raf = requestAnimationFrame(() => {
      visibleGroupIds.split(",").filter(Boolean).forEach((id) => {
        const el = carouselRefs.current[id];
        if (!el) return;

        const onScroll = () => checkArrows(id);
        checkArrows(id);
        el.addEventListener("scroll", onScroll, { passive: true });

        const ro = new ResizeObserver(() => checkArrows(id));
        ro.observe(el);

        cleanups.push(() => {
          el.removeEventListener("scroll", onScroll);
          ro.disconnect();
        });
      });
    });

    return () => {
      cancelAnimationFrame(raf);
      cleanups.forEach((c) => c());
    };
  }, [loading, visibleGroupIds, checkArrows]);

  function scrollTabs(dir: "left" | "right") {
    tabsScrollRef.current?.scrollBy({ left: dir === "right" ? 240 : -240, behavior: "smooth" });
  }

  function scrollCarousel(id: string, dir: "left" | "right") {
    carouselRefs.current[id]?.scrollBy({ left: dir === "right" ? 312 : -312, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-[#f8f7f5]">
      <style>{`
        .store-card { transition: transform .25s cubic-bezier(.4,0,.2,1), box-shadow .25s cubic-bezier(.4,0,.2,1); }
        .store-card:hover { transform: translateY(-3px); box-shadow: 0 16px 40px rgba(0,0,0,.10); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 bg-[#f8f7f5]/95 backdrop-blur-md border-b border-black/5">
        {/* Top row */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 transition-colors group shrink-0">
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

        {/* Tabs row — flechas en la misma línea */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 flex items-center gap-2">
          <button
            onClick={() => scrollTabs("left")}
            className="shrink-0 w-7 h-7 rounded-full bg-white border border-black/10 shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div ref={tabsScrollRef} className="no-scrollbar flex-1 flex gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const active = tipo === tab.id;
              const Icon = TYPE_ICONS[tab.id];
              return (
                <button
                  key={tab.id}
                  onClick={() => setTipo(tab.id)}
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

          <button
            onClick={() => scrollTabs("right")}
            className="shrink-0 w-7 h-7 rounded-full bg-white border border-black/10 shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── CONTENIDO ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12">

        {loading ? (
          <div className="space-y-10">
            {[1, 2].map((s) => (
              <div key={s}>
                <div className="h-6 w-40 bg-gray-200 rounded-full animate-pulse mb-5" />
                <div className="flex gap-4">
                  {[1, 2, 3].map((c) => (
                    <div key={c} className="shrink-0 w-72 bg-white rounded-2xl overflow-hidden animate-pulse border border-black/5">
                      <div className="h-44 bg-gray-100" />
                      <div className="p-4 space-y-2.5">
                        <div className="h-4 bg-gray-100 rounded-full w-2/3" />
                        <div className="h-3 bg-gray-100 rounded-full w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : visibleGroups.length === 0 ? (
          <div className="text-center py-28">
            <div className="w-14 h-14 rounded-2xl bg-white border border-black/8 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Package className="h-6 w-6 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-600 mb-2">
              {search ? "Sin resultados para esa búsqueda" : "Todavía no hay tiendas en esta categoría"}
            </h2>
            <p className="text-gray-400 text-sm mb-7">
              {search ? "Probá con otro nombre." : "¡Sé el primero en abrir una!"}
            </p>
            <Link href="/registro" className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-700 transition-colors">
              Crear mi tienda
            </Link>
          </div>
        ) : (
          visibleGroups.map((group) => {
            const Icon = TYPE_ICONS[group.id];
            const canLeft = arrows[group.id]?.left ?? false;
            const canRight = arrows[group.id]?.right ?? false;

            return (
              <section key={group.id}>
                {/* Título */}
                <div className="flex items-center gap-2.5 mb-5">
                  {Icon && (
                    <div className="w-8 h-8 rounded-lg bg-white border border-black/8 flex items-center justify-center shadow-sm shrink-0">
                      <Icon className="h-4 w-4 text-gray-700" />
                    </div>
                  )}
                  <h2 className="text-lg font-black text-gray-900 tracking-tight">{group.label}</h2>
                  <span className="text-xs text-gray-400 font-medium">
                    {group.stores.length} tienda{group.stores.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Carrusel con flechas en los bordes */}
                <div className="relative">
                  {/* Flecha izquierda */}
                  {canLeft && (
                    <button
                      onClick={() => scrollCarousel(group.id, "left")}
                      className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-black/10 shadow-md flex items-center justify-center text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-all"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}

                  {/* Cards */}
                  <div
                    ref={(el) => { carouselRefs.current[group.id] = el; }}
                    className="no-scrollbar flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
                  >
                    {group.stores.map((store) => {
                      const StoreIcon = TYPE_ICONS[store.tipoTienda];
                      return (
                        <Link
                          key={store.id}
                          href={`/tienda/${store.slug}`}
                          className="store-card snap-start shrink-0 w-[280px] sm:w-72 bg-white rounded-2xl overflow-hidden border border-black/[0.06] group block"
                        >
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
                            {StoreIcon && (
                              <div className="absolute top-2.5 left-2.5 w-7 h-7 rounded-lg bg-white/90 backdrop-blur-sm border border-black/5 shadow-sm flex items-center justify-center">
                                <StoreIcon className="h-3.5 w-3.5 text-gray-600" />
                              </div>
                            )}
                          </div>
                          <div className="h-0.5" style={{ backgroundColor: store.primaryColor + "80" }} />
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

                  {/* Flecha derecha */}
                  {canRight && (
                    <button
                      onClick={() => scrollCarousel(group.id, "right")}
                      className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-black/10 shadow-md flex items-center justify-center text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-all"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
