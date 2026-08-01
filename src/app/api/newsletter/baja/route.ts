import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Baja del newsletter.
 *
 * Entra por dos caminos distintos, y los dos son POST:
 *
 * 1. El botón de la página `/newsletter/baja`, con `{ token }` en JSON. Es a lo
 *    que lleva el link del pie del mail.
 *
 * 2. El "Cancelar suscripción" que Gmail muestra al lado del remitente. Ese
 *    manda un POST con `List-Unsubscribe=One-Click` en un formulario, sin
 *    cookies y sin pasar por ninguna página. La URL viaja en la cabecera
 *    `List-Unsubscribe` de cada mail (ver `cabecerasBaja` en email.ts).
 *
 * Nada de esto es GET, y ahí está el punto: Gmail y los antivirus abren solos
 * los links de los mails para revisarlos. Una baja por GET se ejecutaría con
 * cada uno de esos escaneos y daríamos de baja a gente que nunca pidió irse,
 * sin que ni ella ni nosotros nos enteremos.
 */
async function leerToken(req: NextRequest): Promise<string | null> {
  const tipo = req.headers.get("content-type") ?? "";

  // Camino 2: el POST de un clic de Gmail. El token no viene en el cuerpo sino
  // en la query, porque la URL de la cabecera es la única que Gmail conoce.
  if (tipo.includes("application/x-www-form-urlencoded")) {
    return new URL(req.url).searchParams.get("t");
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.token === "string") return body.token;
  return new URL(req.url).searchParams.get("t");
}

/**
 * Algunos clientes de correo no hacen el POST de un clic: muestran la URL de
 * `List-Unsubscribe` como un link común y la abren. Si eso diera 405, la persona
 * vería un error justo cuando está tratando de irse. Se la manda a la página,
 * que tiene el botón.
 *
 * Este GET no da de baja a nadie — sólo redirige. Es lo que lo hace seguro
 * frente a los escáneres que abren links solos.
 */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("t") ?? "";
  return NextResponse.redirect(new URL(`/newsletter/baja?t=${encodeURIComponent(token)}`, req.url));
}

export async function POST(req: NextRequest) {
  const token = await leerToken(req);
  if (!token) return NextResponse.json({ error: "Falta el token" }, { status: 400 });

  const suscriptor = await prisma.newsletterSubscriber.findUnique({
    where: { token },
    select: { id: true, bajaEn: true, store: { select: { name: true } } },
  });

  // Un token que no existe se contesta OK igual. El que llega acá está
  // intentando irse: decirle "este link no sirve" lo deja sin salida y su
  // siguiente botón es el de spam, que es exactamente lo que esta ruta existe
  // para evitar. Además, responder distinto convertiría la URL en una forma de
  // adivinar tokens válidos.
  if (!suscriptor) return NextResponse.json({ ok: true });

  if (!suscriptor.bajaEn) {
    await prisma.newsletterSubscriber.update({
      where: { id: suscriptor.id },
      // Se apaga, no se borra. Si se borrara, la misma dirección podría volver a
      // entrar por el formulario —la escribe cualquiera— y le seguiríamos
      // escribiendo a alguien que ya nos dijo que no.
      data: { bajaEn: new Date(), bajaMotivo: "pedido" },
    });
  }

  return NextResponse.json({ ok: true, tienda: suscriptor.store.name });
}
