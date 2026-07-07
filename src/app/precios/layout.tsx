import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Precios y Planes",
  description:
    "Elegí el plan que mejor se adapta a tu negocio. Comenzá gratis por 7 días y empezá a vender hoy mismo con MercadoPago y afiliados incluidos.",
  openGraph: {
    title: "Precios y Planes | TiendaApps",
    description:
      "Elegí el plan que mejor se adapta a tu negocio. Comenzá gratis por 7 días y empezá a vender hoy mismo con MercadoPago y afiliados incluidos.",
    url: "https://tiendaapps.com/precios",
  },
};

export default function PreciosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
