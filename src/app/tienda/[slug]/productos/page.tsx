import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import TiendaPage from "../page";
import CatalogoGenerico from "./CatalogoGenerico";

/* ── El catálogo completo de una tienda ───────────────────────────────────────
 *
 * Esta dirección la comparten los once templates, y hasta acá todos veían la
 * MISMA página: un catálogo genérico, con su propio idioma de diseño, sin la
 * barra de arriba de su template y con un pie centrado que no era el suyo.
 *
 * Aire trae el suyo. No es un capricho de diseño: la página compartida no tiene
 * `<header>` —medido— así que al entrar al catálogo se perdían la barra, el
 * carrito y el pie de la tienda, y volvías a una pantalla que parecía de otro
 * sitio. El de Aire lo dibuja el propio template, así que todo eso viene puesto.
 *
 * Los otros diez siguen exactamente con la página que ya tenían: se movió entera
 * a `CatalogoGenerico.tsx` sin tocarle una línea del cuerpo.
 *
 * "fashion-noir" está por lo mismo que en el registro de templates: es el id
 * viejo de Aire y hay tiendas cuyo JSON todavía lo dice. */
export const dynamic = "force-dynamic";

const CON_CATALOGO_PROPIO = new Set(["aire", "fashion-noir"]);

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    select: { name: true },
  });
  if (!store) return {};
  const nombre = store.name ?? "la tienda";
  return {
    title: `Catálogo — ${nombre}`,
    description: `Todos los productos de ${nombre}.`,
    openGraph: { title: `Catálogo — ${nombre}`, type: "website", siteName: nombre },
  };
}

export default async function ProductosPage(props: Props) {
  const { slug } = await props.params;
  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    select: { storeConfig: true },
  });

  let template = "";
  try {
    template = (JSON.parse(store?.storeConfig || "{}") as { template?: string }).template ?? "";
  } catch { /* config rota: se cae al catálogo genérico, que anda para cualquiera */ }

  /* El template lo dibuja la misma página de la tienda, que además decide si está
     publicada, si está cerrada y si quien mira es el dueño. Adentro, Aire mira la
     dirección y muestra el catálogo en vez de la portada. */
  if (CON_CATALOGO_PROPIO.has(template)) {
    return await TiendaPage(props as unknown as Parameters<typeof TiendaPage>[0]);
  }

  return <CatalogoGenerico />;
}
