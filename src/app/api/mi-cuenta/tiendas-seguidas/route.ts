import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const follows = await prisma.storeFollow.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      storeId: true,
      createdAt: true,
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          primaryColor: true,
        },
      },
    },
  });

  return NextResponse.json(follows);
}
