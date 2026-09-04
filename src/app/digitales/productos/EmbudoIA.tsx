"use client";

import { useRef, useState } from "react";
import { Loader2, Sparkles, X, AlertTriangle, RotateCcw, Check } from "lucide-react";
import type { EstadoDelCupo } from "@/lib/cupo-ia";
import {
  LARGO_DEL_NICHO, MINIMO_DEL_NICHO, LARGO_TITULO_IA, LARGO_BAJADA_IA, LARGO_TITULO_PROPIO,
  type EmbudoSugerido,
} from "@/lib/embudo-ia";

/**
 * Armar el embudo con IA: contás de qué se trata y te propone las tres fichas.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * PROPONE, Y RECIÉN CUANDO LAS LEÍSTE SE CREAN
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Son tres pasos y ninguno se puede saltear:
 *
 *   1. **Contás tu nicho.**
 *   2. **Leés y editás las tres fichas.** Acá está el punto: lo que se publica
 *      en una página que cobra lo firma quien vende, así que tiene que haberlo
 *      visto antes de que exista.
 *   3. **Se crean**, por la ruta de siempre — la que tiene los topes del plan y
 *      la validación de campos. Esta pantalla no inventa ninguna de las dos.
 *
 * ── Por qué se muestran las dos bolsas del cupo ────────────────────────────
 *
 * Porque son distintas y la diferencia importa: las del mes vuelven el 1°, las
 * de bienvenida se dan una vez y no vuelven nunca. Mostrando sólo el total,
 * alguien gasta su reserva permanente creyendo que se le renueva.
 *
 * Y por eso, cuando una generación sale de la bolsa de bienvenida, **se avisa**.
 * Es el único momento en que esta pantalla interrumpe.
 */

type Paso = "nicho" | "revisar";

/** Los tres campos editables de una ficha, en el orden en que se leen. */
const FICHAS = [
  { clave: "principal", titulo: "Tu producto", ayuda: "Lo que la persona compra." },
  { clave: "bono", titulo: "El bono", ayuda: "Va de regalo con el principal." },
  { clave: "upsell", titulo: "El upsell", ayuda: "Se ofrece después de pagar." },
] as const;

