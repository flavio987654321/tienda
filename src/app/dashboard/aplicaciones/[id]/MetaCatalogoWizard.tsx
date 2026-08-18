"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2, ChevronRight, ExternalLink, Unlink, Plus, AlertCircle, RefreshCw } from "lucide-react";
import {
  StepCard, statusOf, postJson, getJson, AvisoError, ErrorDePaso, AvisoTokenVencido, ConfirmarDesconexion,
  type StepStatus,
} from "./wizard-comun";

type Business = { id: string; name: string };
type Catalog = { id: string; name: string };

type Props = {
  fbConnected: boolean;
  fbBusinessId: string | null;
  fbCatalogId: string | null;
  fbFeedId: string | null;
  fbStatus?: "connected" | "error";
  /** El token de Meta ya venció: los pasos de abajo no van a funcionar. */
  fbVencido?: boolean;
};

export default function MetaCatalogoWizard({ fbConnected, fbBusinessId, fbCatalogId, fbFeedId, fbStatus, fbVencido }: Props) {
  const step1Done = fbConnected;
  const step2Done = !!fbBusinessId;
  const step3Done = step2Done && !!fbCatalogId;
  const [dataSharingOk, setDataSharingOk] = useState(step3Done);
  const [termsOk, setTermsOk] = useState(step3Done);
  const step4Done = dataSharingOk;
  const step5Done = termsOk;
  const step6Done = !!fbFeedId;

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

      {/* Arriba de todo: si el token venció, cualquier paso de abajo va a fallar
          con un error de permisos que no explica nada. */}
      {fbVencido && <AvisoTokenVencido />}

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
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Tu cuenta de Facebook está conectada.</p>
            <button
              onClick={() => setConfirmando(true)}
              className="inline-flex items-center gap-1.5 shrink-0 text-xs text-red-500 hover:text-red-600 transition-colors"
            >
              <Unlink className="h-3 w-3" /> Desconectar
            </button>
          </div>
        )}
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  // Cambiar este número vuelve a disparar el efecto: reintentar sin recargar.
  const [intento, setIntento] = useState(0);

  // Los reseteos van en `reintentar`, no acá: setState sincrónico dentro del
  // efecto encadena renders de más (y lo marca el lint).
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
    // El spinner se apaga SIEMPRE, no sólo al fallar. Antes el camino exitoso lo
    // dejaba prendido y confiaba en que `router.refresh()` trajera el paso ya
    // hecho y desmontara la lista: si el refresh tardaba o no cambiaba nada, el
    // botón quedaba girando para siempre y —porque los demás se deshabilitan con
    // `connectingId !== null`— la lista entera quedaba muerta hasta recargar.
    setConnectingId(null);
    if (err) {
      // Va en `actionError` y no en `loadError` a propósito: el error de cargar
      // reemplaza la pantalla del paso, pero si falla el clic hay que dejar la
      // lista a la vista para poder reintentar sobre el mismo portfolio.
      // Antes esto sólo apagaba el spinner y el dueño no se enteraba de nada.
      setActionError(err);
      return;
    }
    router.refresh();
  }

  if (done) {
    return <p className="text-sm text-slate-500">Portfolio comercial conectado{businessId ? ` (ID: ${businessId})` : ""}.</p>;
  }

  if (loadError) {
    return <ErrorDePaso mensaje={loadError} onReintentar={reintentar} />;
  }

  if (!businesses) {
    return <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Cargando portfolios…</div>;
  }

  // Sin portfolio no hay catálogo posible: es la pared con la que más se choca
  // la gente, así que en vez de un renglón gris va explicado y con el link bien
  // visible. Antes decía "no encontramos ninguno" y quedaba ahí, sin decir qué
  // es un portfolio ni por qué hace falta.
  if (businesses.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-4">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-900">Todavía no tenés un portfolio comercial</p>
            <p className="text-xs text-amber-900/80 mt-1.5 leading-relaxed">
              Es la cuenta gratuita donde Meta guarda tu negocio: tu página, tus catálogos y tus
              anuncios. Sin uno no se puede crear el catálogo. Se hace en dos minutos y es gratis.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <a
                href="https://business.facebook.com/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-md transition-colors"
              >
                Crear mi portfolio en Meta <ExternalLink className="h-3 w-3" />
              </a>
              <button
                onClick={reintentar}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-900"
              >
                <RefreshCw className="h-3 w-3" /> Ya lo creé, buscar de nuevo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {actionError && <AvisoError mensaje={actionError} />}
      <p className="text-sm text-slate-500 mb-1">Elegí a qué portfolio comercial pertenece tu catálogo.</p>
      {/* Meta contesta TODOS los portfolios donde la cuenta figura, y no distingue
          los propios de aquellos donde a uno lo agregaron. Una comerciante que
          alguna vez entró al portfolio de una agencia, de un socio o de un familiar
          ve el de esa otra persona como única opción, elige el único que hay, y su
          catálogo termina viviendo adentro del negocio ajeno. Desde ahí su WhatsApp
          no lo encuentra nunca, porque cuelga de ella y el catálogo cuelga del otro.
          Pasó de verdad, y no había en la pantalla nada que lo insinuara. */}
      <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
        Tu catálogo va a vivir adentro del que elijas. Si alguno de estos es de otra persona
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

      {/* Antes esto sólo existía cuando la lista venía VACÍA: si Meta devolvía aunque
          fuera un portfolio ajeno, no quedaba ninguna puerta para crear el propio.
          Es el caso que dejó a una tienda enganchada al portfolio de otro. */}
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

function CatalogStep({ done, catalogId }: { done: boolean; catalogId: string | null }) {
  const router = useRouter();
  const [catalogs, setCatalogs] = useState<Catalog[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [changing, setChanging] = useState(false);
  const [intento, setIntento] = useState(0);

  const picking = !done || changing;

  function reintentar() {
    setCatalogs(null);
    setLoadError(null);
    setIntento((n) => n + 1);
  }

  useEffect(() => {
    if (!picking) return;
    let cancelado = false;
    getJson<{ catalogs?: Catalog[] }>("/api/facebook/catalogs", "No pudimos traer tus catálogos de Meta.")
      .then((d) => { if (!cancelado) setCatalogs(d.catalogs ?? []); })
      .catch((e: Error) => { if (!cancelado) setLoadError(e.message); });
    return () => { cancelado = true; };
  }, [picking, intento]);

  async function choose(body: { catalogId: string } | { name: string }) {
    setBusyId("catalogId" in body ? body.catalogId : "nuevo");
    setActionError(null);
    const err = await postJson("/api/facebook/catalogs/connect", body);
    // Igual que en el paso del portfolio: apagarlo siempre. Acá pesa todavía más
    // porque al "Cambiar" un catálogo ya conectado el paso sigue estando hecho,
    // así que el estado no cambia solo y no hay nada que desmonte el spinner.
    setBusyId(null);
    if (err) {
      setActionError(err);
      return;
    }
    setChanging(false);
    router.refresh();
  }

  if (!picking) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Catálogo conectado{catalogId ? <> (ID: <span className="font-mono">{catalogId}</span>)</> : ""}.
        </p>
        <button
          onClick={() => { setCatalogs(null); setLoadError(null); setChanging(true); }}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 shrink-0"
        >
          Cambiar
        </button>
      </div>
    );
  }

  if (loadError) {
    return <ErrorDePaso mensaje={loadError} onReintentar={reintentar} />;
  }

  if (!catalogs) {
    return <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Cargando catálogos…</div>;
  }

  return (
    <div>
      {actionError && <AvisoError mensaje={actionError} />}
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
  // `null` = sin error. El texto viene del backend porque distingue entre "hay
  // que reconectar la cuenta" y una falla cualquiera de la Graph API.
  const [error, setError] = useState<string | null>(null);
  // Sólo para el reenvío: el paso ya estaba en verde antes de tocar, así que sin
  // esto no cambia nada en pantalla y no hay forma de saber si pasó algo.
  const [reenviado, setReenviado] = useState(false);

  async function connectFeed() {
    setConnecting(true);
    setError(null);
    setReenviado(false);
    const err = await postJson("/api/facebook/feed/connect");
    setConnecting(false);
    if (err) {
      setError(err);
      return;
    }
    setReenviado(true);
    router.refresh();
  }

  if (done) {
    return (
      <div>
        <p className="text-sm text-slate-500 mb-1.5">Tu catálogo ya está sincronizando con Facebook e Instagram.</p>
        {/* Antes decía sólo la línea de arriba, y la dueña entraba a Commerce Manager
            esperando ver sus productos ya. Meta tarda en procesar la carga aunque se
            la pidamos al toque, y de ahí en más viaja una vez por día: si eso no está
            escrito, cada demora normal parece que algo se rompió.

            El texto no habla de "recién ahora" a propósito: esta tarjeta la sigue
            viendo una tienda conectada hace meses. */}
        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
          La primera vez, tus productos pueden tardar unos minutos en aparecer del lado de Meta.
          Después, los cambios de precio o de stock viajan una vez por día.
        </p>
        {error && <AvisoError mensaje={error} />}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <a
            href={catalogUrl(catalogId)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Ver mi catálogo en Meta <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {/* Con el paso hecho no había forma de volver a pedirle a Meta que
              buscara el feed: para reintentar había que desconectar la cuenta y
              rehacer los seis pasos. Importa porque el endpoint es idempotente
              —reutiliza el feed que ya existe— y porque las tiendas conectadas
              desde antes de la carga inmediata no se benefician de ella hasta
              que alguien la dispare una vez. */}
          <button
            onClick={connectFeed}
            disabled={connecting}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
          >
            {connecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {connecting ? "Enviando…" : "Volver a enviar mis productos"}
          </button>
        </div>
        {reenviado ? (
          <p className="text-[11px] text-emerald-600 font-semibold mt-2 leading-relaxed">
            Listo, se lo pedimos a Meta. Tus productos deberían aparecer en unos minutos.
          </p>
        ) : (
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Usá “volver a enviar” si en Meta no ves tus productos y no querés esperar al envío de
            mañana. No duplica nada: es el mismo catálogo, actualizado.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        Último paso: enviamos tus productos al catálogo que elegiste y le pedimos a Meta que los vaya a buscar en el momento; de ahí en más se actualizan una vez por día. Meta puede tardar unos minutos en procesarlos y, según tu país, pedirte completar datos fiscales para activar la pestaña de Tienda.
      </p>
      {error && <AvisoError mensaje={error} />}
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
