"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronRight, ExternalLink, Unlink, Plus, RefreshCw } from "lucide-react";
import {
  StepCard, statusOf, postJson, getJson, AvisoError, ErrorDePaso, AvisoTokenVencido, ConfirmarDesconexion,
  type StepStatus,
} from "./wizard-comun";

type Business = { id: string; name: string };
type Pixel = { id: string; name: string };

type Props = {
  fbConnected: boolean;
  fbBusinessId: string | null;
  pixelId: string | null;
  fbVencido?: boolean;
};

export default function FacebookPixelWizard({ fbConnected, fbBusinessId, pixelId, fbVencido }: Props) {
  const step1Done = fbConnected;
  const step2Done = !!fbBusinessId;
  const step3Done = !!pixelId;

  const steps: { key: string; title: string; status: StepStatus }[] = [
    { key: "account",  title: "Cuenta de Facebook",  status: statusOf(step1Done, true) },
    { key: "business", title: "Portfolio comercial", status: statusOf(step2Done, step1Done) },
    { key: "pixel",    title: "Elegir tu píxel",     status: statusOf(step3Done, step2Done) },
  ];

  return (
    <div className="space-y-3">
      {fbVencido && <AvisoTokenVencido />}

      {steps.map((step, i) => (
        <StepCard key={step.key} index={i + 1} title={step.title} status={step.status}>
          {step.key === "account" && <AccountStep done={step1Done} />}
          {step.key === "business" && step.status !== "locked" && (
            <BusinessStep done={step2Done} businessId={fbBusinessId} />
          )}
          {step.key === "pixel" && step.status !== "locked" && (
            <PixelStep done={step3Done} pixelId={pixelId} />
          )}
        </StepCard>
      ))}
    </div>
  );
}

