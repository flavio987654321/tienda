import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { MAX_PRODUCTOS_DIGITALES_CREADOS } from "@/lib/planLimits";
import { getUserSubscription, isSubscriptionActive } from "@/lib/subscription";
import { leerOfertaUpsell } from "@/lib/oferta-upsell";
import BotonVolver from "../../BotonVolver";
import UpsellsClient, { type ProductoConUpsells } from "./UpsellsClient";

/**
 * La oferta del upsell: el reloj de la caja "Sumá a tu compra" del checkout.
 * Por producto, como las otras dos ofertas con reloj.
 *
 * ── Por qué esta pantalla existe ────────────────────────────────────────────
 *
 * Los upsells se cargan en Productos, abajo de los bonos, y ahí se quedan: el
 * nombre, el archivo y la imagen son del producto. Lo que se configura acá es
 * la OFERTA —cuánto dura el reloj y a qué precio vuelve cada upsell cuando
 * termina—, que es otra cosa y no tiene dónde vivir en aquella pantalla.
 *
 * Hasta ahora la tarjeta "Upsells" de Marketing era la única de las nueve que
 * no llevaba a ningún lado: te mandaba a Productos a buscarlos.
 *
 * Starter y Pro, como la oferta de salida y el precio de bienvenida. En Free
 * se ve qué es y cómo queda, con el formulario apagado.
 */

export const dynamic = "force-dynamic";

export default async function UpsellsPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;
  const { p } = await searchParams;

  const [store, sub] = await Promise.all([
    prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } }),
    getUserSubscription(user.id),
  ]);
  const esPago = !!sub && sub.tier !== "FREE" && isSubscriptionActive(sub);

  const filas = store
    ? await prisma.product.findMany({
        where: { storeId: store.id, rolDigital: "PRINCIPAL", deletedAt: null },
        orderBy: { createdAt: "asc" },
        take: MAX_PRODUCTOS_DIGITALES_CREADOS,
        select: {
          id: true, name: true, price: true, isActive: true, ofertaUpsell: true,
          /* ⚠️ Sin `isActive` en los hijos, a propósito: un upsell despublicado
             igual se configura desde acá. Esconderlo haría que quien lo tiene
             apagado no encuentre dónde ponerle el precio, y después no entienda
             por qué no entra en la oferta cuando lo publique. Se avisa al lado. */
          hijos: {
            where: { deletedAt: null, rolDigital: "UPSELL" },
            orderBy: { createdAt: "asc" },
            select: { id: true, name: true, price: true, comparePrice: true, isActive: true },
          },
        },
      })
    : [];

  const productos: ProductoConUpsells[] = filas.map((f) => ({
    id: f.id, name: f.name, price: f.price, publicado: f.isActive,
    oferta: leerOfertaUpsell(f.ofertaUpsell),
    upsells: f.hijos.map((h) => ({
      id: h.id, name: h.name, price: h.price, comparePrice: h.comparePrice, publicado: h.isActive,
    })),
  }));
  const elegido = productos.find((x) => x.id === p) ?? productos[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
      <BotonVolver href="/digitales/marketing">Volver a Marketing</BotonVolver>

      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 panel-oscuro:text-gray-100">Oferta del upsell</h1>
        <p className="mt-1 text-sm leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
          En la pantalla de pago, el extra que ofrecés al lado sale más barato mientras corre un reloj.
          Cuando termina, pasa a su precio de siempre. Es de verdad: el plazo lo firma el servidor, no se
          reinicia al recargar, y el precio de después se cobra aunque la pantalla diga otra cosa.
        </p>
      </div>

      {/* `key` por producto: al cambiar de producto el formulario arranca con
          lo de ESE producto, no con lo que quedó escrito del anterior. */}
      <UpsellsClient
        key={elegido?.id ?? "ninguno"}
        esPago={esPago}
        productos={productos}
        elegidoId={elegido?.id ?? null}
      />
    </div>
  );
}
