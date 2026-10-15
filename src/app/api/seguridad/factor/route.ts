import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth-session";
import { factoresDe, registrarEvento } from "@/lib/seguridad-cuenta";
import { describirDispositivo } from "@/lib/seguridad-cuenta-reglas";
import { identidadReciente } from "@/lib/identidad-reciente";
import { prisma } from "@/lib/prisma";
import { sendSeguridadEmail } from "@/lib/email";

/**
 * DELETE — quitar una huella o la app. Pide haber pasado el segundo paso recién
 * (con la sesión sola, cualquiera sentado en la compu apagaba la protección).
 * Si era el último factor, el doble paso queda apagado: se borran los códigos
 * de respaldo y se avisa por mail, que es lo que alertaría a la dueña si no fue ella.
 */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const identidad = await identidadReciente(req, user.id);
  if (!identidad.ok) return NextResponse.json(identidad.body, { status: identidad.status });

  const body = await req.json().catch(() => null);
  const factorId = typeof body?.factorId === "string" ? body.factorId : "";

  const antes = await factoresDe(user.id).catch(() => null);
  if (!antes) return NextResponse.json({ error: "No pudimos leer tu verificación. Probá de nuevo." }, { status: 503 });
  const factor = antes.find((f) => f.id === factorId);
  if (!factor) return NextResponse.json({ error: "Ese método ya no está." }, { status: 404 });

  // Con la sesión de la persona y no con la clave de servicio: Supabase exige aal2
  // para quitar un factor verificado, y esa regla queda de su lado también.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    console.error("[seguridad] quitar factor:", error.message);
    return NextResponse.json({ error: "No se pudo quitar. Probá de nuevo." }, { status: 502 });
  }

  const dispositivo = describirDispositivo(req.headers.get("user-agent"));
  const quedan = antes.length - 1;
  await registrarEvento(user.id, factor.tipo === "huella" ? "huella_quitada" : "app_quitada", { dispositivo });
  if (quedan === 0) {
    await prisma.codigoRespaldo.deleteMany({ where: { userId: user.id } });
    await registrarEvento(user.id, "dos_pasos_apagado", { dispositivo });
  }
  await sendSeguridadEmail({
    to: user.email, name: user.name, tono: quedan === 0 ? "alerta" : "dato",
    asunto: quedan === 0 ? "Apagaste la verificación en dos pasos" : "Quitaste un método de verificación",
    titulo: quedan === 0 ? "La verificación en dos pasos quedó apagada" : "Quitaste un método de verificación",
    parrafos: [
      `Desde ${dispositivo} se quitó ${factor.tipo === "huella" ? "una huella o cara" : "la app de códigos"} de tu cuenta.`,
      quedan === 0
        ? "Tu cuenta vuelve a entrar sólo con la contraseña o el mail. Te recomendamos volver a activarla."
        : "Te sigue quedando otro método para entrar.",
      "Si no fuiste vos, cambiá tu contraseña ya y escribinos.",
    ],
  }).catch(() => {});

  return NextResponse.json({ ok: true, quedan });
}
