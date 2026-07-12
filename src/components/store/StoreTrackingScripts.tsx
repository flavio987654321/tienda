import Script from "next/script";

// Formatos esperados — se valida antes de inyectar nada en el HTML porque
// estos valores vienen de un campo de texto libre que completa el dueño de
// la tienda; sin esta validación, cualquier cosa pegada ahí terminaría
// interpolada literalmente dentro de un <script> de la tienda pública.
const GA_ID_RE = /^G-[A-Z0-9]+$/i;
const PIXEL_ID_RE = /^\d{10,20}$/;
const CONTENT_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const CURRENCY_RE = /^[A-Z]{3}$/;
const EM_HASH_RE = /^[a-f0-9]{64}$/;

export function StoreTrackingScripts({ googleAnalyticsId, facebookPixelId, viewContent, purchase }: {
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  /** Producto que se está viendo — dispara ViewContent (además del PageView de siempre). */
  viewContent?: { contentId: string; value: number; currency: string };
  /** Compra recién confirmada — dispara Purchase. `emHash` (SHA-256 del email del comprador,
   * calculado en el servidor) habilita coincidencias avanzadas sin exponer el email en el navegador. */
  purchase?: { eventId: string; value: number; currency: string; emHash?: string };
}) {
  const gaId = googleAnalyticsId?.trim();
  const pixelId = facebookPixelId?.trim();
  const validGaId = gaId && GA_ID_RE.test(gaId) ? gaId : null;
  const validPixelId = pixelId && PIXEL_ID_RE.test(pixelId) ? pixelId : null;

  const vc = viewContent && CONTENT_ID_RE.test(viewContent.contentId) && CURRENCY_RE.test(viewContent.currency) && Number.isFinite(viewContent.value)
    ? viewContent : null;
  const purch = purchase && CONTENT_ID_RE.test(purchase.eventId) && CURRENCY_RE.test(purchase.currency) && Number.isFinite(purchase.value)
    ? purchase : null;
  const emHash = purch?.emHash && EM_HASH_RE.test(purch.emHash) ? purch.emHash : null;

  return (
    <>
      {validGaId && (
        <>
          <Script async src={`https://www.googletagmanager.com/gtag/js?id=${validGaId}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${validGaId}');`}
          </Script>
        </>
      )}
      {validPixelId && (
        <>
          <Script id="fb-pixel-init" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${validPixelId}');
              fbq('track', 'PageView');
              ${vc ? `fbq('track', 'ViewContent', {content_ids: ['${vc.contentId}'], content_type: 'product', value: ${vc.value}, currency: '${vc.currency}'});` : ""}
              ${purch ? `${emHash ? `fbq('set', 'userData', {em: '${emHash}'});` : ""}
              fbq('track', 'Purchase', {value: ${purch.value}, currency: '${purch.currency}'}, {eventID: '${purch.eventId}'});` : ""}`}
          </Script>
          <noscript>
            <img height="1" width="1" style={{ display: "none" }} alt=""
              src={`https://www.facebook.com/tr?id=${validPixelId}&ev=PageView&noscript=1`} />
          </noscript>
        </>
      )}
    </>
  );
}
