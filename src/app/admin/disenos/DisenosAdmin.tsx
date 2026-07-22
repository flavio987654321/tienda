"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Palette, Mail, Phone, Store, ExternalLink, Ban, Loader2,
  ChevronLeft, ChevronRight, Sparkles, TrendingUp,
} from "lucide-react";
import { RUBROS, ESTETICAS, PALETAS, FOTOS, CATALOGO, LOGO } from "@/lib/designBrief";
import { useMarkAdminSectionSeen } from "@/hooks/useMarkAdminSectionSeen";

type Brief = {
  id: string;
  tipoTienda: string;
  estetica: string;
  paleta: string;
  coloresPropios: string | null;
  referencias: string | null;
  noQuiero: string | null;
  nombreTienda: string | null;
  queVende: string | null;
  fotos: string | null;
  catalogo: string | null;
  logo: string | null;
  nombre: string;
  email: string;
  telefono: string | null;
  tieneTienda: boolean;
  tiendaUrl: string | null;
  status: string;
  createdAt: string;
};

type Pattern = { tipoTienda: string; estetica: string; count: number };

const STATUS_META: Record<string, { label: string; chip: string; dot: string }> = {
  NEW:       { label: "Nuevo",      chip: "bg-orange-500/15 text-orange-300 border-orange-500/30", dot: "bg-orange-400" },
  REVIEWED:  { label: "Visto",      chip: "bg-white/5 text-gray-300 border-white/10",              dot: "bg-gray-400" },
  BUILDING:  { label: "En diseño",  chip: "bg-amber-500/15 text-amber-300 border-amber-500/30",    dot: "bg-amber-400" },
  DONE:      { label: "Listo",      chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" },
  DISCARDED: { label: "Descartado", chip: "bg-rose-500/10 text-rose-300 border-rose-500/20",       dot: "bg-rose-400" },
};
const STATUS_ORDER = ["NEW", "REVIEWED", "BUILDING", "DONE", "DISCARDED"] as const;

const rubroById = new Map(RUBROS.map((r) => [r.id, r]));
const esteticaById = new Map(ESTETICAS.map((e) => [e.id, e]));
const paletaById = new Map(PALETAS.map((p) => [p.id, p]));
// Los briefs viejos no tienen estos campos, así que se resuelven a null y la
// tarjeta simplemente no los muestra.
const fotosById = new Map(FOTOS.map((f) => [f.id, f.label]));
const catalogoById = new Map(CATALOGO.map((c) => [c.id, c.label]));
const logoById = new Map(LOGO.map((l) => [l.id, l.label]));

function rubroLabel(id: string) {
  const r = rubroById.get(id);
  return r ? `${r.emoji} ${r.label}` : id;
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-black/20 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs">
      <span className="text-gray-500">{label}:</span>
      <span className="text-gray-200 font-medium">{valor}</span>
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DisenosAdmin() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<string | null>(null); // null = todos
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  // No setea loading=true de arranque a propósito: hacerlo sincrónicamente
  // dentro del efecto dispara un render en cascada (regla del proyecto). El
  // spinner inicial sale del useState(true); al paginar/filtrar el contenido se
  // reemplaza cuando llega la respuesta, sin parpadeo.
  //
  // El catch NO es decorativo: sin él, un error del server dejaba la lista vacía
  // y la pantalla decía "no hay diseños todavía" — o sea, una falla se veía
  // igual que "nadie mandó nada". Con muchas ideas entrando, eso hace que las
  // pierdas de vista sin enterarte.
  const load = useCallback(async (p: number, f: string | null) => {
    const qs = new URLSearchParams({ page: String(p) });
    if (f) qs.set("status", f);

    // Sin try/catch a propósito: la regla set-state-in-effect del proyecto marca
    // como render en cascada cualquier catch que llame setState dentro de una
    // función que corre en un efecto. Los fallos se absorben con .catch(() => null)
    // sobre cada promesa, así todos los setState quedan después de un await.
    const res = await fetch(`/api/admin/disenos?${qs.toString()}`).catch(() => null);
    const data = res && res.ok ? await res.json().catch(() => null) : null;

    if (!data) {
      console.error("[admin/disenos] no se pudieron cargar los diseños (status:", res?.status ?? "sin respuesta", ")");
      setLoadError(true);
      setLoading(false);
      return;
    }

    setBriefs(data.briefs ?? []);
    setTotal(data.total ?? 0);
    setPageSize(data.pageSize ?? 20);
    setByStatus(data.byStatus ?? {});
    setPatterns(data.patterns ?? []);
    setLoadError(false);
    setLoading(false);
  }, []);

  // La carga va dentro de una función async anidada (mismo patrón que LeadsAdmin):
  // llamando a load() directo en el cuerpo del efecto, la regla set-state-in-effect
  // lo lee como setState sincrónico y lo marca como render en cascada.
  useEffect(() => {
    void (async () => { await load(page, filter); })();
  }, [page, filter, load]);

  // Marcar la sección como vista al entrar (apaga el badge del sidebar).
  useMarkAdminSectionSeen("disenos");

  async function setStatus(id: string, status: string) {
    setUpdating(id);
    try {
      const res = await fetch("/api/admin/disenos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load(page, filter);
    } catch (err) {
      // Sin catch, un PATCH fallido dejaba una promesa sin manejar y el estado
      // en pantalla quedaba como si hubiera cambiado. Se recarga igual para que
      // se vea el estado real que quedó guardado.
      console.error("[admin/disenos] no se pudo cambiar el estado:", err);
      await load(page, filter);
    } finally {
      setUpdating(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const totalAll = STATUS_ORDER.reduce((a, s) => a + (byStatus[s] ?? 0), 0);
  const maxPattern = Math.max(1, ...patterns.map((p) => p.count));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
          <Palette className="h-6 w-6 text-indigo-400" /> Diseños pedidos
        </h1>
        <p className="text-gray-400 text-sm">Ideas que mandaron desde “Diseñá tu propia tienda”.</p>
      </div>

      {/* Resumen por patrón: lo más pedido primero, para decidir qué construir. */}
      {patterns.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
          <p className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-indigo-400" /> Lo más pedido
          </p>
          <div className="space-y-2.5">
            {patterns.map((p) => {
              const e = esteticaById.get(p.estetica);
              return (
                <div key={`${p.tipoTienda}-${p.estetica}`} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 text-xs text-gray-300 truncate">
                    {rubroLabel(p.tipoTienda)}
                  </div>
                  <div className="w-32 shrink-0 text-xs text-gray-500 truncate">{e?.label ?? p.estetica}</div>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(p.count / maxPattern) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-white tabular-nums w-6 text-right">{p.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs por estado */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => { setFilter(null); setPage(0); }}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === null ? "bg-indigo-600 text-white" : "bg-white/5 text-gray-400 hover:text-white"
          }`}
        >
          Todos ({totalAll})
        </button>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); setPage(0); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              filter === s ? "bg-indigo-600 text-white" : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[s].dot}`} />
            {STATUS_META[s].label} ({byStatus[s] ?? 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : loadError ? (
        <div className="text-center py-20">
          <div className="inline-flex flex-col items-center gap-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-8 py-6">
            <p className="text-rose-300 font-bold text-sm">No se pudieron cargar los diseños</p>
            <p className="text-rose-400/80 text-xs max-w-xs leading-relaxed">
              Puede ser un problema de conexión o del servidor. Ojo: esto NO quiere decir que no haya
              ideas — quiere decir que no se pudieron leer.
            </p>
            <button
              onClick={() => load(page, filter)}
              className="mt-1 text-xs font-semibold px-4 py-2 rounded-lg border border-rose-500/30 text-rose-200 hover:bg-rose-500/10 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      ) : briefs.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay diseños {filter ? `en “${STATUS_META[filter].label}”` : "todavía"}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {briefs.map((b) => {
            const e = esteticaById.get(b.estetica);
            const pal = paletaById.get(b.paleta);
            const meta = STATUS_META[b.status] ?? STATUS_META.NEW;
            const isNew = b.status === "NEW";
            return (
              <div
                key={b.id}
                className={`rounded-2xl border p-5 transition-colors ${
                  isNew ? "bg-orange-500/[0.04] border-orange-500/20" : "bg-white/5 border-white/10"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isNew && <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />}
                      <h3 className="text-white font-bold truncate">{b.nombre}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                      <a href={`mailto:${b.email}`} className="flex items-center gap-1.5 hover:text-indigo-300">
                        <Mail className="h-3.5 w-3.5" /> {b.email}
                      </a>
                      {b.telefono && (
                        <a
                          href={`https://wa.me/${b.telefono.replace(/\D/g, "")}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 hover:text-emerald-300"
                        >
                          <Phone className="h-3.5 w-3.5" /> {b.telefono}
                        </a>
                      )}
                      <span>{fmtDate(b.createdAt)}</span>
                      {b.tieneTienda && (
                        <span className="flex items-center gap-1.5 text-indigo-300">
                          <Store className="h-3.5 w-3.5" /> Ya tiene tienda{b.tiendaUrl ? `: ${b.tiendaUrl}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full border ${meta.chip}`}>
                    {meta.label}
                  </span>
                </div>

                {/* Qué pidió */}
                <div className="grid sm:grid-cols-3 gap-3 mb-4">
                  <div className="bg-black/20 rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Rubro</p>
                    <p className="text-sm text-white">{rubroLabel(b.tipoTienda)}</p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Estética</p>
                    <div className="flex items-center gap-2">
                      {e && <span className="w-5 h-5 rounded-md border border-white/10 shrink-0" style={{ background: `linear-gradient(120deg, ${e.from}, ${e.to})` }} />}
                      <p className="text-sm text-white truncate">{e?.label ?? b.estetica}</p>
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Paleta</p>
                    <div className="flex items-center gap-2">
                      {pal && (
                        <span className="flex gap-1 shrink-0">
                          {pal.colors.map((c) => <span key={c} className="w-4 h-4 rounded border border-white/10" style={{ backgroundColor: c }} />)}
                        </span>
                      )}
                      <p className="text-sm text-white truncate">{pal?.label ?? b.paleta}</p>
                    </div>
                  </div>
                </div>

                {/* Datos de marca: definen cómo se construye la plantilla, así que
                    van arriba de los textos libres y no escondidos entre ellos. */}
                {(b.queVende || b.nombreTienda || b.fotos || b.catalogo || b.logo) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {b.nombreTienda && <Dato label="Se llama" valor={b.nombreTienda} />}
                    {b.queVende && <Dato label="Vende" valor={b.queVende} />}
                    {b.fotos && <Dato label="Fotos" valor={fotosById.get(b.fotos) ?? b.fotos} />}
                    {b.catalogo && <Dato label="Catálogo" valor={catalogoById.get(b.catalogo) ?? b.catalogo} />}
                    {b.logo && <Dato label="Logo" valor={logoById.get(b.logo) ?? b.logo} />}
                  </div>
                )}

                {/* Detalles opcionales */}
                {(b.coloresPropios || b.referencias || b.noQuiero) && (
                  <div className="space-y-2 mb-4 text-sm">
                    {b.coloresPropios && (
                      <p className="text-gray-300"><span className="text-gray-500">Colores de marca:</span> {b.coloresPropios}</p>
                    )}
                    {b.referencias && (
                      <div className="text-gray-300">
                        <span className="text-gray-500 flex items-center gap-1.5"><ExternalLink className="h-3.5 w-3.5" /> Referencias:</span>
                        <p className="whitespace-pre-wrap break-words mt-0.5 text-gray-400">{b.referencias}</p>
                      </div>
                    )}
                    {b.noQuiero && (
                      <div className="text-gray-300">
                        <span className="text-gray-500 flex items-center gap-1.5"><Ban className="h-3.5 w-3.5" /> No quiere:</span>
                        <p className="whitespace-pre-wrap break-words mt-0.5 text-gray-400">{b.noQuiero}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Cambiar estado */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/5">
                  <span className="text-xs text-gray-500 mr-1">Marcar como:</span>
                  {STATUS_ORDER.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(b.id, s)}
                      disabled={updating === b.id || b.status === s}
                      className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all disabled:cursor-not-allowed ${
                        b.status === s
                          ? STATUS_META[s].chip
                          : "border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-40"
                      }`}
                    >
                      {STATUS_META[s].label}
                    </button>
                  ))}
                  {updating === b.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-400 tabular-nums">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
