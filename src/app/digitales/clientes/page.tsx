import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { resumirClientes, CLIENTES_POR_PAGINA, TECHO_DE_CLIENTES, type ResumenDeClientes } from "@/lib/clientes-digitales";
import { contextoDeClientes, idsDeClientes, cuantosClientes, armarClientes } from "@/lib/clientes-digitales-db";
import { puedeVer } from "@/lib/estadisticas-digitales";
import BotonVolver from "../BotonVolver";
import ClientesClient from "./ClientesClient";

/**
 * Tus clientes: la gente que te pagó, una fila por persona.
 *
 * Ver `lib/clientes-digitales` por qué existe y qué contesta, y
 * `lib/clientes-digitales-db` por el `where` (lo comparte con la
 * exportación: la lista que se baja es la que se ve). Acá sólo:
 *
 *   - La lista pagina en el SERVIDOR y la búsqueda y los filtros viajan en
 *     la dirección, como Ventas: con dos mil compradores no se puede traer
 *     todo.
 *   - Los tres números de arriba son sobre TODOS los clientes, no sobre la
 *     página ni la búsqueda: "cuántos repiten" no cambia por buscar a uno.
 */

export const dynamic = "force-dynamic";

export default async function ClientesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;

  const ctx = await contextoDeClientes(user.id, await searchParams);
  const comunes = { q: ctx.consulta.q, p: ctx.p, sin: ctx.sin, f: ctx.f, productos: ctx.productos, puedeExportar: puedeVer(ctx.tier, "exportar") };
  if (!ctx.store) return <Pantalla clientes={[]} resumen={VACIO} opinionesPendientes={0} pagina={1} paginas={1} {...comunes} />;

  const [ids, cuantas, resumen, opinionesPendientes] = await Promise.all([
    idsDeClientes(ctx, (ctx.consulta.pagina - 1) * CLIENTES_POR_PAGINA, CLIENTES_POR_PAGINA),
    cuantosClientes(ctx),
    resumenDeTodos(ctx.store.id, ctx.ahora),
    /* Opiniones verificadas por revisar: el link de arriba lo dice. */
    prisma.opinionDigital.count({ where: { storeId: ctx.store.id, estado: "PENDIENTE" } }),
  ]);
  const clientes = await armarClientes({ ...ctx, store: ctx.store }, ids, CLIENTES_POR_PAGINA);

  return (
    <Pantalla
      clientes={clientes}
      resumen={resumen}
      opinionesPendientes={opinionesPendientes}
      pagina={ctx.consulta.pagina}
      paginas={Math.max(1, Math.ceil(cuantas / CLIENTES_POR_PAGINA))}
      {...comunes}
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
