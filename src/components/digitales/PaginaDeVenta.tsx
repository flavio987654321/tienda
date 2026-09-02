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

import {
  seDibuja, conFichas, buscarEstilo, buscarPaleta,
  type PaginaVenta, type Estilo,
} from "@/lib/pagina-venta";
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
  /** El año en curso, para el copyright. Lo resuelve quien dibuja, no el texto. */
  anio: number;
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

function BotonComprar({ children, esPrevia, estilo }: {
  children: string; esPrevia?: boolean; estilo: Estilo;
}) {
  /* El color sale de la paleta y la forma del estilo. Ninguno de los dos está
     escrito acá: si lo estuvieran, elegir otra paleta no cambiaría el botón —
     que es justo lo único que hay que mirar en esta página. */
  const clases =
    "inline-flex w-full max-w-md items-center justify-center px-6 py-4 " +
    "text-base font-semibold transition hover:brightness-110 sm:text-lg " +
    "bg-[color:var(--pv-acento)] text-[color:var(--pv-sobre)] " +
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
    "focus-visible:outline-[color:var(--pv-acento)] " + estilo.boton;

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

function Titulo({ children, estilo }: { children: string; estilo: Estilo }) {
  if (!children) return null;
  return (
    <h2 className={`text-balance text-center text-2xl text-[color:var(--pv-tinta)] sm:text-3xl ${estilo.titulo}`}>
      {children}
    </h2>
  );
}

/* ── Los números de la oferta ───────────────────────────────────────────────
 *
 * El precio, el tachado, el ahorro y los bonos incluidos. Se dibujan en el
 * resumen de precio y otra vez en el cierre, y **es la misma pieza**: repetir la
 * oferta está bien —la página es larga y la persona se distrae—, pero tiene que
 * decir lo mismo en los dos lados.
 *
 * ⚠️ Todo sale del PRODUCTO. En la página de la competencia el cierre tiene sus
 * propias casillas de precio, así que el número vive en tres lugares; el día que
 * corrigen uno, la misma página muestra dos precios distintos. Acá no se puede. */
function Numeros({ producto, bonos, estilo }: {
  producto: ProductoParaPagina; bonos: ProductoParaPagina[]; estilo: Estilo;
}) {
  const ahorro =
    producto.comparePrice && producto.comparePrice > producto.price
      ? producto.comparePrice - producto.price
      : 0;

  return (
    <div>
      <p className={`text-4xl text-[color:var(--pv-tinta)] sm:text-5xl ${estilo.titulo}`}>{money(producto.price)}</p>
      {ahorro > 0 && producto.comparePrice ? (
        <p className="mt-2 text-slate-500">
          <span className="line-through">{money(producto.comparePrice)}</span>{" "}
          <span className="font-semibold text-emerald-700">ahorrás {money(ahorro)}</span>
        </p>
      ) : null}

      {bonos.length > 0 && (
        <div className={`mt-5 bg-amber-50/70 px-4 py-3 text-left ${estilo.tarjeta}`}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">
            Incluye {bonos.length} {bonos.length === 1 ? "bono gratis" : "bonos gratis"}
          </p>
          <ul className="mt-2 grid gap-1">
            {bonos.map((b) => (
              <li key={b.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 text-slate-700">{b.name}</span>
                <span className="shrink-0 font-bold text-emerald-700">GRATIS</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* Los sellos de al lado del botón. Dicen sólo lo que podemos sostener: el cobro
   va por Mercado Pago y la entrega es por mail.
   🔲 "Al instante" NO está acá a propósito: con transferencia la entrega no es
   automática, y ese aviso va en el checkout, que todavía no existe. */
function Sellos() {
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs font-medium text-slate-500">
      <span>🔒 Pago seguro con Mercado Pago</span>
      <span>✉️ Lo recibís por mail</span>
    </p>
  );
}

function Seccion({ children, tono, estilo }: {
  children: React.ReactNode; tono?: "gris"; estilo: Estilo;
}) {
  /* El aire lo pone el estilo. Es lo que más separa a los tres de lejos: Suave
     respira el doble que Clásico, y eso se nota scrolleando aunque el color sea
     el mismo. */
  return (
    <section className={tono === "gris" ? "bg-[color:var(--pv-suave)]" : ""}>
      <div className={`mx-auto max-w-3xl px-5 sm:px-8 ${estilo.seccion}`}>{children}</div>
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
  const { producto, bonos, vendedor, anio, esPrevia } = datos;
  const estilo = buscarEstilo(datos.pagina.estilo);

  switch (clave) {
    case "portada": {
      const titulo = texto(campos, "titulo");
      const imagen = texto(campos, "imagen") || producto.imagen;
      return (
        <Seccion estilo={estilo}>
          <div className="flex flex-col items-center gap-6 text-center">
            <h1 className={`text-balance text-3xl leading-tight text-[color:var(--pv-tinta)] sm:text-4xl md:text-5xl ${estilo.titulo}`}>
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
            <BotonComprar esPrevia={esPrevia} estilo={estilo}>{texto(campos, "textoBoton")}</BotonComprar>
          </div>
        </Seccion>
      );
    }

    case "producto":
      return (
        <Seccion tono="gris" estilo={estilo}>
          <Titulo estilo={estilo}>{texto(campos, "titulo")}</Titulo>
          <div className={`mt-8 flex flex-col gap-5 bg-white p-5 sm:flex-row sm:items-start sm:gap-6 sm:p-6 ${estilo.tarjeta}`}>
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
        <Seccion estilo={estilo}>
          <Titulo estilo={estilo}>{texto(campos, "titulo")}</Titulo>
          {texto(campos, "subtitulo") && (
            <p className="mt-3 text-center text-slate-600">{texto(campos, "subtitulo")}</p>
          )}
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {bonos.map((b) => (
              <li key={b.id} className={`bg-amber-50/60 p-5 ${estilo.tarjeta}`}>
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
        <Seccion tono={esDolor ? "gris" : undefined} estilo={estilo}>
          <Titulo estilo={estilo}>{texto(campos, "titulo")}</Titulo>
          <ul className="mx-auto mt-8 grid max-w-2xl gap-3">
            {items.map((i, n) => (
              <li
                key={n}
                className={`flex items-start gap-3 bg-white p-4 ${estilo.tarjeta}`}
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
        <Seccion estilo={estilo}>
          <Titulo estilo={estilo}>{texto(campos, "titulo")}</Titulo>
          <ol className="mx-auto mt-8 grid max-w-2xl gap-4">
            {pasos.map((p, n) => (
              <li key={n} className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color:var(--pv-acento)] font-bold text-[color:var(--pv-sobre)]"
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
        <Seccion tono="gris" estilo={estilo}>
          <Titulo estilo={estilo}>{texto(campos, "titulo")}</Titulo>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {items.map((i, n) => (
              <figure key={n} className={`bg-white p-5 ${estilo.tarjeta}`}>
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

    case "precio":
      return (
        <Seccion estilo={estilo}>
          <div className={`mx-auto flex max-w-xl flex-col items-center gap-5 bg-[color:var(--pv-suave)] px-5 py-10 text-center sm:px-8 ${estilo.tarjeta}`}>
            <Titulo estilo={estilo}>{texto(campos, "titulo")}</Titulo>
            {/* El precio no se puede ocultar: `lib/pagina-venta` no le da botón
                de apagar, y mandar visible:false tampoco lo apaga. */}
            <Numeros producto={producto} bonos={bonos} estilo={estilo} />
            <BotonComprar esPrevia={esPrevia} estilo={estilo}>{texto(campos, "textoBoton")}</BotonComprar>
            {texto(campos, "aclaracion") && (
              <p className="text-sm text-slate-500">{texto(campos, "aclaracion")}</p>
            )}
          </div>
        </Seccion>
      );

    case "garantia": {
      /* `{dias}` sale del campo de al lado. El número vive en un solo lugar para
         que no quede un título que dice 7 con una garantía de 30. */
      return (
        <Seccion tono="gris" estilo={estilo}>
          <div className={`mx-auto max-w-2xl bg-white p-6 text-center ${estilo.tarjeta}`}>
            <Titulo estilo={estilo}>{conFichas(texto(campos, "titulo"), campos)}</Titulo>
            <p className="mt-3 text-pretty leading-relaxed text-slate-600">
              {conFichas(texto(campos, "texto"), campos)}
            </p>
          </div>
        </Seccion>
      );
    }

    case "preguntas": {
      const items = lista(campos, "items").filter((i) => i.pregunta);
      return (
        <Seccion estilo={estilo}>
          <Titulo estilo={estilo}>{texto(campos, "titulo")}</Titulo>
          {/* `details` nativo: abre y cierra sin una línea de JavaScript, y
              funciona igual si el script no cargó. */}
          <div className="mx-auto mt-8 grid max-w-2xl gap-3">
            {items.map((i, n) => (
              <details
                key={n}
                className={`group bg-white px-5 py-4 ${estilo.tarjeta}`}
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

    case "cierre":
      return (
        <Seccion tono="gris" estilo={estilo}>
          <div className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
            <Titulo estilo={estilo}>{texto(campos, "titulo")}</Titulo>
            <Numeros producto={producto} bonos={bonos} estilo={estilo} />
            <BotonComprar esPrevia={esPrevia} estilo={estilo}>{texto(campos, "textoBoton")}</BotonComprar>
            <Sellos />
          </div>
        </Seccion>
      );

    /* Fija abajo. Sale del flujo, así que no importa dónde esté en la lista. */
    case "barra":
      return (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <p className="min-w-0">
              <span className="block text-lg font-extrabold leading-none text-slate-900">
                {money(producto.price)}
              </span>
              {producto.comparePrice && producto.comparePrice > producto.price ? (
                <span className="text-xs text-slate-400 line-through">
                  {money(producto.comparePrice)}
                </span>
              ) : null}
            </p>
            <span className="w-auto max-w-[60%] shrink-0 [&>button]:w-auto [&>button]:px-5 [&>button]:py-3 [&>button]:text-sm">
              <BotonComprar esPrevia={esPrevia} estilo={estilo}>{texto(campos, "textoBoton")}</BotonComprar>
            </span>
          </div>
        </div>
      );

    case "pie":
      return (
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-3xl px-5 py-10 text-center text-sm text-slate-500 sm:px-8">
            {texto(campos, "texto") && (
              <p className="mb-4 text-pretty">{texto(campos, "texto")}</p>
            )}
            {vendedor.nombre && <p className="font-medium text-slate-700">{vendedor.nombre}</p>}
            {vendedor.contacto && <p className="mt-1">{vendedor.contacto}</p>}
            {texto(campos, "copyright") && (
              <p className="mt-4 text-xs">
                {conFichas(texto(campos, "copyright"), campos, { anio })}
              </p>
            )}
            {/* ⚠️ Los tres van FIJOS y no son campos: son obligaciones, no
                decoración. El de arrepentimiento lo pide la Resolución 424/2020
                y ya existe en el proyecto; en el pie de la competencia no está. */}
            <p className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
              <a href="/terminos" className="underline hover:text-slate-700">Términos</a>
              <a href="/privacidad" className="underline hover:text-slate-700">Privacidad</a>
              <a href="/arrepentimiento" className="underline hover:text-slate-700">
                Botón de arrepentimiento
              </a>
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
  /* La barra está fija arriba de todo, así que tapa el final de la página. Sin
     este colchón, el último renglón del pie queda abajo del botón y no se lee. */
  const conBarra = datos.pagina.secciones.some((s) => s.clave === "barra" && seDibuja(s, ctx));

  /* ⚠️ La paleta entra como variables de CSS y no como clases de Tailwind.
     Tailwind necesita ver la clase ENTERA escrita en el código para generarla;
     una armada pegando pedazos —`bg-${color}-600`— no existe y la página sale
     sin color. Con variables, el mismo `bg-[color:var(--pv-acento)]` sirve para
     las seis paletas. */
  const paleta = buscarPaleta(datos.pagina.paleta);
  const colores = {
    "--pv-tinta": paleta.tinta,
    "--pv-acento": paleta.acento,
    "--pv-sobre": paleta.sobreAcento,
    "--pv-fondo": paleta.fondo,
    "--pv-suave": paleta.suave,
  } as React.CSSProperties;

  return (
    <div
      style={colores}
      className={`min-h-screen bg-[color:var(--pv-fondo)] text-[color:var(--pv-tinta)] antialiased ${conBarra ? "pb-24" : ""}`}
    >
      {datos.pagina.secciones.map((s) =>
        seDibuja(s, ctx) ? (
          <Contenido key={s.clave} clave={s.clave} campos={s.campos} datos={datos} />
        ) : null
      )}
    </div>
  );
}
