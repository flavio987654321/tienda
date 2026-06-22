"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { HeartHandshake, ShieldCheck, Gift, ArrowLeft, Users, MessageCircle, Wallet, Receipt, ClipboardCheck } from "lucide-react";

// Texto a propósito genérico: esta sección no es exclusiva de canastas de
// alimentos ni asume que toda campaña futura tenga sorteo — cada campaña
// activa cuenta sus propios detalles en su propia página.
const PASOS = [
  {
    icon: ShieldCheck,
    title: "1. Se evalúa y se publica",
    text: "Revisamos cada solicitud antes de publicarla, y la campaña se hace pública con la información necesaria para entender la situación.",
  },
  {
    icon: HeartHandshake,
    title: "2. La comunidad aporta",
    text: "Cualquier persona puede donar desde $1.000. El progreso se muestra en tiempo real, sin excepciones.",
  },
  {
    icon: Gift,
    title: "3. Se rinden cuentas",
    text: "Al alcanzar la meta, se concreta lo solicitado y se informa públicamente cómo se usó cada peso recaudado.",
  },
];

const COMPROMISOS = [
  { icon: Wallet, text: "Cada peso recaudado se destina exclusivamente a cumplir el objetivo de la campaña." },
  { icon: Receipt, text: "Los gastos operativos, si los hay, se informan de forma pública, sin costos ocultos." },
  { icon: ShieldCheck, text: "Cada campaña se gestiona con reglas claras y verificables por cualquier participante." },
  { icon: ClipboardCheck, text: "Tratamos cada historia con respeto y cuidamos la privacidad de quien la cuenta." },
  { icon: HeartHandshake, text: "No es un negocio: es un programa comunitario sin fines de lucro." },
];

type Testimonial = {
  id: string;
  donorName: string;
  campaignName: string;
  mediaUrl: string | null;
  mediaType: string | null;
  text: string | null;
};

