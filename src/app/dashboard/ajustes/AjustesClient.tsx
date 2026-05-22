"use client";

import { useState } from "react";
import { Globe, Smartphone, Crown, Copy, Check, ExternalLink, Info, Lock, ArrowUpRight } from "lucide-react";
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

      {/* ── Subdominio — ancho completo ── */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Globe className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Tu subdominio</h2>
              <p className="text-xs text-gray-400">Disponible desde el primer día</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            ✓ Activo
          </span>
        </div>
        <div className="px-6 py-5">
          <p className="text-xs text-gray-500 mb-4">
            Esta es la URL de tu tienda. Compartila con tus clientes y afiliados para que puedan acceder y comprar.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono text-indigo-600 truncate">
              https://{subdomain}
            </div>
            <button
              onClick={copySubdomain}
              className="shrink-0 flex items-center gap-1.5 px-4 py-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
            <a
              href={`https://${subdomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1.5 px-4 py-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir
            </a>
          </div>
        </div>
      </div>

      {/* ── Fila: PWA + Dominio personalizado ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* PWA */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isPremium ? "bg-indigo-50" : "bg-gray-50"}`}>
                <Smartphone className={`h-4 w-4 ${isPremium ? "text-indigo-500" : "text-gray-400"}`} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800">Tienda como app</h2>
                <p className="text-xs text-gray-400">Instalable en el celular</p>
              </div>
            </div>
            {isPremium ? (
              <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Crown className="h-3 w-3" /> Premium
              </span>
            ) : (
              <span className="text-xs font-semibold text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Lock className="h-3 w-3" /> Solo Premium
              </span>
            )}
          </div>

          {isPremium ? (
            <div className="px-6 py-5 space-y-4">
              <p className="text-xs text-gray-500">
                Tus clientes pueden instalar tu tienda en el celular como una app, sin pasar por el App Store ni Google Play.
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
                  Una vez instalada, aparece como ícono en la pantalla de inicio, igual que cualquier app.
                </p>
              </div>
            </div>
          ) : (
            <div className="px-6 py-5 flex flex-col gap-3">
              <p className="text-xs text-gray-500">
                Con Premium tus clientes pueden instalar tu tienda en el celular como una app, sin pasar por el App Store.
              </p>
              <div className="mt-1">
                <Link
                  href="/dashboard/mi-plan"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-800 transition-colors"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Actualizar a Premium
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Dominio personalizado */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isPremium ? "bg-amber-50" : "bg-gray-50"}`}>
                <Globe className={`h-4 w-4 ${isPremium ? "text-amber-500" : "text-gray-400"}`} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800">Dominio personalizado</h2>
                <p className="text-xs text-gray-400">Primer año incluido</p>
              </div>
            </div>
            {isPremium ? (
              <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Crown className="h-3 w-3" /> Premium
              </span>
            ) : (
              <span className="text-xs font-semibold text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Lock className="h-3 w-3" /> Solo Premium
              </span>
            )}
          </div>

          {isPremium ? (
            <div className="px-6 py-5 space-y-3">
              <p className="text-xs text-gray-500">
                Conectá tu propio dominio (ej: tutienda.com) y el primer año está incluido en tu plan.
              </p>
              {customDomain ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono text-amber-600 truncate">
                    https://{customDomain}
                  </div>
                  <span className="shrink-0 text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl">
                    ✓ Activo
                  </span>
                </div>
              ) : (
                <CustomDomainForm />
              )}
            </div>
          ) : (
            <div className="px-6 py-5 flex flex-col gap-3">
              <p className="text-xs text-gray-500">
                Con Premium conectás tu propio dominio (ej: tutienda.com) incluido el primer año, sin costo adicional.
              </p>
              <div className="mt-1">
                <Link
                  href="/dashboard/mi-plan"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-800 transition-colors"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Actualizar a Premium
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function CustomDomainForm() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    setLoading(false);
    if (res.ok) {
      setSuccess(true);
    } else {
      const data = await res.json();
      setError(data.error ?? "Error al guardar el dominio");
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <Check className="h-4 w-4 text-emerald-500" />
        <p className="text-sm text-emerald-700 font-medium">Dominio guardado. Nuestro equipo lo configurará en las próximas 24hs.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={domain}
          onChange={(e) => { setDomain(e.target.value); setError(""); }}
          placeholder="mitienda.com"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-xs text-gray-400">
        Te contactaremos para guiarte en la configuración del DNS.
      </p>
    </form>
  );
}
