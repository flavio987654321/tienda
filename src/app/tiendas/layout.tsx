import { Metadata } from "next";
import { siteUrl } from "@/lib/site";

const DESCRIPTION =
  "Mirá todas las tiendas que venden con TiendaApps: emprendimientos argentinos con envío a todo el país y pago con MercadoPago.";

export const metadata: Metadata = {
  title: "Tiendas",
  description: DESCRIPTION,
  alternates: { canonical: "/tiendas" },
  openGraph: {
    title: "Tiendas | TiendaApps",
    description: DESCRIPTION,
    url: siteUrl("/tiendas"),
  },
};

export default function TiendasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
