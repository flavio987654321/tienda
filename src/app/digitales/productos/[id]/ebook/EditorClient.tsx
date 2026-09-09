"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import EbookTexto from "../../EbookTexto";
import VistaPreviaEbook from "../../VistaPreviaEbook";
import type { CapituloEscrito } from "@/lib/ebook-ia";
import type { ColoresDeTapa, ModoDelEbook } from "@/lib/ebook-colores";
import { useSalida } from "@/app/digitales/SalidaSinGuardar";

/**
 * El editor del texto: a la izquierda lo que se escribe, a la derecha cómo queda.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LAS DOS COLUMNAS SON EL PUNTO, NO UN ADORNO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Corregir un ebook a ciegas —campos sueltos en una lista, y a ver qué sale— es
 * lo que había antes. Con la previa al lado se ve **lo que se está tocando**:
 * que un párrafo quedó de nueve renglones, que hay tres viñetas seguidas donde
 * debería haber texto, que el recuadro de color cae justo abajo del subtítulo.
 * Nada de eso se puede juzgar mirando un campo de formulario.
 *
 * Es el mismo molde que el editor de la página de venta: dos columnas en
 * pantalla ancha y, en el celular, dos solapas —porque a 360 px, una al lado de
 * la otra no entra ninguna—.
 *
 * ── Por qué el texto vive ACÁ y no adentro de `EbookTexto` ─────────────────
 *
 * Porque las dos columnas miran lo mismo. Si el texto viviera adentro del
 * editor, la previa se enteraría al guardar — o sea, cuando ya no sirve.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ GUARDAR SON DOS PEDIDOS Y TIENEN QUE SER DOS, PERO UN SOLO BOTÓN
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Guardar el texto **no cambia el archivo**: el PDF colgado del producto es el
 * de antes, y es el que va a recibir quien compre. Por eso el guardado baja el
 * ebook de `LISTO` a `COMPLETO` —que es lo que de verdad es, escrito y sin
 * archivo— y acá se arma de nuevo enseguida.
 *
 * Si el armado falla, el texto YA quedó guardado y se dice con esas palabras.
 * El ebook queda en `COMPLETO`, que es un estado del que se sale desde la
 * tarjeta con el botón de siempre. Nada se pierde y nada miente.
 */
