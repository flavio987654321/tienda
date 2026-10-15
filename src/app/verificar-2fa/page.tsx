import { redirect } from "next/navigation";
import { getUsuarioConSegundoPaso } from "@/lib/auth-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Verificar2faClient from "./Verificar2faClient";

export const dynamic = "force-dynamic";

// Elevación a aal2 para el admin. Vive fuera de /admin para que el gate del
// layout no la redirija en loop. Igual se protege por su cuenta: solo un admin
// que tiene 2FA pendiente de verificar debe llegar acá.
export default async function Verificar2faPage() {
  const sesion = await getUsuarioConSegundoPaso();
  if (!sesion) redirect("/login");
  // Esta pantalla es la del admin. Las demás cuentas tienen la suya en /verificar.
  if (sesion.user.role !== "ADMIN") redirect(sesion.faltaSegundoPaso ? "/verificar" : "/panel");

  const supabase = await createSupabaseServerClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  // Ya está elevado, o no tiene un factor que verificar → no hay nada que hacer acá.
  if (!aal || aal.nextLevel !== "aal2" || aal.currentLevel === "aal2") {
    redirect("/admin");
  }

  return <Verificar2faClient />;
}
