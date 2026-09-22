"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Power, Trash2, X, Loader2, Check, ShieldAlert, Download } from "lucide-react";
import { CLOSURE_REASONS, CLOSURE_COMMENT_MAX, type ClosureReason } from "@/lib/store-closure";
import { CLASE_INPUT } from "./piezas";

/**
 * La zona de peligro de Productos Digitales: dos puertas, como en tiendas.
 *
 *   1. **Cerrar mi cuenta** — la principal. Las páginas salen de línea y nada
 *      se borra; se reabre desde el panel. Es lo que quiere casi todo el
 *      mundo que llega acá. Ver `lib/cierre-digital`.
 *   2. **Eliminar mis datos permanentemente** — el derecho a que se borren
 *      (Ley 25.326), sin vuelta. Va por `/api/cuenta` DELETE, la misma de
 *      todas las cuentas: se anonimiza la persona, se sueltan los dominios y
 *      nada queda publicado. Las ventas se conservan cinco años (AFIP) y las
 *      descargas de quien ya pagó siguen andando.
 *
 * Las dos piden escribir algo para confirmar —el nombre de la cuenta para
 * cerrar, el mail para eliminar— y lo valida el servidor, no sólo la pantalla.
 */
export default function ZonaDePeligro({ nombre, publicados, exportar }: {
  /** El nombre de la cuenta guardado (no lo que esté escribiendo en el formulario de arriba). */
  nombre: string;
  /** Cuántas páginas hay publicadas: es lo que cerrar apaga. */
  publicados: number;
  /** Si el plan deja bajar las ventas en .csv: se ofrece antes de eliminar, que no tiene vuelta. */
  exportar: boolean;
}) {
  const [abierto, setAbierto] = useState<"cerrar" | "eliminar" | null>(null);
  return (
    <section className="rounded-3xl border border-red-200 panel-oscuro:border-red-500/30 bg-white panel-oscuro:bg-gray-900 p-5 sm:p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-red-50 panel-oscuro:bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-black text-red-600">Zona de peligro</h2>
          <p className="text-sm text-gray-500 panel-oscuro:text-gray-400 mt-0.5 leading-relaxed">
            Cerrar tu cuenta se deshace. Eliminar tus datos, no.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        <button
          type="button"
          onClick={() => setAbierto("cerrar")}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-red-200 panel-oscuro:border-red-500/30 bg-red-50 panel-oscuro:bg-red-500/10 hover:bg-red-100 panel-oscuro:hover:bg-red-500/15 text-left transition-colors"
        >
          <Power className="h-4 w-4 shrink-0 text-red-600 panel-oscuro:text-red-400" />
          <span className="min-w-0">
            <span className="block text-sm font-bold text-red-800 panel-oscuro:text-red-200">Cerrar mi cuenta</span>
            <span className="block text-xs text-red-600/80 panel-oscuro:text-red-300/80 mt-0.5">
              Tus páginas salen de línea. Se conserva todo y la reabrís cuando quieras.
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setAbierto("eliminar")}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 text-left transition-colors"
        >
          <Trash2 className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-gray-700 panel-oscuro:text-gray-300">Eliminar mis datos permanentemente</span>
            <span className="block text-xs text-gray-500 panel-oscuro:text-gray-400 mt-0.5">
              Sin vuelta atrás. Quien ya te compró conserva sus descargas.
            </span>
          </span>
        </button>
      </div>

      {abierto === "cerrar" && <ModalCerrar nombre={nombre} publicados={publicados} onClose={() => setAbierto(null)} />}
      {abierto === "eliminar" && <ModalEliminar exportar={exportar} onClose={() => setAbierto(null)} />}
    </section>
  );
}

/* ── El armazón de los dos modales ──────────────────────────────────────── */

