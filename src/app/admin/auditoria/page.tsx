import { prisma } from "@/lib/prisma";
import { ShieldCheck } from "lucide-react";
import AuditoriaAdmin from "./AuditoriaAdmin";

export const dynamic = "force-dynamic";

export default async function AdminAuditoriaPage() {
  const [records, actionLogs] = await Promise.all([
    prisma.deletedAccountAudit.findMany({
      orderBy: { deletedAt: "desc" },
    }),
    prisma.adminActionLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const serialized = records.map((r: typeof records[number]) => ({
    ...r,
    deletedAt: r.deletedAt.toISOString(),
    accountCreatedAt: r.accountCreatedAt.toISOString(),
    tcAffiliateAcceptedAt: r.tcAffiliateAcceptedAt?.toISOString() ?? null,
    tcOwnerAcceptedAt: r.tcOwnerAcceptedAt?.toISOString() ?? null,
    subscriptionCreatedAt: r.subscriptionCreatedAt?.toISOString() ?? null,
  }));

  const serializedLogs = actionLogs.map((l: typeof actionLogs[number]) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-black text-white">Auditoría legal</h1>
        </div>
        <p className="text-gray-400 text-sm ml-12">
          Registro permanente de cuentas eliminadas · T&amp;C aceptados · IP y fechas
        </p>
      </div>
      <AuditoriaAdmin records={serialized} actionLogs={serializedLogs} />
    </div>
  );
}
