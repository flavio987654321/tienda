import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { getArgentinaDayKey } from "@/lib/fechas-comerciales";
import { clasificarOrigen } from "@/lib/origen-visita";
import { visitaLegitima } from "@/lib/visita-legitima";
import { esPasoDigital, MAX_VISITAS_POR_IP, type Dispositivo } from "@/lib/visitas-digitales";

export const runtime = "nodejs";

/**
 * POST /api/digitales/visita/[id] con `{ paso, referente?, utmSource? }`.
 *
 * Registra una visita a la página de venta de un producto digital ("pagina")
 * o la apertura de su checkout ("pagar"). Fire-and-forget desde el navegador;
 * el dedup de una vez por día por persona lo hace el cliente con localStorage
 * (ver `lib/visitas-digitales`), y acá se filtra lo que el cliente no puede.
 *
 * Es `/api/store-views` y `/api/store-funnel` en una sola ruta, colgada del
 * producto: en este ecosistema cada principal es su propio sitio.
 */

/**
 * ¿La visita es de la propia dueña?
 *
 * Se mira acá y no en la página pública: averiguar quién mira es una consulta a
 * Supabase, y la página se dibuja para cada visitante mientras que esto llega
 * una vez por día por navegador. Y antes de preguntar se mira si hay alguna
 * cookie de sesión: quien compra no tiene cuenta, así que casi nunca la hay, y
 * sin cookie no hay a quién preguntarle.
 */
async function esLaDuena(req: NextRequest, ownerId: string): Promise<boolean> {
  const conSesion = req.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  if (!conSesion) return false;
  const user = await getCurrentUser();
  return user?.id === ownerId;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!(await visitaLegitima(req, `digital-visita:${id}`, MAX_VISITAS_POR_IP))) {
    return NextResponse.json({ ok: true, contada: false });
  }

  /* El paso se valida contra la lista cerrada ANTES de tocar la base: es parte
     de la clave de la tabla, y un `paso` libre dejaría que cualquiera con la
     consola abierta invente escalones que después salen por pantalla. */
  const cuerpo = await req.json().catch(() => null);
  const paso = cuerpo?.paso;
  if (!esPasoDigital(paso)) return NextResponse.json({ ok: false }, { status: 400 });

  /* Sólo un principal publicado. Un borrador lo ve sólo su dueña, y ésa no
     cuenta; un bono no tiene página. */
  const producto = await prisma.product.findFirst({
    where: { id, deletedAt: null, isActive: true, rolDigital: "PRINCIPAL" },
    select: { id: true, store: { select: { ownerId: true } } },
  });
  if (!producto) return NextResponse.json({ ok: false }, { status: 404 });

  if (await esLaDuena(req, producto.store.ownerId)) {
    return NextResponse.json({ ok: true, contada: false });
  }

  /* Día del calendario argentino, el mismo en los dos pasos y en las ventas.
     Con días UTC los extremos del embudo caerían en días distintos entre las
     21:00 y la medianoche, que son las horas de más venta. */
  const date = getArgentinaDayKey();

  /* `=== true` y no un truthy: viene de un navegador que cualquiera puede
     editar. Del cliente se acepta el hecho crudo; la etiqueta es de acá. */
  const dispositivo: Dispositivo = cuerpo?.movil === true ? "movil" : "escritorio";

  /* El try no es decorativo: entre que esto se deploya y que corre la
     migración, la tabla no existe. Es una métrica —el cliente no lee la
     respuesta— y un 500 acá sólo esconde en los logs los errores que sí hay
     que mirar. */
  try {
    await prisma.digitalVisita.upsert({
      where: { productId_date_paso_dispositivo: { productId: producto.id, date, paso, dispositivo } },
      update: { count: { increment: 1 } },
      create: { productId: producto.id, date, paso, dispositivo, count: 1 },
    });
  } catch {
    return NextResponse.json({ ok: true, contada: false });
  }

  /* De dónde vino, sólo al entrar a la página. Va DESPUÉS del total y en su
     propio try: el total es el número que no se puede perder; si esto falla,
     la visita ya quedó contada y sólo no se sabe de dónde vino. La etiqueta la
     decide el servidor con la lista cerrada de `origen-visita`: del navegador
     se acepta el hecho crudo, nunca la clasificación. */
  if (paso === "pagina") {
    try {
      const referente = typeof cuerpo?.referente === "string" ? cuerpo.referente : null;
      const utmSource = typeof cuerpo?.utmSource === "string" ? cuerpo.utmSource : null;
      const source = clasificarOrigen(referente, utmSource, req.headers.get("host"), false);
      await prisma.digitalVisitaOrigen.upsert({
        where: { productId_date_source: { productId: producto.id, date, source } },
        update: { count: { increment: 1 } },
        create: { productId: producto.id, date, source, count: 1 },
      });
    } catch {
      /* Contada sin origen. */
    }
  }

  return NextResponse.json({ ok: true, contada: true });
}
