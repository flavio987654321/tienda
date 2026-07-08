import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";

const MILESTONE_TYPES = [
  "FIRST_ORDER",
  "FIRST_REVIEW",
  "FIRST_AFFILIATE",
  "REVENUE_1K",
  "REVENUE_10K",
  "REVENUE_50K",
] as const;

const markShownSchema = z.object({
  type: z.enum(MILESTONE_TYPES),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!(await checkRateLimit(`milestones:get:${user.id}`, 60, 60_000))) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const milestones = await prisma.storeMilestone.findMany({
    where: { storeId: store.id, shownAt: null },
    select: { id: true, type: true, achievedAt: true },
    orderBy: { achievedAt: "asc" },
  });

  return NextResponse.json(
    milestones.map((m) => ({ ...m, achievedAt: m.achievedAt.toISOString() }))
  );
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!(await checkRateLimit(`milestones:post:${user.id}`, 10, 60_000))) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const parsed = markShownSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Tipo de hito inválido" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  await prisma.storeMilestone.updateMany({
    where: { storeId: store.id, type: parsed.data.type, shownAt: null },
    data: { shownAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
