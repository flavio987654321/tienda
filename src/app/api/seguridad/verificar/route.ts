import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUsuarioConSegundoPaso } from "@/lib/auth-session";
import { reservarIntento, restantesTrasFallo, limpiarFallos, mensajeBloqueo } from "@/lib/seguridad-intentos";
import { despuesDelSegundoPaso } from "@/lib/seguridad-cuenta";
import { esFallaDelServicio, MENSAJE_SERVICIO_CAIDO } from "@/lib/falla-servicio";

/**
 * El código de 6 números de la app, para entrar (sesión aal1 → aal2) o para
 * volver a verificar antes de algo delicado (la sesión ya es aal2 y sólo se
 * renueva la marca de cuándo lo pasó).
 *
 * Por nuestro servidor y no directo a Supabase, como el 2FA del admin: así se
 * cuentan los errados por cuenta. Y una ruta y no el navegador también porque al
 * verificar se escriben las cookies de la sesión nueva.
 */
export async function POST(req: NextRequest) {
  const sesion = await getUsuarioConSegundoPaso();
  if (!sesion) return NextResponse.json({ error: "Tu sesión se cerró. Volvé a entrar." }, { status: 401 });
  const { user } = sesion;

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.replace(/\D/g, "") : "";
  if (code.length !== 6) return NextResponse.json({ error: "Ingresá los 6 números de tu app." }, { status: 400 });

  // El intento se gasta acá, antes de probar (ver `reservarIntento`). Si después
  // Supabase no contesta, ese intento queda gastado: es uno de cinco, y no
  // devolverlo es lo que impide que lo aprovechen.
  const bloqueo = await reservarIntento(user.id);
  if (bloqueo.bloqueado) return NextResponse.json({ error: mensajeBloqueo(bloqueo.minutos), bloqueado: true }, { status: 429 });

  const supabase = await createSupabaseServerClient();
  const { data: factores, error: fErr } = await supabase.auth.mfa.listFactors();
  if (fErr && esFallaDelServicio(fErr)) return NextResponse.json({ error: MENSAJE_SERVICIO_CAIDO }, { status: 503 });
  const app = factores?.totp?.find((f) => f.status === "verified");
  if (!app) return NextResponse.json({ error: "Tu cuenta no tiene la app de códigos activada." }, { status: 400 });

  const { data: desafio, error: dErr } = await supabase.auth.mfa.challenge({ factorId: app.id });
  if (dErr || !desafio) {
    if (dErr && esFallaDelServicio(dErr)) return NextResponse.json({ error: MENSAJE_SERVICIO_CAIDO }, { status: 503 });
    return NextResponse.json({ error: "No se pudo verificar. Probá de nuevo." }, { status: 502 });
  }
  const { error: vErr } = await supabase.auth.mfa.verify({ factorId: app.id, challengeId: desafio.id, code });
  if (vErr) {
    // Supabase caído no es un código errado: no se cuenta.
    if (esFallaDelServicio(vErr)) return NextResponse.json({ error: MENSAJE_SERVICIO_CAIDO }, { status: 503 });
    return NextResponse.json({ error: "El código no coincide. Fijate que sea el que muestra ahora la app.", restantes: restantesTrasFallo(bloqueo) }, { status: 401 });
  }

  if (bloqueo.contador) await limpiarFallos(user.id);
  await despuesDelSegundoPaso(user.id, req.headers.get("user-agent"), sesion.faltaSegundoPaso);
  return NextResponse.json({ ok: true });
}
