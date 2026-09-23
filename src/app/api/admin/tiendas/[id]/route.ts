import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-log";
import { getClientIp } from "@/lib/request-ip";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentUser();
  if (!current || current.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, boolean> = {};
  if (body.isPublished !== undefined) data.isPublished = Boolean(body.isPublished);
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

  /* ══════════════════════════════════════════════════════════════════════
     ⚠️ PUBLICAR LA "TIENDA" DE UNA CUENTA DIGITAL LE APAGA TODAS LAS VENTAS
     ══════════════════════════════════════════════════════════════════════

     Las cuentas de Productos Digitales tienen una fila en `Store` —ahí viven
     sus productos— pero no son una tienda, y sus páginas públicas lo exigen
     explícitamente: `/p/[id]`, `/pagar`, `/gracias` y `/legales` hacen
     `if (fila.store.isPublished) notFound()`.

     O sea que prender ese interruptor desde el listado de tiendas deja la
     página de venta, el checkout y la pantalla de gracias devolviendo 404. Al
     mismo tiempo. Sin ningún error acá, sin nada en pantalla, y la dueña se
     entera porque dejan de entrarle ventas.

     Apagarlo sí se deja: es el estado que esas cuentas necesitan, así que si
     alguna quedó mal, este botón la arregla. */
  const duena = await prisma.store.findUnique({
    where: { id },
    select: { owner: { select: { role: true } } },
  });
  if (!duena) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  if (duena.owner?.role === "DIGITAL" && data.isPublished === true) {
    return NextResponse.json(
      { error: "Es una cuenta de Productos Digitales, no una tienda. Publicarla le devolvería 404 en su página de venta, su checkout y su pantalla de gracias. Sus páginas se publican una por una desde su panel." },
      { status: 400 }
    );
  }

  const store = await prisma.store.update({
    where: { id },
    data,
    select: { id: true, isPublished: true, isActive: true },
  });

  const action = data.isPublished !== undefined
    ? (data.isPublished ? "PUBLISH_STORE" : "UNPUBLISH_STORE")
    : (data.isActive ? "ACTIVATE_STORE" : "DEACTIVATE_STORE");

  await logAdminAction({
    adminId: current.id,
    adminEmail: current.email,
    action,
    targetId: id,
    targetType: "STORE",
    details: data as Record<string, unknown>,
    ip: getClientIp(req),
  });

  return NextResponse.json(store);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentUser();
  if (!current || current.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  const store = await prisma.store.findUnique({
    where: { id },
    select: { id: true, slug: true, name: true, owner: { select: { role: true } } },
  });

  if (!store) {
    return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
  }

  /* ⚠️ Una cuenta digital no tiene diseño de tienda que resetear, pero SÍ
     guarda cosas suyas en `storeConfig`: ahí viven sus píxeles de medición
     (ver `medicionDelProducto`, que los lee en la página de venta, en el
     checkout y en la de gracias). Vaciarlo le apaga el seguimiento de sus
     anuncios en silencio — deja de medir y nadie se entera hasta que alguien
     mira por qué no hay datos. */
  if (store.owner?.role === "DIGITAL") {
    return NextResponse.json(
      { error: "Es una cuenta de Productos Digitales: no tiene diseño de tienda, y vaciarle la configuración le apagaría los píxeles de medición." },
      { status: 400 }
    );
  }

  await prisma.store.update({
    where: { id },
    data: { storeConfig: "{}", pageBlocks: "[]" },
  });

  await logAdminAction({
    adminId: current.id,
    adminEmail: current.email,
    action: "RESET_STORE_DESIGN",
    targetId: id,
    targetType: "STORE",
    details: { storeName: store.name, slug: store.slug },
    ip: getClientIp(req),
  });

  return NextResponse.json({ ok: true });
}
