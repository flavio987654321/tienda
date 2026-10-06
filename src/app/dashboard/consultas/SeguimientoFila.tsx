"use client";

/* El seguimiento de una consulta, dentro de su fila (06/10/26): la etapa a
   la vista y, desplegando, la nota, el "volver a llamar" y la visita o prueba
   de manejo. Todo opcional. Ver `lib/seguimiento`. */

import { useState } from "react";
import { ChevronDown, Bell, CalendarDays, StickyNote, MessageCircle, X, Loader2 } from "lucide-react";
import {
  ETAPAS, ATAJOS, TIPOS_VISITA, fechaDeAtajo, desdeCamposAR, aCamposAR, cuandoAR, mensajeDeVisita,
  type Etapa, type TipoVisita,
} from "@/lib/seguimiento";
import { numeroWhatsApp } from "@/lib/whatsappTienda";
import type { SeguimientoDeConsulta } from "@/lib/consultasPanel";

type Props = {
  leadId: string;
  seguimiento: SeguimientoDeConsulta;
  nombre: string;
  telefono: string | null;
  vehiculo: string;
  tienda: string;
  onCambio: (s: SeguimientoDeConsulta) => void;
};

const plano = (s: Record<string, unknown>): SeguimientoDeConsulta => ({
  etapa: (s.etapa as string) ?? null, nota: (s.nota as string) ?? null, visitaTipo: (s.visitaTipo as string) ?? null,
  recordarEl: (s.recordarEl as string) ?? null, visitaEl: (s.visitaEl as string) ?? null, contactadoAt: (s.contactadoAt as string) ?? null,
});

const chip = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold";

