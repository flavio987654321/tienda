"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Trash2, X, Loader2, ShieldAlert, Store, Power } from "lucide-react";
import CerrarTiendaModal from "./CerrarTiendaModal";

type AccountInfo = {
  role: string;
  email: string;
  storeName: string;
  pendingOrders: number;
  pendingBalances: number;
};

// Solo la ve una dueña de tienda: /dashboard/ajustes redirige a cualquier otro
// rol antes de renderizar. Por eso acá no hay ramas para afiliada/comprador —
// la baja de esas cuentas vive en su propio panel (VendedorasClient).
export default function DangerZone({
  storeName,
  paidUntil,
  hasDesign,
}: {
  storeName: string;
  paidUntil: string | null;
  /** Si no hay diseño ni bloques, no se ofrece resetear: no hay nada que borrar. */
  hasDesign: boolean;
}) {
  const [target, setTarget] = useState<"store" | "account" | null>(null);
  const [closing, setClosing] = useState(false);
  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  // Guard contra doble click: `deleting` no alcanza porque React agrupa los
  // setState y dos clicks muy juntos pasan los dos antes del primer re-render.
  const sending = useRef(false);

  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;

  async function handleOpen(t: "store" | "account") {
    setErrorMsg("");
    setConfirmText("");
    setInfo(null);
    setTarget(t);

    // El reset no tiene bloqueadores y el nombre ya viene por props: no hace
    // falta ir al servidor a buscar nada.
    if (t === "store") {
      setInfo({ role: "OWNER", email: "", storeName, pendingOrders: 0, pendingBalances: 0 });
      return;
    }

    setLoading(true);
    try {
      const data: AccountInfo = await fetch("/api/cuenta?target=account").then((r) => r.json());
      setInfo(data);
    } catch {
      setErrorMsg("No pudimos cargar los datos. Intentá de nuevo.");
    }
    setLoading(false);
  }

  function handleCloseModal() {
    setTarget(null);
    setInfo(null);
    setConfirmText("");
    setErrorMsg("");
  }

  async function handleConfirm() {
    if (sending.current || !target || !info || confirmText.trim() !== info.storeName) return;
    sending.current = true;
    setDeleting(true);
    setErrorMsg("");

    // Dos endpoints distintos porque son dos cosas distintas: resetear el diseño
    // no toca la cuenta ni a las afiliadas. Antes los dos entraban por
    // /api/cuenta y el reset arrastraba el borrado de afiliadas de la baja.
    const r =
      target === "store"
        ? await fetch("/api/configuracion", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ confirm: confirmText.trim() }),
          })
        : await fetch("/api/cuenta", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target: "account", confirm: confirmText.trim() }),
          });

    if (r.ok) {
      window.location.href = target === "account" ? "/login" : "/dashboard/configuracion";
      return;
    }
    const err = await r.json().catch(() => ({}));
    setErrorMsg(err.error ?? "Ocurrió un error. Intentá de nuevo.");
    sending.current = false;
    setDeleting(false);
  }

  const canConfirm = info && confirmText.trim() === info.storeName && !loading;
  const hasBlockers = info && (info.pendingOrders > 0 || info.pendingBalances > 0);

  return (
    <>
      <div className="rounded-xl border border-red-200 bg-red-50/60 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-red-200">
          <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm font-bold text-red-700">Zona de peligro</p>
        </div>
        <div className="p-4 space-y-2.5">
          {/* Sin diseño no se ofrece: sería una acción destructiva que no borra
              nada, y el modal le pediría confirmar la pérdida de algo que no existe. */}
          {hasDesign && (
            <button
              onClick={() => handleOpen("store")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-sm text-red-700 font-medium transition-colors text-left"
            >
              <Store className="h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Resetear diseño de la tienda</p>
                <p className="text-xs text-red-500 font-normal mt-0.5">Volvés a elegir template desde cero. Tu tienda sale de línea hasta que la republiques.</p>
              </div>
            </button>
          )}

          {/* La puerta de salida principal. Antes la única era eliminar la cuenta,
              que es irreversible — y la mayoría de las que la tocaban solo querían
              dejar de pagar. */}
          <button
            onClick={() => setClosing(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-red-300 bg-red-100 hover:bg-red-200 text-sm text-red-800 font-semibold transition-colors text-left"
          >
            <Power className="h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Cerrar mi tienda</p>
              <p className="text-xs text-red-500 font-normal mt-0.5">Sale de línea y dejás de pagar. Se conserva todo y podés reactivarla.</p>
            </div>
          </button>
        </div>

        {/* Eliminar queda como último recurso, no como la puerta obvia: es un
            derecho (ARCO, Ley 25.326) y tiene que existir, pero casi nadie que
            quiere irse necesita esto. */}
        <div className="px-4 pb-4 -mt-0.5">
          <button
            onClick={() => handleOpen("account")}
            className="text-xs text-red-600/70 hover:text-red-700 underline underline-offset-2 transition-colors"
          >
            Eliminar mis datos permanentemente
          </button>
        </div>
      </div>

      {closing && (
        <CerrarTiendaModal
          storeName={storeName}
          paidUntil={paidUntil}
          onClose={() => setClosing(false)}
        />
      )}

      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-base">
                  {target === "store" ? "Resetear diseño de la tienda" : "Eliminar mis datos permanentemente"}
                </h2>
                <p className="text-xs text-gray-500">Esta acción no se puede deshacer</p>
              </div>
              <button onClick={handleCloseModal} aria-label="Cerrar" className="ml-auto text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : hasBlockers ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 font-medium">No podés eliminar todavía porque hay pendientes:</p>
                  {info!.pendingOrders > 0 && (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">{info!.pendingOrders} pedido{info!.pendingOrders !== 1 ? "s" : ""} pendiente{info!.pendingOrders !== 1 ? "s" : ""}</p>
                        <p className="text-xs text-amber-600 mt-0.5">Tenés que completarlos o cancelarlos desde el panel de pedidos.</p>
                      </div>
                    </div>
                  )}
                  {info!.pendingBalances > 0 && (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">{fmt(info!.pendingBalances)} en panel de comisiones de afiliados</p>
                        <p className="text-xs text-amber-600 mt-0.5">Tus afiliados deben retirar su saldo antes de que puedas eliminar la tienda.</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Qué se elimina</p>
                    <ul className="space-y-1.5 text-sm text-gray-600">
                      {target === "store" ? (
                        <>
                          <li className="flex items-center gap-2"><Trash2 className="h-3.5 w-3.5 text-red-400" /> El diseño y los bloques de tu página</li>
                          <li className="flex items-center gap-2"><Trash2 className="h-3.5 w-3.5 text-red-400" /> Tu tienda sale de línea hasta que la republiques</li>
                          <li className="flex items-center gap-2 text-gray-400"><span className="h-3.5 w-3.5 text-green-500 flex-shrink-0">✓</span> Productos, pedidos y afiliadas se conservan</li>
                          <li className="flex items-center gap-2 text-gray-400"><span className="h-3.5 w-3.5 text-green-500 flex-shrink-0">✓</span> Tus datos de cobro, envíos e integraciones también</li>
                        </>
                      ) : (
                        <>
                          <li className="flex items-center gap-2"><Trash2 className="h-3.5 w-3.5 text-red-400" /> Tus datos personales (nombre, email, foto)</li>
                          <li className="flex items-center gap-2"><Trash2 className="h-3.5 w-3.5 text-red-400" /> Tienda, productos y afiliados</li>
                        </>
                      )}
                    </ul>
                    <p className="text-xs text-gray-400 mt-2">
                      {target === "store"
                        ? "Vas a poder armar un diseño nuevo desde cero en el constructor."
                        : "El historial de pedidos y comisiones se conserva por 5 años (requisito AFIP). Podés volver a registrarte con el mismo email."}
                    </p>
                  </div>

                  {target === "account" && (
                    <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <AlertTriangle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-800 leading-relaxed">
                        Si lo que querés es dejar de pagar y no perder tu trabajo, mejor <strong>cerrá tu tienda</strong>:
                        se conserva todo y la reactivás cuando quieras. Esto de acá no tiene vuelta.
                      </p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="danger-confirm" className="block text-sm text-gray-700 mb-2">
                      Escribí el nombre de tu tienda para confirmar: <strong className="text-gray-900">{info?.storeName}</strong>
                    </label>
                    <input
                      id="danger-confirm"
                      type="text"
                      value={confirmText}
                      onChange={(e) => { setConfirmText(e.target.value); setErrorMsg(""); }}
                      placeholder={info?.storeName ?? ""}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{errorMsg}</p>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={handleCloseModal}
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
                    <><Trash2 className="h-4 w-4" /> {target === "store" ? "Resetear diseño" : "Eliminar mis datos"}</>
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
