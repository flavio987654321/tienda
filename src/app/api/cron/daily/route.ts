import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAbandonedCartEmail } from "@/lib/resend";
import { sendWithdrawalReminderEmail, sendMpHealthAlertEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { generarCuponesMensuales, expirarCuponesVencidos } from "@/lib/rewards";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

type SnapshotItem = { name: string; price: number; qty: number; image?: string | null };

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Dom, 1=Lun
  const dayOfMonth = now.getUTCDate();
  const result: Record<string, unknown> = { ranAt: now.toISOString() };

  // ── 1. PUBLICAR PRODUCTOS PROGRAMADOS ──────────────────────────────────────
  const scheduledProducts = await prisma.product.findMany({
    where: { publishAt: { lte: now }, isActive: false, deletedAt: null },
    select: { id: true },
  });
  if (scheduledProducts.length > 0) {
    await prisma.product.updateMany({
      where: { id: { in: scheduledProducts.map((p) => p.id) } },
      data: { isActive: true, publishAt: null },
    });
  }
  result.publishedProducts = scheduledProducts.length;

  // ── 2. CARRITOS ABANDONADOS ────────────────────────────────────────────────
  const minAge = new Date(now.getTime() - 1 * 60 * 60 * 1000);
  const maxAge = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const abandonedCarts = await prisma.abandonedCart.findMany({
    where: {
      recoveredAt: null,
      reminderSentAt: null,
      lastActivityAt: { lte: minAge, gte: maxAge },
    },
    include: { store: { select: { name: true, slug: true } } },
  });

  let cartsSent = 0;
  for (const cart of abandonedCarts) {
    let items: SnapshotItem[] = [];
    try { items = JSON.parse(cart.items); } catch { /* noop */ }
    if (items.length > 0) {
      sendAbandonedCartEmail({
        to: cart.customerEmail,
        customerName: cart.customerName,
        storeName: cart.store.name,
        items,
        total: cart.total,
        recoveryUrl: `${APP_URL}/tienda/${cart.store.slug}?recuperar=${cart.id}`,
      }).catch((e) => console.error("[cron] abandonedCart email:", e));
      cartsSent++;
    }
    await prisma.abandonedCart.update({
      where: { id: cart.id },
      data: { reminderSentAt: now },
    });
  }
  result.abandonedCartsSent = cartsSent;

  // ── 3. RECORDATORIOS DE RETIROS PENDIENTES ─────────────────────────────────
  const halfDay = 12 * 60 * 60 * 1000;
  const day7 = 7 * 24 * 60 * 60 * 1000;
  const day15 = 15 * 24 * 60 * 60 * 1000;
  const [pendingWithdrawals, adminUser] = await Promise.all([
    prisma.walletWithdrawal.findMany({
      where: {
        status: "PENDING",
        OR: [
          { createdAt: { gte: new Date(now.getTime() - day7 - halfDay), lte: new Date(now.getTime() - day7 + halfDay) } },
          { createdAt: { gte: new Date(now.getTime() - day15 - halfDay), lte: new Date(now.getTime() - day15 + halfDay) } },
        ],
      },
      select: {
        id: true, amount: true, createdAt: true,
        wallet: { select: { affiliate: { select: { user: { select: { name: true, email: true } }, store: { select: { name: true, slug: true } } } } } },
      },
    }),
    prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true, email: true, name: true } }),
  ]);

  let withdrawalReminders = 0;
  for (const wd of pendingWithdrawals) {
    const aff = wd.wallet?.affiliate;
    if (!aff || !adminUser) continue;
    const daysOld = Math.floor((now.getTime() - new Date(wd.createdAt).getTime()) / 86_400_000);
    createNotification({
      userId: adminUser.id,
      type: daysOld >= 15 ? "WITHDRAWAL_REMINDER_URGENT" : "WITHDRAWAL_REMINDER",
      title: daysOld >= 15
        ? `Retiro sin procesar: ${aff.user.name || aff.user.email} lleva ${daysOld} días esperando`
        : `Recordatorio: retiro de ${aff.user.name || aff.user.email} hace ${daysOld} días`,
      body: `$${wd.amount.toLocaleString("es-AR")} — ${aff.store.name}`,
      link: "/admin/retiros",
    }).catch((e) => console.error("[cron] withdrawal notification:", e));
    sendWithdrawalReminderEmail({
      ownerEmail: adminUser.email!,
      ownerName: adminUser.name ?? "Admin",
      storeName: aff.store.name,
      affiliateName: aff.user.name || aff.user.email,
      amount: wd.amount,
      daysOld,
      dashboardUrl: `${APP_URL}/admin/retiros`,
    }).catch((e) => console.error("[cron] withdrawal email:", e));
    withdrawalReminders++;
  }
  result.withdrawalReminders = withdrawalReminders;

  // ── 4. SALUD DE MERCADOPAGO ────────────────────────────────────────────────
  const mpToken = process.env.MP_ACCESS_TOKEN;
  if (mpToken) {
    const hourAR = (now.getUTCHours() - 3 + 24) % 24;
    if (hourAR >= 9 && hourAR <= 23) {
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
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const [lastMpPayment, mpStoreCount] = await Promise.all([
        prisma.payment.findFirst({ where: { provider: "mercadopago", status: "APPROVED" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
        prisma.store.count({ where: { mpAccessToken: { not: null } } }),
      ]);
      const noRecentWebhook = mpStoreCount > 0 && lastMpPayment && lastMpPayment.createdAt < oneDayAgo;
      if (!mpApiOk || noRecentWebhook) {
        const reason = !mpApiOk ? mpError : `No se registraron pagos vía MP webhook en las últimas 24 horas (${mpStoreCount} tiendas con MP conectado)`;
        await sendMpHealthAlertEmail({ reason, lastEventAt: lastMpPayment?.createdAt.toLocaleString("es-AR") ?? "Sin registros" });
      }
      result.mpHealthOk = mpApiOk;
    }
  }

  // ── 5. CLEANUP SEMANAL (solo lunes) ───────────────────────────────────────
  if (dayOfWeek === 1) {
    const ago30d = new Date(now.getTime() - 30  * 24 * 60 * 60 * 1000);
    const ago90d = new Date(now.getTime() - 90  * 24 * 60 * 60 * 1000);
    const ago6m  = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const ago1y  = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const [sessions, clicks, notifications, adminLogs, coupons, storeViews, oldCarts] = await Promise.all([
      prisma.session.deleteMany({ where: { expires: { lt: now } } }),
      prisma.affiliateClick.deleteMany({ where: { createdAt: { lt: ago90d } } }),
      prisma.notification.deleteMany({ where: { read: true, createdAt: { lt: ago30d } } }),
      prisma.adminActionLog.deleteMany({ where: { createdAt: { lt: ago1y } } }),
      prisma.affiliateRewardCoupon.deleteMany({ where: { status: "EXPIRED", expiresAt: { lt: ago6m } } }),
      prisma.storeView.deleteMany({ where: { date: { lt: ago1y.toISOString().slice(0, 10) } } }),
      prisma.abandonedCart.deleteMany({ where: { recoveredAt: null, lastActivityAt: { lt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000) } } }),
    ]);
    result.cleanup = { sessions: sessions.count, clicks: clicks.count, notifications: notifications.count, adminLogs: adminLogs.count, coupons: coupons.count, storeViews: storeViews.count, oldCarts: oldCarts.count };
  }

  // ── 6. PREMIOS MENSUALES (solo día 1 del mes) ──────────────────────────────
  if (dayOfMonth === 1) {
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = previousMonth.getFullYear();
    const month = previousMonth.getMonth() + 1;
    const affiliates = await prisma.affiliate.findMany({
      where: { isActive: true, status: "APPROVED" },
      select: { id: true },
    });
    for (const affiliate of affiliates) {
      await generarCuponesMensuales(affiliate.id, year, month);
    }
    await expirarCuponesVencidos();
    result.premiosMensuales = { year, month, affiliatesProcessed: affiliates.length };
  }

  return NextResponse.json(result);
}
