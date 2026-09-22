import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MAX_PRODUCTOS_DIGITALES_CREADOS } from "@/lib/planLimits";
import { getUserSubscription } from "@/lib/subscription";
import type { TierDigital } from "@/lib/planes-digitales";
import { leerConsultaDeClientes, armarCliente, TECHO_DE_CLIENTES, type ConsultaDeClientes, type FiltroDeClientes, type ClienteEnPantalla } from "@/lib/clientes-digitales";
import { tokenParaOpinar } from "@/lib/opinion-firma";
import { urlParaOpinar, type EstadoDeOpinion } from "@/lib/opiniones-digitales";
import { baseDeLosMails } from "@/lib/correos-compradores-db";

/**
 * Lo de Tus clientes que toca la base y comparten la pantalla y la
 * exportación: quién mira, qué plan tiene, sus productos, y el `where` ya
 * armado con los filtros verificados. Las dos parten de acá, así la lista
 * que se baja es exactamente la que se ve. Mismo molde que
 * `ventas-digitales-db`.
 *
 * Importa Prisma: **no lo puede importar ningún componente de navegador.**
 */

export type ContextoDeClientes = {
  tier: TierDigital;
  consulta: ConsultaDeClientes;
  store: { id: string } | null;
  productos: { id: string; name: string }[];
  /** Los filtros de la dirección, ya verificados contra los productos propios. */
  p: string | null;
  sin: string | null;
  f: FiltroDeClientes | null;
  /** Lo pagado alguna vez: cobradas y devueltas. */
  pagadas: Prisma.OrderWhereInput;
  /** Lo pagado, por las personas que pasan la búsqueda y los filtros. */
  buscadas: Prisma.OrderWhereInput;
  /** Para agrupar por persona: con "repiten", sólo cobradas y `having` ≥ 2. */
  paraAgrupar: Prisma.OrderWhereInput;
  having: { buyerId: { _count: { gte: number } } } | undefined;
  ahora: Date;
};

