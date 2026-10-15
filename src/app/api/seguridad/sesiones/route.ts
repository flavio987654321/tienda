import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth-session";
import { registrarEvento } from "@/lib/seguridad-cuenta";
import { describirDispositivo } from "@/lib/seguridad-cuenta-reglas";

/**
 * POST — "Cerrar las sesiones de los otros dispositivos". Con la sesión de la
 * persona y `scope: "others"`: Supabase revoca todas menos ésta.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) {
    console.error("[seguridad] cerrar otras sesiones:", error.message);
    return NextResponse.json({ error: "No se pudieron cerrar. Probá de nuevo." }, { status: 502 });
  }
  await registrarEvento(user.id, "sesiones_cerradas", { dispositivo: describirDispositivo(req.headers.get("user-agent")) });
  return NextResponse.json({ ok: true });
}
