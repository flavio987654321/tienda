import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

/* El CSV se arma de a tandas y se va mandando mientras se arma.
   Antes era un `findMany` sin tope: traía TODOS los pedidos de la tienda con sus
   productos, pagos, envíos y afiliados, armaba el string entero en memoria y
   recién ahí contestaba. Con una tienda chica no se nota; con unos miles de
   pedidos son cientos de miles de filas de relaciones juntas y el proceso se
   queda sin memoria o el request se corta por timeout — y justo le pasa a la
   tienda que más vende, que es la que más necesita el export.

   Ahora se pagina por cursor y cada tanda se escribe al stream y se suelta. La
   memoria queda acotada al tamaño de la tanda, no al de la tabla, y el navegador
   empieza a bajar el archivo enseguida en vez de esperar a que esté todo. */
const TANDA = 200;

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

const HEADERS = [
  "Número", "Fecha", "Estado", "Total",
  "Cliente", "Email cliente", "Teléfono", "Dirección", "Ciudad", "Provincia", "CP",
  "Productos", "Método de pago", "Estado pago",
  "Método envío", "Tracking",
  "Afiliado", "Email afiliado",
];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const storeId = store.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // El "﻿" del principio es el BOM de UTF-8. Excel en Windows no mira
        // el `charset=utf-8` de la cabecera: abre el CSV con la codificación
        // regional y sin esta marca los acentos salen rotos — "Número" queda
        // "NÃºmero" ya en los encabezados. Los demás programas lo ignoran.
        controller.enqueue(encoder.encode("﻿" + HEADERS.join(",") + "\n"));

        let cursor: string | undefined;
        for (;;) {
          const tanda = await prisma.order.findMany({
            where: { storeId },
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
            /* El id va en el orden además de la fecha: el cursor se apoya en él,
               y dos pedidos hechos en el mismo instante dejarían el orden —y por
               lo tanto el corte de cada tanda— sin definir. */
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: TANDA,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          });

          if (tanda.length === 0) break;

          const filas = tanda.map((o) => {
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

          controller.enqueue(encoder.encode(filas.join("\n") + "\n"));

          if (tanda.length < TANDA) break;
          cursor = tanda[tanda.length - 1].id;
        }

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  const filename = `pedidos-${store.name.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Sin longitud conocida de antemano: el archivo se va generando.
      "Cache-Control": "no-store",
    },
  });
}
