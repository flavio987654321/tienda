import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PRODUCTOS = [
  { name: "Leche entera (1L x6)", targetPrice: 9000 },
  { name: "Arroz 2kg", targetPrice: 3200 },
  { name: "Fideos 2kg", targetPrice: 3000 },
  { name: "Aceite de girasol 1.5L", targetPrice: 4200 },
  { name: "Azúcar 1kg", targetPrice: 1800 },
  { name: "Harina 000 2kg", targetPrice: 2600 },
  { name: "Yerba mate 500g", targetPrice: 4500 },
  { name: "Sal fina 500g", targetPrice: 700 },
  { name: "Lentejas o porotos 500g", targetPrice: 2400 },
  { name: "Puré de tomates x2", targetPrice: 2200 },
  { name: "Polenta 500g", targetPrice: 1400 },
  { name: "Galletitas de agua x2", targetPrice: 2800 },
  { name: "Jabón en pan x3", targetPrice: 3600 },
  { name: "Papel higiénico x4", targetPrice: 4200 },
];

async function main() {
  const existing = await prisma.donationCampaign.findFirst({ where: { status: "ACTIVE" } });
  if (existing) {
    console.log("Ya hay una campaña ACTIVE, no se crea otra:", existing.id);
    return;
  }

  const goalAmount = Math.round(
    PRODUCTOS.reduce((sum, p) => sum + p.targetPrice, 0) / 0.9
  );

  const campaign = await prisma.donationCampaign.create({
    data: {
      name: "Canasta Solidaria #1",
      description: "Ayudemos juntos a completar una canasta familiar con alimentos básicos para un vecino de la comunidad.",
      goalAmount,
      reservePct: 10,
      status: "ACTIVE",
      bannerActive: true,
      products: {
        create: PRODUCTOS.map((p, i) => ({ ...p, sortOrder: i })),
      },
    },
    include: { products: true },
  });

  console.log("Campaña creada:", campaign.id, "Meta:", campaign.goalAmount);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
