import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quiénes Somos",
  description:
    "Conocé el equipo detrás de TiendaApps. Una plataforma argentina para que cualquier persona pueda vender online de forma simple y sin complicaciones.",
  openGraph: {
    title: "Quiénes Somos | TiendaApps",
    description:
      "Conocé el equipo detrás de TiendaApps. Una plataforma argentina para que cualquier persona pueda vender online de forma simple y sin complicaciones.",
    url: "https://tiendaapps.com/quienes-somos",
  },
};

export default function QuienesSomosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
