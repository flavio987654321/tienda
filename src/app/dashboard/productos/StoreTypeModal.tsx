"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STORE_TYPES } from "@/lib/storeTypes";
import { Loader2, X, ArrowLeft, Check } from "lucide-react";

export default function StoreTypeModal({
  isEditing = false,
  currentType,
  onClose,
}: {
  isEditing?: boolean;
  currentType?: string;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(currentType ?? null);
  const [wholesale, setWholesale] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectedConfig = STORE_TYPES.find((t) => t.id === selected);

  function handleClose() {
    if (isEditing) onClose?.();
    else router.back();
  }

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
        tieneVentaMayorista: isEditing ? (current.tieneVentaMayorista ?? false) : wholesale,
      }),
    });

    setSaving(false);
    setSaved(true);
    await new Promise((r) => setTimeout(r, 700));
    router.refresh();
    if (isEditing) onClose?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-8 py-7 text-white relative shrink-0">
          <button
            onClick={handleClose}
            title="Cerrar"
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4 text-white/80" />
          </button>
          <h2 className="text-2xl font-bold mb-1">¿Qué vendés?</h2>
          <p className="text-indigo-200 text-sm">
            {isEditing
              ? "Cambiá el tipo de tienda. Tus productos existentes no se modifican."
              : "Elegí el tipo de tienda para que el formulario de productos muestre los campos correctos."}
          </p>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">

          {/* Tipos */}
          <div className="grid grid-cols-2 gap-2.5">
            {STORE_TYPES.map((t) => {
              const active = selected === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setSelected(t.id); setWholesale(false); }}
                  className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all duration-200 ${
                    active && saved
                      ? "border-green-500 bg-green-50 shadow-md scale-[1.03] animate-success-flash"
                      : active
                      ? "border-indigo-500 bg-indigo-50 shadow-md scale-[1.03]"
                      : "border-gray-100 hover:border-gray-300 bg-gray-50 hover:scale-[1.01]"
                  }`}
                >
                  <span className="text-2xl leading-none">{t.emoji}</span>
                  <p className={`text-sm font-semibold leading-tight ${active ? "text-indigo-700" : "text-gray-800"}`}>
                    {t.label}
                  </p>
                  {active && (
                    <span key={t.id} className="absolute top-2 right-2 animate-pop-in">
                      <Check className="h-3.5 w-3.5 text-white bg-indigo-500 rounded-full p-0.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Info del tipo seleccionado */}
          {selectedConfig && (
            <div key={selectedConfig.id} className="animate-fade-slide bg-indigo-50 rounded-2xl px-4 py-3 text-sm text-indigo-700">
              Categorías: {selectedConfig.categorias.slice(0, 4).join(", ")}...
            </div>
          )}

          {/* Toggle mayorista — solo si el tipo lo soporta y es la primera vez */}
          {!isEditing && selectedConfig?.supportsWholesale && (
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
            disabled={!selected || saving || saved}
            className={`w-full py-3.5 rounded-2xl font-semibold disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 ${
              saved
                ? "bg-green-500 text-white scale-[1.02] shadow-lg"
                : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
            }`}
          >
            {saved ? (
              <><Check className="h-4 w-4" /> ¡Guardado!</>
            ) : saving ? (
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
