import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimitConRespaldo } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { createNotification } from "@/lib/notifications";
import { sendPushToUser } from "@/lib/push";
import { despues } from "@/lib/despues";
import { sendAvisoConcesionariaEmail } from "@/lib/email";
import { siteUrl } from "@/lib/site";
import { validarTasacion, resumenDelUsado, esEstadoTasacion } from "@/lib/tasaciones";
import { tasacionesDelPanel } from "@/lib/tasacionesPanel";

/* POST /api/tasaciones — un pedido de tasación desde la tienda, sin sesión.
   Mismo molde que /api/leads: techo por IP y por tienda, sólo tiendas de autos
   activas y publicadas, y aviso a la dueña. Ver `lib/tasaciones`. */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  /* Cinco por hora por IP: una persona tasa uno o dos autos, no veinte. */
  const { permitido } = await checkRateLimitConRespaldo(`tasacion:${ip}`, 5, 60 * 60_000, {
    limiteFallback: 5,
    limiteFallbackGlobal: 100,
  });
  if (!permitido) {
    return NextResponse.json({ error: "Mandaste varias tasaciones seguidas. Esperá un rato o escribile a la concesionaria por WhatsApp." }, { status: 429 });
  }

  try {
    const body = await req.json().catch(() => null);
    const storeId = typeof body?.storeId === "string" ? body.storeId : "";
    if (!storeId) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, ownerId: true, tipoTienda: true, isActive: true, isPublished: true, closedAt: true, owner: { select: { banned: true, email: true } } },
    });
    if (!store || store.tipoTienda !== "AUTOS" || !store.isActive || !store.isPublished || store.closedAt || store.owner?.banned) {
      return NextResponse.json({ error: "Esta tienda no está disponible" }, { status: 404 });
    }

    const porTienda = await checkRateLimitConRespaldo(`tasacion-tienda:${store.id}`, 60, 60 * 60_000, {
      limiteFallback: 60,
      limiteFallbackGlobal: 600,
    });
    if (!porTienda.permitido) {
      return NextResponse.json({ error: "La concesionaria está recibiendo muchas tasaciones. Probá en un rato o escribile por WhatsApp." }, { status: 429 });
    }

    const v = validarTasacion(body);
    if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });

    /* El vehículo de interés sale de la BASE: el nombre que se guarda es el
       real, y si no es de esta tienda o ya no está a la venta, se ignora (la
       tasación vale igual, sólo que sin "por cuál"). */
    let producto: { id: string; name: string } | null = null;
    if (typeof body.productoId === "string" && body.productoId) {
      producto = await prisma.product.findFirst({
        where: { id: body.productoId, storeId: store.id, deletedAt: null, isActive: true },
        select: { id: true, name: true },
      });
    }

    const t = await prisma.tasacion.create({
      data: { storeId: store.id, ...v.datos, productoId: producto?.id ?? null, productoNombre: producto?.name ?? null },
    });

    const aviso = {
      title: "Nueva tasación",
      body: `${v.datos.nombre.split(/\s+/)[0]} quiere ${v.datos.modalidad === "PERMUTA" ? "entregar" : "vender"} su ${resumenDelUsado(v.datos)}.`,
    };
    despues(() => createNotification({ userId: store.ownerId, type: "NEW_TASACION", ...aviso, link: "/dashboard/tasaciones" }), "tasación: campanita a la dueña");
    despues(() => sendPushToUser(store.ownerId, { ...aviso, url: "/dashboard/tasaciones", tag: `tasacion-${t.id}` }, "alta"), "tasación: push a la dueña");
    /* Y por correo (08/10/26), con todo lo que cargó, para pasarle un número sin entrar al panel. */
    const email = store.owner?.email;
    const d = v.datos;
    if (email) despues(() => sendAvisoConcesionariaEmail(email, {
      tienda: store.name, titulo: "Nueva tasación", resumen: aviso.body,
      filas: [
        ["Quiere", d.modalidad === "PERMUTA" ? "Entregarlo en parte de pago" : "Venderlo"],
        ["Su vehículo", resumenDelUsado(d)],
        ["Estado", d.estado], ["Combustible", d.combustible], ["Caja", d.transmision],
        ["Le interesa", producto?.name], ["Comentario", d.comentario],
        ["Nombre", d.nombre], ["Teléfono", d.telefono],
      ],
      nombre: d.nombre, telefono: d.telefono,
      saludo: `Hola ${d.nombre.split(/\s+/)[0]}, te escribo de ${store.name} por la tasación de tu ${d.marca} ${d.modelo} ${d.anio}.`,
      panel: siteUrl("/dashboard/tasaciones"), panelTexto: "Ver en Tasaciones",
    }), "tasación: correo a la dueña");

    return NextResponse.json({ id: t.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo enviar. Probá de nuevo." }, { status: 500 });
  }
}

// GET /api/tasaciones — la dueña ve las suyas ("Ver más" y filtros del panel)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const url = new URL(req.url);
  const pedido = url.searchParams.get("status");
  const status = esEstadoTasacion(pedido) ? pedido : undefined;
  if (url.searchParams.get("count") === "1") {
    const count = await prisma.tasacion.count({ where: { storeId: store.id, ...(status ? { status } : {}) } });
    return NextResponse.json({ count });
  }
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1") || 1);
  const { tasaciones, total, paginas } = await tasacionesDelPanel(store.id, { status, page });
  return NextResponse.json({ tasaciones, total, page, pages: paginas });
}
