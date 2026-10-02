import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { tieneContrasena } from "@/lib/alta-google-servidor";

/** ¿Tiene contraseña? Para que "Agregar contraseña" se muestre solo a quien no. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ tiene: true }, { status: 401 });
  return NextResponse.json({ tiene: await tieneContrasena(user.id) });
}
