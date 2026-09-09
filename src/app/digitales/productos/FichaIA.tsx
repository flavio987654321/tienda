"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, X, AlertTriangle, Gift, TrendingUp, RotateCcw, Check } from "lucide-react";
import type { EstadoDelCupo } from "@/lib/cupo-ia";
import { LARGO_TITULO_IA, LARGO_BAJADA_IA } from "@/lib/embudo-ia";
import { LARGO_DESCRIPCION, PRECIO_MAXIMO } from "@/lib/productos-digitales";
import CampoAuto from "@/components/CampoAuto";

/**
 * Pedirle a la IA UN bono o UN upsell para un producto que ya existe.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POR QUÉ EXISTE ESTA VENTANA Y NO ALCANZABA CON "ARMAR CON IA"
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Aquel botón arma el embudo entero y **arranca creando el principal**. En Free
 * el tope de principales es uno, así que apenas alguien tiene su producto el
 * botón desaparece —queda "Llegaste al tope"— y el embudo no se puede correr
 * nunca más. Quien hizo su producto a mano quedaba sin ninguna forma de pedirle
 * a la IA el bono ni el upsell, para siempre.
 *
 * Visto en la base el 08/09/26: una cuenta con el principal creado a las 18:30
 * y los bonos cuatro horas después. **El upsell no existía ni borrado.**
 *
 * ── Se ve antes de crearse ─────────────────────────────────────────────────
 *
 * La ruta propone y no guarda. Acá se lee, se edita si hace falta, y recién
 * entonces se crea por la ruta de siempre. Lo que se publica en una página que
 * cobra lo firma quien vende: tiene que haberlo visto antes.
 *
 * ── Y dice lo que cuesta ANTES de apretar ──────────────────────────────────
 *
 * Sale de la misma bolsa que el embudo entero y gasta una generación igual.
 * Cobrar "media" sería un cupo con fracciones que nadie puede contar de cabeza.
 * Lo que sí corresponde es avisarlo antes, no después.
 */

