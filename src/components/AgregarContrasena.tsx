"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { validarContrasena, LARGO_MINIMO } from "@/lib/password-policy";

/**
 * "Agregar contraseña", para quien se registró con Google y no tiene una.
 *
 * Sirve de respaldo (si un día pierde su cuenta de Google) y para entrar a la
 * app instalada con mail y contraseña. Quien ya tiene contraseña no ve nada:
 * para cambiarla está "¿Olvidaste tu contraseña?" en el login.
 *
 * Va en la pantalla de cuenta de los cuatro paneles. Se decide sola si se
 * muestra, así que ponerla de más no cuesta nada.
 */
export function AgregarContrasena() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [sinContrasena, setSinContrasena] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [clave, setClave] = useState("");
  const [repetir, setRepetir] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const enVuelo = useRef(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        // Al servidor, que mira la contraseña misma: la lista de proveedores
        // de Supabase no siempre se entera de que se agregó una.
        const r = await fetch("/api/auth/contrasena", { cache: "no-store", signal: AbortSignal.timeout(15_000) });
        const d = await r.json().catch(() => ({ tiene: true }));
        if (vivo && r.ok && d.tiene === false) setSinContrasena(true);
      } catch { /* sin red no se muestra; no es urgente */ }
    })();
    return () => { vivo = false; };
  }, []);

  if (!sinContrasena && !listo) return null;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (enVuelo.current) return;
    const problema = validarContrasena(clave);
    if (problema) { setError(problema); return; }
    if (clave !== repetir) { setError("Las dos contraseñas no coinciden."); return; }
    enVuelo.current = true;
    setGuardando(true);
    setError("");
    try {
      const { error: err } = await Promise.race([
        supabase.auth.updateUser({ password: clave }),
        new Promise<never>((_, rechazar) => setTimeout(() => rechazar(new Error("tiempo")), 20_000)),
      ]);
      if (err) {
        // Supabase pide haber entrado hace poco para tocar la contraseña.
        setError(/reauth|recent/i.test(err.message)
          ? "Por seguridad, cerrá sesión, volvé a entrar con Google y probá de nuevo."
          : "No pudimos guardar la contraseña. Probá de nuevo.");
        return;
      }
      setListo(true);
      setSinContrasena(false);
      setClave("");
      setRepetir("");
    } catch {
      setError("Se cortó la conexión. Revisá tu internet y probá de nuevo.");
    } finally {
      enVuelo.current = false;
      setGuardando(false);
    }
  }

  const input =
    "w-full rounded-xl border border-gray-300 panel-oscuro:border-gray-600 bg-white panel-oscuro:bg-gray-900 px-3.5 py-3 text-sm text-gray-900 panel-oscuro:text-gray-100 placeholder-gray-400 panel-oscuro:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

  return (
    <div className="rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 panel-oscuro:bg-orange-500/10 dark:bg-orange-500/10">
          <KeyRound className="h-5 w-5 text-orange-600 panel-oscuro:text-orange-400" />
        </div>
        <div className="min-w-0 flex-1">
          {listo ? (
            <>
              <p className="font-bold text-gray-900 panel-oscuro:text-gray-100 dark:text-white">Contraseña guardada</p>
              <p className="mt-1 text-sm text-gray-600 panel-oscuro:text-gray-400 dark:text-gray-400 panel-oscuro:dark:text-gray-500">
                Desde ahora podés entrar con Google o con tu mail y esta contraseña.
              </p>
            </>
          ) : (
            <>
              <p className="font-bold text-gray-900 panel-oscuro:text-gray-100 dark:text-white">Agregá una contraseña</p>
              <p className="mt-1 text-sm text-gray-600 panel-oscuro:text-gray-400 dark:text-gray-400 panel-oscuro:dark:text-gray-500">
                Entrás con Google. Con una contraseña también podés entrar desde la app instalada,
                y si un día perdés tu cuenta de Google no te quedás afuera.
              </p>
              {!abierto ? (
                <button
                  type="button"
                  onClick={() => setAbierto(true)}
                  className="mt-3 text-sm font-bold text-orange-600 panel-oscuro:text-orange-400 hover:text-orange-700 panel-oscuro:hover:text-orange-300"
                >
                  Agregar contraseña
                </button>
              ) : (
                <form onSubmit={guardar} className="mt-4 space-y-3">
                  {error && (
                    <p className="rounded-xl border border-red-200 panel-oscuro:border-red-500/30 bg-red-50 panel-oscuro:bg-red-500/10 px-3 py-2 text-sm text-red-600 panel-oscuro:text-red-400">{error}</p>
                  )}
                  <div className="relative">
                    <input
                      type={ver ? "text" : "password"}
                      value={clave}
                      onChange={(e) => { setClave(e.target.value); setError(""); }}
                      autoComplete="new-password"
                      placeholder={`Mínimo ${LARGO_MINIMO} caracteres`}
                      maxLength={128}
                      className={`${input} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setVer(!ver)}
                      aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 panel-oscuro:text-gray-500 hover:text-gray-600 panel-oscuro:hover:text-gray-400"
                    >
                      {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <input
                    type={ver ? "text" : "password"}
                    value={repetir}
                    onChange={(e) => { setRepetir(e.target.value); setError(""); }}
                    autoComplete="new-password"
                    placeholder="Repetila"
                    maxLength={128}
                    className={input}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={guardando}
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-60"
                    >
                      {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                      {guardando ? "Guardando..." : "Guardar contraseña"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAbierto(false); setError(""); setClave(""); setRepetir(""); }}
                      disabled={guardando}
                      className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 panel-oscuro:text-gray-400 hover:bg-gray-100 panel-oscuro:hover:bg-gray-800 dark:text-gray-300 panel-oscuro:dark:text-gray-600 dark:hover:bg-gray-800"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
