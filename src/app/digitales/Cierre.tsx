"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { PartyPopper, Eye, LayoutDashboard, Palette, ArrowRight, Loader2 } from "lucide-react";
import { NOMBRE_CORTO, type Paso } from "@/lib/primeros-pasos";
import {
  ESTILOS, PALETAS, buscarEstilo, buscarPaleta,
  normalizarContenido, variablesDePagina,
} from "@/lib/pagina-venta";
import BarraDePasos, { NOMBRE_ESTILO, NOMBRE_LISTO, type CirculoDePaso } from "./BarraDePasos";
import Consejo from "./Consejo";

/**
 * EL CIERRE DEL RECIBIMIENTO: elegir el aspecto, y la felicitación.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * NO SON PASOS DE LA PUERTA, Y NO GOBIERNAN NADA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Cuando esto se dibuja el panel ya está atrás, entero y funcionando: los pasos
 * de la puerta están hechos. Esto es el final del recorrido — elegir cómo se ve
 * la página, y enterarse de que está todo armado pero todavía en borrador.
 *
 * ── Por qué el estilo se elige ACÁ y no como paso de la puerta — 10/09/26 ──
 *
 * Porque la puerta se calcula del ESTADO REAL de la cuenta, sin banderas
 * guardadas, y "¿ya eligió un estilo?" no se le puede preguntar a la base: toda
 * página tiene estilo y paleta desde que nace —`normalizarContenido` completa
 * los de fábrica— así que no existe el estado "sin elegir". Hacerlo paso de la
 * puerta obligaba a inventar una bandera, que es justo lo que el recibimiento
 * no tiene a propósito (ver `lib/primeros-pasos`).
 *
 * Como pantalla de cierre no hace falta ninguna: no decide si se entra al
 * panel, así que lo peor que pasa si la marca se pierde es verla una vez más.
 *
 * ── El problema que esto vino a resolver ───────────────────────────────────
 *
 * El asistente hace DOS pasos de una: crea el producto y escribe la página
 * (ver `EmbudoIA`). Así que la barra de arriba prometía dos pasos, la persona
 * apretaba un botón, y caía en el panel sin que nada le dijera que había
 * terminado. Reportado probándolo: *"cuando puse generar se saltó el último
 * paso y me llevó directo al panel, ni siquiera me dijo listo, ya está creado"*.
 *
 * No era un salto: era que los dos pasos se tildaban juntos y no había nada
 * después. Ahora los cuatro círculos están desde el principio —Producto,
 * Página, Estilo, Listo— así que se VE que el asistente tacha dos de una, y el
 * recorrido termina en algo en vez de cortarse.
 *
 * ── Por qué la marca va en el NAVEGADOR y no en la base ────────────────────
 *
 * Porque esto no decide nada. Lo peor que puede pasar si se pierde —alguien
 * limpia los datos del navegador— es verla una vez más y cerrarla. Una bandera
 * en la base, en cambio, es estado que se desincroniza y que hay que migrar.
 *
 * ⚠️ Y por eso tampoco se lee del lado del servidor: `localStorage` no existe
 * ahí. Se dibuja `null` hasta que el navegador confirma que no la vio, así que
 * quien ya la cerró NO ve un parpadeo de la pantalla al entrar.
 *
 * ── Quién no la ve nunca ───────────────────────────────────────────────────
 *
 * Quien ya publicó. El layout sólo dibuja esto mientras la publicación siga
 * pendiente, que es exactamente el ratito entre terminar la puerta y publicar.
 * Sin esa condición, el día que esto salga, TODA cuenta que ya viene usando el
 * panel —incluidas las que ya vendieron— se comería la felicitación en la cara,
 * porque ninguna tiene la marca puesta todavía.
 */

/**
 * La marca, con el prefijo del panel.
 *
 * ⚠️ Cambió de nombre el 10/09/26 —era `digitales_todo_listo_visto`— y a
 * propósito: la pantalla ya no es la misma, ahora se elige el aspecto antes de
 * la felicitación. Con la clave vieja, todo el que ya había cerrado el "Todo
 * listo" nunca vería la pantalla nueva. La cuenta que ya publicó sigue sin ver
 * nada, que es de lo que se ocupa el layout.
 */
const MARCA = "digitales_cierre_visto";

