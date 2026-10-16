"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clapperboard, Play, X } from "lucide-react";
import { idDeYoutube, type SeccionDeTutoriales, type Tutorial } from "@/lib/tutoriales";

/**
 * La sección Tutoriales, igual en los tres paneles (16/10/26). Cada panel le
 * pasa sus videos (ver `lib/tutoriales`) y su color.
 *
 * Todos los videos se ven desde el primer día. El que todavía no tiene link
 * dice "Próximamente" y se puede tocar igual: avisa que está en camino y lleva
 * a la pantalla que explica, en vez de un botón muerto.
 *
 * El video se abre en una ventana encima, con YouTube adentro (el `frame-src`
 * de next.config ya deja `www.youtube.com`), y no en otra pestaña: desde la app
 * instalada, YouTube afuera era salir del panel sin forma de volver (ver
 * `PanelAyuda`).
 *
 * El oscuro va con las dos variantes: `panel-oscuro:` en tiendas y digitales,
 * `dark:` en afiliados (cada panel tiene su propio interruptor).
 */

type Acento = "indigo" | "naranja";

const COLOR: Record<Acento, { fondo: string; texto: string; boton: string; foco: string }> = {
  indigo: {
    fondo: "from-indigo-500 to-violet-600",
    texto: "text-indigo-600 panel-oscuro:text-indigo-400 dark:text-indigo-400",
    boton: "bg-indigo-600 hover:bg-indigo-700 text-white",
    foco: "focus-visible:ring-indigo-400",
  },
  naranja: {
    fondo: "from-orange-500 to-amber-500",
    texto: "text-orange-600 panel-oscuro:text-orange-400 dark:text-orange-400",
    boton: "bg-orange-500 hover:bg-orange-600 text-white",
    foco: "focus-visible:ring-orange-400",
  },
};

function Tarjeta({ t, acento, abrir }: { t: Tutorial; acento: Acento; abrir: () => void }) {
  const id = idDeYoutube(t.video);
  const c = COLOR[acento];
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={abrir}
        className={`group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 ${c.foco} panel-oscuro:border-gray-800 dark:border-gray-800 panel-oscuro:bg-gray-900 dark:bg-gray-900`}
      >
        <span className={`relative block aspect-video w-full overflow-hidden ${id ? "bg-gray-900" : `bg-gradient-to-br ${c.fondo}`}`}>
          {id ? (
            // eslint-disable-next-line @next/next/no-img-element -- la miniatura la da YouTube
            <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <Clapperboard aria-hidden="true" className="absolute -bottom-3 -right-3 h-24 w-24 text-white/15" strokeWidth={1.25} />
          )}
          <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-hover:scale-105">
              <Play className="ml-0.5 h-5 w-5 fill-gray-900 text-gray-900" />
            </span>
          </span>
          {!id && (
            <span className="absolute left-3 top-3 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
              Próximamente
            </span>
          )}
        </span>
        <span className="flex flex-1 flex-col gap-1 p-4">
          <span className="text-[15px] font-bold leading-snug text-gray-950 panel-oscuro:text-gray-100 dark:text-gray-100">{t.titulo}</span>
          <span className="text-sm leading-6 text-gray-500 panel-oscuro:text-gray-400 dark:text-gray-400">{t.bajada}</span>
        </span>
      </button>
    </li>
  );
}

function Ventana({ t, acento, cerrar }: { t: Tutorial; acento: Acento; cerrar: () => void }) {
  const id = idDeYoutube(t.video);
  const c = COLOR[acento];
  const cerrarRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cerrarRef.current?.focus();
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", tecla);
    return () => { window.removeEventListener("keydown", tecla); document.body.style.overflow = antes; };
  }, [cerrar]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6" onClick={cerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.titulo}
        onClick={(e) => e.stopPropagation()}
        className={`w-full overflow-hidden bg-white shadow-2xl panel-oscuro:bg-gray-900 dark:bg-gray-900 ${id ? "sm:max-w-4xl" : "sm:max-w-md"} rounded-t-2xl sm:rounded-2xl`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 panel-oscuro:border-gray-800 dark:border-gray-800">
          <p className="min-w-0 truncate text-[15px] font-bold text-gray-950 panel-oscuro:text-gray-100 dark:text-gray-100">{t.titulo}</p>
          <button ref={cerrarRef} type="button" onClick={cerrar} aria-label="Cerrar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 panel-oscuro:hover:bg-gray-800 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        {id ? (
          <div className="relative aspect-video w-full bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${id}?rel=0&autoplay=1`}
              title={t.titulo}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        ) : (
          <div className="px-5 pb-6 pt-5">
            <span className={`inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide panel-oscuro:bg-gray-800 dark:bg-gray-800 ${c.texto}`}>
              Próximamente
            </span>
            <p className="mt-3 text-[15px] leading-7 text-gray-600 panel-oscuro:text-gray-300 dark:text-gray-300">
              Estamos grabando este video. Mientras tanto, podés entrar a la pantalla y recorrerla.
            </p>
            {t.pantalla && (
              <Link href={t.pantalla} onClick={cerrar}
                className={`mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold ${c.boton}`}>
                Ir a la pantalla <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** `volverA`: el "volver" de arriba (digitales pone el suyo, `BotonVolver`). */
export default function PanelTutoriales({ secciones, acento, volverA }: { secciones: SeccionDeTutoriales[]; acento: Acento; volverA?: string }) {
  const [abierto, setAbierto] = useState<Tutorial | null>(null);
  const todos = secciones.flatMap((s) => s.tutoriales);
  const listos = todos.filter((t) => idDeYoutube(t.video)).length;

  return (
    <div>
      {volverA && (
        <Link href={volverA} className="mb-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-950 panel-oscuro:text-gray-400 dark:text-gray-400 panel-oscuro:hover:text-white dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Volver al inicio
        </Link>
      )}
      <header>
        <h1 className="text-2xl font-black tracking-tight text-gray-950 panel-oscuro:text-gray-100 dark:text-gray-100 sm:text-3xl">Tutoriales</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-gray-500 panel-oscuro:text-gray-400 dark:text-gray-400">
          Videos cortos que muestran cómo funciona cada pantalla, paso a paso.{" "}
          {listos === 0
            ? "Los estamos grabando: van a ir apareciendo acá."
            : `${listos} de ${todos.length} ya están listos; los demás van a ir apareciendo acá.`}
        </p>
      </header>

      {secciones.map((s) => (
        <section key={s.id} className="mt-9" aria-labelledby={`tut-${s.id}`}>
          <h2 id={`tut-${s.id}`} className="text-lg font-bold tracking-tight text-gray-950 panel-oscuro:text-gray-100 dark:text-gray-100">{s.titulo}</h2>
          <p className="mt-1 text-sm leading-6 text-gray-500 panel-oscuro:text-gray-400 dark:text-gray-400">{s.bajada}</p>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {s.tutoriales.map((t) => <Tarjeta key={t.id} t={t} acento={acento} abrir={() => setAbierto(t)} />)}
          </ul>
        </section>
      ))}

      {abierto && <Ventana t={abierto} acento={acento} cerrar={() => setAbierto(null)} />}
    </div>
  );
}
