import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { panelDeRol } from "@/lib/panel-de-rol";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tieneGoogle } from "@/lib/alta-google";
import { tieneAltaPendiente } from "@/lib/alta-google-servidor";

export const dynamic = "force-dynamic";

export default async function PanelPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Entró con Google y no terminó el alta: le falta elegir cuenta, plan,
  // teléfono y aceptar los términos. Ver `lib/alta-google`.
  if (user.role === "BUYER" && (await tieneAltaPendiente(user.id))) {
    const { data } = await (await createSupabaseServerClient()).auth.getUser();
    if (tieneGoogle(data?.user)) redirect("/registro?google=1");
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });

  // La misma decisión que toman el nav y los menús de cuenta de las tiendas,
  // ahora desde el mismo lugar. Acá sí se puede consultar la base, así que se
  // pasa `tieneTienda`: quien es dueño de una tienda va al dashboard aunque su
  // rol todavía no diga OWNER.
  redirect(panelDeRol(user.role, !!store).href);
}
