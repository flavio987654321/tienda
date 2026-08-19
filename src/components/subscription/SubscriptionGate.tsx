"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Clock, CreditCard } from "lucide-react";
import PaymentModal from "./PaymentModal";
import { useAuth } from "@/components/AuthProvider";
import { useIsPwa } from "@/hooks/useIsPwa";

type Props = {
  status: "TRIAL" | "ACTIVE" | "GRACE" | "EXPIRED" | "CANCELLED";
  daysLeft: number;
  role: "OWNER";
  tier: "BASIC" | "PREMIUM";
  plan: "MONTHLY" | "ANNUAL";
};

// Esta pantalla sólo se usa para OWNER — el plan de afiliados es gratuito y no tiene gate
export default function SubscriptionGate({ status, daysLeft, tier, plan }: Props) {
  const planKey = tier === "PREMIUM" ? "OWNER_PREMIUM" : "OWNER_BASIC";
  const [payModal, setPayModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { signOut } = useAuth();
  // Adentro de la app instalada esta tapa no puede ofrecer salidas del `scope`.
  const inPwa = useIsPwa();
  const pathname = usePathname();
  const showBanner = pathname === "/dashboard" || pathname === "/dashboard/mi-plan";

  // Suscripción activa — no mostrar nada
  if (status === "ACTIVE" && daysLeft > 3) return null;

  // Suscripción activa próxima a vencer — banner suave
  if (status === "ACTIVE" && daysLeft <= 3) {
    if (!showBanner) return null;
    return (
      <>
        <div className="mx-4 mt-4 rounded-2xl border border-yellow-300 bg-yellow-50 text-yellow-800 px-4 py-3 flex items-center gap-3 text-sm">
          <Clock className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            Tu suscripción vence en {daysLeft === 0 ? "menos de 24 hs" : `${daysLeft} día${daysLeft !== 1 ? "s" : ""}`}. Renovála para no perder el acceso.
          </span>
          <button
            onClick={() => setPayModal(true)}
            className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-yellow-200 hover:bg-yellow-300 text-yellow-900 transition-colors"
          >
            Renovar
          </button>
        </div>
        {payModal && (
          <PaymentModal
            plan={planKey}
            billing={plan}
            onClose={() => setPayModal(false)}
            onSuccess={() => { setPayModal(false); window.location.reload(); }}
          />
        )}
      </>
    );
  }

  // Trial o gracia con días restantes — mostrar banner
  if ((status === "TRIAL" || status === "GRACE") && daysLeft > 0) {
    if (!showBanner) return null;
    const isGrace = status === "GRACE";
    return (
      <>
        <div className={`mx-4 mt-4 rounded-2xl border px-4 py-3 flex items-center gap-3 text-sm ${
          isGrace
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}>
          <Clock className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            {isGrace
              ? `Tu suscripción venció. Tenés ${daysLeft} día${daysLeft !== 1 ? "s" : ""} de gracia para renovar.`
              : `Tu período de prueba vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}.`}
          </span>
          <button
            onClick={() => setPayModal(true)}
            className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
              isGrace
                ? "bg-red-100 hover:bg-red-200 text-red-800"
                : "bg-amber-200 hover:bg-amber-300 text-amber-900"
            }`}
          >
            Suscribirme
          </button>
        </div>

        {payModal && (
          <PaymentModal
            plan={planKey}
            billing={plan}
            onClose={() => setPayModal(false)}
            onSuccess={() => { setPayModal(false); window.location.reload(); }}
          />
        )}
      </>
    );
  }

  // Expirada — bloquear con modal
  if (status === "EXPIRED" || status === "CANCELLED") {
    // "Venció" y "la cancelaste" no son lo mismo, y decirle a alguien que se le
    // venció algo que dio de baja a propósito suena a error del sistema. Se
    // separan los textos: el estado CANCELLED solo llega acá cuando ya no le
    // quedan días pagos (si le quedaran, reactivar la habría devuelto a ACTIVE).
    const cancelada = status === "CANCELLED";
    return (
      <>
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-100/90 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 max-w-sm w-full text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {cancelada ? "Tu suscripción está dada de baja" : "Tu suscripción venció"}
            </h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              {cancelada
                ? "Para volver a usar la plataforma necesitás suscribirte de nuevo. Tus datos y tu configuración están guardados tal cual los dejaste."
                : "Renová para seguir usando la plataforma. Tus datos y configuración están guardados."}
            </p>

            <button
              onClick={() => setPayModal(true)}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors mb-3"
            >
              <CreditCard className="h-4 w-4" />
              {cancelada ? "Suscribirme de nuevo" : "Renovar suscripción"}
            </button>

            {/* "Volver al inicio" es la home comercial, o sea fuera del `scope`.
                Y esta tapa cubre la pantalla ENTERA, así que en la app instalada
                era casi lo único que se podía tocar: se te vence la suscripción y
                el botón que tenés a mano te saca del panel a la página de ventas,
                sin barra de direcciones y sin forma de volver.
                Adentro de la app no se muestra. Queda "Cerrar sesión", que lleva
                al login del propio panel — un lugar del que sí se puede volver. */}
            {!inPwa && (
              <Link href="/" className="block text-sm text-gray-400 hover:text-gray-600 transition-colors mb-3">
                Volver al inicio
              </Link>
            )}
            <button
              onClick={() => { if (!signingOut) { setSigningOut(true); signOut(inPwa ? "/dashboard" : "/"); } }}
              disabled={signingOut}
              className="text-sm text-red-400 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {payModal && (
          <PaymentModal
            plan={planKey}
            billing={plan}
            onClose={() => setPayModal(false)}
            onSuccess={() => { setPayModal(false); window.location.reload(); }}
          />
        )}
      </>
    );
  }

  return null;
}
