"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { DEFAULT_CONFIG, type StoreConfig } from "@/types/store-config";

type FieldKey = "googleAnalyticsId" | "facebookPixelId";

const FIELD_CONFIG: Record<FieldKey, {
  label: string;
  placeholder: string;
  regex: RegExp;
  errorMsg: string;
  helpText: string;
  steps: string[];
  linkHref: string;
  linkLabel: string;
}> = {
  googleAnalyticsId: {
    label: "ID de medición",
    placeholder: "G-XXXXXXXXXX",
    regex: /^G-[A-Za-z0-9]+$/,
    errorMsg: 'Tiene que empezar con "G-" (ej: G-AB12CD3EF4). Revisalo en tu cuenta de Google Analytics.',
    helpText: "Gratis. Te muestra cuántas visitas tiene tu tienda y de dónde vienen.",
    steps: [
      "Entrá a analytics.google.com con tu cuenta de Google (o creá una, es gratis).",
      'Creá una "Propiedad" para tu tienda (nombre, zona horaria, moneda).',
      'Andá a Administrar (ícono de engranaje abajo a la izquierda) → Flujos de datos → elegí o creá un flujo "Web".',
      'Ahí arriba vas a ver el "ID de medición" (formato G-XXXXXXXXXX) — copialo y pegalo acá abajo.',
    ],
    linkHref: "https://analytics.google.com",
    linkLabel: "Ir a Google Analytics",
  },
  facebookPixelId: {
    label: "ID del Pixel",
    placeholder: "Solo números, ej: 1234567890123",
    regex: /^\d+$/,
    errorMsg: "Tiene que ser solo números. Revisalo en Meta Business Suite → Administrador de eventos.",
    helpText: "Gratis. Si hacés publicidad en Instagram/Facebook, esto hace que tus anuncios rindan más.",
    steps: [
      "Entrá a business.facebook.com con tu cuenta de Facebook o Instagram.",
      "Andá al Administrador de eventos (lo encontrás en el menú, o en business.facebook.com/events_manager).",
      'Si no tenés un Pixel creado, tocá "Conectar fuente de datos" → "Web" → "Meta Pixel" y seguí los pasos.',
      "Una vez creado, vas a ver su ID (solo números) en la lista de fuentes de datos — copialo y pegalo acá abajo.",
    ],
    linkHref: "https://business.facebook.com/events_manager",
    linkLabel: "Ir al Administrador de eventos",
  },
};

export default function AnalyticsFieldApp({ field }: { field: FieldKey }) {
  const cfg = FIELD_CONFIG[field];
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/configuracion")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        let parsed: Partial<StoreConfig> = {};
        try { parsed = JSON.parse(d.store?.storeConfig ?? "{}"); } catch { /* config inválido */ }
        const merged = { ...DEFAULT_CONFIG, ...parsed };
        setConfig(merged);
        setValue(merged.analytics?.[field] ?? "");
      })
      .catch(() => setConfig(DEFAULT_CONFIG));
  }, [field]);

  const trimmed = value.trim();
  const isValid = !trimmed || cfg.regex.test(trimmed);

  async function save() {
    if (!config || !isValid) return;
    setSaving(true);
    setSaved(false);
    const storeConfig = { ...config, analytics: { ...config.analytics, [field]: trimmed } };
    const res = await fetch("/api/configuracion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeConfig }),
    });
    setSaving(false);
    if (res.ok) {
      setConfig(storeConfig);
      setSaved(true);
    }
  }

  if (!config) {
    return <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</div>;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
      {saved && (
        <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-4">
          <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
          <p className="text-sm font-semibold text-emerald-800">Guardado.</p>
        </div>
      )}
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{cfg.label}</label>
      <input
        value={value}
        placeholder={cfg.placeholder}
        onChange={(e) => { setValue(e.target.value); setSaved(false); }}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
      />
      {trimmed && !isValid ? (
        <p className="mt-1.5 text-xs text-red-500">{cfg.errorMsg}</p>
      ) : (
        <>
          <p className="mt-1.5 text-xs text-slate-400">{cfg.helpText}</p>
          <details className="mt-2">
            <summary className="text-xs font-semibold text-indigo-600 cursor-pointer">¿Cómo consigo el ID? Ver los pasos</summary>
            <ol className="mt-2 pl-4 text-xs text-slate-500 leading-relaxed list-decimal space-y-1">
              {cfg.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
            <a href={cfg.linkHref} target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs font-semibold text-indigo-600">
              {cfg.linkLabel} →
            </a>
          </details>
        </>
      )}

      {trimmed && (
        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-[11px] text-amber-800 leading-relaxed">
          <strong>Obligación legal:</strong> Al activar esto estás instalando cookies de terceros en tu tienda. Según la Ley 25.326 de Protección de Datos Personales, debés informarlo en la política de privacidad de tu tienda y obtener el consentimiento de tus compradores. TiendaApps no es responsable por el incumplimiento de esta obligación.
        </div>
      )}

      <button
        onClick={save}
        disabled={saving || !isValid}
        className="mt-4 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-40"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
        Guardar
      </button>
    </div>
  );
}
