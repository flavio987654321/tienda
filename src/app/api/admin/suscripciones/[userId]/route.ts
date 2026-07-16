import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-log";
import { revalidatePath } from "next/cache";
import { getClientIp } from "@/lib/request-ip";
import { periodFor, getSubscriptionStatus } from "@/lib/subscription";

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

  if (sub.role === "AFFILIATE") {
    return NextResponse.json(
      { error: "Las cuentas de afiliada son gratuitas, no tienen suscripción para gestionar" },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};

  if (status && VALID_STATUSES.includes(status)) {
    data.status = status;
    // Un cambio de estado desde el panel es explícito y manda: se limpia el
    // "no renovar" que pudo dejar un cierre de tienda anterior. Sin esto,
    // cancelar a alguien que ya había cerrado su tienda no hacía nada —la marca
    // sobrevivía y `getSubscriptionStatus` la seguía leyendo como ACTIVE hasta
    // el vencimiento—, o sea que el botón Cancelar mentía.
    data.cancelAtPeriodEnd = false;
  }

  if (typeof extendDays === "number" && extendDays > 0) {
    const base = sub.trialEndsAt > new Date() ? sub.trialEndsAt : new Date();
    data.trialEndsAt = new Date(base.getTime() + extendDays * 24 * 60 * 60 * 1000);
    data.status = "TRIAL";
    data.cancelAtPeriodEnd = false;
  }

  if (tier === "BASIC" || tier === "PREMIUM") {
    data.tier = tier;
    data.role = "OWNER";
  }

  if (plan === "MONTHLY" || plan === "ANNUAL") {
    data.plan = plan;
  }

  // `plan` sin fecha es media verdad: define cuánto dura el período, así que el
  // vencimiento tiene que recalcularse con él. Antes esto escribía solo la
  // etiqueta y "Activar ahora" ni siquiera tocaba la fecha, dejando ACTIVE sin
  // vencimiento. Se reprograma el período —igual que un pago real— cuando se
  // activa la suscripción o cuando cambia la facturación de una activa.
  const effectivePlan = (data.plan as string) ?? sub.plan;
  const activating = data.status === "ACTIVE";
  const rebilling = data.plan !== undefined && (data.status ?? sub.status) === "ACTIVE";

  if (activating || rebilling) {
    Object.assign(data, periodFor(effectivePlan));
    data.status = "ACTIVE";
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Sin cambios válidos" }, { status: 400 });
  }

  const updated = await prisma.subscription.update({ where: { userId }, data });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/mi-plan");
  revalidatePath("/admin/usuarios");

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
    ip: getClientIp(req),
  });

  // statusReal para que el panel refresque el estado sin recargar: el modal
  // muestra el estado vivo (getSubscriptionStatus), no el crudo de la columna.
  return NextResponse.json({ ...updated, statusReal: getSubscriptionStatus(updated) });
}
