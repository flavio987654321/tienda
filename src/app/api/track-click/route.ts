import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, contarConTope } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

const MAX_UTM_SOURCE_LENGTH = 40;

/* Cuánto tiene que pasar para que la misma persona vuelva a contar como visita
   en el mismo link. Es lo que en las redes de afiliados se llama "click único".

   Hace falta porque el `affiliateId` es público a la fuerza: viaja en el link
   que la persona reparte. Cualquiera que lo tenga puede pegarle a este endpoint
   y sumarle visitas a quien quiera.

   No es plata —los niveles y los cupones salen de las comisiones, que nacen de
   una venta cobrada— pero sí son los números que el afiliado mira para decidir
   dónde publicar: si las visitas están infladas, la tasa de conversión que ve
   está deshinflada, y la pantalla le miente sobre qué le está funcionando.

   Media hora también corrige algo que ya contaba mal sin que nadie atacara
   nada: quien abre el link, vuelve atrás y entra de nuevo era dos visitas. */
const VENTANA_VISITA_UNICA_MS = 30 * 60_000;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`track-click:${ip}`, 30, 60_000))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const affiliateId = body?.affiliateId;
  if (!affiliateId || typeof affiliateId !== "string") {
    return NextResponse.json({ error: "affiliateId requerido" }, { status: 400 });
  }

  const utmSourceRaw = body?.utmSource;
  const utmSource =
    typeof utmSourceRaw === "string" && utmSourceRaw.trim()
      ? utmSourceRaw.trim().slice(0, MAX_UTM_SOURCE_LENGTH)
      : null;

  const affiliate = await prisma.affiliate.findFirst({
    where: { id: affiliateId, isActive: true, status: "APPROVED" },
    select: { id: true, storeId: true },
  });
  if (!affiliate) return NextResponse.json({ ok: false }, { status: 404 });

  /* Se contesta que salió bien igual: esto es una baliza, no un formulario. Si
     devolviera un error, el navegador de una persona real reintentaría por una
     visita que a propósito no queremos contar dos veces. */
  const { permitido: esVisitaNueva } = await contarConTope(
    `click-unico:${affiliate.id}:${ip}`,
    1,
    VENTANA_VISITA_UNICA_MS
  );
  if (!esVisitaNueva) return NextResponse.json({ ok: true, contado: false });

  await prisma.affiliateClick.create({
    data: {
      affiliateId: affiliate.id,
      storeId: affiliate.storeId,
      ip: ip === "unknown" ? null : ip,
      utmSource,
    },
  });

  return NextResponse.json({ ok: true });
}
