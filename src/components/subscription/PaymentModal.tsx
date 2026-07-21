"use client";

import { useEffect, useState } from "react";
import { Loader2, X, CheckCircle, Ticket, Lock, ArrowLeft, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

/**
 * Ojo: este modal NO recibe el importe.
 *
 * Antes lo recibía como prop y cada pantalla mandaba el suyo. La página de
 * precios calculaba un total con descuento por los días no usados, lo mostraba
 * acá, y el endpoint de cobro —que nunca se enteraba de ese descuento— le cobraba
 * el precio de lista. La persona veía $200.000 y le llegaban $225.000.
 *
 * Ahora el importe lo pide el propio modal al servidor, al mismo lugar que después
 * hace el cobro. Ninguna pantalla puede prometer un precio distinto al real,
 * aunque se equivoque.
 */
type Props = {
  plan: "OWNER_BASIC" | "OWNER_PREMIUM" | "AFFILIATE";
  billing: "MONTHLY" | "ANNUAL";
  onClose: () => void;
  onSuccess: () => void;
};

type Cotizacion = {
  destino: { plan: string; billing: string };
  precioLista: number;
  credito: number;
  aPagar: number;
  diasRestantes: number;
};

interface SubscriptionCoupon {
  id: string;
  code: string;
  discountValue: number;
  level: string;
  earnedMonth: string;
}

function money(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

export default function PaymentModal({ plan, billing, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [availableCoupon, setAvailableCoupon] = useState<SubscriptionCoupon | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<SubscriptionCoupon | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [errorCotizacion, setErrorCotizacion] = useState(false);

  const amount = cotizacion?.aPagar ?? 0;
  // El mismo orden que usa el servidor: primero se descuentan los días no usados
  // y el porcentaje del cupón se aplica sobre lo que queda. Si acá fuera al revés,
  // el total mostrado volvería a no coincidir con el cobrado.
  const discount = appliedCoupon ? Math.round(amount * appliedCoupon.discountValue / 100) : 0;
  const finalAmount = amount - discount;
  const isFreeMonth = cotizacion !== null && finalAmount === 0;

  useEffect(() => {
    fetch("/api/vendedoras/premios")
      .then((r) => r.json())
      .then((data) => {
        type RawCoupon = SubscriptionCoupon & { type: string; status: string };
        const sub = (data.cupones ?? []).find(
          (c: RawCoupon) => c.type === "SUBSCRIPTION" && c.status === "AVAILABLE"
        );
        if (sub) setAvailableCoupon(sub);
      })
      .catch(() => {});
  }, []);

  // El precio real, del servidor. Hasta que llega, el botón de pagar no se
  // habilita: es preferible una espera de un segundo a mostrar un número que
  // después no sea el que se cobra.
  useEffect(() => {
    let vigente = true;
    fetch("/api/suscripcion/cotizar")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("cotizar"))))
      .then((data: { cotizaciones: Cotizacion[] }) => {
        if (!vigente) return;
        const match = data.cotizaciones?.find(
          (c) => c.destino.plan === plan && c.destino.billing === billing
        );
        if (match) setCotizacion(match);
        else setErrorCotizacion(true);
      })
      .catch(() => { if (vigente) setErrorCotizacion(true); });
    return () => { vigente = false; };
  }, [plan, billing]);

  async function handlePay() {
    // Guard síncrono: el `disabled` del botón llega recién en el re-render, así
    // que un doble click rápido dispara dos veces sin esto.
    if (loading || !cotizacion) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/suscripcion/preferencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing, rewardCouponCode: appliedCoupon?.code ?? null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al iniciar el pago"); return; }
      if (data.free) { setSuccess(true); setTimeout(onSuccess, 2000); return; }
      setCheckoutUrl(data.checkoutUrl);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  // Los nombres que ve la gente son "Tienda Pro" y "Tienda Premium". "Básico" es
  // el valor interno del tier y no existe en ninguna pantalla ni en los Términos:
  // que apareciera justo en el modal de pago era pedirle plata por un plan que no
  // figura en ningún lado.
  const planLabel = plan === "OWNER_PREMIUM" ? "Tienda Premium" : plan === "OWNER_BASIC" ? "Tienda Pro" : "Afiliado";
  const billingLabel = billing === "MONTHLY" ? "mensual" : "anual";

  const renewalDate = (() => {
    const d = new Date();
    if (billing === "ANNUAL") d.setFullYear(d.getFullYear() + 1);
    else d.setDate(d.getDate() + 30);
    return d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  })();

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden">
          {/* Header naranja */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-black text-white mb-1">¡Suscripción activa!</h2>
            <p className="text-orange-100 text-sm">Todo listo para empezar a vender</p>
          </div>

          {/* Detalle */}
          <div className="px-6 py-5 space-y-3">
            <div className="rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                <span className="text-xs text-gray-500">Plan</span>
                <span className="text-sm font-bold text-gray-900">{planLabel}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                <span className="text-xs text-gray-500">Facturación</span>
                <span className="text-sm font-semibold text-gray-700">{billingLabel}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-xs text-gray-500">Próxima renovación</span>
                <span className="text-xs font-semibold text-emerald-700">{renewalDate}</span>
              </div>
            </div>

            <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              Confirmación enviada a tu email
            </p>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Redirigiendo al panel...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla QR
  if (checkoutUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100/90 backdrop-blur-md p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <button onClick={() => setCheckoutUrl(null)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </button>
            <span className="text-sm font-bold text-gray-900">{money(finalAmount)}</span>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <X className="h-3.5 w-3.5 text-gray-500" />
            </button>
          </div>

          <div className="px-6 pt-5 pb-2 text-center">
            <p className="text-sm font-semibold text-gray-800 mb-1">Escaneá para pagar desde tu celular</p>
            <p className="text-xs text-gray-400 mb-5">O continuá desde esta pantalla</p>
            <div className="flex justify-center mb-5">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 inline-block">
                <QRCodeSVG value={checkoutUrl} size={160} bgColor="#f9fafb" fgColor="#1e293b" level="M" />
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">o</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <a
              href={checkoutUrl}
              className="flex items-center justify-center w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors"
            >
              Pagar en esta ventana
            </a>
            <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
              <Lock className="h-3 w-3" /> Mercado Pago
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla principal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100/90 backdrop-blur-md p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Suscripción</p>
            <h2 className="text-base font-bold text-gray-900">{planLabel} · {billingLabel}</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="h-3.5 w-3.5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Cupón disponible */}
          {availableCoupon && !appliedCoupon && (
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-amber-500 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">
                    {availableCoupon.discountValue === 100 ? "Mes gratis disponible" : `${availableCoupon.discountValue}% off disponible`}
                  </p>
                  <p className="text-xs text-amber-600">Premio {availableCoupon.level === "SILVER" ? "Plata" : availableCoupon.level === "GOLD" ? "Oro" : "Diamante"}</p>
                </div>
              </div>
              <button
                onClick={() => setAppliedCoupon(availableCoupon)}
                className="text-xs font-semibold text-amber-700 bg-amber-200 hover:bg-amber-300 px-3 py-1 rounded-lg transition-colors"
              >
                Aplicar
              </button>
            </div>
          )}

          {appliedCoupon && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="text-xs font-semibold text-emerald-800">
                  {isFreeMonth ? "Este mes es gratis" : `Descuento de ${money(discount)} aplicado`}
                </p>
              </div>
              <button onClick={() => setAppliedCoupon(null)} className="text-xs text-gray-400 hover:text-gray-600">Quitar</button>
            </div>
          )}

          {/* Resumen. Cada línea es una resta que se puede seguir con el dedo:
              precio de lista, lo que ya pagó, el cupón, y el total. */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            {errorCotizacion ? (
              <div className="px-4 py-5 text-center">
                <p className="text-sm text-gray-600">No pudimos calcular el precio.</p>
                <p className="mt-1 text-xs text-gray-400">Cerrá y volvé a intentar en un momento.</p>
              </div>
            ) : !cotizacion ? (
              <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Calculando tu precio…
              </div>
            ) : (
              <>
                <div className="px-4 py-3 flex justify-between text-sm">
                  <span className="text-gray-500">{planLabel} {billingLabel}</span>
                  <span className="text-gray-900 font-medium">{money(cotizacion.precioLista)}</span>
                </div>

                {cotizacion.credito > 0 && (
                  <div className="px-4 py-3 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600">Días que ya pagaste</span>
                      <span className="text-emerald-600 font-medium">−{money(cotizacion.credito)}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      Te quedaban {cotizacion.diasRestantes} {cotizacion.diasRestantes === 1 ? "día" : "días"} de tu
                      plan anterior y te los descontamos.
                    </p>
                  </div>
                )}

                {appliedCoupon && discount > 0 && (
                  <div className="px-4 py-3 flex justify-between text-sm border-t border-gray-100">
                    <span className="text-emerald-600">Cupón {appliedCoupon.code}</span>
                    <span className="text-emerald-600 font-medium">−{money(discount)}</span>
                  </div>
                )}

                <div className="px-4 py-3 flex justify-between border-t border-gray-200 bg-gray-50">
                  <span className="text-sm font-semibold text-gray-900">Total a pagar hoy</span>
                  <span className="text-sm font-bold text-gray-900">{isFreeMonth ? "Sin cargo" : money(finalAmount)}</span>
                </div>
              </>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="button"
            // Sin cotización no se puede pagar: es lo que impide arrancar un
            // cobro sin haberle mostrado antes cuánto es.
            disabled={loading || !cotizacion}
            onClick={handlePay}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Procesando..." : isFreeMonth ? "Activar mes gratis" : `Continuar — ${money(finalAmount)}`}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Pago seguro vía Mercado Pago
          </div>
        </div>
      </div>
    </div>
  );
}
