import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-log";
import { getClientIp } from "@/lib/request-ip";

const ACCIONES = { enabled: "MFA_ENABLED", disabled: "MFA_DISABLED" } as const;

/**
 * Deja constancia de que se activó o se desactivó el segundo factor.
 *
 * Existe porque todo ese flujo va del navegador a Supabase directo: enrolar y
 * desenrolar nunca tocan nuestro backend, así que no quedaba ningún registro. Si
 * alguien entraba a una sesión abierta y apagaba el 2FA, no había rastro en
 * ningún lado — y es justamente el movimiento que haría alguien antes de hacer
 * daño. El resto de las acciones sensibles del admin sí se registran.
 *
 * No otorga ni quita nada: el cambio real lo hizo Supabase antes de llegar acá.
 * Esto solo anota lo que pasó, así que un fallo no puede dejar a nadie afuera —
 * por eso `logAdminAction` se traga sus propios errores.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const accion = ACCIONES[body?.action as keyof typeof ACCIONES];
  if (!accion) return NextResponse.json({ error: "Acción inválida" }, { status: 400 });

  await logAdminAction({
    adminId: user.id,
    adminEmail: user.email,
    action: accion,
    targetId: user.id,
    targetType: "MFA",
    details: { email: user.email },
    ip: getClientIp(req),
  });

  return NextResponse.json({ ok: true });
}
