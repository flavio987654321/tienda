import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import Cuerpo from "@/components/ayuda/Cuerpo";
import Chip from "@/components/ayuda/Chip";
import { ARTICULOS, buscarArticulo, porGrupo, relacionadosDe } from "@/lib/ayuda";
import { siteUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

/* Los artículos son datos del repo, no filas de una base: se pueden generar
   todos en el build. Es lo que más importa acá — una página de ayuda que tarda
   en responder la cierran antes de leerla, y Google la rastrea igual de seguido
   que a cualquier otra. */
export function generateStaticParams() {
  return ARTICULOS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const articulo = buscarArticulo(slug);
  if (!articulo) return {};

  const title = `${articulo.titulo} — Ayuda`;
  return {
    title,
    description: articulo.resumen,
    alternates: { canonical: `/ayuda/${articulo.slug}` },
    openGraph: {
      title,
      description: articulo.resumen,
      url: siteUrl(`/ayuda/${articulo.slug}`),
      type: "article",
    },
  };
}

const FECHA_LARGA: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };

export default async function ArticuloPage({ params }: Props) {
  const { slug } = await params;
  const articulo = buscarArticulo(slug);
  if (!articulo) notFound();

  const grupos = porGrupo();
  const relacionados = relacionadosDe(articulo);
  const actualizado = new Date(`${articulo.actualizado}T12:00:00`).toLocaleDateString(
    "es-AR",
    FECHA_LARGA
  );

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <SiteNav />

      <main className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
        <Link
          href="/ayuda"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Centro de ayuda
        </Link>

        <div className="mt-8 gap-14 lg:grid lg:grid-cols-[236px_minmax(0,1fr)] lg:items-start">
          {/* El índice completo solo desde lg. En las políticas de una tienda son
              cuatro documentos y entran envueltos arriba del texto; acá son
              cinco grupos y empujarían el artículo dos pantallas para abajo en
              360. En móvil alcanza con el link de arriba, que vuelve al índice.

              NO lleva scroll propio. Lo tenía —pegajoso, con `overflow-y-auto`—
              y con diecisiete artículos la lista pasaba el alto de la ventana:
              aparecía una segunda barra de scroll adentro de la página y, peor,
              se montaba encima de los títulos del índice, que quedaban cortados
              contra el borde. Suelto, el índice sube con la página y no le pisa
              el texto a nadie. */}
          <nav aria-label="Artículos de ayuda" className="hidden lg:block">
            <div className="flex flex-col gap-6">
              {grupos.map((grupo) => (
                <div key={grupo.key}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400">
                    {grupo.titulo}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {grupo.articulos.map((a) => {
                      const esActiva = a.slug === articulo.slug;
                      return (
                        <li key={a.slug}>
                          <Link
                            href={`/ayuda/${a.slug}`}
                            aria-current={esActiva ? "page" : undefined}
                            className={`-ml-px block border-l-2 py-1 pl-4 text-sm leading-snug transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 ${
                              esActiva
                                ? "border-orange-600 font-semibold text-orange-700"
                                : "border-transparent font-medium text-gray-500 hover:border-gray-300 hover:text-gray-950"
                            }`}
                          >
                            {a.titulo}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          <article className="min-w-0">
            <header className="flex flex-col gap-3 border-b border-gray-200 pb-8">
              <Chip clase={articulo.clase} />
              <h1 className="text-3xl font-black tracking-tight text-balance sm:text-4xl">
                {articulo.titulo}
              </h1>
              <p className="max-w-[60ch] text-[15px] leading-relaxed text-gray-500">
                {articulo.resumen}
              </p>

              {articulo.pantalla && (
                <p className="mt-1 text-sm text-gray-500">
                  En el panel:{" "}
                  <Link
                    href={articulo.pantalla.href}
                    className="inline-flex items-center gap-1 font-semibold text-orange-700 underline underline-offset-2 hover:text-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
                  >
                    {articulo.pantalla.label}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </p>
              )}
            </header>

            <div className="mt-8">
              <Cuerpo bloques={articulo.cuerpo} />
            </div>

            <p className="mt-10 text-xs text-gray-400">Última actualización: {actualizado}</p>

            {relacionados.length > 0 && (
              <section className="mt-14 border-t border-gray-200 pt-8">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400">
                  Seguir por acá
                </h2>
                <ul className="mt-3 flex flex-col">
                  {relacionados.map((a) => (
                    <li key={a.slug}>
                      <Link
                        href={`/ayuda/${a.slug}`}
                        className="group flex items-start gap-4 border-b border-gray-100 py-4 transition-colors last:border-0 hover:bg-orange-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-semibold tracking-tight">{a.titulo}</span>
                            <Chip clase={a.clase} />
                          </div>
                          <span className="text-sm leading-6 text-gray-500">{a.resumen}</span>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-orange-600" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
