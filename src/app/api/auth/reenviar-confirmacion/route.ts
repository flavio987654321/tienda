import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendConfirmEmail } from "@/lib/resend";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

/**
 * "No me llegó el mail de confirmación".
 *
 * Calcada de `reset-password`, que resuelve el mismo problema: **siempre
 * responde lo mismo**, exista o no la cuenta. Si contestara distinto, esta ruta
 * sería una forma de averiguar qué correos están registrados en la plataforma
 * probando de a uno.
 *
 * ── Por qué hay dos caminos ─────────────────────────────────────────────────
 *
 * El alta genera su link con `generateLink` de tipo "signup", pero eso necesita
 * la contraseña y acá no la tenemos: la persona sólo escribió su correo.
 *
 * Así que se intenta primero con un link mágico, que confirma el correo al
 * usarse y viaja en NUESTRO mail, con el diseño de la plataforma. Si el proyecto
 * de Supabase no lo permite, se cae al reenvío propio de Supabase, que usa su
 * plantilla —más fea, pero llega.
 *
 * Los dos caminos existen porque esto no se pudo probar contra un Supabase de
 * prueba, y el peor final posible acá es alguien que se registró y **se queda
 * afuera para siempre**. Cuando se confirme cuál de los dos anda de verdad, se
 * borra el otro.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  // Mismo tope que la recuperación de contraseña: 3 por minuto por IP.
  if (!(await checkRateLimit(`reenviar-confirmacion:${ip}`, 3, 60_000))) {
    return NextResponse.json({ ok: true });
  }

  const { email } = await req.json().catch(() => ({ email: null }));
  if (!email || typeof email !== "string" || email.length > 254) {
    return NextResponse.json({ ok: true });
  }

  const destino = email.trim().toLowerCase();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const redirectTo = `${appUrl}/login?confirmado=1`;

  // ── Camino 1: nuestro mail, con un link que confirma al usarse ─────────────
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: destino,
      options: { redirectTo },
    });

    if (!error && data?.properties?.action_link) {
      /* ⚠️ Se mira si el mail SALIÓ antes de contestar que sí.
       *
       * Hasta el 03/09/26 esto era `await` a secas y contestaba "listo"
       * enseguida. Y como el SDK de Resend no tira cuando la API rechaza el mail
       * —lo devuelve adentro de la respuesta—, un rechazo terminaba acá: la
       * persona veía "te lo reenviamos", no le llegaba nada, y **el camino 2 de
       * acá abajo nunca se probaba**, aunque estaba escrito y funcionando.
       *
       * O sea que el respaldo existía y era inalcanzable justo para el caso que
       * lo necesitaba. Ahora, si el mail propio no sale, se cae al de Supabase. */
      const envio = await sendConfirmEmail({ to: destino, confirmLink: data.properties.action_link });
      if (!envio.error) return NextResponse.json({ ok: true });
      console.warn("REENVIAR: el mail propio fue rechazado, se prueba el de Supabase", envio.error.message);
    } else {
      console.warn("REENVIAR: el link mágico no salió, se prueba el reenvío de Supabase", error?.message);
    }
  } catch (e) {
    console.warn("REENVIAR: falló el camino propio", e instanceof Error ? e.message : e);
  }

  // ── Camino 2: el reenvío de Supabase, con su propia plantilla ──────────────
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (url && anon) {
      const publico = createClient(url, anon, { auth: { persistSession: false } });
      await publico.auth.resend({ type: "signup", email: destino, options: { emailRedirectTo: redirectTo } });
    }
  } catch (e) {
    console.error("REENVIAR: falló también el reenvío de Supabase para", destino, e instanceof Error ? e.message : e);
  }

  return NextResponse.json({ ok: true });
}
