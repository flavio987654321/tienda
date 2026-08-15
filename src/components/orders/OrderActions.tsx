"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
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
  // `router.refresh()` vuelve a pedir el Server Component, y eso tarda. Con
  // `useTransition` sabemos cuándo terminó de aplicarse: sin esto la carga se
  // apagaba al responder el PATCH y la tarjeta seguía mostrando el estado viejo
  // con el botón ya habilitado — justo el momento en que uno vuelve a clickear.
  const [refrescando, startTransition] = useTransition();

  // Candado contra el doble click. `disabled={loading}` NO alcanza: `loading` es
  // estado, o sea que recién bloquea en el render siguiente, y dos clicks
  // rápidos entran los dos. Y el servidor tampoco salva — las dos peticiones
  // leen el mismo estado dentro de sus transacciones antes de que ninguna
  // comprometa, así que las dos pasan la validación de transición y al
  // comprador le llegan dos mails del mismo envío. Un ref cambia en el acto.
  const enviando = useRef(false);

  const ocupado = loading || refrescando;

  const isMPApproved = paymentProvider === "mp" && paymentStatus === "APPROVED";

  async function run(action: string) {
    if (enviando.current) return;
    enviando.current = true;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/pedidos/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, trackingCode }),
      });
      const data = await res.json();
      // El panel de confirmación se cierra recién acá, con la respuesta en la
      // mano. Antes se cerraba al arrancar, y como el spinner vive adentro de
      // ese panel, no se llegaba a ver nunca.
      setConfirm(null);
      if (!res.ok) { setError(data.error || "No se pudo actualizar"); return; }
      startTransition(() => router.refresh());
    } catch {
      setConfirm(null);
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      enviando.current = false;
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
            disabled={ocupado}
            className="flex-1 rounded-lg bg-gray-900 hover:bg-gray-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
          >
            {ocupado ? <><Loader2 className="h-3 w-3 animate-spin" /> Guardando…</> : "Sí, confirmar"}
          </button>
          <button
            onClick={() => setConfirm(null)}
            disabled={ocupado}
            className="flex-1 rounded-lg bg-gray-100 hover:bg-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            No, volver
          </button>
        </div>
      </div>
    );
  }

  // Mientras se guarda y hasta que la tarjeta se redibuja con el estado nuevo,
  // todos los botones muestran lo mismo. Es el tramo en el que la pantalla
  // todavía miente: dice "Enviado" cuando el pedido ya se entregó.
  const rotulo = (texto: string) =>
    ocupado ? <><Loader2 className="h-3 w-3 animate-spin" /> Actualizando…</> : texto;

  return (
    <div className="space-y-2 min-w-[180px]">
      {error && <p className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">{error}</p>}

      {status === "PENDING" && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setConfirm("confirmPayment")}
            disabled={ocupado}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {rotulo(isMPApproved ? "Pasar a preparación" : "Confirmar pago recibido")}
          </button>
          <button
            onClick={() => setConfirm("cancel")}
            disabled={ocupado}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-200 px-3 py-2 text-xs font-semibold text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {status === "CONFIRMED" && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setConfirm("markShipped")}
            disabled={ocupado}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {rotulo("Marcar enviado")}
          </button>
          <button
            onClick={() => setConfirm("cancel")}
            disabled={ocupado}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-200 px-3 py-2 text-xs font-semibold text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancelar pedido
          </button>
        </div>
      )}

      {status === "SHIPPED" && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setConfirm("markDelivered")}
            disabled={ocupado}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-950 hover:bg-gray-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {rotulo("Marcar entregado")}
          </button>
          <button
            onClick={() => setConfirm("updateTracking")}
            disabled={ocupado}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 border border-transparent hover:border-indigo-200 px-3 py-2 text-xs font-semibold text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Actualizar tracking
          </button>
        </div>
      )}
    </div>
  );
}
