import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { getClientIpFromHeaders } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string; pid: string }>;
  searchParams: Promise<{ utm_source?: string }>;
};

function parseFirstImage(images: string): string | null {
  try {
    const arr = JSON.parse(images);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return typeof arr[0] === "string" ? arr[0] : (arr[0] as { url?: string })?.url ?? null;
  } catch { return null; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, pid } = await params;
  const affiliate = await prisma.affiliate.findFirst({
    where: { id, isActive: true, status: "APPROVED" },
    select: { storeId: true, store: { select: { name: true } } },
  });
  if (!affiliate) return {};
  const product = await prisma.product.findFirst({
    where: { id: pid, storeId: affiliate.storeId, isActive: true, deletedAt: null },
    select: { name: true, price: true, description: true, images: true },
  });
  if (!product) return { title: affiliate.store.name };
  const img = parseFirstImage(product.images);
  return {
    title: `${product.name} — ${affiliate.store.name}`,
    description: product.description ?? `$${product.price.toLocaleString("es-AR")}`,
    openGraph: img ? { images: [{ url: img }] } : undefined,
  };
}

/**
 * Anota el click, como mucho uno por IP por hora para que un bot o un proxy no
 * infle el contador del vendedor.
 *
 * Está afuera de la página y no adentro a propósito. Adentro, el `Date.now()` de
 * la ventana de una hora quedaba en el cuerpo de algo que React lee como un
 * componente, y ahí una función que devuelve algo distinto en cada llamada es
 * error (`react-hooks/purity`). Acá es una función común y el reloj se puede
 * mirar tranquilo.
 *
 * Nunca tira: si el tracking falla, el visitante tiene que llegar al producto
 * igual. Perder un click contado es molesto; perder la venta, no.
 */
async function registrarClick(args: {
  affiliateId: string;
  storeId: string;
  productId: string;
  utmSource: string | null;
}) {
  try {
    const rawIp = getClientIpFromHeaders(await headers());
    const ip = rawIp !== "unknown" ? rawIp : null;
    // Sin IP no se puede deduplicar, así que no se cuenta.
    if (!ip) return;

    const yaContado = await prisma.affiliateClick.findFirst({
      where: {
        affiliateId: args.affiliateId,
        productId: args.productId,
        ip,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (yaContado) return;

    await prisma.affiliateClick.create({
      data: {
        affiliateId: args.affiliateId,
        storeId: args.storeId,
        productId: args.productId,
        ip,
        utmSource: args.utmSource,
      },
    });
  } catch { /* no cortar el redirect si falla el tracking */ }
}

export default async function ProductShortLinkPage({ params, searchParams }: Props) {
  const { id, pid } = await params;
  const { utm_source } = await searchParams;

  const affiliate = await prisma.affiliate.findFirst({
    where: { id, isActive: true, status: "APPROVED" },
    select: { id: true, storeId: true, store: { select: { slug: true } } },
  });
  if (!affiliate) notFound();

  const product = await prisma.product.findFirst({
    where: { id: pid, storeId: affiliate.storeId, isActive: true, deletedAt: null },
    select: { id: true },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (!product) {
    // Producto no encontrado — redirigir a la tienda sin producto específico
    redirect(`${baseUrl}/tienda/${affiliate.store.slug}?ref=${affiliate.id}`);
  }

  await registrarClick({
    affiliateId: affiliate.id,
    storeId: affiliate.storeId,
    productId: product.id,
    utmSource: utm_source ?? null,
  });

  const utmSuffix = utm_source ? `&utm_source=${encodeURIComponent(utm_source)}` : "";
  const dest = `${baseUrl}/tienda/${affiliate.store.slug}?ref=${affiliate.id}&p=${product.id}${utmSuffix}`;

  // Renderizamos HTML real (no redirect HTTP) para que WhatsApp/Facebook lean los
  // OG meta tags de generateMetadata y muestren preview con foto + nombre + precio.
  // El script redirige al usuario al instante; los bots no ejecutan JS y ven los OG tags.
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: "12px", fontFamily: "sans-serif" }}>
      <script dangerouslySetInnerHTML={{ __html: `(function(){window.location.replace(${JSON.stringify(dest)})})()` }} />
      <p style={{ color: "#6b7280", fontSize: "14px" }}>Redirigiendo al producto…</p>
      <Link href={dest} style={{ color: "#4f46e5", fontSize: "14px" }}>Ir al producto →</Link>
    </div>
  );
}
