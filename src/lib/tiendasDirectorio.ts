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
  categories: string[];
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
        _count: { select: { products: true, orders: true } },
        products: {
          where: { isActive: true },
          select: { images: true, category: true },
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

    const categories = [...new Set(s.products.map((p) => p.category).filter(Boolean))];

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
      categories,
      coverImg,
      heroImg,
      isVerified: s.isVerified,
      tipoTienda: s.tipoTienda,
      updatedAt: s.updatedAt.getTime(),
    };
  });

  return { stores: result, total, page, limit, pages: Math.ceil(total / limit) };
}
