"use client";

import { useRef, useState } from "react";
import {
  Sparkles, FileUp, Pencil, CreditCard, Rocket, ArrowRight, Check, LogOut, Loader2,
} from "lucide-react";
import type { Paso, ClavePaso } from "@/lib/primeros-pasos";
import { cuantosHechos, elQueSigue } from "@/lib/primeros-pasos";
import type { EstadoDelCupo } from "@/lib/cupo-ia";
import { subirPdfDigital } from "@/lib/subir-pdf-digital";
import { MAX_PDF_MB, TIPO_PDF } from "@/lib/subida-digital";
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
 * vacía— y sí tiene una cosa que hacer. El panel aparece cuando los cinco pasos
 * están hechos, y aparece con todo ya creado.
 *
 * Quién decide que se muestre esto es el layout, una sola vez para las nueve
 * pantallas. Ver `lib/recibimiento`.
 *
 * ── Por qué no hay "Atrás" ─────────────────────────────────────────────────
 *
 * Porque no es un formulario partido en cinco: **cada paso es un cambio real**
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

/** El nombre corto, para la barra de arriba. El largo va en la tarjeta. */
const CORTO: Record<ClavePaso, string> = {
  producto: "Producto",
  archivo: "Archivo",
  pagina: "Página",
  cobro: "Cobro",
  publicar: "Listo",
};

export default function Recibimiento({
  pasos,
  productoId,
  cupoIA,
}: {
  pasos: Paso[];
  /** El producto principal, cuando ya existe. Los pasos 2 a 5 lo necesitan. */
  productoId: string | null;
  cupoIA: EstadoDelCupo;
}) {
  const { signOut } = useAuth();
  const [embudo, setEmbudo] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [trabajando, setTrabajando] = useState<null | "archivo" | "pagina" | "publicar">(null);
  const [error, setError] = useState("");
  /* El mismo cerrojo que el resto del panel: un `ref` y no estado, porque el
     segundo clic llega antes de que React vuelva a dibujar. */
  const enVuelo = useRef(false);
  const inputArchivo = useRef<HTMLInputElement>(null);

  const sigue = elQueSigue(pasos);
  const hechos = cuantosHechos(pasos);

  /* Si no queda ninguno, el layout ya habría mostrado el panel. Esto es la red
     por si alguna vez se dibuja igual: mejor no dibujar nada que romper. */
  if (!sigue) return null;

  const Icono = ICONO[sigue.clave];

  async function salir() {
    setSaliendo(true);
    /* A `/login` y no a `/digitales`: sin panel al que volver, quedarse en la
       misma dirección después de salir dibuja la pantalla de ingreso adentro de
       lo que la persona acaba de cerrar. */
    await signOut("/login");
  }

  async function conCerrojo(que: "archivo" | "pagina" | "publicar", hacer: () => Promise<string | null>) {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setTrabajando(que);
    setError("");
    const problema = await hacer();
    if (problema) {
      setError(problema);
      enVuelo.current = false;
      setTrabajando(null);
      return;
    }
    /* No se suelta el cerrojo: la página se está recargando y devolverle el
       botón durante ese rato es ofrecerle hacerlo dos veces. */
    window.location.reload();
  }

  async function subir(file: File) {
    await conCerrojo("archivo", async () => {
      if (!productoId) return "Primero hay que crear el producto.";
      const r = await subirPdfDigital(productoId, file);
      return r.ok ? null : r.error;
    });
  }

  async function escribirPagina() {
    await conCerrojo("pagina", async () => {
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

  async function publicar() {
    await conCerrojo("publicar", async () => {
      if (!productoId) return "Primero hay que crear el producto.";
      try {
        const r = await fetch(`/api/digitales/productos/${productoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicado: true }),
        });
        const d = await r.json().catch(() => ({}));
        return r.ok ? null : (d.error ?? "No pudimos publicarlo.");
      } catch {
        return "No pudimos conectarnos. Revisá tu conexión.";
      }
    });
  }

  const ocupado = trabajando !== null;

  return (
    <div className="min-h-screen bg-gray-50 panel-oscuro:bg-gray-950 text-gray-900 panel-oscuro:text-gray-100 flex flex-col">

      {/* ── La barra de progreso ─────────────────────────────────────────────
          ⚠️ En el teléfono se ven SÓLO los números y las rayas. Los cinco
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
                      {CORTO[p.clave]}
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
                    {CORTO[p.clave]}
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
              Paso {hechos + 1} de {pasos.length}
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

              {sigue.clave === "archivo" && (
                <>
                  {/* Un input escondido y un botón de verdad: el input de archivo
                      del navegador no se puede estilar y cada uno dibuja el suyo.
                      El `accept` es comodidad, no seguridad — lo que vale es
                      `validarSubida`, que corre acá y otra vez en el servidor. */}
                  <input
                    ref={inputArchivo}
                    type="file"
                    accept={TIPO_PDF}
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      /* Se limpia para que elegir el MISMO archivo dos veces
                         seguidas vuelva a disparar el evento. */
                      e.target.value = "";
                      if (file) void subir(file);
                    }}
                  />
                  <Boton onClick={() => inputArchivo.current?.click()} disabled={ocupado} cargando={trabajando === "archivo"}>
                    <FileUp className="h-4 w-4" /> {trabajando === "archivo" ? "Subiendo…" : sigue.accion}
                  </Boton>
                  <p className="mt-3 text-[12px] text-gray-400 panel-oscuro:text-gray-500">
                    Un PDF de hasta {MAX_PDF_MB} MB.
                  </p>
                </>
              )}

              {sigue.clave === "pagina" && (
                <>
                  <Boton onClick={escribirPagina} disabled={ocupado} cargando={trabajando === "pagina"}>
                    <Sparkles className="h-4 w-4" />
                    {trabajando === "pagina" ? "Escribiéndola…" : "Escribirla con IA"}
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
                  <a
                    href="/api/mp/oauth/connect"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-orange-500"
                  >
                    <CreditCard className="h-4 w-4" /> {sigue.accion}
                  </a>
                  <p className="mt-3 text-[12px] leading-relaxed text-gray-400 panel-oscuro:text-gray-500">
                    Te lleva a Mercado Pago y volvés acá. La plata de cada venta entra derecho a tu cuenta.
                  </p>
                </>
              )}

              {sigue.clave === "publicar" && (
                <Boton onClick={publicar} disabled={ocupado} cargando={trabajando === "publicar"}>
                  <Rocket className="h-4 w-4" />
                  {trabajando === "publicar" ? "Publicando…" : sigue.accion}
                </Boton>
              )}
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

/** El botón grande del paso. Uno solo por pantalla: no hay nada más que hacer. */
function Boton({ children, onClick, disabled, cargando }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  cargando?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
      {!cargando && <ArrowRight className="h-4 w-4" />}
    </button>
  );
}
