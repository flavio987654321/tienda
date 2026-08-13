import { Prisma } from "@prisma/client";

// Cliente compartido entre uso normal (prisma) y dentro de una transacción (tx):
// ambos exponen los mismos delegates. Mismo patrón que storeArchive.ts.
type DbClient = Prisma.TransactionClient;

/** Pedidos que todavía le deben algo al comprador: no se puede cerrar con estos abiertos. */
export const PENDING_ORDER_STATUSES = ["PENDING", "PROCESSING"];

export type ClosureBlockers = {
  pendingOrders: number;
  pendingBalances: number;
};

/**
 * Lo que impide cerrar o eliminar una tienda: pedidos en curso y comisiones sin
 * pagar. Vive acá porque lo necesitan cuatro lugares —el GET y el DELETE de
 * /api/cuenta, /api/tienda/cerrar y el DELETE del admin— y hasta ahora estaba
 * copiado (mal) en algunos de ellos: el GET y el DELETE de /api/cuenta tenían la
 * misma cuenta escrita dos veces, y el del admin directamente no la tenía, así
 * que desde el panel se podía borrar una cuenta con pedidos en curso y con plata
 * debida — cosa que su propia dueña no puede hacer.
 *
 * Cuenta el saldo de TODAS los afiliados de la tienda, sin filtrar por
 * `isActive`. Antes se filtraba por activas, y eso dejaba un agujero: pausar a
 * un afiliado no chequea su saldo, así que con pausarla primero su plata se
 * volvía invisible para el bloqueador y la cuenta se podía eliminar dejándola
 * huérfana. La plata que se le debe a alguien no deja de deberse porque esté
 * pausada.
 */
export async function getClosureBlockers(db: DbClient, storeId: string): Promise<ClosureBlockers> {
  const [pendingOrders, affiliates] = await Promise.all([
    db.order.count({ where: { storeId, status: { in: PENDING_ORDER_STATUSES } } }),
    db.affiliate.findMany({ where: { storeId }, select: { wallet: { select: { balance: true } } } }),
  ]);

  const pendingBalances = affiliates
    .filter((a) => (a.wallet?.balance ?? 0) > 0)
    .reduce((sum, a) => sum + (a.wallet?.balance ?? 0), 0);

  return { pendingOrders, pendingBalances };
}

export function isBlocked(blockers: ClosureBlockers): boolean {
  return blockers.pendingOrders > 0 || blockers.pendingBalances > 0;
}

/**
 * Saldo propio de un afiliado en todas las tiendas donde está afiliado. Es el
 * bloqueador equivalente cuando quien elimina la cuenta no es dueña de tienda:
 * si se va con plata sin retirar, no queda forma de cobrarla.
 */
export async function getAffiliateOwnBalance(db: DbClient, userId: string): Promise<number> {
  const affiliations = await db.affiliate.findMany({
    where: { userId },
    select: { wallet: { select: { balance: true } } },
  });
  return affiliations
    .filter((a) => (a.wallet?.balance ?? 0) > 0)
    .reduce((sum, a) => sum + (a.wallet?.balance ?? 0), 0);
}

/**
 * Las escrituras que comparten el cierre voluntario (/api/tienda/cerrar) y el
 * automático por falta de pago (el cron). Vive acá para que no se desincronicen:
 * si mañana el cierre tiene que tocar algo más, se toca en un solo lugar.
 *
 * Cada llamador agrega lo suyo: el voluntario cancela la suscripción y guarda el
 * motivo; el del cron no toca la suscripción porque ya está vencida.
 *
 * Los afiliados quedan PAUSED y marcadas con `pausedByClosure`, no REMOVED: el
 * cierre se puede deshacer y al reactivar tienen que volver — pero solo éstas, no
 * las que la dueña había pausado a mano.
 */
export async function applyStoreClosure(db: DbClient, storeId: string, at: Date = new Date()) {
  await db.store.update({
    where: { id: storeId },
    data: { closedAt: at, isPublished: false },
  });
  await db.affiliate.updateMany({
    where: { storeId, isActive: true },
    data: { isActive: false, status: "PAUSED", pausedByClosure: true },
  });
}

// ─── Motivos de cierre ───────────────────────────────────────────────────────
// El valor se guarda en StoreClosure.reason y el label lo muestra el admin en
// /admin/cierres. Vive acá para que el wizard, la validación del endpoint y el
// panel lean la misma lista y no puedan desincronizarse.

export const CLOSURE_REASONS = {
  PRICE: "Me sale muy caro",
  NO_SALES: "No vendí lo que esperaba",
  TOO_HARD: "Me resultó difícil de usar",
  SHUTTING_DOWN: "Cierro el emprendimiento",
  COMPETITOR: "Me voy a otra plataforma",
  OTHER: "Otro motivo",
} as const;

export type ClosureReason = keyof typeof CLOSURE_REASONS;

export const CLOSURE_REASON_KEYS = Object.keys(CLOSURE_REASONS) as ClosureReason[];

export function isValidClosureReason(value: unknown): value is ClosureReason {
  return typeof value === "string" && value in CLOSURE_REASONS;
}

/** Largo máximo del comentario libre — el input del wizard usa el mismo número. */
export const CLOSURE_COMMENT_MAX = 500;
