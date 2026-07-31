"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle, XCircle, Loader2, Lock, ChevronRight, ExternalLink, Unlink, Plus,
} from "lucide-react";

type Business = { id: string; name: string };
type Catalog = { id: string; name: string };

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
  const step2Done = !!fbBusinessId;
  const step3Done = step2Done && !!fbCatalogId;
  const [dataSharingOk, setDataSharingOk] = useState(step3Done);
  const [termsOk, setTermsOk] = useState(step3Done);
  const step4Done = dataSharingOk;
  const step5Done = termsOk;
  const step6Done = !!fbFeedId;

  const statusOf = (done: boolean, prevDone: boolean): StepStatus => (done ? "done" : prevDone ? "active" : "locked");

  const steps: { key: string; title: string; status: StepStatus }[] = [
    { key: "account",  title: "Cuenta de Facebook",       status: statusOf(step1Done, true) },
    { key: "business", title: "Portfolio comercial",      status: statusOf(step2Done, step1Done) },
    { key: "catalog",  title: "Catálogo de productos",    status: statusOf(step3Done, step2Done) },
    { key: "data",     title: "Uso compartido de datos",  status: statusOf(step4Done, step3Done) },
    { key: "terms",    title: "Condiciones",              status: statusOf(step5Done, step4Done) },
    { key: "feed",     title: "Sincronizar tus productos", status: statusOf(step6Done, step5Done) },
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
          {step.key === "catalog" && step.status !== "locked" && (
            <CatalogStep done={step3Done} catalogId={fbCatalogId} />
          )}
          {step.key === "data" && step.status !== "locked" && (
            <DataSharingStep done={step4Done} onConfirm={() => setDataSharingOk(true)} />
          )}
          {step.key === "terms" && step.status !== "locked" && (
            <TermsStep done={step5Done} onConfirm={() => setTermsOk(true)} />
          )}
          {step.key === "feed" && step.status !== "locked" && (
            <FeedStep done={step6Done} catalogId={fbCatalogId} />
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

function CatalogStep({ done, catalogId }: { done: boolean; catalogId: string | null }) {
  const router = useRouter();
  const [catalogs, setCatalogs] = useState<Catalog[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [changing, setChanging] = useState(false);

  const picking = !done || changing;

  useEffect(() => {
    if (!picking) return;
    fetch("/api/facebook/catalogs")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setCatalogs(d.catalogs ?? []))
      .catch(() => setLoadError(true));
  }, [picking]);

  async function choose(body: { catalogId: string } | { name: string }) {
    setBusyId("catalogId" in body ? body.catalogId : "nuevo");
    const res = await fetch("/api/facebook/catalogs/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setChanging(false);
      router.refresh();
    } else {
      setBusyId(null);
    }
  }

  if (!picking) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Catálogo conectado{catalogId ? <> (ID: <span className="font-mono">{catalogId}</span>)</> : ""}.
        </p>
        <button
          onClick={() => { setLoadError(false); setChanging(true); }}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 shrink-0"
        >
          Cambiar
        </button>
      </div>
    );
  }

  if (loadError) {
    return <p className="text-sm text-red-500">No se pudieron cargar tus catálogos de Meta. Recargá la página.</p>;
  }

  if (!catalogs) {
    return <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Cargando catálogos…</div>;
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-3">
        {catalogs.length > 0
          ? "Elegí el catálogo de productos donde vamos a sincronizar tu tienda."
          : "Tu portfolio comercial todavía no tiene ningún catálogo de productos. Creá uno para empezar."}
      </p>

      {catalogs.length > 0 && (
        <div className="space-y-2 mb-3">
          {catalogs.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                <p className="text-xs text-slate-400 font-mono truncate">ID: {c.id}</p>
              </div>
              <button
                onClick={() => choose({ catalogId: c.id })}
                disabled={busyId !== null}
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-md disabled:opacity-50 shrink-0"
              >
                {busyId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
                {c.id === catalogId ? "En uso" : "Usar este catálogo"}
              </button>
            </div>
          ))}
        </div>
      )}

      {creating || catalogs.length === 0 ? (
        <div className="flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del catálogo nuevo"
            className="flex-1 min-w-0 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
          />
          <button
            onClick={() => choose({ name: newName.trim() })}
            disabled={!newName.trim() || busyId !== null}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-md disabled:opacity-40 shrink-0"
          >
            {busyId === "nuevo" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Crear catálogo
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <Plus className="h-3.5 w-3.5" /> Crear un catálogo nuevo
        </button>
      )}
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

// Link al catálogo puntual dentro de Commerce Manager. Sin el ID solo se puede
// mandar al listado general, donde el dueño tiene que buscar el suyo a mano.
function catalogUrl(catalogId: string | null) {
  return catalogId
    ? `https://business.facebook.com/commerce/catalogs/${catalogId}/products`
    : "https://business.facebook.com/commerce_manager";
}

function FeedStep({ done, catalogId }: { done: boolean; catalogId: string | null }) {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(false);
  const [pendingReview, setPendingReview] = useState(false);

  async function connectFeed() {
    setConnecting(true);
    setError(false);
    setPendingReview(false);
    const res = await fetch("/api/facebook/feed/connect", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.pendingReview) {
      // Catálogo creado OK; el feed programado se activa cuando Meta apruebe el
      // acceso avanzado (App Review). No es un error — se muestra como pendiente.
      setPendingReview(true);
      setConnecting(false);
    } else if (res.ok) {
      router.refresh();
    } else {
      setError(true);
      setConnecting(false);
    }
  }

  if (pendingReview) {
    return (
      <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">¡Todo listo!</p>
          <p className="text-sm text-emerald-700 mt-0.5">
            La sincronización automática de tus productos se activará cuando Meta termine de revisar tu tienda (suele tardar unos días). No tenés que hacer nada más — te vamos avisando.
          </p>
          <a
            href={catalogUrl(catalogId)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-emerald-800 hover:text-emerald-900"
          >
            Ver mi catálogo en Meta <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <p className="text-sm text-slate-500 mb-3">Tu catálogo ya está sincronizando con Facebook e Instagram.</p>
        <a
          href={catalogUrl(catalogId)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          Ver mi catálogo en Meta <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        Último paso: enviamos tus productos al catálogo que elegiste, con una actualización diaria. Meta puede tardar unas horas en procesarlo y, según tu país, pedirte completar datos fiscales para activar la pestaña de Tienda.
      </p>
      {error && <p className="text-sm text-red-500 mb-3">No se pudo activar la sincronización. Intentá de nuevo.</p>}
      <button
        onClick={connectFeed}
        disabled={connecting}
        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
        Sincronizar mis productos
      </button>
    </div>
  );
}