// Misma conexión de Facebook que usa "Catálogo de Meta" (comparten fbAccessToken
// a nivel de tienda) — si ya está conectada por esa app, acá aparece hecho directo.
function AccountStep({ done }: { done: boolean }) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function disconnect() {
    setDisconnecting(true);
    setError(null);
    const err = await postJson("/api/facebook/oauth/disconnect");
    setDisconnecting(false);
    if (err) { setError(err); return; }
    setConfirmando(false);
    router.refresh();
  }

  if (done) {
    return (
      <div>
        {error && <AvisoError mensaje={error} />}
        {confirmando ? (
          <ConfirmarDesconexion
            onCancelar={() => setConfirmando(false)}
            onConfirmar={disconnect}
            desconectando={disconnecting}
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-500">Tu cuenta de Facebook está conectada.</p>
              <button
                onClick={() => setConfirmando(true)}
                className="inline-flex items-center gap-1.5 shrink-0 text-xs text-red-500 hover:text-red-600 transition-colors"
              >
                <Unlink className="h-3 w-3" /> Desconectar
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Es la misma conexión que usa Catálogo de Meta — si la desconectás acá, también se desconecta ahí.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        Conectá la cuenta de Facebook que administra tu negocio para elegir tu píxel.
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  function reintentar() {
    setBusinesses(null);
    setLoadError(null);
    setIntento((n) => n + 1);
  }

  useEffect(() => {
    if (done) return;
    let cancelado = false;
    getJson<{ businesses?: Business[] }>("/api/facebook/business", "No pudimos traer tus portfolios de Meta.")
      .then((d) => { if (!cancelado) setBusinesses(d.businesses ?? []); })
      .catch((e: Error) => { if (!cancelado) setLoadError(e.message); });
    return () => { cancelado = true; };
  }, [done, intento]);

  async function connect(id: string) {
    setConnectingId(id);
    setActionError(null);
    const err = await postJson("/api/facebook/business/connect", { businessId: id });
    // Apagar el spinner también al salir bien: si no, cuando `router.refresh()`
    // tarda o no cambia el estado del paso, el botón gira para siempre y los
    // demás quedan deshabilitados. Mismo arreglo que en MetaCatalogoWizard.
    setConnectingId(null);
    if (err) { setActionError(err); return; }
    router.refresh();
  }

  if (done) {
    return <p className="text-sm text-slate-500">Portfolio comercial conectado{businessId ? ` (ID: ${businessId})` : ""}.</p>;
  }

  if (loadError) return <ErrorDePaso mensaje={loadError} onReintentar={reintentar} />;

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
      {actionError && <AvisoError mensaje={actionError} />}
      <p className="text-sm text-slate-500 mb-1">Elegí a qué portfolio comercial pertenece tu píxel.</p>
      {/* El portfolio es el MISMO dato que usa Catálogo de Meta (`fbBusinessId`),
          así que el que se elija acá es el que después va a alojar el catálogo.
          Ver el comentario largo en MetaCatalogoWizard: Meta lista también los
          portfolios ajenos donde a uno lo agregaron, y sin esta salida el dueño
          no tiene forma de crear el suyo. */}
      <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
        Es el mismo portfolio que va a usar tu catálogo. Si alguno de estos es de otra persona
        —una agencia, un socio, un familiar que te agregó—, mejor creá el tuyo abajo.
      </p>
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

      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-2">
        <a
          href="https://business.facebook.com/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <Plus className="h-3.5 w-3.5" /> Crear mi propio portfolio
        </a>
        <button
          onClick={reintentar}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
        >
          <RefreshCw className="h-3 w-3" /> Ya lo creé, buscar de nuevo
        </button>
      </div>
    </div>
  );
}

function PixelStep({ done, pixelId }: { done: boolean; pixelId: string | null }) {
  const router = useRouter();
  const [pixels, setPixels] = useState<Pixel[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [changing, setChanging] = useState(false);
  const [intento, setIntento] = useState(0);

  const picking = !done || changing;

  function reintentar() {
    setPixels(null);
    setLoadError(null);
    setIntento((n) => n + 1);
  }

  useEffect(() => {
    if (!picking) return;
    let cancelado = false;
    getJson<{ pixels?: Pixel[] }>("/api/facebook/pixels", "No pudimos traer tus píxeles de Meta.")
      .then((d) => { if (!cancelado) setPixels(d.pixels ?? []); })
      .catch((e: Error) => { if (!cancelado) setLoadError(e.message); });
    return () => { cancelado = true; };
  }, [picking, intento]);

  async function choose(body: { pixelId: string } | { name: string }) {
    setBusyId("pixelId" in body ? body.pixelId : "nuevo");
    setActionError(null);
    const err = await postJson("/api/facebook/pixel/connect", body);
    // Al "Cambiar" un pixel ya conectado el paso sigue hecho, así que nada
    // desmonta el spinner solo: hay que apagarlo acá.
    setBusyId(null);
    if (err) { setActionError(err); return; }
    setChanging(false);
    router.refresh();
  }

  if (!picking) {
    return (
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Píxel conectado{pixelId ? <> (ID: <span className="font-mono">{pixelId}</span>)</> : ""}.
          </p>
          <button
            onClick={() => { setPixels(null); setLoadError(null); setChanging(true); }}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 shrink-0"
          >
            Cambiar
          </button>
        </div>
        <a
          href="https://business.facebook.com/events_manager"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          Ver en el Administrador de eventos <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  if (loadError) return <ErrorDePaso mensaje={loadError} onReintentar={reintentar} />;

  if (!pixels) {
    return <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Cargando píxeles…</div>;
  }

  return (
    <div>
      {actionError && <AvisoError mensaje={actionError} />}
      <p className="text-sm text-slate-500 mb-3">
        {pixels.length > 0
          ? "Elegí en qué píxel querés medir las visitas y compras de tu tienda. Si ya usás uno para tu publicidad, elegí ese."
          : "Tu portfolio comercial todavía no tiene ningún píxel. Creá uno para empezar a medir."}
      </p>

      {pixels.length > 0 && (
        <div className="space-y-2 mb-3">
          {pixels.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                <p className="text-xs text-slate-400 font-mono truncate">ID: {p.id}</p>
              </div>
              <button
                onClick={() => choose({ pixelId: p.id })}
                disabled={busyId !== null}
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-md disabled:opacity-50 shrink-0"
              >
                {busyId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
                {p.id === pixelId ? "En uso" : "Usar este píxel"}
              </button>
            </div>
          ))}
        </div>
      )}

      {creating || pixels.length === 0 ? (
        <div className="flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del píxel nuevo"
            className="flex-1 min-w-0 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
          />
          <button
            onClick={() => choose({ name: newName.trim() })}
            disabled={!newName.trim() || busyId !== null}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-md disabled:opacity-40 shrink-0"
          >
            {busyId === "nuevo" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Crear píxel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <Plus className="h-3.5 w-3.5" /> Crear un píxel nuevo
        </button>
      )}
    </div>
  );
}
