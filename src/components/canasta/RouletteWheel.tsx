"use client";

import { useEffect, useMemo, useState } from "react";

const SEGMENT_COLORS = ["#f59e0b", "#ea580c", "#fbbf24", "#16a34a", "#d97706", "#22c55e"];
const PREVIEW_PLACEHOLDERS = ["Nombre 1", "Nombre 2", "Nombre 3", "Nombre 4", "Nombre 5", "Nombre 6"];
const TOTAL_SPINS = 6; // vueltas completas durante la animación
const MAX_SEGMENTS = 20; // con más participantes que esto, se ve apretado pero sigue funcionando

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function buildWheelBackground(n: number) {
  const anglePerSegment = 360 / n;
  const stops = Array.from({ length: n }, (_, i) => {
    const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
    return `${color} ${i * anglePerSegment}deg ${(i + 1) * anglePerSegment}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

// Rueda circular real. Antes de que el servidor revele un resultado, gira y
// desacelera de forma genérica (no apunta a nadie en particular). Cuando se
// le pasa `landOnName`, en cambio, el giro termina exactamente sobre ese
// nombre — pero solo se le pasa ese nombre cuando el servidor ya lo reveló
// (ver SorteoLive), nunca antes.
export default function RouletteWheel({
  names,
  elapsedMs,
  durationMs,
  preview = false,
  landOnName,
}: {
  names: string[];
  elapsedMs: number;
  durationMs: number;
  preview?: boolean;
  landOnName?: string;
}) {
  const [tick, setTick] = useState(0);

  // El orden mostrado es al azar para no mostrar siempre a los mismos
  // primeros donantes. Es una randomización puramente visual (sin impacto
  // en el resultado real del sorteo), por eso el Math.random() acá es
  // intencional pese a la regla de pureza de renders.
  // Dependencia por contenido (no por referencia): `names` puede llegar
  // como un array nuevo en cada render del padre aunque el contenido sea
  // el mismo — sin esto, se volvería a mezclar en cada render y el orden
  // "bailaría" todo el tiempo en vez de quedar fijo.
  const namesKey = names.join("|");
  const labels = useMemo(() => {
    const pool = names.length > 0 ? names : preview ? PREVIEW_PLACEHOLDERS : ["..."];
    // eslint-disable-next-line react-hooks/purity -- shuffle visual, sin efecto en el resultado real del sorteo
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    let sliced = shuffled.slice(0, MAX_SEGMENTS);
    // Si hay que caer en un nombre puntual, ese nombre tiene que estar sí o sí
    // entre los segmentos dibujados, sin importar cuántos participantes haya.
    if (landOnName && !sliced.includes(landOnName)) {
      sliced = [landOnName, ...sliced.slice(0, MAX_SEGMENTS - 1)];
    }
    return sliced;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- namesKey representa el contenido real de "names"
  }, [namesKey, preview, landOnName]);

  const hiddenCount = Math.max(0, names.length - MAX_SEGMENTS);

  useEffect(() => {
    if (preview) return;
    let raf: number;
    function loop() {
      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [preview]);

  const progress = preview ? 0 : Math.min(1, elapsedMs / durationMs);
  const anglePerSegment = labels.length > 0 ? 360 / labels.length : 360;

  // Sin nombre puntual: gira N vueltas completas y vuelve a quedar como
  // arrancó (puramente decorativo, no apunta a nadie).
  // Con nombre puntual: la vuelta final se ajusta para que el segmento de
  // ese nombre termine exactamente bajo el puntero fijo (arriba).
  let targetRotation = TOTAL_SPINS * 360;
  if (landOnName) {
    const targetIndex = labels.indexOf(landOnName);
    if (targetIndex >= 0) {
      const segmentCenterAngle = anglePerSegment * targetIndex + anglePerSegment / 2;
      const finalOffset = (360 - segmentCenterAngle) % 360;
      targetRotation = TOTAL_SPINS * 360 + finalOffset;
    }
  }
  const rotation = easeOutCubic(progress) * targetRotation;
  const radiusPct = 33; // % desde el centro donde se ubica el texto

  void tick; // fuerza re-render en cada frame mientras gira

  if (labels.length === 0) {
    return <div className="w-[78vw] h-[78vw] max-w-72 max-h-72 sm:w-80 sm:h-80 rounded-full bg-gray-100 animate-pulse mx-auto" />;
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[78vw] h-[78vw] max-w-72 max-h-72 sm:w-80 sm:h-80">
        {/* Puntero fijo */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-red-600 drop-shadow" />

        {/* Disco */}
        <div
          className="w-full h-full rounded-full border-[6px] border-amber-700 shadow-xl relative overflow-hidden"
          style={{
            background: buildWheelBackground(labels.length),
            transform: `rotate(${rotation}deg)`,
            opacity: preview ? 0.7 : 1,
          }}
        >
          {labels.map((label, i) => {
            const angleDeg = anglePerSegment * i + anglePerSegment / 2;
            const angleRad = (angleDeg * Math.PI) / 180;
            const x = 50 + radiusPct * Math.sin(angleRad);
            const y = 50 - radiusPct * Math.cos(angleRad);
            return (
              <div
                key={i}
                className="absolute text-white text-[10px] sm:text-[11px] font-bold drop-shadow text-center px-1"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: "translate(-50%, -50%)",
                  width: "70px",
                }}
              >
                {label}
              </div>
            );
          })}
        </div>

        {/* Centro decorativo, fijo (no gira) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-9 h-9 rounded-full bg-amber-700 border-4 border-white shadow-lg" />
        </div>

        {preview && (
          <span className="absolute -top-3 -right-3 text-[10px] font-semibold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
            Vista previa
          </span>
        )}
      </div>
      {!preview && hiddenCount > 0 && (
        <p className="text-xs text-gray-400 mt-4 max-w-xs text-center">
          Por espacio, la rueda dibuja {MAX_SEGMENTS} nombres al azar de los {names.length} que participan.
          Si no ves el tuyo, no te preocupes: todos tienen exactamente la misma chance de ganar.
        </p>
      )}
    </div>
  );
}
