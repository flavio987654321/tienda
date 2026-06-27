import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({}, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { logo: true, mpConnectedAt: true, isVerified: true, tipoTienda: true },
  });

  if (!store) return NextResponse.json({}, { status: 404 });

  return NextResponse.json({
    noLogo: !store.logo,
    noMercadoPago: store.tipoTienda !== "AUTOS" && !store.mpConnectedAt,
    notVerified: !store.isVerified,
  });
}
