import { NextRequest, NextResponse } from "next/server";
import { sendCanastaSoporteEmail } from "@/lib/resend";

export async function POST(req: NextRequest) {
  const { nombre, email, telefono, localidad, edad, mensaje } = await req.json();

  if (!nombre?.trim() || !email?.trim() || !telefono?.trim() || !localidad?.trim() || !mensaje?.trim()) {
    return NextResponse.json({ error: "Completá todos los campos" }, { status: 400 });
  }
  if (mensaje.trim().length < 20) {
    return NextResponse.json({ error: "El mensaje es muy corto" }, { status: 400 });
  }

  await sendCanastaSoporteEmail({
    nombre: nombre.trim(),
    email: email.trim(),
    telefono: telefono?.trim() ?? "",
    localidad: localidad?.trim() ?? "",
    edad: edad?.trim() ?? "",
    mensaje: mensaje.trim(),
  });

  return NextResponse.json({ ok: true });
}
