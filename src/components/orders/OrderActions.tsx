"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function OrderActions({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [error, setError] = useState("");

  async function run(action: string) {
    setLoading(action);
    setError("");

    const res = await fetch(`/api/pedidos/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, trackingCode }),
    });

    const data = await res.json();
    setLoading(null);

    if (!res.ok) {
      setError(data.error || "No se pudo actualizar");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-2">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      {status === "PENDING" && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => run("confirmPayment")} disabled={Boolean(loading)} className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
            {loading === "confirmPayment" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmar pago"}
          </button>
          <button type="button" onClick={() => run("cancel")} disabled={Boolean(loading)} className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 disabled:opacity-50">
            Cancelar
          </button>
        </div>
      )}
      {status === "CONFIRMED" && (
        <div className="flex flex-col gap-2">
          <input value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} placeholder="Codigo de seguimiento" className="rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
          <button type="button" onClick={() => run("markShipped")} disabled={Boolean(loading)} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
            {loading === "markShipped" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Marcar enviado"}
          </button>
        </div>
      )}
      {status === "SHIPPED" && (
        <button type="button" onClick={() => run("markDelivered")} disabled={Boolean(loading)} className="rounded-lg bg-gray-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {loading === "markDelivered" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Marcar entregado"}
        </button>
      )}
    </div>
  );
}
