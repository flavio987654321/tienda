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
 * @param opciones.filtrarBots  Ver abajo. Por defecto sí.
 */
export async function visitaLegitima(
  req: NextRequest,
  clave: string,
  tope: number,
  opciones: { filtrarBots?: boolean } = {}
): Promise<boolean> {
  // El filtro de User-Agent se puede apagar, y no es un capricho: la lista de
  // `lib/bots` incluye "whatsapp" —para frenar al que busca la vista previa del
  // link— y no hay forma de distinguirlo con certeza del navegador que WhatsApp
  // abre adentro de la app.
  //
  // En una métrica, equivocarse cuesta una visita mal contada. En algo que
  // dispara un email de recuperación, equivocarse cuesta UNA VENTA: el carrito
  // no se guarda, el recordatorio no sale, y nadie se entera nunca. Con esa
  // asimetría, ahí conviene contar de más.
  //
  // Lo que frena el abuso de verdad no es el User-Agent —se falsifica escribiendo
  // una línea— sino el origen y el tope por IP, que quedan puestos igual.
  if (opciones.filtrarBots !== false && esBot(req.headers.get("user-agent"))) return false;

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
