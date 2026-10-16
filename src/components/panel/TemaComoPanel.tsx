"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

const sinCambios = () => () => {};

/**
 * Lleva el oscuro de afiliados (next-themes, clase `dark`) al `panel-oscuro:`
 * que usan las piezas compartidas de los paneles (Tutoriales, Ayuda).
 *
 * Esas piezas no pueden usar `dark:`: la clase `dark` está puesta en TODO el
 * sitio por defecto (`defaultTheme="dark"` en Providers), y en el panel de
 * tiendas en claro pintaba los títulos casi blancos sobre blanco. Así, cada
 * panel decide con su propio interruptor.
 *
 * En el servidor no se sabe el tema: hasta montar se dibuja en claro, y no hay
 * aviso de hidratación por un atributo distinto.
 */
export default function TemaComoPanel({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const montado = useSyncExternalStore(sinCambios, () => true, () => false);
  return <div data-panel-tema={montado && resolvedTheme === "dark" ? "oscuro" : "claro"}>{children}</div>;
}
