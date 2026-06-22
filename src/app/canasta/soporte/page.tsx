"use client";

import { useState } from "react";
import { ArrowLeft, Send, CheckCircle, AlertTriangle, Loader2, LifeBuoy } from "lucide-react";
import Link from "next/link";

export default function CanastaSoportePage() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [edad, setEdad] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setError("");
    if (!nombre.trim()) { setError("Decinos tu nombre y apellido"); return; }
    if (!email.trim()) { setError("Decinos tu email para poder responderte"); return; }
    if (!telefono.trim()) { setError("Decinos un teléfono de contacto"); return; }
    if (!localidad.trim()) { setError("Decinos tu localidad"); return; }
    if (mensaje.trim().length < 20) { setError("Contanos un poco más tu situación"); return; }

    setSending(true);
    try {
      const res = await fetch("/api/canasta/soporte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, telefono, localidad, edad, mensaje }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al enviar");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar. Intentá de nuevo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5]">
      <div className="max-w-lg mx-auto px-6 py-8">

        <div className="flex items-center gap-3 mb-8">
          <Link href="/comunidad" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex-1">Iniciar una solicitud</h1>
        </div>

        {sent ? (
          <div className="bg-white rounded-2xl border border-amber-900/10 p-8 text-center shadow-sm">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">¡Mensaje enviado!</h2>
            <p className="text-sm text-gray-500 mb-6">
              Recibimos tu consulta y vamos a evaluar tu situación. Te respondemos por email a la brevedad.
            </p>
            <button
              onClick={() => { setSent(false); setNombre(""); setEmail(""); setTelefono(""); setLocalidad(""); setEdad(""); setMensaje(""); }}
              className="text-sm text-amber-700 hover:text-amber-800 font-medium"
            >
              Enviar otra consulta
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-amber-900/10 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-amber-900/10 bg-amber-50">
              <LifeBuoy className="h-5 w-5 text-amber-700 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900">¿Necesitás ayuda?</p>
                <p className="text-xs text-amber-700">
                  Contanos tu situación y la evaluamos con seriedad. Respondemos por email.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">Nombre y apellido</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre y apellido"
                  maxLength={120}
                  className="w-full rounded-xl border border-amber-900/10 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Para responderte"
                    maxLength={160}
                    className="w-full rounded-xl border border-amber-900/10 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600">Teléfono</label>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Tu teléfono"
                    maxLength={40}
                    className="w-full rounded-xl border border-amber-900/10 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600">Localidad</label>
                  <input
                    type="text"
                    value={localidad}
                    onChange={(e) => setLocalidad(e.target.value)}
                    placeholder="Tu localidad"
                    maxLength={120}
                    className="w-full rounded-xl border border-amber-900/10 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600">Edad (opcional)</label>
                  <input
                    type="number"
                    min={0}
                    value={edad}
                    onChange={(e) => setEdad(e.target.value)}
                    placeholder="Tu edad"
                    className="w-full rounded-xl border border-amber-900/10 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">Contanos tu situación</label>
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Contanos con el mayor detalle posible qué está pasando."
                  maxLength={1500}
                  rows={6}
                  className="w-full rounded-xl border border-amber-900/10 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
                <p className="text-right text-[11px] text-gray-400">{mensaje.length}/1500</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-green-600 hover:from-amber-600 hover:to-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-all"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Enviando..." : "Enviar consulta"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
