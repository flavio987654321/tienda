"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AffiliateToggle({
  enabled,
  commissionRate: initialRate,
}: {
  enabled: boolean;
  commissionRate: number;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [rate, setRate] = useState(initialRate);

  async function save(newEnabled: boolean, newRate: number) {
    setSaving(true);
    const { store } = await fetch("/api/configuracion").then((r) => r.json());
    await fetch("/api/configuracion", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...store,
        name: store.name || "Mi Tienda",
        affiliatesEnabled: newEnabled,
        commissionRate: newRate,
      }),
    });
    router.refresh();
    setSaving(false);
  }

  return (
    <div className={`rounded-2xl border p-5 mb-6 ${enabled ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
      {/* Fila principal: título + toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className={`font-semibold ${enabled ? "text-green-800" : "text-gray-700"}`}>
            {enabled ? "Sistema de afiliados activo" : "Sistema de afiliados desactivado"}
          </p>
          <p className={`text-sm mt-0.5 ${enabled ? "text-green-600" : "text-gray-400"}`}>
            {enabled
              ? "Otras personas pueden postularse como vendedores"
              : "Activalo para que otros puedan vender en tu tienda"}
          </p>
        </div>
        <button
          onClick={() => save(!enabled, rate)}
          disabled={saving}
          className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors disabled:opacity-60 ${
            enabled ? "bg-green-500" : "bg-gray-300"
          }`}
          style={{ width: "52px" }}
        >
          {saving
            ? <Loader2 className="h-4 w-4 animate-spin text-white absolute left-1/2 -translate-x-1/2" />
            : <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`} />
          }
        </button>
      </div>

      {/* Slider de comisión — solo cuando está activo */}
      {enabled && (
        <div className="mt-4 pt-4 border-t border-green-200">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-green-800">Comisión por venta</label>
            <span className="text-lg font-bold text-green-700">{rate}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="50"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            onMouseUp={() => save(true, rate)}
            onTouchEnd={() => save(true, rate)}
            className="w-full accent-green-600"
          />
          <div className="flex justify-between text-xs text-green-600 mt-1">
            <span>1%</span>
            <span className="text-green-700">Venta $10.000 → afiliado cobra ${(10000 * rate / 100).toLocaleString("es-AR")}</span>
            <span>50%</span>
          </div>
        </div>
      )}
    </div>
  );
}
