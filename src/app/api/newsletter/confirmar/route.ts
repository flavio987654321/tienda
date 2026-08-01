import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Confirma una suscripción (el segundo paso del doble opt-in).
 *
 * Es POST y no GET a propósito, aunque el link del mail sea un link. Gmail, los
 * antivirus corporativos y los escáneres de seguridad ABREN los links de los
 * mails por su cuenta para ver si son peligrosos. Con un GET que confirma,
 * cualquiera de esos robots confirmaría la suscripción sin que la persona haya
 * tocado nada — y el doble opt-in dejaría de probar lo único que nos interesa
 * que pruebe: que esta persona QUIERE recibir los mails.
 *
 * Por eso el link del mail abre una página con un botón, y el botón hace este
 * POST. Es el mismo camino que usa Mailchimp.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : null;
  if (!token) return NextResponse.json({ error: "Falta el token" }, { status: 400 });

  const suscriptor = await prisma.newsletterSubscriber.findUnique({
    where: { token },
    select: { id: true, confirmed: true, store: { select: { name: true } } },
  });
  if (!suscriptor) {
    return NextResponse.json({ error: "Este link no es válido o ya no existe." }, { status: 404 });
  }

  // Confirmar dos veces no es un error: es alguien que tocó el botón, volvió
  // atrás y lo tocó de nuevo. Se responde igual y no se pisa `confirmedAt`, que
  // es la fecha en que dijo que sí de verdad.
  if (!suscriptor.confirmed) {
    await prisma.newsletterSubscriber.update({
      where: { id: suscriptor.id },
      // `bajaEn: null` porque confirmar es lo contrario de estar dado de baja:
      // si alguien se dio de baja y después confirma con un link viejo, lo que
      // vale es el último gesto suyo.
      data: { confirmed: true, confirmedAt: new Date(), bajaEn: null, bajaMotivo: null },
    });
  }

  return NextResponse.json({ ok: true, tienda: suscriptor.store.name });
}
