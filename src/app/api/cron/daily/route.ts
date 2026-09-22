import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendAbandonedCartEmail,
  sendSubscriptionExpiredEmail,
  sendSubscriptionClosingSoonEmail,
  sendStoreClosedOwnerEmail,
  sendStoreClosedAffiliateEmail,
  sendTermsUpdatedEmail,
  sendCaidaAFreeEmail,
  sendDominioEnFreeEmail,
} from "@/lib/resend";
import { CURRENT_TERMS_VERSION, CURRENT_TERMS_SUMMARY } from "@/lib/legal";
import { sendWithdrawalReminderEmail, sendMpHealthAlertEmail } from "@/lib/email";
import { limpiar } from "@/app/api/cron/cleanup/route";
import { createNotification, createNotificationMany } from "@/lib/notifications";
import { generarCuponesMensuales, expirarCuponesVencidos } from "@/lib/rewards";
import { closureDeadline, CLOSURE_WARNING_DAYS, getSubscriptionStatus, caidaAFree } from "@/lib/subscription";
import { PLANES, planDeSuscripcion, TOPES_DIGITALES } from "@/lib/planLimits";
import { despublicarLasDeMas, type ResultadoDeLaCaida } from "@/lib/caida-a-free";
import {
  aDondeRedirige, momentoDelDominio, fechaDeSoltar, soltarLosDominiosDe, DIAS_DE_DOMINIO_EN_FREE,
} from "@/lib/dominio-digital";
import { direccionDelProducto } from "@/lib/direccion-digital";
import { applyStoreClosure } from "@/lib/store-closure";
import { getStoreSnapshot } from "@/lib/asistente-insights";
import { armarAvisos, filtrarRepetidos } from "@/lib/asistente-avisos";
import {
  getArgentinaDayKey, getUpcomingDates, sumarDiasCalendario, diasEntreDias,
} from "@/lib/fechas-comerciales";
import { despues } from "@/lib/despues";
import { renovarTokensPorVencer } from "@/lib/facebook-token";
import { rechazoDeCron } from "@/lib/cron-auth";
import { sendCarritoAbandonadoDigitalEmail } from "@/lib/resend";
import { PAGO_EN_CAMINO } from "@/lib/carritos-digitales";
import { ofertaParaElMail } from "@/lib/oferta-salida-db";
import { dominioDeLaPlataforma } from "@/lib/configuracion-digital";
import { tokenDeBaja } from "@/lib/correos-compradores-firma";
import { urlBajaCorreo, urlBajaCorreoUnClic } from "@/lib/correos-compradores";
import { baseDeLosMails } from "@/lib/correos-compradores-db";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// El techo del plan gratis de Vercel. Sin declararlo, la función se queda con el
// default de la plataforma —bastante más corto— y este cron hace mucho: mails de
// carritos, salud de MercadoPago, premios del mes, avisos de vencimiento, cierre
// de tiendas por falta de pago, avisos de Sasha y la limpieza.
//
// Importa el orden: si se corta a la mitad, lo que no corre es lo de ABAJO, y
// abajo están el cierre por falta de pago y los avisos de términos. Se cortaría
// sin ruido —no hay error, la plataforma simplemente mata la función— así que
// nadie se enteraría de que hace días que no cierra una tienda.
//
// Si algún día no alcanzan los 60 s, la salida no es subir esto (no se puede en
// el plan gratis) sino partir el cron en dos, o mover lo pesado a `after()`.
export const maxDuration = 60;

type SnapshotItem = { name: string; price: number; qty: number; image?: string | null };

