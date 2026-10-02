import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { destinoTrasGoogle, googleRecienConectado, registroSinConfirmarConGoogle } from "@/lib/alta-google";
import { sendAvisoGoogleConectado } from "@/lib/resend";
import { esElAdmin, tieneAltaPendiente, anularClaveYReabrir } from "@/lib/alta-google-servidor";
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
    return a("/login?vencida=sin-contrasena");
  }

  if (registroSinConfirmarConGoogle(user) && user.email) {
    // Ver `registroSinConfirmarConGoogle`: la contraseña la puso otro.
    const ok = await anularClaveYReabrir(supabase, user.id, user.email);
    console.warn("[google] cuenta sin confirmar tomada por Google: se anuló la contraseña", { userId: user.id, ok });
    if (!ok) return a("/login?google=reingresar");
  } else if (user.email && googleRecienConectado(user, Date.now())) {
    // Ya tenía contraseña y se le sumó Google: se le avisa. Un fallo del mail no frena la entrada.
    await sendAvisoGoogleConectado({ to: user.email }).catch((e) =>
      console.error("[google] no salió el aviso de Google conectado:", e instanceof Error ? e.message : e));
  }

  return a(destinoTrasGoogle(await tieneAltaPendiente(user.id, user.email), next));
}
