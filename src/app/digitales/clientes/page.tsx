import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import {
  leerConsultaDeClientes, armarCliente, resumirClientes,
  CLIENTES_POR_PAGINA, TECHO_DE_CLIENTES,
  type ClienteEnPantalla, type ResumenDeClientes,
} from "@/lib/clientes-digitales";
import { MAX_PRODUCTOS_DIGITALES_CREADOS } from "@/lib/planLimits";
import BotonVolver from "../BotonVolver";
import ClientesClient from "./ClientesClient";

/**
 * Tus clientes: la gente que te pagó, una fila por persona.
 *
 * Ver `lib/clientes-digitales` por qué existe y qué contesta. Acá sólo lo
 * que toca la base:
 *
 *   - La lista pagina en el SERVIDOR y la búsqueda viaja en la dirección,
 *     como Ventas: con dos mil compradores no se puede traer todo.
 *   - Los tres números de arriba son sobre TODOS los clientes, no sobre la
 *     página ni la búsqueda: "cuántos repiten" no cambia por buscar a uno.
 *   - Una devolución no tiene estado propio: es CANCELLED con el pago
 *     REFUNDED (ver `/api/digitales/cobro`). Se trae para que el historial
 *     de la persona la muestre, pero no la vuelve cliente por sí sola.
 */

export const dynamic = "force-dynamic";

export default async function ClientesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;

  const consulta = leerConsultaDeClientes(await searchParams);
  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  const sinFiltros = { q: consulta.q, p: null, sin: null, f: null, productos: [] as { id: string; name: string }[] };
  if (!store) return <Pantalla clientes={[]} resumen={VACIO} pagina={1} paginas={1} {...sinFiltros} />;

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

  const ahora = new Date();
  /* Las cobradas y las devueltas: lo que alguna vez se pagó. */
  const pagadas: Prisma.OrderWhereInput = {
    storeId: store.id,
    OR: [{ status: "CONFIRMED" }, { status: "CANCELLED", payment: { status: "REFUNDED" } }],
  };
  /* La búsqueda y los filtros son por la PERSONA, no por la compra: "compró
     X" mira todas sus cobradas de esta cuenta, no la fila que se está
     leyendo. Es el mismo criterio que Mail a tus compradores. */
  const cobradaCon = (productId: string): Prisma.OrderWhereInput => ({ storeId: store.id, status: "CONFIRMED", items: { some: { productId } } });
  /* ⚠️ En un `AND`, no en un objeto: "compraron X" y "sin bajar" son las dos
     una condición sobre `orders`, y en un objeto la segunda pisa a la
     primera sin avisar. */
  const condiciones: Prisma.UserWhereInput[] = [
    ...(consulta.q ? [{ OR: [{ email: { contains: consulta.q, mode: "insensitive" as const } }, { name: { contains: consulta.q, mode: "insensitive" as const } }] }] : []),
    ...(p ? [{ orders: { some: cobradaCon(p) } }] : []),
    ...(sin ? [{ NOT: { orders: { some: cobradaCon(sin) } } }] : []),
    ...(f === "sin-bajar" ? [{ orders: { some: { storeId: store.id, status: "CONFIRMED", items: { some: { descargas: { some: { descargas: 0, expiresAt: { gt: ahora } } } } } } } }] : []),
  ];
  const buscadas: Prisma.OrderWhereInput = condiciones.length ? { ...pagadas, buyer: { AND: condiciones } } : pagadas;

  /* "Repiten" es sobre las cobradas y se decide contando: dos o más. Por eso
     va en el `having` y la cuenta de arriba lo repite con `groupBy`. */
  const paraAgrupar: Prisma.OrderWhereInput = f === "repiten" ? { ...buscadas, status: "CONFIRMED" } : buscadas;
  const having = f === "repiten" ? { buyerId: { _count: { gte: 2 } } } : undefined;
  const [porPersona, cuantas, resumen] = await Promise.all([
    /* Una fila por comprador, las últimas compras primero. */
    prisma.order.groupBy({
      by: ["buyerId"],
      where: paraAgrupar,
      having,
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
      skip: (consulta.pagina - 1) * CLIENTES_POR_PAGINA,
      take: CLIENTES_POR_PAGINA,
    }),
    prisma.order.groupBy({ by: ["buyerId"], where: paraAgrupar, having, orderBy: { buyerId: "asc" }, take: TECHO_DE_CLIENTES }).then((g) => g.length),
    resumenDeTodos(store.id, ahora),
  ]);

  const ids = porPersona.map((g) => g.buyerId);
  const [personas, compras] = ids.length
    ? await Promise.all([
        prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true, phone: true }, take: CLIENTES_POR_PAGINA }),
        /* Las compras de la página: 25 personas, y un techo por si alguna
           tiene cientos (el historial de esa persona se corta, no la lista). */
        prisma.order.findMany({
          where: { ...pagadas, buyerId: { in: ids } },
          orderBy: { createdAt: "desc" },
          take: TECHO_DE_COMPRAS_DE_LA_PAGINA,
          select: {
            id: true, status: true, total: true, lockedCommissionRate: true, createdAt: true, buyerId: true,
            items: { select: { product: { select: { name: true, rolDigital: true } }, descargas: { select: { descargas: true, expiresAt: true } } } },
          },
        }),
      ])
    : [[], []];
  /* Quién pidió no recibir más mails de ESTA vendedora. */
  const bajas = personas.length
    ? new Set((await prisma.bajaCorreoDigital.findMany({ where: { storeId: store.id, email: { in: personas.map((p) => p.email.toLowerCase()) } }, select: { email: true }, take: CLIENTES_POR_PAGINA })).map((b) => b.email))
    : new Set<string>();

  const personaDe = new Map(personas.map((p) => [p.id, p]));
  const clientes: ClienteEnPantalla[] = ids.flatMap((id) => {
    const persona = personaDe.get(id);
    if (!persona) return [];
    return [armarCliente(persona, compras.filter((c) => c.buyerId === id), ahora, bajas.has(persona.email.toLowerCase()))];
  });

  return (
    <Pantalla
      clientes={clientes}
      resumen={resumen}
      q={consulta.q}
      p={p}
      sin={sin}
      f={f}
      productos={productos}
      pagina={consulta.pagina}
      paginas={Math.max(1, Math.ceil(cuantas / CLIENTES_POR_PAGINA))}
    />
  );
}

