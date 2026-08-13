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
    // Affiliate.user es el afiliado; Affiliate.owner es el dueño de la tienda
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

// Promociones de tienda: como los cupones, son ofertas que la dueña pudo haber
// comunicado a sus clientes, así que se archivan antes de borrarlas en el
// cambio de rubro.
export function fetchStorePromotionsForArchive(db: DbClient, storeId: string) {
  return db.storePromotion.findMany({ where: { storeId }, orderBy: { createdAt: "desc" } });
}

// Saldos y retiros de afiliados: el reset solo procede con balances en cero,
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
    "Medio de pago", "Estado de pago", "ID de pago (MP)", "Comisión afiliado", "Afiliado",
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
      // Nombre, no email: la privacidad de afiliados promete que el dueño
      // no accede a sus datos personales de contacto
      escape(o.commission?.affiliate?.user?.name),
    ].join(",");
  });

  return [header.join(","), ...rows].join("\n");
}

// Los arrays de alcance se guardan como JSON string (igual que tags/reelUrls).
// Para el CSV interesa que se lea, no que sea parseable de vuelta.
function scopeDetail(p: Prisma.StorePromotionGetPayload<Record<string, never>>): string {
  const parse = (raw: string): string[] => {
    try {
      const v = JSON.parse(raw || "[]");
      return Array.isArray(v) ? v.map(String) : [];
    } catch { return []; }
  };
  if (p.scope === "CATEGORY") return parse(p.categories).join(" | ");
  if (p.scope === "PRODUCTS") {
    const n = parse(p.productIds).length;
    return `${n} producto${n !== 1 ? "s" : ""}`;
  }
  return "Toda la tienda";
}

export function promotionsToCsv(promos: Prisma.StorePromotionGetPayload<Record<string, never>>[]): string {
  const header = [
    "Nombre", "Tipo", "Valor", "Llevá", "Pagá", "Compra mínima",
    "Alcance", "Detalle del alcance", "Desde", "Hasta",
    "Combina con cupones", "Activa", "Archivada", "Creada",
  ];

  const day = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

  const rows = promos.map((p) => [
    escape(p.name),
    escape(p.type),
    p.value ?? "",
    p.minQty ?? "",
    p.payQty ?? "",
    p.minOrderAmount,
    escape(p.scope),
    escape(scopeDetail(p)),
    day(p.startsAt),
    day(p.endsAt),
    p.combinesWithCoupons ? "SI" : "NO",
    p.isActive ? "SI" : "NO",
    p.archivedAt ? "SI" : "NO",
    day(p.createdAt),
  ].join(","));

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
