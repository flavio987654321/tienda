import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { sendNewAffiliateApplicationEmail } from "@/lib/email";
import { isSafeExternalUrl } from "@/lib/url-utils";
import { sendPushToUser } from "@/lib/push";
import { checkRateLimit } from "@/lib/rate-limit";

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
        // Solo últimas 100 comisiones — suficiente para calcular pendientes sin cargar miles de registros
        commissions: { select: { amount: true, status: true }, orderBy: { createdAt: "desc" }, take: 100 },
        // Solo últimas 100 órdenes para el conteo
        orders: { select: { id: true, total: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 100 },
        wallet: { select: { balance: true, totalEarned: true } },
        store: { select: { name: true, slug: true } },
      },
    });

    // Los totales reales vienen del wallet (fuente de verdad), no de sumar registros truncados
    const totalOrders = affiliates.reduce((s, a) => s + a.orders.length, 0);
    const totalEarned = affiliates.reduce((s, a) => s + (a.wallet?.totalEarned ?? 0), 0);
    const pendingBalance = affiliates.reduce((s, a) => s + (a.wallet?.balance ?? 0), 0);
    const pendingCommissions = affiliates.reduce(
      (s, a) => s + a.commissions.filter((c) => c.status === "PENDING").reduce((x, c) => x + c.amount, 0), 0
    );

    return NextResponse.json({ totalOrders, totalEarned, pendingBalance, pendingCommissions, affiliates });
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


const TC_VERSION = "1.3";

// POST - afiliado se une a una tienda
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`affiliate-apply:${ip}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Esperá un momento." }, { status: 429 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { storeId, applicationMessage, experience, cvUrl, socialUrl, tcAccepted } = await req.json();
  const userId = user.id;

  if (!tcAccepted) {
    return NextResponse.json(
      { error: "Debés aceptar los términos y condiciones para postularte" },
      { status: 400 }
    );
  }

  const tcAcceptedAt = new Date();
  const tcAcceptedIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip") ?? "unknown";

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
  if (cvUrl && !isSafeExternalUrl(cvUrl)) {
    return NextResponse.json({ error: "URL del CV inválida" }, { status: 400 });
  }
  // socialUrl acepta handles (@usuario) o URLs completas
  if (socialUrl && socialUrl.startsWith("http") && !isSafeExternalUrl(socialUrl)) {
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
          tcAcceptedAt,
          tcVersion: TC_VERSION,
          tcAcceptedIp,
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
      tcAcceptedAt,
      tcVersion: TC_VERSION,
      tcAcceptedIp,
    },
  });

  // Notificar a la dueña por email + push (fire-and-forget)
  prisma.user.findUnique({ where: { id: store.ownerId }, select: { email: true, name: true } })
    .then((owner) => {
      if (owner?.email) {
        sendNewAffiliateApplicationEmail({
          ownerEmail: owner.email,
          ownerName: owner.name || "vendedora",
          storeName: store.name,
          applicantName: user.name || "Una usuaria",
          applicantEmail: user.email,
          applicationMessage: appMsg,
        }).catch((err) => console.error("[email] sendNewAffiliateApplicationEmail failed:", err));
      }
    })
    .catch((err) => console.error("[notify] affiliate application owner lookup failed:", err));

  sendPushToUser(store.ownerId, {
    title: "Nueva solicitud de afiliada",
    body: `${user.name || user.email} quiere unirse a ${store.name}`,
    url: "/dashboard/vendedoras",
  }).catch((err) => console.error("[push] affiliate application:", err));

  // El rol se asigna solo cuando la dueña aprueba, no al postular
  return NextResponse.json({ affiliate, message: "Solicitud enviada" });
}
