import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Verificar2faClient from "./Verificar2faClient";

export const dynamic = "force-dynamic";

// Elevación a aal2 para el admin. Vive fuera de /admin para que el gate del
// layout no la redirija en loop. Igual se protege por su cuenta: solo un admin
// que tiene 2FA pendiente de verificar debe llegar acá.
export default async function Verificar2faPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Solo el admin usa 2FA en esta etapa. Cualquier otro rol no tiene nada que verificar.
  if (user.role !== "ADMIN") redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  // Ya está elevado, o no tiene un factor que verificar → no hay nada que hacer acá.
  if (!aal || aal.nextLevel !== "aal2" || aal.currentLevel === "aal2") {
    redirect("/admin");
  }

  return <Verificar2faClient />;
}
