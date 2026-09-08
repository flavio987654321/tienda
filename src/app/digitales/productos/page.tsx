import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import type { TierDigital } from "@/lib/planes-digitales";
import { TOPES_DIGITALES } from "@/lib/planLimits";
import BotonVolver from "../BotonVolver";
import { estadoDelCupo } from "@/lib/cupo-ia";
import { estadoDelBorrador } from "@/lib/ebook-borrador";
import { getSubscriptionStatus } from "@/lib/subscription";
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
    /* Sólo lo que hace falta: el plan, y lo que `getSubscriptionStatus` mira
       para saber si todavía está en la prueba. Traer la fila entera sería leer
       datos de cobro que esta pantalla no usa. */
    prisma.subscription.findUnique({
      where: { userId: user.id },
      select: {
        tier: true, status: true, trialEndsAt: true,
        currentPeriodEnd: true, gracePeriodEndsAt: true,
      },
    }),
    /* ⚠️ `mpAccessToken` sólo para saber SI está conectado, nunca para usarlo:
       desde el 08/09/26 el cobro salió de la puerta del panel, así que se puede
       llegar a esta pantalla sin él — y entonces la tarjeta tiene que decir que
       sin eso no se publica, en vez de apagar el botón sin motivo. */
    prisma.store.findUnique({
      where: { ownerId: user.id },
      select: { id: true, mpAccessToken: true },
    }),
  ]);

  const tier = (sub?.tier ?? "FREE") as TierDigital;

  /* Cuánto le queda de IA, para que el botón lo diga sin tener que preguntar
     antes de abrirlo. Se lee, no se crea: una cuenta que nunca generó nada no
     necesita una fila para saber que tiene todo. */
  const cupoIA = await estadoDelCupo(user.id, tier);
  /* Y el de ebooks, que es una bolsa APARTE: gastar todas las páginas de venta
     no puede dejar a nadie sin poder escribir su ebook. Ver `cupo-ia`.

     ⚠️ Con `enPrueba`, igual que la ruta que lo gasta. Sin esto la pantalla
     dibujaría el cupo del plan pagado a alguien que todavía está probando, y al
     apretar el botón el servidor le diría que no le queda: el número de la
     pantalla tiene que ser el mismo que aplica el servidor. */
  const enPrueba = !!sub && getSubscriptionStatus(sub) === "TRIAL";
  const cupoEbook = await estadoDelCupo(user.id, tier, "EBOOK", enPrueba);

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
          archivoPeso: true, isActive: true, images: true, slugDigital: true,
          dominioPropio: true,
          /* El borrador del ebook, para que la tarjeta diga en qué anda sin que
             haya que abrir nada. Se pide con la misma consulta: una aparte
             serían 45 viajes más para traer un número. */
          ebookIA: {
            select: {
              estado: true, titulo: true, indice: true, capitulos: true,
              trabajandoDesde: true, error: true, reintentos: true,
            },
          },
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
    /* Sin el texto de los capítulos: son decenas de miles de caracteres que la
       pantalla no muestra y que viajarían con cada dibujo. */
    ebook: f.ebookIA ? estadoDelBorrador(f.ebookIA) : null,
    slugDigital: f.slugDigital,
    dominioPropio: f.dominioPropio,
  }));

  /* ⚠️ `max-w-6xl`, el mismo que la home del panel. Estaba en `max-w-3xl`
     —768 px— así que la pantalla con MÁS contenido de todo el panel era la más
     angosta, y encima no coincidía con la de al lado: pasar de Inicio a
     Productos movía la columna entera. A 1920 quedaban 1150 px de blanco a los
     costados mientras los títulos se cortaban con puntos suspensivos.

     Y `panel-productos` no es de adorno: es lo que engancha la regla de foco
     visible de `globals.css`, que cubre de una vez los más de diez botones de
     esta pantalla. Ver el comentario largo allá. */
  return (
    <div className="panel-productos mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
      <BotonVolver />

      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 panel-oscuro:text-gray-100">Tus productos</h1>
        <p className="text-gray-500 panel-oscuro:text-gray-400 text-sm mt-1">
          Cada producto tiene su página de venta, sus bonos y sus upsells.
        </p>
      </div>

      <ProductosClient
        tier={tier}
        productos={productos}
        cupoIA={cupoIA}
        cupoEbook={cupoEbook}
        cobroConectado={!!store?.mpAccessToken}
      />
    </div>
  );
}
