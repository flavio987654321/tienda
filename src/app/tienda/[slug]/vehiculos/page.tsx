import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import TiendaPage from "../page";
import VehiculosGenerico from "./VehiculosGenerico";

/* ── Todos los vehículos de una tienda de autos ───────────────────────────────
 *
 * La misma idea que `/productos`: esta dirección la comparten los templates de
 * autos, y hasta el 13/10/26 todos veían la misma página (clara, con la barra
 * azul de Auto Motor). Auto Volt es oscuro y futurista, y al tocar "Ver todos
 * los vehículos" la tienda cambiaba de cara.
 *
 * Volt trae su catálogo propio —una ficha técnica que se ordena por columna—,
 * que lo dibuja el mismo template entre su barra y su pie: acá se le pasa la
 * página de la tienda, y el template mira la dirección y muestra el catálogo
 * (ver `useVistaTemplate`, con `catalogo: "vehiculos"`). Motor y Drive siguen
 * con la página de siempre, movida entera a `VehiculosGenerico.tsx`.
 *
 * `from=editor`: Volt no navega desde el editor (cambia de pantalla ahí
 * adentro), así que si se llega con eso es desde OTRO template mirado en la
 * previa, con Volt guardado. Ése tiene que ver la página genérica, que es la
 * que tiene "Volver al editor". */
export const dynamic = "force-dynamic";

const CON_CATALOGO_PROPIO = new Set(["auto-volt"]);

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const store = await prisma.store.findFirst({ where: { slug, isActive: true }, select: { name: true } });
  if (!store) return {};
  const nombre = store.name ?? "la tienda";
  return {
    title: `Vehículos — ${nombre}`,
    description: `Todos los vehículos de ${nombre}.`,
    openGraph: { title: `Vehículos — ${nombre}`, type: "website", siteName: nombre },
  };
}

export default async function VehiculosPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const store = await prisma.store.findFirst({ where: { slug, isActive: true }, select: { storeConfig: true } });

  let template = "";
  try {
    const cfg = JSON.parse(store?.storeConfig || "{}") as { template?: string; templateId?: string };
    template = cfg.template ?? cfg.templateId ?? "";
  } catch { /* config rota: la genérica anda para cualquiera */ }

  if (CON_CATALOGO_PROPIO.has(template) && sp?.from !== "editor") {
    /* Sin los parámetros de la dirección: la página de la tienda lee `pago` y
       `orden` (la vuelta de un pago), y `orden` acá es cómo se ordenan los
       vehículos. Los filtros los lee el template del navegador. */
    return await TiendaPage({ params, searchParams: Promise.resolve({}) });
  }

  return <VehiculosGenerico />;
}
