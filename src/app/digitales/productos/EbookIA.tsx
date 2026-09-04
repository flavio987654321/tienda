"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, X, AlertTriangle, Check, BookOpen, RotateCcw } from "lucide-react";
import type { EstadoDelCupo } from "@/lib/cupo-ia";
/* `import type` se borra al compilar, así que esto NO arrastra al navegador
   nada de lo que ese archivo importa —prisma incluido—. Es sólo la forma. */
import type { EstadoDelBorrador } from "@/lib/ebook-borrador";
import { LARGO_TEMA, MINIMO_TEMA, LARGO_PUBLICO } from "@/lib/ebook-ia";

/**
 * Escribir el ebook con IA.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ESTA VENTANA MANEJA UN TRABAJO DE VARIOS MINUTOS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * No es un botón que espera una respuesta: es un bucle. Pide el temario, y
 * después pide **un capítulo por vez** —porque una función del servidor tiene 60
 * segundos y se corta— hasta que están todos. Recién ahí arma el PDF.
 *
 * ── Lo más importante que hace esta pantalla ───────────────────────────────
 *
 * **Decir que se puede cerrar.** Lo escrito está guardado en el servidor después
 * de cada capítulo, así que cerrar no pierde nada ni cuesta otra generación. Sin
 * decirlo, cualquiera se queda cinco minutos mirando una barra sin animarse a
 * tocar nada.
 *
 * ── Por qué el bucle frena solo al primer error ────────────────────────────
 *
 * Porque cada intento **nos cuesta plata**, aunque falle y aunque a la persona
 * no se le cobre. Un bucle que reintenta solo, contra un modelo que está
 * teniendo un mal día, gasta diez veces sin que nadie mire. Así que un error
 * frena y pone un botón: seguir es una decisión de la persona, no del código.
 */

type Paso = "contar" | "escribiendo" | "listo";

