import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { ROLES_AVISO, candidatosEnOrden, conNombre, esCondicion, type RolAviso } from "@/lib/avisos-admin";
import { whereDeLaAudiencia } from "@/lib/avisos-admin-servidor";

export const dynamic = "force-dynamic";

/** Cuántos avisos puede tener a la vez en el "libro" del panel. */
const MAX_EN_PANTALLA = 3;

/**
 * GET /api/avisos — los avisos del admin que le tocan ver a esta cuenta ahora.
 *
 * Hasta tres, en el orden en que se muestran. El orden y a quién le toca lo
 * decide `candidatosEnOrden`, que se prueba solo; acá se busca, se confirma la
 * condición en la base, se le pone el nombre y se anota que lo vio.
 * Ver `lib/avisos-admin`.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !(ROLES_AVISO as readonly string[]).includes(user.role)) {
    return NextResponse.json({ avisos: [] });
  }
  /* Cada panel abierto pregunta al entrar, al volver a la pestaña y cuando el
     admin cambia algo. 60 por minuto sobra para eso y frena a quien lo use de
     otra forma. Pasado el tope no es un error: no hay aviso, y listo. */
  if (!(await checkRateLimit(`avisos-get:${user.id}`, 60, 60_000))) {
    return NextResponse.json({ avisos: [] });
  }

  const ahora = new Date();
  const [cuenta, avisos, cerrados] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { createdAt: true, name: true } }),
    /* La base ya filtra lo grueso —prendido, de este panel, en fecha, y que no
       sea el aviso personal de OTRA persona— y `candidatosEnOrden` vuelve a
       mirar todo: la regla vive en un solo lugar.

       Los personales van en una consulta aparte y sin tope: con más de 20
       generales al aire, el `take` los dejaba afuera, y son justo los que
       tienen que salir primero. */
    Promise.all([
      prisma.avisoAdmin.findMany({
        where: { activo: true, paraUserId: null, roles: { has: user.role as RolAviso }, desde: { lte: ahora }, OR: [{ hasta: null }, { hasta: { gt: ahora } }] },
        orderBy: { desde: "desc" },
        take: 20,
      }),
      prisma.avisoAdmin.findMany({
        where: { activo: true, paraUserId: user.id, desde: { lte: ahora }, OR: [{ hasta: null }, { hasta: { gt: ahora } }] },
      }),
    ]).then(([generales, personales]) => [...personales, ...generales]),
    prisma.avisoAdminVisto.findMany({
      where: { userId: user.id, cerradoAt: { not: null } },
      select: { avisoId: true },
    }),
  ]);
  if (!cuenta) return NextResponse.json({ avisos: [] });

  /* Los que le tocan, en orden, y que —si piden algo de la base (una
     condición, o ser para una persona)— lo cumplan. La consulta es
     `whereDeLaAudiencia`, la MISMA que usa el contador del admin.

     Hasta `MAX_EN_PANTALLA`: el panel los muestra como un libro, uno a la vez
     con "1 de 3" y flechas. Más que eso ya no es avisar, es empapelar. */
  const candidatos = candidatosEnOrden(avisos, { id: user.id, role: user.role, createdAt: cuenta.createdAt }, new Set(cerrados.map((c) => c.avisoId)), ahora);
  const elegidos: typeof candidatos = [];
  for (const c of candidatos.slice(0, 10)) {
    if (elegidos.length >= MAX_EN_PANTALLA) break;
    if (!c.condicion && !c.paraUserId) { elegidos.push(c); continue; }
    const where = whereDeLaAudiencia({
      roles: c.roles.filter((r): r is RolAviso => (ROLES_AVISO as readonly string[]).includes(r)),
      soloNuevosDias: c.soloNuevosDias,
      condicion: esCondicion(c.condicion) ? c.condicion : null,
      paraUserId: c.paraUserId,
    }, ahora);
    if (await prisma.user.count({ where: { AND: [{ id: user.id }, where] } })) elegidos.push(c);
  }
  if (elegidos.length === 0) return NextResponse.json({ avisos: [] });

  /* "Lo vio" se anota para el PRIMERO, que es el que aparece. Los de atrás se
     anotan cuando la persona pasa la hoja (`/api/avisos/:id` con "visto"): un
     aviso que nunca miró no puede contar como visto. */
  await prisma.avisoAdminVisto.upsert({
    where: { avisoId_userId: { avisoId: elegidos[0].id, userId: user.id } },
    create: { avisoId: elegidos[0].id, userId: user.id },
    update: {},
  }).catch((e) => console.error("[avisos] no se pudo anotar el visto:", e));

  /* El voto que ya dejó en cada uno, para que la manito aparezca marcada. */
  const votos = new Map((await prisma.avisoAdminVisto.findMany({
    where: { userId: user.id, avisoId: { in: elegidos.map((a) => a.id) }, voto: { not: null } },
    select: { avisoId: true, voto: true },
  })).map((v) => [v.avisoId, v.voto]));

  return NextResponse.json({
    avisos: elegidos.map((a) => ({
      voto: votos.get(a.id) ?? 0,
      id: a.id,
      titulo: conNombre(a.titulo, cuenta.name),
      texto: conNombre(a.texto, cuenta.name),
      botonTexto: a.botonTexto ? conNombre(a.botonTexto, cuenta.name) : null,
      botonLink: a.botonLink,
      tono: a.tono,
    })),
  });
}
