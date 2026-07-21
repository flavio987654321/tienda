import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendAbandonedCartEmail,
  sendSubscriptionExpiredEmail,
  sendSubscriptionClosingSoonEmail,
  sendStoreClosedOwnerEmail,
  sendStoreClosedAffiliateEmail,
  sendTermsUpdatedEmail,
} from "@/lib/resend";
import { CURRENT_TERMS_VERSION, CURRENT_TERMS_SUMMARY } from "@/lib/legal";
import { sendWithdrawalReminderEmail, sendMpHealthAlertEmail } from "@/lib/email";
import { createNotification, createNotificationMany } from "@/lib/notifications";
import { generarCuponesMensuales, expirarCuponesVencidos } from "@/lib/rewards";
import { closureDeadline, CLOSURE_WARNING_DAYS } from "@/lib/subscription";
import { applyStoreClosure } from "@/lib/store-closure";

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
      // Solo tiendas online: no tiene sentido invitar a completar una compra en
      // una tienda cerrada o despublicada — el checkout la rechaza y el link de
      // recuperación lleva a la pantalla de "tienda cerrada". El carrito queda
      // guardado igual; si la tienda vuelve, el recordatorio sale en la próxima
      // corrida (reminderSentAt sigue en null).
      store: { closedAt: null, isPublished: true },
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
    // Donaciones que quedaron a mitad de camino: se crean al apretar "Continuar
    // al pago" y quedan PENDING para siempre si la persona no completa el pago
    // en MercadoPago. Nunca se limpiaban. Se les da 7 días de margen, muy por
    // encima de lo que dura un checkout, para no borrar una que todavía podría
    // confirmarse: el webhook solo toca las PENDING, así que borrar una viva
    // haría que un pago real no se registre nunca.
    const ago7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [sessions, clicks, notifications, adminLogs, coupons, storeViews, oldCarts, staleDonations] = await Promise.all([
      prisma.session.deleteMany({ where: { expires: { lt: now } } }),
      prisma.affiliateClick.deleteMany({ where: { createdAt: { lt: ago90d } } }),
      prisma.notification.deleteMany({ where: { read: true, createdAt: { lt: ago30d } } }),
      prisma.adminActionLog.deleteMany({ where: { createdAt: { lt: ago1y } } }),
      prisma.affiliateRewardCoupon.deleteMany({ where: { status: "EXPIRED", expiresAt: { lt: ago6m } } }),
      prisma.storeView.deleteMany({ where: { date: { lt: ago1y.toISOString().slice(0, 10) } } }),
      prisma.abandonedCart.deleteMany({ where: { recoveredAt: null, lastActivityAt: { lt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000) } } }),
      prisma.donation.deleteMany({ where: { status: "PENDING", createdAt: { lt: ago7d } } }),
    ]);
    result.cleanup = { sessions: sessions.count, clicks: clicks.count, notifications: notifications.count, adminLogs: adminLogs.count, coupons: coupons.count, storeViews: storeViews.count, oldCarts: oldCarts.count, staleDonations: staleDonations.count };
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

  // ── 7. VENCIMIENTOS: AVISOS Y CIERRE POR FALTA DE PAGO ─────────────────────
  //
  // Los términos prometen esto desde siempre ("tras el vencimiento y período de
  // gracia, la tienda se ocultará pero tus datos no se borran — podés reactivarla
  // en cualquier momento") y el código no lo cumplía: una tienda impaga quedaba
  // online y vendiendo para siempre, incluido el trial de 7 días.
  //
  // Este cron corre una vez por día. Los avisos se marcan en la suscripción para
  // que una segunda corrida (o un disparo a mano) no los mande de nuevo.
  const vencibles = await prisma.subscription.findMany({
    // Los estados que puede tener alguien que dejó de pagar. El cálculo real lo
    // hace getSubscriptionStatus: en la DB una vencida sigue diciendo ACTIVE.
    // CANCELLED queda afuera: o ya cerró, o la canceló el admin a propósito.
    where: { role: "OWNER", status: { in: ["ACTIVE", "TRIAL", "GRACE", "EXPIRED"] } },
    select: {
      id: true,
      status: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      gracePeriodEndsAt: true,
      expiredNotifiedAt: true,
      closingNotifiedAt: true,
      user: {
        select: {
          email: true,
          name: true,
          store: { select: { id: true, name: true, closedAt: true } },
        },
      },
    },
  });

  let cerradas = 0;
  let avisosVencida = 0;
  let avisosUltimos = 0;

  for (const sub of vencibles) {
    const store = sub.user.store;
    if (!store || store.closedAt) continue; // sin tienda, o ya cerrada

    const deadline = closureDeadline(sub);
    if (!deadline) continue; // la suscripción sigue viva

    const diasRestantes = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);

    if (now >= deadline) {
      // Se acabó el plazo: mismas escrituras que el cierre voluntario.
      // La suscripción NO se toca — ya está vencida, marcarla CANCELLED
      // borraría el motivo real por el que cerró.
      const afiliadas = await prisma.affiliate.findMany({
        where: { storeId: store.id, isActive: true },
        select: { userId: true, user: { select: { email: true, name: true } } },
      });

      await prisma.$transaction(async (tx) => {
        await applyStoreClosure(tx, store.id);
      });

      if (afiliadas.length > 0) {
        await createNotificationMany(
          afiliadas.map((a) => ({
            userId: a.userId,
            type: "STORE_CLOSED",
            title: `${store.name} cerró su tienda`,
            body: "Tu link quedó pausado. El saldo que ya tenías acreditado sigue disponible para retirar, y si la tienda vuelve a abrir recuperás tu lugar.",
            link: "/afiliados",
          }))
        );
        await Promise.all(
          afiliadas.map((a) =>
            sendStoreClosedAffiliateEmail({
              to: a.user.email,
              affiliateName: a.user.name ?? "",
              storeName: store.name,
            }).catch((e) => console.error("[cron] mail cierre afiliada:", a.user.email, e))
          )
        );
      }

      await sendStoreClosedOwnerEmail({
        to: sub.user.email,
        userName: sub.user.name ?? "",
        storeName: store.name,
        reason: "Falta de pago",
      }).catch((e) => console.error("[cron] mail cierre dueña:", sub.user.email, e));

      cerradas++;
      continue;
    }

    // Día 0: recién se venció. Se marca para no repetirlo si el cron corre dos veces.
    if (!sub.expiredNotifiedAt) {
      await sendSubscriptionExpiredEmail({
        to: sub.user.email,
        userName: sub.user.name ?? "",
        storeName: store.name,
        closesOn: deadline,
        daysLeft: diasRestantes,
      }).catch((e) => console.error("[cron] mail vencida:", sub.user.email, e));
      await prisma.subscription.update({ where: { id: sub.id }, data: { expiredNotifiedAt: now } });
      avisosVencida++;
      continue; // un solo mail por día, no dos juntos
    }

    // Último aviso, unos días antes del cierre.
    if (!sub.closingNotifiedAt && diasRestantes <= CLOSURE_WARNING_DAYS) {
      await sendSubscriptionClosingSoonEmail({
        to: sub.user.email,
        userName: sub.user.name ?? "",
        storeName: store.name,
        closesOn: deadline,
        daysLeft: diasRestantes,
      }).catch((e) => console.error("[cron] mail ultimo aviso:", sub.user.email, e));
      await prisma.subscription.update({ where: { id: sub.id }, data: { closingNotifiedAt: now } });
      avisosUltimos++;
    }
  }

  result.vencimientos = { revisadas: vencibles.length, cerradas, avisosVencida, avisosUltimos };

  // ── AVISO DE CAMBIO EN LOS TÉRMINOS ────────────────────────────────────────
  // Le escribe SOLO a quien todavía no aceptó la versión vigente y a quien no
  // se le avisó por esta versión. El que entra a la app ve el banner y acepta
  // ahí, así que nunca recibe el mail: esto es el plan B para el que no volvió.
  //
  // Corre siempre, sin fecha de disparo: lee CURRENT_TERMS_VERSION del código
  // que está deployado. Si el deploy no salió, la constante sigue siendo la
  // vieja y no encuentra a nadie — no puede avisar de unos términos que no
  // están online.
  // Los `null` van explícitos en cada OR: en SQL `NOT (NULL = '1.4')` da NULL,
  // no true, así que un `NOT` solo se come a quien tiene el campo vacío. Sin
  // esto quedaban afuera justo los que nunca aceptaron ninguna versión, que son
  // los que más necesitan el aviso.
  const pendientesTerminos = await prisma.user.findMany({
    where: {
      email: { not: { contains: "@deleted.invalid" } },
      AND: [
        { OR: [{ termsVersion: null }, { NOT: { termsVersion: CURRENT_TERMS_VERSION } }] },
        { OR: [{ termsNotifiedVersion: null }, { NOT: { termsNotifiedVersion: CURRENT_TERMS_VERSION } }] },
      ],
    },
    select: { id: true, email: true, name: true, role: true },
  });

  let avisosTerminos = 0;
  for (const u of pendientesTerminos) {
    // Cada rol acepta desde su propia pantalla, que es donde vive el banner.
    // ?terminos=1 lo fuerza a mostrarse aunque lo hayan cerrado con la ✕.
    const acceptPath =
      u.role === "OWNER" ? "/dashboard?terminos=1"
      : u.role === "SELLER" ? "/afiliados?terminos=1"
      : "/mi-cuenta?terminos=1";

    try {
      await sendTermsUpdatedEmail({
        to: u.email,
        userName: u.name ?? "",
        acceptPath,
        summary: CURRENT_TERMS_SUMMARY,
      });
      // Se marca solo si el envío no tiró: si Resend falla, queda pendiente y
      // lo reintenta mañana en vez de darlo por avisado.
      await prisma.user.update({
        where: { id: u.id },
        data: { termsNotifiedVersion: CURRENT_TERMS_VERSION },
      });
      avisosTerminos++;
    } catch (e) {
      console.error("[cron] mail terminos:", u.email, e);
    }
  }

  result.terminos = { version: CURRENT_TERMS_VERSION, pendientes: pendientesTerminos.length, avisados: avisosTerminos };

  return NextResponse.json(result);
}
