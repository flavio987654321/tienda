import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth-session";
import { despuesDelSegundoPaso } from "@/lib/seguridad-cuenta";
import { segundoPasoDesde } from "@/lib/identidad-reciente";

/**
 * La huella se verifica entre el navegador y Supabase, sin pasar por acá. Esto
 * es el aviso de después: anota el ingreso y cancela un "Perdí mi celular"
 * abierto. Sólo cuenta si la sesión dice que el segundo paso se pasó hace
 * instantes: llamarlo de nuevo más tarde no anota nada.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tu sesión se cerró. Volvé a entrar." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const supabase = await createSupabaseServerClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const desde = aal?.currentLevel === "aal2" ? segundoPasoDesde(aal.currentAuthenticationMethods) : null;
  if (desde === null || Date.now() - desde > 2 * 60_000) return NextResponse.json({ ok: true, anotado: false });

  await despuesDelSegundoPaso(user.id, req.headers.get("user-agent"), body?.paraEntrar === true);
  return NextResponse.json({ ok: true, anotado: true });
}
