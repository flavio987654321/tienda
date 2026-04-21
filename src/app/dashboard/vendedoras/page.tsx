import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import { Users, TrendingUp, DollarSign, Settings } from "lucide-react";

export default async function VendedorasPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const store = await prisma.store.findUnique({
    where: { ownerId: (session.user as any).id },
    include: {
      affiliates: {
        include: {
          user: { select: { name: true, email: true, image: true } },
          wallet: true,
          commissions: { where: { status: "PAID" } },
          _count: { select: { orders: true } },
        },
      },
    },
  });

  const affiliates = store?.affiliates ?? [];
  const totalComisionesPagadas = affiliates.reduce(
    (sum, a) => sum + a.commissions.reduce((s, c) => s + c.amount, 0), 0
  );

  return (
    <DashboardLayout userName={session.user?.name} userEmail={session.user?.email}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendedoras</h1>
          <p className="text-gray-500 mt-1">{affiliates.length} vendedora{affiliates.length !== 1 ? "s" : ""} en tu equipo</p>
        </div>
        <Link
          href="/dashboard/configuracion#vendedoras"
          className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
        >
          <Settings className="h-4 w-4" />
          Configurar comisiones
        </Link>
      </div>

      {/* Estado del sistema */}
      <div className={`rounded-2xl border p-5 mb-6 flex items-center justify-between ${
        store?.affiliatesEnabled
          ? "bg-green-50 border-green-200"
          : "bg-yellow-50 border-yellow-200"
      }`}>
        <div>
          <p className={`font-semibold ${store?.affiliatesEnabled ? "text-green-800" : "text-yellow-800"}`}>
            {store?.affiliatesEnabled
              ? "✅ Sistema de vendedoras ACTIVO"
              : "⚠️ Sistema de vendedoras DESACTIVADO"}
          </p>
          <p className={`text-sm mt-0.5 ${store?.affiliatesEnabled ? "text-green-600" : "text-yellow-600"}`}>
            {store?.affiliatesEnabled
              ? `Comisión configurada: ${store.commissionRate}% por venta`
              : "Activalo en Configuración para que las vendedoras puedan sumarse"}
          </p>
        </div>
        <Link
          href="/dashboard/configuracion"
          className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
            store?.affiliatesEnabled
              ? "bg-green-200 text-green-800 hover:bg-green-300"
              : "bg-yellow-200 text-yellow-800 hover:bg-yellow-300"
          }`}
        >
          {store?.affiliatesEnabled ? "Modificar" : "Activar ahora"}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Vendedoras activas", value: affiliates.filter(a => a.isActive).length, icon: Users, color: "text-indigo-600 bg-indigo-50" },
          { label: "Ventas generadas", value: affiliates.reduce((s, a) => s + a._count.orders, 0), icon: TrendingUp, color: "text-green-600 bg-green-50" },
          { label: "Comisiones pagadas", value: `$${totalComisionesPagadas.toLocaleString("es-AR")}`, icon: DollarSign, color: "text-purple-600 bg-purple-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      {affiliates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <div className="bg-purple-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aún no tenés vendedoras</h3>
          <p className="text-gray-400 mb-4">
            Cuando alguien se registre como vendedora y elija tu tienda, aparecerá acá.
          </p>
          {!store?.affiliatesEnabled && (
            <Link
              href="/dashboard/configuracion"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors text-sm"
            >
              Activar sistema de vendedoras
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Vendedora</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ventas</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Saldo pendiente</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total ganado</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {affiliates.map((affiliate) => (
                <tr key={affiliate.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {affiliate.user.name?.[0] ?? "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{affiliate.user.name}</p>
                        <p className="text-xs text-gray-400">{affiliate.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900 text-sm">{affiliate._count.orders}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-indigo-600 text-sm">
                      ${(affiliate.wallet?.balance ?? 0).toLocaleString("es-AR")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900 text-sm">
                      ${(affiliate.wallet?.totalEarned ?? 0).toLocaleString("es-AR")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium ${
                      affiliate.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {affiliate.isActive ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
