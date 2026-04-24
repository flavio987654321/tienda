import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

// GET - afiliado: ver tiendas disponibles / tienda: ver sus afiliados
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode");

  if (mode === "stats") {
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const userId = user.id;

    const affiliates = await prisma.affiliate.findMany({
      where: { userId },
      include: {
        commissions: { select: { amount: true, status: true } },
        orders: { select: { id: true, total: true, createdAt: true } },
        wallet: { select: { balance: true, totalEarned: true } },
        store: { select: { name: true, slug: true } },
      },
    });

    const totalOrders = affiliates.reduce((s, a) => s + a.orders.length, 0);
    const totalEarned = affiliates.reduce((s, a) => s + (a.wallet?.totalEarned ?? 0), 0);
    const pendingBalance = affiliates.reduce((s, a) => s + (a.wallet?.balance ?? 0), 0);
    const pendingCommissions = affiliates.reduce(
      (s, a) => s + a.commissions.filter((c) => c.status === "PENDING").reduce((x, c) => x + c.amount, 0), 0
    );

    return NextResponse.json({ totalOrders, totalEarned, pendingBalance, pendingCommissions, affiliates });
  }

  if (mode === "tiendas-disponibles") {
    const userId = user?.id;
    const stores = await prisma.store.findMany({
      where: { affiliatesEnabled: true, isActive: true },
      include: {
        owner: { select: { name: true } },
        _count: { select: { products: true } },
        affiliates: {
          where: userId ? { userId } : { id: "__public_no_affiliate__" },
          select: { id: true, status: true, isActive: true },
        },
      },
    });
    return NextResponse.json({ stores });
  }

  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Ver afiliados de mi tienda
  const ownerId = user.id;
  const store = await prisma.store.findUnique({
    where: { ownerId },
    include: {
      affiliates: {
        include: {
          user: { select: { name: true, email: true } },
          commissions: { orderBy: { createdAt: "desc" }, take: 5 },
          wallet: true,
        },
      },
    },
  });

  return NextResponse.json({ affiliates: store?.affiliates ?? [] });
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// POST - afiliado se une a una tienda
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { storeId, applicationMessage, experience, cvUrl, socialUrl } = await req.json();
  const userId = user.id;

  if (!storeId || typeof storeId !== "string") {
    return NextResponse.json({ error: "ID de tienda inválido" }, { status: 400 });
  }
  const appMsg = applicationMessage?.trim() || null;
  if (appMsg && appMsg.length > 1000) {
    return NextResponse.json({ error: "El mensaje no puede superar 1000 caracteres" }, { status: 400 });
  }
  const exp = experience?.trim() || null;
  if (exp && exp.length > 500) {
    return NextResponse.json({ error: "La experiencia no puede superar 500 caracteres" }, { status: 400 });
  }
  if (cvUrl && !isSafeUrl(cvUrl)) {
    return NextResponse.json({ error: "URL del CV inválida" }, { status: 400 });
  }
  if (socialUrl && !isSafeUrl(socialUrl)) {
    return NextResponse.json({ error: "URL de redes inválida" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store || !store.affiliatesEnabled) {
    return NextResponse.json({ error: "Tienda no disponible" }, { status: 400 });
  }

  if (store.ownerId === userId) {
    return NextResponse.json({ error: "No podes ser afiliado de tu propia tienda" }, { status: 400 });
  }

  const existing = await prisma.affiliate.findFirst({
    where: { userId, storeId },
  });
  if (existing) {
    if (existing.status === "REJECTED" || existing.status === "REMOVED") {
      const affiliate = await prisma.affiliate.update({
        where: { id: existing.id },
        data: {
          status: "PENDING",
          isActive: false,
          applicationMessage: appMsg,
          experience: exp,
          cvUrl: cvUrl || null,
          socialUrl: socialUrl || null,
          requestedAt: new Date(),
          reviewedAt: null,
        },
      });

      return NextResponse.json({ affiliate, message: "Solicitud reenviada" });
    }

    const message =
      existing.status === "PENDING"
        ? "Ya tenes una solicitud pendiente para esta tienda"
        : "Ya tenes una relacion activa con esta tienda";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const affiliate = await prisma.affiliate.create({
    data: {
      userId,
      storeId,
      ownerId: store.ownerId,
      status: "PENDING",
      isActive: false,
      applicationMessage: appMsg,
      experience: exp,
      cvUrl: cvUrl || null,
      socialUrl: socialUrl || null,
    },
  });

  // Actualizar rol del usuario
  await prisma.user.update({
    where: { id: userId },
    data: { role: "SELLER" },
  });

  return NextResponse.json({ affiliate, message: "Solicitud enviada" });
}
