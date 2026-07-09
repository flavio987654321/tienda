import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendGamificationWinEmail } from "@/lib/email";
import { getClientIp } from "@/lib/request-ip";
import { verifyTurnstile } from "@/lib/turnstile";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// Gmail ignora los puntos en la parte local y todo lo que sigue a un "+" —
// "user@gmail.com", "u.s.e.r@gmail.com" y "user+promo@gmail.com" son la misma
// casilla. Sin esto, alguien podría girar la ruleta varias veces con variantes
// del mismo email real. Solo se usa como clave interna para detectar "ya giró";
// el email real (con puntos/+ tal cual lo escribió) se sigue usando para
// mandarle el aviso y para poder usar el cupón en el checkout.
function canonicalEmail(email: string): string {
  const at = email.indexOf("@");
  if (at === -1) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const canonicalLocal = local.split("+")[0].replace(/\./g, "");
    return `${canonicalLocal}@gmail.com`;
  }
  return email;
}

function generateWinCode(): string {
  let code = "WIN-";
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

async function uniqueWinCode(storeId: string): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateWinCode();
    const exists = await prisma.coupon.findUnique({ where: { storeId_code: { storeId, code } } });
    if (!exists) return code;
  }
  throw new Error("No se pudo generar un código único");
}

// Un email libera su giro anterior (puede volver a girar) cuando no ganó nada,
// o cuando el cupón que ganó ya se usó o venció. Mientras el premio siga vigente
// y sin usar, se lo sigue bloqueando para que no acumule cupones girando de nuevo.
async function isSpinReleasable(spin: { isNoPrize: boolean; couponId: string | null }): Promise<boolean> {
  if (spin.isNoPrize || !spin.couponId) return true;
  const coupon = await prisma.coupon.findUnique({
    where: { id: spin.couponId },
    select: { usedCount: true, maxUses: true, expiresAt: true },
  });
  if (!coupon) return true; // el cupón fue borrado → nada que esperar
  const expired = coupon.expiresAt ? coupon.expiresAt <= new Date() : false;
  const exhausted = coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;
  return expired || exhausted;
}

async function couponExpiryOf(couponId: string | null): Promise<Date | null> {
  if (!couponId) return null;
  const coupon = await prisma.coupon.findUnique({ where: { id: couponId }, select: { expiresAt: true } });
  return coupon?.expiresAt ?? null;
}

