import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

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

  const escape = (v: string | null | undefined) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;

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
  const storeName = store.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="productos_${storeName}_${date}.csv"`,
    },
  });
}
