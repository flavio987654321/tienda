import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import CrispWidget from "@/components/CrispWidget";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://tiendaapps.com"),
  title: {
    default: "TiendaApps - Creá tu tienda online en minutos",
    template: "%s | TiendaApps",
  },
  description:
    "Creá tu tienda online, vendé con MercadoPago y sumá afiliados que promocionen tus productos. Fácil, rápido y sin complicaciones. Probá gratis 7 días.",
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "https://tiendaapps.com",
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <CrispWidget />
      </body>
    </html>
  );
}
