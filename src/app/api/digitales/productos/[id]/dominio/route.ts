import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { validarDominio } from "@/lib/configuracion-digital";
import { conectarDominio, desconectarDominio, estadoDelDominio } from "@/lib/dominio-digital";
import { getUserSubscription, isSubscriptionActive } from "@/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * El dominio propio de un producto: conectarlo, mirar cómo va y soltarlo.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CONECTAR PIDE PRO AL DÍA. SOLTAR NO PIDE NADA.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Un candado que también traba la salida no protege: deja a alguien con un
 * dominio pegado a una cuenta que ya no usa, y ese dominio es SUYO — lo compró y
 * lo paga él. Soltarlo tiene que poder hacerlo siempre.
 *
 * ── Y el que ya está conectado no se apaga solo ────────────────────────────
 *
 * Si el plan se vence, el dominio sigue resolviendo. Es una decisión tomada, no
 * un olvido: apagarle el dominio a alguien es sacarle del aire la página contra
 * la que está pautando, y una tarjeta que rebotó un día no puede costar eso. Lo
 * que el plan vencido bloquea es conectar uno NUEVO o cambiar el que hay.
 *
 * ⚠️ Queda pendiente y anotado en el plan: liberar los dominios de las cuentas
 * que se dieron de baja hace mucho. Hoy quedan tomados, y cada uno ocupa un
 * lugar del techo de Vercel.
 */

/** El producto es tuyo, es principal y no está borrado. */
async function elProducto(id: string, userId: string) {
  return prisma.product.findFirst({
    where: { id, deletedAt: null, rolDigital: "PRINCIPAL", store: { ownerId: userId } },
    select: { id: true, name: true, slugDigital: true, dominioPropio: true, isActive: true },
  });
}

/** `null` si puede tocar el dominio; el motivo si no. */
async function elPlanDeja(userId: string): Promise<string | null> {
  const sub = await getUserSubscription(userId);
  if (!sub || sub.role !== "DIGITAL") return "Tu cuenta no es de Productos Digitales.";
  if (sub.tier !== "PRO") {
    return "Conectar tu propio dominio viene con el plan Pro. Tu dirección de tiendaapps.com sigue funcionando igual.";
  }
  /* Con el plan AL DÍA, no sólo con el plan. Sin esto, una suscripción Pro
     vencida seguía pudiendo conectar dominios nuevos — el mismo agujero que ya
     se había tapado del lado de tiendas. */
  if (!isSubscriptionActive(sub)) {
    return "Tu plan Pro está vencido. Poné el pago al día y volvés a conectar dominios.";
  }
  return null;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  /* ⚠️ El GET también lleva freno, y no por abuso: cada llamada le pega DOS
     veces a la API de Vercel, que tiene su propio tope por equipo. Sólo puede
     hacerlo el dueño de ese producto, así que no es una puerta abierta — pero
     una pantalla que reintente sola quema cuota de todos. 60 por hora deja
     mirar cuanto quiera mientras espera el DNS. */
  try {
    if (!(await checkRateLimit(`dominio-digital-mirar:${user.id}`, 60, 60 * 60_000))) {
      return NextResponse.json({ error: "Esperá un momento antes de volver a mirar." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/productos/[id]/dominio (GET)");
  }

  const { id } = await ctx.params;
  const producto = await elProducto(id, user.id);
  if (!producto) return NextResponse.json({ error: "Ese producto no existe" }, { status: 404 });

  if (!producto.dominioPropio) {
    return NextResponse.json({ dominio: null, andando: false, instruccion: null, verificacion: null, pudimosMirar: true });
  }

  const estado = await estadoDelDominio(producto.dominioPropio);
  return NextResponse.json({ dominio: producto.dominioPropio, ...estado });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  /* ⚠️ El freno va ANTES de todo lo demás: cada alta le pega a la API de Vercel,
     que tiene su propio tope de 100 por hora POR EQUIPO. O sea que uno solo
     martillando el botón deja sin altas a todos los demás. 10 por hora alcanza
     de sobra para el que se equivoca escribiendo. */
  try {
    if (!(await checkRateLimit(`dominio-digital:${user.id}`, 10, 60 * 60_000))) {
      return NextResponse.json(
        { error: "Probaste muchas veces seguidas. Esperá un rato y volvé a intentar." },
        { status: 429 },
      );
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/productos/[id]/dominio");
  }

  const noDeja = await elPlanDeja(user.id);
  if (noDeja) return NextResponse.json({ error: noDeja }, { status: 403 });

  const { id } = await ctx.params;
  const producto = await elProducto(id, user.id);
  if (!producto) return NextResponse.json({ error: "Ese producto no existe" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const pedido = typeof body?.dominio === "string" ? body.dominio : "";

  /* Se valida acá también, además de adentro de `conectarDominio`: así el
     mensaje de "está mal escrito" no gasta una consulta a la base. */
  const problema = validarDominio(pedido);
  if (problema) return NextResponse.json({ error: problema }, { status: 400 });

  const resultado = await conectarDominio(producto.id, pedido);
  if (!resultado.ok) return NextResponse.json({ error: resultado.motivo }, { status: 409 });

  /* Se contesta con las instrucciones ya puestas: el paso siguiente es cargar el
     registro en el proveedor, y hacérselo pedir de nuevo es una pantalla vacía
     en el medio. Si Vercel no contesta, van los valores de respaldo. */
  const estado = await estadoDelDominio(resultado.dominio);
  return NextResponse.json({ ok: true, dominio: resultado.dominio, ...estado });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    if (!(await checkRateLimit(`dominio-digital-baja:${user.id}`, 20, 60 * 60_000))) {
      return NextResponse.json({ error: "Probaste muchas veces seguidas. Esperá un rato." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/productos/[id]/dominio (DELETE)");
  }

  const { id } = await ctx.params;
  const producto = await elProducto(id, user.id);
  if (!producto) return NextResponse.json({ error: "Ese producto no existe" }, { status: 404 });

  /* ⚠️ Sin pedir plan: ver el comentario de arriba. El dominio es de la persona
     y tiene que poder llevárselo cuando quiera. */
  await desconectarDominio(producto.id);

  return NextResponse.json({ ok: true, dominio: null });
}
