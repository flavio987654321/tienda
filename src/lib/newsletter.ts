import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendNewsletterCampanaEmail, type CampanaNewsletter } from "@/lib/email";
import { siteUrl } from "@/lib/site";

/* ── Direcciones ────────────────────────────────────────────────────────────*/

/** Tope de la mayoría de los proveedores para la parte local + dominio. */
export const EMAIL_MAX = 254;

/**
 * Validación deliberadamente simple: hay algo, un `@`, algo, un punto, algo.
 *
 * No intenta ser el RFC 5322 — esa expresión es monstruosa y sigue aceptando
 * direcciones que no existen. Lo que decide de verdad si el mail es real es el
 * doble opt-in: si no llega, no se confirma, y no entra a la lista. Acá sólo se
 * frenan los errores de tipeo obvios.
 */
const FORMA_EMAIL = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

/**
 * Deja la dirección en su forma canónica para poder compararla.
 *
 * Minúsculas y sin espacios alrededor. Sin esto, el `@@unique([storeId, email])`
 * de la tabla dejaría entrar "Ana@Gmail.com" y "ana@gmail.com" como dos
 * suscriptores, y esa persona recibiría cada campaña por duplicado.
 *
 * No se tocan los puntos ni el `+` de Gmail: son parte de la dirección para
 * cualquier otro proveedor, y "normalizarlos" sería decidir por el usuario que
 * dos casillas distintas son la misma.
 */
export function normalizarEmail(crudo: unknown): string | null {
  if (typeof crudo !== "string") return null;
  const email = crudo.trim().toLowerCase();
  if (email.length === 0 || email.length > EMAIL_MAX) return null;
  return FORMA_EMAIL.test(email) ? email : null;
}

/**
 * Token de confirmación y de baja.
 *
 * 32 bytes al azar, no un cuid: el cuid es adivinable a partir de otro cuid
 * cercano en el tiempo, y con este token cualquiera podría dar de baja a alguien
 * o confirmar una suscripción que la persona nunca pidió.
 */
export function nuevoToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * La base de los links que viajan en los mails.
 *
 * En producción es SIEMPRE el dominio del sitio, escrito a mano. Y no sale del
 * `Host` del pedido, que sería lo cómodo: esa cabecera la controla quien manda
 * el pedido. Alguien podría dar de alta la dirección de otra persona con un
 * `Host` propio, y a esa persona le llegaría un mail nuestro con un link al
 * sitio del atacante — que se queda con el token y confirma la suscripción. Es
 * la misma familia de agujero que los links de recuperar contraseña.
 *
 * En desarrollo cae a `NEXT_PUBLIC_APP_URL` (localhost). Es seguro porque el
 * corte lo hace `NODE_ENV`, que fija el build y no viaja en ningún pedido: en
 * producción esta rama no existe. Sin esto, cada prueba local terminaba
 * clickeando un link a producción y viendo un 404.
 */
function baseMails(): string {
  if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  return siteUrl();
}

export const urlConfirmar = (token: string) => `${baseMails()}/newsletter/confirmar?t=${token}`;

/** La que ve una PERSONA: página con un botón que confirma la baja. */
export const urlBaja = (token: string) => `${baseMails()}/newsletter/baja?t=${token}`;

/**
 * La que usa GMAIL para el "Cancelar suscripción" de un clic (RFC 8058).
 *
 * Tiene que ser distinta de la de arriba: el cliente de correo manda un POST
 * directo, y una página de Next no acepta POST. Va al endpoint, que sí.
 */
export const urlBajaUnClic = (token: string) => `${baseMails()}/api/newsletter/baja?t=${token}`;

/* ── Envío de una campaña ───────────────────────────────────────────────────*/

/** Cuántos mails salen a la vez. */
const CONCURRENCIA = 8;

/**
 * Cuánto tiempo como mucho se queda enviando dentro de un pedido HTTP.
 *
 * En plan gratuito de Vercel la función se corta a los pocos segundos y el dueño
 * ve un error aunque medio envío haya salido bien. Antes de llegar a ese corte
 * paramos por las nuestras, dejamos la campaña en ENVIANDO con el cursor donde
 * quedó, y contestamos bien. Lo que falta se retoma después.
 */
const PRESUPUESTO_MS = 8_000;

export type ResultadoEnvio = {
  enviados: number;
  /** true si quedó gente sin recibir y hay que volver a pasar. */
  falta: boolean;
};