export default function ComunidadPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    fetch("/api/canasta/campaign", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.campaign) {
          router.replace("/comunidad/campana");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  useEffect(() => {
    fetch("/api/canasta/testimonials", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setTestimonials(d.testimonials ?? []))
      .catch(() => {});
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-gray-900 overflow-x-hidden">
      <style>{`
        .grid-bg-empty { background-image: linear-gradient(rgba(217,119,6,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(217,119,6,.06) 1px, transparent 1px); background-size: 48px 48px; }
        .warm-gradient-text {
          background: linear-gradient(135deg, #d97706, #16a34a);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
      `}</style>

      {/* Header */}
      <div className="border-b border-amber-900/10 px-6 py-5 grid grid-cols-3 items-center sticky top-0 bg-[#FFFBF5]/90 backdrop-blur-xl z-10">
        <Link
          href="/"
          aria-label="Volver al inicio"
          className="w-9 h-9 rounded-full border border-amber-900/10 bg-white flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-amber-50 transition-colors justify-self-start"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Link href="/" className="text-sm font-bold text-gray-900 justify-self-center hover:text-amber-700 transition-colors">TiendaApps</Link>
        <div className="flex items-center gap-2 text-amber-700 justify-self-end">
          <HeartHandshake className="h-5 w-5" />
          <span className="text-sm font-semibold hidden sm:inline">Comunidad Solidaria</span>
        </div>
      </div>

      {/* Hero: qué es y por qué existe */}
      <section className="relative px-6 pt-20 pb-14 text-center max-w-2xl mx-auto">
        <div className="grid-bg-empty absolute inset-0 pointer-events-none opacity-40" />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring" }}
          className="relative w-20 h-20 rounded-3xl bg-amber-500/15 flex items-center justify-center mx-auto mb-6"
        >
          <HeartHandshake className="h-10 w-10 text-amber-600" />
        </motion.div>
        <h1 className="relative text-3xl sm:text-4xl font-bold mb-4">
          Un canal <span className="warm-gradient-text">transparente</span> para pedir y dar ayuda
        </h1>
        <p className="relative text-gray-600 text-base leading-relaxed mb-3">
          TiendaApps abre este espacio para que personas con una necesidad concreta puedan pedir
          ayuda a la comunidad, de forma transparente y verificable.
        </p>
        <p className="relative text-amber-700 font-semibold text-sm bg-amber-100 inline-block px-4 py-2 rounded-full mt-2">
          Hoy no hay ninguna campaña publicada. Cuando se publique una, va a funcionar de esta manera.
        </p>
      </section>

      {/* Por qué existe este espacio */}
      <section className="px-6 py-14 bg-white border-y border-amber-100">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl font-bold mb-4">¿Por qué existe este programa?</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Entendemos que ciertas necesidades —de alimentos, de salud, de un objetivo puntual— se
            resuelven mejor cuando una comunidad las enfrenta en conjunto, con información clara,
            que cuando una persona las enfrenta sola y sin un canal formal para pedir ayuda.
          </p>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-center mb-2">¿Cómo funciona?</h2>
          <p className="text-gray-500 text-center text-sm mb-10">Tres pasos, todo transparente.</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {PASOS.map((paso) => (
              <div key={paso.title} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center mx-auto mb-3">
                  <paso.icon className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1.5 text-sm">{paso.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{paso.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ¿Necesitás ayuda? — la puerta de entrada para que nadie quede afuera */}
      <section className="px-6 py-14 bg-gradient-to-br from-amber-50 to-green-50 border-y border-amber-100">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto mb-5">
            <Users className="h-7 w-7 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold mb-3">¿Tenés una necesidad concreta?</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            Iniciá una solicitud y contanos tu situación. Te respondemos por los canales de
            contacto que nos dejes.
          </p>
          <Link
            href="/canasta/soporte"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold text-sm px-6 py-3.5 rounded-full transition-all"
          >
            <MessageCircle className="h-4 w-4" /> Iniciar una solicitud
          </Link>
        </div>
      </section>

      {/* Nuestro compromiso */}
      <section className="px-6 py-14 max-w-3xl mx-auto">
        <h2 className="text-xl font-bold text-center mb-8">Nuestro compromiso</h2>
        <div className="rounded-3xl border border-amber-900/10 bg-white p-6 sm:p-8 shadow-sm">
          <div className="grid sm:grid-cols-2 gap-6">
            {COMPROMISOS.map((c) => (
              <div key={c.text} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <c.icon className="h-4 w-4 text-amber-700" />
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Campañas ya entregadas — prueba social aunque no haya ninguna activa ahora */}
      {testimonials.length > 0 && (
        <section className="border-t border-amber-900/10 bg-white px-6 py-14">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2.5 mb-8 justify-center">
              <HeartHandshake className="h-5 w-5 text-amber-600" />
              <h2 className="text-xl font-bold text-gray-900">Campañas ya entregadas</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {testimonials.map((t) => (
                <div key={t.id} className="rounded-2xl border border-amber-900/10 bg-white overflow-hidden shadow-sm">
                  {t.mediaUrl &&
                    (t.mediaType === "VIDEO" ? (
                      <video src={t.mediaUrl} controls className="w-full max-h-64 bg-black" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.mediaUrl} alt={t.donorName} className="w-full max-h-64 object-cover" />
                    ))}
                  <div className="p-4">
                    <p className="text-sm font-semibold text-gray-900">{t.donorName}</p>
                    <p className="text-xs text-gray-400 mb-2">{t.campaignName}</p>
                    {t.text && <p className="text-sm text-gray-600 leading-relaxed">&quot;{t.text}&quot;</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-amber-900/10 bg-white px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-8 text-center">
            <div className="flex flex-col items-center">
              <Link href="/" className="inline-flex items-center gap-2 mb-2.5">
                <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center shrink-0">
                  <HeartHandshake className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-900">TiendaApps</span>
              </Link>
              <p className="text-xs text-gray-400 leading-relaxed max-w-[220px]">
                La plataforma de ecommerce con sistema de afiliados.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Contacto</p>
              <a
                href="mailto:tiendaapps.solidaria@gmail.com"
                className="text-xs text-gray-500 hover:text-amber-700 transition-colors"
              >
                tiendaapps.solidaria@gmail.com
              </a>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Legal</p>
              <div className="flex flex-col items-center gap-2">
                <Link href="/canasta/terminos" className="text-xs text-gray-500 hover:text-amber-700 transition-colors">
                  Términos de la donación
                </Link>
                <Link href="/privacidad?role=donor" className="text-xs text-gray-500 hover:text-amber-700 transition-colors">
                  Política de privacidad
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-amber-900/10 pt-6 text-center">
            <p className="text-xs text-gray-400">© 2026 TiendaApps</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
