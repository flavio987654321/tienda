import Link from "next/link";
import { ArrowRight, LifeBuoy, Store, Users, Search, X } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import Chip from "@/components/ayuda/Chip";
import { porGrupo, buscar, type Articulo, type Lector } from "@/lib/ayuda";
import { getCurrentUser } from "@/lib/auth-session";
import { getStoreType, type StoreType } from "@/lib/storeTypes";
import { prisma } from "@/lib/prisma";

/* El ÍNDICE lee la sesión, así que se arma en cada pedido. Las fichas de cada
   artículo NO: siguen generándose en el build, que es lo que las hace rápidas y
   lo que Google rastrea. La sesión solo decide qué se LISTA acá.

   Un visitante sin sesión —y el robot de Google, que nunca la tiene— los ve
   todos. */
export const dynamic = "force-dynamic";

/* Quién está mirando: su rol y, si es dueño, el rubro de su tienda.
 *
 * Nunca tira: la ayuda tiene que abrir aunque la base no conteste. Si algo
 * falla, se cae para el lado de mostrar todo — de más nunca dejó a nadie sin
 * la respuesta que buscaba.
 *
 * ADMIN y BUYER quedan sin rol a propósito: no tienen artículos propios, así
 * que filtrarles por rol les dejaría la ayuda vacía. Ven todo. */
async function quienLee(): Promise<Lector> {
  try {
    const user = await getCurrentUser();
    if (!user) return {};

    if (user.role === "SELLER") return { rol: "afiliado" };
    if (user.role !== "OWNER") return {};

    const store = await prisma.store.findUnique({
      where: { ownerId: user.id },
      select: { tipoTienda: true },
    });
    return { rol: "dueno", rubro: (store?.tipoTienda as StoreType | undefined) ?? undefined };
  } catch (e) {
    console.error("[ayuda] no se pudo leer quién está mirando:", e);
    return {};
  }
}

/* Una fila del listado. La misma para el índice agrupado y para los
   resultados de la búsqueda: si fueran dos, un día se ven distinto. */
function Fila({ articulo }: { articulo: Articulo }) {
  return (
    <li>
      <Link
        href={`/ayuda/${articulo.slug}`}
        className="group flex items-start gap-4 border-b border-gray-100 py-5 transition-colors last:border-0 hover:bg-orange-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="font-semibold tracking-tight text-gray-950">{articulo.titulo}</h3>
            <Chip clase={articulo.clase} />
          </div>
          <p className="text-sm leading-6 text-gray-500">{articulo.resumen}</p>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-orange-600" />
      </Link>
    </li>
  );
}

type Props = { searchParams: Promise<{ todo?: string; q?: string }> };

export default async function AyudaIndexPage({ searchParams }: Props) {
  const { todo, q } = await searchParams;
  const lector: Lector = todo === "1" ? {} : await quienLee();
  const config = lector.rubro ? getStoreType(lector.rubro) : null;

  const consulta = (q ?? "").trim();
  const buscando = consulta.length > 0;
  const resultados = buscando ? buscar(consulta, lector) : [];
  const grupos = buscando ? [] : porGrupo(lector);

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
        {lector.rol && (
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            {lector.rol === "afiliado" ? (
              <Users className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
            ) : (
              <Store className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
            )}
            <p className="text-sm text-gray-600">
              {lector.rol === "afiliado" ? (
                <>Estás viendo la ayuda para <span className="font-semibold text-gray-950">afiliados</span>.</>
              ) : config ? (
                <>
                  Estás viendo la ayuda de una tienda de{" "}
                  <span className="font-semibold text-gray-950">{config.label}</span>.
                </>
              ) : (
                <>Estás viendo la ayuda para <span className="font-semibold text-gray-950">dueños de tienda</span>.</>
              )}
            </p>
            <Link
              href="/ayuda?todo=1"
              className="text-sm font-semibold text-orange-700 underline underline-offset-2 hover:text-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
            >
              Ver todos los artículos
            </Link>
          </div>
        )}

        {/* Un `<form>` de toda la vida, sin JavaScript. La búsqueda se resuelve
            en el servidor, que ya está armando esta página para leer la sesión:
            filtrar en el navegador obligaría a mandarle el texto de todos los
            artículos a cada visita, para una búsqueda que la mayoría
            no va a hacer. */}
        <form action="/ayuda" method="get" className="mt-8 flex gap-2" role="search">
          {todo === "1" && <input type="hidden" name="todo" value="1" />}
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="search"
              name="q"
              defaultValue={consulta}
              placeholder="Buscar en la ayuda — ej. envío gratis, cupón vencido"
              aria-label="Buscar en la ayuda"
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-[15px] text-gray-950 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
          >
            Buscar
          </button>
        </form>

        {buscando ? (
          <section className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold tracking-tight">
                {resultados.length === 0
                  ? "Sin resultados"
                  : `${resultados.length} ${resultados.length === 1 ? "resultado" : "resultados"}`}{" "}
                <span className="font-medium text-gray-400">para «{consulta}»</span>
              </h2>
              <Link
                href={todo === "1" ? "/ayuda?todo=1" : "/ayuda"}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
              >
                <X className="h-3.5 w-3.5" />
                Limpiar
              </Link>
            </div>

            {resultados.length > 0 ? (
              <ul className="mt-2 flex flex-col">
                {resultados.map((a) => (
                  <Fila key={a.slug} articulo={a} />
                ))}
              </ul>
            ) : (
              /* Sin resultados no se deja al lector en una pared en blanco: se
                 le dice qué probar y se le deja la salida de escribirnos. */
              <div className="mt-6 flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 px-6 py-8">
                <p className="text-sm font-semibold text-gray-950">
                  No encontramos nada con esas palabras.
                </p>
                <p className="max-w-xl text-sm leading-6 text-gray-500">
                  Probá con menos palabras, o con el nombre que usa el panel —{" "}
                  <span className="font-medium text-gray-700">cupón</span>,{" "}
                  <span className="font-medium text-gray-700">envío</span>,{" "}
                  <span className="font-medium text-gray-700">pedido</span>. Si no está, escribinos
                  y lo escribimos.
                </p>
              </div>
            )}
          </section>
        ) : (
          <div className="mt-12 flex flex-col gap-14">
            {grupos.map((grupo) => (
              <section key={grupo.key}>
                <div className="flex flex-col gap-1 border-b border-gray-100 pb-4">
                  <h2 className="text-xl font-bold tracking-tight">{grupo.titulo}</h2>
                  <p className="text-sm text-gray-500">{grupo.bajada}</p>
                </div>

                <ul className="mt-2 flex flex-col">
                  {grupo.articulos.map((articulo) => (
                    <Fila key={articulo.slug} articulo={articulo} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

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
