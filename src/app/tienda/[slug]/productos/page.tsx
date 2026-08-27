import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CONFIG } from "@/types/store-config";
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
 * Los otros siguen exactamente con la página que ya tenían: se movió entera a
 * `CatalogoGenerico.tsx` sin tocarle una línea del cuerpo.
 *
 * "fashion-noir" está por lo mismo que en el registro de templates: es el id
 * viejo de Aire y hay tiendas cuyo JSON todavía lo dice.
 *
 * ── Por qué entró Boho Terra ─────────────────────────────────────────────────
 * Su catálogo propio ya estaba hecho —lo dibuja el template, entre su barra y su
 * pie, y es lo que se ve al tocar "Ver colección completa"— pero faltaba anotarlo
 * acá. O sea que la MISMA dirección mostraba dos páginas distintas según cómo
 * llegaras. Medido en Amaranta, `/tienda/amaranta/productos`:
 *
 *   tocando "Ver colección completa"  →  20% Off por Transferencia
 *                                        AMARANTA ✓  CATEGORÍAS ▾ MUJER HOMBRE
 *                                        NUESTRA HISTORIA 🔍 👍 🔔 ♡ 👤
 *
 *   entrando por el link, o de Google →  ← VOLVER A LA TIENDA   Amaranta   🛒
 *
 * De la mitad para abajo eran idénticas: los mismos productos, los mismos
 * filtros. Lo que se perdía era la barra entera —la promo, las categorías, el
 * filtro de género, el buscador, la campanita, favoritos y la cuenta— justo para
 * el que llega de afuera, que es el que menos sabe dónde está.
 *
 * Es el mismo agujero que se tapó en la ficha de producto y por el mismo lado:
 * lo que ve quien navega y lo que ve quien abre el link tienen que ser la misma
 * pantalla. */
export const dynamic = "force-dynamic";

const CON_CATALOGO_PROPIO = new Set(["aire", "fashion-noir", "boho-terra", "urban-pulse"]);

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
    /* El DEFECTO, no cadena vacía. Casi ninguna tienda tiene escrita la clave
       `template`: sólo aparece cuando la dueña eligió uno a mano. Sin el defecto,
       todas esas caían al catálogo genérico mientras su PORTADA se dibujaba con
       Aire —que sí aplica el defecto—, así que la tienda cambiaba de idioma de
       diseño al entrar al catálogo. Las dos preguntas tienen que contestar igual. */
    template = (JSON.parse(store?.storeConfig || "{}") as { template?: string }).template
      ?? DEFAULT_CONFIG.template;
  } catch { /* config rota: se cae al catálogo genérico, que anda para cualquiera */ }

  /* Mirando OTRO diseño desde el editor, manda el de la dirección.
     Los templates linkean al catálogo con `?t=<su-id>&from=editor`, y esa
     convención ya la respeta el catálogo genérico, que tiene un vestido por
     template. Acá no se miraba, y por eso: con Aire guardado y Boho Terra en la
     previa, tocar "catálogo" mostraba el catálogo DE AIRE. Se veía el diseño
     equivocado justo cuando se estaba por elegir uno. */
  const sp = await props.searchParams;
  const tDeLaUrl = typeof sp?.t === "string" ? sp.t : null;
  if (tDeLaUrl) template = tDeLaUrl;

  /* El template lo dibuja la misma página de la tienda, que además decide si está
     publicada, si está cerrada y si quien mira es el dueño. Adentro, Aire mira la
     dirección y muestra el catálogo en vez de la portada. */
  if (CON_CATALOGO_PROPIO.has(template)) {
    return await TiendaPage(props as unknown as Parameters<typeof TiendaPage>[0]);
  }

  return <CatalogoGenerico />;
}
