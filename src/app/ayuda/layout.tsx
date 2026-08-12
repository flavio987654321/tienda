import { Metadata } from "next";
import { siteUrl } from "@/lib/site";

/* A diferencia de las políticas de una tienda —que van con `noindex` porque son
 * una página de servicio—, la ayuda SE INDEXA a propósito. Es la única parte del
 * sitio que contesta lo que alguien busca antes de conocernos: "cómo poner envío
 * gratis en mi tienda online" es una consulta real de alguien que todavía no
 * tiene cuenta. Ponerle noindex sería tirar la mitad del valor. */
export const metadata: Metadata = {
  title: "Centro de ayuda",
  alternates: { canonical: "/ayuda" },
  description:
    "Cómo publicar tu tienda, aparecer en Google, armar promociones y cobrar. Guías cortas y concretas de TiendaApps.",
  openGraph: {
    title: "Centro de ayuda | TiendaApps",
    description:
      "Cómo publicar tu tienda, aparecer en Google, armar promociones y cobrar. Guías cortas y concretas de TiendaApps.",
    url: siteUrl("/ayuda"),
  },
};

export default function AyudaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
