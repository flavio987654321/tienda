import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import AffiliateActions from "@/components/affiliates/AffiliateActions";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Clock, DollarSign, Settings, TrendingUp, Users } from "lucide-react";

function statusClass(status: string) {
  if (status === "APPROVED") return "bg-green-100 text-green-700";
  if (status === "REJECTED") return "bg-red-100 text-red-700";
  if (status === "PAUSED") return "bg-gray-100 text-gray-600";
  return "bg-yellow-100 text-yellow-700";
}

function statusLabel(status: string) {
  if (status === "APPROVED") return "Aprobada";
  if (status === "REJECTED") return "Rechazada";
  if (status === "PAUSED") return "Pausada";
  return "Pendiente";
}

export default async function VendedorasPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const store = await prisma.store.findUnique({
    where: { ownerId: userId },
    include: {
      affiliates: {
        include: {
          user: { select: { name: true, email: true, image: true } },
          wallet: true,
          commissions: { where: { status: "PAID" } },
          _count: { select: { orders: true } },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      },
    },
  });

  const affiliates = store?.affiliates ?? [];
  const pending = affiliates.filter((affiliate) => affiliate.status === "PENDING");
  const approved = affiliates.filter((affiliate) => affiliate.status === "APPROVED");
  const totalComisionesPagadas = affiliates.reduce(
    (sum, affiliate) => sum + affiliate.commissions.reduce((s, commission) => s + commission.amount, 0),
    0
  );

  return (
    <DashboardLayout userName={session.user?.name} userEmail={session.user?.email}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Afiliados</h1>
          <p className="text-gray-500 mt-1">
            Revisá solicitudes, aprobá permisos y controlá comisiones.
          </p>
        </div>
        <Link href="/dashboard/configuracion#vendedoras" className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm">
          <Settings className="h-4 w-4" />
          Configurar comisiones
        </Link>
      </div>

      <div className={`rounded-2xl border p-5 mb-6 flex items-center justify-between ${
        store?.affiliatesEnabled ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"
      }`}>
        <div>
          <p className={`font-semibold ${store?.affiliatesEnabled ? "text-green-800" : "text-yellow-800"}`}>
            {store?.affiliatesEnabled ? "Sistema de afiliados activo" : "Sistema de afiliados desactivado"}
          </p>
          <p className={`text-sm mt-0.5 ${store?.affiliatesEnabled ? "text-green-600" : "text-yellow-600"}`}>
            {store?.affiliatesEnabled
              ? `Comision configurada: ${store.commissionRate}% por venta aprobada`
              : "Activalo en Configuracion para que otras personas puedan postularse"}
          </p>
        </div>
        <Link href="/dashboard/configuracion" className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
          store?.affiliatesEnabled ? "bg-green-200 text-green-800 hover:bg-green-300" : "bg-yellow-200 text-yellow-800 hover:bg-yellow-300"
        }`}>
          {store?.affiliatesEnabled ? "Modificar" : "Activar ahora"}
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Pendientes", value: pending.length, icon: Clock, color: "text-yellow-600 bg-yellow-50" },
          { label: "Aprobados", value: approved.length, icon: Users, color: "text-indigo-600 bg-indigo-50" },
          { label: "Ventas generadas", value: affiliates.reduce((sum, affiliate) => sum + affiliate._count.orders, 0), icon: TrendingUp, color: "text-green-600 bg-green-50" },
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

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="font-bold text-gray-900 mb-4">Solicitudes pendientes</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pending.map((affiliate) => (
              <div key={affiliate.id} className="bg-white rounded-2xl border border-yellow-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-gray-900">{affiliate.user.name}</p>
                    <p className="text-sm text-gray-400">{affiliate.user.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Solicitó permiso el {affiliate.requestedAt.toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(affiliate.status)}`}>
                    {statusLabel(affiliate.status)}
                  </span>
                </div>

                {affiliate.applicationMessage && (
                  <div className="mt-4 rounded-xl bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Presentacion</p>
                    <p className="text-sm text-gray-600">{affiliate.applicationMessage}</p>
                  </div>
                )}
                {affiliate.experience && (
                  <div className="mt-3 rounded-xl bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Experiencia</p>
                    <p className="text-sm text-gray-600">{affiliate.experience}</p>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {affiliate.socialUrl && (
                    <a href={affiliate.socialUrl} target="_blank" rel="noreferrer" className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-600">
                      Ver redes
                    </a>
                  )}
                  {affiliate.cvUrl && (
                    <a href={affiliate.cvUrl} target="_blank" rel="noreferrer" className="rounded-full bg-purple-50 px-3 py-1 font-semibold text-purple-600">
                      Ver CV
                    </a>
                  )}
                </div>
                <div className="mt-4">
                  <AffiliateActions affiliateId={affiliate.id} status={affiliate.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-bold text-gray-900 mb-4">Equipo de afiliados</h2>
        {affiliates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <div className="bg-purple-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aun no tenes solicitudes</h3>
            <p className="text-gray-400 mb-4">
              Cuando alguien se postule a tu tienda, vas a poder aprobarlo desde aca.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Afiliado</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ventas</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Saldo</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total ganado</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
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
                      <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium ${statusClass(affiliate.status)}`}>
                        {statusLabel(affiliate.status)}
                      </span>
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
                      <AffiliateActions affiliateId={affiliate.id} status={affiliate.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
