"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Fingerprint, KeyRound, Loader2, LifeBuoy, ShieldCheck, ArrowLeft } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { useAuth } from "@/components/AuthProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { pedir, verificarConHuella, hayLlavesDeAcceso } from "@/lib/seguridad-cliente";
import { describirDispositivo, DIAS_ESPERA_CON_CONTRASENA, DIAS_ESPERA_SIN_CONTRASENA } from "@/lib/seguridad-cuenta-reglas";

type Huella = { id: string; nombre: string | null };
type Vista = "inicio" | "respaldo" | "perdi" | "pedido";

/** "fl***@gmail.com": se ve de qué cuenta se trata sin mostrarla entera. */
function mailTapado(email: string): string {
  const [u, d] = email.split("@");
  if (!d) return email;
  return `${u.slice(0, 2)}${"*".repeat(Math.max(1, Math.min(6, u.length - 2)))}@${d}`;
}

export default function VerificarCliente({ destino, email, huellas, tieneApp, tieneCodigos }: {
  destino: string;
  email: string;
  huellas: Huella[];
  tieneApp: boolean;
  tieneCodigos: boolean;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { signOut } = useAuth();
  const [vista, setVista] = useState<Vista>("inicio");
  const [codigo, setCodigo] = useState("");
  const [respaldo, setRespaldo] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState<"" | "huella" | "codigo" | "respaldo" | "perdi">("");
  const [bloqueado, setBloqueado] = useState(false);
  const [diasPedido, setDiasPedido] = useState<number | null>(null);
  const enCurso = useRef(false);
  const [puedeHuella, setPuedeHuella] = useState(true);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- sólo existe en el navegador: en el servidor no hay PublicKeyCredential
  useEffect(() => { setPuedeHuella(hayLlavesDeAcceso()); }, []);

  /* La huella de ESTE dispositivo primero: si guardó una en el celular y otra en
     la compu, que el botón grande use la que tiene a mano. Las demás quedan como
     "usar otra", que el navegador resuelve con el QR del celular. */
  const ordenadas = useMemo(() => {
    if (typeof navigator === "undefined") return huellas;
    const aca = describirDispositivo(navigator.userAgent);
    return [...huellas].sort((a, b) => Number((b.nombre ?? "").includes(aca)) - Number((a.nombre ?? "").includes(aca)));
  }, [huellas]);

  async function listo() {
    // Navegación completa: el servidor tiene que leer la cookie nueva (aal2).
    window.location.assign(destino);
  }

  async function conHuella(factorId: string) {
    if (enCurso.current) return;
    enCurso.current = true;
    setOcupado("huella"); setError("");
    try {
      const r = await verificarConHuella(supabase, factorId);
      if (!r.ok) { setError(r.error); return; }
      await pedir("/api/seguridad/verificado", { method: "POST", body: JSON.stringify({ paraEntrar: true }) });
      await listo();
    } finally {
      enCurso.current = false;
      setOcupado("");
    }
  }

  async function conCodigo() {
    if (enCurso.current || codigo.length !== 6) return;
    enCurso.current = true;
    setOcupado("codigo"); setError(""); setAviso("");
    try {
      const r = await pedir("/api/seguridad/verificar", { method: "POST", body: JSON.stringify({ code: codigo }) });
      if (r.ok) { await listo(); return; }
      setError(r.error);
      setCodigo("");
      if (r.data.bloqueado) setBloqueado(true);
      const quedan = r.data.restantes;
      if (typeof quedan === "number" && quedan > 0 && quedan <= 2) {
        setAviso(`Te ${quedan === 1 ? "queda 1 intento" : `quedan ${quedan} intentos`} antes de que se bloquee 15 minutos.`);
      }
    } finally {
      enCurso.current = false;
      setOcupado("");
    }
  }

  async function conRespaldo() {
    if (enCurso.current || respaldo.replace(/[\s-]/g, "").length !== 8) return;
    enCurso.current = true;
    setOcupado("respaldo"); setError(""); setAviso("");
    try {
      const r = await pedir<{ volverAEntrar?: boolean }>("/api/seguridad/respaldo", { method: "POST", body: JSON.stringify({ codigo: respaldo }) });
      if (r.ok) {
        if (r.data.volverAEntrar) { window.location.assign("/login"); return; }
        // A Seguridad: la verificación quedó apagada y hay que volver a activarla.
        window.location.assign("/panel?seguridad=1");
        return;
      }
      setError(r.error);
      if (r.data.bloqueado) setBloqueado(true);
    } finally {
      enCurso.current = false;
      setOcupado("");
    }
  }

  async function perdiElCelular() {
    if (enCurso.current) return;
    enCurso.current = true;
    setOcupado("perdi"); setError("");
    try {
      const r = await pedir<{ dias: number }>("/api/seguridad/recuperacion", { method: "POST" });
      if (r.ok) { setDiasPedido(r.data.dias); setVista("pedido"); return; }
      setError(r.error);
    } finally {
      enCurso.current = false;
      setOcupado("");
    }
  }

  const boton = "w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition-colors disabled:opacity-50";
  const link = "text-sm font-semibold text-gray-600 hover:text-gray-900 underline-offset-4 hover:underline disabled:opacity-50";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <AppLogo size={44} />
          <span className="text-lg font-bold text-gray-950">TiendaApps</span>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          {vista !== "inicio" && vista !== "pedido" && (
            <button type="button" onClick={() => { setVista("inicio"); setError(""); setAviso(""); }} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" /> Volver
            </button>
          )}

          {vista === "inicio" && (
            <>
              <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center mb-4">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-black text-gray-950">Verificá que sos vos</h1>
              <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
                La cuenta <strong className="text-gray-900">{mailTapado(email)}</strong> tiene la verificación en dos pasos.
              </p>
            </>
          )}

          {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {aviso && <p className="mt-3 text-xs font-semibold text-amber-700">{aviso}</p>}

          {vista === "inicio" && (
            <div className="mt-6 space-y-5">
              {ordenadas.length > 0 && puedeHuella && (
                <div className="space-y-2">
                  <button type="button" onClick={() => conHuella(ordenadas[0].id)} disabled={!!ocupado} className={`${boton} bg-gray-950 text-white hover:bg-gray-800`}>
                    {ocupado === "huella" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-5 w-5" />}
                    {ocupado === "huella" ? "Esperando tu huella…" : "Usar huella o cara"}
                  </button>
                  {ordenadas.length > 1 && (
                    <details className="text-sm text-gray-600">
                      <summary className="cursor-pointer font-semibold">Usar otra huella guardada</summary>
                      <ul className="mt-2 space-y-1.5">
                        {ordenadas.slice(1).map((h) => (
                          <li key={h.id}>
                            <button type="button" onClick={() => conHuella(h.id)} disabled={!!ocupado} className="w-full text-left rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50">
                              {h.nombre ?? "Huella guardada"}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
              {ordenadas.length > 0 && !puedeHuella && (
                <p className="text-sm text-gray-600">Este navegador no permite usar la huella. Entrá con otro método o desde otro navegador.</p>
              )}

              {tieneApp && (
                <div>
                  {ordenadas.length > 0 && <div className="flex items-center gap-3 mb-4"><div className="h-px flex-1 bg-gray-200" /><span className="text-xs text-gray-400">o</span><div className="h-px flex-1 bg-gray-200" /></div>}
                  <label htmlFor="codigo-app" className="block text-sm font-semibold text-gray-800 mb-1.5">Código de la app de códigos</label>
                  <div className="flex gap-2">
                    <input
                      id="codigo-app"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={codigo}
                      disabled={bloqueado}
                      onChange={(e) => { setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter") conCodigo(); }}
                      placeholder="000000"
                      className="min-w-0 flex-1 rounded-2xl border border-gray-300 px-4 py-3 text-center font-mono text-xl tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-40"
                    />
                    <button type="button" onClick={conCodigo} disabled={!!ocupado || bloqueado || codigo.length !== 6} className="shrink-0 rounded-2xl bg-gray-950 px-5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-40">
                      {ocupado === "codigo" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-gray-100 flex flex-col items-start gap-3">
                {tieneCodigos && (
                  <button type="button" onClick={() => { setVista("respaldo"); setError(""); }} className={link}>
                    <KeyRound className="inline h-4 w-4 mr-1.5 -mt-0.5" />Usar un código de respaldo
                  </button>
                )}
                <button type="button" onClick={() => { setVista("perdi"); setError(""); }} className={link}>
                  <LifeBuoy className="inline h-4 w-4 mr-1.5 -mt-0.5" />Perdí mi celular
                </button>
              </div>
            </div>
          )}

          {vista === "respaldo" && (
            <div>
              <h1 className="text-xl font-black text-gray-950">Código de respaldo</h1>
              <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
                Es uno de los 8 códigos que guardaste al activar la verificación, con forma <span className="font-mono">abcd-efgh</span>. Cada uno sirve una sola vez.
              </p>
              <p className="mt-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs leading-relaxed text-amber-900">
                Al entrar así se apaga la verificación en dos pasos: la vas a tener que volver a activar, y por 48 horas no se van a poder cambiar los datos de cobro.
              </p>
              <input
                value={respaldo}
                disabled={bloqueado}
                onChange={(e) => { setRespaldo(e.target.value.slice(0, 12)); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") conRespaldo(); }}
                placeholder="abcd-efgh"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="mt-4 w-full rounded-2xl border border-gray-300 px-4 py-3 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-40"
              />
              <button type="button" onClick={conRespaldo} disabled={!!ocupado || bloqueado || respaldo.replace(/[\s-]/g, "").length !== 8} className={`${boton} mt-3 bg-gray-950 text-white hover:bg-gray-800`}>
                {ocupado === "respaldo" && <Loader2 className="h-4 w-4 animate-spin" />}
                Entrar con el código
              </button>
            </div>
          )}

          {vista === "perdi" && (
            <div>
              <h1 className="text-xl font-black text-gray-950">¿Perdiste tu celular?</h1>
              <ol className="mt-3 space-y-2.5 text-sm text-gray-700 leading-relaxed list-decimal pl-5">
                <li>Te mandamos un mail a <strong>{mailTapado(email)}</strong> para confirmar que fuiste vos.</li>
                <li>
                  Desde que lo confirmás, la verificación en dos pasos se quita a los <strong>{DIAS_ESPERA_CON_CONTRASENA} días</strong> si
                  entraste con tu contraseña, o a los <strong>{DIAS_ESPERA_SIN_CONTRASENA}</strong> si entraste con Google o con un código por mail.
                </li>
                <li>Mientras tanto te avisamos por mail. Si aparece el celular y entrás con él, el pedido se cancela solo.</li>
                <li>Cuando se quite, los datos de cobro quedan trabados 7 días más, por las dudas.</li>
              </ol>
              <p className="mt-4 text-xs text-gray-500 leading-relaxed">
                La espera es lo que te protege si alguien te robó el mail: nadie de TiendaApps puede saltearla ni quitar la verificación a mano.
                ¿Tenés la app de códigos en otro dispositivo, o un código de respaldo? Probá eso primero: es inmediato.
              </p>
              <button type="button" onClick={perdiElCelular} disabled={!!ocupado} className={`${boton} mt-5 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50`}>
                {ocupado === "perdi" && <Loader2 className="h-4 w-4 animate-spin" />}
                Pedir que se quite la verificación
              </button>
            </div>
          )}

          {vista === "pedido" && (
            <div>
              <h1 className="text-xl font-black text-gray-950">Revisá tu mail</h1>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                Te mandamos un mail a <strong>{mailTapado(email)}</strong>. Tocá el botón de confirmar dentro de la próxima hora:
                desde ahí corren los {diasPedido ?? DIAS_ESPERA_CON_CONTRASENA} días. Si no lo ves, mirá en spam.
              </p>
            </div>
          )}

          <div className="mt-8 text-center">
            <button type="button" onClick={() => { if (!ocupado) signOut("/login"); }} disabled={!!ocupado} className="text-xs text-gray-500 hover:text-gray-800">
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
