import { Prisma } from "@prisma/client";

// Cliente compartido entre uso normal (prisma) y dentro de una transacción (tx) —
// ambos exponen los mismos delegates (order, coupon) que usamos acá.
type DbClient = Prisma.TransactionClient;

const ORDER_ARCHIVE_INCLUDE = {
  buyer: { select: { name: true, email: true, phone: true } },
  items: {
    include: {
      product: { select: { name: true } },
      variant: { select: { name: true, value: true } },
    },
  },
  payment: true,
  shipping: true,
  commission: {
    // Affiliate.user es la afiliada; Affiliate.owner es el dueño de la tienda
    include: { affiliate: { include: { user: { select: { name: true, email: true } } } } },
  },
  coupon: { select: { code: true, discountType: true, discountValue: true } },
  statusLogs: true,
} satisfies Prisma.OrderInclude;

export type ArchivedOrder = Prisma.OrderGetPayload<{ include: typeof ORDER_ARCHIVE_INCLUDE }>;

const WALLET_ARCHIVE_INCLUDE = {
  affiliate: { include: { user: { select: { name: true, email: true } } } },
  withdrawals: true,
} satisfies Prisma.WalletInclude;

export function fetchStoreOrdersForArchive(db: DbClient, storeId: string) {
  return db.order.findMany({
    where: { storeId },
    include: ORDER_ARCHIVE_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

export function fetchStoreCouponsForArchive(db: DbClient, storeId: string) {
  return db.coupon.findMany({ where: { storeId }, orderBy: { createdAt: "desc" } });
}

// Saldos y retiros de afiliadas: el reset solo procede con balances en cero,
// pero el historial de retiros ya pagados (con snapshot bancario) es la prueba
// de la plataforma de que esas transferencias existieron — se archiva siempre.
export function fetchStoreWalletsForArchive(db: DbClient, storeId: string) {
  return db.wallet.findMany({
    where: { affiliate: { storeId } },
    include: WALLET_ARCHIVE_INCLUDE,
  });
}

// Escape CSV + neutralización de formula injection: Excel/Sheets ejecutan como
// fórmula cualquier celda que empiece con = + - @ (los datos vienen de
// compradores: nombre/teléfono del checkout público), así que se prefija con '.
export const csvEscape = (v: unknown) => {
  const s = String(v ?? "");
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

// BOM UTF-8: sin esto, Excel en Windows muestra rotos los acentos de los headers.
export const CSV_BOM = String.fromCharCode(0xFEFF);

const escape = csvEscape;

export function ordersToCsv(orders: ArchivedOrder[]): string {
  const header = [
    "Fecha", "N° Pedido", "Estado", "Cliente", "Email", "Teléfono",
    "Productos", "Cupón", "Descuento", "Envío", "Total",
    "Medio de pago", "Estado de pago", "ID de pago (MP)", "Comisión afiliada", "Afiliada",
  ];

  const rows = orders.map((o) => {
    const productos = o.items
      .map((i) => `${i.quantity}x ${i.product?.name ?? "producto eliminado"}${i.variant ? ` (${i.variant.name}: ${i.variant.value})` : ""}`)
      .join(" | ");

    return [
      new Date(o.createdAt).toISOString().slice(0, 10),
      escape(o.id),
      escape(o.status),
      escape(o.buyer?.name),
      escape(o.buyer?.email),
      escape(o.buyer?.phone),
      escape(productos),
      escape(o.coupon?.code),
      o.discountAmount,
      o.shippingCost,
      o.total,
      escape(o.payment?.provider),
      escape(o.payment?.status),
      escape(o.payment?.externalId),
      o.commission?.amount ?? "",
      // Nombre, no email: la privacidad de afiliadas promete que el dueño
      // no accede a sus datos personales de contacto
      escape(o.commission?.affiliate?.user?.name),
    ].join(",");
  });

  return [header.join(","), ...rows].join("\n");
}

export function couponsToCsv(coupons: Prisma.CouponGetPayload<Record<string, never>>[]): string {
  const header = [
    "Código", "Etiqueta", "Tipo", "Valor", "Usos", "Máximo de usos",
    "Activo", "Premio de ruleta (ganador)", "Vence", "Creado",
  ];

  const rows = coupons.map((c) => [
    escape(c.code),
    escape(c.label),
    escape(c.discountType),
    c.discountValue,
    c.usedCount,
    c.maxUses ?? "",
    c.isActive ? "SI" : "NO",
    escape(c.winnerEmail),
    c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : "",
    new Date(c.createdAt).toISOString().slice(0, 10),
  ].join(","));

  return [header.join(","), ...rows].join("\n");
}
