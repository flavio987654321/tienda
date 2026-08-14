"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Lock, ExternalLink, AlertCircle, RefreshCw, Loader2 } from "lucide-react";

/**
 * Piezas compartidas por los wizards de Meta (Catálogo, Píxel, WhatsApp).
 *
 * Estaban duplicadas wizard por wizard, y esa copia salió cara: cuando se
 * arreglaron en el del catálogo los botones que quedaban girando y los errores
 * que no se mostraban, el del píxel se quedó con los bugs viejos — mismo
 * problema, mismo código, arreglado en un solo lado. Todo lo que vive acá se
 * arregla una vez para todos.
 *
 * Lo que NO va acá son los pasos propios de cada app: elegir catálogo no se
 * parece a elegir píxel, y forzar que compartan forma sería peor que copiarlos.
 */

export type StepStatus = "done" | "active" | "locked";

export const statusOf = (done: boolean, prevDone: boolean): StepStatus =>
  done ? "done" : prevDone ? "active" : "locked";

/**
 * POST al backend. Devuelve `null` si salió bien, o el mensaje a mostrar.
 *
 * El `catch` no es decorativo: `fetch` sólo rechaza cuando no hubo respuesta
 * —se cortó internet, el servidor no contestó—, y sin atajarlo la línea que
 * apaga el spinner nunca corre. Así quedaban los botones girando para siempre,
 * sin forma de destrabarlos salvo recargando la página entera.
 */
export async function postJson(url: string, body?: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      ...(body === undefined
        ? {}
        : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
    if (res.ok) return null;
    const d = await res.json().catch(() => ({}));
    return typeof d?.error === "string" ? d.error : "No se pudo completar la acción. Probá de nuevo.";
  } catch {
    return "No pudimos conectarnos. Revisá tu internet y probá de nuevo.";
  }
}

/**
 * GET al backend con el mensaje de error ya resuelto.
 *
 * Los pasos se llenan solos por fetch y antes cualquier fallo terminaba en
 * "Recargá la página", que además de esconder la causa era mentira: recargar no
 * arregla un permiso que falta.
 */
export async function getJson<T>(url: string, fallback: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error("No pudimos conectarnos. Revisá tu internet y probá de nuevo.");
  }
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof d?.error === "string" ? d.error : fallback);
  return d as T;
}

export function AvisoError({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 mb-3">
      <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
      <p className="text-sm text-red-700 leading-relaxed">{mensaje}</p>
    </div>
  );
}

/**
 * Error de un paso que no pudo cargar sus datos. Siempre con botón de
 * reintentar: los pasos se llenan solos por fetch, así que volver a pedir no
 * pierde nada, y mandar a recargar la página entera era pedirle al dueño que
 * arranque todo el wizard de nuevo por un error momentáneo de Facebook.
 */
