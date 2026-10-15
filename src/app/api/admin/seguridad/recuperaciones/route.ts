import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-log";
import { getClientIp } from "@/lib/request-ip";
import { congelarRecuperacion } from "@/lib/seguridad-cuenta";

/**
 * Los "Perdí mi celular" en curso, para el admin. Lo único que el admin puede
 * hacer es CONGELAR uno (el dueño escribió que no fue él) o descongelarlo: nunca
 * quitarle el doble paso a nadie ni acortar una espera. Así lo prometen los
 * términos, y por eso no hay endpoint para eso. Ver `lib/seguridad-cuenta`.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const [enCurso, cuentasConDosPasos] = await Promise.all([
    prisma.recuperacionDosPasos.findMany({
      where: { estado: { in: ["confirmar", "esperando", "congelada"] } },
      orderBy: { creadoAt: "desc" },
      take: 50,
      include: { user: { select: { email: true, name: true, role: true } } },
    }),
    prisma.$queryRaw<{ n: number }[]>`select count(distinct user_id)::int as n from auth.mfa_factors where status = 'verified'`
      .then((r) => r[0]?.n ?? 0)
      .catch(() => null),
  ]);

  return NextResponse.json({
    cuentasConDosPasos,
    recuperaciones: enCurso.map((r) => ({
      id: r.id,
      estado: r.estado,
      email: r.user.email,
      nombre: r.user.name,
      rol: r.user.role,
      conContrasena: r.conContrasena,
      creadoAt: r.creadoAt.toISOString(),
      venceAt: r.venceAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const congelar = body?.congelar === true;
  if (!id) return NextResponse.json({ error: "Falta el pedido" }, { status: 400 });

  const ok = await congelarRecuperacion(id, congelar);
  if (!ok) return NextResponse.json({ error: "Ese pedido ya cambió de estado. Recargá." }, { status: 409 });

  await logAdminAction({
    adminId: user.id,
    adminEmail: user.email,
    action: congelar ? "RECUPERACION_CONGELADA" : "RECUPERACION_DESCONGELADA",
    targetId: id,
    targetType: "MFA",
    details: {},
    ip: getClientIp(req),
  });
  return NextResponse.json({ ok: true });
}
