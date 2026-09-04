import { prisma } from "@/lib/prisma";
import { normalizarSlug, validarSlug, SLUG_MINIMO } from "@/lib/configuracion-digital";

/**
 * La dirección propia de un producto digital: `mecanica.tiendaapps.com`.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * EL ESPACIO DE NOMBRES ES UNO SOLO, Y ESTÁ COMPARTIDO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * El middleware traduce `algo.tiendaapps.com` mirando **una sola cosa**: el
 * texto que hay antes del punto. Ese texto hoy puede ser el nombre corto de una
 * tienda (`Store.slug`) y desde esta fase también el de un producto digital
 * (`Product.slugDigital`).
 *
 * O sea que los dos comparten la misma lista de nombres: **si una tienda se
 * llama `recetas`, ningún producto puede llamarse `recetas`** — y al revés.
 *
 * ── Por qué eso no lo puede garantizar un índice único ─────────────────────
 *
 * Porque un índice único vive dentro de UNA tabla. Acá los nombres están en dos.
 * Cada tabla tiene el suyo —y hacen falta—, pero ninguno de los dos ve al otro:
 * mirar "¿está libre?" y después guardar deja la ventana clásica, y dos pedidos
 * a la vez —uno creando una tienda, otro un producto— se llevan el mismo nombre.
 *
 * Lo resuelve un candado de Postgres tomado sobre **el nombre**, no sobre la
 * cuenta: dos personas peleando por `recetas` se hacen una después de la otra, y
 * dos que piden nombres distintos no se estorban. Es el mismo
 * `pg_advisory_xact_lock` que usa la creación de productos, y se suelta solo al
 * terminar la transacción, salga bien o salga mal.
 *
 * ── Qué NO hace este archivo ───────────────────────────────────────────────
 *
 * No decide quién puede tener dirección. Eso es del plan y del rol —sólo un
 * PRINCIPAL la lleva; un bono no es una página que alguien visite, se entrega
 * con la compra— y lo aplica quien llama.
 */

/** El dominio de la plataforma, sin `www` y sin protocolo: `tiendaapps.com`. */
export function dominioDeLaPlataforma(): string {
  const crudo = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.tiendaapps.com";
  try {
    return new URL(crudo).hostname.replace(/^www\./, "");
  } catch {
    return "tiendaapps.com";
  }
}

/** La dirección completa que se le muestra a la persona. */
export function direccionDelProducto(slug: string): string {
  return `https://${slug}.${dominioDeLaPlataforma()}`;
}

/**
 * Un nombre propuesto a partir del título del producto.
 *
 * Se propone, no se impone: la persona lo puede cambiar antes de publicar. Pero
 * **tiene que haber uno desde que el producto se crea**, porque una dirección
 * que aparece más tarde es una dirección que cambia, y cambiarle la URL a algo
 * que ya se está publicitando se lleva puestos los anuncios y los links.
 */
export function proponerSlug(nombre: string): string {
  return normalizarSlug(nombre);
}

/**
 * Un nombre libre a partir de otro, agregando un número si hace falta.
 *
 * `null` si después de intentar no se encontró ninguno — que en la práctica no
 * pasa, pero devolver `null` es mejor que devolver uno ocupado y que la
 * reserva falle más adelante con un error que nadie sabe leer.
 *
 * ⚠️ Esto NO reserva nada: entre que devuelve y que alguien guarda, el nombre
 * se puede ocupar. Sirve para proponer; el que garantiza es `reservarSlug`.
 */
export async function buscarSlugLibre(base: string, intentos = 20): Promise<string | null> {
  const raiz = normalizarSlug(base) || "producto";
  for (let i = 0; i < intentos; i++) {
    const candidato = i === 0 ? raiz : `${raiz}-${i + 1}`;
    if (candidato.length < SLUG_MINIMO) continue;
    if (validarSlug(candidato) !== null) continue;
    if (await estaLibre(candidato)) return candidato;
  }
  return null;
}

/**
 * ¿Está libre ese nombre? Mira **las dos** tablas.
 *
 * `exceptoProducto` deja que un producto conserve el nombre que ya tiene: sin
 * eso, guardar la misma dirección sin cambiarla se rechazaría por chocar
 * consigo misma.
 */
export async function estaLibre(slug: string, exceptoProducto?: string): Promise<boolean> {
  const [tienda, producto] = await Promise.all([
    prisma.store.findFirst({ where: { slug }, select: { id: true } }),
    prisma.product.findFirst({
      where: { slugDigital: slug, ...(exceptoProducto ? { id: { not: exceptoProducto } } : {}) },
      select: { id: true },
    }),
  ]);
  return !tienda && !producto;
}

export type ResultadoDeReserva =
  | { ok: true; slug: string }
  | { ok: false; motivo: string };

/**
 * Guardar la dirección de un producto, garantizando que no se la lleven dos.
 *
 * ⚠️ Todo adentro de una transacción y **detrás del candado del nombre**. El
 * orden importa: primero se toma el candado, después se mira si está libre, y
 * recién ahí se guarda. Mirar antes del candado es no tener candado.
 *
 * ⚠️ Y NO busca un nombre alternativo si está ocupado. Cuando la persona
 * escribió una dirección, darle otra parecida sin avisar es peor que decirle que
 * pruebe con otra: se entera cuando ya la repartió.
 */
export async function reservarSlug(
  productoId: string,
  pedido: string,
): Promise<ResultadoDeReserva> {
  const problema = validarSlug(pedido);
  if (problema) return { ok: false, motivo: problema };

  const slug = normalizarSlug(pedido);

  try {
    return await prisma.$transaction(async (tx) => {
      /* El candado va sobre el NOMBRE. Dos personas peleando por el mismo se
         hacen una después de la otra; dos que piden nombres distintos no se
         estorban. Se suelta solo al terminar la transacción. */
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${slug}))`;

      const [tienda, otro] = await Promise.all([
        tx.store.findFirst({ where: { slug }, select: { id: true } }),
        tx.product.findFirst({
          where: { slugDigital: slug, id: { not: productoId } },
          select: { id: true },
        }),
      ]);

      if (tienda || otro) {
        return { ok: false as const, motivo: "Esa dirección ya está en uso. Probá con otra." };
      }

      await tx.product.update({ where: { id: productoId }, data: { slugDigital: slug } });
      return { ok: true as const, slug };
    });
  } catch (e) {
    /* El índice único es la última red: si dos transacciones se cruzaran igual,
       una falla acá y no se lleva un nombre repetido. */
    if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002") {
      return { ok: false, motivo: "Esa dirección ya está en uso. Probá con otra." };
    }
    console.error("[direccion-digital] no se pudo reservar", { productoId, slug, e });
    return { ok: false, motivo: "No pudimos guardar la dirección. Probá de nuevo." };
  }
}
