"use client";

import { useEffect } from "react";
import { registrarVisitaDigital, anotarOrigen, type PasoDigital } from "@/lib/visitas-digitales";
import { LATIDO_MS } from "@/lib/mirando-ahora";

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
    /* Al entrar a la página se anota de dónde vino, para que la orden lo lleve
       si termina comprando. Antes del ping y sin su dedup: ver `anotarOrigen`. */
    if (paso === "pagina") anotarOrigen(productoId);
    registrarVisitaDigital(paso, productoId);
  }, [paso, productoId, apagado]);

  /* ── El latido del puntito verde ──────────────────────────────────────
     "Sigo acá". Va por su propia ruta, que no toca la base y no guarda nada
     (ver `lib/mirando-ahora`): sólo suma una huella anónima a un contador de
     Redis que se borra solo a los tres minutos.

     ⚠️ SÓLO MIENTRAS LA PESTAÑA ESTÁ A LA VISTA. Sin eso, una pestaña
     olvidada en el fondo seguiría latiendo toda la tarde: el panel diría que
     hay diez personas mirando cuando no hay ninguna, y el cartelito pasaría a
     ser uno de esos números inventados que este proyecto no tiene. Al volver
     a la pestaña late enseguida, así que quien vuelve reaparece al toque.

     `keepalive` para que el último latido salga aunque la pestaña se esté
     cerrando, y todo adentro de un `catch` vacío: es un cartelito, y no
     puede ensuciar la consola de la página donde entra la plata. */
  useEffect(() => {
    if (apagado || paso !== "pagina") return;
    let vivo = true;
    const latir = () => {
      if (!vivo || document.visibilityState !== "visible") return;
      fetch(`/api/digitales/mirando/${productoId}`, { method: "POST", keepalive: true }).catch(() => {});
    };
    latir();
    const reloj = window.setInterval(latir, LATIDO_MS);
    document.addEventListener("visibilitychange", latir);
    return () => {
      vivo = false;
      window.clearInterval(reloj);
      document.removeEventListener("visibilitychange", latir);
    };
  }, [paso, productoId, apagado]);

  return null;
}
