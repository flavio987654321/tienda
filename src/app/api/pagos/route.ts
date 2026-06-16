import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { revalidatePath } from "next/cache";
import type { StorePaymentInfo, ShippingMethod } from "@/types/store-config";
import { DEFAULT_PAYMENT_INFO, DEFAULT_SHIPPING_METHODS } from "@/types/store-config";

const MAX_TEXT = 2000;

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
  }));
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
      policyReturnsActive: true,
      policyShippingActive: true,
      policyTermsActive: true,
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
    policyReturnsActive: store.policyReturnsActive,
    policyShippingActive: store.policyShippingActive,
    policyTermsActive: store.policyTermsActive,
  });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();

  const paymentInfo = sanitizePaymentInfo(body.paymentInfo);
  const shippingMethods = sanitizeShippingMethods(body.shippingMethods);

  const policyReturns = sanitizeText(body.policyReturns);
  const policyShipping = sanitizeText(body.policyShipping);
  const policyTerms = sanitizeText(body.policyTerms);
  const policyReturnsActive = body.policyReturnsActive !== false;
  const policyShippingActive = body.policyShippingActive !== false;
  const policyTermsActive = body.policyTermsActive !== false;

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { storeConfig: true, slug: true },
  });

  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  let config: Record<string, unknown> = {};
  try { config = JSON.parse(store.storeConfig || "{}"); } catch { /* noop */ }

  config.paymentInfo = paymentInfo;
  config.shippingMethods = shippingMethods;

  await prisma.store.update({
    where: { ownerId: user.id },
    data: {
      storeConfig: JSON.stringify(config),
      policyReturns: policyReturns || null,
      policyShipping: policyShipping || null,
      policyTerms: policyTerms || null,
      policyReturnsActive,
      policyShippingActive,
      policyTermsActive,
    },
  });

  revalidatePath(`/tienda/${store.slug}`, "layout");

  return NextResponse.json({ ok: true });
}
