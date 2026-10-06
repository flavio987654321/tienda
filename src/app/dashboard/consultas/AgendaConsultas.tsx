"use client";

/* La agenda de la concesionaria, arriba de Consultas (06/10/26): visitas de
   los próximos 7 días, a quién llamar hoy (y lo atrasado) y quién espera
   respuesta hace más de `HORAS_DEMORA` horas. Cada renglón trae su WhatsApp y
   su Llamar: se resuelve desde acá, sin buscar la consulta en la lista. */

import { CalendarDays, Bell, AlertCircle, MessageCircle, Phone } from "lucide-react";
import { cuandoAR, HORAS_DEMORA } from "@/lib/seguimiento";
import { numeroWhatsApp } from "@/lib/whatsappTienda";
import type { AgendaDeConsultas, ItemAgenda } from "@/lib/consultasPanel";

function Renglon({ i, detalle }: { i: ItemAgenda; detalle: string }) {
  const wa = i.telefono ? numeroWhatsApp(i.telefono) : null;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 panel-oscuro:text-gray-100 truncate">{i.nombre} <span className="font-normal text-gray-500 panel-oscuro:text-gray-400">· {i.vehiculo}</span></p>
        <p className="text-xs text-gray-500 panel-oscuro:text-gray-400">{detalle}{i.nota ? ` · ${i.nota}` : ""}</p>
      </div>
      {i.telefono && (
        <div className="flex gap-1.5 shrink-0">
          {wa && (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp a ${i.nombre}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-white hover:bg-green-700"><MessageCircle className="h-4 w-4" /></a>
          )}
          <a href={`tel:${i.telefono.replace(/[^\d+]/g, "")}`} aria-label={`Llamar a ${i.nombre}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 panel-oscuro:border-gray-700 text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800"><Phone className="h-4 w-4" /></a>
        </div>
      )}
    </li>
  );
}

export default function AgendaConsultas({ agenda }: { agenda: AgendaDeConsultas }) {
  const ahora = new Date();
  const { visitas, llamar, sinResponder } = agenda;
  if (!visitas.length && !llamar.length && !sinResponder.length) return null;

  const horas = (iso: string) => Math.floor((ahora.getTime() - new Date(iso).getTime()) / 3600_000);
  const espera = (iso: string) => { const h = horas(iso); return h < 48 ? `espera hace ${h} h` : `espera hace ${Math.floor(h / 24)} días`; };
  const bloque = "bg-white panel-oscuro:bg-gray-900 rounded-2xl border p-4";

  return (
    <section aria-label="Agenda" className="grid gap-3 mb-6 lg:grid-cols-3">
      {sinResponder.length > 0 && (
        <div className={`${bloque} border-red-200 panel-oscuro:border-red-500/30`}>
          <h2 className="flex items-center gap-2 text-sm font-bold text-red-700 panel-oscuro:text-red-300"><AlertCircle className="h-4 w-4" /> Sin responder ({sinResponder.length})</h2>
          <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-0.5">Dejaron su teléfono hace más de {HORAS_DEMORA} horas y nadie los contactó.</p>
          <ul className="divide-y divide-gray-100 panel-oscuro:divide-gray-800">{sinResponder.slice(0, 5).map((i) => <Renglon key={i.leadId} i={i} detalle={espera(i.cuando)} />)}</ul>
        </div>
      )}
      {llamar.length > 0 && (
        <div className={`${bloque} border-amber-200 panel-oscuro:border-amber-500/30`}>
          <h2 className="flex items-center gap-2 text-sm font-bold text-amber-800 panel-oscuro:text-amber-300"><Bell className="h-4 w-4" /> Para llamar ({llamar.length})</h2>
          <ul className="divide-y divide-gray-100 panel-oscuro:divide-gray-800">
            {llamar.slice(0, 5).map((i) => {
              const d = new Date(i.cuando);
              return <Renglon key={i.leadId} i={i} detalle={d < ahora ? `Quedó para ${cuandoAR(d, ahora)}` : cuandoAR(d, ahora)} />;
            })}
          </ul>
        </div>
      )}
      {visitas.length > 0 && (
        <div className={`${bloque} border-indigo-200 panel-oscuro:border-indigo-500/30`}>
          <h2 className="flex items-center gap-2 text-sm font-bold text-indigo-700 panel-oscuro:text-indigo-300"><CalendarDays className="h-4 w-4" /> Próximas visitas ({visitas.length})</h2>
          <ul className="divide-y divide-gray-100 panel-oscuro:divide-gray-800">
            {visitas.slice(0, 5).map((i) => <Renglon key={i.leadId} i={i} detalle={`${i.tipo === "PRUEBA" ? "Prueba de manejo" : "Visita"} · ${cuandoAR(new Date(i.cuando), ahora)} hs`} />)}
          </ul>
        </div>
      )}
    </section>
  );
}
