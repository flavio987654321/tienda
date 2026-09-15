import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { MAX_PRODUCTOS_DIGITALES_CREADOS } from "@/lib/planLimits";
import { getUserSubscription, isSubscriptionActive } from "@/lib/subscription";
import { normalizarContenido, variablesDePagina, buscarEstilo } from "@/lib/pagina-venta";
import { CLASES_FUENTES } from "@/lib/fuentes-venta";
import { leerOfertaSalida } from "@/lib/oferta-salida";
import BotonVolver from "../../BotonVolver";
import SalidaClient, { type ProductoDeSalida } from "./SalidaClient";

/**
 * La oferta de salida (el "downsell"): qué se le ofrece a quien se va del
 * checkout sin pagar. Por producto, con vista previa que es el mismo cartel
 * que ve el comprador. Ver `lib/oferta-salida` por qué no hay cupos ni
 * reloj falso, y por qué no hay editor de bloques.
 *
 * Starter y Pro: es lo que justifica pagar el plan, igual que las visitas.
 * En Free se ve qué es y cómo queda, con el formulario apagado.
 */

export const dynamic = "force-dynamic";

export default async function SalidaPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
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
        select: { id: true, name: true, price: true, images: true, isActive: true, paginaVenta: true, ofertaSalida: true },
      })
    : [];

  const productos: ProductoDeSalida[] = filas.map((f) => ({
    id: f.id, name: f.name, price: f.price, imagen: primeraImagen(f.images), publicado: f.isActive,
    oferta: leerOfertaSalida(f.ofertaSalida),
  }));
  const elegido = productos.find((x) => x.id === p) ?? productos[0] ?? null;

  /* El estilo de SU página, para que la vista previa sea el cartel de verdad. */
  const fila = filas.find((f) => f.id === elegido?.id);
  const pagina = normalizarContenido(fila?.paginaVenta);
  const estilo = buscarEstilo(pagina.estilo);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-8">
      <BotonVolver />

      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 panel-oscuro:text-gray-100">Oferta de salida</h1>
        <p className="mt-1 text-sm leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
          Cuando alguien está por irse del pago sin pagar, le aparece un cartel con una última oferta: un
          descuento por tiempo limitado, o un producto más barato. El mismo cartel va en el mail de carrito
          abandonado.
        </p>
      </div>

      {/* `key` por producto: al cambiar de producto el formulario arranca con
          la oferta de ESE producto, no con lo que quedó escrito del anterior. */}
      <SalidaClient
        key={elegido?.id ?? "ninguno"}
        esPago={esPago}
        productos={productos}
        elegidoId={elegido?.id ?? null}
        estilo={{ vars: variablesDePagina(pagina), tarjeta: estilo.tarjeta, boton: estilo.boton, fuentes: CLASES_FUENTES }}
      />
    </div>
  );
}

function primeraImagen(images: string): string | null {
  try {
    const lista = JSON.parse(images);
    return Array.isArray(lista) && typeof lista[0] === "string" ? lista[0] : null;
  } catch {
    return null;
  }
}
