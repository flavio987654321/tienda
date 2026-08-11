import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { revalidatePath } from "next/cache";
import type { StorePaymentInfo, ShippingMethod } from "@/types/store-config";
import { DEFAULT_PAYMENT_INFO, DEFAULT_SHIPPING_METHODS } from "@/types/store-config";
import { PROVINCIAS_ARGENTINA } from "@/lib/provincias";
import { limpiarTextoLegal } from "@/lib/politicas-tienda";

const MAX_TEXT = 2000;

const VALID_PROVINCE_CODES = new Set(PROVINCIAS_ARGENTINA.map((p) => p.code));

function sanitizeText(v: unknown, max = MAX_TEXT): string {
  if (typeof v !== "string") return "";
  return v.slice(0, max).trim();
}

function sanitizePaymentInfo(raw: unknown): StorePaymentInfo {
  const fallback = DEFAULT_PAYMENT_INFO;
  if (!raw || typeof raw !== "object") return fallback;
  const r = raw as Record<string, unknown>;

  const t = (r.transferencia ?? {}) as Record<string, unknown>;
  const e = (r.efectivo ?? {}) as Record<string, unknown>;

  return {
    transferencia: {
      enabled: Boolean(t.enabled),
      titular: sanitizeText(t.titular, 120),
      cbu: sanitizeText(t.cbu, 22).replace(/\D/g, ""),
      cvu: sanitizeText(t.cvu, 22).replace(/\D/g, ""),
      alias: sanitizeText(t.alias, 60),
      banco: sanitizeText(t.banco, 80),
      cuil: sanitizeText(t.cuil, 20),
      instrucciones: sanitizeText(t.instrucciones, 500),
    },
    efectivo: {
      enabled: Boolean(e.enabled),
      instrucciones: sanitizeText(e.instrucciones, 500),
    },
  };
}

function sanitizeShippingMethods(raw: unknown): ShippingMethod[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_SHIPPING_METHODS;
  return raw.slice(0, 5).map((m: Record<string, unknown>, i: number) => ({
    id: typeof m.id === "string" && m.id.trim() ? m.id.trim().slice(0, 40) : `method_${i}`,
    label: typeof m.label === "string" && m.label.trim() ? m.label.trim().slice(0, 80) : "Método de envío",
    price: typeof m.price === "number" && m.price >= 0 ? Math.floor(m.price) : 0,
    coordinar: Boolean(m.coordinar),
    enabled: Boolean(m.enabled),
    isPickup: Boolean(m.isPickup),
    liveQuote: Boolean(m.liveQuote),
  }));
}