export default function EditorDeEbook({
  productoId,
  producto,
  titulo,
  promesa,
  autor,
  capitulos: guardadosIniciales,
  fotos,
  total,
  paleta,
  modo,
  deMentira = false,
}: {
  productoId: string;
  producto: string;
  titulo: string;
  promesa: string;
  autor: string;
  capitulos: CapituloEscrito[];
  /** Con qué se busca la foto de cada capítulo. Ver `VistaPreviaEbook`. */
  fotos: string[];
  total: number;
  paleta: ColoresDeTapa;
  modo: ModoDelEbook;
  /**
   * El ejemplo de desarrollo: guarda de mentira.
   *
   * ⚠️ Lo único que cambia. Todo lo demás —la validación, las dos columnas, la
   * previa, el aviso de salida— es exactamente el mismo código, que es la única
   * forma de que mirar el ejemplo sirva para algo.
   */
  deMentira?: boolean;
}) {
  const router = useRouter();

  /* Lo guardado y lo que se está escribiendo, separados: la diferencia entre
     los dos ES "hay cambios sin guardar". */
  const [guardados, setGuardados] = useState(guardadosIniciales);
  const [capitulos, setCapitulos] = useState(guardadosIniciales);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);

  /* En el celular las dos columnas no entran, así que son dos solapas. Arranca
     en "escribir": a esta pantalla se entra a corregir, no a mirar. */
  const [vista, setVista] = useState<"escribir" | "previa">("escribir");

  /* ⚠️ Hay algo corregido a mano que se pierde si se sale de la pantalla.
     Acá pesa más que en una ventanita: esto es una dirección, así que se sale
     con el "volver", con el menú de al lado o con el botón de atrás del
     navegador —tres caminos, ninguno con un "¿seguro?" propio—. Es la misma
     guarda del editor de la página de venta. */
  const [sinGuardar, setSinGuardar] = useState(false);
  const { setBloqueado } = useSalida();
  useEffect(() => {
    setBloqueado(sinGuardar);
    /* Sin la limpieza, el aviso sobrevive a la pantalla y sigue preguntando
       desde otra: el interruptor vive arriba, no acá. */
    return () => setBloqueado(false);
  }, [sinGuardar, setBloqueado]);

  /* Corta el doble clic: sin esto, dos clics rápidos mandan dos guardados y el
     segundo se choca contra el candado del servidor. */
  const enVuelo = useRef(false);
  const vivo = useRef(true);
  useEffect(() => () => { vivo.current = false; }, []);

  const pedir = useCallback(async (url: string, cuerpo: Record<string, unknown>) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productoId, ...cuerpo }),
    });
    const datos = await res.json().catch(() => null);
    return { ok: res.ok, datos: (datos ?? {}) as Record<string, unknown> };
  }, [productoId]);

  const guardar = useCallback(async (corregidos: CapituloEscrito[]) => {
    if (enVuelo.current) return;

    /* El ejemplo no le pega a la base: dice qué habría guardado y listo. */
    if (deMentira) {
      const pedazos = corregidos.reduce((n, c) => n + c.bloques.length, 0);
      setGuardados(corregidos);
      setCapitulos(corregidos);
      setListo(
        `Se habría guardado: ${corregidos.length} capítulos, ${pedazos} pedazos. Y después se rehacía el PDF.`,
      );
      return;
    }

    enVuelo.current = true;
    setGuardando(true);
    setError(null);
    setListo(null);

    try {
      const { ok, datos } = await pedir("/api/digitales/ia/ebook/texto", { capitulos: corregidos });
      if (!vivo.current) return;

      if (!ok) {
        /* Se queda en la pantalla con el motivo escrito: lo corregido sigue a la
           vista y se puede arreglar y volver a intentar. */
        setError(typeof datos.error === "string" ? datos.error : "No pudimos guardar el texto.");
        return;
      }

      /* ⚠️ Se mueve la línea de "lo guardado" a lo que acaba de entrar, y no se
         toca lo que está escrito: el aviso de salida tiene que apagarse, y el
         texto en pantalla es exactamente ese. Es lo LIMADO —lo que el servidor
         aceptó— y no lo que se tipeó, que puede tener un espacio de más. */
      setGuardados(corregidos);
      setCapitulos(corregidos);

      if (datos.hayQueArmar === true) {
        const armado = await pedir("/api/digitales/ia/ebook/armar", {});
        if (!vivo.current) return;

        if (!armado.ok) {
          setError(
            typeof armado.datos.error === "string"
              ? `Los cambios quedaron guardados, pero no pudimos rehacer el PDF: ${armado.datos.error}`
              : "Los cambios quedaron guardados, pero no pudimos rehacer el PDF. Probá de nuevo desde la tarjeta del producto.",
          );
          return;
        }

        setListo("Guardado, y el PDF se rehizo con los cambios. Ése es el que se entrega.");
      } else {
        setListo("Guardado. El PDF se va a armar solo cuando termine de escribirse.");
      }

      /* Que la tarjeta de atrás se entere: el peso del archivo y el estado del
         ebook cambiaron, y esa pantalla ya está armada del lado del servidor. */
      router.refresh();
    } catch {
      if (vivo.current) setError("Se cortó la conexión. Probá de nuevo.");
    } finally {
      enVuelo.current = false;
      if (vivo.current) setGuardando(false);
    }
  }, [pedir, router, deMentira]);

  return (
    <div>
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 panel-oscuro:text-gray-500">
          {producto}
        </p>
        <h1 className="mt-0.5 text-xl font-black text-gray-900 panel-oscuro:text-gray-100">
          Editar el contenido
        </h1>
      </div>

      {listo && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 panel-oscuro:border-emerald-500/25 bg-emerald-50 panel-oscuro:bg-emerald-500/10 px-3.5 py-2.5">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-[12.5px] leading-relaxed text-emerald-900 panel-oscuro:text-emerald-300">
            {listo}
          </p>
        </div>
      )}

      {/* Mientras se arma el PDF esto tarda unos segundos y no hay barra que
          mirar: el cartel es lo único que dice que algo está pasando. */}
      {guardando && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl bg-gray-100 panel-oscuro:bg-gray-800 px-3.5 py-2.5">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-500" />
          <p className="text-[12.5px] text-gray-600 panel-oscuro:text-gray-300">
            Guardando y rehaciendo el PDF. No cierres esta pantalla.
          </p>
        </div>
      )}

      {/* ── Las solapas del celular ────────────────────────────────────────
          Sólo abajo de `lg`: de ahí para arriba las dos columnas están a la
          vista y unas solapas que no hacen nada serían ruido. */}
      <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 panel-oscuro:bg-gray-800 p-1 lg:hidden">
        {(["escribir", "previa"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVista(v)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
              vista === v
                ? "bg-white text-gray-900 shadow-sm panel-oscuro:bg-gray-900 panel-oscuro:text-gray-100"
                : "text-gray-500 panel-oscuro:text-gray-400"
            }`}
          >
            {v === "escribir" ? "Escribir" : "Cómo queda"}
          </button>
        ))}
      </div>

      {/* ⚠️ `grid-cols-1` no es decorativo: sin él la columna toma su ancho
          mínimo de contenido y un párrafo largo la estira, empujando la
          pantalla entera hacia la derecha en el celular. Los `min-w-0` son la
          misma idea un escalón más abajo. Es la misma cuenta que en el editor
          de la página de venta. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Lo que se escribe ──────────────────────────────────────────── */}
        <div className={`min-w-0 ${vista === "escribir" ? "" : "hidden lg:block"}`}>
          <div className="rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 p-4 sm:p-5">
            <EbookTexto
              guardados={guardados}
              capitulos={capitulos}
              onCapitulos={setCapitulos}
              total={total}
              guardando={guardando}
              error={error}
              onCambio={setSinGuardar}
              onGuardar={guardar}
              onVolver={() => router.push("/digitales/productos")}
            />
          </div>
        </div>

        {/* ── Cómo queda ─────────────────────────────────────────────────── */}
        <div className={`min-w-0 ${vista === "previa" ? "" : "hidden lg:block"}`}>
          {/* `sticky` para que la hoja siga estando mientras se baja por los
              capítulos: una previa que se va para arriba en el segundo capítulo
              no sirve de nada. */}
          <div className="lg:sticky lg:top-4">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="text-[12.5px] font-bold text-gray-700 panel-oscuro:text-gray-300">
                Cómo va a quedar
              </p>
              {/* ⚠️ Que NO es el archivo, dicho. Es la misma maqueta y los
                  mismos colores, pero dónde corta cada hoja lo decide el
                  armado: prometer eso acá haría que alguien acomode su texto
                  para un corte que después no es. */}
              <p className="text-[11px] text-gray-400 panel-oscuro:text-gray-500">
                Los cortes de hoja los hace el PDF
              </p>
            </div>

            {/* La hoja tiene su propio scroll: un ebook de diez capítulos mide
                metros, y sin esto la columna de la izquierda quedaría al lado
                de una tira de tres pantallas de alto. */}
            <div className="max-h-[calc(100vh-8rem)] overflow-y-auto rounded-2xl">
              <VistaPreviaEbook
                titulo={titulo}
                promesa={promesa}
                autor={autor}
                capitulos={capitulos}
                fotos={fotos}
                paleta={paleta}
                modo={modo}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
