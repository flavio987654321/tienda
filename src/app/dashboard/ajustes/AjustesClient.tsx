"use client";

import { useState } from "react";
import { Globe, Smartphone, Crown, Copy, Check, ExternalLink, Info, Lock, Clock, Trash2, Bell, Sparkles } from "lucide-react";
import PushNotificationToggle from "@/components/PushNotificationToggle";
import Link from "next/link";

type Props = {
  slug: string;
  customDomain: string | null;
  isPremium: boolean;
};

export default function AjustesClient({ slug, customDomain, isPremium }: Props) {
  const [copied, setCopied] = useState(false);
  const subdomain = `${slug}.tiendaapps.com`;

  function copySubdomain() {
    navigator.clipboard.writeText(`https://${subdomain}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">

      {/* Subdominio */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
          <Globe className="h-4 w-4 text-zinc-500 shrink-0" />
          <h2 className="text-sm font-semibold text-white">Tu subdominio</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-zinc-500">
            Tu tienda está disponible en esta URL. Compartila con tus clientes y afiliados.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm font-mono text-zinc-300 truncate">
              https://{subdomain}
            </div>
            <button
              onClick={copySubdomain}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-zinc-700 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
            <a
              href={`https://${subdomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-zinc-700 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver
            </a>
          </div>
        </div>
      </div>

      {/* PWA */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Smartphone className="h-4 w-4 text-zinc-500 shrink-0" />
            <h2 className="text-sm font-semibold text-white">Tu tienda como app</h2>
          </div>
          {isPremium ? (
            <span className="text-xs font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Crown className="h-3 w-3" /> Premium
            </span>
          ) : (
            <span className="text-xs font-medium text-zinc-500 bg-zinc-800/80 border border-zinc-700 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Lock className="h-3 w-3" /> Solo Premium
            </span>
          )}
        </div>
        {isPremium ? (
          <div className="px-5 py-4 space-y-4">
            <p className="text-sm text-zinc-500">
              Tus clientes pueden instalar tu tienda en su celular como si fuera una app, sin pasar por el App Store ni Google Play.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-800/40 p-3.5">
                <p className="text-xs font-semibold text-zinc-300 mb-1.5">Android</p>
                <ol className="text-xs text-zinc-500 space-y-1 list-decimal list-inside">
                  <li>Abrí tu tienda en Chrome</li>
                  <li>Tocá el menú (⋮)</li>
                  <li>Seleccioná "Instalar app"</li>
                </ol>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-800/40 p-3.5">
                <p className="text-xs font-semibold text-zinc-300 mb-1.5">iPhone</p>
                <ol className="text-xs text-zinc-500 space-y-1 list-decimal list-inside">
                  <li>Abrí tu tienda en Safari</li>
                  <li>Tocá el ícono compartir</li>
                  <li>Seleccioná "Agregar a inicio"</li>
                </ol>
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-zinc-800/50 border border-zinc-700/60 rounded-lg p-3.5">
              <Info className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-500">
                Compartí el link de tu tienda con tus clientes y pediles que la instalen. Una vez instalada aparece como un ícono en su pantalla de inicio.
              </p>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4">
            <PremiumGate
              title="Con Premium tus clientes instalan tu tienda como app"
              description="Sin pasar por el App Store ni Google Play. Se instala directo desde el navegador."
            />
          </div>
        )}
      </div>

      {/* Dominio personalizado */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-zinc-500 shrink-0" />
            <h2 className="text-sm font-semibold text-white">Dominio personalizado</h2>
          </div>
          {isPremium ? (
            <span className="text-xs font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Crown className="h-3 w-3" /> Premium
            </span>
          ) : (
            <span className="text-xs font-medium text-zinc-500 bg-zinc-800/80 border border-zinc-700 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Lock className="h-3 w-3" /> Solo Premium
            </span>
          )}
        </div>
        {isPremium ? (
          <div className="px-5 py-4 space-y-3">
            {customDomain ? (
              <ActiveDomain domain={customDomain} />
            ) : (
              <CustomDomainForm />
            )}
          </div>
        ) : (
          <div className="px-5 py-4">
            <PremiumGate
              title="Conectá tu propio dominio"
              description="Con Premium podés usar tu dominio (ej: tutienda.com). Lo comprás donde quieras y lo configuramos nosotros."
            />
          </div>
        )}
      </div>

      {/* Flyer de publicidad */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-zinc-500 shrink-0" />
            <h2 className="text-sm font-semibold text-white">Flyer de publicidad</h2>
          </div>
          {isPremium ? (
            <span className="text-xs font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Crown className="h-3 w-3" /> Premium
            </span>
          ) : (
            <span className="text-xs font-medium text-zinc-500 bg-zinc-800/80 border border-zinc-700 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Lock className="h-3 w-3" /> Solo Premium
            </span>
          )}
        </div>
        {isPremium ? (
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-zinc-500">
              Mostrá un flyer publicitario cada vez que alguien entra a tu tienda. Subí hasta 3 imágenes en formato vertical (tipo historia de Instagram).
            </p>
            <Link
              href="/dashboard/configuracion"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
            >
              Configurar flyer en el diseño →
            </Link>
          </div>
        ) : (
          <div className="px-5 py-4">
            <PremiumGate
              title="Mostrá un flyer al entrar a tu tienda"
              description="Perfecto para promociones, lanzamientos y novedades. Subí hasta 3 imágenes estilo historia."
            />
          </div>
        )}
      </div>

      {/* Notificaciones push */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
          <Bell className="h-4 w-4 text-zinc-500 shrink-0" />
          <h2 className="text-sm font-semibold text-white">Notificaciones push</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-zinc-500">
            Recibí alertas en este dispositivo cuando llegue un nuevo pedido o solicitud de afiliada, incluso con el panel cerrado.
          </p>
          <PushNotificationToggle />
        </div>
      </div>

    </div>
  );
}

function PremiumGate({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 bg-amber-950/20 border border-amber-900/40 rounded-lg p-4">
      <Crown className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-amber-300">{title}</p>
        <p className="text-xs text-amber-700 mt-0.5">{description}</p>
        <Link href="/dashboard/mi-plan" className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors">
          Actualizar a Premium →
        </Link>
      </div>
    </div>
  );
}

function ActiveDomain({ domain }: { domain: string }) {
  const [removing, setRemoving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleRemove() {
    if (!confirm("¿Querés quitar este dominio personalizado?")) return;
    setRemoving(true);
    await fetch("/api/ajustes/dominio", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm font-mono text-zinc-300 truncate">
          https://{domain}
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(`https://${domain}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="shrink-0 p-2.5 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer"
          className="shrink-0 p-2.5 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-900/50 px-2.5 py-1.5 rounded-lg">
          <Check className="h-3 w-3" /> Activo
        </span>
        <button onClick={handleRemove} disabled={removing}
          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400 transition-colors disabled:opacity-50">
          <Trash2 className="h-3 w-3" /> Quitar dominio
        </button>
      </div>
    </div>
  );
}

function CustomDomainForm() {
  const [step, setStep] = useState<"choice" | "enter" | "instructions">("choice");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedCname, setCopiedCname] = useState(false);

  async function handleConnect() {
    const cleaned = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!cleaned || !cleaned.includes(".")) {
      setError("Ingresá un dominio válido, ej: mitienda.com");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/ajustes/dominio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: cleaned }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Error al conectar el dominio");
      return;
    }
    setStep("instructions");
  }

  if (step === "choice") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-500">
          Con tu plan Premium podés usar tu propio dominio (ej: <span className="font-mono text-zinc-300">mitienda.com</span>). ¿Ya tenés uno?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="https://www.namecheap.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2.5 p-4 rounded-lg border border-dashed border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50 transition-all text-center"
          >
            <ExternalLink className="h-5 w-5 text-zinc-500" />
            <div>
              <p className="text-sm font-semibold text-zinc-300">No tengo</p>
              <p className="text-xs text-zinc-600">Ir a comprar uno</p>
            </div>
          </a>
          <button
            onClick={() => setStep("enter")}
            className="flex flex-col items-center gap-2.5 p-4 rounded-lg border border-dashed border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50 transition-all text-center"
          >
            <Check className="h-5 w-5 text-zinc-500" />
            <div>
              <p className="text-sm font-semibold text-zinc-300">Ya tengo</p>
              <p className="text-xs text-zinc-600">Conectarlo ahora</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (step === "enter") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-500">Escribí el dominio que compraste:</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={domain}
            onChange={(e) => { setDomain(e.target.value); setError(""); }}
            placeholder="mitienda.com"
            className="flex-1 border border-zinc-700 bg-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500"
          />
          <button
            onClick={handleConnect}
            disabled={loading || !domain.trim()}
            className="px-4 py-2.5 rounded-lg bg-white text-zinc-900 text-sm font-semibold hover:bg-zinc-100 transition-colors disabled:opacity-50"
          >
            {loading ? "Conectando..." : "Conectar"}
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button onClick={() => setStep("choice")} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          ← Volver
        </button>
      </div>
    );
  }

  const cname = "cname.vercel-dns.com";
  return (
    <div className="space-y-4">
      <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-4 space-y-3">
        <p className="text-sm font-semibold text-amber-300">¡Casi listo! Solo un paso más</p>
        <p className="text-xs text-zinc-400">
          Entrá a donde compraste tu dominio y agregá este registro en la sección <span className="font-semibold text-zinc-300">DNS</span>:
        </p>
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden text-xs font-mono">
          <div className="grid grid-cols-3 bg-zinc-700/50 px-3 py-2 text-zinc-400 font-semibold text-[11px] tracking-wider">
            <span>TIPO</span><span>NOMBRE</span><span>VALOR</span>
          </div>
          <div className="grid grid-cols-3 px-3 py-3 text-zinc-300 items-center">
            <span className="font-bold text-white">CNAME</span>
            <span className="font-bold text-white">www</span>
            <div className="flex items-center gap-1.5">
              <span className="truncate">{cname}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(cname); setCopiedCname(true); setTimeout(() => setCopiedCname(false), 2000); }}
                className="shrink-0 ml-1 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {copiedCname ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs text-zinc-600">
          ¿No encontrás dónde hacerlo? Mandanos un mensaje y te ayudamos en minutos.
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-600">
        <Clock className="h-3.5 w-3.5 animate-pulse" />
        Esperando activación — puede tardar hasta 24hs.
      </div>
    </div>
  );
}
