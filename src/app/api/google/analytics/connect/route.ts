import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { listAccountSummaries, listDataStreams, createProperty, createWebDataStream, getValidAccessToken } from "@/lib/googleAnalytics";
import { SITE_URL } from "@/lib/site";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL;

// POST /api/google/analytics/connect  { accountId }
// Conecta la cuenta de Google Analytics elegida: reusa la primera propiedad
// existente o crea una nueva, y siempre crea un data stream web nuevo (son
// livianos, Google permite varios por propiedad) para conseguir el measurementId.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { accountId } = await req.json().catch(() => ({}));
  if (!accountId || typeof accountId !== "string") {
    return NextResponse.json({ error: "accountId requerido" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true, slug: true, gaRefreshToken: true, storeConfig: true },
  });
  if (!store?.gaRefreshToken) {
    return NextResponse.json({ error: "Google no está conectado" }, { status: 400 });
  }

  try {
    const accessToken = await getValidAccessToken(store.gaRefreshToken);

    const { accountSummaries } = await listAccountSummaries(accessToken);
    const account = accountSummaries?.find((a) => a.account === accountId);
    const existingProperty = account?.propertySummaries?.[0]?.property;

    const propertyId = existingProperty ?? (await createProperty(accessToken, accountId, `${store.name}`)).name;

    // Reusar el stream web existente (y su measurementId) si la propiedad ya
    // tiene uno — así reconectar es idempotente y no se acumulan streams ni
    // se choca contra el límite de streams por propiedad. Solo se crea uno
    // nuevo si la propiedad todavía no tiene ningún stream web.
    const { dataStreams } = await listDataStreams(accessToken, propertyId);
    const existingMeasurementId = dataStreams
      ?.find((s) => s.type === "WEB_DATA_STREAM" && s.webStreamData?.measurementId)
      ?.webStreamData?.measurementId;

    let measurementId = existingMeasurementId;
    if (!measurementId) {
      const storeUrl = `${APP_URL}/tienda/${store.slug}`;
      const stream = await createWebDataStream(accessToken, propertyId, storeUrl, `${store.name} — Web`);
      measurementId = stream.webStreamData?.measurementId;
    }
    if (!measurementId) throw new Error("Google no devolvió un measurementId");

    let config: Record<string, unknown> = {};
    try { config = JSON.parse(store.storeConfig || "{}"); } catch { /* config inválido, se trata como vacío */ }
    const analytics = { ...(config.analytics as Record<string, unknown> | undefined), googleAnalyticsId: measurementId };

    await prisma.store.update({
      where: { id: store.id },
      data: {
        gaAccountId: accountId,
        gaPropertyId: propertyId,
        storeConfig: JSON.stringify({ ...config, analytics }),
      },
    });

    return NextResponse.json({ ok: true, measurementId });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("Google Analytics /connect error:", detail);
    // Se devuelve el detalle real de Google para poder diagnosticar (p. ej.
    // una cuenta que no admite crear propiedades, o un permiso faltante).
    return NextResponse.json({ error: "No se pudo conectar Google Analytics", detail }, { status: 502 });
  }
}
