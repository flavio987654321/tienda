import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimitConRespaldo } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendNewsletterConfirmacionEmail } from "@/lib/email";
import { normalizarEmail, nuevoToken, urlConfirmar, urlBaja, urlBajaUnClic } from "@/lib/newsletter";

/**
 * Alta en el newsletter de una tienda, desde el bloque de suscripción del
 * storefront. Público: no hay sesión ni la va a haber — el que se suscribe es un
 * visitante suelto.
 *
 * Todo lo que entra queda SIN CONFIRMAR y no recibe nada hasta que toque el link
 * del mail. Ver el comentario de `confirmed` en el schema.
 */

/** Mismo techo que las reseñas públicas: 3 por IP cada 10 minutos. */
const LIMITE = 3;
const VENTANA_MS = 10 * 60_000;

/**
 * Una sola respuesta para todos los finales buenos, y para varios de los malos.
 *
 * Si contestáramos "ese mail ya está suscripto" contra "te mandamos el mail",
 * el formulario quedaría convertido en un buscador: cualquiera podría ir
 * probando direcciones para averiguar quién compra en esta tienda. El que se
 * suscribe de verdad no pierde nada — recibe el mail igual.
 */
const RESPUESTA_OK = { ok: true, mensaje: "Te mandamos un mail para confirmar tu suscripción." };

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  // Con respaldo, y no el limitador pelado: si Redis no contesta, el pelado tira
  // y el endpoint devuelve 500. Este cae a contadores en memoria y sigue
  // acotado. Importa acá más que en otros lados porque cada alta que pasa manda
  // un mail — un endpoint sin techo es un endpoint que quema el dominio de
  // envío que comparten todas las tiendas.
  const { permitido } = await checkRateLimitConRespaldo(`newsletter:${ip}`, LIMITE, VENTANA_MS, {
    limiteFallback: LIMITE,
    limiteFallbackGlobal: 100,
  });
  if (!permitido) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá un momento." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { slug, email: emailCrudo, website, turnstileToken } = body as Record<string, unknown>;

  // Honeypot: mismo trato que en reseñas. Al bot se le contesta que salió bien,
  // para que no aprenda cuál es el campo que lo delata.
  if (website) return NextResponse.json(RESPUESTA_OK, { status: 201 });

  if (typeof slug !== "string" || !slug.trim()) {
    return NextResponse.json({ error: "Tienda inválida" }, { status: 400 });
  }

  const email = normalizarEmail(emailCrudo);
  // El formato SÍ se contesta distinto: no revela nada (el que escribe sabe qué
  // escribió) y si no, alguien con un error de tipeo se queda esperando para
  // siempre un mail que nunca pedimos.
  if (!email) {
    return NextResponse.json({ error: "Revisá el correo, no parece válido." }, { status: 400 });
  }

  // Captcha DESPUÉS de validar los campos, igual que en reseñas: el token es de
  // un solo uso, así que un error de tipeo no puede gastarlo — si lo consumiera,
  // el segundo intento fallaría por un motivo distinto del que ve la persona.
  //
  // Es lo que frena el ataque que ni el honeypot ni el límite por IP ven: cargar
  // miles de direcciones ajenas para que a cada una le llegue un mail nuestro.
  // `verifyTurnstile` es fail-open a propósito (si Cloudflare no contesta, deja
  // pasar) — el piso sigue siendo el rate limit, el honeypot y el doble opt-in.
  if (!(await verifyTurnstile(turnstileToken, ip, "newsletter"))) {
    return NextResponse.json(
      { error: "No pudimos verificar que sos una persona. Probá de nuevo." },
      { status: 400 }
    );
  }

  const store = await prisma.store.findUnique({
    where: { slug: slug.trim() },
    select: { id: true, name: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const existente = await prisma.newsletterSubscriber.findUnique({
    where: { storeId_email: { storeId: store.id, email } },
    select: { id: true, confirmed: true, bajaEn: true, token: true },
  });

  // Ya está adentro y confirmado: no se le manda nada. Reenviarle la
  // confirmación a alguien que ya está suscripto sería mandarle un mail que no
  // pidió cada vez que un tercero escriba su dirección en el formulario.
  if (existente?.confirmed && !existente.bajaEn) {
    return NextResponse.json(RESPUESTA_OK, { status: 200 });
  }

  // Se dio de baja antes. Volver a suscribirse es legítimo —es su dirección y
  // la está escribiendo de nuevo— pero vuelve a entrar SIN confirmar: si no fue
  // ella la que la escribió, el alta no prospera.
  //
  // El token se renueva siempre. El viejo viajó en mails que ya se mandaron, y
  // dejarlo vivo permitiría confirmar un alta nueva con un link viejo.
  const token = nuevoToken();

  const suscriptor = existente
    ? await prisma.newsletterSubscriber.update({
        where: { id: existente.id },
        data: { token, confirmed: false, confirmedAt: null, bajaEn: null, bajaMotivo: null, ip },
        select: { token: true },
      })
    : await prisma.newsletterSubscriber.create({
        data: { storeId: store.id, email, token, ip },
        select: { token: true },
      });

  // El mail no bloquea la respuesta: el alta ya quedó guardada, y si Resend
  // tarda o falla el visitante no tiene por qué esperarlo. Si no sale, la fila
  // queda sin confirmar y no recibe nada — que es el estado seguro.
  sendNewsletterConfirmacionEmail({
    to: email,
    storeName: store.name,
    confirmarUrl: urlConfirmar(suscriptor.token),
    bajaUrl: urlBaja(suscriptor.token),
    bajaPostUrl: urlBajaUnClic(suscriptor.token),
  }).catch((e) => console.error("[newsletter] confirmación:", e));

  return NextResponse.json(RESPUESTA_OK, { status: 201 });
}
