import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

function generateCouponCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "WIN-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function uniqueCouponCode(storeId: string, tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCouponCode();
    const exists = await tx.coupon.findUnique({ where: { storeId_code: { storeId, code } } });
    if (!exists) return code;
  }
  throw new Error("No se pudo generar un código único");
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const widget = await prisma.gamificationWidget.findUnique({
    where: { storeId: store.id },
    include: {
      prizes: {
        orderBy: { order: "asc" },
        include: {
          coupon: {
            select: { id: true, code: true, discountType: true, discountValue: true, maxUses: true, usedCount: true, expiresAt: true, isActive: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ widget });
}

// POST — upsert widget + auto-crea/actualiza cupones por cada premio
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const body = await req.json();
  const {
    type, isActive, title, subtitle, buttonText, reclaimText, legalText,
    headerImage, centerType, centerText, triggerType, triggerDelay,
    showFrequency, emailRequired, styles, prizes,
  } = body;

  if (prizes && prizes.length > 0) {
    for (const p of prizes as PrizeInput[]) {
      if (!Number.isInteger(p.probability)) {
        return NextResponse.json({ error: "Las probabilidades deben ser números enteros (sin decimales)" }, { status: 400 });
      }
      if (!p.isNoPrize) {
        const dv = p.discountValue ?? 0;
        if (dv <= 0) {
          return NextResponse.json({ error: `El valor del descuento debe ser mayor a 0` }, { status: 400 });
        }
        if ((p.discountType ?? "percentage") === "percentage" && dv > 100) {
          return NextResponse.json({ error: `El descuento porcentual no puede superar el 100%` }, { status: 400 });
        }
      }
    }
    const total = prizes.reduce((s: number, p: { probability: number }) => s + (p.probability || 0), 0);
    if (total !== 100) {
      return NextResponse.json({ error: "Las probabilidades deben sumar exactamente 100%" }, { status: 400 });
    }
  }

  type PrizeInput = {
    id?: string;
    couponId?: string | null;
    label: string;
    probability: number;
    isNoPrize?: boolean;
    order?: number;
    discountType?: string;
    discountValue?: number;
    maxUses?: number | null;
    expiresAt?: string | null;
  };

  const widget = await prisma.$transaction(async (tx) => {
    // 1. Upsert widget
    const w = await tx.gamificationWidget.upsert({
      where: { storeId: store.id },
      create: {
        storeId: store.id,
        type: type ?? "SPIN",
        isActive: isActive ?? false,
        title: title ?? "¡Girá y ganá!",
        subtitle: subtitle ?? "Probá tu suerte y ganá un premio",
        buttonText: buttonText ?? "¡Girá y ganá!",
        reclaimText: reclaimText ?? "Reclamar premio",
        legalText: legalText ?? null,
        headerImage: headerImage ?? null,
        centerType: centerType ?? "text",
        centerText: centerText ?? null,
        triggerType: triggerType ?? "FIRST_CLICK",
        triggerDelay: triggerDelay ?? null,
        showFrequency: showFrequency ?? "ONCE_SESSION",
        emailRequired: emailRequired ?? true,
        styles: styles ? JSON.stringify(styles) : "{}",
      },
      update: {
        type, isActive, title, subtitle, buttonText, reclaimText,
        legalText, headerImage, centerType, centerText,
        triggerType, triggerDelay, showFrequency, emailRequired,
        ...(styles !== undefined ? { styles: JSON.stringify(styles) } : {}),
      },
    });

    if (prizes !== undefined) {
      // 2. Obtener premios existentes para saber qué cupones deactivar
      const existing = await tx.gamificationPrize.findMany({
        where: { widgetId: w.id },
        select: { id: true, couponId: true },
      });
      const incomingIds = new Set((prizes as PrizeInput[]).map((p) => p.id).filter(Boolean));
      const removedCouponIds = existing
        .filter((e) => !incomingIds.has(e.id) && e.couponId)
        .map((e) => e.couponId as string);

      // Deactivar cupones de premios eliminados (no los borramos por si ya fueron usados)
      if (removedCouponIds.length > 0) {
        await tx.coupon.updateMany({ where: { id: { in: removedCouponIds } }, data: { isActive: false } });
      }

      // 3. Borrar y recrear premios
      await tx.gamificationPrize.deleteMany({ where: { widgetId: w.id } });

      for (let idx = 0; idx < (prizes as PrizeInput[]).length; idx++) {
        const p = (prizes as PrizeInput[])[idx];

        let couponId: string | null = null;

        if (!p.isNoPrize) {
          const discountType = p.discountType ?? "percentage";
          const discountValue = p.discountValue ?? 0;
          const maxUses = p.maxUses ?? null;
          const expiresAt = p.expiresAt ? new Date(p.expiresAt) : null;

          if (p.couponId) {
            // Actualizar cupón existente
            await tx.coupon.update({
              where: { id: p.couponId },
              data: { discountType, discountValue, maxUses, expiresAt, isActive: true, label: p.label },
            });
            couponId = p.couponId;
          } else {
            // Crear cupón nuevo con código auto-generado
            const code = await uniqueCouponCode(store.id, tx);
            const newCoupon = await tx.coupon.create({
              data: {
                storeId: store.id,
                code,
                discountType,
                discountValue,
                maxUses,
                expiresAt,
                isActive: true,
                label: p.label,
              },
            });
            couponId = newCoupon.id;
          }
        }

        await tx.gamificationPrize.create({
          data: {
            widgetId: w.id,
            label: p.label,
            probability: p.probability,
            isNoPrize: p.isNoPrize ?? false,
            couponId,
            order: idx,
          },
        });
      }
    }

    return tx.gamificationWidget.findUnique({
      where: { id: w.id },
      include: {
        prizes: {
          orderBy: { order: "asc" },
          include: {
            coupon: {
              select: { id: true, code: true, discountType: true, discountValue: true, maxUses: true, usedCount: true, expiresAt: true, isActive: true },
            },
          },
        },
      },
    });
  });

  return NextResponse.json({ widget });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const { isActive } = await req.json();
  const widget = await prisma.gamificationWidget.update({ where: { storeId: store.id }, data: { isActive } });
  return NextResponse.json({ widget });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    const widget = await tx.gamificationWidget.findUnique({
      where: { storeId: store.id },
      select: { id: true, prizes: { select: { couponId: true } } },
    });
    if (!widget) return;

    // Desactivar cupones asociados (no los borramos, pueden haber sido usados en pedidos)
    const couponIds = widget.prizes.map(p => p.couponId).filter(Boolean) as string[];
    if (couponIds.length > 0) {
      await tx.coupon.updateMany({ where: { id: { in: couponIds } }, data: { isActive: false } });
    }

    await tx.gamificationPrize.deleteMany({ where: { widgetId: widget.id } });
    await tx.gamificationWidget.delete({ where: { id: widget.id } });
  });

  return NextResponse.json({ ok: true });
}
