"use client";
import { useEffect, useRef } from "react";

/**
 * El botón "atrás" (sobre todo el del celular) cierra la ventana en vez de
 * sacarte de la tienda (06/10/26). Se usa adentro de la ventana: montada =
 * abierta.
 *
 * Al abrir se agrega una entrada al historial, con la misma dirección; "atrás"
 * la saca y eso cierra. Si se cierra de otra forma (la X, el fondo, Escape) se
 * saca a mano, para que el próximo "atrás" no haga nada raro.
 *
 * El `setTimeout` es por el modo estricto de React en desarrollo: monta,
 * desmonta y vuelve a montar al toque. Sin la espera, el primer desmontaje
 * hacía un `back()` que llegaba tarde y cerraba la ventana recién abierta.
 *
 * Next acepta `history.pushState` propio (ver la guía "Linking and Navigating",
 * "Native History API"): no recarga ni pierde su estado.
 */
/* El back() que hacemos nosotros al cerrar con la X también dispara popstate,
   y llega tarde: si justo se abrió otra ventana, la cerraba. Ese se ignora. */
let atrasPropio = false;

export function useCerrarConAtras(cerrar: () => void) {
  const cerrarRef = useRef(cerrar);
  useEffect(() => { cerrarRef.current = cerrar; });

  useEffect(() => {
    let marca: string | null = null;
    let porAtras = false;
    const espera = window.setTimeout(() => {
      marca = Math.random().toString(36).slice(2);
      window.history.pushState({ ...(window.history.state ?? {}), ventanaAbierta: marca }, "");
    }, 0);
    const onPop = () => {
      if (atrasPropio) { atrasPropio = false; return; }
      if (!marca || porAtras) return;
      porAtras = true;
      cerrarRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.clearTimeout(espera);
      window.removeEventListener("popstate", onPop);
      if (marca && !porAtras && window.history.state?.ventanaAbierta === marca) {
        atrasPropio = true;
        // Si no hay otra ventana escuchando, la marca se limpia igual.
        window.addEventListener("popstate", () => { window.setTimeout(() => { atrasPropio = false; }, 0); }, { once: true });
        window.history.back();
      }
    };
  }, []);
}
