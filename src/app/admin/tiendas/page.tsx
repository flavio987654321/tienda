import { prisma } from "@/lib/prisma";
import TiendasAdmin from "./TiendasAdmin";

export const dynamic = "force-dynamic";

export default async function AdminTiendasPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const { f = "" } = await searchParams;

  const stores = await prisma.store.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      // `role` para poder distinguir las cuentas de Productos Digitales: tienen
      // una fila en `Store` —ahí viven sus productos— pero no son una tienda, y
      // varias cosas de esta pantalla no les corresponden. Ver `TiendasAdmin`.
      owner: { select: { name: true, email: true, role: true } },
      // Sin los borrados: el admin mira lo que la tienda tiene, no las filas que
      // quedaron en la tabla después de un borrado lógico.
      _count: { select: { products: { where: { deletedAt: null } }, affiliates: true, orders: true } },
    },
  });

  /* ⚠️ En digitales, `products` NO son los productos que la dueña ve.
     Cada bono y cada upsell es su propia fila de `Product` colgando del
     principal (`padreId`), así que una cuenta con un ebook y tres bonos
     figuraba acá con "4 productos" cuando tiene UNO. Los principales se
     cuentan aparte y sólo para esas cuentas. */
  const idsDigitales = stores.filter((s) => s.owner?.role === "DIGITAL").map((s) => s.id);
  const principales = idsDigitales.length === 0
    ? []
    : await prisma.product.groupBy({
        by: ["storeId"],
        where: { storeId: { in: idsDigitales }, deletedAt: null, rolDigital: "PRINCIPAL" },
        _count: { _all: true },
      });
  const principalesDe = new Map(principales.map((p) => [p.storeId, p._count._all]));

  const serialized = stores.map(s => {
    const esDigital = s.owner?.role === "DIGITAL";
    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      primaryColor: s.primaryColor,
      isActive: s.isActive,
      isPublished: s.isPublished,
      createdAt: s.createdAt.toISOString(),
      esDigital,
      owner: { name: s.owner?.name ?? null, email: s.owner?.email ?? "" },
      _count: {
        ...s._count,
        products: esDigital ? principalesDe.get(s.id) ?? 0 : s._count.products,
      },
    };
  });
  const cuantasDigitales = serialized.filter((s) => s.esDigital).length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Tiendas</h1>
        <p className="text-gray-400 text-sm">
          {stores.length - cuantasDigitales} tiendas registradas
          {cuantasDigitales > 0 && ` · ${cuantasDigitales} cuenta${cuantasDigitales === 1 ? "" : "s"} de Productos Digitales`}
        </p>
      </div>
      <TiendasAdmin stores={serialized} filter={f} />
    </div>
  );
}
