import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CONFIG } from "@/types/store-config";
import TiendaPage from "../page";

/* ── La página "Nosotros" de una tienda ───────────────────────────────────────
 *
 * No dibuja NADA por su cuenta: llama a la misma página de la tienda. Lo único
 * que cambia es la dirección, y el template se da cuenta solo (mira el final de
 * la url y muestra esta pantalla en vez de la portada). Es exactamente cómo
 * funciona `/contacto`, y a propósito.
 *
 * La página de la tienda hace mucho más que dibujar el template: decide si está
 * publicada, si está cerrada, si el que mira es el dueño, registra la visita,
 * arma el aviso de instalar la app y carga los scripts de seguimiento. Copiar
 * todo eso acá dejaría dos versiones de las mismas reglas, y el día que una
 * cambie la copia se entera último y sigue mostrando lo que no debe.
 *
 * Lo propio de esta ruta es el TÍTULO de la pestaña, que se arma abajo, y que
 * exista como dirección de verdad: se comparte, se guarda en favoritos, el botón
 * atrás del navegador vuelve bien y Google la puede indexar. Un "Nosotros" que
 * viviera sólo en un estado interno no tendría nada de eso.
 */
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pago?: string; orden?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    select: { name: true, description: true },
  });
  if (!store) return {};
  const nombre = store.name ?? "la tienda";
  /* La descripción de la tienda es literalmente el texto de esta pantalla, así
     que sirve tal cual para la etiqueta. Si no cargó ninguna, una frase que al
     menos dice de quién es la página. */
  const bajada = store.description?.trim()
    ? store.description.trim().slice(0, 300)
    : `Conocé ${nombre}: quiénes somos y cómo trabajamos.`;
  return {
    title: `Nosotros — ${nombre}`,
    description: bajada,
    openGraph: { title: `Nosotros — ${nombre}`, description: bajada, type: "website", siteName: nombre },
  };
}

/* Los templates que TIENEN esta pantalla.
 *
 * La ruta existe para cualquier tienda, pero el que la dibuja es el template, y
 * hoy la tiene Aire nada más. Sin este resguardo, entrar con otro template
 * devolvería la PORTADA con "Nosotros — Fulano" en la pestaña: una dirección que
 * promete una cosa y muestra otra, y encima indexable.
 *
 * "fashion-noir" está porque es el id viejo de Aire y hay tiendas cuyo JSON
 * todavía lo dice. */
const CON_PANTALLA_DE_NOSOTROS = new Set(["aire", "fashion-noir"]);

export default async function NosotrosPage(props: Props) {
  const { slug } = await props.params;
  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    select: { storeConfig: true },
  });

  let template = "";
  try {
    /* El DEFECTO, no cadena vacía. Casi ninguna tienda tiene escrita la clave
       `template`: aparece sólo cuando la dueña eligió uno a mano. Con cadena
       vacía, todas esas quedaban fuera de la lista de acá abajo y se las mandaba
       de vuelta a la portada — o sea que su propia pantalla era inalcanzable,
       mientras su portada se dibujaba con Aire, que sí aplica el defecto. Las dos
       preguntas tienen que contestar igual. (Es el mismo error que tenía la ruta
       del catálogo y la de contacto.) */
    template = (JSON.parse(store?.storeConfig || "{}") as { template?: string }).template
      ?? DEFAULT_CONFIG.template;
  } catch { /* config rota: se trata como si no tuviera la pantalla */ }

  // Se va a la portada y no a un 404: la tienda existe, lo que no existe es esta
  // pantalla suya. Un 404 haría pensar que la tienda entera no está.
  if (!CON_PANTALLA_DE_NOSOTROS.has(template)) redirect(`/tienda/${slug}`);

  return await TiendaPage(props);
}
