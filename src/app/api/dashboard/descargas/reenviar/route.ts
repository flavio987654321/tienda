import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendDigitalDownloadEmail } from "@/lib/email";

/**
 * Reenviar el mail con el link de descarga. Lo aprieta la dueña desde el panel.
 *
 * ── Por qué vive acá y no al lado de la ruta pública ──────────────────────────
 * La descarga de verdad es `/api/descargas/[token]`, que es pública y sin
 * sesión. Ésta es lo contrario: sólo para la dueña, con sesión. Colgarla del
 * mismo camino la dejaría de vecina de un segmento dinámico —dos rutas que se
 * leen igual y se autorizan al revés— así que va con el resto de lo del panel.
 *
 * ── Qué NO hace ──────────────────────────────────────────────────────────────
 * No genera un token nuevo ni corre el vencimiento ni devuelve descargas. Manda
 * de nuevo el MISMO permiso. Si esto emitiera uno nuevo, el botón sería una
 * máquina de regalar descargas: cinco por clic, y encima dejaría vivos los
 * links viejos.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true },
  });
  if (!store) return NextResponse.json({ error: "No encontramos tu tienda" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id || id.length > 60) return NextResponse.json({ error: "Falta el id" }, { status: 400 });

  /* Dos topes, y son por cosas distintas.

     El de la tienda es para no convertir el panel en un cañón de mails: quien
     entre a una cuenta ajena no puede usarla para mandar cientos.

     El del permiso es por la persona del otro lado. Sin él, veinte clics
     nerviosos son veinte mails al mismo buzón, y el que queda mal parado es el
     comercio. Tres por hora alcanzan de sobra para "no le llegó, probemos de
     nuevo". */
  if (!(await checkRateLimit(`reenviar-descarga:tienda:${store.id}`, 20, 60 * 60_000))) {
    return NextResponse.json(
      { error: "Reenviaste muchos links seguidos. Probá de nuevo en un rato." },
      { status: 429 }
    );
  }
  if (!(await checkRateLimit(`reenviar-descarga:permiso:${id}`, 3, 60 * 60_000))) {
    return NextResponse.json(
      { error: "Ya se lo reenviaste varias veces. Esperá un rato antes de insistir." },
      { status: 429 }
    );
  }

  /* La condición de dueña va DENTRO del where, no en un `if` después de leer.
     Buscar por id y comparar la tienda a mano es la forma de olvidarse de
     compararla: acá, si la entrega es de otra tienda, no aparece y punto. */
  const permiso = await prisma.digitalDownload.findFirst({
    where: { id, orderItem: { order: { storeId: store.id } } },
    select: {
      token: true,
      expiresAt: true,
      maxDescargas: true,
      orderItem: {
        select: {
          product: { select: { name: true } },
          order: { select: { buyer: { select: { name: true, email: true } } } },
        },
      },
    },
  });
  if (!permiso) return NextResponse.json({ error: "No encontramos esa entrega" }, { status: 404 });

  /* Un permiso vencido no se reenvía: el mail llevaría el mismo link, que sigue
     vencido, y la compradora haría el viaje al 404 para nada. El botón ya está
     apagado en pantalla — esto es para quien llegue por otro lado. */
  if (permiso.expiresAt <= new Date()) {
    return NextResponse.json(
      { error: "Ese link ya venció y reenviarlo no lo revive." },
      { status: 400 }
    );
  }

  /* Sin el servicio de mails configurado, `sendDigitalDownloadEmail` se vuelve
     sin hacer nada. Si no se chequeara, el panel diría "Mail enviado" y no se
     habría mandado ninguno — mentirle a la dueña sobre esto es peor que el
     error, porque se queda tranquila y la compradora sigue esperando. */
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "El envío de mails no está configurado en este entorno." },
      { status: 503 }
    );
  }

  const comprador = permiso.orderItem.order.buyer;

  try {
    await sendDigitalDownloadEmail({
      buyerEmail: comprador.email,
      buyerName: comprador.name ?? "",
      storeName: store.name ?? "",
      // El nombre que ve quien compró es el del PRODUCTO, no el del archivo: el
      // archivo puede llamarse "final_v3_ESTE.pdf" y eso no es lo que compró.
      archivos: [{ nombre: permiso.orderItem.product.name, token: permiso.token }],
      // La fecha REAL del permiso, no una recalculada. Si el mail dijera una
      // fecha y el link caducara en otra, la que queda mal es la tienda.
      venceEl: permiso.expiresAt,
      maxDescargas: permiso.maxDescargas,
    });
  } catch (err) {
    console.error("[descargas] no se pudo reenviar el link", id, err);
    return NextResponse.json({ error: "No se pudo enviar el mail" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
