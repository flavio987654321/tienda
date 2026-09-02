/* ══════════════════════════════════════════════════════════════════════════
   LA PÁGINA DE VENTA — la única pieza que la dibuja
   ══════════════════════════════════════════════════════════════════════════

   ⚠️ **Esto se usa en los dos lados**: la página pública que ve quien compra y
   la vista previa del panel. Si fueran dos componentes se separarían solos y la
   previa terminaría mintiendo — ya pasó con la previa de los templates de
   tienda, que apagaba los clics y mostraba algo que no era lo que se publicaba.

   No decide NADA. Las secciones, su orden y sus topes salen de
   `lib/pagina-venta`; el nombre, la imagen y el precio salen del producto. Acá
   sólo se dibuja.

   ── Por qué no se parece al panel ───────────────────────────────────────────

   El panel tiene barra lateral, tema claro/oscuro y densidad de tablero. Esto es
   lo contrario: una sola columna, ancha, clara, sin nada para tocar salvo el
   botón de comprar. Cada cosa que se pueda clickear y no sea comprar es una
   puerta de salida.

   Por eso tampoco sigue el tema del panel: la página pública es clara siempre.
   Quien la ve no tiene cuenta ni preferencia guardada. */

import { seDibuja, type PaginaVenta } from "@/lib/pagina-venta";
import BarraDeOferta from "./BarraDeOferta";

export type ProductoParaPagina = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  imagen: string | null;
};

export type DatosDePagina = {
  pagina: PaginaVenta;
  /** El principal. Su nombre, su imagen y su precio NO se copian al contenido. */
  producto: ProductoParaPagina;
  bonos: ProductoParaPagina[];
  /** Quién vende, para el pie. */
  vendedor: { nombre: string | null; contacto: string | null };
  /** `true` en la vista previa: apaga el botón para no arrancar un pago. */
  esPrevia?: boolean;
};

function money(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n);
}


const texto = (c: Record<string, unknown>, k: string): string =>
  typeof c[k] === "string" ? (c[k] as string) : "";

const lista = (c: Record<string, unknown>, k: string): Array<Record<string, string>> =>
  Array.isArray(c[k]) ? (c[k] as Array<Record<string, string>>) : [];

/* ── Piezas repetidas ───────────────────────────────────────────────────────
 *
 * El botón de comprar aparece dos veces (portada y precio) a propósito: en el
 * celular la página es larga y volver arriba a buscar el botón es donde se
 * pierde la venta. Es el mismo componente, no dos copias. */

function BotonComprar({ children, esPrevia }: { children: string; esPrevia?: boolean }) {
  const clases =
    "inline-flex w-full max-w-md items-center justify-center rounded-xl bg-orange-600 px-6 py-4 " +
    "text-base font-semibold text-white shadow-lg shadow-orange-600/20 transition " +
    "hover:bg-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
    "focus-visible:outline-orange-600 sm:text-lg";

  /* En la previa no es un enlace: se ve igual pero no arranca un pago. */
  if (esPrevia) {
    return (
      <button type="button" disabled className={`${clases} cursor-default opacity-95`}>
        {children}
      </button>
    );
  }
  /* 🔲 El destino real es el checkout, que todavía no existe (Fase 5). */
  return <button type="button" className={clases}>{children}</button>;
}

function Titulo({ children }: { children: string }) {
  if (!children) return null;
  return (
    <h2 className="text-balance text-center text-2xl font-bold text-slate-900 sm:text-3xl">
      {children}
    </h2>
  );
}

function Seccion({ children, tono }: { children: React.ReactNode; tono?: "gris" }) {
  return (
    <section className={tono === "gris" ? "bg-slate-50" : ""}>
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">{children}</div>
    </section>
  );
}

/* ── El dibujo de cada sección ──────────────────────────────────────────────
 *
 * Una sección encendida pero SIN CONTENIDO no se dibuja. Un título de "Además
 * te llevás gratis" sin ningún bono abajo es peor que no tener la sección. */

