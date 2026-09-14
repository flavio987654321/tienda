"use client";

import { useEffect } from "react";
import { registrarVisitaDigital, type PasoDigital } from "@/lib/visitas-digitales";

/**
 * Cuenta la visita. No dibuja nada.
 *
 * Va como componente aparte y no como un efecto adentro de `PaginaDeVenta`
 * porque el dibujante lo comparten la página pública, la previa del editor y
 * el checkout, y sólo la primera y el último tienen que contar. Quien pone
 * este componente decide; el dibujante no sabe nada de métricas.
 *
 * `apagado` es para la previa y para cuando se le muestra a la dueña algo que
 * no se le puede vender a nadie: ahí el servidor tampoco lo contaría, pero no
 * hace falta mandarle el ping para que lo descarte.
 */
export default function VisitaDigital({ paso, productoId, apagado = false }: {
  paso: PasoDigital;
  productoId: string;
  apagado?: boolean;
}) {
  useEffect(() => {
    if (apagado) return;
    registrarVisitaDigital(paso, productoId);
  }, [paso, productoId, apagado]);
  return null;
}
