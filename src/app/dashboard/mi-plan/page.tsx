import { getCurrentUser } from "@/lib/auth-session";
import { getUserSubscription } from "@/lib/subscription";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import MiPlanClient from "./MiPlanClient";

export default async function MiPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string }>;
}) {
  const user = await getCurrentUser();
  // Sin sesión NO se redirige a `/login`: esa ruta está fuera del `scope` del
  // manifiesto, y desde el panel instalado abría el sitio comercial entero. La
  // pantalla la dibuja el layout. El porqué largo está en `dashboard/layout.tsx`.
  if (!user) return null;
  if (user.role !== "OWNER" && user.role !== "SELLER") redirect("/dashboard");

  const [sub, { upgrade }] = await Promise.all([getUserSubscription(user.id), searchParams]);

  // Se lee acá y baja como prop en vez de usar useSearchParams en el cliente:
  // así no hace falta envolver nada en Suspense y la página sigue igual.
  const autoUpgrade = upgrade === "premium";

  // Con la barra del panel, como las otras dieciséis pantallas.
  //
  // Era la única que no la tenía: se dibujaba sola, a pantalla completa, y el
  // único modo de salir era un "← Volver al panel" arriba de todo. Entrar acá
  // era salirse del panel — perdías el menú, los puntitos de avisos y la
  // campanita, y para ir a cualquier otro lado había que volver primero al
  // inicio. En el teléfono era peor, porque ahí el menú es lo único que hay.
  //
  // El link de volver ya no va: con el menú al lado no tiene a dónde llevar que
  // no esté a un toque.
  return (
    <DashboardLayout userName={user.name} userId={user.id}>
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900">Mi plan</h1>
          <p className="text-gray-500 text-sm mt-1">Gestioná tu suscripción y método de pago.</p>
        </div>

        <MiPlanClient sub={sub} userRole={user.role as "OWNER" | "SELLER"} autoUpgrade={autoUpgrade} />
      </div>
    </DashboardLayout>
  );
}
