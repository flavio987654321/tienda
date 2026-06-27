import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { isDemoProductId } from "@/lib/demoProducts";
import ProductDetailClient from "./ProductDetailClient";
import { StoreTrackingScripts } from "@/components/store/StoreTrackingScripts";
import type { StoreConfig } from "@/types/store-config";

type ProductoPageProps = {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ from?: string }>;
};

// Resuelve el producto siempre filtrado por la tienda del slug + activo + no borrado,
// para que no se pueda ver (ni indexar) un producto de otra tienda cambiando el id en la URL.
async function findProduct(slug: string, id: string) {
  return prisma.product.findFirst({
    where: { id, isActive: true, deletedAt: null, store: { slug, isActive: true } },
    select: {
      id: true, name: true, description: true, price: true, images: true,
      store: { select: { name: true } },
    },
  });
}

export async function generateMetadata({ params, searchParams }: ProductoPageProps): Promise<Metadata> {
  const { slug, id } = await params;
  const { from } = await searchParams;
  // Los productos demo del editor no existen en la base — no hay metadata real que generar.
  if (from === "editor" && isDemoProductId(id)) return {};

  const product = await findProduct(slug, id);
  if (!product) return {};

  const title = `${product.name} — ${product.store.name}`;
  const description = product.description?.slice(0, 160) || `Comprá ${product.name} en ${product.store.name}`;
  let image: string | undefined;
  try {
    const images = JSON.parse(product.images || "[]");
    const first = images[0];
    image = typeof first === "string" ? first : first?.url;
  } catch {}

  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: image ? [image] : undefined },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  };
}

async function findAnalyticsConfig(slug: string) {
  const store = await prisma.store.findFirst({ where: { slug, isActive: true }, select: { storeConfig: true } });
  try {
    const parsed: Partial<StoreConfig> = JSON.parse(store?.storeConfig || "{}");
    return parsed.analytics;
  } catch {
    return undefined;
  }
}

export default async function ProductoPage({ params, searchParams }: ProductoPageProps) {
  noStore();
  const { slug, id } = await params;
  const { from } = await searchParams;

  // Los productos demo del editor (ej. "hogar-2") nunca existen en la base —
  // se resuelven en el cliente con datos de muestra en vez de buscarlos ahí.
  const isEditorDemo = from === "editor" && isDemoProductId(id);
  if (!isEditorDemo) {
    const product = await findProduct(slug, id);
    if (!product) notFound();
  }

  const analytics = await findAnalyticsConfig(slug);

  return (
    <>
      <StoreTrackingScripts googleAnalyticsId={analytics?.googleAnalyticsId} facebookPixelId={analytics?.facebookPixelId} />
      <ProductDetailClient slug={slug} productId={id} />
    </>
  );
}
