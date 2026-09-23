"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Store, Package, Users, ShoppingBag, Globe, EyeOff, Calendar, RefreshCw, Power, Search, X, Trash2, RotateCcw, AlertTriangle, BookOpen } from "lucide-react";

type PendingToggle = { store: StoreRow; field: "isPublished" | "isActive" };
type ResetState = { store: StoreRow; loading: boolean; error: string };

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  isActive: boolean;
  isPublished: boolean;
  createdAt: string;
  /**
   * Es una cuenta de Productos Digitales, no una tienda.
   *
   * ⚠️ Tienen una fila en `Store` porque ahí viven sus productos, pero NO son
   * una tienda, y la diferencia no es de etiqueta: sus páginas públicas exigen
   * `store.isPublished === false` (`/p/[id]`, `/pagar`, `/gracias`,
   * `/legales` hacen `notFound()` si está publicada). Publicarlas desde acá le
   * apaga la venta entera.
   */
  esDigital: boolean;
  /** Cuándo cerró la cuenta, o `null` si sigue abierta. */
  cerradaEl: string | null;
  owner: { name: string | null; email: string };
  _count: { products: number; affiliates: number; orders: number };
};

const STORE_FILTERS = [
  { value: "",           label: "Todas" },
  { value: "activas",    label: "Activas" },
  { value: "inactivas",  label: "Sin publicar" },
  { value: "digitales",  label: "Digitales" },
  { value: "eliminadas", label: "Eliminadas" },
] as const;

function isDeletedStore(s: StoreRow) { return s.slug.startsWith("deleted-"); }

function applyStoreFilter(stores: StoreRow[], filter: string): StoreRow[] {
  switch (filter) {
    case "activas":    return stores.filter(s => s.isActive && s.isPublished && !isDeletedStore(s));
    /* Las digitales quedan afuera de "Sin publicar": estar sin publicar es su
       estado normal y correcto, no algo pendiente de resolver. Mezcladas, la
       lista de "esto hay que revisarlo" tenía adentro cuentas que están bien. */
    case "inactivas":  return stores.filter(s => !isDeletedStore(s) && !s.esDigital && (!s.isActive || !s.isPublished));
    case "digitales":  return stores.filter(s => s.esDigital && !isDeletedStore(s));
    case "eliminadas": return stores.filter(isDeletedStore);
    default:           return stores.filter(s => !isDeletedStore(s));
  }
}

