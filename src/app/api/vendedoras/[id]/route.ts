import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { sendAffiliateStatusEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { PRO_MAX_AFFILIATES } from "@/lib/planLimits";
import { hasActivePremium, SUB_STATUS_SELECT } from "@/lib/subscription";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const ownerId = user.id;

  const { id } = await context.params;
  const { action } = await req.json();

  const affiliate = await prisma.affiliate.findFirst({
    where: { id, ownerId },
    include: {
      wallet: true,
      store: { select: { name: true, slug: true } },
      user: { select: { email: true, name: true } },
    },
  });

  if (!affiliate) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  if (action === "approve") {
    const sub = await prisma.subscription.findUnique({ where: { userId: ownerId }, select: SUB_STATUS_SELECT });
    if (!hasActivePremium(sub)) {
      const activeCount = await prisma.affiliate.count({
        where: { ownerId, status: "APPROVED", isActive: true },
      });
      if (activeCount >= PRO_MAX_AFFILIATES) {
        return NextResponse.json(
          { error: `Alcanzaste el límite de ${PRO_MAX_AFFILIATES} afiliados del plan Tienda Pro. Pausá a alguien que no esté vendiendo, o pasá a Premium para tenerlos sin límite.` },
          { status: 403 }
        );
      }
    }

    const updated = await prisma.affiliate.update({
      where: { id },
      data: {
        status: "APPROVED",
        isActive: true,
        reviewedAt: new Date(),
        wallet: affiliate.wallet
          ? undefined
          : { create: { balance: 0, totalEarned: 0, totalWithdrawn: 0 } },
      },
      include: { wallet: true },
    });

    // Rol SELLER se asigna aquí, cuando realmente se aprueba
    await prisma.user.update({
      where: { id: affiliate.userId },
      data: { role: "SELLER" },
    });

    await Promise.all([
      sendAffiliateStatusEmail({
        affiliateEmail: affiliate.user.email,
        affiliateName: affiliate.user.name || "",
        storeName: affiliate.store.name,
        storeSlug: affiliate.store.slug,
        status: "APPROVED",
      }),
      createNotification({
        userId: affiliate.userId,
        type: "AFFILIATE_APPROVED",
        title: `¡Fuiste aceptado/a en ${affiliate.store.name}!`,
        body: "Ya podés compartir tu link de afiliado y empezar a ganar comisiones.",
        link: "/afiliados",
      }),
    ]);

    // Actividad y milestone — fire-and-forget
    ;(async () => {
      try {
        await prisma.storeActivityEvent.create({
          data: {
            storeId: affiliate.storeId,
            type: "NEW_AFFILIATE",
            data: JSON.stringify({
              affiliateName: (affiliate.user.name || "Afiliada").slice(0, 40),
            }),
          },
        });
        const activeCount = await prisma.affiliate.count({
          where: { storeId: affiliate.storeId, isActive: true },
        });
        if (activeCount === 1) {
          await prisma.storeMilestone.upsert({
            where: { storeId_type: { storeId: affiliate.storeId, type: "FIRST_AFFILIATE" } },
            create: { storeId: affiliate.storeId, type: "FIRST_AFFILIATE" },
            update: {},
          });
        }
      } catch (e) {
        console.error("[activity/milestone] affiliate approve:", e);
      }
    })();

    return NextResponse.json({ affiliate: updated });
  }

  if (action === "reject") {
    const updated = await prisma.affiliate.update({
      where: { id },
      data: {
        status: "REJECTED",
        isActive: false,
        reviewedAt: new Date(),
      },
    });

    await Promise.all([
      sendAffiliateStatusEmail({
        affiliateEmail: affiliate.user.email,
        affiliateName: affiliate.user.name || "",
        storeName: affiliate.store.name,
        storeSlug: affiliate.store.slug,
        status: "REJECTED",
      }),
      createNotification({
        userId: affiliate.userId,
        type: "AFFILIATE_REJECTED",
        title: `Tu solicitud en ${affiliate.store.name} fue rechazada`,
        body: "El dueño de la tienda decidió no aceptar tu postulación en este momento.",
        link: "/afiliados",
      }),
    ]);

    return NextResponse.json({ affiliate: updated });
  }

  if (action === "deactivate") {
    const updated = await prisma.affiliate.update({
      where: { id },
      data: { isActive: false, status: "PAUSED" },
    });

    await Promise.all([
      sendAffiliateStatusEmail({
        affiliateEmail: affiliate.user.email,
        affiliateName: affiliate.user.name || "",
        storeName: affiliate.store.name,
        storeSlug: affiliate.store.slug,
        status: "PAUSED",
      }),
      createNotification({
        userId: affiliate.userId,
        type: "AFFILIATE_PAUSED",
        title: `Tu acceso en ${affiliate.store.name} fue pausado`,
        body: "Tu link de afiliado está temporalmente inactivo. Contactate con el dueño de la tienda para más información.",
        link: "/afiliados",
      }),
    ]);

    return NextResponse.json({ affiliate: updated });
  }

  if (action === "reactivate") {
    const subR = await prisma.subscription.findUnique({ where: { userId: ownerId }, select: SUB_STATUS_SELECT });
    if (!hasActivePremium(subR)) {
      const activeCount = await prisma.affiliate.count({
        where: { ownerId, status: "APPROVED", isActive: true },
      });
      if (activeCount >= PRO_MAX_AFFILIATES) {
        return NextResponse.json(
          { error: `Alcanzaste el límite de ${PRO_MAX_AFFILIATES} afiliados del plan Tienda Pro. Pausá a alguien que no esté vendiendo, o pasá a Premium para tenerlos sin límite.` },
          { status: 403 }
        );
      }
    }

    const updated = await prisma.affiliate.update({
      where: { id },
      data: {
        isActive: true,
        status: "APPROVED",
        reviewedAt: new Date(),
        wallet: affiliate.wallet
          ? undefined
          : { create: { balance: 0, totalEarned: 0, totalWithdrawn: 0 } },
      },
      include: { wallet: true },
    });

    await Promise.all([
      sendAffiliateStatusEmail({
        affiliateEmail: affiliate.user.email,
        affiliateName: affiliate.user.name || "",
        storeName: affiliate.store.name,
        storeSlug: affiliate.store.slug,
        status: "APPROVED",
      }),
      createNotification({
        userId: affiliate.userId,
        type: "AFFILIATE_APPROVED",
        title: `Tu acceso en ${affiliate.store.name} fue reactivado`,
        body: "Ya podés volver a compartir tu link de afiliado y generar comisiones.",
        link: "/afiliados",
      }),
    ]);

    return NextResponse.json({ affiliate: updated });
  }

  if (action === "remove") {
    const updated = await prisma.affiliate.update({
      where: { id },
      data: {
        isActive: false,
        status: "REMOVED",
        reviewedAt: new Date(),
      },
    });

    // Solo avisamos si tenía una relación activa — si era REJECTED nunca fue afiliado/a
    if (["APPROVED", "PAUSED"].includes(affiliate.status)) {
      await Promise.all([
        sendAffiliateStatusEmail({
          affiliateEmail: affiliate.user.email,
          affiliateName: affiliate.user.name || "",
          storeName: affiliate.store.name,
          storeSlug: affiliate.store.slug,
          status: "REMOVED",
        }),
        createNotification({
          userId: affiliate.userId,
          type: "AFFILIATE_REMOVED",
          title: `Fuiste dado/a de baja en ${affiliate.store.name}`,
          body: "Tu link de afiliado fue desactivado. Los saldos ya acreditados en tu panel de comisiones siguen disponibles para retirar.",
          link: "/afiliados",
        }),
      ]);
    }

    return NextResponse.json({ affiliate: updated });
  }

  return NextResponse.json({ error: "Accion no valida" }, { status: 400 });
}
