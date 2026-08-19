import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Chip from "@/components/ayuda/Chip";
import Cuerpo from "@/components/ayuda/Cuerpo";
import { buscarArticulo, relacionadosDe, articulosDe } from "@/lib/ayuda";
import type { BaseAyuda, RolDePanel } from "./PanelAyuda";

/**
 * Un artículo de ayuda, dibujado adentro del panel.
 *
 * El porqué de que esto exista y no sea un link a `/ayuda/<slug>` está en el
 * comentario largo de `PanelAyuda`: esa ruta queda fuera del `scope` de los dos
 * manifiestos y desde la app instalada se convertía en una puerta al sitio
 * entero.
 *
 * ── Lo que NO se copia de la versión pública ─────────────────────────────────
 * La de `/ayuda/[slug]` trae la barra del sitio, el pie, y un índice lateral con
 * los cinco grupos. Acá no van: la barra y el pie son navegación del sitio
 * comercial —o sea, la fuga otra vez, escrita de otra forma— y el índice lateral
 * sólo aparecía desde `lg`, que en un teléfono no existe.
 *
 * Queda el artículo, el link para volver al índice, y los relacionados.
 *
 * ── El link "En el panel" ────────────────────────────────────────────────────
 * `articulo.pantalla.href` apunta siempre a una pantalla del panel
 * (`/dashboard/...` o `/afiliados/...`), así que ya está adentro del `scope` y
 * puede ser un link normal. Lo que sí se le saca es el `ExternalLink` que tiene
 * la versión pública: ahí ese ícono decía la verdad —te sacaba de la ayuda y te
 * metía en el panel—, y acá diría una mentira, porque ya estás adentro.
 *
 * Igual se verifica que el artículo sea del rol correcto antes de dibujarlo. Ver
 * abajo.
 */
const FECHA_LARGA: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };

export default function PanelAyudaArticulo({
  base,
  rol,
  slug,
}: {
  base: BaseAyuda;
  rol: RolDePanel;
  slug: string;
}) {
  const articulo = buscarArticulo(slug);

  /* No alcanza con que el artículo exista: tiene que ser de ESTE panel.
   *
   * Sin este filtro, escribir `/afiliados/ayuda/como-cargar-un-producto` le
   * abriría a un afiliado un artículo sobre pantallas que no tiene, con un link
   * "En el panel" apuntando a `/dashboard/...` — o sea una salida del scope
   * puesta por la propia ayuda, que es justo lo que este archivo viene a evitar.
   *
   * Se usa la misma función que arma el índice, así que lo que se puede abrir es
   * exactamente lo que se puede listar. Dos listas separadas se habrían separado.
   *
   * ── Por qué vuelve al índice y no tira un 404 ────────────────────────────
   * La primera versión llamaba a `notFound()`. Correcto de manual, malo acá: el
   * proyecto no tiene `not-found.tsx` propio, así que sale la pantalla que trae
   * Next —"This page could not be found", en inglés y sin un solo link—. En el
   * navegador se sale con la barra de direcciones; adentro de la app instalada
   * NO HAY barra, y quedás mirando una pantalla en blanco en otro idioma.
   *
   * Volver al índice de la ayuda de este panel deja a la persona en un lugar
   * útil, en castellano y adentro del `scope`. Y el caso es raro de por sí: hay
   * que escribir la dirección a mano, porque ningún link del panel lleva a un
   * artículo del otro rol. */
  /* El listado del rol se arma UNA vez y se usa para las dos cosas: decidir si
     este artículo se puede abrir, y podar los relacionados. Antes se llamaba a
     `articulosDe` de nuevo por cada relacionado —el filtro entero, adentro del
     `some`—, y sobre todo eran dos listas que podían dejar de coincidir. */
  const delRol = articulosDe({ rol });

  const permitido = articulo && delRol.some((a) => a.slug === articulo.slug);
  if (!permitido) redirect(base);

  const relacionados = relacionadosDe(articulo).filter((a) =>
    delRol.some((p) => p.slug === a.slug)
  );
  const actualizado = new Date(`${articulo.actualizado}T12:00:00`).toLocaleDateString(
    "es-AR",
    FECHA_LARGA
  );

  return (
    <div className="min-h-screen bg-white [color-scheme:light]">
      <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8 sm:py-10">
        <Link
          href={base}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Centro de ayuda
        </Link>

        <article className="mt-6 min-w-0">
          <header className="flex flex-col gap-3 border-b border-gray-200 pb-7">
            <Chip clase={articulo.clase} />
            <h1 className="text-2xl font-black tracking-tight text-balance text-gray-950 sm:text-3xl">
              {articulo.titulo}
            </h1>
            <p className="text-[15px] leading-relaxed text-gray-500">{articulo.resumen}</p>

            {articulo.pantalla && (
              <p className="mt-1 text-sm text-gray-500">
                En el panel:{" "}
                <Link
                  href={articulo.pantalla.href}
                  className="font-semibold text-orange-700 underline underline-offset-2 hover:text-orange-600"
                >
                  {articulo.pantalla.label}
                </Link>
              </p>
            )}
          </header>

          <div className="mt-7">
            <Cuerpo bloques={articulo.cuerpo} />
          </div>

          <p className="mt-9 text-xs text-gray-400">Última actualización: {actualizado}</p>

          {relacionados.length > 0 && (
            <section className="mt-12 border-t border-gray-200 pt-7">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400">
                Seguir por acá
              </h2>
              <ul className="mt-3 flex flex-col">
                {relacionados.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`${base}/${a.slug}`}
                      className="group flex items-start gap-4 border-b border-gray-100 py-4 transition-colors last:border-0 hover:bg-orange-50/40"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-semibold tracking-tight text-gray-950">{a.titulo}</span>
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
    </div>
  );
}