export default function FichaIA({
  padre,
  rol,
  cupoInicial,
  onCerrar,
}: {
  padre: { id: string; name: string };
  rol: "BONO" | "UPSELL";
  cupoInicial: EstadoDelCupo;
  onCerrar: () => void;
}) {
  const [cupo, setCupo] = useState(cupoInicial);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");
  /** La propuesta, ya editable. `null` mientras no se pidió ninguna. */
  const [titulo, setTitulo] = useState("");
  const [bajada, setBajada] = useState("");
  const [precio, setPrecio] = useState("");
  const [hayPropuesta, setHayPropuesta] = useState(false);
  /**
   * Ya se creó y estamos esperando que la pantalla se actualice.
   *
   * No es lo mismo que `trabajando`: uno dice "esperá, estoy haciendo algo" y el
   * otro dice "ya está, sentate un segundo". Confundirlos deja a alguien mirando
   * "Creando…" durante una recarga entera, creyendo que todavía puede fallar.
   */
  const [creado, setCreado] = useState(false);

  /* El mismo cerrojo que el resto del panel: un `ref` y no estado, porque el
     segundo clic llega antes de que React vuelva a dibujar. */
  const enVuelo = useRef(false);
  const vivo = useRef(true);
  useEffect(() => () => { vivo.current = false; }, []);

  const esBono = rol === "BONO";
  const Icono = esBono ? Gift : TrendingUp;
  const comoSeLlama = esBono ? "bono" : "upsell";

  /* ── Pedirle una propuesta ─────────────────────────────────────────────── */
  const proponer = useCallback(async () => {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setTrabajando(true);
    setError("");

    try {
      const r = await fetch("/api/digitales/ia/ficha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ padreId: padre.id, rol }),
      });
      const d = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      if (!vivo.current) return;

      if (d.cupo) setCupo(d.cupo as EstadoDelCupo);
      if (!r.ok) {
        setError(typeof d.error === "string" ? d.error : "No pudimos proponerte nada.");
        return;
      }

      const f = d.ficha as { titulo: string; bajada: string; precio: number } | undefined;
      if (!f) {
        setError("No pudimos proponerte nada. Probá de nuevo.");
        return;
      }
      setTitulo(f.titulo);
      setBajada(f.bajada);
      setPrecio(esBono ? "" : String(f.precio));
      setHayPropuesta(true);
    } catch {
      if (vivo.current) setError("Se cortó la conexión. Probá de nuevo.");
    } finally {
      enVuelo.current = false;
      if (vivo.current) setTrabajando(false);
    }
  }, [padre.id, rol, esBono]);

  /* ── Crearlo ───────────────────────────────────────────────────────────── */
  const crear = useCallback(async () => {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setTrabajando(true);
    setError("");

    try {
      /* Por la ruta de SIEMPRE, que es la que cuenta los topes del plan, valida
         los campos y comprueba que el padre sea de esta cuenta. Duplicar todo
         eso acá sería tener dos copias que se desincronizan de a una. */
      const r = await fetch("/api/digitales/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rol,
          padreId: padre.id,
          name: titulo,
          description: bajada,
          /* Un bono va en 0 siempre, mande lo que mande esta pantalla: es un
             regalo. Lo vuelve a imponer el servidor. */
          price: esBono ? 0 : Number(precio),
        }),
      });
      const d = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      if (!vivo.current) return;

      if (!r.ok) {
        setError(typeof d.error === "string" ? d.error : "No pudimos crearlo.");
        return;
      }

      /* ⚠️ SE AVISA QUE YA ESTÁ, Y RECIÉN AHÍ SE RECARGA.
         La lista la arma el servidor, así que recargar es lo único que garantiza
         que lo que se ve sea lo que quedó guardado — pero esa recarga tarda, y
         hasta acá el botón seguía diciendo "Creando…" todo ese rato. O sea que
         decía que estaba creando algo **que ya estaba creado**.

         En producción la recarga es un segundo y casi no se nota. Con una
         conexión mala en un celular son varios, y ahí alguien cierra la pestaña
         convencido de que falló — cuando en realidad su producto existe. Después
         vuelve, lo ve creado, y no entiende nada.

         El cerrojo NO se suelta: la página se está yendo, y un segundo clic
         crearía el producto dos veces. */
      setCreado(true);
      window.location.reload();
    } catch {
      if (vivo.current) setError("Se cortó la conexión. Probá de nuevo.");
      enVuelo.current = false;
      if (vivo.current) setTrabajando(false);
    }
  }, [rol, padre.id, titulo, bajada, precio, esBono]);

  const cerrar = () => { if (!trabajando) onCerrar(); };

  const precioNum = Number(precio);
  /* Las mismas condiciones que va a pedir el servidor, para que el botón no
     prometa algo que después se rechaza. */
  const listo =
    titulo.trim().length >= 2 &&
    (esBono || (Number.isFinite(precioNum) && precioNum > 0 && precioNum <= PRECIO_MAXIMO));

  const sinCupo = cupo.quedan <= 0;

  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cerrar} />

      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white panel-oscuro:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 z-10 bg-white panel-oscuro:bg-gray-900 border-b border-gray-100 panel-oscuro:border-gray-800 px-6 py-4 flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-black text-gray-900 panel-oscuro:text-gray-100">
            <Icono className="h-4 w-4 text-orange-500" />
            {esBono ? "Un bono con IA" : "Un upsell con IA"}
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
          {!hayPropuesta ? (
            <>
              <p className="text-[13px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
                Le propongo {esBono ? "un regalo" : "una oferta"} que vaya con{" "}
                <strong>{padre.name}</strong>
                {esBono
                  ? ". Va incluido con la compra, sin costo para quien compra."
                  : ". Se ofrece después de pagar, con su propio precio."}
              </p>

              {/* Se lo lee ANTES de crearse: lo que se publica en una página que
                  cobra lo firma quien vende. */}
              <p className="mt-3 text-[12.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                Te lo muestro para que lo leas y lo cambies antes de crearlo.
              </p>

              {/* ⚠️ El costo se dice ANTES de apretar. Sale de la misma bolsa
                  que armar el embudo entero y gasta una generación igual. */}
              <div className={`mt-4 rounded-xl px-3.5 py-2.5 ${
                sinCupo ? "bg-gray-100 panel-oscuro:bg-gray-800" : "bg-orange-50 panel-oscuro:bg-orange-500/10"
              }`}>
                <p className={`text-[13px] font-bold ${
                  sinCupo ? "text-gray-600 panel-oscuro:text-gray-300" : "text-orange-800 panel-oscuro:text-orange-300"
                }`}>
                  {sinCupo
                    ? "No te quedan generaciones"
                    : `Te ${cupo.quedan === 1 ? "queda" : "quedan"} ${cupo.quedan} ${cupo.quedan === 1 ? "generación" : "generaciones"}`}
                </p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-gray-600 panel-oscuro:text-gray-400">
                  Esto gasta una, igual que armar el embudo entero. Cargarlo a mano no gasta ninguna.
                </p>
              </div>

              {error && <Aviso>{error}</Aviso>}

              <button
                onClick={() => void proponer()}
                disabled={trabajando || sinCupo}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {trabajando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {trabajando ? "Pensando…" : `Proponerme un ${comoSeLlama}`}
              </button>

              {/* ══════════════════════════════════════════════════════════════
                  SÓLO EN DESARROLLO. NUNCA SE VE EN PRODUCCIÓN.
                  ══════════════════════════════════════════════════════════════

                  Llena la pantalla con un ejemplo escrito a mano, sin llamar al
                  modelo. Existe porque diseñar esta segunda pantalla —los
                  campos, los largos, cómo entra un título de 70 caracteres en
                  360 px— costaba una generación y unos segundos de espera CADA
                  VEZ que se movía un margen.

                  `process.env.NODE_ENV` lo resuelve el compilador, así que en el
                  build de producción este bloque entero desaparece: no es un
                  botón escondido con CSS, no está en el HTML que se sirve.

                  El ejemplo es largo a propósito: son 232 caracteres, arriba del
                  mínimo de 120 que ahora se le pide al modelo. Si se prueba con
                  un texto corto, la pantalla parece cómoda y después no lo es. */}
              {process.env.NODE_ENV === "development" && (
                <button
                  onClick={() => {
                    setTitulo(esBono
                      ? "Checklist para no olvidarte nada antes de entregar"
                      : "El paso siguiente: 8 casos resueltos de punta a punta");
                    setBajada(esBono
                      ? "Una hoja para tener al lado mientras trabajás, con todo lo que hay que revisar antes de dar algo por terminado. Está pensada para imprimir y tachar: si algo queda sin marcar, todavía no está listo."
                      : "Ocho casos reales resueltos de principio a fin, con las decisiones explicadas paso por paso. Es lo que sigue cuando ya entendiste la teoría y necesitás ver cómo se aplica cuando las cosas no salen redondas.");
                    setPrecio(esBono ? "" : "9900");
                    setHayPropuesta(true);
                  }}
                  className="mt-2 w-full rounded-xl border border-dashed border-gray-300 panel-oscuro:border-gray-700 px-4 py-2.5 text-[12px] font-bold text-gray-500 panel-oscuro:text-gray-400 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors"
                >
                  Ver un ejemplo, sin llamar a la IA (sólo en desarrollo)
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-[12.5px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
                Esto es lo que propongo. Cambiá lo que quieras: todavía no se creó nada.
              </p>

              <label
                htmlFor="ficha-titulo"
                className="mt-4 block text-[12.5px] font-bold text-gray-700 panel-oscuro:text-gray-300"
              >
                Título
              </label>
              {/* ⚠️ `CampoAuto`: un título de 70 caracteres no entra en el
                  renglón de esta ventana y se corría hacia la derecha. Y es un
                  texto que la persona VA a corregir —lo escribió la IA—, así que
                  tiene que poder leerlo entero mientras lo edita. */}
              <CampoAuto
                id="ficha-titulo"
                value={titulo}
                onChange={(v) => setTitulo(v.slice(0, LARGO_TITULO_IA))}
                maxLength={LARGO_TITULO_IA}
                disabled={trabajando}
                estilo="rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-950 px-3.5 py-2.5 text-[13px] font-bold text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:outline-none disabled:opacity-60"
                className="mt-1.5"
              />

              <label className="mt-3 block text-[12.5px] font-bold text-gray-700 panel-oscuro:text-gray-300">
                Descripción
              </label>
              <textarea
                value={bajada}
                onChange={(e) => setBajada(e.target.value.slice(0, LARGO_DESCRIPCION))}
                rows={4}
                maxLength={LARGO_DESCRIPCION}
                disabled={trabajando}
                className="mt-1.5 w-full rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-950 px-3.5 py-2.5 text-[13px] text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:outline-none disabled:opacity-60"
              />
              {/* El tope aparece recién cuando falta poco: un contador siempre a
                  la vista es ruido, y un campo que deja de aceptar letras sin
                  decir por qué se siente como que la pantalla se colgó. */}
              {bajada.length > LARGO_BAJADA_IA * 0.8 && (
                <p className="mt-0.5 text-right text-[10.5px] text-gray-500 panel-oscuro:text-gray-400">
                  {bajada.length} caracteres
                </p>
              )}

              {/* ⚠️ Un bono NO lleva precio y por eso no se dibuja el campo. Un
                  campo en 0 apagado invita a preguntarse si se puede cambiar, y
                  la respuesta es que no: un bono que se cobra no es un regalo. */}
              {esBono ? (
                <p className="mt-3 rounded-xl bg-gray-50 panel-oscuro:bg-gray-800/60 px-3.5 py-2.5 text-[12px] text-gray-600 panel-oscuro:text-gray-300">
                  Va <strong>gratis</strong> con la compra del principal. Por eso no lleva precio.
                </p>
              ) : (
                <>
                  <label className="mt-3 block text-[12.5px] font-bold text-gray-700 panel-oscuro:text-gray-300">
                    Precio
                  </label>
                  <input
                    value={precio}
                    /* ⚠️ Los dígitos salen de `PRECIO_MAXIMO` y no de un 9
                       escrito a mano: con `slice(0, 9)` se podían tipear mil
                       millones, que el servidor rechaza con "ese precio es
                       demasiado alto". Un campo que acepta lo que la otra punta
                       no acepta es un viaje perdido. */
                    onChange={(e) =>
                      setPrecio(e.target.value.replace(/[^\d]/g, "").slice(0, String(PRECIO_MAXIMO).length))}
                    inputMode="numeric"
                    disabled={trabajando}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-950 px-3.5 py-2.5 text-[13px] text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:outline-none disabled:opacity-60"
                  />
                </>
              )}

              {error && <Aviso>{error}</Aviso>}

              <button
                onClick={() => void crear()}
                disabled={trabajando || !listo}
                className={`mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed ${
                  creado
                    /* Verde y no naranja: el color también dice que salió bien,
                       sin depender de que se lea la palabra. */
                    ? "bg-emerald-600 disabled:opacity-100"
                    : "bg-orange-600 hover:bg-orange-500 disabled:opacity-50"
                }`}
              >
                {creado
                  ? <Check className="h-4 w-4" />
                  : trabajando
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : null}
                {creado
                  ? `Listo — actualizando la pantalla…`
                  : trabajando
                    ? "Creando…"
                    : `Crear este ${comoSeLlama}`}
              </button>

              {/* ⚠️ Pedir otro GASTA OTRA generación, y el botón lo dice. Un
                  "probar de nuevo" que descuenta del cupo sin avisar es lo que
                  después se reclama. */}
              <button
                onClick={() => void proponer()}
                disabled={trabajando || sinCupo}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 px-4 py-2.5 text-[13px] font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Proponerme otro (gasta una más)
              </button>
            </>
          )}
        </div>
      </div>
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
