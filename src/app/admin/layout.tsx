import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { needsMfaChallenge } from "@/lib/mfa";
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

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <AdminSidebar user={{ name: user.name, email: user.email }} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
