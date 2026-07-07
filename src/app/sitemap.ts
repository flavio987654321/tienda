import { MetadataRoute } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const BASE_URL = "https://tiendaapps.com";

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
  { url: `${BASE_URL}/precios`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
  { url: `${BASE_URL}/quienes-somos`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE_URL}/tiendas`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  { url: `${BASE_URL}/terminos`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/privacidad`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
];

async function getStoreSlugs(): Promise<string[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("stores")
      .select("slug")
      .eq("is_active", true)
      .not("slug", "is", null);
    return (data ?? []).map((row: { slug: string }) => row.slug);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getStoreSlugs();

  const storeRoutes: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${BASE_URL}/tienda/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...STATIC_ROUTES, ...storeRoutes];
}
