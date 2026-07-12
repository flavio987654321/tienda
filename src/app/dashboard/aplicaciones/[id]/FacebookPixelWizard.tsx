"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle, Loader2, Lock, ChevronRight, ExternalLink, Unlink,
} from "lucide-react";

type Business = { id: string; name: string };

type Props = {
  fbConnected: boolean;
  fbBusinessId: string | null;
  pixelId: string | null;
};

type StepStatus = "done" | "active" | "locked";

export default function FacebookPixelWizard({ fbConnected, fbBusinessId, pixelId }: Props) {
  const step1Done = fbConnected;
  const step2Done = !!pixelId;

  const statusOf = (done: boolean, prevDone: boolean): StepStatus => (done ? "done" : prevDone ? "active" : "locked");

  const steps: { key: string; title: string; status: StepStatus }[] = [
    { key: "account", title: "Cuenta de Facebook", status: statusOf(step1Done, true) },
    { key: "pixel",   title: "Conectar píxel",     status: statusOf(step2Done, step1Done) },
  ];

  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <StepCard key={step.key} index={i + 1} title={step.title} status={step.status}>
          {step.key === "account" && <AccountStep done={step1Done} />}
          {step.key === "pixel" && step.status !== "locked" && (
            <PixelStep done={step2Done} fbBusinessId={fbBusinessId} />
          )}
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

// Misma conexión de Facebook que usa "Catálogo de Meta" (comparten fbAccessToken
// a nivel de tienda) — si ya está conectada por esa app, acá aparece hecho directo.
function AccountStep({ done }: { done: boolean }) {
  const router = useRouter();
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== "fb-oauth") return;
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
    window.open("/api/facebook/oauth/connect", "fb-oauth", `width=${w},height=${h},left=${left},top=${top}`);
  }

  async function disconnect() {
    setDisconnecting(true);
    await fetch("/api/facebook/oauth/disconnect", { method: "POST" });
    router.refresh();
    setDisconnecting(false);
  }

  if (done) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Tu cuenta de Facebook está conectada.</p>
          <button
            onClick={disconnect}
            disabled={disconnecting}
            className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            {disconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
            Desconectar
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5">
          Es la misma conexión que usa Catálogo de Meta — si la desconectás acá, también se desconecta ahí.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        Conectá la cuenta de Facebook que administra tu negocio para conectar tu píxel automáticamente.
      </p>
      <button
        onClick={openPopup}
        disabled={waiting}
        className="inline-flex items-center gap-2 bg-[#1877F2] hover:bg-[#1465d1] text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
      >
        {waiting && <Loader2 className="h-4 w-4 animate-spin" />}
        {waiting ? "Esperando a Facebook…" : "Conectar cuenta de Facebook"}
      </button>
      {error && <p className="text-xs text-red-500 mt-2">Hubo un error al conectar con Facebook. Intentá de nuevo.</p>}
    </div>
  );
}

function PixelStep({ done, fbBusinessId }: { done: boolean; fbBusinessId: string | null }) {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (done || fbBusinessId) return;
    fetch("/api/facebook/business")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setBusinesses(d.businesses ?? []))
      .catch(() => setLoadError(true));
  }, [done, fbBusinessId]);

  async function connect(businessId: string) {
    setConnectingId(businessId);
    setError(false);
    const res = await fetch("/api/facebook/pixel/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      setError(true);
      setConnectingId(null);
    }
  }

  if (done) {
    return (
      <div>
        <p className="text-sm text-slate-500 mb-3">Tu píxel ya está conectado y midiendo tus visitas y compras.</p>
        <a
          href="https://business.facebook.com/events_manager"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          Ver en el Administrador de eventos <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  // Ya hay un portfolio elegido (por ejemplo, conectado antes desde Catálogo de Meta) — conectar directo, sin volver a preguntar.
  if (fbBusinessId) {
    return (
      <div>
        <p className="text-sm text-slate-500 mb-4">
          Vamos a buscar o crear tu píxel dentro del portfolio comercial que ya tenés conectado.
        </p>
        {error && <p className="text-sm text-red-500 mb-3">No se pudo conectar el píxel. Intentá de nuevo.</p>}
        <button
          onClick={() => connect(fbBusinessId)}
          disabled={connectingId !== null}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {connectingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          Conectar píxel
        </button>
      </div>
    );
  }

  if (loadError) {
    return <p className="text-sm text-red-500">No se pudieron cargar tus portfolios de Meta. Recargá la página.</p>;
  }

  if (!businesses) {
    return <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Cargando portfolios…</div>;
  }

  if (businesses.length === 0) {
    return (
      <div>
        <p className="text-sm text-slate-500 mb-3">No encontramos ningún portfolio comercial en tu cuenta de Meta.</p>
        <a
          href="https://business.facebook.com/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          Crear uno en Meta Business <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-3">Elegí a qué portfolio comercial pertenece tu píxel.</p>
      {error && <p className="text-sm text-red-500 mb-3">No se pudo conectar el píxel. Intentá de nuevo.</p>}
      <div className="space-y-2">
        {businesses.map((b) => (
          <div key={b.id} className="flex items-center justify-between border border-slate-200 rounded-lg px-4 py-3">
            <span className="text-sm font-medium text-slate-800">{b.name}</span>
            <button
              onClick={() => connect(b.id)}
              disabled={connectingId !== null}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-md disabled:opacity-50"
            >
              {connectingId === b.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
              Conectar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
