import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { puedeVer } from "@/lib/estadisticas-digitales";
import { getArgentinaDayKey } from "@/lib/fechas-comerciales";
import { contextoDeClientes, idsDeClientes, armarClientes } from "@/lib/clientes-digitales-db";
import { csvClientes, csvParaMeta, esFormatoDeClientes, nombreDelArchivoDeClientes } from "@/lib/exportar-clientes";
import { nombreDelSegmento } from "@/lib/correos-compradores";
import { FILTROS_DE_CLIENTES } from "@/lib/clientes-digitales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/digitales/clientes/exportar?formato=planilla|meta&…filtros
 *
 * Baja la lista de clientes que se está mirando —mismos filtros que la
 * pantalla, porque parten del mismo `contextoDeClientes`— como planilla, o
 * como la lista que Meta Ads acepta para un público personalizado (excluir
 * a quien ya compró, o buscar gente parecida). Ver `lib/exportar-clientes`.
 *
 * Starter y Pro, como exportar ventas: los números se ven en Free; lo que
 * se cobra es llevárselos.
 */
const EXPORTACIONES_POR_HORA = 30;
const TECHO_DE_EXPORTACION = 5_000;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    if (!(await checkRateLimit(`exportar-clientes:${user.id}`, EXPORTACIONES_POR_HORA, 60 * 60 * 1000))) {
      return NextResponse.json({ error: "Demasiadas exportaciones seguidas. Esperá un rato." }, { status: 429 });
    }
  } catch {
    /* Sin Redis se exporta igual: es una descarga de la propia dueña. */
  }

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const formato = esFormatoDeClientes(params.formato) ? params.formato : "planilla";
  const ctx = await contextoDeClientes(user.id, params);
  if (!puedeVer(ctx.tier, "exportar")) {
    return NextResponse.json({ error: "Tu plan no incluye bajar la lista de clientes." }, { status: 403 });
  }

  const ids = ctx.store ? await idsDeClientes(ctx, 0, TECHO_DE_EXPORTACION) : [];
  const clientes = ctx.store ? await armarClientes({ ...ctx, store: ctx.store }, ids, TECHO_DE_EXPORTACION) : [];

  const nombreDe = (id: string) => ctx.productos.find((x) => x.id === id)?.name ?? null;
  const titulo = [
    "Tus clientes",
    nombreDelSegmento({ productId: ctx.p, sinProductoId: ctx.sin }, nombreDe),
    ctx.f ? FILTROS_DE_CLIENTES[ctx.f] : null,
    ctx.consulta.q ? `búsqueda: ${ctx.consulta.q}` : null,
  ].filter(Boolean).join(" — ");

  const csv = formato === "meta" ? csvParaMeta(clientes) : csvClientes(clientes, titulo, ids.length >= TECHO_DE_EXPORTACION);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreDelArchivoDeClientes(formato, getArgentinaDayKey())}"`,
      "Cache-Control": "no-store",
    },
  });
}
