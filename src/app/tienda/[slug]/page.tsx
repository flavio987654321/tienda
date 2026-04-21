import { prisma } from "@/lib/prisma";
import StorefrontClient from "@/components/store/StorefrontClient";
import { notFound } from "next/navigation";

type TiendaPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
};

export default async function TiendaPage({ params, searchParams }: TiendaPageProps) {
  const { slug } = await params;
  const { ref } = await searchParams;

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

  return (
    <StorefrontClient
      affiliateId={affiliateId}
      store={{
        id: store.id,
        slug: store.slug,
        name: store.name,
        description: store.description,
        logo: store.logo,
        primaryColor: store.primaryColor,
        owner: store.owner,
        products: store.products.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          comparePrice: product.comparePrice,
          images: product.images,
          category: product.category,
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
