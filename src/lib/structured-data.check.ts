/**
 * Chequeo de los datos estructurados. Se corre a mano:
 *
 *   npx tsx src/lib/structured-data.check.ts
 *
 * No es un test automático: es una forma de VER el JSON que se le manda a Google
 * con datos reales antes de publicarlo, y de dejar fijadas las tres reglas que si
 * se rompen invalidan el bloque entero (puntaje sin reseñas, precio único cuando
 * en realidad es un rango, y disponibilidad al revés).
 */

import { construirProductSchema, construirBreadcrumbSchema, serializarSchema } from "./structured-data";

const tienda = { nombre: "Tiendaapps", slug: "tiendaapps" };

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) {
    console.log(`  ok   ${titulo}`);
  } else {
    fallos++;
    console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : "");
  }
};

// ── 1. Producto con stock y reseñas ──────────────────────────────────────────
console.log("\n1) Campera basica — 5 en stock, 12 reseñas de 4.5");
const conStock = construirProductSchema(
  {
    id: "abc123", name: "Campera basica", description: "Campera de abrigo",
    price: 45000, category: "camperas",
    images: ["https://ejemplo.com/campera.jpg"],
    variants: [{ price: null, stock: 5, sku: "CAMP-01" }],
  },
  tienda, "ARS", { promedio: 4.5, total: 12 }
);
console.log(JSON.stringify(conStock, null, 2));
const oferta = conStock.offers as Record<string, unknown>;
chequear("precio único (no rango)", oferta["@type"] === "Offer");
chequear("precio 45000", oferta.price === 45000, oferta.price);
chequear("figura disponible", oferta.availability === "https://schema.org/InStock");
chequear("declara el puntaje", !!conStock.aggregateRating);
chequear("toma el SKU de la variante", conStock.sku === "CAMP-01");

// ── 2. Sin stock y sin reseñas ───────────────────────────────────────────────
console.log("\n2) Remera basica — 0 en stock, sin reseñas");
const sinStock = construirProductSchema(
  {
    id: "def456", name: "Remera basica", description: null,
    price: 50000, category: "remeras", images: [],
    variants: [{ price: null, stock: 0, sku: null }],
  },
  tienda, "ARS", { promedio: 0, total: 0 }
);
const oferta2 = sinStock.offers as Record<string, unknown>;
chequear("figura agotado", oferta2.availability === "https://schema.org/OutOfStock");
chequear("NO declara puntaje con 0 reseñas", sinStock.aggregateRating === undefined);
chequear("descripción de respaldo", typeof sinStock.description === "string" && (sinStock.description as string).length > 0);
chequear("sin imágenes no manda `image` vacío", sinStock.image === undefined);

// ── 3. Variantes con precios distintos → rango ───────────────────────────────
console.log("\n3) Pantalón — variantes de $60.000 y $72.000");
const rango = construirProductSchema(
  {
    id: "ghi789", name: "Pantalon basico", description: "Jean",
    price: 60000, category: "pantalones", images: [],
    variants: [
      { price: 60000, stock: 5, sku: null },
      { price: 72000, stock: 3, sku: null },
    ],
  },
  tienda, "ARS", { promedio: 5, total: 2 }
);
const oferta3 = rango.offers as Record<string, unknown>;
chequear("usa AggregateOffer", oferta3["@type"] === "AggregateOffer");
chequear("mínimo 60000", oferta3.lowPrice === 60000, oferta3.lowPrice);
chequear("máximo 72000", oferta3.highPrice === 72000, oferta3.highPrice);

// ── 4. Escapado ──────────────────────────────────────────────────────────────
console.log("\n4) Un nombre que intenta cerrar la etiqueta");
const malicioso = construirProductSchema(
  {
    id: "xyz", name: '</script><img src=x onerror=alert(1)>', description: null,
    price: 100, category: null, images: [], variants: [],
  },
  tienda, "ARS"
);
const serializado = serializarSchema(malicioso);
chequear("no queda ningún '<' suelto", !serializado.includes("<"));
chequear("quedó escapado como \\u003c", serializado.includes("\\u003c"));
chequear("sin variantes se da por disponible",
  (malicioso.offers as Record<string, unknown>).availability === "https://schema.org/InStock");

// ── 5. Migas de pan ──────────────────────────────────────────────────────────
console.log("\n5) Breadcrumb");
const migas = construirBreadcrumbSchema({ id: "abc123", name: "Campera basica" }, tienda);
const items = migas.itemListElement as Record<string, unknown>[];
chequear("tres niveles", items.length === 3);
chequear("el último es el producto y no lleva link", items[2].name === "Campera basica" && items[2].item === undefined);

// ── 6. Título y descripción escritos a mano ──────────────────────────────────
// Las mismas reglas que aplican `tituloParaGoogle` y `descripcionParaGoogle` en
// la ficha pública. Se replican acá porque son la parte fácil de romper: un `||`
// mal puesto y el campo escrito a mano deja de usarse sin que nadie lo note.
console.log("\n6) Título y descripción propios");

const tituloDe = (p: { name: string; seoTitle: string | null; store: string }) =>
  p.seoTitle?.trim() || `${p.name} — ${p.store}`;
const descripcionDe = (p: { name: string; description: string | null; seoDescription: string | null; store: string }) =>
  p.seoDescription?.trim() || p.description?.slice(0, 160) || `Comprá ${p.name} en ${p.store}`;

chequear("si está escrito, se usa el escrito",
  tituloDe({ name: "Campera Modelo 47", seoTitle: "Campera negra de abrigo", store: "Tiendaapps" })
    === "Campera negra de abrigo");
chequear("si está vacío, se arma solo",
  tituloDe({ name: "Campera Modelo 47", seoTitle: null, store: "Tiendaapps" })
    === "Campera Modelo 47 — Tiendaapps");
chequear("un campo con solo espacios cuenta como vacío",
  tituloDe({ name: "Campera", seoTitle: "   ", store: "Tiendaapps" })
    === "Campera — Tiendaapps");
chequear("la descripción escrita gana sobre la del producto",
  descripcionDe({ name: "X", description: "texto del producto", seoDescription: "texto para Google", store: "T" })
    === "texto para Google");
chequear("sin ninguna de las dos, hay texto de respaldo",
  descripcionDe({ name: "Campera", description: null, seoDescription: null, store: "Tiendaapps" })
    === "Comprá Campera en Tiendaapps");

// ── 7. El recorte de la vista previa ─────────────────────────────────────────
console.log("\n7) Recorte del texto largo");
const recortar = (texto: string, limite: number): string => {
  if (texto.length <= limite) return texto;
  const cortado = texto.slice(0, limite);
  const ultimoEspacio = cortado.lastIndexOf(" ");
  return (ultimoEspacio > limite * 0.6 ? cortado.slice(0, ultimoEspacio) : cortado).trimEnd() + "…";
};
chequear("lo que entra no se toca", recortar("Campera negra", 60) === "Campera negra");
chequear("lo largo se corta con …", recortar("a".repeat(80), 60).endsWith("…"));
chequear("no parte una palabra al medio",
  !recortar("Campera de abrigo negra para hombre talle grande importada", 30).includes("impo"));
chequear("una palabra sola larguísima se corta seco igual",
  recortar("Camperadeabrigonegraparahombretallegrande", 20).length === 21);

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
