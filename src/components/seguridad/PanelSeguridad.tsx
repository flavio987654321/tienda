"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Fingerprint, Smartphone, KeyRound, MonitorSmartphone, History, ShieldCheck, ShieldAlert,
  Loader2, Copy, Check, Download, Trash2, AlertTriangle,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { pedir, registrarHuella, hayLlavesDeAcceso, limpiarSinVerificar, MENSAJE_SIN_CONEXION } from "@/lib/seguridad-cliente";
import { nivelDeSeguridad, CANTIDAD_CODIGOS, HUELLA_LISTA } from "@/lib/seguridad-cuenta-reglas";
import { useVerificarIdentidad } from "./VerificarIdentidad";

/**
 * La pestaña Seguridad de los tres paneles (tiendas, digitales, afiliados). La
 * misma pieza en los tres, con el color de cada uno. Ver `lib/seguridad-cuenta`.
 */

type Factor = { id: string; tipo: "huella" | "app"; nombre: string | null; creadoAt: string };
type Estado = {
  factores: Factor[];
  codigosLibres: number;
  recuperacion: { id: string; estado: string; creadoAt: string; venceAt: string | null } | null;
  dineroTrabadoHasta: string | null;
  tieneContrasena: boolean;
  eventos: { id: string; texto: string; alerta: boolean; creadoAt: string; dispositivo: string | null }[];
  sesiones: { id: string; dispositivo: string; desde: string; ultimaVez: string; actual: boolean }[];
};

const ACENTOS = {
  naranja: { barra: "bg-orange-500", icono: "text-orange-600", fondoIcono: "bg-orange-100 panel-oscuro:bg-orange-500/15" },
  indigo: { barra: "bg-indigo-500", icono: "text-indigo-600", fondoIcono: "bg-indigo-100 panel-oscuro:bg-indigo-500/15" },
} as const;

function fecha(iso: string, conHora = true): string {
  return new Date(iso).toLocaleString("es-AR", conHora
    ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
    : { weekday: "long", day: "numeric", month: "long" });
}

