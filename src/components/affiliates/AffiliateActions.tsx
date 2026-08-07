"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, PauseCircle, Play, Trash2, X } from "lucide-react";
// El diálogo vivía acá adentro, así que el resto del panel siguió usando el
// `confirm()` del navegador. Ahora es compartido — y de paso queda arriba de la
// barra del teléfono, que con el `z-50` que tenía le tapaba el título.
import ConfirmModal from "@/components/ConfirmModal";

export default function AffiliateActions({
  affiliateId,
  status,
  affiliateName,
  walletBalance = 0,
}: {
  affiliateId: string;
  status: string;
  affiliateName?: string;
  walletBalance?: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"pause" | "remove" | null>(null);

  const name = affiliateName || "esta afiliada";
  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;
  const hasPendingBalance = walletBalance > 0;

  async function run(action: "approve" | "reject" | "deactivate" | "reactivate" | "remove") {
    setModal(null);
    setLoading(action);
    setError("");
    try {
      const res = await fetch(`/api/vendedoras/${affiliateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo actualizar la solicitud");
        return;
      }
      router.refresh();
    } catch {
      setError("Error de conexión. Verificá tu internet e intentá de nuevo.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {status === "PENDING" && (
        <div className="space-y-2.5">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-800 leading-relaxed space-y-1">
            <p className="font-semibold">¿Qué pasa si aprobás a {name}?</p>
            <ul className="space-y-0.5 text-blue-700">
              <li>• Podrá compartir tus productos con un link propio y cobrar comisión por cada venta.</li>
              <li>• Podrá crear un catálogo en WhatsApp Business o Facebook con tus fotos y precios. <strong>No puede modificarlos</strong> — siempre se muestran los valores reales de tu tienda.</li>
              <li>• Si la das de baja, su link y catálogo se desactivan en menos de 24 hs. Todas las ventas siguen llegando a vos.</li>
            </ul>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => run("approve")} disabled={Boolean(loading)}
              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
              {loading === "approve" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Aprobar
            </button>
            <button type="button" onClick={() => run("reject")} disabled={Boolean(loading)}
              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50">
              {loading === "reject" ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              Rechazar
            </button>
          </div>
        </div>
      )}

      {status === "APPROVED" && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setModal("pause")} disabled={Boolean(loading)}
            className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 disabled:opacity-50">
            {loading === "deactivate" ? <Loader2 className="h-3 w-3 animate-spin" /> : <PauseCircle className="h-3 w-3" />}
            {loading === "deactivate" ? "Pausando..." : "Pausar"}
          </button>
          <button type="button" onClick={() => setModal("remove")} disabled={Boolean(loading)}
            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50">
            {loading === "remove" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            {loading === "remove" ? "Dando de baja..." : "Dar de baja"}
          </button>
        </div>
      )}

      {status === "PAUSED" && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => run("reactivate")} disabled={Boolean(loading)}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
            {loading === "reactivate" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            {loading === "reactivate" ? "Reactivando..." : "Reactivar"}
          </button>
          <button type="button" onClick={() => setModal("remove")} disabled={Boolean(loading)}
            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50">
            {loading === "remove" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            {loading === "remove" ? "Dando de baja..." : "Dar de baja"}
          </button>
        </div>
      )}

      {status === "REJECTED" && (
        <button type="button" onClick={() => run("remove")} disabled={Boolean(loading)}
          className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-500 disabled:opacity-50">
          {loading === "remove" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          {loading === "remove" ? "Quitando..." : "Quitar de lista"}
        </button>
      )}

      {status === "REMOVED" && (
        <button type="button" onClick={() => run("reactivate")} disabled={Boolean(loading)}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {loading === "reactivate" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          {loading === "reactivate" ? "Reincorporando..." : "Reincorporar"}
        </button>
      )}

      {modal === "pause" && (
        <ConfirmModal
          title={`¿Pausar a ${name}?`}
          body={
            <div className="space-y-2">
              <p>Su link de afiliada dejará de funcionar hasta que la reactives.</p>
              {hasPendingBalance && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-amber-800 text-xs font-medium">
                  ⚠️ Tiene <strong>{fmt(walletBalance)}</strong> en comisiones pendientes de retiro. Pausarla no cancela ese saldo — seguís debiéndoselo.
                </div>
              )}
            </div>
          }
          confirmLabel="Sí, pausar"
          confirmClass="bg-gray-600 hover:bg-gray-500"
          onConfirm={() => run("deactivate")}
          onCancel={() => setModal(null)}
        />
      )}

      {modal === "remove" && (
        <ConfirmModal
          title={`¿Dar de baja a ${name}?`}
          body={
            <div className="space-y-2">
              <p>Su link quedará desactivado y no podrá postularse de nuevo a menos que la reincorpores.</p>
              {hasPendingBalance && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-red-800 text-xs font-medium">
                  ⚠️ Tiene <strong>{fmt(walletBalance)}</strong> en comisiones pendientes de retiro. Dar de baja no cancela ese saldo — seguís debiéndoselo.
                </div>
              )}
            </div>
          }
          confirmLabel="Sí, dar de baja"
          confirmClass="bg-red-600 hover:bg-red-500"
          onConfirm={() => run("remove")}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
