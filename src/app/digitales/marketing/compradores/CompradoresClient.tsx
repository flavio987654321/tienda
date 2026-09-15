"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail, Send, ArrowRight } from "lucide-react";
import { validarCorreoNuevo, saludo, ASUNTO_MAX, CUERPO_MAX } from "@/lib/correos-compradores";
import { PLANTILLAS_DE_CORREO, correoDeLaPlantilla, CONSEJO_DE_CORREO } from "@/lib/plantillas-marketing";
import ConsejoDeUso from "../../ConsejoDeUso";

export type CorreoEnPantalla = {
  id: string;
  asunto: string;
  /** A los compradores de este producto, o null = a todos. */
  producto: string | null;
  cuando: string;
  resumen: string;
  enviando: boolean;
};

type Resultado = { enviados: number; fallidos: number; falta: boolean };

const CLASE_INPUT = "w-full px-4 py-3 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 text-sm text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all";

const personas = (n: number) => (n === 1 ? "1 persona" : `${n} personas`);

/**
 * El formulario, la vista previa y el historial. Las reglas de lo que se
 * puede mandar están en `validarCorreoNuevo`, la misma función que corre la
 * ruta: acá se avisa antes, allá se decide.
 *
 * ── El envío se retoma solo ──────────────────────────────────────────────
 *
 * La ruta manda hasta donde le da el tiempo y contesta `falta: true` si
 * quedó gente. Acá se la vuelve a llamar hasta que termine, mostrando el
 * progreso: la vendedora ve un solo botón, no un "seguir" que tiene que
 * apretar ocho veces. Si cierra la pestaña en el medio, el historial le
 * deja el botón de seguir.
 */
