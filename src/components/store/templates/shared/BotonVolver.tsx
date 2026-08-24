"use client";
import Link from "next/link";

/* ── El botón de volver de Aire ───────────────────────────────────────────────
 *
 * Redondo y ARRIBA A LA IZQUIERDA, que es donde se busca un "atrás".
 *
 * Vive acá, compartido, porque la ficha de un producto se dibuja en DOS lados y
 * hasta ahora cada uno tenía su propio atrás:
 *
 *   · adentro del template, cuando la clienta toca un producto sin salir de la
 *     tienda — ahí era este botón redondo;
 *   · en la página suelta, que es la que se abre desde el link que la dueña
 *     comparte por WhatsApp — ahí era un link de texto chiquito.
 *
 * Las dos son la misma pantalla y llegaban distinto, así que se veían distinto:
 * el que entra por el link compartido es justamente el que todavía no compró, y
 * no tiene por qué recibir una versión más pobre de la tienda.
 *
 * `destino` es adónde vuelve, y NO es siempre lo mismo: desde el catálogo o el
 * contacto se vuelve a la portada, desde la ficha se vuelve al catálogo. Va en el
 * `title` y en el `aria-label`, que es lo único que lo dice — una flecha sola no
 * distingue un atrás de otro. Por eso el texto no se pierde al pasar de link a
 * botón: se muda al globito y al lector de pantalla en vez de desaparecer.
 *
 * Los colores los pone quien lo usa. Sobre el papel claro de la portada y sobre
 * la tarjeta del contacto (que puede estar pintada de cualquier cosa) no puede
 * ser el mismo, así que el que sabe es el que lo dibuja.
 *
 * `href` o `onClick`, no los dos: en la página suelta tiene que ser un link de
 * verdad —se copia, se abre en otra pestaña y Google lo sigue—; adentro del
 * template no hay adónde ir, la pantalla cambia ahí mismo.
 */
type Comun = {
  /** Adónde vuelve, en castellano. Va al globito y al lector de pantalla. */
  destino: string;
  /** Fondo del botón (la superficie del bloque donde se apoya). */
  S: string;
  /** Color de la línea del borde. */
  LN: string;
  /** Color de la flecha. */
  T: string;
  /** El acento del template, para el hover. */
  G: string;
};

const estiloBase = (S: string, LN: string, T: string): React.CSSProperties => ({
  width: 40, height: 40, borderRadius: "50%", background: S,
  border: `1px solid ${LN}`, color: T,
  display: "grid", placeItems: "center", cursor: "pointer", padding: 0, flexShrink: 0,
  boxShadow: "0 2px 10px rgba(20,22,26,0.06)",
  transition: "border-color 0.2s, color 0.2s, transform 0.2s",
  textDecoration: "none",
});

const Flecha = () => (
  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

/* El hover se arma acá y no en CSS porque los colores son de quien lo usa: no
   hay una clase que sirva para los dos fondos posibles. */
const alEntrar = (G: string) => (e: React.MouseEvent<HTMLElement>) => {
  e.currentTarget.style.borderColor = G;
  e.currentTarget.style.color = G;
  e.currentTarget.style.transform = "scale(1.06)";
};
const alSalir = (LN: string, T: string) => (e: React.MouseEvent<HTMLElement>) => {
  e.currentTarget.style.borderColor = LN;
  e.currentTarget.style.color = T;
  e.currentTarget.style.transform = "scale(1)";
};

export function BotonVolver({ onClick, destino, S, LN, T, G }: Comun & { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title={destino} aria-label={destino}
      style={estiloBase(S, LN, T)}
      onMouseEnter={alEntrar(G)} onMouseLeave={alSalir(LN, T)}>
      <Flecha />
    </button>
  );
}

/** El mismo botón, pero como link de verdad: para la página suelta del producto,
 *  donde volver al catálogo SÍ es irse a otra dirección. */
export function LinkVolver({ href, destino, S, LN, T, G }: Comun & { href: string }) {
  return (
    <Link href={href} title={destino} aria-label={destino}
      style={estiloBase(S, LN, T)}
      onMouseEnter={alEntrar(G)} onMouseLeave={alSalir(LN, T)}>
      <Flecha />
    </Link>
  );
}
