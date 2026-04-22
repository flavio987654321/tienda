"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Loader2, Eye, EyeOff, ArrowRight,
  Store, Users, CheckCircle, Sparkles,
} from "lucide-react";

type AccountType = "owner" | "seller";

const OWNER_PERKS = [
  "Tienda con dominio personalizable",
  "10 plantillas de diseño incluidas",
  "Sistema de vendedoras y comisiones",
  "Panel de pedidos y stock",
];
const SELLER_PERKS = [
  "Sin inversión inicial requerida",
  "Link de afiliada con tracking",
  "Billetera digital para cobrar",
  "Panel simple desde el celular",
];

export default function RegistroPage() {
  const router = useRouter();
  const [step, setStep] = useState<"type" | "form">("type");
  const [accountType, setAccountType] = useState<AccountType>("owner");
  const [form, setForm] = useState({ name: "", email: "", password: "", storeName: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  function selectType(t: AccountType) {
    setAccountType(t);
    setStep("form");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, accountType }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al registrarse");
      setLoading(false);
      return;
    }
    router.push(accountType === "seller" ? "/login?registered=seller" : "/login?registered=true");
  }

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6 relative">
      <style>{`
        .grid-bg { background-image: linear-gradient(rgba(99,102,241,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.06) 1px, transparent 1px); background-size: 48px 48px; }
        @keyframes gradient-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .gradient-text { background: linear-gradient(135deg,#818cf8,#a78bfa,#f472b6,#818cf8); background-size:300% 300%; animation:gradient-shift 4s ease infinite; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .owner-glow { box-shadow: 0 0 0 2px #6366f1, 0 8px 32px rgba(99,102,241,.25); }
        .seller-glow { box-shadow: 0 0 0 2px #a855f7, 0 8px 32px rgba(168,85,247,.25); }
      `}</style>

      <div className="absolute inset-0 grid-bg" />
      <div className="absolute top-1/4 -left-32 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-black text-white">MiTienda</span>
          </Link>
        </div>

        <AnimatePresence mode="wait">
          {/* ── STEP 1: Elegí tu tipo ── */}
          {step === "type" && (
            <motion.div
              key="type"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="text-center mb-10">
                <h1 className="text-4xl font-black text-white mb-3">Crear cuenta gratis</h1>
                <p className="text-gray-400 text-lg">¿Cómo querés usar MiTienda?</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Dueña */}
                <button onClick={() => selectType("owner")} className="group text-left bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 hover:owner-glow rounded-3xl p-7 transition-all duration-300">
                  <div className="w-14 h-14 bg-indigo-500/15 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Store className="h-7 w-7 text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Soy dueña</h3>
                  <p className="text-gray-500 text-sm mb-5 leading-relaxed">Creá tu tienda online y gestioná tu equipo de vendedoras.</p>
                  <ul className="space-y-2 mb-6">
                    {OWNER_PERKS.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-xs text-gray-400">
                        <CheckCircle className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 text-sm text-indigo-400 font-semibold group-hover:gap-3 transition-all">
                    Crear mi tienda <ArrowRight className="h-4 w-4" />
                  </div>
                </button>

                {/* Vendedora */}
                <button onClick={() => selectType("seller")} className="group text-left bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/20 hover:seller-glow rounded-3xl p-7 transition-all duration-300">
                  <div className="w-14 h-14 bg-purple-500/15 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Users className="h-7 w-7 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Soy vendedora</h3>
                  <p className="text-gray-500 text-sm mb-5 leading-relaxed">Postulate a tiendas activas y ganás comisiones compartiendo tu link.</p>
                  <ul className="space-y-2 mb-6">
                    {SELLER_PERKS.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-xs text-gray-400">
                        <CheckCircle className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 text-sm text-purple-400 font-semibold group-hover:gap-3 transition-all">
                    Postularme <ArrowRight className="h-4 w-4" />
                  </div>
                </button>
              </div>

              <p className="text-center text-sm text-gray-600 mt-8">
                ¿Ya tenés cuenta?{" "}
                <Link href="/login" className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
                  Iniciar sesión →
                </Link>
              </p>
            </motion.div>
          )}

          {/* ── STEP 2: Formulario ── */}
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {/* Type indicator */}
              <div className="flex items-center justify-between mb-8">
                <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${accountType === "owner" ? "bg-indigo-500/10 border-indigo-500/25" : "bg-purple-500/10 border-purple-500/25"}`}>
                  {accountType === "owner"
                    ? <Store className="h-4 w-4 text-indigo-400" />
                    : <Users className="h-4 w-4 text-purple-400" />
                  }
                  <span className={`text-sm font-semibold ${accountType === "owner" ? "text-indigo-300" : "text-purple-300"}`}>
                    {accountType === "owner" ? "Dueña · crear tienda" : "Vendedora · postularme"}
                  </span>
                </div>
                <button
                  onClick={() => setStep("type")}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2"
                >
                  Cambiar
                </button>
              </div>

              <div className="text-center mb-8">
                <h1 className="text-3xl font-black text-white mb-2">Completá tus datos</h1>
                <p className="text-gray-500">
                  {accountType === "owner"
                    ? "Tu tienda estará lista en segundos."
                    : "Te mandamos al panel de vendedora."}
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3.5 rounded-2xl text-sm mb-6"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Tu nombre completo</label>
                  <input
                    type="text" name="name" value={form.name} onChange={handleChange}
                    required placeholder="María García"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm hover:border-white/20 transition-all"
                  />
                </div>

                {accountType === "owner" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3 }}
                  >
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Nombre de tu tienda</label>
                    <input
                      type="text" name="storeName" value={form.storeName} onChange={handleChange}
                      required placeholder="Ej: Joyas María, Luna Moda..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm hover:border-white/20 transition-all"
                    />
                    <p className="text-xs text-gray-600 mt-1.5">Tu tienda quedará en mitienda.ar/<span className="text-gray-500">{form.storeName ? form.storeName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "tu-tienda" : "tu-tienda"}</span></p>
                  </motion.div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
                  <input
                    type="email" name="email" value={form.email} onChange={handleChange}
                    required placeholder="tu@email.com"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm hover:border-white/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"} name="password" value={form.password} onChange={handleChange}
                      required minLength={6} placeholder="Mínimo 6 caracteres"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 pr-12 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm hover:border-white/20 transition-all"
                    />
                    <button
                      type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {accountType === "seller" && (
                  <div className="bg-purple-500/5 border border-purple-500/15 rounded-2xl p-4 flex items-start gap-3">
                    <Users className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Al crear tu cuenta vas a poder explorar tiendas activas, enviar tu presentación y empezar a vender por comisión.
                    </p>
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  className={`w-full text-white py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] mt-2 ${
                    accountType === "owner"
                      ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20 hover:shadow-indigo-500/40"
                      : "bg-purple-600 hover:bg-purple-500 shadow-purple-500/20 hover:shadow-purple-500/40"
                  }`}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading
                    ? "Creando cuenta..."
                    : accountType === "owner"
                    ? "Crear mi tienda gratis"
                    : "Crear cuenta de vendedora"}
                </button>

                <p className="text-center text-xs text-gray-600 pt-1">
                  Al registrarte aceptás los{" "}
                  <span className="text-gray-500 underline cursor-pointer">términos y condiciones</span>.
                </p>
              </form>

              <p className="text-center text-sm text-gray-600 mt-6">
                ¿Ya tenés cuenta?{" "}
                <Link href="/login" className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
                  Iniciar sesión →
                </Link>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
