import Link from "next/link";
import { Sparkles, CreditCard, ArrowRight } from "lucide-react";

/* El inicio del panel.
 *
 * Se entra acá recién creada la cuenta, así que tiene que decir la verdad: la
 * cuenta existe, anda, y las pantallas para cargar productos todavía se están
 * construyendo. Lo único que ya funciona de punta a punta es Mi plan, y por eso
 * es lo único que ofrece.
 *
 * Los pasos de bienvenida —el asistente de la primera vez— van justo acá cuando
 * exista el modelo de producto digital: sin él, un asistente que pide "cargá tu
 * primer producto" no tiene a dónde guardarlo.
 */
export default function DigitalesPage() {
  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-10">

        <div className="text-center">
          <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Sparkles className="h-7 w-7 text-orange-600" />
          </div>

          <h1 className="text-3xl font-black text-gray-950 mb-3">Tu cuenta ya está lista</h1>
          <p className="text-gray-500 leading-relaxed">
            Estamos terminando las pantallas para cargar tu primer producto digital y armar su
            página de venta. Mientras tanto, tu plan ya se puede ver y cambiar.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <Link
            href="/digitales/mi-plan"
            className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl border border-orange-200 bg-white hover:border-orange-400 hover:shadow-md transition-all group"
          >
            <div className="flex min-w-0 items-center gap-3 text-left">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900">Mi plan</p>
                <p className="text-xs text-gray-500">Tu plan, la comisión y los 7 días de prueba</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-orange-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {/* Decía "te avisamos por email" y no había ningún código que mandara
              ese mail: era una promesa que nadie iba a cumplir, escrita en la
              primera pantalla que ve alguien que acaba de confiarnos sus datos.
              Ahora dice sólo lo que es cierto. */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-bold text-gray-900 mb-1">Tu cuenta queda guardada</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Podés cerrar esta página y volver cuando quieras: el plan Free no vence, así que no
              hay nada que se te pase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
