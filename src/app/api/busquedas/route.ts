import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimitConRespaldo } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { cayoEnLaTrampa } from "@/lib/trampaBots";
import { despues } from "@/lib/despues";
import { validarBusqueda, resumenDeBusqueda } from "@/lib/busquedas";
import { createNotification } from "@/lib/notifications";
import { sendPushToUser } from "@/lib/push";
import { sendAvisoConcesionariaEmail } from "@/lib/email";
import { monedaDeTienda } from "@/lib/monedaVehiculo";
import { siteUrl } from "@/lib/site";
import { revisarBusquedas, busquedasDelPanel } from "@/lib/busquedasServidor";
import { verifyTurnstile } from "@/lib/turnstile";

/* POST /api/busquedas — "Avisame si entra", desde la tienda, sin sesión.
   Mismo molde que /api/tasaciones. Ver `lib/busquedas`. */

/** Más que esto activas en una tienda es abuso, no clientes. */
const TOPE_ACTIVAS = 2000;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { permitido } = await checkRateLimitConRespaldo(`busqueda:${ip}`, 5, 60 * 60_000, { limiteFallback: 5, limiteFallbackGlobal: 100 });
  if (!permitido) return NextResponse.json({ error: "Dejaste varias búsquedas seguidas. Esperá un rato." }, { status: 429 });

  try {
    const body = await req.json().catch(() => null);
    // Un bot que llenó el campo invisible: "listo" como si nada, sin guardar ni avisar (lib/trampaBots).
    if (cayoEnLaTrampa(body)) return NextResponse.json({ ok: true });
    const storeId = typeof body?.storeId === "string" ? body.storeId : "";
    if (!storeId) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, ownerId: true, storeConfig: true, tipoTienda: true, isActive: true, isPublished: true, closedAt: true, owner: { select: { banned: true, email: true } } },
    });
    if (!store || store.tipoTienda !== "AUTOS" || !store.isActive || !store.isPublished || store.closedAt || store.owner?.banned) {
      return NextResponse.json({ error: "Esta tienda no está disponible" }, { status: 404 });
    }
    const porTienda = await checkRateLimitConRespaldo(`busqueda-tienda:${store.id}`, 100, 60 * 60_000, { limiteFallback: 100, limiteFallbackGlobal: 1000 });
    if (!porTienda.permitido) return NextResponse.json({ error: "Probá en un rato o escribile a la concesionaria por WhatsApp." }, { status: 429 });

    const v = validarBusqueda(body);
    if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });
    const d = v.datos;

    /* La misma persona dejando la misma búsqueda dos veces (tocó dos veces,
       volvió otro día) es UNA búsqueda: se devuelve la que ya estaba. */
    const repetida = await prisma.busquedaGuardada.findFirst({
      where: { storeId: store.id, status: "ACTIVA", telefono: d.telefono, categoria: d.categoria, marca: d.marca, modelo: d.modelo, anioDesde: d.anioDesde, precioHasta: d.precioHasta },
      select: { id: true },
    });
    if (repetida) return NextResponse.json({ id: repetida.id }, { status: 200 });

    if (!(await verifyTurnstile(body.turnstileToken, ip, "busqueda-auto"))) {
      return NextResponse.json({ error: "No pudimos verificar el envío. Completá la verificación e intentá de nuevo." }, { status: 400 });
    }

    if ((await prisma.busquedaGuardada.count({ where: { storeId: store.id, status: "ACTIVA" } })) >= TOPE_ACTIVAS) {
      return NextResponse.json({ error: "Probá en un rato o escribile a la concesionaria por WhatsApp." }, { status: 429 });
    }

    const b = await prisma.busquedaGuardada.create({ data: { storeId: store.id, ...d } });
    /* La dueña se entera de la búsqueda en el momento (08/10/26): es un cliente
       esperando algo puntual. Antes sólo sabía cuando entraba algo que coincidía. */
    const que = resumenDeBusqueda(d, monedaDeTienda(store.storeConfig)) || "un vehículo";
    const aviso = { title: "Nueva búsqueda", body: `${d.nombre.split(/\s+/)[0]} busca ${que}. Te avisamos si entra algo así.` };
    despues(() => createNotification({ userId: store.ownerId, type: "NEW_BUSQUEDA", ...aviso, link: "/dashboard/busquedas" }), "búsqueda: campanita a la dueña");
    despues(() => sendPushToUser(store.ownerId, { ...aviso, url: "/dashboard/busquedas", tag: `busqueda-${b.id}` }, "alta"), "búsqueda: push a la dueña");
    const email = store.owner?.email;
    if (email) despues(() => sendAvisoConcesionariaEmail(email, {
      tienda: store.name, titulo: "Nueva búsqueda", resumen: `${d.nombre} busca ${que}.`,
      filas: [["Busca", que], ["Comentario", d.comentario], ["Nombre", d.nombre], ["Teléfono", d.telefono]],
      nombre: d.nombre, telefono: d.telefono,
      saludo: `Hola ${d.nombre.split(/\s+/)[0]}, te escribo de ${store.name} por la búsqueda que dejaste (${que}).`,
      panel: siteUrl("/dashboard/busquedas"), panelTexto: "Ver en Búsquedas",
    }), "búsqueda: correo a la dueña");
    /* Si YA hay algo que coincide (reservado, o algo que no vio), la dueña se
       entera ahora: es un interesado concreto por una unidad que tiene. */
    despues(() => revisarBusquedas(store.id), "búsqueda nueva: revisar coincidencias");
    return NextResponse.json({ id: b.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo guardar. Probá de nuevo." }, { status: 500 });
  }
}

// GET /api/busquedas — la dueña ve las suyas con lo que hoy coincide.
// ?count=1 → cuántas coincidencias esperan que le avise al comprador (el número del menú).
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
  const datos = await busquedasDelPanel(store.id);
  if (new URL(req.url).searchParams.get("count") === "1") {
    const count = datos.busquedas.reduce((n, b) => n + b.coincidencias.filter((c) => !c.avisado).length, 0);
    return NextResponse.json({ count });
  }
  return NextResponse.json(datos);
}
