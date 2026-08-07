export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, Package } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-session";
import ProductsTable from "./ProductsTable";
import ChangeStoreTypeButton from "./ChangeStoreTypeButton";
import CsvImportButton from "./CsvImportButton";
import { STORE_TYPES } from "@/lib/storeTypes";
import { parseStringArray } from "@/lib/promotions";
import type { Prisma } from "@prisma/client";

export const PAGE_SIZE = 20;

/* Cuánto stock total tiene que sumar un producto para caer en cada filtro.
   Es el mismo criterio que mostraban los carteles de la lista. */
const BANDAS_STOCK: Record<string, [number, number]> = {
  out:      [0, 0],
  low:      [1, 4],
  critical: [0, 4],
};

const ORDENES = ["newest", "price_asc", "price_desc", "name_az", "stock_asc"];

const ORDEN_PRISMA: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  newest:     { createdAt: "desc" },
  price_asc:  { price: "asc" },
  price_desc: { price: "desc" },
  name_az:    { name: "asc" },
};

/* `destacar` son los ids que manda el link de una notificación de stock, separados
   por coma. No filtran nada: marcan. Ver el comentario de `LowStockItem`. */
type Props = {
  searchParams: Promise<{
    stock?: string; destacar?: string;
    q?: string; cat?: string; estado?: string; orden?: string; page?: string;
  }>;
};

