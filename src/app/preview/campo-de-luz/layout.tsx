import type { Metadata } from "next";

/**
 * `campo-de-luz` no es una preview de template: es el banco de pruebas donde se
 * arman los bloques nuevos antes de meterlos en Aurora. Tiene fotos de relleno,
 * una marca inventada ("LA TIENDA") y rótulos tipo "Bloque 5 · El cierre".
 *
 * Estaba en 200, sin `X-Robots-Tag` y sin meta robots — o sea, indexable. No
 * está en el sitemap, pero eso no alcanza: Google llega igual por cualquier link.
 *
 * Va como meta y NO como `Disallow` en robots.txt a propósito: un Disallow le
 * impide a Google *leer* la página, y con eso también se pierde el noindex. La
 * URL puede quedar indexada igual, sin título ni descripción. Para sacar algo del
 * índice hay que dejar entrar al robot y decirle que no la guarde.
 *
 * Las otras `/preview/*` sí son demos reales de los templates y se quedan como
 * están.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LayoutBancoDePruebas({ children }: { children: React.ReactNode }) {
  return children;
}