function Contenido({ clave, campos, datos }: {
  clave: string;
  campos: Record<string, unknown>;
  datos: DatosDePagina;
}) {
  const { producto, bonos, vendedor, esPrevia } = datos;

  switch (clave) {
    case "portada": {
      const titulo = texto(campos, "titulo");
      const imagen = texto(campos, "imagen") || producto.imagen;
      return (
        <Seccion>
          <div className="flex flex-col items-center gap-6 text-center">
            <h1 className="text-balance text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl md:text-5xl">
              {titulo || producto.name}
            </h1>
            {texto(campos, "subtitulo") && (
              <p className="max-w-2xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
                {texto(campos, "subtitulo")}
              </p>
            )}
            {imagen && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={imagen}
                alt=""
                className="w-full max-w-md rounded-2xl border border-slate-200 object-cover shadow-sm"
              />
            )}
            <BotonComprar esPrevia={esPrevia}>{texto(campos, "textoBoton")}</BotonComprar>
          </div>
        </Seccion>
      );
    }

    case "producto":
      return (
        <Seccion tono="gris">
          <Titulo>{texto(campos, "titulo")}</Titulo>
          <div className="mt-8 flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-start sm:gap-6 sm:p-6">
            {producto.imagen && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={producto.imagen}
                alt=""
                className="h-40 w-full shrink-0 rounded-xl object-cover sm:h-36 sm:w-32"
              />
            )}
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-900">{producto.name}</h3>
              {producto.description && (
                <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-600">
                  {producto.description}
                </p>
              )}
            </div>
          </div>
        </Seccion>
      );

    case "bonos": {
      return (
        <Seccion>
          <Titulo>{texto(campos, "titulo")}</Titulo>
          {texto(campos, "subtitulo") && (
            <p className="mt-3 text-center text-slate-600">{texto(campos, "subtitulo")}</p>
          )}
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {bonos.map((b) => (
              <li key={b.id} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                <h3 className="font-semibold text-slate-900">{b.name}</h3>
                {b.description && (
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{b.description}</p>
                )}
                <p className="mt-3 flex items-baseline gap-2">
                  <span className="text-base font-bold text-emerald-700">GRATIS</span>
                  {b.comparePrice ? (
                    <span className="text-sm text-slate-400 line-through">{money(b.comparePrice)}</span>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </Seccion>
      );
    }

    case "beneficios":
    case "dolores": {
      const items = lista(campos, "items").filter((i) => i.texto);
      const esDolor = clave === "dolores";
      return (
        <Seccion tono={esDolor ? "gris" : undefined}>
          <Titulo>{texto(campos, "titulo")}</Titulo>
          <ul className="mx-auto mt-8 grid max-w-2xl gap-3">
            {items.map((i, n) => (
              <li
                key={n}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm font-bold ${
                    esDolor ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {esDolor ? "!" : "✓"}
                </span>
                <span className="text-pretty text-slate-700">{i.texto}</span>
              </li>
            ))}
          </ul>
        </Seccion>
      );
    }

    case "comoFunciona": {
      const pasos = lista(campos, "pasos").filter((p) => p.titulo || p.detalle);
      return (
        <Seccion>
          <Titulo>{texto(campos, "titulo")}</Titulo>
          <ol className="mx-auto mt-8 grid max-w-2xl gap-4">
            {pasos.map((p, n) => (
              <li key={n} className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-100 font-bold text-orange-700"
                >
                  {n + 1}
                </span>
                <div className="min-w-0">
                  {p.titulo && <h3 className="font-semibold text-slate-900">{p.titulo}</h3>}
                  {p.detalle && (
                    <p className="mt-1 text-pretty text-sm leading-relaxed text-slate-600">
                      {p.detalle}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Seccion>
      );
    }

    case "opiniones": {
      const items = lista(campos, "items").filter((i) => i.texto);
      return (
        <Seccion tono="gris">
          <Titulo>{texto(campos, "titulo")}</Titulo>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {items.map((i, n) => (
              <figure key={n} className="rounded-2xl border border-slate-200 bg-white p-5">
                <blockquote className="text-pretty leading-relaxed text-slate-700">
                  {i.texto}
                </blockquote>
                {i.nombre && (
                  <figcaption className="mt-3 text-sm font-medium text-slate-500">
                    {i.nombre}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </Seccion>
      );
    }

    case "precio": {
      const ahorro =
        producto.comparePrice && producto.comparePrice > producto.price
          ? producto.comparePrice - producto.price
          : 0;
      return (
        <Seccion>
          <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-3xl border border-orange-200 bg-orange-50/50 px-5 py-10 text-center sm:px-8">
            <Titulo>{texto(campos, "titulo")}</Titulo>
            <div>
              {/* El precio no se puede ocultar: `lib/pagina-venta` no le da botón
                  de apagar, y mandar visible:false tampoco lo apaga. */}
              <p className="text-4xl font-extrabold text-slate-900 sm:text-5xl">
                {money(producto.price)}
              </p>
              {ahorro > 0 && producto.comparePrice ? (
                <p className="mt-2 text-slate-500">
                  <span className="line-through">{money(producto.comparePrice)}</span>{" "}
                  <span className="font-semibold text-emerald-700">
                    ahorrás {money(ahorro)}
                  </span>
                </p>
              ) : null}
            </div>
            <BotonComprar esPrevia={esPrevia}>{texto(campos, "textoBoton")}</BotonComprar>
            {texto(campos, "aclaracion") && (
              <p className="text-sm text-slate-500">{texto(campos, "aclaracion")}</p>
            )}
          </div>
        </Seccion>
      );
    }

    case "garantia": {
      return (
        <Seccion tono="gris">
          <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-white p-6 text-center">
            <Titulo>{texto(campos, "titulo")}</Titulo>
            <p className="mt-3 text-pretty leading-relaxed text-slate-600">
              {texto(campos, "texto")}
            </p>
          </div>
        </Seccion>
      );
    }

    case "preguntas": {
      const items = lista(campos, "items").filter((i) => i.pregunta);
      return (
        <Seccion>
          <Titulo>{texto(campos, "titulo")}</Titulo>
          {/* `details` nativo: abre y cierra sin una línea de JavaScript, y
              funciona igual si el script no cargó. */}
          <div className="mx-auto mt-8 grid max-w-2xl gap-3">
            {items.map((i, n) => (
              <details
                key={n}
                className="group rounded-xl border border-slate-200 bg-white px-5 py-4"
              >
                <summary className="cursor-pointer list-none font-medium text-slate-900 marker:content-none">
                  <span className="flex items-start justify-between gap-4">
                    <span className="text-pretty">{i.pregunta}</span>
                    <span aria-hidden="true" className="mt-0.5 shrink-0 text-slate-400 transition group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                {i.respuesta && (
                  <p className="mt-3 text-pretty leading-relaxed text-slate-600">{i.respuesta}</p>
                )}
              </details>
            ))}
          </div>
        </Seccion>
      );
    }

    case "urgencia": {
      /* Sin fecha no hay cartel. Y si la fecha ya pasó tampoco: eso lo decide
         `BarraDeOferta`, que corre en el navegador — comparar contra "ahora"
         acá daría una barra congelada en el momento en que se dibujó la página,
         y con caché podría seguir anunciando una oferta ya vencida. */
      const hasta = typeof campos.hasta === "string" ? campos.hasta : null;
      if (!hasta) return null;
      return <BarraDeOferta texto={texto(campos, "texto")} hasta={hasta} />;
    }

    case "pie":
      return (
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-3xl px-5 py-10 text-center text-sm text-slate-500 sm:px-8">
            {texto(campos, "texto") && (
              <p className="mb-4 text-pretty">{texto(campos, "texto")}</p>
            )}
            {vendedor.nombre && <p className="font-medium text-slate-700">{vendedor.nombre}</p>}
            {vendedor.contacto && <p className="mt-1">{vendedor.contacto}</p>}
            <p className="mt-4 text-xs">
              <a href="/terminos" className="underline hover:text-slate-700">Términos</a>
              {" · "}
              <a href="/privacidad" className="underline hover:text-slate-700">Privacidad</a>
            </p>
          </div>
        </footer>
      );

    default:
      return null;
  }
}

export default function PaginaDeVenta(datos: DatosDePagina) {
  /* ⚠️ Qué se dibuja lo decide `seDibuja`, en `lib/pagina-venta`, y NO cada
     `case` de acá. Es la misma función que el editor usa para avisar "esta
     sección no se va a ver, y por qué". Si la regla viviera acá adentro, el
     panel diría una cosa y la página haría otra — que es la peor forma de
     enterarse de que tu página salió a medias. */
  const ctx = { hayBonos: datos.bonos.length > 0 };
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {datos.pagina.secciones.map((s) =>
        seDibuja(s, ctx) ? (
          <Contenido key={s.clave} clave={s.clave} campos={s.campos} datos={datos} />
        ) : null
      )}
    </div>
  );
}
