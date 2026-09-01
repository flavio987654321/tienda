import { TOPES_DIGITALES } from "@/lib/planLimits";

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
export function featuresDigital(tier: TierDigital) {
  const t = TOPES_DIGITALES[tier];
  const pago = tier !== "FREE";
  return [
    { text: `${t.paginas} página${t.paginas === 1 ? "" : "s"} de venta`, on: true },
    { text: `${t.bonos} bono${t.bonos === 1 ? "" : "s"} por producto`, on: true },
    /* Sin upsells se nombra la función, no el número: "0 upsells por producto"
       se lee como un error de programación y no como algo que no tenés. */
    { text: t.upsells > 0 ? `${t.upsells} upsell${t.upsells === 1 ? "" : "s"} por producto` : "Upsells por producto", on: t.upsells > 0 },
    { text: pago ? `${t.ebooksIA} ebooks escritos con IA por mes` : "Ebooks escritos con IA", on: pago },
    { text: "Página de venta armada con IA", on: pago },
    { text: "Textos y mails con IA", on: pago },
    { text: "Sasha, la asistente", on: pago },
    { text: "Pagos con transferencia", on: pago },
    { text: "Entrega automática con token", on: true },
    { text: "Descargas y estadísticas", on: true },
    { text: "Ver carritos abandonados", on: true },
    { text: "Mail automático de recuperación", on: tier === "PRO" },
    { text: "Dominio propio", on: tier === "PRO" },
  ];
}
