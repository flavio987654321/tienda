"use client";

import { useState } from "react";
import { X, Check, Loader2, AlertTriangle, Minus, Plus } from "lucide-react";

interface Variant {
  id: string;
  value: string;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  variants: Variant[];
}

interface Props {
  product: Product;
  onSave: (updatedVariants: { id: string; stock: number }[]) => void;
  onClose: () => void;
}

export default function StockAdjustModal({ product, onSave, onClose }: Props) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(product.variants.map((v) => [v.id, String(v.stock)]))
  );
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function step(variantId: string, delta: number) {
    setValues((prev) => {
      const current = parseInt(prev[variantId]) || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [variantId]: String(next) };
    });
  }

  async function handleSave() {
    if (saving || saved) return;
    const changed = product.variants.filter((v) => {
      const newValue = parseInt(values[v.id]);
      return !isNaN(newValue) && newValue >= 0 && newValue !== v.stock;
    });
    if (changed.length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    setError("");

    const results: { id: string; stock: number }[] = [];
    for (const v of changed) {
      const newStock = parseInt(values[v.id]);
      const res = await fetch(`/api/productos/variantes/${v.id}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "set", value: newStock, reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al ajustar stock");
        setSaving(false);
        return;
      }
      results.push({ id: v.id, stock: data.variant.stock });
    }

    setSaving(false);
    setSaved(true);
    onSave(results);
    await new Promise((r) => setTimeout(r, 500));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh] animate-fade-slide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">Ajustar stock</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{product.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-3">
          {product.variants.map((v) => (
            <div key={v.id} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-gray-600 truncate">{v.value}</span>
              <button
                type="button"
                onClick={() => step(v.id, -1)}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <input
                type="number"
                min={0}
                value={values[v.id]}
                onChange={(e) => setValues((p) => ({ ...p, [v.id]: e.target.value }))}
                className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => step(v.id, 1)}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Motivo (opcional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: conteo físico, devolución, merma..."
              rows={2}
              maxLength={200}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-gray-100 bg-white rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:cursor-not-allowed ${
              saved ? "bg-emerald-500 scale-[1.02]" : "bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            }`}
          >
            {saved ? (
              <>
                <Check className="h-4 w-4" /> Guardado
              </>
            ) : saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
              </>
            ) : (
              "Guardar stock"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
