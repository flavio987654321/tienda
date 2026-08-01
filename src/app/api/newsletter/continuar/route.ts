import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { enviarCampanaPorMail } from "@/lib/newsletter";

/**
 * Retoma el envío por mail de una campaña que quedó a mitad de camino.
 *
 * Existe por el plan gratuito de Vercel: la función se corta a los pocos
 * segundos, así que una lista grande no entra en un solo pedido. `enviarCampanaPorMail`
 * para sola antes del corte y deja la campaña en ENVIANDO con el cursor puesto;
 * esta ruta la sigue desde ahí.
 *
 * Es el mismo trabajo que haría un cron. Cuando el proyecto pase a un plan con
 * crons frecuentes, el cron llama exactamente a esto y el botón del panel se
 * vuelve opcional. Por eso el reintento vive acá y no adentro del envío: lo
 * único que cambia es quién lo dispara.
 *
 * Y lo importante: retomar NO reenvía. El cursor marca al último que recibió, y
 * la próxima tanda arranca del siguiente. Sin eso, cada reintento le volvería a
 * escribir a toda la gente que ya había recibido la campaña.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { campaignId } = await req.json().catch(() => ({}));
  if (typeof campaignId !== "string" || !campaignId) {
    return NextResponse.json({ error: "Falta campaignId" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      id: true, slug: true, name: true, logo: true, accentColor: true,
      owner: { select: { email: true } },
    },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  // El `storeId` va en el where y no se chequea después: así un dueño no puede
  // hacer avanzar la campaña de otra tienda pasando un id que encontró.
  // `deletedAt: null`: si el dueño la borró del historial, no se le siguen
  // mandando mails a nadie. Borrarla es la única forma que tiene de frenar un
  // envío que quedó a medias.
  const campaign = await prisma.pushCampaign.findFirst({
    where: { id: campaignId, storeId: store.id, deletedAt: null },
    select: { id: true, title: true, body: true, url: true, emailStatus: true },
  });
  if (!campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });

  if (campaign.emailStatus === "LISTO" || campaign.emailStatus === "SIN_MAIL") {
    return NextResponse.json({ ok: true, enviados: 0, falta: false });
  }

  const { enviados, falta } = await enviarCampanaPorMail(store.id, campaign.id, {
    storeName: store.name,
    storeUrl: campaign.url ?? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/tienda/${store.slug}`,
    logo: store.logo,
    accent: store.accentColor,
    title: campaign.title,
    body: campaign.body,
    ownerEmail: store.owner?.email ?? null,
  });

  return NextResponse.json({ ok: true, enviados, falta });
}
