import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { factoresDe, crearCodigosRespaldo, registrarEvento } from "@/lib/seguridad-cuenta";
import { describirDispositivo } from "@/lib/seguridad-cuenta-reglas";
import { identidadReciente } from "@/lib/identidad-reciente";

/**
 * Códigos de respaldo nuevos (los anteriores dejan de servir). Pide haber
 * pasado el segundo paso recién: con la sesión abierta sola, alguien sentado
 * en la compu se llevaría ocho llaves de la cuenta.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const identidad = await identidadReciente(req, user.id);
  if (!identidad.ok) return NextResponse.json(identidad.body, { status: identidad.status });
  if (!identidad.conDosPasos) return NextResponse.json({ error: "Primero activá la verificación en dos pasos." }, { status: 400 });

  try {
    if ((await factoresDe(user.id)).length === 0) {
      return NextResponse.json({ error: "Primero activá la verificación en dos pasos." }, { status: 400 });
    }
    const codigos = await crearCodigosRespaldo(user.id);
    await registrarEvento(user.id, "codigos_nuevos", { dispositivo: describirDispositivo(req.headers.get("user-agent")) });
    return NextResponse.json({ ok: true, codigos });
  } catch (e) {
    console.error("[seguridad] códigos nuevos:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No pudimos generar los códigos. Probá de nuevo." }, { status: 503 });
  }
}
