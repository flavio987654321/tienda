"use client";

import { useEffect, useState } from "react";
import { useStorefront } from "@/hooks/useStorefront";
import { resolveStoreEvent } from "@/lib/promoDisplay";

// Banner del evento comercial ("BLACK FRIDAY"), arriba de toda la tienda.
//
// Se monta una sola vez en StorefrontTemplateRenderer, al lado del flyer y la
// ruleta, así lo heredan los 8 templates que muestran promos — y también los que
// se agreguen después, sin tocar nada.
//
// De qué evento habla lo decide resolveStoreEvent, el mismo que usan el tag del
// producto y el filtro. Por eso no puede pasar que el banner anuncie Black Friday
// y las etiquetas digan otra cosa.

function faltan(hasta: Date, ahora: Date): { d: number; h: number; m: number } | null {
  const ms = hasta.getTime() - ahora.getTime();
  if (ms <= 0) return null;
  return {
    d: Math.floor(ms / 86_400_000),
    h: Math.floor((ms % 86_400_000) / 3_600_000),
    m: Math.floor((ms % 3_600_000) / 60_000),
  };
}

export default function EventBanner() {
  const { promotions } = useStorefront();
  const evento = resolveStoreEvent(promotions);

  const finMs = evento?.endsAt ? evento.endsAt.getTime() : null;

  // Se calcula ya en el primer render (no dentro del efecto) para que el reloj
  // aparezca de una y no medio minuto después. El servidor y el navegador no
  // comparten el "ahora" exacto, así que el número va con suppressHydrationWarning.
  const [restante, setRestante] = useState(() =>
    finMs != null ? faltan(new Date(finMs), new Date()) : null
  );

  useEffect(() => {
    if (finMs == null) return;
    // Cada 30 s: alcanza para que los minutos se vean al día y no gasta batería
    // como un tick por segundo.
    const id = setInterval(() => setRestante(faltan(new Date(finMs), new Date())), 30_000);
    return () => clearInterval(id);
  }, [finMs]);

  if (!evento) return null;

  // Terminó mientras la página seguía abierta (el corte real lo hace el servidor
  // al recargar): mejor no mostrar nada que un "termina en 0 min".
  if (finMs != null && !restante) return null;

  return (
    <div className="w-full bg-gray-900 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2.5 text-center">
        <span className="text-sm font-black uppercase tracking-[0.18em]">{evento.label}</span>
        {restante && (
          <>
            <span aria-hidden className="text-white/30">·</span>
            <span className="text-[13px] text-white/80" suppressHydrationWarning>
              termina en{" "}
              <strong className="font-semibold text-white">
                {restante.d > 0 && `${restante.d} ${restante.d === 1 ? "día" : "días"} `}
                {(restante.d > 0 || restante.h > 0) && `${restante.h} h `}
                {restante.d === 0 && `${restante.m} min`}
              </strong>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
