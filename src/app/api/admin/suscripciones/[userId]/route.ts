import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-log";
import { revalidatePath } from "next/cache";

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

  revalidatePath("/dashboard", "layout");

  const actions: string[] = [];
  if (data.status) actions.push(`CHANGE_STATUS:${data.status}`);
  if (data.tier) actions.push(`CHANGE_TIER:${data.tier}`);
  if (data.plan) actions.push(`CHANGE_PLAN:${data.plan}`);
  if (data.trialEndsAt) actions.push("EXTEND_TRIAL");

  await logAdminAction({
    adminId: current.id,
    adminEmail: current.email,
    action: actions.join("|") || "CHANGE_STATUS",
    targetId: userId,
    targetType: "SUBSCRIPTION",
    details: {
      before: { status: sub.status, tier: sub.tier, plan: sub.plan, role: sub.role },
      after: data,
    },
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
  });

  return NextResponse.json(updated);
}
