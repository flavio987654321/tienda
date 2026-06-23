"use client";

import { useState } from "react";
import { ArrowLeft, Send, CheckCircle, AlertTriangle, Loader2, LifeBuoy } from "lucide-react";
import Link from "next/link";

const CATEGORIAS = [
  { value: "retiro", label: "Problema con un retiro" },
  { value: "comision", label: "Comisión incorrecta o faltante" },
  { value: "cuenta", label: "Problema con mi cuenta" },
  { value: "tecnico", label: "Error técnico en la plataforma" },
  { value: "otro", label: "Otro" },
];

export default function SoportePage() {
  const [categoria, setCategoria] = useState("");
  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!categoria) { setError("Seleccioná una categoría"); return; }
    if (!asunto.trim()) { setError("Escribí un asunto"); return; }
    if (mensaje.trim().length < 20) { setError("El mensaje es muy corto, contanos más detalle"); return; }

    setSending(true);
    try {
      const res = await fetch("/api/afiliados/soporte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoria, asunto, mensaje }),
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
    <div className="min-h-screen bg-gray-50 dark:bg-[#030712]">
      <div className="max-w-lg mx-auto px-6 py-8">

        <div className="flex items-center gap-3 mb-8">
          <Link href="/afiliados" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex-1">Soporte</h1>
        </div>

        {sent ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 p-8 text-center shadow-sm">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">¡Mensaje enviado!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Recibimos tu consulta. Te respondemos en las próximas 24–48 hs hábiles por email.
            </p>
            <button
              onClick={() => { setSent(false); setCategoria(""); setAsunto(""); setMensaje(""); }}
              className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-medium"
            >
              Enviar otra consulta
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 dark:border-white/10 bg-indigo-50 dark:bg-indigo-900/20">
              <LifeBuoy className="h-5 w-5 text-indigo-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">¿Necesitás ayuda?</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400">Respondemos en 24–48 hs hábiles por email.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Categoría</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccioná una categoría...</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Asunto</label>
                <input
                  type="text"
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  placeholder="Ej: No me llegó la comisión de una venta"
                  maxLength={120}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Descripción del problema</label>
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Contanos qué pasó con el mayor detalle posible: fechas, montos, nombre de la tienda, etc."
                  maxLength={1500}
                  rows={5}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <p className="text-right text-[11px] text-gray-400">{mensaje.length}/1500</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
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
