import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

function esc(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseAddr(raw: string): Record<string, string> {
  try { return JSON.parse(raw) ?? {}; } catch { return {}; }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const orders = await prisma.order.findMany({
    where: { storeId: store.id },
    include: {
      buyer: { select: { name: true, email: true } },
      items: {
        include: {
          product: { select: { name: true } },
          variant: { select: { name: true, value: true } },
        },
      },
      payment: { select: { provider: true, status: true } },
      shipping: { select: { provider: true, trackingCode: true } },
      affiliate: { include: { user: { select: { name: true, email: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const HEADERS = [
    "Número", "Fecha", "Estado", "Total",
    "Cliente", "Email cliente", "Teléfono", "Dirección", "Ciudad", "Provincia", "CP",
    "Productos", "Método de pago", "Estado pago",
    "Método envío", "Tracking",
    "Afiliada", "Email afiliada",
  ];

  const rows = orders.map((o) => {
    const addr = parseAddr(o.shippingAddress);
    const productos = o.items
      .map((i) =>
        `${i.product.name}${i.variant ? ` (${i.variant.name}: ${i.variant.value})` : ""} x${i.quantity}`
      )
      .join(" | ");
    return [
      `#${o.id.slice(-6).toUpperCase()}`,
      o.createdAt.toLocaleString("es-AR"),
      o.status,
      o.total,
      addr.name || o.buyer.name || "",
      addr.email || o.buyer.email || "",
      addr.phone || "",
      addr.street || "",
      addr.city || "",
      addr.province || "",
      addr.postalCode || "",
      productos,
      o.payment?.provider ?? "",
      o.payment?.status ?? "",
      o.shipping?.provider ?? o.shippingMethod ?? "",
      o.shipping?.trackingCode ?? o.trackingCode ?? "",
      o.affiliate?.user.name ?? "",
      o.affiliate?.user.email ?? "",
    ].map(esc).join(",");
  });

  const csv = [HEADERS.join(","), ...rows].join("\n");
  const filename = `pedidos-${store.name.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
