"use client";

/* ══════════════════════════════════════════════════════════════════════════
   CONSULTAS, PENSADAS PARA UNA CONCESIONARIA (06/10/26)
   ══════════════════════════════════════════════════════════════════════════

   Lo que importa de una consulta es la PERSONA: a quién llamar. Antes la fila
   mostraba primero el vehículo y el contacto quedaba escondido en un
   desplegable —que además venía vacío, porque la consulta no guardaba datos—,
   los botones decían "Confirmar / Rechazar" sin decir qué, las respuestas
   rápidas hablaban de "unidades" y "envío a todo el país", y si la acción
   fallaba (otra pestaña, sin red) el botón volvía a quedar activo sin avisar.

   Ahora, de arriba a abajo: la persona con WhatsApp y Llamar a la vista, el
   vehículo (foto, precio, link), el estado, y las acciones. "Se vendió" ofrece
   marcar la unidad como vendida, para que deje de verse en la tienda. */

import { useRef, useState } from "react";
import { Check, X, Phone, MessageCircle, ChevronDown, Copy, ExternalLink, Loader2 } from "lucide-react";
import { money } from "@/lib/utils";
import { estadoConsulta, quienConsulto } from "@/lib/consultas";
import { numeroWhatsApp } from "@/lib/whatsappTienda";
import type { ConsultaPanel, SeguimientoDeConsulta } from "@/lib/consultasPanel";
import { horasSinResponder, HORAS_DEMORA, etiquetaEtapa } from "@/lib/seguimiento";
import { precioEn } from "@/lib/monedaVehiculo";
import SeguimientoFila from "./SeguimientoFila";

const RESPUESTAS = [
  { label: "Saludo", text: (n: string, v: string) => `Hola ${n}! 👋 Te escribo por tu consulta sobre el *${v}*. ¿Qué te gustaría saber?` },
  { label: "Visita / prueba", text: (n: string, v: string) => `Hola ${n}! El *${v}* sigue disponible. ¿Querés coordinar para verlo y probarlo? Decime qué día te queda bien.` },
  { label: "Financiación", text: (n: string, v: string) => `Hola ${n}! Para el *${v}* tenemos opciones de financiación. ¿Cuánto querés entregar y en cuántas cuotas te gustaría?` },
  { label: "Permuta", text: (n: string, v: string) => `Hola ${n}! ¿Tenés un vehículo para entregar en parte de pago del *${v}*? Pasame marca, modelo, año y kilómetros y te lo cotizamos.` },
];

type Totales = { nuevas: number; vendidas: number; descartadas: number; semana: number };
type Filtro = "ALL" | "PENDING" | "CONFIRMED" | "REJECTED";

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

