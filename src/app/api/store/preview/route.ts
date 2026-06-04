import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { isSafeUrl } from "@/lib/url-utils";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { previewImage } = await req.json();
  if (!previewImage || typeof previewImage !== "string" || !isSafeUrl(previewImage)) {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  await prisma.store.update({
    where: { ownerId: user.id },
    data: { previewImage },
  });

  return NextResponse.json({ ok: true });
}
