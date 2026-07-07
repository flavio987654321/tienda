"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";

export function ExportButtons({ range, storeSlug }: { range: number; storeSlug: string }) {
  const [loadingCsv, setLoadingCsv] = useState(false);

  async function downloadCsv() {
    if (loadingCsv) return;
    setLoadingCsv(true);
    try {
      const res = await fetch(`/api/dashboard/metricas/export?range=${range}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `metricas-${storeSlug}-${range}d.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("No se pudo descargar el archivo.");
    } finally {
      setLoadingCsv(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={downloadCsv}
        disabled={loadingCsv}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" />
        {loadingCsv ? "Descargando..." : "Exportar CSV"}
      </button>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors print:hidden"
      >
        <FileText className="h-3.5 w-3.5" />
        Guardar PDF
      </button>
    </div>
  );
}
