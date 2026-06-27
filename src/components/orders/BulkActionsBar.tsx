"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle, X } from "lucide-react";
import { useBulkOrders } from "./BulkOrdersContext";
import { ORDER_ACTION_TRANSITIONS, BULK_ORDER_ACTIONS, BULK_ACTION_LABEL, type BulkOrderAction } from "@/lib/orders";

const BULK_CONFIRM_QUESTION: Record<BulkOrderAction, (count: number) => string> = {
  confirmPayment: (n) => `¿Confirmar el pago de ${n} pedido(s)?`,
  markShipped:    (n) => `¿Marcar ${n} pedido(s) como enviado(s)?`,
  markDelivered:  (n) => `¿Marcar ${n} pedido(s) como entregado(s)?`,
  cancel:         (n) => `¿Cancelar ${n} pedido(s)?`,
};

const BULK_CONFIRM_NOTE: Record<BulkOrderAction, string> = {
  confirmPayment: "Se va a marcar el pago como recibido y pasarán a preparación.",
  markShipped:    "Se va a avisar a cada comprador que su pedido fue enviado.",
  markDelivered:  "Se va a marcar como entregado al comprador.",
  cancel:         "Se va a cancelar y restaurar el stock de cada pedido automáticamente.",
};

export default function BulkActionsBar() {
  const router = useRouter();
  const { active, orders, selected, selectAll, clearSelection } = useBulkOrders();
  const [pendingAction, setPendingAction] = useState<BulkOrderAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  if (!active || selected.size === 0) return null;

  const statusById = new Map(orders.map((o) => [o.id, o.status]));
  const eligibleIdsFor = (action: BulkOrderAction) =>
    Array.from(selected).filter((id) => ORDER_ACTION_TRANSITIONS[action].includes(statusById.get(id) ?? ""));

  const availableActions = BULK_ORDER_ACTIONS.filter((action) => eligibleIdsFor(action).length > 0);

  async function runBulkAction(action: BulkOrderAction) {
    const eligibleIds = eligibleIdsFor(action);
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/pedidos/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: eligibleIds, action }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "No se pudo procesar la selección"); setLoading(false); return; }

      setToast(
        data.failed > 0
          ? `${data.succeeded} pedido(s) actualizados, ${data.failed} con error.`
          : `${data.succeeded} pedido(s) actualizados.`
      );
      setTimeout(() => setToast(""), 4000);
      setPendingAction(null);
      clearSelection();
      router.refresh();
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-fade-slide">
          <div className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {toast}
          </div>
        </div>
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-5xl px-4 pt-3 sm:px-6">
          {pendingAction ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                <p className="text-sm font-medium leading-snug text-amber-800">
                  {BULK_CONFIRM_QUESTION[pendingAction](eligibleIdsFor(pendingAction).length)}{" "}
                  {BULK_CONFIRM_NOTE[pendingAction]}
                  {eligibleIdsFor(pendingAction).length < selected.size && (
                    <> {selected.size - eligibleIdsFor(pendingAction).length} de los seleccionados no están en el estado correcto y se van a omitir.</>
                  )}
                </p>
              </div>
              {error && <p className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">{error}</p>}
              <div className="flex gap-2 pb-1">
                <button
                  onClick={() => runBulkAction(pendingAction)}
                  disabled={loading}
                  className="flex-1 sm:flex-none rounded-xl bg-gray-900 hover:bg-gray-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sí, confirmar"}
                </button>
                <button
                  onClick={() => { setPendingAction(null); setError(""); }}
                  disabled={loading}
                  className="flex-1 sm:flex-none rounded-xl bg-gray-100 hover:bg-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors"
                >
                  No, volver
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <span className="text-sm font-semibold text-gray-700 mr-1">
                {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
              </span>
              <button
                onClick={selectAll}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 mr-auto"
              >
                Seleccionar todos ({orders.length})
              </button>
              {availableActions.map((action) => {
                const count = eligibleIdsFor(action).length;
                return (
                  <button
                    key={action}
                    onClick={() => setPendingAction(action)}
                    className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {BULK_ACTION_LABEL[action]} ({count})
                  </button>
                );
              })}
              <button
                onClick={clearSelection}
                className="flex items-center gap-1 rounded-xl px-2.5 py-2 text-sm font-semibold text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" /> Limpiar
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Espaciador para que la barra fija no tape el último pedido de la lista */}
      <div className="h-20" aria-hidden />
    </>
  );
}
