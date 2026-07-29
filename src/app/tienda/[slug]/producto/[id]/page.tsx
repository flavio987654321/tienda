import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { isDemoProductId } from "@/lib/demoProducts";
import ProductDetailClient from "./ProductDetailClient";
import { StoreTrackingScripts } from "@/components/store/StoreTrackingScripts";
import type { StoreConfig } from "@/types/store-config";
import {
  construirProductSchema,
  construirBreadcrumbSchema,
  serializarSchema,
  aTextoPlano,
} from "@/lib/structured-data";

type ProductoPageProps = {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ from?: string }>;
};

// Resuelve el producto siempre filtrado por la tienda del slug + activo + no borrado,
// para que no se pueda ver (ni indexar) un producto de otra tienda cambiando el id en la URL.
async function findProduct(slug: string, id: string) {
  return prisma.product.findFirst({
    where: { id, isActive: true, deletedAt: null, store: { slug, isActive: true } },
    select: {
      id: true, name: true, description: true, price: true, images: true,
      // Lo de acá abajo lo usan los datos estructurados (ver `structured-data.ts`).
      // La categoría y la fecha de fin de oferta salen del producto; el precio y
      // el stock por variante deciden si se declara un precio o un rango, y si
      // figura como disponible o agotado.
      category: true, offerEndsAt: true,
      seoTitle: true, seoDescription: true,
      variants: { select: { price: true, stock: true, sku: true } },
      store: { select: { name: true } },
    },
  });
}

/* ── Qué texto ve Google ─────────────────────────────────────────────────────
   Si la dueña escribió el suyo, manda el suyo. Si no, se arma solo como siempre.
   Las dos funciones están acá arriba y las usan TANTO `generateMetadata` como
   los datos estructurados: si cada uno lo resolviera por su cuenta, un día el
   título de la pestaña y el del bloque de Google dirían cosas distintas —y
   declararle a Google algo que no está en la página es justo lo que penaliza. */
type ProductoConSeo = {
  name: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  store: { name: string };
};

const tituloParaGoogle = (p: ProductoConSeo) =>
  p.seoTitle?.trim() || `${p.name} — ${p.store.name}`;

// La descripción del producto es HTML (editor de texto enriquecido), así que hay
// que aplanarla ANTES de recortar: si no, entraba con las etiquetas puestas —
// "<p style=..."— y encima el corte a 160 caracteres partía una etiqueta al medio.
// La escrita a mano ya es texto plano, pero pasa por lo mismo por las dudas.
const descripcionParaGoogle = (p: ProductoConSeo) =>
  p.seoDescription?.trim() ||
  (p.description ? aTextoPlano(p.description).slice(0, 160).trim() : "") ||
  `Comprá ${p.name} en ${p.store.name}`;

/** Promedio y total de reseñas PUBLICADAS del producto — el mismo cálculo que hace
 *  la API que alimenta la ficha, para que el puntaje que se le declara a Google
 *  sea idéntico al que ve el comprador en pantalla. */
async function findResenas(storeSlug: string, productId: string) {
  const store = await prisma.store.findFirst({ where: { slug: storeSlug }, select: { id: true } });
  if (!store) return { promedio: 0, total: 0 };

  const agregado = await prisma.publicReview.aggregate({
    where: { storeId: store.id, productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return { promedio: agregado._avg.rating ?? 0, total: agregado._count._all };
}

/** Las imágenes vienen como JSON y con dos formas históricas: string suelto o
 *  `{url}`. Se normalizan a URLs absolutas, que es lo único que Google acepta. */
function imagenesAbsolutas(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || "[]") as (string | { url?: string })[];
    return parsed
      .map((img) => (typeof img === "string" ? img : img?.url ?? ""))
      .filter((u) => u.startsWith("http"));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params, searchParams }: ProductoPageProps): Promise<Metadata> {
  const { slug, id } = await params;
  const { from } = await searchParams;
  // Los productos demo del editor no existen en la base — no hay metadata real que generar.
  if (from === "editor" && isDemoProductId(id)) return {};

  const product = await findProduct(slug, id);
  if (!product) return {};

  const title = tituloParaGoogle(product);
  const description = descripcionParaGoogle(product);
  let image: string | undefined;
  try {
    const images = JSON.parse(product.images || "[]");
    const first = images[0];
    image = typeof first === "string" ? first : first?.url;
  } catch {}

  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: image ? [image] : undefined },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  };
}

async function findStoreConfig(slug: string) {
  const store = await prisma.store.findFirst({ where: { slug, isActive: true }, select: { storeConfig: true } });
  try {
    const parsed: Partial<StoreConfig> = JSON.parse(store?.storeConfig || "{}");
    return { analytics: parsed.analytics, currency: parsed.currency || "ARS" };
  } catch {
    return { analytics: undefined, currency: "ARS" as const };
  }
}

export default async function ProductoPage({ params, searchParams }: ProductoPageProps) {
  noStore();
  const { slug, id } = await params;
  const { from } = await searchParams;

  // Los productos demo del editor (ej. "hogar-2") nunca existen en la base —
  // se resuelven en el cliente con datos de muestra en vez de buscarlos ahí.
  const isEditorDemo = from === "editor" && isDemoProductId(id);
  let product: Awaited<ReturnType<typeof findProduct>> = null;
  if (!isEditorDemo) {
    product = await findProduct(slug, id);
    if (!product) notFound();
  }

  const { analytics, currency } = await findStoreConfig(slug);

  // ── Datos estructurados ────────────────────────────────────────────────────
  // Sólo para productos REALES: los demo del editor no existen para nadie más y
  // marcarlos sería declararle a Google un producto que no se puede comprar.
  let schemas: string[] = [];
  if (product) {
    const resenas = await findResenas(slug, product.id);
    const tienda = { nombre: product.store.name, slug };
    schemas = [
      serializarSchema(
        construirProductSchema(
          {
            id: product.id,
            name: product.name,
            // La MISMA descripción que la metadata, resuelta con la misma
            // función. Si acá fuera la del producto y arriba la escrita a mano,
            // el bloque estructurado y la etiqueta <meta> dirían cosas distintas.
            description: descripcionParaGoogle(product),
            price: product.price,
            category: product.category,
            images: imagenesAbsolutas(product.images),
            offerEndsAt: product.offerEndsAt,
            variants: product.variants,
          },
          tienda,
          currency,
          resenas
        )
      ),
      serializarSchema(construirBreadcrumbSchema({ id: product.id, name: product.name }, tienda)),
    ];
  }

  return (
    <>
      {/* Va en el HTML del servidor, no desde el cliente: el robot de Google lee
          la respuesta inicial, y un bloque agregado después con JavaScript se lo
          puede perder. `dangerouslySetInnerHTML` es la forma que documenta React
          para JSON-LD — el contenido está escapado en `serializarSchema`. */}
      {schemas.map((json, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
      ))}
      <StoreTrackingScripts
        googleAnalyticsId={analytics?.googleAnalyticsId}
        facebookPixelId={analytics?.facebookPixelId}
        viewContent={product ? { contentId: product.id, value: product.price, currency } : undefined}
      />
      <ProductDetailClient slug={slug} productId={id} />
    </>
  );
}
