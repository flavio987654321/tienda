import { NextRequest, NextResponse } from "next/server";
import { identidadReciente } from "@/lib/identidad-reciente";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { sendMpDisconnectedEmail } from "@/lib/email";
import { despues } from "@/lib/despues";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  /* Desconectar el cobro es el primer paso para cambiar a dónde va la plata:
     pide verificar que es la dueña, y no se puede mientras los datos de cobro
     están trabados. Ver `lib/identidad-reciente`. */
  const identidad = await identidadReciente(req, user.id, { tocaDinero: true });
  if (!identidad.ok) return NextResponse.json(identidad.body, { status: identidad.status });

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

  // Notificar a afiliados activos que el programa está pausado (fire-and-forget)
  const activeAffiliates = await prisma.affiliate.findMany({
    where: { storeId: store.id, status: "APPROVED", isActive: true },
    include: { user: { select: { email: true, name: true } } },
  });

  await identidad.quemar();

  for (const affiliate of activeAffiliates) {
    if (affiliate.user.email) {
      despues(() => sendMpDisconnectedEmail({
        affiliateEmail: affiliate.user.email,
        affiliateName: affiliate.user.name ?? "afiliado",
        storeName: store.name,
      }), "MP desconectado: aviso al afiliado");
    }
  }

  return NextResponse.json({ ok: true });
}
