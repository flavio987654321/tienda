"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import { useMarkAdminSectionSeen } from "@/hooks/useMarkAdminSectionSeen";

type LeadRow = {
  storeId: string;
  storeName: string;
  storeSlug: string;
  affiliateId: string | null;
  affiliateName: string;
  affiliateEmail: string;
  total: number;
  confirmed: number;
  rejected: number;
  pending: number;
  rejectionRate: number;
  suspicious: boolean;
};

export default function LeadsAdmin() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "suspicious">("suspicious");
  useMarkAdminSectionSeen("leads");

  // Refetch manual (botón "Actualizar") — el setLoading(true) sincrónico está
  // OK acá porque corre desde un evento, no dentro de un efecto.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/leads");
      const data = await res.json();
      setRows(data.leads ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch al montar. La carga arranca con loading=true, así que no hace falta
  // setState sincrónico en el efecto: el primer setState ocurre recién después
  // del await (boundary async), que es lo que piden las reglas de React.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/leads");
        const data = await res.json();
        if (active) setRows(data.leads ?? []);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const visible = filter === "suspicious" ? rows.filter(r => r.suspicious) : rows;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Consultas AUTOS / Leads</h1>
        <p className="text-gray-400 text-sm">Últimos 30 días · Agrupado por tienda y afiliado</p>
      </div>

      {/* Alerta resumen */}
      {rows.filter(r => r.suspicious).length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-bold text-sm">
              {rows.filter(r => r.suspicious).length} combinación{rows.filter(r => r.suspicious).length > 1 ? "es" : ""} con patrón sospechoso
            </p>
            <p className="text-red-400 text-xs mt-0.5">5+ rechazos sin ninguna confirmación en los últimos 30 días.</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {(["suspicious", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === f ? "bg-indigo-600 text-white" : "bg-white/5 text-gray-400 hover:text-white"
            }`}>
            {f === "suspicious" ? `Sospechosos (${rows.filter(r => r.suspicious).length})` : `Todos (${rows.length})`}
          </button>
        ))}
        <button onClick={load} className="ml-auto px-4 py-1.5 rounded-lg text-sm bg-white/5 text-gray-400 hover:text-white transition-all">
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Cargando...</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          {filter === "suspicious" ? "No hay patrones sospechosos en los últimos 30 días." : "Sin datos."}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((row, i) => (
            <div key={i} className={`rounded-xl border p-4 ${
              row.suspicious
                ? "bg-red-500/5 border-red-500/20"
                : "bg-white/5 border-white/10"
            }`}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    {row.suspicious && <AlertTriangle className="h-4 w-4 text-red-400" />}
                    <span className="text-white font-bold text-sm">{row.storeName}</span>
                    <a href={`/tienda/${row.storeSlug}`} target="_blank" rel="noreferrer"
                      className="text-indigo-400 text-xs hover:underline">ver tienda →</a>
                  </div>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Afiliado: <span className="text-gray-300">{row.affiliateName}</span>
                    <span className="text-gray-600 mx-1">·</span>
                    <span className="text-gray-500">{row.affiliateEmail}</span>
                  </p>
                </div>
                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                  row.suspicious
                    ? "bg-red-500/20 text-red-300 border-red-500/30"
                    : row.rejectionRate >= 50
                    ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                    : "bg-green-500/20 text-green-300 border-green-500/30"
                }`}>
                  {row.rejectionRate}% rechazados
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: CheckCircle, label: "Confirmados", value: row.confirmed, color: "text-green-400" },
                  { icon: XCircle,    label: "Rechazados",  value: row.rejected,  color: "text-red-400" },
                  { icon: Clock,      label: "Pendientes",  value: row.pending,   color: "text-yellow-400" },
                  { icon: null,       label: "Total",       value: row.total,     color: "text-gray-300" },
                  /* Los `icon` de arriba NO se dibujan: las tarjetas muestran el
                     número y la etiqueta, nada más. Se dejan en la lista —y por eso
                     los imports siguen en pie— porque el día que se quieran mostrar
                     ya están elegidos y asignados. Lo que se saca es el `icon: Icon`
                     del destructuring, que era una variable declarada para nada. */
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white/5 rounded-lg p-3 text-center">
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {row.suspicious && (
                <div className="mt-3 pt-3 border-t border-red-500/20 text-xs text-red-300">
                  Acción sugerida: contactar al dueño de la tienda y pedirle que justifique los rechazos.
                  Si no responde en 48h, abrí una disputa o suspendé la tienda.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
