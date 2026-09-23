import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LUGARES } from "@/lib/orden-promociones";

export const dynamic = "force-dynamic";

// GET /api/promociones — flyers activos para el carrusel de la home, en
// orden, máximo 3.
export async function GET() {
  const promotions = await prisma.promotion.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    take: LUGARES,
    select: { id: true, imageUrl: true, link: true },
  });
  return NextResponse.json({ promotions });
}
