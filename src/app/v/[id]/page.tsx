import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MapPin, ExternalLink, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function parseFirstImage(images: string): string | null {
  try {
    const arr = JSON.parse(images);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return typeof arr[0] === "string" ? arr[0] : arr[0]?.url ?? null;
  } catch { return null; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const aff = await prisma.affiliate.findFirst({
    where: { id, isActive: true, status: "APPROVED" },
    include: { user: { select: { name: true } }, store: { select: { name: true } } },
  });
  if (!aff) return {};
  return {
    title: `${aff.user.name ?? "Vendedora"} — ${aff.store.name}`,
    description: `Comprá los productos de ${aff.store.name} con ${aff.user.name ?? "esta vendedora"}.`,
  };
}

export default async function VendedoraPage({ params }: Props) {
  const { id } = await params;

  const affiliate = await prisma.affiliate.findFirst({
    where: { id, isActive: true, status: "APPROVED" },
    include: {
      user: { select: { name: true, image: true, bio: true, city: true } },
      store: {
        select: {
          name: true,
          slug: true,
          logo: true,
          description: true,
          primaryColor: true,
          products: {
            where: { isActive: true },
            orderBy: { createdAt: "desc" },
            take: 12,
            select: { id: true, name: true, price: true, comparePrice: true, images: true },
          },
        },
      },
    },
  });

  if (!affiliate) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mitienda.vercel.app";
  const affiliateLink = `${baseUrl}/tienda/${affiliate.store.slug}?ref=${affiliate.id}`;
  const { user, store } = affiliate;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero / perfil */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center gap-5">
            {user.image ? (
              <div className="relative h-20 w-20 rounded-full overflow-hidden ring-2 ring-indigo-300 ring-offset-2 shrink-0">
                <Image src={user.image} alt={user.name ?? "vendedora"} fill className="object-cover" />
              </div>
            ) : (
              <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 ring-2 ring-indigo-200">
                <span className="text-2xl font-bold text-indigo-600">
                  {(user.name ?? "V")[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900">{user.name ?? "Vendedora"}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Vendedora oficial de{" "}
                <span className="font-semibold" style={{ color: store.primaryColor }}>{store.name}</span>
              </p>
              {user.city && (
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                  <MapPin className="h-3 w-3" />{user.city}
                </div>
              )}
              {user.bio && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{user.bio}</p>
              )}
            </div>
            {store.logo && (
              <div className="relative h-12 w-12 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                <Image src={store.logo} alt={store.name} fill className="object-contain p-1" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CTA principal */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <a href={affiliateLink}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-white shadow-lg transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ backgroundColor: store.primaryColor }}>
          <ShoppingBag className="h-5 w-5" />
          Ver catálogo completo
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Productos destacados */}
      <div className="max-w-2xl mx-auto px-4 pb-12">
        {store.products.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Productos destacados</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {store.products.map((product) => {
                const img = parseFirstImage(product.images);
                const productUrl = `${affiliateLink}&producto=${product.id}`;
                const hasDiscount = product.comparePrice && product.comparePrice > product.price;
                return (
                  <a key={product.id} href={productUrl}
                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
                    <div className="relative h-40 bg-gray-50 overflow-hidden">
                      {img ? (
                        <Image src={img} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-gray-200" />
                        </div>
                      )}
                      {hasDiscount && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          -{Math.round((1 - product.price / product.comparePrice!) * 100)}%
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-sm font-bold" style={{ color: store.primaryColor }}>
                          ${product.price.toLocaleString("es-AR")}
                        </span>
                        {hasDiscount && (
                          <span className="text-xs text-gray-400 line-through">
                            ${product.comparePrice!.toLocaleString("es-AR")}
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
            <div className="text-center mt-6">
              <a href={affiliateLink}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
                style={{ backgroundColor: store.primaryColor }}>
                Ver todos los productos
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center mt-10 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Este es el catálogo personal de <strong>{user.name ?? "esta vendedora"}</strong>.
            Las compras se procesan en la tienda oficial de {store.name}.
          </p>
        </div>
      </div>
    </div>
  );
}
