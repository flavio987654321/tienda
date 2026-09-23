import { useSyncExternalStore } from "react";
import { mostrarReloj } from "@/lib/oferta-salida";

/**
 * "Ahora", para las cuentas regresivas. Sólo navegador (es un hook).
 *
 * Un reloj compartido que late cada segundo mientras alguien lo escucha:
 * el cartel de la oferta de salida, la barra del precio de bienvenida y el
 * renglón del checkout. Los que tienen más de una hora por delante leen la
 * hora una vez y no se vuelven a dibujar.
 *
 * Es un `useSyncExternalStore` y no un `setInterval` con estado, por dos
 * motivos: en el servidor la hora es 0 (no hay reloj que leer) y la
 * hidratación no choca con un segundo que ya pasó; y no hay `setState`
 * adentro de un efecto, que es lo que dispara dibujos en cascada y lo que
 * la regla del proyecto no deja pasar.
 *
 * Estaba adentro de `CartelDeSalida`; se sacó cuando hicieron falta dos
 * relojes más, para que no hubiera tres latidos.
 */
let ahoraCache = 0;
const oyentes = new Set<() => void>();
let latido: number | null = null;
function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  ahoraCache = Date.now();
  if (latido === null) latido = window.setInterval(() => { ahoraCache = Date.now(); oyentes.forEach((f) => f()); }, 1000);
  return () => {
    oyentes.delete(avisar);
    if (oyentes.size === 0 && latido !== null) { window.clearInterval(latido); latido = null; }
  };
}
const sinSuscribir = () => () => {};
function leerAhora(): number {
  if (ahoraCache === 0) ahoraCache = Date.now();
  return ahoraCache;
}
const enElServidor = () => 0;

/**
 * La hora, latiendo sólo si a `venceEn` le queda menos de una hora y TODAVÍA
 * NO PASÓ. 0 en el servidor. Con `null` no hay nada que contar y no se
 * suscribe: sin esto, un checkout sin oferta se redibujaba entero cada
 * segundo.
 *
 * ⚠️ `venceEn > leerAhora()` no es una optimización de más: sin eso, un plazo
 * ya vencido sigue cumpliendo "le queda menos de una hora" —le queda menos
 * que cero— y el latido no se apaga NUNCA. La pantalla de pago se redibujaba
 * entera cada segundo, para siempre, mientras la persona escribe su correo.
 * El último latido, el que cruza el cero, sí ocurre: en ese dibujo la hora
 * ya es la de después del vencimiento, así que quien mira el reloj se entera
 * y recién ahí se corta la suscripción.
 */
export function useAhora(venceEn: number | null): number {
  const late = venceEn !== null && venceEn > leerAhora() && mostrarReloj(venceEn, leerAhora());
  return useSyncExternalStore(late ? suscribir : sinSuscribir, leerAhora, enElServidor);
}
