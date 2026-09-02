"use client";

import { useEffect, useState } from "react";

/**
 * La barra de "oferta por tiempo limitado".
 *
 * ⚠️ **No se reinicia.** La fecha de fin viene de la base y es una sola para
 * todo el mundo: no depende de cuándo entró cada persona ni de si es la primera
 * vez que ve la página. Cuando pasa, la barra **desaparece** — no se renueva
 * sola ni vuelve a arrancar en la próxima visita.
 *
 * Eso es lo que la separa de la que tiene la competencia, que es una cuenta
 * regresiva que se reinicia y por lo tanto anuncia un límite que no existe.
 *
 * Es un componente de cliente por dos motivos, y el segundo importa más:
 *
 *   1. Una cuenta regresiva tiene que correr, y correr es del navegador.
 *   2. Comparar contra "ahora" del lado del servidor daría una barra congelada
 *      en el momento en que se dibujó la página. Con caché, mostraría un tiempo
 *      restante viejo — o seguiría mostrando una oferta ya vencida.
 *
 * Hasta que monta no dibuja nada, así que el servidor y el navegador nunca
 * pintan dos números distintos.
 */
export default function BarraDeOferta({ texto, hasta }: { texto: string; hasta: string }) {
  const [queda, setQueda] = useState<number | null>(null);

  useEffect(() => {
    const fin = Date.parse(hasta);
    if (!Number.isFinite(fin)) return;
    const tic = () => setQueda(fin - Date.now());
    tic();
    const id = setInterval(tic, 1000);
    return () => clearInterval(id);
  }, [hasta]);

  /* `null` = todavía no montó. `<= 0` = ya terminó, y entonces no va nada. */
  if (queda === null || queda <= 0) return null;

  const seg = Math.floor(queda / 1000);
  const dias = Math.floor(seg / 86400);
  const dosCifras = (n: number) => String(n).padStart(2, "0");
  const reloj = `${dosCifras(Math.floor((seg % 86400) / 3600))}:${dosCifras(
    Math.floor((seg % 3600) / 60)
  )}:${dosCifras(seg % 60)}`;

  return (
    <div className="bg-amber-400 px-5 py-3 text-center text-sm font-semibold text-amber-950">
      {texto ? `${texto} — ` : ""}
      {dias > 0 ? `${dias} ${dias === 1 ? "día" : "días"} y ` : ""}
      <span className="tabular-nums">{reloj}</span>
    </div>
  );
}
