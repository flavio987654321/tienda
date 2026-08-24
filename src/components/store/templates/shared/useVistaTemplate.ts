"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";

/* ── Qué pantalla del template se está mirando ────────────────────────────────
 *
 * Un template tiene varias pantallas —portada, catálogo, contacto, la ficha de un
 * producto— y hasta acá cada una era una PÁGINA: cambiar de pantalla significaba
 * que el navegador fuera a buscar otra cosa al servidor. En la tienda publicada
 * eso se veía como un parpadeo. En el EDITOR era peor: la vista previa vive
 * adentro de un panel, así que navegar sacaba a la dueña del editor por completo.
 * Y lo que le mostraba después era el catálogo del template GUARDADO, no el que
 * estaba mirando — se veía el diseño equivocado justo cuando estaba por elegir.
 *
 * Este hook centraliza la regla, que es una sola: **cambiar de pantalla nunca es
 * irse a otra página.**
 *
 *   · En el editor manda un estado. No hay direcciones que valgan ahí adentro, y
 *     además no tiene que poder escaparse de Diseño.
 *
 *   · En la tienda publicada se escribe SÓLO la dirección, con la History API.
 *     Next la sincroniza con `usePathname` a propósito (está documentado en
 *     `01-getting-started/04-linking-and-navigating.md`), y de `usePathname` sale
 *     la pantalla que devuelve este hook. O sea: se escribe la dirección nueva,
 *     el template se redibuja, y no viajó nada. El árbol no se desmonta — el
 *     carrito con cosas adentro y los filtros puestos siguen en pie.
 *
 *     Y la dirección igual CAMBIA, que es la mitad que suele perderse cuando algo
 *     "abre ahí mismo": el botón atrás vuelve solo (`popstate` mueve
 *     `usePathname`) y el link que el visitante copia es el de lo que está
 *     mirando. Entrando de cero por esa dirección la dibuja el servidor.
 *
 * Vive acá y no copiado en cada template por lo que ya pasó con las baldosas de
 * categorías: se arregló en uno y el mismo bug quedó vivo en el otro durante
 * meses. Si esto se arregla, se arregla para todos.
 *
 * Lo único que este hook NO mueve es el título de la pestaña, que lo pone el
 * servidor al entrar.
 */

export type VistaTemplate = "portada" | "catalogo" | "contacto" | "producto";

/* Se comparan ENTERAS y no con un "termina en /contacto": una tienda cuyo slug
   fuera justamente "contacto" tiene su portada en /tienda/contacto, que también
   termina así — y le habríamos abierto la pantalla de contacto en lugar de su
   portada, para siempre y sin que se entienda por qué. */
const RUTA_CONTACTO = /^\/tienda\/[^/]+\/contacto\/?$/;
const RUTA_CATALOGO = /^\/tienda\/[^/]+\/productos\/?$/;
/* Ésta además CAPTURA el id: de él sale QUÉ ficha dibujar. */
const RUTA_PRODUCTO = /^\/tienda\/[^/]+\/producto\/([^/]+)\/?$/;

export function useVistaTemplate({ isPreview, editMode, slug, templateId }: {
  isPreview: boolean;
  /** En modo edición los clics se ignoran: se está acomodando, no navegando. */
  editMode: boolean;
  slug: string | null | undefined;
  /** El id del template, para que el `?t=` de los links diga QUÉ diseño mostrar
   *  y no se cuele el guardado en la base. */
  templateId: string;
}) {
  const rutaActual = usePathname() ?? "";
  const [vistaEnPreview, setVistaEnPreview] = useState<VistaTemplate>("portada");
  /** Qué producto se mira en la previa. En la tienda lo dice la dirección. */
  const [productoEnPreview, setProductoEnPreview] = useState<string | null>(null);

  const enContacto = isPreview ? vistaEnPreview === "contacto" : RUTA_CONTACTO.test(rutaActual);
  const enCatalogo = isPreview ? vistaEnPreview === "catalogo" : RUTA_CATALOGO.test(rutaActual);
  const productoAbierto = isPreview
    ? (vistaEnPreview === "producto" ? productoEnPreview : null)
    : (RUTA_PRODUCTO.exec(rutaActual)?.[1] ?? null);
  const enProducto = !!productoAbierto;

  const urlTienda = `/tienda/${slug ?? ""}`;
  /* `?t=` y `from=editor` viajan SÓLO desde el editor. En la tienda publicada la
     dirección tiene que quedar limpia: es la que el visitante copia y comparte. */
  const sufijoEditor = isPreview ? `?t=${templateId}&from=editor` : "";

  const irA = (vista: VistaTemplate, url: string, productoId?: string) => {
    if (editMode) return;
    if (isPreview) {
      setVistaEnPreview(vista);
      setProductoEnPreview(vista === "producto" ? (productoId ?? null) : null);
      window.scrollTo({ top: 0 });
      return;
    }
    window.history.pushState(null, "", url);
    window.scrollTo({ top: 0 });
  };

  return {
    enContacto, enCatalogo, enProducto, productoAbierto,
    /** True cuando se está en la portada: ninguna de las otras. */
    enPortada: !enContacto && !enCatalogo && !enProducto,
    urlTienda, sufijoEditor,
    irA,
    irALaPortada: () => irA("portada", urlTienda + sufijoEditor),
    irAlCatalogo: () => irA("catalogo", `${urlTienda}/productos${sufijoEditor}`),
    irAContacto:  () => irA("contacto", `${urlTienda}/contacto${sufijoEditor}`),
    irAlProducto: (id: string) => irA("producto", `${urlTienda}/producto/${id}${sufijoEditor}`, id),
  };
}
