import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Called by an external cron (e.g., cron-job.org or Vercel Cron).
// Protect with CRON_SECRET env var to prevent unauthorized activation.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const products = await prisma.product.findMany({
    where: {
      publishAt: { lte: now },
      isActive: false,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (products.length === 0) {
    return NextResponse.json({ activated: 0 });
  }

  await prisma.product.updateMany({
    where: { id: { in: products.map((p) => p.id) } },
    data: { isActive: true, publishAt: null },
  });

  return NextResponse.json({ activated: products.length });
}
