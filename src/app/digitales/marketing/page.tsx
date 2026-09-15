import Link from "next/link";
import { Film, TrendingUp, ArrowRight, Share2, BarChart3, Ticket } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { medicionDeLaTienda } from "@/lib/medicion-digital";
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

  /* Si hay píxel en la cuenta, para decirlo en la tarjeta. El de cada
     producto no se mira acá: es una tarjeta, no un informe. */
  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { storeConfig: true } });
  const medicion = medicionDeLaTienda(store?.storeConfig);
  const hayPixel = !!medicion.pixelId;

  const herramientas = [
    {
      href: "/digitales/marketing/enlaces",
      Icon: Share2,
      titulo: "Enlaces para compartir",
      que: "El link de cada producto para Instagram, WhatsApp, Facebook, TikTok, YouTube y mail, con la etiqueta puesta. Después en Estadísticas ves cuál trae ventas.",
      accion: "Armar los links",
    },
    {
      href: "/digitales/marketing/cupones",
      Icon: Ticket,
      titulo: "Cupones de descuento",
      que: "Un código que la persona escribe al pagar: para un lanzamiento, para quien ya te compró, o para cerrar a quien preguntó y no se decidió.",
      accion: "Crear un cupón",
    },
    {
      href: "/digitales/configuracion?tab=meta",
      Icon: BarChart3,
      titulo: "Píxel de Meta y Analytics",
      que: hayPixel
        ? "Tu píxel está puesto: mide la página, el pago y cada compra confirmada. Si un producto tiene su propia cuenta de anuncios, se le pone el suyo desde su Dirección."
        : "Todavía no pusiste el píxel. Sin él, Meta no ve qué anuncio vendió y no puede volver a mostrarle tu página a quien la vio y no compró.",
      accion: hayPixel ? "Ver la configuración" : "Poner el píxel",
    },
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