export default function PanelSeguridad({ acento = "naranja" }: { acento?: keyof typeof ACENTOS }) {
  const a = ACENTOS[acento];
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { verificar, ventana } = useVerificarIdentidad();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [ocupado, setOcupado] = useState("");
  const [codigosNuevos, setCodigosNuevos] = useState<string[] | null>(null);
  const [puedeHuella, setPuedeHuella] = useState(true);
  // Activación de la app en curso.
  const [app, setApp] = useState<{ factorId: string; qr: string; secreto: string; token?: string } | null>(null);
  const [codigoApp, setCodigoApp] = useState("");
  const enCurso = useRef(false);

  const cargar = useCallback(async () => {
    const r = await pedir<Estado>("/api/seguridad");
    if (r.ok) { setEstado(r.data); setErrorCarga(""); } else setErrorCarga(r.error);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde el servidor y detección de la huella, que sólo existe en el navegador
    setPuedeHuella(hayLlavesDeAcceso());
    cargar();
  }, [cargar]);

  /** Un paso a la vez en toda la pestaña: dos clics no pueden activar dos cosas. */
  async function paso(nombre: string, fn: () => Promise<void>) {
    if (enCurso.current) return;
    enCurso.current = true;
    setOcupado(nombre); setError(""); setOk("");
    try { await fn(); } catch { setError(MENSAJE_SIN_CONEXION); } finally {
      enCurso.current = false;
      setOcupado("");
    }
  }

  const huellas = estado?.factores.filter((f) => f.tipo === "huella") ?? [];
  const appActiva = estado?.factores.find((f) => f.tipo === "app") ?? null;
  const tieneAlguno = (estado?.factores.length ?? 0) > 0;
  const nivel = nivelDeSeguridad({ huellas: huellas.length, apps: appActiva ? 1 : 0, codigosLibres: estado?.codigosLibres ?? 0 });

  /** El primer método pide antes el código por mail (ver `api/seguridad/activado`). */
  async function tokenSiEsElPrimero(): Promise<string | undefined | false> {
    if (tieneAlguno) return undefined;
    const v = await verificar({ motivo: "seguridad", soloMail: true });
    return v?.token ?? false;
  }

  async function avisarActivado(factorId: string, token?: string) {
    const r = await pedir<{ codigos: string[] | null }>("/api/seguridad/activado", {
      method: "POST",
      headers: token ? { "x-otp-token": token } : {},
      body: JSON.stringify({ factorId }),
    });
    if (!r.ok) { setError(r.error); await cargar(); return false; }
    if (r.data.codigos) setCodigosNuevos(r.data.codigos);
    return true;
  }

  const activarHuella = () => paso("huella", async () => {
    const token = await tokenSiEsElPrimero();
    if (token === false) return;
    const r = await registrarHuella(supabase);
    if (!r.ok) { setError(r.error); return; }
    if (await avisarActivado(r.factorId, token)) setOk("Listo: la huella o la cara de este dispositivo quedó guardada.");
    await cargar();
  });

  const empezarApp = () => paso("app", async () => {
    const token = await tokenSiEsElPrimero();
    if (token === false) return;
    await limpiarSinVerificar(supabase);
    const { data, error: e } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `App de códigos ${Date.now() % 100000}` });
    if (e || !data) { setError("No se pudo empezar. Probá de nuevo."); return; }
    setApp({ factorId: data.id, qr: data.totp.qr_code, secreto: data.totp.secret, token: token || undefined });
    setCodigoApp("");
  });

  const confirmarApp = () => paso("app-confirmar", async () => {
    if (!app || codigoApp.length !== 6) return;
    const { data: d, error: e1 } = await supabase.auth.mfa.challenge({ factorId: app.factorId });
    if (e1 || !d) { setError("No se pudo verificar. Probá de nuevo."); return; }
    const { error: e2 } = await supabase.auth.mfa.verify({ factorId: app.factorId, challengeId: d.id, code: codigoApp });
    if (e2) { setError("El código no coincide. Fijate que sea el que muestra ahora la app."); setCodigoApp(""); return; }
    const factorId = app.factorId;
    const token = app.token;
    setApp(null);
    if (await avisarActivado(factorId, token)) setOk("Listo: la app de códigos quedó activada.");
    await cargar();
  });

  const cancelarApp = () => paso("app-cancelar", async () => {
    setApp(null);
    await limpiarSinVerificar(supabase);
  });

  const quitar = (f: Factor) => paso(`quitar-${f.id}`, async () => {
    const esElUltimo = (estado?.factores.length ?? 0) === 1;
    if (esElUltimo && !window.confirm("Es tu único método: la verificación en dos pasos queda apagada y tus códigos de respaldo dejan de servir. ¿Seguro?")) return;
    const v = await verificar({ motivo: "seguridad" });
    if (!v) return;
    const r = await pedir("/api/seguridad/factor", { method: "DELETE", body: JSON.stringify({ factorId: f.id }) });
    if (!r.ok) setError(r.error); else setOk(esElUltimo ? "La verificación en dos pasos quedó apagada." : "Listo: se quitó.");
    await cargar();
  });

  const codigosOtraVez = () => paso("codigos", async () => {
    const v = await verificar({ motivo: "seguridad" });
    if (!v) return;
    const r = await pedir<{ codigos: string[] }>("/api/seguridad/codigos", { method: "POST" });
    if (!r.ok) { setError(r.error); return; }
    setCodigosNuevos(r.data.codigos);
    await cargar();
  });

  const cerrarOtras = () => paso("sesiones", async () => {
    const r = await pedir("/api/seguridad/sesiones", { method: "POST" });
    if (!r.ok) setError(r.error); else setOk("Listo: cerramos tu cuenta en los otros dispositivos.");
    await cargar();
  });

  const cancelarRecuperacion = () => paso("recuperacion", async () => {
    const r = await pedir("/api/seguridad/recuperacion", { method: "DELETE" });
    if (!r.ok) setError(r.error); else setOk("Cancelado. Te conviene cambiar tu contraseña.");
    await cargar();
  });

  const tarjeta = "rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 sm:p-6 shadow-sm";
  const bajada = "text-sm text-gray-500 panel-oscuro:text-gray-400 mt-0.5 leading-relaxed";
  const botonPrimario = "inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 panel-oscuro:bg-white text-white panel-oscuro:text-gray-950 px-4 py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-40";
  const botonSecundario = "inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-700 panel-oscuro:text-gray-200 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 disabled:opacity-40";

  if (!estado) {
    return (
      <div className={tarjeta}>
        {errorCarga ? (
          <div className="text-sm text-gray-700 panel-oscuro:text-gray-300">
            {errorCarga}{" "}
            <button type="button" onClick={cargar} className="font-bold underline">Reintentar</button>
          </div>
        ) : (
          <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {ventana}

      {/* Nivel */}
      <div className={tarjeta}>
        <div className="flex items-center gap-3">
          {nivel.nivel === "basico" ? <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0" /> : <ShieldCheck className={`h-6 w-6 shrink-0 ${a.icono}`} />}
          <p className="font-bold text-gray-900 panel-oscuro:text-gray-100">{nivel.texto}</p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-1.5 rounded-full ${i <= ["basico", "bueno", "alto"].indexOf(nivel.nivel) ? (nivel.nivel === "basico" ? "bg-amber-500" : a.barra) : "bg-gray-200 panel-oscuro:bg-gray-800"}`} />
          ))}
        </div>
        {!tieneAlguno && (
          <p className={`${bajada} mt-3`}>
            Con la verificación en dos pasos, para entrar a tu cuenta hace falta además {HUELLA_LISTA ? "tu huella, tu cara o " : ""}un código de una app de tu celular.
            Así, aunque alguien consiga tu contraseña o entre a tu mail, no puede entrar ni cambiar a dónde cobrás.
          </p>
        )}
      </div>

      {estado.recuperacion && (
        <div role="alert" className="rounded-3xl border-2 border-red-300 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-700 shrink-0" />
            <div className="min-w-0">
              <p className="font-black text-red-900">
                {estado.recuperacion.estado === "congelada" ? "Frenamos un pedido para quitar tu verificación" : "Alguien pidió quitar tu verificación en dos pasos"}
              </p>
              <p className="mt-1 text-sm text-red-900/80 leading-relaxed">
                Se pidió desde &quot;Perdí mi celular&quot; el {fecha(estado.recuperacion.creadoAt)}.
                {estado.recuperacion.venceAt && estado.recuperacion.estado === "esperando" && <> Se quitaría el {fecha(estado.recuperacion.venceAt, false)}.</>}
                {" "}Si no fuiste vos, cancelalo y cambiá tu contraseña.
              </p>
              <button type="button" onClick={cancelarRecuperacion} disabled={!!ocupado} className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50">
                {ocupado === "recuperacion" && <Loader2 className="h-4 w-4 animate-spin" />}
                No fui yo: cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {estado.dineroTrabadoHasta && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 leading-relaxed">
          Por seguridad, hasta el {fecha(estado.dineroTrabadoHasta)} no se pueden cambiar los datos de cobro ni pedir retiros. Es porque hace poco se quitó la verificación sin el segundo paso.
        </div>
      )}

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {ok && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{ok}</div>}

      {/* Huella o cara: sólo si ya está habilitada, o si quedó alguna guardada para poder quitarla. */}
      {(HUELLA_LISTA || huellas.length > 0) && (
      <div className={tarjeta}>
        <Cabeza a={a} Icono={Fingerprint} t="Huella o cara" b="Lo más fácil: al entrar, tu celular o tu compu te pide la huella o la cara. No hace falta bajar nada." />
        {huellas.length > 0 && (
          <ul className="mb-4 divide-y divide-gray-100 panel-oscuro:divide-gray-800 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800">
            {huellas.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 panel-oscuro:text-gray-100 truncate">{(h.nombre ?? "Huella").replace(/ · \d+\/\d+ \d+:\d+$/, "")}</p>
                  <p className="text-xs text-gray-500">Desde el {fecha(h.creadoAt)}</p>
                </div>
                <button type="button" onClick={() => quitar(h)} disabled={!!ocupado} aria-label="Quitar" className="shrink-0 rounded-xl p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40">
                  {ocupado === `quitar-${h.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </li>
            ))}
          </ul>
        )}
        {!HUELLA_LISTA ? null : puedeHuella ? (
          <button type="button" onClick={activarHuella} disabled={!!ocupado} className={botonPrimario}>
            {ocupado === "huella" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
            {huellas.length > 0 ? "Agregar este dispositivo" : "Activar con huella o cara"}
          </button>
        ) : (
          <p className="text-sm text-gray-600 panel-oscuro:text-gray-400">Este navegador no permite usar la huella. Probá desde el celular o usá la app de códigos.</p>
        )}
        {huellas.length > 0 && (
          <p className="mt-3 text-xs text-gray-500 leading-relaxed">
            Si usás la cuenta en el celular y en la compu, activala en los dos: si perdés uno, entrás con el otro.
          </p>
        )}
      </div>
      )}

      {/* App de códigos */}
      <div className={tarjeta}>
        <Cabeza a={a} Icono={Smartphone} t="App de códigos" b={`${HUELLA_LISTA ? "Una alternativa: " : ""}Google Authenticator, Microsoft Authenticator o similar (se bajan gratis) te muestran un número de 6 cifras que cambia cada 30 segundos.`} />
        {appActiva && !app && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900 panel-oscuro:text-gray-100">Activada el {fecha(appActiva.creadoAt)}</p>
            <button type="button" onClick={() => quitar(appActiva)} disabled={!!ocupado} aria-label="Quitar" className="shrink-0 rounded-xl p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40">
              {ocupado === `quitar-${appActiva.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        )}
        {!appActiva && !app && (
          <button type="button" onClick={empezarApp} disabled={!!ocupado} className={botonSecundario}>
            {ocupado === "app" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
            Activar con app de códigos
          </button>
        )}
        {app && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-gray-900 panel-oscuro:text-gray-100 mb-2">1. Escaneá este código con la app</p>
              {/* qr_code es un SVG en texto que arma Supabase: va inline, como en el admin. */}
              <div className="bg-white rounded-2xl p-3 w-48 [&>svg]:block [&>svg]:w-full [&>svg]:h-auto border border-gray-200" dangerouslySetInnerHTML={{ __html: app.qr }} />
              <p className="mt-2 text-xs text-gray-500 break-all">¿No podés escanear? Cargá esta clave a mano: <span className="font-mono text-gray-700 panel-oscuro:text-gray-300">{app.secreto}</span></p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 panel-oscuro:text-gray-100 mb-2">2. Escribí el número que muestra</p>
              <input inputMode="numeric" autoComplete="one-time-code" value={codigoApp} placeholder="000000"
                onChange={(e) => { setCodigoApp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") confirmarApp(); }}
                className="w-full rounded-2xl border border-gray-300 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-950 text-gray-900 panel-oscuro:text-gray-100 px-4 py-3 text-center font-mono text-xl tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-gray-900" />
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={cancelarApp} disabled={!!ocupado} className={botonSecundario}>Cancelar</button>
                <button type="button" onClick={confirmarApp} disabled={!!ocupado || codigoApp.length !== 6} className={`${botonPrimario} flex-1`}>
                  {ocupado === "app-confirmar" && <Loader2 className="h-4 w-4 animate-spin" />} Activar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Códigos de respaldo */}
      <div className={tarjeta}>
        <Cabeza a={a} Icono={KeyRound} t="Códigos de respaldo" b="Para entrar si perdés el celular. Cada uno sirve una vez. Guardalos en un papel o en un lugar seguro, no en el mismo celular." />
        {tieneAlguno ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-gray-700 panel-oscuro:text-gray-300">
              Te {estado.codigosLibres === 1 ? "queda" : "quedan"} <strong>{estado.codigosLibres}</strong> de {CANTIDAD_CODIGOS}.
            </p>
            <button type="button" onClick={codigosOtraVez} disabled={!!ocupado} className={botonSecundario}>
              {ocupado === "codigos" && <Loader2 className="h-4 w-4 animate-spin" />}
              Generar códigos nuevos
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-600 panel-oscuro:text-gray-400">Te los damos al activar {HUELLA_LISTA ? "la huella o la app" : "la app de códigos"}.</p>
        )}
      </div>

      {/* Sesiones */}
      <div className={tarjeta}>
        <Cabeza a={a} Icono={MonitorSmartphone} t="Dónde está abierta tu cuenta" b="Si ves un dispositivo que no reconocés, cerrá las demás sesiones y cambiá tu contraseña." />
        <ul className="divide-y divide-gray-100 panel-oscuro:divide-gray-800">
          {estado.sesiones.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 panel-oscuro:text-gray-100">
                  {s.dispositivo}{s.actual && <span className={`ml-2 text-xs font-bold ${a.icono}`}>este</span>}
                </p>
                <p className="text-xs text-gray-500">Última vez: {fecha(s.ultimaVez)}</p>
              </div>
            </li>
          ))}
        </ul>
        {estado.sesiones.filter((s) => !s.actual).length > 0 && (
          <button type="button" onClick={cerrarOtras} disabled={!!ocupado} className={`${botonSecundario} mt-3`}>
            {ocupado === "sesiones" && <Loader2 className="h-4 w-4 animate-spin" />}
            Cerrar las demás sesiones
          </button>
        )}
      </div>

      {/* Actividad */}
      <div className={tarjeta}>
        <Cabeza a={a} Icono={History} t="Actividad de seguridad" b="Lo último que pasó con la seguridad de tu cuenta. Se guarda 90 días." />
        {estado.eventos.length === 0 ? (
          <p className="text-sm text-gray-500">Todavía no hay nada.</p>
        ) : (
          <ul className="space-y-2.5">
            {estado.eventos.map((e) => (
              <li key={e.id} className="text-sm">
                <p className={e.alerta ? "font-semibold text-red-700" : "text-gray-800 panel-oscuro:text-gray-200"}>{e.texto}</p>
                <p className="text-xs text-gray-500">{fecha(e.creadoAt)}{e.dispositivo ? ` · ${e.dispositivo}` : ""}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {codigosNuevos && <VentanaCodigos codigos={codigosNuevos} onCerrar={() => setCodigosNuevos(null)} />}
    </div>
  );
}

/** El encabezado de cada tarjeta. Afuera del componente: adentro se volvería a crear en cada dibujo. */
function Cabeza({ a, Icono, t, b }: { a: (typeof ACENTOS)[keyof typeof ACENTOS]; Icono: React.ElementType; t: string; b: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${a.fondoIcono}`}><Icono className={`h-5 w-5 ${a.icono}`} /></div>
      <div className="min-w-0">
        <h3 className="font-black text-gray-900 panel-oscuro:text-gray-100">{t}</h3>
        <p className="text-sm text-gray-500 panel-oscuro:text-gray-400 mt-0.5 leading-relaxed">{b}</p>
      </div>
    </div>
  );
}

