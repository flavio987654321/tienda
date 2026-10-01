import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { validarAudiencia } from "@/lib/avisos-admin";
import { alcanceDe } from "@/lib/avisos-admin-servidor";

/**
 * POST /api/admin/avisos/alcance — a cuántas personas les llegaría HOY, con los
 * nombres de las primeras. Lo pide la pantalla del admin mientras se arma el
 * aviso, para no publicar a ciegas.
 *
 * Es POST y no GET porque manda la audiencia entera, no un id.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const a = validarAudiencia(await req.json().catch(() => null));
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: 400 });
  return NextResponse.json(await alcanceDe(a.audiencia));
}
