"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle, XCircle, Loader2, Lock, ChevronRight, ExternalLink, Unlink,
} from "lucide-react";

type Business = { id: string; name: string };

type Props = {
  fbConnected: boolean;
  fbBusinessId: string | null;
  fbCatalogId: string | null;
  fbFeedId: string | null;
  fbStatus?: "connected" | "error";
};

type StepStatus = "done" | "active" | "locked";

export default function MetaCatalogoWizard({ fbConnected, fbBusinessId, fbCatalogId, fbFeedId, fbStatus }: Props) {
  const step1Done = fbConnected;
  const step2Done = !!fbBusinessId && !!fbCatalogId;
  const [dataSharingOk, setDataSharingOk] = useState(step2Done);
  const [termsOk, setTermsOk] = useState(step2Done);
  const step3Done = dataSharingOk;
  const step4Done = termsOk;
  const step5Done = !!fbFeedId;

  const statusOf = (done: boolean, prevDone: boolean): StepStatus => (done ? "done" : prevDone ? "active" : "locked");

  const steps: { key: string; title: string; status: StepStatus }[] = [
    { key: "account",  title: "Cuenta de Facebook",     status: statusOf(step1Done, true) },
    { key: "business", title: "Portfolio comercial",    status: statusOf(step2Done, step1Done) },
    { key: "data",     title: "Uso compartido de datos", status: statusOf(step3Done, step2Done) },
    { key: "terms",    title: "Condiciones",            status: statusOf(step4Done, step3Done) },
    { key: "feed",     title: "Conectar catálogo",      status: statusOf(step5Done, step4Done) },
  ];

  return (
    <div className="space-y-3">
      {fbStatus === "connected" && (
        <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
          <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
          <p className="text-sm font-semibold text-emerald-800">¡Cuenta de Facebook conectada con éxito!</p>
        </div>
      )}
      {fbStatus === "error" && (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm font-semibold text-red-800">Hubo un error al conectar. Intentá de nuevo.</p>
        </div>
      )}

      {steps.map((step, i) => (
        <StepCard key={step.key} index={i + 1} title={step.title} status={step.status}>
          {step.key === "account" && <AccountStep done={step1Done} />}
          {step.key === "business" && step.status !== "locked" && (
            <BusinessStep done={step2Done} businessId={fbBusinessId} />
          )}
          {step.key === "data" && step.status !== "locked" && (
            <DataSharingStep done={step3Done} onConfirm={() => setDataSharingOk(true)} />
          )}
          {step.key === "terms" && step.status !== "locked" && (
            <TermsStep done={step4Done} onConfirm={() => setTermsOk(true)} />
          )}
          {step.key === "feed" && step.status !== "locked" && (
            <FeedStep done={step5Done} />
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

function AccountStep({ done }: { done: boolean }) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);

  async function disconnect() {
    setDisconnecting(true);
    await fetch("/api/facebook/oauth/disconnect", { method: "POST" });
    router.refresh();
    setDisconnecting(false);
  }

  if (done) {
    return (
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
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        Conectá la cuenta de Facebook que administra tu negocio para sincronizar tu catálogo de productos.
      </p>
      <a
        href="/api/facebook/oauth/connect"
        className="inline-flex items-center gap-2 bg-[#1877F2] hover:bg-[#1465d1] text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
      >
        Conectar cuenta de Facebook
      </a>
    </div>
  );
}

function BusinessStep({ done, businessId }: { done: boolean; businessId: string | null }) {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  useEffect(() => {
    if (done) return;
    fetch("/api/facebook/business")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setBusinesses(d.businesses ?? []))
      .catch(() => setLoadError(true));
  }, [done]);

  async function connect(id: string) {
    setConnectingId(id);
    const res = await fetch("/api/facebook/business/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: id }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      setConnectingId(null);
    }
  }

  if (done) {
    return <p className="text-sm text-slate-500">Portfolio comercial conectado{businessId ? ` (ID: ${businessId})` : ""}.</p>;
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
      <p className="text-sm text-slate-500 mb-3">Elegí a qué portfolio comercial pertenece tu catálogo.</p>
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

function DataSharingStep({ done, onConfirm }: { done: boolean; onConfirm: () => void }) {
  if (done) return <p className="text-sm text-slate-500">Uso compartido de datos confirmado.</p>;
  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        Vamos a compartir con Meta la información de tu catálogo (nombre, precio, imágenes y stock de tus productos) para que puedan mostrarse en Facebook e Instagram.
      </p>
      <button
        onClick={onConfirm}
        className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
      >
        Entendido, continuar
      </button>
    </div>
  );
}

function TermsStep({ done, onConfirm }: { done: boolean; onConfirm: () => void }) {
  const [accepted, setAccepted] = useState(false);

  if (done) return <p className="text-sm text-slate-500">Condiciones aceptadas.</p>;

  return (
    <div>
      <label className="flex items-start gap-2.5 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
        />
        <span className="text-sm text-slate-600">
          Acepto los{" "}
          <a href="https://www.facebook.com/legal/commerce_product_merchant_agreement" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
            Términos Comerciales de Meta
          </a>{" "}
          y los términos de uso de TiendaApps para catálogos de productos.
        </span>
      </label>
      <button
        onClick={onConfirm}
        disabled={!accepted}
        className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-40"
      >
        Continuar
      </button>
    </div>
  );
}

function FeedStep({ done }: { done: boolean }) {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(false);

  async function connectFeed() {
    setConnecting(true);
    setError(false);
    const res = await fetch("/api/facebook/feed/connect", { method: "POST" });
    if (res.ok) {
      router.refresh();
    } else {
      setError(true);
      setConnecting(false);
    }
  }

  if (done) {
    return (
      <div>
        <p className="text-sm text-slate-500 mb-3">Tu catálogo ya está sincronizando con Facebook e Instagram.</p>
        <a
          href="https://business.facebook.com/commerce_manager"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          Ver en Meta Commerce Manager <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        Último paso: conectamos tu catálogo de productos al feed diario. Meta puede tardar unas horas en procesarlo y, según tu país, pedirte completar datos fiscales para activar la pestaña de Tienda.
      </p>
      {error && <p className="text-sm text-red-500 mb-3">No se pudo conectar el catálogo. Intentá de nuevo.</p>}
      <button
        onClick={connectFeed}
        disabled={connecting}
        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
        Conectar catálogo
      </button>
    </div>
  );
}
