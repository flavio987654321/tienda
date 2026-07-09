import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { cotizarEnvio } from "@/lib/enviopack";
import { getClientIp } from "@/lib/request-ip";

type CotizarBody = {
  storeId: string;
  destinationPostalCode: string;
  destinationProvince: string;
  items: { productId: string; quantity: number }[];
};

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`envios-cotizar:${ip}`, 20, 60_000))) {
    return NextResponse.json({ error: "Demasiadas cotizaciones. Esperá un momento." }, { status: 429 });
  }

  const body = (await req.json()) as CotizarBody;
  const storeId = typeof body.storeId === "string" ? body.storeId : "";
  const destinationPostalCode = typeof body.destinationPostalCode === "string" ? body.destinationPostalCode.trim() : "";
  const destinationProvince = typeof body.destinationProvince === "string" ? body.destinationProvince.trim().toUpperCase() : "";
  const items = Array.isArray(body.items)
    ? body.items
        .filter((i) => typeof i.productId === "string")
        .map((i) => ({ productId: i.productId, quantity: Math.max(1, Math.floor(Number(i.quantity) || 1)) }))
    : [];

  if (!storeId || !destinationPostalCode || !destinationProvince || items.length === 0) {
    return NextResponse.json({ error: "Faltan datos para cotizar" }, { status: 400 });
  }

  const result = await cotizarEnvio({ storeId, destinationPostalCode, destinationProvince, items });
  return NextResponse.json(result);
}
