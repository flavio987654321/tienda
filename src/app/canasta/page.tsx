"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  HeartHandshake, Sparkles, Clock, Users, Gift, ShieldCheck, Megaphone, Radio, ArrowLeft,
  Milk, Wheat, Droplet, Candy, Coffee, Bean, Cookie, Package, Soup,
  type LucideIcon,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  image: string | null;
  targetPrice: number;
  fundedPct: number;
};

type CampaignData = {
  campaign: {
    id: string;
    name: string;
    description: string | null;
    goalAmount: number;
    reservePct: number;
    scheduledDrawAt: string | null;
    drawStatus: "SCHEDULED" | "LIVE" | "FINISHED";
  } | null;
  products?: Product[];
  totalRaised?: number;
  progressPct?: number;
  donorsCount?: number;
};

type Testimonial = {
  id: string;
  donorName: string;
  campaignName: string;
  mediaUrl: string | null;
  mediaType: string | null;
  text: string | null;
  createdAt: string;
};

const ICON_MAP: Array<[string, LucideIcon]> = [
  ["leche", Milk],
  ["arroz", Wheat],
  ["fideos", Soup],
  ["aceite", Droplet],
  ["azúcar", Candy],
  ["harina", Wheat],
  ["yerba", Coffee],
  ["sal", Package],
  ["lentejas", Bean],
  ["porotos", Bean],
  ["tomate", Soup],
  ["polenta", Wheat],
  ["galletitas", Cookie],
  ["jabón", Sparkles],
  ["papel higiénico", Package],
];

function iconFor(name: string): LucideIcon {
  const lower = name.toLowerCase();
  for (const [key, Icon] of ICON_MAP) {
    if (lower.includes(key)) return Icon;
  }
  return Package;
}

