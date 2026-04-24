import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  return NextResponse.json({ store });
}

function isValidHex(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = await req.json();

  if (!b.name || typeof b.name !== "string" || b.name.trim().length === 0) {
    return NextResponse.json({ error: "El nombre de la tienda es requerido" }, { status: 400 });
  }
  for (const field of ["primaryColor", "secondaryColor", "accentColor"] as const) {
    if (b[field] && !isValidHex(b[field])) {
      return NextResponse.json({ error: `Color inválido: ${field}` }, { status: 400 });
    }
  }
  const commissionRate = parseFloat(b.commissionRate);
  if (b.commissionRate !== undefined && (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100)) {
    return NextResponse.json({ error: "La tasa de comisión debe estar entre 0 y 100" }, { status: 400 });
  }
  if (b.pageBlocks && b.pageBlocks !== "[]") {
    try {
      const blocks = JSON.parse(b.pageBlocks);
      if (!Array.isArray(blocks)) throw new Error();
    } catch {
      return NextResponse.json({ error: "Bloques de página inválidos" }, { status: 400 });
    }
  }

  const store = await prisma.store.update({
    where: { ownerId: user.id },
    data: {
      name:               b.name,
      tagline:            b.tagline        || null,
      description:        b.description    || null,
      logo:               b.logo           || null,
      banner:             b.banner         || null,
      primaryColor:       b.primaryColor,
      secondaryColor:     b.secondaryColor,
      accentColor:        b.accentColor,
      fontFamily:         b.fontFamily,
      templateId:         b.templateId,
      productLayout:      b.productLayout  || "grid3",
      heroStyle:          b.heroStyle      || "full",
      navbarStyle:        b.navbarStyle    || "solid",
      buttonStyle:        b.buttonStyle    || "rounded",
      cardRadius:         b.cardRadius     || "md",
      cardShadow:         b.cardShadow     || "sm",
      cardHover:          b.cardHover      || "scale",
      backgroundStyle:    b.backgroundStyle|| "plain",
      showPrices:         b.showPrices     !== false,
      showStock:          b.showStock      !== false,
      showRatings:        Boolean(b.showRatings),
      announcementBar:    b.announcementBar|| null,
      announcementBarColor: b.announcementBarColor || "#6366f1",
      instagramUrl:       b.instagramUrl   || null,
      facebookUrl:        b.facebookUrl    || null,
      tiktokUrl:          b.tiktokUrl      || null,
      whatsappNumber:     b.whatsappNumber || null,
      showWhatsappButton: Boolean(b.showWhatsappButton),
      footerText:         b.footerText     || null,
      currency:           b.currency       || "ARS",
      seoTitle:           b.seoTitle       || null,
      seoDescription:     b.seoDescription || null,
      affiliatesEnabled:  Boolean(b.affiliatesEnabled),
      commissionRate:     isNaN(commissionRate) ? 10 : commissionRate,
      pageBlocks:         b.pageBlocks || "[]",
    },
  });

  return NextResponse.json({ store });
}
