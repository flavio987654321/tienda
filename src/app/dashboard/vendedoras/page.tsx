export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Image from "next/image";
import DashboardLayout from "@/components/DashboardLayout";
import AffiliateActions from "@/components/affiliates/AffiliateActions";
import CopyLinkButton from "@/components/CopyLinkButton";
import AutoRefresh from "@/components/AutoRefresh";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  DollarSign,
  ExternalLink,
  Link2,
  Mail,
  MapPin,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth-session";
import { PRO_MAX_AFFILIATES } from "@/lib/planLimits";
import { hasActivePremium, SUB_STATUS_SELECT } from "@/lib/subscription";
import LimitePlanBanner from "@/components/dashboard/LimitePlanBanner";
import AffiliateToggle from "./AffiliateToggle";
import MetasWidget from "./MetasWidget";
import WithdrawalPayButton from "@/components/affiliates/WithdrawalPayButton";
import { esVentaConfirmada } from "@/lib/order-status";

function statusClass(status: string) {
  if (status === "APPROVED") return "bg-green-100 text-green-700";
  if (status === "REJECTED") return "bg-red-100 text-red-700";
  if (status === "PAUSED") return "bg-gray-100 text-gray-600";
  if (status === "REMOVED") return "bg-red-100 text-red-700";
  return "bg-yellow-100 text-yellow-700";
}

/* Estos carteles van pegados al nombre y la foto de una persona, así que
   "Aprobada / Pausada / Dada de baja" le ponen género a alguien que puede no
   tenerlo. Y "aprobado/a" con barra se lee mal.
   La salida no es la barra: es no hablar de la persona. Estas palabras dicen en
   qué situación está la afiliación, no cómo se llama quien la tiene. */
