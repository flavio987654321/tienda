import { Metadata } from "next";
import { siteUrl } from "@/lib/site";

const DESCRIPTION =
  "¿Dudas sobre TiendaApps? Escribinos y te respondemos en menos de 24 horas. Atención de lunes a viernes de 9 a 18 hs.";

export const metadata: Metadata = {
  title: "Contacto",
  description: DESCRIPTION,
  alternates: { canonical: "/contacto" },
  openGraph: {
    title: "Contacto | TiendaApps",
    description: DESCRIPTION,
    url: siteUrl("/contacto"),
  },
};

export default function ContactoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
