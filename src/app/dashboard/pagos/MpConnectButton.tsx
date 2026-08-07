"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle, Lightbulb, Loader2, Unlink, X, XCircle, Zap } from "lucide-react";

type Props = {
  connected: boolean;
  connectedAt: string | null;
  mpSellerId: string | null;
  mpStatus?: "connected" | "error";
  activeAffiliatesCount: number;
};

export default function MpConnectButton({ connected, connectedAt, mpSellerId, mpStatus, activeAffiliatesCount }: Props) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  async function confirmDisconnect() {
    // Guard síncrono: el `disabled` llega recién en el re-render.
    if (disconnecting) return;
    setDisconnecting(true);
    await fetch("/api/mp/oauth/disconnect", { method: "POST" });
    window.location.href = "/dashboard/pagos";
  }

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#009EE3"/>
            <path d="M6 16.5C6 16.5 9.5 11 16 11C22.5 11 26 16.5 26 16.5C26 16.5 22.5 22 16 22C9.5 22 6 16.5 6 16.5Z" fill="white"/>
            <circle cx="16" cy="16.5" r="3.5" fill="#009EE3"/>
          </svg>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">MercadoPago</h2>
            <p className="text-xs text-slate-400">Cobrá con tarjeta, débito o dinero en cuenta</p>
          </div>
          {connected && (
            <span className="ml-auto text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
              Activo
            </span>
          )}
        </div>

        {mpStatus === "connected" && (
          <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-4">
            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            <p className="text-sm font-semibold text-emerald-800">¡Cuenta de MercadoPago conectada con éxito!</p>
          </div>
        )}
        {mpStatus === "error" && (
          <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            <XCircle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm font-semibold text-red-800">Hubo un error al conectar. Intentá de nuevo.</p>
          </div>
        )}

        {connected ? (
          <div>
            <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-4">
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Cuenta conectada</p>
                {connectedAt && (
                  <p className="text-xs text-emerald-600">
                    Desde el {new Date(connectedAt).toLocaleDateString("es-AR")}
                    {mpSellerId && ` · ID MP: ${mpSellerId}`}
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-600 mb-2">Qué está pasando ahora</p>
            <ul className="space-y-2 mb-4">
              <Bullet color="emerald">
                En tu tienda aparece el botón <strong className="text-slate-700">Pagar con MercadoPago</strong>. El cliente paga en el momento y vos lo ves como pedido pagado, sin esperar el comprobante.
              </Bullet>
              <Bullet color="emerald">
                <strong className="text-slate-700">La plata entra a tu cuenta de MercadoPago</strong>, no a TiendaApps. Los plazos de acreditación los pone MercadoPago.
              </Bullet>
              <Bullet color="emerald">
                Podés sumar afiliadas: la comisión se descuenta sola en cada venta que traigan.
              </Bullet>
            </ul>

            <button
              onClick={() => setShowModal(true)}
              disabled={disconnecting}
              className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              {disconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
              Desconectar cuenta
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-500 mb-4">
              Es la forma más rápida de cobrar: el cliente paga con tarjeta, débito o el dinero de su cuenta
              de MercadoPago, sin que tengas que revisar comprobantes de transferencia a mano.
            </p>

            <p className="text-xs font-semibold text-slate-600 mb-2">Qué pasa cuando apretás el botón</p>
            <ul className="space-y-2 mb-4">
              <Bullet color="blue">
                Se abre MercadoPago y te pide autorizar a TiendaApps. Cuando aceptás, volvés sola a esta pantalla.
              </Bullet>
              <Bullet color="blue">
                <strong className="text-slate-700">Nunca escribís tu contraseña acá.</strong> La autorización pasa
                por MercadoPago y podés cortarla cuando quieras.
              </Bullet>
              <Bullet color="blue">
                <strong className="text-slate-700">La plata de cada venta entra a tu cuenta de MercadoPago</strong>, no
                a TiendaApps.
              </Bullet>
              <Bullet color="blue">
                Se habilita el programa de afiliadas, que necesita MercadoPago para descontar la comisión en el momento.
              </Bullet>
            </ul>

            <a
              href="/api/mp/oauth/connect"
              className="inline-flex items-center gap-2 bg-[#009EE3] hover:bg-[#0088c7] text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              <Zap className="h-4 w-4" />
              Conectar MercadoPago
            </a>
          </div>
        )}

        {/* Consejos — lo que más confunde a la hora de conectar */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2.5">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
            <p className="text-xs font-semibold text-slate-600">Consejos</p>
          </div>
          <ul className="space-y-2">
            {!connected && (
              <Bullet color="amber">
                <strong className="text-slate-700">Fijate con qué cuenta estás abierta en MercadoPago antes de conectar.</strong> Se
                conecta la que tengas iniciada en el navegador. Si tenés una personal y una del negocio, entrá primero con la del negocio.
              </Bullet>
            )}
            <Bullet color="amber">
              No hace falta crear una cuenta nueva ni ser empresa: sirve la misma que ya usás para cobrar.
            </Bullet>
            <Bullet color="amber">
              MercadoPago te descuenta su comisión por procesar el pago —{" "}
              <strong className="text-slate-700">TiendaApps no te cobra nada por venta</strong>. Lo único que se
              descuenta aparte es la comisión de tu afiliada, si la venta vino por el link de una.
            </Bullet>
            <Bullet color="amber">
              Podés tener MercadoPago y transferencia activos a la vez: el comprador elige con cuál pagar.
            </Bullet>
          </ul>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-full overflow-y-auto">
            <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <h2 className="font-bold text-gray-900 text-base">¿Desconectar MercadoPago?</h2>
              <button onClick={() => setShowModal(false)} className="ml-auto text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-gray-600">
                Tu tienda deja de mostrar el botón de pago con tarjeta. Los pedidos nuevos solo van a poder pagarse
                por los medios manuales que tengas activos (transferencia o efectivo).
              </p>
              {activeAffiliatesCount > 0 ? (
                <>
                  <p className="text-sm text-gray-600">
                    Además tenés <strong className="text-gray-900">{activeAffiliatesCount} afiliada{activeAffiliatesCount !== 1 ? "s" : ""} activa{activeAffiliatesCount !== 1 ? "s" : ""}</strong>. Al desconectar:
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 font-bold mt-0.5">•</span>
                      Sus links dejan de generar comisiones de inmediato.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 font-bold mt-0.5">•</span>
                      El dinero que ya ganaron sigue disponible para retirar.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold mt-0.5">•</span>
                      Cuando vuelvas a conectar MP, el programa se reactiva automáticamente.
                    </li>
                  </ul>
                  <p className="text-xs text-gray-400 pt-1">
                    Las afiliadas recibirán un email avisando que el programa está pausado.
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  El dinero que ya cobraste no se toca: está en tu cuenta de MercadoPago. Podés volver a conectar
                  cuando quieras.
                </p>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDisconnect}
                disabled={disconnecting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-red-500 transition-colors"
              >
                {disconnecting ? "Desconectando..." : "Sí, desconectar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const BULLET_COLORS = {
  emerald: "text-emerald-500",
  blue: "text-blue-500",
  amber: "text-amber-500",
} as const;

function Bullet({ color, children }: { color: keyof typeof BULLET_COLORS; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
      <span className={`${BULLET_COLORS[color]} font-bold mt-px shrink-0`}>•</span>
      <span>{children}</span>
    </li>
  );
}
