import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { normalizarContenido, variablesDePagina } from "@/lib/pagina-venta";
import { CLASES_FUENTES } from "@/lib/fuentes-venta";
import {
  documentosPublicados, textoPublicado, titulosLegales,
  CLAVES_DIGITALES, CLAVE_ARREPENTIMIENTO,
  type ClaveLegal, type ClaveDePagina,
} from "@/lib/politicas-tienda";
import ArrepentimientoForm from "@/components/ArrepentimientoForm";

export const dynamic = "force-dynamic";

/**
 * Los documentos legales de QUIEN VENDE este producto.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POR QUÉ NO ALCANZABA CON LOS NUESTROS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Hasta el 03/09/26 el pie de la página de venta linkeaba a `/terminos` y
 * `/privacidad`: **los de TiendaApps**. Quien compraba un ebook leía nuestros
 * documentos creyendo que eran los de quien se lo vendía — y eso contradice de
 * frente lo que esos mismos términos dicen ("TiendaApps no es parte de esa
 * relación de consumo"). En una denuncia gana lo que el comprador vio.
 *
 * En tiendas nunca pasó: cada una publica las suyas en
 * `/tienda/<slug>/politicas`. Esta es la misma pieza para el otro ecosistema.
 *
 * ── Por qué cuelga del PRODUCTO y no de la tienda ───────────────────────────
 *
 * Porque la tienda de una cuenta digital es invisible —nace y se queda
 * despublicada, es sólo el motor— y su dirección no lleva a ningún lado. Lo que
 * la persona conoce es el producto: llegó por `/p/<id>`, y de ahí sale este
 * link. Es además la dirección que va a heredar el dominio propio de la Fase 5
 * bis, sin tener que mudar nada.
 *
 * ── Por qué NO son cuatro documentos ────────────────────────────────────────
 *
 * No hay envíos. Ver `CLAVES_DIGITALES`.
 */

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const fila = await prisma.product.findFirst({
    where: { id, deletedAt: null, rolDigital: "PRINCIPAL" },
    select: { name: true },
  });
  if (!fila) return {};
  return {
    title: `Información legal — ${fila.name}`,
    /* No se indexa: es una página de servicio, no de captación. Salir suelta en
       Google sólo consigue que alguien entre por acá en vez de por la página de
       venta. Mismo criterio que la de tiendas. */
    robots: { index: false, follow: true },
  };
}

/**
 * Parte el texto en párrafos y listas.
 *
 * Lo escribe una persona en un `textarea`, así que la única estructura posible
 * son renglones y guiones al principio. Todo sale por JSX —o sea escapado—:
 * nada de lo que escriba quien vende se interpreta como HTML. Es la misma
 * función que la página legal de tiendas, con el mismo motivo.
 */
