import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const store = await prisma.store.findUnique({ where: { ownerId: (session.user as any).id } });
  return NextResponse.json({ store });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = await req.json();

  const store = await prisma.store.update({
    where: { ownerId: (session.user as any).id },
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
      commissionRate:     parseFloat(b.commissionRate) || 10,
    },
  });

  return NextResponse.json({ store });
}
