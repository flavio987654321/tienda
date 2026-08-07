"use client";

import { useState } from "react";
import { Loader2, AlertTriangle, X, ShieldCheck, ExternalLink, Ticket, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const TC_OWNER_VERSION = "1.0";

export default function AffiliateToggle({
  enabled,
  commissionRate: initialRate,
  acceptsRewardCoupons: initialAcceptsRewardCoupons,
  activeAffiliatesCount,
  pendingBalance,
  hasMercadoPago,
  storeType,
}: {
  enabled: boolean;
  commissionRate: number;
  acceptsRewardCoupons: boolean;
  activeAffiliatesCount: number;
  pendingBalance: number;
  hasMercadoPago: boolean;
  storeType?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [savingCoupons, setSavingCoupons] = useState(false);
  const [rate, setRate] = useState(initialRate);
  const [acceptsCoupons, setAcceptsCoupons] = useState(initialAcceptsRewardCoupons);
  const [showTcModal, setShowTcModal] = useState(false);
  const [showDisableWarning, setShowDisableWarning] = useState(false);
  const [tcAccepted, setTcAccepted] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponTcAccepted, setCouponTcAccepted] = useState(false);

  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;

  async function save(newEnabled: boolean, newRate: number) {
    setSaving(true);
    const { store } = await fetch("/api/configuracion").then((r) => r.json());
    await fetch("/api/configuracion", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...store,
        name: store.name || "Mi Tienda",
        affiliatesEnabled: newEnabled,
        commissionRate: newRate,
        tcOwnerVersion: newEnabled ? TC_OWNER_VERSION : undefined,
      }),
    });
    router.refresh();
    setSaving(false);
  }

  async function saveRewardCoupons(newValue: boolean) {
    setSavingCoupons(true);
    setAcceptsCoupons(newValue);
    const { store } = await fetch("/api/configuracion").then((r) => r.json());
    await fetch("/api/configuracion", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...store, name: store.name || "Mi Tienda", acceptsRewardCoupons: newValue }),
    });
    router.refresh();
    setSavingCoupons(false);
  }

  function handleToggle() {
    if (!enabled) {
      setTcAccepted(false);
      setShowTcModal(true);
    } else {
      if (activeAffiliatesCount > 0) {
        setShowDisableWarning(true);
      } else {
        save(false, rate);
      }
    }
  }

  // Tiendas de consulta (AUTOS, INMOB) no usan MP — las comisiones se acreditan
  // manualmente cuando el dueño confirma una consulta en Dashboard → Consultas.
  const isInquiryStore = storeType === "AUTOS";

  if (!hasMercadoPago && !isInquiryStore) {
    // El ícono ocupa 44px más 16 de separación: en 360 eso es un sexto del ancho
    // para una decoración. En angosto se achica el aire y el texto arranca antes.
    return (
      <div className={`rounded-2xl border p-4 sm:p-5 mb-6 flex items-start gap-3 sm:gap-4 ${enabled ? "border-amber-300 bg-amber-50" : "border-orange-200 bg-orange-50"}`}>
        <div className={`shrink-0 rounded-xl p-2.5 ${enabled ? "bg-amber-100" : "bg-orange-100"}`}>
          {enabled
            ? <AlertTriangle className="h-5 w-5 text-amber-600" />
            : <Lock className="h-5 w-5 text-orange-600" />
          }
        </div>
        <div className="min-w-0 flex-1">
          {enabled ? (
            <>
              <p className="font-semibold text-amber-900">El programa de afiliados está pausado</p>
              <p className="text-sm text-amber-700 mt-1">
                Desconectaste MercadoPago.
                {activeAffiliatesCount > 0 && (
                  <> Tus <strong>{activeAffiliatesCount} afiliada{activeAffiliatesCount !== 1 ? "s" : ""}</strong> no {activeAffiliatesCount !== 1 ? "pueden" : "puede"} generar comisiones nuevas hasta que vuelvas a conectarlo.</>
                )}
                {pendingBalance > 0 && (
                  <> El saldo pendiente de <strong>${pendingBalance.toLocaleString("es-AR")}</strong> sigue disponible para retirar.</>
                )}
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-orange-900">Afiliados requiere MercadoPago</p>
              <p className="text-sm text-orange-700 mt-1">
                Para activar el programa de afiliados necesitás conectar tu cuenta de MercadoPago.
                Así las comisiones se acreditan automáticamente en cada venta, sin que tengas que hacer nada.
              </p>
            </>
          )}
          {/* El texto no se parte y el ícono no se achica. En 360 el botón entraba
              justo y "Ir a Pagos → Conectar MercadoPago" salía en dos renglones,
              con la flecha colgando sola. Dicho corto entra en uno. */}
          <Link
            href="/dashboard/pagos"
            className={`inline-flex items-center gap-1.5 mt-3 text-sm font-semibold px-3 py-2 rounded-lg transition-colors ${enabled ? "text-amber-700 bg-amber-100 hover:bg-amber-200" : "text-orange-700 bg-orange-100 hover:bg-orange-200"}`}
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-nowrap">Conectar MercadoPago</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`rounded-2xl border p-5 mb-6 ${enabled ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`font-semibold ${enabled ? "text-green-800" : "text-gray-700"}`}>
              {enabled ? "Sistema de afiliados activo" : "Sistema de afiliados desactivado"}
            </p>
            <p className={`text-sm mt-0.5 ${enabled ? "text-green-600" : "text-gray-400"}`}>
              {enabled
                ? "Otras personas pueden postularse como vendedoras"
                : "Activalo para que otros puedan vender en tu tienda"}
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={saving}
            className={`relative inline-flex h-7 items-center rounded-full transition-colors disabled:opacity-60 ${
              enabled ? "bg-green-500" : "bg-gray-300"
            }`}
            style={{ width: "52px" }}
          >
            {saving
              ? <Loader2 className="h-4 w-4 animate-spin text-white absolute left-1/2 -translate-x-1/2" />
              : <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`} />
            }
          </button>
        </div>

        {enabled && (
          <div className="mt-4 pt-4 border-t border-green-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-green-800">Comisión por venta</label>
              <span className="text-lg font-bold text-green-700">{rate}%</span>
            </div>
            <input
              type="range" min="1" max="50" value={rate}
              disabled={saving}
              onChange={(e) => setRate(Number(e.target.value))}
              onMouseUp={() => save(true, rate)}
              onTouchEnd={() => save(true, rate)}
              className="w-full accent-green-600 disabled:opacity-60"
            />
            <div className="flex justify-between text-xs text-green-600 mt-1">
              <span>1%</span>
              <span className="text-green-700">Venta $10.000 → afiliada cobra ${(10000 * rate / 100).toLocaleString("es-AR")}</span>
              <span>50%</span>
            </div>

            <div className="mt-4 pt-4 border-t border-green-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-green-700 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">Aceptar cupones de premio</p>
                  <p className="text-xs text-green-600">Las afiliadas podrán usar sus cupones ganados como clientes en tu tienda. El descuento sale de la venta.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!acceptsCoupons) {
                    setCouponTcAccepted(false);
                    setShowCouponModal(true);
                  } else {
                    saveRewardCoupons(false);
                  }
                }}
                disabled={savingCoupons}
                className={`relative inline-flex h-7 items-center rounded-full transition-colors disabled:opacity-60 shrink-0 ${acceptsCoupons ? "bg-green-500" : "bg-gray-300"}`}
                style={{ width: "52px" }}
              >
                {savingCoupons
                  ? <Loader2 className="h-4 w-4 animate-spin text-white absolute left-1/2 -translate-x-1/2" />
                  : <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${acceptsCoupons ? "translate-x-7" : "translate-x-1"}`} />
                }
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal T&C al activar */}
      {showTcModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-base">Términos del programa de afiliadas</h2>
                <p className="text-xs text-gray-500">Leé y aceptá antes de activar</p>
              </div>
              <button onClick={() => setShowTcModal(false)} className="ml-auto text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-4 flex-1 space-y-3 text-sm text-gray-600 leading-relaxed">
              <p><strong className="text-gray-900">¿Cómo funciona?</strong><br />
                Al activar el programa, otras personas pueden postularse para vender tus productos a cambio de una comisión. Vos decidís quién entra, qué comisión pagás y podés pausar o dar de baja a cualquier afiliada cuando quieras.</p>

              <p><strong className="text-gray-900">Tus obligaciones como titular</strong></p>
              <ul className="list-disc pl-4 space-y-1.5">
                {isInquiryStore ? (
                  <li>Confirmar cada consulta como venta en <strong className="text-gray-800">Dashboard → Consultas</strong> para que la comisión se acredite automáticamente en el panel de comisiones de la afiliada.</li>
                ) : (
                  <li>Mantener tu cuenta de MercadoPago conectada. Las comisiones se descuentan automáticamente de cada venta y TiendaApps las acredita en el panel de comisiones de la afiliada — no tenés que hacer nada manualmente.</li>
                )}
                <li>Los retiros los gestiona directamente TiendaApps. No tenés responsabilidad sobre la transferencia de fondos a las afiliadas.</li>
                <li>No pausar ni dar de baja a una afiliada con el fin de no pagarle comisiones ya devengadas.</li>
                <li>Notificar con al menos <strong className="text-gray-800">5 días corridos de anticipación</strong> antes de modificar la tasa de comisión, o con <strong className="text-gray-800">48 horas</strong> antes de dar de baja a una afiliada activa sin causa de fraude.</li>
                <li>Informar a las afiliadas de cualquier cambio en la tasa de comisión. El nuevo porcentaje aplica a pedidos futuros, nunca de forma retroactiva.</li>
              </ul>

              <p><strong className="text-gray-900">Responsabilidades de la plataforma</strong><br />
                TiendaApps provee la infraestructura de tracking y panel de comisiones.{" "}
                {isInquiryStore
                  ? "Al confirmar una consulta como venta, TiendaApps acredita automáticamente la comisión en el panel de la afiliada."
                  : "Al confirmarse cada venta por MercadoPago, TiendaApps retiene automáticamente la comisión y la acredita en el panel de la afiliada."
                }{" "}
                <strong className="text-gray-800">TiendaApps es el responsable directo del pago de comisiones — no el titular de la tienda.</strong> TiendaApps no garantiza un volumen mínimo de ventas.</p>

              <p><strong className="text-gray-900">Cambios en la comisión</strong><br />
                Podés cambiar el porcentaje de comisión en cualquier momento. El nuevo valor aplica a pedidos futuros. Los pedidos ya realizados conservan la tasa original.</p>

              <p><strong className="text-gray-900">Desactivación del programa</strong><br />
                Si desactivás el programa, los links de afiliadas dejan de funcionar inmediatamente. Las comisiones pendientes siguen siendo válidas y debés honrarlas. Si cancelás tu suscripción a TiendaApps teniendo comisiones pendientes, las ya acreditadas siguen siendo exigibles.</p>

              <p><strong className="text-gray-900">Acuerdos fuera de la plataforma</strong><br />
                Queda prohibido acordar pagos o compensaciones con afiliadas por fuera de la plataforma. Toda comisión debe procesarse a través de TiendaApps.</p>

              <Link href="/terminos?role=owner" target="_blank" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-xs font-medium mt-1">
                Ver términos completos para dueños <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tcAccepted}
                  onChange={(e) => setTcAccepted(e.target.checked)}
                  className="mt-0.5 accent-indigo-600 w-4 h-4 flex-shrink-0"
                />
                <span className="text-sm text-gray-600">
                  Leí y acepto los términos del programa de afiliadas. Entiendo mis obligaciones como titular.
                </span>
              </label>
              <div className="flex gap-3">
                <button onClick={() => setShowTcModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={() => { setShowTcModal(false); save(true, rate); }}
                  disabled={!tcAccepted || saving}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors">
                  {saving ? "Activando..." : "Activar programa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal T&C al activar cupones */}
      {showCouponModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-full overflow-y-auto">
            <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <Ticket className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-base">Aceptar cupones de premio</h2>
                <p className="text-xs text-gray-500">Leé antes de activar</p>
              </div>
              <button onClick={() => setShowCouponModal(false)} className="ml-auto text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-3 text-sm text-gray-600 leading-relaxed">
              <p>Al activar esta opción, tus afiliadas podrán usar sus <strong className="text-gray-900">cupones de premio ganados</strong> como descuento al comprar en tu tienda.</p>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>El descuento se aplica sobre el precio de venta y sale de tu margen, no de la plataforma.</li>
                <li>El cupón se valida al momento del pago. No se puede combinar con otras promociones.</li>
                <li>Podés desactivar esta opción en cualquier momento. Los cupones ya emitidos siguen siendo válidos para cuando vuelvas a habilitarlos.</li>
                <li>Las afiliadas que tengan cupones disponibles serán notificadas si desactivás la opción.</li>
              </ul>
            </div>

            <div className="px-6 pb-6 space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={couponTcAccepted}
                  onChange={(e) => setCouponTcAccepted(e.target.checked)}
                  className="mt-0.5 accent-green-600 w-4 h-4 flex-shrink-0"
                />
                <span className="text-sm text-gray-600">
                  Entiendo que los descuentos se descontarán de mis ventas y acepto las condiciones.
                </span>
              </label>
              <div className="flex gap-3">
                <button onClick={() => setShowCouponModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={() => { setShowCouponModal(false); saveRewardCoupons(true); }}
                  disabled={!couponTcAccepted || savingCoupons}
                  className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-green-500 transition-colors">
                  Activar cupones
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal advertencia al desactivar */}
      {showDisableWarning && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-full overflow-y-auto">
            <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <h2 className="font-bold text-gray-900 text-base">¿Desactivar el programa?</h2>
              <button onClick={() => setShowDisableWarning(false)} className="ml-auto text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-gray-600">
                Tenés <strong className="text-gray-900">{activeAffiliatesCount} afiliada{activeAffiliatesCount !== 1 ? "s" : ""} activa{activeAffiliatesCount !== 1 ? "s" : ""}</strong>. Al desactivar el programa:
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold mt-0.5">•</span>
                  Sus links de afiliada dejan de funcionar <strong>de inmediato</strong>.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold mt-0.5">•</span>
                  Los pedidos ya ingresados conservan su afiliada asignada.
                </li>
                {pendingBalance > 0 && (
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold mt-0.5">•</span>
                    Hay <strong className="text-red-600">{fmt(pendingBalance)} en comisiones pendientes</strong> de retiro que seguís debiendo honrar.
                  </li>
                )}
              </ul>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowDisableWarning(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => { setShowDisableWarning(false); save(false, rate); }}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-red-500 transition-colors">
                {saving ? "Desactivando..." : "Sí, desactivar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
