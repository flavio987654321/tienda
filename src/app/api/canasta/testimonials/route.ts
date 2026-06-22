import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/canasta/testimonials?type=CANASTA|LIBRE
// Lista pública de agradecimientos de campañas ya entregadas, las más
// recientes primero. Solo existen los que el admin cargó a mano.
// Sin `type`, devuelve los dos tipos mezclados (lo usa la landing genérica
// /comunidad). Con `type`, lo usa cada página específica para no mezclar
// entregas de un tipo con el otro.
export async function GET(req: NextRequest) {
  const typeParam = req.nextUrl.searchParams.get("type");
  const type = typeParam === "LIBRE" || typeParam === "CANASTA" ? typeParam : undefined;

  const testimonials = await prisma.donationTestimonial.findMany({
    where: type ? { campaign: { type } } : undefined,
    orderBy: { createdAt: "desc" },
    include: { campaign: { select: { name: true } } },
  });

  return NextResponse.json({
    testimonials: testimonials.map((t) => ({
      id: t.id,
      donorName: t.donorName,
      campaignName: t.campaign.name,
      mediaUrl: t.mediaUrl,
      mediaType: t.mediaType,
      text: t.text,
      createdAt: t.createdAt,
    })),
  });
}
