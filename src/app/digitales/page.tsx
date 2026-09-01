import Link from "next/link";
import { Sparkles } from "lucide-react";

/* La pantalla mínima que cierra el circuito del registro.
 *
 * Se entra acá recién creada la cuenta, así que tiene que decir la verdad: la
 * cuenta existe, es Free y no vence, y el panel se está construyendo. Los pasos
 * de bienvenida van justo acá cuando estén definidos. */
export default function DigitalesPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg text-center">
        <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Sparkles className="h-7 w-7 text-orange-600" />
        </div>

        <h1 className="text-3xl font-black text-gray-950 mb-3">Tu cuenta ya está lista</h1>
        <p className="text-gray-500 leading-relaxed mb-6">
          Estás en el plan <strong className="text-gray-700">Free</strong>: es gratis, no vence y no
          te pedimos ninguna tarjeta. Estamos terminando el panel para cargar tu primer producto
          digital y armar su página de venta.
        </p>

        {/* Decía "te avisamos por email" y no había ningún código que mandara
            ese mail: era una promesa que nadie iba a cumplir, escrita en la
            primera pantalla que ve alguien que acaba de confiarnos sus datos.
            Ahora dice sólo lo que es cierto. */}
        <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-5 text-left">
          <p className="text-sm font-bold text-gray-900 mb-1">Tu cuenta queda guardada</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Podés cerrar esta página y volver cuando quieras: el plan Free no vence, así que no hay
            nada que se te pase.
          </p>
        </div>

        <Link
          href="/"
          className="inline-block mt-7 text-sm text-orange-600 font-bold hover:text-orange-700 transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
