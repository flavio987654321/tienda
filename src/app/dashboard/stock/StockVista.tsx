import Link from "next/link";
import { Warehouse, AlertTriangle, Clock, MessageCircle, Eye } from "lucide-react";
import type { FilaDeStock } from "@/lib/stockPanel";
import { resumenDeStock, resumenDeVendidos, textoEstancado, DIAS_ESTANCADO, DIAS_SIN_INTERES } from "@/lib/rentabilidadAutos";
/* "Stock y ganancia" (06/10/26): cuánto hay invertido, cuánto deja cada auto,
   cuántos días lleva y cuáles están estancados. Ver `lib/rentabilidadAutos`.
   Todo es de uso interno: nada de esto llega a la tienda. */

const ORDENES = {
  dias: { label: "Más días en stock", fn: (a: FilaDeStock, b: FilaDeStock) => b.dias - a.dias },
  margen: { label: "Menos margen", fn: (a: FilaDeStock, b: FilaDeStock) => (a.margenPct ?? Infinity) - (b.margenPct ?? Infinity) },
  consultas: { label: "Menos consultas", fn: (a: FilaDeStock, b: FilaDeStock) => a.consultas30 - b.consultas30 || b.dias - a.dias },
} as const;
export type Orden = keyof typeof ORDENES;
export const esOrden = (o: string | undefined): o is Orden => !!o && o in ORDENES;

const ESTADO: Record<FilaDeStock["estado"], { label: string; cls: string }> = {
  DISPONIBLE: { label: "Disponible", cls: "bg-emerald-100 panel-oscuro:bg-emerald-500/15 text-emerald-700 panel-oscuro:text-emerald-300" },
  RESERVADO: { label: "Reservado", cls: "bg-amber-100 panel-oscuro:bg-amber-500/15 text-amber-800 panel-oscuro:text-amber-300" },
  OCULTO: { label: "Oculto", cls: "bg-gray-100 panel-oscuro:bg-gray-800 text-gray-600 panel-oscuro:text-gray-400" },
  VENDIDO: { label: "Vendido", cls: "bg-gray-100 panel-oscuro:bg-gray-800 text-gray-600 panel-oscuro:text-gray-400" },
};

