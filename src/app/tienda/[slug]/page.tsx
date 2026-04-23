import { prisma } from "@/lib/prisma";
import StorefrontClient from "@/components/store/StorefrontClient";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUser } from "@/lib/auth-session";
import type { Metadata } from "next";

type TiendaPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string; producto?: string }>;
};

function parseImages(images: string) {
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params, searchParams }: TiendaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { producto } = await searchParams;

  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    select: {
      name: true,
      description: true,
      products: producto
        ? {
            where: { id: producto, isActive: true },
            select: { name: true, description: true, images: true, price: true },
            take: 1,
          }
        : false,
    },
  });

  if (!store) return {};

  const product = Array.isArray(store.products) ? store.products[0] : null;
  const image = product ? parseImages(product.images)[0] : null;
  const title = product ? `${product.name} | ${store.name}` : store.name;
  const description = product?.description || store.description || `Compra en ${store.name}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: image ? [{ url: image, alt: product?.name || store.name }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function TiendaPage({ params, searchParams }: TiendaPageProps) {
  noStore();
  const { slug } = await params;
  const { ref, producto } = await searchParams;

  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    include: {
      owner: { select: { name: true, email: true } },
      products: {
        where: { isActive: true },
        include: { variants: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!store) notFound();

  let affiliateId: string | undefined;
  if (ref) {
    const affiliate = await prisma.affiliate.findFirst({
      where: { id: ref, storeId: store.id, isActive: true },
      select: { id: true },
    });
    affiliateId = affiliate?.id;
  }

  const currentUser = await getCurrentUser();
  let initialFavoriteIds: string[] = [];
  if (currentUser) {
    const productIds = store.products.map((p) => p.id);
    const favs = await prisma.favorite.findMany({
      where: { userId: currentUser.id, productId: { in: productIds } },
      select: { productId: true },
    });
    initialFavoriteIds = favs.map((f) => f.productId);
  }

  return (
    <StorefrontClient
      affiliateId={affiliateId}
      initialProductId={producto}
      userId={currentUser?.id}
      initialFavoriteIds={initialFavoriteIds}
      store={{
        id: store.id,
        slug: store.slug,
        pageBlocks: store.pageBlocks,
        name: store.name,
        description: store.description,
        logo: store.logo,
        banner: store.banner,
        tagline: store.tagline,
        primaryColor: store.primaryColor,
        secondaryColor: store.secondaryColor,
        accentColor: store.accentColor,
        fontFamily: store.fontFamily,
        templateId: store.templateId,
        productLayout: store.productLayout,
        heroStyle: store.heroStyle,
        showPrices: store.showPrices,
        showStock: store.showStock,
        showRatings: store.showRatings,
        announcementBar: store.announcementBar,
        announcementBarColor: store.announcementBarColor,
        navbarStyle: store.navbarStyle,
        buttonStyle: store.buttonStyle,
        cardRadius: store.cardRadius,
        cardShadow: store.cardShadow,
        backgroundStyle: store.backgroundStyle,
        instagramUrl: store.instagramUrl,
        facebookUrl: store.facebookUrl,
        tiktokUrl: store.tiktokUrl,
        whatsappNumber: store.whatsappNumber,
        showWhatsappButton: store.showWhatsappButton,
        footerText: store.footerText,
        currency: store.currency,
        owner: store.owner,
        products: store.products.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          comparePrice: product.comparePrice,
          images: product.images,
          category: product.category,
          subcategory: product.subcategory,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            value: variant.value,
            stock: variant.stock,
            price: variant.price,
          })),
        })),
      }}
    />
  );
}