export default async function ProductosPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const destacarIds = (sp.destacar ?? "").split(",").map(s => s.trim()).filter(Boolean);

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
  });

  const esAutos = store?.tipoTienda === "AUTOS";

  // ── Lo que pidió la URL, ya saneado ──────────────────────────────────────
  const busqueda = (sp.q ?? "").trim();
  const categoria = (sp.cat ?? "").trim();
  const estado = (sp.estado ?? "").trim();
  const filtroStock = BANDAS_STOCK[sp.stock ?? ""] ? sp.stock! : "all";
  const orden = ORDENES.includes(sp.orden ?? "") ? sp.orden! : "newest";
  const pagina = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  if (!store) {
    return (
      <DashboardLayout userName={user.name} userId={user.id}>
        <div className="bg-white rounded-2xl border border-gray-100 p-8 sm:p-16 text-center text-gray-400">
          No encontramos tu tienda.
        </div>
      </DashboardLayout>
    );
  }

  const storeId = store.id;

  /* El filtro por stock es el único que no se puede escribir como condición de
     Prisma: depende de la SUMA del stock de las variantes, y `orderBy`/`where`
     no saben sumar una relación. Se resuelve pidiéndole a Postgres nada más que
     los ids que caen en la banda, y esos ids entran después como una condición
     más — así el resto de los filtros y la paginación siguen siendo Prisma y no
     hay lógica de filtrado duplicada en dos idiomas. */
  let idsEnBanda: string[] | null = null;
  if (filtroStock !== "all") {
    const [minimo, maximo] = BANDAS_STOCK[filtroStock];
    const filas = await prisma.$queryRaw<{ id: string }[]>`
      SELECT p."id"
      FROM "Product" p
      LEFT JOIN "ProductVariant" v ON v."productId" = p."id"
      WHERE p."storeId" = ${storeId} AND p."deletedAt" IS NULL
      GROUP BY p."id"
      HAVING COALESCE(SUM(v."stock"), 0) BETWEEN ${minimo} AND ${maximo}
    `;
    idsEnBanda = filas.map((f) => f.id);
  }

  const where: Prisma.ProductWhereInput = {
    storeId,
    deletedAt: null,
    ...(busqueda
      ? {
          OR: [
            { name:        { contains: busqueda, mode: "insensitive" as const } },
            { category:    { contains: busqueda, mode: "insensitive" as const } },
            { subcategory: { contains: busqueda, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(categoria ? { category: categoria } : {}),
    ...(estado
      ? esAutos
        ? { vehicleStatus: estado }
        : { isActive: estado === "active" }
      : {}),
    ...(idsEnBanda ? { id: { in: idsEnBanda } } : {}),
  };

  const SELECT = {
    id: true, name: true, category: true, subcategory: true,
    price: true, comparePrice: true, images: true, isActive: true,
    vehicleStatus: true, soldAt: true, soldPrice: true, soldBuyerName: true,
    expenses: { select: { monto: true } },
    variants: { select: { id: true, name: true, value: true, stock: true, lowStockThreshold: true } },
  } satisfies Prisma.ProductSelect;

  let products: Prisma.ProductGetPayload<{ select: typeof SELECT }>[] = [];
  let totalFiltrado = 0;

  if (orden === "stock_asc") {
    /* Ordenar por stock tiene el mismo problema que filtrarlo, y encima no se
       puede resolver con una condición: hay que ordenar por la suma. Se pide a
       Postgres el orden —solo la columna de ids, que es barata— y se lo cruza
       con los ids que pasan el resto de los filtros. Así el orden lo pone SQL,
       el filtrado sigue siendo uno solo, y recién al final se traen los datos
       completos de los veinte que se van a ver. */
    const [ordenados, coinciden] = await Promise.all([
      prisma.$queryRaw<{ id: string }[]>`
        SELECT p."id"
        FROM "Product" p
        LEFT JOIN "ProductVariant" v ON v."productId" = p."id"
        WHERE p."storeId" = ${storeId} AND p."deletedAt" IS NULL
        GROUP BY p."id", p."createdAt"
        ORDER BY COALESCE(SUM(v."stock"), 0) ASC, p."createdAt" DESC
      `,
      prisma.product.findMany({ where, select: { id: true } }),
    ]);
    const pasan = new Set(coinciden.map((p) => p.id));
    const idsOrdenados = ordenados.map((f) => f.id).filter((id) => pasan.has(id));
    totalFiltrado = idsOrdenados.length;

    const idsPagina = idsOrdenados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);
    const filas = idsPagina.length
      ? await prisma.product.findMany({ where: { id: { in: idsPagina } }, select: SELECT })
      : [];
    const porId = new Map(filas.map((p) => [p.id, p]));
    products = idsPagina.map((id) => porId.get(id)).filter(Boolean) as typeof products;
  } else {
    [products, totalFiltrado] = await Promise.all([
      prisma.product.findMany({
        where,
        select: SELECT,
        orderBy: ORDEN_PRISMA[orden],
        take: PAGE_SIZE,
        skip: (pagina - 1) * PAGE_SIZE,
      }),
      prisma.product.count({ where }),
    ]);
  }

  /* Un resumen de la tienda entera, no de la página. De acá salen tres cosas que
     dejarían de ser ciertas si se calcularan sobre los veinte productos que se
     están viendo: la lista de categorías del desplegable —que tiene que
     ofrecerlas todas—, el total del encabezado, y sobre todo el alcance de las
     acciones en masa, que tocan la categoría completa: si el botón dijera
     "Aplicar a 20 productos" en una tienda de 300, estaría mintiendo justo antes
     de una operación que no se deshace. */
  const [resumenCrudo, pendingAffiliateCount] = await Promise.all([
    prisma.$queryRaw<{ category: string; productos: bigint; variantes: bigint; stock: bigint }[]>`
      SELECT p."category",
             COUNT(DISTINCT p."id")      AS productos,
             COUNT(v."id")               AS variantes,
             COALESCE(SUM(v."stock"), 0) AS stock
      FROM "Product" p
      LEFT JOIN "ProductVariant" v ON v."productId" = p."id"
      WHERE p."storeId" = ${storeId} AND p."deletedAt" IS NULL
      GROUP BY p."category"
      ORDER BY p."category" ASC
    `,
    prisma.affiliate.count({ where: { storeId, status: "PENDING" } }),
  ]);

  const categorias = resumenCrudo.map((f) => f.category).filter(Boolean);
  const porCategoria: Record<string, { productos: number; variantes: number; stock: number }> = {};
  const totales = { productos: 0, variantes: 0, stock: 0 };
  for (const fila of resumenCrudo) {
    // COUNT y SUM vuelven como BigInt desde Postgres.
    const dato = {
      productos: Number(fila.productos),
      variantes: Number(fila.variantes),
      stock:     Number(fila.stock),
    };
    porCategoria[fila.category] = dato;
    totales.productos += dato.productos;
    totales.variantes += dato.variantes;
    totales.stock     += dato.stock;
  }
  const totalTienda = totales.productos;

  // Qué productos tienen una promoción de tienda VIGENTE ahora (misma regla de vigencia
  // que la tienda pública). Se computa acá y se pasa como lista de IDs para que la lista
  // marque "Promo" sin recalcular precios ni sumar columnas.
  const now = new Date();
  const activePromos = await prisma.storePromotion.findMany({
    where: {
      storeId,
      isActive: true,
      archivedAt: null,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    select: { scope: true, categories: true, productIds: true },
  });
  const anyAllScope = activePromos.some((p) => p.scope === "ALL");
  const promoCats = new Set(activePromos.filter((p) => p.scope === "CATEGORY").flatMap((p) => parseStringArray(p.categories)));
  const promoIds = new Set(activePromos.filter((p) => p.scope === "PRODUCTS").flatMap((p) => parseStringArray(p.productIds)));
  const promotedIds = anyAllScope
    ? products.map((p) => p.id)
    : products.filter((p) => promoCats.has(p.category) || promoIds.has(p.id)).map((p) => p.id);

  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / PAGE_SIZE));

  return (
    <DashboardLayout userName={user.name} userId={user.id} initialPendingAffiliateCount={pendingAffiliateCount}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {esAutos ? "Vehículos" : "Productos"}
          </h1>
          <p className="text-gray-500 mt-1">
            {totalTienda} {esAutos ? "vehículo" : "producto"}{totalTienda !== 1 ? "s" : ""} en tu tienda
          </p>
        </div>
        {/* Grilla de dos en angosto, fila en `sm`. Con `flex-wrap` los tres
            caían donde entraran: quedaban dos arriba de anchos distintos y el
            principal colgado abajo, con alturas que ni siquiera coincidían
            (`py-2` contra `py-2.5`). Ahora en el teléfono manda el botón de
            agregar —que es el que se usa— a lo ancho y arriba, y los dos
            secundarios se reparten el renglón de abajo en mitades iguales. */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Link
            href="/dashboard/productos/nuevo"
            className="col-span-2 order-first flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 whitespace-nowrap sm:col-auto sm:order-last sm:justify-start"
          >
            <Plus className="h-4 w-4" />
            {esAutos ? "Publicar vehículo" : "Agregar producto"}
          </Link>
          {store.tipoTiendaConfigurado && (() => {
            const typeConfig = STORE_TYPES.find((t) => t.id === (store.tipoTienda || "ROPA"));
            return typeConfig ? (
              <ChangeStoreTypeButton
                currentType={typeConfig.id}
                currentLabel={typeConfig.label}
                currentEmoji={typeConfig.emoji}
                className="min-w-0 justify-center sm:justify-start"
              />
            ) : null;
          })()}
          <CsvImportButton
            tipoTienda={store.tipoTienda ?? "ROPA"}
            className="min-w-0 justify-center sm:justify-start"
          />
        </div>
      </div>

      {totalTienda === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 sm:p-16 text-center">
          <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No tenés productos aún</h3>
          <p className="text-gray-400 mb-6">Agregá tu primer producto para empezar a vender</p>
          <Link
            href="/dashboard/productos/nuevo"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Agregar primer producto
          </Link>
        </div>
      ) : (
        <ProductsTable
          products={products}
          storeSlug={store.slug ?? ""}
          storeName={store.name ?? ""}
          storeType={store.tipoTienda ?? ""}
          promotedIds={promotedIds}
          highlightIds={destacarIds}
          categorias={categorias}
          porCategoria={porCategoria}
          totales={totales}
          totalTienda={totalTienda}
          totalFiltrado={totalFiltrado}
          pagina={pagina}
          totalPaginas={totalPaginas}
          filtros={{ q: busqueda, cat: categoria, estado, stock: filtroStock, orden }}
        />
      )}
    </DashboardLayout>
  );
}
