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
 * sola. Nunca espera a que alguien la cierre: una pantalla de carga que depende
 * de un evento que puede no llegar es una app trabada.
 *
 * ── Y por qué tampoco se va enseguida ────────────────────────────────────────
 * La primera versión esperaba 150 ms y arrancaba a desvanecerse. Cuando la
 * página ya venía cargada —que es lo normal la segunda vez que abrís la app— el
 * nombre aparecía y se iba en medio segundo, encadenado a la pantalla de
 * arranque de Android: se veía un parpadeo entre el ícono del sistema y el
 * panel, y no llegabas a leer nada. Flavio lo describió así: "el título ni se
 * alcanza a ver de lo rápido que pasa".
 *
 * Una pantalla que no se alcanza a leer es peor que no tenerla: agrega un
 * destello y no comunica. Así que hay un piso — `MINIMO_EN_PANTALLA` — y la tapa
 * se queda al menos ese tiempo aunque no haya nada que esperar. Si la carga
 * tarda más, manda la carga; el piso nunca la hace tardar más de lo que ya
 * tardaba, sólo evita que se vaya antes de decir qué app es.
 */

/* Cuánto se queda como mínimo, contado desde que se dibuja.
   900 ms alcanza para leer dos palabras y no llega a sentirse como una espera;
   por debajo de ~700 la lectura no entra, y por arriba de ~1200 empieza a
   parecer que la app tarda en abrir. */
const MINIMO_EN_PANTALLA = 900;

/* Lo que dura el desvanecido, y cuánto se espera para sacar la tapa del DOM.
   El segundo va después del primero a propósito: si se quitara justo al terminar
   la transición, cualquier retraso del navegador la sacaría a mitad de camino y
   el panel aparecería de golpe. Los dos salen de acá para que no se separen. */
const DURACION_FUNDIDO = 380;
const DURACION_SALIDA = DURACION_FUNDIDO + 40;

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

    const desde = Date.now();
    let salida: ReturnType<typeof setTimeout>;
    let quitar: ReturnType<typeof setTimeout>;

    /* Lo que falte para completar el mínimo. Si la carga ya se comió esos 900 ms
       —una app que abre por primera vez, con la red lenta— da 0 y se va en el
       acto: el piso es para que no se vaya ANTES, no para hacer esperar. */
    const revelar = () => {
      salida = setTimeout(() => {
        setFase("saliendo");
        quitar = setTimeout(() => setFase("listo"), DURACION_SALIDA);
      }, Math.max(0, MINIMO_EN_PANTALLA - (Date.now() - desde)));
    };

    if (document.readyState === "complete") {
      revelar();
      return () => { clearTimeout(salida); clearTimeout(quitar); };
    }

    window.addEventListener("load", revelar, { once: true });
    return () => {
      window.removeEventListener("load", revelar);
      clearTimeout(salida);
      clearTimeout(quitar);
    };
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
          transition: `opacity ${DURACION_FUNDIDO}ms cubic-bezier(0.4, 0, 0.2, 1)`,
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
