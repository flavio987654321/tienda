import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendStoreReportAdminEmail } from "@/lib/resend";
import { checkRateLimit } from "@/lib/rate-limit";

const REASONS = [
  "Estafa o fraude",
  "Productos falsos o engañosos",
  "No entrega los pedidos",
  "Contenido inapropiado",
  "Otro",
];

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!(await checkRateLimit(`report:${ip}`, 3, 10 * 60_000))) {
    return NextResponse.json({ error: "Demasiados reportes. Esperá un momento." }, { status: 429 });
  }

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const reason: string = body.reason ?? "";
  const description: string = body.description ?? "";
  const reporterEmail: string = body.reporterEmail ?? "";

  if (!REASONS.includes(reason)) {
    return NextResponse.json({ error: "Motivo inválido" }, { status: 400 });
  }

  await prisma.storeReport.create({
    data: {
      storeId: store.id,
      reason,
      description: description.trim() || null,
      reporterEmail: reporterEmail.trim() || null,
    },
  });

  await sendStoreReportAdminEmail({
    storeName: store.name,
    storeSlug: store.slug,
    reason,
    description: description.trim() || undefined,
    reporterEmail: reporterEmail.trim() || undefined,
  });

  return NextResponse.json({ ok: true });
}
