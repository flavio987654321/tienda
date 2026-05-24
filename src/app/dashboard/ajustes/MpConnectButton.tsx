"use client";

import { useState } from "react";
import { CheckCircle, Loader2, Unlink, Zap } from "lucide-react";

type Props = {
  connected: boolean;
  connectedAt: string | null;
  mpSellerId: string | null;
};

export default function MpConnectButton({ connected, connectedAt, mpSellerId }: Props) {
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    if (!confirm("¿Desconectar MercadoPago? Los pagos vuelven a ser manuales.")) return;
    setDisconnecting(true);
    await fetch("/api/mp/oauth/disconnect", { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-1">
        {/* Logo MP inline SVG */}
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#009EE3"/>
          <path d="M6 16.5C6 16.5 9.5 11 16 11C22.5 11 26 16.5 26 16.5C26 16.5 22.5 22 16 22C9.5 22 6 16.5 6 16.5Z" fill="white"/>
          <circle cx="16" cy="16.5" r="3.5" fill="#009EE3"/>
        </svg>
        <div>
          <h2 className="text-sm font-bold text-gray-800">MercadoPago</h2>
          <p className="text-xs text-gray-400">Pagos automáticos con split para afiliadas</p>
        </div>
      </div>

      {connected ? (
        <div className="mt-4">
          <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl px-4 py-3 mb-3">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Cuenta conectada</p>
              {connectedAt && (
                <p className="text-xs text-green-600">
                  Desde el {new Date(connectedAt).toLocaleDateString("es-AR")}
                  {mpSellerId && ` · ID MP: ${mpSellerId}`}
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Los compradores podrán pagar con tarjeta o MP. Las comisiones de tus afiliadas se acreditan y transfieren automáticamente.
          </p>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
          >
            {disconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
            Desconectar cuenta
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-4">
            Conectá tu cuenta de MercadoPago para que los compradores paguen con tarjeta o MP y las comisiones de tus afiliadas se transfieran solas.
          </p>
          <a
            href="/api/mp/oauth/connect"
            className="inline-flex items-center gap-2 bg-[#009EE3] hover:bg-[#0088c7] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            <Zap className="h-4 w-4" />
            Conectar MercadoPago
          </a>
        </div>
      )}
    </div>
  );
}