function Modal({ Icono, titulo, bajada, onClose, children, pie }: {
  Icono: React.ElementType; titulo: string; bajada: string; onClose: () => void;
  children: React.ReactNode; pie: React.ReactNode;
}) {
  /* Escape cierra; y el foco arranca adentro para quien navega con teclado.
     `onClose` va por un ref: cambia en cada dibujo del padre, y con él en las
     dependencias el efecto volvía a correr —y a mover el foco— a cada letra. */
  const caja = useRef<HTMLDivElement>(null);
  const cerrar = useRef(onClose);
  useEffect(() => { cerrar.current = onClose; }, [onClose]);
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar.current(); };
    window.addEventListener("keydown", alTeclear);
    caja.current?.querySelector<HTMLElement>("select, input, button")?.focus();
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="zona-titulo">
      {/* Se topea al alto de la pantalla y scrollea el medio: en un teléfono
          el cuerpo se pasa largo, y sin tope el botón de confirmar quedaba
          fuera de alcance. */}
      <div ref={caja} className="bg-white panel-oscuro:bg-gray-900 rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col border border-gray-100 panel-oscuro:border-gray-800">
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100 panel-oscuro:border-gray-800 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-red-50 panel-oscuro:bg-red-500/10 flex items-center justify-center shrink-0">
            <Icono className="h-5 w-5 text-red-600" />
          </div>
          <div className="min-w-0">
            <h2 id="zona-titulo" className="font-bold text-gray-900 panel-oscuro:text-gray-100 text-base">{titulo}</h2>
            <p className="text-xs text-gray-500 panel-oscuro:text-gray-400">{bajada}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="ml-auto text-gray-400 hover:text-gray-600 panel-oscuro:hover:text-gray-200 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto space-y-4 text-sm">{children}</div>
        <div className="flex gap-2 px-6 pb-6 pt-4 border-t border-gray-100 panel-oscuro:border-gray-800 shrink-0">{pie}</div>
      </div>
    </div>
  );
}

