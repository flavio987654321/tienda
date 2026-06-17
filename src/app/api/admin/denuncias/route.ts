import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);

  if (searchParams.get("count") === "1") {
    const count = await prisma.storeReport.count({ where: { status: "PENDING" } });
    return NextResponse.json({ count });
  }

  const status = searchParams.get("status") ?? "PENDING";
  const reports = await prisma.storeReport.findMany({
    where: status === "ALL" ? {} : { status },
    orderBy: { createdAt: "desc" },
    include: {
      store: { select: { id: true, name: true, slug: true, isActive: true } },
    },
  });

  return NextResponse.json({ reports });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { id, status } = body as { id: string; status: string };

  if (!id || !["PENDING", "REVIEWED", "RESOLVED"].includes(status)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const report = await prisma.storeReport.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ report });
}
