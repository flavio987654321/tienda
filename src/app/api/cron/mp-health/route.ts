import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMpHealthAlertEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Solo alertar en horario donde se esperan pagos (9am - 11pm Buenos Aires = UTC-3)
  const hourUtc = new Date().getUTCHours();
  const hourAR = (hourUtc - 3 + 24) % 24;
  if (hourAR < 9 || hourAR > 23) {
    return NextResponse.json({ ok: true, skipped: "outside business hours" });
  }

  // Verificar credenciales MP haciendo un ping a la API
  const mpToken = process.env.MP_ACCESS_TOKEN;
  if (!mpToken) {
    return NextResponse.json({ ok: true, skipped: "no MP_ACCESS_TOKEN configured" });
  }

  let mpApiOk = true;
  let mpError = "";
  try {
    const res = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${mpToken}` },
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 401 || res.status === 403) {
      mpApiOk = false;
      mpError = `MP API respondió con status ${res.status} — posible suspensión de cuenta`;
    }
  } catch (e) {
    mpApiOk = false;
    mpError = `No se pudo conectar a MP API: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Verificar último webhook recibido (último pedido confirmado vía MP)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const lastMpPayment = await prisma.payment.findFirst({
    where: {
      provider: "mercadopago",
      status: "APPROVED",
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  // Hay tiendas con MP conectado?
  const mpStoreCount = await prisma.store.count({
    where: { mpAccessToken: { not: null } },
  });

  const noRecentWebhook =
    mpStoreCount > 0 &&
    lastMpPayment &&
    lastMpPayment.createdAt < oneDayAgo;

  if (!mpApiOk || noRecentWebhook) {
    const reason = !mpApiOk
      ? mpError
      : `No se registraron pagos vía MP webhook en las últimas 6 horas (${mpStoreCount} tiendas con MP conectado)`;

    const lastEventAt = lastMpPayment
      ? lastMpPayment.createdAt.toLocaleString("es-AR")
      : "Sin registros";

    await sendMpHealthAlertEmail({ reason, lastEventAt });

    return NextResponse.json({ ok: false, reason });
  }

  return NextResponse.json({
    ok: true,
    mpApiOk,
    lastWebhook: lastMpPayment?.createdAt ?? null,
    mpStores: mpStoreCount,
  });
}