function agrupar(texto: string) {
  const grupos: { tipo: "p" | "ul"; items: string[] }[] = [];
  for (const linea of texto.split("\n").filter((l) => l.trim())) {
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

const FECHA: Intl.DateTimeFormatOptions = {
  day: "numeric", month: "long", year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
};

export default async function LegalesDelProducto({ params, searchParams }: Props) {
  const { id } = await params;
  const { tipo } = await searchParams;

  const fila = await prisma.product.findFirst({
    where: { id, deletedAt: null, rolDigital: "PRINCIPAL" },
    select: {
      id: true, name: true, paginaVenta: true,
      store: {
        select: {
          isPublished: true,
          policyReturns: true, policyReturnsActive: true,
          policyTerms: true, policyTermsActive: true,
          policyPrivacy: true, policyPrivacyActive: true,
          policiesUpdatedAt: true,
          supportEmail: true, checkoutName: true, name: true,
          owner: { select: { role: true, name: true, email: true } },
        },
      },
    },
  });

  /* Misma puerta que la página de venta: la tienda de una cuenta digital nace
     despublicada, y una publicada es la tienda de alguien de verdad —sus
     políticas se leen por su propia dirección, no por acá. */
  if (!fila || fila.store.isPublished || fila.store.owner.role !== "DIGITAL") notFound();

  /* Se dibuja con los colores y la letra de SU página de venta, no con los del
     panel: quien llega acá viene de ahí, y un salto a otro diseño se siente
     como haberse ido del sitio de quien le vendió — que es justo lo contrario
     de lo que esta página existe para dejar claro. */
  const pagina = normalizarContenido(fila.paginaVenta);

  const titulos = titulosLegales(false);
  /* De las publicadas, sólo las que le corresponden a un producto digital: la
     de envíos podría tener texto de antes y acá no significa nada. */
  const publicadas = documentosPublicados(fila.store)
    .filter((c): c is (typeof CLAVES_DIGITALES)[number] =>
      (CLAVES_DIGITALES as readonly ClaveLegal[]).includes(c));

  const solapas: ClaveDePagina[] = [...publicadas, CLAVE_ARREPENTIMIENTO];
  /* El arrepentimiento es el único que está SIEMPRE —es un formulario, lo exige
     la Resolución 424/2020 y no depende de que se haya escrito nada—, así que
     también es el que atiende cuando no hay ningún documento cargado. */
  const activa: ClaveDePagina =
    typeof tipo === "string" && solapas.includes(tipo as ClaveDePagina)
      ? (tipo as ClaveDePagina)
      : (solapas[0] ?? CLAVE_ARREPENTIMIENTO);

  const quienVende = fila.store.checkoutName?.trim()
    || fila.store.owner.name?.trim()
    || fila.store.name;

  const texto = activa === CLAVE_ARREPENTIMIENTO
    ? null
    : textoPublicado(fila.store, activa as ClaveLegal);

  return (
    <div className={CLASES_FUENTES}>
      <div
        style={variablesDePagina(pagina) as React.CSSProperties}
        className="min-h-screen overflow-x-clip [overflow-wrap:anywhere] bg-[color:var(--pv-fondo)] text-[color:var(--pv-tinta)] antialiased"
      >
        <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">

          <Link
            href={`/p/${fila.id}`}
            className="group mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--pv-tenue)] transition hover:text-[color:var(--pv-tinta)]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Volver a {fila.name}
          </Link>

          <h1 className="text-balance text-2xl font-black text-[color:var(--pv-tinta)] sm:text-3xl">
            Información legal
          </h1>
          {/* ⚠️ De quién son estos documentos, dicho arriba de todo. Es la línea
              que evita que alguien crea que está leyendo los de la plataforma —
              que es exactamente el problema que esta página vino a arreglar. */}
          <p className="mt-2 text-sm text-[color:var(--pv-tenue)]">
            Las condiciones de <strong className="font-semibold text-[color:var(--pv-tinta)]">{quienVende}</strong>,
            que es quien te vende este producto.
            {fila.store.policiesUpdatedAt && (
              <> Última actualización: {fila.store.policiesUpdatedAt.toLocaleDateString("es-AR", FECHA)}.</>
            )}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {solapas.map((clave) => {
              const esta = clave === activa;
              return (
                <Link
                  key={clave}
                  href={`/p/${fila.id}/legales?tipo=${clave}`}
                  className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
                    esta
                      ? "bg-[color:var(--pv-acento)] text-[color:var(--pv-sobre)]"
                      : "border-2 border-[color:var(--pv-linea)] text-[color:var(--pv-tenue)] hover:border-[color:var(--pv-acento)]"
                  }`}
                >
                  {titulos[clave].corto}
                </Link>
              );
            })}
          </div>

          <div className="mt-7 border-t border-[color:var(--pv-linea)] pt-7">
            <h2 className="mb-4 text-lg font-bold text-[color:var(--pv-tinta)]">
              {titulos[activa].largo}
            </h2>

            {activa === CLAVE_ARREPENTIMIENTO ? (
              <>
                <p className="mb-5 text-sm leading-relaxed text-[color:var(--pv-tenue)]">
                  Si comprás por internet tenés 10 días corridos para arrepentirte
                  (art. 34, Ley 24.240). Dejá tus datos y te llega una constancia con número.
                  {/* ⚠️ Se avisa acá, no después. Un archivo ya descargado está
                      exceptuado por el art. 1116 inc. b, y enterarse recién al
                      recibir la respuesta es la peor forma de saberlo. */}
                  {" "}Con archivos digitales hay una excepción: si ya lo descargaste,
                  no corresponde la devolución — salvo que quien te vendió ofrezca una
                  garantía, que en ese caso vale igual.
                </p>
                <ArrepentimientoForm nombreDeQuienVende={quienVende} />
              </>
            ) : texto ? (
              <div className="space-y-3.5 text-[15px] leading-relaxed text-[color:var(--pv-tinta)]">
                {agrupar(texto).map((g, i) =>
                  g.tipo === "ul" ? (
                    <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-[color:var(--pv-tenue)]">
                      {g.items.map((it, j) => <li key={j}>{it}</li>)}
                    </ul>
                  ) : (
                    <p key={i}>{g.items[0]}</p>
                  ),
                )}
              </div>
            ) : (
              <p className="text-sm text-[color:var(--pv-tenue)]">
                Quien vende todavía no publicó este documento.
              </p>
            )}
          </div>

          {/* A quién escribirle. Va en todas las solapas: es lo que alguien
              busca cuando llega a una página legal, y no siempre está adentro
              del texto que se escribió. */}
          {fila.store.supportEmail && (
            <p className="mt-8 border-t border-[color:var(--pv-linea)] pt-5 text-sm text-[color:var(--pv-tenue)]">
              ¿Un problema con tu compra? Escribile a{" "}
              <a
                href={`mailto:${fila.store.supportEmail}`}
                className="break-all font-semibold text-[color:var(--pv-tinta)] underline underline-offset-2"
              >
                {fila.store.supportEmail}
              </a>.
            </p>
          )}

          {/* ⚠️ LOS NUESTROS VAN ACÁ ABAJO Y ETIQUETADOS. Existen —la plataforma
              también tiene sus términos— pero no rigen esta venta, y hasta hoy
              eran los ÚNICOS que la página mostraba. Separados y nombrados, ya
              no se pueden confundir con los de quien vende. */}
          <div className="mt-6 rounded-xl border border-[color:var(--pv-linea)] p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--pv-tenue)]">
              De la plataforma
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[color:var(--pv-tenue)]">
              El cobro y la entrega los hace TiendaApps. Sus condiciones son aparte de las
              de arriba y no reemplazan a las de quien te vende:{" "}
              <a href="/terminos?role=buyer" className="underline hover:text-[color:var(--pv-tinta)]">Términos</a>
              {" · "}
              <a href="/privacidad?role=buyer" className="underline hover:text-[color:var(--pv-tinta)]">Privacidad</a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
