import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [orders, submitted] = await Promise.all([
    prisma.order.findMany({
      where: { buyerId: user.id, status: { in: ["CONFIRMED", "SHIPPED", "DELIVERED"] } },
      include: {
        items: { include: { product: { select: { id: true, name: true, images: true } } } },
        store: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.findMany({
      where: { userId: user.id },
      include: { product: { select: { id: true, name: true, images: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const reviewedProductIds = new Set(submitted.map((r) => r.productId));
  const seen = new Set<string>();

  const pending: {
    productId: string;
    orderId: string;
    productName: string;
    productImages: string;
    orderDate: string;
    storeName: string;
    storeSlug: string;
  }[] = [];

  for (const order of orders) {
    for (const item of order.items) {
      const pid = item.product.id;
      if (!reviewedProductIds.has(pid) && !seen.has(pid)) {
        seen.add(pid);
        pending.push({
          productId: pid,
          orderId: order.id,
          productName: item.product.name,
          productImages: item.product.images,
          orderDate: order.createdAt.toISOString(),
          storeName: order.store.name,
          storeSlug: order.store.slug,
        });
      }
    }
  }

  return NextResponse.json({
    pending,
    submitted: submitted.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      productId: r.productId,
      productName: r.product.name,
      productImages: r.product.images,
    })),
  });
}
