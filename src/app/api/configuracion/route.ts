import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { revalidatePath } from "next/cache";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  return NextResponse.json({ store });
}

function isValidHex(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

function isSafeUrl(url: unknown): boolean {
  if (!url || typeof url !== "string") return true;
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return url.startsWith("/") || url === "#"; // rutas relativas ok
  }
}

// Limpia protocolos peligrosos (javascript:, data:) de todos los campos URL de un bloque
function sanitizeBlockProps(props: Record<string, unknown>): Record<string, unknown> {
  const URL_FIELDS = ["buttonUrl", "url", "href", "link", "image", "bgImage"];
  const clean: Record<string, unknown> = { ...props };
  for (const field of URL_FIELDS) {
    if (field in clean && !isSafeUrl(clean[field])) {
      clean[field] = "#";
    }
  }
  // Slides de banner-group tienen sus propias URLs
  if (Array.isArray(clean.slides)) {
    clean.slides = (clean.slides as Record<string, unknown>[]).map((s) => ({
      ...s,
      buttonUrl: isSafeUrl(s.buttonUrl) ? s.buttonUrl : "#",
      image: isSafeUrl(s.image) ? s.image : "",
    }));
  }
  if (Array.isArray(clean.cards)) {
    clean.cards = (clean.cards as Record<string, unknown>[]).map((c) => ({
      ...c,
      buttonUrl: isSafeUrl(c.buttonUrl) ? c.buttonUrl : "#",
    }));
  }
  return clean;
}

function sanitizePageBlocks(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    const blocks = Array.isArray(parsed) ? parsed : (parsed?.blocks ?? []);
    const sanitized = blocks.map((b: { props?: Record<string, unknown> } & Record<string, unknown>) => ({
      ...b,
      props: b.props ? sanitizeBlockProps(b.props) : {},
    }));
    if (Array.isArray(parsed)) return JSON.stringify(sanitized);
    return JSON.stringify({ ...parsed, blocks: sanitized });
  } catch {
    return "[]";
  }
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
      const parsed = JSON.parse(b.pageBlocks);
      if (!Array.isArray(parsed) && !Array.isArray(parsed?.blocks)) throw new Error();
    } catch {
      return NextResponse.json({ error: "Bloques de página inválidos" }, { status: 400 });
    }
  }

  // Validar URLs de logo y banner (SEC-04)
  if (b.logo && !isSafeUrl(b.logo)) {
    return NextResponse.json({ error: "URL de logo inválida" }, { status: 400 });
  }
  if (b.banner && !isSafeUrl(b.banner)) {
    return NextResponse.json({ error: "URL de banner inválida" }, { status: 400 });
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
      pageBlocks:         sanitizePageBlocks(b.pageBlocks || "[]"),
      tipoTienda:           b.tipoTienda || "ROPA",
      tipoTiendaConfigurado: Boolean(b.tipoTiendaConfigurado),
      tieneVentaMayorista:  Boolean(b.tieneVentaMayorista),
    },
  });

  revalidatePath(`/tienda/${store.slug}`, "layout");
  return NextResponse.json({ store });
}
