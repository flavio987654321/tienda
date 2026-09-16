import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { MAX_PRODUCTOS_DIGITALES_CREADOS } from "@/lib/planLimits";
import { dominioDeLaPlataforma } from "@/lib/configuracion-digital";
import type { ProductoParaCompartir } from "@/lib/enlaces-compartir";
import BotonVolver from "../../BotonVolver";
import EnlacesClient from "./EnlacesClient";

/**
 * Enlaces para compartir: el link de cada producto para cada lugar donde se
 * comparte, con la etiqueta UTM ya puesta.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * Estadísticas → Campañas cuenta de dónde viene cada visita y cada venta, pero
 * sólo si el link trae `?utm_source=...`. Se construyó todo eso y después se
 * miró la pantalla de Marketing: dos tarjetas, y ningún lugar donde sacar un
 * link etiquetado. Nadie va a escribir `?utm_source=instagram&utm_medium=bio`
 * a mano en el celular. Esta pantalla es el otro extremo del cable.
 *
 * Es de todos los planes: el link es un link. Lo que se paga es VER los
 * números (Campañas es de Pro), y quien comparte con etiqueta desde Free ya
 * tiene la historia guardada para el día que suba.
 */

export const dynamic = "force-dynamic";

export default async function EnlacesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;

  /* Sólo los principales vivos de quien mira. Un bono no tiene página que
     compartir. Los borradores también van: se avisa que hay que publicar. */
  const productos: ProductoParaCompartir[] = await prisma.product.findMany({
    where: { rolDigital: "PRINCIPAL", deletedAt: null, store: { ownerId: user.id } },
    orderBy: { createdAt: "asc" },
    take: MAX_PRODUCTOS_DIGITALES_CREADOS,
    select: { id: true, name: true, slugDigital: true, dominioPropio: true, isActive: true },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8">
      <BotonVolver href="/digitales/marketing">Volver a Marketing</BotonVolver>

      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 panel-oscuro:text-gray-100">Enlaces para compartir</h1>
        <p className="mt-1 text-sm leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
          El link de tu página para cada lugar, con la etiqueta puesta. Copiá el de cada canal y después
          en Estadísticas ves cuál trae visitas y cuál trae ventas.
        </p>
      </div>

      <EnlacesClient
        productos={productos}
        dominioPlataforma={dominioDeLaPlataforma()}
        appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "https://www.tiendaapps.com"}
      />
    </div>
  );
}
