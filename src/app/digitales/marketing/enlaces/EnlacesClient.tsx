"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, BarChart3, ArrowRight, Tag } from "lucide-react";
import { CANALES, direccionBase, enlaceParaCompartir, campaniaLimpia, type ProductoParaCompartir } from "@/lib/enlaces-compartir";
import { PARAMETROS_PARA_META } from "@/lib/utm-digital";
import BotonCopiar from "../../ventas/BotonCopiar";
import { CONSEJO_DE_ENLACES } from "@/lib/plantillas-marketing";
import ConsejoDeUso from "../../ConsejoDeUso";

/**
 * La lista de canales con su link. Sin dirección: es una pantalla de copiar
 * y pegar, no de compartir un estado. El producto y la campaña viven en el
 * estado del componente.
 */
export default function EnlacesClient({ productos, dominioPlataforma, appUrl }: {
  productos: ProductoParaCompartir[];
  dominioPlataforma: string;
  appUrl: string;
}) {
  const [elegido, setElegido] = useState(productos[0]?.id ?? null);
  const [campania, setCampania] = useState("");
  const producto = productos.find((p) => p.id === elegido) ?? null;

  if (!producto) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 panel-oscuro:border-gray-800 px-6 py-12 text-center">
        <p className="text-sm font-semibold text-gray-700 panel-oscuro:text-gray-300">Todavía no tenés ningún producto</p>
        <p className="mt-1 text-[12.5px] text-gray-500 panel-oscuro:text-gray-400">
          Cuando cargues uno, acá aparecen sus links para cada canal.
        </p>
        <Link href="/digitales/productos" className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-bold text-orange-600">
          Ir a Productos <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  const base = direccionBase(producto, dominioPlataforma, appUrl);
  const limpia = campaniaLimpia(campania);

  return (
    <div className="space-y-4">
      {/* ── El producto ─────────────────────────────────────────────────────
          Sólo con más de uno. Cada producto tiene su dirección, así que el
          link cambia entero, no sólo la etiqueta. */}
      {productos.length > 1 && (
        <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto">
          <div className="flex gap-2 w-max sm:w-auto sm:flex-wrap">
            {productos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setElegido(p.id)}
                aria-pressed={p.id === elegido}
                className={`shrink-0 max-w-[200px] truncate rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${
                  p.id === elegido
                    ? "bg-gray-900 panel-oscuro:bg-gray-100 text-white panel-oscuro:text-gray-900"
                    : "bg-white panel-oscuro:bg-gray-900 border border-gray-200 panel-oscuro:border-gray-800 text-gray-600 panel-oscuro:text-gray-400 hover:border-orange-300"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Sin publicar: se avisa arriba de todo ─────────────────────────── */}
      {!producto.isActive && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 panel-oscuro:bg-amber-500/10 border border-amber-200 panel-oscuro:border-amber-500/25 px-3.5 py-2.5 text-[12.5px] text-amber-900 panel-oscuro:text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>{producto.name}</strong> todavía no está publicado: quien abra estos links no va a ver nada.
            Publicá la página antes de repartirlos.
          </span>
        </p>
      )}

      {/* ── La campaña, opcional ─────────────────────────────────────────── */}
      <div className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
        <label htmlFor="campania" className="flex items-center gap-1.5 text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">
          <Tag className="h-4 w-4 text-orange-500" /> Nombre de la campaña
          <span className="font-normal text-gray-400 panel-oscuro:text-gray-500">(opcional)</span>
        </label>
        <p className="mt-0.5 mb-3 text-[12.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
          Para separar lo que estás probando: «lanzamiento», «precio tachado», «video corto». Se agrega a todos
          los links de abajo, y en Estadísticas cada una aparece con sus visitas y sus ventas.
        </p>
        <input
          id="campania"
          value={campania}
          onChange={(e) => setCampania(e.target.value)}
          maxLength={80}
          placeholder="lanzamiento"
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 text-sm text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
        />
        {campania && limpia !== campania.trim() && (
          <p className="mt-1.5 text-[12px] text-gray-500 panel-oscuro:text-gray-400">
            Va a quedar como <span className="font-semibold text-gray-700 panel-oscuro:text-gray-300">{limpia || "(vacía)"}</span>: en minúscula y sin signos raros, igual que se cuenta.
          </p>
        )}
      </div>

      {/* ── Un link por canal ────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
        <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">Un link por canal</p>
        <p className="mt-0.5 mb-4 text-[12.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
          Todos llevan a la misma página: <span className="font-semibold text-gray-700 panel-oscuro:text-gray-300 break-all">{base}</span>.
          Lo que cambia es la etiqueta, que le dice a Estadísticas de dónde vino cada visita.
        </p>
        <ul className="divide-y divide-gray-100 panel-oscuro:divide-gray-800">
          {CANALES.map((canal) => {
            const url = enlaceParaCompartir(base, canal, campania);
            return (
              <li key={canal.clave} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-gray-800 panel-oscuro:text-gray-200">{canal.nombre}</p>
                    <p className="text-[12px] text-gray-500 panel-oscuro:text-gray-400">{canal.donde}</p>
                  </div>
                  <BotonCopiar valor={url} que={`el link para ${canal.nombre}`} />
                </div>
                <code className="mt-1.5 block break-all rounded-xl bg-gray-50 panel-oscuro:bg-gray-800/60 px-3 py-2 text-[11.5px] text-gray-600 panel-oscuro:text-gray-300">
                  {url}
                </code>
              </li>
            );
          })}
        </ul>
      </div>

      <ConsejoDeUso>{CONSEJO_DE_ENLACES}</ConsejoDeUso>

      {/* ── Anuncios en Meta ─────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-orange-100 panel-oscuro:border-orange-500/20 bg-orange-50/60 panel-oscuro:bg-orange-500/10 p-5">
        <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">Si hacés anuncios en Meta</p>
        <p className="mt-0.5 mb-3 text-[12.5px] leading-relaxed text-gray-600 panel-oscuro:text-gray-400">
          No uses un link de arriba: en cada anuncio, en <strong>Seguimiento → Parámetros de URL</strong>, pegá esto
          una sola vez. Meta completa el nombre de la campaña y del anuncio, y acá aparece cuál vendió.
        </p>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 px-3 py-2 text-[11.5px] text-gray-700 panel-oscuro:text-gray-300">
            {PARAMETROS_PARA_META}
          </code>
          <BotonCopiar valor={PARAMETROS_PARA_META} que="los parámetros para Meta" />
        </div>
      </div>

      <Link
        href="/digitales/estadisticas?vista=campanias"
        className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-orange-600 hover:text-orange-500"
      >
        <BarChart3 className="h-4 w-4" /> Ver qué canal trae ventas, en Estadísticas → Campañas <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
