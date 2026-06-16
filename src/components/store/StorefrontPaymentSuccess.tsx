"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, X, ShoppingBag } from "lucide-react";

export default function StorefrontPaymentSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("pago") === "ok") {
      setOrderId(searchParams.get("orden"));
      const url = new URL(window.location.href);
      url.searchParams.delete("pago");
      url.searchParams.delete("orden");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, router]);

  if (!orderId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
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
