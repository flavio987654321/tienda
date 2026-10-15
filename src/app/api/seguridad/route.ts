import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth-session";
import { tieneContrasena } from "@/lib/alta-google-servidor";
import { factoresDe, codigosLibres, recuperacionEnCurso, dineroTrabado } from "@/lib/seguridad-cuenta";
import { describirDispositivo, TEXTO_EVENTO, DIAS_HISTORIAL } from "@/lib/seguridad-cuenta-reglas";

/** El id de la sesión actual, del token. Para marcar "este dispositivo" en la lista. */
function sesionActual(accessToken: string | undefined): string | null {
  try {
    const payload = JSON.parse(Buffer.from((accessToken ?? "").split(".")[1] ?? "", "base64url").toString("utf8"));
    return typeof payload?.session_id === "string" ? payload.session_id : null;
  } catch {
    return null;
  }
}

/**
 * GET — todo lo que muestra la pestaña Seguridad. Las sesiones abiertas salen
 * de `auth.sessions` de Supabase: ahí ya están el dispositivo y la última vez
 * que se usó cada una, sin guardar nada propio.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const actual = sesionActual(session?.access_token);

  try {
    const [factores, libres, recuperacion, trabado, contrasena, eventos, sesiones] = await Promise.all([
      factoresDe(user.id),
      codigosLibres(user.id),
      recuperacionEnCurso(user.id),
      dineroTrabado(user.id),
      tieneContrasena(user.id).catch(() => true),
      prisma.eventoCuenta.findMany({
        where: { userId: user.id, creadoAt: { gte: new Date(Date.now() - DIAS_HISTORIAL * 86_400_000) } },
        orderBy: { creadoAt: "desc" },
        take: 15,
        select: { id: true, tipo: true, creadoAt: true, dispositivo: true, detalle: true },
      }),
      prisma.$queryRaw<{ id: string; created_at: Date; refreshed_at: Date | null; updated_at: Date | null; user_agent: string | null }[]>`
        select id::text, created_at, refreshed_at, updated_at, user_agent
        from auth.sessions
        where user_id = ${user.id}::uuid and (not_after is null or not_after > now())
        order by coalesce(refreshed_at, updated_at, created_at) desc
        limit 10`,
    ]);

    return NextResponse.json({
      factores,
      codigosLibres: libres,
      recuperacion,
      dineroTrabadoHasta: trabado?.toISOString() ?? null,
      tieneContrasena: contrasena,
      eventos: eventos.map((e) => ({
        id: e.id,
        texto: TEXTO_EVENTO[e.tipo] ?? e.tipo,
        alerta: e.tipo.startsWith("recuperacion") || e.tipo === "codigo_respaldo_usado" || e.tipo === "dos_pasos_apagado",
        creadoAt: e.creadoAt.toISOString(),
        dispositivo: e.dispositivo,
      })),
      sesiones: sesiones.map((s) => ({
        id: s.id,
        dispositivo: describirDispositivo(s.user_agent),
        desde: s.created_at.toISOString(),
        ultimaVez: (s.refreshed_at ?? s.updated_at ?? s.created_at).toISOString(),
        actual: s.id === actual,
      })),
    });
  } catch (e) {
    console.error("[seguridad] estado:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No pudimos leer la seguridad de tu cuenta. Probá de nuevo." }, { status: 503 });
  }
}
