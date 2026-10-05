"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, X, ShoppingBag, HeartHandshake, Loader2, AlertTriangle, Clock } from "lucide-react";
import { CAPAS } from "@/lib/capas-tienda";
import { pedirTurno } from "@/lib/interrupcion-tienda";

export default function StorefrontPaymentSuccess() {
  const searchParams = useSearchParams();
  // Los datos del pago se derivan del query param en el estado inicial (no con un
  // setState sincrónico en el efecto). El efecto solo limpia la URL (sin setState).
  const pagoOk = searchParams.get("pago") === "ok";
  /* La vuelta de MercadoPago cuando NO salió bien (05/10/26). Antes sólo se
     miraba "ok": quien volvía con el pago rechazado o pendiente no veía nada,
     con el carrito ya vacío, y armaba otro pedido desde cero (que volvía a
     reservar stock). Ahora se le explica y se le ofrece reintentar ESE pedido. */
  const pagoNoCerrado = searchParams.get("pago") === "error" ? "error" : searchParams.get("pago") === "pendiente" ? "pendiente" : null;
  const [vuelta, setVuelta] = useState<{ tipo: "error" | "pendiente"; orderId: string; donationId: string | null } | null>(
    () => {
      const orden = searchParams.get("orden");
      return pagoNoCerrado && orden ? { tipo: pagoNoCerrado, orderId: orden, donationId: searchParams.get("donacionId") } : null;
    }
  );
  const [reintentando, setReintentando] = useState(false);
  const [errorReintento, setErrorReintento] = useState("");
  const [orderId, setOrderId] = useState<string | null>(pagoOk ? searchParams.get("orden") : null);
  // Sin el setter a propósito: el `useState` acá NO es para cambiar el valor, es para
  // CONGELARLO. El efecto de abajo limpia la URL, así que `searchParams` deja de
  // tener `donacionId` — con una constante derivada el id se volvería null justo
  // después de montar y se cortaría el flujo de la donación. El estado guarda el
  // valor que había al abrir.
  const [donationId] = useState<string | null>(pagoOk ? searchParams.get("donacionId") : null);
  const [donationPaying, setDonationPaying] = useState(false);
  const [donationError, setDonationError] = useState("");

  useEffect(() => {
    if (!pagoOk && !pagoNoCerrado) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("pago");
    url.searchParams.delete("orden");
    url.searchParams.delete("donacionId");
    /* `history.replaceState` y no `router.replace`: con el router la dirección
       NO se limpiaba (pedía la página de nuevo al servidor y quedaba con
       `?pago=ok`), así que al recargar volvía a salir "¡Compra realizada!". Next
       sincroniza `replaceState` con `useSearchParams`, y no hace falta volver a
       pedirle nada al servidor. */
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, [pagoOk, pagoNoCerrado]);

  /* Pide turno en el turnero de la tienda (`lib/interrupcion-tienda`), con la
     prioridad más alta: el flyer de ofertas espera a que se cierre esto. Sin
     turno, el flyer salía encima y tapaba "Reintentar el pago". */
  const abierto = !!vuelta || !!orderId;
  const [conTurno, setConTurno] = useState(false);
  useEffect(() => {
    if (!abierto) return;
    const liberar = pedirTurno("vuelta-de-pago", () => setConTurno(true));
    return () => { liberar(); setConTurno(false); };
  }, [abierto]);

  // Escape cierra cualquiera de los dos avisos, tenga o no el foco adentro.
  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") { setVuelta(null); setOrderId(null); } };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [abierto]);

  /** Vuelve a abrir MercadoPago para el MISMO pedido (no crea otro). */
  async function reintentarPago() {
    if (reintentando || !vuelta) return;
    setReintentando(true);
    setErrorReintento("");
    try {
      const res = await fetch("/api/mp/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: vuelta.orderId, donationId: vuelta.donationId ?? undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) throw new Error("Este pedido ya no está pendiente: puede que ya se haya pagado o que haya vencido. Revisá tu mail.");
      if (!res.ok || !data.initPoint) throw new Error(data.error || "No se pudo abrir MercadoPago. Intentá de nuevo.");
      window.location.href = data.initPoint;
    } catch (e) {
      setErrorReintento(e instanceof Error ? e.message : "No se pudo abrir MercadoPago. Intentá de nuevo.");
      setReintentando(false);
    }
  }

  async function payDonation() {
    if (donationPaying || !donationId) return;
    setDonationPaying(true);
    setDonationError("");
    try {
      const res = await fetch("/api/canasta/donation-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donationId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.checkoutUrl) throw new Error(data.error || "No se pudo iniciar el pago de la donación");
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setDonationError(e instanceof Error ? e.message : "No se pudo iniciar el pago de la donación");
      setDonationPaying(false);
    }
  }

  if (!conTurno) return null;

  if (vuelta) {
    const esError = vuelta.tipo === "error";
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 px-4" style={{ zIndex: CAPAS.modal }}
        role="dialog" aria-modal="true" aria-labelledby="vuelta-pago-titulo">
        <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
          <button onClick={() => setVuelta(null)} className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center text-gray-400 hover:text-gray-600 transition-colors" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full ${esError ? "bg-amber-50" : "bg-sky-50"}`}>
              {esError ? <AlertTriangle className="h-9 w-9 text-amber-500" /> : <Clock className="h-9 w-9 text-sky-500" />}
            </div>
            <div>
              <h2 id="vuelta-pago-titulo" className="text-lg font-bold text-gray-900">
                {esError ? "No se completó el pago" : "Tu pago está en proceso"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {esError
                  ? "Tu pedido quedó guardado y los productos reservados por 48 horas. Podés reintentar con otra tarjeta u otro medio de pago."
                  : "Si elegiste pagar en efectivo (Rapipago, Pago Fácil), se acredita cuando lo abones: tenés hasta 7 días. Te avisamos por mail apenas se acredite."}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2">
              <ShoppingBag className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="text-xs text-gray-500">
                N° de orden: <span className="font-mono font-semibold text-gray-700">{vuelta.orderId.slice(-8).toUpperCase()}</span>
              </span>
            </div>
            {esError && (
              <button onClick={reintentarPago} disabled={reintentando}
                className="w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {reintentando && <Loader2 className="h-4 w-4 animate-spin" />}
                {reintentando ? "Abriendo MercadoPago..." : "Reintentar el pago"}
              </button>
            )}
            {errorReintento && <p role="alert" className="text-xs text-red-600">{errorReintento}</p>}
            <button onClick={() => setVuelta(null)}
              className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-colors ${esError ? "text-gray-600 hover:bg-gray-50" : "bg-sky-500 text-white hover:bg-sky-600"}`}>
              {esError ? "Ahora no" : "Entendido"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!orderId) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 px-4" style={{ zIndex: CAPAS.modal }}>
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <button
          onClick={() => setOrderId(null)}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle className="h-9 w-9 text-emerald-500" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900">¡Compra realizada!</h2>
            <p className="mt-1 text-sm text-gray-500">
              Tu pedido fue registrado. Te enviamos un email con el resumen. El vendedor te contactará para coordinar el envío.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2">
            <ShoppingBag className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="text-xs text-gray-500">
              N° de orden: <span className="font-mono font-semibold text-gray-700">{orderId.slice(-8).toUpperCase()}</span>
            </span>
          </div>

          <p className="text-xs text-gray-400 text-center leading-relaxed">
            ¿Algún problema? Respondé el email de confirmación o contactá al vendedor directamente.
            Tenés <strong>10 días corridos</strong> para solicitar cancelación (Ley 24.240).
          </p>

          {donationId && (
            <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-left">
              <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5 mb-1">
                <HeartHandshake className="h-4 w-4" /> Te falta completar tu donación
              </p>
              <p className="text-xs text-amber-700 mb-2">Es un pago aparte, no afecta tu compra recién confirmada.</p>
              <button
                onClick={payDonation}
                disabled={donationPaying}
                className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 py-2 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
              >
                {donationPaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartHandshake className="h-4 w-4" />}
                {donationPaying ? "Redirigiendo..." : "Completar donación"}
              </button>
              {donationError && <p className="text-xs text-red-600 mt-1.5">{donationError}</p>}
            </div>
          )}

          <button
            onClick={() => setOrderId(null)}
            className="mt-1 w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
          >
            Continuar comprando
          </button>
        </div>
      </div>
    </div>
  );
}
