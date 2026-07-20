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
  "frame-src 'self' https://www.youtube.com https://www.instagram.com https://sdk.mercadopago.com https://www.mercadopago.com https://www.mercadolibre.com https://*.mercadolibre.com https://challenges.cloudflare.com",
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
