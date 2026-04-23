import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { buyerId: user.id },
    include: {
      store: { select: { name: true, slug: true, logo: true, primaryColor: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, images: true } },
          variant: { select: { name: true, value: true } },
        },
      },
      payment: { select: { status: true, provider: true } },
      shipping: { select: { trackingCode: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}
