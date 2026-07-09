import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDonationCheckout } from "@/lib/canasta";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export const runtime = "nodejs";

// POST /api/canasta/donation-checkout
// Genera el pago de Mercado Pago para una donación que ya existe como
// PENDING (creada, por ejemplo, junto con una compra en una tienda — ver
// /api/checkout). No crea una donación nueva, solo el cobro.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`canasta-donation-checkout:${ip}`, 10, 60_000))) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá un momento." }, { status: 429 });
  }

  const { donationId } = await req.json();
  if (typeof donationId !== "string" || !donationId) {
    return NextResponse.json({ error: "donationId requerido" }, { status: 400 });
  }

  const donation = await prisma.donation.findUnique({ where: { id: donationId } });
  if (!donation) return NextResponse.json({ error: "No encontramos esa donación" }, { status: 404 });
  if (donation.status !== "PENDING") {
    return NextResponse.json({ error: "Esta donación ya fue procesada" }, { status: 409 });
  }

  const campaign = await prisma.donationCampaign.findUnique({ where: { id: donation.campaignId } });
  if (!campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });

  try {
    const checkoutUrl = await createDonationCheckout(donation, campaign.name);
    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    console.error("[canasta/donation-checkout] error creando preferencia MP:", err);
    return NextResponse.json({ error: "No se pudo iniciar el pago. Probá de nuevo." }, { status: 500 });
  }
}
