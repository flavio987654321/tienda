import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { getClientIp } from "@/lib/request-ip";
import { logAdminAction } from "@/lib/admin-log";
import { validarAviso } from "@/lib/avisos-admin";
import { avisosConNumeros, avisarQueCambiaron, conLaPersona } from "@/lib/avisos-admin-servidor";

export const dynamic = "force-dynamic";

/** GET /api/admin/avisos — todos, con cuántos lo vieron, cerraron y tocaron. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  return NextResponse.json(await avisosConNumeros());
}

/** POST /api/admin/avisos — uno nuevo. La validación es la misma que usa la pantalla. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const v = validarAviso(await req.json().catch(() => null));
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const r = await conLaPersona(v.aviso);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });

  const creado = await prisma.avisoAdmin.create({ data: { ...r.aviso, creadoPor: user.email } });
  await logAdminAction({
    adminId: user.id, adminEmail: user.email, action: "AVISO_CREADO",
    targetId: creado.id, targetType: "AVISO",
    details: { titulo: creado.titulo, roles: creado.roles, soloNuevosDias: creado.soloNuevosDias, condicion: creado.condicion, paraUserId: creado.paraUserId },
    ip: getClientIp(req),
  });
  await avisarQueCambiaron();
  return NextResponse.json(await avisosConNumeros(), { status: 201 });
}
