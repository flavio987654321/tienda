import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { marcarMirando, huellaDeVisitante } from "@/lib/mirando-ahora-servidor";

export const runtime = "nodejs";

/* Mismo formato que el resto de la cadena: cuid de Prisma o UUID. Se mira
   ANTES de todo, para que un id de diez mil caracteres no llegue ni a la clave
   del límite por IP. */
const ID_RE = /^(c[a-z0-9]{20,30}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/**
 * Cuántos latidos por IP y por minuto se aceptan.
 *
 * El latido va cada 45 segundos, así que uno solo manda ~2 por minuto. El
 * techo deja lugar a una casa con varios teléfonos detrás de la misma IP —y
 * en el celular, a cientos que comparten IP por CGNAT— sin darle a nadie una
 * forma gratis de inflar el cartelito ni de hacernos escribir en Redis todo
 * el día.
 */
const LATIDOS_POR_MINUTO = 40;

/**
 * POST /api/digitales/mirando/[id] — "sigo mirando esta página".
 *
 * ══════════════════════════════════════════════════════════════════════════
 * NO TOCA LA BASE. NO GUARDA NADA. NO DEVUELVE NADA.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Es el latido del puntito verde del panel. Lo único que hace es sumar una
 * huella anónima a un contador de Redis que se borra solo a los tres minutos
 * (ver `lib/mirando-ahora`): no hay tabla, no hay fila por visita, no queda
 * registro de nadie y no se guarda ninguna hora.
 *
 * ⚠️ Va SEPARADA de `/api/digitales/visita/[id]` a propósito, y no es por
 * orden. Aquélla escribe en la base y tiene un tope por IP pensado para UNA
 * visita por día; un latido cada 45 segundos se comería ese tope en minutos
 * y dejaría de contarse la visita de verdad — que es la que alimenta las
 * estadísticas. Son dos cosas con vidas distintas y por eso son dos rutas.
 *
 * ⚠️ Y NO verifica que el producto exista ni que esté publicado. A propósito:
 * eso es una consulta a la base cada 45 segundos por cada persona mirando,
 * justo lo que esta ruta existe para evitar. Lo peor que consigue quien
 * inventa un id es escribir en una clave de Redis que nadie lee y que se
 * borra sola; el panel sólo cuenta las claves de SUS productos.
 *
 * Siempre contesta 204, incluso cuando no contó: el navegador no lee la
 * respuesta y un error acá no puede hacer nada útil.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vacio = new NextResponse(null, { status: 204 });
  if (!ID_RE.test(id)) return vacio;

  /* ⚠️ QUIEN TIENE SESIÓN NO SE CUENTA, y esto es lo que evita que la dueña
     se vea a sí misma. Abrir la propia página para revisarla es lo más común
     del mundo, y verse como "1 mirando ahora" en el propio panel convierte el
     cartelito en una broma.

     Se mira la COOKIE y nada más: preguntarle a Supabase quién es costaría un
     viaje cada 45 segundos por cada persona mirando, que es justo lo que esta
     ruta existe para evitar. Y alcanza, porque quien COMPRA no tiene cuenta:
     una cookie de sesión en esta página es, casi siempre, su dueña.

     Es el mismo atajo que usa `/api/digitales/visita/[id]` para no contarse
     las visitas propias, y por el mismo motivo. */
  const conSesion = req.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  if (conSesion) return vacio;

  const ip = getClientIp(req);
  try {
    if (!(await checkRateLimit(`mirando:${ip}`, LATIDOS_POR_MINUTO, 60_000))) return vacio;
  } catch {
    /* Sin Redis no hay contador que escribir: se corta acá y no se avisa. */
    return vacio;
  }

  const huella = huellaDeVisitante(id, ip, req.headers.get("user-agent") ?? "");
  if (!huella) return vacio;

  await marcarMirando(id, huella);
  return vacio;
}
