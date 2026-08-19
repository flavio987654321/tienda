export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import DashboardLayout from "@/components/DashboardLayout";
import { Star } from "lucide-react";
import ResenasClient from "./ResenasClient";
import { parseFirstImage } from "@/lib/metaFeed";
import { TEMPLATES_CON_RESENA_TIENDA } from "@/types/store-config";

export default async function ResenasPage() {
  const user = await getCurrentUser();
  // Sin sesión NO se redirige a `/login`: esa ruta está fuera del `scope` del
  // manifiesto, y desde el panel instalado abría el sitio comercial entero. La
  // pantalla la dibuja el layout. El porqué largo está en `dashboard/layout.tsx`.
  if (!user) return null;

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, slug: true, storeConfig: true },
  });
  if (!store) redirect("/dashboard");

  const pendingAffiliateCount = await prisma.affiliate.count({
    where: { storeId: store.id, status: "PENDING" },
  });

  const reviews = await prisma.publicReview.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      comment: true,
      reviewer: true,
      verified: true,
      verifiedBy: true,
      createdAt: true,
      status: true,
      product: { select: { id: true, name: true, images: true } },
    },
  });

  // ¿El diseño que tiene puesto esta tienda dibuja el formulario de "opiná sobre
  // la tienda"? Si no, el panel lo dice en vez de mostrar una pestaña esperando
  // reseñas que nadie puede escribirle.
  let aceptaResenaTienda = false;
  try {
    const t = JSON.parse(store.storeConfig || "{}")?.template;
    aceptaResenaTienda = TEMPLATES_CON_RESENA_TIENDA.includes(t);
  } catch { /* config ilegible: se asume que no */ }

  const serialized = reviews.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    // Sin producto = reseña de la tienda entera.
    //
    // El armado de la imagen estaba escrito a mano acá y devolvía el objeto
    // completo (`{url, variantValue}`) donde se esperaba la URL, así que la foto
    // del producto tampoco se veía en este panel. Era la tercera copia del mismo
    // error; ahora las tres usan `parseFirstImage`, que además entiende los
    // productos viejos guardados como lista de textos.
    product: r.product
      ? { id: r.product.id, name: r.product.name, image: parseFirstImage(r.product.images) }
      : null,
  }));

  return (
    <DashboardLayout
      userName={user.name}
      userId={user.id}
      initialPendingAffiliateCount={pendingAffiliateCount}
    >
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
          <h1 className="text-2xl font-bold text-gray-900">Reseñas</h1>
        </div>
        <p className="text-gray-500 ml-9">Reseñas que tus clientes dejaron en tus productos.</p>
      </div>
      <ResenasClient initialReviews={serialized} slug={store.slug} aceptaResenaTienda={aceptaResenaTienda} />
    </DashboardLayout>
  );
}
