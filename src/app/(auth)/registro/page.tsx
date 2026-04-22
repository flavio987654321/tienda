"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Loader2, Eye, EyeOff, ArrowRight,
  Store, Users, CheckCircle, ShoppingCart,
} from "lucide-react";

type AccountType = "owner" | "seller" | "buyer";

const TYPES = [
  {
    key: "owner" as AccountType,
    icon: Store,
    color: "indigo",
    title: "Tengo una tienda",
    desc: "Creá tu tienda online, personalizá el diseño y gestioná tu equipo de vendedores.",
    perks: [
      "Tienda con dominio personalizable",
      "10 plantillas de diseño incluidas",
      "Sistema de vendedores y comisiones",
      "Panel de pedidos y stock",
    ],
    cta: "Crear mi tienda",
  },
  {
    key: "seller" as AccountType,
    icon: Users,
    color: "purple",
    title: "Soy vendedor/a",
    desc: "Postulate a tiendas activas y ganá comisiones compartiendo tu link.",
    perks: [
      "Sin inversión inicial requerida",
      "Link de vendedor con tracking",
      "Billetera digital para cobrar",
      "Panel simple desde el celular",
    ],
    cta: "Postularme",
  },
  {
    key: "buyer" as AccountType,
    icon: ShoppingCart,
    color: "pink",
    title: "Soy cliente",
    desc: "Explorá tiendas, guardá tus favoritos y seguí el estado de tus pedidos.",
    perks: [
      "Favoritos sincronizados en todos tus dispositivos",
      "Historial de pedidos y seguimiento",
      "Checkout más rápido con datos guardados",
      "Calificá los productos que compraste",
    ],
    cta: "Crear mi cuenta",
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; ring: string; text: string; btn: string; check: string }> = {
  indigo: {
    bg: "bg-indigo-500/5 hover:bg-indigo-500/10",
    border: "border-indigo-500/20",
    ring: "ring-indigo-500",
    text: "text-indigo-400",
    btn: "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20 hover:shadow-indigo-500/40",
    check: "text-indigo-400",
  },
  purple: {
    bg: "bg-purple-500/5 hover:bg-purple-500/10",
    border: "border-purple-500/20",
    ring: "ring-purple-500",
    text: "text-purple-400",
    btn: "bg-purple-600 hover:bg-purple-500 shadow-purple-500/20 hover:shadow-purple-500/40",
    check: "text-purple-400",
  },
  pink: {
    bg: "bg-pink-500/5 hover:bg-pink-500/10",
    border: "border-pink-500/20",
    ring: "ring-pink-500",
    text: "text-pink-400",
    btn: "bg-pink-600 hover:bg-pink-500 shadow-pink-500/20 hover:shadow-pink-500/40",
    check: "text-pink-400",
  },
};

function validate(form: { name: string; email: string; password: string; storeName: string }, accountType: AccountType) {
  if (!form.name.trim() || form.name.trim().length < 2)
    return "El nombre debe tener al menos 2 caracteres.";
  if (/\d/.test(form.name))
    return "El nombre no puede contener números.";
  if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    return "Ingresá un email válido.";
  if (!form.password || form.password.length < 6)
    return "La contraseña debe tener al menos 6 caracteres.";
  if (accountType === "owner") {
    if (!form.storeName.trim() || form.storeName.trim().length < 3)
      return "El nombre de tu tienda debe tener al menos 3 caracteres.";
  }
  return null;
}

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
    setError("");
  }

  function selectType(t: AccountType) {
    setAccountType(t);
    setStep("form");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate(form, accountType);
    if (err) { setError(err); return; }
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
    if (accountType === "seller") router.push("/login?registered=seller");
    else if (accountType === "buyer") router.push("/login?registered=buyer");
    else router.push("/login?registered=true");
  }

  const selected = TYPES.find((t) => t.key === accountType)!;
  const colors = COLOR_MAP[selected.color];

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6 relative">
      <style>{`
        .grid-bg { background-image: linear-gradient(rgba(99,102,241,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.06) 1px, transparent 1px); background-size: 48px 48px; }
      `}</style>

      <div className="absolute inset-0 grid-bg" />
      <div className="absolute top-1/4 -left-32 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-2xl">
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
              transition={{ duration: 0.35 }}
            >
              <div className="text-center mb-10">
                <h1 className="text-4xl font-black text-white mb-3">Crear cuenta gratis</h1>
                <p className="text-gray-400 text-lg">¿Cómo querés usar MiTienda?</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {TYPES.map(({ key, icon: Icon, color, title, desc, perks, cta }) => {
                  const c = COLOR_MAP[color];
                  return (
                    <button
                      key={key}
                      onClick={() => selectType(key)}
                      className={`group text-left ${c.bg} border ${c.border} rounded-3xl p-6 transition-all duration-300 hover:scale-[1.02]`}
                    >
                      <div className={`w-12 h-12 bg-${color}-500/15 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon className={`h-6 w-6 ${c.text}`} />
                      </div>
                      <h3 className="text-lg font-black text-white mb-1.5">{title}</h3>
                      <p className="text-gray-500 text-xs mb-4 leading-relaxed">{desc}</p>
                      <ul className="space-y-1.5 mb-5">
                        {perks.map((p) => (
                          <li key={p} className="flex items-start gap-2 text-xs text-gray-400">
                            <CheckCircle className={`h-3.5 w-3.5 ${c.check} flex-shrink-0 mt-0.5`} />
                            {p}
                          </li>
                        ))}
                      </ul>
                      <div className={`flex items-center gap-2 text-sm ${c.text} font-semibold group-hover:gap-3 transition-all`}>
                        {cta} <ArrowRight className="h-4 w-4" />
                      </div>
                    </button>
                  );
                })}
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
              transition={{ duration: 0.35 }}
              className="max-w-md mx-auto"
            >
              {/* Tipo seleccionado */}
              <div className="flex items-center justify-between mb-8">
                <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${colors.border} bg-white/5`}>
                  <selected.icon className={`h-4 w-4 ${colors.text}`} />
                  <span className={`text-sm font-semibold ${colors.text}`}>{selected.title}</span>
                </div>
                <button
                  onClick={() => { setStep("type"); setError(""); }}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2"
                >
                  Cambiar
                </button>
              </div>

              <div className="text-center mb-8">
                <h1 className="text-3xl font-black text-white mb-2">Completá tus datos</h1>
                <p className="text-gray-500 text-sm">
                  {accountType === "owner"
                    ? "Tu tienda estará lista en segundos."
                    : accountType === "seller"
                    ? "Te mandamos al panel de vendedor."
                    : "Empezá a explorar tiendas ya."}
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

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Nombre completo</label>
                  <input
                    type="text" name="name" value={form.name} onChange={handleChange}
                    placeholder="Ej: María García"
                    className={`w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 ${colors.ring} text-sm hover:border-white/20 transition-all`}
                  />
                  <p className="text-xs text-gray-600 mt-1">Solo letras, mínimo 2 caracteres.</p>
                </div>

                {/* Nombre tienda */}
                {accountType === "owner" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3 }}
                  >
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Nombre de tu tienda</label>
                    <input
                      type="text" name="storeName" value={form.storeName} onChange={handleChange}
                      placeholder="Ej: Joyas María, Luna Moda..."
                      className={`w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 ${colors.ring} text-sm hover:border-white/20 transition-all`}
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Tu tienda quedará en mitienda.ar/
                      <span className="text-gray-500">
                        {form.storeName
                          ? form.storeName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "tu-tienda"
                          : "tu-tienda"}
                      </span>
                    </p>
                  </motion.div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
                  <input
                    type="email" name="email" value={form.email} onChange={handleChange}
                    placeholder="tu@email.com"
                    className={`w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 ${colors.ring} text-sm hover:border-white/20 transition-all`}
                  />
                </div>

                {/* Contraseña */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"} name="password" value={form.password} onChange={handleChange}
                      placeholder="Mínimo 6 caracteres"
                      className={`w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 pr-12 text-white placeholder-gray-600 focus:outline-none focus:ring-2 ${colors.ring} text-sm hover:border-white/20 transition-all`}
                    />
                    <button
                      type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Mínimo 6 caracteres.</p>
                </div>

                <button
                  type="submit" disabled={loading}
                  className={`w-full text-white py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] mt-2 ${colors.btn}`}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Creando cuenta..." : selected.cta}
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
