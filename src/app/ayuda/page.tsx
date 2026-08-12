import Link from "next/link";
import { ArrowRight, LifeBuoy, Store } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import Chip from "@/components/ayuda/Chip";
import { porGrupo } from "@/lib/ayuda";
import { getCurrentUser } from "@/lib/auth-session";
import { getStoreType, type StoreType } from "@/lib/storeTypes";
import { prisma } from "@/lib/prisma";

/* El ÍNDICE lee la sesión, así que se arma en cada pedido. Las fichas de cada
   artículo NO: siguen generándose en el build, que es lo que las hace rápidas y
   lo que Google rastrea. La sesión solo decide qué se LISTA acá.

   Un visitante sin sesión —y el robot de Google, que nunca la tiene— ve los
   diecinueve. */
export const dynamic = "force-dynamic";

/* El rubro de quien está mirando, si es dueño de una tienda.
 *
 * Nunca tira: la ayuda tiene que abrir aunque la base no conteste. Si algo
 * falla, se cae para el lado de mostrar todo — de más nunca dejó a nadie sin
 * la respuesta que buscaba. */
async function rubroDelLector(): Promise<StoreType | undefined> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "OWNER") return undefined;
    const store = await prisma.store.findUnique({
      where: { ownerId: user.id },
      select: { tipoTienda: true },
    });
    return (store?.tipoTienda as StoreType | undefined) ?? undefined;
  } catch (e) {
    console.error("[ayuda] no se pudo leer el rubro del lector:", e);
    return undefined;
  }
}

type Props = { searchParams: Promise<{ todo?: string }> };

export default async function AyudaIndexPage({ searchParams }: Props) {
  const { todo } = await searchParams;
  const rubro = todo === "1" ? undefined : await rubroDelLector();
  const grupos = porGrupo(rubro);
  const config = rubro ? getStoreType(rubro) : null;

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <SiteNav />

      <main className="mx-auto max-w-5xl px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
        <header className="border-b border-gray-200 pb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-600">
            Centro de ayuda
          </p>
          <h1 className="mt-2 max-w-2xl text-3xl font-black tracking-tight text-balance sm:text-4xl">
            Cómo funciona de verdad cada cosa
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            Guías cortas y concretas, escritas sobre lo que tu panel hace realmente. Están agrupadas
            por lo que querés lograr, no por la pantalla donde se hace.
          </p>
        </header>

        {/* Filtrar en silencio sería peor que no filtrar: el que ya leyó algo
            sobre cupones y no lo encuentra más piensa que la ayuda se rompió.
            Se dice qué se está viendo y se deja la puerta para ver el resto. */}
        {config && (
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <Store className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
            <p className="text-sm text-gray-600">
              Estás viendo la ayuda de una tienda de{" "}
              <span className="font-semibold text-gray-950">{config.label}</span>.
            </p>
            <Link
              href="/ayuda?todo=1"
              className="text-sm font-semibold text-orange-700 underline underline-offset-2 hover:text-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
            >
              Ver todos los artículos
            </Link>
          </div>
        )}

        <div className="mt-12 flex flex-col gap-14">
          {grupos.map((grupo) => (
            <section key={grupo.key}>
              <div className="flex flex-col gap-1 border-b border-gray-100 pb-4">
                <h2 className="text-xl font-bold tracking-tight">{grupo.titulo}</h2>
                <p className="text-sm text-gray-500">{grupo.bajada}</p>
              </div>

              <ul className="mt-2 flex flex-col">
                {grupo.articulos.map((articulo) => (
                  <li key={articulo.slug}>
                    <Link
                      href={`/ayuda/${articulo.slug}`}
                      className="group flex items-start gap-4 border-b border-gray-100 py-5 transition-colors last:border-0 hover:bg-orange-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <h3 className="font-semibold tracking-tight text-gray-950">
                            {articulo.titulo}
                          </h3>
                          <Chip clase={articulo.clase} />
                        </div>
                        <p className="text-sm leading-6 text-gray-500">{articulo.resumen}</p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-orange-600" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* Salida para lo que la ayuda no cubre. Sin esto, el que no encuentra su
            caso se queda sin nada — y la ayuda nunca va a cubrir todo. */}
        <section className="mt-16 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-6 py-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
            <div>
              <p className="font-semibold tracking-tight">¿No encontraste lo que buscabas?</p>
              <p className="mt-0.5 text-sm leading-6 text-gray-500">
                Escribinos y te contestamos. Si la pregunta se repite, termina siendo un artículo acá.
              </p>
            </div>
          </div>
          <Link
            href="/contacto"
            className="shrink-0 rounded-xl bg-orange-600 px-5 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
          >
            Escribinos
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
