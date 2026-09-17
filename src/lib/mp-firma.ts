import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

/**
 * Que el aviso de pago venga DE VERDAD de Mercado Pago.
 *
 * ── Por qué esto es lo más importante de un webhook ─────────────────────────
 *
 * La dirección del webhook es pública: viaja en cada preferencia y cualquiera
 * que compre una vez la ve. Sin esta comprobación, mandar un `POST` con el
 * identificador de una orden ajena confirma esa orden **sin haber pagado nada**
 * — y en productos digitales eso es llevarse el archivo gratis.
 *
 * ── Por qué vive acá y no adentro de cada ruta ──────────────────────────────
 *
 * Porque hay CUATRO webhooks de pago —tiendas, digitales, suscripciones y la
 * canasta— y esto estaba escrito una sola vez, en el de tiendas. Con una copia
 * en cada uno alcanzaba con arreglar uno para que los otros se quedaran con el
 * agujero, en silencio y en la parte del sistema donde entra la plata. Se sacó
 * acá el 03/09/26 sin tocarle una línea al cuerpo.
 *
 * Y pasó exactamente eso: la mudanza se hizo sólo en dos de los cuatro. Las
 * copias de `suscripcion` y `canasta` quedaron afuera, idénticas pero sueltas,
 * hasta el 16/09/26 — cuando se le agregó acá la ventana de tiempo de abajo y
 * las dos copias se la habrían perdido. Ahora los cuatro importan de acá.
 *
 * ── Sin secreto configurado ─────────────────────────────────────────────────
 *
 * En producción se rechaza TODO y se grita en el log. Es deliberado: un webhook
 * de pagos sin verificar es peor que un webhook caído, porque el caído se nota.
 * En desarrollo se deja pasar, porque si no no se puede probar nada localmente.
 */

/**
 * Cuánto puede tener de viejo un aviso para que lo aceptemos.
 *
 * El manifiesto que se firma incluye un `ts`, pero hasta el 16/09/26 nadie
 * miraba cuán viejo era: una firma válida servía para siempre. Quien capturara
 * un aviso real —de un log, de un proxy, del panel de Mercado Pago— podía
 * reenviarlo cuantas veces quisiera, y cada reenvío se procesaba como un pago
 * nuevo.
 *
 * ── Por qué una hora y no cinco minutos ─────────────────────────────────────
 *
 * Porque el riesgo de cerrar de más es peor que el de cerrar de menos. Mercado
 * Pago reintenta un aviso que no pudo entregar, y cada reintento es un pedido
 * HTTP nuevo —con su propio `x-request-id`, así que va firmado de nuevo y trae
 * un `ts` fresco—. Pero eso es lo que se entiende de cómo funciona la firma, no
 * algo que esté prometido por escrito: si algún reintento reusara la firma
 * original, una ventana corta nos haría perder un pago de verdad, en silencio.
 *
 * Una hora deja pasar cualquier reintento razonable y aun así convierte una
 * firma robada en algo que sirve una hora en vez de para siempre. Y el rechazo
 * se loguea como error, no como aviso: si esto llegara a dispararse con un pago
 * legítimo, tiene que verse en los registros y no pasar por normal.
 *
 * El freno de verdad contra el aviso repetido no es éste: es que cada webhook
 * sea idempotente. Esto es una segunda puerta.
 */
const VENTANA_DE_LA_FIRMA_MS = 60 * 60 * 1000;

export function firmaDeMercadoPagoValida(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("CRÍTICO: MP_WEBHOOK_SECRET no está configurado en producción — todas las solicitudes son rechazadas");
      return false;
    }
    return true; // solo en dev/test sin secret
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id") ?? "";
  if (!xSignature) return false;

  const ts = xSignature.match(/ts=([^,]+)/)?.[1];
  const v1 = xSignature.match(/v1=([^,]+)/)?.[1];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  let coincide: boolean;
  try {
    /* `timingSafeEqual` y no `===`: comparar dos firmas con el operador normal
       corta en el primer carácter distinto, y ese tiempo se puede medir para ir
       adivinando la firma de a un byte. Tira si los largos difieren, y por eso
       va adentro del `try`. */
    coincide = timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
  if (!coincide) return false;

  /* La ventana de tiempo va DESPUÉS de comprobar la firma, no antes.
     El `ts` es parte del manifiesto firmado, así que recién cuando la firma dio
     bien sabemos que ese número lo puso Mercado Pago y no quien mandó el pedido.
     Mirarlo antes sería decidir con un dato que todavía no está probado. */
  const edad = edadDelAviso(ts);
  if (edad !== null && edad > VENTANA_DE_LA_FIRMA_MS) {
    console.error(
      "MP firma: aviso vencido — firma válida pero vieja, se rechaza",
      { dataId, edadEnMinutos: Math.round(edad / 60_000) }
    );
    return false;
  }

  return true;
}

/**
 * Hace cuánto se firmó el aviso, en milisegundos. `null` si no se puede saber.
 *
 * Devuelve `null` —y entonces el aviso pasa— cuando el `ts` no se entiende. Es a
 * propósito: el `ts` viaja adentro del manifiesto firmado, así que si la firma
 * dio bien ese valor lo escribió Mercado Pago. No poder interpretarlo significa
 * que cambiaron el formato, no que alguien lo esté falsificando, y tirar pagos
 * de verdad por un cambio de formato sería mucho peor que aceptarlos.
 *
 * Acepta segundos y milisegundos porque Mercado Pago documentó los dos en
 * distintos momentos. Se distinguen por el largo: diez dígitos son segundos.
 *
 * Un aviso "del futuro" también pasa: es el reloj de una de las dos puntas que
 * está corrido, y no hay nada que un atacante gane con eso.
 */
function edadDelAviso(ts: string): number | null {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return null;
  const enMs = ts.trim().length <= 11 ? n * 1000 : n;
  const edad = Date.now() - enMs;
  return edad < 0 ? 0 : edad;
}
