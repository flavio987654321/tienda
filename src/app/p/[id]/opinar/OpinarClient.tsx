"use client";

import { useRef, useState } from "react";
import { Loader2, Check } from "lucide-react";
import { validarOpinion, NOMBRE_OPINION_MAX } from "@/lib/opiniones-digitales";

/**
 * El formulario de la opinión. Valida con la misma función que la ruta, y
 * al mandar muestra el "gracias" en el lugar: no hay a dónde ir después.
 */
export default function OpinarClient({ token, nombreSugerido, previa, maximo }: {
  token: string;
  nombreSugerido: string;
  /** Lo que ya escribió por esta compra, si escribió. */
  previa: { nombre: string; texto: string; estado: string } | null;
  maximo: number;
}) {
  const [nombre, setNombre] = useState(previa?.nombre ?? nombreSugerido);
  const [texto, setTexto] = useState(previa?.texto ?? "");
  const [revisar, setRevisar] = useState(false);
  const [yendo, setYendo] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);
  const enVuelo = useRef(false);

  const r = validarOpinion({ nombre, texto }, nombreSugerido);
  const problema = r.ok ? null : r.problema;

  async function mandar(e: React.FormEvent) {
    e.preventDefault();
    setRevisar(true);
    if (enVuelo.current || problema) return;
    enVuelo.current = true;
    setYendo(true);
    setError("");
    try {
      const res = await fetch("/api/digitales/opinion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nombre, texto }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) setError(d.error ?? "No pudimos guardar tu opinión. Probá de nuevo.");
      else setListo(true);
    } catch {
      setError("No pudimos conectarnos. Revisá tu internet e intentá de nuevo.");
    }
    enVuelo.current = false;
    setYendo(false);
  }

  if (listo) {
    return (
      <div className="mt-8 rounded-2xl bg-[color:var(--pv-suave)] p-6 text-center">
        <Check className="mx-auto h-8 w-8 text-[color:var(--pv-acento)]" />
        <p className="mt-3 text-lg font-bold">¡Gracias!</p>
        <p className="mt-1 text-sm text-[color:var(--pv-tenue)]">Tu opinión quedó guardada. Si la publican, aparece en la página con tu nombre.</p>
      </div>
    );
  }

  return (
    <form onSubmit={mandar} className="mt-8 space-y-5">
      {previa && (
        <p className="rounded-xl bg-[color:var(--pv-suave)] px-4 py-3 text-sm text-[color:var(--pv-tenue)]">
          Ya dejaste una opinión por esta compra{previa.estado === "PUBLICADA" ? " y está publicada" : ""}. Si la cambiás, vuelve a revisión.
        </p>
      )}
      <div>
        <label htmlFor="op-texto" className="block text-sm font-semibold">Tu opinión</label>
        <textarea
          id="op-texto" value={texto} onChange={(e) => setTexto(e.target.value)} onBlur={() => setRevisar(true)}
          rows={5} maxLength={maximo} disabled={yendo}
          placeholder="Qué te sirvió, qué cambió, a quién se lo recomendarías…"
          className="mt-1.5 w-full rounded-xl border-2 border-[color:var(--pv-linea)] bg-[color:var(--pv-tarjeta)] px-4 py-3 text-[15px] text-[color:var(--pv-tinta)] outline-none focus:border-[color:var(--pv-acento)]"
        />
        <p className="mt-1 text-right text-xs text-[color:var(--pv-tenue)]">{texto.length}/{maximo}</p>
      </div>
      <div>
        <label htmlFor="op-nombre" className="block text-sm font-semibold">Cómo querés aparecer</label>
        <input
          id="op-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={NOMBRE_OPINION_MAX} disabled={yendo}
          placeholder="Tu nombre, o tus iniciales" autoComplete="off"
          className="mt-1.5 w-full rounded-xl border-2 border-[color:var(--pv-linea)] bg-[color:var(--pv-tarjeta)] px-4 py-3 text-[15px] text-[color:var(--pv-tinta)] outline-none focus:border-[color:var(--pv-acento)]"
        />
      </div>
      {revisar && problema && <p role="alert" className="text-sm font-medium text-[color:var(--pv-tinta)] bg-[color:var(--pv-fuerte)] px-3 py-2 rounded-xl">{problema}</p>}
      {error && <p role="alert" className="text-sm font-medium text-[color:var(--pv-tinta)] bg-[color:var(--pv-fuerte)] px-3 py-2 rounded-xl">{error}</p>}
      <button
        type="submit" disabled={yendo}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--pv-acento)] px-6 py-3.5 text-base font-bold text-[color:var(--pv-sobre)] transition-opacity disabled:opacity-60 sm:w-auto"
      >
        {yendo ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : previa ? "Guardar los cambios" : "Mandar mi opinión"}
      </button>
    </form>
  );
}
