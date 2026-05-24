import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const affiliate = await prisma.affiliate.findFirst({
    where: { id, isActive: true, status: "APPROVED" },
    include: {
      user: {
        select: {
          name: true,
          image: true,
          bio: true,
          city: true,
          // instagramHandle intencionalmente omitido (privacidad)
        },
      },
      store: {
        select: {
          name: true,
          slug: true,
          logo: true,
          description: true,
          primaryColor: true,
          products: {
            where: { isActive: true },
            orderBy: { createdAt: "desc" },
            take: 12,
            select: {
              id: true,
              name: true,
              price: true,
              comparePrice: true,
              images: true,
              category: true,
            },
          },
        },
      },
    },
  });

  if (!affiliate) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mitienda.vercel.app";

  return NextResponse.json({
    affiliateId: affiliate.id,
    affiliateLink: `${baseUrl}/tienda/${affiliate.store.slug}?ref=${affiliate.id}`,
    seller: {
      name: affiliate.user.name,
      image: affiliate.user.image,
      bio: affiliate.user.bio,
      city: affiliate.user.city,
    },
    store: {
      name: affiliate.store.name,
      slug: affiliate.store.slug,
      logo: affiliate.store.logo,
      description: affiliate.store.description,
      primaryColor: affiliate.store.primaryColor,
      products: affiliate.store.products,
    },
  });
}
