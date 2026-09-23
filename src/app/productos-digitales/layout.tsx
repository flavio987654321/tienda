import { Metadata } from "next";
import { siteUrl } from "@/lib/site";

const DESCRIPCION =
  "Vendé ebooks, guías y recetarios sin tener una tienda. Te armamos la página de venta, cobrás con Mercado Pago y el archivo se entrega solo. Empezá gratis, sin tarjeta.";

export const metadata: Metadata = {
  title: "Productos Digitales",
  alternates: { canonical: "/productos-digitales" },
  description: DESCRIPCION,
  openGraph: {
    title: "Productos Digitales | TiendaApps",
    description: DESCRIPCION,
    url: siteUrl("/productos-digitales"),
  },
};

export default function ProductosDigitalesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
