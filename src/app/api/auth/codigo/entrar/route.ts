import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { countFailures, recordFailure, failureCooldown, clearFailures, checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { normalizarEmail, normalizarCodigo, INTENTOS_MAX, BLOQUEO_MS } from "@/lib/codigo-ingreso";
import { esElAdmin } from "@/lib/alta-google-servidor";

/**
 * Entra con el código del mail. Ver `lib/codigo-ingreso`.
 *
 * Por nuestro servidor y no directo a Supabase, igual que el 2FA del admin: así
 * se cuentan los códigos errados POR MAIL (no por sesión ni por IP, que se
 * cambian) y a los 5 se bloquea ese mail 15 minutos. Un código de 6 números
 * probado sin freno se adivina; con 5 intentos cada 15 minutos, no.
 *
 * Una ruta y no el navegador también porque escribe las cookies de la sesión.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!(await checkRateLimit(`codigo-entrar-ip:${ip}`, 20, 60_000))) {
      return NextResponse.json({ error: "Demasiados intentos. Esperá un momento." }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const email = normalizarEmail(body?.email);
    const codigo = normalizarCodigo(body?.codigo);
    if (!email || !codigo) {
      return NextResponse.json({ error: "Revisá el mail y el código: son solo números." }, { status: 400 });
    }

    const clave = `codigo-entrar:${email}`;
    let contador = true;
    try {
      if ((await countFailures(clave)) >= INTENTOS_MAX) {
        const minutos = Math.max(1, Math.ceil((await failureCooldown(clave)) / 60));
        return NextResponse.json(
          { error: `Demasiados códigos incorrectos. Probá de nuevo en ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`, bloqueado: true },
          { status: 429 },
        );
      }
    } catch {
      // Sin Redis se sigue: los límites propios de Supabase siguen frenando.
      contador = false;
      console.error("[codigo] Redis no disponible: se verifica sin contador");
    }

    /* Robo por adelantado, igual que con Google (ver `registroSinConfirmarConGoogle`):
       si la cuenta nunca confirmó el mail, la contraseña pudo ponerla otro.
       Entrar con el código confirma el mail, y esa contraseña empezaría a
       servir. Se mira ANTES de verificar, porque después ya figura confirmada. */
    const perfil = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    let sinConfirmar = false;
    if (perfil) {
      const { data: antes } = await createSupabaseAdminClient().auth.admin.getUserById(perfil.id);
      sinConfirmar = !!antes?.user && !antes.user.email_confirmed_at;
    }

    const supabase = await createSupabaseServerClient();
    /* "email" es el tipo actual y cubre el código de un link mágico; "magiclink"
       es el nombre viejo, por si la versión de Supabase todavía lo pide. Es un
       solo intento a los ojos del contador: errar cuenta una vez. */
    let { data, error } = await supabase.auth.verifyOtp({ email, token: codigo, type: "email" });
    if (error) ({ data, error } = await supabase.auth.verifyOtp({ email, token: codigo, type: "magiclink" }));

    if (error || !data?.user) {
      let restantes: number | null = null;
      if (contador) {
        try {
          restantes = Math.max(0, INTENTOS_MAX - (await recordFailure(clave, BLOQUEO_MS)));
        } catch { /* se contesta igual */ }
      }
      return NextResponse.json(
        { error: "El código no es correcto o ya venció. Pedí uno nuevo si hace falta.", restantes },
        { status: 401 },
      );
    }

    // El admin no entra así. `pedir` ya no le manda código; esto es por si acaso.
    if (await esElAdmin(data.user.id, data.user.email)) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      return NextResponse.json({ error: "Esta cuenta entra con contraseña." }, { status: 403 });
    }
    // Suspendida: `pedir` no le manda código, pero pudo tener uno de antes.
    const suspendida = await prisma.user.findUnique({ where: { id: data.user.id }, select: { banned: true } });
    if (suspendida?.banned) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      return NextResponse.json({ error: "Esta cuenta está suspendida." }, { status: 403 });
    }

    if (sinConfirmar) {
      const { error: errClave } = await createSupabaseAdminClient().auth.admin.updateUserById(data.user.id, {
        password: `${crypto.randomUUID()}${crypto.randomUUID()}`,
      });
      console.warn("[codigo] cuenta sin confirmar abierta con código: se anuló la contraseña", { userId: data.user.id, ok: !errClave });
    }

    if (contador) await clearFailures(clave).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[codigo] error al entrar:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No pudimos verificar el código. Intentá de nuevo." }, { status: 500 });
  }
}
