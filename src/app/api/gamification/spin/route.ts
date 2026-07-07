import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const WIN_EXPIRY_HOURS = 48;

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

// POST /api/gamification/spin
// Determina el premio server-side. Nunca expone la lógica al cliente.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  // Rate limit: 10 intentos por IP cada 10 minutos
  if (!(await checkRateLimit(`gami-spin:${ip}`, 10, 600_000))) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá unos minutos." }, { status: 429 });
  }

  const { widgetId, email } = await req.json();
  if (!widgetId) return NextResponse.json({ error: "widgetId requerido" }, { status: 400 });

  const widget = await prisma.gamificationWidget.findUnique({
    where: { id: widgetId },
    select: {
      id: true,
      storeId: true,
      isActive: true,
      emailRequired: true,
      prizes: { orderBy: { order: "asc" } },
    },
  });

  if (!widget || !widget.isActive) {
    return NextResponse.json({ error: "Widget no disponible" }, { status: 404 });
  }

  const normalizedEmail = email?.trim().toLowerCase() ?? null;

  // Validar email si es requerido
  if (widget.emailRequired) {
    if (!normalizedEmail) return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    if (!EMAIL_RE.test(normalizedEmail)) return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  } else if (normalizedEmail && !EMAIL_RE.test(normalizedEmail)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  // Rate limit adicional por email cuando se provee
  if (normalizedEmail) {
    if (!(await checkRateLimit(`gami-spin:email:${normalizedEmail}`, 3, 600_000))) {
      return NextResponse.json({ error: "Demasiados intentos con este email. Esperá unos minutos." }, { status: 429 });
    }
  }

  // Verificar si este email ya giró en este widget
  if (normalizedEmail) {
    const existingSpin = await prisma.gamificationSpin.findUnique({
      where: { widgetId_email: { widgetId, email: normalizedEmail } },
    });
    if (existingSpin) {
      return NextResponse.json({
        alreadySpun: true,
        prizeLabel: existingSpin.prizeLabel,
        couponCode: existingSpin.couponCode,
        isNoPrize: existingSpin.isNoPrize,
      });
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
  let effectivelyNoPrize = selectedPrize.isNoPrize;

  if (!selectedPrize.isNoPrize && selectedPrize.couponId) {
    // Leer cupón plantilla para copiar los parámetros del descuento
    const template = await prisma.coupon.findUnique({
      where: { id: selectedPrize.couponId },
      select: { isActive: true, expiresAt: true, discountType: true, discountValue: true },
    });

    const templateValid = template && template.isActive &&
      !(template.expiresAt && template.expiresAt < new Date());

    if (templateValid) {
      // Expira en 48 hs o en la fecha del template si es antes
      const expiry48h = new Date(Date.now() + WIN_EXPIRY_HOURS * 60 * 60 * 1000);
      const effectiveExpiry = template.expiresAt
        ? new Date(Math.min(template.expiresAt.getTime(), expiry48h.getTime()))
        : expiry48h;

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
    } else {
      // Plantilla vencida/inactiva → sin premio
      effectivelyNoPrize = true;
    }
  }

  // Guardar el giro — el unique constraint (widgetId, email) protege contra race condition
  try {
    await prisma.gamificationSpin.create({
      data: {
        widgetId,
        email: normalizedEmail,
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
        where: { widgetId_email: { widgetId, email: normalizedEmail! } },
      });
      return NextResponse.json({
        alreadySpun: true,
        prizeLabel: existingSpin?.prizeLabel ?? null,
        couponCode: existingSpin?.couponCode ?? null,
        isNoPrize: existingSpin?.isNoPrize ?? true,
      });
    }
    throw e;
  }

  return NextResponse.json({
    alreadySpun: false,
    prizeLabel: effectivelyNoPrize ? null : selectedPrize.label,
    couponCode,
    isNoPrize: effectivelyNoPrize,
    prizeIndex: prizes.indexOf(selectedPrize),
  });
}
