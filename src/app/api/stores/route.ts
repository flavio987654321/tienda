import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(48, parseInt(searchParams.get("limit") ?? "12"));
  const category = searchParams.get("category") ?? "";
  const featured = searchParams.get("featured") === "true";

  const where = {
    isActive: true,
    ...(category ? { products: { some: { category, isActive: true } } } : {}),
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
      orderBy: featured
        ? [{ orders: { _count: "desc" } }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.store.count({ where }),
  ]);

  const result = stores.map((s) => {
    const firstProduct = s.products[0];
    let coverImg: string | null = null;
    if (firstProduct) {
      try {
        const imgs = JSON.parse(firstProduct.images);
        coverImg = Array.isArray(imgs) && imgs[0] ? imgs[0] : null;
      } catch {}
    }

    const categories = [...new Set(s.products.map((p) => p.category).filter(Boolean))];

    return {
      id: s.id,
      slug: s.slug,
      name: s.name,
      description: s.description,
      logo: s.logo,
      banner: s.banner,
      primaryColor: s.primaryColor,
      totalProducts: s._count.products,
      totalOrders: s._count.orders,
      categories,
      coverImg,
    };
  });

  return NextResponse.json({ stores: result, total, page, limit, pages: Math.ceil(total / limit) });
}
