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
