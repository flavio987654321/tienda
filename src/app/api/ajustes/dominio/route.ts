import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getUserSubscription, hasActivePremium } from "@/lib/subscription";
import { syncTurnstileHostname } from "@/lib/turnstile";
import { agregarDominioAVercel, dominioLibre, quitarDominioDeVercel } from "@/lib/dominio-digital";
import { normalizarDominio, validarDominio } from "@/lib/configuracion-digital";

export const maxDuration = 60;

// El captcha (Turnstile) valida el hostname: sin esto, en una tienda con dominio
// propio los formularios de contacto/reseñas/ruleta quedarían deshabilitados.
// Antes de quitar un hostname, verificar que ninguna otra tienda use el mismo apex.
async function removeTurnstileHostnameIfUnused(oldDomain: string, exceptOwnerId: string) {
  const apex = oldDomain.replace(/^www\./, "");
  const [otherStore, product] = await Promise.all([
    prisma.store.findFirst({
      where: { OR: [{ customDomain: apex }, { customDomain: { endsWith: `.${apex}` } }], NOT: { ownerId: exceptOwnerId } },
      select: { id: true },
    }),
    prisma.product.findFirst({ where: { OR: [{ dominioPropio: apex }, { dominioPropio: { endsWith: `.${apex}` } }], deletedAt: null }, select: { id: true } }),
  ]);
  if (!otherStore && !product) await syncTurnstileHostname(oldDomain, "remove");
}

