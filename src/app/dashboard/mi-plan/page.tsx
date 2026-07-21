import { getCurrentUser } from "@/lib/auth-session";
import { getUserSubscription } from "@/lib/subscription";
import { redirect } from "next/navigation";
import Link from "next/link";
import MiPlanClient from "./MiPlanClient";

export default async function MiPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER" && user.role !== "SELLER") redirect("/dashboard");

  const [sub, { upgrade }] = await Promise.all([getUserSubscription(user.id), searchParams]);

  // Se lee acá y baja como prop en vez de usar useSearchParams en el cliente:
  // así no hace falta envolver nada en Suspense y la página sigue igual.
  const autoUpgrade = upgrade === "premium";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← Volver al panel
          </Link>
          <h1 className="text-2xl font-black text-gray-900 mt-3">Mi plan</h1>
          <p className="text-gray-500 text-sm mt-1">Gestioná tu suscripción y método de pago.</p>
        </div>

        <MiPlanClient sub={sub} userRole={user.role as "OWNER" | "SELLER"} autoUpgrade={autoUpgrade} />
      </div>
    </div>
  );
}