/** Los códigos se muestran UNA vez. No se cierra sin marcar que los guardó. */
function VentanaCodigos({ codigos, onCerrar }: { codigos: string[]; onCerrar: () => void }) {
  const [guardados, setGuardados] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const texto = `Códigos de respaldo de TiendaApps\nCada uno sirve una sola vez.\n\n${codigos.join("\n")}\n`;

  function copiar() {
    navigator.clipboard?.writeText(texto).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000); }).catch(() => {});
  }
  function bajar() {
    const url = URL.createObjectURL(new Blob([texto], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url; link.download = "tiendaapps-codigos-de-respaldo.txt"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="codigos-titulo">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white panel-oscuro:bg-gray-900 p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <h2 id="codigos-titulo" className="text-lg font-black text-gray-950 panel-oscuro:text-gray-100">Guardá tus códigos de respaldo</h2>
        <p className="mt-1 text-sm text-gray-600 panel-oscuro:text-gray-400 leading-relaxed">
          Si perdés el celular, entrás con uno de estos. Es la única vez que los vas a ver.
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-gray-50 panel-oscuro:bg-gray-950 p-4 font-mono text-base text-gray-900 panel-oscuro:text-gray-100">
          {codigos.map((c) => <li key={c} className="text-center tracking-wider">{c}</li>)}
        </ul>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={copiar} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 py-2.5 text-sm font-semibold text-gray-800 panel-oscuro:text-gray-200">
            {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copiado ? "Copiados" : "Copiar"}
          </button>
          <button type="button" onClick={bajar} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 py-2.5 text-sm font-semibold text-gray-800 panel-oscuro:text-gray-200">
            <Download className="h-4 w-4" /> Descargar
          </button>
        </div>
        <label className="mt-4 flex items-start gap-2.5 text-sm text-gray-800 panel-oscuro:text-gray-200">
          <input type="checkbox" checked={guardados} onChange={(e) => setGuardados(e.target.checked)} className="mt-0.5 h-4 w-4" />
          Ya los guardé en un lugar seguro
        </label>
        <button type="button" onClick={onCerrar} disabled={!guardados} className="mt-4 w-full rounded-2xl bg-gray-950 panel-oscuro:bg-white py-3 text-sm font-bold text-white panel-oscuro:text-gray-950 disabled:opacity-40">
          Listo
        </button>
      </div>
    </div>
  );
}
