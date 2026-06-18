import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { sendCanastaWinnerEmail } from "@/lib/resend";
import { calculateGoalAmount } from "@/lib/canasta";

// "Canasta Solidaria #1" → "Canasta Solidaria #2". Si no encuentra un número
// al final, simplemente agrega " #2".
function nextCampaignName(name: string) {
  const match = name.match(/#(\d+)\s*$/);
  if (match) {
    const next = parseInt(match[1], 10) + 1;
    return name.replace(/#(\d+)\s*$/, `#${next}`);
  }
  return `${name} #2`;
}

// PUT /api/admin/canasta/draw/winner-status
// Marca el ganador de la posición actual como CONFIRMED o NO_RESPONSE.
// Si NO_RESPONSE y todavía quedan posiciones (1→2, 2→3), avanza la cascada.
// Si NO_RESPONSE en la posición 3, el draw queda agotado y la campaña vuelve
// a SCHEDULED para que el admin reprograme una nueva fecha.
// Protegido contra doble-click con compare-and-swap: el UPDATE solo afecta
// la fila si todavía está en el estado esperado (PENDING + misma posición).
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { drawId, status } = await req.json();
  if (typeof drawId !== "string" || !drawId) {
    return NextResponse.json({ error: "drawId requerido" }, { status: 400 });
  }
  if (status !== "CONFIRMED" && status !== "NO_RESPONSE") {
    return NextResponse.json({ error: "status inválido" }, { status: 400 });
  }

  const draw = await prisma.donationDraw.findUnique({ where: { id: drawId } });
  if (!draw) return NextResponse.json({ error: "Sorteo no encontrado" }, { status: 404 });

  if (draw.winnerStatus !== "PENDING") {
    return NextResponse.json({ error: "Este ganador ya fue marcado", winnerStatus: draw.winnerStatus }, { status: 409 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (status === "CONFIRMED") {
        const updated = await tx.donationDraw.updateMany({
          where: { id: drawId, winnerStatus: "PENDING", currentPosition: draw.currentPosition },
          data: { winnerStatus: "CONFIRMED" },
        });
        if (updated.count === 0) throw Object.assign(new Error("conflict"), { code: "CONFLICT" });

        // Alguien confirmó la entrega: esta campaña queda cerrada para
        // siempre (un único ganador real por canasta) y se archiva con todo
        // su historial intacto (donantes, ganador, etc. — nada se borra).
        const oldCampaign = await tx.donationCampaign.update({
          where: { id: draw.campaignId },
          data: { drawStatus: "FINISHED", status: "COMPLETED" },
          include: { products: { orderBy: { sortOrder: "asc" } } },
        });

        // Arranca la próxima canasta de cero, clonando los mismos productos
        // (mismos alimentos/precios, editables después) pero con $0
        // recaudados, sin donantes y sin sorteo programado.
        // goalAmount queda solo como valor inicial: el resto del sistema
        // siempre la recalcula en vivo a partir de productos + reservePct.
        const goalAmount = calculateGoalAmount(oldCampaign.products, oldCampaign.reservePct);
        const newCampaign = await tx.donationCampaign.create({
          data: {
            name: nextCampaignName(oldCampaign.name),
            description: oldCampaign.description,
            goalAmount,
            reservePct: oldCampaign.reservePct,
            bannerActive: oldCampaign.bannerActive,
            status: "ACTIVE",
            drawStatus: "SCHEDULED",
            products: {
              create: oldCampaign.products.map((p) => ({
                name: p.name,
                image: p.image,
                targetPrice: p.targetPrice,
                sortOrder: p.sortOrder,
              })),
            },
          },
        });

        return { outcome: "CONFIRMED", position: draw.currentPosition, newCampaignId: newCampaign.id, newCampaignName: newCampaign.name };
      }

      // NO_RESPONSE
      if (draw.currentPosition < 3) {
        const updated = await tx.donationDraw.updateMany({
          where: { id: drawId, winnerStatus: "PENDING", currentPosition: draw.currentPosition },
          data: { currentPosition: { increment: 1 }, winnerStatus: "PENDING" },
        });
        if (updated.count === 0) throw Object.assign(new Error("conflict"), { code: "CONFLICT" });
        return { outcome: "ADVANCED", position: draw.currentPosition + 1 };
      }

      // Era la posición 3 y tampoco respondió: el draw queda agotado.
      const updated = await tx.donationDraw.updateMany({
        where: { id: drawId, winnerStatus: "PENDING", currentPosition: 3 },
        data: { winnerStatus: "NO_RESPONSE" },
      });
      if (updated.count === 0) throw Object.assign(new Error("conflict"), { code: "CONFLICT" });

      await tx.donationCampaign.update({
        where: { id: draw.campaignId },
        data: { drawStatus: "SCHEDULED", scheduledDrawAt: null, drawStartedAt: null },
      });

      return { outcome: "EXHAUSTED", position: 3 };
    });

    if (result.outcome === "ADVANCED") {
      const winnerField = result.position === 2 ? "winner2Id" : "winner3Id";
      const winnerId = draw[winnerField as "winner2Id" | "winner3Id"];
      if (winnerId) {
        const winner = await prisma.donation.findUnique({
          where: { id: winnerId },
          select: { donorName: true, donorEmail: true },
        });
        if (winner) {
          sendCanastaWinnerEmail({
            to: winner.donorEmail,
            donorName: winner.donorName,
            position: result.position as 2 | 3,
          }).catch((e) => console.error("[canasta/draw/winner-status] error mandando email:", e));
        }
      }
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "CONFLICT") {
      return NextResponse.json({ error: "Este ganador ya fue marcado por otra acción" }, { status: 409 });
    }
    console.error("[canasta/draw/winner-status]", err);
    return NextResponse.json({ error: "No se pudo actualizar" }, { status: 500 });
  }
}
