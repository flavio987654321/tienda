import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { getUserSubscription, isSubscriptionActive } from "@/lib/subscription";
import { leerEstadoDeLanding, leerInventario, leerQuitado, LANDING_VERSIONES } from "@/lib/landing-estado";
import { leerBienvenida } from "@/lib/bienvenida";
import { documentosPublicados } from "@/lib/politicas-tienda";

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
        landingPropia: true, bienvenida: true,
        store: { select: { name: true, policyTerms: true, policyTermsActive: true, policyPrivacy: true, policyPrivacyActive: true, policyReturns: true, policyReturnsActive: true } },
        /* Las mismas que guarda el POST, ni una más: la lista no crece sin
           fin, así que no hay páginas que pasar. Pedir 10 cuando se guardan
           5 sólo servía para mostrar restos si alguna vez bajamos el número. */
        landingsDigital: {
          orderBy: { createdAt: "desc" },
          take: LANDING_VERSIONES,
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
    /* Ancho completo, como el editor de nuestra página: la previa de la
       derecha es lo que más se mira, y con un ancho máximo quedaba chica con
       la pantalla medio vacía a los costados. */
    <div className="p-4 sm:p-6 lg:p-8">
      <BotonVolver href="/digitales/productos">Volver a productos</BotonVolver>

      <div className="mb-6 max-w-3xl">
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
        /* Si el archivo dejó lugar para el reloj, la pantalla dice si está
           prendido o apagado: apagado, esa barra no se muestra, y se prende
           en Marketing, no acá. */
        bienvenida={leerBienvenida(fila.bienvenida)}
        /* Qué legales tiene cargados: los links legales del pie van a nuestra
           página, y si el documento falta, el paso 5 se lo dice. */
        legalesCargados={documentosPublicados(fila.store)}
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
