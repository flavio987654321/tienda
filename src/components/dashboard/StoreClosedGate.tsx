"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Power, Loader2, Check } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

/**
 * Lo que ve la dueña en su panel cuando su tienda está cerrada.
 *
 * Va ANTES que SubscriptionGate en el layout, y no es un detalle: cerrar deja la
 * suscripción en CANCELLED, y SubscriptionGate dispara con EXPIRED || CANCELLED
 * un modal `fixed inset-0` que tapa todo el dashboard con "Tu suscripción venció
 * — Renová". O sea que sin esto, la dueña cerraba su tienda a propósito y se comía
 * un paywall que le miente (no venció nada) y que además le tapaba el botón de
 * reactivar. Tiendanube hace justo esto: te deja entrar y te muestra el estado
 * real.
 *
 * `credit` llega solo si le quedan días de verdad —pagos o de prueba—, y sale
 * del mismo `reactivationCredit` que usa el endpoint al escribir. Con días vuelve
 * sin pagar; sin días va a tener que suscribirse. La pantalla tiene que decir
 * cuál de las dos: antes prometía "vas a poder elegir un plan" y lo que aparecía
 * después era un candado de "tu suscripción venció".
 */
export default function StoreClosedGate({
  closedAt,
  credit,
}: {
  closedAt: string;
  credit: { status: "ACTIVE" | "TRIAL"; until: string } | null;
}) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const { signOut } = useAuth();
  // Doble click: el estado solo no alcanza, dos clicks seguidos pueden pasar
  // los dos antes del primer re-render.
  const sending = useRef(false);

  const fmtFecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

  const fecha = fmtFecha(closedAt);

  async function reactivar() {
    if (sending.current) return;
    sending.current = true;
    setLoading(true);
    setErrorMsg("");
    try {
      const r = await fetch("/api/tienda/reactivar", { method: "POST" });
      if (r.ok) {
        window.location.href = "/dashboard";
        return;
      }
      const err = (await r.json().catch(() => ({}))) as { error?: string };
      setErrorMsg(err.error ?? "No pudimos reactivar tu tienda. Intentá de nuevo.");
    } catch {
      setErrorMsg("Error de conexión. Intentá de nuevo.");
    }
    sending.current = false;
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-100/90 backdrop-blur-md p-4 [color-scheme:light]">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Power className="h-6 w-6 text-gray-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Tu tienda está cerrada</h2>
        <p className="text-gray-500 text-sm mb-5 leading-relaxed">
          La cerraste el {fecha}. Está todo guardado tal cual lo dejaste.
        </p>

        <ul className="text-left bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 mb-5 space-y-1.5">
          {["Tu diseño y tus productos", "Tus fotos y tu historial", "Tus afiliadas recuperan su lugar"].map((t) => (
            <li key={t} className="flex items-start gap-2 text-[13px] text-gray-700">
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
              {t}
            </li>
          ))}
        </ul>

        {errorMsg && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4">{errorMsg}</p>
        )}

        <button
          onClick={reactivar}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors mb-3"
        >
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Reactivando…</> : <><Power className="h-4 w-4" /> Reactivar mi tienda</>}
        </button>
        <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
          {credit
            ? credit.status === "ACTIVE"
              ? `Tenés la suscripción paga hasta el ${fmtFecha(credit.until)}: volvés sin pagar de nuevo. Después la publicás cuando quieras.`
              : `Te queda prueba gratis hasta el ${fmtFecha(credit.until)}: volvés sin pagar. Después la publicás cuando quieras.`
            : "Al reactivarla vas a tener que elegir un plan para volver a publicarla."}
        </p>

        <Link href="/" className="block text-sm text-gray-400 hover:text-gray-600 transition-colors mb-3">
          Volver al inicio
        </Link>
        <button
          onClick={() => { if (!signingOut) { setSigningOut(true); signOut("/"); } }}
          disabled={signingOut}
          className="text-sm text-red-400 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
