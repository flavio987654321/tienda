import { after } from "next/server";

/**
 * Trabajo que tiene que pasar SÍ o SÍ, pero después de contestarle a quien
 * está esperando: avisos, mails, notificaciones push.
 *
 * El problema que resuelve
 * -----------------------
 * En todo el proyecto había dos formas de disparar estos avisos, y las dos
 * están mal por motivos opuestos:
 *
 *   1) `mandarMail().catch(...)` — sin esperar. En serverless la función se
 *      puede congelar apenas devuelve la respuesta, y una promesa que quedó
 *      pendiente NO se resuelve. El aviso se pierde, o aparece mucho después
 *      cuando la plataforma reutiliza el contenedor. No falla: llega tarde o no
 *      llega, en silencio y sin dejar rastro. Probando el aviso de carrito
 *      abandonado pasó exactamente eso — llegó minutos tarde sin que nadie
 *      tocara nada.
 *
 *   2) `await mandarMail()` — esperando. Confiable, pero le cobra el tiempo del
 *      mail a quien está del otro lado. En el checkout son dos mails y una
 *      notificación: el comprador que acaba de pagar mira una pantalla en blanco
 *      mientras se habla con Resend.
 *
 * `after` de Next hace las dos cosas bien: la respuesta sale enseguida y la
 * plataforma se compromete a no matar la función hasta que la tarea termine
 * (por debajo es `waitUntil`). Estable desde Next 15.1; acá estamos en 16.
 *
 * Cuándo NO usarlo
 * ----------------
 * Cuando el que llama necesita saber si salió bien. Esto se traga los errores a
 * propósito —los loguea y sigue— porque son avisos: que falle un mail no puede
 * voltear un pedido que ya se cobró. Si el resultado importa, va `await` normal.
 *
 * El `try` de afuera
 * ------------------
 * `after` sólo vale adentro del pedido de alguien (route handler, server
 * action, server component). Si algún día esto se llama desde un script o un
 * worker, tirar sería peor que el problema que arregla: ahí cae al
 * comportamiento viejo, que es exactamente lo que hacía antes. Nunca queda peor
 * que como estaba.
 *
 * @param etiqueta corta y buscable, va en el log si algo falla ("checkout: mail al comprador")
 */
export function despues(tarea: () => Promise<unknown>, etiqueta: string): void {
  const correr = async () => {
    try {
      await tarea();
    } catch (err) {
      console.error(`[despues] ${etiqueta}:`, err);
    }
  };

  try {
    after(correr);
  } catch {
    void correr();
  }
}
