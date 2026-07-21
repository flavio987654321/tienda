import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { countFailures, recordFailure, failureCooldown, clearFailures } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

/** Códigos errados antes del bloqueo. */
const MAX_INTENTOS = 5;
/** Cuánto dura el bloqueo. */
const BLOQUEO_MS = 15 * 60 * 1000;

/**
 * Verifica el código de dos pasos del admin, contando los intentos fallidos.
 *
 * Antes el navegador le hablaba directo a Supabase, así que nuestro servidor
 * nunca veía los intentos y no podía contarlos: toda la defensa contra fuerza
 * bruta quedaba en manos de los límites de Supabase, que no controlamos ni vemos.
 *
 * El contador va pegado al ID DE LA CUENTA, no a la sesión, y ese es el punto:
 * un contador por sesión no sirve contra alguien que ya tiene la contraseña
 * —cerraría sesión y volvería a entrar para conseguir 5 intentos nuevos, sin
 * límite—. Atado a la cuenta, el bloqueo lo sigue aunque vuelva a loguearse.
 *
 * Nota sobre el estado: el usuario llega acá con sesión aal1 (pasó la contraseña,
 * falta el segundo factor). Al verificar bien, el cliente SSR escribe la cookie
 * ya elevada a aal2 — por eso esto tiene que ser una ruta de API y no un Server
 * Component, que no puede escribir cookies.
 *
 * Y por eso NO vive bajo /api/admin: el middleware corta esa rama entera cuando
 * falta el segundo factor, que es exactamente el estado de quien llega acá. Ahí
 * adentro se bloquearía a sí misma. Es el mismo motivo por el que la página
 * /verificar-2fa vive fuera de /admin.
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Ingresá el código de 6 dígitos de tu app." }, { status: 400 });
  }

  const key = `mfa:${user.id}`;

  // Si Redis no está disponible se sigue sin contador: quedarse sin poder entrar
  // al panel por un problema de infraestructura es peor que depender un rato de
  // los límites de Supabase. Se loguea para que no pase inadvertido.
  let contadorActivo = true;
  try {
    const fallos = await countFailures(key);
    if (fallos >= MAX_INTENTOS) {
      const faltan = await failureCooldown(key);
      const minutos = Math.max(1, Math.ceil(faltan / 60));
      console.warn("[2fa] intento sobre una cuenta bloqueada", { userId: user.id, ip: getClientIp(req) });
      return NextResponse.json(
        {
          error: `Demasiados códigos incorrectos. Volvé a intentar en ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`,
          bloqueado: true,
        },
        { status: 429 }
      );
    }
  } catch {
    contadorActivo = false;
    console.error("[2fa] Redis no disponible: se verifica sin contador de intentos");
  }

  const { data: factors, error: fErr } = await supabase.auth.mfa.listFactors();
  const totp = factors?.totp?.[0];
  if (fErr || !totp) {
    return NextResponse.json(
      { error: "No encontramos tu factor de dos pasos. Cerrá sesión e intentá de nuevo." },
      { status: 400 }
    );
  }

  const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
  if (chErr || !challenge) {
    return NextResponse.json({ error: "No se pudo verificar. Intentá de nuevo." }, { status: 502 });
  }

  const { error: vErr } = await supabase.auth.mfa.verify({
    factorId: totp.id,
    challengeId: challenge.id,
    code,
  });

  if (vErr) {
    let restantes: number | null = null;
    if (contadorActivo) {
      try {
        const fallos = await recordFailure(key, BLOQUEO_MS);
        restantes = Math.max(0, MAX_INTENTOS - fallos);
        // Un fallo suelto es alguien que copió mal el código; varios seguidos ya
        // es otra cosa y conviene que quede en el registro del servidor.
        if (fallos >= 3) {
          console.warn("[2fa] códigos incorrectos consecutivos", {
            userId: user.id, email: user.email, fallos, ip: getClientIp(req),
          });
        }
      } catch { /* sin contador, se responde igual */ }
    }
    return NextResponse.json(
      {
        error: "El código no coincide. Fijate que sea el actual de tu app.",
        restantes,
      },
      { status: 401 }
    );
  }

  // Acertó: se limpia el contador. Los fallos previos no se arrastran a la
  // próxima vez que entre.
  if (contadorActivo) {
    await clearFailures(key).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