function Renglon({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[13px] text-gray-700 panel-oscuro:text-gray-300">
      {ok ? <Check className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" /> : <X className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />}
      <span>{children}</span>
    </li>
  );
}

const CLASE_CANCELAR = "flex-1 py-2.5 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-sm font-semibold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors";
const CLASE_CONFIRMAR = "flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors";
const CLASE_ETIQUETA = "block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5";

/* ── 1. Cerrar ──────────────────────────────────────────────────────────── */

function ModalCerrar({ nombre, publicados, onClose }: { nombre: string; publicados: number; onClose: () => void }) {
  const [motivo, setMotivo] = useState<ClosureReason | "">("");
  const [comentario, setComentario] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [yendo, setYendo] = useState(false);
  const [error, setError] = useState("");
  /* Doble click: dos clics seguidos leen el mismo `false` antes del redibujo. */
  const enVuelo = useRef(false);

  const puede = motivo !== "" && confirmacion.trim() === nombre && !yendo;

  async function cerrar() {
    if (enVuelo.current || !puede) return;
    enVuelo.current = true;
    setYendo(true);
    setError("");
    try {
      const r = await fetch("/api/digitales/cerrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: motivo, comment: comentario.trim() || undefined, confirm: confirmacion.trim() }),
      });
      if (r.ok) {
        /* Recarga entera: el layout tiene que volver a mirar la cuenta en el
           servidor para mostrar la puerta de "cerrada". */
        window.location.href = "/digitales";
        return;
      }
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      setError(d.error ?? "No pudimos cerrar tu cuenta. Probá de nuevo.");
    } catch {
      setError("No pudimos conectarnos. Revisá tu internet e intentá de nuevo.");
    }
    enVuelo.current = false;
    setYendo(false);
  }

  return (
    <Modal
      Icono={Power}
      titulo="Cerrar mi cuenta"
      bajada="La reabrís cuando quieras, desde acá mismo"
      onClose={onClose}
      pie={
        <>
          <button type="button" onClick={onClose} className={CLASE_CANCELAR}>Cancelar</button>
          <button type="button" onClick={() => void cerrar()} disabled={!puede} className={CLASE_CONFIRMAR}>
            {yendo ? <><Loader2 className="h-4 w-4 animate-spin" /> Cerrando…</> : <><Power className="h-4 w-4" /> Cerrar mi cuenta</>}
          </button>
        </>
      }
    >
      <ul className="space-y-1.5">
        <Renglon ok={false}>
          {publicados === 0
            ? "No tenés páginas publicadas: no hay nada que salga de línea."
            : publicados === 1
              ? "Tu página de venta sale de línea: nadie puede entrar ni comprar."
              : `Tus ${publicados} páginas de venta salen de línea: nadie puede entrar ni comprar.`}
        </Renglon>
        <Renglon ok={false}>El panel queda cerrado hasta que lo reabras.</Renglon>
      </ul>
      <ul className="bg-green-50 panel-oscuro:bg-green-500/10 border border-green-200 panel-oscuro:border-green-500/25 rounded-2xl p-3.5 space-y-1.5">
        <Renglon ok>Nada se borra: productos, archivos, páginas, dominios, ventas y configuración quedan tal cual.</Renglon>
        <Renglon ok>Quien ya te compró sigue descargando lo suyo, con el mismo link.</Renglon>
        <Renglon ok>No te cobramos nada: el plan no se renueva solo, y los días pagos que te queden siguen siendo tuyos.</Renglon>
        <Renglon ok>Al reabrir, lo que estaba publicado vuelve a estar en línea.</Renglon>
      </ul>

      <div>
        <label htmlFor="cierre-motivo" className={CLASE_ETIQUETA}>¿Por qué cerrás?</label>
        <select id="cierre-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value as ClosureReason | "")} disabled={yendo} className={CLASE_INPUT}>
          <option value="">Elegí un motivo</option>
          {(Object.keys(CLOSURE_REASONS) as ClosureReason[]).map((k) => <option key={k} value={k}>{CLOSURE_REASONS[k]}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="cierre-comentario" className={CLASE_ETIQUETA}>Algo más que quieras contarnos <span className="font-normal text-gray-400">(opcional)</span></label>
        <textarea id="cierre-comentario" value={comentario} onChange={(e) => setComentario(e.target.value)} maxLength={CLOSURE_COMMENT_MAX} rows={2} disabled={yendo} className={`${CLASE_INPUT} resize-y`} />
      </div>
      <div>
        <label htmlFor="cierre-confirmar" className={CLASE_ETIQUETA}>
          Escribí el nombre de tu cuenta para confirmar: <strong className="text-gray-900 panel-oscuro:text-gray-100">{nombre}</strong>
        </label>
        <input
          id="cierre-confirmar" type="text" value={confirmacion} onChange={(e) => { setConfirmacion(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void cerrar(); } }}
          placeholder={nombre} autoComplete="off" spellCheck={false} disabled={yendo} className={CLASE_INPUT}
        />
      </div>
      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 panel-oscuro:bg-red-500/10 panel-oscuro:text-red-300 border border-red-200 panel-oscuro:border-red-500/25 rounded-xl px-4 py-2.5">{error}</p>}
    </Modal>
  );
}

/* ── 2. Eliminar ────────────────────────────────────────────────────────── */

function ModalEliminar({ exportar, onClose }: { exportar: boolean; onClose: () => void }) {
  const [email, setEmail] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState("");
  const [yendo, setYendo] = useState(false);
  const [error, setError] = useState("");
  const enVuelo = useRef(false);

  /* El mail con el que confirma sale del servidor, no de la pantalla: es el
     de la sesión, y así se valida allá con el mismo valor. */
  useEffect(() => {
    let cancelado = false;
    fetch("/api/cuenta?target=account")
      .then((r) => r.json())
      .then((d: { email?: string }) => { if (!cancelado) setEmail(typeof d.email === "string" ? d.email : ""); })
      .catch(() => { if (!cancelado) setError("No pudimos cargar tus datos. Probá de nuevo."); });
    return () => { cancelado = true; };
  }, []);

  const puede = !!email && confirmacion.trim().toLowerCase() === email.toLowerCase() && !yendo;

  async function eliminar() {
    if (enVuelo.current || !puede || !email) return;
    enVuelo.current = true;
    setYendo(true);
    setError("");
    try {
      const r = await fetch("/api/cuenta", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        /* El mail tal como lo tiene el servidor: allá se compara exacto. */
        body: JSON.stringify({ target: "account", confirm: email }),
      });
      if (r.ok) {
        window.location.href = "/";
        return;
      }
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      setError(d.error ?? "No pudimos eliminar tu cuenta. Probá de nuevo.");
    } catch {
      setError("No pudimos conectarnos. Revisá tu internet e intentá de nuevo.");
    }
    enVuelo.current = false;
    setYendo(false);
  }

  return (
    <Modal
      Icono={ShieldAlert}
      titulo="Eliminar mis datos permanentemente"
      bajada="Esto no tiene vuelta atrás"
      onClose={onClose}
      pie={
        <>
          <button type="button" onClick={onClose} className={CLASE_CANCELAR}>Cancelar</button>
          <button type="button" onClick={() => void eliminar()} disabled={!puede} className={CLASE_CONFIRMAR}>
            {yendo ? <><Loader2 className="h-4 w-4 animate-spin" /> Eliminando…</> : <><Trash2 className="h-4 w-4" /> Eliminar mis datos</>}
          </button>
        </>
      }
    >
      <ul className="space-y-1.5">
        <Renglon ok={false}>Se borra tu cuenta: no vas a poder entrar más, y nada tuyo queda publicado.</Renglon>
        <Renglon ok={false}>Tus datos personales se anonimizan y se sueltan tus dominios.</Renglon>
        <Renglon ok={false}>Tus productos, tus páginas, tus landings y tu configuración se pierden.</Renglon>
      </ul>
      <ul className="bg-gray-50 panel-oscuro:bg-gray-800/60 border border-gray-200 panel-oscuro:border-gray-700 rounded-2xl p-3.5 space-y-1.5">
        <Renglon ok>Quien ya te compró no pierde nada: sus descargas siguen andando con el mismo link.</Renglon>
        <Renglon ok>El historial de ventas se conserva 5 años, anonimizado: es lo que exige AFIP.</Renglon>
        <Renglon ok>Podés volver a registrarte con el mismo mail.</Renglon>
      </ul>
      <p className="text-[13px] leading-relaxed text-amber-800 panel-oscuro:text-amber-200 bg-amber-50 panel-oscuro:bg-amber-500/10 border border-amber-200 panel-oscuro:border-amber-500/25 rounded-2xl px-3.5 py-3">
        Si lo que querés es dejar de tener tus páginas a la vista sin perder el trabajo, mejor <strong>cerrá tu cuenta</strong>: se conserva todo y la reabrís cuando quieras.
      </p>
      {/* Después de eliminar no hay forma de volver a ver las ventas: si su
          plan deja bajarlas, se lo dice ANTES, acá, y no en un mail de después. */}
      {exportar && (
        <p className="text-[13px] leading-relaxed text-gray-700 panel-oscuro:text-gray-300">
          Después no vas a poder ver tu historial de ventas. Si lo querés,{" "}
          <a href="/api/digitales/ventas/exportar" className="inline-flex items-center gap-1 font-semibold text-orange-700 panel-oscuro:text-orange-300 underline underline-offset-2">
            <Download className="h-3.5 w-3.5" /> descargalo ahora (.csv)
          </a>
          , antes de eliminar.
        </p>
      )}
      <div>
        <label htmlFor="eliminar-confirmar" className={CLASE_ETIQUETA}>
          Escribí tu mail para confirmar: <strong className="text-gray-900 panel-oscuro:text-gray-100">{email ?? "…"}</strong>
        </label>
        <input
          id="eliminar-confirmar" type="email" value={confirmacion} onChange={(e) => { setConfirmacion(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void eliminar(); } }}
          placeholder={email ?? ""} autoComplete="off" spellCheck={false} disabled={yendo || email === null} className={CLASE_INPUT}
        />
      </div>
      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 panel-oscuro:bg-red-500/10 panel-oscuro:text-red-300 border border-red-200 panel-oscuro:border-red-500/25 rounded-xl px-4 py-2.5">{error}</p>}
    </Modal>
  );
}
