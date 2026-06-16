import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { sendAfiliadoSoporteEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { categoria, asunto, mensaje } = await req.json();

  if (!categoria || !asunto?.trim() || !mensaje?.trim()) {
    return NextResponse.json({ error: "Completá todos los campos" }, { status: 400 });
  }

  if (mensaje.trim().length < 20) {
    return NextResponse.json({ error: "El mensaje es muy corto" }, { status: 400 });
  }

  await sendAfiliadoSoporteEmail({
    userName: user.name ?? "Afiliado/a",
    userEmail: user.email,
    categoria,
    asunto,
    mensaje,
  });

  return NextResponse.json({ ok: true });
}
