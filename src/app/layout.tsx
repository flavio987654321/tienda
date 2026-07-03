import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import CrispWidget from "@/components/CrispWidget";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "TiendaApps - La plataforma de ventas #1 de Argentina",
  description: "Crea tu tienda online, vende productos y suma afiliados con comisiones automaticas.",
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
