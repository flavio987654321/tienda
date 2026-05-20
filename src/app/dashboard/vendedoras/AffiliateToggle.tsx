"use client";

import { useState } from "react";
import { Loader2, AlertTriangle, X, ShieldCheck, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const TC_OWNER_VERSION = "1.0";

export default function AffiliateToggle({
  enabled,
  commissionRate: initialRate,
  activeAffiliatesCount,
  pendingBalance,
}: {
  enabled: boolean;
  commissionRate: number;
  activeAffiliatesCount: number;
  pendingBalance: number;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [rate, setRate] = useState(initialRate);
  const [showTcModal, setShowTcModal] = useState(false);
  const [showDisableWarning, setShowDisableWarning] = useState(false);
  const [tcAccepted, setTcAccepted] = useState(false);

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
              onChange={(e) => setRate(Number(e.target.value))}
              onMouseUp={() => save(true, rate)}
              onTouchEnd={() => save(true, rate)}
              className="w-full accent-green-600"
            />
            <div className="flex justify-between text-xs text-green-600 mt-1">
              <span>1%</span>
              <span className="text-green-700">Venta $10.000 → afiliada cobra ${(10000 * rate / 100).toLocaleString("es-AR")}</span>
              <span>50%</span>
            </div>
          </div>
        )}
      </div>

      {/* Modal T&C al activar */}
      {showTcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
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
                <li>Pagar las comisiones a las afiliadas al confirmar el pago de cada pedido. La plataforma las acredita automáticamente en la billetera de la afiliada.</li>
                <li>Procesar los retiros de billetera solicitados por las afiliadas en un plazo de <strong className="text-gray-800">1 a 3 días hábiles</strong>.</li>
                <li>No pausar ni dar de baja a una afiliada con el fin de no pagarle comisiones ya devengadas.</li>
                <li>Notificar con al menos <strong className="text-gray-800">48 horas de anticipación</strong> antes de dar de baja a una afiliada activa, salvo caso de fraude comprobado.</li>
                <li>Informar a las afiliadas de cualquier cambio en la tasa de comisión con al menos 7 días de anticipación.</li>
              </ul>

              <p><strong className="text-gray-900">Responsabilidades de la plataforma</strong><br />
                MiTienda provee la infraestructura de tracking y billetera. Actúa como intermediaria tecnológica y no garantiza un volumen mínimo de ventas. El pago de comisiones es responsabilidad exclusiva del titular.</p>

              <p><strong className="text-gray-900">Cambios en la comisión</strong><br />
                Podés cambiar el porcentaje de comisión en cualquier momento. El nuevo valor aplica a pedidos futuros. Los pedidos ya realizados conservan la tasa original.</p>

              <p><strong className="text-gray-900">Desactivación del programa</strong><br />
                Si desactivás el programa, los links de afiliadas dejan de funcionar inmediatamente. Los saldos pendientes en billetera siguen siendo válidos y debés honrarlos. Si cancelás tu suscripción a MiTienda teniendo saldos pendientes, las comisiones ya acreditadas siguen siendo exigibles.</p>

              <p><strong className="text-gray-900">Acuerdos fuera de la plataforma</strong><br />
                Queda prohibido acordar pagos o compensaciones con afiliadas por fuera de la plataforma para evitar el sistema de billetera. Toda comisión debe procesarse a través de MiTienda.</p>

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

      {/* Modal advertencia al desactivar */}
      {showDisableWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
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
                    Hay <strong className="text-red-600">{fmt(pendingBalance)} en billeteras pendientes</strong> de retiro que seguís debiendo honrar.
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
