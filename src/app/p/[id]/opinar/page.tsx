import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { normalizarContenido, variablesDePagina } from "@/lib/pagina-venta";
import { CLASES_FUENTES } from "@/lib/fuentes-venta";
import { leerTokenDeOpinion } from "@/lib/opinion-firma";
import { nombrePublico, OPINION_MAX } from "@/lib/opiniones-digitales";
import OpinarClient from "./OpinarClient";

/**
 * /p/<id>/opinar?t=<token> — la página donde quien compró deja su opinión.
 *
 * Sólo se llega con el link firmado de la compra (el del mail). Con un token
 * que no sirve se explica y no se muestra formulario: no hay forma de opinar
 * sin haber comprado, y eso es lo que vale la marca "compra verificada".
 * Ver `lib/opiniones-digitales`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> };

export default async function OpinarPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { t } = await searchParams;

  const fila = await prisma.product.findFirst({
    where: { id, deletedAt: null, rolDigital: "PRINCIPAL", store: { owner: { role: "DIGITAL" } } },
    select: { id: true, name: true, paginaVenta: true, store: { select: { checkoutName: true, name: true } } },
  });
  if (!fila) notFound();

  /* El token dice la compra; la compra tiene que ser de ESTE producto y
     estar cobrada. Todo lo demás es "este link no sirve". */
  const leido = leerTokenDeOpinion(t);
  const orden = leido
    ? await prisma.order.findFirst({
        where: { id: leido.orderId, status: "CONFIRMED", items: { some: { productId: fila.id } } },
        select: { id: true, buyer: { select: { name: true } }, opinionDigital: { select: { nombre: true, texto: true, estado: true } } },
      })
    : null;

  const quienVende = fila.store.checkoutName?.trim() || fila.store.name;
  const pagina = normalizarContenido(fila.paginaVenta);

  return (
    <div className={CLASES_FUENTES}>
      <div
        style={variablesDePagina(pagina) as React.CSSProperties}
        className="min-h-screen overflow-x-clip [overflow-wrap:anywhere] bg-[color:var(--pv-fondo)] text-[color:var(--pv-tinta)] antialiased"
      >
        <div className="mx-auto max-w-xl px-4 py-8 sm:py-12">
          <Link href={`/p/${fila.id}`} className="group mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--pv-tenue)] transition hover:text-[color:var(--pv-tinta)]">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Volver a {fila.name}
          </Link>

          {orden ? (
            <>
              <h1 className="text-balance text-2xl font-black sm:text-3xl">¿Cómo te fue con {fila.name}?</h1>
              <p className="mt-2 text-sm text-[color:var(--pv-tenue)]">
                Lo lee <strong className="font-semibold text-[color:var(--pv-tinta)]">{quienVende}</strong>, y si lo publica aparece en la página con tu nombre
                y la marca de compra verificada. Sólo vos podés escribir acá: este link es de tu compra.
              </p>
              <OpinarClient
                token={t ?? ""}
                nombreSugerido={nombrePublico(orden.buyer.name)}
                previa={orden.opinionDigital ? { nombre: orden.opinionDigital.nombre, texto: orden.opinionDigital.texto, estado: orden.opinionDigital.estado } : null}
                maximo={OPINION_MAX}
              />
            </>
          ) : (
            <>
              <h1 className="text-balance text-2xl font-black sm:text-3xl">Este link no sirve</h1>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--pv-tenue)]">
                Para opinar sobre {fila.name} hace falta el link que te llegó por mail después de comprarlo: es lo que hace que
                cada opinión sea de alguien que de verdad lo compró. Si lo perdiste, contestale el mail a {quienVende} y te lo manda de nuevo.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
