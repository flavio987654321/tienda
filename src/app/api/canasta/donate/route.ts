import { NextRequest, NextResponse } from "next/server";
import { Preference } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { platformClient } from "@/lib/mp";
import { calculateGoalAmount, MIN_DONATION, MAX_DONATION_PCT_OF_GOAL } from "@/lib/canasta";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/canasta/donate
// Crea la donación (PENDING) y la preferencia de Checkout Pro de MercadoPago.
// La plata va directo a la cuenta de la plataforma (mismo patrón que las
// suscripciones), no a un vendedor. Permite donar con o sin cuenta.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`canasta-donate:${ip}`, 5, 60_000))) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá un momento." }, { status: 429 });
  }

  const body = await req.json();
  const { amount, donorName, donorPhone, donorEmail, donorLocalidad } = body;
  const type = body.type === "LIBRE" ? "LIBRE" : "CANASTA";
  const campaignPagePath = type === "LIBRE" ? "/comunidad/causa" : "/comunidad/campana";
  const donarPagePath = type === "LIBRE" ? "/comunidad/causa/donar" : "/canasta/donar";

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < MIN_DONATION) {
    return NextResponse.json({ error: `El monto mínimo es $${MIN_DONATION.toLocaleString("es-AR")}` }, { status: 400 });
  }
  if (typeof donorName !== "string" || !donorName.trim()) {
    return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });
  }
  if (typeof donorPhone !== "string" || !donorPhone.trim()) {
    return NextResponse.json({ error: "Falta el teléfono" }, { status: 400 });
  }
  if (typeof donorEmail !== "string" || !EMAIL_REGEX.test(donorEmail.trim())) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }
  if (typeof donorLocalidad !== "string" || !donorLocalidad.trim()) {
    return NextResponse.json({ error: "Falta la localidad" }, { status: 400 });
  }

  const campaign = await prisma.donationCampaign.findFirst({
    where: { type, status: "ACTIVE", deliveredAt: null },
    include: { products: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  if (!campaign) return NextResponse.json({ error: "No hay ninguna campaña activa para donar ahora" }, { status: 404 });

  const goalAmount = type === "LIBRE" ? campaign.goalAmount : calculateGoalAmount(campaign.products, campaign.reservePct);
  if (goalAmount) {
    const maxDonation = Math.floor(goalAmount * MAX_DONATION_PCT_OF_GOAL);
    if (amount > maxDonation) {
      return NextResponse.json(
        { error: `El máximo por donación es $${maxDonation.toLocaleString("es-AR")} (${Math.round(MAX_DONATION_PCT_OF_GOAL * 100)}% de la meta), para que la campaña sea un aporte de toda la comunidad.` },
        { status: 400 }
      );
    }

    // No dejamos que una donación se pase de la meta: si falta menos de lo
    // que la persona quiere donar, el tope pasa a ser justo lo que falta.
    const confirmedSum = await prisma.donation.aggregate({
      where: { campaignId: campaign.id, status: "CONFIRMED" },
      _sum: { amount: true },
    });
    const totalRaised = confirmedSum._sum.amount ?? 0;
    const remaining = goalAmount - totalRaised;
    if (remaining <= 0) {
      return NextResponse.json({ error: "Esta campaña ya alcanzó su meta." }, { status: 409 });
    }
    if (amount > remaining) {
      return NextResponse.json(
        { error: `Solo faltan $${Math.floor(remaining).toLocaleString("es-AR")} para completar la meta — doná ese monto o menos.` },
        { status: 400 }
      );
    }
  }

  const user = await getCurrentUser();
  const email = donorEmail.trim().toLowerCase();
  const phone = donorPhone.trim();

  // Chequeo amigable antes de tocar la DB (el índice único parcial es el
  // que realmente protege contra condiciones de carrera, esto es solo para
  // dar un mensaje claro en el caso normal).
  const dedupConditions = user ? [{ userId: user.id }, { donorEmail: email, donorPhone: phone }] : [{ donorEmail: email, donorPhone: phone }];
  const existingConfirmed = await prisma.donation.findFirst({
    where: { campaignId: campaign.id, status: "CONFIRMED", OR: dedupConditions },
  });
  if (existingConfirmed) {
    return NextResponse.json({ error: "Ya hiciste una donación confirmada para esta campaña" }, { status: 409 });
  }

  const donation = await prisma.donation.create({
    data: {
      campaignId: campaign.id,
      userId: user?.id ?? null,
      amount,
      status: "PENDING",
      donorName: donorName.trim(),
      donorPhone: phone,
      donorEmail: email,
      donorLocalidad: donorLocalidad.trim(),
    },
  });

  try {
    const client = platformClient();
    const preference = new Preference(client);
    const pref = await preference.create({
      body: {
        items: [
          {
            id: donation.id,
            title: `Donación a ${campaign.name}`,
            unit_price: amount,
            quantity: 1,
            currency_id: "ARS",
          },
        ],
        external_reference: donation.id,
        back_urls: {
          success: `${APP_URL}${campaignPagePath}?donacion=ok`,
          failure: `${APP_URL}${donarPagePath}?donacion=error`,
          pending: `${APP_URL}${campaignPagePath}?donacion=pendiente`,
        },
        auto_return: "approved",
        notification_url: `${APP_URL}/api/canasta/webhook`,
        metadata: { donationId: donation.id },
      },
    });

    const checkoutUrl = process.env.NODE_ENV === "production" ? pref.init_point : pref.sandbox_init_point;
    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    console.error("[canasta/donate] error creando preferencia MP:", err);
    // La donación PENDING queda guardada igual — si el admin necesita
    // limpiarla manualmente puede hacerlo, pero no bloquea reintentos
    // porque la dedup solo aplica a donaciones CONFIRMED.
    return NextResponse.json({ error: "No se pudo iniciar el pago. Probá de nuevo." }, { status: 500 });
  }
}
