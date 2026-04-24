"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, PauseCircle, Play, Trash2, X } from "lucide-react";

export default function AffiliateActions({ affiliateId, status }: { affiliateId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function run(action: "approve" | "reject" | "deactivate" | "reactivate" | "remove") {
    if (action === "remove" && !window.confirm("Este afiliado quedará dado de baja y perderá su link activo. ¿Querés continuar?")) {
      return;
    }

    setLoading(action);
    setError("");
    const res = await fetch(`/api/vendedoras/${affiliateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setLoading(null);

    if (!res.ok) {
      setError(data.error || "No se pudo actualizar la solicitud");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-2">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      {status === "PENDING" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => run("approve")}
            disabled={Boolean(loading)}
            className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {loading === "approve" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Aprobar
          </button>
          <button
            type="button"
            onClick={() => run("reject")}
            disabled={Boolean(loading)}
            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"
          >
            {loading === "reject" ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
            Rechazar
          </button>
        </div>
      )}
      {status === "APPROVED" && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => run("deactivate")}
            disabled={Boolean(loading)}
            className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 disabled:opacity-50"
          >
            {loading === "deactivate" ? <Loader2 className="h-3 w-3 animate-spin" /> : <PauseCircle className="h-3 w-3" />}
            {loading === "deactivate" ? "Pausando..." : "Pausar"}
          </button>
          <button
            type="button"
            onClick={() => run("remove")}
            disabled={Boolean(loading)}
            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"
          >
            {loading === "remove" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            {loading === "remove" ? "Dando de baja..." : "Dar de baja"}
          </button>
        </div>
      )}
      {status === "PAUSED" && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => run("reactivate")}
            disabled={Boolean(loading)}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {loading === "reactivate" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            {loading === "reactivate" ? "Reactivando..." : "Reactivar"}
          </button>
          <button
            type="button"
            onClick={() => run("remove")}
            disabled={Boolean(loading)}
            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"
          >
            {loading === "remove" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            {loading === "remove" ? "Dando de baja..." : "Dar de baja"}
          </button>
        </div>
      )}
      {status === "REMOVED" && (
        <button
          type="button"
          onClick={() => run("reactivate")}
          disabled={Boolean(loading)}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {loading === "reactivate" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          {loading === "reactivate" ? "Reincorporando..." : "Reincorporar"}
        </button>
      )}
    </div>
  );
}
