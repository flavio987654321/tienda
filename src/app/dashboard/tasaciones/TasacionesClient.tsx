"use client";

/* Tasaciones de usados (06/10/26). Mismo orden que Consultas: la persona
   (WhatsApp y Llamar a la vista), el auto que ofrece, y la respuesta. La
   respuesta es un NÚMERO: se carga cuánto se lo toman y se manda por WhatsApp
   con el mensaje armado. Ver `lib/tasaciones`. */

import { useState } from "react";
import { Check, X, Phone, MessageCircle, Loader2, RotateCcw, Repeat } from "lucide-react";
import { numeroWhatsApp } from "@/lib/whatsappTienda";
import { ESTADO_TASACION, esEstadoTasacion, resumenDelUsado, mensajeDeOferta, enteroDe, type EstadoTasacion } from "@/lib/tasaciones";
import type { TasacionDelPanel } from "@/lib/tasacionesPanel";

type Totales = { pendientes: number; ofertadas: number; aceptadas: number; descartadas: number };
type Filtro = "ALL" | EstadoTasacion;

function enlaceWhatsApp(telefono: string, texto: string): string | null {
  const n = numeroWhatsApp(telefono);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : null;
}

function hace(fecha: string): string {
  const min = Math.round((Date.now() - new Date(fecha).getTime()) / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `hace ${d} día${d === 1 ? "" : "s"}`;
  return new Date(fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

const precio = (n: number, moneda: string) => (moneda === "USD" ? "USD " : "$") + n.toLocaleString("es-AR");

export default function TasacionesClient({ inicial, totales: totalesIniciales, slug, moneda, tienda }: {
  inicial: { tasaciones: TasacionDelPanel[]; total: number; paginas: number };
  totales: Totales;
  slug: string;
  moneda: string;
  tienda: string;
}) {
  const [lista, setLista] = useState(inicial.tasaciones);
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState(inicial.paginas);
  const [filtro, setFiltro] = useState<Filtro>("ALL");
  const [totales, setTotales] = useState(totalesIniciales);
  const [cargando, setCargando] = useState(false);
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  // Lo que se está tipeando en "cuánto se lo tomás", por tasación.
  const [montos, setMontos] = useState<Record<string, string>>({});
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [editando, setEditando] = useState<string | null>(null);

  async function traer(f: Filtro, p: number, sumar: boolean) {
    setCargando(true);
    try {
      const q = new URLSearchParams({ page: String(p), ...(f !== "ALL" ? { status: f } : {}) });
      const res = await fetch(`/api/tasaciones?${q}`);
      if (!res.ok) throw new Error();
      const d = await res.json() as { tasaciones: TasacionDelPanel[]; pages: number };
      setLista((prev) => (sumar ? [...prev, ...d.tasaciones] : d.tasaciones));
      setPagina(p);
      setPaginas(d.pages);
    } catch {
      setErrores((e) => ({ ...e, _lista: "No se pudieron cargar las tasaciones. Revisá la conexión y probá de nuevo." }));
    } finally {
      setCargando(false);
    }
  }

  function elegirFiltro(f: Filtro) {
    setFiltro(f);
    setErrores(({ _lista: _, ...resto }) => resto);
    traer(f, 1, false);
  }

  /* Los totales se mueven a mano para no volver a pedirlos: sale de un estado
     y entra en otro. */
  const CLAVE: Record<EstadoTasacion, keyof Totales> = { PENDIENTE: "pendientes", OFERTADA: "ofertadas", ACEPTADA: "aceptadas", DESCARTADA: "descartadas" };
  function mover(de: string, a: string) {
    if (de === a || !esEstadoTasacion(de) || !esEstadoTasacion(a)) return;
    setTotales((t) => ({ ...t, [CLAVE[de]]: Math.max(0, t[CLAVE[de]] - 1), [CLAVE[a]]: t[CLAVE[a]] + 1 }));
  }

  async function accion(t: TasacionDelPanel, cuerpo: Record<string, unknown>) {
    if (ocupada) return;
    setOcupada(t.id);
    setErrores(({ [t.id]: _, ...resto }) => resto);
    try {
      const res = await fetch(`/api/tasaciones/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const data = await res.json().catch(() => ({})) as { error?: string; tasacion?: { status: string; ofertaMonto: number | null; ofertaNota: string | null } };
      if (!res.ok || !data.tasacion) {
        setErrores((e) => ({ ...e, [t.id]: data.error ?? "No se pudo guardar. Probá de nuevo." }));
        return;
      }
      const nuevo = data.tasacion;
      mover(t.status, nuevo.status);
      setLista((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...nuevo } : x)));
      if (cuerpo.accion === "ofertar") setEditando(null);
    } catch {
      setErrores((e) => ({ ...e, [t.id]: "Sin conexión. Revisá internet y probá de nuevo." }));
    } finally {
      setOcupada(null);
    }
  }

  const filtros: { id: Filtro; label: string; n: number }[] = [
    { id: "ALL", label: "Todas", n: totales.pendientes + totales.ofertadas + totales.aceptadas + totales.descartadas },
    { id: "PENDIENTE", label: "Sin responder", n: totales.pendientes },
    { id: "OFERTADA", label: "Con oferta", n: totales.ofertadas },
    { id: "ACEPTADA", label: "Aceptaron", n: totales.aceptadas },
    { id: "DESCARTADA", label: "Descartadas", n: totales.descartadas },
  ];

  if (filtros[0].n === 0) {
    return (
      <div className="bg-white panel-oscuro:bg-gray-900 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 p-8 sm:p-16 text-center">
        <Repeat className="h-10 w-10 text-gray-200 panel-oscuro:text-gray-700 mx-auto mb-4" />
        <p className="text-gray-600 panel-oscuro:text-gray-300 font-medium">Todavía no tenés tasaciones</p>
        <p className="text-sm text-gray-400 panel-oscuro:text-gray-500 mt-1 max-w-md mx-auto">
          En tu tienda, cada vehículo tiene &quot;¿Tenés un usado para entregar? Tasalo&quot;, y en el catálogo hay un botón &quot;Tasá tu usado&quot;. Cuando alguien lo completa, aparece acá y te avisamos.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white panel-oscuro:bg-gray-900 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 overflow-hidden">
      <div className="flex gap-2 p-4 border-b border-gray-100 panel-oscuro:border-gray-800 overflow-x-auto">
        {filtros.map((f) => (
          <button key={f.id} type="button" onClick={() => elegirFiltro(f.id)} aria-pressed={filtro === f.id}
            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              filtro === f.id ? "bg-indigo-600 text-white" : "bg-gray-50 panel-oscuro:bg-gray-800/50 text-gray-600 panel-oscuro:text-gray-400 hover:bg-gray-100 panel-oscuro:hover:bg-gray-800"
            }`}>
            {f.label}<span className="ml-1.5 opacity-70">{f.n}</span>
          </button>
        ))}
      </div>

      {errores._lista && <p role="alert" className="px-5 py-3 text-sm text-red-600 panel-oscuro:text-red-400">{errores._lista}</p>}
      {lista.length === 0 && !cargando && (
        <p className="px-5 py-10 text-center text-sm text-gray-400 panel-oscuro:text-gray-500">No hay tasaciones en este filtro.</p>
      )}

      <ul className="divide-y divide-gray-100 panel-oscuro:divide-gray-800">
        {lista.map((t) => {
          const est = esEstadoTasacion(t.status) ? ESTADO_TASACION[t.status] : ESTADO_TASACION.PENDIENTE;
          const auto = resumenDelUsado(t);
          const primerNombre = t.nombre.split(/\s+/)[0];
          const saludo = `Hola ${primerNombre}! Te escribo de ${tienda} por la tasación de tu ${t.marca} ${t.modelo} ${t.anio}. ¿Me mandás unas fotos? Frente, costados, interior y el tablero con los km.`;
          const waSaludo = enlaceWhatsApp(t.telefono, saludo);
          const waOferta = t.ofertaMonto != null ? enlaceWhatsApp(t.telefono, mensajeDeOferta(t, t.ofertaMonto, moneda, tienda)) : null;
          const enCurso = t.status === "PENDIENTE" || t.status === "OFERTADA";
          const datos = [t.combustible, t.transmision, t.estado && `Estado: ${t.estado.toLowerCase()}`].filter(Boolean);
          return (
            <li key={t.id} className={`p-4 sm:p-5 ${enCurso ? "" : "bg-gray-50/40 panel-oscuro:bg-gray-950/30"}`}>
              {/* 1. La persona */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${est.clase}`}>{est.etiqueta}</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-gray-200 panel-oscuro:border-gray-700 text-gray-600 panel-oscuro:text-gray-400">
                      {t.modalidad === "VENTA" ? "Quiere venderlo" : "Parte de pago"}
                    </span>
                    <span className="text-xs text-gray-400 panel-oscuro:text-gray-500">{hace(t.createdAt)}</span>
                  </div>
                  <p className="mt-1 font-semibold truncate text-gray-900 panel-oscuro:text-gray-100 text-base">{t.nombre}</p>
                  <p className="text-sm text-gray-600 panel-oscuro:text-gray-400">{t.telefono}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {waSaludo && (
                    <a href={waSaludo} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700">
                      <MessageCircle className="h-4 w-4" /> Pedir fotos
                    </a>
                  )}
                  <a href={`tel:${t.telefono.replace(/[^\d+]/g, "")}`}
                    className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-gray-700 panel-oscuro:text-gray-300 text-xs font-semibold hover:bg-gray-50 panel-oscuro:hover:bg-gray-800">
                    <Phone className="h-4 w-4" /> Llamar
                  </a>
                </div>
              </div>

              {/* 2. El auto que ofrece */}
              <div className="mt-3 rounded-xl border border-gray-100 panel-oscuro:border-gray-800 px-3 py-2.5">
                <p className="text-sm font-semibold text-gray-900 panel-oscuro:text-gray-100">{auto}</p>
                {datos.length > 0 && <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-0.5">{datos.join(" · ")}</p>}
                {t.comentario && <p className="mt-1.5 text-sm text-gray-700 panel-oscuro:text-gray-300">“{t.comentario}”</p>}
                {t.productoNombre && (
                  <p className="mt-1.5 text-xs text-gray-500 panel-oscuro:text-gray-400">
                    Le interesa: {t.productoId ? (
                      <a href={`/tienda/${slug}?producto=${encodeURIComponent(t.productoId)}`} target="_blank" rel="noopener noreferrer"
                        className="font-semibold text-indigo-600 panel-oscuro:text-indigo-400 hover:underline">{t.productoNombre}</a>
                    ) : <strong>{t.productoNombre}</strong>}
                  </p>
                )}
              </div>

              {/* 3. La respuesta: cuánto se lo toman */}
              {t.ofertaMonto != null && editando !== t.id && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <p className="text-sm text-gray-700 panel-oscuro:text-gray-300">
                    Oferta: <strong className="text-gray-900 panel-oscuro:text-gray-100">{precio(t.ofertaMonto, moneda)}</strong>
                    {t.ofertaNota && <span className="text-gray-500 panel-oscuro:text-gray-400"> · {t.ofertaNota}</span>}
                  </p>
                  {waOferta && enCurso && (
                    <a href={waOferta} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700">
                      <MessageCircle className="h-4 w-4" /> Mandar la oferta
                    </a>
                  )}
                  {enCurso && (
                    <button type="button" onClick={() => { setEditando(t.id); setMontos((m) => ({ ...m, [t.id]: String(t.ofertaMonto) })); setNotas((n) => ({ ...n, [t.id]: t.ofertaNota ?? "" })); }}
                      className="min-h-9 px-2 text-xs font-semibold text-indigo-600 panel-oscuro:text-indigo-400 hover:underline">Cambiar</button>
                  )}
                </div>
              )}

              {enCurso && (t.ofertaMonto == null || editando === t.id) && (
                <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); accion(t, { accion: "ofertar", monto: montos[t.id] ?? "", nota: notas[t.id] ?? "" }); }}>
                  <label className="text-xs font-medium text-gray-600 panel-oscuro:text-gray-400">
                    Cuánto se lo tomás
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{moneda === "USD" ? "USD" : "$"}</span>
                      <input inputMode="numeric" value={montos[t.id] ?? ""} placeholder="Ej: 9500000"
                        onChange={(e) => setMontos((m) => ({ ...m, [t.id]: e.target.value.replace(/\D/g, "") }))}
                        className={`w-40 border border-gray-200 panel-oscuro:border-gray-700 rounded-xl ${moneda === "USD" ? "pl-12" : "pl-7"} pr-3 py-2 text-sm text-gray-900 panel-oscuro:text-gray-100 bg-white panel-oscuro:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500`} />
                    </div>
                  </label>
                  <label className="text-xs font-medium text-gray-600 panel-oscuro:text-gray-400 flex-1 min-w-[10rem]">
                    Nota para vos <span className="font-normal text-gray-400">(opcional)</span>
                    <input value={notas[t.id] ?? ""} maxLength={300} placeholder="Ej: sujeto a ver la caja"
                      onChange={(e) => setNotas((n) => ({ ...n, [t.id]: e.target.value }))}
                      className="mt-1 w-full border border-gray-200 panel-oscuro:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 panel-oscuro:text-gray-100 bg-white panel-oscuro:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </label>
                  <button type="submit" disabled={!!ocupada || !enteroDe(montos[t.id] ?? "")}
                    className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50">
                    {ocupada === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Guardar oferta
                  </button>
                  {editando === t.id && (
                    <button type="button" onClick={() => setEditando(null)} className="min-h-10 px-2 text-xs font-semibold text-gray-500 hover:underline">Cancelar</button>
                  )}
                </form>
              )}

              {/* 4. Cómo terminó */}
              <div className="mt-3 flex flex-wrap gap-2">
                {t.status === "OFERTADA" && editando !== t.id && (
                  <button type="button" onClick={() => accion(t, { accion: "aceptada" })} disabled={!!ocupada}
                    className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50">
                    <Check className="h-4 w-4" /> Aceptó
                  </button>
                )}
                {enCurso && editando !== t.id && (
                  <button type="button" onClick={() => accion(t, { accion: "descartar" })} disabled={!!ocupada}
                    className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl bg-gray-100 panel-oscuro:bg-gray-800 text-gray-600 panel-oscuro:text-gray-400 text-xs font-semibold hover:bg-gray-200 panel-oscuro:hover:bg-gray-700 disabled:opacity-50">
                    <X className="h-4 w-4" /> Descartar
                  </button>
                )}
                {!enCurso && (
                  <button type="button" onClick={() => accion(t, { accion: "reabrir" })} disabled={!!ocupada}
                    className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-gray-600 panel-oscuro:text-gray-400 text-xs font-semibold hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 disabled:opacity-50">
                    <RotateCcw className="h-4 w-4" /> Reabrir
                  </button>
                )}
              </div>
              {errores[t.id] && <p role="alert" className="mt-2 text-xs text-red-600 panel-oscuro:text-red-400">{errores[t.id]}</p>}
            </li>
          );
        })}
      </ul>

      {pagina < paginas && (
        <div className="p-4 border-t border-gray-100 panel-oscuro:border-gray-800 text-center">
          <button type="button" onClick={() => traer(filtro, pagina + 1, true)} disabled={cargando}
            className="min-h-10 px-4 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-sm font-semibold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 disabled:opacity-50">
            {cargando ? "Cargando…" : "Ver más tasaciones"}
          </button>
        </div>
      )}
    </div>
  );
}