export async function contextoDeClientes(userId: string, params: Record<string, string | string[] | undefined>): Promise<ContextoDeClientes> {
  const consulta = leerConsultaDeClientes(params);
  const ahora = new Date();
  const [store, sub] = await Promise.all([
    prisma.store.findUnique({ where: { ownerId: userId }, select: { id: true } }),
    getUserSubscription(userId),
  ]);
  const tier = (sub?.tier ?? "FREE") as TierDigital;
  const vacio = { storeId: "" };
  if (!store) {
    return { tier, consulta, store: null, productos: [], p: null, sin: null, f: null, pagadas: vacio, buscadas: vacio, paraAgrupar: vacio, having: undefined, ahora };
  }

  /* Los principales, para los filtros "compraron / no compraron". Un id de
     la dirección que no sea de uno propio se cae a "sin filtro". */
  const productos = await prisma.product.findMany({
    where: { storeId: store.id, rolDigital: "PRINCIPAL", deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: MAX_PRODUCTOS_DIGITALES_CREADOS,
    select: { id: true, name: true },
  });
  const propio = (id: string | null) => (id && productos.some((x) => x.id === id) ? id : null);
  const p = propio(consulta.p);
  const sin = propio(consulta.sin);
  const f = consulta.f;

  /* Las cobradas y las devueltas: lo que alguna vez se pagó. Una devolución
     no tiene estado propio: es CANCELLED con el pago REFUNDED. */
  const pagadas: Prisma.OrderWhereInput = {
    storeId: store.id,
    OR: [{ status: "CONFIRMED" }, { status: "CANCELLED", payment: { status: "REFUNDED" } }],
  };
  /* La búsqueda y los filtros son por la PERSONA, no por la compra: "compró
     X" mira todas sus cobradas de esta cuenta, no la fila que se está
     leyendo. Es el mismo criterio que Mail a tus compradores.
     ⚠️ En un `AND`, no en un objeto: "compraron X" y "sin bajar" son las dos
     una condición sobre `orders`, y en un objeto la segunda pisa a la
     primera sin avisar. */
  const cobradaCon = (productId: string): Prisma.OrderWhereInput => ({ storeId: store.id, status: "CONFIRMED", items: { some: { productId } } });
  const condiciones: Prisma.UserWhereInput[] = [
    ...(consulta.q ? [{ OR: [{ email: { contains: consulta.q, mode: "insensitive" as const } }, { name: { contains: consulta.q, mode: "insensitive" as const } }] }] : []),
    ...(p ? [{ orders: { some: cobradaCon(p) } }] : []),
    ...(sin ? [{ NOT: { orders: { some: cobradaCon(sin) } } }] : []),
    ...(f === "sin-bajar" ? [{ orders: { some: { storeId: store.id, status: "CONFIRMED", items: { some: { descargas: { some: { descargas: 0, expiresAt: { gt: ahora } } } } } } } }] : []),
  ];
  const buscadas: Prisma.OrderWhereInput = condiciones.length ? { ...pagadas, buyer: { AND: condiciones } } : pagadas;
  /* "Repiten" es sobre las cobradas y se decide contando: dos o más. */
  const paraAgrupar: Prisma.OrderWhereInput = f === "repiten" ? { ...buscadas, status: "CONFIRMED" } : buscadas;
  const having = f === "repiten" ? { buyerId: { _count: { gte: 2 } } } : undefined;

  return { tier, consulta, store, productos, p, sin, f, pagadas, buscadas, paraAgrupar, having, ahora };
}

/** 25 personas por página × un historial largo. */
const TECHO_DE_COMPRAS = 2000;

/**
 * Las personas de una tanda de ids, ya armadas: sus datos, sus compras de
 * esta cuenta, y si pidieron la baja. En el orden de `ids`.
 */
export async function armarClientes(ctx: ContextoDeClientes & { store: { id: string } }, ids: string[], take = ids.length): Promise<ClienteEnPantalla[]> {
  if (ids.length === 0) return [];
  const [personas, compras] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true, phone: true }, take }),
    prisma.order.findMany({
      where: { ...ctx.pagadas, buyerId: { in: ids } },
      orderBy: { createdAt: "desc" },
      take: TECHO_DE_COMPRAS,
      select: {
        id: true, status: true, total: true, lockedCommissionRate: true, createdAt: true, buyerId: true,
        items: { select: { productId: true, product: { select: { name: true, rolDigital: true } }, descargas: { select: { descargas: true, expiresAt: true } } } },
      },
    }),
  ]);
  /* Quién pidió no recibir más mails de ESTA vendedora. */
  const bajas = new Set((await prisma.bajaCorreoDigital.findMany({
    where: { storeId: ctx.store.id, email: { in: personas.map((x) => x.email.toLowerCase()) } },
    select: { email: true },
    take,
  })).map((b) => b.email));
  /* Para pedir la opinión: su última compra cobrada, y si ya opinó por
     ella. El link va firmado con esa compra (`opinion-firma`); sin clave de
     firma no se ofrece, y la lista sale igual. */
  const ultimaCobradaDe = new Map<string, { id: string; productId: string }>();
  for (const c of compras) {
    if (c.status !== "CONFIRMED" || ultimaCobradaDe.has(c.buyerId)) continue;
    const principal = c.items.find((i) => i.product.rolDigital === "PRINCIPAL");
    if (principal) ultimaCobradaDe.set(c.buyerId, { id: c.id, productId: principal.productId });
  }
  const ordenesConOpinion = ultimaCobradaDe.size
    ? await prisma.opinionDigital.findMany({ where: { orderId: { in: [...ultimaCobradaDe.values()].map((o) => o.id) } }, select: { orderId: true, estado: true }, take })
    : [];
  const estadoDe = new Map(ordenesConOpinion.map((o) => [o.orderId, o.estado as EstadoDeOpinion]));
  const base = baseDeLosMails();
  const opinarDe = (buyerId: string): ClienteEnPantalla["opinar"] => {
    const ultima = ultimaCobradaDe.get(buyerId);
    if (!ultima || !ultima.productId) return undefined;
    try {
      return { enlace: urlParaOpinar(base, ultima.productId, tokenParaOpinar(ultima.id)), estado: estadoDe.get(ultima.id) ?? null };
    } catch (e) {
      console.error("[clientes] sin clave para firmar el link de opinión:", e);
      return undefined;
    }
  };

  const personaDe = new Map(personas.map((x) => [x.id, x]));
  return ids.flatMap((id) => {
    const persona = personaDe.get(id);
    if (!persona) return [];
    return [{ ...armarCliente(persona, compras.filter((c) => c.buyerId === id), ctx.ahora, bajas.has(persona.email.toLowerCase())), opinar: opinarDe(id) }];
  });
}

/** Los ids de las personas que pasan los filtros, por última compra. */
export async function idsDeClientes(ctx: ContextoDeClientes, skip: number, take: number): Promise<string[]> {
  const grupos = await prisma.order.groupBy({
    by: ["buyerId"],
    where: ctx.paraAgrupar,
    having: ctx.having,
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: "desc" } },
    skip,
    take: Math.min(take, TECHO_DE_CLIENTES),
  });
  return grupos.map((g) => g.buyerId);
}

/** Cuántas personas pasan los filtros (hasta el techo). */
export async function cuantosClientes(ctx: ContextoDeClientes): Promise<number> {
  const grupos = await prisma.order.groupBy({ by: ["buyerId"], where: ctx.paraAgrupar, having: ctx.having, orderBy: { buyerId: "asc" }, take: TECHO_DE_CLIENTES });
  return grupos.length;
}
