import Link from "next/link";
import { Film, TrendingUp, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-session";
import BotonVolver from "../BotonVolver";

/**
 * Marketing: lo que se hace para vender más de lo que ya está cargado.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ ACÁ NO VAN HERRAMIENTAS QUE NO EXISTEN
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Es el mismo criterio que la barra: una tarjeta apagada que dice "próximamente"
 * se lee como que el panel está a medio hacer. Cuando haya una herramienta más,
 * se agrega su tarjeta acá; hasta entonces esta lista es corta y es honesta.
 *
 * ── Por qué los upsells post-compra aparecen acá si ya existían ────────────
 *
 * Porque existían y **nadie sabía que existían**. La oferta de después de pagar
 * está hecha desde hace rato —es "el agregado" de `comprar/route.ts`: cuando
 * llega el identificador de una compra confirmada se cobran sólo los upsells,
 * sin el principal ni los bonos, porque eso ya lo pagó— pero se carga adentro de
 * la tarjeta del producto, tres pantallazos abajo. Una función que no se
 * encuentra es una función que no se usa.
 *
 * Así que la tarjeta no lleva a una pantalla nueva: lleva a Productos, que es
 * donde se cargan. Lo que se arregla acá es el camino, no la función.
 */

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;

  const herramientas = [
    {
      href: "/digitales/marketing/reels",
      Icon: Film,
      titulo: "Contenido para reels",
      que: "Videos que podés usar gratis en reels, publicaciones y anuncios. Se buscan solos sobre lo que vendés.",
      accion: "Buscar videos",
    },
    {
      href: "/digitales/productos",
      Icon: TrendingUp,
      titulo: "Upsells post-compra",
      que: "La oferta que aparece después de pagar, con su propio precio. Ya está andando: se carga en cada producto, abajo de los bonos.",
      accion: "Ir a Productos",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8">
      <BotonVolver />

      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 panel-oscuro:text-gray-100">Marketing</h1>
        <p className="mt-1 text-sm leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
          Lo que sirve para vender más de lo que ya tenés cargado.
        </p>
      </div>

      <div className="space-y-3">
        {herramientas.map(({ href, Icon, titulo, que, accion }) => (
          <Link
            key={titulo}
            href={href}
            className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-orange-300 hover:bg-orange-50/40 panel-oscuro:border-gray-700 panel-oscuro:bg-gray-900 panel-oscuro:hover:border-orange-500/40 panel-oscuro:hover:bg-orange-500/5"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 panel-oscuro:bg-orange-500/10">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold text-gray-900 panel-oscuro:text-gray-100">
                {titulo}
              </span>
              <span className="mt-0.5 block text-[12.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                {que}
              </span>
              <span className="mt-2 flex items-center gap-1 text-[12.5px] font-bold text-orange-600">
                {accion}
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
