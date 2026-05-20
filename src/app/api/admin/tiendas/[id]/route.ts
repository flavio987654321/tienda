import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentUser();
  if (!current || current.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, boolean> = {};
  if (body.isPublished !== undefined) data.isPublished = Boolean(body.isPublished);
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

  const store = await prisma.store.update({
    where: { id },
    data,
    select: { id: true, isPublished: true, isActive: true },
  });

  return NextResponse.json(store);
}
