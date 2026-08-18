"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle, Loader2, Lock, ChevronRight, ExternalLink, Unlink,
} from "lucide-react";

type GaAccount = { accountId: string; accountName: string };

type Props = {
  gaConnected: boolean;
  measurementId: string | null;
};

type StepStatus = "done" | "active" | "locked";

export default function GoogleAnalyticsWizard({ gaConnected, measurementId }: Props) {
  const step1Done = gaConnected;
  const step2Done = !!measurementId;

  const statusOf = (done: boolean, prevDone: boolean): StepStatus => (done ? "done" : prevDone ? "active" : "locked");

  const steps: { key: string; title: string; status: StepStatus }[] = [
    { key: "account",  title: "Cuenta de Google",              status: statusOf(step1Done, true) },
    { key: "property", title: "Elegí tu cuenta de Analytics",  status: statusOf(step2Done, step1Done) },
  ];

  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <StepCard key={step.key} index={i + 1} title={step.title} status={step.status}>
          {step.key === "account" && <AccountStep done={step1Done} />}
          {step.key === "property" && step.status !== "locked" && <PropertyStep done={step2Done} />}
        </StepCard>
      ))}
    </div>
  );
}

function StepCard({ index, title, status, children }: { index: number; title: string; status: StepStatus; children: React.ReactNode }) {
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

function AccountStep({ done }: { done: boolean }) {
  const router = useRouter();
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== "ga-oauth") return;
      setWaiting(false);
      if (e.data.status === "connected") {
        router.refresh();
      } else {
        setError(true);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);

  function openPopup() {
    setError(false);
    setWaiting(true);
    const w = 600;
    const h = 760;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    window.open("/api/google/analytics/oauth/connect", "ga-oauth", `width=${w},height=${h},left=${left},top=${top}`);
  }

  // El botón para desconectar/desinstalar vive solo en el Paso 2 (es el que
  // muestra "Instalada"), así hay un único lugar que apaga todo. Acá el paso
  // ya hecho es solo informativo.
  if (done) {
    return <p className="text-sm text-slate-500">Tu cuenta de Google está conectada.</p>;
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        Conectá la cuenta de Google donde tenés (o vas a tener) tu Google Analytics.
      </p>
      <button
        onClick={openPopup}
        disabled={waiting}
        className="inline-flex items-center gap-2 bg-[#4285F4] hover:bg-[#3574e0] text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
      >
        {waiting && <Loader2 className="h-4 w-4 animate-spin" />}
        {waiting ? "Esperando a Google…" : "Conectar cuenta de Google"}
      </button>
      {error && <p className="text-xs text-red-500 mt-2">Hubo un error al conectar con Google. Intentá de nuevo.</p>}
    </div>
  );
}

function PropertyStep({ done }: { done: boolean }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<GaAccount[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState(false);

  useEffect(() => {
    if (done) return;
    fetch("/api/google/analytics/accounts")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setAccounts(d.accounts ?? []))
      .catch(() => setLoadError(true));
  }, [done]);

  async function connect(accountId: string) {
    setConnectingId(accountId);
    setError(false);
    setErrorDetail(null);
    const res = await fetch("/api/google/analytics/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    // Mismo arreglo que en los asistentes de Meta: el spinner se apaga en los dos
    // caminos. Dejarlo prendido al salir bien apuesta a que el refresh cambie el
    // paso de estado, y cuando no lo hace el botón queda girando sin salida.
    setConnectingId(null);
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(true);
      setErrorDetail(typeof data.detail === "string" ? data.detail : null);
    }
  }

  // Único botón que apaga toda la app: desconecta la cuenta de Google Y borra
  // el ID de Analytics instalado (misma ruta /oauth/disconnect).
  async function uninstall() {
    setDisconnecting(true);
    setDisconnectError(false);
    const res = await fetch("/api/google/analytics/oauth/disconnect", { method: "POST" });
    if (res.ok) {
      router.refresh();
    } else {
      setDisconnectError(true);
    }
    setDisconnecting(false);
  }

  if (done) {
    return (
      <div>
        <p className="text-sm text-slate-500 mb-3">Tu tienda ya está midiendo visitas con Google Analytics.</p>
        <div className="flex items-center gap-4">
          <a
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Ver en Google Analytics <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            onClick={uninstall}
            disabled={disconnecting}
            className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            {disconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
            Desinstalar
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Al desinstalar se desconecta tu cuenta de Google y se borra el ID de Analytics — tu tienda deja de medir visitas hasta que vuelvas a instalar.
        </p>
        {disconnectError && <p className="text-xs text-red-500 mt-1.5">No se pudo desinstalar. Intentá de nuevo.</p>}
      </div>
    );
  }

  if (loadError) {
    return <p className="text-sm text-red-500">No se pudieron cargar tus cuentas de Google Analytics. Recargá la página.</p>;
  }

  if (!accounts) {
    return <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Cargando cuentas de Google Analytics…</div>;
  }

  if (accounts.length === 0) {
    return (
      <div>
        <p className="text-sm text-slate-500 mb-3">No encontramos ninguna cuenta de Google Analytics en tu cuenta de Google.</p>
        <a
          href="https://analytics.google.com/analytics/web/#/provision/SignUp"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          Crear una cuenta en Google Analytics <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-3">
        Elegí tu cuenta de Google Analytics — si ya tenés una propiedad, la reusamos; si no, creamos una nueva sola.
      </p>
      {error && (
        <div className="mb-3">
          <p className="text-sm text-red-500">No se pudo conectar Google Analytics. Intentá de nuevo.</p>
          {errorDetail && <p className="text-xs text-red-400 mt-1 break-words">Detalle: {errorDetail}</p>}
        </div>
      )}
      <div className="space-y-2">
        {accounts.map((a) => (
          <div key={a.accountId} className="flex items-center justify-between border border-slate-200 rounded-lg px-4 py-3">
            <span className="text-sm font-medium text-slate-800">{a.accountName}</span>
            <button
              onClick={() => connect(a.accountId)}
              disabled={connectingId !== null}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-md disabled:opacity-50"
            >
              {connectingId === a.accountId ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
              Conectar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
