"use client";

import {
  Wallet, Check, AlertTriangle, Loader2, ExternalLink, Landmark, Lock, ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { Seccion, BotonGuardar, Etiqueta, Ayuda, CLASE_INPUT } from "./piezas";
import { COPY_DIGITAL, type TierDigital } from "@/lib/planes-digitales";
import { COMISION_DIGITAL, TRANSFERENCIA_DIGITAL } from "@/lib/planLimits";
import { LARGO_TITULAR, LARGO_ALIAS, LARGO_BANCO, LARGO_INSTRUCCIONES } from "@/lib/datos-bancarios";

export type DatosTransferencia = {
  enabled: boolean;
  titular: string;
  cbu: string;
  alias: string;
  banco: string;
  instrucciones: string;
};

type Props = {
  tier: TierDigital;
  cobroConectado: boolean;
  conectadoEl: string | null;
  avisoMp: "connected" | "error" | null;
  guardando: string | null;
  listo: string | null;
  desconectar: () => void;
  tr: DatosTransferencia;
  setTr: (v: DatosTransferencia) => void;
  guardar: (seccion: string, cuerpo: Record<string, unknown>) => void;
  problemaTr: string | null;
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
 */
export default function TabPagos({
  tier, cobroConectado, conectadoEl, avisoMp, guardando, listo, desconectar,
  tr, setTr, guardar, problemaTr,
}: Props) {
  const comision = COMISION_DIGITAL[tier];
  const puedeTransferencia = TRANSFERENCIA_DIGITAL[tier];

  const campo = (k: keyof DatosTransferencia, v: string | boolean) => setTr({ ...tr, [k]: v });

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

      {/* ── Transferencia bancaria ─────────────────────────────────────────── */}
      <Seccion
        Icono={Landmark}
        titulo="Transferencia bancaria"
        bajada="Que te depositen directo a tu cuenta, sin pasar por Mercado Pago."
      >
        {!puedeTransferencia ? (
          /* ── El candado de Free ────────────────────────────────────────────
             Se explica el motivo de verdad en vez de decir "mejorá tu plan".
             Free no cobra abono: lo único que deja es la comisión, y esa comisión
             vive adentro del cobro de Mercado Pago. Con una transferencia no
             pasa un peso por la plataforma, así que no hay de dónde retenerla.
             Decirlo así es más honesto que un candado sin explicación, y además
             se entiende por qué en Starter sí se puede. */
          <div className="rounded-2xl bg-gray-50 panel-oscuro:bg-gray-800/50 border border-gray-100 panel-oscuro:border-gray-800 px-4 py-4">
            <div className="flex items-start gap-2.5">
              <Lock className="h-4 w-4 text-gray-400 panel-oscuro:text-gray-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">Tu plan cobra sólo con Mercado Pago</p>
                <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-1 leading-relaxed">
                  En Free no cobramos abono: lo único que cobramos es el {comision}% de cada venta,
                  y ese porcentaje se descuenta adentro del cobro de Mercado Pago. En una
                  transferencia la plata va derecho a tu cuenta y no pasa por nosotros, así que no
                  hay nada que descontar.
                </p>
                <Link
                  href="/digitales/mi-cuenta"
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white panel-oscuro:bg-gray-900 border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-700 panel-oscuro:text-gray-300 hover:border-orange-300 hover:text-orange-600 transition-colors"
                >
                  Ver Starter y Pro
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ⚠️ EL aviso de esta sección, y va arriba de todo.
                Con Mercado Pago la entrega es automática: se confirma el pago y
                el archivo sale solo. Con transferencia NO: alguien tiene que
                mirar el banco y confirmar a mano. Quien prende esto sin saberlo
                se entera cuando un comprador reclama que pagó y no recibió
                nada. */}
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 panel-oscuro:bg-amber-500/10 border border-amber-100 panel-oscuro:border-amber-500/25 px-4 py-3 mb-4">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 panel-oscuro:text-amber-200 font-medium leading-relaxed">
                Con transferencia <span className="font-bold">la entrega no es automática</span>.
                Vas a tener que mirar tu banco y confirmar cada pago a mano para que se libere la
                descarga. Con Mercado Pago sale solo.
              </p>
            </div>

            <label className="flex items-start gap-3 mb-5 cursor-pointer">
              <input
                type="checkbox"
                checked={tr.enabled}
                onChange={(e) => campo("enabled", e.target.checked)}
                /* `accent-*` y no `text-*`: una casilla nativa no toma el color
                   del texto, así que con `text-orange-600` salía azul. */
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 panel-oscuro:border-gray-600 accent-orange-600 focus:ring-orange-400"
              />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">
                  Aceptar transferencia
                </span>
                <span className="block text-xs text-gray-500 panel-oscuro:text-gray-400 mt-0.5">
                  Quien te compra ve tus datos y te deposita.
                </span>
              </span>
            </label>

            <div className="mb-4">
              <Etiqueta htmlFor="titular">Titular de la cuenta</Etiqueta>
              <input
                id="titular"
                value={tr.titular}
                maxLength={LARGO_TITULAR}
                onChange={(e) => campo("titular", e.target.value)}
                placeholder="Juan Pérez"
                className={CLASE_INPUT}
              />
              <Ayuda>
                Es el nombre que ve en su homebanking quien te transfiere. Si no coincide, no manda
                la plata.
              </Ayuda>
            </div>

            <div className="mb-4">
              <Etiqueta htmlFor="cbu" opcional>CBU o CVU</Etiqueta>
              <input
                id="cbu"
                inputMode="numeric"
                value={tr.cbu}
                maxLength={30}
                onChange={(e) => campo("cbu", e.target.value)}
                placeholder="0000003100010000000001"
                className={`${CLASE_INPUT} font-mono`}
              />
              <Ayuda>22 números. Lo podés pegar con espacios, se limpia solo.</Ayuda>
            </div>

            <div className="mb-4">
              <Etiqueta htmlFor="alias" opcional>Alias</Etiqueta>
              <input
                id="alias"
                value={tr.alias}
                maxLength={LARGO_ALIAS}
                onChange={(e) => campo("alias", e.target.value)}
                placeholder="mis.guias.mp"
                className={CLASE_INPUT}
              />
              <Ayuda>Con el alias alcanza; el CBU es por si alguien lo prefiere.</Ayuda>
            </div>

            <div className="mb-4">
              <Etiqueta htmlFor="banco" opcional>Banco o billetera</Etiqueta>
              <input
                id="banco"
                value={tr.banco}
                maxLength={LARGO_BANCO}
                onChange={(e) => campo("banco", e.target.value)}
                placeholder="Mercado Pago"
                className={CLASE_INPUT}
              />
            </div>

            <div className="mb-5">
              <Etiqueta htmlFor="instr" opcional>Indicaciones</Etiqueta>
              <textarea
                id="instr"
                value={tr.instrucciones}
                maxLength={LARGO_INSTRUCCIONES}
                rows={3}
                onChange={(e) => campo("instrucciones", e.target.value)}
                placeholder="Mandame el comprobante por WhatsApp y te habilito la descarga."
                className={`${CLASE_INPUT} resize-y`}
              />
              <Ayuda>
                Se le muestran a quien te compra después de elegir transferencia. Decile qué hacer
                con el comprobante.
              </Ayuda>
            </div>

            {problemaTr && <p className="text-sm text-red-600 font-medium mb-3">{problemaTr}</p>}

            <div className="flex justify-end">
              <BotonGuardar
                id="transferencia"
                guardando={guardando}
                listo={listo}
                disabled={problemaTr !== null}
                onClick={() => guardar("transferencia", { transferencia: tr })}
              />
            </div>
          </>
        )}
      </Seccion>
    </div>
  );
}
