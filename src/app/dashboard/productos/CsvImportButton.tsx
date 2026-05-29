"use client";
import { useState, useRef } from "react";
import { Upload, X, FileText, AlertCircle, CheckCircle2, Download } from "lucide-react";

const CSV_TEMPLATE = `nombre,precio,precioComparacion,categoria,subcategoria,descripcion,estado,imagenes
Remera Blanca Oversize,18500,24000,Mujer,Remeras,Remera de algodón premium,ACTIVO,
Jean Skinny Negro,35900,,Mujer,Jeans,Jean clásico corte skinny,ACTIVO,
Hoodie Gris,29900,,Hombre,Buzos,,ACTIVO,
`;

type ParsedRow = {
  nombre: string;
  precio: string;
  precioComparacion: string;
  categoria: string;
  subcategoria: string;
  descripcion: string;
  estado: string;
  imagenes: string;
};

function parseCsv(text: string): ParsedRow[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = vals[idx]?.trim() ?? ""; });
    rows.push({
      nombre: row["nombre"] ?? "",
      precio: row["precio"] ?? "",
      precioComparacion: row["preciocomparacion"] ?? row["precio_comparacion"] ?? "",
      categoria: row["categoria"] ?? "",
      subcategoria: row["subcategoria"] ?? "",
      descripcion: row["descripcion"] ?? "",
      estado: row["estado"] ?? "ACTIVO",
      imagenes: row["imagenes"] ?? "",
    });
  }
  return rows.filter(r => r.nombre || r.precio);
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current); current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export default function CsvImportButton({ onImported }: { onImported?: () => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: { row: number; error: string }[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setResult({ created: 0, errors: [{ row: 0, error: "El archivo supera el límite de 5 MB." }] });
      e.target.value = "";
      return;
    }
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCsv(text));
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "template_productos.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (!rows.length) return;
    setImporting(true);
    try {
      const res = await fetch("/api/productos/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      setResult(data);
      if (data.created > 0) onImported?.();
    } catch {
      setResult({ created: 0, errors: [{ row: 0, error: "Error de red al importar" }] });
    }
    setImporting(false);
  }

  function handleClose() {
    setOpen(false);
    setRows([]);
    setFileName("");
    setResult(null);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm"
      >
        <Upload className="h-4 w-4" />
        Importar CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Importar productos desde CSV</h2>
                <p className="text-sm text-gray-500 mt-0.5">Cargá hasta 500 productos de una vez</p>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* Resultado */}
              {result && (
                <div className={`rounded-xl p-4 ${result.created > 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {result.created > 0
                      ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                      : <AlertCircle className="h-5 w-5 text-red-500" />}
                    <span className="font-semibold text-sm text-gray-800">
                      {result.created > 0
                        ? `${result.created} producto${result.created !== 1 ? "s" : ""} importado${result.created !== 1 ? "s" : ""} correctamente`
                        : "No se pudieron importar productos"}
                    </span>
                  </div>
                  {result.errors.length > 0 && (
                    <ul className="text-xs text-red-700 space-y-0.5 mt-2 pl-1">
                      {result.errors.slice(0, 8).map((e, i) => (
                        <li key={i}>• Fila {e.row}: {e.error}</li>
                      ))}
                      {result.errors.length > 8 && <li>...y {result.errors.length - 8} errores más</li>}
                    </ul>
                  )}
                </div>
              )}

              {/* Instrucciones + template */}
              {!result && (
                <div className="bg-indigo-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-indigo-800 mb-2">Formato del CSV</p>
                  <p className="text-xs text-indigo-700 leading-relaxed mb-3">
                    El archivo debe tener las columnas: <strong>nombre</strong>, <strong>precio</strong> (requeridos) + opcionales: precioComparacion, categoria, subcategoria, descripcion, estado (ACTIVO/OCULTO), imagenes (URLs separadas por |).
                  </p>
                  <button onClick={downloadTemplate}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 transition-colors">
                    <Download className="h-3.5 w-3.5" />
                    Descargar plantilla de ejemplo
                  </button>
                </div>
              )}

              {/* Upload */}
              {!result && (
                <div>
                  <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors cursor-pointer group">
                    <FileText className="h-8 w-8 text-gray-300 group-hover:text-indigo-400 mx-auto mb-2 transition-colors" />
                    {fileName
                      ? <span className="text-sm font-semibold text-indigo-700">{fileName}</span>
                      : <span className="text-sm text-gray-400">Hacé click para seleccionar tu archivo CSV</span>}
                    {rows.length > 0 && (
                      <span className="block text-xs text-gray-500 mt-1">{rows.length} fila{rows.length !== 1 ? "s" : ""} detectada{rows.length !== 1 ? "s" : ""}</span>
                    )}
                  </button>
                </div>
              )}

              {/* Preview */}
              {rows.length > 0 && !result && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Vista previa (primeras 3 filas)</p>
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          {["Nombre","Precio","Categoría","Estado"].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 3).map((r, i) => (
                          <tr key={i} className="border-t border-gray-50">
                            <td className="px-3 py-2 text-gray-800 font-medium truncate max-w-[160px]">{r.nombre || <span className="text-red-400">—</span>}</td>
                            <td className="px-3 py-2 text-gray-700">{r.precio ? `$${r.precio}` : <span className="text-red-400">—</span>}</td>
                            <td className="px-3 py-2 text-gray-500">{r.categoria || "general"}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${(r.estado ?? "").toUpperCase() === "OCULTO" ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"}`}>
                                {(r.estado || "ACTIVO").toUpperCase() === "OCULTO" ? "OCULTO" : "ACTIVO"}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {rows.length > 3 && (
                          <tr className="border-t border-gray-50 bg-gray-50">
                            <td colSpan={4} className="px-3 py-2 text-gray-400 text-center">
                              ...y {rows.length - 3} fila{rows.length - 3 !== 1 ? "s" : ""} más
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={handleClose}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                {result ? "Cerrar" : "Cancelar"}
              </button>
              {!result && rows.length > 0 && (
                <button onClick={handleImport} disabled={importing}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                  {importing
                    ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Importando...</>
                    : <><Upload className="h-4 w-4" />Importar {rows.length} producto{rows.length !== 1 ? "s" : ""}</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
