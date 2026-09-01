import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import type { TierDigital } from "@/lib/planes-digitales";
import BotonVolver from "../BotonVolver";
import ProductosClient, { type ProductoEnPantalla } from "./ProductosClient";

/**
 * Tus productos digitales.
 *
 * Un producto principal, sus bonos y sus upsells son la misma tabla separada por
 * `rolDigital`, así que acá se leen todos de una sola consulta y se agrupan en
 * memoria. Dos consultas —una por los principales y otra por los hijos— serían
 * dos viajes para traer lo mismo.
 *
 * **No crea el espacio de la cuenta.** Esta pantalla sólo lee: la `Store` que le
 * presta el motor a una cuenta digital se crea recién cuando se guarda el primer
 * producto (ver `espacioDigital`). Entrar a mirar no tiene por qué dejar una
 * tienda vacía colgando.
 */
/** La portada, o `null`. Un JSON roto no puede tumbar la pantalla entera. */
function primeraImagen(images: string): string | null {
  try {
    const lista = JSON.parse(images);
    return Array.isArray(lista) && typeof lista[0] === "string" ? lista[0] : null;
  } catch {
    return null;
  }
}

export default async function ProductosPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;

  const [sub, store] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId: user.id }, select: { tier: true } }),
    prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } }),
  ]);

  const tier = (sub?.tier ?? "FREE") as TierDigital;

  const filas = store
    ? await prisma.product.findMany({
        where: { storeId: store.id, deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true, name: true, description: true, price: true, comparePrice: true,
          rolDigital: true, padreId: true, archivoPath: true, archivoNombre: true,
          archivoPeso: true, isActive: true, images: true,
        },
      })
    : [];

  const productos: ProductoEnPantalla[] = filas.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    price: f.price,
    comparePrice: f.comparePrice,
    rol: (f.rolDigital ?? "PRINCIPAL") as ProductoEnPantalla["rol"],
    padreId: f.padreId,
    /* `images` guarda un arreglo en texto, igual que en las tiendas. Acá sólo se
       usa la primera: un producto digital tiene una portada, no una galería. */
    imagen: primeraImagen(f.images),
    tieneArchivo: f.archivoPath !== null,
    archivoNombre: f.archivoNombre,
    archivoPeso: f.archivoPeso,
    publicado: f.isActive,
  }));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8">
      <BotonVolver />

      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 panel-oscuro:text-gray-100">Tus productos</h1>
        <p className="text-gray-500 panel-oscuro:text-gray-400 text-sm mt-1">
          Cada producto tiene su página de venta, sus bonos y sus upsells.
        </p>
      </div>

      <ProductosClient tier={tier} productos={productos} />
    </div>
  );
}
