"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ExternalLink, Unlink, Check } from "lucide-react";
import {
  StepCard, statusOf, postJson, AvisoError, ConfirmarDesconexion, AvisoTokenVencido,
  type StepStatus,
} from "./wizard-comun";

type Props = {
  fbConnected: boolean;
  fbCatalogId: string | null;
  vinculado: boolean;
  fbVencido: boolean;
};

export default function FacebookWhatsAppWizard({ fbConnected, fbCatalogId, vinculado, fbVencido }: Props) {
  // Con el token vencido el paso 1 no está realmente hecho: todo lo que sigue
  // depende de una conexión que Meta ya cortó.
  const step1Done = fbConnected && !fbVencido;
  const step2Done = !!fbCatalogId && step1Done;
  const step3Done = vinculado;

  const steps: { key: string; title: string; status: StepStatus }[] = [
    { key: "account",  title: "Cuenta de Facebook",                status: statusOf(step1Done, true) },
    { key: "catalogo", title: "Catálogo de productos",             status: statusOf(step2Done, step1Done) },
    { key: "waba",     title: "Vincular el catálogo a WhatsApp",   status: statusOf(step3Done, step2Done) },
  ];

  return (
    <div className="space-y-3">
      {fbVencido && <AvisoTokenVencido />}

      {steps.map((step, i) => (
        <StepCard key={step.key} index={i + 1} title={step.title} status={step.status}>
          {step.key === "account" && <AccountStep done={step1Done} />}
          {step.key === "catalogo" && step.status !== "locked" && <CatalogStep done={step2Done} />}
          {step.key === "waba" && step.status !== "locked" && <VincularStep done={step3Done} />}
        </StepCard>
      ))}

      {step3Done && <AiGuideCard />}
    </div>
  );
}

// Misma conexión de Facebook que usan "Catálogo de Meta" y "Meta Pixel" (comparten
// fbAccessToken a nivel de tienda) — si ya está conectada por esas apps, acá aparece hecho directo.
function AccountStep({ done }: { done: boolean }) {
  const router = useRouter();
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [desconectando, setDesconectando] = useState(false);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== "fb-oauth") return;
      setWaiting(false);
      if (e.data.status === "connected") {
        router.refresh();
      } else {
        setError("Hubo un error al conectar con Facebook. Intentá de nuevo.");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);

  function openPopup() {
    setError(null);
    setWaiting(true);
    const w = 600;
    const h = 760;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open("/api/facebook/oauth/connect", "fb-oauth", `width=${w},height=${h},left=${left},top=${top}`);
    // Sin esto el botón quedaba en "Esperando a Facebook…" para siempre cuando el
    // navegador bloqueaba el popup: el aviso nunca llega porque no hay ventana.
    if (!popup) {
      setWaiting(false);
      setError("Tu navegador bloqueó la ventana de Facebook. Permití las ventanas emergentes para este sitio y probá de nuevo.");
    }
  }

  async function disconnect() {
    setDesconectando(true);
    const err = await postJson("/api/facebook/oauth/disconnect");
    setDesconectando(false);
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
            desconectando={desconectando}
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-500">Tu cuenta de Facebook está conectada.</p>
              <button
                onClick={() => setConfirmando(true)}
                className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors shrink-0"
              >
                <Unlink className="h-3 w-3" />
                Desconectar
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Es la misma conexión que usan Catálogo de Meta y Meta Pixel — si la desconectás acá, también se desconecta ahí.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      {error && <AvisoError mensaje={error} />}
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

/**
 * El último paso: una guía, no un botón que hace la conexión.
 *
 * Acá había un botón que llamaba a la Graph API para pegar el catálogo a la
 * cuenta de WhatsApp. No funcionaba para nadie: esa llamada necesita
 * `whatsapp_business_management` con acceso avanzado, que Meta da por el carril
 * de Tech Provider y exige demostrar envío de mensajes y plantillas — algo que
 * esta plataforma no hace. El botón mostraba la lista vacía o un error mudo.
 *
 * Lo que sí se puede: la dueña lo hace en cuatro clics desde el panel de Meta.
 * Como del otro lado no tenemos forma de comprobar que quedó hecho, lo confirma
 * ella — y el texto no promete que lo hayamos verificado.
 */
function VincularStep({ done }: { done: boolean }) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cambiar(metodo: "POST" | "DELETE") {
    setGuardando(true);
    setError(null);
    const err = await fetchVinculo(metodo);
    setGuardando(false);
    if (err) { setError(err); return; }
    router.refresh();
  }

  if (done) {
    return (
      <div>
        {error && <AvisoError mensaje={error} />}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Marcaste que tu catálogo ya está vinculado a WhatsApp.
          </p>
          <button
            onClick={() => cambiar("DELETE")}
            disabled={guardando}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50 shrink-0"
          >
            {guardando && <Loader2 className="h-3 w-3 animate-spin" />}
            Deshacer
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5">
          Esto lo marcaste vos: Meta no nos deja consultarlo. Si en WhatsApp no ves tu catálogo,
          revisá el paso en Meta y volvé a hacerlo.
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && <AvisoError mensaje={error} />}

      <p className="text-sm text-slate-500 mb-1">
        Este último paso lo hacés vos, en el panel de Meta. Es una sola vez y son cuatro clics.
      </p>
      <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
        No lo podemos hacer desde acá: Meta le da ese permiso solo a las empresas que envían
        mensajes por WhatsApp, y nosotros armamos tu catálogo, no mandamos mensajes.
      </p>

      <ol className="space-y-2.5 mb-4">
        {[
          "Abrí Meta Business Suite con el botón de abajo.",
          "En el menú de la izquierda entrá a Cuentas y después a Cuentas de WhatsApp.",
          "Elegí tu cuenta de WhatsApp y buscá la sección del catálogo.",
          "Tocá “Elegir un catálogo” y seleccioná el que dice el nombre de tu tienda.",
        ].map((texto, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="h-4 w-4 shrink-0 rounded-full bg-slate-900 text-white text-[9px] font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <span className="text-xs text-slate-600 leading-relaxed">{texto}</span>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href="https://business.facebook.com/latest/settings/whatsapp_account"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1eb355] text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
        >
          Abrir Meta Business Suite <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button
          onClick={() => cambiar("POST")}
          disabled={guardando}
          className="inline-flex items-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {guardando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Ya lo hice
        </button>
      </div>
    </div>
  );
}

/**
 * POST y DELETE contra el mismo endpoint.
 *
 * `postJson` de wizard-comun sólo hace POST, y traer todo el helper para agregarle
 * un verbo era más ruido que esto. El `catch` cumple la misma función que allá:
 * `fetch` sólo rechaza cuando no hubo respuesta, y sin atajarlo el botón se queda
 * girando para siempre.
 */
async function fetchVinculo(method: "POST" | "DELETE"): Promise<string | null> {
  try {
    const res = await fetch("/api/facebook/whatsapp/vinculo", { method });
    if (res.ok) return null;
    const d = await res.json().catch(() => ({}));
    return typeof d?.error === "string" ? d.error : "No se pudo guardar. Probá de nuevo.";
  } catch {
    return "No pudimos conectarnos. Revisá tu internet y probá de nuevo.";
  }
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
