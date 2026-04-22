import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, Package } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-session";
import ProductsTable from "./ProductsTable";

export default async function ProductosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    include: {
      products: {
        include: { variants: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const products = store?.products ?? [];
  const pendingAffiliateCount = store
    ? await prisma.affiliate.count({ where: { storeId: store.id, status: "PENDING" } })
    : 0;

  return (
    <DashboardLayout userName={user.name} userEmail={user.email} initialPendingAffiliateCount={pendingAffiliateCount}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-500 mt-1">{products.length} producto{products.length !== 1 ? "s" : ""} en tu tienda</p>
        </div>
        <Link
          href="/dashboard/productos/nuevo"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
        >
          <Plus className="h-4 w-4" />
          Agregar producto
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
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
        <ProductsTable products={products} />
      )}
    </DashboardLayout>
  );
}
