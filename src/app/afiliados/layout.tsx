import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-session";
import TermsUpdateBanner from "@/components/TermsUpdateBanner";
import AfiliadosNav from "./AfiliadosNav";

/* La guarda va ACÁ y no en la página, y ese es todo el punto.
 *
 * Estaba en `page.tsx`, pero el layout se dibuja ANTES de que la página alcance
 * a mandarte al login. O sea que el que tocaba "Postularme" sin sesión veía el
 * panel de afiliados aparecer un segundo —barra, menú y todo— y recién después
 * lo pateaba. Parecía que la página se rompía.
 *
 * Desde el layout no se dibuja nada: se decide antes de que exista la pantalla.
 *
 * Y decide DOS cosas, no una: la sesión y el ROL.
 *
 * Acá entra sólo quien se registró como afiliado. Una cuenta es una sola cosa
 * —tienda, afiliado o cliente—, cada una tiene su panel y no se cruzan. Antes
 * alcanzaba con estar logueado, así que una dueña terminaba mirando un panel
 * que no es el suyo, con "Postularme" en su propia tienda.
 *
 * A cada uno se lo manda a SU panel, no a un error ni al login: el que se
 * equivocó de puerta necesita que le abran la correcta, no que le cierren
 * ésta. El login sólo es para el que no tiene sesión. */
export default async function AfiliadosLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "OWNER") redirect("/dashboard");
  if (user.role !== "SELLER") redirect("/mi-cuenta");

  return (
    <>
      <AfiliadosNav />
      <div className="px-4 pt-3 max-w-5xl mx-auto"><TermsUpdateBanner /></div>
      {children}
    </>
  );
}
