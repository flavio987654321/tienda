import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { name, image, targetPrice } = await req.json();

  const data: { name?: string; image?: string; targetPrice?: number } = {};
  if (typeof name === "string") {
    if (!name.trim()) {
      return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
    }
    data.name = name.trim();
  }
  if (typeof image === "string" && image) data.image = image;
  if (typeof targetPrice === "number" && targetPrice > 0) data.targetPrice = targetPrice;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
  }

  const product = await prisma.donationProduct.update({
    where: { id },
    data,
  });

  return NextResponse.json(product);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const product = await prisma.donationProduct.findUnique({
    where: { id },
    select: { campaignId: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  const remaining = await prisma.donationProduct.count({ where: { campaignId: product.campaignId } });
  if (remaining <= 1) {
    return NextResponse.json({ error: "La canasta necesita al menos un producto" }, { status: 409 });
  }

  await prisma.donationProduct.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
