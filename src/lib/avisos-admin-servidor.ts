import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CANAL_AVISOS, CONDICIONES, ROLES_AVISO, candidatosEnOrden, conNombre, esCondicion, type Audiencia, type CondicionAviso, type RolAviso } from "@/lib/avisos-admin";

const DIA = 24 * 60 * 60 * 1000;

/**
 * Qué le falta a una cuenta, dicho en la base. Una tienda y un producto digital
 * "publican" distinto: la tienda tiene `Store.isPublished`; en digitales cada
 * producto principal se publica solo (`isActive`) y la "tienda" queda siempre
 * en Próximamente.
 */
function condicionDe(condicion: CondicionAviso, rol: RolAviso): Prisma.UserWhereInput | null {
  if (!(CONDICIONES[condicion].roles as readonly string[]).includes(rol)) return null;
  switch (condicion) {
    case "SIN_MP":
      return { store: { is: { closedAt: null, mpConnectedAt: null } } };
    case "SIN_PUBLICAR":
      return rol === "DIGITAL"
        ? { store: { is: { closedAt: null, products: { none: { rolDigital: "PRINCIPAL", isActive: true, deletedAt: null } } } } }
        : { store: { is: { closedAt: null, isPublished: false } } };
    case "SIN_ARCHIVO":
      return { store: { is: { closedAt: null, products: { some: { rolDigital: { not: null }, archivoPath: null, deletedAt: null } } } } };
  }
}

/**
 * A quiénes les llega un aviso, como filtro de Prisma sobre `User`.
 *
 * ⚠️ ES LA ÚNICA DEFINICIÓN. La usan el contador del admin ("le llegaría a N
 * personas") y la ruta del panel para confirmar que a ESTA persona le toca. Con
 * dos definiciones, el número que ve el admin y lo que de verdad aparece se
 * separan de a poco, y nadie se da cuenta.
 */
export function whereDeLaAudiencia(a: Audiencia, ahora = new Date()): Prisma.UserWhereInput {
  if (a.paraUserId) return { id: a.paraUserId, banned: false };
  const nuevos = a.soloNuevosDias !== null ? { createdAt: { gt: new Date(ahora.getTime() - a.soloNuevosDias * DIA) } } : {};
  return {
    banned: false,
    OR: a.roles.map((rol) => {
      const cond = a.condicion ? condicionDe(a.condicion, rol) : {};
      /* Una condición que no aplica a este panel lo deja afuera. `validarAudiencia`
         ya no lo deja pasar; esto es por si un aviso viejo quedó así. */
      return cond === null ? { id: "__nadie__" } : { role: rol, ...nuevos, ...cond };
    }),
  };
}

/**
 * Cuántas personas lo verían HOY, y los nombres de las primeras. Con "sólo los
 * nuevos" el número crece solo: le va a llegar también a quien se registre.
 */
export async function alcanceDe(a: Audiencia) {
  const where = whereDeLaAudiencia(a);
  const [total, primeros] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, select: { name: true, email: true }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  return { total, nombres: primeros.map((u) => u.name?.trim() || u.email) };
}

/**
 * Los avisos para la pantalla del admin, con sus números: cuántos lo vieron,
 * cuántos lo cerraron, cuántos tocaron el botón, y los 👍 y 👎.
 *
 * Aparte de `avisos-admin` porque toca la base, y aquel archivo lo importa la
 * pantalla: se llevaría Prisma al navegador.
 */
export async function avisosConNumeros() {
  const [avisos, vistos, cerrados, clicks, meGusta, noMeGusta] = await Promise.all([
    prisma.avisoAdmin.findMany({ orderBy: { createdAt: "desc" }, include: { paraUser: { select: { name: true, email: true } } } }),
    prisma.avisoAdminVisto.groupBy({ by: ["avisoId"], _count: { _all: true } }),
    prisma.avisoAdminVisto.groupBy({ by: ["avisoId"], where: { cerradoAt: { not: null } }, _count: { _all: true } }),
    prisma.avisoAdminVisto.groupBy({ by: ["avisoId"], where: { clickAt: { not: null } }, _count: { _all: true } }),
    prisma.avisoAdminVisto.groupBy({ by: ["avisoId"], where: { voto: 1 }, _count: { _all: true } }),
    prisma.avisoAdminVisto.groupBy({ by: ["avisoId"], where: { voto: -1 }, _count: { _all: true } }),
  ]);
  const de = (lista: { avisoId: string; _count: { _all: number } }[]) =>
    new Map(lista.map((x) => [x.avisoId, x._count._all]));
  const v = de(vistos), c = de(cerrados), k = de(clicks), mg = de(meGusta), nmg = de(noMeGusta);
  return avisos.map((a) => ({
    ...a, vistos: v.get(a.id) ?? 0, cerrados: c.get(a.id) ?? 0, clicks: k.get(a.id) ?? 0,
    meGusta: mg.get(a.id) ?? 0, noMeGusta: nmg.get(a.id) ?? 0,
  }));
}

