import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, ShoppingBag, UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-session";

export default async function MiCuentaPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-gray-950">
            <ShoppingBag className="h-6 w-6 text-indigo-600" />
            MiTienda
          </Link>
          <Link
            href="/tienda"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500"
          >
            Explorar tiendas
          </Link>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <UserRound className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Mi cuenta</p>
              <h1 className="mt-1 text-2xl font-black text-gray-950">
                {user.name || user.email}
              </h1>
              <p className="mt-1 text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-950">Mis compras</h2>
              <p className="text-sm text-gray-500">
                Todavia no tenes pedidos. Cuando compres, los vas a ver aca.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