/* No hay nada a qué suscribirse: la marca la escribe esta misma pantalla y
   nadie más la toca. `useSyncExternalStore` igual lo pide. */
const sinCambios = () => () => {};

/** En el navegador. `true` = ya la vio y no se dibuja. */
function yaLaVioEnEsteNavegador(): boolean {
  try {
    return window.localStorage.getItem(MARCA) === "1";
  } catch {
    /* Modo privado, o el almacenamiento bloqueado. Si no se puede leer tampoco
       se va a poder escribir, y una pantalla completa de la que no hay forma de
       acordarse volvería en CADA carga: es preferible no felicitar a nadie. */
    return true;
  }
}

export default function Cierre({
  productoId, productoNombre, pasos, pendientes, aspecto,
}: {
  productoId: string | null;
  /** Para que la muestra diga lo que la persona acaba de crear, y no "Tu producto". */
  productoNombre: string | null;
  /**
   * Los pasos de la puerta, todos hechos. Se reciben en vez de dibujar círculos
   * escritos a mano: son los MISMOS que acaba de mostrar el recibimiento, y el
   * día que entre o salga uno de la puerta esta barra cambia con él.
   */
  pasos: Paso[];
  /** Lo que queda por hacer adentro: el archivo, publicar, o los dos. */
  pendientes: Paso[];
  /** Cómo se ve hoy la página, para arrancar con eso marcado. */
  aspecto: { estilo: string; paleta: string; tipografia: string };
}) {
  const yaLaVio = useSyncExternalStore(sinCambios, yaLaVioEnEsteNavegador, () => true);

  /* Cerrarla en el momento. La marca sola no alcanza: `useSyncExternalStore` no
     se entera de que la escribimos, porque no hay nada que avise. */
  const [cerrada, setCerrada] = useState(false);
  const [pantalla, setPantalla] = useState<"estilo" | "listo">("estilo");

  const [estilo, setEstilo] = useState(aspecto.estilo);
  const [paleta, setPaleta] = useState(aspecto.paleta);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  /* El mismo cerrojo que el resto del panel: un `ref` y no estado, porque el
     segundo clic llega antes de que React vuelva a dibujar. */
  const enVuelo = useRef(false);

  function cerrar() {
    try {
      window.localStorage.setItem(MARCA, "1");
    } catch {
      /* Que no se pueda recordar no puede impedir cerrarla. */
    }
    setCerrada(true);
  }

  /**
   * Guarda el aspecto y pasa a la felicitación.
   *
   * ⚠️ Si el guardado falla, NO se avanza: la pantalla siguiente dice "tu
   * página está lista" y mandar ahí a alguien cuyo color no se guardó es
   * prometerle algo que no pasó. Se muestra el error y se puede reintentar.
   *
   * Se manda sólo lo que cambió, con `PATCH`. Un `PUT` con estas dos claves
   * borraría la página entera: esa ruta reemplaza, y sin secciones adentro
   * `normalizarContenido` arma una nueva con los textos de fábrica —o sea que
   * elegir un color tiraría lo que escribió la IA—. Ver el comentario del
   * `PATCH` en `productos/[id]/pagina`.
   */
  async function guardarYSeguir() {
    if (enVuelo.current) return;
    /* Sin producto no hay nada que pintar. No debería pasar —la puerta exige el
       producto— pero si pasara, la felicitación sigue teniendo sentido. */
    if (!productoId) return setPantalla("listo");

    enVuelo.current = true;
    setGuardando(true);
    setError("");
    try {
      const r = await fetch(`/api/digitales/productos/${productoId}/pagina`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estilo, paleta }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error ?? "No pudimos guardarlo. Probá de nuevo.");
        return;
      }
      setPantalla("listo");
    } catch {
      setError("No pudimos conectarnos. Revisá tu conexión.");
    } finally {
      enVuelo.current = false;
      setGuardando(false);
    }
  }

  /* Los círculos de arriba. Los pasos de la puerta ya están todos hechos —si no,
     esto no se dibujaría—, así que lo único que se mueve son los dos del cierre. */
  const circulos: CirculoDePaso[] = [
    ...pasos.map((p) => ({ nombre: NOMBRE_CORTO[p.clave], estado: "hecho" as const })),
    { nombre: NOMBRE_ESTILO, estado: pantalla === "estilo" ? "actual" : "hecho" },
    { nombre: NOMBRE_LISTO, estado: pantalla === "estilo" ? "falta" : "actual" },
  ];

  if (yaLaVio || cerrada) return null;

  return (
    /* ⚠️ `z-[95]` y no `z-50`. Esto TAPA el panel entero, y el panel tiene su
       propia escala: la barra lateral y la barra de arriba del celular están en
       `z-[60]`, el menú desplegado en `z-[70]` y las ventanas en 80/85/90.
       Con `z-50` —que era lo primero que escribí— la barra lateral quedaba
       ENCIMA de esta pantalla: en el teléfono la barra de arriba tapaba los
       pasos, y en los dos tamaños se podía abrir el menú de un panel que se
       supone que todavía no estás usando. */
    <div className="fixed inset-0 z-[95] flex flex-col overflow-y-auto bg-gray-50 panel-oscuro:bg-gray-950 text-gray-900 panel-oscuro:text-gray-100">

      <header className="shrink-0 border-b border-gray-200 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900">
        <div className="mx-auto flex max-w-4xl items-center justify-center px-4 py-3 sm:px-6">
          <BarraDePasos circulos={circulos} />
        </div>
      </header>

      {pantalla === "estilo"
        ? (
          <PantallaDeEstilo
            nombre={productoNombre}
            estilo={estilo}
            paleta={paleta}
            tipografia={aspecto.tipografia}
            onEstilo={setEstilo}
            onPaleta={setPaleta}
            onSeguir={guardarYSeguir}
            guardando={guardando}
            error={error}
            totalDePasos={circulos.length}
          />
        )
        : (
          <PantallaDeListo
            productoId={productoId}
            pasos={pasos}
            pendientes={pendientes}
            onCerrar={cerrar}
          />
        )}
    </div>
  );
}