export default function SeguimientoFila({ leadId, seguimiento, nombre, telefono, vehiculo, tienda, onCambio }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [nota, setNota] = useState(seguimiento?.nota ?? "");
  const ahora = new Date();
  const mananaCampos = aCamposAR(fechaDeAtajo("manana", ahora));
  const [recFecha, setRecFecha] = useState(mananaCampos.fecha);
  const [recHora, setRecHora] = useState("10:00");
  const [visFecha, setVisFecha] = useState(mananaCampos.fecha);
  const [visHora, setVisHora] = useState("17:00");
  const [visTipo, setVisTipo] = useState<TipoVisita>("VISITA");

  async function guardar(que: string, cuerpo: Record<string, unknown>) {
    setGuardando(que);
    setError("");
    try {
      const res = await fetch(`/api/leads/${leadId}/seguimiento`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo),
      });
      const data = await res.json().catch(() => ({})) as { error?: string; seguimiento?: Record<string, unknown> };
      if (!res.ok || !data.seguimiento) { setError(data.error ?? "No se pudo guardar. Probá de nuevo."); return false; }
      onCambio(plano(data.seguimiento));
      return true;
    } catch {
      setError("Sin conexión. Revisá internet y probá de nuevo.");
      return false;
    } finally {
      setGuardando(null);
    }
  }

  const etapa = seguimiento?.etapa ?? null;
  const recordar = seguimiento?.recordarEl ? new Date(seguimiento.recordarEl) : null;
  const visita = seguimiento?.visitaEl ? new Date(seguimiento.visitaEl) : null;
  const vencido = recordar && recordar.getTime() <= ahora.getTime();
  const waVisita = visita && telefono ? numeroWhatsApp(telefono) : null;
  const textoVisita = visita ? mensajeDeVisita(nombre || "", vehiculo, visita, seguimiento?.visitaTipo ?? null, tienda, ahora) : "";
  const tipoVisita = TIPOS_VISITA.find((t) => t.id === seguimiento?.visitaTipo)?.label ?? "Visita";

  const campo = "border border-gray-200 panel-oscuro:border-gray-700 rounded-lg px-2.5 py-2 text-sm text-gray-900 panel-oscuro:text-gray-100 bg-white panel-oscuro:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const boton = "inline-flex items-center gap-1.5 min-h-9 px-3 rounded-lg text-xs font-semibold disabled:opacity-50";

  return (
    <div className="mt-3">
      {/* La etapa, siempre a la vista */}
      <div role="group" aria-label="Etapa de la consulta" className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-gray-400 panel-oscuro:text-gray-500 mr-1">Etapa:</span>
        {ETAPAS.map((e) => {
          const activa = etapa === e.id;
          return (
            <button key={e.id} type="button" aria-pressed={activa} disabled={!!guardando}
              onClick={() => guardar(`etapa:${e.id}`, { etapa: activa ? null : (e.id as Etapa) })}
              className={`min-h-8 px-2.5 rounded-full text-xs font-semibold border transition-colors ${
                activa ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-200 panel-oscuro:border-gray-700 text-gray-600 panel-oscuro:text-gray-400 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800"}`}>
              {guardando === `etapa:${e.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin inline" /> : e.label}
            </button>
          );
        })}
      </div>

      {/* Lo que hay cargado, en una línea, aunque esté plegado */}
      {(recordar || visita || seguimiento?.nota) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {visita && <span className={`${chip} bg-indigo-50 panel-oscuro:bg-indigo-500/15 text-indigo-700 panel-oscuro:text-indigo-300`}><CalendarDays className="h-3.5 w-3.5" />{tipoVisita}: {cuandoAR(visita, ahora)}</span>}
          {recordar && <span className={`${chip} ${vencido ? "bg-red-50 panel-oscuro:bg-red-500/15 text-red-700 panel-oscuro:text-red-300" : "bg-amber-50 panel-oscuro:bg-amber-500/15 text-amber-800 panel-oscuro:text-amber-300"}`}><Bell className="h-3.5 w-3.5" />Llamar {cuandoAR(recordar, ahora)}</span>}
          {seguimiento?.nota && <span className={`${chip} bg-gray-100 panel-oscuro:bg-gray-800 text-gray-600 panel-oscuro:text-gray-400 max-w-full`}><StickyNote className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{seguimiento.nota}</span></span>}
        </div>
      )}

      <button type="button" onClick={() => setAbierto(!abierto)} aria-expanded={abierto}
        className="mt-2 inline-flex items-center gap-1 min-h-9 text-xs font-semibold text-gray-500 panel-oscuro:text-gray-400 hover:text-gray-800 panel-oscuro:hover:text-gray-200">
        Nota, recordatorio y visita <ChevronDown className={`h-4 w-4 transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && (
        <div className="mt-2 space-y-4 rounded-xl border border-gray-100 panel-oscuro:border-gray-800 p-3">
          {/* Nota */}
          <div>
            <label htmlFor={`nota-${leadId}`} className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1">Nota (sólo la ves vos)</label>
            <textarea id={`nota-${leadId}`} value={nota} onChange={(e) => setNota(e.target.value)} rows={2} maxLength={1000}
              placeholder="Ej: entrega un Gol 2015, quiere financiar el resto en 12 cuotas"
              className={`${campo} w-full resize-y`} />
            <button type="button" disabled={!!guardando || nota.trim() === (seguimiento?.nota ?? "")}
              onClick={() => guardar("nota", { nota: nota.trim() || null })}
              className={`${boton} mt-1.5 bg-gray-900 panel-oscuro:bg-gray-100 text-white panel-oscuro:text-gray-900`}>
              {guardando === "nota" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Guardar nota
            </button>
          </div>

          {/* Recordatorio */}
          <div>
            <p className="text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1">Recordarme volver a llamar</p>
            {recordar ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-800 panel-oscuro:text-gray-200">{cuandoAR(recordar, ahora)} hs</span>
                <button type="button" disabled={!!guardando} onClick={() => guardar("sinRecordar", { recordarEl: null })}
                  className={`${boton} text-gray-500 hover:text-red-600`}><X className="h-3.5 w-3.5" /> Ya lo llamé</button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {ATAJOS.map((a) => (
                  <button key={a.id} type="button" disabled={!!guardando}
                    onClick={() => guardar(`rec:${a.id}`, { recordarEl: fechaDeAtajo(a.id, new Date()).toISOString() })}
                    className={`${boton} border border-gray-200 panel-oscuro:border-gray-700 text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800`}>
                    {a.label}
                  </button>
                ))}
                <span className="text-xs text-gray-400">o</span>
                <input type="date" aria-label="Día del recordatorio" value={recFecha} onChange={(e) => setRecFecha(e.target.value)} className={campo} />
                <input type="time" aria-label="Hora del recordatorio" value={recHora} onChange={(e) => setRecHora(e.target.value)} className={campo} />
                <button type="button" disabled={!!guardando}
                  onClick={() => { const d = desdeCamposAR(recFecha, recHora); if (!d) { setError("Elegí día y hora."); return; } guardar("rec:fecha", { recordarEl: d.toISOString() }); }}
                  className={`${boton} bg-amber-500 text-white hover:bg-amber-600`}><Bell className="h-3.5 w-3.5" /> Recordarme</button>
              </div>
            )}
          </div>

          {/* Visita o prueba de manejo */}
          <div>
            <p className="text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1">Visita o prueba de manejo</p>
            {visita ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-800 panel-oscuro:text-gray-200">{tipoVisita}: {cuandoAR(visita, ahora)} hs</span>
                {waVisita && (
                  <a href={`https://wa.me/${waVisita}?text=${encodeURIComponent(textoVisita)}`} target="_blank" rel="noopener noreferrer"
                    className={`${boton} bg-green-600 text-white hover:bg-green-700`}><MessageCircle className="h-3.5 w-3.5" /> Confirmar por WhatsApp</a>
                )}
                <button type="button" disabled={!!guardando} onClick={() => guardar("sinVisita", { visitaEl: null })}
                  className={`${boton} text-gray-500 hover:text-red-600`}><X className="h-3.5 w-3.5" /> Cancelar</button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <select aria-label="Tipo de visita" value={visTipo} onChange={(e) => setVisTipo(e.target.value as TipoVisita)} className={campo}>
                  {TIPOS_VISITA.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <input type="date" aria-label="Día de la visita" value={visFecha} onChange={(e) => setVisFecha(e.target.value)} className={campo} />
                <input type="time" aria-label="Hora de la visita" value={visHora} onChange={(e) => setVisHora(e.target.value)} className={campo} />
                <button type="button" disabled={!!guardando}
                  onClick={() => { const d = desdeCamposAR(visFecha, visHora); if (!d) { setError("Elegí día y hora."); return; } guardar("visita", { visitaEl: d.toISOString(), visitaTipo: visTipo }); }}
                  className={`${boton} bg-indigo-600 text-white hover:bg-indigo-700`}><CalendarDays className="h-3.5 w-3.5" /> Agendar</button>
              </div>
            )}
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-red-600 panel-oscuro:text-red-400">{error}</p>}
    </div>
  );
}
