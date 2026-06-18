import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { sendCanastaWinnerEmail } from "@/lib/resend";

const ANIMATION_DURATION_MS = 10_000; // duración de la animación de la ruleta
// Colchón entre apretar "Activar sorteo ahora" y que arranque la ruleta para
// todos los espectadores. Le da tiempo al admin de pasar a la página en vivo
// y a los donantes de entrar después de recibir el aviso.
const PRE_LAUNCH_DELAY_MS = 5 * 60_000;

// Elige `count` elementos al azar de `pool` sin reemplazo, usando una fuente
// criptográficamente robusta (no Math.random()).
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

// POST /api/admin/canasta/draw/activate
// Calcula y persiste el resultado del sorteo en el mismo instante en que se
// activa — nunca durante la animación del cliente. Protegido contra
// doble-activación (doble-click, dos pestañas, reintento de red) mediante
// un compare-and-swap atómico sobre drawStatus dentro de una transacción.
export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const campaign = await prisma.donationCampaign.findFirst({
    where: { status: { in: ["ACTIVE", "COMPLETED"] } },
    orderBy: { createdAt: "desc" },
  });

  if (!campaign) {
    return NextResponse.json({ error: "No hay campaña para sortear" }, { status: 404 });
  }

  if (!campaign.scheduledDrawAt) {
    return NextResponse.json({ error: "Primero hay que programar la fecha del sorteo" }, { status: 400 });
  }

  // No se puede activar antes de la hora programada — esa hora es una
  // promesa pública (el contador en /canasta/sorteo), activarlo antes la rompe.
  if (campaign.scheduledDrawAt.getTime() > Date.now()) {
    return NextResponse.json({ error: "Todavía no llegó la hora programada del sorteo" }, { status: 400 });
  }

  // No se puede activar sin haber avisado antes a los donantes (si nadie
  // sabe que hay un sorteo, activar no tiene sentido y nadie lo ve en vivo).
  const notifiedCount = await prisma.donationNotification.count({ where: { campaignId: campaign.id } });
  if (notifiedCount === 0) {
    return NextResponse.json(
      { error: "Primero tenés que avisarle a los donantes la fecha y hora del sorteo (botón 'Avisar a todos los donantes')" },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // drawStartedAt queda en el futuro (ahora + 5 min): la página pública
      // muestra una cuenta regresiva hasta ese instante antes de empezar a
      // girar la ruleta. Le da tiempo al admin y a los donantes a acomodarse.
      const drawStartedAt = new Date(Date.now() + PRE_LAUNCH_DELAY_MS);

      // Compare-and-swap: solo avanza si drawStatus sigue en SCHEDULED.
      // Si dos requests llegan casi simultáneos, solo uno afecta una fila.
      const updated = await tx.donationCampaign.updateMany({
        where: { id: campaign.id, drawStatus: "SCHEDULED" },
        data: { drawStatus: "LIVE", drawStartedAt },
      });
      if (updated.count === 0) {
        throw Object.assign(new Error("Sorteo ya activado"), { code: "ALREADY_ACTIVATED" });
      }

      const previousDraws = await tx.donationDraw.findMany({
        where: { campaignId: campaign.id },
        orderBy: { attemptNumber: "desc" },
      });
      const lastDraw = previousDraws[0];
      const attemptNumber = (lastDraw?.attemptNumber ?? 0) + 1;

      const excludedIds = new Set<string>();
      for (const d of previousDraws) {
        for (const id of JSON.parse(d.excludedDonationIds || "[]")) excludedIds.add(id);
        if (d.winner1Id) excludedIds.add(d.winner1Id);
        if (d.winner2Id) excludedIds.add(d.winner2Id);
        if (d.winner3Id) excludedIds.add(d.winner3Id);
      }

      const candidates = await tx.donation.findMany({
        where: {
          campaignId: campaign.id,
          status: "CONFIRMED",
          id: { notIn: Array.from(excludedIds) },
        },
        select: { id: true },
      });

      if (candidates.length === 0) {
        throw Object.assign(new Error("Sin candidatos"), { code: "NO_CANDIDATES" });
      }

      const winners = pickRandomWinners(candidates, 3);
      const revealAt = new Date(drawStartedAt.getTime() + ANIMATION_DURATION_MS);

      const draw = await tx.donationDraw.create({
        data: {
          campaignId: campaign.id,
          attemptNumber,
          winner1Id: winners[0]?.id,
          winner2Id: winners[1]?.id,
          winner3Id: winners[2]?.id,
          winnerStatus: "PENDING",
          excludedDonationIds: JSON.stringify(Array.from(excludedIds)),
          revealAt,
        },
      });

      return { draw, revealAt };
    });

    // El email se manda fuera de la transacción: si falla, no debe revertir
    // el sorteo ya persistido. El primer ganador (posición 1) es a quien
    // se avisa al activar.
    if (result.draw.winner1Id) {
      const winner1 = await prisma.donation.findUnique({
        where: { id: result.draw.winner1Id },
        select: { donorName: true, donorEmail: true },
      });
      if (winner1) {
        sendCanastaWinnerEmail({ to: winner1.donorEmail, donorName: winner1.donorName, position: 1 }).catch((e) =>
          console.error("[canasta/draw/activate] error mandando email al ganador:", e)
        );
      }
    }

    return NextResponse.json({ ok: true, attemptNumber: result.draw.attemptNumber, revealAt: result.revealAt });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ALREADY_ACTIVATED") {
      return NextResponse.json({ error: "El sorteo ya fue activado" }, { status: 409 });
    }
    if (code === "NO_CANDIDATES") {
      return NextResponse.json({ error: "No hay donantes confirmados para sortear" }, { status: 400 });
    }
    console.error("[canasta/draw/activate]", err);
    return NextResponse.json({ error: "No se pudo activar el sorteo" }, { status: 500 });
  }
}
