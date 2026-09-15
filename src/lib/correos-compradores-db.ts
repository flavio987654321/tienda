import { prisma } from "@/lib/prisma";
import { sendCorreoACompradoresEmail } from "@/lib/resend";
import { siteUrl } from "@/lib/site";
import { destinatarios, saludo, urlBajaCorreo, urlBajaCorreoUnClic, type Comprador } from "@/lib/correos-compradores";
import { tokenDeBaja } from "@/lib/correos-compradores-firma";

/**
 * El mail a compradores contra la base: quiénes lo reciben y mandarlo.
 *
 * ⚠️ El `storeId` llega ya verificado como de quien pide: acá no hay puerta.
 * Las rutas la ponen.
 */

/** Cuántos mails salen a la vez. */
const CONCURRENCIA = 8;
/** Cuántos compradores se leen por vuelta. Más que la tanda: algunos son bajas. */
const PAGINA = 32;
/**
 * Techo de la lectura que CUENTA (no la que manda, que va paginada). Son las
 * órdenes cobradas de una sola cuenta; con más que esto el número de la
 * pantalla queda corto, y el envío igual llega a todos.
 */
const TECHO_DE_ORDENES = 20_000;
/**
 * Cuánto se queda mandando dentro de un pedido. Vercel corta la función a
 * los pocos segundos; antes de eso se para, se guarda el cursor y se contesta
 * bien. Lo que falta lo retoma el botón "Seguir mandando". Es el mismo
 * esquema que el newsletter de tiendas, que ya lo sufrió.
 */
const PRESUPUESTO_MS = 8_000;

/**
 * Una página de compradores confirmados de un principal (o de la cuenta),
 * ordenados por correo y desde después del cursor. Sólo COBRADAS: una
 * cancelada o devuelta no es una clienta, y una pendiente todavía no.
 *
 * Uno por comprador (`distinct`) y ordenado por SU correo en la base, que
 * es lo que hace que el cursor sirva: la ruta de compra guarda el correo en
 * minúsculas, así que el orden de Postgres y el de `destinatarios` coinciden.
 * Igual `destinatarios` vuelve a limpiar: acá es crudo.
 */
export async function compradoresDe(storeId: string, productId: string | null, despuesDe: string | null = null, take = PAGINA): Promise<Comprador[]> {
  const filas = await prisma.order.findMany({
    where: {
      storeId,
      status: "CONFIRMED",
      ...(productId ? { items: { some: { productId } } } : {}),
      ...(despuesDe ? { buyer: { email: { gt: despuesDe } } } : {}),
    },
    distinct: ["buyerId"],
    orderBy: { buyer: { email: "asc" } },
    take,
    select: { buyer: { select: { email: true, name: true } } },
  });
  return filas.map((f) => ({ email: f.buyer.email, nombre: f.buyer.name }));
}

export async function bajasDe(storeId: string): Promise<string[]> {
  const filas = await prisma.bajaCorreoDigital.findMany({ where: { storeId }, select: { email: true } });
  return filas.map((f) => f.email);
}

/**
 * Cuántos recibirían un mail hoy: de toda la cuenta y de cada principal. Es
 * lo que la pantalla muestra al lado de cada opción, para que la vendedora
 * sepa a cuánta gente le escribe ANTES de apretar.
 */
export async function cuantosRecibirian(storeId: string, productIds: string[]): Promise<{ todos: number; porProducto: Record<string, number> }> {
  const [filas, bajas] = await Promise.all([
    prisma.order.findMany({
      where: { storeId, status: "CONFIRMED" },
      select: { buyer: { select: { email: true } }, items: { select: { productId: true } } },
      take: TECHO_DE_ORDENES,
    }),
    bajasDe(storeId),
  ]);
  const todos = destinatarios(filas.map((f) => ({ email: f.buyer.email, nombre: null })), bajas).length;
  const porProducto: Record<string, number> = {};
  for (const id of productIds) {
    const suyas = filas.filter((f) => f.items.some((i) => i.productId === id));
    porProducto[id] = destinatarios(suyas.map((f) => ({ email: f.buyer.email, nombre: null })), bajas).length;
  }
  return { todos, porProducto };
}

/**
 * La base de los links del mail. En producción el sitio, escrito a mano; en
 * desarrollo el localhost de `NEXT_PUBLIC_APP_URL`. Nunca el `Host` de un
 * pedido: ése lo escribe quien manda el pedido.
 */
