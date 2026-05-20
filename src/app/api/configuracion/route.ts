import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { revalidatePath } from "next/cache";
import { createNotificationMany } from "@/lib/notifications";

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
  function sanitizeNavLinks(raw: string): string {
    try {
      const parsed = JSON.parse(raw);
      function sanitizeLinks(links: unknown[]): Record<string, unknown>[] {
        return links
          .filter((l): l is Record<string, unknown> => !!l && typeof l === "object")
          .map((l) => ({
            id:    String(l.id    || ""),
            label: String(l.label || "").slice(0, 60),
            type:  l.type === "url" ? "url" : l.type === "section" ? "section" : "filter",
            value: l.type === "url" ? (isSafeUrl(l.value) ? String(l.value || "") : "#") : String(l.value || "").slice(0, 80),
          }));
      }
      if (Array.isArray(parsed)) {
        return JSON.stringify({ layout: "right", showSearch: false, links: sanitizeLinks(parsed) });
      }
      return JSON.stringify({
        layout: parsed.layout === "center" ? "center" : "right",
        showSearch: Boolean(parsed.showSearch),
        links: sanitizeLinks(Array.isArray(parsed.links) ? parsed.links : []),
      });
    } catch { return JSON.stringify({ layout: "right", showSearch: false, links: [] }); }
  }

  // Validar URLs de logo y banner (SEC-04)
  if (b.logo && !isSafeUrl(b.logo)) {
    return NextResponse.json({ error: "URL de logo inválida" }, { status: 400 });
  }
  if (b.banner && !isSafeUrl(b.banner)) {
    return NextResponse.json({ error: "URL de banner inválida" }, { status: 400 });
  }

  const prevStore = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, commissionRate: true, affiliatesEnabled: true },
  });

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
      navLinks:           sanitizeNavLinks(b.navLinks || "[]"),
      tipoTienda:           b.tipoTienda || "ROPA",
      tipoTiendaConfigurado: Boolean(b.tipoTiendaConfigurado),
      tieneVentaMayorista:  Boolean(b.tieneVentaMayorista),
      policyReturns:        typeof b.policyReturns === "string" ? (b.policyReturns || null) : undefined,
      policyShipping:       typeof b.policyShipping === "string" ? (b.policyShipping || null) : undefined,
      policyTerms:          typeof b.policyTerms === "string" ? (b.policyTerms || null) : undefined,
      policyReturnsActive:  b.policyReturnsActive !== undefined ? Boolean(b.policyReturnsActive) : undefined,
      policyShippingActive: b.policyShippingActive !== undefined ? Boolean(b.policyShippingActive) : undefined,
      policyTermsActive:    b.policyTermsActive !== undefined ? Boolean(b.policyTermsActive) : undefined,
      footerDescription:    typeof b.footerDescription === "string" ? (b.footerDescription || null) : undefined,
      footerShowLegal:      b.footerShowLegal !== undefined ? Boolean(b.footerShowLegal) : undefined,
    },
  });

  // Registrar aceptación del dueño la primera vez que activa el programa (raw SQL para compatibilidad)
  if (b.affiliatesEnabled && !prevStore?.affiliatesEnabled) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const version = (b.tcOwnerVersion as string) ?? "1.0";
    prisma.$executeRaw`
      UPDATE "Store"
      SET "tcOwnerAcceptedAt" = NOW(), "tcOwnerAcceptedIp" = ${ip}, "tcOwnerVersion" = ${version}
      WHERE "ownerId" = ${user.id} AND "tcOwnerAcceptedAt" IS NULL
    `.catch(() => {});
  }

  // Notificar a afiliados activos si cambió la comisión
  const newRate = isNaN(commissionRate) ? 10 : commissionRate;
  if (prevStore && prevStore.commissionRate !== newRate) {
    const affiliates = await prisma.affiliate.findMany({
      where: { storeId: prevStore.id, isActive: true },
      select: { userId: true },
    });
    if (affiliates.length > 0) {
      const now = new Date();
      const dateStr = now.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
      const timeStr = now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
      await createNotificationMany(
        affiliates.map(({ userId }) => ({
          userId,
          type: "COMMISSION_RATE_CHANGED",
          title: `Cambio de comisión en ${store.name}`,
          body: `La comisión pasó de ${prevStore.commissionRate}% a ${newRate}%. · ${dateStr}, ${timeStr}`,
          link: "/vendedoras",
        }))
      );
    }
  }

  revalidatePath(`/tienda/${store.slug}`, "layout");
  return NextResponse.json({ store });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { isPublished } = await req.json();
  if (typeof isPublished !== "boolean") {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  }
  const store = await prisma.store.update({
    where: { ownerId: user.id },
    data: { isPublished },
  });
  revalidatePath(`/tienda/${store.slug}`, "layout");
  return NextResponse.json({ isPublished: store.isPublished });
}
