"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, X, ShoppingBag, HeartHandshake, Loader2 } from "lucide-react";
import { CAPAS } from "@/lib/capas-tienda";

export default function StorefrontPaymentSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Los datos del pago se derivan del query param en el estado inicial (no con un
  // setState sincrónico en el efecto). El efecto solo limpia la URL (sin setState).
  const pagoOk = searchParams.get("pago") === "ok";
  const [orderId, setOrderId] = useState<string | null>(pagoOk ? searchParams.get("orden") : null);
  // Sin el setter a propósito: el `useState` acá NO es para cambiar el valor, es para
  // CONGELARLO. El efecto de abajo limpia la URL, así que `searchParams` deja de
  // tener `donacionId` — con una constante derivada el id se volvería null justo
  // después de montar y se cortaría el flujo de la donación. El estado guarda el
  // valor que había al abrir.
  const [donationId] = useState<string | null>(pagoOk ? searchParams.get("donacionId") : null);
  const [donationPaying, setDonationPaying] = useState(false);
  const [donationError, setDonationError] = useState("");

  useEffect(() => {
    if (!pagoOk) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("pago");
    url.searchParams.delete("orden");
    url.searchParams.delete("donacionId");
    router.replace(url.pathname + url.search, { scroll: false });
  }, [pagoOk, router]);

  async function payDonation() {
    if (donationPaying || !donationId) return;
    setDonationPaying(true);
    setDonationError("");
    try {
      const res = await fetch("/api/canasta/donation-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donationId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.checkoutUrl) throw new Error(data.error || "No se pudo iniciar el pago de la donación");
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setDonationError(e instanceof Error ? e.message : "No se pudo iniciar el pago de la donación");
      setDonationPaying(false);
    }
  }

  if (!orderId) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 px-4" style={{ zIndex: CAPAS.modal }}>
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <button
          onClick={() => setOrderId(null)}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle className="h-9 w-9 text-emerald-500" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900">¡Compra realizada!</h2>
            <p className="mt-1 text-sm text-gray-500">
              Tu pedido fue registrado. Te enviamos un email con el resumen. El vendedor te contactará para coordinar el envío.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2">
            <ShoppingBag className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="text-xs text-gray-500">
              N° de orden: <span className="font-mono font-semibold text-gray-700">{orderId.slice(-8).toUpperCase()}</span>
            </span>
          </div>

          <p className="text-xs text-gray-400 text-center leading-relaxed">
            ¿Algún problema? Respondé el email de confirmación o contactá al vendedor directamente.
            Tenés <strong>10 días corridos</strong> para solicitar cancelación (Ley 24.240).
          </p>

          {donationId && (
            <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-left">
              <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5 mb-1">
                <HeartHandshake className="h-4 w-4" /> Te falta completar tu donación
              </p>
              <p className="text-xs text-amber-700 mb-2">Es un pago aparte, no afecta tu compra recién confirmada.</p>
              <button
                onClick={payDonation}
                disabled={donationPaying}
                className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 py-2 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
              >
                {donationPaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartHandshake className="h-4 w-4" />}
                {donationPaying ? "Redirigiendo..." : "Completar donación"}
              </button>
              {donationError && <p className="text-xs text-red-600 mt-1.5">{donationError}</p>}
            </div>
          )}

          <button
            onClick={() => setOrderId(null)}
            className="mt-1 w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
          >
            Continuar comprando
          </button>
        </div>
      </div>
    </div>
  );
}
