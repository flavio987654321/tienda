import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { normalizarContenido } from "@/lib/pagina-venta";
import BotonVolver from "../../../BotonVolver";
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
      id: true, name: true, isActive: true, paginaVenta: true,
      store: { select: { name: true, whatsappNumber: true } },
      hijos: {
        where: { deletedAt: null, rolDigital: "BONO" },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, description: true, price: true, comparePrice: true },
      },
    },
  });
  if (!fila) notFound();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <BotonVolver href="/digitales/productos">Volver a productos</BotonVolver>
      <EditorDePagina
        productoId={fila.id}
        nombre={fila.name}
        publicado={fila.isActive}
        /* Normalizado del lado del servidor: si la columna quedó vieja porque el
           catálogo cambió, la pantalla arranca con la forma de HOY. */
        pagina={normalizarContenido(fila.paginaVenta)}
        cuantosBonos={fila.hijos.length}
      />
    </div>
  );
}
