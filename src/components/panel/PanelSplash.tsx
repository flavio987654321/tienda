"use client";

import { useLayoutEffect, useState } from "react";
import { AppLogo } from "@/components/AppLogo";
import { esAppInstalada } from "@/lib/pwa";

type Fase = "tapando" | "saliendo" | "listo";

/**
 * La pantalla que se ve al abrir un panel instalado.
 *
 * ── Qué problema resuelve ────────────────────────────────────────────────────
 * Android arma solo una pantalla de arranque con lo que dice el manifiesto: el
 * fondo y el ícono, nada más. Se ve el logo flotando en un blanco vacío, sin
 * decir qué app es ni que está cargando; si tarda un segundo de más parece
 * trabada. Esto lo reemplaza por algo que sí habla: el logo, el nombre del panel
 * y un "Cargando…".
 *
 * ── Quién decide que esto no se vea en la web: el CSS, no el JavaScript ──────
 * La primera versión lo decidía con `useLayoutEffect`, igual que `PwaFadeIn` en
 * las tiendas. No alcanza, y se vio midiendo: el servidor no puede saber si esto
 * se abrió como app instalada, así que manda el HTML CON la tapa puesta y el
 * navegador la pinta antes de que el JavaScript llegue a sacarla. En una pestaña
 * común eso es un parpadeo con el logo y un "Cargando…" que no tiene por qué
 * estar ahí.
 *
 * El CSS sí lo sabe en el momento de pintar: `@media (display-mode: standalone)`
 * hace exactamente la misma pregunta que `esAppInstalada()`, pero contestada por
 * el navegador antes del primer píxel y sin esperar a nadie. Fuera de la app la
 * tapa nunca se dibuja; adentro se dibuja de entrada.
 *
 * Al JavaScript le queda sólo sacarla cuando la página terminó de cargar.
 *
 * ── Por qué no se queda pegada ───────────────────────────────────────────────
 * Se va con el evento de carga, y si la página ya había terminado igual se va
 * sola a los 150 ms. Nunca espera a que alguien la cierre: una pantalla de carga
 * que depende de un evento que puede no llegar es una app trabada.
 */
export default function PanelSplash({ nombre }: { nombre: string }) {
  const [fase, setFase] = useState<Fase>("tapando");

  useLayoutEffect(() => {
    /* En una pestaña común el CSS ya la tiene escondida, pero igual se saca del
       DOM: dejar colgado un elemento que tapa la pantalla entera —aunque esté en
       `display: none`— es la clase de cosa que un día vuelve por un cambio de
       estilos en otro lado. */
    if (!esAppInstalada()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFase("listo");
      return;
    }

    const revelar = () => {
      setFase("saliendo");
      setTimeout(() => setFase("listo"), 420);
    };

    if (document.readyState === "complete") {
      const t = setTimeout(revelar, 150);
      return () => clearTimeout(t);
    }

    const alCargar = () => setTimeout(revelar, 150);
    window.addEventListener("load", alCargar, { once: true });
    return () => window.removeEventListener("load", alCargar);
  }, []);

  if (fase === "listo") return null;

  return (
    <>
      {/* La regla que hace que esto no exista en una pestaña común.

          Va en un `<style>` y no en una clase de Tailwind por dos motivos:
          `display-mode` es una consulta de medios que Tailwind no trae, y esto
          tiene que viajar en el MISMO HTML que la tapa — si llegara después, el
          parpadeo que viene a evitar pasaría igual.

          Y el `display` no puede ir en el `style` de abajo: un estilo en línea le
          gana a cualquier hoja, así que un `display: flex` ahí volvería a mostrar
          la tapa en la web y dejaría esta regla sin efecto. */}
      <style>{`
        .splash-panel { display: none; }
        @media (display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui) {
          .splash-panel {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
        }
      `}</style>

      <div
        aria-hidden="true"
        className="splash-panel"
        style={{
          position: "fixed",
          inset: 0,
          /* Bien arriba de todo: esto tapa el panel entero mientras hidrata, y
             cualquier cosa que quedara por encima se vería flotando sobre una
             pantalla de carga. */
          zIndex: 2147483000,
          background: "#ffffff",
          gap: 18,
          pointerEvents: "none",
          willChange: "opacity",
          transition: "opacity 380ms cubic-bezier(0.4, 0, 0.2, 1)",
          opacity: fase === "saliendo" ? 0 : 1,
        }}
      >
        <AppLogo size={132} />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
            {nombre}
          </span>
          <span style={{ fontSize: 13, color: "#9ca3af" }}>Cargando…</span>
        </div>
      </div>
    </>
  );
}
