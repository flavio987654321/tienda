import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizarContenido, variablesDePagina, buscarEstilo } from "@/lib/pagina-venta";
import { CLASES_FUENTES } from "@/lib/fuentes-venta";
import { DIAS_DEL_PERMISO, MAX_DESCARGAS } from "@/lib/entrega-digital";
import GraciasClient from "./GraciasClient";

/**
 * La pantalla de después de pagar.
 *
 * ── Por qué el archivo se baja ACÁ y además se manda por mail ───────────────
 *
 * Decidido el 03/09/26. Las dos cosas, y cada una tapa el agujero de la otra:
 * el enlace en pantalla se baja al toque, sin esperar nada; y el mail queda
 * guardado para quien cierra la pestaña antes de bajarlo, o quiere el archivo
 * dos semanas después. Un mail solo deja esperando a alguien que ya pagó cuando
 * cae en promociones; una pantalla sola pierde a todo el que cierra sin bajar.
 *
 * ── La carrera que resuelve `GraciasClient` ─────────────────────────────────
 *
 * La preferencia va con `auto_return: "approved"`, así que Mercado Pago devuelve
 * a la persona acá **apenas aprueba**, y el aviso que emite los permisos llega
 * por otro camino unos segundos después. O sea que esta página carga casi
 * siempre con la compra todavía sin confirmar. Por eso el estado se pregunta
 * desde el navegador y los botones aparecen solos.
 */

export const metadata: Metadata = {
  title: "¡Gracias por tu compra!",
  /* No se indexa: es una pantalla personal de alguien que ya pagó. */
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Gracias({ params, searchParams }: Props) {
  const { id } = await params;
  const q = await searchParams;
  const ordenId = typeof q.orden === "string" ? q.orden : null;

  const fila = await prisma.product.findFirst({
    where: { id, deletedAt: null, rolDigital: "PRINCIPAL" },
    select: {
      id: true, name: true, paginaVenta: true,
      store: {
        select: {
          isPublished: true,
          owner: { select: { role: true, name: true } },
        },
      },
      /* Los upsells que todavía se pueden ofrecer. La oferta de después de pagar
         es el mismo producto del embudo, no una lista aparte. */
      hijos: {
        where: { deletedAt: null, isActive: true, rolDigital: "UPSELL" },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, description: true, price: true, comparePrice: true, images: true },
      },
    },
  });

  if (!fila || fila.store.isPublished || fila.store.owner.role !== "DIGITAL") notFound();

  const pagina = normalizarContenido(fila.paginaVenta);
  const estilo = buscarEstilo(pagina.estilo);

  /* Qué upsells NO compró todavía. Ofrecerle de nuevo algo que acaba de pagar es
     la forma más rápida de que alguien desconfíe de una pantalla de cobro. */
  const yaComprados = ordenId
    ? (await prisma.orderItem.findMany({
        where: { orderId: ordenId },
        select: { productId: true },
      })).map((i) => i.productId)
    : [];

  return (
    <div className={CLASES_FUENTES}>
      <div
        style={variablesDePagina(pagina) as React.CSSProperties}
        className="min-h-screen overflow-x-clip [overflow-wrap:anywhere] bg-[color:var(--pv-fondo)] text-[color:var(--pv-tinta)] antialiased"
      >
        <GraciasClient
          productoId={fila.id}
          nombre={fila.name}
          ordenId={ordenId}
          diasDelEnlace={DIAS_DEL_PERMISO}
          maxDescargas={MAX_DESCARGAS}
          vendedor={fila.store.owner.name}
          botonRedondo={estilo.boton}
          tarjeta={estilo.tarjeta}
          upsells={fila.hijos
            .filter((u) => u.price > 0 && !yaComprados.includes(u.id))
            .map((u) => ({
              id: u.id,
              nombre: u.name,
              descripcion: u.description,
              precio: u.price,
              regular: u.comparePrice && u.comparePrice > u.price ? u.comparePrice : null,
            }))}
        />
      </div>
    </div>
  );
}
