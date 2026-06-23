import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_UTM_SOURCE_LENGTH = 40;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await checkRateLimit(`track-click:${ip}`, 30, 60_000))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const affiliateId = body?.affiliateId;
  if (!affiliateId || typeof affiliateId !== "string") {
    return NextResponse.json({ error: "affiliateId requerido" }, { status: 400 });
  }

  const utmSourceRaw = body?.utmSource;
  const utmSource =
    typeof utmSourceRaw === "string" && utmSourceRaw.trim()
      ? utmSourceRaw.trim().slice(0, MAX_UTM_SOURCE_LENGTH)
      : null;

  const affiliate = await prisma.affiliate.findFirst({
    where: { id: affiliateId, isActive: true, status: "APPROVED" },
    select: { id: true, storeId: true },
  });
  if (!affiliate) return NextResponse.json({ ok: false }, { status: 404 });

  await prisma.affiliateClick.create({
    data: {
      affiliateId: affiliate.id,
      storeId: affiliate.storeId,
      ip: ip === "unknown" ? null : ip,
      utmSource,
    },
  });

  return NextResponse.json({ ok: true });
}
