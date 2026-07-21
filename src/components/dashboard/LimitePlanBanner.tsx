"use client";

import Link from "next/link";
import { AlertTriangle, Crown } from "lucide-react";

/**
 * El aviso cuando una tienda Pro llega a uno de sus topes.
 *
 * Está compartido a propósito: los tres topes (cupones, promociones, afiliados)
 * son la misma situación y antes cada pantalla la resolvía distinto — promociones
 * tenía un cartel completo con link, cupones decía "llegaste al tope" y nada más,
 * y afiliados no avisaba nada hasta que el backend rebotaba la acción. Con tres
 * copias distintas, mejorar el texto en una no mejoraba las otras.
 *
 * Siempre ofrece las DOS salidas, en este orden: primero cómo seguir sin pagar
 * (liberar un lugar), después Premium. Al revés parece un peaje.
 */
export default function LimitePlanBanner({
  titulo,
  comoLiberar,
  queGanas,
}: {
  /** Qué tope se alcanzó, en una línea. Ej. "Llegaste a las 5 promociones del plan Tienda Pro". */
  titulo: string;
  /** Cómo hacer lugar sin pagar. Es la salida gratis, va primero. */
  comoLiberar: React.ReactNode;
  /** Qué cambia con Premium, concreto. Ej. "promociones sin límite". */
  queGanas: string;
}) {
  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-amber-900">{titulo}</p>
          <p className="mt-0.5 leading-relaxed text-amber-800">{comoLiberar}</p>
        </div>
      </div>

      {/* Un botón de verdad y no un link en el medio del párrafo: si la salida
          paga está escondida en el texto, nadie la ve. `upgrade=premium` hace que
          "Mi plan" abra el pago directo, sin un paso extra de buscar el botón. */}
      <Link
        href="/dashboard/mi-plan?upgrade=premium"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 sm:w-auto"
      >
        <Crown className="h-4 w-4" />
        Pasar a Premium y tener {queGanas}
      </Link>
    </div>
  );
}