function formatMoney(n: number) {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

const PASOS = [
  {
    icon: HeartHandshake,
    title: "1. Donás lo que puedas",
    text: "Desde $1.000. Tu aporte se suma al de toda la comunidad para completar una canasta real.",
  },
  {
    icon: ShieldCheck,
    title: "2. Se compra la canasta",
    text: "Cuando se junta el 100%, compramos los alimentos. El 10% queda reservado para envío y gastos.",
  },
  {
    icon: Gift,
    title: "3. Se sortea entre todos",
    text: "Todos los que donaron entran al sorteo en vivo, sin importar cuánto aportaron. Gana un vecino real.",
  },
];

const COMPROMISOS = [
  "Cada peso recaudado se destina exclusivamente a la compra de los alimentos de la canasta.",
  "El 10% de reserva para envío y gastos operativos se informa de forma pública, sin costos ocultos.",
  "El sorteo se realiza en vivo, con reglas claras y verificables por cualquier participante.",
  "No es una rifa comercial: es una colecta comunitaria sin fines de lucro, con un único ganador real por campaña.",
];

export default function CanastaPage() {
  return (
    <Suspense>
      <CanastaContent />
    </Suspense>
  );
}

function CanastaContent() {
  const searchParams = useSearchParams();
  const donacion = searchParams.get("donacion");
  const [data, setData] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawLive, setDrawLive] = useState(false);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    fetch("/api/canasta/campaign", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/canasta/testimonials", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setTestimonials(d.testimonials ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/canasta/draw-status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setDrawLive(d?.campaign?.drawStatus === "LIVE"))
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Cargando canasta solidaria...</div>
      </div>
    );
  }

  if (!data?.campaign) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex flex-col items-center justify-center text-center px-6">
        <HeartHandshake className="h-14 w-14 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">No hay una canasta activa ahora</h1>
        <p className="text-gray-500 max-w-md">
          Cuando se lance una nueva campaña solidaria vas a poder donar y participar del sorteo desde aquí.
        </p>
        <Link href="/" className="mt-6 text-amber-600 hover:text-amber-700 text-sm font-medium">
          ← Volver al inicio
        </Link>
      </div>
    );
  }

  const { campaign, products = [], totalRaised = 0, progressPct = 0, donorsCount = 0 } = data;

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-gray-900 overflow-x-hidden">
      <style>{`
        .grid-bg { background-image: linear-gradient(rgba(217,119,6,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(217,119,6,.06) 1px, transparent 1px); background-size: 48px 48px; }
        .warm-gradient-text {
          background: linear-gradient(135deg, #d97706, #16a34a);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .glow-amber { box-shadow: 0 1px 2px rgba(0,0,0,.04), 0 12px 32px rgba(217,119,6,.10); }
        @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 0 0 rgba(217,119,6,.30); } 50% { box-shadow: 0 0 0 6px rgba(217,119,6,0); } }
        .pulse-lit { animation: pulse-glow 2.4s ease-in-out infinite; }
        @keyframes pulse-live { 0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,.55); transform: scale(1); } 50% { box-shadow: 0 0 0 10px rgba(220,38,38,0); transform: scale(1.04); } }
        .pulse-live { animation: pulse-live 1.1s ease-in-out infinite; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .shimmer-bar { background-image: linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent); background-size: 200% 100%; animation: shimmer 2.2s linear infinite; }
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
          <span className="text-sm font-semibold hidden sm:inline">Canasta Solidaria</span>
        </div>
      </div>

      {donacion === "ok" && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-4 text-center">
          <p className="text-sm font-semibold text-green-800 flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" /> ¡Gracias por tu donación! Ya estás participando del sorteo — te mandamos un email con los detalles.
          </p>
        </div>
      )}
      {donacion === "pendiente" && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 text-center">
          <p className="text-sm font-semibold text-amber-800 flex items-center justify-center gap-2">
            <Clock className="h-4 w-4" /> Tu pago está siendo procesado. Puede demorar unos minutos en confirmarse.
          </p>
        </div>
      )}

      {/* Hero explicativo */}
      <div className="grid-bg relative px-6 py-16 sm:py-20 border-b border-amber-900/5">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-amber-100 border border-amber-200 text-amber-800 text-xs font-medium px-4 py-1.5 rounded-full mb-6"
          >
            <Megaphone className="h-3.5 w-3.5" /> Iniciativa comunitaria — gestionada con responsabilidad y transparencia
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-4xl sm:text-5xl font-bold mb-5 leading-tight text-gray-900"
          >
            Entre todos completamos<br />
            <span className="warm-gradient-text">una canasta para un vecino</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 text-lg max-w-xl mx-auto"
          >
            Cualquiera puede donar desde $1.000. Cuando la canasta se completa, se sortea en vivo
            entre todos los que donaron, bajo reglas públicas y verificables.
          </motion.p>
        </div>
      </div>

      {/* Cómo funciona */}
      <div className="max-w-5xl mx-auto px-6 py-12 grid sm:grid-cols-3 gap-4">
        {PASOS.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-amber-900/10 bg-white p-5 shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
              <p.icon className="h-5 w-5 text-amber-700" />
            </div>
            <h3 className="font-semibold mb-1.5 text-gray-900">{p.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{p.text}</p>
          </motion.div>
        ))}
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-10">
        {/* Título de la campaña activa */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl font-bold mb-2 text-gray-900">{campaign.name}</h2>
          {campaign.description && (
            <p className="text-gray-500 max-w-xl mx-auto text-sm">{campaign.description}</p>
          )}
        </motion.div>

        {/* Canasta 3D liviana */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: "spring" }}
          style={{ perspective: "1200px" }}
          className="mb-10"
        >
          <div
            style={{ transform: "rotateX(6deg)" }}
            className="relative rounded-3xl border border-amber-900/10 bg-white p-6 glow-amber"
          >
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {products.map((p, i) => {
                const lit = p.fundedPct > 0;
                const full = p.fundedPct >= 100;
                const Icon = iconFor(p.name);
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.04 * i }}
                    className={`relative rounded-xl p-3 flex flex-col items-center gap-1.5 text-center border transition-colors duration-700 ${full ? "pulse-lit" : ""}`}
                    style={{
                      borderColor: lit ? "rgba(217,119,6,0.35)" : "rgba(217,119,6,0.08)",
                      background: lit
                        ? `linear-gradient(180deg, rgba(251,191,36,${0.12 + (p.fundedPct / 100) * 0.16}), rgba(251,191,36,0.03))`
                        : "rgba(217,119,6,0.025)",
                    }}
                  >
                    {p.image ? (
                      <div
                        className="w-full aspect-square rounded-lg overflow-hidden transition-all duration-700 bg-white"
                        style={{ filter: lit ? `grayscale(${1 - p.fundedPct / 100}) brightness(${0.85 + (p.fundedPct / 100) * 0.3})` : "grayscale(1) brightness(0.6)" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-700"
                        style={{ background: lit ? "rgba(217,119,6,0.14)" : "rgba(217,119,6,0.06)" }}
                      >
                        <Icon
                          className="h-5 w-5 transition-all duration-700"
                          style={{ color: lit ? `rgba(180,83,9,${0.55 + (p.fundedPct / 100) * 0.45})` : "rgba(180,83,9,0.25)" }}
                          strokeWidth={1.75}
                        />
                      </div>
                    )}
                    <span className="text-[11px] text-gray-700 leading-tight">{p.name}</span>
                    <span className="text-[10px] text-gray-400">{formatMoney(p.targetPrice)}</span>
                    {full && (
                      <span className="absolute -top-1.5 -right-1.5 bg-green-600 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-bold">
                        ✓
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Barra de progreso */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-3xl font-bold warm-gradient-text">{formatMoney(totalRaised)}</span>
            <span className="text-gray-400 text-sm">de {formatMoney(campaign.goalAmount)}</span>
          </div>
          <div className="h-3 rounded-full bg-amber-900/10 overflow-hidden relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1, type: "spring" }}
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-green-500 relative overflow-hidden"
            >
              {progressPct > 0 && <div className="absolute inset-0 shimmer-bar" />}
            </motion.div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Incluye {campaign.reservePct}% reservado para envío y gastos operativos — todo se muestra de forma transparente.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-10">
          <div className="rounded-2xl border border-amber-900/10 bg-white p-3 sm:p-4 flex flex-col items-center justify-center text-center gap-1 shadow-sm">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-amber-700" />
            </div>
            <p className="text-base sm:text-lg font-semibold text-gray-900">{donorsCount}</p>
            <p className="text-[10px] sm:text-xs text-gray-400">Donantes</p>
          </div>

          <Link
            href="/canasta/sorteo"
            className={`relative rounded-2xl border p-3 sm:p-4 flex flex-col items-center justify-center text-center gap-1 shadow-sm transition-colors ${
              drawLive
                ? "border-red-400 bg-red-50 pulse-live"
                : "border-amber-900/10 bg-white hover:bg-amber-50"
            }`}
          >
            {drawLive ? (
              <>
                <Radio className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 animate-pulse" />
                <span className="text-[10px] sm:text-xs font-bold text-red-600">EN VIVO</span>
              </>
            ) : (
              <>
                <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-amber-700" />
                <span className="text-[10px] sm:text-xs font-semibold text-amber-700">Sorteo</span>
              </>
            )}
          </Link>

          <div className="rounded-2xl border border-amber-900/10 bg-white p-3 sm:p-4 flex flex-col items-center justify-center text-center gap-1 shadow-sm">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
            </div>
            <p className="text-xs sm:text-base font-semibold text-gray-900 leading-tight">
              {campaign.scheduledDrawAt
                ? new Date(campaign.scheduledDrawAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })
                : "Al completarse"}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-400">Fecha del sorteo</p>
          </div>
        </div>

        {/* CTA */}
        {progressPct >= 100 ? (
          <>
            <div className="block text-center bg-gray-200 text-gray-500 font-semibold rounded-xl py-4 cursor-not-allowed select-none">
              <span className="inline-flex items-center gap-2">
                <HeartHandshake className="h-4 w-4" /> ¡Meta completada! Ya no se reciben más donaciones
              </span>
            </div>
            <p className="text-center text-[11px] text-gray-400 mt-3">
              Pronto sorteamos entre todos los que donaron — seguí el evento en{" "}
              <Link href="/canasta/sorteo" className="text-amber-600 hover:text-amber-700 underline">
                la página del sorteo
              </Link>.
            </p>
          </>
        ) : (
          <>
            <Link
              href="/canasta/donar"
              className="block text-center bg-gradient-to-r from-amber-500 to-green-600 hover:from-amber-600 hover:to-green-700 text-white font-semibold rounded-xl py-4 transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.01]"
            >
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Donar desde $1.000
              </span>
            </Link>
            <p className="text-center text-[11px] text-gray-400 mt-3">
              Podés donar con o sin crear una cuenta. Una donación por persona por campaña.
            </p>
          </>
        )}
      </div>

      {/* Nuestro compromiso — sección institucional de seriedad */}
      <div className="border-t border-amber-900/10 bg-white px-6 py-14">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2.5 mb-6 justify-center">
            <ShieldCheck className="h-5 w-5 text-green-700" />
            <h3 className="text-xl font-bold text-gray-900">Nuestro compromiso</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {COMPROMISOS.map((c) => (
              <div key={c} className="flex items-start gap-3 rounded-xl border border-amber-900/10 bg-amber-50/40 p-4">
                <ShieldCheck className="h-4 w-4 text-green-700 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-600 leading-relaxed">{c}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">
            Los ganadores pueden compartir un mensaje, foto o video agradeciendo, que publicamos acá abajo.
          </p>
        </div>
      </div>

      {/* Canastas ya entregadas — historial real, cargado a mano por el admin */}
      {testimonials.length > 0 && (
        <div className="border-t border-amber-900/10 bg-[#FFFBF5] px-6 py-14">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2.5 mb-8 justify-center">
              <HeartHandshake className="h-5 w-5 text-amber-600" />
              <h3 className="text-xl font-bold text-gray-900">Canastas ya entregadas</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {testimonials.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="rounded-2xl border border-amber-900/10 bg-white overflow-hidden shadow-sm"
                >
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
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
