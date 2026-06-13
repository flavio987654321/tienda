import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { revalidatePath } from "next/cache";
import { createNotificationMany } from "@/lib/notifications";
import { isSafeUrl } from "@/lib/url-utils";
import { sendNewStorePublishedEmail, sendStoreOfflineEmail } from "@/lib/email";
import { z } from "zod";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const storeConfigSchema = z.object({
  template: z.enum(["fashion-noir", "boho-terra", "urban-pulse", "chic-paris", "auto-motor", "auto-drive"]),
  storeName: z.string().max(120),
  storeTagline: z.string().max(200),
  colors: z.object({ accent: z.string().regex(HEX_RE) }),
  whatsapp: z.object({ enabled: z.boolean(), number: z.string().max(30) }),
  socialLinks: z.object({
    instagram: z.string().max(200),
    facebook:  z.string().max(200),
    tiktok:    z.string().max(200),
    youtube:   z.string().max(200),
    pinterest: z.string().max(200),
  }),
  currency: z.enum(["ARS", "USD"]),
  language: z.enum(["ES", "EN"]),
  seo: z.object({ enabled: z.boolean(), title: z.string().max(120), description: z.string().max(320) }),
  textOverrides: z.record(z.string(), z.object({
    text: z.string().max(500).optional(),
    color: z.string().max(30).optional(),
    fontFamily: z.string().max(80).optional(),
    fontSize: z.number().optional(),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    hidden: z.boolean().optional(),
  })),
  imageOverrides: z.record(z.string(), z.object({
    url: z.string().max(2000).optional(),
    overlayType: z.enum(["none", "dark", "light"]).optional(),
    overlayOpacity: z.number().min(0).max(1).optional(),
    posX: z.number().min(0).max(100).optional(),
    posY: z.number().min(0).max(100).optional(),
  })),
  sectionColors: z.record(z.string(), z.string().max(30)),
  bannerInterval: z.number().optional(),
  promoBanner: z.object({ enabled: z.boolean(), messages: z.array(z.string().max(120)).max(3).optional() }).optional(),
  previewFill: z.boolean().optional(),
  tipoTienda: z.string().max(30).optional(),
  tieneVentaMayorista: z.boolean().optional(),
  ocultarPreciosPublico: z.boolean().optional(),
  featuredCategories: z.array(z.string().max(80)).optional(),
  storeId: z.string().optional(),
  slug: z.string().optional(),
  flyerConfig: z.object({
    enabled: z.boolean(),
    images: z.array(z.string().max(2000)).max(3),
  }).optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const [store, subscription] = await Promise.all([
    prisma.store.findUnique({ where: { ownerId: user.id } }),
    prisma.subscription.findUnique({ where: { userId: user.id }, select: { tier: true } }),
  ]);
  return NextResponse.json({ store, isPremium: subscription?.tier === "PREMIUM" });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  const parsed = storeConfigSchema.safeParse(body.storeConfig);
  if (!parsed.success) {
    return NextResponse.json({ error: "Config inválida", details: parsed.error.flatten() }, { status: 400 });
  }
  const store = await prisma.store.update({
    where: { ownerId: user.id },
    data: { storeConfig: JSON.stringify(parsed.data) },
    select: { slug: true },
  });
  revalidatePath(`/tienda/${store.slug}`, "layout");
  return NextResponse.json({ ok: true });
}

async function notifyAffiliatesStoreOffline(storeId: string, storeName: string) {
  const affiliates = await prisma.affiliate.findMany({
    where: { storeId, status: "APPROVED", isActive: true },
    select: { userId: true, user: { select: { email: true, name: true } } },
  });
  if (!affiliates.length) return;

  await createNotificationMany(affiliates.map(a => ({
    userId: a.userId,
    type: "store_offline",
    title: "Tienda pausada",
    body: `La tienda "${storeName}" pausó temporalmente su actividad. Tu link sigue existiendo.`,
    link: "/afiliados",
  })));

  for (const a of affiliates) {
    sendStoreOfflineEmail({
      affiliateEmail: a.user.email,
      affiliateName: a.user.name || "afiliado",
      storeName,
    }).catch(console.error);
  }
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const prevStore = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, slug: true, name: true, isPublished: true },
  });

  const store = await prisma.store.update({
    where: { ownerId: user.id },
    data: { storeConfig: "{}", pageBlocks: "[]", isPublished: false },
    select: { slug: true },
  });

  revalidatePath(`/tienda/${store.slug}`, "layout");

  if (prevStore?.isPublished && prevStore.id) {
    notifyAffiliatesStoreOffline(prevStore.id, prevStore.name).catch(console.error);
  }

  return NextResponse.json({ ok: true });
}

