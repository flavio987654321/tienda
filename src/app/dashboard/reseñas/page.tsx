export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import DashboardLayout from "@/components/DashboardLayout";
import { Star } from "lucide-react";
import ResenasClient from "./ResenasClient";

export default async function ResenasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, slug: true },
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
      product: { select: { name: true, images: true } },
    },
  });

  const serialized = reviews.map(r => {
    let productImage: string | null = null;
    try { const a = JSON.parse(r.product.images); productImage = Array.isArray(a) && a[0] ? a[0] : null; } catch {}
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      product: { name: r.product.name, image: productImage },
    };
  });

  return (
    <DashboardLayout
      userName={user.name}
      userEmail={user.email}
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
      <ResenasClient initialReviews={serialized} slug={store.slug} />
    </DashboardLayout>
  );
}
