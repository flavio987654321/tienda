"use client";

import { useEffect, useState } from "react";

/**
 * ¿La página está en oscuro? Para el panel de afiliados, que lo marca con la
 * clase `dark` en `<html>`. Se mira la clase y no `useTheme()` porque en ese
 * panel `resolvedTheme` no siempre llega: medido el 15/10/26, decía claro con la
 * página en oscuro. Se sigue con un observer para cuando tocan el sol y la luna.
 */
export function useOscuroDelSitio(): boolean {
  const [oscuro, setOscuro] = useState(false);
  useEffect(() => {
    const raiz = document.documentElement;
    const leer = () => setOscuro(raiz.classList.contains("dark"));
    leer();
    const obs = new MutationObserver(leer);
    obs.observe(raiz, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return oscuro;
}
