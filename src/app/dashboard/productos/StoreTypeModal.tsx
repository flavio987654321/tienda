"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STORE_TYPES } from "@/lib/storeTypes";
import { Loader2, X, ArrowLeft } from "lucide-react";

export default function StoreTypeModal() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [wholesale, setWholesale] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedConfig = STORE_TYPES.find((t) => t.id === selected);

  async function confirm() {
    if (!selected) return;
    setSaving(true);

    const configRes = await fetch("/api/configuracion");
    const { store: current } = await configRes.json();

    await fetch("/api/configuracion", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...current,
        name: current.name || "Mi Tienda",
        tipoTienda: selected,
        tipoTiendaConfigurado: true,
        tieneVentaMayorista: wholesale,
      }),
    });

    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-8 py-7 text-white relative">
          <button
            onClick={() => router.back()}
            title="Volver"
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4 text-white/80" />
          </button>
          <h2 className="text-2xl font-bold mb-1">¿Qué vendés?</h2>
          <p className="text-indigo-200 text-sm">
            Elegí el tipo de tienda para que el formulario de productos muestre los campos correctos.
          </p>
        </div>

        <div className="p-6 space-y-4">

          {/* Tipos */}
          <div className="grid grid-cols-2 gap-2.5">
            {STORE_TYPES.map((t) => {
              const active = selected === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setSelected(t.id); setWholesale(false); }}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all ${
                    active
                      ? "border-indigo-500 bg-indigo-50 shadow-sm"
                      : "border-gray-100 hover:border-gray-300 bg-gray-50"
                  }`}
                >
                  <span className="text-2xl leading-none">{t.emoji}</span>
                  <p className={`text-sm font-semibold leading-tight ${active ? "text-indigo-700" : "text-gray-800"}`}>
                    {t.label}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Info del tipo seleccionado */}
          {selectedConfig && (
            <div className="bg-indigo-50 rounded-2xl px-4 py-3 text-sm text-indigo-700">
              Categorías: {selectedConfig.categorias.slice(0, 4).join(", ")}...
            </div>
          )}

          {/* Toggle mayorista — solo si el tipo lo soporta */}
          {selectedConfig?.supportsWholesale && (
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3.5 border border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-800">Venta por mayor</p>
                <p className="text-xs text-gray-400 mt-0.5">Activa campos de precio mayorista en tus productos</p>
              </div>
              <button
                onClick={() => setWholesale((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  wholesale ? "bg-indigo-600" : "bg-gray-200"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  wholesale ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>
          )}

          {/* Confirmar */}
          <button
            onClick={confirm}
            disabled={!selected || saving}
            className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
            ) : (
              "Confirmar y continuar →"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
