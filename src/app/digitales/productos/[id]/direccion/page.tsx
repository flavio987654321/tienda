import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { dominioDeLaPlataforma, direccionDelProducto } from "@/lib/direccion-digital";
import { fechaDeSoltar } from "@/lib/dominio-digital";
import BotonVolver from "../../../BotonVolver";
import DireccionClient from "./DireccionClient";
import DominioPropio from "./DominioPropio";
import MedicionDelProducto from "./MedicionDelProducto";
import { medicionGuardadaEnElProducto, medicionDeLaTienda } from "@/lib/medicion-digital";
import { getUserSubscription } from "@/lib/subscription";

export const dynamic = "force-dynamic";

/**
 * La dirección de un producto: `mecanica.tiendaapps.com`.
 *
 * ── Por qué cuelga del producto y no de Configuración ───────────────────────
 *
 * Por lo mismo que el editor de la página de venta, que está al lado: **la
 * dirección es POR PRODUCTO**. Una cuenta Pro tiene hasta 5, cada una de un
 * nicho distinto, así que un "Dirección" suelto en el menú no diría cuál de las
 * 5 configura. Se entra desde la tarjeta del producto y no hay ambigüedad.
 *
 * En Configuración vive la dirección de la CUENTA, que es otra cosa y que el
 * comprador no ve nunca.
 */

type Props = { params: Promise<{ id: string }> };

export default async function DireccionPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;

  const { id } = await params;

  /* El dueño va adentro del `where`, igual que en la ruta que guarda. Y sólo un
     PRINCIPAL: un bono no tiene dirección porque no es una página que alguien
     visite — se entrega con la compra. */
  const producto = await prisma.product.findFirst({
    where: { id, deletedAt: null, rolDigital: "PRINCIPAL", store: { ownerId: user.id } },
    select: { id: true, name: true, slugDigital: true, dominioPropio: true, isActive: true, medicion: true, store: { select: { storeConfig: true } } },
  });
  if (!producto) notFound();

  /* El plan decide si el dominio propio se dibuja prendido o apagado. Es sólo
     para la VISTA: el que decide de verdad es la ruta que conecta, que lo vuelve
     a mirar del lado del servidor. Una pantalla no es un permiso. */
  const sub = await getUserSubscription(user.id);
  const esPro = sub?.role === "DIGITAL" && sub.tier === "PRO";

  /* Sin Pro y con dominio puesto —la cuenta cayó— el dominio redirige y tiene
     fecha de vencimiento. Se le dice acá, con la fecha, que es lo que la
     persona quiere saber: "¿hasta cuándo?". Ver `momentoDelDominio`. */
  const seSueltaEl = !esPro && producto.dominioPropio && sub?.freeDesde
    ? fechaDeSoltar(sub.freeDesde).toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" })
    : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8">
      <BotonVolver />

      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 panel-oscuro:text-gray-100">
          La dirección de tu producto
        </h1>
        <p className="text-gray-500 panel-oscuro:text-gray-400 text-sm mt-1">
          Es la que vas a repartir y contra la que vas a pautar. Va a{" "}
          <strong className="font-semibold text-gray-700 panel-oscuro:text-gray-300">{producto.name}</strong>{" "}
          y nada más: quien entre no ve el resto de tus productos.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
        <DireccionClient
          productoId={producto.id}
          slugActual={producto.slugDigital}
          dominioBase={dominioDeLaPlataforma()}
          publicado={producto.isActive}
        />

        <DominioPropio
          productoId={producto.id}
          esPro={esPro}
          dominioActual={producto.dominioPropio}
          direccion={producto.slugDigital ? direccionDelProducto(producto.slugDigital) : null}
          seSueltaEl={seSueltaEl}
        />

        <MedicionDelProducto
          productoId={producto.id}
          actual={medicionGuardadaEnElProducto(producto.medicion)}
          delaCuenta={medicionDeLaTienda(producto.store.storeConfig)}
        />
      </div>
    </div>
  );
}
