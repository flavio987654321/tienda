import { Metadata } from "next";
import { siteUrl } from "@/lib/site";

const DESCRIPTION =
  "Entre todos armamos una canasta de alimentos y ayudamos a causas puntuales. Tres pasos y todo a la vista: mirá cuánto se juntó y a dónde fue.";

export const metadata: Metadata = {
  title: "Comunidad",
  description: DESCRIPTION,
  alternates: { canonical: "/comunidad" },
  openGraph: {
    title: "Comunidad | TiendaApps",
    description: DESCRIPTION,
    url: siteUrl("/comunidad"),
  },
};

export default function ComunidadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
