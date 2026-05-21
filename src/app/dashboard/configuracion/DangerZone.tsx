"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, X, Loader2, ShieldAlert, Store, UserX } from "lucide-react";

type Blockers = { storeName: string; pendingOrders: number; pendingBalances: number };

export default function DangerZone() {
  const [target, setTarget] = useState<"store" | "account" | null>(null);
  const [blockers, setBlockers] = useState<Blockers | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;

  async function handleOpen(t: "store" | "account") {
    setErrorMsg("");
    setConfirmText("");
    setBlockers(null);
    setTarget(t);
    setLoading(true);
    const data: Blockers = await fetch("/api/cuenta").then((r) => r.json());
    setBlockers(data);
    setLoading(false);
  }

  function handleClose() {
    setTarget(null);
    setBlockers(null);
    setConfirmText("");
    setErrorMsg("");
  }

  async function handleConfirm() {
    if (!target || !blockers || confirmText !== blockers.storeName) return;
    setDeleting(true);
    setErrorMsg("");
    const r = await fetch("/api/cuenta", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, confirm: confirmText }),
    });
    if (r.ok) {
      // Redirigir: si elimina cuenta va a login, si solo tienda va al dashboard
      window.location.href = target === "account" ? "/login" : "/dashboard";
    } else {
      const err = await r.json();
      setErrorMsg(err.error ?? "Ocurrió un error. Intentá de nuevo.");
      setDeleting(false);
    }
  }

  const canConfirm = blockers && confirmText === blockers.storeName && !loading;
  const hasBlockers = blockers && (blockers.pendingOrders > 0 || blockers.pendingBalances > 0);

  return (
    <>
      {/* ── Sección Zona de peligro ── */}
      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-red-200">
          <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm font-bold text-red-700">Zona de peligro</p>
        </div>
        <div className="p-4 space-y-2.5">
          <button
            onClick={() => handleOpen("store")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-sm text-red-600 font-medium transition-colors text-left"
          >
            <Store className="h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Eliminar tienda</p>
              <p className="text-xs text-red-400 font-normal mt-0.5">Oculta la tienda. Tu cuenta queda activa.</p>
            </div>
          </button>
          <button
            onClick={() => handleOpen("account")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-300 bg-red-100 hover:bg-red-200 text-sm text-red-700 font-semibold transition-colors text-left"
          >
            <UserX className="h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Eliminar cuenta completa</p>
              <p className="text-xs text-red-500 font-normal mt-0.5">Elimina tienda y anonimiza tus datos personales.</p>
            </div>
          </button>
        </div>
      </div>

      {/* ── Modal de confirmación ── */}
      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-base">
                  {target === "store" ? "Eliminar tienda" : "Eliminar cuenta completa"}
                </h2>
                <p className="text-xs text-gray-500">Esta acción no se puede deshacer</p>
              </div>
              <button onClick={handleClose} className="ml-auto text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : hasBlockers ? (
                /* ── Bloqueadores ── */
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 font-medium">No podés eliminar todavía porque hay pendientes:</p>
                  {blockers!.pendingOrders > 0 && (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">{blockers!.pendingOrders} pedido{blockers!.pendingOrders !== 1 ? "s" : ""} pendiente{blockers!.pendingOrders !== 1 ? "s" : ""}</p>
                        <p className="text-xs text-amber-600 mt-0.5">Tenés que completarlos o cancelarlos desde el panel de pedidos.</p>
                      </div>
                    </div>
                  )}
                  {blockers!.pendingBalances > 0 && (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">{fmt(blockers!.pendingBalances)} en billeteras de afiliados</p>
                        <p className="text-xs text-amber-600 mt-0.5">Tus afiliados deben retirar su saldo antes de que puedas eliminar la tienda.</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Confirmación ── */
                <div className="space-y-4">
                  {/* Qué se va a eliminar */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Qué se elimina</p>
                    <ul className="space-y-1.5 text-sm text-gray-600">
                      <li className="flex items-center gap-2"><Trash2 className="h-3.5 w-3.5 text-red-400" /> Tienda y todos sus productos</li>
                      <li className="flex items-center gap-2"><Trash2 className="h-3.5 w-3.5 text-red-400" /> Links de afiliados (desactivados)</li>
                      {target === "account" && (
                        <li className="flex items-center gap-2"><Trash2 className="h-3.5 w-3.5 text-red-400" /> Tus datos personales (nombre, email, foto)</li>
                      )}
                    </ul>
                    <p className="text-xs text-gray-400 mt-2">El historial de pedidos y comisiones se conserva por 5 años (requisito AFIP).</p>
                  </div>

                  {/* Input de confirmación */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Escribí el nombre de tu tienda para confirmar:{" "}
                      <strong className="text-gray-900">{blockers?.storeName}</strong>
                    </label>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => { setConfirmText(e.target.value); setErrorMsg(""); }}
                      placeholder={blockers?.storeName}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{errorMsg}</p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              {!hasBlockers && !loading && (
                <button
                  onClick={handleConfirm}
                  disabled={!canConfirm || deleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Eliminando...</>
                  ) : (
                    <><Trash2 className="h-4 w-4" /> {target === "store" ? "Eliminar tienda" : "Eliminar cuenta"}</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
