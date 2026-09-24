import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { normalizarContenido } from "@/lib/pagina-venta";
import { leerEstadoDeLanding } from "@/lib/landing-estado";
import { laDireccionMuestraTuDiseno } from "@/lib/landing-del-producto";
import Link from "next/link";
import { LayoutTemplate, ArrowRight } from "lucide-react";
import BotonVolver from "../../../BotonVolver";
import { estadoDelCupo } from "@/lib/cupo-ia";
import type { TierDigital } from "@/lib/planes-digitales";
import EditorDePagina from "./EditorClient";

export const dynamic = "force-dynamic";

/**
 * El editor de la página de venta de un producto.
 *
 * ── Por qué cuelga del producto y no de la barra lateral ────────────────────
 *
 * Porque el diseño es POR PRODUCTO. La competencia puede poner "Diseño de
 * tienda" suelto en su menú porque arriba tiene un selector de tienda y cada
 * tienda es un embudo. Acá una cuenta Pro tiene hasta 5 páginas, cada una con su
 * propia dirección, así que un "Diseño" suelto en el menú no diría cuál de las 5
 * edita. Se entra desde la tarjeta del producto y no hay ambigüedad posible.
 *
 * ── La página no se crea ────────────────────────────────────────────────────
 *
 * Todo producto principal tiene la suya desde que nace: `paginaVenta` en `null`
 * quiere decir "todavía no la tocaron" y se dibuja con los textos de fábrica. No
 * hay un paso de "crear la página" ni un estado en el que un producto no tenga
 * dónde venderse.
 */

type Props = { params: Promise<{ id: string }> };

export default async function EditorPaginaPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;

  const { id } = await params;

  /* El dueño va adentro del `where`, igual que en la ruta que guarda. */
  const fila = await prisma.product.findFirst({
    where: { id, deletedAt: null, rolDigital: "PRINCIPAL", store: { ownerId: user.id } },
    select: {
      id: true, name: true, isActive: true, paginaVenta: true, landingPropia: true,
      store: { select: { name: true, whatsappNumber: true } },
      /* ⚠️ Se traen TODOS, publicados o no, y se separan abajo. La página
         pública sólo dibuja los publicados —un bono sin publicar puede no
         tener archivo, y prometerlo es prometer algo que no se entrega—, pero
         el editor tiene que poder decir CUÁL de los dos motivos es. */
      hijos: {
        where: { deletedAt: null, rolDigital: "BONO" },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, description: true, price: true, comparePrice: true, isActive: true },
      },
    },
  });
  if (!fila) notFound();

  /* Cuánto le queda de IA, para que el botón lo diga sin tener que preguntar
     antes de abrirlo. El plan sale de la suscripción, igual que en Productos. */
  /* Los campos completos y no sólo `tier`: el aviso de abajo necesita saber si
     el plan está AL DÍA, no sólo cuál es. Un Starter vencido no muestra
     diseños propios, igual que Free. */
  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { tier: true, status: true, trialEndsAt: true, currentPeriodEnd: true, gracePeriodEndsAt: true },
  });
  const cupoIA = await estadoDelCupo(user.id, (sub?.tier ?? "FREE") as TierDigital);

  /* Qué está viendo de verdad quien entra a la dirección. NO es `estado.activa`
     a secas: con el interruptor prendido y el plan caído a Free, la dirección
     muestra ESTA página, no el diseño propio. Ver `landing-del-producto`. */
  const estadoLanding = leerEstadoDeLanding(fila.landingPropia);
  const muestraTuDiseno = laDireccionMuestraTuDiseno(fila.landingPropia, sub);
  /* Prendido pero sin efecto: el caso de quien cayó de plan. Merece su propio
     aviso — decirle "no está prendido" sería mentirle igual, al revés. */
  const disenoPrendidoSinPlan = estadoLanding.activa && !!estadoLanding.versionId && !muestraTuDiseno;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <BotonVolver href="/digitales/productos">Volver a productos</BotonVolver>

      {/* La otra puerta: traer una página hecha con Claude. Si está prendida,
          lo que se edita acá abajo no se muestra, y decirlo importa más que
          ofrecerlo: si no, edita una página que nadie ve. */}
      {muestraTuDiseno ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 panel-oscuro:border-amber-500/30 bg-amber-50 panel-oscuro:bg-amber-500/10 px-4 py-3">
          <p className="text-[13px] leading-relaxed text-amber-900 panel-oscuro:text-amber-200">
            <strong className="font-bold">Tu dirección está mostrando tu propio diseño</strong>, así que lo que
            edites acá no se ve. Se guarda igual: al apagarlo vuelve tal como lo dejaste.
          </p>
          <Link href={`/digitales/productos/${fila.id}/landing`} className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-bold text-amber-900 panel-oscuro:text-amber-200 hover:underline">
            Ver tu diseño <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : disenoPrendidoSinPlan ? (
        /* El aviso que faltaba. Antes acá salía el de arriba —"tu dirección
           está mostrando tu propio diseño, lo que edites no se ve"— y era al
           revés: lo único que se está viendo es esta página. */
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 bg-gray-50 panel-oscuro:bg-gray-800/60 px-4 py-3">
          <p className="text-[13px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
            <strong className="font-bold text-gray-900 panel-oscuro:text-gray-100">Tu dirección está mostrando esta página.</strong>{" "}
            Tenés tu propio diseño prendido, pero se muestra con los planes Starter y Pro. Sigue guardado:
            al volver a uno de esos planes, tu dirección vuelve a mostrarlo.
          </p>
          <Link href={`/digitales/productos/${fila.id}/landing`} className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-bold text-orange-600 hover:text-orange-500">
            Ver tu diseño <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 px-4 py-3">
          <p className="flex items-center gap-2 text-[13px] text-gray-600 panel-oscuro:text-gray-400">
            <LayoutTemplate className="h-4 w-4 shrink-0 text-gray-400" />
            ¿Preferís una página hecha a tu gusto? Pedísela a Claude y subila; el precio y el botón los ponemos nosotros.
          </p>
          <Link href={`/digitales/productos/${fila.id}/landing`} className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-bold text-orange-600 hover:text-orange-500">
            Tu propio diseño <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <EditorDePagina
        productoId={fila.id}
        nombre={fila.name}
        publicado={fila.isActive}
        /* Normalizado del lado del servidor: si la columna quedó vieja porque el
           catálogo cambió, la pantalla arranca con la forma de HOY. */
        pagina={normalizarContenido(fila.paginaVenta)}
        /* La misma cuenta que hace la página pública, no la de la tabla: si
           fueran distintas, el editor diría que la sección se ve y la página
           no la dibujaría. */
        cuantosBonos={fila.hijos.filter((h) => h.isActive).length}
        bonosSinPublicar={fila.hijos.filter((h) => !h.isActive).length}
        /* Con verificadas publicadas, la sección de opiniones se dibuja aunque
           esté apagada: el editor tiene que decir lo mismo que la página. */
        opinionesVerificadas={await prisma.opinionDigital.count({ where: { productId: fila.id, estado: "PUBLICADA" } })}
        cupoIA={cupoIA}
        /* Con el diseño propio prendido, la previa lo dice encima y el botón
           de abrir muestra ESTA página, no la dirección (que muestra el otro). */
        landingPrendida={muestraTuDiseno}
        /* Nunca tuvo página: esa primera generación no gasta cupo. */
      />
    </div>
  );
}
