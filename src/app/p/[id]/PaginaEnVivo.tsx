"use client";

import { useEffect, useState } from "react";
import PaginaDeVenta, { type DatosDePagina } from "@/components/digitales/PaginaDeVenta";
import {
  AVISO_BORRADOR, AVISO_LISTA, AVISO_TOCAR, normalizarContenido, type PaginaVenta,
} from "@/lib/pagina-venta";

/**
 * La página de venta, siguiendo lo que se escribe en el editor.
 *
 * ── Por qué hace falta esto ─────────────────────────────────────────────────
 *
 * La previa del panel es un `iframe` a esta misma página, y tiene que serlo: un
 * recuadro angosto adentro del panel **no reacomoda el diseño**, porque las
 * medidas miran el ancho de la ventana y no el del recuadro. Pero un `iframe` es
 * otra ventana, así que no se entera de lo que se está tipeando del otro lado.
 *
 * Entonces el editor le manda el borrador por `postMessage` y esto lo dibuja. La
 * página sigue siendo la de verdad — el mismo componente, el mismo diseño, la
 * misma ventana propia—, sólo que con el texto de ahora en vez del guardado.
 *
 * ── Lo que se comprueba de cada aviso, y por qué ────────────────────────────
 *
 * Un `message` lo puede mandar **cualquier ventana**, incluida una página ajena
 * que meta ésta en un iframe suyo. Por eso:
 *
 *   1. **El origen tiene que ser el nuestro.** Sin esto, un sitio de afuera le
 *      cambia el precio y el botón a la página de venta de otro. La CSP ya sólo
 *      deja que nos enmarque nuestro propio dominio, pero eso es una segunda
 *      cerradura, no la única.
 *   2. **El borrador pasa por `normalizarContenido`**, igual que si viniera del
 *      servidor: lo que no está en el catálogo se descarta y cada texto se
 *      recorta. Un aviso no puede meter en la pantalla algo que la ruta que
 *      guarda nunca aceptaría.
 *
 * Y esto **no guarda nada**: es sólo lo que se ve. Lo que queda en la base pasa
 * siempre por la ruta, con su sesión y su dueño.
 */
export default function PaginaEnVivo(datos: DatosDePagina) {
  const [borrador, setBorrador] = useState<PaginaVenta | null>(null);

  useEffect(() => {
    const alAviso = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { tipo?: unknown; pagina?: unknown } | null;
      if (!d || typeof d !== "object" || d.tipo !== AVISO_BORRADOR) return;
      setBorrador(normalizarContenido(d.pagina));
    };
    window.addEventListener("message", alAviso);

    /* ⚠️ Avisar que ya escuchamos. El editor manda el borrador apenas cambia
       algo, pero este iframe tarda en cargar: sin este saludo, todo lo que se
       escriba mientras carga se pierde y la previa arranca desfasada. */
    if (window.parent !== window) {
      window.parent.postMessage({ tipo: AVISO_LISTA }, window.location.origin);
    }

    return () => window.removeEventListener("message", alAviso);
  }, []);

  /* Al tocar una sección acá adentro, el editor la abre del otro lado. La previa
     no cambia nada por su cuenta: sólo avisa cuál se tocó. */
  const alTocarSeccion = (clave: string) => {
    if (window.parent === window) return;
    window.parent.postMessage({ tipo: AVISO_TOCAR, clave }, window.location.origin);
  };

  return (
    <PaginaDeVenta
      {...datos}
      pagina={borrador ?? datos.pagina}
      alTocarSeccion={alTocarSeccion}
    />
  );
}
