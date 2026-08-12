import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isDev = process.env.NODE_ENV === "development";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

const csp = [
  "default-src 'self'",
  `img-src 'self' data: blob: https: https://${supabaseHost} https://res.cloudinary.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://client.crisp.chat`,
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://api.mercadopago.com https://api.mercadolibre.com https://*.mercadolibre.com https://*.ingest.sentry.io https://*.crisp.chat wss://*.crisp.chat https://challenges.cloudflare.com https://www.facebook.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com`,
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
  "form-action 'self'",
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
  async headers() {
    return [
      // Allow /sw.js to be registered with any sub-scope (needed for per-store scoped SW)
      { source: "/sw.js", headers: [
        { key: "Service-Worker-Allowed", value: "/" },
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      ]},
      // Regla base: todo excepto las rutas que tienen su propio set de headers más permisivo
      // (si no se excluyen, el browser recibe dos CSP headers y aplica la intersección — unsafe-eval se pierde)
      { source: "/((?!preview\\/|tienda\\/|precios|dashboard).*)", headers: securityHeaders },
      // Páginas donde carga el SDK de MercadoPago (checkout de tienda + suscripciones + dashboard)
      { source: "/(precios|dashboard.*)", headers: paymentHeaders },
      // Tiendas públicas: pago habilitado + embebibles en iframe same-origin (para previews en cards)
      { source: "/tienda/(.*)", headers: storePublicHeaders },
      // Preview de templates — permite iframe same-origin para el editor de diseño
      { source: "/preview/(.*)", headers: previewHeaders },
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
