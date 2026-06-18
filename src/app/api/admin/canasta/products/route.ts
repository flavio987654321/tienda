import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { campaignId, name, targetPrice } = await req.json();
  if (typeof campaignId !== "string" || !campaignId) {
    return NextResponse.json({ error: "campaignId requerido" }, { status: 400 });
  }
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }
  if (typeof targetPrice !== "number" || targetPrice <= 0) {
    return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
  }

  const last = await prisma.donationProduct.findFirst({
    where: { campaignId },
    orderBy: { sortOrder: "desc" },
  });

  const product = await prisma.donationProduct.create({
    data: {
      campaignId,
      name: name.trim(),
      targetPrice,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json(product);
}
