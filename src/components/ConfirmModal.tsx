"use client";

import { AlertTriangle, X } from "lucide-react";

/* ── Confirmación antes de algo que duele ───────────────────────────────────
   Reemplaza al `confirm()` del navegador. No es solo cuestión de que se vea
   feo: el cuadrito del sistema no dice de qué tienda está hablando, no deja
   escribir dos renglones explicando qué pasa con lo que se archiva, y en el
   teléfono aparece pegado arriba de todo, lejos del botón que se apretó.

   Vivía adentro de `AffiliateActions` y no salió nunca de ahí, así que el resto
   del panel siguió usando `confirm()`.

   El `z-[80]` no es decorativo: en el teléfono la barra de arriba del panel es
   `fixed z-[60]` y opaca, así que cualquier modal por debajo de ese número
   pierde sus primeros 56px —justo donde está el título y la cruz— tapados por
   la barra. */
export default function ConfirmModal({
  title,
  body,
  confirmLabel,
  confirmClass = "bg-gray-900 hover:bg-gray-800",
  onConfirm,
  onCancel,
}: {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  confirmClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className="bg-white rounded-2xl shadow-2xl max-w-sm w-full max-h-full flex flex-col overflow-hidden">
        <div className="shrink-0 flex items-start gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <h3 className="flex-1 min-w-0 font-bold text-gray-900 text-sm">{title}</h3>
          <button onClick={onCancel} aria-label="Cerrar" className="shrink-0 text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-gray-600 leading-relaxed">{body}</div>
        {/* Apilados en angosto: dos botones con texto largo ("Archivar la
            promoción") no entran uno al lado del otro en 360 y se cortaban. */}
        <div className="shrink-0 px-5 pb-5 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2 rounded-xl text-white text-sm font-semibold transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
