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
 * Porque hay DOS webhooks de pago —el de tiendas y el de digitales— y estaba
 * escrito una sola vez, en el de tiendas. Con una copia en cada uno alcanzaba
 * con arreglar uno para que el otro se quedara con el agujero, en silencio y en
 * la parte del sistema donde entra la plata. Se sacó acá el 03/09/26 sin tocarle
 * una línea al cuerpo.
 *
 * ── Sin secreto configurado ─────────────────────────────────────────────────
 *
 * En producción se rechaza TODO y se grita en el log. Es deliberado: un webhook
 * de pagos sin verificar es peor que un webhook caído, porque el caído se nota.
 * En desarrollo se deja pasar, porque si no no se puede probar nada localmente.
 */
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

  try {
    /* `timingSafeEqual` y no `===`: comparar dos firmas con el operador normal
       corta en el primer carácter distinto, y ese tiempo se puede medir para ir
       adivinando la firma de a un byte. Tira si los largos difieren, y por eso
       va adentro del `try`. */
    return timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}
