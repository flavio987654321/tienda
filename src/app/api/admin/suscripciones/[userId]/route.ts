import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

const VALID_STATUSES = ["TRIAL", "ACTIVE", "GRACE", "EXPIRED", "CANCELLED"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const current = await getCurrentUser();
  if (!current || current.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { userId } = await params;
  const { status, extendDays, tier, plan } = await req.json();

  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return NextResponse.json({ error: "Sin suscripción" }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (status && VALID_STATUSES.includes(status)) {
    data.status = status;
  }

  if (typeof extendDays === "number" && extendDays > 0) {
    const base = sub.trialEndsAt > new Date() ? sub.trialEndsAt : new Date();
    data.trialEndsAt = new Date(base.getTime() + extendDays * 24 * 60 * 60 * 1000);
    data.status = "TRIAL";
  }

  if (tier === "BASIC" || tier === "PREMIUM") {
    data.tier = tier;
    data.role = "OWNER";
  }

  if (tier === "AFFILIATE") {
    data.role = "AFFILIATE";
  }

  if (plan === "MONTHLY" || plan === "ANNUAL") {
    data.plan = plan;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Sin cambios válidos" }, { status: 400 });
  }

  const updated = await prisma.subscription.update({ where: { userId }, data });
  return NextResponse.json(updated);
}
