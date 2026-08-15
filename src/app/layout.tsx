import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Figtree } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import CrispWidget from "@/components/CrispWidget";
import MetaPixel from "@/components/MetaPixel";
import { SITE_URL } from "@/lib/site";

/* La tipografía de la marca.
 *
 * Antes no se cargaba ninguna fuente: el sitio salía en `Arial, Helvetica,
 * sans-serif`, o sea la que tuviera puesta cada aparato. Los títulos con peso
 * 900 caían en Arial Black en Windows, en Helvetica engordada a la fuerza en
 * Mac y en Roboto en Android — la marca se veía distinta según quién la mirara,
 * y desde una sola computadora eso no se nota nunca.
 *
 * `next/font` la sirve desde nuestro propio dominio: no le pega a Google, no
 * filtra visitas y no hay salto de texto al cargar.
 *
 * Sin `weight`: Figtree es variable y así trae todo el rango 300–900 en un solo
 * archivo, con el 900 de verdad para los titulares. Va como variable CSS y no
 * como className para poder enchufarla en el `@theme` de Tailwind.
 *
 * OJO — esto es la fuente de la PLATAFORMA, no de las tiendas. Los templates
 * traen su propia tipografía a propósito (Playfair Display + Georgia en los
 * editoriales, Inter en los de tecnología) y se respetan tal cual:
 * `StorefrontTemplateRenderer` las devuelve al stack de antes. */
const figtree = Figtree({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-marca",
});

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
  // Ni `openGraph.images` ni `twitter.images` van acá: los pone solo el archivo
  // `opengraph-image.tsx` de este mismo directorio, con su medida y su alt. Si
  // se declararan también acá, esta lista ganaría y volveríamos al ícono
  // cuadrado de 512×512 que había antes.
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: SITE_URL,
    siteName: "TiendaApps",
    title: "TiendaApps - Creá tu tienda online en minutos",
    description:
      "Creá tu tienda online, vendé con MercadoPago y sumá afiliados que promocionen tus productos. Fácil, rápido y sin complicaciones. Probá gratis 7 días.",
  },
  twitter: {
    // `summary_large_image` y no `summary`: con `summary` la placa de 1200×630
    // se recorta a un cuadradito al costado del texto.
    card: "summary_large_image",
    title: "TiendaApps - Creá tu tienda online en minutos",
    description:
      "Creá tu tienda online, vendé con MercadoPago y sumá afiliados que promocionen tus productos. Fácil, rápido y sin complicaciones. Probá gratis 7 días.",
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
    <html lang="es" className={`${figtree.variable} h-full antialiased`} suppressHydrationWarning>
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
