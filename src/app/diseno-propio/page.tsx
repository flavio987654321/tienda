"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, Loader2, Sparkles, X,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { useTurnstile } from "@/components/Turnstile";
import { RUBROS, ESTETICAS, PALETAS, FOTOS, CATALOGO, LOGO, type Option } from "@/lib/designBrief";

const TOTAL_STEPS = 6;
const PER_PAGE = 6; // estéticas y paletas se muestran de a 6, con paginación

type Form = {
  tipoTienda: string;
  estetica: string;
  paleta: string;
  coloresPropios: string;
  referencias: string;
  noQuiero: string;
  nombreTienda: string;
  queVende: string;
  fotos: string;
  catalogo: string;
  logo: string;
  nombre: string;
  email: string;
  telefono: string;
  tieneTienda: "si" | "no" | "";
  tiendaUrl: string;
  acepta: boolean;
};

const EMPTY: Form = {
  tipoTienda: "", estetica: "", paleta: "", coloresPropios: "",
  referencias: "", noQuiero: "",
  nombreTienda: "", queVende: "", fotos: "", catalogo: "", logo: "",
  nombre: "", email: "", telefono: "",
  tieneTienda: "", tiendaUrl: "", acepta: false,
};

// Opciones de un toque del paso 4 (fotos / catálogo / logo). Van en un <select>
// nativo, no en botones: las etiquetas son largas ("Sí, tengo fotos propias") y
// en pantallas chicas se partían en dos líneas dentro de una pastilla angosta.
// El select siempre muestra una sola línea y en celular abre el selector nativo,
// que es la mejor experiencia táctil. El borde se pone naranja cuando ya se eligió,
// mismo lenguaje visual que el resto del formulario. `appearance-none` + chevron
// propio para que se vea igual en todos los navegadores.
function SelectField({ label, hint, options, value, onPick }: {
  label: string; hint?: string; options: Option[]; value: string; onPick: (id: string) => void;
}) {
  return (
    <div className="mb-6 last:mb-0">
      <span className="text-sm font-semibold text-gray-700 block mb-1">{label}</span>
      {hint && <span className="text-xs text-gray-400 block mb-2.5">{hint}</span>}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onPick(e.target.value)}
          className={`w-full appearance-none cursor-pointer px-4 py-3 pr-10 rounded-xl border-2 text-sm font-medium bg-white focus:outline-none transition-colors ${
            value
              ? "border-orange-500 text-gray-900 hover:border-orange-600"
              : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          <option value="" disabled>Elegí una opción</option>
          {options.map((o) => (
            <option key={o.id} value={o.id} className="text-gray-900">{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>
    </div>
  );
}

function Pager({ page, pages, onPrev, onNext }: { page: number; pages: number; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center justify-center gap-4 mt-5">
      <button
        type="button" onClick={onPrev} disabled={page === 0}
        aria-label="Ver anteriores"
        className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <span className="text-xs text-gray-400 font-medium tabular-nums">{page + 1} / {pages}</span>
      <button
        type="button" onClick={onNext} disabled={page === pages - 1}
        aria-label="Ver más opciones"
        className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function DisenoPropioPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(EMPTY);
  const [estPage, setEstPage] = useState(0);   // página de estéticas (paso 2)
  const [palPage, setPalPage] = useState(0);   // página de paletas (paso 3)
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // Honeypot anti-bot: un campo invisible para las personas. Los bots que
  // completan todo a ciegas lo llenan; si viene con algo, el server descarta el
  // envío. Es una capa barata que suma al captcha de Cloudflare.
  const [honeypot, setHoneypot] = useState("");
  const captcha = useTurnstile("diseno-propio");

  const estPages = Math.ceil(ESTETICAS.length / PER_PAGE);
  const palPages = Math.ceil(PALETAS.length / PER_PAGE);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  }

  function next() {
    if (step === 1 && !form.tipoTienda) { setError("Elegí qué vendés para seguir."); return; }
    if (step === 2 && !form.estetica)   { setError("Elegí una estética para seguir."); return; }
    if (step === 3 && !form.paleta)     { setError("Elegí una paleta para seguir."); return; }
    // Del paso 4 se piden solo las tres que cambian cómo se construye la
    // plantilla. El nombre y el logo se pueden charlar después por WhatsApp.
    if (step === 4) {
      if (!form.queVende.trim())        { setError("Contanos qué vendés exactamente — el rubro solo no alcanza."); return; }
      if (!form.fotos)                  { setError("Decinos si tenés fotos: es lo que más define el diseño."); return; }
      if (!form.catalogo)               { setError("Elegí más o menos cuántos productos vas a cargar."); return; }
    }
    setError("");
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function back() {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  }

  async function submit() {
    // Guard de doble envío: sin esto, dos clicks seguidos mandan dos briefs.
    if (sending) return;
    const nombre = form.nombre.trim();
    const email = form.email.trim();
    if (nombre.length < 2)                                   { setError("Contanos cómo te llamás."); return; }
    if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Ingresá un email válido — es por donde te vamos a escribir."); return; }
    if (form.telefono.replace(/\D/g, "").length < 8)         { setError("Dejanos un teléfono o WhatsApp para poder coordinar."); return; }
    if (!form.acepta)                                        { setError("Necesitamos que aceptes las condiciones para poder diseñarlo."); return; }
    if (!captcha.ready)                                      { setError("Esperá un segundo a que termine la verificación."); return; }

    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/diseno-propio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, website: honeypot, turnstileToken: captcha.token }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "No pudimos enviar tu idea. Probá de nuevo."); return; }
      setSent(true);
    } catch {
      setError("Error de conexión. Fijate que tengas señal y probá de nuevo.");
    } finally {
      captcha.reset();
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-white flex flex-col [color-scheme:light]">
        <SiteNav />
        <div className="flex-1 flex items-center justify-center px-6 py-24">
          <div className="text-center max-w-lg">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-teal-600" />
            </div>
            <h1 className="text-3xl font-black text-gray-950 mb-4">¡Nos llegó tu idea!</h1>
            <p className="text-gray-500 leading-relaxed mb-8">
              A la brevedad nuestro equipo se va a poner en contacto con vos a{" "}
              <strong className="text-gray-900">{form.email}</strong> (o por WhatsApp) para charlar un
              poco más sobre lo que tenés en mente y afinar el diseño antes de arrancar.
            </p>
            <p className="text-sm text-gray-400 leading-relaxed mb-8">
              Cuando el diseño esté listo te lo mostramos, y si te gusta, lo dejamos andando en tu tienda.
            </p>
            <Link href="/" className="inline-block bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-3.5 rounded-2xl transition-colors">
              Volver al inicio
            </Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col [color-scheme:light]">
      <SiteNav />

      {/* Intro. Va completa a propósito: la mayoría llega desde un link de redes
          sin saber qué es TiendaApps, así que la página tiene que explicarse sola
          en vez de dar por sentado que vieron el home. */}
      <section className="px-6 pt-16 pb-12 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6">
            <Sparkles className="h-3.5 w-3.5" /> Gratis
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-950 leading-tight mb-5">
            Diseñá tu propia tienda
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed mb-4">
            En TiendaApps armás tu tienda online con carrito, pagos y envíos. Vos elegís el diseño de una
            galería de plantillas — y si ninguna te convence, la hacemos con vos.
          </p>
          <p className="text-gray-500 leading-relaxed">
            Contanos cómo te la imaginás. No hace falta que sepas de diseño ni que tengas la tienda creada.
          </p>
        </div>
      </section>

      <section className="px-6 pb-24 flex-1">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-3xl border border-gray-200 overflow-hidden">

            {/* Progreso */}
            <div className="px-6 sm:px-8 pt-7 pb-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Paso {step} de {TOTAL_STEPS}
                </span>
                <span className="text-xs text-gray-400">{Math.round((step / TOTAL_STEPS) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-600 rounded-full transition-all duration-300"
                  style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                />
              </div>
            </div>

            <div className="px-6 sm:px-8 py-8">

              {step === 1 && (
                <>
                  <h2 className="text-2xl font-black text-gray-950 mb-2">¿Qué vas a vender?</h2>
                  <p className="text-gray-500 text-sm mb-6">
                    Cada rubro necesita cosas distintas: una tienda de ropa muestra talles y colores, una de
                    autos muestra fichas técnicas. Elegí el que más se acerca a lo tuyo.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {RUBROS.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => set("tipoTienda", r.id)}
                        className={`text-left p-4 rounded-2xl border-2 transition-all ${
                          form.tipoTienda === r.id
                            ? "border-orange-500 bg-orange-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className="text-2xl block mb-1.5">{r.emoji}</span>
                        <span className="font-bold text-sm text-gray-900 block leading-tight">{r.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed mt-6 bg-gray-50 rounded-xl p-4">
                    Antes de arrancar, para que no te agarre de sorpresa al final: el diseño que salga de tu
                    idea se va a sumar al catálogo de TiendaApps y otras tiendas van a poder usarlo. Tus
                    colores, tus fotos, tu logo y tus productos siguen siendo únicamente tuyos.
                  </p>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="text-2xl font-black text-gray-950 mb-2">Elegí el estilo</h2>
                  <p className="text-gray-500 text-sm mb-6">
                    Es la personalidad de tu tienda: cómo se ve y qué sensación transmite apenas alguien entra.
                    Tocá la que más se parezca a lo que imaginás — la barra de color es solo una muestra del clima.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {ESTETICAS.slice(estPage * PER_PAGE, estPage * PER_PAGE + PER_PAGE).map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => set("estetica", e.id)}
                        className={`text-left rounded-2xl border-2 overflow-hidden transition-all ${
                          form.estetica === e.id ? "border-orange-500" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="h-16" style={{ background: `linear-gradient(120deg, ${e.from}, ${e.to})` }} />
                        <div className="p-3.5">
                          <span className="font-bold text-sm text-gray-900 block mb-0.5">{e.label}</span>
                          <span className="text-xs text-gray-500 leading-snug block">{e.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {estPages > 1 && (
                    <Pager
                      page={estPage} pages={estPages}
                      onPrev={() => setEstPage((p) => Math.max(0, p - 1))}
                      onNext={() => setEstPage((p) => Math.min(estPages - 1, p + 1))}
                    />
                  )}
                </>
              )}

              {step === 3 && (
                <>
                  <h2 className="text-2xl font-black text-gray-950 mb-2">Elegí los colores</h2>
                  <p className="text-gray-500 text-sm mb-6">
                    Los colores base con los que se va a pintar tu tienda. No es definitivo: una vez creada
                    los cambiás cuando quieras desde tu panel. Elegí la combinación que más te gusta.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {PALETAS.slice(palPage * PER_PAGE, palPage * PER_PAGE + PER_PAGE).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => set("paleta", p.id)}
                        className={`p-4 rounded-2xl border-2 transition-all ${
                          form.paleta === p.id ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex gap-1.5 mb-2.5 justify-center">
                          {p.colors.map((c) => (
                            <span key={c} className="w-6 h-6 rounded-lg border border-black/5" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <span className="font-bold text-sm text-gray-900">{p.label}</span>
                      </button>
                    ))}
                  </div>
                  {palPages > 1 && (
                    <Pager
                      page={palPage} pages={palPages}
                      onPrev={() => setPalPage((p) => Math.max(0, p - 1))}
                      onNext={() => setPalPage((p) => Math.min(palPages - 1, p + 1))}
                    />
                  )}
                  <label className="block mt-6">
                    <span className="text-sm font-semibold text-gray-700 block mb-2">¿Ya tenés colores de marca? <span className="text-gray-400 font-normal">(opcional)</span></span>
                    <input
                      type="text"
                      value={form.coloresPropios}
                      onChange={(e) => set("coloresPropios", e.target.value)}
                      maxLength={200}
                      placeholder="Ej: verde agua y dorado, o #2dd4bf"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:outline-none text-sm bg-white text-gray-900 placeholder-gray-400"
                    />
                  </label>
                </>
              )}

              {/* Paso 4: los cinco datos que definen la anatomía de la plantilla.
                  Tres son de un toque y dos son textos cortos, así que suma un
                  paso pero casi nada de esfuerzo — sin esto hay que preguntarlo
                  todo por WhatsApp después. */}
              {step === 4 && (
                <>
                  <h2 className="text-2xl font-black text-gray-950 mb-2">Contanos de tu marca</h2>
                  <p className="text-gray-500 text-sm mb-6">
                    Esto define cómo se arma la tienda por dentro. Son cinco toques.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-3 mb-6">
                    <label className="block">
                      <span className="text-sm font-semibold text-gray-700 block mb-2">
                        ¿Cómo se llama? <span className="text-gray-400 font-normal">(opcional)</span>
                      </span>
                      <input
                        type="text"
                        value={form.nombreTienda}
                        onChange={(e) => set("nombreTienda", e.target.value)}
                        maxLength={80}
                        placeholder="El nombre de tu tienda"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:outline-none text-sm bg-white text-gray-900 placeholder-gray-400"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-gray-700 block mb-2">¿Qué vendés exactamente?</span>
                      <input
                        type="text"
                        value={form.queVende}
                        onChange={(e) => set("queVende", e.target.value)}
                        maxLength={120}
                        placeholder="Ej: remeras de mujer"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:outline-none text-sm bg-white text-gray-900 placeholder-gray-400"
                      />
                    </label>
                  </div>

                  <SelectField
                    label="¿Tenés fotos de tus productos?"
                    hint="Es lo que más define si la tienda se ve cara o barata."
                    options={FOTOS}
                    value={form.fotos}
                    onPick={(v) => set("fotos", v)}
                  />
                  <SelectField
                    label="¿Cuántos productos vas a cargar?"
                    hint="Define si hace falta buscador y filtros."
                    options={CATALOGO}
                    value={form.catalogo}
                    onPick={(v) => set("catalogo", v)}
                  />
                  <SelectField
                    label="¿Tenés logo?"
                    options={LOGO}
                    value={form.logo}
                    onPick={(v) => set("logo", v)}
                  />
                </>
              )}

              {step === 5 && (
                <>
                  <h2 className="text-2xl font-black text-gray-950 mb-2">Mostranos ejemplos</h2>
                  <p className="text-gray-500 text-sm mb-6">
                    Los dos campos son opcionales, pero esta es la parte que más nos ayuda a acertarle: un link
                    de algo que te gusta nos dice más que cualquier descripción.
                  </p>
                  <label className="block mb-5">
                    <span className="text-sm font-semibold text-gray-700 block mb-2">Sitios o cuentas que te gusten <span className="text-gray-400 font-normal">(opcional)</span></span>
                    <textarea
                      value={form.referencias}
                      onChange={(e) => set("referencias", e.target.value)}
                      rows={3}
                      maxLength={2000}
                      placeholder="Pegá hasta 3 links: tiendas, cuentas de Instagram, lo que sea que te guste cómo se ve."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:outline-none text-sm bg-white text-gray-900 placeholder-gray-400 resize-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700 block mb-2">¿Qué NO querés? <span className="text-gray-400 font-normal">(opcional)</span></span>
                    <textarea
                      value={form.noQuiero}
                      onChange={(e) => set("noQuiero", e.target.value)}
                      rows={3}
                      maxLength={2000}
                      placeholder="Ej: nada de fondo negro, no me gustan las letras finitas, sin fotos de modelos."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:outline-none text-sm bg-white text-gray-900 placeholder-gray-400 resize-none"
                    />
                  </label>
                  <p className="text-xs text-gray-400 leading-relaxed mt-5 bg-gray-50 rounded-xl p-4">
                    Si querés mandarnos fotos tuyas, escribinos después por mail. Las usamos para entender tu
                    estilo, nunca las publicamos como parte del diseño.
                  </p>
                </>
              )}

              {step === 6 && (
                <>
                  <h2 className="text-2xl font-black text-gray-950 mb-2">¿Cómo te contactamos?</h2>
                  <p className="text-gray-500 text-sm mb-6">Es lo último. No te vamos a llenar de mails.</p>
                  {/* Honeypot: invisible para las personas (fuera de pantalla, sin
                      tab, sin autocompletar), pero un bot que llena todo lo completa
                      y el server lo descarta. */}
                  <div aria-hidden="true" className="absolute w-px h-px overflow-hidden -left-[9999px]">
                    <label>
                      No completar
                      <input
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-sm font-semibold text-gray-700 block mb-2">Tu nombre</span>
                      <input
                        type="text"
                        value={form.nombre}
                        onChange={(e) => set("nombre", e.target.value)}
                        maxLength={80}
                        autoComplete="name"
                        placeholder="Cómo te llamás"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:outline-none text-sm bg-white text-gray-900 placeholder-gray-400"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-gray-700 block mb-2">Tu email</span>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        maxLength={120}
                        autoComplete="email"
                        placeholder="tu@email.com"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:outline-none text-sm bg-white text-gray-900 placeholder-gray-400"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-gray-700 block mb-2">Teléfono o WhatsApp</span>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={form.telefono}
                        onChange={(e) => set("telefono", e.target.value)}
                        maxLength={30}
                        autoComplete="tel"
                        placeholder="Ej: 11 2345 6789"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:outline-none text-sm bg-white text-gray-900 placeholder-gray-400"
                      />
                      <span className="text-xs text-gray-400 mt-1.5 block">Para poder coordinar más rápido si hace falta.</span>
                    </label>
                    <div>
                      <span className="text-sm font-semibold text-gray-700 block mb-2">¿Ya tenés tienda en TiendaApps?</span>
                      <div className="flex gap-3">
                        {(["si", "no"] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => set("tieneTienda", v)}
                            className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                              form.tieneTienda === v ? "border-orange-500 bg-orange-50 text-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-300"
                            }`}
                          >
                            {v === "si" ? "Sí" : "Todavía no"}
                          </button>
                        ))}
                      </div>
                    </div>
                    {form.tieneTienda === "si" && (
                      <label className="block">
                        <span className="text-sm font-semibold text-gray-700 block mb-2">¿Cuál es? <span className="text-gray-400 font-normal">(opcional)</span></span>
                        <input
                          type="text"
                          value={form.tiendaUrl}
                          onChange={(e) => set("tiendaUrl", e.target.value)}
                          maxLength={200}
                          placeholder="El nombre o el link de tu tienda"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:outline-none text-sm bg-white text-gray-900 placeholder-gray-400"
                        />
                      </label>
                    )}
                  </div>

                  <label className="flex items-start gap-3 mt-7 p-4 rounded-2xl bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.acepta}
                      onChange={(e) => set("acepta", e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-orange-600 flex-shrink-0"
                    />
                    <span className="text-xs text-gray-600 leading-relaxed">
                      Entiendo que el diseño que salga de esta idea se va a sumar al catálogo de TiendaApps y
                      que otras tiendas van a poder usarlo. Mis colores, mis fotos, mi logo y mis productos
                      siguen siendo míos.
                    </span>
                  </label>

                  <div className="mt-4">{captcha.widget}</div>
                </>
              )}

              {error && (
                <div className="flex items-start gap-2.5 mt-6 text-sm text-rose-700 bg-rose-50 rounded-xl px-4 py-3">
                  <X className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Navegación */}
            <div className="px-6 sm:px-8 py-5 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={back}
                disabled={step === 1}
                className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                  step === 1 ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <ArrowLeft className="h-4 w-4" /> Atrás
              </button>

              {step < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={next}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-3 rounded-xl transition-colors"
                >
                  Seguir <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  disabled={sending || !form.acepta || !captcha.ready}
                  title={!form.acepta ? "Tenés que aceptar las condiciones para enviar" : undefined}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
                >
                  {sending ? (<><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</>) : (<><Check className="h-4 w-4" /> Enviar mi idea</>)}
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Sin registrarte · Gratis · 3 minutos
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
