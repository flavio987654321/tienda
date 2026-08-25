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
export const RUTA_PRODUCTO = /^\/tienda\/[^/]+\/producto\/([^/]+)\/?$/;

/* Sin `editMode`: lo recibía para apagar los clics editando, y eso era el bug.
   Ver el comentario adentro de `irA`. */
/* Subir arriba del todo al cambiar de pantalla.
 *
 * No alcanza con `window.scrollTo`. En la tienda de verdad la que scrollea es la
 * ventana y funciona; en el EDITOR el template vive adentro de un panel con
 * scroll propio, y ahi la ventana no se mueve un pixel porque no es la que esta
 * scrolleada. Se veia asi: la dueña tocaba "Ofertas", el catalogo aparecia —pero
 * a mitad de pagina, con el titulo arriba fuera de vista— y parecia que el clic
 * habia hecho cualquier cosa.
 *
 * Entonces se busca quien scrollea de verdad: se sube por los padres desde la
 * raiz del template hasta el primero que tenga scroll propio. Si no hay ninguno
 * —la tienda publicada—, queda la ventana, que es el caso de siempre.
 *
 * La raiz se busca en el documento y no con un `useRef` porque el lint del repo
 * (`react-hooks/refs`) marca error si una funcion que lee un ref queda al alcance
 * del dibujado, y a esta la llaman handlers que se arman ahi. Cada template marca
 * su raiz con `data-template-raiz`. */
function subirArriba() {
  window.scrollTo({ top: 0 });
  let n = document.querySelector<HTMLElement>("[data-template-raiz]")?.parentElement ?? null;
  while (n) {
    const ov = getComputedStyle(n).overflowY;
    if ((ov === "auto" || ov === "scroll") && n.scrollHeight > n.clientHeight) { n.scrollTop = 0; return; }
    n = n.parentElement;
  }
}
export function useVistaTemplate({ isPreview, slug, templateId }: {
  isPreview: boolean;
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

  /* ── El candado del cambio de pantalla ──────────────────────────────────────
   * Medido en Aire con el navegador: tocando dos veces seguidas un botón que
   * cambia de pantalla se termina adentro de un producto CUALQUIERA. La pantalla
   * cambia al instante, así que entre el primer toque y el segundo ya se dibujó
   * la nueva y abajo del dedo quedó otra cosa, que se come el segundo toque.
   * Antes no pasaba porque el link recargaba la página. O sea: lo trajo abrir en
   * el lugar, y hay que devolverlo.
   * Lo consume el template apagando los clics de su raíz mientras dure. */
  const [cambiandoPantalla, setCambiandoPantalla] = useState(false);

  const irA = (vista: VistaTemplate, url: string, productoId?: string) => {
    /* Acá había un `if (editMode) return`, y dejaba el editor sin salida: tocar
       "Ver colección completa", una categoría del menú o "Ver todas las ofertas"
       mientras se editaba no hacía NADA. O sea que del template sólo se podía
       mirar y acomodar la portada. Es el mismo agujero que ya se tapó en Aire, y
       la razón por la que este archivo existe: para que se tape una vez.
       Que el clic no haga nada nunca es una opción: la conclusión de quien toca
       y no ve pasar nada es que está roto. */
    setCambiandoPantalla(true);
    setTimeout(() => setCambiandoPantalla(false), 400);
    /* Sin slug tampoco hay dirección que escribir. Pasa en la galería suelta
       (`/preview/<template>`), donde se mira cómo es un diseño sin que haya
       todavía una tienda detrás: escribir la dirección ahí daría
       `/tienda//producto/xxx`, que no lleva a ningún lado. La pantalla la manda
       el estado, igual que en la previa del editor. */
    if (isPreview || !slug) {
      setVistaEnPreview(vista);
      setProductoEnPreview(vista === "producto" ? (productoId ?? null) : null);
      subirArriba();
      return;
    }
    window.history.pushState(null, "", url);
    subirArriba();
  };

  return {
    enContacto, enCatalogo, enProducto, productoAbierto,
    /** True cuando se está en la portada: ninguna de las otras. */
    enPortada: !enContacto && !enCatalogo && !enProducto,
    urlTienda, sufijoEditor,
    /** True por 400ms después de cambiar de pantalla. Ver el candado, arriba. */
    cambiandoPantalla,
    irA,
    irALaPortada: () => irA("portada", urlTienda + sufijoEditor),
    irAlCatalogo: () => irA("catalogo", `${urlTienda}/productos${sufijoEditor}`),
    irAContacto:  () => irA("contacto", `${urlTienda}/contacto${sufijoEditor}`),
    irAlProducto: (id: string) => irA("producto", `${urlTienda}/producto/${id}${sufijoEditor}`, id),
  };
}
