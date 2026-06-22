import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

// PUT /api/admin/canasta/testimonials
// El admin carga (o edita) a mano el agradecimiento de una canasta ya
// entregada. No hay subida pública: por eso no necesita un paso de
// aprobación separado, cargarlo ya implica que está aprobado.
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { campaignId, donorName, mediaUrl, mediaType, text } = await req.json();
  if (typeof campaignId !== "string" || !campaignId) {
    return NextResponse.json({ error: "campaignId requerido" }, { status: 400 });
  }
  if (typeof donorName !== "string" || !donorName.trim()) {
    return NextResponse.json({ error: "Falta el nombre del ganador" }, { status: 400 });
  }
  if (mediaType !== undefined && mediaType !== null && mediaType !== "IMAGE" && mediaType !== "VIDEO") {
    return NextResponse.json({ error: "mediaType inválido" }, { status: 400 });
  }

  const campaign = await prisma.donationCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
  if (!campaign.deliveredAt) {
    return NextResponse.json({ error: "Esta campaña todavía no fue entregada" }, { status: 400 });
  }

  const testimonial = await prisma.donationTestimonial.upsert({
    where: { campaignId },
    create: {
      campaignId,
      donorName: donorName.trim(),
      mediaUrl: mediaUrl || null,
      mediaType: mediaUrl ? mediaType ?? null : null,
      text: text?.trim() || null,
    },
    update: {
      donorName: donorName.trim(),
      mediaUrl: mediaUrl || null,
      mediaType: mediaUrl ? mediaType ?? null : null,
      text: text?.trim() || null,
    },
  });

  return NextResponse.json(testimonial);
}

// DELETE /api/admin/canasta/testimonials?campaignId=...
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId requerido" }, { status: 400 });

  await prisma.donationTestimonial.deleteMany({ where: { campaignId } });
  return NextResponse.json({ ok: true });
}
