export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import DashboardLayout from "@/components/DashboardLayout";
import { MessageCircle } from "lucide-react";
import LeadsClient from "./LeadsClient";

export default async function ConsultasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, commissionRate: true },
  });
  if (!store) redirect("/dashboard");

  const pendingAffiliateCount = await prisma.affiliate.count({
    where: { storeId: store.id, status: "PENDING" },
  });

  const leads = await prisma.lead.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      affiliate: { select: { id: true, user: { select: { name: true, email: true } } } },
    },
  });

  const pendingCount = leads.filter((l) => l.status === "PENDING").length;
  const confirmedCount = leads.filter((l) => l.status === "CONFIRMED").length;
  const totalCommissions = leads
    .filter((l) => l.status === "CONFIRMED" && l.commissionAmount)
    .reduce((sum, l) => sum + (l.commissionAmount ?? 0), 0);

  return (
    <DashboardLayout
      userName={user.name}
      userId={user.id}
      initialPendingAffiliateCount={pendingAffiliateCount}
    >
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <MessageCircle className="h-6 w-6 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900">Consultas</h1>
        </div>
        <p className="text-gray-500 ml-9">Clientes que consultaron por tus productos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Pendientes</p>
          <p className="text-3xl font-black text-gray-900">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Confirmadas</p>
          <p className="text-3xl font-black text-green-600">{confirmedCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Comisiones acreditadas</p>
          <p className="text-3xl font-black text-indigo-600">${totalCommissions.toLocaleString("es-AR")}</p>
        </div>
      </div>

      <LeadsClient
        initialLeads={leads.map((l) => ({
          id: l.id,
          productName: l.productName,
          productPrice: l.productPrice,
          customerName: l.customerName,
          customerPhone: l.customerPhone,
          customerMessage: l.customerMessage,
          status: l.status,
          commissionAmount: l.commissionAmount,
          commissionRate: l.commissionRate,
          confirmedAt: l.confirmedAt?.toISOString() ?? null,
          createdAt: l.createdAt.toISOString(),
          affiliate: l.affiliate
            ? { id: l.affiliate.id, userName: l.affiliate.user.name, userEmail: l.affiliate.user.email }
            : null,
        }))}
        commissionRate={store.commissionRate}
      />
    </DashboardLayout>
  );
}
