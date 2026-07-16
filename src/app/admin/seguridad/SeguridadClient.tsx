"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, ShieldAlert, Loader2, Copy, Check, X, KeyRound } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type View = "loading" | "off" | "enrolling" | "on";

// Activación / desactivación del 2FA (TOTP) para la cuenta admin. Se apoya en el
// MFA nativo de Supabase: acá solo se orquestan enroll → challenge → verify.
// El "secreto" que se muestra al activar ES el respaldo: guardándolo, la cuenta
// se recupera pegándolo en cualquier app de autenticación. Si se pierde del todo,
// el escape hatch es borrar el factor desde el panel de Supabase (Authentication
// → Users → el admin → MFA), documentado para no quedar nunca afuera.
export default function SeguridadClient() {
  const supabase = createSupabaseBrowserClient();

  const [view, setView] = useState<View>("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);

  // Datos del enrolamiento en curso
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  async function refreshStatus() {
    setError("");
    const { data, error: err } = await supabase.auth.mfa.listFactors();
    if (err) {
      setError("No pudimos leer el estado del 2FA. Recargá la página.");
      setView("off");
      return;
    }
    setView(data.totp.length > 0 ? "on" : "off");
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial del estado del 2FA desde Supabase; no hay valor que sincronizar en el render
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startEnroll() {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      // Limpieza: si quedó un factor sin verificar de un intento anterior, Supabase
      // rechaza uno nuevo con el mismo nombre. Se borran los no verificados antes.
      const { data: existing } = await supabase.auth.mfa.listFactors();
      const unverified = (existing?.all ?? []).filter((f) => f.status !== "verified");
      for (const f of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      const { data, error: err } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "TiendaApps Admin",
      });
      if (err || !data) {
        setError(err?.message ?? "No se pudo iniciar el 2FA.");
        return;
      }
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setCode("");
      setView("enrolling");
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  async function confirmEnroll() {
    if (sending.current) return;
    if (!/^\d{6}$/.test(code)) {
      setError("Ingresá el código de 6 dígitos de tu app.");
      return;
    }
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr || !challenge) {
        setError(chErr?.message ?? "No se pudo verificar. Intentá de nuevo.");
        return;
      }
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (vErr) {
        setError("El código no coincide. Fijate que sea el actual de tu app y probá de nuevo.");
        return;
      }
      // Verificado: la sesión ya es aal2. Se limpia el estado sensible.
      setQrCode("");
      setSecret("");
      setCode("");
      await refreshStatus();
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  function cancelEnroll() {
    // Deja el factor sin verificar; se limpia en el próximo startEnroll. No se
    // bloquea la UI por eso.
    setView("off");
    setQrCode("");
    setSecret("");
    setCode("");
    setError("");
  }

  async function disable2fa() {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      for (const f of data?.all ?? []) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      await refreshStatus();
    } catch {
      setError("No se pudo desactivar. Intentá de nuevo.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  function copySecret() {
    navigator.clipboard?.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  if (view === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      {/* Estado actual */}
      <div className={`rounded-2xl border p-5 mb-6 flex items-start gap-4 ${
        view === "on"
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-amber-500/20 bg-amber-500/5"
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          view === "on" ? "bg-emerald-500/15" : "bg-amber-500/15"
        }`}>
          {view === "on"
            ? <ShieldCheck className="h-5 w-5 text-emerald-400" />
            : <ShieldAlert className="h-5 w-5 text-amber-400" />}
        </div>
        <div className="min-w-0">
          <p className={`font-bold text-sm ${view === "on" ? "text-emerald-300" : "text-amber-300"}`}>
            {view === "on" ? "2FA activado" : "2FA desactivado"}
          </p>
          <p className="text-gray-400 text-xs mt-1 leading-relaxed">
            {view === "on"
              ? "Cada vez que iniciás sesión en el admin te pedimos el código de tu app de autenticación. La cuenta está protegida aunque te roben la contraseña."
              : "Con solo la contraseña alcanza para entrar al admin. Activá el 2FA para exigir además el código de una app de autenticación."}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-300">
          <X className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* OFF → botón activar */}
      {view === "off" && (
        <button
          onClick={startEnroll}
          disabled={busy}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Activar verificación en dos pasos
        </button>
      )}

      {/* ENROLLING → QR + secreto + código */}
      {view === "enrolling" && (
        <div className="space-y-5">
          <div>
            <p className="text-white text-sm font-semibold mb-1">1. Escaneá el código con tu app</p>
            <p className="text-gray-500 text-xs mb-3">Google Authenticator, Safe Authenticator, Authy o similar.</p>
            {/* qr_code es el markup SVG del QR. Se inyecta inline y se deja que el
                SVG llene un cuadro fijo (w-full sobre el contenedor), sin forzarle
                alto/ancho en px que lo distorsionen. El data-URL (img src) no anduvo:
                el valor no es un SVG que el navegador acepte como fuente de imagen. */}
            {qrCode && (
              <div
                className="bg-white rounded-xl p-4 mx-auto w-56 [&>svg]:block [&>svg]:w-full [&>svg]:h-auto"
                dangerouslySetInnerHTML={{ __html: qrCode }}
              />
            )}
          </div>

          <div>
            <p className="text-white text-sm font-semibold mb-1">2. ¿No podés escanear? Ingresalo a mano</p>
            <p className="text-gray-500 text-xs mb-2">
              En tu app elegí “Ingresar clave” (o “Enter setup key”) y pegá este código.
              <strong className="text-gray-400"> Guardalo también como respaldo</strong>: si perdés el celular,
              lo pegás en una app nueva y recuperás el acceso.
            </p>
            <div className="flex items-center gap-2 bg-gray-800 border border-white/10 rounded-xl px-3 py-2.5">
              <KeyRound className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <code className="text-xs text-gray-300 font-mono break-all flex-1">{secret}</code>
              <button onClick={copySecret} className="text-gray-400 hover:text-white flex-shrink-0" title="Copiar">
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <p className="text-white text-sm font-semibold mb-2">3. Ingresá el código de 6 dígitos que muestra la app</p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
              placeholder="000000"
              className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.4em] font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={cancelEnroll}
              disabled={busy}
              className="py-2.5 px-4 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-sm font-semibold transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmEnroll}
              disabled={busy || code.length !== 6}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Activar
            </button>
          </div>
        </div>
      )}

      {/* ON → desactivar */}
      {view === "on" && (
        <div className="space-y-4">
          <div className="bg-gray-800/40 border border-white/5 rounded-xl p-4">
            <p className="text-gray-400 text-xs leading-relaxed">
              <strong className="text-gray-300">¿Perdiste el acceso a tu app?</strong> Pegá el código de respaldo
              que guardaste en una app nueva. Si tampoco lo tenés, se puede reiniciar el 2FA desde el panel de
              Supabase (Authentication → Users → tu cuenta → quitar el factor).
            </p>
          </div>
          <button
            onClick={disable2fa}
            disabled={busy}
            className="w-full py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
            Desactivar 2FA
          </button>
        </div>
      )}
    </div>
  );
}
