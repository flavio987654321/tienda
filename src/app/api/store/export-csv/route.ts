import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { fetchStoreOrdersForArchive, fetchStoreCouponsForArchive, ordersToCsv, couponsToCsv, csvEscape, CSV_BOM } from "@/lib/storeArchive";
import { checkRateLimit } from "@/lib/rate-limit";

const csvResponse = (csv: string, filename: string) =>
  new NextResponse(CSV_BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  // Cada export es un findMany full-table con includes profundos
  if (!(await checkRateLimit(`export-csv:${user.id}`, 10, 60_000))) {
    return NextResponse.json({ error: "Demasiadas descargas seguidas. Esperá un minuto." }, { status: 429 });
  }

  const storeName = store.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const date = new Date().toISOString().slice(0, 10);
  const tipo = new URL(req.url).searchParams.get("tipo") ?? "productos";

  if (tipo === "pedidos") {
    const orders = await fetchStoreOrdersForArchive(prisma, store.id);
    return csvResponse(ordersToCsv(orders), `pedidos_${storeName}_${date}.csv`);
  }

  if (tipo === "cupones") {
    const coupons = await fetchStoreCouponsForArchive(prisma, store.id);
    return csvResponse(couponsToCsv(coupons), `cupones_${storeName}_${date}.csv`);
  }

  const products = await prisma.product.findMany({
    where: { storeId: store.id, deletedAt: null },
    select: {
      name: true,
      category: true,
      subcategory: true,
      price: true,
      comparePrice: true,
      isActive: true,
      images: true,
      variants: { select: { name: true, stock: true, price: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const escape = csvEscape;

  const header = ["Nombre", "Categoría", "Subcategoría", "Precio", "Precio comparación", "Activo", "Imágenes", "Variantes"];

  const rows = products.map((p) => {
    const images = (() => {
      try {
        const parsed = JSON.parse(p.images || "[]");
        return (parsed as (string | { url: string })[])
          .map((img) => (typeof img === "string" ? img : img?.url ?? ""))
          .filter(Boolean)
          .join(" | ");
      } catch { return ""; }
    })();

    const variants = p.variants
      .map((v) => `${v.name}:$${v.price ?? p.price}:stock${v.stock}`)
      .join(" | ");

    return [
      escape(p.name),
      escape(p.category),
      escape(p.subcategory),
      p.price,
      p.comparePrice ?? "",
      p.isActive ? "SI" : "NO",
      escape(images),
      escape(variants),
    ].join(",");
  });

  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="productos_${storeName}_${date}.csv"`,
    },
  });
}
