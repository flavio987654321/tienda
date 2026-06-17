import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-log";

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

  const action = data.isPublished !== undefined
    ? (data.isPublished ? "PUBLISH_STORE" : "UNPUBLISH_STORE")
    : (data.isActive ? "ACTIVATE_STORE" : "DEACTIVATE_STORE");

  await logAdminAction({
    adminId: current.id,
    adminEmail: current.email,
    action,
    targetId: id,
    targetType: "STORE",
    details: data as Record<string, unknown>,
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
  });

  return NextResponse.json(store);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentUser();
  if (!current || current.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  const store = await prisma.store.findUnique({
    where: { id },
    select: { id: true, slug: true, name: true },
  });

  if (!store) {
    return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
  }

  await prisma.store.update({
    where: { id },
    data: { storeConfig: "{}", pageBlocks: "[]" },
  });

  await logAdminAction({
    adminId: current.id,
    adminEmail: current.email,
    action: "RESET_STORE_DESIGN",
    targetId: id,
    targetType: "STORE",
    details: { storeName: store.name, slug: store.slug },
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
  });

  return NextResponse.json({ ok: true });
}
