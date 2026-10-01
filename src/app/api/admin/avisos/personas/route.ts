import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { ROLES_AVISO } from "@/lib/avisos-admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/avisos/personas?q=… — busca a quién escribirle un aviso solo.
 * Por nombre o mail, y sólo cuentas con panel: un comprador no tiene dónde verlo.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json([]);

  const personas = await prisma.user.findMany({
    where: {
      role: { in: [...ROLES_AVISO] },
      banned: false,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  return NextResponse.json(personas);
}
