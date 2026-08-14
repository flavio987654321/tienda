import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

/**
 * Portero de los crons.
 *
 * El problema que cierra
 * ----------------------
 * Las dos rutas de cron tenían este chequeo, copiado igual en las dos:
 *
 *     if (process.env.CRON_SECRET && authHeader !== `Bearer ${...}`) → 401
 *
 * Mientras la variable exista, funciona. Pero está escrito de forma que **la
 * falta del secreto abre el endpoint** en vez de cerrarlo: sin `CRON_SECRET` la
 * condición es falsa y pasa cualquiera. El día que alguien la borre por error, o
 * se cree un entorno nuevo sin ella, `/api/cron/daily` queda público — y ese
 * cron manda mails, genera cupones y CIERRA TIENDAS por falta de pago. Una
 * puerta que se abre sola cuando falta la llave está al revés.
 *
 * Acá falla al revés: si el secreto no está y esto corre en un entorno
 * desplegado, se rechaza y se grita en el log. En la máquina de uno sigue
 * pasando sin secreto, que es lo que hace falta para poder probarlo a mano.
 *
 * `VERCEL_ENV` como señal de "esto está desplegado" es la misma que usa
 * `scripts/migrar-solo-en-produccion.mjs`, por el mismo motivo: es la única que
 * la plataforma garantiza y no depende de que alguien se acuerde de setear otra.
 *
 * @returns la respuesta a devolver si NO está autorizado, o `null` si puede pasar.
 */
export function rechazoDeCron(req: NextRequest): NextResponse | null {
  const secreto = process.env.CRON_SECRET;
  const enviado = req.headers.get("authorization");

  if (!secreto) {
    if (process.env.VERCEL_ENV) {
      console.error(
        "[cron] CRON_SECRET no está configurado en un entorno desplegado. " +
        "Se rechaza el pedido: sin secreto este endpoint sería público.",
      );
      return NextResponse.json({ error: "Cron mal configurado" }, { status: 500 });
    }
    // Local: sin secreto se deja pasar, que es como se prueba a mano.
    return null;
  }

  if (!esperado(enviado, `Bearer ${secreto}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

/**
 * Comparación de largo constante. No hay un ataque conocido contra esto —el
 * ruido de red se come la diferencia— pero comparar un secreto con `!==` es un
 * hábito que en otro contexto sí cuesta caro, y acá no cuesta nada evitarlo.
 */
function esperado(recibido: string | null, correcto: string): boolean {
  if (!recibido) return false;
  const a = Buffer.from(recibido);
  const b = Buffer.from(correcto);
  // `timingSafeEqual` tira si los largos difieren, y el largo no es secreto.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
