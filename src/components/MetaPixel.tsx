"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { META_PIXEL_ID, pixelHabilitadoEn } from "@/lib/meta-pixel";

/**
 * Pixel de Meta de la plataforma. Se monta una sola vez en el root layout y él
 * mismo decide en qué rutas corresponde cargarse — el motivo y la lista están
 * en `lib/meta-pixel.ts`.
 *
 * En una tienda de un comerciante esto no renderiza nada: ahí manda
 * `StoreTrackingScripts`, que es el pixel del dueño de la tienda.
 */
export default function MetaPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const habilitado = pixelHabilitadoEn(pathname);

  // El <Script> de abajo dispara el PageView de la primera carga. El efecto se
  // ocupa SOLO de las navegaciones que vienen después: en Next el cambio de
  // ruta es del lado del cliente, no hay recarga, y sin esto el pixel contaría
  // una sola vista por sesión.
  const scriptYaDisparoElPrimerPageView = useRef(false);

  // `searchParams` cambia de identidad en cada navegación aunque el query sea
  // el mismo, así que se compara el string: si no, /precios?a=1 → /precios?a=1
  // (mismo destino) contaría dos veces.
  const query = searchParams.toString();

  useEffect(() => {
    if (!habilitado) return;

    if (!scriptYaDisparoElPrimerPageView.current) {
      scriptYaDisparoElPrimerPageView.current = true;
      return;
    }

    window.fbq?.("track", "PageView");
  }, [habilitado, pathname, query]);

  if (!habilitado || !META_PIXEL_ID) return null;

  // ---------------------------------------------------------------------------
  // SI ALGÚN DÍA SE VENDE FUERA DE ARGENTINA, LEER ESTO
  //
  // Hoy el pixel dispara apenas carga la página, sin pedir permiso. Para
  // Argentina está bien: la ley 25.326 no exige consentimiento previo. El
  // GDPR europeo SÍ, y ahí esto pasa a ser una multa esperando.
  //
  // No hace falta reescribir nada: fbq trae su propio mecanismo. Con
  // `consent revoke` antes del init, el pixel encola los eventos y no manda
  // NADA hasta que se le da permiso. Son dos cambios:
  //
  //   1. Acá abajo, entre el loader y el fbq('init', ...):
  //        fbq('consent', 'revoke');
  //   2. En el botón "Aceptar" del banner de cookies:
  //        window.fbq?.('consent', 'grant');
  //      y ahí recién se manda todo lo encolado.
  //
  // Falta además declarar el pixel en `app/privacidad/page.tsx`: hoy solo
  // menciona a Meta como catálogo de productos, no que medimos la navegación.
  // ---------------------------------------------------------------------------
  return (
    <>
      <Script id="meta-pixel-plataforma" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');`}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
