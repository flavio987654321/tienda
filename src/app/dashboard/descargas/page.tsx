export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import DashboardLayout from "@/components/DashboardLayout";
import AvisosDeSeccion from "@/components/dashboard/AvisosDeSeccion";
import { todosLosAvisos, avisosDeSeccion } from "@/lib/avisos-tienda";
import { getStoreType } from "@/lib/storeTypes";
import { DIAS_DE_VIGENCIA, MAX_DESCARGAS } from "@/lib/descargas";
import DescargasTable from "./DescargasTable";

/* Sin `export`: una página de Next sólo puede exportar cosas de una lista fija
   (`default`, `metadata`, `dynamic`…). Es el mismo criterio que en Productos. */
const PAGE_SIZE = 20;

type Props = { searchParams: Promise<{ page?: string }> };

export default async function DescargasPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  // Sin sesión NO se redirige a `/login`: esa ruta está fuera del `scope` del
  // manifiesto, y desde el panel instalado abría el sitio comercial entero. La
  // pantalla la dibuja el layout. El porqué largo está en `dashboard/layout.tsx`.
  if (!user) return null;

  /* La sección todavía no está lanzada: se prende con
     NEXT_PUBLIC_DIGITALES_ENABLED=1, igual que el item del menú y que
     Aplicaciones. Se chequea también acá y no sólo en el menú, porque esconder
     un botón no cierra una URL. */
  if (process.env.NEXT_PUBLIC_DIGITALES_ENABLED !== "1") redirect("/dashboard");

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, tipoTienda: true },
  });
  if (!store) redirect("/dashboard");

  /* Esta pantalla es de un rubro. A quien no lo sea se lo manda al inicio en vez
     de mostrarle una tabla vacía: una pantalla vacía sin explicación se lee como
     algo roto, y encima nunca se le va a llenar. */
  if (!getStoreType(store.tipoTienda ?? "ROPA").requiereArchivo) redirect("/dashboard");

  const sp = await searchParams;
  const pagina = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const ahora = new Date();

  const avisos = await todosLosAvisos(user.id);
  const avisosDeEstaSeccion = avisosDeSeccion(avisos, "/dashboard/descargas");

  const [entregas, total, sinDescargar, conArchivo, sinArchivo, pendingAffiliateCount] =
    await Promise.all([
      prisma.digitalDownload.findMany({
        where: { orderItem: { order: { storeId: store.id } } },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (pagina - 1) * PAGE_SIZE,
        /* El `token` NO se pide, a propósito. Es lo ÚNICO que separa a un
           comprador del archivo: traerlo acá lo dejaría escrito en el HTML de
           esta página, o sea un link de descarga vivo dentro del panel, en el
           historial del navegador y en cualquier captura de pantalla. El botón
           de reenviar no lo necesita — manda el id de la fila y el token lo
           busca el servidor. */
        select: {
          id: true,
          expiresAt: true,
          descargas: true,
          maxDescargas: true,
          ultimaDescarga: true,
          createdAt: true,
          orderItem: {
            select: {
              product: { select: { name: true } },
              order: {
                select: {
                  createdAt: true,
                  buyer: { select: { name: true, email: true } },
                },
              },
            },
          },
        },
      }),
      prisma.digitalDownload.count({ where: { orderItem: { order: { storeId: store.id } } } }),
      prisma.digitalDownload.count({
        where: {
          descargas: 0,
          expiresAt: { gt: ahora },
          orderItem: { order: { storeId: store.id } },
        },
      }),
      prisma.product.count({
        where: { storeId: store.id, deletedAt: null, archivoPath: { not: null } },
      }),
      prisma.product.count({
        where: { storeId: store.id, deletedAt: null, isActive: true, archivoPath: null },
      }),
      prisma.affiliate.count({ where: { storeId: store.id, status: "PENDING" } }),
    ]);

  const filas = entregas.map((e) => ({
    id: e.id,
    producto: e.orderItem.product.name,
    comprador: e.orderItem.order.buyer.name ?? "",
    email: e.orderItem.order.buyer.email,
    compradoEl: e.orderItem.order.createdAt.toISOString(),
    descargas: e.descargas,
    maxDescargas: e.maxDescargas,
    ultimaDescarga: e.ultimaDescarga?.toISOString() ?? null,
    venceEl: e.expiresAt.toISOString(),
    vencido: e.expiresAt <= ahora,
  }));

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardLayout
      userName={user.name}
      userId={user.id}
      initialPendingAffiliateCount={pendingAffiliateCount}
      avisosIniciales={avisos}
    >
      <AvisosDeSeccion avisos={avisosDeEstaSeccion} />

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Descargas</h1>
        <p className="text-gray-500 mt-1">
          Quién compró cada archivo, si ya lo bajó y cuántas veces.
        </p>
      </div>

      {/* Los archivos que hay arriba. Va antes de la tabla porque es la pregunta
          que se hace primero quien entra: "¿está todo cargado?". */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Resumen valor={conArchivo} etiqueta="productos con archivo" />
        <Resumen valor={total} etiqueta={total === 1 ? "compra entregada" : "compras entregadas"} />
        <Resumen valor={sinDescargar} etiqueta="sin descargar" alerta={sinDescargar > 0} />
        <Resumen valor={sinArchivo} etiqueta="publicados sin archivo" alerta={sinArchivo > 0} />
      </div>

      {/* El cartel rojo de "publicados sin archivo" NO se dibuja acá: sale del
          aviso de lib/avisos-tienda, arriba de todo, que es el mismo que enciende
          el triángulo del menú. Escrito dos veces terminaría diciendo dos cosas
          distintas — es exactamente lo que pasó con "conectá MercadoPago". */}

      {total === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 sm:p-16 text-center">
          <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Download className="h-8 w-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Todavía no vendiste ningún archivo</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            Cuando alguien compre, el link de descarga le sale solo por mail y la entrega aparece
            acá. El link le dura {DIAS_DE_VIGENCIA} días y lo puede usar hasta {MAX_DESCARGAS} veces.
          </p>
        </div>
      ) : (
        <DescargasTable
          filas={filas}
          pagina={pagina}
          totalPaginas={totalPaginas}
          diasDeVigencia={DIAS_DE_VIGENCIA}
          maxDescargas={MAX_DESCARGAS}
        />
      )}
    </DashboardLayout>
  );
}

function Resumen({ valor, etiqueta, alerta }: { valor: number; etiqueta: string; alerta?: boolean }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        alerta ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-white"
      }`}
    >
      <p className={`text-2xl font-bold ${alerta ? "text-amber-700" : "text-gray-900"}`}>{valor}</p>
      <p className={`text-xs mt-0.5 ${alerta ? "text-amber-700" : "text-gray-500"}`}>{etiqueta}</p>
    </div>
  );
}
