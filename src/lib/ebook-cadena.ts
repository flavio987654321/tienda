import type { NextRequest } from "next/server";
import { despues } from "@/lib/despues";

/**
 * La cadena: que el ebook se siga escribiendo con la pestaña cerrada.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * EL PROBLEMA: EL BUCLE VIVÍA EN EL NAVEGADOR
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Un ebook son once llamadas al modelo, no una, porque un capítulo tarda medio
 * minuto y una función de este plan dura 60 segundos. Hasta hoy quien manejaba
 * ese bucle era la pantalla: pedía un capítulo, esperaba, pedía el que sigue.
 *
 * Lo escrito quedaba guardado —irse no perdía nada ni costaba otra generación—
 * pero **la escritura se frenaba**: no había nadie del otro lado. La persona
 * tenía que quedarse mirando dos o tres minutos, y el cartel se lo decía porque
 * era la verdad.
 *
 * Ahora cada eslabón llama al siguiente. La pantalla arranca el primero y se
 * puede ir.
 *
 * ── Por qué un `fetch` a nosotros mismos y no un bucle en `after()` ────────
 *
 * `after()` alarga la función para terminar una tarea, pero **no le regala
 * tiempo**: sigue atada al mismo `maxDuration` de 60 segundos. Once capítulos
 * ahí adentro se cortan en el tercero. Un `fetch` a nuestra propia ruta arranca
 * una función NUEVA, con sus 60 segundos enteros.
 *
 * ── Por qué un cron no servía ──────────────────────────────────────────────
 *
 * En este plan los crons corren una vez por día. Un ebook tardaría diez días.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA COOKIE VIAJA. NO HAY UN SECRETO NUEVO, Y ES A PROPÓSITO.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * El primer diseño era un secreto de servidor —tipo `CRON_SECRET`— y una puerta
 * aparte en la ruta para entrar con él. Eso obligaba a **dar vuelta el control
 * de dueño**: con la sesión, el dueño va adentro del `where` y es imposible
 * tocar el ebook de otro; con un secreto, el dueño hay que sacarlo de la fila
 * que se va a escribir, que es confiar en el dato para saltear el control que
 * ese dato tendría que pasar. Una puerta más, con menos candado, en la ruta que
 * más plata gasta.
 *
 * Reenviar la cookie del pedido original no abre ninguna puerta: el eslabón
 * siguiente entra por la MISMA que entró el navegador, con la misma sesión, el
 * mismo rol, el mismo dueño adentro del `where` y los mismos topes. Del lado de
 * la ruta no hay que cambiar una sola guarda.
 *
 * El costo es que la cadena dura lo que dura la sesión. Para un ebook de tres
 * minutos no es un costo.
 *
 * ── Lo que frena una cadena descontrolada ──────────────────────────────────
 *
 * Nada de esto es nuevo, y por eso alcanza: ya estaba puesto para el bucle del
 * navegador, que podía descontrolarse igual.
 *
 *   1. **El presupuesto de ESE ebook** — sus capítulos más un margen, en dos
 *      horas, contra el id del ebook. Es el techo duro: unas trece llamadas.
 *   2. **El candado** — dos eslabones a la vez no escriben dos veces.
 *   3. **Las ráfagas de la cuenta** — `permitirGeneracion`.
 *   4. **Que haya algo que escribir** — un ebook completo contesta que sí sin
 *      llamar al modelo, y ahí la cadena se corta sola.
 */

/**
 * De dónde sale la dirección para llamarnos a nosotros mismos.
 *
 * Del propio pedido y no de una variable de entorno: es la única que siempre
 * está bien —en local, en una previa de Vercel y en producción— sin que nadie
 * tenga que acordarse de configurar nada. `NEXT_PUBLIC_APP_URL` queda de
 * respaldo por si algún proxy dejara `req.url` inservible.
 */
/**
 * ⚠️ Y SE COMPRUEBA QUE SEA NUESTRA, porque acá viaja la cookie.
 *
 * `req.url` se arma con la cabecera `Host` del pedido, o sea con un dato que
 * manda quien llama. Sin esta lista, un pedido con un `Host` cualquiera hacía
 * que el eslabón siguiente saliera hacia ESE servidor **con la cookie de sesión
 * adentro**. En la práctica el daño era acotado —la cookie que viaja es la de
 * quien hizo el pedido, así que se la estaría regalando a sí mismo— pero es un
 * `fetch` a un lugar que elige un tercero, saliendo de nuestra red y con un
 * secreto en la mano. Eso no se deja abierto porque hoy no se pueda explotar.
 *
 * Y esta plataforma sirve dominios propios de cada persona, así que "el Host
 * siempre es el nuestro" no vale como supuesto. El panel, en cambio, vive
 * SIEMPRE en el dominio de la plataforma: es la única puerta desde la que se
 * arranca un ebook.
 *
 * Encontrado en la auditoría del panel del 09/09/26.
 */
function esNuestra(origen: string): boolean {
  try {
    const host = new URL(origen).hostname;
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (host === "tiendaapps.com" || host.endsWith(".tiendaapps.com")) return true;
    const propia = process.env.NEXT_PUBLIC_APP_URL;
    return !!propia && new URL(propia).hostname === host;
  } catch {
    return false;
  }
}

function nuestraDireccion(req: NextRequest): string | null {
  const respaldo = process.env.NEXT_PUBLIC_APP_URL || null;
  try {
    const origen = new URL(req.url).origin;
    return esNuestra(origen) ? origen : respaldo;
  } catch {
    return respaldo;
  }
}

/**
 * Llama al eslabón siguiente después de contestarle a quien está esperando.
 *
 * @param req    el pedido que estamos contestando, de donde salen la dirección
 *               y la cookie.
 * @param ruta   la ruta del eslabón que sigue (`/api/digitales/ia/ebook/paso`).
 * @param cuerpo lo que hay que mandarle.
 */
export function seguirLaCadena(
  req: NextRequest,
  ruta: string,
  cuerpo: Record<string, unknown>,
): void {
  const base = nuestraDireccion(req);
  const cookie = req.headers.get("cookie");

  /* Sin cookie no hay cadena: el eslabón siguiente rebotaría con un 401 y
     habríamos gastado un pedido para nada. No es un error —puede pasar si algún
     día esto se llama desde un script— así que se anota y se sigue. Lo escrito
     queda guardado igual; lo único que se pierde es que siga solo. */
  if (!base || !cookie) {
    console.warn("[ebook-cadena] no se pudo encadenar", { hayBase: !!base, hayCookie: !!cookie });
    return;
  }

  despues(async () => {
    const res = await fetch(`${base}${ruta}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify(cuerpo),
    });
    /* Se anota y no se reintenta. Un reintento automático contra un modelo que
       está teniendo un mal día gasta diez veces sin que nadie mire, que es la
       misma razón por la que el bucle del navegador frenaba al primer error.
       Lo escrito está guardado: la persona abre y aprieta "Seguir". */
    if (!res.ok) {
      console.error("[ebook-cadena] el eslabón siguiente falló", {
        ruta, estado: res.status,
      });
    }
  }, `ebook-cadena ${ruta}`);
}
