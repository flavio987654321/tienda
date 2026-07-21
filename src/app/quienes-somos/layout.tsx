import { Metadata } from "next";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Quiénes Somos",
  alternates: { canonical: "/quienes-somos" },
  description:
    "Conocé el equipo detrás de TiendaApps. Una plataforma argentina para que cualquier persona pueda vender online de forma simple y sin complicaciones.",
  openGraph: {
    title: "Quiénes Somos | TiendaApps",
    description:
      "Conocé el equipo detrás de TiendaApps. Una plataforma argentina para que cualquier persona pueda vender online de forma simple y sin complicaciones.",
    url: siteUrl("/quienes-somos"),
  },
};

export default function QuienesSomosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
