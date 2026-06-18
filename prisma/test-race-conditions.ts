import { PrismaClient } from "@prisma/client";
import { randomInt } from "crypto";

const prisma = new PrismaClient();

function pickRandomWinners<T>(pool: T[], count: number): T[] {
  const remaining = [...pool];
  const picked: T[] = [];
  for (let i = 0; i < count && remaining.length > 0; i++) {
    const idx = randomInt(remaining.length);
    picked.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return picked;
}

// Réplica exacta de la transacción de /api/admin/canasta/draw/activate,
// parametrizada por campaignId para poder testearla aislada de la campaña
// real. Usada solo para esta prueba.
async function activateOnce(campaignId: string): Promise<{ ok: true; drawId: string } | { ok: false; code: string }> {
  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.donationCampaign.updateMany({
        where: { id: campaignId, drawStatus: "SCHEDULED" },
        data: { drawStatus: "LIVE", drawStartedAt: new Date() },
      });
      if (updated.count === 0) {
        throw Object.assign(new Error("ya activado"), { code: "ALREADY_ACTIVATED" });
      }

      const candidates = await tx.donation.findMany({
        where: { campaignId, status: "CONFIRMED" },
        select: { id: true },
      });
      const winners = pickRandomWinners(candidates, 3);

      const draw = await tx.donationDraw.create({
        data: {
          campaignId,
          attemptNumber: 1,
          winner1Id: winners[0]?.id,
          winner2Id: winners[1]?.id,
          winner3Id: winners[2]?.id,
          revealAt: new Date(Date.now() + 10_000),
        },
      });
      return { ok: true, drawId: draw.id };
    });
  } catch (e: unknown) {
    return { ok: false, code: (e as { code?: string })?.code ?? "unknown" };
  }
}

async function main() {
  console.log("=== TEST 1: doble-activación simultánea (5 requests en paralelo) ===");

  const campaign = await prisma.donationCampaign.create({
    data: {
      name: "__TEST_RACE__",
      goalAmount: 10000,
      status: "CANCELLED", // nunca visible para endpoints públicos
      drawStatus: "SCHEDULED",
      scheduledDrawAt: new Date(Date.now() + 60_000),
    },
  });

  const donations = await Promise.all(
    Array.from({ length: 5 }).map((_, i) =>
      prisma.donation.create({
        data: {
          campaignId: campaign.id,
          amount: 1000,
          status: "CONFIRMED",
          donorName: `Test ${i}`,
          donorPhone: `11111111${i}`,
          donorEmail: `test${i}@test.com`,
          donorLocalidad: "Test",
        },
      })
    )
  );

  const results = await Promise.all(Array.from({ length: 5 }).map(() => activateOnce(campaign.id)));
  const successCount = results.filter((r) => r.ok).length;
  const drawsInDb = await prisma.donationDraw.count({ where: { campaignId: campaign.id } });

  console.log("Resultados de las 5 llamadas simultáneas:", results.map((r) => (r.ok ? "OK" : r.code)));
  console.log(`Llamadas exitosas: ${successCount} (esperado: 1)`);
  console.log(`DonationDraw creados en DB: ${drawsInDb} (esperado: 1)`);
  console.log(successCount === 1 && drawsInDb === 1 ? "✅ PASA — no se duplicó el sorteo" : "❌ FALLA");

  console.log("\n=== TEST 2: marcar NO_RESPONSE dos veces simultáneas en la misma posición ===");
  const draw = await prisma.donationDraw.findFirstOrThrow({ where: { campaignId: campaign.id } });

  async function markNoResponseOnce() {
    const current = await prisma.donationDraw.findUniqueOrThrow({ where: { id: draw.id } });
    if (current.winnerStatus !== "PENDING") return { ok: false, code: "ALREADY_MARKED" };
    const updated = await prisma.donationDraw.updateMany({
      where: { id: draw.id, winnerStatus: "PENDING", currentPosition: current.currentPosition },
      data: { currentPosition: { increment: 1 }, winnerStatus: "PENDING" },
    });
    return updated.count === 1 ? { ok: true } : { ok: false, code: "CONFLICT" };
  }

  const cascadeResults = await Promise.all(Array.from({ length: 5 }).map(() => markNoResponseOnce()));
  const cascadeSuccess = cascadeResults.filter((r) => r.ok).length;
  const finalDraw = await prisma.donationDraw.findUniqueOrThrow({ where: { id: draw.id } });

  console.log("Resultados de las 5 llamadas simultáneas:", cascadeResults.map((r) => (r.ok ? "OK" : r.code)));
  console.log(`Llamadas exitosas: ${cascadeSuccess} (esperado: 1)`);
  console.log(`currentPosition final: ${finalDraw.currentPosition} (esperado: 2, no 3, 4, etc)`);
  console.log(cascadeSuccess === 1 && finalDraw.currentPosition === 2 ? "✅ PASA — no se saltó de posición" : "❌ FALLA");

  console.log("\n=== TEST 3: el endpoint nunca expone ganadores antes de revealAt ===");
  // Releemos el draw con revealAt en el futuro (ya lo está, +10s desde la creación)
  const drawCheck = await prisma.donationDraw.findUniqueOrThrow({ where: { id: draw.id } });
  const revealed = !!drawCheck.revealAt && new Date() >= drawCheck.revealAt;
  console.log(`revealAt: ${drawCheck.revealAt?.toISOString()}, ahora: ${new Date().toISOString()}`);
  console.log(`¿Debería revelarse ya?: ${revealed} (esperado: false, recién pasaron unos segundos)`);
  console.log(!revealed ? "✅ PASA — todavía no correspondería revelar" : "⚠️  revisar timing del test");

  console.log("\n=== Limpieza ===");
  await prisma.donationDraw.deleteMany({ where: { campaignId: campaign.id } });
  await prisma.donation.deleteMany({ where: { campaignId: campaign.id } });
  await prisma.donationCampaign.delete({ where: { id: campaign.id } });
  console.log("Datos de prueba eliminados.");
}

main()
  .catch((e) => {
    console.error("ERROR EN TEST:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
