import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

const BASE_URL = SITE_URL;

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
  { url: `${BASE_URL}/precios`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
  { url: `${BASE_URL}/quienes-somos`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE_URL}/tiendas`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  { url: `${BASE_URL}/contacto`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.5 },
  { url: `${BASE_URL}/comunidad`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
  { url: `${BASE_URL}/seguimiento`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
  { url: `${BASE_URL}/terminos`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/privacidad`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
];

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stores = await getStoreEntries();

  const storeRoutes: MetadataRoute.Sitemap = stores.map((store) => ({
    url: `${BASE_URL}/tienda/${store.slug}`,
    // La fecha real de la tienda y no `new Date()`: si todo dice "modificado
    // recién" en cada visita, Google deja de creerle al dato.
    lastModified: store.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...STATIC_ROUTES, ...storeRoutes];
}
