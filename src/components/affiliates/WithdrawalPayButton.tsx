"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";

type Props = {
  withdrawalId: string;
  amount: number;
};

export default function WithdrawalPayButton({ withdrawalId, amount }: Props) {
  const [state, setState] = useState<"idle" | "confirming" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function markAsPaid() {
    setState("loading");
    setError(null);
    try {
      const res = await fetch(`/api/vendedoras/withdrawals/${withdrawalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al procesar");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="flex items-center gap-1.5 rounded-xl bg-green-50 px-3 py-2 text-sm font-bold text-green-700">
        <CheckCircle className="h-4 w-4" />
        Pagado
      </div>
    );
  }

  if (state === "confirming") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-700">
          ¿Confirmás que transferiste{" "}
          <strong className="text-amber-700">${amount.toLocaleString("es-AR")}</strong>?
        </p>
        <div className="flex gap-2">
          <button
            onClick={markAsPaid}
            className="flex-1 rounded-xl bg-green-600 px-3 py-2 text-sm font-bold text-white hover:bg-green-700"
          >
            Sí, marcar como pagado
          </button>
          <button
            onClick={() => setState("idle")}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setState("confirming")}
        disabled={state === "loading"}
        className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
      >
        {state === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle className="h-4 w-4" />
        )}
        Marcar como pagado
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
