import { prisma } from "@/lib/prisma";

/**
 * El listado de tiendas del directorio, en un solo lugar.
 *
 * Estaba escrito adentro de `/api/stores`, y la página `/tiendas` lo pedía por
 * fetch desde el navegador. El costo no era la duplicación: era que el HTML que
 * salía del servidor NO tenía ni un link a ninguna tienda. Google entraba al
 * directorio, no encontraba salida hacia `/tienda/girly-store`, y esas páginas
 * le quedaban conocidas sólo por el sitemap — que es lo que Search Console
 * reporta como "Descubierta: actualmente sin indexar". Una URL que el sitemap
 * declara pero que ninguna página linkea se lee como algo que ni el propio
 * sitio considera importante.
 *
 * Es el mismo problema que tenía la ficha de producto, y el mismo arreglo:
 * traerlo en el servidor y mandarlo dibujado.
 */

export type TiendaDirectorio = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo: string | null;
  banner: string | null;
  primaryColor: string;
  totalProducts: number;
  totalOrders: number;
  // Ojo: acá NO va una lista de categorías. Había una, y no podía funcionar: la
  // consulta trae un solo producto por tienda (`take: 1`, para la foto de tapa),
  // así que "las categorías" eran siempre a lo sumo una. Nadie la leía —ni el
  // listado ni la imagen de OpenGraph— así que se fue en vez de arreglarse. Si
  // alguna vez hace falta de verdad, va como consulta aparte (`distinct`), no
  // sacada del producto de la tapa.
  coverImg: string | null;
  heroImg: string | null;
  isVerified: boolean;
  tipoTienda: string;
  updatedAt: number;
};

export type FiltrosDirectorio = {
  page?: number;
  limit?: number;
  category?: string;
  tipoTienda?: string;
  featured?: boolean;
  slug?: string;
};

/** El tope de `limit`: sin él, un `?limit=99999` traía la base entera. */
export const LIMITE_MAXIMO = 48;

export async function listarTiendas(filtros: FiltrosDirectorio = {}) {
  const page = Math.max(1, filtros.page || 1);
  const limit = Math.min(LIMITE_MAXIMO, Math.max(1, filtros.limit || 12));

  const where = {
    isActive: true,
    isPublished: true,
    ...(filtros.slug ? { slug: filtros.slug } : {}),
    ...(filtros.category ? { products: { some: { category: filtros.category, isActive: true } } } : {}),
    ...(filtros.tipoTienda ? { tipoTienda: filtros.tipoTienda } : {}),
  };

  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      include: {
        // Los MISMOS productos que va a encontrar el que entre, no todas las
        // filas de la tabla. `_count` sin `where` cuenta los borrados: el borrado
        // es lógico (`deletedAt`), la fila queda. Girly Store tenía dos productos
        // borrados y la tarjeta prometía "46 productos" cuando adentro había 44.
        //
        // Un producto programado se guarda con `isActive: false` hasta que el cron
        // lo publica, así que `isActive: true` ya lo deja afuera — no hace falta
        // mirar `publishAt`.
        _count: { select: { products: { where: { isActive: true, deletedAt: null } }, orders: true } },
        products: {
          where: { isActive: true },
          // Sólo la foto: es el último producto cargado y se usa de tapa.
          select: { images: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: filtros.featured
        ? [{ orders: { _count: "desc" } }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.store.count({ where }),
  ]);

  const result: TiendaDirectorio[] = stores.map((s) => {
    const firstProduct = s.products[0];
    let coverImg: string | null = null;
    if (firstProduct) {
      try {
        const imgs = JSON.parse(firstProduct.images);
        if (Array.isArray(imgs) && imgs[0]) {
          const first = imgs[0];
          coverImg = typeof first === "string" ? first : (first?.url ?? null);
        }
      } catch {}
    }

    let heroImg: string | null = null;
    try {
      const sc = JSON.parse(s.storeConfig);
      heroImg =
        sc?.imageOverrides?.heroBackground?.url ??
        sc?.imageOverrides?.heroImage?.url ??
        sc?.imageOverrides?.heroImage1?.url ??
        sc?.imageOverrides?.heroBanner1?.url ??
        null;
    } catch {}

    return {
      id: s.id,
      slug: s.slug,
      name: s.name,
      description: s.description || s.tagline || null,
      logo: s.logo,
      banner: s.banner,
      primaryColor: s.primaryColor,
      totalProducts: s._count.products,
      totalOrders: s._count.orders,
      coverImg,
      heroImg,
      isVerified: s.isVerified,
      tipoTienda: s.tipoTienda,
      updatedAt: s.updatedAt.getTime(),
    };
  });

  return { stores: result, total, page, limit, pages: Math.ceil(total / limit) };
}
