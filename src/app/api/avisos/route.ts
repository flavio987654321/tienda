import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { ROLES_AVISO } from "@/lib/avisos-admin";
import { avisosParaElPanel } from "@/lib/avisos-admin-servidor";

export const dynamic = "force-dynamic";

/**
 * GET /api/avisos — los avisos del admin que le tocan ver a esta cuenta ahora.
 *
 * La lógica está en `avisosParaElPanel`, que también usan las páginas de
 * inicio de los paneles para traerlo junto con todo lo demás.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !(ROLES_AVISO as readonly string[]).includes(user.role)) {
    return NextResponse.json({ avisos: [] });
  }
  /* Cada panel abierto pregunta al entrar, al volver a la pestaña y cuando el
     admin cambia algo. 60 por minuto sobra para eso y frena a quien lo use de
     otra forma. Pasado el tope no es un error: no hay aviso, y listo. */
  if (!(await checkRateLimit(`avisos-get:${user.id}`, 60, 60_000))) {
    return NextResponse.json({ avisos: [] });
  }

  return NextResponse.json({ avisos: await avisosParaElPanel(user) });
}
