import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import {
  documentosPublicados, titulosLegales, textoPublicado,
  type ClaveLegal,
} from "@/lib/politicas-tienda";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ tipo?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const store = await prisma.store.findFirst({ where: { slug, isActive: true }, select: { name: true } });
  if (!store) return {};
  return {
    title: `Información legal — ${store.name}`,
    // Es una página de servicio, no de captación: que no compita en Google con
    // los productos de la tienda ni salga como resultado suelto.
    robots: { index: false, follow: true },
  };
}

/**
 * Parte el texto en párrafos y listas.
 *
 * El texto lo escribe una persona en un textarea, así que la única estructura
 * que puede haber son renglones y guiones al principio de la línea. Todo sale
 * por JSX, o sea escapado: nada de lo que escriba el dueño se interpreta como
 * HTML.
 */
function agruparContenido(texto: string) {
  const lineas = texto.split("\n").filter((l) => l.trim());
  const grupos: { tipo: "p" | "ul"; items: string[] }[] = [];
  for (const linea of lineas) {
    const esItem = linea.trimStart().startsWith("-");
    const ultimo = grupos[grupos.length - 1];
    if (esItem) {
      const contenido = linea.replace(/^\s*-\s*/, "");
      if (ultimo?.tipo === "ul") ultimo.items.push(contenido);
      else grupos.push({ tipo: "ul", items: [contenido] });
    } else {
      grupos.push({ tipo: "p", items: [linea] });
    }
  }
  return grupos;
}

const FECHA_LARGA: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };

