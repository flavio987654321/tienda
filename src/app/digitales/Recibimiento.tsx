"use client";

import { useRef, useState } from "react";
import {
  Sparkles, FileUp, Pencil, CreditCard, Rocket, ArrowRight, Check, LogOut, Loader2,
} from "lucide-react";
import type { Paso, ClavePaso } from "@/lib/primeros-pasos";
import { elQueSigue, NOMBRE_CORTO } from "@/lib/primeros-pasos";
import type { EstadoDelCupo } from "@/lib/cupo-ia";
import { useAuth } from "@/components/AuthProvider";
import EmbudoIA from "./productos/EmbudoIA";

/**
 * EL RECIBIMIENTO: la pantalla entera, hasta que la cuenta esté armada.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * NO ES UNA LISTA DE TAREAS: ES LO ÚNICO QUE HAY
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Sin barra lateral, sin Configuración, sin Mi cuenta, sin números. Una cuenta
 * recién creada no tiene nada que mirar en un panel —tres ceros y una lista
 * vacía— y sí tiene una cosa que hacer. El panel aparece cuando están los pasos
 * de la puerta, y aparece con todo ya creado.
 *
 * Quién decide que se muestre esto es el layout, una sola vez para las nueve
 * pantallas. Ver `lib/recibimiento`.
 *
 * ⚠️ Acá NO llega el paso de publicar, y no es un olvido: se hace desde el
 * panel, después de mirar cómo quedó la página. Pedirlo para entrar sería
 * ponerla a la vista antes de haberla visto. Esta pantalla dibuja los pasos que
 * le pasan y no sabe cuáles son; quien los elige es `pasosDeLaPuerta`.
 *
 * ── Por qué no hay "Atrás" ─────────────────────────────────────────────────
 *
 * Porque no es un formulario partido en pasos: **cada paso es un cambio real**
 * —se creó el producto, se subió el archivo, se conectó Mercado Pago— y ya está
 * hecho cuando se ve el tilde. Volver atrás no tendría qué deshacer, y el botón
 * prometería algo que no pasa. Lo que sí se puede es cambiarlo todo después,
 * desde el panel, que es donde vive la edición.
 *
 * Y por lo mismo no hay estado local de "en qué paso voy": el paso sale del
 * ESTADO REAL de la cuenta, igual que los pasos del panel. Un contador propio se
 * desincroniza —cerrás la ventana en el 3 y volvés al 1— y encima podría dejar
 * pasar a alguien al panel con la cuenta a medio armar.
 *
 * ── Lo que se reusa ────────────────────────────────────────────────────────
 *
 * Todo. El armado con IA es `EmbudoIA`, el mismo de la pantalla de Productos; la
 * subida es `subirPdfDigital`; la página la escribe la misma ruta de IA; y el
 * texto de cada paso sale de `lib/primeros-pasos`, así que el recibimiento y el
 * panel nunca pueden decir cosas distintas.
 */

/** El ícono de cada paso. El orden es el de `primerosPasos`. */
const ICONO: Record<ClavePaso, typeof Sparkles> = {
  producto: Sparkles,
  archivo: FileUp,
  pagina: Pencil,
  cobro: CreditCard,
  publicar: Rocket,
};

/* El nombre corto de la barra sale de `NOMBRE_CORTO`, en `lib/primeros-pasos`:
   lo dibuja también la pantalla de "Todo listo", pegada a ésta en el mismo
   recorrido, y escrito dos veces se renombra uno y la barra cambia de palabra a
   mitad de camino. */

