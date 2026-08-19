import type { Metadata } from "next";
import PanelAyuda from "@/components/panel/PanelAyuda";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import type { StoreType } from "@/lib/storeTypes";

/* La ayuda del dueño de tienda, adentro del `scope` de su app. Gemela de
   `/afiliados/ayuda`; el porqué está en `PanelAyuda`. */
export const metadata: Metadata = {
  title: "Centro de ayuda",
  // La que Google tiene que indexar es `/ayuda`, no esta copia.
  robots: { index: false, follow: false },
};

/**
 * El rubro de la tienda, para filtrar igual que `/ayuda`.
 *
 * Once artículos declaran `checkout`: diez son del modo carrito y uno del modo
 * consulta. Sin este dato, el dueño de un rubro por consulta —una inmobiliaria,
 * un hotel— abría la ayuda de su propio panel y encontraba diez artículos sobre
 * un checkout que su tienda no tiene, hablándole de una pantalla "Pedidos" que
 * en su menú se llama "Consultas". La ayuda pública ya filtraba por esto; esta
 * copia no, y era la que se abre desde adentro del panel, o sea la que más sabe
 * de quién está leyendo.
 *
 * No tira nunca: si la base no contesta, se cae para el lado de mostrar todo.
 * De más nunca dejó a nadie sin la respuesta que buscaba —el mismo criterio que
 * `quienLee` en `/ayuda`.
 */
async function rubroDe(ownerId: string): Promise<StoreType | undefined> {
  try {
    const store = await prisma.store.findUnique({
      where: { ownerId },
      select: { tipoTienda: true },
    });
    return (store?.tipoTienda as StoreType | undefined) ?? undefined;
  } catch (e) {
    console.error("[ayuda del panel] no se pudo leer el rubro de la tienda:", e);
    return undefined;
  }
}

/* La guarda propia, además de la del layout: el layout esconde la pantalla pero
   no evita que se ejecute. El detalle está en `/afiliados/ayuda`, la gemela. */
export default async function AyudaDelPanel({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") return null;

  const { q } = await searchParams;
  return (
    <PanelAyuda
      base="/dashboard/ayuda"
      rol="dueno"
      rubro={await rubroDe(user.id)}
      volverA="/dashboard"
      consulta={q ?? ""}
    />
  );
}