export default async function PoliticasPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { tipo } = await searchParams;

  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    select: {
      name: true,
      slug: true,
      primaryColor: true,
      logo: true,
      tipoTienda: true,
      policyReturns: true,
      policyShipping: true,
      policyTerms: true,
      policyPrivacy: true,
      policyReturnsActive: true,
      policyShippingActive: true,
      policyTermsActive: true,
      policyPrivacyActive: true,
      policiesUpdatedAt: true,
      owner: { select: { email: true, name: true, city: true } },
      verificationRequest: { select: { cuit: true, status: true } },
    },
  });
  if (!store) notFound();

  const acc = store.primaryColor || "#4f46e5";
  const esAutos = store.tipoTienda === "AUTOS";
  const titulos = titulosLegales(esAutos);

  // La lista sale de la misma función que usan los pies de página y el mail, así
  // que una política apagada desaparece de los tres lados a la vez. Antes acá se
  // miraba solo si había texto y el interruptor "Oculta" del panel no hacía nada.
  const publicadas = documentosPublicados(store);

  const pedida = publicadas.includes(tipo as ClaveLegal) ? (tipo as ClaveLegal) : undefined;
  const activa = pedida ?? publicadas[0];
  const contenido = activa ? textoPublicado(store, activa) : null;

  const actualizada = store.policiesUpdatedAt
    ? store.policiesUpdatedAt.toLocaleDateString("es-AR", FECHA_LARGA)
    : null;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4 sm:px-8">
          {store.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logo} alt={store.name} className="h-7 w-auto object-contain" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: acc }}>
              <ShoppingBag className="h-3.5 w-3.5 text-white" />
            </span>
          )}
          <span className="truncate text-sm font-semibold tracking-tight">{store.name}</span>
          <Link
            href={`/tienda/${slug}`}
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Volver a la tienda</span>
            <span className="sm:hidden">Volver</span>
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
        <header className="border-b border-slate-200 pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Información legal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{store.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            Las condiciones bajo las que esta tienda vende. Te recomendamos leerlas antes de comprar.
          </p>
        </header>

        <div className="mt-10 gap-12 lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:items-start">
          {publicadas.length > 0 && (
            <nav
              aria-label="Documentos"
              className="mb-10 border-b border-slate-200 pb-6 lg:sticky lg:top-24 lg:mb-0 lg:border-b-0 lg:pb-0"
            >
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                Documentos
              </p>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 lg:block lg:space-y-1">
                {publicadas.map((clave) => {
                  const esActiva = clave === activa;
                  return (
                    <li key={clave}>
                      <Link
                        href={`/tienda/${slug}/politicas?tipo=${clave}`}
                        aria-current={esActiva ? "page" : undefined}
                        className={`block py-1 text-sm transition-colors lg:-ml-px lg:border-l-2 lg:pl-4 ${
                          esActiva
                            ? "font-semibold text-slate-900 lg:border-current"
                            : "border-transparent font-medium text-slate-500 hover:text-slate-900"
                        }`}
                        style={esActiva ? { color: acc } : undefined}
                      >
                        {titulos[clave].corto}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}

          <article className="min-w-0">
            {activa && contenido ? (
              <>
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{titulos[activa].largo}</h2>
                <div className="mt-6 max-w-[68ch] space-y-4">
                  {agruparContenido(contenido).map((grupo, i) =>
                    grupo.tipo === "ul" ? (
                      <ul key={i} className="list-disc space-y-2 pl-5 marker:text-slate-300">
                        {grupo.items.map((item, j) => (
                          <li key={j} className="text-[15px] leading-7 text-slate-700">{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p key={i} className="text-[15px] leading-7 text-slate-700">{grupo.items[0]}</p>
                    )
                  )}
                </div>
                {actualizada && (
                  <p className="mt-8 text-xs text-slate-400">Última actualización: {actualizada}</p>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-6 py-10 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  Esta tienda todavía no publicó sus políticas.
                </p>
                <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">
                  Escribile antes de comprar para acordar cómo se maneja la entrega, los cambios y las
                  devoluciones. Tus derechos como consumidor valen igual, estén escritos o no — los tenés
                  acá abajo.
                </p>
              </div>
            )}

            {/* ── Lo que vale siempre ──────────────────────────────────────────
                Estos dos bloques no dependen de que el dueño haya escrito nada:
                los derechos del consumidor rigen igual y los datos del vendedor
                los exige el art. 4 de la ley. Por eso la página nunca queda
                vacía, ni siquiera en una tienda recién abierta. */}
            <section className="mt-14 rounded-lg border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Tus derechos como consumidor · Ley 24.240
                </h3>
              </div>
              <dl className="divide-y divide-slate-100 px-5">
                {[
                  ["Arrepentimiento", "Podés cancelar una compra online dentro de los 10 días corridos desde que recibís el producto, sin costo y sin dar explicaciones."],
                  ["Garantía legal", "Los productos tienen garantía de 6 meses si son nuevos y 3 meses si son usados, contados desde la entrega."],
                  ["Información clara", "Tenés derecho a conocer el precio total y las condiciones de la operación antes de comprar."],
                  ["Reclamos", "Podés presentar un reclamo ante Defensa del Consumidor de tu provincia sin cargo y sin abogado."],
                ].map(([titulo, texto]) => (
                  <div key={titulo} className="py-3.5 sm:flex sm:gap-6">
                    <dt className="text-sm font-semibold text-slate-900 sm:w-40 sm:shrink-0">{titulo}</dt>
                    <dd className="mt-1 text-sm leading-6 text-slate-600 sm:mt-0">{texto}</dd>
                  </div>
                ))}
              </dl>
              <div className="border-t border-slate-100 px-5 py-3">
                <a
                  href="https://www.argentina.gob.ar/produccion/defensadelconsumidor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-slate-900"
                >
                  argentina.gob.ar/defensadelconsumidor
                </a>
              </div>
            </section>

            <section className="mt-6 rounded-lg border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Datos del vendedor · Ley 24.240 art. 4
                </h3>
              </div>
              <dl className="divide-y divide-slate-100 px-5">
                {[
                  ["Tienda", store.name],
                  ["Responsable", store.owner?.name ?? null],
                  ["Localidad", store.owner?.city ?? null],
                  [
                    "CUIT / CUIL",
                    store.verificationRequest?.status === "APPROVED" ? store.verificationRequest.cuit ?? null : null,
                  ],
                ]
                  .filter(([, valor]) => !!valor)
                  .map(([etiqueta, valor]) => (
                    <div key={etiqueta as string} className="py-3 sm:flex sm:gap-6">
                      <dt className="text-sm text-slate-500 sm:w-40 sm:shrink-0">{etiqueta}</dt>
                      <dd className="mt-0.5 text-sm font-medium text-slate-900 sm:mt-0">{valor}</dd>
                    </div>
                  ))}
                {store.owner?.email && (
                  <div className="py-3 sm:flex sm:gap-6">
                    <dt className="text-sm text-slate-500 sm:w-40 sm:shrink-0">Contacto</dt>
                    <dd className="mt-0.5 sm:mt-0">
                      <a
                        href={`mailto:${store.owner.email}`}
                        className="break-all text-sm font-medium text-slate-900 underline underline-offset-2"
                      >
                        {store.owner.email}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Quién responde por qué. Sin esto, un comprador con un problema de
                entrega le reclama a TiendaApps y uno con un problema de la
                plataforma le reclama al dueño. Dejarlo escrito protege a los dos. */}
            <section className="mt-6 rounded-lg bg-slate-50 px-5 py-4">
              <p className="text-sm leading-6 text-slate-600">
                Los productos, los precios, la entrega y las políticas de esta página son responsabilidad de{" "}
                <span className="font-medium text-slate-900">{store.name}</span>, no de la plataforma.{" "}
                <span className="font-medium text-slate-900">TiendaApps</span> provee la tecnología con la que
                funciona la tienda.
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Responsable de la plataforma: Flavio Cesar Soltero Legoas ·{" "}
                <a href="mailto:marketplacemitienda@gmail.com" className="underline underline-offset-2 hover:text-slate-900">
                  marketplacemitienda@gmail.com
                </a>
                {" · "}
                {/* Los dos van a otra pestaña porque son documentos de la
                    plataforma, fuera de la tienda. Sin `target`, en la tienda
                    instalada como app reemplazaban la pantalla y dejaban a la
                    persona navegando TiendaApps adentro de la app del comerciante,
                    sin barra de direcciones y sin forma de volver. */}
                <a href="/terminos" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-slate-900">
                  Términos de TiendaApps
                </a>
                {" · "}
                <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-slate-900">
                  Privacidad de TiendaApps
                </a>
              </p>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
}
