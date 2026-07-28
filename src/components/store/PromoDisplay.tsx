"use client";
import type { CSSProperties } from "react";
import { describePromo, resolveProductPromo, type PromoDisplayProduct } from "@/lib/promoDisplay";
import type { ActivePromotion } from "@/lib/pricing";
import { extremo } from "@/lib/section-bg";

// ─────────────────────────────────────────────────────────────────────────────
// Presentación de la PROMOCIÓN de tienda en la tienda pública. Se usa en cards,
// modales, detalle y los templates. Es distinta del OfferBadge (la "oferta" del
// producto, que va en ROJO) a propósito, y ese rojo queda reservado para eso: las
// promos tienen su propia paleta, un color por tipo (ver COLOR_PROMO abajo), para
// que el comprador distinga de un vistazo "promoción de tienda" de "oferta del
// producto" — y además de qué clase de promo se trata.
//   · PromoTag   → tag rectangular en la esquina de la foto (cards + modal).
//   · PromoBlock → bloque explicativo (headline + alcance + condiciones) para el
//                  modal/detalle, donde sí hay lugar para el detalle completo.
// ─────────────────────────────────────────────────────────────────────────────

// ── Un color por TIPO de promoción ───────────────────────────────────────────
// Todas iban naranja. En una grilla con un 3×2, un 20% y un descuento en pesos,
// los tres tags se veían idénticos y había que leerlos uno por uno para saber qué
// ofrecía cada producto. El color hace ese trabajo de un vistazo.
//
// El ROJO no entra en esta paleta a propósito: es el de la OFERTA del producto
// (OfferBadge), y esa distinción -promo de tienda vs. oferta- ya está establecida.
// El teal del envío gratis es el mismo que usa su aviso en el carrito.
// Dos criterios, y el segundo es el que se suele olvidar:
//
//   1) Cada tono da 5:1 o mas contra el blanco, que es lo que necesita texto chico.
//      El naranja original (#ea580c) daba 3.56 y el teal 3.74 — se leian flojo y
//      nadie lo habia medido.
//   2) Estan REPARTIDOS por la rueda de color, con 49deg o mas entre vecinos. No
//      alcanza con que cada uno se lea: elegidos de a uno quedaron un violeta a
//      262deg y un indigo a 243deg, y a 10px de alto eran el mismo color. Lo mismo
//      el verde con el teal, a 33deg.
//
//   naranja 17 · lima 86 · teal 175 · azul 224 · fucsia 295
//
// El ROJO no entra: es el de la OFERTA del producto (OfferBadge).
const COLOR_PROMO: Record<string, string> = {
  PERCENT:       "#c2410c", // naranja — el de siempre, un tono mas oscuro (5.18)
  N_PAY_M:       "#4d7c0f", // lima    — "una te sale gratis" (4.99)
  FREE_SHIPPING: "#0f766e", // teal    — familia del aviso de envio del carrito (5.47)
  MIX_N_PAY_M:   "#1d4ed8", // azul    — combo: pariente del NxM, pero otra cosa (6.70)
  FIXED:         "#a21caf", // fucsia  — descuento en pesos, no en porcentaje (6.32)
};
const COLOR_PROMO_FALLBACK = "#c2410c";

// ── La paleta se puede cambiar por template ──────────────────────────────────
// La de arriba son tonos profundos con texto blanco, y es la que usan casi todos.
// Urban Pulse habla otro idioma —bloques planos, alto contraste, sin degradados—
// y con la paleta profunda sus chips se veían iguales a los de Chic Paris.
//
// Los tonos de abajo se eligieron con los MISMOS dos criterios que los de arriba,
// medidos y no a ojo:
//   1) cada uno da 5:1 o más contra el texto que le toca (el más justo, 6.11)
//   2) están repartidos por la rueda, con 60° o más entre vecinos — a 10px de alto
//      dos colores cercanos son el mismo color
// Y uno propio: que NO se confundan con los de Chic Paris, que era el pedido.
//
//   amarillo 50 · verde 130 · cyan 190 · violeta 255 · magenta 320
export type PaletaPromo = Record<string, string>;

export const PALETA_PROMO_NEON: PaletaPromo = {
  PERCENT:       "#ffd91a", // amarillo señal (15.01)
  N_PAY_M:       "#2bee4b", // verde neón     (13.27)
  FREE_SHIPPING: "#10d2f9", // cyan           (11.47)
  MIX_N_PAY_M:   "#9674fb", // violeta        ( 6.11)
  FIXED:         "#fb51c2", // magenta        ( 6.97)
};

// Qué template usa qué paleta. Vive acá y no en cada pantalla porque la página de
// LISTADO también dibuja promos y se pinta con los colores del template del que
// viene (`?t=`): sin esta tabla, el mismo 3×2 se veía violeta en la portada de Urban
// Pulse y azul una pantalla después, al tocar "Ver colección completa".
// Los que no figuran usan la clásica.
const PALETA_POR_TEMPLATE: Record<string, PaletaPromo> = {
  "urban-pulse": PALETA_PROMO_NEON,
};

