"use client";

import { Archive, Download } from "lucide-react";
import { STORE_TYPES } from "@/lib/storeTypes";

type ArchiveItem = {
  id: string;
  createdAt: string;
  tipoTiendaAnterior: string;
  ordersCount: number;
  totalFacturado: number;
};

// Respaldos generados automáticamente al cambiar de rubro (StoreArchive).
// Descarga directa por <a href>: el endpoint responde con Content-Disposition,
// así que no hace falta manejar estados de fetch/blob acá.
export default function ArchiveDownloadCard({ archives }: { archives: ArchiveItem[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
      <div className="px-5 py-4 flex items-start gap-3">
        <div className="p-2 bg-slate-100 rounded-xl shrink-0">
          <Archive className="h-4 w-4 text-slate-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Respaldos de ciclos anteriores</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Cada vez que cambiás de rubro guardamos una copia de tus ventas, pagos y cupones de ese ciclo.
            Descargala cuando la necesites para tu contabilidad o ante un reclamo.
          </p>
        </div>
      </div>

      {archives.map((a) => {
        const rubro = STORE_TYPES.find((t) => t.id === a.tipoTiendaAnterior);
        const fecha = new Date(a.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
        return (
          <div key={a.id} className="px-5 py-4 flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-700">
                {rubro?.emoji} {rubro?.label ?? a.tipoTiendaAnterior} — hasta el {fecha}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {a.ordersCount} pedido{a.ordersCount !== 1 ? "s" : ""} · ${a.totalFacturado.toLocaleString("es-AR")} facturados por Mercado Pago
              </p>
            </div>
            {/* Grilla de dos en angosto. Son CUATRO botones en una fila sin
                `flex-wrap`, asi que en 360 sumaban unos 400px dentro de una
                tarjeta de 256: se salian por el costado y "Todo (JSON)" quedaba
                tan afuera que no se veia nunca — una descarga que desde el
                teléfono no existía. En dos columnas entran los cuatro. */}
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
              {([
                ["pedidos", "Pedidos"],
                ["cupones", "Cupones"],
                ["promociones", "Promociones"],
                ["completo", "Todo (JSON)"],
              ] as const).map(([tipo, label]) => (
                <a
                  key={tipo}
                  href={`/api/store/archives/${a.id}?tipo=${tipo}`}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Download className="h-3 w-3 shrink-0" /> <span className="truncate">{label}</span>
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
