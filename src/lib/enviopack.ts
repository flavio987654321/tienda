import { prisma } from "@/lib/prisma";

const ENVIOPACK_BASE_URL = "https://api.enviopack.com";

export type CotizarEnvioInput = {
  storeId: string;
  destinationPostalCode: string;
  destinationProvince: string;
  items: { productId: string; quantity: number }[];
};

export type CotizarEnvioResult =
  | { available: false; reason: string }
  | { available: true; domicilio: number | null; sucursal: number | null };

// Token cacheado en memoria del proceso serverless — se reusa entre llamadas
// mientras esté vigente (dura 4hs), evitando pedir uno nuevo en cada cotización.
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.accessToken;

  const apiKey = process.env.ENVIOPACK_API_KEY;
  const secretKey = process.env.ENVIOPACK_SECRET_KEY;
  if (!apiKey || !secretKey) return null;

  const res = await fetch(`${ENVIOPACK_BASE_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ "api-key": apiKey, "secret-key": secretKey }),
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data?.access_token) return null;

  // Margen de seguridad de 10 minutos antes del vencimiento real (4hs).
  cachedToken = { accessToken: data.access_token, expiresAt: Date.now() + (4 * 60 - 10) * 60_000 };
  return cachedToken.accessToken;
}

// Cotización en vivo vía Envíopack (cuenta única de la plataforma, agrega
// Correo Argentino / OCA / Andreani / etc. bajo una sola API). Si falta algún
// requisito (credenciales, dirección de origen de la tienda, o la cotización
// falla) responde `available: false` para que el checkout caiga a "a
// coordinar" sin romper la venta.
export async function cotizarEnvio(input: CotizarEnvioInput): Promise<CotizarEnvioResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { available: false, reason: "enviopack_not_configured" };
  }

  const store = await prisma.store.findUnique({
    where: { id: input.storeId },
    select: { originStreet: true, originCity: true, originProvince: true, originPostalCode: true },
  });
  if (!store?.originStreet || !store.originCity || !store.originProvince || !store.originPostalCode) {
    return { available: false, reason: "store_missing_origin_address" };
  }

  const destination = input.destinationPostalCode.trim();
  const province = input.destinationProvince.trim().toUpperCase();
  if (!destination || !province) {
    return { available: false, reason: "missing_destination" };
  }

  // Peso total del carrito en kg (con respaldo de 1kg por unidad si al
  // producto le falta ese dato opcional).
  const products = await prisma.product.findMany({
    where: { id: { in: input.items.map((i) => i.productId) } },
    select: { id: true, weightKg: true },
  });
  const weightMap = new Map(products.map((p) => [p.id, p.weightKg]));
  const totalWeightKg = input.items.reduce((sum, item) => {
    const weight = weightMap.get(item.productId) ?? 1;
    return sum + weight * item.quantity;
  }, 0);

  try {
    const params = new URLSearchParams({
      provincia: province,
      codigo_postal: destination,
      peso: String(Math.max(0.1, totalWeightKg)),
      access_token: accessToken,
    });
    const res = await fetch(`${ENVIOPACK_BASE_URL}/cotizar/precio/a-domicilio?${params.toString()}`);
    if (!res.ok) return { available: false, reason: "enviopack_quote_failed" };

    const data = await res.json();
    const options: { valor?: number }[] = Array.isArray(data) ? data : [];
    const domicilio = options.length > 0
      ? Math.min(...options.map((o) => Number(o.valor)).filter((v) => !isNaN(v)))
      : null;

    // Cotización "a sucursal" requiere el ID de localidad (no el código
    // postal), que todavía no resolvemos — queda como pendiente, el checkout
    // ya maneja bien que sucursal sea null cayendo a "a coordinar" para esa opción.
    return { available: true, domicilio: domicilio ?? null, sucursal: null };
  } catch {
    return { available: false, reason: "enviopack_quote_error" };
  }
}