function RespuestasRapidas({ telefono, nombre, vehiculo }: { telefono: string; nombre: string; vehiculo: string }) {
  const [copiado, setCopiado] = useState<number | null>(null);
  const n = nombre.trim().split(/\s+/)[0] || "";
  return (
    <div className="rounded-xl border border-green-100 panel-oscuro:border-green-500/30 bg-green-50/50 panel-oscuro:bg-green-500/10 p-3 space-y-2">
      {RESPUESTAS.map((r, i) => {
        const texto = r.text(n, vehiculo);
        const wa = enlaceWhatsApp(telefono, texto);
        return (
          <div key={r.label} className="flex items-start gap-2">
            <p className="flex-1 rounded-lg border border-green-100 panel-oscuro:border-green-500/30 bg-white panel-oscuro:bg-gray-900 px-3 py-2 text-xs text-gray-700 panel-oscuro:text-gray-300 leading-relaxed">
              <span className="mb-0.5 block font-semibold text-gray-500 panel-oscuro:text-gray-400">{r.label}</span>
              {texto}
            </p>
            <div className="flex shrink-0 flex-col gap-1">
              <button type="button" aria-label={`Copiar "${r.label}"`}
                onClick={() => navigator.clipboard.writeText(texto).then(() => { setCopiado(i); setTimeout(() => setCopiado(null), 1500); }).catch(() => {})}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white panel-oscuro:bg-gray-900 border border-gray-200 panel-oscuro:border-gray-700 text-gray-400 hover:text-gray-700 panel-oscuro:hover:text-gray-300">
                {copiado === i ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`Mandar "${r.label}" por WhatsApp`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-white hover:bg-green-700">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function LeadsClient({ inicial, totales: totalesIniciales, slug, conComisiones, tienda }: {
  inicial: { consultas: ConsultaPanel[]; total: number; paginas: number };
  totales: Totales;
  slug: string;
  conComisiones: boolean;
  tienda: string;
}) {
  const [consultas, setConsultas] = useState(inicial.consultas);
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState(inicial.paginas);
  const [filtro, setFiltro] = useState<Filtro>("ALL");
  const [totales, setTotales] = useState(totalesIniciales);
  const [cargando, setCargando] = useState(false);
  /* Cambiar de filtro rápido: la respuesta vieja puede llegar DESPUÉS de la
     nueva y pisarla. Sólo se usa la del último pedido. */
  const ultimoPedido = useRef(0);
  // Un doble click no manda dos veces (el botón se apaga recién al pintar).
  const accionEnCurso = useRef(false);
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [abierta, setAbierta] = useState<string | null>(null);
  // Consultas recién marcadas como vendidas: se ofrece marcar la unidad.
  const [ofrecerVendido, setOfrecerVendido] = useState<Record<string, "pregunta" | "marcando" | "hecho" | "error">>({});

  async function traer(f: Filtro, p: number, sumar: boolean) {
    const pedido = ++ultimoPedido.current;
    setCargando(true);
    try {
      const q = new URLSearchParams({ page: String(p), ...(f !== "ALL" ? { status: f } : {}) });
      const res = await fetch(`/api/leads?${q}`);
      if (!res.ok) throw new Error();
      const d = await res.json() as { leads: ConsultaPanel[]; pages: number };
      if (pedido !== ultimoPedido.current) return;
      setConsultas((prev) => (sumar ? [...prev, ...d.leads] : d.leads));
      setPagina(p);
      setPaginas(d.pages);
    } catch {
      if (pedido !== ultimoPedido.current) return;
      setErrores((e) => ({ ...e, _lista: "No se pudieron cargar las consultas. Revisá la conexión y probá de nuevo." }));
    } finally {
      if (pedido === ultimoPedido.current) setCargando(false);
    }
  }

  function elegirFiltro(f: Filtro) {
    setFiltro(f);
    setErrores(({ _lista: _, ...resto }) => resto);
    traer(f, 1, false);
  }

  async function cambiarEstado(c: ConsultaPanel, status: "CONFIRMED" | "REJECTED") {
    if (accionEnCurso.current) return;
    accionEnCurso.current = true;
    setOcupada(c.id);
    setErrores(({ [c.id]: _, ...resto }) => resto);
    try {
      const res = await fetch(`/api/leads/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) {
        // 409: otra pestaña (u otra persona) ya la marcó. Se recarga la lista
        // para mostrar cómo quedó, en vez de dejar el botón como si nada.
        setErrores((e) => ({ ...e, [c.id]: res.status === 409 ? "Esta consulta ya se había marcado. Actualizamos la lista." : (data.error ?? "No se pudo guardar. Probá de nuevo.") }));
        if (res.status === 409) traer(filtro, 1, false);
        return;
      }
      setConsultas((prev) => prev.map((x) => (x.id === c.id ? { ...x, status } : x)));
      setTotales((t) => ({ ...t, nuevas: Math.max(0, t.nuevas - 1), ...(status === "CONFIRMED" ? { vendidas: t.vendidas + 1 } : { descartadas: t.descartadas + 1 }) }));
      if (status === "CONFIRMED" && c.productId && c.vehiculo && c.vehiculo.estado !== "SOLD") {
        setOfrecerVendido((o) => ({ ...o, [c.id]: "pregunta" }));
      }
    } catch {
      setErrores((e) => ({ ...e, [c.id]: "Sin conexión. Revisá internet y probá de nuevo." }));
    } finally {
      accionEnCurso.current = false;
      setOcupada(null);
    }
  }

  async function marcarVendido(c: ConsultaPanel) {
    if (!c.productId || accionEnCurso.current) return;
    accionEnCurso.current = true;
    setOfrecerVendido((o) => ({ ...o, [c.id]: "marcando" }));
    try {
      const res = await fetch(`/api/productos/${c.productId}/vehicle-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleStatus: "SOLD", soldBuyerName: c.customerName ?? "", soldBuyerPhone: c.customerPhone ?? "" }),
      });
      if (!res.ok) throw new Error();
      setOfrecerVendido((o) => ({ ...o, [c.id]: "hecho" }));
      setConsultas((prev) => prev.map((x) => (x.productId === c.productId && x.vehiculo ? { ...x, vehiculo: { ...x.vehiculo, estado: "SOLD", activo: false } } : x)));
    } catch {
      setOfrecerVendido((o) => ({ ...o, [c.id]: "error" }));
    } finally {
      accionEnCurso.current = false;
    }
  }

  function cambiarSeguimiento(id: string, s: SeguimientoDeConsulta) {
    setConsultas((prev) => prev.map((x) => (x.id === id ? { ...x, seguimiento: s } : x)));
  }

  /* Tocar WhatsApp o Llamar ES contactarla: pasa sola a "Contactado" (sólo si
     estaba nueva; el servidor no baja una etapa). No frena el link: si falla,
     la dueña igual está hablando con la persona. */
  function marcarContactada(c: ConsultaPanel) {
    if (c.status !== "PENDING" || c.seguimiento?.etapa) return;
    fetch(`/api/leads/${c.id}/seguimiento`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactado: true }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { seguimiento?: Record<string, string | null> } | null) => {
        if (d?.seguimiento) cambiarSeguimiento(c.id, {
          etapa: d.seguimiento.etapa ?? null, nota: d.seguimiento.nota ?? null, recordarEl: d.seguimiento.recordarEl ?? null,
          visitaEl: d.seguimiento.visitaEl ?? null, visitaTipo: d.seguimiento.visitaTipo ?? null, contactadoAt: d.seguimiento.contactadoAt ?? null,
        });
      })
      .catch(() => {});
  }

  const filtros: { id: Filtro; label: string; n: number }[] = [
    { id: "ALL", label: "Todas", n: totales.nuevas + totales.vendidas + totales.descartadas },
    { id: "PENDING", label: "En curso", n: totales.nuevas },
    { id: "CONFIRMED", label: "Vendidas", n: totales.vendidas },
    { id: "REJECTED", label: "Descartadas", n: totales.descartadas },
  ];

  if (filtros[0].n === 0) {
    return (
      <div className="bg-white panel-oscuro:bg-gray-900 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 p-8 sm:p-16 text-center">
        <MessageCircle className="h-10 w-10 text-gray-200 panel-oscuro:text-gray-700 mx-auto mb-4" />
        <p className="text-gray-600 panel-oscuro:text-gray-300 font-medium">Todavía no tenés consultas</p>
        <p className="text-sm text-gray-400 panel-oscuro:text-gray-500 mt-1 max-w-md mx-auto">
          Cuando alguien consulte por un vehículo —por WhatsApp o dejando sus datos— aparece acá y te avisamos.
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
      {consultas.length === 0 && !cargando && (
        <p className="px-5 py-10 text-center text-sm text-gray-400 panel-oscuro:text-gray-500">No hay consultas en este filtro.</p>
      )}

      <ul className="divide-y divide-gray-100 panel-oscuro:divide-gray-800">
        {consultas.map((c) => {
          // Abierta y con etapa: se muestra la etapa ("Contactado"), no "Nueva".
          const etapaAbierta = c.status === "PENDING" && c.seguimiento?.etapa ? etiquetaEtapa(c.seguimiento.etapa) : null;
          const est = etapaAbierta
            ? { label: etapaAbierta, cls: "bg-indigo-100 panel-oscuro:bg-indigo-500/15 text-indigo-800 panel-oscuro:text-indigo-300" }
            : estadoConsulta(c.status);
          const conDatos = !!c.customerPhone;
          const wa = c.customerPhone ? enlaceWhatsApp(c.customerPhone, RESPUESTAS[0].text((c.customerName ?? "").split(/\s+/)[0] ?? "", c.productName)) : null;
          const abiertaEsta = abierta === c.id;
          const oferta = ofrecerVendido[c.id];
          // Con teléfono, todavía nueva y sin tocar: cuántas horas lleva esperando.
          const demora = conDatos && c.status === "PENDING" && !c.seguimiento?.etapa ? horasSinResponder(new Date(c.createdAt), new Date()) : 0;
          const vehiculoFuera = c.vehiculo?.estado === "SOLD" ? "Vendido" : c.vehiculo && !c.vehiculo.activo ? "Oculto" : !c.vehiculo && c.productId ? "Ya no existe" : c.vehiculo?.estado === "RESERVED" ? "Reservado" : null;
          return (
            <li key={c.id} className={`p-4 sm:p-5 ${c.status === "PENDING" ? "" : "bg-gray-50/40 panel-oscuro:bg-gray-950/30"}`}>
              {/* 1. La persona */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${est.cls}`}>{est.label}</span>
                    <span suppressHydrationWarning className="text-xs text-gray-400 panel-oscuro:text-gray-500">{hace(c.createdAt)}</span>
                    {demora >= HORAS_DEMORA && (
                      <span suppressHydrationWarning className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 panel-oscuro:bg-red-500/15 text-red-700 panel-oscuro:text-red-300">
                        Sin responder hace {demora < 48 ? `${demora} h` : `${Math.floor(demora / 24)} días`}
                      </span>
                    )}
                  </div>
                  <p className={`mt-1 font-semibold truncate ${conDatos ? "text-gray-900 panel-oscuro:text-gray-100 text-base" : "text-gray-500 panel-oscuro:text-gray-400 text-sm"}`}>
                    {quienConsulto(c.customerName)}
                  </p>
                  {conDatos ? (
                    <p className="text-sm text-gray-600 panel-oscuro:text-gray-400">{c.customerPhone}</p>
                  ) : (
                    <p className="text-xs text-gray-400 panel-oscuro:text-gray-500">Tocó el botón de WhatsApp: la charla sigue en tu WhatsApp.</p>
                  )}
                </div>
                {conDatos && (
                  <div className="flex gap-2 shrink-0">
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => marcarContactada(c)}
                        className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700">
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </a>
                    )}
                    <a href={`tel:${c.customerPhone!.replace(/[^\d+]/g, "")}`} onClick={() => marcarContactada(c)}
                      className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-gray-700 panel-oscuro:text-gray-300 text-xs font-semibold hover:bg-gray-50 panel-oscuro:hover:bg-gray-800">
                      <Phone className="h-4 w-4" /> Llamar
                    </a>
                  </div>
                )}
              </div>

              {c.customerMessage && (
                <p className="mt-2 text-sm text-gray-700 panel-oscuro:text-gray-300 bg-indigo-50/60 panel-oscuro:bg-indigo-500/10 rounded-lg px-3 py-2 [overflow-wrap:anywhere] whitespace-pre-line">“{c.customerMessage}”</p>
              )}

              {/* 2. El vehículo */}
              <div className="mt-3 flex items-center gap-3">
                {c.vehiculo?.imagen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.vehiculo.imagen} alt="" className="h-12 w-16 rounded-lg object-cover bg-gray-100 shrink-0" />
                ) : (
                  <div className="h-12 w-16 rounded-lg bg-gray-100 panel-oscuro:bg-gray-800 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 panel-oscuro:text-gray-100 truncate">{c.productName}</p>
                  <p className="text-xs text-gray-500 panel-oscuro:text-gray-400">
                    {precioEn(c.productPrice, c.moneda)}
                    {vehiculoFuera && <span className="ml-2 font-semibold text-amber-700 panel-oscuro:text-amber-400">· {vehiculoFuera}</span>}
                    {c.affiliate && <span className="ml-2 text-indigo-600 panel-oscuro:text-indigo-400">· vino por {c.affiliate.userName || c.affiliate.userEmail}</span>}
                    {conComisiones && c.status === "CONFIRMED" && c.commissionAmount ? <span className="ml-2 text-green-600">· comisión {money(c.commissionAmount)}</span> : null}
                  </p>
                </div>
                {c.productId && c.vehiculo?.activo && (
                  <a href={`/tienda/${slug}?producto=${encodeURIComponent(c.productId)}`} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 text-xs font-semibold text-indigo-600 panel-oscuro:text-indigo-400 hover:underline">Ver</a>
                )}
              </div>

              {/* 2 bis. El seguimiento: etapa, nota, recordatorio y visita (sólo abiertas) */}
              {c.status === "PENDING" && (
                <SeguimientoFila leadId={c.id} seguimiento={c.seguimiento} nombre={c.customerName ?? ""} telefono={c.customerPhone}
                  vehiculo={c.productName} tienda={tienda} onCambio={(s) => cambiarSeguimiento(c.id, s)} />
              )}

              {/* 3. Qué pasó con esta consulta */}
              {c.status === "PENDING" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => cambiarEstado(c, "CONFIRMED")} disabled={!!ocupada}
                    className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50">
                    {ocupada === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Se vendió
                  </button>
                  <button type="button" onClick={() => cambiarEstado(c, "REJECTED")} disabled={!!ocupada}
                    className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl bg-gray-100 panel-oscuro:bg-gray-800 text-gray-600 panel-oscuro:text-gray-400 text-xs font-semibold hover:bg-gray-200 panel-oscuro:hover:bg-gray-700 disabled:opacity-50">
                    <X className="h-4 w-4" /> Descartar
                  </button>
                </div>
              )}
              {errores[c.id] && <p role="alert" className="mt-2 text-xs text-red-600 panel-oscuro:text-red-400">{errores[c.id]}</p>}

              {oferta && oferta !== "hecho" && (
                <div className="mt-3 rounded-xl border border-green-200 panel-oscuro:border-green-500/30 bg-green-50 panel-oscuro:bg-green-500/10 px-3 py-2.5 text-sm text-green-800 panel-oscuro:text-green-300">
                  {oferta === "error" ? "No se pudo marcar el vehículo. Hacelo desde Vehículos." : <>¡Felicitaciones! ¿Marcamos el <strong>{c.productName}</strong> como vendido? Deja de verse en la tienda.</>}
                  {oferta !== "error" && (
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => marcarVendido(c)} disabled={oferta === "marcando"}
                        className="min-h-9 px-3 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-60">
                        {oferta === "marcando" ? "Marcando…" : "Sí, marcar vendido"}
                      </button>
                      <button type="button" onClick={() => setOfrecerVendido(({ [c.id]: _, ...r }) => r)}
                        className="min-h-9 px-3 rounded-lg text-xs font-semibold text-green-800 panel-oscuro:text-green-300 hover:underline">
                        Todavía no
                      </button>
                    </div>
                  )}
                </div>
              )}
              {oferta === "hecho" && <p className="mt-2 text-xs text-green-700 panel-oscuro:text-green-400">Listo: el vehículo quedó como vendido.</p>}

              {conDatos && (
                <>
                  <button type="button" onClick={() => setAbierta(abiertaEsta ? null : c.id)} aria-expanded={abiertaEsta}
                    className="mt-3 inline-flex items-center gap-1 min-h-9 text-xs font-semibold text-gray-500 panel-oscuro:text-gray-400 hover:text-gray-800 panel-oscuro:hover:text-gray-200">
                    Respuestas rápidas <ChevronDown className={`h-4 w-4 transition-transform ${abiertaEsta ? "rotate-180" : ""}`} />
                  </button>
                  {abiertaEsta && <div className="mt-2"><RespuestasRapidas telefono={c.customerPhone!} nombre={c.customerName ?? ""} vehiculo={c.productName} /></div>}
                </>
              )}
            </li>
          );
        })}
      </ul>

      {pagina < paginas && (
        <div className="p-4 border-t border-gray-100 panel-oscuro:border-gray-800 text-center">
          <button type="button" onClick={() => traer(filtro, pagina + 1, true)} disabled={cargando}
            className="min-h-10 px-4 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-sm font-semibold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 disabled:opacity-50">
            {cargando ? "Cargando…" : "Ver más consultas"}
          </button>
        </div>
      )}
    </div>
  );
}