export default function TiendasAdmin({ stores: initial, filter: activeFilter }: { stores: StoreRow[]; filter: string }) {
  const baseStores = useMemo(() => applyStoreFilter(initial, activeFilter), [initial, activeFilter]);
  const [stores, setStores] = useState(baseStores);
  // Reset del estado local cuando cambian los props (patrón "adjust state during
  // render" de React) — reemplaza al efecto de sincronización, sin el render extra.
  const [prevBase, setPrevBase] = useState(baseStores);
  if (baseStores !== prevBase) {
    setPrevBase(baseStores);
    setStores(baseStores);
  }

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<PendingToggle | null>(null);
  const [resetState, setResetState] = useState<ResetState | null>(null);

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

  async function handleReset() {
    if (!resetState) return;
    setResetState(d => d ? { ...d, loading: true, error: "" } : null);
    try {
      const res = await fetch(`/api/admin/tiendas/${resetState.store.id}`, { method: "DELETE" });
      if (res.ok) {
        setResetState(null);
      } else {
        const err = await res.json();
        setResetState(d => d ? { ...d, loading: false, error: err.error ?? "Error al resetear." } : null);
      }
    } catch {
      setResetState(d => d ? { ...d, loading: false, error: "Error de conexión." } : null);
    }
  }

  function confirmLabel(p: PendingToggle) {
    if (p.field === "isPublished") return p.store.isPublished ? "dejar de publicar" : "publicar";
    return p.store.isActive ? "desactivar" : "activar";
  }

  /* ⚠️ Cada número tiene que contar EXACTAMENTE lo que muestra su filtro.
     Las digitales quedaron afuera de "Sin publicar" —para ellas eso no es un
     pendiente, es su estado correcto— así que también tienen que quedar afuera
     de ese contador, y de "Total", que cuenta tiendas. Si no, la tarjeta dice
     un número, se la toca, y la lista muestra otro. */
  const stats = useMemo(() => ({
    total:     initial.filter(s => !isDeletedStore(s) && !s.esDigital).length,
    activas:   initial.filter(s => s.isActive && s.isPublished && !isDeletedStore(s)).length,
    inactivas: initial.filter(s => !isDeletedStore(s) && !s.esDigital && (!s.isActive || !s.isPublished)).length,
    digitales: initial.filter(s => s.esDigital && !isDeletedStore(s)).length,
    eliminadas: initial.filter(isDeletedStore).length,
  }), [initial]);

  return (
    <>
      {/* Resumen clicable */}
      {/* Cinco tarjetas desde que las cuentas digitales se cuentan aparte. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
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
        <Link href="/admin/tiendas?f=digitales" className={`rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 flex items-center gap-3 hover:opacity-80 transition-all ${activeFilter === "digitales" ? "ring-2 ring-white/20" : ""}`}>
          <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-4 w-4 text-orange-400" />
          </div>
          <div>
            <p className="text-xl font-black text-white">{stats.digitales}</p>
            <p className="text-xs text-orange-400 font-medium">Digitales</p>
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

      {/* Modal resetear diseño */}
      {resetState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-gray-900 border border-amber-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Resetear diseño</p>
                <p className="text-gray-400 text-xs mt-0.5">El dueño podrá elegir un nuevo template</p>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-3 mb-4 flex items-center gap-3">
              <Store className="h-4 w-4 text-gray-400 shrink-0" />
              <div>
                <p className="text-white text-sm font-semibold">{resetState.store.name}</p>
                <p className="text-gray-500 text-xs">/{resetState.store.slug}</p>
              </div>
            </div>

            <p className="text-gray-300 text-sm mb-5">
              Esto limpia el diseño y los bloques de la página. Los productos, afiliados y pedidos <strong className="text-white">no se tocan</strong>.
            </p>

            {resetState.error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-500/20 rounded-xl px-4 py-2.5 mb-4">
                {resetState.error}
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setResetState(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold border border-white/10 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleReset}
                disabled={resetState.loading}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-40">
                {resetState.loading
                  ? <><RefreshCw className="h-4 w-4 animate-spin" /> Reseteando...</>
                  : <><RotateCcw className="h-4 w-4" /> Resetear diseño</>
                }
              </button>
            </div>
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
                      {/* El ícono dice de una qué es esto. Una cuenta digital
                          con el mismo cartelito de tienda se lee como una
                          tienda, y todo lo que sigue en la fila se interpreta
                          mal: su "sin publicar" no es un pendiente, y su
                          cantidad de productos no significa lo mismo. */}
                      {s.esDigital ? (
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-orange-500/10 border border-orange-500/20">
                          <BookOpen className="h-4 w-4 text-orange-400" />
                        </div>
                      ) : (
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: s.primaryColor + "22" }}
                        >
                          <Store className="h-4 w-4" style={{ color: s.primaryColor }} />
                        </div>
                      )}
                      <div>
                        <p className="text-white text-sm font-medium">
                          {s.name}
                          {s.esDigital && (
                            <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded text-orange-400 bg-orange-500/10 border border-orange-500/20">
                              Digital
                            </span>
                          )}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {s.esDigital ? "cuenta de Productos Digitales" : `/${s.slug}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-white text-xs font-medium">{s.owner.name ?? "—"}</p>
                    <p className="text-gray-500 text-xs">{s.owner.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    {/* ⚠️ ACÁ NO VA UN BOTÓN PARA UNA CUENTA DIGITAL.
                        Sus páginas públicas exigen que la tienda NO esté
                        publicada: `/p/[id]`, `/pagar`, `/gracias` y
                        `/legales` devuelven 404 si lo está. Un clic de más en
                        esta columna le apagaba la página de venta, el checkout
                        y la pantalla de gracias al mismo tiempo, sin ningún
                        error y sin que nadie se enterara hasta que dejaran de
                        entrarle ventas. El backend también lo rechaza.
                        Cada página digital se publica de a una, desde su
                        propio panel. */}
                    {s.esDigital ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/5 bg-gray-800/60 text-gray-500"
                        title="Las páginas de una cuenta digital se publican de a una desde su panel. Publicar la tienda le devolvería 404 en todas."
                      >
                        <BookOpen className="h-3 w-3" />
                        Por producto
                      </span>
                    ) : (
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
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {/* ⚠️ Para una cuenta digital, este botón no hacía NADA.
                        `Store.isActive` no lo lee nadie en su camino: ni sus
                        páginas públicas, ni su panel, ni el cron. Se apretaba,
                        se guardaba la columna, y la cuenta seguía igual — un
                        botón que promete y no cumple es tan malo como uno que
                        rompe, sólo que se descubre más tarde.
                        Lo que sí dice si esa cuenta está andando es si está
                        cerrada, y eso es lo que se muestra. Se cierra y se
                        reabre desde su propio panel. */}
                    {s.esDigital ? (
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                          s.cerradaEl
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : "bg-gray-800/60 text-gray-400 border-white/5"
                        }`}
                        title={s.cerradaEl
                          ? `La dueña cerró su cuenta el ${new Date(s.cerradaEl).toLocaleDateString("es-AR")}`
                          : "Cuenta abierta. Las cuentas digitales se cierran y se reabren desde su propio panel."}
                      >
                        <Power className="h-3 w-3" />
                        {s.cerradaEl ? "Cerrada" : "Abierta"}
                      </span>
                    ) : (
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
                    )}
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
                    {/* ⚠️ Una cuenta digital no tiene diseño de tienda que
                        resetear, pero SÍ guarda lo suyo en `storeConfig`: ahí
                        viven sus píxeles de medición, que leen su página de
                        venta, su checkout y su pantalla de gracias. Vaciarlo le
                        apagaba el seguimiento de sus anuncios en silencio.
                        En vez del botón, el link a su pantalla. */}
                    {s.esDigital ? (
                      <Link
                        href="/admin/digitales"
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-orange-500/20 bg-orange-500/5 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300 transition-all"
                      >
                        <BookOpen className="h-3 w-3" /> Ver en Digitales
                      </Link>
                    ) : (
                      <button
                        onClick={() => setResetState({ store: s, loading: false, error: "" })}
                        title="Resetear diseño"
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 transition-all"
                      >
                        <RotateCcw className="h-3 w-3" /> Resetear diseño
                      </button>
                    )}
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
