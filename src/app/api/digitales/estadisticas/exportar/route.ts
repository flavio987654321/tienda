import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { cargarEstadisticas } from "@/lib/estadisticas-digitales-db";
import { puedeVer } from "@/lib/estadisticas-digitales";
import { csvGeneral, csvCampanias, nombreDelArchivo } from "@/lib/exportar-estadisticas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/digitales/estadisticas/exportar?vista=general|campanias&p=&rango=
 *
 * Baja la solapa que se está mirando como planilla. Usa EXACTAMENTE el mismo
 * cargador que la pantalla, así el archivo dice lo mismo que se ve.
 *
 * Quién puede: la misma regla que la pantalla. General desde Starter (es la
 * exportación lo que se cobra, no los números: Free los ve en pantalla);
 * Campañas sólo Pro, porque el bloque entero es de Pro. La regla vive en
 * `DESDE_QUE_PLAN` y acá sólo se consulta.
 *
 * Con tope de ritmo: armar el archivo es la consulta entera de Estadísticas,
 * y un bucle sobre esto es una forma barata de hacernos trabajar.
 */
const EXPORTACIONES_POR_HORA = 30;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    if (!(await checkRateLimit(`exportar-estadisticas:${user.id}`, EXPORTACIONES_POR_HORA, 60 * 60 * 1000))) {
      return NextResponse.json({ error: "Demasiadas exportaciones seguidas. Esperá un rato." }, { status: 429 });
    }
  } catch {
    /* Sin Redis se exporta igual: es una descarga de la propia dueña. */
  }

  const q = req.nextUrl.searchParams;
  const vista = q.get("vista") === "campanias" ? "campanias" : "general";
  const cargadas = await cargarEstadisticas(user.id, q.get("p") ?? undefined, q.get("rango") ?? undefined);

  if (!puedeVer(cargadas.tier, "exportar") || (vista === "campanias" && !puedeVer(cargadas.tier, "campanias"))) {
    return NextResponse.json({ error: "Tu plan no incluye exportar esta pantalla." }, { status: 403 });
  }

  const producto = cargadas.principales.find((p) => p.id === cargadas.elegido)?.name;
  const titulo = `Estadísticas — ${vista === "general" ? "General" : "Campañas"}${producto ? ` — ${producto}` : " — todos los productos"}`;
  const csv = vista === "general" ? csvGeneral(cargadas.datos, titulo) : csvCampanias(cargadas.datos, titulo);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreDelArchivo(vista, cargadas.datos)}"`,
      "Cache-Control": "no-store",
    },
  });
}
