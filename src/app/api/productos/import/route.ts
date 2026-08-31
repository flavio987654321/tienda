import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { sanitizeDescription, checkCupoDeProductos, checkRitmoDeCreacion } from "@/lib/products";

type CsvRow = {
  nombre: string;
  precio: string;
  precioComparacion?: string;
  categoria?: string;
  subcategoria?: string;
  descripcion?: string;
  estado?: string;
  imagenes?: string;
  marca?: string;
  modelo?: string;
  version?: string;
  anio?: string;
  km?: string;
  motor?: string;
  combustible?: string;
  transmision?: string;
  traccion?: string;
  carroceria?: string;
  color?: string;
  puertas?: string;
  provincia?: string;
  localidad?: string;
  codigoPostal?: string;
  condicion?: string;
};

// Mismas etiquetas (Título Case) que usa el formulario manual para Autos y
// motos (storeTypes.ts → AUTOS.extraFields) — así el dato queda guardado con
// la misma key que la página de detalle del vehículo espera mostrar.
const VEHICLE_ATTR_LABELS: [keyof CsvRow, string][] = [
  ["marca", "Marca"], ["modelo", "Modelo"], ["version", "Versión"], ["anio", "Año"],
  ["km", "Kilómetros"], ["motor", "Motor"], ["combustible", "Combustible"],
  ["transmision", "Transmisión"], ["traccion", "Tracción"], ["carroceria", "Carrocería"],
  ["color", "Color"], ["puertas", "Puertas"],
  ["provincia", "Provincia"], ["localidad", "Localidad"], ["codigoPostal", "Código Postal"],
];

function buildVehicleAttributes(row: CsvRow): { key: string; value: string }[] {
  const attrs: { key: string; value: string }[] = [];
  if (row.condicion?.trim()) attrs.push({ key: "Condición", value: row.condicion.trim() });
  for (const [field, label] of VEHICLE_ATTR_LABELS) {
    const value = (row[field] as string | undefined)?.trim();
    if (value) attrs.push({ key: label, value });
  }
  return attrs;
}

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

  // Las 500 filas por llamada ya estaban; lo que faltaba era el techo de cuántas
  // LLAMADAS. Sin esto, "máximo 500 por importación" no limitaba nada: bastaba
  // con mandar la misma importación en un bucle.
  const ritmo = await checkRitmoDeCreacion(user.id, "import", 5);
  if (ritmo) return ritmo;
  // Se cuenta la tanda entera y no fila por fila: si no entra completa, conviene
  // que se entere antes de que le queden 300 productos cargados a medias.
  const cupo = await checkCupoDeProductos(store.id, user.id, rows.length);
  if (cupo) return cupo;

  // El tipo de tienda se lee del lado del servidor (no de lo que mande el
  // cliente) para decidir si hay que armar los atributos de vehículo.
  const isAutos = store.tipoTienda === "AUTOS";

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
    const attributes = isAutos ? buildVehicleAttributes(row) : [];

    try {
      await prisma.product.create({
        data: {
          name: nombre,
          // La descripción se renderiza como HTML en la tienda pública — se
          // sanitiza con la misma allowlist del formulario para que un CSV no
          // pueda inyectar scripts/eventos (XSS almacenado).
          description: row.descripcion?.trim() ? sanitizeDescription(row.descripcion.trim()) : null,
          price: precio,
          comparePrice: precioComp,
          category: row.categoria?.trim() || (isAutos ? "autos" : "general"),
          subcategory: row.subcategoria?.trim() || null,
          tags: "[]",
          images: JSON.stringify(images),
          reelUrls: "[]",
          attributes: JSON.stringify(attributes),
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
