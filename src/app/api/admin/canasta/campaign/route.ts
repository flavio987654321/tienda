import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const confirmedCount = await prisma.donation.count({ where: { campaignId: id, status: "CONFIRMED" } });
  if (confirmedCount > 0) {
    return NextResponse.json({ error: "No se puede eliminar: ya tiene donaciones confirmadas" }, { status: 409 });
  }

  await prisma.donationCampaign.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

// POST /api/admin/canasta/campaign
// Crea una campaña nueva desde cero, de tipo CANASTA o LIBRE (solo cuando no
// hay ninguna activa de ESE tipo — el índice único parcial
// "one_active_campaign_per_type" en la base ya protege esto a nivel de
// datos, esta validación es solo para dar un mensaje claro).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { name, reservePct, type, description, goalAmount, mediaUrl, mediaType, contactPhone } = await req.json();
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Falta el nombre de la campaña" }, { status: 400 });
  }
  const campaignType = type === "LIBRE" ? "LIBRE" : "CANASTA";

  // Sin entrega registrada no arranca la siguiente.
  //
  // Antes esto solo miraba `status: "ACTIVE"`, así que una campaña que ya había
  // llegado a su meta —COMPLETED, esperando que se registre a quién se le
  // entregó— no frenaba nada. Se podía crear la próxima y la anterior, con toda
  // la plata recaudada, desaparecía de la pantalla: el panel muestra una sola
  // campaña por tipo (la más nueva sin entregar) y la vieja quedaba sin ningún
  // lugar desde donde cerrarla.
  const existing = await prisma.donationCampaign.findFirst({
    where: { type: campaignType, status: { in: ["ACTIVE", "COMPLETED"] }, deliveredAt: null },
    select: { name: true, status: true },
  });
  if (existing) {
    return NextResponse.json(
      {
        error:
          existing.status === "COMPLETED"
            ? `"${existing.name}" ya llegó a su meta y falta registrar la entrega. Registrala en la pestaña de entrega y ahí arranca la siguiente.`
            : `Ya hay una campaña activa de este tipo ("${existing.name}").`,
      },
      { status: 409 }
    );
  }

  if (campaignType === "LIBRE") {
    const campaign = await prisma.donationCampaign.create({
      data: {
        type: "LIBRE",
        name: name.trim(),
        description: typeof description === "string" ? description.trim() || null : null,
        goalAmount: typeof goalAmount === "number" && goalAmount > 0 ? goalAmount : null,
        mediaUrl: typeof mediaUrl === "string" ? mediaUrl : null,
        mediaType: mediaUrl ? (mediaType === "VIDEO" ? "VIDEO" : "IMAGE") : null,
        contactPhone: typeof contactPhone === "string" ? contactPhone.trim() || null : null,
        status: "ACTIVE",
      },
    });
    return NextResponse.json(campaign);
  }

  const pct = typeof reservePct === "number" && reservePct >= 0 && reservePct <= 50 ? reservePct : 10;

  const campaign = await prisma.donationCampaign.create({
    data: {
      type: "CANASTA",
      name: name.trim(),
      reservePct: pct,
      goalAmount: 0,
      status: "ACTIVE",
    },
  });

  // Se crean 14 productos "placeholder" para que el admin no tenga que
  // apretar "Agregar alimento" uno por uno — solo edita nombre, precio y foto.
  const PLACEHOLDER_COUNT = 14;
  await prisma.donationProduct.createMany({
    data: Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => ({
      campaignId: campaign.id,
      name: `Producto ${i + 1}`,
      targetPrice: 100,
      sortOrder: i,
    })),
  });

  return NextResponse.json(campaign);
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id, reservePct, name, description, goalAmount, mediaUrl, mediaType, contactPhone } = await req.json();
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const data: {
    reservePct?: number;
    name?: string;
    description?: string | null;
    goalAmount?: number | null;
    mediaUrl?: string | null;
    mediaType?: string | null;
    contactPhone?: string | null;
  } = {};

  if (reservePct !== undefined) {
    if (typeof reservePct !== "number" || reservePct < 0 || reservePct > 50) {
      return NextResponse.json({ error: "reservePct inválido (0 a 50)" }, { status: 400 });
    }
    data.reservePct = reservePct;
  }
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
    }
    data.name = name.trim();
  }
  if (description !== undefined) data.description = typeof description === "string" ? description.trim() || null : null;
  if (goalAmount !== undefined) data.goalAmount = typeof goalAmount === "number" && goalAmount > 0 ? goalAmount : null;
  if (mediaUrl !== undefined) data.mediaUrl = typeof mediaUrl === "string" ? mediaUrl : null;
  if (mediaType !== undefined) data.mediaType = mediaType === "VIDEO" ? "VIDEO" : mediaType === "IMAGE" ? "IMAGE" : null;
  if (contactPhone !== undefined) data.contactPhone = typeof contactPhone === "string" ? contactPhone.trim() || null : null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
  }

  const campaign = await prisma.donationCampaign.update({ where: { id }, data });

  return NextResponse.json(campaign);
}
