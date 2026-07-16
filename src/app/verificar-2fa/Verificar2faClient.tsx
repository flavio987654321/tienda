"use client";

import { useRef, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

// Segundo factor al entrar al admin. La sesión llega en aal1 (solo contraseña) y
// acá se eleva a aal2 verificando el código TOTP. Vive FUERA de /admin a propósito:
// si estuviera adentro, el gate del layout la redirigiría a sí misma en loop.
export default function Verificar2faClient() {
  const supabase = createSupabaseBrowserClient();
  const { signOut } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
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
      const { data: factors, error: fErr } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.[0];
      if (fErr || !totp) {
        setError("No encontramos tu factor de 2FA. Cerrá sesión e intentá de nuevo.");
        return;
      }
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
      if (chErr || !challenge) {
        setError(chErr?.message ?? "No se pudo verificar. Intentá de nuevo.");
        return;
      }
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: totp.id,
        challengeId: challenge.id,
        code,
      });
      if (vErr) {
        setError("El código no coincide. Fijate que sea el actual de tu app y probá de nuevo.");
        return;
      }
      // Sesión elevada a aal2. Navegación completa para que el servidor re-lea la
      // cookie nueva y el gate del admin ya la deje pasar.
      window.location.href = "/admin";
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

          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && code.length === 6) verify(); }}
            placeholder="000000"
            className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.4em] font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
          />

          <button
            onClick={verify}
            disabled={busy || code.length !== 6}
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