function statusLabel(status: string) {
  if (status === "APPROVED") return "En el equipo";
  if (status === "REJECTED") return "Solicitud rechazada";
  if (status === "PAUSED") return "En pausa";
  if (status === "REMOVED") return "Fuera del equipo";
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
          wallet: {
            include: {
              withdrawals: {
                where: { status: "PENDING" },
                orderBy: { createdAt: "desc" },
              },
            },
          },
          commissions: {
            orderBy: { createdAt: "desc" },
            include: { order: { select: { id: true, total: true, createdAt: true } } },
          },
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
  const teamAffiliates = affiliates.filter((affiliate) => affiliate.status !== "PENDING" && affiliate.status !== "REMOVED");
  const approved = affiliates.filter((affiliate) => affiliate.status === "APPROVED");
  const active = approved.filter((affiliate) => affiliate.isActive);

  // Misma cuenta que hace cumplir /api/vendedoras/[id] al aprobar (APPROVED +
  // isActive): si el aviso contara distinto, diría "te queda lugar" y el botón
  // igual rebotaría.
  const subTier = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: SUB_STATUS_SELECT,
  });
  const maxAffiliates = hasActivePremium(subTier) ? null : PRO_MAX_AFFILIATES;
  const atAffiliateLimit = maxAffiliates !== null && active.length >= maxAffiliates;
  const now = new Date();
  const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endLastMonth   = new Date(now.getFullYear(), now.getMonth(), 1);

  // Para tiendas de consulta (AUTOS), las comisiones vienen de Leads, no de Orders/Commissions
  const isInquiryStore = store?.tipoTienda === "AUTOS";

  // Leads por afiliado — solo para AUTOS
  type LeadStats = { total: number; confirmed: number; earned: number };
  const leadsMap = new Map<string, LeadStats>();
  if (isInquiryStore && store) {
    const affiliateLeads = await prisma.lead.findMany({
      where: { storeId: store.id, affiliateId: { not: null } },
      select: { affiliateId: true, status: true, commissionAmount: true, createdAt: true },
    });
    for (const lead of affiliateLeads) {
      if (!lead.affiliateId) continue;
      const prev = leadsMap.get(lead.affiliateId) ?? { total: 0, confirmed: 0, earned: 0 };
      prev.total++;
      if (lead.status === "CONFIRMED") {
        prev.confirmed++;
        prev.earned += lead.commissionAmount ?? 0;
      }
      leadsMap.set(lead.affiliateId, prev);
    }
  }

  const rankingData = approved
    .map((a) => {
      let thisMonth: number;
      let lastMonth: number;
      let confirmedCount: number;
      let grossSales: number;

      if (isInquiryStore) {
        // AUTOS: sin granularidad mensual en wallet, se usa totalEarned como aproximación
        thisMonth = a.wallet?.totalEarned ?? 0;
        lastMonth = 0;
        confirmedCount = leadsMap.get(a.id)?.confirmed ?? 0;
        grossSales = leadsMap.get(a.id)?.earned ?? 0;
      } else {
        thisMonth = a.commissions
          .filter((c) => c.status === "PAID" && new Date(c.createdAt) >= startThisMonth)
          .reduce((s, c) => s + c.amount, 0);
        lastMonth = a.commissions
          .filter((c) => c.status === "PAID" && new Date(c.createdAt) >= startLastMonth && new Date(c.createdAt) < endLastMonth)
          .reduce((s, c) => s + c.amount, 0);
        const confirmedOrders = a.orders.filter((o) => esVentaConfirmada(o.status));
        confirmedCount = confirmedOrders.length;
        grossSales = confirmedOrders.reduce((s, o) => s + o.total, 0);
      }

      return {
        id: a.id,
        name: a.user.name || a.user.email,
        thisMonth,
        lastMonth,
        change: lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null,
        confirmedOrders: confirmedCount,
        grossSales,
      };
    })
    .sort((a, b) => b.thisMonth - a.thisMonth);
  const topThisMonth = rankingData[0]?.thisMonth ?? 0;

  // Total comisiones pagadas: para AUTOS usa wallet.totalEarned; para ROPA usa Commission records
  const totalComisionesPagadas = isInquiryStore
    ? affiliates.reduce((sum, a) => sum + (a.wallet?.totalEarned ?? 0), 0)
    : affiliates.reduce(
        (sum, affiliate) => sum + affiliate.commissions.filter((c) => c.status === "PAID").reduce((s, c) => s + c.amount, 0),
        0
      );

  /* Antecedentes de quien se postula.
   *
   * Al aprobar una solicitud lo único que se veía era lo que la persona
   * escribió de sí misma: presentación, experiencia, un link a sus redes.
   * Todo eso lo redacta quien pide entrar. No había ni un dato del sistema.
   *
   * Esto agrega tres, y los tres se pueden verificar solos: en cuántas tiendas
   * ya la aprobaron, cuántas ventas confirmadas lleva, y desde cuándo tiene
   * cuenta. Sin nombrar las tiendas — a la competencia no le importa cuáles
   * son, le importa si la persona vende.
   *
   * Lo que a propósito NO se muestra son las bajas ni los rechazos. Dar de baja
   * es una decisión de una sola persona y no siempre es por algo que se hizo
   * mal: alcanza con que un dueño se enoje para que a alguien le quede una
   * marca que arrastra a todas las tiendas siguientes. Antecedentes, sí; lista
   * negra, no.
   */
  type Antecedentes = { tiendas: number; ventas: number; desde: Date | null };
  const antecedentes = new Map<string, Antecedentes>();
  if (pending.length > 0) {
    const ids = [...new Set(pending.map((a) => a.userId))];
    const [aprobadas, cuentas] = await Promise.all([
      // status APPROVED deja afuera esta misma solicitud, que está en PENDING.
      prisma.affiliate.findMany({
        where: { userId: { in: ids }, status: "APPROVED" },
        select: { userId: true, orders: { select: { status: true } } },
      }),
      prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, createdAt: true } }),
    ]);
    const altaPorUsuario = new Map(cuentas.map((u) => [u.id, u.createdAt]));
    for (const id of ids) {
      antecedentes.set(id, { tiendas: 0, ventas: 0, desde: altaPorUsuario.get(id) ?? null });
    }
    for (const fila of aprobadas) {
      const dato = antecedentes.get(fila.userId);
      if (!dato) continue;
      dato.tiendas++;
      dato.ventas += fila.orders.filter((o) => esVentaConfirmada(o.status)).length;
    }
  }

  // Retiros pendientes enriquecidos con antigüedad en días
  const pendingWithdrawalsDetail = affiliates
    .flatMap((a) =>
      (a.wallet?.withdrawals ?? [])
        .filter((w) => w.status === "PENDING")
        .map((w) => ({
          ...w,
          affiliateName: a.user.name || a.user.email,
          affiliatePhone: a.user.phone,
          daysOld: Math.floor((now.getTime() - new Date(w.createdAt).getTime()) / 86_400_000),
        }))
    )
    .sort((a, b) => b.daysOld - a.daysOld);

  // Para AUTOS: contar consultas confirmadas (ventas); para ROPA: órdenes confirmadas
  const ventasConfirmadas = isInquiryStore
    ? Array.from(leadsMap.values()).reduce((sum, l) => sum + l.confirmed, 0)
    : affiliates.reduce(
        (sum, affiliate) => sum + affiliate.orders.filter((order) => esVentaConfirmada(order.status)).length,
        0
      );

  return (
    <DashboardLayout userName={user.name} userId={user.id} initialPendingAffiliateCount={pending.length}>
      <AutoRefresh />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Afiliados</h1>
          <p className="text-gray-500 mt-1">
            Revisá solicitudes, aprobá permisos y controlá comisiones.
          </p>
        </div>
      </div>

      <AffiliateToggle
        enabled={Boolean(store?.affiliatesEnabled)}
        commissionRate={store?.commissionRate ?? 10}
        acceptsRewardCoupons={Boolean(store?.acceptsRewardCoupons)}
        activeAffiliatesCount={active.length}
        pendingBalance={affiliates.reduce((sum, a) => sum + (a.wallet?.balance ?? 0), 0)}
        hasMercadoPago={!!store?.mpAccessToken}
        storeType={store?.tipoTienda}
      />

      {store?.affiliatesEnabled && <MetasWidget />}

      <div className={`transition-opacity ${store?.affiliatesEnabled ? "opacity-100" : "opacity-30 pointer-events-none select-none"}`}>

      {pendingWithdrawalsDetail.length > 0 && (
        <section className="mb-8">
          <h2 className="font-bold text-gray-900 mb-1">Transferencias pendientes</h2>
          <p className="text-sm text-gray-400 mb-4">
            Recibiste un email con los datos bancarios de cada retiro. Realizá la transferencia por home banking.
          </p>
          {pendingWithdrawalsDetail.some((w) => w.daysOld >= 15) && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-red-800">
                <span className="font-bold">Hay retiros de más de 15 días sin procesar.</span>{" "}
                Tu equipo de afiliadas está esperando — priorizá estas transferencias para mantener la confianza del equipo.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendingWithdrawalsDetail.map((w) => (
              <div key={w.id} className={`bg-white rounded-2xl border p-5 flex flex-col gap-3 ${w.daysOld >= 15 ? "border-red-200" : "border-amber-100"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-gray-900">{w.affiliateName}</p>
                    <p className={`text-2xl font-black ${w.daysOld >= 15 ? "text-red-600" : "text-amber-600"}`}>
                      ${w.amount.toLocaleString("es-AR")}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Solicitado el {new Date(w.createdAt).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold shrink-0 ${w.daysOld >= 15 ? "bg-red-100 text-red-700" : w.daysOld >= 7 ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"}`}>
                    {w.daysOld === 0 ? "hoy" : `hace ${w.daysOld}d`}
                  </span>
                </div>
                {w.notes && (
                  <div className="rounded-xl bg-amber-50 p-3 text-xs text-gray-600 font-mono whitespace-pre-wrap break-all">
                    {w.notes}
                  </div>
                )}
                <WithdrawalPayButton withdrawalId={w.id} amount={w.amount} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {[
          { label: "Pendientes", value: pending.length, icon: Clock, color: "text-yellow-600 bg-yellow-50" },
          { label: "Activos", value: active.length, icon: UserCheck, color: "text-indigo-600 bg-indigo-50" },
          { label: isInquiryStore ? "Consultas vendidas" : "Ventas confirmadas", value: ventasConfirmadas, icon: TrendingUp, color: "text-green-600 bg-green-50" },
          { label: "Retiros en proceso", value: money(pendingWithdrawalsDetail.reduce((s, w) => s + w.amount, 0)), icon: DollarSign, color: "text-purple-600 bg-purple-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
            <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>
              <Icon className="h-5 w-5" />
            </div>
            {/* Truncado por "Retiros en proceso", que es plata: en una tarjeta de
                media pantalla, un monto de seis o siete cifras se desbordaba. */}
            <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate" title={String(value)}>{value}</p>
            <p className="text-sm text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Antes acá no había ningún aviso: la dueña se enteraba del tope recién al
          apretar "Aprobar" y comerse el error, con la persona esperando del otro lado. */}
      {atAffiliateLimit && (
        <LimitePlanBanner
          titulo={`Llegaste a los ${maxAffiliates} afiliados del plan Tienda Pro`}
          queGanas="afiliados sin límite"
          comoLiberar={
            <>
              No vas a poder aprobar más solicitudes hasta hacer lugar. Para liberar uno, pausá
              a alguien que no esté vendiendo desde la lista de abajo — los pausados no ocupan
              lugar y podés reactivarlos cuando quieras.
            </>
          }
        />
      )}

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="font-bold text-gray-900 mb-4">Solicitudes pendientes</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pending.map((affiliate) => {
              const hoja = antecedentes.get(affiliate.userId);
              return (
              <div key={affiliate.id} className="bg-white rounded-2xl border border-yellow-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900">{affiliate.user.name}</p>
                    <p className="truncate text-sm text-gray-400">{affiliate.user.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Solicitó permiso el {affiliate.requestedAt.toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(affiliate.status)}`}>
                    {statusLabel(affiliate.status)}
                  </span>
                </div>

                {hoja && (
                  <div className="mt-4 rounded-xl border border-gray-100 p-3">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-400">
                      <UserCheck className="h-3.5 w-3.5" />
                      Antecedentes
                    </p>
                    {hoja.tiendas === 0 ? (
                      /* Sin historial NO es una advertencia: casi todo el mundo
                         empieza en algún lado, y pintar esto de rojo haría que
                         nadie apruebe a quien recién arranca. Es un dato gris. */
                      <p className="text-sm text-gray-500">
                        Todavía no vende en ninguna tienda — esta sería su primera.
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600">
                        Ya vende en{" "}
                        <strong className="text-gray-900">
                          {hoja.tiendas} tienda{hoja.tiendas === 1 ? "" : "s"}
                        </strong>
                        {" · "}
                        <strong className="text-gray-900">
                          {hoja.ventas} venta{hoja.ventas === 1 ? "" : "s"}
                        </strong>{" "}
                        confirmada{hoja.ventas === 1 ? "" : "s"}
                      </p>
                    )}
                    {hoja.desde && (
                      <p className="mt-1 text-xs text-gray-400">
                        Con cuenta en TiendaApps desde{" "}
                        {hoja.desde.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
                      </p>
                    )}
                  </div>
                )}

                {affiliate.applicationMessage && (
                  <div className="mt-4 rounded-xl bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Presentación</p>
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
                  <AffiliateActions
                    affiliateId={affiliate.id}
                    status={affiliate.status}
                    affiliateName={affiliate.user.name || undefined}
                    walletBalance={affiliate.wallet?.balance ?? 0}
                  />
                </div>
              </div>
              );
            })}
          </div>
        </section>
      )}

      {rankingData.length >= 2 && (
        <section className="mb-8">
          <h2 className="font-bold text-gray-900 mb-1">Ranking del mes</h2>
          <p className="text-sm text-gray-400 mb-4">
            {now.toLocaleString("es-AR", { month: "long", year: "numeric" })} — comisiones pagadas por afiliada
          </p>
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            {rankingData.map((r, i) => (
              <div key={r.id} className={`flex items-center gap-4 px-5 py-3 ${i < rankingData.length - 1 ? "border-b border-gray-50" : ""}`}>
                <span className={`w-6 text-center text-sm font-black ${i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-800" : "text-gray-300"}`}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{r.name}</p>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className="h-1.5 rounded-full bg-indigo-400 transition-all"
                      style={{ width: topThisMonth > 0 ? `${Math.round((r.thisMonth / topThisMonth) * 100)}%` : "0%" }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{money(r.thisMonth)}</p>
                  {r.change !== null && (
                    <p className={`text-xs font-semibold ${r.change >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {r.change >= 0 ? "+" : ""}{r.change}% vs mes ant.
                    </p>
                  )}
                  {r.change === null && r.lastMonth === 0 && (
                    <p className="text-xs text-gray-300">sin historial</p>
                  )}
                </div>
                <div className="text-right text-xs text-gray-400 hidden sm:block">
                  <p>{r.confirmedOrders} ventas</p>
                  <p>{money(r.grossSales)} generado</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        {/* La fichita del total va abajo del título en angosto: al lado, entre el
            subtítulo largo y el monto, no entraba ninguno de los dos cómodo. */}
        <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900">Equipo de afiliados</h2>
            <p className="mt-1 text-sm text-gray-400">Controla permisos, links, ventas y pagos de cada persona.</p>
          </div>
          <div className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 ring-1 ring-gray-100">
            {money(totalComisionesPagadas)} pagadas
          </div>
        </div>
        {teamAffiliates.length === 0 ? (
          /* `p-8` en angosto: con 64px de padding de cada lado, en 360 al texto le
             quedaban 200px y el título salía partido en tres renglones. */
          <div className="bg-white rounded-2xl border border-gray-100 p-8 sm:p-16 text-center">
            <div className="bg-purple-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Todavía no hay afiliados en el equipo</h3>
            <p className="text-gray-400 mb-4">
              Cuando apruebes una solicitud, esa persona pasa a esta sección con sus links, ventas y comisiones.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {teamAffiliates.map((affiliate) => {
              const confirmedOrders = affiliate.orders.filter((order) => esVentaConfirmada(order.status));
              const grossSales = confirmedOrders.reduce((sum, order) => sum + order.total, 0);
              const walletBalance = affiliate.wallet?.balance ?? 0;
              const paidCommission = affiliate.commissions
                .filter((commission) => commission.status === "PAID")
                .reduce((sum, commission) => sum + commission.amount, 0);
              const affLeads = isInquiryStore ? (leadsMap.get(affiliate.id) ?? { total: 0, confirmed: 0, earned: 0 }) : null;
              const sharePath = store ? `/tienda/${store.slug}?ref=${affiliate.id}` : "/";
              const displayName = affiliate.user.name || affiliate.user.email;

              return (
                <article key={affiliate.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="border-b border-gray-50 p-5">
                    {/* En celular esto era una fila: a la izquierda el nombre,
                        a la derecha las acciones. Con una solicitud pendiente
                        "las acciones" son un recuadro azul con tres viñetas
                        explicando qué pasa si la aprobás — o sea media pantalla
                        de texto peleando por el ancho con el nombre. Apilado en
                        celular y en fila recién desde `sm`. */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-lg font-black text-white overflow-hidden">
                          {affiliate.user.image ? (
                            <Image src={affiliate.user.image} alt={displayName} width={48} height={48} className="h-12 w-12 object-cover" />
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
                      {/* `shrink-0` + un ancho máximo: sin eso, en la grilla de
                          dos columnas el recuadro de la solicitud pendiente se
                          come el lugar del nombre y lo parte en tres renglones. */}
                      <div className="w-full sm:w-auto sm:max-w-xs sm:shrink-0">
                        <AffiliateActions
                          affiliateId={affiliate.id}
                          status={affiliate.status}
                          affiliateName={affiliate.user.name || undefined}
                          walletBalance={affiliate.wallet?.balance ?? 0}
                        />
                      </div>
                    </div>

                    {(affiliate.applicationMessage || affiliate.experience) && (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {affiliate.applicationMessage && (
                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Presentación</p>
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

                  {/* `truncate` + `title` en el número: sin eso un saldo de
                      siete cifras se sale de la celda en celular, donde la tira
                      es de dos columnas. */}
                  <div className="grid grid-cols-2 gap-px bg-gray-100 md:grid-cols-4">
                    {(isInquiryStore ? [
                      { label: "Consultas", value: affLeads!.total, aPagar: false },
                      { label: "Ventas", value: affLeads!.confirmed, aPagar: false },
                      { label: "Comisiones", value: money(affLeads!.earned), aPagar: false },
                      { label: "A pagar", value: money(walletBalance), aPagar: true },
                    ] : [
                      { label: "Ventas", value: affiliate._count.orders, aPagar: false },
                      { label: "Confirmadas", value: confirmedOrders.length, aPagar: false },
                      { label: "Generado", value: money(grossSales), aPagar: false },
                      { label: "A pagar", value: money(walletBalance), aPagar: true },
                    ]).map((item) => (
                      <div key={item.label} className="bg-white p-4">
                        <p className="text-xs font-semibold text-gray-400">{item.label}</p>
                        <p
                          title={String(item.value)}
                          className={`mt-1 truncate text-base font-black sm:text-lg ${item.aPagar ? "text-purple-700" : "text-gray-950"}`}
                        >
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4 p-5">
                    {/* Acá había tres cajas del mismo tamaño: "Saldo wallet",
                        "Pagado" y "Total ganado".
                        La primera mostraba EXACTAMENTE el mismo número que la
                        celda "Saldo" de la tira de arriba — el mismo dato dos
                        veces en la misma tarjeta, a cuatro centímetros. Quedó
                        una sola vez, arriba y en violeta, porque es el único de
                        los siete que pide hacer algo: es plata que se debe.
                        Los otros dos son historial. Van en un renglón: en
                        celular esas tres cajas se apilaban y estiraban la
                        tarjeta media pantalla para mostrar datos que no se
                        miran todos los días. */}
                    <p className="text-xs text-gray-400">
                      Ya cobró{" "}
                      <span className="font-semibold text-gray-600">
                        {money(isInquiryStore ? (affiliate.wallet?.totalWithdrawn ?? 0) : paidCommission)}
                      </span>
                      {" · "}
                      Ganó en total{" "}
                      <span className="font-semibold text-gray-600">{money(affiliate.wallet?.totalEarned ?? 0)}</span>
                    </p>

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
      </div>
    </DashboardLayout>
  );
}
