import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

type CsvRow = {
  nombre: string;
  precio: string;
  precioComparacion?: string;
  categoria?: string;
  subcategoria?: string;
  descripcion?: string;
  estado?: string;
  imagenes?: string;
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body?.rows || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const rows: CsvRow[] = body.rows;
  if (rows.length === 0) return NextResponse.json({ error: "El CSV no tiene filas" }, { status: 400 });
  if (rows.length > 500) return NextResponse.json({ error: "Máximo 500 productos por importación" }, { status: 400 });

  let created = 0;
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nombre = row.nombre?.trim();
    const precio = parseFloat(row.precio ?? "");
    const precioComp = row.precioComparacion ? parseFloat(row.precioComparacion) : null;

    if (!nombre || nombre.length < 2) { errors.push({ row: i + 1, error: "Nombre requerido" }); continue; }
    if (isNaN(precio) || precio <= 0) { errors.push({ row: i + 1, error: "Precio inválido" }); continue; }
    if (precioComp !== null && (!isFinite(precioComp) || precioComp <= precio)) {
      errors.push({ row: i + 1, error: "Precio de comparación debe ser mayor al precio" }); continue;
    }

    const images = row.imagenes
      ? row.imagenes.split("|").map(u => u.trim()).filter(Boolean)
      : [];
    const isActive = (row.estado ?? "ACTIVO").toUpperCase() !== "OCULTO";

    try {
      await prisma.product.create({
        data: {
          name: nombre,
          description: row.descripcion?.trim() ?? null,
          price: precio,
          comparePrice: precioComp,
          category: row.categoria?.trim() || "general",
          subcategory: row.subcategoria?.trim() || null,
          tags: "[]",
          images: JSON.stringify(images),
          reelUrls: "[]",
          attributes: "[]",
          isActive,
          storeId: store.id,
        },
      });
      created++;
    } catch {
      errors.push({ row: i + 1, error: "Error al guardar en base de datos" });
    }
  }

  return NextResponse.json({ created, errors, total: rows.length });
}
