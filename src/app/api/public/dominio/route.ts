import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/public/dominio?host=mitienda.com → { slug }
 *
 * Traduce el dominio propio de un comerciante al slug de su tienda. Lo llama el
 * middleware, que es quien reescribe la URL — no lo consume ninguna pantalla.
 *
 * ── Por qué existe este archivo ──────────────────────────────────────────────
 * El middleware hacía esta búsqueda pegándole directo a la API REST de Supabase
 * con la clave pública. Eso nunca funcionó: las tablas las creó Prisma, así que
 * los roles de PostgREST (anon, authenticated y también service_role) no tienen
 * permiso sobre ellas y la consulta vuelve 42501 "permission denied for table
 * Store". Como el código estaba escrito para no romper si el lookup falla,
 * tampoco avisaba: los dominios propios simplemente no resolvían nunca.
 *
 * La salida NO es abrirle permisos a PostgREST. Que la API REST no llegue a
 * ninguna tabla es de lo mejor que tiene este proyecto: aunque se filtre la
 * clave pública —y va en el bundle del navegador, así que es pública de hecho—
 * no se puede leer ni una fila. Un GRANT sobre `Store` para arreglar el rewrite
 * abriría esa puerta para todo lo demás.
 *
 * Así que la consulta se hace donde ya hay acceso legítimo a la base: acá,
 * con Prisma. El middleware corre en el edge y no puede usar Prisma, por eso
 * necesita este salto.
 *
 * Lo que devuelve es público por definición: quien pregunta ya está parado en
 * ese dominio. No expone nada que el visitante no vea con solo entrar.
 */
export async function GET(req: NextRequest) {
  const host = req.nextUrl.searchParams.get("host")?.toLowerCase().trim() ?? "";

  // Un host es un nombre de dominio y nada más. Sin esto, cualquier texto entra
  // al `where` y a la respuesta cacheada.
  if (!host || host.length > 253 || !/^[a-z0-9.-]+$/.test(host)) {
    return NextResponse.json({ slug: null }, { status: 400 });
  }

  const store = await prisma.store.findFirst({
    where: { customDomain: host },
    select: { slug: true },
  });

  return NextResponse.json(
    { slug: store?.slug ?? null },
    {
      // Un dominio propio cambia como mucho una vez en la vida de una tienda.
      // Cachear evita una consulta por visita; 5 minutos es sobra para que un
      // alta nueva se vea enseguida sin castigar a la base.
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    }
  );
}
