import { prisma } from "@/lib/prisma";
import StorefrontTemplateRenderer from "@/components/store/StorefrontTemplateRenderer";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import type { StoreConfig } from "@/types/store-config";
import { DEFAULT_CONFIG } from "@/types/store-config";

export const dynamic = "force-dynamic";

type TiendaPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: TiendaPageProps): Promise<Metadata> {
  const { slug } = await params;

  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    select: { name: true, description: true, logo: true, tagline: true, storeConfig: true },
  });

  if (!store) return {};

  let config: Partial<StoreConfig> = {};
  try { config = JSON.parse(store.storeConfig || "{}"); } catch { /* noop */ }

  const title = (config.storeName || store.name) ?? "Tienda";
  const description = store.description || store.tagline || `Comprá en ${title}`;

  return {
    title,
    description,
    manifest: `/api/manifest/${slug}`,
    openGraph: { title, description, type: "website", siteName: title },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function TiendaPage({ params }: TiendaPageProps) {
  noStore();
  const { slug } = await params;

  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    select: { storeConfig: true },
  });

  if (!store) notFound();

  let config: StoreConfig;
  try {
    const parsed = JSON.parse(store.storeConfig || "{}");
    if (!parsed?.template) notFound();
    config = { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    notFound();
  }

  return <StorefrontTemplateRenderer config={config} />;
}