/**
 * Le manda `campana` a los suscriptores confirmados de la tienda, retomando
 * desde el cursor de la campaña.
 *
 * Las dos propiedades que sostienen todo esto:
 *
 * 1. El recorrido es SIEMPRE por `(createdAt, id)` ascendente. Sin un orden
 *    total y estable, "seguir desde el último" no significa nada: dos pasadas
 *    podrían traer las filas en distinto orden y saltear gente o repetirla.
 *    `createdAt` solo no alcanza —dos altas del mismo milisegundo empatan— y por
 *    eso el `id` desempata.
 *
 * 2. El cursor se guarda DESPUÉS de cada tanda. Si la función se muere en el
 *    medio, lo peor que pasa es que la última tanda (8 mails) se repita. Si se
 *    guardara antes, un corte dejaría a esa gente sin recibir nada y sin forma
 *    de saberlo.
 */
export async function enviarCampanaPorMail(
  storeId: string,
  campaignId: string,
  campana: CampanaNewsletter
): Promise<ResultadoEnvio> {
  const arranque = Date.now();
  let enviados = 0;

  const campaign = await prisma.pushCampaign.findUnique({
    where: { id: campaignId },
    select: { emailCursor: true },
  });
  let cursorId = campaign?.emailCursor ?? null;

  // El cursor guarda un id, pero el orden es por (createdAt, id): para seguir
  // desde ahí hace falta también la fecha de esa fila.
  let cursorFecha: Date | null = null;
  if (cursorId) {
    const previo = await prisma.newsletterSubscriber.findUnique({
      where: { id: cursorId },
      select: { createdAt: true },
    });
    // Si el suscriptor del cursor ya no existe (el dueño lo borró de la lista
    // entre dos pasadas), nos quedamos sin ancla. Arrancar de cero repetiría la
    // campaña a todos los que ya la recibieron, porque el orden es por fecha de
    // alta y los que ya recibieron son justamente los más viejos. Entre repetir
    // y cortar, se corta: un mail de menos molesta a uno, uno de más nos cuesta
    // una denuncia de spam que pagan todas las tiendas.
    if (!previo) {
      await prisma.pushCampaign.update({
        where: { id: campaignId },
        data: { emailStatus: "LISTO" },
      });
      return { enviados: 0, falta: false };
    }
    cursorFecha = previo.createdAt;
  }

  for (;;) {
    const lote = await prisma.newsletterSubscriber.findMany({
      where: {
        storeId,
        confirmed: true,
        bajaEn: null,
        ...(cursorFecha && cursorId
          ? {
              OR: [
                { createdAt: { gt: cursorFecha } },
                { createdAt: cursorFecha, id: { gt: cursorId } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: CONCURRENCIA,
      select: { id: true, email: true, token: true, createdAt: true },
    });

    if (lote.length === 0) {
      await prisma.pushCampaign.update({
        where: { id: campaignId },
        data: { emailStatus: "LISTO" },
      });
      return { enviados, falta: false };
    }

    // Un mail que rebota no puede frenar a los otros siete: `allSettled`, y el
    // que falla se registra y se sigue. Reintentarlo acá sería gastar el
    // presupuesto de tiempo en la dirección que menos chance tiene de andar.
    const salidas = await Promise.allSettled(
      lote.map((s) =>
        sendNewsletterCampanaEmail({
          to: s.email,
          bajaUrl: urlBaja(s.token),
          bajaPostUrl: urlBajaUnClic(s.token),
          campana,
        })
      )
    );
    for (const r of salidas) {
      if (r.status === "fulfilled") enviados++;
      else console.error("[newsletter] envío fallido:", r.reason);
    }

    const ultimo = lote[lote.length - 1];
    cursorId = ultimo.id;
    cursorFecha = ultimo.createdAt;

    // `increment` y no un número calculado acá: si dos pasadas de la misma
    // campaña se solaparan, una escritura absoluta pisaría lo que contó la otra.
    await prisma.pushCampaign.update({
      where: { id: campaignId },
      data: {
        emailCursor: cursorId,
        emailStatus: "ENVIANDO",
        sentEmail: { increment: salidas.filter((r) => r.status === "fulfilled").length },
      },
    });

    // Una tanda más chica que el tope significa que no quedaba nadie más: se
    // cierra acá en vez de dar otra vuelta.
    //
    // Sin esto, la última tanda dejaba la campaña en ENVIANDO si justo se
    // acababa el presupuesto, y el dueño veía un botón de "continuar envío" que
    // no tenía nada que enviar.
    if (lote.length < CONCURRENCIA) {
      await prisma.pushCampaign.update({
        where: { id: campaignId },
        data: { emailStatus: "LISTO" },
      });
      return { enviados, falta: false };
    }

    // Se corta ANTES de empezar otra tanda, no en el medio de una: así el cursor
    // siempre queda apuntando a una tanda entera y terminada.
    if (Date.now() - arranque > PRESUPUESTO_MS) {
      return { enviados, falta: true };
    }
  }
}

/** Cuántos van a recibir la campaña por mail, para avisarle al dueño antes. */
export function contarSuscriptores(storeId: string) {
  return prisma.newsletterSubscriber.count({
    where: { storeId, confirmed: true, bajaEn: null },
  });
}
