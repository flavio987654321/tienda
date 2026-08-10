import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import Providers from "@/components/Providers";
import CrispWidget from "@/components/CrispWidget";
import MetaPixel from "@/components/MetaPixel";
import { SITE_URL } from "@/lib/site";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TiendaApps - Creá tu tienda online en minutos",
    template: "%s | TiendaApps",
  },
  description:
    "Creá tu tienda online, vendé con MercadoPago y sumá afiliados que promocionen tus productos. Fácil, rápido y sin complicaciones. Probá gratis 7 días.",
  // Acá NO va `alternates`. Los campos que la página no define se heredan del
  // layout (docs de Next, "Inheriting fields"), así que una canónica puesta acá
  // se la comerían TODAS las páginas que no definan la suya —incluidas las de
  // cada tienda— y cada una le diría a Google "yo soy la home". Google las
  // trataría como duplicados y las sacaría del índice.
  // Cada página que necesita canónica declara la suya y listo.
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: SITE_URL,
    siteName: "TiendaApps",
    title: "TiendaApps - Creá tu tienda online en minutos",
    description:
      "Creá tu tienda online, vendé con MercadoPago y sumá afiliados que promocionen tus productos. Fácil, rápido y sin complicaciones. Probá gratis 7 días.",
    images: [{ url: "/icon.png", width: 512, height: 512, alt: "TiendaApps" }],
  },
  twitter: {
    card: "summary",
    title: "TiendaApps - Creá tu tienda online en minutos",
    description:
      "Creá tu tienda online, vendé con MercadoPago y sumá afiliados que promocionen tus productos. Fácil, rápido y sin complicaciones. Probá gratis 7 días.",
    images: ["/icon.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  // Verificación de dominio para Google Merchant Center (cuenta MCA de tiendaapps.com,
  // usada para conectar el feed de Google Shopping de cada tienda).
  verification: {
    google: "2uTRyiZzvzrtaIjxXyhkoYc4ZrSHXsvg0GToyhdSyXI",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <CrispWidget />
        {/* El <Suspense> es obligatorio: MetaPixel usa useSearchParams y sin
            boundary el build de producción falla en toda página estática. */}
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
      </body>
    </html>
  );
}
