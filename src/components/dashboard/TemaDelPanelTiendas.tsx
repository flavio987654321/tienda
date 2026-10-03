"use client";

import { useEffect } from "react";
import { ATRIBUTO_TEMA, aplicarTemaTiendas, escucharSistemaTiendas, temaGuardadoTiendas } from "@/lib/tema-tiendas";

/**
 * No dibuja nada: pinta el tema del panel de tiendas al entrar, sigue al
 * sistema mientras sea "automático" y saca el atributo al salir del panel.
 *
 * Es la misma pieza que `TemaDelPanel` de digitales, y por los mismos motivos:
 * al panel también se llega con un `Link` (el script del layout no corre en
 * ese caso) y el atributo vive en `<html>`, que es de todo el sitio — si no se
 * saca al salir, la web queda con el `color-scheme` del panel.
 */
export default function TemaDelPanelTiendas() {
  useEffect(() => {
    aplicarTemaTiendas(temaGuardadoTiendas());
    const cortar = escucharSistemaTiendas();
    return () => {
      cortar();
      document.documentElement.removeAttribute(ATRIBUTO_TEMA);
    };
  }, []);
  return null;
}
