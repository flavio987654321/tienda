"use client";

import { useEffect } from "react";
import { useSalida } from "./SalidaSinGuardar";

/**
 * Avisar antes de irse con algo escrito y sin guardar (o sin mandar).
 *
 * Hacen falta LOS DOS y cada uno tapa una salida distinta: `beforeunload`
 * la descarga de verdad —F5, cerrar la pestaña— y el proveedor de
 * `SalidaSinGuardar` los `<Link>` de adentro del panel, que no descargan
 * nada. La limpieza al desmontar no es un detalle: el interruptor vive
 * arriba y sobrevive a la pantalla.
 *
 * Es el mismo par que tiene el editor de la página de venta; acá para las
 * pantallas chicas de Marketing (un mail a medio escribir, una oferta a
 * medio armar).
 */
export function useAvisoSinGuardar(sucio: boolean) {
  useEffect(() => {
    if (!sucio) return;
    const alSalir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, [sucio]);

  const { setBloqueado } = useSalida();
  useEffect(() => {
    setBloqueado(sucio);
    return () => setBloqueado(false);
  }, [sucio, setBloqueado]);
}
