import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { MAX_PRODUCTOS_DIGITALES_CREADOS } from "@/lib/planLimits";
import { getUserSubscription, isSubscriptionActive } from "@/lib/subscription";
import { normalizarContenido, variablesDePagina, buscarEstilo } from "@/lib/pagina-venta";
import { CLASES_FUENTES } from "@/lib/fuentes-venta";
import { leerBienvenida } from "@/lib/bienvenida";
import { leerEstadoDeLanding } from "@/lib/landing-estado";
import BotonVolver from "../../BotonVolver";
import BienvenidaClient, { type ProductoDeBienvenida } from "./BienvenidaClient";

/**
 * El precio de bienvenida: un descuento que vale un rato desde que cada
 * visitante entra a la página, con el reloj contando de verdad. Por
 * producto. Ver `lib/bienvenida` por qué es de verdad y qué NO se cierra.
 *
 * Starter y Pro, como la oferta de salida. En Free se ve qué es y cómo
 * queda, con el formulario apagado.
 */

export const dynamic = "force-dynamic";

export default async function BienvenidaPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
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
        select: { id: true, name: true, price: true, comparePrice: true, isActive: true, paginaVenta: true, bienvenida: true, landingPropia: true },
      })
    : [];

  const productos: ProductoDeBienvenida[] = filas.map((f) => ({
    id: f.id, name: f.name, price: f.price, comparePrice: f.comparePrice, publicado: f.isActive,
    bienvenida: leerBienvenida(f.bienvenida),
    /* Para decirle dónde va a aparecer: en su landing propia, si la prendió,
       el reloj va en el hueco que dejó o en una barra nuestra arriba. */
    conLandingPropia: leerEstadoDeLanding(f.landingPropia).activa,
  }));
  const elegido = productos.find((x) => x.id === p) ?? productos[0] ?? null;

  /* El estilo de SU página, para que la vista previa sea la barra de verdad. */
  const fila = filas.find((f) => f.id === elegido?.id);
  const pagina = normalizarContenido(fila?.paginaVenta);
  const estilo = buscarEstilo(pagina.estilo);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
      <BotonVolver href="/digitales/marketing">Volver a Marketing</BotonVolver>

      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 panel-oscuro:text-gray-100">Precio de bienvenida</h1>
        <p className="mt-1 text-sm leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
          Quien entra a tu página ve un precio más bajo y un reloj que cuenta hacia atrás. Es de verdad: el
          plazo lo firma el servidor y, pasado, se cobra el precio normal aunque recargue o vuelva mañana.
        </p>
      </div>

      {/* `key` por producto: al cambiar de producto el formulario arranca con
          lo de ESE producto, no con lo que quedó escrito del anterior. */}
      <BienvenidaClient
        key={elegido?.id ?? "ninguno"}
        esPago={esPago}
        productos={productos}
        elegidoId={elegido?.id ?? null}
        estilo={{ vars: variablesDePagina(pagina), tarjeta: estilo.tarjeta, sello: estilo.sello, titulo: estilo.titulo, fuentes: CLASES_FUENTES }}
      />
    </div>
  );
}
