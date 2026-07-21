import { Metadata } from "next";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Precios y Planes",
  alternates: { canonical: "/precios" },
  description:
    "Elegí el plan que mejor se adapta a tu negocio. Comenzá gratis por 7 días y empezá a vender hoy mismo con MercadoPago y afiliados incluidos.",
  openGraph: {
    title: "Precios y Planes | TiendaApps",
    description:
      "Elegí el plan que mejor se adapta a tu negocio. Comenzá gratis por 7 días y empezá a vender hoy mismo con MercadoPago y afiliados incluidos.",
    url: siteUrl("/precios"),
  },
};

export default function PreciosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