function sanitizeOriginAddress(body: Record<string, unknown>) {
  const province = sanitizeText(body.originProvince, 2).toUpperCase();
  return {
    originStreet: sanitizeText(body.originStreet, 200) || null,
    originCity: sanitizeText(body.originCity, 100) || null,
    originProvince: VALID_PROVINCE_CODES.has(province) ? province : null,
    originPostalCode: sanitizeText(body.originPostalCode, 10).replace(/[^A-Za-z0-9]/g, "") || null,
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      storeConfig: true,
      policyReturns: true,
      policyShipping: true,
      policyTerms: true,
      policyPrivacy: true,
      policyReturnsActive: true,
      policyShippingActive: true,
      policyTermsActive: true,
      policyPrivacyActive: true,
      originStreet: true,
      originCity: true,
      originProvince: true,
      originPostalCode: true,
    },
  });

  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  let paymentInfo: StorePaymentInfo = DEFAULT_PAYMENT_INFO;
  let shippingMethods: ShippingMethod[] = DEFAULT_SHIPPING_METHODS;
  let shippingConfigured = false;
  try {
    const config = JSON.parse(store.storeConfig || "{}");
    if (config.paymentInfo) paymentInfo = config.paymentInfo;
    if (Array.isArray(config.shippingMethods)) {
      shippingMethods = config.shippingMethods;
      shippingConfigured = true;
    }
  } catch { /* noop */ }

  return NextResponse.json({
    paymentInfo,
    shippingMethods,
    shippingConfigured,
    policyReturns: store.policyReturns ?? "",
    policyShipping: store.policyShipping ?? "",
    policyTerms: store.policyTerms ?? "",
    policyPrivacy: store.policyPrivacy ?? "",
    policyReturnsActive: store.policyReturnsActive,
    policyShippingActive: store.policyShippingActive,
    policyTermsActive: store.policyTermsActive,
    policyPrivacyActive: store.policyPrivacyActive,
    originStreet: store.originStreet ?? "",
    originCity: store.originCity ?? "",
    originProvince: store.originProvince ?? "",
    originPostalCode: store.originPostalCode ?? "",
  });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Sin el `catch`, un cuerpo mal formado tiraba un 500 sin manejar en vez del
  // 400 que corresponde.
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Pedido mal formado" }, { status: 400 });
  }

  const paymentInfo = sanitizePaymentInfo(body.paymentInfo);
  const shippingMethods = sanitizeShippingMethods(body.shippingMethods);
  const origin = sanitizeOriginAddress(body);
  const hasFullOrigin = !!(origin.originStreet && origin.originCity && origin.originProvince && origin.originPostalCode);
  if (shippingMethods.some((m) => m.liveQuote && m.enabled) && !hasFullOrigin) {
    return NextResponse.json(
      { error: "Completá la dirección de origen (calle, ciudad, provincia y CP) antes de activar la cotización automática" },
      { status: 400 }
    );
  }

  // `limpiarTextoLegal` y no el `sanitizeText` de acá arriba: los mismos cuatro
  // campos los escribían tres rutas con tres topes distintos (esta cortaba en
  // 2000, `/api/configuracion` no cortaba nada). El tope ahora vive en un solo
  // lugar, junto a la función que decide cuáles se publican.
  const policyReturns = limpiarTextoLegal(body.policyReturns);
  const policyShipping = limpiarTextoLegal(body.policyShipping);
  const policyTerms = limpiarTextoLegal(body.policyTerms);
  const policyPrivacy = limpiarTextoLegal(body.policyPrivacy);
  const policyReturnsActive = body.policyReturnsActive !== false;
  const policyShippingActive = body.policyShippingActive !== false;
  const policyTermsActive = body.policyTermsActive !== false;
  const policyPrivacyActive = body.policyPrivacyActive !== false;

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      storeConfig: true, slug: true,
      policyReturns: true, policyShipping: true, policyTerms: true, policyPrivacy: true,
    },
  });

  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  let config: Record<string, unknown> = {};
  try { config = JSON.parse(store.storeConfig || "{}"); } catch { /* noop */ }

  config.paymentInfo = paymentInfo;
  config.shippingMethods = shippingMethods;

  // La fecha se toca solo si cambió el TEXTO de alguna política. Esta pantalla
  // guarda también CBU, envíos y dirección de origen: si la fecha se moviera en
  // cada guardado, "Última actualización" diría que las políticas cambiaron un
  // día en que solo se corrigió un alias bancario — y ese dato existe
  // justamente para poder sostener qué decía la política y desde cuándo.
  const cambioAlgunTexto =
    (store.policyReturns ?? "") !== policyReturns ||
    (store.policyShipping ?? "") !== policyShipping ||
    (store.policyTerms ?? "") !== policyTerms ||
    (store.policyPrivacy ?? "") !== policyPrivacy;

  await prisma.store.update({
    where: { ownerId: user.id },
    data: {
      storeConfig: JSON.stringify(config),
      policyReturns: policyReturns || null,
      policyShipping: policyShipping || null,
      policyTerms: policyTerms || null,
      policyPrivacy: policyPrivacy || null,
      policyReturnsActive,
      policyShippingActive,
      policyTermsActive,
      policyPrivacyActive,
      ...(cambioAlgunTexto ? { policiesUpdatedAt: new Date() } : {}),
      ...origin,
    },
  });

  revalidatePath(`/tienda/${store.slug}`, "layout");

  return NextResponse.json({ ok: true });
}
