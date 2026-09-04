import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendPasswordResetEmail } from "@/lib/resend";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`reset-password:${ip}`, 3, 60_000))) {
    return NextResponse.json({ ok: true }); // respuesta genérica para no revelar el bloqueo
  }

  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/actualizar-contrasena`;

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: email.trim().toLowerCase(),
    options: { redirectTo },
  });

  if (error || !data?.properties?.action_link) {
    // Respuesta genérica para no revelar si el email existe
    return NextResponse.json({ ok: true });
  }

  /* ⚠️ Acá NO se le cuenta a quien pide si el mail salió, y es a propósito.
   *
   * Toda esta ruta contesta lo mismo pase lo que pase para no revelar si esa
   * dirección tiene cuenta. A esta altura ya se sabe que sí —`generateLink`
   * funcionó—, así que contestar un error cuando el envío falla convertiría la
   * respuesta en un "esta dirección existe": justo lo que las tres salidas
   * genéricas de arriba evitan.
   *
   * Es una decisión, no un olvido: se cambia una propiedad que vale siempre por
   * un mensaje mejor en un fallo raro. El fallo igual ya no pasa desapercibido
   * —el envoltorio de `lib/resend` lo deja escrito con asunto y destinatario—,
   * que era el problema de verdad. Si alguna vez se quiere avisar, hay que
   * hacerlo sin que la respuesta cambie: por ejemplo reintentando, o mandando
   * por un segundo camino como hace `reenviar-confirmacion`. */
  await sendPasswordResetEmail({
    to: email.trim().toLowerCase(),
    resetLink: data.properties.action_link,
  });

  return NextResponse.json({ ok: true });
}
