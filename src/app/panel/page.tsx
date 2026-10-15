import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { panelDeRol, seguridadDelPanel } from "@/lib/panel-de-rol";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tieneAltaPendiente, entraSinContrasena } from "@/lib/alta-google-servidor";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ seguridad?: string }> };

export default async function PanelPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Entró con Google y no terminó el alta: le falta elegir cuenta, plan,
  // teléfono y aceptar los términos. Ver `lib/alta-google`.
  if (user.role === "BUYER" && (await tieneAltaPendiente(user.id, user.email))) {
    const { data } = await (await createSupabaseServerClient()).auth.getUser();
    if (data?.user && (await entraSinContrasena(data.user))) redirect("/registro?google=1");
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });

  // La misma decisión que toman el nav y los menús de cuenta de las tiendas,
  // ahora desde el mismo lugar. Acá sí se puede consultar la base, así que se
  // pasa `tieneTienda`: quien es dueño de una tienda va al dashboard aunque su
  // rol todavía no diga OWNER.
  const destino = panelDeRol(user.role, !!store).href;
  /* `/panel?seguridad=1`: los mails de seguridad llevan acá, sin saber de qué
     panel es la cuenta, y acá se traduce a la pestaña Seguridad de cada uno. */
  if ((await searchParams).seguridad === "1") redirect(seguridadDelPanel(destino));
  redirect(destino);
}
