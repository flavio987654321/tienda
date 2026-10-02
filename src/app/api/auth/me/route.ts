import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tieneGoogle } from "@/lib/alta-google";
import { tieneAltaPendiente } from "@/lib/alta-google-servidor";

export async function GET() {
  const user = await getCurrentUser();

  /* Entró con Google y no terminó el alta (ver `lib/alta-google`): el sitio lo
     manda a terminarla. Solo se pregunta por los compradores, que es el rol
     del perfil vacío: al resto no le cuesta nada. */
  let altaPendiente = false;
  if (user?.role === "BUYER") {
    try {
      if (await tieneAltaPendiente(user.id)) {
        const { data } = await (await createSupabaseServerClient()).auth.getUser();
        altaPendiente = tieneGoogle(data?.user);
      }
    } catch { /* si no se puede saber, no se lo frena */ }
  }

  return NextResponse.json({ user, ...(altaPendiente ? { altaPendiente } : {}) });
}
