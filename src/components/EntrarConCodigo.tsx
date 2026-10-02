"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTurnstile } from "@/components/Turnstile";
import { ESPERA_REENVIO_S } from "@/lib/codigo-ingreso";

/**
 * Entrar con un código por mail, en dos pasos: el mail, y el código que llega.
 * Ver `lib/codigo-ingreso`.
 *
 * Lo usan el login de la web y el de la app instalada (`PanelLogin`). En la app
 * del iPhone es LA forma de entrar para quien se registró con Google: Google no
 * puede devolver la sesión a la app, el código sí, porque no sale nunca de ella.
 *
 * Todo pedido tiene techo de tiempo y todo botón tiene su candado: sin red no
 * queda girando, y dos toques no mandan dos mails.
 */
export function EntrarConCodigo({
  emailInicial = "",
  alEntrar,
  onVolver,
}: {
  emailInicial?: string;
  alEntrar: () => void;
  onVolver: () => void;
}) {
  const captcha = useTurnstile("codigo");
  const [paso, setPaso] = useState<"mail" | "codigo">("mail");
  const [email, setEmail] = useState(emailInicial);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [faltan, setFaltan] = useState(0);
  const enVuelo = useRef(false);

  // La cuenta regresiva del "mandarme otro". Arranca al mandar, desde el handler.
  useEffect(() => {
    if (faltan <= 0) return;
    const t = setTimeout(() => setFaltan((f) => f - 1), 1000);
    return () => clearTimeout(t);
  }, [faltan]);

  async function pedir() {
    if (enVuelo.current) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Ingresá un email válido.");
      return;
    }
    enVuelo.current = true;
    setCargando(true);
    setError("");
    try {
      const r = await fetch("/api/auth/codigo/pedir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), turnstileToken: captcha.token }),
        signal: AbortSignal.timeout(20_000),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error ?? "No pudimos mandarte el código. Probá de nuevo.");
        return;
      }
      setPaso("codigo");
      setCodigo("");
      setBloqueado(false);
      setFaltan(ESPERA_REENVIO_S);
    } catch {
      setError("Se cortó la conexión. Revisá tu internet y probá de nuevo.");
    } finally {
      captcha.reset();
      enVuelo.current = false;
      setCargando(false);
    }
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (enVuelo.current || bloqueado) return;
    const limpio = codigo.replace(/\s+/g, "");
    if (!/^\d{6,10}$/.test(limpio)) {
      setError("El código son 6 números.");
      return;
    }
    enVuelo.current = true;
    setCargando(true);
    setError("");
    try {
      const r = await fetch("/api/auth/codigo/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), codigo: limpio }),
        signal: AbortSignal.timeout(20_000),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        // El candado queda puesto: se está yendo y no hay nada que reintentar.
        alEntrar();
        return;
      }
      if (d.bloqueado) setBloqueado(true);
      const aviso = typeof d.restantes === "number" && d.restantes > 0 && d.restantes <= 2
        ? ` Te quedan ${d.restantes} ${d.restantes === 1 ? "intento" : "intentos"}.`
        : "";
      setError((d.error ?? "No pudimos verificar el código.") + aviso);
      setCodigo("");
    } catch {
      setError("Se cortó la conexión. Revisá tu internet y probá de nuevo.");
    }
    enVuelo.current = false;
    setCargando(false);
  }

  const estiloInput =
    "w-full bg-white border border-gray-300 rounded-2xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm transition-all hover:border-gray-400";
  const estiloBoton =
    "w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2";

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3.5 rounded-2xl text-sm">{error}</div>
      )}

      {paso === "mail" ? (
        <form
          onSubmit={(e) => { e.preventDefault(); void pedir(); }}
          className="space-y-5"
        >
          <p className="text-sm text-gray-600">
            Te mandamos un código de 6 números a tu mail. Sirve también si te registraste con Google: usá tu Gmail.
          </p>
          <div>
            <label htmlFor="codigo-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              id="codigo-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              autoComplete="email"
              placeholder="tu@email.com"
              maxLength={254}
              className={estiloInput}
            />
          </div>
          {captcha.widget}
          <button type="submit" disabled={cargando || !captcha.ready} className={estiloBoton}>
            {(cargando || !captcha.ready) && <Loader2 className="h-4 w-4 animate-spin" />}
            {cargando ? "Enviando..." : !captcha.ready ? "Verificando..." : "Mandarme el código"}
          </button>
        </form>
      ) : (
        <form onSubmit={entrar} className="space-y-5">
          <p className="text-sm text-gray-600">
            Si <strong className="text-gray-900 break-all">{email.trim()}</strong> tiene cuenta, te llegó un código.
            Mirá también en spam.
          </p>
          <div>
            <label htmlFor="codigo-numero" className="block text-sm font-medium text-gray-700 mb-1.5">Código</label>
            <input
              id="codigo-numero"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={codigo}
              onChange={(e) => { setCodigo(e.target.value.replace(/[^\d]/g, "").slice(0, 10)); setError(""); }}
              placeholder="123456"
              disabled={bloqueado}
              className={`${estiloInput} text-center text-2xl tracking-[0.4em] font-bold`}
            />
          </div>
          <button type="submit" disabled={cargando || bloqueado || codigo.length < 6} className={estiloBoton}>
            {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
            {cargando ? "Entrando..." : "Entrar"}
          </button>
          <div className="text-center">
            {faltan > 0 ? (
              <p className="text-xs text-gray-500">Podés pedir otro en {faltan} s</p>
            ) : (
              <button
                type="button"
                onClick={() => { setPaso("mail"); setError(""); setBloqueado(false); }}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700"
              >
                No me llegó / mandarme otro
              </button>
            )}
          </div>
        </form>
      )}

      <button
        type="button"
        onClick={onVolver}
        className="w-full text-center text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        ← Entrar con contraseña
      </button>
    </div>
  );
}
