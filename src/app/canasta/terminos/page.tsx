import Link from "next/link";
import { ArrowLeft, HeartHandshake, ShieldCheck } from "lucide-react";

const PUNTOS = [
  "Es un aporte voluntario. No es el pago de un producto ni de un servicio — por eso no aplica el derecho de arrepentimiento de la Ley 24.240 ni las garantías legales de productos.",
  "Las donaciones son no reembolsables, salvo error de cobro comprobado.",
  "El dinero donado va directo a la cuenta de TiendaApps y se destina exclusivamente al objetivo de la campaña correspondiente (la canasta de alimentos, o la causa puntual que se describe en esa campaña). Nunca va a la cuenta de una tienda, aunque hayas donado desde el carrito de una compra.",
  "Donar no te da derecho a recibir nada a cambio ni ningún premio: funciona como una colecta solidaria (igual que una donación a la Cruz Roja o a un banco de alimentos). El equipo de TiendaApps decide quién recibe lo recaudado en cada campaña (una familia que lo necesite, o la persona/causa descripta en una Causa Libre) — nunca es uno de los donantes.",
  "Mínimo $1.000 por donación, y un máximo del 20% de la meta de la campaña por persona (cuando la campaña tiene una meta definida) — para que la campaña sea un aporte de toda la comunidad y no la financie una sola persona.",
  "Una donación confirmada por persona, por campaña.",
  "TiendaApps puede modificar, pausar o cancelar una campaña en cualquier momento, informando a los donantes por email ante cambios relevantes.",
  "Para consultas o reclamos sobre una donación, escribinos a tiendaapps.solidaria@gmail.com",
];

export default function TerminosCanastaPage() {
  return (
    <div className="min-h-screen bg-[#FFFBF5] text-gray-900">
      <div className="border-b border-amber-900/10 px-6 py-5 grid grid-cols-3 items-center sticky top-0 bg-[#FFFBF5]/90 backdrop-blur-xl z-10">
        <Link
          href="/comunidad"
          aria-label="Volver"
          className="w-9 h-9 rounded-full border border-amber-900/10 bg-white flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-amber-50 transition-colors justify-self-start"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Link href="/" className="text-sm font-bold text-gray-900 justify-self-center hover:text-amber-700 transition-colors">TiendaApps</Link>
        <div className="flex items-center gap-2 text-amber-700 justify-self-end">
          <HeartHandshake className="h-5 w-5" />
          <span className="text-sm font-semibold hidden sm:inline">Términos de la donación</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center gap-2.5 mb-3">
          <ShieldCheck className="h-5 w-5 text-green-700" />
          <h1 className="text-2xl font-bold text-gray-900">Términos de la donación</h1>
        </div>
        <p className="text-sm text-gray-500 mb-8">
          Esto aplica a cualquier persona que done a una campaña de Canasta Solidaria o de Causa Libre, tenga o no una cuenta en TiendaApps.
          Última actualización: junio 2026.
        </p>

        <div className="space-y-3">
          {PUNTOS.map((p) => (
            <div key={p} className="flex items-start gap-3 rounded-xl border border-amber-900/10 bg-white p-4">
              <ShieldCheck className="h-4 w-4 text-green-700 mt-0.5 shrink-0" />
              <p className="text-sm text-gray-600 leading-relaxed">{p}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-8 text-center">
          Estos términos forman parte de los{" "}
          <Link href="/terminos?role=buyer" className="text-amber-700 underline hover:text-amber-800">
            Términos y Condiciones generales de TiendaApps
          </Link>.
        </p>
      </div>
    </div>
  );
}
