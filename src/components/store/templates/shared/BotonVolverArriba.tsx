"use client";
import { CAPAS } from "@/lib/capas-tienda";

/* "Volver arriba": aparece pasada una pantalla y media (`visible`, de
   `useEfectosScroll`). Va en la columna de abajo a la derecha, arriba del
   botón que haya ahí (WhatsApp; en Boho, el carrito si no hay WhatsApp), más
   chico: es secundario y no tiene que competirle. Sin ninguno, baja a su
   lugar. Cómo se ve (redondo, cuadrado, colores) lo pone cada template.
   Va en la capa de los flotantes (WhatsApp, carrito), DEBAJO de los paneles:
   con la de panel quedaba encima de favoritos y del buscador abiertos. Cada
   template además lo saca mientras tiene abierto un menú o un panel. */
export function BotonVolverArriba({ visible, encimaDeOtro, sinMovimiento, estilo }: {
  visible: boolean;
  /** Si abajo a la derecha ya hay un botón flotante (WhatsApp, el carrito). */
  encimaDeOtro: boolean;
  sinMovimiento: boolean;
  /** El aspecto propio del template: fondo, borde, radio, sombra, color. */
  estilo: React.CSSProperties;
}) {
  return (
    <button type="button" aria-label="Volver arriba" tabIndex={visible ? 0 : -1} aria-hidden={!visible}
      onClick={() => {
        window.scrollTo({ top: 0, behavior: sinMovimiento ? "auto" : "smooth" });
        /* El foco del teclado sube con la página: si no, quedaba en este botón,
           que se esconde, y el siguiente Tab seguía desde el final. */
        const destino = document.querySelector<HTMLElement>("header a, header button, nav a, nav button, [data-template-raiz] a[href], [data-template-raiz] button");
        destino?.focus({ preventScroll: true });
      }}
      style={{
        position:"fixed", right: encimaDeOtro ? 30 : 24, bottom: encimaDeOtro ? 88 : 24, zIndex:CAPAS.flotante, width:40, height:40,
        cursor:"pointer", display:"grid", placeItems:"center", padding:0,
        ...estilo,
        opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none",
        transform: visible ? "none" : "translateY(10px)", transition:"opacity .3s, transform .3s",
      }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
    </button>
  );
}
