import Link from "next/link";
import { ArrowLeft, ArrowRight, Search, X } from "lucide-react";
import Chip from "@/components/ayuda/Chip";
import { porGrupo, buscar, type Articulo, type Lector } from "@/lib/ayuda";
import type { StoreType } from "@/lib/storeTypes";

/**
 * El centro de ayuda, pero adentro del panel.
 *
 * ── Por qué existe si ya está `/ayuda` ───────────────────────────────────────
 * Porque `/ayuda` está FUERA del `scope` de los dos manifiestos —`/dashboard` y
 * `/afiliados`—, y esa es exactamente la fuga que Flavio encontró en el teléfono:
 * tocaba "Centro de ayuda" en la app instalada y terminaba navegando el sitio
 * comercial entero adentro de la ventana del panel, sin barra de direcciones y
 * sin forma de volver.
 *
 * El `target="_blank"` no lo arregla. Ya lo habíamos comprobado con el botón "Ir
 * al sitio principal": desde una app instalada, Android abre eso en una pestaña
 * de Chrome donde el sitio queda navegable igual. La única forma de que no se
 * pueda salir del panel es que no haya a dónde salir.
 *
 * Así que la ayuda se dibuja acá, bajo `/dashboard/ayuda` y `/afiliados/ayuda`.
 * Mismos artículos, mismo componente de cuerpo, misma tabla de datos: lo único
 * que cambia es de qué prefijo cuelgan los links. Adentro del `scope` no hay
 * navegación que se pueda escapar, y de paso el botón "atrás" del teléfono
 * funciona, que en una app sin barra de direcciones es lo único que hay.
 *
 * `/ayuda` sigue existiendo igual y sin tocar: es pública, la indexa Google y es
 * la que lee alguien que todavía no tiene cuenta.
 *
 * ── Por qué es un componente de servidor ─────────────────────────────────────
 * Los artículos son 2.200 líneas de texto. Un panel de ayuda hecho en el
 * navegador se los bajaría enteros con tal de mostrar una lista de títulos —es
 * el mismo motivo por el que existe `lib/ayuda/pantallas.ts`—. Dibujado en el
 * servidor no viaja ni un artículo al teléfono hasta que se abre uno.
 *
 * ── Por qué fondo claro y fijo ───────────────────────────────────────────────
 * `Cuerpo` y `Chip` son los del centro de ayuda público, que es una página clara
 * y no tiene variantes oscuras. Reescribirlos con `dark:` en cada clase para dos
 * pantallas sería tener dos versiones de la ayuda que se van a separar. Se fija
 * el esquema claro acá, igual que hace el panel con el aviso de suscripción.
 */

/* De dónde cuelga todo. Lo pasa cada panel: `/dashboard/ayuda` o
   `/afiliados/ayuda`. Nunca se arma solo a partir de la ruta actual — un error
   ahí sería justo la fuga que esto viene a cerrar. */
export type BaseAyuda = "/dashboard/ayuda" | "/afiliados/ayuda";

/* Quién mira. Es a proposito un tipo mas angosto que el `Rol` de la ayuda: ese
   incluye "ambos", que describe a un ARTICULO que le sirve a los dos, no a una
   persona. Un panel siempre es de uno o del otro. */
export type RolDePanel = "dueno" | "afiliado";

function Fila({ articulo, base }: { articulo: Articulo; base: BaseAyuda }) {
  return (
    <li>
      <Link
        href={`${base}/${articulo.slug}`}
        className="group flex items-start justify-between gap-4 border-b border-gray-100 py-4 transition-colors hover:bg-gray-50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-gray-950">{articulo.titulo}</span>
            <Chip clase={articulo.clase} />
          </div>
          <p className="mt-1 text-sm leading-6 text-gray-500">{articulo.resumen}</p>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-gray-500" />
      </Link>
    </li>
  );
}

export default function PanelAyuda({
  base,
  rol,
  rubro,
  volverA,
  consulta,
}: {
  base: BaseAyuda;
  rol: RolDePanel;
  /** Sólo el dueño lo tiene: el rubro decide si los artículos que hablan del
      checkout le sirven o le sobran. El afiliado no tiene tienda propia. */
  rubro?: StoreType;
  /** La pantalla de inicio del panel, para la flecha de arriba. */
  volverA: string;
  consulta: string;
}) {
  /* Los dos filtros viajan juntos en un `Lector`, que es lo que esperan
     `buscar` y `porGrupo`. Armado una sola vez para que no se separen. */
  const lector: Lector = { rol, rubro };
  const buscando = consulta.trim().length > 0;
  const resultados = buscando ? buscar(consulta, lector) : [];
  /* Con resultados el índice NO va abajo: la búsqueda ya contestó, y los cinco
     grupos enteros empujan esa respuesta fuera de la pantalla. Es lo mismo que
     hace `/ayuda`. Sin resultados sí va — el porqué está más abajo. */
  const grupos = buscando && resultados.length > 0 ? [] : porGrupo(lector);

  return (
    <div className="min-h-screen bg-white [color-scheme:light]">
      <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8 sm:py-10">
        <Link
          href={volverA}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al panel
        </Link>

        <header className="mt-5">
          <h1 className="text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">
            Centro de ayuda
          </h1>
          <p className="mt-2 text-[15px] leading-7 text-gray-500">
            {rol === "afiliado"
              ? "Cómo compartir, cómo se cuentan tus comisiones y cómo cobrarlas."
              : "Cómo publicar tu tienda, armar promociones, cobrar y aparecer en Google."}
          </p>
        </header>

        {/* Un `<form>` sin JavaScript, igual que en la ayuda pública: el servidor
            ya está armando esta página, así que puede filtrar acá. Buscar en el
            navegador obligaría a mandarle los artículos enteros al teléfono para
            una búsqueda que la mayoría no hace. */}
        <form action={base} method="get" className="mt-7 flex gap-2" role="search">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="search"
              name="q"
              defaultValue={consulta}
              placeholder="Buscar — ej. cómo cobro"
              aria-label="Buscar en la ayuda"
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-[15px] text-gray-950 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
          >
            Buscar
          </button>
        </form>

        {buscando ? (
          <section className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold tracking-tight text-gray-950">
                {resultados.length === 0
                  ? "Sin resultados"
                  : `${resultados.length} ${resultados.length === 1 ? "resultado" : "resultados"}`}{" "}
                <span className="font-medium text-gray-400">para «{consulta}»</span>
              </h2>
              <Link
                href={base}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-950"
              >
                <X className="h-3.5 w-3.5" />
                Limpiar
              </Link>
            </div>

            {resultados.length > 0 ? (
              <ul className="mt-2 flex flex-col">
                {resultados.map((a) => (
                  <Fila key={a.slug} articulo={a} base={base} />
                ))}
              </ul>
            ) : (
              /* Sin resultados se muestra el índice igual. Una pantalla vacía
                 con "no encontramos nada" deja a la persona en un callejón; con
                 los temas abajo, al menos puede mirar. */
              <p className="mt-4 text-sm leading-6 text-gray-500">
                No hay ningún artículo con esas palabras. Mirá los temas de abajo,
                o escribinos desde Soporte si lo que necesitás no está.
              </p>
            )}
          </section>
        ) : null}

        {grupos.map((g) => (
          <section key={g.key} className="mt-9">
            <h2 className="text-lg font-bold tracking-tight text-gray-950">{g.titulo}</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">{g.bajada}</p>
            <ul className="mt-3 flex flex-col">
              {g.articulos.map((a) => (
                <Fila key={a.slug} articulo={a} base={base} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
