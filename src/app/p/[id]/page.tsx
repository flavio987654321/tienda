import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { contenidoPorDefecto } from "@/lib/pagina-venta";
import PaginaDeVenta, { type ProductoParaPagina } from "@/components/digitales/PaginaDeVenta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * La página de venta de un producto digital.
 *
 * ⚠️ **Esta dirección es provisoria.** La definitiva es un subdominio por
 * producto (Fase 5 bis) — `mi-guia.tiendaapps.com.ar` —, que es lo que permite
 * hacerle publicidad separada a cada producto. `/p/<id>` existe para poder VER
 * la página mientras eso no está, y se va cuando llegue.
 *
 * Vive fuera de `/digitales` a propósito: ese layout trae la barra lateral del
 * panel, el tema claro/oscuro y la guarda de rol. Quien compra no tiene cuenta.
 *
 * 🔲 **El contenido todavía no se guarda.** Sale de `contenidoPorDefecto()`, o
 * sea que todas las páginas se ven iguales salvo por el producto. La columna
 * donde va el contenido entra con la migración de la Fase 5, junto con la de la
 * 5 bis, para no tocar la base de producción dos veces.
 */

type Props = { params: Promise<{ id: string }> };

/**
 * El producto y su gente, **si se puede mostrar**.
 *
 * Un producto sin publicar lo ve sólo su dueña. Sin esa vuelta, cualquiera que
 * pruebe ids lee borradores ajenos —con su precio y su descripción— antes de que
 * la persona decida publicarlos.
 */
async function loQueSeMuestra(id: string) {
  const fila = await prisma.product.findFirst({
    where: { id, deletedAt: null, rolDigital: "PRINCIPAL" },
    select: {
      id: true, name: true, description: true, price: true, comparePrice: true,
      images: true, isActive: true,
      store: { select: { ownerId: true, name: true, whatsappNumber: true } },
      hijos: {
        where: { deletedAt: null, rolDigital: "BONO", isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, description: true, price: true, comparePrice: true, images: true },
      },
    },
  });
  if (!fila) return null;

  if (!fila.isActive) {
    const user = await getCurrentUser();
    if (!user || user.id !== fila.store.ownerId) return null;
  }
  return fila;
}

/** La portada. Un JSON roto no puede tumbar la página entera. */
function primeraImagen(images: string): string | null {
  try {
    const lista = JSON.parse(images);
    return Array.isArray(lista) && typeof lista[0] === "string" ? lista[0] : null;
  } catch {
    return null;
  }
}

const paraPagina = (f: {
  id: string; name: string; description: string | null;
  price: number; comparePrice: number | null; images: string;
}): ProductoParaPagina => ({
  id: f.id,
  name: f.name,
  description: f.description,
  price: f.price,
  comparePrice: f.comparePrice,
  imagen: primeraImagen(f.images),
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const fila = await loQueSeMuestra(id);
  if (!fila) return { title: "Producto no encontrado" };
  return {
    title: fila.name,
    description: fila.description ?? undefined,
    /* Un borrador no se indexa aunque su dueña lo esté mirando. */
    robots: fila.isActive ? undefined : { index: false, follow: false },
  };
}

export default async function PaginaDeVentaPublica({ params }: Props) {
  const { id } = await params;
  const fila = await loQueSeMuestra(id);
  if (!fila) notFound();

  return (
    <PaginaDeVenta
      pagina={contenidoPorDefecto()}
      producto={paraPagina(fila)}
      bonos={fila.hijos.map(paraPagina)}
      vendedor={{ nombre: fila.store.name, contacto: fila.store.whatsappNumber }}
    />
  );
}
