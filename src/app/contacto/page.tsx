"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBag, Package, MessageCircle, Send, Loader2, CheckCircle2, Mail, Clock, MapPin } from "lucide-react";

export default function ContactoPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al enviar."); return; }
      setSuccess(true);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* Navbar */}
      <nav className="bg-gray-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">TiendaApps</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#tiendas" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Tiendas</Link>
            <Link href="/#como-funciona" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Cómo funciona</Link>
            <Link href="/quienes-somos" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Quiénes somos</Link>
            <Link href="/precios" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Precios</Link>
            <Link href="/seguimiento" className="text-gray-400 hover:text-white text-sm font-medium transition-colors flex items-center gap-1.5"><Package className="h-4 w-4" />Seguimiento</Link>
            <Link href="/contacto" className="text-white text-sm font-medium transition-colors flex items-center gap-1.5"><MessageCircle className="h-4 w-4" />Contacto</Link>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-gray-300 hover:text-white text-sm font-medium px-5 py-2.5 rounded-xl border border-white/10 hover:border-white/25 transition-all">Iniciar sesión</Link>
            <Link href="/registro" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
              Crear cuenta
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero + form */}
      <div className="flex-1 flex items-center">
        <div className="max-w-7xl mx-auto w-full px-6 py-16 grid md:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-400/10 px-3 py-1 rounded-full mb-6">
              Estamos para ayudarte
            </span>
            <h1 className="text-5xl lg:text-6xl font-black text-white leading-none tracking-tight mb-6">
              Hablemos.<br />
              <span className="text-indigo-400">Sin vueltas.</span>
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed mb-10">
              Tenés una pregunta, un problema técnico, o querés saber más sobre TiendaApps?
              Escribinos y te respondemos a la brevedad.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600/15 rounded-xl flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Email</p>
                  <p className="text-sm text-gray-500">Respondemos en menos de 24 hs</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600/15 rounded-xl flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Horario de atención</p>
                  <p className="text-sm text-gray-500">Lunes a viernes, 9 a 18 hs</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600/15 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Ubicación</p>
                  <p className="text-sm text-gray-500">Argentina 🇦🇷</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right — form */}
          <div>
            {success ? (
              <div className="bg-gray-900 border border-white/10 rounded-2xl p-10 text-center">
                <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-black text-white mb-2">¡Mensaje enviado!</h2>
                <p className="text-gray-400 text-sm mb-6">Te respondemos en menos de 24 horas.</p>
                <button
                  onClick={() => { setSuccess(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                  className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold transition-colors"
                >
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <div className="bg-gray-900 border border-white/10 rounded-2xl p-8">
                <h2 className="text-white font-bold text-xl mb-1">Envianos un mensaje</h2>
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
                        className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-600"
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
                        className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Asunto</label>
                    <input
                      value={form.subject}
                      onChange={e => set("subject", e.target.value)}
                      placeholder="¿En qué te podemos ayudar?"
                      className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-600"
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
                      className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-600 resize-none"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl text-sm transition-colors disabled:opacity-60"
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
    </div>
  );
}
