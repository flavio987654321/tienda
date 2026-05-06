"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AffiliateToggle({
  enabled,
  commissionRate,
}: {
  enabled: boolean;
  commissionRate: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const configRes = await fetch("/api/configuracion");
    const { store } = await configRes.json();
    await fetch("/api/configuracion", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...store, name: store.name || "Mi Tienda", affiliatesEnabled: !enabled }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <div className={`rounded-2xl border p-5 mb-6 flex items-center justify-between ${
      enabled ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"
    }`}>
      <div>
        <p className={`font-semibold ${enabled ? "text-green-800" : "text-yellow-800"}`}>
          {enabled ? "Sistema de afiliados activo" : "Sistema de afiliados desactivado"}
        </p>
        <p className={`text-sm mt-0.5 ${enabled ? "text-green-600" : "text-yellow-600"}`}>
          {enabled
            ? `Comisión configurada: ${commissionRate}% por venta aprobada`
            : "Activalo para que otras personas puedan postularse como vendedores"}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60 ${
          enabled
            ? "bg-green-200 text-green-800 hover:bg-green-300"
            : "bg-yellow-200 text-yellow-800 hover:bg-yellow-300"
        }`}
      >
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {enabled ? "Desactivar" : "Activar ahora"}
      </button>
    </div>
  );
}
