import { prisma } from "@/lib/prisma";
import { getLongLivedToken, vencimientoDe, encryptToken, decryptToken } from "@/lib/facebook";

/**
 * Mantiene vivos los tokens de Meta.
 *
 * El token de larga duración dura ~60 días y no se renueva solo. Antes nadie lo
 * vigilaba: a los dos meses se moría, la pantalla seguía diciendo "Instalada" en
 * verde, y el dueño se enteraba el día que entraba al wizard y algo fallaba.
 *
 * Meta deja canjear un token largo TODAVÍA VIVO por otro con la cuenta desde
 * cero. O sea que mientras lleguemos antes del vencimiento, la conexión se
 * sostiene sola y el dueño nunca se entera. Si se pasó, no hay vuelta: hay que
 * reconectar a mano, y para eso está el aviso en el panel.
 */

/** Cuánto antes del vencimiento se empieza a renovar. */
const DIAS_DE_ANTICIPACION = 10;

/**
 * Techo de tiendas por corrida. El cron diario ya está cerca de sus 60 s y el
 * comentario de ese archivo avisa que lo que se corta es lo de abajo — así que
 * esto no puede crecer sin límite a medida que se sumen tiendas. Con 25 por día
 * y tokens de 60 días alcanza de sobra para mucho tiempo, y las que queden afuera
 * entran en la corrida siguiente: la ventana de 10 días da 10 oportunidades.
 */
const MAX_POR_CORRIDA = 25;

export type ResultadoRenovacion = { revisadas: number; renovadas: number; fallidas: number };

export async function renovarTokensPorVencer(ahora = new Date()): Promise<ResultadoRenovacion> {
  const limite = new Date(ahora.getTime() + DIAS_DE_ANTICIPACION * 24 * 60 * 60 * 1000);

  const tiendas = await prisma.store.findMany({
    where: {
      fbAccessToken: { not: null },
      // `null` entra a propósito: son las que se conectaron antes de que
      // existiera esta columna. No se puede saber cuánto les queda, así que se
      // las renueva y la respuesta de Meta trae la fecha real.
      OR: [{ fbTokenExpiresAt: null }, { fbTokenExpiresAt: { lte: limite } }],
    },
    select: { id: true, slug: true, fbAccessToken: true },
    orderBy: { fbTokenExpiresAt: { sort: "asc", nulls: "first" } },
    take: MAX_POR_CORRIDA,
  });

  let renovadas = 0;
  let fallidas = 0;

  for (const tienda of tiendas) {
    const token = tienda.fbAccessToken ? decryptToken(tienda.fbAccessToken) : null;
    if (!token) {
      fallidas++;
      continue;
    }

    try {
      const nuevo = await getLongLivedToken(token);
      if (!nuevo.access_token) throw new Error("Meta no devolvió token");

      await prisma.store.update({
        where: { id: tienda.id },
        data: {
          fbAccessToken: encryptToken(nuevo.access_token),
          fbTokenExpiresAt: vencimientoDe(nuevo, ahora),
        },
      });
      renovadas++;
    } catch (err) {
      // No se borra la conexión: puede ser una caída momentánea de Meta y
      // mañana renueva bien. Si de verdad venció, la fecha guardada ya quedó
      // en el pasado y el panel se lo va a decir al dueño.
      fallidas++;
      console.error(`[meta] no se pudo renovar el token de ${tienda.slug}:`, err);
    }
  }

  return { revisadas: tiendas.length, renovadas, fallidas };
}
