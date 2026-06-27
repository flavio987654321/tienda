import Script from "next/script";

// Formatos esperados — se valida antes de inyectar nada en el HTML porque
// estos valores vienen de un campo de texto libre que completa el dueño de
// la tienda; sin esta validación, cualquier cosa pegada ahí terminaría
// interpolada literalmente dentro de un <script> de la tienda pública.
const GA_ID_RE = /^G-[A-Z0-9]+$/i;
const PIXEL_ID_RE = /^\d{10,20}$/;

export function StoreTrackingScripts({ googleAnalyticsId, facebookPixelId }: {
  googleAnalyticsId?: string;
  facebookPixelId?: string;
}) {
  const gaId = googleAnalyticsId?.trim();
  const pixelId = facebookPixelId?.trim();
  const validGaId = gaId && GA_ID_RE.test(gaId) ? gaId : null;
  const validPixelId = pixelId && PIXEL_ID_RE.test(pixelId) ? pixelId : null;

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
              fbq('track', 'PageView');`}
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
