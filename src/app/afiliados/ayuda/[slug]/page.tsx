import type { Metadata } from "next";
import PanelAyudaArticulo from "@/components/panel/PanelAyudaArticulo";
import { buscarArticulo } from "@/lib/ayuda";
import { getCurrentUser } from "@/lib/auth-session";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const articulo = buscarArticulo(slug);
  return {
    title: articulo ? `${articulo.titulo} — Ayuda` : "Ayuda",
    // La que se indexa es `/ayuda/<slug>`. Ver el comentario en el índice.
    robots: { index: false, follow: false },
  };
}

export default async function ArticuloDelAfiliado({ params }: Props) {
  // Misma guarda que el índice, y por el mismo motivo. Ver el comentario de ahí.
  const user = await getCurrentUser();
  if (!user || user.role !== "SELLER") return null;

  const { slug } = await params;
  return <PanelAyudaArticulo base="/afiliados/ayuda" rol="afiliado" slug={slug} />;
}
