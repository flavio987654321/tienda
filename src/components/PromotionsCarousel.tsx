"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Megaphone, X } from "lucide-react";

type Promotion = { id: string; imageUrl: string; link: string | null };

const AUTO_ROTATE_MS = 5000;

export default function PromotionsCarousel() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  // Mismo criterio que el flyer de las tiendas: se puede cerrar con la X y
  // listo, no insiste — vuelve a aparecer en la próxima visita/recarga.
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    fetch("/api/promociones")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.promotions)) setPromotions(d.promotions); })
      .catch(() => {});
  }, []);

  const total = promotions.length;

  useEffect(() => {
    if (total <= 1) return;
    const t = setInterval(() => {
      setDir(1);
      setIndex((i) => (i + 1) % total);
    }, AUTO_ROTATE_MS);
    return () => clearInterval(t);
  }, [total]);

  if (total === 0) return null;

  function go(newDir: 1 | -1) {
    setDir(newDir);
    setIndex((i) => (i + newDir + total) % total);
  }

  const current = promotions[index];

  const Slide = (
    <motion.div
      key={current.id}
      initial={{ opacity: 0, x: dir * 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -dir * 40 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={current.imageUrl} alt="Promoción" className="w-full h-full object-cover" />
    </motion.div>
  );

  return (
    <AnimatePresence>
      {!closed && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
          className="px-6 py-10 bg-gray-950 overflow-hidden"
        >
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4 justify-center text-amber-400">
              <Megaphone className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-widest">Promociones</span>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40 aspect-[16/9] sm:aspect-[21/9] bg-gray-900">
              {current.link ? (
                <a href={current.link} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10 cursor-pointer" aria-label="Ver promoción" />
              ) : null}
              <AnimatePresence mode="popLayout">
                {Slide}
              </AnimatePresence>

              <button
                type="button"
                onClick={() => setClosed(true)}
                aria-label="Cerrar promociones"
                className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/15 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {total > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label="Anterior"
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 border border-white/15 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label="Siguiente"
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 border border-white/15 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                    {promotions.map((p, i) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setDir(i > index ? 1 : -1); setIndex(i); }}
                        aria-label={`Ir a la promoción ${i + 1}`}
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: i === index ? 20 : 7, background: i === index ? "#fff" : "rgba(255,255,255,0.35)" }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
