import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import AffiliateActions from "@/components/affiliates/AffiliateActions";
import CopyLinkButton from "@/components/CopyLinkButton";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  DollarSign,
  ExternalLink,
  Link2,
  Mail,
  MapPin,
  Settings,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth-session";

function statusClass(status: string) {
  if (status === "APPROVED") return "bg-green-100 text-green-700";
  if (status === "REJECTED") return "bg-red-100 text-red-700";
  if (status === "PAUSED") return "bg-gray-100 text-gray-600";
  if (status === "REMOVED") return "bg-red-100 text-red-700";
  return "bg-yellow-100 text-yellow-700";
}

function statusLabel(status: string) {
  if (status === "APPROVED") return "Aprobada";
  if (status === "REJECTED") return "Rechazada";
  if (status === "PAUSED") return "Pausada";
  if (status === "REMOVED") return "Dada de baja";
  return "Pendiente";
}

function money(value: number) {
  return `$${value.toLocaleString("es-AR")}`;
}

function shortDate(date: Date) {
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function VendedorasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userId = user.id;

  const store = await prisma.store.findUnique({
    where: { ownerId: userId },
    include: {
      affiliates: {
        include: {
          user: { select: { name: true, email: true, image: true, city: true, phone: true, instagramHandle: true } },
          wallet: true,
          commissions: { orderBy: { createdAt: "desc" } },
          orders: {
            select: { id: true, total: true, status: true, createdAt: true },
            orderBy: { createdAt: "desc" },
          },
          _count: { select: { orders: true } },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      },
    },
  });

  const affiliates = store?.affiliates ?? [];
  const pending = affiliates.filter((affiliate) => affiliate.status === "PENDING");
  const teamAffiliates = affiliates.filter((affiliate) => affiliate.status !== "PENDING");
  const approved = affiliates.filter((affiliate) => affiliate.status === "APPROVED");
  const active = approved.filter((affiliate) => affiliate.isActive);
  const totalComisionesPagadas = affiliates.reduce(
    (sum, affiliate) => sum + affiliate.commissions.filter((commission) => commission.status === "PAID").reduce((s, commission) => s + commission.amount, 0),
    0
  );
  const totalComisionesPendientes = affiliates.reduce(
    (sum, affiliate) => sum + affiliate.commissions.filter((commission) => commission.status === "PENDING").reduce((s, commission) => s + commission.amount, 0),
    0
  );
  const ventasConfirmadas = affiliates.reduce(
    (sum, affiliate) => sum + affiliate.orders.filter((order) => ["CONFIRMED", "SHIPPED", "DELIVERED"].includes(order.status)).length,
    0
  );

  return (
    <DashboardLayout userName={user.name} userEmail={user.email} initialPendingAffiliateCount={pending.length}>
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
          { label: "Activos", value: active.length, icon: UserCheck, color: "text-indigo-600 bg-indigo-50" },
          { label: "Ventas confirmadas", value: ventasConfirmadas, icon: TrendingUp, color: "text-green-600 bg-green-50" },
          { label: "Comisiones pendientes", value: money(totalComisionesPendientes), icon: DollarSign, color: "text-purple-600 bg-purple-50" },
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
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-bold text-gray-900">Equipo de afiliados</h2>
            <p className="mt-1 text-sm text-gray-400">Controla permisos, links, ventas y pagos de cada persona.</p>
          </div>
          <div className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 ring-1 ring-gray-100">
            {money(totalComisionesPagadas)} pagadas
          </div>
        </div>
        {teamAffiliates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <div className="bg-purple-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Todavia no hay afiliados en el equipo</h3>
            <p className="text-gray-400 mb-4">
              Cuando apruebes una solicitud, esa persona pasa a esta seccion con sus links, ventas y comisiones.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {teamAffiliates.map((affiliate) => {
              const confirmedOrders = affiliate.orders.filter((order) => ["CONFIRMED", "SHIPPED", "DELIVERED"].includes(order.status));
              const grossSales = confirmedOrders.reduce((sum, order) => sum + order.total, 0);
              const pendingCommission = affiliate.commissions
                .filter((commission) => commission.status === "PENDING")
                .reduce((sum, commission) => sum + commission.amount, 0);
              const paidCommission = affiliate.commissions
                .filter((commission) => commission.status === "PAID")
                .reduce((sum, commission) => sum + commission.amount, 0);
              const sharePath = store ? `/tienda/${store.slug}?ref=${affiliate.id}` : "/";
              const displayName = affiliate.user.name || affiliate.user.email;

              return (
                <article key={affiliate.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="border-b border-gray-50 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-lg font-black text-white overflow-hidden">
                          {affiliate.user.image ? (
                            <img src={affiliate.user.image} alt={displayName} className="h-12 w-12 object-cover" />
                          ) : (
                            displayName[0]?.toUpperCase() ?? "A"
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-bold text-gray-950">{displayName}</h3>
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(affiliate.status)}`}>
                              {statusLabel(affiliate.status)}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {affiliate.user.email}
                            </span>
                            {affiliate.user.city && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {affiliate.user.city}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" />
                              Desde {shortDate(affiliate.requestedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <AffiliateActions affiliateId={affiliate.id} status={affiliate.status} />
                    </div>

                    {(affiliate.applicationMessage || affiliate.experience) && (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {affiliate.applicationMessage && (
                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Presentacion</p>
                            <p className="line-clamp-3 text-sm text-gray-600">{affiliate.applicationMessage}</p>
                          </div>
                        )}
                        {affiliate.experience && (
                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Experiencia</p>
                            <p className="line-clamp-3 text-sm text-gray-600">{affiliate.experience}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-px bg-gray-100 md:grid-cols-4">
                    {[
                      { label: "Ventas", value: affiliate._count.orders },
                      { label: "Confirmadas", value: confirmedOrders.length },
                      { label: "Generado", value: money(grossSales) },
                      { label: "Saldo", value: money(affiliate.wallet?.balance ?? 0) },
                    ].map((item) => (
                      <div key={item.label} className="bg-white p-4">
                        <p className="text-xs font-semibold text-gray-400">{item.label}</p>
                        <p className="mt-1 text-lg font-black text-gray-950">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-xl border border-gray-100 p-3">
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                          <DollarSign className="h-3.5 w-3.5" />
                          Pendiente
                        </div>
                        <p className="font-black text-purple-700">{money(pendingCommission)}</p>
                      </div>
                      <div className="rounded-xl border border-gray-100 p-3">
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                          <Wallet className="h-3.5 w-3.5" />
                          Pagado
                        </div>
                        <p className="font-black text-gray-950">{money(paidCommission)}</p>
                      </div>
                      <div className="rounded-xl border border-gray-100 p-3">
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                          <TrendingUp className="h-3.5 w-3.5" />
                          Total ganado
                        </div>
                        <p className="font-black text-gray-950">{money(affiliate.wallet?.totalEarned ?? 0)}</p>
                      </div>
                    </div>

                    {affiliate.status === "APPROVED" && (
                      <div className="rounded-xl bg-indigo-50 p-3">
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-indigo-500">
                          <Link2 className="h-3.5 w-3.5" />
                          Link de venta
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 text-xs text-gray-500 ring-1 ring-indigo-100">
                            /tienda/{store?.slug}?ref={affiliate.id}
                          </code>
                          <CopyLinkButton
                            value={sharePath}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                          />
                          <Link
                            href={sharePath}
                            target="_blank"
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Abrir
                          </Link>
                        </div>
                      </div>
                    )}

                    {(affiliate.socialUrl || affiliate.cvUrl || affiliate.user.instagramHandle || affiliate.user.phone) && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {affiliate.user.instagramHandle && (
                          <span className="rounded-full bg-pink-50 px-3 py-1 font-semibold text-pink-700">
                            @{affiliate.user.instagramHandle.replace(/^@/, "")}
                          </span>
                        )}
                        {affiliate.user.phone && (
                          <span className="rounded-full bg-green-50 px-3 py-1 font-semibold text-green-700">
                            {affiliate.user.phone}
                          </span>
                        )}
                        {affiliate.socialUrl && (
                          <a href={affiliate.socialUrl} target="_blank" rel="noreferrer" className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700">
                            Ver redes
                          </a>
                        )}
                        {affiliate.cvUrl && (
                          <a href={affiliate.cvUrl} target="_blank" rel="noreferrer" className="rounded-full bg-purple-50 px-3 py-1 font-semibold text-purple-700">
                            Ver CV
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
