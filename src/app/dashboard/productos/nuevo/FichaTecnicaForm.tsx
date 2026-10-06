"use client";
import { useRef, useState } from "react";
import { ChevronDown, FileText, Trash2, Upload, ExternalLink } from "lucide-react";
import {
  EQUIPAMIENTO, PAPELES, MOTOR, MEDIDAS, limpiarDato, urlFichaPdf,
  type FichaVehiculo, type TipoDeFicha, type CampoNumerico,
} from "@/lib/fichaVehiculo";

/* La ficha técnica completa en el formulario de un vehículo (06/10/26).
   Todo opcional: cada bloque se abre y se cierra, y el contador dice cuánto
   hay cargado sin tener que abrirlo. Lo que se guarda y por qué, en
   `lib/fichaVehiculo`. */

function Bloque({ titulo, resumen, abierto, onToggle, children }: {
  titulo: string; resumen: string; abierto: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-100 panel-oscuro:border-gray-800 rounded-xl">
      <button type="button" onClick={onToggle} aria-expanded={abierto}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="text-sm font-semibold text-gray-800 panel-oscuro:text-gray-200">{titulo}</span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400 panel-oscuro:text-gray-500">{resumen}</span>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${abierto ? "rotate-180" : ""}`} />
        </span>
      </button>
      {abierto && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function Casillas({ items, elegidos, onToggle }: {
  items: { id: string; label: string }[]; elegidos: string[]; onToggle: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {items.map((i) => {
        const si = elegidos.includes(i.id);
        return (
          <button key={i.id} type="button" onClick={() => onToggle(i.id)} aria-pressed={si}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-colors ${
              si ? "border-indigo-400 bg-indigo-50 panel-oscuro:bg-indigo-500/10"
                 : "border-gray-100 panel-oscuro:border-gray-800 bg-gray-50 panel-oscuro:bg-gray-800/50"}`}>
            <span className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${
              si ? "bg-indigo-500 text-white" : "bg-white panel-oscuro:bg-gray-700 border border-gray-200 panel-oscuro:border-gray-600"}`}>
              {si ? "✓" : ""}
            </span>
            <span className={`text-sm ${si ? "text-indigo-800 panel-oscuro:text-indigo-200 font-medium" : "text-gray-600 panel-oscuro:text-gray-400"}`}>{i.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Datos({ campos, datos, onChange }: {
  campos: CampoNumerico[]; datos: Record<string, string>; onChange: (id: string, v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {campos.map((c) => (
        <div key={c.id}>
          <label htmlFor={`ficha-${c.id}`} className="block text-sm font-medium text-gray-700 panel-oscuro:text-gray-300 mb-1.5">{c.label}</label>
          <div className="relative">
            <input id={`ficha-${c.id}`} type="text" inputMode={c.decimal ? "decimal" : "numeric"}
              value={datos[c.id] ?? ""} placeholder={c.ejemplo}
              onChange={(e) => onChange(c.id, limpiarDato(c.id, e.target.value))}
              className={`w-full border border-gray-200 panel-oscuro:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${c.unidad ? "pr-20" : ""}`} />
            {c.unidad && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 panel-oscuro:text-gray-500 pointer-events-none">{c.unidad}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FichaTecnicaForm({ ficha, tipo, onChange, productoGuardadoId }: {
  ficha: FichaVehiculo;
  tipo: TipoDeFicha;
  onChange: (f: FichaVehiculo) => void;
  /** Si el vehículo ya existe, se ofrece ver el PDF (con lo último guardado). */
  productoGuardadoId?: string | null;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const archivo = useRef<HTMLInputElement>(null);

  const alternar = (b: string) => setAbierto((a) => (a === b ? null : b));
  const tildar = (lista: "equipamiento" | "papeles") => (id: string) =>
    onChange({ ...ficha, [lista]: ficha[lista].includes(id) ? ficha[lista].filter((x) => x !== id) : [...ficha[lista], id] });
  const dato = (id: string, v: string) => {
    const datos = { ...ficha.datos };
    if (v) datos[id] = v; else delete datos[id];
    onChange({ ...ficha, datos });
  };

  const equipamiento = EQUIPAMIENTO[tipo];
  const contar = (campos: CampoNumerico[]) => campos.filter((c) => ficha.datos[c.id]).length;
  const cuantos = (lista: string[], items: { id: string }[]) => items.filter((i) => lista.includes(i.id)).length;

  async function subirFolleto(f: File) {
    setError("");
    if (f.type && f.type !== "application/pdf") { setError("Tiene que ser un archivo PDF."); return; }
    if (f.size > 4 * 1024 * 1024) { setError("El PDF no puede pasar de 4 MB. Probá comprimirlo (por ejemplo en ilovepdf.com)."); return; }
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("purpose", "ficha-pdf");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) { setError(data.error || "No se pudo subir el PDF. Probá de nuevo."); return; }
      onChange({ ...ficha, folleto: { url: data.url, nombre: f.name.replace(/\.pdf$/i, "").slice(0, 80) || "Folleto" } });
    } catch {
      setError("No se pudo subir el PDF. Revisá la conexión y probá de nuevo.");
    } finally {
      setSubiendo(false);
      if (archivo.current) archivo.current.value = "";
    }
  }

  return (
    <div className="bg-white panel-oscuro:bg-gray-900 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900 panel-oscuro:text-gray-100">Ficha técnica completa</h2>
          <p className="text-xs text-gray-400 panel-oscuro:text-gray-500 mt-0.5 max-w-md">
            Opcional. Lo que cargues aparece en la página del vehículo y en la ficha en PDF que el comprador puede descargar y compartir.
          </p>
        </div>
        {productoGuardadoId && (
          <a href={urlFichaPdf(productoGuardadoId)} target="_blank" rel="noopener"
            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 panel-oscuro:text-indigo-400 font-medium hover:text-indigo-800">
            <ExternalLink className="h-4 w-4" /> Ver el PDF
          </a>
        )}
      </div>

      <Bloque titulo="Equipamiento" resumen={`${cuantos(ficha.equipamiento, equipamiento)} tildados`}
        abierto={abierto === "equipamiento"} onToggle={() => alternar("equipamiento")}>
        <Casillas items={equipamiento} elegidos={ficha.equipamiento} onToggle={tildar("equipamiento")} />
      </Bloque>

      <Bloque titulo="Papeles y condiciones" resumen={`${cuantos(ficha.papeles, PAPELES)} tildados`}
        abierto={abierto === "papeles"} onToggle={() => alternar("papeles")}>
        <Casillas items={PAPELES} elegidos={ficha.papeles} onToggle={tildar("papeles")} />
      </Bloque>

      <Bloque titulo="Motor y prestaciones" resumen={`${contar(MOTOR[tipo])} de ${MOTOR[tipo].length}`}
        abierto={abierto === "motor"} onToggle={() => alternar("motor")}>
        <Datos campos={MOTOR[tipo]} datos={ficha.datos} onChange={dato} />
      </Bloque>

      <Bloque titulo="Medidas" resumen={`${contar(MEDIDAS[tipo])} de ${MEDIDAS[tipo].length}`}
        abierto={abierto === "medidas"} onToggle={() => alternar("medidas")}>
        <Datos campos={MEDIDAS[tipo]} datos={ficha.datos} onChange={dato} />
      </Bloque>

      <div className="border border-gray-100 panel-oscuro:border-gray-800 rounded-xl px-4 py-3 space-y-2">
        <p className="text-sm font-semibold text-gray-800 panel-oscuro:text-gray-200">Folleto propio <span className="font-normal text-gray-400">(opcional)</span></p>
        <p className="text-xs text-gray-400 panel-oscuro:text-gray-500">
          Si tenés un PDF propio —el folleto de fábrica de un 0 km, tu ficha con tu diseño— subilo y aparece al lado de la ficha que armamos nosotros.
        </p>
        {ficha.folleto ? (
          <div className="flex flex-wrap items-center gap-3">
            <a href={ficha.folleto.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-indigo-600 panel-oscuro:text-indigo-400 font-medium min-w-0">
              <FileText className="h-4 w-4 shrink-0" /> <span className="truncate">{ficha.folleto.nombre}.pdf</span>
            </a>
            <button type="button" onClick={() => onChange({ ...ficha, folleto: null })}
              className="inline-flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700">
              <Trash2 className="h-4 w-4" /> Quitar
            </button>
          </div>
        ) : (
          <>
            <input ref={archivo} type="file" accept="application/pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) subirFolleto(f); }} />
            <button type="button" disabled={subiendo} onClick={() => archivo.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-sm font-medium text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 disabled:opacity-60">
              <Upload className="h-4 w-4" /> {subiendo ? "Subiendo…" : "Subir PDF (hasta 4 MB)"}
            </button>
          </>
        )}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
