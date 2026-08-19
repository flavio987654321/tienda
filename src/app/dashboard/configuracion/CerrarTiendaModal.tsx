"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X, Loader2, Store, Check, ArrowLeft, MessageCircle } from "lucide-react";
import Link from "next/link";
import { CLOSURE_REASONS, CLOSURE_REASON_KEYS, CLOSURE_COMMENT_MAX, type ClosureReason } from "@/lib/store-closure";

type Blockers = { pendingOrders: number; pendingBalances: number };

// Respuesta a cada motivo, antes de confirmar. Es lo que hace Tiendanube
// ("según el motivo aparecen mensajes para mantener el negocio activo"): la
// mayoría de las que cierran tienen un problema puntual que se puede resolver.
// Los motivos sin salida —cierra el emprendimiento, se va a otra plataforma— no
// llevan retención a propósito: insistirle a alguien que ya decidió es molesto.
/* Un `mailto:` y no `/contacto`, que es la pagina que usaria cualquiera.
   `/contacto` esta fuera del `scope` del manifiesto: desde el panel instalado,
   el boton de "Escribinos" abria el sitio comercial entero adentro de la app.
   El correo abre la app de mail y no navega a ningun lado, asi que sirve igual
   en la web y adentro de la app. */
const CORREO_SOPORTE = "mailto:soporte@tiendaapps.com?subject=Antes%20de%20cerrar%20mi%20tienda";

/* La misma clase para las dos formas del boton de retencion, que abajo se
   dibuja como `<a>` o como `<Link>` segun a donde vaya. Escrita una sola vez
   para que las dos se vean igual. */
const CLASE_CTA_RETENCION =
  "inline-block mt-2.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 underline underline-offset-2";

const RETENTION: Partial<Record<ClosureReason, { text: string; cta?: { label: string; href: string } }>> = {
  PRICE: {
    text: "Si el plan Premium te quedó grande, Tienda Pro tiene lo esencial por menos. Podés cambiarte sin perder nada de lo que armaste.",
    cta: { label: "Ver los planes", href: "/dashboard/mi-plan" },
  },
  NO_SALES: {
    text: "Nos pasa seguido que con unos ajustes en las fotos, los precios o la difusión la cosa cambia. Si querés, lo miramos juntos antes de que cierres.",
    cta: { label: "Escribinos", href: CORREO_SOPORTE },
  },
  TOO_HARD: {
    text: "Eso es culpa nuestra, no tuya. Contanos qué parte te trabó y te damos una mano — capaz se resuelve en cinco minutos.",
    cta: { label: "Escribinos", href: CORREO_SOPORTE },
  },
};

