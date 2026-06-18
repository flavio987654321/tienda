import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/canasta/draw-status
// Endpoint público consultado por polling desde /canasta/sorteo.
// Nunca devuelve los nombres de los ganadores antes de "revealAt" — el
// resultado ya está calculado y guardado en DB desde que se activa el
// sorteo, pero esta ruta lo omite explícitamente del JSON hasta que
// corresponda revelarlo. No confiar nunca en ofuscar esto del lado del cliente.
export async function GET() {
  const campaign = await prisma.donationCampaign.findFirst({
    where: { status: { in: ["ACTIVE", "COMPLETED"] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      drawStatus: true,
      scheduledDrawAt: true,
      drawStartedAt: true,
      draws: {
        orderBy: { attemptNumber: "desc" },
        take: 1,
        select: {
          attemptNumber: true,
          revealAt: true,
          winnerStatus: true,
          winner1: { select: { donorName: true } },
          winner2: { select: { donorName: true } },
          winner3: { select: { donorName: true } },
        },
      },
    },
  });

  const serverNow = new Date().toISOString();

  if (!campaign) {
    return NextResponse.json({ campaign: null, draw: null, serverNow });
  }

  const draw = campaign.draws[0] ?? null;
  const revealed = !!draw?.revealAt && new Date() >= draw.revealAt;

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      drawStatus: campaign.drawStatus,
      scheduledDrawAt: campaign.scheduledDrawAt,
      drawStartedAt: campaign.drawStartedAt,
    },
    draw: draw
      ? {
          attemptNumber: draw.attemptNumber,
          revealAt: draw.revealAt,
          winnerStatus: draw.winnerStatus,
          // Nunca se incluye antes de tiempo: si "revealed" es false, este
          // campo es null sin importar qué haya calculado el backend.
          winners: revealed
            ? {
                first: draw.winner1?.donorName ?? null,
                second: draw.winner2?.donorName ?? null,
                third: draw.winner3?.donorName ?? null,
              }
            : null,
        }
      : null,
    serverNow,
  });
}