async function removeVercelDomainIfUnused(domain: string) {
  try {
    await prisma.$transaction(async (tx) => {
      // Coordinar la baja con las reservas de dominios de tiendas y productos.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"dom:" + domain}))`;
      const [store, product] = await Promise.all([
        tx.store.findFirst({ where: { customDomain: domain }, select: { id: true } }),
        tx.product.findFirst({ where: { dominioPropio: domain }, select: { id: true } }),
      ]);
      if (store || product) return;
      const removed = await quitarDominioDeVercel(domain);
      if (!removed) console.error("[dominio-tienda] el dominio quedó pendiente de quitar en Vercel", domain);
    }, { timeout: 20_000 });
  } catch (error) {
    console.error("[dominio-tienda] no se pudo limpiar el dominio viejo de Vercel", { domain, error });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null) as { domain?: unknown } | null;
  if (typeof body?.domain !== "string") return NextResponse.json({ error: "Dominio inválido" }, { status: 400 });
  const problemaDominio = validarDominio(body.domain);
  if (problemaDominio) return NextResponse.json({ error: problemaDominio }, { status: 400 });
  const cleaned = normalizarDominio(body.domain);

  const previous = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, customDomain: true },
  });
  if (!previous) return NextResponse.json({ error: "No encontramos la tienda de esta cuenta." }, { status: 404 });
  const yaEstabaConectado = previous.customDomain === cleaned;

  // El alta nueva exige Premium vigente. Permitir reintentar el dominio actual
  // deja reparar una sincronización incompleta si el plan venció entretanto.
  const sub = await getUserSubscription(user.id);
  if (!hasActivePremium(sub) && !yaEstabaConectado) {
    return NextResponse.json({ error: "Esta función requiere el plan Tienda Premium" }, { status: 403 });
  }

  /* ⚠️ Las DOS tablas, no sólo `Store`. Un dominio propio también puede ser de
     un producto digital (`Product.dominioPropio`), y son dos índices únicos
     distintos: la base aceptaba el mismo dominio en las dos sin quejarse, y el
     middleware desempata a favor de la tienda. O sea que escribir acá el
     dominio de un producto ajeno le sacaba la dirección a su dueño, con el
     certificado ya emitido a nombre de él. Ver `lib/dominio-digital`.

     Y se saltea si es EL QUE YA TENÍAS: la consulta de antes tampoco excluía la
     tienda propia, así que volver a guardar el mismo dominio contestaba que ya
     estaba en uso. Con el texto viejo —"por otra tienda"— era raro; con el
     nuevo —"en otra cuenta"— sería directamente falso. */
  if (!yaEstabaConectado && !(await dominioLibre(cleaned))) {
    return NextResponse.json({ error: "Ese dominio ya está conectado en otra cuenta" }, { status: 409 });
  }

  // Reservar en la base antes de tocar Vercel o Cloudflare. El mismo candado
  // por dominio lo usa el alta de productos digitales para evitar carreras.
  if (!yaEstabaConectado) {
    try {
      const reservada = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"dom:" + cleaned}))`;
      const current = await tx.store.findUnique({ where: { ownerId: user.id }, select: { customDomain: true } });
      if (current?.customDomain !== previous.customDomain) return "cambio" as const;
      const apex = cleaned.replace(/^www\./, "");
      const [otherExactStore, exactProduct, otherStoreApex, otherProductApex] = await Promise.all([
        tx.store.findFirst({ where: { customDomain: cleaned, id: { not: previous.id } }, select: { id: true } }),
        tx.product.findFirst({ where: { dominioPropio: cleaned }, select: { id: true } }),
        tx.store.findFirst({
          where: { OR: [{ customDomain: apex }, { customDomain: { endsWith: `.${apex}` } }], NOT: { ownerId: user.id } },
          select: { id: true },
        }),
        tx.product.findFirst({
          where: {
            OR: [{ dominioPropio: apex }, { dominioPropio: { endsWith: `.${apex}` } }],
            deletedAt: null,
            NOT: { store: { ownerId: user.id } },
          },
          select: { id: true },
        }),
      ]);
      if (otherExactStore || exactProduct || otherStoreApex || otherProductApex) return "ocupado" as const;
      await tx.store.update({ where: { id: previous.id }, data: { customDomain: cleaned } });
      return "reservado" as const;
      });
      if (reservada === "cambio") return NextResponse.json({ error: "La configuración del dominio cambió en otra solicitud. Recargá e intentá de nuevo." }, { status: 409 });
      if (reservada === "ocupado") return NextResponse.json({ error: "Ese dominio o uno de sus subdominios ya está conectado en otra cuenta." }, { status: 409 });
    } catch (error) {
      console.error("[dominio-tienda] no se pudo reservar el dominio", error);
      return NextResponse.json({ error: "No pudimos reservar el dominio. Intentá de nuevo." }, { status: 500 });
    }
  }

  const rollbackReservation = async () => {
    await prisma.store.updateMany({
      where: { id: previous.id, customDomain: cleaned },
      data: { customDomain: previous.customDomain },
    }).catch((error) => console.error("[dominio-tienda] no se pudo liberar la reserva", error));
  };

  const vercelReady = await agregarDominioAVercel(cleaned);
  if (!vercelReady.ok) {
    if (!yaEstabaConectado) {
      await rollbackReservation();
      await removeTurnstileHostnameIfUnused(cleaned, user.id);
    }
    return NextResponse.json({ error: "No pudimos agregar el dominio al hosting. Revisá la configuración e intentá de nuevo." }, { status: 502 });
  }

  const turnstileReady = await syncTurnstileHostname(cleaned, "add");
  if (!turnstileReady) {
    if (!yaEstabaConectado) {
      await quitarDominioDeVercel(cleaned);
      await rollbackReservation();
      await removeTurnstileHostnameIfUnused(cleaned, user.id);
    }
    return NextResponse.json({ error: "No pudimos preparar la verificación de seguridad para este dominio. Revisá la configuración de Turnstile o contactanos." }, { status: 503 });
  }

  // Si la tienda tenía otro dominio conectado antes, liberar su hostname del widget
  if (previous?.customDomain && previous.customDomain !== cleaned) {
    await removeVercelDomainIfUnused(previous.customDomain);
    await removeTurnstileHostnameIfUnused(previous.customDomain, user.id);
  }

  return NextResponse.json({ success: true });
}

// `_req` no se usa: lo pide la firma del route handler de Next.
export async function DELETE(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const previous = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { customDomain: true },
  });

  await prisma.store.update({
    where: { ownerId: user.id },
    data: { customDomain: null },
  });

  if (previous?.customDomain) {
    await removeVercelDomainIfUnused(previous.customDomain);
    await removeTurnstileHostnameIfUnused(previous.customDomain, user.id);
  }

  return NextResponse.json({ success: true });
}
