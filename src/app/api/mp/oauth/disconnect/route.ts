import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await prisma.store.updateMany({
    where: { ownerId: user.id },
    data: {
      mpAccessToken:  null,
      mpRefreshToken: null,
      mpSellerId:     null,
      mpConnectedAt:  null,
    },
  });

  return NextResponse.json({ ok: true });
}