export async function GET(req: NextRequest) {
  const rechazo = rechazoDeCron(req);
  if (rechazo) return rechazo;

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

  // ── 1 bis. RENOVAR TOKENS DE META ──────────────────────────────────────────
  // Va arriba y no al final por lo que dice el comentario de `maxDuration`: si
  // el cron se corta, lo que no corre es lo de abajo. Un token vencido deja una
  // tienda sin sincronizar durante días sin que nadie se entere, así que no
  // puede quedar en la parte que se pierde.
  //
  // Es barato igual: sólo toca las que vencen dentro de 10 días, con techo de 25
  // por corrida. Hoy son cero o una.
  result.metaTokens = await renovarTokensPorVencer(now);

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

  // Se juntan y se esperan al final. Sueltos, nada los esperaba —al volver el
  // handler la plataforma puede congelar la función con los envíos a medio
  // hacer— y además `cartsSent` contaba intentos, no envíos: el cron informaba
  // "mandé N" sin saber si salió alguno. `Promise.all` no los serializa.
  const enviosCarritos: Promise<boolean>[] = [];
  for (const cart of abandonedCarts) {
    let items: SnapshotItem[] = [];
    try { items = JSON.parse(cart.items); } catch { /* noop */ }
    if (items.length > 0) {
      enviosCarritos.push(
        sendAbandonedCartEmail({
          to: cart.customerEmail,
          customerName: cart.customerName,
          storeName: cart.store.name,
          items,
          total: cart.total,
          recoveryUrl: `${APP_URL}/tienda/${cart.store.slug}?recuperar=${cart.id}`,
        }).then(() => true).catch((e) => {
          console.error("[cron] abandonedCart email:", e);
          return false;
        })
      );
    }
    await prisma.abandonedCart.update({
      where: { id: cart.id },
      data: { reminderSentAt: now },
    });
  }
  result.abandonedCartsSent = (await Promise.all(enviosCarritos)).filter(Boolean).length;

  // ── 2 bis. CARRITOS ABANDONADOS DE PRODUCTOS DIGITALES ─────────────────────
  //
  // Es la función que Pro vende, y por eso corre acá arriba: si el cron se corta
  // por tiempo, lo que se pierde es lo de abajo. Ver el comentario de
  // `maxDuration`.
  //
  // ⚠️ Acá un carrito abandonado ES una orden que nunca se pagó. En este
  // ecosistema no hay carrito —se aprieta comprar, se escribe el correo y se sale
  // derecho a Mercado Pago—, así que la orden en PENDING ya tiene todo. Ver
  // `lib/carritos-digitales`.
  //
  // ── Las cuatro condiciones, y por qué cada una ────────────────────────────
  //
  //   1. **Sólo Pro, y con el plan al día.** Es lo que se cobra. Ver los planes.
  //   2. **Una sola vez por compra** (`recordatorioAt: null`). Insistirle a quien
  //      no quiso comprar es correo no deseado, y el que queda mal es el negocio
  //      de quien vende, con su nombre en el asunto.
  //   3. **El pago no puede estar EN CAMINO.** Mercado Pago deja pagar en
  //      efectivo con un cupón que dura días: escribirle "te olvidaste de pagar"
  //      a alguien que tiene el cupón en la mano es lo peor que puede hacer este
  //      mail. El webhook anota esos estados justamente para esto.
  //   4. **Ni muy nueva ni muy vieja.** Menos de 3 horas puede ser alguien que
  //      está pagando; más de 7 días, escribirle es raro.
  //   5. **Ni a quien pidió la baja, ni dos veces por semana a la misma
  //      persona.** (Auditoría de seguridad del 21/09/26.) El checkout es
  //      público: cualquiera escribe el mail de OTRO y abre una compra, y
  //      cada compra abandonada era un mail con el nombre de la vendedora a
  //      esa persona. Con un bot: un mail cada media hora (el freno de
  //      órdenes repetidas), por producto, por tienda, durante días; y la
  //      persona no tenía cómo pararlo, porque este mail no traía baja.
  //      Ahora la baja de la vendedora (`BajaCorreoDigital`, la misma de
  //      los correos a compradores) vale acá también, el mail trae el link
  //      y la cabecera de un clic, y a una misma persona una misma tienda le
  //      escribe por un carrito como mucho una vez cada 7 días.
  const desdeCarritoD = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const hastaCarritoD = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const baseCarritoD = baseDeLosMails();

  const carritosDigitales = await prisma.order.findMany({
    where: {
      status: "PENDING",
      recordatorioAt: null,
      createdAt: { lte: desdeCarritoD, gte: hastaCarritoD },
      // El pago no está en camino. `OR` con `is: null` porque una orden puede no
      // tener fila de pago todavía, y esa también es un abandono.
      OR: [
        { payment: { is: null } },
        { payment: { status: { notIn: [...PAGO_EN_CAMINO] } } },
      ],
      store: {
        owner: {
          role: "DIGITAL",
          subscription: { tier: "PRO", status: { in: ["ACTIVE", "TRIAL"] } },
        },
      },
    },
    // Un tope: el cron entero tiene 60 segundos y esto no puede comerse el
    // presupuesto de todo lo que viene abajo. Lo que no entre sale mañana — el
    // `recordatorioAt` sigue en null, así que no se pierde ninguno.
    // ⚠️ Y a quien ya se le escribió esta semana, o pidió la baja, se lo
    // marca sin mandar nada (ver el punto 5): una orden inventada por un bot
    // no puede convertirse en un mail.
    take: 30,
    orderBy: { createdAt: "asc" },
    select: {
      id: true, total: true, buyerId: true, storeId: true,
      buyer: { select: { email: true, name: true } },
      store: { select: { name: true, checkoutName: true } },
      items: {
        select: {
          product: {
            select: {
              id: true, name: true, rolDigital: true, isActive: true,
              slugDigital: true, dominioPropio: true, price: true, storeId: true, ofertaSalida: true,
            },
          },
        },
      },
    },
  });

  const enviosCarritosD: Promise<boolean>[] = [];
  for (const orden of carritosDigitales) {
    const principal = orden.items.find((i) => i.product.rolDigital === "PRINCIPAL")?.product;
    const correo = orden.buyer.email;

    // Sin producto principal, sin correo, o con el producto despublicado no hay
    // nada que mandar: el link llevaría a una página que no abre. Se marca igual
    // para no volver a mirarlo todos los días.
    // Tampoco a quien pidió no recibir más mails de esta vendedora, ni a quien
    // esta misma tienda ya le escribió por un carrito en los últimos 7 días
    // (la marca se pone salga o no salga, así que una orden inventada también
    // cuenta: es lo que queremos).
    const [pidioLaBaja, yaLeEscribimos] = correo
      ? await Promise.all([
          prisma.bajaCorreoDigital.findUnique({ where: { storeId_email: { storeId: orden.storeId, email: correo } }, select: { id: true } }),
          prisma.order.count({ where: { buyerId: orden.buyerId, storeId: orden.storeId, id: { not: orden.id }, recordatorioAt: { gte: hastaCarritoD } } }),
        ])
      : [null, 0];
    const sePuede = Boolean(principal && principal.isActive && correo && !pidioLaBaja && yaLeEscribimos === 0);

    if (sePuede && principal && correo) {
      // Su propia dirección si la tiene, que es la que la persona vio. El dominio
      // primero: es el que reconoce si llegó por un anuncio.
      const enlace = principal.dominioPropio
        ? `https://${principal.dominioPropio}`
        : principal.slugDigital
          ? `https://${principal.slugDigital}.${dominioDeLaPlataforma()}`
          : `${APP_URL}/p/${principal.id}`;

      // La oferta de salida, si está prendida: el mismo cartel del checkout,
      // con el plazo firmado desde AHORA. Ver `lib/oferta-salida`. Si falla,
      // el recordatorio sale igual, sin oferta.
      const oferta = await ofertaParaElMail(principal, enlace, now).catch((e) => { console.error("[cron] oferta de salida:", e); return null; });
      // La baja es la MISMA que la de los correos a compradores: firmada por
      // tienda y mail, y vale para los dos tipos de mail de esa vendedora.
      // ⚠️ Sin clave para firmar NO sale el mail (un mail sin baja es lo que
      // esto vino a arreglar) y el cron sigue: un `throw` acá se llevaba
      // puesto todo lo que viene abajo (retiros, vencimientos, cierres).
      const tokenBaja = (() => { try { return tokenDeBaja(orden.storeId, correo); } catch (e) { console.error("[cron] carrito digital, sin clave de firma:", e); return null; } })();
      if (tokenBaja) enviosCarritosD.push(
        sendCarritoAbandonadoDigitalEmail({
          to: correo,
          nombre: orden.buyer.name,
          producto: principal.name,
          total: orden.total,
          enlace,
          // El nombre del checkout es el que la persona vio al pagar; el de la
          // tienda es de puertas adentro y no lo reconocería.
          vendedor: orden.store.checkoutName || orden.store.name,
          oferta,
          bajaUrl: urlBajaCorreo(baseCarritoD, tokenBaja),
          bajaPostUrl: urlBajaCorreoUnClic(baseCarritoD, tokenBaja),
        })
          .then((r) => {
            if (r.error) console.error("[cron] carrito digital:", r.error.message);
            return !r.error;
          })
          .catch((e) => { console.error("[cron] carrito digital:", e); return false; }),
      );
    }

    // ⚠️ Se marca SIEMPRE, salga o no salga el mail. Si sólo se marcara al salir
    // bien, una dirección de correo rota se reintentaría todos los días para
    // siempre — y del otro lado hay una cuota de envío que se gasta igual.
    await prisma.order.update({ where: { id: orden.id }, data: { recordatorioAt: now } });
  }
  result.carritosDigitalesSent = (await Promise.all(enviosCarritosD)).filter(Boolean).length;

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
    despues(() => createNotification({
      userId: adminUser.id,
      type: daysOld >= 15 ? "WITHDRAWAL_REMINDER_URGENT" : "WITHDRAWAL_REMINDER",
      title: daysOld >= 15
        ? `Retiro sin procesar: ${aff.user.name || aff.user.email} lleva ${daysOld} días esperando`
        : `Recordatorio: retiro de ${aff.user.name || aff.user.email} hace ${daysOld} días`,
      body: `$${wd.amount.toLocaleString("es-AR")} — ${aff.store.name}`,
      link: "/admin/retiros",
    }), "cron: campanita de recordatorio de retiro");
    despues(() => sendWithdrawalReminderEmail({
      ownerEmail: adminUser.email!,
      ownerName: adminUser.name ?? "Admin",
      storeName: aff.store.name,
      affiliateName: aff.user.name || aff.user.email,
      amount: wd.amount,
      daysOld,
      dashboardUrl: `${APP_URL}/admin/retiros`,
    }), "cron: mail de recordatorio de retiro");
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
          // 3s, no 10s. Estamos en el plan gratis de Vercel, donde la función
          // tiene un techo de duración corto, y este chequeo está en la mitad
          // del cron: atrás vienen el cleanup, los premios del mes y —la que
          // importa— los avisos de vencimiento y el cierre de tiendas por falta
          // de pago. Con 10 segundos, una sola vez que MP no conteste se come el
          // presupuesto entero y esas tres secciones no corren en todo el día,
          // sin que nadie se entere.
          //
          // Además no se pierde nada: esto pregunta si MP está vivo. Una API que
          // tarda más de 3 segundos en decir "estoy bien" ya es una señal, y el
          // catch de abajo lo trata como caída, que es lo correcto.
          signal: AbortSignal.timeout(3000),
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
    /* ⚠️ Las compras digitales que nunca se pagaron. Acá el carrito abandonado ES
       la orden sin pagar, así que sin esto quedaban PARA SIEMPRE con el correo y
       el nombre de alguien que ni siquiera llegó a comprar. La política de
       privacidad promete 45 días —los mismos que los carritos de tienda— y esta
       línea es lo que hace que esa promesa sea cierta.

       ⚠️ Y sólo de cuentas DIGITALES. Una orden PENDING de una tienda ya
       descontó stock al crearse: borrarla dejaría el inventario mal para
       siempre, y eso se cancela por otro camino que sí lo devuelve.

       Borrar la orden se lleva sus ítems y su fila de pago por cascada. No hay
       permiso de descarga que perder: esos existen sólo desde que se acredita. */
    const ago45d = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);

    const [sessions, clicks, notifications, adminLogs, coupons, storeViews, oldCarts, staleDonations, chatSasha, comprasSinPagar] = await Promise.all([
      prisma.session.deleteMany({ where: { expires: { lt: now } } }),
      prisma.affiliateClick.deleteMany({ where: { createdAt: { lt: ago90d } } }),
      prisma.notification.deleteMany({ where: { read: true, createdAt: { lt: ago30d } } }),
      prisma.adminActionLog.deleteMany({ where: { createdAt: { lt: ago1y } } }),
      prisma.affiliateRewardCoupon.deleteMany({ where: { status: "EXPIRED", expiresAt: { lt: ago6m } } }),
      prisma.storeView.deleteMany({ where: { date: { lt: ago1y.toISOString().slice(0, 10) } } }),
      prisma.abandonedCart.deleteMany({ where: { recoveredAt: null, lastActivityAt: { lt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000) } } }),
      prisma.donation.deleteMany({ where: { status: "PENDING", createdAt: { lt: ago7d } } }),
      prisma.order.deleteMany({
        where: {
          status: "PENDING",
          createdAt: { lt: ago45d },
          store: { owner: { role: "DIGITAL" } },
        },
      }),
      // El historial de Sasha no se limpiaba nunca: la charla se resetea en
      // PANTALLA cada día (se filtra por `day`) pero las filas quedaban para
      // siempre. Con varias tiendas escribiendo todos los días, eso crece sin
      // techo y nadie lo mira.
      //
      // Se borra todo lo de más de 90 días MENOS los avisos sin leer: ésos se
      // quedan porque la regla es que esperan hasta que el dueño los lea, y
      // borrarlos dejaría el contador del globito apuntando a mensajes que ya no
      // existen.
      prisma.asistenteMensaje.deleteMany({
        where: {
          createdAt: { lt: ago90d },
          NOT: { esAviso: true, leidoAt: null },
        },
      }),
    ]);
    result.cleanup = { sessions: sessions.count, clicks: clicks.count, notifications: notifications.count, adminLogs: adminLogs.count, coupons: coupons.count, storeViews: storeViews.count, oldCarts: oldCarts.count, staleDonations: staleDonations.count, chatSasha: chatSasha.count, comprasSinPagar: comprasSinPagar.count };
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
      const afiliados = await prisma.affiliate.findMany({
        where: { storeId: store.id, isActive: true },
        select: { userId: true, user: { select: { email: true, name: true } } },
      });

      await prisma.$transaction(async (tx) => {
        await applyStoreClosure(tx, store.id);
      });

      if (afiliados.length > 0) {
        await createNotificationMany(
          afiliados.map((a) => ({
            userId: a.userId,
            type: "STORE_CLOSED",
            title: `${store.name} cerró su tienda`,
            body: "Tu link quedó pausado. El saldo que ya tenías acreditado sigue disponible para retirar, y si la tienda vuelve a abrir recuperás tu lugar.",
            link: "/afiliados",
          }))
        );
        await Promise.all(
          afiliados.map((a) =>
            sendStoreClosedAffiliateEmail({
              to: a.user.email,
              affiliateName: a.user.name ?? "",
              storeName: store.name,
            }).catch((e) => console.error("[cron] mail cierre afiliado:", a.user.email, e))
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

  // ── 7 bis. PRODUCTOS DIGITALES: LA CAÍDA A FREE ────────────────────────────
  //
  // Acá NO se cierra nada, y esa es toda la diferencia con el bloque de arriba.
  // El Free es para siempre y lo paga la comisión por venta, así que quien deja
  // de pagar Starter o Pro no tiene ninguna deuda: vuelve a Free, conserva su
  // cuenta, sus productos y sus ventas, y lo único que cambia es que sube la
  // comisión y se apagan las funciones pagas.
  //
  // Vale para los dos caminos que terminan igual: la prueba de 7 días que se
  // agotó sin pagar, y el plan pago que se venció y ya pasó su gracia.
  //
  // El filtro por `tier` deja afuera a las que ya están en Free, que son la
  // mayoría y no tienen nada que revisar.
  const digitales = await prisma.subscription.findMany({
    where: { role: "DIGITAL", tier: { not: "FREE" }, status: { in: ["ACTIVE", "TRIAL", "GRACE"] } },
    select: {
      id: true,
      userId: true,
      role: true,
      tier: true,
      status: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      gracePeriodEndsAt: true,
      user: { select: { email: true, name: true } },
    },
  });

  let caidasAFree = 0;
  let despublicadas = 0;

  /* Todo junto y no de a una.
   *
   * El cron corre UNA vez por día y tiene 60 segundos (es el techo del plan
   * gratis de Vercel, declarado arriba en `maxDuration`). Y lo que se corta si se
   * acaba el tiempo es lo de ABAJO, sin ningún error: la plataforma mata la
   * función y nadie se entera.
   *
   * De a una eran dos consultas por cuenta —el update y el aviso—, así que el
   * costo crecía con la cantidad de cuentas digitales. Así son tres consultas en
   * total, sin importar cuántas sean. El estado que se escribe es idéntico para
   * todas (`caidaAFree()` no depende de la cuenta), que es justo lo que permite
   * un solo `updateMany`. */
  const vencidas = digitales.filter((sub) => getSubscriptionStatus(sub, now) === "EXPIRED");

  if (vencidas.length > 0) {
    await prisma.subscription.updateMany({
      where: { id: { in: vencidas.map((s) => s.id) } },
      data: caidaAFree(now),
    });

    /* ── Las páginas de más se apagan ────────────────────────────────────────
     *
     * Free publica una página; quien cae de Pro tenía cinco. Se DESPUBLICAN, no
     * se borran, y se quedan las que más vendieron: ver `despublicarLasDeMas`.
     * Esto sí va de a una cuenta —lee lo publicado de cada tienda y elige—,
     * pero corre sólo para las que cayeron HOY, que son cero casi todos los
     * días, así que no le cuesta al presupuesto de 60 segundos del cron.
     *
     * Una cuenta sin tienda todavía (nunca creó un producto) no tiene nada que
     * apagar y no aparece en `tiendas`. */
    const tiendas = await prisma.store.findMany({
      where: { ownerId: { in: vencidas.map((s) => s.userId) } },
      select: { id: true, ownerId: true },
    });
    const tiendaDe = new Map(tiendas.map((t) => [t.ownerId, t.id]));
    const apagadoDe = new Map<string, ResultadoDeLaCaida>();
    for (const sub of vencidas) {
      const storeId = tiendaDe.get(sub.userId);
      if (!storeId) continue;
      try {
        const r = await despublicarLasDeMas(storeId, "FREE");
        apagadoDe.set(sub.userId, r);
        despublicadas += r.despublicadas.length;
      } catch (e) {
        /* El estado ya cayó y el aviso de abajo sale igual. Lo que queda es una
           cuenta con páginas de más —el lado seguro—, y el error escrito. */
        console.error("[cron] no se pudieron despublicar las páginas de más:", sub.userId, e);
      }
    }

    /* Los dominios propios que tenía: desde hoy redirigen (no se tocan, lo
       decide la ruta pública mirando el tier). Se buscan sólo para contárselo
       en el mail; ver `aDondeRedirige`. */
    const conDominio = await prisma.product.findMany({
      where: { storeId: { in: tiendas.map((t) => t.id) }, deletedAt: null, dominioPropio: { not: null } },
      select: { id: true, slugDigital: true, dominioPropio: true, store: { select: { ownerId: true } } },
    });
    const dominiosDe = new Map<string, { dominio: string; redirigeA: string }[]>();
    for (const p of conDominio) {
      if (!p.dominioPropio) continue;
      const lista = dominiosDe.get(p.store.ownerId) ?? [];
      lista.push({ dominio: p.dominioPropio, redirigeA: aDondeRedirige(p, "FREE") ?? "" });
      dominiosDe.set(p.store.ownerId, lista);
    }

    /* Si el par rol+tier no resuelve a ningún plan conocido, el aviso dice
       "tu plan pago terminó". El default NO puede ser el label de Free:
       quedaría un aviso que dice "tu plan Free terminó", que es justo lo que
       no pasó. */
    const planPerdidoDe = (sub: (typeof vencidas)[number]) => {
      const claveDelPlan = planDeSuscripcion(sub);
      return claveDelPlan ? PLANES[claveDelPlan].label : "pago";
    };

    await createNotificationMany(
      vencidas.map((sub) => {
        const apagado = apagadoDe.get(sub.userId);
        /* El aviso nombra las páginas que se apagaron. Sin eso, la persona
           descubre que dejaron de verse mirando sus anuncios. */
        const cuales = apagado && apagado.despublicadas.length > 0
          ? ` Free permite ${TOPES_DIGITALES.FREE.paginas} página${TOPES_DIGITALES.FREE.paginas === 1 ? "" : "s"} de venta publicada${TOPES_DIGITALES.FREE.paginas === 1 ? "" : "s"}, así que pasaron a borrador: ${apagado.despublicadas.map((d) => d.name).join(", ")}. No se borró nada; podés cambiar cuál queda publicada desde Productos.`
          : "";
        return {
          userId: sub.userId,
          type: "DIGITAL_DOWNGRADE",
          title: `Tu plan ${planPerdidoDe(sub)} terminó`,
          body: `Tu cuenta sigue abierta y no perdiste nada: tus productos y tus ventas están donde estaban. Volviste al plan Free, así que la comisión por venta sube y las funciones pagas quedan apagadas.${cuales} Podés volver a Starter o Pro cuando quieras.`,
          /* Derecho a Mi cuenta, que es donde se ve lo que pasó y desde donde se
             vuelve a Starter o Pro. Estuvo apuntando a la raíz del panel mientras
             esa pantalla no existía: el aviso hubiera llevado a un 404, y justo
             al que acaba de perder su plan. */
          link: "/digitales/mi-cuenta",
        };
      })
    );

    /* Y el mail, para quien no entra al panel hace semanas —que es justo el que
       dejó de pagar—. Uno por cuenta, con lo que se apagó. Si uno falla, los
       demás salen igual: el estado ya está escrito y el aviso de adentro ya
       está, así que un mail que no sale no deja a nadie sin saber. */
    for (const sub of vencidas) {
      if (!sub.user?.email) continue;
      const apagado = apagadoDe.get(sub.userId);
      await sendCaidaAFreeEmail({
        to: sub.user.email,
        userName: sub.user.name,
        planPerdido: planPerdidoDe(sub),
        topePaginas: TOPES_DIGITALES.FREE.paginas,
        quedaron: apagado?.quedaron.map((q) => q.name) ?? [],
        despublicadas: apagado?.despublicadas.map((d) => ({ name: d.name, rol: d.rol })) ?? [],
        dominios: dominiosDe.get(sub.userId) ?? [],
      }).catch((e) => console.error("[cron] mail caída a Free:", sub.user?.email, e));
    }

    caidasAFree = vencidas.length;
  }

  // ── 7 ter. LOS DOMINIOS PROPIOS DE QUIEN LLEVA MUCHO EN FREE ───────────────
  //
  // El dominio se conecta con Pro y al caer a Free no se rompe: redirige. Pero
  // cada uno ocupa un lugar del techo de Vercel (50 por proyecto, y cada Pro
  // trae hasta cinco), así que el que lleva DIAS_DE_DOMINIO_EN_FREE sin Pro se
  // suelta, con un aviso unos días antes. Ver `momentoDelDominio`.
  //
  // Sólo las cuentas en Free CON dominio, que son poquísimas: el filtro va por
  // la tienda, así que las Free que nunca conectaron nada ni se leen.
  const enFreeConDominio = await prisma.subscription.findMany({
    where: {
      role: "DIGITAL",
      tier: "FREE",
      user: { store: { products: { some: { deletedAt: null, dominioPropio: { not: null } } } } },
    },
    select: {
      id: true, userId: true, freeDesde: true,
      user: { select: { email: true, name: true, store: { select: { id: true } } } },
    },
  });

  let dominiosSoltados = 0;
  let dominiosAvisados = 0;

  for (const sub of enFreeConDominio) {
    const storeId = sub.user.store?.id;
    if (!storeId) continue;

    /* Una cuenta que cayó ANTES de que existiera `freeDesde` no tiene fecha. Se
       le pone hoy: cuenta desde el primer cron que la ve, no desde una fecha
       que no se guardó. Es el lado generoso, y pasa una sola vez. */
    if (!sub.freeDesde) {
      await prisma.subscription.update({ where: { id: sub.id }, data: { freeDesde: now } });
      continue;
    }

    const momento = momentoDelDominio(sub.freeDesde, now);
    if (momento === "nada") continue;

    const productos = await prisma.product.findMany({
      where: { storeId, deletedAt: null, dominioPropio: { not: null } },
      select: { id: true, name: true, slugDigital: true, dominioPropio: true },
    });
    const dominios = productos.flatMap((p) => p.dominioPropio
      ? [{ dominio: p.dominioPropio, producto: p.name, direccion: p.slugDigital ? direccionDelProducto(p.slugDigital) : `${APP_URL}/p/${p.id}` }]
      : []);
    if (dominios.length === 0) continue;

    if (momento === "avisar") {
      /* El aviso sale UNA vez por caída. La marca es el aviso de adentro del
         panel: si ya hay uno posterior a la caída, hoy no se manda otro. Así no
         hace falta una columna más para recordar que se avisó. */
      const yaAvisado = await prisma.notification.findFirst({
        where: { userId: sub.userId, type: "DIGITAL_DOMINIO_AVISO", createdAt: { gte: sub.freeDesde } },
        select: { id: true },
      });
      if (yaAvisado) continue;

      const fecha = fechaDeSoltar(sub.freeDesde);
      const dia = fecha.toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" });
      await createNotification({
        userId: sub.userId,
        type: "DIGITAL_DOMINIO_AVISO",
        title: dominios.length === 1 ? `Tu dominio se desconecta el ${dia}` : `Tus dominios se desconectan el ${dia}`,
        body: `Llevás casi ${DIAS_DE_DOMINIO_EN_FREE} días en Free y el dominio propio viene con Pro. ${dominios.map((d) => d.dominio).join(", ")} ${dominios.length === 1 ? "sigue redirigiendo" : "siguen redirigiendo"} a tu dirección de tiendaapps hasta esa fecha; si volvés a Pro antes, no cambia nada.`,
        link: "/digitales/mi-cuenta",
      });
      if (sub.user.email) {
        await sendDominioEnFreeEmail({ to: sub.user.email, userName: sub.user.name, cuando: "aviso", fecha, dominios })
          .catch((e) => console.error("[cron] mail aviso de dominio:", sub.user.email, e));
      }
      dominiosAvisados += dominios.length;
      continue;
    }

    /* Soltar: base, Vercel y captcha. Lo que se soltó de verdad es lo que se
       cuenta en el mail; si uno falló, queda para la vuelta de mañana. */
    const soltados = await soltarLosDominiosDe(storeId);
    if (soltados.length === 0) continue;
    const soltadosConDireccion = soltados.map((s) => ({
      dominio: s.dominio,
      producto: s.name,
      direccion: dominios.find((d) => d.dominio === s.dominio)?.direccion ?? "",
    }));
    await createNotification({
      userId: sub.userId,
      type: "DIGITAL_DOMINIO_SOLTADO",
      title: soltados.length === 1 ? "Tu dominio ya no apunta acá" : "Tus dominios ya no apuntan acá",
      body: `Llevás ${DIAS_DE_DOMINIO_EN_FREE} días en Free, así que ${soltados.map((s) => s.dominio).join(", ")} se desconectó de nuestro lado. Tu página sigue andando en su dirección de tiendaapps. Si volvés a Pro, lo podés conectar de nuevo.`,
      link: "/digitales/productos",
    });
    if (sub.user.email) {
      await sendDominioEnFreeEmail({ to: sub.user.email, userName: sub.user.name, cuando: "soltado", fecha: now, dominios: soltadosConDireccion })
        .catch((e) => console.error("[cron] mail dominio soltado:", sub.user.email, e));
    }
    dominiosSoltados += soltados.length;
  }

  result.digitales = { revisadas: digitales.length, caidasAFree, despublicadas, dominiosAvisados, dominiosSoltados };

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

  // ── AVISOS DE SASHA ────────────────────────────────────────────────────────
  // Hasta acá Sasha sólo hablaba si se le abría el chat. Una vez por día escribe
  // primero, y el globito del panel muestra cuántos mensajes hay sin leer.
  //
  // Los textos los arma `lib/asistente-avisos` con reglas: instantáneo, gratis y
  // no puede inventar un dato porque no calcula ninguno. Y sobre todo, es
  // testeable — un mensaje que afirma cosas es más peligroso que un número en una
  // tarjeta, porque nadie duda de una frase en castellano.
  //
  // Todo el bloque va dentro de un try: es lo ÚLTIMO que corre, y si tirara
  // dejaría al cron devolviendo 500 después de haber mandado todos los mails de
  // arriba. Un reintento volvería a mandarlos. Que fallen los avisos de Sasha no
  // puede costar mails duplicados.
  const hoyAr = getArgentinaDayKey();
  const fechasProximas = getUpcomingDates(7);
  let avisosCreados = 0;
  let tiendasRevisadas = 0;
  let tiendasTotal = 0;

  try {
  const tiendasParaAvisar = await prisma.store.findMany({
    where: { closedAt: null, isPublished: true, isActive: true },
    select: { id: true, ownerId: true, tipoTienda: true },
    // Tope de seguridad: cada tienda son ~11 consultas y esto corre en una función
    // con límite de tiempo. Con las tiendas de hoy sobra; el día que sean miles hay
    // que partirlo en tandas, y mientras tanto es mejor avisarle a 300 que quedarse
    // sin tiempo y no avisarle a nadie.
    take: 300,
  });
  tiendasTotal = tiendasParaAvisar.length;

  for (const tienda of tiendasParaAvisar) {
    try {
      // `incluirMarketing: false` — los avisos no miran cupones ni promociones ni
      // margen. Sin esto serían 5 consultas por tienda tiradas todos los días.
      const snapshot = await getStoreSnapshot(tienda.id, tienda.tipoTienda, {
        incluirMarketing: false,
      });
      const candidatos = armarAvisos({ snapshot, fechasProximas });
      if (candidatos.length === 0) continue;

      // Los avisos de los últimos 10 días, para no repetir. 10 alcanza: es más
      // que el `repetirCadaDias` más largo que hay, así que ninguna regla puede
      // quedar afuera de la ventana y colarse repetida.
      const recientes = await prisma.asistenteMensaje.findMany({
        where: {
          userId: tienda.ownerId,
          esAviso: true,
          day: { gte: sumarDiasCalendario(hoyAr, -10) },
          clave: { not: null },
        },
        select: { clave: true, day: true },
      });

      const aMandar = filtrarRepetidos(
        candidatos,
        recientes.map((r) => ({
          clave: r.clave as string,
          diasAtras: diasEntreDias(r.day, hoyAr),
        }))
      );
      if (aMandar.length === 0) continue;

      await prisma.asistenteMensaje.createMany({
        data: aMandar.map((aviso) => ({
          userId: tienda.ownerId,
          role: "assistant",
          // El link va pegado al texto y no en una columna aparte: el chat
          // renderiza markdown, así que un link acá se ve igual que uno que Sasha
          // escribe cuando le preguntás, y no hay que inventarle otro formato de
          // burbuja sólo para los avisos.
          content: aviso.link ? `${aviso.texto}\n\n[Ir →](${aviso.link})` : aviso.texto,
          day: hoyAr,
          esAviso: true,
          clave: aviso.clave,
        })),
      });
      avisosCreados += aMandar.length;
      tiendasRevisadas++;
    } catch (e) {
      // Una tienda que falla no puede cortar el aviso de las demás.
      console.error("[cron] avisos de Sasha, tienda", tienda.id, e);
    }
  }
  } catch (e) {
    console.error("[cron] avisos de Sasha, bloque entero:", e);
  }

  result.avisosSasha = { tiendas: tiendasTotal, conAvisos: tiendasRevisadas, mensajes: avisosCreados };

  // ── La limpieza ──
  // Va colgada de acá y no como su propio cron: en el plan gratis hay dos y no
  // vale la pena gastar el segundo en algo que no tiene horario propio — sólo
  // tiene que correr una vez por día. `/api/cron/cleanup` sigue existiendo para
  // poder dispararla a mano.
  //
  // Hasta acá no la llamaba nadie: el archivo estaba escrito, con su regla de
  // borrar las visitas viejas, y no estaba en `vercel.json`. O sea que el código
  // decía una cosa y la base hacía otra.
  //
  // En su propio try y al final de todo: si la limpieza falla, los avisos y los
  // mails de arriba ya salieron y no se pierden.
  try {
    result.limpieza = await limpiar();
  } catch (e) {
    console.error("[cron] limpieza:", e);
  }

  return NextResponse.json(result);
}
