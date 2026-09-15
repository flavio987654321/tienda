/* ══════════════════════════════════════════════════════════════════════════
   LA MEDICIÓN DE LA PÁGINA DE VENTA: PÍXEL DE META, GOOGLE ANALYTICS, CLARITY
   ══════════════════════════════════════════════════════════════════════════

   Configuración → Meta deja pegar los tres IDs y los guarda en
   `Store.storeConfig.analytics`, igual que tiendas. Hasta el 15/09/26 eso se
   guardaba y NADIE LO LEÍA del lado digital: `StoreTrackingScripts` estaba
   sólo en `/tienda/...`, y la página de venta de un producto digital, su
   checkout y su gracias salían sin píxel. Alguien pegaba el suyo, corría
   anuncios, y Meta no veía ni un PageView.

   Ahora los tres pasos del embudo miden:

     /p/[id]         PageView + ViewContent
     /p/[id]/pagar   PageView + InitiateCheckout
     /p/[id]/gracias PageView, y Purchase CUANDO LA COMPRA SE CONFIRMA

   ⚠️ Purchase no se dispara al dibujar gracias. La persona vuelve de Mercado
   Pago antes de que llegue el aviso de pago, y un Purchase en ese momento
   contaría compras que quizá no se cobren. Se dispara desde el navegador
   cuando la consulta de estado dice "listo" (que es cuando la orden está
   CONFIRMED y los archivos existen), UNA sola vez por orden: el navegador se
   acuerda de haberla medido, así recargar gracias no vende dos veces. El
   `eventID` es el id de la orden, para que si un día se suma la API de
   conversiones del lado del servidor, Meta las junte.

   Sin el correo hasheado (las "coincidencias avanzadas" de Meta): tendría
   que salir por `estado-compra`, que es una ruta pública por id de orden, y
   un hash de un correo se revierte por diccionario. Si algún día hace falta,
   va por la API de conversiones desde el servidor, no por acá.

   Lo que lee la configuración es puro y lo comparten la pantalla de
   Configuración y las tres páginas públicas. Probado en
   `medicion-digital.check.ts`. */

export type Medicion = { pixelId: string; gaId: string; clarityId: string };

export const SIN_MEDICION: Medicion = { pixelId: "", gaId: "", clarityId: "" };

/** Los tres IDs de medición que guarda `storeConfig`, o vacíos. Un JSON roto no tumba nada. */
export function medicionDeLaTienda(raw: string | null | undefined): Medicion {
  try {
    const c = JSON.parse(raw || "{}") as { analytics?: Record<string, unknown> };
    const a = c.analytics ?? {};
    return {
      pixelId: typeof a.facebookPixelId === "string" ? a.facebookPixelId.trim() : "",
      gaId: typeof a.googleAnalyticsId === "string" ? a.googleAnalyticsId.trim() : "",
      clarityId: typeof a.clarityProjectId === "string" ? a.clarityProjectId.trim() : "",
    };
  } catch {
    return SIN_MEDICION;
  }
}

/** Todos los precios digitales van en pesos: ver "Los precios van en PESOS" en el plan. */
export const MONEDA_DIGITAL = "ARS";

/** La marca en el navegador de que esta orden ya se midió como compra. */
export const claveDeCompraMedida = (ordenId: string) => `pv_medida_${ordenId}`;

type ConFbq = { fbq?: (...args: unknown[]) => void; gtag?: (...args: unknown[]) => void };

/**
 * Dispara Purchase (Meta) y purchase (GA4) por una compra confirmada, una sola
 * vez por orden en este navegador. Devuelve si disparó algo. Sin píxel ni GA
 * cargados no hace nada: no hay a quién avisarle.
 */
export function marcarCompraEnElNavegador(c: { ordenId: string; total: number }): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as ConFbq;
  if (!w.fbq && !w.gtag) return false;
  const clave = claveDeCompraMedida(c.ordenId);
  try {
    if (window.localStorage.getItem(clave)) return false;
  } catch {
    /* Sin almacenamiento (modo privado estricto) se mide igual: es preferible
       un duplicado raro a no medir la compra. */
  }
  if (w.fbq) {
    w.fbq("track", "Purchase", { value: c.total, currency: MONEDA_DIGITAL }, { eventID: c.ordenId });
  }
  if (w.gtag) {
    w.gtag("event", "purchase", { transaction_id: c.ordenId, value: c.total, currency: MONEDA_DIGITAL });
  }
  try { window.localStorage.setItem(clave, "1"); } catch { /* ídem */ }
  return true;
}
