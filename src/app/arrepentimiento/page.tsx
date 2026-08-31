import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { siteUrl } from "@/lib/site";
import ArrepentimientoForm from "@/components/ArrepentimientoForm";

/**
 * El botón de arrepentimiento de TiendaApps.
 *
 * Cada tienda tiene el suyo, dentro de su página legal. Éste es el de la
 * plataforma, y no es una copia por prolijidad: **TiendaApps también vende** —
 * las suscripciones— así que la Resolución 424/2020 la alcanza igual que a
 * cualquier comercio. Sin esto, la plataforma sería el único negocio del sitio
 * sin botón.
 *
 * Es una página propia y no una solapa de /terminos porque no es un texto que se
 * lee: es un trámite que se hace. Y porque la resolución pide que se llegue
 * fácil, no que se lo busque adentro de un documento largo.
 */

const DESCRIPTION =
  "Botón de arrepentimiento de TiendaApps. Si contrataste un plan y querés dar marcha atrás, iniciá la solicitud acá y recibí tu constancia.";

export const metadata: Metadata = {
  title: "Botón de arrepentimiento",
  description: DESCRIPTION,
  alternates: { canonical: "/arrepentimiento" },
  openGraph: {
    title: "Botón de arrepentimiento | TiendaApps",
    description: DESCRIPTION,
    url: siteUrl("/arrepentimiento"),
  },
};

export default function ArrepentimientoPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <nav className="border-b border-slate-200">
        <div className="mx-auto flex max-w-3xl items-center px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
        <header className="border-b border-slate-200 pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Resolución 424/2020
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Botón de arrepentimiento
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
            Para dar marcha atrás con un plan que contrataste en TiendaApps.
          </p>
        </header>

        <div className="mt-10">
          <ArrepentimientoForm nombreDeQuienVende="TiendaApps" />
        </div>

        {/* Esta aclaración no es un descargo: es la pregunta que se va a hacer
            quien llegue acá desde el pie de una tienda buscando devolver una
            remera. Mandarla al lugar correcto es parte del trámite. */}
        <div className="mt-10 rounded-lg border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-sm font-semibold text-slate-700">
            ¿Compraste algo en una tienda y querés devolverlo?
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Entonces no es acá. Cada tienda tiene su propio botón de arrepentimiento, en el pie de
            su página, dentro de <strong>Información legal</strong>. Este formulario es sólo para
            los planes de TiendaApps.
          </p>
        </div>
      </main>
    </div>
  );
}