function isValidHex(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
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
    select: { id: true, commissionRate: true, affiliatesEnabled: true, acceptsRewardCoupons: true },
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
      // Si se apaga el programa completo, también se apagan los cupones
      acceptsRewardCoupons: !b.affiliatesEnabled ? false : (b.acceptsRewardCoupons !== undefined ? Boolean(b.acceptsRewardCoupons) : undefined),
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
    `.catch((err) => console.error("[configuracion] TC acceptance update failed:", err));
  }

  // Notificar a afiliados activos si el programa fue pausado
  if (prevStore?.affiliatesEnabled && !b.affiliatesEnabled) {
    const affiliates = await prisma.affiliate.findMany({
      where: { storeId: prevStore.id, isActive: true },
      select: { userId: true },
    });
    if (affiliates.length > 0) {
      await createNotificationMany(
        affiliates.map(({ userId }) => ({
          userId,
          type: "STORE_PROGRAM_PAUSED",
          title: `${store.name} pausó su programa de afiliados`,
          body: "Por ahora no podés generar nuevas ventas con tu link. Tu saldo en billetera sigue disponible para retirar.",
          link: "/afiliados",
        }))
      );
    }
  }

  // Notificar a afiliados con cupones disponibles si se desactivó la aceptación de cupones
  // (ya sea apagando el toggle de cupones o apagando el programa completo)
  const couponsWereDisabled =
    prevStore?.acceptsRewardCoupons &&
    (!b.affiliatesEnabled || b.acceptsRewardCoupons === false);
  if (couponsWereDisabled) {
    const storeAffiliates = await prisma.affiliate.findMany({
      where: { storeId: prevStore.id, isActive: true },
      select: { userId: true },
    });
    const affiliateUserIds = storeAffiliates.map((a: { userId: string }) => a.userId);
    if (affiliateUserIds.length > 0) {
      const withCoupons = await prisma.affiliateRewardCoupon.findMany({
        where: { userId: { in: affiliateUserIds }, status: "AVAILABLE" },
        select: { userId: true },
        distinct: ["userId"],
      });
      if (withCoupons.length > 0) {
        await createNotificationMany(
          withCoupons.map((c: { userId: string }) => ({
            userId: c.userId,
            type: "STORE_COUPONS_DISABLED",
            title: `${store.name} ya no acepta cupones de premio`,
            body: "Tus cupones siguen válidos pero no podés usarlos en esta tienda por ahora.",
            link: "/afiliados/premios",
          }))
        );
      }
    }
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
          link: "/afiliados",
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

  const prevStore = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, isPublished: true, slug: true, name: true, commissionRate: true, affiliatesEnabled: true },
  });

  const store = await prisma.store.update({
    where: { ownerId: user.id },
    data: { isPublished },
  });

  revalidatePath(`/tienda/${store.slug}`, "layout");

  // Cuando se despublica, notificar a afiliados activos
  if (!isPublished && prevStore?.isPublished && prevStore?.id) {
    notifyAffiliatesStoreOffline(prevStore.id, prevStore.name).catch(console.error);
  }

  // Cuando una tienda se publica por primera vez (o se re-publica), notificar a afiliadas interesadas
  if (isPublished && !prevStore?.isPublished && prevStore?.affiliatesEnabled) {
    const interested = await prisma.user.findMany({
      where: { notifyNewStores: true, id: { not: user.id } },
      select: { email: true, name: true },
    });

    if (interested.length > 0) {
      for (const affiliate of interested) {
        sendNewStorePublishedEmail({
          affiliateEmail: affiliate.email,
          affiliateName: affiliate.name || "afiliada",
          storeName: prevStore.name,
          storeSlug: prevStore.slug,
          commissionRate: prevStore.commissionRate,
        }).catch((err) => console.error("[email] sendNewStorePublishedEmail failed:", err));
      }
    }
  }

  return NextResponse.json({ isPublished: store.isPublished });
}
