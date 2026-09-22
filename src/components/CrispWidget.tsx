"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

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

export function sinChatDeSoporte(pathname: string): boolean {
  return SIN_CHAT.some((inicio) => pathname.startsWith(inicio));
}

export default function CrispWidget() {
  const pathname = usePathname();
  const oculto = sinChatDeSoporte(pathname);
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
