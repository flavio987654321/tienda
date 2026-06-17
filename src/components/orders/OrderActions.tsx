"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

type Props = {
  orderId: string;
  status: string;
  trackingCode?: string | null;
  paymentProvider?: string | null;
  paymentStatus?: string | null;
};

const CONFIRM_MSG: Record<string, string> = {
  confirmPayment: "¿Confirmás que recibiste el pago y el pedido pasa a preparación?",
  markShipped:    "¿Marcás el pedido como enviado? Se le avisará al comprador.",
  markDelivered:  "¿El pedido fue entregado correctamente al comprador?",
  cancel:         "¿Cancelás este pedido? Se restaurará el stock automáticamente.",
  updateTracking: "Actualizá el código de seguimiento del envío.",
};

export default function OrderActions({ orderId, status, trackingCode: initialTracking, paymentProvider, paymentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading]       = useState(false);
  const [confirm, setConfirm]       = useState<string | null>(null);
  const [trackingCode, setTracking] = useState(initialTracking ?? "");
  const [error, setError]           = useState("");

  const isMPApproved = paymentProvider === "mp" && paymentStatus === "APPROVED";

  async function run(action: string) {
    setLoading(true);
    setConfirm(null);
    setError("");
    try {
      const res = await fetch(`/api/pedidos/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, trackingCode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "No se pudo actualizar"); return; }
      router.refresh();
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (confirm) {
    return (
      <div className="flex flex-col gap-2 min-w-[220px]">
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 font-medium leading-snug">{CONFIRM_MSG[confirm]}</p>
        </div>
        {(confirm === "markShipped" || confirm === "updateTracking") && (
          <input
            value={trackingCode}
            onChange={e => setTracking(e.target.value)}
            placeholder={confirm === "updateTracking" ? "Nuevo código de seguimiento" : "Código de seguimiento (opcional)"}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}
        <div className="flex gap-2">
          <button
            onClick={() => run(confirm)}
            disabled={loading}
            className="flex-1 rounded-lg bg-gray-900 hover:bg-gray-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sí, confirmar"}
          </button>
          <button
            onClick={() => setConfirm(null)}
            disabled={loading}
            className="flex-1 rounded-lg bg-gray-100 hover:bg-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors"
          >
            No, volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 min-w-[180px]">
      {error && <p className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">{error}</p>}

      {status === "PENDING" && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setConfirm("confirmPayment")}
            disabled={loading}
            className="rounded-lg bg-green-600 hover:bg-green-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-colors"
          >
            {isMPApproved ? "Pasar a preparación" : "Confirmar pago recibido"}
          </button>
          <button
            onClick={() => setConfirm("cancel")}
            disabled={loading}
            className="rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-200 px-3 py-2 text-xs font-semibold text-gray-600 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {status === "CONFIRMED" && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setConfirm("markShipped")}
            disabled={loading}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-colors"
          >
            Marcar enviado
          </button>
          <button
            onClick={() => setConfirm("cancel")}
            disabled={loading}
            className="rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-200 px-3 py-2 text-xs font-semibold text-gray-600 disabled:opacity-50 transition-colors"
          >
            Cancelar pedido
          </button>
        </div>
      )}

      {status === "SHIPPED" && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setConfirm("markDelivered")}
            disabled={loading}
            className="rounded-lg bg-gray-950 hover:bg-gray-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-colors"
          >
            Marcar entregado
          </button>
          <button
            onClick={() => setConfirm("updateTracking")}
            disabled={loading}
            className="rounded-lg bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 border border-transparent hover:border-indigo-200 px-3 py-2 text-xs font-semibold text-gray-600 disabled:opacity-50 transition-colors"
          >
            Actualizar tracking
          </button>
        </div>
      )}
    </div>
  );
}
