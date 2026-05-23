"use client";

import { useState } from "react";
import { Globe, Smartphone, Crown, Copy, Check, ExternalLink, Info, Lock, Clock, Trash2 } from "lucide-react";
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
    <div className="space-y-4">

      {/* Subdominio */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
          <Globe className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-bold text-gray-800">Tu subdominio</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-gray-500">
            Tu tienda está disponible en esta URL. Compartila con tus clientes y afiliados.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono text-indigo-600 truncate">
              https://{subdomain}
            </div>
            <button
              onClick={copySubdomain}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
            <a
              href={`https://${subdomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver
            </a>
          </div>
        </div>
      </div>

      {/* PWA */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <Smartphone className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-gray-800">Tu tienda como app</h2>
          </div>
          {isPremium ? (
            <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Crown className="h-3 w-3" /> Premium
            </span>
          ) : (
            <span className="text-xs font-bold text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Lock className="h-3 w-3" /> Solo Premium
            </span>
          )}
        </div>
        {isPremium ? (
          <div className="px-5 py-4 space-y-4">
            <p className="text-xs text-gray-500">
              Tus clientes pueden instalar tu tienda en su celular como si fuera una app, sin pasar por el App Store ni Google Play.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                <p className="text-xs font-bold text-gray-700 mb-1.5">📱 En Android</p>
                <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
                  <li>Abrí tu tienda en Chrome</li>
                  <li>Tocá el menú (⋮)</li>
                  <li>Seleccioná "Instalar app"</li>
                </ol>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                <p className="text-xs font-bold text-gray-700 mb-1.5">🍎 En iPhone</p>
                <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
                  <li>Abrí tu tienda en Safari</li>
                  <li>Tocá el ícono compartir</li>
                  <li>Seleccioná "Agregar a inicio"</li>
                </ol>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
              <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-600">
                Compartí el link de tu tienda con tus clientes y pediles que la instalen. Una vez instalada aparece como un ícono en su pantalla de inicio.
              </p>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-3.5">
              <Crown className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Disponible en Tienda Premium</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Con Premium tus clientes pueden instalar tu tienda en el celular como una app, sin pasar por el App Store.
                </p>
                <Link href="/dashboard/mi-plan" className="inline-flex items-center gap-1 mt-2.5 text-xs font-bold text-amber-700 hover:text-amber-900 underline">
                  Actualizar a Premium →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dominio personalizado */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <Globe className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-gray-800">Dominio personalizado</h2>
          </div>
          {isPremium ? (
            <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Crown className="h-3 w-3" /> Premium
            </span>
          ) : (
            <span className="text-xs font-bold text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full flex items-center gap-1">
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
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-3.5">
              <Crown className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Disponible en Tienda Premium</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Con el plan Premium conectás tu propio dominio (ej: tutienda.com). Lo comprás donde quieras y nosotros lo configuramos automáticamente.
                </p>
                <Link href="/dashboard/mi-plan" className="inline-flex items-center gap-1 mt-2.5 text-xs font-bold text-amber-700 hover:text-amber-900 underline">
                  Actualizar a Premium →
                </Link>
              </div>
            </div>
          </div>
        )}
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
        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono text-amber-600 truncate">
          https://{domain}
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(`https://${domain}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="shrink-0 p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer"
          className="shrink-0 p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl">
          <Check className="h-3 w-3" /> Activo
        </span>
        <button onClick={handleRemove} disabled={removing}
          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50">
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
        <p className="text-xs text-gray-500">
          Con tu plan Premium podés tener tu propio dominio (ej: <span className="font-mono">mitienda.com</span>). ¿Ya tenés uno?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="https://www.namecheap.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-all text-center cursor-pointer"
          >
            <span className="text-2xl">🌐</span>
            <div>
              <p className="text-sm font-bold text-gray-700">No tengo</p>
              <p className="text-xs text-gray-500">Ir a comprar uno</p>
            </div>
          </a>
          <button
            onClick={() => setStep("enter")}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-all text-center"
          >
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-sm font-bold text-gray-700">Ya tengo</p>
              <p className="text-xs text-gray-500">Conectarlo ahora</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (step === "enter") {
    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-500">Escribí el dominio que compraste:</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={domain}
            onChange={(e) => { setDomain(e.target.value); setError(""); }}
            placeholder="mitienda.com"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            onClick={handleConnect}
            disabled={loading || !domain.trim()}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors disabled:opacity-50"
          >
            {loading ? "Conectando..." : "Conectar"}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={() => setStep("choice")} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← Volver
        </button>
      </div>
    );
  }

  // step === "instructions"
  const cname = "cname.vercel-dns.com";
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-bold text-amber-800">¡Casi listo! Solo un paso más 👇</p>
        <p className="text-xs text-gray-600">
          Entrá a donde compraste tu dominio (GoDaddy, Namecheap, etc.) y agregá este registro en la sección <span className="font-bold">DNS</span>:
        </p>
        <div className="bg-white border border-amber-100 rounded-xl overflow-hidden text-xs font-mono">
          <div className="grid grid-cols-3 bg-amber-100 px-3 py-2 text-amber-700 font-bold text-[11px]">
            <span>Tipo</span><span>Nombre</span><span>Valor</span>
          </div>
          <div className="grid grid-cols-3 px-3 py-3 text-gray-700 items-center">
            <span className="font-bold">CNAME</span>
            <span className="font-bold">www</span>
            <div className="flex items-center gap-1">
              <span className="truncate">{cname}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(cname); setCopiedCname(true); setTimeout(() => setCopiedCname(false), 2000); }}
                className="shrink-0 ml-1"
              >
                {copiedCname ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          ¿No encontrás dónde hacerlo? Mandanos un mensaje y te ayudamos en minutos.
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-amber-600">
        <Clock className="h-3.5 w-3.5 animate-pulse" />
        Esperando activación — puede tardar hasta 24hs.
      </div>
    </div>
  );
}
