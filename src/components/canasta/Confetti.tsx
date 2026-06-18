"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

const COLORS = ["#f59e0b", "#16a34a", "#ea580c", "#fbbf24", "#22c55e", "#d97706"];
const PIECE_COUNT = 24;

// Explosión de confeti puramente decorativa (no representa ni influye en
// ningún dato real del sorteo). `trigger` cambia cada vez que hay que
// disparar una explosión nueva (ej: nuevo ganador revelado).
export default function Confetti({ trigger }: { trigger: string }) {
  const pieces = useMemo(() => {
    return Array.from({ length: PIECE_COUNT }, (_, i) => {
      // eslint-disable-next-line react-hooks/purity -- ángulo del confeti, puramente visual
      const angle = Math.random() * Math.PI * 2;
      // eslint-disable-next-line react-hooks/purity -- distancia del confeti, puramente visual
      const distance = 70 + Math.random() * 110;
      // eslint-disable-next-line react-hooks/purity -- rotación del confeti, puramente visual
      const rotate = (Math.random() - 0.5) * 360;
      return {
        id: i,
        color: COLORS[i % COLORS.length],
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        rotate,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- "trigger" cambia para forzar una explosión nueva
  }, [trigger]);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {pieces.map((p) => (
        <motion.span
          key={`${trigger}-${p.id}`}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.6 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="absolute w-2 h-2 rounded-sm"
          style={{ background: p.color }}
        />
      ))}
    </div>
  );
}
