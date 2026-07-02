import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAbandonedCartEmail } from "@/lib/resend";
import { sendWithdrawalReminderEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

type SnapshotItem = { name: string; price: number; qty: number; image?: string | null };

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const minAge = new Date(now.getTime() - 1 * 60 * 60 * 1000); // al menos 1h inactivo
  const maxAge = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // no molestar con carritos de +7 días

  const carts = await prisma.abandonedCart.findMany({
    where: {
      recoveredAt: null,
      reminderSentAt: null,
      lastActivityAt: { lte: minAge, gte: maxAge },
    },
    include: { store: { select: { name: true, slug: true } } },
  });

  let sent = 0;
  for (const cart of carts) {
    let items: SnapshotItem[] = [];
    try {
      items = JSON.parse(cart.items);
    } catch { /* noop */ }

    if (items.length > 0) {
      sendAbandonedCartEmail({
        to: cart.customerEmail,
        customerName: cart.customerName,
        storeName: cart.store.name,
        items,
        total: cart.total,
        recoveryUrl: `${APP_URL}/tienda/${cart.store.slug}?recuperar=${cart.id}`,
      }).catch((e) => console.error("[abandonedCart] email:", e));
      sent++;
    }

    // Se marca enviado aunque el email falle, igual que el resto de los
    // emails fire-and-forget del proyecto: evita reintentos infinitos.
    await prisma.abandonedCart.update({
      where: { id: cart.id },
      data: { reminderSentAt: now },
    });
  }

  // --- Recordatorios de retiros pendientes (hitos 7 y 15 días) ---
  const halfDay = 12 * 60 * 60 * 1000;
  const day7 = 7 * 24 * 60 * 60 * 1000;
  const day15 = 15 * 24 * 60 * 60 * 1000;

  const [pendingWithdrawals, adminUser] = await Promise.all([
    prisma.walletWithdrawal.findMany({
      where: {
        status: "PENDING",
        OR: [
          // Hito 7 días (±12h)
          { createdAt: { gte: new Date(now.getTime() - day7 - halfDay), lte: new Date(now.getTime() - day7 + halfDay) } },
          // Hito 15 días (±12h)
          { createdAt: { gte: new Date(now.getTime() - day15 - halfDay), lte: new Date(now.getTime() - day15 + halfDay) } },
        ],
      },
      select: {
        id: true,
        amount: true,
        createdAt: true,
        wallet: {
          select: {
            affiliate: {
              select: {
                user: { select: { name: true, email: true } },
                store: { select: { name: true, slug: true } },
              },
            },
          },
        },
      },
    }),
    prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true, email: true, name: true } }),
  ]);

  let withdrawalReminders = 0;
  for (const wd of pendingWithdrawals) {
    const aff = wd.wallet?.affiliate;
    if (!aff || !adminUser) continue;

    const daysOld = Math.floor((now.getTime() - new Date(wd.createdAt).getTime()) / 86_400_000);
    const adminRetiros = `${APP_URL}/admin/retiros`;

    // Notificación in-app al admin
    createNotification({
      userId: adminUser.id,
      type: daysOld >= 15 ? "WITHDRAWAL_REMINDER_URGENT" : "WITHDRAWAL_REMINDER",
      title: daysOld >= 15
        ? `Retiro sin procesar: ${aff.user.name || aff.user.email} lleva ${daysOld} días esperando`
        : `Recordatorio: retiro de ${aff.user.name || aff.user.email} hace ${daysOld} días`,
      body: `$${wd.amount.toLocaleString("es-AR")} — ${aff.store.name}`,
      link: "/admin/retiros",
    }).catch((e) => console.error("[cron] withdrawal notification:", e));

    // Email al admin
    sendWithdrawalReminderEmail({
      ownerEmail: adminUser.email!,
      ownerName: adminUser.name ?? "Admin",
      storeName: aff.store.name,
      affiliateName: aff.user.name || aff.user.email,
      amount: wd.amount,
      daysOld,
      dashboardUrl: adminRetiros,
    }).catch((e) => console.error("[cron] withdrawal email:", e));

    withdrawalReminders++;
  }

  return NextResponse.json({ found: carts.length, sent, withdrawalReminders, ranAt: now.toISOString() });
}
