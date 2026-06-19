import { prisma } from "@/lib/prisma";
import PromocionesAdmin from "./PromocionesAdmin";

export default async function AdminPromocionesPage() {
  const promotions = await prisma.promotion.findMany({ orderBy: { sortOrder: "asc" } });
  return <PromocionesAdmin promotions={promotions} />;
}
