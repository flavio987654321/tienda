"use client";

import { useState } from "react";
import { Globe, Smartphone, Crown, Copy, Check, ExternalLink, Lock, ArrowUpRight } from "lucide-react";
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
    <div className="max-w-2xl space-y-8">

      {/* ── URL de tu tienda ── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
          URL de tu tienda
        </p>
        <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <Globe className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Tu subdominio</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Compartila con clientes y afiliados. Funciona desde el primer día.
              </p>
            </div>
            <span className="ml-auto shrink-0 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              ✓ Activo
            </span>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 p-1 pl-4">
            <span className="flex-1 text-sm font-mono text-indigo-600 truncate">
              https://{subdomain}
            </span>
            <button
              onClick={copySubdomain}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
            <a
              href={`https://${subdomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir
            </a>
          </div>
        </div>
      </div>

      {/* ── Funciones Premium ── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
          Funciones Premium
        </p>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-100">

          {/* Tienda como app */}
          <div className="px-6 py-5">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isPremium ? "bg-indigo-50" : "bg-gray-50"}`}>
                <Smartphone className={`h-4 w-4 ${isPremium ? "text-indigo-500" : "text-gray-400"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-sm font-semibold ${isPremium ? "text-gray-800" : "text-gray-400"}`}>
                    Tienda como app
                  </p>
                  {isPremium ? (
                    <span className="shrink-0 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Crown className="h-3 w-3" /> Premium
                    </span>
                  ) : (
                    <Link
                      href="/dashboard/mi-plan"
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-800 transition-colors"
                    >
                      <ArrowUpRight className="h-3 w-3" /> Activar
                    </Link>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Tus clientes instalan la tienda en su celular sin pasar por el App Store.
                </p>
                {isPremium && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3.5">
                      <p className="text-xs font-bold text-gray-700 mb-2">📱 Android</p>
                      <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
                        <li>Abrí en Chrome</li>
                        <li>Menú → "Instalar app"</li>
                      </ol>
                    </div>
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3.5">
                      <p className="text-xs font-bold text-gray-700 mb-2">🍎 iPhone</p>
                      <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
                        <li>Abrí en Safari</li>
                        <li>Compartir → "Inicio"</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dominio personalizado */}
          <div className="px-6 py-5">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isPremium ? "bg-amber-50" : "bg-gray-50"}`}>
                <Globe className={`h-4 w-4 ${isPremium ? "text-amber-500" : "text-gray-400"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-sm font-semibold ${isPremium ? "text-gray-800" : "text-gray-400"}`}>
                    Dominio personalizado
                  </p>
                  {isPremium ? (
                    <span className="shrink-0 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Crown className="h-3 w-3" /> Premium
                    </span>
                  ) : (
                    <Link
                      href="/dashboard/mi-plan"
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-800 transition-colors"
                    >
                      <ArrowUpRight className="h-3 w-3" /> Activar
                    </Link>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Conectá tu propio dominio (ej: tutienda.com). El primer año está incluido.
                </p>
                {isPremium && (
                  <div className="mt-4">
                    {customDomain ? (
                      <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 p-1 pl-4">
                        <span className="flex-1 text-sm font-mono text-amber-600 truncate">
                          https://{customDomain}
                        </span>
                        <span className="shrink-0 text-xs text-emerald-600 font-semibold bg-white border border-emerald-200 px-3 py-1.5 rounded-lg">
                          ✓ Activo
                        </span>
                      </div>
                    ) : (
                      <CustomDomainForm />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {!isPremium && (
          <p className="text-xs text-gray-400 mt-3 text-center">
            <Link href="/dashboard/mi-plan" className="font-semibold text-amber-600 hover:text-amber-800 transition-colors">
              Actualizá a Premium
            </Link>{" "}
            para activar estas funciones.
          </p>
        )}
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
        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
        <p className="text-xs text-emerald-700 font-medium">Dominio guardado. Nuestro equipo lo configurará en las próximas 24hs.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
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
          {loading ? "..." : "Guardar"}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-xs text-gray-400">Te contactaremos para guiarte con la configuración del DNS.</p>
    </form>
  );
}
