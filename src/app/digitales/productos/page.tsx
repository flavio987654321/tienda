import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import type { TierDigital } from "@/lib/planes-digitales";
import { TOPES_DIGITALES } from "@/lib/planLimits";
import BotonVolver from "../BotonVolver";
import { estadoDelCupo } from "@/lib/cupo-ia";
import ProductosClient, { type ProductoEnPantalla } from "./ProductosClient";

/**
 * Cuántas filas puede llegar a traer esta pantalla, con el doble de margen.
 *
 * Sale de los topes y no de un número escrito acá: el día que Pro pase a 10
 * páginas, el techo sube solo. Escrito a mano, esa misma mejora esconde la mitad
 * de los productos de alguien sin decir nada.
 */
const TECHO_DE_PRODUCTOS =
  TOPES_DIGITALES.PRO.paginas * (1 + TOPES_DIGITALES.PRO.bonos + TOPES_DIGITALES.PRO.upsells) * 2;

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

  /* Cuánto le queda de IA, para que el botón lo diga sin tener que preguntar
     antes de abrirlo. Se lee, no se crea: una cuenta que nunca generó nada no
     necesita una fila para saber que tiene todo. */
  const cupoIA = await estadoDelCupo(user.id, tier);

  const filas = store
    ? await prisma.product.findMany({
        where: { storeId: store.id, deletedAt: null },
        orderBy: { createdAt: "asc" },
        /* ⚠️ Esta pantalla NO pagina, y no le hace falta: el plan la acota. Con
           el tope más alto —Pro— son 5 páginas de 1 principal + 5 bonos + 3
           upsells, o sea 45 filas y ni una más. Paginar 45 filas es agregar dos
           botones para esconder algo que entra entero.

           El techo va igual, y va calculado y no escrito a mano. No es por el
           plan: es por si algún día se le escapa una fila al control de topes.
           Una consulta sin límite contra una tabla que crece es la forma más
           cara de descubrir ese agujero — y se descubre en producción. El doble
           deja lugar para quien bajó de plan y conserva lo que ya tenía.

           La lista de VENTAS es el caso opuesto y por eso sí pagina: las ventas
           no las acota ningún plan, crecen para siempre. */
        take: TECHO_DE_PRODUCTOS,
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

      <ProductosClient tier={tier} productos={productos} cupoIA={cupoIA} />
    </div>
  );
}
