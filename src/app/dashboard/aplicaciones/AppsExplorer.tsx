"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, CheckCircle, ChevronRight, ChevronDown } from "lucide-react";
import { APPS_REGISTRY, CATEGORY_LABELS, type AppCategory } from "@/lib/apps/registry";
import AppIcon from "@/components/apps/AppIcon";

const INITIAL_VISIBLE = 5;

export default function AppsExplorer({ installedById }: { installedById: Record<string, boolean> }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<AppCategory | "todas">("todas");
  const [showAll, setShowAll] = useState(false);

  const q = query.trim().toLowerCase();
  const filtered = APPS_REGISTRY.filter((app) => {
    if (category !== "todas" && app.category !== category) return false;
    if (q && !`${app.name} ${app.description} ${app.providerName}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const visible = showAll ? filtered : filtered.slice(0, INITIAL_VISIBLE);
  const categories = Array.from(new Set(APPS_REGISTRY.map((a) => a.category))) as AppCategory[];

  return (
    <div>
      {/* Buscador */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowAll(false); }}
          placeholder="Buscar aplicaciones…"
          className="w-full rounded-full border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {/* Filtros por categoría */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <FilterChip active={category === "todas"} onClick={() => setCategory("todas")}>
          Todas
        </FilterChip>
        {categories.map((c) => (
          <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
            {CATEGORY_LABELS[c]}
          </FilterChip>
        ))}
      </div>

      {/* Lista de aplicaciones */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center">
          <p className="text-sm font-semibold text-slate-700">No encontramos ninguna aplicación con esa búsqueda.</p>
          <p className="text-xs text-slate-400 mt-1">Probá con otra palabra o quitá los filtros.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100 overflow-hidden">
          {visible.map((app) => (
            <Link
              key={app.id}
              href={`/dashboard/aplicaciones/${app.id}`}
              className="group flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
            >
              <div className="h-14 w-14 shrink-0 rounded-xl border border-slate-100 bg-white shadow-sm flex items-center justify-center">
                <AppIcon id={app.id} className="h-8 w-8" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{app.name}</h3>
                  {installedById[app.id] && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">
                      <CheckCircle className="h-2.5 w-2.5" /> Instalada
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{app.description}</p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className="text-[11px] font-bold text-slate-500 border border-slate-200 rounded-full px-2.5 py-0.5 bg-slate-50">
                  {app.price === "gratis" ? "Gratis" : "Pago"}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Ver más */}
      {!showAll && filtered.length > INITIAL_VISIBLE && (
        <div className="mt-5 text-center">
          <button
            onClick={() => setShowAll(true)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-colors"
          >
            Ver más aplicaciones <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border-indigo-600 bg-indigo-600 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
      }`}
    >
      {children}
    </button>
  );
}
