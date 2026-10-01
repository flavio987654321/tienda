import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { ROLES_AVISO } from "@/lib/avisos-admin";

/**
 * POST /api/avisos/:id — la persona cerró el aviso, tocó su botón, lo vio
 * al pasar la hoja ("visto") o votó si le sirvió ("voto", con `valor`).
 *
 * Cerrado no vuelve nunca. El click se anota para que el admin sepa si el
 * aviso sirvió; no cierra el cartel solo: quien tocó "Escribinos" y vuelve al
 * panel puede querer el número otra vez.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !(ROLES_AVISO as readonly string[]).includes(user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!(await checkRateLimit(`aviso-accion:${user.id}`, 30, 60_000))) {
    return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });
  }

  const { id } = await params;
  const cuerpo = await req.json().catch(() => ({}));
  const accion = cuerpo?.accion;
  if (accion !== "cerrar" && accion !== "click" && accion !== "visto" && accion !== "voto") {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }
  /* El voto: 1 es 👍, -1 es 👎 y 0 lo saca (tocar la misma manito otra vez).
     Nada más entra: un "voto: 50" no puede inflar los números del admin. */
  const valor = cuerpo?.valor;
  if (accion === "voto" && valor !== 1 && valor !== -1 && valor !== 0) {
    return NextResponse.json({ error: "Voto inválido" }, { status: 400 });
  }
  if (typeof id !== "string" || id.length > 40) {
    return NextResponse.json({ error: "Aviso inválido" }, { status: 400 });
  }

  /* Sólo un aviso de SU panel, y si es personal, sólo el suyo: sin esto
     cualquiera podría cerrar o votar el aviso que se le escribió a otra persona
     —y ensuciarle los números— con sólo adivinar el id. */
  const aviso = await prisma.avisoAdmin.findFirst({
    where: { id, roles: { has: user.role }, OR: [{ paraUserId: null }, { paraUserId: user.id }] },
    select: { id: true },
  });
  if (!aviso) return NextResponse.json({ error: "Ese aviso no existe" }, { status: 404 });

  const ahora = new Date();
  /* "visto" es pasar la hoja del libro hasta este aviso: sólo crea la fila, y
     si ya estaba no le cambia la fecha. */
  const dato = accion === "cerrar" ? { cerradoAt: ahora }
    : accion === "click" ? { clickAt: ahora }
    : accion === "voto" ? { voto: valor === 0 ? null : (valor as number) }
    : {};
  await prisma.avisoAdminVisto.upsert({
    where: { avisoId_userId: { avisoId: id, userId: user.id } },
    create: { avisoId: id, userId: user.id, ...dato },
    update: dato,
  });
  return NextResponse.json({ ok: true });
}
