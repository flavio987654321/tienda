import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import { ARTICULOS } from "@/lib/ayuda";

const BASE_URL = SITE_URL;

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
  { url: `${BASE_URL}/precios`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
  { url: `${BASE_URL}/quienes-somos`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE_URL}/tiendas`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  { url: `${BASE_URL}/contacto`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.5 },
  { url: `${BASE_URL}/comunidad`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
  { url: `${BASE_URL}/seguimiento`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
  { url: `${BASE_URL}/ayuda`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
  { url: `${BASE_URL}/terminos`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/privacidad`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
];

/* Los artículos de ayuda.
 *
 * Van uno por uno y no solo el índice: cada artículo contesta una búsqueda
 * distinta —"cómo poner envío gratis", "por qué no aparezco en Google"— y el
 * que la hace tiene que caer en la respuesta, no en una lista donde después
 * la busque. Es la única parte del sitio que puede traer a alguien que todavía
 * no sabe que existimos.
 *
 * `lastModified` sale de la fecha del propio artículo, no de `new Date()`: si
 * todo dice "modificado recién" en cada visita del robot, Google deja de
 * creerle al dato para todo el sitio. */
const AYUDA_ROUTES: MetadataRoute.Sitemap = ARTICULOS.map((a) => ({
  url: `${BASE_URL}/ayuda/${a.slug}`,
  lastModified: new Date(`${a.actualizado}T12:00:00`),
  changeFrequency: "monthly",
  priority: 0.5,
}));

/**
 * Las tiendas que se pueden mostrar hoy.
 *
 * Iba por el cliente de Supabase pidiendo la tabla `stores` con el campo
 * `is_active`, y esos nombres no existen: Prisma las creó como `"Store"` e
 * `"isActive"`, que en Postgres distinguen mayúsculas. La consulta fallaba, el
 * catch se comía el error y devolvía lista vacía — o sea que las tiendas, que
 * son el contenido del sitio, nunca estuvieron en el sitemap.
 *
 * Las tres condiciones son las mismas que decide `/tienda/[slug]`: sin isActive
 * la página tira 404, cerrada muestra el cartel de cerrada y sin publicar
 * muestra "Próximamente". Ninguna de esas tiene sentido ofrecerla a Google.
 */
async function getStoreEntries() {
  try {
    return await prisma.store.findMany({
      where: { isActive: true, isPublished: true, closedAt: null },
      select: { slug: true, updatedAt: true },
    });
  } catch (e) {
    // El sitemap no puede caerse por esto: sin tiendas sigue sirviendo las fijas.
    console.error("[sitemap] no se pudieron leer las tiendas:", e);
    return [];
  }
}

/* ── Los productos ───────────────────────────────────────────────────────────
   El sitemap tenía las portadas pero no las fichas. Google llegaba a un producto
   sólo si iba siguiendo links desde la portada, y a los que están más adentro del
   catálogo podía tardar semanas en encontrarlos —o no encontrarlos nunca—.

   Es lo que más mueve la aguja de todo el trabajo de SEO: los datos estructurados
   de una ficha no sirven de nada si el robot nunca la visita.

   Dos resguardos, que hoy no hacen falta pero después no se agregan solos:

   · TOPE POR TIENDA. Una sola tienda con miles de productos no puede comerse el
     lugar de las demás. El mismo número que usa el feed de Google Shopping.
   · LÍMITE DE GOOGLE: 50.000 direcciones por archivo. Con ~26 productos por
     tienda eso son unas 1.900 tiendas — muy lejos, pero cuando se acerque hay
     que partir esto en un índice con varios archivos, no dejar que se corte solo.

   Los filtros son los mismos que decide la ficha pública: un producto inactivo,
   borrado o de una tienda despublicada no se le ofrece a Google.               */
const MAX_PRODUCTS_PER_STORE = 500;

async function getProductEntries() {
  try {
    const stores = await prisma.store.findMany({
      where: { isActive: true, isPublished: true, closedAt: null },
      select: {
        slug: true,
        products: {
          where: { isActive: true, deletedAt: null },
          select: { id: true, updatedAt: true },
          // Los más nuevos primero: si alguna vez se llega al tope, que lo que
          // quede afuera sea lo más viejo y no un recorte al azar.
          orderBy: { updatedAt: "desc" },
          take: MAX_PRODUCTS_PER_STORE,
        },
      },
    });

    return stores.flatMap((store) =>
      store.products.map((p) => ({ slug: store.slug, id: p.id, updatedAt: p.updatedAt }))
    );
  } catch (e) {
    // Mismo criterio que arriba: sin productos el sitemap sigue sirviendo el resto.
    console.error("[sitemap] no se pudieron leer los productos:", e);
    return [];
  }
}

/* Cada cuánto se recalcula. Sin esto, cada visita del robot dispara la consulta
   entera contra la base — y los robots pasan seguido. Una hora es de sobra: un
   producto nuevo no necesita estar en el sitemap en el mismo minuto, y Google
   igual no lo va a rastrear al instante. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // En paralelo: son dos consultas independientes y encadenarlas sólo haría al
  // robot esperar la suma de las dos.
  const [stores, products] = await Promise.all([getStoreEntries(), getProductEntries()]);

  const storeRoutes: MetadataRoute.Sitemap = stores.map((store) => ({
    url: `${BASE_URL}/tienda/${store.slug}`,
    // La fecha real de la tienda y no `new Date()`: si todo dice "modificado
    // recién" en cada visita, Google deja de creerle al dato.
    lastModified: store.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE_URL}/tienda/${p.slug}/producto/${p.id}`,
    lastModified: p.updatedAt,
    // "daily" sería mentir: un producto no cambia todos los días. Google usa esto
    // como pista para decidir cada cuánto volver, y una pista falsa la termina
    // ignorando para todo el sitio.
    changeFrequency: "weekly",
    // Menos que la portada (0.7) y más que las páginas fijas: la ficha es lo que
    // se quiere que encuentren, pero la portada sigue siendo la entrada principal.
    priority: 0.6,
  }));

  return [...STATIC_ROUTES, ...AYUDA_ROUTES, ...storeRoutes, ...productRoutes];
}