/* ── Pantalla 1: cómo se ve ─────────────────────────────────────────────────
   ⚠️ Se eligen DOS cosas y no las cuatro que tiene el editor. La letra y el
   orden de las secciones quedan adentro, y no por falta de lugar: acá la
   persona todavía no vio su página, así que no tiene con qué decidir un detalle
   —lo que sí puede decidir mirando dos muestras es el aire y el color—. Cuatro
   controles en la pantalla de bienvenida se saltean enteros; dos se contestan.

   Lo demás no se pierde: el editor los tiene todos, y ahí se ve la página de
   verdad al lado. */
function PantallaDeEstilo({
  nombre, estilo, paleta, tipografia, onEstilo, onPaleta, onSeguir, guardando, error, totalDePasos,
}: {
  nombre: string | null;
  estilo: string;
  paleta: string;
  tipografia: string;
  onEstilo: (v: string) => void;
  onPaleta: (v: string) => void;
  onSeguir: () => void;
  guardando: boolean;
  error: string;
  /** Cuántos círculos tiene la barra, para que el contador diga lo mismo. */
  totalDePasos: number;
}) {
  return (
    <main className="flex flex-1 items-start justify-center px-4 py-8 sm:py-10">
      <div className="w-full max-w-4xl">

        <div className="text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-orange-100 panel-oscuro:bg-orange-500/15">
            <Palette className="h-7 w-7 text-orange-600" />
          </div>
          {/* El mismo contador que la tarjeta del recibimiento y el de "Todo
              listo": los pasos de la puerta más los dos del cierre. */}
          <p className="text-[11px] font-bold uppercase tracking-widest text-orange-600">
            Paso {totalDePasos - 1} de {totalDePasos}
          </p>
          <h1 className="mt-1.5 text-balance text-2xl font-black text-gray-950 panel-oscuro:text-gray-50">
            Elegí cómo se ve tu página
          </h1>
          <p className="mx-auto mt-2 max-w-md text-pretty text-[13.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
            {/* Que se pueda cambiar después hay que DECIRLO acá. Sin eso, una
                pantalla de bienvenida que pide elegir el aspecto se lee como una
                decisión que hay que acertar de una, y quien no sabe cuál elegir
                se traba en el último paso. */}
            Lo cambiás cuando quieras desde el editor. Esto es sólo para que arranque
            con tu cara y no con la de fábrica.
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            ⚠️ EN EL TELÉFONO LA MUESTRA VA ARRIBA, Y PEGADA
            ══════════════════════════════════════════════════════════════════

            Son once opciones: cinco estilos y seis colores. Apiladas antes de la
            muestra —que es el orden natural del HTML— la muestra arranca a 900
            píxeles del borde de arriba en un teléfono, o sea que se elige a
            ciegas y recién al final se ve qué se eligió. Visto en 360.

            Así que en pantalla chica va PRIMERA y `sticky`: se queda arriba
            mientras las opciones pasan por debajo, y cada toque se ve en el
            acto. En pantalla grande no hace falta —entra todo junto— y vuelve a
            su lugar, a la derecha.

            El botón es un tercer bloque y no parte de la muestra por lo mismo:
            pegado a ella quedaría trabado arriba en el teléfono, tapando media
            pantalla de opciones. Va al final, que es cuando se aprieta. */}
        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:grid-rows-[auto_auto] lg:items-start">

          {/* ── Lo que se elige ───────────────────────────────────────────── */}
          <div className="order-2 min-w-0 space-y-5 lg:order-none lg:col-start-1 lg:row-start-1 lg:row-span-2">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-gray-400 panel-oscuro:text-gray-500">
                Estilo
              </p>
              <div className="grid gap-1.5">
                {ESTILOS.map((e) => (
                  <button
                    key={e.clave}
                    type="button"
                    onClick={() => onEstilo(e.clave)}
                    aria-pressed={estilo === e.clave}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      estilo === e.clave
                        ? "border-orange-400 bg-orange-50/60 panel-oscuro:border-orange-500/50 panel-oscuro:bg-orange-500/10"
                        : "border-gray-200 bg-white hover:border-gray-300 panel-oscuro:border-gray-700 panel-oscuro:bg-gray-900"
                    }`}
                  >
                    <span className="block text-[13px] font-bold text-gray-900 panel-oscuro:text-gray-100">
                      {e.nombre}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-gray-500 panel-oscuro:text-gray-400">
                      {e.para}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-gray-400 panel-oscuro:text-gray-500">
                Colores
              </p>
              {/* ⚠️ Son combinaciones armadas y no un selector de colores. Con
                  colores libres alguien elige amarillo sobre blanco y el botón de
                  comprar desaparece — y no lo ve, porque en su pantalla se
                  distingue. Hay un chequeo que calcula el contraste de cada una y
                  falla si alguna baja del mínimo. */}
              <p className="mb-2 text-[11.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                Todas se leen bien. Por eso no hay colores sueltos.
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-2">
                {PALETAS.map((p) => (
                  <button
                    key={p.clave}
                    type="button"
                    onClick={() => onPaleta(p.clave)}
                    aria-pressed={paleta === p.clave}
                    className={`flex min-w-0 items-center gap-2 rounded-xl border p-2.5 text-left transition-colors ${
                      paleta === p.clave
                        ? "border-orange-400 bg-orange-50/60 panel-oscuro:border-orange-500/50 panel-oscuro:bg-orange-500/10"
                        : "border-gray-200 bg-white hover:border-gray-300 panel-oscuro:border-gray-700 panel-oscuro:bg-gray-900"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 rounded-full border border-black/10"
                      style={{ background: p.acento }}
                    />
                    <span className="truncate text-[12px] font-bold text-gray-800 panel-oscuro:text-gray-200">
                      {p.nombre}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── La muestra ────────────────────────────────────────────────── */}
          <div className="order-1 min-w-0 sticky top-0 z-10 -mx-4 bg-gray-50 px-4 pb-3 pt-1 panel-oscuro:bg-gray-950 lg:order-none lg:static lg:col-start-2 lg:row-start-1 lg:mx-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-0 panel-oscuro:lg:bg-transparent">
            <Muestra nombre={nombre} estilo={estilo} paleta={paleta} tipografia={tipografia} />
          </div>

          {/* ── Y el botón ────────────────────────────────────────────────── */}
          <div className="order-3 min-w-0 lg:order-none lg:col-start-2 lg:row-start-2">
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-red-50 panel-oscuro:bg-red-500/10 px-4 py-3 text-[13px] font-medium text-red-700 panel-oscuro:text-red-300"
              >
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={onSeguir}
              disabled={guardando}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {guardando ? "Guardando…" : "Guardar y seguir"}
              {!guardando && <ArrowRight className="h-4 w-4" />}
            </button>

            {/* Debajo del botón y no al costado: en esta pantalla el costado ya
                lo ocupan las once opciones, y el hueco de verdad está acá. */}
            <Consejo momento="estilo" className="mt-4" />
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * La muestra: un pedacito de la página de venta, con los colores de verdad.
 *
 * ⚠️ Los colores salen de `variablesDePagina`, la MISMA función que pinta la
 * página pública y el checkout. Escritos a mano acá, esta muestra se quedaría
 * vieja el día que se agregue una paleta o cambie un tono, y estaría mintiendo
 * justo en la pantalla donde se elige mirando.
 *
 * ⚠️ Y las clases del estilo (`tarjeta`, `boton`, `titulo`, `seccion`) también
 * salen de la tabla, por lo mismo. Nocturno da vuelta los colores y acá se ve
 * dado vuelta sin una sola línea de código propia.
 *
 * No es la página entera y no pretende serlo: es el encabezado y una tarjeta,
 * que es donde se nota el aire y donde vive el botón de comprar.
 */
function Muestra({
  nombre, estilo, paleta, tipografia,
}: {
  nombre: string | null;
  estilo: string;
  paleta: string;
  tipografia: string;
}) {
  /* `normalizarContenido` para armar una página válida con estas claves: es la
     misma puerta por la que pasa lo que se guarda, así que la muestra no puede
     pintar una combinación que el servidor no aceptaría. */
  const vars = useMemo(
    () => variablesDePagina(normalizarContenido({ estilo, paleta, tipografia })),
    [estilo, paleta, tipografia],
  );
  const e = buscarEstilo(estilo);
  const p = buscarPaleta(paleta);

  const titulo = nombre?.trim() || "Tu producto";

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 shadow-sm">
      {/* La barra del navegador, para que se lea como una página y no como una
          tarjeta más del panel. */}
      <div className="flex items-center gap-1.5 border-b border-gray-200 panel-oscuro:border-gray-700 bg-gray-100 panel-oscuro:bg-gray-800 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-gray-300 panel-oscuro:bg-gray-600" />
        <span className="h-2 w-2 rounded-full bg-gray-300 panel-oscuro:bg-gray-600" />
        <span className="h-2 w-2 rounded-full bg-gray-300 panel-oscuro:bg-gray-600" />
        <span className="ml-2 truncate text-[10px] font-bold text-gray-400 panel-oscuro:text-gray-500">
          Así se va a ver tu página
        </span>
      </div>

      <div
        style={vars as React.CSSProperties}
        className="bg-[color:var(--pv-fondo)] px-5 py-6 text-[color:var(--pv-tinta)] sm:px-7 sm:py-8"
      >
        <span
          className={`inline-block bg-[color:var(--pv-suave)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[color:var(--pv-acento)] ${e.sello}`}
        >
          Descarga inmediata
        </span>

        <p className={`mt-3 text-pretty text-xl leading-tight sm:text-2xl ${e.titulo}`}>
          {titulo}
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-[color:var(--pv-tenue)]">
          Todo lo que necesitás, explicado paso a paso y listo para usar hoy.
        </p>

        <span
          className={`mt-4 inline-block bg-[color:var(--pv-acento)] px-5 py-2.5 text-[12.5px] font-bold text-[color:var(--pv-sobre)] ${e.boton}`}
        >
          Lo quiero
        </span>

        <div className={`mt-5 bg-[color:var(--pv-tarjeta)] p-3.5 ${e.tarjeta}`}>
          <p className="text-[12px] font-bold">Lo que te llevás</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-[color:var(--pv-tenue)]">
            El material completo, más el bono de regalo.
          </p>
        </div>
      </div>

      {/* El nombre de la combinación, para poder nombrarla en voz alta. */}
      <p className="border-t border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 px-3 py-2 text-[11px] font-bold text-gray-500 panel-oscuro:text-gray-400">
        {e.nombre} · {p.nombre}
      </p>
    </div>
  );
}

/* ── Pantalla 2: todo listo ─────────────────────────────────────────────── */
function PantallaDeListo({
  productoId, pasos, pendientes, onCerrar,
}: {
  productoId: string | null;
  pasos: Paso[];
  pendientes: Paso[];
  onCerrar: () => void;
}) {
  return (
    <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
      {/* ⚠️ El consejo va a la DERECHA en pantalla grande y DEBAJO en el
          teléfono (`order-2`), por lo mismo que la bienvenida del paso 1: puesto
          arriba empuja los dos botones —que son el final del recorrido— abajo
          del pliegue. La tarjeta manda; el consejo acompaña. */}
      <div className="grid w-full max-w-4xl gap-6 lg:grid-cols-[minmax(0,512px)_minmax(0,280px)] lg:items-center lg:justify-center lg:gap-10">
        <div className="order-1 w-full max-w-lg justify-self-center lg:justify-self-end">
        <div className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-orange-100 panel-oscuro:bg-orange-500/15">
            <PartyPopper className="h-7 w-7 text-orange-600" />
          </div>

          <p className="text-[11px] font-bold uppercase tracking-widest text-orange-600">
            {/* El último, salga como salga la puerta: los pasos hechos, el
                estilo y éste. */}
            Paso {pasos.length + 2} de {pasos.length + 2}
          </p>
          <h1 className="mt-1.5 text-balance text-2xl font-black text-gray-950 panel-oscuro:text-gray-50">
            Todo listo
          </h1>
          {/* ⚠️ Dice que TODAVÍA NO LO VE NADIE, y es lo más importante de la
              pantalla: alguien que lee "todo listo" y cierra se queda pensando
              que ya está vendiendo. La cuenta está armada, pero en borrador. */}
          <p className="mx-auto mt-2.5 max-w-sm text-pretty text-[13.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
            {/* ⚠️ Acá decía "y el cobro conectado", y desde el 08/09/26 eso
                puede ser mentira: Mercado Pago salió de la puerta, así que se
                llega hasta acá sin conectarlo. Una pantalla que felicita por
                algo que no pasó es peor que una que no felicita — y encima el
                recuadro de abajo lo está pidiendo. Se nombra lo que la puerta
                de verdad exige: el producto y la página. */}
            Tu producto está armado y tu página lista. Todavía no lo ve nadie: mirá cómo
            quedó y acomodá lo que quieras.
          </p>

          {/* ⚠️ Lo que falta se NOMBRA, no se insinúa. Desde que el archivo
              salió de la puerta se puede llegar hasta acá sin PDF, y "Todo
              listo" a secas le haría creer a esa persona que ya vende — cuando
              lo que tiene es un producto que no se puede entregar. Cada renglón
              trae su porqué, el mismo que lee la lista del panel. */}
          {pendientes.length > 0 && (
            <div className="mt-5 rounded-2xl bg-orange-50 panel-oscuro:bg-orange-500/10 px-4 py-3.5 text-left">
              <p className="text-[12px] font-bold uppercase tracking-wide text-orange-700 panel-oscuro:text-orange-300">
                Para vender te falta
              </p>
              <ul className="mt-2 space-y-2">
                {pendientes.map((p) => (
                  <li key={p.clave} className="text-[13px] leading-snug">
                    <span className="font-bold text-gray-900 panel-oscuro:text-gray-100">{p.titulo}</span>
                    <span className="block text-[12px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                      {p.porque}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-[12px] text-gray-500 panel-oscuro:text-gray-400">
                Te esperan en el panel, arriba de todo.
              </p>
            </div>
          )}

          <div className="mt-6 space-y-2.5">
            {/* El botón de arriba es el que queremos que apriete, y va al
                EDITOR y no a la dirección pública: el producto está en
                borrador, así que esa dirección todavía no muestra nada. */}
            {productoId && (
              <Link
                href={`/digitales/productos/${productoId}/pagina`}
                onClick={onCerrar}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-orange-500"
              >
                <Eye className="h-4 w-4" /> Ver cómo quedó mi página
              </Link>
            )}

            <button
              type="button"
              onClick={onCerrar}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 px-6 py-3.5 text-sm font-bold text-gray-600 panel-oscuro:text-gray-300 transition-colors hover:bg-gray-50 panel-oscuro:hover:bg-gray-800"
            >
              <LayoutDashboard className="h-4 w-4" /> Entrar al panel
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-[12px] leading-relaxed text-gray-400 panel-oscuro:text-gray-500">
          Podés volver cuando quieras: lo que ya hiciste queda guardado.
        </p>
        </div>

        <Consejo momento="listo" className="order-2 w-full max-w-lg justify-self-center lg:max-w-none lg:justify-self-start" />
      </div>
    </main>
  );
}
