import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { image, targetPrice } = await req.json();

  const data: { image?: string; targetPrice?: number } = {};
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
