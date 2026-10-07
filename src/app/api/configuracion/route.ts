import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { soportaAfiliados, MOTIVO_SIN_AFILIADOS, STORE_TYPES } from "@/lib/storeTypes";
import { revalidatePath } from "next/cache";
import { createNotificationMany } from "@/lib/notifications";
import { isSafeUrl, isSafeExternalUrl } from "@/lib/url-utils";
import { hasActivePremium, SUB_STATUS_SELECT } from "@/lib/subscription";
import { sendNewStorePublishedEmail, sendStoreOfflineEmail, sendCommissionRateChangedEmail } from "@/lib/email";
import { getClientIp } from "@/lib/request-ip";
import { storeConfigSchema, mergeDesignConfig, resetStoreDesign } from "@/lib/store-config";
import { despues } from "@/lib/despues";
import { limpiarTextoLegal } from "@/lib/politicas-tienda";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const [store, subscription] = await Promise.all([
    prisma.store.findUnique({ where: { ownerId: user.id } }),
    prisma.subscription.findUnique({ where: { userId: user.id }, select: SUB_STATUS_SELECT }),
  ]);
  // Con el estado, no solo con el tier: este `isPremium` habilita el editor del
  // flyer. Mirando solo el plan, una Premium vencida podía seguir configurándolo
  // aunque la tienda pública ya no lo muestre (ahí sí se chequea el estado).
  return NextResponse.json({ store, isPremium: hasActivePremium(subscription) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  const parsed = storeConfigSchema.safeParse(body.storeConfig);
  if (!parsed.success) {
    return NextResponse.json({ error: "Config inválida", details: parsed.error.flatten() }, { status: 400 });
  }

  // El editor solo es dueño de las claves del diseño. `mergeDesignConfig` preserva
  // lo que escriben otras features (paymentInfo, shippingMethods) y que zod
  // descarta al validar: guardar `parsed.data` tal cual borraba el CBU y los
  // métodos de envío en cada guardado.
  const current = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { storeConfig: true },
  });
  if (!current) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const store = await prisma.store.update({
    where: { ownerId: user.id },
    data: { storeConfig: mergeDesignConfig(current.storeConfig, parsed.data) },
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
    despues(() => sendStoreOfflineEmail({
      affiliateEmail: a.user.email,
      affiliateName: a.user.name || "afiliado",
      storeName,
    }), "tienda pausada: aviso al afiliado");
  }
}