export function paletaDeTemplate(t?: string | null): PaletaPromo | undefined {
  return (t && PALETA_POR_TEMPLATE[t]) || undefined;
}

/**
 * El mismo color de la promo pero oscurecido lo justo para que se LEA como texto
 * sobre un fondo claro. Un tono sirve de relleno con mucho menos contraste del que
 * necesita para ser texto, así que es una pregunta distinta y tiene su función.
 * Devuelve el color tal cual si ya se lee: los tonos profundos no se tocan.
 */
export function paraTexto(fondo: string): string {
  let c = fondo;
  // De a poco y con tope: 8 vueltas del 18% alcanzan para el amarillo más claro, y
  // el tope evita quedarse dando vueltas si `extremo` no puede leer el color.
  for (let i = 0; i < 8 && contrasta(c, "#ffffff") < 4.5; i++) c = extremo(c, "oscuro", 18);
  return c;
}

/** Color de fondo del tipo de promo, y el de texto que se lee encima. */
export function coloresPromo(tipo?: string, paleta: PaletaPromo = COLOR_PROMO) {
  const fondo = (tipo && paleta[tipo]) || paleta.PERCENT || COLOR_PROMO_FALLBACK;
  // Se elige el que MAS contrasta, no por un umbral de luminosidad. `getContrastColor`
  // decide con lum > 0.5 y sobre estos tonos se equivocaba: para el naranja pedia
  // blanco (3.56) cuando el negro daba 5.30. Asi, si mañana alguien mete un amarillo
  // en la tabla de arriba, el texto se da vuelta solo en vez de quedar ilegible.
  return { fondo, texto: contrasta(fondo, "#ffffff") >= contrasta(fondo, "#111111") ? "#fff" : "#111" };
}

