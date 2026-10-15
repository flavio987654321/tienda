"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Snowflake, Play } from "lucide-react";

type Rec = {
  id: string; estado: string; email: string; nombre: string | null; rol: string;
  conContrasena: boolean; creadoAt: string; venceAt: string | null;
};

const ESTADO: Record<string, string> = {
  confirmar: "Falta que confirme el mail",
  esperando: "Corriendo la espera",
  congelada: "Congelada",
};

/**
 * Los "Perdí mi celular" en curso de tiendas, digitales y afiliados. Sólo se
 * puede congelar (cuando el dueño escribe que no fue él) o descongelar. El admin
 * nunca quita el doble paso de nadie: ver `lib/seguridad-cuenta`.
 */
export default function RecuperacionesAdmin() {
  const [datos, setDatos] = useState<{ cuentasConDosPasos: number | null; recuperaciones: Rec[] } | null>(null);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState("");
  const enCurso = useRef(false);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/seguridad/recuperaciones", { cache: "no-store", signal: AbortSignal.timeout(20_000) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setDatos(d); setError("");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "No se pudo cargar.");
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde el servidor
  useEffect(() => { cargar(); }, [cargar]);

  async function cambiar(r: Rec, congelar: boolean) {
    if (enCurso.current) return;
    if (congelar && !window.confirm(`¿Congelar el pedido de ${r.email}? La espera se frena hasta que lo descongeles.`)) return;
    enCurso.current = true; setOcupado(r.id);
    try {
      const res = await fetch("/api/admin/seguridad/recuperaciones", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, congelar }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error ?? "No se pudo.");
      await cargar();
    } finally {
      enCurso.current = false; setOcupado("");
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-gray-900/40 p-5 md:p-6">
      <h2 className="text-lg font-bold text-white">Verificación en dos pasos de las cuentas</h2>
      <p className="mt-1 text-sm text-gray-400">
        {datos?.cuentasConDosPasos != null ? `${datos.cuentasConDosPasos} cuentas la tienen activada (incluida la tuya). ` : ""}
        Si alguien te escribe que un pedido de &quot;Perdí mi celular&quot; no lo hizo, congelalo. Nunca se puede quitar el doble paso desde acá.
      </p>
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      {!datos ? (
        <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-gray-500" /></div>
      ) : datos.recuperaciones.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No hay pedidos en curso.</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/5">
          {datos.recuperaciones.map((r) => (
            <li key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{r.email} <span className="text-gray-500 font-normal">· {r.rol}</span></p>
                <p className="text-xs text-gray-400">
                  {ESTADO[r.estado] ?? r.estado} · pedido el {new Date(r.creadoAt).toLocaleString("es-AR")}
                  {r.venceAt ? ` · se quita desde el ${new Date(r.venceAt).toLocaleDateString("es-AR")}` : ""}
                  {r.conContrasena ? "" : " · entró sin contraseña"}
                </p>
              </div>
              {r.estado !== "confirmar" && (
                <button type="button" onClick={() => cambiar(r, r.estado !== "congelada")} disabled={!!ocupado}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-white/5 disabled:opacity-40">
                  {ocupado === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : r.estado === "congelada" ? <Play className="h-3.5 w-3.5" /> : <Snowflake className="h-3.5 w-3.5" />}
                  {r.estado === "congelada" ? "Descongelar" : "Congelar"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
