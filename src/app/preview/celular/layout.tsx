import type { Metadata } from "next";

/**
 * `/preview/celular` es la ventanita de celular del editor de Diseño: sin el
 * borrador que le manda el editor no muestra nada que valga la pena encontrar.
 * Va sin indexar por lo mismo que `campo-de-luz` (ver su layout): con meta y no
 * con `Disallow`, para que el robot pueda leer el noindex.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LayoutPreviaCelular({ children }: { children: React.ReactNode }) {
  return children;
}
