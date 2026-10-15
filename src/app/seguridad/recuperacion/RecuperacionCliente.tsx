"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { pedir } from "@/lib/seguridad-cliente";

export default function RecuperacionCliente({ accion, token }: { accion: "confirmar" | "cancelar" | null; token: string }) {
  const [estado, setEstado] = useState<"listo" | "ocupado" | "hecho">("listo");
  const [error, setError] = useState("");
  const [venceAt, setVenceAt] = useState<string | null>(null);
  const enCurso = useRef(false);

  async function hacer() {
    if (enCurso.current || !accion) return;
    enCurso.current = true;
    setEstado("ocupado"); setError("");
    const r = await pedir<{ venceAt?: string }>("/api/seguridad/recuperacion/link", {
      method: "POST", body: JSON.stringify({ accion, token }),
    });
    enCurso.current = false;
    if (r.ok) { setVenceAt(r.data.venceAt ?? null); setEstado("hecho"); return; }
    setError(r.error);
    setEstado("listo");
  }

  const fecha = venceAt
    ? new Date(venceAt).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <AppLogo size={44} />
          <span className="text-lg font-bold text-gray-950">TiendaApps</span>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          {!accion && (
            <>
              <h1 className="text-xl font-black text-gray-950">Este link no está completo</h1>
              <p className="mt-2 text-sm text-gray-600">Abrilo de nuevo desde el mail, tocando el botón.</p>
            </>
          )}

          {accion === "confirmar" && estado !== "hecho" && (
            <>
              <ShieldAlert className="h-8 w-8 text-red-700 mb-3" />
              <h1 className="text-xl font-black text-gray-950">¿Confirmás que perdiste tu celular?</h1>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                Al confirmar empieza la espera. Cuando termine, la verificación en dos pasos se quita y vas a poder entrar con tu contraseña o con un código por mail.
              </p>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed">Si no lo pediste vos, no confirmes: cerrá esta página.</p>
              <button type="button" onClick={hacer} disabled={estado === "ocupado"} className="mt-5 w-full flex items-center justify-center gap-2 rounded-2xl bg-gray-950 py-3.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50">
                {estado === "ocupado" && <Loader2 className="h-4 w-4 animate-spin" />}
                Sí, fui yo: confirmar
              </button>
            </>
          )}

          {accion === "cancelar" && estado !== "hecho" && (
            <>
              <ShieldCheck className="h-8 w-8 text-gray-900 mb-3" />
              <h1 className="text-xl font-black text-gray-950">Cancelar el pedido</h1>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                Se cancela el pedido de quitar la verificación en dos pasos. Tu cuenta sigue pidiendo tu huella o tu app para entrar.
              </p>
              <button type="button" onClick={hacer} disabled={estado === "ocupado"} className="mt-5 w-full flex items-center justify-center gap-2 rounded-2xl bg-red-700 py-3.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50">
                {estado === "ocupado" && <Loader2 className="h-4 w-4 animate-spin" />}
                No fui yo: cancelar
              </button>
            </>
          )}

          {error && <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {estado === "hecho" && accion === "confirmar" && (
            <>
              <h1 className="text-xl font-black text-gray-950">Listo: empezó la espera</h1>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                La verificación en dos pasos se va a quitar {fecha ? <>el <strong>{fecha}</strong></> : "cuando termine la espera"}. Te vamos a avisar por mail.
              </p>
            </>
          )}
          {estado === "hecho" && accion === "cancelar" && (
            <>
              <h1 className="text-xl font-black text-gray-950">Pedido cancelado</h1>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                Nada cambió en tu cuenta. Si el pedido no lo hiciste vos, alguien sabe tu contraseña o entró a tu mail: cambiá las dos.
              </p>
            </>
          )}

          <div className="mt-8 text-center">
            <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900">Ir a entrar</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
