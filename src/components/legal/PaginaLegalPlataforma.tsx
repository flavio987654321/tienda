import Link from "next/link";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import { TERMS_LAST_UPDATED } from "@/lib/legal";

/**
 * La cáscara de /terminos y /privacidad.
 *
 * ── Por qué es un componente y no está copiada en cada página ────────────────
 * Porque estaba copiada, byte por byte, en las dos: mismo nav, mismo cuadro de
 * datos del responsable, mismas pestañas de rol, mismo render de secciones. Lo
 * único que cambiaba era el título, el `href` de las pestañas y el encabezado
 * del cuadro. Dos copias de 75 líneas que había que acordarse de tocar juntas.
 *
 * ── Por qué es clara y no oscura ─────────────────────────────────────────────
 * Eran las dos ÚNICAS páginas oscuras de todo TiendaApps: la portada, /precios,
 * /quienes-somos y /comunidad son claras. Alguien venía de la página de precios,
 * tocaba "Términos" y sentía que se había ido a otro sitio. Y son documentos de
 * quinientas líneas: para leer eso, el fondo claro cansa bastante menos.
 *
 * El contenido legal no vive acá — cada página trae el suyo. Esto solo lo
 * muestra.
 */

export type SeccionLegal = {
  title: string;
  body?: string | null;
  list?: readonly string[];
};

export type RolLegal = {
  label: string;
  sections: readonly SeccionLegal[];
};

/**
 * El color de cada rol, en versión clara.
 *
 * Antes cada archivo de contenido cargaba sus propias clases de Tailwind
 * (`text-indigo-400`, `bg-indigo-500/10`…), o sea que el contenido legal sabía
 * de qué color era el tema. Al pasar a fondo claro había que editar los dos
 * archivos; ahora el color vive donde se usa.
 */
const COLOR_ROL: Record<string, { texto: string; activo: string; borde: string }> = {
  owner:  { texto: "text-indigo-700", activo: "bg-indigo-50 border-indigo-200 text-indigo-700", borde: "border-indigo-600" },
  seller: { texto: "text-purple-700", activo: "bg-purple-50 border-purple-200 text-purple-700", borde: "border-purple-600" },
  buyer:  { texto: "text-pink-700",   activo: "bg-pink-50 border-pink-200 text-pink-700",       borde: "border-pink-600" },
  donor:  { texto: "text-amber-700",  activo: "bg-amber-50 border-amber-200 text-amber-700",    borde: "border-amber-600" },
};
const COLOR_POR_DEFECTO = { texto: "text-slate-800", activo: "bg-slate-100 border-slate-300 text-slate-700", borde: "border-slate-500" };

/** "3. Planes disponibles" → "planes-disponibles", para el índice y el link. */
export function anclaDeSeccion(titulo: string): string {
  return titulo
    .toLowerCase()
    .replace(/^[\d\s.]+/, "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "seccion";
}

/**
 * El rol pedido por la URL, o `null` si no es uno de los que existen.
 *
 * El `??` que había antes no alcanzaba: `CONTENT[role] ?? CONTENT.buyer` tapa
 * una clave inexistente, pero no una heredada de `Object.prototype`.
 * `?role=constructor` devolvía la función `Object` —que es truthy, así que el
 * `??` no la reemplazaba— y la página reventaba con un 500 al hacer
 * `content.sections.map`. `?role=toString` y `?role=__proto__`, igual.
 */
export function rolValido<T extends object>(crudo: string | undefined, roles: T): keyof T | null {
  if (typeof crudo !== "string") return null;
  return Object.prototype.hasOwnProperty.call(roles, crudo) ? (crudo as keyof T) : null;
}

export default function PaginaLegalPlataforma({
  titulo, ruta, tituloResponsable, roles, rolActivo,
}: {
  titulo: string;
  ruta: "/terminos" | "/privacidad";
  tituloResponsable: string;
  roles: Record<string, RolLegal>;
  rolActivo: string;
}) {
  const contenido = roles[rolActivo];
  const color = COLOR_ROL[rolActivo] ?? COLOR_POR_DEFECTO;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600">
              <ShoppingBag className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="text-sm font-semibold tracking-tight">TiendaApps</span>
          </Link>
          <Link
            href="/registro"
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Volver al registro</span>
            <span className="sm:hidden">Volver</span>
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
        <header className="border-b border-slate-200 pb-8">
          <span className={`inline-block rounded-full border px-3 py-1 text-[11px] font-semibold ${color.activo}`}>
            {contenido.label}
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{titulo}</h1>
          <p className="mt-2 text-sm text-slate-500">Última actualización: {TERMS_LAST_UPDATED}</p>

          <dl className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              {tituloResponsable}
            </p>
            {[
              ["Nombre", "Flavio Cesar Soltero Legoas"],
              ["CUIL", "20-94992405-0"],
              ["Domicilio", "Bacota 1833 (entre Apolo y Juno), Pinamar, Buenos Aires, CP 7167"],
            ].map(([k, v]) => (
              <div key={k} className="py-1 sm:flex sm:gap-6">
                <dt className="text-sm text-slate-500 sm:w-28 sm:shrink-0">{k}</dt>
                <dd className="text-sm text-slate-800">{v}</dd>
              </div>
            ))}
            <div className="py-1 sm:flex sm:gap-6">
              <dt className="text-sm text-slate-500 sm:w-28 sm:shrink-0">Email</dt>
              <dd>
                <a href="mailto:marketplacemitienda@gmail.com" className="break-all text-sm text-indigo-700 underline underline-offset-2">
                  marketplacemitienda@gmail.com
                </a>
              </dd>
            </div>
          </dl>
        </header>

        {/* Las pestañas de rol: cada uno lee lo suyo en vez de un ladrillo único. */}
        <nav aria-label="Tipo de usuario" className="flex flex-wrap gap-2 border-b border-slate-200 py-6">
          {Object.entries(roles).map(([clave, rol]) => {
            const esActivo = clave === rolActivo;
            return (
              <Link
                key={clave}
                href={`${ruta}?role=${clave}`}
                aria-current={esActivo ? "page" : undefined}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  esActivo
                    ? (COLOR_ROL[clave] ?? COLOR_POR_DEFECTO).activo
                    : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                {rol.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-10 gap-12 lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:items-start">
          {/* Un índice: son más de veinte secciones y sin esto la única forma de
              encontrar algo es scrollear el documento entero. */}
          <nav
            aria-label="Índice"
            className="mb-10 border-b border-slate-200 pb-6 lg:sticky lg:top-24 lg:mb-0 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:border-b-0 lg:pb-0"
          >
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Contenido</p>
            <ul className="space-y-1">
              {contenido.sections.map((s) => (
                <li key={s.title}>
                  <a
                    href={`#${anclaDeSeccion(s.title)}`}
                    className="block border-l-2 border-transparent py-0.5 pl-3 text-[13px] leading-snug text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 max-w-[70ch] space-y-10">
            {contenido.sections.map((s) => (
              <section key={s.title} id={anclaDeSeccion(s.title)} className="scroll-mt-24">
                <h2 className={`text-lg font-bold tracking-tight ${color.texto}`}>{s.title}</h2>
                {s.body && <p className="mt-3 text-[15px] leading-7 text-slate-700">{s.body}</p>}
                {s.list && (
                  <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-slate-300">
                    {s.list.map((item) => (
                      <li key={item} className="text-[15px] leading-7 text-slate-700">{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
