import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CONFIG } from "@/types/store-config";
import TiendaPage from "../page";

/* ── La página de contacto de una tienda ──────────────────────────────────────
 *
 * No dibuja NADA por su cuenta: llama a la misma página de la tienda. Lo único
 * que cambia es la dirección, y el template se da cuenta solo (mira el final de
 * la url y muestra su pantalla de contacto en vez de la portada).
 *
 * Está hecho así a propósito. La página de la tienda hace mucho más que dibujar
 * el template: decide si la tienda está publicada, si está cerrada, si el que
 * mira es el dueño, registra la visita, arma el aviso de instalar la app y carga
 * los scripts de seguimiento. Copiar todo eso acá habría dejado dos versiones de
 * las mismas reglas, y el día que una cambie —una tienda que se da de baja, por
 * ejemplo— la copia se entera último y sigue mostrando lo que no debe.
 *
 * Lo que sí es propio de esta ruta es el TÍTULO de la pestaña, que abajo se
 * arma aparte.
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
    select: { name: true },
  });
  if (!store) return {};
  const nombre = store.name ?? "la tienda";
  return {
    title: `Contacto — ${nombre}`,
    description: `Escribinos y te respondemos. Contacto de ${nombre}.`,
    openGraph: { title: `Contacto — ${nombre}`, type: "website", siteName: nombre },
  };
}

/* Los templates que TIENEN pantalla de contacto.
 *
 * La ruta existe para cualquier tienda, pero el que dibuja esta pantalla es el
 * template, y hoy la tiene Aire nada más. Sin este resguardo, entrar a
 * /tienda/cualquiera/contacto con otro template devolvía la PORTADA con el
 * título "Contacto — Fulano" en la pestaña: una dirección que promete una cosa y
 * muestra otra, y encima indexable.
 *
 * "fashion-noir" está por lo mismo que en el registro de templates: es el id
 * viejo de Aire y hay tiendas cuyo JSON todavía lo dice. */
const CON_PANTALLA_DE_CONTACTO = new Set(["aire", "fashion-noir", "aurora"]);

export default async function ContactoPage(props: Props) {
  const { slug } = await props.params;
  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    select: { storeConfig: true },
  });

  let template = "";
  try {
    /* El DEFECTO, no cadena vacia. Casi ninguna tienda tiene escrita la clave
       `template`: aparece solo cuando la dueña eligio uno a mano. Con cadena
       vacia, todas esas quedaban fuera de la lista y se las mandaba de vuelta a
       la portada — o sea que su pantalla de contacto era inalcanzable, mientras
       su portada se dibujaba con Aire, que si aplica el defecto. Mismo error que
       tenia la ruta del catalogo. */
    template = (JSON.parse(store?.storeConfig || "{}") as { template?: string }).template
      ?? DEFAULT_CONFIG.template;
  } catch { /* config rota: se trata como si no tuviera la pantalla */ }

  // Se va a la portada y no a un 404: la tienda existe, lo que no existe es esta
  // pantalla suya. Un 404 haría pensar que la tienda entera no está.
  if (!CON_PANTALLA_DE_CONTACTO.has(template)) redirect(`/tienda/${slug}`);

  return await TiendaPage(props);
}
