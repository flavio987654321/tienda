import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { recuperacionEnCurso } from "@/lib/seguridad-cuenta";

/**
 * GET — sólo lo que necesita el cartel rojo de arriba de los paneles: si hay un
 * "Perdí mi celular" en curso. Una consulta por índice, sin ir a Supabase, para
 * que se pueda pedir en cada entrada al panel sin costo.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ recuperacion: null }, { status: 401 });
  const recuperacion = await recuperacionEnCurso(user.id).catch(() => null);
  return NextResponse.json({ recuperacion }, { headers: { "Cache-Control": "private, no-store" } });
}
