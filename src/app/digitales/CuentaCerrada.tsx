"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Power, Loader2, Check } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useIsPwa } from "@/hooks/useIsPwa";

/**
 * Lo que ve la dueña en su panel cuando su cuenta digital está cerrada
 * (`Store.closedAt`). Es el par de `StoreClosedGate` del panel de tiendas,
 * en la ropa de este panel: tapa todo, dice desde cuándo, qué se conserva,
 * y ofrece lo único que hay para hacer: reabrir.
 *
 * Va en el layout ANTES del recibimiento y de la barra: una cuenta cerrada
 * no tiene panel que mostrar. Ver `lib/cierre-digital`.
 */
export default function CuentaCerrada({ cerradaEl, vuelven }: {
  cerradaEl: string;
  /** Cuántas páginas vuelven a publicarse al reabrir. */
  vuelven: number;
}) {
  const [yendo, setYendo] = useState(false);
  const [error, setError] = useState("");
  const [saliendo, setSaliendo] = useState(false);
  const { signOut } = useAuth();
  /* Tapa bloqueante: adentro de la app instalada no hay barra de direcciones,
     así que un link que salga del `scope` deja a la persona sin forma de
     volver. Ver `SubscriptionGate`. */
  const enLaApp = useIsPwa();
  const enVuelo = useRef(false);

  const fecha = new Date(cerradaEl).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

  async function reabrir() {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setYendo(true);
    setError("");
    try {
      const r = await fetch("/api/digitales/reabrir", { method: "POST" });
      if (r.ok) {
        window.location.href = "/digitales/productos";
        return;
      }
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      setError(d.error ?? "No pudimos reabrir tu cuenta. Probá de nuevo.");
    } catch {
      setError("No pudimos conectarnos. Revisá tu internet e intentá de nuevo.");
    }
    enVuelo.current = false;
    setYendo(false);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-100/90 backdrop-blur-md p-4 [color-scheme:light]">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Power className="h-6 w-6 text-orange-600" />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Tu cuenta está cerrada</h2>
        <p className="text-gray-500 text-sm mb-5 leading-relaxed">
          La cerraste el {fecha}. Está todo guardado tal cual lo dejaste.
        </p>

        <ul className="text-left bg-green-50 border border-green-200 rounded-2xl p-3.5 mb-5 space-y-1.5">
          {[
            "Tus productos, archivos y páginas",
            "Tus dominios y tu historial de ventas",
            "Quien te compró sigue descargando lo suyo",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2 text-[13px] text-gray-700">
              <Check className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
              {t}
            </li>
          ))}
        </ul>

        {error && (
          <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4">{error}</p>
        )}

        <button
          type="button"
          onClick={() => void reabrir()}
          disabled={yendo}
          className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors mb-3"
        >
          {yendo ? <><Loader2 className="h-4 w-4 animate-spin" /> Reabriendo…</> : <><Power className="h-4 w-4" /> Reabrir mi cuenta</>}
        </button>
        <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
          {vuelven === 0
            ? "Al reabrir entrás a tu panel como estaba. No había páginas publicadas."
            : vuelven === 1
              ? "Al reabrir, tu página vuelve a estar en línea al instante, con el plan que tengas hoy."
              : `Al reabrir, tus ${vuelven} páginas vuelven a estar en línea al instante, con el plan que tengas hoy.`}
        </p>

        {!enLaApp && (
          <Link href="/" className="block text-sm text-gray-400 hover:text-gray-600 transition-colors mb-3">
            Volver al inicio
          </Link>
        )}
        <button
          type="button"
          onClick={() => { if (!saliendo) { setSaliendo(true); signOut(enLaApp ? "/digitales" : "/"); } }}
          disabled={saliendo}
          className="text-sm text-red-400 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
