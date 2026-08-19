export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/lib/auth-session";
import VendedorasClient from "./VendedorasClient";

export default async function VendedorasPage() {
  const user = await getCurrentUser();
  // Sin sesión NO se redirige a `/login`: esa ruta está fuera del `scope` del
  // manifiesto, y desde el panel instalado abría el sitio comercial entero. La
  // pantalla la dibuja el layout. El porqué largo está en `dashboard/layout.tsx`.
  if (!user) return null;
  return <VendedorasClient />;
}
