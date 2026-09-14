"use client";

import { Wallet, Check, AlertTriangle, Loader2, ExternalLink } from "lucide-react";
import { Seccion } from "./piezas";
import { COPY_DIGITAL, type TierDigital } from "@/lib/planes-digitales";
import { COMISION_DIGITAL } from "@/lib/planLimits";

type Props = {
  tier: TierDigital;
  cobroConectado: boolean;
  conectadoEl: string | null;
  avisoMp: "connected" | "error" | null;
  guardando: string | null;
  desconectar: () => void;
};

/**
 * La pestaña Pagos.
 *
 * Es la que más importa del panel: sin esto no entra un peso, por más productos
 * publicados que haya.
 *
 * ── Por qué no hay elegir moneda ─────────────────────────────────────────────
 * La competencia arranca preguntando en qué moneda cobrás (pesos, dólares o
 * multidivisa) porque vende en todo el mundo. Nosotros cobramos en pesos y
 * punto, y ya está decidido por qué: un argentino que paga en dólares con
 * tarjeta local paga **más de lo que dice la pantalla** por las percepciones, y
 * esa diferencia se la queda AFIP. Un paso con una sola respuesta no es un paso.
 *
 * ── Por qué no hay transferencia ─────────────────────────────────────────────
 * Hubo una sección entera acá, con CBU, alias e indicaciones, desde el 01/09
 * hasta el 14/09/26 — y el checkout nunca la ofreció. Se decidió sacarla en vez
 * de terminarla: con transferencia la entrega deja de ser automática, la
 * comisión no se puede retener (no pasa un peso por la plataforma) y todo lo
 * que sigue —anotar deudas, confirmar a mano, reclamos— es exactamente el
 * quilombo que este ecosistema evita. **El único medio es Mercado Pago**, y eso
 * es lo que hace que el archivo salga solo apenas se aprueba el pago.
 */
export default function TabPagos({
  tier, cobroConectado, conectadoEl, avisoMp, guardando, desconectar,
}: Props) {
  const comision = COMISION_DIGITAL[tier];

  return (
    <div className="space-y-5">
      {/* ── Mercado Pago ───────────────────────────────────────────────────── */}
      <Seccion
        Icono={Wallet}
        titulo="Mercado Pago"
        bajada="La plata de cada venta entra a tu cuenta. Nosotros no la tocamos."
      >
        {avisoMp === "connected" && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-emerald-50 panel-oscuro:bg-emerald-500/10 border border-emerald-100 panel-oscuro:border-emerald-500/25 px-4 py-3">
            <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-800 panel-oscuro:text-emerald-200 font-medium">Listo, ya podés cobrar.</p>
          </div>
        )}
        {avisoMp === "error" && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 panel-oscuro:bg-red-500/10 border border-red-100 panel-oscuro:border-red-500/25 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 panel-oscuro:text-red-300 font-medium">
              No se pudo conectar. Probá de nuevo; si vuelve a fallar, escribinos.
            </p>
          </div>
        )}

        {/* La comisión se dice ACÁ, al lado del botón que conecta el cobro, y no
            escondida en una página de precios: es el momento en que la pregunta
            "¿cuánto me cobran?" está de verdad en la cabeza. */}
        <div className="rounded-2xl bg-gray-50 panel-oscuro:bg-gray-800/50 border border-gray-100 panel-oscuro:border-gray-800 px-4 py-3.5 mb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">Tu comisión: {comision}% por venta</p>
            <p className="text-xs text-gray-500 panel-oscuro:text-gray-400">Plan {COPY_DIGITAL[tier].nombre}</p>
          </div>
          <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-1.5 leading-relaxed">
            Se descuenta sola en cada cobro. No hay factura aparte ni nada que pagar después.
          </p>
          {/* Se dice acá y no se deja adivinar: quien viene de vender por
              Instagram pregunta por la transferencia. La respuesta es que no, y
              el motivo que le importa es el de la entrega. */}
          <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-1.5 leading-relaxed">
            Es el único medio de cobro. Así el archivo sale solo apenas se aprueba el pago, sin que
            tengas que confirmar nada a mano.
          </p>
        </div>

        {cobroConectado ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-50 panel-oscuro:bg-emerald-500/10 panel-oscuro:bg-emerald-500/100 shrink-0" />
              <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">Conectado</p>
              {conectadoEl && (
                <span className="text-xs text-gray-400 panel-oscuro:text-gray-500">
                  desde el {new Date(conectadoEl).toLocaleDateString("es-AR")}
                </span>
              )}
            </div>
            <button
              onClick={desconectar}
              disabled={guardando !== null}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-sm font-bold text-gray-600 panel-oscuro:text-gray-400 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              {guardando === "cobro" && <Loader2 className="h-4 w-4 animate-spin" />}
              Desconectar
            </button>
          </div>
        ) : (
          <>
            {/* El aviso va ANTES del botón y no después de publicar: enterarse de
                que no podés cobrar cuando alguien ya quiso comprarte es
                enterarse tarde. */}
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 panel-oscuro:bg-amber-500/10 border border-amber-100 panel-oscuro:border-amber-500/25 px-4 py-3 mb-4">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 panel-oscuro:text-amber-200 font-medium leading-relaxed">
                Sin esto no podés cobrar. Aunque publiques una página, nadie va a poder comprarte.
              </p>
            </div>
            <a
              href="/api/mp/oauth/connect"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-orange-600 text-white text-sm font-bold hover:bg-orange-500 transition-colors shadow-lg shadow-orange-200"
            >
              Conectar Mercado Pago
              <ExternalLink className="h-4 w-4" />
            </a>
          </>
        )}
      </Seccion>

    </div>
  );
}
