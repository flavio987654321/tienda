"use client";

import { useSyncExternalStore } from "react";
import { esAppInstalada } from "@/lib/pwa";

/* ¿Esto está corriendo como app instalada?
 *
 * Existe porque `scope` en el manifest NO encierra a nadie: solo le dice al
 * navegador hasta dónde la app es propia. Un `<Link>` de Next a una ruta de
 * afuera es navegación del cliente —React dibuja otra página en la misma
 * ventana— así que el navegador nunca ve una navegación que pudiera interceptar
 * y la PWA se convierte, sin avisar, en un navegador de todo el sitio. Quien
 * quiera sacar al usuario del panel tiene que decidirlo en el código, y para eso
 * necesita saber si está adentro de la app.
 *
 * Va con `useSyncExternalStore` y no con estado más efecto por lo mismo que
 * `pushSupported` en PushBellContext: `isPwa()` toca `window`, que en el
 * servidor no existe. La tercera función es la respuesta del servidor y React
 * vuelve a preguntar al hidratar.
 *
 * La suscripción sí hace algo, a diferencia de la de PushBellContext:
 * `display-mode` puede cambiar con la página abierta. Si alguien instala la app
 * desde la pestaña que ya tenía abierta, esa misma pestaña pasa a standalone sin
 * recargar, y los links tienen que empezar a comportarse como los de una app.
 */
function suscribir(alCambiar: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia("(display-mode: standalone)");
  mql.addEventListener("change", alCambiar);
  return () => mql.removeEventListener("change", alCambiar);
}

/* Va con `esAppInstalada` y no con `isPwa`: de esto salen decisiones de flujo
   —a dónde lleva el logo del panel, si el botón de volver existe, qué links se
   abren afuera— y la permisiva le cree al `?source=pwa` de la url, que cualquiera
   puede pegar en un link compartido. Lo cosmético (esperar un poco más antes de
   animar algo) sigue usando la permisiva y está bien así. */
export function useIsPwa(): boolean {
  return useSyncExternalStore(suscribir, esAppInstalada, () => false);
}
