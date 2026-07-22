"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2, Mail, Clock, MapPin } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { useTurnstile } from "@/components/Turnstile";

export default function ContactoPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const captcha = useTurnstile("contacto");

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || form.name.trim().length < 2) { setError("Ingresá tu nombre (mínimo 2 caracteres)."); return; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError("Ingresá un email válido."); return; }
    if (!form.message.trim() || form.message.trim().length < 10) { setError("El mensaje es muy corto (mínimo 10 caracteres)."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, turnstileToken: captcha.token }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al enviar."); return; }
      setSuccess(true);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      captcha.reset();
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">

      <SiteNav active="contacto" />

      {/* Hero + form */}
      <div className="flex-1 flex items-center">
        <div className="max-w-7xl mx-auto w-full px-6 py-16 grid md:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full mb-6">
              Estamos para ayudarte
            </span>
            <h1 className="text-5xl lg:text-6xl font-black text-gray-950 leading-none tracking-tight mb-6">
              Hablemos.<br />
              <span className="text-orange-600">Sin vueltas.</span>
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed mb-10">
              Tenés una pregunta, un problema técnico, o querés saber más sobre TiendaApps?
              Escribinos y te respondemos a la brevedad.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Email</p>
                  <p className="text-sm text-gray-500">Respondemos en menos de 24 hs</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Horario de atención</p>
                  <p className="text-sm text-gray-500">Lunes a viernes, 9 a 18 hs</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Ubicación</p>
                  <p className="text-sm text-gray-500">Argentina 🇦🇷</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right — form */}
          <div>
            {success ? (
              <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-10 text-center">
                <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="h-8 w-8 text-teal-600" />
                </div>
                <h2 className="text-xl font-black text-gray-950 mb-2">¡Mensaje enviado!</h2>
                <p className="text-gray-500 text-sm mb-6">Te respondemos en menos de 24 horas.</p>
                <button
                  onClick={() => { setSuccess(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                  className="text-orange-600 hover:text-orange-700 text-sm font-semibold transition-colors"
                >
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-8">
                <h2 className="text-gray-950 font-bold text-xl mb-1">Envianos un mensaje</h2>
                <p className="text-gray-500 text-sm mb-6">Te respondemos a tu email.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombre *</label>
                      <input
                        required
                        minLength={2}
                        value={form.name}
                        onChange={e => set("name", e.target.value)}
                        placeholder="Tu nombre"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder:text-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email *</label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={e => set("email", e.target.value)}
                        placeholder="tu@email.com"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Asunto</label>
                    <input
                      value={form.subject}
                      onChange={e => set("subject", e.target.value)}
                      placeholder="¿En qué te podemos ayudar?"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mensaje *</label>
                    <textarea
                      required
                      minLength={10}
                      value={form.message}
                      onChange={e => set("message", e.target.value)}
                      placeholder="Contanos tu consulta con el mayor detalle posible..."
                      rows={5}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder:text-gray-400 resize-none"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  {captcha.widget}

                  <button
                    type="submit"
                    disabled={loading || !captcha.ready}
                    className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 rounded-xl text-sm transition-colors disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Enviar mensaje
                  </button>
                </form>
              </div>
            )}
          </div>

        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
