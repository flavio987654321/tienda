import { TOPES_DIGITALES, EBOOKS_IA_ARRANQUE } from "@/lib/planLimits";

/* El texto de los tres planes de Productos Digitales, en un solo lugar.
 *
 * Vive acá y no adentro de `/precios` porque ahora lo dibujan DOS pantallas: la
 * página de precios y el registro, donde se elige el plan antes de crear la
 * cuenta. Copiado en las dos se desincroniza solo — se agrega una función a un
 * plan y queda sin nombrar en la otra pantalla, que es como se termina
 * prometiendo de más en una y de menos en la otra.
 *
 * No importa Prisma a propósito: lo leen dos componentes de navegador. */

export type TierDigital = "FREE" | "STARTER" | "PRO";

export const TIERS_DIGITALES: TierDigital[] = ["FREE", "STARTER", "PRO"];

/**
 * Si este plan es el más alto que hay, o sea que no hay a dónde mejorar.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * SIRVE PARA NO OFRECER ALGO QUE NO EXISTE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Sin esto, el panel le dice a quien ya está en Pro **"Llegaste al tope de tu
 * plan →"** con un enlace a mejorar. Y no hay nada mejor: paga el más caro y la
 * pantalla lo sigue empujando a comprar. Eso se lee como que le falta algo, y
 * al llegar a Mi cuenta descubre que ya lo tiene — la peor combinación, porque
 * primero le hace dudar y después le hace perder el viaje.
 *
 * ⚠️ Sale del ÚLTIMO de `TIERS_DIGITALES`, no de la palabra `"PRO"`. Escrito a
 * mano, el día que se agregue un cuarto plan esto seguiría diciendo que Pro es
 * el techo y le escondería la mejora justo a quien la puede pagar.
 */
export function esElPlanMasAlto(tier: TierDigital): boolean {
  return tier === TIERS_DIGITALES[TIERS_DIGITALES.length - 1];
}

export const COPY_DIGITAL: Record<TierDigital, { nombre: string; bajada: string }> = {
  FREE:    { nombre: "Free",    bajada: "Para validar tu primer producto." },
  STARTER: { nombre: "Starter", bajada: "Para arrancar tu negocio digital con IA." },
  PRO:     { nombre: "Pro",     bajada: "Para escalar: más volumen, recuperación y marca propia." },
};

/**
 * Las mismas filas para los tres planes, prendidas o apagadas según el tier. Una
 * lista por plan se desincroniza sola: se agrega una función arriba y queda sin
 * nombrar en los otros dos, que es como se termina prometiendo de más.
 */
/**
 * La "s" del plural: `1 bono`, `2 bonos`.
 *
 * Toma `number` a propósito y no el literal del tope. Comparando contra el valor
 * —`t.bonos === 1`— TypeScript ve que hoy ninguno de los tres planes vale 1 y
 * marca la comparación como imposible, así que el archivo deja de compilar cada
 * vez que se toca un número. Y estos números se tocan todo el tiempo.
 */
const s = (n: number) => (n === 1 ? "" : "s");

export function featuresDigital(tier: TierDigital) {
  const t = TOPES_DIGITALES[tier];
  const pago = tier !== "FREE";
  return [
    { text: `${t.paginas} página${s(t.paginas)} de venta`, on: true },
    { text: `${t.bonos} bono${s(t.bonos)} por producto`, on: true },
    /* Sin upsells se nombra la función, no el número: "0 upsells por producto"
       se lee como un error de programación y no como algo que no tenés. */
    { text: t.upsells > 0 ? `${t.upsells} upsell${s(t.upsells)} por producto` : "Upsells por producto", on: t.upsells > 0 },
    /* La dirección propia va en los TRES planes, y el dominio sólo en Pro: lo que
       Pro compra es la calle, no la casa. Gatear el subdominio dejaría a Starter
       con dos productos de dos nichos colgando de una sola dirección, que es
       justo el problema que la Fase 5 bis viene a arreglar. Ver allá. */
    { text: "Dirección propia para cada producto", on: true },
    /* Sin generaciones se nombra la función y va apagada, igual que los upsells:
       "0 ebooks escritos con IA" se lee como un error de programación. */
    {
      text: t.ebooksIA > 0
        ? `${EBOOKS_IA_ARRANQUE[tier]} ebooks con IA al empezar, y ${t.ebooksIA} por mes`
        : "Ebooks escritos con IA",
      on: t.ebooksIA > 0,
    },
    /* ⚠️ Esto SÍ lo tiene Free, y es la mitad que importa de la decisión del
       01/09/26: la IA le arma la página y las fichas, y el ebook lo trae la
       persona. Apagarlo en Free dejaba una cuenta gratis sin nada de IA, que era
       justo lo que se quiso arreglar. Ver el comentario largo en `planLimits`. */
    { text: "Página de venta armada con IA", on: true },
    { text: "Textos y mails con IA", on: pago },
    { text: "Sasha, la asistente", on: pago },
    { text: "Entrega automática con token", on: true },
    { text: "Cupones de descuento", on: true },
    /* Estadísticas en tres escalones, que es donde la competencia pone el
       candado y lo que le da al de Free un motivo para subir: las ventas las
       ve todo el mundo —ya las paga con su comisión—; las visitas y la
       conversión de cada página, desde Starter; el embudo y de dónde vienen
       las visitas (UTM), sólo Pro. Ver `estadisticas-digitales`. */
    { text: "Estadísticas de ventas y descargas", on: true },
    { text: "Visitas y conversión de cada página", on: pago },
    { text: "Embudo y origen de las visitas (UTM)", on: tier === "PRO" },
    { text: "Ver carritos abandonados", on: true },
    { text: "Mail automático de recuperación", on: tier === "PRO" },
    /* "Por producto" no es un detalle: es TODO. Un dominio por cuenta no le sirve
       a quien vende en dos nichos, que es el caso que hace falta cubrir para que
       los 5 productos de Pro tengan sentido. */
    { text: "Dominio propio para cada producto", on: tier === "PRO" },
  ];
}
