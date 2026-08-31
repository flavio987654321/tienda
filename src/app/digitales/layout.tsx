import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth-session";
import { panelDeRol, nombreDeCuenta } from "@/lib/panel-de-rol";
import PanelRolAjeno from "@/components/panel/PanelRolAjeno";
import LoginGate from "@/components/panel/LoginGate";

export const metadata: Metadata = {
  title: "Productos Digitales — TiendaApps",
};

/* El panel de Productos Digitales.
 *
 * Hoy es sólo la puerta: adentro todavía no hay nada (eso es la Fase 3). Existe
 * igual porque sin él, la cuenta que se crea desde `/registro` no tendría a
 * dónde entrar, y `panelDeRol` mandaría a alguien a una ruta que da 404.
 *
 * La guarda va ACÁ y no en la página, por lo mismo que en los otros dos paneles:
 * el layout se dibuja antes de que la página alcance a patearte, así que desde
 * la página se ve el panel aparecer un segundo y parece que se rompe. Ver el
 * comentario largo en `afiliados/layout.tsx`.
 *
 * Y decide dos cosas, no una: la sesión y el ROL. Acá entra sólo quien se
 * registró en Productos Digitales — una cuenta es una sola cosa y los paneles no
 * se cruzan.
 *
 * Todavía NO lleva manifest, ícono ni `PWAManager`. No es un olvido: un
 * manifiesto a medias instala una app rota, y eso va con el panel de verdad.
 */
export default async function DigitalesLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    return <LoginGate titulo="Ingresá a tu panel" subtitulo="Usá tu cuenta de Productos Digitales." />;
  }

  if (user.role !== "DIGITAL") {
    return (
      <PanelRolAjeno
        destino={panelDeRol(user.role).href}
        raiz="/digitales"
        panel="el panel de Productos Digitales"
        cuenta={nombreDeCuenta(user.role)}
      />
    );
  }

  return <>{children}</>;
}
