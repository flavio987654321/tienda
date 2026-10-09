"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Bot, Check, CircleHelp, Clipboard, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

type Evento = {
  id: string;
  createdAt: string;
  kind: string;
  origin: string;
  route: string;
  method: string;
  status: number | null;
  reason: string | null;
  errorName: string | null;
  requestId: string | null;
  ipFingerprint: string | null;
};

type Conteo = { kind: string; origin: string; count: number };
type Repeticion = {
  ipFingerprint: string;
  route: string;
  kind: string;
  origin: string;
  count: number;
  firstAt: string;
  lastAt: string;
};
type ErrorGrave = {
  id: string;
  createdAt: string;
  origin: string;
  route: string;
  method: string;
  status: number | null;
  errorName: string | null;
};
type Respuesta = {
  eventos: Evento[];
  conteos: Conteo[];
  repeticiones: Repeticion[];
  alertas: { erroresGraves: ErrorGrave[]; repeticiones: Repeticion[] };
  error?: string;
};

const ORIGEN: Record<string, { label: string; icon: typeof Bot; tone: string }> = {
  AUTOMATION_SIGNAL: { label: "Señal automatizada", icon: Bot, tone: "text-amber-300 bg-amber-400/10" },
  ANONYMOUS: { label: "Visitante sin sesión", icon: CircleHelp, tone: "text-sky-300 bg-sky-400/10" },
  REGISTERED_USER: { label: "Cuenta autenticada", icon: ShieldCheck, tone: "text-indigo-300 bg-indigo-400/10" },
  UNKNOWN: { label: "Origen no determinado", icon: CircleHelp, tone: "text-gray-300 bg-white/5" },
};

const TIPO: Record<string, string> = {
  SERVER_ERROR: "Error técnico",
  RATE_LIMITED: "Límite excedido",
  CAPTCHA_REJECTED: "CAPTCHA rechazado",
};

const MOTIVO: Record<string, string> = {
  unhandled_request_error: "La aplicación encontró un error al atender una solicitud.",
  registration_rate_limit: "Se alcanzó el límite de intentos de registro.",
  registration_turnstile_rejected: "La verificación CAPTCHA no fue aceptada.",
  confirmation_link_failed: "No se pudo preparar el enlace de confirmación del registro.",
  digital_product_rate_limit: "Una cuenta alcanzó el límite de creación de productos.",
  digital_rate_limit_unavailable: "No respondió el servicio que limita la frecuencia de solicitudes.",
  synthetic_security_test: "Evento ficticio creado para probar el panel.",
};

function interpretacion(kind: string, origin: string) {
  if (kind === "SERVER_ERROR") {
    return {
      significa: "El servidor encontró un fallo al procesar una solicitud.",
      revisar: "Revisá los registros de la aplicación y Sentry alrededor de esta hora; buscá si ocurrió más de una vez.",
      limite: "Por sí solo no indica un ataque: también puede deberse a un error de código o a un servicio externo.",
    };
  }
  const esCaptcha = kind === "CAPTCHA_REJECTED";
  return {
    significa: esCaptcha
      ? "La verificación CAPTCHA no se completó o fue rechazada."
      : "Se hicieron más solicitudes de las permitidas en el período configurado.",
    revisar: "Compará hora, ruta y cantidad. Si se repite, comprobá también si usuarios legítimos tuvieron problemas.",
    limite: origin === "AUTOMATION_SIGNAL"
      ? "Es una señal que puede asociarse a automatización, pero no confirma que sea un bot ni un intento de hackeo."
      : "Puede deberse a reintentos o a varias personas detrás de una misma conexión; no confirma un ataque.",
  };
}

function rutaCompartible(route: string) {
  const permitidas = ["/api/auth/registro", "/api/digitales/productos"];
  return permitidas.includes(route) ? route : "omitida para proteger datos de la ruta";
}

