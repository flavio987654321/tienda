"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ShoppingBag, Store, Users } from "lucide-react";

type AccountType = "owner" | "seller";

export default function RegistroPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>("owner");
  const [form, setForm] = useState({ name: "", email: "", password: "", storeName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8">
          <ShoppingBag className="h-7 w-7 text-indigo-600" />
          <span className="text-xl font-bold text-gray-900">MiTienda</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Crear cuenta</h1>
        <p className="text-gray-500 mb-6">Elegí si querés crear tu tienda o vender por comisión.</p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { id: "owner" as const, label: "Soy dueña", desc: "Crear mi tienda", icon: Store },
            { id: "seller" as const, label: "Soy vendedora", desc: "Postularme a tiendas", icon: Users },
          ].map(({ id, label, desc, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setAccountType(id)}
              className={`rounded-2xl border-2 p-4 text-left transition-all ${
                accountType === id ? "border-indigo-500 bg-indigo-50" : "border-gray-100 hover:border-gray-200"
              }`}
            >
              <Icon className={`h-5 w-5 mb-3 ${accountType === id ? "text-indigo-600" : "text-gray-400"}`} />
              <p className="text-sm font-bold text-gray-900">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </button>
          ))}
        </div>

        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tu nombre</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Maria Garcia"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {accountType === "owner" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de tu tienda</label>
              <input
                type="text"
                name="storeName"
                value={form.storeName}
                onChange={handleChange}
                required
                placeholder="Ej: Joyas Maria"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="tu@email.com"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
              placeholder="Minimo 6 caracteres"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {accountType === "seller" && (
            <div className="rounded-xl bg-purple-50 border border-purple-100 px-4 py-3 text-sm text-purple-700">
              Al ingresar vas a poder ver tiendas activas, enviar solicitudes y cargar tu presentación para que la dueña te apruebe.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Creando cuenta..." : accountType === "owner" ? "Crear tienda gratis" : "Crear cuenta de vendedora"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
