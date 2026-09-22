"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, MessageSquareQuote, BadgeCheck } from "lucide-react";
import type { EstadoDeOpinion } from "@/lib/opiniones-digitales";

export type OpinionEnPantalla = {
  id: string;
  nombre: string;
  texto: string;
  estado: EstadoDeOpinion;
  cuando: string;
  producto: string;
  productoId: string;
  email: string;
};

const TITULO: Record<EstadoDeOpinion, string> = {
  PENDIENTE: "Para revisar",
  PUBLICADA: "Publicadas",
  OCULTA: "Guardadas sin publicar",
};

/**
 * La lista, en tres grupos: pendientes, publicadas, escondidas. Cada una con
 * publicar / esconder. El texto NO se edita: lo que se publica es lo que la
 * persona escribió, palabra por palabra. Quien quiera "mejorarla", que la
 * esconda.
 */
export default function OpinionesClient({ opiniones }: { opiniones: OpinionEnPantalla[] }) {
  const router = useRouter();
  const [tocando, setTocando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const enVuelo = useRef(false);

  async function cambiar(o: OpinionEnPantalla, estado: EstadoDeOpinion) {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setTocando(o.id);
    setError("");
    try {
      const r = await fetch(`/api/digitales/opiniones/${o.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) setError(d.error ?? "No pudimos cambiarla. Probá de nuevo.");
      else router.refresh();
    } catch {
      setError("No pudimos conectarnos. Revisá tu internet e intentá de nuevo.");
    }
    enVuelo.current = false;
    setTocando(null);
  }

  if (opiniones.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 px-6 py-12 text-center">
        <MessageSquareQuote className="mx-auto h-8 w-8 text-gray-300 panel-oscuro:text-gray-600" />
        <p className="mt-3 text-sm font-semibold text-gray-700 panel-oscuro:text-gray-300">Todavía no hay ninguna</p>
        <p className="mt-1 text-[13px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
          Pedilas desde <Link href="/digitales/clientes" className="font-semibold text-orange-700 panel-oscuro:text-orange-300 underline underline-offset-2">Tus clientes</Link>: cada persona
          recibe un link que es sólo de su compra. Lo que escriban aparece acá, y vos elegís qué se publica.
        </p>
      </div>
    );
  }

  const grupos = (["PENDIENTE", "PUBLICADA", "OCULTA"] as const).map((e) => ({ estado: e, items: opiniones.filter((o) => o.estado === e) })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8">
      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 panel-oscuro:bg-red-500/10 panel-oscuro:text-red-300 border border-red-200 panel-oscuro:border-red-500/25 rounded-xl px-4 py-2.5">{error}</p>}
      {grupos.map((g) => (
        <section key={g.estado}>
          <h2 className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-500 panel-oscuro:text-gray-400">
            {TITULO[g.estado]} · {g.items.length}
          </h2>
          <ul className="space-y-2">
            {g.items.map((o) => (
              <li key={o.id} className={`rounded-2xl border bg-white panel-oscuro:bg-gray-900 px-4 py-3.5 ${o.estado === "PENDIENTE" ? "border-orange-200 panel-oscuro:border-orange-500/30" : "border-gray-100 panel-oscuro:border-gray-800"}`}>
                <blockquote className="text-[14px] leading-relaxed text-gray-800 panel-oscuro:text-gray-200">{o.texto}</blockquote>
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-gray-500 panel-oscuro:text-gray-400">
                  <strong className="font-semibold text-gray-700 panel-oscuro:text-gray-300">{o.nombre}</strong>
                  <span className="inline-flex items-center gap-1 text-green-700 panel-oscuro:text-green-300"><BadgeCheck className="h-3.5 w-3.5" /> compra verificada</span>
                  <span>· {o.producto} · {o.cuando}</span>
                  <span className="text-gray-400">· {o.email}</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {o.estado !== "PUBLICADA" && (
                    <button type="button" onClick={() => void cambiar(o, "PUBLICADA")} disabled={tocando !== null} className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3 py-2 text-[12.5px] font-bold text-white hover:bg-orange-500 disabled:opacity-50 transition-colors">
                      {tocando === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />} Publicar en la página
                    </button>
                  )}
                  {o.estado !== "OCULTA" && (
                    <button type="button" onClick={() => void cambiar(o, "OCULTA")} disabled={tocando !== null} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 px-3 py-2 text-[12.5px] font-semibold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 disabled:opacity-50 transition-colors">
                      {tocando === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />} {o.estado === "PUBLICADA" ? "Sacar de la página" : "Guardar sin publicar"}
                    </button>
                  )}
                  <Link href={`/p/${o.productoId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-xl px-3 py-2 text-[12.5px] font-semibold text-gray-500 panel-oscuro:text-gray-400 hover:text-gray-700">Ver la página</Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