export default function EbookIA({
  producto,
  cupoInicial,
  estadoInicial,
  onCerrar,
}: {
  producto: { id: string; name: string; tieneArchivo: boolean };
  cupoInicial: EstadoDelCupo;
  estadoInicial: EstadoDelBorrador | null;
  onCerrar: () => void;
}) {
  const [cupo, setCupo] = useState(cupoInicial);
  const [ebook, setEbook] = useState<EstadoDelBorrador | null>(estadoInicial);
  const [paso, setPaso] = useState<Paso>(() => {
    if (!estadoInicial) return "contar";
    if (estadoInicial.estado === "LISTO") return "listo";
    return "escribiendo";
  });

  const [tema, setTema] = useState("");
  const [publico, setPublico] = useState("");

  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gastoReserva, setGastoReserva] = useState(false);
  /* `true` cuando el ebook ya empezó: cerrar tiene que recargar, porque la
     tarjeta de atrás quedó vieja. */
  const [huboAlgo, setHuboAlgo] = useState(!!estadoInicial);

  /* ⚠️ Dos candados distintos, y hacen falta los dos.
     - `enVuelo` corta el doble clic: sin él, dos clics rápidos mandan dos
       pedidos y el segundo se choca contra el candado del servidor.
     - `vivo` corta el bucle cuando la ventana se cierra: sin él, el bucle
       sigue pidiendo capítulos contra un componente que ya no existe. */
  const enVuelo = useRef(false);
  const vivo = useRef(true);
  useEffect(() => () => { vivo.current = false; }, []);

  const pedir = useCallback(async (url: string, cuerpo: Record<string, unknown>) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productoId: producto.id, ...cuerpo }),
    });
    const datos = await res.json().catch(() => null);
    return { ok: res.ok, datos: (datos ?? {}) as Record<string, unknown> };
  }, [producto.id]);

  /* ── El bucle: un capítulo por vuelta ─────────────────────────────────── */
  const seguir = useCallback(async () => {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setTrabajando(true);
    setError(null);

    try {
      /* Mientras falten capítulos, se pide el que sigue. La condición se lee de
         lo que contesta el servidor y no de un contador nuestro: el que sabe
         cuántos hay escritos es el que los guarda. */
      for (;;) {
        if (!vivo.current) return;

        const { ok, datos } = await pedir("/api/digitales/ia/ebook/paso", {});
        if (!vivo.current) return;

        if (!ok) {
          setError(typeof datos.error === "string" ? datos.error : "No pudimos seguir. Probá de nuevo.");
          return;
        }

        const estado = datos.ebook as EstadoDelBorrador | undefined;
        if (estado) setEbook(estado);

        if (datos.esperando === true) {
          setError("Se está escribiendo desde otra pestaña. Cerrá esta y seguí en la otra.");
          return;
        }
        if (datos.listo === true) break;
        if (!estado || estado.escritos >= estado.total) break;
      }

      if (!vivo.current) return;

      /* Están todos los capítulos: se arma el PDF y se cuelga del producto. */
      const armado = await pedir("/api/digitales/ia/ebook/armar", {});
      if (!vivo.current) return;

      if (!armado.ok) {
        setError(typeof armado.datos.error === "string"
          ? armado.datos.error
          : "El texto está listo pero no pudimos armar el PDF. Probá de nuevo.");
        return;
      }

      const estado = armado.datos.ebook as EstadoDelBorrador | undefined;
      if (estado) setEbook(estado);
      setPaso("listo");
    } catch {
      if (vivo.current) setError("Se cortó la conexión. Lo escrito quedó guardado: probá de nuevo.");
    } finally {
      enVuelo.current = false;
      if (vivo.current) setTrabajando(false);
    }
  }, [pedir]);

  /* ── Empezar (o rehacer) ──────────────────────────────────────────────── */
  const empezar = useCallback(async (rehacer: boolean) => {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setTrabajando(true);
    setError(null);

    try {
      const { ok, datos } = await pedir("/api/digitales/ia/ebook", { tema, publico, rehacer });
      if (!vivo.current) return;

      if (!ok) {
        setError(typeof datos.error === "string" ? datos.error : "No pudimos empezar. Probá de nuevo.");
        if (datos.cupo) setCupo(datos.cupo as EstadoDelCupo);
        return;
      }

      setHuboAlgo(true);
      if (datos.cupo) setCupo(datos.cupo as EstadoDelCupo);
      /* Sale de la bolsa que no vuelve: es el único momento en que esta
         ventana interrumpe. Misma decisión que en el embudo. */
      setGastoReserva(datos.salioDe === "bienvenida");

      const estado = datos.ebook as EstadoDelBorrador | undefined;
      if (estado) setEbook(estado);
      setPaso("escribiendo");
    } catch {
      if (vivo.current) setError("Se cortó la conexión. Probá de nuevo.");
      return;
    } finally {
      enVuelo.current = false;
      if (vivo.current) setTrabajando(false);
    }

    /* El temario ya está: se arranca a escribir sin pedir otro clic. */
    if (vivo.current) void seguir();
  }, [pedir, tema, publico, seguir]);

  const cerrar = () => {
    if (trabajando) return;
    if (huboAlgo) window.location.reload(); else onCerrar();
  };

  const temaCorto = tema.trim().length < MINIMO_TEMA;
  const sinCupo = cupo.quedan <= 0;
  const escritos = ebook?.escritos ?? 0;
  const total = ebook?.total ?? 0;
  const porcentaje = total > 0 ? Math.round((escritos / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cerrar} />

      <div className="relative w-full sm:max-w-xl max-h-[92vh] overflow-y-auto bg-white panel-oscuro:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 z-10 bg-white panel-oscuro:bg-gray-900 border-b border-gray-100 panel-oscuro:border-gray-800 px-6 py-4 flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-black text-gray-900 panel-oscuro:text-gray-100">
            <BookOpen className="h-4 w-4 text-orange-500" />
            {paso === "listo" ? "Tu ebook está listo" : "Escribí tu ebook con IA"}
          </p>
          <button
            onClick={cerrar}
            aria-label="Cerrar"
            disabled={trabajando}
            className="w-8 h-8 shrink-0 rounded-xl bg-gray-100 panel-oscuro:bg-gray-800 hover:bg-gray-200 panel-oscuro:hover:bg-gray-700 flex items-center justify-center text-gray-500 panel-oscuro:text-gray-400 transition-colors disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* ── Contar de qué se trata ──────────────────────────────────── */}
          {paso === "contar" && (
            <>
              <p className="text-[13px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
                Contame de qué se trata <strong>{producto.name}</strong> y lo escribo entero:
                el temario y todos los capítulos, en un PDF listo para vender.
              </p>

              {/* ⚠️ Se avisa ANTES de apretar, no después. Reemplazar un archivo
                  que la persona subió a mano sin avisarle es perderle el
                  trabajo. */}
              {producto.tieneArchivo && (
                <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 panel-oscuro:border-amber-500/25 bg-amber-50 panel-oscuro:bg-amber-500/10 px-3.5 py-2.5 text-[12.5px] text-amber-900 panel-oscuro:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Este producto ya tiene un PDF cargado. Si escribimos el ebook, lo reemplaza.</span>
                </p>
              )}

              <label className="mt-4 block text-[12.5px] font-bold text-gray-700 panel-oscuro:text-gray-300">
                ¿De qué se trata?
              </label>
              <textarea
                value={tema}
                onChange={(e) => setTema(e.target.value.slice(0, LARGO_TEMA))}
                rows={5}
                maxLength={LARGO_TEMA}
                disabled={trabajando}
                placeholder="Contá qué vas a enseñar, con tus palabras. Si ya tenés el índice pensado, pegalo tal cual."
                className="mt-1.5 w-full rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-950 px-3.5 py-2.5 text-[13px] text-gray-900 panel-oscuro:text-gray-100 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none disabled:opacity-60"
              />
              <p className="mt-1 text-[11px] text-gray-400 panel-oscuro:text-gray-500">
                {tema.trim().length} de {LARGO_TEMA} · cuanto más cuentes, mejor sale
              </p>

              <label className="mt-4 block text-[12.5px] font-bold text-gray-700 panel-oscuro:text-gray-300">
                ¿Para quién es? <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <input
                value={publico}
                onChange={(e) => setPublico(e.target.value.slice(0, LARGO_PUBLICO))}
                maxLength={LARGO_PUBLICO}
                disabled={trabajando}
                placeholder="Ej: gente que recién arranca y no tiene herramientas"
                className="mt-1.5 w-full rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-950 px-3.5 py-2.5 text-[13px] text-gray-900 panel-oscuro:text-gray-100 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none disabled:opacity-60"
              />

              <Cupo cupo={cupo} />

              {error && <Aviso>{error}</Aviso>}

              <button
                onClick={() => empezar(false)}
                disabled={trabajando || temaCorto || sinCupo}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {trabajando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {trabajando ? "Armando el temario…" : "Escribir el ebook"}
              </button>

              <p className="mt-2 text-center text-[11px] text-gray-400 panel-oscuro:text-gray-500">
                Tarda unos minutos. Vas a poder leerlo y cambiarlo antes de publicar.
              </p>
            </>
          )}

          {/* ── Escribiendo ─────────────────────────────────────────────── */}
          {paso === "escribiendo" && (
            <>
              {gastoReserva && (
                <p className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 panel-oscuro:border-amber-500/25 bg-amber-50 panel-oscuro:bg-amber-500/10 px-3.5 py-2.5 text-[12.5px] text-amber-900 panel-oscuro:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Este salió de tus ebooks de bienvenida, que <strong>no se renuevan</strong>.
                    Te quedan {cupo.quedanDeBienvenida}.
                  </span>
                </p>
              )}

              <p className="text-[13px] font-bold text-gray-900 panel-oscuro:text-gray-100">
                {ebook?.titulo ?? producto.name}
              </p>

              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 panel-oscuro:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-orange-500 transition-all duration-500"
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
                <span className="shrink-0 text-[12px] font-bold text-gray-500 panel-oscuro:text-gray-400">
                  {escritos} de {total}
                </span>
              </div>

              <ul className="mt-4 space-y-1.5">
                {(ebook?.capitulos ?? []).map((c, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[12.5px]">
                    <span className="mt-0.5 shrink-0">
                      {c.listo
                        ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                        : i === escritos && trabajando
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
                          : <span className="block h-3.5 w-3.5 rounded-full border border-gray-200 panel-oscuro:border-gray-700" />}
                    </span>
                    <span className={c.listo
                      ? "text-gray-500 panel-oscuro:text-gray-500 line-through"
                      : "text-gray-800 panel-oscuro:text-gray-200"}>
                      {c.titulo}
                    </span>
                  </li>
                ))}
              </ul>

              {error && <Aviso>{error}</Aviso>}

              {/* ⚠️ EL BOTÓN VA SIEMPRE QUE NO SE ESTÉ TRABAJANDO, no sólo
                  cuando hubo error.

                  Dos motivos, y el segundo era un agujero: cuando alguien vuelve
                  a una ventana que dejó a medias, el bucle NO arranca solo —cada
                  vuelta cuesta plata, así que seguir lo decide la persona—. Sin
                  el botón acá, volver con todos los capítulos escritos y el PDF
                  sin armar dejaba la lista entera tildada y nada que apretar: el
                  ebook pago quedaba a un paso del final, sin salida.

                  Y el otro: un bucle que reintenta solo contra un modelo que está
                  fallando gasta diez veces sin que nadie mire. */}
              {!trabajando && (
                <button
                  onClick={() => void seguir()}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-500 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  {error
                    ? "Seguir desde donde iba"
                    : escritos >= total && total > 0
                      ? "Armar el PDF"
                      : "Seguir escribiendo"}
                </button>
              )}

              <p className="mt-4 rounded-xl bg-gray-50 panel-oscuro:bg-gray-800/60 px-3.5 py-2.5 text-[12px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
                Tarda unos minutos. <strong>Podés cerrar esta ventana</strong>: cada capítulo
                queda guardado apenas se escribe, y cuando vuelvas sigue desde donde iba
                sin gastar otra generación.
              </p>
            </>
          )}

          {/* ── Listo ───────────────────────────────────────────────────── */}
          {paso === "listo" && (
            <>
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 panel-oscuro:border-emerald-500/25 bg-emerald-50 panel-oscuro:bg-emerald-500/10 px-4 py-3.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-[13px] font-bold text-emerald-900 panel-oscuro:text-emerald-300">
                    {ebook?.titulo ?? producto.name}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-emerald-800 panel-oscuro:text-emerald-400">
                    Ya está cargado como el archivo de este producto. Es el que se le va a
                    entregar a quien compre.
                  </p>
                </div>
              </div>

              {/* ⚠️ Que lo LEA antes de publicar. Lo que se vende lo firma quien
                  vende: nosotros no podemos garantizar que un modelo no escribió
                  una macana, y quien cobra es quien responde. */}
              <p className="mt-4 text-[12.5px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
                <strong>Leelo antes de publicarlo.</strong> Lo escribió una IA a partir de lo
                que le contaste, y quien vende es quien responde por lo que dice. Si algo no te
                cierra, cambiá lo que contaste y volvé a escribirlo.
              </p>

              <Cupo cupo={cupo} />

              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={cerrar}
                  className="flex-1 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-500 transition-colors"
                >
                  Listo
                </button>
                <button
                  onClick={() => { setPaso("contar"); setError(null); }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 px-4 py-3 text-sm font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  {ebook && ebook.reintentos < 1 ? "Rehacerlo (uno gratis)" : "Rehacerlo"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Las dos bolsas del cupo, a la vista.
 *
 * Se muestran separadas porque son distintas y la diferencia importa: las del
 * mes vuelven el 1°, las de bienvenida se dan una vez y no vuelven nunca.
 * Mostrando sólo el total, alguien gasta su reserva permanente creyendo que se
 * le renueva.
 */
function Cupo({ cupo }: { cupo: EstadoDelCupo }) {
  const vacio = cupo.quedan <= 0;
  return (
    <div className={`mt-4 rounded-xl px-3.5 py-2.5 ${
      vacio ? "bg-gray-100 panel-oscuro:bg-gray-800" : "bg-orange-50 panel-oscuro:bg-orange-500/10"
    }`}>
      <p className={`text-[13px] font-bold ${
        vacio ? "text-gray-600 panel-oscuro:text-gray-300" : "text-orange-800 panel-oscuro:text-orange-300"
      }`}>
        {vacio
          ? "No te quedan ebooks con IA"
          : `Te ${cupo.quedan === 1 ? "queda" : "quedan"} ${cupo.quedan} ${cupo.quedan === 1 ? "ebook" : "ebooks"} con IA`}
      </p>

      <p className="mt-0.5 text-[11.5px] leading-relaxed text-gray-600 panel-oscuro:text-gray-400">
        <strong>{cupo.quedanDelMes} de este mes</strong>
        {cupo.proximoMes && ` (vuelven a ser ${cupo.topeDelMes} el 1°)`}
        {" · "}
        <strong>{cupo.quedanDeBienvenida} de bienvenida</strong> (no se renuevan)
      </p>

      {vacio && cupo.topeDelMes > 0 && (
        <p className="mt-1 text-[11.5px] text-gray-600 panel-oscuro:text-gray-400">
          El 1° del mes que viene tenés {cupo.topeDelMes} nuevos.
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
