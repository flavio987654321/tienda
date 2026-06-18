import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/canasta/testimonials
// Lista pública de agradecimientos de canastas ya entregadas, las más
// recientes primero. Solo existen los que el admin cargó a mano.
export async function GET() {
  const testimonials = await prisma.donationTestimonial.findMany({
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
