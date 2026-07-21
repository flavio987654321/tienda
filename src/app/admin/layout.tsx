import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { needsMfaChallenge, hasVerifiedMfaFactor } from "@/lib/mfa";
import MfaRequiredGate from "./MfaRequiredGate";
import AdminSidebar from "./AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  // Segundo factor para las PÁGINAS del admin. Si tiene 2FA activo pero esta sesión
  // no lo pasó, va a /verificar-2fa (fuera de /admin para no hacer loop). Los
  // endpoints /api/admin se gatean aparte, en el middleware. Mismo helper en los
  // dos lados para que no se desincronicen.
  const supabase = await createSupabaseServerClient();
  if (await needsMfaChallenge(supabase)) {
    redirect("/verificar-2fa");
  }

  // El segundo factor es obligatorio para el admin. Antes alcanzaba con no
  // activarlo nunca: `needsMfaChallenge` solo exige el desafío a quien YA tiene
  // un factor, así que la cuenta sin configurar entraba con la contraseña sola.
  //
  // No se redirige a /admin/seguridad porque esa página también pasa por este
  // layout y el redirect se llamaría a sí mismo en loop. Se muestra la activación
  // en el lugar del panel: es la única acción que le queda, y así no puede quedar
  // trabado.
  if (!(await hasVerifiedMfaFactor(supabase))) {
    return <MfaRequiredGate />;
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <AdminSidebar user={{ name: user.name, email: user.email }} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
