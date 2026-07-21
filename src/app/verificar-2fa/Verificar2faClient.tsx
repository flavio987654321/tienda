"use client";

import { useRef, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

// Segundo factor al entrar al admin. La sesión llega en aal1 (solo contraseña) y
// acá se eleva a aal2 verificando el código TOTP. Vive FUERA de /admin a propósito:
// si estuviera adentro, el gate del layout la redirigiría a sí misma en loop.
export default function Verificar2faClient() {
  const { signOut } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [restantes, setRestantes] = useState<number | null>(null);
  const sending = useRef(false);

  async function verify() {
    if (sending.current) return;
    if (!/^\d{6}$/.test(code)) {
      setError("Ingresá el código de 6 dígitos de tu app.");
      return;
    }
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      // Por nuestro servidor y no directo a Supabase: es lo que permite contar
      // los códigos errados. Hablándole a Supabase desde el navegador, los
      // intentos no pasaban por ningún lado nuestro y no había forma de frenar
      // a alguien probando códigos en serie.
      const res = await fetch("/api/verificar-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "No se pudo verificar. Intentá de nuevo.");
        if (data.bloqueado) setLocked(true);
        // Se avisa cuántos quedan recién cuando empieza a apretar, no desde el
        // primer error: al que se equivocó copiando no hay por qué asustarlo.
        if (typeof data.restantes === "number" && data.restantes > 0 && data.restantes <= 2) {
          setRestantes(data.restantes);
        }
        setCode("");
        return;
      }

      // Sesión elevada a aal2. Navegación completa para que el servidor re-lea la
      // cookie nueva y el gate del admin ya la deje pasar.
      window.location.assign("/admin");
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="h-6 w-6 text-indigo-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1.5">Verificación en dos pasos</h1>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Ingresá el código de 6 dígitos de tu app de autenticación para entrar al panel.
          </p>

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-red-300">
              {error}
            </div>
          )}

          {!locked && restantes !== null && (
            <p className="mb-4 text-xs text-amber-400">
              Te {restantes === 1 ? "queda 1 intento" : `quedan ${restantes} intentos`} antes de que se bloquee por 15 minutos.
            </p>
          )}

          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            disabled={locked}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && code.length === 6) verify(); }}
            placeholder="000000"
            className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.4em] font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40 mb-4"
          />

          <button
            onClick={verify}
            disabled={busy || locked || code.length !== 6}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verificar
          </button>

          <button
            onClick={() => { if (!busy) signOut("/login"); }}
            disabled={busy}
            className="mt-4 text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
