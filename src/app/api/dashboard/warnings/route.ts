import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { cargarEstadoTienda, avisosDeTienda, marcarOnboardingSiCorresponde } from "@/lib/avisos-tienda";

/**
 * GET /api/dashboard/warnings → { avisos: Aviso[] }
 *
 * Antes devolvía tres booleanos sueltos (noLogo, noMercadoPago, notVerified) que
 * el menú traducía a triangulitos con su propio criterio. Ahora devuelve la lista
 * completa, ya clasificada por nivel y con el texto de qué pasa: quien dibuja
 * elige dónde mostrarla, no qué significa. La regla vive en lib/avisos-tienda.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ avisos: [] }, { status: 401 });

  const inicial = await cargarEstadoTienda(user.id);
  if (!inicial) return NextResponse.json({ avisos: [] }, { status: 404 });

  // Si acaba de completar los ocho pasos, queda marcado acá: es el momento en
  // que la barra desaparece y los triángulos toman la posta.
  const estado = await marcarOnboardingSiCorresponde(inicial);

  return NextResponse.json({ avisos: avisosDeTienda(estado) });
}