// POST /api/gamification/spin
// Determina el premio server-side. Nunca expone la lógica al cliente.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // Rate limit: 10 intentos por IP cada 10 minutos
  if (!(await checkRateLimit(`gami-spin:${ip}`, 10, 600_000))) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá unos minutos." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { widgetId, email, turnstileToken } = body;
  if (!widgetId) return NextResponse.json({ error: "widgetId requerido" }, { status: 400 });

  const widget = await prisma.gamificationWidget.findUnique({
    where: { id: widgetId },
    select: {
      id: true,
      storeId: true,
      isActive: true,
      emailRequired: true,
      legalText: true,
      prizes: { orderBy: { order: "asc" } },
      store: { select: { name: true, slug: true } },
    },
  });

  if (!widget || !widget.isActive) {
    return NextResponse.json({ error: "Widget no disponible" }, { status: 404 });
  }

  const normalizedEmail = email?.trim().toLowerCase() ?? null;

  // El email siempre es obligatorio (se fuerza a nivel de base al crear/editar el
  // widget) — esta validación es la barrera real, no depende de nada que mande el
  // cliente. Un request armado a mano desde la consola o un bot sin email cae acá.
  if (!normalizedEmail) return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  if (!EMAIL_RE.test(normalizedEmail)) return NextResponse.json({ error: "Email inválido" }, { status: 400 });

  // Captcha después de validar widget y email (un error de tipeo no gasta el token,
  // que es de un solo uso) pero antes de tocar rate limits por email y el giro real.
  if (!(await verifyTurnstile(turnstileToken, ip, "spin"))) {
    return NextResponse.json({ error: "No pudimos verificar que sos una persona. Intentá de nuevo." }, { status: 400 });
  }

  // Clave de deduplicación — colapsa variantes de Gmail al mismo email real.
  const dedupEmail = canonicalEmail(normalizedEmail);

  // Rate limit adicional por email
  if (!(await checkRateLimit(`gami-spin:email:${dedupEmail}`, 3, 600_000))) {
    return NextResponse.json({ error: "Demasiados intentos con este email. Esperá unos minutos." }, { status: 429 });
  }

  // Verificar si este email ya giró en este widget
  if (dedupEmail) {
    const existingSpin = await prisma.gamificationSpin.findUnique({
      where: { widgetId_email: { widgetId, email: dedupEmail } },
    });
    if (existingSpin) {
      if (!(await isSpinReleasable(existingSpin))) {
        return NextResponse.json({
          alreadySpun: true,
          prizeLabel: existingSpin.prizeLabel,
          couponCode: existingSpin.couponCode,
          isNoPrize: existingSpin.isNoPrize,
          expiresAt: await couponExpiryOf(existingSpin.couponId),
        });
      }
      // El premio anterior ya venció o se usó — se libera el giro para intentar de nuevo
      await prisma.gamificationSpin.delete({ where: { id: existingSpin.id } }).catch(() => {});
    }
  }

  // Determinar el premio usando las probabilidades
  const prizes = widget.prizes;
  if (prizes.length === 0) {
    return NextResponse.json({ error: "El widget no tiene premios configurados" }, { status: 400 });
  }

  const roll = Math.random() * 100;
  let cumulative = 0;
  let selectedPrize = prizes[prizes.length - 1]; // fallback al último
  for (const prize of prizes) {
    cumulative += prize.probability;
    if (roll < cumulative) {
      selectedPrize = prize;
      break;
    }
  }

  // Si el premio tiene cupón, crear un cupón personal para este ganador
  let couponCode: string | null = null;
  let couponId: string | null = null;
  let couponExpiresAt: Date | null = null;
  let couponDiscountType: "percentage" | "fixed" | null = null;
  let couponDiscountValue: number | null = null;
  let couponMinOrderAmount = 0;
  let effectivelyNoPrize = selectedPrize.isNoPrize;

  if (!selectedPrize.isNoPrize) {
    if (!selectedPrize.couponId) {
      // El cupón plantilla de este premio fue borrado → no hay nada que entregar
      effectivelyNoPrize = true;
    } else {
      // Leer cupón plantilla para copiar los parámetros del descuento
      const template = await prisma.coupon.findUnique({
        where: { id: selectedPrize.couponId },
        select: { isActive: true, expiresAt: true, discountType: true, discountValue: true, maxUses: true, usedCount: true },
      });

      const templateValid = template && template.isActive &&
        !(template.expiresAt && template.expiresAt < new Date());

      // Si el premio tiene tope de "usos máximos", reservar un cupo de forma atómica
      // (evita que dos ganadores simultáneos se lleven el último cupo disponible).
      const claimedSlot = templateValid && template.maxUses !== null
        ? (await prisma.coupon.updateMany({
            where: { id: selectedPrize.couponId, usedCount: { lt: template.maxUses } },
            data: { usedCount: { increment: 1 } },
          })).count > 0
        : templateValid;

      if (claimedSlot && template) {
        // Vence a las X horas configuradas para el ganador, o antes si la promo entera corta primero
        const winWindow = new Date(Date.now() + selectedPrize.winHours * 60 * 60 * 1000);
        const effectiveExpiry = template.expiresAt
          ? new Date(Math.min(template.expiresAt.getTime(), winWindow.getTime()))
          : winWindow;

        // Crear cupón personal único para este ganador
        const personalCode = await uniqueWinCode(widget.storeId);
        const personalCoupon = await prisma.coupon.create({
          data: {
            storeId: widget.storeId,
            code: personalCode,
            label: selectedPrize.label,
            discountType: template.discountType,
            discountValue: template.discountValue,
            maxUses: 1,          // un solo uso
            expiresAt: effectiveExpiry,
            isActive: true,
            winnerEmail: normalizedEmail,  // solo este email puede usarlo en checkout
          },
        });
        couponCode = personalCoupon.code;
        couponId = personalCoupon.id;
        couponExpiresAt = personalCoupon.expiresAt;
        couponDiscountType = personalCoupon.discountType as "percentage" | "fixed";
        couponDiscountValue = personalCoupon.discountValue;
        couponMinOrderAmount = personalCoupon.minOrderAmount;
      } else {
        // Plantilla vencida/inactiva, o se agotaron los usos máximos de este premio → sin premio
        effectivelyNoPrize = true;
      }
    }
  }

  // Guardar el giro — el unique constraint (widgetId, email) protege contra race condition
  try {
    await prisma.gamificationSpin.create({
      data: {
        widgetId,
        email: dedupEmail,
        ip,
        prizeLabel: effectivelyNoPrize ? null : selectedPrize.label,
        isNoPrize: effectivelyNoPrize,
        couponId,
        couponCode,
      },
    });
  } catch (e) {
    // P2002 = unique constraint violation → otro request del mismo email ganó antes (race condition)
    if ((e as { code?: string })?.code === "P2002") {
      // Limpiar el cupón personal creado antes de abortar
      if (couponId) {
        await prisma.coupon.delete({ where: { id: couponId } }).catch(() => {});
      }
      const existingSpin = await prisma.gamificationSpin.findUnique({
        where: { widgetId_email: { widgetId, email: dedupEmail! } },
      });
      return NextResponse.json({
        alreadySpun: true,
        prizeLabel: existingSpin?.prizeLabel ?? null,
        couponCode: existingSpin?.couponCode ?? null,
        isNoPrize: existingSpin?.isNoPrize ?? true,
        expiresAt: await couponExpiryOf(existingSpin?.couponId ?? null),
      });
    }
    throw e;
  }

  // Avisar por email al ganador — es la única forma en que puede recuperar su código
  // si cierra la ventana sin copiarlo, o si el widget se desactiva más tarde.
  if (!effectivelyNoPrize && normalizedEmail && couponCode && couponExpiresAt && couponDiscountType && couponDiscountValue !== null) {
    sendGamificationWinEmail({
      to: normalizedEmail,
      storeName: widget.store.name,
      storeSlug: widget.store.slug,
      prizeLabel: selectedPrize.label,
      couponCode,
      discountType: couponDiscountType,
      discountValue: couponDiscountValue,
      minOrderAmount: couponMinOrderAmount,
      expiresAt: couponExpiresAt,
      legalText: widget.legalText,
    }).catch((e) => console.error("[email] gamification win:", e));
  }

  // Si el sorteo cayó en un premio real que resultó no disponible (plantilla rota,
  // vencida, o sin cupos), que la rueda frene visualmente en "Sin premio" en vez de
  // mostrar que cayó en un premio que en los hechos no se entregó.
  let visualPrizeIndex = prizes.indexOf(selectedPrize);
  if (effectivelyNoPrize && !selectedPrize.isNoPrize) {
    const noPrizeIndex = prizes.findIndex((p) => p.isNoPrize);
    if (noPrizeIndex !== -1) visualPrizeIndex = noPrizeIndex;
  }

  return NextResponse.json({
    alreadySpun: false,
    prizeLabel: effectivelyNoPrize ? null : selectedPrize.label,
    couponCode,
    isNoPrize: effectivelyNoPrize,
    prizeIndex: visualPrizeIndex,
    expiresAt: couponExpiresAt,
  });
}
