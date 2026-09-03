import Link from "next/link";
import { Sparkles, UserRound, Package, Receipt, ArrowRight } from "lucide-react";

/* El inicio del panel.
 *
 * ── Lo que decía antes, y por qué se cambió ─────────────────────────────────
 *
 * Decía "estamos terminando las pantallas para cargar tu primer producto
 * digital". Era cierto el día que se escribió y dejó de serlo cuando aparecieron
 * Productos, la página de venta, el checkout y Ventas — pero el texto se quedó.
 * O sea que la primera pantalla del panel le decía a alguien que acababa de
 * pagar que todavía no podía hacer nada, con todo andando al lado.
 *
 * Es el mismo error que ya se corrigió acá abajo una vez ("te avisamos por
 * email", cuando no había ningún código que mandara ese mail): una pantalla que
 * promete o niega de más envejece sola. Por eso ahora esto no describe el estado
 * de la obra — sólo lleva a lo que hay.
 *
 * Los pasos de bienvenida —el asistente de la primera vez— van justo acá cuando
 * exista. Hoy la lista de tres alcanza y no miente.
 *
 * No lleva `min-h-screen`: el scroll ahora vive en el `<main>` del layout, al
 * lado de la barra lateral. Con la altura forzada acá quedaban dos barras de
 * desplazamiento, una adentro de la otra. */

/* El orden es el del trabajo, no el del menú: primero se carga, después se
   vende, y lo de la persona va al final. */
const ATAJOS = [
  {
    href: "/digitales/productos",
    Icon: Package,
    titulo: "Tus productos",
    bajada: "Cargá tu ebook, armá su página de venta, sus bonos y sus upsells",
  },
  {
    href: "/digitales/ventas",
    Icon: Receipt,
    titulo: "Tus ventas",
    bajada: "Qué se cobró, quién lo compró y si llegó a bajar el archivo",
  },
  {
    href: "/digitales/mi-cuenta",
    Icon: UserRound,
    titulo: "Mi cuenta",
    bajada: "Tu plan, la comisión, tus datos y los 7 días de prueba",
  },
];

export default function DigitalesPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-10">

      <div className="text-center">
        <div className="w-14 h-14 bg-orange-100 panel-oscuro:bg-orange-500/15 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Sparkles className="h-7 w-7 text-orange-600" />
        </div>

        <h1 className="text-3xl font-black text-gray-950 panel-oscuro:text-gray-50 mb-3">
          Tu cuenta ya está lista
        </h1>
        <p className="text-gray-500 panel-oscuro:text-gray-400 leading-relaxed">
          Cargá tu producto, publicá su página y cobrá con Mercado Pago. La entrega del
          archivo la hacemos nosotros: apenas se acredita el pago, sale solo.
        </p>
      </div>

      <div className="mt-8 space-y-3">
        {ATAJOS.map(({ href, Icon, titulo, bajada }) => (
          <Link
            key={href}
            href={href}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl border border-orange-200 panel-oscuro:border-orange-500/30 bg-white panel-oscuro:bg-gray-900 hover:border-orange-400 hover:shadow-md transition-all group"
          >
            <div className="flex min-w-0 items-center gap-3 text-left">
              <div className="w-10 h-10 bg-orange-100 panel-oscuro:bg-orange-500/15 rounded-xl flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">{titulo}</p>
                <p className="text-xs text-gray-500 panel-oscuro:text-gray-400">{bajada}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-orange-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ))}

        {/* Decía "te avisamos por email" y no había ningún código que mandara ese
            mail: era una promesa que nadie iba a cumplir, escrita en la primera
            pantalla que ve alguien que acaba de confiarnos sus datos. Ahora dice
            sólo lo que es cierto. */}
        <div className="bg-white panel-oscuro:bg-gray-900 border border-gray-100 panel-oscuro:border-gray-800 rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100 mb-1">Tu cuenta queda guardada</p>
          <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 leading-relaxed">
            Podés cerrar esta página y volver cuando quieras: el plan Free no vence, así que no
            hay nada que se te pase.
          </p>
        </div>
      </div>
    </div>
  );
}
