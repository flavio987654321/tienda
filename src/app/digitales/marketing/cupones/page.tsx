import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { MAX_PRODUCTOS_DIGITALES_CREADOS } from "@/lib/planLimits";
import { MAX_CUPONES_POR_CUENTA, estadoDelCupon, type CuponDigitalPuro } from "@/lib/cupones-digitales";
import { getArgentinaDayKey } from "@/lib/fechas-comerciales";
import BotonVolver from "../../BotonVolver";
import CuponesClient, { type CuponEnPantalla } from "./CuponesClient";

/**
 * Cupones de descuento.
 *
 * Un código que la persona escribe en el checkout. Es de la CUENTA —una cuenta
 * Pro tiene hasta cinco páginas— y puede valer para todas o para una. Las
 * reglas (cuánto, hasta cuándo, cuántas veces) viven en `lib/cupones-digitales`
 * y las comparten esta pantalla, la ruta que crea y el checkout que cobra.
 *
 * Es de todos los planes: el descuento lo pone la vendedora de su margen, no
 * nosotros del nuestro (la comisión se calcula sobre lo que se cobra).
 */

export const dynamic = "force-dynamic";

const AR_TZ = "America/Argentina/Buenos_Aires";
const fecha = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: AR_TZ });

export default async function CuponesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;

  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });

  const [productos, filas] = store
    ? await Promise.all([
        prisma.product.findMany({
          where: { storeId: store.id, rolDigital: "PRINCIPAL", deletedAt: null },
          orderBy: { createdAt: "asc" },
          take: MAX_PRODUCTOS_DIGITALES_CREADOS,
          select: { id: true, name: true },
        }),
        prisma.cuponDigital.findMany({
          where: { storeId: store.id },
          orderBy: { createdAt: "desc" },
          take: MAX_CUPONES_POR_CUENTA,
          select: {
            id: true, codigo: true, tipo: true, valor: true, productId: true, venceAt: true, topeUsos: true, usos: true, activo: true,
            product: { select: { name: true } },
          },
        }),
      ])
    : [[], []];

  const ahora = new Date();
  const cupones: CuponEnPantalla[] = filas.map((f) => {
    const puro: CuponDigitalPuro = {
      codigo: f.codigo, tipo: f.tipo === "PESOS" ? "PESOS" : "PORCENTAJE", valor: f.valor, productId: f.productId,
      venceAt: f.venceAt, topeUsos: f.topeUsos, usos: f.usos, activo: f.activo,
    };
    return {
      id: f.id,
      codigo: f.codigo,
      tipo: puro.tipo,
      valor: f.valor,
      producto: f.product?.name ?? null,
      vence: f.venceAt ? fecha.format(f.venceAt) : null,
      topeUsos: f.topeUsos,
      usos: f.usos,
      activo: f.activo,
      estado: estadoDelCupon(puro, ahora),
    };
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8">
      <BotonVolver />

      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 panel-oscuro:text-gray-100">Cupones de descuento</h1>
        <p className="mt-1 text-sm leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
          Un código que la persona escribe al pagar. Para un lanzamiento, para quien ya te compró, o para
          cerrar a quien preguntó y no se decidió.
        </p>
      </div>

      <CuponesClient cupones={cupones} productos={productos} tope={MAX_CUPONES_POR_CUENTA} hoy={getArgentinaDayKey()} />
    </div>
  );
}