/**
 * Los números de arriba, sobre todos. Dos consultas chicas en vez de traer
 * las órdenes: cuántas cobradas tiene cada persona (para "clientes" y
 * "repiten"), y a quiénes les queda un archivo pago sin bajar.
 */
async function resumenDeTodos(storeId: string, ahora: Date): Promise<ResumenDeClientes> {
  const [cobradasPorPersona, sinBajar] = await Promise.all([
    prisma.order.groupBy({ by: ["buyerId"], where: { storeId, status: "CONFIRMED" }, _count: { _all: true }, orderBy: { buyerId: "asc" }, take: TECHO_DE_CLIENTES }),
    prisma.digitalDownload.findMany({
      where: { descargas: 0, expiresAt: { gt: ahora }, orderItem: { order: { storeId, status: "CONFIRMED" } } },
      select: { orderItem: { select: { order: { select: { buyerId: true } } } } },
      take: TECHO_DE_CLIENTES,
    }),
  ]);
  const conArchivoSinBajar = new Set(sinBajar.map((d) => d.orderItem.order.buyerId));
  return resumirClientes(cobradasPorPersona.map((g) => ({ compras: g._count._all, sinBajar: conArchivoSinBajar.has(g.buyerId) ? 1 : 0 })));
}

/** 25 personas por página × un historial largo. */
const TECHO_DE_COMPRAS_DE_LA_PAGINA = CLIENTES_POR_PAGINA * 80;

const VACIO: ResumenDeClientes = { clientes: 0, repiten: 0, sinBajar: 0 };

function Pantalla(props: React.ComponentProps<typeof ClientesClient>) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8">
      <BotonVolver />
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 panel-oscuro:text-gray-100">Tus clientes</h1>
        <p className="text-gray-500 panel-oscuro:text-gray-400 text-sm mt-1">
          Quién te compró, cuántas veces, y si tiene lo suyo.
        </p>
      </div>
      <ClientesClient {...props} />
    </div>
  );
}