const plata = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export default function EmbudoIA({
  cupoInicial,
  onCerrar,
}: {
  cupoInicial: EstadoDelCupo;
  onCerrar: () => void;
}) {
  const [paso, setPaso] = useState<Paso>("nicho");
  const [nicho, setNicho] = useState("");
  /* Opcional: el título que la persona YA tiene. Ver `LARGO_TITULO_PROPIO`. */
  const [titulo, setTitulo] = useState("");
  const [embudo, setEmbudo] = useState<EmbudoSugerido | null>(null);
  const [cupo, setCupo] = useState(cupoInicial);
  const [generando, setGenerando] = useState(false);
  const [creando, setCreando] = useState<string | null>(null);
  const [error, setError] = useState("");
  /** Se prende cuando la generación salió de la bolsa que no vuelve. */
  const [gastoReserva, setGastoReserva] = useState(false);

  /* ⚠️ El cerrojo del doble clic. `generando` es estado y el estado se ve recién
     en el próximo dibujo: dos clics en el mismo cuadro leen los dos el valor
     viejo y salen las dos generaciones — dos del cupo por un clic de más. Un
     `ref` cambia en el acto. */
  const enVuelo = useRef(false);
  /* Si ya se creó ALGO en la base. Cambia qué se puede hacer después de un
     fallo: con algo creado, volver a apretar duplica. */
  const huboAlgo = useRef(false);
  const [aMedias, setAMedias] = useState(false);

  const largoOk = nicho.trim().length >= MINIMO_DEL_NICHO;
  const sinCupo = cupo.quedan <= 0;

  async function generar() {
    if (enVuelo.current || !largoOk || sinCupo) return;
    enVuelo.current = true;
    setGenerando(true);
    setError("");
    try {
      const r = await fetch("/api/digitales/ia/embudo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nicho: nicho.trim(), titulo: titulo.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) {
        setError(d.error ?? "No pudimos armarlo. Probá de nuevo.");
        /* Si el servidor dice que se acabó, la pantalla se entera y apaga el
           botón: sin esto seguiría ofreciendo algo que ya no se puede. */
        if (d.cupo) setCupo(d.cupo);
      } else {
        setEmbudo(d.embudo);
        setCupo(d.cupo);
        setGastoReserva(d.salioDe === "bienvenida");
        setPaso("revisar");
      }
    } catch {
      setError("No pudimos conectarnos. Revisá tu internet.");
    }
    enVuelo.current = false;
    setGenerando(false);
  }

  /**
   * Crear los tres, en orden.
   *
   * ⚠️ El principal PRIMERO y esperando su id: el bono y el upsell cuelgan de
   * él, y sin `padreId` la ruta los rechaza. Por eso no van los tres en
   * paralelo, aunque sea más rápido.
   *
   * Y van por `POST /api/digitales/productos`, la de siempre, que es la que
   * cuenta los topes del plan. Si alguien de Free ya tiene su producto, el
   * primero falla ahí con su mensaje — y esta pantalla lo muestra tal cual en
   * vez de inventar uno.
   */
  async function crearLosTres() {
    if (enVuelo.current || !embudo) return;
    enVuelo.current = true;
    setError("");

    const crear = async (cuerpo: Record<string, unknown>) => {
      const r = await fetch("/api/digitales/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "No pudimos crearlo.");
      return d;
    };

    try {
      setCreando("tu producto");
      const principal = await crear({
        rol: "PRINCIPAL",
        name: embudo.principal.titulo,
        description: embudo.principal.bajada,
        price: embudo.principal.precio,
      });
      huboAlgo.current = true;
      const padreId = principal?.id;
      if (typeof padreId !== "string") throw new Error("Se creó el producto pero no pudimos colgarle el bono.");

      setCreando("el bono");
      await crear({
        rol: "BONO", padreId,
        name: embudo.bono.titulo, description: embudo.bono.bajada, price: 0,
      });

      setCreando("el upsell");
      await crear({
        rol: "UPSELL", padreId,
        name: embudo.upsell.titulo, description: embudo.upsell.bajada, price: embudo.upsell.precio,
      });

      /* La lista la arma el servidor: recargar es lo único que garantiza que lo
         que se ve sea lo que quedó guardado. El cerrojo no se suelta: la página
         se está yendo. */
      window.location.reload();
    } catch (e) {
      /* ⚠️ SI FALLÓ EN EL MEDIO, LO QUE YA SE CREÓ QUEDÓ.
         Y por eso el botón NO vuelve: apretarlo de nuevo crearía el principal
         por segunda vez y le gastaría otro lugar del plan. Se cambia por uno que
         cierra y recarga, que es lo único sensato desde acá — la lista de atrás
         es la que dice qué quedó de verdad. */
      setError(
        (e instanceof Error ? e.message : "No pudimos crearlos.")
        + (huboAlgo.current
          ? " Ojo: lo que se alcanzó a crear QUEDÓ guardado. Cerrá y fijate en la lista antes de volver a intentar, o vas a terminar con el producto repetido."
          : " No se creó nada, podés probar de nuevo.")
      );
      /* El cerrojo se suelta sólo si no quedó nada a medias. */
      if (!huboAlgo.current) enVuelo.current = false;
      setAMedias(huboAlgo.current);
      setCreando(null);
    }
  }

  function cambiar(cual: keyof EmbudoSugerido, campo: "titulo" | "bajada" | "precio", valor: string) {
    setEmbudo((e) => {
      if (!e) return e;
      const ficha = { ...e[cual] };
      if (campo === "precio") {
        const limpio = valor.replace(/[^\d]/g, "").slice(0, 9);
        ficha.precio = limpio === "" ? 0 : Number(limpio);
      } else {
        ficha[campo] = valor.slice(0, campo === "titulo" ? LARGO_TITULO_IA : LARGO_BAJADA_IA);
      }
      return { ...e, [cual]: ficha };
    });
  }

  const puedeCrear = !!embudo && FICHAS.every((f) => embudo[f.clave].titulo.trim().length >= 2);

  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        /* Si quedó algo creado, cerrar recarga: la lista de atrás está vieja y
           mostraría dos productos donde ya hay tres. */
        onClick={() => {
          if (generando || creando) return;
          if (aMedias) window.location.reload(); else onCerrar();
        }}
      />
      <div className="relative w-full sm:max-w-xl max-h-[92vh] overflow-y-auto bg-white panel-oscuro:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 z-10 bg-white panel-oscuro:bg-gray-900 border-b border-gray-100 panel-oscuro:border-gray-800 px-6 py-4 flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-black text-gray-900 panel-oscuro:text-gray-100">
            <Sparkles className="h-4 w-4 text-orange-500" />
            {paso === "nicho" ? "Armá tu embudo con IA" : "Mirá cómo quedó"}
          </p>
          <button
            onClick={() => {
              if (generando || creando) return;
              if (aMedias) window.location.reload(); else onCerrar();
            }}
            aria-label="Cerrar"
            className="w-8 h-8 shrink-0 rounded-xl bg-gray-100 panel-oscuro:bg-gray-800 hover:bg-gray-200 panel-oscuro:hover:bg-gray-700 flex items-center justify-center text-gray-500 panel-oscuro:text-gray-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {paso === "nicho" ? (
            <>
              <p className="text-[13px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
                Contame qué sabés hacer y a quién le sirve. Con eso te armo <strong>el producto</strong>,
                un <strong>bono</strong> de regalo y un <strong>upsell</strong>, con sus textos y sus precios.
              </p>
              <p className="mt-1.5 text-[12px] text-gray-500 panel-oscuro:text-gray-400">
                Cuanto más concreto, mejor sale. Después lo podés editar todo.
              </p>

              {/* ⚠️ El título va PRIMERO y es opcional, y eso resuelve a la
                  persona que no estábamos atendiendo: la que ya escribió su
                  ebook y lo que necesita es ayuda para venderlo, no que le
                  inventemos otro nombre. Si lo pone, se respeta tal cual. */}
              <label className="mt-4 block">
                <span className="text-[12.5px] font-bold text-gray-900 panel-oscuro:text-gray-100">
                  ¿Ya tenés el título? <span className="font-medium text-gray-400">(opcional)</span>
                </span>
                <input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value.slice(0, LARGO_TITULO_PROPIO))}
                  maxLength={LARGO_TITULO_PROPIO}
                  disabled={generando}
                  placeholder="Ej: Hamburguesas Irresistibles — 50 recetas"
                  className="mt-1.5 w-full rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 panel-oscuro:text-gray-100 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none disabled:opacity-60"
                />
                <span className="mt-1 block text-[11px] text-gray-400">
                  Si ya lo tenés escrito lo dejamos tal cual. Si no, te lo proponemos nosotros.
                </span>
              </label>

              <label className="mt-4 block text-[12.5px] font-bold text-gray-900 panel-oscuro:text-gray-100">
                ¿De qué se trata?
              </label>
              <textarea
                value={nicho}
                onChange={(e) => setNicho(e.target.value.slice(0, LARGO_DEL_NICHO))}
                /* El tope es el mismo que corta el servidor. Puesto sólo allá, el
                   campo deja escribir de más y se recorta sin avisar. */
                maxLength={LARGO_DEL_NICHO}
                rows={5}
                disabled={generando}
                placeholder="Ej: soy peluquera hace 10 años y quiero venderle a peluqueras que recién empiezan lo que sé de cortes y color."
                className="mt-1.5 w-full rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-800 px-4 py-3 text-sm leading-relaxed text-gray-900 panel-oscuro:text-gray-100 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none disabled:opacity-60"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
                <span>{largoOk ? "" : `Escribí un poco más (mínimo ${MINIMO_DEL_NICHO} caracteres)`}</span>
                <span>{nicho.length}/{LARGO_DEL_NICHO}</span>
              </div>

              <Cupo cupo={cupo} />

              {error && <Aviso>{error}</Aviso>}

              <button
                type="button"
                onClick={generar}
                disabled={generando || !largoOk || sinCupo}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition-opacity hover:bg-orange-700 disabled:opacity-50"
              >
                {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generando ? "Armando tu embudo…" : "Armar mi embudo"}
              </button>
              {generando && (
                <p className="mt-2 text-center text-[11.5px] text-gray-500 panel-oscuro:text-gray-400">
                  Tarda unos segundos. No cierres esta ventana.
                </p>
              )}
            </>
          ) : embudo && (
            <>
              {/* ⚠️ El aviso de que se gastó de la bolsa que no vuelve. Es el
                  único momento en que esta pantalla interrumpe, porque es el
                  único cambio que la persona no puede deshacer. */}
              {gastoReserva && (
                <p className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300 panel-oscuro:border-amber-500/30 bg-amber-50 panel-oscuro:bg-amber-500/10 px-4 py-3 text-[12.5px] text-amber-900 panel-oscuro:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Se te acabaron las de este mes, así que ésta salió de las <strong>de bienvenida</strong>,
                    que no se renuevan.
                    {cupo.proximoMes && ` Si podés esperar, el 1° del mes que viene tenés ${cupo.topeDelMes} nuevas.`}
                  </span>
                </p>
              )}

              <p className="text-[13px] text-gray-600 panel-oscuro:text-gray-300">
                Cambiá lo que quieras. <strong>Todavía no se creó nada</strong> — se crean cuando apretás abajo.
              </p>

              <div className="mt-4 space-y-4">
                {FICHAS.map((f) => (
                  <div key={f.clave} className="rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-orange-600">{f.titulo}</p>
                      <p className="text-[11px] text-gray-400">{f.ayuda}</p>
                    </div>

                    <input
                      value={embudo[f.clave].titulo}
                      onChange={(e) => cambiar(f.clave, "titulo", e.target.value)}
                      maxLength={LARGO_TITULO_IA}
                      aria-label={`Título de ${f.titulo}`}
                      className="mt-2 w-full rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-800 px-3 py-2 text-sm font-bold text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:outline-none"
                    />
                    <textarea
                      value={embudo[f.clave].bajada}
                      onChange={(e) => cambiar(f.clave, "bajada", e.target.value)}
                      maxLength={LARGO_BAJADA_IA}
                      rows={3}
                      aria-label={`Descripción de ${f.titulo}`}
                      className="mt-2 w-full rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-800 px-3 py-2 text-[13px] leading-relaxed text-gray-700 panel-oscuro:text-gray-300 focus:border-orange-400 focus:outline-none"
                    />

                    {/* El bono no lleva precio: es un regalo, y un campo en 0 que
                        no se puede tocar es un campo que confunde. */}
                    {f.clave === "bono" ? (
                      <p className="mt-2 text-[12px] font-semibold text-green-700 panel-oscuro:text-green-400">
                        Va gratis con el producto
                      </p>
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[12px] text-gray-500 panel-oscuro:text-gray-400">Precio</span>
                        <input
                          inputMode="numeric"
                          value={embudo[f.clave].precio === 0 ? "" : String(embudo[f.clave].precio)}
                          onChange={(e) => cambiar(f.clave, "precio", e.target.value)}
                          aria-label={`Precio de ${f.titulo}`}
                          className="w-32 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-800 px-3 py-1.5 text-sm font-bold text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:outline-none"
                        />
                        <span className="text-[11.5px] text-gray-400">
                          {embudo[f.clave].precio > 0 ? plata(embudo[f.clave].precio) : "poné el tuyo"}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Los precios son lo que la IA no puede saber: no conoce el dólar
                  de hoy ni la inflación de este mes. Se dice, para que nadie
                  publique un número sin mirarlo. */}
              <p className="mt-3 text-[11.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                Los precios son una sugerencia: la IA no conoce el mercado de hoy. Revisalos antes de publicar.
              </p>

              <Cupo cupo={cupo} />

              {error && <Aviso>{error}</Aviso>}

              {aMedias ? (
                /* ⚠️ Quedó algo creado. Acá NO se ofrece volver a intentar: el
                   único camino que no duplica es ir a mirar la lista. */
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 panel-oscuro:bg-gray-100 px-5 py-3 text-sm font-bold text-white panel-oscuro:text-gray-900"
                >
                  Ver qué quedó en la lista
                </button>
              ) : (
                <>
                  <div className="mt-4 flex flex-col-reverse sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => { setPaso("nicho"); setGastoReserva(false); setError(""); }}
                      disabled={!!creando}
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 px-4 py-3 text-sm font-bold text-gray-600 panel-oscuro:text-gray-300 transition-colors hover:border-orange-300 hover:text-orange-600 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Probar de nuevo
                    </button>
                    <button
                      type="button"
                      onClick={crearLosTres}
                      disabled={!!creando || !puedeCrear}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition-opacity hover:bg-orange-700 disabled:opacity-50"
                    >
                      {creando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      {creando ? `Creando ${creando}…` : "Crear los tres"}
                    </button>
                  </div>
                  {/* "Probar de nuevo" gasta otra generación, y eso se dice ANTES
                      de apretarlo, no después. */}
                  <p className="mt-2 text-center text-[11px] text-gray-400">
                    Probar de nuevo usa otra generación de tu cupo. Editar a mano no usa ninguna.
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Cuánto le queda, con las dos bolsas separadas.
 *
 * El número grande es el total, que es lo que la persona busca. El detalle va
 * abajo y en chico, pero va: sin él, alguien gasta su bolsa permanente creyendo
 * que se le renueva el mes que viene.
 */
function Cupo({ cupo }: { cupo: EstadoDelCupo }) {
  const vacio = cupo.quedan <= 0;
  return (
    <div className={`mt-4 rounded-2xl px-4 py-3 ${
      vacio
        ? "bg-gray-100 panel-oscuro:bg-gray-800"
        : "bg-orange-50 panel-oscuro:bg-orange-500/10"
    }`}>
      <p className={`text-[13px] font-bold ${
        vacio ? "text-gray-600 panel-oscuro:text-gray-300" : "text-orange-800 panel-oscuro:text-orange-300"
      }`}>
        {vacio
          ? "No te quedan generaciones"
          : `Te ${cupo.quedan === 1 ? "queda" : "quedan"} ${cupo.quedan} ${cupo.quedan === 1 ? "generación" : "generaciones"}`}
      </p>

      <p className="mt-0.5 text-[11.5px] leading-relaxed text-gray-600 panel-oscuro:text-gray-400">
        {cupo.topeDelMes === 0
          /* Free: una sola bolsa, así que el texto es otro y más directo. Decir
             "se renuevan" acá sería mentir. */
          ? `En el plan gratis son ${cupo.topeDeBienvenida} en total y no se renuevan.`
          : <>
              <strong>{cupo.quedanDelMes} de este mes</strong>
              {cupo.proximoMes && ` (vuelven a ser ${cupo.topeDelMes} el 1°)`}
              {" · "}
              <strong>{cupo.quedanDeBienvenida} de bienvenida</strong> (no se renuevan)
            </>}
      </p>

      {vacio && cupo.topeDelMes > 0 && (
        <p className="mt-1 text-[11.5px] text-gray-600 panel-oscuro:text-gray-400">
          El 1° del mes que viene tenés {cupo.topeDelMes} nuevas.
        </p>
      )}
    </div>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 panel-oscuro:border-red-500/25 bg-red-50 panel-oscuro:bg-red-500/10 px-3.5 py-2.5 text-[12.5px] text-red-800 panel-oscuro:text-red-300"
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
