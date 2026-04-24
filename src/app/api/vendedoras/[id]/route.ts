import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { sendAffiliateStatusEmail } from "@/lib/email";

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

    await sendAffiliateStatusEmail({
      affiliateEmail: affiliate.user.email,
      affiliateName: affiliate.user.name || "",
      storeName: affiliate.store.name,
      storeSlug: affiliate.store.slug,
      status: "APPROVED",
    });

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

    await sendAffiliateStatusEmail({
      affiliateEmail: affiliate.user.email,
      affiliateName: affiliate.user.name || "",
      storeName: affiliate.store.name,
      storeSlug: affiliate.store.slug,
      status: "REJECTED",
    });

    return NextResponse.json({ affiliate: updated });
  }

  if (action === "deactivate") {
    const updated = await prisma.affiliate.update({
      where: { id },
      data: { isActive: false, status: "PAUSED" },
    });

    await sendAffiliateStatusEmail({
      affiliateEmail: affiliate.user.email,
      affiliateName: affiliate.user.name || "",
      storeName: affiliate.store.name,
      storeSlug: affiliate.store.slug,
      status: "PAUSED",
    });

    return NextResponse.json({ affiliate: updated });
  }

  if (action === "reactivate") {
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

    await sendAffiliateStatusEmail({
      affiliateEmail: affiliate.user.email,
      affiliateName: affiliate.user.name || "",
      storeName: affiliate.store.name,
      storeSlug: affiliate.store.slug,
      status: "APPROVED",
    });

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

    await sendAffiliateStatusEmail({
      affiliateEmail: affiliate.user.email,
      affiliateName: affiliate.user.name || "",
      storeName: affiliate.store.name,
      storeSlug: affiliate.store.slug,
      status: "REMOVED",
    });

    return NextResponse.json({ affiliate: updated });
  }

  return NextResponse.json({ error: "Accion no valida" }, { status: 400 });
}
