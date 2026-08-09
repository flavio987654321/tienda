import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { sendMpDisconnectedEmail } from "@/lib/email";
import { despues } from "@/lib/despues";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true },
  });

  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  await prisma.store.update({
    where: { id: store.id },
    data: {
      mpAccessToken:  null,
      mpRefreshToken: null,
      mpSellerId:     null,
      mpConnectedAt:  null,
    },
  });

  // Notificar a afiliadas activas que el programa está pausado (fire-and-forget)
  const activeAffiliates = await prisma.affiliate.findMany({
    where: { storeId: store.id, status: "APPROVED", isActive: true },
    include: { user: { select: { email: true, name: true } } },
  });

  for (const affiliate of activeAffiliates) {
    if (affiliate.user.email) {
      despues(() => sendMpDisconnectedEmail({
        affiliateEmail: affiliate.user.email,
        affiliateName: affiliate.user.name ?? "afiliada",
        storeName: store.name,
      }), "MP desconectado: aviso a la afiliada");
    }
  }

  return NextResponse.json({ ok: true });
}
