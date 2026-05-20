"use client";

import { useState } from "react";
import { Shield, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

export default function SetupAdminPage() {
  const [form, setForm] = useState({ secret: "", email: "", password: "", name: "Admin" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-setup-secret": form.secret,
        },
        body: JSON.stringify({ email: form.email, password: form.password, name: form.name }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, message: `Cuenta admin creada: ${data.user.email}` });
      } else {
        setResult({ ok: false, message: data.error ?? "Error desconocido" });
      }
    } catch {
      setResult({ ok: false, message: "Error de red. Intentá de nuevo." });
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-black text-white">Crear cuenta admin</h1>
          <p className="text-gray-400 text-sm mt-2">Solo se puede usar una vez.</p>
        </div>

        {result ? (
          <div className={`rounded-2xl p-6 text-center border ${result.ok ? "bg-emerald-950/30 border-emerald-500/30" : "bg-red-950/30 border-red-500/30"}`}>
            {result.ok
              ? <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
              : <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            }
            <p className={`font-semibold text-sm ${result.ok ? "text-emerald-300" : "text-red-300"}`}>{result.message}</p>
            {result.ok && (
              <a href="/login" className="mt-4 inline-block bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all">
                Ir al login →
              </a>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Palabra clave secreta</label>
              <input
                type="password" required value={form.secret}
                onChange={(e) => setForm(p => ({ ...p, secret: e.target.value }))}
                placeholder="La que configuraste en Vercel"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Nombre</label>
              <input
                type="text" required value={form.name}
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Admin"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email del admin</label>
              <input
                type="email" required value={form.email}
                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="admin@tudominio.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Contraseña (mínimo 16 caracteres)</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} required value={form.password}
                  onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Contraseña muy segura"
                  minLength={16}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.password.length > 0 && form.password.length < 16 && (
                <p className="text-red-400 text-xs mt-1">Faltan {16 - form.password.length} caracteres</p>
              )}
            </div>
            <button
              type="submit" disabled={loading || form.password.length < 16}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold text-sm transition-all"
            >
              {loading ? "Creando cuenta..." : "Crear cuenta admin"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
