import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isDev = process.env.NODE_ENV === "development";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

const csp = [
  "default-src 'self'",
  `img-src 'self' data: blob: https: https://${supabaseHost} https://res.cloudinary.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://client.crisp.chat`,
  // ⚠️ `videos.pexels.com` está acá para que el navegador pueda BAJAR el video
  // de un reel. La pantalla de Contenido para reels no proxea el archivo por
  // nuestro servidor a propósito —son 8 MB por video y el ancho de banda sería
  // nuestro—: lo lee el navegador con `fetch`, arma un blob y lo guarda. Eso
  // pasa por `connect-src`, no por `media-src`.
  //
  // Sin esta línea el `fetch` lo bloquea la CSP y **cae en el plan B en
  // silencio**: el video se abre en una pestaña en vez de bajarse, y en un
  // celular eso es no poder bajarlo. Se descubrió apretando el botón, no
  // leyendo el código: el archivo salía con el nombre del CDN en vez del
  // nuestro, que era la única señal.
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://api.mercadopago.com https://api.mercadolibre.com https://*.mercadolibre.com https://*.ingest.sentry.io https://*.crisp.chat wss://*.crisp.chat https://challenges.cloudflare.com https://www.facebook.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://videos.pexels.com`,
  "media-src 'self' blob: https: https://res.cloudinary.com https://www.youtube.com https://www.instagram.com https://*.cdninstagram.com",
  // `www.facebook.com` está acá por el Pixel de Meta, y va SOLO en frame-src.
  // El script se baja de `connect.facebook.net` (script-src), los eventos
  // salen por `connect-src` y el `<img>` del noscript entra por `img-src https:`
  // — todo eso ya andaba. Lo que faltaba es el iframe oculto que `fbevents.js`
  // abre por su cuenta para sincronizar la cookie: sin esto el navegador lo
  // bloquea y llena la consola de errores de CSP en cada carga.
  //
  // Los eventos NO se estaban perdiendo, y por eso el error parecía inofensivo:
  // el Pixel tiene varios transportes y los otros pasaban. Es ruido, pero ruido
  // que tapa los errores de CSP que sí importan.
  "frame-src 'self' https://www.youtube.com https://www.instagram.com https://sdk.mercadopago.com https://www.mercadopago.com https://www.mercadolibre.com https://*.mercadolibre.com https://challenges.cloudflare.com https://www.facebook.com",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://sdk.mercadopago.com https://client.crisp.chat https://challenges.cloudflare.com https://connect.facebook.net https://www.googletagmanager.com`,
  "style-src 'self' 'unsafe-inline' https://client.crisp.chat",
  "font-src 'self' data: https://client.crisp.chat",
  "object-src 'none'",
  "base-uri 'self'",
  // `www.facebook.com` es la contracara de lo de arriba, una directiva más allá.
  // El Pixel tiene varios transportes para mandar un evento —imagen GET, fetch— y
  // cuando el dato no entra en ninguno cae a enviar un formulario oculto a
  // `facebook.com/tr/`. Con `form-action 'self'` a secas el navegador lo bloquea
  // y tira un error rojo por cada intento: 24 en una sola sesión de edición.
  //
  // Igual que con el iframe, los eventos no se estaban perdiendo: los otros
  // transportes pasan. El problema es la consola llena de rojo, que es donde uno
  // mira el día que un error de CSP sí importa — y ese día ya no se ve.
  //
  // Se afloja poco y con nombre propio: se pasa de "ningún formulario sale de
  // este dominio" a "ninguno salvo a facebook.com", que como destino para sacar
  // datos no le sirve a nadie. Cualquier otro sigue bloqueado.
  "form-action 'self' https://www.facebook.com",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

// MercadoPago SDK requiere unsafe-eval — solo en páginas de pago (en prod; en dev ya viene en csp base)
const cspPaymentScript = `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://client.crisp.chat https://challenges.cloudflare.com https://connect.facebook.net https://www.googletagmanager.com`;
const cspPayment = csp.replace(/script-src[^;]+/, cspPaymentScript);
const paymentHeaders = securityHeaders.map((h) =>
  h.key === "Content-Security-Policy" ? { key: h.key, value: cspPayment } : h
);

// Preview de templates — permite ser embebido en iframe same-origin (editor de diseño)
const cspPreview = cspPayment
  .replace("frame-ancestors 'none'", "frame-ancestors 'self'");
const previewHeaders = securityHeaders.map((h) => {
  if (h.key === "Content-Security-Policy") return { key: h.key, value: cspPreview };
  if (h.key === "X-Frame-Options") return { key: h.key, value: "SAMEORIGIN" };
  return h;
});

// Páginas de tienda pública: pago habilitado + pueden ser embebidas en iframe same-origin
const cspStorePublic = cspPayment
  .replace("frame-ancestors 'none'", "frame-ancestors 'self'");
const storePublicHeaders = paymentHeaders.map((h) => {
  if (h.key === "Content-Security-Policy") return { key: h.key, value: cspStorePublic };
  if (h.key === "X-Frame-Options") return { key: h.key, value: "SAMEORIGIN" };
  return h;
});

/* La página de venta de un producto digital (`/p/<id>`).
 *
 * Se ve embebida en un `iframe` adentro del editor del panel, así que necesita
 * dejarse enmarcar por nuestro propio dominio. Sin esto la previa sale en blanco
 * y la consola dice "Framing violates frame-ancestors 'none'".
 *
 * Se afloja SOLO a `'self'`, no a `*`: cualquier otro sitio la sigue sin poder
 * meter adentro de un iframe suyo. Eso importa acá más que en otras pantallas,
 * porque en esta se aprieta el botón de pagar — y un iframe ajeno arriba es
 * exactamente cómo se roba ese clic.
 *
 * ⚠️ Y a diferencia de `/tienda/` y `/preview/`, esta NO sale de `cspPayment`:
 * arranca de la política base, o sea SIN `unsafe-eval`. Cuando el checkout traiga
 * el SDK de Mercado Pago va a hacer falta, y ese es el momento de aflojarlo — no
 * antes de que exista lo que lo necesita. */
/* ── Las tipografías de la landing ───────────────────────────────────────────
 *
 * Esta es la ÚNICA política que deja entrar Google Fonts, y hace falta porque
 * acá la hoja de estilos no la escribimos nosotros: la escribe Claude cuando la
 * vendedora le pide su página.
 *
 * Las tres piezas ya estaban de acuerdo menos ésta, y por eso no funcionaba:
 * `landing-instrucciones.ts` le dice textualmente "podés usar Google Fonts con
 * un <link rel=stylesheet>", el saneador se guarda esos links
 * (`HOSTS_DE_FUENTES`, que no acepta ningún otro host) y los vuelve a poner en
 * la página… y el navegador los rechazaba con "violates the following Content
 * Security Policy directive: style-src". La página salía con la letra de
 * respaldo y en la consola quedaban dos errores rojos por carga.
 *
 * Van los dos hosts porque son dos pedidos encadenados: `fonts.googleapis.com`
 * sirve el CSS (`style-src`) y ese CSS pide los archivos `.woff2` a
 * `fonts.gstatic.com` (`font-src`). Con uno solo se arregla la mitad y la letra
 * sigue sin aparecer.
 *
 * ⚠️ Se afloja SÓLO acá y no en la política base: el resto del sitio tiene sus
 * tipografías servidas desde nuestro dominio y no necesita pedirle nada a
 * Google. */
const cspPaginaDigital = csp
  .replace("frame-ancestors 'none'", "frame-ancestors 'self'")
  .replace("style-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com")
  .replace("font-src 'self' data:", "font-src 'self' data: https://fonts.gstatic.com");
const paginaDigitalHeaders = securityHeaders.map((h) => {
  if (h.key === "Content-Security-Policy") return { key: h.key, value: cspPaginaDigital };
  if (h.key === "X-Frame-Options") return { key: h.key, value: "SAMEORIGIN" };
  return h;
});

// Identificador del build, para avisarle al usuario que hay versión nueva.
// Sale del commit que Vercel está deployando, así cambia solo en cada deploy y
// nadie tiene que acordarse de subir un número a mano.
//
// En local queda fijo en "dev": si cambiara en cada `next dev` saltaría el aviso
// de "nueva versión" mientras estás programando.
//
// Se lee en src/lib/app-versions.ts. Tiene que empezar con NEXT_PUBLIC_ para
// que llegue al navegador, que es donde se compara.
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
  /* ⚠️ pdfkit lee las medidas de sus tipografías de archivos .afm que abre en
     tiempo de ejecución, con una ruta que se arma sola. El empaquetador no ve
     esas aperturas —no hay ningún `import` que las nombre— así que no las
     copia, y la función se cae recién EN PRODUCCIÓN, al armar el primer PDF,
     con un "no such file". En local anda porque está `node_modules` entero.

     Es la ruta que arma el ebook y ninguna otra: son 300 KB que no tienen por
     qué viajar con el resto. */
  outputFileTracingIncludes: {
    "/api/digitales/ia/ebook/armar": [
      "./node_modules/pdfkit/js/data/**",
      /* ⚠️ Y las tipografías del ebook, por el MISMO motivo: `ebook-pdf.ts`
         las abre con una ruta que arma sola (`process.cwd() + /fuentes/`), no
         hay `import` que las nombre, y sin esta línea no viajan. La diferencia
         con los .afm es que esto no se cae: hay respaldo a las fuentes de
         fábrica, así que el ebook saldría igual pero con otra letra —un
         cambio de aspecto silencioso en producción, que es peor que un error. */
      "./fuentes/**",
    ],
  },
  async headers() {
    return [
      // Allow /sw.js to be registered with any sub-scope (needed for per-store scoped SW)
      { source: "/sw.js", headers: [
        { key: "Service-Worker-Allowed", value: "/" },
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      ]},
      /* ── Nuestras propias tipografías, para un documento de origen opaco ─────
       *
       * El navegador pide TODA tipografía en modo CORS, aun siendo del mismo
       * sitio. Desde una página normal eso no se nota, porque el origen coincide
       * y no hace falta ningún permiso. Pero la previa de la landing corre en un
       * `iframe` sandboxed sin `allow-same-origin` (a propósito: adentro va el
       * HTML que subió la vendedora), y desde ahí el origen del pedido es
       * literalmente `null`. Sin este permiso el navegador rechaza nuestros
       * `.woff2` con "blocked by CORS policy" y la previa se dibuja con la letra
       * de respaldo, más dos errores rojos por carga en la consola de ella.
       *
       * `*` es lo normal para tipografías —es lo que sirve cualquier CDN— y acá
       * no abre nada: son archivos estáticos públicos, sin cookies y sin nada
       * que decidir según quién los pida. */
      { source: "/_next/static/media/:archivo*", headers: [
        { key: "Access-Control-Allow-Origin", value: "*" },
      ]},
      // Regla base: todo excepto las rutas que tienen su propio set de headers más permisivo
      // (si no se excluyen, el browser recibe dos CSP headers y aplica la intersección — unsafe-eval se pierde)
      { source: "/((?!preview\\/|tienda\\/|p\\/|precios|dashboard).*)", headers: securityHeaders },
      // Páginas donde carga el SDK de MercadoPago (checkout de tienda + suscripciones + dashboard)
      { source: "/(precios|dashboard.*)", headers: paymentHeaders },
      // Tiendas públicas: pago habilitado + embebibles en iframe same-origin (para previews en cards)
      { source: "/tienda/(.*)", headers: storePublicHeaders },
      // Preview de templates — permite iframe same-origin para el editor de diseño
      { source: "/preview/(.*)", headers: previewHeaders },
      // Página de venta de un producto digital — la enmarca el editor del panel
      { source: "/p/(.*)", headers: paginaDigitalHeaders },
      /* ⚠️ La PANTALLA DE PAGO no se enmarca ni desde acá adentro. Cuelga de
         `/p/`, así que sin esta línea heredaba el `frame-ancestors 'self'` que la
         página de venta necesita para su previa — y ahí se aprieta el botón de
         pagar. `'self'` ya bloquea a un sitio ajeno, pero una pantalla de pago no
         tiene ningún motivo para ser enmarcable, ni siquiera por nosotros.
         VA DESPUÉS de la regla de arriba a propósito: las dos coinciden con esta
         dirección, y la documentación de Next dice que con la misma clave de
         cabecera **gana la última**. Invertirlas deja el checkout en `'self'`
         sin que nada avise. */
      { source: "/p/(.*)/pagar", headers: securityHeaders },
    ];
  },
  images: {
    /* ── Cuánto vive una foto ya optimizada ────────────────────────────────────
       El default de Next 16 son 14400 segundos: CUATRO HORAS. Pasado ese rato, una
       foto que no cambió se vuelve a generar y a escribir en el caché, y las dos
       cosas se pagan en Vercel (Transformations y Cache Writes). Con 31 días se
       genera una vez y se deja de tocar.
       El doc avisa que no hay forma de invalidar este caché, así que subirlo sería
       peligroso si una foto pudiera cambiar SIN cambiar de URL. Acá no puede: cada
       archivo sube con nombre único (`Date.now()-random.ext`, ver
       `api/upload/route.ts`), así que reemplazar una foto genera una URL nueva y el
       caché viejo simplemente deja de pedirse. */
    minimumCacheTTL: 2678400, // 31 días

    /* ── Cuántos anchos distintos se pueden generar por foto ───────────────────
       Los defaults son 8 `deviceSizes` + 7 `imageSizes` = hasta 15 versiones de la
       MISMA foto, y cada una es una transformación aparte. Con `sizes="100vw"` Next
       arma el srcset con todos los deviceSizes y cada visitante pide el que le toca
       según su pantalla — o sea que la variedad se paga de verdad.
       Quedan 4 + 4. Los cortes:
       · Afuera 2048 y 3840: son anchos de monitor 4K. Ninguna tienda necesita
         mandar una foto de producto de 3840px, y son las transformaciones más caras.
       · Afuera 750, 828 y 1080 de los intermedios, que estaban a un paso uno de
         otro: entre 640 y 1200 la diferencia visible es nula y son 3 versiones menos
         por foto.
       · Los `imageSizes` que quedan cubren las miniaturas reales de los templates
         (26 a 72px, que a 2x piden 128/256) y las fotos de ficha (hasta 520px).
       Lo peor que pasa con un ancho de menos es que se manda una foto un poco más
       grande de la necesaria. Lo que se gana es no multiplicar la cuota por 15. */
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [64, 128, 256, 384],

    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: "tiendaapps",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
