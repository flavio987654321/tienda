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

  await sendPasswordResetEmail({
    to: email.trim().toLowerCase(),
    resetLink: data.properties.action_link,
  });

  return NextResponse.json({ ok: true });
}
