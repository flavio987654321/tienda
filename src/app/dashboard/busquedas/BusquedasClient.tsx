"use client";

/* "Avisame si entra" en el panel (06/10/26): lo que más se pide (para saber
   qué comprar) y cada búsqueda con lo que HOY coincide, con "Avisarle por
   WhatsApp" armado. Ver `lib/busquedas`. */

import { useRef, useState } from "react";
import { MessageCircle, Phone, Check, X, RotateCcw, Target } from "lucide-react";
import { numeroWhatsApp } from "@/lib/whatsappTienda";
import { resumenDeBusqueda, mensajeDeAviso } from "@/lib/busquedas";
import { precioEn } from "@/lib/monedaVehiculo";
import type { BusquedaDelPanel } from "@/lib/busquedasServidor";

type Demanda = { que: string; cuantas: number; enStock: number };

function hace(fecha: string): string {
  const d = Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
  return d < 1 ? "hoy" : d === 1 ? "ayer" : `hace ${d} días`;
}

export default function BusquedasClient({ inicial, demanda, slug, tienda, moneda, origen }: {
  inicial: BusquedaDelPanel[]; demanda: Demanda[]; slug: string; tienda: string; moneda: string;
  /** La dirección del sitio, desde el servidor: con window el link quedaba distinto al hidratar. */
  origen: string;
}) {
  const [lista, setLista] = useState(inicial);
  const [filtro, setFiltro] = useState<"ACTIVA" | "CERRADA">("ACTIVA");
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const precio = (n: number, m: string = moneda) => precioEn(n, m);

  // Un doble click no manda dos veces (el botón se apaga recién al pintar).
  const enCurso = useRef(new Set<string>());

  async function patch(id: string, cuerpo: object) {
    const clave = id + JSON.stringify(cuerpo);
    if (enCurso.current.has(clave)) return false;
    enCurso.current.add(clave);
    setOcupada(id);
    setErrores(({ [id]: _, ...r }) => r);
    try {
      const res = await fetch(`/api/busquedas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
      if (!res.ok) throw new Error();
      return true;
    } catch {
      setErrores((e) => ({ ...e, [id]: "No se pudo guardar. Probá de nuevo." }));
      return false;
    } finally {
      enCurso.current.delete(clave);
      setOcupada(null);
    }
  }

  /* Tocar "Avisarle" ES avisarle: queda marcado. No frena el link de WhatsApp. */
  function avisado(b: BusquedaDelPanel, productoId: string) {
    setLista((l) => l.map((x) => x.id === b.id ? { ...x, coincidencias: x.coincidencias.map((c) => c.id === productoId ? { ...c, avisado: true } : c) } : x));
    patch(b.id, { accion: "avisado", productoId });
  }

  async function cambiarEstado(b: BusquedaDelPanel, accion: "cerrar" | "reabrir") {
    if (await patch(b.id, { accion })) {
      // Al reabrir, lo que coincide se ve recién al recargar: lo calcula el servidor.
      setLista((l) => l.map((x) => x.id === b.id ? { ...x, status: accion === "cerrar" ? "CERRADA" : "ACTIVA", coincidencias: accion === "cerrar" ? [] : x.coincidencias } : x));
    }
  }

  const visibles = lista.filter((b) => b.status === filtro);
  const activas = lista.filter((b) => b.status === "ACTIVA").length;

  if (lista.length === 0) {
    return (
      <div className="bg-white panel-oscuro:bg-gray-900 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 p-8 sm:p-16 text-center">
        <Target className="h-10 w-10 text-gray-200 panel-oscuro:text-gray-700 mx-auto mb-4" />
        <p className="text-gray-600 panel-oscuro:text-gray-300 font-medium">Todavía nadie dejó una búsqueda</p>
        <p className="text-sm text-gray-400 panel-oscuro:text-gray-500 mt-1 max-w-md mx-auto">
          En el catálogo de tu tienda hay un botón &quot;Avisame si entra&quot;, y aparece también cuando alguien busca algo que no tenés. Cuando entre un vehículo que coincide, te avisamos para que le escribas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {demanda.length > 0 && (
        <section className="bg-white panel-oscuro:bg-gray-900 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 p-4 sm:p-5">
          <h2 className="font-bold text-gray-900 panel-oscuro:text-gray-100">Lo que más te piden</h2>
          <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mb-3">Búsquedas activas. Sirve para decidir qué comprar.</p>
          <ul className="flex flex-wrap gap-2">
            {demanda.map((d) => (
              <li key={d.que} className="min-w-0 max-w-full rounded-xl border border-gray-100 panel-oscuro:border-gray-800 px-3 py-2">
                <p className="text-sm font-semibold text-gray-900 panel-oscuro:text-gray-100 [overflow-wrap:anywhere]">{d.que}</p>
                <p className="text-xs text-gray-500 panel-oscuro:text-gray-400">
                  {d.cuantas} {d.cuantas === 1 ? "persona" : "personas"} ·{" "}
                  {d.enStock > 0 ? <span className="text-green-700 panel-oscuro:text-green-400 font-semibold">tenés {d.enStock}</span> : <span className="text-amber-700 panel-oscuro:text-amber-400 font-semibold">no tenés</span>}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-white panel-oscuro:bg-gray-900 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 overflow-hidden">
        <div className="flex gap-2 p-4 border-b border-gray-100 panel-oscuro:border-gray-800">
          {(["ACTIVA", "CERRADA"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFiltro(f)} aria-pressed={filtro === f}
              className={`px-3 py-2 rounded-xl text-xs font-semibold ${filtro === f ? "bg-indigo-600 text-white" : "bg-gray-50 panel-oscuro:bg-gray-800/50 text-gray-600 panel-oscuro:text-gray-400 hover:bg-gray-100"}`}>
              {f === "ACTIVA" ? "Activas" : "Cerradas"}<span className="ml-1.5 opacity-70">{f === "ACTIVA" ? activas : lista.length - activas}</span>
            </button>
          ))}
        </div>
        {visibles.length === 0 && <p className="px-5 py-10 text-center text-sm text-gray-400">No hay búsquedas {filtro === "ACTIVA" ? "activas" : "cerradas"}.</p>}
        <ul className="divide-y divide-gray-100 panel-oscuro:divide-gray-800">
          {visibles.map((b) => {
            const wa = numeroWhatsApp(b.telefono);
            const pendientes = b.coincidencias.filter((c) => !c.avisado).length;
            return (
              <li key={b.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {pendientes > 0 && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 panel-oscuro:bg-red-500/15 text-red-700 panel-oscuro:text-red-300">{pendientes === 1 ? "Entró 1 que coincide" : `Entraron ${pendientes} que coinciden`}</span>}
                      <span suppressHydrationWarning className="text-xs text-gray-400">{hace(b.createdAt)}</span>
                    </div>
                    <p className="mt-1 font-semibold text-gray-900 panel-oscuro:text-gray-100 [overflow-wrap:anywhere]">{b.nombre}</p>
                    <p className="text-sm text-gray-600 panel-oscuro:text-gray-400">{b.telefono}</p>
                  </div>
                  <a href={`tel:${b.telefono.replace(/[^\d+]/g, "")}`}
                    className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-gray-700 panel-oscuro:text-gray-300 text-xs font-semibold hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 shrink-0">
                    <Phone className="h-4 w-4" /> Llamar
                  </a>
                </div>
                <p className="mt-2 text-sm text-gray-800 panel-oscuro:text-gray-200 rounded-lg bg-indigo-50/60 panel-oscuro:bg-indigo-500/10 px-3 py-2 [overflow-wrap:anywhere]">
                  Busca: <strong>{resumenDeBusqueda(b, moneda)}</strong>{b.comentario ? ` — “${b.comentario}”` : ""}
                </p>

                {b.status === "ACTIVA" && (
                  b.coincidencias.length === 0 ? (
                    <p className="mt-2 text-xs text-gray-400 panel-oscuro:text-gray-500">Todavía no entró nada que coincida. Te avisamos cuando entre.</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {b.coincidencias.map((c) => {
                        const link = `${origen}/tienda/${slug}/producto/${encodeURIComponent(c.id)}`;
                        const texto = mensajeDeAviso(b.nombre, c.nombre, precio(c.precio, c.moneda), link, tienda);
                        return (
                          <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 panel-oscuro:border-gray-800 p-2.5">
                            {c.imagen ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.imagen} alt="" className="h-10 w-14 rounded-lg object-cover bg-gray-100 shrink-0" />
                            ) : <div className="h-10 w-14 rounded-lg bg-gray-100 panel-oscuro:bg-gray-800 shrink-0" />}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 panel-oscuro:text-gray-100 truncate">{c.nombre}</p>
                              <p className="text-xs text-gray-500 panel-oscuro:text-gray-400">{precio(c.precio, c.moneda)}{c.anio ? ` · ${c.anio}` : ""}{c.reservado ? " · Reservado" : ""}</p>
                            </div>
                            {c.avisado ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 panel-oscuro:text-green-400"><Check className="h-4 w-4" /> Ya le avisaste</span>
                            ) : wa ? (
                              <a href={`https://wa.me/${wa}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer" onClick={() => avisado(b, c.id)}
                                className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700">
                                <MessageCircle className="h-4 w-4" /> Avisarle
                              </a>
                            ) : (
                              <button type="button" onClick={() => avisado(b, c.id)} className="min-h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700">Ya le avisé</button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )
                )}

                <div className="mt-3">
                  {b.status === "ACTIVA" ? (
                    <button type="button" disabled={ocupada === b.id} onClick={() => cambiarEstado(b, "cerrar")}
                      className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-xl bg-gray-100 panel-oscuro:bg-gray-800 text-gray-600 panel-oscuro:text-gray-400 text-xs font-semibold hover:bg-gray-200 disabled:opacity-50">
                      <X className="h-4 w-4" /> Cerrar búsqueda
                    </button>
                  ) : (
                    <button type="button" disabled={ocupada === b.id} onClick={() => cambiarEstado(b, "reabrir")}
                      className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-gray-600 panel-oscuro:text-gray-400 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50">
                      <RotateCcw className="h-4 w-4" /> Reabrir
                    </button>
                  )}
                </div>
                {errores[b.id] && <p role="alert" className="mt-2 text-xs text-red-600">{errores[b.id]}</p>}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
