import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth-session";
import SeguridadAfiliado from "./SeguridadAfiliado";

export const metadata: Metadata = { title: "Seguridad", robots: { index: false, follow: false } };

/**
 * La pestaña Seguridad del afiliado: la misma pieza que en tiendas y digitales
 * (ver `PanelSeguridad`). `return null` sin sesión y no `redirect`, por lo mismo
 * que `afiliados/ayuda`: el layout ya sabe mostrar el login adentro de la app.
 */
export default async function SeguridadPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SELLER") return null;
  return <SeguridadAfiliado />;
}
