"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Check, PartyPopper, Eye, LayoutDashboard } from "lucide-react";
import { NOMBRE_CORTO, type Paso } from "@/lib/primeros-pasos";

/**
 * "TODO LISTO": el cierre del recibimiento, una sola vez.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * NO ES UN PASO: ES EL FINAL, Y NO GOBIERNA NADA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Los pasos de la puerta ya están hechos cuando esto se dibuja —el panel
 * está atrás, entero y funcionando—. Esto es la felicitación y el desvío hacia
 * lo único que queda por decidir: mirar cómo quedó la página y publicarla.
 *
 * ── Por qué la marca va en el NAVEGADOR y no en la base ────────────────────
 *
 * Porque esto no decide nada. La compuerta sigue saliendo del estado real de la
 * cuenta (ver `lib/recibimiento`) y no mira esta marca ni podría: es una
 * felicitación, y lo peor que puede pasar si se pierde —alguien limpia los datos
 * del navegador— es verla una vez más y cerrarla. Una bandera en la base, en
 * cambio, es estado que se desincroniza y que hay que migrar, y este proyecto no
 * tiene ninguna en el recibimiento a propósito.
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
 * panel —incluidas las que ya vendieron— se comería un "🎉 Todo listo" en la
 * cara, porque ninguna tiene la marca puesta todavía.
 */

/** La marca. Con el prefijo del panel, como el resto de lo que guarda digitales. */
const MARCA = "digitales_todo_listo_visto";

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

export default function TodoListo({ productoId, pasos, pendientes }: {
  productoId: string | null;
  /**
   * Los pasos de la puerta, todos hechos. Se reciben en vez de dibujar círculos
   * escritos a mano: son los MISMOS que acaba de mostrar el recibimiento, y el
   * día que entre o salga uno de la puerta esta barra tiene que cambiar con él o
   * queda contando otra cosa que la de la pantalla anterior.
   */
  pasos: Paso[];
  /** Lo que queda por hacer adentro: el archivo, publicar, o los dos. */
  pendientes: Paso[];
}) {
  /* ⚠️ `useSyncExternalStore` y no un efecto que prende el estado: `localStorage`
     no existe en el servidor, y el tercer argumento es justamente lo que se
     dibuja allá — `true`, o sea nada—. Con eso React hidrata con lo mismo que
     mandó el servidor y recién después mira el navegador, así que quien ya la
     cerró no ve un parpadeo de pantalla completa en cada carga. */
  const yaLaVio = useSyncExternalStore(sinCambios, yaLaVioEnEsteNavegador, () => true);

  /* Cerrarla en el momento. La marca sola no alcanza: `useSyncExternalStore` no
     se entera de que la escribimos, porque no hay nada que avise. */
  const [cerrada, setCerrada] = useState(false);

  function cerrar() {
    try {
      window.localStorage.setItem(MARCA, "1");
    } catch {
      /* Que no se pueda recordar no puede impedir cerrarla. */
    }
    setCerrada(true);
  }

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

      {/* La barra de arriba: los pasos de la puerta tildados, y un último
          círculo —"Listo"— que es donde estás. Sale de los mismos `pasos` que
          dibujó el recibimiento, así que las dos barras no pueden discrepar. */}
      <header className="shrink-0 border-b border-gray-200 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900">
        <div className="mx-auto flex max-w-4xl items-center justify-center gap-1 px-4 py-3 sm:gap-2 sm:px-6">
          {[...pasos.map((p) => NOMBRE_CORTO[p.clave]), "Listo"].map((nombre, i, todos) => {
            const ultimo = i === todos.length - 1;
            return (
              <div key={nombre} className="flex min-w-0 items-center gap-1 sm:gap-2">
                {i > 0 && <span aria-hidden="true" className="h-px w-3 shrink-0 bg-orange-400 sm:w-6" />}
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                    ultimo
                      ? "bg-orange-100 panel-oscuro:bg-orange-500/20 text-orange-700 panel-oscuro:text-orange-300 ring-2 ring-orange-500"
                      : "bg-orange-600 text-white"
                  }`}
                >
                  {ultimo ? todos.length : <Check className="h-3.5 w-3.5" />}
                  <span className="sr-only">{ultimo ? "estás acá: " : "hecho: "}{nombre}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={`hidden truncate text-[12px] font-bold sm:block ${
                    ultimo ? "text-orange-700 panel-oscuro:text-orange-300" : "text-gray-400 panel-oscuro:text-gray-500"
                  }`}
                >
                  {nombre}
                </span>
              </div>
            );
          })}
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
        <div className="w-full max-w-lg">
          <div className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-6 text-center shadow-sm sm:p-8">
            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-orange-100 panel-oscuro:bg-orange-500/15">
              <PartyPopper className="h-7 w-7 text-orange-600" />
            </div>

            <p className="text-[11px] font-bold uppercase tracking-widest text-orange-600">
              {/* El último, salga como salga la puerta: los pasos hechos más éste. */}
              Paso {pasos.length + 1} de {pasos.length + 1}
            </p>
            <h1 className="mt-1.5 text-balance text-2xl font-black text-gray-950 panel-oscuro:text-gray-50">
              Todo listo
            </h1>
            {/* ⚠️ Dice que TODAVÍA NO LO VE NADIE, y es lo más importante de la
                pantalla: alguien que lee "todo listo" y cierra se queda pensando
                que ya está vendiendo. La cuenta está armada, pero en borrador. */}
            <p className="mx-auto mt-2.5 max-w-sm text-pretty text-[13.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
              Tu producto está armado y el cobro conectado. Todavía no lo ve nadie: mirá cómo
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
                  onClick={cerrar}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-orange-500"
                >
                  <Eye className="h-4 w-4" /> Ver cómo quedó mi página
                </Link>
              )}

              <button
                type="button"
                onClick={cerrar}
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
      </main>
    </div>
  );
}