export default function StockVista({ enStock, vendidos, moneda, orden }: { enStock: FilaDeStock[]; vendidos: FilaDeStock[]; moneda: string; orden: Orden }) {
  // El signo va adelante de la moneda: "-$500.000", no "$-500.000".
  const plata = (n: number) => (n < 0 ? "-" : "") + (moneda === "USD" ? "USD " : "$") + Math.abs(Math.round(n)).toLocaleString("es-AR");
  const r = resumenDeStock(enStock);
  const v = resumenDeVendidos(vendidos);
  const estancados = enStock.filter((f) => f.estancado);
  const lista = [...enStock].sort(ORDENES[orden].fn);

  const tarjeta = "bg-white panel-oscuro:bg-gray-900 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 p-4 sm:p-5";
  const titulo = "text-xs font-semibold uppercase tracking-wide text-gray-400 panel-oscuro:text-gray-500 mb-1";
  // A 360 px "$104.000.000" no entraba en media tarjeta y el último 0 bajaba de renglón.
  const numero = "text-base min-[400px]:text-lg sm:text-2xl whitespace-nowrap font-black text-gray-900 panel-oscuro:text-gray-100";

  const Margen = ({ f }: { f: FilaDeStock }) => f.ganancia == null ? (
    <Link href={`/dashboard/productos/nuevo?edit=${f.id}`} className="text-xs font-semibold text-amber-700 panel-oscuro:text-amber-400 hover:underline">Sin costo: cargá los gastos</Link>
  ) : (
    <span className={`text-sm font-bold ${f.ganancia < 0 ? "text-red-600 panel-oscuro:text-red-400" : "text-green-700 panel-oscuro:text-green-400"}`}>
      {plata(f.ganancia)} <span className="font-semibold opacity-80">({Math.round(f.margenPct ?? 0)}%)</span>
    </span>
  );

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Warehouse className="h-6 w-6 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900 panel-oscuro:text-gray-100">Stock y ganancia</h1>
        </div>
        <p className="text-gray-500 panel-oscuro:text-gray-400 ml-9">Cuánto tenés invertido, cuánto deja cada auto y cuáles están parados. Sólo lo ves vos.</p>
      </div>

      {/* Totales del stock */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className={tarjeta}><p className={titulo}>Invertido en stock</p><p className={numero}>{plata(r.invertido)}</p>
          <p className="text-xs text-gray-400 mt-1">{r.unidades} {r.unidades === 1 ? "unidad" : "unidades"}{r.sinCosto ? ` · ${r.sinCosto} sin costo` : ""}</p></div>
        <div className={tarjeta}><p className={titulo}>Valor publicado</p><p className={numero}>{plata(r.valorPublicado)}</p></div>
        <div className={tarjeta}><p className={titulo}>Ganancia esperada</p><p className={`${numero} ${r.gananciaEsperada < 0 ? "!text-red-600" : "!text-green-700 panel-oscuro:!text-green-400"}`}>{plata(r.gananciaEsperada)}</p>
          <p className="text-xs text-gray-400 mt-1">al precio publicado</p></div>
        <div className={tarjeta}><p className={titulo}>Días promedio</p><p className={numero}>{r.diasPromedio ?? "—"}</p><p className="text-xs text-gray-400 mt-1">en stock</p></div>
      </div>

      {/* Avisos */}
      {(estancados.length > 0 || r.sinCosto > 0) && (
        <div className="space-y-2 mb-6">
          {estancados.length > 0 && (
            <div className="flex gap-3 rounded-2xl border border-red-200 panel-oscuro:border-red-500/30 bg-red-50 panel-oscuro:bg-red-500/10 px-4 py-3">
              <AlertTriangle className="h-5 w-5 text-red-600 panel-oscuro:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 panel-oscuro:text-red-200">
                <strong>{estancados.length} {estancados.length === 1 ? "auto estancado" : "autos estancados"}</strong>: {DIAS_ESTANCADO} días o más en stock, o {DIAS_SIN_INTERES} días sin ninguna consulta en el último mes. Están marcados abajo.
              </p>
            </div>
          )}
          {r.sinCosto > 0 && (
            <div className="flex gap-3 rounded-2xl border border-amber-200 panel-oscuro:border-amber-500/30 bg-amber-50 panel-oscuro:bg-amber-500/10 px-4 py-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900 panel-oscuro:text-amber-200">
                <strong>{r.sinCosto} {r.sinCosto === 1 ? "vehículo no tiene" : "vehículos no tienen"} gastos cargados</strong>, así que no se puede calcular cuánto dejan. Cargá al menos la compra en &quot;Gastos del vehículo&quot;.
              </p>
            </div>
          )}
        </div>
      )}

      {/* En stock */}
      <section className="bg-white panel-oscuro:bg-gray-900 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 overflow-hidden mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-gray-100 panel-oscuro:border-gray-800">
          <h2 className="font-bold text-gray-900 panel-oscuro:text-gray-100">En stock ({enStock.length})</h2>
          <nav aria-label="Ordenar" className="flex gap-1.5 overflow-x-auto">
            {(Object.keys(ORDENES) as Orden[]).map((o) => (
              <Link key={o} href={`/dashboard/stock?orden=${o}`} aria-current={o === orden ? "true" : undefined}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold ${o === orden ? "bg-indigo-600 text-white" : "bg-gray-50 panel-oscuro:bg-gray-800/50 text-gray-600 panel-oscuro:text-gray-400 hover:bg-gray-100"}`}>
                {ORDENES[o].label}
              </Link>
            ))}
          </nav>
        </div>
        {lista.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">No tenés vehículos en stock.</p>
        ) : (
          <ul className="divide-y divide-gray-100 panel-oscuro:divide-gray-800">
            {lista.map((f) => {
              const aviso = textoEstancado(f.estancado, f.dias, f.consultas30);
              return (
                <li key={f.id} className={`p-4 ${f.estancado ? "bg-red-50/40 panel-oscuro:bg-red-500/5" : ""}`}>
                  <div className="flex gap-3">
                    {f.imagen ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.imagen} alt="" className="h-14 w-20 rounded-lg object-cover bg-gray-100 shrink-0" />
                    ) : <div className="h-14 w-20 rounded-lg bg-gray-100 panel-oscuro:bg-gray-800 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/dashboard/productos/nuevo?edit=${f.id}`} className="font-semibold text-gray-900 panel-oscuro:text-gray-100 hover:underline truncate">{f.nombre}</Link>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ESTADO[f.estado].cls}`}>{ESTADO[f.estado].label}</span>
                      </div>
                      <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-gray-500 panel-oscuro:text-gray-400">
                        <span className={`inline-flex items-center gap-1 ${f.estancado ? "font-bold text-red-700 panel-oscuro:text-red-400" : ""}`}><Clock className="h-3.5 w-3.5" /> {f.dias} días</span>
                        <span>Costo: <strong className="text-gray-800 panel-oscuro:text-gray-200">{f.costo != null ? plata(f.costo) : "—"}</strong></span>
                        <span>Precio: <strong className="text-gray-800 panel-oscuro:text-gray-200">{plata(f.precio)}</strong></span>
                        <span className="inline-flex flex-wrap items-center gap-x-2"><span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{f.consultas} {f.consultas === 1 ? "consulta" : "consultas"}</span><span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{f.visitas} visitas</span></span>
                      </div>
                      <div className="mt-1"><Margen f={f} /></div>
                      {aviso && <p className="mt-1.5 text-xs font-medium text-red-700 panel-oscuro:text-red-400">{aviso}</p>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Vendidos */}
      <section className="bg-white panel-oscuro:bg-gray-900 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-100 panel-oscuro:border-gray-800">
          <h2 className="font-bold text-gray-900 panel-oscuro:text-gray-100">Vendidos en los últimos 12 meses ({v.unidades})</h2>
          {v.unidades > 0 && (
            <p className="text-sm text-gray-500 panel-oscuro:text-gray-400 mt-0.5">
              Facturado {plata(v.facturado)} · Ganancia {plata(v.ganancia)}{v.conCosto < v.unidades ? ` (de ${v.conCosto} con costo cargado)` : ""} · Tardaron {v.diasPromedio} días en promedio
            </p>
          )}
        </div>
        {vendidos.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Cuando marques un vehículo como vendido (con el precio de venta), aparece acá con lo que dejó.</p>
        ) : (
          <ul className="divide-y divide-gray-100 panel-oscuro:divide-gray-800">
            {vendidos.map((f) => (
              <li key={f.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 panel-oscuro:text-gray-100 truncate">{f.nombre}</p>
                  <p className="text-xs text-gray-500 panel-oscuro:text-gray-400">
                    {f.soldAt ? new Date(f.soldAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }) : ""} · tardó {f.dias} días · vendido en {plata(f.precio)}{f.costo != null ? ` · costo ${plata(f.costo)}` : ""}
                  </p>
                </div>
                <Margen f={f} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