export function baseDeLosMails(): string {
  if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  return siteUrl();
}

export type ResultadoDelEnvio = { enviados: number; fallidos: number; falta: boolean };

/**
 * Manda (o sigue mandando) un correo, desde donde quedó.
 *
 * Se lee una página de compradores después del cursor, se le sacan las
 * bajas, se manda de a ocho, y el cursor pasa al último correo de la
 * PÁGINA (no de lo mandado: una página entera de bajas también avanza). Como
 * la lista va por correo, "seguir" es "los que vienen después". El cursor se
 * guarda DESPUÉS de mandar: si la función se muere en el medio, lo peor es
 * que esa página se repita; guardado antes, esa gente no lo recibiría nunca
 * y nadie lo sabría.
 */
export async function enviarCorreo(correoId: string): Promise<ResultadoDelEnvio> {
  const arranque = Date.now();
  const correo = await prisma.correoDigital.findUnique({
    where: { id: correoId },
    select: {
      id: true, storeId: true, productId: true, asunto: true, cuerpo: true, enlace: true, botonTexto: true, cursor: true, estado: true,
      product: { select: { name: true } },
      store: { select: { owner: { select: { name: true, email: true } } } },
    },
  });
  if (!correo || correo.estado !== "ENVIANDO") return { enviados: 0, fallidos: 0, falta: false };

  const base = baseDeLosMails();
  const boton = correo.enlace && correo.botonTexto ? { texto: correo.botonTexto, url: correo.enlace } : null;
  let enviados = 0, fallidos = 0;
  let cursor = correo.cursor;

  const bajas = await bajasDe(correo.storeId);

  const mandarle = async (c: { email: string; nombre: string | null }) => {
    const token = tokenDeBaja(correo.storeId, c.email);
    const r = await sendCorreoACompradoresEmail({
      to: c.email,
      saludo: saludo(c.nombre),
      asunto: correo.asunto,
      cuerpo: correo.cuerpo,
      boton,
      producto: correo.product?.name ?? null,
      vendedor: correo.store.owner.name,
      replyTo: correo.store.owner.email,
      bajaUrl: urlBajaCorreo(base, token),
      bajaPostUrl: urlBajaCorreoUnClic(base, token),
    });
    if (r.error) throw new Error(r.error.message);
  };

  for (;;) {
    const pagina = await compradoresDe(correo.storeId, correo.productId, cursor);
    if (pagina.length === 0) {
      await prisma.correoDigital.update({ where: { id: correo.id }, data: { estado: "LISTO" } });
      return { enviados, fallidos, falta: false };
    }
    const lote = destinatarios(pagina, bajas, cursor);

    /* De a ocho. Uno que rebota no frena a los otros siete: se cuenta y se
       sigue. No se reintenta: la dirección que Resend rechazó lo va a
       rechazar de nuevo. */
    let bien = 0, mal = 0;
    for (let i = 0; i < lote.length; i += CONCURRENCIA) {
      const salidas = await Promise.allSettled(lote.slice(i, i + CONCURRENCIA).map(mandarle));
      for (const s of salidas) {
        if (s.status === "fulfilled") bien++;
        else { mal++; console.error("[correos] no salió:", s.reason instanceof Error ? s.reason.message : s.reason); }
      }
    }
    enviados += bien; fallidos += mal;
    cursor = pagina[pagina.length - 1].email.trim().toLowerCase();

    /* `increment` y no un número calculado acá: si dos pasadas se solaparan,
       una escritura absoluta pisaría lo que contó la otra. */
    await prisma.correoDigital.update({
      where: { id: correo.id },
      data: { cursor, enviados: { increment: bien }, fallidos: { increment: mal } },
    });

    /* Una página más corta que el tope es la última: se cierra acá en vez
       de dar otra vuelta para encontrarla vacía. */
    if (pagina.length < PAGINA) {
      await prisma.correoDigital.update({ where: { id: correo.id }, data: { estado: "LISTO" } });
      return { enviados, fallidos, falta: false };
    }
    /* Se corta ANTES de otra página, nunca en el medio de una. */
    if (Date.now() - arranque > PRESUPUESTO_MS) return { enviados, fallidos, falta: true };
  }
}
