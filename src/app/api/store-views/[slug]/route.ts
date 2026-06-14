import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// POST /api/store-views/[slug]
// Registra una visita a la tienda. Se llama desde el browser (fire-and-forget).
// La deduplicación se maneja en el cliente con sessionStorage (una visita por día por sesión).
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const store = await prisma.store.findFirst({
    where: { slug, isActive: true, isPublished: true },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ ok: false }, { status: 404 });

  const date = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD" UTC

  await prisma.storeView.upsert({
    where: { storeId_date: { storeId: store.id, date } },
    update: { count: { increment: 1 } },
    create: { storeId: store.id, date, count: 1 },
  });

  return NextResponse.json({ ok: true });
}
