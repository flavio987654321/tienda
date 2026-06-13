import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const DELETED = { email: { endsWith: ".invalid" } };
  const ACTIVE_USER = { role: { not: "ADMIN" }, banned: false, NOT: DELETED };
  const REAL_STORE = { slug: { not: { startsWith: "deleted-" } } };

  const [
    totalUsers, totalOwners, totalAffiliates, totalBuyers,
    totalStores, activeStores,
    totalOrders, pendingOrders,
    totalTestimonials, pendingTestimonials,
    activeSubscriptions,
    totalBanned, totalDeleted,
    pendingVerifications, pendingRetiros,
  ] = await Promise.all([
    prisma.user.count({ where: ACTIVE_USER }),
    prisma.user.count({ where: { role: "OWNER",  banned: false, NOT: DELETED } }),
    prisma.user.count({ where: { role: "SELLER", banned: false, NOT: DELETED } }),
    prisma.user.count({ where: { role: "BUYER",  banned: false, NOT: DELETED } }),
    prisma.store.count({ where: REAL_STORE }),
    prisma.store.count({ where: { ...REAL_STORE, isActive: true, isPublished: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.testimonial.count(),
    prisma.testimonial.count({ where: { approved: false } }),
    prisma.subscription.count({ where: { status: { in: ["ACTIVE", "TRIAL"] } } }),
    prisma.user.count({ where: { banned: true, NOT: DELETED } }),
    prisma.user.count({ where: DELETED }),
    prisma.verificationRequest.count({ where: { status: "PENDING" } }),
    prisma.walletWithdrawal.count({ where: { status: "PENDING" } }),
  ]);

  return NextResponse.json({
    totalUsers, totalOwners, totalAffiliates, totalBuyers,
    totalStores, activeStores,
    totalOrders, pendingOrders,
    totalTestimonials, pendingTestimonials,
    activeSubscriptions,
    totalBanned, totalDeleted,
    pendingVerifications, pendingRetiros,
  });
}
