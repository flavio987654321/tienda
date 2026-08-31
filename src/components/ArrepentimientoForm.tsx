"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useTurnstile } from "@/components/Turnstile";
import { MAX_EMAIL, MAX_MOTIVO, MAX_NOMBRE, MAX_REFERENCIA, MAX_TELEFONO } from "@/lib/arrepentimiento";

/**
 * El botón de arrepentimiento, en su versión de formulario.
 *
 * Uno solo para los dos lados: la página legal de cada tienda y la de
 * TiendaApps. Lo único que cambia es el `slug` —sin él, la solicitud es contra
 * la plataforma— y a quién se nombra en pantalla. Dos copias de esto se
 * separarían solas, y una de las dos terminaría pidiendo un campo que la otra no
 * o mostrando un texto viejo, en la pantalla donde no se puede.
 *
 * ── Por qué pide tan poco ────────────────────────────────────────────────────
 *
 * Tres campos obligatorios: nombre, email y con qué identifica su compra. Cada
 * campo de más es una persona que abandona, y esta es justamente la pantalla
 * donde no se puede poner un obstáculo — la Resolución 424/2020 pide que se
 * pueda **iniciar** la revocación, no que se pueda iniciar completando ocho
 * casilleros.
 *
 * El motivo va al final y NO es obligatorio. Eso no es comodidad: el art. 34 de
 * la Ley 24.240 dice "sin necesidad de justificar el motivo". Pedirlo como
 * requisito sería contradecir en el formulario lo que la política promete a dos
 * solapas de distancia.
 */
export default function ArrepentimientoForm({
  slug,
  nombreDeQuienVende,
  accent = "#4f46e5",
}: {
  /** Sin slug, la solicitud va contra TiendaApps. */
  slug?: string;
  nombreDeQuienVende: string;
  accent?: string;
}) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [referencia, setReferencia] = useState("");
  const [motivo, setMotivo] = useState("");
  /* El honeypot. Una persona no lo ve —está fuera de la pantalla, fuera del
     orden de tabulación y oculto para los lectores de pantalla— pero un bot que
     completa todo lo que encuentra lo llena. Si viene con algo, el servidor
     contesta que salió bien y no hace nada. Frena al bot ANTES del captcha. */
  const [website, setWebsite] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [constancia, setConstancia] = useState("");

  const captcha = useTurnstile("arrepentimiento");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/arrepentimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug, nombre, email, telefono, referencia, motivo, website,
          turnstileToken: captcha.token,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.numero) {
        setError(data?.error || "No pudimos registrar tu solicitud. Probá de nuevo.");
        captcha.reset();
        return;
      }
      setConstancia(data.numero as string);
    } catch {
      setError("No se pudo conectar. Revisá tu internet y probá de nuevo.");
      captcha.reset();
    } finally {
      setEnviando(false);
    }
  }

  /* Enviada. Se reemplaza el formulario entero por la constancia y no se muestra
     un cartelito arriba: el número es lo único que importa en esta pantalla, y
     dejando los campos llenos abajo alguien va a apretar enviar de nuevo. */
  if (constancia) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
        <h3 className="mt-4 text-lg font-bold text-emerald-900">Tu solicitud quedó registrada</h3>
        <p className="mt-1 text-sm text-emerald-800">Este es tu número de constancia. Guardalo.</p>
        <p className="mt-5 break-all font-mono text-xl font-extrabold tracking-[0.15em] text-emerald-900 sm:text-2xl">
          {constancia}
        </p>
        <p className="mx-auto mt-5 max-w-md break-words text-sm leading-relaxed text-emerald-800">
          Te lo mandamos también por email. Le avisamos a {nombreDeQuienVende}, que se va a
          comunicar con vos para resolverlo.
        </p>
        <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-emerald-700">
          Si no tenés respuesta, podés reclamar sin cargo y sin abogado ante Defensa del
          Consumidor de tu provincia. Llevá este número.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="max-w-xl space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3.5">
        <p className="text-sm leading-relaxed text-slate-600">
          Si comprás online tenés <strong>10 días corridos</strong> desde que recibís el producto
          para arrepentirte, <strong>sin tener que explicar por qué</strong> y sin que te
          descuenten nada (Ley 24.240, art. 34). Completá esto y te damos una constancia.
        </p>
      </div>

      <Campo label="Nombre y apellido" requerido>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          maxLength={MAX_NOMBRE}
          autoComplete="name"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
        />
      </Campo>

      <Campo label="Email" requerido ayuda="Ahí te mandamos la constancia.">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={MAX_EMAIL}
          autoComplete="email"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
        />
      </Campo>

      <Campo label="Teléfono" ayuda="Opcional. Por si es más rápido llamarte.">
        <input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          maxLength={MAX_TELEFONO}
          autoComplete="tel"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
        />
      </Campo>

      {/* Texto libre y no un número con formato: del otro lado hay alguien que
          quizá no encuentra el número de pedido, y trabarle el derecho por eso
          sería exactamente lo que esta pantalla no puede hacer. */}
      <Campo
        label="¿Cuál es la compra?"
        requerido
        ayuda="El número de pedido si lo tenés a mano. Si no, el email con el que compraste y qué compraste."
      >
        <input
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
          required
          maxLength={MAX_REFERENCIA}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
        />
      </Campo>

      <Campo label="Motivo" ayuda="Opcional. No hace falta que expliques nada: la ley no te lo exige.">
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          maxLength={MAX_MOTIVO}
          className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
        />
      </Campo>

      {/* Honeypot: escondido para una persona, visible para un bot que llena todo
          lo que encuentra. `tabIndex={-1}` lo saca del orden de tabulación y
          `aria-hidden` hace que un lector de pantalla tampoco lo ofrezca, así
          que nadie que use el formulario de verdad se lo cruza. */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      {captcha.widget}

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="break-words text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={enviando || !captcha.ready}
        style={{ background: accent }}
        className="w-full rounded-lg px-5 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50 sm:w-auto"
      >
        {enviando ? "Enviando…" : "Enviar solicitud"}
      </button>
    </form>
  );
}

function Campo({
  label,
  requerido,
  ayuda,
  children,
}: {
  label: string;
  requerido?: boolean;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {requerido && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-slate-400">{ayuda}</span>}
    </label>
  );
}
