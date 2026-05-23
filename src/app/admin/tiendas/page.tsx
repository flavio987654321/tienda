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
      owner: { select: { name: true, email: true } },
      _count: { select: { products: true, affiliates: true, orders: true } },
    },
  });

  const serialized = stores.map(s => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    primaryColor: s.primaryColor,
    isActive: s.isActive,
    isPublished: s.isPublished,
    createdAt: s.createdAt.toISOString(),
    owner: s.owner,
    _count: s._count,
  }));

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Tiendas</h1>
        <p className="text-gray-400 text-sm">{stores.length} tiendas registradas</p>
      </div>
      <TiendasAdmin stores={serialized} filter={f} />
    </div>
  );
}