// El único reset de diseño del proyecto. Antes había una segunda copia en
// /api/cuenta (target: "store") para la Zona de peligro que además de divergir
// —no despublicaba, no revalidaba el caché y no avisaba a los afiliados— dejaba
// a TODAS los afiliados en REMOVED, irreversible, mientras el modal prometía que
// se conservaban. Esa copia se eliminó y ahora los dos botones entran por acá.
//
// `confirm` es opcional: el reset del editor no lo manda (tiene su propio modal)
// y la Zona de peligro sí, para que el nombre que escribe se valide del lado del
// servidor y no solo en el navegador.
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const prevStore = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true },
  });
  if (!prevStore) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const body = await req.json().catch(() => ({})) as { confirm?: unknown };
  if (body.confirm !== undefined && String(body.confirm).trim() !== prevStore.name) {
    return NextResponse.json(
      { error: "El nombre ingresado no coincide con el de tu tienda" },
      { status: 400 }
    );
  }

  const { slug, name, wasPublished } = await resetStoreDesign(prevStore.id);

  revalidatePath(`/tienda/${slug}`, "layout");

  if (wasPublished) {
    notifyAffiliatesStoreOffline(prevStore.id, name).catch(console.error);
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

/* Texto libre del dueño: sólo string, sin caracteres de control, con tope de
   largo (05/10/26). Estos campos se guardaban crudos y salen por la API
   pública y en la tienda. */
function texto(v: unknown, max: number, multilinea = false): string | null {
  if (typeof v !== "string") return null;
  let t = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  if (!multilinea) t = t.replace(/[\r\n\t]+/g, " ");
  t = t.trim().slice(0, max);
  return t || null;
}
/** Un link guardable: http(s) (las redes, absolutas; logo y banner aceptan
 *  rutas propias). Un "javascript:" o cualquier otra cosa → null. Antes las
 *  redes se guardaban crudas: hoy ningún template las pone en un href, pero el
 *  día que alguno lo haga ya estaría abierta la puerta. */
function urlSegura(v: unknown, externa = true): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const u = v.trim().slice(0, 500);
  return (externa ? isSafeExternalUrl(u) : isSafeUrl(u)) ? u : null;
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
    select: { id: true, commissionRate: true, affiliatesEnabled: true, acceptsRewardCoupons: true, mpAccessToken: true, tipoTienda: true, tipoTiendaConfigurado: true },
  });

  /* El rubro con el que QUEDA la tienda (06/10/26). Antes se guardaba
     `b.tipoTienda` crudo, sin validar, y el chequeo de afiliados de abajo miraba
     el rubro ANTERIOR: una concesionaria se pasaba a ROPA, prendía afiliados y
     volvía a AUTOS con los afiliados prendidos. Además esquivaba el cambio de
     rubro oficial (`/api/store/reset`), que limpia productos, consultas y
     afiliados. Ahora: una vez elegido, el rubro sólo cambia por el reset; la
     primera vez, sólo se acepta uno que exista. */
  const rubroElegido = !!prevStore?.tipoTiendaConfigurado;
  const rubroPedido = typeof b.tipoTienda === "string" && STORE_TYPES.some((t) => t.id === b.tipoTienda && !t.comingSoon) ? b.tipoTienda : null;
  const tipoTienda = rubroElegido ? (prevStore?.tipoTienda ?? "ROPA") : (rubroPedido ?? prevStore?.tipoTienda ?? "ROPA");
  const tipoTiendaConfigurado = rubroElegido || Boolean(b.tipoTiendaConfigurado);

  // Rubros donde el programa todavía no está habilitado (hoy: autos y motos).
  // Va antes que el chequeo de MercadoPago porque es más de fondo: aunque
  // tuviera MercadoPago conectado, en un rubro de consulta no se cobra online.
  if (b.affiliatesEnabled && !soportaAfiliados(tipoTienda)) {
    return NextResponse.json({ error: MOTIVO_SIN_AFILIADOS }, { status: 400 });
  }

  if (b.affiliatesEnabled && !prevStore?.mpAccessToken) {
    return NextResponse.json(
      { error: "Necesitás conectar MercadoPago para activar el programa de afiliados" },
      { status: 400 }
    );
  }

  const store = await prisma.store.update({
    where: { ownerId: user.id },
    data: {
      name:               texto(b.name, 80) ?? b.name.trim().slice(0, 80),
      tagline:            texto(b.tagline, 120),
      description:        texto(b.description, 2000, true),
      logo:               urlSegura(b.logo, false),
      banner:             urlSegura(b.banner, false),
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
      announcementBar:    texto(b.announcementBar, 200),
      announcementBarColor: b.announcementBarColor || "#6366f1",
      instagramUrl:       urlSegura(b.instagramUrl),
      facebookUrl:        urlSegura(b.facebookUrl),
      tiktokUrl:          urlSegura(b.tiktokUrl),
      whatsappNumber:     typeof b.whatsappNumber === "string" ? (b.whatsappNumber.replace(/[^\d+]/g, "").slice(0, 20) || null) : null,
      showWhatsappButton: Boolean(b.showWhatsappButton),
      footerText:         texto(b.footerText, 500, true),
      currency:           b.currency       || "ARS",
      seoTitle:           texto(b.seoTitle, 120),
      seoDescription:     texto(b.seoDescription, 300),
      affiliatesEnabled:  Boolean(b.affiliatesEnabled),
      commissionRate:     isNaN(commissionRate) ? 10 : commissionRate,
      pageBlocks:         sanitizePageBlocks(b.pageBlocks || "[]"),
      navLinks:           sanitizeNavLinks(b.navLinks || "[]"),
      tipoTienda,
      tipoTiendaConfigurado,
      tieneVentaMayorista:  Boolean(b.tieneVentaMayorista),
      // Mismo tope que `/api/pagos`. Acá no había ninguno: los mismos campos se
      // guardaban con dos reglas distintas según por qué pantalla se pasara.
      policyReturns:        typeof b.policyReturns === "string" ? (limpiarTextoLegal(b.policyReturns) || null) : undefined,
      policyShipping:       typeof b.policyShipping === "string" ? (limpiarTextoLegal(b.policyShipping) || null) : undefined,
      policyTerms:          typeof b.policyTerms === "string" ? (limpiarTextoLegal(b.policyTerms) || null) : undefined,
      policyPrivacy:        typeof b.policyPrivacy === "string" ? (limpiarTextoLegal(b.policyPrivacy) || null) : undefined,
      policyReturnsActive:  b.policyReturnsActive !== undefined ? Boolean(b.policyReturnsActive) : undefined,
      policyShippingActive: b.policyShippingActive !== undefined ? Boolean(b.policyShippingActive) : undefined,
      policyTermsActive:    b.policyTermsActive !== undefined ? Boolean(b.policyTermsActive) : undefined,
      policyPrivacyActive:  b.policyPrivacyActive !== undefined ? Boolean(b.policyPrivacyActive) : undefined,
      footerDescription:    typeof b.footerDescription === "string" ? (b.footerDescription || null) : undefined,
      footerShowLegal:      b.footerShowLegal !== undefined ? Boolean(b.footerShowLegal) : undefined,
      // Si se apaga el programa completo, también se apagan los cupones
      acceptsRewardCoupons: !b.affiliatesEnabled ? false : (b.acceptsRewardCoupons !== undefined ? Boolean(b.acceptsRewardCoupons) : undefined),
    },
  });

  // Registrar aceptación del dueño la primera vez que activa el programa (raw SQL para compatibilidad)
  if (b.affiliatesEnabled && !prevStore?.affiliatesEnabled) {
    const ip = getClientIp(req);
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
          body: "Por ahora no podés generar nuevas ventas con tu link. Tu saldo en comisiones sigue disponible para retirar.",
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
      select: { userId: true, user: { select: { email: true, name: true } } },
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
      await Promise.allSettled(
        affiliates.map(({ user }) =>
          sendCommissionRateChangedEmail({
            affiliateEmail: user.email,
            affiliateName: user.name ?? "afiliado/a",
            storeName: store.name,
            oldRate: prevStore.commissionRate,
            newRate,
          })
        )
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
    select: {
      id: true, isPublished: true, slug: true, name: true, commissionRate: true, affiliatesEnabled: true,
      mpConnectedAt: true, storeConfig: true, tipoTienda: true,
      _count: { select: { products: { where: { deletedAt: null } } } },
    },
  });

  // Publicar exige un mínimo: diseño elegido, al menos un producto y alguna
  // forma de cobrar. Despublicar siempre está permitido, sin chequeos.
  if (isPublished && !prevStore?.isPublished) {
    let hasTemplate = false;
    let hasPaymentData = false;
    try {
      const cfg = JSON.parse(prevStore?.storeConfig || "{}");
      hasTemplate = !!cfg.template;
      const pi = cfg.paymentInfo;
      hasPaymentData = !!(
        (pi?.transferencia?.enabled && (pi.transferencia.cbu?.length > 0 || pi.transferencia.alias?.length > 0)) ||
        pi?.efectivo?.enabled
      );
    } catch { /* noop */ }
    const hasPayment = hasPaymentData || !!prevStore?.mpConnectedAt;
    const hasProducts = (prevStore?._count.products ?? 0) > 0;

    // En AUTOS no se cobra por la plataforma: la operación se coordina aparte, y
    // por eso la UI no le muestra métodos de pago ni MercadoPago. Exigirle un
    // método de cobro la dejaba sin poder publicarse NUNCA —no tiene por dónde
    // configurarlo— y el mensaje de error la mandaba a una pantalla que no
    // existe para ella. `tipoTienda` no se traía en el select, así que este
    // chequeo ni siquiera podía distinguirlas.
    const isAutos = prevStore?.tipoTienda === "AUTOS";

    const missing = [
      !hasTemplate && "elegir el diseño de tu tienda",
      !hasProducts && "agregar al menos un producto",
      !isAutos && !hasPayment && "configurar un método de cobro (MercadoPago, transferencia o efectivo)",
    ].filter(Boolean);
    if (missing.length > 0) {
      return NextResponse.json({ error: `Para publicar tu tienda primero tenés que ${missing.join(" y ")}.` }, { status: 400 });
    }
  }

  const store = await prisma.store.update({
    where: { ownerId: user.id },
    data: { isPublished },
  });

  revalidatePath(`/tienda/${store.slug}`, "layout");

  // Cuando se despublica, notificar a afiliados activos
  if (!isPublished && prevStore?.isPublished && prevStore?.id) {
    notifyAffiliatesStoreOffline(prevStore.id, prevStore.name).catch(console.error);
  }

  // Cuando una tienda se publica por primera vez (o se re-publica), notificar a afiliados interesados
  if (isPublished && !prevStore?.isPublished && prevStore?.affiliatesEnabled) {
    const interested = await prisma.user.findMany({
      where: { notifyNewStores: true, id: { not: user.id } },
      select: { email: true, name: true },
    });

    if (interested.length > 0) {
      for (const affiliate of interested) {
        despues(() => sendNewStorePublishedEmail({
          affiliateEmail: affiliate.email,
          affiliateName: affiliate.name || "afiliado",
          storeName: prevStore.name,
          commissionRate: prevStore.commissionRate,
        }), "tienda publicada: aviso a afiliados interesados");
      }
    }
  }

  return NextResponse.json({ isPublished: store.isPublished });
}