export default function CompradoresClient({ esPro, productos, cuantos, correos, topePorDia, vendedor }: {
  esPro: boolean;
  productos: { id: string; name: string }[];
  cuantos: { todos: number; porProducto: Record<string, number> };
  correos: CorreoEnPantalla[];
  topePorDia: number;
  vendedor: string | null;
}) {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [enlaceProductId, setEnlaceProductId] = useState("");
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mandando, setMandando] = useState(false);
  const [progreso, setProgreso] = useState<Resultado | null>(null);
  const [siguiendo, setSiguiendo] = useState<string | null>(null);
  const enVuelo = useRef(false);

  const destinatarios = productId ? (cuantos.porProducto[productId] ?? 0) : cuantos.todos;
  const borrador = { asunto, cuerpo, productId: productId || null, enlaceProductId: enlaceProductId || null };
  const problema = asunto || cuerpo ? (() => { const r = validarCorreoNuevo(borrador); return r.ok ? null : r.problema; })() : null;
  const enlazado = productos.find((p) => p.id === enlaceProductId) ?? null;

  /* Una plantilla carga asunto y mensaje con el nombre del producto elegido
     (o del primero, si es "a todos"), y sugiere el botón cuando conviene.
     Es un borrador: se cambia antes de mandar. */
  function usarPlantilla(clave: string) {
    const p = PLANTILLAS_DE_CORREO.find((x) => x.clave === clave);
    if (!p) return;
    const producto = productos.find((x) => x.id === productId) ?? productos[0] ?? null;
    const c = correoDeLaPlantilla(p, producto?.name ?? null);
    setAsunto(c.asunto); setCuerpo(c.cuerpo);
    setEnlaceProductId(p.conBoton && producto ? producto.id : "");
    setError(null);
  }

  async function seguirHasta(id: string, primero: Resultado): Promise<Resultado> {
    let total = { ...primero };
    while (total.falta) {
      const r = await fetch(`/api/digitales/correos/${id}/seguir`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Se cortó el envío. Podés seguirlo desde el historial.");
      total = { enviados: total.enviados + d.enviados, fallidos: total.fallidos + d.fallidos, falta: !!d.falta };
      setProgreso(total);
    }
    return total;
  }

  async function mandar() {
    if (enVuelo.current || problema || destinatarios === 0) return;
    if (!window.confirm(`Se va a mandar a ${personas(destinatarios)}. Después no se puede deshacer. ¿Mandamos?`)) return;
    enVuelo.current = true;
    setMandando(true);
    setError(null);
    setProgreso(null);
    try {
      const r = await fetch("/api/digitales/correos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(borrador),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error ?? "No se pudo mandar. Probá de nuevo.");
      } else {
        const inicial = { enviados: d.enviados ?? 0, fallidos: d.fallidos ?? 0, falta: !!d.falta };
        setProgreso(inicial);
        await seguirHasta(d.id, inicial);
        setAsunto(""); setCuerpo(""); setEnlaceProductId("");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos conectarnos. Probá de nuevo.");
      router.refresh();
    }
    enVuelo.current = false;
    setMandando(false);
  }

  async function seguir(id: string) {
    if (siguiendo) return;
    setSiguiendo(id);
    try {
      await seguirHasta(id, { enviados: 0, fallidos: 0, falta: true });
    } catch {
      /* El historial muestra hasta dónde llegó; el botón queda para volver a intentar. */
    }
    setSiguiendo(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* ── Sin Pro: qué es, y cuánta gente tiene esperando ─────────────── */}
      {!esPro && (
        <div className="rounded-3xl border border-dashed border-gray-300 panel-oscuro:border-gray-700 p-5">
          <p className="flex items-center gap-2 text-[13px] font-bold text-gray-800 panel-oscuro:text-gray-200">
            <Lock className="h-3.5 w-3.5 text-gray-400" /> Es del plan Pro
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
            {cuantos.todos > 0
              ? <>Ya tenés <strong className="text-gray-800 panel-oscuro:text-gray-200">{personas(cuantos.todos)}</strong> que te compraron. Es la gente más fácil de volver a venderle: ya te pagaron una vez.</>
              : "Cuando tengas ventas, desde acá les escribís a todos de una: lanzamientos, avisos, una opinión."}
            {" "}Con Pro les escribís a todos con un solo mail, con tu nombre, y te contestan a tu correo.
          </p>
          <Link href="/digitales/mi-cuenta" className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-orange-600 hover:text-orange-500">
            Ver el plan Pro <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* ── Escribir ──────────────────────────────────────────────────────── */}
      {esPro && (
        <div className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm space-y-4">
          {/* Tres mails de ejemplo: para qué se usa esto, con el texto ya
              escrito. Un click lo carga y se cambia antes de mandar. */}
          <div>
            <p className="text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">Empezá de un ejemplo</p>
            <div className="flex flex-wrap gap-2">
              {PLANTILLAS_DE_CORREO.map((p) => (
                <button
                  key={p.clave}
                  type="button"
                  onClick={() => usarPlantilla(p.clave)}
                  className="rounded-full border border-gray-200 panel-oscuro:border-gray-700 px-3 py-1.5 text-[12.5px] font-semibold text-gray-700 panel-oscuro:text-gray-300 transition-colors hover:border-orange-300 hover:bg-orange-50/60 panel-oscuro:hover:bg-orange-500/10"
                >
                  {p.nombre}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="para" className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">Para</label>
              <select id="para" value={productId} onChange={(e) => setProductId(e.target.value)} className={CLASE_INPUT}>
                <option value="">Todos los que te compraron ({cuantos.todos})</option>
                {productos.map((p) => <option key={p.id} value={p.id}>Compradores de {p.name} ({cuantos.porProducto[p.id] ?? 0})</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="boton" className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">Botón del mail <span className="font-normal text-gray-400">(opcional)</span></label>
              <select id="boton" value={enlaceProductId} onChange={(e) => setEnlaceProductId(e.target.value)} className={CLASE_INPUT}>
                <option value="">Sin botón</option>
                {productos.map((p) => <option key={p.id} value={p.id}>Ver {p.name}</option>)}
              </select>
              <p className="mt-1.5 text-xs text-gray-500 panel-oscuro:text-gray-400">Lleva a la página del producto, con la etiqueta puesta: la venta que venga de este mail se ve en Campañas.</p>
            </div>
          </div>
          <div>
            <label htmlFor="asunto" className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">Asunto</label>
            <input id="asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)} maxLength={ASUNTO_MAX} placeholder="Salió la segunda parte" className={CLASE_INPUT} />
          </div>
          <div>
            <label htmlFor="cuerpo" className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">Mensaje</label>
            <textarea id="cuerpo" value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} maxLength={CUERPO_MAX} rows={7} placeholder="Contales qué hay de nuevo, como se lo contarías a una persona. El «Hola» con su nombre lo ponemos nosotros." className={`${CLASE_INPUT} resize-y`} />
            <p className="mt-1.5 text-xs text-gray-500 panel-oscuro:text-gray-400">
              {cuerpo.length} / {CUERPO_MAX}. Sale con tu nombre y las respuestas llegan a tu correo. Cada mail lleva un link para no recibir más; quien lo use no vuelve a aparecer acá.
            </p>
          </div>

          {/* ── Cómo se ve ──────────────────────────────────────────────── */}
          {(asunto || cuerpo) && (
            <div className="rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 bg-gray-50 panel-oscuro:bg-gray-950 p-4">
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Así les llega</p>
              <p className="text-[11px] font-semibold text-gray-500 panel-oscuro:text-gray-400">{vendedor?.trim() || "Vos"} · TiendaApps</p>
              <p className="mt-0.5 text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">{asunto || "(sin asunto)"}</p>
              <p className="mt-3 text-[13px] text-gray-700 panel-oscuro:text-gray-300">{saludo("Ana")}</p>
              <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-gray-700 panel-oscuro:text-gray-300">{cuerpo}</p>
              {enlazado && (
                <span className="mt-3 inline-block rounded-lg bg-gray-900 panel-oscuro:bg-gray-100 px-4 py-2 text-[12.5px] font-bold text-white panel-oscuro:text-gray-900">Ver {enlazado.name}</span>
              )}
              <p className="mt-4 text-[10.5px] text-gray-400">Recibís este mail porque le compraste a {vendedor?.trim() || "…"}. · No quiero recibir más mails</p>
            </div>
          )}

          <ConsejoDeUso>{CONSEJO_DE_CORREO}</ConsejoDeUso>

          {problema && <p className="text-sm font-medium text-red-600">{problema}</p>}
          {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
          {progreso && (
            <p className="text-sm font-medium text-gray-700 panel-oscuro:text-gray-300" aria-live="polite">
              {progreso.falta ? `Saliendo… ${progreso.enviados} enviados.` : `Listo: ${progreso.enviados} enviados.`}
              {progreso.fallidos > 0 && ` ${progreso.fallidos} no llegaron (la dirección rebotó).`}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={mandar}
              disabled={mandando || !!problema || !asunto || !cuerpo || destinatarios === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {mandando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {destinatarios === 0 ? "Nadie a quién mandarle" : `Mandar a ${personas(destinatarios)}`}
            </button>
            <span className="text-xs text-gray-500 panel-oscuro:text-gray-400">Hasta {topePorDia} por día.</span>
          </div>
        </div>
      )}

      {/* ── El historial ──────────────────────────────────────────────────── */}
      {correos.length > 0 && (
        <ul className="space-y-3">
          {correos.map((c) => (
            <li key={c.id} className="rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-4">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">
                    <Mail className="h-4 w-4 shrink-0 text-orange-500" /> <span className="truncate">{c.asunto}</span>
                  </p>
                  <p className="mt-1 text-[12.5px] text-gray-600 panel-oscuro:text-gray-400">
                    {c.cuando} · {c.producto ? `compradores de ${c.producto}` : "todos los compradores"} · {c.resumen}
                  </p>
                </div>
                {/* En pantalla chica va abajo, entero: al lado le come el asunto. */}
                {c.enviando && esPro && (
                  <button
                    type="button"
                    onClick={() => seguir(c.id)}
                    disabled={siguiendo !== null}
                    className="inline-flex basis-full sm:basis-auto items-center justify-center gap-1.5 rounded-lg border border-orange-200 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-50 disabled:opacity-40"
                  >
                    {siguiendo === c.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Seguir mandando
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
