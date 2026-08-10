// Pixel de Meta DE LA PLATAFORMA — mide nuestro propio embudo (visita →
// registro → tienda creada), con el ID que sale de NEXT_PUBLIC_FACEBOOK_PIXEL_ID.
//
// No confundirlo con el pixel DE CADA COMERCIANTE, que vive en
// `components/store/StoreTrackingScripts.tsx`, saca su ID de
// `storeConfig.analytics.facebookPixelId` y mide a los compradores de esa
// tienda. Son dos pixeles distintos, de dos dueños distintos.

/** Único lugar donde se lee el ID. Vacío o ausente = pixel apagado, sin romper nada. */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID?.trim() || null;

// ---------------------------------------------------------------------------
// POR QUÉ EXISTE ESTA LISTA
//
// `fbq('track', ...)` no le pega a un pixel: le pega a TODOS los pixeles
// inicializados en la página. Si el pixel de plataforma se cargara en una ruta
// de tienda, pasarían dos cosas malas a la vez:
//
//   1. Los eventos del comerciante se nos vendrían encima. El `Purchase` que
//      dispara `hooks/useCartLogic.ts` —con monto, moneda y el email del
//      comprador hasheado vía `fbq('set','userData')`— entraría también a
//      nuestro pixel. Datos de clientes ajenos en nuestra cuenta de anuncios.
//   2. Nuestro `PageView` le ensuciaría la atribución al comerciante, que paga
//      publicidad mirando esos números.
//
// Y aun donde no hay pixel de comerciante, medir al comprador final nos
// contamina la audiencia: la gente que compra unas zapatillas en la tienda de
// un cliente no es candidata a crear una tienda. Optimizar campañas contra esa
// audiencia es tirar plata.
//
// La separación es POR RUTA, no por filtrado de eventos: los dos pixeles no
// coexisten en ninguna página, así que acá abajo alcanza con `fbq('track')`
// pelado.
//
// Para excluir una ruta nueva, agregá el prefijo a la lista y listo — no hay
// que tocar ninguna lógica. Criterio: ¿la página es de cara al comprador final
// de la tienda de un comerciante? Entonces va excluida.
// ---------------------------------------------------------------------------
export const RUTAS_EXCLUIDAS_PIXEL = [
  "/tienda",      // tiendas públicas: acá SÍ vive el pixel del comerciante
  "/seguimiento", // un comprador siguiendo su pedido, no un candidato nuestro
  "/v",           // link de afiliado compartido: registra el click y redirige a /tienda
  // Canasta Solidaria. Además del motivo de siempre —un donante o una familia
  // pidiendo ayuda no es candidato a abrir una tienda—, acá hay uno más fuerte:
  // aunque no le mandemos ningún dato personal a Meta, la cookie igual deja al
  // navegador marcado como "visitó páginas de asistencia social". Una familia
  // pidiendo asistencia no tiene que quedar etiquetada en un sistema
  // publicitario. Decisión explícita, no la revuelvan sin preguntar.
  "/canasta",
] as const;

/** `true` si en esta ruta corresponde cargar el pixel de plataforma. */
export function pixelHabilitadoEn(pathname: string): boolean {
  if (!META_PIXEL_ID) return false;
  // Comparación por segmento, no por texto suelto: si no, el prefijo "/tienda"
  // se comería "/tiendas" (el directorio público, que sí es de plataforma).
  return !RUTAS_EXCLUIDAS_PIXEL.some(
    (prefijo) => pathname === prefijo || pathname.startsWith(`${prefijo}/`)
  );
}

/** Eventos estándar de Meta. Cualquier otro nombre tiene que ir por `trackCustom`. */
const EVENTOS_ESTANDAR = new Set([
  "AddPaymentInfo", "AddToCart", "AddToWishlist", "CompleteRegistration",
  "Contact", "CustomizeProduct", "Donate", "FindLocation", "InitiateCheckout",
  "Lead", "PageView", "Purchase", "Schedule", "Search", "StartTrial",
  "SubmitApplication", "Subscribe", "ViewContent",
]);

/**
 * Dispara un evento en el pixel de plataforma.
 *
 * No hace nada si el pixel no está cargado —porque falta la env var, porque
 * estamos en una ruta excluida, o porque un bloqueador se comió el script—, así
 * que se puede llamar sin envolverla en ifs.
 *
 * @example trackEvent("CompleteRegistration", { value: 0, currency: "ARS" })
 */
export function trackEvent(
  nombreEvento: string,
  parametros?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;

  const fbq = window.fbq;
  if (typeof fbq !== "function") return;

  // Un nombre no estándar mandado por 'track' lo registra igual pero queda
  // marcado como inválido en Meta y no sirve para optimizar campañas.
  fbq(EVENTOS_ESTANDAR.has(nombreEvento) ? "track" : "trackCustom", nombreEvento, parametros);
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}
