import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { calculateGoalAmount } from "@/lib/canasta";

// "Canasta Solidaria #1" → "Canasta Solidaria #2". Si no encuentra un número
// al final, simplemente agrega " #2".
function nextCampaignName(name: string) {
  const match = name.match(/#(\d+)\s*$/);
  if (match) {
    const next = parseInt(match[1], 10) + 1;
    return name.replace(/#(\d+)\s*$/, `#${next}`);
  }
  return `${name} #2`;
}

// POST /api/admin/canasta/complete
// El admin elige a mano a quién se le entrega lo recaudado (nunca uno de
// los donantes) y confirma la entrega. Esto cierra la campaña para siempre
// (archivada con todo su historial intacto). Para CANASTA, arranca
// automáticamente la próxima, clonando los mismos productos pero en $0.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { campaignId, donorName, text, mediaUrl, mediaType } = await req.json();
  if (typeof campaignId !== "string" || !campaignId) {
    return NextResponse.json({ error: "campaignId requerido" }, { status: 400 });
  }
  if (typeof donorName !== "string" || !donorName.trim()) {
    return NextResponse.json({ error: "Falta el nombre de la familia beneficiaria" }, { status: 400 });
  }
  if (mediaType !== undefined && mediaType !== null && mediaType !== "IMAGE" && mediaType !== "VIDEO") {
    return NextResponse.json({ error: "mediaType inválido" }, { status: 400 });
  }

  const campaign = await prisma.donationCampaign.findUnique({
    where: { id: campaignId },
    include: { products: { orderBy: { sortOrder: "asc" } } },
  });
  if (!campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });

  // CANASTA siempre llega por COMPLETED (la meta se calcula sola). Una
  // LIBRE sin meta (goalAmount null) nunca llega a COMPLETED solo, así que
  // el admin la puede cerrar directo desde ACTIVE.
  const canComplete = campaign.status === "COMPLETED" || (campaign.status === "ACTIVE" && campaign.type === "LIBRE" && campaign.goalAmount === null);
  if (!canComplete) {
    return NextResponse.json({ error: "Todavía no se completó la meta de esta campaña" }, { status: 409 });
  }
  if (campaign.deliveredAt) {
    return NextResponse.json({ error: "Esta campaña ya quedó cerrada" }, { status: 409 });
  }

  const newCampaign = await prisma.$transaction(async (tx) => {
    await tx.donationTestimonial.upsert({
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

    // status: "COMPLETED" explícito acá también para el caso LIBRE sin meta, que
    // se cierra directo desde ACTIVE. Lo que impide dos campañas vivas del mismo
    // tipo es el chequeo del POST de /campaign (no hay ningún índice único en la
    // base, aunque un comentario viejo acá decía que sí): mira ACTIVE y COMPLETED
    // sin entregar, así que sin este cambio de estado la anterior seguiría
    // frenando la creación de la próxima.
    await tx.donationCampaign.update({
      where: { id: campaignId },
      data: { status: "COMPLETED", deliveredAt: new Date() },
    });

    // CANASTA: arranca la próxima de cero, clonando los mismos productos
    // (mismos alimentos/precios, editables después) pero con $0 recaudados
    // y sin donantes. goalAmount queda solo como valor inicial: el resto del
    // sistema siempre la recalcula en vivo a partir de productos + reservePct.
    // LIBRE: no se clona — cada causa es de una persona/situación distinta,
    // el admin crea la próxima a mano cuando tenga una causa nueva.
    if (campaign.type === "CANASTA") {
      const goalAmount = calculateGoalAmount(campaign.products, campaign.reservePct);
      return tx.donationCampaign.create({
        data: {
          type: "CANASTA",
          name: nextCampaignName(campaign.name),
          description: campaign.description,
          goalAmount,
          reservePct: campaign.reservePct,
          bannerActive: campaign.bannerActive,
          status: "ACTIVE",
          products: {
            create: campaign.products.map((p) => ({
              name: p.name,
              image: p.image,
              targetPrice: p.targetPrice,
              sortOrder: p.sortOrder,
            })),
          },
        },
      });
    }
    return null;
  });

  return NextResponse.json({
    ok: true,
    newCampaignId: newCampaign?.id ?? null,
    newCampaignName: newCampaign?.name ?? null,
  });
}
