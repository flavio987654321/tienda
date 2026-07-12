"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, X, ArrowRight } from "lucide-react";
import Link from "next/link";

type SubInfo = { planLabel: string; billing: string; renewalDate: string } | null;

export default function SubscriptionSuccessBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // El banner se muestra según el query param — se deriva en el estado inicial
  // en vez de con un setState sincrónico en el efecto. El efecto solo limpia la
  // URL y trae el detalle (fetch async), sin setState sincrónico.
  const showFromUrl = searchParams.get("suscripcion") === "ok";
  const [show, setShow] = useState(showFromUrl);
  const [sub, setSub] = useState<SubInfo>(null);

  useEffect(() => {
    if (!showFromUrl) return;

    // Limpiar query param sin recargar
    const url = new URL(window.location.href);
    url.searchParams.delete("suscripcion");
    router.replace(url.pathname + url.search, { scroll: false });

    // Traer datos de la suscripción para mostrar el detalle
    fetch("/api/suscripcion/estado")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const s = data?.subscription;
        if (!s) return;
        const planLabel =
          s.tier === "PREMIUM" ? "Tienda Premium" :
          s.role === "OWNER" ? "Tienda Pro" : "Afiliado";
        const billing = s.plan === "ANNUAL" ? "Anual" : "Mensual";
        const renewalDate = s.currentPeriodEnd
          ? new Date(s.currentPeriodEnd).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
          : null;
        setSub({ planLabel, billing, renewalDate: renewalDate ?? "" });
      })
      .catch(() => {});
  }, [showFromUrl, router]);

  if (!show) return null;

  return (
    <div className="mx-4 mt-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-4">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-emerald-800">¡Pago confirmado! Tu suscripción está activa</p>
          {sub ? (
            <p className="text-xs text-emerald-600 mt-0.5">
              <span className="font-semibold">{sub.planLabel}</span> · {sub.billing}
              {sub.renewalDate && <> · Renueva el <span className="font-semibold">{sub.renewalDate}</span></>}
            </p>
          ) : (
            <p className="text-xs text-emerald-600 mt-0.5">Gracias por confiar en TiendaApps. Te enviamos la confirmación por email.</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/mi-plan"
            className="text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
            Mi plan <ArrowRight className="h-3 w-3" />
          </Link>
          <button
            onClick={() => setShow(false)}
            className="text-emerald-400 hover:text-emerald-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
