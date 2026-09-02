import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { normalizarContenido } from "@/lib/pagina-venta";
import PaginaDeVenta, { type ProductoParaPagina } from "@/components/digitales/PaginaDeVenta";
import PaginaEnVivo from "./PaginaEnVivo";

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
 * El contenido sale de `paginaVenta`, y se vuelve a normalizar al leerlo: si la
 * columna quedó vieja porque el catálogo cambió, lo que se dibuja tiene la forma
 * de HOY. `null` —nunca la editaron— da los textos de fábrica, así que no existe
 * el estado "producto sin página".
 */

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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
      images: true, isActive: true, paginaVenta: true,
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
  /* El año sale de acá y no de adentro del dibujo: un componente que se pregunta
     la fecha mientras dibuja no da siempre lo mismo, y con caché el copyright se
     congela en el año en que se generó la página. */
  return { ...fila, anio: new Date().getFullYear() };
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

export default async function PaginaDeVentaPublica({ params, searchParams }: Props) {
  const { id } = await params;
  const fila = await loQueSeMuestra(id);
  if (!fila) notFound();

  const datos = {
    pagina: normalizarContenido(fila.paginaVenta),
    producto: paraPagina(fila),
    bonos: fila.hijos.map(paraPagina),
    vendedor: { nombre: fila.store.name, contacto: fila.store.whatsappNumber },
    anio: fila.anio,
  };

  /* `?previa=1` es lo que carga el editor adentro de su iframe. Sólo cambia dos
     cosas: la página escucha el borrador que le manda el editor, y el botón de
     comprar queda apagado para no arrancar un pago desde el panel.
     No abre ninguna puerta: es la misma página y los mismos datos. */
  const previa = (await searchParams).previa === "1";
  if (previa) return <PaginaEnVivo {...datos} esPrevia />;

  return <PaginaDeVenta {...datos} />;
}