// Ratio de contraste WCAG entre dos colores: (L1 + 0.05) / (L2 + 0.05).
function contrasta(a: string, b: string): number {
  const la = luminanciaRelativa(a);
  const lb = luminanciaRelativa(b);
  if (la == null || lb == null) return 1;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function luminanciaRelativa(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const canal = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

export function PromoTag({ label, size = "md", tipo, paleta }: { label: string; size?: "sm" | "md"; tipo?: string; paleta?: PaletaPromo }) {
  const sm = size === "sm";
  const { fondo, texto } = coloresPromo(tipo, paleta);
  const style: CSSProperties = {
    position: "absolute",
    top: sm ? 8 : 14,
    left: sm ? 8 : 14,
    zIndex: 5,
    background: fondo,
    color: texto,
    fontSize: sm ? 10 : 11,
    fontWeight: 800,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    padding: sm ? "4px 8px" : "6px 11px",
    borderRadius: 4,
    boxShadow: "0 2px 10px rgba(0,0,0,0.28)",
    maxWidth: "78%",
    lineHeight: 1.15,
    pointerEvents: "none",
  };
  return <div style={style}>{label}</div>;
}

export function PromoBlock({ promo, freeShippingExtra = false, paleta }: { promo: ActivePromotion; freeShippingExtra?: boolean; paleta?: PaletaPromo }) {
  const d = describePromo(promo);
  // El bloque sigue el color de su tipo, igual que el tag: si el tag de la foto es
  // violeta y el cuadro de abajo naranja, parecen dos promos distintas.
  // El fondo y el borde son el mismo color con alfa (14 ≈ 8%, 40 ≈ 25%), así no
  // hay que mantener una segunda tabla de tintes por tipo.
  const { fondo } = coloresPromo(promo.type, paleta);
  // El titular y los puntitos van con el color de la promo, pero acá el color se usa
  // como TEXTO sobre un tinte casi blanco, y eso es otra pregunta que usarlo de
  // relleno. Los tonos profundos de la paleta clásica se leen bien; los neón de
  // Urban Pulse no: el amarillo #ffd91a sobre blanco da 1.4. `paraTexto` lo oscurece
  // lo justo, así el bloque sigue siendo del color de su promo sin volverse ilegible.
  const tinta = paraTexto(fondo);
  return (
    <div style={{ background: `${fondo}14`, border: `1px solid ${fondo}40`, borderRadius: 6, padding: "11px 13px", display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: tinta }}>¡{d.headline}!</div>
      {/* El cuerpo va en gris oscuro y no en el color de la promo: sobre un tinte
          tan claro, el color propio de cada tipo se lee flojo. */}
      <div style={{ fontSize: 12.5, color: "#3f3f46", lineHeight: 1.5 }}>Válido {d.scope}.</div>
      {d.conditions.map((c, i) => (
        <div key={i} style={{ fontSize: 11.5, color: "#3f3f46", opacity: 0.85, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: tinta, display: "inline-block", flexShrink: 0 }} />
          {c}
        </div>
      ))}
      {freeShippingExtra && promo.type !== "FREE_SHIPPING" && (
        <div style={{ fontSize: 12, color: "#0d9488", fontWeight: 700, marginTop: 2 }}>🚚 Envío gratis incluido</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PromoPrice — el precio de un producto en cualquier lista de la tienda.
//
// Existe porque el precio se mostraba en siete lugares distintos de un mismo
// template y solo dos consultaban las promociones. Los otros cinco —ofertas, lo
// más visto, el buscador, favoritos, productos similares— escribían `fmt(p.price)`
// a mano. Con una promo del 20% vigente, el mismo producto aparecía a $8.000 en la
// grilla y a $10.000 tres bloques más abajo, las dos cosas visibles a la vez.
//
// La cuenta no se repite acá: `resolveProductPromo` reusa el motor, así que el
// precio que se ve es el que después cobra el checkout. Lo que aporta este
// componente es que sea IMPOSIBLE mostrar un precio sin haber preguntado por las
// promos — no hay forma de pintar el número salteándose el paso.
//
// El tamaño y el peso los define cada sección: la idea es unificar la CUENTA, no
// aplanar el diseño de los templates.
// ─────────────────────────────────────────────────────────────────────────────

export function PromoPrice({
  product,
  promotions,
  fmt,
  accent,
  priceSize,
  compareSize,
  weight = 800,
  ocultarPrecios = false,
  consultaLabel = "Consultá precio",
  gap = 6,
  align = "baseline",
  sobre,
  rebajado,
  style,
}: {
  /** El producto tal cual viene del storefront. `comparePrice` es opcional: sin él, no se tacha nada. */
  product: PromoDisplayProduct & { comparePrice?: number | null };
  promotions: ActivePromotion[] | undefined | null;
  /** El formateador de moneda del template (`fmt` de useCartLogic). */
  fmt: (n: number) => string;
  /** Color del precio cuando NO hay descuento — el acento de la tienda. */
  accent: string;
  priceSize: number;
  /** Tamaño del precio tachado. Omitirlo esconde el tachado (listas muy compactas). */
  compareSize?: number;
  weight?: number;
  ocultarPrecios?: boolean;
  consultaLabel?: string;
  gap?: number;
  align?: CSSProperties["alignItems"];
  /**
   * Color del precio cuando SÍ hay descuento. Sin esta prop sigue siendo el rojo
   * de siempre, así que los templates que no la pasan no cambian en nada.
   *
   * Existe porque el rojo es un color FIJO: no mira el fondo de la sección —que
   * la dueña puede editar— ni tiene relación con la paleta del template. Sobre
   * los fondos de Urban Pulse daba entre 3,97 y 4,83 de contraste: nunca
   * ilegible, porque son números grandes y en negrita, pero nunca bien tampoco. Y
   * el día que alguien pone un fondo rojizo, el precio de oferta desaparece.
   */
  rebajado?: string;
  /**
   * Color de TEXTO del bloque donde se dibuja este precio (el que el template ya
   * eligió para que contraste con el fondo de esa sección). De ahí sale el color
   * del precio tachado. Antes era un `#aaa` fijo pensado para fondo blanco: en un
   * bloque beige, verde o negro el tachado se perdía justo cuando es la prueba de
   * que hay descuento. Sin este dato se mantiene el gris de siempre.
   */
  sobre?: string;
  style?: CSSProperties;
}) {
  const wrap: CSSProperties = { display: "flex", alignItems: align, gap, flexWrap: "wrap", ...style };
  // La opacidad es la que lo deja "apagado" respecto del precio real, y como
  // atenúa CONTRA el fondo del bloque nunca lo vuelve ilegible.
  const tachado: CSSProperties = sobre
    ? { color: sobre, opacity: 0.6, textDecoration: "line-through" }
    : { color: "#aaa", textDecoration: "line-through" };

  if (ocultarPrecios) {
    return (
      <div style={wrap}>
        <span style={{ fontSize: priceSize, fontWeight: weight, color: accent }}>{consultaLabel}</span>
      </div>
    );
  }

  const promo = resolveProductPromo(product, promotions);

  // Hay promo de tienda: el precio baja de verdad, y se pinta distinto del normal
  // para que se note. Por defecto el rojo de siempre; el template puede pasar el
  // suyo con `rebajado` (ver el comentario de la prop).
  if (promo.hasPriceDrop) {
    return (
      <div style={wrap}>
        <span style={{ fontSize: priceSize, fontWeight: weight, color: rebajado ?? "#dc2626" }}>{fmt(promo.effectivePrice)}</span>
        {compareSize != null && (
          <span style={{ fontSize: compareSize, ...tachado }}>{fmt(promo.originalPrice)}</span>
        )}
      </div>
    );
  }

  // Sin promo: precio normal, y el tachado de la "oferta" del producto si la tiene.
  const enOferta = product.comparePrice != null && product.comparePrice > product.price;
  return (
    <div style={wrap}>
      <span style={{ fontSize: priceSize, fontWeight: weight, color: accent }}>{fmt(product.price)}</span>
      {compareSize != null && enOferta && (
        <span style={{ fontSize: compareSize, ...tachado }}>{fmt(product.comparePrice!)}</span>
      )}
    </div>
  );
}
