import type { Prisma } from "@prisma/client";
import { CLOSURE_REASONS, type ClosureReason } from "@/lib/store-closure";

/**
 * Cerrar y reabrir una cuenta de Productos Digitales (Configuración → Zona
 * de peligro). Mismo molde que el cierre de una tienda (`lib/store-closure`),
 * con lo que este ecosistema tiene de distinto:
 *
 * ── Qué es cerrar ──────────────────────────────────────────────────────────
 *
 * Sus páginas salen de línea y el panel queda tapado por una puerta que dice
 * "está cerrada, reabrila cuando quieras". NADA se borra: los productos, los
 * archivos, las landings, los dominios, las ventas y la configuración quedan
 * tal cual. Es la salida que casi todo el mundo busca cuando toca "cerrar":
 * dejar de tener algo a la vista sin perder el trabajo.
 *
 * ── Lo que ya se vendió sigue siendo de quien lo pagó ──────────────────────
 *
 * Los permisos de descarga NO se tocan, y ésa es la decisión que tenía
 * frenada esta zona ("falta decidir qué pasa con lo que ya se vendió").
 * Quien compró un archivo lo compró: cerrar la cuenta —o incluso eliminarla—
 * no le puede sacar el acceso. Las descargas ya no dependen de que el
 * producto esté publicado ni de que la cuenta esté abierta
 * (`/api/digitales/descargar` no mira ninguna de las dos cosas), así que el
 * link del mail de entrega sigue andando hasta que venza por su cuenta.
 *
 * ── La suscripción no se toca ──────────────────────────────────────────────
 *
 * En tiendas, cerrar cancela la suscripción porque hay un cobro que frenar.
 * Acá no: el plan se paga por período, a mano, y no se renueva solo; y el
 * Free es para siempre. Si tenía días pagos, siguen siendo suyos; si no
 * vuelve, el cron la baja a Free cuando venza, como a cualquiera. Cerrar no
 * le hace perder nada y reabrir no le cobra nada.
 *
 * ── Qué vuelve al reabrir ──────────────────────────────────────────────────
 *
 * Lo que estaba publicado al cerrar, y sólo eso: `pausadoPorCierre` marca
 * esos productos, igual que `pausedByClosure` marca a los afiliados de una
 * tienda. Un borrador que ella nunca publicó sigue en borrador. Y después de
 * republicar, la ruta hace cumplir el tope del plan que tenga HOY: si mientras
 * estuvo cerrada cayó a Free, quedan publicadas las que Free permite, las que
 * más vendieron (`despublicarLasDeMas`, la misma regla que la caída a Free).
 *
 * Todo lo que toca la base recibe la transacción de afuera, como
 * `applyStoreClosure`: la ruta decide qué más va adentro.
 */

type Db = Prisma.TransactionClient;

export { CLOSURE_REASONS, CLOSURE_COMMENT_MAX, isValidClosureReason, type ClosureReason } from "@/lib/store-closure";

/** Cuántas páginas hay publicadas hoy: lo que la puerta del panel promete devolver. */
export async function publicadosDe(db: Db, storeId: string): Promise<number> {
  return db.product.count({ where: { storeId, deletedAt: null, isActive: true, rolDigital: { not: null } } });
}

/** Cuántas volverían al reabrir. */
export async function pausadosPorCierreDe(db: Db, storeId: string): Promise<number> {
  return db.product.count({ where: { storeId, deletedAt: null, pausadoPorCierre: true } });
}

/**
 * Cerrar: lo publicado se despublica y se marca; la cuenta queda `closedAt`.
 * Devuelve cuántas páginas se apagaron.
 */
export async function cerrarCuentaDigital(db: Db, storeId: string, at: Date = new Date()): Promise<number> {
  const { count } = await db.product.updateMany({
    where: { storeId, deletedAt: null, isActive: true, rolDigital: { not: null } },
    data: { isActive: false, pausadoPorCierre: true },
  });
  await db.store.update({ where: { id: storeId }, data: { closedAt: at } });
  return count;
}

/**
 * Reabrir: vuelve lo que el cierre apagó, y sólo eso. Devuelve cuántas
 * volvieron; el tope del plan lo hace cumplir la ruta, después, con
 * `despublicarLasDeMas`.
 */
export async function reabrirCuentaDigital(db: Db, storeId: string): Promise<number> {
  const { count } = await db.product.updateMany({
    where: { storeId, deletedAt: null, pausadoPorCierre: true },
    data: { isActive: true, pausadoPorCierre: false },
  });
  await db.store.update({ where: { id: storeId }, data: { closedAt: null } });
  return count;
}

/** El motivo, para el mail y el panel del admin. */
export function textoDelMotivo(reason: ClosureReason): string {
  return CLOSURE_REASONS[reason];
}
