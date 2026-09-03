import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export const runtime = "nodejs";

const ID_RE = /^(c[a-z0-9]{20,30}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/**
 * En qué anda una compra, para la pantalla de gracias.
 *
 * ── Por qué hace falta preguntar ────────────────────────────────────────────
 *
 * La preferencia va con `auto_return: "approved"`, así que Mercado Pago devuelve
 * a la persona a la pantalla de gracias **apenas aprueba** — y el aviso de pago
 * que emite los permisos llega por otro camino, unos segundos después. O sea que
 * la pantalla carga casi siempre con la compra todavía en PENDING.
 *
 * Sin esto, quien acaba de pagar ve "estamos confirmando" y tiene que recargar a
 * mano para enterarse de que ya está. Con esto, los botones de descarga aparecen
 * solos.
 *
 * ── Qué autoriza ────────────────────────────────────────────────────────────
 *
 * El identificador de la orden, que es lo único que tiene quien vuelve de pagar.
 * Es un cuid: no se adivina ni se enumera. Igual va con límite por IP, y **no
 * devuelve nada de la persona** —ni su correo, ni su nombre—: sólo el estado y
 * los enlaces de lo que compró.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ orden: string }> },
) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`digital-estado:${ip}`, 60, 60_000))) {
    return NextResponse.json({ error: "Demasiadas consultas." }, { status: 429 });
  }

  const { orden } = await ctx.params;
  if (typeof orden !== "string" || !ID_RE.test(orden)) {
    return NextResponse.json({ estado: "desconocido" }, { status: 404 });
  }

  const fila = await prisma.order.findUnique({
    where: { id: orden },
    select: {
      status: true,
      store: { select: { owner: { select: { role: true } } } },
      items: {
        select: {
          product: { select: { name: true, archivoNombre: true, rolDigital: true } },
          descargas: { select: { token: true, descargas: true, maxDescargas: true, expiresAt: true } },
        },
      },
    },
  });

  /* Una orden que no es digital no se contesta por acá, ni para decir que
     existe: esta ruta es pública y la de tiendas tiene su propio camino. */
  if (!fila || fila.store.owner.role !== "DIGITAL") {
    return NextResponse.json({ estado: "desconocido" }, { status: 404 });
  }

  if (fila.status === "CANCELLED") return NextResponse.json({ estado: "cancelado" });
  if (fila.status !== "CONFIRMED") return NextResponse.json({ estado: "esperando" });

  /* Los permisos nacen con la confirmación, así que a esta altura ya están. Si
     todavía no, se contesta "esperando" y la pantalla sigue preguntando: es
     preferible a mostrar una lista vacía debajo de un "listo". */
  /* `descargas` viene como lista porque así lo declara el esquema, pero
     `orderItemId` es único: trae uno solo o ninguno. */
  const archivos = fila.items
    .map((i) => ({ item: i, permiso: i.descargas[0] }))
    .filter((x) => !!x.permiso)
    .map(({ item, permiso }) => ({
      nombre: item.product.archivoNombre ?? item.product.name,
      producto: item.product.name,
      esBono: item.product.rolDigital === "BONO",
      token: permiso.token,
      usadas: permiso.descargas,
      tope: permiso.maxDescargas,
      vence: permiso.expiresAt.toISOString(),
    }));

  if (archivos.length === 0) return NextResponse.json({ estado: "esperando" });

  return NextResponse.json({ estado: "listo", archivos });
}
