"use client";

import { motion } from "framer-motion";
import { PiggyBank } from "lucide-react";

function formatMoney(n: number) {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

// Visual del progreso de una Causa Libre. Si hay goalAmount, se llena en
// proporción (como la grilla de productos de la Canasta); si no, solo
// muestra lo recaudado sin tope ni barra. No incluye foto/video/descripción
// de la causa — eso es un bloque separado, cargado en otro momento.
export default function ChanchitoMeter({ totalRaised, goalAmount, progressPct }: { totalRaised: number; goalAmount: number | null; progressPct: number | null }) {
  return (
    <div className="rounded-3xl border border-amber-900/10 bg-white p-6 sm:p-8 shadow-sm text-center">
      <div className="relative w-28 h-28 mx-auto mb-4">
        <div className="absolute inset-0 rounded-full bg-amber-100" />
        {goalAmount && progressPct !== null && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-400 to-amber-300 rounded-full"
            initial={{ height: 0 }}
            animate={{ height: `${progressPct}%` }}
            transition={{ duration: 1, type: "spring" }}
            style={{ clipPath: "circle(50% at 50% 50%)" }}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <PiggyBank className="h-12 w-12 text-amber-700" strokeWidth={1.5} />
        </div>
      </div>

      <p className="text-3xl font-bold text-amber-700">{formatMoney(totalRaised)}</p>
      {goalAmount ? (
        <>
          <p className="text-gray-400 text-sm mb-3">recaudado de {formatMoney(goalAmount)}</p>
          <div className="h-3 rounded-full bg-amber-900/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct ?? 0}%` }}
              transition={{ duration: 1, type: "spring" }}
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-green-500"
            />
          </div>
        </>
      ) : (
        <p className="text-gray-400 text-sm">recaudado hasta ahora — esta causa no tiene un tope fijo</p>
      )}
    </div>
  );
}