function resumenParaCompartir({
  kind,
  origin,
  route,
  method,
  status,
  errorName,
  reason,
  createdAt,
  count,
}: {
  kind: string;
  origin: string;
  route: string;
  method?: string;
  status?: number | null;
  errorName?: string | null;
  reason?: string | null;
  createdAt: string;
  count?: number;
}) {
  const lectura = interpretacion(kind, origin);
  return [
    "Necesito ayuda para investigar esta alerta técnica de TiendaApps.",
    `Tipo: ${TIPO[kind] ?? "Evento de seguridad"}.`,
    `Origen registrado: ${ORIGEN[origin]?.label ?? ORIGEN.UNKNOWN.label}.`,
    `Qué significa: ${lectura.significa}`,
    `Qué revisar: ${lectura.revisar}`,
    `Límite de la evidencia: ${lectura.limite}`,
    `Ruta: ${rutaCompartible(route)}.`,
    ...(method ? [`Método: ${method}.`] : []),
    ...(status !== undefined && status !== null ? [`Código HTTP: ${status}.`] : []),
    ...(errorName ? [`Tipo de error: ${errorName}.`] : []),
    ...(reason && MOTIVO[reason] ? [`Detalle: ${MOTIVO[reason]}`] : []),
    ...(count !== undefined ? [`Cantidad agrupada: ${count}.`] : []),
    `Fecha y hora: ${new Date(createdAt).toISOString()}.`,
    "No incluyo huellas, identificadores de solicitud, credenciales ni datos personales.",
    "Explicá causas probables, cómo confirmarlas con registros seguros y una solución de bajo riesgo. No concluyas que hubo un ataque sin evidencia.",
  ].join("\n");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function EventosSeguridad() {
  const [data, setData] = useState<Respuesta | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copiedAlert, setCopiedAlert] = useState("");
  const [copyError, setCopyError] = useState("");

  const copiarResumen = async (id: string, resumen: string) => {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(resumen);
      setCopiedAlert(id);
      window.setTimeout(() => setCopiedAlert((actual) => actual === id ? "" : actual), 2500);
    } catch {
      setCopiedAlert("");
      setCopyError("No se pudo copiar automáticamente. Probá desde localhost o verificá los permisos del navegador.");
    }
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/seguridad/eventos", { cache: "no-store" });
      const result = await response.json() as Respuesta;
      if (!response.ok) throw new Error(result.error || "No se pudieron cargar los eventos.");
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los eventos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void cargar(), 0);
    const interval = window.setInterval(() => void cargar(), 60_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [cargar]);

  const cantidad = (predicate: (item: Conteo) => boolean) =>
    data?.conteos.reduce((total, item) => total + (predicate(item) ? item.count : 0), 0) ?? 0;
  const cantidadAlertas = (data?.alertas.erroresGraves.length ?? 0)
    + (data?.alertas.repeticiones.length ?? 0);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Errores y actividad sospechosa</h2>
          <p className="text-gray-400 text-sm mt-1">
            Eventos de los últimos 30 días. Se guardan hasta 100 en esta vista.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void cargar()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {[
          { label: "Errores técnicos", count: cantidad((item) => item.kind === "SERVER_ERROR"), icon: AlertTriangle, color: "text-red-300" },
          { label: "Señales automatizadas", count: cantidad((item) => item.origin === "AUTOMATION_SIGNAL"), icon: Bot, color: "text-amber-300" },
          { label: "Eventos de cuentas", count: cantidad((item) => item.origin === "REGISTERED_USER"), icon: ShieldCheck, color: "text-indigo-300" },
        ].map(({ label, count, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-white/5 bg-gray-900/70 p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <Icon className={`h-4 w-4 ${color}`} />
              {label}
            </div>
            <p className={`mt-2 text-2xl font-bold ${color}`}>{count}</p>
          </div>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-gray-500 mb-4">
        “Señal automatizada” solo significa CAPTCHA rechazado o límite excedido; no confirma que sea un bot.
        Los errores generales quedan como origen no determinado. Los errores del navegador siguen en Sentry.
      </p>

      {data && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-6 rounded-xl border p-4 ${
            cantidadAlertas > 0
              ? "border-amber-400/30 bg-amber-400/5"
              : "border-white/5 bg-gray-900/50"
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${cantidadAlertas > 0 ? "text-amber-300" : "text-gray-500"}`} />
            <h3 className="text-sm font-semibold text-white">Alertas activas</h3>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-300">{cantidadAlertas}</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Se actualizan automáticamente cada minuto. Las alertas muestran actividad de los últimos 5 minutos.
          </p>
          {cantidadAlertas === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No hay alertas activas.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.alertas.erroresGraves.map((evento) => (
                <li key={evento.id} className="rounded-lg bg-red-400/5 px-3 py-2 text-sm text-red-200">
                  {(() => {
                    const lectura = interpretacion("SERVER_ERROR", evento.origin);
                    const resumen = resumenParaCompartir({
                      kind: "SERVER_ERROR",
                      origin: evento.origin,
                      route: evento.route,
                      method: evento.method,
                      status: evento.status,
                      errorName: evento.errorName,
                      createdAt: evento.createdAt,
                    });
                    return (
                      <>
                        <p className="font-medium">{lectura.significa}</p>
                        <p className="mt-1 text-xs text-red-100/80">
                          HTTP {evento.status ?? "5xx"} · {evento.method} <code>{evento.route}</code>
                          {evento.errorName && ` · ${evento.errorName}`} · {formatDate(evento.createdAt)}
                        </p>
                        <p className="mt-2 text-xs text-red-100/70">Qué revisar: {lectura.revisar}</p>
                        <p className="mt-1 text-xs text-red-100/70">{lectura.limite}</p>
                        <button
                          type="button"
                          onClick={() => void copiarResumen(evento.id, resumen)}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-gray-200 hover:bg-white/5"
                        >
                          {copiedAlert === evento.id ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
                          {copiedAlert === evento.id ? "Copiado" : "Copiar resumen seguro"}
                        </button>
                      </>
                    );
                  })()}
                </li>
              ))}
              {data.alertas.repeticiones.map((repeticion) => {
                const origen = ORIGEN[repeticion.origin] ?? ORIGEN.UNKNOWN;
                const lectura = interpretacion(repeticion.kind, repeticion.origin);
                const resumen = resumenParaCompartir({
                  kind: repeticion.kind,
                  origin: repeticion.origin,
                  route: repeticion.route,
                  createdAt: repeticion.lastAt,
                  count: repeticion.count,
                });
                const id = `${repeticion.ipFingerprint}:${repeticion.route}:${repeticion.kind}`;
                return (
                  <li
                    key={id}
                    className="rounded-lg bg-amber-400/5 px-3 py-2 text-sm text-amber-100"
                  >
                    <p className="font-medium">{repeticion.count} eventos similares agrupados · {TIPO[repeticion.kind] ?? repeticion.kind}</p>
                    <p className="mt-1 text-xs text-amber-100/80">
                      Ruta <code>{repeticion.route}</code> · {origen.label} · {formatDate(repeticion.firstAt)} a {formatDate(repeticion.lastAt)}
                    </p>
                    <p className="mt-2 text-xs text-amber-100/70">Qué significa: {lectura.significa}</p>
                    <p className="mt-1 text-xs text-amber-100/70">Qué revisar: {lectura.revisar}</p>
                    <p className="mt-1 text-xs text-amber-100/70">{lectura.limite}</p>
                    <button
                      type="button"
                      onClick={() => void copiarResumen(id, resumen)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-gray-200 hover:bg-white/5"
                    >
                      {copiedAlert === id ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
                      {copiedAlert === id ? "Copiado" : "Copiar resumen seguro"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {copyError && <p role="alert" className="mt-2 text-xs text-red-300">{copyError}</p>}
          <p className="mt-3 text-xs text-gray-500">
            Un error 5xx indica un fallo del servidor. Los eventos repetidos son una señal para revisar, no una confirmación de bot.
          </p>
        </div>
      )}

      <div className="mb-6 overflow-x-auto rounded-xl border border-white/5">
        <div className="border-b border-white/5 bg-gray-900 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Eventos repetidos por huella</h3>
          <p className="mt-1 text-xs text-gray-500">
            Agrupa la misma huella, ruta y tipo. Una repetición ayuda a investigar; no confirma que sea un bot.
          </p>
        </div>
        {data?.repeticiones.length ? (
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-gray-900/60 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Huella</th>
                <th className="px-4 py-3 font-medium">Eventos</th>
                <th className="px-4 py-3 font-medium">Tipo / origen</th>
                <th className="px-4 py-3 font-medium">Ruta</th>
                <th className="px-4 py-3 font-medium">Período</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-gray-950/40">
              {data.repeticiones.map((repeticion) => {
                const origen = ORIGEN[repeticion.origin] ?? ORIGEN.UNKNOWN;
                return (
                  <tr key={`${repeticion.ipFingerprint}:${repeticion.route}:${repeticion.kind}`} className="align-top text-gray-300">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">…{repeticion.ipFingerprint.slice(-8)}</td>
                    <td className="px-4 py-3 font-semibold text-white">{repeticion.count}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{TIPO[repeticion.kind] ?? repeticion.kind}</p>
                      <p className="mt-1 text-xs text-gray-400">{origen.label}</p>
                    </td>
                    <td className="px-4 py-3"><code className="text-xs">{repeticion.route}</code></td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      <p>{formatDate(repeticion.firstAt)}</p>
                      <p className="mt-1">hasta {formatDate(repeticion.lastAt)}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="bg-gray-950/40 px-4 py-4 text-sm text-gray-500">
            No hay eventos repetidos con huella en los últimos 30 días.
          </p>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">
          {error}
          <button type="button" onClick={() => void cargar()} className="ml-2 underline">Reintentar</button>
        </div>
      )}

      {!loading && !error && data?.eventos.length === 0 && (
        <div className="rounded-xl border border-white/5 bg-gray-900/50 p-6 text-sm text-gray-400">
          Todavía no hay eventos registrados en este período.
        </div>
      )}

      {data && data.eventos.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-gray-900 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Cuándo</th>
                <th className="px-4 py-3 font-medium">Tipo / origen</th>
                <th className="px-4 py-3 font-medium">Ruta</th>
                <th className="px-4 py-3 font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-gray-950/40">
              {data.eventos.map((evento) => {
                const origen = ORIGEN[evento.origin] ?? ORIGEN.UNKNOWN;
                const Icon = origen.icon;
                return (
                  <tr key={evento.id} className="align-top text-gray-300">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-400">{formatDate(evento.createdAt)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{TIPO[evento.kind] ?? evento.kind}</p>
                      <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${origen.tone}`}>
                        <Icon className="h-3 w-3" />
                        {origen.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs">{evento.method} {evento.route}</code>
                      {evento.status !== null && <p className="mt-1 text-xs text-gray-500">HTTP {evento.status}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      <p>{evento.reason ? MOTIVO[evento.reason] ?? "Evento técnico registrado (detalle interno no traducido)." : "Sin detalle adicional."}</p>
                      {evento.errorName && <p className="mt-1">Tipo: {evento.errorName}</p>}
                      {evento.ipFingerprint && (
                        <p className="mt-1 text-gray-500">Huella temporal: …{evento.ipFingerprint.slice(-8)}</p>
                      )}
                      {evento.requestId && <p className="mt-1">Ref.: {evento.requestId}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
