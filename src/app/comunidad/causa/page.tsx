"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { HeartHandshake, Sparkles, Clock, Users, Phone, ArrowLeft } from "lucide-react";
import SoporteBanner from "@/components/canasta/SoporteBanner";
import DonorsModal from "@/components/canasta/DonorsModal";
import ChanchitoMeter from "@/components/canasta/ChanchitoMeter";

type CampaignData = {
  campaign: {
    id: string;
    name: string;
    description: string | null;
    goalAmount: number | null;
    mediaUrl: string | null;
    mediaType: string | null;
    contactPhone: string | null;
  } | null;
  totalRaised?: number;
  progressPct?: number | null;
  donorsCount?: number;
};

type Testimonial = {
  id: string;
  donorName: string;
  campaignName: string;
  mediaUrl: string | null;
  mediaType: string | null;
  text: string | null;
};

export default function CausaPage() {
  return (
    <Suspense>
      <CausaContent />
    </Suspense>
  );
}

function CausaContent() {
  const searchParams = useSearchParams();
  const donacion = searchParams.get("donacion");
  const [data, setData] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    fetch("/api/canasta/campaign?type=LIBRE", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/canasta/testimonials?type=LIBRE", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setTestimonials(d.testimonials ?? []))
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Cargando causa...</div>
      </div>
    );
  }

  if (!data?.campaign) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex flex-col items-center justify-center gap-4 text-center px-6">
        <HeartHandshake className="h-10 w-10 text-amber-600" />
        <p className="text-gray-600">Por ahora no hay ninguna causa activa.</p>
        <Link href="/comunidad" className="text-amber-600 hover:text-amber-700 text-sm font-medium">
          Ver más sobre cómo ayudamos
        </Link>
      </div>
    );
  }

  const { campaign, totalRaised = 0, progressPct = null, donorsCount = 0 } = data;

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-gray-900">
      {/* Header */}
      <div className="border-b border-amber-900/10 px-6 py-5 grid grid-cols-3 items-center sticky top-0 bg-[#FFFBF5]/90 backdrop-blur-xl z-10">
        <Link
          href="/comunidad"
          aria-label="Volver"
          className="w-9 h-9 rounded-full border border-amber-900/10 bg-white flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-amber-50 transition-colors justify-self-start"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Link href="/" className="text-sm font-bold text-gray-900 justify-self-center hover:text-amber-700 transition-colors">TiendaApps</Link>
        <div className="flex items-center gap-2 text-amber-700 justify-self-end">
          <HeartHandshake className="h-5 w-5" />
          <span className="text-sm font-semibold hidden sm:inline">Causa Libre</span>
        </div>
      </div>

      {donacion === "ok" && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-4 text-center">
          <p className="text-sm font-semibold text-green-800 flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" /> ¡Gracias por tu donación!
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

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Bloque 1: presentación de la causa — por qué hace falta la plata */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
          {campaign.mediaUrl && (
            <div className="w-full aspect-video rounded-2xl bg-black overflow-hidden mb-5 mx-auto">
              {campaign.mediaType === "VIDEO" ? (
                <video src={campaign.mediaUrl} controls playsInline className="w-full h-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={campaign.mediaUrl} alt={campaign.name} className="w-full h-full object-cover" />
              )}
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold mb-3 text-gray-900">{campaign.name}</h1>
          {campaign.description && (
            <p className="text-gray-600 text-base leading-relaxed whitespace-pre-line mb-4 max-w-xl mx-auto">{campaign.description}</p>
          )}
          {campaign.contactPhone && (
            <a
              href={`tel:${campaign.contactPhone}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700 bg-amber-100 px-4 py-2 rounded-full hover:bg-amber-200 transition-colors"
            >
              <Phone className="h-3.5 w-3.5" /> {campaign.contactPhone}
            </a>
          )}
        </motion.div>

        {/* Bloque 2: progreso + donar */}
        <div className="mb-10">
          <ChanchitoMeter totalRaised={totalRaised} goalAmount={campaign.goalAmount} progressPct={progressPct} />
        </div>

        <div className="grid grid-cols-1 gap-4 mb-10">
          <DonorsModal
            type="LIBRE"
            triggerClassName="rounded-2xl border border-amber-900/10 bg-white p-4 flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            trigger={
              <>
                <Users className="h-4 w-4 text-amber-700" />
                <span className="text-sm font-semibold text-gray-900">{donorsCount} donantes</span>
              </>
            }
          />
        </div>

        {progressPct !== null && progressPct >= 100 ? (
          <>
            <div className="block text-center bg-gray-200 text-gray-500 font-semibold rounded-xl py-4 cursor-not-allowed select-none">
              <span className="inline-flex items-center gap-2">
                <HeartHandshake className="h-4 w-4" /> ¡Meta completada! Ya no se reciben más donaciones
              </span>
            </div>
            <p className="text-center text-[11px] text-gray-400 mt-3">
              Pronto vamos a anunciar a quién se le entrega lo recaudado.
            </p>
          </>
        ) : (
          <>
            <Link
              href="/comunidad/causa/donar"
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

      {/* Bloque 3: historial de entregas pasadas — separado de la presentación */}
      {testimonials.length > 0 && (
        <div className="border-t border-amber-900/10 bg-white px-6 py-14">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2.5 mb-8 justify-center">
              <HeartHandshake className="h-5 w-5 text-amber-600" />
              <h3 className="text-xl font-bold text-gray-900">Causas ya entregadas</h3>
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

      <div className="border-t border-amber-900/10 bg-[#FFFBF5] px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <SoporteBanner />
        </div>
      </div>
    </div>
  );
}
