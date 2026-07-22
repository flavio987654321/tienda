import { Metadata } from "next";
import { siteUrl } from "@/lib/site";

// Esta página es el destino de la publicidad en redes, así que la mayoría va a
// llegar desde un link pegado en Instagram o WhatsApp — sin pasar por el home.
// La preview (título + descripción + imagen) es lo primero que ven: es parte
// del aviso, no un detalle de SEO.
const DESCRIPTION =
  "Contanos cómo te imaginás tu tienda y diseñamos una plantilla con vos. Gratis, sin registrarte y en tres minutos.";

export const metadata: Metadata = {
  title: "Diseñá tu propia tienda",
  description: DESCRIPTION,
  alternates: { canonical: "/diseno-propio" },
  openGraph: {
    title: "Diseñá tu propia tienda | TiendaApps",
    description: DESCRIPTION,
    url: siteUrl("/diseno-propio"),
  },
};

export default function DisenoPropioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