export default function CerrarTiendaModal({
  storeName,
  paidUntil,
  onClose,
}: {
  storeName: string;
  paidUntil: string | null;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"info" | "reason" | "confirm">("info");
  const [reason, setReason] = useState<ClosureReason | null>(null);
  const [comment, setComment] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [blockers, setBlockers] = useState<Blockers | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  // Guard contra doble click: el `closing` de estado no alcanza porque React
  // agrupa los setState y dos clicks muy juntos pueden pasar los dos antes del
  // primer re-render.
  const sending = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cuenta?target=account")
      .then((r) => r.json())
      .then((d: Blockers) => {
        if (cancelled) return;
        setBlockers({ pendingOrders: d.pendingOrders ?? 0, pendingBalances: d.pendingBalances ?? 0 });
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setErrorMsg("No pudimos verificar el estado de tu tienda. Intentá de nuevo.");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const isBlocked = !!blockers && (blockers.pendingOrders > 0 || blockers.pendingBalances > 0);
  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;

  const paidUntilLabel = paidUntil
    ? new Date(paidUntil).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  async function handleClose() {
    if (sending.current || !reason || confirmText.trim() !== storeName) return;
    sending.current = true;
    setClosing(true);
    setErrorMsg("");

    try {
      const r = await fetch("/api/tienda/cerrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, comment: comment.trim() || undefined, confirm: confirmText.trim() }),
      });
      if (r.ok) {
        // Recarga entera y no router.refresh(): el layout tiene que volver a
        // evaluar el estado de la tienda desde el servidor para mostrar la
        // pantalla de "cerrada".
        window.location.href = "/dashboard";
        return;
      }
      const err = (await r.json().catch(() => ({}))) as { error?: string };
      setErrorMsg(err.error ?? "No pudimos cerrar tu tienda. Intentá de nuevo.");
    } catch {
      setErrorMsg("Error de conexión. Intentá de nuevo.");
    }
    sending.current = false;
    setClosing(false);
  }

  const retention = reason ? RETENTION[reason] : undefined;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            <Store className="h-5 w-5 text-gray-600" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 text-base">Cerrar mi tienda</h2>
            <p className="text-xs text-gray-500">Podés reactivarla cuando quieras</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="ml-auto text-gray-400 hover:text-gray-600 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : isBlocked ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-700 font-medium">Todavía no podés cerrar porque hay cosas sin resolver:</p>
              {blockers!.pendingOrders > 0 && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      {blockers!.pendingOrders} pedido{blockers!.pendingOrders !== 1 ? "s" : ""} en curso
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Alguien te compró y todavía espera. Completalos o cancelalos desde tu panel de pedidos.
                    </p>
                  </div>
                </div>
              )}
              {blockers!.pendingBalances > 0 && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      {fmt(blockers!.pendingBalances)} sin pagar a tus afiliados
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Esa plata es de ellas. Tienen que retirarla antes de que puedas cerrar.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : step === "info" ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">No se borra nada</p>
                <ul className="space-y-1.5 text-sm text-gray-700">
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> Tu diseño y tus bloques</li>
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> Tus productos y tus fotos</li>
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> Tu historial de pedidos</li>
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> Tus afiliados, que recuperan su lugar si volvés</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Qué pasa al cerrar</p>
                <ul className="space-y-1.5 text-sm text-gray-600 list-disc list-inside marker:text-gray-300">
                  <li>Tu tienda sale de línea y deja de vender</li>
                  <li>Dejamos de cobrarte la suscripción</li>
                  <li>El link de tus afiliados queda pausado</li>
                  <li>Entrás a tu panel cuando quieras y la reactivás</li>
                </ul>
              </div>

              {paidUntilLabel && (
                <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <AlertTriangle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Tenés la suscripción paga hasta el <strong>{paidUntilLabel}</strong>. Esos días son tuyos:
                    si reactivás antes de esa fecha, volvés sin pagar de nuevo. Ojo que el tiempo corre igual
                    mientras la tienda está cerrada.
                  </p>
                </div>
              )}
            </div>
          ) : step === "reason" ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-700 font-medium">¿Por qué cerrás tu tienda?</p>
              <div className="space-y-2">
                {CLOSURE_REASON_KEYS.map((key) => (
                  <button
                    key={key}
                    onClick={() => setReason(key)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                      reason === key
                        ? "border-indigo-400 bg-indigo-50 text-indigo-900 font-semibold"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {CLOSURE_REASONS[key]}
                  </button>
                ))}
              </div>

              {retention && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mt-3">
                  <div className="flex items-start gap-2.5">
                    <MessageCircle className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm text-indigo-900 leading-relaxed">{retention.text}</p>
                      {/* La tabla mezcla dos clases de destino: una pantalla
                          del panel y un correo. El correo va en un `<a>` — hoy
                          `next/link` se aparta solo cuando la direccion no es
                          local, pero eso es un detalle interno del que no hace
                          falta depender, y `dashboard/page.tsx` ya usa `<a>`
                          para el mismo `mailto:`. Que las dos se comporten
                          distinto estando en la misma tabla es lo que hay que
                          evitar. */}
                      {retention.cta &&
                        (retention.cta.href.startsWith("mailto:") ? (
                          <a href={retention.cta.href} className={CLASE_CTA_RETENCION}>
                            {retention.cta.label}
                          </a>
                        ) : (
                          <Link href={retention.cta.href} className={CLASE_CTA_RETENCION}>
                            {retention.cta.label}
                          </Link>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="closure-comment" className="block text-sm text-gray-700 mb-2">
                  ¿Querés contarnos algo más? <span className="text-gray-400">(opcional)</span>
                </label>
                <textarea
                  id="closure-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, CLOSURE_COMMENT_MAX))}
                  rows={3}
                  placeholder="Nos sirve para mejorar…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{comment.length}/{CLOSURE_COMMENT_MAX}</p>
              </div>

              <div>
                <label htmlFor="closure-confirm" className="block text-sm text-gray-700 mb-2">
                  Escribí el nombre de tu tienda para confirmar: <strong className="text-gray-900">{storeName}</strong>
                </label>
                <input
                  id="closure-confirm"
                  type="text"
                  value={confirmText}
                  onChange={(e) => { setConfirmText(e.target.value); setErrorMsg(""); }}
                  placeholder={storeName}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {errorMsg && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{errorMsg}</p>
              )}
            </div>
          )}
        </div>

        {!loading && !isBlocked && (
          <div className="px-6 pb-6 pt-2 flex gap-3 shrink-0">
            {step === "info" ? (
              <>
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Mejor no
                </button>
                <button onClick={() => setStep("reason")} className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors">
                  Continuar
                </button>
              </>
            ) : step === "reason" ? (
              <>
                <button onClick={() => setStep("info")} className="py-2.5 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Atrás
                </button>
                <button
                  onClick={() => setStep("confirm")}
                  disabled={!reason}
                  className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-40 hover:bg-gray-800 transition-colors"
                >
                  Continuar
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setStep("reason")} disabled={closing} className="py-2.5 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors flex items-center gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Atrás
                </button>
                <button
                  onClick={handleClose}
                  disabled={closing || confirmText.trim() !== storeName}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  {closing ? (<><Loader2 className="h-4 w-4 animate-spin" /> Cerrando…</>) : "Cerrar mi tienda"}
                </button>
              </>
            )}
          </div>
        )}

        {!loading && isBlocked && (
          <div className="px-6 pb-6 pt-2 shrink-0">
            <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