export default function Recibimiento({
  pasos,
  productoId,
  cupoIA,
}: {
  /** Sólo los de la puerta. Ver `pasosDeLaPuerta` en `lib/primeros-pasos`. */
  pasos: Paso[];
  /** El producto principal, cuando ya existe. Todos menos el primero lo necesitan. */
  productoId: string | null;
  cupoIA: EstadoDelCupo;
}) {
  const { signOut } = useAuth();
  const [embudo, setEmbudo] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");
  /* El mismo cerrojo que el resto del panel: un `ref` y no estado, porque el
     segundo clic llega antes de que React vuelva a dibujar. */
  const enVuelo = useRef(false);

  const sigue = elQueSigue(pasos);

  /* Si no queda ninguno, el layout ya habría mostrado el panel. Esto es la red
     por si alguna vez se dibuja igual: mejor no dibujar nada que romper. */
  if (!sigue) return null;

  /* ⚠️ El número es la POSICIÓN del paso, no cuántos van hechos. No es lo mismo
     en cuanto los pasos se completan salteados, que es el caso de toda cuenta
     que ya existía cuando apareció el recibimiento: con la página y el cobro
     hechos y el archivo sin subir van tres, y el cartel decía "Paso 4 de 5"
     arriba del título "Subí el archivo", con la barra marcando el 2. Tres
     números distintos para el mismo paso, en la misma pantalla. */
  const numero = pasos.indexOf(sigue) + 1;

  const Icono = ICONO[sigue.clave];

  async function salir() {
    setSaliendo(true);
    /* A `/login` y no a `/digitales`: sin panel al que volver, quedarse en la
       misma dirección después de salir dibuja la pantalla de ingreso adentro de
       lo que la persona acaba de cerrar. */
    await signOut("/login");
  }

  /* Quedó un solo paso con botón que hace algo acá adentro —escribir la página—:
     el archivo y publicar se hacen en el panel, y Mercado Pago es un enlace que
     te saca de la aplicación. Se deja igual porque el cerrojo y el manejo del
     error valen lo mismo con uno que con tres. */
  async function conCerrojo(hacer: () => Promise<string | null>) {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setTrabajando(true);
    setError("");
    const problema = await hacer();
    if (problema) {
      setError(problema);
      enVuelo.current = false;
      setTrabajando(false);
      return;
    }
    /* No se suelta el cerrojo: la página se está recargando y devolverle el
       botón durante ese rato es ofrecerle hacerlo dos veces. */
    window.location.reload();
  }

  async function escribirPagina() {
    await conCerrojo(async () => {
      if (!productoId) return "Primero hay que crear el producto.";
      try {
        const r = await fetch("/api/digitales/ia/pagina", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productoId }),
        });
        const d = await r.json().catch(() => ({}));
        return r.ok && d.ok ? null : (d.error ?? "No pudimos escribirla. Probá de nuevo.");
      } catch {
        return "No pudimos conectarnos. Revisá tu conexión.";
      }
    });
  }

  const ocupado = trabajando;

  return (
    <div className="min-h-screen bg-gray-50 panel-oscuro:bg-gray-950 text-gray-900 panel-oscuro:text-gray-100 flex flex-col">

      {/* ── La barra de progreso ─────────────────────────────────────────────
          ⚠️ En el teléfono se ven SÓLO los números y las rayas. Los cuatro
          nombres a 360 entran en tres letras cada uno o se parten; el número con
          su tilde ya dice lo único que importa acá arriba, que es cuánto falta.
          El nombre del paso donde estás se lee completo en la tarjeta. */}
      <header className="shrink-0 border-b border-gray-200 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <span className="hidden shrink-0 text-[13px] font-black tracking-tight sm:block">
            TiendaApps
          </span>

          <ol className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:gap-2">
            {pasos.map((p, n) => {
              const actual = p.clave === sigue.clave;
              return (
                <li key={p.clave} className="flex min-w-0 items-center gap-1 sm:gap-2">
                  {n > 0 && (
                    <span
                      aria-hidden="true"
                      className={`h-px w-3 shrink-0 sm:w-6 ${p.hecho || actual ? "bg-orange-400" : "bg-gray-200 panel-oscuro:bg-gray-700"}`}
                    />
                  )}
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                      p.hecho
                        ? "bg-orange-600 text-white"
                        : actual
                          ? "bg-orange-100 panel-oscuro:bg-orange-500/20 text-orange-700 panel-oscuro:text-orange-300 ring-2 ring-orange-500"
                          : "bg-gray-100 panel-oscuro:bg-gray-800 text-gray-400 panel-oscuro:text-gray-500"
                    }`}
                    /* El estado se dice, no se deja al color: quien no distingue
                       el naranja del gris tiene que poder saber en cuál está. */
                    aria-current={actual ? "step" : undefined}
                  >
                    {p.hecho ? <Check className="h-3.5 w-3.5" /> : n + 1}
                    <span className="sr-only">
                      {p.hecho ? "hecho: " : actual ? "estás acá: " : "falta: "}
                      {NOMBRE_CORTO[p.clave]}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`hidden truncate text-[12px] font-bold sm:block ${
                      actual
                        ? "text-orange-700 panel-oscuro:text-orange-300"
                        : "text-gray-400 panel-oscuro:text-gray-500"
                    }`}
                  >
                    {NOMBRE_CORTO[p.clave]}
                  </span>
                </li>
              );
            })}
          </ol>

          {/* ⚠️ Cerrar sesión SIEMPRE a la vista. Es lo único que hay que poder
              hacer siempre: sin panel, sin menú y sin barra lateral, sin esto
              alguien que entró por error se queda encerrado en su propia cuenta.

              Va con `signOut` del proveedor y no con un enlace: la sesión vive
              en Supabase del lado del navegador, así que un link a una ruta no
              la cierra — la deja abierta y sólo parece que salió. Es el mismo
              camino que usa la barra lateral. */}
          <button
            type="button"
            onClick={salir}
            disabled={saliendo}
            className="shrink-0 inline-flex items-center gap-1.5 text-[12px] font-bold text-gray-500 panel-oscuro:text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{saliendo ? "Saliendo…" : "Cerrar sesión"}</span>
          </button>
        </div>
      </header>

      {/* ── La tarjeta del paso ──────────────────────────────────────────────── */}
      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
        <div className="w-full max-w-lg">

          <div className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-6 text-center shadow-sm sm:p-8">
            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-orange-100 panel-oscuro:bg-orange-500/15">
              <Icono className="h-7 w-7 text-orange-600" />
            </div>

            <p className="text-[11px] font-bold uppercase tracking-widest text-orange-600">
              Paso {numero} de {pasos.length}
            </p>
            <h1 className="mt-1.5 text-balance text-2xl font-black text-gray-950 panel-oscuro:text-gray-50">
              {sigue.titulo}
            </h1>
            {/* La consecuencia, no la tarea: la tarea ya está en el título. Sale
                de `primeros-pasos`, la misma que lee el panel. */}
            <p className="mx-auto mt-2.5 max-w-sm text-pretty text-[13.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
              {sigue.porque}
            </p>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-red-50 panel-oscuro:bg-red-500/10 px-4 py-3 text-[13px] font-medium text-red-700 panel-oscuro:text-red-300"
              >
                {error}
              </p>
            )}

            <div className="mt-6">
              {sigue.clave === "producto" && (
                <Boton onClick={() => setEmbudo(true)} disabled={ocupado}>
                  <Sparkles className="h-4 w-4" /> {sigue.accion}
                </Boton>
              )}

              {/* Tampoco hay rama para "archivo". Salió de la puerta el
                  07/09/26: tiene DOS caminos —subir un PDF propio, o que la IA
                  escriba el ebook desde Starter— y acá entraba uno solo, así que
                  a quien pagó para que se lo escribamos le pedía justo lo que no
                  tiene. Los dos botones viven juntos en Productos. Ver
                  `PASOS_DE_ADENTRO` en `lib/primeros-pasos`. */}

              {sigue.clave === "pagina" && (
                <>
                  <Boton onClick={escribirPagina} disabled={ocupado} cargando={trabajando}>
                    <Sparkles className="h-4 w-4" />
                    {trabajando ? "Escribiéndola…" : "Escribirla con IA"}
                  </Boton>
                  <p className="mt-3 text-[12px] leading-relaxed text-gray-400 panel-oscuro:text-gray-500">
                    Después la editás entera: los textos, los colores y qué secciones se ven.
                  </p>
                </>
              )}

              {/* ⚠️ Mercado Pago es un enlace de verdad y no un `fetch`: te saca
                  de la aplicación, iniciás sesión allá y volvés. Al volver, este
                  paso ya está hecho y la pantalla muestra el siguiente sola,
                  porque el paso sale del estado real y no de un contador. */}
              {sigue.clave === "cobro" && (
                <>
                  <Boton href="/api/mp/oauth/connect" disabled={ocupado}>
                    <CreditCard className="h-4 w-4" /> {sigue.accion}
                  </Boton>
                  <p className="mt-3 text-[12px] leading-relaxed text-gray-400 panel-oscuro:text-gray-500">
                    Te lleva a Mercado Pago y volvés acá. La plata de cada venta entra derecho a tu cuenta.
                  </p>
                </>
              )}

              {/* No hay rama para "publicar": ese paso no llega acá. Se hace
                  desde el panel, después de mirar cómo quedó la página. Ver
                  `pasosDeLaPuerta` en `lib/primeros-pasos`. */}
            </div>
          </div>

          <p className="mt-5 text-center text-[12px] leading-relaxed text-gray-400 panel-oscuro:text-gray-500">
            {/* Que se pueda ir y volver hay que DECIRLO. Sin panel ni menú, una
                pantalla que sólo ofrece seguir se lee como un trámite que hay que
                terminar de una sentada, y quien no puede lo abandona. */}
            Podés cerrar esto y volver cuando quieras: lo que ya hiciste queda guardado.
          </p>
        </div>
      </main>

      {/* El mismo asistente de la pantalla de Productos. Al crear el embudo
          recarga, el layout vuelve a mirar el estado real y muestra el paso 2. */}
      {embudo && <EmbudoIA cupoInicial={cupoIA} onCerrar={() => setEmbudo(false)} />}
    </div>
  );
}

/**
 * El botón grande del paso. Uno solo por pantalla: no hay nada más que hacer.
 *
 * Con `href` se dibuja como enlace de verdad —lo necesita Mercado Pago, que te
 * saca de la aplicación— y no como un botón que navega. Va acá adentro y no
 * copiado al lado: escrito aparte, ese paso era el único de los cinco sin la
 * flecha, porque la flecha vive en este componente.
 */
function Boton({ children, onClick, href, disabled, cargando }: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  cargando?: boolean;
}) {
  const clases =
    "inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60";

  const adentro = (
    <>
      {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
      {!cargando && <ArrowRight className="h-4 w-4" />}
    </>
  );

  /* Un `<a>` no se apaga con `disabled`: hay que sacarle el `href`, o sigue
     navegando igual mientras otra cosa está en vuelo. */
  if (href) {
    return (
      <a
        href={disabled ? undefined : href}
        aria-disabled={disabled || undefined}
        className={`${clases} ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        {adentro}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={clases}>
      {adentro}
    </button>
  );
}
