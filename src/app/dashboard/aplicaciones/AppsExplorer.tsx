"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, CheckCircle, ChevronRight, ChevronDown, Check } from "lucide-react";
import { APPS_REGISTRY, CATEGORY_LABELS, getAccent, type AppCategory } from "@/lib/apps/registry";
import AppIcon from "@/components/apps/AppIcon";

const INITIAL_VISIBLE = 6;

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
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((app) => {
            const accent = getAccent(app.id);
            const instalada = installedById[app.id];
            return (
              <Link
                key={app.id}
                href={`/dashboard/aplicaciones/${app.id}`}
                className={`group flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden ring-2 ring-transparent transition-all hover:shadow-md hover:-translate-y-0.5 ${accent.ring}`}
              >
                {/* Filete con el color de la marca */}
                <div className={`h-1 bg-gradient-to-r ${accent.band}`} />

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start gap-3.5">
                    <div className="h-12 w-12 shrink-0 rounded-xl border border-slate-100 bg-white shadow-sm flex items-center justify-center">
                      <AppIcon id={app.id} className="h-7 w-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">{app.name}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{app.providerName}</p>
                    </div>
                    {instalada && (
                      <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                        <CheckCircle className="h-2.5 w-2.5" /> Instalada
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mt-3.5 leading-relaxed line-clamp-3">
                    {app.description}
                  </p>

                  {/* Los dos primeros beneficios: es lo que decide si le interesa o no */}
                  <ul className="mt-3.5 space-y-1.5">
                    {app.benefits.slice(0, 2).map((b, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <Check className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-[11px] text-slate-600 leading-snug line-clamp-1">{b}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {app.comingSoon ? (
                        <span className="text-[10px] font-bold text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 bg-amber-50">
                          Próximamente
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-600 border border-slate-200 rounded-full px-2 py-0.5 bg-slate-50">
                          {app.price === "gratis" ? "Gratis" : "Pago"}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${accent.chip}`}>
                        {CATEGORY_LABELS[app.category]}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0">
                      {instalada ? "Configurar" : "Ver más"}
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
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
