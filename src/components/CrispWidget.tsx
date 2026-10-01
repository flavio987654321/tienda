"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { esElSitioDeLaPlataforma } from "@/lib/hosts-plataforma";

declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

const CRISP_WEBSITE_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID ?? "";

/* Dónde NO va el chat de soporte de TiendaApps. Son dos casos, y conviene no
 * mezclarlos:
 *
 *   - LOS PANELES. Adentro del panel el soporte se pide desde la ayuda del
 *     panel, y el globito flotante tapa botones: en el celular queda justo
 *     encima del de guardar. `/digitales` faltaba desde que ese panel existe,
 *     así que aparecía abajo a la derecha en todas sus pantallas.
 *
 *   - LO QUE ES DE OTRO. Una tienda, una previa, la página de venta de un
 *     producto digital o su checkout son de la vendedora, no nuestros. Un chat
 *     con NUESTRA marca ahí confunde a quien está por comprar —cree que le
 *     escribe a quien le vende— y en el celular se le pone encima del botón de
 *     pagar.
 *
 * Es una lista negra y no una blanca porque el sitio comercial tiene muchas
 * páginas y crece: una blanca dejaría sin soporte a la próxima que se agregue,
 * y el olvido se nota tarde. Acá el olvido es al revés y se ve enseguida. */
const SIN_CHAT = ["/dashboard", "/afiliados", "/digitales", "/admin", "/panel", "/tienda/", "/preview/", "/p/", "/v/"];

/* ⚠️ La ruta sola NO alcanza. `curso.tiendaapps.com` muestra `/p/<id>` y
 * `mitienda.tiendaapps.com` muestra `/tienda/mitienda`, pero lo hace el
 * middleware por adentro: el navegador sigue viendo `/`, y `usePathname`
 * devuelve eso. Con la lista de arriba sola, el chat salía en TODA página de
 * venta y tienda abierta por su dirección propia, que es justo como llegan
 * los compradores (01/10/26).
 *
 * Por eso además se mira el dominio, con la MISMA regla que usa el middleware
 * para decidir si traduce (`lib/hosts-plataforma`): lo que él trata como de
 * otro —un subdominio de tienda o de producto, o un dominio propio— acá no
 * lleva chat. */
export function sinChatDeSoporte(pathname: string, hostname?: string): boolean {
  if (hostname && !esElSitioDeLaPlataforma(hostname)) return true;
  return SIN_CHAT.some((inicio) => pathname.startsWith(inicio));
}

export default function CrispWidget() {
  const pathname = usePathname();
  /* `window` sólo existe en el navegador, y es el único lugar donde importa:
     el componente no dibuja nada y lo que decide pasa en los efectos. */
  const oculto = sinChatDeSoporte(pathname, typeof window === "undefined" ? undefined : window.location.hostname);
  const cargado = useRef(false);

  /* El script de Crisp NO se carga en las rutas ocultas, ni siquiera para
     esconderlo después: cargarlo y pedirle `chat:hide` deja ver el globito un
     instante, y mete un tercero adentro del panel para nada. Se carga la
     primera vez que se pisa una ruta donde sí va, y desde ahí queda: sacarlo
     del DOM no lo desmonta, lo esconde `chat:hide`. */
  useEffect(() => {
    if (!CRISP_WEBSITE_ID || oculto || cargado.current) return;
    cargado.current = true;
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
    const script = document.createElement("script");
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    document.head.appendChild(script);
  }, [oculto]);

  useEffect(() => {
    if (!cargado.current || !window.$crisp) return;
    window.$crisp.push(["do", oculto ? "chat:hide" : "chat:show"]);
  }, [oculto]);

  return null;
}
