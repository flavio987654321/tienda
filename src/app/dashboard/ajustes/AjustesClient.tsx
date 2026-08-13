"use client";

import { useState } from "react";
import { Globe, Smartphone, Crown, Copy, Check, ExternalLink, Info, Lock, Clock, Trash2, Bell, Sparkles, AlignLeft, Save, Loader2 } from "lucide-react";
import PushNotificationToggle from "@/components/PushNotificationToggle";
import Link from "next/link";

type Props = {
  slug: string;
  customDomain: string | null;
  isPremium: boolean;
  description: string;
  tipoTienda?: string;
};

export default function AjustesClient({ slug, customDomain, isPremium, description, tipoTienda }: Props) {
  const isAutos = tipoTienda === "AUTOS";
  const [copied, setCopied] = useState(false);
  const [desc, setDesc] = useState(description);
  const [savedDesc, setSavedDesc] = useState(description);
  const [descSaving, setDescSaving] = useState(false);
  const [descSaved, setDescSaved] = useState(false);
  const [descError, setDescError] = useState("");

  async function saveDescription() {
    setDescSaving(true);
    setDescError("");
    try {
      const res = await fetch("/api/store/description", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc }),
      });
      if (!res.ok) throw new Error();
      setSavedDesc(desc);
      setDescSaved(true);
      setTimeout(() => setDescSaved(false), 2500);
    } catch {
      setDescError("No se pudo guardar. Intentá de nuevo.");
    } finally {
      setDescSaving(false);
    }
  }
  const subdomain = `${slug}.tiendaapps.com`;

  function copySubdomain() {
    navigator.clipboard.writeText(`https://${subdomain}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">

      {/* Descripción breve */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* La aclaración baja abajo del título en angosto. Peleando el mismo
            renglón se partían las dos —"Descripción / breve" y "Se muestra en el
            listado / de tiendas"— y quedaban dos bloques de texto del mismo peso
            visual, sin que se entienda cuál es el título y cuál la aclaración.
            Abajo, con el sangrado del ícono, se lee como lo que es. */}
        <div className="flex flex-col gap-1 px-5 py-4 border-b border-slate-100 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-3">
            <AlignLeft className="h-4 w-4 text-slate-400 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-900">Descripción breve</h2>
          </div>
          <span className="pl-7 text-xs text-slate-400 sm:ml-auto sm:pl-0">Se muestra en el listado de tiendas</span>
        </div>
        <div className="px-5 py-4 space-y-3">
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            maxLength={150}
            /* 3 renglones y no 2: en un teléfono entran unos 45 caracteres por
               renglón, así que los 150 que admite el campo ocupan más de tres.
               Con 2 el texto scrolleaba adentro de la caja y no se podía releer
               lo escrito de un vistazo, que es justo lo que hace falta acá. */
            rows={3}
            placeholder={isAutos ? "Ej: Concesionaria oficial en Córdoba. Autos, motos y camionetas nuevos y usados." : "Ej: Ropa femenina para todas las tallas, con envíos a todo el país."}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{desc.length}/150 caracteres</span>
            <button
              onClick={saveDescription}
              disabled={descSaving || desc === savedDesc}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-40"
            >
              {descSaving
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : descSaved
                ? <Check className="h-3.5 w-3.5" />
                : <Save className="h-3.5 w-3.5" />}
              {descSaving ? "Guardando..." : descSaved ? "¡Guardado!" : "Guardar"}
            </button>
          </div>
          {descError && <p className="text-xs text-red-500">{descError}</p>}
        </div>
      </div>

      {/* Subdominio */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <Globe className="h-4 w-4 text-slate-400 shrink-0" />
          <h2 className="text-sm font-semibold text-slate-900">Tu subdominio</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-slate-500">
            Tu tienda está disponible en esta URL. Compartila con tus clientes y afiliados.
          </p>
          {/* La URL se lleva su propio renglón y se parte si hace falta, en vez
              de truncarse. Compartía renglón con "Copiar" y "Ver", los dos
              `shrink-0`, así que en 360 le quedaban unos 98px de ancho útil y
              mostraba "https:/…" — la dirección de la tienda, que es el dato
              para el que existe esta tarjeta, era justo lo que no se podía leer.
              Truncar sirve para una etiqueta; para un valor que hay que copiar a
              mano o dictar por teléfono, no. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-mono text-slate-700 break-all">
              https://{subdomain}
            </div>
            {/* Los dos botones se reparten el renglón en angosto. */}
            <div className="flex gap-2">
              <button
                onClick={copySubdomain}
                className="flex flex-1 shrink-0 items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors sm:flex-none"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
              <a
                href={`https://${subdomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 shrink-0 items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors sm:flex-none"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ver
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* PWA */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Smartphone className="h-4 w-4 text-slate-400 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-900">{isAutos ? "Tu sitio como app" : "Tu tienda como app"}</h2>
          </div>
          {isPremium ? (
            <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md flex items-center gap-1">
              <Crown className="h-3 w-3" /> Premium
            </span>
          ) : (
            <span className="shrink-0 whitespace-nowrap text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md flex items-center gap-1">
              <Lock className="h-3 w-3 shrink-0" /> Solo Premium
            </span>
          )}
        </div>
        {isPremium ? (
          <div className="px-5 py-4 space-y-4">
            <p className="text-sm text-slate-500">
              {isAutos
                ? "Tus clientes pueden instalar tu sitio en su celular como si fuera una app, sin pasar por el App Store ni Google Play."
                : "Tus clientes pueden instalar tu tienda en su celular como si fuera una app, sin pasar por el App Store ni Google Play."}
            </p>
            {/* Los dos instructivos van uno abajo del otro en angosto. Partidos
                en dos quedaban 125px de texto útil por columna, y cada paso
                ("Abrí tu tienda en Chrome") salía en dos o tres renglones — que
                es justo donde se lee peor un instructivo numerado. */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-xs font-semibold text-slate-700 mb-1.5">Android</p>
                <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
                  <li>Abrí tu tienda en Chrome</li>
                  <li>Tocá el menú (⋮)</li>
                  <li>Seleccioná &quot;Instalar app&quot;</li>
                </ol>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-xs font-semibold text-slate-700 mb-1.5">iPhone</p>
                <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
                  <li>Abrí tu tienda en Safari</li>
                  <li>Tocá el ícono compartir</li>
                  <li>Seleccioná &quot;Agregar a inicio&quot;</li>
                </ol>
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-lg p-3.5">
              <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-600">
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
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-slate-400 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-900">Dominio personalizado</h2>
          </div>
          {isPremium ? (
            <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md flex items-center gap-1">
              <Crown className="h-3 w-3" /> Premium
            </span>
          ) : (
            <span className="shrink-0 whitespace-nowrap text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md flex items-center gap-1">
              <Lock className="h-3 w-3 shrink-0" /> Solo Premium
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
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-slate-400 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-900">Flyer de publicidad</h2>
          </div>
          {isPremium ? (
            <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md flex items-center gap-1">
              <Crown className="h-3 w-3" /> Premium
            </span>
          ) : (
            <span className="shrink-0 whitespace-nowrap text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md flex items-center gap-1">
              <Lock className="h-3 w-3 shrink-0" /> Solo Premium
            </span>
          )}
        </div>
        {isPremium ? (
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-slate-500">
              Mostrá un flyer publicitario cada vez que alguien entra a tu tienda. Subí hasta 3 imágenes en formato vertical (tipo historia de Instagram).
            </p>
            <Link
              href="/dashboard/configuracion"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
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
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <Bell className="h-4 w-4 text-slate-400 shrink-0" />
          <h2 className="text-sm font-semibold text-slate-900">Notificaciones push</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-slate-500">
            {isAutos
              ? "Recibí alertas en este dispositivo cuando llegue una nueva consulta o solicitud de afiliado, incluso con el panel cerrado."
              : "Recibí alertas en este dispositivo cuando llegue un nuevo pedido o solicitud de afiliado, incluso con el panel cerrado."}
          </p>
          <PushNotificationToggle />
        </div>
      </div>

    </div>
  );
}

function PremiumGate({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
      <Crown className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-amber-900">{title}</p>
        <p className="text-xs text-amber-600 mt-0.5">{description}</p>
        <Link href="/dashboard/mi-plan" className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors">
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
        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-mono text-slate-700 truncate">
          https://{domain}
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(`https://${domain}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="shrink-0 p-2.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer"
          className="shrink-0 p-2.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg">
          <Check className="h-3 w-3" /> Activo
        </span>
        <button onClick={handleRemove} disabled={removing}
          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors disabled:opacity-50">
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
        <p className="text-sm text-slate-500">
          Con tu plan Premium podés usar tu propio dominio (ej: <span className="font-mono text-slate-700">mitienda.com</span>). ¿Ya tenés uno?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="https://www.namecheap.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2.5 p-4 rounded-lg border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all text-center"
          >
            <ExternalLink className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-sm font-semibold text-slate-700">No tengo</p>
              <p className="text-xs text-slate-400">Ir a comprar uno</p>
            </div>
          </a>
          <button
            onClick={() => setStep("enter")}
            className="flex flex-col items-center gap-2.5 p-4 rounded-lg border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all text-center"
          >
            <Check className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-sm font-semibold text-slate-700">Ya tengo</p>
              <p className="text-xs text-slate-400">Conectarlo ahora</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (step === "enter") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-500">Escribí el dominio que compraste:</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={domain}
            onChange={(e) => { setDomain(e.target.value); setError(""); }}
            placeholder="mitienda.com"
            className="flex-1 border border-slate-200 bg-white rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
          />
          <button
            onClick={handleConnect}
            disabled={loading || !domain.trim()}
            className="px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Conectando..." : "Conectar"}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={() => setStep("choice")} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
          ← Volver
        </button>
      </div>
    );
  }

  const cname = "cname.vercel-dns.com";
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
        <p className="text-sm font-semibold text-amber-900">¡Casi listo! Solo un paso más</p>
        <p className="text-xs text-slate-600">
          Entrá a donde compraste tu dominio y agregá este registro en la sección <span className="font-semibold text-slate-800">DNS</span>:
        </p>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden text-xs font-mono">
          <div className="grid grid-cols-3 bg-slate-50 px-3 py-2 text-slate-500 font-semibold text-[11px] tracking-wider border-b border-slate-200">
            <span>TIPO</span><span>NOMBRE</span><span>VALOR</span>
          </div>
          <div className="grid grid-cols-3 px-3 py-3 text-slate-700 items-center">
            <span className="font-bold text-slate-900">CNAME</span>
            <span className="font-bold text-slate-900">www</span>
            <div className="flex items-center gap-1.5">
              <span className="truncate">{cname}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(cname); setCopiedCname(true); setTimeout(() => setCopiedCname(false), 2000); }}
                className="shrink-0 ml-1 text-slate-400 hover:text-slate-700 transition-colors"
              >
                {copiedCname ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          ¿No encontrás dónde hacerlo? Mandanos un mensaje y te ayudamos en minutos.
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Clock className="h-3.5 w-3.5 animate-pulse" />
        Esperando activación — puede tardar hasta 24hs.
      </div>
    </div>
  );
}
