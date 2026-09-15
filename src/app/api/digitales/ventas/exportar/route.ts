import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { puedeVer } from "@/lib/estadisticas-digitales";
import { getArgentinaDayKey } from "@/lib/fechas-comerciales";
import { contextoDeVentas, SELECT_DE_VENTA, aVentaEnPantalla } from "@/lib/ventas-digitales-db";
import { csvVentas, nombreDelArchivoDeVentas } from "@/lib/exportar-ventas";
import { NOMBRE_RANGO_VENTAS } from "@/lib/ventas-digitales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/digitales/ventas/exportar?p=&rango=&estado=&q=
 *
 * Baja la lista de ventas que se está mirando como planilla, con EXACTAMENTE
 * los mismos filtros que la pantalla: parte del mismo `contextoDeVentas`.
 *
 * Quién puede: desde Starter, la misma regla que el de Estadísticas
 * (`DESDE_QUE_PLAN.exportar`). Los números Free los ve en pantalla; lo que se
 * cobra es llevárselos.
 *
 * Con tope de filas y de ritmo: es la consulta más grande de la pantalla, y
 * un bucle sobre esto es una forma barata de hacernos trabajar.
 */
const EXPORTACIONES_POR_HORA = 30;
const TECHO_DE_EXPORTACION = 5_000;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    if (!(await checkRateLimit(`exportar-ventas:${user.id}`, EXPORTACIONES_POR_HORA, 60 * 60 * 1000))) {
      return NextResponse.json({ error: "Demasiadas exportaciones seguidas. Esperá un rato." }, { status: 429 });
    }
  } catch {
    /* Sin Redis se exporta igual: es una descarga de la propia dueña. */
  }

  const ctx = await contextoDeVentas(user.id, Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!puedeVer(ctx.tier, "exportar")) {
    return NextResponse.json({ error: "Tu plan no incluye exportar las ventas." }, { status: 403 });
  }

  const ahora = new Date();
  const filas = ctx.store
    ? await prisma.order.findMany({
        where: ctx.donde,
        orderBy: { createdAt: "desc" },
        take: TECHO_DE_EXPORTACION,
        select: SELECT_DE_VENTA,
      })
    : [];

  const producto = ctx.productos.find((p) => p.id === ctx.elegido)?.name;
  const titulo = `Tus ventas — ${NOMBRE_RANGO_VENTAS[ctx.consulta.rango.clave]}${producto ? ` — ${producto}` : ""}${ctx.consulta.estado ? ` — ${ctx.consulta.estado}` : ""}`;
  const csv = csvVentas(filas.map((o) => aVentaEnPantalla(o, ahora)), titulo, filas.length >= TECHO_DE_EXPORTACION);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreDelArchivoDeVentas(ctx.consulta.rango, getArgentinaDayKey())}"`,
      "Cache-Control": "no-store",
    },
  });
}
