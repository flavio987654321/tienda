"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Fingerprint, Loader2, Mail, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { pedir, verificarConHuella, hayLlavesDeAcceso } from "@/lib/seguridad-cliente";

/**
 * "Verificá que sos vos" antes de algo delicado: cambiar el CBU, cambiar o
 * desconectar Mercado Pago, quitar un método, generar códigos nuevos. Ver
 * `lib/identidad-reciente`, que es el lado del servidor.
 *
 *   const { verificar, ventana } = useVerificarIdentidad();
 *   const r = await verificar({ motivo: "cobro" });
 *   if (!r) return;                       // la cerró
 *   fetch(url, { headers: r.token ? { "x-otp-token": r.token } : {} })
 *
 * Con doble paso: la huella o el código de la app (el mail no alcanza: es lo que
 * tiene quien se lo robó). Sin doble paso: un código por mail, que deja un token
 * de un solo uso.
 */

type Motivo = "cobro" | "seguridad" | "banco";
type Resultado = { token?: string } | null;
type Metodos = { huellas: { id: string; nombre: string | null }[]; appId: string | null };

export function useVerificarIdentidad() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [abierta, setAbierta] = useState(false);
  const [motivo, setMotivo] = useState<Motivo>("cobro");
  const [metodos, setMetodos] = useState<Metodos | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mailEnviado, setMailEnviado] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const resolver = useRef<((r: Resultado) => void) | null>(null);
  const enCurso = useRef(false);

  const terminar = useCallback((r: Resultado) => {
    resolver.current?.(r);
    resolver.current = null;
    setAbierta(false);
    setCodigo(""); setError(""); setMailEnviado(false); setMetodos(null);
  }, []);

  const verificar = useCallback(async (opciones: { motivo?: Motivo; soloMail?: boolean } = {}): Promise<Resultado> => {
    // Si ya había una abierta, la anterior se da por cancelada.
    resolver.current?.(null);
    setMotivo(opciones.motivo ?? "cobro");
    setAbierta(true); setError(""); setCodigo(""); setMailEnviado(false);
    setCargando(true);
    if (opciones.soloMail) {
      setMetodos({ huellas: [], appId: null });
    } else {
      try {
        const { data } = await supabase.auth.mfa.listFactors();
        const verificados = (data?.all ?? []).filter((f) => f.status === "verified");
        setMetodos({
          huellas: verificados.filter((f) => f.factor_type === "webauthn").map((f) => ({ id: f.id, nombre: f.friendly_name ?? null })),
          appId: verificados.find((f) => f.factor_type === "totp")?.id ?? null,
        });
      } catch {
        setError("No pudimos conectar. Revisá tu internet y probá de nuevo.");
        setMetodos({ huellas: [], appId: null });
      }
    }
    setCargando(false);
    return new Promise<Resultado>((resolve) => { resolver.current = resolve; });
  }, [supabase]);

  const conDosPasos = !!metodos && (metodos.huellas.length > 0 || !!metodos.appId);

  async function huella(id: string) {
    if (enCurso.current) return;
    enCurso.current = true; setOcupado(true); setError("");
    const r = await verificarConHuella(supabase, id);
    enCurso.current = false; setOcupado(false);
    if (r.ok) terminar({}); else setError(r.error);
  }

  async function app() {
    if (enCurso.current || codigo.length !== 6) return;
    enCurso.current = true; setOcupado(true); setError("");
    const r = await pedir("/api/seguridad/verificar", { method: "POST", body: JSON.stringify({ code: codigo }) });
    enCurso.current = false; setOcupado(false);
    if (r.ok) terminar({}); else { setError(r.error); setCodigo(""); }
  }

  async function mandarMail() {
    if (enCurso.current) return;
    enCurso.current = true; setOcupado(true); setError("");
    const r = await pedir(`/api/vendedoras/wallet/otp?motivo=${motivo}`, { method: "POST" });
    enCurso.current = false; setOcupado(false);
    if (r.ok) setMailEnviado(true); else setError(r.error);
  }

  async function confirmarMail() {
    if (enCurso.current || codigo.length !== 6) return;
    enCurso.current = true; setOcupado(true); setError("");
    const r = await pedir<{ token: string }>("/api/vendedoras/wallet/otp", { method: "PUT", body: JSON.stringify({ code: codigo }) });
    enCurso.current = false; setOcupado(false);
    if (r.ok) terminar({ token: r.data.token }); else { setError(r.error); setCodigo(""); }
  }

  const input = "min-w-0 flex-1 rounded-2xl border border-gray-300 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-950 text-gray-900 panel-oscuro:text-gray-100 px-4 py-3 text-center font-mono text-xl tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-gray-900";
  const primario = "flex items-center justify-center gap-2 rounded-2xl bg-gray-950 panel-oscuro:bg-white text-white panel-oscuro:text-gray-950 px-5 py-3 text-sm font-bold hover:opacity-90 disabled:opacity-40";

  const ventana = abierta ? (
    <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="verificar-titulo">
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-white panel-oscuro:bg-gray-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 id="verificar-titulo" className="text-lg font-black text-gray-950 panel-oscuro:text-gray-100">Verificá que sos vos</h2>
          <button type="button" onClick={() => terminar(null)} aria-label="Cerrar" className="text-gray-400 hover:text-gray-700"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-1 text-sm text-gray-600 panel-oscuro:text-gray-400">
          {motivo === "seguridad" ? "Para cambiar la seguridad de tu cuenta." : "Para cambiar tus datos de cobro."}
        </p>

        {error && <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {cargando ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : conDosPasos ? (
          <div className="mt-5 space-y-4">
            {metodos!.huellas.length > 0 && hayLlavesDeAcceso() && (
              <div className="space-y-2">
                {metodos!.huellas.map((h, i) => (
                  <button key={h.id} type="button" onClick={() => huella(h.id)} disabled={ocupado} className={`${primario} w-full ${i > 0 ? "!bg-transparent !text-gray-700 panel-oscuro:!text-gray-300 border border-gray-300 panel-oscuro:border-gray-700" : ""}`}>
                    {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-5 w-5" />}
                    {i === 0 ? "Usar huella o cara" : (h.nombre ?? "Otra huella")}
                  </button>
                ))}
              </div>
            )}
            {metodos!.appId && (
              <div>
                <p className="text-sm font-semibold text-gray-800 panel-oscuro:text-gray-200 mb-1.5">Código de la app</p>
                <div className="flex gap-2">
                  <input inputMode="numeric" autoComplete="one-time-code" value={codigo} placeholder="000000"
                    onChange={(e) => { setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter") app(); }} className={input} />
                  <button type="button" onClick={app} disabled={ocupado || codigo.length !== 6} className={primario}>
                    {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : "Listo"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : !mailEnviado ? (
          <div className="mt-5">
            <p className="text-sm text-gray-700 panel-oscuro:text-gray-300 leading-relaxed">Te mandamos un código de 6 números a tu mail.</p>
            <button type="button" onClick={mandarMail} disabled={ocupado} className={`${primario} w-full mt-4`}>
              {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Mandarme el código
            </button>
          </div>
        ) : (
          <div className="mt-5">
            <p className="text-sm text-gray-700 panel-oscuro:text-gray-300 mb-2">Escribí el código que te llegó (vence en 10 minutos).</p>
            <div className="flex gap-2">
              <input inputMode="numeric" autoComplete="one-time-code" value={codigo} placeholder="000000" autoFocus
                onChange={(e) => { setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") confirmarMail(); }} className={input} />
              <button type="button" onClick={confirmarMail} disabled={ocupado || codigo.length !== 6} className={primario}>
                {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : "Listo"}
              </button>
            </div>
            <button type="button" onClick={mandarMail} disabled={ocupado} className="mt-3 text-xs font-semibold text-gray-500 hover:text-gray-800">No me llegó, mandarlo de nuevo</button>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return { verificar, ventana };
}
