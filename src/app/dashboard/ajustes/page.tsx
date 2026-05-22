import { getCurrentUser } from "@/lib/auth-session";
import { getUserSubscription } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import DangerZone from "@/app/dashboard/configuracion/DangerZone";
import AjustesClient from "./AjustesClient";

export default async function AjustesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/dashboard");

  const [sub, store] = await Promise.all([
    getUserSubscription(user.id),
    prisma.store.findUnique({ where: { ownerId: user.id }, select: { slug: true, customDomain: true } }),
  ]);

  const tier = (sub as any)?.tier ?? "BASIC";
  const isPremium = tier === "PREMIUM";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← Volver al panel
        </Link>
        <h1 className="text-2xl font-black text-gray-900 mt-3">Configuración</h1>
        <p className="text-gray-500 text-sm mt-1">Dominios, instalación como app y opciones de cuenta.</p>
      </div>

      <AjustesClient
        slug={store?.slug ?? ""}
        customDomain={store?.customDomain ?? null}
        isPremium={isPremium}
      />
      <div className="mt-5">
        <DangerZone />
      </div>
    </div>
  );
}
