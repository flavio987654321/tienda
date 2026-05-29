import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { policyReturns, policyShipping, policyTerms } = body;

  await prisma.store.update({
    where: { ownerId: user.id },
    data: {
      policyReturns: typeof policyReturns === "string" ? policyReturns.trim() || null : undefined,
      policyShipping: typeof policyShipping === "string" ? policyShipping.trim() || null : undefined,
      policyTerms: typeof policyTerms === "string" ? policyTerms.trim() || null : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
