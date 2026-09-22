import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { getUserSubscription, isSubscriptionActive } from "@/lib/subscription";
import { dominioDeLaPlataforma } from "@/lib/configuracion-digital";
import { direccionBase } from "@/lib/enlaces-compartir";
import { validarCorreoNuevo, enlaceDelBoton, MAX_CORREOS_POR_DIA } from "@/lib/correos-compradores";
import { cuantosDe, enviarCorreo } from "@/lib/correos-compradores-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/digitales/correos — mandar un mail a los compradores.
 *
 * Crea el registro y sale a mandar en el mismo pedido; si no alcanza el
 * tiempo, contesta con `falta: true` y la pantalla ofrece seguir. Sólo Pro
 * AL DÍA (no sólo "plan Pro": con la tarjeta rebotada no se manda nada), con
 * tope de envíos por día, y el producto —el del público y el del botón—
 * tiene que ser un principal de ESTA cuenta.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    if (!(await checkRateLimit(`correos:${user.id}`, 20, 60 * 60_000))) {
      return NextResponse.json({ error: "Demasiados intentos seguidos. Esperá un momento." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/correos");
  }

  const r = validarCorreoNuevo(await req.json().catch(() => null));
  if (!r.ok) return NextResponse.json({ error: r.problema }, { status: 400 });

  const [store, sub] = await Promise.all([
    prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } }),
    getUserSubscription(user.id),
  ]);
  if (!store) return NextResponse.json({ error: "Primero cargá un producto." }, { status: 409 });
  if (sub?.tier !== "PRO" || !isSubscriptionActive(sub)) {
    return NextResponse.json({ error: "Escribirle a tus compradores es del plan Pro." }, { status: 403 });
  }

  const hace24h = new Date(Date.now() - 24 * 60 * 60_000);
  const hoy = await prisma.correoDigital.count({ where: { storeId: store.id, createdAt: { gte: hace24h } } });
  if (hoy >= MAX_CORREOS_POR_DIA) {
    return NextResponse.json({ error: `Ya mandaste ${MAX_CORREOS_POR_DIA} mails en las últimas 24 horas. Mañana podés mandar otro.` }, { status: 429 });
  }

  /* Los dos productos, si vienen, propios y principales. Un id ajeno no
     manda nada: ni le escribe a compradores de otra, ni enlaza a otra. */
  const ids = [r.datos.productId, r.datos.sinProductoId, r.datos.enlaceProductId].filter((x): x is string => !!x);
  const propios = ids.length
    ? await prisma.product.findMany({
        where: { id: { in: ids }, deletedAt: null, rolDigital: "PRINCIPAL", storeId: store.id },
        select: { id: true, name: true, slugDigital: true, dominioPropio: true },
        take: 3,
      })
    : [];
  const publico = r.datos.productId ? propios.find((p) => p.id === r.datos.productId) : null;
  const excluido = r.datos.sinProductoId ? propios.find((p) => p.id === r.datos.sinProductoId) : null;
  const enlazado = r.datos.enlaceProductId ? propios.find((p) => p.id === r.datos.enlaceProductId) : null;
  if ((r.datos.productId && !publico) || (r.datos.sinProductoId && !excluido) || (r.datos.enlaceProductId && !enlazado)) {
    return NextResponse.json({ error: "Ese producto no existe." }, { status: 404 });
  }

  /* Se cuenta con la misma función que la pantalla: el número que confirmó
     es el número que se guarda. */
  const segmento = { productId: publico?.id ?? null, sinProductoId: excluido?.id ?? null };
  const cuantos = await cuantosDe(store.id, segmento);
  if (cuantos === 0) return NextResponse.json({ error: "Todavía no hay a quién mandarle." }, { status: 409 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.tiendaapps.com";
  const creado = await prisma.correoDigital.create({
    data: {
      storeId: store.id,
      productId: publico?.id ?? null,
      sinProductoId: excluido?.id ?? null,
      asunto: r.datos.asunto,
      cuerpo: r.datos.cuerpo,
      enlace: enlazado ? enlaceDelBoton(direccionBase(enlazado, dominioDeLaPlataforma(), appUrl), r.datos.asunto) : null,
      botonTexto: enlazado ? `Ver ${enlazado.name}`.slice(0, 80) : null,
      destinatarios: cuantos,
    },
    select: { id: true },
  });

  const resultado = await enviarCorreo(creado.id);
  return NextResponse.json({ ok: true, id: creado.id, ...resultado });
}