export type AvisoConNumeros = Awaited<ReturnType<typeof avisosConNumeros>>[number];

/**
 * Les avisa a los paneles abiertos que algo cambió: un aviso nuevo, uno
 * editado, apagado o borrado. Así aparece (o se va) sin recargar la página.
 *
 * ⚠️ Por el canal NO viaja el aviso. Es un canal público de Supabase y lo
 * escucha cualquiera con la clave pública; lo único que dice es "volvé a
 * preguntar", y cada panel le pregunta a `/api/avisos`, que sí sabe quién es y
 * qué le toca. Mandar el aviso acá sería mostrárselo a paneles a los que no va.
 *
 * Nunca hace fallar al que llama: si Supabase no contesta, el aviso igual quedó
 * guardado y aparece la próxima vez que la persona vuelva a la pestaña.
 */
export async function avisarQueCambiaron(): Promise<void> {
  try {
    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createSupabaseAdminClient();
    const canal = supabase.channel(CANAL_AVISOS);
    await canal.httpSend("cambio", {});
    await supabase.removeChannel(canal);
  } catch (e) {
    console.error("[avisos] no se pudo avisar a los paneles:", e);
  }
}

/**
 * Para un aviso a UNA persona: confirma que existe, que tiene panel, y le pone
 * su rol en `roles`. El rol sale de la base y no del navegador: si viniera de
 * afuera, un aviso para un afiliado podría quedar marcado como de tiendas y no
 * le aparecería nunca.
 */
export async function conLaPersona<A extends Audiencia>(a: A): Promise<{ ok: true; aviso: A } | { ok: false; error: string }> {
  if (!a.paraUserId) return { ok: true, aviso: a };
  const persona = await prisma.user.findUnique({ where: { id: a.paraUserId }, select: { role: true, banned: true } });
  if (!persona || persona.banned || !(ROLES_AVISO as readonly string[]).includes(persona.role)) {
    return { ok: false, error: "Esa persona no existe o no tiene panel." };
  }
  return { ok: true, aviso: { ...a, roles: [persona.role as RolAviso] } };
}

/** Cuántos avisos puede tener a la vez en el "libro" del panel. */
const MAX_EN_PANTALLA = 3;

export type AvisoParaElPanel = {
  id: string; titulo: string; texto: string; botonTexto: string | null; botonLink: string | null; tono: string; voto: number;
};

/**
 * Los avisos del admin que le tocan ver a esta cuenta ahora: hasta tres, en el
 * orden en que se muestran. Lo usan `/api/avisos` y las páginas de inicio de
 * los paneles, que lo traen junto con el resto y así el cartel aparece con el
 * panel, no un segundo después.
 *
 * El orden y a quién le toca lo decide `candidatosEnOrden`, que se prueba solo;
 * acá se busca, se confirma la condición en la base, se le pone el nombre y se
 * anota que lo vio. Ver `lib/avisos-admin`.
 */
export async function avisosParaElPanel(user: { id: string; role: string }): Promise<AvisoParaElPanel[]> {
  if (!(ROLES_AVISO as readonly string[]).includes(user.role)) return [];
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
  if (!cuenta) return [];

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
  if (elegidos.length === 0) return [];

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

  return elegidos.map((a) => ({
    voto: votos.get(a.id) ?? 0,
    id: a.id,
    titulo: conNombre(a.titulo, cuenta.name),
    texto: conNombre(a.texto, cuenta.name),
    botonTexto: a.botonTexto ? conNombre(a.botonTexto, cuenta.name) : null,
    botonLink: a.botonLink,
    tono: a.tono,
  }));
}
