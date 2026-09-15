import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { validarMedicion } from "@/lib/medicion-digital";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/digitales/productos/[id]/medicion
 *
 * La medición de UN producto: su píxel de Meta, su GA, su Clarity. Reemplazan
 * al de la cuenta campo por campo; los tres vacíos vuelven al de la cuenta.
 *
 * ⚠️ Lo que se guarda termina adentro de un <script> de una página pública:
 * pasa por las mismas reglas que Configuración (`tracking-ids`), acá y en el
 * componente que lo inyecta. Ver `validarMedicion`.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    if (!(await checkRateLimit(`medicion-producto:${user.id}`, 60, 60 * 60_000))) {
      return NextResponse.json({ error: "Demasiados intentos seguidos. Esperá un momento." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/productos/[id]/medicion");
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const r = validarMedicion(body);
  if (!r.ok) return NextResponse.json({ error: r.problema }, { status: 400 });

  /* El dueño adentro del `where`, y sólo un PRINCIPAL: un bono no tiene página
     que medir. `updateMany` para que un id ajeno no encuentre nada y no falle
     con un error que diga que existe. */
  const { count } = await prisma.product.updateMany({
    where: { id, deletedAt: null, rolDigital: "PRINCIPAL", store: { ownerId: user.id } },
    data: { medicion: r.medicion },
  });
  if (count === 0) return NextResponse.json({ error: "Ese producto no existe" }, { status: 404 });

  return NextResponse.json({ ok: true, medicion: r.medicion });
}
