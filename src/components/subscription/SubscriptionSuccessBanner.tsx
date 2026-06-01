"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, X } from "lucide-react";

export default function SubscriptionSuccessBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (searchParams.get("suscripcion") === "ok") {
      setShow(true);
      // Limpiar el query param de la URL sin recargar
      const url = new URL(window.location.href);
      url.searchParams.delete("suscripcion");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, router]);

  if (!show) return null;

  return (
    <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
      <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
      <div className="flex-1">
        <p className="text-sm font-bold text-emerald-800">¡Pago confirmado!</p>
        <p className="text-xs text-emerald-600">Tu suscripción está activa. Gracias por confiar en TiendaApps.</p>
      </div>
      <button onClick={() => setShow(false)} className="shrink-0 text-emerald-400 hover:text-emerald-600 transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
