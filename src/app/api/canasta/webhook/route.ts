import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { calculateGoalAmount } from "@/lib/canasta";
import { sendCanastaDonationConfirmedEmail, sendCanastaCompletedAdminEmail } from "@/lib/resend";
import { despues } from "@/lib/despues";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// Mismo esquema de firma que el resto de los webhooks de MP en este
// proyecto (ver src/app/api/suscripcion/webhook/route.ts).
function verifyMPSignature(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("CRÍTICO: MP_WEBHOOK_SECRET no está configurado en producción");
      return false;
    }
    return true;
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id") ?? "";
  if (!xSignature) return false;

  const ts = xSignature.match(/ts=([^,]+)/)?.[1];
  const v1 = xSignature.match(/v1=([^,]+)/)?.[1];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.type !== "payment") return NextResponse.json({ ok: true });

    const paymentId = body.data?.id;
    if (!paymentId) return NextResponse.json({ ok: true });

    if (!verifyMPSignature(req, String(paymentId))) {
      console.warn("[canasta/webhook] firma inválida — request ignorada", { paymentId });
      return NextResponse.json({ ok: true });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!mpRes.ok) return NextResponse.json({ ok: true });
    const payment = await mpRes.json();

    if (payment.status !== "approved") return NextResponse.json({ ok: true });

    const donationId = payment.external_reference;
    if (!donationId) return NextResponse.json({ ok: true });

    const donation = await prisma.donation.findUnique({ where: { id: donationId } });
    // Idempotencia: si ya no está PENDING (ya se procesó este pago antes,
    // o nunca existió), no hacemos nada más.
    if (!donation || donation.status !== "PENDING") return NextResponse.json({ ok: true });

    // ── Validar que lo pagado sea lo que la donación dice ─────────────────────
    // Era el único de los tres webhooks de MP que no miraba el monto: alcanzaba
    // con que el pago viniera "approved" para dar la donación por confirmada por
    // el importe guardado en la base, sin comparar contra lo que entró de verdad.
    //
    // Hoy no se podía explotar —el precio lo fija el servidor al crear la
    // preferencia (lib/canasta-checkout) y Checkout Pro no deja cambiarlo—, pero
    // una donación confirmada de menos suma igual a la meta y cierra la campaña
    // con plata que nunca llegó. Es el mismo criterio y la misma tolerancia del
    // 5% que ya usan mp/webhook y suscripcion/webhook.
    const pagado = payment.transaction_amount;
    if (typeof pagado === "number" && donation.amount > 0) {
      if (pagado < donation.amount * 0.95) {
        console.error("[canasta/webhook] monto pagado MENOR al de la donación — no se confirma", {
          paymentId, donationId: donation.id, recibido: pagado, esperado: donation.amount,
        });
        return NextResponse.json({ ok: true });
      }
      if (pagado > donation.amount * 1.05) {
        console.warn("[canasta/webhook] monto pagado MAYOR al de la donación — se confirma igual", {
          paymentId, donationId: donation.id, recibido: pagado, esperado: donation.amount,
        });
      }
    }

    const campaign = await prisma.donationCampaign.findUnique({
      where: { id: donation.campaignId },
      include: { products: { orderBy: { sortOrder: "asc" } } },
    });
    if (!campaign) return NextResponse.json({ ok: true });

    // Compare-and-swap: si dos notificaciones llegan casi simultáneas para
    // el mismo pago, solo una efectivamente confirma la donación.
    const confirmed = await prisma.donation.updateMany({
      where: { id: donation.id, status: "PENDING" },
      data: { status: "CONFIRMED", mpPaymentId: String(paymentId) },
    });
    if (confirmed.count === 0) return NextResponse.json({ ok: true });

    sendCanastaDonationConfirmedEmail({
      to: donation.donorEmail,
      donorName: donation.donorName,
      amount: donation.amount,
      campaignName: campaign.name,
      campaignUrl: `${APP_URL}${campaign.type === "LIBRE" ? "/comunidad/causa" : "/comunidad/campana"}`,
      campaignType: campaign.type === "LIBRE" ? "LIBRE" : "CANASTA",
    }).catch((e) => console.error("[canasta/webhook] error mandando email de confirmación:", e));

    // ¿Esta donación completó la meta? Si es así, cerrar la campaña a nuevas
    // donaciones y avisar al admin que ya puede elegir a quién se le entrega.
    // CANASTA siempre tiene meta (se calcula de productos). LIBRE puede no
    // tener meta (sin techo) — en ese caso nunca se auto-completa, el admin
    // la cierra a mano cuando decida.
    const goalAmount = campaign.type === "LIBRE" ? campaign.goalAmount : calculateGoalAmount(campaign.products, campaign.reservePct);
    if (campaign.status === "ACTIVE" && goalAmount) {
      const confirmedDonations = await prisma.donation.aggregate({
        where: { campaignId: campaign.id, status: "CONFIRMED" },
        _sum: { amount: true },
      });
      const totalRaised = confirmedDonations._sum.amount ?? 0;

      if (totalRaised >= goalAmount) {
        // Compare-and-swap: si dos donaciones cruzan la meta casi al mismo
        // tiempo, solo una marca la campaña como completada y avisa al admin.
        const closed = await prisma.donationCampaign.updateMany({
          where: { id: campaign.id, status: "ACTIVE" },
          data: { status: "COMPLETED" },
        });
        const canastaSupportEmail = process.env.CANASTA_SUPPORT_EMAIL ?? process.env.ADMIN_EMAIL;
        if (closed.count > 0 && canastaSupportEmail) {
          despues(() => sendCanastaCompletedAdminEmail({
            to: canastaSupportEmail,
            campaignName: campaign.name,
            totalRaised,
            goalAmount,
            campaignType: campaign.type === "LIBRE" ? "LIBRE" : "CANASTA",
          }), "canasta: aviso de campaña completa al admin");
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[canasta/webhook] error:", err);
    return NextResponse.json({ ok: true }); // Siempre 200 para que MP no reintente en loop
  }
}