export function ErrorDePaso({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  // El botón se apaga apenas se toca: cada reintento dispara un pedido a la
  // Graph API de Meta, que tiene cuota por app. Se reactiva cuando el paso
  // vuelve a fallar (se remonta este componente con el mensaje nuevo).
  const [reintentando, setReintentando] = useState(false);

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3.5">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm text-red-800 leading-relaxed">{mensaje}</p>
          <div className="flex flex-wrap items-center gap-3 mt-2.5">
            <button
              onClick={() => { setReintentando(true); onReintentar(); }}
              disabled={reintentando}
              className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              {reintentando
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <RefreshCw className="h-3 w-3" />}
              Reintentar
            </button>
            <a
              href="https://business.facebook.com/settings"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 hover:text-red-800"
            >
              Abrir Meta Business <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StepCard({
  index, title, status, children,
}: {
  index: number; title: string; status: StepStatus; children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border bg-white shadow-sm transition-opacity ${status === "locked" ? "border-slate-200 opacity-50" : "border-slate-200"}`}>
      <div className="flex items-center gap-3 px-5 py-4">
        {status === "done" ? (
          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
        ) : status === "locked" ? (
          <Lock className="h-4 w-4 text-slate-300 shrink-0" />
        ) : (
          <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">{index}</span>
        )}
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      {status !== "locked" && (
        <div className="px-5 pb-5 border-t border-slate-100 pt-4">{children}</div>
      )}
    </div>
  );
}

/**
 * Lo que pasa —y lo que NO pasa— al desconectar la cuenta de Meta.
 *
 * Antes el botón desconectaba de una y sin decir nada, y la pregunta obvia del
 * dueño quedaba sin respuesta: ¿pierdo el catálogo? ¿se borran mis productos de
 * Facebook? ¿queda algo dado de alta a mi nombre?
 *
 * La primera frase afirma que el envío se corta, y eso se puede afirmar porque
 * se probó: el 14/08/2026 se desconectó una cuenta real y Meta aceptó el borrado
 * del feed. Antes de tener ese dato decía "vamos a intentar", que era feo pero
 * honesto; prometer un corte que no ocurre es de las mentiras peores, porque el
 * dueño no tiene cómo darse cuenta.
 *
 * Los links siguen igual: el catálogo y los productos SÍ quedan en Meta, y eso
 * solo lo puede borrar él.
 */
export function ConfirmarDesconexion({
  onCancelar, onConfirmar, desconectando,
}: {
  onCancelar: () => void;
  onConfirmar: () => void;
  desconectando: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-sm font-bold text-slate-900 mb-3">¿Desconectar tu cuenta de Facebook?</p>

      <ul className="space-y-2.5 mb-4">
        <li className="flex items-start gap-2.5">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
          <span className="text-xs text-slate-600 leading-relaxed">
            Se corta el envío diario de tus productos: Meta deja de leer tu tienda y tu catálogo
            no se actualiza más.
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-600 leading-relaxed">
            <strong className="text-slate-800">Tu catálogo y tus productos NO se borran.</strong>{" "}
            Son tuyos y quedan en tu cuenta de Meta, tal como están hoy. Simplemente dejan de
            actualizarse.
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
          <span className="text-xs text-slate-600 leading-relaxed">
            Nada de tu tienda acá se pierde. Podés volver a conectarla cuando quieras.
          </span>
        </li>
      </ul>

      <div className="rounded-md border border-slate-200 bg-white px-3.5 py-3 mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-2">
          Si querés borrar todo del lado de Meta
        </p>
        <p className="text-xs text-slate-500 leading-relaxed mb-2.5">
          Eso se hace desde Meta, no desde acá — son tus datos y no los tocamos. En Commerce
          Manager podés borrar el catálogo con todos sus productos. Y en tu Facebook podés
          quitarle el permiso a la aplicación, que queda dado aunque desconectes.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://business.facebook.com/commerce_manager"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
          >
            Abrir Commerce Manager <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://www.facebook.com/settings?tab=applications"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
          >
            Quitar el permiso en Facebook <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onConfirmar}
          disabled={desconectando}
          className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-md transition-colors disabled:opacity-50"
        >
          {desconectando && <Loader2 className="h-3 w-3 animate-spin" />}
          Sí, desconectar
        </button>
        <button
          onClick={onCancelar}
          disabled={desconectando}
          className="text-xs font-bold text-slate-500 hover:text-slate-700 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/** El aviso de arriba de todo cuando el token de Meta ya venció. */
export function AvisoTokenVencido() {
  return (
    <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3.5">
      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-bold text-amber-900">Tu conexión con Facebook venció</p>
        <p className="text-sm text-amber-900/80 mt-0.5 leading-relaxed">
          Meta corta el permiso cada dos meses por seguridad. Tu catálogo y tus productos siguen
          ahí — solo hay que volver a conectar la cuenta para que se sigan actualizando.
          Desconectá abajo y conectá de nuevo.
        </p>
      </div>
    </div>
  );
}
