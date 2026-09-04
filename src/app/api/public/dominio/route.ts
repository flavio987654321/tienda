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
/**
 * ── Y desde la Fase 5 bis contesta dos preguntas, no una ───────────────────
 *
 * `?host=` es el dominio propio, como siempre. `?sub=` es el nombre que va
 * antes del punto en `algo.tiendaapps.com`.
 *
 * El subdominio antes no preguntaba nada: el middleware lo reescribía derecho a
 * `/tienda/<lo que sea>`. Ahora ese mismo nombre puede ser **una tienda o un
 * producto digital**, y sólo la base sabe cuál.
 *
 * ⚠️ Y sólo un PRINCIPAL publicado contesta. Un bono no es una página que
 * alguien visite —se entrega con la compra— y un producto despublicado no tiene
 * que ser alcanzable por su dirección: despublicar tiene que apagar la puerta,
 * no sólo sacarlo de una lista.
 */
export async function GET(req: NextRequest) {
  const host = req.nextUrl.searchParams.get("host")?.toLowerCase().trim() ?? "";
  const sub = req.nextUrl.searchParams.get("sub")?.toLowerCase().trim() ?? "";

  /* Un subdominio: sólo una etiqueta, sin puntos. */
  if (sub) {
    if (sub.length > 63 || !/^[a-z0-9-]+$/.test(sub)) {
      return NextResponse.json({ slug: null, producto: null }, { status: 400 });
    }

    const [tienda, producto] = await Promise.all([
      prisma.store.findFirst({ where: { slug: sub }, select: { slug: true } }),
      prisma.product.findFirst({
        where: { slugDigital: sub, deletedAt: null, isActive: true, rolDigital: "PRINCIPAL" },
        select: { id: true },
      }),
    ]);

    return NextResponse.json(
      { slug: tienda?.slug ?? null, producto: producto?.id ?? null },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  }

  // Un host es un nombre de dominio y nada más. Sin esto, cualquier texto entra
  // al `where` y a la respuesta cacheada.
  if (!host || host.length > 253 || !/^[a-z0-9.-]+$/.test(host)) {
    return NextResponse.json({ slug: null, producto: null }, { status: 400 });
  }

  /* El dominio propio puede ser de una tienda (`Store.customDomain`, uno por
     cuenta) o de un producto digital (`Product.dominioPropio`, uno por
     producto, sólo en Pro). */
  const [store, producto] = await Promise.all([
    prisma.store.findFirst({ where: { customDomain: host }, select: { slug: true } }),
    prisma.product.findFirst({
      where: { dominioPropio: host, deletedAt: null, isActive: true, rolDigital: "PRINCIPAL" },
      select: { id: true },
    }),
  ]);

  return NextResponse.json(
    { slug: store?.slug ?? null, producto: producto?.id ?? null },
    {
      // Un dominio propio cambia como mucho una vez en la vida de una tienda.
      // Cachear evita una consulta por visita; 5 minutos es sobra para que un
      // alta nueva se vea enseguida sin castigar a la base.
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    }
  );
}
