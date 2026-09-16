import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { getUserSubscription, isSubscriptionActive } from "@/lib/subscription";
import { leerEstadoDeLanding, leerInventario, leerQuitado } from "@/lib/landing-estado";

import BotonVolver from "../../../BotonVolver";
import LandingClient, { type VersionEnPantalla } from "./LandingClient";

export const dynamic = "force-dynamic";

/**
 * "Mi propio diseño": subir la landing que diseñó con Claude.
 *
 * Cuelga del producto, igual que el editor de la página de venta, y por el
 * mismo motivo: el diseño es POR PRODUCTO, y una cuenta Pro tiene hasta
 * cinco. Desde acá se copia el pedido para Claude, se sube el archivo, se
 * cargan las fotos que pide, se completan los links del pie y se prende.
 *
 * Prenderla reemplaza SÓLO la página de venta: el pago, los cupones, la
 * oferta de salida, el píxel y las estadísticas siguen siendo los nuestros
 * y no se enteran. Apagarla devuelve la página de secciones intacta.
 */

type Props = { params: Promise<{ id: string }> };

export default async function LandingPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;
  const { id } = await params;

  const [fila, sub] = await Promise.all([
    prisma.product.findFirst({
      where: { id, deletedAt: null, rolDigital: "PRINCIPAL", store: { ownerId: user.id } },
      select: {
        id: true, name: true, description: true, price: true, comparePrice: true, isActive: true,
        landingPropia: true,
        store: { select: { name: true } },
        landingsDigital: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, bytes: true, titulo: true, inventario: true, quitado: true, createdAt: true },
        },
      },
    }),
    getUserSubscription(user.id),
  ]);
  if (!fila) notFound();
  const esPago = !!sub && sub.tier !== "FREE" && isSubscriptionActive(sub);

  const estado = leerEstadoDeLanding(fila.landingPropia);
  const versiones: VersionEnPantalla[] = fila.landingsDigital.map((v) => ({
    id: v.id,
    bytes: v.bytes,
    titulo: v.titulo,
    cuando: v.createdAt.toISOString(),
    inventario: leerInventario(v.inventario),
    quitado: leerQuitado(v.quitado),
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
      <BotonVolver href="/digitales/productos">Volver a productos</BotonVolver>

      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 panel-oscuro:text-gray-100">Tu propio diseño</h1>
        <p className="mt-1 text-sm leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
          Si querés una página distinta a la nuestra, pedísela a Claude con el texto de acá abajo y subí el
          archivo. Nosotros le ponemos el precio, el botón que cobra y tus fotos: vos no tocás nada de código.
        </p>
      </div>

      <LandingClient
        productoId={fila.id}
        nombre={fila.name}
        publicado={fila.isActive}
        esPago={esPago}
        estado={estado}
        versiones={versiones}
        /* Los datos, no el texto ya armado: la pantalla lo rehace con lo que
           ella escriba sobre el diseño, con la misma función. */
        producto={{
          nombre: fila.name,
          descripcion: fila.description,
          precio: fila.price,
          precioAnterior: fila.comparePrice,
          tipo: null,
          vendedor: fila.store.name,
        }}
      />
    </div>
  );
}
