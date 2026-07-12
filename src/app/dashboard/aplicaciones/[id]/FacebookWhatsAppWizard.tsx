"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle, Loader2, Lock, ChevronRight, ExternalLink, Unlink,
} from "lucide-react";

type WabaAccount = { id: string; name: string };

type Props = {
  fbConnected: boolean;
  fbCatalogId: string | null;
  fbWabaId: string | null;
};

type StepStatus = "done" | "active" | "locked";

export default function FacebookWhatsAppWizard({ fbConnected, fbCatalogId, fbWabaId }: Props) {
  const step1Done = fbConnected;
  const step2Done = !!fbCatalogId;
  const step3Done = !!fbWabaId;

  const statusOf = (done: boolean, prevDone: boolean): StepStatus => (done ? "done" : prevDone ? "active" : "locked");

  const steps: { key: string; title: string; status: StepStatus }[] = [
    { key: "account",  title: "Cuenta de Facebook",      status: statusOf(step1Done, true) },
    { key: "catalogo", title: "Catálogo de productos",   status: statusOf(step2Done, step1Done) },
    { key: "waba",     title: "Elegí tu WhatsApp Business", status: statusOf(step3Done, step2Done) },
  ];

  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <StepCard key={step.key} index={i + 1} title={step.title} status={step.status}>
          {step.key === "account" && <AccountStep done={step1Done} />}
          {step.key === "catalogo" && step.status !== "locked" && <CatalogStep done={step2Done} />}
          {step.key === "waba" && step.status !== "locked" && <WabaStep done={step3Done} />}
        </StepCard>
      ))}

      {step3Done && <AiGuideCard />}
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

// Misma conexión de Facebook que usan "Catálogo de Meta" y "Meta Pixel" (comparten
// fbAccessToken a nivel de tienda) — si ya está conectada por esas apps, acá aparece hecho directo.
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
          Es la misma conexión que usan Catálogo de Meta y Meta Pixel — si la desconectás acá, también se desconecta ahí.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        Conectá la cuenta de Facebook que administra tu negocio para vincular tu catálogo a WhatsApp.
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

// El catálogo lo crea la app "Catálogo de Meta" — acá no se repite esa lógica,
// solo se pide que exista antes de seguir.
function CatalogStep({ done }: { done: boolean }) {
  if (done) {
    return <p className="text-sm text-slate-500">Ya tenés un catálogo de productos conectado.</p>;
  }
  return (
    <div>
      <p className="text-sm text-slate-500 mb-3">
        Todavía no conectaste un catálogo de productos — es el mismo que usa Facebook e Instagram.
      </p>
      <Link
        href="/dashboard/aplicaciones/meta-catalogo"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
      >
        Ir a Catálogo de Meta <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function WabaStep({ done }: { done: boolean }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<WabaAccount[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (done) return;
    fetch("/api/facebook/whatsapp/accounts")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setAccounts(d.accounts ?? []))
      .catch(() => setLoadError(true));
  }, [done]);

  async function connect(wabaId: string) {
    setConnectingId(wabaId);
    setError(false);
    const res = await fetch("/api/facebook/whatsapp/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wabaId }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      setError(true);
      setConnectingId(null);
    }
  }

  if (done) {
    return <p className="text-sm text-slate-500">Tu catálogo ya está conectado a WhatsApp Business.</p>;
  }

  if (loadError) {
    return <p className="text-sm text-red-500">No se pudieron cargar tus cuentas de WhatsApp Business. Recargá la página.</p>;
  }

  if (!accounts) {
    return <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Cargando cuentas de WhatsApp Business…</div>;
  }

  if (accounts.length === 0) {
    return (
      <div>
        <p className="text-sm text-slate-500 mb-3">No encontramos ninguna cuenta de WhatsApp Business en tu portfolio comercial.</p>
        <a
          href="https://business.whatsapp.com/products/business-app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          Crear WhatsApp Business <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-3">Elegí a qué WhatsApp Business conectar tu catálogo.</p>
      {error && <p className="text-sm text-red-500 mb-3">No se pudo conectar el catálogo. Intentá de nuevo.</p>}
      <div className="space-y-2">
        {accounts.map((a) => (
          <div key={a.id} className="flex items-center justify-between border border-slate-200 rounded-lg px-4 py-3">
            <span className="text-sm font-medium text-slate-800">{a.name}</span>
            <button
              onClick={() => connect(a.id)}
              disabled={connectingId !== null}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-md disabled:opacity-50"
            >
              {connectingId === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
              Conectar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// No construimos ningún chatbot propio: Meta ya ofrece uno gratis ("Meta Business
// Agent") que cualquier dueño de tienda activa solo, desde la app de WhatsApp
// Business. Esta card es solo una guía — no dispara ninguna llamada a nuestra API.
function AiGuideCard() {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <p className="text-sm font-bold text-emerald-900 mb-1.5">Último paso, gratis: activá la IA que contesta sola</p>
      <p className="text-sm text-emerald-800 mb-3 leading-relaxed">
        Meta ofrece un asistente de IA gratuito para WhatsApp Business (“Meta Business Agent”) que responde
        preguntas de tus clientes usando tu catálogo y la info de tu negocio — sin que tengas que escribir nada
        vos. Ya cumplís los 3 requisitos: WhatsApp Business activo, cuenta de Meta Business verificada y catálogo
        con productos.
      </p>
      <ol className="text-sm text-emerald-800 space-y-1.5 mb-3 list-decimal pl-4">
        <li>Abrí la app de WhatsApp Business en tu celular.</li>
        <li>Entrá a Herramientas de empresa (o Configuración) → buscá “Agente de IA” / “Meta Business Agent”.</li>
        <li>Seguí los pasos para activarlo — Meta lo configura solo con tu catálogo y tu info de negocio.</li>
      </ol>
      <a
        href="https://www.facebook.com/business/help/834508185328904"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
      >
        Ver la guía oficial de Meta <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
