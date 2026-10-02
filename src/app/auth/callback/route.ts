import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { destinoTrasGoogle, registroSinConfirmarConGoogle } from "@/lib/alta-google";
import { esElAdmin, tieneAltaPendiente } from "@/lib/alta-google-servidor";
import { getClientIp } from "@/lib/request-ip";

/**
 * Donde vuelve Google. Cambia el código por la sesión y decide a dónde va:
 *
 *  - el admin, a ningún lado: se le cierra la sesión (entra solo con
 *    contraseña y código);
 *  - quien no terminó el alta, a `/registro?google=1` a completarla;
 *  - el resto, a su panel.
 *
 * Una ruta y no una página porque tiene que escribir las cookies de la sesión.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const a = (camino: string) => NextResponse.redirect(new URL(camino, url.origin));
  /* Nunca una pantalla de error: si algo se cae (la base, la red con
     Supabase), vuelve al login con un aviso. Y si la sesión alcanzó a
     abrirse, se cierra: sin haber mirado si es el admin, no se deja abierta. */
  try {
    return await regreso(req, a);
  } catch (e) {
    console.error("[google] error en el regreso:", e instanceof Error ? e.message : e);
    try {
      await (await createSupabaseServerClient()).auth.signOut({ scope: "local" });
    } catch { /* sin red tampoco se puede cerrar; el middleware igual corta el admin */ }
    return a("/login?google=error");
  }
}

async function regreso(req: NextRequest, a: (camino: string) => NextResponse) {
  const url = req.nextUrl;
  const next = url.searchParams.get("next");

  // Canceló en la pantalla de Google, o Google devolvió un error.
  if (url.searchParams.get("error")) return a("/login?google=cancelado");

  const code = url.searchParams.get("code");
  if (!code) return a("/login?google=error");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  const user = data?.user;
  if (error || !user) {
    console.error("[google] no se pudo abrir la sesión:", error?.message);
    return a("/login?google=error");
  }

  if (await esElAdmin(user.id, user.email)) {
    console.warn("[google] intento de entrar al admin con Google", { userId: user.id, ip: getClientIp(req) });
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    return a("/login?vencida=google");
  }

  if (registroSinConfirmarConGoogle(user)) {
    // Ver `registroSinConfirmarConGoogle`: la contraseña la puso otro.
    const { error: errClave } = await createSupabaseAdminClient().auth.admin.updateUserById(user.id, {
      password: `${crypto.randomUUID()}${crypto.randomUUID()}`,
    });
    console.warn("[google] cuenta sin confirmar tomada por Google: se anuló la contraseña", {
      userId: user.id, ok: !errClave,
    });
  }

  return a(destinoTrasGoogle(await tieneAltaPendiente(user.id), next));
}
