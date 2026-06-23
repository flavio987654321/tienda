"use client";

import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";

type Props = {
  withdrawalId: string;
  affiliateName: string;
  amount: number;
  bankInfo: string;
};

export default function WithdrawalActions({ withdrawalId }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handle(action: "APPROVED" | "REJECTED") {
    setStatus("loading");
    try {
      const res = await fetch(`/api/vendedoras/withdrawals/${withdrawalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setResult(action);
      setStatus("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <span className={`rounded-full px-3 py-1 text-xs font-bold ${result === "APPROVED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
        {result === "APPROVED" ? "Aprobado" : "Rechazado"}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {status === "error" && <p className="text-xs text-red-500">{errorMsg}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => handle("APPROVED")}
          disabled={status === "loading"}
          className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-500 disabled:opacity-50"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Aprobar y pagar
        </button>
        <button
          onClick={() => handle("REJECTED")}
          disabled={status === "loading"}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          <XCircle className="h-3.5 w-3.5" />
          Rechazar
        </button>
      </div>
    </div>
  );
}
