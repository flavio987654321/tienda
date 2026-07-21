import { Metadata } from "next";
import { siteUrl } from "@/lib/site";

const DESCRIPTION =
  "Seguí el estado de tu pedido con el código que te enviamos por email al confirmar la compra.";

export const metadata: Metadata = {
  title: "Seguí tu pedido",
  description: DESCRIPTION,
  alternates: { canonical: "/seguimiento" },
  openGraph: {
    title: "Seguí tu pedido | TiendaApps",
    description: DESCRIPTION,
    url: siteUrl("/seguimiento"),
  },
};

export default function SeguimientoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
