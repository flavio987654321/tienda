"use client";

import { useEffect } from "react";
import { ATRIBUTO_TEMA, aplicarTema, escucharSistema, temaGuardado } from "@/lib/tema-digitales";

/**
 * No dibuja nada. Se ocupa del tema del panel durante toda la visita: lo pinta,
 * lo mantiene al día y lo levanta al salir.
 *
 * ── Por qué pinta al montar, si ya lo pintó el script ────────────────────────
 * El `<script>` del layout corre nada más que cuando la página se CARGA. Al
 * panel también se llega con un `Link` desde la web —el botón "Mis productos"
 * del menú—, y ahí no hay carga: React inserta el `<script>` con innerHTML, y un
 * script insertado así no se ejecuta nunca. Entrando por ese camino, el atributo
 * no se escribía y una persona con el tema oscuro veía el panel en claro hasta
 * tocar algo.
 *
 * ── Por qué lo saca al desmontar ─────────────────────────────────────────────
 * El atributo vive en `<html>`, que es de todo el sitio y no sólo del panel.
 * Volviendo para atrás con el botón del navegador —que también es navegación de
 * React, sin recargar— se quedaba pegado, y con él el `color-scheme` que le
 * cuelga: la web quedaba con las barras de scroll y los desplegables del tema
 * del panel.
 *
 * Se desmonta al salir del panel y nada más: está en el layout, así que moverse
 * entre las pantallas de adentro no lo toca.
 *
 * ── Por qué acá y no en Configuración ────────────────────────────────────────
 * El tema es de TODO el panel. Viviendo en la pantalla que lo deja elegir, sólo
 * funcionaría estando parado ahí, que es justo donde menos falta hace.
 */
export default function TemaDelPanel() {
  useEffect(() => {
    aplicarTema(temaGuardado());
    const cortar = escucharSistema();
    return () => {
      cortar();
      document.documentElement.removeAttribute(ATRIBUTO_TEMA);
    };
  }, []);
  return null;
}
