/**
 * Los filtros que tiene que pasar cualquier cosa que escriba una métrica desde
 * el navegador de un visitante.
 *
 * Estaban escritos adentro de `/api/store-views/[slug]`, que era el único
 * endpoint de este tipo. Con el segundo —los pasos del embudo— copiarlos era
 * garantizar que un día se arregle un agujero en uno y no en el otro, y el que
 * quede abierto no va a avisar: una métrica inflada sale por pantalla como un
 * número perfectamente creíble.
 *
 * Los tres filtros y por qué:
 *
 * 1. **Bots.** Googlebot y compañía ejecutan JavaScript, así que llegan hasta
 *    acá y entran como gente real. Nunca compran: inflan el numerador y hunden
 *    la conversión, que es justamente visitas → ventas.
 * 2. **El origen.** El endpoint es público y no pedía nada: cualquiera con la
 *    consola abierta podía mandar el POST en un bucle. No frena a alguien
 *    decidido —un header se falsifica— pero sí frena el bucle de una línea.
 * 3. **El límite por IP.** Lo que sí frena al decidido.
 */

import type { NextRequest } from "next/server";
import { esBot } from "@/lib/bots";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

/**
 * ¿Se cuenta este pedido?
 *
 * @param clave  La clave del límite por IP. Distinta por endpoint y por tienda,
 *               así que el cupo de las visitas no se gasta con el del embudo.
 * @param tope   Cuántos se le aceptan a una misma IP por hora.
 */
export async function visitaLegitima(
  req: NextRequest,
  clave: string,
  tope: number
): Promise<boolean> {
  if (esBot(req.headers.get("user-agent"))) return false;

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.get("host")) return false;
    } catch {
      // Un `origin` que no es una URL no lo manda un navegador.
      return false;
    }
  }

  try {
    const ip = getClientIp(req);
    if (!(await checkRateLimit(`${clave}:${ip}`, tope, 60 * 60 * 1000))) return false;
  } catch {
    // Si Redis no está disponible se cuenta igual. Esto son métricas, no un
    // control de acceso: perder datos reales durante una caída sería peor que
    // dejar pasar algunos de más.
  }

  return true;
}
