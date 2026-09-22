import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { sendCuentaDigitalCerradaEmail } from "@/lib/resend";
import { cerrarCuentaDigital, isValidClosureReason, textoDelMotivo, CLOSURE_COMMENT_MAX } from "@/lib/cierre-digital";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/digitales/cerrar — cerrar la cuenta de Productos Digitales.
 *
 * Es el par de `/api/tienda/cerrar`: las páginas salen de línea, el panel
 * queda tapado por la puerta de "reabrir", y NADA se borra. Lo que vendió
 * sigue descargable para quien lo pagó, y el plan no se toca (no se renueva
 * solo). Ver `lib/cierre-digital` por cada una de esas decisiones.
 *
 * Eliminar los datos de verdad es otra cosa y otra ruta: `/api/cuenta`
 * DELETE, la misma de todas las cuentas.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  /* Por usuario y no por IP: cerrar exige sesión. */
  try {
    if (!(await checkRateLimit(`cerrar-digital:${user.id}`, 5, 60_000))) {
      return NextResponse.json({ error: "Demasiados intentos. Esperá un momento." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/cerrar");
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { reason, comment, confirm } = body as { reason?: unknown; comment?: unknown; confirm?: unknown };

  if (!isValidClosureReason(reason)) return NextResponse.json({ error: "Elegí un motivo." }, { status: 400 });
  const comentario = typeof comment === "string" ? comment.replace(/\s+/g, " ").trim() : "";
  if (comentario.length > CLOSURE_COMMENT_MAX) {
    return NextResponse.json({ error: `El comentario va hasta ${CLOSURE_COMMENT_MAX} letras.` }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true, closedAt: true },
  });
  if (!store) return NextResponse.json({ error: "Todavía no tenés nada que cerrar." }, { status: 404 });

  /* La confirmación se valida acá y no sólo en la pantalla: la pantalla es
     comodidad, esto es lo que protege de verdad. */
  if (typeof confirm !== "string" || confirm.trim() !== store.name) {
    return NextResponse.json({ error: "El nombre no coincide con el de tu cuenta." }, { status: 400 });
  }
  if (store.closedAt) return NextResponse.json({ error: "Tu cuenta ya está cerrada." }, { status: 409 });

  /* Sin bloqueos, a propósito: una orden PENDING de digitales es un carrito
     que no pagó, no una obligación; una CONFIRMED ya se entregó y sigue
     descargable. No hay plata debida a nadie. */
  const paginas = await prisma.$transaction(async (tx) => {
    const apagadas = await cerrarCuentaDigital(tx, store.id);
    /* El mismo registro que el cierre de una tienda, para que el admin lo vea
       en /admin/cierres con el motivo. Los nombres son copias: si después
       elimina la cuenta, la relación diría "eliminada". */
    await tx.storeClosure.create({
      data: {
        storeId: store.id,
        storeName: store.name,
        ownerEmail: user.email,
        ownerName: user.name ?? null,
        reason,
        comment: comentario || null,
      },
    });
    return apagadas;
  });

  /* Después del commit, con await: es el comprobante. Si el mail falla, la
     cuenta igual quedó cerrada, y la respuesta no se rompe. */
  const mail = await sendCuentaDigitalCerradaEmail({
    to: user.email,
    userName: user.name ?? "",
    storeName: store.name,
    paginas,
    reason: textoDelMotivo(reason),
  }).catch((e: unknown) => ({ error: { message: e instanceof Error ? e.message : String(e) } }));
  if (mail.error) console.error("[digitales] mail de cierre:", mail.error.message);

  console.info("[digitales] cuenta cerrada", { storeId: store.id, paginas, reason, ip: getClientIp(req) });
  return NextResponse.json({ ok: true, paginas });
}
